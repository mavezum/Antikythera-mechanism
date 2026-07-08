/**
 * The single kinematic model (spec §5.10): one input angle — years since
 * epoch, i.e. revolutions of the great wheel b1 — drives every gear angle,
 * every pointer and every numeric reading. Constant-ratio trains are solved
 * as exact rationals over the mesh graph in gearData.ts; the pin-and-slot
 * lunar anomaly and the planetary epicycles are modelled geometrically
 * because they produce variable angular velocity.
 */

import {
  GEARS,
  GEAR_BY_ID,
  PIN_SLOT_OFFSET_RATIO,
  PLANETS,
  type PlanetSpec,
} from './gearData';
import {
  DAYS_PER_YEAR,
  EPOCH_JDN,
  jdnToEgyptian,
  type EgyptianDate,
} from './calendar';
import {
  GAMES_DIAL_PHASE_TURNS,
  MOON_ANOMALY_EPOCH,
  MOON_LONGITUDE_EPOCH,
  PLANET_LONGITUDE_EPOCH,
  SUN_LONGITUDE_EPOCH,
} from './epoch';

// ---------------------------------------------------------------------------
// Exact rational arithmetic
// ---------------------------------------------------------------------------

const bigAbs = (x: bigint) => (x < 0n ? -x : x);

