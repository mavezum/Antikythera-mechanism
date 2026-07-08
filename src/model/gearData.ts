/**
 * The gear scheme of the Antikythera mechanism — data, not code (spec §5.1).
 *
 * Tooth counts and train topology follow the published reconstruction:
 *  - Freeth, Bitsakis, Moussas, Seiradakis et al. (2006), Nature 444:587-591,
 *    "Decoding the ancient Greek astronomical calculator known as the
 *    Antikythera Mechanism" (gear topology, tooth counts, spiral back dials,
 *    pin-and-slot lunar anomaly).
 *  - Freeth, Jones, Steele & Bitsakis (2008), Nature 454:614-617
 *    (Olympiad/Games dial, Saros eclipse scheme).
 *  - Freeth & Jones (2012), ISAW Papers 4, "The Cosmos in the Antikythera
 *    Mechanism" (consolidated gearing table; front Cosmos display).
 *  - Freeth et al. (2021), Scientific Reports 11:5821 (planet period
 *    relations for the front display).
 *
 * Every train's exact ratio is verified against its published cycle in
 * tests/ratios.test.ts. If you change a tooth count here, the tests will
 * tell you which cycle you broke.
 *
 * Gear naming follows the literature: letters are arbors (axes), numbers
 * stack outward. Lowercase ids match the published diagrams (a1 crank crown,
 * b1 mean-sun wheel, ..., q1 Callippic pointer gear).
 */

export interface GearSpec {
  id: string;
  teeth: number;
  /** Arbor (axis) the gear sits on. Epicyclic gears k1/k2 sit on carrier e3. */
  axis: string;
  /** Rigidly joined to this gear (same arbor, same rotation). */
  fixedTo?: string;
  /** Externally meshed with this gear (rotation reverses). */
  meshWith?: string;
  /** Rides as an epicyclic gear on this (rotating) carrier gear. */
  carrier?: string;
  /** Citation / uncertainty note. */
  note?: string;
}

export const GEARS: GearSpec[] = [
  // ----- input -------------------------------------------------------------
  {
    id: 'a1',
    teeth: 48,
    axis: 'a',
    meshWith: 'b1',
    note: 'Contrate crown gear on the hand-crank arbor (Freeth et al. 2006).',
  },
  {
    id: 'b1',
    teeth: 224,
    axis: 'b',
    note:
      'The great mean-Sun wheel; one revolution = one year. Physical count ' +
      'uncertain (223-226 survive damage); 224 per Freeth & Jones 2012. ' +
      'One crank turn = 48/224 yr ≈ 78 days.',
  },
  { id: 'b2', teeth: 64, axis: 'b', fixedTo: 'b1' },

  // ----- lunar sidereal train: b2 -> c -> d -> e2 = 254/19 per year --------
  { id: 'c1', teeth: 38, axis: 'c', meshWith: 'b2' },
  { id: 'c2', teeth: 48, axis: 'c', fixedTo: 'c1' },
  { id: 'd1', teeth: 24, axis: 'd', meshWith: 'c2' },
  { id: 'd2', teeth: 127, axis: 'd', fixedTo: 'd1', note: '127 = 254/2: half the sidereal-month count of the 19-year cycle.' },
  { id: 'e2', teeth: 32, axis: 'e', meshWith: 'd2' },

  // ----- lunar anomaly: pin-and-slot on the e3 carrier ----------------------
  {
    id: 'e3',
    teeth: 223,
    axis: 'e',
    meshWith: 'm3',
    note:
      'Epicyclic carrier; rotates once per ~8.88 yr = the precession of the ' +
      'lunar apsides, so the pin-and-slot anomaly stays keyed to perigee.',
  },
  { id: 'e5', teeth: 50, axis: 'e', fixedTo: 'e2' },
  { id: 'k1', teeth: 50, axis: 'k', carrier: 'e3', meshWith: 'e5', note: 'Carries the pin.' },
  {
    id: 'k2',
    teeth: 50,
    axis: 'k2',
    carrier: 'e3',
    note:
      'Slotted gear on an axis offset ~1.1 mm from k1; driven by the pin, ' +
      'producing the variable (anomalistic) lunar speed. Handled geometrically ' +
      'in kinematics.ts, not as a constant ratio.',
  },
  { id: 'e6', teeth: 50, axis: 'e', meshWith: 'k2' },
  { id: 'e1', teeth: 32, axis: 'e', fixedTo: 'e6' },
  {
    id: 'b3',
    teeth: 32,
    axis: 'b',
    meshWith: 'e1',
    note: 'Central pipe returning the true lunar rotation to the front Moon pointer.',
  },

  // ----- back-dial trains: b2 -> l -> m ------------------------------------
  { id: 'l1', teeth: 38, axis: 'l', meshWith: 'b2' },
  { id: 'l2', teeth: 53, axis: 'l', fixedTo: 'l1' },
  { id: 'm1', teeth: 96, axis: 'm', meshWith: 'l2' },
  { id: 'm2', teeth: 15, axis: 'm', fixedTo: 'm1' },
  { id: 'm3', teeth: 27, axis: 'm', fixedTo: 'm1' },

  // Metonic pointer: n = 5 turns / 19 years
  { id: 'n1', teeth: 53, axis: 'n', meshWith: 'm2' },
  { id: 'n2', teeth: 57, axis: 'n', fixedTo: 'n1' },
  { id: 'n3', teeth: 15, axis: 'n', fixedTo: 'n1' },

  // Games (Olympiad) pointer: o = 1 turn / 4 years, runs opposite to Metonic
  { id: 'o1', teeth: 60, axis: 'o', meshWith: 'n2', note: 'Freeth et al. 2008: the Games pointer rotates "backwards" (opposite sense).' },

  // Callippic pointer: q = 1 turn / 76 years
  { id: 'p1', teeth: 60, axis: 'p', meshWith: 'n3' },
  { id: 'p2', teeth: 12, axis: 'p', fixedTo: 'p1' },
  { id: 'q1', teeth: 60, axis: 'q', meshWith: 'p2', note: 'Callippic dial is conjectural (no fragment survives); Freeth et al. 2006/2012.' },

  // Saros pointer: e3/e4 -> f -> g = 4 turns / 223 synodic months
  { id: 'e4', teeth: 188, axis: 'e', fixedTo: 'e3' },
  { id: 'f1', teeth: 53, axis: 'f', meshWith: 'e4' },
  { id: 'f2', teeth: 30, axis: 'f', fixedTo: 'f1' },
  { id: 'g1', teeth: 54, axis: 'g', meshWith: 'f2' },

  // Exeligmos pointer: g -> h -> i = 1 turn / 3 Saros (54.09 yr)
  { id: 'g2', teeth: 20, axis: 'g', fixedTo: 'g1' },
  { id: 'h1', teeth: 60, axis: 'h', meshWith: 'g2' },
  { id: 'h2', teeth: 15, axis: 'h', fixedTo: 'h1' },
  { id: 'i1', teeth: 60, axis: 'i', meshWith: 'h2' },
];

