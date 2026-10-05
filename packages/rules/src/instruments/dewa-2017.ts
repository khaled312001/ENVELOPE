/**
 * DEWA, *Regulations for Electrical Installations*, 2017 edition — Section 11.
 *
 * ===========================================================================
 * THE FIRST REAL CITATION IN THIS REPOSITORY.
 *
 * Every other rule record here is a `draft()` carrying `draftCitation()`, whose
 * `instrumentId` is literally `PLACEHOLDER-NOT-A-REAL-INSTRUMENT` and whose
 * verbatim text begins `[NOT SOURCED]`. That was honest and it was also the
 * whole of the problem: a `DERIVED` value is supposed to reach a cited
 * regulatory instrument, and until now there was no instrument at the end of
 * any chain.
 *
 * These records are different. The client sent the PDF on 5 Oct 2026 and every
 * figure below was read out of it with its page and its bounding box, so the
 * transcription can be CHECKED rather than trusted — the same discipline
 * `standards/azizi.ts` is held to, and for the same reason.
 *
 * ===========================================================================
 * THE TRANSCRIPTION TRAP, WHICH IS REAL IN THIS DOCUMENT AND NOT HYPOTHETICAL.
 *
 * The tables in Section 11.4 are drawn in Illustrator and their content stream
 * does NOT run in reading order. Extracting page 76 as text gives the four
 * descriptions of the single-room table in the order [4-and-above, 2×, extra,
 * 1×] and its four areas in the order [10, 25, 55, 33]. A naive reader pairing
 * them off in sequence gets two of the four rows wrong.
 *
 * The transformer-room table on the same page is worse, because the error it
 * produces is plausible: the "extra space for every additional transformer" row
 * sits BETWEEN the 1× and 2× rows vertically, so a stream-order read pairs
 * 2×1000/1500 KVA with **21 m²** instead of 42 — a substation half the size it
 * must be, on a number nobody would question.
 *
 * So every pairing below was resolved by the y-coordinate of the text, and each
 * one carries that coordinate in its bounding box. Eng. Mohamed independently
 * stated 33 m² and 55 m² from memory in the 4 Oct meeting (59:29), which is a
 * corroboration rather than a source, and it agrees.
 *
 * ===========================================================================
 * WHY THESE ARE `DRAFT` DESPITE BEING REAL.
 *
 * `ApprovalStatus.APPROVED` means a named, licensed person reviewed the record
 * and put their name on it. Nobody has. The citation being genuine changes the
 * quality of the transcription, not the fact of the review — and the readiness
 * page counts approved rules, which must stay at zero until that is untrue.
 * Promoting these would make the one honest number on `/readiness` dishonest.
 */

import {
  ApprovalStatus,
  EvaluatorName,
  Mechanization,
  Operator,
  RuleClass,
  type RuleRecord,
} from '../record.js';

/* ==========================================================================
 * THE INSTRUMENT
 * ======================================================================= */

/**
 * The document itself. One object so that a version bump is one edit rather
 * than fourteen, and so that no record can cite a different edition of the same
 * regulation by typo.
 */
export const DEWA_2017 = {
  instrumentId: 'DEWA-REG-ELEC-2017',
  instrumentVersion: '2017',
  /*
    A `urn:` rather than a path on somebody's disk. The file the client sent is
    20 MB and is not in the repository — `docs/00-source` holds large binaries
    and git does not — so a `file://` here would resolve on exactly one machine
    and be a dead link everywhere else, including in an exported report.
  */
  documentUri: 'urn:envelope:instrument:dewa-regulations-electrical-2017',
  title: 'DEWA Regulations for Electrical Installations, 2017 Edition',
  /** In force from the edition's own date. Superseded editions exist; see note. */
  validFrom: '2017-01-01',
} as const;

/**
 * A citation into the 2017 edition.
 *
 * `page` is the PDF's own page number as a reader sees it in a viewer (1-based),
 * NOT the printed folio, which runs 2 lower throughout this document. The
 * difference is exactly the kind of thing that makes a citation unfollowable, so
 * it is stated here once rather than discovered by somebody opening the file.
 */
