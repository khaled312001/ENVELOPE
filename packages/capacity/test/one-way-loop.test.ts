/**
 * The one-way loop on plot 6468096 — the plot the reference drawings are of.
 *
 * Those drawings (levels A-101 to A-107) lay every parking level the same way:
 * bays against the four walls and on islands, 5.50 m aisles between the rows,
 * arrows the whole way round, and no dead end. Table B.11 has that row ("90°,
 * one way, driveway 5.5") and the engine had transcribed it and never laid it
 * out, so its default on this plot was modules whose dead ends served 52 and 45
 * bays. These hold the seventh candidate to what the drawings show, on the
 * run the studio sends for this plot.
 */

import { Decimal } from '@envelope/core';
import { initGeometry } from '@envelope/geometry';
import { COLUMN_GAP_STATEMENT, PODIUM_SETBACK_STATEMENT } from '@envelope/rules';
import { beforeAll, describe, expect, it } from 'vitest';

import { pt, runInput } from '../../../test-support/pipeline.js';
import { ParkingArrangement, RectKind, runPipeline } from '../src/index.js';

beforeAll(async () => {
  await initGeometry();
});

/** Plot 6468096, solved from its affection plan's own corner table: 87.25 × 51.38 m with its two chamfers. */
const P6468096 = [pt(3.148, 0), pt(82.998, 0), pt(87.25, 4.89), pt(87.25, 51.38), pt(0, 51.38), pt(0, 4)];
/** The schedule its drawings print: three basements, and five parking levels above a ground floor that is not parking. */
const A_104 = { basements: 3, groundIsParking: false, podiumAboveGround: 5, podiumParkingLevels: 5 } as const;
const ref = (s: typeof PODIUM_SETBACK_STATEMENT) => ({
  statementId: s.statementId,
  statedBy: s.statedBy.name,
  statedOn: s.statedOn,
  verbatim: s.verbatim,
});
const STUDIO = {
  levelSchedule: A_104,
  podiumAtBoundaryStatement: ref(PODIUM_SETBACK_STATEMENT),
  columnGapStatement: { ...ref(COLUMN_GAP_STATEMENT), gapM: new Decimal(COLUMN_GAP_STATEMENT.value) },
};

/** What the architect's own typical level carries. Not asserted against: the drawing places stairs, risers and columns the engine does not. */
const ARCHITECT_TYPICAL_LEVEL = 98;

describe('the one-way loop on plot 6468096', () => {
  let out: ReturnType<typeof runPipeline>;
  beforeAll(() => {
    out = runPipeline(runInput(P6468096 as never, STUDIO as never));
  });

  it('is offered, packed, and has no dead end', () => {
    const loop = out.levelPlan!.layout.arrangements.find((a) => a.id === ParkingArrangement.ONE_WAY_LOOP);
    expect(loop).toBeDefined();
    expect(loop!.bayCount).toBeGreaterThan(0);
    expect(loop!.deadEnds).toEqual([]);
  });

  it('is the default, as the most bays where no dead end serves more than eight', () => {
    expect(out.levelPlan!.layout.arrangement).toBe(ParkingArrangement.ONE_WAY_LOOP);
    expect(out.levelPlan!.deadEnds).toEqual([]);
    // The module arrangement that used to be the default is still offered, with its dead ends.
    const width = out.levelPlan!.layout.arrangements.find((a) => a.id === ParkingArrangement.WIDTH)!;
    expect(Math.max(...(width.deadEnds ?? []))).toBeGreaterThan(8);
  });

  it('lays every aisle at 5.5 m with a direction, and every bay where traffic passes it', () => {
    const level = out.building.levels.find((l) => l.id === 'P1')!.parking!;
    const aisles = out.levelPlan!.rects.filter((r) => r.kind === RectKind.AISLE && r.travel !== undefined);
    expect(aisles.length).toBeGreaterThanOrEqual(4);
    for (const a of aisles) expect(Decimal.min(a.widthM, a.heightM).toString()).toBe('5.5');
    expect(level.bays).toHaveLength(out.levelPlan!.bayCount.value);
  });

  /*
    Review, 17 Oct 2026: the core stands across the island aisle on this plot,
    and both halves of it were drawn — one-way arrows running into the core,
    "5.50M WIDE 1 WAY DRIVEWAY" on each, no bay opening onto either — under a
    note saying no aisle ends in a dead end. A one-way stretch a car can only
    nose into and back out of is not an aisle.
  */
  it('draws no one-way aisle that no bay opens onto, and says what the core cut off', () => {
    const rects = out.levelPlan!.rects;
    const bays = rects.filter((r) => r.kind === RectKind.BAY || r.kind === RectKind.ACCESSIBLE_BAY);
    const shared = (a: (typeof rects)[number], b: (typeof rects)[number]): number => {
      const [ax1, ay1, bx1, by1] = [a.xM.plus(a.widthM), a.yM.plus(a.heightM), b.xM.plus(b.widthM), b.yM.plus(b.heightM)];
      const ox = Decimal.min(ax1, bx1).minus(Decimal.max(a.xM, b.xM));
      const oy = Decimal.min(ay1, by1).minus(Decimal.max(a.yM, b.yM));
      // Touching along an edge: no depth one way, a length the other.
      return ox.abs().lt('0.001') ? oy.toNumber() : oy.abs().lt('0.001') ? ox.toNumber() : 0;
    };
    const oneWay = rects.filter((r) => r.kind === RectKind.AISLE && r.travel !== undefined);
    for (const a of oneWay) {
      expect(
        bays.some((b) => shared(a, b) >= 2),
        `aisle ${a.xM.toString()},${a.yM.toString()} ${a.widthM.toString()} × ${a.heightM.toString()} serves no bay`,
      ).toBe(true);
    }
    const notes = out.levelPlan!.layout.notes;
    expect(notes.some((n) => /^2 stretch\(es\) of aisle across the island are cut off by the core/.test(n))).toBe(true);
    expect(notes.some((n) => n.includes('and 0 aisle(s) cross the island'))).toBe(true);
  });

  it('records its count beside the architect’s', () => {
    // Measured, 17 Oct 2026: 107 bays a typical level, against the 98 the
    // architect's level carries — 9 more. The engine places no stair, riser or
    // column, and its core is one rectangle, so it counts more than a drawn
    // level holds. That is reported, not tuned away: the difference is a
    // question for the client, and pinning the figure here makes any change to
    // it a decision somebody sees.
    expect(out.levelPlan!.bayCount.value).toBe(107);
    expect(out.levelPlan!.bayCount.value - ARCHITECT_TYPICAL_LEVEL).toBe(9);
  });
});
