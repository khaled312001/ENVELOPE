/**
 * Residual strips — the bays an architect puts where no module reaches.
 *
 * Every packer in `layout.ts` lays one kind of bay, 2.5 × 5.5 m at 90°, in runs
 * along its own aisles, and reports what it leaves as a loss. The architect's
 * drawings of plot 6468096 (A-101 to A-107) do not stop there. On every level a
 * row of parallel bays stands along the long wall, served by the aisle that
 * already runs past it, and under the core a row of bays only 5.0 m long fills a
 * band too shallow for a 5.5 m one — 56 of 630 perpendicular bays across eight
 * levels, 8.9%, which is exactly the share the code allows.
 *
 * Both are in Table B.11 and neither was encoded:
 *
 * - the **parallel row**: 2.5 × 6.0 m, entered along its long side; and
 * - **note \***: a perpendicular bay "may be reduced to 5 m × 2.5 m … a) all
 *   perpendicular bays in plots less than 30 m in length; b) up to 10% of
 *   perpendicular bays in plots of 30 m length or greater".
 *
 * So once a packer has finished, this fills the free floor against the sides of
 * the aisles it drew — the same fixed rule on every arrangement, in a fixed
 * order, nothing searched:
 *
 *   1. a 5.5 m bay wherever one stands clear with its mouth on an aisle;
 *   2. a 5.0 m bay where only that fits, up to the note's cap;
 *   3. a parallel bay, its long side on the aisle, where only that fits.
 *
 * A bay is placed only where the whole of it is inside the level and clear of
 * every bay, aisle, ramp, reserved area and the core, and where its open side
 * lies wholly on an aisle the packer already proved a car reaches. A ramp's two
 * ends are kept clear for an aisle's width: a car leaving a ramp drives straight
 * on before it turns.
 *
 * WHAT IT DOES NOT DO. Angled bays (45°, 60°, 75°) need a one-way driveway and a
 * bay that is not square to the rows; the level is drawn in axis-aligned
 * rectangles, so a chamfered corner keeps only the square bays that fit, and the
 * angled ones are NOT ASSESSED. And under note \*(a) every perpendicular bay may
 * be 5.0 m — this uses the short bay only where a 5.5 m one does not fit, and
 * offers no arrangement of 16 m modules.
 *
 * All arithmetic is in whole millimetres, as the kernel's is.
 */

import {
  Decimal,
  type Citation,
  type Plot,
  type PlotEdge,
  type Traced,
  type TracedDecimal,
  type Tracer,
} from '@envelope/core';

import type { PlacedRect, Rect } from './layout.js';
import { bandIntervals, intersectIntervals, subtractIntervals, type Interval, type XY } from './scanline.js';

// ---------------------------------------------------------------------------
// Rule data — Table B.11's parallel row and its note *
// ---------------------------------------------------------------------------

const DBC_URI = 'docs/00-source/regulations/Dubai Building Code_English_2021 Edition_compressed.pdf';

/** Table B.11 note \*: the 5.0 m perpendicular bay, and the two plots it applies to. */
export const TABLE_B11_REDUCED: Citation = {
  instrumentId: 'DUBAI_BUILDING_CODE',
  instrumentVersion: '2021',
  clauseReference: 'B.7.2.4 Table B.11, note * — perpendicular bays reduced to 5 m × 2.5 m',
  documentUri: DBC_URI,
  sourcePage: 86,
  sourceBbox: [0, 0, 842, 595],
  sourceTextVerbatim:
    '* For perpendicular (90°) parking bays, the dimensions may be reduced to 5 m × 2.5 m in the ' +
    'following circumstances: a) all perpendicular bays in plots less than 30 m in length; b) up to ' +
    '10% of perpendicular bays in plots of 30 m length or greater.',
};

