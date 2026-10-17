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
 * Not every record is illustrative any more. Three are transcribed from the
 * Dubai Building Code with page, bounding box and verbatim text — Table B.1's
 * two columns (`R-DBC-B1-NEIGHBOUR`, `R-DBC-B1-ROAD`), B.4.2.2 ¶6's height
 * (`R-DBC-B422-HEIGHT`) and Table B.13's parking ratios — and they are still
 * `DRAFT`: a real page makes a rule *checkable*, and approval is a named
 * architect's act. The neighbour setback tiers on the floor count, which is
 * what makes the envelope a fixpoint and the structure the deck's slide 05
 * describes.
 */

import { Decimal } from '@envelope/core';

import { NOT_APPLICABLE, readPath, registerCustomFunction } from '../evaluators.js';
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

/** The instrument id every placeholder citation carries. */
export const PLACEHOLDER_INSTRUMENT_ID = 'PLACEHOLDER-NOT-A-REAL-INSTRUMENT';

/** Whether a rule's citation reaches no instrument at all — a placeholder figure. */
export function citesPlaceholder(rule: RuleRecord): boolean {
  return rule.citation.instrumentId === PLACEHOLDER_INSTRUMENT_ID;
}

/** A citation that is honest about being a placeholder. */
function draftCitation(clause: string, note: string) {
  return {
    instrumentId: PLACEHOLDER_INSTRUMENT_ID,
    instrumentVersion: '0.0.0-draft',
    clauseReference: clause,
    documentUri: 'urn:envelope:placeholder:unsourced',
    sourcePage: 0,
    sourceBbox: [0, 0, 0, 0] as const,
    sourceTextVerbatim: `[NOT SOURCED] ${note}`,
  };
}

/**
 * DBC 2021 Table B.13, the parking ratios — the first seed citation that is not
 * a placeholder. The record stays `DRAFT`: a real page and verbatim text make the
 * rule *checkable*, not approved, and approval is still a named architect's act.
 *
 * `sourceBbox` is the whole page, as `TABLE_B11`'s is: the table runs across
 * p89–90, and a box claiming the residential rows would be a precision nobody
 * measured. B.7.2.6.1 ¶1 also says the affection plan or DCR "shall take
 * precedent" over the table, which `resolveParameter` gives by precedence when
 * such a rule is on file.
 */
const TABLE_B13 = {
  instrumentId: 'DUBAI_BUILDING_CODE',
  instrumentVersion: '2021',
  clauseReference: 'B.7.2.6.1 ¶1, Table B.13 — Parking ratios (Residential)',
  documentUri: 'docs/00-source/regulations/Dubai Building Code_English_2021 Edition_compressed.pdf',
  sourcePage: 89,
  sourceBbox: [0, 0, 842, 595] as const,
  sourceTextVerbatim:
    'Parking ratios shall be determined in accordance with Table B.13 for the relevant ' +
    'building occupancy. Parking requirements set out in the affection plan or DCR shall ' +
    'take precedent over Table B.13.',
};

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
// DBC 2021 Table B.1 — the setback table that makes the envelope circular
// ---------------------------------------------------------------------------

const DBC_PDF = 'docs/00-source/regulations/Dubai Building Code_English_2021 Edition_compressed.pdf';

/**
 * Table B.1 exactly as printed on p41 of the English edition, row for row.
 *
 * WHY IT IS WRITTEN OUT. The seed used to cite "Part B, Table B.1" for two
 * tables the page does not hold: a road setback of 9 / 6 / 4.5 / 3 m by road
 * hierarchy (the table prints 0 m facing a road at every height, and Figure B.9
 * is titled "Zero setback facing road"), and neighbour tiers one floor off that
 * skipped 3.75 and 6.75 — a G+8 building was given 6.00 m where the code asks
 * 6.75 m, which let the envelope grow past the code under a clause label that
 * said otherwise. So the transcription is held here once, as the page prints
 * it, and both rules' lookup tables are BUILT from it rather than typed beside
 * it: a second hand-typed copy is how the first one drifted.
 *
 * `floors` maps the printed row onto `levels.above_ground`, which counts every
 * level above ground INCLUDING the ground floor. That is the code's own count:
 * B.4.2.2 ¶7 works "G+10" as 11 floors. So "G+4" is 5 floors and "G+1 to G+3"
 * is 2 to 4. The basement row is printed and kept, with no floor range: B.4.2.3
 * ¶3 sets back "from ground floor and above", and the engine's above-ground
 * count never selects it.
 *
 * Checked against the page render and its text layer (bbox below), and against
 * `docs/02-reference/dbc/B.4-general-architectural-provisions.md` by
 * `packages/rules/test/table-b1.test.ts`.
 */
