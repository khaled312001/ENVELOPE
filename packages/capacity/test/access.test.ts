/**
 * Vehicle access placement.
 *
 * The rules under test are the client's own, stated in the 30 Aug 2026 meeting
 * and independently written in B.7.2.1: access comes off a road, never off a
 * shared boundary; it is 6 m wide because it is 3 m in and 3 m out; it keeps
 * 15 m clear of the plot corners; and where a plot faces two roads it takes the
 * more secondary one.
 *
 * The most important test here is the last group — that the things this cannot
 * establish come back said rather than omitted. A placement that quietly implied
 * RTA had agreed to it would be worse than no placement.
 */

import {
  asMm,
  Decimal,
  EdgeClassification,
  LandUse,
  ProvenanceGraph,
  RoadHierarchy,
  ShapeClass,
  Tracer,
  type Mm,
  type Plot,
  type PlotEdge,
} from '@envelope/core';
import { describe, expect, it } from 'vitest';

import {
  AccessChoiceRefusedError,
  AccessPlacementError,
  JUNCTION_CLEARANCE_M,
  placeVehicleAccess,
  TWO_WAY_ACCESS_WIDTH_M,
  type AccessResult,
} from '../src/access.js';

const m = (v: number): Mm => asMm(Math.round(v * 1000));

/** One edge of a rectangle, laid out so `seq` 0 is the south side. */
function edge(
  seq: number,
  from: [number, number],
  to: [number, number],
  classification: EdgeClassification,
  roadHierarchy?: RoadHierarchy,
): PlotEdge {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  return {
    seq,
    start: { x: m(from[0]), y: m(from[1]) },
    end: { x: m(to[0]), y: m(to[1]) },
    classification,
    ...(roadHierarchy === undefined ? {} : { roadHierarchy }),
    lengthMm: m(Math.hypot(dx, dy)),
    bearingDeg: new Decimal(0),
  };
}

const plot: Plot = {
  plotId: 'P-TEST',
  tenantId: 'T',
  plotNumber: '621-1383',
  community: 'WARSAN 1',
  landUse: LandUse.RESIDENTIAL_MULTI,
  shapeClass: ShapeClass.RECTILINEAR,
} as unknown as Plot;

function place(edges: readonly PlotEdge[], extra = {}): AccessResult {
  return placeVehicleAccess({
    tracer: new Tracer(new ProvenanceGraph()),
    plot,
    edges,
    ...extra,
  });
}

/** 50 × 30 m plot: south and north are roads, east and west are neighbours. */
// Annotated, not inferred: a defaulted parameter takes the *literal* type of
// its default, so `southHierarchy = RoadHierarchy.ARTERIAL` silently made every
// other hierarchy a type error at the call site.
const twoRoads = (
  southHierarchy: RoadHierarchy = RoadHierarchy.ARTERIAL,
  northHierarchy: RoadHierarchy = RoadHierarchy.LOCAL,
): readonly PlotEdge[] => [
  edge(0, [0, 0], [50, 0], EdgeClassification.ROAD, southHierarchy),
  edge(1, [50, 0], [50, 30], EdgeClassification.ADJACENT_PLOT),
  edge(2, [50, 30], [0, 30], EdgeClassification.ROAD, northHierarchy),
  edge(3, [0, 30], [0, 0], EdgeClassification.ADJACENT_PLOT),
];

/** 50 × 30 m corner plot: south and east are roads meeting at P1; north and west are neighbours. */
const corner = (): readonly PlotEdge[] => [
  edge(0, [0, 0], [50, 0], EdgeClassification.ROAD, RoadHierarchy.LOCAL),
  edge(1, [50, 0], [50, 30], EdgeClassification.ROAD, RoadHierarchy.COLLECTOR),
  edge(2, [50, 30], [0, 30], EdgeClassification.ADJACENT_PLOT),
  edge(3, [0, 30], [0, 0], EdgeClassification.ADJACENT_PLOT),
];

describe('rule constants', () => {
  it('is 6 m wide — 3 m in and 3 m out', () => {
    expect(TWO_WAY_ACCESS_WIDTH_M).toBe('6');
  });

  it('keeps 15 m clear of the plot corner', () => {
    expect(JUNCTION_CLEARANCE_M).toBe('15');
  });
});

