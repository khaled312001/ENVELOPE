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
  levelCode,
  type LevelSchedule,
  parkingLevels,
  podiumFootprintLevels,
  scheduleRefusal,
  type ParkingInFar,
  type ParkingResult,
  type Plot,
  type NodeId,
  ProvenanceGraph,
  type ProvenanceClass,
  type Traced,
  type TracedDecimal,
  Tracer,
  type UnitTypeMix,
} from '@envelope/core';
import {
  type ConstraintSet,
  type EvalContext,
  materialize,
  type RuleRecord,
} from '@envelope/rules';
import { fromLocal, largestInscribedRectangle } from '@envelope/geometry';

import { computeBands, traceFloorAreaLevels, type BandSource } from './bands.js';
import { levelAreasOf, type LevelArea } from './level-areas.js';
import { aboveGradeParkingOf, buildBuildingModel, entryLevelOf, parkingInPodiumOf } from './building.js';
import { planGrade } from './grade.js';
import { buildGfaStatement, type GfaStatement } from './gfa-statement.js';
import { layoutCore } from './core-layout.js';
import {
  ArrangementChoiceRefusedError,
  DrivewayType,
  ParkingAngle,
  standardFor,
  type ParkingArrangement,
  type RampType,
} from './layout.js';
import { AccessChoiceRefusedError, type AccessChoice } from './access.js';
import { designateAccessible, designatePreferred, ENTRY_LEVEL_WORDS } from './accessible.js';
import { CoreRefusedError, reconcileCore, solveCore, type CoreResult } from './core.js';
import { solveEnvelope, type EnvelopeSolution, type StatementRef } from './envelope.js';
import { planParkingLevel, type LevelPlan } from './level-plan.js';
import { buildMassing, type MassingResult } from './massing.js';
import { demandAtUnits, solveParking, traceUsableFraction, type UnitScheduleEntry } from './parking.js';

/**
 * Why the parking at and above grade is counted from the ground up when nobody
 * said which levels park. Quoted in the assumption register.
 */
export const ABOVE_GRADE_PARKING_BASIS =
  'The run states how many parking levels it has and how many levels stand on the podium, not ' +
  'which of them park. They are counted in the podium from the ground up — the rule the drawings ' +
  'place them by — and each one is a storey under the height ceiling that holds no floor area. ' +
  'Enter the level schedule to replace it.';

/**
 * Why a podium parking level is counted against the plan's own level count.
 * Q27 with the client; quoted in the assumption register.
 */
