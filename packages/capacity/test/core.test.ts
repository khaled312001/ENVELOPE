/**
 * The core — Eng. Mohamed, 2026-09-28, the one thing he called *"الاهم"*.
 *
 * Most of this file is about the thing the core does **not** do. Adding a core
 * to an engine invites exactly one wrong move — subtract it from the floor area
 * — and that move is wrong twice over: a core is inside GFA, so deducting it
 * reports a GFA the plot does not have, and it is outside saleable area, which
 * is precisely what the saleable efficiency already carries. So the tests that
 * matter most here assert that the capacity figures do not move.
 *
 * What is left is arithmetic and refusal: the share, the containment, and the
 * two sentences that compare the core against the inputs already accounting for
 * it.
 */

import { Decimal, type Mm } from '@envelope/core';
import { area, containsPoint, initGeometry } from '@envelope/geometry';
import { beforeAll, describe, expect, it } from 'vitest';

import { reconcileCore } from '../src/core.js';
import { buildAssumptionRegister, CORE_STRANDS, runPipeline, RunBlockedError, type RunInput } from '../src/index.js';
import { pt, RECT_80x40, runInput } from '../../../test-support/pipeline.js';

const input = (overrides: Partial<RunInput> = {}): RunInput => runInput(RECT_80x40, overrides);

beforeAll(async () => {
  await initGeometry();
});

describe('the core is sized, and said to be', () => {
  it('is assumed at 18% of the tower plate when nobody has entered one', () => {
    const out = runPipeline(input());
    expect(out.core.areaM2.provenanceClass).toBe('ASSUMED');
    const expected = out.envelope.towerPlateCap.value.times('0.18');
    expect(out.core.areaM2.value.minus(expected).abs().toNumber()).toBeLessThan(0.01);
    expect(out.core.plateShare.value.toNumber()).toBeCloseTo(0.18, 4);
  });

  it('is USER_SET when a person enters one, and the share follows it', () => {
    const out = runPipeline(input({ coreAreaM2: new Decimal('150') }));
    expect(out.core.areaM2.provenanceClass).toBe('USER_SET');
    expect(out.core.areaM2.value.toString()).toBe('150');
    const share = new Decimal('150').div(out.envelope.towerPlateCap.value);
    expect(out.core.plateShare.value.minus(share).abs().toNumber()).toBeLessThan(0.0001);
  });

  it('carries the assumption into the register with a measured sensitivity, not an unmeasured one', () => {
    const run = input();
    const entry = buildAssumptionRegister(run, runPipeline(run)).find(
      (a) => a.parameterId === 'building.core_area_m2',
    );
    expect(entry).toBeDefined();
    expect(entry!.basis).toContain('18%');
    // Measured, and measured at zero: the register says "we moved it and the
    // answer did not change", which is an answer. `null` would not be.
    expect(entry!.sensitivity).not.toBeNull();
    expect(new Decimal(entry!.sensitivity!.relativeEffect).toNumber()).toBe(0);
  });
});

/*
  THE POINT OF THE WHOLE FILE.

  A core is inside GFA and inside the saleable efficiency. An engine that
  subtracted it would report a GFA the plot does not have and charge the reader
  twice for one wall — and the failure would look like a fix.
*/
describe('the core subtracts from nothing', () => {
  it('moves no capacity figure, however large it is', () => {
    const base = runPipeline(input());
    const big = runPipeline(input({ coreAreaM2: base.envelope.towerPlateCap.value.times('0.4') }));
    expect(big.capacity.governingGfa.value.toString()).toBe(
      base.capacity.governingGfa.value.toString(),
    );
    expect(big.governingUnitCount.value).toBe(base.governingUnitCount.value);
    expect(big.capacity.levels.value).toBe(base.capacity.levels.value);
  });

});

