/**
 * Where a straight line crosses a ring — the arithmetic of a section cut.
 *
 * A section drawing is a set of spans: along the cut line, where each slab starts
 * and stops. Computing them in a renderer would put geometry where the rules say
 * none may be made, so they are computed here, in the kernel, and the section is
 * drawn from the numbers this returns.
 *
 * Exact where it can be. Points are integer millimetres, so the side of the line a
 * vertex lies on is an integer cross product with no rounding at all, and the
 * crossing rule is the standard half-open one: a vertex exactly on the line
 * belongs to the positive side, so a line through a vertex is counted once and a
 * line along an edge is counted not at all rather than twice. Only the final
 * distance involves a division, done in `Decimal` and rounded half-even to the
 * millimetre, so the same cut gives the same spans on every machine.
 */

import { Decimal, DegenerateGeometryError } from '@envelope/core';

import type { Pt, Ring } from './exact.js';

/** A stretch of the cut line, as distances in millimetres from its origin. */
export type Span = readonly [number, number];

/**
 * The spans of `ring` along the line through `a` towards `b`.
 *
 * Distances are measured from `a` in the direction of `b`, and may be negative
 * for a ring that extends behind `a`. Returned sorted and non-overlapping; an
 * empty list means the line misses the ring.
 *
 * @throws {DegenerateGeometryError} when `a` and `b` coincide — a cut with no
 *   direction is not a cut.
 */
export function lineSpans(ring: Ring, a: Pt, b: Pt): readonly Span[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) {
    throw new DegenerateGeometryError('a section line needs two distinct points', { a, b });
  }
  const length = new Decimal(dx).pow(2).plus(new Decimal(dy).pow(2)).sqrt();

  // Which side of the line, as an exact integer: (p − a) × (b − a).
  const side = (p: Pt): number => (p.x - a.x) * dy - (p.y - a.y) * dx;
  // How far along, scaled by the length: (p − a) · (b − a).
  const along = (p: Pt): number => (p.x - a.x) * dx + (p.y - a.y) * dy;

  const crossings: Decimal[] = [];
  for (let i = 0; i < ring.length; i += 1) {
    const p = ring[i]!;
    const q = ring[(i + 1) % ring.length]!;
    const sp = side(p);
    const sq = side(q);
    // Half-open: zero counts as the non-negative side.
    if (sp >= 0 === sq >= 0) continue;
    const up = new Decimal(along(p));
    const uq = new Decimal(along(q));
    // The crossing lies a fraction sp / (sp − sq) of the way from p to q.
    const u = up.plus(uq.minus(up).times(sp).div(sp - sq));
    crossings.push(u.div(length));
  }

  crossings.sort((x, y) => x.comparedTo(y));
  if (crossings.length % 2 !== 0) {
    // A simple ring crossed by a line enters and leaves an equal number of
    // times. An odd count means the ring is not simple, and a section of it would
    // be a drawing of an impossible slab.
    throw new DegenerateGeometryError('a section line crossed the ring an odd number of times', {
      crossings: crossings.length,
    });
  }

  const mm = (d: Decimal): number => d.toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN).toNumber();
  const spans: Span[] = [];
  for (let i = 0; i < crossings.length; i += 2) {
    const from = mm(crossings[i]!);
    const to = mm(crossings[i + 1]!);
    if (to > from) spans.push([from, to]);
  }
  return spans;
}

/**
 * `from` with every stretch of `holes` taken out. Both sorted and non-overlapping.
 *
 * Integer in, integer out: a slab with a ramp opening cut from it, on the same
 * millimetre grid as the spans themselves.
 */
export function subtractSpans(from: readonly Span[], holes: readonly Span[]): readonly Span[] {
  const out: Span[] = [];
  for (const [start, end] of from) {
    let cursor = start;
    for (const [h0, h1] of holes) {
      if (h1 <= cursor || h0 >= end) continue;
      if (h0 > cursor) out.push([cursor, h0]);
      cursor = Math.max(cursor, h1);
      if (cursor >= end) break;
    }
    if (cursor < end) out.push([cursor, end]);
  }
  return out;
}

/** How far along the line through `a` towards `b` a point lies, in millimetres. */
export function distanceAlong(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) {
    throw new DegenerateGeometryError('a section line needs two distinct points', { a, b });
  }
  const length = new Decimal(dx).pow(2).plus(new Decimal(dy).pow(2)).sqrt();
  return new Decimal((p.x - a.x) * dx + (p.y - a.y) * dy)
    .div(length)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN)
    .toNumber();
}

/** The point `distanceMm` along the line through `a` towards `b`, on the 1 mm grid. */
export function pointAlong(a: Pt, b: Pt, distanceMm: number): Pt {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = new Decimal(dx).pow(2).plus(new Decimal(dy).pow(2)).sqrt();
  if (length.isZero()) {
    throw new DegenerateGeometryError('a section line needs two distinct points', { a, b });
  }
  const k = new Decimal(distanceMm).div(length);
  const round = (v: Decimal): number => v.toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN).toNumber();
  return {
    x: round(k.times(dx).plus(a.x)) as Pt['x'],
    y: round(k.times(dy).plus(a.y)) as Pt['y'],
  };
}
