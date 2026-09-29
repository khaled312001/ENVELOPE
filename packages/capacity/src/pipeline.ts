/**
 * The run pipeline — a pure function of (inputs, rule set, assumptions).
 *
 * **Why purity is an architectural constraint and not a preference.**
 *
 * `FR-ASM-001` requires the assumption register to perturb every `ASSUMED` value
 * by ±10% and recompute, ranked by the effect on governing capacity, and `AC3`
 * wants inline editing with *immediate* recompute. `FR-DEF-002 AC4` separately
 * wants a one-click comparison of both parking-in-FAR treatments. With ten
 * assumptions that is twenty-plus full pipeline executions plus two more, all
 * inside the < 10 s budget of `P0-S5`.
 *
 * That is comfortably achievable — but only if the whole pipeline is a pure
 * function that can be called again with one input changed. The PRD schedules
 * the sensitivity engine for week 8 and never mentions purity in §19.1, which
 * means the constraint would be discovered two months in, against a codebase
 * that had no reason to respect it. Discovering it then is a rewrite. So it is
 * established here, first, and every stage below takes its state as an argument
 * and returns a new value.
 *
 * A fresh `ProvenanceGraph` and `Tracer` are constructed per run for the same
 * reason: a graph that accumulated across runs would make two runs of the same
 * inputs produce different node ids, and `M-RUN` (§13.4) requires the
 * deterministic portion to re-execute byte-identically.
 */

import {
  type BuildingModel,
  type CapacityResult,
  Decimal,
  type ParkingInFar,
  type ParkingResult,
  type Plot,
  type NodeId,
  ProvenanceGraph,
  type ProvenanceClass,
  type Traced,
  Tracer,
  type UnitTypeMix,
} from '@envelope/core';
import {
  type ConstraintSet,
  type EvalContext,
  materialize,
  type RuleRecord,
} from '@envelope/rules';

import { computeBands, type BandSource } from './bands.js';
import { buildBuildingModel } from './building.js';
import { solveEnvelope, type EnvelopeSolution } from './envelope.js';
import { planParkingLevel, type LevelPlan } from './level-plan.js';
import { buildMassing, type MassingResult } from './massing.js';
import { solveParking } from './parking.js';

export interface Actor {
  readonly id: string;
  readonly name: string;
}

/**
 * Everything a run consumes. Immutable, serialisable, and complete — if two
 * `RunInput`s are equal, the two runs are identical, which is what makes
 * §13.4 reproducibility checkable rather than aspirational.
 */
/**
 * SALEABLE AREA, STATED AS A RATIO **OR** AS AN AREA — exactly one of the two.
 *
 * Eng. Mohamed, 2026: the number he works with is an area — two thousand square
 * metres or more — and the field asked for a factor between 0 and 1. Both readings
 * are legitimate and neither is a conversion the reader should be doing in their
 * head:
 *
 *   * a RATIO is what a brief states as a market expectation — the project briefs
 *     on file say 93%-97% of GFA — and is the right input when the GFA is not yet
 *     known, which is most of the time;
 *   * an AREA is what a developer's own brief states when it states one, and
 *     asking somebody to divide it by a GFA the engine has not shown them yet is
 *     asking them to guess the denominator.
 *
 * EXACTLY ONE, ENFORCED BY THE TYPE. The two arms each forbid the other's field,
 * so an input carrying both does not compile and neither does one carrying
 * neither. A runtime check would be a second place for the rule to live, and the
 * copy that is not run is the copy that drifts.
 *
 * WHAT AN AREA IS DIVIDED BY, and it is worth naming because getting it wrong is
 * invisible. The divisor is the envelope's OWN GFA — plate x levels, the building
 * this run produced — never FAR x plot area. The permitted GFA is larger than the
 * scheme wherever the envelope binds below FAR, and a share taken against a GFA
 * the scheme never reaches reports an efficiency the scheme does not have.
 *
 * The share is what carries through to the unit count, in both directions: units
 * are the governing GFA over (nsa over ratio). So an area entered here is the
 * saleable area of the FULL envelope, and if a band below geometry governs, the
 * saleable area falls with it. That is the intended reading, and it is why both
 * figures are published as traced values either way — a reader always sees the
 * one they did not type and can check it against the one they did.
 */
export type SaleableEfficiencyInput = {
  readonly source: 'USER_SET' | 'DERIVED';
  readonly basis?: string;
  readonly actor?: { readonly id: string; readonly name: string };
} & (
  | { readonly value: Decimal; readonly saleableAreaM2?: undefined }
  | { readonly saleableAreaM2: Decimal; readonly value?: undefined }
);

