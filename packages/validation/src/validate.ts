/**
 * Independent validation — `FR-VAL-001`, PRD §16.
 *
 * `validateConfiguration` takes an answer the engine has already produced and
 * re-checks it against the materialized constraint set, using comparison
 * arithmetic written here and nowhere else. It does not call the rule
 * evaluators, it does not call overlap resolution, and it cannot reach the
 * capacity engine or the geometry kernel at all: `package.json` lists
 * `@envelope/core` and `@envelope/rules` and nothing else, so the import is not
 * lint-discouraged, it is impossible (Principle 4's enforcement, applied to
 * Principle 7's module).
 *
 * ---
 *
 * **Why the input is a flat map of parameter ids rather than the engine's own
 * result objects.**
 *
 * The obvious signature takes a `CapacityResult` and a `BuildableEnvelope` and
 * reads their fields. It is also the signature that quietly re-imports the
 * generator's understanding of what each field means — `governingGfa` is the
 * min of three bands *because the generator says so*, and a validator that
 * reads that field has agreed with the generator before it has checked
 * anything. Taking a `Record<parameterId, Observation>` means the validator
 * knows only the vocabulary the *rules* use, which is the vocabulary the
 * constraint set is written in. A field the generator forgot to publish shows
 * up here as `NO_OBSERVATION` — a visible gap — rather than as a silent pass.
 *
 * ---
 *
 * **What this catches, and what it cannot.** See {@link INDEPENDENCE_LIMIT},
 * which every report prints. This layer finds generator implementation bugs. It
 * is blind, by construction, to a rule transcribed wrongly from the instrument.
 *
 * ---
 *
 * **Ownership.** `FR-VAL-001 AC1` and `AC4` of `FR-INV-001` both require a
 * separate *owner*, not merely a separate module, and a solo build cannot
 * satisfy that. See `docs/03-analysis/open-questions.md` Q16: the module
 * separation is real and enforced by the dependency graph; the owner separation
 * is not met and must be disclosed in writing rather than absorbed.
 */

import {
  type Citation,
  type ClaimStatement,
  Decimal,
  metric,
  type NodeId,
  type Traced,
  type TracedDecimal,
  UnitType,
  within,
} from '@envelope/core';
import { Operator, ResolutionStatus, type ConstraintSet, type RuleValue } from '@envelope/rules';

import {
  ConstraintCategory,
  applicableRuleCount,
  deferredConstraintsFrom,
  encodedRuleCount,
  hardConstraintsFrom,
  PreferenceDirection,
  type DeferredConstraint,
  type HardConstraint,
  type SoftPreference,
} from './categories.js';
import {
  buildClaimStatement,
  assertClaimStatementHonest,
  claimStatementLines,
  INDEPENDENCE_LIMIT,
  SELF_CONSISTENCY_IS_NOT_COMPLIANCE,
  type GeometryCheckSummary,
  type GoldenSetMeasurement,
  type InvariantSummary,
} from './claims.js';

function assertNever(x: never, context: string): never {
  throw new Error(`${context}: unhandled variant ${JSON.stringify(x)}`);
}

// ---------------------------------------------------------------------------
// Numeric policy for comparisons
// ---------------------------------------------------------------------------

/**
 * Relative allowance applied when comparing an emitted value to a bound.
 *
 * §16 states no comparison tolerance anywhere, and §12.2's per-invariant
 * tolerances do not transfer — they govern conservation identities, not
 * constraint satisfaction. The choice matters in one specific way: a value that
 * reached the validator through `Decimal` division can differ from the bound in
 * the 28th significant digit, and comparing bit-for-bit would report a violation
 * that does not exist. A validator that cries wolf on the boundary case is worse
 * than no validator, because the boundary case is the one every real scheme sits
 * on — a tower designed to exactly 5.00 FAR.
 *
 * 1e-9 relative is one nanometre on a one-metre setback and one square
 * millimetre on a thousand square metres. It is numeric noise, not regulatory
 * grace, and it is ten million times tighter than the loosest invariant
 * tolerance §12.2 allows. Counts are compared exactly and never use it.
 *
 * Like the snap tolerance, this is part of the engine version: changing it
 * changes which schemes validate (§13.4). Recorded in
 * `docs/03-analysis/open-questions.md` alongside Q21 as a value the client must
 * agree in writing before it is quoted against.
 */
export const COMPARISON_NOISE_TOLERANCE = new Decimal('1e-9');

// ---------------------------------------------------------------------------
// The configuration under validation
// ---------------------------------------------------------------------------

export const ObservationKind = {
  QUANTITY: 'QUANTITY',
  COUNT: 'COUNT',
  OPTION: 'OPTION',
} as const;
export type ObservationKind = (typeof ObservationKind)[keyof typeof ObservationKind];

/**
 * One value the engine emitted, as the validator sees it.
 *
 * `unit` is carried explicitly rather than read from `Traced.unit`, which is
 * `string | undefined`. A unit comparison that passes because one side was
 * undefined is precisely the mis-encoding this check exists to catch, so the
 * type refuses to let a unit go unstated.
 *
 * `metricId` is required on any area quantity: `FR-DEF-001 AC5` forbids
 * computing an area term absent from the definitions annex, and `INV-15`
 * re-checks that independently. This module is a second independent re-check on
 * the same rule — the annex lookup here is deliberately not the same call site
 * the generator used.
 */
export type Observation =
  | {
      readonly kind: typeof ObservationKind.QUANTITY;
      readonly value: TracedDecimal;
      readonly unit: string;
      /** Mandatory when `unit` is an area. See `FR-DEF-001 AC5`. */
      readonly metricId?: string;
    }
  | {
      readonly kind: typeof ObservationKind.COUNT;
      readonly value: Traced<number>;
      readonly unit: string;
    }
  | {
      readonly kind: typeof ObservationKind.OPTION;
      readonly value: Traced<string>;
    };

