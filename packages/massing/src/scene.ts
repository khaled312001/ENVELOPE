/**
 * The building, as a three.js scene — built from the engine's model and nothing else.
 *
 * The massing view is the most persuasive surface in the product, which makes it
 * the one with the most room to invent: a renderer handed "a podium and a tower"
 * decides for itself how tall a level is, where the cars stand and whether a ramp
 * exists. This builder is handed a `BuildingModel` and has no other input, so it
 * cannot. Every object it makes comes from one element of the model, is coloured
 * by the provenance class of the value that element names, and carries that
 * value's node, so a click on it opens the same derivation a click on the number
 * does.
 *
 * What it draws, and what it deliberately does not:
 *
 * - **Levels are stacked, not extruded.** Each level is its slab outline at its own
 *   floor level, with the storey above it as a translucent volume. The mass is what
 *   the stack adds up to; there is no separate "tower block" to disagree with it.
 * - **Slabs have no thickness.** The engine computes none (`notModelled`), so a
 *   slab is a plane. A 300 mm slab drawn here would be a dimension nobody computed.
 * - **Cars stand where the sheet puts them.** Position and heading come from
 *   `placeCars` — the same call the parking sheet and its DXF make — so a car that
 *   faces the aisle on paper faces it here. The car's shape is the sheet's drafting
 *   symbol, stood up; it is a convention, not a vehicle the engine sized, and it is
 *   drawn in neutral ink for that reason.
 * - **The solid building is the answer's.** The stack stands to the height ceiling;
 *   the levels the answer does not place (`ModelLevel.placed`) are outlines only, in
 *   neutral ink. Drawn solid, the worked example was fourteen storeys beside a figure
 *   that says five.
 * - **No cores, stairs, façades or columns.** The model does not place them, so
 *   neither does this. The caption lists `notModelled` beside the canvas.
 *
 * It needs no browser. Nothing here touches a renderer or the DOM, which is what
 * lets `pnpm parity` count the cars in the 3D view against the engine's figure in
 * Node, the same way it counts them on the sheets and in the DXF.
 */

import type { BuildingModel, ModelLevel, ModelPoint, ModelRing, ProvenanceClass } from '@envelope/core';
import { placeCars, signedLevel, SYMBOLS } from '@envelope/sheets';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Colours the scene is inked in, as CSS colour strings. Read from the tokens by the viewer. */
export interface ScenePalette {
  readonly derived: string;
  readonly assumed: string;
  readonly userSet: string;
  /** Everything a class does not colour: boundaries, aisles, cars. */
  readonly neutral: string;
  readonly ground: string;
  readonly car: string;
}

/** What a click on an object opens. */
export interface Pick {
  readonly node: string;
  /** Lower wins when a ray passes through several things — a car inside the envelope is the car. */
  readonly rank: number;
  /** For a merged fill: which element each triangle belongs to, as a short name. */
  readonly triangleNames?: readonly string[];
  readonly name: string;
}

/** A word the viewer may print beside the model, anchored in plot-local metres. */
export interface SceneLabel {
  readonly key: string;
  readonly text: string;
  /** Plot-local metres, z up; relative to its level's floor when `levelId` is set. */
  readonly at: readonly [number, number, number];
  readonly levelId: string | null;
  readonly kind: 'level' | 'edge' | 'ramp' | 'ceiling' | 'access';
  readonly provenanceClass: ProvenanceClass | null;
  /**
   * Shown in the whole-building view. A level's label is otherwise shown only when
   * that level is on its own: fourteen labels up one face is a column of noise.
   */
  readonly always: boolean;
}

