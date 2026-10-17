/**
 * The DDA affection plan — a second sheet dialect, and the reason there is one.
 *
 * `affection-plan.ts` was written against the Trakhees sheets in
 * `docs/00-source`, and every reader in it encodes that generator's own habits:
 * a plot area written `1,740.56 Sq. m` in running text, a `GFA=8796.46 Sq. m,
 * FAR=5.05` pair on one line, bilingual labels whose value sits in the cell to
 * their LEFT, an issue date punctuated with hyphens.
 *
 * The Dubai Development Authority issues a different sheet for the same purpose.
 * Plot 5134565 (Saih Shuaib 1, issued 18/11/2025) prints a `PLOT DETAILS` table
 * down the left margin —
 *
 *     PLOT NUMBER      5134565
 *     PLOT AREA        1,040.04 M²  (11,194.93 FT²)
 *     MAX. GFA         2,288.08 M²  (24,628.69 FT²)
 *     MAX. HEIGHT      G+4
 *     MAX. COVERAGE    N/A
 *
 * — a right-hand panel whose values sit BELOW their labels rather than left of
 * them, and a `PLOT COORDINATES` table of surveyed DLTM eastings and northings.
 *
 * Not one of the Trakhees readers fires on it. What the client was shown instead
 * was six fields reading "not printed on this sheet" and, worse, a plot area of
 * **150.0 m²** against a sheet that prints 1,040.04 — the figure came from
 * `ONE BAY FOR EACH UNIT LESS THAN OR EQUAL TO 150 SQ.M GFA` in the general
 * notes, because the area reader scans the page for the first `<n> SQ. M` it
 * can find. A wrong area is the worst single failure available here: it is the
 * denominator of every capacity figure downstream, and 150 is plausible enough
 * to be believed.
 *
 * So this module reads the DDA dialect, and `affection-plan.ts` prefers it when
 * the sheet is one. Three rules govern what is in here:
 *
 * 1. **It reads; it does not reconcile.** Every function returns the box it read
 *    from along with the value, so the caller can cite it. Nothing here emits a
 *    `Traced` value — tracing stays in one place.
 *
 * 2. **A field the sheet does not print stays unprinted.** This sheet states no
 *    FAR. `2,288.08 ÷ 1,040.04 = 2.2` is arithmetic, not a reading, and
 *    publishing it as the plot's FAR would make the engine quote a ratio no
 *    instrument states. The ratio is offered as a CROSS-CHECK and never as a
 *    value.
 *
 * 3. **`SEE NOTES` is not a setback.** The setback column on this sheet defers
 *    to a general note — "QUARTER OF THE HEIGHT FROM NEIGHBORING PLOTS … MAXIMUM
 *    7.5M AND A MINIMUM OF 3M" — which is a rule with the storey count as its
 *    input, not a distance. It is reported as the deferral it is.
 *
 * 4. **And a number in that table IS a setback** (2026-10-17). Plot 6457790
 *    prints `SIDE ( 1 )` 5 / 4 and `SIDE ( 2..4 )` 7 / 6 (building / podium), and
 *    for months this module never opened the table: the caller printed "SEE
 *    NOTES against every face" for every DDA sheet, the podium was put on the
 *    boundary under the practice statement, and the tower took placeholder
 *    distances. `readSetbackTable` reads each cell in its own state — a
 *    distance, a deferral, or N/A — and `placeSides` names the boundary each
 *    `SIDE n` is drawn against.
 */

import { Decimal, type SetbackCell, type SideSetback } from '@envelope/core';

import { type PdfPageText, type TextItem, unionCell } from './pdf-text.js';

/**
 * The labels that identify the dialect, and why these three.
 *
 * `PLOT NUMBER` and `MAX. GFA` are the two cells a Trakhees sheet never prints
 * in those words, and `COORDINATES SYSTEM IS DLTM` is the footer of the survey
 * table. Two of the three are required rather than one, because a single label
 * could appear in a note on any sheet and a dialect chosen by one word would
 * send a Trakhees sheet down a reader that cannot read it.
 */
