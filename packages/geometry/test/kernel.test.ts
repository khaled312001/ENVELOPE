/**
 * Geometry kernel tests.
 *
 * Structured the way the rule model requires its own tests to be (PRD §11.2):
 * a POSITIVE case, a BOUNDARY case at the threshold, and a NEGATIVE case that
 * must be refused. The kernel is held to the same standard as the rules it
 * serves.
 */

import { asMm, mm2ToM2, type Mm } from '@envelope/core';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  analysePlot,
  area,
  classifyShape,
  containsPoint,
  clipperArea,
  initGeometry,
  isConvex,
  isRectilinear,
  isSimple,
  offsetPerEdge,
  offsetUniform,
  ShapeClass,
  signedArea2Shoelace,
  signedArea2Trapezoid,
  verifiedArea,
  type Ring,
} from '../src/index.js';

const m = (v: number): Mm => asMm(Math.round(v * 1000));
const pt = (x: number, y: number) => ({ x: m(x), y: m(y) });

/** The deck's worked example: an 80 × 40 m plot. */
const PLOT_80x40: Ring = [pt(0, 0), pt(80, 0), pt(80, 40), pt(0, 40)];

/** An L-shaped rectilinear plot — legal in Phase 0, and non-convex. */
const L_SHAPE: Ring = [pt(0, 0), pt(60, 0), pt(60, 20), pt(30, 20), pt(30, 50), pt(0, 50)];

const uniformInsets = (n: number, metres: number) =>
  Array.from({ length: n }, (_, seq) => ({ seq, insetMm: m(metres) }));

beforeAll(async () => {
  await initGeometry();
});

describe('exact area — three independent methods', () => {
  it('agrees across all three on a rectangle', () => {
    expect(signedArea2Shoelace(PLOT_80x40)).toBe(signedArea2Trapezoid(PLOT_80x40));
    expect(area(PLOT_80x40)).toBe(clipperArea(PLOT_80x40));
    expect(mm2ToM2(verifiedArea(PLOT_80x40)).toString()).toBe('3200');
  });

  it('is exact on coordinates that are not round numbers', () => {
    // 33.333 × 17.777 = 592.560741 m² exactly. A float pipeline drifts here.
    const odd: Ring = [pt(0, 0), pt(33.333, 0), pt(33.333, 17.777), pt(0, 17.777)];
    expect(mm2ToM2(verifiedArea(odd)).toString()).toBe('592.560741');
  });

  it('is orientation-independent', () => {
    const reversed = [...PLOT_80x40].reverse();
    expect(area(reversed)).toBe(area(PLOT_80x40));
  });

  it('agrees on the L-shape, where a convexity assumption would not', () => {
    // 60×20 + 30×30 = 1200 + 900 = 2100 m²
    expect(mm2ToM2(verifiedArea(L_SHAPE)).toString()).toBe('2100');
  });
});

describe('shape classification — PRD §14.1, enforced at the data layer', () => {
  it('classifies an axis-parallel rectangle as RECTILINEAR', () => {
    expect(classifyShape(PLOT_80x40)).toBe(ShapeClass.RECTILINEAR);
    expect(isRectilinear(PLOT_80x40)).toBe(true);
    expect(isConvex(PLOT_80x40)).toBe(true);
  });

  it('classifies a non-axis-parallel convex plot as SIMPLE_CONVEX', () => {
    const triangle: Ring = [pt(0, 0), pt(50, 0), pt(20, 40)];
    expect(classifyShape(triangle)).toBe(ShapeClass.SIMPLE_CONVEX);
  });

  it('classifies an L-shape as RECTILINEAR even though it is not convex', () => {
    expect(isConvex(L_SHAPE)).toBe(false);
    expect(classifyShape(L_SHAPE)).toBe(ShapeClass.RECTILINEAR);
  });

  it('NEGATIVE: refuses a self-intersecting ring as COMPLEX', () => {
    const bowtie: Ring = [pt(0, 0), pt(40, 40), pt(40, 0), pt(0, 40)];
    expect(isSimple(bowtie)).toBe(false);
    expect(classifyShape(bowtie)).toBe(ShapeClass.COMPLEX);
  });
});

describe('containment', () => {
  it('includes boundary points — a footprint touching its setback line is inside it', () => {
    expect(containsPoint(PLOT_80x40, pt(0, 20))).toBe(true);
    expect(containsPoint(PLOT_80x40, pt(40, 20))).toBe(true);
    expect(containsPoint(PLOT_80x40, pt(80.001, 20))).toBe(false);
  });

  it('handles the reflex corner of an L-shape', () => {
    expect(containsPoint(L_SHAPE, pt(45, 10))).toBe(true);
    expect(containsPoint(L_SHAPE, pt(45, 40))).toBe(false); // in the notch
  });
});

describe('uniform offset', () => {
  it.each([
    [7.5, '1625'],
    [6.0, '1904'],
    [5.25, '2050.25'],
  ])('inset %s m leaves exactly %s m²', (inset, expected) => {
    const [ring] = offsetUniform(PLOT_80x40, m(inset));
    expect(mm2ToM2(verifiedArea(ring!)).toString()).toBe(expected);
  });
});

