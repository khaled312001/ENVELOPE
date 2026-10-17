/**
 * The Dubai Building Code clause register — what the engine does with every clause
 * a plot study can touch, said one clause at a time.
 *
 * ---
 *
 * ## Why it exists: silence was the defect
 *
 * The rule-coverage line used to read "we encoded 7 of 9 requirements identified
 * as applicable (77.8%)". Both numbers counted *rule records*, and nine of them are
 * a seed set. Every DBC clause the capacity engine applies as a cited constant
 * (Table B.9, Table B.11, B.7.2.1 …) was outside the ratio, and so was every clause
 * nobody encoded — B.7.2.7's bicycle parking, B.7.3.1's loading area, B.5.3's clear
 * heights. A professional reading 77.8% read it as coverage of the code. It was
 * coverage of our own list, and the clauses missing from the list were not "not
 * assessed" anywhere: they were simply absent, which reads as "fine".
 *
 * So every clause of B.4, B.5, B.7 and C.6.4 that `docs/02-reference/dbc`
 * transcribes is listed here with one of three statuses, and a test
 * (`packages/rules/test/clause-register.test.ts`) holds the list to that
 * transcription both ways: every entry names a clause printed on the page it
 * states, and every clause printed there has an entry. A clause added to the
 * reference and not to the register fails the build; it cannot fall silent.
 *
 * ## Why it is not a `RuleRecord`
 *
 * A `RuleRecord` is resolvable and can bind a computation. This register binds
 * nothing. It is a statement about the engine, in the same family as
 * `DeveloperStandard` and `PracticeStatement`, which are deliberately not rule
 * records either. An entry marked APPLIED points at the record or cited constant
 * that does the binding; the entry itself never could.
 *
 * ## The statuses, and what each one is allowed to mean
 *
 * - **APPLIED** — a cited constant, a rule record or a named module in the engine
 *   uses the clause. `by` says which, and a second test
 *   (`apps/api/test/clause-register-citations.test.ts`) holds every DBC citation
 *   the engine carries to an APPLIED entry on the same page. A clause used only in
 *   part says so with `rest`, the reason the remainder is not assessed.
 * - **NOT_ASSESSED** — nothing checks it. The reason is one of a small, fixed set,
 *   so each can be said in both languages without a translation per clause.
 * - **NOT_APPLICABLE** — it cannot bear on the building this study models, and the
 *   predicate says why. Used narrowly: a clause about something the study *could*
 *   meet (a mixed-use lobby, a heritage area) is NOT_ASSESSED, never N/A, because
 *   the study cannot rule it out.
 *
 * Statuses are for the scope {@link CLAUSE_REGISTER_SCOPE} states and nothing
 * wider. A plot of another use needs its own register; this one does not stretch.
 */

/** What the engine does with a clause. */
export const ClauseStatus = {
  APPLIED: 'APPLIED',
  NOT_ASSESSED: 'NOT_ASSESSED',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
} as const;
export type ClauseStatus = (typeof ClauseStatus)[keyof typeof ClauseStatus];

/**
 * The clause's verbal form, per DBC A.3.2: shall = mandatory, should =
 * recommended, may = permitted. A paragraph the reference records as mixed
 * ("may … shall") takes the strongest form it contains, because a reader sorting
 * on "mandatory" must not lose the mandatory half of a mixed paragraph.
 */
export const ClauseObligation = {
  SHALL: 'SHALL',
  SHOULD: 'SHOULD',
  MAY: 'MAY',
  DEFINITION: 'DEFINITION',
  INFORMATIVE: 'INFORMATIVE',
} as const;
export type ClauseObligation = (typeof ClauseObligation)[keyof typeof ClauseObligation];

/** Where in the study an applied clause acts. */
export const AppliedIn = {
  AFFECTION_PLAN: 'AFFECTION_PLAN',
  SETBACKS: 'SETBACKS',
  HEIGHT: 'HEIGHT',
  PARKING_DEMAND: 'PARKING_DEMAND',
  PARKING_LAYOUT: 'PARKING_LAYOUT',
  RAMPS: 'RAMPS',
  VEHICLE_ACCESS: 'VEHICLE_ACCESS',
  ACCESSIBLE_BAYS: 'ACCESSIBLE_BAYS',
  GROUND_FLOOR: 'GROUND_FLOOR',
  DEAD_ENDS: 'DEAD_ENDS',
} as const;
export type AppliedIn = (typeof AppliedIn)[keyof typeof AppliedIn];

