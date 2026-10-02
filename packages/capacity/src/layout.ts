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
  qArea,
  type Citation,
  type Traced,
  type TracedDecimal,
  type Tracer,
} from '@envelope/core';

import { bayIsServed, traceCirculation, type CircRect } from './circulation.js';

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
  override readonly name = 'ParkingLayoutError';
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
  AISLE: 'AISLE',
  RAMP: 'RAMP',
  OBSTRUCTION: 'OBSTRUCTION',
} as const;
export type RectKind = (typeof RectKind)[keyof typeof RectKind];

/** The row a cross aisle carries: it serves every module rather than one. */
export const CROSS_AISLE_ROW = -2;
/** The row the ramp strip carries. */
export const RAMP_ROW = -1;

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
  readonly losses: ParkingLosses;
  /**
   * The ramp strip's plan size, traced, when the level reserves one.
   *
   * Both were constants in this file with no derivation — a 6 m × 30 m strip
   * that moved the bay count by a whole run of bays, and nothing a reader could
   * open to ask why 30. They are assumptions and are now declared as such.
   */
  readonly ramp: { readonly widthM: TracedDecimal; readonly runM: TracedDecimal } | undefined;
  /**
   * The strip the deduction was taken from, in the same local metres as `rects`:
   * the full width, at the far end of the depth. Undefined when nothing was
   * deducted. It is where the cores and plant are *allowed* to be on this
   * drawing, not where anyone put them.
   */
  readonly reserved: Rect | undefined;
  /**
   * The area of that strip, traced: the deduction, less the core when the core
   * stands where it is drawn. The deduction itself when no core was given.
   */
  readonly reservedAreaM2: TracedDecimal;
  /** Bays the core covers, which were not placed. Zero when no core was given. */
  readonly baysUnderCore: number;
  /** Rows that came out partial, and why. Reported, not hidden. */
  readonly notes: readonly string[];
}

/**
 * Ramp geometry.
 *
 * B.7.2.2 governs vehicular ramps in detail (gradient, transitions, headroom);
 * this places a footprint of the right size and says plainly that gradient
 * compliance is not assessed. Drawing a ramp that reads as checked when only its
 * plan dimension was considered would be worse than drawing none.
 */
const RAMP_WIDTH_M = '6';
const RAMP_RUN_M = '30';

const RAMP_WIDTH_BASIS =
  'A 6 m strip: the two-way driveway width of Table B.11, so two cars pass on the ' +
  'ramp as they do in the aisle. B.7.2.2 sets its own ramp widths and they are not ' +
  'encoded here, so this width is not checked against them.';
