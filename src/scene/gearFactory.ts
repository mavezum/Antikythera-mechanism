/**
 * Procedural gear geometry (spec §5.5: procedural generation instead of
 * heavy imported meshes). Gears are extruded 2D profiles: root circle,
 * trapezoidal teeth to the tip circle, a hub hole, and — for large wheels —
 * cut-out windows between spokes, echoing the four-spoked great wheel b1.
 */

import * as THREE from 'three';

export interface GearGeomOptions {
  teeth: number;
  module: number; // mm per tooth of pitch diameter
  thickness?: number;
  hubRadius?: number;
  /** number of spoke windows to cut (0 = solid disc) */
  spokes?: number;
}

const geomCache = new Map<string, THREE.BufferGeometry>();

export function gearGeometry(opts: GearGeomOptions): THREE.BufferGeometry {
  const { teeth, module } = opts;
  const thickness = opts.thickness ?? Math.max(1.4, module * 2.2);
  const pitchR = (teeth * module) / 2;
  const tipR = pitchR + module * 0.9;
  const rootR = Math.max(pitchR - module * 1.1, pitchR * 0.7);
  const hubR = Math.min(opts.hubRadius ?? 2.2, rootR * 0.5);
  const spokes = opts.spokes ?? (pitchR > 34 ? 4 : 0);

  const key = `${teeth}|${module.toFixed(4)}|${thickness.toFixed(2)}|${hubR}|${spokes}`;
  const cached = geomCache.get(key);
  if (cached) return cached;

  const shape = new THREE.Shape();
  const N = teeth;
  const pitchAngle = (Math.PI * 2) / N;
  // Tooth flanks: fraction of the pitch occupied by the tooth at root/tip.
  const rootHalf = pitchAngle * 0.28;
  const tipHalf = pitchAngle * 0.16;

  for (let i = 0; i < N; i++) {
    const c = i * pitchAngle; // tooth centre angle (phase 0 => tooth at 0)
    const a0 = c - rootHalf;
    const a1 = c - tipHalf;
    const a2 = c + tipHalf;
    const a3 = c + rootHalf;
    if (i === 0) shape.moveTo(rootR * Math.cos(a0), rootR * Math.sin(a0));
    else shape.lineTo(rootR * Math.cos(a0), rootR * Math.sin(a0));
    shape.lineTo(tipR * Math.cos(a1), tipR * Math.sin(a1));
    shape.lineTo(tipR * Math.cos(a2), tipR * Math.sin(a2));
    shape.lineTo(rootR * Math.cos(a3), rootR * Math.sin(a3));
    // arc along the root circle to the next tooth
    shape.absarc(0, 0, rootR, a3, c + pitchAngle - rootHalf, false);
  }
  shape.closePath();

  // hub hole
  const hub = new THREE.Path();
  hub.absarc(0, 0, hubR, 0, Math.PI * 2, true);
  shape.holes.push(hub);

  // spoke windows
  if (spokes > 0) {
    const rimR = rootR * 0.82;
    const hubOut = Math.max(hubR + 2.5, rootR * 0.2);
    const gapHalf = 0.16; // radians kept solid around each spoke
    for (let s = 0; s < spokes; s++) {
      const w0 = (s * Math.PI * 2) / spokes + gapHalf;
      const w1 = ((s + 1) * Math.PI * 2) / spokes - gapHalf;
      const win = new THREE.Path();
      win.absarc(0, 0, hubOut, w0, w1, false);
      win.absarc(0, 0, rimR, w1, w0, true);
      win.closePath();
      shape.holes.push(win);
    }
  }

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: Math.min(10, Math.max(4, Math.round(180 / N))),
  });
  geom.translate(0, 0, -thickness / 2);
  geom.computeVertexNormals();
  geomCache.set(key, geom);
  return geom;
}

/**
 * A stylised contrate (crown) gear for the crank input a1: a ring with
 * axial pegs, rotating about its local +Z like every other gear (the caller
 * orients it).
 */
export function crownGearGroup(
  teeth: number,
  radius: number,
  material: THREE.Material,
): THREE.Group {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(radius + 1.4, radius + 1.4, 2.2, 48, 1, false),
    material,
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  const pegGeom = new THREE.BoxGeometry(1.6, 1.2, 2.6);
  for (let i = 0; i < teeth; i++) {
    const a = (i * Math.PI * 2) / teeth;
    const peg = new THREE.Mesh(pegGeom, material);
    peg.position.set(radius * Math.cos(a), radius * Math.sin(a), 1.8);
    peg.rotation.z = a;
    group.add(peg);
  }
  return group;
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

export const MATERIALS = {
  bronze: new THREE.MeshStandardMaterial({
    color: 0xc08d4a,
    metalness: 0.85,
    roughness: 0.42,
  }),
  bronzeDark: new THREE.MeshStandardMaterial({
    color: 0x8a6534,
    metalness: 0.8,
    roughness: 0.5,
  }),
  patina: new THREE.MeshStandardMaterial({
    color: 0x6f8a72,
    metalness: 0.55,
    roughness: 0.6,
  }),
  steel: new THREE.MeshStandardMaterial({
    color: 0xb9bec4,
    metalness: 0.9,
    roughness: 0.3,
  }),
  plate: new THREE.MeshStandardMaterial({
    color: 0x6e5230,
    metalness: 0.65,
    roughness: 0.6,
  }),
  wood: new THREE.MeshStandardMaterial({
    color: 0x402c18,
    metalness: 0.05,
    roughness: 0.9,
  }),
  pointer: new THREE.MeshStandardMaterial({
    color: 0x30363e,
    metalness: 0.75,
    roughness: 0.35,
  }),
  gold: new THREE.MeshStandardMaterial({
    color: 0xe8c04a,
    metalness: 0.95,
    roughness: 0.25,
  }),
  silver: new THREE.MeshStandardMaterial({
    color: 0xd8dde2,
    metalness: 0.95,
    roughness: 0.2,
  }),
  dark: new THREE.MeshStandardMaterial({
    color: 0x14161c,
    metalness: 0.2,
    roughness: 0.8,
  }),
};
