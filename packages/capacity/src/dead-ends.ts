/**
 * Dead-end driveways, DBC B.7.2.3.3 ¶8: "should be avoided. If they are to be
 * included in design, they should serve a maximum of eight spaces with
 * manoeuvring space provided (see Figure B.58)."
 *
 * A "should", so this is an observation and never a reason to drop a bay: the
 * count is reported and the closed end is labelled on the drawing, and whether
 * the design keeps it is the architect's call. Every double-loaded module that
 * meets the cross aisle at one end only is a dead end, so on most levels this
 * finds several, which is exactly what a reader needs to see before an
 * authority does.
 *
 * Measured on the packer's own axis-aligned rectangles, where touching is exact:
 * an aisle's way out is any aisle or ramp that meets it across at least a
 * driveway's width, and the stretch beyond the last way out is the dead end.
 * Whether the manoeuvring space Figure B.58 asks for is there is NOT ASSESSED.
 */

import { Decimal, type Citation } from '@envelope/core';
import type { Pt } from '@envelope/geometry';

import { ENTRY_DRIVE_ROW, RectKind } from './layout.js';
import type { WorldRect } from './level-plan.js';

/** B.7.2.3.3 ¶8: the most spaces a dead-end driveway should serve. */
export const DEAD_END_MAX_BAYS = 8;

/** The clause, held to its page by `test/dbc-citations.test.ts`. */
export const DEAD_END_B7233: Citation = {
  instrumentId: 'DUBAI_BUILDING_CODE',
  instrumentVersion: '2021',
  clauseReference: 'B.7.2.3.3 ¶8 — Dead-end driveways',
  documentUri: 'docs/00-source/regulations/Dubai Building Code_English_2021 Edition_compressed.pdf',
  sourcePage: 85,
  sourceBbox: [0, 0, 842, 595],
  sourceTextVerbatim:
    'Dead-end driveways should be avoided. If they are to be included in design, they should serve a ' +
    'maximum of eight spaces with manoeuvring space provided (see Figure B.58).',
};

export interface DeadEnd {
  /** Bays whose open end is on the dead-end stretch. */
  readonly bays: number;
  /** The closed end's centre, plot millimetres: where the drawing says so. */
  readonly at: Pt;
  /** The other end's centre: the way along the aisle, so the words run down it rather than across what is beside it. */
  readonly along: Pt;
}

const TOL = new Decimal('0.01');

interface Span {
  readonly s0: Decimal;
  readonly s1: Decimal;
  readonly t0: Decimal;
  readonly t1: Decimal;
}

/** The rectangle along `alongX`'s axis (s) and across it (t). */
function span(r: DeadEndRect, alongX: boolean): Span {
  return alongX
    ? { s0: r.xM, s1: r.xM.plus(r.widthM), t0: r.yM, t1: r.yM.plus(r.heightM) }
    : { s0: r.yM, s1: r.yM.plus(r.heightM), t0: r.xM, t1: r.xM.plus(r.widthM) };
}

const overlap = (a0: Decimal, a1: Decimal, b0: Decimal, b1: Decimal): Decimal =>
  Decimal.min(a1, b1).minus(Decimal.max(a0, b0));

const mid = (a: Pt, b: Pt): Pt => ({ x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) }) as Pt;

/**
 * What the scan needs of a rectangle: its kind, its row and where it stands in
 * the packing rectangle's own metres. A `WorldRect` is one; so is the layout's
 * own `PlacedRect` once renamed, which is how the layout measures the dead ends
 * of every arrangement before it picks one (`deadEndBays`).
 */
export type DeadEndRect = Pick<WorldRect, 'kind' | 'row' | 'xM' | 'yM' | 'widthM' | 'heightM'>;

/** One dead-end stretch: the aisle it is on, which end is closed, and the bays it serves. */
interface DeadEndRun<R extends DeadEndRect> {
  readonly aisle: R;
  /** True where the closed end is the aisle's start (lower x or y), false at its far end. */
  readonly atStart: boolean;
  readonly bays: number;
}

/**
 * Every dead-end stretch, measured on rectangles alone. `deadEnds` places each on
 * the plot for the drawing; `deadEndBays` hands the layout the counts. One scan,
 * so the figure the default arrangement is chosen by is the figure the sheet
 * prints at the closed end.
 */
