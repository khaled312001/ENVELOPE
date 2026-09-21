/**
 * Plot analysis — the derived geometric properties PRD §10.2 puts on `PLOT`,
 * and the shape classification §14.1 requires be enforced "at the data layer,
 * not by convention".
 */

import { asMm, Decimal, type Mm, type Mm2, mm2ToM2, mmToM } from '@envelope/core';

import {
  area,
  isConvex,
  isRectilinear,
  isSimple,
  lengthSquared,
  type Pt,
  type Ring,
  toCounterClockwise,
} from './exact.js';
import { extent } from './offset.js';

export const ShapeClass = {
  RECTILINEAR: 'RECTILINEAR',
  SIMPLE_CONVEX: 'SIMPLE_CONVEX',
  COMPLEX: 'COMPLEX',
} as const;
export type ShapeClass = (typeof ShapeClass)[keyof typeof ShapeClass];

/**
 * Classify a ring.
 *
 * `COMPLEX` is not an error here — it is a fact about the plot. Rejecting it is
 * the caller's job, and §14.1 requires the rejection message to name the
 * restriction rather than fail obscurely.
 */
export function classifyShape(ring: Ring): ShapeClass {
  if (!isSimple(ring)) return ShapeClass.COMPLEX;
  if (isRectilinear(ring)) return ShapeClass.RECTILINEAR;
  if (isConvex(ring)) return ShapeClass.SIMPLE_CONVEX;
  return ShapeClass.COMPLEX;
}

/** Phase 0 supports these two. Anything else is refused with the reason named. */
export const PHASE_0_SHAPES: ReadonlySet<ShapeClass> = new Set([
  ShapeClass.RECTILINEAR,
  ShapeClass.SIMPLE_CONVEX,
]);

export class UnsupportedShapeError extends Error {
  override readonly name = 'UnsupportedShapeError';
  constructor(readonly shapeClass: ShapeClass) {
    super(
      `plot shape is ${shapeClass}. Phase 0 supports rectilinear and simple convex ` +
        `polygons only (PRD §14.1). Partitioning a non-convex polygon under ` +
        `simultaneous area, frontage, depth, aspect-ratio, façade-access and ` +
        `corridor-adjacency constraints is a research problem, deferred to Phase 4. ` +
        `This plot is not approximated — it is refused.`,
    );
  }
}

export function assertPhase0Shape(shapeClass: ShapeClass): void {
  if (!PHASE_0_SHAPES.has(shapeClass)) throw new UnsupportedShapeError(shapeClass);
}

/**
 * Minimum bounding rectangle by rotating calipers over every edge direction.
 *
 * Exact for the candidate selection — the winning orientation is chosen by
 * comparing integer-derived areas — with the final width and depth measured in
 * `Decimal` at the winning angle.
 */
export interface Mbr {
  readonly widthMm: Mm;
  readonly depthMm: Mm;
  readonly angleDeg: Decimal;
  readonly areaMm2: Mm2;
}

export function minimumBoundingRectangle(ring: Ring): Mbr {
  const hull = toCounterClockwise(ring);
  const n = hull.length;
  let best: Mbr | undefined;

  for (let i = 0; i < n; i++) {
    const p = hull[i]!;
    const q = hull[(i + 1) % n]!;
    const dx = new Decimal(q.x - p.x);
    const dy = new Decimal(q.y - p.y);
    const len = dx.times(dx).plus(dy.times(dy)).sqrt();
    if (len.isZero()) continue;
    const ux = dx.div(len);
    const uy = dy.div(len);

    let minU = new Decimal(Infinity);
    let maxU = new Decimal(-Infinity);
    let minV = new Decimal(Infinity);
    let maxV = new Decimal(-Infinity);
    for (const r of hull) {
      // Project onto the edge direction and its perpendicular.
      const u = ux.times(r.x).plus(uy.times(r.y));
      const v = uy.negated().times(r.x).plus(ux.times(r.y));
      if (u.lt(minU)) minU = u;
      if (u.gt(maxU)) maxU = u;
      if (v.lt(minV)) minV = v;
      if (v.gt(maxV)) maxV = v;
    }
    const w = maxU.minus(minU);
    const d = maxV.minus(minV);
    const a = w.times(d);
    if (!best || a.lt(new Decimal(best.areaMm2))) {
      const angle = Decimal.atan2(dy, dx).times(180).div(Decimal.acos(-1));
      best = {
        widthMm: asMm(w.toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN).toNumber()),
        depthMm: asMm(d.toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN).toNumber()),
        angleDeg: angle.toDecimalPlaces(4),
        areaMm2: a.toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN).toNumber() as Mm2,
      };
    }
  }

  if (!best) throw new Error('minimum bounding rectangle: ring has no non-degenerate edge');
  return best;
}