export interface RunInput {
  readonly plot: Plot;
  readonly rules: readonly RuleRecord[];
  readonly actor: Actor;
  /**
   * `FR-DEF-002`: no default, and never `ASSUMED`. The run is refused while this
   * is `OPEN_REGULATORY_QUESTION`, because the answer moves capacity 15–35%.
   */
  readonly parkingInFar: ParkingInFar;
  /**
   * WHO ANSWERED IT, when the answer came from somebody other than the runner.
   *
   * `FR-DEF-002` permits this value to be `USER_SET` **by a named person**. The
   * named person is usually whoever is running the study, and then this is
   * absent and `input.actor` is the name on the node.
   *
   * It is present when the screen pre-filled the answer from a practice
   * statement on file — a named practitioner's recorded reply, held in
   * `@envelope/rules` as a `PracticeStatement`. Then the name on the node is
   * **theirs**, because that is where the value came from, and a run that
   * attributed it to the person who merely did not change it would be recording
   * a decision nobody made.
   *
   * It is deliberately NOT a route to `DERIVED`. `DERIVED` means the value
   * reached a cited regulatory instrument; a practitioner saying what the
   * practice is has not done that, and dressing it as though it had is the one
   * piece of laundering that would matter most on this particular number.
   *
   * The engine takes the quotation as data and does not look it up. `rules` is
   * not a dependency of anything that would let this become a lookup, and the
   * composition root is where a statement id is turned into these fields.
   */
  readonly parkingInFarStatement?: {
    readonly statementId: string;
    readonly statedBy: string;
    readonly statedOn: string;
    readonly verbatim: string;
  };
  readonly unitMix: {
    readonly source: 'USER_SET' | 'ASSUMED';
    readonly entries: readonly UnitTypeMix[];
    readonly basis?: string;
  };
  readonly parkingLevelsAvailable: number;
  readonly parkingUsableFraction: {
    readonly value: Decimal;
    readonly source: 'DERIVED' | 'ASSUMED';
    readonly basis?: string;
  };
  /** §15.3 — defaults to 1.00, `USER_SET`, never estimated by the engine. */
  readonly realismDiscount: Decimal;
  /**
   * Saleable area over GFA — and it has no default, because it never should
   * have had one.
   *
   * The engine used to compute units as `GFA ÷ area-per-unit`, which is only
   * true if every square metre of GFA is saleable. None of it is: cores,
   * corridors, structure, plant, lift lobbies and amenity space are all inside
   * GFA and none of them sells. The implicit 1.00 overstated the unit count on
   * every run — a hidden default of exactly the kind this codebase refuses
   * everywhere else, and it survived because it was never written down.
   *
   * Azizi's own brief states the number the market works to: **93%–97%**
   * ("GFA achievement is critical"). That is a developer target, not a
   * regulation, so it arrives here as `USER_SET` when a person selects the
   * standard — never as an engine estimate.
   */
  readonly saleableEfficiency: SaleableEfficiencyInput;
  /**
   * How the parking level is laid out and where the cars get in.
   *
   * Optional only in the sense that a caller may leave the defaults alone —
   * the plan itself is always produced. The 30 Aug 2026 meeting put this at the
   * centre of the product ("الباركينج والمداخل"), and a run that reported a bay
   * count without a layout would be reporting the number the client already
   * knows how to get wrong by hand.
   */
  readonly levelPlan?: {
    readonly includeRamp?: boolean;
    readonly structuralGridM?: Decimal;
    /** The affection plan's stated access side, when the sheet names one. */
    readonly accessEdgeSeq?: number;
  };
  /**
   * Podium levels, when a person has entered one.
   *
   * Absent is a real state and not a missing input: the affection plan states
   * the podium count and this engine does not derive it, so an absent one is
   * declared as an assumption in the massing rather than guessed. It moves the
   * picture; it moves no capacity figure.
   */
  readonly podiumLevels?: number;
  readonly context?: EvalContext;
}

export interface RunOutput {
  readonly envelope: EnvelopeSolution;
  readonly parking: ParkingResult;
  readonly capacity: CapacityResult;
  readonly graph: ProvenanceGraph;
  /**
   * The materialised constraint set, at the context the fixpoint converged on.
   *
   * This is the generator's *output* handed on as data, not a shortcut into the
   * generator. `@envelope/validation` consumes it to re-check the answer against
   * the same bounds the answer was built from, which is what §16.4 asks for:
   * "the validator evaluates the same encoded constraint set the generator
   * consumed". It never calls back into this package — it cannot, the dependency
   * does not exist.
   */
  readonly constraintSet: ConstraintSet;
  /** The converged evaluation context, carried so a report can state what was assumed true. */
  readonly context: EvalContext;
  /**
   * Units and parking bays the *emitted* capacity implies.
   *
   * Distinct from `parking.totalBays`, which is demand at the probe target. See
   * the comment at their construction — the difference is the whole reason
   * INV-13 can be checked honestly on a parking-governed plot.
   */
  readonly governingUnitCount: Traced<number>;
  readonly demandAtGoverningBays: Traced<number>;
  /**
   * Saleable area, both ways round — the ratio and the square metres.
   *
   * BOTH ARE ALWAYS EMITTED, whichever one was entered. A reader who typed a
   * ratio needs to see the area it comes to on this envelope to know it is the
   * building they meant; a reader who typed an area needs to see the ratio to
   * know they have not entered a figure from a different plot. A conversion done
   * silently is a conversion nobody checks, and this one moves the unit count.
   */
  readonly saleableEfficiency: Traced<Decimal>;
  readonly saleableAreaM2: Traced<Decimal>;
  /**
   * The parking-in-FAR treatment, as a value a reader can click.
   *
   * `FR-DEF-002`'s blocking question, answered, with the name of whoever
   * answered it on the node. Band A's formula says which way it went; this says
   * on whose authority.
   */
  readonly parkingInFarTreatment: Traced<ParkingInFar>;
  /**
   * The parking level, drawn.
   *
   * `parking` answers "how many bays does this scheme need and can the levels
   * hold them"; this answers "here they are". They are separate fields and not
   * one because they are separate claims — a level that packs 32 bays against a
   * demand of 41 is a real and reportable state, and merging the two would make
   * it unsayable.
   *
   * `undefined` when the level could not be laid out at all: a footprint too
   * narrow for one bay run raises inside the packer, and a run is more useful
   * without a drawing than blocked by one. The reason travels in
   * `levelPlanRefusal`.
   */
  readonly levelPlan: LevelPlan | undefined;
  readonly levelPlanRefusal: string | undefined;
  /** The envelope as volumes, for the 3D view and the drawing. */
  readonly massing: MassingResult;
  /**
   * The run as one building: levels at their elevations, the parking on each,
   * the ramps between them. Every drawing of this run — the sheets, the massing
   * view, the DXF — reads this and nothing else, so they cannot disagree.
   */
  readonly building: BuildingModel;
}

