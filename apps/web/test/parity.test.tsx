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

  it('draws the same geometry on screen as on paper, path for path', () => {
    const model = out().building;
    for (const sheet of composeSheets(model, META)) {
      const d = (markup: string): string[] => [...markup.matchAll(/\sd="([^"]*)"/g)].map((m) => m[1]!);
      const react = renderToStaticMarkup(<SheetView sheet={sheet} idPrefix="p" onInspect={() => {}} />);
      expect(d(react), sheet.number).toEqual(d(sheetSvg(sheet, 'p')));
    }
  });
});
