/**
 * Turning — does a car get round every corner of the aisle network?
 *
 * Eng. Mohamed, 16 Oct 2026: *"مهم ان يكون في قطر دوران العربيه محسوب"*, and over
 * his own drawings, *"شوف هنا لفه العربيات بتكون ازاي"* — every aisle corner on
 * them drawn as a rounded vehicle path.
 *
 * **The radius is the code's only car-turning figure, used by analogy, and says
 * so.** DBC Part B states no turning radius for a car on a parking aisle. B.7.3.1.4
 * gives radii for trucks; Table B.9 gives, for a *curved ramp*, a minimum inner
 * circle radius of 4 m and a minimum lane of 3.5 m. Those two figures are the
 * nearest the code comes to a car turning, so they are taken for every aisle turn
 * — as an `ASSUMED` value with that basis, amber, never as a citation the turn
 * reaches. A reader with a design vehicle of their own has a number to argue with.
 *
 * **The check is geometric and fails closed.** At every place a car can turn from
 * one aisle into a perpendicular one, the turn is the quarter annulus of that
 * inner radius and lane, held against the two outer walls — the tightest a car on
 * that radius can take the corner. Every sampled point of it must stand on an
 * aisle; a point on a bay, a core or past the slab is a turn that does not fit.
 * It is one lane — one car turning at a time — and it says so.
 *
 * It changes no bay count. A turn that does not fit is reported, with where, and
 * drawn; dropping bays on the strength of an assumed radius would let an
 * assumption silently move a figure the reader was shown.
 */

import { Decimal } from '@envelope/core';

import type { CircRect } from './circulation.js';

export interface Pt2 {
  readonly x: number;
  readonly y: number;
}

/** One turn from one aisle into a perpendicular one, in level-local metres. */
export interface Turn {
  /** Indices into the aisle list: the aisle driven along, and the one turned into. */
  readonly from: number;
  readonly into: number;
  readonly centre: Pt2;
  readonly innerRadiusM: number;
  readonly outerRadiusM: number;
  /** The inner and outer edge of the swept lane, as points along the arc. */
  readonly inner: readonly Pt2[];
  readonly outer: readonly Pt2[];
  readonly fits: boolean;
}

const EPS = 1e-6;
/** Points per edge of the arc drawn; the fit is sampled far finer. */
const DRAWN_STEPS = 9;
const CHECK_STEPS = 90;
const CHECK_RINGS = 6;

interface Box {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

const box = (r: CircRect): Box => ({
  x0: r.x.toNumber(),
  y0: r.y.toNumber(),
  x1: r.x.plus(r.width).toNumber(),
  y1: r.y.plus(r.height).toNumber(),
});

const inside = (boxes: readonly Box[], p: Pt2): boolean =>
  boxes.some((b) => p.x >= b.x0 - EPS && p.x <= b.x1 + EPS && p.y >= b.y0 - EPS && p.y <= b.y1 + EPS);

/** The quarter arc from `a0` to `a0 + 90°` about `c`, radius `r`, as `steps + 1` points. */
function arc(c: Pt2, r: number, a0: number, steps: number): Pt2[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = a0 + ((Math.PI / 2) * i) / steps;
    return { x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) };
  });
}

/**
 * Every turn between two perpendicular aisles that meet along a line, each
 * checked against the whole aisle network.
 *
 * Two aisles meet when they touch along a line at least `minOpeningM` long — the
 * same doorway rule `circulation.ts` applies. The one that runs on past the other
 * along that line is the one driven along; the other is turned into. A T gives
 * two turns, a corner of the ring one, two aisles in line none.
 */
export function findTurns(input: {
  readonly aisles: readonly CircRect[];
  readonly innerRadiusM: Decimal;
  readonly laneM: Decimal;
  readonly minOpeningM: Decimal;
}): Turn[] {
  const boxes = input.aisles.map(box);
  const ri = input.innerRadiusM.toNumber();
  const ro = ri + input.laneM.toNumber();
  const minOpening = input.minOpeningM.toNumber();
  const turns: Turn[] = [];

  const push = (from: number, into: number, centre: Pt2, a0: number): void => {
    let fits = true;
    for (let k = 0; k <= CHECK_RINGS && fits; k += 1) {
      for (const p of arc(centre, ri + ((ro - ri) * k) / CHECK_RINGS, a0, CHECK_STEPS)) {
        if (!inside(boxes, p)) {
          fits = false;
          break;
        }
      }
    }
    turns.push({
      from,
      into,
      centre,
      innerRadiusM: ri,
      outerRadiusM: ro,
      inner: arc(centre, ri, a0, DRAWN_STEPS),
      outer: arc(centre, ro, a0, DRAWN_STEPS),
      fits,
    });
  };

  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = 0; j < boxes.length; j += 1) {
      if (i === j) continue;
      const a = boxes[i]!; // driven along
      const b = boxes[j]!; // turned into
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
      const oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);

      // Touching along a vertical line: `b` is beside `a`, entered across that line.
      if (Math.abs(ox) <= EPS && oy >= minOpening - EPS) {
        const bRight = b.x0 >= a.x1 - EPS;
        // `a` runs on past `b` above and/or below; each side is one turn.
        for (const up of [true, false]) {
          if (up ? a.y1 <= b.y1 + EPS : a.y0 >= b.y0 - EPS) continue;
          // Outer walls: `a`'s side away from `b`, and `b`'s side away from where `a` runs on.
          const cx = bRight ? a.x0 + ro : a.x1 - ro;
          const cy = up ? b.y0 + ro : b.y1 - ro;
          // The quadrant facing that outer corner.
          const sx = bRight ? -1 : 1;
          const sy = up ? -1 : 1;
          push(i, j, { x: cx, y: cy }, quadrantStart(sx, sy));
        }
      }
      // Touching along a horizontal line: `b` is above or below `a`.
      if (Math.abs(oy) <= EPS && ox >= minOpening - EPS) {
        const bAbove = b.y0 >= a.y1 - EPS;
        for (const right of [true, false]) {
          if (right ? a.x1 <= b.x1 + EPS : a.x0 >= b.x0 - EPS) continue;
          const cy = bAbove ? a.y0 + ro : a.y1 - ro;
          const cx = right ? b.x0 + ro : b.x1 - ro;
          const sy = bAbove ? -1 : 1;
          const sx = right ? -1 : 1;
          push(i, j, { x: cx, y: cy }, quadrantStart(sx, sy));
        }
      }
    }
  }
  return turns;
}

/** The start angle of the quarter whose points lie toward (`sx`, `sy`) from the centre. */
function quadrantStart(sx: number, sy: number): number {
  if (sx > 0 && sy > 0) return 0;
  if (sx < 0 && sy > 0) return Math.PI / 2;
  if (sx < 0 && sy < 0) return Math.PI;
  return (3 * Math.PI) / 2;
}
