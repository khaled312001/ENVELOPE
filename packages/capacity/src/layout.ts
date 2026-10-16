/**
 * Parking layout — bays, aisles and the ramp, placed rather than counted.
 *
 * This exists because of one sentence in the 30 Aug 2026 meeting. Asked what
 * would make the tool worth having, the client did not say massing or FAR:
 *
 *   "لو عارف يفهم إزاي يحط الباركينج صح، وتوزيعته صح، والرامب بتاعي ماشي صح —
 *    أنا كده حلّصت 3-4 شهور."
 *
 * Getting the parking layout right saves him three to four months per scheme.
 * Everything else in the capacity engine answers *how many* bays; this answers
 * *where they go*, which is the question that actually consumes the time —
 * because a bay count that cannot be laid out is not a bay count, it is a wish.
 *
 * ---
 *
 * **The module is the unit of design, not the bay.** Parking is laid out in
 * double-loaded modules: a run of bays, a drive aisle, another run of bays
 * facing it. For 90° two-way parking under Table B.11 that is
 * `5.5 + 6.0 + 5.5 = 17.0 m`. Packing bays individually into a footprint
 * produces arrangements no car can reach; packing modules produces the
 * arrangement every parking level in Dubai actually uses — and the one visible
 * in the client's own AutoCAD drawings, labelled "6.00M WIDE 2 WAY DRIVEWAY".
 *
 * **Every module aisle is connected to the way in.** Modules stacked up the
 * level do not touch one another — between the aisle of module 1 and the aisle
 * of module 2 stand eleven metres of parked cars — so a **cross aisle** runs the
 * packed depth down one side and joins them all to the ramp, or to the slab edge
 * where the driveway lands. It costs a bay run of width and that cost is
 * reported, never absorbed: before it existed, every bay in the third module was
 * counted, drawn, exported and stood up in 3D with no way for a car to reach it.
 * `circulation.ts` carries the argument and the graph; `losses` carries the
 * price.
 *
 * **Two orientations are tried, and that is a sweep, not a search.** Modules
 * running along the level's width and modules running along its depth place
 * different numbers of bays in the same rectangle, and the difference is often a
 * whole run. Both are packed and the better is taken. This searches an
 * *orientation*, not a design: there are exactly two candidates, they are both
 * reported, and the answer is reproducible. It is emphatically not the optimiser
 * of 34:37 — that searches ramp and core *positions* for maximum yield, is a
 * `TRADEOFF` value, and `PHASE_0_CLASSES` refuses to emit one by construction.
 *
 * **The scope is honest about its shape.** Axis-aligned rectangular footprints
 * only. PRD §14.1 already restricts Phase 0 to rectilinear and simple convex
 * plots, and a podium slab is very nearly always a rectangle. A layout engine
 * that pretended to handle arbitrary polygons would be producing plausible
 * arrangements nobody had checked, which is the failure this codebase refuses
 * everywhere else. Non-rectangular footprints are rejected, not approximated.
 */

import {
  Decimal,
  parkingLevels,
  qArea,
  type Actor,
  type Citation,
  type LevelSchedule,
  type Traced,
  type TracedDecimal,
  type Tracer,
} from '@envelope/core';

import {
  bayIsServed,
  openingM,
  servingNode,
  traceCirculation,
  type CircRect,
} from './circulation.js';
import {
  MAX_PARKED_SLOPE,
  rampHeadroom,
  slopedFloorGradient,
  straightRampRequirement,
  type RampHeadroom,
} from './ramp-rules.js';
import {
  bandIntervals,
  intersectIntervals,
  subtractIntervals,
  type Interval,
  type XY,
} from './scanline.js';

// ---------------------------------------------------------------------------
// Rule data — Dubai Building Code Table B.11
// ---------------------------------------------------------------------------

/**
 * The citation every dimension below carries.
 *
 * `sourceBbox` is the table's block on the page. It is coarse — the table, not
 * the cell — and that is stated rather than faked: a bbox claiming cell-level
 * precision it does not have would make the highlight lie.
 */
export const TABLE_B11: Citation = {
  instrumentId: 'DUBAI_BUILDING_CODE',
  instrumentVersion: '2021',
  clauseReference: 'B.7.2.4 Table B.11 — Minimum dimensions for parking',
  documentUri: 'docs/00-source/regulations/Dubai Building Code_English_2021 Edition_compressed.pdf',
  sourcePage: 86,
  sourceBbox: [0, 0, 842, 595],
  sourceTextVerbatim:
    'The dimension of car parking bays and driveways shall be not less than the ' +
    'minimum values given in Table B.11.',
};

export const ParkingAngle = {
  PARALLEL: 'PARALLEL',
  DEG_45: 'DEG_45',
  DEG_60: 'DEG_60',
  DEG_75: 'DEG_75',
  DEG_90: 'DEG_90',
} as const;
export type ParkingAngle = (typeof ParkingAngle)[keyof typeof ParkingAngle];

export const DrivewayType = { ONE_WAY: 'ONE_WAY', TWO_WAY: 'TWO_WAY' } as const;
export type DrivewayType = (typeof DrivewayType)[keyof typeof DrivewayType];

export interface BayStandard {
  readonly angle: ParkingAngle;
  readonly driveway: DrivewayType;
  readonly bayWidthM: string;
  readonly bayLengthM: string;
  readonly drivewayWidthM: string;
}

/** Table B.11, transcribed. Minimums — never to be rounded down. */
export const BAY_STANDARDS: readonly BayStandard[] = [
  { angle: 'PARALLEL', driveway: 'ONE_WAY', bayWidthM: '2.5', bayLengthM: '6', drivewayWidthM: '3' },
  { angle: 'DEG_45', driveway: 'ONE_WAY', bayWidthM: '2.5', bayLengthM: '5.5', drivewayWidthM: '3.3' },
  { angle: 'DEG_60', driveway: 'ONE_WAY', bayWidthM: '2.5', bayLengthM: '5.5', drivewayWidthM: '3.8' },
  { angle: 'DEG_75', driveway: 'ONE_WAY', bayWidthM: '2.5', bayLengthM: '5.5', drivewayWidthM: '5.5' },
  { angle: 'DEG_90', driveway: 'ONE_WAY', bayWidthM: '2.5', bayLengthM: '5.5', drivewayWidthM: '5.5' },
  { angle: 'DEG_90', driveway: 'TWO_WAY', bayWidthM: '2.5', bayLengthM: '5.5', drivewayWidthM: '6' },
];

/**
 * Extra width for a bay against a wall or column — Table B.11's closing note:
 * "bays bounded by building structural elements or walls shall have an
 * additional space of 300 mm from the structural element".
 *
 * It is 300 mm per obstructed side, and it is why the figures show 2.8 m rather
 * than 2.5 m for bays "bounded by structural elements". Ignoring it is the most
 * common way a paper bay count exceeds the buildable one.
 */
export const STRUCTURAL_CLEARANCE_M = '0.3';

export function standardFor(angle: ParkingAngle, driveway: DrivewayType): BayStandard {
  const found = BAY_STANDARDS.find((s) => s.angle === angle && s.driveway === driveway);
  if (!found) {
    throw new ParkingLayoutError(
      `Table B.11 gives no dimensions for ${angle} parking on a ${driveway} driveway. ` +
        `The combination is not in the code, so no bay size can be cited for it.`,
    );
  }
  return found;
}

export class ParkingLayoutError extends Error {
  override readonly name: string = 'ParkingLayoutError';
}

/**
 * A picked arrangement this level cannot lay out. A refused request, not a
 * finding about the plot, so the pipeline blocks the run with it — as a refused
 * entrance does — instead of drawing another arrangement nobody picked.
 */
