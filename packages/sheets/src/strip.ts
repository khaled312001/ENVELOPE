/**
 * The sheet's paper furniture: frame, title strip, scale bar, north arrow.
 *
 * Laid out on A3 landscape in paper millimetres. The title strip is on the right,
 * full height, which is how the client's own sheets are bound, and it carries the
 * two sentences every sheet carries whatever it draws — NOT FOR CONSTRUCTION, and
 * REGULATORY VALIDITY: NOT ASSESSED — at the bottom, above the sheet number, where
 * a reader looking for the number cannot miss them.
 *
 * Every value in the strip is a NAMED FIELD (`TitleField`), not a run of text a
 * consumer has to recognise. That is FreeCAD TechDraw's `freecad:editable`
 * convention and §4.9's first item, and it pays for itself immediately: the
 * sheet count is filled in by key after the strip is laid out, because only the
 * set knows how many sheets are in it.
 */

import type { ProvenanceClass } from '@envelope/core';

import { SYMBOLS } from './symbols.js';
import {
  type LegendEntry,
  type PaperItem,
  type PaperPoint,
  type PaperPoly,
  type PaperRole,
  type PaperText,
  type Role,
  type SheetMeta,
  type StripFact,
  type SymbolName,
  TitleField,
} from './types.js';

export const PAPER = { widthMm: 420, heightMm: 297 } as const;

const FRAME = { x0: 10, y0: 10, x1: 410, y1: 287 } as const;
const STRIP = { x0: 322, x1: 410, pad: 4 } as const;

/** Where the model is drawn. Labels may sit in its margin; nothing is clipped. */
export const VIEWPORT = { x: 16, y: 16, width: 300, height: 265 } as const;

export interface StripInput {
  readonly title: string;
  readonly number: string;
  readonly scale: number;
  readonly meta: SheetMeta;
  readonly facts: readonly StripFact[];
  readonly legend: readonly LegendEntry[];
  /**
   * Sentences printed under the legend: how the bays are numbered, what is NOT
   * drawn, where the CAD layers come from. A key that names the inks and leaves
   * the scheme unsaid has answered the easy half of §4.9 item 8.
   */
  readonly legendNotes?: readonly string[];
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
): PaperText => ({
  kind: 'text',
  role,
  at,
  value,
  sizeMm,
  anchor,
  bold,
  ...(provenanceClass ? { provenanceClass } : {}),
});

/** The same text, carrying the name of the field it is. */
const keyed = (t: PaperText, field: TitleField): PaperText => ({ ...t, field });

const rule = (y: number): PaperPoly => ({
  kind: 'poly',
  role: 'rule',
  points: [
    { x: STRIP.x0, y },
    { x: STRIP.x1, y },
  ],
  closed: false,
});

