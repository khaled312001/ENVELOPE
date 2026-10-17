/**
 * Where the run meets the two layers that are not allowed to know it exists.
 *
 * `@envelope/invariants` and `@envelope/validation` cannot import
 * `@envelope/capacity` — the dependency is absent from their manifests, so such
 * an import fails to resolve rather than failing a lint rule (Principle 4,
 * §12.3, §16.3). That independence has to be paid for somewhere, and this file
 * is the bill: the translation from what the engine produced into the plain
 * data those two layers accept is written here, in the composition root, by
 * hand.
 *
 * Two rules govern everything below, and both are easy to break by being
 * helpful:
 *
 * 1. **Nothing here computes a number a user will see.** Every value handed to
 *    a check is lifted off a `Traced` the engine already emitted. When a check
 *    needed an operand the engine was discarding — achieved FAR, provided bays
 *    — the fix was to emit it from the engine with a derivation, not to
 *    calculate it here. A handler that did arithmetic would be a number without
 *    provenance.
 *
 * 2. **Nothing is supplied that the engine did not produce.** A check with no
 *    data returns DORMANT, and DORMANT is a smaller lie than a PASS earned by
 *    feeding the checker something invented to satisfy it. That temptation is
 *    concrete, and it is declined explicitly — see {@link LEVEL_SCHEDULE_NOTE}.
 */

import { Decimal, LevelUse, type Plot, type Traced, UnitType } from '@envelope/core';
import type { RunInput, RunOutput } from '@envelope/capacity';
import type { GeometryCheckCounters } from '@envelope/geometry';
import {
  formatInvariantReport,
  InvariantStatus,
  LevelKind,
  runInvariants,
  type InvariantReport,
  type InvariantSubject,
} from '@envelope/invariants';
import {
  ObservationKind,
  validateConfiguration,
  type EmittedConfiguration,
  type Observation,
  type ValidationReport,
} from '@envelope/validation';

/**
 * Which level checks run, and why one still does not.
 *
 * INV-01, INV-02, INV-11 and INV-18 read a per-level schedule. For as long as the
 * engine produced none, all four were DORMANT, and this note said why a schedule
 * was not synthesised here from the level count and the tower plate: INV-01
 * would then PASS against a total derived from the very numbers it is meant to
 * be checking — the vacuous truth §12.2's DORMANT status exists to keep out of
 * the pass column, wearing a tick. That argument still holds, and nothing below
 * synthesises anything.
 *
 * Its premise stopped holding. The engine now stacks the building
 * (`BuildingModel.levels`: every level at its elevation, parking or not, placed
 * or not) and emits what each level counts (`RunOutput.levelAreas`), on a code
 * path separate from the one that computes the capacity. The two disagreed — the
 * 3B+G+5P scheme reported 17,920 m² on levels that held 11,520 — and the check
 * that would have said so was switched off by this note. So INV-01, INV-11 and
 * INV-18 now read the engine's own schedule, mapped below with no arithmetic.
 *
 * INV-02 stays DORMANT: it reads each level's composition (units, core,
 * circulation, services), and the engine lays out no unit, so no level has one.
 */
export const LEVEL_SCHEDULE_NOTE =
  'INV-02 reads what fills each level: units, core, circulation and services. The engine ' +
  'lays out no unit, so no level has that composition and INV-02 is DORMANT — it did not ' +
  'run, and it is not counted as a pass. INV-01, INV-11 and INV-18 read the level schedule ' +
  'the engine emits with the building it draws.';

const str = (t: Traced<Decimal>): string => t.value.toString();

/**
 * The model's level use, in the invariant layer's vocabulary. A lookup, not a
 * judgement: every parking level is PARKING to INV-18 whether it is below grade
 * or in the podium, because the declaration is about parking, not about where.
 */
const LEVEL_KIND: Readonly<Record<LevelUse, LevelKind>> = {
  [LevelUse.BASEMENT_PARKING]: LevelKind.PARKING,
  [LevelUse.PODIUM_PARKING]: LevelKind.PARKING,
  [LevelUse.PODIUM]: LevelKind.PODIUM,
  [LevelUse.TYPICAL]: LevelKind.TYPICAL,
};

/**
 * The area terms this run computed, for INV-15's independent re-check.
 *
 * Listed literally rather than harvested from the provenance graph. A list
 * gathered from the graph would name whatever the engine happened to tag, so
 * the check would be asking "did the engine's own labels resolve against the
 * annex" — a question the engine passes by mislabelling. Naming them here means
 * a metric that disappears from the annex fails this check even if the engine
 * has quietly stopped tagging it.
 */