export interface BuildingScene {
  /** Y up, metres, origin on the plot centroid. Add this to a `THREE.Scene`. */
  readonly root: THREE.Group;
  /** One group per level, in model order, positioned at the level's floor. */
  readonly levels: readonly { readonly level: ModelLevel; readonly group: THREE.Group }[];
  readonly labels: readonly SceneLabel[];
  /** The plot centroid the scene is measured from, in plot millimetres. */
  readonly originMm: { readonly x: number; readonly y: number };
  /** The top of the height ceiling, in metres above datum. */
  readonly ceilingM: number;
  /** Everything a ray should test. */
  readonly pickables: readonly THREE.Object3D[];
  /** Moves each level up by `gapM × its index`, and re-slopes the ramps to follow. */
  setSpread(gapM: number): void;
  /** Shows one level (and any ramp touching it), or every level when null. */
  isolate(levelId: string | null): void;
  /**
   * From above, the height ceiling's glass lid lies over every level and tints the
   * plan; it is lifted off. The ceiling is still there, as the line round the top.
   */
  setPlan(plan: boolean): void;
  /** A world-space plane every material is clipped by. Set its constant to cut. */
  readonly cut: THREE.Plane;
  dispose(): void;
}

/** A car's body and cabin, from the sheet's CAR symbol. Heights are a drafting convention. */
const CAR_BODY_M = 1.0;
const CAR_CABIN_M = 0.45;

const CLIP_OFF = 1e6;

export function colourOf(cls: ProvenanceClass, palette: ScenePalette): string {
  if (cls === 'DERIVED') return palette.derived;
  if (cls === 'ASSUMED') return palette.assumed;
  if (cls === 'USER_SET') return palette.userSet;
  return palette.neutral;
}

