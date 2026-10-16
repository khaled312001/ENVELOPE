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

/**
 * The core's share of the plate, stated in the call of 2026-10-04 at 32:58–33:42.
 *
 * ---------------------------------------------------------------------------
 * THIS ONE CORROBORATES AN ASSUMPTION RATHER THAN ANSWERING A BLOCKED QUESTION,
 * AND THAT MAKES IT EASIER TO GET WRONG, NOT HARDER.
 *
 * `core.ts` already assumes 18% of the tower plate, with a basis saying that no
 * clause of the Dubai Building Code states a core area and no developer standard
 * on file gives one. He then said 18–20% unprompted. The two agree.
 *
 * The temptation is to promote the figure to `DERIVED` now that somebody who knows
 * has confirmed it. That is exactly the laundering `CLAUDE.md` names as the most
 * consequential available in this codebase: `DERIVED` means the value reached a
 * cited regulatory instrument, and a practitioner agreeing with an assumption
 * produces agreement, not a citation. What changes is the CLASS — `ASSUMED` with
 * nobody's name on it becomes `USER_SET` by a named person — and nothing else.
 *
 * ---------------------------------------------------------------------------
 * WHY 18% OF THE PLATE AND 18% OF GFA ARE THE SAME NUMBER.
 *
 * He said "18 to 20% of the GFA"; the engine sizes the core as a fraction of the
 * TOWER PLATE. A constant fraction of every plate is that same fraction of their
 * sum, and GFA is their sum, so the two statements coincide — but only while the
 * fraction is constant across levels. A scheme whose core changes size up the
 * building breaks the identity, and this statement would then be being applied to
 * a case he did not describe. That is in `limits`, because it is the kind of
 * condition that is obvious the day it is written and invisible a year later.
 */
export const CORE_PLATE_FRACTION_STATEMENT: PracticeStatement = {
  statementId: 'STMT-CORE-PLATE-FRACTION-2026-10-04',
  subject: StatementSubject.CORE_PLATE_FRACTION,
  /* The end he named first. The other end is a sensitivity, not a second value —
     see the note on the subject in `types.ts`. */
  value: '0.18',
  statedBy: {
    name: 'Eng. Mohamed',
    role: 'the architect this engine is being built for, in Dubai practice',
  },
  statedOn: '2026-10-04',
  source: 'recorded call, 4 October 2026, 32:58–33:42',
  verbatim:
    'الكور ده مهم جداً … لازم يبقى في النص غالباً … جوّاه السلالم والمصاعد وكده … بيبقى في ' +
    'السنتر، بس في المدخل لازم يبقى فيه مدخل لجوّه الكور … الكور في الغالب من 18 إلى 20% من الـ GFA',
  translation:
    'The core matters a great deal. It usually has to be in the middle, with the stairs and ' +
    'the lifts inside it. It sits at the centre, but at the ground floor there has to be an ' +
    'entrance into the core. The core is usually 18 to 20% of the GFA.',
  limits:
    'A practitioner’s figure for the residential towers he has worked on, and the range he ' +
    'gave is 18–20%: the stated value is the lower end, so a core sized from it is the SMALL ' +
    'end of his own range and the reconciliations under the drawing are correspondingly ' +
    'generous. It is not a clause of the Dubai Building Code, which states no core area, and ' +
    'it has not been checked against one. It is a fraction of the tower plate, which equals ' +
    'the same fraction of GFA only while the core is the same size on every level — a scheme ' +
    'whose core steps or stops partway up is not a case this statement describes. It sizes ' +
    'nothing for egress: no stair is counted for occupancy, no lift for traffic, and no ' +
    'fire-fighting shaft is placed.',
};

/**
 * The podium is built to the boundary; setbacks are the tower's. 16 Oct 2026.
 *
 * Written beside a screenshot of a car park packed inside the setback line, with
 * a strip of usable plot round it that nothing occupied. The engine had one
 * setback line and held every level to it, so the levels where parking lives —
 * basements, ground, podium — lost a margin of bays on every edge.
 *
 * USER_SET by him, for the same reason the other two are: no clause of the Dubai
 * Building Code in the engine says a podium may stand on the boundary, and a
 * practitioner saying so is not a citation. The sheet still governs wherever it
 * states a setback: an affection plan that sets the building back 3 m sets the
 * podium back 3 m too.
 */
export const PODIUM_SETBACK_STATEMENT: PracticeStatement = {
  statementId: 'STMT-PODIUM-SETBACK-2026-10-16',
  subject: StatementSubject.PODIUM_SETBACK,
  value: '0',
  statedBy: {
    name: 'Eng. Mohamed',
    role: 'the architect this engine is being built for, in Dubai practice',
  },
  statedOn: '2026-10-16',
  source: 'written note on the studio’s results, 16 October 2026',
  verbatim:
    'ال دور ال ارضي و البوديوم و البدروم بياخدو مساحه الارض كلها مفيش setbacks … ' +
    'الكلام دا علي الادوار الي بعد البوديوم الي هيبقي فيها وحدات',
  translation:
    'The ground floor, the podium and the basement take the whole plot — no setbacks. ' +
    'The setbacks are for the levels above the podium, the ones that hold units.',
  limits:
    'A practitioner’s statement of how he lays out the podium in his own work. It is not a ' +
    'clause of the Dubai Building Code and has not been checked against one, or against the ' +
    'community’s development control regulations, which can set a podium back. Where the ' +
    'plot’s own affection plan states a setback for an edge, the sheet governs that edge for ' +
    'the podium as well. A podium on a boundary also raises fire separation and openings ' +
    'toward the neighbour; none of that is assessed.',
};

export const PRACTICE_STATEMENTS: readonly PracticeStatement[] = [
  PARKING_IN_FAR_STATEMENT,
  CORE_PLATE_FRACTION_STATEMENT,
  PODIUM_SETBACK_STATEMENT,
];

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
