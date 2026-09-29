/**
 * Dimension strings — witness lines, terminators, and the figure above the line.
 *
 * Eng. Mohamed, 2026-09-28, on what he wants out of the product:
 * *"عايزين بعدين نقدر نحملها pdf او كاد او ريفيت"*. A file an architect opens in
 * AutoCAD is judged on its drafting before anything else, and an undimensioned
 * plan is not a drawing — it is a picture of one.
 *
 * ---
 *
 * **A dimension prints a figure; it does not produce one.** Every label here
 * arrives from the caller, and every caller takes it from the model: a boundary's
 * length is `ModelEdge.lengthMm`, a bay's is the standard the engine cited. What
 * this file works out is *where the ink goes* — which is the same division of
 * labour the rest of `packages/sheets` keeps. A dimension text measured off the
 * drawing would be a second opinion about a number the engine already holds, and
 * the day the two disagreed the drawing would win, silently, in a CAD file.
 *
 * **The chain is one object, not a row of arrows.** Witness lines start clear of
 * the feature and run past the dimension line, the terminators are the
 * architectural 45° slash rather than an arrowhead, the line runs from the first
 * stop to the last, and each segment carries its own figure. An "overall" chain
 * is a chain with two stops; an "intermediate" chain is the same call with the
 * stops in between. There is no second code path for the two, because a drawing
 * where the overall and the intermediates disagree is the defect dimension
 * strings exist to prevent.
 *
 * **Everything is in paper millimetres, scaled at the door.** A witness-line gap
 * is 1 mm on paper whether the sheet is 1:100 or 1:2000 — §4.9's annotation-scale
 * independence, which is why `scale` is an input rather than a constant.
 */

import type { ModelPoint } from '@envelope/core';

import { angleOf, midpointOf, offsetPoint, readable } from './plane.js';
import { type ModelItem, Role } from './types.js';

/** Drafting conventions, in paper millimetres, in one place. */
export const DIM = {
  /** Between the feature and where its witness line starts. */
  gapMm: 1,
  /** How far a witness line runs past the dimension line. */
  overMm: 1.5,
  /** Half the length of the terminator slash. */
  tickMm: 1.2,
  /** Text height. */
  textMm: 2,
  /** Clear of the dimension line, on the same side as the chain. */
  liftMm: 1.1,
} as const;

export interface ChainStyle {
  /** Model millimetres per paper millimetre — the sheet's scale denominator. */
  readonly scale: number;
  /** Unit vector towards the side the chain is drawn on. */
  readonly out: { readonly x: number; readonly y: number };
  /** Paper millimetres from the measured line to the dimension line. */
  readonly offsetMm: number;
  readonly textMm?: number;
}

/** Metres to two decimals, the way a drawing writes a length. */
export const metres = (lengthMm: number): string => `${(lengthMm / 1000).toFixed(2)} M`;

/**
 * One dimension chain: `stops.length - 1` segments, each with its own figure.
 *
 * Throws rather than drawing a chain whose figures do not match its stops. A
 * dimension line with a missing figure is a drawing a reader trusts and cannot
 * check, which is worse than no dimension at all.
 */
export function dimensionChain(
  stops: readonly ModelPoint[],
  labels: readonly string[],
  style: ChainStyle,
): ModelItem[] {
  if (stops.length < 2) return [];
  if (labels.length !== stops.length - 1) {
    throw new Error(
      `a dimension chain over ${stops.length} stops needs ${stops.length - 1} figures, ` +
        `and was given ${labels.length}`,
    );
  }
  const s = style.scale;
  const out = style.out;
  const off = style.offsetMm * s;
  const items: ModelItem[] = [];
  const line = (a: ModelPoint, b: ModelPoint): void => {
    items.push({ kind: 'shape', role: Role.DIMENSION, points: [a, b], closed: false });
  };

  // Witness lines: clear of the feature, past the dimension line.
  for (const p of stops) {
    line(offsetPoint(p, out, DIM.gapMm * s), offsetPoint(p, out, off + DIM.overMm * s));
  }

  const first = offsetPoint(stops[0]!, out, off);
  const last = offsetPoint(stops[stops.length - 1]!, out, off);
  line(first, last);

  // Terminators: the 45° slash, bisecting the run and the witness line. An
  // arrowhead needs a fill and a size that survives a photocopier; a slash is two
  // points and reads at every scale on the ladder.
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const run = Math.hypot(dx, dy) || 1;
  const slashX = dx / run + out.x;
  const slashY = dy / run + out.y;
  const slash = Math.hypot(slashX, slashY) || 1;
  const tick = { x: slashX / slash, y: slashY / slash };
  for (const p of stops) {
    const q = offsetPoint(p, out, off);
    line(offsetPoint(q, tick, -DIM.tickMm * s), offsetPoint(q, tick, DIM.tickMm * s));
  }

  // The figures, above the line and reading left to right.
  const textMm = style.textMm ?? DIM.textMm;
  for (let i = 0; i < labels.length; i += 1) {
    const a = offsetPoint(stops[i]!, out, off);
    const b = offsetPoint(stops[i + 1]!, out, off);
    items.push({
      kind: 'text',
      role: Role.DIMENSION,
      at: offsetPoint(midpointOf(a, b), out, DIM.liftMm * s),
      value: labels[i]!,
      sizeMm: textMm,
      rotationDeg: readable(angleOf(a, b)),
      anchor: 'middle',
    });
  }
  return items;
}
