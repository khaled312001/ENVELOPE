/**
 * The envelope solver — `FR-PLT-002`, with the fixpoint `FR-PLT-002` omits.
 *
 * PRD `FR-PLT-002` specifies the processing as one pass:
 *
 * > "Apply per-edge setback offsets → intersect → setback-permitted footprint.
 * > Apply coverage cap. Podium footprint = min(setback-permitted, coverage cap).
 * > Apply tower plate cap. Apply height ceiling and floor-to-floor to derive
 * > maximum level counts."
 *
 * Rules in, geometry out, one direction. That works only while no rule's
 * applicability depends on something the solver computes — and the headline
 * setback rule's does. This module runs the same pipeline inside §11.7's
 * bounded conservative fixpoint, so the circular case resolves and the acyclic
 * case costs exactly one extra iteration to prove it was acyclic.
 *
 * Every value emitted here is `Traced`. There is no path through this file that
 * produces a number without a derivation.
 */

import {
  type BindingConstraint,
  type BuildableEnvelope,
  Decimal,
  metric,
  mm2ToM2,
  mmToM,
  type Plot,
  type Traced,
  type Tracer,
  toMm,
} from '@envelope/core';
import {
  offsetPerEdge,
  scaleToArea,
  verifiedArea,
  type EdgeInset,
  type Ring,
} from '@envelope/geometry';
import {
  applicableRuleSetKey,
  isNotApplicable,
  Operator,
  resolveParameter,
  ResolutionStatus,
  type EvalContext,
  type Resolution,
  type RuleRecord,
} from '@envelope/rules';

import { FixpointStatus, runFixpoint, type FixpointOutcome } from './fixpoint.js';

/** Parameters the envelope solver resolves. Order is the order they are applied. */
export const ENVELOPE_PARAMETERS = [
  'setback.road',
  'setback.adjacent_plot',
  'setback.open_space',
  'setback.other',
  'far.max',
  'coverage.max',
  'tower_plate.max',
  'height.max',
  'floor_to_floor',
] as const;

export interface EnvelopeInput {
  readonly plot: Plot;
  readonly rules: readonly RuleRecord[];
  readonly tracer: Tracer;
  /** Extra context the rules may read: land use, road hierarchy, brief targets. */
  readonly context: EvalContext;
}

/** State the fixpoint iterates over. */
interface SolverState {
  /** Levels above ground currently assumed. Drives the setback lookup. */
  readonly levels: number;
  readonly ctx: EvalContext;
}

export interface EnvelopeSolution extends BuildableEnvelope {
  readonly fixpoint: FixpointOutcome<SolverState>;
  readonly resolutions: ReadonlyMap<string, Resolution>;
  /** Non-empty means a parameter halted and the run may not proceed (§11.6). */
  readonly blocked: readonly Resolution[];
  /**
   * The context the fixpoint converged on — the one every emitted number was
   * actually resolved against.
   *
   * Exported because the independent validator must re-materialise the
   * constraint set at *this* context, not at a context reconstructed by hand.
   * Reconstructing it would mean the validator checks the answer against a rule
   * set the generator never consumed, and the two would drift on the first
   * threshold crossing — a validator that silently validates a different
   * question is worse than no validator, because it reports agreement.
   *
   * Handing over the context is not handing over the resolution: the validator
   * reads the materialised bounds as data and does its own arithmetic. §16.4.
   */
  readonly finalContext: EvalContext;
  /**
   * The setback-permitted ring and the tower plate, as polygons.
   *
   * Carried out of the solver rather than recomputed downstream. The parking
   * layout has to pack a real rectangle and the massing view has to draw a real
   * outline; both used to be handed the plot boundary and a number, which meant
   * the drawing showed bays inside the setback and a slab wider than the plate.
   * A second offset computed elsewhere is a second answer nobody reconciles.
   */
  readonly podiumRing: Ring;
  readonly plateRing: Ring;
}

export class EnvelopeHaltedError extends Error {
  override readonly name = 'EnvelopeHaltedError';
  constructor(
    message: string,
    readonly detail: Record<string, unknown>,
  ) {
    super(message);
  }
}

const num = (r: Resolution | undefined): Decimal | undefined => {
  if (!r || r.status !== ResolutionStatus.RESOLVED) return undefined;
  const v = r.governing?.value;
  return v && v.kind === 'scalar' ? v.value : undefined;
};

