/**
 * Dimension strings.
 *
 * Two kinds of assertion. The first is drafting: a chain is witness lines,
 * terminators, one line and a figure per segment, at the offsets the conventions
 * state — measurable, and wrong in a way a reader would notice on paper.
 *
 * The second is the one that matters. **A dimension prints the engine's figure
 * and never measures the drawing.** The two agree on a correct model, which is
 * exactly why the disagreement would never be seen: the drawing would win,
 * silently, in a file an architect x-refs into a submission set. So the model is
 * doctored — an edge whose stated length is not the length of the line drawn for
 * it — and the sheet must print what the engine said.
 */

import { runPipeline } from '@envelope/capacity';
import type { BuildingModel, Mm, ModelPoint } from '@envelope/core';
import { initGeometry } from '@envelope/geometry';
import { beforeAll, describe, expect, it } from 'vitest';

import { META, RECT_120x80, RECT_80x40, runInput } from '../../../test-support/pipeline.js';
import { composeSheets } from '../src/compose.js';
import { DIM, dimensionChain, metres } from '../src/dimensions.js';
import { Role, type ModelItem, type ShapeItem, type TextItem } from '../src/types.js';

beforeAll(async () => {
  await initGeometry();
});

const p = (x: number, y: number): ModelPoint => ({ x: x as Mm, y: y as Mm });
const UP = { x: 0, y: 1 };

const shapes = (items: readonly ModelItem[]): ShapeItem[] =>
  items.filter((i): i is ShapeItem => i.kind === 'shape');
const texts = (items: readonly ModelItem[]): TextItem[] =>
  items.filter((i): i is TextItem => i.kind === 'text');

describe('one dimension', () => {
  const chain = dimensionChain([p(0, 0), p(10_000, 0)], ['10.00 M'], {
    scale: 500,
    out: UP,
    offsetMm: 6,
  });

  it('draws two witness lines, the line itself, two terminators and one figure', () => {
    expect(shapes(chain)).toHaveLength(5);
    expect(texts(chain)).toHaveLength(1);
  });

  it('starts its witness lines clear of the feature and runs them past the line', () => {
    const witness = shapes(chain)[0]!;
    expect(witness.points[0]!.y).toBe(DIM.gapMm * 500);
    expect(witness.points[1]!.y).toBe((6 + DIM.overMm) * 500);
  });

  it('puts the dimension line where it was asked for and nowhere else', () => {
    const line = shapes(chain)[2]!;
    expect(line.points[0]).toEqual(p(0, 6 * 500));
    expect(line.points[1]).toEqual(p(10_000, 6 * 500));
  });

  it('prints the figure it was handed, above the line and reading left to right', () => {
    const figure = texts(chain)[0]!;
    expect(figure.value).toBe('10.00 M');
    expect(figure.at.x).toBe(5000);
    expect(figure.at.y).toBeGreaterThan(6 * 500);
    expect(figure.rotationDeg).toBe(0);
    expect(figure.role).toBe(Role.DIMENSION);
  });
});

describe('a chain of several', () => {
  it('carries one figure per segment and one terminator per stop', () => {
    const chain = dimensionChain(
      [p(0, 0), p(5500, 0), p(11_500, 0), p(17_000, 0)],
      ['5.50 M', '6.00 M', '5.50 M'],
      { scale: 200, out: UP, offsetMm: 6 },
    );
    expect(texts(chain)).toHaveLength(3);
    // 4 witness + 1 line + 4 terminators.
    expect(shapes(chain)).toHaveLength(9);
  });

  it('refuses a chain whose figures do not match its stops', () => {
    expect(() =>
      dimensionChain([p(0, 0), p(1000, 0), p(2000, 0)], ['1.00 M'], {
        scale: 200,
        out: UP,
        offsetMm: 6,
      }),
    ).toThrow(/needs 2 figures/);
  });

  it('draws nothing at all from a single stop', () => {
    expect(dimensionChain([p(0, 0)], [], { scale: 200, out: UP, offsetMm: 6 })).toEqual([]);
  });

  it('turns a figure that would read upside down', () => {
    const chain = dimensionChain([p(10_000, 0), p(0, 0)], ['10.00 M'], {
      scale: 500,
      out: { x: 0, y: -1 },
      offsetMm: 6,
    });
    expect(texts(chain)[0]!.rotationDeg).toBe(0);
  });
});

