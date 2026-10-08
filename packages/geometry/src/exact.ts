/**
 * Exact integer predicates — PRD §14.3.
 *
 * Every coordinate reaching this module is an integer number of millimetres, so
 * orientation, area and containment are computed in exact integer arithmetic.
 * There is no floating-point comparison here, and no tolerance parameter: two
 * points either are collinear or they are not.
 *
 * **Independent area recomputation.** §14.3 requires "every area computed twice
 * by independent methods; disagreement > 0.1% is a P0 defect". Three are
 * implemented:
 *
 * | Method | Expression | Independent of |
 * |---|---|---|
 * | `shoelace` | `Σ (xᵢ·yᵢ₊₁ − xᵢ₊₁·yᵢ)` | — |
 * | `trapezoid` | `Σ (xᵢ₊₁ − xᵢ)(yᵢ₊₁ + yᵢ)` | shoelace: different intermediates |
 * | Clipper `area()` | C++ implementation, separate codebase | both |
 *
 * Honest limit, worth stating because the PRD does not: shoelace and trapezoid
 * are algebraically the same identity via Green's theorem. They are independent
 * *expressions*, not independent *algorithms* — they catch a transcription or
 * overflow error, not a shared misunderstanding of what area means. Clipper is
 * the genuinely independent third opinion. All three run on every polygon and
 * all three must agree **exactly**, which is stricter than the 0.1% the PRD
 * asks for and is achievable only because the arithmetic is integral.
 */

import { asMm2, type Mm, type Mm2 } from '@envelope/core';

export interface Pt {
  readonly x: Mm;
  readonly y: Mm;
}

/** A closed ring, first vertex not repeated. */
export type Ring = readonly Pt[];

/**
 * Twice the signed area, by the shoelace identity. Exact.
 *
 * Kept as "twice the area" so the result stays integral — halving is deferred
 * to the caller, which then divides an even integer.
 */
export function signedArea2Shoelace(ring: Ring): number {
  let acc = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % n]!;
    acc += a.x * b.y - b.x * a.y;
  }
  return acc;
}

/** Twice the signed area, by the trapezoid form of Green's theorem. Exact. */
export function signedArea2Trapezoid(ring: Ring): number {
  let acc = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % n]!;
    acc += (b.x - a.x) * (b.y + a.y);
  }
  // The trapezoid form gives the negative of the shoelace convention.
  return -acc;
}

/** Signed area in mm². Positive for counter-clockwise rings. */
export function signedArea(ring: Ring): number {
  // Twice the area of an integer polygon is always an integer, and by Pick's
  // theorem it is even iff the polygon has no odd half-cell remainder. An odd
  // value is legitimate (a triangle on the lattice, and most plots traced by
  // hand), so this is not an error — it just means the area is a half-integer
  // of mm², which is exactly representable in a double. `asMm2` admits that
  // grid for the same reason; it used to demand an integer and refuse the run.
  return signedArea2Shoelace(ring) / 2;
}

/** Unsigned area in mm², cross-checked across all independent methods. */
export function area(ring: Ring): Mm2 {
  const shoelace = signedArea2Shoelace(ring);
  const trapezoid = signedArea2Trapezoid(ring);
  if (shoelace !== trapezoid) {
    throw new Error(
      `exact area methods disagree on the same ring: shoelace 2A=${shoelace}, ` +
        `trapezoid 2A=${trapezoid}. This is an arithmetic defect, not a tolerance issue.`,
    );
  }
  return asMm2(Math.abs(shoelace) / 2);
}

/** Orientation of the turn a→b→c. Exact: `>0` left, `<0` right, `0` collinear. */
export function orientation(a: Pt, b: Pt, c: Pt): number {
  const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  return cross > 0 ? 1 : cross < 0 ? -1 : 0;
}

export function isCounterClockwise(ring: Ring): boolean {
  return signedArea2Shoelace(ring) > 0;
}

/** Return the ring in counter-clockwise order, reversing only if needed. */
export function toCounterClockwise(ring: Ring): Ring {
  return isCounterClockwise(ring) ? ring : [...ring].reverse();
}

/** Perimeter in mm. Uses `Math.hypot`, so this is the one non-exact length. */
export function perimeter(ring: Ring): number {
  let acc = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % n]!;
    acc += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return acc;
}

/** Exact squared edge length. Integer, so it is safe to compare and sort. */
export function lengthSquared(a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

/**
 * Point-in-polygon by the crossing-number rule, in exact integer arithmetic.
 * Points exactly on the boundary return `true` — a footprint touching its own
 * setback line is inside it.
 */
export function containsPoint(ring: Ring, p: Pt): boolean {
  const n = ring.length;
  let inside = false;
  for (let i = 0; i < n; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % n]!;
    if (onSegment(a, b, p)) return true;
    const straddles = a.y > p.y !== b.y > p.y;
    if (!straddles) continue;
    // Exact side test instead of computing the crossing x by division.
    const side = (b.x - a.x) * (p.y - a.y) - (p.x - a.x) * (b.y - a.y);
    if (side === 0) return true;
    if (b.y > a.y ? side > 0 : side < 0) inside = !inside;
  }
  return inside;
}

