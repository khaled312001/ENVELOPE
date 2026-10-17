/**
 * The clause register, held to the reference it lists.
 *
 * `packages/rules/src/register` names every clause of B.4, B.5, B.7 and C.6.4 with
 * a page and a verbal form. `docs/02-reference/dbc/*.md` is the transcription those
 * were read from, audited against the PDF. This reads the transcription the way a
 * person would — one `####` entry per clause, its `Pages:` line, its obligation —
 * and reports every way the register and the reference disagree:
 *
 *  - an entry naming a clause the reference does not print;
 *  - an entry on a page other than the one the clause is printed on;
 *  - an entry whose verbal form is not the clause's;
 *  - a clause the reference prints and the register leaves out — the silence the
 *    register exists to end;
 *  - a clause listed twice.
 *
 * Figures are not clauses (each illustrates one), and C.6 contributes only C.6.4 and
 * its two tables, which is the register's stated scope.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DIR = fileURLToPath(new URL('../docs/02-reference/dbc/', import.meta.url));

/** The reference files the register covers, and what of each is in scope. */
const FILES: readonly { readonly file: string; readonly inScope: (clause: string) => boolean }[] = [
  { file: 'B.4-general-architectural-provisions.md', inScope: () => true },
  { file: 'B.5-minimum-space-requirements.md', inScope: () => true },
  { file: 'B.7-building-access-and-vehicular-requirements.md', inScope: () => true },
  {
    file: 'C.6-accessible-vehicular-supplement.md',
    inScope: (c) => c.startsWith('C.6.4') || /^Table C\.1[78]\b/.test(c),
  },
];

export interface ReferenceClause {
  readonly clause: string;
  readonly page: number;
  /** As the reference prints it: `shall`, `may (the protrusion); shall (…)`, … */
  readonly obligationText: string;
  readonly obligation: 'SHALL' | 'SHOULD' | 'MAY' | 'DEFINITION' | 'INFORMATIVE';
  /** The reference's own "Mechanisable from plot geometry + inputs?" answer. */
  readonly mechanisable: string;
}

/**
 * A mixed paragraph takes its strongest verbal form, as the register does: a
 * reader sorting on "mandatory" must not lose the mandatory half of "may … shall".
 */
export function normaliseObligation(text: string): ReferenceClause['obligation'] {
  const t = text.toLowerCase();
  if (/\bshall\b/.test(t)) return 'SHALL';
  if (/\bshould\b/.test(t)) return 'SHOULD';
  if (/\bmay\b/.test(t)) return 'MAY';
  if (/\bdefinition\b/.test(t)) return 'DEFINITION';
  return 'INFORMATIVE';
}

function read(): ReferenceClause[] {
  const out: ReferenceClause[] = [];
  for (const { file, inScope } of FILES) {
    let cur: { clause: string; page: number | null; obligation: string | null; mech: string; rowObligation: string | null } | null =
      null;
    const flush = (): void => {
      if (cur === null || cur.page === null) return;
      if (/^Figure /.test(cur.clause) || !inScope(cur.clause)) return;
      const text = cur.obligation ?? cur.rowObligation ?? '';
      out.push({
        clause: cur.clause,
        page: cur.page,
        obligationText: text,
        obligation: normaliseObligation(text),
        mechanisable: cur.mech,
      });
    };
    for (const line of readFileSync(DIR + file, 'utf8').split(/\r?\n/)) {
      const h = /^#### (.*?)\s*$/.exec(line);
      if (h) {
        flush();
        cur = { clause: h[1]!, page: null, obligation: null, mech: '', rowObligation: null };
        continue;
      }
      if (/^#{1,3} /.test(line)) {
        flush();
        cur = null;
        continue;
      }
      if (cur === null) continue;
      const p = /^- \*\*Pages:\*\* EN p(\d+)/.exec(line);
      if (p && cur.page === null) cur.page = Number(p[1]);
      const o = /^- \*\*Obligation:\*\* (.*)$/.exec(line);
      if (o) cur.obligation = o[1]!;
      const every = /^- Obligation of (?:every row|the row): \*\*(\w+)\*\*/.exec(line);
      if (every) cur.obligation = every[1]!;
      const m = /^- \*\*Mechanisable[^*]*\*\* (.*)$/.exec(line);
      if (m) cur.mech = m[1]!;
      // A table with no obligation line carries one per row; the first row's stands for it.
      if (cur.obligation === null && cur.rowObligation === null && line.startsWith('|') && !/^\|\s*-/.test(line)) {
        const cells = line.split('|').map((c) => c.trim());
        const form = cells.find((c) => /^(shall|should|may)\b/.test(c));
        if (form) cur.rowObligation = form;
      }
    }
    flush();
  }
  return out;
}

let cache: ReferenceClause[] | undefined;

/** Every in-scope clause the reference prints, in its order. */
export function referenceClauses(): readonly ReferenceClause[] {
  cache ??= read();
  return cache;
}

interface RegisterLike {
  readonly clause: string;
  readonly page: number;
  readonly obligation: string;
}

/** Every disagreement between a register and the reference. Empty means held. */
export function registerProblems(entries: readonly RegisterLike[]): string[] {
  const ref = referenceClauses();
  const byClause = new Map(ref.map((r) => [r.clause, r]));
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const e of entries) {
    if (seen.has(e.clause)) problems.push(`${e.clause}: listed twice`);
    seen.add(e.clause);
    const r = byClause.get(e.clause);
    if (r === undefined) {
      problems.push(`${e.clause}: no such clause in docs/02-reference/dbc`);
      continue;
    }
    if (r.page !== e.page) problems.push(`${e.clause}: register says p${e.page}, the reference prints it on p${r.page}`);
    if (r.obligation !== e.obligation) {
      problems.push(`${e.clause}: register says ${e.obligation}, the reference says "${r.obligationText}"`);
    }
  }
  for (const r of ref) {
    if (!seen.has(r.clause)) problems.push(`${r.clause} (p${r.page}): printed in the reference and missing from the register`);
  }
  return problems;
}