/** Table B.11's parallel row: 2.5 × 6 m on a one-way driveway of at least 3 m. */
export const TABLE_B11_PARALLEL: Citation = {
  instrumentId: 'DUBAI_BUILDING_CODE',
  instrumentVersion: '2021',
  clauseReference: 'B.7.2.4 Table B.11 — Minimum dimensions for parking, parallel',
  documentUri: DBC_URI,
  sourcePage: 86,
  sourceBbox: [0, 0, 842, 595],
  sourceTextVerbatim:
    'The dimension of car parking bays and driveways shall be not less than the minimum values given ' +
    'in Table B.11. … Table B.11 [Parallel (See Figure B.59) | One way | 2.5 | 6 | 3]',
};

/** Note \*'s bay length, metres. Its width is the table's 2.5 m, unchanged. */
export const REDUCED_BAY_LENGTH_M = '5';
/** Note \*'s threshold: a plot under this length may use the short bay everywhere. */
export const REDUCED_PLOT_LENGTH_M = '30';
/** Note \*(b)'s cap on a plot of 30 m or more. */
export const REDUCED_BAY_SHARE = '0.1';
/** Table B.11's parallel bay, metres: its length along the aisle and its depth off it. */
export const PARALLEL_BAY_LENGTH_M = '6';
export const PARALLEL_BAY_DEPTH_M = '2.5';

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

/**
 * The aisle `packLevel` lays along the last bay row to reach a strip too shallow
 * for a single-loaded row. Kept only where the fill puts a bay against it.
 */
export const RESIDUAL_AISLE_ROW = -30;
/** A 5.5 m bay the fill added: an ordinary bay, in a run of its own. */
export const RESIDUAL_BAY_ROW = -31;
/*
  A 5.0 m BAY AND A PARALLEL BAY EACH STAND IN A ROW OF ITS OWN. `accessible.ts`
  makes its bays out of runs of two or three neighbours in one row, and an
  accessible bay with its 1.2 m aisle is designed on the full-size perpendicular
  bay — never on a short one, and never on one entered from the side. A row of
  one has no neighbour, so no run of these is ever taken for one.
*/
const REDUCED_ROW_BASE = -1000;
const PARALLEL_ROW_BASE = -2000;
const ROW_SPAN = 1000;

export const isReducedRow = (row: number): boolean => row <= REDUCED_ROW_BASE && row > REDUCED_ROW_BASE - ROW_SPAN;
export const isParallelRow = (row: number): boolean => row <= PARALLEL_ROW_BASE && row > PARALLEL_ROW_BASE - ROW_SPAN;

// ---------------------------------------------------------------------------
// Note * — which plots, and the reading of "length"
// ---------------------------------------------------------------------------

export const ReducedBayMode = {
  /** A plot under 30 m long: every perpendicular bay may be 5.0 m. */
  ALL: 'ALL',
  /** A plot of 30 m or more: up to 10% of the perpendicular bays. */
  TEN_PERCENT: 'TEN_PERCENT',
} as const;
export type ReducedBayMode = (typeof ReducedBayMode)[keyof typeof ReducedBayMode];

/** The allowance's value, as words: what the note lets this plot do. */
export const REDUCED_ALLOWANCE_WORDS: Readonly<Record<ReducedBayMode, string>> = {
  ALL: 'every perpendicular bay may be 5 m × 2.5 m',
  TEN_PERCENT: 'up to 10% of perpendicular bays may be 5 m × 2.5 m',
};

export interface ReducedBayAllowance {
  readonly mode: ReducedBayMode;
  /** The plot's length as note \* is read here — its longest side. ASSUMED. */
  readonly plotLengthM: TracedDecimal;
  /** What note \* allows this plot: computed from the cited note and the assumed length, so ASSUMED. */
  readonly allowance: Traced<string>;
  /** The other reading — the depth of the plot's bounding rectangle — and what it would allow. */
  readonly alternative: { readonly lengthM: Decimal; readonly mode: ReducedBayMode };
}

const modeFor = (lengthM: Decimal): ReducedBayMode =>
  lengthM.lt(REDUCED_PLOT_LENGTH_M) ? ReducedBayMode.ALL : ReducedBayMode.TEN_PERCENT;

