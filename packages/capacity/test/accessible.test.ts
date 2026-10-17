/**
 * The bays a car park sets aside (DBC C.6.4 and B.7.2.6.2), and its dead-end
 * driveways (B.7.2.3.3 ¶8). 16 Oct 2026: «طبق كل مبادئ كود دبي على اى رسمه».
 *
 * The renderers could draw an accessible bay from the start and the engine never
 * designated one, so these tests hold the engine to the drawing: the count Table
 * C.17 asks for, an access aisle beside each that nobody parks in, the van bay at
 * Table C.18's width, and a supply that pays for the aisles.
 */

import { Decimal } from '@envelope/core';
import { initGeometry, type Pt } from '@envelope/geometry';
import { beforeAll, describe, expect, it } from 'vitest';

import { RECT_80x40, runInput } from '../../../test-support/pipeline.js';
import {
  accessibleRequired,
  deadEnds,
  ParkingArrangement,
  RectKind,
  runPipeline,
  type WorldRect,
} from '../src/index.js';

beforeAll(async () => {
  await initGeometry();
});

const edgesMm = (ring: readonly { x: number; y: number }[]): number[] =>
  ring.map((p, i) => {
    const q = ring[(i + 1) % ring.length]!;
    return Math.hypot(q.x - p.x, q.y - p.y);
  });
const centre = (ring: readonly { x: number; y: number }[]): { x: number; y: number } => ({
  x: ring.reduce((s, p) => s + p.x, 0) / ring.length,
  y: ring.reduce((s, p) => s + p.y, 0) / ring.length,
});

describe('how many accessible bays Table C.17 asks for', () => {
  it('reads 2% of 25 to 500, at least one, rounded up', () => {
    expect(accessibleRequired(0)).toBe(0);
    expect(accessibleRequired(25)).toBe(1);
    expect(accessibleRequired(50)).toBe(1);
    expect(accessibleRequired(51)).toBe(2);
    expect(accessibleRequired(500)).toBe(10);
  });

  it('gives one under 25, where the table has no row and C.6.4.1 ¶1 still asks for one', () => {
    expect(accessibleRequired(1)).toBe(1);
    expect(accessibleRequired(24)).toBe(1);
  });

  it('counts the first 500 at the 2% row and 1% of the rest', () => {
    expect(accessibleRequired(501)).toBe(11);
    expect(accessibleRequired(650)).toBe(12);
  });

  it('rounds down only when asked to, which is how the sensitivity is measured', () => {
    expect(accessibleRequired(130, false)).toBe(2);
    expect(accessibleRequired(130)).toBe(3);
  });
});

