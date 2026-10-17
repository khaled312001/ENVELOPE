/**
 * Request and response contracts.
 *
 * Zod at the boundary, and only at the boundary: once a payload is parsed it
 * becomes a domain type and the rest of the system trusts the type system rather
 * than re-validating. Anything that gets past these schemas is the engine's
 * problem, and the engine refuses rather than guesses.
 *
 * Numbers arrive and leave as **strings**. `JSON.parse('0.1')` is not 0.1, and a
 * product whose entire premise is that a number can be defended cannot afford to
 * lose a digit in transport. `Decimal` parses the string exactly.
 */

import { Decimal } from '@envelope/core';
import { z } from 'zod';

import { affectionPlanAttachment } from './instrument.js';

/** The most basements, and podium levels above the ground floor, a schedule may state. */
export const BASEMENTS_MAX = 8;
export const PODIUM_LEVELS_MAX = 20;
/**
 * The most parking levels a run may state: every basement, the ground floor and
 * every podium level. Derived from the two above so the integer and the schedule
 * cannot disagree about what is accepted.
 */
export const PARKING_LEVELS_MAX = BASEMENTS_MAX + 1 + PODIUM_LEVELS_MAX;

/** A decimal carried as a string. Rejects anything a `Decimal` cannot parse. */
export const decimalString = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'must be a decimal number written as a string, e.g. "5.25"');

export const edgeClassification = z.enum(['ROAD', 'ADJACENT_PLOT', 'OPEN_SPACE', 'OTHER']);
export const roadHierarchy = z.enum(['ARTERIAL', 'COLLECTOR', 'LOCAL', 'ACCESS']);

/**
 * One plot edge.
 *
 * `classification` is required with no default — `FR-PLT-001 AC3`: "Edge
 * classification is mandatory for every edge; no default." A road edge must
 * carry a hierarchy, because the setback table is keyed on it; the refinement
 * below makes that a parse error rather than a resolution failure three layers
 * down.
 */
export const plotEdgeInput = z
  .object({
    seq: z.number().int().nonnegative(),
    classification: edgeClassification,
    roadHierarchy: roadHierarchy.optional(),
    /*
      A CURVED BOUNDARY, AS THE SHEET STATES IT.

      A radius and a side, because that is what an affection plan prints — not a
      bulge, which is what the engine stores, and not a string of coordinates,
      which is what a hand trace produces. The engine turns the radius into the
      bulge against the chord the two corners already give it, so nothing here
      can disagree with the geometry it describes.

      The minor arc only. A boundary taking the long way round a circle is
      re-entrant, and §14.1 refuses re-entrant plots by name already.
    */
    arc: z
      .object({
        radiusM: decimalString,
        /**
         * Which way the boundary bows, as somebody walking it from its first
         * corner to its second would say. Named rather than signed: a sign
         * convention is a thing a reader gets wrong silently.
         */
        bulgesRight: z.boolean(),
      })
      .refine((a) => new Decimal(a.radiusM).gt(0), {
        message: 'a curved boundary needs a radius greater than zero',
        path: ['radiusM'],
      })
      .optional(),
  })
  .refine((e) => e.classification !== 'ROAD' || e.roadHierarchy !== undefined, {
    message:
      'a ROAD edge must declare its hierarchy — the setback table is keyed on it, ' +
      'and there is no default road type',
    path: ['roadHierarchy'],
  })
  .refine((e) => e.classification === 'ROAD' || e.roadHierarchy === undefined, {
    message: 'only a ROAD edge may carry a road hierarchy',
    path: ['roadHierarchy'],
  });

/**
 * Plot geometry.
 *
 * Two entry paths, and the *first* is the one that matters — see
 * `docs/03-analysis/open-questions.md` Q23. An architect holds an affection plan
 * with dimensions and bearings, not survey coordinates. `FR-PLT-001` offers
 * boundary drawing on a basemap and `AC2` then blocks when computed and stated
 * area differ by more than 2%; hand-tracing a plot on a satellite tile routinely
 * lands 2–5% off, so the PRD's primary input method routinely trips the PRD's
 * primary input validation. Dimension entry avoids the problem entirely.
 */
