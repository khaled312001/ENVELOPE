/**
 * The run, shaped into the artifact a person reads — §3.4's nine items.
 *
 * `@envelope/report` cannot import `@envelope/capacity` either (its manifest
 * names `@envelope/core` and `decimal.js` and nothing else), so this is the
 * second half of the bill `checks.ts` starts paying: the mapping from engine
 * objects onto the report's plain view types is written here, at the
 * composition root, where every dependency is already present.
 *
 * The report package does no arithmetic — it says so and it means it. So every
 * figure below arrives as a string the engine produced, and where the report
 * wants something the engine did not emit (a runner-up citation, a rule's
 * disposition), it is *looked up*, never derived.
 *
 * **Built at run time, not at export time.** The report is assembled in the
 * same request that computed the run and persisted with it, so an export
 * re-renders stored bytes rather than recomputing. §13.4 asks for a run to be
 * "retrievable unchanged"; a report rebuilt on demand is retrievable
 * *equivalent*, and the difference is exactly the class of drift the fingerprint
 * exists to detect.
 */

import {
  ANNEX_VERSION,
  type Citation,
  type ClaimStatement,
  Decimal,
  type NodeId,
  type Plot,
  RENDER_HINTS,
  toWire,
  type Traced,
} from '@envelope/core';
import type { RunInput, RunOutput } from '@envelope/capacity';
import {
  applicableRuleCount,
  encodedRuleCount,
  type ConstraintOutcome,
} from '@envelope/validation';
import {
  ResolutionStatus,
  type RuleRecord,
  SEED_RULES_WARNING,
} from '@envelope/rules';
import {
  decimalString,
  InvariantStatus as ReportInvariantStatus,
  RuleDisposition,
  RuleSetApproval,
  type AppliedRuleView,
  type AssumptionEntry,
  type BindingConstraintView,
  type CapacityBandView,
  type DecimalString,
  type DeferredCheckEntry,
  type EnvelopeDimensionView,
  type ExcludedRuleView,
  type InvariantOutcome,
  type PlotEdgeView,
  type Reviewer,
  type RunReport,
  type UserInputRecord,
} from '@envelope/report';

import type { RunChecks } from './checks.js';

/**
 * The engine's assumption-register entry, restated structurally.
 *
 * `@envelope/capacity` exports `AssumptionEntry` and `@envelope/report` exports
 * a different type of the same name. Naming the shape here rather than
 * importing either keeps the two apart at the one place they meet, and makes
 * the compiler point at this line if the engine's shape moves.
 */
interface RegisterEntry {
  readonly nodeId: NodeId;
  readonly parameterId: string;
  readonly label: string;
  readonly value: string;
  readonly unit: string | undefined;
  readonly basis: string;
  readonly provenanceClass: 'DERIVED' | 'ASSUMED' | 'USER_SET' | 'OBSERVED' | 'VARIANCE' | 'TRADEOFF';
  readonly sensitivity: {
    readonly perturbation: string;
    readonly lowGoverningGfaM2: string;
    readonly highGoverningGfaM2: string;
    readonly relativeEffect: string;
  } | null;
}

/**
 * The disclaimer, taken as input by the report package on purpose.
 *
 * §24.4 requires the professional-use disclaimer to be "reviewed by UAE
 * counsel", which is not a decision an engineer makes inside a template — so
 * the report package refuses to author one and this constant is where the
 * placeholder lives until counsel supplies the real text. Marked as a
 * placeholder in its own words so that shipping without replacing it is
 * embarrassing rather than invisible.
 *
 * Distinct from the five-way claim statement, which is *not* a disclaimer: that
 * is structural, its wording is fixed by §16.5, and no lawyer edits it.
 */
export const DISCLAIMER_PLACEHOLDER =
  'PLACEHOLDER — NOT REVIEWED BY COUNSEL. This output is a development-capacity ' +
  'study produced by software. It is not a planning submission, not a compliance ' +
  'determination, and not a substitute for a licensed professional. §24.4 requires ' +
  'this text to be settled by UAE counsel before any external use; it has not been.';

