/**
 * THE DDA'S "UNIFIED SITE PLAN" — a fourth sheet, and the reference project's.
 *
 * Plot 6468096 (City of Arabia), whose project brief is the target output spec in
 * `docs/00-source/samples/rfp`, comes with a sheet from the Development
 * Information System rather than from either DDA layout `dda.ts` reads: a bilingual
 * table titled `SITE PLAN`, `Parcel ID` and `Community` across the top, the
 * limits down the left (`Land Use`, `Maximum GFA`, `Maximum Height`, `Maximum Plot
 * Coverage`, a `SETBACK (m)` table of BUILDING / PODIUM by `Side n`), the areas
 * along the bottom and the issue and expiry dates set vertically in the margin.
 *
 * Nothing was read from it. Every field came back "not printed", the sheet was
 * UNDATED, and the run went ahead on placeholder rules: FAR 5 and fourteen levels
 * on a plot whose sheet prints `SEE NOTES` against its GFA, its height and every
 * setback, and "APPROVED MASTER PLAN IS REQUIRED PRIOR TO ANY SUBMITTALS."
 *
 * WHY THE OPERATOR LIST AND NOT THE TEXT LAYER.
 *
 * The generator sets every glyph with its own text-showing operator and moves to
 * the next with `Td`, in a Type 3 font whose widths pdfjs's text layer does not
 * know. The text layer therefore returns 1,068 fragments — `S`, `E`, `EN`, `O`,
 * `T E`, `S` for "SEE NOTES" — with spaces it guessed from wrong widths, so a
 * space appears inside "Developer" and vanishes from "CITY OF". The CONTENT
 * STREAM is exact: the generator writes each space as a space glyph, and each
 * label between one `BT` and its `ET`. So this module walks the operator list, as
 * `dm.ts` does for the drawing, and rebuilds one item per run with the generator's
 * own spacing and direction — the road labels at 45°, the dates at 90° — and the
 * readers below work on those items like any other page.
 *
 * WHAT IT CLAIMS. Every figure is read from a labelled cell and cited to it.
 * `SEE NOTES` is a deferral, reported as a gap with the sheet's own note quoted;
 * nothing is filled. A road label is matched to the `SIDE n` it is drawn beside,
 * one to one or not at all.
 */

import { type PdfPageText, type TextItem, cellLeftOf, unionCell } from './pdf-text.js';

// ---------------------------------------------------------------------------
// Which sheet
// ---------------------------------------------------------------------------

/**
 * Is this the unified site plan? Its `Parcel ID` label and the Development
 * Information System's address, `gis.dda.gov.ae/dis`, which names the issuer.
 *
 * Matched with every space removed, because on the text layer each glyph is its
 * own item — `P a r c e l I D` — and the label is only a label once joined.
 * The Municipality's sheet also prints `Parcel ID` and is told apart by its own
 * markers first (`isDmSheet`); the DDA's other sheet prints `PLOT NUMBER`.
 */
export function isUnifiedSitePlan(page: PdfPageText): boolean {
  const joined = page.items
    .map((i) => i.text)
    .join('')
    .replace(/\s+/g, '')
    .toUpperCase();
  return joined.includes('PARCELID') && joined.includes('GIS.DDA.GOV.AE/DIS');
}

// ---------------------------------------------------------------------------
// Text runs off the operator list
// ---------------------------------------------------------------------------

/** The operators this reader follows, by the numbers pdfjs gives them. */
export interface TextOps {
  readonly save: number;
  readonly restore: number;
  readonly transform: number;
  readonly beginText: number;
  readonly endText: number;
  readonly setFont: number;
  readonly setTextMatrix: number;
  readonly moveText: number;
  readonly setLeadingMoveText: number;
  readonly nextLine: number;
  readonly setLeading: number;
  readonly setCharSpacing: number;
  readonly setWordSpacing: number;
  readonly setHScale: number;
  readonly showText: number;
  readonly showSpacedText: number;
  readonly nextLineShowText: number;
  readonly nextLineSetSpacingShowText: number;
}

type M6 = readonly [number, number, number, number, number, number];
const IDENTITY: M6 = [1, 0, 0, 1, 0, 0];
const mul = (a: M6, b: M6): M6 => [
  a[0] * b[0] + a[2] * b[1],
  a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3],
  a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4],
  a[1] * b[4] + a[3] * b[5] + a[5],
];

