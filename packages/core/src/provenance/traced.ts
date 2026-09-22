/**
 * `Traced<T>` — a value that cannot exist without its provenance.
 *
 * This is the load-bearing type of the whole engine. PRD Principle 2 requires
 * every important output to trace to a rule, an assumption, an objective or a
 * precedent, and §13.3 makes `provenance_class != null` a CI-asserted invariant.
 * Rather than assert that after the fact, there is simply no constructor here
 * that produces a value without one.
 *
 * The cost is real and worth naming: this is a tax on every function signature
 * in the engine, not a module you can add later. That is the point — §19.3 is
 * right that retrofitting provenance means rewriting every layer.
 */

import { Decimal } from '../numeric.js';
import {
  EdgeKind,
  NodeKind,
  PHASE_0_CLASSES,
  ProvenanceClass,
  RENDER_HINTS,
  type RenderHint,
} from './classes.js';
import type { Citation, NodeId, ProvenanceGraph } from './graph.js';

/**
 * How a value is written into its graph node — the string every screen, the report
 * and the workbook print.
 *
 * It was `String(value)`, which is right for a number or a label and wrong for
 * anything structured: the unit mix is an array of entries, and the first row of
 * every assumption register — the assumption that moves the answer most — read
 * "[object Object],[object Object],[object Object]" on screen, in the report and in
 * the workbook. Structured values are now written out field by field, in the order
 * the engine holds them, so the register shows what was assumed.
 */
export function nodeText(value: unknown): string {
  if (value instanceof Decimal) return value.toString();
  if (Array.isArray(value)) return value.map(nodeText).join('; ');
  if (value !== null && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, field]) => `${key} ${nodeText(field)}`)
      .join(', ');
  }
  return String(value);
}

/** A value carrying the identity of its provenance node. Immutable. */
export interface Traced<T> {
  readonly value: T;
  readonly node: NodeId;
  readonly parameterId: string;
  readonly provenanceClass: ProvenanceClass;
  readonly unit: string | undefined;
}

/** A traced numeric quantity — the overwhelmingly common case. */
export type TracedDecimal = Traced<Decimal>;

/** Serializable form of a traced value, for the API and the report. */
export interface TracedWire {
  readonly value: string;
  readonly node: NodeId;
  readonly parameterId: string;
  readonly provenanceClass: ProvenanceClass;
  readonly renderHint: RenderHint;
  readonly unit?: string;
}

export function toWire<T>(t: Traced<T>): TracedWire {
  const base = {
    value: String(t.value),
    node: t.node,
    parameterId: t.parameterId,
    provenanceClass: t.provenanceClass,
    renderHint: RENDER_HINTS[t.provenanceClass],
  };
  return t.unit === undefined ? base : { ...base, unit: t.unit };
}

/** A user, for `USER_SET` attribution and the `enteredBy` edge. */
export interface Actor {
  readonly id: string;
  readonly name: string;
}

export interface DerivedOptions {
  /** The rule that governs this value. Required — that is what DERIVED means. */
  readonly rule: {
    readonly ruleId: string;
    readonly citation: Citation;
  };
  /** The formula, written the way a human reads it: `FAR × plot area`. */
  readonly formula: string;
  /** Inputs the computation consumed. Each gets a `uses` edge. */
  readonly uses?: Readonly<Record<string, Traced<unknown>>>;
  readonly unit?: string;
  readonly detail?: Readonly<Record<string, unknown>>;
}

export interface ComputedOptions {
  readonly formula: string;
  readonly uses: Readonly<Record<string, Traced<unknown>>>;
  readonly unit?: string;
  readonly detail?: Readonly<Record<string, unknown>>;
  /**
   * Class of the resulting value. Defaults to the *weakest* class among the
   * inputs, which is the honest propagation rule: a number derived from an
   * assumption is itself an assumption, however many cited rules also fed it.
   */
  readonly provenanceClass?: ProvenanceClass;
}

/**
 * Weakness ordering for class propagation. A computation is only as trustworthy
 * as its least trustworthy input.
 *
 * DERIVED (a cited rule) is strongest. VARIANCE is next — a documented exemption
 * is still documented. USER_SET is weaker: the user asserted it. ASSUMED is
 * weakest, because nobody asserted it at all.
 */
