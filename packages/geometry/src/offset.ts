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
  segmentsProperlyIntersect,
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
  /**
   * Edges whose setback the footprint meets without any of its own line being
   * drawn: swallowed by their neighbours' setbacks, each one verified by its
   * distance to the footprint. Optional so a footprint built without offsetting
   * (the plot itself) still fits the type; read absent as none.
   */
  readonly dropped?: readonly number[];
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
  // Inside the plot where rounding alone would put it a millimetre out — see `snapInside`.
  const snap = ({ x, y }: Xy): Pt => snapInside(ring, x, y);
  const straight = arcs.length === 0 ? straightCorners(ring, curves, ring.map((_, i) => bySeq.get(i)!)) : undefined;
  const offsetRing: Pt[] =
    straight !== undefined
      ? straight.corners
      : ring.map((p, i) => snap(meet(curves[(i - 1 + n) % n]!, curves[i]!, p)));

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
    dropped: straight?.dropped ?? [],
  };
}

/*
  A SHORT BOUNDARY CAN VANISH UNDER ITS NEIGHBOURS' SETBACKS, AND THAT IS NOT
  AN OVER-CONSUMED PLOT.

  Plot 6468096 has two corners cut off by chamfers of 5.09 and 6.48 m. Set the
  street side back 6 m and the side boundary 4.5 m, and the chamfer's own 4.5 m
  line passes outside the corner the other two make: every point that keeps
  6 m from the street and 4.5 m from the side is already more than 4.5 m from
  the chamfer. Its offset "segment" then runs backwards between its neighbours'
  lines, the ring crosses itself, and the gate below refused a 4,466 m² plot
  as having no buildable footprint at all — on the plot whose drawings the
  client sent us as the reference.

  So a straight boundary whose offset runs backwards is dropped, its two
  neighbours meet directly, and the corners are recomputed — one boundary at a
  time, the most reversed first, since dropping one changes its neighbours'
  lengths. Dropping is a claim that the boundary's setback is REDUNDANT, so it
  is checked rather than trusted: every corner left must stand inside every
  shifted line, the dropped ones included. If one does not, the plot really is
  over-consumed and is refused as before. Neighbours that end up parallel, or
  fewer than three boundaries left, are the same refusal.

  THE CHECK IS AGAINST THE BOUNDARY AS DRAWN, NOT AGAINST ITS LINE CARRIED ON
  FOREVER — and on a plot that turns inward anywhere, those are different
  claims.

  DDA plot 5134565 prints six surveyed corners (1,040.04 m², Saih Shuaib 1).
  Two of its legs are a jog: 0.42 m long, then a 33.15 m side that turns 2.08°
  INWARD from it. Set every boundary back 1 m and the jog's offset runs
  backwards, so it is dropped, correctly — every point 1 m from its neighbours
  is already more than 1 m from it. But the jog's supporting line, carried on
  past the inward corner, crosses INTO the plot and is 1.2 m inside the long
  side by its far end. The old check demanded every corner stand behind that
  line, found the far corner of the long side did not, and refused a 28 × 33 m
  plot as having no footprint at any setback, whatever its boundaries were
  called. An L-shaped plot losing a short edge failed the same way, because
  the line of one wing runs through the other.

  A setback is a distance from a boundary. So a corner left standing is checked
  against every boundary it must clear, dropped or kept, by its distance to
  that boundary's own segment: from each footprint edge to each boundary, the
  nearest approach of two segments. That is the claim "redundant" makes, and
  it is still checked, not assumed. Everything the line test accepted is still
  accepted, because a point behind a line is at least as far from any piece of
  it; what is newly accepted is only what the line test refused by measuring
  from a stretch of line no boundary occupies.
*/
function straightCorners(
  ring: Ring,
  curves: readonly OffsetCurve[],
  insetsMm: readonly number[],
): { readonly corners: Pt[]; readonly dropped: readonly number[] } {
  const lines = curves.map((c) => (c as { line: Line }).line);
  const n = ring.length;
  const steps = unequalSteps(ring, insetsMm);
  /*
    Where a short boundary asks for LESS than the long one it continues, the
    long one's setback line is carried across it and the short one is dropped —
    claimed redundant, and verified below like every other drop. That is the
    conservative reading (a 0.42 m jog at 0 m beside a side at 3 m is held at
    3 m), never the generous one. Where the short one asks for MORE, carrying
    the long one's line would build inside the short one's setback, and carrying
    the short one's would hold the whole side at its figure: the second is the
    126 m² case, and is refused before anything is drawn.
  */
  const preDropped = new Set<number>();
  for (const step of steps) {
    if (insetsMm[step.shorter]! < insetsMm[step.longer]!) preDropped.add(step.shorter);
    else if (step.pastLonger) throw stepError(ring, step);
  }
  /*
    The steps not resolved by a drop. If the loop below fails with one of them
    standing, that sentence is said instead of "over-consumed": it names the two
    boundaries and what to do, where the other names nothing. A plot whose
    setbacks really do consume it says so on the next run, once the step is gone.
  */
  const unresolved = steps.filter((s) => !preDropped.has(s.shorter));
  const overConsumed = (detail: Record<string, unknown>): DegenerateGeometryError =>
    unresolved.length > 0
      ? stepError(ring, unresolved[0]!)
      : new DegenerateGeometryError(
          'the setbacks over-consume the plot: the offset boundary self-intersects. ' +
            'No buildable footprint exists at these setback values.',
          detail,
        );
  let live = ring.map((_, i) => i).filter((i) => !preDropped.has(i));
  for (;;) {
    if (live.length < 3) throw overConsumed({ boundariesLeft: live.length });
    const corners = live.map((e, k) => {
      const prev = live[(k - 1 + live.length) % live.length]!;
      try {
        return intersectLines(lines[prev]!, lines[e]!);
      } catch {
        throw overConsumed({ parallelBoundaries: [prev, e] });
      }
    });
    // How far each boundary's offset runs along its own direction; negative is backwards.
    let worst = -1;
    let worstAlong = new Decimal(0);
    live.forEach((e, k) => {
      const p = ring[e]!;
      const q = ring[(e + 1) % n]!;
      const from = corners[k]!;
      const to = corners[(k + 1) % live.length]!;
      const along = to.x.minus(from.x).times(q.x - p.x).plus(to.y.minus(from.y).times(q.y - p.y));
      if (along.lt(worstAlong)) {
        worst = k;
        worstAlong = along;
      }
    });
    if (worst < 0) {
      const pts = corners.map((c) => snapInside(ring, c.x, c.y));
      const dropped = ring.map((_, i) => i).filter((i) => !live.includes(i));
      if (dropped.length > 0) {
        const breach = setbackBreach(ring, insetsMm, pts);
        if (breach !== undefined) throw overConsumed({ dropped, ...breach });
      }
      return { corners: pts, dropped };
    }
    live = live.filter((_, k) => k !== worst);
  }
}