/**
 * The emitted answer, keyed by the parameter vocabulary the rules use.
 *
 * The key is the parameter a rule governs — `far.max`, `setback.road` — and the
 * value is what the configuration actually does with it. That reads oddly the
 * first time (`far.max` holding an achieved 4.90) and is deliberate: keying the
 * emitted value by the *governed parameter* rather than by an "achieved" alias
 * means the join between constraint and value is exact, and a value the
 * generator publishes under a name no rule speaks to is visibly unchecked
 * rather than invisibly ignored.
 *
 * `engineVersion` and `ruleSetHash` are carried so a validation report can be
 * matched to the run it validates. A validation report that cannot name what it
 * validated is an assertion, not evidence (§13.4, `M-RUN`).
 */
export interface EmittedConfiguration {
  readonly runId: string;
  readonly engineVersion: string;
  readonly ruleSetHash: string;
  readonly observations: Readonly<Record<string, Observation>>;
}

// ---------------------------------------------------------------------------
// Outcomes
// ---------------------------------------------------------------------------

/**
 * The three things a hard check can conclude.
 *
 * There is no `WARNING`. §12.3's rule for invariants applies here for the same
 * reason: a severity dial is how a violation becomes a preference, which is
 * exactly what Principle 5 forbids.
 */
export const HardStatus = {
  SATISFIED: 'SATISFIED',
  VIOLATED: 'VIOLATED',
  /** The check could not be performed. Never reported as satisfied. */
  NOT_EVALUABLE: 'NOT_EVALUABLE',
} as const;
export type HardStatus = (typeof HardStatus)[keyof typeof HardStatus];

export const NotEvaluableReason = {
  /** The configuration published no value for this parameter. */
  NO_OBSERVATION: 'NO_OBSERVATION',
  /** The rule's unit and the emitted value's unit differ. An encoding defect. */
  UNIT_MISMATCH: 'UNIT_MISMATCH',
  /** A scalar bound met a set-valued observation, or similar. An encoding defect. */
  KIND_MISMATCH: 'KIND_MISMATCH',
  /** An area term the metric definitions annex does not define (`FR-DEF-001 AC5`). */
  UNDEFINED_AREA_TERM: 'UNDEFINED_AREA_TERM',
} as const;
export type NotEvaluableReason =
  (typeof NotEvaluableReason)[keyof typeof NotEvaluableReason];

export interface HardOutcome {
  readonly category: typeof ConstraintCategory.HARD;
  readonly constraintId: string;
  readonly parameterId: string;
  readonly ruleId: string;
  /** `FR-VAL-001 AC2`: every result cites its rule. Non-optional, so it must. */
  readonly citation: Citation;
  readonly isLifeSafety: boolean;
  readonly status: HardStatus;
  readonly reason?: NotEvaluableReason;
  readonly observed?: string;
  readonly bound?: string;
  readonly unit: string;
  /**
   * Signed distance to the bound in the constraint's own unit: positive is
   * headroom, negative is the amount by which the bound was missed. Absent for
   * enumerated constraints, where "how far away" is not defined.
   */
  readonly slack?: Decimal;
  /**
   * The provenance node of the value that was checked, so a reader can walk from
   * a validation finding into the derivation tree.
   *
   * The validator reads the graph's node ids and never writes to the graph.
   * Writing into the run's provenance would make the validator a participant in
   * the derivation it is supposed to be checking from outside.
   */
  readonly observedNode?: NodeId;
  readonly statement: string;
}

export const SoftStatus = {
  SCORED: 'SCORED',
  NOT_EVALUABLE: 'NOT_EVALUABLE',
} as const;
export type SoftStatus = (typeof SoftStatus)[keyof typeof SoftStatus];

export interface SoftOutcome {
  readonly category: typeof ConstraintCategory.SOFT;
  readonly preferenceId: string;
  readonly parameterId: string;
  readonly status: SoftStatus;
  readonly reason?: NotEvaluableReason;
  readonly observed?: string;
  readonly target: string;
  /** Relative deviation from target, ≥ 0. Reported. Never a feasibility input. */
  readonly deviation?: Decimal;
  readonly weightedDeviation?: Decimal;
  readonly statement: string;
}

export interface DeferredOutcome {
  readonly category: typeof ConstraintCategory.DEFERRED;
  readonly ruleId: string;
  readonly parameterId: string;
  readonly citation: Citation;
  readonly reason: string;
  readonly isLifeSafety: boolean;
  readonly statement: string;
}

export type ConstraintOutcome = HardOutcome | SoftOutcome | DeferredOutcome;

// ---------------------------------------------------------------------------
// Summary and report
// ---------------------------------------------------------------------------

export interface ValidationSummary {
  readonly hardChecked: number;
  readonly hardSatisfied: number;
  readonly hardViolated: number;
  readonly hardNotEvaluable: number;
  readonly softScored: number;
  readonly softNotEvaluable: number;
  /**
   * Σ (weight × deviation) over scored preferences.
   *
   * A reported number, and nothing reads it. It does not appear in
   * {@link ValidationSummary.feasible}, it is not compared to a threshold, and
   * no code path lets it change any hard outcome (Principle 5: hard constraints
   * are feasibility filters, never penalty terms — and the converse holds too,
   * a penalty term never becomes a filter).
   */
  readonly totalWeightedDeviation: Decimal;
  readonly deferredDeclared: number;
  readonly lifeSafetyDeferred: number;
  /** Parameters §11.6 halted on. Non-zero means the run may not proceed at all. */
  readonly resolutionsBlocked: number;
  /**
   * Feasible iff no hard constraint was violated.
   *
   * Derived from hard outcomes only. Soft deviation cannot make a feasible
   * configuration infeasible and cannot rescue an infeasible one.
   */
  readonly feasible: boolean;
  readonly violatedRuleIds: readonly string[];
}

