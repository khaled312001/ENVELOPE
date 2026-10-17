/**
 * Every clause of DBC 2021 B.4, B.5, B.7 and C.6.4, with what the engine does with
 * it. See `types.ts` for why this exists and what each status may mean.
 *
 * One line per clause, in the order `docs/02-reference/dbc` prints them, so the
 * register reads against the reference side by side. Figures are left out: a
 * figure illustrates the clause that cites it and carries no obligation of its
 * own. Tables are in, because Table B.1, B.9, B.11 and B.13 *are* the numbers.
 *
 * Changing a status is a decision, not an edit. APPLIED needs the code to exist
 * (the citations test finds it); NOT_APPLICABLE needs a predicate that is true of
 * every plot this study can model, which is why so few clauses carry it.
 */

import {
  AppliedIn,
  ClauseDetail,
  ClauseObligation,
  ClauseStatus,
  NotApplicableReason,
  NotAssessedReason,
  type ClauseApplication,
  type ClauseRegister,
  type ClauseRegisterEntry,
} from './types.js';

/**
 * Bump when a status changes, so a stored run says which register it was read
 * against. The date is the day the register was last re-read against the code.
 */
export const CLAUSE_REGISTER_VERSION = '2026-10-17';

/** What every status in the register is relative to. Printed above it. */
export const CLAUSE_REGISTER_SCOPE =
  'Every clause of Dubai Building Code 2021 sections B.4, B.5, B.7 and C.6.4, transcribed with its page, for the building this study models: a residential tower on one plot, with its parking. Applied means a cited rule or constant in the engine uses the clause; not assessed means nothing checks it, and says why; not applicable says why it cannot bear on that building.';

// --- What applies a clause -------------------------------------------------

const SHEET = 'packages/rules/src/instruments/sheet.ts';
const ENVELOPE = 'packages/capacity/src/envelope.ts';
const ACCESS = 'packages/capacity/src/access.ts';
const ACCESSIBLE = 'packages/capacity/src/accessible.ts';
const LAYOUT = 'packages/capacity/src/layout.ts';
const RAMPS = 'packages/capacity/src/ramp-rules.ts';
const DEAD_ENDS = 'packages/capacity/src/dead-ends.ts';
const GROUND = 'packages/capacity/src/ground-program.ts';

const cite = (name: string, module: string): ClauseApplication => ({ kind: 'CITATION', name, module });
const rule = (ruleId: string): ClauseApplication => ({ kind: 'RULE', ruleId });
const mod = (module: string): ClauseApplication => ({ kind: 'MODULE', module });

const B1_RULES = [rule('R-DBC-B1-ROAD'), rule('R-DBC-B1-NEIGHBOUR')];
const HEIGHT_RULE = rule('R-DBC-B422-HEIGHT');
const B13_RULES = [rule('R-PARKING-RATIO-RES'), rule('R-PARKING-VISITOR-RES')];

// --- Entry builders --------------------------------------------------------

const { SHALL, SHOULD, MAY, DEFINITION, INFORMATIVE } = ClauseObligation;
const R = NotAssessedReason;
const P = NotApplicableReason;
const D = ClauseDetail;

interface Extra {
  readonly lifeSafety?: boolean;
  readonly detail?: ClauseDetail;
  readonly rest?: NotAssessedReason;
}

function applied(
  clause: string,
  page: number,
  obligation: ClauseObligation,
  appliedIn: AppliedIn,
  by: readonly ClauseApplication[],
  extra: Extra = {},
): ClauseRegisterEntry {
  return {
    status: ClauseStatus.APPLIED,
    clause,
    page,
    obligation,
    appliedIn,
    by,
    rest: extra.rest ?? null,
    lifeSafety: extra.lifeSafety ?? false,
    detail: extra.detail ?? null,
  };
}

function notAssessed(
  clause: string,
  page: number,
  obligation: ClauseObligation,
  reason: NotAssessedReason,
  extra: Extra = {},
): ClauseRegisterEntry {
  return {
    status: ClauseStatus.NOT_ASSESSED,
    clause,
    page,
    obligation,
    reason,
    lifeSafety: extra.lifeSafety ?? false,
    detail: extra.detail ?? null,
  };
}

function notApplicable(
  clause: string,
  page: number,
  obligation: ClauseObligation,
  predicate: NotApplicableReason,
  extra: Extra = {},
): ClauseRegisterEntry {
  return {
    status: ClauseStatus.NOT_APPLICABLE,
    clause,
    page,
    obligation,
    predicate,
    lifeSafety: extra.lifeSafety ?? false,
    detail: extra.detail ?? null,
  };
}