export const GEAR_BY_ID: ReadonlyMap<string, GearSpec> = new Map(
  GEARS.map((g) => [g.id, g]),
);

/**
 * Pin-and-slot geometry: the ratio of the k1/k2 axis offset to the pin
 * radius. Freeth et al. 2006 (Supplementary) show the device models
 * Hipparchos' first lunar anomaly; d/r ≈ 0.0875 reproduces its ~5.0° maximum
 * equation of centre (the measured pin offset ~1.1 mm is of this order).
 */
export const PIN_SLOT_OFFSET_RATIO = 0.0875;

/**
 * Planetary period relations of the front Cosmos display, from Freeth et al.
 * 2021 (Scientific Reports 11:5821): `synodic` synodic cycles in `years`
 * years. Venus 289:462 and Saturn 427:442 are derived in that paper from the
 * front-cover inscription; the rest are the paper's proposed cycles built on
 * Babylonian period relations. The whole planetary display is a scholarly
 * hypothesis and is labelled as such in the UI.
 *
 * `epicycleRatio` is the epicycle:deferent radius ratio used to reproduce the
 * pin-and-slot / epicyclic variable motion geometrically (equivalent to the
 * mean heliocentric distance ratio).
 */
export interface PlanetSpec {
  id: 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';
  name: string;
  kind: 'inferior' | 'superior';
  synodic: number;
  years: number;
  epicycleRatio: number;
  color: number; // display bead colour
}

export const PLANETS: PlanetSpec[] = [
  { id: 'mercury', name: 'Mercury', kind: 'inferior', synodic: 1513, years: 480, epicycleRatio: 0.387, color: 0x9fa8b0 },
  { id: 'venus', name: 'Venus', kind: 'inferior', synodic: 289, years: 462, epicycleRatio: 0.723, color: 0xf3e3b8 },
  { id: 'mars', name: 'Mars', kind: 'superior', synodic: 133, years: 284, epicycleRatio: 1 / 1.5237, color: 0xc0533b },
  { id: 'jupiter', name: 'Jupiter', kind: 'superior', synodic: 315, years: 344, epicycleRatio: 1 / 5.2028, color: 0xd8c49a },
  { id: 'saturn', name: 'Saturn', kind: 'superior', synodic: 427, years: 442, epicycleRatio: 1 / 9.5388, color: 0xcdb380 },
];

/**
 * Subsystems for "isolate a gear train" (spec use case 10): which gears carry
 * torque from the crank to each display.
 */
export const SUBSYSTEMS: Record<string, { label: string; gears: string[] }> = {
  sun: {
    label: 'Sun & calendar (front)',
    gears: ['a1', 'b1', 'b2'],
  },
  moon: {
    label: 'Moon position & phase (front)',
    gears: ['a1', 'b1', 'b2', 'c1', 'c2', 'd1', 'd2', 'e2', 'e5', 'k1', 'k2', 'e6', 'e1', 'b3', 'e3', 'l1', 'l2', 'm1', 'm3'],
  },
  metonic: {
    label: 'Metonic dial (back, upper)',
    gears: ['a1', 'b1', 'b2', 'l1', 'l2', 'm1', 'm2', 'n1'],
  },
  callippic: {
    label: 'Callippic dial (back, upper subsidiary)',
    gears: ['a1', 'b1', 'b2', 'l1', 'l2', 'm1', 'm2', 'n1', 'n3', 'p1', 'p2', 'q1'],
  },
  games: {
    label: 'Games / Olympiad dial (back, upper subsidiary)',
    gears: ['a1', 'b1', 'b2', 'l1', 'l2', 'm1', 'm2', 'n1', 'n2', 'o1'],
  },
  saros: {
    label: 'Saros eclipse dial (back, lower)',
    gears: ['a1', 'b1', 'b2', 'l1', 'l2', 'm1', 'm3', 'e3', 'e4', 'f1', 'f2', 'g1'],
  },
  exeligmos: {
    label: 'Exeligmos dial (back, lower subsidiary)',
    gears: ['a1', 'b1', 'b2', 'l1', 'l2', 'm1', 'm3', 'e3', 'e4', 'f1', 'f2', 'g1', 'g2', 'h1', 'h2', 'i1'],
  },
  planets: {
    label: 'Planets (front, hypothesis)',
    gears: ['a1', 'b1'],
  },
};
