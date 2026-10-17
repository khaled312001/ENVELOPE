/**
 * Which levels park is what the schedule says, level for level.
 *
 * Plot 6468096: the architect's A-104 ground floor is retail, restaurants and a
 * lobby, and A-105 to A-109 park P1 to P5 above it. The run was given exactly
 * that — `{ basements: 3, groundIsParking: false, podiumAboveGround: 5,
 * podiumParkingLevels: 5 }` — and the model filled G to P4 with bays and left P5
 * empty: the right number of parking levels on the wrong ones. G then carried the
 * drive from the entrance, the transformer band and the accessible bays, and
 * every export drew them on a shop floor.
 */

import { initGeometry } from '@envelope/geometry';
import { beforeAll, describe, expect, it } from 'vitest';

import { RECT_80x40, runInput } from '../../../test-support/pipeline.js';
import { ParkingArrangement, runPipeline, type RunOutput } from '../src/index.js';

beforeAll(async () => {
  await initGeometry();
});

const A_104 = { basements: 3, groundIsParking: false, podiumAboveGround: 5, podiumParkingLevels: 5 } as const;
/*
  A flat floor, picked as a reader would. The default here is the sloped ring,
  where B.7.2.3.1 lets no accessible bay stand (accessible.test.ts), and these
  tests are about which level holds them.
*/
const FLAT = { arrangement: ParkingArrangement.DEPTH } as const;

describe('a ground floor the schedule does not give to parking', () => {
  let out: RunOutput;
  beforeAll(() => {
    out = runPipeline(runInput(RECT_80x40, { levelSchedule: A_104, levelPlan: FLAT }));
  });

  it('parks B3 to B1 and P1 to P5, and not G', () => {
    expect(out.levelPlanRefusal).toBeUndefined();
    const parking = out.building.levels.filter((l) => l.parking).map((l) => l.id);
    expect(parking).toEqual(['B3', 'B2', 'B1', 'P1', 'P2', 'P3', 'P4', 'P5']);
    const g = out.building.levels.find((l) => l.id === 'G')!;
    expect(g.use).toBe('PODIUM');
    expect(g.parking).toBeNull();
    expect(g.name).toBe('Ground floor');
    for (const id of ['P1', 'P2', 'P3', 'P4', 'P5']) {
      expect(out.building.levels.find((l) => l.id === id)!.use).toBe('PODIUM_PARKING');
    }
  });

  it('puts no drive, no transformer band and no grade plan on it, and says where the substation is not', () => {
    expect(out.levelPlan!.grade).toBeUndefined();
    expect(out.building.groundRooms).toBeUndefined();
    for (const l of out.building.levels) expect(l.parking?.drives).toBeUndefined();
    expect(out.building.notModelled.join(' ')).toContain(
      'The substation and the LV room. The ground floor does not park, and the band against the road is cut only ' +
        'from a ground floor that does; where they stand on this one is NOT ASSESSED.',
    );
  });

  it('designates the accessible bays on the first basement, the level the existing rule names', () => {
    const accessible = out.levelPlan!.accessible!;
    expect(accessible.onGrade).toBe(false);
    expect(accessible.level).toBe('FIRST_BASEMENT');
    const withAccessible = out.building.levels.filter((l) => l.parking?.bays.some((b) => b.accessible)).map((l) => l.id);
    expect(withAccessible).toEqual(['B1']);
  });

  it('counts the supply on the eight levels that park', () => {
    const perLevel = out.levelPlan!.bayCount.value;
    const lost = out.levelPlan!.accessible!.lost;
    expect(Number(out.building.drawnBays.value)).toBe(perLevel * 8 - lost);
    expect(out.parking.providedBays.value).toBe(perLevel * 8 - lost);
    const drawn = out.building.levels.reduce((s, l) => s + (l.parking?.bays.length ?? 0), 0);
    expect(drawn).toBe(Number(out.building.drawnBays.value));
  });

  it('draws no ramp across the ground floor, and says the two street ramps are not modelled', () => {
    for (const r of out.building.ramps) {
      expect(r.toElevationMm - r.fromElevationMm).toBe(out.building.levels[0]!.heightMm);
    }
    expect(out.building.ramps.some((r) => r.fromLevelId === 'B1' && r.toLevelId === 'P1')).toBe(false);
    const said = out.building.notModelled.join(' ');
    expect(said).toMatch(/The ramp from the street down to the first basement/);
    expect(said).toMatch(/The ramp from the street up to the first podium parking level/);
  });

  it('says where the parking is in words that match the stack', () => {
    const placement = out.building.placements.find((p) => p.subject === 'parking levels')!;
    expect(placement.statement).toBe(
      'Parking levels: 5 in the podium above a ground floor that does not park, 3 below grade.',
    );
  });

  it('places the answer on the ground floor first, then above the podium parking', () => {
    const above = out.building.levels.filter((l) => l.parking === null && l.elevationMm >= 0);
    const answer = out.capacity.levels.value;
    expect(above.filter((l) => l.placed).length).toBe(Math.min(answer, above.length));
    expect(out.building.levels.find((l) => l.id === 'G')!.placed).toBe(true);
    const placed = above.filter((l) => l.placed).length;
    const statement = out.building.placements.find((p) => p.subject === 'answer')!.statement;
    expect(statement).toContain(
      `drawn as the ground floor and the lowest ${placed - 1} above the podium parking.`,
    );
  });
});

