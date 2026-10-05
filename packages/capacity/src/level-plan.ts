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
  type Mm,
  type Plot,
  type PlotEdge,
  type Traced,
  type TracedDecimal,
  type Tracer,
} from '@envelope/core';
import {
  fromLocal,
  largestInscribedRectangle,
  type InscribedRect,
  type Pt,
  type Ring,
} from '@envelope/geometry';

import { placeVehicleAccess, type AccessResult } from './access.js';
import {
  layoutParkingLevel,
  type ParkingAngle,
  type ParkingLayoutResult,
  type PlacedRect,
  type RectKind,
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
}

export interface LevelPlan {
  readonly layout: ParkingLayoutResult;
  readonly access: AccessResult;
  readonly rects: readonly WorldRect[];
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
  } | undefined;
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
  /** Passed through to `placeVehicleAccess` — the sheet's stated access side. */
  readonly affectionPlanAccessEdgeSeq?: number;
  /**
   * The core's footprint in plot coordinates, and its area. It is a shaft through
   * every parking level: the layout places no bay inside it and cuts any aisle
   * across it. See `ParkingLayoutInput.core`.
   */
  readonly core?: { readonly ring: Ring; readonly areaM2: TracedDecimal };
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
    THE SAME AREA, RESTATED AS WHAT IT IS RATHER THAN AS WHAT IT COST.

    Derived from the deduction rather than recomputed from the fraction, so the
    two are one number by construction: perturb the usable fraction and both
    move, and neither can be edited into disagreeing with the other.
  */
  const nonParkingFloorAreaM2 = input.tracer.computed(
    'parking.non_parking_floor_area_m2',
    deductionM2,
    {
      formula:
        `${deductionM2.toString()} m² of this level is neither bay nor drive aisle ` +
        '— core, plant, ramp landing and circulation',
      uses: { deductions: deductionsTraced },
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
    ...(input.core && coreRect ? { core: { rect: coreRect, areaM2: input.core.areaM2 } } : {}),
    ...(input.angle === undefined ? {} : { angle: input.angle }),
    ...(input.structuralGridM === undefined ? {} : { structuralGridM: input.structuralGridM }),
  });

  const access = placeVehicleAccess({
    tracer: input.tracer,
    plot: input.plot,
    edges: input.edges,
    ...(input.affectionPlanAccessEdgeSeq === undefined
      ? {}
      : { affectionPlanAccessEdgeSeq: input.affectionPlanAccessEdgeSeq }),
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
  const reservedZone = layout.reserved
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
        }
      : undefined;

  const notAssessed = [...layout.notes, ...access.notAssessed];
  const marginal = layout.losses.marginalAreaPerBayM2;
  let footprintLostM2 = new Decimal(0);
  if (!rect.exact) {
    // Stated as a shortfall in square metres, not only as a ratio: "94% of the
    // podium" reads as a good score, "48 m² of the podium could not be laid out
    // rectangularly" reads as what it is.
    const podiumAreaM2 = rect.coverage.isZero()
      ? new Decimal(0)
      : widthM.times(depthM).div(rect.coverage);
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

  return {
    layout,
    access,
    rects,
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
    rampStrip,
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
    deductionsM2: deductionsTraced,
    nonParkingFloorAreaM2,
    reservedAreaM2: layout.reservedAreaM2,
    notAssessed,
  };
}
