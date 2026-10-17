/**
 * A DBC citation, held to the page it names.
 *
 * `docs/02-reference/dbc/*.md` is the Dubai Building Code transcribed clause by
 * clause, each English quote under the page it is printed on, and audited
 * mechanically against the PDF (see that folder's README). The PDF itself is not
 * in git, so a test cannot open it; the transcription is, and it is the next best
 * witness — one that was checked against the page rather than typed beside it.
 *
 * A citation's `sourceTextVerbatim` is split on ` … ` (the mark for text left out).
 * Each piece must then be one of two things:
 *
 *  - a run of prose found inside the English quotes printed on `sourcePage`,
 *    ignoring only whitespace, case and the shape of quote marks; or
 *  - a table row as its cells, `Table B.9 [Straight See Figure B.51 | 12% | 3]`,
 *    found as consecutive cells of a row of that table on that page.
 *
 * Anything else — a sentence stitched from two clauses, a cell paraphrased into
 * prose — is reported. That is the class of defect this exists to catch: a
 * "verbatim" field nobody can find on the page.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DIR = fileURLToPath(new URL('../docs/02-reference/dbc/', import.meta.url));

interface Quote {
  readonly page: number;
  readonly text: string;
}
interface TableRow {
  readonly table: string;
  readonly page: number;
  /**
   * The last page the table is printed on. A table that runs over a page break
   * (Table B.4, "EN p58–59") lists its rows under one heading and does not say
   * which row fell on which page, so a row is accepted on any page of the range
   * — and only of the range: a row cited to a page the table is not on is still
   * reported.
   */
  readonly lastPage: number;
  readonly cells: readonly string[];
}

/** Whitespace, case and quote shape are the only differences forgiven. */
const norm = (s: string): string =>
  s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, '')
    .toLowerCase();

/** A cell as printed may span two lines; the transcription brackets the second. */
const normCell = (s: string): string => norm(s).replace(/[()]/g, '');

function read(): { quotes: Quote[]; rows: TableRow[] } {
  const quotes: Quote[] = [];
  const rows: TableRow[] = [];
  for (const file of readdirSync(DIR).filter((f) => f.endsWith('.md'))) {
    let page = 0;
    let lastPage = 0;
    let table = '';
    for (const line of readFileSync(DIR + file, 'utf8').split(/\r?\n/)) {
      const heading = /^#{2,4} /.exec(line);
      if (heading) {
        const t = /^#### (Table B\.\d+|Table C\.\d+)\b/.exec(line);
        table = t ? t[1]! : '';
      }
      const p = /^- \*\*Pages:\*\* EN p(\d+)(?:–(\d+))?/.exec(line);
      if (p) {
        page = Number(p[1]);
        lastPage = p[2] ? Number(p[2]) : page;
      }
      const q = /^- \*\*EN:\*\* "(.*)"\s*$/.exec(line);
      if (q) quotes.push({ page, text: q[1]! });
      if (table && line.startsWith('|') && !/^\|\s*-/.test(line)) {
        rows.push({ table, page, lastPage, cells: line.split('|').slice(1, -1).map((c) => c.trim()) });
      }
    }
  }
  return { quotes, rows };
}

let cache: ReturnType<typeof read> | undefined;

/** Every piece of a citation's verbatim text that is NOT on its page. Empty means held. */
export function unfoundOnPage(citation: { sourcePage: number; sourceTextVerbatim: string }): string[] {
  cache ??= read();
  const { quotes, rows } = cache;
  const page = citation.sourcePage;
  const onPage = quotes.filter((q) => q.page === page).map((q) => norm(q.text));
  const missing: string[] = [];
  for (const piece of citation.sourceTextVerbatim.split(' … ')) {
    const cells = /^(Table [BC]\.\d+) \[(.*)\]$/.exec(piece);
    if (cells) {
      const want = cells[2]!.split(' | ').map(normCell);
      const found = rows.some((r) => {
        if (r.table !== cells[1] || page < r.page || page > r.lastPage) return false;
        const have = r.cells.map(normCell);
        for (let i = 0; i + want.length <= have.length; i += 1) {
          if (want.every((w, k) => have[i + k] === w)) return true;
        }
        return false;
      });
      if (!found) missing.push(piece);
      continue;
    }
    if (!onPage.some((q) => q.includes(norm(piece)))) missing.push(piece);
  }
  return missing;
}

/** The cells of every transcribed row of one table, in the order printed. */
export function tableRows(table: string): readonly (readonly string[])[] {
  cache ??= read();
  return cache.rows.filter((r) => r.table === table).map((r) => r.cells);
}