describe('metres', () => {
  it('writes two decimals, the way a drawing does', () => {
    expect(metres(80_000)).toBe('80.00 M');
    expect(metres(2500)).toBe('2.50 M');
  });
});

describe('the site plan', () => {
  const site = (model: BuildingModel) => composeSheets(model, META).find((s) => s.kind === 'SITE')!;

  it('dimensions every boundary it draws', () => {
    const model = runPipeline(runInput(RECT_80x40, {})).building;
    const figures = texts(site(model).items)
      .filter((t) => t.role === Role.DIMENSION)
      .map((t) => t.value);
    // One per edge, plus the setbacks applied to them.
    for (const edge of model.plot.edges) expect(figures).toContain(metres(edge.lengthMm));
  });

  it('prints the length the ENGINE holds, not the one the drawing happens to have', () => {
    /*
      THE DOCTORED MODEL. The edge is drawn 80 m long and stated to be 61.50 m.
      Nothing in the product should ever produce that, which is the point: if the
      sheet printed 80.00 M here it would be measuring its own drawing, and on a
      real plot — where the two agree — nobody would ever find out.
    */
    const real = runPipeline(runInput(RECT_80x40, {})).building;
    const doctored: BuildingModel = {
      ...real,
      plot: {
        ...real.plot,
        edges: real.plot.edges.map((e, i) =>
          i === 0 ? { ...e, lengthMm: 61_500 as Mm } : e,
        ),
      },
    };
    const figures = texts(site(doctored).items)
      .filter((t) => t.role === Role.DIMENSION)
      .map((t) => t.value);
    expect(figures).toContain('61.50 M');
  });

  it('draws its dimensions over everything they cross', () => {
    // A section line drawn on top of the figure measuring the edge it crosses is
    // a figure nobody can read. The halo only masks ink laid down before it.
    const items = site(runPipeline(runInput(RECT_80x40, {})).building).items;
    const last = items.map((i) => i.role === Role.DIMENSION);
    expect(last.lastIndexOf(false)).toBeLessThan(last.indexOf(true));
  });
});

describe('a parking level sheet', () => {
  it('dimensions one module across — bay, aisle, bay — from Table B.11', () => {
    const model = runPipeline(runInput(RECT_120x80, {})).building;
    const level = model.levels.find((l) => l.parking)!;
    const sheet = composeSheets(model, META).find((s) => s.levelId === level.id)!;
    const figures = texts(sheet.items)
      .filter((t) => t.role === Role.DIMENSION)
      .map((t) => t.value);
    const m = level.parking!.module;
    const bay = `${Number(m.bayLengthM).toFixed(2)} M`;
    const aisle = `${Number(m.aisleWidthM).toFixed(2)} M`;
    expect(figures).toEqual([bay, aisle, bay]);
  });

  it('measures a module aisle and never the cross aisle', () => {
    /*
      The cross aisle has no bay run on either side, so a module measured across
      it is a module nobody laid out. It also sorts FIRST on a level, because it
      starts at the packing rectangle's origin — which is how the first version
      of this came to measure it.
    */
    const model = runPipeline(runInput(RECT_120x80, {})).building;
    const level = model.levels.find((l) => l.parking)!;
    const aisles = level.parking!.aisles;
    expect(aisles.some((a) => a.crossing), 'the fixture has no cross aisle to confuse').toBe(true);
    expect(aisles[0]!.crossing, 'the cross aisle no longer sorts first').toBe(true);

    const sheet = composeSheets(model, META).find((s) => s.levelId === level.id)!;
    const chain = shapes(sheet.items).filter((s) => s.role === Role.DIMENSION);
    const module = aisles.find((a) => !a.crossing)!;
    // The chain runs across a module aisle: its terminators span that aisle's
    // width plus a bay at each end, so it is longer than the aisle alone.
    const span = Math.max(
      ...chain.flatMap((a) =>
        chain.map((b) =>
          Math.hypot(a.points[0]!.x - b.points[0]!.x, a.points[0]!.y - b.points[0]!.y),
        ),
      ),
    );
    const aisleWidth = Number(level.parking!.module.aisleWidthM) * 1000;
    const bay = Number(level.parking!.module.bayLengthM) * 1000;
    expect(span).toBeGreaterThan(aisleWidth);
    expect(span).toBeLessThan(aisleWidth + 2 * bay + 10_000);
    expect(module.crossing).toBe(false);
  });
});