export function buildBuildingScene(model: BuildingModel, palette: ScenePalette): BuildingScene {
  const origin = centroid(model.plot.outline);
  const at = (p: ModelPoint): THREE.Vector2 => new THREE.Vector2((p.x - origin.x) / 1000, (p.y - origin.y) / 1000);
  const cut = new THREE.Plane(new THREE.Vector3(0, -1, 0), CLIP_OFF);
  const clippingPlanes = [cut];
  const disposables: { dispose(): void }[] = [];
  const pickables: THREE.Object3D[] = [];
  const labels: SceneLabel[] = [];

  const track = <T extends { dispose(): void }>(x: T): T => {
    disposables.push(x);
    return x;
  };

  const surface = (colour: string, opacity: number, depthWrite = opacity >= 1): THREE.Material =>
    track(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(colour),
        transparent: opacity < 1,
        opacity,
        depthWrite,
        side: THREE.DoubleSide,
        roughness: 0.9,
        metalness: 0,
        clippingPlanes,
        // Coplanar fills (a bay on its slab) are lifted in depth rather than in space,
        // so nothing is drawn floating above the floor it sits on.
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    );
  const ink = (colour: string, opacity = 1): THREE.LineBasicMaterial =>
    track(new THREE.LineBasicMaterial({ color: new THREE.Color(colour), transparent: opacity < 1, opacity, clippingPlanes }));
  const pickable = (o: THREE.Object3D, pick: Pick): void => {
    o.userData['pick'] = pick;
    pickables.push(o);
  };

  const root = new THREE.Group();
  root.name = 'building';
  // The engine's plane is XY with Z up; three's is Y up. Turning the whole model once
  // keeps every coordinate below exactly as the engine emitted it.
  root.rotation.x = -Math.PI / 2;

  // --- the site ------------------------------------------------------------------------
  const site = new THREE.Group();
  site.name = 'site';
  root.add(site);

  const plotFill = new THREE.Mesh(track(fill([model.plot.outline], at, 0).geometry), surface(palette.ground, 0.35));
  plotFill.name = 'plot';
  plotFill.receiveShadow = true;
  site.add(plotFill);
  site.add(named(new THREE.LineLoop(track(ringLine(model.plot.outline, at, 0)), ink(palette.neutral)), 'plot boundary'));

  for (const edge of model.plot.edges) {
    const a = at(edge.start);
    const b = at(edge.end);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const out = outwardNormal(model.plot.outline, a, b, at);
    labels.push({
      key: `edge-${edge.seq}`,
      text: edge.setbackM === null ? edge.label : `${edge.label} · setback ${edge.setbackM} m`,
      at: [mid.x + out.x * 3, mid.y + out.y * 3, 0],
      levelId: null,
      kind: 'edge',
      provenanceClass: null,
      always: true,
    });
  }

  if (model.access) {
    const [a, b] = model.access.opening;
    const pa = at(a);
    const pb = at(b);
    const arrow = new THREE.Mesh(track(accessArrow(pa, pb, model.plot.outline, at)), surface(colourOf(model.access.source.provenanceClass, palette), 0.9));
    arrow.name = 'vehicle access';
    arrow.position.z = 0.03;
    pickable(arrow, { node: model.access.source.node, rank: 3, name: model.access.label });
    site.add(arrow);
    // Inside the plot, past the arrow: outside it is where the edge's own label sits.
    const mid = pa.clone().add(pb).multiplyScalar(0.5).addScaledVector(outwardNormal(model.plot.outline, pa, pb, at), -6);
    labels.push({
      key: 'access',
      text: model.access.label,
      at: [mid.x, mid.y, 0.2],
      levelId: null,
      kind: 'access',
      provenanceClass: model.access.source.provenanceClass,
      always: true,
    });
  }

  // --- the envelope: what the rules permit, as a glass case round the building ----------
  const ceilingM = Number(model.heightCeilingM.value);
  const envelope = new THREE.Group();
  envelope.name = 'envelope';
  root.add(envelope);
  const envColour = colourOf(model.setbackSource.provenanceClass, palette);
  const envWalls = new THREE.Mesh(track(walls(model.setbackLine, at, 0, ceilingM)), surface(envColour, 0.07, false));
  envWalls.name = 'setback line, to the height ceiling';
  pickable(envWalls, { node: model.setbackSource.node, rank: 9, name: 'Setback line' });
  envelope.add(envWalls);
  envelope.add(named(new THREE.LineSegments(track(prismEdges(model.setbackLine, at, 0, ceilingM)), ink(envColour, 0.55)), 'envelope edges'));
  const ceilingColour = colourOf(model.heightCeilingM.provenanceClass, palette);
  const ceiling = new THREE.LineLoop(track(ringLine(model.setbackLine, at, ceilingM)), ink(ceilingColour));
  ceiling.name = 'height ceiling';
  envelope.add(ceiling);
  const ceilingTop = new THREE.Mesh(track(fill([model.setbackLine], at, ceilingM).geometry), surface(ceilingColour, 0.05, false));
  pickable(ceilingTop, { node: model.heightCeilingM.node, rank: 9, name: 'Height ceiling' });
  envelope.add(ceilingTop);
  const first = model.setbackLine[0];
  if (first) {
    const p = at(first);
    labels.push({
      key: 'ceiling',
      text: `Height ceiling ${signedLevel(model.heightCeilingM.value)} m`,
      at: [p.x, p.y, ceilingM],
      levelId: null,
      kind: 'ceiling',
      provenanceClass: model.heightCeilingM.provenanceClass,
      always: true,
    });
  }

  // --- the levels ---------------------------------------------------------------------------
  const carGeometry = track(carShape());
  const levels: { level: ModelLevel; group: THREE.Group }[] = [];
  let previousParking = false;
  model.levels.forEach((level, index) => {
    const group = new THREE.Group();
    group.name = `${level.id} ${level.name}`;
    group.userData['levelId'] = level.id;
    group.position.z = level.elevationMm / 1000;
    root.add(group);
    levels.push({ level, group });

    // `=== false`, not `!`: a run stored before the model carried the flag is drawn whole.
    if (level.placed === false) {
      // Permitted and not placed: the ceiling allows the level and the answer does not
      // use it. An outline in neutral ink — no fill, no storey, nothing to click — so
      // the solid building is the answer's and the rest reads as room above it. Inked
      // in its outline's class it would put a column of amber over levels nobody
      // assumed anything about.
      group.add(named(new THREE.LineLoop(track(ringLine(level.outline, at, 0)), ink(palette.neutral, 0.45)), `${level.id} permitted, not placed`));
      const corner = southWest(level.outline, at);
      labels.push({
        key: `level-${level.id}`,
        text: `${level.name} · ${signedLevel(level.elevationM.value)} m · permitted, not placed`,
        at: [corner.x, corner.y, 0],
        levelId: level.id,
        kind: 'level',
        provenanceClass: null,
        always: false,
      });
      previousParking = false;
      return;
    }

    const slabColour = colourOf(level.outlineSource.provenanceClass, palette);
    const slab = new THREE.Mesh(track(fill([level.outline], at, 0).geometry), surface(slabColour, 0.28, false));
    slab.name = `${level.id} slab`;
    pickable(slab, { node: level.outlineSource.node, rank: 6, name: `${level.id} slab` });
    group.add(slab);
    group.add(named(new THREE.LineLoop(track(ringLine(level.outline, at, 0)), ink(slabColour)), `${level.id} floor line`));

    // The storey above the slab, as the volume a reader sees the building as. Faint on
    // a parking level, so the cars inside it stay legible.
    const storeyM = level.heightMm / 1000;
    const storey = new THREE.Mesh(track(walls(level.outline, at, 0, storeyM)), surface(slabColour, level.parking ? 0.1 : 0.2, false));
    storey.name = `${level.id} storey`;
    storey.castShadow = true;
    group.add(storey);

    if (level.parking) addParking(group, level, level.parking);

    /*
      THE CORE, AS A SHAFT — Eng. Mohamed's *"الاهم"*.

      Walls rather than a floor patch, so it reads as one thing running up the
      building instead of a room repeated on every storey. Its footprint is
      identical on every level it passes through, which is what makes it a core;
      the model says which levels those are, so nothing here decides.

      Inked in the class of the value that SIZED it, like every other element:
      an unstated core is amber on every level of the picture, which is §13.1
      doing exactly what it is for. Nobody has said how big it is.
    */
    if (model.core && model.core.levelIds.includes(level.id)) {
      const core = model.core;
      // On a parking level, what passes through is the shafts, not the whole core.
      const onParking = level.parking !== null && core.shaft !== undefined;
      const outline = onParking ? core.shaft!.outline : core.outline;
      const coreColour = colourOf(
        onParking ? core.shaft!.areaM2.provenanceClass : core.source.provenanceClass,
        palette,
      );
      const shaft = new THREE.Mesh(track(walls(outline, at, 0, storeyM)), surface(coreColour, 0.3, false));
      shaft.name = `${level.id} core`;
      pickable(shaft, { node: core.areaM2.node, rank: 4, name: core.label });
      group.add(shaft);
      group.add(named(new THREE.LineLoop(track(ringLine(core.outline, at, 0)), ink(coreColour)), `${level.id} core outline`));
    }

    // Every level is named; three are named in the whole-building view — the lowest,
    // the first above the parking, and the top — and the rest when shown on their own.
    const top = index === model.levels.length - 1 || model.levels[index + 1]?.placed === false;
    const towerStarts = previousParking && !level.parking;
    const corner = southWest(level.outline, at);
    labels.push({
      key: `level-${level.id}`,
      text: `${level.name} · ${signedLevel(level.elevationM.value)} m`,
      at: [corner.x, corner.y, 0],
      levelId: level.id,
      kind: 'level',
      provenanceClass: level.elevationM.provenanceClass,
      always: index === 0 || towerStarts || top,
    });
    previousParking = level.parking !== null;
  });

  function addParking(group: THREE.Group, level: ModelLevel, parking: NonNullable<ModelLevel['parking']>): void {
    const baysColour = colourOf(parking.baysSource.provenanceClass, palette);

    for (const aisle of parking.aisles) {
      const mesh = new THREE.Mesh(track(fill([aisle.outline], at, 0).geometry), surface(palette.neutral, 0.16, false));
      mesh.name = `${level.id} ${aisle.label}`;
      group.add(mesh);
    }

    if (parking.reserved) {
      const cls = parking.reserved.areaM2.provenanceClass;
      const mesh = new THREE.Mesh(track(fill([parking.reserved.outline], at, 0).geometry), surface(colourOf(cls, palette), 0.22, false));
      mesh.name = `${level.id} reserved zone`;
      pickable(mesh, { node: parking.reserved.areaM2.node, rank: 3, name: parking.reserved.label });
      group.add(mesh);
      group.add(named(new THREE.LineLoop(track(ringLine(parking.reserved.outline, at, 0.01)), ink(colourOf(cls, palette))), `${level.id} reserved outline`));
    }

    if (parking.rampStrip) {
      group.add(named(new THREE.LineLoop(track(ringLine(parking.rampStrip, at, 0.01)), ink(palette.neutral)), `${level.id} ramp strip`));
    }

    // Bays: their real outlines, merged — one draw call a level, however many bays.
    const bayRings = parking.bays.map((b) => b.outline);
    const bayLines = new THREE.LineSegments(track(ringsSegments(bayRings, at, 0.01)), ink(baysColour));
    bayLines.name = `${level.id} bays`;
    group.add(bayLines);
    const accessible = parking.bays.filter((b) => b.accessible);
    const bayFill = fill(bayRings, at, 0);
    const fillMesh = new THREE.Mesh(track(bayFill.geometry), surface(baysColour, 0.12, false));
    fillMesh.name = `${level.id} bay floor`;
    pickable(fillMesh, {
      node: parking.baysSource.node,
      rank: 2,
      name: `${level.id} bays`,
      triangleNames: bayFill.triangleRing.map((i) => {
        const bay = parking.bays[i]!;
        return `${level.id} bay ${bay.number}${bay.accessible ? ', accessible' : ''}`;
      }),
    });
    group.add(fillMesh);
    if (accessible.length > 0) {
      const acc = new THREE.Mesh(track(fill(accessible.map((b) => b.outline), at, 0).geometry), surface(baysColour, 0.4, false));
      acc.name = `${level.id} accessible bays`;
      group.add(acc);
    }

    // One car per bay, instanced: a level of several hundred is one draw call.
    const cars = placeCars(parking);
    const mesh = new THREE.InstancedMesh(carGeometry, [surface(palette.car, 1), surface(palette.neutral, 1)], cars.length);
    mesh.name = `${level.id} cars`;
    mesh.castShadow = true;
    mesh.userData['role'] = 'cars';
    mesh.userData['levelId'] = level.id;
    mesh.userData['bays'] = cars.map((c) => c.bay.number);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    cars.forEach((car, i) => {
      const p = at(car.at);
      q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), (car.rotationDeg * Math.PI) / 180);
      m.compose(new THREE.Vector3(p.x, p.y, 0), q, one);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    pickable(mesh, {
      node: parking.baysSource.node,
      rank: 1,
      name: `${level.id} cars`,
    });
    group.add(mesh);
  }

  // --- ramps: a sloped plane between the two levels it joins -------------------------------
  const rampMeshes: { ramp: BuildingModel['ramps'][number]; mesh: THREE.Mesh; edges: THREE.LineLoop }[] = [];
  for (const ramp of model.ramps) {
    const colour = colourOf(ramp.gradientPct.provenanceClass, palette);
    const geometry = track(new THREE.BufferGeometry());
    const mesh = new THREE.Mesh(geometry, surface(colour, 0.6, false));
    mesh.name = `ramp ${ramp.id}`;
    pickable(mesh, { node: ramp.gradientPct.node, rank: 2, name: ramp.label });
    const edges = new THREE.LineLoop(track(new THREE.BufferGeometry()), ink(colour));
    edges.name = `ramp ${ramp.id} edge`;
    root.add(mesh, edges);
    rampMeshes.push({ ramp, mesh, edges });
  }

  const levelZ = new Map<string, number>();
  function setSpread(gapM: number): void {
    // Levels pulled apart no longer stand where the rules measure them, so the
    // envelope that measures them is set aside while they are.
    envelope.visible = gapM === 0;
    levels.forEach(({ level, group }, i) => {
      const z = level.elevationMm / 1000 + i * gapM;
      group.position.z = z;
      levelZ.set(level.id, z);
    });
    for (const { ramp, mesh, edges } of rampMeshes) {
      const z0 = levelZ.get(ramp.fromLevelId) ?? ramp.fromElevationMm / 1000;
      const z1 = levelZ.get(ramp.toLevelId) ?? ramp.toElevationMm / 1000;
      const [f0, f1] = ramp.foot.map(at) as [THREE.Vector2, THREE.Vector2];
      let [h0, h1] = ramp.head.map(at) as [THREE.Vector2, THREE.Vector2];
      // Keep the quad untwisted whichever way round the head edge was written.
      if (f0.distanceTo(h0) + f1.distanceTo(h1) > f0.distanceTo(h1) + f1.distanceTo(h0)) [h0, h1] = [h1, h0];
      const v = [
        [f0.x, f0.y, z0],
        [f1.x, f1.y, z0],
        [h1.x, h1.y, z1],
        [h0.x, h0.y, z1],
      ] as const;
      mesh.geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute([...v[0], ...v[1], ...v[2], ...v[0], ...v[2], ...v[3]], 3),
      );
      mesh.geometry.computeVertexNormals();
      mesh.geometry.computeBoundingSphere();
      edges.geometry.setAttribute('position', new THREE.Float32BufferAttribute(v.flat(), 3));
      edges.geometry.computeBoundingSphere();
    }
  }
  setSpread(0);

  for (const { ramp } of rampMeshes) {
    const p = centreOf(ramp.outline, at);
    labels.push({
      key: `ramp-${ramp.id}`,
      text: `${ramp.gradientPct.value}% · gradient not assessed`,
      at: [p.x, p.y, (ramp.toElevationMm - ramp.fromElevationMm) / 2000],
      levelId: ramp.fromLevelId,
      kind: 'ramp',
      provenanceClass: ramp.gradientPct.provenanceClass,
      always: true,
    });
  }

  function isolate(levelId: string | null): void {
    for (const { level, group } of levels) group.visible = levelId === null || level.id === levelId;
    for (const { ramp, mesh, edges } of rampMeshes) {
      const shown = levelId === null || ramp.fromLevelId === levelId || ramp.toLevelId === levelId;
      mesh.visible = shown;
      edges.visible = shown;
    }
  }

  function setPlan(plan: boolean): void {
    ceilingTop.visible = !plan;
  }

  return {
    root,
    levels,
    labels,
    originMm: origin,
    ceilingM,
    pickables,
    setSpread,
    isolate,
    setPlan,
    cut,
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}