/*
  WHERE IT DOES SUBTRACT: FROM THE PARKING LEVEL IT STANDS ON.

  The core subtracts from no capacity figure, but it is a shaft through every
  parking level, and a bay inside it is not a bay. It used to be drawn over bays
  that stayed in the count — the deduction reserved a strip at the far edge "for
  cores", and the core itself stood at the centre. Now the layout places no bay
  where the core stands and cuts any aisle across it; its area comes off the
  strip instead, so it is not deducted twice.
*/
describe('the core on the parking level', () => {
  it('is avoided by default, and only a run that switches it off packs over the shafts', () => {
    const avoided = runPipeline(input());
    expect(avoided.building.core!.shaft).toBeDefined();
    expect(avoided.levelPlan!.layout.baysUnderCore).toBeGreaterThan(0);
    const old = runPipeline(input({ levelPlan: { avoidCore: false } }));
    expect(old.building.core!.shaft).toBeUndefined();
    expect(old.levelPlan!.layout.baysUnderCore).toBe(0);
  });

  const overlaps = (
    a: readonly { x: number; y: number }[],
    b: readonly { x: number; y: number }[],
  ): boolean => {
    const box = (r: readonly { x: number; y: number }[]) => ({
      x0: Math.min(...r.map((p) => p.x)),
      x1: Math.max(...r.map((p) => p.x)),
      y0: Math.min(...r.map((p) => p.y)),
      y1: Math.max(...r.map((p) => p.y)),
    });
    const p = box(a);
    const q = box(b);
    // A millimetre of tolerance: the two are rounded to the grid separately.
    return p.x0 < q.x1 - 1 && q.x0 < p.x1 - 1 && p.y0 < q.y1 - 1 && q.y0 < p.y1 - 1;
  };

  it('has no bay inside the shafts it carries through the car park', () => {
    const out = runPipeline(input());
    const core = out.building.core!.shaft!.outline;
    const bays = out.levelPlan!.rects.filter((r) => r.kind === 'BAY' || r.kind === 'ACCESSIBLE_BAY');
    expect(bays.length).toBeGreaterThan(0);
    for (const bay of bays) expect(overlaps(bay.world, core)).toBe(false);
  });

  it('says how many bays the shafts took, and takes their area off the reserved strip', () => {
    const out = runPipeline(input());
    const shaft = out.building.core!.shaft!;
    expect(out.levelPlan!.layout.baysUnderCore).toBeGreaterThan(0);
    expect(
      out.levelPlan!.reservedAreaM2.value.eq(
        Decimal.max(0, out.levelPlan!.deductionsM2.value.minus(shaft.areaM2.value)),
      ),
    ).toBe(true);
  });

  it('carries only the shafts through the car park, not the whole residential core', () => {
    const out = runPipeline(input());
    const shaft = out.building.core!.shaft!;
    expect(Number(shaft.areaM2.value)).toBeLessThan(out.core.areaM2.value.toNumber());
  });

  it('keeps every bay out of the shafts of a core of any size', () => {
    const base = runPipeline(input());
    for (const share of ['0.1', '0.25', '0.4']) {
      const out = runPipeline(
        input({ coreAreaM2: base.envelope.towerPlateCap.value.times(share) }),
      );
      const core = (out.building.core!.shaft ?? out.building.core!).outline;
      for (const r of out.levelPlan!.rects) {
        if (r.kind === 'BAY' || r.kind === 'ACCESSIBLE_BAY') expect(overlaps(r.world, core)).toBe(false);
      }
    }
  });
});

describe('where the core stands', () => {
  it('is inside the tower plate, with every vertex contained', () => {
    const out = runPipeline(input({ coreAreaM2: new Decimal('120') }));
    const ring = out.building!.core!.outline;
    for (const p of ring) {
      expect(containsPoint(out.envelope.plateRing, { x: p.x as Mm, y: p.y as Mm })).toBe(true);
    }
  });

  it('is the area it says it is, on the millimetre grid', () => {
    const out = runPipeline(input({ coreAreaM2: new Decimal('120') }));
    const drawn = area(out.building!.core!.outline.map((p) => ({ x: p.x as Mm, y: p.y as Mm })));
    // mm² to m², and the grid rounds the vertices.
    expect(drawn / 1_000_000).toBeCloseTo(120, 1);
  });

  it('is a placement and not a design, and the graph says which', () => {
    const out = runPipeline(input());
    expect(out.core.placement.provenanceClass).toBe('ASSUMED');
    const node = out.graph.nodes.find((n) => n.id === out.core.placement.node)!;
    expect(node.parameterId).toBe('building.core_placement');
  });

  it('passes through every placed level and no permitted one', () => {
    const out = runPipeline(input());
    const core = out.building!.core!;
    const placed = out.building!.levels.filter((l) => l.placed).map((l) => l.id);
    expect(core.levelIds).toEqual(placed);
    expect(out.building!.levels.some((l) => !l.placed)).toBe(true);
    for (const l of out.building!.levels.filter((x) => !x.placed)) {
      expect(core.levelIds).not.toContain(l.id);
    }
  });
});