export const TABLE_B1_PRINTED = [
  { printed: 'Basement', neighbourM: '0', roadM: '0', floors: null },
  { printed: 'Ground (G)', neighbourM: '3', roadM: '0', floors: { from: 1, to: 1 } },
  { printed: 'G+1 to G+3', neighbourM: '3', roadM: '0', floors: { from: 2, to: 4 } },
  { printed: 'G+4', neighbourM: '3.75', roadM: '0', floors: { from: 5, to: 5 } },
  { printed: 'G+5', neighbourM: '4.50', roadM: '0', floors: { from: 6, to: 6 } },
  { printed: 'G+6', neighbourM: '5.25', roadM: '0', floors: { from: 7, to: 7 } },
  { printed: 'G+7', neighbourM: '6', roadM: '0', floors: { from: 8, to: 8 } },
  { printed: 'G+8', neighbourM: '6.75', roadM: '0', floors: { from: 9, to: 9 } },
  { printed: 'G+9', neighbourM: '7.50', roadM: '0', floors: { from: 10, to: 10 } },
  { printed: 'G+10 and above', neighbourM: '7.50', roadM: '0', floors: { from: 11, to: null } },
] as const;

/** The column headings, as printed. */
export const TABLE_B1_HEADINGS = [
  'Building height by number of floors',
  'Setback from neighbour (X) (see Figure B.8) (m)',
  'Setback from road (see Figure B.9) (m)',
] as const;

/**
 * The citation both Table B.1 rules carry.
 *
 * `sourceTextVerbatim` is the page's own words — ¶1, ¶2 and ¶3 of B.4.2.3, then
 * the table as cells, one `Table B.1 [a | b | c]` per printed row — with ` … `
 * marking each place text was left out. ¶1 is in it because it is the condition
 * the table applies under: the affection plan or DCR takes precedence, which
 * `resolveParameter` gives by §11.5 step 1 when the plot's sheet is on file.
 *
 * `sourceBbox` is PDF user space, origin bottom-left, measured off the text
 * layer: from the table's caption (y 196.8) to the top of ¶1 (y 455.4), across
 * the left column (x 56.7–411.8). It covers the setback paragraphs and the
 * table, and not Figures B.8–B.9 beside them.
 */
export const TABLE_B1: {
  readonly instrumentId: string;
  readonly instrumentVersion: string;
  readonly clauseReference: string;
  readonly documentUri: string;
  readonly sourcePage: number;
  readonly sourceBbox: readonly [number, number, number, number];
  readonly sourceTextVerbatim: string;
} = {
  instrumentId: 'DUBAI_BUILDING_CODE',
  instrumentVersion: '2021',
  clauseReference: 'B.4.2.3 ¶1–¶3, Table B.1 — Setback calculation table',
  documentUri: DBC_PDF,
  sourcePage: 41,
  sourceBbox: [56.7, 196.8, 411.8, 455.4],
  sourceTextVerbatim: [
    'The building setback requirements in the affection plan or DCR shall take precedence ' +
      'over the setback requirements in this section.',
    'When setback limitations for the plot or development are not defined, setbacks shall ' +
      'be calculated from the plot limit to the face of buildings in accordance with Table B.1.',
    `Table B.1 [${TABLE_B1_HEADINGS.join(' | ')}]`,
    ...TABLE_B1_PRINTED.map((r) => `Table B.1 [${r.printed} | ${r.neighbourM} | ${r.roadM}]`),
    'Setbacks shall be calculated from ground floor and above.',
  ].join(' … '),
};

/**
 * One of Table B.1's two columns as a lookup on `levels.above_ground`.
 *
 * Rows are first-match-wins, so the tallest row comes first and each row's
 * lower bound is its first floor. The basement row has no floor range and is
 * not a row of the lookup; a count of zero floors above ground matches nothing
 * and the rule does not apply, rather than borrowing the ground row.
 */
function tableB1Column(tableId: string, column: 'neighbourM' | 'roadM') {
  return {
    tableId,
    rows: TABLE_B1_PRINTED.flatMap((r) =>
      r.floors === null ? [] : [{ when: {}, whenAtLeast: { 'levels.above_ground': r.floors.from }, value: r[column] }],
    ).reverse(),
  };
}

/** Setback from neighbour (X) — the column the fixpoint straddles. */
const T_DBC_B1_NEIGHBOUR = tableB1Column('T-DBC-B1-NEIGHBOUR', 'neighbourM');
/** Setback from road — 0 m on every printed row. Built from the page all the same. */
const T_DBC_B1_ROAD = tableB1Column('T-DBC-B1-ROAD', 'roadM');

/**
 * A setback the code does not print, marked as such.
 *
 * Table B.1 has two columns, neighbour and road. A boundary to public open space
 * and an unclassified boundary are neither, and their 3.00 m used to be cited to
 * Table B.1 as well. They stay — a deleted rule would halt every plot with such an
 * edge — but under a clause that says they are not the code's.
 */
const NOT_IN_TABLE_B1 = 'Not DBC Table B.1 — that table prints neighbour and road columns only';

/** The clause `R-FLOOR-TO-FLOOR-RES` carries: it is not a figure the code prints. */
export const NOT_A_DBC_STOREY_HEIGHT =
  'Not DBC Part B — the code prints minimum clear heights (Table B.4), not a floor-to-floor';

