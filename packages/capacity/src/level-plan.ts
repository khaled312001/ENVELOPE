/**
 * One parking level, on the actual plot.
 *
 * `layout.ts` packs bays into a rectangle and `access.ts` chooses a frontage;
 * both are deliberately ignorant of where the plot is. This is the piece that
 * joins them to a real boundary, and it exists because the join is where the
 * lies get told:
 *
 * - Pack the *plot* and the bays sit inside the setback.
 * - Pack the *minimum bounding rectangle* and the bays sit outside the plot.
 * - Divide an area by a factor and there are no bays at all, only a number.
 *
 * So the level is packed into the largest rectangle that fits inside the
 * setback-permitted ring, and the rectangle's shortfall against that ring is
 * reported rather than absorbed. On the rectangular Trakhees plots the client
 * works with, the shortfall is zero and the drawing is the plot; on anything
 * else the count is a floor and says so.
 *
 * The 30 Aug 2026 meeting is why this module is not a nicety:
 *
 *   "لو عارف يفهم إزاي يحط الباركينج صح، وتوزيعته صح، والرامب بتاعي ماشي صح —
 *    أنا كده حلّصت 3-4 شهور."                                           — 09:13
 */

import {
  Decimal,
  metric,
  type Actor,
  type LevelSchedule,
  type Mm,
  type Plot,
  type PlotEdge,
  type Traced,
  type TracedDecimal,
  type Tracer,
} from '@envelope/core';
import {
  area as ringArea,
  fromLocal,
  largestInscribedRectangle,
  type InscribedRect,
  type Pt,
  type Ring,
} from '@envelope/geometry';

import { placeVehicleAccess, type AccessChoice, type AccessResult } from './access.js';
import type { AccessiblePlan } from './accessible.js';
import { deadEnds, type DeadEnd } from './dead-ends.js';
import type { GradePlan } from './grade.js';
import type { RampHeadroom } from './ramp-rules.js';
import type { StreetRampPlan } from './street-ramp.js';
import { findTurns, type Pt2 } from './turning.js';
import {
  layoutParkingLevel,
  RING_AISLE_ROW,
  type ParkingAngle,
  type ParkingArrangement,
  type ParkingLayoutInput,
  type ParkingLayoutResult,
  type PlacedRect,
  type RampType,
  RectKind,
} from './layout.js';

/** A rectangle from the packer, carried with the world polygon that draws it. */
export interface WorldRect {
  readonly kind: RectKind;
  readonly row: number;
  /** Local metres, from the packing rectangle's origin corner. */
  readonly xM: Decimal;
  readonly yM: Decimal;
  readonly widthM: Decimal;
  readonly heightM: Decimal;
  /**
   * The same rectangle in plot coordinates, millimetres.
   *
   * Emitted here rather than reconstructed by each consumer. The DXF writer, the
   * screen and the massing view all need it, and three reconstructions of one
   * rotation is three chances for the drawing to disagree with the count.
   */
  readonly world: readonly Pt[];
  /**
   * What a bay is set aside for, on the level `accessible.ts` designates: the
   * van bay among the accessible ones (C.6.4.1 ¶4), or a preferred bay for
   * hybrid, electric and carpool vehicles (B.7.2.6.2). Absent on every other bay.
   */
  readonly use?: 'VAN' | 'PREFERRED';
}

