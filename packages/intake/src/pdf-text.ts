/**
 * Positioned text extraction from a PDF.
 *
 * Every value this package emits has to carry a `Citation`, and `Citation`
 * requires `sourcePage`, `sourceBbox` and `sourceTextVerbatim` (PRD §13.2). So
 * intake cannot use a "give me the page as a string" extractor: the bounding box
 * has to survive from the glyph to the provenance node, or the UI cannot
 * highlight the clause it claims to be quoting.
 *
 * pdfjs is loaded through its `legacy` build. The default build assumes a DOM
 * (`DOMMatrix`, `Path2D`) that Node does not have; the legacy build is the one
 * Mozilla ships for exactly this case.
 */

import { ensureDOMMatrix } from './dom-matrix.js';

/** One positioned run of text as the PDF's content stream laid it out. */
export interface TextItem {
  readonly text: string;
  /** 1-based, matching `Citation.sourcePage`. */
  readonly page: number;
  /** `[x0, y0, x1, y1]` in PDF user space, origin bottom-left. */
  readonly bbox: readonly [number, number, number, number];
}

export interface PdfPageText {
  readonly page: number;
  readonly width: number;
  readonly height: number;
  readonly items: readonly TextItem[];
}

/**
 * The slice of pdfjs this module uses.
 *
 * Declared locally rather than imported: the legacy build has no type entry
 * point, and `verbatimModuleSyntax` plus `NodeNext` makes importing its types a
 * fight that buys nothing. Naming the four members actually called is both
 * smaller and more honest about the coupling.
 */
interface PdfJsTextContentItem {
  readonly str?: string;
  readonly transform?: readonly number[];
  readonly width?: number;
  readonly height?: number;
}
interface PdfJsPage {
  getTextContent(): Promise<{ items: readonly PdfJsTextContentItem[] }>;
  getViewport(o: { scale: number }): { width: number; height: number };
}
interface PdfJsDocument {
  readonly numPages: number;
  getPage(n: number): Promise<PdfJsPage>;
  destroy(): Promise<void>;
}
interface PdfJsModule {
  getDocument(o: {
    data: Uint8Array;
    useSystemFonts?: boolean;
    isEvalSupported?: boolean;
  }): { promise: Promise<PdfJsDocument> };
}

/**
 * Control characters embedded in the content stream.
 *
 * Not a theoretical concern. The DJAZ1TRE10RES022 sheet stores its height code
 * with a NUL byte between the podium count and the plus sign, so the string is
 * `G`, `+`, `3`, `P`, NUL, `+`, `6`. Every pattern for `G+nP+n` misses it — and
 * the plot then reports no permitted height at all — until these are dropped.
 */
const CONTROL_CHARS = new RegExp('[\u0000-\u001F\u007F]', 'g');

let cached: PdfJsModule | undefined;

