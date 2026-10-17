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

import { Decimal, ProvenanceGraph, Tracer, type TracedDecimal } from '@envelope/core';
import { describe, expect, it } from 'vitest';

import {
  BAY_STANDARDS,
  DrivewayType,
  ENTRY_DRIVE_ROW,
  layoutParkingLevel,
  ParkingAngle,
  ParkingLayoutError,
  RectKind,
  standardFor,
  type ParkingArrangement,
  type ParkingLayoutResult,
  type PlacedRect,
  type Rect,
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
    // Pinned: what is measured is the module packer, which since the dead-end
    // rule (B.7.2.3.3 ¶8) is not this level's default.
    const r = run('40', '51', { arrangement: { id: 'WIDTH' } }); // exactly 3 × 17 m
    // Module rows only: the cross aisle serves every module and carries a row of
    // its own, so counting it here would report four modules in 51 m of depth.
    const rows = new Set(
      r.rects.filter((x) => x.kind === RectKind.AISLE && x.row >= 0).map((x) => x.row),
    );
    expect(rows.size).toBe(3);
    expect(r.notes.join(' ')).not.toMatch(/left unused/);
  });

  /*
    80 m wide, so stacked modules win: at 40 m the ring of bays with bays on its
    island now places more, and the module packer's leftover is never reported.
  */
  it('reports leftover depth rather than quietly filling it', () => {
    const r = run('80', '55', { arrangement: { id: 'WIDTH' } }); // 3 modules = 51 m, 4 m spare: too shallow for anything
    expect(r.notes.join(' ')).toMatch(/4\.00 m of depth is left unused/);
  });

  it('takes a single-loaded row when the remainder can hold one', () => {
    const r = run('80', '63', { arrangement: { id: 'WIDTH' } }); // 3 modules = 51, remainder 12 m >= 5.5 + 6
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

  /*
    32 × 40 m: a ring that small would climb a storey at 4.21%, over the 4% of
    B.7.2.3.1, so the ramp is a strip. At 40 × 51 the ring itself is the ramp.
  */
  it('reserves a ramp footprint sized to the code, and says what it did not check', () => {
    const r = run('32', '40', { includeRamp: true });
    expect(r.rects.some((x) => x.kind === RectKind.RAMP)).toBe(true);
    expect(r.notes.join(' ')).toMatch(/Tables B\.9 and B\.10/);
    expect(r.notes.join(' ')).toMatch(/headroom \(2\.4 m\) is NOT ASSESSED|not established/i);
  });

  it('does not park a car underneath the ramp', () => {
    // The ramp used to be placed as a rectangle over the packing area, so it sat
    // on top of bays that were still counted: a drawing showing a ramp across
    // eight cars, and a bay count eight too high.
    const r = run('32', '40', { includeRamp: true });
    const ramp = r.rects.find((x) => x.kind === RectKind.RAMP);
    expect(ramp).toBeDefined();
    for (const bay of r.rects.filter((x) => x.kind !== RectKind.RAMP)) {
      expect(overlaps(bay, ramp!), `${bay.kind} row ${bay.row} sits under the ramp`).toBe(false);
    }
  });

  it('charges the ramp its width in bays rather than getting it free', () => {
    const without = run('40', '51', { arrangement: { id: 'WIDTH' } });
    const withRamp = run('40', '51', { includeRamp: true, arrangement: { id: 'WIDTH' } });
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
      .find((f): f is string => typeof f === 'string' && f.includes('modules along the width') && f.includes('one ring aisle'));
    expect(sweep).toBeDefined();
    return { result, sweep: sweep! };
  }

  it('wins on the client’s own plot, and by more than a rounding', () => {
    // With a ramp to place, the ring wins sloped — his own podium, the floor the ramp.
    const { result: out, sweep } = sweepOf(...CLIENT, { includeRamp: true });
    expect(out.orientation.value).toBe('bays to the walls, the ring aisle sloped as the ramp');
    const [, ring] = /(\d+) bays to the walls, the ring aisle sloped/.exec(sweep) ?? [];
    const [, width] = /(\d+) modules along the width/.exec(sweep) ?? [];
    expect(Number(ring)).toBeGreaterThan(Number(width));
  });

  it('names every arrangement and what each came to', () => {
    const { sweep } = sweepOf(...CLIENT);
    // Ranked by the dead-end clause first (B.7.2.3.3 ¶8), so a candidate with a
    // dead end over eight bays says so beside its count.
    expect(sweep).toMatch(
      /\d+ modules along the width( \(a dead end serving \d+ bays\))?, \d+ modules along the depth( \(a dead end serving \d+ bays\))?, \d+ bays to the walls, one ring aisle, \d+ bays to the walls and on islands, one-way aisles round them$/,
    );
  });

  it('loses on a plot deep enough for more, and is still reported', () => {
    const { result: out, sweep } = sweepOf('80', '60');
    expect(out.orientation.value).not.toBe('bays to the walls, one ring aisle');
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

  /*
    THE DRIVE FROM THE SLAB EDGE, AND THE BAYS IT CROSSES.

    The ring does not touch the slab edge — the wall runs do — so where nothing
    else brings a car onto the level, a 6 m drive crosses the wall run to reach
    the ring. It used to be drawn over three bays that stayed in the count, on
    every ring level: two wholly under it and one half under it. On a level a
    ramp or a sloped ring already reaches, the drive led into the wall and was
    drawn anyway.
  */
  it('counts no bay the drive from the slab edge crosses, and publishes what it cost', () => {
    const out = run(...CLIENT, { arrangement: { id: 'PERIMETER' } });
    expect(out.arrangement).toBe('PERIMETER');
    const drive = out.rects.find((r) => r.row === ENTRY_DRIVE_ROW);
    expect(drive, 'a ring with no ramp is reached by a drive from the slab edge').toBeDefined();
    const bays = out.rects.filter((r) => r.kind === RectKind.BAY);
    for (const bay of bays) expect(overlaps(bay, drive!), `bay at ${bay.x}, ${bay.y}`).toBe(false);
    expect(bays).toHaveLength(out.bayCount.value);
    // 2.5 m bays from the corner under a 6 m drive: the first three.
    expect(out.losses.circulation.entryDriveBays).toBe(3);
    expect(out.losses.circulation.bays).toBeGreaterThanOrEqual(3);
    // Verbatim: apps/web-next/test/engine-notes-entry.test.ts holds the same sentence to its Arabic.
    expect(out.notes).toContain(
      '3 bay(s) stand where the drive from the slab edge crosses the wall run to reach the ring ' +
        '(6 × 5.5 m), and are not placed: a car drives through them. They are counted as a ' +
        'circulation loss, not as bays.',
    );
  });

  it('draws no drive from the slab edge on a ring a ramp or the sloped ring reaches', () => {
    const seen = new Set<string>();
    for (const [w, dp] of [CLIENT, ['48.64', '48.64'], ['60', '52']] as const) {
      const offered = run(w, dp, { includeRamp: true }).arrangements;
      for (const id of ['PERIMETER', 'SLOPED'] as const) {
        if (!offered.some((a) => a.id === id && a.bayCount > 0)) continue;
        const out = run(w, dp, { includeRamp: true, arrangement: { id } });
        expect(out.arrangement).toBe(id);
        expect(out.rects.some((r) => r.row === ENTRY_DRIVE_ROW), `${id} on ${w} × ${dp}`).toBe(false);
        expect(out.losses.circulation.entryDriveBays).toBe(0);
        seen.add(id);
      }
    }
    // Both kinds of way on were measured, or nothing was proved about either.
    expect([...seen].sort()).toEqual(['PERIMETER', 'SLOPED']);
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

/*
  NOTHING STANDS ON A BAY, IN ANY ARRANGEMENT A READER CAN PICK.

  The no-overlap test above ran on one 60 × 52 level, which picks modules — so
  the ring's drive from the slab edge stood on three counted bays on every ring
  level for as long as the ring existed, and nothing looked. A reader may pick
  any arrangement the level offers (16 Oct 2026), so every one is laid out here,
  on footprints where each of them wins somewhere, with and without a ramp, with
  a core, a column gap and a field. A bay may not share area with another bay, an
  aisle, a drive, a ramp, the core or the reserved area drawn on the level.
*/
describe('no arrangement stands anything on a bay', () => {
  const MAMZAR_FIELD: readonly { x: number; y: number }[] = [
    [27.09, 64.49],
    [25.12, 64.3],
    [-27.97, -0.68],
    [106.29, -0.68],
  ].map(([x, y]) => ({ x: x! * 1000, y: y! * 1000 }));

  interface Case {
    readonly name: string;
    readonly extra: (tracer: Tracer) => Partial<Parameters<typeof layoutParkingLevel>[0]>;
    readonly width: string;
    readonly depth: string;
  }
  const gap = (tracer: Tracer): { everyBays: number; gapM: TracedDecimal } => ({
    everyBays: 3,
    gapM: tracer.assumed('gap', d('0.5'), { basis: 'test fixture', unit: 'm' }),
  });
  const CASES: readonly Case[] = [
    { name: 'the client’s plot', width: '50.85', depth: '26.85', extra: () => ({}) },
    { name: 'the client’s plot, ramp', width: '50.85', depth: '26.85', extra: () => ({ includeRamp: true }) },
    {
      name: 'the client’s plot, ramp strip only',
      width: '50.85',
      depth: '26.85',
      extra: () => ({ includeRamp: true, slopedRing: false }),
    },
    { name: '46.08 × 37.77, ramp', width: '46.08', depth: '37.773', extra: () => ({ includeRamp: true }) },
    { name: '48.64 square, ramp', width: '48.64', depth: '48.64', extra: () => ({ includeRamp: true }) },
    { name: '40 × 40', width: '40', depth: '40', extra: () => ({}) },
    { name: '60 × 52', width: '60', depth: '52', extra: () => ({}) },
    { name: '80 × 60, ramp', width: '80', depth: '60', extra: () => ({ includeRamp: true }) },
    {
      name: 'the client’s plot, column gap',
      width: '50.85',
      depth: '26.85',
      extra: (tracer) => ({ columnGap: gap(tracer) }),
    },
    {
      name: '48.64 square, core on the island',
      width: '48.64',
      depth: '48.64',
      extra: (tracer) => ({
        includeRamp: true,
        core: {
          rect: { x: d('20'), y: d('20'), width: d('8'), height: d('6') },
          areaM2: tracer.assumed('core', d('48'), { basis: 'test fixture', unit: 'm²' }),
        },
      }),
    },
    {
      name: 'Al Mamzar field, ramp',
      width: '65.732',
      depth: '32.582',
      extra: (tracer) => ({
        includeRamp: true,
        field: {
          polygonMm: MAMZAR_FIELD,
          grossAreaM2: d('4433'),
          deductionsTraced: tracer.assumed('field', d('665'), { basis: 'test fixture', unit: 'm²' }),
        },
      }),
    },
  ];

  const layOut = (c: Case, arrangement?: ParkingArrangement): ParkingLayoutResult => {
    const tracer = new Tracer(new ProvenanceGraph());
    return layoutParkingLevel({
      tracer,
      footprint: { widthM: d(c.width), depthM: d(c.depth) },
      deductions: { areaM2: d('120'), source: 'ASSUMED', basis: 'test fixture' },
      ...c.extra(tracer),
      ...(arrangement ? { arrangement: { id: arrangement } } : {}),
    });
  };

  it.each(CASES)('$name', (c) => {
    const offered = layOut(c).arrangements.filter((a) => a.bayCount > 0);
    expect(offered.length).toBeGreaterThan(0);
    for (const { id } of offered) {
      const out = layOut(c, id);
      const isBay = (r: PlacedRect): boolean => r.kind === RectKind.BAY || r.kind === RectKind.ACCESSIBLE_BAY;
      const bays = out.rects.filter(isBay);
      expect(bays, id).toHaveLength(out.bayCount.value);
      const core = c.extra(new Tracer(new ProvenanceGraph())).core?.rect;
      const solid: readonly { what: string; r: Rect }[] = [
        ...out.rects.filter((r) => !isBay(r)).map((r) => ({ what: `${r.kind} row ${r.row}`, r })),
        ...out.reservedPieces.map((r) => ({ what: 'reserved', r })),
        ...(core ? [{ what: 'core', r: core }] : []),
      ];
      for (let i = 0; i < bays.length; i += 1) {
        const a = bays[i]!;
        for (let j = i + 1; j < bays.length; j += 1) {
          expect(overlaps(a, bays[j]!), `${id}: bay at ${a.x}, ${a.y} on another`).toBe(false);
        }
        for (const s of solid) {
          expect(overlaps(a, s.r as PlacedRect), `${id}: ${s.what} on the bay at ${a.x}, ${a.y}`).toBe(false);
        }
      }
    }
  });
});
