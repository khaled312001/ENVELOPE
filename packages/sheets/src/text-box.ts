/**
 * How much paper a piece of text covers — so a sheet can be held to the rule
 * that no label is printed over another, or over a dimension.
 *
 * The audit that asked for this measured it in a browser: on the worked
 * example's site plan, "VEHICLE ENTRY / EXIT - 6.00M" covered 96% of the
 * "80.00 M" that measures the frontage — the one boundary length the access
 * rule is read off, on the drawing the landing page shows. Nothing in the
 * package could see it, because a label's position was chosen and never
 * checked against anything.
 *
 * ---
 *
 * **An estimate, stated as one.** There is no font engine here, and the sheet
 * must be checkable without a browser (the parity gate runs in Node). So a text
 * item's box is worked out from its characters at IBM Plex's advance widths,
 * read off the faces' metrics and rounded UP, so an error makes a box larger,
 * never smaller: a check that under-estimates its boxes passes a sheet whose
 * labels touch. The height is the band the capitals and figures occupy, not the
 * em, because labels on these sheets are capitals and figures and two lines one
 * em apart do not touch.
 *
 * Everything is in paper millimetres on the A3 sheet, the space a reader's eye
 * is in. A collision at 1:500 is a collision whatever the model says.
 */

import { toPaper } from './plane.js';
import type { ModelItem, PaperItem, PaperPoint, Role, Sheet, SheetView, TextItem } from './types.js';

/** A rectangle on paper, turned: a centre, a unit direction along the text, and half-extents. */
export interface TextBox {
  readonly centre: PaperPoint;
  /** Unit vector along the line of text, on paper (y down). */
  readonly along: PaperPoint;
  readonly halfLength: number;
  readonly halfHeight: number;
  /** What the box is of, for a message a person can act on. */
  readonly value: string;
  readonly role: Role | PaperItem['role'];
}

/*
  ADVANCE WIDTHS, as a fraction of the font size. IBM Plex Sans: capitals
  average 0.64 em (W and M wider, I narrower), figures 0.57, lower case 0.53,
  the space 0.25, light punctuation 0.3. IBM Plex Mono: 0.6 for every glyph.
  Rounded up from the faces' hmtx tables, for the reason in the header.
*/
const SANS = { upper: 0.66, digit: 0.6, lower: 0.55, space: 0.26, punct: 0.34 } as const;
const MONO_ADVANCE = 0.6;

/** Roles the stylesheet sets in Plex Mono (`SHEET_CSS`). */
const MONO_ROLES: ReadonlySet<string> = new Set(['dimension', 'bay-number', 'level-mark', 'value']);
/** Roles the stylesheet letter-spaces by 0.05 em. */
const SPACED_ROLES: ReadonlySet<string> = new Set(['edge-label', 'label']);
/** Roles the stylesheet sets in a heavier weight, which runs about 4% wider. */
const HEAVY_ROLES: ReadonlySet<string> = new Set(['access', 'cut-line', 'dead-end']);

/** The length of a line of text on paper, in millimetres. */
export function textLengthMm(
  value: string,
  sizeMm: number,
  style: { readonly mono?: boolean; readonly spaced?: boolean; readonly heavy?: boolean } = {},
): number {
  let em = 0;
  for (const ch of value) {
    if (style.mono) em += MONO_ADVANCE;
    else if (ch === ' ') em += SANS.space;
    else if (/[A-Z]/.test(ch)) em += SANS.upper;
    else if (/[0-9]/.test(ch)) em += SANS.digit;
    else if (/[a-z]/.test(ch)) em += SANS.lower;
    else em += SANS.punct;
    if (style.spaced) em += 0.05;
  }
  return em * sizeMm * (style.heavy ? 1.04 : 1);
}

/**
 * The box a model text item covers on paper.
 *
 * Model text is set on its `central` baseline (`svg.ts`), so the capitals sit
 * across the anchor point: 0.4 em either side holds Plex's capitals and figures
 * (0.70 em tall, a little above centre) with a margin.
 */
export function modelTextBox(item: TextItem, view: SheetView): TextBox {
  const p = toPaper(view, item.at);
  const rad = (item.rotationDeg * Math.PI) / 180;
  // The model turns anticlockwise with y up; paper's y runs down the page.
  const along = { x: Math.cos(rad), y: -Math.sin(rad) };
  const length = textLengthMm(item.value, item.sizeMm, {
    mono: MONO_ROLES.has(item.role),
    spaced: SPACED_ROLES.has(item.role),
    heavy: HEAVY_ROLES.has(item.role),
  });
  const shift = item.anchor === 'start' ? length / 2 : item.anchor === 'end' ? -length / 2 : 0;
  return {
    centre: { x: p.x + along.x * shift, y: p.y + along.y * shift },
    along,
    halfLength: length / 2,
    halfHeight: 0.4 * item.sizeMm,
    value: item.value,
    role: item.role,
  };
}

/**
 * The box a paper text item covers. Paper text sits on its alphabetic baseline
 * and is never turned: capitals rise 0.72 em above it, and a descender drops
 * 0.2 em below.
 */
export function paperTextBox(item: Extract<PaperItem, { kind: 'text' }>): TextBox {
  const length = textLengthMm(item.value, item.sizeMm, {
    mono: MONO_ROLES.has(item.role),
    spaced: SPACED_ROLES.has(item.role),
    heavy: item.bold,
  });
  const x0 = item.anchor === 'start' ? item.at.x : item.anchor === 'end' ? item.at.x - length : item.at.x - length / 2;
  const top = item.at.y - 0.72 * item.sizeMm;
  const bottom = item.at.y + 0.2 * item.sizeMm;
  return {
    centre: { x: x0 + length / 2, y: (top + bottom) / 2 },
    along: { x: 1, y: 0 },
    halfLength: length / 2,
    halfHeight: (bottom - top) / 2,
    value: item.value,
    role: item.role,
  };
}