const AREA_TERMS_USED = [
  'SETBACK_PERMITTED_FOOTPRINT',
  'PODIUM_FOOTPRINT',
  'TOWER_PLATE',
  'PLOT_COVERAGE',
  'GFA',
  'FAR',
  'PARKING_AREA',
  'BAY_AREA_FACTOR',
] as const;

export function buildInvariantSubject(
  runId: string,
  plot: Plot,
  input: RunInput,
  output: RunOutput,
): InvariantSubject {
  const { envelope, parking, capacity } = output;
  /*
    THE AREA THE FAR WAS STATED FOR, AS THE ENGINE PUBLISHED IT. Where the plot's
    own sheet prints its area, band A and the FAR reached are both measured on
    that figure; recomputing INV-03 on the traced outline would hold the run to a
    ratio of a different plot. Lifted, not computed: `FarBasis.baseAreaM2`, which
    is the traced area wherever no instrument prints one.
  */
  const plotAreaM2 = envelope.farBasis.baseAreaM2;

  return {
    label: `run ${runId}`,

    /**
     * The GFA this run reports, so INV-03 can recompute the FAR from first
     * principles and INV-01 can sum the levels against it.
     *
     * Both operands come from here and the division is done there, in a package
     * that cannot see `bands.ts`. That is not circular: it catches the wiring
     * defect where the achieved FAR is computed against the wrong band — a
     * mistake that produces a plausible number and no other symptom.
     *
     * The GFA statement's proposed total: the governing capacity, and the
     * parking area where the declaration counts parking toward FAR — the figure
     * the area table prints and the parking levels below carry.
     */
    totalGfaM2: str(output.gfaStatement.proposedGfaM2),

    /**
     * The engine's level schedule, level for level. Lifted, not computed: what a
     * level counts, whether it is inside GFA and whether it stands in the
     * building's height are all decided in `level-areas.ts`, off the model the
     * drawings are made from.
     */
    levels: output.levelAreas.map((l) => ({
      label: l.levelId,
      kind: LEVEL_KIND[l.use],
      grossAreaM2: l.gfaM2 ? str(l.gfaM2) : '0',
      countedInGfa: l.countedInGfa,
      aboveGround: l.standsInHeight,
      heightM: str(l.heightM),
    })),

    /** INV-11: the height the run reports, against the ceiling it was held to. */
    height: {
      reportedTotalHeightM: str(capacity.achievedHeightM),
      heightCeilingM: str(envelope.heightCeilingM),
    },

    far: {
      plotAreaM2: plotAreaM2.toString(),
      reportedFar: str(capacity.achievedFar),
      permittedFar: str(capacity.permittedFar),
    },

    envelope: {
      /*
        INV-08 holds the PODIUM to the line the podium is held to. Since the podium
        statement (16 Oct 2026) that is its own line — the plot, where the sheet is
        silent — and the tower's line goes to INV-10's setback arm instead. Holding
        a boundary podium to the tower's line would fail every such run on a rule
        the engine no longer applies to the podium.
      */
      setbackPermittedFootprintM2: str(envelope.podiumSetbackFootprint ?? envelope.setbackPermittedFootprint),
      ...(envelope.podiumSetbackFootprint
        ? { towerSetbackFootprintM2: str(envelope.setbackPermittedFootprint) }
        : {}),
      coverageCapM2: str(envelope.coverageCap),
      podiumFootprintM2: str(envelope.podiumFootprint),
      towerPlateM2: str(envelope.towerPlateCap),
      /**
       * The plate and its cap are the same number here, and that is not a
       * discrepancy being papered over: at Phase 0 the tower plate *is* the cap,
       * because nothing has drawn a plate yet. INV-10's cap arm therefore holds
       * trivially while its podium arm is a real comparison. Supplying the cap
       * anyway keeps the conjunction whole — omitting it makes INV-10 dormant
       * and hides the podium arm, which does carry information.
       */
      towerPlateCapM2: str(envelope.towerPlateCap),
    },

    levelBudget: {
      reportedLevelCount: capacity.levels.value,
      levelHeightBudgetM: str(envelope.floorToFloorM),
      heightAvailableM: str(envelope.heightCeilingM),
    },

    parking: {
      /**
       * Supply against the demand of the answer that was actually emitted.
       *
       * `providedBays` is what the declared levels hold. `requiredBays` is
       * `demandAtGoverningBays`, **not** `parking.totalBays`.
       *
       * That distinction is the difference between INV-13 checking the product
       * and INV-13 failing whenever the product is right. `totalBays` is demand
       * at the probe target — the FAR-and-geometry unit count used to *find*
       * the parking ceiling. On a parking-governed plot the answer settles well
       * below it, so comparing the answer's supply against the probe's demand
       * reports a shortfall on a run that has no shortfall. Against the emitted
       * capacity the check is tight but not vacuous: it is `floor()` in
       * `supportableUnitCeiling` that creates the slack, and a `round()` or
       * `ceil()` there — a real defect, an over-claimed unit count — makes this
       * check fail.
       */
      providedBays: parking.providedBays.value,
      requiredBays: output.demandAtGoverningBays.value,
      bayAreaFactorM2: str(parking.bayAreaFactorM2),
      availableParkingAreaM2: str(parking.availableAreaM2),
    },

    capacity: {
      regulationLimitedGfaM2: str(capacity.regulationLimitedGfa),
      geometryLimitedGfaM2: str(capacity.geometryLimitedGfa),
      parkingLimitedGfaM2: str(capacity.parkingLimitedGfa),
      governingGfaM2: str(capacity.governingGfa),
      governingBand: capacity.governingBand,
      // The engine counts whole levels of this plate and, above them, a part
      // floor no smaller than the stated minimum; INV-16 recomputes both from
      // the three bands rather than reading the engine's level count. Lifted,
      // not computed: the minimum is the engine's own traced figure.
      wholeLevelPlateM2: str(output.envelope.towerPlateCap),
      ...(output.partFloor?.minimum ? { partFloorMinimumM2: str(output.partFloor.minimum) } : {}),
      ...(output.partFloor?.kind === 'DROPPED' && output.partFloor.minimum === null
        ? { partFloorNotPlaced: true }
        : {}),
    },

    composition: {
      parkingInFar: input.parkingInFar,
      parkingAreaM2: str(parking.requiredAreaM2),
    },

    areaTermsUsed: [...AREA_TERMS_USED],

    // `units` is deliberately absent: INV-04 to INV-07 read a unit schedule with
    // NSA and scoped efficiencies the engine does not lay out. See LEVEL_SCHEDULE_NOTE
    // for the levels.
  };
}

