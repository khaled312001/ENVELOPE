/**
 * The practice statements on file. One, at the time of writing.
 *
 * Adding a second is adding a record here, not adding a mechanism. If this file
 * ever holds a statement whose `limits` field is vague, that statement is not
 * ready: the limit is the part a reader needs and the part a practitioner
 * volunteers last.
 */

import { StatementSubject, type PracticeStatement } from './types.js';

/**
 * `FR-DEF-002`, answered by the client on 2026-09-28.
 *
 * This is the single most consequential input in the product — 15–35% of
 * capacity turns on it — and it has blocked every run since the first analysis.
 * It is answered here, by a named person, in his own words, with the edge of
 * the claim written down beside it.
 *
 * The `limits` text is not hedging. Parking-in-FAR genuinely varies by community
 * and by land-use slice in Dubai, and the failure mode is silent: a run that
 * quietly excludes parking on the one plot where it counts reports a building
 * 15–35% larger than the plot allows, and a regulator finds it rather than we do.
 */
export const PARKING_IN_FAR_STATEMENT: PracticeStatement = {
  statementId: 'STMT-PARKING-IN-FAR-2026-09-28',
  subject: StatementSubject.PARKING_IN_FAR,
  value: 'EXCLUDED_FROM_FAR',
  statedBy: {
    name: 'Eng. Mohamed',
    role: 'the architect this engine is being built for, in Dubai practice',
  },
  statedOn: '2026-09-28',
  source: 'written reply to the Phase 0 walkthrough, 28 September 2026',
  verbatim: 'الباركنج مش بيتحسب في ال FAR دا منفصل',
  translation: 'Parking is not counted in the FAR — it is separate.',
  limits:
    'A practitioner’s statement of how this is treated in the work he has done. It is not a ' +
    'clause of the Dubai Building Code and it has not been checked against one. Parking-in-FAR ' +
    'varies by community and by land-use slice, so on a plot where it does count, accepting ' +
    'this produces a building 15–35% larger than the plot allows. Change it where the plot’s ' +
    'own affection plan or its community says otherwise.',
};

export const PRACTICE_STATEMENTS: readonly PracticeStatement[] = [PARKING_IN_FAR_STATEMENT];

/**
 * The statement for a subject, or `undefined`.
 *
 * Deliberately not called `resolve`. `resolveParameter` picks the most
 * restrictive of several applicable rules by a documented precedence; this looks
 * one thing up in a list of one. Naming them alike would invite somebody to
 * reach for the wrong one.
 */
export function statementFor(subject: StatementSubject): PracticeStatement | undefined {
  return PRACTICE_STATEMENTS.find((s) => s.subject === subject);
}

/** By id, for a run that recorded which statement it was answered with. */
export function statementById(statementId: string): PracticeStatement | undefined {
  return PRACTICE_STATEMENTS.find((s) => s.statementId === statementId);
}