const LIFE = { lifeSafety: true } as const;

// --- The register ----------------------------------------------------------

export const DBC_CLAUSE_REGISTER: readonly ClauseRegisterEntry[] = Object.freeze([
  // B.4.1 General requirements
  applied('B.4.1 ¶1 a)–f)', 38, SHALL, AppliedIn.AFFECTION_PLAN, [mod(SHEET)], { rest: R.EXTERNAL }),
  notAssessed('B.4.1 ¶2', 38, SHALL, R.EXTERNAL),
  notAssessed('B.4.1 ¶3 1)–4)', 38, SHOULD, R.JUDGEMENT),
  notAssessed('B.4.1 ¶4', 38, SHOULD, R.JUDGEMENT),

  // B.4.2.1 Gate level
  notApplicable('B.4.2.1 ¶1', 38, DEFINITION, P.NO_REQUIREMENT),
  notAssessed('B.4.2.1 ¶2', 38, SHALL, R.NEEDS_LEVELS, { detail: D.GATE_LEVEL }),
  notApplicable('B.4.2.1 ¶3', 38, INFORMATIVE, P.NO_REQUIREMENT),

  // B.4.2.2 Building height
  applied('B.4.2.2 ¶1', 39, SHALL, AppliedIn.HEIGHT, [HEIGHT_RULE, mod(ENVELOPE), mod(SHEET)]),
  notAssessed('B.4.2.2 ¶2', 39, SHALL, R.EXTERNAL),
  notAssessed('B.4.2.2 ¶3', 39, SHALL, R.NEEDS_LEVELS),
  notApplicable('B.4.2.2 ¶4', 39, DEFINITION, P.NO_REQUIREMENT),
  notAssessed('B.4.2.2 ¶5 (sentence 1)', 39, SHOULD, R.NEEDS_LEVELS),
  notAssessed('B.4.2.2 ¶5 (sentence 2)', 39, SHALL, R.EXTERNAL),
  applied('B.4.2.2 ¶6', 40, SHALL, AppliedIn.HEIGHT, [HEIGHT_RULE]),
  applied('B.4.2.2 ¶7', 40, INFORMATIVE, AppliedIn.HEIGHT, [HEIGHT_RULE]),
  notApplicable('B.4.2.2 ¶8 a)', 40, MAY, P.PERMISSION_NOT_TAKEN),
  notApplicable('B.4.2.2 ¶8 b)', 40, MAY, P.PERMISSION_NOT_TAKEN),
  notApplicable('B.4.2.2 ¶8 c)', 40, MAY, P.PERMISSION_NOT_TAKEN),
  notApplicable('B.4.2.2 ¶9', 40, SHALL, P.ELEMENT_NOT_PROPOSED),

  // B.4.2.3 Building setbacks
  applied('B.4.2.3 ¶1', 41, SHALL, AppliedIn.SETBACKS, [...B1_RULES, mod(SHEET)]),
  applied('B.4.2.3 ¶2', 41, SHALL, AppliedIn.SETBACKS, B1_RULES),
  applied('Table B.1 Setback calculation table', 41, SHALL, AppliedIn.SETBACKS, B1_RULES),
  applied('B.4.2.3 ¶3', 41, SHALL, AppliedIn.SETBACKS, B1_RULES, { detail: D.SETBACK_PODIUM }),
  applied('B.4.2.3 ¶4 (sentence 1)', 41, SHALL, AppliedIn.AFFECTION_PLAN, [mod(SHEET)]),
  notApplicable('B.4.2.3 ¶4 (sentences 2–3)', 41, MAY, P.PERMISSION_NOT_TAKEN),
  notAssessed('B.4.2.3 ¶5', 42, SHALL, R.EXTERNAL, LIFE),
  notAssessed('B.4.2.3 ¶6', 42, SHALL, R.EXTERNAL, LIFE),
  notAssessed('B.4.2.3 ¶7', 42, SHALL, R.EXTERNAL, LIFE),
  notAssessed('B.4.2.3 ¶8', 42, SHALL, R.NEEDS_ROAD_DATA),
  notAssessed('B.4.2.3 ¶9', 42, SHALL, R.NEEDS_USE_DATA),
  notAssessed('B.4.2.3 ¶10', 42, SHALL, R.EXTERNAL),
  notApplicable('B.4.2.3 ¶11', 43, SHALL, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.4.2.3 ¶12 a)', 44, MAY, P.PERMISSION_NOT_TAKEN),
  notApplicable('B.4.2.3 ¶12 b)', 44, MAY, P.PERMISSION_NOT_TAKEN),
  applied('B.4.2.3 ¶12 c)', 44, MAY, AppliedIn.GROUND_FLOOR, [mod(GROUND)]),
  notAssessed('B.4.2.3 ¶12 d)', 44, MAY, R.BY_CONSTRUCTION),
  notApplicable('B.4.2.3 ¶12 e)', 44, MAY, P.PERMISSION_NOT_TAKEN),
  notAssessed('B.4.2.3 ¶12 f)', 44, MAY, R.BY_CONSTRUCTION),
  notApplicable('B.4.2.3 ¶12 g)', 44, MAY, P.PERMISSION_NOT_TAKEN),
  notApplicable('B.4.2.3 ¶12 h)', 44, MAY, P.PERMISSION_NOT_TAKEN),
  notAssessed('B.4.2.3 ¶13', 44, SHALL, R.NOT_LAID_OUT, LIFE),

  // B.4.2.4 Building areas
  notApplicable('B.4.2.4.1 ¶1', 45, DEFINITION, P.NO_REQUIREMENT),
  notApplicable('B.4.2.4.1 ¶2', 45, INFORMATIVE, P.NO_REQUIREMENT),
  notApplicable('B.4.2.4.1 ¶3', 45, INFORMATIVE, P.NO_REQUIREMENT),
  notApplicable('B.4.2.4.2 ¶1', 46, DEFINITION, P.NO_REQUIREMENT),
  notApplicable('B.4.2.4.2 ¶2', 46, INFORMATIVE, P.NO_REQUIREMENT),
  notApplicable('B.4.2.4.2 ¶3', 46, INFORMATIVE, P.NO_REQUIREMENT),

  // B.4.2.5 Balconies, projections and terraces — the study draws none of them
  notAssessed('B.4.2.5.1 ¶1 (sentence 1)', 47, MAY, R.NOT_LAID_OUT),
  notAssessed('B.4.2.5.1 ¶1 (sentence 2)', 47, SHALL, R.NOT_LAID_OUT),
  notAssessed('B.4.2.5.1 a)', 47, SHALL, R.NOT_LAID_OUT),
  notAssessed('B.4.2.5.1 b)', 47, SHALL, R.NOT_LAID_OUT),
  notAssessed('B.4.2.5.1 c)', 47, SHALL, R.NOT_LAID_OUT),
  notAssessed('B.4.2.5.1 d)', 47, SHALL, R.NOT_LAID_OUT, LIFE),
  notApplicable('B.4.2.5.1 e)', 47, MAY, P.PERMISSION_NOT_TAKEN),
  notAssessed('B.4.2.5.1 f)', 47, SHALL, R.NOT_LAID_OUT),
  notAssessed('B.4.2.5.1 g)', 47, SHALL, R.NOT_LAID_OUT),
  notAssessed('B.4.2.5.1 ¶2', 47, SHALL, R.EXTERNAL),
  notAssessed('B.4.2.5.1 ¶3', 47, SHOULD, R.JUDGEMENT),
  notAssessed('B.4.2.5.1 ¶4', 47, SHALL, R.NOT_LAID_OUT),
  notAssessed('B.4.2.5.2 ¶1 a)–f)', 49, SHALL, R.NOT_LAID_OUT, LIFE),
  notAssessed('B.4.2.5.2 ¶2', 49, SHALL, R.DETAIL, LIFE),
  notAssessed('B.4.2.5.2 ¶3', 49, SHALL, R.DETAIL, LIFE),
  notAssessed('B.4.2.5.2 ¶4', 49, SHALL, R.DETAIL, LIFE),
  notAssessed('B.4.2.5.2 ¶5', 49, SHALL, R.DETAIL, LIFE),
  notAssessed('B.4.2.5.2 ¶6', 49, SHALL, R.DETAIL, LIFE),
  notAssessed('B.4.2.5.2 ¶7', 49, SHALL, R.DETAIL, LIFE),
  notAssessed('B.4.2.5.3 ¶1', 51, SHALL, R.DETAIL, LIFE),

  // B.4.2.6 Plot coverage
  notAssessed('B.4.2.6 ¶1', 51, SHALL, R.NOT_ENCODED, { detail: D.COVERAGE }),
  notAssessed('B.4.2.6 ¶2 a)', 51, SHALL, R.BY_CONSTRUCTION),
  notAssessed('B.4.2.6 ¶2 b)', 51, SHALL, R.BY_CONSTRUCTION),

  // B.4.3.1 Ground floor
  notAssessed('B.4.3.1 ¶1 (sentence 1)', 52, SHALL, R.NEEDS_USE_DATA),
  notApplicable('B.4.3.1 ¶1 (sentence 2)', 52, MAY, P.PERMISSION_NOT_TAKEN),
  notAssessed('B.4.3.1 ¶2 (sentence 1)', 52, SHALL, R.NOT_LAID_OUT),
  notAssessed('B.4.3.1 ¶2 (sentence 2)', 52, SHALL, R.EXTERNAL, LIFE),
  notAssessed('B.4.3.1 ¶2 (sentence 3)', 52, SHALL, R.NOT_LAID_OUT, LIFE),
  notAssessed('B.4.3.1 ¶3 (sentence 1)', 52, SHALL, R.NOT_LAID_OUT, LIFE),
  notApplicable('B.4.3.1 ¶3 (sentence 2)', 52, MAY, P.PERMISSION_NOT_TAKEN),
  notAssessed('B.4.3.1 ¶4', 52, SHALL, R.NOT_LAID_OUT, LIFE),

  // B.4.3.2 Basements
  notAssessed('B.4.3.2 ¶1', 53, SHALL, R.NEEDS_USE_DATA),
  notAssessed('B.4.3.2 ¶2', 53, SHALL, R.BY_CONSTRUCTION),
  notAssessed('B.4.3.2 ¶3', 53, SHALL, R.NOT_LAID_OUT),
  notAssessed('B.4.3.2 ¶4', 53, SHALL, R.NEEDS_LEVELS, { detail: D.BASEMENT_SOFFIT }),

  // B.4.3.3 Podium
  notAssessed('B.4.3.3 ¶1', 53, SHALL, R.EXTERNAL),
  notAssessed('B.4.3.3 ¶2', 53, SHALL, R.DETAIL),

  // B.4.3.4 Roof — the roof level is not modelled
  notAssessed('B.4.3.4 ¶1', 54, SHALL, R.NEEDS_USE_DATA),
  notAssessed('B.4.3.4 ¶2', 54, SHALL, R.NOT_LAID_OUT, LIFE),
  notAssessed('B.4.3.4 ¶3', 54, SHALL, R.DETAIL),
  notAssessed('B.4.3.4 ¶4', 54, SHALL, R.NOT_LAID_OUT),
  notAssessed('B.4.3.4 ¶5', 54, SHALL, R.NOT_LAID_OUT),
  notAssessed('B.4.3.4 ¶6', 54, SHALL, R.NOT_LAID_OUT),

  // B.5 Minimum space requirements
  notAssessed('B.5.1 ¶1', 55, SHALL, R.NEEDS_USE_DATA),
  notAssessed('Table B.2 Occupant load factor per person', 55, SHALL, R.NEEDS_USE_DATA),
  notAssessed('B.5.1 ¶2', 56, SHALL, R.EXTERNAL),
  notAssessed('B.5.1 ¶3', 56, SHALL, R.EXTERNAL),
  notAssessed('B.5.2 ¶1', 57, SHALL, R.NOT_LAID_OUT),
  notAssessed('Table B.3 Minimum room sizes', 57, SHALL, R.NOT_LAID_OUT),
  notAssessed('B.5.2 ¶2 (kitchen manoeuvring space)', 58, SHALL, R.NOT_LAID_OUT),
  notAssessed('B.5.3 ¶1', 58, SHALL, R.NEEDS_LEVELS, { detail: D.CLEAR_HEIGHT }),
  notAssessed('B.5.3 ¶2', 58, SHALL, R.NEEDS_LEVELS),
  notAssessed('Table B.4 Minimum clear heights', 58, SHALL, R.NEEDS_LEVELS, { detail: D.CLEAR_HEIGHT }),
  notAssessed('Table B.4, means of egress cell — protruding objects', 59, SHALL, R.DETAIL, LIFE),

  // B.7.1 Building access
  notApplicable('B.7.1 ¶1', 78, SHALL, P.NO_REQUIREMENT),
  notAssessed('B.7.1 a)', 78, SHALL, R.NOT_LAID_OUT),
  notAssessed('B.7.1 b)', 78, SHALL, R.NOT_LAID_OUT),
  notAssessed('B.7.1 c)', 78, SHALL, R.EXTERNAL),
  notApplicable('B.7.1 d)', 78, SHALL, P.ELEMENT_NOT_PROPOSED),
  notAssessed('B.7.1 e) — sentence 1', 78, SHALL, R.NOT_LAID_OUT),
  notAssessed('B.7.1 e) — sentence 2', 78, SHOULD, R.NOT_LAID_OUT),
  notAssessed('B.7.1 f)', 78, SHALL, R.EXTERNAL, LIFE),
  notAssessed('B.7.1 g)', 78, SHALL, R.EXTERNAL, LIFE),
  notAssessed('B.7.1 h)', 78, SHALL, R.NEEDS_ROAD_DATA),

  // B.7.2.1 Vehicle access, general
  notAssessed('B.7.2.1 ¶1', 78, SHALL, R.EXTERNAL),
  notAssessed('B.7.2.1 ¶2', 78, SHALL, R.EXTERNAL),
  notAssessed('B.7.2.1 ¶3', 78, SHALL, R.EXTERNAL),
  applied('B.7.2.1 ¶4', 78, SHALL, AppliedIn.VEHICLE_ACCESS, [cite('CLAUSE_B_7_2_1', ACCESS)]),
  applied('B.7.2.1 ¶5', 78, SHOULD, AppliedIn.VEHICLE_ACCESS, [cite('CLAUSE_B_7_2_1', ACCESS)]),
  notAssessed('B.7.2.1 ¶6', 78, SHALL, R.OPEN_QUESTION, { detail: D.LOADING }),
  notAssessed('B.7.2.1 ¶7', 78, SHALL, R.NEEDS_ROAD_DATA),
  applied('B.7.2.1 ¶8 a)', 80, SHALL, AppliedIn.VEHICLE_ACCESS, [mod(ACCESS)]),
  applied('B.7.2.1 ¶8 b)', 80, SHALL, AppliedIn.VEHICLE_ACCESS, [mod(ACCESS)]),
  notAssessed('B.7.2.1 ¶9', 80, SHALL, R.DETAIL),
  notAssessed('B.7.2.1 ¶10', 80, SHALL, R.DETAIL),
  notAssessed('B.7.2.1 ¶11', 80, SHALL, R.BY_CONSTRUCTION),

  // B.7.2.2 Vehicular ramps
  applied('B.7.2.2 ¶1', 80, SHALL, AppliedIn.RAMPS, [cite('TABLE_B9', RAMPS)]),
  applied('B.7.2.2 a)', 80, SHOULD, AppliedIn.RAMPS, [mod(LAYOUT)]),
  notAssessed('B.7.2.2 b)', 80, SHALL, R.NOT_ENCODED),
  applied('B.7.2.2 c)', 80, SHALL, AppliedIn.RAMPS, [cite('TABLE_B9', RAMPS)]),
  applied('B.7.2.2 d)', 80, SHALL, AppliedIn.RAMPS, [cite('TABLE_B9', RAMPS)]),
  applied('Table B.9 Ramp slope and width', 80, SHALL, AppliedIn.RAMPS, [cite('TABLE_B9', RAMPS)]),
  notApplicable('B.7.2.2 ¶2', 81, SHALL, P.NO_REQUIREMENT),
  notAssessed('B.7.2.2 1)', 81, SHALL, R.DETAIL),
  notAssessed('B.7.2.2 2)', 81, SHALL, R.BY_CONSTRUCTION),
  notAssessed('B.7.2.2 3)', 81, SHALL, R.DETAIL),
  notAssessed('B.7.2.2 4)', 81, SHALL, R.DETAIL),
  notAssessed('B.7.2.2 5)', 81, SHALL, R.DETAIL),
  notAssessed('B.7.2.2 6)', 81, SHALL, R.DETAIL, LIFE),
  notAssessed('B.7.2.2 ¶3 — sentence 1', 81, SHALL, R.NOT_LAID_OUT, LIFE),
  notApplicable('B.7.2.2 ¶3 — exception', 81, MAY, P.PERMISSION_NOT_TAKEN),
  applied('B.7.2.2 ¶4', 82, SHOULD, AppliedIn.RAMPS, [cite('TABLE_B10', RAMPS)]),
  applied('Table B.10 Transition and ramp slopes recommendations', 82, SHOULD, AppliedIn.RAMPS, [
    cite('TABLE_B10', RAMPS),
  ]),
  // Mechanical parking: the study proposes ramps, never a mechanical system.
  notApplicable('B.7.2.2 ¶5', 82, MAY, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.7.2.2 i)', 82, SHALL, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.7.2.2 ii)', 82, SHALL, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.7.2.2 iii)', 82, SHALL, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.7.2.2 iv)', 82, SHALL, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.7.2.2 v)', 82, SHALL, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.7.2.2 vi)', 82, SHALL, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.7.2.2 vii)', 82, SHALL, P.ELEMENT_NOT_PROPOSED),

  // B.7.2.3 Parking floors and structures
  notAssessed('B.7.2.3.1 ¶1', 83, SHALL, R.DETAIL, LIFE),
  notAssessed('B.7.2.3.1 ¶2', 83, SHALL, R.NEEDS_LEVELS, { detail: D.CLEAR_HEIGHT }),
  notAssessed('B.7.2.3.1 ¶3', 83, SHALL, R.DETAIL, LIFE),
  notAssessed('B.7.2.3.1 ¶4', 83, SHALL, R.DETAIL),
  applied('B.7.2.3.1 ¶5', 83, SHALL, AppliedIn.PARKING_LAYOUT, [
    cite('PARKED_SLOPE_B7231', RAMPS),
    cite('ACCESSIBLE_SLOPE_B7231', ACCESSIBLE),
  ]),
  notAssessed('B.7.2.3.1 ¶6', 83, SHALL, R.NOT_LAID_OUT, LIFE),
  notApplicable('B.7.2.3.2 ¶1 — sentence 1', 83, DEFINITION, P.NO_REQUIREMENT),
  notAssessed('B.7.2.3.2 ¶1 — sentences 2–5', 83, SHALL, R.NOT_LAID_OUT),
  notAssessed('B.7.2.3.2 ¶2', 83, SHALL, R.EXTERNAL),
  notAssessed('B.7.2.3.3 ¶1', 84, SHALL, R.BY_CONSTRUCTION),
  notAssessed('B.7.2.3.3 ¶2', 84, SHALL, R.NOT_LAID_OUT, LIFE),
  notAssessed('B.7.2.3.3 ¶3 — sentence 1', 84, SHALL, R.NOT_ENCODED, { detail: D.WHEEL_STOPPERS }),
  notAssessed('B.7.2.3.3 ¶3 — sentence 2', 84, SHOULD, R.NOT_LAID_OUT),
  notAssessed('B.7.2.3.3 ¶4 — sentence 1', 84, SHOULD, R.NOT_ENCODED, { detail: D.ENTRY_RUN }),
  notAssessed('B.7.2.3.3 ¶4 — sentence 2', 84, SHALL, R.NOT_LAID_OUT),
  notAssessed('B.7.2.3.3 ¶5', 84, SHALL, R.DETAIL),
  notAssessed('B.7.2.3.3 ¶6', 84, SHALL, R.BY_CONSTRUCTION),
  notAssessed('B.7.2.3.3 ¶7', 84, SHALL, R.NOT_LAID_OUT),
  applied('B.7.2.3.3 ¶8', 85, SHOULD, AppliedIn.DEAD_ENDS, [mod(DEAD_ENDS)]),
  notApplicable('B.7.2.3.3 ¶8 a)', 85, MAY, P.PERMISSION_NOT_TAKEN),
  notApplicable('B.7.2.3.3 ¶8 b)', 85, MAY, P.USE_NOT_STUDIED),

  // B.7.2.4 Car parking bay dimensions
  applied('B.7.2.4 ¶1', 86, SHALL, AppliedIn.PARKING_LAYOUT, [
    cite('TABLE_B11', LAYOUT),
    cite('TABLE_B11_DRIVEWAY', ACCESS),
  ]),
  applied('Table B.11 Minimum dimensions for parking', 86, SHALL, AppliedIn.PARKING_LAYOUT, [
    cite('TABLE_B11', LAYOUT),
    cite('TABLE_B11_DRIVEWAY', ACCESS),
  ]),
  notApplicable('Table B.11 note *', 86, MAY, P.PERMISSION_NOT_TAKEN),
  notAssessed('B.7.2.4 ¶2', 86, SHALL, R.OPEN_QUESTION, { detail: D.BAY_BESIDE_STRUCTURE }),

  // B.7.2.5 Bus parking — the study lays out no bus bay
  notApplicable('B.7.2.5 ¶1', 88, SHALL, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.7.2.5 ¶2 — sentence 1', 88, INFORMATIVE, P.NO_REQUIREMENT),
  notApplicable('B.7.2.5 ¶2 — sentence 2', 88, SHALL, P.ELEMENT_NOT_PROPOSED),
  notApplicable('Table B.12 Bus parking dimensions', 88, SHALL, P.ELEMENT_NOT_PROPOSED),

  // B.7.2.6 Parking provisions
  applied('B.7.2.6.1 ¶1', 89, SHALL, AppliedIn.PARKING_DEMAND, B13_RULES),
  applied('Table B.13 Parking ratios', 89, SHALL, AppliedIn.PARKING_DEMAND, B13_RULES),
  notApplicable('B.7.2.6.1 ¶2', 90, SHOULD, P.USE_NOT_STUDIED),
  notAssessed('B.7.2.6.1 ¶3', 90, SHOULD, R.NOT_ENCODED, { detail: D.SECOND_USE_PARKING }),
  notApplicable('B.7.2.6.1 ¶4', 90, SHALL, P.USE_NOT_STUDIED),
  applied('B.7.2.6.2 ¶1', 90, SHALL, AppliedIn.ACCESSIBLE_BAYS, [cite('CLAUSE_B_7_2_6_2', ACCESSIBLE)]),
  applied('B.7.2.6.2 ¶2', 90, SHALL, AppliedIn.ACCESSIBLE_BAYS, [cite('CLAUSE_B_7_2_6_2', ACCESSIBLE)]),
  applied('B.7.2.6.2 ¶3', 90, SHALL, AppliedIn.ACCESSIBLE_BAYS, [cite('CLAUSE_B_7_2_6_2', ACCESSIBLE)]),
  notApplicable('B.7.2.6.3 ¶1', 90, SHALL, P.USE_NOT_STUDIED),

  // B.7.2.7 Bicycle parking — mechanical, and not encoded: said, not dropped
  notAssessed('B.7.2.7 ¶1', 91, SHOULD, R.NOT_ENCODED, { detail: D.BICYCLE }),
  notAssessed('B.7.2.7 ¶2', 91, SHALL, R.NOT_LAID_OUT, LIFE),
  notApplicable('B.7.2.7 ¶3', 91, SHALL, P.USE_NOT_STUDIED),
  notAssessed('B.7.2.7 ¶4', 91, SHALL, R.NOT_ENCODED, { detail: D.BICYCLE }),
  notAssessed('B.7.2.7 ¶5', 91, SHALL, R.NOT_ENCODED, { detail: D.BICYCLE }),
  notAssessed('Table B.14 Bicycle stand minimum dimensions', 91, SHALL, R.NOT_ENCODED, { detail: D.BICYCLE }),

  // B.7.3.1 Loading — whether a residential tower needs one is the client's question
  notAssessed('B.7.3.1.1 ¶1', 92, SHALL, R.OPEN_QUESTION, { detail: D.LOADING }),
  notAssessed('B.7.3.1.1 ¶2', 92, SHALL, R.OPEN_QUESTION, { detail: D.LOADING }),
  notAssessed('B.7.3.1.1 ¶3', 92, SHALL, R.OPEN_QUESTION),
  notAssessed('B.7.3.1.1 ¶4', 92, SHALL, R.OPEN_QUESTION),
  notAssessed('B.7.3.1.1 ¶5', 92, SHALL, R.DETAIL),
  notAssessed('B.7.3.1.1 ¶6', 92, MAY, R.OPEN_QUESTION),
  notAssessed('B.7.3.1.2 ¶1', 92, SHALL, R.OPEN_QUESTION),
  notAssessed('Table B.15 Required clearances', 92, SHALL, R.OPEN_QUESTION),
  notAssessed('B.7.3.1.3 ¶1', 93, SHOULD, R.OPEN_QUESTION),
  notAssessed('B.7.3.1.3 ¶2', 93, SHALL, R.OPEN_QUESTION, { detail: D.LOADING }),
  notAssessed('Table B.16 Loading truck size requirement based on use', 93, SHALL, R.OPEN_QUESTION, {
    detail: D.LOADING,
  }),
  notApplicable('B.7.3.1.4 ¶1', 93, INFORMATIVE, P.NO_REQUIREMENT),
  notAssessed('B.7.3.1.4 ¶2', 93, SHALL, R.OPEN_QUESTION),
  notAssessed('B.7.3.1.4 a)', 93, SHALL, R.OPEN_QUESTION),
  notAssessed('B.7.3.1.4 b)', 93, SHALL, R.OPEN_QUESTION),
  notApplicable('B.7.3.1.4 ¶3 — sentence 1', 93, MAY, P.PERMISSION_NOT_TAKEN),
  notAssessed('B.7.3.1.4 ¶3 — sentence 2', 93, SHALL, R.OPEN_QUESTION),

  // B.7.3.2 Service ramps and B.7.3.3 ladders — none is proposed
  notApplicable('B.7.3.2 ¶1', 96, SHALL, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.7.3.2 ¶2', 96, SHALL, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.7.3.2 ¶3', 96, SHALL, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.7.3.2 ¶4', 96, SHALL, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.7.3.2 ¶5', 96, SHOULD, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.7.3.2 ¶6', 96, SHALL, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.7.3.3 ¶1', 97, SHALL, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.7.3.3 a)', 97, SHALL, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.7.3.3 b)', 97, SHALL, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.7.3.3 c)', 97, SHALL, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.7.3.3 d)', 97, SHALL, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.7.3.3 e)', 97, SHALL, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.7.3.3 f)', 97, SHALL, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.7.3.3 g)', 97, SHALL, P.ELEMENT_NOT_PROPOSED),
  notApplicable('Table B.17 Service ladder minimum dimensions', 97, SHALL, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.7.3.3 ¶2', 98, MAY, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.7.3.3 1)', 98, MAY, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.7.3.3 2)', 98, MAY, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.7.3.3 3)', 98, MAY, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.7.3.3 4)', 98, MAY, P.ELEMENT_NOT_PROPOSED),

  // B.7.3.4 Access to utilities
  notApplicable('B.7.3.4 ¶1', 98, INFORMATIVE, P.NO_REQUIREMENT),
  notAssessed('B.7.3.4 ¶2', 98, SHALL, R.NOT_LAID_OUT, LIFE),
  notApplicable('B.7.3.4 ¶3', 98, SHALL, P.ELEMENT_NOT_PROPOSED),
  notApplicable('B.7.3.4 ¶4', 98, SHALL, P.ELEMENT_NOT_PROPOSED),
  notAssessed('B.7.3.4 ¶5', 98, SHALL, R.NOT_LAID_OUT, LIFE),

  // C.6.4 Accessible parking
  applied('C.6.4.1 ¶1', 194, SHALL, AppliedIn.ACCESSIBLE_BAYS, [mod(ACCESSIBLE)]),
  applied('C.6.4.1 ¶2', 194, SHALL, AppliedIn.ACCESSIBLE_BAYS, [cite('TABLE_C17', ACCESSIBLE)]),
  notApplicable('C.6.4.1 ¶3', 194, SHOULD, P.USE_NOT_STUDIED),
  applied('C.6.4.1 ¶4', 194, SHOULD, AppliedIn.ACCESSIBLE_BAYS, [cite('CLAUSE_C_6_4_1_4', ACCESSIBLE)]),
  notAssessed('C.6.4.1 ¶5', 194, SHALL, R.BY_CONSTRUCTION),
  applied('Table C.17 Minimum number of accessible parking spaces', 194, SHALL, AppliedIn.ACCESSIBLE_BAYS, [
    cite('TABLE_C17', ACCESSIBLE),
  ]),
  applied('Table C.18 Parking dimensions', 194, SHALL, AppliedIn.ACCESSIBLE_BAYS, [cite('CLAUSE_C_6_4_1_4', ACCESSIBLE)], {
    rest: R.BY_CONSTRUCTION,
  }),
  notApplicable('C.6.4.2 ¶1', 195, INFORMATIVE, P.NO_REQUIREMENT),
  applied('C.6.4.2 a)', 195, SHOULD, AppliedIn.ACCESSIBLE_BAYS, [mod(ACCESSIBLE)]),
  applied('C.6.4.2 b)', 195, SHALL, AppliedIn.ACCESSIBLE_BAYS, [mod(ACCESSIBLE)], { rest: R.NOT_LAID_OUT }),
  notAssessed('C.6.4.2 c)', 195, SHALL, R.NOT_LAID_OUT),
  notAssessed('C.6.4.2 d)', 195, SHALL, R.NOT_LAID_OUT),
  applied('C.6.4.2 e)', 195, SHALL, AppliedIn.ACCESSIBLE_BAYS, [mod(ACCESSIBLE)]),
  applied('C.6.4.2 f)', 195, SHALL, AppliedIn.ACCESSIBLE_BAYS, [mod(ACCESSIBLE)], { rest: R.NOT_LAID_OUT }),
  applied('C.6.4.2 g)', 195, SHALL, AppliedIn.ACCESSIBLE_BAYS, [mod(ACCESSIBLE)]),
  notAssessed('C.6.4.2 h)', 195, SHALL, R.NOT_LAID_OUT),
  notAssessed('C.6.4.2 i)', 195, SHALL, R.DETAIL),
  notAssessed('C.6.4.2 j)', 195, SHALL, R.NOT_LAID_OUT),
  notAssessed('C.6.4.2 k)', 195, SHALL, R.NOT_LAID_OUT),
  notAssessed('C.6.4.2 l)', 195, SHALL, R.NOT_LAID_OUT),
]);

/** The register as the composition root hands it to the validator. */
export const DBC_REGISTER: ClauseRegister = Object.freeze({
  version: CLAUSE_REGISTER_VERSION,
  scope: CLAUSE_REGISTER_SCOPE,
  entries: DBC_CLAUSE_REGISTER,
});