describe('a ground floor that does not park, with no basement', () => {
  it('puts the accessible bays on P1, the first level a car reaches', () => {
    const out = runPipeline(
      runInput(RECT_80x40, {
        levelSchedule: { basements: 0, groundIsParking: false, podiumAboveGround: 2, podiumParkingLevels: 2 },
        levelPlan: FLAT,
      }),
    );
    expect(out.building.levels.filter((l) => l.parking).map((l) => l.id)).toEqual(['P1', 'P2']);
    const accessible = out.levelPlan!.accessible!;
    expect(accessible.level).toBe('FIRST_PODIUM');
    const p1 = out.building.levels.find((l) => l.id === 'P1')!.parking!;
    const p2 = out.building.levels.find((l) => l.id === 'P2')!.parking!;
    expect(p1.bays.some((b) => b.accessible)).toBe(true);
    expect(p2.bays.some((b) => b.accessible)).toBe(false);
    expect(out.building.notModelled.join(' ')).toMatch(/The ramp from the street up to the first podium parking level/);
    expect(out.building.notModelled.join(' ')).not.toMatch(/street down to the first basement/);
  });

  it('says a one-level answer is the ground floor, not "the ground floor and the lowest 0"', () => {
    const out = runPipeline(
      runInput(RECT_80x40, {
        levelSchedule: { basements: 0, groundIsParking: false, podiumAboveGround: 1, podiumParkingLevels: 1 },
        levelPlan: FLAT,
      }),
    );
    expect(out.capacity.levels.value).toBe(1);
    const statement = out.building.placements.find((p) => p.subject === 'answer')!.statement;
    expect(statement).toMatch(/^The answer places 1 level of floor area, drawn as the ground floor\./);
    expect(statement).not.toMatch(/lowest 0/);
    expect(out.building.levels.find((l) => l.id === 'G')!.placed).toBe(true);
  });
});

describe('a ground floor the schedule does give to parking', () => {
  it('still parks G and the podium levels above it, from the ground up', () => {
    const out = runPipeline(
      runInput(RECT_80x40, {
        levelSchedule: { basements: 1, groundIsParking: true, podiumAboveGround: 3, podiumParkingLevels: 2 },
      }),
    );
    expect(out.building.levels.filter((l) => l.parking).map((l) => l.id)).toEqual(['B1', 'G', 'P1', 'P2']);
    expect(out.levelPlan!.accessible!.level).toBe('GROUND');
    expect(out.building.levels.find((l) => l.id === 'P3')!.parking).toBeNull();
  });
});