export interface LevelPlan {
  readonly layout: ParkingLayoutResult;
  readonly access: AccessResult;
  readonly rects: readonly WorldRect[];
  /** Every turn between perpendicular aisles, checked against an assumed radius and lane. */
  readonly turning: LevelTurning;
  /** The packing rectangle, in plot coordinates. */
  readonly packingRect: {
    readonly widthM: Decimal;
    readonly depthM: Decimal;
    readonly world: readonly Pt[];
    readonly exact: boolean;
    /** Packing-rectangle area over the setback-permitted ring's area. */
    readonly coverage: Decimal;
  };
  /** The ring the rectangle was inscribed in, so a drawing can show both. */
  readonly podiumRing: Ring;
  /**
   * The deducted strip, in plot coordinates — where cores and plant may go on
   * this drawing. Undefined when the run deducted nothing.
   */
  readonly reservedZone: readonly Pt[] | undefined;
  /** Every piece the reserved area is drawn in, `reservedZone` among them. */
  readonly reservedZones: readonly (readonly Pt[])[];
  /**
   * The ramp strip, in plot coordinates, with its low and high edges.
   *
   * `foot` is the edge at the packing rectangle's origin side and `head` the far
   * one: the ramp is taken to climb away from the origin. Which way a ramp runs
   * is part of the same assumption as its run (`parking.ramp_run_m`).
   */
  readonly rampStrip: {
    readonly world: readonly Pt[];
    readonly foot: readonly [Pt, Pt];
    readonly head: readonly [Pt, Pt];
    readonly widthM: TracedDecimal;
    readonly runM: TracedDecimal;
    /** The main run's slope, Table B.9's 12%. */
    readonly slopePct: TracedDecimal;
  } | undefined;
  /**
   * The ring aisle sloped as the ramp — the client's own podium — when that
   * arrangement won. `centreLine` is the lap the gradient is measured along, in
   * plot millimetres, counter-clockwise from the corner nearest the origin.
   */
  readonly slopedFloor?: {
    readonly lapM: Decimal;
    readonly gradientPct: TracedDecimal;
    readonly centreLine: readonly Pt[];
  };
  /** Table B.9's clear height over the stacked ramps, as a structural budget. */
  readonly headroom?: RampHeadroom;
  readonly bayCount: Traced<number>;
  readonly areaPerBayM2: TracedDecimal;
  /**
   * Three separate losses, in bays and in square metres — never one efficiency.
   *
   * The reserved zone and the cross aisle come from the packer; the footprint
   * loss is this module's, because only here is the true boundary known. A
   * reader who is short of parking needs to know which of the three to argue
   * with, and a single percentage tells them none of it.
   */
  readonly losses: {
    readonly reserved: { readonly areaM2: Decimal; readonly bays: number };
    readonly circulation: {
      readonly areaM2: Decimal;
      readonly bays: number;
      readonly strandedBays: number;
      /** Of `bays`, those the drive from the slab edge to a ring crosses. See `ParkingLosses`. */
      readonly entryDriveBays: number;
    };
    readonly footprint: { readonly areaM2: Decimal; readonly bays: number };
  };
  /** What was taken off the level before packing, and where the number came from. */
  readonly deductionsM2: TracedDecimal;
  /**
   * The floor area on this level that is neither a bay nor a drive aisle — the
   * core, the reserved strip and the ramp landing, together.
   *
   * ONE NUMBER, TWO CLAIMS, AND THE SECOND ONE IS WHY THIS NODE EXISTS. It
   * carries the same figure as `deductionsM2` and `uses` it, so the two cannot
   * drift apart. What differs is what is being asserted. `deductionsM2` says
   * *this came off the level before a bay was placed* — a fact about the
   * packing. This says *this floor area is not parking area*, which is a claim
   * against the metric definitions annex, and the annex is explicit on both
   * halves: `PARKING_AREA` excludes "Residential lobbies within a parking
   * level" and "Plant serving the tower above", and `GFA` includes "Internal
   * circulation (corridors, lobbies)", "Vertical cores … measured once per
   * level" and "Enclosed plant and service rooms".
   *
   * It is emitted here rather than reassembled by whoever needs it, because the
   * only alternative is an adapter computing a number a user will see.
   *
   * **IT IS AN UPPER BOUND, NOT A GFA FIGURE, AND NOTHING MAY PRINT IT AS ONE.**
   * The deduction also covers the ramp landing, which the same annex calls
   * parking circulation (`CORE_AREA` excludes "The ramp and its landing, which
   * are parking circulation"; `PARKING_AREA` includes "Ramps"). Nothing on file
   * splits the strip between lobby, plant and landing, and the annex that would
   * settle it is unsigned — so how much of this is GFA is NOT ASSESSED, and the
   * GFA statement says exactly that rather than quoting the figure as an area.
   */
  readonly nonParkingFloorAreaM2: TracedDecimal;
  /**
   * The reserved strip's own area: the deduction less the core, which now stands
   * where it is drawn. Equal to `deductionsM2` when no core was given.
   */
  readonly reservedAreaM2: TracedDecimal;
  /**
   * Everything this plan does not establish, in one list.
   *
   * The layout's notes, the access placement's `notAssessed`, and — when the
   * plot is not a rectangle — the shortfall the packing gave up. Merged
   * deliberately: a reader who has to visit three places to learn what was not
   * checked will visit one of them.
   */
  readonly notAssessed: readonly string[];
  /**
   * The level at grade, where the ground floor holds parking: the shared layout
   * less what the drive from the entrance and the substation on the road take.
   * Set by the pipeline, which knows whether the ground floor parks; see `grade.ts`.
   */
  readonly grade?: GradePlan;
  /**
   * The accessible and preferred bays, on the level the street reaches: the
   * ground floor where it parks, else the first basement. Set by the pipeline,
   * which knows the building's total; see `accessible.ts`.
   */
  readonly accessible?: AccessiblePlan;
  /** The shared layout's dead-end driveways, B.7.2.3.3 ¶8; see `dead-ends.ts`. */
  readonly deadEnds: readonly DeadEnd[];
  /**
   * The ramps from the street down to B1 and up to P1, where the ground floor does
   * not park: placed from the entrance and paid for in bays on the levels they
   * reach. Set by the pipeline, which knows the schedule; see `street-ramp.ts`.
   */
  readonly streetRamps?: StreetRampPlan;
}