export class RunBlockedError extends Error {
  override readonly name = 'RunBlockedError';
  constructor(
    message: string,
    readonly gate: string,
  ) {
    super(message);
  }
}

/**
 * Execute one run.
 *
 * @throws {RunBlockedError} when a blocking declaration is missing. These are
 * product states, not failures — §20.2 calls the parking-in-FAR question "a
 * blocking question with no default. It signals immediately that the system will
 * not guess on things that matter."
 */
export function runPipeline(input: RunInput): RunOutput {
  if (input.parkingInFar === 'OPEN_REGULATORY_QUESTION') {
    throw new RunBlockedError(
      'capacity cannot be computed until the parking-in-FAR treatment is declared. ' +
        'It changes GFA — and therefore every capacity band — by 15–35%. FR-DEF-002 ' +
        'forbids a default and forbids assuming it: it is either DERIVED from a cited ' +
        'rule or USER_SET by a named person. Declare a treatment, or compare both.',
      'G2:parking-in-FAR',
    );
  }

  const graph = new ProvenanceGraph();
  const tracer = new Tracer(graph);

  // One context, built once and shared by every stage.
  //
  // Each stage used to enrich its own — which meant the parking rules were
  // resolved without `land_use` in scope and every one of them evaluated to
  // NOT_APPLICABLE. The engine then refused to continue, correctly and for the
  // wrong reason: it reported "no approved rule governs parking.demand" when the
  // rule was present, approved and applicable. A context assembled per stage is
  // a context that can disagree with itself, so there is exactly one here.
  const context: EvalContext = {
    ...input.context,
    parking_in_far: input.parkingInFar,
    land_use: input.plot.landUse,
    plot: {
      area_m2: plotAreaOf(input.plot).toNumber(),
      community: input.plot.community,
      shape_class: input.plot.shapeClass,
      frontage_count: input.plot.frontageCount,
    },
  };

  /*
    THE TREATMENT ITSELF IS A TRACED VALUE, not only a word in band A's formula.

    `FR-DEF-002` calls this the question with no default; until now the answer
    reached the graph as a `detail` field on band A, which a reader cannot click
    and a report cannot cite. It is the single input that moves capacity most, so
    it gets a node of its own, carrying the name of whoever answered it.

    USER_SET either way — by the person running the study, or by the named
    practitioner whose recorded statement the screen pre-filled it from. Never
    DERIVED: no regulatory instrument has been read for it.
  */
  const treatmentTraced = tracer.userSet('capacity.parking_in_far', input.parkingInFar, {
    actor: input.parkingInFarStatement
      ? {
          id: input.parkingInFarStatement.statementId,
          name: input.parkingInFarStatement.statedBy,
        }
      : input.actor,
    label: input.parkingInFarStatement
      ? `parking in FAR — stated ${input.parkingInFarStatement.statedOn}: ` +
        `"${input.parkingInFarStatement.verbatim}"`
      : 'parking in FAR',
  });

  const envelope = solveEnvelope({ plot: input.plot, rules: input.rules, tracer, context });

  const plateM2 = envelope.towerPlateCap.value;
  const levels = envelope.maxLevelsByHeight.value;

  // --- Saleable area per unit, and the GFA one unit actually consumes -------
  //
  // Two different numbers, and conflating them was a real defect. `weightedNsa`
  // is what a unit *sells*; `gfaPerUnit` is what it *costs* in GFA, which is
  // larger by everything that is not saleable: cores, corridors, structure,
  // plant, lift lobbies, amenity. Dividing GFA by the saleable area treats the
  // building as if it were all apartment, and reported 3–7% more units than any
  // scheme could hold.
  const weightedNsa = input.unitMix.entries.reduce(
    (s, e) => s.plus(e.share.times(e.nsaM2)),
    new Decimal(0),
  );

  const efficiency = input.saleableEfficiency;

  /*
    THE DIVISOR IS THE ENVELOPE'S OWN GFA, AND IT IS NAMED HERE RATHER THAN
    LEFT TO BE INFERRED.

    Not FAR x plot area. That is the PERMITTED GFA, and on every plot where the
    envelope binds below FAR — a setback-governed plate, a height ceiling — it is
    larger than the building this run actually produced. A ratio computed against
    a GFA the scheme does not reach reports an efficiency the scheme does not have.

    `plateM2 x levels` is the same quantity the unit count divides two statements
    below, which is what makes the two figures consistent rather than merely
    plausible.
  */
  const envelopeGfa = plateM2.times(levels);

  const statedArea = efficiency.saleableAreaM2;
  if (statedArea !== undefined && statedArea.lte(0)) {
    throw new RunBlockedError(
      `saleable area must be above zero; got ${statedArea.toString()} m².`,
      'saleable_efficiency',
    );
  }
  if (statedArea !== undefined && envelopeGfa.lte(0)) {
    throw new RunBlockedError(
      'a saleable area cannot be turned into a ratio against an envelope with no ' +
        'GFA. This plot produced no floor area at all — that is what to fix first.',
      'saleable_efficiency',
    );
  }

  const ratio =
    statedArea !== undefined ? statedArea.div(envelopeGfa).toDecimalPlaces(6) : efficiency.value;

  if (ratio.lte(0) || ratio.gt(1)) {
    /*
      THE MESSAGE NAMES BOTH NUMBERS WHEN THE AREA WAS THE INPUT.

      "saleable efficiency must sit in (0, 1]; got 1.23" is true and useless to
      somebody who never typed 1.23. They typed an area, and what they need to
      know is that it is larger than the GFA this envelope yields — which is
      usually a brief written for a bigger plot, or a figure in square feet.
    */
    throw new RunBlockedError(
      statedArea !== undefined
        ? `the saleable area entered (${statedArea.toFixed(2)} m²) is larger than the ` +
          `GFA this envelope yields (${envelopeGfa.toFixed(2)} m²), which would mean ` +
          'the building sells more area than it has. Check the figure — a brief ' +
          'written for a different plot, or square feet read as square metres, are ' +
          'the two ways this happens.'
        : `saleable efficiency must sit in (0, 1]; got ${ratio.toString()}. ` +
          'Above 1 would mean a building sells more area than it has.',
      'saleable_efficiency',
    );
  }

  /*
    THE FIGURE THE READER DID NOT TYPE IS PUBLISHED TOO.

    Whichever way round it was entered, both the ratio and the area are traced
    nodes: a person who typed 2,000 m2 sees the implied 0.93 and can tell at a
    glance that it is not 0.63, and a person who typed 0.93 sees the square metres
    it comes to on this envelope. A conversion done silently is a conversion
    nobody checks.
  */
  const areaTraced =
    statedArea === undefined
      ? null
      : efficiency.source === 'USER_SET'
        ? tracer.userSet('capacity.saleable_area_m2', statedArea, {
            actor: efficiency.actor ?? input.actor,
            label: 'saleable area',
            unit: 'm²',
          })
        : tracer.computed('capacity.saleable_area_m2', statedArea, {
            formula: 'saleable area, from a cited instrument',
            uses: {},
            unit: 'm²',
            provenanceClass: 'DERIVED',
          });

  const efficiencyTraced =
    areaTraced !== null
      ? tracer.computed('capacity.saleable_efficiency', ratio, {
          formula: `${statedArea!.toFixed(2)} m² saleable ÷ ${envelopeGfa.toFixed(2)} m² GFA`,
          uses: {
            saleableArea: areaTraced,
            plate: envelope.towerPlateCap,
            levels: envelope.maxLevelsByHeight,
          },
          unit: 'ratio',
        })
      : efficiency.source === 'USER_SET'
        ? tracer.userSet('capacity.saleable_efficiency', ratio, {
            actor: efficiency.actor ?? input.actor,
            label: 'saleable area ÷ GFA',
            unit: 'ratio',
          })
        : tracer.computed('capacity.saleable_efficiency', ratio, {
            formula: 'saleable area over GFA, from a cited instrument',
            uses: {},
            unit: 'ratio',
            provenanceClass: 'DERIVED',
          });

  /* The other direction: entered as a ratio, published as the area it implies. */
  const saleableAreaTraced =
    areaTraced ??
    tracer.computed('capacity.saleable_area_m2', ratio.times(envelopeGfa).toDecimalPlaces(2), {
      formula: `${ratio.toString()} × ${envelopeGfa.toFixed(2)} m² GFA`,
      uses: {
        efficiency: efficiencyTraced,
        plate: envelope.towerPlateCap,
        levels: envelope.maxLevelsByHeight,
      },
      unit: 'm²',
    });

  const nsaTraced = tracer.computed('capacity.weighted_nsa_m2', weightedNsa, {
    formula: input.unitMix.entries
      .map((e) => `${e.share.times(100).toFixed(1)}% × ${e.nsaM2.toFixed(2)} m²`)
      .join(' + '),
    uses: {},
    unit: 'm²',
    ...(input.unitMix.source === 'ASSUMED' ? { provenanceClass: 'ASSUMED' as const } : {}),
  });

  const gfaPerUnit = weightedNsa.isZero()
    ? new Decimal(0)
    : weightedNsa.div(ratio).toDecimalPlaces(4);
  const gfaPerUnitTraced = tracer.computed('capacity.gfa_per_unit_m2', gfaPerUnit, {
    formula:
      `${weightedNsa.toFixed(2)} m² saleable per unit ÷ ` +
      `${ratio.toString()} saleable per m² of GFA`,
    uses: { nsa: nsaTraced, efficiency: efficiencyTraced },
    unit: 'm²',
    detail: {
      note:
        'What one unit consumes of the GFA allowance, as against what it sells. ' +
        'The difference is cores, corridors, structure, plant and amenity — all ' +
        'inside GFA, none of it saleable.',
    },
  });

  const targetUnits = gfaPerUnit.isZero()
    ? 0
    : plateM2.times(levels).div(gfaPerUnit).floor().toNumber();

  const parking = solveParking({
    rules: input.rules,
    tracer,
    context,
    mix: {
      source: input.unitMix.source,
      entries: input.unitMix.entries,
      ...(input.unitMix.basis !== undefined ? { basis: input.unitMix.basis } : {}),
      actor: input.actor,
    },
    targetUnits,
    areaPerLevelM2: envelope.podiumFootprint.value,
    levelsAvailable: input.parkingLevelsAvailable,
    usableFraction: input.parkingUsableFraction,
  });

  // Each band must reach a cited rule (§13.3). The envelope solver already
  // resolved these, so the citation is carried through rather than re-derived —
  // a second lookup could disagree with the first, and a band citing a clause
  // the solver did not use would be worse than no citation at all.
  const bandSource = (parameterId: string): BandSource => {
    const governing = envelope.resolutions.get(parameterId)?.governing;
    if (!governing) {
      throw new RunBlockedError(
        `no governing rule for ${parameterId}, so the capacity band derived from it ` +
          `would have no citation. §13.3 requires every DERIVED value to reach a cited ` +
          `rule; emitting the band anyway would break that silently.`,
        parameterId,
      );
    }
    return { ruleId: governing.rule.ruleId, citation: governing.rule.citation };
  };

  const parkingRule = ((): BandSource => {
    const r = input.rules.find((x) => x.parameterId === 'parking.demand');
    if (!r) {
      throw new RunBlockedError(
        'no parking.demand rule is loaded, so Band C would have no citation.',
        'parking.demand',
      );
    }
    return { ruleId: r.ruleId, citation: r.citation };
  })();

  // --- The parking-in-FAR treatment, applied ------------------------------
  //
  // This is where the 15–35% lives. When parking counts toward FAR, the parking
  // area consumes part of the same GFA allowance the residential floors draw on,
  // so the area actually available to sell is the permitted GFA *less* the
  // parking area. When it is excluded, the full allowance is available.
  //
  // `INV-18` exists to check exactly this: "GFA composition matches the declared
  // parking-in-FAR treatment". A pipeline that computed the same number either
  // way would satisfy INV-18 trivially and would make `FR-DEF-002 AC4`'s
  // one-click comparison show a spread of zero — which would quietly turn the
  // product's most important open question into a question that does not matter.
  const grossPermittedGfa = farMaxOf(envelope).times(plotAreaOf(input.plot));
  const parkingAreaM2 = parking.requiredAreaM2.value;
  const availableGfaM2 =
    input.parkingInFar === 'COUNTS_TOWARD_FAR'
      ? Decimal.max(new Decimal(0), grossPermittedGfa.minus(parkingAreaM2))
      : grossPermittedGfa;

  const capacity = computeBands({
    tracer,
    permittedGfaM2: availableGfaM2,
    grossPermittedGfaM2: grossPermittedGfa,
    parkingInFar: input.parkingInFar,
    parkingInFarTraced: treatmentTraced,
    parkingAreaM2,
    farMax: farMaxOf(envelope),
    plotAreaM2: plotAreaOf(input.plot),
    farRule: bandSource('far.max'),
    towerPlateM2: plateM2,
    maxLevels: levels,
    heightRule: bandSource('height.max'),
    podiumFootprint: envelope.podiumFootprint,
    floorToFloorM: envelope.floorToFloorM,
    ...(envelope.resolutions.get('coverage.max')?.governing
      ? { coverageRule: bandSource('coverage.max') }
      : {}),
    parkingSupportableUnits: parking.supportableUnitCeiling.value,
    gfaPerUnitM2: gfaPerUnit,
    parkingRule,
    realismDiscount: { value: input.realismDiscount, actor: input.actor },
  });

  // --- Closing the loop: what the emitted answer actually demands -----------
  //
  // `parking.totalBays` is demand at `targetUnits` — the FAR-and-geometry probe
  // used to *find* the parking ceiling, not the answer. On a parking-governed
  // plot those are different schemes: the probe wants 186 units and 281 bays,
  // the answer settles on 66 units, and comparing one scheme's supply against
  // the other's demand reports a correct answer as a shortfall. INV-13 did
  // exactly that until this block existed.
  //
  // So the demand of the *emitted* answer is computed and emitted too. It is
  // also the number a reader needs to close the loop themselves: "at the
  // capacity this run reports, you need N bays and you have M."
  const governingUnitsValue = gfaPerUnit.isZero()
    ? 0
    : capacity.governingGfa.value.div(gfaPerUnit).floor().toNumber();
  const governingUnitCount = tracer.computed('capacity.governing_unit_count', governingUnitsValue, {
    formula: `floor(governing GFA ${capacity.governingGfa.value.toFixed(2)} m² ÷ ${gfaPerUnit.toFixed(2)} m² of GFA per unit)`,
    uses: { governing: capacity.governingGfa, perUnit: gfaPerUnitTraced },
    unit: 'units',
    provenanceClass: 'DERIVED',
  });

  const baysPerUnit = parking.baysPerUnit.value;
  const demandAtGoverningValue = baysPerUnit.times(governingUnitsValue).ceil().toNumber();
  const demandAtGoverningBays = tracer.computed(
    'parking.demand_at_governing_capacity',
    demandAtGoverningValue,
    {
      formula: `ceil(${governingUnitsValue} unit(s) × ${baysPerUnit.toFixed(4)} bays per unit)`,
      uses: { units: governingUnitCount, perUnit: parking.baysPerUnit, provided: parking.providedBays },
      unit: 'bays',
      provenanceClass: 'DERIVED',
      detail: {
        note:
          'Parking the reported capacity actually needs, as against ' +
          `parking.total_bays (${parking.totalBays.value}), which is the demand of the ` +
          'larger scheme used to probe for the parking ceiling.',
      },
    },
  );

  // Materialised once, at the converged context, over every parameter any rule
  // in the loaded set speaks to — not just the ones the envelope needed. A
  // constraint set restricted to the parameters the generator happened to read
  // would make the validator's coverage a function of the generator's appetite,
  // and a rule the generator ignored is exactly the rule a validator should be
  // able to notice went unchecked.
  const constraintSet = materialize(
    input.rules,
    [...new Set(input.rules.map((r) => r.parameterId))],
    envelope.finalContext,
  );

  // --- The level, laid out -------------------------------------------------
  //
  // Last, because it consumes the envelope's ring and the parking solver's
  // usable fraction, and because a failure here must not cost the run. A plot
  // too narrow to hold a single bay run is a finding about the plot; reporting
  // "no layout, and here is why" is the answer, and throwing would replace a
  // finding with an outage.
  let levelPlan: LevelPlan | undefined;
  let levelPlanRefusal: string | undefined;
  try {
    levelPlan = planParkingLevel({
      tracer,
      plot: input.plot,
      edges: input.plot.edges,
      podiumRing: envelope.podiumRing,
      usableFraction: parking.usableFraction,
      includeRamp: input.levelPlan?.includeRamp ?? true,
      ...(input.levelPlan?.structuralGridM === undefined
        ? {}
        : { structuralGridM: input.levelPlan.structuralGridM }),
      ...(input.levelPlan?.accessEdgeSeq === undefined
        ? {}
        : { affectionPlanAccessEdgeSeq: input.levelPlan.accessEdgeSeq }),
    });
  } catch (error) {
    levelPlanRefusal = error instanceof Error ? error.message : String(error);
  }

  const massing = buildMassing({
    tracer,
    podiumRing: envelope.podiumRing,
    plateRing: envelope.plateRing,
    floorToFloorM: envelope.floorToFloorM,
    maxLevelsByHeight: envelope.maxLevelsByHeight,
    ...(input.podiumLevels === undefined
      ? {}
      : { podiumLevels: { value: input.podiumLevels, actor: input.actor } }),
  });

  const building = buildBuildingModel({
    tracer,
    plot: input.plot,
    envelope,
    massing,
    parkingLevels: parking.levelsAvailable,
    levelPlan,
    levelPlanRefusal,
    answerLevels: capacity.levels,
  });

  return {
    envelope,
    parking,
    capacity,
    graph,
    constraintSet,
    context: envelope.finalContext,
    governingUnitCount,
    demandAtGoverningBays,
    saleableEfficiency: efficiencyTraced,
    saleableAreaM2: saleableAreaTraced,
    parkingInFarTreatment: treatmentTraced,
    levelPlan,
    levelPlanRefusal,
    massing,
    building,
  };
}