const RAMP_RUN_BASIS =
  'A 30 m run reserved for the ramp in plan, or the whole packable depth when that ' +
  'is shorter. It sets the gradient the ramp needs to climb one level, which is ' +
  'reported but not assessed: B.7.2.2 is not encoded. A longer run costs bays; a ' +
  'shorter one steepens the ramp.';

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
  readonly includeRamp: boolean;
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
  readonly ramp: { readonly widthM: Decimal; readonly runM: Decimal } | undefined;
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
    const rampWidth = Decimal.min(new Decimal(RAMP_WIDTH_M), o.widthM);
    const rampRun = Decimal.min(new Decimal(RAMP_RUN_M), availableDepth0);
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
      `A ${rampWidth.toString()} m × ${rampRun.toFixed(2)} m ramp strip is reserved down one ` +
        'edge, and the bay runs are packed into the remaining width. Gradient, ' +
        'transitions and headroom under B.7.2.2 are NOT ASSESSED — only the plan ' +
        'area is reserved.',
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
  const baysPerRun = packWidth.div(o.effectiveBayWidth).floor().toNumber();
  if (baysPerRun < 1) {
    return refused(
      `a ${packWidth.toFixed(2)} m packable width cannot hold one ` +
        `${o.effectiveBayWidth.toString()} m bay run` +
        (o.includeRamp ? ' once the ramp strip and the cross aisle are reserved' : ''),
    );
  }
  const baysPerRunUnconnected = o.widthM
    .minus(rampX)
    .div(o.effectiveBayWidth)
    .floor()
    .toNumber();

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
        x: runX.plus(o.effectiveBayWidth.times(i)),
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

  const common = {
    bayWidth,
    bayLength,
    aisleWidth,
    moduleDepth: moduleDepthValue,
    effectiveBayWidth,
    includeRamp: input.includeRamp ?? false,
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

  if (alongWidth.bayCount === 0 && alongDepth.bayCount === 0) {
    throw new ParkingLayoutError(
      `no parking level can be laid out in ${footprint.widthM.toFixed(2)} × ` +
        `${footprint.depthM.toFixed(2)} m. Modules along the width: ` +
        `${alongWidth.refusal ?? 'no bays placed'}. Modules along the depth: ` +
        `${alongDepth.refusal ?? 'no bays placed'}.`,
    );
  }
  const alongTheWidth = alongWidth.bayCount >= alongDepth.bayCount;
  const packing = alongTheWidth ? alongWidth : alongDepth;
  const ORIENTATION = {
    WIDTH: 'modules along the width',
    DEPTH: 'modules along the depth',
  } as const;
  const chosen = alongTheWidth ? ORIENTATION.WIDTH : ORIENTATION.DEPTH;
  const orientation = tracer.derived('parking.module_orientation', chosen, {
    rule: { ruleId: 'DBC.B.7.2.4.TABLE_B11', citation: TABLE_B11 },
    formula:
      `max(${alongWidth.bayCount} bays with the runs along the ` +
      `${footprint.widthM.toFixed(2)} m side, ${alongDepth.bayCount} bays along the ` +
      `${footprint.depthM.toFixed(2)} m side)`,
    uses: { moduleDepth },
    detail: {
      note:
        'Two orientations are packed and the better is taken. This searches an ' +
        'orientation, not a design: there are exactly two candidates, both are ' +
        'reported, and the answer is reproducible. It is not the ramp-and-core ' +
        'optimiser, which is a TRADEOFF value Phase 0 refuses to emit.',
    },
  });
  notes.push(...packing.notes);
  if (alongWidth.bayCount !== alongDepth.bayCount) {
    const other = alongTheWidth ? alongDepth : alongWidth;
    notes.push(
      `The runs are laid ${chosen}: ${packing.bayCount} bays against ${other.bayCount} ` +
        'the other way round, in the same rectangle. Both were packed.',
    );
  }

  // --- the three losses ---------------------------------------------------
  const marginalAreaPerBay = moduleDepthValue.times(effectiveBayWidth).div(2);
  const losses: ParkingLosses = {
    marginalAreaPerBayM2: marginalAreaPerBay,
    reserved: {
      areaM2: deductedM2,
      bays: deductedM2.div(marginalAreaPerBay).floor().toNumber(),
    },
    circulation: {
      areaM2: packing.crossAisleAreaM2,
      bays: packing.baysLostToCrossAisle,
      strandedBays: packing.strandedBays,
    },
  };
  if (losses.reserved.bays > 0) {
    notes.push(
      `The ${deductedM2.toFixed(0)} m² deducted for cores, plant and the ramp landing ` +
        `costs about ${losses.reserved.bays} bays at ${marginalAreaPerBay.toFixed(2)} m² ` +
        'each — the area one more bay takes inside a module, not the gross area per bay.' +
        (input.core
          ? ` Of it, ${coreAreaM2.toFixed(0)} m² is the core, standing where it is drawn ` +
            `(${packing.baysUnderCore} bay(s) were not placed there), and ` +
            `${stripM2.toFixed(0)} m² is the strip reserved at the edge.`
          : ''),
    );
  }
  if (losses.circulation.bays > 0) {
    notes.push(
      `The cross aisle costs ${losses.circulation.bays} bays across ` +
        `${packing.crossAisleAreaM2.toFixed(0)} m². That is the price of every bay on ` +
        'the level being reachable, and it is stated rather than folded into a ratio.',
    );
  }

  const bayCountTraced = tracer.derived('parking.laid_out_bays', packing.bayCount, {
    rule: { ruleId: 'DBC.B.7.2.4.TABLE_B11', citation: TABLE_B11 },
    formula:
      `${packing.rects.filter((r) => r.kind === RectKind.BAY).length} bays placed ` +
      `with the runs ${chosen}, each served by an aisle that reaches the way in`,
    uses: { moduleDepth, usableArea, orientation },
    unit: 'bays',
    detail: {
      note:
        'Bays actually placed in the footprint, not bays implied by an area ratio. ' +
        'A count derived by dividing area by a factor cannot tell you it does not ' +
        'fit — nor that the car cannot get to it.',
    },
  });

  const areaPerBayValue = grossArea.div(packing.bayCount);
  const areaPerBay = tracer.computed('parking.area_per_bay_m2', qArea(areaPerBayValue), {
    formula: `${qArea(grossArea).toString()} m² level ÷ ${packing.bayCount} bays`,
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
  if (packing.ramp) {
    const widthAssumed = tracer.assumed('parking.ramp_width_m', new Decimal(RAMP_WIDTH_M), {
      basis: RAMP_WIDTH_BASIS,
      label: 'ramp width',
      unit: 'm',
    });
    const runAssumed = tracer.assumed('parking.ramp_run_m', new Decimal(RAMP_RUN_M), {
      basis: RAMP_RUN_BASIS,
      label: 'ramp run',
      unit: 'm',
    });
    const drawnWidth = packing.ramp.widthM;
    const drawnRun = packing.ramp.runM;
    ramp = {
      widthM: drawnWidth.eq(widthAssumed.value)
        ? widthAssumed
        : tracer.computed('parking.ramp_width_drawn_m', drawnWidth, {
            formula: `min(${RAMP_WIDTH_M} m ramp width, ${footprint.widthM.toFixed(2)} m level width)`,
            uses: { width: widthAssumed },
            unit: 'm',
          }),
      runM: drawnRun.eq(runAssumed.value)
        ? runAssumed
        : tracer.computed('parking.ramp_run_drawn_m', drawnRun, {
            formula: `min(${RAMP_RUN_M} m ramp run, ${drawnRun.toFixed(2)} m packable depth)`,
            uses: { run: runAssumed, usable: usableArea },
            unit: 'm',
          }),
    };
  }

  return {
    rects: packing.rects,
    ramp,
    reserved: packing.reserved,
    reservedAreaM2,
    baysUnderCore: packing.baysUnderCore,
    bayCount: bayCountTraced,
    areaPerBayM2: areaPerBay,
    moduleDepthM: moduleDepth,
    usableAreaM2: usableArea,
    standard,
    orientation,
    losses,
    notes,
  };
}