export interface ValidationReport {
  readonly runId: string;
  readonly engineVersion: string;
  readonly ruleSetHash: string;
  readonly validatedAt: string;
  readonly outcomes: readonly ConstraintOutcome[];
  readonly summary: ValidationSummary;
  readonly claims: ClaimStatement;
  /** The five statements as printed lines, §16.5 order. `FR-VAL-001 AC4`. */
  readonly claimLines: readonly string[];
  /** §16.4. The report must print this. {@link INDEPENDENCE_LIMIT}. */
  readonly independenceLimit: string;
  /** `FR-VAL-001 AC3`. {@link SELF_CONSISTENCY_IS_NOT_COMPLIANCE}. */
  readonly selfConsistencyNotice: string;
  /**
   * Why this configuration may not be emitted, if it may not be.
   *
   * Empty is the only publishable state. Principle 3 and §12.3 — failure blocks
   * emission, never a warning and never a configurable severity.
   */
  readonly emissionBlocked: readonly string[];
}

export interface ValidationInput {
  readonly configuration: EmittedConfiguration;
  /** The materialized constraint set the generator consumed. §16.4 names it. */
  readonly constraintSet: ConstraintSet;
  readonly preferences?: readonly SoftPreference[];
  /** From `@envelope/invariants`, passed in as data — never imported here. */
  readonly invariants: InvariantSummary;
  /** From the geometry kernel's own checks, passed in as data. */
  readonly geometry: GeometryCheckSummary;
  /** Required-but-nullable: `undefined` is the current, honest state. */
  readonly professionalAgreement: GoldenSetMeasurement | undefined;
  readonly validatedAt: string;
}

// ---------------------------------------------------------------------------
// Comparison — written here, independently of the rule evaluators
// ---------------------------------------------------------------------------

interface Comparison {
  readonly satisfied: boolean;
  readonly observed: string;
  readonly bound: string;
  /** Positive is headroom; negative is the amount the bound was missed by. */
  readonly slack: Decimal | undefined;
}

type CheckResult =
  | { readonly ok: true; readonly comparison: Comparison }
  | { readonly ok: false; readonly reason: NotEvaluableReason; readonly detail: string };

const notEvaluable = (reason: NotEvaluableReason, detail: string): CheckResult => ({
  ok: false,
  reason,
  detail,
});

/** Whether a unit string denotes an area, and therefore needs an annex entry. */
function isAreaUnit(unit: string): boolean {
  return unit === UnitType.AREA_M2;
}

/**
 * Compare a scalar observation to a scalar bound under the rule's operator.
 *
 * The operator is read from the rule record — `MIN` means the value is a floor,
 * `MAX` a ceiling (§11.2). Reading that is reading the constraint set's
 * vocabulary; the arithmetic below is this module's own and shares nothing with
 * the resolver that chose the bound.
 */
function compareScalar(
  operator: Operator,
  observed: Decimal,
  bound: Decimal,
): Comparison | undefined {
  const allowance = bound.abs().times(COMPARISON_NOISE_TOLERANCE);
  switch (operator) {
    case Operator.MIN:
      return {
        satisfied: observed.gte(bound.minus(allowance)),
        observed: observed.toString(),
        bound: `≥ ${bound.toString()}`,
        slack: observed.minus(bound),
      };
    case Operator.MAX:
      return {
        satisfied: observed.lte(bound.plus(allowance)),
        observed: observed.toString(),
        bound: `≤ ${bound.toString()}`,
        slack: bound.minus(observed),
      };
    case Operator.EXACT:
      return {
        satisfied: within(observed, bound, COMPARISON_NOISE_TOLERANCE),
        observed: observed.toString(),
        bound: `= ${bound.toString()}`,
        slack: bound.minus(observed).abs().neg(),
      };
    case Operator.RANGE:
    case Operator.ENUM:
      // A scalar bound under a RANGE or ENUM operator is a mis-encoded rule:
      // the operator says the rule asserts a set, the evaluator produced a
      // point. Reported as an encoding defect rather than guessed at.
      return undefined;
    default:
      return assertNever(operator, 'compareScalar');
  }
}

/**
 * Check one emitted value against one hard constraint.
 *
 * Every path that cannot compare returns {@link notEvaluable}. There is
 * deliberately no branch that returns `satisfied: true` because a comparison
 * could not be made — a validator that passes what it could not check is worse
 * than one that does not run.
 */
