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
export function offsetPerEdge(plot: Ring, insets: readonly EdgeInset[]): OffsetResult {
  const ring = toCounterClockwise(dropCollinear(plot));
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
  const lines: Line[] = [];
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
    if (!isAxisParallel(p, q)) allAxisParallel = false;
    lines.push(inwardShiftedLine(p, q, inset));
  }

  // Vertex i of the offset ring is where the lines of edges i-1 and i meet.
  const offsetRing: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const prev = lines[(i - 1 + n) % n]!;
    const cur = lines[i]!;
    const { x, y } = intersectLines(prev, cur);
    offsetRing.push({
      x: asMm(x.toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN).toNumber()) as Mm,
      y: asMm(y.toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN).toNumber()) as Mm,
    });
  }

  const cleaned = dropCollinear(offsetRing);

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
