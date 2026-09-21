/**
 * The three constraint categories — PRD §16.1, and Principle 5.
 *
 * §16.1's table, which this file encodes:
 *
 * | Category | Definition | Behaviour |
 * |---|---|---|
 * | `HARD` | Must not be violated | Feasibility filter; violating candidates are never emitted |
 * | `SOFT` | Preferred; deviation scored | Optimized; deviation reported |
 * | `DEFERRED` | Applicable but not checkable at this fidelity | Declared explicitly in every output |
 *
 * **Principle 5 is enforced by the shape of the types, not by a comment.**
 * "Hard constraints separated from soft preferences — distinct types; hard
 * constraints are feasibility filters, never penalty terms." So:
 *
 * * {@link HardConstraint} has no `weight`, no `penalty` and no score of any
 *   kind. There is nowhere to put one. A hard constraint answers yes or no.
 * * {@link SoftPreference} has a `weight` and no `citation`, no `ruleId` and no
 *   `isLifeSafety`. It is not a rule; it cannot become one by being weighted
 *   heavily; and nothing downstream may read a soft deviation into feasibility.
 *
 * V1's failure mode, which this prevents: a hard constraint expressed as a large
 * penalty term is a hard constraint you can buy your way out of, and the price
 * is invisible in the output. A 5.25 m setback with weight 10,000 still yields
 * 5.24 m if enough other terms push. The type system here makes that
 * unexpressible.
 *
 * ---
 *
 * **What this module reads, and what it deliberately does not call.**
 *
 * §16.3: "Validator shares no evaluation code with the generator; separate
 * module, separate owner, import-linted." The line drawn here, and it is a fine
 * one worth stating exactly:
 *
 * * The validator reads the **materialized constraint set** — `ConstraintSet`,
 *   which is data: resolved bounds, their governing rule, their citations. That
 *   is the thing being validated against, and §16.4 says so explicitly.
 * * The validator never calls `evaluate`, `resolveParameter` or `materialize`.
 *   Re-running the generator's resolution and then agreeing with it would be a
 *   tautology dressed as a check.
 * * Reading `Operator.MIN` to learn that a bound is a floor is reading the
 *   constraint set's own vocabulary, not sharing an implementation. The
 *   comparison arithmetic in `validate.ts` is written independently here.
 */

import type { Citation, Decimal } from '@envelope/core';
import {
  type ConstraintSet,
  type Operator,
  ResolutionStatus,
  RuleClass,
  type RuleRecord,
  type RuleValue,
} from '@envelope/rules';

/** PRD §16.1. Three categories, no fourth, no per-project severity dial. */
export const ConstraintCategory = {
  HARD: 'HARD',
  SOFT: 'SOFT',
  DEFERRED: 'DEFERRED',
} as const;
export type ConstraintCategory = (typeof ConstraintCategory)[keyof typeof ConstraintCategory];

/** §16.1's `Definition` column, verbatim. Printed in the validation report. */
export const CATEGORY_DEFINITION: Readonly<Record<ConstraintCategory, string>> = {
  HARD: 'Must not be violated',
  SOFT: 'Preferred; deviation scored',
  DEFERRED: 'Applicable but not checkable at this fidelity',
};

/** §16.1's `Behaviour` column, verbatim. */
export const CATEGORY_BEHAVIOUR: Readonly<Record<ConstraintCategory, string>> = {
  HARD: 'Feasibility filter; violating candidates are never emitted',
  SOFT: 'Optimized; deviation reported',
  DEFERRED: 'Declared explicitly in every output',
};

// ---------------------------------------------------------------------------
// HARD
// ---------------------------------------------------------------------------

/**
 * A constraint that must not be violated.
 *
 * Every field here comes from the resolved constraint set: the bound, the rule
 * that produced it, and the clause that rule cites. `FR-VAL-001 AC2` — "every
 * result cites its rule" — is met because there is no way to build one of these
 * without a `Citation`.
 *
 * `supersededRuleIds` carries the candidates that lost overlap resolution
 * (§11.5 step 3). The validator reports them so that a reader can see the check
 * was made against the *governing* rule and which others were in play — a
 * validation report that names only the winner hides the most interesting part
 * of the resolution.
 *
 * There is no `weight` field. Adding one would be a defect, not a feature.
 */
export interface HardConstraint {
  readonly category: typeof ConstraintCategory.HARD;
  /** Stable within a run: `<parameterId>@<ruleId>`. */
  readonly constraintId: string;
  readonly parameterId: string;
  readonly ruleId: string;
  readonly operator: Operator;
  readonly bound: RuleValue;
  readonly unit: string;
  readonly isLifeSafety: boolean;
  readonly citation: Citation;
  readonly supersededRuleIds: readonly string[];
}

// ---------------------------------------------------------------------------
// SOFT
// ---------------------------------------------------------------------------