/** Every annex term any figure in this run is measured under. `FR-DEF-001 AC5`. */
const AREA_TERMS = [
  'SETBACK_PERMITTED_FOOTPRINT',
  'PODIUM_FOOTPRINT',
  'TOWER_PLATE',
  'PLOT_COVERAGE',
  'GFA',
  'FAR',
  'PARKING_AREA',
  'BAY_AREA_FACTOR',
] as const;

const dec = (value: Decimal | string | number, at: string): DecimalString =>
  decimalString(new Decimal(value).toString(), at);

const wire = <T>(t: Traced<T>) => toWire(t);

/** The citation of the rule that governs a parameter, or `null` if none does. */
function citationOf(rules: readonly RuleRecord[], ruleId: string | undefined): Citation | null {
  if (ruleId === undefined) return null;
  return rules.find((r) => r.ruleId === ruleId)?.citation ?? null;
}

function bindingView(
  output: RunOutput,
  rules: readonly RuleRecord[],
  dimension: string,
  unit: string,
  at: string,
): BindingConstraintView {
  const binding = output.envelope.bindingConstraints.find((b) => b.dimension === dimension);
  if (!binding) {
    // Not a soft fallback: a dimension with no named binding constraint means
    // the report would print a number and be unable to say what limited it,
    // which is the one thing §15.2 says is worth more than the number.
    throw new Error(
      `no binding constraint was recorded for ${dimension}. The report cannot state ` +
        `which limit governs it, and §15.2 makes that the point of the report.`,
    );
  }
  return {
    ruleId: binding.ruleId,
    label: binding.label,
    value: dec(binding.valueM, at),
    unit,
    citation: citationOf(rules, binding.ruleId),
    runnerUp: binding.runnerUp
      ? {
          ruleId: binding.runnerUp.ruleId,
          label: binding.runnerUp.label,
          value: dec(binding.runnerUp.valueM, `${at}.runnerUp`),
          withinOnePercent: binding.runnerUp.withinOnePercent,
        }
      : null,
  };
}

/**
 * Map an invariant result onto the report's own status vocabulary.
 *
 * The two vocabularies differ, and the difference is load-bearing. The
 * invariants package says `DORMANT` — "the check ran and had nothing to check".
 * The report says `NOT_ASSESSED`, which §20.3 renders grey-hatched. Neither is
 * `PASS` and neither may be omitted: "an invariant silently absent from the
 * table reads as an invariant that passed."
 */
function invariantView(
  results: RunChecks['invariants']['results'],
): readonly InvariantOutcome[] {
  return results.map((r) => ({
    invariantId: r.id,
    statement: r.statement,
    tolerance: r.tolerance,
    status:
      r.status === 'PASS'
        ? ReportInvariantStatus.PASS
        : r.status === 'FAIL'
          ? ReportInvariantStatus.FAIL
          : ReportInvariantStatus.NOT_ASSESSED,
    // The report's `observed`/`expected` are decimal magnitudes; several checks
    // report a sentence instead ("≤ min(1917.5, 1280)", "8 of 8 defined"). Those
    // are folded into `detail`, which is prose, rather than forced into a
    // numeric field or dropped — dropping one would leave the report stating a
    // verdict with nothing measured beside it.
    observed: numericOrNull(r.observed, `$.invariants.${r.id}.observed`),
    expected: numericOrNull(r.expected, `$.invariants.${r.id}.expected`),
    detail:
      r.observed !== undefined && numericOrNull(r.observed, 'x') === null
        ? `observed ${r.observed}, expected ${r.expected ?? 'n/a'}. ${r.detail}`
        : r.detail,
  }));
}

function numericOrNull(text: string | null | undefined, at: string): DecimalString | null {
  if (text === null || text === undefined) return null;
  try {
    return decimalString(text, at);
  } catch {
    return null;
  }
}

export interface BuildReportInput {
  readonly runId: string;
  readonly plot: Plot;
  readonly input: RunInput;
  readonly output: RunOutput;
  readonly checks: RunChecks;
  readonly register: readonly RegisterEntry[];
  readonly rules: readonly RuleRecord[];
  readonly ruleSetHash: string;
  readonly engineVersion: string;
  readonly draftRules: boolean;
  readonly producedAt: string;
  readonly structuredInputs: Record<string, unknown>;
  readonly reviewer: Reviewer | null;
}