function checkHard(constraint: HardConstraint, observation: Observation | undefined): CheckResult {
  if (observation === undefined) {
    return notEvaluable(
      NotEvaluableReason.NO_OBSERVATION,
      `the configuration publishes no value for ${constraint.parameterId}, so the ` +
        `bound from ${constraint.ruleId} could not be checked against anything.`,
    );
  }

  const bound: RuleValue = constraint.bound;

  switch (bound.kind) {
    case 'scalar':
    case 'range': {
      if (observation.kind !== ObservationKind.QUANTITY) {
        return notEvaluable(
          NotEvaluableReason.KIND_MISMATCH,
          `${constraint.ruleId} bounds ${constraint.parameterId} with a ${bound.kind} ` +
            `value, but the configuration published a ${observation.kind}.`,
        );
      }
      if (observation.unit !== constraint.unit) {
        return notEvaluable(
          NotEvaluableReason.UNIT_MISMATCH,
          `${constraint.ruleId} is expressed in "${constraint.unit}" and the emitted ` +
            `value for ${constraint.parameterId} is in "${observation.unit}". These are ` +
            `not comparable, and converting one silently is how a factor of 1,000 ` +
            `reaches a report.`,
        );
      }
      if (isAreaUnit(observation.unit)) {
        const problem = areaTermProblem(constraint.parameterId, observation.metricId);
        if (problem !== undefined) {
          return notEvaluable(NotEvaluableReason.UNDEFINED_AREA_TERM, problem);
        }
      }
      const value = observation.value.value;
      if (bound.kind === 'range') {
        const lowAllowance = bound.min.abs().times(COMPARISON_NOISE_TOLERANCE);
        const highAllowance = bound.max.abs().times(COMPARISON_NOISE_TOLERANCE);
        const belowBy = bound.min.minus(value);
        const aboveBy = value.minus(bound.max);
        return {
          ok: true,
          comparison: {
            satisfied:
              value.gte(bound.min.minus(lowAllowance)) && value.lte(bound.max.plus(highAllowance)),
            observed: value.toString(),
            bound: `∈ [${bound.min.toString()}, ${bound.max.toString()}]`,
            slack: Decimal.max(belowBy, aboveBy).neg(),
          },
        };
      }
      const comparison = compareScalar(constraint.operator, value, bound.value);
      if (comparison === undefined) {
        return notEvaluable(
          NotEvaluableReason.KIND_MISMATCH,
          `${constraint.ruleId} declares operator ${constraint.operator}, which asserts ` +
            `a set, but its evaluator produced a single scalar. The rule record is ` +
            `internally inconsistent and must be fixed in the rule base, not here.`,
        );
      }
      return { ok: true, comparison };
    }

    case 'count': {
      if (observation.kind !== ObservationKind.COUNT) {
        return notEvaluable(
          NotEvaluableReason.KIND_MISMATCH,
          `${constraint.ruleId} bounds ${constraint.parameterId} with a count, but the ` +
            `configuration published a ${observation.kind}.`,
        );
      }
      // Counts are integers. No noise allowance: 1.999 stairs is not 2 stairs,
      // and a tolerance here would be the one that lets it be.
      const value = new Decimal(observation.value.value);
      const boundValue = new Decimal(bound.value);
      const comparison = compareScalarExact(constraint.operator, value, boundValue);
      if (comparison === undefined) {
        return notEvaluable(
          NotEvaluableReason.KIND_MISMATCH,
          `${constraint.ruleId} declares operator ${constraint.operator} against a count ` +
            `bound, which has no defined comparison.`,
        );
      }
      return { ok: true, comparison };
    }

    case 'enum': {
      if (observation.kind !== ObservationKind.OPTION) {
        return notEvaluable(
          NotEvaluableReason.KIND_MISMATCH,
          `${constraint.ruleId} permits a set of options for ${constraint.parameterId}, ` +
            `but the configuration published a ${observation.kind}.`,
        );
      }
      const chosen = observation.value.value;
      return {
        ok: true,
        comparison: {
          satisfied: bound.permitted.includes(chosen),
          observed: chosen,
          bound: `∈ {${bound.permitted.join(', ')}}`,
          // "How far outside the permitted set" is not a quantity. §11.6 makes
          // the same point about enumerations having no restrictiveness order.
          slack: undefined,
        },
      };
    }

    default:
      return assertNever(bound, 'checkHard');
  }
}

/** Exact comparison, for integer counts. Shares no allowance with the scalar path. */
function compareScalarExact(
  operator: Operator,
  observed: Decimal,
  bound: Decimal,
): Comparison | undefined {
  switch (operator) {
    case Operator.MIN:
      return {
        satisfied: observed.gte(bound),
        observed: observed.toString(),
        bound: `≥ ${bound.toString()}`,
        slack: observed.minus(bound),
      };
    case Operator.MAX:
      return {
        satisfied: observed.lte(bound),
        observed: observed.toString(),
        bound: `≤ ${bound.toString()}`,
        slack: bound.minus(observed),
      };
    case Operator.EXACT:
      return {
        satisfied: observed.eq(bound),
        observed: observed.toString(),
        bound: `= ${bound.toString()}`,
        slack: bound.minus(observed).abs().neg(),
      };
    case Operator.RANGE:
    case Operator.ENUM:
      return undefined;
    default:
      return assertNever(operator, 'compareScalarExact');
  }
}

/**
 * `FR-DEF-001 AC5`, re-checked independently of the generator's own call site.
 *
 * `metric()` throws `UndefinedMetricError` with the message the annex wants a
 * reader to see, so that message is passed through rather than reworded here.
 */