export const plotInput = z
  .object({
    plotNumber: z.string().min(1),
    community: z.string().min(1),
    landUse: z.literal('RESIDENTIAL_MULTI', {
      error:
        'Phase 0 covers residential towers in one community. Another land use is ' +
        'refused rather than approximated (PRD §3.2).',
    }),
    /** Vertices in metres, local metric CRS. Closed ring, first not repeated. */
    vertices: z
      .array(z.object({ x: decimalString, y: decimalString }))
      .min(3, 'a plot needs at least three vertices'),
    edges: z.array(plotEdgeInput).min(3),
    /** Area as printed on the affection plan, for the 2% cross-check. */
    statedAreaM2: decimalString.optional(),
    /**
     * The affection plan itself, so the SERVER reads its limits.
     *
     * The PDF, not the numbers off it. A body carrying `{ far: 3.5 }` would
     * produce a rule whose citation names a page and a bounding box in a
     * document this server never opened — a number somebody typed wearing the
     * evidence of a number somebody read. See `instrument.ts`.
     *
     * Optional, and a plot without one behaves exactly as it always has: step 0
     * is not gated, because a plot whose sheet is not to hand is still a plot.
     */
    affectionPlan: affectionPlanAttachment.optional(),
  })
  .refine((p) => p.edges.length === p.vertices.length, {
    message: 'every edge needs a classification: edge count must equal vertex count',
    path: ['edges'],
  })
  /*
    `seq` INDEXES THE RING, so it has to be a permutation of `0..n-1` and not
    merely a non-negative integer of the right count. Two edges carrying `seq: 0`
    passed the count check, left one boundary unclassified, and read
    `ring[e.seq]` past the end for the boundary nobody claimed. Checked here
    because this is the only place that knows both lengths.
  */
  .refine(
    (p) => {
      const seen = new Set(p.edges.map((e) => e.seq));
      return seen.size === p.edges.length && p.edges.every((e) => e.seq < p.vertices.length);
    },
    {
      message:
        'each edge must name a different boundary: seq runs 0 to one less than the ' +
        'vertex count, once each',
      path: ['edges'],
    },
  );

export const unitMixEntry = z.object({
  typeId: z.string().min(1),
  label: z.string().min(1),
  share: decimalString,
  nsaM2: decimalString,
});

/**
 * A run request.
 *
 * `parkingInFar` has no default and cannot be omitted. `FR-DEF-002`: the system
 * "must not assume an answer" — it swings capacity 15–35%. Sending
 * `OPEN_REGULATORY_QUESTION` is legal and returns a blocked run explaining why,
 * which is the honest state while the question is genuinely open.
 */