/**
 * Note \*'s allowance for this plot.
 *
 * "PLOT LENGTH" IS NOT DEFINED, and the reading moves the answer: Warsan 6211383
 * is 50.85 m along its road and 26.85 m deep, so its longest side puts it under
 * the 10% cap and its depth lets every bay be short. The longest side is taken,
 * because it is the reading that allows less — the conservative side of a rule
 * that relaxes a minimum — and it is declared as an assumption with the other
 * reading's figure beside it, amber, until the client says which one the
 * authority means.
 */
export function reducedBayAllowance(
  tracer: Tracer,
  edges: readonly Pick<PlotEdge, 'lengthMm'>[],
  plot: Partial<Pick<Plot, 'mbrWidthMm' | 'mbrDepthMm'>>,
): ReducedBayAllowance | undefined {
  /*
    NO SIDES, NO LENGTH, NO NOTE. A plot with no boundary filed has no length to
    read the note by, and a length of zero would put it "under 30 m" and let
    every bay be short — the most permissive answer, reached by having no data.
  */
  if (edges.length === 0) return undefined;
  const sides = edges.map((e) => new Decimal(e.lengthMm).div(1000));
  const longest = Decimal.max(...sides);
  // The depth reading, for the sensitivity: the bounding rectangle's short side,
  // or the shortest boundary where no rectangle was measured.
  const depth =
    plot.mbrWidthMm !== undefined && plot.mbrDepthMm !== undefined
      ? Decimal.min(new Decimal(plot.mbrWidthMm), new Decimal(plot.mbrDepthMm)).div(1000)
      : Decimal.min(...sides);
  const mode = modeFor(longest);
  const altMode = modeFor(depth);
  const plotLengthM = tracer.assumed('parking.reduced_bay_plot_length_m', longest.toDecimalPlaces(2), {
    basis:
      'DBC Table B.11 note * lets a perpendicular bay be 5 m × 2.5 m on every bay of a plot less than ' +
      '30 m in length and on up to 10% of them on a plot 30 m or longer, and does not say which ' +
      `dimension is a plot's length. It is read here as the plot's longest side, ${longest.toFixed(2)} m, ` +
      'the reading that allows less. Read as the depth of its bounding rectangle it would be ' +
      `${depth.toFixed(2)} m. Which one the authority means is a question for the client.`,
    label: 'plot length, as Table B.11 note * is read',
    unit: 'm',
  });
  /*
    THE NOTE IS CITED; WHICH HALF OF IT APPLIES IS NOT. The rule node is DERIVED
    from the page, and the allowance is computed from it and the assumed length,
    so it carries the assumption's class: amber, until the reading is answered.
  */
  const note = tracer.derived('parking.reduced_bay_rule', 'perpendicular bays 5 m × 2.5 m: all of them under 30 m, up to 10% at 30 m or more', {
    rule: { ruleId: 'DBC.B.7.2.4.TABLE_B11.NOTE', citation: TABLE_B11_REDUCED },
    formula: 'Table B.11 note *',
  });
  const allowance = tracer.computed('parking.reduced_bay_allowance', REDUCED_ALLOWANCE_WORDS[mode], {
    formula:
      mode === ReducedBayMode.ALL
        ? `plot length ${longest.toFixed(2)} m < 30 m: note * a) applies`
        : `plot length ${longest.toFixed(2)} m ≥ 30 m: note * b) applies`,
    uses: { note, plotLength: plotLengthM },
  });
  return { mode, plotLengthM, allowance, alternative: { lengthM: depth.toDecimalPlaces(2), mode: altMode } };
}

// ---------------------------------------------------------------------------
// The fill
// ---------------------------------------------------------------------------

/** A run's pitch, as the packer lays it: `bayAlong` and `baysAlong`, in metres. */
export interface ResidualPitch {
  readonly along: (k: number) => Decimal;
  readonly fits: (lengthM: Decimal) => number;
}

