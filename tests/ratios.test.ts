/**
 * Verifies that the gear scheme in src/model/gearData.ts reproduces the
 * published cycles of the Antikythera mechanism EXACTLY (rational
 * arithmetic), plus sanity checks on the calendar and the variable-motion
 * devices. Citations in gearData.ts.
 */
import { describe, expect, it } from 'vitest';
import {
  GEAR_RATES,
  RATES,
  frac,
  mechanismState,
  pinSlotDeviation,
  planetLongitude,
  SAROS_GLYPHS,
} from '../src/model/kinematics';
import { PLANETS } from '../src/model/gearData';
import {
  EPOCH_JDN,
  gregorianToJdn,
  jdnToGregorian,
  jdnToJulian,
  julianToJdn,
  jdnToEgyptian,
} from '../src/model/calendar';
import {
  MOON_ANOMALY_EPOCH,
  MOON_LONGITUDE_EPOCH,
  SUN_LONGITUDE_EPOCH,
} from '../src/model/epoch';

describe('gear train ratios (exact rationals)', () => {
  it('Moon sidereal: 254 rotations in 19 years (Freeth 2006)', () => {
    expect(RATES.moonSidereal.equals(frac(254, 19))).toBe(true);
  });

  it('Synodic months: 235 in 19 years (Metonic relation)', () => {
    expect(RATES.synodic.equals(frac(235, 19))).toBe(true);
  });

  it('Metonic pointer: 5 turns in 19 years (235-cell spiral)', () => {
    expect(RATES.metonic.equals(frac(5, 19))).toBe(true);
  });

  it('Callippic pointer: 1 turn in 76 years', () => {
    expect(RATES.callippic.equals(frac(1, 76))).toBe(true);
  });

  it('Games/Olympiad pointer: 1 turn in 4 years, sense opposite to Metonic', () => {
    expect(RATES.games.equals(frac(1, 4))).toBe(true);
    // Metonic gear n1 and Games gear o1 rotate in opposite senses:
    expect(
      Number(GEAR_RATES.get('n1')!.n) * Number(GEAR_RATES.get('o1')!.n),
    ).toBeLessThan(0);
  });

  it('Saros pointer: 4 turns per 223 synodic months', () => {
    // 223 synodic months = 223 · (19/235) years; 4 turns in that time
    // = 940/4237 turns per year.
    expect(RATES.saros.equals(frac(940, 4237))).toBe(true);
    const monthsPerTurn = RATES.synodic.valueOf() / RATES.saros.valueOf();
    expect(monthsPerTurn).toBeCloseTo(223 / 4, 10);
  });

  it('Exeligmos pointer: 1 turn per 3 Saros (669 synodic months)', () => {
    expect(RATES.exeligmos.equals(frac(235, 12711))).toBe(true);
    const monthsPerTurn = RATES.synodic.valueOf() / RATES.exeligmos.valueOf();
    expect(monthsPerTurn).toBeCloseTo(669, 9);
  });

  it('Lunar apsidal carrier e3: one turn per ~8.88 years (real ~8.85)', () => {
    expect(RATES.apsidalCarrier.equals(frac(477, 4237))).toBe(true);
    expect(1 / RATES.apsidalCarrier.valueOf()).toBeCloseTo(8.8826, 3);
  });

  it('anomalistic month implied by the pin-and-slot carrier ≈ 27.55 days', () => {
    const anomalisticPerYear =
      RATES.moonSidereal.valueOf() - RATES.apsidalCarrier.valueOf();
    expect(365.25 / anomalisticPerYear).toBeCloseTo(27.5545, 2);
  });

  it('synodic month implied by the gearing ≈ 29.53 days', () => {
    expect(365.25 / RATES.synodic.valueOf()).toBeCloseTo(29.5306, 2);
  });

  it('crank: one turn ≈ 78 days (a1=48 into b1=224)', () => {
    expect(365.25 / RATES.crank.valueOf()).toBeCloseTo(78.27, 2);
  });

  it('all gears in the scheme received a rate', () => {
    for (const [id, rate] of GEAR_RATES) {
      expect(rate, `gear ${id}`).toBeDefined();
    }
    expect(GEAR_RATES.size).toBeGreaterThanOrEqual(30);
  });
});

describe('pin-and-slot lunar anomaly', () => {
  it('is zero at the apsides and bounded like Hipparchos first anomaly', () => {
    expect(pinSlotDeviation(0)).toBeCloseTo(0, 12);
    expect(pinSlotDeviation(Math.PI)).toBeCloseTo(0, 12);
    let max = 0;
    for (let i = 0; i < 2000; i++) {
      max = Math.max(max, Math.abs(pinSlotDeviation((i / 2000) * 2 * Math.PI)));
    }
    const maxDeg = (max * 180) / Math.PI;
    expect(maxDeg).toBeGreaterThan(4.5);
    expect(maxDeg).toBeLessThan(5.6);
  });

  it('averages to zero over a full anomalistic cycle', () => {
    let sum = 0;
    const n = 4096;
    for (let i = 0; i < n; i++) sum += pinSlotDeviation((i / n) * 2 * Math.PI);
    expect(sum / n).toBeCloseTo(0, 6);
  });
});

