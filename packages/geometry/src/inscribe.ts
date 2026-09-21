/**
 * The largest rectangle that fits *inside* a plot.
 *
 * The parking layout packs bays into a rectangle — that is not a simplification
 * it chose, it is how a parking level is designed: runs of bays either side of a
 * straight aisle. So something has to decide which rectangle. The obvious
 * candidate is the minimum bounding rectangle, and it is the wrong one: an MBR
 * *contains* the plot, so packing it puts bays outside the boundary and reports
 * a count nobody can build.
 *
 * This inscribes instead. The error therefore runs in the safe direction — the
 * rectangle is contained by the ring, so the bay count is a **floor**. A plot
 * that is genuinely rectangular gets its own outline back exactly; anything else
 * gets a rectangle it really holds, and `coverage` says how much of the plot went
 * unused, so a reviewer can see the cost of the simplification rather than
 * having it hidden inside a number.
 *
 * The method is a grid sweep plus the standard maximal-rectangle-in-a-histogram
 * scan. Deliberately not a closed-form optimum: an exact largest-inscribed
 * rectangle for an arbitrary simple polygon is a research-grade routine, and a
 * conservative answer that is provably inside beats an exact one that is
 * approximately inside.
 */

import { asMm, Decimal, DegenerateGeometryError, type Mm, type Mm2 } from '@envelope/core';

import { minimumBoundingRectangle } from './analysis.js';
import {
  area,
  containsPoint,
  dropCollinear,
  toCounterClockwise,
  type Pt,
  type Ring,
} from './exact.js';

/**
 * A rectangle expressed in its own frame, plus where that frame sits.
 *
 * Kept as an origin and an angle rather than as four corners because every
 * consumer wants local coordinates: the parking packer lays bays out at (x, y)
 * in metres from a corner, and the drawing needs those same points back in world
 * space. Handing over four corners would make each caller re-derive the frame,
 * and two derivations of one frame is one too many.
 */
export interface InscribedRect {
  readonly widthMm: Mm;
  readonly depthMm: Mm;
  /** Rotation of the rectangle's local +x axis, degrees CCW from world +x. */
  readonly angleDeg: Decimal;
  /** World position of the rectangle's local origin corner. */
  readonly originMm: Pt;
  readonly areaMm2: Mm2;
  /** Rectangle area over ring area. 1 means the plot *is* this rectangle. */
  readonly coverage: Decimal;
  /**
   * True when the ring is itself a rectangle, so nothing was given up.
   *
   * Worth reporting separately from `coverage === 1`: a coverage of 0.998 from a
   * grid sweep and an exact match are different claims, and only one of them may
   * be described to a user as "the plot".
   */
  readonly exact: boolean;
  /** Cells per side of the sweep grid. Reported so the bound is falsifiable. */
  readonly resolution: number;
}

const DEG = new Decimal(180).div(Decimal.acos(-1));

function rotateIntoFrame(p: Pt, cos: Decimal, sin: Decimal): { x: Decimal; y: Decimal } {
  const x = new Decimal(p.x);
  const y = new Decimal(p.y);
  return { x: x.times(cos).plus(y.times(sin)), y: x.times(sin).negated().plus(y.times(cos)) };
}

/** Is the ring four right angles? Then the answer is the ring. */
function asRectangle(ring: Ring): Ring | undefined {
  const r = dropCollinear(toCounterClockwise(ring));
  if (r.length !== 4) return undefined;
  for (let i = 0; i < 4; i++) {
    const a = r[i]!;
    const b = r[(i + 1) % 4]!;
    const c = r[(i + 2) % 4]!;
    const ux = b.x - a.x;
    const uy = b.y - a.y;
    const vx = c.x - b.x;
    const vy = c.y - b.y;
    const dot = ux * vx + uy * vy;
    const mag = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    if (mag === 0) return undefined;
    // A millimetre of slack on a 50 m edge is 2e-5 of the magnitude; this
    // tolerates the rounding an integer grid forces without tolerating a skew.
    if (Math.abs(dot) / mag > 1e-4) return undefined;
  }
  return r;
}