function bigGcd(a: bigint, b: bigint): bigint {
  a = bigAbs(a);
  b = bigAbs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

/** An exact rational number (used for gear rates in turns/year). */
export class Fraction {
  readonly n: bigint;
  readonly d: bigint;

  constructor(n: bigint | number, d: bigint | number = 1n) {
    let nn = BigInt(n);
    let dd = BigInt(d);
    if (dd === 0n) throw new Error('division by zero');
    if (dd < 0n) {
      nn = -nn;
      dd = -dd;
    }
    const g = bigGcd(nn, dd) || 1n;
    this.n = nn / g;
    this.d = dd / g;
  }

  add(other: Fraction): Fraction {
    return new Fraction(this.n * other.d + other.n * this.d, this.d * other.d);
  }

  sub(other: Fraction): Fraction {
    return new Fraction(this.n * other.d - other.n * this.d, this.d * other.d);
  }

  mul(other: Fraction): Fraction {
    return new Fraction(this.n * other.n, this.d * other.d);
  }

  neg(): Fraction {
    return new Fraction(-this.n, this.d);
  }

  valueOf(): number {
    return Number(this.n) / Number(this.d);
  }

  equals(other: Fraction): boolean {
    return this.n === other.n && this.d === other.d;
  }

  toString(): string {
    return `${this.n}/${this.d}`;
  }
}

export const frac = (n: bigint | number, d: bigint | number = 1n) =>
  new Fraction(n, d);

// ---------------------------------------------------------------------------
// Gear rates: solve the mesh graph once, exactly
// ---------------------------------------------------------------------------

/**
 * Signed *mean* rate of every gear, in revolutions per revolution of b1
 * (i.e. per year). Positive = same sense as b1. The pin-and-slot pair passes
 * rotation 1:1 on average, so k2 (and the e6/e1/b3 chain behind it) carries
 * its mean rate here; the periodic deviation is added in mechanismState().
 */
export function solveGearRates(): Map<string, Fraction> {
  const rates = new Map<string, Fraction>();
  rates.set('b1', frac(1));

  const propagate = () => {
    let progress = true;
    while (progress) {
      progress = false;
      for (const gear of GEARS) {
        if (rates.has(gear.id)) continue;
        let rate: Fraction | undefined;

        // Rigid connection, declared on either side.
        if (gear.fixedTo && rates.has(gear.fixedTo)) {
          rate = rates.get(gear.fixedTo)!;
        } else {
          const fixedPartner = GEARS.find(
            (g) => g.fixedTo === gear.id && rates.has(g.id),
          );
          if (fixedPartner) rate = rates.get(fixedPartner.id)!;
        }

        // External mesh, declared on either side.
        if (!rate) {
          const partnerId =
            gear.meshWith && rates.has(gear.meshWith)
              ? gear.meshWith
              : GEARS.find((g) => g.meshWith === gear.id && rates.has(g.id))
                  ?.id;
          if (partnerId) {
            const partner = GEAR_BY_ID.get(partnerId)!;
            const partnerRate = rates.get(partnerId)!;
            const carrierId = gear.carrier ?? partner.carrier;
            if (carrierId) {
              // Epicyclic mesh about a rotating carrier:
              //   ω_out − ω_carrier = −(ω_in − ω_carrier) · N_in / N_out
              const carrierRate = rates.get(carrierId);
              if (!carrierRate) continue;
              rate = carrierRate.add(
                partnerRate
                  .sub(carrierRate)
                  .mul(frac(partner.teeth, gear.teeth))
                  .neg(),
              );
            } else {
              rate = partnerRate.mul(frac(partner.teeth, gear.teeth)).neg();
            }
          }
        }

        if (rate) {
          rates.set(gear.id, rate);
          progress = true;
        }
      }
    }
  };

  propagate();

  // The pin-and-slot: k2's MEAN rate equals k1's (the slot passes the pin's
  // rotation 1:1 on average, both riding carrier e3). Seed it, then let the
  // solver finish the chain behind it (e6, e1, b3).
  const k1 = rates.get('k1');
  if (k1 && !rates.has('k2')) {
    rates.set('k2', k1);
    propagate();
  }

  return rates;
}

export const GEAR_RATES: ReadonlyMap<string, Fraction> = solveGearRates();

/** Named cycle rates (turns per year), exact. Used by tests and the UI. */
export const RATES = {
  /** crank turns per year = b1/a1 */
  crank: frac(224, 48),
  sun: frac(1),
  moonSidereal: GEAR_RATES.get('b3')!, // 254/19
  metonic: GEAR_RATES.get('n1')!.neg(), // 5/19
  callippic: GEAR_RATES.get('q1')!.neg(), // 1/76
  games: GEAR_RATES.get('o1')!, // 1/4 (opposite sense to Metonic)
  saros: GEAR_RATES.get('g1')!.neg(), // 940/4237
  exeligmos: GEAR_RATES.get('i1')!.neg(), // 235/12711
  apsidalCarrier: GEAR_RATES.get('e3')!.neg(), // 477/4237
  /** synodic months per year = moon sidereal − sun = 235/19 */
  synodic: GEAR_RATES.get('b3')!.sub(frac(1)),
};

// ---------------------------------------------------------------------------
// Pin and slot (lunar anomaly), geometric
// ---------------------------------------------------------------------------

/**
 * Deviation added by the pin-and-slot: the pin sits at radius r on k1; the
 * slotted gear k2 turns about an axis offset d from k1's. For pin angle α
 * (relative to the carrier, measured from the line of centres), the slot
 * angle is β = atan2(sin α, cos α − d/r), and the deviation is β − α.
 * Returns radians, given α in radians.
 */
export function pinSlotDeviation(
  alpha: number,
  offsetRatio = PIN_SLOT_OFFSET_RATIO,
): number {
  const beta = Math.atan2(Math.sin(alpha), Math.cos(alpha) - offsetRatio);
  const delta = beta - alpha;
  // normalise to (-π, π]
  return Math.atan2(Math.sin(delta), Math.cos(delta));
}

// ---------------------------------------------------------------------------
// Planets (front Cosmos display, Freeth et al. 2021 hypothesis)
// ---------------------------------------------------------------------------

const TAU = Math.PI * 2;
const deg2rad = Math.PI / 180;
const rad2deg = 180 / Math.PI;
const wrap360 = (x: number) => ((x % 360) + 360) % 360;

/**
 * Geocentric ecliptic longitude of a planet at t years after epoch, in
 * degrees. This is the geometric equivalent of the mechanism's epicyclic /
 * pin-and-slot planet gearing (Freeth et al. 2021): a deferent plus an
 * epicycle whose periods come from the period relation `synodic` cycles in
 * `years` years. It reproduces retrograde loops with the device's own cycle
 * lengths — not modern ephemeris positions.
 */
export function planetLongitude(spec: PlanetSpec, tYears: number): number {
  const sunLon = (SUN_LONGITUDE_EPOCH + 360 * tYears) * deg2rad;
  const meanLon0 = PLANET_LONGITUDE_EPOCH[spec.id];

  if (spec.kind === 'inferior') {
    // Deferent = the mean Sun; the epicycle arm turns at the planet's
    // heliocentric rate, anchored to its mean longitude at epoch.
    const helioRate = (spec.synodic + spec.years) / spec.years; // rev/yr
    const epiAngle = (meanLon0 + 360 * helioRate * tYears) * deg2rad;
    const x = Math.cos(sunLon) + spec.epicycleRatio * Math.cos(epiAngle);
    const y = Math.sin(sunLon) + spec.epicycleRatio * Math.sin(epiAngle);
    return wrap360(Math.atan2(y, x) * rad2deg);
  }

  // Superior planet: deferent at the sidereal rate, epicycle locked to the Sun.
  const siderealRate = (spec.years - spec.synodic) / spec.years; // rev/yr
  const defAngle = (meanLon0 + 360 * siderealRate * tYears) * deg2rad;
  const x = Math.cos(defAngle) + spec.epicycleRatio * Math.cos(sunLon);
  const y = Math.sin(defAngle) + spec.epicycleRatio * Math.sin(sunLon);
  return wrap360(Math.atan2(y, x) * rad2deg);
}

// ---------------------------------------------------------------------------
// Saros eclipse glyphs
// ---------------------------------------------------------------------------

export interface EclipseGlyph {
  /** 0-based cell on the Saros dial (month within the 223). */
  cell: number;
  lunar: boolean;
  solar: boolean;
}

/**
 * Schematic Saros glyph distribution (spec Open Question 3): 38 node
 * passages per Saros at 223/38-month intervals mark the eclipse
 * possibilities; a passage falling near a cell boundary yields a lunar (Σ)
 * and a solar (Η) glyph in the same cell, as on the real dial. This follows
 * the arithmetic of Freeth et al. 2008 but is not the epigraphic
 * glyph-by-glyph dataset. See README.
 */
export function sarosGlyphs(): EclipseGlyph[] {
  const byCell = new Map<number, EclipseGlyph>();
  const mark = (cell: number, kind: 'lunar' | 'solar') => {
    const c = ((cell % 223) + 223) % 223;
    const g = byCell.get(c) ?? { cell: c, lunar: false, solar: false };
    g[kind] = true;
    byCell.set(c, g);
  };
  for (let k = 0; k < 38; k++) {
    const m = (k * 223) / 38;
    mark(Math.round(m), 'lunar');
    mark(Math.round(m + 0.5), 'solar');
  }
  return [...byCell.values()].sort((a, b) => a.cell - b.cell);
}

export const SAROS_GLYPHS = sarosGlyphs();
const SAROS_GLYPH_BY_CELL = new Map(SAROS_GLYPHS.map((g) => [g.cell, g]));

// ---------------------------------------------------------------------------
// Full mechanism state
// ---------------------------------------------------------------------------

export interface MechanismState {
  /** master input: years since epoch (= revolutions of b1) */
  years: number;
  jd: number;
  crankTurns: number;
  /** degrees, tropical ecliptic longitude */
  sunLongitude: number;
  moonLongitude: number;
  /** degrees; 0 = new moon, 180 = full moon */
  moonPhaseAngle: number;
  /** pin-and-slot deviation currently applied to the Moon, degrees */
  moonAnomalyDeg: number;
  /** synodic months elapsed since epoch (fractional) */
  monthIndex: number;
  metonic: { turns: number; cell: number; month: number; year: number };
  callippic: { turns: number; quarter: number };
  games: { turns: number; year: number };
  saros: {
    turns: number;
    cell: number;
    month: number;
    glyph: EclipseGlyph | undefined;
  };
  exeligmos: { turns: number; sector: 0 | 1 | 2; correctionHours: 0 | 8 | 16 };
  egyptian: EgyptianDate;
  planets: Record<PlanetSpec['id'], number>;
  /** visual rotation angle (radians, about each gear's arbor) per gear id */
  gearAngles: Map<string, number>;
}

const RATE_NUM: ReadonlyMap<string, number> = new Map(
  [...GEAR_RATES].map(([id, f]) => [id, f.valueOf()]),
);

const mod = (x: number, m: number) => ((x % m) + m) % m;

/** Compute the complete state of the mechanism at t years after epoch. */
export function mechanismState(tYears: number): MechanismState {
  const t = tYears;
  const jd = EPOCH_JDN + t * DAYS_PER_YEAR;

  const sunLongitude = wrap360(SUN_LONGITUDE_EPOCH + 360 * t);

  // Lunar anomaly: the pin angle relative to the carrier advances at the
  // anomalistic rate (sidereal moon minus apsidal precession), phased by the
  // Moon's mean anomaly at epoch.
  const anomalisticRate =
    RATES.moonSidereal.valueOf() - RATES.apsidalCarrier.valueOf();
  const alpha = (MOON_ANOMALY_EPOCH + 360 * anomalisticRate * t) * deg2rad;
  const delta = pinSlotDeviation(alpha);
  const moonLongitude = wrap360(
    MOON_LONGITUDE_EPOCH +
      360 * RATES.moonSidereal.valueOf() * t +
      delta * rad2deg,
  );
  const moonPhaseAngle = wrap360(moonLongitude - sunLongitude);

  const monthIndex = RATES.synodic.valueOf() * t;
  const metonicMonth = mod(monthIndex, 235);
  const sarosMonth = mod(monthIndex, 223);
  const exeligmosMonths = mod(monthIndex, 669);

  const gamesTurns = t * 0.25 + GAMES_DIAL_PHASE_TURNS;

  const planets = {} as Record<PlanetSpec['id'], number>;
  for (const p of PLANETS) planets[p.id] = planetLongitude(p, t);

  // Visual gear angles: mean rates everywhere, then superimpose the
  // pin-and-slot deviation on the variable chain.
  //   θ_k2 = θ_k1 + δ         (slot follows pin)
  //   θ_e6 = θ_e6.mean − δ    (k2→e6 mesh reverses the deviation)
  //   θ_e1 = θ_e6             (rigid)
  //   θ_b3 = θ_b3.mean + δ    (e1→b3 mesh reverses it back)
  const gearAngles = new Map<string, number>();
  for (const [id, rate] of RATE_NUM) gearAngles.set(id, rate * t * TAU);
  gearAngles.set('k2', gearAngles.get('k1')! + delta);
  gearAngles.set('e6', gearAngles.get('e6')! - delta);
  gearAngles.set('e1', gearAngles.get('e1')! - delta);
  gearAngles.set('b3', gearAngles.get('b3')! + delta);

  const exeligmosSector = Math.floor(exeligmosMonths / 223) as 0 | 1 | 2;

  return {
    years: t,
    jd,
    crankTurns: RATES.crank.valueOf() * t,
    sunLongitude,
    moonLongitude,
    moonPhaseAngle,
    moonAnomalyDeg: delta * rad2deg,
    monthIndex,
    metonic: {
      turns: metonicMonth / 47,
      cell: Math.floor(metonicMonth),
      month: Math.floor(metonicMonth) + 1,
      year: Math.floor((metonicMonth * 19) / 235) + 1,
    },
    callippic: {
      turns: mod(t, 76) / 76,
      quarter: Math.floor(mod(t, 76) / 19) + 1,
    },
    games: {
      turns: gamesTurns,
      year: Math.floor(mod(gamesTurns, 1) * 4) + 1,
    },
    saros: {
      turns: sarosMonth / 55.75,
      cell: Math.floor(sarosMonth),
      month: Math.floor(sarosMonth) + 1,
      glyph: SAROS_GLYPH_BY_CELL.get(Math.floor(sarosMonth)),
    },
    exeligmos: {
      turns: exeligmosMonths / 669,
      sector: exeligmosSector,
      correctionHours: ([0, 8, 16] as const)[exeligmosSector],
    },
    egyptian: jdnToEgyptian(Math.floor(jd)),
    planets,
    gearAngles,
  };
}