/**
 * What the run published, keyed by the parameter a rule governs.
 *
 * The keys are the rule vocabulary, not the engine's field names, because that
 * is what the validator joins on. A value published under a name no rule speaks
 * to is simply not checked — and it then shows up as a hard constraint with
 * `NO_OBSERVATION` rather than as a silent gap, which is the point.
 *
 * Per-edge setbacks are the interesting case. Four edges resolve against two
 * parameters, and the validator holds one observation per parameter. The
 * **least** setback applied on each parameter is published, because a setback
 * rule is a `MIN` bound: if the smallest value the run applied clears the bound,
 * every larger one does. Publishing the largest, or an average, would let a
 * violating edge hide behind a compliant sibling.
 */
export function observationsFrom(output: RunOutput): Record<string, Observation> {
  const { envelope, parking, capacity } = output;
  const obs: Record<string, Observation> = {};

  const quantity = (value: Traced<Decimal>, unit: string, metricId?: string): Observation => ({
    kind: ObservationKind.QUANTITY,
    value,
    unit,
    ...(metricId !== undefined ? { metricId } : {}),
  });

  const worstByParameter = new Map<string, (typeof envelope.appliedSetbacks)[number]>();
  for (const applied of envelope.appliedSetbacks) {
    // A tower setback typed on the plot step is held to no rule: it replaced the
    // general rule on that edge, USER_SET. The rule is observed on the edges it
    // still governs; where it governs none, the engine set it aside by name.
    if (applied.ruleId === 'USER_SET') continue;
    const held = worstByParameter.get(applied.parameterId);
    if (!held || applied.valueM.lt(held.valueM)) {
      worstByParameter.set(applied.parameterId, applied);
    }
  }
  for (const [parameterId, applied] of worstByParameter) {
    obs[parameterId] = quantity(applied.traced, 'm');
  }
  /*
    THE PODIUM'S OWN ROW, OBSERVED (17 Oct 2026). The sheet's podium row binds
    `setback.podium.<class>`, and with nothing published under that key the
    validator could only ever say it had no observation. The engine publishes the
    podium setback on each edge a sheet rule set — never on an edge the statement
    put on the boundary or one where the sheet left a choice the run ASSUMED, which
    no rule governed — and the least per parameter is held, as for the tower.
  */
  const worstPodium = new Map<string, NonNullable<typeof envelope.appliedPodiumSetbacks>[number]>();
  for (const applied of envelope.appliedPodiumSetbacks ?? []) {
    if (applied.traced.provenanceClass === 'ASSUMED') continue;
    const held = worstPodium.get(applied.parameterId);
    if (!held || applied.valueM.lt(held.valueM)) worstPodium.set(applied.parameterId, applied);
  }
  for (const [parameterId, applied] of worstPodium) {
    obs[parameterId] = quantity(applied.traced, 'm');
  }

  obs['far.max'] = quantity(capacity.achievedFar, UnitType.RATIO);
  // A bare '%' rather than a UnitType member: the coverage rule states a
  // percentage and UnitType has no percentage. The validator compares unit
  // strings literally and refuses to convert — "converting one silently is how
  // a factor of 1,000 reaches a report" — so every string here has to match the
  // rule base's vocabulary exactly, not a near neighbour. The first run through
  // used "percent" and "m2" against the rules' "%" and "m²" and the validator
  // refused both. That is the check working, and it is why the strings below
  // come from UnitType wherever one exists.
  obs['coverage.max'] = quantity(capacity.achievedCoveragePct, '%');
  obs['tower_plate.max'] = quantity(envelope.towerPlateCap, UnitType.AREA_M2, 'TOWER_PLATE');
  // The tower's own coverage — an affection plan's "Tower: Maximum 60%". The
  // engine emits the share the plate covers beside the cap; nothing is divided here.
  if (envelope.towerCoveragePct) obs['tower_coverage.max'] = quantity(envelope.towerCoveragePct, '%');
  obs['height.max'] = quantity(capacity.achievedHeightM, UnitType.LENGTH_M);
  // The storeys the building stands above grade, against the plan's own G+N
  // (`levels.max_above_ground`, unit "levels"). Without it the one limit an
  // affection plan always prints reached the validator as NO_OBSERVATION.
  obs['levels.max_above_ground'] = quantity(output.levelsAboveGround, 'levels');
  obs['floor_to_floor'] = quantity(envelope.floorToFloorM, UnitType.LENGTH_M);

  // Parking demand and the visitor ratio are `MIN` bounds on a bay count: the
  // scheme must provide at least what the rule requires. The observation is
  // therefore the *provided* count, which is the only number that can violate.
  obs['parking.demand'] = {
    kind: ObservationKind.COUNT,
    value: parking.providedBays,
    unit: 'bays',
  };
  obs['parking.visitor_fraction'] = quantity(parking.achievedVisitorFraction, UnitType.RATIO);

  return obs;
}