/** Resolve every envelope parameter against a context. Pure. */
function resolveAll(
  rules: readonly RuleRecord[],
  ctx: EvalContext,
): ReadonlyMap<string, Resolution> {
  const out = new Map<string, Resolution>();
  for (const p of ENVELOPE_PARAMETERS) out.set(p, resolveParameter(p, rules, ctx));
  // Per-edge setbacks are resolved individually so that two edges of the same
  // classification can still diverge on road hierarchy.
  return out;
}

/**
 * The per-edge setback for one edge, resolved in the current context.
 *
 * Each edge is resolved with its own classification and hierarchy pushed into
 * the context, which is what lets a single `R-SETBACK-ROAD` rule produce
 * different values on different frontages.
 */
function setbackForEdge(
  plot: Plot,
  edgeSeq: number,
  rules: readonly RuleRecord[],
  ctx: EvalContext,
): { resolution: Resolution; parameterId: string } {
  const edge = plot.edges[edgeSeq];
  if (!edge) throw new Error(`plot has no edge ${edgeSeq}`);
  const parameterId = `setback.${edge.classification.toLowerCase()}`;
  const edgeCtx: EvalContext = {
    ...ctx,
    edge: {
      classification: edge.classification,
      road_hierarchy: edge.roadHierarchy ?? null,
      seq: edge.seq,
      length_m: mmToM(edge.lengthMm).toNumber(),
    },
  };
  return { resolution: resolveParameter(parameterId, rules, edgeCtx), parameterId };
}

/**
 * Solve the buildable envelope.
 *
 * @throws {EnvelopeHaltedError} when a parameter needs adjudication, is
 * irreconcilable, or when the applicability fixpoint does not converge. Each of
 * these is a state the product must show the user, not a failure to hide.
 */
