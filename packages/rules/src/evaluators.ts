/**
 * The evaluator registry — PRD §11.4. Exactly twelve functions, capped.
 *
 * An evaluator turns a rule record plus an evaluation context into a value for
 * the rule's parameter, or reports that the rule does not apply. It does not
 * decide *which* rule wins — that is overlap resolution in `resolve.ts` — and it
 * never touches geometry directly, so that a rule can be evaluated and reviewed
 * without a plot existing.
 *
 * `polygon_offset_inward` is the one that looks like an exception and is not: it
 * returns the *inset distance* the envelope solver will apply, not a polygon.
 * Keeping it a scalar is what lets the same setback rule take part in ordinary
 * most-restrictive-wins resolution against every other setback rule.
 */

import { Decimal, type DecimalValue } from '@envelope/core';

import {
  EVALUATOR_CAP,
  type EvaluatorName,
  type RuleRecord,
} from './record.js';

/** Everything an evaluator may read. Deliberately flat and dotted. */
export type EvalContext = Readonly<Record<string, unknown>>;

/** A rule that does not apply in this context. Not an error — a fact. */
export const NOT_APPLICABLE = Symbol('NOT_APPLICABLE');
export type NotApplicable = typeof NOT_APPLICABLE;

export type RuleValue =
  | { readonly kind: 'scalar'; readonly value: Decimal }
  | { readonly kind: 'range'; readonly min: Decimal; readonly max: Decimal }
  | { readonly kind: 'enum'; readonly permitted: readonly string[] }
  | { readonly kind: 'count'; readonly value: number };

export type EvalResult = RuleValue | NotApplicable;

export type Evaluator = (rule: RuleRecord, ctx: EvalContext) => EvalResult;

/** Raised when a rule's arguments cannot produce a value. A defect in the rule. */
export class RuleEvaluationError extends Error {
  override readonly name = 'RuleEvaluationError';
  constructor(
    readonly ruleId: string,
    message: string,
  ) {
    super(`rule ${ruleId}: ${message}`);
  }
}

// ---------------------------------------------------------------------------
// Context access
// ---------------------------------------------------------------------------