const DIALECT_MARKERS: readonly string[] = ['PLOT NUMBER', 'MAX. GFA', 'COORDINATES SYSTEM IS DLTM'];

const upper = (s: string): string => s.replace(/\s+/g, ' ').trim().toUpperCase();

/**
 * Is this cell a value at all, or a glyph from a font with no ToUnicode map?
 *
 * The DDA sheet carries a column of decorative marks down its right edge that
 * decode to a bare `!` each — thirty of them, every few points, straight through
 * the panel that holds `COMMUNITY`. The first search for the value under that
 * label found one of them, and the client would have been shown his plot's
 * community as "!". Requiring a letter or a digit costs nothing: no field on
 * this sheet is answered by punctuation alone.
 */
const hasContent = (s: string): boolean => /[\p{L}\p{N}]/u.test(s);

/** Does this page look like a DDA sheet? Two markers of three. */
export function isDdaSheet(page: PdfPageText): boolean {
  const text = page.items.map((i) => upper(i.text)).join('\n');
  return DIALECT_MARKERS.filter((m) => text.includes(m)).length >= 2;
}

/**
 * The item holding a label, matched on the whole cell rather than a substring.
 *
 * `MAX. GFA` and `MAX. HEIGHT` both contain `MAX.`, and `PLOT NUMBER`,
 * `PLOT AREA` and `PLOT COORDINATES` all contain `PLOT` — on a sheet whose
 * labels are this regular, a substring match is how a reader ends up citing the
 * wrong box while printing the right number.
 */
function labelCell(page: PdfPageText, label: string): TextItem | undefined {
  const want = upper(label);
  return page.items.find((i) => upper(i.text) === want);
}

/** How far a value may sit from its label and still be its value. */
const ROW_TOLERANCE_PT = 6;
const RIGHT_REACH_PT = 420;
const BELOW_REACH_PT = 60;
const COLUMN_SLACK_PT = 120;

/**
 * The value cell to the RIGHT of a label, on the same baseline.
 *
 * The opposite hand to `valueLeftOf`, and the difference is the sheet rather
 * than a preference: the Trakhees form is laid out right-to-left around a
 * bilingual label, and the DDA `PLOT DETAILS` table is a plain two-column table
 * reading left to right.
 */
export function valueRightOf(page: PdfPageText, label: string): TextItem | undefined {
  const anchor = labelCell(page, label);
  if (!anchor) return undefined;
  const midY = (anchor.bbox[1] + anchor.bbox[3]) / 2;
  return page.items
    .filter((i) => {
      if (i.bbox[0] < anchor.bbox[2] - 2) return false;
      if (i.bbox[0] - anchor.bbox[2] > RIGHT_REACH_PT) return false;
      if (Math.abs((i.bbox[1] + i.bbox[3]) / 2 - midY) > ROW_TOLERANCE_PT) return false;
      return hasContent(i.text);
    })
    /* Nearest wins: the value cell abuts the label, and the imperial figure in
       brackets sits one cell further out. */
    .sort((a, b) => a.bbox[0] - b.bbox[0])[0];
}

// ---------------------------------------------------------------------------
// The setback table
// ---------------------------------------------------------------------------

/** The header of the table: `SETBACK (M)` on the DDA sheet, `SETBACK (m)` on the unified site plan. */
const SETBACK_HEADER = /^SETBACK\s*\(\s*M\s*\)$/i;
/** A row label: `SIDE ( 1 )` on the DDA sheet, `Side 1` on the unified one. */
const SIDE_LABEL = /^SIDE\s*\(?\s*(\d{1,2})\s*\)?$/i;
/** How far a cell's centre may sit from its column header's centre. */
const COLUMN_REACH_PT = 45;
/** A row's cells share its label's baseline to within this. */
const TABLE_ROW_PT = 3;