const asMatrix = (v: unknown): M6 | undefined => {
  const src = Array.isArray(v) ? v : v && typeof v === 'object' ? Object.values(v as Record<string, unknown>) : [];
  const n = src.slice(0, 6).map(Number);
  return n.length === 6 && n.every((x) => Number.isFinite(x)) ? (n as unknown as M6) : undefined;
};

interface Glyph {
  readonly unicode: string;
  /** Origin in page points. */
  readonly x: number;
  readonly y: number;
  /** Unit vectors of the run's baseline and its up direction, page space. */
  readonly ux: number;
  readonly uy: number;
  /** Type size on the page, points. */
  readonly size: number;
  /** Advance on the page, points — an estimate where the font's matrix is not 1/1000. */
  readonly advance: number;
}

/**
 * Every text run on the page, one item per run, rebuilt from the operator list.
 *
 * A run is the glyphs between one `BT` and its `ET` that follow one another
 * along one baseline; a glyph off that baseline, or behind the last, starts the
 * next. Each item's box is axis-aligned around the run however it is rotated,
 * which is what a citation's box is. Pure over the operator list, so a test can
 * drive it without a PDF.
 */
export function textRuns(ops: { readonly fnArray: readonly number[]; readonly argsArray: readonly unknown[] }, O: TextOps, page = 1): readonly TextItem[] {
  const out: TextItem[] = [];
  const stack: M6[] = [];
  let ctm: M6 = IDENTITY;
  let tm: M6 = IDENTITY;
  let tlm: M6 = IDENTITY;
  let size = 1;
  let leading = 0;
  let charSpacing = 0;
  let wordSpacing = 0;
  let hScale = 1;
  let run: Glyph[] = [];

  const flush = (): void => {
    const text = run.map((g) => g.unicode).join('').replace(/\s+/g, ' ').trim();
    if (text !== '') {
      const xs: number[] = [];
      const ys: number[] = [];
      for (const g of run) {
        const ex = g.x + g.ux * g.advance;
        const ey = g.y + g.uy * g.advance;
        // Up is the baseline turned a quarter anticlockwise.
        for (const [px, py] of [[g.x, g.y], [ex, ey], [g.x - g.uy * g.size, g.y + g.ux * g.size], [ex - g.uy * g.size, ey + g.ux * g.size]] as const) {
          xs.push(px);
          ys.push(py);
        }
      }
      out.push({ text, page, bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] });
    }
    run = [];
  };

  const show = (glyphs: unknown): void => {
    if (!Array.isArray(glyphs)) return;
    for (const g of glyphs) {
      if (typeof g === 'number') {
        // A TJ adjustment, thousandths of an em, against the writing direction.
        tm = mul(tm, [1, 0, 0, 1, (-g / 1000) * size * hScale, 0]);
        continue;
      }
      if (!g || typeof g !== 'object') continue;
      const glyph = g as { unicode?: unknown; width?: unknown; isSpace?: unknown };
      const unicode = typeof glyph.unicode === 'string' ? glyph.unicode : '';
      const width = typeof glyph.width === 'number' ? glyph.width : 0;
      const m = mul(ctm, tm);
      const scale = Math.hypot(m[0], m[1]) || 1;
      const ux = m[0] / scale;
      const uy = m[1] / scale;
      const advText = ((width / 1000) * size + charSpacing + (glyph.isSpace === true ? wordSpacing : 0)) * hScale;
      const next: Glyph = { unicode, x: m[4], y: m[5], ux, uy, size: Math.abs(size) * Math.hypot(m[2], m[3]), advance: advText * scale };
      const last = run.at(-1);
      if (last) {
        const dx = next.x - last.x;
        const dy = next.y - last.y;
        const along = dx * last.ux + dy * last.uy;
        const across = -dx * last.uy + dy * last.ux;
        const turned = Math.abs(ux - last.ux) > 0.05 || Math.abs(uy - last.uy) > 0.05;
        // Off the baseline, behind the last glyph, or a gutter away: another run.
        if (turned || Math.abs(across) > 0.3 * last.size || along < -0.3 * last.size || along > last.advance + 1.5 * last.size) flush();
      }
      run.push(next);
      tm = mul(tm, [1, 0, 0, 1, advText, 0]);
    }
  };

  for (let i = 0; i < ops.fnArray.length; i += 1) {
    const fn = ops.fnArray[i];
    const a = ops.argsArray[i] as readonly unknown[] | null | undefined;
    if (fn === O.save) stack.push(ctm);
    else if (fn === O.restore) ctm = stack.pop() ?? IDENTITY;
    else if (fn === O.transform) ctm = mul(ctm, asMatrix(a) ?? IDENTITY);
    else if (fn === O.beginText) {
      flush();
      tm = IDENTITY;
      tlm = IDENTITY;
    } else if (fn === O.endText) flush();
    else if (fn === O.setFont) size = Number(a?.[1] ?? 1) || 1;
    else if (fn === O.setTextMatrix) {
      tm = asMatrix(a?.[0] !== undefined && typeof a[0] === 'object' ? a[0] : a) ?? IDENTITY;
      tlm = tm;
    } else if (fn === O.moveText || fn === O.setLeadingMoveText) {
      const tx = Number(a?.[0] ?? 0);
      const ty = Number(a?.[1] ?? 0);
      if (fn === O.setLeadingMoveText) leading = -ty;
      tlm = mul(tlm, [1, 0, 0, 1, tx, ty]);
      tm = tlm;
    } else if (fn === O.setLeading) leading = Number(a?.[0] ?? 0);
    else if (fn === O.nextLine) {
      tlm = mul(tlm, [1, 0, 0, 1, 0, -leading]);
      tm = tlm;
    } else if (fn === O.setCharSpacing) charSpacing = Number(a?.[0] ?? 0);
    else if (fn === O.setWordSpacing) wordSpacing = Number(a?.[0] ?? 0);
    else if (fn === O.setHScale) hScale = Number(a?.[0] ?? 100) / 100;
    else if (fn === O.showText || fn === O.showSpacedText) show(a?.[0]);
    else if (fn === O.nextLineShowText) {
      tlm = mul(tlm, [1, 0, 0, 1, 0, -leading]);
      tm = tlm;
      show(a?.[0]);
    } else if (fn === O.nextLineSetSpacingShowText) {
      wordSpacing = Number(a?.[0] ?? 0);
      charSpacing = Number(a?.[1] ?? 0);
      tlm = mul(tlm, [1, 0, 0, 1, 0, -leading]);
      tm = tlm;
      show(a?.[2]);
    }
  }
  flush();
  return out;
}

