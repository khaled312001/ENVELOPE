/**
 * Per-edge inward offset — the operation the whole product rests on.
 *
 * PRD deck slide 05 makes the argument better than the PRD does: a compliance
 * checker asks "is this setback at least 5.25 m?" and needs a drawing; this asks
 * "offset every boundary inward by 5.25 m" and needs only a plot. That is the
 * difference between checking and generating, and this file is where it happens.
 *
 * **Why not Clipper's own offset.** `offsetToPaths` applies one delta to every
 * edge. Real setbacks differ per edge — a road frontage and a party boundary are
 * not the same number, and PRD `FR-PLT-002` requires "per-edge setback offsets".
 * So the supporting line of each edge is shifted independently and consecutive
 * shifted lines are intersected to rebuild the ring. Clipper is still used
 * afterwards, to intersect the result with the plot and to provide the
 * independent area check.
 *
 * **Where approximation enters.** For an axis-parallel edge the shifted line
 * stays on the integer grid and the result is exact. For an oblique edge the
 * inward normal involves a square root, so the shift is computed in 28-digit
 * `Decimal` and the resulting vertex is snapped once to the declared 1 mm grid.
 * That is the single approximation in the kernel and it is bounded by the
 * tolerance the policy declares — see `packages/core/src/numeric.ts`.
 *
 * ---------------------------------------------------------------------------
 * **A CURVED BOUNDARY IS OFFSET AS AN ARC, AND IT HAS TO BE.**
 *
 * The obvious implementation is to let a curve arrive already broken into its
 * sixty-odd straight pieces and shift each piece's line like any other. It does
 * not work, and the reason is worth keeping because it is invisible until it
 * fails: two consecutive pieces of a 200 m arc meet at about 0.006 radians, and
 * the intersection of two lines that nearly parallel moves by `ε / sin φ` when
 * one of them moves by ε. The pieces sit on the millimetre grid, so ε is half a
 * millimetre and the offset vertex lands up to eighty millimetres from where it
 * belongs — far enough, along a run of sixty of them, to reorder the ring and
 * fail the self-intersection gate on a perfectly ordinary plot.
 *
 * Refining the tessellation makes it worse; coarsening it to where the
 * intersection is well conditioned needs about six degrees a piece, which on
 * that arc is a quarter of a metre off the true boundary.
 *
 * So the offset of a curve is the **concentric arc**, `r − inset`, computed from
 * the circle rather than from the polygon standing in for it. Each vertex
 * inside the run is pulled toward that circle's centre; each corner where one
 * boundary meets the next is a closed-form intersection of the two offset
 * shapes — line with line, line with circle, or circle with circle. Nothing is
 * ill-conditioned, because nothing intersects two nearly parallel lines.
 */

import {
  asMm,
  Decimal,
  DEGENERATE_MIN_DIMENSION_MM,
  DegenerateGeometryError,
  type Mm,
} from '@envelope/core';

import { intersect, verifiedArea } from './clipper.js';
import {
  area,
  signedArea2Shoelace,
  containsPoint,
  dropCollinear,
  isCounterClockwise,
  isSimple,
  type Pt,
  type Ring,
  toCounterClockwise,
} from './exact.js';

/** The inset to apply to one edge, keyed by its position in the ring. */
export interface EdgeInset {
  readonly seq: number;
  readonly insetMm: Mm;
}

/**
 * One curved boundary, as the circle it came from rather than the pieces it was
 * drawn as.
 *
 * `from` and `count` are the run of ring vertices the boundary occupies — the
 * same span `PlotEdge` carries — so the offset knows which of its edges belong
 * to one arc and must not be treated as independent lines.
 */
export interface BoundaryArc {
  readonly from: number;
  readonly count: number;
  readonly centreX: Decimal;
  readonly centreY: Decimal;
  readonly radiusMm: Decimal;
}

export interface OffsetResult {
  readonly ring: Ring;
  readonly areaMm2: number;
  /** True when every edge was axis-parallel, so no snapping was needed. */
  readonly exact: boolean;
}

/** A line `a·x + b·y = c`, coefficients carried in exact decimal. */
interface Line {
  readonly a: Decimal;
  readonly b: Decimal;
  readonly c: Decimal;
}

/**
 * Supporting line of the edge `p → q`, shifted inward by `inset`.
 *
 * The ring is counter-clockwise, so the interior lies to the *left* of the
 * direction of travel and the inward normal of `(dx, dy)` is `(-dy, dx)`.
 */