export function solveEnvelope(input: EnvelopeInput): EnvelopeSolution {
  const { plot, rules, tracer } = input;

  // Every area term this function computes must exist in the signed annex —
  // FR-DEF-001 AC5, mechanically.
  metric('SETBACK_PERMITTED_FOOTPRINT');
  metric('PODIUM_FOOTPRINT');
  metric('TOWER_PLATE');
  metric('PLOT_COVERAGE');

  const plotAreaM2 = mm2ToM2(plot.computedAreaMm2);
  const baseCtx: EvalContext = {
    ...input.context,
    land_use: plot.landUse,
    plot: {
      area_m2: plotAreaM2.toNumber(),
      community: plot.community,
      shape_class: plot.shapeClass,
      frontage_count: plot.frontageCount,
    },
  };

  // --- §11.7 step 1: SEED CONSERVATIVELY -----------------------------------
  //
  // The seed is the largest level count the height ceiling could physically
  // permit. More levels selects the *larger* setback tier, which yields a
  // smaller footprint, which requires more levels to realise the permitted GFA
  // — so the iteration approaches the answer from the restrictive side and
  // converges downward. §11.7: "a conservative seed converging downward is safe
  // at every step."
  const seedResolutions = resolveAll(rules, { ...baseCtx, levels: { above_ground: 0 } });
  const heightCeiling = num(seedResolutions.get('height.max'));
  const floorToFloor = num(seedResolutions.get('floor_to_floor'));
  const farMax = num(seedResolutions.get('far.max'));

  const blockedEarly = [...seedResolutions.values()].filter(
    (r) =>
      r.status === ResolutionStatus.REQUIRES_ADJUDICATION ||
      r.status === ResolutionStatus.IRRECONCILABLE,
  );
  if (blockedEarly.length) {
    throw new EnvelopeHaltedError(
      `computation halted: ${blockedEarly.length} parameter(s) could not be resolved. ` +
        blockedEarly.map((r) => `${r.parameterId} — ${r.conflict?.reason ?? r.status}`).join('; '),
      { blocked: blockedEarly.map((r) => ({ parameterId: r.parameterId, status: r.status })) },
    );
  }
  if (!heightCeiling || !floorToFloor || !farMax) {
    const missing = [
      !heightCeiling && 'height.max',
      !floorToFloor && 'floor_to_floor',
      !farMax && 'far.max',
    ].filter(Boolean);
    throw new EnvelopeHaltedError(
      `no rule governs ${missing.join(', ')}. The engine does not substitute a ` +
        `default for a missing generative rule — that would be exactly the hidden ` +
        `assumption the product exists to eliminate.`,
      { missing },
    );
  }

  const maxLevelsByHeight = heightCeiling.div(floorToFloor).floor().toNumber();
  const permittedGfaM2 = farMax.times(plotAreaM2);

  // --- §11.7 step 2–4: ITERATE, TEST, BOUND --------------------------------

  const withLevels = (levels: number): EvalContext => ({
    ...baseCtx,
    levels: { above_ground: levels, total: levels },
  });

  const fixpoint = runFixpoint<SolverState>({
    seed: { levels: maxLevelsByHeight, ctx: withLevels(maxLevelsByHeight) },
    ruleSetKey: (s) => convergenceKey(plot, rules, s.ctx),
    step: (s) => {
      const footprint = footprintAt(plot, rules, s.ctx);
      const coverage = num(resolveParameter('coverage.max', rules, s.ctx));
      const plateCap = num(resolveParameter('tower_plate.max', rules, s.ctx));

      const podium = coverage
        ? Decimal.min(footprint, coverage.div(100).times(plotAreaM2))
        : footprint;
      const plate = plateCap ? Decimal.min(podium, plateCap) : podium;

      // Levels needed to realise the permitted GFA on this plate, capped by
      // the height ceiling. This is the deck's own arithmetic.
      const needed = plate.isZero()
        ? maxLevelsByHeight
        : permittedGfaM2.div(plate).ceil().toNumber();
      const next = Math.max(1, Math.min(maxLevelsByHeight, needed));

      return {
        next: { levels: next, ctx: withLevels(next) },
        note:
          `assumed ${s.levels} level(s) → plate ${plate.toFixed(2)} m² → ` +
          `${needed} level(s) needed for ${permittedGfaM2.toFixed(0)} m² GFA ` +
          `(capped at ${maxLevelsByHeight} by height)`,
      };
    },
    describeThreshold: (a, b) =>
      `level count oscillates between ${a.levels} and ${b.levels}, which fall on ` +
      `opposite sides of a setback threshold`,
  });

  if (fixpoint.status === FixpointStatus.NON_CONVERGENT_APPLICABILITY) {
    throw new EnvelopeHaltedError(
      `NON_CONVERGENT_APPLICABILITY: the applicable rule set did not stabilise in ` +
        `5 iterations. Oscillating rule(s): ${fixpoint.oscillating?.join(', ') ?? 'unknown'}. ` +
        `${fixpoint.straddledThreshold ?? ''} ` +
        `Per PRD §11.7 step 5 the system does not choose — declare the level basis ` +
        `and the computation resumes from that declaration (recorded USER_SET).`,
      {
        oscillating: fixpoint.oscillating,
        history: fixpoint.history.map((h) => ({ index: h.index, note: h.note })),
      },
    );
  }

  // --- Final pass at the converged context, this time emitting provenance ---

  const finalCtx = fixpoint.state.ctx;
  const resolutions = resolveAll(rules, finalCtx);
  const bindings: BindingConstraint[] = [];
  const appliedSetbacks: {
    seq: number;
    valueM: Decimal;
    ruleId: string;
    parameterId: string;
    traced: Traced<Decimal>;
  }[] = [];
  const insets: EdgeInset[] = [];

  for (const edge of plot.edges) {
    const { resolution, parameterId } = setbackForEdge(plot, edge.seq, rules, finalCtx);
    if (resolution.status !== ResolutionStatus.RESOLVED || !resolution.governing) {
      throw new EnvelopeHaltedError(
        `no approved rule governs ${parameterId} for edge ${edge.seq} ` +
          `(${edge.classification}). FR-PLT-001 AC3 forbids a default setback.`,
        { edgeSeq: edge.seq, classification: edge.classification, status: resolution.status },
      );
    }
    const value = resolution.governing.value;
    if (value.kind !== 'scalar') {
      throw new EnvelopeHaltedError(`${parameterId} did not resolve to a scalar`, {
        kind: value.kind,
      });
    }
    insets.push({ seq: edge.seq, insetMm: toMm(value.value) });

    // One traced node per edge, emitted unconditionally.
    //
    // It used to be created only inside the superseded loop below, which meant
    // an edge governed by a single uncontested rule produced no node at all —
    // the setback with the *least* controversy was the one a user could not
    // click through. Emitted here, every edge reaches its clause and the
    // supersession edges below attach to the same node rather than to copies.
    const traced = tracer.derived(`${parameterId}.edge_${edge.seq}`, value.value, {
      rule: {
        ruleId: resolution.governing.rule.ruleId,
        citation: resolution.governing.rule.citation,
      },
      formula: `setback for edge ${edge.seq} (${edge.classification})`,
      unit: 'm',
      detail: {
        edgeSeq: edge.seq,
        classification: edge.classification,
        roadHierarchy: edge.roadHierarchy ?? null,
        levelsAssumed: (finalCtx['levels'] as { above_ground?: number } | undefined)?.above_ground,
      },
    });

    appliedSetbacks.push({
      seq: edge.seq,
      valueM: value.value,
      ruleId: resolution.governing.rule.ruleId,
      parameterId,
      traced,
    });
    // §11.5 step 3 — losers stay visible.
    for (const loser of resolution.superseded) {
      tracer.supersededBy({ ruleId: loser.rule.ruleId, citation: loser.rule.citation }, traced);
    }
  }

  const offset = offsetPerEdge(plot.ring, insets);
  const setbackFootprintM2 = mm2ToM2(offset.areaMm2);

  const setbackRule = appliedSetbacks[0];
  const setbackPermittedFootprint = tracer.computed(
    'envelope.setback_permitted_footprint',
    setbackFootprintM2,
    {
      formula: 'offset every edge inward by its own setback, then intersect with the plot',
      /**
       * Every edge's setback, by name, in the derivation path.
       *
       * This was `{}`, which made the footprint a DERIVED value whose derivation
       * reached a computation and stopped — no rule, no clause. §13.3 makes "a
       * DERIVED value reaches a cited rule" an asserted property of the graph,
       * and clicking the most important number in the product landed on
       * "computed as: offset every edge inward" with nowhere further to go.
       *
       * Keyed by edge so the tree reads as the argument the drawing makes:
       * this footprint, because *this* setback on *that* frontage, because that
       * clause.
       */
      uses: Object.fromEntries(
        appliedSetbacks.map((a) => [`edge_${a.seq}`, a.traced] as const),
      ),
      unit: 'm²',
      provenanceClass: 'DERIVED',
      detail: {
        metric: metric('SETBACK_PERMITTED_FOOTPRINT').metricId,
        appliedSetbacks: appliedSetbacks.map((s) => ({
          edge: s.seq,
          setbackM: s.valueM.toString(),
          ruleId: s.ruleId,
        })),
        exactArithmetic: offset.exact,
      },
    },
  );

  // --- Coverage cap ---
  const coverageRes = resolutions.get('coverage.max');
  const coveragePct = num(coverageRes);
  const coverageCapM2 = coveragePct ? coveragePct.div(100).times(plotAreaM2) : setbackFootprintM2;
  const coverageCap = coveragePct
    ? tracer.derived('envelope.coverage_cap', coverageCapM2, {
        rule: {
          ruleId: coverageRes!.governing!.rule.ruleId,
          citation: coverageRes!.governing!.rule.citation,
        },
        formula: `${coveragePct.toString()}% × plot area ${plotAreaM2.toFixed(2)} m²`,
        unit: 'm²',
        detail: { metric: metric('PLOT_COVERAGE').metricId },
      })
    : tracer.assumed('envelope.coverage_cap', coverageCapM2, {
        basis:
          'no approved coverage rule applies to this plot, so the setback-permitted ' +
          'footprint is not further reduced. If a coverage cap exists and has not ' +
          'been encoded, this over-states the podium.',
        unit: 'm²',
      });

  // --- Podium footprint = min(setback-permitted, coverage cap) ---
  const podiumM2 = Decimal.min(setbackFootprintM2, coverageCapM2);
  const podiumBinding: BindingConstraint = podiumM2.eq(coverageCapM2)
    ? {
        dimension: 'podium_footprint',
        ruleId: coverageRes?.governing?.rule.ruleId ?? 'ASSUMED',
        label: 'plot coverage cap',
        valueM: coverageCapM2,
        ...nearTie('setback-permitted footprint', setbackFootprintM2, coverageCapM2, setbackRule?.ruleId),
      }
    : {
        dimension: 'podium_footprint',
        ruleId: setbackRule?.ruleId ?? 'SETBACKS',
        label: 'setback-permitted footprint',
        valueM: setbackFootprintM2,
        ...nearTie('plot coverage cap', coverageCapM2, setbackFootprintM2, coverageRes?.governing?.rule.ruleId),
      };
  bindings.push(podiumBinding);

  const podiumFootprint = tracer.computed('envelope.podium_footprint', podiumM2, {
    formula: 'min(setback-permitted footprint, coverage cap)',
    uses: { setback: setbackPermittedFootprint, coverage: coverageCap },
    unit: 'm²',
    detail: { metric: metric('PODIUM_FOOTPRINT').metricId, binding: podiumBinding.label },
  });

  // --- Tower plate cap ---
  const plateRes = resolutions.get('tower_plate.max');
  const plateCap = num(plateRes);
  const plateM2 = plateCap ? Decimal.min(podiumM2, plateCap) : podiumM2;
  const towerPlateCap = plateCap
    ? tracer.derived('envelope.tower_plate_cap', plateM2, {
        rule: {
          ruleId: plateRes!.governing!.rule.ruleId,
          citation: plateRes!.governing!.rule.citation,
        },
        formula: `min(podium footprint, tower plate cap ${plateCap.toString()} m²)`,
        uses: { podium: podiumFootprint },
        unit: 'm²',
        detail: { metric: metric('TOWER_PLATE').metricId },
      })
    : tracer.computed('envelope.tower_plate_cap', plateM2, {
        formula: 'no tower plate cap applies; the plate is the podium footprint',
        uses: { podium: podiumFootprint },
        unit: 'm²',
      });

  if (plateCap && plateCap.lt(podiumM2)) {
    bindings.push({
      dimension: 'tower_plate',
      ruleId: plateRes!.governing!.rule.ruleId,
      label: 'tower plate cap',
      valueM: plateCap,
      ...nearTie('podium footprint', podiumM2, plateCap, podiumBinding.ruleId),
    });
  }

  // Geometric realisability: the plate must be a real polygon inside the podium,
  // not merely a number. INV-10 checks the arithmetic; this checks the geometry.
  const podiumRing = offset.ring;
  // scaleToArea works in mm²; plateM2 is m².
  const plateRing = plateCap
    ? scaleToArea(podiumRing, plateM2.times(1_000_000).toDecimalPlaces(0).toNumber())
    : podiumRing;
  verifiedArea(plateRing, 'tower plate');

  // --- Height ---
  const heightRes = resolutions.get('height.max')!;
  const heightCeilingT = tracer.derived('envelope.height_ceiling_m', heightCeiling, {
    rule: {
      ruleId: heightRes.governing!.rule.ruleId,
      citation: heightRes.governing!.rule.citation,
    },
    formula: 'height ceiling from the governing rule',
    unit: 'm',
  });
  const f2fRes = resolutions.get('floor_to_floor')!;
  const floorToFloorT = tracer.derived('envelope.floor_to_floor_m', floorToFloor, {
    rule: { ruleId: f2fRes.governing!.rule.ruleId, citation: f2fRes.governing!.rule.citation },
    formula: 'floor-to-floor from the governing rule',
    unit: 'm',
  });
  const maxLevels: Traced<number> = tracer.computed(
    'envelope.max_levels_by_height',
    maxLevelsByHeight,
    {
      formula: `floor(height ceiling ${heightCeiling.toString()} m ÷ floor-to-floor ${floorToFloor.toString()} m)`,
      uses: { height: heightCeilingT, f2f: floorToFloorT },
      unit: 'levels',
    },
  );

  bindings.push({
    dimension: 'levels',
    ruleId: heightRes.governing!.rule.ruleId,
    label: 'height ceiling',
    valueM: heightCeiling,
  });

  return {
    setbackPermittedFootprint,
    coverageCap,
    podiumFootprint,
    towerPlateCap,
    heightCeilingM: heightCeilingT,
    floorToFloorM: floorToFloorT,
    maxLevelsByHeight: maxLevels,
    bindingConstraints: bindings,
    appliedSetbacks,
    fixpointIterations: fixpoint.iterations,
    fixpointConverged: fixpoint.status === FixpointStatus.CONVERGED,
    fixpoint,
    resolutions,
    blocked: [],
    finalContext: finalCtx,
    podiumRing,
    plateRing,
  };
}