const cite = (
  clause: string,
  page: number,
  bbox: readonly [number, number, number, number],
  verbatim: string,
) => ({
  instrumentId: DEWA_2017.instrumentId,
  instrumentVersion: DEWA_2017.instrumentVersion,
  clauseReference: clause,
  documentUri: DEWA_2017.documentUri,
  sourcePage: page,
  sourceBbox: bbox,
  sourceTextVerbatim: verbatim,
});

const AUTHORED_BY = 'transcribed-from-instrument-2026-10-05';
const RECORDED_AT = '2026-10-05T00:00:00Z';

const record = (
  r: Omit<
    RuleRecord,
    'status' | 'authoredBy' | 'approvedBy' | 'approvedAt' | 'recordedAt' | 'version' | 'supersedes'
  >,
): RuleRecord => ({
  ...r,
  status: ApprovalStatus.DRAFT,
  authoredBy: AUTHORED_BY,
  approvedBy: null,
  approvedAt: null,
  recordedAt: RECORDED_AT,
  version: 1,
  supersedes: null,
});

/* ==========================================================================
 * §11.4.1 — SINGLE ROOM SUBSTATION, GROUND FLOOR
 *
 * RMU and transformer in one room. This is the arrangement a mid-rise
 * residential plot in Dubai normally gets, and the one Eng. Mohamed described.
 * ======================================================================= */

/**
 * Areas keyed by transformer count, m².
 *
 * THE TABLE IS NOT A FORMULA AND MUST NOT BE TURNED INTO ONE. 33 → 55 is +22,
 * and every transformer after the second is +25, so a reader who "simplifies"
 * this to `33 + 25 × (n − 1)` gets 58 for two and is wrong by 3 m² on the most
 * common case in Dubai. Four and above additionally take 10 m² for the extra
 * equipment, which no linear fit reaches at all.
 */
export const SINGLE_ROOM_SUBSTATION_M2 = {
  /** §11.4.1, 1×1000/1500 KVA, minimum width 4.57 m. */
  one: 33,
  /** §11.4.1, 2×1000/1500 KVA, minimum width 6.1 m. */
  two: 55,
  /** §11.4.1, per transformer beyond the second. */
  perAdditional: 25,
  /** §11.4.1, once, where there are four or more. */
  fourOrMoreExtra: 10,
} as const;

/** §11.4.2 / §11.4.3 — split or basement arrangement, the RMU room at ground. */
export const RMU_ROOM_M2 = {
  /** One RMU set controlling two transformers. Minimum width 3.0 m at the door. */
  oneSet: 9,
  perAdditionalSet: 7,
  /** Four or more transformers, minimum width 5 m. */
  fourOrMoreExtra: 10,
} as const;

/**
 * §11.4.2 / §11.4.3 — the transformer room, split from the RMU room.
 *
 * THIS IS THE TABLE THE STREAM ORDER GETS WRONG. Read in content-stream order
 * the rows come out 1× → 21, extra → 21, 2× → 42; a reader pairing descriptions
 * to the numbers beneath them in sequence lands 2× on 21.
 */
export const TRANSFORMER_ROOM_M2 = {
  /** 1×1000/1500 KVA, minimum width 4.57 m. */
  one: 21,
  /** 2×1000/1500 KVA, minimum width 6.1 m. */
  two: 42,
  perAdditional: 21,
} as const;

/**
 * The area of a single-room ground-floor substation for `transformers` units.
 *
 * Refuses zero and refuses a fraction rather than returning something. A plot
 * with no transformer has no substation and should not be asking; a count of
 * 1.5 is a bug upstream, and answering it would put a number nobody can defend
 * onto a drawing.
 */
export function singleRoomSubstationAreaM2(transformers: number): number {
  if (!Number.isInteger(transformers) || transformers < 1) {
    throw new Error(
      `singleRoomSubstationAreaM2: ${transformers} is not a transformer count. ` +
        `DEWA §11.4.1 tabulates one, two, and each additional.`,
    );
  }
  if (transformers === 1) return SINGLE_ROOM_SUBSTATION_M2.one;
  const base =
    SINGLE_ROOM_SUBSTATION_M2.two +
    SINGLE_ROOM_SUBSTATION_M2.perAdditional * (transformers - 2);
  return transformers >= 4 ? base + SINGLE_ROOM_SUBSTATION_M2.fourOrMoreExtra : base;
}

