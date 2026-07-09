/**
 * Dial faces and pointers. Faces are drawn into canvas textures (no imported
 * assets); pointers are driven every frame from the single kinematic state.
 *
 * Angle conventions:
 *  - FRONT dial: ecliptic longitude λ increases clockwise as seen from the
 *    front, 0° (first point of Aries) at 12 o'clock. A pointer mesh whose
 *    arm points +y is set to rotation.z = −λ.
 *  - BACK dials: readings are given in clockwise turns as seen from the
 *    back; rotation.z = +θ appears clockwise to the back viewer. Back faces
 *    are canvases drawn in back-view coordinates on planes rotated 180°
 *    about Y (like turning a sheet of paper around).
 */

import * as THREE from 'three';
import type { MechanismState } from '../model/kinematics';
import { SAROS_GLYPHS } from '../model/kinematics';
import { PLANETS } from '../model/gearData';
import { EGYPTIAN_MONTHS, NABONASSAR_JDN } from '../model/calendar';
import { BACK_DIALS, FRONT_DIAL } from './layout';
import { MATERIALS } from './gearFactory';

export interface DialUnit {
  group: THREE.Group;
  update: (s: MechanismState) => void;
}

const DEG = Math.PI / 180;

// Greek labels as inscribed on the mechanism (Price; Freeth & Jones 2012).
const ZODIAC_GREEK = [
  'ΚΡΙΟΣ', // Aries
  'ΤΑΥΡΟΣ', // Taurus
  'ΔΙΔΥΜΟΙ', // Gemini
  'ΚΑΡΚΙΝΟΣ', // Cancer
  'ΛΕΩΝ', // Leo
  'ΠΑΡΘΕΝΟΣ', // Virgo
  'ΧΗΛΑΙ', // "the Claws" — Libra on the mechanism
  'ΣΚΟΡΠΙΟΣ', // Scorpio
  'ΤΟΞΟΤΗΣ', // Sagittarius
  'ΑΙΓΟΚΕΡΩΣ', // Capricorn
  'ΥΔΡΟΧΟΟΣ', // Aquarius
  'ΙΧΘΥΕΣ', // Pisces
];

// Weathered bronze sheet, not paper: the artefact's plates are corroded
// metal with engraved lettering.
const PARCHMENT = '#c0a878';
const PARCHMENT_DARK = '#ab9265';
const INK = '#2b2015';
const ACCENT = '#7a1f12';

/** Deterministic PRNG so staining is stable between loads. */
function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Age a dial face: corrosion stains, verdigris shadows and speckle pitting,
 * painted only over already-drawn pixels ('source-atop'), plus an edge
 * vignette. Subtle enough to keep every inscription legible.
 */
function ageFace(ctx: CanvasRenderingContext2D, size: number, strength = 1) {
  const rnd = mulberry32(size * 31 + Math.round(strength * 97));
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';

  const blotch = (color: string, count: number, maxR: number, alpha: number) => {
    for (let i = 0; i < count; i++) {
      const x = rnd() * size;
      const y = rnd() * size;
      const r = (0.02 + rnd() * maxR) * size;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = alpha * strength * (0.5 + rnd() * 0.5);
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  };
  blotch('#7a5c30', 42, 0.13, 0.22); // bronze staining
  blotch('#556b4d', 30, 0.11, 0.19); // verdigris fields
  blotch('#2e2313', 28, 0.08, 0.17); // grime
  blotch('#d8c294', 22, 0.09, 0.16); // worn bright metal

  ctx.globalAlpha = 0.35 * strength;
  for (let i = 0; i < 700; i++) {
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(40,28,12,0.5)' : 'rgba(90,110,88,0.4)';
    ctx.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 2, 1 + rnd() * 2);
  }

  // edge vignette
  const v = ctx.createRadialGradient(
    size / 2, size / 2, size * 0.32,
    size / 2, size / 2, size * 0.72,
  );
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, `rgba(35,24,10,${0.28 * strength})`);
  ctx.globalAlpha = 1;
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, size, size);

  ctx.restore();
  ctx.globalAlpha = 1;
}

function canvasTexture(
  size: number,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  age = 1,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size);
  if (age > 0) ageFace(ctx, size, age);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function faceMaterial(tex: THREE.Texture): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: tex,
    metalness: 0.25,
    roughness: 0.75,
    transparent: true,
  });
}

/** Draw text centred at radius r, rotated to be upright-ish along the ring.
 * `cw` is the clockwise angle from 12 o'clock, in degrees. */