function inwardShiftedLine(p: Pt, q: Pt, insetMm: number): Line {
  const dx = new Decimal(q.x - p.x);
  const dy = new Decimal(q.y - p.y);
  const len = dx.times(dx).plus(dy.times(dy)).sqrt();
  if (len.isZero()) {
    throw new DegenerateGeometryError('zero-length edge cannot be offset', { p, q });
  }
  // Unit inward normal.
  const a = dy.negated().div(len);
  const b = dx.div(len);
  const c = a.times(p.x).plus(b.times(p.y)).plus(insetMm);
  return { a, b, c };
}

function intersectLines(l1: Line, l2: Line): { x: Decimal; y: Decimal } {
  const det = l1.a.times(l2.b).minus(l2.a.times(l1.b));
  if (det.abs().lt('1e-12')) {
    throw new DegenerateGeometryError(
      'consecutive edges are parallel after offsetting; the corner has no intersection',
      { det: det.toString() },
    );
  }
  return {
    x: l1.c.times(l2.b).minus(l2.c.times(l1.b)).div(det),
    y: l1.a.times(l2.c).minus(l2.a.times(l1.c)).div(det),
  };
}

const isAxisParallel = (p: Pt, q: Pt): boolean => p.x === q.x || p.y === q.y;

/**
 * Offset every edge of `plot` inward by its own inset and return the resulting
 * footprint.
 *
 * Throws {@link DegenerateGeometryError} rather than returning a plausible wrong
 * answer when the insets over-consume the plot (PRD §14.3). That is the failure
 * mode that matters: an over-offset polygon self-intersects and still reports a
 * positive area, which would flow all the way to a capacity number.
 */