/* ==========================================================================
 * THE RECORDS
 * ======================================================================= */

export const DEWA_SUBSTATION_RULES: readonly RuleRecord[] = [
  /* ---------------------------------------------------------------------
     THE AREA. A FILTERING rule rather than a GENERATIVE one, and the
     distinction is not pedantry: this does not build the envelope, it
     consumes ground-floor area that the envelope already has. A GENERATIVE
     reading would let a substation cut the plot's capacity, which is a
     different claim than the regulation makes.
     ------------------------------------------------------------------ */
  record({
    ruleId: 'R-DEWA-11.4.1-SUBSTATION-AREA',
    parameterId: 'plant.substation.area_m2',
    ruleClass: RuleClass.FILTERING,
    operator: Operator.MIN,
    evaluator: EvaluatorName.TABLE_LOOKUP_MIN,
    evaluatorArgs: {
      key: ['plant.substation.transformers'],
      table: [
        { when: { 'plant.substation.transformers': 1 }, value: SINGLE_ROOM_SUBSTATION_M2.one },
        { when: { 'plant.substation.transformers': 2 }, value: SINGLE_ROOM_SUBSTATION_M2.two },
        { when: { 'plant.substation.transformers': 3 }, value: 80 },
      ],
    },
    unit: 'm2',
    applicability: { all: [{ jurisdiction: { eq: 'DM_MAINLAND' } }] },
    citation: cite(
      'Section 11.4.1 — Single Room Substation (RMU & Transformer in same room Ground Floor)',
      76,
      [187.9, 296.5, 506.0, 400.7],
      'For 1x1000/1500 KVA transformer (minimum width of 4.57m) — 33 m2. ' +
        'For 2x1000/1500KVA transformers (minimum width of 6.1m) — 55 m2. ' +
        'Extra space for every additional transformer — 25 m2. ' +
        'Extra space required for four and above transformers (additional ' +
        "equipment's) — 10 m2.",
    ),
    jurisdiction: 'DM_MAINLAND',
    /*
      NOT life safety in this engine's sense. The regulation is a safety
      instrument, but this record states an AREA; the life-safety flags in it
      are the ventilation and the access, which are the two records below.
    */
    isLifeSafety: false,
    mechanization: Mechanization.MECHANIZED,
    validFrom: DEWA_2017.validFrom,
    validTo: null,
    tests: [
      {
        kind: 'POSITIVE',
        context: { jurisdiction: 'DM_MAINLAND', plant: { substation: { transformers: 1 } } },
        expected: 33,
      },
      {
        kind: 'BOUNDARY',
        context: { jurisdiction: 'DM_MAINLAND', plant: { substation: { transformers: 2 } } },
        expected: 55,
        note:
          'The row a content-stream read gets wrong, and the one the client ' +
          'quoted from memory. 33 + 25 would give 58; the table says 55.',
      },
    ],
    note:
      'Area only. DEWA §11.4.1 also fixes a minimum WIDTH — 4.57 m for one ' +
      'transformer, 6.1 m for two — which an area alone does not satisfy: a ' +
      '33 m² room 3 m wide meets this record and fails the regulation. The ' +
      'width is carried as a separate record so neither can be met alone.',
  }),

  record({
    ruleId: 'R-DEWA-11.4.1-SUBSTATION-WIDTH',
    parameterId: 'plant.substation.min_width_m',
    ruleClass: RuleClass.FILTERING,
    operator: Operator.MIN,
    evaluator: EvaluatorName.TABLE_LOOKUP_MIN,
    evaluatorArgs: {
      key: ['plant.substation.transformers'],
      table: [
        { when: { 'plant.substation.transformers': 1 }, value: 4.57 },
        { when: { 'plant.substation.transformers': 2 }, value: 6.1 },
      ],
    },
    unit: 'm',
    applicability: { all: [{ jurisdiction: { eq: 'DM_MAINLAND' } }] },
    citation: cite(
      'Section 11.4.1 — minimum width',
      76,
      [229.3, 296.5, 506.0, 347.5],
      'For  1x1000/1500 KVA transformer (minimum width of 4.57m). ' +
        'For  2x1000/1500KVA transformers (minimum width of 6.1m).',
    ),
    jurisdiction: 'DM_MAINLAND',
    isLifeSafety: false,
    mechanization: Mechanization.MECHANIZED,
    validFrom: DEWA_2017.validFrom,
    validTo: null,
    tests: [
      {
        kind: 'POSITIVE',
        context: { jurisdiction: 'DM_MAINLAND', plant: { substation: { transformers: 1 } } },
        expected: 4.57,
      },
    ],
  }),

  /* ---------------------------------------------------------------------
     §11.3.1 — ON A ROAD. THE MOST MECHANIZABLE CLAUSE IN THE SECTION.

     The engine already classifies every boundary and ranks road hierarchy —
     it is what the vehicle-access recommendation runs on — so "directly
     located on RTA/Public Road or Sikka" is a predicate over data already in
     `Plot.edges`. It is also the clause that most often moves a substation,
     because it rules out three sides of a typical plot.
     ------------------------------------------------------------------ */
  record({
    ruleId: 'R-DEWA-11.3.1-SUBSTATION-ON-ROAD',
    parameterId: 'plant.substation.edge_class',
    ruleClass: RuleClass.FILTERING,
    operator: Operator.ENUM,
    evaluator: EvaluatorName.ENUM_PERMITTED_SET,
    evaluatorArgs: { permitted: ['ROAD'] },
    unit: 'enum',
    applicability: { all: [{ jurisdiction: { eq: 'DM_MAINLAND' } }] },
    citation: cite(
      'Section 11.3.1 — Substation Location & Access',
      75,
      [78.5, 186.1, 504.1, 204.0],
      'Substation room/RMU room to be directly located on RTA/Public Road or Sikka.',
    ),
    jurisdiction: 'DM_MAINLAND',
    isLifeSafety: false,
    mechanization: Mechanization.MECHANIZED,
    validFrom: DEWA_2017.validFrom,
    validTo: null,
    tests: [
      {
        kind: 'POSITIVE',
        context: { jurisdiction: 'DM_MAINLAND', plant: { substation: { edge_class: 'ROAD' } } },
        expected: 'ROAD',
      },
      {
        kind: 'NEGATIVE',
        context: {
          jurisdiction: 'DM_MAINLAND',
          plant: { substation: { edge_class: 'ADJACENT_PLOT' } },
        },
        expected: 'REFUSED',
        note:
          'A substation against a neighbouring plot is the arrangement this ' +
          'clause exists to forbid, and it is what an area-only placement picks.',
      },
    ],
    note:
      'A SIKKA IS NOT MODELLED. §11.3.2 accepts one at 6.1 m clear width, or ' +
      '3.0 m where the room is within 12 m of the main road. `EdgeClassification` ' +
      'has no sikka member and an affection plan does not state one, so this ' +
      'record is written over ROAD alone and the sikka case is NOT ASSESSED ' +
      'rather than silently refused.',
  }),

  /* ---------------------------------------------------------------------
     §11.5.1 — TWO SIDES OF NATURAL VENTILATION.

     This is the clause behind what Eng. Mohamed said on 4 Oct (45:16):
     "يجب أن يكون هناك فتحة تهوية، فمش ممكن يكون في النص" — it cannot sit in
     the middle. He was right and this is why.

     PARTIALLY mechanized, honestly. "Two sides" is checkable against a room
     rectangle and the plot boundary; whether a given side can actually carry
     a 3.05 × 2.75 m louver door once the façade exists is not.
     ------------------------------------------------------------------ */
  record({
    ruleId: 'R-DEWA-11.5.1-SUBSTATION-VENTILATION',
    parameterId: 'plant.substation.ventilated_sides',
    ruleClass: RuleClass.FILTERING,
    operator: Operator.MIN,
    evaluator: EvaluatorName.COUNT_MINIMUM,
    evaluatorArgs: { minimum: 2 },
    unit: 'count',
    applicability: {
      all: [{ jurisdiction: { eq: 'DM_MAINLAND' } }, { 'plant.substation.level': { eq: 'GROUND' } }],
    },
    citation: cite(
      'Section 11.5.1 — Substation Ventilation for Ground Floor',
      78,
      [78.5, 120.0, 545.0, 150.0],
      'Substation at ground floor must be naturally ventilated with minimum ' +
        "two side's ventilation with aluminum louver doors and fixed aluminum louvers.",
    ),
    jurisdiction: 'DM_MAINLAND',
    /*
      LIFE SAFETY. A transformer room that cannot shed its heat is a fire, and
      `isLifeSafety` is what stops a resolution pass from relaxing a rule
      against a developer standard. This is the flag doing its job.
    */
    isLifeSafety: true,
    mechanization: Mechanization.PARTIALLY_MECHANIZED,
    validFrom: DEWA_2017.validFrom,
    validTo: null,
    tests: [
      {
        kind: 'POSITIVE',
        context: {
          jurisdiction: 'DM_MAINLAND',
          plant: { substation: { level: 'GROUND', ventilated_sides: 2 } },
        },
        expected: 2,
      },
      {
        kind: 'NEGATIVE',
        context: {
          jurisdiction: 'DM_MAINLAND',
          plant: { substation: { level: 'GROUND', ventilated_sides: 1 } },
        },
        expected: 'REFUSED',
        note: 'One external side is a room in the middle of the floor plate with a door.',
      },
    ],
  }),

  /* ---------------------------------------------------------------------
     §11.2.2 — A BASEMENT TRANSFORMER ROOM MAY ONLY BE IN THE FIRST BASEMENT.

     Worth a record of its own because the engine now defaults basements to
     zero on the client's instruction, and a scheme that later gains three
     basements must not put the transformer in the deepest one.
     ------------------------------------------------------------------ */
  record({
    ruleId: 'R-DEWA-11.2.2-TRANSFORMER-FIRST-BASEMENT',
    parameterId: 'plant.substation.basement_index',
    ruleClass: RuleClass.FILTERING,
    operator: Operator.EXACT,
    evaluator: EvaluatorName.SCALAR_MAX,
    evaluatorArgs: { value: 1 },
    unit: 'index',
    applicability: {
      all: [
        { jurisdiction: { eq: 'DM_MAINLAND' } },
        { 'plant.substation.level': { eq: 'BASEMENT' } },
      ],
    },
    citation: cite(
      'Section 11.2.2 — General Requirements for Substation Construction within Private Plot',
      75,
      [78.5, 60.0, 545.0, 78.0],
      'Basement substation should have transformer room in 1st basement only.',
    ),
    jurisdiction: 'DM_MAINLAND',
    isLifeSafety: true,
    mechanization: Mechanization.MECHANIZED,
    validFrom: DEWA_2017.validFrom,
    validTo: null,
    tests: [
      {
        kind: 'BOUNDARY',
        context: {
          jurisdiction: 'DM_MAINLAND',
          plant: { substation: { level: 'BASEMENT', basement_index: 1 } },
        },
        expected: 1,
      },
      {
        kind: 'NEGATIVE',
        context: {
          jurisdiction: 'DM_MAINLAND',
          plant: { substation: { level: 'BASEMENT', basement_index: 2 } },
        },
        expected: 'REFUSED',
      },
    ],
  }),

  /* ---------------------------------------------------------------------
     §11.2.3 — THE LV ROOM IS ADJACENT TO THE SUBSTATION.

     In his own ground-floor plan the LV ROOM is drawn hard against the
     transformer room in the same corner, which is this clause.
     ------------------------------------------------------------------ */
  record({
    ruleId: 'R-DEWA-11.2.3-LV-ROOM-ADJACENT',
    parameterId: 'plant.lv_room.adjacency',
    ruleClass: RuleClass.FILTERING,
    operator: Operator.ENUM,
    evaluator: EvaluatorName.ENUM_PERMITTED_SET,
    evaluatorArgs: { permitted: ['ADJACENT_TO_SUBSTATION'] },
    unit: 'enum',
    applicability: {
      all: [
        { jurisdiction: { eq: 'DM_MAINLAND' } },
        { 'plant.lv_room.panel_ownership': { eq: 'PRIVATE' } },
      ],
    },
    citation: cite(
      'Section 11.2.3',
      75,
      [78.5, 78.0, 545.0, 96.0],
      'LV electrical room must be adjacent to substation room/space, if main panel is private.',
    ),
    jurisdiction: 'DM_MAINLAND',
    isLifeSafety: false,
    mechanization: Mechanization.MECHANIZED,
    validFrom: DEWA_2017.validFrom,
    validTo: null,
    tests: [
      {
        kind: 'POSITIVE',
        context: {
          jurisdiction: 'DM_MAINLAND',
          plant: { lv_room: { panel_ownership: 'PRIVATE', adjacency: 'ADJACENT_TO_SUBSTATION' } },
        },
        expected: 'ADJACENT_TO_SUBSTATION',
      },
    ],
    note:
      'CONDITIONAL on the main panel being private, which no affection plan ' +
      'states. Where ownership is unknown this is NOT ASSESSED rather than ' +
      'assumed private — assuming it would place a room the regulation may not ' +
      'require.',
  }),

  /* ---------------------------------------------------------------------
     §11.2.5 — CLEAR HEIGHT. The one clause here that binds a LEVEL rather
     than a plan, and the reason a ground floor holding a substation cannot
     take the same floor-to-floor as one that does not.
     ------------------------------------------------------------------ */
  record({
    ruleId: 'R-DEWA-11.2.5-SUBSTATION-CLEAR-HEIGHT',
    parameterId: 'plant.substation.clear_height_m',
    ruleClass: RuleClass.FILTERING,
    operator: Operator.MIN,
    evaluator: EvaluatorName.SCALAR_MIN,
    evaluatorArgs: { value: 3.7 },
    unit: 'm',
    applicability: {
      all: [{ jurisdiction: { eq: 'DM_MAINLAND' } }, { 'plant.substation.level': { eq: 'GROUND' } }],
    },
    citation: cite(
      'Section 11.2.5',
      75,
      [78.5, 114.0, 545.0, 132.0],
      'Single room substation clear height should be 3.7M (minimum) at ground floor. ' +
        'RMU room should have a clear height of 3.0m (minimum) in split/basement substation.',
    ),
    jurisdiction: 'DM_MAINLAND',
    isLifeSafety: false,
    mechanization: Mechanization.MECHANIZED,
    validFrom: DEWA_2017.validFrom,
    validTo: null,
    tests: [
      {
        kind: 'BOUNDARY',
        context: {
          jurisdiction: 'DM_MAINLAND',
          plant: { substation: { level: 'GROUND', clear_height_m: 3.7 } },
        },
        expected: 3.7,
      },
      {
        kind: 'NEGATIVE',
        context: {
          jurisdiction: 'DM_MAINLAND',
          plant: { substation: { level: 'GROUND', clear_height_m: 3.0 } },
        },
        expected: 'REFUSED',
        note:
          'A 3.0 m ground-floor substation is the split/basement RMU figure ' +
          'applied to the wrong arrangement — the likeliest way to get this wrong.',
      },
    ],
  }),
] as const;