export interface RunChecks {
  readonly invariants: InvariantReport;
  readonly validation: ValidationReport;
}

export interface RunChecksInput {
  readonly runId: string;
  readonly plot: Plot;
  readonly input: RunInput;
  readonly output: RunOutput;
  readonly engineVersion: string;
  readonly ruleSetHash: string;
  readonly geometry: GeometryCheckCounters;
  readonly validatedAt: string;
}

export function runChecks(args: RunChecksInput): RunChecks {
  const invariants = runInvariants(
    buildInvariantSubject(args.runId, args.plot, args.input, args.output),
  );
  const failed = invariants.results.filter((r) => r.status === InvariantStatus.FAIL);

  const configuration: EmittedConfiguration = {
    runId: args.runId,
    engineVersion: args.engineVersion,
    ruleSetHash: args.ruleSetHash,
    observations: observationsFrom(args.output),
  };

  const validation = validateConfiguration({
    configuration,
    constraintSet: args.output.constraintSet,
    invariants: {
      /**
       * Checks that **ran**, not checks that exist.
       *
       * `results.length` is always 18 and putting that here would make the
       * self-consistency claim read "18 invariants run, 0 failed" on a run
       * where nine had nothing to check. That sentence is the §24.1 checkbox
       * this codebase refuses to tick, printed inside the claim statement that
       * exists to stop it.
       */
      run: invariants.results.filter((r) => r.status !== InvariantStatus.DORMANT).length,
      failed: failed.length,
      failedIds: failed.map((r) => r.id),
    },
    geometry: {
      /**
       * `topologyChecked` is the flag that carries information here.
       *
       * `topologyValid` is `true` because the kernel *raises* on an invalid
       * topology rather than returning one (§14.3), so reaching this line means
       * every polygon passed. That reasoning only holds if a polygon was
       * actually built — hence the count, not a constant.
       */
      topologyChecked: args.geometry.areasRecomputed > 0,
      topologyValid: true,
      areasRecomputed: args.geometry.areasRecomputed,
      areaDisagreements: args.geometry.areaDisagreements,
    },
    /**
     * Required-but-nullable, and `undefined` is the honest value.
     *
     * §22.2 measures inter-architect variance on a golden set before this
     * product may claim agreement with professional judgement. That measurement
     * has not been taken. Writing `undefined` here deliberately is the whole
     * point of the field's shape — the fourth claim comes back NOT_ASSESSED, in
     * writing, in every report.
     */
    professionalAgreement: undefined,
    validatedAt: args.validatedAt,
  });

  return { invariants, validation };
}