describe('placeVehicleAccess', () => {
  it('never takes access through a boundary shared with a neighbour', () => {
    const r = place(twoRoads());
    for (const c of r.candidates) expect([0, 2]).toContain(c.edgeSeq);
    const neighbours = r.rejected.filter(
      (x) => x.classification === EdgeClassification.ADJACENT_PLOT,
    );
    expect(neighbours).toHaveLength(2);
    expect(neighbours[0]?.reason).toMatch(/neighbouring plot/);
  });

  it('prefers the secondary road when the plot faces two', () => {
    // B.7.2.1: "the vehicle access point should be from the secondary road".
    const r = place(twoRoads(RoadHierarchy.ARTERIAL, RoadHierarchy.LOCAL));
    expect(r.recommended?.value.edgeSeq).toBe(2);
    expect(r.recommended?.value.hierarchy).toBe(RoadHierarchy.LOCAL);
    expect(r.recommended?.value.rationale).toMatch(/secondary/);
  });

  it('still prefers the more secondary road when the order is reversed', () => {
    const r = place(twoRoads(RoadHierarchy.ACCESS, RoadHierarchy.COLLECTOR));
    expect(r.recommended?.value.edgeSeq).toBe(0);
  });

  it('defers to the access side stated on the affection plan', () => {
    // The arterial would never win on hierarchy; the sheet outranks it.
    const r = place(twoRoads(RoadHierarchy.ARTERIAL, RoadHierarchy.LOCAL), {
      affectionPlanAccessEdgeSeq: 0,
    });
    expect(r.recommended?.value.edgeSeq).toBe(0);
    expect(r.recommended?.value.rationale).toMatch(/affection plan/);
  });

  /*
    16 Oct 2026. B.7.2.1 ¶4 measures the 15 m from a road junction — "local road
    intersection or minor T junctions" — and a corner where the frontage meets a
    neighbour is neither: the road runs on past the neighbour's plot. This test
    used to assert the opposite, and refused a frontage the code allows.
  */
  it('takes an entrance off a 32 m frontage that meets a neighbour at both ends', () => {
    const between = [
      edge(0, [0, 0], [32, 0], EdgeClassification.ROAD, RoadHierarchy.LOCAL),
      edge(1, [32, 0], [32, 20], EdgeClassification.ADJACENT_PLOT),
      edge(2, [32, 20], [0, 20], EdgeClassification.ADJACENT_PLOT),
      edge(3, [0, 20], [0, 0], EdgeClassification.ADJACENT_PLOT),
    ];
    const c = place(between).recommended!.value;
    expect(c.junctionAt).toEqual({ start: false, end: false });
    expect(c.window.fromM.toString()).toBe('0');
    expect(c.window.toM.toString()).toBe('32');
  });

  it('rejects a frontage too short to hold an opening clear of the junctions at both ends', () => {
    // A 32 m frontage between two roads: 32 − 15 − 15 = 2 m, and the opening needs 6.
    const short = [
      edge(0, [0, 0], [32, 0], EdgeClassification.ROAD, RoadHierarchy.LOCAL),
      edge(1, [32, 0], [32, 20], EdgeClassification.ROAD, RoadHierarchy.LOCAL),
      edge(2, [32, 20], [0, 20], EdgeClassification.ADJACENT_PLOT),
      edge(3, [0, 20], [0, 0], EdgeClassification.ROAD, RoadHierarchy.LOCAL),
    ];
    const r = place(short);
    expect(r.candidates.map((c) => c.edgeSeq)).not.toContain(0);
    expect(r.rejected.find((x) => x.edgeSeq === 0)?.reason).toMatch(
      /junction clearance at P0 and at P1 \(B\.7\.2\.1\) only 2\.00 m remains/,
    );
  });

  it('keeps the full 15 m from a junction, and none from a neighbour’s corner', () => {
    // South is a road meeting the east road at P1; west is a neighbour.
    const c = place(corner()).candidates.find((x) => x.edgeSeq === 0)!;
    expect(c.junctionAt).toEqual({ start: false, end: true });
    expect(c.window.fromM.toString()).toBe('0');
    expect(c.window.toM.toString()).toBe('35');
    // Centred in what the rule leaves: 17.5 ± 3, so 14.5..20.5, and 29.5 m clear of P1.
    expect(c.centreOffsetM.toString()).toBe('17.5');
    expect(c.centreOffsetM.plus(c.widthM.div(2)).lte(50 - 15)).toBe(true);
  });

  it('returns an opening that is exactly the driveway width', () => {
    const c = place(twoRoads()).recommended!.value;
    const dx = Number(c.opening.end.x) - Number(c.opening.start.x);
    const dy = Number(c.opening.end.y) - Number(c.opening.start.y);
    expect(Math.hypot(dx, dy) / 1000).toBeCloseTo(6, 3);
  });

  it('narrows to 3 m when the scheme separates entry from exit', () => {
    const c = place(twoRoads(), { oneWay: true }).recommended!.value;
    expect(c.widthM.toString()).toBe('3');
  });

  it('offers every viable option, not only the winner', () => {
    // The client asked to be told where is better — not to be overruled.
    const r = place(twoRoads());
    expect(r.candidates.length).toBe(2);
    expect(r.candidates[0]!.rank).toBeLessThanOrEqual(r.candidates[1]!.rank);
  });

  it('cites B.7.2.1 for the placement', () => {
    expect(place(twoRoads()).recommended?.provenanceClass).toBe('DERIVED');
  });

  it('refuses a plot with no edges rather than inventing a frontage', () => {
    expect(() => place([])).toThrow(AccessPlacementError);
  });
});

