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
// Materials — aged bronze with procedural patina (no imported assets)
// ---------------------------------------------------------------------------

/** Deterministic PRNG so the corrosion pattern is stable between loads. */
function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface MottleOpts {
  base: string;
  /** [color, count, minR, maxR, alpha] blotch layers, painted in order */
  blotches: [string, number, number, number, number][];
  speckles?: number;
  /** horizontal streaks for wood grain */
  grain?: boolean;
  seed?: number;
}

/**
 * A mottled corrosion canvas: soft radial blotches (verdigris, burnt umber),
 * fine speckle pitting and an optional grain, echoing the state of the real
 * fragments — sea-corroded bronze with green patina over brown metal.
 */
function mottleCanvas(opts: MottleOpts, size = 512): HTMLCanvasElement {
  const rnd = mulberry32(opts.seed ?? 7);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = opts.base;
  ctx.fillRect(0, 0, size, size);

  for (const [color, count, minR, maxR, alpha] of opts.blotches) {
    for (let i = 0; i < count; i++) {
      const x = rnd() * size;
      const y = rnd() * size;
      const r = (minR + rnd() * (maxR - minR)) * size;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = alpha * (0.5 + rnd() * 0.5);
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  ctx.globalAlpha = 1;

  if (opts.grain) {
    for (let i = 0; i < 90; i++) {
      const y = rnd() * size;
      ctx.globalAlpha = 0.05 + rnd() * 0.09;
      ctx.fillStyle = rnd() > 0.5 ? '#1e1208' : '#5a4326';
      ctx.fillRect(0, y, size, 0.5 + rnd() * 2.2);
    }
    ctx.globalAlpha = 1;
  }

  const speckles = opts.speckles ?? 1500;
  for (let i = 0; i < speckles; i++) {
    const v = rnd();
    ctx.fillStyle = v > 0.6 ? 'rgba(20,14,6,0.35)' : 'rgba(120,150,120,0.22)';
    ctx.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  return canvas;
}

function agedTexture(opts: MottleOpts, repeat: number): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(mottleCanvas(opts));
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Grayscale bump from the same recipe, for pitted relief. */
function bumpTexture(seed: number, repeat: number): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(
    mottleCanvas({
      base: '#808080',
      blotches: [
        ['#4a4a4a', 60, 0.02, 0.12, 0.5],
        ['#b5b5b5', 45, 0.02, 0.1, 0.45],
      ],
      speckles: 2600,
      seed,
    }),
  );
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  return tex;
}

const BRONZE_RECIPE: MottleOpts = {
  base: '#a97e45',
  blotches: [
    ['#6e4f26', 55, 0.03, 0.16, 0.5], // burnt umber shadow
    ['#c69a58', 40, 0.02, 0.1, 0.45], // bright worn metal
    ['#5f7a5f', 26, 0.02, 0.1, 0.3], // whisper of verdigris
  ],
  seed: 11,
};

const BRONZE_DARK_RECIPE: MottleOpts = {
  base: '#77592c',
  blotches: [
    ['#4c3a1c', 55, 0.03, 0.16, 0.55],
    ['#597253', 40, 0.03, 0.14, 0.4],
    ['#8c6b38', 30, 0.02, 0.1, 0.4],
  ],
  seed: 23,
};

const PLATE_RECIPE: MottleOpts = {
  base: '#5d4a2c',
  blotches: [
    ['#41552f', 70, 0.04, 0.2, 0.5], // patina fields
    ['#2f4038', 40, 0.03, 0.14, 0.45],
    ['#77603a', 45, 0.03, 0.12, 0.5], // exposed bronze
    ['#241a0e', 30, 0.02, 0.09, 0.4],
  ],
  speckles: 2400,
  seed: 41,
};

const WOOD_RECIPE: MottleOpts = {
  base: '#3c2a16',
  blotches: [
    ['#241708', 40, 0.05, 0.25, 0.4],
    ['#553d20', 35, 0.04, 0.2, 0.4],
  ],
  speckles: 700,
  grain: true,
  seed: 57,
};

// ExtrudeGeometry UVs are in shape units (mm), so gear textures need a tiny
// repeat factor; box geometries (plates, walls) use 0..1 UVs per face.
const GEAR_UV_REPEAT = 0.02;

export const MATERIALS = {
  bronze: new THREE.MeshStandardMaterial({
    color: 0xd6c2a2,
    map: agedTexture(BRONZE_RECIPE, GEAR_UV_REPEAT),
    bumpMap: bumpTexture(101, GEAR_UV_REPEAT),
    bumpScale: 0.6,
    metalness: 0.72,
    roughness: 0.52,
  }),
  bronzeDark: new THREE.MeshStandardMaterial({
    color: 0xcbb894,
    map: agedTexture(BRONZE_DARK_RECIPE, GEAR_UV_REPEAT),
    bumpMap: bumpTexture(103, GEAR_UV_REPEAT),
    bumpScale: 0.7,
    metalness: 0.68,
    roughness: 0.58,
  }),
  patina: new THREE.MeshStandardMaterial({
    color: 0x6f8a72,
    metalness: 0.55,
    roughness: 0.6,
  }),
  steel: new THREE.MeshStandardMaterial({
    color: 0x9aa0a6,
    metalness: 0.85,
    roughness: 0.45,
  }),
  plate: new THREE.MeshStandardMaterial({
    color: 0xc9bda4,
    map: agedTexture(PLATE_RECIPE, 1.6),
    bumpMap: bumpTexture(107, 1.6),
    bumpScale: 0.9,
    metalness: 0.55,
    roughness: 0.68,
  }),
  wood: new THREE.MeshStandardMaterial({
    color: 0xbfae98,
    map: agedTexture(WOOD_RECIPE, 1.2),
    bumpMap: bumpTexture(109, 1.2),
    bumpScale: 0.5,
    metalness: 0.03,
    roughness: 0.92,
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