/**
 * Everything that blocks emission, from both layers, in one list.
 *
 * §12.3 and §16.1 both say failure blocks emission rather than warning. The two
 * layers each produce their own list and neither knows about the other, so the
 * union is assembled here — and a caller that ignores it has to ignore it
 * visibly.
 */
export function emissionBlockers(checks: RunChecks): readonly string[] {
  const fromInvariants = checks.invariants.results
    .filter((r) => r.status === InvariantStatus.FAIL)
    .map(
      (r) =>
        `${r.id} FAILED — ${r.statement}. Observed ${r.observed ?? 'n/a'}, expected ` +
        `${r.expected ?? 'n/a'}. ${r.detail}`,
    );
  // The validator already folds the invariant *count* into its own blockers;
  // the per-check statements above are what a reader can act on, so both are
  // kept and the duplicate summary line is dropped.
  const fromValidation = checks.validation.emissionBlocked.filter(
    (b) => !b.includes('invariant(s) failed'),
  );
  return [...fromInvariants, ...fromValidation];
}

/** The wire shape of the checks block. Serialises; computes nothing. */
export function presentChecks(checks: RunChecks) {
  const { invariants, validation } = checks;
  const ran = invariants.results.filter((r) => r.status !== InvariantStatus.DORMANT);

  return {
    invariants: {
      /** Nothing failed. **Not** "everything was checked" — read `dormant`. */
      passed: invariants.passed,
      ran: ran.length,
      total: invariants.results.length,
      dormant: invariants.dormant,
      dormantNote: LEVEL_SCHEDULE_NOTE,
      results: invariants.results.map((r) => ({
        id: r.id,
        statement: r.statement,
        status: r.status,
        tolerance: r.tolerance,
        observed: r.observed ?? null,
        expected: r.expected ?? null,
        detail: r.detail,
      })),
      summaryLine: formatInvariantReport(invariants).split('\n').at(-1) ?? '',
    },
    validation: {
      summary: {
        hardChecked: validation.summary.hardChecked,
        hardSatisfied: validation.summary.hardSatisfied,
        hardViolated: validation.summary.hardViolated,
        hardNotEvaluable: validation.summary.hardNotEvaluable,
        deferredDeclared: validation.summary.deferredDeclared,
        lifeSafetyDeferred: validation.summary.lifeSafetyDeferred,
        resolutionsBlocked: validation.summary.resolutionsBlocked,
        feasible: validation.summary.feasible,
        violatedRuleIds: validation.summary.violatedRuleIds,
      },
      outcomes: validation.outcomes.map((o) => ({
        category: o.category,
        statement: o.statement,
        ...('ruleId' in o ? { ruleId: o.ruleId } : {}),
        ...('parameterId' in o ? { parameterId: o.parameterId } : {}),
        ...('status' in o ? { status: o.status } : {}),
        ...('reason' in o ? { reason: o.reason } : {}),
        ...('isLifeSafety' in o ? { isLifeSafety: o.isLifeSafety } : {}),
      })),
      /** The five statements of §16.5. The fourth is `NEVER_CLAIMED`, always. */
      claims: validation.claims,
      claimLines: validation.claimLines,
      independenceLimit: validation.independenceLimit,
      selfConsistencyNotice: validation.selfConsistencyNotice,
      emissionBlocked: emissionBlockers(checks),
    },
  };
}