function ringText(
  ctx: CanvasRenderingContext2D,
  size: number,
  text: string,
  cwDeg: number,
  rFrac: number,
  px: number,
  color = INK,
  flipOuter = false,
) {
  const c = size / 2;
  const a = cwDeg * DEG;
  ctx.save();
  ctx.translate(c + Math.sin(a) * c * rFrac, c - Math.cos(a) * c * rFrac);
  let rot = a;
  if (flipOuter && cwDeg > 90 && cwDeg < 270) rot += Math.PI;
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.font = `600 ${px}px 'Georgia', 'Times New Roman', serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function radialLine(
  ctx: CanvasRenderingContext2D,
  size: number,
  cwDeg: number,
  r0Frac: number,
  r1Frac: number,
  width: number,
  color = INK,
) {
  const c = size / 2;
  const a = cwDeg * DEG;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(c + Math.sin(a) * c * r0Frac, c - Math.cos(a) * c * r0Frac);
  ctx.lineTo(c + Math.sin(a) * c * r1Frac, c - Math.cos(a) * c * r1Frac);
  ctx.stroke();
}

function circle(
  ctx: CanvasRenderingContext2D,
  size: number,
  rFrac: number,
  width: number,
  color = INK,
  fill?: string,
) {
  const c = size / 2;
  ctx.beginPath();
  ctx.arc(c, c, c * rFrac, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (width > 0) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

function pointerArm(
  length: number,
  width: number,
  material: THREE.Material,
  z = 0,
): THREE.Mesh {
  const geom = new THREE.BoxGeometry(width, length, width * 0.6);
  geom.translate(0, length / 2 - width, z);
  return new THREE.Mesh(geom, material);
}

// ---------------------------------------------------------------------------
// FRONT: the Cosmos display
// ---------------------------------------------------------------------------

export function buildFrontDial(): DialUnit {
  const group = new THREE.Group();
  const F = FRONT_DIAL;
  const R = F.egyptianOuter; // texture half-extent = outer radius

  // --- static face: zodiac ring + cosmos disc --------------------------
  const faceTex = canvasTexture(2048, (ctx, size) => {
    const f = (mm: number) => mm / R; // mm -> radius fraction
    // full plate background
    ctx.fillStyle = PARCHMENT;
    ctx.fillRect(0, 0, size, size);
    // cosmos disc
    circle(ctx, size, f(F.cosmosRadius), 3, INK, '#171a26');
    // planet rings
    const ringNames = ['Moon', 'Mercury', 'Venus', 'Sun', 'Mars', 'Jupiter', 'Saturn'];
    const ringR = [18, 23, 28, 33, 38, 43, 48];
    ctx.setLineDash([6, 8]);
    for (let i = 0; i < ringR.length; i++) {
      circle(ctx, size, f(ringR[i]), 1.6, 'rgba(220,215,200,0.35)');
    }
    ctx.setLineDash([]);
    for (let i = 0; i < ringR.length; i++) {
      ringText(ctx, size, ringNames[i].toUpperCase(), 183, f(ringR[i]) - 0.008, 17, 'rgba(230,225,210,0.5)');
    }
    // zodiac ring
    circle(ctx, size, f(F.zodiacOuter), 3, INK, undefined);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, (size / 2) * f(F.zodiacOuter), 0, Math.PI * 2);
    ctx.arc(size / 2, size / 2, (size / 2) * f(F.zodiacInner), 0, Math.PI * 2, true);
    ctx.fillStyle = PARCHMENT_DARK;
    ctx.fill();
    ctx.restore();
    circle(ctx, size, f(F.zodiacInner), 2.5, INK);
    for (let sIdx = 0; sIdx < 12; sIdx++) {
      const a0 = sIdx * 30;
      radialLine(ctx, size, a0, f(F.zodiacInner), f(F.zodiacOuter), 3);
      for (let d = 5; d < 30; d += 5) {
        radialLine(ctx, size, a0 + d, f(F.zodiacOuter) - 0.012, f(F.zodiacOuter), d % 10 === 0 ? 2 : 1);
      }
      ringText(ctx, size, ZODIAC_GREEK[sIdx], a0 + 15, (f(F.zodiacInner) + f(F.zodiacOuter)) / 2, 30, INK, true);
    }
  });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, R * 2), faceMaterial(faceTex));
  face.position.set(F.center.x, F.center.y, F.z);
  face.userData.partId = 'dial-front';
  face.userData.tooltip = {
    title: 'Front “Cosmos” display',
    body: 'Zodiac ring (Greek), Egyptian calendar ring, and pointers for the Sun, Moon (with phase) and the five planets known to antiquity. Planetary layout follows the 2021 UCL reconstruction — a scholarly hypothesis.',
  };
  group.add(face);

  // --- Egyptian calendar ring (rotates to stay period-correct) ----------
  const egyptTex = canvasTexture(2048, (ctx, size) => {
    const f = (mm: number) => mm / R;
    ctx.clearRect(0, 0, size, size);
    // annulus
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, (size / 2) * f(F.egyptianOuter), 0, Math.PI * 2);
    ctx.arc(size / 2, size / 2, (size / 2) * f(F.egyptianInner), 0, Math.PI * 2, true);
    ctx.fillStyle = PARCHMENT;
    ctx.fill();
    ctx.restore();
    circle(ctx, size, f(F.egyptianOuter), 3, INK);
    circle(ctx, size, f(F.egyptianInner), 2, INK);
    const dayDeg = 360 / 365;
    for (let m = 0; m < 12; m++) {
      const a0 = m * 30 * dayDeg;
      radialLine(ctx, size, a0, f(F.egyptianInner), f(F.egyptianOuter), 3);
      ringText(ctx, size, EGYPTIAN_MONTHS[m].toUpperCase(), a0 + 15 * dayDeg, (f(F.egyptianInner) + f(F.egyptianOuter)) / 2, 26, INK, true);
      for (let d = 10; d < 30; d += 10) {
        radialLine(ctx, size, a0 + d * dayDeg, f(F.egyptianOuter) - 0.01, f(F.egyptianOuter), 1.5);
      }
    }
    const ep0 = 360 * dayDeg;
    radialLine(ctx, size, ep0, f(F.egyptianInner), f(F.egyptianOuter), 3, ACCENT);
    ringText(ctx, size, 'ΕΠΑΓ', ep0 + 2.5 * dayDeg, (f(F.egyptianInner) + f(F.egyptianOuter)) / 2, 18, ACCENT, true);
  });
  const egyptRing = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, R * 2), faceMaterial(egyptTex));
  egyptRing.position.set(F.center.x, F.center.y, F.z + 0.25);
  egyptRing.userData.partId = 'ring-egyptian';
  egyptRing.userData.tooltip = {
    title: 'Egyptian calendar ring',
    body: 'The 365-day wandering year: twelve 30-day months plus 5 epagomenal days. On the real device this ring is movable; the simulation keeps it aligned automatically, as an ancient user would (¼-day drift per year).',
  };
  group.add(egyptRing);

  // --- pointers ---------------------------------------------------------
  const pz = F.z + 0.6;
  const mk = (partId: string, title: string, body: string) => {
    const g = new THREE.Group();
    g.position.set(F.center.x, F.center.y, pz);
    g.userData.partId = partId;
    g.userData.tooltip = { title, body };
    group.add(g);
    return g;
  };

  // Sun pointer (also the date pointer, reading the calendar rings)
  const sunG = mk('pointer-sun', 'Sun pointer', 'Shows the mean Sun in the zodiac and reads the date on the Egyptian ring. One revolution per year, straight off the great wheel b1.');
  const sunArm = pointerArm(F.egyptianOuter - 2, 1.6, MATERIALS.gold, 0);
  sunG.add(sunArm);
  const sunBall = new THREE.Mesh(new THREE.SphereGeometry(2.6, 24, 16), MATERIALS.gold);
  sunBall.position.set(0, 33, 0.5);
  sunG.add(sunBall);

  // Moon pointer with rotating phase ball
  const moonG = mk('pointer-moon', 'Moon pointer & phase', 'True lunar position from the 254/19 sidereal train, made non-uniform by the pin-and-slot device. The half-silvered ball turns once per synodic month to show the phase.');
  moonG.add(pointerArm(20, 1.4, MATERIALS.silver));
  const phaseBall = new THREE.Group();
  const half = (mat: THREE.Material, rotY: number) => {
    const geo = new THREE.SphereGeometry(2.2, 24, 16, 0, Math.PI);
    const m = new THREE.Mesh(geo, mat);
    m.rotation.y = rotY;
    return m;
  };
  phaseBall.add(half(MATERIALS.silver, 0), half(MATERIALS.dark, Math.PI));
  phaseBall.position.set(0, 18, 1.2);
  moonG.add(phaseBall);

  // Planet pointers
  const planetGs: { id: (typeof PLANETS)[number]['id']; g: THREE.Group }[] = [];
  const planetRingR: Record<string, number> = { mercury: 23, venus: 28, mars: 38, jupiter: 43, saturn: 48 };
  for (const p of PLANETS) {
    const g = mk(`pointer-${p.id}`, `${p.name} pointer`, `Geocentric position of ${p.name} from the ${p.synodic}-cycles-in-${p.years}-years period relation (Freeth et al. 2021 reconstruction — hypothesis).`);
    const arm = pointerArm(planetRingR[p.id], 0.9, MATERIALS.pointer);
    g.add(arm);
    const bead = new THREE.Mesh(
      new THREE.SphereGeometry(1.7, 20, 14),
      new THREE.MeshStandardMaterial({ color: p.color, metalness: 0.4, roughness: 0.4 }),
    );
    bead.position.set(0, planetRingR[p.id], 0.6);
    g.add(bead);
    planetGs.push({ id: p.id, g });
  }

  const update = (s: MechanismState) => {
    sunG.rotation.z = -s.sunLongitude * DEG;
    moonG.rotation.z = -s.moonLongitude * DEG;
    // phase: rotate the two-tone ball about the pointer's radial (y) axis;
    // at 0° (new) the dark half faces the viewer, at 180° (full) the bright.
    phaseBall.rotation.y = Math.PI - s.moonPhaseAngle * DEG;
    for (const { id, g } of planetGs) g.rotation.z = -s.planets[id] * DEG;
    // Egyptian ring: keep the sun pointer reading the true Egyptian date.
    const dayOfEra = s.jd - NABONASSAR_JDN;
    const ringDeg = (dayOfEra * 360) / 365 - s.sunLongitude;
    egyptRing.rotation.z = -((ringDeg % 360) * DEG);
  };

  return { group, update };
}

// ---------------------------------------------------------------------------
// BACK: spirals and subsidiary dials
// ---------------------------------------------------------------------------

interface SpiralOpts {
  rInner: number;
  rOuter: number;
  turns: number;
  cells: number;
  title: string;
  glyphs?: boolean;
  yearLabels?: boolean;
}

/** Archimedean spiral radius (mm) at clockwise angle θ (turns from start). */
function spiralR(o: SpiralOpts, turnPos: number): number {
  return o.rInner + ((o.rOuter - o.rInner) * turnPos) / o.turns;
}

function drawSpiralFace(o: SpiralOpts, texSize: number, R: number) {
  return canvasTexture(texSize, (ctx, size) => {
    const c = size / 2;
    const f = (mm: number) => (mm / R) * c;
    ctx.clearRect(0, 0, size, size);
    circle(ctx, size, o.rOuter / R + 0.045, 2.5, INK, PARCHMENT);

    // spiral groove (band between successive turns)
    ctx.strokeStyle = INK;
    ctx.lineWidth = size * 0.004;
    ctx.beginPath();
    const steps = o.turns * 240;
    for (let i = 0; i <= steps; i++) {
      const tp = (i / steps) * o.turns;
      const a = tp * Math.PI * 2;
      const r = f(spiralR(o, tp));
      const x = c + Math.sin(a) * r;
      const y = c - Math.cos(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    // close the outer end with one more part-turn at outer radius
    ctx.stroke();

    // cell dividers
    const cellsPerTurn = o.cells / o.turns;
    for (let cell = 0; cell < o.cells; cell++) {
      const tp = cell / cellsPerTurn;
      const a = tp * Math.PI * 2;
      const r0 = f(spiralR(o, tp));
      const r1 = f(spiralR(o, tp + 1)); // next turn outward
      const x0 = c + Math.sin(a) * r0;
      const y0 = c - Math.cos(a) * r0;
      const x1 = c + Math.sin(a) * r1;
      const y1 = c - Math.cos(a) * r1;
      ctx.strokeStyle = 'rgba(43,32,21,0.75)';
      ctx.lineWidth = size * 0.0018;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }

    // eclipse glyphs on the Saros dial
    if (o.glyphs) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const g of SAROS_GLYPHS) {
        const tp = (g.cell + 0.5) / cellsPerTurn;
        const a = tp * Math.PI * 2;
        const r = f(spiralR(o, tp + 0.5)); // middle of the band
        const x = c + Math.sin(a) * r;
        const y = c - Math.cos(a) * r;
        ctx.fillStyle = ACCENT;
        ctx.font = `700 ${Math.round(size * 0.02)}px Georgia, serif`;
        const label = `${g.lunar ? 'Σ' : ''}${g.solar ? 'Η' : ''}`;
        ctx.fillText(label, x, y);
      }
    }

    // year labels on the Metonic dial (every 12th/13th cell => every year)
    if (o.yearLabels) {
      ctx.fillStyle = 'rgba(43,32,21,0.8)';
      for (let yr = 1; yr <= 19; yr++) {
        const cell = ((yr - 1) * 235) / 19;
        const tp = cell / cellsPerTurn;
        const a = tp * Math.PI * 2 + 0.06;
        const r = f(spiralR(o, tp + 0.5));
        const x = c + Math.sin(a) * r;
        const y = c - Math.cos(a) * r;
        ctx.font = `700 ${Math.round(size * 0.016)}px Georgia, serif`;
        ctx.fillText(`${yr}`, x, y);
      }
    }

    // title
    ctx.fillStyle = INK;
    ctx.font = `700 ${Math.round(size * 0.036)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillText(o.title, c, c + f(o.rOuter) + size * 0.032);
  });
}

