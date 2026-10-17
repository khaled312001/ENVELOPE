/**
 * SURVEYED RINGS THE OFFSET KERNEL USED TO REFUSE.
 *
 * DDA plot 5134565 (Saih Shuaib 1) prints six DLTM corners that close to its
 * printed 1,040.04 m². Two of its legs are a surveyed jog: a 0.42 m leg beside a
 * 33.15 m side that turns 2.08° inward from it, and a 6.36 m leg 1.8° off a
 * 27.76 m one. The kernel refused that plot at every setback — "the setbacks
 * over-consume the plot" with boundary 1 dropped — because it checked the
 * dropped jog against its supporting line carried on into the plot, rather than
 * against the jog itself.
 *
 * Every footprint here is held to two things the kernel does not compute for
 * itself: Clipper's own uniform offset (a separate codebase, for the same
 * question) and a distance test written in this file, from every footprint
 * edge to every boundary.
 */

import { asMm, Decimal, DegenerateGeometryError, type Mm } from '@envelope/core';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  area,
  containsPoint,
  initGeometry,
  isSimple,
  offsetPerEdge,
  offsetUniform,
  toCounterClockwise,
  type Pt,
  type Ring,
} from '../src/index.js';

beforeAll(async () => {
  await initGeometry();
});

/**
 * The six corners as the sheet prints them (DLTM, metres), placed the way the
 * studio places them: the first corner is the origin. The same figures are
 * asserted against the sheet itself in `packages/intake/test/affection-plan.test.ts`.
 */
const DDA_5134565_DLTM: readonly (readonly [string, string])[] = [
  ['464118.299', '2755567.369'],
  ['464104.757', '2755591.604'],
  ['464101.832', '2755597.250'],
  ['464128.864', '2755611.388'],
  ['464129.059', '2755611.011'],
  ['464145.345', '2755582.141'],
];
const fromSurvey = (corners: readonly (readonly [string, string])[]): Ring => {
  const [e0, n0] = corners[0]!;
  return corners.map(([e, n]) => ({
    x: asMm(new Decimal(e).minus(e0).times(1000).toNumber()) as Mm,
    y: asMm(new Decimal(n).minus(n0).times(1000).toNumber()) as Mm,
  }));
};
/** Counter-clockwise, which is how the API stores every plot, so a ring index is an edge. */
const DDA = toCounterClockwise(fromSurvey(DDA_5134565_DLTM));

/** Ring edges of `DDA`, by what they are on the sheet. */
const EDGE = {
  SIDE_33: 0, // 33.147 m
  JOG_042: 1, // 0.424 m, turning 2.08° outward from the 33.147 m side
  TOP_30: 2, // 30.506 m
  KINK_636: 3, // 6.359 m, 1.81° off the 27.762 m leg
  LEG_2776: 4, // 27.762 m
  BASE_30: 5, // 30.817 m
} as const;

const m = (v: number): Mm => asMm(Math.round(v * 1000));
const insetsOf = (metres: readonly number[]) => metres.map((v, seq) => ({ seq, insetMm: m(v) }));
const uniform = (ring: Ring, v: number) => insetsOf(ring.map(() => v));
const m2 = (mm2: number): number => mm2 / 1e6;

/** Squared distance from `p` to the segment `a`–`b`, written independently of the kernel. */
function toSegment2(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  const ex = p.x - (a.x + t * dx);
  const ey = p.y - (a.y + t * dy);
  return ex * ex + ey * ey;
}

/**
 * The nearest the footprint comes to boundary `i`, in mm. Sampled along every
 * footprint edge as well as at its corners, so a footprint edge that sweeps past
 * a boundary's corner is caught even where both of its own ends are clear.
 */
function clearance(footprint: Ring, plot: Ring, i: number): number {
  const a = plot[i]!;
  const b = plot[(i + 1) % plot.length]!;
  let best = Infinity;
  for (let j = 0; j < footprint.length; j++) {
    const p = footprint[j]!;
    const q = footprint[(j + 1) % footprint.length]!;
    for (let s = 0; s <= 200; s++) {
      const pt = { x: (p.x + ((q.x - p.x) * s) / 200) as Mm, y: (p.y + ((q.y - p.y) * s) / 200) as Mm };
      best = Math.min(best, toSegment2(pt, a, b));
    }
    best = Math.min(best, toSegment2(a, p, q), toSegment2(b, p, q));
  }
  return Math.sqrt(best);
}

/** Every boundary keeps its own setback, to the 2 mm the kernel's snapping is allowed. */
function expectEverySetbackKept(footprint: Ring, plot: Ring, insetsM: readonly number[]): void {
  insetsM.forEach((d, i) => {
    expect(clearance(footprint, plot, i), `boundary ${i}, setback ${d} m`).toBeGreaterThanOrEqual(d * 1000 - 2);
  });
}

