/**
 * Applicability matching and overlap resolution — PRD §11.5 and §11.6.
 *
 * §11.6 is the section that fixed V1's worst latent bug: V1 asserted "most
 * restrictive wins" without defining the order, which is undefined for
 * enumerations, topological rules and incommensurable units, and "would have
 * produced arbitrary behaviour at runtime".
 *
 * The rule that governs this whole file: **the system never silently resolves a
 * conflict it has no defined order for.** Where no order exists it halts and
 * asks a human; where the constraints are jointly impossible it reports
 * infeasibility naming both rules. It does not pick one.
 */

import { Decimal } from '@envelope/core';

import {
  evaluate,
  isNotApplicable,
  type EvalContext,
  type RuleValue,
} from './evaluators.js';
import { Operator, type Applicability, type Comparison, type RuleRecord, type Term } from './record.js';

// ---------------------------------------------------------------------------
// Applicability
// ---------------------------------------------------------------------------

function compare(actual: unknown, cmp: Comparison): boolean {
  if ('eq' in cmp) return actual === cmp.eq;
  if ('ne' in cmp) return actual !== cmp.ne;
  if ('in' in cmp) return cmp.in.includes(actual as string | number);
  if ('nin' in cmp) return !cmp.nin.includes(actual as string | number);
  if ('exists' in cmp) return (actual !== undefined && actual !== null) === cmp.exists;
  if (typeof actual !== 'number') return false;
  if ('gt' in cmp) return actual > cmp.gt;
  if ('gte' in cmp) return actual >= cmp.gte;
  if ('lt' in cmp) return actual < cmp.lt;
  if ('lte' in cmp) return actual <= cmp.lte;
  return false;
}