function areaTermProblem(parameterId: string, metricId: string | undefined): string | undefined {
  if (metricId === undefined) {
    return (
      `${parameterId} is an area term and the configuration names no metric id for ` +
      `it. FR-DEF-001 AC5: no code may compute an area term absent from the ` +
      `definitions annex, and an area term that does not say which definition it ` +
      `used cannot be checked against one.`
    );
  }
  try {
    metric(metricId);
    return undefined;
  } catch (error) {
    return `${parameterId}: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// ---------------------------------------------------------------------------
// Soft scoring
// ---------------------------------------------------------------------------

/**
 * Relative deviation of an emitted value from a preference target.
 *
 * Relative rather than absolute so that deviations on incommensurable
 * parameters — a ratio and an area — can be summed into one reported figure
 * without the largest unit dominating. That sum is reported and nothing reads
 * it; see {@link ValidationSummary.totalWeightedDeviation}.
 */
function deviationFrom(
  direction: PreferenceDirection,
  observed: Decimal,
  target: Decimal,
): Decimal {
  const base = target.isZero() ? new Decimal(1) : target.abs();
  switch (direction) {
    case PreferenceDirection.MAXIMIZE:
      return Decimal.max(0, target.minus(observed)).div(base);
    case PreferenceDirection.MINIMIZE:
      return Decimal.max(0, observed.minus(target)).div(base);
    case PreferenceDirection.TARGET:
      return observed.minus(target).abs().div(base);
    default:
      return assertNever(direction, 'deviationFrom');
  }
}

function scoreSoft(preference: SoftPreference, observation: Observation | undefined): SoftOutcome {
  const base = {
    category: ConstraintCategory.SOFT,
    preferenceId: preference.preferenceId,
    parameterId: preference.parameterId,
    target: preference.target.toString(),
  } as const;

  if (observation === undefined) {
    return {
      ...base,
      status: SoftStatus.NOT_EVALUABLE,
      reason: NotEvaluableReason.NO_OBSERVATION,
      statement:
        `SOFT ${preference.parameterId} (${preference.label}) — not scored: the ` +
        `configuration publishes no value for it. A preference nobody could score ` +
        `is reported as unscored, never as met.`,
    };
  }
  if (observation.kind !== ObservationKind.QUANTITY) {
    return {
      ...base,
      status: SoftStatus.NOT_EVALUABLE,
      reason: NotEvaluableReason.KIND_MISMATCH,
      statement:
        `SOFT ${preference.parameterId} (${preference.label}) — not scored: deviation ` +
        `is defined for quantities and the configuration published a ` +
        `${observation.kind}.`,
    };
  }

  const observed = observation.value.value;
  const deviation = deviationFrom(preference.direction, observed, preference.target);
  const weightedDeviation = deviation.times(preference.weight);
  return {
    ...base,
    status: SoftStatus.SCORED,
    observed: observed.toString(),
    deviation,
    weightedDeviation,
    statement:
      `SOFT ${preference.parameterId} (${preference.label}) — ${preference.direction} ` +
      `${preference.target.toString()}, emitted ${observed.toString()}: deviation ` +
      `${deviation.times(100).toDecimalPlaces(2).toString()}% (weight ` +
      `${preference.weight.toString()}). Reported, not enforced.`,
  };
}

// ---------------------------------------------------------------------------
// The entry point
// ---------------------------------------------------------------------------

function hardStatement(constraint: HardConstraint, result: CheckResult): string {
  const cite = `${constraint.citation.instrumentId} ${constraint.citation.clauseReference}`;
  const safety = constraint.isLifeSafety ? ' [LIFE SAFETY]' : '';
  const head = `HARD ${constraint.parameterId} (${constraint.ruleId}, ${cite})${safety} — `;

  if (!result.ok) {
    return `${head}NOT EVALUABLE (${result.reason}): ${result.detail}`;
  }

  const c = result.comparison;
  if (c.satisfied) {
    // An EXACT bound and a range boundary have no headroom by construction, and
    // printing "headroom −1e-30" for a value that landed on the bound reads as
    // a defect to anyone checking the report.
    const margin =
      c.slack === undefined || c.slack.lte(0)
        ? ''
        : ` (headroom ${c.slack.toString()} ${constraint.unit})`;
    return `${head}SATISFIED: ${c.observed} ${constraint.unit} against ${c.bound}${margin}.`;
  }

  const missedBy =
    c.slack === undefined ? '' : `, short by ${c.slack.abs().toString()} ${constraint.unit}`;
  return (
    `${head}VIOLATED: ${c.observed} ${constraint.unit} against ${c.bound}${missedBy}. ` +
    `This configuration is infeasible; a hard constraint is a feasibility filter, ` +
    `not a penalty (Principle 5).`
  );
}

function toHardOutcome(constraint: HardConstraint, observation: Observation | undefined): HardOutcome {
  const result = checkHard(constraint, observation);
  const node = observation === undefined ? undefined : observation.value.node;

  if (!result.ok) {
    return {
      category: ConstraintCategory.HARD,
      constraintId: constraint.constraintId,
      parameterId: constraint.parameterId,
      ruleId: constraint.ruleId,
      citation: constraint.citation,
      isLifeSafety: constraint.isLifeSafety,
      status: HardStatus.NOT_EVALUABLE,
      reason: result.reason,
      unit: constraint.unit,
      ...(node !== undefined ? { observedNode: node } : {}),
      statement: hardStatement(constraint, result),
    };
  }

  const c = result.comparison;
  return {
    category: ConstraintCategory.HARD,
    constraintId: constraint.constraintId,
    parameterId: constraint.parameterId,
    ruleId: constraint.ruleId,
    citation: constraint.citation,
    isLifeSafety: constraint.isLifeSafety,
    status: c.satisfied ? HardStatus.SATISFIED : HardStatus.VIOLATED,
    observed: c.observed,
    bound: c.bound,
    unit: constraint.unit,
    ...(c.slack !== undefined ? { slack: c.slack } : {}),
    ...(node !== undefined ? { observedNode: node } : {}),
    statement: hardStatement(constraint, result),
  };
}

function toDeferredOutcome(deferred: DeferredConstraint): DeferredOutcome {
  return {
    category: ConstraintCategory.DEFERRED,
    ruleId: deferred.ruleId,
    parameterId: deferred.parameterId,
    citation: deferred.citation,
    reason: deferred.reason,
    isLifeSafety: deferred.isLifeSafety,
    statement:
      `DEFERRED ${deferred.parameterId} (${deferred.ruleId}, ` +
      `${deferred.citation.instrumentId} ${deferred.citation.clauseReference})` +
      `${deferred.isLifeSafety ? ' [LIFE SAFETY]' : ''} — NOT CHECKED: ${deferred.reason}`,
  };
}

/**
 * Re-check an emitted configuration against the constraint set it was produced
 * from, and state the five claims that result.
 *
 * The contradiction battery (§16.2) is **not** run from here. It is a Phase 1
 * pre-computation check on the brief, it runs before generation rather than
 * after it, and its checks are unwired stubs — see {@link CONTRADICTION_BATTERY}.
 */
export function validateConfiguration(input: ValidationInput): ValidationReport {
  const { configuration, constraintSet } = input;
  const hardConstraints = hardConstraintsFrom(constraintSet);
  const deferredConstraints = deferredConstraintsFrom(constraintSet);
  const preferences = input.preferences ?? [];

  const hardOutcomes = hardConstraints.map((constraint) =>
    toHardOutcome(constraint, configuration.observations[constraint.parameterId]),
  );
  const softOutcomes = preferences.map((preference) =>
    scoreSoft(preference, configuration.observations[preference.parameterId]),
  );
  const deferredOutcomes = deferredConstraints.map(toDeferredOutcome);

  const violated = hardOutcomes.filter((o) => o.status === HardStatus.VIOLATED);
  const notEvaluableOutcomes = hardOutcomes.filter((o) => o.status === HardStatus.NOT_EVALUABLE);

  const summary: ValidationSummary = {
    hardChecked: hardOutcomes.length,
    hardSatisfied: hardOutcomes.filter((o) => o.status === HardStatus.SATISFIED).length,
    hardViolated: violated.length,
    hardNotEvaluable: notEvaluableOutcomes.length,
    softScored: softOutcomes.filter((o) => o.status === SoftStatus.SCORED).length,
    softNotEvaluable: softOutcomes.filter((o) => o.status === SoftStatus.NOT_EVALUABLE).length,
    totalWeightedDeviation: softOutcomes.reduce(
      (acc, o) => (o.weightedDeviation === undefined ? acc : acc.plus(o.weightedDeviation)),
      new Decimal(0),
    ),
    deferredDeclared: deferredOutcomes.length,
    lifeSafetyDeferred: deferredOutcomes.filter((o) => o.isLifeSafety).length,
    resolutionsBlocked: constraintSet.blocked.length,
    // Hard outcomes only. `totalWeightedDeviation` is not consulted here and
    // must never be: that single line is Principle 5.
    feasible: violated.length === 0,
    violatedRuleIds: violated.map((o) => o.ruleId),
  };

  const claims = buildClaimStatement({
    selfConsistency: {
      invariants: input.invariants,
      hardConstraintsChecked: summary.hardChecked,
      hardConstraintsViolated: summary.hardViolated,
    },
    ruleCoverage: {
      encoded: encodedRuleCount(constraintSet),
      applicable: applicableRuleCount(constraintSet),
      deferred: deferredConstraints,
    },
    geometry: input.geometry,
    professionalAgreement: input.professionalAgreement,
  });
  // The validator's own output is subject to the same gate as anyone else's.
  assertClaimStatementHonest(claims);

  return {
    runId: configuration.runId,
    engineVersion: configuration.engineVersion,
    ruleSetHash: configuration.ruleSetHash,
    validatedAt: input.validatedAt,
    outcomes: [...hardOutcomes, ...softOutcomes, ...deferredOutcomes],
    summary,
    claims,
    claimLines: claimStatementLines(claims),
    independenceLimit: INDEPENDENCE_LIMIT,
    selfConsistencyNotice: SELF_CONSISTENCY_IS_NOT_COMPLIANCE,
    emissionBlocked: emissionBlockers(summary, notEvaluableOutcomes, input),
  };
}

/**
 * Why this configuration may not be emitted.
 *
 * The distinction that matters here: a `NO_OBSERVATION` gap is a **declared
 * deferral** — we did not check it, we said so, and the report carries it. A
 * `UNIT_MISMATCH`, `KIND_MISMATCH` or `UNDEFINED_AREA_TERM` is an **encoding
 * defect** — the rule and the value disagree about what is being measured, and
 * nothing downstream can be trusted while that is true.
 */
function emissionBlockers(
  summary: ValidationSummary,
  notEvaluableOutcomes: readonly HardOutcome[],
  input: ValidationInput,
): readonly string[] {
  const blockers: string[] = [];

  if (summary.hardViolated > 0) {
    blockers.push(
      `${summary.hardViolated} hard constraint(s) violated ` +
        `(${summary.violatedRuleIds.join(', ')}). §16.1: a hard constraint is a ` +
        `feasibility filter — a violating configuration is never emitted.`,
    );
  }
  for (const outcome of notEvaluableOutcomes) {
    if (outcome.reason === NotEvaluableReason.NO_OBSERVATION) continue;
    blockers.push(`${outcome.constraintId}: ${outcome.reason}. ${outcome.statement}`);
  }
  for (const blocked of input.constraintSet.blocked) {
    // The status is re-checked rather than trusted. A validator that assumes the
    // upstream partition is correct has assumed away the class of bug it exists
    // to find, and a `RESOLVED` resolution sitting in the blocked list is
    // exactly the kind of mis-partition that would otherwise pass unremarked.
    const recognised = BLOCKED_RESOLUTION_STATUSES.includes(blocked.status);
    blockers.push(
      `${blocked.parameterId} halted at ${blocked.status}` +
        `${blocked.conflict === undefined ? '' : `: ${blocked.conflict.reason}`} ` +
        `(§11.6 — the system does not silently resolve a conflict it has no defined ` +
        `order for).` +
        `${
          recognised
            ? ''
            : ` Note: ${blocked.status} is not a halting status, so the constraint ` +
              `set's own partitioning is inconsistent and must be investigated.`
        }`,
    );
  }
  if (input.invariants.failed > 0) {
    blockers.push(
      `${input.invariants.failed} invariant(s) failed ` +
        `(${input.invariants.failedIds.join(', ')}). §12.3 — invariant failure blocks ` +
        `emission, never a warning and never a configurable severity.`,
    );
  }
  if (input.geometry.topologyChecked && !input.geometry.topologyValid) {
    blockers.push('geometry is not topologically valid (§14.3).');
  }
  if (input.geometry.areaDisagreements > 0) {
    blockers.push(
      `${input.geometry.areaDisagreements} independent area recomputation(s) disagreed. ` +
        `§14.3 classes this a P0 defect, not a rounding note.`,
    );
  }
  return blockers;
}

/** Raised when something tries to emit a configuration validation refused. */
export class EmissionBlockedError extends Error {
  override readonly name = 'EmissionBlockedError';
  constructor(readonly reasons: readonly string[]) {
    super(
      `emission blocked by ${reasons.length} finding(s): ${reasons.join(' | ')} ` +
        `Principle 3 — failure blocks emission. There is no severity flag that ` +
        `downgrades any of these.`,
    );
  }
}

/**
 * Gate on the export path. Throws unless the report is publishable.
 *
 * Separate from {@link validateConfiguration} on purpose: a report that blocks
 * emission still has to be *readable*, because the whole value of it is telling
 * someone what went wrong. Producing the report never throws; publishing it does.
 */
export function assertEmittable(report: ValidationReport): void {
  if (report.emissionBlocked.length > 0) {
    throw new EmissionBlockedError(report.emissionBlocked);
  }
}

// ---------------------------------------------------------------------------
// The contradiction battery — PRD §16.2. PHASE 1. NOT WIRED.
// ---------------------------------------------------------------------------

/**
 * §16.2's six pre-computation checks, "run before any computation".
 *
 * **These are Phase 1 and none of them is wired.** They are defined now, with
 * real signatures and real input types, because the shape of the inputs is what
 * Phase 1 has to land on and because §16.2's checks read on a *brief* — target
 * GFA, target unit count, target floors — which Phase 0 has no entity for
 * (`docs/03-analysis/open-questions.md` Q20: there is no functional requirement,
 * no entity and no input field for unit mix or unit areas anywhere in the PRD).
 * Writing the arithmetic before the brief entity exists would mean guessing at
 * the field names it will have.
 *
 * **Every stub throws.** A stub that returns `null` — "no contradiction found" —
 * is a false all-clear, and a false all-clear from a contradiction battery is
 * the precise failure §12.1 describes in V1: "nothing caught any of it". These
 * throw {@link PhaseOneNotWiredError} so that wiring one up is a deliberate act
 * and calling one by accident is loud.
 *
 * {@link validateConfiguration} does not call them.
 */
export const ContradictionCheckId = {
  TARGET_GFA_VS_UNIT_PROGRAMME: 'TARGET_GFA_VS_UNIT_PROGRAMME',
  TARGET_UNIT_COUNT_VS_BAND_A: 'TARGET_UNIT_COUNT_VS_BAND_A',
  TARGET_FLOORS_VS_HEIGHT_BUDGET: 'TARGET_FLOORS_VS_HEIGHT_BUDGET',
  PARKING_IMPLIED_AREA_VS_SUPPLY: 'PARKING_IMPLIED_AREA_VS_SUPPLY',
  TARGET_SELLABLE_VS_EFFICIENCY_CEILING: 'TARGET_SELLABLE_VS_EFFICIENCY_CEILING',
  TARGET_GFA_VS_BAND_A: 'TARGET_GFA_VS_BAND_A',
} as const;
export type ContradictionCheckId =
  (typeof ContradictionCheckId)[keyof typeof ContradictionCheckId];

/**
 * §16.2: "Each failure names the incompatible pair and quantifies the
 * shortfall." Both are structural here — `incompatiblePair` and `shortfall` are
 * required fields, so a finding that names neither cannot be constructed.
 */
export interface ContradictionFinding {
  readonly checkId: ContradictionCheckId;
  readonly incompatiblePair: readonly [string, string];
  readonly shortfall: Decimal;
  readonly unit: string;
  readonly statement: string;
}

/** `null` means the pair is compatible. No stub may return it — they throw. */
export type ContradictionCheck<TInput> = (input: TInput) => ContradictionFinding | null;

export class PhaseOneNotWiredError extends Error {
  override readonly name = 'PhaseOneNotWiredError';
  constructor(readonly checkId: ContradictionCheckId) {
    super(
      `contradiction check ${checkId} is defined for Phase 1 and is not wired. ` +
        `PRD §16.2 marks the battery Phase 1; Phase 0 has no brief entity to read ` +
        `targets from (open-questions.md Q20). It throws rather than returning "no ` +
        `contradiction", because a contradiction battery that silently passes is the ` +
        `V1 failure §12.1 describes.`,
    );
  }
}

