/**
 * The sheet's paper furniture: frame, title strip, notes, scale bar, north arrow.
 *
 * Laid out on A3 landscape in paper millimetres. The title strip is on the right,
 * full height, which is how the client's own sheets are bound, and it carries the
 * two sentences every sheet carries whatever it draws — NOT FOR CONSTRUCTION, and
 * REGULATORY VALIDITY: NOT ASSESSED — at the bottom, above the sheet number, where
 * a reader looking for the number cannot miss them. The sheet's general notes are
 * numbered under the drawing.
 *
 * Every value in the strip is a NAMED FIELD (`TitleField`), not a run of text a
 * consumer has to recognise. That is FreeCAD TechDraw's `freecad:editable`
 * convention and §4.9's first item, and it pays for itself immediately: the
 * sheet count is filled in by key after the strip is laid out, because only the
 * set knows how many sheets are in it.
 *
 * Lettering heights are `LETTERING`'s, and the reasons are there.
 */

import type { ProvenanceClass } from '@envelope/core';

import { LETTERING } from './lettering.js';
import { SYMBOLS } from './symbols.js';
import { textLengthMm } from './text-box.js';
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

/**
 * The paper left of the strip: the drawing, and under it the sheet's general
 * notes (see `drawingArea`). Labels may sit in the drawing's margin.
 */
export const VIEWPORT = { x: 16, y: 16, width: 300, height: 265 } as const;

export interface StripInput {
  readonly title: string;
  readonly number: string;
  readonly scale: number;
  readonly meta: SheetMeta;
  readonly facts: readonly StripFact[];
  readonly legend: readonly LegendEntry[];
  /**
   * The sheet's general notes: how the bays are numbered, what is NOT drawn,
   * where the CAD layers come from. A key that names the inks and leaves the
   * scheme unsaid has answered the easy half of §4.9 item 8. Printed in the
   * NOTES band under the drawing (`generalNotes`), with the revision note last.
   */
  readonly legendNotes?: readonly string[];
  readonly north: boolean;
}

/**
 * Break `text` into lines no wider than `widthMm` at `sizeMm`. Words are not split.
 *
 * Measured with the same advance widths the collision check uses
 * (`textLengthMm`), so a line this wraps is a line that check agrees fits. It
 * used to count characters at one average advance, which is narrow for the
 * capitals most of these lines are set in.
 */