describe('the accessible bays on the level the street reaches', () => {
  let out: ReturnType<typeof runPipeline>;
  let plan: NonNullable<NonNullable<typeof out.levelPlan>['accessible']>;
  let grade: NonNullable<(typeof out.building.levels)[number]['parking']>;
  beforeAll(() => {
    /*
      On a flat floor, picked by the reader. The default on this plot is the
      sloped ring at 2.68%, where B.7.2.3.1 allows no accessible bay at all —
      see 'accessible parking on the sloped ring' below. These tests are about
      the designation itself, which only a floor at 2% or less receives.
    */
    out = runPipeline(runInput(RECT_80x40, { podiumLevels: 2, levelPlan: { arrangement: ParkingArrangement.DEPTH } }));
    expect(out.levelPlan!.slopedFloor).toBeUndefined();
    plan = out.levelPlan!.accessible!;
    grade = out.building.levels.find((l) => l.id === 'G')!.parking!;
  });

  it('places what the table asks for on the ground floor, and says the reading is assumed', () => {
    expect(plan.onGrade).toBe(true);
    const total = out.levelPlan!.grade!.bayCount.value + out.levelPlan!.bayCount.value;
    expect(plan.required.value).toBe(accessibleRequired(total));
    expect(plan.placed.value).toBe(plan.required.value);
    expect(plan.required.provenanceClass).toBe('ASSUMED');
    expect(grade.bays.filter((b) => b.accessible)).toHaveLength(plan.placed.value);
  });

  it('gives every accessible bay an access aisle of at least 1.2 m, beside it, with no car in it', () => {
    const aisles = grade.accessAisles ?? [];
    expect(aisles).toHaveLength(plan.lost);
    const accessible = grade.bays.filter((b) => b.accessible);
    for (const aisle of aisles) {
      expect(Math.min(...edgesMm(aisle))).toBeGreaterThanOrEqual(1200);
      const c = centre(aisle);
      // Beside one: centre to centre no more than half a van bay and half the aisle apart, plus a millimetre.
      expect(accessible.some((b) => Math.hypot(centre(b.outline).x - c.x, centre(b.outline).y - c.y) <= 3001)).toBe(true);
    }
    for (const b of accessible) {
      const c = centre(b.outline);
      expect(aisles.some((a) => Math.hypot(centre(a).x - c.x, centre(a).y - c.y) <= 3001)).toBe(true);
    }
  });

  it('makes one of them a van bay at Table C.18’s 3.35 m', () => {
    const vans = grade.bays.filter((b) => b.use === 'VAN');
    expect(vans).toHaveLength(1);
    expect(vans[0]!.accessible).toBe(true);
    expect(Math.round(Math.min(...edgesMm(vans[0]!.outline)))).toBe(3350);
  });

  it('pays for the aisles in the supply, and leaves the level above the shared layout', () => {
    expect(plan.bayCount.value).toBe(out.levelPlan!.grade!.bayCount.value - plan.lost);
    expect(out.parking.providedBays.value).toBe(plan.bayCount.value + out.levelPlan!.bayCount.value);
    const above = out.building.levels.find((l) => l.id === 'P1')!.parking!;
    expect(above.bays.some((b) => b.accessible || b.use)).toBe(false);
    expect(above.accessAisles).toBeUndefined();
  });

  it('marks the preferred bays B.7.2.6.2 asks for, apart from the accessible ones', () => {
    const preferred = plan.preferred!;
    expect(preferred.required.value).toBeGreaterThan(0);
    expect(preferred.placed).toBe(preferred.required.value);
    const marked = grade.bays.filter((b) => b.use === 'PREFERRED');
    expect(marked).toHaveLength(preferred.placed);
    expect(marked.some((b) => b.accessible)).toBe(false);
  });

  it('measures the farthest accessible bay from the core in a straight line, and says walking is not assessed', () => {
    expect(plan.farthestM).not.toBeNull();
    expect(plan.farthestM!.value.toNumber()).toBeGreaterThan(0);
    expect(plan.notes.some((n) => n.includes('NOT ASSESSED'))).toBe(true);
  });
});

