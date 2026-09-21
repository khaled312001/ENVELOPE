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

  it('rejects a frontage too short to hold an opening clear of both corners', () => {
    // 32 m frontage − 15 − 15 = 2 m of window, and the opening needs 6.
    const short = [
      edge(0, [0, 0], [32, 0], EdgeClassification.ROAD, RoadHierarchy.LOCAL),
      edge(1, [32, 0], [32, 20], EdgeClassification.ADJACENT_PLOT),
      edge(2, [32, 20], [0, 20], EdgeClassification.ADJACENT_PLOT),
      edge(3, [0, 20], [0, 0], EdgeClassification.ADJACENT_PLOT),
    ];
    const r = place(short);
    expect(r.recommended).toBeUndefined();
    expect(r.rejected.find((x) => x.edgeSeq === 0)?.reason).toMatch(/junction clearance/);
  });

  it('places the opening clear of both corners by the full 15 m', () => {
    const r = place(twoRoads());
    const c = r.recommended!.value;
    const halfWidth = c.widthM.div(2);
    expect(c.centreOffsetM.minus(halfWidth).gte(15)).toBe(true);
    // 50 m edge, opening centred: 25 ± 3, so 22..28 — 15 m clear at each end.
    expect(c.centreOffsetM.plus(halfWidth).lte(50 - 15)).toBe(true);
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