export function offsetPerEdge(
  plot: Ring,
  insets: readonly EdgeInset[],
  arcs: readonly BoundaryArc[] = [],
): OffsetResult {
  /*
    A CURVED PLOT IS TAKEN EXACTLY AS IT ARRIVES.

    `dropCollinear` and `toCounterClockwise` both renumber, and every arc's span
    is an index into the ring as given. Silently renumbering under them would
    offset the pieces of a curve by whichever boundary's setback ended up
    sharing their position — a footprint that is wrong in a way no gate below
    can see, because it is a perfectly good polygon. So the caller's ring is
    used as-is and anything that would have been changed is refused by name.
  */
  if (arcs.length > 0) {
    if (dropCollinear(plot).length !== plot.length || !isCounterClockwise(plot)) {
      throw new DegenerateGeometryError(
        'a plot with a curved boundary must be offset on the ring exactly as it was built: counter-clockwise, with no collinear vertices',
        { vertices: plot.length },
      );
    }
  }
  const ring = arcs.length > 0 ? plot : toCounterClockwise(dropCollinear(plot));
  const n = ring.length;
  if (n < 3) {
    throw new DegenerateGeometryError('a plot needs at least three distinct vertices', { n });
  }
  if (insets.length !== n) {
    throw new DegenerateGeometryError(
      `every edge needs its own inset — FR-PLT-001 AC3 forbids a default. ` +
        `Got ${insets.length} insets for ${n} edges.`,
      { edges: n, insets: insets.length },
    );
  }

  const bySeq = new Map(insets.map((i) => [i.seq, i.insetMm]));
  /** Which arc, if any, each ring edge belongs to. */
  const arcOf = new Array<BoundaryArc | undefined>(n);
  for (const arc of arcs) {
    for (let k = 0; k < arc.count; k += 1) arcOf[(arc.from + k) % n] = arc;
  }

  const curves: OffsetCurve[] = [];
  let allAxisParallel = true;

  for (let i = 0; i < n; i++) {
    const p = ring[i]!;
    const q = ring[(i + 1) % n]!;
    const inset = bySeq.get(i);
    if (inset === undefined) {
      throw new DegenerateGeometryError(`no inset supplied for edge ${i}`, { seq: i });
    }
    if (inset < 0) {
      throw new RangeError(`inset for edge ${i} is negative; setbacks are inward`);
    }
    const arc = arcOf[i];
    if (arc === undefined) {
      if (!isAxisParallel(p, q)) allAxisParallel = false;
      curves.push({ kind: 'line', line: inwardShiftedLine(p, q, inset) });
      continue;
    }
    allAxisParallel = false;
    /*
      Inward is toward the centre. Phase 0 refuses a boundary that bows INTO the
      plot — it makes the plot re-entrant and §14.1 has always refused those — so
      the centre is on the interior side and a smaller circle is the setback.
    */
    const radius = arc.radiusMm.minus(inset);
    if (radius.lte(0)) {
      throw new DegenerateGeometryError(
        `a setback of ${inset} mm consumes a curved boundary of radius ${arc.radiusMm.toFixed(0)} mm entirely`,
        { seq: i, insetMm: inset },
      );
    }
    curves.push({ kind: 'arc', cx: arc.centreX, cy: arc.centreY, r: radius });
  }

  // Vertex i of the offset ring is where the offset shapes of edges i-1 and i
  // meet — and, where both are the same arc, the point on it nearest vertex i.
  const offsetRing: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const { x, y } = meet(curves[(i - 1 + n) % n]!, curves[i]!, ring[i]!);
    offsetRing.push({
      x: asMm(x.toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN).toNumber()) as Mm,
      y: asMm(y.toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN).toNumber()) as Mm,
    });
  }

  /*
    A CURVE'S OFFSET HAS TO BE TRIMMED, AND A LINE'S DOES NOT.

    Two shifted lines meeting at a corner define it and there is nothing beyond
    it to discard. A shifted ARC keeps going: the pieces of it near a corner sit
    on the far side of the neighbour's own setback, and left in they send the
    ring backwards and trip the self-intersection gate below — on a plot that
    has a perfectly good footprint.

    Phase 0 is convex, so the footprint is the intersection of convex sets: the
    inward side of every shifted line and the inside of every concentric circle.
    A vertex that fails one of those is not in the footprint, whichever boundary
    produced it. Two millimetres of slack, because every vertex here lies ON at
    least two of these constraints and was snapped to the grid to get here.

    Only for a curved plot. The straight path is untouched, deliberately: it is
    the one the whole product has been resting on.
  */
  const trimmed =
    arcs.length === 0 ? offsetRing : offsetRing.filter((p) => insideAll(p, curves));
  if (trimmed.length < 3) {
    throw new DegenerateGeometryError(
      'the setbacks over-consume the plot: nothing is left of the boundary once every one of them is applied. ' +
        'No buildable footprint exists at these setback values.',
      { kept: trimmed.length, of: offsetRing.length },
    );
  }

  const cleaned = dropCollinear(trimmed);

  // --- Degeneracy gates. Each of these is a real failure the PRD names. ---

  if (!isSimple(cleaned)) {
    throw new DegenerateGeometryError(
      'the setbacks over-consume the plot: the offset boundary self-intersects. ' +
        'No buildable footprint exists at these setback values.',
      { insets: insets.map((i) => ({ seq: i.seq, insetMm: i.insetMm })) },
    );
  }

  // Orientation must survive the offset. `ring` was normalised to
  // counter-clockwise, so a non-positive signed area here means the boundary has
  // passed through itself and turned inside out.
  //
  // This is the failure this whole gate exists for, and it is quieter than the
  // self-intersection case: over-offsetting a convex plot produces a perfectly
  // simple, positive-area, fully-contained rectangle wound the wrong way. Every
  // unsigned check passes it. On an 80 × 40 m plot at a 25 m setback it yields a
  // confident 300 m² footprint where the honest answer is "none exists" — a
  // plausible number, wrong, silently, exactly as PRD §14.3 describes.
  const signedTwice = signedArea2Shoelace(cleaned);
  if (signedTwice <= 0) {
    throw new DegenerateGeometryError(
      'the setbacks over-consume the plot: the offset boundary inverted. ' +
        'No buildable footprint exists at these setback values.',
      {
        signedArea2: signedTwice,
        insets: insets.map((i) => ({ seq: i.seq, insetMm: i.insetMm })),
      },
    );
  }

  const { widthMm, depthMm } = extent(cleaned);
  if (widthMm < DEGENERATE_MIN_DIMENSION_MM || depthMm < DEGENERATE_MIN_DIMENSION_MM) {
    throw new DegenerateGeometryError(
      `the offset footprint is a sliver (${widthMm} × ${depthMm} mm). ` +
        `A dimension below ${DEGENERATE_MIN_DIMENSION_MM} mm is not a footprint.`,
      { widthMm, depthMm },
    );
  }

  // The offset ring must lie inside the plot. Vertices are checked exactly, then
  // Clipper intersects to guarantee it — INV-08 depends on this holding.
  if (!cleaned.every((p) => containsPoint(ring, p))) {
    throw new DegenerateGeometryError(
      'the offset footprint escaped the plot boundary — the plot is probably ' +
        'non-convex in a way Phase 0 does not support (PRD §14.1).',
    );
  }

  const pieces = intersect(ring, cleaned);
  if (pieces.length === 0) {
    throw new DegenerateGeometryError('offset footprint does not intersect the plot');
  }
  if (pieces.length > 1) {
    throw new DegenerateGeometryError(
      `the setbacks split the plot into ${pieces.length} disconnected pieces. ` +
        `Phase 0 does not choose between them — that is a design decision, not a ` +
        `geometric one.`,
      { pieces: pieces.length },
    );
  }

  const finalRing = dropCollinear(pieces[0]!);
  return {
    ring: finalRing,
    areaMm2: verifiedArea(finalRing, 'setback-permitted footprint'),
    exact: allAxisParallel,
  };
}