/** `target_gfa` vs `units × mix × min_unit_area / target_efficiency`. */
export interface TargetGfaVsUnitProgramme {
  readonly targetGfaM2: Decimal;
  readonly unitCount: number;
  /** Share and minimum area per unit type. Shares must sum to 1 (INV-05). */
  readonly mix: readonly { readonly typeId: string; readonly share: Decimal }[];
  readonly minUnitAreaM2ByType: Readonly<Record<string, Decimal>>;
  readonly targetEfficiency: Decimal;
}

/** `target_unit_count` vs `band_A_gfa / weighted_mean_unit_area`. */
export interface TargetUnitCountVsBandA {
  readonly targetUnitCount: number;
  readonly bandAGfaM2: Decimal;
  readonly weightedMeanUnitNsaM2: Decimal;
  readonly targetEfficiency: Decimal;
}

/** `target_floors` vs `height_ceiling / min_floor_to_floor`. */
export interface TargetFloorsVsHeightBudget {
  readonly targetFloors: number;
  readonly heightCeilingM: Decimal;
  readonly minFloorToFloorM: Decimal;
}

/** `parking_implied_area` vs `available_levels × footprint × usable_fraction`. */
export interface ParkingImpliedAreaVsSupply {
  readonly parkingImpliedAreaM2: Decimal;
  readonly availableLevels: number;
  readonly footprintM2: Decimal;
  readonly usableFraction: Decimal;
}

