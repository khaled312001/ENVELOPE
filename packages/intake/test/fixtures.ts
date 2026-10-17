/**
 * Sheets nobody has on file, built item by item at stated positions.
 *
 * The client's sheets are not all in git (`source-sheets.ts`), so every reader
 * added for one is also driven from one of these: the same layout, the cells in
 * the same places relative to their labels, and no name, logo or wording that
 * belongs to an issuer or an owner. The positions are PDF user space — y up,
 * `[x0, y0, x1, y1]` — as `PdfPageText` gives them.
 */
import { ProvenanceGraph, Tracer } from '@envelope/core';

import { readFacts, type AffectionPlanFacts } from '../src/affection-plan.js';
import type { PdfPageText, TextItem } from '../src/pdf-text.js';

/** One text item: its text, its left and bottom, and its width (5 pt a character unless given). */
export function at(text: string, x: number, y: number, width = text.length * 5, height = 8): TextItem {
  return { text, page: 1, bbox: [x, y, x + width, y + height] };
}

export function page(items: readonly TextItem[]): PdfPageText {
  return { page: 1, width: 1190, height: 842, items: [...items] };
}

export function read(p: PdfPageText): AffectionPlanFacts {
  return readFacts(p, { documentUri: 'synthetic.pdf', tracer: new Tracer(new ProvenanceGraph()) });
}

export const DWELLING_NOTE =
  '- PARKING: ONE BAY FOR EACH UNIT LESS THAN OR EQUAL TO 150 SQ.M GFA AND TWO BAYS FOR EACH UNIT EXCEEDING 150 SQ.M GFA.';
export const QUARTER_NOTE =
  '- SETBACK: QUARTER OF THE HEIGHT FROM NEIGHBORING PLOTS AND FROM CENTER OF SIKKA - MAXIMUM 7.5M AND A MINIMUM OF 3M.';

/**
 * A DDA plot sheet: the `PLOT DETAILS` cells down the left, the `SETBACK (M)`
 * table under them with one `[building, podium]` pair per side, and the general
 * notes. `extra` adds items (a land-use split, a drawing's labels).
 */
export function ddaSheet(
  cells: readonly (readonly [string, string])[],
  notes: readonly string[] = [DWELLING_NOTE],
  extra: readonly TextItem[] = [],
): PdfPageText {
  const items: TextItem[] = [
    at('PLOT NUMBER', 50, 780),
    at('9000001', 150, 780),
    at('PLOT AREA', 50, 768),
    at('1,000.00 M', 150, 768),
    at('MAX. GFA', 50, 756),
    at('3,000.00 M', 150, 756),
    at('MAX. HEIGHT', 50, 744),
    at('G+4', 150, 744),
    at('MAX. COVERAGE', 50, 732),
    at('N/A', 150, 732),
    at('SETBACK (M)', 50, 600, 60),
    at('BUILDING', 150, 600, 40),
    at('PODIUM', 230, 600, 32),
  ];
  cells.forEach(([building, podium], k) => {
    const y = 588 - 12 * k;
    items.push(at(`SIDE ( ${k + 1} )`, 50, y, 40));
    // Each cell centred under its column's header: 170 and 246.
    items.push(at(building, 170 - building.length * 2.5, y));
    items.push(at(podium, 246 - podium.length * 2.5, y));
  });
  items.push(at('GENERAL NOTES', 50, 400, 70));
  notes.forEach((n, k) => items.push(at(n, 130, 400 - 10 * k, 470)));
  return page([...items, ...extra]);
}