/** The turns of one level's aisle network, checked; see `turning.ts`. */
export interface LevelTurning {
  /** Table B.9's curved-ramp minimum inner radius, taken for every aisle turn. ASSUMED. */
  readonly innerRadiusM: TracedDecimal;
  /** Table B.9's curved-ramp minimum lane, likewise. ASSUMED. */
  readonly laneM: TracedDecimal;
  /** How many of the turns fit on the aisles, of `total`. Carries the assumption's class. */
  readonly fitting: Traced<number>;
  readonly total: number;
  /** Each turn's swept lane in plot millimetres: its inner and outer edge. */
  readonly turns: readonly { readonly inner: readonly Pt[]; readonly outer: readonly Pt[]; readonly fits: boolean }[];
}

const TURN_BASIS =
  'DBC Part B states no turning radius for a car on a parking aisle. Table B.9 gives, ' +
  'for a curved ramp, a minimum inner circle radius of 4 m and a minimum lane of 3.5 m, ' +
  'the nearest figures the code gives for a car turning, so they are taken for every ' +
  'aisle turn: one car at a time, held against the two outer walls.';

function turningOn(tracer: Tracer, layout: ParkingLayoutResult, toWorld: (p: Pt2) => Pt): LevelTurning {
  const innerRadiusM = tracer.assumed('parking.turning_inner_radius_m', new Decimal(4), {
    basis: TURN_BASIS,
    label: 'inner turning radius on an aisle',
    unit: 'm',
  });
  const laneM = tracer.assumed('parking.turning_lane_m', new Decimal('3.5'), {
    basis: TURN_BASIS,
    label: 'lane a car turns in',
    unit: 'm',
  });
  const aisles = layout.rects.filter((r) => r.kind === RectKind.AISLE);
  const turns = findTurns({
    aisles,
    innerRadiusM: innerRadiusM.value,
    laneM: laneM.value,
    minOpeningM: new Decimal(layout.standard.drivewayWidthM),
  });
  const fit = turns.filter((t) => t.fits).length;
  const fitting = tracer.computed('parking.turns_fitting', fit, {
    formula:
      `${fit} of ${turns.length} turns between perpendicular aisles keep a lane of ` +
      `${laneM.value.toString()} m at an inner radius of ${innerRadiusM.value.toString()} m on the aisles`,
    uses: { innerRadius: innerRadiusM, lane: laneM },
    unit: 'turns',
  });
  // Measured rather than left unsaid: the turns are checked and drawn, and enter no bay count.
  for (const a of [innerRadiusM, laneM]) {
    tracer.sensitiveTo(layout.bayCount, a, {
      relativeEffect: '0',
      perturbation:
        'the turning radius or lane changed by 10% — the turns are checked and drawn and ' +
        'enter no bay count, so the measured effect on the count is exactly zero',
    });
  }
  return {
    innerRadiusM,
    laneM,
    fitting,
    total: turns.length,
    turns: turns.map((t) => ({ inner: t.inner.map(toWorld), outer: t.outer.map(toWorld), fits: t.fits })),
  };
}

