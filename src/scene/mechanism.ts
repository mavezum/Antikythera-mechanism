/**
 * Assembles the whole machine — case, plates, gear trains, crank, dials —
 * and applies the kinematic state every frame. Also implements the
 * "see inside" features: exploded view, cross-section clipping and
 * per-subsystem isolation.
 */

import * as THREE from 'three';
import { GEAR_BY_ID, SUBSYSTEMS } from '../model/gearData';
import type { MechanismState } from '../model/kinematics';
import { RATES } from '../model/kinematics';
import { buildBackDials, buildFrontDial } from './dials';
import { crownGearGroup, gearGeometry, MATERIALS } from './gearFactory';
import { AXES, CASE, gearRenderData, GEAR_Z, K2_EXTRA_OFFSET, PIN_RADIUS } from './layout';

const TAU = Math.PI * 2;

export interface PartInfo {
  title: string;
  body: string;
}

/** Human descriptions for gears, keyed by id (others get a generic line). */
const GEAR_TOOLTIPS: Record<string, PartInfo> = {
  a1: { title: 'Crank crown gear a1 (48 teeth)', body: 'The only input. Turning the hand crank turns everything else; one crank turn advances time about 78 days.' },
  b1: { title: 'Great wheel b1 (224 teeth)', body: 'The four-spoked mean-Sun wheel: exactly one revolution per year. Every train begins here.' },
  b2: { title: 'Gear b2 (64 teeth)', body: 'Rides with b1 and feeds both the lunar train (via c1) and the back-dial trains (via l1).' },
  d2: { title: 'Gear d2 (127 teeth)', body: '127 = 254/2 — half the number of sidereal months in 19 years. The heart of the Metonic moon gearing.' },
  e3: { title: 'Epicyclic carrier e3 (223 teeth)', body: 'Turns once per ~8.88 years — the precession of the lunar orbit’s long axis — and carries the pin-and-slot pair k1/k2 on its face. Also drives the Saros train through e4.' },
  k1: { title: 'Pin gear k1 (50 teeth)', body: 'Carries a pin that engages the slot of k2. Because the two gears spin about slightly offset axes, the output speeds up and slows down each anomalistic month — the first lunar anomaly.' },
  k2: { title: 'Slot gear k2 (50 teeth)', body: 'Driven by k1’s pin through its radial slot; its axis is offset ~1 mm, so its rotation is non-uniform. Genius, in bronze.' },
  m3: { title: 'Gear m3 (27 teeth)', body: 'Drives the big 223-tooth wheel e3: 223 is the number of months in a Saros.' },
  o1: { title: 'Games gear o1 (60 teeth)', body: 'Meshes with n2 so the Games pointer turns once per four years — backwards, as on the real dial.' },
};

interface ExplodablePart {
  object: THREE.Object3D;
  basePos: THREE.Vector3;
  explodeOffset: THREE.Vector3;
}

export class Mechanism {
  readonly root = new THREE.Group();

  private gearMeshes = new Map<string, THREE.Mesh>();
  private gearBaseRot = new Map<string, number>();
  private carrierGroup!: THREE.Group; // rides with e3, holds k1/k2
  private k1Mesh!: THREE.Mesh;
  private k2Mesh!: THREE.Mesh;
  private crank!: THREE.Group;
  private frontDial = buildFrontDial();
  private backDials = buildBackDials();
  private explodables: ExplodablePart[] = [];
  private dimmables: THREE.Mesh[] = [];
  private origMaterial = new Map<THREE.Mesh, THREE.Material>();
  private dimMaterial = new THREE.MeshStandardMaterial({
    color: 0x8a7a5a,
    metalness: 0.3,
    roughness: 0.7,
    transparent: true,
    opacity: 0.07,
    depthWrite: false,
  });
  private plateMeshes: THREE.Mesh[] = [];
  private xrayOn = false;
  private isolatedKey: string | null = null;

  constructor() {
    this.buildCase();
    this.buildGears();
    this.buildCrank();
    this.root.add(this.frontDial.group);
    this.root.add(this.backDials.group);
    this.registerExplodables();
    this.collectDimmables();
  }