function backPlane(tex: THREE.Texture, sizeMm: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sizeMm, sizeMm), faceMaterial(tex));
  mesh.rotation.y = Math.PI; // face the back viewer, un-mirrored
  return mesh;
}

function spiralPointer(
  o: SpiralOpts,
  material: THREE.Material,
): { g: THREE.Group; setTurns: (turnPos: number) => void } {
  const g = new THREE.Group();
  const arm = pointerArm(o.rOuter + 4, 1.5, material);
  arm.rotation.y = Math.PI; // z offsets toward -z (back viewer)
  g.add(arm);
  const bead = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 12), MATERIALS.gold);
  g.add(bead);
  const setTurns = (turnPos: number) => {
    const frac = ((turnPos % o.turns) + o.turns) % o.turns;
    g.rotation.z = frac * Math.PI * 2; // + = clockwise seen from the back
    bead.position.set(0, spiralR(o, frac), -1.2);
  };
  return { g, setTurns };
}

export function buildBackDials(): DialUnit {
  const group = new THREE.Group();
  const z = BACK_DIALS.z;
  const texMm = (r: number) => (r + 14) * 2;

  // ---- Metonic spiral ---------------------------------------------------
  const met: SpiralOpts = {
    ...BACK_DIALS.metonic,
    title: 'ΜΕΤΩΝΟΣ — 235 months / 19 years',
    yearLabels: true,
  };
  const metFace = backPlane(drawSpiralFace(met, 1400, met.rOuter + 14), texMm(met.rOuter));
  metFace.position.set(BACK_DIALS.metonic.center.x, BACK_DIALS.metonic.center.y, z);
  metFace.userData.partId = 'dial-metonic';
  metFace.userData.tooltip = {
    title: 'Metonic dial',
    body: '235 synodic months = 19 years. The pointer runs 5 clockwise turns along the spiral, one cell per lunar month, then the rider is moved back to the start.',
  };
  group.add(metFace);
  const metPtr = spiralPointer(met, MATERIALS.pointer);
  metPtr.g.position.set(BACK_DIALS.metonic.center.x, BACK_DIALS.metonic.center.y, z - 0.6);
  metPtr.g.userData.partId = 'pointer-metonic';
  metPtr.g.userData.tooltip = { title: 'Metonic pointer', body: 'Driven at exactly 5/19 turn per year by the n-axis gearing (b2→l1, l2→m1, m2→n1).' };
  group.add(metPtr.g);

  // ---- Saros spiral -------------------------------------------------------
  const sar: SpiralOpts = {
    ...BACK_DIALS.saros,
    title: 'ΣΑΡΟΣ — 223 months, eclipse glyphs',
    glyphs: true,
  };
  const sarFace = backPlane(drawSpiralFace(sar, 1400, sar.rOuter + 14), texMm(sar.rOuter));
  sarFace.position.set(BACK_DIALS.saros.center.x, BACK_DIALS.saros.center.y, z);
  sarFace.userData.partId = 'dial-saros';
  sarFace.userData.tooltip = {
    title: 'Saros dial',
    body: '223 synodic months ≈ 18 years 11⅓ days: eclipses repeat with this period. Cells marked Σ predict lunar eclipses, Η solar ones (schematic distribution).',
  };
  group.add(sarFace);
  const sarPtr = spiralPointer(sar, MATERIALS.pointer);
  sarPtr.g.position.set(BACK_DIALS.saros.center.x, BACK_DIALS.saros.center.y, z - 0.6);
  sarPtr.g.userData.partId = 'pointer-saros';
  sarPtr.g.userData.tooltip = { title: 'Saros pointer', body: '4 turns per 223 months, via the 223-tooth gear e3 and the f/g axes.' };
  group.add(sarPtr.g);

  // ---- Subsidiary dials ---------------------------------------------------
  const subDial = (
    center: { x: number; y: number },
    radius: number,
    partId: string,
    title: string,
    body: string,
    drawFace: (ctx: CanvasRenderingContext2D, size: number) => void,
  ) => {
    const tex = canvasTexture(512, drawFace);
    const face = backPlane(tex, radius * 2.6);
    face.position.set(center.x, center.y, z - 0.15);
    face.userData.partId = partId;
    face.userData.tooltip = { title, body };
    group.add(face);
    const ptr = pointerArm(radius - 1, 1.1, MATERIALS.pointer);
    ptr.rotation.y = Math.PI;
    const pg = new THREE.Group();
    pg.add(ptr);
    pg.position.set(center.x, center.y, z - 0.7);
    group.add(pg);
    return pg;
  };

  const sectors = (labels: string[], start = -90) =>
    (ctx: CanvasRenderingContext2D, size: number) => {
      ctx.clearRect(0, 0, size, size);
      circle(ctx, size, 0.78, 3, INK, PARCHMENT_DARK);
      const n = labels.length;
      for (let i = 0; i < n; i++) {
        radialLine(ctx, size, start + (i * 360) / n, 0, 0.78, 2);
      }
      ctx.fillStyle = INK;
      for (let i = 0; i < n; i++) {
        const mid = start + ((i + 0.5) * 360) / n;
        const lines = labels[i].split('\n');
        lines.forEach((line, li) => {
          ringText(ctx, size, line, mid, 0.52 - li * 0.14, Math.round(size * 0.058));
        });
      }
    };

  const callippicPtr = subDial(
    BACK_DIALS.callippic.center,
    BACK_DIALS.callippic.radius,
    'dial-callippic',
    'Callippic dial',
    '76 years = 4 Metonic cycles minus one day (Callippos of Cyzicus). One pointer turn per 76 years. This dial is a conjectural restoration — no fragment of it survives.',
    sectors(['1–19', '20–38', '39–57', '58–76']),
  );

  const gamesPtr = subDial(
    BACK_DIALS.games.center,
    BACK_DIALS.games.radius,
    'dial-games',
    'Games (Olympiad) dial',
    'The 4-year cycle of the Panhellenic games (Freeth et al. 2008). The pointer turns ANTI-clockwise, one quarter per year: ΙΣΘΜΙΑ/ΟΛΥΜΠΙΑ, ΝΕΜΕΑ/ΝΑΑ, ΙΣΘΜΙΑ/ΠΥΘΙΑ, ΝΕΜΕΑ/ΑΛΙΕΙΑ.',
    sectors(['LΑ\nΙΣΘΜΙΑ\nΟΛΥΜΠΙΑ', 'LΒ\nΝΕΜΕΑ\nΝΑΑ', 'LΓ\nΙΣΘΜΙΑ\nΠΥΘΙΑ', 'LΔ\nΝΕΜΕΑ\nΑΛΙΕΙΑ'], -90),
  );

  const exeligmosPtr = subDial(
    BACK_DIALS.exeligmos.center,
    BACK_DIALS.exeligmos.radius,
    'dial-exeligmos',
    'Exeligmos dial',
    'Three Saros periods = 669 months ≈ 54 years. Because a Saros is 8 hours short of a whole day, eclipse times shift; this dial says how much to add: 0, 8 (Η) or 16 (ΙϚ) hours.',
    sectors(['·', 'Η', 'ΙϚ'], -90),
  );

  const update = (s: MechanismState) => {
    metPtr.setTurns(s.metonic.turns);
    sarPtr.setTurns(s.saros.turns);
    callippicPtr.rotation.z = s.callippic.turns * Math.PI * 2;
    gamesPtr.rotation.z = -s.games.turns * Math.PI * 2; // anti-clockwise (back view)
    exeligmosPtr.rotation.z = s.exeligmos.turns * Math.PI * 2;
  };

  return { group, update };
}