/** The cars a scene holds, per level — what `pnpm parity` counts. */
export function carsPerLevel(scene: BuildingScene): Map<string, THREE.InstancedMesh> {
  const out = new Map<string, THREE.InstancedMesh>();
  scene.root.traverse((o) => {
    if (o instanceof THREE.InstancedMesh && o.userData['role'] === 'cars') out.set(String(o.userData['levelId']), o);
  });
  return out;
}

/** The pick a ray should report, from everything it passed through. */
export function choosePick(hits: readonly THREE.Intersection[]): { pick: Pick; name: string } | null {
  let best: { pick: Pick; name: string; distance: number } | null = null;
  for (const hit of hits) {
    const pick = hit.object.userData['pick'] as Pick | undefined;
    if (!pick || !visibleInTree(hit.object)) continue;
    const name =
      hit.object instanceof THREE.InstancedMesh && hit.instanceId !== undefined
        ? `${String(hit.object.userData['levelId'])} bay ${(hit.object.userData['bays'] as number[])[hit.instanceId] ?? ''}`
        : pick.triangleNames && hit.faceIndex !== undefined && hit.faceIndex !== null
          ? (pick.triangleNames[hit.faceIndex] ?? pick.name)
          : pick.name;
    if (!best || pick.rank < best.pick.rank || (pick.rank === best.pick.rank && hit.distance < best.distance)) {
      best = { pick, name, distance: hit.distance };
    }
  }
  return best ? { pick: best.pick, name: best.name } : null;
}

