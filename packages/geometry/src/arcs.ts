/**
 * Circular boundaries — the half of Eng. Mohamed's second point that a traverse
 * table alone does not answer.
 *
 * *"الاراضي عموما كتير بتكون فيها كذا مقاس و كسور و **كيرفات**"*. A plot on a
 * roundabout, a cul-de-sac head, a corner rounded by the highway authority: the
 * boundary is an arc, and it is printed on the affection plan as an arc — a
 * radius and a length, not a string of coordinates.
 *
 * **Why a curve cannot simply be entered as its chord.** Where the arc bows
 * outward the chord is inside the plot, so the envelope comes out small and the
 * error is conservative. Where it bows inward the chord is *outside* the plot,
 * the envelope comes out large, and the capacity is overstated by exactly the
 * area the curve removes. A product whose whole argument is that it does not
 * guess cannot decide which of those two it is doing by accident.
 *
 * **Where the exactness stops, and why that is a boundary rather than a
 * defect.** The kernel is Clipper, which is integer and polygonal — it has no
 * curve primitive, and neither does any of the exact-predicate literature it is
 * built on. So the arc is stored exactly, as the bulge that generates it, and
 * the polygon handed to Clipper is a tessellation whose deviation from the true
 * arc is bounded by {@link MAX_SAGITTA_MM}: one millimetre, which is the grid
 * the whole kernel already declares in `packages/core/src/numeric.ts`. The
 * approximation is not allowed to reach the **area**, because that is a number a
 * reader sees: {@link arcAreaCorrectionMm2} adds the circular segments back in
 * closed form, so the reported area is the area of the curved plot and not of
 * the many-sided polygon standing in for it.
 *
 * **The bulge, and why that and not a radius.** `bulge = tan(sweep / 4)` is the
 * DXF `LWPOLYLINE` group 42 — one signed number that carries the radius, the
 * sweep and the side all at once, and the only representation a DXF importer
 * and a DXF writer both already agree on. A radius on its own is ambiguous: two
 * arcs join any two points at a given radius, and four if you count direction.
 * A positive bulge is a counter-clockwise arc, which bows to the **right** of
 * the direction of travel — so on a counter-clockwise ring, where the interior
 * is to the left, a positive bulge bows outward and adds area.
 */

import {
  asMm,
  Decimal,
  DEGENERATE_MIN_DIMENSION_MM,
  DegenerateGeometryError,
  type Mm,
} from '@envelope/core';

import { isCounterClockwise, type Pt, type Ring } from './exact.js';

/**
 * The most a tessellated chord may depart from the arc it replaces.
 *
 * One millimetre, which is the grid the kernel snaps to anyway — a tighter
 * tolerance would be a promise the coordinate type cannot keep. The count of
 * segments falls out of this and the radius; it is never a round number chosen
 * because it looked smooth.
 */
export const MAX_SAGITTA_MM = 1 as const;

/**
 * A ceiling on the segments one arc may become, so that a radius typed with a
 * misplaced decimal point cannot produce a ring with ten thousand vertices and
 * an O(n²) simplicity test behind it. Reaching it raises rather than silently
 * drawing a coarser curve.
 */
const MAX_SEGMENTS = 256;

const TWO = new Decimal(2);
const PI = Decimal.acos(-1);
const DEG = new Decimal(180).div(PI);

/** Everything the bulge implies, measured rather than restated. */
export interface ArcGeometry {
  /** Centre of the circle, in exact decimal — it is not on the millimetre grid. */
  readonly centreX: Decimal;
  readonly centreY: Decimal;
  readonly radiusMm: Decimal;
  /** Included angle, degrees, always positive. */
  readonly sweepDeg: Decimal;
  readonly arcLengthMm: Decimal;
  readonly chordMm: Decimal;
  /** True when the arc turns counter-clockwise, which is a positive bulge. */
  readonly counterClockwise: boolean;
}

function chordLength(p: Pt, q: Pt): Decimal {
  const dx = new Decimal(q.x - p.x);
  const dy = new Decimal(q.y - p.y);
  return dx.times(dx).plus(dy.times(dy)).sqrt();
}

/**
 * Resolve a bulge against the chord it spans.
 *
 * Throws rather than returning a plausible circle for the two inputs that have
 * no arc: a zero bulge, which is a straight edge and should not have been
 * recorded as a curve, and a bulge at or beyond a full turn.
 */
