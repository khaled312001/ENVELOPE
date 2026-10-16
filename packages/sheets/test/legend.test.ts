/**
 * The key — §4.9 item 8 — and the level datum — item 7, as far as it is honest.
 *
 * The claim worth testing is not that the legend has rows. It is that **the key
 * covers the drawing**: a symbol drawn and not keyed is a symbol a reader has to
 * guess at, and the car in the key is the car in the bay because both come from
 * `SYMBOLS` rather than from a second hand-drawn outline.
 *
 * Item 7 is half refused, and the refusal is tested too. The engine places no
 * column; a grid bubble is read as a column line by everyone who opens a
 * drawing. So the sheet says in words that there is no structural grid and what
 * to use instead, rather than bubbling the drive aisles and letting a reader
 * conclude the scheme has been gridded.
 */

import { runPipeline } from '@envelope/capacity';
import { initGeometry } from '@envelope/geometry';
import { beforeAll, describe, expect, it } from 'vitest';

import { META, RECT_120x80, RECT_80x40, runInput } from '../../../test-support/pipeline.js';
import { composeSheets } from '../src/compose.js';
import { paperFurniture } from '../src/strip.js';
import { SYMBOLS } from '../src/symbols.js';
import {
  Role,
  SymbolName,
  type PaperPoly,
  type PaperText,
  type ShapeItem,
  type SymbolItem,
} from '../src/types.js';

beforeAll(async () => {
  await initGeometry();
});

const sheets = (ring: typeof RECT_80x40) =>
  composeSheets(runPipeline(runInput(ring, {})).building, META);

const strip = (items: readonly { kind: string }[]): PaperText[] =>
  items.filter((i): i is PaperText => i.kind === 'text');

describe('the symbol key', () => {
  it('keys every symbol the sheet actually draws', () => {
    for (const ring of [RECT_80x40, RECT_120x80]) {
      for (const sheet of sheets(ring)) {
        const drawn = new Set(
          sheet.items.filter((i): i is SymbolItem => i.kind === 'symbol').map((i) => i.symbol),
        );
        const keyed = new Set(sheet.legend.map((e) => e.symbol).filter(Boolean));
        for (const symbol of drawn) {
          expect([...keyed], `${sheet.number} draws ${symbol} and must key it`).toContain(symbol);
        }
      }
    }
  });

  /*
    16 Oct 2026: an entry and an exit of 3 m each. Each opening is drawn, each
    carries one head pointing the way its cars go, and the one-way head is keyed
    on every sheet that draws it.
  */
  it('draws an entry and an exit as two openings, one head in and one out, and keys the head', () => {
    const set = composeSheets(
      runPipeline(
        runInput(RECT_80x40, {
          levelPlan: {
            vehicleAccess: {
              arrangement: 'ONE_WAY_SEPARATE',
              entry: { edgeSeq: 0 },
              exit: { edgeSeq: 2 },
            },
          },
        }),
      ).building,
      META,
    );
    const site = set.find((s) => s.kind === 'SITE')!;
    const openings = site.items.filter((i): i is ShapeItem => i.kind === 'shape' && i.role === Role.ACCESS);
    expect(openings.map((o) => o.name)).toEqual([
      'VEHICLE ENTRY - ONE WAY - 3.00M',
      'VEHICLE EXIT - ONE WAY - 3.00M',
    ]);
    const heads = site.items.filter((i): i is SymbolItem => i.kind === 'symbol' && i.role === Role.ACCESS_ARROW);
    expect(heads.map((h) => h.symbol)).toEqual([SymbolName.ARROW, SymbolName.ARROW]);
    // Edge 0 runs along y = 0 with the plot to the north, edge 2 along y = 40 with
    // it to the south. In at the entry: north, 90°. Out at the exit: north again.
    expect(heads.map((h) => Math.round(h.rotationDeg))).toEqual([90, 90]);
    for (const sheet of set) {
      if (sheet.items.some((i) => i.kind === 'symbol' && i.role === Role.ACCESS_ARROW && i.symbol === SymbolName.ARROW)) {
        expect(sheet.legend.some((e) => e.symbol === SymbolName.ARROW), sheet.number).toBe(true);
      }
    }
  });

  it('draws a parking sheet a car, and therefore keys one', () => {
    // Guards the test above from passing vacuously on a set that draws no symbol.
    const parking = sheets(RECT_120x80).find((s) => s.kind === 'PARKING')!;
    expect(
      parking.items.some((i) => i.kind === 'symbol' && i.symbol === SymbolName.CAR),
    ).toBe(true);
    expect(parking.legend.some((e) => e.symbol === SymbolName.CAR)).toBe(true);
  });

  it('fits the key from the SYMBOL, not from a second outline drawn by hand', () => {
    const items = paperFurniture({
      title: 'Parking level B1',
      number: 'A-101',
      scale: 200,
      meta: META,
      facts: [],
      legend: [{ role: Role.CAR, symbol: SymbolName.CAR, label: 'Car' }],
      north: true,
    });
    const polys = items.filter((i): i is PaperPoly => i.kind === 'poly' && i.role === 'swatch');
    expect(polys).toHaveLength(SYMBOLS.CAR.polylines.length);

    // Fitted from the symbol's own extent, so the key keeps the car's proportions
    // rather than the swatch box's. Redraw the car and this moves with it.
    const xs = polys.flatMap((p) => p.points.map((q) => q.x));
    const ys = polys.flatMap((p) => p.points.map((q) => q.y));
    const aspect = (Math.max(...xs) - Math.min(...xs)) / (Math.max(...ys) - Math.min(...ys));
    const car = SYMBOLS.CAR.polylines.flatMap((l) => l.points);
    const cx = car.map(([x]) => x);
    const cy = car.map(([, y]) => y);
    const own = (Math.max(...cx) - Math.min(...cx)) / (Math.max(...cy) - Math.min(...cy));
    expect(aspect).toBeCloseTo(own, 3);
  });
});