/*
  WHERE THE CORE STANDS, STATED. Centred is the assumption; a boundary is a
  person's statement, and the only way the core moves. What is at risk: a core
  that slides out of the plate, changes size on the way, moves without a name on
  it — or moves at all when nobody asked.
*/
describe('a core set against a boundary', () => {
  const NARROW = [pt(0, 0), pt(60, 0), pt(60, 30), pt(0, 30)];
  const box = (ring: readonly { x: number; y: number }[]) => ({
    x0: Math.min(...ring.map((p) => p.x)),
    x1: Math.max(...ring.map((p) => p.x)),
    y0: Math.min(...ring.map((p) => p.y)),
    y1: Math.max(...ring.map((p) => p.y)),
  });

  it('slides to the plate edge facing that boundary, the same size, and is the person’s', () => {
    const centred = runPipeline(input());
    const placed = runPipeline(input({ corePosition: { edgeSeq: 0 } }));
    const ring = placed.building.core!.outline;
    for (const p of ring) {
      expect(containsPoint(placed.envelope.plateRing, { x: p.x as Mm, y: p.y as Mm })).toBe(true);
    }
    const a = (r: readonly { x: number; y: number }[]) =>
      area(r.map((p) => ({ x: p.x as Mm, y: p.y as Mm })));
    expect(Math.abs(a(ring) - a(centred.building.core!.outline))).toBeLessThan(10_000);
    // Edge 0 runs along y = 0: the core meets the plate's own lowest line.
    const plate = box(placed.envelope.plateRing);
    expect(Math.abs(box(ring).y0 - plate.y0)).toBeLessThanOrEqual(2);
    expect(box(ring).x0).toBe(box(centred.building.core!.outline).x0);
    expect(placed.core.placement.provenanceClass).toBe('USER_SET');
    expect(placed.core.placement.value).toContain('against boundary 1');
  });

  it('does not move when no boundary is named', () => {
    const a = runPipeline(input());
    const b = runPipeline(input());
    expect(a.building.core!.outline).toEqual(b.building.core!.outline);
    expect(a.core.placement.provenanceClass).toBe('ASSUMED');
  });

  it('is refused against a boundary the plot does not have, in a sentence', () => {
    expect(() => runPipeline(input({ corePosition: { edgeSeq: 9 } }))).toThrow(RunBlockedError);
    expect(() => runPipeline(input({ corePosition: { edgeSeq: 9 } }))).toThrow(/this plot has 4 boundaries/);
  });

  /*
    THE NARROW PLOT, which is why the input exists. Centred, the shafts stand
    across the level's main aisle and the bays beyond them have no way in — and
    the run says so and names the input. Against a long side, the level keeps
    nearly every bay the old packing drew, with none of them inside a shaft.
  */
  it('wins back the bays a centred core strands on a narrow plot, and the centred run says why', () => {
    const centred = runPipeline(runInput(NARROW));
    const placed = runPipeline(runInput(NARROW, { corePosition: { edgeSeq: 0 } }));
    expect(centred.levelPlan!.losses.circulation.strandedBays).toBeGreaterThan(0);
    expect(centred.levelPlan!.notAssessed.join(' ')).toContain(CORE_STRANDS);
    expect(placed.levelPlan!.bayCount.value).toBeGreaterThan(centred.levelPlan!.bayCount.value * 2);
    expect(placed.levelPlan!.losses.circulation.strandedBays).toBe(0);
  });
});

describe('a core this plate cannot hold', () => {
  it('is refused, not shrunk, when it is the whole floor', () => {
    const plate = runPipeline(input()).envelope.towerPlateCap.value;
    expect(() => runPipeline(input({ coreAreaM2: plate }))).toThrow(RunBlockedError);
    expect(() => runPipeline(input({ coreAreaM2: plate }))).toThrow(/cannot be the whole floor/);
  });

  it('names the usual cause, because square feet read as square metres is how it happens', () => {
    const plate = runPipeline(input()).envelope.towerPlateCap.value;
    try {
      runPipeline(input({ coreAreaM2: plate.times(2) }));
      throw new Error('expected a refusal');
    } catch (error) {
      expect((error as Error).message).toContain('square feet');
      expect((error as Error).message).toContain(plate.toFixed(2));
    }
  });

  it('is refused at zero', () => {
    expect(() => runPipeline(input({ coreAreaM2: new Decimal('0') }))).toThrow(
      /greater than zero/,
    );
  });
});

describe('the reconciliation', () => {
  const base = {
    coreAreaM2: new Decimal('180'),
    parkingUsableFraction: new Decimal('0.85'),
    parkingLevelAreaM2: new Decimal('1900'),
  };

  it('says the arithmetic holds when the core fits inside what the efficiency leaves', () => {
    const [saleable] = reconcileCore({
      ...base,
      plateShare: new Decimal('0.18'),
      saleableEfficiency: new Decimal('0.75'),
    });
    expect(saleable).toContain('18.0% of the tower plate');
    expect(saleable).toContain('25.0%');
    expect(saleable).toContain('the arithmetic holding');
  });

  it('says the two figures cannot both be right when the core alone exceeds it', () => {
    const [saleable] = reconcileCore({
      ...base,
      plateShare: new Decimal('0.18'),
      saleableEfficiency: new Decimal('0.95'),
    });
    expect(saleable).toContain('cannot both be right');
    // And it changes neither of them, which is the discipline this engine keeps.
    expect(saleable).toContain('changed neither');
  });

  it('says when the core is drawn over bays the layout placed', () => {
    const [, parking] = reconcileCore({
      ...base,
      coreAreaM2: new Decimal('400'),
      plateShare: new Decimal('0.18'),
      saleableEfficiency: new Decimal('0.75'),
    });
    // 15% of 1,900 m² is 285 m², and a 400 m² core exceeds it.
    expect(parking).toContain('285 m²');
    expect(parking).toContain('exceeds the deduction');
  });

  it('reaches the model, so a drawing carries it', () => {
    const out = runPipeline(input());
    expect(out.building!.core!.reconciliation).toEqual(out.core.reconciliation);
    expect(out.core.reconciliation).toHaveLength(2);
  });
});