function readPath(ctx: EvalContext, path: string): unknown {
  let cur: unknown = ctx;
  for (const seg of path.split('.')) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

function isApplicabilityNode(n: Term | Applicability): n is Applicability {
  return 'all' in n || 'any' in n || 'not' in n || 'always' in n;
}

function matchTerm(term: Term, ctx: EvalContext): boolean {
  return Object.entries(term).every(([path, cmp]) => compare(readPath(ctx, path), cmp));
}

/** Whether a rule applies in this context. Pure, side-effect free, testable alone. */
export function isApplicable(applicability: Applicability, ctx: EvalContext): boolean {
  if ('always' in applicability) return true;
  if ('all' in applicability) {
    return applicability.all.every((n) =>
      isApplicabilityNode(n) ? isApplicable(n, ctx) : matchTerm(n, ctx),
    );
  }
  if ('any' in applicability) {
    return applicability.any.some((n) =>
      isApplicabilityNode(n) ? isApplicable(n, ctx) : matchTerm(n, ctx),
    );
  }
  const inner = applicability.not;
  return !(isApplicabilityNode(inner) ? isApplicable(inner, ctx) : matchTerm(inner, ctx));
}

// ---------------------------------------------------------------------------
// Resolution outcomes
// ---------------------------------------------------------------------------

export const ResolutionStatus = {
  /** A governing rule was determined by a defined order. */
  RESOLVED: 'RESOLVED',
  /** No rule applied. Not an error — the parameter is simply ungoverned here. */
  NOT_GOVERNED: 'NOT_GOVERNED',
  /**
   * No order exists between the candidates. Computation for this parameter
   * halts until a human authors an `AdjudicationRecord` (§11.6).
   */
  REQUIRES_ADJUDICATION: 'REQUIRES_ADJUDICATION',
  /**
   * The candidates are jointly unsatisfiable. The system reports infeasibility
   * naming both rules — it does not pick one (§11.6).
   */
  IRRECONCILABLE: 'IRRECONCILABLE',
} as const;
export type ResolutionStatus = (typeof ResolutionStatus)[keyof typeof ResolutionStatus];

export interface Candidate {
  readonly rule: RuleRecord;
  readonly value: RuleValue;
}

export interface Resolution {
  readonly parameterId: string;
  readonly status: ResolutionStatus;
  /** Present when `RESOLVED`. */
  readonly governing?: Candidate;
  /** Every candidate that lost, for the `supersededBy` edges §11.5 step 3 requires. */
  readonly superseded: readonly Candidate[];
  /** Present when `REQUIRES_ADJUDICATION` or `IRRECONCILABLE`. */
  readonly conflict?: {
    readonly reason: string;
    readonly rules: readonly string[];
  };
  /** Rules that applied but whose class means they cannot produce a value here. */
  readonly deferred: readonly RuleRecord[];
}

/**
 * A plot-specific instrument — a Development Control Regulation, an affection
 * plan condition — applied to *this* plot. §11.5 step 1 gives it precedence
 * "because it is the instrument that applies the general framework to this plot".
 */
export function isPlotSpecific(rule: RuleRecord): boolean {
  return rule.jurisdiction.startsWith('PLOT:') || rule.jurisdiction.startsWith('DCR:');
}

// ---------------------------------------------------------------------------
// Resolution — §11.5, §11.6
// ---------------------------------------------------------------------------

/**
 * Resolve every applicable rule for one parameter into a single governing value.
 *
 * The order of business matters and follows §11.5 exactly:
 * 1. plot-specific instrument governs — **except** it may not relax life safety;
 * 2. otherwise most restrictive across authorities;
 * 3. every loser is recorded and remains visible to the user.
 */
export function resolveParameter(
  parameterId: string,
  rules: readonly RuleRecord[],
  ctx: EvalContext,
): Resolution {
  const applicable = rules.filter(
    (r) => r.parameterId === parameterId && isApplicable(r.applicability, ctx),
  );

  const deferred = applicable.filter((r) => r.ruleClass === 'DEFERRED');
  const evaluable = applicable.filter((r) => r.ruleClass !== 'DEFERRED');

  const candidates: Candidate[] = [];
  for (const rule of evaluable) {
    const value = evaluate(rule, ctx);
    if (isNotApplicable(value)) continue;
    candidates.push({ rule, value });
  }

  if (candidates.length === 0) {
    return { parameterId, status: ResolutionStatus.NOT_GOVERNED, superseded: [], deferred };
  }
  if (candidates.length === 1) {
    return {
      parameterId,
      status: ResolutionStatus.RESOLVED,
      governing: candidates[0]!,
      superseded: [],
      deferred,
    };
  }

  // --- §11.5 step 1: a plot-specific instrument governs ---
  const plotSpecific = candidates.filter((c) => isPlotSpecific(c.rule));
  if (plotSpecific.length === 1) {
    const winner = plotSpecific[0]!;
    const others = candidates.filter((c) => c !== winner);

    // The exception, and the only place a life-safety rule appears in resolution:
    // a plot-specific instrument may tighten a life-safety parameter but may
    // never relax one. The PRD states the exception without saying what happens
    // when it fires — halting for adjudication is the only choice consistent
    // with "never silently resolve a conflict".
    const relaxedLifeSafety = others.filter(
      (c) => c.rule.isLifeSafety && relaxes(winner.value, c.value, c.rule.operator),
    );
    if (relaxedLifeSafety.length > 0) {
      return {
        parameterId,
        status: ResolutionStatus.REQUIRES_ADJUDICATION,
        superseded: [],
        deferred,
        conflict: {
          reason:
            `plot-specific instrument ${winner.rule.ruleId} would relax the life-safety ` +
            `rule(s) ${relaxedLifeSafety.map((c) => c.rule.ruleId).join(', ')}. ` +
            `§11.5 forbids this and does not say what to do instead, so the system ` +
            `halts rather than choosing. A human must adjudicate.`,
          rules: [winner.rule.ruleId, ...relaxedLifeSafety.map((c) => c.rule.ruleId)],
        },
      };
    }

    return {
      parameterId,
      status: ResolutionStatus.RESOLVED,
      governing: winner,
      superseded: others,
      deferred,
    };
  }

  // --- §11.5 step 2 / §11.6: most restrictive, where an order exists ---
  return byPartialOrder(parameterId, candidates, deferred);
}

/** Whether `a` is less restrictive than `b` under `operator`. */
function relaxes(a: RuleValue, b: RuleValue, operator: Operator): boolean {
  if (a.kind !== 'scalar' || b.kind !== 'scalar') return false;
  return operator === Operator.MIN ? a.value.lt(b.value) : a.value.gt(b.value);
}

function byPartialOrder(
  parameterId: string,
  candidates: readonly Candidate[],
  deferred: readonly RuleRecord[],
): Resolution {
  const kinds = new Set(candidates.map((c) => c.value.kind));
  const operators = new Set(candidates.map((c) => c.rule.operator));
  const ruleIds = candidates.map((c) => c.rule.ruleId);

  // Mixed value kinds are incommensurable by construction.
  if (kinds.size > 1) {
    return {
      parameterId,
      status: ResolutionStatus.REQUIRES_ADJUDICATION,
      superseded: [],
      deferred,
      conflict: {
        reason:
          `candidates for ${parameterId} return different value kinds ` +
          `(${[...kinds].join(', ')}). §11.6: comparable only within a fixed context; ` +
          `no order exists here.`,
        rules: ruleIds,
      },
    };
  }

  const kind = [...kinds][0]!;

  // --- Scalar with MIN/MAX: total order, automatic ---
  if (kind === 'scalar') {
    if (operators.size > 1) {
      return {
        parameterId,
        status: ResolutionStatus.REQUIRES_ADJUDICATION,
        superseded: [],
        deferred,
        conflict: {
          reason:
            `candidates for ${parameterId} mix ${[...operators].join(' and ')} operators. ` +
            `"Most restrictive" is undefined across a floor and a ceiling — they are ` +
            `different assertions about the same parameter.`,
          rules: ruleIds,
        },
      };
    }
    const op = [...operators][0]!;
    if (op === Operator.EXACT) {
      const distinct = new Set(
        candidates.map((c) => (c.value as { value: Decimal }).value.toString()),
      );
      if (distinct.size > 1) {
        return {
          parameterId,
          status: ResolutionStatus.IRRECONCILABLE,
          superseded: [],
          deferred,
          conflict: {
            reason:
              `two rules assert different EXACT values for ${parameterId} ` +
              `(${[...distinct].join(', ')}). No configuration satisfies both. ` +
              `The system reports infeasibility naming both rules; it does not pick one.`,
            rules: ruleIds,
          },
        };
      }
      return resolved(parameterId, candidates[0]!, candidates.slice(1), deferred);
    }

    // MIN → the maximum value is most restrictive; MAX → the minimum.
    const sorted = [...candidates].sort((a, b) => {
      const av = (a.value as { value: Decimal }).value;
      const bv = (b.value as { value: Decimal }).value;
      return op === Operator.MIN ? bv.comparedTo(av) : av.comparedTo(bv);
    });
    return resolved(parameterId, sorted[0]!, sorted.slice(1), deferred);
  }

  // --- Count: total order (max) ---
  if (kind === 'count') {
    const sorted = [...candidates].sort(
      (a, b) => (b.value as { value: number }).value - (a.value as { value: number }).value,
    );
    return resolved(parameterId, sorted[0]!, sorted.slice(1), deferred);
  }

  // --- Bounded range: intersection; empty → IRRECONCILABLE ---
  if (kind === 'range') {
    let lo = new Decimal(-Infinity);
    let hi = new Decimal(Infinity);
    for (const c of candidates) {
      const r = c.value as { min: Decimal; max: Decimal };
      if (r.min.gt(lo)) lo = r.min;
      if (r.max.lt(hi)) hi = r.max;
    }
    if (lo.gt(hi)) {
      return {
        parameterId,
        status: ResolutionStatus.IRRECONCILABLE,
        superseded: [],
        deferred,
        conflict: {
          reason:
            `the ranges asserted for ${parameterId} have an empty intersection ` +
            `(${lo.toString()} > ${hi.toString()}). No value satisfies all of them.`,
          rules: ruleIds,
        },
      };
    }
    const synthetic: Candidate = {
      rule: candidates[0]!.rule,
      value: { kind: 'range', min: lo, max: hi },
    };
    return resolved(parameterId, synthetic, candidates.slice(1), deferred);
  }

  // --- Enumerated set: set intersection; empty → IRRECONCILABLE ---
  if (kind === 'enum') {
    let acc: readonly string[] = (candidates[0]!.value as { permitted: readonly string[] })
      .permitted;
    for (const c of candidates.slice(1)) {
      const next = (c.value as { permitted: readonly string[] }).permitted;
      acc = acc.filter((v) => next.includes(v));
    }
    if (acc.length === 0) {
      return {
        parameterId,
        status: ResolutionStatus.IRRECONCILABLE,
        superseded: [],
        deferred,
        conflict: {
          reason:
            `the permitted sets for ${parameterId} have an empty intersection. ` +
            `No option satisfies every applicable rule.`,
          rules: ruleIds,
        },
      };
    }
    if (acc.length === 1) {
      // A single surviving option is a resolution, not an adjudication.
      return resolved(
        parameterId,
        { rule: candidates[0]!.rule, value: { kind: 'enum', permitted: acc } },
        candidates.slice(1),
        deferred,
      );
    }
    return resolved(
      parameterId,
      { rule: candidates[0]!.rule, value: { kind: 'enum', permitted: acc } },
      candidates.slice(1),
      deferred,
    );
  }

  return {
    parameterId,
    status: ResolutionStatus.REQUIRES_ADJUDICATION,
    superseded: [],
    deferred,
    conflict: { reason: `no defined order for value kind "${kind}"`, rules: ruleIds },
  };
}

function resolved(
  parameterId: string,
  governing: Candidate,
  superseded: readonly Candidate[],
  deferred: readonly RuleRecord[],
): Resolution {
  return { parameterId, status: ResolutionStatus.RESOLVED, governing, superseded, deferred };
}

/**
 * The materialized constraint set for a run — PRD §10.2 `CONSTRAINT_SET`.
 *
 * Immutable per run and partitioned by rule class, so that "what could construct",
 * "what could only prune" and "what we did not assess" are three separate,
 * separately reportable facts rather than one undifferentiated list.
 */
export interface ConstraintSet {
  readonly resolutions: ReadonlyMap<string, Resolution>;
  readonly generative: readonly RuleRecord[];
  readonly filtering: readonly RuleRecord[];
  readonly evaluative: readonly RuleRecord[];
  readonly deferred: readonly RuleRecord[];
  /** Parameters that halted. Non-empty means the run cannot proceed (§11.6). */
  readonly blocked: readonly Resolution[];
}

export function materialize(
  rules: readonly RuleRecord[],
  parameterIds: readonly string[],
  ctx: EvalContext,
): ConstraintSet {
  const resolutions = new Map<string, Resolution>();
  for (const id of parameterIds) {
    resolutions.set(id, resolveParameter(id, rules, ctx));
  }
  const applicable = rules.filter((r) => isApplicable(r.applicability, ctx));
  return {
    resolutions,
    generative: applicable.filter((r) => r.ruleClass === 'GENERATIVE'),
    filtering: applicable.filter((r) => r.ruleClass === 'FILTERING'),
    evaluative: applicable.filter((r) => r.ruleClass === 'EVALUATIVE_ONLY'),
    deferred: applicable.filter((r) => r.ruleClass === 'DEFERRED'),
    blocked: [...resolutions.values()].filter(
      (r) =>
        r.status === ResolutionStatus.REQUIRES_ADJUDICATION ||
        r.status === ResolutionStatus.IRRECONCILABLE,
    ),
  };
}

/** The set of rule ids that applied — the convergence key for the fixpoint (§11.7). */
export function applicableRuleSetKey(rules: readonly RuleRecord[], ctx: EvalContext): string {
  return rules
    .filter((r) => isApplicable(r.applicability, ctx))
    .map((r) => r.ruleId)
    .sort()
    .join('|');
}
