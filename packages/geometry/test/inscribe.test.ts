/**
 * The inscribed rectangle, checked in the direction that matters.
 *
 * One property carries this module: **the rectangle is inside the ring**. Every
 * consumer downstream — the bay packer, the DXF, the massing view — treats it as
 * buildable area, so a rectangle that leaks past the boundary produces a
 * plausible drawing of an unbuildable scheme. The area it finds is a quality
 * question; the containment is a correctness one, and they are tested
 * separately for that reason.
 */

import { asMm, Decimal } from '@envelope/core';
import { describe, expect, it } from 'vitest';

import { containsPoint, type Ring } from '../src/exact.js';
import { fromLocal, largestInscribedRectangle } from '../src/inscribe.js';

const mm = (m: number): number => Math.round(m * 1000);
const ring = (pts: readonly (readonly [number, number])[]): Ring =>
  pts.map(([x, y]) => ({ x: asMm(mm(x)), y: asMm(mm(y)) }));

/** The four corners of the result, back in world space. */
function corners(r: ReturnType<typeof largestInscribedRectangle>) {
  const w = Number(r.widthMm);
  const d = Number(r.depthMm);
  return [
    fromLocal(r, 0, 0),
    fromLocal(r, w, 0),
    fromLocal(r, w, d),
    fromLocal(r, 0, d),
  ];
}

describe('a plot that is already a rectangle', () => {
  const plot = ring([
    [0, 0],
    [50, 0],
    [50, 30],
    [0, 30],
  ]);

  it('is returned exactly, not approximated by the grid', () => {
    const r = largestInscribedRectangle(plot);
    expect(r.exact).toBe(true);
    expect(Number(r.widthMm)).toBe(mm(50));
    expect(Number(r.depthMm)).toBe(mm(30));
    expect(r.coverage.toFixed(4)).toBe('1.0000');
  });

  it('reports resolution 0, because no sweep was run', () => {
    // A resolution of 96 on an exact answer would invite a reader to treat the
    // number as a grid artefact when it is the plot's own dimension.
    expect(largestInscribedRectangle(plot).resolution).toBe(0);
  });
});

describe('a rotated rectangle', () => {
  // 40 x 20, turned 30 degrees. Still four right angles, so still exact.
  const c = Math.cos(Math.PI / 6);
  const s = Math.sin(Math.PI / 6);
  const plot = ring([
    [0, 0],
    [40 * c, 40 * s],
    [40 * c - 20 * s, 40 * s + 20 * c],
    [-20 * s, 20 * c],
  ]);

  it('recovers both dimensions and the rotation', () => {
    const r = largestInscribedRectangle(plot);
    expect(r.exact).toBe(true);
    expect(Number(r.widthMm) / 1000).toBeCloseTo(40, 2);
    expect(Number(r.depthMm) / 1000).toBeCloseTo(20, 2);
    expect(r.angleDeg.toNumber()).toBeCloseTo(30, 3);
  });

  it('places local coordinates back on the rotated frame', () => {
    const r = largestInscribedRectangle(plot);
    const p = fromLocal(r, mm(40), 0);
    expect(Number(p.x) / 1000).toBeCloseTo(40 * c, 2);
    expect(Number(p.y) / 1000).toBeCloseTo(40 * s, 2);
  });
});

describe('an L-shaped plot', () => {
  // 40 x 30 with a 20 x 15 bite out of the top-right corner.
  const plot = ring([
    [0, 0],
    [40, 0],
    [40, 15],
    [20, 15],
    [20, 30],
    [0, 30],
  ]);

  const r = largestInscribedRectangle(plot);

  it('does not claim to be exact', () => {
    expect(r.exact).toBe(false);
  });

  it('stays inside the plot at every corner', () => {
    for (const p of corners(r)) expect(containsPoint(plot, p)).toBe(true);
  });

  it('reports the area it gave up rather than hiding it', () => {
    // The plot is 900 m²; no inscribed rectangle can hold all of it. The number
    // is what makes the simplification visible on screen instead of implicit.
    expect(r.coverage.lt(1)).toBe(true);
    expect(r.coverage.gt(new Decimal('0.55'))).toBe(true);
  });

  it('finds at least the larger of the two obvious arms', () => {
    // 40 x 15 = 600 m² is trivially available; a sweep that returned less than
    // that would be worse than the naive answer and not worth its cost.
    const areaM2 = new Decimal(Number(r.widthMm)).times(Number(r.depthMm)).div(1e6);
    expect(areaM2.gte(new Decimal(580))).toBe(true);
  });
});

describe('a triangular plot', () => {
  const plot = ring([
    [0, 0],
    [60, 0],
    [0, 40],
  ]);

  it('inscribes rather than bounds', () => {
    const r = largestInscribedRectangle(plot);
    for (const p of corners(r)) expect(containsPoint(plot, p)).toBe(true);
    // The MBR would be 60 x 40 = 2400 m², twice the triangle. Anything near
    // that would mean the routine had bounded the plot instead of filling it.
    const areaM2 = new Decimal(Number(r.widthMm)).times(Number(r.depthMm)).div(1e6);
    expect(areaM2.lt(new Decimal(1200))).toBe(true);
  });
});

describe('refusals', () => {
  it('raises on a zero-area ring rather than returning a rectangle of nothing', () => {
    expect(() =>
      largestInscribedRectangle(
        ring([
          [0, 0],
          [10, 0],
          [20, 0],
        ]),
      ),
    ).toThrow(/zero-area|no extent/);
  });
});
