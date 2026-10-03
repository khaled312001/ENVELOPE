/**
 * The two affection-plan layouts the first intake did not know.
 *
 * The parser in `affection-plan.ts` was written against Trakhees sheets — the three
 * samples on file — and read everything else badly. Eng. Mohamed uploaded three of
 * his own and got back almost nothing, and one wrong number: on a Dubai Development
 * Authority sheet the plot area came back as 150 m², read out of the parking note
 * ("ONE BAY FOR EACH UNIT LESS THAN OR EQUAL TO 150 SQ.M GFA"), on a plot of
 * 1,040.04 m². This module reads the two layouts those sheets use:
 *
 * - **DDA** (`gis.dda.gov.ae`): a label table down the left — PLOT NUMBER, PLOT AREA,
 *   MAX. GFA, MAX. HEIGHT, MAX. COVERAGE, a SETBACK table of numbered SIDES with a
 *   BUILDING and a PODIUM column, LAND USE / GFA SPLIT, PLOT COORDINATES — a panel
 *   down the right with each label ABOVE its value, and general notes along the
 *   bottom that carry whatever a cell says "SEE NOTES" for.
 * - **Dubai Municipality**, the Unified Site Plan: bilingual labels, values written
 *   in Arabic. pdfjs hands Arabic back one glyph per item in VISUAL order, so
 *   «وبنسبة طابقية = 5.0» arrives as `5.0 = ة ي ق ب ا ط ة ب س ن ب و`. Every Arabic
 *   phrase is therefore matched in both orders with any spacing between letters —
 *   `arabic()` below — rather than by un-reversing the text, which the lam-alef
 *   ligature makes unreliable.
 *
 * WHAT IS NOT READ is still not read. A field these layouts do not print — the DDA
 * prints no FAR, the Municipality sheet no GFA — stays absent, and where the sheet
 * states a limit in a form the engine has no parameter for, it is carried and
 * shown, not converted into one that sounds close.
 */

import { Decimal, type HeightAllowance, type SetbackValue } from '@envelope/core';

import type { PdfPageText, TextItem } from './pdf-text.js';

/** A number as these sheets print one: digits, optional thousands commas, optional decimals. */
const NUM = String.raw`\d[\d,]*(?:\.\d+)?`;
const num = (raw: string): Decimal => new Decimal(raw.replace(/,/g, ''));

// ---------------------------------------------------------------------------
// Arabic, in either order
// ---------------------------------------------------------------------------

/**
 * A pattern for an Arabic phrase as it may come out of a PDF: in logical order, or
 * glyph by glyph in visual order, with or without spaces between the glyphs.
 *
 * Spaces inside the phrase are dropped first, because a visual-order extraction
 * spaces every glyph and keeps no word boundary to match against.
 */
export function arabic(phrase: string): string {
  const glyphs = [...phrase.normalize('NFKC').replace(/\s+/g, '')];
  const forward = glyphs.map(escape).join(String.raw`\s*`);
  const backward = [...glyphs].reverse().map(escape).join(String.raw`\s*`);
  return `(?:${forward}|${backward})`;
}

const escape = (c: string): string => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const has = (text: string, phrase: string): boolean => new RegExp(arabic(phrase)).test(text);

// ---------------------------------------------------------------------------
// Positions
// ---------------------------------------------------------------------------

const midY = (i: TextItem): number => (i.bbox[1] + i.bbox[3]) / 2;
const midX = (i: TextItem): number => (i.bbox[0] + i.bbox[2]) / 2;
const flat = (s: string): string => s.replace(/\s+/g, ' ').trim();

/** Items on the same row as `anchor`, to its right, nearest first. */
function rightOf(page: PdfPageText, anchor: TextItem, tolerance = 4): readonly TextItem[] {
  return page.items
    .filter((i) => i !== anchor && Math.abs(midY(i) - midY(anchor)) <= tolerance && i.bbox[0] >= anchor.bbox[2] - 1)
    .sort((a, b) => a.bbox[0] - b.bbox[0]);
}

/**
 * The value printed under a label in a side panel — the DDA's right-hand column
 * puts "MASTER DEVELOPER" in one band and "MERAAS ESTATES (L.L.C)" centred in the
 * band below. The nearest item below the label whose box overlaps the panel's width.
 */
