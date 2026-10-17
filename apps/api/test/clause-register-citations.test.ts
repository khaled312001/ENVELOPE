/**
 * THE CLAUSE REGISTER, HELD TO THE ENGINE IT DESCRIBES. 17 Oct 2026.
 *
 * `packages/rules/test/clause-register.test.ts` holds every entry to its page in
 * `docs/02-reference/dbc`. This holds the other side: an entry that says APPLIED
 * must name something that exists, and everything in the engine that cites the
 * code must be named by an APPLIED entry on its page. Neither the rules package
 * nor the report may see the engine, so the check sits here, at the composition
 * root, where all of them are visible.
 *
 * It also holds every register sentence to its Arabic: `@envelope/report/words`
 * duplicates the English keys because it may not import the rules, and an entry
 * that drifted would print English on the Arabic report.
 */

import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Citation } from '@envelope/core';
import { engineNote } from '@envelope/report/words';
import {
  APPLIED_IN_WORDS,
  CLAUSE_DETAIL,
  ClauseStatus,
  DBC_REGISTER,
  NOT_APPLICABLE_REASON,
  NOT_ASSESSED_REASON,
  SEED_RULES,
  WRITTEN_PROMISES,
  clauseRegisterCounts,
  type AppliedClause,
  type ClauseApplication,
} from '@envelope/rules';
import { clauseCoverageSentence } from '@envelope/validation';
import { beforeAll, describe, expect, it } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const CAPACITY_SRC = join(ROOT, 'packages/capacity/src');

const isDbcCitation = (v: unknown): v is Citation =>
  typeof v === 'object' &&
  v !== null &&
  (v as { instrumentId?: unknown }).instrumentId === 'DUBAI_BUILDING_CODE' &&
  typeof (v as { sourcePage?: unknown }).sourcePage === 'number' &&
  typeof (v as { sourceTextVerbatim?: unknown }).sourceTextVerbatim === 'string';

/** Every exported DBC `Citation` constant in the engine, by module path and name. */
const engineCitations = new Map<string, Citation>();
const exportsByModule = new Map<string, Record<string, unknown>>();

beforeAll(async () => {
  for (const file of readdirSync(CAPACITY_SRC).filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))) {
    const module = `packages/capacity/src/${file}`;
    const exported = (await import(join(CAPACITY_SRC, file))) as Record<string, unknown>;
    exportsByModule.set(module, exported);
    for (const [name, value] of Object.entries(exported)) {
      if (isDbcCitation(value)) engineCitations.set(`${module}#${name}`, value);
    }
  }
});

const appliedEntries = DBC_REGISTER.entries.filter((e): e is AppliedClause => e.status === ClauseStatus.APPLIED);
const applications = (kind: ClauseApplication['kind']): { entry: AppliedClause; by: ClauseApplication }[] =>
  appliedEntries.flatMap((entry) => entry.by.filter((b) => b.kind === kind).map((by) => ({ entry, by })));

describe('every Dubai Building Code citation in the engine is in the register', () => {
  it('finds the engine’s citations at all — the scan cannot pass empty', () => {
    expect(engineCitations.size).toBeGreaterThanOrEqual(9);
  });

  it('names each engine citation in an APPLIED entry on the citation’s own page', () => {
    /*
      One constant is exported under several paths — its module and `index.ts`
      re-exporting it — so a constant is registered when ANY path it is
      exported under is named. Grouped by identity, not by name.
    */
    const pathsOf = new Map<Citation, string[]>();
    for (const [key, c] of engineCitations) pathsOf.set(c, [...(pathsOf.get(c) ?? []), key]);
    const unregistered: string[] = [];
    for (const [c, keys] of pathsOf) {
      const named = applications('CITATION').some(
        ({ entry, by }) =>
          by.kind === 'CITATION' && keys.includes(`${by.module}#${by.name}`) && entry.page === c.sourcePage,
      );
      if (!named) unregistered.push(`${keys.join(' = ')} (p${c.sourcePage})`);
    }
    expect(pathsOf.size).toBeGreaterThanOrEqual(9);
    expect(unregistered).toEqual([]);
  });

  it('names each DBC seed rule in an APPLIED entry on the rule’s own page', () => {
    const dbcRules = SEED_RULES.filter((r) => r.citation.instrumentId === 'DUBAI_BUILDING_CODE');
    expect(dbcRules.length).toBeGreaterThan(0);
    const unregistered = dbcRules
      .filter(
        (r) =>
          !applications('RULE').some(
            ({ entry, by }) => by.kind === 'RULE' && by.ruleId === r.ruleId && entry.page === r.citation.sourcePage,
          ),
      )
      .map((r) => `${r.ruleId} (p${r.citation.sourcePage})`);
    expect(unregistered).toEqual([]);
  });
});

