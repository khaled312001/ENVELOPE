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
  citesPlaceholder,
  decisionKindOf,
  DecisionKind,
  faceOptionsOf,
  heightFromStatedFloors,
  isNotApplicable,
  isPlotSpecific,
  Operator,
  podiumSetbackParameter,
  resolveParameter,
  ResolutionStatus,
  type EvalContext,
  type FaceOption,
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
  /*
    The tower's own coverage, a percentage of the plot — an affection plan's
    "Tower: Maximum 60%". Optional: no seed rule states one.
  */
  'tower_coverage.max',
  'height.max',
  /*
    A ceiling stated as a COUNT — an affection plan's `G+4`. Optional: no seed rule
    states one, so on a plot without a sheet it resolves to nothing and the metres
    ceiling governs alone. The sheet never converts it to metres (see
    `instruments/sheet.ts`); the code does, by its own factor — B.4.2.2 ¶6's
    `R-DBC-B422-HEIGHT` reads it as floors × 6 m, and that is the only conversion.
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
): { resolution: Resolution; parameterId: string; podium: Resolution } {
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
  return {
    resolution: resolveParameter(parameterId, rules, edgeCtx),
    parameterId,
    podium: resolveParameter(podiumSetbackParameter(edge.classification), rules, edgeCtx),
  };
}

/** "front 0 m; side 3 m; rear 3 m" — a decision's faces, as the sentences that ask for one print them. */
/** Whether a rule reads its value off a table keyed on the level count above grade (Table B.1). */
function keyedOnLevels(rule: RuleRecord): boolean {
  const key = rule.evaluatorArgs['key'];
  return Array.isArray(key) && key.includes('levels.above_ground');
}

function facesSaid(options: readonly FaceOption[]): string {
  return options.map((o) => `${o.face} ${o.metres === null ? 'not stated' : `${o.metres} m`}`).join('; ');
}

/** Why a setback rule every edge of whose class was typed is set aside: the reader typed over it. */
export const TYPED_OVER_RULE_REASON =
  'every edge this rule governs on this plot carries a tower setback typed on the ' +
  'plot step, USER_SET by the person who ran it.';
/** Why the sheet's "which face?" rule is set aside once every boundary it asks about is answered. */
export const ANSWERED_BY_FACE_REASON =
  'the affection plan states this setback by face and does not say which face each boundary is; ' +
  'the reader answered it on the plot step, face by face.';
/** The relative effect a sensitivity edge records when the perturbed geometry cannot be built. */
export const NOT_MEASURABLE = 'not measurable';

/** Where one boundary's podium setback came from. */
const PodiumSource = {
  /** The plot's own sheet states the podium's figure for this boundary. */
  SHEET: 'SHEET',
  /** The podium statement: 0, the sheet being silent. */
  STATEMENT: 'STATEMENT',
  /** The sheet leaves a choice and the statement's answer to it is assumed. */
  ASSUMED: 'ASSUMED',
  /** No statement and no sheet figure: the podium is held to the tower's line. */
  TOWER: 'TOWER',
} as const;
type PodiumSource = (typeof PodiumSource)[keyof typeof PodiumSource];

/** What the plot's own sheet says about the PODIUM on one boundary, if anything. */
interface PodiumSheet {
  /** One figure: the sheet's podium row, as a number. */
  readonly stated?: { readonly value: Decimal; readonly resolution: Resolution };
  /** The sheet's podium row, as a choice it leaves open: a façade, or which face. */
  readonly decision?: {
    readonly options: readonly FaceOption[];
    readonly kind: DecisionKind;
    readonly resolution: Resolution;
  };
}

function podiumSheetOf(resolution: Resolution): PodiumSheet {
  const g = resolution.governing;
  // `setback.podium.*` is bound by the plot's own sheet and by nothing else.
  if (resolution.status !== ResolutionStatus.RESOLVED || !g || !isPlotSpecific(g.rule)) return {};
  const options = faceOptionsOf(g.rule);
  if (options) return { decision: { options, kind: decisionKindOf(g.rule) ?? DecisionKind.FACE, resolution } };
  return g.value.kind === 'scalar' ? { stated: { value: g.value.value, resolution } } : {};
}

/** One boundary's setbacks: the tower's, and what the sheet says of the podium beneath it. */
interface EdgeSetback {
  /** `setback.<class>` — the TOWER's parameter. */
  readonly parameterId: string;
  readonly resolution: Resolution;
  /** The tower's own figure: the rule's or the reader's. Undefined while a face is unanswered. */
  readonly value: Decimal | undefined;
  readonly typed: TypedSetback | undefined;
  /** The plot's own sheet states this boundary's tower setback as one number. */
  readonly plotSpecific: boolean;
  /** Set when the sheet states it by face, and the reader's typed value named the face. */
  readonly answered?: readonly FaceOption[];
  /** Set when the sheet states it by face and nobody has said which face this is. */
  readonly pendingFaces?: readonly FaceOption[];
  readonly podium: PodiumSheet;
}

/**
 * The tower setback on one edge: the rule's, or the one the reader typed — and
 * what the plot's own sheet says about the podium on the same boundary.
 *
 * PRECEDENCE, and why it is this way round. The plot's own instrument governs
 * (§11.5 step 1) and a typed value may not override it — that would be a person
 * relaxing an issued sheet by typing. Below the instrument, a typed value beats a
 * GENERAL rule: Eng. Mohamed, «لو مش موجوده في ال affection plan اكتبهاله». The
 * general rule is then recorded as superseded by the typed value, visible.
 *
 * THE FIGURE A TYPED VALUE IS HELD TO IS THE TOWER'S. This compared against
 * whatever governed `setback.<class>`, which on every Trakhees sheet was the
 * podium row: Warsan's "GF & Podium: 0m from all sides" refused a typed 3 m with
 * "the affection plan states 0 m for this boundary", while the sheet's tower row
 * said 3 m. `setback.<class>` is now the tower row's, the podium row is
 * `setback.podium.<class>`, and each refusal quotes the figure it is about.
 *
 * Two more refusals, both in a sentence: a typed figure that is none of the faces
 * a by-face sheet allows (the reader names the face, and the figure follows), and
 * a typed figure smaller than the podium the sheet sets back beneath it — a tower
 * cannot stand outside the podium it stands on.
 */
