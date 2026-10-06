/**
 * Parking layout.
 *
 * The assertions that matter are the geometric ones. A bay count is easy to
 * produce and impossible to trust; what makes this module worth having is that
 * every bay it reports has a rectangle, the rectangles do not overlap, and none
 * of them falls outside the level. Those three properties are the difference
 * between a layout and an estimate — and they are exactly what a count obtained
 * by dividing area by 37.5 cannot offer.
 */

import { Decimal, ProvenanceGraph, Tracer } from '@envelope/core';
import { describe, expect, it } from 'vitest';

import {
  BAY_STANDARDS,
  DrivewayType,
  layoutParkingLevel,
  ParkingAngle,
  ParkingLayoutError,
  RectKind,
  standardFor,
  type ParkingLayoutResult,
  type PlacedRect,
} from '../src/layout.js';

const d = (v: string | number): Decimal => new Decimal(v);

function run(
  widthM: string,
  depthM: string,
  extra: Partial<Parameters<typeof layoutParkingLevel>[0]> = {},
): ParkingLayoutResult {
  return layoutParkingLevel({
    tracer: new Tracer(new ProvenanceGraph()),
    footprint: { widthM: d(widthM), depthM: d(depthM) },
    deductions: {
      areaM2: d(0),
      source: 'ASSUMED',
      basis: 'test fixture takes no deduction so the packing itself is what is measured',
    },
    ...extra,
  });
}

const overlaps = (a: PlacedRect, b: PlacedRect): boolean =>
  a.x.lt(b.x.plus(b.width)) &&
  b.x.lt(a.x.plus(a.width)) &&
  a.y.lt(b.y.plus(b.height)) &&
  b.y.lt(a.y.plus(a.height));

describe('Table B.11 transcription', () => {
  it('matches the code for 90 degree two-way parking', () => {
    const s = standardFor(ParkingAngle.DEG_90, DrivewayType.TWO_WAY);
    expect(s.bayWidthM).toBe('2.5');
    expect(s.bayLengthM).toBe('5.5');
    // The client's own drawings are labelled "6.00M WIDE 2 WAY DRIVEWAY".
    expect(s.drivewayWidthM).toBe('6');
  });

  it('refuses a combination the code does not give dimensions for', () => {
    expect(() => standardFor(ParkingAngle.PARALLEL, DrivewayType.TWO_WAY)).toThrow(
      ParkingLayoutError,
    );
  });

  it('never states a bay narrower than the code minimum', () => {
    for (const s of BAY_STANDARDS) expect(new Decimal(s.bayWidthM).gte('2.5')).toBe(true);
  });
});

