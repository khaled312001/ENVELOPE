/**
 * Curved boundaries.
 *
 * Same standard as the rest of the kernel (PRD §11.2): a POSITIVE case whose
 * answer is known in closed form, a BOUNDARY case at the tolerance, and a
 * NEGATIVE case that must be refused. Two of these exist specifically to hold
 * the sign convention still — "a positive bulge bows to the right of travel"
 * is a sentence, and a sentence is exactly the kind of thing that silently
 * inverts and leaves every area plausible.
 */

import { asMm, Decimal, DegenerateGeometryError, type Mm } from '@envelope/core';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  analysePlot,
  arcAreaCorrectionMm2,
  arcFromBulge,
  type BoundaryArc,
  bulgeFromRadius,
  initGeometry,
  MAX_SAGITTA_MM,
  offsetPerEdge,
  type Pt,
  type Ring,
  tessellateArc,
  tessellateRing,
} from '../src/index.js';

const mm = (x: number, y: number): Pt => ({ x: asMm(x), y: asMm(y) });

/** tan(22.5°), the bulge of a quarter circle. */
const QUARTER = new Decimal(90).div(4).times(Decimal.acos(-1)).div(180).tan();

/** A 10 m square, counter-clockwise, corner at the origin. */
const SQUARE: Ring = [mm(0, 0), mm(10000, 0), mm(10000, 10000), mm(0, 10000)];

describe('a bulge resolves to the circle it names', () => {
  it('reads a quarter circle off its two ends', () => {
    const arc = arcFromBulge(mm(1000, 0), mm(0, 1000), QUARTER);
    expect(arc.radiusMm.toDecimalPlaces(6).toString()).toBe('1000');
    expect(arc.sweepDeg.toDecimalPlaces(6).toString()).toBe('90');
    expect(arc.centreX.toDecimalPlaces(6).toString()).toBe('0');
    expect(arc.centreY.toDecimalPlaces(6).toString()).toBe('0');
    expect(arc.counterClockwise).toBe(true);
    // Arc length is r·θ, which is longer than the chord it replaces. An
    // affection plan prints this figure, so it has to come out of the bulge.
    expect(arc.arcLengthMm.toDecimalPlaces(3).toString()).toBe('1570.796');
    expect(arc.chordMm.toDecimalPlaces(3).toString()).toBe('1414.214');
  });

  it('carries the side in the sign, and nowhere else', () => {
    const left = arcFromBulge(mm(1000, 0), mm(0, 1000), QUARTER.negated());
    expect(left.counterClockwise).toBe(false);
    expect(left.radiusMm.toDecimalPlaces(6).toString()).toBe('1000');
    // Mirrored about the chord: the centre moves to the other side of it.
    expect(left.centreX.toDecimalPlaces(3).toString()).toBe('1000');
    expect(left.centreY.toDecimalPlaces(3).toString()).toBe('1000');
  });

  it('turns a radius read off a sheet into a bulge and back', () => {
    const bulge = bulgeFromRadius(new Decimal(1414.2135624), new Decimal(1000), true);
    expect(bulge.minus(QUARTER).abs().lt('1e-9')).toBe(true);
    const arc = arcFromBulge(mm(1000, 0), mm(0, 1000), bulge);
    expect(arc.radiusMm.toDecimalPlaces(3).toString()).toBe('1000');
  });
});

describe('a positive bulge bows to the right of the way it is walked', () => {
  it('puts a semicircle on the far side of the boundary from the plot', () => {
    // The square is counter-clockwise, so boundary 0 is walked east along y = 0
    // with the plot to the north of it. A positive bulge must send the curve
    // south — outward — and if this ever inverts, every curved plot silently
    // loses the area it should have gained.
    const points = tessellateArc(SQUARE[0]!, SQUARE[1]!, new Decimal(1));
    expect(points.length).toBeGreaterThan(20);
    expect(points.every((p) => p.y < 0)).toBe(true);
    // Within a millimetre of the radius, and not exactly it: the segment count
    // comes from the sagitta, so nothing guarantees a vertex lands on the
    // crown. A test that demanded one would be asserting an even number of
    // segments, which is a fact about the tolerance and not about the arc.
    const deepest = points.reduce((acc, p) => Math.min(acc, p.y), 0);
    expect(deepest).toBeLessThanOrEqual(-5000 + MAX_SAGITTA_MM);
    expect(deepest).toBeGreaterThanOrEqual(-5000);
  });

  it('and a negative one sends it into the plot', () => {
    const points = tessellateArc(SQUARE[0]!, SQUARE[1]!, new Decimal(-1));
    expect(points.every((p) => p.y > 0)).toBe(true);
  });
});