export function arcFromBulge(p: Pt, q: Pt, bulge: Decimal): ArcGeometry {
  if (bulge.isZero()) {
    throw new DegenerateGeometryError('a bulge of zero is a straight edge, not an arc', { p, q });
  }
  const chordMm = chordLength(p, q);
  if (chordMm.lt(DEGENERATE_MIN_DIMENSION_MM)) {
    throw new DegenerateGeometryError(
      `curved boundary spans ${chordMm.toFixed(1)} mm, below the ${DEGENERATE_MIN_DIMENSION_MM} mm minimum`,
      { p, q },
    );
  }
  // bulge = tan(sweep / 4), so the sweep is four arctangents of it.
  const sweep = bulge.abs().atan().times(4);
  if (sweep.gte(PI.times(TWO))) {
    throw new DegenerateGeometryError('a curved boundary cannot sweep a full turn', {
      bulge: bulge.toString(),
    });
  }
  const radiusMm = chordMm.div(TWO.times(sweep.div(TWO).sin()));
  // The arc's own departure from its chord, which reduces to `chord × |bulge| / 2`.
  // Below the grid the curve IS the chord, and recording it as a curve would put
  // seventy vertices and a segment area into a boundary that is straight.
  const sagitta = chordMm.times(bulge.abs()).div(TWO);
  if (sagitta.lt(MAX_SAGITTA_MM)) {
    throw new DegenerateGeometryError(
      `a curved boundary that leaves its chord by ${sagitta.toFixed(3)} mm is a straight boundary on a ${MAX_SAGITTA_MM} mm grid`,
      { bulge: bulge.toString(), chordMm: chordMm.toString() },
    );
  }
  const counterClockwise = bulge.isPositive();

  // The centre is on the left of the direction of travel for a counter-clockwise
  // arc. `cos(sweep/2)` goes negative past a half turn, which puts the centre on
  // the other side without a second branch.
  const sign = counterClockwise ? new Decimal(1) : new Decimal(-1);
  const apothem = radiusMm.times(sweep.div(TWO).cos()).times(sign);
  const ux = new Decimal(q.x - p.x).div(chordMm);
  const uy = new Decimal(q.y - p.y).div(chordMm);
  return {
    centreX: new Decimal(p.x + q.x).div(TWO).plus(uy.negated().times(apothem)),
    centreY: new Decimal(p.y + q.y).div(TWO).plus(ux.times(apothem)),
    radiusMm,
    sweepDeg: sweep.times(DEG),
    arcLengthMm: radiusMm.times(sweep),
    chordMm,
    counterClockwise,
  };
}

/**
 * The bulge of the minor arc of a given radius across a given chord.
 *
 * This is the direction the form takes: an affection plan prints a radius, and
 * the side the boundary curves toward is read off the drawing. The major arc —
 * the long way round — is not offered, because a plot boundary that takes the
 * long way round a circle is re-entrant and Phase 0 refuses those anyway, with
 * its own message.
 *
 * `bulgesRight` is the side as a person standing on the boundary and facing the
 * way it is being walked would say it: the curve bows away to their right.
 */
export function bulgeFromRadius(
  chordMm: Decimal,
  radiusMm: Decimal,
  bulgesRight: boolean,
): Decimal {
  const half = chordMm.div(TWO);
  if (radiusMm.lt(half)) {
    throw new DegenerateGeometryError(
      `a radius of ${radiusMm.div(1000).toFixed(3)} m cannot span a ${chordMm
        .div(1000)
        .toFixed(3)} m boundary: it would have to be at least half of it`,
      { chordMm: chordMm.toString(), radiusMm: radiusMm.toString() },
    );
  }
  const sweep = half.div(radiusMm).asin().times(TWO);
  const magnitude = sweep.div(4).tan();
  return bulgesRight ? magnitude : magnitude.negated();
}

/** Segments needed to hold one arc inside {@link MAX_SAGITTA_MM}. */
function segmentCount(arc: ArcGeometry): number {
  if (arc.radiusMm.lte(MAX_SAGITTA_MM)) {
    throw new DegenerateGeometryError('a curved boundary tighter than the grid it is drawn on', {
      radiusMm: arc.radiusMm.toString(),
    });
  }
  const sweep = arc.sweepDeg.div(DEG);
  const perSegment = Decimal.acos(new Decimal(1).minus(new Decimal(MAX_SAGITTA_MM).div(arc.radiusMm))).times(TWO);
  const n = sweep.div(perSegment).ceil().toNumber();
  if (n > MAX_SEGMENTS) {
    throw new DegenerateGeometryError(
      `a curved boundary needing ${n} straight segments to stay within ${MAX_SAGITTA_MM} mm; the limit is ${MAX_SEGMENTS}`,
      { radiusMm: arc.radiusMm.toString(), sweepDeg: arc.sweepDeg.toString() },
    );
  }
  return Math.max(1, n);
}

function roundMm(value: Decimal): Mm {
  return asMm(value.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber());
}

/**
 * The points *between* the ends of an arc, on the millimetre grid.
 *
 * The ends themselves are the ring's own vertices and are never moved: a
 * boundary's corner is a surveyed point, and a tessellation that nudged it would
 * be changing a number a person typed to make a curve fit.
 */