export const runRequest = z.object({
  plotId: z.string().min(1),
  parkingInFar: z.enum(['COUNTS_TOWARD_FAR', 'EXCLUDED_FROM_FAR', 'OPEN_REGULATORY_QUESTION']),
  /*
    WHICH RECORDED STATEMENT THE ANSWER CAME FROM, when it came from one.

    Optional, and its absence means the answer is the runner's own — the
    ordinary case, and the one `FR-DEF-002` already contemplates. When it is
    present the server looks the statement up in `@envelope/rules` and refuses
    an id it does not hold, or one whose recorded answer is not the answer being
    sent. A client that could name a statement and then send a different
    treatment could put its own answer under somebody else's name, which is the
    one thing an attribution must not allow.
  */
  parkingInFarStatementId: z.string().min(1).optional(),
  /**
   * The podium statement: basements, ground and podium stand on the boundary
   * wherever the plot's own sheet is silent. Looked up and refused the same way
   * as the parking statement. Absent, the podium keeps the tower's setback line.
   */
  podiumSetbackStatementId: z.string().min(1).optional(),
  /**
   * The column-gap statement: a clear gap after every three bays along a run.
   * Looked up and refused the same way; the gap is the one the statement
   * records, never a figure sent beside it. Absent, bays pack shoulder to shoulder.
   */
  columnGapStatementId: z.string().min(1).optional(),
  /**
   * The project brief the actor chose to apply where the plot's own affection
   * plan is silent (17 Oct 2026) — e.g. plot 5180178, whose sheet prints no FAR
   * and whose brief prints FAR 5 and 11,829.35 m². Offered, never pre-selected;
   * refused (422) when it is not on file for this plot. Its values are marked as
   * the brief's on every one of them, never as the authority's.
   */
  projectBriefId: z.string().min(1).max(120).optional(),
  /**
   * The parking arrangement the actor picked from a previous run's
   * `levelPlan.arrangements` — USER_SET under the actor. Absent, the one placing
   * the most bays is laid out. One this level cannot pack comes back 422.
   */
  parkingArrangement: z.enum(['WIDTH', 'DEPTH', 'PERIMETER', 'SLOPED', 'FIELD_WIDTH', 'FIELD_DEPTH']).optional(),
  /**
   * Tower setbacks typed by the actor, by edge, in metres. USER_SET. An edge the
   * affection plan governs refuses a typed value (422, in a sentence).
   */
  typedSetbacks: z
    .array(z.object({ edgeSeq: z.number().int().min(0).max(999), metres: decimalString }))
    .max(64)
    .optional(),
  unitMix: z
    .object({
      source: z.enum(['USER_SET', 'ASSUMED']),
      entries: z.array(unitMixEntry).min(1),
      basis: z.string().min(20).optional(),
    })
    .refine((m) => m.source !== 'ASSUMED' || (m.basis && m.basis.length >= 20), {
      message:
        'an ASSUMED unit mix needs a basis of at least 20 characters. If you cannot ' +
        'write down why this mix and not another, you have a guess, not an assumption.',
      path: ['basis'],
    }),
  /*
    UP TO 29, THE MOST THE SCHEDULE BELOW CAN SAY: 8 basements, the ground floor
    and 20 podium parking levels. It was 8, and the studio sends basements +
    ground + podium parking here alongside `levels`, so a scheme of three
    basements, a parked ground floor and five podium parking levels (nine) was
    refused with "Too big" before the engine saw it. A limit tighter than the
    schedule's own would refuse buildings the schedule describes.
  */
  parkingLevelsAvailable: z.number().int().min(0).max(PARKING_LEVELS_MAX),
  /**
   * Levels standing on the podium footprint, **the ground floor included**.
   *
   * Optional, and absence is not a default: the engine records an unentered count
   * as ASSUMED, amber, with its own basis string. Sent, it is USER_SET by the actor
   * who confirmed it, including when the screen pre-filled it from the affection
   * plan — the sheet was read by a parser and confirmed by a person, and the person
   * is the one whose name the value carries.
   *
   * THE GROUND FLOOR IS INSIDE THIS NUMBER. `G+2P+8` is three, not two — which is
   * what `levels` below exists to stop anybody having to remember.
   */
  podiumLevels: z.number().int().min(0).max(20).optional(),
  /**
   * The level schedule, and the better way to say both of the numbers above.
   *
   * Eng. Mohamed, 2026-09-28: it should be the ground floor, how many basements,
   * how many podium levels. Two integers cannot say any of that, and the three
   * kinds of level do not behave alike.
   *
   * Sent, it supplies `parkingLevelsAvailable` and `podiumLevels` and the two
   * fields above are ignored — stated beats derived. Absent, the run is computed
   * the old way, which is how every run stored before this existed was computed.
   */
  levels: z
    .object({
      basements: z.number().int().min(0).max(BASEMENTS_MAX),
      groundIsParking: z.boolean(),
      podiumAboveGround: z.number().int().min(0).max(PODIUM_LEVELS_MAX),
      podiumParkingLevels: z.number().int().min(0).max(PODIUM_LEVELS_MAX),
    })
    .optional(),
  /**
   * The core's plan area on a typical level, m² — Eng. Mohamed's *"الاهم"*.
   *
   * Optional, and absence is not a default: unsent, the engine assumes 18% of
   * the tower plate, amber, with a basis and a measured sensitivity. Sent, it is
   * USER_SET by the actor.
   *
   * A decimal string, like every other quantity on this boundary: `Decimal` is
   * the engine's number type and a JSON float would round before the engine ever
   * saw it.
   */
  coreAreaM2: decimalString.optional(),
  /**
   * The plot edge the actor chose for the vehicle entrance, counted from 0 as
   * `edgeSeq` is. Optional, and absence is the engine's B.7.2.1 recommendation,
   * not a default: the recommendation is reported either way. A frontage the
   * code refuses comes back 422 with the reason, never redrawn elsewhere.
   */
  chosenAccessEdgeSeq: z.number().int().min(0).max(999).optional(),
  /**
   * The vehicle entrance the actor placed (Eng. Mohamed, 16 Oct 2026): the
   * arrangement — one two-way 6 m opening, or an entry and an exit of 3 m each,
   * side by side or apart — and where each stands, as a boundary and a distance
   * from that boundary's first corner to the opening's centre. An absent distance
   * centres it in what B.7.2.1 allows. Sent with `chosenAccessEdgeSeq` it is
   * refused: two answers to one question.
   */
  vehicleAccess: z
    .object({
      arrangement: z.enum(['TWO_WAY', 'ONE_WAY_PAIR', 'ONE_WAY_SEPARATE']),
      entry: z.object({ edgeSeq: z.number().int().min(0).max(999), centreOffsetM: decimalString.optional() }).strict(),
      exit: z
        .object({ edgeSeq: z.number().int().min(0).max(999), centreOffsetM: decimalString.optional() })
        .strict()
        .optional(),
    })
    .strict()
    .optional(),
  parkingUsableFraction: z.object({
    value: decimalString,
    source: z.enum(['DERIVED', 'ASSUMED']),
    basis: z.string().min(20).optional(),
  }),
  /**
   * Saleable area over GFA. Required, with no default.
   *
   * It is not optional and it is not defaulted, because the value it used to
   * take implicitly was 1.00 — every square metre of GFA saleable — and that
   * overstated the unit count on every run. Azizi's own brief states 93%-97%;
   * pick one and it is recorded as yours.
   */
  /*
    TWO WAYS TO SAY IT, AND THE SCHEMA TAKES EITHER — see `SaleableEfficiencyInput`
    for the argument. A client sends `value` (a ratio) or `saleableAreaM2` (square
    metres), never both and never neither; `superRefine` says which, in a sentence
    rather than as a union error naming two branches.
  */
  saleableEfficiency: z
    .object({
      value: decimalString.optional(),
      saleableAreaM2: decimalString.optional(),
      /* ASSUMED: the question was deferred out of this phase (16 Oct 2026). The
         engine refuses one without a basis or with an area, in a sentence. */
      source: z.enum(['USER_SET', 'DERIVED', 'ASSUMED']),
      basis: z.string().min(20).optional(),
    })
    .superRefine((v, ctx) => {
      const ratio = v.value !== undefined;
      const area = v.saleableAreaM2 !== undefined;
      if (ratio === area) {
        ctx.addIssue({
          code: 'custom',
          message: ratio
            ? 'send the saleable figure once: either `value`, a ratio of GFA, or ' +
              '`saleableAreaM2`, an area in square metres. Both were sent, and they ' +
              'can disagree.'
            : 'the saleable figure has no default. Send `value`, a ratio of GFA, or ' +
              '`saleableAreaM2`, an area in square metres. The value this used to ' +
              'take implicitly was 1.00 — every square metre of GFA saleable — and ' +
              'it overstated the unit count on every run.',
        });
      }
    }),
  /** §15.3 — defaults to 1.00 and is always `USER_SET`. Never estimated. */
  realismDiscount: decimalString.default('1.00'),
  /** Set only in development, and only against DRAFT rules. */
  useDraftRules: z.boolean().default(false),
});

export const gateAck = z.object({
  gate: z.enum([
    'G1_PLOT_CONFIRMED',
    'G2_RULES_ACKNOWLEDGED',
    'G3_ASSUMPTIONS_ACKNOWLEDGED',
    'G4_REVIEWER_NAMED',
  ]),
  subjectHash: z.string().min(1),
});

export const assumptionEdit = z.object({
  parameterId: z.string().min(1),
  value: decimalString,
});

/**
 * A share names an account by email and a role.
 *
 * THE ROLE IS A CLOSED SET, never free text. `reviewer` is the one that carries
 * meaning — it is what lets a run reach the person who will sign it at G4 while the
 * run itself stays private to the author — and a role the server does not recognise
 * would be a grant nobody can reason about.
 */
export const shareRequest = z.object({
  email: z.string().min(3).max(254),
  role: z.enum(['reviewer', 'reader']),
});

export type PlotInput = z.infer<typeof plotInput>;
export type RunRequest = z.infer<typeof runRequest>;
export type GateAck = z.infer<typeof gateAck>;
export type AssumptionEdit = z.infer<typeof assumptionEdit>;
export type ShareRequest = z.infer<typeof shareRequest>;
