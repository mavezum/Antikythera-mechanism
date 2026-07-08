/**
 * App entry: renderer, camera, interaction (orbit, crank drag, hover, click
 * to isolate), see-inside controls, and the frame loop that feeds the single
 * kinematic state to the 3D mechanism and the UI.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import './style.css';
import { mechanismState } from './model/kinematics';
import { Mechanism } from './scene/mechanism';
import { Sim } from './sim';
import { UI, type AppControls } from './ui/ui';
import { SUBSYSTEMS } from './model/gearData';

// ---------------------------------------------------------------- renderer

const container = document.getElementById('scene')!;
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0e13);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const key = new THREE.DirectionalLight(0xfff2dd, 1.6);
key.position.set(180, 220, 260);
scene.add(key);
const rim = new THREE.DirectionalLight(0x88aaff, 0.5);
rim.position.set(-160, -60, -240);
scene.add(rim);
scene.add(new THREE.AmbientLight(0x404040, 0.5));

const camera = new THREE.PerspectiveCamera(
  42,
  window.innerWidth / window.innerHeight,
  1,
  4000,
);
camera.position.set(200, 80, 320);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 15, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 60;
controls.maxDistance = 1200;

// ------------------------------------------------------------- mechanism

const mech = new Mechanism();
scene.add(mech.root);

const sim = new Sim();
sim.jumpToday();
// start assembled at "today" without the initial animation
sim.tick(1000);

// ---------------------------------------------------------- camera tweens

const VIEWS: Record<string, { pos: [number, number, number]; target: [number, number, number] }> = {
  front: { pos: [0, 52, 290], target: [0, 52, 0] },
  back: { pos: [0, 15, -500], target: [0, 15, 0] },
  side: { pos: [320, 60, 80], target: [0, 20, 0] },
};

let camTween: {
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  t: number;
} | null = null;

function tweenCamera(pos: [number, number, number], target: [number, number, number]) {
  if (sim.reducedMotion) {
    camera.position.set(...pos);
    controls.target.set(...target);
    return;
  }
  camTween = {
    fromPos: camera.position.clone(),
    toPos: new THREE.Vector3(...pos),
    fromTarget: controls.target.clone(),
    toTarget: new THREE.Vector3(...target),
    t: 0,
  };
}
controls.addEventListener('start', () => (camTween = null));

// ------------------------------------------------------------ see inside

let explodeF = 0;
const slicePlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 1e6);

const appControls: AppControls = {
  goToView: (name) => tweenCamera(VIEWS[name].pos, VIEWS[name].target),
  tweenCamera,
  setExplode: (f) => {
    explodeF = f;
    mech.setExplode(f);
  },
  setSlice: (f) => {
    if (f <= 0.001) {
      renderer.clippingPlanes = [];
    } else {
      // slide the cut from the right-hand edge toward the far side
      slicePlane.constant = 100 - f * 165;
      renderer.clippingPlanes = [slicePlane];
    }
  },
  setXray: (on) => mech.setXray(on),
  isolate: (k) => mech.isolate(k),
};

const ui = new UI(sim, appControls);

// ------------------------------------------------------------ interaction

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hovered: string | null = null;

function pick(ev: PointerEvent | MouseEvent): THREE.Object3D | null {
  pointer.x = (ev.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(ev.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(mech.root.children, true);
  for (const h of hits) {
    let o: THREE.Object3D | null = h.object;
    while (o) {
      if (o.userData.tooltip) return o;
      o = o.parent;
    }
  }
  return null;
}

// crank dragging
let draggingCrank = false;
let lastDragY = 0;

renderer.domElement.addEventListener('pointerdown', (ev) => {
  const hit = pick(ev);
  if (hit && hit.userData.partId === 'crank') {
    draggingCrank = true;
    lastDragY = ev.clientY;
    controls.enabled = false;
    renderer.domElement.setPointerCapture(ev.pointerId);
    sim.playing = false;
  }
  downPos = { x: ev.clientX, y: ev.clientY };
});

renderer.domElement.addEventListener('pointermove', (ev) => {
  if (draggingCrank) {
    const dy = ev.clientY - lastDragY;
    lastDragY = ev.clientY;
    sim.crank(dy * 0.004); // pixels -> crank turns
    return;
  }
  const hit = pick(ev);
  const id = hit?.userData.partId ?? null;
  if (id !== hovered) {
    hovered = id;
    renderer.domElement.style.cursor = id === 'crank' ? 'grab' : id ? 'pointer' : '';
  }
  if (hit) {
    const tip = hit.userData.tooltip as { title: string; body: string };
    ui.showTooltip(ev.clientX, ev.clientY, tip.title, tip.body);
  } else {
    ui.hideTooltip();
  }
});

renderer.domElement.addEventListener('pointerup', (ev) => {
  if (draggingCrank) {
    draggingCrank = false;
    controls.enabled = true;
    renderer.domElement.releasePointerCapture(ev.pointerId);
    return;
  }
  // click (not drag): isolate the subsystem behind the clicked part
  if (downPos && Math.hypot(ev.clientX - downPos.x, ev.clientY - downPos.y) < 5) {
    const hit = pick(ev);
    const id = hit?.userData.partId as string | undefined;
    if (id) {
      const key = subsystemForPart(id);
      if (key) {
        const next = mech.isolated === key ? null : key;
        mech.isolate(next);
        ui.reflectIsolate(next);
      }
    }
  }
  downPos = null;
});

let downPos: { x: number; y: number } | null = null;

const PART_TO_SUBSYSTEM: Record<string, string> = {
  'dial-metonic': 'metonic',
  'pointer-metonic': 'metonic',
  'dial-saros': 'saros',
  'pointer-saros': 'saros',
  'dial-callippic': 'callippic',
  'dial-games': 'games',
  'dial-exeligmos': 'exeligmos',
  'pointer-moon': 'moon',
  'pointer-sun': 'sun',
  'dial-front': 'sun',
  'ring-egyptian': 'sun',
  'pointer-mercury': 'planets',
  'pointer-venus': 'planets',
  'pointer-mars': 'planets',
  'pointer-jupiter': 'planets',
  'pointer-saturn': 'planets',
};

function subsystemForPart(partId: string): string | null {
  if (PART_TO_SUBSYSTEM[partId]) return PART_TO_SUBSYSTEM[partId];
  // gears: first subsystem that contains this gear (most specific listed first)
  const order = ['moon', 'metonic', 'callippic', 'games', 'saros', 'exeligmos', 'sun'];
  for (const k of order) {
    if (SUBSYSTEMS[k]?.gears.includes(partId)) return k;
  }
  return null;
}

// ------------------------------------------------------------- keyboard

window.addEventListener('keydown', (ev) => {
  const target = ev.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return;
  if (ui.modalOpen) {
    if (ev.key === 'Escape') ui.closeModal();
    return;
  }
  const dayTurns = 1 / 78.27; // one crank turn ≈ 78 days
  switch (ev.key) {
    case ' ':
      ev.preventDefault();
      ui.togglePlay();
      break;
    case 'ArrowRight':
      sim.crank(ev.shiftKey ? dayTurns * 30 : dayTurns);
      break;
    case 'ArrowLeft':
      sim.crank(ev.shiftKey ? -dayTurns * 30 : -dayTurns);
      break;
    case 'f':
      appControls.goToView('front');
      break;
    case 'b':
      appControls.goToView('back');
      break;
    case 's':
      appControls.goToView('side');
      break;
    case 'e': {
      const f = explodeF > 0.5 ? 0 : 1;
      appControls.setExplode(f);
      ui.reflectExplode(f);
      break;
    }
    case 'x': {
      const on = !(document.getElementById('xray') as HTMLInputElement).checked;
      appControls.setXray(on);
      ui.reflectXray(on);
      break;
    }
    case 't':
      ui.startTour();
      break;
    case 'g':
      ui.openModal();
      break;
    case 'Escape':
      if (ui.tourActive) ui.endTour();
      else {
        mech.isolate(null);
        ui.reflectIsolate(null);
      }
      break;
  }
});

// --------------------------------------------------------------- resize

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ------------------------------------------------------------ frame loop

const clock = new THREE.Clock();

function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  sim.tick(dt);

  if (camTween) {
    camTween.t = Math.min(1, camTween.t + dt / 1.4);
    const e = 1 - Math.pow(1 - camTween.t, 3); // ease-out cubic
    camera.position.lerpVectors(camTween.fromPos, camTween.toPos, e);
    controls.target.lerpVectors(camTween.fromTarget, camTween.toTarget, e);
    if (camTween.t >= 1) camTween = null;
  }
  controls.update();

  const state = mechanismState(sim.years);
  mech.update(state);
  ui.updateReadings(state);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

frame();
