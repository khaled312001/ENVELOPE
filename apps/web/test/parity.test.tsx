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

const CASES = [
  { name: '80 x 40', ring: RECT_80x40, podiumLevels: undefined },
  { name: '80 x 40, two podium levels', ring: RECT_80x40, podiumLevels: 2 },
  { name: '120 x 80', ring: RECT_120x80, podiumLevels: undefined },
  { name: 'skewed', ring: SKEWED, podiumLevels: undefined },
] as const;

describe.each(CASES)('$name', ({ ring, podiumLevels }) => {
  const out = (): ReturnType<typeof runPipeline> =>
    runPipeline(runInput(ring, podiumLevels === undefined ? {} : { podiumLevels }));

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

  /*
    THE SLAB IS OPEN OVER THE RAMP, as the section draws it. The ground floor was
    filled solid over the ramp from the basement, which hid the one assumed shape
    on the level under a slab that is not there. Measured on the mesh: its
    triangles cover the slab less the ramp, and none of them lies on the ramp.
  */
  it('leaves each slab open where a ramp passes through it, and nowhere else', () => {
    const model = out().building;
    const scene = buildBuildingScene(model, PALETTE);
    const ringArea = (r: readonly { x: number; y: number }[]): number =>
      Math.abs(r.reduce((a, p, i) => { const q = r[(i + 1) % r.length]!; return a + p.x * q.y - q.x * p.y; }, 0)) / 2;
    for (const { level, group } of scene.levels) {
      if (level.placed === false) continue;
      const slab = group.getObjectByName(`${level.id} slab`) as Mesh | undefined;
      expect(slab, level.id).toBeDefined();
      const pos = slab!.geometry.getAttribute('position');
      let area = 0;
      const centroids: { x: number; y: number }[] = [];
      for (let i = 0; i < pos.count; i += 3) {
        const [ax, ay, bx, by, cx, cy] = [pos.getX(i), pos.getY(i), pos.getX(i + 1), pos.getY(i + 1), pos.getX(i + 2), pos.getY(i + 2)];
        area += Math.abs((bx - ax) * (cy - ay) - (cx - ax) * (by - ay)) / 2;
        centroids.push({ x: (ax + bx + cx) / 3, y: (ay + by + cy) / 3 });
      }
      const ramps = model.ramps.filter((r) => r.fromLevelId === level.id || r.toLevelId === level.id);
      // Scene units are metres; the model is millimetres.
      const expected = (ringArea(level.outline) - ramps.reduce((a, r) => a + ringArea(r.outline), 0)) / 1e6;
      expect(area, level.id).toBeCloseTo(expected, 0);
      for (const r of ramps) {
        const xs = r.outline.map((p) => (p.x - scene.originMm.x) / 1000);
        const ys = r.outline.map((p) => (p.y - scene.originMm.y) / 1000);
        const inside = centroids.filter(
          (c) => c.x > Math.min(...xs) + 0.01 && c.x < Math.max(...xs) - 0.01 && c.y > Math.min(...ys) + 0.01 && c.y < Math.max(...ys) - 0.01,
        );
        if (Math.abs(r.outline[0]!.x - r.outline[1]!.x) < 1 || Math.abs(r.outline[0]!.y - r.outline[1]!.y) < 1) {
          // An axis-aligned ramp: its box is the ramp, and no slab triangle sits in it.
          expect(inside, `${level.id} slab over ramp ${r.id}`).toEqual([]);
        }
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

  it('draws the same geometry on screen as on paper, path for path', () => {
    const model = out().building;
    for (const sheet of composeSheets(model, META)) {
      const d = (markup: string): string[] => [...markup.matchAll(/\sd="([^"]*)"/g)].map((m) => m[1]!);
      const react = renderToStaticMarkup(<SheetView sheet={sheet} idPrefix="p" onInspect={() => {}} />);
      expect(d(react), sheet.number).toEqual(d(sheetSvg(sheet, 'p')));
    }
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