describe('the tessellation stays inside the grid it is drawn on', () => {
  it('never departs from the true arc by more than the declared sagitta', () => {
    const arc = arcFromBulge(SQUARE[0]!, SQUARE[1]!, new Decimal(1));
    const points = [SQUARE[0]!, ...tessellateArc(SQUARE[0]!, SQUARE[1]!, new Decimal(1)), SQUARE[1]!];
    let worst = new Decimal(0);
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i]!;
      const b = points[i + 1]!;
      // The chord's midpoint is the farthest a straight segment gets from the
      // circle, so measuring there measures the worst case.
      const midX = new Decimal(a.x + b.x).div(2);
      const midY = new Decimal(a.y + b.y).div(2);
      const dx = midX.minus(arc.centreX);
      const dy = midY.minus(arc.centreY);
      const gap = arc.radiusMm.minus(dx.times(dx).plus(dy.times(dy)).sqrt()).abs();
      if (gap.gt(worst)) worst = gap;
    }
    // Plus a millimetre of headroom for the rounding of the points themselves
    // onto the grid, which is a separate and already-declared approximation.
    expect(worst.lte(MAX_SAGITTA_MM + 1)).toBe(true);
    expect(worst.gt(0)).toBe(true);
  });

  it('leaves the surveyed corners exactly where they were typed', () => {
    const { ring, spans } = tessellateRing(SQUARE, [new Decimal(1), undefined, undefined, undefined]);
    expect(ring[spans[0]!.from]).toEqual(SQUARE[0]);
    expect(ring[spans[1]!.from]).toEqual(SQUARE[1]);
    expect(ring[spans[2]!.from]).toEqual(SQUARE[2]);
    expect(ring[spans[3]!.from]).toEqual(SQUARE[3]);
    expect(spans[0]!.count).toBeGreaterThan(1);
    expect(spans[1]!.count).toBe(1);
    expect(ring.length).toBe(spans.reduce((n, s) => n + s.count, 0));
  });
});

describe('the area is the curved plot, not the polygon standing in for it', () => {
  const SEMICIRCLE: readonly (Decimal | undefined)[] = [
    new Decimal(1),
    undefined,
    undefined,
    undefined,
  ];

  it('adds the circular segment in closed form', () => {
    // ½r²(θ − sin θ) with r = 5 m and θ = π is ½·π·25 m², to the millimetre.
    const correction = arcAreaCorrectionMm2(SQUARE, SEMICIRCLE);
    const expected = Decimal.acos(-1).times(25_000_000).div(2);
    expect(correction.minus(expected).abs().lt(1)).toBe(true);
  });

  it('and reports it as the plot area', () => {
    const geometry = analysePlot(SQUARE, SEMICIRCLE);
    // 100 m² of square plus 39.269908 m² of half-disc.
    expect(geometry.areaM2.toFixed(6)).toBe('139.269908');
  });

  it('which the tessellated polygon on its own does not reach', () => {
    const geometry = analysePlot(SQUARE, SEMICIRCLE);
    const shoelace = analysePlot(geometry.ring);
    expect(shoelace.areaM2.lt(geometry.areaM2)).toBe(true);
    // Small — but the areas on every screen are printed to the square
    // centimetre, and this is two orders of magnitude above that.
    expect(geometry.areaM2.minus(shoelace.areaM2).lt('0.01')).toBe(false);
  });

  it('subtracts where the boundary curves into the plot', () => {
    const inward = analysePlot(SQUARE, [new Decimal(-1), undefined, undefined, undefined]);
    expect(inward.areaM2.toFixed(6)).toBe('60.730092');
    // And a plot whose boundary bows inward is re-entrant, which Phase 0 has
    // always refused by name rather than approximated.
    expect(inward.shapeClass).toBe('COMPLEX');
  });

  it('leaves a straight plot exactly as it was', () => {
    expect(analysePlot(SQUARE).areaM2.toFixed(2)).toBe('100.00');
    expect(analysePlot(SQUARE).ring).toEqual(SQUARE);
    expect(analysePlot(SQUARE).spans.map((s) => s.count)).toEqual([1, 1, 1, 1]);
  });
});

describe('what it refuses', () => {
  it('a bulge of zero, which is a straight edge recorded as a curve', () => {
    expect(() => arcFromBulge(SQUARE[0]!, SQUARE[1]!, new Decimal(0))).toThrow(
      DegenerateGeometryError,
    );
  });

  it('a radius too small to reach across the boundary it spans', () => {
    expect(() => bulgeFromRadius(new Decimal(10000), new Decimal(4000), true)).toThrow(
      /at least half of it/,
    );
  });

  it('a curve on a ring wound the other way, rather than inverting its sign', () => {
    const clockwise: Ring = [...SQUARE].reverse();
    expect(() => analysePlot(clockwise, [new Decimal(1), undefined, undefined, undefined])).toThrow(
      /counter-clockwise/,
    );
  });

  it('a boundary shorter than the kernel draws', () => {
    const tiny: Mm = asMm(50);
    expect(() => arcFromBulge(mm(0, 0), { x: tiny, y: asMm(0) }, new Decimal(1))).toThrow(
      DegenerateGeometryError,
    );
  });

  it('a curve so gentle it is the chord it spans', () => {
    // Ten metres of boundary bowing out by a fifth of a millimetre. Recording
    // that as a curve buys seventy vertices and a segment area for a boundary
    // that is straight on the grid the whole kernel is drawn on.
    expect(() => arcFromBulge(SQUARE[0]!, SQUARE[1]!, new Decimal('0.00004'))).toThrow(
      /is a straight boundary/,
    );
    // A millimetre of bow is kept, so the refusal sits on the tolerance rather
    // than a comfortable distance above it.
    expect(() => arcFromBulge(SQUARE[0]!, SQUARE[1]!, new Decimal('0.0003'))).not.toThrow();
  });

  it('a bulge past a full turn, which is not a boundary at all', () => {
    expect(() => arcFromBulge(SQUARE[0]!, SQUARE[1]!, new Decimal('1e40'))).toThrow(
      /full turn/,
    );
  });
});