function farMaxOf(envelope: EnvelopeSolution): Decimal {
  const v = envelope.resolutions.get('far.max')?.governing?.value;
  return v && v.kind === 'scalar' ? v.value : new Decimal(0);
}

function plotAreaOf(plot: Plot): Decimal {
  return new Decimal(plot.computedAreaMm2).div(1_000_000);
}

// ---------------------------------------------------------------------------
// The assumption register and sensitivity — FR-ASM-001
// ---------------------------------------------------------------------------

export interface AssumptionEntry {
  /**
   * The provenance node, branded.
   *
   * A plain `string` here would let any identifier be handed to the click-
   * through endpoint, and "node not found" is a poor way to learn that a report
   * row lost its derivation. The brand keeps the register's rows and the graph's
   * nodes the same kind of thing all the way to the UI.
   */
  readonly nodeId: NodeId;
  readonly parameterId: string;
  readonly label: string;
  readonly value: string;
  readonly unit: string | undefined;
  readonly basis: string;
  readonly provenanceClass: ProvenanceClass;
  /**
   * Relative movement in the governing capacity when this assumption is
   * perturbed by ±10%. The ranking key — §20.2 calls the register "the moment
   * the user understands this is not magic", and it only works if the
   * assumption that moves the answer most is at the top.
   */
  readonly sensitivity: {
    readonly perturbation: string;
    readonly lowGoverningGfaM2: string;
    readonly highGoverningGfaM2: string;
    readonly relativeEffect: string;
  } | null;
}