// ---------------------------------------------------------------------------
// DBC 2021 B.5.3, Table B.4 — minimum clear heights
// ---------------------------------------------------------------------------

/**
 * Table B.4's parking row, p59: "Parking – for light vehicles 2.3".
 *
 * Exported because the building model says, under every drawing, what a parking
 * storey leaves once this is taken off it; the figure exists here once and the
 * record and the sentence both read it.
 */
export const PARKING_CLEAR_HEIGHT_M = '2.3';

/** Table B.4's residential row, p58: "Living and bedroom spaces 2.7". */
export const LIVING_CLEAR_HEIGHT_M = '2.7';

/**
 * The parking row of Table B.4, p59. The table runs across p58–59 and B.5.3's two
 * paragraphs — "shall be not less than", measured "from FFL to any structural
 * suspended element or ceiling soffits" — are printed on p58, so they are quoted
 * in `TABLE_B4_LIVING` and not here: a citation holds only what its page prints.
 *
 * `sourceBbox` is PDF user space, origin bottom-left, off the text layer: from the
 * Parking row (y 397.5) to the continued table's header (y 465.1), across the
 * occupancy, use and clear-height columns (x 61.1–387.0).
 */
export const TABLE_B4_PARKING: {
  readonly instrumentId: string;
  readonly instrumentVersion: string;
  readonly clauseReference: string;
  readonly documentUri: string;
  readonly sourcePage: number;
  readonly sourceBbox: readonly [number, number, number, number];
  readonly sourceTextVerbatim: string;
} = {
  instrumentId: 'DUBAI_BUILDING_CODE',
  instrumentVersion: '2021',
  clauseReference: 'B.5.3, Table B.4 — Minimum clear heights (Common areas: Parking – for light vehicles)',
  documentUri: DBC_PDF,
  sourcePage: 59,
  sourceBbox: [61.1, 397.5, 387.0, 465.1],
  sourceTextVerbatim: `Table B.4 [Common areas | Parking – for light vehicles | ${PARKING_CLEAR_HEIGHT_M}]`,
};

/**
 * B.5.3 and the residential row of Table B.4, p58. `sourceBbox` runs from the
 * table's caption (y 186.7) to the B.5.3 heading (y 470.6) in the right-hand
 * column (x 430.9–752.1).
 */
export const TABLE_B4_LIVING: typeof TABLE_B4_PARKING = {
  instrumentId: 'DUBAI_BUILDING_CODE',
  instrumentVersion: '2021',
  clauseReference: 'B.5.3, Table B.4 — Minimum clear heights (Residential: Living and bedroom spaces)',
  documentUri: DBC_PDF,
  sourcePage: 58,
  sourceBbox: [430.9, 186.7, 752.1, 470.6],
  sourceTextVerbatim: [
    'The clear height of a space shall be not less than the minimum values given in Table B.4.',
    'The clear heights shall be calculated from FFL to any structural suspended element or ceiling ' +
      'soffits, as shown in Figure B.25.',
    `Table B.4 [Residential, hotel | Living and bedroom spaces | ${LIVING_CLEAR_HEIGHT_M}]`,
  ].join(' … '),
};

// ---------------------------------------------------------------------------
// UAE Fire and Life Safety Code of Practice — Chapter 3, Table 3.6A
// ---------------------------------------------------------------------------

/**
 * THE CODE ON FILE IS THE 2011 EDITION, AND IT IS THE ONE CITED.
 *
 * `docs/00-source/regulations/UAEFIRECODE_ENG.pdf` says "Copyright © 2011" on
 * every page. The travel-distance record used to hold 45 m under "UAE FLS Code,
 * Chapter 2" with no page: 45 m is the column WITHOUT sprinkler protection,
 * means of egress is Chapter 3, and §6.3.1 (PDF p168) has every high-rise
 * building sprinklered — so the figure a residential tower would meet is 61 m.
 * A later edition exists and is not on file; when it is, these records are
 * re-transcribed from it rather than edited.
 *
 * Both columns of each row are transcribed, keyed on `building.sprinklered`.
 * Nothing in the engine states whether a building is sprinklered, so neither is
 * chosen for it: a run that does not say gets no value from these records, and
 * they still reach the deferred-check list, which is decided by applicability
 * alone. They are EVALUATIVE_ONLY: a travel distance is measured on a floor plan,
 * and this phase draws none. Declared, never checked, never claimed met.
 */
const FLSC = {
  instrumentId: 'UAE_FLSC',
  instrumentVersion: '2011',
  documentUri: 'docs/00-source/regulations/UAEFIRECODE_ENG.pdf',
} as const;