export interface ResidualInput {
  /** The packing as its packer left it: every rectangle on it, every aisle reachable. */
  readonly rects: readonly PlacedRect[];
  /** The packing's frame — the rectangle it was laid in. */
  readonly widthM: Decimal;
  readonly depthM: Decimal;
  /** The whole footprint in the same frame, millimetres, where the packing covers it rather than the rectangle. */
  readonly polygonMm?: readonly XY[];
  /** What else stands on the level: the reserved area and the core. */
  readonly blocks: readonly Rect[];
  readonly bayWidthM: Decimal;
  readonly bayLengthM: Decimal;
  readonly aisleWidthM: Decimal;
  /** The perpendicular run's pitch — column gaps included. */
  readonly perpendicular: ResidualPitch;
  /** The parallel run's pitch, 6 m to a bay — column gaps included. */
  readonly parallel: ResidualPitch;
  /** Note \*, where the run supplied the plot it applies to. Absent: no short bay is laid. */
  readonly reduced?: ReducedBayMode;
}

export interface ResidualFill {
  /** The packing's rectangles with the fill added, and any residual aisle that serves nothing gone. */
  readonly rects: readonly PlacedRect[];
  /** 5.5 m bays added. */
  readonly standard: number;
  /** 5.0 m bays added under note \*. */
  readonly reduced: number;
  /** Parallel bays added. */
  readonly parallel: number;
  /** The most 5.0 m bays this level may hold; null where note \*(a) sets no cap or no note applies. */
  readonly reducedCap: number | null;
  /** Full-size perpendicular bays on the level once the 5.5 m fill is done — what the cap is counted from. */
  readonly fullSizePerpendicular: number;
  /** Of the residual aisles `packLevel` laid, how many were kept and how many dropped for serving nothing. */
  readonly residualAisles: { readonly kept: number; readonly dropped: number };
  /** Area of the residual aisles kept, m² — circulation. */
  readonly residualAisleAreaM2: Decimal;
}