/** Which assumptions the pipeline can currently perturb, and how. */
type Perturbable = {
  readonly parameterId: string;
  readonly apply: (input: RunInput, factor: Decimal) => RunInput;
};

const PERTURBABLE: readonly Perturbable[] = [
  {
    parameterId: 'parking.usable_fraction',
    apply: (input, factor) => ({
      ...input,
      parkingUsableFraction: {
        ...input.parkingUsableFraction,
        // A fraction cannot exceed 1; clamping is honest, and a clamped
        // perturbation understates sensitivity rather than overstating it.
        value: Decimal.min(new Decimal(1), input.parkingUsableFraction.value.times(factor)),
      },
    }),
  },
  {
    parameterId: 'capacity.user_realism_discount',
    apply: (input, factor) => ({
      ...input,
      realismDiscount: input.realismDiscount.times(factor),
    }),
  },
  {
    parameterId: 'parking.unit_mix',
    apply: (input, factor) => ({
      ...input,
      unitMix: {
        ...input.unitMix,
        entries: input.unitMix.entries.map((e) => ({ ...e, nsaM2: e.nsaM2.times(factor) })),
      },
    }),
  },
];

/**
 * Build the assumption register, sensitivity-ranked.
 *
 * `FR-ASM-001` perturbs each `ASSUMED` value by ±10% and recomputes. Assumptions
 * the pipeline cannot yet perturb are listed with `sensitivity: null` rather
 * than omitted or silently scored zero — an unmeasured assumption is not a
 * harmless one, and hiding it would defeat the register's purpose.
 */