/** Table 3.6A's column heads, as printed above every page of the table. */
const TABLE_3_6A_HEADS =
  'Table 3.6A [OCCUPANCY | OCCUPANT LOAD (M2 PER PERSON) | WITH SPRINKLER PROTECTION: DEAD END ' +
  '(MAXIMUM) | COMMON PATH (MAXIMUM) | TRAVEL DISTANCE (MAXIMUM) | WITHOUT SPRINKLER PROTECTION: ' +
  'DEAD END (MAXIMUM) | COMMON PATH (MAXIMUM) | TRAVEL DISTANCE (MAXIMUM) | EXIT DISCHARGE CAPACITIES]';

interface EgressRow {
  /** The occupancy, as the table prints it. */
  readonly printed: string;
  /** What the record's id and parameter call it. */
  readonly key: 'APARTMENT' | 'PARKING';
  readonly page: number;
  readonly bbox: readonly [number, number, number, number];
  /** [sprinklered, unsprinklered], each as printed in metres. */
  readonly deadEnd: readonly [string, string];
  readonly commonPath: readonly [string, string];
  readonly travel: readonly [string, string];
  /** The row's other cells, verbatim, for the citation. */
  readonly cells: string;
}

/*
  Read off the text layer by x-coordinate against the column heads (x 205.8,
  275.9, 345.9 / 327.9 sprinklered; 415.9, 486.0, 556.1 / 538.1 unsprinklered),
  and checked against the page render. The boxes run from the row up to the
  column heads (PDF user space, origin bottom-left).
*/
const EGRESS_ROWS: readonly EgressRow[] = [
  {
    printed: 'Apartment Buildings',
    key: 'APARTMENT',
    page: 182,
    bbox: [31.9, 220.4, 760.0, 509.3],
    deadEnd: ['15', '10.7'],
    commonPath: ['38', '23'],
    travel: ['61', '45'],
    cells: 'Apartment Buildings | 18.6 | 15m | 38m | 61m | 10.7m | 23m | 45m | 7.6 | 5 | 5',
  },
  {
    printed: 'Enclosed Parking Structures',
    key: 'PARKING',
    page: 183,
    bbox: [31.9, 95.5, 760.0, 509.3],
    deadEnd: ['15', '15'],
    commonPath: ['15', '15'],
    travel: ['60', '45'],
    cells: 'Enclosed Parking Structures | 27.9 | 15m | 15m | 60m | 15m | 15m | 45 | 7.6 | 5 | 5',
  },
];

const EGRESS_MEASURES = [
  { measure: 'travel', id: 'TRAVEL-DISTANCE', parameter: 'travel_distance', words: 'travel distance to an exit' },
  { measure: 'commonPath', id: 'COMMON-PATH', parameter: 'common_path', words: 'common path of travel' },
  { measure: 'deadEnd', id: 'DEAD-END', parameter: 'dead_end', words: 'dead-end corridor' },
] as const;

/**
 * One EVALUATIVE_ONLY record per row and measure. The apartment travel distance
 * keeps the id it always had, `R-EGRESS-TRAVEL-DISTANCE`, and its parameter, so
 * every list that already named it still does.
 */
function egressRecords(): readonly RuleRecord[] {
  return EGRESS_ROWS.flatMap((row) =>
    EGRESS_MEASURES.map((m) => {
      const [withSprinklers, without] = row[m.measure];
      const ruleId =
        row.key === 'APARTMENT' ? `R-EGRESS-${m.id}` : `R-EGRESS-${row.key}-${m.id}`;
      const parameterId =
        row.key === 'APARTMENT' ? `egress.${m.parameter}.max` : `egress.parking.${m.parameter}.max`;
      return draft({
        ruleId,
        parameterId,
        ruleClass: RuleClass.EVALUATIVE_ONLY,
        operator: Operator.MAX,
        evaluator: EvaluatorName.CONDITIONAL_SCALAR,
        evaluatorArgs: {
          cases: [
            { path: 'building.sprinklered', eq: true, value: withSprinklers },
            { path: 'building.sprinklered', eq: false, value: without },
          ],
        },
        unit: 'm',
        applicability: { all: [RESIDENTIAL] },
        citation: {
          ...FLSC,
          clauseReference: `Chapter 3, §11.8, Table 3.6A — ${row.printed}, maximum ${m.words}`,
          sourcePage: row.page,
          sourceBbox: row.bbox,
          sourceTextVerbatim: [
            '11.8 - Table 3.6A: Requirements for Arrangement of Means of Egress',
            TABLE_3_6A_HEADS,
            `Table 3.6A [${row.cells}]`,
          ].join(' … '),
        },
        jurisdiction: 'UAE_FLS',
        isLifeSafety: true,
        mechanization: Mechanization.MECHANIZED,
        validFrom: '2011-01-01',
        validTo: null,
        tests: [
          {
            kind: 'POSITIVE',
            context: { land_use: 'RESIDENTIAL_MULTI', building: { sprinklered: true } },
            expected: Number(withSprinklers),
            note: `${row.printed}, with sprinkler protection, as printed on p${row.page}.`,
          },
          {
            kind: 'BOUNDARY',
            context: { land_use: 'RESIDENTIAL_MULTI', building: { sprinklered: false } },
            expected: Number(without),
            note: 'The column without sprinkler protection. The figure this record used to hold for travel.',
          },
          { kind: 'NEGATIVE', context: { land_use: 'INDUSTRIAL', building: { sprinklered: true } }, expected: 'NOT_APPLICABLE' },
        ],
        note:
          'EVALUATIVE_ONLY: topological, no constructive inverse (§11.3). It can only ' +
          'reject a floor plan, and this phase draws none, so it is declared and never ' +
          'applied. Whether the building is sprinklered is not stated by any input; ' +
          'FLSC 2011 Ch.3 §6.3.1 (PDF p168) sprinklers every high-rise building.',
      });
    }),
  );
}