describe('planet period relations (Freeth et al. 2021)', () => {
  const realSynodicDays: Record<string, number> = {
    mercury: 115.88,
    venus: 583.92,
    mars: 779.94,
    jupiter: 398.88,
    saturn: 378.09,
  };

  for (const p of PLANETS) {
    it(`${p.name}: ${p.synodic} synodic cycles in ${p.years} years ≈ real synodic period`, () => {
      const synodicDays = (p.years * 365.25) / p.synodic;
      const err = Math.abs(synodicDays - realSynodicDays[p.id]) / realSynodicDays[p.id];
      expect(err).toBeLessThan(0.002); // within 0.2 %
    });
  }

  it('superior planets retrograde (longitude runs backwards near opposition)', () => {
    const mars = PLANETS.find((p) => p.id === 'mars')!;
    let retro = false;
    let prev = planetLongitude(mars, 0);
    for (let t = 0; t < 3; t += 0.002) {
      const cur = planetLongitude(mars, t);
      let d = cur - prev;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      if (d < 0) retro = true;
      prev = cur;
    }
    expect(retro).toBe(true);
  });
});

describe('calendar', () => {
  it('epoch: 28 April 205 BC (Julian) = JDN 1646665', () => {
    expect(EPOCH_JDN).toBe(1646665);
    expect(jdnToJulian(EPOCH_JDN)).toEqual({ year: -204, month: 4, day: 28 });
  });

  it('Gregorian <-> JDN round-trips across a wide range', () => {
    for (const d of [
      { year: -500, month: 1, day: 1 },
      { year: 0, month: 12, day: 31 },
      { year: 1582, month: 10, day: 15 },
      { year: 2000, month: 1, day: 1 },
      { year: 2026, month: 7, day: 8 },
    ]) {
      expect(jdnToGregorian(gregorianToJdn(d))).toEqual(d);
    }
    expect(gregorianToJdn({ year: 2000, month: 1, day: 1 })).toBe(2451545);
  });

  it('Julian <-> JDN round-trips', () => {
    for (const d of [
      { year: -746, month: 2, day: 26 },
      { year: -204, month: 4, day: 28 },
      { year: 1582, month: 10, day: 4 },
    ]) {
      expect(jdnToJulian(julianToJdn(d))).toEqual(d);
    }
  });

  it('Egyptian calendar anchored on the Nabonassar era', () => {
    const nab = julianToJdn({ year: -746, month: 2, day: 26 });
    expect(jdnToEgyptian(nab)).toMatchObject({
      year: 1,
      monthIndex: 0,
      day: 1,
    });
    // exactly 365 days per Egyptian year, always
    expect(jdnToEgyptian(nab + 365 * 100)).toMatchObject({ year: 101, day: 1 });
  });
});

describe('epoch anchoring', () => {
  it('epoch was a new moon (mean elongation ≈ 0): Saros dial start-up', () => {
    let elong = (MOON_LONGITUDE_EPOCH - SUN_LONGITUDE_EPOCH + 360) % 360;
    if (elong > 180) elong -= 360;
    // mean new moon within about half a day of the epoch date
    expect(Math.abs(elong)).toBeLessThan(8);
  });

  it('sun stands in Taurus in late April', () => {
    expect(SUN_LONGITUDE_EPOCH).toBeGreaterThan(20);
    expect(SUN_LONGITUDE_EPOCH).toBeLessThan(50);
  });

  it('moon anomaly epoch is a real angle', () => {
    expect(MOON_ANOMALY_EPOCH).toBeGreaterThanOrEqual(0);
    expect(MOON_ANOMALY_EPOCH).toBeLessThan(360);
  });
});

describe('mechanism state', () => {
  it('t=0: all spiral pointers at their first cells', () => {
    const s = mechanismState(0);
    expect(s.metonic.cell).toBe(0);
    expect(s.saros.cell).toBe(0);
    expect(s.exeligmos.sector).toBe(0);
    // new moon at epoch: phase angle within a few degrees of 0 (mod 360)
    const phase =
      s.moonPhaseAngle > 180 ? s.moonPhaseAngle - 360 : s.moonPhaseAngle;
    expect(Math.abs(phase)).toBeLessThan(10);
  });

  it('after exactly 19 years the Metonic pointer has made 5 turns', () => {
    const s = mechanismState(19);
    expect(s.metonic.turns * 47).toBeCloseTo(0, 6); // wrapped
    expect(s.monthIndex).toBeCloseTo(235, 9);
  });

  it('after 223 synodic months the Saros pointer has made 4 turns and the Exeligmos advanced one sector', () => {
    const years = (223 * 19) / 235;
    const s = mechanismState(years);
    expect(s.saros.cell).toBe(0);
    expect(s.exeligmos.sector).toBe(1);
    expect(s.exeligmos.correctionHours).toBe(8);
  });

  it('gear angles: moon output b3 co-rotates with the sun wheel b1', () => {
    const s = mechanismState(0.13);
    expect(Math.sign(s.gearAngles.get('b3')!)).toBe(
      Math.sign(s.gearAngles.get('b1')!),
    );
  });

  it('meshed gears counter-rotate: b2 vs c1', () => {
    const s = mechanismState(0.05);
    expect(Math.sign(s.gearAngles.get('c1')!)).toBe(
      -Math.sign(s.gearAngles.get('b2')!),
    );
  });
});

describe('Saros glyph scheme', () => {
  it('38 lunar and 38 solar eclipse possibilities in 223 months', () => {
    const lunar = SAROS_GLYPHS.filter((g) => g.lunar).length;
    const solar = SAROS_GLYPHS.filter((g) => g.solar).length;
    expect(lunar).toBe(38);
    expect(solar).toBe(38);
    // some cells carry both glyphs, like the real dial
    expect(SAROS_GLYPHS.some((g) => g.lunar && g.solar)).toBe(true);
    expect(SAROS_GLYPHS.length).toBeLessThan(76);
  });
});