/**
 * How far outside a constraint a snapped vertex may sit and still be inside it.
 *
 * Every vertex tested here lies exactly on two of these constraints by
 * construction and was rounded to the millimetre to become an integer point; a
 * millimetre of that is rounding and the second is the constraint's own.
 */
const CONSTRAINT_SLACK_MM = 2;

/** Whether a point is inside every shifted line and every concentric circle. */
function insideAll(p: Pt, curves: readonly OffsetCurve[]): boolean {
  return curves.every((curve) => {
    if (curve.kind === 'line') {
      const reach = curve.line.a.times(p.x).plus(curve.line.b.times(p.y));
      return reach.gte(curve.line.c.minus(CONSTRAINT_SLACK_MM));
    }
    const dx = new Decimal(p.x).minus(curve.cx);
    const dy = new Decimal(p.y).minus(curve.cy);
    return dx.times(dx).plus(dy.times(dy)).sqrt().lte(curve.r.plus(CONSTRAINT_SLACK_MM));
  });
}

/** A boundary's offset: a shifted supporting line, or a concentric circle. */
type OffsetCurve =
  | { readonly kind: 'line'; readonly line: Line }
  | { readonly kind: 'arc'; readonly cx: Decimal; readonly cy: Decimal; readonly r: Decimal };

interface Xy {
  readonly x: Decimal;
  readonly y: Decimal;
}

/**
 * Where two offset shapes meet, taking the branch nearest the vertex they came
 * from.
 *
 * Two circles and a circle and a line each meet twice; choosing by proximity to
 * the corner being offset is both the right root and the one that stays right
 * under rounding, which choosing by a sign convention would not.
 */
function meet(prev: OffsetCurve, cur: OffsetCurve, near: Pt): Xy {
  if (prev.kind === 'line' && cur.kind === 'line') return intersectLines(prev.line, cur.line);
  if (prev.kind === 'arc' && cur.kind === 'arc') {
    // The same arc on both sides: this vertex is inside the run, and the offset
    // point is simply it, pulled to the concentric circle.
    if (prev.cx.eq(cur.cx) && prev.cy.eq(cur.cy) && prev.r.eq(cur.r)) return onCircle(cur, near);
    return nearer(circleCircle(prev, cur), near);
  }
  const line = prev.kind === 'line' ? prev.line : (cur as { line: Line }).line;
  const arc = prev.kind === 'arc' ? prev : (cur as { cx: Decimal; cy: Decimal; r: Decimal });
  return nearer(circleLine(arc, line), near);
}

/** The point of a circle on the ray from its centre through `p`. */
function onCircle(arc: { cx: Decimal; cy: Decimal; r: Decimal }, p: Pt): Xy {
  const dx = new Decimal(p.x).minus(arc.cx);
  const dy = new Decimal(p.y).minus(arc.cy);
  const len = dx.times(dx).plus(dy.times(dy)).sqrt();
  if (len.isZero()) {
    throw new DegenerateGeometryError('a curved boundary passing through its own centre', { p });
  }
  return { x: arc.cx.plus(dx.div(len).times(arc.r)), y: arc.cy.plus(dy.div(len).times(arc.r)) };
}