function edgeSetbackAt(
  plot: Plot,
  edgeSeq: number,
  rules: readonly RuleRecord[],
  ctx: EvalContext,
  typed: ReadonlyMap<number, TypedSetback> | undefined,
): EdgeSetback {
  const { resolution, parameterId, podium: podiumRes } = setbackForEdge(plot, edgeSeq, rules, ctx);
  const podium = podiumSheetOf(podiumRes);
  const governing = resolution.governing;
  const sheetGoverns = governing !== undefined && isPlotSpecific(governing.rule);
  const mine = typed?.get(edgeSeq);

  if (mine && podium.stated && mine.metres.lt(podium.stated.value)) {
    throw new EnvelopeHaltedError(
      `edge ${edgeSeq}: the affection plan sets the podium back ${podium.stated.value.toString()} m on this ` +
        `boundary and the tower stands on the podium, so a tower setback of ${mine.metres.toString()} m ` +
        `cannot be built. Type at least ${podium.stated.value.toString()} m, or clear the value.`,
      { edgeSeq, typed: mine.metres.toString(), podium: podium.stated.value.toString() },
    );
  }

  const faces = sheetGoverns ? faceOptionsOf(governing.rule) : undefined;
  if (faces) {
    if (!mine) {
      return { parameterId, resolution, value: undefined, typed: undefined, plotSpecific: false, pendingFaces: faces, podium };
    }
    if (!faces.some((o) => o.metres === null || mine.metres.eq(o.metres))) {
      throw new EnvelopeHaltedError(
        `edge ${edgeSeq}: a typed tower setback of ${mine.metres.toString()} m is none of the figures the ` +
          `affection plan states by face (${facesSaid(faces)}). Type the figure for the face this boundary is.`,
        { edgeSeq, typed: mine.metres.toString() },
      );
    }
    return { parameterId, resolution, value: mine.metres, typed: mine, plotSpecific: false, answered: faces, podium };
  }

  if (mine && sheetGoverns) {
    const v = governing.value;
    const stated = v.kind === 'scalar' ? v.value : undefined;
    /* The reader typed what the sheet says. Nothing to refuse and nothing to
       record as theirs: the sheet's figure governs, DERIVED, as if blank. */
    if (stated && mine.metres.eq(stated)) {
      return { parameterId, resolution, value: stated, typed: undefined, plotSpecific: true, podium };
    }
    throw new EnvelopeHaltedError(
      `edge ${edgeSeq}: the affection plan states a tower setback of ${stated?.toString() ?? '—'} m for this ` +
        `boundary ("${governing.rule.citation.sourceTextVerbatim}"), and a typed ${mine.metres.toString()} m may ` +
        `not replace it. Clear the typed value, or type ${stated?.toString() ?? '—'} m.`,
      { edgeSeq, typed: mine.metres.toString() },
    );
  }
  if (mine) return { parameterId, resolution, value: mine.metres, typed: mine, plotSpecific: false, podium };
  const v = governing?.value;
  return {
    parameterId,
    resolution,
    value: resolution.status === ResolutionStatus.RESOLVED && v && v.kind === 'scalar' ? v.value : undefined,
    typed: undefined,
    plotSpecific: sheetGoverns,
    podium,
  };
}

/**
 * The podium's figure where the sheet leaves its façade (or its face) open and
 * the podium statement is in force — which option is taken, and which one is
 * measured against it.
 *
 * A façade: the solid wall, because the statement puts a parking podium on the
 * boundary and a window wall needs the larger figure. Which face: the larger, so
 * the podium is drawn inside both of the sheet's lines.
 */
function podiumAssumption(
  decision: NonNullable<PodiumSheet['decision']>,
): { readonly taken: FaceOption & { readonly metres: string }; readonly other: FaceOption & { readonly metres: string } } {
  const numbered = decision.options.filter((o): o is FaceOption & { readonly metres: string } => o.metres !== null);
  const byMetres = [...numbered].sort((a, b) => new Decimal(a.metres).cmp(b.metres));
  const smallest = byMetres[0]!;
  const largest = byMetres[byMetres.length - 1]!;
  if (decision.kind === DecisionKind.FACADE) {
    const solid = numbered.find((o) => /solid/i.test(o.face)) ?? smallest;
    const other = numbered.find((o) => o !== solid && !new Decimal(o.metres).eq(solid.metres)) ?? largest;
    return { taken: solid, other };
  }
  return { taken: largest, other: smallest };
}

/**
 * The tower's and the podium's inset on one boundary, in metres, at one context.
 *
 * The tower stands on the podium, so where the sheet sets the podium back further
 * than the tower's own figure the tower takes the podium's. The podium is the
 * sheet's figure where it states one; under the podium statement it is 0 where
 * the sheet is silent and the assumed option where the sheet leaves a choice;
 * without the statement it is the tower's line, as every run before 16 Oct 2026.
 */