/**
 * Principal axis — the bearing of the longest edge direction of the MBR,
 * degrees clockwise from grid north.
 *
 * Used to orient a tower plate sensibly and to describe the plot in the report.
 */
export function principalAxisDeg(ring: Ring): Decimal {
  const mbr = minimumBoundingRectangle(ring);
  const along = mbr.widthMm >= mbr.depthMm ? mbr.angleDeg : mbr.angleDeg.plus(90);
  // Convert from maths convention (CCW from +x) to bearing (CW from north).
  const bearing = new Decimal(90).minus(along).mod(360);
  return bearing.isNegative() ? bearing.plus(360) : bearing;
}

/**
 * Convexity ratio — polygon area ÷ convex hull area. 1.0 for a convex plot.
 *
 * Reported rather than acted on in Phase 0: it is the number that tells a
 * reviewer how much the shape restriction is costing on this particular plot.
 */
export function convexityRatio(ring: Ring): Decimal {
  const hull = convexHull(ring);
  const hullArea = area(hull);
  if (hullArea === 0) return new Decimal(0);
  return new Decimal(area(ring)).div(hullArea);
}

/** Andrew's monotone chain. Exact — every comparison is an integer orientation. */
export function convexHull(ring: Ring): Ring {
  const pts = [...ring].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length < 3) return ring;

  const cross = (o: Pt, a: Pt, b: Pt): number =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: Pt[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

/** Bearing of an edge's outward normal, degrees clockwise from grid north. */
export function outwardBearingDeg(p: Pt, q: Pt): Decimal {
  // Ring is CCW, so the outward normal of (dx, dy) is (dy, -dx).
  const nx = new Decimal(q.y - p.y);
  const ny = new Decimal(p.x - q.x);
  const bearing = new Decimal(90).minus(Decimal.atan2(ny, nx).times(180).div(Decimal.acos(-1)));
  const wrapped = bearing.mod(360);
  return (wrapped.isNegative() ? wrapped.plus(360) : wrapped).toDecimalPlaces(2);
}

/** Edge length in metres, for the plot summary. */
export function edgeLengthM(p: Pt, q: Pt): Decimal {
  return mmToM(asMm(Math.round(Math.sqrt(lengthSquared(p, q)))));
}

/** Every derived property PRD §10.2 hangs off `PLOT`. */
export interface PlotGeometry {
  readonly shapeClass: ShapeClass;
  readonly areaMm2: Mm2;
  readonly areaM2: Decimal;
  readonly mbr: Mbr;
  readonly principalAxisDeg: Decimal;
  readonly convexityRatio: Decimal;
  readonly extent: ReturnType<typeof extent>;
}

export function analysePlot(ring: Ring): PlotGeometry {
  const ccw = toCounterClockwise(ring);
  const a = area(ccw);
  return {
    shapeClass: classifyShape(ccw),
    areaMm2: a,
    areaM2: mm2ToM2(a),
    mbr: minimumBoundingRectangle(ccw),
    principalAxisDeg: principalAxisDeg(ccw),
    convexityRatio: convexityRatio(ccw),
    extent: extent(ccw),
  };
}