/*
  TWO BOUNDARIES THAT MEET ALMOST IN LINE, SET BACK BY DIFFERENT DISTANCES,
  HAVE NO CORNER TO DRAW — AND THE KERNEL SAYS SO RATHER THAN DRAW ONE.

  A corner of the setback line is where two shifted lines cross. Where the two
  boundaries turn sharply, that crossing is near the corner they share. Where
  they run almost straight on, it is not: lines 2.08° apart, shifted 0 m and
  3 m, cross 83 m away. On DDA 5134565 — a surveyed jog of 0.42 m beside a 33.15 m
  side, and a 6.36 m leg 1.8° off a 27.76 m one — that put the "corner" past
  the far end of the long side. What followed was either a refusal that blamed
  the setbacks for consuming a 1,040 m² plot, or, worse, a footprint that kept
  the short leg's line and ran it the whole length of the long side: every
  setback satisfied, and 126 m² of permitted footprint silently gone.

  What the setback line does at such a point is a question about the drawing,
  not about geometry: does it step square at the corner, or does the larger
  setback wrap around it? That is the client's to answer, so neither is drawn.
  `straightCorners` takes the one reading that needs no answer — a short
  boundary asking for less is held to its long neighbour's line, which only
  ever costs footprint — and refuses the rest in a sentence naming both edges.

  The test is scale-free, so it carries no tuning constant: the crossing falls
  past the far end of one of the two boundaries, and would not if both were set
  back by the larger figure. The second half is what keeps a short boundary
  that its neighbour's setback swallows whole on the ordinary path, where it is
  dropped and verified: there the crossing is far because the setbacks are
  large, not because they differ.
*/
interface UnequalStep {
  /** The two edges, in ring order, and the one each role falls to. */
  readonly a: number;
  readonly k: number;
  readonly shorter: number;
  readonly longer: number;
  /** Whether the crossing is past the far end of the LONGER edge. */
  readonly pastLonger: boolean;
  /** Where the two setback lines cross; null when they are parallel. */
  readonly crossing: Xy | null;
  readonly corner: Pt;
  readonly turnDeg: number;
  readonly insetsMm: readonly [number, number];
}