/**
 * The convergence key — a deliberate generalisation of PRD §11.7 step 3.
 *
 * §11.7 says to test convergence on "the applicable rule set … not on the load
 * value", and gives the reason: "rules switch at thresholds, so load can
 * oscillate within a band while the rule set is stable." That is exactly right
 * for the occupant-load case it was written for, where crossing a threshold
 * makes a *different rule* apply.
 *
 * **It is wrong for the setback case, and silently so.** Here the same rule —
 * `R-SETBACK-BOUNDARY-RES` — applies at every level count; what changes is which
 * *row of its table* fires. Applicability never changes, so a key built from
 * rule ids alone is identical on the very first comparison, the fixpoint reports
 * CONVERGED after one iteration, and the solver returns the answer implied by
 * the **seed** rather than the answer implied by the settled level count. On an
 * 80 × 40 m plot that is the difference between a 7.50 m setback and a 6.00 m
 * one — a wrong footprint, delivered confidently, with a green convergence flag
 * next to it.
 *
 * So the key includes both: which rules apply *and* what each of them resolved
 * to. This is a strict generalisation — whenever applicability changes the
 * resolved set changes too — so it preserves every guarantee §11.7 makes while
 * also catching the in-evaluator circularity §11.7 does not contemplate.
 *
 * Worth raising with the client: the same gap applies to any rule whose value
 * comes from a table keyed on a solver output, which is most of the interesting
 * ones.
 */