/**
 * The maximal all-true axis-aligned sub-rectangle of a boolean grid.
 *
 * The histogram scan: walk rows keeping, per column, the run of true cells above
 * it, then take the largest rectangle in that histogram with the usual stack.
 * O(rows x cols).
 */
function maximalRectangle(
  grid: readonly (readonly boolean[])[],
): { r0: number; c0: number; r1: number; c1: number; cells: number } | undefined {
  const rows = grid.length;
  const cols = rows === 0 ? 0 : grid[0]!.length;
  if (rows === 0 || cols === 0) return undefined;

  const heights = new Array<number>(cols).fill(0);
  let best: { r0: number; c0: number; r1: number; c1: number; cells: number } | undefined;

  for (let r = 0; r < rows; r++) {
    const row = grid[r]!;
    for (let c = 0; c < cols; c++) heights[c] = row[c] ? heights[c]! + 1 : 0;

    // A sentinel column of height -1 flushes the stack at the end of the row.
    const stack: number[] = [];
    for (let c = 0; c <= cols; c++) {
      const h = c === cols ? -1 : heights[c]!;
      while (stack.length > 0 && heights[stack[stack.length - 1]!]! > h) {
        const top = stack.pop()!;
        const height = heights[top]!;
        const left = stack.length === 0 ? 0 : stack[stack.length - 1]! + 1;
        const cells = height * (c - left);
        if (height > 0 && (best === undefined || cells > best.cells)) {
          best = { r0: r - height + 1, c0: left, r1: r, c1: c - 1, cells };
        }
      }
      stack.push(c);
    }
  }
  return best;
}

/**
 * Inscribe the largest rectangle this sweep can find.
 *
 * @param resolution cells per side. 96 puts a roughly 0.5 m cell on a 50 m plot,
 * finer than the 2.5 m bay the result will be packed with — a finer grid buys
 * precision the consumer cannot spend.
 */