function unequalSteps(ring: Ring, insetsMm: readonly number[]): UnequalStep[] {
  const n = ring.length;
  const out: UnequalStep[] = [];
  for (let k = 0; k < n; k++) {
    const a = (k - 1 + n) % n;
    const dA = insetsMm[a]!;
    const dB = insetsMm[k]!;
    if (dA === dB) continue;
    const start = ring[a]!;
    const corner = ring[k]!;
    const end = ring[(k + 1) % n]!;
    const lengthA2 = lengthSquaredOf(start, corner);
    const lengthB2 = lengthSquaredOf(corner, end);
    /** Where the crossing falls: past A's start, past B's end, or near the corner. */
    const crossingOf = (insetA: number, insetB: number): { at: Xy | null; pastA: boolean; pastB: boolean } => {
      const lineA = inwardShiftedLine(start, corner, insetA);
      const lineB = inwardShiftedLine(corner, end, insetB);
      const det = lineA.a.times(lineB.b).minus(lineB.a.times(lineA.b));
      // Parallel: the crossing is at infinity, past every end there is.
      if (det.abs().lt('1e-12')) return { at: null, pastA: true, pastB: true };
      const m = intersectLines(lineA, lineB);
      const dx = m.x.minus(corner.x);
      const dy = m.y.minus(corner.y);
      // Projections scaled by each edge's length, compared with its length squared.
      const towardA = dx.times(start.x - corner.x).plus(dy.times(start.y - corner.y));
      const towardB = dx.times(end.x - corner.x).plus(dy.times(end.y - corner.y));
      return { at: m, pastA: towardA.gt(lengthA2), pastB: towardB.gt(lengthB2) };
    };
    const larger = Math.max(dA, dB);
    const even = crossingOf(larger, larger);
    if (even.pastA || even.pastB) continue;
    const actual = crossingOf(dA, dB);
    if (!actual.pastA && !actual.pastB) continue;
    const longerIsA = lengthA2.gte(lengthB2);
    const ux = new Decimal(corner.x - start.x);
    const uy = new Decimal(corner.y - start.y);
    const vx = new Decimal(end.x - corner.x);
    const vy = new Decimal(end.y - corner.y);
    const turnDeg = Math.abs(
      (Math.atan2(ux.times(vy).minus(uy.times(vx)).toNumber(), ux.times(vx).plus(uy.times(vy)).toNumber()) * 180) /
        Math.PI,
    );
    out.push({
      a,
      k,
      shorter: longerIsA ? k : a,
      longer: longerIsA ? a : k,
      pastLonger: longerIsA ? actual.pastA : actual.pastB,
      crossing: actual.at,
      corner,
      turnDeg,
      insetsMm: [dA, dB],
    });
  }
  return out;
}

/**
 * The refusal for an unequal step: both boundaries, both figures, and what to do.
 *
 * Each boundary is named by its length, not its number. The kernel numbers the
 * ring it was given, and the plot's own numbering is the reader's: a ring the
 * reader walked clockwise is stored reversed, so "edge 3" here would be the
 * reader's edge 1. A length is the same on both sides of that, and it is what
 * the plot step prints beside every boundary.
 */
function stepError(ring: Ring, step: UnequalStep): DegenerateGeometryError {
  const metres = (mm: number): string => new Decimal(mm).div(1000).toString();
  const n = ring.length;
  const lengthM = (e: number): string => lengthSquaredOf(ring[e]!, ring[(e + 1) % n]!).sqrt().div(1000).toFixed(2);
  const away =
    step.crossing === null
      ? 'never meet'
      : `meet ${step.crossing.x
          .minus(step.corner.x)
          .pow(2)
          .plus(step.crossing.y.minus(step.corner.y).pow(2))
          .sqrt()
          .div(1000)
          .toFixed(1)} m away`;
  const [dA, dB] = step.insetsMm;
  return new DegenerateGeometryError(
    `Two boundaries meet almost in line, turning ${step.turnDeg.toFixed(1)}°, but are set back by different ` +
      `distances: the ${lengthM(step.a)} m boundary by ${metres(dA)} m and the ${lengthM(step.k)} m boundary by ` +
      `${metres(dB)} m. Their setback lines ${away}, so there is no corner to draw where the two meet. How a ` +
      `setback line steps between two figures along one side is not modelled. Give both boundaries the same ` +
      `setback: they read as one side of the plot.`,
    { ringEdges: [step.a, step.k], turnDeg: Number(step.turnDeg.toFixed(2)), insetsMm: [dA, dB] },
  );
}

function lengthSquaredOf(p: Pt, q: Pt): Decimal {
  const dx = new Decimal(q.x - p.x);
  const dy = new Decimal(q.y - p.y);
  return dx.times(dx).plus(dy.times(dy));
}

/**
 * How far outside a constraint a snapped vertex may sit and still be inside it.
 *
 * Every vertex tested here lies exactly on two of these constraints by
 * construction and was rounded to the millimetre to become an integer point; a
 * millimetre of that is rounding and the second is the constraint's own.
 */
