/**
 * The boundary bands — Eng. Mohamed, 2026-09-28: *"في road , road type … بس لازم
 * رمز ليهم"*.
 *
 * Two things are worth testing and neither is the width table. The first is the
 * side: a band drawn inward lies on the setback strip and reads as another
 * limit, and the direction is decided from the ring's own winding rather than
 * from an assumed one — so a clockwise ring must come out the same way round as
 * a counter-clockwise one. The second is that the ranking survives the scaling
 * that keeps a band inside a small plot's sheet.
 */

import type { ModelPoint, ModelRing } from '@envelope/core';
import { describe, expect, it } from 'vitest';

import { BAND_NOTE, bandWidthM, edgeBand, ROAD_BAND_M } from '../src/edges.js';

const p = (x: number, y: number): ModelPoint => ({ x: (x * 1000) as ModelPoint['x'], y: (y * 1000) as ModelPoint['y'] });

/** 80 x 40, counter-clockwise. */
const CCW: ModelRing = [p(0, 0), p(80, 0), p(80, 40), p(0, 40)];
/** The same rectangle, wound the other way. */
const CW: ModelRing = [...CCW].reverse();

/** Whether a point is inside the rectangle, which is all this file needs. */
const inside = (q: ModelPoint): boolean =>
  q.x > 0 && q.x < 80_000 && q.y > 0 && q.y < 40_000;

describe('which side the band is drawn on', () => {
  it('is outside the plot on a counter-clockwise ring', () => {
    const band = edgeBand(CCW, CCW[0]!, CCW[1]!, 6)!;
    expect(band).not.toBeNull();
    // The two offset corners are the ones that must land outside.
    expect(inside(band[2]!)).toBe(false);
    expect(inside(band[3]!)).toBe(false);
    expect(band[2]!.y).toBeLessThan(0);
  });

  it('is outside the plot on a clockwise ring too, which is the point of reading the winding', () => {
    // The same physical edge, taken from the reversed ring.
    const start = CW[3]!;
    const end = CW[2]!;
    const band = edgeBand(CW, start, end, 6)!;
    expect(inside(band[2]!)).toBe(false);
    expect(inside(band[3]!)).toBe(false);
  });

  it('starts on the boundary, so the band and the edge share a line', () => {
    const band = edgeBand(CCW, CCW[0]!, CCW[1]!, 6)!;
    expect(band[0]).toEqual(CCW[0]);
    expect(band[1]).toEqual(CCW[1]);
  });

  it('is the width it was asked for, on the millimetre grid', () => {
    const band = edgeBand(CCW, CCW[0]!, CCW[1]!, 4.5)!;
    expect(Math.abs(band[3]!.y - band[0]!.y)).toBe(4500);
  });
});

describe('a band that is not drawn', () => {
  it('is not drawn at zero width', () => {
    expect(edgeBand(CCW, CCW[0]!, CCW[1]!, 0)).toBeNull();
  });

  it('is not drawn for an unclassified edge, because that edge is a question', () => {
    expect(bandWidthM('OTHER', null)).toBe(0);
  });

  it('is not drawn for a road nobody has ranked yet', () => {
    expect(bandWidthM('ROAD', null)).toBe(0);
  });
});

describe('the ranking', () => {
  it('runs heaviest to lightest, arterial to access', () => {
    const w = (h: keyof typeof ROAD_BAND_M): number => bandWidthM('ROAD', h);
    expect(w('ARTERIAL')).toBeGreaterThan(w('COLLECTOR'));
    expect(w('COLLECTOR')).toBeGreaterThan(w('LOCAL'));
    expect(w('LOCAL')).toBeGreaterThan(w('ACCESS'));
  });

  it('survives the scaling a small plot forces, because every band scales together', () => {
    // A 20 m plot: the widest band would be six metres, nearly a third of it.
    const span = 20;
    const w = (h: keyof typeof ROAD_BAND_M): number => bandWidthM('ROAD', h, span);
    expect(w('ARTERIAL')).toBeLessThanOrEqual(span * 0.06 + 1e-9);
    expect(w('ARTERIAL')).toBeGreaterThan(w('COLLECTOR'));
    expect(w('COLLECTOR')).toBeGreaterThan(w('LOCAL'));
    expect(w('LOCAL')).toBeGreaterThan(w('ACCESS'));
  });

  it('is drawn at the convention on a plot large enough to carry it', () => {
    expect(bandWidthM('ROAD', 'ARTERIAL', 400)).toBe(ROAD_BAND_M.ARTERIAL);
  });
});

describe('what the band claims', () => {
  it('says in its own note that it ranks rather than measures', () => {
    // The sentence is printed on every sheet that draws a band. A band that
    // looked like a carriageway would assert a dimension no document states.
    expect(BAND_NOTE).toContain('not a carriageway width');
    expect(BAND_NOTE).toContain('nothing is computed');
  });
});