function deadEndRuns<R extends DeadEndRect>(rects: readonly R[], drivewayWidthM: Decimal, parallel: boolean): DeadEndRun<R>[] {
  const drivable = rects.filter((r) => r.kind === RectKind.AISLE || r.kind === RectKind.RAMP);
  const hasRamp = rects.some((r) => r.kind === RectKind.RAMP);
  const bays = rects.filter((r) => r.kind === RectKind.BAY || r.kind === RectKind.ACCESSIBLE_BAY);
  const need = drivewayWidthM.minus(TOL);
  const out: DeadEndRun<R>[] = [];

  for (const a of drivable) {
    if (a.kind !== RectKind.AISLE) continue;
    const alongX = a.widthM.gte(a.heightM);
    const A = span(a, alongX);
    // Where along the aisle a car can leave it.
    const ways: [Decimal, Decimal][] = [];
    for (const b of drivable) {
      if (b === a) continue;
      const B = span(b, alongX);
      const across = overlap(A.t0, A.t1, B.t0, B.t1);
      const along = overlap(A.s0, A.s1, B.s0, B.s1);
      // Meeting it end on, or crossing it: the opening is its width across the aisle.
      if (along.gte(TOL.neg()) && across.gte(need)) {
        ways.push([Decimal.max(A.s0, B.s0), Decimal.min(A.s1, B.s1)]);
        continue;
      }
      // Alongside it, a long side shared for at least a driveway's width.
      if (across.abs().lte(TOL) && along.gte(need)) {
        ways.push([Decimal.max(A.s0, B.s0), Decimal.min(A.s1, B.s1)]);
      }
    }
    // The way in, where no ramp is laid: an aisle from the packing rectangle's edge, or the entry drive.
    if (!hasRamp && (a.row === ENTRY_DRIVE_ROW || (alongX ? a.xM : a.yM).isZero())) ways.push([A.s0, A.s0]);
    if (ways.length === 0) continue;
    const lo = Decimal.min(...ways.map((w) => w[0]));
    const hi = Decimal.max(...ways.map((w) => w[1]));

    const fronting = (from: Decimal, to: Decimal): number =>
      bays.filter((b) => {
        const B = span(b, alongX);
        const touches = B.t1.minus(A.t0).abs().lte(TOL) || B.t0.minus(A.t1).abs().lte(TOL);
        const opensHere = B.s1.minus(B.s0).lte(B.t1.minus(B.t0)) !== parallel;
        const centre = B.s0.plus(B.s1).div(2);
        return touches && opensHere && centre.gt(from) && centre.lt(to);
      }).length;

    const before = fronting(A.s0, lo);
    if (lo.minus(A.s0).gt(TOL) && before > 0) out.push({ aisle: a, atStart: true, bays: before });
    const after = fronting(hi, A.s1);
    if (A.s1.minus(hi).gt(TOL) && after > 0) out.push({ aisle: a, atStart: false, bays: after });
  }
  return out;
}

/**
 * `parallel`: the bays are Table B.11's parallel ones, whose long side is their
 * open side. Every other bay opens on its short side, and a bay whose long side
 * merely runs beside an aisle is served by another one.
 */
export function deadEnds(rects: readonly WorldRect[], drivewayWidthM: Decimal, parallel = false): readonly DeadEnd[] {
  return deadEndRuns(rects, drivewayWidthM, parallel).map(({ aisle, atStart, bays }) => {
    const alongX = aisle.widthM.gte(aisle.heightM);
    const [c0, c1, c2, c3] = aisle.world as readonly [Pt, Pt, Pt, Pt];
    const startEnd = alongX ? mid(c0, c3) : mid(c0, c1);
    const finishEnd = alongX ? mid(c1, c2) : mid(c3, c2);
    return atStart ? { bays, at: startEnd, along: finishEnd } : { bays, at: finishEnd, along: startEnd };
  });
}

/**
 * The bays each dead-end stretch serves, in the packing rectangle's own metres
 * and before anything is placed on the plot: what `layoutParkingLevel` ranks its
 * arrangements by (`DEFAULT_ARRANGEMENT_RULE`).
 *
 * A cycle with `layout.ts`, and a safe one: each reads the other's names only
 * inside a function, at call time, never while the module loads.
 */
export function deadEndBays(rects: readonly DeadEndRect[], drivewayWidthM: Decimal, parallel = false): readonly number[] {
  return deadEndRuns(rects, drivewayWidthM, parallel).map((r) => r.bays);
}