export function buildAssumptionRegister(
  input: RunInput,
  output: RunOutput,
): readonly AssumptionEntry[] {
  const baseline = output.capacity.governingGfa.value;

  // Only *root* assumptions belong in the register — values whose derivation
  // names an assumption directly.
  //
  // A great many other values also carry class ASSUMED, because `Tracer.computed`
  // propagates the weakest input class: a capacity band computed from an assumed
  // bay-area factor is itself assumed, and rightly so. But those are consumers,
  // not assumptions. Listing them would give the register a dozen rows that a
  // user cannot edit and cannot act on, and would bury the three or four that
  // actually move the answer — which is the one thing §20.2 says the register
  // exists to prevent. Their taint is still visible: they render amber
  // everywhere, and `graph.derivationOf` walks from any of them back to the
  // assumption below.
  const assumptionNodes = output.graph.nodes.filter(
    (n) =>
      n.kind === 'VALUE' &&
      n.provenanceClass === 'ASSUMED' &&
      output.graph
        .outgoing(n.id)
        .some((e) => output.graph.node(e.to).kind === 'ASSUMPTION'),
  );

  const entries: AssumptionEntry[] = [];

  for (const node of assumptionNodes) {
    const parameterId = node.parameterId ?? node.label;
    const spec = PERTURBABLE.find((p) => p.parameterId === parameterId);

    let sensitivity: AssumptionEntry['sensitivity'] = null;
    if (spec) {
      const low = safeGoverning(spec.apply(input, new Decimal('0.9')));
      const high = safeGoverning(spec.apply(input, new Decimal('1.1')));
      if (low && high) {
        const spread = high.minus(low).abs();
        sensitivity = {
          perturbation: '±10%',
          lowGoverningGfaM2: low.toFixed(2),
          highGoverningGfaM2: high.toFixed(2),
          relativeEffect: baseline.isZero()
            ? '0'
            : spread.div(baseline).toDecimalPlaces(6).toString(),
        };
      }
    }

    entries.push({
      nodeId: node.id,
      parameterId,
      label: node.label,
      value: node.value ?? '',
      unit: node.unit,
      basis: basisOf(output.graph, node.id),
      provenanceClass: 'ASSUMED',
      sensitivity,
    });
  }

  // Ranked by effect. Unmeasured assumptions sort last but remain visible.
  return entries.sort((a, b) => {
    const ax = a.sensitivity ? Number(a.sensitivity.relativeEffect) : -1;
    const bx = b.sensitivity ? Number(b.sensitivity.relativeEffect) : -1;
    return bx - ax;
  });
}

