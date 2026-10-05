/**
 * The parking level, on a real plot.
 *
 * `layout.test.ts` proves the packing is sound inside a rectangle. What this
 * file proves is the join: that the rectangle is one the plot actually contains,
 * that the drawing coordinates land back on the plot rather than beside it, and
 * that the deduction the packer applies is the same fraction the level count
 * used. Every one of those is a place where a correct layout and a correct
 * capacity figure can still disagree with each other, which is the failure a
 * client notices and an engineer does not.
 */

import {
  asMm,
  Decimal,
  ProvenanceGraph,
  Tracer,
  type Plot,
  type PlotEdge,
} from '@envelope/core';
import { containsPoint, type Ring } from '@envelope/geometry';
import { describe, expect, it } from 'vitest';

import { RectKind } from '../src/layout.js';
import { planParkingLevel, type LevelPlan } from '../src/level-plan.js';

const mm = (m: number): number => Math.round(m * 1000);
const ring = (pts: readonly (readonly [number, number])[]): Ring =>
  pts.map(([x, y]) => ({ x: asMm(mm(x)), y: asMm(mm(y)) }));

const RECT_60x40 = ring([
  [0, 0],
  [60, 0],
  [60, 40],
  [0, 40],
]);

function edges(classes: readonly string[]): readonly PlotEdge[] {
  const pts = [
    [0, 0],
    [60, 0],
    [60, 40],
    [0, 40],
  ] as const;
  return classes.map((c, i) => {
    const a = pts[i]!;
    const b = pts[(i + 1) % 4]!;
    return {
      seq: i,
      start: { x: mm(a[0]), y: mm(a[1]) },
      end: { x: mm(b[0]), y: mm(b[1]) },
      classification: c,
      ...(c === 'ROAD' ? { roadHierarchy: 'LOCAL' } : {}),
      lengthMm: mm(Math.hypot(b[0] - a[0], b[1] - a[1])),
      bearingDeg: new Decimal(0),
    } as unknown as PlotEdge;
  });
}

const PLOT = {
  plotId: 'p-test',
  plotNumber: '345-1234',
  community: 'TEST',
} as unknown as Plot;

function planWithGraph(
  podium: Ring = RECT_60x40,
  classes: readonly string[] = ['ROAD', 'ADJACENT_PLOT', 'ADJACENT_PLOT', 'ADJACENT_PLOT'],
  usable = '0.85',
): { readonly plan: LevelPlan; readonly graph: ProvenanceGraph } {
  const graph = new ProvenanceGraph();
  const tracer = new Tracer(graph);
  return {
    graph,
    plan: planParkingLevel({
      tracer,
      plot: PLOT,
      edges: edges(classes),
      podiumRing: podium,
      includeRamp: true,
      usableFraction: tracer.assumed('parking.usable_fraction', new Decimal(usable), {
        basis: 'test fixture; the fraction of a level left after cores, ramps and plant',
        unit: 'ratio',
      }),
    }),
  };
}

function plan(
  podium: Ring = RECT_60x40,
  classes: readonly string[] = ['ROAD', 'ADJACENT_PLOT', 'ADJACENT_PLOT', 'ADJACENT_PLOT'],
  usable = '0.85',
): LevelPlan {
  return planWithGraph(podium, classes, usable).plan;
}

describe('planParkingLevel on a rectangular podium', () => {
  const p = plan();

  it('packs the podium itself, not a rectangle around it', () => {
    expect(p.packingRect.exact).toBe(true);
    expect(p.packingRect.widthM.toFixed(0)).toBe('60');
    expect(p.packingRect.depthM.toFixed(0)).toBe('40');
    expect(p.packingRect.coverage.toFixed(3)).toBe('1.000');
  });

  it('places every bay inside the podium ring', () => {
    // The whole reason the inscribed rectangle exists. A bay outside the ring
    // is a bay inside the setback, and the drawing would look right.
    for (const r of p.rects) {
      for (const pt of r.world) expect(containsPoint(RECT_60x40, pt)).toBe(true);
    }
  });

  it('reports more than one bay, with a ramp reserved', () => {
    expect(p.bayCount.value).toBeGreaterThan(20);
    expect(p.rects.some((r) => r.kind === RectKind.RAMP)).toBe(true);
    expect(p.rects.some((r) => r.kind === RectKind.AISLE)).toBe(true);
  });
});

describe('the deduction', () => {
  it('is the run own usable fraction, not a second declaration', () => {
    // 60 x 40 = 2400 m²; 15% unusable is 360 m². If this number ever stops
    // agreeing with the fraction, the drawing and the level count are deducting
    // different things and nothing else in the system would notice.
    expect(plan().deductionsM2.value.toFixed(2)).toBe('360.00');
    expect(plan(RECT_60x40, undefined, '0.7').deductionsM2.value.toFixed(2)).toBe('720.00');
  });

  it('inherits the fraction provenance class rather than minting its own', () => {
    expect(plan().deductionsM2.provenanceClass).toBe('ASSUMED');
  });

  it('costs bays when it grows', () => {
    expect(plan(RECT_60x40, undefined, '0.7').bayCount.value).toBeLessThan(
      plan(RECT_60x40, undefined, '0.95').bayCount.value,
    );
  });
});