export function valueBelow(page: PdfPageText, label: RegExp): TextItem | undefined {
  const anchor = page.items.find((i) => label.test(flat(i.text)));
  if (!anchor) return undefined;
  const panelLeft = anchor.bbox[0] - 10;
  const panelRight = anchor.bbox[0] + 260;
  return page.items
    .filter((i) => {
      if (i === anchor || flat(i.text) === '') return false;
      const below = anchor.bbox[1] - i.bbox[3];
      return below >= 0 && below <= 30 && i.bbox[0] >= panelLeft && i.bbox[2] <= panelRight;
    })
    .sort((a, b) => b.bbox[3] - a.bbox[3])[0];
}

// ---------------------------------------------------------------------------
// Height
// ---------------------------------------------------------------------------

/** The ordinal a Municipality height states a podium count in. */
const ORDINALS: readonly [string, number][] = [
  ['أول', 1],
  ['ثاني', 2],
  ['ثالث', 3],
  ['رابع', 4],
  ['خامس', 5],
];

/**
 * A Municipality height, «أرضي + أول لقاعدة البرج + (16) طابق» — ground, one level
 * of tower base, sixteen floors: `G+1P+16`.
 *
 * Read segment by segment between the plus signs, and only when every segment is
 * one this function knows: the ground, a tower-base (podium) level count, the
 * typical floors. Anything else — a mezzanine, a roof, a basement — returns
 * undefined, and the height is reported as not read rather than read without it.
 */
export function parseArabicHeight(line: string): HeightAllowance | undefined {
  const text = line.normalize('NFKC');
  if (!has(text, 'أرضي') || !has(text, 'طابق')) return undefined;
  let ground = false;
  let podium = 0;
  let typical: number | undefined;
  for (const segment of text.split('+')) {
    const n = /(\d+)/.exec(segment)?.[1];
    if (has(segment, 'أرضي')) {
      ground = true;
    } else if (has(segment, 'قاعدة')) {
      const ordinal = ORDINALS.find(([word]) => has(segment, word))?.[1];
      const count = n !== undefined ? Number(n) : ordinal;
      if (count === undefined) return undefined;
      podium += count;
    } else if (has(segment, 'طابق') && n !== undefined) {
      typical = Number(n);
    } else {
      return undefined;
    }
  }
  if (!ground || typical === undefined) return undefined;
  return {
    podiumLevels: podium,
    typicalFloors: typical,
    totalLevels: 1 + podium + typical,
    raw: podium > 0 ? `G+${podium}P+${typical}` : `G+${typical}`,
  };
}

// ---------------------------------------------------------------------------
// FAR, in Arabic
// ---------------------------------------------------------------------------

/** «نسبة طابقية = 5.0», in either order. */
export function arabicFar(text: string): { readonly value: string; readonly verbatim: string } | undefined {
  const t = text.normalize('NFKC');
  const visual = new RegExp(String.raw`(${NUM})\s*=\s*${arabic('طابقية')}`).exec(t);
  if (visual?.[1] !== undefined) return { value: visual[1], verbatim: visual[0] };
  const logical = new RegExp(String.raw`${arabic('طابقية')}\s*=\s*(${NUM})`).exec(t);
  if (logical?.[1] !== undefined) return { value: logical[1], verbatim: logical[0] };
  return undefined;
}

// ---------------------------------------------------------------------------
// Setbacks stated as a share of the height
// ---------------------------------------------------------------------------

const SHARES: readonly [RegExp, string, string][] = [
  [/\bQUARTER\b/i, 'ربع', '0.25'],
  [/\bTHIRD\b/i, 'ثلث', '0.3333333333'],
  [/\bHALF\b/i, 'نصف', '0.5'],
];

/**
 * "SETBACK: QUARTER OF THE HEIGHT FROM NEIGHBORING PLOTS AND FROM CENTER OF SIKKA -
 * MAXIMUM 7.5M AND A MINIMUM OF 3M", or the Municipality's «ربع الارتفاع من الجوار
 * ومن منتصف السكيك وبحد أقصى 7.5 متر وبحد أدنى 3 متر».
 *
 * A setback that depends on the building's height — which is why it is a value of
 * its own and not a number: the height is what the run is solving for.
 */