export const PARKING_IN_LEVEL_COUNT_BASIS =
  'The affection plan states the level count as every storey above grade — G+1P+16 is eighteen, ' +
  'the ground floor and the podium levels among them — so a parking level at or above grade is ' +
  'one of the counted levels and the tower plate is counted on the rest. Whether the authority ' +
  'counts a podium parking level against the plan’s level count has not been confirmed (Q27). If ' +
  'it does not, each one adds a tower plate to band B.';

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
  /*
    ASSUMED since 16 Oct 2026, when Eng. Mohamed deferred the question out of
    this phase ("مش هيكون في المرحله دي هناجله"). Not a default: the caller
    sends the value AND a basis, the engine emits it amber, and the register
    measures it. A ratio only — an assumed AREA would be a guess at a brief.
  */
  readonly source: 'USER_SET' | 'DERIVED' | 'ASSUMED';
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
  /**
   * The podium, ground floor and basements stand on the boundary wherever the
   * plot's own sheet is silent — Eng. Mohamed, 16 Oct 2026. Resolved from a
   * statement id at the composition root, as `parkingInFarStatement` is. Absent,
   * the podium is held to the tower's setback line, as every older run was.
   */
  readonly podiumAtBoundaryStatement?: StatementRef;
  /**
   * A clear gap between every three bays along a run, for the columns — Eng.
   * Mohamed, 16 Oct 2026. Resolved from a statement id at the composition root,
   * with the gap his statement records. Absent, bays are packed shoulder to
   * shoulder, as every older run was, so a stored run keeps its count.
   */
  readonly columnGapStatement?: StatementRef & { readonly gapM: Decimal };
  /**
   * Tower setbacks the reader typed, for edges no instrument of the plot speaks
   * to. Each is `USER_SET` by `actor` and replaces a general rule's value on its
   * edge; on an edge the sheet governs it halts the run in a sentence.
   */
  readonly typedSetbacks?: readonly { readonly edgeSeq: number; readonly metres: Decimal }[];
  readonly unitMix: {
    readonly source: 'USER_SET' | 'ASSUMED';
    readonly entries: readonly UnitTypeMix[];
    readonly basis?: string;
  };
  /**
   * Levels of parking, as one number.
   *
   * The whole level model, until `levelSchedule` below. Kept because it is what
   * every stored run holds, and a stored run is never re-interpreted — see the
   * note on `levelSchedule`. Where both are given the schedule wins, because it
   * says the same thing with more of the building in it.
   */
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
    /**
     * The vehicle entrance the run's actor placed — the boundary, the point along
     * it and the arrangement — `USER_SET` by them, drawn on every sheet, with the
     * recommendation reported beside it. An opening the code refuses blocks the
     * run in a sentence; see `AccessChoiceRefusedError`.
     */
    readonly vehicleAccess?: Omit<AccessChoice, 'actor'>;
    /**
     * Lay the parking out around the core's shafts — stairs, lifts and the lift
     * lobby — rather than drawing them over bays that stay in the count.
     *
     * ON BY DEFAULT SINCE 15 OCT 2026; `false` switches it off. It shipped off
     * because a centred core cut the one aisle a shallow level has: 11 bays down
     * to 4 on the client's 50.85 × 26.85 m plot. Two things since make it safe to
     * turn on: the ring of bays round all four walls puts the shafts on the
     * island, and on a level whose island is too shallow for the compact core the
     * stairs and lifts are laid in one row (`layoutCore`), as the client draws
     * them. Off, bays were drawn under the lift lobby and counted — the defect
     * the client reported. The core stands where a fixed rule puts it — moved
     * toward the parking island by one of four set fractions where the plate
     * holds it there (`solveCore`); nothing searches for a better place.
     */
    readonly avoidCore?: boolean;
    /**
     * A ramp arrangement somebody stated, `USER_SET` under the run's actor.
     * Absent, every arrangement is packed — the ring sloped as the ramp among
     * them — and the most bays wins. Stated, the ramp is that strip.
     */
    readonly rampType?: RampType;
    /**
     * The parking arrangement the run's actor picked from a previous run's
     * `arrangements`, `USER_SET` under that actor. Absent, the most bays wins.
     */
    readonly arrangement?: ParkingArrangement;
  };
  /**
   * Levels standing on the podium footprint, **the ground floor included**.
   *
   * Absent is a real state and not a missing input: the affection plan states
   * the podium count and this engine does not derive it, so an absent one is
   * declared as an assumption in the massing rather than guessed. It moves the
   * picture; it moves no capacity figure.
   *
   * THE GROUND FLOOR IS INSIDE THIS NUMBER and was not documented as being so,
   * which is how `G+2P+8` came to draw a two-level podium where the sheet says
   * three. A caller with a height code should send `levelSchedule` and let
   * `podiumFootprintLevels` do that arithmetic in one place.
   */
  readonly podiumLevels?: number;
  /**
   * The level schedule — what the building is made of, level by level.
   *
   * Eng. Mohamed, 2026-09-28: *"هو المفروض تكون ground floor, Bassment كام دور,
   * Podium كام دور"*. The two integers above cannot say any of that, and the
   * three kinds of level do not behave alike: a basement has no setback and
   * costs ramp length, the ground floor carries the vehicle entrance, a podium
   * level is bound by the podium setback.
   *
   * **Optional, and additive rather than a replacement.** Every run stored
   * before this existed holds the integers and nothing else, and a stored run
   * is never re-interpreted — re-reading an old answer under a new model would
   * change a number somebody has already been shown. Where a schedule is given
   * it supplies both integers, traced, with the arithmetic written out.
   *
   * **Q27 is not answered here.** Whether a podium parking level counts against
   * the height allowance is open with the client, and this type states what the
   * building is, not how the allowance treats it.
   */
  readonly levelSchedule?: LevelSchedule;
  /**
   * The core's plan area on a typical level, m² — Eng. Mohamed's *"الاهم"*.
   *
   * Absent is a real state and not a missing input: nobody has said, and the
   * engine declares an assumption at 18% of the tower plate rather than drawing
   * a tower with nothing in it. Present, it is `USER_SET` by `actor`.
   *
   * **It subtracts from nothing.** A core is inside GFA and outside saleable
   * area, so the saleable figure this run was given already carries it, and on a
   * parking level it is inside what the usable fraction deducts. The engine
   * draws it and reconciles it against both; it never charges for it twice. The
   * argument in full is at the top of `core.ts`.
   */
  readonly coreAreaM2?: Decimal;
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
  /** The governing unit count by type, in whole units summing to it — what the demand above is read on. */
  readonly unitSchedule: Traced<readonly UnitScheduleEntry[]>;
  /** Storeys under the height ceiling that hold floor area: band B's level count. */
  readonly floorAreaLevels: Traced<number>;
  /** Storeys from grade to the top of the highest placed level — observed against the plan's G+N. */
  readonly levelsAboveGround: TracedDecimal;
  /** Each level of the model with what the run counts on it — INV-01, INV-11, INV-18 read it. */
  readonly levelAreas: readonly LevelArea[];
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
  /** The same share on the building the run reports (governing GFA), never larger than it. */
  readonly saleableAreaAtGoverningM2: Traced<Decimal>;
  /**
   * The parking-in-FAR treatment, as a value a reader can click.
   *
   * `FR-DEF-002`'s blocking question, answered, with the name of whoever
   * answered it on the node. Band A's formula says which way it went; this says
   * on whose authority.
   */
  readonly parkingInFarTreatment: Traced<ParkingInFar>;
  /**
   * The schedule this run was computed on, when one was stated, and the height
   * code it writes as — `2B+G+3P+35`.
   *
   * Null on a run that was given the integers instead, which is every run
   * stored before the schedule existed. A reader of such a run sees a note
   * saying which model it was computed under rather than a code inferred from
   * numbers that cannot carry one.
   */
  readonly levelSchedule: {
    readonly schedule: LevelSchedule;
    readonly code: string;
  } | null;
  /**
   * The core: its area, its share of the plate, and what that share says about
   * the two inputs already carrying it.
   *
   * Never null on a run this engine computes. The *model's* core is nullable,
   * because a run stored before the core existed has none and one inferred now
   * from its stored numbers would be a core nobody entered.
   */
  readonly core: {
    readonly areaM2: TracedDecimal;
    readonly plateShare: TracedDecimal;
    readonly placement: Traced<string>;
    readonly reconciliation: readonly string[];
  };
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
  /**
   * The area table a submission drawing carries — allowed, proposed, and the
   * floors that make up the proposal. Every figure in it is one this run already
   * produced; see `gfa-statement.ts`.
   */
  readonly gfaStatement: GfaStatement;
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

  /*
    THE SCHEDULE SUPPLIES THE TWO INTEGERS, and it is checked before anything is
    computed rather than clamped.

    A clamp would answer a question about the building that whoever filled the
    form got wrong — four podium parking levels in a two-level podium is not a
    number to round down, it is a schedule to fix.
  */
  const schedule = input.levelSchedule;
  if (schedule) {
    const refusal = scheduleRefusal(schedule);
    if (refusal) throw new RunBlockedError(refusal, 'G2:level-schedule');
  }
  const parkingLevelsAvailable = schedule ? parkingLevels(schedule) : input.parkingLevelsAvailable;
  const podiumFootprint = schedule ? podiumFootprintLevels(schedule) : input.podiumLevels;

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

  const envelope = solveEnvelope({
    plot: input.plot,
    rules: input.rules,
    tracer,
    context,
    ...(input.podiumAtBoundaryStatement ? { podiumAtBoundary: input.podiumAtBoundaryStatement } : {}),
    ...(input.typedSetbacks?.length
      ? {
          typedSetbacks: new Map(
            input.typedSetbacks.map((s) => [s.edgeSeq, { metres: s.metres, actor: input.actor }] as const),
          ),
        }
      : {}),
  });

  const plateM2 = envelope.towerPlateCap.value;
  const levels = envelope.maxLevelsByHeight.value;

  /*
    A PODIUM TALLER THAN THE CEILING IS REFUSED, NOT CLAMPED. The massing would
    cut it to the ceiling and draw a building whose podium is shorter than the
    schedule says — with the parking on it moved or lost — and every figure
    after that would be about a building nobody entered.
  */
  if (schedule && podiumFootprintLevels(schedule) > levels) {
    throw new RunBlockedError(
      `the level schedule stands ${podiumFootprintLevels(schedule)} level(s) on the podium footprint ` +
        `(the ground floor and ${schedule.podiumAboveGround} podium level(s)), and the height ceiling ` +
        `allows ${levels} level(s) above ground. Take podium levels out of the schedule, or put the ` +
        'parking below grade.',
      'G2:level-schedule',
    );
  }

  // Before the saleable share and the bands: the massing settles how many levels
  // stand on the podium, and so which storeys under the ceiling are parking.
  const massing = buildMassing({
    tracer,
    podiumRing: envelope.podiumRing,
    plateRing: envelope.plateRing,
    floorToFloorM: envelope.floorToFloorM,
    maxLevelsByHeight: envelope.maxLevelsByHeight,
    ...(podiumFootprint === undefined
      ? {}
      : { podiumLevels: { value: podiumFootprint, actor: input.actor } }),
  });
  const podiumMassLevels = massing.masses.find((m) => m.id === 'podium')?.levels.value ?? 0;
  /*
    The ground floor parks by its own answer when a schedule states one — never
    because some podium level above it parks. That conflation put the drive, the
    transformer band and the accessible bays on plot 6468096's shop floor.
  */
  const aboveGrade = aboveGradeParkingOf(schedule, parkingLevelsAvailable, podiumMassLevels);
  const groundParks = aboveGrade.ground;
  const entryLevel = entryLevelOf(
    aboveGrade,
    schedule ? schedule.basements : parkingLevelsAvailable - parkingInPodiumOf(schedule, parkingLevelsAvailable, podiumMassLevels),
  );

  /*
    THE STOREYS UNDER THE CEILING THAT HOLD FLOOR AREA.

    Every parking level at or above grade is a storey of the height the ceiling
    allows, and holds no floor area. Band B, the envelope's own GFA (the saleable
    share's divisor) and the probe all count the plate on the storeys left.

    Where the count comes from is said in its class. A schedule is the reader
    saying which levels park: USER_SET. Without one, two integers cannot say it,
    and the podium-from-the-ground-up rule the drawings place them by is
    ASSUMED, with that basis. And where the ceiling is the affection plan's level
    count rather than a height in metres, counting a podium parking level against
    it is the reading of `G+nP+n` this engine takes — the P levels are in the
    count — and is ASSUMED until the client confirms the authority reads it so.
  */
  const aboveGradeCount = (aboveGrade.ground ? 1 : 0) + aboveGrade.podium;
  const aboveGradeParking: Traced<number> =
    schedule || parkingLevelsAvailable === 0
      ? tracer.userSet('capacity.above_grade_parking_levels', aboveGradeCount, {
          actor: input.actor,
          label: 'parking levels at or above grade',
          unit: 'levels',
        })
      : tracer.assumed('capacity.above_grade_parking_levels', aboveGradeCount, {
          label: 'parking levels at or above grade',
          basis: ABOVE_GRADE_PARKING_BASIS,
          unit: 'levels',
        });
  const levelsGoverning = envelope.resolutions.get('levels.max_above_ground')?.governing;
  const levelsCited: BandSource | undefined =
    levelsGoverning &&
    envelope.bindingConstraints.some((b) => b.dimension === 'levels' && b.ruleId === levelsGoverning.rule.ruleId)
      ? { ruleId: levelsGoverning.rule.ruleId, citation: levelsGoverning.rule.citation }
      : undefined;
  const parkingInLevelCount =
    levelsCited && aboveGradeCount > 0
      ? tracer.assumed('capacity.parking_in_stated_level_count', 'counted against the stated level count', {
          label: 'podium parking in the plan\'s level count',
          basis: PARKING_IN_LEVEL_COUNT_BASIS,
        })
      : undefined;
  const floorAreaLevels = traceFloorAreaLevels(
    tracer,
    envelope.maxLevelsByHeight,
    aboveGradeParking,
    parkingInLevelCount,
  );

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
    plausible. The levels are the ones that hold floor area — band B's — not
    every storey under the ceiling, the parking ones included.
  */
  const envelopeGfa = plateM2.times(floorAreaLevels.value);

  const statedArea = efficiency.saleableAreaM2;
  if (efficiency.source === 'ASSUMED' && (statedArea !== undefined || !efficiency.basis?.trim())) {
    throw new RunBlockedError(
      statedArea !== undefined
        ? 'a saleable AREA cannot be assumed — it is a figure from a brief. Assume a share ' +
          'of GFA with a basis, or enter the area as yours.'
        : 'an ASSUMED saleable share requires a basis. If you cannot write down why this ' +
          'share, you do not have an assumption, you have a guess.',
      'saleable_efficiency',
    );
  }
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
            levels: floorAreaLevels,
          },
          unit: 'ratio',
        })
      : efficiency.source === 'USER_SET'
        ? tracer.userSet('capacity.saleable_efficiency', ratio, {
            actor: efficiency.actor ?? input.actor,
            label: 'saleable area ÷ GFA',
            unit: 'ratio',
          })
        : efficiency.source === 'ASSUMED'
        ? tracer.assumed('capacity.saleable_efficiency', ratio, {
            label: 'saleable area ÷ GFA',
            basis: efficiency.basis!,
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
        levels: floorAreaLevels,
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
    : envelopeGfa.div(gfaPerUnit).floor().toNumber();

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

  // Materialised once, at the converged context, over every parameter any rule
  // in the loaded set speaks to — not just the ones the envelope needed. A
  // constraint set restricted to the parameters the generator happened to read
  // would make the validator's coverage a function of the generator's appetite,
  // and a rule the generator ignored is exactly the rule a validator should be
  // able to notice went unchecked.
  const constraintSet = {
    ...materialize(input.rules, [...new Set(input.rules.map((r) => r.parameterId))], envelope.finalContext),
    // The rules this run was told not to apply, carried to the validator so it
    // can say so rather than silently skip them or block on them.
    setAside: envelope.setAside,
  };

  /*
    THE CORE — sized here and drawn everywhere, never subtracted.

    It is solved before the parking level is laid out, because the core is a
    shaft through every parking level and the layout places no bay inside it,
    and before the model because every level draws it. A stated area that
    cannot be a core of this plate is refused in the caller's own words rather
    than clamped.
  */
  /*
    THE ISLAND A RING OF BAYS LEAVES, measured before the core is placed: the
    core centres over it where it can, and on a level that shallow the stairs
    and lifts go in one row, as the client draws them, or they would stand
    across the ring. A fixed rule, not a search.
  */
  const island = (() => {
    try {
      const r = largestInscribedRectangle(envelope.podiumRing);
      const s = standardFor(ParkingAngle.DEG_90, DrivewayType.TWO_WAY);
      const band = (Number(s.bayLengthM) + Number(s.drivewayWidthM)) * 1000;
      const w = Number(r.widthMm) - 2 * band;
      const d = Number(r.depthMm) - 2 * band;
      if (w <= 0 || d <= 0) return undefined;
      return {
        depthMm: Math.min(w, d),
        ring: [
          fromLocal(r, band, band),
          fromLocal(r, band + w, band),
          fromLocal(r, band + w, band + d),
          fromLocal(r, band, band + d),
        ],
      };
    } catch {
      return undefined;
    }
  })();

  let core: CoreResult;
  try {
    core = solveCore({
      tracer,
      plateRing: envelope.plateRing,
      plateAreaM2: envelope.towerPlateCap,
      ...(input.coreAreaM2 === undefined
        ? {}
        : { stated: { areaM2: input.coreAreaM2, actor: input.actor } }),
      ...(island
        ? {
            anchor: {
              x: island.ring.reduce((s, p) => s + p.x, 0) / 4,
              y: island.ring.reduce((s, p) => s + p.y, 0) / 4,
            },
          }
        : {}),
    });
  } catch (error) {
    if (error instanceof CoreRefusedError) throw new RunBlockedError(error.message, 'G2:core');
    throw error;
  }
  /*
    THE CORE'S INDICATIVE LAYOUT, AND THE SHAFT IT GIVES THE CAR PARK.

    Laid out here, once, because the parking level needs it: what passes
    through a parking level is the stairs, the lifts and the lift lobby, not
    the whole residential core. Where no layout fits, the whole core is the
    obstruction — the safe side.
  */
  const coreLayout = layoutCore({
    tracer,
    ring: core.ring,
    ...(island ? { maxShaftDepthMm: island.depthMm, island: island.ring } : {}),
  });
  const parkingObstruction =
    coreLayout.kind === 'LAID_OUT'
      ? { ring: coreLayout.shaft.outline, areaM2: coreLayout.shaft.areaM2 }
      : { ring: core.ring, areaM2: core.areaM2 };

  // --- The level, laid out -------------------------------------------------
  //
  // Before the parking supply, because the supply IS this level: its bays,
  // counted, on every parking level. A failure here must not cost the run. A
  // plot too narrow to hold a single bay run is a finding about the plot;
  // reporting "no layout, and here is why" is the answer, and throwing would
  // replace a finding with an outage — the supply then falls back to an area
  // estimate, and says so.
  const usableTraced = traceUsableFraction(tracer, input.parkingUsableFraction);

  /*
    THE COLUMN GAP, UNDER HIS NAME. USER_SET by the statement's author and quoted
    in the label, as the podium setback is: no clause of the Dubai Building Code
    places a column every three bays, and a practitioner saying so is not one.
  */
  const gapStatement = input.columnGapStatement;
  const columnGap = gapStatement
    ? {
        everyBays: 3,
        gapM: tracer.userSet('parking.column_gap_m', gapStatement.gapM, {
          actor: { id: gapStatement.statementId, name: gapStatement.statedBy },
          label: `clear gap after every 3 bays, for the columns — stated ${gapStatement.statedOn}: "${gapStatement.verbatim}"`,
          unit: 'm',
        }),
      }
    : undefined;

  let levelPlan: LevelPlan | undefined;
  let levelPlanRefusal: string | undefined;
  try {
    levelPlan = planParkingLevel({
      tracer,
      plot: input.plot,
      edges: input.plot.edges,
      podiumRing: envelope.podiumRing,
      usableFraction: usableTraced,
      includeRamp: input.levelPlan?.includeRamp ?? true,
      storeyHeightM: envelope.floorToFloorM,
      ...(schedule ? { rampPlan: { schedule, actor: input.actor } } : {}),
      slopedRing: parkingLevelsAvailable >= 2,
      ...(input.levelPlan?.rampType === undefined
        ? {}
        : { rampType: { type: input.levelPlan.rampType, actor: input.actor } }),
      ...(input.levelPlan?.arrangement === undefined
        ? {}
        : { arrangement: { id: input.levelPlan.arrangement, actor: input.actor } }),
      // On unless switched off: a bay under the stairs and lifts is not a bay.
      ...(input.levelPlan?.avoidCore === false ? {} : { core: parkingObstruction }),
      ...(input.levelPlan?.structuralGridM === undefined
        ? {}
        : { structuralGridM: input.levelPlan.structuralGridM }),
      ...(columnGap ? { columnGap } : {}),
      ...(input.levelPlan?.accessEdgeSeq === undefined
        ? {}
        : { affectionPlanAccessEdgeSeq: input.levelPlan.accessEdgeSeq }),
      ...(input.levelPlan?.vehicleAccess === undefined
        ? {}
        : { chosenAccess: { ...input.levelPlan.vehicleAccess, actor: input.actor } }),
    });
    if (groundParks) {
      const plan = levelPlan;
      levelPlan = {
        ...plan,
        grade: planGrade({
          tracer,
          plot: input.plot,
          rects: plan.rects,
          perLevel: plan.bayCount,
          access: plan.access,
          bayLengthM: new Decimal(plan.layout.standard.bayLengthM),
          obstacles: [
            ...(input.levelPlan?.avoidCore === false ? [] : [{ ring: parkingObstruction.ring, what: 'core' }]),
            ...(plan.rampStrip ? [{ ring: plan.rampStrip.world, what: 'ramp' }] : []),
          ],
        }),
      };
    }
    /*
      THE ACCESSIBLE BAYS, ON THE LEVEL THE STREET REACHES (DBC C.6.4). Counted
      off the building's whole supply, placed on one level, and paid for in bays:
      each takes a neighbour as its access aisle. See `accessible.ts`.
    */
    if (parkingLevelsAvailable >= 1 && entryLevel) {
      const plan = levelPlan;
      levelPlan = {
        ...plan,
        accessible: designateAccessible({
          tracer,
          level: entryLevel,
          ...(plan.slopedFloor ? { floorGradientPct: plan.slopedFloor.gradientPct } : {}),
          rects: plan.grade?.rects ?? plan.rects,
          levelBays: plan.grade?.bayCount ?? plan.bayCount,
          others: { perLevel: plan.bayCount, levels: parkingLevelsAvailable - 1 },
          bayWidthM: new Decimal(plan.layout.standard.bayWidthM),
          core: parkingObstruction.ring,
        }),
      };
    }
  } catch (error) {
    /*
      A refused CHOICE is not a finding about the plot, it is a request the
      engine will not carry out — so it blocks the run, as a refused core does,
      rather than costing it the layout and leaving the reader to wonder why.
    */
    if (error instanceof AccessChoiceRefusedError) {
      throw new RunBlockedError(error.message, 'G2:access');
    }
    if (error instanceof ArrangementChoiceRefusedError) {
      throw new RunBlockedError(error.message, 'G2:arrangement');
    }
    levelPlanRefusal = error instanceof Error ? error.message : String(error);
  }

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
    levelsAvailable: parkingLevelsAvailable,
    usableFraction: input.parkingUsableFraction,
    usableTraced,
    ...(levelPlan
      ? {
          laidOut: {
            baysPerLevel: levelPlan.bayCount,
            ...(levelPlan.accessible
              ? {
                  groundBays: levelPlan.accessible.bayCount,
                  firstLevel: ENTRY_LEVEL_WORDS[levelPlan.accessible.level],
                }
              : levelPlan.grade
                ? { groundBays: levelPlan.grade.bayCount }
                : {}),
          },
        }
      : {}),
  });
  const coreReconciliation = reconcileCore({
    plateShare: core.plateShare.value,
    coreAreaM2: core.areaM2.value,
    saleableEfficiency: efficiencyTraced.value,
    parkingUsableFraction: parking.usableFraction.value,
    parkingLevelAreaM2: envelope.podiumFootprint.value,
  });

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
    towerPlate: envelope.towerPlateCap,
    floorAreaLevels,
    aboveGradeParking: aboveGrade,
    maxLevels: envelope.maxLevelsByHeight,
    parkingArea: parking.requiredAreaM2,
    /*
      THE RULE BAND B STANDS ON IS THE ONE THAT BOUND THE LEVELS. Where the plot's
      own plan states the level count and it governs, citing the generic height
      rule put a set-aside placeholder (R-HEIGHT-MAX-RES on Mamzar) on screen as
      the governing constraint — a citation of a rule the run had just set aside.
    */
    ...(levelsCited
      ? { heightRule: levelsCited, geometricLabel: 'level count on the affection plan and tower plate' }
      : { heightRule: bandSource('height.max') }),
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

  /*
    BY TYPE, NOT BY RATIO. The answer's units are apportioned to the mix in whole
    units and Table B.13 is read on that schedule, Σ ratio × count — the same
    rule the probe's demand was read by, on the answer's own units. A bays-per-
    unit ratio carried over from the probe's rounding was a bay out either way.
  */
  const atGoverning = demandAtUnits({
    rules: input.rules,
    tracer,
    context,
    mix: parking.unitMix,
    units: governingUnitCount,
    providedBays: parking.providedBays,
    probeBays: parking.totalBays,
  });
  const demandAtGoverningBays = atGoverning.totalBays;

  /*
    SALEABLE AREA AT THE REPORTED CAPACITY.

    `capacity.saleable_area_m2` is the share applied to the ENVELOPE's GFA
    (plate × levels) — the right divisor when an area is turned into a share,
    and the wrong figure to print beside the answer: on a FAR-governed plot the
    envelope is far larger than the building, and Warsan IC1-CTYL-16_011 showed
    14,161 m² "saleable" beside a governing 4,743 m². This is the same share on
    the building the run reports, which is the figure a reader asks for.
  */
  const saleableAtGoverning = tracer.computed(
    'capacity.saleable_area_at_governing_m2',
    efficiencyTraced.value.times(capacity.governingGfa.value).toDecimalPlaces(2),
    {
      formula: `${efficiencyTraced.value.toString()} × governing GFA ${capacity.governingGfa.value.toFixed(2)} m²`,
      uses: { efficiency: efficiencyTraced, governing: capacity.governingGfa },
      unit: 'm²',
    },
  );

  // The preferred bays of B.7.2.6.2 are counted off what the answer REQUIRES, so
  // they wait for it; marking one changes no count, so nothing above moves.
  if (levelPlan?.accessible) {
    levelPlan = {
      ...levelPlan,
      accessible: designatePreferred(tracer, levelPlan.accessible, {
        requiredBays: demandAtGoverningBays,
        providedBays: parking.providedBays.value,
        core: parkingObstruction.ring,
      }),
    };
  }

  const building = buildBuildingModel({
    tracer,
    plot: input.plot,
    envelope,
    massing,
    core: {
      result: core,
      reconciliation: coreReconciliation,
      layout: coreLayout,
      shaftOnParking: input.levelPlan?.avoidCore !== false,
    },
    parkingLevels: parking.levelsAvailable,
    levelPlan,
    levelPlanRefusal,
    answerLevels: capacity.levels,
    /*
      The schedule, when there is one — and it stops the placement being an
      assumption. Where the parking sits was never derivable from two integers,
      so `building.ts` placed it podium-first and declared that in amber. A
      stated schedule is the person saying where it goes.
    */
    ...(schedule ? { schedule, actor: input.actor } : {}),
  });

  const isParking = (use: string): boolean =>
    use === 'BASEMENT_PARKING' || use === 'PODIUM_PARKING';
  const gfaStatement = buildGfaStatement({
    tracer,
    farMax: farMaxOf(envelope),
    plotAreaM2: plotAreaOf(input.plot),
    farRule: bandSource('far.max'),
    towerPlate: envelope.towerPlateCap,
    levels: capacity.levels,
    residentialLevelIds: building.levels
      .filter((l) => l.placed && !isParking(l.use))
      .map((l) => l.id),
    parkingInFar: input.parkingInFar,
    parkingArea: parking.requiredAreaM2,
    parkingLevelIds: building.levels.filter((l) => isParking(l.use)).map((l) => l.id),
    governingGfa: capacity.governingGfa,
    partFloorNotPlacedM2: capacity.integerGranularityLossM2,
    ...(schedule && !schedule.groundIsParking ? { groundStatedNotParking: true } : {}),
  });

  /*
    THE LEVEL SCHEDULE, FROM THE MODEL. What each drawn level counts, so INV-01,
    INV-11 and INV-18 can hold the capacity figure to the building the drawings
    stand rather than stay dormant. See `level-areas.ts`.
  */
  const levelAreas = levelAreasOf({
    tracer,
    building,
    towerPlate: envelope.towerPlateCap,
    floorToFloorM: envelope.floorToFloorM,
    parkingInFar: input.parkingInFar,
    parkingArea: parking.requiredAreaM2,
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
    unitSchedule: atGoverning.schedule,
    floorAreaLevels,
    levelsAboveGround: capacity.levelsAboveGround,
    levelAreas,
    saleableEfficiency: efficiencyTraced,
    saleableAreaM2: saleableAreaTraced,
    saleableAreaAtGoverningM2: saleableAtGoverning,
    parkingInFarTreatment: treatmentTraced,
    levelSchedule: schedule
      ? { schedule, code: levelCode(schedule, massing.towerLevels.value) }
      : null,
    core: {
      areaM2: core.areaM2,
      plateShare: core.plateShare,
      placement: core.placement,
      reconciliation: coreReconciliation,
    },
    levelPlan,
    levelPlanRefusal,
    massing,
    building,
    gfaStatement,
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
  /**
   * The perturbed input.
   *
   * `base` is the run as computed, because an ASSUMED value is by definition
   * not in the input — the engine put it there. Moving it 10% means moving the
   * number the engine chose, and the output is the only place that number is.
   */
  readonly apply: (input: RunInput, factor: Decimal, base: RunOutput) => RunInput;
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
    /*
      The core moves no capacity figure, by construction — it is inside GFA and
      inside the saleable efficiency. Perturbing it anyway produces a MEASURED
      zero, which is a far more useful row in the register than the `null` an
      unperturbable assumption gets: "we moved it 10% and the answer did not
      change" is an answer; "not measured" is not.
    */
    parameterId: 'building.core_area_m2',
    apply: (input, factor, base) => ({
      ...input,
      // From the output, not the input: unstated, the area the run used is the
      // one `solveCore` assumed, and the input holds nothing at all.
      coreAreaM2: base.core.areaM2.value.times(factor),
    }),
  },
  {
    /* Clamped at 1 for the reason the usable fraction is: a building cannot sell
       more than it has. Only an ASSUMED share reaches the register at all. */
    parameterId: 'capacity.saleable_efficiency',
    apply: (input, factor) =>
      input.saleableEfficiency.value === undefined
        ? input
        : {
            ...input,
            saleableEfficiency: {
              ...input.saleableEfficiency,
              value: Decimal.min(new Decimal(1), input.saleableEfficiency.value.times(factor)),
            },
          },
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
      const low = safeGoverning(spec.apply(input, new Decimal('0.9'), output));
      const high = safeGoverning(spec.apply(input, new Decimal('1.1'), output));
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