// ---------------------------------------------------------------------------
// DBC 2021 B.4.2.2 — how tall
// ---------------------------------------------------------------------------

/**
 * B.4.2.2 ¶1, ¶6 and ¶7, p40 (¶1 is the last line of p39's column; the box is p40's).
 *
 * WHY THIS REPLACED A NUMBER. The seed's height ceiling was 45.00 m cited to
 * "DCR, plot schedule", a placeholder, and it governed every plot whose sheet
 * stated no floor count — 14 levels at 3.20 m, shown DERIVED. The code states no
 * such figure. It says heights follow the DCR and the affection plan (¶1), and
 * that the total allowable height is the floors THEY allow × 6 m (¶6), the
 * ground floor counted (¶7: G+10 → 11 × 6 = 66 m). So the ceiling is computed
 * from the count, and with no count there is no ceiling to compute: the rule
 * does not apply, nothing governs `height.max`, and the envelope refuses the run
 * in a sentence instead of inventing a height.
 *
 * `sourceBbox` covers ¶6 and ¶7 in the left column (text layer, origin
 * bottom-left: x 56.7–413.5, y 383.8–471.3).
 */
export const DBC_B422: {
  readonly instrumentId: string;
  readonly instrumentVersion: string;
  readonly clauseReference: string;
  readonly documentUri: string;
  readonly sourcePage: number;
  readonly sourceBbox: readonly [number, number, number, number];
  readonly sourceTextVerbatim: string;
} = {
  instrumentId: 'DUBAI_BUILDING_CODE',
  instrumentVersion: '2021',
  clauseReference: 'B.4.2.2 ¶6–¶7 — Building height',
  documentUri: DBC_PDF,
  sourcePage: 40,
  sourceBbox: [56.7, 383.8, 413.5, 471.3],
  sourceTextVerbatim: [
    'To calculate the total allowable building height, the allowable number of floors, ' +
      'as defined by the affection plan or DCR, shall be multiplied by 6 m per floor. ' +
      'This does not impose restrictions on single floor heights.',
    'Example: For a building with G+10 floors limit, the maximum allowable height shall be ' +
      'calculated as 11 (the number of floors) × 6 m (the factor) = 66 m maximum building height.',
  ].join(' … '),
};

/** The custom evaluator B.4.2.2 ¶6 needs: a count from the context × a stated factor. */
export const DBC_B422_HEIGHT_FN = 'dbc_b422_floors_times_metres';

/*
  A CUSTOM FUNCTION, BECAUSE NONE OF THE ELEVEN CAN MULTIPLY A COUNT. §11.4
  caps the registry at twelve and the twelfth is this escape hatch, registered by
  name and reviewed like any rule. The record stays data: the factor and the
  path are its arguments, and the code below only multiplies them.

  A count that is not a whole number of at least one floor is not a count the
  plan stated, and the rule does not apply rather than guess.
*/
registerCustomFunction(DBC_B422_HEIGHT_FN, (rule, ctx) => {
  const floors = readPath(ctx, String(rule.evaluatorArgs['floorsPath']));
  if (typeof floors !== 'number' || !Number.isInteger(floors) || floors < 1) return NOT_APPLICABLE;
  return { kind: 'scalar', value: new Decimal(String(rule.evaluatorArgs['metresPerFloor'])).times(floors) };
});

/**
 * Whether a height rule's value is the stated floor count × a factor.
 *
 * Such a rule is not a rival to the count — it is the count, in metres — so the
 * envelope must not set it aside as a generic ceiling the plan supersedes (which
 * is right for a figure like the old 45 m and wrong for this one).
 */
export function heightFromStatedFloors(rule: RuleRecord): boolean {
  return rule.evaluator === EvaluatorName.CUSTOM_FN && rule.evaluatorArgs['fn'] === DBC_B422_HEIGHT_FN;
}

/** Where the envelope puts the stated floor count for that rule to read. */
export const STATED_FLOORS_PATH = 'levels.max_above_ground';