/** What direction a preference pulls in. Decides how deviation is measured. */
export const PreferenceDirection = {
  /** Higher is better; falling short of `target` is the deviation. */
  MAXIMIZE: 'MAXIMIZE',
  /** Lower is better; exceeding `target` is the deviation. */
  MINIMIZE: 'MINIMIZE',
  /** `target` is the wanted value; deviation is symmetric about it. */
  TARGET: 'TARGET',
} as const;
export type PreferenceDirection =
  (typeof PreferenceDirection)[keyof typeof PreferenceDirection];

/**
 * A preference. Scored, reported, and structurally incapable of deciding
 * feasibility.
 *
 * Note what is absent: no `citation`, no `ruleId`, no `isLifeSafety`. A
 * preference is a project objective, not a regulation, and the type refuses to
 * let one masquerade as the other. If something has a citation it belongs in
 * the rule base and comes out as a {@link HardConstraint} or a deferral.
 *
 * `rationale` is mandatory for the same reason `assumed()` demands a basis: a
 * preference nobody can justify in a sentence is a number somebody guessed.
 */
export interface SoftPreference {
  readonly category: typeof ConstraintCategory.SOFT;
  readonly preferenceId: string;
  readonly parameterId: string;
  readonly label: string;
  readonly direction: PreferenceDirection;
  readonly target: Decimal;
  /** Relative importance among preferences only. Never compared to a rule. */
  readonly weight: Decimal;
  readonly rationale: string;
}

// ---------------------------------------------------------------------------
// DEFERRED
// ---------------------------------------------------------------------------

/**
 * A rule that applies and was not checked.
 *
 * §16.1: "Declared explicitly in every output." PRD §3.4 item 8 makes the
 * deferred-check list a required part of every artifact. The point of this type
 * existing at all is that "we did not check this" becomes a published fact with
 * a citation attached rather than an absence nobody notices.
 *
 * `isLifeSafety` is carried because a deferred life-safety rule is a different
 * conversation from a deferred façade-finish rule, and a reader must be able to
 * sort on it.
 */
export interface DeferredConstraint {
  readonly category: typeof ConstraintCategory.DEFERRED;
  readonly ruleId: string;
  readonly parameterId: string;
  /** Why it was not checkable at this fidelity, in words a reader can act on. */
  readonly reason: string;
  readonly citation: Citation;
  readonly isLifeSafety: boolean;
}

/** Everything the validator can hold, discriminated by {@link ConstraintCategory}. */
export type Constraint = HardConstraint | SoftPreference | DeferredConstraint;

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

function assertNever(x: never, context: string): never {
  throw new Error(`${context}: unhandled variant ${JSON.stringify(x)}`);
}

/**
 * Map a rule class (§11.3) onto a validation category (§16.1).
 *
 * `GENERATIVE` and `FILTERING` are both HARD — one builds the envelope and the
 * other prunes candidates, but neither may be violated by an emitted answer.
 *
 * **`EVALUATIVE_ONLY` maps to `DEFERRED`, and that deserves the explanation.**
 * `FR-VAL-001` lists the evaluative set among the validator's inputs, which
 * reads as though the validator checks it. It cannot, at Phase 0 fidelity: an
 * evaluative-only rule is "assessable only after a candidate exists" (§11.3),
 * and Phase 0 produces no floorplate, no core and no unit layout to assess
 * (§3.2 — see also `docs/03-analysis/open-questions.md` Q9, "does he accept that
 * Phase 0 draws nothing?"). §16.1's own definition of DEFERRED is exactly this
 * situation: "applicable but not checkable at this fidelity". Silently emitting
 * `SATISFIED` for a travel-distance rule that nothing measured would be the
 * single most dishonest thing this package could do.
 *
 * When Phase 2.5 produces a massing with a core and a typical floor, these rules
 * become genuinely checkable and this mapping is the one line that changes.
 *
 * No rule class maps to `SOFT`: soft preferences never come from the rule base.
 * They arrive from the brief, as {@link SoftPreference} records.
 */
export function categoryForRuleClass(ruleClass: RuleClass): ConstraintCategory {
  switch (ruleClass) {
    case RuleClass.GENERATIVE:
    case RuleClass.FILTERING:
      return ConstraintCategory.HARD;
    case RuleClass.EVALUATIVE_ONLY:
    case RuleClass.DEFERRED:
      return ConstraintCategory.DEFERRED;
    default:
      return assertNever(ruleClass, 'categoryForRuleClass');
  }
}

