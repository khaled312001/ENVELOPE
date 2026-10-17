/**
 * The Dubai Building Code clause register, as the validation report states it.
 *
 * The deferred list (`categories.ts`) is built from rule records: what the
 * constraint set carried and did not check. A clause nobody encoded never reaches
 * a constraint set, so it could never reach that list either, and its absence read
 * as "nothing deferred here". The register is the other half: every clause of the
 * code sections a plot study touches, each APPLIED, NOT ASSESSED or NOT
 * APPLICABLE, with the reason in words.
 *
 * It is kept beside the deferred list rather than poured into it. The deferred
 * list is counted in the rule-coverage ratio, whose unit is a rule record; adding
 * clauses to it would put two units in one ratio. The claim line states both
 * counts separately (`clauseCoverageSentence`), and the report prints the whole
 * register in its annex and the mandatory not-assessed clauses beside the deferred
 * checks.
 *
 * This module checks nothing against the register — there is nothing to check a
 * NOT ASSESSED clause against. It states it, so that what was not checked is a
 * published fact rather than an absence.
 */

import {
  clauseApplicationLabel,
  clauseReasonSentence,
  clauseRegisterCounts,
  CLAUSE_DETAIL,
  ClauseStatus,
  NOT_ASSESSED_REASON,
  type ClauseObligation,
  type ClauseRegister,
  type ClauseRegisterCounts,
} from '@envelope/rules';

/** One clause, as a report prints it: every field a sentence or a label, nothing to look up. */
export interface ClauseOutcome {
  readonly clause: string;
  readonly page: number;
  readonly obligation: ClauseObligation;
  readonly status: ClauseStatus;
  /** Where it acts (APPLIED), why nothing checks it (NOT ASSESSED), or why it cannot bear (N/A). */
  readonly reason: string;
  /** What applies it, by name: a cited constant and its module, a rule id, or a module. */
  readonly appliedBy: readonly string[];
  /** For a clause applied in part: why the rest is not assessed. */
  readonly rest: string | null;
  /** The sentence a reader of a parking study needs about this clause in particular. */
  readonly detail: string | null;
  readonly lifeSafety: boolean;
}

export interface ClauseRegisterReport {
  readonly version: string;
  readonly scope: string;
  readonly counts: ClauseRegisterCounts;
  readonly entries: readonly ClauseOutcome[];
}

/** The register stated: one outcome per clause, in the register's order. */
export function clauseRegisterReport(register: ClauseRegister): ClauseRegisterReport {
  return {
    version: register.version,
    scope: register.scope,
    counts: clauseRegisterCounts(register.entries),
    entries: register.entries.map((e) => ({
      clause: e.clause,
      page: e.page,
      obligation: e.obligation,
      status: e.status,
      reason: clauseReasonSentence(e),
      appliedBy: e.status === ClauseStatus.APPLIED ? e.by.map(clauseApplicationLabel) : [],
      rest: e.status === ClauseStatus.APPLIED && e.rest !== null ? NOT_ASSESSED_REASON[e.rest] : null,
      detail: e.detail === null ? null : CLAUSE_DETAIL[e.detail],
      lifeSafety: e.lifeSafety,
    })),
  };
}