// ---------------------------------------------------------------------------------------------

function named<T extends THREE.Object3D>(o: T, name: string): T {
  o.name = name;
  return o;
}

function visibleInTree(o: THREE.Object3D): boolean {
  for (let x: THREE.Object3D | null = o; x; x = x.parent) if (!x.visible) return false;
  return true;
}

function centroid(ring: ModelRing): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (const p of ring) {
    x += p.x;
    y += p.y;
  }
  const n = Math.max(ring.length, 1);
  return { x: Math.round(x / n), y: Math.round(y / n) };
}

type At = (p: ModelPoint) => THREE.Vector2;

/**
 * The corner nearest grid south-west, a little outside the outline. The default
 * camera looks from the south-east, so this corner is at the left of the picture,
 * clear of the face the reader is looking at.
 */
function southWest(ring: ModelRing, at: At): THREE.Vector2 {
  const points = ring.map(at);
  let best = points[0] ?? new THREE.Vector2();
  for (const p of points) if (p.x + p.y < best.x + best.y) best = p;
  const away = best.clone().sub(centreOf(ring, at)).normalize().multiplyScalar(1.5);
  return best.clone().add(away);
}

function centreOf(ring: ModelRing, at: At): THREE.Vector2 {
  return ring.map(at).reduce((sum, v) => sum.add(v), new THREE.Vector2()).divideScalar(Math.max(ring.length, 1));
}