/**
 * What this instrument says that is NOT encoded, named so it is a published
 * absence rather than an omission.
 *
 * Every one of these is in Section 11 and every one would need something the
 * engine does not have. Writing them down is the difference between "we did not
 * check this" as a fact and as a gap.
 */
export const DEWA_NOT_MECHANIZED: readonly { readonly clause: string; readonly why: string }[] = [
  {
    clause: '11.3.2 — sikka width',
    why: 'No sikka in `EdgeClassification`, and an affection plan does not state one.',
  },
  {
    clause: '11.3.3 — 24-hour open-to-sky access from the plot limit',
    why: 'Needs a route from the boundary to the room across the ground floor; the engine places rooms, not routes.',
  },
  {
    clause: '11.5.3 — louver door 3.05 m × 2.75 m',
    why: 'A door is a façade element and nothing in Phase 0 models a façade.',
  },
  {
    clause: '11.6 — forced ventilation grille area for basement transformer rooms',
    why: '14.9 m² for 1000 kVA and 18.6 m² for 1500 kVA, both stated. Needs a transformer rating, which is a load calculation this engine does not do.',
  },
  {
    clause: '11.7 — transformer transport ramp, 3.0 m wide, 3.0 m clear, straight, 1:10 maximum',
    why: 'Mechanizable and NOT yet built. It is a second ramp with its own geometry, separate from the parking ramp, and it is the only clause here that would change a parking layout.',
  },
  {
    clause: '11.2.4 — no wet area above a substation',
    why: 'Needs the level above to be zoned, which Phase 0 does not do.',
  },
] as const;