interface PdfJsOps {
  getDocument(src: Record<string, unknown>): {
    promise: Promise<{
      readonly numPages: number;
      getPage(n: number): Promise<{
        getOperatorList(): Promise<{ fnArray: number[]; argsArray: unknown[] }>;
        getViewport(o: { scale: number }): { width: number; height: number };
      }>;
      destroy(): Promise<void>;
    }>;
  };
  readonly OPS: TextOps;
}

/** The first page as text runs, opened the way `readDmDrawing` opens it. */
export async function readTextRuns(bytes: Uint8Array): Promise<PdfPageText | undefined> {
  const { ensureDOMMatrix } = await import('./dom-matrix.js');
  ensureDOMMatrix();
  const mod = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfJsOps;
  const doc = await mod.getDocument({ data: Uint8Array.from(bytes), isEvalSupported: false }).promise;
  try {
    if (doc.numPages < 1) return undefined;
    const p = await doc.getPage(1);
    const viewport = p.getViewport({ scale: 1 });
    return { page: 1, width: viewport.width, height: viewport.height, items: textRuns(await p.getOperatorList(), mod.OPS, 1) };
  } finally {
    await doc.destroy();
  }
}

// ---------------------------------------------------------------------------
// The template's cells
// ---------------------------------------------------------------------------

/** A value on this sheet is set in ASCII; the Arabic label beside it is not a value. */
const latin = (t: string): boolean => /^[\x20-\x7E²]+$/.test(t) && /[A-Za-z0-9]/.test(t);

/** Labels of this template, which never answer one another. */
const LABELS = new Set(
  [
    'Parcel ID', 'Community', 'Authority', 'DLD Ref Number', 'SITE PLAN', 'Land Use', 'Maximum GFA',
    'Maximum Height', 'Maximum Plot', 'Coverage', 'Setback', 'Remarks', 'Developer', 'Developer Number',
    'Owner', 'Owner Title', 'Total Area', 'Affected Area', 'Sikka Setback', 'Compensation', 'Area',
    'Balance Area', 'Can Be Built', 'Issue Date', 'Expiry Date', 'General Notes', 'Legend',
  ].map((l) => l.toUpperCase()),
);

const isValue = (t: string): boolean => latin(t) && !LABELS.has(t.replace(/\s+/g, ' ').trim().toUpperCase());