/** Both intersections of a circle with a line whose `(a, b)` is a unit normal. */
function circleLine(
  arc: { cx: Decimal; cy: Decimal; r: Decimal },
  line: Line,
): readonly [Xy, Xy] {
  // Signed distance from the centre to the line, the normal being unit length.
  const gap = line.c.minus(line.a.times(arc.cx)).minus(line.b.times(arc.cy));
  const halfChord2 = arc.r.times(arc.r).minus(gap.times(gap));
  if (halfChord2.isNegative()) {
    throw new DegenerateGeometryError(
      'the setbacks over-consume the plot: a curved boundary and its neighbour no longer meet once both are set back. ' +
        'No buildable footprint exists at these setback values.',
      { radiusMm: arc.r.toFixed(0) },
    );
  }
  const h = halfChord2.sqrt();
  const foot = { x: arc.cx.plus(line.a.times(gap)), y: arc.cy.plus(line.b.times(gap)) };
  // Along the line, which is the normal turned a quarter turn.
  return [
    { x: foot.x.minus(line.b.times(h)), y: foot.y.plus(line.a.times(h)) },
    { x: foot.x.plus(line.b.times(h)), y: foot.y.minus(line.a.times(h)) },
  ];
}

/** Both intersections of two circles. */
function circleCircle(
  a: { cx: Decimal; cy: Decimal; r: Decimal },
  b: { cx: Decimal; cy: Decimal; r: Decimal },
): readonly [Xy, Xy] {
  const dx = b.cx.minus(a.cx);
  const dy = b.cy.minus(a.cy);
  const d = dx.times(dx).plus(dy.times(dy)).sqrt();
  const along = a.r.times(a.r).minus(b.r.times(b.r)).plus(d.times(d)).div(d.times(2));
  const h2 = a.r.times(a.r).minus(along.times(along));
  if (d.isZero() || h2.isNegative()) {
    throw new DegenerateGeometryError(
      'the setbacks over-consume the plot: two curved boundaries no longer meet once both are set back. ' +
        'No buildable footprint exists at these setback values.',
      { separationMm: d.toFixed(0) },
    );
  }
  const h = h2.sqrt();
  const mx = a.cx.plus(dx.div(d).times(along));
  const my = a.cy.plus(dy.div(d).times(along));
  return [
    { x: mx.minus(dy.div(d).times(h)), y: my.plus(dx.div(d).times(h)) },
    { x: mx.plus(dy.div(d).times(h)), y: my.minus(dx.div(d).times(h)) },
  ];
}

function nearer(pair: readonly [Xy, Xy], p: Pt): Xy {
  const d2 = (c: Xy): Decimal => {
    const dx = c.x.minus(p.x);
    const dy = c.y.minus(p.y);
    return dx.times(dx).plus(dy.times(dy));
  };
  return d2(pair[0]).lte(d2(pair[1])) ? pair[0] : pair[1];
}

/** Axis-aligned extent of a ring, in millimetres. */
export function extent(ring: Ring): {
  minX: Mm;
  minY: Mm;
  maxX: Mm;
  maxY: Mm;
  widthMm: Mm;
  depthMm: Mm;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of ring) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    minX: asMm(minX),
    minY: asMm(minY),
    maxX: asMm(maxX),
    maxY: asMm(maxY),
    widthMm: asMm(maxX - minX),
    depthMm: asMm(maxY - minY),
  };
}

/**
 * Scale a footprint about its centroid to hit a target area — how the tower
 * plate cap is applied once the podium footprint is known.
 *
 * Deliberately a similarity transform: it preserves the plate's proportions, so
 * an aspect ratio a rule constrains stays constrained. Anything cleverer is
 * massing, which is Phase 4.
 */
export function scaleToArea(ring: Ring, targetAreaMm2: number): Ring {
  const current = area(ring);
  if (targetAreaMm2 >= current) return ring;
  if (targetAreaMm2 <= 0) {
    throw new DegenerateGeometryError('target plate area must be positive', { targetAreaMm2 });
  }
  const factor = new Decimal(targetAreaMm2).div(current).sqrt();
  const cx = ring.reduce((s, p) => s + p.x, 0) / ring.length;
  const cy = ring.reduce((s, p) => s + p.y, 0) / ring.length;
  const scaled = ring.map((p) => ({
    x: asMm(
      new Decimal(p.x - cx)
        .times(factor)
        .plus(cx)
        .toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN)
        .toNumber(),
    ) as Mm,
    y: asMm(
      new Decimal(p.y - cy)
        .times(factor)
        .plus(cy)
        .toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN)
        .toNumber(),
    ) as Mm,
  }));
  if (!isSimple(scaled)) {
    throw new DegenerateGeometryError('scaling to the tower plate cap degenerated the footprint');
  }
  return scaled;
}