async function pdfjs(): Promise<PdfJsModule> {
  // Before the import, because pdfjs constructs a DOMMatrix at module level. See
  // `dom-matrix.ts` for why this is not the native canvas package.
  ensureDOMMatrix();
  cached ??= (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfJsModule;
  return cached;
}

/**
 * Read positioned text from a PDF.
 *
 * `pages` limits the read — an affection plan is one sheet, but the same
 * extractor is pointed at an 843-page building code, where reading everything to
 * find one clause would be absurd.
 */
export async function readPdfText(
  bytes: Uint8Array,
  opts: { readonly pages?: readonly number[] } = {},
): Promise<readonly PdfPageText[]> {
  const mod = await pdfjs();
  // pdfjs transfers ownership of the buffer it is given and neuters the
  // original. Callers reasonably expect their own array to survive the call.
  const doc = await mod.getDocument({
    data: Uint8Array.from(bytes),
    useSystemFonts: true,
    isEvalSupported: false,
  }).promise;

  try {
    const wanted = opts.pages ?? Array.from({ length: doc.numPages }, (_, i) => i + 1);
    const out: PdfPageText[] = [];

    for (const n of wanted) {
      if (n < 1 || n > doc.numPages) continue;
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();

      const items: TextItem[] = [];
      for (const raw of content.items) {
        const text = (raw.str ?? '').replace(CONTROL_CHARS, '');
        if (text.trim() === '') continue;
        const t = raw.transform;
        if (!t || t.length < 6) continue;
        const x = t[4] ?? 0;
        const y = t[5] ?? 0;
        const w = raw.width ?? 0;
        // `height` is the glyph box; for a single run it is the font size, which
        // is the best available proxy for the line box.
        const h = raw.height ?? 0;
        items.push({ text, page: n, bbox: [x, y, x + w, y + h] });
      }

      out.push({ page: n, width: viewport.width, height: viewport.height, items });
    }
    return out;
  } finally {
    await doc.destroy();
  }
}

/**
 * Reconstruct visual lines by grouping items that share a baseline.
 *
 * pdfjs emits one item per *word*, not per line, and in content-stream order
 * rather than reading order. Scanning regexes over those items joined naively
 * makes every line-oriented pattern fail: "GF & Podium: 0m from all sides"
 * arrives as seven separate items, so a pattern anchored on "Podium:" and
 * reading to end-of-line captures nothing at all.
 *
 * Grouping by baseline and sorting by x rebuilds the row a human sees, which is
 * the unit these sheets are actually written in.
 */
export function pageLines(page: PdfPageText, tolerance = 5): readonly TextItem[] {
  const rows: TextItem[][] = [];
  for (const item of [...page.items].sort((a, b) => b.bbox[1] - a.bbox[1])) {
    const row = rows.at(-1);
    const prev = row?.[0];
    if (row && prev && Math.abs(prev.bbox[1] - item.bbox[1]) <= tolerance) row.push(item);
    else rows.push([item]);
  }
  return rows.flatMap((row) => {
    const ordered = [...row].sort((a, b) => a.bbox[0] - b.bbox[0]);
    return splitColumns(ordered).map((segment) => ({
      text: segment.map((i) => i.text).join(' ').replace(/\s+/g, ' ').trim(),
      page: page.page,
      bbox: [
        Math.min(...segment.map((i) => i.bbox[0])),
        Math.min(...segment.map((i) => i.bbox[1])),
        Math.max(...segment.map((i) => i.bbox[2])),
        Math.max(...segment.map((i) => i.bbox[3])),
      ] as const,
    }));
  });
}

/**
 * Break a baseline into columns at a wide horizontal gap.
 *
 * A shared baseline is not a shared sentence. An affection plan is a form, and
 * a form puts unrelated blocks side by side — on `IC1-CTYL-16_011` the setback
 * note sits at the same height as the QR-code validation panel, which is
 * typeset in Arabic with an embedded font that has no usable ToUnicode map. The
 * two used to arrive joined, so the setback the user was shown read
 *
 *   `GF & Podium: 0m from all sides اŘرÆªاد Please scan QR code … | Tower: …`
 *
 * The *parsed* values were right, which is exactly why this was worth fixing at
 * the source rather than by scrubbing the string on the way out: it was correct
 * by luck, and the same join on a sheet whose neighbouring column happened to
 * contain a number would have been correct by nothing.
 *
 * The threshold is relative to the row's own text height rather than absolute,
 * so it survives a sheet issued at a different scale. Four line-heights of
 * whitespace is far wider than any inter-word or label-to-value gap and far
 * narrower than the gutter between form panels.
 */
function splitColumns(ordered: readonly TextItem[]): readonly (readonly TextItem[])[] {
  if (ordered.length < 2) return [ordered];

  const heights = ordered.map((i) => i.bbox[3] - i.bbox[1]).filter((h) => h > 0).sort((a, b) => a - b);
  const median = heights[Math.floor(heights.length / 2)] ?? 0;
  if (median <= 0) return [ordered];
  const maxGap = median * 4;

  const out: TextItem[][] = [[ordered[0]!]];
  for (let i = 1; i < ordered.length; i += 1) {
    const prev = ordered[i - 1]!;
    const item = ordered[i]!;
    // Overlapping boxes give a negative gap; that is one column, not two.
    if (item.bbox[0] - prev.bbox[2] > maxGap) out.push([item]);
    else out.at(-1)!.push(item);
  }
  return out;
}

/** The page as visual lines, newline-separated — the input regexes expect. */
export function pageText(page: PdfPageText): string {
  return pageLines(page)
    .map((l) => l.text)
    .join('\n');
}

/**
 * Find the item whose text contains `needle`, so a regex hit can be traced back
 * to the box it came from.
 *
 * Matching is done on whitespace-collapsed text because the content stream
 * splits runs at arbitrary points — `GFA=4778.31 Sq. m` routinely arrives as
 * three items, and a caller that matched the joined string would otherwise have
 * no box to cite.
 */
export function locate(page: PdfPageText, needle: string): TextItem | undefined {
  const flat = (s: string): string => s.replace(/\s+/g, ' ').trim();
  const target = flat(needle);
  if (target === '') return undefined;

  const direct = page.items.find((i) => flat(i.text).includes(target));
  if (direct) return direct;

  /*
    THE ROW FIRST, THE CONTENT STREAM SECOND.

    The span below walks items in content-stream order, which is not reading
    order: on the Trakhees sheets the stream interleaves the English line with
    the Arabic label beside it, set in a font with no usable ToUnicode map. So
    "1365.23 SQ. M." was cited as `plot area اŚرض Ĺñéċ … G+2P+8 GFA=…` — the
    union of everything the stream emitted between the first and the last word —
    and a setback line longer than twelve items was not found at all, and was
    cited by its first word, `GF/`. A value read off one row is quoted from that
    row: the shortest run of its items, left to right, that holds the needle.
  */
  const onRow = locateOnRow(page, target);
  if (onRow) return onRow;

  // Span the runs that together cover the needle, and return their union box.
  const n = page.items.length;
  for (let start = 0; start < n; start += 1) {
    let joined = '';
    for (let end = start; end < Math.min(n, start + 12); end += 1) {
      const item = page.items[end];
      if (!item) break;
      joined = flat(`${joined} ${item.text}`);
      if (!joined.includes(target)) continue;
      const span = page.items.slice(start, end + 1);
      return {
        text: span.map((i) => i.text).join(' '),
        page: page.page,
        bbox: [
          Math.min(...span.map((i) => i.bbox[0])),
          Math.min(...span.map((i) => i.bbox[1])),
          Math.max(...span.map((i) => i.bbox[2])),
          Math.max(...span.map((i) => i.bbox[3])),
        ],
      };
    }
  }
  return undefined;
}

/** Items sharing a baseline, top row first, each row left to right. */
function baselineRows(page: PdfPageText, tolerance: number): readonly (readonly TextItem[])[] {
  const rows: TextItem[][] = [];
  for (const item of [...page.items].sort((a, b) => b.bbox[1] - a.bbox[1])) {
    const row = rows.at(-1);
    const prev = row?.[0];
    if (row && prev && Math.abs(prev.bbox[1] - item.bbox[1]) <= tolerance) row.push(item);
    else rows.push([item]);
  }
  return rows.map((row) => [...row].sort((a, b) => a.bbox[0] - b.bbox[0]));
}

/** The union of some items as one citable cell, their texts joined by single spaces. */
export function unionCell(items: readonly TextItem[], page: number): TextItem {
  return {
    text: items
      .map((i) => i.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim(),
    page,
    bbox: [
      Math.min(...items.map((i) => i.bbox[0])),
      Math.min(...items.map((i) => i.bbox[1])),
      Math.max(...items.map((i) => i.bbox[2])),
      Math.max(...items.map((i) => i.bbox[3])),
    ],
  };
}

/** The shortest left-to-right run of one row's items whose joined text holds `target`. */
function locateOnRow(page: PdfPageText, target: string): TextItem | undefined {
  const flat = (s: string): string => s.replace(/\s+/g, ' ').trim();
  for (const row of baselineRows(page, 2)) {
    if (!flat(row.map((i) => i.text).join(' ')).includes(target)) continue;
    let best: readonly TextItem[] | undefined;
    for (let start = 0; start < row.length; start += 1) {
      let joined = '';
      for (let end = start; end < row.length; end += 1) {
        joined = flat(`${joined} ${row[end]!.text}`);
        if (!joined.includes(target)) continue;
        const span = row.slice(start, end + 1);
        if (!best || span.length < best.length) best = span;
        break;
      }
    }
    if (best) return unionCell(best, page.page);
  }
  return undefined;
}

/**
 * The visual line holding a word — the citation of last resort.
 *
 * Used where a value was read by a pattern over the page and its own words
 * cannot be found as a run: the line it sits on is a true, if wider, quotation.
 * Quoting the first word alone (`GF/`) was not.
 */
export function lineContaining(page: PdfPageText, word: string): TextItem | undefined {
  const target = word.replace(/\s+/g, ' ').trim();
  if (target === '') return undefined;
  return pageLines(page).find((l) => l.text.includes(target));
}

/**
 * The page's words grouped into PHRASES: runs on one baseline whose gaps are
 * word spaces rather than the gutter between two cells of a form.
 *
 * What a label is matched against. A Trakhees sheet sets `Developer` once as the
 * label of the developer's cell and again as the first word of `Developer Plot
 * No.`, and its general notes say "Master Developer's Guidelines" two rows
 * above. A substring search for "Developer" found the note first and read the
 * value beside it — "Master" — which then filled the plot form and every title
 * block built from it. A phrase is matched whole, so the label is the label.
 */
export function phraseCells(page: PdfPageText): readonly TextItem[] {
  const out: TextItem[] = [];
  for (const row of baselineRows(page, 2)) {
    let run: TextItem[] = [];
    const flush = (): void => {
      if (run.length > 0) out.push(unionCell(run, page.page));
      run = [];
    };
    for (const item of row) {
      if (item.text.trim() === '') continue;
      const prev = run.at(-1);
      const height = Math.max(1, item.bbox[3] - item.bbox[1]);
      // A word space is a quarter to a third of the type size; a cell gutter is several.
      if (prev && item.bbox[0] - prev.bbox[2] > height * 0.6) flush();
      run.push(item);
    }
    flush();
  }
  return out;
}

const upperFlat = (s: string): string => s.replace(/\s+/g, ' ').trim().toUpperCase();

/**
 * The value cell LEFT of a label matched as a whole phrase, joined across its words.
 *
 * `valueLeftOf` returns the single item nearest the label, which on Trakhees is
 * the last word of the value: `WARSAN 1 - 621` came back as "621", and the
 * community the form filled in was a number. The phrase is the cell.
 *
 * `accept` narrows what may answer — a plot number is digits — so that a label
 * whose own cell is empty is not answered by the next label along.
 */
export function cellLeftOf(
  page: PdfPageText,
  label: string,
  opts: {
    readonly rowTolerance?: number;
    readonly maxDistance?: number;
    readonly accept?: (text: string) => boolean;
    /** Which of several identical labels: the one this predicate picks. Default the first in reading order. */
    readonly anchor?: (cell: TextItem) => boolean;
  } = {},
): TextItem | undefined {
  const cells = phraseCells(page);
  const want = upperFlat(label);
  const anchor = cells.find((c) => upperFlat(c.text) === want && (opts.anchor?.(c) ?? true));
  if (!anchor) return undefined;
  const rowTolerance = opts.rowTolerance ?? 14;
  const maxDistance = opts.maxDistance ?? 420;
  const mid = (i: TextItem): number => (i.bbox[1] + i.bbox[3]) / 2;
  return cells
    .filter((c) => {
      if (c === anchor) return false;
      if (c.bbox[2] > anchor.bbox[0] + 2) return false;
      if (anchor.bbox[0] - c.bbox[2] > maxDistance) return false;
      if (Math.abs(mid(c) - mid(anchor)) > rowTolerance) return false;
      return opts.accept?.(c.text) ?? true;
    })
    .sort((a, b) => b.bbox[2] - a.bbox[2])[0];
}

/*
  A RUN OF GLYPHS NO READER CAN READ.

  The Trakhees sheets set their Arabic in an embedded font whose ToUnicode map
  is missing, so it decodes to Latin-1 and Latin Extended letters — `Ĺñéċ`,
  `ð¸ÍĢ`. No figure or English word on these sheets carries a diacritic, so a
  word holding one is a glyph run, not text. Quoted as "the sheet's words" it
  is worse than nothing: it is evidence nobody can check against the page.
*/
const GARBLED = /[¨ª¯´¸ºÀ-ɏ]/;

/** The words of a citation, with the undecodable glyph runs taken out. */
export function cleanVerbatim(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => !GARBLED.test(w))
    .join(' ');
}

/**
 * The value cell for a form label, for the fields that are not self-describing.
 *
 * These sheets are laid out right-to-left: the bilingual label sits in a cell on
 * the right and its value in the cell to its left, on the same row. "Same row"
 * is the operative test — `Community`, `Developer` and `Owner` are stacked close
 * enough that a nearest-neighbour search without a row constraint picks the
 * wrong one.
 */
export function valueLeftOf(
  page: PdfPageText,
  label: string,
  opts: { readonly rowTolerance?: number; readonly maxDistance?: number } = {},
): TextItem | undefined {
  const anchor = locate(page, label);
  if (!anchor) return undefined;
  const rowTolerance = opts.rowTolerance ?? 14;
  const maxDistance = opts.maxDistance ?? 420;
  const anchorMidY = (anchor.bbox[1] + anchor.bbox[3]) / 2;

  const candidates = page.items
    .filter((i) => {
      if (i.bbox[2] > anchor.bbox[0] + 2) return false; // must be to the left
      if (anchor.bbox[0] - i.bbox[2] > maxDistance) return false;
      const midY = (i.bbox[1] + i.bbox[3]) / 2;
      if (Math.abs(midY - anchorMidY) > rowTolerance) return false;
      return i.text.trim() !== '';
    })
    // Nearest to the label wins — the value cell abuts it.
    .sort((a, b) => b.bbox[2] - a.bbox[2]);

  return candidates[0];
}
