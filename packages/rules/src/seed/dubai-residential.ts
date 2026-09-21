/**
 * Seed rule set — Dubai residential towers.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠  NOT APPROVED. NOT A RULE BASE. DO NOT PRODUCE A REPORT FROM THIS.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Every record below carries `status: DRAFT` and an `authoredBy` of
 * `engineering-placeholder`, and the store will refuse to load any of them
 * through the normal path. That refusal is the product working correctly:
 * PRD Principle 9 — "AI may draft a rule. A licensed architect approves it.
 * Unapproved rules cannot be loaded by the engine — there is no override flag."
 *
 * These exist so the engine can be built, tested and demonstrated end to end
 * before a Regulatory Architect is engaged. The *shapes* are real — the
 * parameter vocabulary, the applicability predicates, the evaluator arguments,
 * the tier structure of the setback table — and they are what a rule author
 * fills in rather than invents. The *values* are illustrative and the citations
 * are placeholders pointing at clauses nobody has read into this file.
 *
 * What must happen before any of this is real (see `docs/03-analysis/`):
 *
 * 1. A licensed Dubai architect authors each rule against the actual instrument,
 *    filling `citation` with a real page, bounding box and verbatim clause text.
 * 2. The target community is named, and its Development Control Regulation is
 *    obtained in citable form — open question Q1. Without it there is no
 *    `document_uri` and `FR-RUL-001 AC1` cannot be satisfied.
 * 3. Parking-in-FAR is determined — Q2. It swings capacity 15–35%.
 * 4. Each rule gets three real tests, including a boundary case *at* the tier
 *    threshold, and is approved by name.
 *
 * The one thing here that is not illustrative is the **shape of
 * `T-SETBACK-BOUNDARY`**: a setback that tiers on level count is what makes the
 * envelope a fixpoint, and it is the structure the deck's slide 05 describes.
 * Whatever the real numbers turn out to be, that structure is what the solver
 * has to cope with.
 */

import {
  ApprovalStatus,
  EvaluatorName,
  Mechanization,
  Operator,
  RuleClass,
  type RuleRecord,
} from '../record.js';

const PLACEHOLDER_AUTHOR = 'engineering-placeholder';
const RECORDED_AT = '2026-08-30T00:00:00Z';

/** A citation that is honest about being a placeholder. */
function draftCitation(clause: string, note: string) {
  return {
    instrumentId: 'PLACEHOLDER-NOT-A-REAL-INSTRUMENT',
    instrumentVersion: '0.0.0-draft',
    clauseReference: clause,
    documentUri: 'urn:envelope:placeholder:unsourced',
    sourcePage: 0,
    sourceBbox: [0, 0, 0, 0] as const,
    sourceTextVerbatim: `[NOT SOURCED] ${note}`,
  };
}

const draft = (
  r: Omit<RuleRecord, 'status' | 'authoredBy' | 'approvedBy' | 'approvedAt' | 'recordedAt' | 'version' | 'supersedes'>,
): RuleRecord => ({
  ...r,
  status: ApprovalStatus.DRAFT,
  authoredBy: PLACEHOLDER_AUTHOR,
  approvedBy: null,
  approvedAt: null,
  recordedAt: RECORDED_AT,
  version: 1,
  supersedes: null,
});

const RESIDENTIAL = { land_use: { in: ['RESIDENTIAL_MULTI'] } } as const;

// ---------------------------------------------------------------------------
// The setback table that makes the envelope circular
// ---------------------------------------------------------------------------

/**
 * Tiered boundary setback, keyed on level count.
 *
 * This is the structure the deck describes: "3.00 m at ground, rising to 7.50 m
 * at G+9 and above. But the number of floors depends on the footprint, and the
 * footprint depends on the setback."
 *
 * Rows are ordered and first-match-wins, so the highest tier is listed first.
 */
const T_SETBACK_BOUNDARY = {
  tableId: 'T-SETBACK-BOUNDARY',
  rows: [
    { when: {}, whenAtLeast: { 'levels.above_ground': 10 }, value: '7.50' },
    { when: {}, whenAtLeast: { 'levels.above_ground': 8 }, value: '6.00' },
    { when: {}, whenAtLeast: { 'levels.above_ground': 7 }, value: '5.25' },
    { when: {}, whenAtLeast: { 'levels.above_ground': 4 }, value: '4.50' },
    { when: {}, whenAtLeast: { 'levels.above_ground': 0 }, value: '3.00' },
  ],
} as const;