/*
  THE FLOOR AREA ON A PARKING LEVEL THAT IS NOT PARKING.

  The operand the GFA statement needs in order to say anything at all about what
  a parking ground floor contributes — the client's own worked scheme counts
  118.00 m² of residential floor area on a 1,355 m² parking ground floor, and
  this engine counts none. Emitted here, with a derivation, rather than
  reassembled by whoever prints it: "nothing in the composition root computes a
  number a user will see."

  Two properties, and the second one is the one that matters: the figure is ONE
  number with the deduction, and it is an UPPER BOUND rather than a GFA figure.
*/
describe('the floor area that is not parking', () => {
  it('is the deduction, derived from it so the two cannot drift apart', () => {
    const { plan: p, graph } = planWithGraph();
    expect(p.nonParkingFloorAreaM2.value.toString()).toBe(p.deductionsM2.value.toString());
    // Not a second declaration of the same quantity: value → computation → the
    // deduction itself, by name.
    const json = graph.toJSON();
    const computation = json.edges.find((e) => e.from === p.nonParkingFloorAreaM2.node)?.to;
    const operands = json.edges.filter((e) => e.from === computation).map((e) => e.to);
    expect(operands).toContain(p.deductionsM2.node);
    expect(p.nonParkingFloorAreaM2.provenanceClass).toBe('ASSUMED');
  });

  it('moves with the fraction, because it is the same number', () => {
    expect(plan(RECT_60x40, undefined, '0.7').nonParkingFloorAreaM2.value.toFixed(2)).toBe(
      '720.00',
    );
  });

  it('says it is an upper bound and that the GFA share is NOT ASSESSED', () => {
    /*
      ASSERTED BY NAME, because the whole value of this node is the claim on it.
      The deduction also covers the ramp landing, which the same annex calls
      parking circulation — so anything that printed this as the level's GFA
      would be overstating it, and the node has to say so where a reader lands.
    */
    const { plan: p, graph } = planWithGraph();
    const json = graph.toJSON();
    const computation = json.edges.find((e) => e.from === p.nonParkingFloorAreaM2.node)?.to;
    const note = String(json.nodes.find((n) => n.id === computation)?.detail?.['note'] ?? '');
    expect(note).toContain('UPPER BOUND');
    expect(note).toContain('NOT ASSESSED');
    expect(note).toContain('PARKING_AREA');
    expect(note).toContain('GFA');
  });
});

describe('a podium that is not a rectangle', () => {
  // An L: 60 x 40 with a 30 x 20 bite out of a corner.
  const L = ring([
    [0, 0],
    [60, 0],
    [60, 20],
    [30, 20],
    [30, 40],
    [0, 40],
  ]);
  const p = plan(L);

  it('still keeps every bay inside the podium', () => {
    for (const r of p.rects) {
      for (const pt of r.world) expect(containsPoint(L, pt)).toBe(true);
    }
  });

  it('says what it gave up, in square metres and not only as a ratio', () => {
    const note = p.notAssessed.find((n) => n.includes('not a rectangle'));
    expect(note).toBeDefined();
    expect(note).toMatch(/m² was left unpacked/);
    expect(note).toMatch(/floor/);
  });

  it('does not describe the packing rectangle as the plot', () => {
    expect(p.packingRect.exact).toBe(false);
    expect(p.packingRect.coverage.lt(1)).toBe(true);
  });
});

describe('the entrance, held together with the layout', () => {
  it('recommends the road frontage and rejects the neighbours by name', () => {
    const p = plan();
    expect(p.access.recommended?.value.edgeSeq).toBe(0);
    expect(p.access.rejected).toHaveLength(3);
    for (const r of p.access.rejected) expect(r.reason.length).toBeGreaterThan(20);
  });

  it('opens 6 m, because 3 m in and 3 m out', () => {
    // The client stated this rule himself at 29:18. If it ever changes, it
    // should change because the code changed, not because a default drifted.
    expect(plan().access.recommended?.value.widthM.toFixed(0)).toBe('6');
  });

  it('carries the T-junction residue as NOT ASSESSED rather than silence', () => {
    const p = plan();
    expect(p.notAssessed.join(' ')).toMatch(/junction/i);
  });

  it('recommends nothing when the plot has no road frontage, and says why', () => {
    const p = plan(RECT_60x40, [
      'ADJACENT_PLOT',
      'ADJACENT_PLOT',
      'ADJACENT_PLOT',
      'ADJACENT_PLOT',
    ]);
    expect(p.access.recommended).toBeUndefined();
    expect(p.access.rejected).toHaveLength(4);
  });
});