/** `target_sellable` vs `target_gfa × max_plausible_efficiency`. */
export interface TargetSellableVsEfficiencyCeiling {
  readonly targetSellableM2: Decimal;
  readonly targetGfaM2: Decimal;
  readonly maxPlausibleEfficiency: Decimal;
}

/** `target_gfa` vs `band_A_gfa`. */
export interface TargetGfaVsBandA {
  readonly targetGfaM2: Decimal;
  readonly bandAGfaM2: Decimal;
}

/** PHASE 1 — not wired. Throws. See {@link CONTRADICTION_BATTERY}. */
export const checkTargetGfaVsUnitProgramme: ContradictionCheck<TargetGfaVsUnitProgramme> = () => {
  throw new PhaseOneNotWiredError(ContradictionCheckId.TARGET_GFA_VS_UNIT_PROGRAMME);
};

/** PHASE 1 — not wired. Throws. See {@link CONTRADICTION_BATTERY}. */
export const checkTargetUnitCountVsBandA: ContradictionCheck<TargetUnitCountVsBandA> = () => {
  throw new PhaseOneNotWiredError(ContradictionCheckId.TARGET_UNIT_COUNT_VS_BAND_A);
};

/** PHASE 1 — not wired. Throws. See {@link CONTRADICTION_BATTERY}. */
export const checkTargetFloorsVsHeightBudget: ContradictionCheck<
  TargetFloorsVsHeightBudget
