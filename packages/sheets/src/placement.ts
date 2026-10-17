/**
 * Where a label ends up when the place it was given is taken.
 *
 * Every label on a sheet is given a place by the code that draws its subject:
 * the aisle's words on the aisle, the core's under the core. Each place was
 * chosen alone, and nothing checked it against the others — so on the worked
 * example's site plan the entrance's label sat on the figure measuring the
 * frontage, and on every ground floor the core's label sat on the door's.
 *
 * This is the pass that checks. It is DRAFTING and nothing else: it moves
 * words, never geometry, and it changes no figure. Its rule is fixed and stated,
 * so the same model always gives the same sheet:
 *
 * 1. Text with no rule here — a dimension's figure, a bay number, a boundary's
 *    words, a section letter, a level datum — is where it was put. Those places
 *    MEAN something (the figure is over its line, the number is in its bay), so
 *    they are laid down first and everything else gives way to them.
 * 2. A label confined to an outline (a room, an aisle, the ramp strip) is only
 *    ever tried at places where it fits wholly inside that outline. If no such
 *    place is clear, a room's or an aisle's name is left off — a lift 2.5 m
 *    across is 5 mm at 1:500 and LIFT is 6.6 mm long at the note height; the
 *    cross drawn in it and the key already say what it is, and a name spilling
 *    into the next room says it worse. A ramp's gradient is kept where it was
 *    put (`withhold: false`), because no key restates it. The lettering is never
 *    shrunk to make anything fit (`lettering.ts`).
 * 3. A movable label is tried where it was put, then stepped along its own line
 *    and across it, half a text height at a time, out to the distance its rule
 *    allows — along first, then across, nearer before farther — and takes the
 *    first place clear of every label already placed and of every dimension
 *    line. If none is clear it stays where it was put, and `textCollisions`
 *    reports it: a sheet is never silently made worse to look better.
 *
 * Not an optimiser. The steps are a fixed ladder taken in a fixed order, and
 * the first clear rung wins — the same discipline as `fitScale`'s ladder of
 * scales. Searching for the "best" arrangement of labels would be the first
 * step towards searching for the best arrangement of the building, which is the
 * `TRADEOFF` work Phase 0 refuses by construction.
 */

import type { ModelPoint } from '@envelope/core';

import { WITNESS_LINES } from './dimensions.js';
import { mm, toPaper } from './plane.js';
import { boxesOverlap, modelTextBox, paperTextBox, segmentCrossesBox, segmentInBox, type TextBox } from './text-box.js';
import type { ModelItem, PaperItem, PaperPoint, Sheet, SheetView, TextItem } from './types.js';

export interface LabelRule {
  /** Paper millimetres the label may slide along its own line, either way. */
  readonly alongMm?: number;
  /** Paper millimetres the label may step across its line, either way. */
  readonly acrossMm?: number;
  /** The outline the label belongs inside: every place it is tried must fit there. */
  readonly within?: readonly ModelPoint[];
  /**
   * With `within`: whether a label that fits nowhere clear inside its outline is
   * left off (the default) or kept where it was put. A room's name is left off —
   * its drafting and the key say what it is. A ramp's gradient is kept: it is
   * the figure Table B.9 caps, and no key restates it.
   */
  readonly withhold?: boolean;
}

/*
  THE RULES TRAVEL BESIDE THE ITEMS, NOT ON THEM. `TextItem` is the display
  list every renderer and the DXF walk; a field on it that only this pass reads
  would be a field three consumers must learn to ignore. So a rule is recorded
  against the item object when the composer creates it, and read back here.
*/
const RULES = new WeakMap<ModelItem, LabelRule>();

/** Mark a label as one the placement pass may move or withhold, and how. */
export function withRule(item: ModelItem, rule: LabelRule): ModelItem {
  RULES.set(item, rule);
  return item;
}

function inside(p: PaperPoint, ring: readonly PaperPoint[]): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

function fitsWithin(box: TextBox, ring: readonly PaperPoint[]): boolean {
  const n = { x: -box.along.y, y: box.along.x };
  for (const [i, j] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ] as const) {
    const c = {
      x: box.centre.x + box.along.x * box.halfLength * i + n.x * box.halfHeight * j,
      y: box.centre.y + box.along.y * box.halfLength * i + n.y * box.halfHeight * j,
    };
    if (!inside(c, ring)) return false;
  }
  return true;
}

/** The fixed ladder of offsets, in steps: along +1, −1, +2, −2 … then across the same way. */
function ladder(alongSteps: number, acrossSteps: number): readonly (readonly [number, number])[] {
  const out: [number, number][] = [[0, 0]];
  for (let k = 1; k <= alongSteps; k += 1) out.push([k, 0], [-k, 0]);
  for (let k = 1; k <= acrossSteps; k += 1) {
    out.push([0, k], [0, -k]);
    for (let a = 1; a <= alongSteps; a += 1) out.push([a, k], [-a, k], [a, -k], [-a, -k]);
  }
  return out;
}

/**
 * The sheet's items with every movable label settled and every confined label
 * that does not fit withheld. Items keep their order: the renderers draw in it.
 */
