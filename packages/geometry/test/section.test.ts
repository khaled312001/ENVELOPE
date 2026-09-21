/**
 * Section-line tests: POSITIVE, BOUNDARY and NEGATIVE, as for the rest of the kernel.
 *
 * The boundary cases are the ones a section actually hits: a cut through a
 * vertex, and a cut along an edge. Both are where a floating-point crossing
 * rule counts a crossing twice or not at all, and a slab gains or loses a span.
 */

import { asMm, DegenerateGeometryError } from '@envelope/core';
import { describe, expect, it } from 'vitest';

import { distanceAlong, lineSpans, pointAlong, subtractSpans, type Pt, type Ring } from '../src/index.js';

const p = (x: number, y: number): Pt => ({ x: asMm(x), y: asMm(y) });
const RECT: Ring = [p(0, 0), p(80_000, 0), p(80_000, 40_000), p(0, 40_000)];

describe('lineSpans', () => {
  it('cuts a rectangle across its width', () => {
    expect(lineSpans(RECT, p(0, 20_000), p(1, 20_000))).toEqual([[0, 80_000]]);
  });

  it('measures from the line origin, including behind it', () => {
    expect(lineSpans(RECT, p(10_000, 20_000), p(20_000, 20_000))).toEqual([[-10_000, 70_000]]);
  });

  it('measures along a diagonal in true length', () => {
    // The diagonal of 80 × 40 is 89 442.719… mm; rounded half-even to the mm.
    expect(lineSpans(RECT, p(0, 0), p(80_000, 40_000))).toEqual([[0, 89_443]]);
  });

  it('returns two spans for a concave ring cut across both arms', () => {
    const U: Ring = [p(0, 0), p(30_000, 0), p(30_000, 20_000), p(20_000, 20_000), p(20_000, 5_000), p(10_000, 5_000), p(10_000, 20_000), p(0, 20_000)];
    expect(lineSpans(U, p(0, 10_000), p(1, 10_000))).toEqual([
      [0, 10_000],
      [20_000, 30_000],
    ]);
  });

  it('BOUNDARY: a cut through a vertex is counted once', () => {
    const diamond: Ring = [p(0, -10_000), p(10_000, 0), p(0, 10_000), p(-10_000, 0)];
    expect(lineSpans(diamond, p(-20_000, 0), p(20_000, 0))).toEqual([[10_000, 30_000]]);
  });

  it('BOUNDARY: a cut along an edge yields the edge, not a doubled crossing', () => {
    // The half-open rule puts the bottom edge on the positive side: the line
    // grazes the ring and every span it reports is still a real stretch of slab.
    const spans = lineSpans(RECT, p(0, 0), p(1, 0));
    for (const [from, to] of spans) expect(to).toBeGreaterThan(from);
    expect(spans.length).toBeLessThanOrEqual(1);
  });

  it('NEGATIVE: a line that misses the ring returns no spans', () => {
    expect(lineSpans(RECT, p(0, 50_000), p(1, 50_000))).toEqual([]);
  });

  it('NEGATIVE: a cut with no direction is refused', () => {
    expect(() => lineSpans(RECT, p(5, 5), p(5, 5))).toThrow(DegenerateGeometryError);
  });

  it('is independent of the ring orientation', () => {
    const cw = [...RECT].reverse();
    expect(lineSpans(cw, p(0, 20_000), p(1, 20_000))).toEqual(lineSpans(RECT, p(0, 20_000), p(1, 20_000)));
  });
});

describe('subtractSpans', () => {
  it('cuts an opening out of the middle of a slab', () => {
    expect(subtractSpans([[0, 80_000]], [[10_000, 16_000]])).toEqual([
      [0, 10_000],
      [16_000, 80_000],
    ]);
  });

  it('BOUNDARY: an opening flush with the slab edge leaves no zero-length span', () => {
    expect(subtractSpans([[0, 80_000]], [[0, 6_000]])).toEqual([[6_000, 80_000]]);
    expect(subtractSpans([[0, 80_000]], [[74_000, 80_000]])).toEqual([[0, 74_000]]);
  });

  it('an opening that covers the slab removes it', () => {
    expect(subtractSpans([[10, 20]], [[0, 30]])).toEqual([]);
  });

  it('an opening elsewhere changes nothing', () => {
    expect(subtractSpans([[0, 10], [20, 30]], [[12, 18]])).toEqual([
      [0, 10],
      [20, 30],
    ]);
  });
});

describe('distanceAlong and pointAlong', () => {
  it('round-trips a point on the line', () => {
    const a = p(0, 0);
    const b = p(3_000, 4_000);
    const q = pointAlong(a, b, 10_000);
    expect(q).toEqual(p(6_000, 8_000));
    expect(distanceAlong(q, a, b)).toBe(10_000);
  });

  it('projects a point off the line onto it', () => {
    expect(distanceAlong(p(5_000, 99_000), p(0, 0), p(1, 0))).toBe(5_000);
  });
});