interface Box {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

const mmOf = (d: Decimal): number => d.times(1000).round().toNumber();
/** Exact where the packer's rectangles are exact; outward otherwise, so a block is never shrunk. */
const boxOf = (r: Rect): Box => ({
  x0: Math.floor(r.x.times(1000).toNumber() + 1e-6),
  y0: Math.floor(r.y.times(1000).toNumber() + 1e-6),
  x1: Math.ceil(r.x.plus(r.width).times(1000).toNumber() - 1e-6),
  y1: Math.ceil(r.y.plus(r.height).times(1000).toNumber() - 1e-6),
});
const M = (n: number): Decimal => new Decimal(n).div(1000);

const isBay = (r: PlacedRect): boolean => r.kind === 'BAY' || r.kind === 'ACCESSIBLE_BAY';

/** Merge and sort spans so `subtractIntervals` may take them. */
function merged(spans: readonly Interval[]): Interval[] {
  const sorted = [...spans].sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const [a, b] of sorted) {
    const last = out[out.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

/**
 * Whether a parallel bay's long side lies wholly against `aisle`: edge to edge,
 * and the full length of the bay. The parallel counterpart of `servingNode` in
 * `circulation.ts`, which reads a bay's mouth as its short side — true of every
 * bay entered nose first, and of no bay entered from the side.
 */
export function parallelBayServedBy(bay: Rect, aisle: Rect): boolean {
  const b = boxOf(bay);
  const a = boxOf(aisle);
  const alongX = b.x1 - b.x0 >= b.y1 - b.y0;
  if (alongX) {
    const touching = b.y0 === a.y1 || b.y1 === a.y0;
    return touching && a.x0 <= b.x0 && a.x1 >= b.x1;
  }
  const touching = b.x0 === a.x1 || b.x1 === a.x0;
  return touching && a.y0 <= b.y0 && a.y1 >= b.y1;
}

/** Whether a perpendicular bay's short side lies wholly against `aisle`. */
function perpendicularBayServedBy(bay: Rect, aisle: Rect): boolean {
  const b = boxOf(bay);
  const a = boxOf(aisle);
  const upright = b.x1 - b.x0 <= b.y1 - b.y0;
  if (upright) {
    const touching = b.y0 === a.y1 || b.y1 === a.y0;
    return touching && a.x0 <= b.x0 && a.x1 >= b.x1;
  }
  const touching = b.x0 === a.x1 || b.x1 === a.x0;
  return touching && a.y0 <= b.y0 && a.y1 >= b.y1;
}

/** A bay is served by an aisle on its open side: its short side, or its long one where it is parallel. */
export function residualBayServedBy(bay: PlacedRect, aisle: Rect): boolean {
  return isParallelRow(bay.row) ? parallelBayServedBy(bay, aisle) : perpendicularBayServedBy(bay, aisle);
}

/** The bays on one level's rectangles, by kind: full-size perpendicular, 5.0 m and parallel. */
export function countBays(rects: readonly Pick<PlacedRect, 'kind' | 'row'>[]): {
  readonly fullSize: number;
  readonly reduced: number;
  readonly parallel: number;
} {
  let fullSize = 0;
  let reduced = 0;
  let parallel = 0;
  for (const r of rects) {
    if (r.kind !== 'BAY' && r.kind !== 'ACCESSIBLE_BAY') continue;
    if (isReducedRow(r.row)) reduced += 1;
    else if (isParallelRow(r.row)) parallel += 1;
    else fullSize += 1;
  }
  return { fullSize, reduced, parallel };
}

type Phase = 'STANDARD' | 'REDUCED' | 'PARALLEL';

/**
 * Fill the residual strips of one finished packing. Pure: the same packing gives
 * the same fill, and the caller traces what it adds.
 */
export function fillResiduals(input: ResidualInput): ResidualFill {
  const W = mmOf(input.widthM);
  const D = mmOf(input.depthM);
  const aisleMm = mmOf(input.aisleWidthM);
  const bayW = mmOf(input.bayWidthM);
  const polygonT = input.polygonMm?.map((p) => ({ x: p.y, y: p.x }));

  const rects: PlacedRect[] = [...input.rects];
  const occupied: Box[] = [...rects.map(boxOf), ...input.blocks.map(boxOf)];

  /*
    A RAMP'S ENDS STAY CLEAR. A car leaves a ramp straight ahead, so the floor
    beyond each end, as wide as the ramp and as deep as an aisle, is where it
    turns — a bay there is a bay parked across the ramp's mouth.
  */
  for (const r of rects.filter((x) => x.kind === 'RAMP')) {
    const b = boxOf(r);
    if (b.y1 - b.y0 >= b.x1 - b.x0) {
      occupied.push({ x0: b.x0, y0: b.y0 - aisleMm, x1: b.x1, y1: b.y0 }, { x0: b.x0, y0: b.y1, x1: b.x1, y1: b.y1 + aisleMm });
    } else {
      occupied.push({ x0: b.x0 - aisleMm, y0: b.y0, x1: b.x0, y1: b.y1 }, { x0: b.x1, y0: b.y0, x1: b.x1 + aisleMm, y1: b.y1 });
    }
  }

  const aisles = rects
    .filter((r) => r.kind === 'AISLE')
    .map((r) => ({ r, b: boxOf(r) }))
    .sort((p, q) => p.b.y0 - q.b.y0 || p.b.x0 - q.b.x0 || p.b.x1 - q.b.x1 || p.b.y1 - q.b.y1);

  /** Spans along an aisle's long axis where a band of the given cross extent is inside the level. */
  const inside = (alongX: boolean, c0: number, c1: number): Interval[] => {
    if (input.polygonMm && polygonT) {
      return bandIntervals(alongX ? input.polygonMm : polygonT, c0, c1)
        .map(([a, b]): Interval => [Math.ceil(a - 1e-6), Math.floor(b + 1e-6)])
        .filter(([a, b]) => b > a);
    }
    const crossMax = alongX ? D : W;
    if (c0 < 0 || c1 > crossMax) return [];
    return [[0, alongX ? W : D]];
  };

  let standard = 0;
  let reduced = 0;
  let parallel = 0;
  let reducedCap: number | null = null;
  const reducedLen = mmOf(new Decimal(REDUCED_BAY_LENGTH_M));
  const parLen = mmOf(new Decimal(PARALLEL_BAY_LENGTH_M));
  const parDepth = mmOf(new Decimal(PARALLEL_BAY_DEPTH_M));

  const fill = (phase: Phase): void => {
    const depth = phase === 'STANDARD' ? mmOf(input.bayLengthM) : phase === 'REDUCED' ? reducedLen : parDepth;
    const along = phase === 'PARALLEL' ? parLen : bayW;
    const pitch = phase === 'PARALLEL' ? input.parallel : input.perpendicular;
    for (const { b: a } of aisles) {
      const alongX = a.x1 - a.x0 >= a.y1 - a.y0;
      const [a0, a1] = alongX ? [a.x0, a.x1] : [a.y0, a.y1];
      const [lo, hi] = alongX ? [a.y0, a.y1] : [a.x0, a.x1];
      for (const [c0, c1] of [
        [lo - depth, lo],
        [hi, hi + depth],
      ] as const) {
        if (phase === 'REDUCED' && reducedCap !== null && reduced >= reducedCap) return;
        const blocked = merged(
          occupied
            .filter((o) => (alongX ? o.y0 < c1 && o.y1 > c0 : o.x0 < c1 && o.x1 > c0))
            .map((o): Interval => (alongX ? [o.x0, o.x1] : [o.y0, o.y1])),
        );
        const free = subtractIntervals(intersectIntervals(inside(alongX, c0, c1), [[a0, a1]]), blocked);
        for (const [s0, s1] of free) {
          const n = pitch.fits(M(s1 - s0));
          for (let k = 0; k < n; k += 1) {
            if (phase === 'REDUCED' && reducedCap !== null && reduced >= reducedCap) return;
            const s = s0 + mmOf(pitch.along(k));
            const box: Box = alongX ? { x0: s, y0: c0, x1: s + along, y1: c1 } : { x0: c0, y0: s, x1: c1, y1: s + along };
            const row =
              phase === 'STANDARD'
                ? RESIDUAL_BAY_ROW
                : phase === 'REDUCED'
                  ? REDUCED_ROW_BASE - reduced
                  : PARALLEL_ROW_BASE - parallel;
            rects.push({ kind: 'BAY', row, x: M(box.x0), y: M(box.y0), width: M(box.x1 - box.x0), height: M(box.y1 - box.y0) });
            occupied.push(box);
            if (phase === 'STANDARD') standard += 1;
            else if (phase === 'REDUCED') reduced += 1;
            else parallel += 1;
          }
        }
      }
    }
  };

  fill('STANDARD');
  const fullSizePerpendicular = rects.filter((r) => isBay(r) && !isParallelRow(r.row) && !isReducedRow(r.row)).length;
  if (input.reduced !== undefined) {
    /*
      THE CAP IS COUNTED, NOT ESTIMATED. Note *(b) allows up to 10% of the
      perpendicular bays, short ones included: n ≤ 10% of (N + n), which is
      n ≤ N ÷ 9 with N the full-size perpendicular bays already on the level.
      Under note *(a) there is no cap.
    */
    if (input.reduced === ReducedBayMode.TEN_PERCENT) reducedCap = Math.floor(fullSizePerpendicular / 9);
    fill('REDUCED');
  }
  fill('PARALLEL');

  /*
    A RESIDUAL AISLE THAT SERVES NOTHING IS NOT DRAWN. `packLevel` lays it on
    the strength of the strip beyond it; where the core or the reserved area
    leaves no bay standing there, the strip is unused, as it was before, and a
    driveway leading nowhere is not put on the plan.
  */
  const bays = rects.filter(isBay);
  let kept = 0;
  let dropped = 0;
  let residualAisleAreaM2 = new Decimal(0);
  const out = rects.filter((r) => {
    if (r.kind !== 'AISLE' || r.row !== RESIDUAL_AISLE_ROW) return true;
    if (bays.some((b) => residualBayServedBy(b, r))) {
      kept += 1;
      residualAisleAreaM2 = residualAisleAreaM2.plus(r.width.times(r.height));
      return true;
    }
    dropped += 1;
    return false;
  });

  return {
    rects: out,
    standard,
    reduced,
    parallel,
    reducedCap,
    fullSizePerpendicular,
    residualAisles: { kept, dropped },
    residualAisleAreaM2,
  };
}