/** Flat fills for several rings, triangulated, remembering which ring each triangle came from. */
function fill(rings: readonly ModelRing[], at: At, z: number): { geometry: THREE.BufferGeometry; triangleRing: number[] } {
  const positions: number[] = [];
  const triangleRing: number[] = [];
  rings.forEach((ring, r) => {
    const contour = ring.map(at);
    if (contour.length < 3) return;
    for (const triangle of THREE.ShapeUtils.triangulateShape(contour, [])) {
      for (const n of triangle) {
        const p = contour[n]!;
        positions.push(p.x, p.y, z);
      }
      triangleRing.push(r);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return { geometry, triangleRing };
}

function ringLine(ring: ModelRing, at: At, z: number): THREE.BufferGeometry {
  return new THREE.BufferGeometry().setFromPoints(ring.map((p) => {
    const v = at(p);
    return new THREE.Vector3(v.x, v.y, z);
  }));
}

function ringsSegments(rings: readonly ModelRing[], at: At, z: number): THREE.BufferGeometry {
  const positions: number[] = [];
  for (const ring of rings) {
    ring.forEach((p, i) => {
      const a = at(p);
      const b = at(ring[(i + 1) % ring.length]!);
      positions.push(a.x, a.y, z, b.x, b.y, z);
    });
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return g;
}

/** The vertical faces of a ring stood up from z0 to z1. No top, no bottom. */
function walls(ring: ModelRing, at: At, z0: number, z1: number): THREE.BufferGeometry {
  const positions: number[] = [];
  ring.forEach((p, i) => {
    const a = at(p);
    const b = at(ring[(i + 1) % ring.length]!);
    positions.push(a.x, a.y, z0, b.x, b.y, z0, b.x, b.y, z1, a.x, a.y, z0, b.x, b.y, z1, a.x, a.y, z1);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}

/** A prism's wireframe: the ring at both heights and a post at every vertex. */
function prismEdges(ring: ModelRing, at: At, z0: number, z1: number): THREE.BufferGeometry {
  const positions: number[] = [];
  ring.forEach((p, i) => {
    const a = at(p);
    const b = at(ring[(i + 1) % ring.length]!);
    positions.push(a.x, a.y, z0, b.x, b.y, z0, a.x, a.y, z1, b.x, b.y, z1, a.x, a.y, z0, a.x, a.y, z1);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return g;
}

function outwardNormal(ring: ModelRing, a: THREE.Vector2, b: THREE.Vector2, at: At): THREE.Vector2 {
  const d = b.clone().sub(a).normalize();
  let n = new THREE.Vector2(d.y, -d.x);
  // A ring's winding is not promised; test against the centroid instead.
  const c = centreOf(ring, at);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  if (n.dot(c.clone().sub(mid)) > 0) n = n.negate();
  return n;
}

/** A flat arrow across the opening, pointing into the plot. */
function accessArrow(a: THREE.Vector2, b: THREE.Vector2, ring: ModelRing, at: At): THREE.BufferGeometry {
  const width = a.distanceTo(b);
  const along = b.clone().sub(a).normalize();
  const inward = outwardNormal(ring, a, b, at).negate();
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const half = width * 0.18;
  const length = Math.max(width * 0.9, 3);
  const tailStart = mid.clone().addScaledVector(inward, -length * 0.5);
  const neck = mid.clone().addScaledVector(inward, length * 0.15);
  const tip = mid.clone().addScaledVector(inward, length * 0.5);
  const pts = [
    tailStart.clone().addScaledVector(along, -half),
    neck.clone().addScaledVector(along, -half),
    neck.clone().addScaledVector(along, -half * 2.2),
    tip,
    neck.clone().addScaledVector(along, half * 2.2),
    neck.clone().addScaledVector(along, half),
    tailStart.clone().addScaledVector(along, half),
  ];
  const shape = new THREE.Shape(pts);
  return new THREE.ShapeGeometry(shape);
}

/**
 * The sheet's car, stood up: its outline extruded as the body, and the stretch between
 * its rear screen and its windscreen raised as the cabin — which is also what shows,
 * from any angle, which way it faces.
 */
function carShape(): THREE.BufferGeometry {
  const [outline, windscreen, rear] = SYMBOLS.CAR.polylines;
  const body = new THREE.ExtrudeGeometry(
    new THREE.Shape(outline!.points.map(([x, y]) => new THREE.Vector2(x / 1000, y / 1000))),
    { depth: CAR_BODY_M, bevelEnabled: false },
  );
  const front = (windscreen!.points[0]![0]) / 1000;
  const back = (rear!.points[0]![0]) / 1000;
  const halfWidth = Math.abs(rear!.points[0]![1]) / 1000;
  const cabin = new THREE.ExtrudeGeometry(
    new THREE.Shape([
      new THREE.Vector2(back, -halfWidth),
      new THREE.Vector2(front, -halfWidth),
      new THREE.Vector2(front, halfWidth),
      new THREE.Vector2(back, halfWidth),
    ]),
    { depth: CAR_CABIN_M, bevelEnabled: false },
  );
  cabin.translate(0, 0, CAR_BODY_M);
  // Two groups, so the cabin can be inked darker than the body: from above, that is
  // the only thing that says which way a car faces.
  const merged = mergeGeometries([body, cabin], true);
  body.dispose();
  cabin.dispose();
  if (!merged) throw new Error('The car symbol could not be stood up: its body and cabin do not share attributes.');
  return merged;
}