/** Road setback by hierarchy — the classic table lookup, not circular. */
const T_SETBACK_ROAD = {
  tableId: 'T-SETBACK-ROAD',
  rows: [
    { when: { 'edge.road_hierarchy': 'ARTERIAL' }, value: '9.00' },
    { when: { 'edge.road_hierarchy': 'COLLECTOR' }, value: '6.00' },
    { when: { 'edge.road_hierarchy': 'LOCAL' }, value: '4.50' },
    { when: { 'edge.road_hierarchy': 'ACCESS' }, value: '3.00' },
  ],
} as const;

export const SEED_RULES: readonly RuleRecord[] = [
  draft({
    ruleId: 'R-SETBACK-ROAD-RES',
    parameterId: 'setback.road',
    ruleClass: RuleClass.GENERATIVE,
    operator: Operator.MIN,
    evaluator: EvaluatorName.POLYGON_OFFSET_INWARD,
    evaluatorArgs: { key: ['edge.road_hierarchy'], table: T_SETBACK_ROAD },
    unit: 'm',
    applicability: { all: [RESIDENTIAL, { 'edge.classification': { eq: 'ROAD' } }] },
    citation: draftCitation(
      'Part B, Table B.1',
      'road setback by hierarchy for residential development',
    ),
    jurisdiction: 'DM_MAINLAND',
    isLifeSafety: false,
    mechanization: Mechanization.MECHANIZED,
    validFrom: '2021-01-01',
    validTo: null,
    tests: [
      {
        kind: 'POSITIVE',
        context: { land_use: 'RESIDENTIAL_MULTI', edge: { classification: 'ROAD', road_hierarchy: 'COLLECTOR' } },
        expected: 6,
      },
      {
        kind: 'BOUNDARY',
        context: { land_use: 'RESIDENTIAL_MULTI', edge: { classification: 'ROAD', road_hierarchy: 'ACCESS' } },
        expected: 3,
        note: 'Lowest tier. An off-by-one in table ordering surfaces here.',
      },
      {
        kind: 'NEGATIVE',
        context: { land_use: 'INDUSTRIAL', edge: { classification: 'ROAD', road_hierarchy: 'ARTERIAL' } },
        expected: 'NOT_APPLICABLE',
      },
    ],
    note: 'Values illustrative. A real authoring pass must replace every one.',
  }),

  draft({
    ruleId: 'R-SETBACK-BOUNDARY-RES',
    parameterId: 'setback.adjacent_plot',
    ruleClass: RuleClass.GENERATIVE,
    operator: Operator.MIN,
    evaluator: EvaluatorName.POLYGON_OFFSET_INWARD,
    evaluatorArgs: { key: ['levels.above_ground'], table: T_SETBACK_BOUNDARY },
    unit: 'm',
    applicability: { all: [RESIDENTIAL, { 'edge.classification': { eq: 'ADJACENT_PLOT' } }] },
    citation: draftCitation(
      'Part B, Table B.1',
      'boundary setback tiered by building height, 3.00 m at ground rising to 7.50 m at G+9',
    ),
    jurisdiction: 'DM_MAINLAND',
    isLifeSafety: false,
    mechanization: Mechanization.MECHANIZED,
    validFrom: '2021-01-01',
    validTo: null,
    tests: [
      {
        kind: 'POSITIVE',
        context: { land_use: 'RESIDENTIAL_MULTI', edge: { classification: 'ADJACENT_PLOT' }, levels: { above_ground: 12 } },
        expected: 7.5,
      },
      {
        kind: 'BOUNDARY',
        context: { land_use: 'RESIDENTIAL_MULTI', edge: { classification: 'ADJACENT_PLOT' }, levels: { above_ground: 10 } },
        expected: 7.5,
        note: 'Exactly at the G+9 threshold — the tier boundary the fixpoint straddles.',
      },
      {
        kind: 'NEGATIVE',
        context: { land_use: 'RESIDENTIAL_MULTI', edge: { classification: 'ROAD' }, levels: { above_ground: 12 } },
        expected: 'NOT_APPLICABLE',
      },
    ],
    note:
      'THIS is the circular rule. Its lookup key is a solver output, which is why ' +
      'the envelope must be solved as a fixpoint (PRD §11.7 applied beyond its ' +
      'stated scope). FR-PLT-002 does not describe an iteration; see open-questions.md.',
  }),

  draft({
    ruleId: 'R-SETBACK-OPEN-SPACE-RES',
    parameterId: 'setback.open_space',
    ruleClass: RuleClass.GENERATIVE,
    operator: Operator.MIN,
    evaluator: EvaluatorName.POLYGON_OFFSET_INWARD,
    evaluatorArgs: { value: '3.00' },
    unit: 'm',
    applicability: { all: [RESIDENTIAL, { 'edge.classification': { eq: 'OPEN_SPACE' } }] },
    citation: draftCitation('Part B, Table B.1', 'setback to public open space'),
    jurisdiction: 'DM_MAINLAND',
    isLifeSafety: false,
    mechanization: Mechanization.MECHANIZED,
    validFrom: '2021-01-01',
    validTo: null,
    tests: [
      { kind: 'POSITIVE', context: { land_use: 'RESIDENTIAL_MULTI', edge: { classification: 'OPEN_SPACE' } }, expected: 3 },
      { kind: 'BOUNDARY', context: { land_use: 'RESIDENTIAL_MULTI', edge: { classification: 'OPEN_SPACE' }, levels: { above_ground: 40 } }, expected: 3, note: 'Height-independent — must not tier.' },
      { kind: 'NEGATIVE', context: { land_use: 'RESIDENTIAL_MULTI', edge: { classification: 'ROAD' } }, expected: 'NOT_APPLICABLE' },
    ],
  }),

  draft({
    ruleId: 'R-SETBACK-OTHER-RES',
    parameterId: 'setback.other',
    ruleClass: RuleClass.GENERATIVE,
    operator: Operator.MIN,
    evaluator: EvaluatorName.POLYGON_OFFSET_INWARD,
    evaluatorArgs: { value: '3.00' },
    unit: 'm',
    applicability: { all: [RESIDENTIAL, { 'edge.classification': { eq: 'OTHER' } }] },
    citation: draftCitation('Part B, Table B.1', 'default boundary treatment'),
    jurisdiction: 'DM_MAINLAND',
    isLifeSafety: false,
    mechanization: Mechanization.PARTIALLY_MECHANIZED,
    validFrom: '2021-01-01',
    validTo: null,
    tests: [
      { kind: 'POSITIVE', context: { land_use: 'RESIDENTIAL_MULTI', edge: { classification: 'OTHER' } }, expected: 3 },
      { kind: 'BOUNDARY', context: { land_use: 'RESIDENTIAL_MULTI', edge: { classification: 'OTHER' }, levels: { above_ground: 1 } }, expected: 3 },
      { kind: 'NEGATIVE', context: { land_use: 'COMMERCIAL', edge: { classification: 'OTHER' } }, expected: 'NOT_APPLICABLE' },
    ],
    note:
      'An OTHER edge is an unclassified boundary. That this needs a rule at all is ' +
      'a sign the classification vocabulary is incomplete — flag it in rule review.',
  }),

  draft({
    ruleId: 'R-FAR-MAX-RES',
    parameterId: 'far.max',
    ruleClass: RuleClass.GENERATIVE,
    operator: Operator.MAX,
    evaluator: EvaluatorName.SCALAR_MAX,
    evaluatorArgs: { value: '5.00' },
    unit: 'ratio',
    applicability: { all: [RESIDENTIAL] },
    citation: draftCitation('DCR, plot schedule', 'permitted floor area ratio'),
    jurisdiction: 'DM_MAINLAND',
    isLifeSafety: false,
    mechanization: Mechanization.MECHANIZED,
    validFrom: '2021-01-01',
    validTo: null,
    tests: [
      { kind: 'POSITIVE', context: { land_use: 'RESIDENTIAL_MULTI' }, expected: 5 },
      { kind: 'BOUNDARY', context: { land_use: 'RESIDENTIAL_MULTI', plot: { area_m2: 1 } }, expected: 5, note: 'FAR is plot-area independent.' },
      { kind: 'NEGATIVE', context: { land_use: 'INDUSTRIAL' }, expected: 'NOT_APPLICABLE' },
    ],
    note:
      'FAR is per-plot in reality and comes from the DCR, not a code-wide rule. ' +
      'Encoded here as a single value only because no community is named yet (Q1). ' +
      'The real rule is plot-specific and will win overlap resolution under §11.5.',
  }),

  draft({
    ruleId: 'R-COVERAGE-MAX-RES',
    parameterId: 'coverage.max',
    ruleClass: RuleClass.GENERATIVE,
    operator: Operator.MAX,
    evaluator: EvaluatorName.SCALAR_MAX,
    evaluatorArgs: { value: '60' },
    unit: '%',
    applicability: { all: [RESIDENTIAL] },
    citation: draftCitation('DCR, plot schedule', 'maximum plot coverage'),
    jurisdiction: 'DM_MAINLAND',
    isLifeSafety: false,
    mechanization: Mechanization.MECHANIZED,
    validFrom: '2021-01-01',
    validTo: null,
    tests: [
      { kind: 'POSITIVE', context: { land_use: 'RESIDENTIAL_MULTI' }, expected: 60 },
      { kind: 'BOUNDARY', context: { land_use: 'RESIDENTIAL_MULTI', levels: { above_ground: 1 } }, expected: 60 },
      { kind: 'NEGATIVE', context: { land_use: 'COMMERCIAL' }, expected: 'NOT_APPLICABLE' },
    ],
  }),

  draft({
    ruleId: 'R-TOWER-PLATE-MAX-RES',
    parameterId: 'tower_plate.max',
    ruleClass: RuleClass.GENERATIVE,
    operator: Operator.MAX,
    evaluator: EvaluatorName.SCALAR_MAX,
    evaluatorArgs: { value: '1280' },
    unit: 'm²',
    applicability: { all: [RESIDENTIAL, { 'levels.above_ground': { gte: 5 } }] },
    citation: draftCitation('Part B', 'maximum typical tower floor plate'),
    jurisdiction: 'DM_MAINLAND',
    isLifeSafety: false,
    mechanization: Mechanization.MECHANIZED,
    validFrom: '2021-01-01',
    validTo: null,
    tests: [
      { kind: 'POSITIVE', context: { land_use: 'RESIDENTIAL_MULTI', levels: { above_ground: 12 } }, expected: 1280 },
      { kind: 'BOUNDARY', context: { land_use: 'RESIDENTIAL_MULTI', levels: { above_ground: 5 } }, expected: 1280, note: 'Applies from level 5 up; level 4 must not.' },
      { kind: 'NEGATIVE', context: { land_use: 'RESIDENTIAL_MULTI', levels: { above_ground: 4 } }, expected: 'NOT_APPLICABLE' },
    ],
    note:
      'PRD Appendix A prints min(podium, 1,280) = 1,280 and then selects 1,060 as the ' +
      '"tower plate (selected)" with no stated derivation. That gap is unresolved — ' +
      'see open-questions.md. 1,280 is used here because it is the value the PRD ' +
      'actually computes.',
  }),

  draft({
    ruleId: 'R-HEIGHT-MAX-RES',
    parameterId: 'height.max',
    ruleClass: RuleClass.GENERATIVE,
    operator: Operator.MAX,
    evaluator: EvaluatorName.SCALAR_MAX,
    evaluatorArgs: { value: '45.00' },
    unit: 'm',
    applicability: { all: [RESIDENTIAL] },
    citation: draftCitation('DCR, plot schedule', 'maximum building height'),
    jurisdiction: 'DM_MAINLAND',
    isLifeSafety: false,
    mechanization: Mechanization.MECHANIZED,
    validFrom: '2021-01-01',
    validTo: null,
    tests: [
      { kind: 'POSITIVE', context: { land_use: 'RESIDENTIAL_MULTI' }, expected: 45 },
      { kind: 'BOUNDARY', context: { land_use: 'RESIDENTIAL_MULTI', levels: { above_ground: 99 } }, expected: 45 },
      { kind: 'NEGATIVE', context: { land_use: 'INDUSTRIAL' }, expected: 'NOT_APPLICABLE' },
    ],
  }),

  draft({
    ruleId: 'R-FLOOR-TO-FLOOR-RES',
    parameterId: 'floor_to_floor',
    ruleClass: RuleClass.FILTERING,
    operator: Operator.MIN,
    evaluator: EvaluatorName.SCALAR_MIN,
    evaluatorArgs: { value: '3.20' },
    unit: 'm',
    applicability: { all: [RESIDENTIAL] },
    citation: draftCitation('Part B', 'minimum residential floor-to-floor height'),
    jurisdiction: 'DM_MAINLAND',
    isLifeSafety: false,
    mechanization: Mechanization.MECHANIZED,
    validFrom: '2021-01-01',
    validTo: null,
    tests: [
      { kind: 'POSITIVE', context: { land_use: 'RESIDENTIAL_MULTI' }, expected: 3.2 },
      { kind: 'BOUNDARY', context: { land_use: 'RESIDENTIAL_MULTI', levels: { above_ground: 1 } }, expected: 3.2 },
      { kind: 'NEGATIVE', context: { land_use: 'COMMERCIAL' }, expected: 'NOT_APPLICABLE' },
    ],
  }),

  draft({
    ruleId: 'R-PARKING-RATIO-RES',
    parameterId: 'parking.demand',
    ruleClass: RuleClass.FILTERING,
    operator: Operator.MIN,
    evaluator: EvaluatorName.RATIO_PER_UNIT_TYPE,
    evaluatorArgs: {
      ratios: { STUDIO: '1.00', '1BED': '1.00', '2BED': '1.50', '3BED': '2.00' },
      mixPath: 'unit.mix',
    },
    unit: 'bays',
    applicability: { all: [RESIDENTIAL] },
    citation: draftCitation('Part B, parking schedule', 'resident parking bays per unit type'),
    jurisdiction: 'DM_MAINLAND',
    isLifeSafety: false,
    mechanization: Mechanization.MECHANIZED,
    validFrom: '2021-01-01',
    validTo: null,
    tests: [
      {
        kind: 'POSITIVE',
        context: { land_use: 'RESIDENTIAL_MULTI', unit: { mix: [{ typeId: '2BED', count: 10 }] } },
        expected: 15,
      },
      {
        kind: 'BOUNDARY',
        context: { land_use: 'RESIDENTIAL_MULTI', unit: { mix: [{ typeId: '1BED', count: 1 }] } },
        expected: 1,
        note: 'A single unit must not round to zero.',
      },
      { kind: 'NEGATIVE', context: { land_use: 'INDUSTRIAL', unit: { mix: [] } }, expected: 'NOT_APPLICABLE' },
    ],
  }),

  draft({
    ruleId: 'R-PARKING-VISITOR-RES',
    parameterId: 'parking.visitor_fraction',
    ruleClass: RuleClass.FILTERING,
    operator: Operator.MIN,
    evaluator: EvaluatorName.SCALAR_MIN,
    evaluatorArgs: { value: '0.15' },
    unit: 'ratio',
    applicability: { all: [RESIDENTIAL] },
    citation: draftCitation('Part B, parking schedule', 'visitor parking as a fraction of resident bays'),
    jurisdiction: 'DM_MAINLAND',
    isLifeSafety: false,
    mechanization: Mechanization.MECHANIZED,
    validFrom: '2021-01-01',
    validTo: null,
    tests: [
      { kind: 'POSITIVE', context: { land_use: 'RESIDENTIAL_MULTI' }, expected: 0.15 },
      { kind: 'BOUNDARY', context: { land_use: 'RESIDENTIAL_MULTI', unit: { mix: [] } }, expected: 0.15 },
      { kind: 'NEGATIVE', context: { land_use: 'COMMERCIAL' }, expected: 'NOT_APPLICABLE' },
    ],
  }),

  // --- Rules that are applicable and deliberately not mechanized -----------
  //
  // PRD §3.4 item 8 requires the deferred-check list in every output. These are
  // what populate it. Declaring them is the difference between "we did not check
  // this" being a published fact and being an omission.

  draft({
    ruleId: 'R-EGRESS-TRAVEL-DISTANCE',
    parameterId: 'egress.travel_distance.max',
    ruleClass: RuleClass.EVALUATIVE_ONLY,
    operator: Operator.MAX,
    evaluator: EvaluatorName.SCALAR_MAX,
    evaluatorArgs: { value: '45.00' },
    unit: 'm',
    applicability: { all: [RESIDENTIAL] },
    citation: draftCitation('UAE FLS Code, Chapter 2', 'maximum travel distance to an exit'),
    jurisdiction: 'UAE_FLS',
    isLifeSafety: true,
    mechanization: Mechanization.MECHANIZED,
    validFrom: '2018-01-01',
    validTo: null,
    tests: [
      { kind: 'POSITIVE', context: { land_use: 'RESIDENTIAL_MULTI' }, expected: 45 },
      { kind: 'BOUNDARY', context: { land_use: 'RESIDENTIAL_MULTI', levels: { above_ground: 1 } }, expected: 45 },
      { kind: 'NEGATIVE', context: { land_use: 'INDUSTRIAL' }, expected: 'NOT_APPLICABLE' },
    ],
    note:
      'EVALUATIVE_ONLY: topological, no constructive inverse (§11.3). It cannot ' +
      'generate a floorplate — it can only reject one. In Phase 0 nothing generates ' +
      'a floorplate, so this rule can only be declared, never applied.',
  }),

  draft({
    ruleId: 'R-FACADE-FIRE-PERFORMANCE',
    parameterId: 'facade.fire_performance',
    ruleClass: RuleClass.DEFERRED,
    operator: Operator.ENUM,
    evaluator: EvaluatorName.ENUM_PERMITTED_SET,
    evaluatorArgs: { permitted: ['NON_COMBUSTIBLE', 'TESTED_ASSEMBLY'] },
    unit: 'enum',
    applicability: { all: [RESIDENTIAL, { 'levels.above_ground': { gte: 4 } }] },
    citation: draftCitation('UAE FLS Code, Chapter 1', 'façade fire performance'),
    jurisdiction: 'UAE_FLS',
    isLifeSafety: false,
    mechanization: Mechanization.NON_MECHANIZABLE,
    validFrom: '2018-01-01',
    validTo: null,
    tests: [
      { kind: 'POSITIVE', context: { land_use: 'RESIDENTIAL_MULTI', levels: { above_ground: 12 } }, expected: ['NON_COMBUSTIBLE', 'TESTED_ASSEMBLY'] },
      { kind: 'BOUNDARY', context: { land_use: 'RESIDENTIAL_MULTI', levels: { above_ground: 4 } }, expected: ['NON_COMBUSTIBLE', 'TESTED_ASSEMBLY'] },
      { kind: 'NEGATIVE', context: { land_use: 'RESIDENTIAL_MULTI', levels: { above_ground: 3 } }, expected: 'NOT_APPLICABLE' },
    ],
    note: 'Performance-based. Appears in the deferred-check list of every report.',
  }),
];