const CONSTRAINT_SLACK_MM = 2;

/**
 * A corner, on the millimetre grid, and inside the plot.
 *
 * A ZERO SETBACK PUTS A CORNER ON THE BOUNDARY, AND ROUNDING CAN PUT IT JUST
 * OFF IT. DBC Table B.1 sets back 0 m from a road at every height, so the corner
 * where a road edge meets a neighbour's lies exactly on the plot's own line, and
 * on an oblique edge rounding it to the nearest millimetre lands it up to 0.71 mm
 * outside. The containment gate then refused a skewed plot as "non-convex",
 * which it is not. So a corner that rounds outside the plot takes the nearest
 * grid point within a millimetre that is inside it. A corner that rounds inside
 * — every corner with a non-zero setback on both sides — is untouched. On the
 * straight path a corner outside the plot was always refused, so no footprint it
 * produced before moves by a millimetre; on a curved one the same holds for every
 * vertex the trim keeps. The same applies to a curved road set back by zero,
 * whose offset is the curve itself.
 */
function snapInside(ring: Ring, x: Decimal, y: Decimal): Pt {
  const rounded: Pt = {
    x: asMm(x.toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN).toNumber()) as Mm,
    y: asMm(y.toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN).toNumber()) as Mm,
  };
  if (containsPoint(ring, rounded)) return rounded;
  let best: Pt | undefined;
  let bestD = Infinity;
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      const c: Pt = { x: asMm(rounded.x + dx) as Mm, y: asMm(rounded.y + dy) as Mm };
      if (!containsPoint(ring, c)) continue;
      const d = x.minus(c.x).pow(2).plus(y.minus(c.y).pow(2)).toNumber();
      if (d < bestD) {
        best = c;
        bestD = d;
      }
    }
  }
  // None within a millimetre: not rounding. The containment gate refuses it.
  return best ?? rounded;
}

/**
 * The first boundary a footprint comes nearer to than its own setback, if any.
 *
 * Distance is measured to the boundary's segment — the piece of line the
 * survey drew — and the footprint is taken as its edges, so the nearest
 * approach is found whether it falls at a footprint corner or at a boundary
 * corner. Exact decimal throughout: the coordinates are integer millimetres
 * and only the final comparison involves a square, which is compared squared.
 */
function setbackBreach(
  ring: Ring,
  insetsMm: readonly number[],
  footprint: readonly Pt[],
): { boundary: number; insetMm: number; distanceMm: string } | undefined {
  const n = ring.length;
  const m = footprint.length;
  for (let i = 0; i < n; i++) {
    const need = insetsMm[i]! - CONSTRAINT_SLACK_MM;
    if (need <= 0) continue;
    const a = ring[i]!;
    const b = ring[(i + 1) % n]!;
    let nearest2: Decimal | undefined;
    for (let j = 0; j < m; j++) {
      const d2 = segmentGap2(footprint[j]!, footprint[(j + 1) % m]!, a, b);
      if (nearest2 === undefined || d2.lt(nearest2)) nearest2 = d2;
    }
    if (nearest2 !== undefined && nearest2.lt(new Decimal(need).pow(2))) {
      return { boundary: i, insetMm: insetsMm[i]!, distanceMm: nearest2.sqrt().toFixed(1) };
    }
  }
  return undefined;
}

/** Squared nearest approach of two closed segments; zero where they meet. */
function segmentGap2(p1: Pt, p2: Pt, q1: Pt, q2: Pt): Decimal {
  if (segmentsProperlyIntersect(p1, p2, q1, q2)) return new Decimal(0);
  return Decimal.min(
    pointSegment2(p1, q1, q2),
    pointSegment2(p2, q1, q2),
    pointSegment2(q1, p1, p2),
    pointSegment2(q2, p1, p2),
  );
}

/** Squared distance from `p` to the closed segment `a`–`b`. */
function pointSegment2(p: Pt, a: Pt, b: Pt): Decimal {
  const dx = new Decimal(b.x - a.x);
  const dy = new Decimal(b.y - a.y);
  const px = new Decimal(p.x - a.x);
  const py = new Decimal(p.y - a.y);
  const len2 = dx.times(dx).plus(dy.times(dy));
  let t = len2.isZero() ? new Decimal(0) : px.times(dx).plus(py.times(dy)).div(len2);
  if (t.lt(0)) t = new Decimal(0);
  if (t.gt(1)) t = new Decimal(1);
  const ex = px.minus(dx.times(t));
  const ey = py.minus(dy.times(t));
  return ex.times(ex).plus(ey.times(ey));
}

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