describe('layoutParkingLevel', () => {
  it('builds a 17 m double-loaded module for 90 degree two-way parking', () => {
    // 5.5 bay + 6.0 aisle + 5.5 bay
    expect(run('40', '40').moduleDepthM.value.toString()).toBe('17');
  });

  it('places a rectangle for every bay it counts', () => {
    const r = run('40', '40');
    const bays = r.rects.filter((x) => x.kind === RectKind.BAY);
    expect(bays).toHaveLength(r.bayCount.value);
    expect(r.bayCount.value).toBeGreaterThan(0);
  });

  it('places no two rectangles on top of each other', () => {
    const r = run('60', '52');
    const solid = r.rects.filter((x) => x.kind === RectKind.BAY || x.kind === RectKind.AISLE);
    for (let i = 0; i < solid.length; i += 1) {
      for (let j = i + 1; j < solid.length; j += 1) {
        const a = solid[i]!;
        const b = solid[j]!;
        expect(overlaps(a, b), `${a.kind} row ${a.row} overlaps ${b.kind} row ${b.row}`).toBe(false);
      }
    }
  });

  it('keeps every rectangle inside the level', () => {
    const width = d('60');
    const depth = d('52');
    for (const rect of run('60', '52').rects) {
      expect(rect.x.gte(0)).toBe(true);
      expect(rect.y.gte(0)).toBe(true);
      expect(rect.x.plus(rect.width).lte(width)).toBe(true);
      expect(rect.y.plus(rect.height).lte(depth)).toBe(true);
    }
  });

  it('fits three modules into 51 m of depth and reports nothing left over', () => {
    const r = run('40', '51'); // exactly 3 × 17 m
    // Module rows only: the cross aisle serves every module and carries a row of
    // its own, so counting it here would report four modules in 51 m of depth.
    const rows = new Set(
      r.rects.filter((x) => x.kind === RectKind.AISLE && x.row >= 0).map((x) => x.row),
    );
    expect(rows.size).toBe(3);
    expect(r.notes.join(' ')).not.toMatch(/left unused/);
  });

  it('reports leftover depth rather than quietly filling it', () => {
    const r = run('40', '55'); // 3 modules = 51 m, 4 m spare: too shallow for anything
    expect(r.notes.join(' ')).toMatch(/4\.00 m of depth is left unused/);
  });

  it('takes a single-loaded row when the remainder can hold one', () => {
    const r = run('40', '63'); // 3 modules = 51, remainder 12 m >= 5.5 + 6
    expect(r.notes.join(' ')).toMatch(/single-loaded/);
  });

  it('charges the 300 mm structural clearance when a grid is declared', () => {
    const free = run('40', '34');
    const gridded = run('40', '34', { structuralGridM: d('8') });
    // 40 / 2.5 = 16 bays per run; 40 / 2.8 = 14. Fewer bays, honestly fewer.
    expect(gridded.bayCount.value).toBeLessThan(free.bayCount.value);
    expect(gridded.notes.join(' ')).toMatch(/additional 300 mm/);
  });

  it('reports an area per bay comparable to the developer brief target', () => {
    // Azizi Annexure A asks for basement efficiency of 37.5 m² per car.
    const r = run('60', '51');
    expect(r.areaPerBayM2.value.toNumber()).toBeGreaterThan(20);
    expect(r.areaPerBayM2.value.toNumber()).toBeLessThan(45);
  });

  it('reserves a ramp footprint and refuses to imply its gradient was checked', () => {
    const r = run('40', '51', { includeRamp: true });
    expect(r.rects.some((x) => x.kind === RectKind.RAMP)).toBe(true);
    expect(r.notes.join(' ')).toMatch(/NOT ASSESSED/);
  });

  it('does not park a car underneath the ramp', () => {
    // The ramp used to be placed as a rectangle over the packing area, so it sat
    // on top of bays that were still counted: a drawing showing a ramp across
    // eight cars, and a bay count eight too high.
    const r = run('40', '51', { includeRamp: true });
    const ramp = r.rects.find((x) => x.kind === RectKind.RAMP);
    expect(ramp).toBeDefined();
    for (const bay of r.rects.filter((x) => x.kind !== RectKind.RAMP)) {
      expect(overlaps(bay, ramp!), `${bay.kind} row ${bay.row} sits under the ramp`).toBe(false);
    }
  });

  it('charges the ramp its width in bays rather than getting it free', () => {
    const without = run('40', '51');
    const withRamp = run('40', '51', { includeRamp: true });
    expect(withRamp.bayCount.value).toBeLessThan(without.bayCount.value);
  });

  it('reports the ramp run at a readable precision', () => {
    // Decimal division produces 28 significant digits; a note reading
    // "23.62639921337266470009832842 m" is technically true and unreadable.
    expect(run('40', '51', { includeRamp: true }).notes.join(' ')).not.toMatch(/\d\.\d{6,}/);
  });

  it('refuses an assumed deduction with no basis', () => {
    expect(() =>
      run('40', '51', { deductions: { areaM2: d('200'), source: 'ASSUMED' } }),
    ).toThrow(/requires a basis/);
  });

  it('refuses a level too narrow for a single bay', () => {
    expect(() => run('2', '51')).toThrow(ParkingLayoutError);
  });

  it('refuses deductions that exceed the level', () => {
    expect(() =>
      run('40', '51', {
        deductions: { areaM2: d('99999'), source: 'USER_SET' },
      }),
    ).toThrow(/exceed/);
  });

  it('cites Table B.11 for the bay count', () => {
    expect(run('40', '51').bayCount.provenanceClass).toBe('DERIVED');
  });
});

/**
 * The perimeter arrangement — the one the client's own drawings are laid out in.
 *
 * He sent his podium and his ground floor for a 50.85 × 26.85 m plot on
 * 5 Oct 2026. Both put the bays against the four walls with one drive looping
 * round an island, and the engine packed stacked double-loaded modules, which on
 * a level that shallow fits two aisles and wastes the middle. These assert the
 * third candidate is packed every time, that it wins where it is better, that it
 * loses where it is not, and that it refuses rather than returning a loop no car
 * can complete.
 */