export function settleLabels(
  items: readonly ModelItem[],
  view: SheetView,
  viewport: Sheet['viewport'],
  paperItems: readonly PaperItem[] = [],
): ModelItem[] {
  // The scale bar's figures and the north arrow's letters sit on the drawing too.
  const placed: TextBox[] = paperItems
    .filter((p): p is Extract<PaperItem, { kind: 'text' }> => p.kind === 'text')
    .map(paperTextBox);
  const lines: (readonly [PaperPoint, PaperPoint])[] = [];
  const witnesses: (readonly [PaperPoint, PaperPoint])[] = [];
  for (const item of items) {
    if (item.kind === 'shape' && item.role === 'dimension' && item.points.length >= 2) {
      (WITNESS_LINES.has(item) ? witnesses : lines).push([toPaper(view, item.points[0]!), toPaper(view, item.points[1]!)]);
    }
    if (item.kind === 'text' && !RULES.has(item)) placed.push(modelTextBox(item, view));
  }

  const frame: PaperPoint[] = [
    { x: viewport.x, y: viewport.y },
    { x: viewport.x + viewport.width, y: viewport.y },
    { x: viewport.x + viewport.width, y: viewport.y + viewport.height },
    { x: viewport.x, y: viewport.y + viewport.height },
  ];
  const free = (box: TextBox): boolean =>
    !placed.some((p) => boxesOverlap(box, p)) && !lines.some(([a, b]) => segmentCrossesBox(a, b, box));
  // Clear of witness lines as well, where the ladder finds such a place; failing
  // that, clear of everything else, and the witness line is broken under it.
  const tests = [
    (box: TextBox): boolean => free(box) && !witnesses.some(([a, b]) => segmentCrossesBox(a, b, box)),
    free,
  ];

  const out: ModelItem[] = [];
  for (const item of items) {
    const rule = RULES.get(item);
    if (item.kind !== 'text' || !rule) {
      out.push(item);
      continue;
    }
    const settled = settle(item, rule, view, tests, frame);
    if (settled === null) continue;
    placed.push(modelTextBox(settled, view));
    out.push(settled);
  }
  return breakWitnessLines(out, view);
}

/** Clear air left between a broken witness line and the label it stops for, in paper mm. */
const BREAK_MM = 0.6;

/*
  A WITNESS LINE STOPS SHORT OF A LABEL rather than running through it — how a
  draughtsman breaks an extension line to clear text. The module dimension on a
  parking sheet sits past the slab edge, so its witness lines cross whatever lies
  between the aisle and the edge — on most plots the ramp, whose gradient is the
  one figure printed there. The figure keeps its place beside the arrow, and the
  line it measures is interrupted, never moved: the stops are the engine's.
*/
function breakWitnessLines(items: readonly ModelItem[], view: SheetView): ModelItem[] {
  const labels = items
    .filter((i): i is TextItem => i.kind === 'text' && i.role !== 'dimension')
    .map((t) => modelTextBox(t, view));
  const out: ModelItem[] = [];
  for (const item of items) {
    if (item.kind !== 'shape' || !WITNESS_LINES.has(item) || item.points.length !== 2) {
      out.push(item);
      continue;
    }
    const [p, q] = item.points as readonly [ModelPoint, ModelPoint];
    const a = toPaper(view, p);
    const b = toPaper(view, q);
    const gaps = labels
      .map((box) => segmentInBox(a, b, box, BREAK_MM))
      .filter((g): g is readonly [number, number] => g !== null)
      .sort((x, y) => x[0] - y[0]);
    if (gaps.length === 0) {
      out.push(item);
      continue;
    }
    let t = 0;
    const at = (u: number): ModelPoint => mm(p.x + (q.x - p.x) * u, p.y + (q.y - p.y) * u);
    for (const [g0, g1] of gaps) {
      if (g0 > t) out.push({ ...item, points: [at(t), at(g0)] });
      t = Math.max(t, g1);
    }
    if (t < 1) out.push({ ...item, points: [at(t), q] });
  }
  return out;
}

function settle(
  item: TextItem,
  rule: LabelRule,
  view: SheetView,
  tests: readonly ((b: TextBox) => boolean)[],
  frame: readonly PaperPoint[],
): TextItem | null {
  for (const clear of tests) {
    const found = climb(item, rule, view, clear, frame);
    if (found) return found;
  }
  const ring = rule.within ? rule.within.map((p) => toPaper(view, p)) : null;
  if (ring && (rule.withhold ?? true)) return null;
  return item;
}

function climb(
  item: TextItem,
  rule: LabelRule,
  view: SheetView,
  clear: (b: TextBox) => boolean,
  frame: readonly PaperPoint[],
): TextItem | null {
  const step = item.sizeMm / 2;
  const rad = (item.rotationDeg * Math.PI) / 180;
  // In model millimetres: one step along the text and one across it.
  const along = { x: Math.cos(rad) * step * view.scale, y: Math.sin(rad) * step * view.scale };
  const across = { x: -Math.sin(rad) * step * view.scale, y: Math.cos(rad) * step * view.scale };
  const ring = rule.within ? rule.within.map((p) => toPaper(view, p)) : null;
  const rungs = ladder(Math.floor((rule.alongMm ?? 0) / step), Math.floor((rule.acrossMm ?? 0) / step));
  for (const [a, c] of rungs) {
    const moved = a !== 0 || c !== 0;
    const candidate: TextItem = moved
      ? { ...item, at: mm(item.at.x + along.x * a + across.x * c, item.at.y + along.y * a + across.y * c) }
      : item;
    const box = modelTextBox(candidate, view);
    if (ring && !fitsWithin(box, ring)) continue;
    // A label is moved only to where the sheet will print it: never into the clip.
    if (moved && !fitsWithin(box, frame)) continue;
    if (clear(box)) return candidate;
  }
  return null;
}