function convergenceKey(
  plot: Plot,
  rules: readonly RuleRecord[],
  ctx: EvalContext,
): string {
  const applicable = applicableRuleSetKey(rules, ctx);

  const resolved: string[] = [];
  for (const p of ENVELOPE_PARAMETERS) {
    const v = num(resolveParameter(p, rules, ctx));
    if (v !== undefined) resolved.push(`${p}=${v.toString()}`);
  }
  for (const edge of plot.edges) {
    const { resolution, parameterId } = setbackForEdge(plot, edge.seq, rules, ctx);
    const v = num(resolution);
    resolved.push(`${parameterId}#${edge.seq}=${v?.toString() ?? 'none'}`);
  }

  return `${applicable}::${resolved.sort().join(',')}`;
}

function footprintAt(plot: Plot, rules: readonly RuleRecord[], ctx: EvalContext): Decimal {
  const insets: EdgeInset[] = [];
  for (const edge of plot.edges) {
    const { resolution } = setbackForEdge(plot, edge.seq, rules, ctx);
    const v = resolution.governing?.value;
    if (!v || v.kind !== 'scalar') {
      // Mid-iteration, an unresolved setback means this level assumption is not
      // viable. Returning zero drives the next iteration to the height cap
      // rather than crashing inside the loop; the final pass reports properly.
      return new Decimal(0);
    }
    insets.push({ seq: edge.seq, insetMm: toMm(v.value) });
  }
  try {
    return mm2ToM2(offsetPerEdge(plot.ring, insets).areaMm2);
  } catch {
    // Over-consumed at this level assumption. Zero pushes the iteration toward
    // fewer levels, which is the direction that relieves the setback.
    return new Decimal(0);
  }
}

/**
 * `FR-CAP-001`: when two constraints bind within 1% of each other, both are
 * reported. "Which limit binds" is only useful if a near-tie is visible — a
 * developer negotiating a coverage variance needs to know the setback would
 * bind 0.4% later.
 */
function nearTie(
  label: string,
  runnerUpValue: Decimal,
  winnerValue: Decimal,
  ruleId: string | undefined,
): Pick<BindingConstraint, 'runnerUp'> | Record<string, never> {
  if (!ruleId || winnerValue.isZero()) return {};
  const gap = runnerUpValue.minus(winnerValue).abs().div(winnerValue);
  return {
    runnerUp: {
      ruleId,
      label,
      valueM: runnerUpValue,
      withinOnePercent: gap.lte('0.01'),
    },
  };
}

export { isNotApplicable, Operator };