export const SEED_RULES: readonly RuleRecord[] = [
  draft({
    ruleId: 'R-DBC-B1-ROAD',
    parameterId: 'setback.road',
    ruleClass: RuleClass.GENERATIVE,
    operator: Operator.MIN,
    evaluator: EvaluatorName.POLYGON_OFFSET_INWARD,
    evaluatorArgs: { key: ['levels.above_ground'], table: T_DBC_B1_ROAD },
    unit: 'm',
    applicability: { all: [RESIDENTIAL, { 'edge.classification': { eq: 'ROAD' } }] },
    citation: TABLE_B1,
    jurisdiction: 'DM_MAINLAND',
    isLifeSafety: false,
    mechanization: Mechanization.MECHANIZED,
    validFrom: '2021-01-01',
    validTo: null,
    tests: [
      {
        kind: 'POSITIVE',
        context: { land_use: 'RESIDENTIAL_MULTI', edge: { classification: 'ROAD', road_hierarchy: 'ARTERIAL' }, levels: { above_ground: 12 } },
        expected: 0,
        note: 'Table B.1 prints 0 facing a road at every height, whatever the road.',
      },
      {
        kind: 'BOUNDARY',
        context: { land_use: 'RESIDENTIAL_MULTI', edge: { classification: 'ROAD' }, levels: { above_ground: 1 } },
        expected: 0,
        note: 'The ground row. A road hierarchy the table does not print must not tier it.',
      },
      {
        kind: 'NEGATIVE',
        context: { land_use: 'INDUSTRIAL', edge: { classification: 'ROAD' }, levels: { above_ground: 12 } },
        expected: 'NOT_APPLICABLE',
      },
    ],
    note:
      'Replaces R-SETBACK-ROAD-RES, which cited Table B.1 for 9.00 / 6.00 / 4.50 / 3.00 m by ' +
      'road hierarchy. The table prints no hierarchy and 0 m on every row. Where the ' +
      'affection plan or DCR states a road setback, it governs (B.4.2.3 ¶1).',
  }),

  draft({
    ruleId: 'R-DBC-B1-NEIGHBOUR',
    parameterId: 'setback.adjacent_plot',
    ruleClass: RuleClass.GENERATIVE,
    operator: Operator.MIN,
    evaluator: EvaluatorName.POLYGON_OFFSET_INWARD,
    evaluatorArgs: { key: ['levels.above_ground'], table: T_DBC_B1_NEIGHBOUR },
    unit: 'm',
    applicability: { all: [RESIDENTIAL, { 'edge.classification': { eq: 'ADJACENT_PLOT' } }] },
    citation: TABLE_B1,
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
        note: 'G+11, inside "G+10 and above".',
      },
      {
        kind: 'BOUNDARY',
        context: { land_use: 'RESIDENTIAL_MULTI', edge: { classification: 'ADJACENT_PLOT' }, levels: { above_ground: 9 } },
        expected: 6.75,
        note: 'G+8 — nine floors with the ground floor counted. The old table gave 6.00 here.',
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
      'stated scope). FR-PLT-002 does not describe an iteration; see open-questions.md. ' +
      'The key is the whole building’s floor count, ground floor included; whether a ' +
      'tower on a podium takes the row for its total count is a question for the client.',
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
    citation: draftCitation(NOT_IN_TABLE_B1, 'setback to public open space — a placeholder, not a figure the code prints'),
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
    citation: draftCitation(NOT_IN_TABLE_B1, 'unclassified boundary — a placeholder, not a figure the code prints'),
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
    ruleId: 'R-DBC-B422-HEIGHT',
    parameterId: 'height.max',
    ruleClass: RuleClass.GENERATIVE,
    operator: Operator.MAX,
    evaluator: EvaluatorName.CUSTOM_FN,
    evaluatorArgs: { fn: DBC_B422_HEIGHT_FN, floorsPath: STATED_FLOORS_PATH, metresPerFloor: '6' },
    unit: 'm',
    applicability: { all: [RESIDENTIAL] },
    citation: DBC_B422,
    jurisdiction: 'DM_MAINLAND',
    isLifeSafety: false,
    mechanization: Mechanization.MECHANIZED,
    validFrom: '2021-01-01',
    validTo: null,
    tests: [
      {
        kind: 'POSITIVE',
        context: { land_use: 'RESIDENTIAL_MULTI', levels: { max_above_ground: 11 } },
        expected: 66,
        note: 'B.4.2.2 ¶7’s own example: G+10 is 11 floors × 6 m = 66 m.',
      },
      {
        kind: 'BOUNDARY',
        context: { land_use: 'RESIDENTIAL_MULTI', levels: { max_above_ground: 1 } },
        expected: 6,
        note: 'A ground floor alone.',
      },
      {
        kind: 'NEGATIVE',
        context: { land_use: 'RESIDENTIAL_MULTI', levels: { above_ground: 14 } },
        expected: 'NOT_APPLICABLE',
        note: 'No floor count stated: there is no height to compute, and none is invented.',
      },
    ],
    note:
      'B.4.2.2 ¶1: heights follow the DCR and affection plan; ¶6: floors × 6 m. The ' +
      'affection plan’s own floor count still governs the level count; this is its height.',
  }),

  /*
    THE 45 m, KEPT ONLY WHERE NOTHING STATES A FLOOR COUNT, AND NO LONGER PASSED
    OFF AS A RULE'S FIGURE. It governed every plot without a sheet, cited to "DCR,
    plot schedule" and shown DERIVED. The code prints no such height: B.4.2.2 ¶1
    leaves height to the affection plan or DCR, and a plot with neither has none.
    Refusing those runs outright is what the code implies, and it would also
    refuse every study begun before the sheet is to hand — which CLAUDE.md keeps
    open on purpose ("Step 0 … is not gated"). That choice is the client's. Until
    he makes it, the figure applies only when no count is stated, its citation
    says it is not the code's, and the envelope shows the ceiling it gives as
    ASSUMED, amber, with that basis (see `envelope.ts`). Delete this record and
    the envelope refuses the run in a sentence instead.
  */
  draft({
    ruleId: 'R-HEIGHT-MAX-RES',
    parameterId: 'height.max',
    ruleClass: RuleClass.GENERATIVE,
    operator: Operator.MAX,
    evaluator: EvaluatorName.SCALAR_MAX,
    evaluatorArgs: { value: '45.00' },
    unit: 'm',
    applicability: { all: [RESIDENTIAL, { [STATED_FLOORS_PATH]: { exists: false } }] },
    citation: draftCitation(
      'Not DBC B.4.2.2 — no floor count stated',
      'a placeholder height for a plot whose affection plan or DCR states no floor count; ' +
        'B.4.2.2 ¶1 leaves height to those instruments and prints no figure of its own',
    ),
    jurisdiction: 'DM_MAINLAND',
    isLifeSafety: false,
    mechanization: Mechanization.MECHANIZED,
    validFrom: '2021-01-01',
    validTo: null,
    tests: [
      { kind: 'POSITIVE', context: { land_use: 'RESIDENTIAL_MULTI' }, expected: 45 },
      {
        kind: 'BOUNDARY',
        context: { land_use: 'RESIDENTIAL_MULTI', levels: { above_ground: 99 } },
        expected: 45,
        note: 'A solver level count is not a stated floor count.',
      },
      {
        kind: 'NEGATIVE',
        context: { land_use: 'RESIDENTIAL_MULTI', levels: { max_above_ground: 11 } },
        expected: 'NOT_APPLICABLE',
        note: 'A stated count is answered by B.4.2.2 ¶6, never by this figure.',
      },
    ],
  }),

  /*
    3.20 m WAS CITED TO "Part B", AND PART B PRINTS NO FLOOR-TO-FLOOR. B.5.3 and
    Table B.4 (p58–59) state minimum CLEAR heights — 2.7 m for living and bedroom
    spaces, 2.3 m for light-vehicle parking — measured from finished floor to the
    soffit, and a storey is that plus a slab, beams and services nobody here has
    sized. So the figure stays, because every storey of every run stands on it,
    under a clause that says what it is: a placeholder storey height, the same on
    every level, basements and ground floor included. The clear heights the code
    does print are their own records below (`R-DBC-B53-*`). STILL OPEN:
    `envelope.ts` traces `envelope.floor_to_floor_m` as DERIVED through this
    record, so on screen it is not amber although no instrument prints it. It
    should be `assumed()` with this clause as its basis; that change cascades
    into the height ceiling and the level cap and belongs to the envelope, not
    to this record. Until it lands, the note under every drawing says the
    figure is a placeholder. The client's own storey heights are an open question.
  */
  draft({
    ruleId: 'R-FLOOR-TO-FLOOR-RES',
    parameterId: 'floor_to_floor',
    ruleClass: RuleClass.FILTERING,
    operator: Operator.MIN,
    evaluator: EvaluatorName.SCALAR_MIN,
    evaluatorArgs: { value: '3.20' },
    unit: 'm',
    applicability: { all: [RESIDENTIAL] },
    citation: draftCitation(
      NOT_A_DBC_STOREY_HEIGHT,
      'a placeholder floor-to-floor height, used for every level; the code states minimum clear ' +
        'heights (B.5.3, Table B.4), not a floor-to-floor',
    ),
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
    // Table B.13's residential rows, as printed. 2BED was 1.50 here as a
    // placeholder and the code says 1; duplex and penthouse take 3 whatever
    // their bedroom count, which is why they are types and not bedroom counts.
    evaluatorArgs: {
      ratios: {
        STUDIO: '1',
        '1BED': '1',
        '2BED': '1',
        '3BED': '2',
        '4BED': '2',
        '5BED': '3',
        DUPLEX: '3',
        PENTHOUSE: '3',
      },
      mixPath: 'unit.mix',
    },
    unit: 'bays',
    applicability: { all: [RESIDENTIAL] },
    citation: TABLE_B13,
    jurisdiction: 'DM_MAINLAND',
    isLifeSafety: false,
    mechanization: Mechanization.MECHANIZED,
    validFrom: '2021-01-01',
    validTo: null,
    tests: [
      {
        kind: 'POSITIVE',
        context: {
          land_use: 'RESIDENTIAL_MULTI',
          unit: { mix: [{ typeId: '2BED', count: 10 }, { typeId: '3BED', count: 2 }, { typeId: 'PENTHOUSE', count: 1 }] },
        },
        expected: 17,
        note: '10 × 1 + 2 × 2 + 1 × 3, Table B.13. The placeholder gave a 2BED 1.5 bays.',
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
    // Table B.13 prints no visitor allowance on any residential row (the
    // University row is the only one in the table that adds visitors). This was
    // 0.15 as a placeholder, which added 15% to every run's demand on no
    // authority. It is 0 *under the table* rather than deleted, because a deleted
    // rule falls through to "no visitor rule applies", amber, and the table does
    // apply — it is a rule that says none. A DCR that asks for visitors outranks it.
    evaluatorArgs: { value: '0' },
    unit: 'ratio',
    applicability: { all: [RESIDENTIAL] },
    citation: TABLE_B13,
    jurisdiction: 'DM_MAINLAND',
    isLifeSafety: false,
    mechanization: Mechanization.MECHANIZED,
    validFrom: '2021-01-01',
    validTo: null,
    tests: [
      { kind: 'POSITIVE', context: { land_use: 'RESIDENTIAL_MULTI' }, expected: 0 },
      { kind: 'BOUNDARY', context: { land_use: 'RESIDENTIAL_MULTI', unit: { mix: [] } }, expected: 0 },
      { kind: 'NEGATIVE', context: { land_use: 'COMMERCIAL' }, expected: 'NOT_APPLICABLE' },
    ],
  }),

  // --- Rules that are applicable and deliberately not mechanized -----------
  //
  // PRD §3.4 item 8 requires the deferred-check list in every output. These are
  // what populate it. Declaring them is the difference between "we did not check
  // this" being a published fact and being an omission.

  ...egressRecords(),

  /*
    THE CLEAR HEIGHTS THE CODE PRINTS, DECLARED AND NOT CHECKED. A clear height
    is floor to soffit, and the engine computes no slab, beam or services depth
    (`notModelled` says so under every drawing), so there is nothing to measure
    one against: EVALUATIVE_ONLY, in the deferred-check list of every run. The
    building model states the parking one beside the storey it stands in, as a
    budget, without calling it met.
  */
  draft({
    ruleId: 'R-DBC-B53-PARKING-CLEAR-HEIGHT',
    parameterId: 'parking.clear_height.min',
    ruleClass: RuleClass.EVALUATIVE_ONLY,
    operator: Operator.MIN,
    evaluator: EvaluatorName.SCALAR_MIN,
    evaluatorArgs: { value: PARKING_CLEAR_HEIGHT_M },
    unit: 'm',
    applicability: { all: [RESIDENTIAL] },
    citation: TABLE_B4_PARKING,
    jurisdiction: 'DM_MAINLAND',
    isLifeSafety: false,
    mechanization: Mechanization.MECHANIZED,
    validFrom: '2021-01-01',
    validTo: null,
    tests: [
      { kind: 'POSITIVE', context: { land_use: 'RESIDENTIAL_MULTI' }, expected: 2.3, note: 'Table B.4, p59.' },
      {
        kind: 'BOUNDARY',
        context: { land_use: 'RESIDENTIAL_MULTI', levels: { above_ground: 1 } },
        expected: 2.3,
        note: 'The same at every level: it is a clear height, not a storey height.',
      },
      { kind: 'NEGATIVE', context: { land_use: 'INDUSTRIAL' }, expected: 'NOT_APPLICABLE' },
    ],
    note:
      'B.7.2.3.1: "Parking areas clear height shall conform to B.5.3." Table B.9 asks ' +
      '2.4 m over a ramp, which `ramp-rules.ts` already carries.',
  }),

  draft({
    ruleId: 'R-DBC-B53-LIVING-CLEAR-HEIGHT',
    parameterId: 'residential.clear_height.min',
    ruleClass: RuleClass.EVALUATIVE_ONLY,
    operator: Operator.MIN,
    evaluator: EvaluatorName.SCALAR_MIN,
    evaluatorArgs: { value: LIVING_CLEAR_HEIGHT_M },
    unit: 'm',
    applicability: { all: [RESIDENTIAL] },
    citation: TABLE_B4_LIVING,
    jurisdiction: 'DM_MAINLAND',
    isLifeSafety: false,
    mechanization: Mechanization.MECHANIZED,
    validFrom: '2021-01-01',
    validTo: null,
    tests: [
      { kind: 'POSITIVE', context: { land_use: 'RESIDENTIAL_MULTI' }, expected: 2.7, note: 'Table B.4, p58.' },
      { kind: 'BOUNDARY', context: { land_use: 'RESIDENTIAL_MULTI', levels: { above_ground: 40 } }, expected: 2.7 },
      { kind: 'NEGATIVE', context: { land_use: 'COMMERCIAL' }, expected: 'NOT_APPLICABLE' },
    ],
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
