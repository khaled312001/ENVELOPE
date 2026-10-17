/**
 * The DBC clause register, held to the reference it lists — both ways.
 *
 * The rule-coverage line once read 77.8% over nine seed records while every clause
 * nobody encoded was simply absent. The register ends that by listing every clause
 * of B.4, B.5, B.7 and C.6.4, and these tests are what make "every" true: a clause
 * transcribed into `docs/02-reference/dbc` and not listed here fails the build.
 */

import { describe, expect, it } from 'vitest';

import { referenceClauses, registerProblems } from '../../../test-support/dbc-register.js';
import {
  CLAUSE_DETAIL,
  ClauseObligation,
  ClauseStatus,
  DBC_CLAUSE_REGISTER,
  NotAssessedReason,
  PromiseStatus,
  WRITTEN_PROMISES,
  clauseRegisterCounts,
  type ClauseRegisterEntry,
} from '../src/register/index.js';

const entry = (clause: string): ClauseRegisterEntry => {
  const e = DBC_CLAUSE_REGISTER.find((x) => x.clause === clause);
  if (e === undefined) throw new Error(`${clause} is not in the register`);
  return e;
};

describe('the DBC clause register against docs/02-reference/dbc', () => {
  it('reads the reference: every in-scope clause, figures left out', () => {
    const ref = referenceClauses();
    // B.4 112, B.5 14, B.7 169 and C.6.4 headings, less figures and sub-headings.
    expect(ref.length).toBeGreaterThan(240);
    expect(ref.some((r) => r.clause.startsWith('Figure'))).toBe(false);
    expect(ref.find((r) => r.clause === 'B.7.2.7 ¶4')).toMatchObject({ page: 91, obligation: 'SHALL' });
    expect(ref.find((r) => r.clause === 'Table B.1 Setback calculation table')).toMatchObject({
      page: 41,
      obligation: 'SHALL',
    });
  });

  it('lists every clause the reference prints, on its page, in its verbal form, once', () => {
    expect(registerProblems(DBC_CLAUSE_REGISTER)).toEqual([]);
  });

  it('can fail: a wrong page, a dropped clause, an invented clause and a softened "shall" are each caught', () => {
    const doctored = DBC_CLAUSE_REGISTER.map((e) =>
      e.clause === 'B.7.2.4 ¶1' ? { ...e, page: 87 } : e.clause === 'B.5.3 ¶1' ? { ...e, obligation: ClauseObligation.SHOULD } : e,
    )
      .filter((e) => e.clause !== 'B.7.2.7 ¶4')
      .concat([{ ...entry('B.7.2.7 ¶5'), clause: 'B.7.2.7 ¶9' }]);
    const problems = registerProblems(doctored);
    expect(problems).toHaveLength(4);
    expect(problems.join('\n')).toMatch(/B\.7\.2\.4 ¶1: register says p87, the reference prints it on p86/);
    expect(problems.join('\n')).toMatch(/B\.5\.3 ¶1: register says SHOULD/);
    expect(problems.join('\n')).toMatch(/B\.7\.2\.7 ¶9: no such clause/);
    expect(problems.join('\n')).toMatch(/B\.7\.2\.7 ¶4 \(p91\): printed in the reference and missing from the register/);
  });

  it('never calls a mechanisable "shall" a detail, a judgement or another instrument’s business', () => {
    // The reference says, per clause, whether it can be worked out from plot geometry
    // and the study's inputs. A clause it answers "yes" for may be applied, not
    // applicable, or not assessed for a reason that admits it could be — never
    // waved off as a finish detail, a matter of taste or somebody else's code.
    const ref = new Map(referenceClauses().map((r) => [r.clause, r]));
    const waved = DBC_CLAUSE_REGISTER.filter(
      (e) =>
        e.status === ClauseStatus.NOT_ASSESSED &&
        e.obligation === ClauseObligation.SHALL &&
        /^yes\b/.test(ref.get(e.clause)?.mechanisable ?? '') &&
        (e.reason === NotAssessedReason.DETAIL ||
          e.reason === NotAssessedReason.JUDGEMENT ||
          e.reason === NotAssessedReason.EXTERNAL),
    ).map((e) => e.clause);
    expect(waved).toEqual([]);
  });

  it('applies a clause only through something a test can find', () => {
    for (const e of DBC_CLAUSE_REGISTER) {
      if (e.status === ClauseStatus.APPLIED) expect(e.by.length, e.clause).toBeGreaterThan(0);
    }
  });
});