/** A table read, or the sentence saying why it was not. */
export type SetbackTableReading =
  | { readonly ok: true; readonly sides: readonly SideSetback[]; readonly box: TextItem; readonly raw: string }
  | { readonly ok: false; readonly reason: string };

/**
 * One cell, in the state its words state. `undefined` for words that are none
 * of the three — and the caller then refuses the TABLE, not the cell: a table
 * with one unread side is a different schedule from the printed one.
 */
export function setbackCell(text: string): SetbackCell | undefined {
  const t = text.replace(/\s+/g, ' ').trim();
  if (/^SEE\s*NOTES?$/i.test(t)) return { kind: 'SEE_NOTES', verbatim: t };
  if (/^N\s*\/\s*A$/i.test(t)) return { kind: 'NOT_APPLICABLE', verbatim: t };
  const m = /^(\d+(?:\.\d+)?)\s*M?$/i.exec(t);
  return m?.[1] === undefined ? undefined : { kind: 'DISTANCE', metres: new Decimal(m[1]) };
}

/**
 * The `SETBACK (M)` table: one row per `SIDE n`, one column per mass.
 *
 * Read from the header down — the column headers on the header's own row, the
 * side labels down the header's own column, and each cell at the crossing of
 * its row's baseline and its column's centre. Built from items rather than from
 * `pageLines`, for the reason `readSurveyTable` gives: a table's cells are a gap
 * apart that a line-splitter reads as two columns or as one, unpredictably.
 *
 * Returns `undefined` where the sheet has no such table, and a refusal where it
 * has one this reader cannot read whole.
 */
export function readSetbackTable(page: PdfPageText): SetbackTableReading | undefined {
  const header = page.items.find((i) => SETBACK_HEADER.test(i.text.trim()));
  if (!header) return undefined;
  const midY = (i: TextItem): number => (i.bbox[1] + i.bbox[3]) / 2;
  const midX = (i: TextItem): number => (i.bbox[0] + i.bbox[2]) / 2;
  const onHeaderRow = page.items.filter(
    (i) => i !== header && Math.abs(midY(i) - midY(header)) <= TABLE_ROW_PT && i.bbox[0] > header.bbox[0],
  );
  const building = onHeaderRow.find((i) => /^BUILDING$/i.test(i.text.trim()));
  const podium = onHeaderRow.find((i) => /^PODIUM$/i.test(i.text.trim()));
  if (!building || !podium) {
    return { ok: false, reason: 'The sheet prints a setback table whose BUILDING and PODIUM columns could not both be found, so none of its cells is read.' };
  }

  /* Side labels below the header, down its own column, in reading order and contiguous. */
  const labels = page.items
    .filter((i) => SIDE_LABEL.test(i.text.trim()) && i.bbox[3] <= header.bbox[1] + 1 && Math.abs(i.bbox[0] - header.bbox[0]) <= 30)
    .sort((a, b) => b.bbox[1] - a.bbox[1]);
  const rows: TextItem[] = [];
  for (const l of labels) {
    const prev = rows.at(-1) ?? header;
    // A row is one or two line-heights below the last; a larger drop is another table.
    if (prev.bbox[1] - l.bbox[1] > 3 * Math.max(1, header.bbox[3] - header.bbox[1])) break;
    rows.push(l);
  }
  if (rows.length === 0) {
    return { ok: false, reason: 'The sheet prints a setback table header with no SIDE rows under it, so no setback is read from it.' };
  }

  const sides: SideSetback[] = [];
  const read: TextItem[] = [header, building, podium];
  const rawRows: string[] = [];
  for (const label of rows) {
    const side = Number(SIDE_LABEL.exec(label.text.trim())?.[1]);
    const cellsOnRow = page.items.filter(
      (i) => i !== label && Math.abs(midY(i) - midY(label)) <= TABLE_ROW_PT && /\S/.test(i.text) && i.bbox[0] > label.bbox[2] - 1,
    );
    const inColumn = (col: TextItem): readonly TextItem[] => {
      const hits = cellsOnRow.filter((i) => Math.abs(midX(i) - midX(col)) <= COLUMN_REACH_PT);
      return [...hits].sort((a, b) => a.bbox[0] - b.bbox[0]);
    };
    const b = inColumn(building);
    const p = inColumn(podium);
    const bText = b.map((i) => i.text).join(' ');
    const pText = p.map((i) => i.text).join(' ');
    const bCell = setbackCell(bText);
    const pCell = setbackCell(pText);
    if (!bCell || !pCell || sides.some((s) => s.side === side)) {
      return {
        ok: false,
        reason:
          `The setback table's row for side ${side} reads "${bText.trim() || 'nothing'}" under BUILDING and ` +
          `"${pText.trim() || 'nothing'}" under PODIUM, which is not a distance, SEE NOTES or N/A; ` +
          'the table is not read, rather than read with a side missing.',
      };
    }
    sides.push({ side, building: bCell, podium: pCell });
    read.push(label, ...b, ...p);
    rawRows.push(`${label.text.replace(/\s+/g, ' ').trim()}: ${bText.trim()} / ${pText.trim()}`);
  }
  const raw = `${header.text.trim()} BUILDING / PODIUM — ${rawRows.join('; ')}`;
  return { ok: true, sides, raw, box: { ...unionCell(read, page.page), text: raw } };
}

