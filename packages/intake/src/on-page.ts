/**
 * WHERE THE PLOT'S DRAWING SITS ON THE PAGE, IN GROUND METRES.
 *
 * Eng. Mohamed, 16 Oct 2026, over the map with the sheet laid under it: the
 * picture should sit exactly on the drawn plot by itself, cropped by itself,
 * and still be adjustable. Until now the sheet went down "placed by eye" — the
 * middle of the view, an assumed width, no rotation — on two kinds of sheet
 * whose drawings already say exactly where they are:
 *
 *   - THE MUNICIPALITY'S prints grid crosses labelled in eastings and
 *     northings. `readDmGrid` reads them into a scale per axis; it was used to
 *     put the plot's corners on the grid and then thrown away.
 *   - THE DDA'S prints a coordinate table AND draws the same plot as a path.
 *     On plot 5134565 one path's six corners fit the table's six to 3.8 mm
 *     (RMS) under a single rotation and scale, which is the drawing's own
 *     placement, measured.
 *
 * Either way the page is placed by an affine map from PDF points to grid
 * metres, published with what it was read from and how well it holds. It
 * PLACES A PICTURE and changes no figure: the plot's area and legs come from
 * the table or the drawn ring exactly as before, and no number the engine
 * computes reads this.
 */

import type { DmGrid, Path } from './dm.js';
import type { SurveyPoint } from './dda.js';

/**
 * Page points (PDF user space: x right, y UP) to metres on the sheet's grid:
 * `e = ax·x + bx·y + cx`, `n = ay·x + by·y + cy`.
 */
export interface PagePlacement {
  readonly ax: number;
  readonly bx: number;
  readonly cx: number;
  readonly ay: number;
  readonly by: number;
  readonly cy: number;
  /** The subject plot's bounding box on the page, PDF points — what a crop is centred on. */
  readonly plotBoxPt: readonly [number, number, number, number];
  /** The page itself, PDF points. */
  readonly pageBoxPt: readonly [number, number, number, number];
  /**
   * The drawing's own frame round the plot, PDF points — no crop goes past it,
   * so the title block, the tables and the location maps stay off the map.
   * The page where a side has no frame line.
   */
  readonly frameBoxPt: readonly [number, number, number, number];
  /** How far the drawn corners sit from the grid's own, root-mean-square, metres. */
  readonly residualM: number;
  /** What the placement was read from, in words. */
  readonly basis: string;
}

/** The Municipality's grid as a placement: north-up, one scale per axis, nothing fitted. */
export function placementFromGrid(
  grid: DmGrid,
  plotBoxPt: readonly [number, number, number, number],
  pageBoxPt: readonly [number, number, number, number],
  paths: readonly Path[],
): PagePlacement {
  return {
    frameBoxPt: drawingFrame(paths, plotBoxPt, pageBoxPt),
    ax: grid.sx,
    bx: 0,
    cx: grid.e0 - grid.x0 * grid.sx,
    ay: 0,
    by: grid.sy,
    cy: grid.n0 - grid.y0 * grid.sy,
    plotBoxPt,
    pageBoxPt,
    // `readDmGrid` refuses a cross more than 0.5 m off its fit; that is the bound.
    residualM: 0,
    basis: `the drawing's grid crosses (${grid.box.text})`,
  };
}

/** A drawn ring may sit this far from the table's, RMS, and still be the plot: ten centimetres. */
const MATCH_RMS_M = 0.1;

/**
 * The path on the page that IS the surveyed plot, and the placement it gives.
 *
 * Every path with as many corners as the table is fitted to it — every
 * starting corner, both directions — by least-squares similarity (one
 * rotation, one scale, one shift). The best fit is kept only within ten
 * centimetres RMS: a path that merely resembles the plot (a neighbour drawn
 * with the same number of corners) does not get to place the picture.
 */
