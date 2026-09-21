/**
 * The sheet's paper furniture: frame, title strip, scale bar, north arrow.
 *
 * Laid out on A3 landscape in paper millimetres. The title strip is on the right,
 * full height, which is how the client's own sheets are bound, and it carries the
 * two sentences every sheet carries whatever it draws — NOT FOR CONSTRUCTION, and
 * REGULATORY VALIDITY: NOT ASSESSED — at the bottom, above the sheet number, where
 * a reader looking for the number cannot miss them.
 */

import type { ProvenanceClass } from '@envelope/core';

import type { PaperItem, PaperPoint, PaperRole, Role, SheetMeta, StripFact } from './types.js';

export const PAPER = { widthMm: 420, heightMm: 297 } as const;

const FRAME = { x0: 10, y0: 10, x1: 410, y1: 287 } as const;
const STRIP = { x0: 322, x1: 410, pad: 4 } as const;

/** Where the model is drawn. Labels may sit in its margin; nothing is clipped. */
export const VIEWPORT = { x: 16, y: 16, width: 300, height: 265 } as const;

export interface LegendEntry {
  readonly role: Role;
  readonly provenanceClass?: ProvenanceClass;
  readonly label: string;
}

export interface StripInput {
  readonly title: string;
  readonly number: string;
  readonly scale: number;
  readonly meta: SheetMeta;
  readonly facts: readonly StripFact[];
  readonly legend: readonly LegendEntry[];
  readonly north: boolean;
}

/** Average glyph advance for IBM Plex Sans, as a fraction of the text height. */
const ADVANCE = 0.56;