export function wrap(
  text: string,
  sizeMm: number,
  widthMm: number,
  style: { readonly mono?: boolean } = {},
): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (!word) continue;
    const next = line ? `${line} ${word}` : word;
    if (textLengthMm(next, sizeMm, style) > widthMm && line) {
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

/** What CHECKED says when nobody has signed G4. It is a fact, not a blank box. */
export const NOT_CHECKED = 'NOT CHECKED';

/**
 * What a title-block field nobody filled in says.
 *
 * PROJECT, DESCRIPTION, CLIENT, CONSULTANT and STATUS are the reader's to state,
 * and a run holds none of them today. A blank box reads as an oversight; a
 * filled one — the product's name in PROJECT, which is what it printed until
 * 17 Oct 2026 — reads as a fact nobody gave.
 */
export const NOT_STATED = 'NOT STATED';

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
  'the run number in the title strip is what identifies this issue.';

// ---------------------------------------------------------------------------
// The general notes, under the drawing
// ---------------------------------------------------------------------------

/*
  WHY THE NOTES LEFT THE STRIP. At 2.0 mm the strip of a parking sheet had
  nothing to spare — 0.2 mm short on a 120 × 80 m plot's ground floor — and
  raising its notes and its key to 2.5 mm (see `lettering.ts`) and adding four
  title-block fields needed some 40 mm more. The general notes are sentences,
  not a key: on the 300 mm under the drawing each is a line, where in the
  80 mm strip each was three. So they are numbered and printed there, as an
  architect's general notes are, and the drawing is fitted to the paper above
  them. A sheet whose drawing then needs a smaller scale takes one: the scale is
  chosen off the ladder, and the lettering is not shrunk to save it.
*/

/** Baseline to baseline for notes: 1.4 times the height, ISO 3098's line spacing. */
const NOTE_PITCH = LETTERING.noteMm * 1.4;
/** From the band's top rule to the NOTES caption's baseline. */
const BAND_CAPTION = 4.2;
/** Under the last line: its descenders, and a millimetre. */
const BAND_FOOT = 1.2;

/** The sheet's general notes as printed: numbered, the revision note last. */
export function generalNotes(notes: readonly string[]): string[] {
  return [...notes, REVISION_NOTE].map((n, i) => `${i + 1}. ${n}`);
}

function noteLines(notes: readonly string[]): string[] {
  return generalNotes(notes).flatMap((n) => wrap(n, LETTERING.noteMm, VIEWPORT.width - 2));
}

/** How much paper the notes band takes off the foot of the viewport, in millimetres. */
export function notesBandMm(notes: readonly string[]): number {
  return BAND_CAPTION + noteLines(notes).length * NOTE_PITCH + BAND_FOOT;
}

/**
 * The paper the model is drawn in on a sheet with these notes: the viewport less
 * the notes band at its foot. A sheet is fitted to this and clipped to it.
 */
export function drawingArea(notes: readonly string[]): {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
} {
  return {
    x: VIEWPORT.x,
    y: VIEWPORT.y,
    width: VIEWPORT.width,
    height: Math.round((VIEWPORT.height - notesBandMm(notes)) * 100) / 100,
  };
}

function notesBand(notes: readonly string[]): PaperItem[] {
  const area = drawingArea(notes);
  const top = area.y + area.height;
  const x = VIEWPORT.x + 1;
  const items: PaperItem[] = [
    {
      kind: 'poly',
      role: 'rule',
      points: [
        { x: VIEWPORT.x, y: top },
        { x: VIEWPORT.x + VIEWPORT.width, y: top },
      ],
      closed: false,
    },
    text('label', { x, y: top + BAND_CAPTION }, 'NOTES', LETTERING.captionMm),
  ];
  let y = top + BAND_CAPTION;
  for (const line of noteLines(notes)) {
    y += NOTE_PITCH;
    items.push(text('note', { x, y }, line, LETTERING.noteMm));
  }
  return items;
}

// ---------------------------------------------------------------------------
// The issue block
// ---------------------------------------------------------------------------

/** Value text in the issue block: the note height, and a tenth over it for the bold mono. */
const VALUE_MM = 2.6;
/** Caption baseline to the first value baseline, and value to value. */
const VALUE_DROP = 4.2;
const VALUE_PITCH = 3.6;

interface FieldSpec {
  readonly field: TitleField;
  readonly label: string;
  readonly value: string;
}

/**
 * A label over its value, the value KEYED — §4.9 item 1.
 *
 * The key is on the value and not on the label because the value is the part
 * anything downstream reads or replaces. A wrapped value keys its first line
 * only: a field is one value, not a paragraph.
 */
function fieldRows(spec: FieldSpec, x: number, y: number, widthMm: number): PaperItem[] {
  const out: PaperItem[] = [text('label', { x, y }, spec.label, LETTERING.captionMm)];
  wrap(spec.value, VALUE_MM, widthMm, { mono: true }).forEach((line, i) => {
    const t = text('value', { x, y: y + VALUE_DROP + i * VALUE_PITCH }, line, VALUE_MM, true);
    out.push(i === 0 ? keyed(t, spec.field) : t);
  });
  return out;
}

const fieldLines = (spec: FieldSpec, widthMm: number): number =>
  wrap(spec.value, VALUE_MM, widthMm, { mono: true }).length;

/** How an assumed figure is said in words as well as in amber — §13.1, twice. */
const CLASS_WORD: Partial<Record<ProvenanceClass, string>> = {
  ASSUMED: 'ASSUMED',
  USER_SET: 'ENTERED',
};

/**
 * A field the reader states, or NOT STATED. Whitespace is not a statement.
 *
 * Exported (17 Oct 2026) so the DXF's title lines print a field by the same rule
 * as the strip: one function, or the file and the paper disagree about which
 * blank is a blank.
 */
export const stated = (value: string | undefined): string =>
  value !== undefined && value.trim() !== '' ? value.trim() : NOT_STATED;

type FieldRow = readonly [FieldSpec] | readonly [FieldSpec, FieldSpec];

export function paperFurniture(input: StripInput): PaperItem[] {
  const items: PaperItem[] = [];
  const left = STRIP.x0 + STRIP.pad;
  const width = STRIP.x1 - STRIP.x0 - 2 * STRIP.pad;
  const notes = input.legendNotes ?? [];

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

  // --- top: whose job, what this is, which plot and run --------------------------------
  /*
    PROJECT IS THE READER'S. It printed "Plotlogic.dev" — the product's name in
    the field a reader files the sheet under. What drew the sheet is said in
    DRAWN, where it belongs.
  */
  let y = FRAME.y0 + 6;
  items.push(text('label', { x: left, y }, 'PROJECT', LETTERING.captionMm));
  y += 5;
  wrap(stated(input.meta.projectName), 3.6, width).forEach((line, i) => {
    const t = text('heading', { x: left, y }, line, 3.6, true);
    items.push(i === 0 ? keyed(t, TitleField.PROJECT) : t);
    y += 4.6;
  });
  items.push(text('label', { x: left, y }, 'DEVELOPMENT CAPACITY STUDY', 2.2));
  y += 4;
  items.push(rule(y));
  y += 6;
  items.push(text('label', { x: left, y }, 'PLOT', LETTERING.captionMm));
  y += 5;
  items.push(keyed(text('value', { x: left, y }, input.meta.plotNumber, 3.6, true), TitleField.PLOT));
  y += 4.6;
  wrap(input.meta.community, LETTERING.noteMm, width, { mono: true }).forEach((line, i) => {
    const t = text('value', { x: left, y }, line, LETTERING.noteMm);
    items.push(i === 0 ? keyed(t, TitleField.COMMUNITY) : t);
    y += NOTE_PITCH;
  });
  y += 1.4;
  items.push(text('label', { x: left, y }, 'RUN', LETTERING.captionMm));
  y += 3.8;
  items.push(keyed(text('value', { x: left, y }, input.meta.runId, LETTERING.noteMm), TitleField.RUN));
  y += 3;
  items.push(rule(y));
  y += 6;

  // --- the facts this sheet quotes -----------------------------------------------------
  for (const fact of input.facts) {
    items.push(text('label', { x: left, y }, fact.label.toUpperCase(), LETTERING.captionMm));
    y += 4.2;
    const word = fact.provenanceClass ? CLASS_WORD[fact.provenanceClass] : undefined;
    const value = word ? `${fact.value} · ${word}` : fact.value;
    for (const line of wrap(value, 3, width, { mono: true })) {
      items.push(text('value', { x: left, y }, line, 3, false, 'start', fact.provenanceClass));
      y += 4;
    }
    y += 1.6;
  }
  items.push(rule(y));
  y += 5;

  // --- legend -----------------------------------------------------------------------------
  items.push(text('label', { x: left, y }, 'LEGEND', LETTERING.captionMm));
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
    const lines = wrap(entry.label, LETTERING.noteMm, width - 12);
    lines.forEach((line, i) =>
      items.push(text('note', { x: left + 12, y: y + 3.2 + i * NOTE_PITCH }, line, LETTERING.noteMm)),
    );
    // A row is the 4 mm swatch and a millimetre between, or its lines when it wraps.
    y += Math.max(5, lines.length * NOTE_PITCH + 1.5);
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
    sheet of how many, drawn by what, for whom, in what state, checked by whom,
    at which revision. Two columns, so the four fields an architect's block
    carries and this one lacked cost two rows rather than four.

    It is laid out DOWNWARD from a top worked out by height, because everything
    below it is anchored to the bottom edge of the strip and everything above it
    grows down from the top. Where the two would meet the strip REFUSES rather
    than overprinting: a title block with the legend struck through it is a sheet
    nobody can read, and it would surface on a plot with an unusual number of
    legend rows — which is to say in front of a client rather than in a test.
  */
  const meta = input.meta;
  const colOffset = 44;
  const rows: readonly FieldRow[] = [
    [
      { field: TitleField.DATE, label: 'DATE ISSUED', value: issueDate(meta.issuedAt) },
      // A PLACEHOLDER: only the set knows its size, so `composeSheets` fills it by key.
      { field: TitleField.SHEET_OF, label: 'SHEET', value: UNFILLED },
    ],
    [
      { field: TitleField.DRAWN, label: 'DRAWN', value: 'PLOTLOGIC ENGINE' },
      { field: TitleField.REVISION, label: 'REVISION', value: '0 - FIRST ISSUE' },
    ],
    [
      { field: TitleField.CLIENT, label: 'CLIENT', value: stated(meta.client) },
      { field: TitleField.CONSULTANT, label: 'CONSULTANT', value: stated(meta.consultant) },
    ],
    [
      { field: TitleField.STATUS, label: 'STATUS', value: stated(meta.status) },
      { field: TitleField.CHECKED, label: 'CHECKED', value: meta.checkedBy ?? NOT_CHECKED },
    ],
    [{ field: TitleField.DESCRIPTION, label: 'DESCRIPTION', value: stated(meta.description) }],
  ];
  const widths = (row: FieldRow): readonly number[] => (row.length === 1 ? [width] : [colOffset - 2, width - colOffset]);
  const rowHeight = (row: FieldRow): number => {
    const w = widths(row);
    const lines = Math.max(...row.map((spec, i) => fieldLines(spec, w[i]!)));
    return VALUE_DROP + lines * VALUE_PITCH + 0.4;
  };
  const height = rows.reduce((sum, row) => sum + rowHeight(row), 0);
  const top = b - height - 1;
  if (y > top - 4) {
    throw new Error(
      `the title strip has no room for its issue block: the legend ends at ${y.toFixed(1)} mm of ` +
        `paper and the block would begin at ${top.toFixed(1)} mm`,
    );
  }
  items.push(rule(top - 4));
  let f = top;
  for (const row of rows) {
    const w = widths(row);
    row.forEach((spec, i) => items.push(...fieldRows(spec, i === 0 ? left : left + colOffset, f, w[i]!)));
    f += rowHeight(row);
  }

  items.push(...notesBand(notes));
  items.push(...scaleBar(input.scale, drawingArea(notes)));
  if (input.north) items.push(...northArrow());
  return items;
}

/** A graphic scale: the one dimension that survives a photocopier's resize. */
function scaleBar(
  scale: number,
  area: { readonly x: number; readonly y: number; readonly height: number },
): PaperItem[] {
  // The longest round length in metres that stays under 60 mm of paper.
  const candidates = [2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
  let lengthM = candidates[0]!;
  for (const c of candidates) if ((c * 1000) / scale <= 60) lengthM = c;
  const total = (lengthM * 1000) / scale;
  // At the foot of the drawing, above the notes band.
  const x0 = area.x;
  const y0 = area.y + area.height - 4;
  const items: PaperItem[] = [];
  for (let i = 0; i < 4; i += 1) {
    items.push(box(i % 2 === 0 ? 'scale-bar-fill' : 'scale-bar', x0 + (i * total) / 4, y0, total / 4, 1.6));
  }
  items.push(text('label', { x: x0, y: y0 - 1.4 }, '0', LETTERING.captionMm, false, 'middle'));
  items.push(text('label', { x: x0 + total / 2, y: y0 - 1.4 }, String(lengthM / 2), LETTERING.captionMm, false, 'middle'));
  items.push(text('label', { x: x0 + total, y: y0 - 1.4 }, `${lengthM} m`, LETTERING.captionMm, false, 'middle'));
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
    text('label', { x: cx, y: top + 18.8 }, 'GRID', LETTERING.captionMm, false, 'middle'),
  ];
}
