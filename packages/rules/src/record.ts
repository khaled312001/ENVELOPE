/**
 * The rule record — PRD §11.2.
 *
 * §11.1's decision, reversing V1: rules are **typed data records evaluated by a
 * registry of named functions**. No DSL, no compiler. "A DSL designed before
 * ~100 rules exist encodes the wrong abstractions." Extract one around rule 100,
 * when the shape is known; the migration is mechanical because the records are
 * already typed.
 *
 * ---
 *
 * **The ninth Principle-9 field.** §2.4 and `FR-RUL-001 AC1` both enumerate
 * eight mandatory fields — source, citation, effective date, jurisdiction,
 * applicability, version, approval, provenance — while §11.2 and §24.1 both say
 * "nine". The ninth is never named anywhere in 3,587 lines. See
 * `docs/03-analysis/open-questions.md` Q17.
 *
 * Pending the client's answer this implementation treats **`ruleClass`** as the
 * ninth, because `FR-RUL-003 AC1` independently fails the build on any rule that
 * is not classified — which makes it mandatory in practice whatever the intent
 * was. Every field below is non-optional, so the type checker enforces the
 * count whichever answer comes back.
 */

import type { Citation } from '@envelope/core';

/** PRD §11.3. Four partitions under a heading that says "three rule classes". */
export const RuleClass = {
  /**
   * Can directly construct geometry or a numeric bound. Builds the envelope.
   * Setbacks, height ceiling, FAR ceiling, coverage cap, tower plate cap.
   */
  GENERATIVE: 'GENERATIVE',
  /**
   * Prunes candidates during construction — a violating candidate is never
   * created. Minimum unit area, corridor width, stair width, parking ratio.
   */
  FILTERING: 'FILTERING',
  /**
   * Assessable only after a candidate exists; has no constructive inverse.
   * Travel distance, exit separation, dead-end length, aggregate occupant load.
   *
   * §11.3's point, and the reason V1's model was wrong: "there is no way to
   * generate a floorplate from a travel-distance limit."
   */
  EVALUATIVE_ONLY: 'EVALUATIVE_ONLY',
  /**
   * Applicable but not mechanizable at this fidelity. Declared in every output
   * so that "what we did not assess" is visible rather than absent.
   */
  DEFERRED: 'DEFERRED',
} as const;
export type RuleClass = (typeof RuleClass)[keyof typeof RuleClass];

/**
 * Whether the rule could be mechanized at all.
 *
 * §24.3 requires the mechanization *rate* to be measured, which needs at least
 * two values — but only `"MECHANIZED"` ever appears in the PRD. The remaining
 * values are named here so the measurement is possible; see Q18.
 */
export const Mechanization = {
  MECHANIZED: 'MECHANIZED',
  /** Encodable only with a judgement call that a human must make per project. */
  PARTIALLY_MECHANIZED: 'PARTIALLY_MECHANIZED',
  /** Performance-based, discretionary, or otherwise not reducible to a record. */
  NON_MECHANIZABLE: 'NON_MECHANIZABLE',
} as const;
export type Mechanization = (typeof Mechanization)[keyof typeof Mechanization];

export const ApprovalStatus = {
  DRAFT: 'DRAFT',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  SUPERSEDED: 'SUPERSEDED',
  WITHDRAWN: 'WITHDRAWN',
} as const;
export type ApprovalStatus = (typeof ApprovalStatus)[keyof typeof ApprovalStatus];

/** The comparison a scalar rule asserts. Decides what "most restrictive" means. */
export const Operator = {
  /** The value is a floor: setbacks, minimum widths. Most restrictive = maximum. */
  MIN: 'MIN',
  /** The value is a ceiling: FAR, height, coverage. Most restrictive = minimum. */
  MAX: 'MAX',
  /** The value is exact — neither relaxable nor tightenable by another rule. */
  EXACT: 'EXACT',
  /** The value is a closed interval. */
  RANGE: 'RANGE',
  /** The value is a permitted set of enumerated options. */
  ENUM: 'ENUM',
} as const;
export type Operator = (typeof Operator)[keyof typeof Operator];