/** Break `text` into lines no wider than `widthMm` at `sizeMm`. Words are not split. */
export function wrap(text: string, sizeMm: number, widthMm: number): string[] {
  const perLine = Math.max(8, Math.floor(widthMm / (sizeMm * ADVANCE)));
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (!word) continue;
    const next = line ? `${line} ${word}` : word;
    if (next.length > perLine && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const text = (
  role: PaperRole,
  at: PaperPoint,
  value: string,
  sizeMm: number,
  bold = false,
  anchor: 'start' | 'middle' | 'end' = 'start',
  provenanceClass?: ProvenanceClass,
): PaperItem => ({
  kind: 'text',
  role,
  at,
  value,
  sizeMm,
  anchor,
  bold,
  ...(provenanceClass ? { provenanceClass } : {}),
});

const rule = (y: number): PaperItem => ({
  kind: 'poly',
  role: 'rule',
  points: [
    { x: STRIP.x0, y },
    { x: STRIP.x1, y },
  ],
  closed: false,
});

const box = (role: PaperRole, x: number, y: number, w: number, h: number): PaperItem => ({
  kind: 'poly',
  role,
  points: [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ],
  closed: true,
});

/** How an assumed figure is said in words as well as in amber — §13.1, twice. */
const CLASS_WORD: Partial<Record<ProvenanceClass, string>> = {
  ASSUMED: 'ASSUMED',
  USER_SET: 'ENTERED',
};

export function paperFurniture(input: StripInput): PaperItem[] {
  const items: PaperItem[] = [];
  const left = STRIP.x0 + STRIP.pad;
  const width = STRIP.x1 - STRIP.x0 - 2 * STRIP.pad;

  items.push(box('frame', FRAME.x0, FRAME.y0, FRAME.x1 - FRAME.x0, FRAME.y1 - FRAME.y0));
  items.push({
    kind: 'poly',
    role: 'frame',
    points: [
      { x: STRIP.x0, y: FRAME.y0 },
      { x: STRIP.x0, y: FRAME.y1 },
    ],
    closed: false,
  });

  // --- top: what this is and which run ---------------------------------------------
  let y = FRAME.y0 + 8;
  items.push(text('heading', { x: left, y }, 'TOP.ai', 4, true));
  y += 5;
  items.push(text('label', { x: left, y }, 'DEVELOPMENT CAPACITY STUDY', 2.2));
  y += 4;
  items.push(rule(y));
  y += 6;
  items.push(text('label', { x: left, y }, 'PLOT', 2));
  y += 5;
  items.push(text('value', { x: left, y }, input.meta.plotNumber, 3.6, true));
  y += 4.6;
  for (const line of wrap(input.meta.community, 2.4, width)) {
    items.push(text('value', { x: left, y }, line, 2.4));
    y += 3.4;
  }
  y += 1.4;
  items.push(text('label', { x: left, y }, 'RUN', 2));
  y += 3.6;
  items.push(text('value', { x: left, y }, input.meta.runId, 2.2));
  y += 3;
  items.push(rule(y));
  y += 6;

  // --- the facts this sheet quotes -----------------------------------------------------
  for (const fact of input.facts) {
    items.push(text('label', { x: left, y }, fact.label.toUpperCase(), 2));
    y += 4.2;
    const word = fact.provenanceClass ? CLASS_WORD[fact.provenanceClass] : undefined;
    const value = word ? `${fact.value} · ${word}` : fact.value;
    for (const line of wrap(value, 3, width)) {
      items.push(text('value', { x: left, y }, line, 3, false, 'start', fact.provenanceClass));
      y += 4;
    }
    y += 1.6;
  }
  items.push(rule(y));
  y += 5;

  // --- legend -----------------------------------------------------------------------------
  items.push(text('label', { x: left, y }, 'LEGEND', 2));
  y += 3;
  for (const entry of input.legend) {
    items.push({
      ...box('swatch', left, y, 9, 4),
      swatch: { role: entry.role, ...(entry.provenanceClass ? { provenanceClass: entry.provenanceClass } : {}) },
    } as PaperItem);
    const lines = wrap(entry.label, 2.2, width - 12);
    lines.forEach((line, i) => items.push(text('note', { x: left + 12, y: y + 3 + i * 3 }, line, 2.2)));
    y += Math.max(6, lines.length * 3 + 2.5);
  }

  // --- bottom: the two sentences, the title, the number ------------------------------------
  let b = FRAME.y1 - 5;
  items.push(text('value', { x: STRIP.x1 - STRIP.pad, y: b }, `1:${input.scale} @ A3`, 3, false, 'end'));
  items.push(text('title', { x: left, y: b }, input.number, 6, true));
  b -= 10;
  const titleLines = wrap(input.title.toUpperCase(), 4, width);
  for (let i = titleLines.length - 1; i >= 0; i -= 1) {
    items.push(text('title', { x: left, y: b }, titleLines[i]!, 4, true));
    b -= 5.4;
  }
  items.push(rule(b));
  b -= 5;
  items.push(text('warning', { x: left, y: b }, 'REGULATORY VALIDITY: NOT ASSESSED', 2.6, true));
  b -= 4.4;
  items.push(text('warning', { x: left, y: b }, 'NOT FOR CONSTRUCTION', 2.6, true));
  b -= 4;
  items.push(rule(b));

  items.push(...scaleBar(input.scale));
  if (input.north) items.push(...northArrow());
  return items;
}

/** A graphic scale: the one dimension that survives a photocopier's resize. */
function scaleBar(scale: number): PaperItem[] {
  // The longest round length in metres that stays under 60 mm of paper.
  const candidates = [2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
  let lengthM = candidates[0]!;
  for (const c of candidates) if ((c * 1000) / scale <= 60) lengthM = c;
  const total = (lengthM * 1000) / scale;
  const x0 = VIEWPORT.x;
  const y0 = VIEWPORT.y + VIEWPORT.height - 4;
  const items: PaperItem[] = [];
  for (let i = 0; i < 4; i += 1) {
    items.push(box(i % 2 === 0 ? 'scale-bar-fill' : 'scale-bar', x0 + (i * total) / 4, y0, total / 4, 1.6));
  }
  items.push(text('label', { x: x0, y: y0 - 1.4 }, '0', 2, false, 'middle'));
  items.push(text('label', { x: x0 + total / 2, y: y0 - 1.4 }, String(lengthM / 2), 2, false, 'middle'));
  items.push(text('label', { x: x0 + total, y: y0 - 1.4 }, `${lengthM} m`, 2, false, 'middle'));
  return items;
}

/**
 * Grid north, and it says so.
 *
 * Plot coordinates are UTM 40N, so +y is grid north (`domain.ts`). True north
 * differs from it by the grid convergence, which the engine does not compute; an
 * arrow labelled only "N" would claim it had.
 */
function northArrow(): PaperItem[] {
  const cx = VIEWPORT.x + VIEWPORT.width - 8;
  const top = VIEWPORT.y + 2;
  return [
    {
      kind: 'poly',
      role: 'north',
      points: [
        { x: cx, y: top },
        { x: cx + 3.2, y: top + 11 },
        { x: cx, y: top + 8.6 },
        { x: cx - 3.2, y: top + 11 },
      ],
      closed: true,
    },
    text('label', { x: cx, y: top + 15.5 }, 'N', 3, true, 'middle'),
    text('label', { x: cx, y: top + 18.5 }, 'GRID', 1.8, false, 'middle'),
  ];
}