  // ------------------------------------------------------------------ build

  private buildCase() {
    const { width, height, frontPlateZ, backPlateZ, plateThickness, wallThickness, woodDepth } = CASE;

    const mkPlate = (z: number, name: string) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(width - wallThickness * 2, height - wallThickness * 2, plateThickness),
        MATERIALS.plate,
      );
      mesh.position.set(0, 0, z);
      mesh.userData.partId = name;
      mesh.userData.tooltip = {
        title: name === 'plate-front' ? 'Front plate' : 'Back plate',
        body: 'Bronze plate carrying the dials. Use the Explode or Slice controls (or X-ray) to look through it at the gear trains.',
      };
      this.root.add(mesh);
      this.plateMeshes.push(mesh);
      return mesh;
    };
    mkPlate(frontPlateZ, 'plate-front');
    mkPlate(backPlateZ, 'plate-back');

    // wooden case: four walls
    const wall = (w: number, h: number, x: number, y: number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, woodDepth), MATERIALS.wood);
      mesh.position.set(x, y, (frontPlateZ + backPlateZ) / 2);
      mesh.userData.partId = 'case';
      mesh.userData.tooltip = {
        title: 'Wooden case',
        body: 'The mechanism lived in a wooden box roughly 34 × 19 × 9 cm — about the size of a large dictionary.',
      };
      this.root.add(mesh);
    };
    wall(wallThickness, height, -(width - wallThickness) / 2, 0);
    wall(wallThickness, height, (width - wallThickness) / 2, 0);
    wall(width, wallThickness, 0, (height - wallThickness) / 2);
    wall(width, wallThickness, 0, -(height - wallThickness) / 2);
  }

  private buildGears() {
    const render = gearRenderData();

    // axles
    const axleZ: Record<string, [number, number]> = {};
    for (const [id, g] of render) {
      const spec = GEAR_BY_ID.get(id)!;
      const axis = spec.carrier ? null : spec.axis;
      if (!axis || axis === 'a') continue;
      const [lo, hi] = axleZ[axis] ?? [Infinity, -Infinity];
      axleZ[axis] = [Math.min(lo, g.pos.z - 4), Math.max(hi, g.pos.z + 4)];
    }
    for (const [axis, [lo, hi]] of Object.entries(axleZ)) {
      const p = AXES[axis];
      if (!p) continue;
      const len = hi - lo;
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, len, 12), MATERIALS.steel);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.set(p.x, p.y, (lo + hi) / 2);
      mesh.userData.partId = `axle-${axis}`;
      mesh.userData.tooltip = { title: `Arbor ${axis}`, body: 'A shaft carrying one or more gears.' };
      this.root.add(mesh);
      this.dimmables.push(mesh);
    }

    // the epicyclic carrier group rides on e3
    this.carrierGroup = new THREE.Group();
    const e3r = render.get('e3')!;
    this.carrierGroup.position.set(e3r.pos.x, e3r.pos.y, e3r.pos.z);
    this.root.add(this.carrierGroup);

    for (const [id, g] of render) {
      const spec = GEAR_BY_ID.get(id)!;
      if (id === 'a1') continue; // crown gear built with the crank

      const spokes = g.pitchRadius > 34 ? (id === 'b1' ? 4 : 5) : 0;
      const mesh = new THREE.Mesh(
        gearGeometry({ teeth: g.teeth, module: g.module, spokes }),
        id === 'e3' || id === 'e4' ? MATERIALS.bronzeDark : MATERIALS.bronze,
      );
      mesh.userData.partId = id;
      const spec2 = GEAR_TOOLTIPS[id];
      mesh.userData.tooltip = spec2 ?? {
        title: `Gear ${id} (${g.teeth} teeth)`,
        body: spec.note ?? 'Part of the gear work between the plates.',
      };

      if (spec.carrier) {
        // position measured from the carrier centre, in the carrier frame
        const e3pos = render.get('e3')!.pos;
        mesh.position.set(g.pos.x - e3pos.x, g.pos.y - e3pos.y, g.pos.z - e3pos.z);
        this.carrierGroup.add(mesh);
        if (id === 'k1') this.k1Mesh = mesh;
        if (id === 'k2') this.k2Mesh = mesh;
      } else {
        mesh.position.set(g.pos.x, g.pos.y, g.pos.z);
        this.root.add(mesh);
      }
      this.gearMeshes.set(id, mesh);
      this.gearBaseRot.set(id, g.phase);
      this.dimmables.push(mesh);
    }

    // the pin on k1 engaging k2's slot
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 4, 10), MATERIALS.steel);
    pin.rotation.x = Math.PI / 2;
    pin.position.set(PIN_RADIUS, 0, 2.6);
    this.k1Mesh.add(pin);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(1.8, PIN_RADIUS * 1.1, 0.8), MATERIALS.dark);
    slot.position.set(0, PIN_RADIUS * 0.5 - K2_EXTRA_OFFSET, 1.4);
    this.k2Mesh.add(slot);
  }

  private buildCrank() {
    this.crank = new THREE.Group();
    const render = gearRenderData();
    const b1 = render.get('b1')!;
    const crownR = (48 * 0.5) / 2; // 48 teeth at module 0.5
    // Arbor along +x. The crown ring lies in the y-z plane, so its rim spans
    // ±(crownR+2) in z: centre it deep enough that the rim's front just
    // reaches b1's tooth plane instead of poking through the front plate.
    const engageX = b1.pitchRadius + 2;
    this.crank.position.set(engageX, AXES.b.y, GEAR_Z.b1 - crownR - 2);
    this.crank.rotation.y = Math.PI / 2; // local +z -> world +x

    const crown = crownGearGroup(48, crownR, MATERIALS.bronzeDark);
    crown.position.set(0, 0, 0);
    this.crank.add(crown);

    const shaftLen = CASE.width / 2 - engageX + 22;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, shaftLen, 12), MATERIALS.steel);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.set(0, 0, shaftLen / 2);
    this.crank.add(shaft);

    // L-shaped handle
    const armLen = 16;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(3, armLen, 3), MATERIALS.bronzeDark);
    arm.position.set(0, armLen / 2 - 1.5, shaftLen + 1.5);
    this.crank.add(arm);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 12, 14), MATERIALS.wood);
    grip.rotation.x = Math.PI / 2;
    grip.position.set(0, armLen - 1.5, shaftLen + 7.5);
    this.crank.add(grip);

    this.crank.traverse((o) => {
      o.userData.partId = 'crank';
      o.userData.tooltip = {
        title: 'Hand crank',
        body: 'Drag me! The single input that drives the whole cosmos. One turn ≈ 78 days. (Keyboard: ← → arrows, shift for a whole year.)',
      };
    });
    this.root.add(this.crank);
  }

  private registerExplodables() {
    const add = (object: THREE.Object3D, offsetZ: number) => {
      this.explodables.push({
        object,
        basePos: object.position.clone(),
        explodeOffset: new THREE.Vector3(0, 0, offsetZ),
      });
    };
    // gears: spread proportionally to their depth
    for (const [id, mesh] of this.gearMeshes) {
      if (GEAR_BY_ID.get(id)?.carrier) continue; // ride with e3
      add(mesh, (GEAR_Z[id] ?? 0) * 1.6);
    }
    add(this.carrierGroup, (GEAR_Z.e3 ?? 0) * 1.6);
    add(this.crank, GEAR_Z.b1 * 1.6 + 10);
    for (const mesh of this.plateMeshes) {
      add(mesh, mesh.position.z > 0 ? 55 : -55);
    }
    add(this.frontDial.group, 85);
    add(this.backDials.group, -85);
    // axles stretch with their gears — simply move with mid depth
    for (const obj of this.root.children) {
      if (typeof obj.userData.partId === 'string' && obj.userData.partId.startsWith('axle-')) {
        add(obj, obj.position.z * 1.6);
      }
    }
  }

  private collectDimmables() {
    // everything in the scene graph (gears, dials, plates, walls, crank)
    const seen = new Set<THREE.Mesh>(this.dimmables);
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh && !seen.has(o)) {
        seen.add(o);
        this.dimmables.push(o);
      }
    });
  }

  // ------------------------------------------------------------------ state

  /** Apply the kinematic state to every moving part. */
  update(s: MechanismState) {
    for (const [id, mesh] of this.gearMeshes) {
      const angle = s.gearAngles.get(id);
      if (angle === undefined) continue;
      const base = this.gearBaseRot.get(id) ?? 0;
      const spec = GEAR_BY_ID.get(id)!;
      if (spec.carrier) {
        // angle is absolute; the carrier group already rotates by e3's angle
        const carrierAngle = s.gearAngles.get('e3') ?? 0;
        mesh.rotation.z = base + (angle - carrierAngle);
      } else {
        mesh.rotation.z = base + angle;
      }
    }
    const e3Angle = s.gearAngles.get('e3') ?? 0;
    this.carrierGroup.rotation.z = e3Angle;

    // crank: after rotation.y = π/2 the group's local z is world +x, so
    // spinning local z turns the whole crank (crown + handle) on its shaft.
    this.crank.rotation.z = s.crankTurns * TAU;

    this.frontDial.update(s);
    this.backDials.update(s);
  }

  // --------------------------------------------------------------- features

  /** 0 = assembled, 1 = fully exploded. */
  setExplode(f: number) {
    for (const p of this.explodables) {
      p.object.position.set(
        p.basePos.x + p.explodeOffset.x * f,
        p.basePos.y + p.explodeOffset.y * f,
        p.basePos.z + p.explodeOffset.z * f,
      );
    }
  }

  setXray(on: boolean) {
    this.xrayOn = on;
    this.applyMaterialState();
  }

  /** Isolate one subsystem (null = show all). */
  isolate(key: string | null) {
    this.isolatedKey = key;
    this.applyMaterialState();
  }

  get isolated(): string | null {
    return this.isolatedKey;
  }

  private applyMaterialState() {
    const key = this.isolatedKey;
    const sub = key ? SUBSYSTEMS[key] : null;
    const keep = sub ? new Set(sub.gears) : null;

    const dialFor: Record<string, string[]> = {
      sun: ['dial-front', 'ring-egyptian', 'pointer-sun'],
      moon: ['dial-front', 'ring-egyptian', 'pointer-moon', 'pointer-sun'],
      planets: ['dial-front', 'pointer-mercury', 'pointer-venus', 'pointer-mars', 'pointer-jupiter', 'pointer-saturn'],
      metonic: ['dial-metonic', 'pointer-metonic'],
      callippic: ['dial-callippic'],
      games: ['dial-games'],
      saros: ['dial-saros', 'pointer-saros'],
      exeligmos: ['dial-exeligmos'],
    };
    const keepParts = new Set<string>([...(key ? (dialFor[key] ?? []) : []), 'crank']);

    for (const mesh of this.dimmables) {
      const id = this.partIdOf(mesh);
      let visible = true;
      if (keep) {
        visible = (id !== undefined && (keep.has(id) || keepParts.has(id)));
      }
      const isPlate = id === 'plate-front' || id === 'plate-back' || id === 'case';
      const isDialFace = id?.startsWith('dial-') || id?.startsWith('ring-');
      const xrayDim = this.xrayOn && (isPlate || isDialFace);

      if (!visible || (xrayDim && (!keep || !isDialFace))) {
        if (!this.origMaterial.has(mesh)) this.origMaterial.set(mesh, mesh.material as THREE.Material);
        mesh.material = this.dimMaterial;
      } else if (this.origMaterial.has(mesh)) {
        mesh.material = this.origMaterial.get(mesh)!;
      }
    }
  }

  private partIdOf(o: THREE.Object3D): string | undefined {
    let cur: THREE.Object3D | null = o;
    while (cur) {
      if (cur.userData.partId) return cur.userData.partId as string;
      cur = cur.parent;
    }
    return undefined;
  }

  /** For the crank-drag interaction: world position of the grip. */
  get crankGroup(): THREE.Group {
    return this.crank;
  }

  /** turns-per-year of the crank, for input mapping. */
  static readonly CRANK_TURNS_PER_YEAR = RATES.crank.valueOf();
}