/** Said in English; `packages/report/src/words/register-notes.ts` carries the Arabic. */
export const APPLIED_IN_WORDS: Readonly<Record<AppliedIn, string>> = {
  AFFECTION_PLAN: 'The affection plan’s limits',
  SETBACKS: 'Setbacks',
  HEIGHT: 'Height',
  PARKING_DEMAND: 'Parking required',
  PARKING_LAYOUT: 'Parking layout',
  RAMPS: 'Ramps',
  VEHICLE_ACCESS: 'Vehicle access',
  ACCESSIBLE_BAYS: 'Accessible and preferred bays',
  GROUND_FLOOR: 'Ground-floor plant',
  DEAD_ENDS: 'Dead-end driveways',
};

/**
 * Why nothing checks a clause. A closed set rather than a sentence per clause: a
 * sentence per clause is three hundred sentences to translate and to keep true,
 * and a reader comparing two clauses should see the same words for the same
 * reason.
 */
export const NotAssessedReason = {
  /** The clause can be worked out from what the study holds; nobody has encoded it. */
  NOT_ENCODED: 'NOT_ENCODED',
  /** The drawing keeps to it because of how it is built, and no check names the clause. */
  BY_CONSTRUCTION: 'BY_CONSTRUCTION',
  NEEDS_LEVELS: 'NEEDS_LEVELS',
  NEEDS_ROAD_DATA: 'NEEDS_ROAD_DATA',
  NEEDS_USE_DATA: 'NEEDS_USE_DATA',
  NOT_LAID_OUT: 'NOT_LAID_OUT',
  DETAIL: 'DETAIL',
  EXTERNAL: 'EXTERNAL',
  JUDGEMENT: 'JUDGEMENT',
  /** Asked of the client and not answered. Never assumed in the meantime. */
  OPEN_QUESTION: 'OPEN_QUESTION',
} as const;
export type NotAssessedReason = (typeof NotAssessedReason)[keyof typeof NotAssessedReason];

export const NOT_ASSESSED_REASON: Readonly<Record<NotAssessedReason, string>> = {
  NOT_ENCODED: 'Can be worked out from the plot and the study’s inputs, and is not encoded yet.',
  BY_CONSTRUCTION: 'The study’s layout keeps to it as drawn, and no check cites the clause.',
  NEEDS_LEVELS:
    'Needs levels the study does not hold: road, gate and slab levels, floor-to-floor heights or beam depths.',
  NEEDS_ROAD_DATA:
    'Needs road facts an affection plan does not give: widths, traffic, or the road network beyond the plot.',
  NEEDS_USE_DATA:
    'Needs use facts the study does not collect: permitted uses, occupant numbers or a neighbour’s use.',
  NOT_LAID_OUT:
    'Concerns something the study does not lay out: exits, stairs, doors, rooms, balconies, columns, signs or footpaths.',
  DETAIL: 'A construction, finish or equipment detail beyond a capacity study.',
  EXTERNAL:
    'Defers to an instrument not encoded here: UAE FLSC, RTA manuals, DCAA, DCRs or other parts of the code.',
  JUDGEMENT: 'A design judgement with no measurable test.',
  OPEN_QUESTION: 'Whether it applies to this building is an open question with the client, and is not assumed.',
};

/** Why a clause cannot bear on the building this study models. */
export const NotApplicableReason = {
  NO_REQUIREMENT: 'NO_REQUIREMENT',
  USE_NOT_STUDIED: 'USE_NOT_STUDIED',
  ELEMENT_NOT_PROPOSED: 'ELEMENT_NOT_PROPOSED',
  PERMISSION_NOT_TAKEN: 'PERMISSION_NOT_TAKEN',
} as const;
export type NotApplicableReason = (typeof NotApplicableReason)[keyof typeof NotApplicableReason];

export const NOT_APPLICABLE_REASON: Readonly<Record<NotApplicableReason, string>> = {
  NO_REQUIREMENT: 'A definition, example or lead-in; it sets no requirement of its own.',
  USE_NOT_STUDIED: 'Applies to a use other than the residential tower this study models.',
  ELEMENT_NOT_PROPOSED: 'Applies only where a scheme has an element this study never proposes.',
  PERMISSION_NOT_TAKEN: 'A permission the study does not take.',
};

/**
 * What one clause needs said beyond its reason — kept to the clauses a reader of
 * a parking study would look for and not find. Keyed, so the Arabic is one entry
 * per sentence rather than one per clause.
 */
export const ClauseDetail = {
  GATE_LEVEL: 'GATE_LEVEL',
  BASEMENT_SOFFIT: 'BASEMENT_SOFFIT',
  CLEAR_HEIGHT: 'CLEAR_HEIGHT',
  COVERAGE: 'COVERAGE',
  SETBACK_PODIUM: 'SETBACK_PODIUM',
  WHEEL_STOPPERS: 'WHEEL_STOPPERS',
  ENTRY_RUN: 'ENTRY_RUN',
  BAY_BESIDE_STRUCTURE: 'BAY_BESIDE_STRUCTURE',
  BICYCLE: 'BICYCLE',
  LOADING: 'LOADING',
  SECOND_USE_PARKING: 'SECOND_USE_PARKING',
} as const;
export type ClauseDetail = (typeof ClauseDetail)[keyof typeof ClauseDetail];