const box = (role: PaperRole, x: number, y: number, w: number, h: number): PaperPoly => ({
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


/**
 * A legend row that shows a symbol rather than a colour.
 *
 * Fitted into the swatch box from the symbol's own extent, so a car and an
 * arrow — one drawn in millimetres, the other in units of length — both land
 * the same size on paper without either being retyped here. The y axis flips:
 * a symbol is defined in model space, where y is north, and paper's y is down.
 */
function symbolSwatch(
  symbol: SymbolName,
  role: Role,
  x: number,
  y: number,
  w: number,
  h: number,
): PaperPoly[] {
  const lines = SYMBOLS[symbol].polylines;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const line of lines) {
    for (const [px, py] of line.points) {
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
    }
  }
  const k = Math.min(w / (maxX - minX || 1), h / (maxY - minY || 1));
  const cx = x + w / 2 - ((minX + maxX) / 2) * k;
  const cy = y + h / 2 + ((minY + maxY) / 2) * k;
  return lines.map((line) => ({
    kind: 'poly' as const,
    role: 'swatch' as const,
    points: line.points.map(([px, py]) => ({ x: cx + px * k, y: cy - py * k })),
    closed: line.closed,
    swatch: { role },
  }));
}

/** A label-over-value row of the issue block, in paper millimetres. */
const FIELD_ROW = 8.2;

/** What CHECKED says when nobody has signed G4. It is a fact, not a blank box. */
export const NOT_CHECKED = 'NOT CHECKED';

/** What SHEET holds until `composeSheets`, which alone knows the set size, fills it. */
export const UNFILLED = '-';

/**
 * The issue date, as a title block prints it.
 *
 * ISO order on purpose. The set is read in English and in Arabic, and 09/10/2026
 * is two different days depending on who is holding the page.
 */
export function issueDate(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : 'NOT RECORDED';
}

/**
 * The revision table has one row, and this is why.
 *
 * A revision amends an issued drawing. Nothing in this product amends one:
 * `StoredRun.parentRunId` is in the schema and is null on every run ever
 * written, because editing an assumption computes a NEW run with a new number.
 * So the table states the one revision there is and names what identifies an
 * issue. Printing REV A / REV B rows out of a history nobody keeps would be the
 * same defect as a level schedule synthesised to make INV-01 pass.
 */
export const REVISION_NOTE =
  'No revision history is kept. A recomputation is a new run with a new run number, and ' +
  'the run number above is what identifies this issue.';

/**
 * A label over its value, the value KEYED — §4.9 item 1.
 *
 * The key is on the value and not on the label because the value is the part
 * anything downstream reads or replaces. A wrapped value keys its first line
 * only: a field is one value, not a paragraph.
 */
function fieldRows(
  field: TitleField,
  label: string,
  value: string,
  x: number,
  y: number,
  widthMm: number,
): PaperItem[] {
  const out: PaperItem[] = [text('label', { x, y }, label, 2)];
  wrap(value, 2.6, widthMm).forEach((line, i) => {
    const t = text('value', { x, y: y + 4.2 + i * 3.6 }, line, 2.6, true);
    out.push(i === 0 ? keyed(t, field) : t);
  });
  return out;
}

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
  items.push(keyed(text('heading', { x: left, y }, 'TOP.ai', 4, true), TitleField.PROJECT));
  y += 5;
  items.push(text('label', { x: left, y }, 'DEVELOPMENT CAPACITY STUDY', 2.2));
  y += 4;
  items.push(rule(y));
  y += 6;
  items.push(text('label', { x: left, y }, 'PLOT', 2));
  y += 5;
  items.push(keyed(text('value', { x: left, y }, input.meta.plotNumber, 3.6, true), TitleField.PLOT));
  y += 4.6;
  wrap(input.meta.community, 2.4, width).forEach((line, i) => {
    const t = text('value', { x: left, y }, line, 2.4);
    items.push(i === 0 ? keyed(t, TitleField.COMMUNITY) : t);
    y += 3.4;
  });
  y += 1.4;
  items.push(text('label', { x: left, y }, 'RUN', 2));
  y += 3.6;
  items.push(keyed(text('value', { x: left, y }, input.meta.runId, 2.2), TitleField.RUN));
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
    if (entry.symbol) {
      items.push(...symbolSwatch(entry.symbol, entry.role, left, y, 9, 4));
    } else {
      items.push({
        ...box('swatch', left, y, 9, 4),
        swatch: { role: entry.role, ...(entry.provenanceClass ? { provenanceClass: entry.provenanceClass } : {}) },
      });
    }
    const lines = wrap(entry.label, 2.2, width - 12);
    lines.forEach((line, i) => items.push(text('note', { x: left + 12, y: y + 3 + i * 3 }, line, 2.2)));
    y += Math.max(5.4, lines.length * 3 + 2.4);
  }

  // The scheme, under the key: how a bay number is arrived at, what is not
  // drawn at all, and where the DXF's layer names come from.
  for (const note of input.legendNotes ?? []) {
    y += 1.2;
    for (const line of wrap(note, 2, width)) {
      items.push(text('note', { x: left, y }, line, 2));
      y += 2.8;
    }
  }

  // --- bottom: the two sentences, the title, the number ------------------------------------
  let b = FRAME.y1 - 5;
  items.push(
    keyed(
      text('value', { x: STRIP.x1 - STRIP.pad, y: b }, `1:${input.scale} @ A3`, 3, false, 'end'),
      TitleField.SCALE,
    ),
  );
  items.push(keyed(text('title', { x: left, y: b }, input.number, 6, true), TitleField.NUMBER));
  b -= 10;
  const titleLines = wrap(input.title.toUpperCase(), 4, width);
  for (let i = titleLines.length - 1; i >= 0; i -= 1) {
    const line = text('title', { x: left, y: b }, titleLines[i]!, 4, true);
    items.push(i === 0 ? keyed(line, TitleField.TITLE) : line);
    b -= 5.4;
  }
  items.push(rule(b));
  b -= 5;
  items.push(text('warning', { x: left, y: b }, 'REGULATORY VALIDITY: NOT ASSESSED', 2.6, true));
  b -= 4.4;
  items.push(text('warning', { x: left, y: b }, 'NOT FOR CONSTRUCTION', 2.6, true));
  b -= 4;
  items.push(rule(b));

  /*
    THE ISSUE BLOCK — §4.9 items 1 and 12. When the figures were computed, which
    sheet of how many, drawn by what, checked by whom, at which revision.

    It is laid out DOWNWARD from a top worked out by height, because everything
    below it is anchored to the bottom edge of the strip and everything above it
    grows down from the top. Where the two would meet the strip REFUSES rather
    than overprinting: a title block with the legend struck through it is a sheet
    nobody can read, and it would surface on a plot with an unusual number of
    legend rows — which is to say in front of a client rather than in a test.
  */
  const checked = input.meta.checkedBy ?? NOT_CHECKED;
  const checkedLines = wrap(checked, 2.6, width);
  const noteLines = wrap(REVISION_NOTE, 2, width);
  const height = 2 * FIELD_ROW + 4.2 + checkedLines.length * 3.6 + 2 + noteLines.length * 3;
  const top = b - height - 3;
  if (y > top - 4) {
    throw new Error(
      `the title strip has no room for its issue block: the legend ends at ${y.toFixed(1)} mm of ` +
        `paper and the block would begin at ${top.toFixed(1)} mm`,
    );
  }
  items.push(rule(top - 4));
  const col = left + 44;
  const colWidth = width - 44;
  let f = top;
  items.push(...fieldRows(TitleField.DATE, 'DATE ISSUED', issueDate(input.meta.issuedAt), left, f, 42));
  // SHEET is a PLACEHOLDER here. A strip is laid out one sheet at a time and only
  // the set knows how big it is, so `composeSheets` fills this field by its key.
  items.push(...fieldRows(TitleField.SHEET_OF, 'SHEET', UNFILLED, col, f, colWidth));
  f += FIELD_ROW;
  items.push(...fieldRows(TitleField.DRAWN, 'DRAWN', 'TOP.ai ENGINE', left, f, 42));
  items.push(...fieldRows(TitleField.REVISION, 'REVISION', '0 - FIRST ISSUE', col, f, colWidth));
  f += FIELD_ROW;
  items.push(...fieldRows(TitleField.CHECKED, 'CHECKED', checked, left, f, width));
  f += 4.2 + checkedLines.length * 3.6 + 2;
  for (const line of noteLines) {
    items.push(text('note', { x: left, y: f }, line, 2));
    f += 3;
  }

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