/** Why a given rule was deferred, phrased for the deferred-check list. */
function deferralReason(rule: RuleRecord): string {
  switch (rule.ruleClass) {
    case RuleClass.DEFERRED:
      return (
        `rule class DEFERRED (§11.3): applicable but not mechanizable at this ` +
        `fidelity. Mechanization: ${rule.mechanization}. It is declared here and ` +
        `was not assessed.`
      );
    case RuleClass.EVALUATIVE_ONLY:
      return (
        `rule class EVALUATIVE_ONLY (§11.3): assessable only against a candidate ` +
        `artifact — a floorplate, a core, an egress layout — which Phase 0 does not ` +
        `produce. There is nothing to measure it against, so it is declared, not checked.`
      );
    case RuleClass.GENERATIVE:
    case RuleClass.FILTERING:
      return (
        `rule ${rule.ruleId} is ${rule.ruleClass} and should have been checked as a ` +
        `hard constraint. Reaching this branch means the constraint set carried it ` +
        `into the deferred list, which is a defect in the caller.`
      );
    default:
      return assertNever(rule.ruleClass, 'deferralReason');
  }
}

/** One line naming a constraint and its §16.1 behaviour. Used by the report. */
export function describeConstraint(constraint: Constraint): string {
  switch (constraint.category) {
    case ConstraintCategory.HARD:
      return (
        `HARD ${constraint.parameterId} (${constraint.ruleId}, ` +
        `${constraint.citation.instrumentId} ${constraint.citation.clauseReference}) — ` +
        `${CATEGORY_BEHAVIOUR.HARD}`
      );
    case ConstraintCategory.SOFT:
      return (
        `SOFT ${constraint.parameterId} (${constraint.preferenceId}, ` +
        `${constraint.direction} ${constraint.target.toString()}, weight ` +
        `${constraint.weight.toString()}) — ${CATEGORY_BEHAVIOUR.SOFT}`
      );
    case ConstraintCategory.DEFERRED:
      return (
        `DEFERRED ${constraint.parameterId} (${constraint.ruleId}` +
        `${constraint.isLifeSafety ? ', LIFE SAFETY' : ''}) — ${constraint.reason}`
      );
    default:
      return assertNever(constraint, 'describeConstraint');
  }
}

// ---------------------------------------------------------------------------
// Extraction from the materialized constraint set
// ---------------------------------------------------------------------------

/**
 * The hard constraints implied by a resolved constraint set.
 *
 * Only `RESOLVED` parameters yield a constraint. A `NOT_GOVERNED` parameter is
 * not a constraint that passes — it is a parameter no rule speaks to, and
 * pretending otherwise inflates the satisfied count with checks that never
 * happened. `REQUIRES_ADJUDICATION` and `IRRECONCILABLE` parameters are handled
 * separately in `validate.ts`, because §11.6 says the run halts rather than
 * producing a validated answer.
 */
export function hardConstraintsFrom(set: ConstraintSet): readonly HardConstraint[] {
  const out: HardConstraint[] = [];
  for (const [parameterId, resolution] of set.resolutions) {
    if (resolution.status !== ResolutionStatus.RESOLVED) continue;
    const governing = resolution.governing;
    // RESOLVED implies a governing candidate; the guard exists because the
    // field is optional on the type and a validator may not assume the
    // generator's invariants hold — that assumption is the bug class this
    // module is here to catch.
    if (governing === undefined) continue;
    const rule = governing.rule;
    if (categoryForRuleClass(rule.ruleClass) !== ConstraintCategory.HARD) continue;
    out.push({
      category: ConstraintCategory.HARD,
      constraintId: `${parameterId}@${rule.ruleId}`,
      parameterId,
      ruleId: rule.ruleId,
      operator: rule.operator,
      bound: governing.value,
      unit: rule.unit,
      isLifeSafety: rule.isLifeSafety,
      citation: rule.citation,
      supersededRuleIds: resolution.superseded.map((c) => c.rule.ruleId),
    });
  }
  return out;
}

/**
 * The deferred-check list implied by a resolved constraint set.
 *
 * Both partitions land here: rules classified `DEFERRED`, and rules classified
 * `EVALUATIVE_ONLY` that Phase 0 has no artifact to evaluate. See
 * {@link categoryForRuleClass} for why the second group is a deferral rather
 * than a check that quietly passes.
 */
export function deferredConstraintsFrom(set: ConstraintSet): readonly DeferredConstraint[] {
  const rules: readonly RuleRecord[] = [...set.deferred, ...set.evaluative];
  return rules.map((rule) => ({
    category: ConstraintCategory.DEFERRED,
    ruleId: rule.ruleId,
    parameterId: rule.parameterId,
    reason: deferralReason(rule),
    citation: rule.citation,
    isLifeSafety: rule.isLifeSafety,
  }));
}

/**
 * Every rule the constraint set identified as applicable, deferrals included.
 *
 * This is the denominator of the rule-coverage claim (§16.5), and it is a
 * denominator we authored — see {@link buildClaimStatement} in `claims.ts` for
 * why that keeps the claim at `PARTIAL` however good the ratio looks.
 */
export function applicableRuleCount(set: ConstraintSet): number {
  return (
    set.generative.length + set.filtering.length + set.evaluative.length + set.deferred.length
  );
}

/** Applicable rules the engine actually evaluated — the numerator of coverage. */
export function encodedRuleCount(set: ConstraintSet): number {
  return set.generative.length + set.filtering.length;
}