export function matchDrawnRing(
  paths: readonly Path[],
  points: readonly SurveyPoint[],
  pageBoxPt: readonly [number, number, number, number],
): PagePlacement | undefined {
  const G = points.map((p) => [Number(p.east), Number(p.north)] as const);
  const n = G.length;
  if (n < 3 || G.some(([e, nn]) => !Number.isFinite(e) || !Number.isFinite(nn))) return undefined;
  const mg = G.reduce((a, g) => [a[0] + g[0] / n, a[1] + g[1] / n] as const, [0, 0] as const);

  let best: { rms: number; a: number; b: number; mp: readonly [number, number]; ring: readonly (readonly [number, number])[] } | undefined;
  for (const path of paths) {
    const ring = closedRing(path.points);
    if (ring.length !== n) continue;
    for (const dir of [ring, [...ring].reverse()]) {
      for (let k = 0; k < n; k += 1) {
        const P = [...dir.slice(k), ...dir.slice(0, k)];
        const mp = P.reduce((a, p) => [a[0] + p[0] / n, a[1] + p[1] / n] as const, [0, 0] as const);
        // The similarity as a complex number a + ib: least squares has a closed form.
        let re = 0;
        let im = 0;
        let pp = 0;
        P.forEach((p, i) => {
          const px = p[0] - mp[0];
          const py = p[1] - mp[1];
          const gx = G[i]![0] - mg[0];
          const gy = G[i]![1] - mg[1];
          re += px * gx + py * gy;
          im += px * gy - py * gx;
          pp += px * px + py * py;
        });
        if (pp === 0) continue;
        const a = re / pp;
        const b = im / pp;
        let ss = 0;
        P.forEach((p, i) => {
          const px = p[0] - mp[0];
          const py = p[1] - mp[1];
          ss += (a * px - b * py + mg[0] - G[i]![0]) ** 2 + (b * px + a * py + mg[1] - G[i]![1]) ** 2;
        });
        const rms = Math.sqrt(ss / n);
        if (!best || rms < best.rms) best = { rms, a, b, mp, ring: P };
      }
    }
  }
  if (!best || best.rms > MATCH_RMS_M) return undefined;
  const { a, b, mp } = best;
  const xs = best.ring.map((p) => p[0]);
  const ys = best.ring.map((p) => p[1]);
  const plotBoxPt = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] as const;
  return {
    frameBoxPt: drawingFrame(paths, plotBoxPt, pageBoxPt),
    ax: a,
    bx: -b,
    cx: mg[0] - a * mp[0] + b * mp[1],
    ay: b,
    by: a,
    cy: mg[1] - b * mp[0] - a * mp[1],
    plotBoxPt,
    pageBoxPt,
    residualM: Number(best.rms.toFixed(4)),
    basis: `the plot as drawn, matched corner for corner to the sheet's coordinate table`,
  };
}

/** A frame line is long: a third of an A3 sheet's short side. Shorter strokes are dimension lines and kerbs. */
const FRAME_LINE_MIN_PT = 250;

/**
 * The frame the drawing is drawn in, read from the page's long straight lines.
 *
 * On each side of the plot, the nearest axis-parallel line at least
 * FRAME_LINE_MIN_PT long that spans the plot's whole extent across it. On the
 * Municipality's sheet that is the map frame, a rectangle; on the DDA's it is
 * four separate strokes between the drawing and its PLOT DETAILS panel. A side
 * with no such line falls back to the page edge, so the crop is never smaller
 * than the drawing because of a missing line.
 */
export function drawingFrame(
  paths: readonly Path[],
  plot: readonly [number, number, number, number],
  page: readonly [number, number, number, number],
): readonly [number, number, number, number] {
  const [x0, y0, x1, y1] = plot;
  let [left, bottom, right, top] = page;
  for (const path of paths) {
    for (let k = 0; k + 1 < path.points.length; k += 1) {
      const [ax, ay] = path.points[k]!;
      const [bx, by] = path.points[k + 1]!;
      if (Math.abs(ax - bx) < 0.5 && Math.abs(ay - by) >= FRAME_LINE_MIN_PT && Math.min(ay, by) <= y0 && Math.max(ay, by) >= y1) {
        if (ax < x0 && ax > left) left = ax;
        if (ax > x1 && ax < right) right = ax;
      }
      if (Math.abs(ay - by) < 0.5 && Math.abs(ax - bx) >= FRAME_LINE_MIN_PT && Math.min(ax, bx) <= x0 && Math.max(ax, bx) >= x1) {
        if (ay < y0 && ay > bottom) bottom = ay;
        if (ay > y1 && ay < top) top = ay;
      }
    }
  }
  return [left, bottom, right, top];
}

/** A path's corners with the repeated closing point taken off. */
function closedRing(points: readonly (readonly [number, number])[]): readonly (readonly [number, number])[] {
  const out = [...points];
  const first = out[0];
  const last = out[out.length - 1];
  if (first && last && out.length > 1 && Math.hypot(first[0] - last[0], first[1] - last[1]) <= 0.01) out.pop();
  return out;
}