function insetsOf(
  s: EdgeSetback,
  podiumAtBoundary: boolean,
): { readonly tower: Decimal | undefined; readonly podium: Decimal | undefined } {
  const own = s.value;
  // The podium's line where the sheet sets it: stated, or assumed under the statement.
  const fromSheet =
    s.podium.stated?.value ??
    (podiumAtBoundary && s.podium.decision ? new Decimal(podiumAssumption(s.podium.decision).taken.metres) : undefined);
  const tower = own === undefined ? undefined : fromSheet && fromSheet.gt(own) ? fromSheet : own;
  const podium = fromSheet ?? (podiumAtBoundary ? new Decimal(0) : tower);
  return { tower, podium };
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
  /*
    THE STATED FLOOR COUNT GOES INTO THE CONTEXT, because DBC B.4.2.2 ¶6 makes the
    height ceiling a function of it: the floors the affection plan or DCR allows ×
    6 m (`R-DBC-B422-HEIGHT`). It is resolved first, on its own, and carried at
    `levels.max_above_ground` through every iteration. Absent, it is absent — the
    height rule then does not apply and the run is refused below, never given a
    height nobody stated.
  */
  const statedCount = num(resolveParameter('levels.max_above_ground', rules, { ...baseCtx, levels: { above_ground: 0 } }));
  const statedFloors = statedCount ? { max_above_ground: statedCount.toNumber() } : {};
  const seedResolutions = resolveAll(rules, { ...baseCtx, levels: { above_ground: 0, ...statedFloors } });
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
  if (
    !heightCeiling &&
    statedCount === undefined &&
    rules.some((r) => r.parameterId === 'height.max' && heightFromStatedFloors(r))
  ) {
    throw new EnvelopeHaltedError(
      'no floor count is stated for this plot, so no height can be computed. DBC B.4.2.2 ¶1: ' +
        'building heights follow the affection plan or DCR, and ¶6 sets the ceiling at the floors ' +
        'they allow × 6 m. The engine does not substitute a height. Add the plot’s affection plan, ' +
        'or a floor count from its DCR.',
      { missing: ['levels.max_above_ground'] },
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
  const statedLevels = statedCount;
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
  /*
    A height rule that IS the stated count in metres (B.4.2.2 ¶6, floors × 6 m)
    is not a rival ceiling for the plan to supersede: setting it aside would
    declare the code's own conversion "not applied" on every plot with a sheet.
  */
  const heightIsTheCount = heightGoverning !== undefined && heightFromStatedFloors(heightGoverning.rule);
  const planSupersedesMetres =
    statedLevels !== undefined &&
    levelsGoverning !== undefined &&
    isPlotSpecific(levelsGoverning.rule) &&
    heightGoverning !== undefined &&
    !heightIsTheCount &&
    !isPlotSpecific(heightGoverning.rule) &&
    !heightGoverning.rule.isLifeSafety;
  const levelCountGoverns =
    statedLevels !== undefined && (planSupersedesMetres || statedLevels.lt(levelsByMetres));
  const maxLevelsByHeight = levelCountGoverns ? statedLevels.toNumber() : levelsByMetres;
  const permittedGfaM2 = farMax.times(plotAreaM2);

  // --- §11.7 step 2–4: ITERATE, TEST, BOUND --------------------------------

  const withLevels = (levels: number): EvalContext => ({
    ...baseCtx,
    levels: { above_ground: levels, total: levels, ...statedFloors },
  });

  const fixpoint = runFixpoint<SolverState>({
    seed: { levels: maxLevelsByHeight, ctx: withLevels(maxLevelsByHeight) },
    ruleSetKey: (s) => convergenceKey(plot, rules, s.ctx, typed, podiumAtBoundary !== undefined),
    step: (s) => {
      const footprint = footprintAt(plot, rules, s.ctx, typed, podiumAtBoundary !== undefined);
      const coverageRes = resolveParameter('coverage.max', rules, s.ctx);
      // Set aside under the podium statement unless the plot's own sheet states it — see the final pass.
      const coverage =
        podiumAtBoundary && coverageRes.governing && !isPlotSpecific(coverageRes.governing.rule)
          ? undefined
          : num(coverageRes);
      const plateCap = num(resolveParameter('tower_plate.max', rules, s.ctx));
      const towerCoverage = num(resolveParameter('tower_coverage.max', rules, s.ctx));

      const podium = coverage
        ? Decimal.min(footprint.podium, coverage.div(100).times(plotAreaM2))
        : footprint.podium;
      // The tower stands on the podium and inside its own setback line.
      const tower = Decimal.min(footprint.tower, podium);
      const capped = plateCap ? Decimal.min(tower, plateCap) : tower;
      const plate = towerCoverage ? Decimal.min(capped, towerCoverage.div(100).times(plotAreaM2)) : capped;

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
  /**
   * Per edge: the podium's setback and where it came from — the plot's own sheet,
   * the podium statement (0), an assumption where the sheet leaves a choice open,
   * or the tower's line (no statement, sheet silent).
   */
  const podiumSetbacks: { seq: number; valueM: Decimal; from: PodiumSource; traced: Traced<Decimal> | undefined }[] = [];
  /** The podium setbacks a sheet rule set, published so the validator can hold the podium to its row. */
  const appliedPodiumSetbacks: NonNullable<BuildableEnvelope['appliedPodiumSetbacks']>[number][] = [];

  const edgeSetbacks = plot.edges.map((edge) => ({ edge, at: edgeSetbackAt(plot, edge.seq, rules, finalCtx, typed) }));
  /** The level count a level-keyed setback row was read at: the fixpoint's. */
  const levelsKey = (finalCtx['levels'] as { above_ground?: number } | undefined)?.above_ground;

  /*
    A BOUNDARY WHOSE FACE IS UNANSWERED STOPS THE RUN, IN A SENTENCE THAT ASKS.
    The sheet states the tower setback by face and this plot does not say which
    face the boundary is — two roads, or a side and a rear that differ. Taking
    either figure would be choosing for the reader; taking the larger "to be
    safe" would be the same choice made quietly.
  */
  for (const { edge, at } of edgeSetbacks) {
    if (at.pendingFaces) {
      throw new EnvelopeHaltedError(
        `edge ${edge.seq}: the affection plan states the tower setback by face (${facesSaid(at.pendingFaces)}) ` +
          'and does not say which face this boundary is. Type the figure for the face it is on the plot step.',
        { edgeSeq: edge.seq, faces: at.pendingFaces },
      );
    }
  }

  /*
    THE PODIUM WHERE THE SHEET LEAVES A CHOICE, UNDER THE PODIUM STATEMENT.
    "0m to solid wall and 4.0m to window wall" is a façade nobody has drawn yet.
    The statement puts the podium on the boundary, which only the solid-wall
    answer allows, so that is taken — ASSUMED, amber, one entry per choice the
    sheet leaves open, with the other answer measured on the podium below.
  */
  const podiumChoices = new Map<
    string,
    { readonly decision: NonNullable<PodiumSheet['decision']>; readonly seqs: number[]; traced?: Traced<Decimal> }
  >();
  if (podiumAtBoundary) {
    for (const { edge, at } of edgeSetbacks) {
      const decision = at.podium.decision;
      if (!decision || at.podium.stated) continue;
      const ruleId = decision.resolution.governing!.rule.ruleId;
      const entry = podiumChoices.get(ruleId) ?? { decision, seqs: [] };
      entry.seqs.push(edge.seq);
      podiumChoices.set(ruleId, entry);
    }
    for (const entry of podiumChoices.values()) {
      const { taken, other } = podiumAssumption(entry.decision);
      const rule = entry.decision.resolution.governing!.rule;
      entry.traced = tracer.assumed(rule.parameterId, new Decimal(taken.metres), {
        label: `podium setback on edges ${entry.seqs.join(', ')}, where the affection plan leaves a choice`,
        unit: 'm',
        basis:
          entry.decision.kind === DecisionKind.FACADE
            ? `The affection plan sets the podium back by façade on edges ${entry.seqs.join(', ')} ` +
              `(${facesSaid(entry.decision.options)}). The podium is taken as a solid wall there, ` +
              `${taken.metres} m, because ${podiumAtBoundary.statedBy}'s statement ` +
              `${podiumAtBoundary.statementId} puts the podium on the boundary. A window wall would ` +
              `need ${other.metres} m.`
            : `The affection plan states a different podium setback for the side and for the rear ` +
              `(${facesSaid(entry.decision.options)}), and which boundary is the rear is not on the ` +
              `sheet. The larger, ${taken.metres} m, is taken on edges ${entry.seqs.join(', ')}, so the ` +
              'podium is drawn inside both lines.',
        detail: { citation: rule.citation.sourceTextVerbatim, ruleId: rule.ruleId },
      });
    }
  }

  for (const { edge, at } of edgeSetbacks) {
    const { resolution, parameterId } = at;
    let own: Traced<Decimal>;
    let ownRuleId: string;
    if (at.typed) {
      /* Typed by the reader: for an edge no instrument of this plot speaks to,
         or naming the face of a boundary the sheet states by face. */
      own = tracer.userSet(`${parameterId}.edge_${edge.seq}`, at.typed.metres, {
        actor: at.typed.actor,
        label: at.answered
          ? `tower setback for edge ${edge.seq} (${edge.classification}), typed — the affection plan ` +
            `states it by face (${facesSaid(at.answered)}) and the reader named the face`
          : `tower setback for edge ${edge.seq} (${edge.classification}), typed`,
        unit: 'm',
      });
      ownRuleId = 'USER_SET';
      if (at.answered) {
        // The sheet's question was answered, not overruled: the general rules it beat stay visible.
        for (const loser of resolution.superseded) {
          tracer.supersededBy({ ruleId: loser.rule.ruleId, citation: loser.rule.citation }, own);
        }
      } else if (resolution.governing) {
        // The general rule the typed value replaced, beaten and visible.
        tracer.supersededBy(
          { ruleId: resolution.governing.rule.ruleId, citation: resolution.governing.rule.citation },
          own,
        );
      }
    } else {
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
      // One traced node per edge, emitted unconditionally.
      //
      // It used to be created only inside the superseded loop below, which meant
      // an edge governed by a single uncontested rule produced no node at all —
      // the setback with the *least* controversy was the one a user could not
      // click through. Emitted here, every edge reaches its clause and the
      // supersession edges below attach to the same node rather than to copies.
      own = tracer.derived(`${parameterId}.edge_${edge.seq}`, value.value, {
        rule: {
          ruleId: resolution.governing.rule.ruleId,
          citation: resolution.governing.rule.citation,
        },
        /*
          WHICH LEVEL COUNT KEYS A TABLE B.1 ROW, SAID IN THE FORMULA. The row is
          read at the fixpoint's count — the levels the permitted GFA needs on
          this plate — and not at the levels the run finally places, which a
          parking or whole-level limit can bring lower (13 against 7 on the
          worked example: 7.50 m rather than 5.25 m). Keying it on the placed
          building would put the parking layout inside the fixpoint, a second
          loop the solver does not run. Which count the authority reads the
          table by is open with the client; until then the reader is told.
        */
        formula:
          `setback for edge ${edge.seq} (${edge.classification})` +
          (keyedOnLevels(resolution.governing.rule)
            ? `, read at ${levelsKey ?? '?'} level(s) above ground — the levels the permitted GFA ` +
              'needs on this plate (setback↔floor fixpoint), not the levels this run places'
            : ''),
        unit: 'm',
        detail: {
          edgeSeq: edge.seq,
          classification: edge.classification,
          roadHierarchy: edge.roadHierarchy ?? null,
          levelsAssumed: levelsKey,
        },
      });
      ownRuleId = resolution.governing.rule.ruleId;
      // §11.5 step 3 — losers stay visible.
      for (const loser of resolution.superseded) {
        tracer.supersededBy({ ruleId: loser.rule.ruleId, citation: loser.rule.citation }, own);
      }
    }

    // --- The podium beneath this boundary, and the tower standing on it ---
    const { tower, podium } = insetsOf(at, podiumAtBoundary !== undefined);
    const stated = at.podium.stated;
    const choice = podiumAtBoundary && !stated && at.podium.decision
      ? podiumChoices.get(at.podium.decision.resolution.governing!.rule.ruleId)
      : undefined;
    let podiumTraced: Traced<Decimal> | undefined;
    let from: PodiumSource;
    if (stated) {
      const rule = stated.resolution.governing!.rule;
      podiumTraced = tracer.derived(`${podiumSetbackParameter(edge.classification)}.edge_${edge.seq}`, stated.value, {
        rule: { ruleId: rule.ruleId, citation: rule.citation },
        formula: `podium setback for edge ${edge.seq} (${edge.classification})`,
        unit: 'm',
        detail: { edgeSeq: edge.seq, classification: edge.classification },
      });
      from = PodiumSource.SHEET;
    } else if (choice) {
      podiumTraced = choice.traced;
      from = PodiumSource.ASSUMED;
    } else {
      from = podiumAtBoundary ? PodiumSource.STATEMENT : PodiumSource.TOWER;
    }

    /*
      THE TOWER STANDS ON THE PODIUM. Where the sheet sets the podium back further
      than the tower's own figure, the tower's line is the podium's — said in the
      formula and cited to the podium's row, not hidden in a max().
    */
    const towerM = tower!;
    let traced = own;
    let ruleId = ownRuleId;
    if (podiumTraced && towerM.gt(own.value)) {
      traced = tracer.computed(`${parameterId}.edge_${edge.seq}.on_podium`, towerM, {
        formula:
          `the tower stands on the podium, which is set back ${towerM.toString()} m on edge ${edge.seq}; ` +
          `the tower's own figure there is ${own.value.toString()} m`,
        uses: { podium: podiumTraced, tower: own },
        unit: 'm',
      });
      ruleId = stated ? stated.resolution.governing!.rule.ruleId : ruleId;
    }

    // One inset per *ring* edge, not per boundary. A curved boundary is one
    // entry in `plot.edges` and many vertices in `plot.ring` — the kernel is
    // polygonal — so the setback the reader set for that frontage is applied to
    // every straight piece the curve became. Pushing one inset per boundary
    // would silently leave the tessellated pieces of the curve at the setback
    // of whichever boundary happened to share their index.
    const span = ringSpanOf(edge);
    for (let k = 0; k < span.count; k += 1) {
      insets.push({ seq: span.from + k, insetMm: toMm(towerM) });
      podiumInsets.push({ seq: span.from + k, insetMm: toMm(podium!) });
    }
    appliedSetbacks.push({ seq: edge.seq, valueM: towerM, ruleId, parameterId, traced });
    if (stated && podiumTraced) {
      appliedPodiumSetbacks.push({
        seq: edge.seq,
        valueM: stated.value,
        ruleId: stated.resolution.governing!.rule.ruleId,
        parameterId: podiumSetbackParameter(edge.classification),
        traced: podiumTraced,
      });
    }
    podiumSetbacks.push({
      seq: edge.seq,
      valueM: podium!,
      from,
      traced: from === PodiumSource.TOWER ? traced : podiumTraced,
    });
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
  /*
    The rule a "tower setback line" binding is named after: the edge set back
    furthest. The first edge is usually the road, and on Warsan its 0 m is the one
    figure in the tower line that does not cut it.
  */
  const towerLineRule = appliedSetbacks.reduce<(typeof appliedSetbacks)[number] | undefined>(
    (a, b) => (a === undefined || b.valueM.gt(a.valueM) ? b : a),
    undefined,
  );
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
    podium is held to the tower's line, as every run before 16 Oct 2026 was —
    except where the sheet's own podium row states a figure, which is the
    podium's whichever way the run was asked.
  */
  const podiumOnTowerLine = !podiumAtBoundary && podiumSetbacks.every((p) => p.from === PodiumSource.TOWER);
  const podiumAllZero = podiumInsets.every((i) => i.insetMm === 0);
  const podiumSameAsTower = podiumInsets.every((p, i) => p.insetMm === insets[i]?.insetMm);
  const podiumOffset =
    podiumOnTowerLine || podiumSameAsTower
      ? offset
      : podiumAllZero
        ? { ring: plot.ring, areaMm2: plot.computedAreaMm2, exact: true }
        : offsetPerEdge(plot.ring, podiumInsets, arcs);
  const podiumSetbackM2 = mm2ToM2(podiumOffset.areaMm2);
  const fromWords: Readonly<Record<PodiumSource, string>> = {
    SHEET: 'the plot’s own sheet',
    STATEMENT: 'podium statement',
    ASSUMED: 'assumed where the sheet leaves a choice',
    TOWER: 'the tower’s line',
  };
  let podiumSetbackFootprint: Traced<Decimal> | undefined;
  if (!podiumOnTowerLine) {
    const statementUses: Record<string, Traced<unknown>> = {};
    if (podiumAtBoundary) {
      const zeroEdges = podiumSetbacks.filter((p) => p.from === PodiumSource.STATEMENT);
      statementUses['statement'] = tracer.userSet('envelope.podium_setback_m', new Decimal(0), {
        actor: { id: podiumAtBoundary.statementId, name: podiumAtBoundary.statedBy },
        label:
          `podium setback on edges ${zeroEdges.map((p) => p.seq).join(', ') || 'none'} — stated ` +
          `${podiumAtBoundary.statedOn}: "${podiumAtBoundary.verbatim}"`,
        unit: 'm',
      });
    }
    const anyAssumed = podiumSetbacks.some((p) => p.from === PodiumSource.ASSUMED);
    podiumSetbackFootprint = tracer.computed('envelope.podium_setback_footprint', podiumSetbackM2, {
      formula: podiumAllZero
        ? 'the plot itself: the podium, ground floor and basements stand on every boundary'
        : podiumAtBoundary
          ? 'each edge offset by the podium setback: 0 where only a general rule speaks, ' +
            'the sheet’s figure where the plot’s own sheet states one' +
            (anyAssumed ? ', the assumed answer where the sheet leaves a choice' : '')
          : 'each edge offset by the podium setback the plot’s own sheet states, and by the ' +
            'tower’s line where it states none',
      uses: {
        ...statementUses,
        ...Object.fromEntries(
          podiumSetbacks.flatMap((p) =>
            p.from !== PodiumSource.STATEMENT && p.traced ? [[`edge_${p.seq}`, p.traced] as const] : [],
          ),
        ),
      },
      unit: 'm²',
      detail: {
        podiumSetbacks: podiumSetbacks.map((p) => ({
          edge: p.seq,
          setbackM: p.valueM.toString(),
          from: fromWords[p.from],
        })),
      },
    });

    /*
      THE OTHER ANSWER, MEASURED. For each choice the sheet left open, the
      podium line is offset again with the answer not taken on those edges, and
      the difference is recorded against the assumption — "we took the solid
      wall and the window wall would cost 6%" is an answer; a basis with no
      effect beside it is only half of one.
    */
    for (const entry of podiumChoices.values()) {
      if (!entry.traced) continue;
      const { other } = podiumAssumption(entry.decision);
      const altInsets = podiumInsets.map((i) => {
        const edge = plot.edges.find((e) => {
          const span = ringSpanOf(e);
          return i.seq >= span.from && i.seq < span.from + span.count;
        });
        return edge && entry.seqs.includes(edge.seq) ? { seq: i.seq, insetMm: toMm(new Decimal(other.metres)) } : i;
      });
      /*
        WHERE THE OTHER ANSWER CANNOT BE DRAWN, ITS EFFECT IS NOT MEASURABLE — NOT
        −100%. The re-offset throws when the other figure consumes the podium
        (§14.3: degenerate geometry raises). This wrote '-1', which a register
        ranking by magnitude reads as "the podium vanishes", a measurement nobody
        made. The reason travels in the perturbation instead.
      */
      let relativeEffect: string;
      let unmeasurable: string | undefined;
      try {
        const alt = mm2ToM2(offsetPerEdge(plot.ring, altInsets, arcs).areaMm2);
        relativeEffect = podiumSetbackM2.isZero() ? '0' : alt.minus(podiumSetbackM2).div(podiumSetbackM2).toFixed(4);
      } catch (error) {
        relativeEffect = NOT_MEASURABLE;
        unmeasurable = error instanceof Error ? error.message : String(error);
      }
      tracer.sensitiveTo(podiumSetbackFootprint, entry.traced, {
        relativeEffect,
        perturbation:
          `${other.metres} m (${other.face}) on edges ${entry.seqs.join(', ')} instead of ${podiumAssumption(entry.decision).taken.metres} m` +
          (unmeasurable === undefined ? '' : ` — not measurable: the podium line cannot be drawn with it (${unmeasurable})`),
      });
    }
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
  for (const { at } of edgeSetbacks) {
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
        /*
          A QUESTION ANSWERED IS NOT A RULE OVERRULED. The sheet's "which face?"
          rule on a two-road plot is set aside once the reader has named the face
          of every road, with one of the sheet's own figures — and the generic
          sentence read as though the reader had typed over the sheet. Its own
          reason says what happened (17 Oct 2026).
        */
        reason: faceOptionsOf(entry.rule) ? ANSWERED_BY_FACE_REASON : TYPED_OVER_RULE_REASON,
      });
    }
  }

  // --- Podium footprint = min(the podium's setback line, coverage cap) ---
  const podiumM2 = Decimal.min(podiumSetbackM2, coverageCapM2);
  const podiumLineLabel = podiumOnTowerLine ? 'setback-permitted footprint' : 'podium setback line';
  /*
    Who set the podium's line: the tower's rule where the podium is on the tower
    line; otherwise the statement, or — without one — the sheet's podium row. It
    was the first edge's TOWER rule in every case, which named a tower setback as
    the runner-up to a podium the statement had put on the boundary.
  */
  const podiumLineRuleId = podiumOnTowerLine
    ? (setbackRule?.ruleId ?? 'SETBACKS')
    : (podiumAtBoundary?.statementId ??
      edgeSetbacks.find((e) => e.at.podium.stated)?.at.podium.stated?.resolution.governing?.rule.ruleId ??
      'SETBACKS');
  const podiumBinding: BindingConstraint = podiumM2.eq(coverageCapM2)
    ? {
        dimension: 'podium_footprint',
        ruleId: coverageRes?.governing?.rule.ruleId ?? 'ASSUMED',
        label: 'plot coverage cap',
        valueM: coverageCapM2,
        ...nearTie(podiumLineLabel, podiumSetbackM2, coverageCapM2, podiumLineRuleId),
      }
    : {
        dimension: 'podium_footprint',
        ruleId: podiumLineRuleId,
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
  const plateAreaCap = num(plateRes);
  /*
    THE TOWER'S OWN COVERAGE — "Tower: Maximum 60%" on a Trakhees sheet. A share
    of the plot, multiplied here by the plot area every other coverage in this
    run is measured against (the boundary's own figure), and said so in the
    formula. It caps the plate beside `tower_plate.max`; the smaller governs and
    is the one named as binding.
  */
  const towerCoverageRes = resolutions.get('tower_coverage.max');
  const towerCoveragePct = num(towerCoverageRes);
  const towerCoverageCapM2 = towerCoveragePct ? towerCoveragePct.div(100).times(plotAreaM2) : undefined;
  const towerCoverageCap =
    towerCoveragePct && towerCoverageCapM2
      ? tracer.derived('envelope.tower_coverage_cap', towerCoverageCapM2, {
          rule: {
            ruleId: towerCoverageRes!.governing!.rule.ruleId,
            citation: towerCoverageRes!.governing!.rule.citation,
          },
          formula: `tower coverage ${towerCoveragePct.toString()}% × plot area ${plotAreaM2.toFixed(2)} m²`,
          unit: 'm²',
          detail: { metric: metric('TOWER_PLATE').metricId },
        })
      : undefined;
  /** The caps on the plate other than its setback line and the podium, smallest first. */
  const caps = [
    ...(plateAreaCap
      ? [{ valueM2: plateAreaCap, ruleId: plateRes!.governing!.rule.ruleId, citation: plateRes!.governing!.rule.citation, label: 'tower plate cap' }]
      : []),
    ...(towerCoverageCapM2
      ? [{ valueM2: towerCoverageCapM2, ruleId: towerCoverageRes!.governing!.rule.ruleId, citation: towerCoverageRes!.governing!.rule.citation, label: 'tower coverage cap' }]
      : []),
  ].sort((a, b) => a.valueM2.cmp(b.valueM2));
  const tightestCap = caps[0];
  const plateCap = tightestCap?.valueM2;
  const plateM2 = plateCap ? Decimal.min(towerOnPodiumM2, plateCap) : towerOnPodiumM2;
  const towerUses = {
    ...(podiumOnTowerLine ? { podium: podiumFootprint } : { podium: podiumFootprint, towerSetback: setbackPermittedFootprint }),
    ...(towerCoverageCap ? { towerCoverage: towerCoverageCap } : {}),
  };
  const towerTerm = podiumOnTowerLine ? 'podium footprint' : 'tower setback line, podium footprint';
  const capTerms = caps.map((c) => `${c.label} ${c.valueM2.toFixed(2)} m²`).join(', ');
  const towerPlateCap = tightestCap
    ? tracer.derived('envelope.tower_plate_cap', plateM2, {
        rule: { ruleId: tightestCap.ruleId, citation: tightestCap.citation },
        formula:
          caps.length === 1 && !towerCoverageCap
            ? `min(${towerTerm}, tower plate cap ${tightestCap.valueM2.toString()} m²)`
            : `min(${towerTerm}, ${capTerms})`,
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
  /*
    The share of the plot the tower plate covers, published so the validator can
    hold it to the sheet's tower coverage. Computed here, beside the plate, so the
    composition root carries it and computes nothing.
  */
  const towerCoverage = towerCoverageCap
    ? tracer.computed('envelope.tower_coverage_pct', plotAreaM2.isZero() ? new Decimal(0) : plateM2.div(plotAreaM2).times(100), {
        formula: `tower plate ${plateM2.toFixed(2)} m² ÷ plot area ${plotAreaM2.toFixed(2)} m² × 100`,
        uses: { plate: towerPlateCap },
        unit: '%',
      })
    : undefined;

  if (!podiumOnTowerLine && setbackFootprintM2.lt(podiumM2) && !(plateCap && plateCap.lt(setbackFootprintM2))) {
    bindings.push({
      dimension: 'tower_plate',
      ruleId: towerLineRule?.ruleId ?? 'SETBACKS',
      label: 'tower setback line',
      valueM: setbackFootprintM2,
      ...(tightestCap ? nearTie(tightestCap.label, tightestCap.valueM2, setbackFootprintM2, tightestCap.ruleId) : {}),
    });
  }
  if (tightestCap && tightestCap.valueM2.lt(towerOnPodiumM2)) {
    const second = caps[1];
    bindings.push({
      dimension: 'tower_plate',
      ruleId: tightestCap.ruleId,
      label: tightestCap.label,
      valueM: tightestCap.valueM2,
      ...(second && second.valueM2.lt(towerOnPodiumM2)
        ? nearTie(second.label, second.valueM2, tightestCap.valueM2, second.ruleId)
        : nearTie(
            podiumOnTowerLine ? 'podium footprint' : 'tower setback line',
            towerOnPodiumM2,
            tightestCap.valueM2,
            podiumOnTowerLine || setbackFootprintM2.gte(podiumM2) ? podiumBinding.ruleId : (towerLineRule?.ruleId ?? 'SETBACKS'),
          )),
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
  const plateRing = plateM2.lt(towerOnPodiumM2)
    ? scaleToArea(towerBase, plateM2.times(1_000_000).toDecimalPlaces(0).toNumber())
    : towerBase;
  verifiedArea(plateRing, 'tower plate');

  // --- Height ---
  const heightRes = resolutions.get('height.max')!;
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
  /*
    WHEN THE PLAN GOVERNS HOW TALL, THE CEILING IS THE PLAN'S. Mamzar 1341556
    states 18 levels and the generic placeholder says 45 m; the engine built the
    18 under §11.5 step 1 and then INV-14, INV-11 and the hard-constraint check
    all held the run to the 45 m it had just superseded, and refused it. The
    ceiling every check and every drawing reads is therefore the plan's count at
    the governing floor-to-floor, and the generic rule is set aside — declared
    as not checked, with the reason, never quietly dropped.
  */
  const heightCeilingT: Traced<Decimal> =
    planSupersedesMetres && statedLevelsT
      ? tracer.computed('envelope.height_ceiling_m', floorToFloor.times(statedLevelsT.value), {
          formula:
            `stated level count ${statedLevelsT.value} × floor-to-floor ${floorToFloor.toString()} m — ` +
            `the plot's own plan, which governs under §11.5 step 1 over the generic ` +
            `${heightCeiling.toString()} m`,
          uses: { stated: statedLevelsT, f2f: floorToFloorT },
          unit: 'm',
        })
      : heightIsTheCount && statedLevelsT
        ? tracer.derived('envelope.height_ceiling_m', heightCeiling, {
            rule: {
              ruleId: heightRes.governing!.rule.ruleId,
              citation: heightRes.governing!.rule.citation,
            },
            formula:
              `stated floor count ${statedLevelsT.value} × ${heightCeiling.div(statedLevelsT.value).toString()} m ` +
              'per floor (DBC B.4.2.2 ¶6, ground floor counted)',
            uses: { stated: statedLevelsT },
            unit: 'm',
          })
        : /*
            A PLACEHOLDER HEIGHT IS AN ASSUMPTION, NOT A DERIVATION. With no floor
            count stated, the only height on file is the seed's 45 m, which no
            instrument prints (B.4.2.2 ¶1 leaves height to the affection plan or
            DCR). It was shown DERIVED. It is shown for what it is: ASSUMED, amber,
            with the reason and what replaces it — and every value `computed` from
            it (the level count by height) inherits that. NOT YET Band B: `bands.ts`
            traces it with `tracer.derived` citing the height rule, which here is
            the placeholder, so a geometry-bound plot with no floor count still
            shows its governing GFA DERIVED. Left open on purpose: the governing GFA
            is `computed` over all three bands, so making Band B ASSUMED turns it
            amber on every plot with no floor count, whichever band binds — a
            decision to take, not a side effect to slip in.
          */
          !statedLevelsT && citesPlaceholder(heightRes.governing!.rule)
          ? tracer.assumed('envelope.height_ceiling_m', heightCeiling, {
              label: 'height ceiling',
              basis:
                `no floor count is stated for this plot, and DBC B.4.2.2 ¶1 leaves height to the ` +
                `affection plan or DCR. ${heightCeiling.toString()} m is a placeholder ` +
                `(${heightRes.governing!.rule.ruleId}) so a study can run before the sheet is to hand; ` +
                'no instrument prints it. With the sheet’s floor count, the ceiling is that count × 6 m (B.4.2.2 ¶6).',
              unit: 'm',
            })
          : tracer.derived('envelope.height_ceiling_m', heightCeiling, {
              rule: {
                ruleId: heightRes.governing!.rule.ruleId,
                citation: heightRes.governing!.rule.citation,
              },
              formula: 'height ceiling from the governing rule',
              unit: 'm',
            });
  if (planSupersedesMetres && statedLevelsT) {
    const generic = heightRes.governing!.rule;
    tracer.supersededBy({ ruleId: generic.ruleId, citation: generic.citation }, heightCeilingT);
    setAside.push({
      parameterId: 'height.max',
      rule: generic,
      reason:
        `the plot's own affection plan states ${statedLevelsT.value} level(s) above ground, ` +
        `which governs how tall under §11.5 step 1; the generic ${heightCeiling.toString()} m ` +
        'is not applied to this plot.',
    });
  }
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
    ...(towerCoverageCap ? { towerCoverageCap } : {}),
    ...(towerCoverage ? { towerCoveragePct: towerCoverage } : {}),
    heightCeilingM: heightCeilingT,
    floorToFloorM: floorToFloorT,
    maxLevelsByHeight: maxLevels,
    bindingConstraints: bindings,
    appliedSetbacks,
    ...(appliedPodiumSetbacks.length > 0 ? { appliedPodiumSetbacks } : {}),
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
 * `R-DBC-B1-NEIGHBOUR` — applies at every level count; what changes is which
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
  podiumAtBoundary: boolean,
): string {
  const applicable = applicableRuleSetKey(rules, ctx);

  const resolved: string[] = [];
  for (const p of ENVELOPE_PARAMETERS) {
    const v = num(resolveParameter(p, rules, ctx));
    if (v !== undefined) resolved.push(`${p}=${v.toString()}`);
  }
  for (const edge of plot.edges) {
    const at = edgeSetbackAt(plot, edge.seq, rules, ctx, typed);
    const { tower, podium } = insetsOf(at, podiumAtBoundary);
    resolved.push(`${at.parameterId}#${edge.seq}=${tower?.toString() ?? 'none'}/${podium?.toString() ?? 'none'}`);
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
    const { tower, podium } = insetsOf(edgeSetbackAt(plot, edge.seq, rules, ctx, typed), podiumAtBoundary);
    if (tower === undefined || podium === undefined) {
      // Mid-iteration, an unresolved setback (or a face nobody has named yet)
      // means this level assumption is not viable. Returning zero drives the next
      // iteration to the height cap rather than crashing inside the loop; the
      // final pass reports properly.
      return zero;
    }
    const span = ringSpanOf(edge);
    for (let k = 0; k < span.count; k += 1) {
      insets.push({ seq: span.from + k, insetMm: toMm(tower) });
      podiumInsets.push({ seq: span.from + k, insetMm: toMm(podium) });
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