> = () => {
  throw new PhaseOneNotWiredError(ContradictionCheckId.TARGET_FLOORS_VS_HEIGHT_BUDGET);
};

/** PHASE 1 — not wired. Throws. See {@link CONTRADICTION_BATTERY}. */
export const checkParkingImpliedAreaVsSupply: ContradictionCheck<
  ParkingImpliedAreaVsSupply
> = () => {
  throw new PhaseOneNotWiredError(ContradictionCheckId.PARKING_IMPLIED_AREA_VS_SUPPLY);
};

/** PHASE 1 — not wired. Throws. See {@link CONTRADICTION_BATTERY}. */
export const checkTargetSellableVsEfficiencyCeiling: ContradictionCheck<
  TargetSellableVsEfficiencyCeiling
> = () => {
  throw new PhaseOneNotWiredError(ContradictionCheckId.TARGET_SELLABLE_VS_EFFICIENCY_CEILING);
};

/** PHASE 1 — not wired. Throws. See {@link CONTRADICTION_BATTERY}. */
export const checkTargetGfaVsBandA: ContradictionCheck<TargetGfaVsBandA> = () => {
  throw new PhaseOneNotWiredError(ContradictionCheckId.TARGET_GFA_VS_BAND_A);
};

/**
 * The battery as a table: what each check compares, in §16.2's order.
 *
 * The table is data and can be printed today — "these six checks exist and are
 * not yet run" is a publishable fact and belongs in the deferred-check list.
 * The functions themselves are not reachable from this table on purpose: they
 * take six different input types, and a uniform `run()` would need a union that
 * Phase 1 will immediately outgrow once the brief entity exists.
 */
export const CONTRADICTION_BATTERY: readonly {
  readonly checkId: ContradictionCheckId;
  readonly incompatiblePair: readonly [string, string];
  readonly phase: 1;
  readonly wired: false;
}[] = [
  {
    checkId: ContradictionCheckId.TARGET_GFA_VS_UNIT_PROGRAMME,
    incompatiblePair: ['target_gfa', 'units × mix × min_unit_area / target_efficiency'],
    phase: 1,
    wired: false,
  },
  {
    checkId: ContradictionCheckId.TARGET_UNIT_COUNT_VS_BAND_A,
    incompatiblePair: ['target_unit_count', 'band_A_gfa / weighted_mean_unit_area'],
    phase: 1,
    wired: false,
  },
  {
    checkId: ContradictionCheckId.TARGET_FLOORS_VS_HEIGHT_BUDGET,
    incompatiblePair: ['target_floors', 'height_ceiling / min_floor_to_floor'],
    phase: 1,
    wired: false,
  },
  {
    checkId: ContradictionCheckId.PARKING_IMPLIED_AREA_VS_SUPPLY,
    incompatiblePair: [
      'parking_implied_area',
      'available_levels × footprint × usable_fraction',
    ],
    phase: 1,
    wired: false,
  },
  {
    checkId: ContradictionCheckId.TARGET_SELLABLE_VS_EFFICIENCY_CEILING,
    incompatiblePair: ['target_sellable', 'target_gfa × max_plausible_efficiency'],
    phase: 1,
    wired: false,
  },
  {
    checkId: ContradictionCheckId.TARGET_GFA_VS_BAND_A,
    incompatiblePair: ['target_gfa', 'band_A_gfa'],
    phase: 1,
    wired: false,
  },
];

/**
 * Restated here because a reader of the constraint-set resolution needs it: a
 * parameter that halted (`REQUIRES_ADJUDICATION`, `IRRECONCILABLE`) produces no
 * hard outcome at all rather than a failed one. `FR-VAL-001 AC2` requires every
 * result to cite its rule, and a halted parameter has two or more rules and no
 * governing one — there is no honest single citation to attach. It is reported
 * as an emission blocker instead, naming every rule involved.
 */
export const BLOCKED_RESOLUTION_STATUSES: readonly ResolutionStatus[] = [
  ResolutionStatus.REQUIRES_ADJUDICATION,
  ResolutionStatus.IRRECONCILABLE,
];