export function tessellateArc(p: Pt, q: Pt, bulge: Decimal): readonly Pt[] {
  const arc = arcFromBulge(p, q, bulge);
  const n = segmentCount(arc);
  const total = arc.sweepDeg.div(DEG).times(arc.counterClockwise ? 1 : -1);
  const rx = new Decimal(p.x).minus(arc.centreX);
  const ry = new Decimal(p.y).minus(arc.centreY);
  const out: Pt[] = [];
  let previous: Pt = p;
  for (let i = 1; i < n; i += 1) {
    const a = total.times(i).div(n);
    const cos = a.cos();
    const sin = a.sin();
    const point: Pt = {
      x: roundMm(arc.centreX.plus(rx.times(cos)).minus(ry.times(sin))),
      y: roundMm(arc.centreY.plus(rx.times(sin)).plus(ry.times(cos))),
    };
    // A point that rounds onto its predecessor would be a zero-length edge, which
    // the offset kernel refuses by design. Dropping it costs nothing: it is
    // within a millimetre of a point that is already there.
    if (point.x === previous.x && point.y === previous.y) continue;
    out.push(point);
    previous = point;
  }
  if (out.length > 0) {
    const last = out[out.length - 1]!;
    if (last.x === q.x && last.y === q.y) out.pop();
  }
  return out;
}

/** Which run of the tessellated ring one entered boundary became. */
export interface RingSpan {
  /** Index of this boundary's first vertex in the tessellated ring. */
  readonly from: number;
  /** How many straight ring edges it became. One, unless it is an arc. */
  readonly count: number;
}

export interface TessellatedRing {
  readonly ring: Ring;
  /** One entry per entered boundary, in the same order. */
  readonly spans: readonly RingSpan[];
}

/**
 * Turn a ring of corners plus a bulge per boundary into the polygon the kernel
 * works on, and say which part of it belongs to which boundary.
 *
 * The spans are the whole point. Every consumer downstream — the setback of one
 * frontage, the symbol on one boundary, the label on one dimension string —
 * addresses a boundary as the reader entered it, not a chord of a curve the
 * reader never saw.
 */
export function tessellateRing(
  corners: Ring,
  bulges: readonly (Decimal | undefined)[],
): TessellatedRing {
  if (corners.length !== bulges.length) {
    throw new DegenerateGeometryError('one bulge is expected per boundary, present or absent', {
      corners: corners.length,
      bulges: bulges.length,
    });
  }
  const ring: Pt[] = [];
  const spans: RingSpan[] = [];
  for (let i = 0; i < corners.length; i += 1) {
    const from = ring.length;
    const start = corners[i]!;
    const end = corners[(i + 1) % corners.length]!;
    ring.push(start);
    const bulge = bulges[i];
    if (bulge === undefined) {
      spans.push({ from, count: 1 });
      continue;
    }
    const interior = tessellateArc(start, end, bulge);
    ring.push(...interior);
    spans.push({ from, count: interior.length + 1 });
  }
  return { ring, spans };
}

/**
 * The area the tessellation leaves out, in signed square millimetres.
 *
 * Added to the shoelace area of the **corner** ring — not of the tessellated one
 * — this is the exact area of the curved plot: a polygon plus its circular
 * segments, each in closed form as `½r²(θ − sin θ)`.
 *
 * The sign convention is the reason this takes a ring and not just a list of
 * bulges. A positive bulge bows to the right of travel; on a counter-clockwise
 * ring the interior is to the left, so it bows outward and adds. On a clockwise
 * ring every one of those statements inverts, and silently returning the
 * negative of the right answer is worse than refusing, so it refuses.
 */
export function arcAreaCorrectionMm2(
  corners: Ring,
  bulges: readonly (Decimal | undefined)[],
): Decimal {
  if (corners.length !== bulges.length) {
    throw new DegenerateGeometryError('one bulge is expected per boundary, present or absent', {
      corners: corners.length,
      bulges: bulges.length,
    });
  }
  if (bulges.some((b) => b !== undefined) && !isCounterClockwise(corners)) {
    throw new DegenerateGeometryError(
      'the area a curve adds is only signed against a counter-clockwise ring',
      { corners: corners.length },
    );
  }
  let acc = new Decimal(0);
  for (let i = 0; i < corners.length; i += 1) {
    const bulge = bulges[i];
    if (bulge === undefined) continue;
    const arc = arcFromBulge(corners[i]!, corners[(i + 1) % corners.length]!, bulge);
    const sweep = arc.sweepDeg.div(DEG);
    const segment = arc.radiusMm.times(arc.radiusMm).times(sweep.minus(sweep.sin())).div(TWO);
    acc = arc.counterClockwise ? acc.plus(segment) : acc.minus(segment);
  }
  return acc;
}