export const CLAUSE_DETAIL: Readonly<Record<ClauseDetail, string>> = {
  GATE_LEVEL:
    'Gate level is not computed: the road-edge and access-point levels it starts from are not on an affection plan.',
  BASEMENT_SOFFIT:
    'The basement soffit’s 1.2 m limit above the gate level is not checked: neither level is held.',
  CLEAR_HEIGHT:
    'Clear heights, the parking’s included, are not checked: they need floor-to-floor heights and beam depths, and the study’s floor-to-floor figure is a development placeholder, not a cited one.',
  COVERAGE:
    'Plot coverage is measured under the study’s own area-definitions annex (PLOT_COVERAGE), not checked against this clause’s wording.',
  SETBACK_PODIUM:
    'Held for the tower. The ground floor and podium stand on the boundary under STMT-PODIUM-SETBACK-2026-10-16, a named practitioner’s statement listed wherever it applies.',
  WHEEL_STOPPERS: 'Wheel stoppers are not placed or drawn.',
  ENTRY_RUN: 'The 6 m straight run before a barrier or ramp is not reserved or checked.',
  BAY_BESIDE_STRUCTURE:
    'The extra 300 mm beside a wall, a column or the core is not added to any bay. Beside a column, whether the 0.50 m gap after every three bays (STMT-COLUMN-GAP-2026-10-16) already includes it is an open question; beside a wall or the core it is simply not encoded.',
  BICYCLE:
    'Bicycle parking is not computed. The code asks for 5% of the building’s required car bays (¶4), at stands no smaller than Table B.14 and within 30 m of the entrance (¶1); it states no rounding.',
  LOADING:
    'No loading area is placed. Table B.16 asks for one sized for a 9 m truck wherever an off-street loading area is required, and does not say when a residential building requires one.',
  SECOND_USE_PARKING: 'Parking for a second use, such as shops on the ground floor, is not counted.',
};

/**
 * What in the engine applies a clause. Each kind is checkable by a test, which is
 * why a free-text "applied in the layout" is not one of them: a citation constant
 * is found by its exported name and page, a rule record by its id, a module by
 * its path.
 */
export type ClauseApplication =
  | {
      /** An exported `Citation` constant in `module`, held to the entry's page. */
      readonly kind: 'CITATION';
      readonly name: string;
      readonly module: string;
    }
  | {
      /** A seed rule record whose citation is this clause. */
      readonly kind: 'RULE';
      readonly ruleId: string;
    }
  | {
      /** A module that applies the clause in its own logic and names it in its text. */
      readonly kind: 'MODULE';
      readonly module: string;
    };

interface ClauseBase {
  /** The clause as `docs/02-reference/dbc` heads it: `B.7.2.7 ¶4`, `Table B.11`. */
  readonly clause: string;
  /** The English page it is printed on (the Arabic edition shares page numbers). */
  readonly page: number;
  readonly obligation: ClauseObligation;
  /** Fire, egress, falls: a deferred life-safety clause is a different conversation. */
  readonly lifeSafety: boolean;
  readonly detail: ClauseDetail | null;
}

export interface AppliedClause extends ClauseBase {
  readonly status: typeof ClauseStatus.APPLIED;
  readonly appliedIn: AppliedIn;
  readonly by: readonly ClauseApplication[];
  /** The part of the clause nothing checks, when the engine applies only some of it. */
  readonly rest: NotAssessedReason | null;
}

export interface NotAssessedClause extends ClauseBase {
  readonly status: typeof ClauseStatus.NOT_ASSESSED;
  readonly reason: NotAssessedReason;
}

export interface NotApplicableClause extends ClauseBase {
  readonly status: typeof ClauseStatus.NOT_APPLICABLE;
  readonly predicate: NotApplicableReason;
}

export type ClauseRegisterEntry = AppliedClause | NotAssessedClause | NotApplicableClause;

/** A register as a validator or report receives it: its entries, and what they are relative to. */
export interface ClauseRegister {
  readonly version: string;
  readonly scope: string;
  readonly entries: readonly ClauseRegisterEntry[];
}

/** The counts a claim line and a report lede print. Counted, never typed. */
export interface ClauseRegisterCounts {
  readonly total: number;
  readonly applied: number;
  readonly notAssessed: number;
  /** NOT_ASSESSED and SHALL: the clauses a reader must know nothing checked. */
  readonly notAssessedMandatory: number;
  readonly notApplicable: number;
}