export function buildRunReport(args: BuildReportInput): RunReport {
  const { output, plot, input, checks, rules } = args;
  const { envelope, parking, capacity } = output;
  const plotAreaM2 = new Decimal(plot.computedAreaMm2).div(1_000_000);

  // --- §3.4 item 1 — the envelope, binding constraint named per dimension ---
  const dimensions: readonly EnvelopeDimensionView[] = [
    {
      dimension: 'setback_permitted_footprint',
      label: 'Setback-permitted footprint',
      metricId: 'SETBACK_PERMITTED_FOOTPRINT',
      value: wire(envelope.setbackPermittedFootprint),
      binding: bindingView(output, rules, 'podium_footprint', 'm²', '$.envelope.setback'),
    },
    {
      dimension: 'podium_footprint',
      label: 'Podium footprint',
      metricId: 'PODIUM_FOOTPRINT',
      value: wire(envelope.podiumFootprint),
      binding: bindingView(output, rules, 'podium_footprint', 'm²', '$.envelope.podium'),
    },
    {
      dimension: 'tower_plate',
      label: 'Tower plate',
      metricId: 'TOWER_PLATE',
      value: wire(envelope.towerPlateCap),
      binding: bindingView(
        output,
        rules,
        // The tower-plate binding is recorded only when a plate cap actually
        // bites; when it does not, the podium is what limits the plate and the
        // podium's own binding is the honest answer.
        output.envelope.bindingConstraints.some((b) => b.dimension === 'tower_plate')
          ? 'tower_plate'
          : 'podium_footprint',
        'm²',
        '$.envelope.plate',
      ),
    },
    {
      dimension: 'height',
      label: 'Height ceiling',
      metricId: null,
      value: wire(envelope.heightCeilingM),
      binding: bindingView(output, rules, 'levels', 'm', '$.envelope.height'),
    },
    {
      dimension: 'levels',
      label: 'Levels the height ceiling permits',
      metricId: null,
      value: wire(envelope.maxLevelsByHeight),
      binding: bindingView(output, rules, 'levels', 'm', '$.envelope.levels'),
    },
  ];

  const edges: readonly PlotEdgeView[] = plot.edges.map((edge): PlotEdgeView => {
    const applied = envelope.appliedSetbacks.find((s) => s.seq === edge.seq);
    if (!applied) {
      throw new Error(
        `edge ${edge.seq} has no applied setback. The envelope cannot have been solved ` +
          `without one — FR-PLT-001 AC3 forbids a default — so this is a defect, not a gap.`,
      );
    }
    return {
      seq: edge.seq,
      classification: edge.classification,
      roadHierarchy: edge.roadHierarchy ?? null,
      lengthM: dec(new Decimal(edge.lengthMm).div(1000), `$.edges.${edge.seq}.length`),
      appliedSetbackM: dec(applied.valueM, `$.edges.${edge.seq}.setback`),
      setbackRuleId: applied.ruleId,
    };
  });

  // --- §3.4 item 2 — three bands, each with its derivation ------------------
  const bandOf = (
    band: 'REGULATORY' | 'GEOMETRIC' | 'PARKING',
    label: string,
    question: string,
    value: Traced<Decimal>,
    derivation: string,
    inputs: readonly { name: string; value: Traced<unknown> }[],
  ): CapacityBandView => ({
    band,
    label,
    question,
    gfa: wire(value),
    metricId: 'GFA',
    derivation,
    inputs: inputs.map((i) => ({ name: i.name, value: wire(i.value) })),
    governing: capacity.governingBand === band,
  });

  const bands: readonly CapacityBandView[] = [
    bandOf(
      'REGULATORY',
      'Band A — regulatory',
      'What do FAR and the area caps permit?',
      capacity.regulationLimitedGfa,
      `FAR ${capacity.permittedFar.value.toString()} × plot area ${plotAreaM2.toFixed(2)} m²` +
        (input.parkingInFar === 'COUNTS_TOWARD_FAR'
          ? ` − parking ${parking.requiredAreaM2.value.toFixed(2)} m² (parking counts toward FAR)`
          : ' (parking excluded from FAR)'),
      [{ name: 'permitted FAR', value: capacity.permittedFar }],
    ),
    bandOf(
      'GEOMETRIC',
      'Band B — geometric',
      'What does the envelope physically hold within height and footprint limits?',
      capacity.geometryLimitedGfa,
      `tower plate ${envelope.towerPlateCap.value.toFixed(2)} m² × ` +
        `${envelope.maxLevelsByHeight.value} level(s)`,
      [
        { name: 'tower plate', value: envelope.towerPlateCap },
        { name: 'levels by height', value: envelope.maxLevelsByHeight },
      ],
    ),
    bandOf(
      'PARKING',
      'Band C — parking',
      'What can the achievable parking supply support?',
      capacity.parkingLimitedGfa,
      `${parking.supportableUnitCeiling.value} unit(s) supportable by parking × ` +
        `weighted mean unit GFA`,
      [
        { name: 'bays the levels supply', value: parking.providedBays },
        { name: 'units parking supports', value: parking.supportableUnitCeiling },
      ],
    ),
  ];

  // --- §3.4 item 4 — what applied, and what was considered and excluded -----
  const applied: readonly AppliedRuleView[] = [...output.constraintSet.resolutions]
    .filter(([, r]) => r.status === ResolutionStatus.RESOLVED && r.governing !== undefined)
    .map(([parameterId, r]): AppliedRuleView => {
      const rule = r.governing!.rule;
      const value = r.governing!.value;
      return {
        ruleId: rule.ruleId,
        parameterId,
        label: rule.note ?? parameterId,
        ruleClass: rule.ruleClass,
        value: value.kind === 'scalar' ? value.value.toString() : JSON.stringify(value),
        unit: rule.unit ?? null,
        citation: rule.citation,
      };
    });

  const appliedRuleIds = new Set(applied.map((a) => a.ruleId));

  /**
   * Everything the rule base held and did not apply, with a reason in prose.
   *
   * §11.5 step 3 requires every non-governing candidate to stay visible. The
   * disposition is read from the resolution the generator actually produced —
   * a rule listed as `NOT_APPLICABLE` here is one whose predicate genuinely did
   * not match this plot, not one this function guessed about.
   */
  const superseded = new Map<string, string>();
  for (const [, r] of output.constraintSet.resolutions) {
    for (const loser of r.superseded) {
      if (r.governing) superseded.set(loser.rule.ruleId, r.governing.rule.ruleId);
    }
  }

  const excluded: readonly ExcludedRuleView[] = rules
    .filter((r) => !appliedRuleIds.has(r.ruleId))
    .map((rule): ExcludedRuleView => {
      const supersededBy = superseded.get(rule.ruleId);
      const deferred = output.constraintSet.deferred.some((d) => d.ruleId === rule.ruleId);
      const disposition = supersededBy
        ? RuleDisposition.SUPERSEDED
        : deferred
          ? RuleDisposition.DEFERRED
          : rule.ruleClass === 'EVALUATIVE_ONLY'
            ? RuleDisposition.DEFERRED
            : RuleDisposition.NOT_APPLICABLE;
      return {
        ruleId: rule.ruleId,
        parameterId: rule.parameterId,
        label: rule.note ?? rule.parameterId,
        disposition,
        reason: reasonFor(disposition, rule, supersededBy),
        supersededByRuleId: supersededBy ?? null,
        citation: rule.citation,
      };
    });

  // --- §3.4 item 5 — the assumption register, sensitivity-ranked ------------
  const assumptions: readonly AssumptionEntry[] = args.register.map(
    (entry, index): AssumptionEntry => {
      const s = entry.sensitivity;
      return {
        rank: index + 1,
        parameterId: entry.parameterId,
        label: entry.label,
        // Reassembled from the register rather than re-fetched from the graph.
        // `renderHint` comes from `RENDER_HINTS`, the same table `toWire` reads,
        // because `assertEmittable` re-derives it and throws if the two ever
        // disagree — the amber treatment §13.1 calls "the most important UI
        // decision in the product" is not something a serialiser gets to choose.
        value: {
          value: entry.value,
          node: entry.nodeId,
          parameterId: entry.parameterId,
          provenanceClass: entry.provenanceClass,
          renderHint: RENDER_HINTS[entry.provenanceClass],
          ...(entry.unit !== undefined ? { unit: entry.unit } : {}),
        },
        basis: entry.basis,
        perturbation: s?.perturbation ?? 'not measured',
        // An unmeasured sensitivity is reported as zero effect *and said so* in
        // the impact statement. Omitting the entry would drop an assumption
        // from the register; inventing a magnitude would rank it on a number
        // nobody computed.
        relativeEffect: dec(s?.relativeEffect ?? '0', `$.assumptions.${index}.relativeEffect`),
        impactStatement: s
          ? `${s.perturbation} moves the governing capacity between ` +
            `${s.lowGoverningGfaM2} m² and ${s.highGoverningGfaM2} m² — a spread of ` +
            `${new Decimal(s.relativeEffect).times(100).toFixed(1)}% of the reported figure.`
          : 'Sensitivity was not measured for this assumption, so its effect on the ' +
            'governing capacity is unquantified. It is listed unranked rather than ' +
            'omitted: an assumption nobody measured is not an assumption that does not matter.',
      };
    },
  );

  // --- §3.4 item 8 — the deferred-check list --------------------------------
  const deferredChecks: readonly DeferredCheckEntry[] = checks.validation.outcomes
    .filter((o): o is Extract<ConstraintOutcome, { category: 'DEFERRED' }> =>
      o.category === 'DEFERRED',
    )
    .map((o) => ({
      ruleId: o.ruleId,
      parameterId: o.parameterId,
      label: o.isLifeSafety ? `${o.parameterId} [LIFE SAFETY]` : o.parameterId,
      reason: o.reason,
      citation: o.citation,
    }));

  const userInputs: readonly UserInputRecord[] = [
    {
      parameterId: 'parking.levels_available',
      label: 'Parking levels available',
      value: String(input.parkingLevelsAvailable),
      unit: 'levels',
      enteredBy: input.actor,
      enteredAt: args.producedAt,
    },
    {
      parameterId: 'capacity.user_realism_discount',
      label: 'Realism discount',
      value: input.realismDiscount.toString(),
      unit: 'ratio',
      enteredBy: input.actor,
      enteredAt: args.producedAt,
    },
    {
      parameterId: 'definitions.parking_in_far',
      label: 'Parking-in-FAR treatment',
      value: input.parkingInFar,
      unit: null,
      enteredBy: input.actor,
      enteredAt: args.producedAt,
    },
  ];

  const claim: ClaimStatement = checks.validation.claims;

  return {
    runId: args.runId,
    tenantId: input.actor.id,
    producedAt: args.producedAt,
    engineVersion: args.engineVersion,
    metricDefinitionsVersion: ANNEX_VERSION,
    ruleSet: args.draftRules
      ? {
          approval: RuleSetApproval.DRAFT,
          ruleSetVersion: '0.1.0-seed',
          contentHash: args.ruleSetHash,
          warning: SEED_RULES_WARNING,
        }
      : {
          approval: RuleSetApproval.APPROVED,
          ruleSetVersion: '0.1.0',
          contentHash: args.ruleSetHash,
        },
    reviewer: args.reviewer,
    disclaimer: DISCLAIMER_PLACEHOLDER,

    plot: {
      plotId: plot.plotId,
      plotNumber: plot.plotNumber,
      community: plot.community,
      landUse: plot.landUse,
      shapeClass: plot.shapeClass,
      statedAreaM2:
        plot.statedAreaM2 === undefined
          ? null
          : dec(plot.statedAreaM2, '$.plot.statedArea'),
      computedAreaM2: dec(plotAreaM2, '$.plot.computedArea'),
      areaMismatch: plot.areaMismatch,
    },

    /**
     * `FR-DEF-002`: the declaration itself, not merely its value.
     *
     * The traced node carried here is the Band A figure, because that is where
     * the treatment was applied and where clicking through leads to the
     * subtraction (or its absence). `citation` is null and `declaredBy` names a
     * person: at Phase 0 the treatment is always `USER_SET`, never `DERIVED`,
     * because no rule in the seed set settles it — which is open question Q2.
     */
    parkingInFar: {
      treatment: input.parkingInFar,
      value: wire(capacity.regulationLimitedGfa),
      citation: null,
      declaredBy: input.actor.name,
    },

    envelope: {
      dimensions,
      edges,
      fixpointIterations: envelope.fixpointIterations,
      fixpointConverged: envelope.fixpointConverged,
    },

    capacity: {
      bands,
      governingBand: capacity.governingBand,
      governingGfa: wire(capacity.governingGfa),
      governingConstraint: {
        ruleId: capacity.governingConstraint.ruleId,
        label: capacity.governingConstraint.label,
        value: dec(capacity.governingConstraint.valueM, '$.capacity.governing'),
        unit: 'm²',
        citation: citationOf(rules, capacity.governingConstraint.ruleId),
        runnerUp: null,
      },
      nextBindingBand: capacity.nextBindingBand,
      headroomToNextM2: dec(capacity.headroomToNextM2, '$.capacity.headroom'),
      integerGranularityLossM2: dec(
        capacity.integerGranularityLossM2,
        '$.capacity.granularityLoss',
      ),
      userRealismDiscount: wire(capacity.userRealismDiscount),
      levels: wire(capacity.levels),
    },

    parking: {
      residentBays: wire(parking.residentBays),
      visitorBays: wire(parking.visitorBays),
      totalBays: wire(parking.totalBays),
      bayAreaFactorM2: wire(parking.bayAreaFactorM2),
      requiredAreaM2: wire(parking.requiredAreaM2),
      availableAreaPerLevelM2: wire(parking.availableAreaPerLevelM2),
      levelsRequired: wire(parking.levelsRequired),
      levelsAvailable: wire(parking.levelsAvailable),
      headroomBays: dec(parking.headroomBays, '$.parking.headroom'),
      supportableUnitCeiling: wire(parking.supportableUnitCeiling),
      podiumImplication: parking.podiumImplication,
      ratioCitations: rules
        .filter((r) => r.parameterId.startsWith('parking.'))
        .map((r) => r.citation),
      metricIds: ['PARKING_AREA', 'BAY_AREA_FACTOR'],
    },

    rules: {
      applied,
      excluded,
      encodedCount: encodedRuleCount(output.constraintSet),
      identifiedApplicableCount: applicableRuleCount(output.constraintSet),
      deferredCount: deferredChecks.length,
    },

    assumptions,
    invariants: invariantView(checks.invariants.results),
    claim,
    deferredChecks,
    provenance: output.graph.toJSON() as RunReport['provenance'],
    structuredInputs: args.structuredInputs as RunReport['structuredInputs'],
    userInputs,
    areaTermsUsed: [...AREA_TERMS],
  };
}

function reasonFor(
  disposition: RuleDisposition,
  rule: RuleRecord,
  supersededBy: string | undefined,
): string {
  switch (disposition) {
    case RuleDisposition.SUPERSEDED:
      return (
        `Considered for ${rule.parameterId} and superseded by ${supersededBy} under the ` +
        `§11.5 precedence order. It is listed because a rule that lost is a rule someone ` +
        `may want to argue about, and a report that hides the losers cannot be audited.`
      );
    case RuleDisposition.DEFERRED:
      return (
        `Applicable and not assessed. ${
          rule.ruleClass === 'EVALUATIVE_ONLY'
            ? 'This rule can only reject a candidate, and Phase 0 generates no candidate ' +
              'to reject (§3.2, §11.3) — there is no constructive inverse.'
            : 'Not mechanizable at this fidelity.'
        } Declared here rather than omitted, because what was not checked has to be ` +
        `visible rather than absent (§3.4 item 8).`
      );
    case RuleDisposition.NOT_APPLICABLE:
      return (
        `Its applicability predicate did not match this plot — a different land use, ` +
        `community, or edge classification. Listed so that "this rule did not apply" is a ` +
        `published fact rather than a silence.`
      );
    default:
      return 'Not applied.';
  }
}
