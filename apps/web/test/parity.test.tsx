/**
 * `pnpm parity` — every renderer draws the bays the engine placed, and no others.
 *
 * One building model, four ways out of the product: the sheet on screen (React),
 * the sheet on paper (the SVG the report embeds), the sheet in CAD (a DXF per
 * sheet) and the building in CAD (one DXF, every level at its height). Each is a
 * separate piece of code walking the same display list, and each is a place a bay
 * can be dropped, doubled or drawn on the wrong level while every other output
 * stays right. So for each plot below, each renderer's count is taken from what
 * it actually produced — markup for the first two, a second parser's reading of
 * the file for the others — and held against the engine's own figure.
 *
 * The 3D view is counted too. Its scene is built without a browser
 * (`buildBuildingScene`), so each level's instanced cars are read straight off the
 * objects the viewer would draw — and each car is held to the sheet's car for the
 * same bay: same point, same heading, at the level's own height rather than at 0.
 */

import { runPipeline } from '@envelope/capacity';
import { Decimal } from '@envelope/core';
import { buildingDxf, layerName, sheetDxf } from '@envelope/exports';
import { buildBuildingScene, buildingGlb, carsPerLevel, GLB_NOTICE, type ScenePalette } from '@envelope/massing';
import { initGeometry } from '@envelope/geometry';
import { composeSheets, sheetSvg } from '@envelope/sheets';
import { renderToStaticMarkup } from 'react-dom/server';
import { Box3, Matrix4, type Mesh, Quaternion, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { beforeAll, describe, expect, it } from 'vitest';

import { parseDxf } from '../../../test-support/dxf.js';
import { META, RECT_120x80, RECT_80x40, runInput, SKEWED } from '../../../test-support/pipeline.js';
import { SheetView } from '../src/components/DrawingSet.js';

beforeAll(async () => {
  await initGeometry();
});

/** How many times `attr=` appears — one per drawn car, or per drawn bay. */
const count = (markup: string, attr: string): number => markup.split(` ${attr}="`).length - 1;

/** Any colours: parity is about where things are, not what ink they are in. */
const PALETTE: ScenePalette = {
  derived: '#1f6b45',
  assumed: '#854b00',
  userSet: '#2b5cd9',
  neutral: '#55555f',
  ground: '#eef1f8',
  car: '#9a9ca3',
};


// --- circulation, re-measured on the drawn model ---------------------------
/*
  THE INDEPENDENT RE-CHECK. `packages/capacity/src/circulation.ts` decides which
  bays are reachable and drops the rest; this measures the same property again on
  the model the renderers actually draw, in a different representation and with
  different code. There it is axis-aligned rectangles in level-local metres; here
  it is arbitrary quadrilaterals in plot millimetres, rotated by whatever angle
  the inscribed rectangle sits at. A defect that survives both is not an
  arithmetic slip in one of them.

  And it is entry-free on purpose. Which node a car enters through is the
  engine's judgement; whether the network hangs together at all is a fact about
  the drawing, and it is the fact that failed: three module aisles eleven metres
  apart with nothing joining them, every bay counted.
*/
type XY = { readonly x: number; readonly y: number };

const segments = (ring: readonly XY[]): (readonly [XY, XY])[] =>
  ring.map((p, i) => [p, ring[(i + 1) % ring.length]!] as const);

/**
 * Length of the collinear overlap of two segments, in mm. 0 when they share none.
 *
 * The longer segment is always the reference. Every corner here is a millimetre
 * rounding of a rotated exact point, so a direction taken off a 2.5 m bay edge
 * and extended 49 m down an aisle drifts 3 mm — enough to read two edges of the
 * same line as parallel and apart. Measured the other way round, off the long
 * edge, the same pair is 0.15 mm out.
 */
function sharedRun(a: readonly [XY, XY], b: readonly [XY, XY]): number {
  const la = Math.hypot(a[1].x - a[0].x, a[1].y - a[0].y);
  const lb = Math.hypot(b[1].x - b[0].x, b[1].y - b[0].y);
  const [s, t] = la >= lb ? [a, b] : [b, a];
  const length = Math.max(la, lb);
  if (length === 0) return 0;
  const ux = (s[1].x - s[0].x) / length;
  const uy = (s[1].y - s[0].y) / length;
  // The kernel is on a 1 mm grid, so 2 mm off the line is off the line.
  for (const q of t) {
    if (Math.abs((q.x - s[0].x) * -uy + (q.y - s[0].y) * ux) > 2) return 0;
  }
  const b0 = (t[0].x - s[0].x) * ux + (t[0].y - s[0].y) * uy;
  const b1 = (t[1].x - s[0].x) * ux + (t[1].y - s[0].y) * uy;
  return Math.max(0, Math.min(length, Math.max(b0, b1)) - Math.max(0, Math.min(b0, b1)));
}

/** The widest opening between two outlines, in mm. */
const contactMm = (a: readonly XY[], b: readonly XY[]): number =>
  Math.max(
    0,
    ...segments(a).flatMap((e) => segments(b).map((f) => sharedRun(e, f))),
  );

/** How many connected components the drivable outlines form at this opening. */
function components(nodes: readonly (readonly XY[])[], minOpeningMm: number): number {
  const seen = new Set<number>();
  let found = 0;
  for (let i = 0; i < nodes.length; i += 1) {
    if (seen.has(i)) continue;
    found += 1;
    const queue = [i];
    seen.add(i);
    while (queue.length > 0) {
      const at = queue.pop()!;
      for (let j = 0; j < nodes.length; j += 1) {
        if (!seen.has(j) && contactMm(nodes[at]!, nodes[j]!) >= minOpeningMm) {
          seen.add(j);
          queue.push(j);
        }
      }
    }
  }
  return found;
}

/** A bay is served when one of its short ends lies wholly on a drivable outline. */
function served(bay: readonly XY[], nodes: readonly (readonly XY[])[]): boolean {
  const ends = segments(bay)
    .map((s) => ({ s, length: Math.hypot(s[1].x - s[0].x, s[1].y - s[0].y) }))
    .sort((a, b) => a.length - b.length)
    .slice(0, 2);
  return ends.some(({ s, length }) =>
    nodes.some((n) => segments(n).some((f) => sharedRun(s, f) >= length - 2)),
  );
}

/**
 * 6 m of two-way driveway, less a centimetre of rounding: an opening narrower
 * than that is not a way through. The centimetre is not slack in the rule — it
 * is the difference between an exact 6.000 m opening and the integer
 * millimetres a rotated corner lands on.
 */
const AISLE_MM = 6000 - 10;

/*
  Plot 6468096's schedule: three basements, shops on G (A-104), parking on P1-P5.
  The model once parked G and left P5 empty; every renderer drew that faithfully,
  which is why counting renderers against each other never caught it. The case is
  here so they are also counted on a stack whose parking skips a level.
*/
const A_104 = { basements: 3, groundIsParking: false, podiumAboveGround: 5, podiumParkingLevels: 5 } as const;

/*
  The same schedule where the ramps from the street fit (`street-ramp.ts`): the
  podium on the boundary and an entrance 25 m along boundary 0. On 80 x 40 they
  are refused, so without this case no renderer was ever counted on a B1 and a
  P1 cut by a ramp from the street, nor any bay measured against that ramp.
*/
const STREET_RAMPS = {
  podiumAtBoundaryStatement: {
    statementId: 'STMT-PODIUM-SETBACK-2026-10-16',
    statedBy: 'Eng. Mohamed',
    statedOn: '2026-10-16',
    verbatim: 'ال دور ال ارضي و البوديوم و البدروم بياخدو مساحه الارض كلها مفيش setbacks',
  },
  levelPlan: {
    arrangement: 'WIDTH',
    vehicleAccess: { entry: { edgeSeq: 0, centreOffsetM: new Decimal('25') } },
  },
} as const;

// --- what stands on a bay, measured on the drawing --------------------------
/*
  AREA, NOT TOUCH. A bay and the aisle it opens onto share an edge, and every
  corner here is a millimetre rounding of a rotated point, so two outlines that
  only meet can overlap by a sliver a few millimetres wide along a 5.5 m edge.
  0.1 m² is above any such sliver and far below what was found: the ring's drive
  from the slab edge stood on 13.75 m² of each of two bays and 5.5 m² of a third.
*/
const ON_A_BAY_MM2 = 100_000;

const signedArea = (p: readonly XY[]): number =>
  p.reduce((s, a, i) => {
    const b = p[(i + 1) % p.length]!;
    return s + a.x * b.y - b.x * a.y;
  }, 0) / 2;

/** The area two convex outlines share, mm² — Sutherland–Hodgman, both wound anticlockwise. */
function sharedArea(subject: readonly XY[], clipper: readonly XY[]): number {
  const ccw = (p: readonly XY[]): readonly XY[] => (signedArea(p) < 0 ? [...p].reverse() : p);
  let out: XY[] = [...ccw(subject)];
  const c = ccw(clipper);
  for (let i = 0; i < c.length && out.length > 0; i += 1) {
    const a = c[i]!;
    const b = c[(i + 1) % c.length]!;
    const side = (p: XY): number => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    const input = out;
    out = [];
    for (let k = 0; k < input.length; k += 1) {
      const p = input[k]!;
      const q = input[(k + 1) % input.length]!;
      const sp = side(p);
      const sq = side(q);
      if (sp >= 0) out.push(p);
      if (sp >= 0 !== sq >= 0) {
        const t = sp / (sp - sq);
        out.push({ x: p.x + t * (q.x - p.x), y: p.y + t * (q.y - p.y) });
      }
    }
  }
  return out.length > 2 ? Math.abs(signedArea(out)) : 0;
}

/** The convex hull of what a renderer drew, so a wall drawn as faces still closes into a footprint. */
function hull(points: readonly XY[]): XY[] {
  const p = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;
  const cross = (o: XY, a: XY, b: XY): number => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const half = (pts: readonly XY[]): XY[] => {
    const h: XY[] = [];
    for (const q of pts) {
      while (h.length >= 2 && cross(h[h.length - 2]!, h[h.length - 1]!, q) <= 0) h.pop();
      h.push(q);
    }
    return h.slice(0, -1);
  };
  return [...half(p), ...half([...p].reverse())];
}

// 80 x 40 is laid out as the sloped ring, so the ring's way in is measured here too.
const CASES = [
  { name: '80 x 40', ring: RECT_80x40, podiumLevels: undefined, levelSchedule: undefined },
  { name: '80 x 40, two podium levels', ring: RECT_80x40, podiumLevels: 2, levelSchedule: undefined },
  { name: '120 x 80', ring: RECT_120x80, podiumLevels: undefined, levelSchedule: undefined },
  { name: 'skewed', ring: SKEWED, podiumLevels: undefined, levelSchedule: undefined },
  { name: '80 x 40, ground floor not parking (6468096)', ring: RECT_80x40, podiumLevels: undefined, levelSchedule: A_104 },
  {
    name: '120 x 80, ground floor not parking, ramps from the street placed',
    ring: RECT_120x80,
    podiumLevels: undefined,
    levelSchedule: A_104,
    extra: STREET_RAMPS,
  },
] as const;

describe.each(CASES)('$name', (c) => {
  const { ring, podiumLevels, levelSchedule } = c;
  const extra = 'extra' in c ? c.extra : undefined;
  const out = (): ReturnType<typeof runPipeline> =>
    runPipeline(
      runInput(ring, {
        ...(podiumLevels === undefined ? {} : { podiumLevels }),
        ...(levelSchedule === undefined ? {} : { levelSchedule }),
        ...(extra ?? {}),
      }),
    );

  if (extra) {
    it('places the ramps from the street, so the case measures what it was added for', () => {
      expect(out().building.ramps.filter((r) => r.street).map((r) => r.label.slice(0, 27))).toEqual([
        'RAMP FROM STREET DOWN TO B1',
        'RAMP FROM STREET UP TO P1 1',
      ]);
    });
  }

  it('draws, on every parking level, in every renderer, exactly the bays the engine placed', () => {
    const model = out().building;
    const sheets = composeSheets(model, META);
    const parking = sheets.filter((s) => s.kind === 'PARKING');
    expect(parking.length, 'a parking level with no sheet is a level nobody can check').toBe(
      model.levels.filter((l) => l.parking).length,
    );

    let total = 0;
    for (const sheet of parking) {
      const level = model.levels.find((l) => l.id === sheet.levelId)!;
      const engine = Number(level.parking!.bayCount.value);
      expect(engine).toBeGreaterThan(0);
      total += engine;

      const svg = sheetSvg(sheet);
      const react = renderToStaticMarkup(<SheetView sheet={sheet} idPrefix="p" onInspect={() => {}} />);
      const dxf = parseDxf(sheetDxf(sheet, META));
      const dxfCars = dxf.entities.filter((e) => e.type === 'INSERT' && (e as { name?: string }).name === 'CAR');

      const counts = {
        engine,
        svgCars: count(svg, 'data-car'),
        svgBays: count(svg, 'data-bay'),
        reactCars: count(react, 'data-car'),
        reactBays: count(react, 'data-bay'),
        dxfCars: dxfCars.length,
      };
      expect(counts, `level ${level.id}`).toEqual({
        engine,
        svgCars: engine,
        svgBays: engine,
        reactCars: engine,
        reactBays: engine,
        dxfCars: engine,
      });

      // Numbered 1..n, each once. A count can be right with two bays numbered 7.
      const numbers = [...svg.matchAll(/ data-bay="(\d+)"/g)].map((m) => Number(m[1])).sort((a, b) => a - b);
      expect(numbers).toEqual(Array.from({ length: engine }, (_, i) => i + 1));
    }

    expect(total).toBe(Number(model.drawnBays.value));
    const building = parseDxf(buildingDxf(model, sheets, META));
    const cars = building.entities.filter((e) => e.type === 'INSERT' && (e as { name?: string }).name === 'CAR');
    expect(cars).toHaveLength(total);
    for (const level of model.levels.filter((l) => l.parking)) {
      expect(cars.filter((c) => c.layer === layerName(level.id, 'car'))).toHaveLength(
        Number(level.parking!.bayCount.value),
      );
    }
  });

  it('stands, in the 3D view, one car in every bay, where the sheet draws it and at its level', () => {
    const model = out().building;
    const sheets = composeSheets(model, META);
    const scene = buildBuildingScene(model, PALETTE);
    const cars = carsPerLevel(scene);
    const parkingLevels = model.levels.filter((l) => l.parking);
    expect([...cars.keys()]).toEqual(parkingLevels.map((l) => l.id));

    let total = 0;
    for (const level of parkingLevels) {
      const mesh = cars.get(level.id)!;
      const engine = Number(level.parking!.bayCount.value);
      expect(mesh.count, `level ${level.id}`).toBe(engine);
      total += mesh.count;

      // At the level's own floor, not stacked on the ground.
      const group = scene.levels.find((l) => l.level.id === level.id)!.group;
      expect(group.position.z).toBeCloseTo(level.elevationMm / 1000, 6);

      // Each instance is the sheet's car for the same bay: same point, same heading.
      const sheet = sheets.find((s) => s.levelId === level.id)!;
      const onSheet = new Map(
        sheet.items.filter((i) => i.kind === 'symbol' && i.symbol === 'CAR').map((i) => [i.kind === 'symbol' ? i.bay : -1, i]),
      );
      const bays = mesh.userData['bays'] as number[];
      const m = new Matrix4();
      const p = new Vector3();
      const q = new Quaternion();
      const s = new Vector3();
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, m);
        m.decompose(p, q, s);
        const car = onSheet.get(bays[i]!);
        expect(car, `bay ${bays[i]} on ${level.id} has no car on the sheet`).toBeDefined();
        if (car?.kind !== 'symbol') continue;
        expect(p.x * 1000 + scene.originMm.x).toBeCloseTo(car.at.x, 0);
        expect(p.y * 1000 + scene.originMm.y).toBeCloseTo(car.at.y, 0);
        const heading = (2 * Math.atan2(q.z, q.w) * 180) / Math.PI;
        expect(Math.abs(((heading - car.rotationDeg + 540) % 360) - 180)).toBeLessThan(0.01);
      }
    }
    expect(total).toBe(Number(model.drawnBays.value));
    scene.dispose();
  });

  it("draws solid only the levels the answer places, and the rest as an outline nobody can click", () => {
    const model = out().building;
    const scene = buildBuildingScene(model, PALETTE);
    // 120 x 80 uses every level the ceiling permits, so it has no outline to check;
    // the other three do.
    for (const { level, group } of scene.levels) {
      const meshes: string[] = [];
      let pickable = false;
      group.traverse((o) => {
        if ((o as Mesh).isMesh) meshes.push(o.name);
        if (o.userData['pick']) pickable = true;
      });
      if (level.placed) {
        expect(meshes, level.id).toContain(`${level.id} storey`);
      } else {
        expect({ id: level.id, meshes, pickable }).toEqual({ id: level.id, meshes: [], pickable: false });
      }
    }
    scene.dispose();
  });

  it('writes the same cars into the .glb, as plain meshes with no extension a reader must support', async () => {
    const model = out().building;
    const glb = await buildingGlb(model, META);

    // The container, read by hand: a GLB header, then the JSON chunk.
    const view = new DataView(glb);
    expect(view.getUint32(0, true), 'not a GLB').toBe(0x46546c67);
    const json = JSON.parse(new TextDecoder().decode(new Uint8Array(glb, 20, view.getUint32(12, true)))) as {
      extensionsRequired?: string[];
      scene: number;
      scenes: { extras?: { notice?: string[]; notModelled?: string[] } }[];
    };
    // A required extension is a file most viewers must refuse whole.
    expect(json.extensionsRequired).toBeUndefined();
    const extras = json.scenes[json.scene]!.extras!;
    expect(extras.notice).toEqual([...GLB_NOTICE]);
    expect(extras.notice!.join(' ')).toContain('REGULATORY VALIDITY: NOT ASSESSED');
    expect(extras.notModelled).toEqual([...model.notModelled]);

    // Then read back by three's loader, which shares no code with the writer.
    const gltf = await new GLTFLoader().parseAsync(glb, '');
    gltf.scene.updateMatrixWorld(true);
    const perCar = buildBuildingScene(model, PALETTE);
    const carTriangles = [...carsPerLevel(perCar).values()][0]!.geometry.getAttribute('position').count / 3;
    perCar.dispose();
    for (const level of model.levels.filter((l) => l.parking)) {
      const bays = Number(level.parking!.bayCount.value);
      const cars = gltf.scene.getObjectByName(`${level.id}_cars`) ?? gltf.scene.getObjectByName(`${level.id} cars`);
      expect(cars, `no cars for ${level.id} in the .glb`).toBeDefined();
      // Body and cabin are two materials, so the loader hands back one mesh per
      // primitive under the node — each with its own index into vertices they share.
      // The triangles are counted through the index, or they are counted twice.
      let triangles = 0;
      cars!.traverse((o) => {
        if (!(o as Mesh).isMesh) return;
        const g = (o as Mesh).geometry;
        triangles += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
      });
      expect(triangles, level.id).toBe(bays * carTriangles);
      expect(cars!.userData['carCount']).toBe(bays);
      // Standing on the level's floor — glTF is Y up.
      expect(new Box3().setFromObject(cars!).min.y).toBeCloseTo(level.elevationMm / 1000, 3);
    }
  });


  it('joins every aisle it draws into one network, on every parking level', () => {
    const model = out().building;
    let checked = 0;
    for (const level of model.levels) {
      if (!level.parking) continue;
      const nodes = [
        ...level.parking.aisles.map((a) => a.outline),
        ...(level.parking.rampStrip ? [level.parking.rampStrip] : []),
      ];
      expect(nodes.length, `${level.id} draws bays and no aisle`).toBeGreaterThan(0);
      expect(components(nodes, AISLE_MM), `${level.id} draws ${nodes.length} aisles`).toBe(1);
      checked += 1;
    }
    expect(checked, 'no parking level was measured, so nothing was proved').toBeGreaterThan(0);
  });

  it('draws no bay whose open end is not on an aisle', () => {
    const model = out().building;
    for (const level of model.levels) {
      if (!level.parking) continue;
      const nodes = level.parking.aisles.map((a) => a.outline);
      for (const bay of level.parking.bays) {
        expect(served(bay.outline, nodes), `${level.id} bay ${bay.number}`).toBe(true);
      }
    }
  });

  /*
    A CAR WAS DRAWN UNDER THE DRIVE. The ring's way in crossed the wall run over
    three bays that stayed counted and numbered, on every ring level of the worked
    example and of four real plots, and every count in this file agreed — because
    the engine counted them too. So this measures area on the drawing itself: no
    aisle, drive, ramp or accessible bay's aisle may share any with a bay.
  */
  it('stands no aisle, drive, ramp or access aisle on a bay, on every parking level', () => {
    const model = out().building;
    let measured = 0;
    for (const level of model.levels) {
      if (!level.parking) continue;
      const p = level.parking;
      const solid = [
        ...p.aisles.map((a) => ({ what: 'aisle', ring: a.outline })),
        ...(p.drives ?? []).map((d) => ({ what: d.label, ring: d.outline })),
        ...(p.accessAisles ?? []).map((ring) => ({ what: 'access aisle', ring })),
        ...(p.rampStrip ? [{ what: 'ramp', ring: p.rampStrip }] : []),
        // A ramp from the street stands on the level it reaches, outside the strip.
        ...model.ramps
          .filter((r) => r.street && (r.fromLevelId === level.id || r.toLevelId === level.id))
          .map((r) => ({ what: r.label, ring: r.outline })),
      ];
      for (const bay of p.bays) {
        for (const s of solid) {
          expect(sharedArea(bay.outline, s.ring), `${level.id}: ${s.what} on bay ${bay.number}`).toBeLessThanOrEqual(
            ON_A_BAY_MM2,
          );
        }
        for (const other of p.bays) {
          if (other.number <= bay.number) continue;
          expect(sharedArea(bay.outline, other.outline), `${level.id}: bay ${other.number} on bay ${bay.number}`).toBeLessThanOrEqual(
            ON_A_BAY_MM2,
          );
        }
        measured += 1;
      }
    }
    expect(measured, 'no bay was measured, so nothing was proved').toBeGreaterThan(0);
  });

  /*
    THE CORE AS EACH RENDERER DRAWS IT ON A PARKING LEVEL. The engine keeps bays
    clear of the shafts that pass through a car park, and the sheet draws those
    shafts — but the 3D view traced the whole residential core round every level,
    and the building DXF stood its walls up there, over bays the layout had
    rightly placed: eight a level on Al Mamzar. Each renderer's own geometry is
    read back here, closed into a footprint, and held off every bay.
  */
  it('draws the core on no bay, on every parking level, in the sheet, the 3D view and the DXF', () => {
    const model = out().building;
    const core = model.core;
    expect(core, 'every run has a core').not.toBeNull();
    const sheets = composeSheets(model, META);
    const scene = buildBuildingScene(model, PALETTE);
    const dxf = parseDxf(buildingDxf(model, sheets, META));
    let measured = 0;
    for (const level of model.levels) {
      if (!level.parking || !core!.levelIds.includes(level.id)) continue;
      const drawn: Record<string, XY[]> = { sheet: [], '3d': [], dxf: [] };
      const sheet = sheets.find((s) => s.levelId === level.id)!;
      for (const item of sheet.items) {
        if (item.kind === 'shape' && item.role === 'core' && item.closed) drawn['sheet']!.push(...item.points);
      }
      const group = scene.levels.find((l) => l.level.id === level.id)!.group;
      group.traverse((o) => {
        if (o.name !== `${level.id} core` && o.name !== `${level.id} core outline`) return;
        const pos = (o as Mesh).geometry.getAttribute('position');
        for (let i = 0; i < pos.count; i += 1) {
          drawn['3d']!.push({ x: pos.getX(i) * 1000 + scene.originMm.x, y: pos.getY(i) * 1000 + scene.originMm.y });
        }
      });
      for (const e of dxf.entities) {
        if (e.layer !== layerName(level.id, 'core')) continue;
        // dxf-parser hands a 3DFACE a fifth, empty vertex; a NaN in the hull would make it pass on nothing.
        for (const v of (e as { vertices?: { x?: number; y?: number }[] }).vertices ?? []) {
          if (Number.isFinite(v.x) && Number.isFinite(v.y)) drawn['dxf']!.push({ x: v.x! * 1000, y: v.y! * 1000 });
        }
      }
      for (const [renderer, points] of Object.entries(drawn)) {
        expect(points.length, `${renderer} draws no core on ${level.id}`).toBeGreaterThan(2);
        const footprint = hull(points);
        for (const bay of level.parking.bays) {
          expect(sharedArea(bay.outline, footprint), `${renderer}: the core on bay ${bay.number}, ${level.id}`).toBeLessThanOrEqual(
            ON_A_BAY_MM2,
          );
        }
        measured += 1;
      }
    }
    scene.dispose();
    expect(measured, 'no core was measured on a parking level, so nothing was proved').toBeGreaterThan(0);
  });

  /*
    A CLICK OPENS WHAT WAS CLICKED. On a parking level the 3D view draws the
    shafts and colours them by the shafts' area, and a click on them opened the
    whole core's area under the core's name — a figure for an outline that level
    does not show.
  */
  it("opens the shafts' own value from the shafts, and the core's from the core", () => {
    const model = out().building;
    const core = model.core!;
    const scene = buildBuildingScene(model, PALETTE);
    let parkingSeen = 0;
    for (const level of model.levels) {
      if (!core.levelIds.includes(level.id)) continue;
      const group = scene.levels.find((l) => l.level.id === level.id)!.group;
      const mesh = group.getObjectByName(`${level.id} core`)!;
      const pick = mesh.userData['pick'] as { node: string; name: string };
      if (level.parking !== null && core.shaft !== undefined) {
        parkingSeen += 1;
        expect(pick, level.id).toMatchObject({ node: core.shaft.areaM2.node, name: core.shaft.label });
        expect(pick.node).not.toBe(core.areaM2.node);
      } else {
        expect(pick, level.id).toMatchObject({ node: core.areaM2.node, name: core.label });
      }
    }
    scene.dispose();
    if (core.shaft !== undefined) expect(parkingSeen, 'no parking level carried the shafts').toBeGreaterThan(0);
  });

  it('draws the same geometry on screen as on paper, path for path', () => {
    const model = out().building;
    for (const sheet of composeSheets(model, META)) {
      const d = (markup: string): string[] => [...markup.matchAll(/\sd="([^"]*)"/g)].map((m) => m[1]!);
      const react = renderToStaticMarkup(<SheetView sheet={sheet} idPrefix="p" onInspect={() => {}} />);
      expect(d(react), sheet.number).toEqual(d(sheetSvg(sheet, 'p')));
    }
  });
});