/**
 * Load the seed rules as if approved — **development and test only**.
 *
 * There is deliberately no way to reach this from the API. It exists so the
 * engine can be exercised end to end before a Regulatory Architect exists, and
 * every run that uses it must stamp its output accordingly.
 *
 * @param acknowledgement must be exactly `'I understand these rules are not approved'`.
 * The string is not security — it is a speed bump that makes the call impossible
 * to write by accident and obvious in a code review.
 */
export function loadSeedRulesForDevelopment(acknowledgement: string): readonly RuleRecord[] {
  if (acknowledgement !== 'I understand these rules are not approved') {
    throw new Error(
      'seed rules are DRAFT and carry placeholder citations. They may not be used to ' +
        'produce any output a person might act on. Pass the acknowledgement string to ' +
        'use them in a test or a demo.',
    );
  }
  return SEED_RULES.map((r) => ({
    ...r,
    status: ApprovalStatus.APPROVED,
    approvedBy: 'DEVELOPMENT-ONLY-NOT-A-REAL-APPROVER',
    approvedAt: RECORDED_AT,
  }));
}

/** Banner every artifact built on the seed rules must carry. */
export const SEED_RULES_WARNING =
  'This output was produced from DRAFT rules with placeholder citations. ' +
  'It is a demonstration of the engine, not a capacity assessment. No number in ' +
  'it may be relied upon, quoted, or shown to a third party as an ENVELOPE result.';
