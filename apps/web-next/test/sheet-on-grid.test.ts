/**
 * The sheet laid on the map from its own grid, cropped round the plot and kept
 * inside the drawing's frame (Eng. Mohamed, 16 Oct 2026). The order of the
 * corners is load-bearing and silent when wrong: a mirrored sheet reads every
 * dimension backwards, so which corner is which is asserted by direction.
 */
import { describe, expect, it } from 'vitest';

import type { SheetOnPage } from '@web/api/client.js';
import { legBetween } from '@web/geo.js';

import { cropAroundPlot, onPageOf, placementOfCorners, regionOnGround } from '../src/components/sheet-underlay.js';

// Half a metre per point, north-up, near the Municipality sheet's own eastings.
const ON_PAGE: SheetOnPage = {
  ax: 0.5,
  bx: 0,
  cx: 501_700,
  ay: 0,
  by: 0.5,
  cy: 2_798_100,
  plotBoxPt: [100, 100, 200, 300],
  pageBoxPt: [0, 0, 600, 800],
  frameBoxPt: [50, 50, 400, 500],
  residualM: 0,
  basis: 'test grid',
};

describe('cropAroundPlot', () => {
  it('widens the plot by the margin in metres, at the sheet’s own scale', () => {
    // 10 m at 0.5 m a point is 20 points.
    expect(cropAroundPlot(ON_PAGE, 10)).toEqual([80, 80, 220, 320]);
  });

  it('never goes past the drawing’s frame, however wide the margin', () => {
    expect(cropAroundPlot(ON_PAGE, 500)).toEqual([50, 50, 400, 500]);
  });
});

describe('regionOnGround', () => {
  const [tl, tr, br, bl] = regionOnGround(ON_PAGE, [100, 100, 200, 300]);

  it('puts the top-left corner north-west and goes round clockwise', () => {
    expect(tl.lat).toBeGreaterThan(bl.lat);
    expect(tr.lng).toBeGreaterThan(tl.lng);
    expect(br.lat).toBeLessThan(tr.lat);
    expect(bl.lng).toBeLessThan(br.lng);
  });

  it('is the region’s size on the ground, to the centimetre', () => {
    // 100 points wide and 200 tall at 0.5 m a point: 50 × 100 m.
    expect(legBetween(tl, tr).lengthM).toBeCloseTo(50, 1);
    expect(legBetween(tr, br).lengthM).toBeCloseTo(100, 1);
  });

  it('gives the hand tools a placement that starts where the sheet already is', () => {
    const corners = regionOnGround(ON_PAGE, [100, 100, 200, 300]);
    const placement = placementOfCorners(corners, 2);
    expect(placement.widthM).toBeCloseTo(50, 1);
    // DLTM and UTM 40N are both north-up; only the convergence between them turns it, by under two degrees.
    expect(Math.abs(placement.rotationDeg)).toBeLessThan(2);
  });
});

describe('onPageOf', () => {
  it('lays a sheet only on a grid it can project', () => {
    const facts = (system: string) => ({ survey: { system: { value: system }, onPage: ON_PAGE } });
    expect(onPageOf(facts('DLTM'))).toBe(ON_PAGE);
    expect(onPageOf(facts('UNKNOWN'))).toBeUndefined();
    expect(onPageOf({})).toBeUndefined();
  });
});