/**
 * The `SIDE n` labels the drawing prints inside the plot, each placed on the
 * surveyed boundary it is drawn against.
 *
 * `toGrid` is the page's own placement (`matchDrawnRing`): it puts each label's
 * centre on the coordinate table's grid, where the distance to every surveyed leg
 * is plane geometry. A label belongs to the nearest leg. The mapping is
 * PUBLISHED ONLY WHOLE AND ONE-TO-ONE: every row of the table placed, no two
 * labels on one leg, each label within reach of the plot. Anything short of that
 * returns a sentence instead, because a half-placed table invites the reader to
 * assume the rest.
 */
export function placeSides(
  page: PdfPageText,
  sides: readonly number[],
  ring: readonly SurveyPoint[],
  toGrid: (x: number, y: number) => readonly [number, number],
): ReadonlyMap<number, number> | string {
  const pts = ring.map((p) => [Number(p.east), Number(p.north)] as const);
  const n = pts.length;
  if (n < 3) return 'The surveyed ring has fewer than three corners, so no side label is placed on it.';
  const span = Math.max(
    Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0])),
    Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1])),
  );
  /* A label drawn against a boundary sits a few metres inside it. A quarter of
     the plot's longest extent separates that from a `SIDE ( n )` cell in the
     table, which lands hundreds of metres off the plot. */
  const reach = Math.max(5, span / 4);
  const distToLeg = (q: readonly [number, number], i: number): number => {
    const a = pts[i]!;
    const b = pts[(i + 1) % n]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / len2));
    return Math.hypot(q[0] - (a[0] + t * dx), q[1] - (a[1] + t * dy));
  };

  const placed = new Map<number, number>();
  for (const item of page.items) {
    /* Case-sensitive: the drawing prints `SIDE 1`; the unified sheet's table
       prints `Side 1`, which is a row label and not a mark on a boundary. */
    const m = /^SIDE\s+(\d{1,2})$/.exec(item.text.trim());
    if (!m?.[1]) continue;
    const side = Number(m[1]);
    const q = toGrid((item.bbox[0] + item.bbox[2]) / 2, (item.bbox[1] + item.bbox[3]) / 2);
    const ranked = pts.map((_, i) => ({ i, d: distToLeg(q, i) })).sort((a, b) => a.d - b.d);
    const best = ranked[0];
    if (!best || best.d > reach) continue;
    if (placed.has(side)) return `The drawing labels side ${side} more than once, so no side is placed on a boundary.`;
    placed.set(side, best.i);
  }
  const unplaced = sides.filter((s) => !placed.has(s));
  if (unplaced.length > 0) {
    return `The drawing does not label ${unplaced.map((s) => `side ${s}`).join(', ')} against a surveyed boundary, so no side of the table is placed on one.`;
  }
  const legs = [...placed.entries()].filter(([s]) => sides.includes(s)).map(([, i]) => i);
  if (new Set(legs).size !== legs.length) {
    return 'Two side labels on the drawing are nearest the same surveyed boundary, so no side of the table is placed on one.';
  }
  return new Map([...placed.entries()].filter(([s]) => sides.includes(s)));
}