/** Names of the twelve registered evaluators — PRD §11.4. Capped at twelve. */
export const EvaluatorName = {
  SCALAR_MIN: 'scalar_min',
  SCALAR_MAX: 'scalar_max',
  TABLE_LOOKUP_MIN: 'table_lookup_min',
  TABLE_LOOKUP_MAX: 'table_lookup_max',
  RATIO_PER_UNIT_TYPE: 'ratio_per_unit_type',
  PERCENTAGE_OF_BASE: 'percentage_of_base',
  POLYGON_OFFSET_INWARD: 'polygon_offset_inward',
  COUNT_MINIMUM: 'count_minimum',
  RANGE_BOUND: 'range_bound',
  ENUM_PERMITTED_SET: 'enum_permitted_set',
  CONDITIONAL_SCALAR: 'conditional_scalar',
  /**
   * §11.4's escape hatch: "registered, tested, reviewed like any other rule".
   * Deliberately last, and deliberately the only one that can hold logic a
   * reviewer must read code to check.
   */
  CUSTOM_FN: 'custom_fn',
} as const;
export type EvaluatorName = (typeof EvaluatorName)[keyof typeof EvaluatorName];

/**
 * §11.4's guard: "the evaluator registry is capped at 12 functions in Phase 0.
 * Exceeding it signals the abstraction is wrong and triggers a design review
 * rather than a thirteenth function."
 */
export const EVALUATOR_CAP = 12 as const;

// ---------------------------------------------------------------------------
// Applicability predicates
// ---------------------------------------------------------------------------

/** Leaf comparison against a value in the evaluation context. */
export type Comparison =
  | { readonly eq: string | number | boolean }
  | { readonly ne: string | number | boolean }
  | { readonly in: readonly (string | number)[] }
  | { readonly nin: readonly (string | number)[] }
  | { readonly gt: number }
  | { readonly gte: number }
  | { readonly lt: number }
  | { readonly lte: number }
  | { readonly exists: boolean };

/** A single `{ path: comparison }` term. */
export type Term = Readonly<Record<string, Comparison>>;

/**
 * Applicability predicate. Deliberately a small, closed algebra rather than an
 * expression language: a reviewing architect must be able to read it, and a
 * predicate nobody can read is a rule nobody has approved.
 */
export type Applicability =
  | { readonly all: readonly (Term | Applicability)[] }
  | { readonly any: readonly (Term | Applicability)[] }
  | { readonly not: Term | Applicability }
  | { readonly always: true };

// ---------------------------------------------------------------------------
// Tests — three per rule, PRD §11.2
// ---------------------------------------------------------------------------

export const TestKind = {
  POSITIVE: 'POSITIVE',
  /** At the threshold. The case that catches an off-by-one in a lookup table. */
  BOUNDARY: 'BOUNDARY',
  /** Must evaluate to NOT_APPLICABLE. */
  NEGATIVE: 'NEGATIVE',
} as const;
export type TestKind = (typeof TestKind)[keyof typeof TestKind];

export interface RuleTest {
  readonly kind: TestKind;
  readonly context: Readonly<Record<string, unknown>>;
  readonly expected: number | string | readonly string[] | 'NOT_APPLICABLE';
  /** Why this case matters — read by the approving architect, not by the runner. */
  readonly note?: string;
}

// ---------------------------------------------------------------------------
// The record
// ---------------------------------------------------------------------------

export interface RuleRecord {
  readonly ruleId: string;
  /** Dotted parameter this rule speaks to, e.g. `setback.road`, `far.max`. */
  readonly parameterId: string;
  readonly ruleClass: RuleClass;
  readonly operator: Operator;
  readonly evaluator: EvaluatorName;
  readonly evaluatorArgs: Readonly<Record<string, unknown>>;
  readonly unit: string;

  readonly applicability: Applicability;

  /** Principle 9 — all nine fields NOT NULL, no exceptions, no override flag. */
  readonly citation: Citation;
  readonly jurisdiction: string;
  readonly isLifeSafety: boolean;
  readonly mechanization: Mechanization;

  /** Bitemporality: when the rule was in force, and when we recorded it. */
  readonly validFrom: string;
  readonly validTo: string | null;
  readonly recordedAt: string;
  readonly version: number;
  readonly supersedes: string | null;

  readonly status: ApprovalStatus;
  readonly authoredBy: string;
  readonly approvedBy: string | null;
  readonly approvedAt: string | null;

  readonly tests: readonly RuleTest[];

  /** Free-text note carried into the provenance tree for the reviewing human. */
  readonly note?: string;
}

/**
 * A rule that is applicable but was not assessed — `DEFERRED`.
 *
 * PRD §3.4 item 8 requires every output to carry the deferred-check list. This
 * is the shape of an entry in it: the point is that "we did not check this" is
 * a published fact, not an omission.
 */
export interface DeferredCheck {
  readonly ruleId: string;
  readonly parameterId: string;
  readonly reason: string;
  readonly citation: Citation;
}
