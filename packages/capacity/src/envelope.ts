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
  ringSpanOf,
  type Traced,
  type Tracer,
  toMm,
} from '@envelope/core';
import {
  arcFromBulge,
  offsetPerEdge,
  scaleToArea,
  verifiedArea,
  type BoundaryArc,
  type EdgeInset,
  type Ring,
} from '@envelope/geometry';
import {
  applicableRuleSetKey,
  isNotApplicable,
  isPlotSpecific,
  Operator,
  resolveParameter,
  ResolutionStatus,
  type EvalContext,
  type Resolution,
  type RuleRecord,
  type SetAsideRule,
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
  /*
    A ceiling stated as a COUNT — an affection plan's `G+4`. Optional: no seed rule
    states one, so on a plot without a sheet it resolves to nothing and the metres
    ceiling governs alone. Never converted to metres; see `instruments/sheet.ts`.
  */
  'levels.max_above_ground',
  'floor_to_floor',
] as const;

/** Who stated something the engine takes as an input, resolved at the composition root. */
export interface StatementRef {
  readonly statementId: string;
  readonly statedBy: string;
  readonly statedOn: string;
  readonly verbatim: string;
}

/** A setback the reader typed for one edge of the TOWER, because no instrument states one. */
export interface TypedSetback {
  readonly metres: Decimal;
  readonly actor: { readonly id: string; readonly name: string };
}

