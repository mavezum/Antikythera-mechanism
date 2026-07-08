/**
 * Physical layout of the 3D model. Units are millimetres, in a frame where
 * +z points out of the FRONT dial, +y is up, +x is right when viewing the
 * front. z = 0 is the middle of the gear works.
 *
 * The layout is *stylised but mechanically coherent*: axis positions are
 * hand-placed to echo the published reconstruction drawings, and each meshing
 * pair's tooth module is derived from the actual distance between its two
 * arbors, so pitch circles touch and teeth interlock on screen. It is not a
 * metrological replica (spec §2 non-goals); the kinematics never depend on
 * these positions.
 */

import { GEAR_BY_ID, GEARS } from '../model/gearData';

export interface Vec2 {
  x: number;
  y: number;
}

/** Arbor positions, viewed from the front. */
export const AXES: Record<string, Vec2> = {
  b: { x: 0, y: 52 }, // great wheel / front dial centre
  c: { x: 18, y: 34 },
  d: { x: 30, y: 21 },
  e: { x: 0, y: 20 }, // epicyclic platform e3/e4
  l: { x: -18, y: 70 },
  m: { x: -8, y: 92 },
  n: { x: 0, y: 112 }, // Metonic spiral centre
  o: { x: 16, y: 112 }, // Games dial centre
  p: { x: -10, y: 100 },
  q: { x: -16, y: 112 }, // Callippic dial centre
  f: { x: 0, y: -58 },
  g: { x: 0, y: -86 }, // Saros spiral centre
  h: { x: 7, y: -74 },
  i: { x: 14, y: -86 }, // Exeligmos dial centre
};

/** z of each gear's mid-plane (mm). Meshing partners share a plane. */
export const GEAR_Z: Record<string, number> = {
  a1: 24,
  b1: 24,
  b2: 18,
  c1: 18,
  c2: 12,
  d1: 12,
  d2: 6,
  e2: 6,
  e5: 0,
  k1: 0,
  k2: 2.4,
  e6: 2.4,
  e1: 10,
  b3: 10,
  e3: -6,
  e4: -12,
  l1: 18,
  l2: -14,
  m1: -14,
  m2: -20,
  m3: -6,
  n1: -20,
  n2: -24,
  n3: -16,
  o1: -24,
  p1: -16,
  p2: -22,
  q1: -22,
  f1: -12,
  f2: -20,
  g1: -20,
  g2: -24,
  h1: -24,
  h2: -26.5,
  i1: -26.5,
};

/** Case dimensions. */
export const CASE = {
  width: 190, // x: -95..95
  height: 330, // y: -165..165
  frontPlateZ: 30,
  backPlateZ: -31,
  plateThickness: 2.5,
  wallThickness: 5,
  woodDepth: 70, // z extent of the wooden case
};

export const FRONT_DIAL = {
  center: AXES.b,
  z: CASE.frontPlateZ + CASE.plateThickness / 2 + 0.4,
  egyptianOuter: 71,
  egyptianInner: 62,
  zodiacOuter: 62,
  zodiacInner: 53,
  cosmosRadius: 52,
};

export const BACK_DIALS = {
  z: CASE.backPlateZ - CASE.plateThickness / 2 - 0.4,
  metonic: { center: AXES.n, rInner: 30, rOuter: 52, turns: 5, cells: 235 },
  saros: { center: AXES.g, rInner: 27, rOuter: 51, turns: 4, cells: 223 },
  callippic: { center: AXES.q, radius: 11 },
  games: { center: AXES.o, radius: 11 },
  exeligmos: { center: AXES.i, radius: 10 },
};

/** Pin-and-slot render geometry (mm): pin circle radius on k1. */
export const PIN_RADIUS = 10;

export interface MeshPair {
  a: string; // gear id
  b: string; // gear id
  module: number; // mm of pitch diameter per tooth
  /** angle of the line of centres a->b (radians, front view) */
  phi: number;
}

const dist = (p: Vec2, q: Vec2) => Math.hypot(q.x - p.x, q.y - p.y);

/** Epicyclic gears ride the e3 carrier; their "axis position" for module
 * computation is measured in the carrier frame. */
const K1_OFFSET = 25; // distance of k axis from e, on the carrier
export const K2_EXTRA_OFFSET = 0.875; // k2 axis offset from k1 (= pin r × d/r)

function gearAxisPos(id: string): Vec2 {
  const g = GEAR_BY_ID.get(id)!;
  if (id === 'k1') return { x: AXES.e.x + K1_OFFSET, y: AXES.e.y };
  if (id === 'k2')
    return { x: AXES.e.x + K1_OFFSET + K2_EXTRA_OFFSET, y: AXES.e.y };
  const p = AXES[g.axis];
  if (!p) throw new Error(`no axis position for gear ${id} (axis ${g.axis})`);
  return p;
}

/** All external mesh pairs with their derived modules. a1-b1 (the crown
 * gear) is excluded: it meshes at right angles and is rendered specially. */
export function meshPairs(): MeshPair[] {
  const pairs: MeshPair[] = [];
  for (const g of GEARS) {
    if (!g.meshWith || g.id === 'a1') continue;
    const other = GEAR_BY_ID.get(g.meshWith)!;
    const pa = gearAxisPos(g.id);
    const pb = gearAxisPos(other.id);
    const d = dist(pa, pb);
    pairs.push({
      a: g.id,
      b: other.id,
      module: (2 * d) / (g.teeth + other.teeth),
      phi: Math.atan2(pb.y - pa.y, pb.x - pa.x),
    });
  }
  return pairs;
}

export interface GearRender {
  id: string;
  teeth: number;
  pitchRadius: number;
  module: number;
  pos: { x: number; y: number; z: number };
  /** tooth phase offset (radians) so partners interlock at t = 0 */
  phase: number;
  epicyclic: boolean;
}

/**
 * Resolve every gear's pitch radius / module / position / tooth phase from
 * the mesh graph. Gears that never mesh externally (pipes like b3's partner
 * chain are all meshed; only hypothetical) default to module 0.5.
 */
export function gearRenderData(): Map<string, GearRender> {
  const out = new Map<string, GearRender>();
  const pairs = meshPairs();

  const moduleOf = new Map<string, number>();
  const phaseOf = new Map<string, number>();

  for (const p of pairs) {
    moduleOf.set(p.a, p.module);
    moduleOf.set(p.b, p.module);
    // Tooth phase: gear a gets a tooth pointing along phi; gear b gets a
    // tooth-gap pointing back along phi+π (offset by half a tooth pitch).
    const gb = GEAR_BY_ID.get(p.b)!;
    if (!phaseOf.has(p.a)) phaseOf.set(p.a, p.phi);
    if (!phaseOf.has(p.b))
      phaseOf.set(p.b, p.phi + Math.PI + Math.PI / gb.teeth);
  }

  for (const g of GEARS) {
    if (g.id === 'a1') continue; // crown gear: rendered with the crank
    const module = moduleOf.get(g.id) ?? 0.5;
    const z = GEAR_Z[g.id] ?? 0;
    const pos2 = gearAxisPos(g.id);
    out.set(g.id, {
      id: g.id,
      teeth: g.teeth,
      pitchRadius: (g.teeth * module) / 2,
      module,
      pos: { x: pos2.x, y: pos2.y, z },
      phase: phaseOf.get(g.id) ?? 0,
      epicyclic: !!g.carrier,
    });
  }
  return out;
}
