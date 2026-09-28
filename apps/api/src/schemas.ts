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

import { z } from 'zod';

import { affectionPlanAttachment } from './instrument.js';

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
      errorMap: () => ({
        message:
          'Phase 0 covers residential towers in one community. Another land use is ' +
          'refused rather than approximated (PRD §3.2).',
      }),
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
  });

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
  parkingLevelsAvailable: z.number().int().min(0).max(8),
  /**
   * How many of the permitted levels are podium — the `2` in `G+2P+8`.
   *
   * Optional, and absence is not a default: the engine records an unentered count
   * as ASSUMED, amber, with its own basis string. Sent, it is USER_SET by the actor
   * who confirmed it, including when the screen pre-filled it from the affection
   * plan — the sheet was read by a parser and confirmed by a person, and the person
   * is the one whose name the value carries.
   */
  podiumLevels: z.number().int().min(0).max(20).optional(),
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
  saleableEfficiency: z.object({
    value: decimalString,
    source: z.enum(['USER_SET', 'DERIVED']),
    basis: z.string().min(20).optional(),
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