export class ArrangementChoiceRefusedError extends ParkingLayoutError {
  override readonly name = 'ArrangementChoiceRefusedError';
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/** An axis-aligned rectangle in metres, origin at the footprint's lower-left. */
export interface Rect {
  readonly x: Decimal;
  readonly y: Decimal;
  readonly width: Decimal;
  readonly height: Decimal;
}

export const RectKind = {
  BAY: 'BAY',
  ACCESSIBLE_BAY: 'ACCESSIBLE_BAY',
  /**
   * The 1.2 m (or wider) aisle beside an accessible bay, C.6.4.2 f). Never placed
   * by a packer: `accessible.ts` makes one out of a bay on the level nearest the
   * street, so it never appears in the shared layout.
   */
  ACCESS_AISLE: 'ACCESS_AISLE',
  AISLE: 'AISLE',
  RAMP: 'RAMP',
  OBSTRUCTION: 'OBSTRUCTION',
} as const;
export type RectKind = (typeof RectKind)[keyof typeof RectKind];

/** The row a cross aisle carries: it serves every module rather than one. */
export const CROSS_AISLE_ROW = -2;
/** The row the ramp strip carries. */
export const RAMP_ROW = -1;
/** The row the perimeter arrangement's ring aisle carries. */
export const RING_AISLE_ROW = -3;
/** The row the drive that crosses the bay run to reach the ring carries. */
export const ENTRY_DRIVE_ROW = -4;

export interface PlacedRect extends Rect {
  readonly kind: RectKind;
  /** Row index, so a reviewer can talk about "the third module". */
  readonly row: number;
}

/**
 * What the level cost, in three separate figures.
 *
 * Never one blended efficiency. "84% efficient" is a score a reader stops at;
 * "the reserved zone cost 21 bays, the cross aisle cost 12, and the corner the
 * rectangle could not reach cost 6" is three different problems with three
 * different answers, and only the second one is this module's to argue about.
 */
export interface ParkingLosses {
  /**
   * What one more bay costs in level area, at the margin: half a module's depth
   * times one bay's charged width. The right divisor for "how many bays did
   * that area cost", and independent of the count it is used to explain.
   */
  readonly marginalAreaPerBayM2: Decimal;
  /** Cores, plant and the ramp landing — the deduction, before a bay is placed. */
  readonly reserved: { readonly areaM2: Decimal; readonly bays: number };
  /** The cross aisle that joins every run to the way in, and anything stranded. */
  readonly circulation: {
    readonly areaM2: Decimal;
    readonly bays: number;
    readonly strandedBays: number;
  };
}

export interface ParkingLayoutInput {
  readonly tracer: Tracer;
  /** Usable footprint of one level, metres. Rectangular — see the module note. */
  readonly footprint: { readonly widthM: Decimal; readonly depthM: Decimal };
  readonly angle?: ParkingAngle;
  readonly driveway?: DrivewayType;
  /**
   * Structural grid, metres. The Azizi standards ship prototypes at 6.5, 6.7,
   * 8.0, 8.6 and 8.7 m for a reason: at 8.0 m a bay run of three 2.5 m bays plus
   * a 400 mm column lands almost exactly on grid. Supplying it lets the layout
   * charge the structural clearance where columns actually fall.
   */
  readonly structuralGridM?: Decimal;
  /**
   * A clear gap left between every `everyBays` bays along a run, where the
   * columns stand — Eng. Mohamed's half metre every three bays (16 Oct 2026).
   * Traced by the caller, `USER_SET` under his statement. The gap is left empty:
   * no column is placed in it and none is sized.
   *
   * Not with `structuralGridM`, which charges the columns as a wider bay: the two
   * are two models of the same columns, and a level given both is refused.
   */
  readonly columnGap?: { readonly everyBays: number; readonly gapM: TracedDecimal };
  /**
   * Area removed before layout for cores, plant, ramp landing and circulation
   * that is not drive aisle. Never defaulted silently — see the constructor.
   */
  readonly deductions?: {
    readonly areaM2: Decimal;
    readonly source: 'USER_SET' | 'ASSUMED';
    readonly basis?: string;
    readonly actor?: { readonly id: string; readonly name: string };
  };
  /**
   * The deduction, already traced by the caller.
   *
   * When the deduction is not a free-standing assumption but a consequence of
   * something the run already established — the parking usable fraction, say —
   * re-declaring it here would mint a second node for one fact and let the two
   * disagree about their provenance class. Supplying the node instead keeps the
   * derivation intact: the deduction inherits the class of whatever it came
   * from, including `DERIVED` when a cited rule reached it, which the
   * `USER_SET | ASSUMED` pair above cannot express.
   *
   * Exactly one of this and `deductions` must be supplied.
   */
  readonly deductionsTraced?: TracedDecimal;
  /** Include a ramp in this level's layout. A basement below grade needs one. */
  readonly includeRamp?: boolean;
  /**
   * What the ramp serves, and what kind of ramp it is.
   *
   * WITHOUT IT THE DIRECTION IS NOT ESTABLISHED, AND THE RESULT SAYS SO rather
   * than falling back on the `+1` that was there before. That is the whole point
   * of this field: the old behaviour was not a default anybody had chosen, it was
   * the absence of a decision, and an absence cannot be rendered amber. A run
   * that does not supply this gets `ramp.runs === undefined` and a note in
   * `notes` naming what is missing — never a direction nobody derived.
   *
   * The schedule is the caller's: stated by a named person, or the one the run
   * inferred. See {@link RampRunInput.schedule} and {@link ASSUMED_BASEMENTS}.
   */
  readonly rampPlan?: {
    readonly schedule: LevelSchedule;
    readonly actor?: Actor;
    readonly type?: RampType;
  };
  /**
   * A ramp arrangement stated where no schedule reached the layout. The
   * schedule's own `type` wins where both are given.
   */
  readonly rampType?: RampType;
  /** Who stated `rampType`, so it is `USER_SET` under a name and not an assumption. */
  readonly rampTypeActor?: Actor;
  /**
   * The arrangement a reader picked from `ParkingLayoutResult.arrangements`. Absent,
   * the one placing the most bays is laid out, as it always was. Stated, that one
   * is laid out, or the level is refused in a sentence when it places nothing or
   * is not on this level's list — never quietly swapped for another.
   */
  readonly arrangement?: { readonly id: ParkingArrangement; readonly actor?: Actor };
  /**
   * Whether the ring may be the ramp. False where there is one parking level: a
   * floor that climbs a storey a lap has to have a storey to climb to.
   */
  readonly slopedRing?: boolean;
  /**
   * The core, where it stands on this level, in the footprint's local metres —
   * x along the width, y along the depth.
   *
   * IT USED TO BE DRAWN OVER BAYS THAT WERE COUNTED. The deduction reserved a
   * strip at the far edge "for cores and plant", the core was placed at the
   * centre of the tower, and every bay under it stayed in the count. Now a bay
   * it covers is not placed, an aisle it crosses is cut where it stands, and a
   * bay that cut leaves without a way in is dropped by the circulation check like
   * any other. Its area comes off the reserved strip, which would otherwise
   * deduct the core a second time.
   */
  readonly core?: { readonly rect: Rect; readonly areaM2: TracedDecimal };
  /**
   * One storey, metres — what a ramp climbs. The pipeline passes the envelope's
   * floor-to-floor, derived from the governing rule. Absent: an assumption.
   */
  readonly storeyHeightM?: TracedDecimal;
  /**
   * The whole setback-permitted footprint, when `footprint` is only the largest
   * rectangle inside it: its outline in the same local frame, millimetres; its
   * area; and the deduction taken over that area rather than the rectangle's.
   * Supplied, it adds the arrangement that lays rows across all of it
   * (`packField`). Absent on a rectangular plot, where the two are one.
   */
  readonly field?: {
    readonly polygonMm: readonly XY[];
    readonly grossAreaM2: Decimal;
    readonly deductionsTraced: TracedDecimal;
  };
}

export interface ParkingLayoutResult {
  readonly rects: readonly PlacedRect[];
  readonly bayCount: Traced<number>;
  /** Gross level area consumed per bay — the number Annexure A targets at 37.5. */
  readonly areaPerBayM2: TracedDecimal;
  readonly moduleDepthM: TracedDecimal;
  readonly usableAreaM2: TracedDecimal;
  readonly standard: BayStandard;
  /**
   * Which way the modules were laid, and what each way placed.
   *
   * Two candidates, both packed, the better taken. Reported because a reader who
   * disagrees with the arrangement deserves to know the other one was tried and
   * what it came to.
   */
  readonly orientation: Traced<string>;
  /** The arrangement laid out. */
  readonly arrangement: ParkingArrangement;
  /** Every arrangement packed on this level, in a fixed order, with its count — the options a reader picks from. */
  readonly arrangements: readonly ArrangementCandidate[];
  readonly losses: ParkingLosses;
  /**
   * The ramp strip's plan size, its kind and which way it runs, when the level
   * reserves a strip.
   *
   * The width and the run were constants in this file with no derivation — a
   * 6 m × 30 m strip that moved the bay count by a whole run of bays, and nothing
   * a reader could open to ask why 30. They are assumptions and are declared as
   * such. The **direction** was worse than a constant: it was not a value at all.
   * See the section above `RampDirection`.
   */
  readonly ramp:
    | {
        readonly widthM: TracedDecimal;
        readonly runM: TracedDecimal;
        /** The main run's slope — Table B.9's 12%, by construction. */
        readonly slopePct: TracedDecimal;
        /** Straight, split or turning. `USER_SET` where chosen, else `ASSUMED`. */
        readonly type: Traced<RampType>;
        /**
         * Every enumerated type, reported whether or not it was chosen — the same
         * discipline the orientation sweep follows. A reader who disagrees with
         * the arrangement deserves to see what else was on the list, including
         * the one the engine refuses to place and why.
         */
        readonly candidates: readonly RampTypeSpec[];
        /**
         * One entry per ramp in the scheme, each with a traced direction, or
         * `undefined` when no level schedule reached the layout.
         *
         * `undefined` is a reported state, not an empty answer: `notes` names it.
         * An empty array means something else entirely and is a legitimate answer
         * — a scheme whose only parking is the ground floor, reached by the
         * driveway, has a reserved strip and no ramp to run up it.
         */
        readonly runs: readonly RampRun[] | undefined;
      }
    | undefined;
  /**
   * Where the ring aisle itself is the ramp — the client's sloped floor — its lap
   * and gradient, checked against B.7.2.3.1's 4%. `ramp` is then undefined: there
   * is no strip, and the runs are `rampRuns`.
   */
  /**
   * Table B.9's clear height over a ramp, as the structural depth it leaves:
   * the ramps are stacked one storey apart. Absent where no ramp is drawn.
   */
  readonly headroom?: RampHeadroom;
  readonly slopedFloor?: {
    readonly lapM: Decimal;
    readonly gradientPct: TracedDecimal;
    readonly runs: readonly RampRun[] | undefined;
  };
  /**
   * The strip the deduction was taken from, in the same local metres as `rects`:
   * the full width, at the far end of the depth. Undefined when nothing was
   * deducted. It is where the cores and plant are *allowed* to be on this
   * drawing, not where anyone put them.
   */
  readonly reserved: Rect | undefined;
  /** Every piece the reserved area is drawn in, `reserved` among them. */
  readonly reservedPieces: readonly Rect[];
  /**
   * The area of that strip, traced: the deduction, less the core when the core
   * stands where it is drawn. The deduction itself when no core was given.
   */
  readonly reservedAreaM2: TracedDecimal;
  /**
   * The deduction the winning arrangement was charged: the rectangle's, or the
   * whole footprint's where the rows run across all of it.
   */
  readonly deductionsM2: TracedDecimal;
  /** Whether the winning arrangement covers the whole footprint (`packField`). */
  readonly wholeFootprint: boolean;
  /** Bays the core covers, which were not placed. Zero when no core was given. */
  readonly baysUnderCore: number;
  /** Rows that came out partial, and why. Reported, not hidden. */
  readonly notes: readonly string[];
}

/**
 * Ramp geometry is `ramp-rules.ts`: DBC B.7.2.2 Tables B.9 and B.10, encoded on
 * 15 Oct 2026. It used to be a 6 × 30 m assumption here, clipped to whatever
 * room was left — which is how 49% and 23% ramps reached the drawings.
 *
 * Where nothing hands the layout a storey height (a direct caller; the pipeline
 * always does), the ramp is sized for the draft residential floor-to-floor and
 * that is declared as an assumption.
 */
const ASSUMED_STOREY_M = '3.2';
const ASSUMED_STOREY_BASIS =
  'No storey height reached the parking layout, so the ramp is sized to climb 3.20 m — ' +
  'the residential floor-to-floor of the draft rule set (R-FLOOR-TO-FLOOR-RES). A run ' +
  'passes its own figure, derived from the governing rule, and this is never used there.';

// ---------------------------------------------------------------------------
// Which way the ramp runs — the sign, and where the sign comes from
// ---------------------------------------------------------------------------

/**
 * THE RAMP'S LEVEL DELTA WAS A CONSTANT, AND THE CONSTANT WAS POSITIVE.
 *
 * Eng. Mohamed found it by driving the 3D view himself, 4 Oct 2026:
 *
 *   "العربية لو دخلت من هنا هتمشي وبعد كده الرامب هنا — شايفه؟ طلع لفوق. فهي غلط."
 *                                                                 — 40:11–40:20
 *
 * He is right, and the sign was not merely wrong — it was *nowhere*. Three
 * places each held a fragment of it and none of them held a value:
 *
 * - `level-plan.ts` made `foot` the packing rectangle's origin-side edge and
 *   `head` the far one, unconditionally, and wrote the commitment down in a doc
 *   comment: *"the ramp is taken to climb away from the origin"*;
 * - `buildBuildingModel` paired `foot` with the LOWER of two consecutive parking
 *   levels and `head` with the upper, also unconditionally, so every ramp in
 *   every model climbed away from that origin;
 * - and `building.ts`'s own header said the direction was *"part of the ramp-run
 *   assumption in `layout.ts`"* — while this file traced a width and a run and
 *   said nothing whatever about direction. The assumption it pointed at did not
 *   exist. There was no node to open, no basis to read and no class to render
 *   amber, which is the precise shape of failure "no hidden defaults" exists to
 *   catch: there was no `+1` anywhere to argue with.
 *
 * **What that actually produces, measured rather than asserted.** Run the
 * pipeline on the same 80 × 40 m plot twice — once as two basements over a
 * parking ground floor, once as a parking ground floor under one podium parking
 * level — and the ramps come out with *identical* geometry: foot at y = 35.130 m,
 * head at y = 9.409 m, delta `+1` storey, while the vehicle entry sits at y = 0.
 * **Two different buildings, one drawing.** Whether that drawing happens to be
 * right is decided by where `largestInscribedRectangle` put its origin relative
 * to where `access.ts` put the driveway, and those two have nothing to do with
 * each other. He reported a ramp rising where it had to fall; the engine had no
 * way to be right on purpose.
 *
 * The same run also draws every ramp in a stack as the same rectangle sloping the
 * same way, so a car coming down from grade lands at the far end of the next ramp
 * down and has to drive the length of the strip back to reach it. The ramps do
 * not meet.
 *
 * It survived because it moves no number: `pnpm parity` counts cars against the
 * engine's own figure and `pnpm dxf` checks ramp heights against the engine's own
 * figure, and the engine's own figure carried the wrong sign in both. **A gate
 * that compares the renderers to the engine cannot see a defect the engine is the
 * source of** — which is why the fix is a value with a class and a basis, and why
 * `test/ramp-direction.test.ts` asserts the sign and never its magnitude. A test
 * written `expect(Math.abs(delta)).toBe(1)` passes on the defect.
 *
 * ---
 *
 * **The sign is a function of one signed integer, and that integer comes from
 * the schedule.** Grade is the datum — Eng. Mohamed asked for exactly that at
 * 25:01–25:28 (*"خلّي الأساس بتاعك هو الأرض"*) — so a parking level carries a
 * signed storey index: basements negative, the ground floor zero, podium parking
 * positive. A car enters at grade. Therefore a ramp reaching a level below grade
 * **descends** and one reaching a level above grade **climbs**, and a scheme with
 * both gets both answers because the answer is resolved per level rather than per
 * run.
 *
 * **A ramp is identified by the level it serves, not by a pair of levels.** The
 * old model made one ramp per *consecutive pair* of parking levels, and that has
 * two consequences it never admitted. The ramp from the street down to the first
 * basement is not modelled at all — `buildBuildingModel` says so in
 * `notModelled`, and it is the one ramp a driver meets first. And a scheme with
 * basements and podium parking over a non-parking ground floor produces a single
 * "ramp" from B1 to P1 straight through the ground floor, which no sign can
 * describe at all, because a car leaving grade descends to one of them and climbs
 * to the other.
 *
 * Keyed on the level served, every parking level except the ground floor has
 * exactly one ramp reaching it from the level one step nearer grade; every one of
 * them has an unambiguous direction; and the ramp off the street exists.
 */

export const RampDirection = {
  /** Toward a level below grade. A car leaving the entry goes down. */
  DESCENDS: 'DESCENDS',
  /** Toward a level above grade. A car leaving the entry goes up. */
  CLIMBS: 'CLIMBS',
} as const;
export type RampDirection = (typeof RampDirection)[keyof typeof RampDirection];

/**
 * The level delta: storeys from the level the ramp leaves to the level it
 * reaches. `−1` for a ramp to a basement, `+1` for one to a podium parking level.
 *
 * **This is the number that was hardcoded `+1`, and it is deliberately NOT
 * expressed against the drawing.** The first version of this function said
 * "storeys gained from the strip's origin-side edge to its far edge", which reads
 * as the geometric fact a renderer wants and is not derivable from a schedule at
 * all: the origin is wherever `largestInscribedRectangle` put it, and it bears no
 * relation to the way onto the level. Measured on an 80 × 40 m plot, a two-
 * basement scheme and a podium-parking scheme produce ramps with *identical*
 * foot and head coordinates — foot at y = 35.130 m, head at y = 9.409 m — while
 * the vehicle entry sits at y = 0. Two different buildings, one drawing. Which
 * physical end of the strip is the high end therefore depends on where the
 * driveway lands, which is `access.ts`'s answer and not this module's; what this
 * module can answer, from the schedule and nothing else, is the signed delta.
 *
 * It is a total function of the direction rather than a field beside it. The two
 * express one fact, and a field could disagree with the direction it is supposed
 * to follow — the same reason `deductionsTraced` exists rather than a second
 * declaration of the deduction.
 */
export function storeyDelta(direction: RampDirection): -1 | 1 {
  return direction === RampDirection.CLIMBS ? 1 : -1;
}

/**
 * Which way a ramp reaching `servedStorey` runs, or `null` at grade.
 *
 * `null` is not a failure and must not be treated as one: the ground floor is
 * reached by the driveway off the street, so no ramp serves it. Returning
 * `CLIMBS` for it — the shape the old constant had — would put a ramp on the
 * level that carries the vehicle entrance.
 */
export function rampDirectionToStorey(servedStorey: number): RampDirection | null {
  if (!Number.isInteger(servedStorey)) {
    throw new ParkingLayoutError(
      `a storey index must be a whole number; got ${servedStorey}. Grade is 0, ` +
        'basements are negative and podium levels positive — a fractional level is ' +
        'not a level.',
    );
  }
  if (servedStorey === 0) return null;
  return servedStorey < 0 ? RampDirection.DESCENDS : RampDirection.CLIMBS;
}

/**
 * The basement count when nobody has stated one. Zero, and said so.
 *
 * Eng. Mohamed, 25:01–25:28: *"البيزمنت مش دايماً، أو نادراً أصلاً تلاقي فيها
 * بيزمنت. فدايماً اعملها رقم 0، وخلّي الأساس بتاعك هو الأرض … وبعد كده البوديوم،
 * وبعد كده لو فيه بيزمنت هيكتب لك."*
 *
 * **A zero the user did not type is still a filled gap.** So this is not a silent
 * default: it is an `ASSUMED` value with the basis below, amber on screen and
 * listed in the register, exactly like every other filled gap here. And it stays
 * `ASSUMED` rather than becoming `USER_SET` when the engine applies it on its
 * own — his sentence is a `PracticeStatement`, which this codebase serves with a
 * button and never pre-selects, because a pre-selected statement is the default
 * `FR-DEF-002` forbids wearing somebody else's name.
 */
export const ASSUMED_BASEMENTS = 0;

export const ASSUMED_BASEMENTS_BASIS =
  'Basements are rare on Dubai plots and the affection plan does not state one, so ' +
  'the schedule starts at grade: ground, then podium, and a basement only where it ' +
  'is entered — Mohamed Amin, 4 Oct 2026. It is his practice, not a regulation: no ' +
  'instrument states it and it never becomes DERIVED. Entering a basement count ' +
  'replaces this with that figure, USER_SET.';

const RAMP_DIRECTION_BASIS =
  'Which way a ramp runs follows from where the parking sits, and no instrument ' +
  'states either. Grade is the datum, so a ramp reaching a level below it descends ' +
  'and one reaching a level above it climbs. Nobody entered a level schedule for ' +
  'this run, so the schedule the direction was read off is itself assumed. Entering ' +
  'one makes the direction USER_SET by whoever entered it. Reversing the direction ' +
  'moves NO capacity figure — the measured effect on the bay count is zero, which ' +
  'is why a wrong sign survived every gate — and it changes every drawing, the DXF ' +
  'included.';

/**
 * One ramp: the level it reaches, the level it leaves, and which way it runs.
 *
 * Levels are named by **signed storey index**, not by id. `buildBuildingModel`
 * builds the ids (`B2, B1, G, P1, L03`) and they are DXF layer names; a second
 * builder here would be the `L00` defect over again — one name meaning different
 * levels in two files. The index is unambiguous and it is already the loop
 * variable the stack is built on, so the two cannot drift.
 */
export interface RampRun {
  /**
   * The parking level this ramp reaches. Never 0: the ground floor is reached by
   * the driveway, so no ramp serves it.
   */
  readonly servedStorey: number;
  /** The level it leaves — one step nearer grade, and `0` for the entry ramp. */
  readonly fromStorey: number;
  readonly direction: Traced<RampDirection>;
  /** `+1` or `−1`. See {@link storeyDelta}: the sign that was hardcoded `+1`. */
  readonly storeyDelta: -1 | 1;
}

export interface RampRunInput {
  readonly tracer: Tracer;
  /**
   * The schedule the directions are read off.
   *
   * Which schedule it is, is the caller's responsibility and not this module's:
   * where the run states one it is that, and where it does not the caller passes
   * the one it inferred — built on {@link ASSUMED_BASEMENTS}, which is where the
   * zero and its basis live. Inferring a schedule here as well would put that
   * arithmetic in two files and let them disagree about the same building.
   */
  readonly schedule: LevelSchedule;
  /**
   * Who stated the schedule.
   *
   * Present: the directions are `USER_SET`, because a person answered the
   * question the direction depends on. Absent: nobody did, so they are `ASSUMED`
   * with a basis. The class is not decoration here — it is the difference
   * between a drawing that shows what somebody said and one that shows what the
   * engine guessed, and amber is the only thing that tells the two apart.
   */
  readonly actor?: Actor;
}

/**
 * Resolve every ramp in the scheme, each with a traced direction.
 *
 * One per parking level except the ground floor. Ordered from the lowest level
 * served to the highest, so a reader walks the stack the way a section draws it.
 */
export function resolveRampRuns(input: RampRunInput): readonly RampRun[] {
  const { tracer, schedule } = input;
  const whole = (n: number): boolean => Number.isInteger(n) && n >= 0;
  if (!whole(schedule.basements) || !whole(schedule.podiumParkingLevels)) {
    throw new ParkingLayoutError(
      'a level schedule states whole, non-negative counts of basements and podium ' +
        `parking levels; got ${schedule.basements} and ${schedule.podiumParkingLevels}. ` +
        'A schedule that does not describe a building is refused rather than rounded: ' +
        'rounding answers a question about the building that whoever filled the form ' +
        'got wrong.',
    );
  }

  /*
    ONE NODE PER FACT, AND TWO FACTS. A descending ramp exists because somebody
    said how many basements there are; a climbing one exists because somebody said
    how many podium levels hold parking. They are different answers and they can
    have different classes — a stated podium count beside an assumed basement
    count is an ordinary run — so each direction `uses` the count that put it
    there, and the class propagates per ramp. Collapsing them into one node would
    make a run with both carry one class for two answers, which is the collapse
    the brief for this fix names: "do not collapse that into one sign".
  */
  const countNode = (parameterId: string, value: number, label: string, basis: string): Traced<number> =>
    input.actor
      ? tracer.userSet(parameterId, value, { actor: input.actor, label, unit: 'levels' })
      : tracer.assumed(parameterId, value, { basis, label, unit: 'levels' });

  const runs: RampRun[] = [];

  if (schedule.basements > 0) {
    const basements = countNode(
      'parking.basement_levels',
      schedule.basements,
      'levels of parking below grade',
      ASSUMED_BASEMENTS_BASIS,
    );
    for (let n = -schedule.basements; n <= -1; n += 1) {
      runs.push(rampRun(tracer, n, basements));
    }
  }

  if (schedule.podiumParkingLevels > 0) {
    const podium = countNode(
      'parking.podium_parking_levels',
      schedule.podiumParkingLevels,
      'podium levels holding parking',
      RAMP_DIRECTION_BASIS,
    );
    for (let n = 1; n <= schedule.podiumParkingLevels; n += 1) {
      runs.push(rampRun(tracer, n, podium));
    }
  }

  /*
    A CHECK AGAINST `levels.ts`'S OWN ARITHMETIC, not against a recount of it.
    Every parking level needs a ramp except the ground floor, which the driveway
    serves. If that stops holding, `parkingLevels` has changed meaning and this
    module is drawing a stack the rest of the engine does not have.
  */
  const expected = parkingLevels(schedule) - (schedule.groundIsParking ? 1 : 0);
  if (runs.length !== expected) {
    throw new ParkingLayoutError(
      `${runs.length} ramp(s) were resolved for a schedule with ${expected} parking ` +
        'level(s) that a ramp has to reach. Every parking level but the ground floor ' +
        'is reached by one ramp; the ground floor is reached by the driveway.',
    );
  }
  return runs;
}

function rampRun(tracer: Tracer, servedStorey: number, from: Traced<number>): RampRun {
  const direction = rampDirectionToStorey(servedStorey);
  if (direction === null) {
    // Unreachable by construction — the loops above never emit 0 — and asserted
    // rather than assumed, because a ramp onto the level holding the vehicle
    // entrance is the defect this whole section exists to remove.
    throw new ParkingLayoutError(
      'no ramp serves the ground floor: it is reached by the driveway off the street.',
    );
  }
  const below = servedStorey < 0;
  const depth = Math.abs(servedStorey);
  const fromStorey = below ? servedStorey + 1 : servedStorey - 1;
  const traced = tracer.computed('parking.ramp_direction', direction, {
    formula:
      `the level this ramp serves is ${depth} level(s) ` +
      `${below ? 'below' : 'above'} the entry at grade, so a car leaving the entry ` +
      `${below ? 'descends' : 'climbs'}: ${storeyDelta(direction)} storey`,
    uses: { levels: from },
    detail: {
      servedStorey,
      fromStorey,
      storeyDelta: storeyDelta(direction),
      note:
        'Grade is the datum and a car enters at grade. The old model emitted ' +
        '+1 storey on every ramp in every scheme, so a basement ramp climbed away ' +
        'from the entry — in the 3D view, on the A3 sheets, and in the DXF.',
    },
  });
  return {
    servedStorey,
    fromStorey,
    direction: traced,
    storeyDelta: storeyDelta(direction),
  };
}

// ---------------------------------------------------------------------------
// Ramp types — enumerated, all reported, one of them refused by name
// ---------------------------------------------------------------------------

/**
 * The ramp arrangements, as Eng. Mohamed enumerated them, 25:57–27:23:
 *
 *   *"ممكن يبقى فيه كذا رسمة للرامب، مش ستريت … هنا مدخل وهنا مخرج، فبيكون 3 متر
 *    و 3 … فيه كذا نوع لفكرة الرامب نفسه. عايز تعمل لي الأنواع نفسها، وكمان أحسن
 *    نوع لكل حالة — اللي هو الـ best case."*
 *
 * Two of the three things in that sentence are buildable and the third is not.
 * The types are a list with dimensions: buildable, and below. **"Best case" read
 * as searching ramp position for maximum yield is the optimiser of meeting 02's
 * 34:37, a `TRADEOFF` value, and `PHASE_0_CLASSES` refuses to emit one by
 * construction.** It is wanted, it is out of scope, and the refusal is the design.
 *
 * **Nor does this engine rank straight against split.** They occupy the same
 * 6.00 m of width over the same run, so no bay count tells them apart; what tells
 * them apart is turning radius and headroom, which is B.7.2.2, which is not
 * encoded. A ranking rule invented here would be a preference presented as a
 * finding — so the type is `USER_SET` where somebody picks one and `ASSUMED`
 * straight where nobody has, every candidate is reported, and the reason the
 * engine does not choose is stated rather than implied.
 */
export const RampType = {
  /** One 6.00 m two-way run. What the engine has always drawn. */
  STRAIGHT: 'STRAIGHT',
  /** 3.00 m in and 3.00 m out, side by side — *"هنا مدخل وهنا مخرج"*. */
  SPLIT: 'SPLIT',
  /** A turning or helical run. Enumerated, and never placed — see `placed`. */
  TURNING: 'TURNING',
} as const;
export type RampType = (typeof RampType)[keyof typeof RampType];

export interface RampTypeSpec {
  readonly type: RampType;
  readonly label: string;
  readonly laneCount: number;
  /** Metres. A string, because it is a stated dimension and not a computed one. */
  readonly laneWidthM: string;
  readonly totalWidthM: string;
  /**
   * Whether this engine places it. `TURNING` is `false`, and it is enumerated
   * anyway: a candidate missing from a list reads as one nobody thought of, and
   * this one is in the client's own drawings.
   */
  readonly placed: boolean;
  readonly note: string;
}

export const RAMP_TYPES: readonly RampTypeSpec[] = [
  {
    type: RampType.STRAIGHT,
    label: 'Straight, two-way: two 3.00 m lanes and a 300 mm curb',
    laneCount: 2,
    laneWidthM: '3',
    totalWidthM: '6.3',
    placed: true,
    note:
      'Table B.9: 12% at most, lanes of at least 3 m, separated by a curb of at least ' +
      '300 mm (B.7.2.2 c, d); Table B.10: a 3.6 m transition at 6% at each end.',
  },
  {
    type: RampType.SPLIT,
    label: 'Split, 3.00 m in and 3.00 m out side by side',
    laneCount: 2,
    laneWidthM: '3',
    totalWidthM: '6.3',
    placed: true,
    note:
      'The same two lanes and curb as the straight ramp over the same run, so it places ' +
      'the same bays; what differs is where each lane meets the floor.',
  },
  {
    type: RampType.TURNING,
    label: 'Curved or helical ramp — NOT PLACED',
    laneCount: 1,
    laneWidthM: '5',
    totalWidthM: '5',
    placed: false,
    note:
      'Table B.9 allows them (curved 12%, lane 3.5 m, inner radius 4 m; helical 8%, ' +
      'lane 5 m, radius 6 m) and B.7.2.2 (a) says they are not preferred. Not placed: ' +
      'this engine lays out rectangles. The client\'s own sloped podium floor is laid out ' +
      'instead as an arrangement of its own — the ring aisle sloped at 4% or less.',
  },
];

export function rampTypeSpec(type: RampType): RampTypeSpec {
  const found = RAMP_TYPES.find((t) => t.type === type);
  if (!found) {
    throw new ParkingLayoutError(`no ramp type is enumerated as ${String(type)}.`);
  }
  return found;
}

const RAMP_TYPE_BASIS =
  'A straight two-way ramp, the one the client\'s ground-floor drawing uses. Nobody ' +
  'chose a type for this run. The alternatives are enumerated and reported beside it; ' +
  'straight and split take the same plan area, so no bay count separates them, and a ' +
  'ranking invented here would be a preference presented as a finding.';

/**
 * THE ARRANGEMENTS A LEVEL IS PACKED IN, NAMED SO A READER CAN PICK ONE.
 *
 * Eng. Mohamed, 16 Oct 2026: *"ينفع يعملي كذا اوبشن واكتر من رسمه وكلهم لازم صح
 * بافكار مختلفه مثلا فى الباركنج وله حرية الاختيار"*. The list was already there —
 * every run packs each of these and keeps the most bays — and only the choice was
 * the engine's. Now each is reported with its count, and one stated by a named
 * reader is laid out as stated, `USER_SET` under that name, even where another
 * places more bays: the count it costs is in the same list beside it.
 *
 * This is a choice among the same fixed candidates on every run, never a search:
 * nothing here moves a ramp or a core to find more bays — that is the optimiser
 * of 34:37, a `TRADEOFF` value Phase 0 refuses to emit.
 */
export const ParkingArrangement = {
  WIDTH: 'WIDTH',
  DEPTH: 'DEPTH',
  PERIMETER: 'PERIMETER',
  SLOPED: 'SLOPED',
  FIELD_WIDTH: 'FIELD_WIDTH',
  FIELD_DEPTH: 'FIELD_DEPTH',
} as const;
export type ParkingArrangement = (typeof ParkingArrangement)[keyof typeof ParkingArrangement];

/** One arrangement as packed on this level: what it placed, or why it placed none. */
export interface ArrangementCandidate {
  readonly id: ParkingArrangement;
  readonly name: string;
  readonly bayCount: number;
  readonly refusal?: string;
}

// ---------------------------------------------------------------------------
// The packer
// ---------------------------------------------------------------------------

interface PackOptions {
  readonly widthM: Decimal;
  readonly grossDepthM: Decimal;
  readonly deductedDepthM: Decimal;
  readonly bayWidth: Decimal;
  readonly bayLength: Decimal;
  readonly aisleWidth: Decimal;
  readonly moduleDepth: Decimal;
  readonly effectiveBayWidth: Decimal;
  /** Bays in a group between column gaps; 0 where no gap is left. */
  readonly columnEvery: number;
  /** The clear gap after each group, metres. */
  readonly columnGapM: Decimal;
  readonly includeRamp: boolean;
  /**
   * The straight ramp's plan size for one storey, from Tables B.9 and B.10 — the
   * run it NEEDS, not the room it was given. A packing without that room refuses.
   */
  readonly rampWidthM: Decimal;
  readonly rampRunM: Decimal;
  /** One storey, metres: what a sloped ring has to climb in one lap. */
  readonly storeyHeightM: Decimal;
  /**
   * The ring's ramp: a straight ramp on the island, or the ring aisle itself
   * sloped at no more than 4% (B.7.2.3.1). Read by the perimeter packer only.
   */
  readonly ringRamp?: 'STRAIGHT' | 'SLOPED';
  /** Where the core stands, in this packing's own frame. */
  readonly obstructions: readonly Rect[];
  /**
   * A second cross aisle at the far end of the runs. Tried only where a core
   * stands on the level: the core cuts module aisles, and the bays beyond the cut
   * are stranded unless another cross aisle reaches them from the other side.
   */
  readonly farCrossAisle: boolean;
  /**
   * The cross aisle beside the ramp, which every packing has unless a core is
   * standing across it — then the far one alone, reached through the module
   * aisles the ramp meets, is tried too.
   */
  readonly nearCrossAisle: boolean;
  /**
   * Where the first module starts, metres along the depth. Zero but where a core
   * stands on the level: then the module grid is slid against the core, so that
   * it stands in a run of bays rather than across an aisle that every bay beyond
   * it needs. The strip before the first module is left unpacked, and said so.
   */
  readonly offsetM: Decimal;
}

interface Packing {
  readonly rects: readonly PlacedRect[];
  readonly bayCount: number;
  readonly reserved: Rect | undefined;
  /**
   * Every piece the reserved area was laid in, `reserved` among them. A ring's
   * island or a field of rows rarely has one rectangle the size of the whole
   * strip, and drawing only the largest piece left the rest of it unsaid.
   */
  readonly reservedPieces?: readonly Rect[];
  /** Whether this packing covers the whole footprint rather than one rectangle in it. */
  readonly wholeFootprint?: boolean;
  /** Of the reserved area, what stands where no bay could be served, m². */
  readonly reservedInCornersM2?: Decimal;
  /** Bays the reserved area actually took, where it was laid in bays. */
  readonly baysTakenByReserved?: number;
  readonly ramp: { readonly widthM: Decimal; readonly runM: Decimal } | undefined;
  /** The ring aisle's lap, where the ring itself is the ramp. */
  readonly slopedLapM?: Decimal;
  readonly crossAisleAreaM2: Decimal;
  readonly baysLostToCrossAisle: number;
  readonly strandedBays: number;
  readonly baysUnderCore: number;
  readonly notes: readonly string[];
  /** Why nothing could be packed this way round. Returned, not thrown: the other
   *  orientation may still work, and a throw would hide that. */
  readonly refusal: string | undefined;
}

const ZERO = new Decimal(0);

type Pitch = Pick<PackOptions, 'effectiveBayWidth' | 'columnEvery' | 'columnGapM'>;

/**
 * Where bay `k` of a run starts, measured from the run's start: `k` bays, and a
 * column gap after every full group before it. Every packer places bays along a
 * run through this one function, so the gap cannot be left in one arrangement
 * and forgotten in another.
 */
function bayAlong(o: Pitch, k: number): Decimal {
  const gaps = o.columnEvery > 0 ? Math.floor(k / o.columnEvery) : 0;
  return o.effectiveBayWidth.times(k).plus(o.columnGapM.times(gaps));
}

/**
 * How many bays a run of `length` holds, column gaps included. A gap is only
 * ever BETWEEN two groups: a run that ends on a full group pays no gap after it.
 */
function baysAlong(o: Pitch, length: Decimal): number {
  let n = 0;
  while (bayAlong(o, n).plus(o.effectiveBayWidth).lte(length)) n += 1;
  return n;
}

function refused(reason: string): Packing {
  return {
    rects: [],
    bayCount: 0,
    reserved: undefined,
    ramp: undefined,
    crossAisleAreaM2: ZERO,
    baysLostToCrossAisle: 0,
    strandedBays: 0,
    baysUnderCore: 0,
    notes: [],
    refusal: reason,
  };
}

/** Pack one rectangle, one way round. Returns a refusal rather than throwing. */
/** Positive-area overlap: two rectangles that only touch do not collide. */
const collides = (a: Rect, b: Rect): boolean =>
  a.x.lt(b.x.plus(b.width)) &&
  b.x.lt(a.x.plus(a.width)) &&
  a.y.lt(b.y.plus(b.height)) &&
  b.y.lt(a.y.plus(a.height));

/**
 * What is left of a drivable strip once the core stands across it: the pieces
 * either side, along the strip's long axis, each the strip's full width. A strip
 * the core cuts into only partly is cut all the same — a lane narrower than the
 * aisle is not a way through, and the circulation check would say so anyway.
 */
function piecesOutside(r: PlacedRect, blocks: readonly Rect[]): PlacedRect[] {
  const alongX = r.width.gte(r.height);
  const start = alongX ? r.x : r.y;
  const end = alongX ? r.x.plus(r.width) : r.y.plus(r.height);
  const cuts = blocks
    .map((b) => (alongX ? [b.x, b.x.plus(b.width)] : [b.y, b.y.plus(b.height)]) as [Decimal, Decimal])
    .sort((p, q) => p[0].comparedTo(q[0]));
  const pieces: PlacedRect[] = [];
  let at = start;
  for (const [c0, c1] of cuts) {
    if (c0.gt(at)) pieces.push(piece(r, alongX, at, Decimal.min(c0, end)));
    at = Decimal.max(at, c1);
  }
  if (end.gt(at)) pieces.push(piece(r, alongX, at, end));
  return pieces;
}

function piece(r: PlacedRect, alongX: boolean, from: Decimal, to: Decimal): PlacedRect {
  return alongX
    ? { ...r, x: from, width: to.minus(from) }
    : { ...r, y: from, height: to.minus(from) };
}

function packLevel(o: PackOptions): Packing {
  const notes: string[] = [];
  let rects: PlacedRect[] = [];
  const availableDepth0 = o.grossDepthM.minus(o.deductedDepthM).minus(o.offsetM);
  if (availableDepth0.lte(0)) {
    return refused(
      `the ${o.deductedDepthM.toFixed(2)} m strip taken for cores and plant leaves no ` +
        `depth to pack in a ${o.widthM.toFixed(2)} × ${o.grossDepthM.toFixed(2)} m level`,
    );
  }

  // --- ramp ---------------------------------------------------------------
  // Reserved as a strip down one edge, and the bay runs are packed into the
  // width that is left. Placing it as a rectangle *over* the packing area would
  // put it on top of bays that were then still counted — a drawing showing a
  // ramp parked across eight cars, and a bay count eight too high.
  let rampX = ZERO;
  let ramp: Packing['ramp'];
  if (o.includeRamp) {
    /*
      THE RUN THE STOREY NEEDS, OR NO RAMP HERE. This used to be min(30 m, the
      depth left), which turned a shallow level into a 23% ramp on the client's
      own plot. A level that cannot hold a ramp at 12% does not get a steeper one.
    */
    const rampWidth = o.rampWidthM;
    const rampRun = o.rampRunM;
    if (rampWidth.gt(o.widthM) || rampRun.gt(availableDepth0)) {
      return refused(
        `a straight ramp climbing a ${o.storeyHeightM.toString()} m storey needs ` +
          `${rampWidth.toFixed(2)} × ${rampRun.toFixed(2)} m (DBC Tables B.9 and B.10) and this ` +
          `packing has ${o.widthM.toFixed(2)} × ${availableDepth0.toFixed(2)} m`,
      );
    }
    rampX = rampWidth;
    ramp = { widthM: rampWidth, runM: rampRun };
    rects.push({
      kind: RectKind.RAMP,
      row: RAMP_ROW,
      x: ZERO,
      y: ZERO,
      width: rampWidth,
      height: rampRun,
    });
    notes.push(
      `A ${rampWidth.toFixed(2)} × ${rampRun.toFixed(2)} m straight ramp runs down one edge: ` +
        '12% with a 3.6 m transition at 6% at each end (DBC Tables B.9 and B.10), two 3 m ' +
        'lanes and a 300 mm curb. The bay runs are packed into the remaining width. ' +
        'Headroom (2.4 m) is NOT ASSESSED.',
    );
  }

  // --- how many aisles will there be? ------------------------------------
  // Decided before packing, because the answer decides whether a cross aisle is
  // reserved, and the cross aisle takes width the runs would otherwise use.
  const singleLoadedDepth = o.bayLength.plus(o.aisleWidth);
  const moduleCount = availableDepth0.div(o.moduleDepth).floor().toNumber();
  const afterModules = availableDepth0.minus(o.moduleDepth.times(moduleCount));
  const singleLoaded = afterModules.gte(singleLoadedDepth);
  const aisleCount = moduleCount + (singleLoaded ? 1 : 0);
  if (aisleCount < 1) {
    return refused(
      `${availableDepth0.toFixed(2)} m of packable depth holds neither a ` +
        `${o.moduleDepth.toFixed(2)} m double-loaded module nor a ` +
        `${singleLoadedDepth.toFixed(2)} m single-loaded run`,
    );
  }

  // --- the cross aisle ----------------------------------------------------
  // Two stacked modules do not touch: eleven metres of parked cars stand between
  // one aisle and the next. One cross aisle down the side joins them all to the
  // ramp, or to the slab edge where the driveway lands. With a single run there
  // is nothing to join, so none is reserved and none is charged.
  const crossAisleWidth = aisleCount >= 2 && o.nearCrossAisle ? o.aisleWidth : ZERO;
  const farAisleWidth = o.farCrossAisle && aisleCount >= 2 ? o.aisleWidth : ZERO;
  const runX = rampX.plus(crossAisleWidth);
  const packWidth = o.widthM.minus(runX).minus(farAisleWidth);
  if (packWidth.lte(0)) {
    return refused(
      `a ${o.widthM.toFixed(2)} m width holds the ramp strip and the cross aisle and ` +
        'nothing else',
    );
  }
  const baysPerRun = baysAlong(o, packWidth);
  if (baysPerRun < 1) {
    return refused(
      `a ${packWidth.toFixed(2)} m packable width cannot hold one ` +
        `${o.effectiveBayWidth.toString()} m bay run` +
        (o.includeRamp ? ' once the ramp strip and the cross aisle are reserved' : ''),
    );
  }
  const baysPerRunUnconnected = baysAlong(o, o.widthM.minus(rampX));

  // --- pack double-loaded modules ----------------------------------------
  let availableDepth = availableDepth0;
  let cursorY = o.offsetM;
  if (o.offsetM.gt(0)) {
    notes.push(
      `The modules start ${o.offsetM.toString()} m in from the edge, so the core stands in ` +
        'a run of bays rather than across a drive aisle that the bays beyond it need. ' +
        'That strip is left unpacked. Where the core stranded bays, every start from 0 m ' +
        'to one module depth in 1 m steps was packed, with the cross aisle at either end ' +
        'or both, and the start that reaches the most bays was kept.',
    );
  }
  let row = 0;
  const bayRun = (y: Decimal, r: number): void => {
    for (let i = 0; i < baysPerRun; i += 1) {
      rects.push({
        kind: RectKind.BAY,
        row: r,
        x: runX.plus(bayAlong(o, i)),
        y,
        width: o.bayWidth,
        height: o.bayLength,
      });
    }
  };
  while (availableDepth.gte(o.moduleDepth)) {
    bayRun(cursorY, row);
    rects.push({
      kind: RectKind.AISLE,
      row,
      x: runX,
      y: cursorY.plus(o.bayLength),
      width: packWidth,
      height: o.aisleWidth,
    });
    bayRun(cursorY.plus(o.bayLength).plus(o.aisleWidth), row);
    cursorY = cursorY.plus(o.moduleDepth);
    availableDepth = availableDepth.minus(o.moduleDepth);
    row += 1;
  }

  // --- the leftover strip -------------------------------------------------
  let runCount = moduleCount * 2;
  if (availableDepth.gte(singleLoadedDepth)) {
    bayRun(cursorY, row);
    rects.push({
      kind: RectKind.AISLE,
      row,
      x: runX,
      y: cursorY.plus(o.bayLength),
      width: packWidth,
      height: o.aisleWidth,
    });
    runCount += 1;
    notes.push(
      `The final ${availableDepth.toFixed(2)} m strip takes a single-loaded row: ` +
        'one run of bays served by its own aisle. Half the parking efficiency of a ' +
        'double-loaded module, and the first thing to reconsider if the level is short.',
    );
    cursorY = cursorY.plus(singleLoadedDepth);
    availableDepth = availableDepth.minus(singleLoadedDepth);
  } else if (availableDepth.gt(0)) {
    notes.push(
      `${availableDepth.toFixed(2)} m of depth is left unused — too shallow for a ` +
        `bay (${o.bayLength.toString()} m) plus its aisle (${o.aisleWidth.toString()} m). ` +
        'It is reported rather than quietly filled.',
    );
  }

  // --- the cross aisle, now that its length is known ----------------------
  let crossAisleAreaM2 = ZERO;
  if (crossAisleWidth.gt(0) && cursorY.gt(0)) {
    rects.push({
      kind: RectKind.AISLE,
      row: CROSS_AISLE_ROW,
      x: rampX,
      y: ZERO,
      width: crossAisleWidth,
      height: cursorY,
    });
    crossAisleAreaM2 = crossAisleWidth.times(cursorY);
    if (farAisleWidth.gt(0)) {
      rects.push({
        kind: RectKind.AISLE,
        row: CROSS_AISLE_ROW,
        x: runX.plus(packWidth),
        y: ZERO,
        width: farAisleWidth,
        height: cursorY,
      });
      crossAisleAreaM2 = crossAisleAreaM2.plus(farAisleWidth.times(cursorY));
      notes.push(
        `A second ${farAisleWidth.toString()} m cross aisle runs down the far side. The core ` +
          'cuts the module aisles it stands across, and without this one every bay beyond ' +
          'the cut has no way in; it costs another bay run of width and reaches more bays ' +
          'than it costs. Both arrangements were packed.',
      );
    }
    notes.push(
      `A ${crossAisleWidth.toString()} m cross aisle runs the packed depth down one side. ` +
        `Without it the ${aisleCount} module aisles do not touch one another and every bay ` +
        'past the first module is unreachable; with it, they cost one bay run of width. ' +
        'The cost is in the losses, not absorbed into an efficiency figure.',
    );
  }

  // --- the core, where it stands ------------------------------------------
  let baysUnderCore = 0;
  if (o.obstructions.length > 0) {
    const cut: PlacedRect[] = [];
    for (const r of rects) {
      const hits = o.obstructions.filter((b) => collides(r, b));
      if (hits.length === 0) {
        cut.push(r);
      } else if (r.kind === RectKind.BAY || r.kind === RectKind.ACCESSIBLE_BAY) {
        baysUnderCore += 1;
      } else {
        cut.push(...piecesOutside(r, hits));
      }
    }
    rects = cut;
    if (baysUnderCore > 0) {
      notes.push(
        `${baysUnderCore} bay(s) would stand where the core does and are not placed; any ` +
          'aisle the core crosses is cut there. The core is a shaft through every parking ' +
          'level, and a bay inside it is not a bay.',
      );
    }
  }

  // --- does a car reach every bay? ----------------------------------------
  const drivableIdx: number[] = [];
  for (let i = 0; i < rects.length; i += 1) {
    const k = rects[i]!.kind;
    if (k === RectKind.AISLE || k === RectKind.RAMP) drivableIdx.push(i);
  }
  const drivable: CircRect[] = drivableIdx.map((i) => rects[i]!);
  // Exactly one way onto the level: the ramp where there is one, otherwise the
  // aisle that meets the slab edge the driveway lands on. Treating every aisle
  // that touches the perimeter as an entrance would make the check vacuous —
  // a car cannot drive onto a level through the wall it happens to end at.
  const entries: number[] = [];
  for (let n = 0; n < drivable.length; n += 1) {
    const r = rects[drivableIdx[n]!]!;
    if (ramp ? r.kind === RectKind.RAMP : r.x.isZero()) entries.push(n);
  }
  const { reachable } = traceCirculation({
    drivable,
    entries,
    minOpeningM: o.aisleWidth,
  });

  /*
    AN AISLE NO CAR CAN REACH IS NOT AN AISLE. Only the core cuts one off — a
    piece of module aisle beyond it with no cross aisle at its end — and drawing
    it would put a driveway on the plan that leads nowhere. Dropped, like the
    bays along it.
  */
  const reachableRect = new Set(drivableIdx.filter((_, n) => reachable.has(n)));
  const kept: PlacedRect[] = [];
  let bayCount = 0;
  let strandedBays = 0;
  for (let i = 0; i < rects.length; i += 1) {
    const r = rects[i]!;
    if (r.kind === RectKind.AISLE && !reachableRect.has(i)) continue;
    if (r.kind !== RectKind.BAY && r.kind !== RectKind.ACCESSIBLE_BAY) {
      kept.push(r);
      continue;
    }
    if (bayIsServed(r, drivable, reachable)) {
      kept.push(r);
      bayCount += 1;
    } else {
      strandedBays += 1;
    }
  }
  if (strandedBays > 0) {
    notes.push(
      `${strandedBays} bay(s) were placed and then dropped: no aisle a car can reach ` +
        'runs past their open end. They are not counted and not drawn. A bay that ' +
        'cannot be reached is not a bay, however neatly it fits.',
    );
  }
  if (bayCount === 0) {
    return refused(
      `${rects.filter((r) => r.kind === RectKind.BAY).length} bay(s) were placed and none ` +
        'of them can be reached from the way onto the level',
    );
  }

  const reserved: Rect | undefined = o.deductedDepthM.gt(0)
    ? {
        x: ZERO,
        y: o.grossDepthM.minus(o.deductedDepthM),
        width: o.widthM,
        height: o.deductedDepthM,
      }
    : undefined;

  return {
    rects: kept,
    bayCount,
    reserved,
    ramp,
    crossAisleAreaM2,
    baysLostToCrossAisle: (baysPerRunUnconnected - baysPerRun) * runCount,
    strandedBays,
    baysUnderCore,
    notes,
    refusal: undefined,
  };
}

/**
 * The perimeter arrangement — bays against all four walls, one ring aisle, and
 * an island in the middle that the core stands in.
 *
 * ---------------------------------------------------------------------------
 * WHY A THIRD CANDIDATE, AND WHY NOT A SEARCH.
 *
 * On 5 Oct 2026 the client sent his own podium and ground floor for a
 * 50.85 × 26.85 m plot. Both are laid out this way and neither is laid out in
 * stacked double-loaded modules: the bays line the four walls, the drive loops
 * round once, and the stairs, lifts and lift lobby sit on the island the loop
 * encloses. That is not a preference about drafting. It is what makes the core
 * free: in the module arrangement the core stands in the middle of the level and
 * cuts the one aisle a shallow plot has room for — the reason `avoidCore` has
 * been shipped off, at 11 bays down to 4 on exactly this plot. In the perimeter
 * arrangement the core costs nothing, because the island is where it already is.
 *
 * So this is enumerated beside the two module orientations, packed every time,
 * and reported whether or not it wins — the same discipline the orientation
 * sweep follows and for the same reason. **It is not the optimiser of 34:37.**
 * Nothing here searches for where the core or the ramp should go to raise the
 * yield: the arrangement is fixed, the core stands where the run already put it,
 * and the candidate list is the same on every run, so the answer is reproducible.
 * A reader who disagrees with the arrangement can see what the other two came to.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT REFUSES.
 *
 * It returns a refusal — never a worse layout — when the level cannot hold the
 * ring (a plot narrower than two bay runs plus two aisles), when the island it
 * encloses cannot hold the core, or when there is no room for the ramp inside
 * the island. A refusal leaves the module candidates standing; a silent fallback
 * would report a perimeter layout that is really a module one.
 */
function packPerimeter(o: PackOptions): Packing {
  const notes: string[] = [];
  const W = o.widthM;
  const D = o.grossDepthM;
  const band = o.bayLength.plus(o.aisleWidth);

  if (W.lte(band.times(2)) || D.lte(band.times(2))) {
    return refused(
      `a ${W.toFixed(2)} × ${D.toFixed(2)} m level does not hold a ring: two bay runs ` +
        `and two aisles need ${band.times(2).toFixed(2)} m each way`,
    );
  }

  /*
    THE CORNERS GO TO THE HORIZONTAL RUNS, and the side runs start past the
    aisle that turns there. Giving a corner to both runs would count one bay
    twice; giving it to neither would leave a bay-sized hole at each corner that
    a reader would read as a column nobody placed. The client's own drawing does
    the same: his top run reaches both walls and his side runs start below it.
  */
  const inner = { x0: o.bayLength, y0: o.bayLength, x1: W.minus(o.bayLength), y1: D.minus(o.bayLength) };
  const island = {
    x0: inner.x0.plus(o.aisleWidth),
    y0: inner.y0.plus(o.aisleWidth),
    x1: inner.x1.minus(o.aisleWidth),
    y1: inner.y1.minus(o.aisleWidth),
  };
  const islandW = island.x1.minus(island.x0);
  const islandD = island.y1.minus(island.y0);

  /*
    THE CORE MAY STAND IN A BAY RUN; IT MAY NOT STAND IN THE RING.

    The client's own ground floor puts the lift lobby and the stairs in the wall
    band, between the shop and the garbage room, not on the island — so a core in
    a bay run is a real arrangement and costs only the bays it covers. A core
    across the ring is a different thing: there is exactly one loop on this level
    and cutting it strands everything beyond the cut. The module arrangement can
    answer a cut aisle with a second cross aisle; a ring has no second ring, so
    this candidate refuses and leaves the module candidates standing rather than
    reporting a loop no car can complete.
  */
  const ring = { x0: inner.x0, y0: inner.y0, x1: inner.x1, y1: inner.y1 };
  for (const b of o.obstructions) {
    const insideIsland =
      b.x.gte(island.x0) && b.y.gte(island.y0) && b.x.plus(b.width).lte(island.x1) && b.y.plus(b.height).lte(island.y1);
    const outsideRing =
      b.x.plus(b.width).lte(ring.x0) || b.x.gte(ring.x1) || b.y.plus(b.height).lte(ring.y0) || b.y.gte(ring.y1);
    if (!insideIsland && !outsideRing) {
      return refused(
        `the core (${b.width.toFixed(2)} × ${b.height.toFixed(2)} m at ` +
          `${b.x.toFixed(2)}, ${b.y.toFixed(2)}) stands across the ring aisle, and a level ` +
          `with one loop has no second way round it. The island it encloses is ` +
          `${Decimal.max(ZERO, islandW).toFixed(2)} × ${Decimal.max(ZERO, islandD).toFixed(2)} m`,
      );
    }
  }

  const rects: PlacedRect[] = [];
  const bayAt = (x: Decimal, y: Decimal, w: Decimal, h: Decimal, row: number): void => {
    rects.push({ kind: RectKind.BAY, row, x, y, width: w, height: h });
  };

  // --- the four bay runs ---------------------------------------------------
  const acrossCount = baysAlong(o, W);
  const sideStart = inner.y0.plus(o.aisleWidth);
  const sideEnd = inner.y1.minus(o.aisleWidth);
  const downCount = sideEnd.lt(sideStart) ? -1 : baysAlong(o, sideEnd.minus(sideStart));
  if (acrossCount < 1 || downCount < 0) {
    return refused(
      `a ${W.toFixed(2)} m wall holds no ${o.effectiveBayWidth.toString()} m bay run`,
    );
  }
  for (let i = 0; i < acrossCount; i += 1) {
    const x = bayAlong(o, i);
    bayAt(x, ZERO, o.bayWidth, o.bayLength, 0);
    bayAt(x, D.minus(o.bayLength), o.bayWidth, o.bayLength, 1);
  }
  for (let i = 0; i < downCount; i += 1) {
    const y = sideStart.plus(bayAlong(o, i));
    bayAt(ZERO, y, o.bayLength, o.bayWidth, 2);
    bayAt(W.minus(o.bayLength), y, o.bayLength, o.bayWidth, 3);
  }

  // --- the ring ------------------------------------------------------------
  // Four bands that overlap at the corners, so the loop is one network by
  // construction rather than four strips that happen to meet.
  const ringArea = W.times(D).minus(islandW.times(islandD)).minus(
    W.times(o.bayLength).times(2).plus(o.bayLength.times(sideEnd.minus(sideStart)).times(2)),
  );
  rects.push({ kind: RectKind.AISLE, row: RING_AISLE_ROW, x: ZERO, y: inner.y0, width: W, height: o.aisleWidth });
  rects.push({
    kind: RectKind.AISLE,
    row: RING_AISLE_ROW,
    x: ZERO,
    y: inner.y1.minus(o.aisleWidth),
    width: W,
    height: o.aisleWidth,
  });
  rects.push({
    kind: RectKind.AISLE,
    row: RING_AISLE_ROW,
    x: inner.x0,
    y: sideStart,
    width: o.aisleWidth,
    height: Decimal.max(ZERO, sideEnd.minus(sideStart)),
  });
  rects.push({
    kind: RectKind.AISLE,
    row: RING_AISLE_ROW,
    x: inner.x1.minus(o.aisleWidth),
    y: sideStart,
    width: o.aisleWidth,
    height: Decimal.max(ZERO, sideEnd.minus(sideStart)),
  });

  /*
    THE WAY IN CROSSES THE BAY RUN, because the ring does not touch the slab
    edge — the bays do. On the ground floor that crossing is the driveway, and
    the client's own ground floor draws it exactly so: the entrance cuts through
    the wall run to reach the loop. It costs the bays it crosses, which are not
    placed rather than placed and then found unreachable.
  */
  const entryWidth = Decimal.min(o.aisleWidth, W);
  rects.push({
    kind: RectKind.AISLE,
    row: ENTRY_DRIVE_ROW,
    x: ZERO,
    y: ZERO,
    width: entryWidth,
    height: o.bayLength,
  });

  /*
    THE ISLAND IS WORKED ALONG ITS LONG AXIS. The first version stood the ramp
    across it — 6.5 m of run on the worked example, printed as a 49.23% ramp —
    because it always ran the ramp down the level's depth. What the island holds
    is a row: the core's shafts where the core already stands, the ramp at one
    end where a straight one is used, the reserved strip, and bays in what is left.
  */
  const longX = islandW.gte(islandD);
  const longLen = Decimal.max(ZERO, longX ? islandW : islandD);
  const shortLen = Decimal.max(ZERO, longX ? islandD : islandW);
  const onIsland = (a0: Decimal, len: Decimal, b0: Decimal, dep: Decimal): Rect =>
    longX
      ? { x: island.x0.plus(a0), y: island.y0.plus(b0), width: len, height: dep }
      : { x: island.x0.plus(b0), y: island.y0.plus(a0), width: dep, height: len };
  /*
    What stands on the island, as rectangles, and the stretches of the long axis
    still clear across a given band of its depth. Worked per band so that a core
    5.2 m deep on an 11.5 m island leaves the other side for a row of bays — the
    client's own podium has bays "packed into the island around" the core.
  */
  type Span = [Decimal, Decimal];
  const standingOnIsland: Rect[] = [...o.obstructions];
  const alongOf = (r: Rect): Span =>
    longX ? [r.x.minus(island.x0), r.x.plus(r.width).minus(island.x0)] : [r.y.minus(island.y0), r.y.plus(r.height).minus(island.y0)];
  const acrossOf = (r: Rect): Span =>
    longX ? [r.y.minus(island.y0), r.y.plus(r.height).minus(island.y0)] : [r.x.minus(island.x0), r.x.plus(r.width).minus(island.x0)];
  const clear = (band: Span): Span[] => {
    const taken = standingOnIsland
      .filter((r) => {
        const [lo, hi] = acrossOf(r);
        return hi.gt(band[0]) && lo.lt(band[1]);
      })
      .map((r): Span => {
        const [lo, hi] = alongOf(r);
        return [Decimal.max(ZERO, lo), Decimal.min(longLen, hi)];
      })
      .filter(([lo, hi]) => hi.gt(lo))
      .sort((p, q) => p[0].comparedTo(q[0]));
    const out: Span[] = [];
    let at = ZERO;
    for (const [lo, hi] of taken) {
      if (lo.gt(at)) out.push([at, lo]);
      at = Decimal.max(at, hi);
    }
    if (longLen.gt(at)) out.push([at, longLen]);
    return out;
  };

  // --- the ramp: on the island, or the ring itself ----------------------------
  let ramp: Packing['ramp'];
  let slopedLapM: Decimal | undefined;
  if (o.includeRamp && o.ringRamp === 'SLOPED') {
    /*
      THE CLIENT'S OWN ARRANGEMENT. His podium drawing of 5 Oct is a closed loop
      marked "sloped parking ramp 4%" with bays on it: the floor is the ramp.
      B.7.2.3.1 lets a parked floor fall at up to 4%, so the ring qualifies when
      one lap along its centre line climbs a storey at no more than that.
    */
    const lap = W.minus(o.bayLength.times(2)).minus(o.aisleWidth)
      .plus(D.minus(o.bayLength.times(2)).minus(o.aisleWidth))
      .times(2);
    const gradient = o.storeyHeightM.div(lap);
    if (gradient.gt(MAX_PARKED_SLOPE)) {
      return refused(
        `a ring aisle ${lap.toFixed(2)} m round climbs a ${o.storeyHeightM.toString()} m storey at ` +
          `${gradient.times(100).toDecimalPlaces(2, Decimal.ROUND_UP).toFixed(2)}% per lap, steeper than the 4% a floor with parked ` +
          'cars on it may fall (DBC B.7.2.3.1)',
      );
    }
    slopedLapM = lap;
    notes.push(
      `The ring aisle is the ramp: it climbs one ${o.storeyHeightM.toString()} m storey over one ` +
        // Rounded up, as the traced gradient is, so the note and the sheet print one figure.
        `${lap.toFixed(2)} m lap, ${gradient.times(100).toDecimalPlaces(2, Decimal.ROUND_UP).toFixed(2)}%, within the 4% a floor with ` +
        'parked cars on it may fall (DBC B.7.2.3.1, Figure B.55). No ramp strip is needed.',
    );
  } else if (o.includeRamp) {
    const run = o.rampRunM;
    const slot = clear([ZERO, Decimal.min(o.rampWidthM, shortLen)])
      .map(([lo, hi]) => (lo.isZero() && hi.minus(lo).gte(run) ? lo : hi.eq(longLen) && hi.minus(lo).gte(run) ? hi.minus(run) : null))
      .find((a): a is Decimal => a !== null);
    if (shortLen.lt(o.rampWidthM) || slot === undefined) {
      return refused(
        `a straight ramp climbing a ${o.storeyHeightM.toString()} m storey needs ` +
          `${o.rampWidthM.toFixed(2)} × ${run.toFixed(2)} m (DBC Tables B.9 and B.10), reached from ` +
          `the ring at one end of the island, and the ${longLen.toFixed(2)} × ${shortLen.toFixed(2)} m ` +
          'island does not have it clear of the core',
      );
    }
    ramp = { widthM: o.rampWidthM, runM: run };
    const rampRect = onIsland(slot, run, ZERO, o.rampWidthM);
    rects.push({ kind: RectKind.RAMP, row: RAMP_ROW, ...rampRect });
    standingOnIsland.push(rampRect);
    notes.push(
      `A ${o.rampWidthM.toFixed(2)} × ${run.toFixed(2)} m straight ramp runs along the island the ` +
        'ring encloses: 12% with a 3.6 m transition at 6% at each end (DBC Tables B.9 and B.10). ' +
        'Headroom (2.4 m) is NOT ASSESSED.',
    );
  }

  /*
    THE RESERVED STRIP, THEN BAYS. What the deduction keeps for plant and
    circulation stands on the island — anywhere else it cuts the ring — in the
    longest clear stretch first. Only what is still clear after it holds bays,
    one row facing each long aisle where the island is deep enough for two.
  */
  const islandRows = shortLen.gte(o.bayLength.times(2)) ? 2 : shortLen.gte(o.bayLength) ? 1 : 0;
  // One band against each long aisle where two rows fit; one band otherwise.
  const bands: Span[] =
    islandRows === 2 ? [[ZERO, o.bayLength], [shortLen.minus(o.bayLength), shortLen]] : [[ZERO, shortLen]];
  const stripArea = o.deductedDepthM.times(W);
  let reserved: Rect | undefined;
  const reservedPieces: Rect[] = [];
  let stripLeft = stripArea;
  for (const band of bands) {
    const depth = band[1].minus(band[0]);
    if (depth.lte(0)) continue;
    for (const [lo, hi] of clear(band).sort((p, q) => q[1].minus(q[0]).comparedTo(p[1].minus(p[0])))) {
      if (stripLeft.lte(0)) break;
      const len = Decimal.min(hi.minus(lo), stripLeft.div(depth));
      const piece = onIsland(lo, len, band[0], depth);
      if (!reserved || len.times(depth).gt(reserved.width.times(reserved.height))) reserved = piece;
      reservedPieces.push(piece);
      standingOnIsland.push(piece);
      stripLeft = stripLeft.minus(len.times(depth));
    }
  }
  /*
    EVERY PIECE IS DRAWN. Only the largest used to be, and the rest of the strip
    was a sentence — on Al Mamzar 119 m² of 268 drawn, so the ground floor's
    rooms had a third of the room the deduction pays for. What the island has no
    room for at all is still said, because that part is charged and not drawn.
  */
  if (stripLeft.gt('0.5')) {
    notes.push(
      `Of the ${stripArea.toFixed(0)} m² reserved for plant and circulation, ` +
        `${stripArea.minus(stripLeft).toFixed(0)} m² is drawn on the island in ` +
        `${reservedPieces.length} piece(s) and ${stripLeft.toFixed(0)} m² has no room on it at all. ` +
        'The deduction is still charged in full against the bay count.',
    );
  }
  let islandBays = 0;
  if (islandRows > 0) {
    bands.forEach((band, i) => {
      // The mouth of each bay is on the band's aisle side: the near band's at 0,
      // the far band's at the island's far edge.
      const b0 = islandRows === 2 && i === 1 ? shortLen.minus(o.bayLength) : ZERO;
      for (const [lo, hi] of clear([b0, b0.plus(o.bayLength)])) {
        const n = baysAlong(o, hi.minus(lo));
        for (let k = 0; k < n; k += 1) {
          const b = onIsland(lo.plus(bayAlong(o, k)), o.bayWidth, b0, o.bayLength);
          bayAt(b.x, b.y, b.width, b.height, 4 + i);
          islandBays += 1;
        }
      }
    });
  }

  // --- the core, where it stands -------------------------------------------
  let baysUnderCore = 0;
  const standing: PlacedRect[] = [];
  for (const r of rects) {
    const hits = o.obstructions.filter((b) => collides(r, b));
    if (hits.length === 0) standing.push(r);
    else if (r.kind === RectKind.BAY || r.kind === RectKind.ACCESSIBLE_BAY) baysUnderCore += 1;
    else standing.push(...piecesOutside(r, hits));
  }

  // --- does a car reach every bay? -----------------------------------------
  const drivableIdx: number[] = [];
  for (let i = 0; i < standing.length; i += 1) {
    const k = standing[i]!.kind;
    if (k === RectKind.AISLE || k === RectKind.RAMP) drivableIdx.push(i);
  }
  const drivable: CircRect[] = drivableIdx.map((i) => standing[i]!);
  const entries: number[] = [];
  for (let n = 0; n < drivable.length; n += 1) {
    const r = standing[drivableIdx[n]!]!;
    // A sloped ring is reached from the level below along the ring itself.
    if (ramp ? r.kind === RectKind.RAMP : slopedLapM ? r.row === RING_AISLE_ROW : r.row === ENTRY_DRIVE_ROW) {
      entries.push(n);
    }
  }
  const { reachable } = traceCirculation({ drivable, entries, minOpeningM: o.aisleWidth });

  const reachableRect = new Set(drivableIdx.filter((_, n) => reachable.has(n)));
  const kept: PlacedRect[] = [];
  let bayCount = 0;
  let strandedBays = 0;
  for (let i = 0; i < standing.length; i += 1) {
    const r = standing[i]!;
    if ((r.kind === RectKind.AISLE || r.kind === RectKind.RAMP) && !reachableRect.has(i)) continue;
    if (r.kind !== RectKind.BAY && r.kind !== RectKind.ACCESSIBLE_BAY) {
      kept.push(r);
      continue;
    }
    if (bayIsServed(r, drivable, reachable)) {
      kept.push(r);
      bayCount += 1;
    } else {
      strandedBays += 1;
    }
  }
  if (bayCount === 0) {
    return refused('every bay against the four walls was placed and none of them can be reached');
  }
  notes.push(
    `Bays stand against all four walls and one ${o.aisleWidth.toString()} m ring aisle serves ` +
      `them: ${acrossCount} to each long wall and ${downCount} to each short one, less the ` +
      `${strandedBays + baysUnderCore} the way in and the core take. The island the ring ` +
      `encloses is ${Decimal.max(ZERO, islandW).toFixed(2)} × ${Decimal.max(ZERO, islandD).toFixed(2)} m` +
      (islandBays > 0 ? `, and ${islandBays} more bays stand on it facing the ring.` : '.'),
  );
  if (strandedBays > 0) {
    notes.push(
      `${strandedBays} bay(s) were placed and then dropped: no aisle a car can reach runs ` +
        'past their open end. They are not counted and not drawn.',
    );
  }

  return {
    rects: kept,
    bayCount,
    reserved,
    reservedPieces,
    ramp,
    ...(slopedLapM ? { slopedLapM } : {}),
    crossAisleAreaM2: Decimal.max(ZERO, ringArea),
    baysLostToCrossAisle: 0,
    strandedBays,
    baysUnderCore,
    notes,
    refusal: undefined,
  };
}

interface FieldOptions extends PackOptions {
  /** The setback-permitted footprint in this packing's own frame, millimetres. */
  readonly polygon: readonly XY[];
  /** What the field's deduction leaves once the core is taken where it stands. */
  readonly reservedM2: Decimal;
  /** A connector at both ends of every pair of rows, not only at the first. */
  readonly loop: boolean;
}

/**
 * Double-loaded modules laid across the WHOLE footprint, not across the largest
 * rectangle inside it.
 *
 * ---------------------------------------------------------------------------
 * WHY A FIFTH CANDIDATE.
 *
 * Every other arrangement packs one rectangle — the largest that fits inside the
 * setback-permitted ring — and reports what it leaves as a loss. On a rectangular
 * plot that loss is zero. On Al Mamzar (DM 1341556) the ring is a triangle with
 * a 134 m base and the rectangle is 65.7 × 32.6 m, 48.3% of it: 2,292 m², about
 * 107 bays a level, were reported unpacked, and the plot was short of parking by
 * exactly the parking it was not given. A count that is "a floor" by half is not
 * an accurate count.
 *
 * So the rows run across the whole ring. Each module — bays, a 6 m aisle, bays —
 * stands at its own depth; its aisle is as long as the ring allows at that depth,
 * and a bay is placed only where its whole rectangle is inside the ring and its
 * whole mouth is on the aisle (`scanline.ts`, exactly, not by sampling).
 *
 * ---------------------------------------------------------------------------
 * HOW THE ROWS ARE JOINED, AND WHAT IS FIXED.
 *
 * Two stacked modules do not touch — eleven metres of parked cars stand between
 * their aisles — so each pair is joined by a connector, a 6 m drive through both
 * bay rows, at the first place along the pair where both aisles run and the
 * connector is inside the ring. With a core on the level, a second connector at
 * the other end is also tried, because the core can cut an aisle and strand what
 * lies past the cut. The straight ramp, where the level needs one, continues the
 * longest aisle from its end: a car comes off the ramp straight into it. It is
 * 6.3 m wide against a 6 m aisle, so the bays beside it are not placed.
 *
 * Every one of those is a fixed rule. Nothing here searches for where the ramp
 * or the core should go to raise the yield: that is the optimiser of 34:37, a
 * TRADEOFF value Phase 0 refuses to emit. The arrangement is the same on every
 * run, and the reflected one (rows the other way) is packed beside it.
 *
 * The reserved area — plant and circulation, the deduction less the core —
 * takes the bays of the rows farthest from the base first, which are also the
 * shortest. It is drawn where it is taken, piece by piece.
 */
function packField(o: FieldOptions): Packing {
  const notes: string[] = [];
  const mm = (d: Decimal): number => d.times(1000).round().toNumber();
  const M = (n: number): Decimal => new Decimal(n).div(1000);
  const bay = mm(o.bayLength);
  const aisle = mm(o.aisleWidth);
  const bayW = mm(o.bayWidth);
  const pitch = mm(o.effectiveBayWidth);
  const gapMm = mm(o.columnGapM);
  // `bayAlong` and `baysAlong` in whole millimetres, for the rows this packer lays in them.
  const alongMm = (k: number): number => k * pitch + (o.columnEvery > 0 ? Math.floor(k / o.columnEvery) * gapMm : 0);
  const fitsMm = (length: number): number => {
    let n = 0;
    while (alongMm(n) + pitch <= length) n += 1;
    return n;
  };
  const ys = o.polygon.map((p) => p.y);
  const yMin = Math.ceil(Math.min(...ys));
  const yMax = Math.floor(Math.max(...ys));
  // Whole millimetres, rounded inward: a span never reaches past the ring.
  const allowed = (y0: number, y1: number): Interval[] =>
    bandIntervals(o.polygon, y0, y1)
      .map(([a, b]): Interval => [Math.ceil(a - 1e-6), Math.floor(b + 1e-6)])
      .filter(([a, b]) => b > a);
  const box = (kind: RectKind, row: number, x0: number, y0: number, x1: number, y1: number): PlacedRect => ({
    kind,
    row,
    x: M(x0),
    y: M(y0),
    width: M(x1 - x0),
    height: M(y1 - y0),
  });

  // --- the rows ------------------------------------------------------------
  interface Row {
    readonly index: number;
    readonly base: number;
    readonly aisleY: number;
    aisles: Interval[];
  }
  const rows: Row[] = [];
  for (let base = yMin, index = 0; base + bay + aisle <= yMax; base += 2 * bay + aisle, index += 1) {
    const aisleY = base + bay;
    rows.push({
      index,
      base,
      aisleY,
      aisles: allowed(aisleY, aisleY + aisle).filter(([a, b]) => b - a >= pitch),
    });
  }
  if (rows.every((r) => r.aisles.length === 0)) {
    return refused('no drive aisle with a bay beside it fits across the footprint at any depth');
  }

  // --- the ramp, continuing the longest aisle -------------------------------
  const rects: PlacedRect[] = [];
  let ramp: Packing['ramp'];
  if (o.includeRamp) {
    const rampW = mm(o.rampWidthM);
    const run = mm(o.rampRunM);
    const spill = Math.ceil((rampW - aisle) / 2);
    const hosts = rows
      .flatMap((r) => r.aisles.map((iv) => ({ r, iv })))
      .sort((p, q) => q.iv[1] - q.iv[0] - (p.iv[1] - p.iv[0]) || p.r.index - q.r.index || p.iv[0] - q.iv[0]);
    let placed:
      | { readonly r: Row; readonly iv: Interval; readonly x0: number; readonly atStart: boolean; readonly rect: PlacedRect }
      | undefined;
    for (const h of hosts) {
      const y0 = h.r.aisleY - spill;
      const spans = intersectIntervals(allowed(y0, y0 + rampW), [h.iv]).filter(([a, b]) => b - a >= run);
      for (const [a, b] of spans) {
        for (const [x0, atStart] of [[a, true], [b - run, false]] as const) {
          const rect = box(RectKind.RAMP, RAMP_ROW, x0, y0, x0 + run, y0 + rampW);
          if (o.obstructions.some((ob) => collides(rect, ob))) continue;
          placed = { r: h.r, iv: h.iv, x0, atStart, rect };
          break;
        }
        if (placed) break;
      }
      if (placed) break;
    }
    if (!placed) {
      return refused(
        `a straight ramp climbing a ${o.storeyHeightM.toString()} m storey needs ` +
          `${o.rampWidthM.toFixed(2)} × ${o.rampRunM.toFixed(2)} m (DBC Tables B.9 and B.10) in line ` +
          'with a drive aisle, and no aisle across this footprint has that run clear of the core',
      );
    }
    const { r, iv, x0, atStart, rect } = placed;
    /*
      The aisle carries on from the ramp's end, away from it. Whatever stub of
      it lies on the other side is not an aisle: it meets the ramp's foot, and a
      car does not turn off a ramp into a dead end.
    */
    r.aisles = r.aisles
      .flatMap((s): Interval[] => (s === iv ? [atStart ? [x0 + run, iv[1]] : [iv[0], x0]] : [s]))
      .filter(([a, b]) => b - a >= pitch);
    rects.push(rect);
    ramp = { widthM: o.rampWidthM, runM: o.rampRunM };
    notes.push(
      `A ${o.rampWidthM.toFixed(2)} × ${o.rampRunM.toFixed(2)} m straight ramp continues the longest ` +
        'drive aisle from its end: 12% with a 3.6 m transition at 6% at each end (DBC Tables B.9 and ' +
        'B.10). It is wider than the aisle, so the bays beside it are not placed.',
    );
  }

  // --- aisles and bays --------------------------------------------------------
  for (const r of rows) {
    for (const iv of r.aisles) {
      rects.push(box(RectKind.AISLE, r.index, iv[0], r.aisleY, iv[1], r.aisleY + aisle));
      const sides: readonly Interval[] = [
        [r.base, r.aisleY],
        [r.aisleY + aisle, r.aisleY + aisle + bay],
      ];
      for (const [b0, b1] of sides) {
        for (const [x0, x1] of intersectIntervals(allowed(b0, b1), [iv])) {
          const n = fitsMm(x1 - x0);
          for (let k = 0; k < n; k += 1) {
            rects.push(box(RectKind.BAY, r.index, x0 + alongMm(k), b0, x0 + alongMm(k) + bayW, b1));
          }
        }
      }
    }
  }

  // --- the connectors ---------------------------------------------------------
  const connectors: PlacedRect[] = [];
  for (let k = 0; k + 1 < rows.length; k += 1) {
    const lo = rows[k]!;
    const hi = rows[k + 1]!;
    const y0 = lo.aisleY + aisle;
    const y1 = hi.aisleY;
    const band = allowed(y0, y1);
    for (const J of hi.aisles) {
      for (const I of lo.aisles) {
        const spans = intersectIntervals(band, intersectIntervals([I], [J])).filter(([a, b]) => b - a >= aisle);
        if (spans.length === 0) continue;
        const left = spans[0]![0];
        connectors.push(box(RectKind.AISLE, CROSS_AISLE_ROW, left, y0, left + aisle, y1));
        const right = spans[spans.length - 1]![1] - aisle;
        if (o.loop && right >= left + aisle + pitch) {
          connectors.push(box(RectKind.AISLE, CROSS_AISLE_ROW, right, y0, right + aisle, y1));
        }
        break;
      }
    }
  }
  let baysLostToConnectors = 0;
  let standing: PlacedRect[] = [];
  const rampRects = rects.filter((x) => x.kind === RectKind.RAMP);
  for (const r of rects) {
    if (r.kind === RectKind.BAY) {
      if (connectors.some((c) => collides(r, c))) {
        baysLostToConnectors += 1;
        continue;
      }
      if (rampRects.some((c) => collides(r, c))) continue;
    }
    standing.push(r);
  }
  standing.push(...connectors);
  const crossAisleAreaM2 = connectors.reduce((s, c) => s.plus(c.width.times(c.height)), ZERO);

  // --- the core, where it stands -----------------------------------------------
  let baysUnderCore = 0;
  if (o.obstructions.length > 0) {
    const cut: PlacedRect[] = [];
    for (const r of standing) {
      const hits = o.obstructions.filter((b) => collides(r, b));
      if (hits.length === 0) cut.push(r);
      else if (r.kind === RectKind.BAY || r.kind === RectKind.ACCESSIBLE_BAY) baysUnderCore += 1;
      else cut.push(...piecesOutside(r, hits));
    }
    standing = cut;
    if (baysUnderCore > 0) {
      notes.push(
        `${baysUnderCore} bay(s) would stand where the core does and are not placed; any ` +
          'aisle the core crosses is cut there. The core is a shaft through every parking ' +
          'level, and a bay inside it is not a bay.',
      );
    }
  }

  /*
    --- the reserved area: first where no bay can be served, then the far rows ---

    A bay band is often longer than the aisle it faces — on a triangle the band
    nearer the base is wider than the aisle above it — and the stretch past the
    aisle's end is inside the footprint and holds no bay a car can reach. That is
    where a designer puts the plant rooms, and where the reserved area goes first,
    largest stretch first. Only what those corners cannot hold is taken out of
    bays, from the rows farthest from the base. A stretch shorter than 3 m holds
    no room and is not used.
  */
  const reservedPieces: Rect[] = [];
  let left = o.reservedM2.times(1_000_000).toNumber();
  let inCorners = 0;
  if (left > 0) {
    const blocks: Rect[] = [...rampRects, ...o.obstructions];
    const corners: Rect[] = [];
    for (const r of rows) {
      const served = [...r.aisles].sort((p, q) => p[0] - q[0]);
      for (const [b0, b1] of [
        [r.base, r.aisleY],
        [r.aisleY + aisle, r.aisleY + aisle + bay],
      ] as const) {
        for (const [x0, x1] of subtractIntervals(allowed(b0, b1), served)) {
          if (x1 - x0 < 3000) continue;
          const piece: Rect = { x: M(x0), y: M(b0), width: M(x1 - x0), height: M(b1 - b0) };
          if (!blocks.some((b) => collides(piece, b))) corners.push(piece);
        }
      }
    }
    corners.sort((p, q) => q.width.times(q.height).comparedTo(p.width.times(p.height)));
    for (const c of corners) {
      if (left <= 0) break;
      const depth = mm(c.height);
      const len = Math.min(mm(c.width), Math.ceil(left / depth));
      reservedPieces.push({ ...c, width: M(len) });
      left -= len * depth;
      inCorners += len * depth;
    }
  }
  let baysTakenByReserved = 0;
  if (left > 0) {
    const bays = standing
      .filter((r) => r.kind === RectKind.BAY)
      .sort((a, b) => b.y.comparedTo(a.y) || a.x.comparedTo(b.x));
    // Runs of bays standing side by side in one band.
    const runs: PlacedRect[][] = [];
    for (const b of bays) {
      const last = runs[runs.length - 1];
      const prev = last?.[last.length - 1];
      // Side by side, or either side of a column gap: one run either way.
      const step = prev ? b.x.minus(prev.x) : undefined;
      if (prev && prev.y.eq(b.y) && step && (step.eq(o.effectiveBayWidth) || step.eq(o.effectiveBayWidth.plus(o.columnGapM)))) last!.push(b);
      else runs.push([b]);
    }
    const taken = new Set<PlacedRect>();
    for (const run of runs) {
      if (left <= 0) break;
      const x0 = mm(run[0]!.x);
      const x1 = mm(run[run.length - 1]!.x) + bayW;
      const len = Math.min(x1 - x0, Math.ceil(left / bay));
      const piece: Rect = { x: M(x0), y: run[0]!.y, width: M(len), height: o.bayLength };
      reservedPieces.push(piece);
      for (const b of run) if (collides(b, piece)) taken.add(b);
      left -= len * bay;
    }
    standing = standing.filter((r) => !taken.has(r));
    baysTakenByReserved = taken.size;
    if (left > 500_000) {
      notes.push(
        `${(left / 1_000_000).toFixed(0)} m² of the area reserved for plant and circulation has no ` +
          'bay left to stand in. The deduction is still charged in full against the bay count.',
      );
    }
  }

  // --- does a car reach every bay? ---------------------------------------------
  const drivableIdx: number[] = [];
  for (let i = 0; i < standing.length; i += 1) {
    const k = standing[i]!.kind;
    if (k === RectKind.AISLE || k === RectKind.RAMP) drivableIdx.push(i);
  }
  const drivable: CircRect[] = drivableIdx.map((i) => standing[i]!);
  /*
    ONE WAY ON: the ramp where the level has one, otherwise the longest aisle —
    the one along the base, which is where the driveway reaches the level.
  */
  let entry = -1;
  for (let n = 0; n < drivable.length; n += 1) {
    const r = standing[drivableIdx[n]!]!;
    if (ramp) {
      if (r.kind === RectKind.RAMP) entry = n;
    } else if (r.row >= 0 && (entry < 0 || r.width.gt(drivable[entry]!.width))) {
      entry = n;
    }
  }
  if (entry < 0) return refused('no drive aisle on the footprint is reached from the way onto the level');
  const { reachable } = traceCirculation({ drivable, entries: [entry], minOpeningM: o.aisleWidth });
  const reachableRect = new Set(drivableIdx.filter((_, n) => reachable.has(n)));
  const kept: PlacedRect[] = [];
  let bayCount = 0;
  let strandedBays = 0;
  for (let i = 0; i < standing.length; i += 1) {
    const r = standing[i]!;
    if ((r.kind === RectKind.AISLE || r.kind === RectKind.RAMP) && !reachableRect.has(i)) continue;
    if (r.kind !== RectKind.BAY && r.kind !== RectKind.ACCESSIBLE_BAY) {
      kept.push(r);
      continue;
    }
    if (bayIsServed(r, drivable, reachable)) {
      kept.push(r);
      bayCount += 1;
    } else {
      strandedBays += 1;
    }
  }
  if (bayCount === 0) {
    return refused('bays were placed across the footprint and none of them can be reached');
  }

  /*
    A DRIVE THAT SERVES NOTHING IS NOT DRAWN. Near the apex an aisle can end up
    with no bay beside it — the polygon too narrow, or its bays taken for the
    reserved area — and a driveway on the plan leading to nothing is a question
    a reviewer has to ask. An aisle or connector stays while it serves a bay or a
    reserved piece, or joins two drives that are staying; the rest go, until none
    does. Removing them changes no bay: they serve none.
  */
  const servedBays = kept.filter((r) => r.kind === RectKind.BAY || r.kind === RectKind.ACCESSIBLE_BAY);
  const touches = (a: Rect, b: Rect): boolean => openingM(a, b).gt(0);
  let drives = kept.filter((r) => r.kind === RectKind.AISLE || r.kind === RectKind.RAMP);
  for (let changed = true; changed; ) {
    changed = false;
    drives = drives.filter((d) => {
      if (d.kind === RectKind.RAMP) return true;
      const serves =
        servedBays.some((b) => servingNode(b, [d]) !== null) || reservedPieces.some((p) => touches(p, d));
      const joins = drives.filter((other) => other !== d && openingM(d, other).gte(o.aisleWidth)).length;
      if (serves || joins >= 2) return true;
      changed = true;
      return false;
    });
  }
  const pruned = kept.filter(
    (r) => (r.kind !== RectKind.AISLE && r.kind !== RectKind.RAMP) || drives.includes(r),
  );
  kept.length = 0;
  kept.push(...pruned);

  const rowCount = rows.filter((r) => r.aisles.length > 0).length;
  notes.push(
    `Bays are laid in rows across the whole footprint, not inside the largest rectangle in it: ` +
      `${rowCount} row(s) of ${o.bayLength.toString()} m bays either side of a ${o.aisleWidth.toString()} m ` +
      `aisle, each aisle as long as the footprint allows at its depth, joined by ` +
      `${connectors.length} connector(s) through the bay rows. A bay is placed only where the ` +
      'whole of it is inside the setback-permitted footprint.',
  );
  if (strandedBays > 0) {
    notes.push(
      `${strandedBays} bay(s) were placed and then dropped: no aisle a car can reach runs ` +
        'past their open end. They are not counted and not drawn.',
    );
  }

  const largest = reservedPieces.reduce<Rect | undefined>(
    (a, b) => (!a || b.width.times(b.height).gt(a.width.times(a.height)) ? b : a),
    undefined,
  );
  return {
    rects: kept,
    bayCount,
    reserved: largest,
    reservedPieces,
    wholeFootprint: true,
    reservedInCornersM2: new Decimal(inCorners).div(1_000_000),
    baysTakenByReserved,
    ramp,
    crossAisleAreaM2,
    baysLostToCrossAisle: baysLostToConnectors,
    strandedBays,
    baysUnderCore,
    notes,
    refusal: undefined,
  };
}

/**
 * Reflect a packing about the diagonal: what was packed `D × W` reads `W × D`.
 *
 * A reflection, not a rotation. For a field of axis-aligned rectangles the two
 * are the same arrangement seen from the other side, and the reflected layout is
 * as buildable as the one it came from — every bay keeps its dimensions, every
 * aisle keeps its width, and the ramp still runs down one edge.
 */
const flip = (r: Rect): Rect => ({ x: r.y, y: r.x, width: r.height, height: r.width });

function transpose(p: Packing): Packing {
  return {
    ...p,
    rects: p.rects.map((r) => ({ kind: r.kind, row: r.row, ...flip(r) })),
    reserved: p.reserved ? flip(p.reserved) : undefined,
    ...(p.reservedPieces ? { reservedPieces: p.reservedPieces.map(flip) } : {}),
  };
}

/**
 * Lay out one parking level.
 *
 * Returns placed rectangles, not just a count, so the result can be drawn,
 * exported to DXF and argued with. A reviewer who disagrees can point at a bay.
 */
export function layoutParkingLevel(input: ParkingLayoutInput): ParkingLayoutResult {
  const { tracer, footprint } = input;
  const angle = input.angle ?? ParkingAngle.DEG_90;
  const driveway = input.driveway ?? DrivewayType.TWO_WAY;
  const standard = standardFor(angle, driveway);
  const notes: string[] = [];

  if (footprint.widthM.lte(0) || footprint.depthM.lte(0)) {
    throw new ParkingLayoutError(
      'parking level footprint must have positive width and depth; ' +
        `got ${footprint.widthM.toString()} × ${footprint.depthM.toString()} m`,
    );
  }
  if (input.deductionsTraced === undefined && input.deductions === undefined) {
    throw new ParkingLayoutError(
      'a parking level needs a deduction for cores, plant and ramp landing — ' +
        'either declared here or handed over as a traced node. Packing the whole ' +
        'level would report bays standing in the lift lobby.',
    );
  }
  if (
    input.deductionsTraced === undefined &&
    input.deductions !== undefined &&
    input.deductions.source === 'ASSUMED' &&
    !input.deductions.basis
  ) {
    throw new ParkingLayoutError(
      'an ASSUMED deduction for cores and plant requires a basis. The deduction ' +
        'moves the bay count directly, so an undocumented one is a guess wearing ' +
        'the costume of a number.',
    );
  }

  const bayWidth = new Decimal(standard.bayWidthM);
  const bayLength = new Decimal(standard.bayLengthM);
  const aisleWidth = new Decimal(standard.drivewayWidthM);

  // --- the double-loaded module ------------------------------------------
  const moduleDepthValue = bayLength.times(2).plus(aisleWidth);
  const moduleDepth = tracer.derived('parking.module_depth_m', moduleDepthValue, {
    rule: { ruleId: 'DBC.B.7.2.4.TABLE_B11', citation: TABLE_B11 },
    formula: `2 × ${bayLength.toString()} m bay + ${aisleWidth.toString()} m aisle`,
    unit: 'm',
    detail: {
      note:
        'A double-loaded module: bays, drive aisle, bays. This is the unit a ' +
        'parking level is designed in, and the depth the client\'s own drawings ' +
        'show at 6.00 m of aisle between 5.5 m bay runs.',
    },
  });

  // --- deduct cores, plant and ramp landing before packing ----------------
  const grossArea = footprint.widthM.times(footprint.depthM);
  const declared = input.deductions;
  const deductionTraced =
    input.deductionsTraced ??
    (declared!.source === 'USER_SET'
      ? tracer.userSet('parking.layout_deductions_m2', declared!.areaM2, {
          actor: declared!.actor ?? { id: 'unknown', name: 'unnamed user' },
          label: 'core, plant and circulation deduction',
          unit: 'm²',
        })
      : tracer.assumed('parking.layout_deductions_m2', declared!.areaM2, {
          basis: declared!.basis ?? '',
          unit: 'm²',
        }));
  const deductedM2 = deductionTraced.value;

  const usableAreaValue = grossArea.minus(deductedM2);
  if (usableAreaValue.lte(0)) {
    throw new ParkingLayoutError(
      `deductions of ${deductedM2.toString()} m² exceed the level's ` +
        `${qArea(grossArea).toString()} m². No bays can be placed.`,
    );
  }
  const usableArea = tracer.computed('parking.layout_usable_area_m2', qArea(usableAreaValue), {
    formula: `${qArea(grossArea).toString()} m² gross − ${deductedM2.toString()} m² deducted`,
    uses: { deductions: deductionTraced },
    unit: 'm²',
  });

  // --- the structural clearance -------------------------------------------
  const gridColumnPenalty =
    input.structuralGridM === undefined ? ZERO : new Decimal(STRUCTURAL_CLEARANCE_M);
  const effectiveBayWidth = bayWidth.plus(gridColumnPenalty);
  if (input.structuralGridM !== undefined) {
    notes.push(
      `Bay width charged at ${effectiveBayWidth.toString()} m rather than ` +
        `${bayWidth.toString()} m: on a ${input.structuralGridM.toString()} m grid, ` +
        'columns interrupt door swings and Table B.11 requires an additional 300 mm.',
    );
  }

  // --- the column gap between groups of bays --------------------------------
  const columnGap = input.columnGap;
  if (columnGap) {
    if (input.structuralGridM !== undefined) {
      throw new ParkingLayoutError(
        'a level was given both a structural grid and a column gap between groups of bays. ' +
          'They are two models of the same columns — one widens every bay, the other leaves a ' +
          'gap between groups — and charging both would count the columns twice.',
      );
    }
    if (!Number.isInteger(columnGap.everyBays) || columnGap.everyBays < 1 || columnGap.gapM.value.lt(0)) {
      throw new ParkingLayoutError(
        `a column gap of ${columnGap.gapM.value.toString()} m every ${columnGap.everyBays} bays ` +
          'describes no run of bays: the group must be a whole number of bays and the gap not negative.',
      );
    }
    const every = columnGap.everyBays;
    const gap = columnGap.gapM.value;
    notes.push(
      `${gap.toFixed(2)} m is left clear after every ${every} bays along a run, for the columns: ` +
        `${every} × ${bayWidth.toFixed(2)} m + ${gap.toFixed(2)} m = ` +
        `${bayWidth.times(every).plus(gap).toFixed(2)} m to a group. No column is drawn in the gap ` +
        'and none is sized. Table B.11 asks a further 300 mm for a bay beside a structural ' +
        'element, which is not added: whether the gap already includes it is NOT ASSESSED.',
    );
  }
  const columnEvery = columnGap ? columnGap.everyBays : 0;
  const columnGapM = columnGap ? columnGap.gapM.value : ZERO;

  // --- pack it both ways round --------------------------------------------
  // The deduction is taken off the depth so the packing runs on a real
  // rectangle. Taking it off as an abstract area would leave rows placed where
  // the core is, which is exactly the drawing nobody can build. Each orientation
  // takes it off its own depth, so the same area comes off either way.
  /*
    THE CORE STANDS WHERE IT IS DRAWN, so the strip no longer deducts it. The
    strip is what is left of the deduction — plant, the ramp landing, circulation
    — and the core is taken where it actually is. A core larger than the whole
    deduction leaves no strip, and says so.
  */
  const coreAreaM2 = input.core ? input.core.areaM2.value : ZERO;
  const stripM2 = Decimal.max(ZERO, deductedM2.minus(coreAreaM2));
  const reservedAreaM2 = input.core
    ? tracer.computed('parking.reserved_strip_m2', qArea(stripM2), {
        formula:
          `max(0, ${deductedM2.toString()} m² deducted − ${coreAreaM2.toFixed(2)} m² core, ` +
          'which stands where it is drawn)',
        uses: { deductions: deductionTraced, core: input.core.areaM2 },
        unit: 'm²',
      })
    : deductionTraced;
  if (input.core && coreAreaM2.gt(deductedM2)) {
    notes.push(
      `The core (${coreAreaM2.toFixed(2)} m²) is larger than the whole deduction for cores, ` +
        `plant and circulation (${deductedM2.toString()} m²), so no strip is reserved: the ` +
        'usable fraction is more generous than this core allows.',
    );
  }

  // --- what a ramp needs, before anything is packed -------------------------
  const includeRamp = input.includeRamp ?? false;
  // A stated arrangement this engine cannot lay out is refused before anything is
  // packed, whichever candidate would have won: it is somebody's request.
  const statedType = input.rampPlan?.type ?? input.rampType;
  if (includeRamp && statedType !== undefined && !rampTypeSpec(statedType).placed) {
    const spec = rampTypeSpec(statedType);
    throw new ParkingLayoutError(
      `a ${spec.label} cannot be laid out by this engine: ${spec.note} It is ` +
        'enumerated in RAMP_TYPES so that it is a named candidate with a reason ' +
        'rather than an omission, and refused rather than approximated.',
    );
  }
  const storey =
    input.storeyHeightM ??
    (includeRamp
      ? tracer.assumed('parking.storey_height_m', new Decimal(ASSUMED_STOREY_M), {
          basis: ASSUMED_STOREY_BASIS,
          label: 'storey a ramp climbs',
          unit: 'm',
        })
      : undefined);
  const requirement = includeRamp && storey ? straightRampRequirement(tracer, storey) : undefined;

  const common = {
    bayWidth,
    bayLength,
    aisleWidth,
    moduleDepth: moduleDepthValue,
    effectiveBayWidth,
    columnEvery,
    columnGapM,
    includeRamp,
    rampWidthM: requirement ? requirement.widthM.value : ZERO,
    rampRunM: requirement ? requirement.runM.value : ZERO,
    storeyHeightM: storey ? storey.value : ZERO,
  };
  /*
    WITH A CORE ON THE LEVEL, TWO ARRANGEMENTS EACH WAY ROUND: one cross aisle,
    or one at each end. The better is kept, as the orientation is. Without a core
    nothing is cut and the second cross aisle only costs width, so it is not
    tried — a run with no core packs exactly as it always did.
  */
  const best = (a: Packing, b: Packing): Packing => (b.bayCount > a.bayCount ? b : a);
  const packBoth = (
    opts: Omit<PackOptions, 'farCrossAisle' | 'nearCrossAisle' | 'offsetM'>,
  ): Packing => {
    const one = packLevel({ ...opts, nearCrossAisle: true, farCrossAisle: false, offsetM: ZERO });
    if (opts.obstructions.length === 0) return one;
    /*
      A FIXED SWEEP, NOT A DESIGN SEARCH. The core does not move — where it stands
      is the run's assumption or the user's statement. What is tried is where the
      module grid starts against it (every 1 m across one module depth, and only
      where the core strands bays at the start) and which
      end the cross aisle runs down (by the ramp, the far end, or both — the core
      can stand across the one by the ramp). The candidates are the same every
      time and the most bays wins, ties going to the earlier, so the answer is
      reproducible.
    */
    const arrangements = [
      [true, false],
      [true, true],
      [false, true],
    ] as const;
    let kept = one;
    for (const [near, far] of arrangements.slice(1)) {
      kept = best(kept, packLevel({ ...opts, nearCrossAisle: near, farCrossAisle: far, offsetM: ZERO }));
    }
    // The grid is slid only when the core still strands bays where it starts:
    // it is the expensive half of the sweep, and it has nothing to win otherwise.
    if (kept.strandedBays === 0) return kept;
    const step = new Decimal(1);
    for (let offset = step; offset.lt(opts.moduleDepth); offset = offset.plus(step)) {
      for (const [near, far] of arrangements) {
        kept = best(kept, packLevel({ ...opts, nearCrossAisle: near, farCrossAisle: far, offsetM: offset }));
      }
    }
    return kept;
  };
  const alongWidth = packBoth({
    ...common,
    widthM: footprint.widthM,
    grossDepthM: footprint.depthM,
    deductedDepthM: stripM2.div(footprint.widthM),
    obstructions: input.core ? [input.core.rect] : [],
  });
  const alongDepth = transpose(
    packBoth({
      ...common,
      widthM: footprint.depthM,
      grossDepthM: footprint.widthM,
      deductedDepthM: stripM2.div(footprint.depthM),
      // This pass is packed in the reflected frame and reflected back after.
      obstructions: input.core ? [flip(input.core.rect)] : [],
    }),
  );

  /*
    THE THIRD CANDIDATE — bays against all four walls, one ring, the core on the
    island. The client's own drawings of this plot are laid out this way, and on
    a level too shallow for two modules it is the arrangement that lets the core
    stand on the level at all. Packed every time and reported whether or not it
    wins, exactly as the two orientations are. See `packPerimeter`.
  */
  const ringOpts = {
    ...common,
    widthM: footprint.widthM,
    grossDepthM: footprint.depthM,
    deductedDepthM: stripM2.div(footprint.widthM),
    obstructions: input.core ? [input.core.rect] : [],
    nearCrossAisle: true,
    farCrossAisle: false,
    offsetM: ZERO,
  };
  const perimeter = packPerimeter({ ...ringOpts, ringRamp: 'STRAIGHT' });
  /*
    THE FOURTH CANDIDATE, ONLY WHERE A RAMP IS NEEDED: the same ring with the
    ring aisle sloped instead of a ramp on the island — the client's own podium.
    Enumerated, packed every time and reported, like the other three.
  */
  // A ramp arrangement somebody stated is a ramp strip: the sloped ring is then
  // not a candidate, because it is not the ramp they asked for.
  const sloped =
    includeRamp && statedType === undefined && input.slopedRing !== false
      ? packPerimeter({ ...ringOpts, ringRamp: 'SLOPED' })
      : undefined;

  /*
    THE FIFTH AND SIXTH, ONLY WHERE THE FOOTPRINT IS NOT THE RECTANGLE: rows laid
    across the whole of it, one way round and the other. See `packField`.
  */
  const field = input.field;
  const fieldStripM2 = field ? Decimal.max(ZERO, field.deductionsTraced.value.minus(coreAreaM2)) : ZERO;
  const fieldOf = (polygon: readonly XY[], obstructions: readonly Rect[]): Packing => {
    const opts = {
      ...ringOpts,
      deductedDepthM: ZERO,
      obstructions,
      polygon,
      reservedM2: fieldStripM2,
    };
    const one = packField({ ...opts, loop: false });
    return obstructions.length === 0 ? one : best(one, packField({ ...opts, loop: true }));
  };
  const fieldWidth = field ? fieldOf(field.polygonMm, input.core ? [input.core.rect] : []) : undefined;
  const fieldDepth = field
    ? transpose(
        fieldOf(
          field.polygonMm.map((p) => ({ x: p.y, y: p.x })),
          input.core ? [flip(input.core.rect)] : [],
        ),
      )
    : undefined;

  const ORIENTATION = {
    WIDTH: 'modules along the width',
    DEPTH: 'modules along the depth',
    PERIMETER: 'bays to the walls, one ring aisle',
    SLOPED: 'bays to the walls, the ring aisle sloped as the ramp',
    FIELD_WIDTH: 'rows across the whole footprint, along the width',
    FIELD_DEPTH: 'rows across the whole footprint, along the depth',
  } as const;
  const candidates = [
    { packing: alongWidth, name: ORIENTATION.WIDTH, id: ParkingArrangement.WIDTH },
    { packing: alongDepth, name: ORIENTATION.DEPTH, id: ParkingArrangement.DEPTH },
    { packing: perimeter, name: ORIENTATION.PERIMETER, id: ParkingArrangement.PERIMETER },
    ...(sloped ? [{ packing: sloped, name: ORIENTATION.SLOPED, id: ParkingArrangement.SLOPED }] : []),
    ...(fieldWidth ? [{ packing: fieldWidth, name: ORIENTATION.FIELD_WIDTH, id: ParkingArrangement.FIELD_WIDTH }] : []),
    ...(fieldDepth ? [{ packing: fieldDepth, name: ORIENTATION.FIELD_DEPTH, id: ParkingArrangement.FIELD_DEPTH }] : []),
  ] as const;
  const arrangements: readonly ArrangementCandidate[] = candidates.map((c) => ({
    id: c.id,
    name: c.name,
    bayCount: c.packing.bayCount,
    ...(c.packing.refusal ? { refusal: c.packing.refusal } : {}),
  }));

  if (candidates.every((c) => c.packing.bayCount === 0)) {
    throw new ParkingLayoutError(
      `no parking level can be laid out in ${footprint.widthM.toFixed(2)} × ` +
        `${footprint.depthM.toFixed(2)} m. Modules along the width: ` +
        `${alongWidth.refusal ?? 'no bays placed'}. Modules along the depth: ` +
        `${alongDepth.refusal ?? 'no bays placed'}. Bays to the walls: ` +
        `${perimeter.refusal ?? 'no bays placed'}.` +
        (sloped ? ` The ring sloped as the ramp: ${sloped.refusal ?? 'no bays placed'}.` : '') +
        (fieldWidth ? ` Rows across the whole footprint: ${fieldWidth.refusal ?? 'no bays placed'}.` : ''),
    );
  }
  // Ties go to the earlier candidate, so the answer does not depend on the order
  // two equal packings happened to be built in.
  const stated = input.arrangement;
  const statedCandidate = stated ? candidates.find((c) => c.id === stated.id) : undefined;
  if (stated && !statedCandidate) {
    throw new ArrangementChoiceRefusedError(
      `the parking arrangement ${stated.id} is not one this level can be packed in: ` +
        (stated.id === ParkingArrangement.SLOPED
          ? 'the ring may be the ramp only where there are two parking levels or more and no ramp strip was stated. '
          : 'rows across the whole footprint are offered only where the footprint is not itself a rectangle. ') +
        `This level offers ${candidates.map((c) => `${c.id} (${c.packing.bayCount} bays)`).join(', ')}.`,
    );
  }
  if (statedCandidate && statedCandidate.packing.bayCount === 0) {
    throw new ArrangementChoiceRefusedError(
      `the parking arrangement ${statedCandidate.id} places no bay on this level` +
        (statedCandidate.packing.refusal ? `: ${statedCandidate.packing.refusal}` : '.') +
        ` This level offers ${candidates.map((c) => `${c.id} (${c.packing.bayCount} bays)`).join(', ')}.`,
    );
  }
  const winner = statedCandidate ?? candidates.reduce((a, b) => (b.packing.bayCount > a.packing.bayCount ? b : a));
  const packing = winner.packing;
  const chosen = winner.name;
  const listed = candidates.map((c) => `${c.packing.bayCount} ${c.name}`).join(', ');
  const orientation = ((): Traced<string> => {
    if (stated?.actor) {
      return tracer.userSet('parking.module_orientation', chosen, { actor: stated.actor, label: 'parking arrangement' });
    }
    if (stated) {
      // Handed in under nobody's name: an assumption saying so, not somebody's statement.
      return tracer.assumed('parking.module_orientation', chosen, {
        basis:
          `The arrangement "${chosen}" was handed to the layout with no named user attached. ` +
          `Every arrangement on this level: ${listed}.`,
        label: 'parking arrangement',
      });
    }
    return tracer.derived('parking.module_orientation', chosen, {
      rule: { ruleId: 'DBC.B.7.2.4.TABLE_B11', citation: TABLE_B11 },
      formula: `max(${listed})`,
      uses: { moduleDepth },
      detail: {
        note:
          'Every enumerated arrangement is packed and the best is taken. This searches an ' +
          'arrangement, not a design: the candidate list is the same on every run, ' +
          'all of them are reported, the core stands where the run already put it, and ' +
          'the answer is reproducible. It is not the ramp-and-core optimiser, which ' +
          'is a TRADEOFF value Phase 0 refuses to emit.',
      },
    });
  })();
  notes.push(...packing.notes);
  const losers = candidates.filter((c) => c !== winner);
  if (losers.some((c) => c.packing.bayCount !== packing.bayCount)) {
    notes.push(
      `Laid out as ${chosen}${statedCandidate ? ', as picked' : ''}: ${packing.bayCount} bays, against ` +
        losers
          .map((c) => `${c.packing.bayCount} ${c.name}${c.packing.refusal ? ` (${c.packing.refusal})` : ''}`)
          .join('; ') +
        `, on the same level. All ${candidates.length} were packed.`,
    );
  }

  /*
    WHAT THE WINNER WAS CHARGED. Rows across the whole footprint pay the
    deduction on the whole footprint's area and are measured against it; every
    other arrangement, against the rectangle it packed.
  */
  const whole = packing.wholeFootprint === true && field !== undefined;
  const chargedDeduction = whole ? field.deductionsTraced : deductionTraced;
  const chargedM2 = chargedDeduction.value;
  const chargedGross = whole ? field.grossAreaM2 : grossArea;
  const chargedUsable = whole
    ? tracer.computed('parking.layout_usable_area_m2', qArea(chargedGross.minus(chargedM2)), {
        formula: `${qArea(chargedGross).toString()} m² footprint − ${chargedM2.toString()} m² deducted`,
        uses: { deductions: chargedDeduction },
        unit: 'm²',
      })
    : usableArea;
  const chargedStripM2 = whole ? fieldStripM2 : stripM2;
  const chargedReserved = !whole
    ? reservedAreaM2
    : input.core
      ? tracer.computed('parking.reserved_strip_m2', qArea(fieldStripM2), {
          formula:
            `max(0, ${chargedM2.toString()} m² deducted − ${coreAreaM2.toFixed(2)} m² core, ` +
            'which stands where it is drawn)',
          uses: { deductions: chargedDeduction, core: input.core.areaM2 },
          unit: 'm²',
        })
      : chargedDeduction;

  // --- the three losses ---------------------------------------------------
  // A bay's charged width, its share of the column gap after its group included.
  const chargedBayWidth = columnEvery > 0 ? effectiveBayWidth.plus(columnGapM.div(columnEvery)) : effectiveBayWidth;
  const marginalAreaPerBay = moduleDepthValue.times(chargedBayWidth).div(2);
  const losses: ParkingLosses = {
    marginalAreaPerBayM2: marginalAreaPerBay,
    reserved: {
      areaM2: chargedM2,
      // Where the rows cover the whole footprint the cost is counted, not
      // estimated: the bays the core and the reserved pieces actually displaced.
      bays: whole
        ? (packing.baysTakenByReserved ?? 0) + packing.baysUnderCore
        : chargedM2.div(marginalAreaPerBay).floor().toNumber(),
    },
    circulation: {
      areaM2: packing.crossAisleAreaM2,
      bays: packing.baysLostToCrossAisle,
      strandedBays: packing.strandedBays,
    },
  };
  if (whole) {
    const corners = packing.reservedInCornersM2 ?? ZERO;
    notes.push(
      `Of the ${chargedM2.toFixed(0)} m² deducted for cores, plant and the ramp landing, ` +
        (input.core
          ? `${coreAreaM2.toFixed(0)} m² is the core, standing where it is drawn ` +
            `(${packing.baysUnderCore} bay(s) were not placed there); `
          : '') +
        `${corners.toFixed(0)} m² stands in the stretches of the bay rows that no aisle serves, ` +
        `where it costs no bay; and ${chargedStripM2.minus(corners).toFixed(0)} m² takes ` +
        `${packing.baysTakenByReserved ?? 0} bay(s) in the rows farthest from the base. ` +
        'Counted, not estimated.',
    );
  } else if (losses.reserved.bays > 0) {
    notes.push(
      `The ${chargedM2.toFixed(0)} m² deducted for cores, plant and the ramp landing ` +
        `costs about ${losses.reserved.bays} bays at ${marginalAreaPerBay.toFixed(2)} m² ` +
        'each — the area one more bay takes inside a module, not the gross area per bay.' +
        (input.core
          ? ` Of it, ${coreAreaM2.toFixed(0)} m² is the core, standing where it is drawn ` +
            `(${packing.baysUnderCore} bay(s) were not placed there), and ` +
            `${chargedStripM2.toFixed(0)} m² is the strip reserved at the edge.`
          : ''),
    );
  }
  if (losses.circulation.bays > 0) {
    // Rows across the footprint have no cross aisle; what joins them is the
    // connectors through the bay rows, and the note names what was drawn.
    notes.push(
      `The ${whole ? 'connectors between the rows cost' : 'cross aisle costs'} ${losses.circulation.bays} bays across ` +
        `${packing.crossAisleAreaM2.toFixed(0)} m². That is the price of every bay on ` +
        'the level being reachable, and it is stated rather than folded into a ratio.',
    );
  }

  const bayCountTraced = tracer.derived('parking.laid_out_bays', packing.bayCount, {
    rule: { ruleId: 'DBC.B.7.2.4.TABLE_B11', citation: TABLE_B11 },
    formula:
      `${packing.rects.filter((r) => r.kind === RectKind.BAY).length} bays placed ` +
      `with the runs ${chosen}, each served by an aisle that reaches the way in` +
      (columnGap ? `, ${columnGapM.toFixed(2)} m left after every ${columnEvery} bays for the columns` : ''),
    uses: { moduleDepth, usableArea: chargedUsable, orientation, ...(columnGap ? { columnGap: columnGap.gapM } : {}) },
    unit: 'bays',
    detail: {
      note:
        'Bays actually placed in the footprint, not bays implied by an area ratio. ' +
        'A count derived by dividing area by a factor cannot tell you it does not ' +
        'fit — nor that the car cannot get to it.',
    },
  });

  const areaPerBayValue = chargedGross.div(packing.bayCount);
  const areaPerBay = tracer.computed('parking.area_per_bay_m2', qArea(areaPerBayValue), {
    formula: `${qArea(chargedGross).toString()} m² level ÷ ${packing.bayCount} bays`,
    uses: { bays: bayCountTraced },
    unit: 'm²/bay',
    detail: {
      /*
        No developer and no target figure in this string. It is emitted into every
        run's provenance graph and read by whoever opens the derivation, and a
        developer's brief is that developer's confidential commercial expectation —
        the same reason `saleable_efficiency` basis strings name no brief. The
        comparison, where a brief applies, is made on the standards screen.
      */
      note:
        'Comparable to a parking-efficiency target in a developer brief, where one ' +
        'applies: the gross level area each placed bay costs, in the same unit.',
    },
  });

  let ramp: ParkingLayoutResult['ramp'];
  let slopedFloor: ParkingLayoutResult['slopedFloor'];
  if (packing.slopedLapM && storey) {
    const { gradientPct } = slopedFloorGradient(tracer, storey, packing.slopedLapM);
    const runs = input.rampPlan
      ? resolveRampRuns({
          tracer,
          schedule: input.rampPlan.schedule,
          ...(input.rampPlan.actor ? { actor: input.rampPlan.actor } : {}),
        })
      : undefined;
    slopedFloor = { lapM: packing.slopedLapM, gradientPct, runs };
  }

  // --- headroom over the ramp, as the budget the structure must fit in ----
  const headroom = storey && (packing.slopedLapM || (packing.ramp && requirement))
    ? rampHeadroom(tracer, storey)
    : undefined;
  if (headroom) {
    const s = storey!.value.toFixed(2);
    const budget = headroom.structuralBudgetM.value.toFixed(2);
    notes.push(
      headroom.feasible
        ? `Headroom (Table B.9, 2.4 m clear above any point of a ramp): the ramps stand in ` +
            `one strip on every level, so over each is the next, one ${s} m storey up. The ` +
            `slab, its beams and anything hung below them over the ramp may be at most ` +
            `${budget} m deep. No structure is drawn: this is the budget a design must fit ` +
            'in, not a statement that one does.'
        : `Headroom (Table B.9, 2.4 m clear above any point of a ramp) cannot be met: the ` +
            `storey is ${s} m, so a ramp under the same ramp one storey up has no room for ` +
            'any slab at all. The storey height has to change before this ramp can be built.',
    );
  }
  if (packing.ramp && requirement) {

    // --- what kind of ramp ------------------------------------------------
    const chosenType = statedType ?? RampType.STRAIGHT;
    const spec = rampTypeSpec(chosenType);
    if (!spec.placed) {
      throw new ParkingLayoutError(
        `a ${spec.label} cannot be laid out by this engine: ${spec.note} It is ` +
          'enumerated in RAMP_TYPES so that it is a named candidate with a reason ' +
          'rather than an omission, and refused rather than approximated.',
      );
    }
    const stated = statedType !== undefined;
    const statedBy = input.rampPlan?.type !== undefined ? input.rampPlan.actor : input.rampTypeActor;
    const rampType = ((): Traced<RampType> => {
      if (stated && statedBy) {
        return tracer.userSet('parking.ramp_type', chosenType, {
          actor: statedBy,
          label: 'ramp arrangement',
        });
      }
      /*
        A TYPE UNDER NOBODY'S NAME IS NOT `USER_SET`. A caller can hand a type in
        without an actor — a test, or a screen that has not asked who is asking —
        and taking that as a user's statement would attribute a choice to a person
        who is not identified. It is an assumption with a basis saying so, which is
        the weaker and the true answer.
      */
      return tracer.assumed('parking.ramp_type', chosenType, {
        basis: stated
          ? `${spec.label}. ${spec.note} The arrangement was handed to the layout ` +
            'with no named user attached, so it is reported as an assumption rather ' +
            'than as somebody\'s statement.'
          : RAMP_TYPE_BASIS,
        label: 'ramp arrangement',
      });
    })();
    notes.push(
      `Ramp arrangement: ${spec.label}. ${spec.note} The other ` +
        `${RAMP_TYPES.length - 1} enumerated arrangement(s) are reported beside it. ` +
        'The engine does not rank them and does not search for the best one: that is ' +
        'the ramp-and-core optimiser of 34:37, a TRADEOFF value Phase 0 refuses to emit.',
    );

    // --- which way it runs --------------------------------------------------
    /*
      THE SIGN, DERIVED FROM THE SCHEDULE OR NOT AT ALL. Where no schedule
      reached the layout the direction is left `undefined` and said in words,
      because the thing that was there before was not a default somebody chose —
      it was the absence of a decision, and an absence renders no amber.
    */
    const runs = input.rampPlan
      ? resolveRampRuns({
          tracer,
          schedule: input.rampPlan.schedule,
          ...(input.rampPlan.actor ? { actor: input.rampPlan.actor } : {}),
        })
      : undefined;
    if (runs === undefined) {
      notes.push(
        'WHICH WAY THE RAMP RUNS IS NOT ESTABLISHED. No level schedule reached the ' +
          'layout, so this strip is a plan rectangle with no direction: a ramp to a ' +
          'basement descends, a ramp to a podium parking level climbs, and nothing ' +
          'here knows which this is. It is reported rather than filled, because what ' +
          'it would be filled with is the figure that drew every ramp in every scheme ' +
          'sloping the same way — wrong in the DXF, and not only on screen.',
      );
    } else if (runs.length === 0) {
      notes.push(
        'A ramp strip is reserved and no ramp runs up it: this schedule puts every ' +
          'parking level on the ground floor, which is reached by the driveway. The ' +
          'strip still costs its width in bays, and that cost is in the losses.',
      );
    } else {
      const down = runs.filter((r) => r.direction.value === RampDirection.DESCENDS).length;
      const up = runs.length - down;
      notes.push(
        `${runs.length} ramp(s), each serving one parking level: ` +
          `${down} descending to a level below grade and ${up} climbing to a level ` +
          'above it. Grade is the datum and a car enters at grade. Each is sized to ' +
          'Tables B.9 and B.10; its headroom is the structural budget stated beside it.',
      );
      /*
        A MEASURED ZERO, NOT AN UNMEASURED NULL. "We reversed it and the answer did
        not change" is an answer; `null` is not — the same argument `core.ts` makes
        for the core area. And the measurement is the explanation of how this
        shipped: the direction is an operand of no capacity formula and of no bay
        count, so every gate that compares a renderer against the engine agreed
        with the engine about the wrong sign. `parking.ramp_direction` cannot be
        perturbed by ±10% — it is categorical — so the register cannot rank it, and
        this edge is where the zero is recorded instead of being left unsaid.
      */
      for (const r of runs) {
        tracer.sensitiveTo(bayCountTraced, r.direction, {
          relativeEffect: '0',
          perturbation:
            'the ramp direction reversed — it enters no bay-count and no capacity ' +
            'formula, so the measured effect on both is exactly zero, and the effect ' +
            'on every drawing and every DXF is total',
        });
      }
    }

    // Drawn at exactly the size the code requires: a packing without that room
    // refused, so there is no clipped run to trace any more.
    ramp = {
      widthM: requirement.widthM,
      runM: requirement.runM,
      slopePct: requirement.slopePct,
      type: rampType,
      candidates: RAMP_TYPES,
      runs,
    };
  }

  return {
    rects: packing.rects,
    ramp,
    ...(slopedFloor ? { slopedFloor } : {}),
    ...(headroom ? { headroom } : {}),
    reserved: packing.reserved,
    reservedPieces: packing.reservedPieces ?? (packing.reserved ? [packing.reserved] : []),
    reservedAreaM2: chargedReserved,
    deductionsM2: chargedDeduction,
    wholeFootprint: whole,
    baysUnderCore: packing.baysUnderCore,
    bayCount: bayCountTraced,
    areaPerBayM2: areaPerBay,
    moduleDepthM: moduleDepth,
    usableAreaM2: chargedUsable,
    standard,
    orientation,
    arrangement: winner.id,
    arrangements,
    losses,
    notes,
  };
}