const WEAKNESS: Readonly<Record<ProvenanceClass, number>> = {
  [ProvenanceClass.DERIVED]: 0,
  [ProvenanceClass.VARIANCE]: 1,
  [ProvenanceClass.OBSERVED]: 2,
  [ProvenanceClass.TRADEOFF]: 3,
  [ProvenanceClass.USER_SET]: 4,
  [ProvenanceClass.ASSUMED]: 5,
};

function weakest(inputs: Readonly<Record<string, Traced<unknown>>>): ProvenanceClass {
  let worst: ProvenanceClass = ProvenanceClass.DERIVED;
  for (const t of Object.values(inputs)) {
    if (WEAKNESS[t.provenanceClass] > WEAKNESS[worst]) worst = t.provenanceClass;
  }
  return worst;
}

/**
 * Constructs traced values and records their derivation.
 *
 * One tracer per run. Everything the engine emits goes through it, so that
 * `M-PRV` is a property of the type system rather than of anyone's diligence.
 */
export class Tracer {
  constructor(private readonly graph: ProvenanceGraph) {}

  /** A value the user entered or overrode. PRD §13.1 `USER_SET`. */
  userSet<T>(
    parameterId: string,
    value: T,
    opts: { readonly actor: Actor; readonly unit?: string; readonly label?: string },
  ): Traced<T> {
    const input = this.graph.addNode({
      kind: NodeKind.INPUT,
      parameterId,
      label: opts.label ?? parameterId,
      value: nodeText(value),
      ...(opts.unit !== undefined ? { unit: opts.unit } : {}),
    });
    const user = this.graph.addNode({
      kind: NodeKind.USER,
      label: opts.actor.name,
      detail: { userId: opts.actor.id },
    });
    this.graph.addEdge(input, EdgeKind.ENTERED_BY, user);
    return this.#value(parameterId, value, ProvenanceClass.USER_SET, opts.unit, (v) =>
      this.graph.addEdge(v, EdgeKind.DERIVED_FROM, input),
    );
  }

  /**
   * A declared assumption filling a gap where no rule governs. PRD §13.1.
   *
   * The `basis` is not optional and not decorative: §13.3 requires every
   * ASSUMED value to reach an assumption in its derivation path, and the
   * assumption register (§20.2) is the moment "the user understands this is not
   * magic".
   */
  assumed<T>(
    parameterId: string,
    value: T,
    opts: {
      readonly basis: string;
      readonly unit?: string;
      readonly label?: string;
      readonly detail?: Readonly<Record<string, unknown>>;
    },
  ): Traced<T> {
    const assumption = this.graph.addNode({
      kind: NodeKind.ASSUMPTION,
      parameterId,
      label: opts.label ?? parameterId,
      value: nodeText(value),
      ...(opts.unit !== undefined ? { unit: opts.unit } : {}),
      ...(opts.detail !== undefined ? { detail: opts.detail } : {}),
    });
    const basis = this.graph.addNode({ kind: NodeKind.BASIS, label: opts.basis });
    this.graph.addEdge(assumption, EdgeKind.JUSTIFIED_BY, basis);
    return this.#value(parameterId, value, ProvenanceClass.ASSUMED, opts.unit, (v) =>
      this.graph.addEdge(v, EdgeKind.DERIVED_FROM, assumption),
    );
  }

  /** A value produced by applying a cited rule. PRD §13.1 `DERIVED`. */
  derived<T>(parameterId: string, value: T, opts: DerivedOptions): Traced<T> {
    const computation = this.graph.addNode({
      kind: NodeKind.COMPUTATION,
      label: opts.formula,
      formula: opts.formula,
      ...(opts.detail !== undefined ? { detail: opts.detail } : {}),
    });
    const rule = this.graph.addNode({
      kind: NodeKind.RULE,
      label: opts.rule.ruleId,
      ruleId: opts.rule.ruleId,
      citation: opts.rule.citation,
    });
    const clause = this.graph.addNode({
      kind: NodeKind.SOURCE_CLAUSE,
      label: `${opts.rule.citation.instrumentId} ${opts.rule.citation.clauseReference}`,
      citation: opts.rule.citation,
    });
    this.graph.addEdge(rule, EdgeKind.CITED_IN, clause);
    this.graph.addEdge(computation, EdgeKind.USES, rule);
    for (const [name, input] of Object.entries(opts.uses ?? {})) {
      this.graph.addEdge(computation, EdgeKind.USES, input.node, { as: name });
    }
    return this.#value(parameterId, value, ProvenanceClass.DERIVED, opts.unit, (v) =>
      this.graph.addEdge(v, EdgeKind.DERIVED_FROM, computation),
    );
  }

  /**
   * A value computed from other traced values by a named formula.
   *
   * The workhorse. Class propagates as the weakest input unless overridden —
   * see {@link WEAKNESS} for why that is the honest default.
   */
  computed<T>(parameterId: string, value: T, opts: ComputedOptions): Traced<T> {
    const cls = opts.provenanceClass ?? weakest(opts.uses);
    const computation = this.graph.addNode({
      kind: NodeKind.COMPUTATION,
      label: opts.formula,
      formula: opts.formula,
      ...(opts.detail !== undefined ? { detail: opts.detail } : {}),
    });
    for (const [name, input] of Object.entries(opts.uses)) {
      this.graph.addEdge(computation, EdgeKind.USES, input.node, { as: name });
    }
    return this.#value(parameterId, value, cls, opts.unit, (v) =>
      this.graph.addEdge(v, EdgeKind.DERIVED_FROM, computation),
    );
  }

  /**
   * Record that a value was bounded by a constraint — the `boundedBy` edge that
   * makes "which limit binds" answerable (PRD §15.2).
   */
  boundedBy(
    value: Traced<unknown>,
    constraint: {
      readonly label: string;
      readonly parameterId: string;
      readonly ruleId?: string;
      readonly citation?: Citation;
      readonly binding: boolean;
    },
  ): NodeId {
    const node = this.graph.addNode({
      kind: NodeKind.CONSTRAINT,
      parameterId: constraint.parameterId,
      label: constraint.label,
      detail: { binding: constraint.binding },
      ...(constraint.ruleId !== undefined ? { ruleId: constraint.ruleId } : {}),
      ...(constraint.citation !== undefined ? { citation: constraint.citation } : {}),
    });
    this.graph.addEdge(value.node, EdgeKind.BOUNDED_BY, node);
    if (constraint.citation) {
      const rule = this.graph.addNode({
        kind: NodeKind.RULE,
        label: constraint.ruleId ?? constraint.label,
        citation: constraint.citation,
        ...(constraint.ruleId !== undefined ? { ruleId: constraint.ruleId } : {}),
      });
      this.graph.addEdge(node, EdgeKind.SOURCED_FROM, rule);
    }
    return node;
  }

  /**
   * Record the measured effect of perturbing an assumption on a value.
   * Feeds the sensitivity ranking in the assumption register (`FR-ASM-001`).
   */
  sensitiveTo(
    value: Traced<unknown>,
    assumption: Traced<unknown>,
    effect: { readonly relativeEffect: string; readonly perturbation: string },
  ): void {
    this.graph.addEdge(value.node, EdgeKind.SENSITIVE_TO, assumption.node, { ...effect });
  }

  /**
   * Record a rule candidate that lost overlap resolution. PRD §11.5 step 3:
   * "Every non-governing candidate is recorded as a supersededBy edge and is
   * visible to the user."
   */
  supersededBy(loser: { ruleId: string; citation: Citation }, winner: Traced<unknown>): void {
    const node = this.graph.addNode({
      kind: NodeKind.RULE,
      label: loser.ruleId,
      ruleId: loser.ruleId,
      citation: loser.citation,
    });
    this.graph.addEdge(node, EdgeKind.SUPERSEDED_BY, winner.node);
  }

  #value<T>(
    parameterId: string,
    value: T,
    provenanceClass: ProvenanceClass,
    unit: string | undefined,
    link: (node: NodeId) => void,
  ): Traced<T> {
    if (!PHASE_0_CLASSES.has(provenanceClass)) {
      // Not a runtime guard against user input — a guard against a later phase's
      // code leaking into Phase 0 output. §15.3: absence is enforced by schema.
      throw new Error(
        `provenance class ${provenanceClass} is not emittable in Phase 0 ` +
          `(parameter ${parameterId})`,
      );
    }
    const node = this.graph.addNode({
      kind: NodeKind.VALUE,
      parameterId,
      label: parameterId,
      value: nodeText(value),
      provenanceClass,
      ...(unit !== undefined ? { unit } : {}),
    });
    link(node);
    return { value, node, parameterId, provenanceClass, unit };
  }
}
