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

export interface PlacedRect extends Rect {
  readonly kind: RectKind;
  /** Row index, so a reviewer can talk about "the third module". */
  readonly row: number;
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

  // The deduction is taken off the depth so the packing runs on a real
  // rectangle. Taking it off as an abstract area would leave rows placed where
  // the core is, which is exactly the drawing nobody can build.
  const deductedDepth = deductedM2.div(footprint.widthM);
  let availableDepth = footprint.depthM.minus(deductedDepth);

  // --- ramp ---------------------------------------------------------------
  // Reserved as a strip down one edge, running the full depth, and the bay runs
  // are packed into the width that is left. Placing it as a rectangle *over* the
  // packing area would put it on top of bays that were then still counted —
  // a drawing showing a ramp parked across eight cars, and a bay count eight too
  // high. The strip is how ramps are actually arranged, and it is honest about
  // the width it costs.
  const rects: PlacedRect[] = [];
  const cursorX = input.includeRamp
    ? Decimal.min(new Decimal(RAMP_WIDTH_M), footprint.widthM)
    : new Decimal(0);
  let cursorY = new Decimal(0);

  let ramp: ParkingLayoutResult['ramp'];
  if (input.includeRamp) {
    const rampRun = Decimal.min(new Decimal(RAMP_RUN_M), availableDepth);
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
    ramp = {
      widthM: cursorX.eq(widthAssumed.value)
        ? widthAssumed
        : tracer.computed('parking.ramp_width_drawn_m', cursorX, {
            formula: `min(${RAMP_WIDTH_M} m ramp width, ${footprint.widthM.toFixed(2)} m level width)`,
            uses: { width: widthAssumed },
            unit: 'm',
          }),
      runM: rampRun.eq(runAssumed.value)
        ? runAssumed
        : tracer.computed('parking.ramp_run_drawn_m', rampRun, {
            formula: `min(${RAMP_RUN_M} m ramp run, ${availableDepth.toFixed(2)} m packable depth)`,
            uses: { run: runAssumed, usable: usableArea },
            unit: 'm',
          }),
    };
    rects.push({
      kind: RectKind.RAMP,
      row: -1,
      x: new Decimal(0),
      y: new Decimal(0),
      width: cursorX,
      height: rampRun,
    });
    notes.push(
      `A ${cursorX.toString()} m × ${rampRun.toFixed(2)} m ramp strip is reserved down one ` +
        'edge, and the bay runs are packed into the remaining width. Gradient, ' +
        'transitions and headroom under B.7.2.2 are NOT ASSESSED — only the plan ' +
        'area is reserved.',
    );
  }
  const packWidth = footprint.widthM.minus(cursorX);

  // --- pack double-loaded modules ----------------------------------------
  const gridColumnPenalty =
    input.structuralGridM === undefined
      ? new Decimal(0)
      : new Decimal(STRUCTURAL_CLEARANCE_M);
  const effectiveBayWidth = bayWidth.plus(gridColumnPenalty);
  if (input.structuralGridM !== undefined) {
    notes.push(
      `Bay width charged at ${effectiveBayWidth.toString()} m rather than ` +
        `${bayWidth.toString()} m: on a ${input.structuralGridM.toString()} m grid, ` +
        'columns interrupt door swings and Table B.11 requires an additional 300 mm.',
    );
  }

  const baysPerRun = packWidth.div(effectiveBayWidth).floor().toNumber();
  if (baysPerRun < 1) {
    throw new ParkingLayoutError(
      `a ${packWidth.toString()} m packable width cannot hold one ` +
        `${effectiveBayWidth.toString()} m bay run` +
        (input.includeRamp ? ' once the ramp strip is reserved.' : '.'),
    );
  }

  let row = 0;
  let bayCount = 0;
  while (availableDepth.gte(moduleDepthValue)) {
    // lower bay run
    for (let i = 0; i < baysPerRun; i += 1) {
      rects.push({
        kind: RectKind.BAY,
        row,
        x: cursorX.plus(effectiveBayWidth.times(i)),
        y: cursorY,
        width: bayWidth,
        height: bayLength,
      });
      bayCount += 1;
    }
    // drive aisle
    rects.push({
      kind: RectKind.AISLE,
      row,
      x: cursorX,
      y: cursorY.plus(bayLength),
      width: packWidth,
      height: aisleWidth,
    });
    // upper bay run
    for (let i = 0; i < baysPerRun; i += 1) {
      rects.push({
        kind: RectKind.BAY,
        row,
        x: cursorX.plus(effectiveBayWidth.times(i)),
        y: cursorY.plus(bayLength).plus(aisleWidth),
        width: bayWidth,
        height: bayLength,
      });
      bayCount += 1;
    }
    cursorY = cursorY.plus(moduleDepthValue);
    availableDepth = availableDepth.minus(moduleDepthValue);
    row += 1;
  }

  // --- the leftover strip -------------------------------------------------
  const singleLoadedDepth = bayLength.plus(aisleWidth);
  if (availableDepth.gte(singleLoadedDepth)) {
    for (let i = 0; i < baysPerRun; i += 1) {
      rects.push({
        kind: RectKind.BAY,
        row,
        x: cursorX.plus(effectiveBayWidth.times(i)),
        y: cursorY,
        width: bayWidth,
        height: bayLength,
      });
      bayCount += 1;
    }
    rects.push({
      kind: RectKind.AISLE,
      row,
      x: cursorX,
      y: cursorY.plus(bayLength),
      width: packWidth,
      height: aisleWidth,
    });
    notes.push(
      `The final ${availableDepth.toFixed(2)} m strip takes a single-loaded row: ` +
        'one run of bays served by its own aisle. Half the parking efficiency of a ' +
        'double-loaded module, and the first thing to reconsider if the level is short.',
    );
    availableDepth = availableDepth.minus(singleLoadedDepth);
  } else if (availableDepth.gt(0)) {
    notes.push(
      `${availableDepth.toFixed(2)} m of depth is left unused — too shallow for a ` +
        `bay (${bayLength.toString()} m) plus its aisle (${aisleWidth.toString()} m). ` +
        'It is reported rather than quietly filled.',
    );
  }

  const bayCountTraced = tracer.derived('parking.laid_out_bays', bayCount, {
    rule: { ruleId: 'DBC.B.7.2.4.TABLE_B11', citation: TABLE_B11 },
    formula:
      `${row} double-loaded module(s) × 2 runs × ${baysPerRun} bays` +
      (rects.some((r) => r.kind === RectKind.BAY && r.row === row) ? ` + 1 single-loaded run` : ''),
    uses: { moduleDepth, usableArea },
    unit: 'bays',
    detail: {
      note:
        'Bays actually placed in the footprint, not bays implied by an area ratio. ' +
        'A count derived by dividing area by a factor cannot tell you it does not fit.',
    },
  });

  const areaPerBayValue = bayCount === 0 ? new Decimal(0) : grossArea.div(bayCount);
  const areaPerBay = tracer.computed('parking.area_per_bay_m2', qArea(areaPerBayValue), {
    formula: `${qArea(grossArea).toString()} m² level ÷ ${bayCount} bays`,
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

  const reserved: Rect | undefined = deductedDepth.gt(0)
    ? {
        x: new Decimal(0),
        y: footprint.depthM.minus(deductedDepth),
        width: footprint.widthM,
        height: deductedDepth,
      }
    : undefined;

  return {
    rects,
    ramp,
    reserved,
    bayCount: bayCountTraced,
    areaPerBayM2: areaPerBay,
    moduleDepthM: moduleDepth,
    usableAreaM2: usableArea,
    standard,
    notes,
  };
}