describe('DDA 5134565 — the surveyed ring with a jog', () => {
  it('is the ring the sheet prints: six corners, 1,040.04 m²', () => {
    expect(DDA).toHaveLength(6);
    expect(m2(area(DDA)).toFixed(2)).toBe('1040.04');
  });

  /*
    THE DEFECT, BY ITS OWN NUMBERS. Before the fix every one of these threw
    "the setbacks over-consume the plot" with the 0.42 m jog dropped.
  */
  it.each([0, 0.5, 1, 1.5, 2, 3, 3.75, 4.5, 6, 7.5])(
    'computes a footprint at %s m on every boundary, and Clipper agrees on its area',
    (d) => {
      const result = offsetPerEdge(DDA, uniform(DDA, d));
      expect(isSimple(result.ring)).toBe(true);
      expect(result.ring.every((p) => containsPoint(DDA, p))).toBe(true);
      expectEverySetbackKept(result.ring, DDA, DDA.map(() => d));
      if (d === 0) {
        expect(result.areaMm2).toBe(area(DDA));
        return;
      }
      // Clipper's uniform offset is a second implementation of the same question.
      // They differ only by where each rounds a vertex to the millimetre grid.
      const clipper = offsetUniform(DDA, m(d));
      expect(clipper).toHaveLength(1);
      expect(Math.abs(m2(result.areaMm2) - m2(area(clipper[0]!)))).toBeLessThan(0.1);
    },
  );

  it('says which boundaries it met without drawing a line of their own', () => {
    expect(offsetPerEdge(DDA, uniform(DDA, 0.2)).dropped).toEqual([]);
    expect(offsetPerEdge(DDA, uniform(DDA, 3)).dropped).toEqual([EDGE.JOG_042]);
    expect(offsetPerEdge(DDA, uniform(DDA, 7.5)).dropped).toEqual([EDGE.JOG_042, EDGE.KINK_636]);
  });

  /*
    The sheet's general note sets every side back a quarter of the height and
    at least 3 m; DBC Table B.1 sets 0 m to a road. A road on either short side
    and 3 m elsewhere is the reading an architect would make of it.
  */
  it.each([
    ['the top', EDGE.TOP_30],
    ['the base', EDGE.BASE_30],
  ])('computes with the road on %s at 0 m and 3 m elsewhere', (_, road) => {
    const insets = DDA.map((_p, i) => (i === road ? 0 : 3));
    const result = offsetPerEdge(DDA, insetsOf(insets));
    expect(result.ring.every((p) => containsPoint(DDA, p))).toBe(true);
    expectEverySetbackKept(result.ring, DDA, insets);
    expect(m2(result.areaMm2)).toBeGreaterThan(700);
    expect(m2(result.areaMm2)).toBeLessThan(m2(area(DDA)));
  });

  /*
    A short boundary asking for less than the long one it continues is held to
    the long one's line — the conservative reading, which costs footprint and
    never adds it — and its own setback is still checked.
  */
  it('holds the jog to its side’s line when it asks for less', () => {
    const insets = [3, 0, 3, 3, 3, 3];
    const result = offsetPerEdge(DDA, insetsOf(insets));
    expect(result.dropped).toContain(EDGE.JOG_042);
    expectEverySetbackKept(result.ring, DDA, insets);
    const same = offsetPerEdge(DDA, uniform(DDA, 3));
    // Never more than the jog at its side's figure, and the jog's 0.42 m bounds the difference.
    expect(result.areaMm2).toBeGreaterThanOrEqual(same.areaMm2);
    expect(m2(result.areaMm2 - same.areaMm2)).toBeLessThan(0.424 * 3);
  });

  /*
    THE TWO WAYS TO GET THIS WRONG, BOTH REFUSED IN WORDS.

    A short leg asking for MORE than the long one it continues has no corner:
    their setback lines, 1.8° apart, cross 237 m away. Carrying the short leg's
    line down the long side — what the kernel did before it said so — satisfies
    every setback and silently loses 126 m² of a 1,040 m² plot. Carrying the
    long one's would build inside the short one's setback. How the line steps
    there is the client's to say.
  */
  it.each([
    ['the 6.36 m kink at 6 m beside the 27.76 m leg at 0 m', [0, 0, 0, 6, 0, 0], '6.36 m boundary by 6 m'],
    ['the 0.42 m jog at 3 m beside the 33.15 m side at 0 m', [0, 3, 0, 0, 0, 0], '0.42 m boundary by 3 m'],
    ['a road on one leg of a kinked side and 7.5 m on the other', [7.5, 7.5, 7.5, 7.5, 0, 7.5], '27.76 m boundary by 0 m'],
  ])('refuses %s, naming both boundaries by length', (_, insets, named) => {
    let caught: unknown;
    try {
      offsetPerEdge(DDA, insetsOf(insets));
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(DegenerateGeometryError);
    const message = (caught as Error).message;
    expect(message).toMatch(/^Two boundaries meet almost in line, turning \d+\.\d°/);
    expect(message).toContain(named);
    expect(message).toContain('Give both boundaries the same setback');
    expect(message).not.toMatch(/over-consume/);
  });

  it('computes the same plot once the kinked side is set back alike', () => {
    const result = offsetPerEdge(DDA, insetsOf([7.5, 7.5, 7.5, 0, 0, 7.5]));
    expectEverySetbackKept(result.ring, DDA, [7.5, 7.5, 7.5, 0, 0, 7.5]);
  });

  /* Degenerate geometry still raises. */
  it.each([16, 20])('NEGATIVE: still refuses %s m all round, which a plot 30 m across cannot hold', (d) => {
    expect(() => offsetPerEdge(DDA, uniform(DDA, d))).toThrow(/over-consume|sliver/);
  });
});

/*
  An L whose upper wing ends in a 1 m chamfer. At 3 m the chamfer is swallowed
  by its neighbours, as on 6468096. The old check then held every corner to the
  line of the L's inner edge, which runs straight through the upper wing, and
  refused the plot.
*/
describe('a plot that turns inward, losing a short boundary', () => {
  const pt = (x: number, y: number): Pt => ({ x: m(x), y: m(y) });
  const L_CHAMFERED: Ring = [pt(0, 0), pt(40, 0), pt(40, 15), pt(15, 15), pt(15, 40), pt(1, 40), pt(0, 39)];

  it('drops the chamfer and keeps every setback', () => {
    const result = offsetPerEdge(L_CHAMFERED, uniform(L_CHAMFERED, 3));
    expect(result.dropped).toEqual([5]);
    expect(isSimple(result.ring)).toBe(true);
    expect(result.ring.every((p) => containsPoint(L_CHAMFERED, p))).toBe(true);
    expectEverySetbackKept(result.ring, L_CHAMFERED, L_CHAMFERED.map(() => 3));
    const clipper = offsetUniform(L_CHAMFERED, m(3));
    expect(Math.abs(m2(result.areaMm2) - m2(area(clipper[0]!)))).toBeLessThan(0.1);
  });

  it('NEGATIVE: still refuses a neck the setbacks close', () => {
    // 6 m all round on a 15 m-wide wing leaves 3 m; 8 m leaves nothing.
    expect(() => offsetPerEdge(L_CHAMFERED, uniform(L_CHAMFERED, 8))).toThrow(DegenerateGeometryError);
  });
});

/*
  Brief plot 5180196 (Jabal Ali), from the four legs its sheet's reader gives:
  36.57 m at 205.06°, 48.03 m at 295.08°, 35.79 m at 24.81°, 48.19 m at 114.15°.
  Its sheet sets the tower 0 m from the street and 6 m from the neighbours.
*/
describe('brief plot 5180196 — four legs, nearly a rectangle', () => {
  const legs: readonly (readonly [number, number])[] = [
    [36.57, 205.06],
    [48.03, 295.08],
    [35.79, 24.81],
    [48.19, 114.15],
  ];
  const corners: Pt[] = [];
  let x = 0;
  let y = 0;
  for (const [length, bearing] of legs) {
    corners.push({ x: m(x), y: m(y) });
    x += length * Math.sin((bearing * Math.PI) / 180);
    y += length * Math.cos((bearing * Math.PI) / 180);
  }
  const P196 = toCounterClockwise(corners);

  it('closes to the printed 1,740.56 m² within the legs’ rounding', () => {
    expect(Math.abs(m2(area(P196)) - 1740.56)).toBeLessThan(0.1);
  });

  it.each([0, 1, 2, 3, 4.5, 6, 7.5])('computes at %s m all round', (d) => {
    const result = offsetPerEdge(P196, uniform(P196, d));
    expectEverySetbackKept(result.ring, P196, P196.map(() => d));
  });

  it.each([0, 1, 2, 3])('computes with the street (edge %s) at 0 m and the neighbours at 6 m', (road) => {
    const insets = P196.map((_, i) => (i === road ? 0 : 6));
    const result = offsetPerEdge(P196, insetsOf(insets));
    expect(result.ring.every((p) => containsPoint(P196, p))).toBe(true);
    expectEverySetbackKept(result.ring, P196, insets);
  });
});

describe('degenerate geometry still raises', () => {
  it('NEGATIVE: a bow tie, two corners swapped, yields no footprint', () => {
    const bowTie: Ring = [
      { x: m(0), y: m(0) },
      { x: m(80), y: m(40) },
      { x: m(80), y: m(0) },
      { x: m(0), y: m(40) },
    ];
    expect(() => offsetPerEdge(bowTie, uniform(bowTie, 3))).toThrow(DegenerateGeometryError);
  });

  it('NEGATIVE: a sliver is not a footprint', () => {
    const strip: Ring = [
      { x: m(0), y: m(0) },
      { x: m(60), y: m(0) },
      { x: m(60), y: m(12.15) },
      { x: m(0), y: m(12.15) },
    ];
    expect(() => offsetPerEdge(strip, uniform(strip, 6.1))).toThrow(/sliver|over-consume/);
  });
});