describe('the scheme, printed under the key', () => {
  const printed = (kind: string): string =>
    strip(sheets(RECT_120x80).find((s) => s.kind === kind)!.paperItems)
      .map((t) => t.value)
      .join(' ');

  it('says how a bay number is arrived at, and what it is not', () => {
    const words = printed('PARKING');
    expect(words).toContain('row by row');
    expect(words).toContain('not an allocation');
  });

  it('says there is no structural grid, and what to use instead', () => {
    const words = printed('PARKING');
    expect(words).toContain('No structural grid');
    expect(words).toContain('bay number');
  });

  it('names the CAD layer convention on every sheet of the set', () => {
    for (const sheet of sheets(RECT_120x80)) {
      const words = strip(sheet.paperItems)
        .map((t) => t.value)
        .join(' ');
      expect(words, sheet.number).toContain('ENV-<level>-<element>');
    }
  });
});

describe('the level datum', () => {
  it('gives every level on a section a datum, not a bare tick', () => {
    const model = runPipeline(runInput(RECT_80x40, {})).building;
    const section = composeSheets(model, META).find((s) => s.kind === 'SECTION')!;
    const marks = section.items.filter(
      (i): i is ShapeItem => i.kind === 'shape' && i.role === Role.LEVEL_MARK,
    );
    // One open line and one closed triangle per level.
    const triangles = marks.filter((m) => m.closed && m.points.length === 3);
    expect(triangles).toHaveLength(model.levels.length);
    expect(marks.filter((m) => !m.closed)).toHaveLength(model.levels.length);
  });

  it('says in the key what the datum measures from', () => {
    const section = sheets(RECT_80x40).find((s) => s.kind === 'SECTION')!;
    const row = section.legend.find((e) => e.role === Role.LEVEL_MARK);
    expect(row?.label).toMatch(/ground datum/);
  });
});