describe('per-edge offset — FR-PLT-002', () => {
  it('POSITIVE: applies a different setback to each edge', () => {
    // south 6, east 3, north 7.5, west 3 → (80−6) × (40−13.5) = 74 × 26.5
    const result = offsetPerEdge(PLOT_80x40, [
      { seq: 0, insetMm: m(6) }, // south
      { seq: 1, insetMm: m(3) }, // east
      { seq: 2, insetMm: m(7.5) }, // north
      { seq: 3, insetMm: m(3) }, // west
    ]);
    expect(mm2ToM2(result.areaMm2).toString()).toBe('1961');
    expect(result.exact).toBe(true);
  });

  it('reports exact=false when an edge is oblique, because a snap occurred', () => {
    const triangle: Ring = [pt(0, 0), pt(60, 0), pt(30, 45)];
    const result = offsetPerEdge(triangle, uniformInsets(3, 3));
    expect(result.exact).toBe(false);
    expect(result.areaMm2).toBeGreaterThan(0);
  });

  it('handles the reflex corner of an L-shaped plot', () => {
    const result = offsetPerEdge(L_SHAPE, uniformInsets(6, 3));
    expect(result.exact).toBe(true);
    // Strictly inside the original, and materially smaller.
    expect(result.areaMm2).toBeLessThan(area(L_SHAPE));
    expect(result.ring.every((p) => containsPoint(L_SHAPE, p))).toBe(true);
  });

  it('BOUNDARY: survives a setback that leaves a thin but real strip', () => {
    // 40 m depth, 19.9 m from each side → 0.2 m strip. Above the 100 mm sliver gate.
    const result = offsetPerEdge(PLOT_80x40, [
      { seq: 0, insetMm: m(19.9) },
      { seq: 1, insetMm: m(1) },
      { seq: 2, insetMm: m(19.9) },
      { seq: 3, insetMm: m(1) },
    ]);
    expect(mm2ToM2(result.areaMm2).toString()).toBe('15.6');
  });

  it('NEGATIVE: refuses setbacks that over-consume the plot', () => {
    expect(() => offsetPerEdge(PLOT_80x40, uniformInsets(4, 25))).toThrow(
      /over-consume|no buildable area|sliver/i,
    );
  });

  it('NEGATIVE: refuses a missing inset rather than defaulting — FR-PLT-001 AC3', () => {
    expect(() => offsetPerEdge(PLOT_80x40, uniformInsets(3, 5))).toThrow(/forbids a default/);
  });

  it('NEGATIVE: refuses a negative inset', () => {
    expect(() =>
      offsetPerEdge(PLOT_80x40, [
        { seq: 0, insetMm: m(-1) },
        { seq: 1, insetMm: m(3) },
        { seq: 2, insetMm: m(3) },
        { seq: 3, insetMm: m(3) },
      ]),
    ).toThrow(/negative/);
  });
});

describe('plot analysis', () => {
  it('derives every property PRD §10.2 hangs off PLOT', () => {
    const g = analysePlot(PLOT_80x40);
    expect(g.shapeClass).toBe(ShapeClass.RECTILINEAR);
    expect(g.areaM2.toString()).toBe('3200');
    expect(g.convexityRatio.toString()).toBe('1');
    expect(g.mbr.widthMm).toBe(m(80));
    expect(g.mbr.depthMm).toBe(m(40));
    expect(g.extent.widthMm).toBe(m(80));
  });

  it('reports a convexity ratio below 1 for the L-shape', () => {
    const g = analysePlot(L_SHAPE);
    // 2100 m² of polygon inside a 2550 m² hull.
    expect(g.convexityRatio.toNumber()).toBeCloseTo(2100 / 2550, 6);
  });
});

/**
 * The finding that changes the build — see `CLAUDE.md` and
 * `docs/03-analysis/open-questions.md`.
 *
 * Deck slide 05 tabulates, for an 80 × 40 m plot at FAR 5.0 (16,000 m² GFA):
 *
 * | setback | deck says |
 * |---|---|
 * | 7.50 m | 7.6 floors |
 * | 6.00 m | 6.9 floors |
 * | 5.25 m | 6.6 floors |
 *
 * The kernel computes the footprints exactly, so the floor counts follow by
 * division. They do not match, and no single coverage factor reconciles all
 * three rows. This test exists to keep that finding checkable rather than
 * remembered — if the client later supplies the missing assumption, this test is
 * where it gets encoded.
 */
describe('deck slide 05 — reconciliation of the published example', () => {
  const GFA_M2 = 16_000;

  it.each([
    [7.5, 1625, 7.6],
    [6.0, 1904, 6.9],
    [5.25, 2050.25, 6.6],
  ])(
    'at setback %s m the footprint is %s m², giving floors that differ from the deck',
    (setback, expectedFootprint, deckFloors) => {
      const [ring] = offsetUniform(PLOT_80x40, m(setback));
      const footprint = mm2ToM2(verifiedArea(ring!)).toNumber();
      expect(footprint).toBe(expectedFootprint);

      const computedFloors = GFA_M2 / footprint;
      expect(computedFloors).not.toBeCloseTo(deckFloors, 1);
    },
  );

  it('no constant coverage factor reconciles all three rows', () => {
    const rows: [number, number][] = [
      [1625, 7.6],
      [1904, 6.9],
      [2050.25, 6.6],
    ];
    // If the deck applied some constant k (a coverage cap, an efficiency), then
    // floors = GFA / (footprint × k) would give the same k on every row.
    const implied = rows.map(([footprint, floors]) => GFA_M2 / (footprint * floors));
    const [first, ...rest] = implied;
    for (const k of rest) {
      expect(Math.abs(k - first!)).toBeGreaterThan(0.02);
    }
  });
});