/**
 * Setting a curved boundary back.
 *
 * This is the part that does not work the obvious way, and the first test here
 * is the doctored one: offsetting a curve as the sixty straight pieces it was
 * drawn as intersects two lines six thousandths of a radian apart, on a grid
 * whose rounding is half a millimetre. It fails — and it fails on a plot whose
 * footprint is perfectly ordinary, which is why it needs a test that says so
 * rather than a comment.
 */
describe('a curved boundary is set back as a circle', () => {
  // The offset intersects its result with the plot through Clipper, which is a
  // WebAssembly module and has to be up before any of this runs.
  beforeAll(async () => {
    await initGeometry();
  });

  const ROAD_CURVE = [
    bulgeFromRadius(new Decimal(80000), new Decimal(200000), true),
    undefined,
    undefined,
    undefined,
  ] as const;
  const PLOT: Ring = [mm(0, 0), mm(80000, 0), mm(80000, 40000), mm(0, 40000)];
  const INSET = 4500;

  const built = (): { ring: Ring; arcs: readonly BoundaryArc[] } => {
    const { ring, spans } = tessellateRing(PLOT, ROAD_CURVE);
    const circle = arcFromBulge(PLOT[0]!, PLOT[1]!, ROAD_CURVE[0]!);
    return {
      ring,
      arcs: [
        {
          from: spans[0]!.from,
          count: spans[0]!.count,
          centreX: circle.centreX,
          centreY: circle.centreY,
          radiusMm: circle.radiusMm,
        },
      ],
    };
  };

  it('refuses to come out of treating the curve as the lines it was drawn as', () => {
    const { ring } = built();
    const insets = ring.map((_, i) => ({ seq: i, insetMm: asMm(INSET) }));
    // No arcs: every piece of the curve is an independent supporting line, which
    // is what this file argues cannot work. It does not quietly return a wrong
    // footprint — it trips the self-intersection gate.
    expect(() => offsetPerEdge(ring, insets)).toThrow(/self-intersects/);
  });

  it('and produces the concentric arc when told the curve is a curve', () => {
    const { ring, arcs } = built();
    const insets = ring.map((_, i) => ({ seq: i, insetMm: asMm(INSET) }));
    const offset = offsetPerEdge(ring, insets, arcs);

    // The boundary's crown is 4041 mm south of the chord, so the setback line
    // 4500 mm inside it sits 459 mm NORTH of the chord. Measured off the
    // offset ring rather than asserted from the construction that built it.
    const crown = offset.ring.reduce((acc, p) => Math.min(acc, p.y), Number.MAX_SAFE_INTEGER);
    expect(crown).toBeGreaterThanOrEqual(457);
    expect(crown).toBeLessThanOrEqual(461);

    // And it is genuinely bigger than the answer the chord would have given:
    // 71 × 31 m is what the straight rectangle yields, and the curve adds to it.
    expect(offset.areaMm2).toBeGreaterThan(2201 * 1_000_000);
    expect(offset.areaMm2).toBeLessThan(2500 * 1_000_000);
    expect(offset.exact).toBe(false);
  });

  it('keeps every offset vertex the setback distance clear of the curve', () => {
    const { ring, arcs } = built();
    const circle = arcs[0]!;
    const offset = offsetPerEdge(
      ring,
      ring.map((_, i) => ({ seq: i, insetMm: asMm(INSET) })),
      arcs,
    );
    // Nothing may sit closer to the arc's circle than the setback allows. The
    // slack is the two millimetres the trim is allowed and the one the grid is.
    for (const p of offset.ring) {
      const dx = new Decimal(p.x).minus(circle.centreX);
      const dy = new Decimal(p.y).minus(circle.centreY);
      const distance = dx.times(dx).plus(dy.times(dy)).sqrt();
      expect(circle.radiusMm.minus(distance).gte(INSET - 3)).toBe(true);
    }
  });

  it('refuses a setback that eats the curve entirely, in words', () => {
    const { ring, arcs } = built();
    expect(() =>
      offsetPerEdge(
        ring,
        ring.map((_, i) => ({ seq: i, insetMm: asMm(200_001) })),
        arcs,
      ),
    ).toThrow(/consumes a curved boundary/);
  });

  it('refuses a ring that has been renumbered under the spans it was given', () => {
    const { ring, arcs } = built();
    const clockwise: Ring = [...ring].reverse();
    expect(() =>
      offsetPerEdge(
        clockwise,
        clockwise.map((_, i) => ({ seq: i, insetMm: asMm(INSET) })),
        arcs,
      ),
    ).toThrow(/exactly as it was built/);
  });
});