/*
  Meeting 3, 38:32: he wants to put the entrance where he wants it, not only be
  told where it is better. The choice is his and is recorded as his; the
  recommendation stays beside it so he can see what he overruled.
*/
describe('a chosen entrance', () => {
  const actor = { id: 'u-1', name: 'Eng. Mohamed' };

  const on = (edgeSeq: number, centreOffsetM?: number) => ({
    edgeSeq,
    ...(centreOffsetM === undefined ? {} : { centreOffsetM: new Decimal(centreOffsetM) }),
  });

  it('is USER_SET by the person who chose it, and is what the drawings show', () => {
    // Edge 2 (LOCAL) is recommended; choose edge 0 (ARTERIAL) instead.
    const r = place(twoRoads(), { chosen: { entry: on(0), actor } });
    expect(r.chosen?.provenanceClass).toBe('USER_SET');
    expect(r.chosen?.value.edgeSeq).toBe(0);
    expect(r.entry).toBe(r.chosen);
  });

  it('leaves the recommendation in place beside the choice', () => {
    const r = place(twoRoads(), { chosen: { entry: on(0), actor } });
    expect(r.recommended?.value.edgeSeq).toBe(2);
    expect(r.recommended?.provenanceClass).toBe('DERIVED');
  });

  /*
    Eng. Mohamed, 16 Oct 2026: "انا دوست علي ضلع رقم ١ و بعدين بختار ال جزء الي
    هيكون فيه المدخل" — the boundary, then the stretch of it, then one 6 m
    two-way opening or two 3 m lanes, side by side or apart.
  */
  describe('placed along the boundary', () => {
    it('stands where it was put, when the rule allows it there', () => {
      // Corner plot: P0 meets a neighbour, so an opening may start at the corner itself.
      const c = place(corner(), { chosen: { entry: on(0, 3), actor } }).chosen!.value;
      expect(c.centreOffsetM.toString()).toBe('3');
      expect(c.openings).toHaveLength(1);
      expect(c.openings[0]!.role).toBe('ENTRY_EXIT');
      expect(c.openings[0]!.start).toEqual({ x: 0, y: 0 });
      expect(c.openings[0]!.end).toEqual({ x: 6000, y: 0 });
    });

    it('is refused within 15 m of a junction, and the sentence says where it may go', () => {
      expect(() => place(corner(), { chosen: { entry: on(0, 34), actor } })).toThrow(
        /The vehicle entrance on boundary 0 \(P0 → P1\) is centred 34\.00 m from P0\. A 6 m opening on this boundary must be centred between 3\.00 m and 32\.00 m from P0: B\.7\.2\.1 keeps it 15 m clear of the junction at P1/,
      );
    });

    it('is refused where it would hang off the end of a boundary with no junction', () => {
      expect(() => place(corner(), { chosen: { entry: on(0, 2), actor } })).toThrow(
        /between 3\.00 m and 32\.00 m from P0, so that all of it is on the boundary/,
      );
    });

    it('splits a side-by-side pair into an entry and an exit of 3 m each, entry on the driver’s right', () => {
      const c = place(twoRoads(), {
        chosen: { arrangement: 'ONE_WAY_PAIR', entry: on(0, 25), actor },
      }).chosen!.value;
      expect(c.arrangement).toBe('ONE_WAY_PAIR');
      expect(c.widthM.toString()).toBe('6');
      const entry = c.openings.find((o) => o.role === 'ENTRY')!;
      const exit = c.openings.find((o) => o.role === 'EXIT')!;
      expect(entry.widthM.toString()).toBe('3');
      expect(exit.widthM.toString()).toBe('3');
      // The ring runs anticlockwise and the plot lies north of edge 0: turning in
      // from the road, a driver's right is east — the edge's end.
      expect(entry.centreOffsetM.toString()).toBe('26.5');
      expect(exit.centreOffsetM.toString()).toBe('23.5');
      // One gap: the lanes meet.
      expect(exit.end).toEqual(entry.start);
    });

    it('puts an entry and an exit apart, each 3 m, on different boundaries', () => {
      const c = place(twoRoads(), {
        chosen: { arrangement: 'ONE_WAY_SEPARATE', entry: on(0, 10), exit: on(2, 40), actor },
      }).chosen!.value;
      expect(c.openings.map((o) => [o.role, o.edgeSeq, o.widthM.toString()])).toEqual([
        ['ENTRY', 0, '3'],
        ['EXIT', 2, '3'],
      ]);
    });

    it('refuses an entry and an exit apart whose lanes overlap', () => {
      expect(() =>
        place(twoRoads(), {
          chosen: { arrangement: 'ONE_WAY_SEPARATE', entry: on(0, 20), exit: on(0, 22), actor },
        }),
      ).toThrow(/the two 3 m lanes overlap/);
    });

    it('refuses "apart" with no exit, and an exit with any other arrangement', () => {
      expect(() =>
        place(twoRoads(), { chosen: { arrangement: 'ONE_WAY_SEPARATE', entry: on(0), actor } }),
      ).toThrow(/only the entry was placed/);
      expect(() =>
        place(twoRoads(), { chosen: { arrangement: 'TWO_WAY', entry: on(0), exit: on(2), actor } }),
      ).toThrow(/An exit was placed on its own/);
    });

    it('holds an exit apart to the same rule as the entry', () => {
      expect(() =>
        place(twoRoads(), {
          chosen: { arrangement: 'ONE_WAY_SEPARATE', entry: on(0, 10), exit: on(1), actor },
        }),
      ).toThrow(/The exit was placed on boundary 1 \(P1 → P2\), which cannot take one/);
    });
  });

  it('shows the recommendation when nobody chose', () => {
    const r = place(twoRoads());
    expect(r.chosen).toBeUndefined();
    expect(r.entry).toBe(r.recommended);
  });

  /* Drawing the recommendation instead would put the entrance where the reader
     said it does not go, in a file that looks right. */
  it('refuses a frontage the code refuses, in a sentence naming the boundary and why', () => {
    expect(() => place(twoRoads(), { chosen: { entry: on(1), actor } })).toThrow(
      AccessChoiceRefusedError,
    );
    // Numbered from 0, as the plot step's plan and its table number them.
    expect(() => place(twoRoads(), { chosen: { entry: on(1), actor } })).toThrow(
      /boundary 1 \(P1 → P2\), which cannot take one: it shares a boundary with a neighbouring plot/,
    );
  });

  it('refuses a frontage too short to keep 15 m off the junctions at both ends', () => {
    const short = [
      edge(0, [0, 0], [30, 0], EdgeClassification.ROAD, RoadHierarchy.LOCAL),
      edge(1, [30, 0], [30, 30], EdgeClassification.ROAD, RoadHierarchy.LOCAL),
      edge(2, [30, 30], [0, 30], EdgeClassification.ROAD, RoadHierarchy.LOCAL),
      edge(3, [0, 30], [0, 0], EdgeClassification.ROAD, RoadHierarchy.LOCAL),
    ];
    expect(() => place(short, { chosen: { entry: on(0), actor } })).toThrow(
      /junction clearance at P0 and at P1/,
    );
  });

  it('refuses a boundary the plot does not have', () => {
    expect(() => place(twoRoads(), { chosen: { entry: on(9), actor } })).toThrow(/has no boundary 9/);
  });
});

describe('what the placement does not establish', () => {
  it('says it has not checked for a T junction opposite', () => {
    expect(place(twoRoads()).notAssessed.join(' ')).toMatch(/T junction/);
  });

  it('says it does not stand in for RTA approval', () => {
    expect(place(twoRoads()).notAssessed.join(' ')).toMatch(/RTA/);
  });

  it('carries the caveats even when no placement was possible', () => {
    const noRoad = [
      edge(0, [0, 0], [40, 0], EdgeClassification.ADJACENT_PLOT),
      edge(1, [40, 0], [40, 30], EdgeClassification.ADJACENT_PLOT),
      edge(2, [40, 30], [0, 30], EdgeClassification.ADJACENT_PLOT),
      edge(3, [0, 30], [0, 0], EdgeClassification.ADJACENT_PLOT),
    ];
    const r = place(noRoad);
    expect(r.recommended).toBeUndefined();
    expect(r.notAssessed.length).toBeGreaterThan(0);
    expect(r.rejected).toHaveLength(4);
  });
});