/** The value LEFT of a label on this sheet, which sets each value a little above its English label. */
export function unifiedCell(page: PdfPageText, label: string, accept: (t: string) => boolean = isValue): TextItem | undefined {
  return cellLeftOf(page, label, { rowTolerance: 12, maxDistance: 320, accept: (t) => isValue(t) && accept(t) });
}

/**
 * A date set vertically under its vertical label: `Issue Date` over `23/11/2022`.
 *
 * Both run up the margin at 90°, so "under" is lower on the page within the
 * label's own narrow column. Matched by that column, not by distance alone —
 * the expiry date stands one column over, nine points away.
 */
export function unifiedDate(page: PdfPageText, label: string): TextItem | undefined {
  const want = label.toUpperCase();
  const anchor = page.items.find((i) => i.text.trim().toUpperCase() === want);
  if (!anchor) return undefined;
  const overlap = (i: TextItem): number => Math.min(i.bbox[2], anchor.bbox[2]) - Math.max(i.bbox[0], anchor.bbox[0]);
  return page.items
    .filter((i) => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(i.text.trim()))
    .filter((i) => i.bbox[3] <= anchor.bbox[1] + 2 && anchor.bbox[1] - i.bbox[3] < 80)
    .filter((i) => overlap(i) > 0.5 * Math.min(i.bbox[2] - i.bbox[0], anchor.bbox[2] - anchor.bbox[0]))
    .sort((a, b) => b.bbox[3] - a.bbox[3])[0];
}

/** The plot-specific notes: dash-led and set in capitals ("- APPROVED MASTER PLAN IS REQUIRED …"). */
export function unifiedNotes(page: PdfPageText): readonly TextItem[] {
  return page.items.filter((i) => {
    const t = i.text.trim();
    return /^-\s+\S/.test(t) && /[A-Z]/.test(t) && t === t.toUpperCase() && latin(t);
  });
}

/** One boundary dimension the drawing prints: `87.25m`. */
export function unifiedDimensions(page: PdfPageText): readonly TextItem[] {
  return page.items.filter((i) => /^\d+(?:\.\d+)?m$/.test(i.text.trim()));
}

/** A road label beside the side it is drawn against. */
export interface SideRoadCell {
  readonly side: number;
  readonly verbatim: string;
  /** The width the label prints, metres, as printed. */
  readonly widthM: string;
  readonly box: TextItem;
}

/**
 * Each `ROAD 12.00M` label paired with the `SIDE n` drawn nearest it.
 *
 * MUTUAL NEAREST, OR NOTHING. A road label is set outside the plot and the side
 * label inside it, so the pairing is a proximity, and a proximity can be
 * ambiguous; a pair is kept only where each is the other's nearest. A road no
 * side claims is reported without a side rather than given one.
 */
export function unifiedSideRoads(page: PdfPageText): { readonly paired: readonly SideRoadCell[]; readonly unpaired: readonly TextItem[] } {
  const centre = (i: TextItem): readonly [number, number] => [(i.bbox[0] + i.bbox[2]) / 2, (i.bbox[1] + i.bbox[3]) / 2];
  const dist = (a: TextItem, b: TextItem): number => {
    const p = centre(a);
    const q = centre(b);
    return Math.hypot(p[0] - q[0], p[1] - q[1]);
  };
  const roads = page.items.filter((i) => /^ROAD\s+\d+(?:\.\d+)?\s*M$/i.test(i.text.trim()));
  const sides = page.items.filter((i) => /^SIDE\s+\d{1,2}$/.test(i.text.trim()));
  const nearest = <T extends TextItem>(of: TextItem, among: readonly T[]): T | undefined =>
    [...among].sort((a, b) => dist(of, a) - dist(of, b))[0];
  const paired: SideRoadCell[] = [];
  const unpaired: TextItem[] = [];
  for (const road of roads) {
    const side = nearest(road, sides);
    if (!side || nearest(side, roads) !== road) {
      unpaired.push(road);
      continue;
    }
    const verbatim = road.text.replace(/\s+/g, ' ').trim();
    paired.push({
      side: Number(/(\d+)$/.exec(side.text.trim())?.[1]),
      verbatim,
      widthM: /(\d+(?:\.\d+)?)\s*M$/i.exec(verbatim)?.[1] ?? '',
      box: { ...unionCell([road, side], page.page), text: `${side.text.trim()}: ${verbatim}` },
    });
  }
  return { paired: paired.sort((a, b) => a.side - b.side), unpaired };
}