export interface LevelPlanInput {
  readonly tracer: Tracer;
  readonly plot: Plot;
  readonly edges: readonly PlotEdge[];
  /** The setback-permitted ring from the envelope solver. Never the raw plot. */
  readonly podiumRing: Ring;
  /**
   * The run's own usable fraction, as the node `solveParking` already made.
   *
   * The level plan does **not** take a deduction area. What is unusable on a
   * parking level — cores, plant, the ramp landing — is exactly what the usable
   * fraction already describes, and the run has declared it once, with a class
   * and a basis. Asking for it a second time here would let one run report a
   * bay count computed at 0.85 next to a level count computed at 0.78, and
   * nothing in the system would notice.
   */
  readonly usableFraction: TracedDecimal;
  /**
   * Reserve a ramp strip on this level.
   *
   * Required rather than defaulted. Whether a level needs its own ramp is a
   * fact about the scheme — a basement does, a single at-grade level does not —
   * and a default here would be a second opinion sitting behind the caller's.
   * A ramp costs roughly one bay run of width, so guessing it wrong is not a
   * rounding difference.
   */
  readonly includeRamp: boolean;
  readonly angle?: ParkingAngle;
  readonly structuralGridM?: Decimal;
  /** Passed through to `layoutParkingLevel` — the gap left between groups of bays for the columns. */
  readonly columnGap?: ParkingLayoutInput['columnGap'];
  /** Passed through to `placeVehicleAccess` — the sheet's stated access side. */
  readonly affectionPlanAccessEdgeSeq?: number;
  /** Passed through to `placeVehicleAccess` — the entrance a person placed. */
  readonly chosenAccess?: AccessChoice;
  /**
   * The core's footprint in plot coordinates, and its area. It is a shaft through
   * every parking level: the layout places no bay inside it and cuts any aisle
   * across it. See `ParkingLayoutInput.core`.
   */
  readonly core?: { readonly ring: Ring; readonly areaM2: TracedDecimal };
  /** One storey — the envelope's floor-to-floor. What a ramp climbs. */
  readonly storeyHeightM?: TracedDecimal;
  /** The level schedule the ramps' directions are read off, and who stated it. */
  readonly rampPlan?: { readonly schedule: LevelSchedule; readonly actor?: Actor };
  /** A ramp arrangement somebody stated; see `ParkingLayoutInput.rampType`. */
  readonly rampType?: { readonly type: RampType; readonly actor?: Actor };
  /** The arrangement a reader picked; see `ParkingLayoutInput.arrangement`. */
  readonly arrangement?: { readonly id: ParkingArrangement; readonly actor?: Actor };
  /** See `ParkingLayoutInput.slopedRing`. */
  readonly slopedRing?: boolean;
}

/**
 * A plot point in the packing rectangle's own frame, millimetres — the inverse of
 * `fromLocal`.
 */
function toLocal(rect: InscribedRect, p: Pt): { readonly x: number; readonly y: number } {
  const theta = (rect.angleDeg.toNumber() * Math.PI) / 180;
  const dx = p.x - rect.originMm.x;
  const dy = p.y - rect.originMm.y;
  return {
    x: dx * Math.cos(theta) + dy * Math.sin(theta),
    y: -dx * Math.sin(theta) + dy * Math.cos(theta),
  };
}