// ---------------------------------------------------------------------------
// Land use, and the general notes
// ---------------------------------------------------------------------------

/** One line under `LAND USE / GFA SPLIT`: `COMMERCIAL : RETAIL (1,680.00 M²)`. */
export interface LandUseLine {
  readonly use: string;
  /** The area printed beside it, m², digits only; absent where none is printed. */
  readonly areaM2?: string;
  readonly box: TextItem;
}

/**
 * EVERY LINE UNDER `LAND USE / GFA SPLIT`, not the first.
 *
 * On plot 6457790 the heading is answered by two lines — retail 1,680.00 m² and
 * residential 12,255.45 m², which together are the sheet's maximum GFA — and
 * `valueBelow` returned the first. The plot's land use was reported as
 * "COMMERCIAL : RETAIL", and the 12,255.45 m² of flats the sheet allows was not
 * mentioned anywhere. Lines are taken down the heading's column until a gap
 * wider than two line-heights, which is where the next table begins.
 */
export function readLandUseLines(page: PdfPageText): readonly LandUseLine[] {
  const heading = labelCell(page, 'LAND USE / GFA SPLIT');
  if (!heading) return [];
  const lineHeight = Math.max(1, heading.bbox[3] - heading.bbox[1]);
  /* Brackets and the superscript `2` are kept: they are the area's own
     punctuation. The decorative `!` marks are not. */
  const below = page.items
    .filter(
      (i) =>
        i.bbox[3] <= heading.bbox[1] + 1 &&
        i.bbox[0] >= heading.bbox[0] - 2 &&
        i.bbox[0] <= heading.bbox[2] + 160 &&
        /\S/.test(i.text) &&
        i.text.trim() !== '!',
    )
    .sort((a, b) => b.bbox[1] - a.bbox[1]);
  /* Baselines, each the run of items within a superscript's rise of the first. */
  const rows: TextItem[][] = [];
  for (const item of below) {
    const row = rows.at(-1);
    const first = row?.[0];
    if (row && first && Math.abs(first.bbox[1] - item.bbox[1]) <= ROW_TOLERANCE_PT) row.push(item);
    else rows.push([item]);
  }
  const out: LandUseLine[] = [];
  /* The first line sits a cell's padding under the heading; each next line
     directly under the last (11 pt baselines over 9 pt type, so they touch).
     A gap of a cell's padding after the first line is the next table's heading. */
  let lastBottom = heading.bbox[1];
  for (const row of rows) {
    const top = Math.max(...row.map((i) => i.bbox[3]));
    const gap = lastBottom - top;
    if (gap > (out.length === 0 ? 2 : 0.5) * lineHeight) break;
    lastBottom = Math.min(...row.map((i) => i.bbox[1]));
    const ordered = [...row].sort((a, b) => a.bbox[0] - b.bbox[0]);
    /* The superscript `2` of `M²` is its own item above the baseline; it is the unit, not a digit of the area. */
    const text = ordered
      .map((i) => i.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .replace(/\bM\s*2\s*\)/i, 'M²)')
      .trim();
    const m = /^(.*?)\s*\(\s*(\d[\d,]*(?:\.\d+)?)\s*M²?\s*\)$/i.exec(text);
    const box = { ...unionCell(ordered, page.page), text };
    out.push(m?.[1] !== undefined && m[2] !== undefined ? { use: m[1].trim(), areaM2: m[2].replace(/,/g, ''), box } : { use: text, box });
  }
  return out;
}

