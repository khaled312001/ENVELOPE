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
  /** What was taken off the level before packing, and where the number came from. */
  readonly deductionsM2: TracedDecimal;
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

  const layout = layoutParkingLevel({
    tracer: input.tracer,
    footprint: { widthM, depthM },
    deductionsTraced,
    includeRamp: input.includeRamp,
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
  const rampStrip =
    rampRect && layout.ramp
      ? {
          world: toWorld(rampRect),
          foot: [local(rampRect.x, rampRect.y), local(rampRect.x.plus(rampRect.width), rampRect.y)] as const,
          head: [
            local(rampRect.x, rampRect.y.plus(rampRect.height)),
            local(rampRect.x.plus(rampRect.width), rampRect.y.plus(rampRect.height)),
          ] as const,
          widthM: layout.ramp.widthM,
          runM: layout.ramp.runM,
        }
      : undefined;

  const notAssessed = [...layout.notes, ...access.notAssessed];
  if (!rect.exact) {
    // Stated as a shortfall in square metres, not only as a ratio: "94% of the
    // podium" reads as a good score, "48 m² of the podium could not be laid out
    // rectangularly" reads as what it is.
    const podiumAreaM2 = rect.coverage.isZero()
      ? new Decimal(0)
      : widthM.times(depthM).div(rect.coverage);
    const lostM2 = podiumAreaM2.minus(widthM.times(depthM));
    notAssessed.push(
      `The setback-permitted footprint is not a rectangle, so the level was packed into ` +
        `the largest rectangle inside it — ${widthM.toFixed(2)} × ${depthM.toFixed(2)} m, ` +
        `${rect.coverage.times(100).toFixed(1)}% of the footprint. ` +
        `${lostM2.toFixed(0)} m² was left unpacked. The bay count is therefore a floor: ` +
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
    deductionsM2: deductionsTraced,
    notAssessed,
  };
}