/*
  DBC B.7.2.3.1, p83: "Accessible parking slopes shall be limited to a maximum
  of 2%." The sloped ring is the default on this plot because it places the most
  bays, and its floor falls 2.68% — the engine's own figure. Accessible bays and
  their aisles were designated on it with no check and no note.
*/
describe('accessible parking on the sloped ring', () => {
  let out: ReturnType<typeof runPipeline>;
  beforeAll(() => {
    out = runPipeline(runInput(RECT_80x40, { podiumLevels: 2 }));
  });

  it('is the default arrangement here, and falls more than 2%', () => {
    expect(out.levelPlan!.layout.arrangement).toBe(ParkingArrangement.SLOPED);
    expect(out.levelPlan!.slopedFloor!.gradientPct.value.gt(2)).toBe(true);
  });

  it('designates no accessible bay and no access aisle on a floor steeper than 2%', () => {
    const plan = out.levelPlan!.accessible!;
    expect(plan.placed.value).toBe(0);
    expect(plan.lost).toBe(0);
    expect(plan.slope!.blocked).toBe(true);
    for (const level of out.building.levels) {
      expect(level.parking?.bays.some((b) => b.accessible) ?? false).toBe(false);
      expect(level.parking?.accessAisles).toBeUndefined();
    }
  });

  it('says the shortfall in words, with both figures and the clause', () => {
    const plan = out.levelPlan!.accessible!;
    const g = out.levelPlan!.slopedFloor!.gradientPct.value.toFixed(2);
    expect(plan.notes.join(' ')).toContain(
      `None of the ${plan.required.value} accessible bays Table C.17 asks for is placed: the ground floor is the ` +
        `sloped ring, whose floor falls ${g}%, and DBC B.7.2.3.1 limits accessible parking to 2%.`,
    );
    // No flat arrangement was tried for them, so the note may not promise one would take them.
    expect(plan.notes.join(' ')).toContain('the reader may pick one with a flat floor.');
    expect(plan.notes.join(' ')).not.toMatch(/flat floor would/);
  });

  it('cites the 2% on page 83 in the graph, not only in the sentence', () => {
    const plan = out.levelPlan!.accessible!;
    expect(plan.slope!.limitPct.provenanceClass).toBe('DERIVED');
    const tree = JSON.stringify(out.graph.derivationOf(plan.placed.node));
    expect(tree).toContain('B.7.2.3.1');
    expect(tree).toContain('"sourcePage":83');
  });

  it('does not change the arrangement to dodge the check, and keeps every bay in the supply', () => {
    expect(out.levelPlan!.layout.arrangement).toBe(ParkingArrangement.SLOPED);
    const perLevel = out.levelPlan!.bayCount.value;
    const atGrade = out.levelPlan!.grade!.bayCount.value;
    expect(out.parking.providedBays.value).toBe(atGrade + perLevel);
  });

  it('designates them as before once the reader picks a flat floor', () => {
    const flat = runPipeline(
      runInput(RECT_80x40, { podiumLevels: 2, levelPlan: { arrangement: ParkingArrangement.DEPTH } }),
    );
    const plan = flat.levelPlan!.accessible!;
    expect(plan.slope).toBeUndefined();
    expect(plan.placed.value).toBe(plan.required.value);
  });
});

describe('dead-end driveways', () => {
  const rect = (kind: WorldRect['kind'], x: number, y: number, w: number, h: number): WorldRect => {
    const [x0, y0, x1, y1] = [x * 1000, y * 1000, (x + w) * 1000, (y + h) * 1000];
    return {
      kind,
      row: 0,
      xM: new Decimal(x),
      yM: new Decimal(y),
      widthM: new Decimal(w),
      heightM: new Decimal(h),
      world: [
        { x: x0, y: y0 },
        { x: x1, y: y0 },
        { x: x1, y: y1 },
        { x: x0, y: y1 },
      ] as Pt[],
    };
  };
  const bayRow = (y: number, n: number): WorldRect[] =>
    Array.from({ length: n }, (_, i) => rect(RectKind.BAY, i * 2.5, y, 2.5, 5.5));
  const six = new Decimal(6);

  it('finds a module aisle served from one end, with every bay on it, and its closed end', () => {
    // Twelve bays a side on a 30 m aisle; the cross aisle meets its right-hand end.
    const rects = [
      ...bayRow(0, 12),
      rect(RectKind.AISLE, 0, 5.5, 30, 6),
      ...bayRow(11.5, 12),
      rect(RectKind.AISLE, 30, 0, 6, 17),
      rect(RectKind.RAMP, 30, 17, 6, 10),
    ];
    const ends = deadEnds(rects, six);
    expect(ends).toHaveLength(1);
    expect(ends[0]!.bays).toBe(24);
    expect(ends[0]!.at).toEqual({ x: 0, y: 8500 });
  });

  it('finds none on an aisle with a way out at both ends', () => {
    const rects = [
      ...bayRow(0, 12),
      rect(RectKind.AISLE, 0, 5.5, 30, 6),
      rect(RectKind.AISLE, -6, 0, 6, 17),
      rect(RectKind.AISLE, 30, 0, 6, 17),
      rect(RectKind.RAMP, 30, 17, 6, 10),
    ];
    expect(deadEnds(rects, six).filter((e) => e.bays > 0 && e.at.y === 8500)).toHaveLength(0);
  });

  it('is reported on the drawn level and changes no count', () => {
    const out = runPipeline(runInput(RECT_80x40));
    const level = out.building.levels.find((l) => l.parking)!.parking!;
    expect(level.deadEnds).toBeDefined();
    expect(level.bays.length).toBe(Number(level.bayCount.value));
  });
});