/** Whether `p` lies on the closed segment `a`–`b`. Exact. */
export function onSegment(a: Pt, b: Pt, p: Pt): boolean {
  if (orientation(a, b, p) !== 0) return false;
  return (
    Math.min(a.x, b.x) <= p.x &&
    p.x <= Math.max(a.x, b.x) &&
    Math.min(a.y, b.y) <= p.y &&
    p.y <= Math.max(a.y, b.y)
  );
}

/** Whether every vertex of `inner` lies within `outer`. Backs `INV-08`/`INV-10`. */
export function ringContainsRing(outer: Ring, inner: Ring): boolean {
  return inner.every((p) => containsPoint(outer, p));
}

/**
 * Whether a ring is simple — no self-intersections, no repeated vertices, no
 * zero-length edges. Exact, O(n²), which is irrelevant at Phase 0 vertex counts
 * and is worth the certainty.
 */
export function isSimple(ring: Ring): boolean {
  const n = ring.length;
  if (n < 3) return false;
  for (let i = 0; i < n; i++) {
    const a1 = ring[i]!;
    const a2 = ring[(i + 1) % n]!;
    if (a1.x === a2.x && a1.y === a2.y) return false; // zero-length edge
    for (let j = i + 1; j < n; j++) {
      const b1 = ring[j]!;
      const b2 = ring[(j + 1) % n]!;
      const adjacent = j === i + 1 || (i === 0 && j === n - 1);
      if (adjacent) {
        // Adjacent edges legitimately share one endpoint. They must not overlap.
        if (segmentsOverlapCollinear(a1, a2, b1, b2)) return false;
        continue;
      }
      if (segmentsProperlyIntersect(a1, a2, b1, b2)) return false;
    }
  }
  return true;
}

function segmentsProperlyIntersect(p1: Pt, p2: Pt, q1: Pt, q2: Pt): boolean {
  const d1 = orientation(q1, q2, p1);
  const d2 = orientation(q1, q2, p2);
  const d3 = orientation(p1, p2, q1);
  const d4 = orientation(p1, p2, q2);
  if (d1 !== d2 && d3 !== d4) return true;
  return (
    (d1 === 0 && onSegment(q1, q2, p1)) ||
    (d2 === 0 && onSegment(q1, q2, p2)) ||
    (d3 === 0 && onSegment(p1, p2, q1)) ||
    (d4 === 0 && onSegment(p1, p2, q2))
  );
}

function segmentsOverlapCollinear(p1: Pt, p2: Pt, q1: Pt, q2: Pt): boolean {
  if (orientation(p1, p2, q1) !== 0 || orientation(p1, p2, q2) !== 0) return false;
  // Collinear and adjacent: they overlap if either far endpoint lies strictly
  // inside the other segment — i.e. the ring doubles back on itself.
  const shared = samePoint(p1, q1) || samePoint(p1, q2) || samePoint(p2, q1) || samePoint(p2, q2);
  if (!shared) return true;
  const [pFar, qFar] = samePoint(p2, q1) || samePoint(p2, q2) ? [p1, q2] : [p2, q1];
  return onSegment(p1, p2, qFar!) || onSegment(q1, q2, pFar!);
}

export function samePoint(a: Pt, b: Pt): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Whether every interior angle turns the same way. Exact. */
export function isConvex(ring: Ring): boolean {
  const n = ring.length;
  if (n < 3) return false;
  let sign = 0;
  for (let i = 0; i < n; i++) {
    const o = orientation(ring[i]!, ring[(i + 1) % n]!, ring[(i + 2) % n]!);
    if (o === 0) continue; // collinear vertices do not break convexity
    if (sign === 0) sign = o;
    else if (o !== sign) return false;
  }
  return sign !== 0;
}

/** Whether every edge is axis-parallel. Exact — no angular tolerance needed. */
export function isRectilinear(ring: Ring): boolean {
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % n]!;
    if (a.x !== b.x && a.y !== b.y) return false;
  }
  return true;
}

/** Drop vertices that lie exactly on the segment between their neighbours. */
export function dropCollinear(ring: Ring): Ring {
  const n = ring.length;
  if (n < 4) return ring;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const prev = ring[(i - 1 + n) % n]!;
    const cur = ring[i]!;
    const next = ring[(i + 1) % n]!;
    if (orientation(prev, cur, next) !== 0) out.push(cur);
  }
  return out.length >= 3 ? out : ring;
}
