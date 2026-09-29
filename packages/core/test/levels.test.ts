/**
 * The level schedule, and the off-by-one it exists to end.
 *
 * Every assertion here is about one of two things: that `G+2P+8` means three
 * levels on the podium footprint rather than two, and that a schedule which
 * does not describe a building is refused rather than rounded into one. Both
 * were real defects — the first shipped and drew a short podium on every plot
 * whose sheet stated one; the second was the clamp that would have hidden it.
 */

import { describe, expect, it } from 'vitest';

import {
  levelCode,
  parkingLevels,
  podiumFootprintLevels,
  scheduleRefusal,
  type LevelSchedule,
} from '../src/levels.js';

/** `G+2P+8`, as the Warsan affection plan prints it. */
const WARSAN: LevelSchedule = {
  basements: 0,
  groundIsParking: true,
  podiumAboveGround: 2,
  podiumParkingLevels: 2,
};

const schedule = (over: Partial<LevelSchedule>): LevelSchedule => ({ ...WARSAN, ...over });

describe('the podium footprint count', () => {
  it('counts the ground floor, so "G+2P" is three levels and not two', () => {
    expect(podiumFootprintLevels(WARSAN)).toBe(3);
  });

  it('is one where the code states no podium at all, because the ground floor is still on it', () => {
    expect(podiumFootprintLevels(schedule({ podiumAboveGround: 0, podiumParkingLevels: 0 }))).toBe(
      1,
    );
  });
});

describe('the parking level count', () => {
  it('is the basements, the ground floor if it is parking, and the podium levels that hold it', () => {
    expect(parkingLevels(schedule({ basements: 2 }))).toBe(5);
  });

  it('leaves out a ground floor given to something else', () => {
    expect(parkingLevels(schedule({ basements: 2, groundIsParking: false }))).toBe(4);
  });

  it('counts only the podium levels that hold parking, not every podium level', () => {
    expect(parkingLevels(schedule({ podiumAboveGround: 4, podiumParkingLevels: 1 }))).toBe(2);
  });
});

describe('the height code', () => {
  it('is written the way a Dubai architect writes it', () => {
    expect(levelCode(schedule({ basements: 2, podiumAboveGround: 3 }), 35)).toBe('2B+G+3P+35');
  });

  it('leaves out a part with a count of zero rather than writing 0B', () => {
    expect(levelCode(schedule({ podiumAboveGround: 0, podiumParkingLevels: 0 }), 35)).toBe('G+35');
  });

  it('reproduces what the sheet prints for the schedule the sheet describes', () => {
    expect(levelCode(WARSAN, 8)).toBe('G+2P+8');
  });

  it('omits the tower before a run has produced one', () => {
    expect(levelCode(schedule({ basements: 1 }), 0)).toBe('1B+G+2P');
  });
});

describe('a schedule that does not describe a building', () => {
  it('is refused, not clamped, when it parks more podium levels than it has', () => {
    const refusal = scheduleRefusal(schedule({ podiumAboveGround: 1, podiumParkingLevels: 3 }));
    expect(refusal).toContain('3 podium level(s) of parking');
    expect(refusal).toContain('1 podium level(s)');
  });

  it('is refused when it provides no parking at all', () => {
    const refusal = scheduleRefusal({
      basements: 0,
      groundIsParking: false,
      podiumAboveGround: 2,
      podiumParkingLevels: 0,
    });
    expect(refusal).toContain('no parking at all');
  });

  it('is refused for a fractional count, which a typed field cannot stop on its own', () => {
    expect(scheduleRefusal(schedule({ basements: 1.5 }))).toContain('whole number');
    expect(scheduleRefusal(schedule({ podiumAboveGround: 2.5 }))).toContain('whole number');
  });

  it('is refused for a negative count', () => {
    expect(scheduleRefusal(schedule({ basements: -1 }))).toContain('zero or more');
  });

  it('passes the sheet it was drawn from', () => {
    expect(scheduleRefusal(WARSAN)).toBeNull();
  });
});