describe('bays to the walls, one ring aisle', () => {
  /** The client's own plot, from `docs/03-analysis/client-drawings-2026-10-05.md`. */
  const CLIENT = ['50.85', '26.85'] as const;

  /** The sweep's own formula, read off the graph the run wrote it to. */
  function sweepOf(
    widthM: string,
    depthM: string,
    extra: Partial<Parameters<typeof layoutParkingLevel>[0]> = {},
  ): { readonly result: ParkingLayoutResult; readonly sweep: string } {
    const graph = new ProvenanceGraph();
    const result = layoutParkingLevel({
      tracer: new Tracer(graph),
      footprint: { widthM: d(widthM), depthM: d(depthM) },
      deductions: { areaM2: d(0), source: 'ASSUMED', basis: 'test fixture' },
      ...extra,
    });
    const sweep = graph.nodes
      .map((n) => n.formula)
      .find((f): f is string => typeof f === 'string' && f.startsWith('max('));
    expect(sweep).toBeDefined();
    return { result, sweep: sweep! };
  }

  it('wins on the client’s own plot, and by more than a rounding', () => {
    const { result: out, sweep } = sweepOf(...CLIENT, { includeRamp: true });
    expect(out.orientation.value).toBe('bays to the walls, one ring aisle');
    const [, ring] = /(\d+) bays to the walls/.exec(sweep) ?? [];
    const [, width] = /(\d+) modules along the width/.exec(sweep) ?? [];
    expect(Number(ring)).toBeGreaterThan(Number(width));
  });

  it('names all three arrangements and what each came to', () => {
    const { sweep } = sweepOf(...CLIENT);
    expect(sweep).toMatch(
      /^max\(\d+ modules along the width, \d+ modules along the depth, \d+ bays to the walls, one ring aisle\)$/,
    );
  });

  it('loses on a plot deep enough for stacked modules, and is still reported', () => {
    const { result: out, sweep } = sweepOf('80', '60');
    expect(out.orientation.value).toMatch(/^modules along the (width|depth)$/);
    expect(sweep).toContain('bays to the walls, one ring aisle');
  });

  /*
    REACHABILITY, ON THE ARRANGEMENT THAT HAS ONE LOOP AND NO SECOND ONE.

    The ring is four bands that overlap at the corners, so it is one network by
    construction — which is exactly the kind of claim that is true until someone
    changes a number. Every bay the result reports must have its open end on it.
  */
  it('places no bay the ring does not reach', () => {
    const out = run(...CLIENT, { includeRamp: true });
    const bays = out.rects.filter((r) => r.kind === RectKind.BAY);
    const drive = out.rects.filter((r) => r.kind === RectKind.AISLE || r.kind === RectKind.RAMP);
    expect(bays.length).toBe(out.bayCount.value);
    for (const bay of bays) {
      const upright = bay.width.lte(bay.height);
      const onAisle = drive.some((a) => {
        const ox = Decimal.min(bay.x.plus(bay.width), a.x.plus(a.width)).minus(Decimal.max(bay.x, a.x));
        const oy = Decimal.min(bay.y.plus(bay.height), a.y.plus(a.height)).minus(Decimal.max(bay.y, a.y));
        return upright ? oy.isZero() && ox.gte(bay.width) : ox.isZero() && oy.gte(bay.height);
      });
      expect(onAisle).toBe(true);
    }
  });

  it('refuses when the core would stand across the ring, and the modules still answer', () => {
    const tracer = new Tracer(new ProvenanceGraph());
    const out = layoutParkingLevel({
      tracer,
      footprint: { widthM: d(CLIENT[0]), depthM: d(CLIENT[1]) },
      deductions: { areaM2: d(0), source: 'ASSUMED', basis: 'test fixture' },
      core: {
        // Centred on the level, so it straddles the band the ring runs in.
        rect: { x: d('18'), y: d('10.5'), width: d('16'), height: d('5') },
        areaM2: tracer.assumed('core', d('80'), { basis: 'test fixture', unit: 'm²' }),
      },
    });
    expect(out.orientation.value).toMatch(/^modules along the (width|depth)$/);
    expect(out.notes.join(' ')).toContain('stands across the ring aisle');
    expect(out.bayCount.value).toBeGreaterThan(0);
  });
});