describe('what the register says about bicycles and loading (B.7.2.7, B.7.3.1)', () => {
  it('lists bicycle parking as mandatory and not assessed, with the ratio the code states', () => {
    const e = entry('B.7.2.7 ¶4');
    expect(e).toMatchObject({ status: ClauseStatus.NOT_ASSESSED, obligation: ClauseObligation.SHALL, page: 91 });
    expect(e.status === ClauseStatus.NOT_ASSESSED && e.reason).toBe(NotAssessedReason.NOT_ENCODED);
    expect(e.detail && CLAUSE_DETAIL[e.detail]).toMatch(/5% of the building’s required car bays/);
    expect(entry('Table B.14 Bicycle stand minimum dimensions').status).toBe(ClauseStatus.NOT_ASSESSED);
    // Student and labour accommodation is a different use; the 10% of occupants does not bear on a tower.
    expect(entry('B.7.2.7 ¶3').status).toBe(ClauseStatus.NOT_APPLICABLE);
  });

  it('lists the loading area as an open question, never as not applicable and never as assumed', () => {
    for (const c of ['B.7.3.1.1 ¶2', 'B.7.3.1.3 ¶2', 'Table B.16 Loading truck size requirement based on use']) {
      const e = entry(c);
      expect(e.status, c).toBe(ClauseStatus.NOT_ASSESSED);
      expect(e.status === ClauseStatus.NOT_ASSESSED && e.reason, c).toBe(NotAssessedReason.OPEN_QUESTION);
    }
    expect(CLAUSE_DETAIL.LOADING).toMatch(/9 m truck/);
  });

  it('names the clauses the audit found absent: clear heights, the 6 m entry, wheel stoppers, gate level, the basement soffit', () => {
    for (const c of ['B.5.3 ¶1', 'B.7.2.3.3 ¶4 — sentence 1', 'B.7.2.3.3 ¶3 — sentence 1', 'B.4.2.1 ¶2', 'B.4.3.2 ¶4']) {
      expect(entry(c).status, c).toBe(ClauseStatus.NOT_ASSESSED);
      expect(entry(c).detail, c).not.toBeNull();
    }
  });
});

describe('the counts', () => {
  it('add up, and count mandatory clauses nothing checks', () => {
    const c = clauseRegisterCounts(DBC_CLAUSE_REGISTER);
    expect(c.total).toBe(DBC_CLAUSE_REGISTER.length);
    expect(c.applied + c.notAssessed + c.notApplicable).toBe(c.total);
    expect(c.notAssessedMandatory).toBeGreaterThan(50);
    expect(c.notAssessedMandatory).toBeLessThan(c.notAssessed);
  });
});

describe('the written promises of 31 Aug 2026', () => {
  it('records IFC as not built, and the coded clauses and the ramp check as only partly built', () => {
    const by = new Map(WRITTEN_PROMISES.map((p) => [p.id, p]));
    expect(by.get('IFC_EXPORT')?.status).toBe(PromiseStatus.NOT_BUILT);
    expect(by.get('IFC_EXPORT')?.exists).toMatch(/No IFC file is written/);
    expect(by.get('CODED_CLAUSES')?.status).toBe(PromiseStatus.PARTLY_BUILT);
    expect(by.get('CODED_CLAUSES')?.exists).toMatch(/Table B\.1, p41/);
    expect(by.get('CODED_CLAUSES')?.exists).toMatch(/placeholders that cite no instrument/);
    expect(by.get('RAMP_CHECK')?.status).toBe(PromiseStatus.PARTLY_BUILT);
  });

  it('says every ramp requirement the register leaves unassessed, not only the finish and the drainage', () => {
    // A written disclosure that names three of six unassessed requirements reads as
    // "the other three are checked". The register is the list; the promise must cover it.
    const numbered = DBC_CLAUSE_REGISTER.filter((e) => /^B\.7\.2\.2 [1-6]\)$/.test(e.clause));
    expect(numbered).toHaveLength(6);
    for (const e of numbered) expect(e.status, e.clause).toBe(ClauseStatus.NOT_ASSESSED);
    const ramp = WRITTEN_PROMISES.find((p) => p.id === 'RAMP_CHECK')?.exists ?? '';
    expect(ramp).toMatch(/B\.7\.2\.2 numbers 1\) to 6\) is assessed/);
  });
});

describe('the 300 mm beside a wall, a column or the core (B.7.2.4 ¶2)', () => {
  it('is not encoded, not an open question: only the column half waits on the client', () => {
    // The clause plainly applies; OPEN_QUESTION's sentence says "whether it applies
    // to this building is an open question", which is false of a bay against a wall.
    const e = entry('B.7.2.4 ¶2');
    expect(e).toMatchObject({ status: ClauseStatus.NOT_ASSESSED, obligation: ClauseObligation.SHALL });
    expect(e.status === ClauseStatus.NOT_ASSESSED && e.reason).toBe(NotAssessedReason.NOT_ENCODED);
    expect(e.detail && CLAUSE_DETAIL[e.detail]).toMatch(/beside a wall or the core it is simply not encoded/);
  });
});