export function heightShareSetback(text: string): { readonly value: SetbackValue; readonly verbatim: string } | undefined {
  const t = text.normalize('NFKC');
  // English: the note, on one line.
  const en = /SETBACK\s*:?\s*(QUARTER|THIRD|HALF)\s+OF\s+THE\s+(?:BUILDING\s+)?HEIGHT[^\n]*/i.exec(t);
  if (en) {
    const line = en[0];
    const share = SHARES.find(([word]) => word.test(en[1] ?? ''))?.[2];
    const max = new RegExp(String.raw`MAXIMUM\s+(?:OF\s+)?(${NUM})\s*M`, 'i').exec(line)?.[1];
    const min = new RegExp(String.raw`MINIMUM\s+(?:OF\s+)?(${NUM})\s*M`, 'i').exec(line)?.[1];
    if (share !== undefined) {
      return {
        value: {
          kind: 'HEIGHT_SHARE',
          share: new Decimal(share),
          ...(min !== undefined ? { minMetres: num(min) } : {}),
          ...(max !== undefined ? { maxMetres: num(max) } : {}),
          from: /SIKKA/i.test(line) ? 'neighbouring plots and the centre of a sikka' : 'neighbouring plots',
        },
        verbatim: line.replace(/^-\s*/, '').trim(),
      };
    }
  }
  // Arabic: the setback row's value line, in either order.
  for (const line of t.split('\n')) {
    const share = SHARES.find(([, word]) => has(line, word) && has(line, 'الجوار'));
    if (!share) continue;
    const max =
      new RegExp(String.raw`(${NUM})\s*${arabic('أقصى')}`).exec(line)?.[1] ??
      new RegExp(String.raw`${arabic('أقصى')}\s*(${NUM})`).exec(line)?.[1];
    const min =
      new RegExp(String.raw`(${NUM})\s*${arabic('أدنى')}`).exec(line)?.[1] ??
      new RegExp(String.raw`${arabic('أدنى')}\s*(${NUM})`).exec(line)?.[1];
    return {
      value: {
        kind: 'HEIGHT_SHARE',
        share: new Decimal(share[2]),
        ...(min !== undefined ? { minMetres: num(min) } : {}),
        ...(max !== undefined ? { maxMetres: num(max) } : {}),
        from: has(line, 'السكيك') ? 'neighbouring plots and the centre of a sikka' : 'neighbouring plots',
      },
      verbatim: line.trim(),
    };
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// The DDA setback table
// ---------------------------------------------------------------------------

/** One numbered side of a DDA setback table, as its two cells print it. */
export interface SideSetback {
  /** "1", "2" — the sheet's own numbering, which its drawing writes along the edges. */
  readonly side: string;
  /** What the BUILDING cell prints: a distance, SEE NOTES, or N/A. */
  readonly building: SideCell;
  readonly podium: SideCell;
}

export type SideCell =
  | { readonly kind: 'METRES'; readonly metres: Decimal }
  | { readonly kind: 'SEE_NOTES' }
  | { readonly kind: 'NOT_APPLICABLE' }
  | { readonly kind: 'BLANK' };

function cellOf(text: string | undefined): SideCell {
  const t = flat(text ?? '');
  if (t === '') return { kind: 'BLANK' };
  if (/^SEE\s+NOTES?$/i.test(t)) return { kind: 'SEE_NOTES' };
  if (/^N\s*\/\s*A$|^NIL$|^-$/i.test(t)) return { kind: 'NOT_APPLICABLE' };
  const m = new RegExp(String.raw`^(${NUM})\s*M?$`, 'i').exec(t);
  return m?.[1] !== undefined ? { kind: 'METRES', metres: num(m[1]) } : { kind: 'BLANK' };
}

/**
 * Read the table cell by cell: the BUILDING and PODIUM headers give the two
 * columns, each "SIDE ( n )" a row, and a cell is the item on that row whose
 * centre falls under a header. Read by position because the text arrives in
 * pieces — "SIDE ( 1 )", "SEE NOTES" and "N/A" come back as three lines.
 */
export function readSideTable(page: PdfPageText): { readonly rows: readonly SideSetback[]; readonly anchor: TextItem } | undefined {
  const header = page.items.find((i) => /^SETBACK\s*\(\s*M\s*\)$/i.test(flat(i.text)));
  if (!header) return undefined;
  const onHeaderRow = (i: TextItem): boolean => Math.abs(midY(i) - midY(header)) <= 4;
  const building = page.items.find((i) => onHeaderRow(i) && /^BUILDING$/i.test(flat(i.text)));
  const podium = page.items.find((i) => onHeaderRow(i) && /^PODIUM$/i.test(flat(i.text)));
  if (!building || !podium) return undefined;
  const under = (column: TextItem, i: TextItem): boolean => Math.abs(midX(i) - midX(column)) <= 30;

  const rows = page.items
    .filter((i) => /^SIDE\s*\(\s*\d+\s*\)$/i.test(flat(i.text)))
    .sort((a, b) => b.bbox[1] - a.bbox[1])
    .map((row) => {
      const cells = rightOf(page, row);
      return {
        side: /\d+/.exec(row.text)?.[0] ?? '',
        building: cellOf(cells.find((c) => under(building, c))?.text),
        podium: cellOf(cells.find((c) => under(podium, c))?.text),
      };
    });
  return rows.length > 0 ? { rows, anchor: header } : undefined;
}

// ---------------------------------------------------------------------------
// The DDA coordinate table
// ---------------------------------------------------------------------------

export interface SheetCoordinates {
  /** The grid the sheet names — "COORDINATES SYSTEM IS DLTM". */
  readonly system: string;
  /** In the table's order, which is the order the drawing numbers the corners. */
  readonly points: readonly { readonly id: string; readonly east: Decimal; readonly north: Decimal }[];
}

/**
 * The PLOT COORDINATES table: an EAST and a NORTH column, one row per numbered
 * corner. A pair is an item under EAST with an item under NORTH on its row — or
 * one item holding both, as pdfjs sometimes joins them.
 */
export function readCoordinates(page: PdfPageText): { readonly value: SheetCoordinates; readonly anchor: TextItem } | undefined {
  const title = page.items.find((i) => /^PLOT\s+COORDINATES$/i.test(flat(i.text)));
  const east = page.items.find((i) => /^EAST$/i.test(flat(i.text)));
  const north = page.items.find((i) => /^NORTH$/i.test(flat(i.text)));
  if (!title || !east || !north) return undefined;
  const top = Math.min(east.bbox[1], north.bbox[1]);
  const pairRe = /^(\d{5,7}\.\d+)\s+(\d{6,8}\.\d+)$/;
  const coordRe = /^(\d{5,8}\.\d+)$/;
  const rows: { y: number; east: string; north: string }[] = [];
  for (const i of page.items) {
    if (i.bbox[3] > top) continue;
    const t = flat(i.text);
    const pair = pairRe.exec(t);
    if (pair && Math.abs(midX(i) - (midX(east) + midX(north)) / 2) <= 80) {
      rows.push({ y: midY(i), east: pair[1]!, north: pair[2]! });
      continue;
    }
    if (coordRe.test(t) && Math.abs(midX(i) - midX(east)) <= 30) {
      const partner = page.items.find(
        (j) => j !== i && Math.abs(midY(j) - midY(i)) <= 3 && Math.abs(midX(j) - midX(north)) <= 30 && coordRe.test(flat(j.text)),
      );
      if (partner) rows.push({ y: midY(i), east: t, north: flat(partner.text) });
    }
  }
  if (rows.length < 3) return undefined;
  rows.sort((a, b) => b.y - a.y);
  // A table ends at its first gap: rows more than three row-heights apart are a
  // different table (or the drawing's own coordinate grid).
  const kept = [rows[0]!];
  for (let k = 1; k < rows.length; k += 1) {
    if (kept[k - 1]!.y - rows[k]!.y > 40) break;
    kept.push(rows[k]!);
  }
  const system = /COORDINATES?\s+SYSTEM\s+IS\s+(\w+)/i.exec(page.items.map((i) => i.text).join('\n'))?.[1] ?? 'UNSTATED';
  return {
    value: {
      system,
      points: kept.map((r, k) => ({ id: String(k + 1), east: new Decimal(r.east), north: new Decimal(r.north) })),
    },
    anchor: title,
  };
}

// ---------------------------------------------------------------------------
// Land use
// ---------------------------------------------------------------------------

/**
 * The DDA's LAND USE / GFA SPLIT rows — "RESIDENTIAL : APARTMENT", "COMMERCIAL :
 * RETAIL (1,680.00 M²)" — joined, with the superscript the PDF drops put back.
 */
export function ddaLandUse(page: PdfPageText): { readonly value: string; readonly anchor: TextItem } | undefined {
  const title = page.items.find((i) => /^LAND\s+USE\s*\/\s*GFA\s+SPLIT$/i.test(flat(i.text)));
  if (!title) return undefined;
  const rows = page.items
    .filter((i) => /^[A-Z][A-Z &/-]+$/.test(flat(i.text)) && i.bbox[0] <= title.bbox[0] + 4)
    .filter((i) => {
      const below = title.bbox[1] - i.bbox[3];
      return below >= 0 && below <= 60;
    })
    .sort((a, b) => b.bbox[1] - a.bbox[1])
    .map((label) => {
      const rest = rightOf(page, label)
        .filter((r) => r.bbox[0] - label.bbox[2] < 20)
        .map((r) => flat(r.text))
        .join(' ');
      const row = flat(`${flat(label.text)} ${rest}`)
        .replace(/\s*:\s*/, ' : ')
        .replace(/(\d)\s*M\s*2?\s*\)?\s*$/, '$1 m²)')
        .replace(/(\d)\s*M\s*2?\s*\)/g, '$1 m²)')
        .replace(/\(\s*/g, '(');
      // The superscript and the closing bracket are items of their own, often
      // dropped from the row; an opened bracket is closed rather than left open.
      return (row.match(/\(/g)?.length ?? 0) > (row.match(/\)/g)?.length ?? 0) ? `${row})` : row;
    })
    .filter((r) => r.includes(':'));
  return rows.length > 0 ? { value: rows.join('; '), anchor: title } : undefined;
}

/** The Municipality's land use: «تجاري , مكاتب , سكني» beside a zone code such as RC2/18. */
export function municipalityLandUse(text: string): { readonly value: string; readonly verbatim: string } | undefined {
  const uses: readonly [string, string][] = [
    ['تجاري', 'commercial'],
    ['مكاتب', 'offices'],
    ['سكني', 'residential'],
    ['صناعي', 'industrial'],
    ['فندقي', 'hotel'],
  ];
  for (const line of text.normalize('NFKC').split('\n')) {
    const found = uses.filter(([ar]) => has(line, ar));
    if (found.length === 0) continue;
    const zone = /\b([A-Z]{1,4}\d*\/\d+[A-Za-z0-9]*)\b/.exec(line)?.[1];
    // A line of uses with a zone code beside it is the Landuse row; the same
    // words elsewhere on the sheet (a remark, a note) are not.
    if (zone === undefined) continue;
    return { value: `${zone}: ${found.map(([, en]) => en).join(', ')}`, verbatim: line.trim() };
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Parking, as the sheet states it
// ---------------------------------------------------------------------------

/** The DDA's "- PARKING: …" note, joined across its wrapped line. */
export function ddaParking(page: PdfPageText): { readonly value: string; readonly anchor: TextItem } | undefined {
  const anchor = page.items.find((i) => /^-?\s*PARKING\s*:/i.test(flat(i.text)));
  if (!anchor) return undefined;
  let value = flat(anchor.text).replace(/^-\s*/, '');
  // A note that wraps continues on the next row, flush left, without a dash.
  const next = page.items.find(
    (i) => i !== anchor && Math.abs(i.bbox[0] - anchor.bbox[0]) <= 2 && anchor.bbox[1] - i.bbox[3] >= 0 && anchor.bbox[1] - i.bbox[3] <= 6,
  );
  if (next && !/^-/.test(flat(next.text))) value = `${value} ${flat(next.text)}`;
  return { value, anchor };
}

// ---------------------------------------------------------------------------
// Arabic, put back in reading order for a quotation
// ---------------------------------------------------------------------------

const ARABIC = /[؀-ۿﭐ-﷿ﹰ-﻿]/;

/**
 * A line of Arabic as a reader reads it, rebuilt from the glyphs' positions.
 *
 * pdfjs returns this script one glyph per item, left to right across the page, so
 * the extracted line is the phrase backwards with every letter spaced — a citation
 * nobody could read against the sheet. The positions are exact, so the line is
 * rebuilt right to left, a space where the gap between two glyphs is wider than a
 * letter's, and each glyph turned back round (the lam-alef ligature comes out as
 * one item written backwards). Numbers and Latin keep their own direction.
 */
export function readingOrder(page: PdfPageText, line: TextItem): string {
  const items = page.items
    .filter((i) => Math.abs(midY(i) - midY(line)) <= 4 && i.bbox[0] >= line.bbox[0] - 1 && i.bbox[2] <= line.bbox[2] + 1)
    .filter((i) => flat(i.text) !== '')
    .sort((a, b) => b.bbox[0] - a.bbox[0]);
  let out = '';
  let prev: TextItem | undefined;
  for (const i of items) {
    const t = flat(i.text);
    const word = ARABIC.test(t) ? [...t].reverse().join('') : t;
    if (prev) {
      const gap = prev.bbox[0] - i.bbox[2];
      const h = Math.max(1, i.bbox[3] - i.bbox[1]);
      if (gap > h * 0.15 || !ARABIC.test(t) || !ARABIC.test(flat(prev.text))) out += ' ';
    }
    out += word;
    prev = i;
  }
  return out.normalize('NFKC').replace(/\s+/g, ' ').trim();
}

/** The extracted line on which `pattern` matches, for a quotation in reading order. */
export function lineMatching(lines: readonly TextItem[], pattern: RegExp): TextItem | undefined {
  return lines.find((l) => pattern.test(l.text.normalize('NFKC')));
}