/** One general note, its continuation lines joined: `- PARKING: … 70` + `SQ.M OF RETAIL NET AREA.` */
export interface GeneralNote {
  readonly text: string;
  readonly box: TextItem;
}

/**
 * The notes under `GENERAL NOTES`, each a dash-led paragraph.
 *
 * A note runs over as many lines as it needs, and the line after the dash is a
 * continuation, not a new note: plot 6457790's parking note ends "ONE BAY FOR
 * EACH 70" on one line and "SQ.M OF RETAIL NET AREA." on the next, and reading
 * the first line alone would rate retail at one bay per 70 of nothing.
 */
export function readGeneralNotes(page: PdfPageText): readonly GeneralNote[] {
  const heading = page.items.find((i) => /^GENERAL\s+NOTES$/i.test(i.text.trim()));
  if (!heading) return [];
  const column = page.items
    .filter(
      (i) =>
        i.bbox[0] > heading.bbox[2] &&
        i.bbox[0] - heading.bbox[2] < 40 &&
        Math.abs(i.bbox[1] - heading.bbox[1]) < 80 &&
        hasContent(i.text),
    )
    .sort((a, b) => b.bbox[1] - a.bbox[1]);
  const notes: TextItem[][] = [];
  for (const item of column) {
    if (/^-\s/.test(item.text.trim())) {
      notes.push([item]);
      continue;
    }
    /* A continuation sits directly under the line before it. The disclaimer in
       the footer starts at the same margin a line and a half further down, and
       is not part of the last note. */
    const last = notes.at(-1);
    const prev = last?.at(-1);
    const height = Math.max(1, item.bbox[3] - item.bbox[1]);
    if (last && prev && prev.bbox[1] - item.bbox[3] <= 0.8 * height) last.push(item);
  }
  return notes.map((parts) => {
    const text = parts
      .map((p) => p.text)
      .join(' ')
      .replace(/^-\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();
    return { text, box: { ...unionCell(parts, page.page), text } };
  });
}

/**
 * The value cell BELOW a label, within that label's own column.
 *
 * How the right-hand panel on this sheet is built: `COMMUNITY` over
 * `SAIH SHUAIB 1`, `PROJECT NAME` over `JABEL ALI HILLS`. The column constraint
 * is what stops the search walking down the page into the next panel's heading —
 * on this sheet `LEGEND` sits 23 points under the community value, and a
 * nearest-below search with no column would read a panel title as a community.
 */
export function valueBelow(page: PdfPageText, label: string): TextItem | undefined {
  const anchor = labelCell(page, label);
  if (!anchor) return undefined;
  const anchorMidX = (anchor.bbox[0] + anchor.bbox[2]) / 2;
  const below = page.items
    .filter((i) => {
      const drop = anchor.bbox[1] - i.bbox[3];
      if (drop < -2 || drop > BELOW_REACH_PT) return false;
      if (Math.abs((i.bbox[0] + i.bbox[2]) / 2 - anchorMidX) > COLUMN_SLACK_PT) return false;
      return hasContent(i.text);
    })
    .sort((a, b) => b.bbox[1] - a.bbox[1]);

  const first = below[0];
  if (!first) return undefined;

  /*
    THE WHOLE BASELINE, NOT THE FIRST CELL ON IT.

    `LAND USE / GFA SPLIT` is answered by two runs — `RESIDENTIAL` and
    `: APARTMENT` — which the content stream emits separately because the colon
    starts a new style. Returning the first of them reported the land use as
    "RESIDENTIAL" and silently dropped which kind of residential it is, which is
    the field that picks the unit mix. The column constraint above is what makes
    joining safe: nothing from a neighbouring panel is in this list.
  */
  const row = below.filter((i) => Math.abs(i.bbox[1] - first.bbox[1]) <= ROW_TOLERANCE_PT);
  const ordered = [...row].sort((a, b) => a.bbox[0] - b.bbox[0]);
  return {
    text: ordered
      .map((i) => i.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim(),
    page: page.page,
    bbox: [
      Math.min(...ordered.map((i) => i.bbox[0])),
      Math.min(...ordered.map((i) => i.bbox[1])),
      Math.max(...ordered.map((i) => i.bbox[2])),
      Math.max(...ordered.map((i) => i.bbox[3])),
    ],
  };
}

/**
 * A metric area off a `PLOT AREA` or `MAX. GFA` cell.
 *
 * The cell reads `1,040.04 M` and the superscript `2` arrives as its own text
 * item somewhere above the baseline, so the unit is matched as a bare `M` at the
 * end of the run. The imperial figure is in the NEXT cell and is never read:
 * `11,194.93 FT²` is the same area said twice, and reading the second copy would
 * put a unit conversion between the sheet and the engine for no gain.
 */
export function metricArea(item: TextItem | undefined): string | undefined {
  if (!item) return undefined;
  const m = /^\s*(\d[\d,]*(?:\.\d+)?)\s*(?:M|SQ\.?\s*M\.?|M²)\s*$/i.exec(item.text);
  if (!m?.[1]) return undefined;
  return m[1].replace(/,/g, '');
}

// ---------------------------------------------------------------------------
// The survey table
// ---------------------------------------------------------------------------

/** One row of the `PLOT COORDINATES` table, verbatim. */
export interface SurveyPoint {
  readonly id: string;
  /** Metres east on the stated grid, as printed. */
  readonly east: string;
  /** Metres north on the stated grid, as printed. */
  readonly north: string;
}

export interface SurveyTable {
  /** `DLTM`, read off the sheet's own footer and never assumed. */
  readonly system: string;
  readonly points: readonly SurveyPoint[];
  /** The union of every cell read, for the citation. */
  readonly box: TextItem;
}

/**
 * A coordinate is six or seven digits before the point and three after it.
 *
 * Narrow on purpose. The DLTM false easting puts a Dubai plot at 4xx,xxx and
 * 27xx,xxx, and the pattern is what separates a coordinate from a plot number,
 * a dimension and a scale-bar tick — all of which are bare numerals on this
 * sheet within a few hundred points of the table.
 */
const COORD = /^\d{5,8}\.\d{2,4}$/;

const ROW_BAND_PT = 4;

/**
 * Read the `PLOT COORDINATES` table.
 *
 * Built from the raw items rather than from `pageLines`, and the reason is
 * worth the paragraph: `pageLines` splits a baseline into columns at a wide
 * horizontal gap, which is correct for a form whose unrelated blocks share a
 * row, and wrong for a table whose cells are 30 to 50 points apart. Driving the
 * table off that helper read every coordinate as a separate line.
 *
 * Returns `undefined` rather than a partial table: a ring missing a vertex is a
 * different plot, and it would close silently.
 */
export function readSurveyTable(page: PdfPageText): SurveyTable | undefined {
  const header = labelCell(page, 'PLOT COORDINATES');
  if (!header) return undefined;

  /* `COORDINATES SYSTEM IS DLTM`, with the plural the sheet actually prints —
     the singular cost the whole table on the first run. */
  const SYSTEM = /COORDINATES?\s*SYSTEM\s*IS\s+(\S+)/i;
  const systemCell = page.items.find((i) => SYSTEM.test(i.text));
  const system = systemCell ? (SYSTEM.exec(systemCell.text)?.[1] ?? '') : '';
  if (system === '') return undefined;

  /* The table lives between its own heading and the footer naming the grid.
     Bounding it by those two cells rather than by a distance keeps a sheet at a
     different scale readable, and keeps the scale bar's numerals out. */
  const top = header.bbox[1];
  const bottom = systemCell ? systemCell.bbox[3] : 0;
  const left = header.bbox[0] - 60;
  const right = header.bbox[2] + 120;

  const cells = page.items.filter(
    (i) =>
      i.bbox[3] <= top &&
      i.bbox[1] >= bottom &&
      i.bbox[0] >= left &&
      i.bbox[2] <= right &&
      i.text.trim() !== '',
  );

  const rows: TextItem[][] = [];
  for (const cell of [...cells].sort((a, b) => b.bbox[1] - a.bbox[1])) {
    const row = rows.at(-1);
    const prev = row?.[0];
    if (row && prev && Math.abs(prev.bbox[1] - cell.bbox[1]) <= ROW_BAND_PT) row.push(cell);
    else rows.push([cell]);
  }

  const points: SurveyPoint[] = [];
  const read: TextItem[] = [];
  for (const row of rows) {
    const ordered = [...row].sort((a, b) => a.bbox[0] - b.bbox[0]);
    const texts = ordered.map((i) => i.text.trim());
    if (texts.length < 3) continue;
    const [id, east, north] = texts;
    if (id === undefined || east === undefined || north === undefined) continue;
    if (!/^\d{1,3}$/.test(id) || !COORD.test(east) || !COORD.test(north)) continue;
    points.push({ id, east, north });
    read.push(...ordered.slice(0, 3));
  }

  /* Three points is a triangle and the smallest ring that has an area. Fewer is
     a table this reader has misread, and reporting it would hand the form a
     shape that is not a plot. */
  if (points.length < 3) return undefined;

  return {
    system,
    points,
    box: {
      text: points.map((p) => `${p.id} ${p.east} ${p.north}`).join(' · '),
      page: page.page,
      bbox: [
        Math.min(...read.map((i) => i.bbox[0])),
        Math.min(...read.map((i) => i.bbox[1])),
        Math.max(...read.map((i) => i.bbox[2])),
        Math.max(...read.map((i) => i.bbox[3])),
      ],
    },
  };
}

/** One boundary of the surveyed ring, in the form the plot form already takes. */
export interface SurveyLeg {
  readonly lengthM: string;
  /** Degrees clockwise from grid north. */
  readonly bearingDeg: string;
}

/** Metres and degrees, to the precision the printed coordinates support. */
const LENGTH_DP = 3;
const BEARING_DP = 3;
const AREA_DP = 2;

const round = (n: number, dp: number): string => {
  const f = 10 ** dp;
  return (Math.round(n * f) / f).toFixed(dp);
};

/**
 * The ring's boundaries, closed.
 *
 * DLTM is a transverse-Mercator grid in metres, so a leg is plane trigonometry
 * on the printed numbers and nothing else: no projection, no datum shift, no
 * tolerance. This is the one shape in the whole intake that is not an estimate —
 * which is exactly why it must not be mixed into `PlotOutline`, whose legs are
 * fitted to a raster and documented as ASSUMED.
 *
 * The bearing is grid north, which is what the engine's traverse already takes,
 * and the convergence between grid and true north is NOT applied: it is under a
 * tenth of a degree anywhere in Dubai, the sheet states no value for it, and an
 * unstated correction applied silently is the hidden default this codebase
 * refuses everywhere else.
 */
export function surveyLegs(points: readonly SurveyPoint[]): readonly SurveyLeg[] {
  const legs: SurveyLeg[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    const de = Number(b.east) - Number(a.east);
    const dn = Number(b.north) - Number(a.north);
    const bearing = ((Math.atan2(de, dn) * 180) / Math.PI + 360) % 360;
    legs.push({
      lengthM: round(Math.hypot(de, dn), LENGTH_DP),
      bearingDeg: round(bearing, BEARING_DP),
    });
  }
  return legs;
}

/**
 * The ring's area by the shoelace, in m².
 *
 * Its job is the cross-check against the printed `PLOT AREA`: on plot 5134565
 * it returns 1040.04 against a printed 1,040.04, which is what makes the six
 * vertices trustworthy enough to hand to the form. A table that does NOT
 * reproduce the printed area has been misread, and the caller says so rather
 * than offering the shape.
 */
export function surveyAreaM2(points: readonly SurveyPoint[]): string {
  let twice = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    twice += Number(a.east) * Number(b.north) - Number(b.east) * Number(a.north);
  }
  return round(Math.abs(twice) / 2, AREA_DP);
}