export interface EnvelopeInput {
  readonly plot: Plot;
  readonly rules: readonly RuleRecord[];
  readonly tracer: Tracer;
  /** Extra context the rules may read: land use, road hierarchy, brief targets. */
  readonly context: EvalContext;
  /**
   * The podium stands on the boundary wherever the plot's own instrument is
   * silent — see `PODIUM_SETBACK_STATEMENT`. Absent, the podium is held to the
   * tower's setback line, which is how every run before 16 Oct 2026 was solved.
   */
  readonly podiumAtBoundary?: StatementRef;
  /**
   * Tower setbacks the reader typed, by edge seq. Each replaces a GENERAL rule's
   * value on its edge, `USER_SET`. Never the plot's own instrument's: a typed
   * value on an edge the affection plan governs halts the run in a sentence.
   */
  readonly typedSetbacks?: ReadonlyMap<number, TypedSetback>;
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
   * Governing general rules this run did not apply, and why: the coverage rule
   * the podium statement replaces, and a setback rule every edge of whose class
   * carries a typed value. The pipeline hands them to the validator, which
   * declares each one as not checked rather than holding the run to a rule the
   * engine was told not to apply.
   */
  readonly setAside: readonly SetAsideRule[];
  /**
   * The setback line, the podium and the tower plate, as polygons.
   *
   * Carried out of the solver rather than recomputed downstream. The parking
   * layout has to pack a real rectangle and the massing view has to draw a real
   * outline; both used to be handed the plot boundary and a number, which meant
   * the drawing showed bays inside the setback and a slab wider than the plate.
   * A second offset computed elsewhere is a second answer nobody reconciles.
   *
   * `setbackRing` is the per-edge offset itself. `podiumRing` is the podium the
   * footprint figure describes — the setback ring cut down to the coverage cap
   * where that cap binds (see `podiumPlacement`).
   */
  readonly setbackRing: Ring;
  readonly podiumRing: Ring;
  readonly plateRing: Ring;
  /**
   * Set when the coverage cap made the podium smaller than the setback line.
   *
   * The cap fixes the podium's AREA. It says nothing about where on the plot the
   * podium stands, so the ring is the setback ring scaled about its centre to that
   * area, and this is the traced assumption that says so. Undefined when the
   * podium is the setback ring, because then nothing was placed.
   */
  readonly podiumPlacement: Traced<string> | undefined;
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
 * The tower setback on one edge: the rule's, or the one the reader typed.
 *
 * PRECEDENCE, and why it is this way round. The plot's own instrument governs
 * (§11.5 step 1) and a typed value may not override it — that would be a person
 * relaxing an issued sheet by typing. Below the instrument, a typed value beats a
 * GENERAL rule: Eng. Mohamed, «لو مش موجوده في ال affection plan اكتبهاله». The
 * general rule is then recorded as superseded by the typed value, visible.
 */
function towerSetbackAt(
  plot: Plot,
  edgeSeq: number,
  rules: readonly RuleRecord[],
  ctx: EvalContext,
  typed: ReadonlyMap<number, TypedSetback> | undefined,
): {
  readonly value: Decimal | undefined;
  readonly resolution: Resolution;
  readonly parameterId: string;
  readonly typed: TypedSetback | undefined;
  readonly plotSpecific: boolean;
} {
  const { resolution, parameterId } = setbackForEdge(plot, edgeSeq, rules, ctx);
  const governing = resolution.governing;
  const plotSpecific = governing !== undefined && isPlotSpecific(governing.rule);
  const mine = typed?.get(edgeSeq);
  if (mine && plotSpecific) {
    const stated = governing.value.kind === 'scalar' ? `${governing.value.value.toString()} m` : 'a setback';
    throw new EnvelopeHaltedError(
      `edge ${edgeSeq}: the affection plan states ${stated} for this boundary, and a typed ` +
        `setback of ${mine.metres.toString()} m may not replace it. Clear the typed value — ` +
        'the sheet governs this edge.',
      { edgeSeq, typed: mine.metres.toString() },
    );
  }
  if (mine) return { value: mine.metres, resolution, parameterId, typed: mine, plotSpecific };
  const v = governing?.value;
  return {
    value: resolution.status === ResolutionStatus.RESOLVED && v && v.kind === 'scalar' ? v.value : undefined,
    resolution,
    parameterId,
    typed: undefined,
    plotSpecific,
  };
}

/**
 * Solve the buildable envelope.
 *
 * @throws {EnvelopeHaltedError} when a parameter needs adjudication, is
 * irreconcilable, or when the applicability fixpoint does not converge. Each of
 * these is a state the product must show the user, not a failure to hide.
 */
export function solveEnvelope(input: EnvelopeInput): EnvelopeSolution {
  const { plot, rules, tracer, podiumAtBoundary } = input;
  const typed = input.typedSetbacks;
  for (const seq of typed?.keys() ?? []) {
    if (!plot.edges.some((e) => e.seq === seq)) {
      throw new EnvelopeHaltedError(`a setback was typed for edge ${seq}, and this plot has no such edge.`, {
        edgeSeq: seq,
      });
    }
    const m = typed!.get(seq)!.metres;
    if (m.lt(0) || m.gt(50)) {
      throw new EnvelopeHaltedError(
        `edge ${seq}: a setback of ${m.toString()} m is outside 0–50 m. Check the figure.`,
        { edgeSeq: seq },
      );
    }
  }

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
      /*
        THE PLOT'S OWN NUMBER, WHICH ONLY ONE KIND OF RULE READS.

        A rule built from this plot's affection plan is fenced to this plot by an
        applicability term on this path (`rulesFromInstrument`). Without it the
        term reads `undefined`, the rule matches nothing, and the sheet that was
        supposed to bind the run silently binds nothing at all — the same defect
        as before, one layer deeper and harder to see.
      */
      plot_number: plot.plotNumber,
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

  /*
    TWO CEILINGS, AND THE LOWER ONE GOVERNS. The metres ceiling divided by the
    floor-to-floor, and — where the plot's own plan states one — its level count.
    Before the count was bound, a plan printing `G+4` was governed by the generic
    45 m placeholder alone and reported thirteen levels.
  */
  const levelsByMetres = heightCeiling.div(floorToFloor).floor().toNumber();
  const statedLevels = num(seedResolutions.get('levels.max_above_ground'));
  /*
    AND WHEN THE PLAN IS THE SPECIFIC INSTRUMENT, IT GOVERNS EITHER WAY. The
    two ceilings are two parameters, so `resolveParameter` never sets them side
    by side — but they answer one question, how tall, and §11.5 step 1 gives
    that question to the instrument that applies the framework to THIS plot.
    Taking the lower of the two let a generic placeholder (45 m, "DCR, plot
    schedule" — the very schedule the plan is) cut a plan printing G+1P+16 to
    fourteen levels. A metres rule that is itself plot-specific, or that
    carries life safety, still binds as the lower ceiling: the plan may not
    relax either.
  */
  const levelsGoverning = seedResolutions.get('levels.max_above_ground')?.governing;
  const heightGoverning = seedResolutions.get('height.max')?.governing;
  const planSupersedesMetres =
    statedLevels !== undefined &&
    levelsGoverning !== undefined &&
    isPlotSpecific(levelsGoverning.rule) &&
    heightGoverning !== undefined &&
    !isPlotSpecific(heightGoverning.rule) &&
    !heightGoverning.rule.isLifeSafety;
  const levelCountGoverns =
    statedLevels !== undefined && (planSupersedesMetres || statedLevels.lt(levelsByMetres));
  const maxLevelsByHeight = levelCountGoverns ? statedLevels.toNumber() : levelsByMetres;
  const permittedGfaM2 = farMax.times(plotAreaM2);

  // --- §11.7 step 2–4: ITERATE, TEST, BOUND --------------------------------

  const withLevels = (levels: number): EvalContext => ({
    ...baseCtx,
    levels: { above_ground: levels, total: levels },
  });

  const fixpoint = runFixpoint<SolverState>({
    seed: { levels: maxLevelsByHeight, ctx: withLevels(maxLevelsByHeight) },
    ruleSetKey: (s) => convergenceKey(plot, rules, s.ctx, typed),
    step: (s) => {
      const footprint = footprintAt(plot, rules, s.ctx, typed, podiumAtBoundary !== undefined);
      const coverageRes = resolveParameter('coverage.max', rules, s.ctx);
      // Set aside under the podium statement unless the plot's own sheet states it — see the final pass.
      const coverage =
        podiumAtBoundary && coverageRes.governing && !isPlotSpecific(coverageRes.governing.rule)
          ? undefined
          : num(coverageRes);
      const plateCap = num(resolveParameter('tower_plate.max', rules, s.ctx));

      const podium = coverage
        ? Decimal.min(footprint.podium, coverage.div(100).times(plotAreaM2))
        : footprint.podium;
      // The tower stands on the podium and inside its own setback line.
      const tower = Decimal.min(footprint.tower, podium);
      const plate = plateCap ? Decimal.min(tower, plateCap) : tower;

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
  const podiumInsets: EdgeInset[] = [];
  /** Per edge: the podium's setback, and whether the plot's own sheet set it. */
  const podiumSetbacks: { seq: number; valueM: Decimal; fromSheet: boolean; tower: Traced<Decimal> }[] = [];

  for (const edge of plot.edges) {
    const at = towerSetbackAt(plot, edge.seq, rules, finalCtx, typed);
    const { resolution, parameterId } = at;
    if (at.typed) {
      /* Typed by the reader, for an edge no instrument of this plot speaks to. */
      const traced = tracer.userSet(`${parameterId}.edge_${edge.seq}`, at.typed.metres, {
        actor: at.typed.actor,
        label: `tower setback for edge ${edge.seq} (${edge.classification}), typed`,
        unit: 'm',
      });
      const span = ringSpanOf(edge);
      for (let k = 0; k < span.count; k += 1) {
        insets.push({ seq: span.from + k, insetMm: toMm(at.typed.metres) });
        podiumInsets.push({ seq: span.from + k, insetMm: toMm(podiumAtBoundary ? new Decimal(0) : at.typed.metres) });
      }
      appliedSetbacks.push({
        seq: edge.seq,
        valueM: at.typed.metres,
        ruleId: 'USER_SET',
        parameterId,
        traced,
      });
      podiumSetbacks.push({
        seq: edge.seq,
        valueM: podiumAtBoundary ? new Decimal(0) : at.typed.metres,
        fromSheet: false,
        tower: traced,
      });
      // The general rule the typed value replaced, beaten and visible.
      if (resolution.governing) {
        tracer.supersededBy(
          { ruleId: resolution.governing.rule.ruleId, citation: resolution.governing.rule.citation },
          traced,
        );
      }
      continue;
    }
    if (resolution.status !== ResolutionStatus.RESOLVED || !resolution.governing) {
      throw new EnvelopeHaltedError(
        `no approved rule governs ${parameterId} for edge ${edge.seq} ` +
          `(${edge.classification}). FR-PLT-001 AC3 forbids a default setback. ` +
          'Type the tower setback for this edge on the plot step.',
        { edgeSeq: edge.seq, classification: edge.classification, status: resolution.status },
      );
    }
    const value = resolution.governing.value;
    if (value.kind !== 'scalar') {
      throw new EnvelopeHaltedError(`${parameterId} did not resolve to a scalar`, {
        kind: value.kind,
      });
    }
    const podiumValue = podiumAtBoundary && !at.plotSpecific ? new Decimal(0) : value.value;
    // One inset per *ring* edge, not per boundary. A curved boundary is one
    // entry in `plot.edges` and many vertices in `plot.ring` — the kernel is
    // polygonal — so the setback the reader set for that frontage is applied to
    // every straight piece the curve became. Pushing one inset per boundary
    // would silently leave the tessellated pieces of the curve at the setback
    // of whichever boundary happened to share their index.
    const span = ringSpanOf(edge);
    for (let k = 0; k < span.count; k += 1) {
      insets.push({ seq: span.from + k, insetMm: toMm(value.value) });
      podiumInsets.push({ seq: span.from + k, insetMm: toMm(podiumValue) });
    }

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
    podiumSetbacks.push({ seq: edge.seq, valueM: podiumValue, fromSheet: at.plotSpecific, tower: traced });
    // §11.5 step 3 — losers stay visible.
    for (const loser of resolution.superseded) {
      tracer.supersededBy({ ruleId: loser.rule.ruleId, citation: loser.rule.citation }, traced);
    }
  }

  /*
    A CURVED BOUNDARY GOES TO THE KERNEL AS A CIRCLE, NOT AS ITS PIECES.

    `offsetPerEdge` carries the argument in full: intersecting the shifted lines
    of two consecutive pieces of a 200 m arc is intersecting two lines six
    thousandths of a radian apart, and on the millimetre grid that lands the
    offset vertex up to eighty millimetres from where it belongs. The concentric
    arc is exact and well conditioned, and the centre is recovered from the
    bulge the plot stores rather than being carried as a fourth copy of it.
  */
  const arcs: BoundaryArc[] = [];
  for (const edge of plot.edges) {
    if (!edge.arc) continue;
    const span = ringSpanOf(edge);
    const circle = arcFromBulge(edge.start, edge.end, edge.arc.bulge);
    arcs.push({
      from: span.from,
      count: span.count,
      centreX: circle.centreX,
      centreY: circle.centreY,
      radiusMm: circle.radiusMm,
    });
  }

  const offset = offsetPerEdge(plot.ring, insets, arcs);
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
      // A typed setback makes this USER_SET by inheritance; claiming DERIVED over
      // it would say a clause set a value a person typed.
      ...(appliedSetbacks.some((a) => a.ruleId === 'USER_SET') ? {} : { provenanceClass: 'DERIVED' as const }),
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

  /*
    THE PODIUM'S OWN SETBACK LINE.

    With a podium statement, every edge the plot's own sheet is silent on is 0 —
    the podium, the ground floor and the basements stand on the boundary — and an
    edge the sheet sets back stays set back for the podium too. Without one, the
    podium is held to the tower's line, as every run before 16 Oct 2026 was.
  */
  const podiumOnTowerLine = !podiumAtBoundary;
  const podiumAllZero = podiumInsets.every((i) => i.insetMm === 0);
  const podiumOffset = podiumOnTowerLine
    ? offset
    : podiumAllZero
      ? { ring: plot.ring, areaMm2: plot.computedAreaMm2, exact: true }
      : offsetPerEdge(plot.ring, podiumInsets, arcs);
  const podiumSetbackM2 = mm2ToM2(podiumOffset.areaMm2);
  let podiumSetbackFootprint: Traced<Decimal> | undefined;
  if (podiumAtBoundary) {
    const zeroEdges = podiumSetbacks.filter((p) => !p.fromSheet);
    const statement = tracer.userSet('envelope.podium_setback_m', new Decimal(0), {
      actor: { id: podiumAtBoundary.statementId, name: podiumAtBoundary.statedBy },
      label:
        `podium setback on edges ${zeroEdges.map((p) => p.seq).join(', ') || 'none'} — stated ` +
        `${podiumAtBoundary.statedOn}: "${podiumAtBoundary.verbatim}"`,
      unit: 'm',
    });
    podiumSetbackFootprint = tracer.computed('envelope.podium_setback_footprint', podiumSetbackM2, {
      formula: podiumAllZero
        ? 'the plot itself: the podium, ground floor and basements stand on every boundary'
        : 'each edge offset by the podium setback: 0 where only a general rule speaks, ' +
          'the sheet’s figure where the plot’s own sheet states one',
      uses: {
        statement,
        ...Object.fromEntries(
          podiumSetbacks.filter((p) => p.fromSheet).map((p) => [`edge_${p.seq}`, p.tower] as const),
        ),
      },
      unit: 'm²',
      detail: {
        podiumSetbacks: podiumSetbacks.map((p) => ({
          edge: p.seq,
          setbackM: p.valueM.toString(),
          from: p.fromSheet ? 'the plot’s own sheet' : 'podium statement',
        })),
      },
    });
  }

  // --- Coverage cap ---
  /*
    UNDER THE PODIUM STATEMENT, ONLY THE PLOT'S OWN SHEET CAPS COVERAGE.

    A general coverage rule (the seed's 60%, "DCR, plot schedule" — a draft
    placeholder for exactly the schedule an affection plan is) would scale a
    podium the statement puts on the boundary back to 60% of the plot, and the
    parking would lose the margin the statement exists to give back. So it is
    set aside, recorded as superseded by the statement, visible. A coverage the
    plot's own sheet prints still binds — the sheet governs where it speaks.
  */
  const coverageRes = resolutions.get('coverage.max');
  const coverageGoverning = coverageRes?.governing;
  const coverageSetAside =
    podiumAtBoundary !== undefined && coverageGoverning !== undefined && !isPlotSpecific(coverageGoverning.rule);
  const coveragePct = coverageSetAside ? undefined : num(coverageRes);
  const coverageCapM2 = coveragePct ? coveragePct.div(100).times(plotAreaM2) : podiumSetbackM2;
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
        basis: coverageSetAside
          ? `the general coverage rule ${coverageGoverning!.rule.ruleId} is not applied to a podium ` +
            'the podium statement puts on the boundary; the plot’s own sheet states no coverage. ' +
            'If the community’s regulations cap coverage, this over-states the podium.'
          : `no approved coverage rule applies to this plot, so the ${podiumOnTowerLine ? 'setback-permitted footprint' : 'podium setback line'} ` +
            'is not further reduced. If a coverage cap exists and has not ' +
            'been encoded, this over-states the podium.',
        unit: 'm²',
      });
  if (coverageSetAside && podiumSetbackFootprint) {
    tracer.supersededBy(
      { ruleId: coverageGoverning!.rule.ruleId, citation: coverageGoverning!.rule.citation },
      podiumSetbackFootprint,
    );
  }

  const setAside: SetAsideRule[] = [];
  if (coverageSetAside) {
    setAside.push({
      parameterId: 'coverage.max',
      rule: coverageGoverning!.rule,
      reason:
        `${podiumAtBoundary!.statedBy}'s statement ${podiumAtBoundary!.statementId} ` +
        `(${podiumAtBoundary!.statedOn}) puts the podium, ground floor and basements on the ` +
        'boundary wherever the plot’s own sheet is silent, and this plot’s sheet states no coverage.',
    });
  }
  /*
    A setback rule every edge of whose class carries a typed value governs no edge
    of this run. One that still governs another edge of the class stays a hard
    constraint, and the composition root observes it on the edges it governs.
  */
  const typedByParameter = new Map<string, { typed: number; total: number; rule?: RuleRecord }>();
  for (const edge of plot.edges) {
    const at = towerSetbackAt(plot, edge.seq, rules, finalCtx, typed);
    const entry = typedByParameter.get(at.parameterId) ?? { typed: 0, total: 0 };
    entry.total += 1;
    if (at.typed) {
      entry.typed += 1;
      if (at.resolution.governing) entry.rule = at.resolution.governing.rule;
    }
    typedByParameter.set(at.parameterId, entry);
  }
  for (const [parameterId, entry] of typedByParameter) {
    if (entry.typed === entry.total && entry.rule) {
      setAside.push({
        parameterId,
        rule: entry.rule,
        reason:
          `every edge this rule governs on this plot carries a tower setback typed on the ` +
          `plot step, USER_SET by the person who ran it.`,
      });
    }
  }

  // --- Podium footprint = min(the podium's setback line, coverage cap) ---
  const podiumM2 = Decimal.min(podiumSetbackM2, coverageCapM2);
  const podiumLineLabel = podiumOnTowerLine ? 'setback-permitted footprint' : 'podium setback line';
  const podiumBinding: BindingConstraint = podiumM2.eq(coverageCapM2)
    ? {
        dimension: 'podium_footprint',
        ruleId: coverageRes?.governing?.rule.ruleId ?? 'ASSUMED',
        label: 'plot coverage cap',
        valueM: coverageCapM2,
        ...nearTie(podiumLineLabel, podiumSetbackM2, coverageCapM2, setbackRule?.ruleId),
      }
    : {
        dimension: 'podium_footprint',
        ruleId: podiumOnTowerLine ? (setbackRule?.ruleId ?? 'SETBACKS') : podiumAtBoundary.statementId,
        label: podiumLineLabel,
        valueM: podiumSetbackM2,
        ...nearTie('plot coverage cap', coverageCapM2, podiumSetbackM2, coverageRes?.governing?.rule.ruleId),
      };
  bindings.push(podiumBinding);

  const podiumFootprint = tracer.computed('envelope.podium_footprint', podiumM2, {
    formula: podiumOnTowerLine
      ? 'min(setback-permitted footprint, coverage cap)'
      : 'min(podium setback line, coverage cap)',
    uses: podiumSetbackFootprint
      ? { podiumLine: podiumSetbackFootprint, coverage: coverageCap }
      : { setback: setbackPermittedFootprint, coverage: coverageCap },
    unit: 'm²',
    detail: { metric: metric('PODIUM_FOOTPRINT').metricId, binding: podiumBinding.label },
  });

  // --- Tower plate = min(tower setback line, podium, tower plate cap) ---
  /*
    The tower stands on the podium AND inside its own setback line. Until the
    podium had its own line the two were one ring and the second term was the
    first; now the tower's setback is what bounds the plate on every plot whose
    podium reaches the boundary.
  */
  const towerOnPodiumM2 = Decimal.min(setbackFootprintM2, podiumM2);
  const plateRes = resolutions.get('tower_plate.max');
  const plateCap = num(plateRes);
  const plateM2 = plateCap ? Decimal.min(towerOnPodiumM2, plateCap) : towerOnPodiumM2;
  const towerUses = podiumOnTowerLine
    ? { podium: podiumFootprint }
    : { podium: podiumFootprint, towerSetback: setbackPermittedFootprint };
  const towerTerm = podiumOnTowerLine ? 'podium footprint' : 'tower setback line, podium footprint';
  const towerPlateCap = plateCap
    ? tracer.derived('envelope.tower_plate_cap', plateM2, {
        rule: {
          ruleId: plateRes!.governing!.rule.ruleId,
          citation: plateRes!.governing!.rule.citation,
        },
        formula: `min(${towerTerm}, tower plate cap ${plateCap.toString()} m²)`,
        uses: towerUses,
        unit: 'm²',
        detail: { metric: metric('TOWER_PLATE').metricId },
      })
    : tracer.computed('envelope.tower_plate_cap', plateM2, {
        formula: podiumOnTowerLine
          ? 'no tower plate cap applies; the plate is the podium footprint'
          : `min(${towerTerm}); no tower plate cap applies`,
        uses: towerUses,
        unit: 'm²',
      });

  if (!podiumOnTowerLine && setbackFootprintM2.lt(podiumM2) && !(plateCap && plateCap.lt(setbackFootprintM2))) {
    bindings.push({
      dimension: 'tower_plate',
      ruleId: setbackRule?.ruleId ?? 'SETBACKS',
      label: 'tower setback line',
      valueM: setbackFootprintM2,
      ...(plateCap ? nearTie('tower plate cap', plateCap, setbackFootprintM2, plateRes?.governing?.rule.ruleId) : {}),
    });
  }
  if (plateCap && plateCap.lt(towerOnPodiumM2)) {
    bindings.push({
      dimension: 'tower_plate',
      ruleId: plateRes!.governing!.rule.ruleId,
      label: 'tower plate cap',
      valueM: plateCap,
      ...nearTie(podiumOnTowerLine ? 'podium footprint' : 'tower setback line', towerOnPodiumM2, plateCap, podiumBinding.ruleId),
    });
  }

  // Geometric realisability: the plate must be a real polygon inside the podium,
  // not merely a number. INV-10 checks the arithmetic; this checks the geometry.
  //
  // THE PODIUM RING IS THE PODIUM FOOTPRINT, not the setback line. They were the
  // same ring until the coverage cap bound, and then the footprint figure said
  // min(setback, coverage) while every drawing and the parking layout used the
  // whole setback ring — a slab, and a car park packed into it, larger than the
  // number beside them. Cut to the cap here, once, so every consumer agrees.
  const setbackRing = offset.ring;
  const podiumLineRing = podiumOffset.ring;
  const coverageBinds = podiumM2.lt(podiumSetbackM2);
  const podiumRing = coverageBinds
    ? scaleToArea(podiumLineRing, podiumM2.times(1_000_000).toDecimalPlaces(0).toNumber())
    : podiumLineRing;
  if (coverageBinds) verifiedArea(podiumRing, 'podium footprint');
  const podiumPlacement = coverageBinds
    ? tracer.assumed('envelope.podium_placement', 'centred in the setback line', {
        label: 'where the podium stands',
        basis:
          'The coverage cap fixes how much of the plot the podium may cover, not where ' +
          'it stands. The podium is drawn as the setback line scaled about its centre ' +
          'to the capped area, which keeps its proportions and an equal margin on ' +
          'every side. Its area is the cited figure; its position is this assumption.',
      })
    : undefined;
  /*
    The ring the tower stands in: its own setback line, unless the podium came
    out smaller (a coverage cap), when it is the podium. Then scaled to the plate
    cap where that binds. scaleToArea works in mm²; plateM2 is m².
  */
  const towerBase = setbackFootprintM2.lte(podiumM2) ? setbackRing : podiumRing;
  const plateRing = plateCap && plateCap.lt(towerOnPodiumM2)
    ? scaleToArea(towerBase, plateM2.times(1_000_000).toDecimalPlaces(0).toNumber())
    : towerBase;
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
  /*
    The stated count is DERIVED from the plot's own plan, and it reaches the graph
    whether or not it governs: a reader asking "where did 5 come from" and one
    asking "why not the 14 the height allows" are both owed the same two nodes.
  */
  const levelsRes = resolutions.get('levels.max_above_ground');
  const statedLevelsT =
    statedLevels !== undefined && levelsRes?.governing
      ? tracer.derived('envelope.stated_level_count', statedLevels.toNumber(), {
          rule: {
            ruleId: levelsRes.governing.rule.ruleId,
            citation: levelsRes.governing.rule.citation,
          },
          formula: 'level count stated on the affection plan (ground + podium + typical)',
          unit: 'levels',
        })
      : undefined;
  const byMetres = `floor(height ceiling ${heightCeiling.toString()} m ÷ floor-to-floor ${floorToFloor.toString()} m) = ${levelsByMetres}`;
  const maxLevels: Traced<number> = tracer.computed(
    'envelope.max_levels_by_height',
    maxLevelsByHeight,
    {
      formula: statedLevelsT
        ? planSupersedesMetres
          ? `stated level count ${statedLevelsT.value}, the plot's own plan, which governs ` +
            `under §11.5 step 1 over the generic ${byMetres}`
          : `min(${byMetres}, stated level count ${statedLevelsT.value})`
        : byMetres,
      uses: statedLevelsT
        ? { height: heightCeilingT, f2f: floorToFloorT, stated: statedLevelsT }
        : { height: heightCeilingT, f2f: floorToFloorT },
      unit: 'levels',
    },
  );

  bindings.push(
    levelCountGoverns && levelsRes?.governing
      ? {
          /* The value is the COUNT, not a height: multiplying it by the
             floor-to-floor would print a metres ceiling the plan never stated.
             The metres ceiling is the runner-up, in the same unit, so the reader
             sees both — five by the plan, fourteen by the height rule. */
          dimension: 'levels',
          ruleId: levelsRes.governing.rule.ruleId,
          label: 'level count stated on the affection plan',
          valueM: new Decimal(maxLevelsByHeight),
          runnerUp: {
            ruleId: heightRes.governing!.rule.ruleId,
            label: planSupersedesMetres
              ? 'levels the generic height rule would allow (superseded by the plan, §11.5 step 1)'
              : 'levels the height ceiling allows',
            valueM: new Decimal(levelsByMetres),
            withinOnePercent: false,
          },
        }
      : {
          dimension: 'levels',
          ruleId: heightRes.governing!.rule.ruleId,
          label: 'height ceiling',
          valueM: heightCeiling,
        },
  );

  return {
    setbackPermittedFootprint,
    ...(podiumSetbackFootprint ? { podiumSetbackFootprint } : {}),
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
    setAside,
    setbackRing,
    podiumRing,
    plateRing,
    podiumPlacement,
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
  typed: ReadonlyMap<number, TypedSetback> | undefined,
): string {
  const applicable = applicableRuleSetKey(rules, ctx);

  const resolved: string[] = [];
  for (const p of ENVELOPE_PARAMETERS) {
    const v = num(resolveParameter(p, rules, ctx));
    if (v !== undefined) resolved.push(`${p}=${v.toString()}`);
  }
  for (const edge of plot.edges) {
    const { value, parameterId } = towerSetbackAt(plot, edge.seq, rules, ctx, typed);
    resolved.push(`${parameterId}#${edge.seq}=${value?.toString() ?? 'none'}`);
  }

  return `${applicable}::${resolved.sort().join(',')}`;
}

/** The tower's setback footprint and the podium's, at one level assumption, m². */
function footprintAt(
  plot: Plot,
  rules: readonly RuleRecord[],
  ctx: EvalContext,
  typed: ReadonlyMap<number, TypedSetback> | undefined,
  podiumAtBoundary: boolean,
): { readonly tower: Decimal; readonly podium: Decimal } {
  const zero = { tower: new Decimal(0), podium: new Decimal(0) };
  const insets: EdgeInset[] = [];
  const podiumInsets: EdgeInset[] = [];
  for (const edge of plot.edges) {
    const s = towerSetbackAt(plot, edge.seq, rules, ctx, typed);
    if (s.value === undefined) {
      // Mid-iteration, an unresolved setback means this level assumption is not
      // viable. Returning zero drives the next iteration to the height cap
      // rather than crashing inside the loop; the final pass reports properly.
      return zero;
    }
    const span = ringSpanOf(edge);
    for (let k = 0; k < span.count; k += 1) {
      insets.push({ seq: span.from + k, insetMm: toMm(s.value) });
      podiumInsets.push({
        seq: span.from + k,
        insetMm: toMm(podiumAtBoundary && !s.plotSpecific ? new Decimal(0) : s.value),
      });
    }
  }
  const areaOf = (ins: readonly EdgeInset[]): Decimal => {
    if (ins.every((i) => i.insetMm === 0)) return mm2ToM2(plot.computedAreaMm2);
    try {
      return mm2ToM2(offsetPerEdge(plot.ring, ins).areaMm2);
    } catch {
      // Over-consumed at this level assumption. Zero pushes the iteration toward
      // fewer levels, which is the direction that relieves the setback.
      return new Decimal(0);
    }
  };
  return { tower: areaOf(insets), podium: areaOf(podiumInsets) };
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
