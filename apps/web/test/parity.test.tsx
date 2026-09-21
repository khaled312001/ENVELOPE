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
 * NOT YET COUNTED: the 3D viewer. It still draws from the massing wire rather
 * than from the building model, and parity with it is Phase 4's to assert.
 */

import { runPipeline } from '@envelope/capacity';
import { buildingDxf, layerName, sheetDxf } from '@envelope/exports';
import { initGeometry } from '@envelope/geometry';
import { composeSheets, sheetSvg } from '@envelope/sheets';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';

import { parseDxf } from '../../../test-support/dxf.js';
import { META, RECT_120x80, RECT_80x40, runInput, SKEWED } from '../../../test-support/pipeline.js';
import { SheetView } from '../src/components/DrawingSet.js';

beforeAll(async () => {
  await initGeometry();
});

/** How many times `attr=` appears — one per drawn car, or per drawn bay. */
const count = (markup: string, attr: string): number => markup.split(` ${attr}="`).length - 1;

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

  it('draws the same geometry on screen as on paper, path for path', () => {
    const model = out().building;
    for (const sheet of composeSheets(model, META)) {
      const d = (markup: string): string[] => [...markup.matchAll(/\sd="([^"]*)"/g)].map((m) => m[1]!);
      const react = renderToStaticMarkup(<SheetView sheet={sheet} idPrefix="p" onInspect={() => {}} />);
      expect(d(react), sheet.number).toEqual(d(sheetSvg(sheet, 'p')));
    }
  });
});