describe('everything an APPLIED entry names exists', () => {
  it('each cited constant is an exported DBC citation of the module named, on the entry’s page', () => {
    const missing = applications('CITATION')
      .filter(({ entry, by }) => {
        if (by.kind !== 'CITATION') return false;
        const c = engineCitations.get(`${by.module}#${by.name}`);
        return c === undefined || c.sourcePage !== entry.page;
      })
      .map(({ entry, by }) => `${entry.clause}: ${by.kind === 'CITATION' ? `${by.module}#${by.name}` : ''}`);
    expect(missing).toEqual([]);
  });

  it('each rule id is a seed rule that cites the code', () => {
    const ids = new Set(SEED_RULES.filter((r) => r.citation.instrumentId === 'DUBAI_BUILDING_CODE').map((r) => r.ruleId));
    const missing = applications('RULE')
      .filter(({ by }) => by.kind === 'RULE' && !ids.has(by.ruleId))
      .map(({ entry, by }) => `${entry.clause}: ${by.kind === 'RULE' ? by.ruleId : ''}`);
    expect(missing).toEqual([]);
  });

  it('each module named is a file in the repository', () => {
    const missing = applications('MODULE')
      .filter(({ by }) => by.kind === 'MODULE' && !existsSync(join(ROOT, by.module)))
      .map(({ entry, by }) => `${entry.clause}: ${by.kind === 'MODULE' ? by.module : ''}`);
    expect(missing).toEqual([]);
  });

  it('a doctored entry is caught — the check can fail', () => {
    const doctored = { kind: 'CITATION', name: 'TABLE_B12', module: 'packages/capacity/src/layout.ts' } as const;
    expect(engineCitations.has(`${doctored.module}#${doctored.name}`)).toBe(false);
  });
});

describe('every register sentence has its Arabic', () => {
  const ARABIC = /[؀-ۿ]/;
  const sentences = [
    ...Object.values(APPLIED_IN_WORDS),
    ...Object.values(NOT_ASSESSED_REASON),
    ...Object.values(NOT_APPLICABLE_REASON),
    ...Object.values(CLAUSE_DETAIL),
    DBC_REGISTER.scope,
    ...WRITTEN_PROMISES.map((p) => p.exists),
  ];

  for (const text of sentences) {
    it(text.slice(0, 70), () => {
      const ar = engineNote(text, 'ar');
      expect(ar, text).not.toBeNull();
      expect(ar!).toMatch(ARABIC);
      expect(ar).not.toBe(text);
      expect(engineNote(text, 'en')).toBe(text);
    });
  }

  it('says the counts sentence the claim line appends in Arabic, and the empty-register one', () => {
    const counts = clauseRegisterCounts(DBC_REGISTER.entries);
    // The head of the claim line exactly as `ruleCoverageClaim` writes it.
    const head =
      'PARTIAL. We encoded 9 of 12 requirements identified as applicable (coverage 75.0%). 3 are deferred and listed: A, B, C. ';
    const full = engineNote(`${head}${clauseCoverageSentence({ version: DBC_REGISTER.version, counts })}`, 'ar');
    expect(full).toContain(`يذكر سجل بنود الكود (${DBC_REGISTER.version}) ${counts.total} بندا`);
    expect(full).toContain(`${counts.notAssessedMandatory} منها إلزامية`);
    const none = engineNote(
      `${head}${clauseCoverageSentence({
        version: DBC_REGISTER.version,
        counts: { total: 0, applied: 0, notAssessed: 0, notAssessedMandatory: 0, notApplicable: 0 },
      })}`,
      'ar',
    );
    expect(none).toContain('لم يقدم سجل لبنود الكود');
  });
});