const mmToM = (v: Mm | number): Decimal => new Decimal(v).div(1000);

/**
 * Lay one parking level out on a plot, and choose where the cars get in.
 *
 * Both halves of the client's sentence — "الباركينج **والمداخل**" — in one
 * result, because they are one decision: a driveway that lands on the ramp
 * strip is not a driveway, and the only way to see that is to hold the two
 * together.
 */
export function planParkingLevel(input: LevelPlanInput): LevelPlan {
  // `FR-DEF-001 AC5`, applied to this module because it now states a floor-area
  // term of its own — see `nonParkingFloorAreaM2`. The call is the gate: an area
  // term absent from the annex throws here rather than reaching a drawing.
  metric('PARKING_AREA');
  metric('GFA');

  const rect: InscribedRect = largestInscribedRectangle(input.podiumRing);
  const widthM = mmToM(rect.widthMm);
  const depthM = mmToM(rect.depthMm);

  // The deduction, derived from the fraction rather than declared beside it.
  // It carries the fraction's provenance class by construction: assume the
  // fraction and the deduction is amber; cite it and the deduction is cited.
  const grossAreaM2 = widthM.times(depthM);
  const unusable = new Decimal(1).minus(input.usableFraction.value);

  /*
    THE WHOLE FOOTPRINT, WHERE THE RECTANGLE IS NOT ALL OF IT. Its outline in
    the rectangle's own frame and its area, so the layout can lay rows across all
    of it, and the deduction over that area — the same usable fraction, applied
    to the level the rows actually cover.
  */
  const podiumAreaM2 = new Decimal(Math.abs(ringArea(input.podiumRing))).div(1_000_000);
  const field = rect.exact
    ? undefined
    : {
        polygonMm: input.podiumRing.map((p) => toLocal(rect, p)),
        grossAreaM2: podiumAreaM2,
        deductionsTraced: input.tracer.computed(
          'parking.layout_deductions_m2',
          podiumAreaM2.times(unusable).toDecimalPlaces(2),
          {
            formula:
              `${podiumAreaM2.toFixed(2)} m² footprint × ` +
              `(1 − ${input.usableFraction.value.toString()} usable)`,
            uses: { usable: input.usableFraction },
            unit: 'm²',
            detail: {
              note:
                'Cores, plant, the ramp landing and any circulation that is not drive ' +
                'aisle, over the whole setback-permitted footprint: what the rows laid ' +
                'across all of it are charged.',
            },
          },
        ),
      };
  const deductionM2 = grossAreaM2.times(unusable).toDecimalPlaces(2);
  const deductionsTraced = input.tracer.computed(
    'parking.layout_deductions_m2',
    deductionM2,
    {
      formula:
        `${grossAreaM2.toFixed(2)} m² packable × ` +
        `(1 − ${input.usableFraction.value.toString()} usable)`,
      uses: { usable: input.usableFraction },
      unit: 'm²',
      detail: {
        note:
          'Cores, plant, the ramp landing and any circulation that is not drive ' +
          'aisle. Taken off the level before a bay is placed, so the drawing and ' +
          'the level count are deducting the same thing.',
      },
    },
  );

  /*
    The core in the packing frame, as the box that holds it there. On a plot whose
    core is turned against the packing rectangle the box is larger than the core,
    which is the safe side: a bay beside the core is lost, never one inside it.
  */
  const coreRect = input.core
    ? (() => {
        const local = input.core.ring.map((p) => toLocal(rect, p));
        const xs = local.map((p) => p.x / 1000);
        const ys = local.map((p) => p.y / 1000);
        const x0 = new Decimal(Math.min(...xs)).toDecimalPlaces(3);
        const y0 = new Decimal(Math.min(...ys)).toDecimalPlaces(3);
        return {
          x: x0,
          y: y0,
          width: new Decimal(Math.max(...xs)).toDecimalPlaces(3).minus(x0),
          height: new Decimal(Math.max(...ys)).toDecimalPlaces(3).minus(y0),
        };
      })()
    : undefined;

  const layout = layoutParkingLevel({
    tracer: input.tracer,
    footprint: { widthM, depthM },
    deductionsTraced,
    includeRamp: input.includeRamp,
    ...(input.storeyHeightM ? { storeyHeightM: input.storeyHeightM } : {}),
    ...(input.rampPlan ? { rampPlan: input.rampPlan } : {}),
    ...(input.slopedRing === undefined ? {} : { slopedRing: input.slopedRing }),
    ...(input.rampType
      ? {
          rampType: input.rampType.type,
          ...(input.rampType.actor ? { rampTypeActor: input.rampType.actor } : {}),
        }
      : {}),
    ...(input.arrangement ? { arrangement: input.arrangement } : {}),
    ...(input.core && coreRect ? { core: { rect: coreRect, areaM2: input.core.areaM2 } } : {}),
    ...(input.angle === undefined ? {} : { angle: input.angle }),
    ...(input.structuralGridM === undefined ? {} : { structuralGridM: input.structuralGridM }),
    ...(input.columnGap ? { columnGap: input.columnGap } : {}),
    ...(field ? { field } : {}),
  });

  /*
    THE SAME AREA, RESTATED AS WHAT IT IS RATHER THAN AS WHAT IT COST.

    Derived from the deduction rather than recomputed from the fraction, so the
    two are one number by construction: perturb the usable fraction and both
    move, and neither can be edited into disagreeing with the other. It is the
    deduction the winning arrangement was charged — the rectangle's, or the
    whole footprint's.
  */
  const charged = layout.deductionsM2;
  const nonParkingFloorAreaM2 = input.tracer.computed(
    'parking.non_parking_floor_area_m2',
    charged.value,
    {
      formula:
        `${charged.value.toString()} m² of this level is neither bay nor drive aisle ` +
        '— core, plant, ramp landing and circulation',
      uses: { deductions: charged },
      unit: 'm²',
      detail: {
        note:
          'Floor area on a parking level that the annex does not count as parking ' +
          'area: PARKING_AREA excludes residential lobbies within a parking level ' +
          'and plant serving the tower above, and GFA includes lobbies, cores and ' +
          'enclosed plant rooms. An UPPER BOUND on what a parking level contributes ' +
          'to GFA, never that contribution itself — it also covers the ramp landing, ' +
          'which the same annex calls parking circulation, and nothing on file ' +
          'splits the strip between the three. How much of it is GFA is NOT ASSESSED.',
      },
    },
  );

  const access = placeVehicleAccess({
    tracer: input.tracer,
    plot: input.plot,
    edges: input.edges,
    ...(input.affectionPlanAccessEdgeSeq === undefined
      ? {}
      : { affectionPlanAccessEdgeSeq: input.affectionPlanAccessEdgeSeq }),
    ...(input.chosenAccess === undefined ? {} : { chosen: input.chosenAccess }),
  });

  const toWorld = (r: PlacedRect): readonly Pt[] => {
    const x0 = r.x.times(1000).toNumber();
    const y0 = r.y.times(1000).toNumber();
    const x1 = r.x.plus(r.width).times(1000).toNumber();
    const y1 = r.y.plus(r.height).times(1000).toNumber();
    return [
      fromLocal(rect, x0, y0),
      fromLocal(rect, x1, y0),
      fromLocal(rect, x1, y1),
      fromLocal(rect, x0, y1),
    ];
  };

  const rects: WorldRect[] = layout.rects.map((r) => ({
    kind: r.kind,
    row: r.row,
    xM: r.x,
    yM: r.y,
    widthM: r.width,
    heightM: r.height,
    world: toWorld(r),
  }));

  const local = (x: Decimal, y: Decimal): Pt =>
    fromLocal(rect, x.times(1000).toNumber(), y.times(1000).toNumber());
  const reservedZones = layout.reservedPieces.map((r) => toWorld({ ...r, kind: 'OBSTRUCTION', row: -1 }));
  // The largest piece is one of the pieces, and is the same outline object, so a
  // consumer can tell it from the others by identity.
  const largestAt = layout.reserved
    ? layout.reservedPieces.findIndex(
        (r) =>
          r.x.eq(layout.reserved!.x) &&
          r.y.eq(layout.reserved!.y) &&
          r.width.eq(layout.reserved!.width) &&
          r.height.eq(layout.reserved!.height),
      )
    : -1;
  const reservedZone =
    largestAt >= 0
      ? reservedZones[largestAt]
      : layout.reserved
        ? toWorld({ ...layout.reserved, kind: 'OBSTRUCTION', row: -1 })
        : undefined;
  const rampRect = layout.rects.find((r) => r.kind === 'RAMP');
  /*
    The ramp climbs along its LONG axis, and since the orientation sweep landed
    the strip runs down either local edge. Reading the foot off `y` regardless
    would, on a level packed the other way round, hand the section a ramp 6 m
    long and 30 m wide, climbing sideways.
  */
  const rampRuns = rampRect ? rampRect.height.gte(rampRect.width) : false;
  const rampStrip =
    rampRect && layout.ramp
      ? {
          world: toWorld(rampRect),
          foot: (rampRuns
            ? [local(rampRect.x, rampRect.y), local(rampRect.x.plus(rampRect.width), rampRect.y)]
            : [local(rampRect.x, rampRect.y), local(rampRect.x, rampRect.y.plus(rampRect.height))]
          ) as readonly [Pt, Pt],
          head: (rampRuns
            ? [
                local(rampRect.x, rampRect.y.plus(rampRect.height)),
                local(rampRect.x.plus(rampRect.width), rampRect.y.plus(rampRect.height)),
              ]
            : [
                local(rampRect.x.plus(rampRect.width), rampRect.y),
                local(rampRect.x.plus(rampRect.width), rampRect.y.plus(rampRect.height)),
              ]) as readonly [Pt, Pt],
          widthM: layout.ramp.widthM,
          runM: layout.ramp.runM,
          slopePct: layout.ramp.slopePct,
        }
      : undefined;

  /*
    THE LAP, as the drawings walk it: the centre line of the ring aisle, half an
    aisle in from the bay runs on every side. Read off the ring's own rectangles
    rather than recomputed from the module, so the line is where the aisle is.
  */
  const ringRects = layout.rects.filter((r) => r.row === RING_AISLE_ROW);
  const slopedFloor =
    layout.slopedFloor && ringRects.length > 0
      ? (() => {
          /*
            The two longest pieces are the long runs; the rest are the short
            connectors between them. Sorted by length rather than by which way a
            piece is wider: on a shallow level a connector is squarer than an
            aisle is wide. And the lap turns at the connectors, not at the walls —
            the long runs carry on past them to serve the end bays.
          */
          const long = (r: PlacedRect): Decimal => Decimal.max(r.width, r.height);
          const sorted = [...ringRects].sort((a, b) => long(b).comparedTo(long(a)));
          const runs = sorted.slice(0, 2);
          const links = sorted.length > 2 ? sorted.slice(2) : runs;
          const alongX = runs[0]!.width.gte(runs[0]!.height);
          const cx = (r: PlacedRect): Decimal => r.x.plus(r.width.div(2));
          const cy = (r: PlacedRect): Decimal => r.y.plus(r.height.div(2));
          const [xs, ys] = alongX ? [links.map(cx), runs.map(cy)] : [runs.map(cx), links.map(cy)];
          const [x0, x1, y0, y1] = [Decimal.min(...xs), Decimal.max(...xs), Decimal.min(...ys), Decimal.max(...ys)];
          return {
            lapM: layout.slopedFloor!.lapM,
            gradientPct: layout.slopedFloor!.gradientPct,
            centreLine: [local(x0, y0), local(x1, y0), local(x1, y1), local(x0, y1)],
          };
        })()
      : undefined;

  const notAssessed = [...layout.notes, ...access.notAssessed];
  const marginal = layout.losses.marginalAreaPerBayM2;
  let footprintLostM2 = new Decimal(0);
  if (!rect.exact && layout.wholeFootprint) {
    /*
      THE ROWS RAN ACROSS ALL OF IT, so what is lost is only what no whole bay or
      aisle fits in: the wedges along the edges that are not square to the rows.
      Measured, not inferred — the footprint less everything drawn on it.
    */
    const drawn = [...layout.rects, ...layout.reservedPieces].reduce(
      (s, r) => s.plus(r.width.times(r.height)),
      input.core ? input.core.areaM2.value : new Decimal(0),
    );
    footprintLostM2 = Decimal.max(new Decimal(0), podiumAreaM2.minus(drawn));
    const lostBays = marginal.isZero() ? 0 : footprintLostM2.div(marginal).floor().toNumber();
    notAssessed.push(
      `The setback-permitted footprint is not a rectangle, so the rows were laid across the ` +
        `whole of it rather than inside the largest rectangle in it (${widthM.toFixed(2)} × ` +
        `${depthM.toFixed(2)} m, ${rect.coverage.times(100).toFixed(1)}% of the footprint). ` +
        `${footprintLostM2.toFixed(0)} m² along its edges holds no whole bay or aisle, about ` +
        `${lostBays} bays. The bay count is therefore a floor: a bespoke layout on the true ` +
        'boundary could use some of it, and this engine does not attempt one.',
    );
  } else if (!rect.exact) {
    // Stated as a shortfall in square metres, not only as a ratio: "94% of the
    // podium" reads as a good score, "48 m² of the podium could not be laid out
    // rectangularly" reads as what it is.
    footprintLostM2 = podiumAreaM2.minus(widthM.times(depthM));
    const lostBays = marginal.isZero()
      ? 0
      : footprintLostM2.div(marginal).floor().toNumber();
    notAssessed.push(
      `The setback-permitted footprint is not a rectangle, so the level was packed into ` +
        `the largest rectangle inside it — ${widthM.toFixed(2)} × ${depthM.toFixed(2)} m, ` +
        `${rect.coverage.times(100).toFixed(1)}% of the footprint. ` +
        `${footprintLostM2.toFixed(0)} m² was left unpacked, about ${lostBays} bays. ` +
        `The bay count is therefore a floor: ` +
        `a bespoke layout on the true boundary would hold more, and this engine does ` +
        `not attempt one.`,
    );
  }

  const turning = turningOn(input.tracer, layout, (p) => fromLocal(rect, p.x * 1000, p.y * 1000));

  return {
    layout,
    access,
    rects,
    turning,
    packingRect: {
      widthM,
      depthM,
      world: [
        fromLocal(rect, 0, 0),
        fromLocal(rect, Number(rect.widthMm), 0),
        fromLocal(rect, Number(rect.widthMm), Number(rect.depthMm)),
        fromLocal(rect, 0, Number(rect.depthMm)),
      ],
      exact: rect.exact,
      coverage: rect.coverage,
    },
    podiumRing: input.podiumRing,
    reservedZone,
    reservedZones,
    rampStrip,
    ...(slopedFloor ? { slopedFloor } : {}),
    ...(layout.headroom ? { headroom: layout.headroom } : {}),
    bayCount: layout.bayCount,
    areaPerBayM2: layout.areaPerBayM2,
    losses: {
      reserved: layout.losses.reserved,
      circulation: layout.losses.circulation,
      footprint: {
        areaM2: footprintLostM2,
        bays: marginal.isZero() ? 0 : footprintLostM2.div(marginal).floor().toNumber(),
      },
    },
    deductionsM2: charged,
    nonParkingFloorAreaM2,
    reservedAreaM2: layout.reservedAreaM2,
    notAssessed,
    deadEnds: deadEnds(rects, new Decimal(layout.standard.drivewayWidthM), layout.standard.angle === 'PARALLEL'),
  };
}