function corners(b: TextBox): PaperPoint[] {
  const n = { x: -b.along.y, y: b.along.x };
  const out: PaperPoint[] = [];
  for (const [i, j] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ] as const) {
    out.push({
      x: b.centre.x + b.along.x * b.halfLength * i + n.x * b.halfHeight * j,
      y: b.centre.y + b.along.y * b.halfLength * i + n.y * b.halfHeight * j,
    });
  }
  return out;
}

/**
 * Whether two boxes overlap by more than `toleranceMm` — separating axes over
 * the four edge normals of two rectangles, which is exact for rectangles.
 */
export function boxesOverlap(a: TextBox, b: TextBox, toleranceMm = 0.05): boolean {
  const ca = corners(a);
  const cb = corners(b);
  const axes = [a.along, { x: -a.along.y, y: a.along.x }, b.along, { x: -b.along.y, y: b.along.x }];
  for (const axis of axes) {
    const pa = ca.map((p) => p.x * axis.x + p.y * axis.y);
    const pb = cb.map((p) => p.x * axis.x + p.y * axis.y);
    const gap = Math.min(Math.max(...pa), Math.max(...pb)) - Math.max(Math.min(...pa), Math.min(...pb));
    if (gap <= toleranceMm) return false;
  }
  return true;
}

/**
 * The stretch of a straight stroke a to b that lies inside a box grown (or, with
 * a negative figure, shrunk) by `marginMm` on every side, as fractions of a to b.
 * Null when the stroke misses it. Liang–Barsky, in the box's own frame.
 */
export function segmentInBox(
  a: PaperPoint,
  b: PaperPoint,
  box: TextBox,
  marginMm: number,
): readonly [number, number] | null {
  const n = { x: -box.along.y, y: box.along.x };
  const local = (p: PaperPoint): PaperPoint => {
    const d = { x: p.x - box.centre.x, y: p.y - box.centre.y };
    return { x: d.x * box.along.x + d.y * box.along.y, y: d.x * n.x + d.y * n.y };
  };
  const p = local(a);
  const q = local(b);
  const hx = box.halfLength + marginMm;
  const hy = box.halfHeight + marginMm;
  if (hx <= 0 || hy <= 0) return null;
  let t0 = 0;
  let t1 = 1;
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  for (const [pp, qq] of [
    [-dx, p.x + hx],
    [dx, hx - p.x],
    [-dy, p.y + hy],
    [dy, hy - p.y],
  ] as const) {
    if (pp === 0) {
      if (qq < 0) return null;
      continue;
    }
    const r = qq / pp;
    if (pp < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
    if (t0 > t1) return null;
  }
  return [t0, t1];
}

/** Whether a straight stroke on paper passes through a box (further in than `toleranceMm`). */
export function segmentCrossesBox(a: PaperPoint, b: PaperPoint, box: TextBox, toleranceMm = 0.05): boolean {
  return segmentInBox(a, b, box, -toleranceMm) !== null;
}

/** True when the box reaches into the part of the sheet the model is drawn in. */
function inViewport(box: TextBox, sheet: Sheet): boolean {
  const v = sheet.viewport;
  const r = Math.hypot(box.halfLength, box.halfHeight);
  return (
    box.centre.x + r > v.x && box.centre.x - r < v.x + v.width && box.centre.y + r > v.y && box.centre.y - r < v.y + v.height
  );
}

/** Every piece of text the sheet prints, as boxes on paper. Model text the viewport clips away is left out. */
export function sheetTextBoxes(sheet: Sheet): TextBox[] {
  const model = sheet.items
    .filter((i): i is TextItem => i.kind === 'text')
    .map((t) => modelTextBox(t, sheet.view))
    .filter((b) => inViewport(b, sheet));
  const paper = sheet.paperItems
    .filter((i): i is Extract<PaperItem, { kind: 'text' }> => i.kind === 'text')
    .map(paperTextBox);
  return [...model, ...paper];
}

export interface TextCollision {
  readonly a: string;
  readonly b: string;
}

/**
 * Every pair of texts on a sheet that print over one another, and every label a
 * dimension line runs through. Empty is the only acceptable answer.
 */
export function textCollisions(sheet: Sheet): TextCollision[] {
  const boxes = sheetTextBoxes(sheet);
  const out: TextCollision[] = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      if (boxesOverlap(boxes[i]!, boxes[j]!)) {
        out.push({ a: `${boxes[i]!.role} "${boxes[i]!.value}"`, b: `${boxes[j]!.role} "${boxes[j]!.value}"` });
      }
    }
  }
  // A dimension's witness and dimension lines, through a label that is not its own figure.
  const lines = sheet.items.filter(
    (i): i is Extract<ModelItem, { kind: 'shape' }> => i.kind === 'shape' && i.role === 'dimension',
  );
  for (const box of boxes) {
    if (box.role === 'dimension') continue;
    for (const line of lines) {
      const [a, b] = line.points;
      if (!a || !b) continue;
      if (segmentCrossesBox(toPaper(sheet.view, a), toPaper(sheet.view, b), box)) {
        out.push({ a: `${box.role} "${box.value}"`, b: 'a dimension line' });
        break;
      }
    }
  }
  return out;
}