export function largestInscribedRectangle(ring: Ring, resolution = 96): InscribedRect {
  const ccw = toCounterClockwise(ring);
  const ringArea = area(ccw);
  if (ringArea <= 0) {
    throw new DegenerateGeometryError('cannot inscribe a rectangle in a zero-area ring', {
      areaMm2: ringArea,
    });
  }

  // Exact path: the plot is already a rectangle, so hand it back untouched
  // rather than let a grid shave centimetres off a real boundary.
  const rect = asRectangle(ccw);
  if (rect) {
    const a = rect[0]!;
    const b = rect[1]!;
    const d = rect[3]!;
    const w = Math.round(Math.hypot(b.x - a.x, b.y - a.y));
    const h = Math.round(Math.hypot(d.x - a.x, d.y - a.y));
    return {
      widthMm: asMm(w),
      depthMm: asMm(h),
      angleDeg: Decimal.atan2(new Decimal(b.y - a.y), new Decimal(b.x - a.x))
        .times(DEG)
        .toDecimalPlaces(6),
      originMm: a,
      areaMm2: (w * h) as Mm2,
      coverage: new Decimal(w).times(h).div(ringArea).toDecimalPlaces(6),
      exact: true,
      resolution: 0,
    };
  }

  // Sweep in the MBR frame: it is the orientation a designer would choose, and
  // it bounds the search to one rotation instead of all of them.
  const mbr = minimumBoundingRectangle(ccw);
  const theta = mbr.angleDeg.div(DEG);
  const cos = Decimal.cos(theta);
  const sin = Decimal.sin(theta);

  const local = ccw.map((p) => rotateIntoFrame(p, cos, sin));
  let minU = local[0]!.x;
  let maxU = local[0]!.x;
  let minV = local[0]!.y;
  let maxV = local[0]!.y;
  for (const p of local) {
    if (p.x.lt(minU)) minU = p.x;
    if (p.x.gt(maxU)) maxU = p.x;
    if (p.y.lt(minV)) minV = p.y;
    if (p.y.gt(maxV)) maxV = p.y;
  }

  const cellW = maxU.minus(minU).div(resolution);
  const cellH = maxV.minus(minV).div(resolution);
  if (cellW.lte(0) || cellH.lte(0)) {
    throw new DegenerateGeometryError('ring has no extent in one axis', { areaMm2: ringArea });
  }

  // A cell counts as inside only when its four corners are. Testing the centre
  // alone lets a cell straddle the boundary and the rectangle escape the plot.
  const cornerCache = new Map<string, boolean>();
  const cornerInside = (i: number, j: number): boolean => {
    const key = i + ',' + j;
    const hit = cornerCache.get(key);
    if (hit !== undefined) return hit;
    const u = minU.plus(cellW.times(i));
    const v = minV.plus(cellH.times(j));
    // Back to world space, to test against the ring in its own coordinates.
    const wx = u.times(cos).minus(v.times(sin));
    const wy = u.times(sin).plus(v.times(cos));
    const ok = containsPoint(ccw, {
      x: asMm(Math.round(wx.toNumber())),
      y: asMm(Math.round(wy.toNumber())),
    });
    cornerCache.set(key, ok);
    return ok;
  };

  const inside: boolean[][] = [];
  for (let j = 0; j < resolution; j++) {
    const row: boolean[] = [];
    for (let i = 0; i < resolution; i++) {
      row.push(
        cornerInside(i, j) &&
          cornerInside(i + 1, j) &&
          cornerInside(i, j + 1) &&
          cornerInside(i + 1, j + 1),
      );
    }
    inside.push(row);
  }

  const best = maximalRectangle(inside);
  if (!best) {
    throw new DegenerateGeometryError(
      'no rectangle of one grid cell fits inside this ring; the plot is too narrow ' +
        'or too irregular to lay a parking level out on',
      { areaMm2: ringArea },
    );
  }

  const u0 = minU.plus(cellW.times(best.c0));
  const v0 = minV.plus(cellH.times(best.r0));
  const widthMm = cellW.times(best.c1 - best.c0 + 1);
  const depthMm = cellH.times(best.r1 - best.r0 + 1);

  const ox = u0.times(cos).minus(v0.times(sin));
  const oy = u0.times(sin).plus(v0.times(cos));

  // Floored, not rounded: rounding up would push the rectangle a fraction of a
  // millimetre past the cells that were tested, which is the one thing this
  // routine promises not to do.
  const w = Math.floor(widthMm.toNumber());
  const h = Math.floor(depthMm.toNumber());
  return {
    widthMm: asMm(w),
    depthMm: asMm(h),
    angleDeg: mbr.angleDeg,
    originMm: { x: asMm(Math.round(ox.toNumber())), y: asMm(Math.round(oy.toNumber())) },
    areaMm2: (w * h) as Mm2,
    coverage: new Decimal(w).times(h).div(ringArea).toDecimalPlaces(6),
    exact: false,
    resolution,
  };
}

/**
 * A point given in the rectangle's local millimetres, back in world space.
 *
 * Every drawing consumer needs this, and none of them should be writing the
 * rotation themselves.
 */
export function fromLocal(rect: InscribedRect, xMm: number, yMm: number): Pt {
  const theta = rect.angleDeg.div(DEG);
  const cos = Decimal.cos(theta);
  const sin = Decimal.sin(theta);
  const x = new Decimal(xMm);
  const y = new Decimal(yMm);
  return {
    x: asMm(Math.round(x.times(cos).minus(y.times(sin)).plus(rect.originMm.x).toNumber())),
    y: asMm(Math.round(x.times(sin).plus(y.times(cos)).plus(rect.originMm.y).toNumber())),
  };
}