export function clauseRegisterCounts(entries: readonly ClauseRegisterEntry[]): ClauseRegisterCounts {
  const notAssessed = entries.filter((e) => e.status === ClauseStatus.NOT_ASSESSED);
  return {
    total: entries.length,
    applied: entries.filter((e) => e.status === ClauseStatus.APPLIED).length,
    notAssessed: notAssessed.length,
    notAssessedMandatory: notAssessed.filter((e) => e.obligation === ClauseObligation.SHALL).length,
    notApplicable: entries.filter((e) => e.status === ClauseStatus.NOT_APPLICABLE).length,
  };
}

/** The sentence an entry's status carries: its reason, its predicate, or where it acts. */
export function clauseReasonSentence(entry: ClauseRegisterEntry): string {
  switch (entry.status) {
    case ClauseStatus.APPLIED:
      return APPLIED_IN_WORDS[entry.appliedIn];
    case ClauseStatus.NOT_ASSESSED:
      return NOT_ASSESSED_REASON[entry.reason];
    case ClauseStatus.NOT_APPLICABLE:
      return NOT_APPLICABLE_REASON[entry.predicate];
    default: {
      const unreachable: never = entry;
      throw new Error(`unhandled clause status ${JSON.stringify(unreachable)}`);
    }
  }
}

/** How a printed register names what applies a clause: module and name, never a paraphrase. */
export function clauseApplicationLabel(a: ClauseApplication): string {
  switch (a.kind) {
    case 'CITATION':
      return `${a.name} (${a.module})`;
    case 'RULE':
      return a.ruleId;
    case 'MODULE':
      return a.module;
    default: {
      const unreachable: never = a;
      throw new Error(`unhandled clause application ${JSON.stringify(unreachable)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// What the proposal promised in writing, and what exists
// ---------------------------------------------------------------------------

/**
 * The 31 Aug 2026 proposal (`docs/04-delivery/proposal/content.en.html`) made
 * written promises the code base does not all keep. A promise that is not kept
 * and not said is the marketing-page version of a silent clause, so each one is
 * recorded here beside what exists, and printed in the report so no output can be
 * read as claiming it. Building them is a separate decision; saying them is not.
 */
export const PromiseStatus = {
  BUILT: 'BUILT',
  PARTLY_BUILT: 'PARTLY_BUILT',
  NOT_BUILT: 'NOT_BUILT',
} as const;
export type PromiseStatus = (typeof PromiseStatus)[keyof typeof PromiseStatus];

export interface WrittenPromise {
  readonly id: string;
  /** The proposal's own words, quoted. */
  readonly promised: string;
  readonly status: PromiseStatus;
  /** What the product does today, said plainly. */
  readonly exists: string;
}

export const PROPOSAL_DATE = '2026-08-31';

export const WRITTEN_PROMISES: readonly WrittenPromise[] = [
  {
    id: 'IFC_EXPORT',
    promised:
      'Six exports, including IFC into Revit. … IFC 4 (ISO 16739), which Revit imports natively.',
    status: PromiseStatus.NOT_BUILT,
    exists:
      'No IFC file is written. The exports are the study report (HTML, printed to PDF), JSON, the A3 drawing set, DXF, the 3D model as .glb and XLSX.',
  },
  {
    id: 'CODED_CLAUSES',
    promised:
      'Coded Dubai Building Code clauses. Parking ratios, bay and aisle dimensions, access and ramp rules, and setbacks — each a dated record with its reference and page number, not a condition hidden in code.',
    status: PromiseStatus.PARTLY_BUILT,
    exists:
      'Parking ratios (Table B.13, p89) and setbacks from a road and from a neighbour (Table B.1, p41) are dated rule records with page and verbatim text, still drafts no named architect has approved. Bay and aisle dimensions (Table B.11, p86), access (B.7.2.1, p78) and ramps (Tables B.9 and B.10, p80 and p82) are cited constants with page and verbatim text, not dated records. Setbacks to open space and to an unclassified boundary, the height in metres where a sheet states none, and the floor-to-floor height are placeholders that cite no instrument.',
  },
  {
    id: 'RAMP_CHECK',
    promised:
      'Ramp gradient and headroom are checked against B.7.2.2, from the ramp run and the floor-to-floor height.',
    status: PromiseStatus.PARTLY_BUILT,
    exists:
      'Since 15 Oct 2026 the ramp is sized from Table B.9 (12% and 2.4 m clear height, p80) and Table B.10 (transitions, p82). Its rise is the floor-to-floor height, which is a development placeholder. None of the six requirements B.7.2.2 numbers 1) to 6) is assessed: the floor finish, obstructions, corner protection, mirrors and drainage.',
  },
];