describe('a ground floor the schedule does not give to parking', () => {
  it('has no car on G in the building DXF or the 3D view, and cars on P1 to P5', () => {
    const model = runPipeline(runInput(RECT_80x40, { levelSchedule: A_104 })).building;
    const sheets = composeSheets(model, META);
    expect(sheets.some((s) => s.kind === 'PARKING' && s.levelId === 'G')).toBe(false);
    const cars = parseDxf(buildingDxf(model, sheets, META)).entities.filter(
      (e) => e.type === 'INSERT' && (e as { name?: string }).name === 'CAR',
    );
    expect(cars.filter((c) => c.layer === layerName('G', 'car'))).toHaveLength(0);
    const scene = buildBuildingScene(model, PALETTE);
    const perLevel = carsPerLevel(scene);
    expect(perLevel.has('G')).toBe(false);
    for (const id of ['P1', 'P2', 'P3', 'P4', 'P5']) {
      expect(perLevel.get(id)?.count ?? 0, id).toBeGreaterThan(0);
      expect(cars.filter((c) => c.layer === layerName(id, 'car')).length, id).toBeGreaterThan(0);
    }
    scene.dispose();
  });
});

/*
  The doctored model. `packages/capacity/test/circulation.test.ts` proves the
  engine drops an unreachable bay; this proves the property is visible in the
  model the renderers draw, and that measuring it here can say no. Only the
  120 x 80 fixture stacks more than one module per level, so it is named rather
  than looped over — a skip that read as a pass is the vacuous gate this
  codebase refuses.
*/
describe('the cross aisle, removed', () => {
  it('leaves the level in islands, which is the defect it was added to end', () => {
    const model = runPipeline(runInput(RECT_120x80, {})).building;
    let doctored = 0;
    for (const level of model.levels) {
      if (!level.parking) continue;
      const nodes = level.parking.aisles.map((a) => a.outline);
      expect(nodes.length, `${level.id} stacks one module, so nothing is joined`).toBeGreaterThan(
        1,
      );
      /*
        Every cross aisle goes — there are two where a core cuts the module aisles
        and a second one reaches the bays beyond the cut. Taking only one would
        leave the other joining everything, and prove nothing.
      */
      expect(level.parking.aisles.some((a) => a.crossing), `${level.id} has no cross aisle`).toBe(true);
      const without = level.parking.aisles.filter((a) => !a.crossing).map((a) => a.outline);
      expect(components(without, AISLE_MM), `${level.id} without its cross aisles`).toBe(
        without.length,
      );
      doctored += 1;
    }
    expect(doctored, 'no parking level was doctored, so nothing was proved').toBeGreaterThan(0);
  });
});