/** Read a dotted path out of the context. Returns `undefined`, never throws. */
export function readPath(ctx: EvalContext, path: string): unknown {
  let cur: unknown = ctx;
  for (const seg of path.split('.')) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

function requireArg<T>(rule: RuleRecord, name: string): T {
  const v = rule.evaluatorArgs[name];
  if (v === undefined) {
    throw new RuleEvaluationError(rule.ruleId, `evaluator arg "${name}" is required`);
  }
  return v as T;
}

const scalar = (value: DecimalValue): RuleValue => ({
  kind: 'scalar',
  value: new Decimal(value),
});

// ---------------------------------------------------------------------------
// 1–2. Fixed scalars
// ---------------------------------------------------------------------------

/** A fixed floor. `{ value: 1.8 }` → minimum corridor width 1.8 m. */
const scalar_min: Evaluator = (rule) => scalar(requireArg<DecimalValue>(rule, 'value'));

/** A fixed ceiling. `{ value: 5.0 }` → FAR may not exceed 5.0. */
const scalar_max: Evaluator = (rule) => scalar(requireArg<DecimalValue>(rule, 'value'));

// ---------------------------------------------------------------------------
// 3–4. Table lookups
// ---------------------------------------------------------------------------

interface LookupTable {
  readonly tableId: string;
  /** Ordered rows. First match wins, so authors control precedence explicitly. */
  readonly rows: readonly {
    readonly when: Readonly<Record<string, string | number>>;
    /** Inclusive lower bound on a numeric key, e.g. floors ≥ 9. */
    readonly whenAtLeast?: Readonly<Record<string, number>>;
    readonly value: DecimalValue;
  }[];
}

/**
 * Look a value up in a named table keyed on context paths.
 *
 * This is the evaluator behind the setback table that makes the envelope a
 * fixpoint: `{ key: ["levels.above_ground"], table: "T-SETBACK-BOUNDARY" }`
 * reads a value the solver has not finished computing yet. The registry does
 * not resolve that — the solver does, by iterating. See
 * `@envelope/capacity/fixpoint`.
 */
function tableLookup(rule: RuleRecord, ctx: EvalContext): EvalResult {
  const keys = requireArg<readonly string[]>(rule, 'key');
  const table = requireArg<LookupTable>(rule, 'table');
  const probe: Record<string, unknown> = {};
  for (const k of keys) {
    const v = readPath(ctx, k);
    if (v === undefined) return NOT_APPLICABLE;
    probe[k] = v;
  }
  for (const row of table.rows) {
    let matches = true;
    for (const [k, expected] of Object.entries(row.when)) {
      if (probe[k] !== expected) {
        matches = false;
        break;
      }
    }
    if (matches && row.whenAtLeast) {
      for (const [k, threshold] of Object.entries(row.whenAtLeast)) {
        const actual = probe[k];
        if (typeof actual !== 'number' || actual < threshold) {
          matches = false;
          break;
        }
      }
    }
    if (matches) return scalar(row.value);
  }
  return NOT_APPLICABLE;
}

const table_lookup_min: Evaluator = tableLookup;
const table_lookup_max: Evaluator = tableLookup;

// ---------------------------------------------------------------------------
// 5. Per-unit-type ratios — the parking demand evaluator
// ---------------------------------------------------------------------------

/**
 * `{ ratios: { "1BED": 1, "2BED": 1.5, "3BED": 2 }, mixPath: "unit.mix" }`
 *
 * Returns total demand, not a per-type breakdown: the breakdown belongs in the
 * provenance graph, where each term is separately traceable, rather than folded
 * into a rule's return value.
 */
const ratio_per_unit_type: Evaluator = (rule, ctx) => {
  const ratios = requireArg<Readonly<Record<string, DecimalValue>>>(rule, 'ratios');
  const mixPath = (rule.evaluatorArgs['mixPath'] as string | undefined) ?? 'unit.mix';
  const mix = readPath(ctx, mixPath);
  if (!Array.isArray(mix)) return NOT_APPLICABLE;

  let total = new Decimal(0);
  for (const entry of mix as readonly { typeId?: string; count?: number }[]) {
    if (!entry.typeId || typeof entry.count !== 'number') continue;
    const ratio = ratios[entry.typeId];
    if (ratio === undefined) {
      throw new RuleEvaluationError(
        rule.ruleId,
        `no ratio defined for unit type "${entry.typeId}". A missing ratio is a gap ` +
          `in the rule, not a zero — it must not silently contribute nothing.`,
      );
    }
    total = total.plus(new Decimal(ratio).times(entry.count));
  }
  return scalar(total);
};

// ---------------------------------------------------------------------------
// 6. Percentage of a base quantity
// ---------------------------------------------------------------------------

/** `{ percentage: 60, basePath: "plot.area_m2" }` → coverage cap in m². */
const percentage_of_base: Evaluator = (rule, ctx) => {
  const pct = new Decimal(requireArg<DecimalValue>(rule, 'percentage'));
  const basePath = requireArg<string>(rule, 'basePath');
  const base = readPath(ctx, basePath);
  if (base === undefined || base === null) return NOT_APPLICABLE;
  return scalar(pct.div(100).times(new Decimal(base as DecimalValue)));
};

// ---------------------------------------------------------------------------
// 7. Inward polygon offset — the generative setback evaluator
// ---------------------------------------------------------------------------

/**
 * Returns the inset **distance** for an edge, in metres.
 *
 * Constructive by nature — this is the rule class §11.3 calls `GENERATIVE`, and
 * the difference the deck sells: "offset every boundary inward by 5.25 m"
 * rather than "is this setback at least 5.25 m?".
 *
 * `{ value: 5.25 }` for a fixed setback, or `{ key, table }` to delegate to the
 * lookup form when the setback depends on something the solver computes.
 */
const polygon_offset_inward: Evaluator = (rule, ctx) => {
  if (rule.evaluatorArgs['table'] !== undefined) return tableLookup(rule, ctx);
  return scalar(requireArg<DecimalValue>(rule, 'value'));
};

// ---------------------------------------------------------------------------
// 8–10. Counts, ranges, enumerations
// ---------------------------------------------------------------------------

/** `{ count: 2 }` → at least two means of egress. */
const count_minimum: Evaluator = (rule) => ({
  kind: 'count',
  value: Number(requireArg<number>(rule, 'count')),
});

/** `{ min: 2.7, max: 4.2 }` → floor-to-floor must fall inside this interval. */
const range_bound: Evaluator = (rule) => ({
  kind: 'range',
  min: new Decimal(requireArg<DecimalValue>(rule, 'min')),
  max: new Decimal(requireArg<DecimalValue>(rule, 'max')),
});

/** `{ permitted: ["CONCRETE", "STEEL"] }`. §11.6: not resolvable by "most restrictive". */
const enum_permitted_set: Evaluator = (rule) => ({
  kind: 'enum',
  permitted: requireArg<readonly string[]>(rule, 'permitted'),
});

// ---------------------------------------------------------------------------
// 11. Conditional scalar
// ---------------------------------------------------------------------------

/**
 * `{ cases: [{ when: {path, eq}, value }], otherwise?: value }`
 *
 * The readable middle ground between a fixed scalar and a full lookup table.
 * `otherwise` is optional on purpose: a conditional with no fallback that
 * matches nothing is NOT_APPLICABLE, not zero.
 */
const conditional_scalar: Evaluator = (rule, ctx) => {
  const cases = requireArg<
    readonly {
      readonly path: string;
      readonly eq?: string | number | boolean;
      readonly gte?: number;
      readonly lt?: number;
      readonly value: DecimalValue;
    }[]
  >(rule, 'cases');
  for (const c of cases) {
    const actual = readPath(ctx, c.path);
    if (actual === undefined) continue;
    if (c.eq !== undefined && actual !== c.eq) continue;
    if (c.gte !== undefined && !(typeof actual === 'number' && actual >= c.gte)) continue;
    if (c.lt !== undefined && !(typeof actual === 'number' && actual < c.lt)) continue;
    return scalar(c.value);
  }
  const otherwise = rule.evaluatorArgs['otherwise'];
  return otherwise === undefined ? NOT_APPLICABLE : scalar(otherwise as DecimalValue);
};

// ---------------------------------------------------------------------------
// 12. Custom function
// ---------------------------------------------------------------------------

/**
 * The escape hatch — §11.4: "registered, tested, reviewed like any other rule".
 *
 * A custom function must be registered by name before any rule may reference
 * it. There is no `eval`, no dynamic import, and no way for a rule record to
 * carry executable code: a rule is data, and data does not run.
 */
const CUSTOM_FUNCTIONS = new Map<string, (rule: RuleRecord, ctx: EvalContext) => EvalResult>();

export function registerCustomFunction(
  name: string,
  fn: (rule: RuleRecord, ctx: EvalContext) => EvalResult,
): void {
  if (CUSTOM_FUNCTIONS.has(name)) {
    throw new Error(`custom evaluator "${name}" is already registered`);
  }
  CUSTOM_FUNCTIONS.set(name, fn);
}

const custom_fn: Evaluator = (rule, ctx) => {
  const name = requireArg<string>(rule, 'fn');
  const fn = CUSTOM_FUNCTIONS.get(name);
  if (!fn) {
    throw new RuleEvaluationError(
      rule.ruleId,
      `custom evaluator "${name}" is not registered. Custom evaluators must be ` +
        `registered, tested and reviewed like any other rule (PRD §11.4).`,
    );
  }
  return fn(rule, ctx);
};

// ---------------------------------------------------------------------------
// The registry
// ---------------------------------------------------------------------------

export const REGISTRY: Readonly<Record<EvaluatorName, Evaluator>> = {
  scalar_min,
  scalar_max,
  table_lookup_min,
  table_lookup_max,
  ratio_per_unit_type,
  percentage_of_base,
  polygon_offset_inward,
  count_minimum,
  range_bound,
  enum_permitted_set,
  conditional_scalar,
  custom_fn,
};

// §11.4's cap, asserted at module load rather than trusted to review.
{
  const count = Object.keys(REGISTRY).length;
  if (count > EVALUATOR_CAP) {
    throw new Error(
      `evaluator registry holds ${count} functions, over the Phase 0 cap of ` +
        `${EVALUATOR_CAP}. PRD §11.4: exceeding it "signals the abstraction is wrong ` +
        `and triggers a design review rather than a thirteenth function".`,
    );
  }
}

export function evaluate(rule: RuleRecord, ctx: EvalContext): EvalResult {
  const fn = REGISTRY[rule.evaluator];
  if (!fn) throw new RuleEvaluationError(rule.ruleId, `unknown evaluator "${rule.evaluator}"`);
  return fn(rule, ctx);
}

export function isNotApplicable(r: EvalResult): r is NotApplicable {
  return r === NOT_APPLICABLE;
}