function safeGoverning(input: RunInput): Decimal | undefined {
  try {
    return runPipeline(input).capacity.governingGfa.value;
  } catch {
    // A perturbation that makes the run infeasible is information, not a crash —
    // but it has no scalar effect to rank, so it is reported as unmeasured.
    return undefined;
  }
}

function basisOf(graph: ProvenanceGraph, valueNodeId: string): string {
  for (const edge of graph.outgoing(valueNodeId as never)) {
    const assumption = graph.node(edge.to);
    if (assumption.kind !== 'ASSUMPTION') continue;
    for (const inner of graph.outgoing(edge.to)) {
      const basis = graph.node(inner.to);
      if (basis.kind === 'BASIS') return basis.label;
    }
  }
  return '(no basis recorded — this is a defect; assumed() requires one)';
}

/**
 * `FR-DEF-002 AC4` — the one-click comparison of both parking-in-FAR treatments.
 *
 * Required whether or not the question is settled: while it is open the user
 * needs to see what each answer would mean, and once it is settled the
 * comparison is what shows how much the answer was worth.
 */
export function compareParkingInFar(input: RunInput): {
  readonly countsTowardFar: RunOutput | Error;
  readonly excludedFromFar: RunOutput | Error;
  /** Movement in Band A. The treatment always moves this. */
  readonly regulatorySpreadM2: Decimal | null;
  readonly regulatorySpreadRelative: Decimal | null;
  /** Movement in the *governing* capacity. May be zero — see `verdict`. */
  readonly spreadM2: Decimal | null;
  readonly spreadRelative: Decimal | null;
  /**
   * What the comparison means for this plot, in a sentence.
   *
   * The two spreads can differ, and the case where they do is the interesting
   * one: if another band binds below both treatments, the regulatory answer
   * moves and the *decision* does not. That is a genuinely useful finding — it
   * says the blocking question, on this plot, is not worth waiting for — and it
   * is invisible if only one number is reported.
   */
  readonly verdict: string;
} {
  const attempt = (treatment: ParkingInFar): RunOutput | Error => {
    try {
      /*
        THE ATTRIBUTION IS DROPPED FOR THE COMPARISON, and it has to be.

        The comparison runs the pipeline under BOTH treatments so a reader can
        see what each is worth. A statement records one of them. Carrying it into
        the other arm would put a named practitioner's name on an answer he did
        not give — which is exactly what the attribution exists to prevent.
      */
      const { parkingInFarStatement: _unattributed, ...unsourced } = input;
      return runPipeline({ ...unsourced, parkingInFar: treatment });
    } catch (e) {
      return e instanceof Error ? e : new Error(String(e));
    }
  };

  const countsTowardFar = attempt('COUNTS_TOWARD_FAR');
  const excludedFromFar = attempt('EXCLUDED_FROM_FAR');

  if (countsTowardFar instanceof Error || excludedFromFar instanceof Error) {
    return {
      countsTowardFar,
      excludedFromFar,
      regulatorySpreadM2: null,
      regulatorySpreadRelative: null,
      spreadM2: null,
      spreadRelative: null,
      verdict:
        'The comparison could not be completed: at least one treatment produced no ' +
        'feasible configuration.',
    };
  }

  const relative = (x: Decimal, y: Decimal): Decimal => {
    const base = Decimal.max(x, y);
    return base.isZero() ? new Decimal(0) : y.minus(x).abs().div(base);
  };

  const regA = countsTowardFar.capacity.regulationLimitedGfa.value;
  const regB = excludedFromFar.capacity.regulationLimitedGfa.value;
  const govA = countsTowardFar.capacity.governingGfa.value;
  const govB = excludedFromFar.capacity.governingGfa.value;

  const regSpread = regB.minus(regA).abs();
  const govSpread = govB.minus(govA).abs();
  const govRelative = relative(govA, govB);

  const verdict = govSpread.isZero()
    ? `The parking-in-FAR treatment moves regulatory capacity by ` +
      `${regSpread.toFixed(0)} m², but not the governing capacity: the ` +
      `${countsTowardFar.capacity.governingBand.toLowerCase()} limit binds below both ` +
      `treatments. On this plot the open regulatory question does not change the answer — ` +
      `though it would on a plot where the FAR ceiling binds.`
    : `The parking-in-FAR treatment moves the governing capacity by ` +
      `${govSpread.toFixed(0)} m² (${govRelative.times(100).toFixed(1)}%). This is the ` +
      `single largest unresolved question on this plot and it must be settled before ` +
      `the number is relied on.`;

  return {
    countsTowardFar,
    excludedFromFar,
    regulatorySpreadM2: regSpread,
    regulatorySpreadRelative: relative(regA, regB),
    spreadM2: govSpread,
    spreadRelative: govRelative,
    verdict,
  };
}
