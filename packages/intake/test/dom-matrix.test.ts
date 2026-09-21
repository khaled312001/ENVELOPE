/**
 * `AffineDOMMatrix` against a real `DOMMatrix`.
 *
 * The oracle is `@napi-rs/canvas` — the implementation pdfjs uses when it can load
 * it, installed here as pdfjs's optional dependency. A test that checked the
 * polyfill against arithmetic written in this file would be checking one reading
 * of the specification against the same reading.
 */

import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

import { AffineDOMMatrix } from '../src/dom-matrix.js';

type Real = new (init?: number[]) => {
  a: number; b: number; c: number; d: number; e: number; f: number;
  multiplySelf(o: unknown): unknown;
  preMultiplySelf(o: unknown): unknown;
  invertSelf(): unknown;
  translateSelf(x: number, y: number): unknown;
  scaleSelf(sx: number, sy?: number, sz?: number, ox?: number, oy?: number): unknown;
  transformPoint(p: { x: number; y: number }): { x: number; y: number };
};

const oracle = ((): Real | null => {
  try {
    const fromPdfjs = createRequire(createRequire(import.meta.url).resolve('pdfjs-dist/package.json'));
    return (fromPdfjs('@napi-rs/canvas') as { DOMMatrix: Real }).DOMMatrix;
  } catch {
    return null;
  }
})();

const SAMPLES: readonly (readonly [number, number, number, number, number, number])[] = [
  [1, 0, 0, 1, 0, 0],
  [2, 0, 0, -3, 10, 20],
  [0.707, 0.707, -0.707, 0.707, 5, -7],
  [1.5, 0.25, -0.4, 0.9, 123.5, -42.25],
  [0, 1, -1, 0, 595.28, 841.89],
];

const six = (m: { a: number; b: number; c: number; d: number; e: number; f: number }) =>
  [m.a, m.b, m.c, m.d, m.e, m.f];

const close = (got: number[], want: number[]) => {
  expect(got).toHaveLength(6);
  got.forEach((v, i) => expect(v).toBeCloseTo(want[i]!, 5));
};

describe.runIf(oracle !== null)('AffineDOMMatrix agrees with a real DOMMatrix', () => {
  const Real = oracle!;

  it('composes on the right and on the left', () => {
    for (const x of SAMPLES) {
      for (const y of SAMPLES) {
        const mine = new AffineDOMMatrix([...x]).multiplySelf(new AffineDOMMatrix([...y]));
        const real = new Real([...x]);
        real.multiplySelf(new Real([...y]));
        close(six(mine), six(real));

        const pre = new AffineDOMMatrix([...x]).preMultiplySelf(new AffineDOMMatrix([...y]));
        const realPre = new Real([...x]);
        realPre.preMultiplySelf(new Real([...y]));
        close(six(pre), six(realPre));
      }
    }
  });

  it('inverts, translates, scales about an origin, and maps points', () => {
    for (const x of SAMPLES) {
      const inv = new AffineDOMMatrix([...x]).invertSelf();
      const realInv = new Real([...x]);
      realInv.invertSelf();
      close(six(inv), six(realInv));

      const moved = new AffineDOMMatrix([...x]).translateSelf(3, -4).scaleSelf(2, 0.5, 1, 7, 9);
      const realMoved = new Real([...x]);
      realMoved.translateSelf(3, -4);
      realMoved.scaleSelf(2, 0.5, 1, 7, 9);
      close(six(moved), six(realMoved));

      const p = new AffineDOMMatrix([...x]).transformPoint({ x: 12.5, y: -3 });
      const q = new Real([...x]).transformPoint({ x: 12.5, y: -3 });
      expect(p.x).toBeCloseTo(q.x, 6);
      expect(p.y).toBeCloseTo(q.y, 6);
    }
  });
});

describe('AffineDOMMatrix on its own terms', () => {
  it('reads the 2D cells of a 16-number matrix', () => {
    const m = new AffineDOMMatrix([2, 3, 0, 0, 4, 5, 0, 0, 0, 0, 1, 0, 6, 7, 0, 1]);
    expect(six(m)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(Array.from(m.toFloat64Array())).toEqual([2, 3, 0, 0, 4, 5, 0, 0, 0, 0, 1, 0, 6, 7, 0, 1]);
  });

  it('turns a singular matrix into NaN rather than a plausible number', () => {
    expect(six(new AffineDOMMatrix([1, 2, 2, 4, 0, 0]).invertSelf()).every(Number.isNaN)).toBe(true);
  });
});
