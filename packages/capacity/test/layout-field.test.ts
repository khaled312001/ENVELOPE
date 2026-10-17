/**
 * Rows across the whole footprint, on a plot that is not a rectangle.
 *
 * The Al Mamzar plan's setback line is a near-triangle: the largest rectangle in
 * it covers 48% of it, and packing that rectangle alone drew 58 bays a level.
 * These hold the three properties that make the field layout a layout rather
 * than a larger number: every bay stands wholly inside the setback line, every
 * bay is reached from the way in, and the deduction is charged on the whole
 * footprint it was measured on.
 */

import { Decimal, ProvenanceGraph, Tracer } from '@envelope/core';
import { describe, expect, it } from 'vitest';

import { layoutParkingLevel, RectKind, type PlacedRect } from '../src/layout.js';
import { bandIntervals, intersectIntervals, subtractIntervals, type XY } from '../src/scanline.js';

// The Al Mamzar setback line, in the inscribed rectangle's local frame (mm).
const MAMZAR: readonly XY[] = [
  [27.09, 64.49],
  [25.12, 64.3],
  [-27.97, -0.68],
  [106.29, -0.68],
].map(([x, y]) => ({ x: x! * 1000, y: y! * 1000 }));

function inside(poly: readonly XY[], p: XY): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

function corners(r: PlacedRect): XY[] {
  const x = Number(r.x) * 1000;
  const y = Number(r.y) * 1000;
  const w = Number(r.width) * 1000;
  const h = Number(r.height) * 1000;
  // A hair inside, so a bay whose edge lies on the setback line counts as in.
  const e = 1;
  return [
    { x: x + e, y: y + e },
    { x: x + w - e, y: y + e },
    { x: x + w - e, y: y + h - e },
    { x: x + e, y: y + h - e },
  ];
}

function run(withField: boolean, pick?: 'FIELD_WIDTH') {
  const tracer = new Tracer(new ProvenanceGraph());
  const ded = (v: string) => tracer.assumed('d', new Decimal(v), { basis: 'test fixture', unit: 'm²' });
  return layoutParkingLevel({
    tracer,
    footprint: { widthM: new Decimal('65.732'), depthM: new Decimal('32.582') },
    deductionsTraced: ded('321'),
    includeRamp: true,
    slopedRing: true,
    ...(withField
      ? { field: { polygonMm: MAMZAR, grossAreaM2: new Decimal('4433'), deductionsTraced: ded('665') } }
      : {}),
    ...(pick ? { arrangement: { id: pick } } : {}),
  });
}

describe('rows across the whole footprint', () => {
  // Picked: the field places the most bays here, and its rows meet the
  // connectors at one end only, so it is not the default under B.7.2.3.3 ¶8.
  const field = run(true, 'FIELD_WIDTH');
  const rectOnly = run(false);

  it('places the most bays on a footprint the rectangle covers half of', () => {
    expect(field.orientation.value).toMatch(/^rows across the whole footprint/);
    expect(field.bayCount.value).toBeGreaterThan(rectOnly.bayCount.value);
    expect(field.wholeFootprint).toBe(true);
    const offered = run(true).arrangements;
    expect(Math.max(...offered.map((a) => a.bayCount))).toBe(field.bayCount.value);
  });

  it('is reported beside the default with its dead end, not laid out over it', () => {
    const byDefault = run(true);
    const listed = byDefault.arrangements.find((a) => a.id === 'FIELD_WIDTH')!;
    expect(Math.max(...(listed.deadEnds ?? []))).toBeGreaterThan(8);
    expect(byDefault.arrangement).not.toBe('FIELD_WIDTH');
    expect(byDefault.notes.join(' ')).toContain(`${listed.bayCount} rows across the whole footprint, along the width (a dead end serving`);
  });

  it('stands every bay, aisle and ramp wholly inside the setback line', () => {
    for (const r of field.rects) {
      for (const c of corners(r)) expect(inside(MAMZAR, c), `${r.kind} at ${r.x}, ${r.y}`).toBe(true);
    }
  });

  it('counts only bays it drew', () => {
    const drawn = field.rects.filter((r) => r.kind === RectKind.BAY || r.kind === RectKind.ACCESSIBLE_BAY);
    expect(drawn).toHaveLength(field.bayCount.value);
  });

  it('charges the deduction on the footprint it was measured on', () => {
    expect(field.deductionsM2.value.toString()).toBe('665');
    expect(field.usableAreaM2.value.toString()).toBe('3768');
  });

  it('says what the edges it could not use cost, in m² and bays', () => {
    expect(field.notes.join(' ')).toMatch(/Counted, not estimated\./);
    expect(field.notes.join(' ')).toMatch(/joined by \d+ connector\(s\)/);
  });
});

describe('the scanline under it', () => {
  const triangle: readonly XY[] = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 0, y: 10 },
  ];

  it('gives the span that is inside for the WHOLE band, not at its middle', () => {
    // Between y = 2 and y = 4 the hypotenuse runs from x = 8 to x = 6, so only
    // [0, 6] is inside all the way up.
    const [span] = bandIntervals(triangle, 2, 4);
    expect(span?.[0]).toBeCloseTo(0);
    expect(span?.[1]).toBeCloseTo(6);
  });

  it('is empty outside the polygon', () => {
    expect(bandIntervals(triangle, 11, 12)).toEqual([]);
  });

  it('intersects and subtracts sorted spans', () => {
    expect(intersectIntervals([[0, 5], [7, 10]], [[3, 8]])).toEqual([[3, 5], [7, 8]]);
    expect(subtractIntervals([[0, 10]], [[2, 3], [5, 6]])).toEqual([[0, 2], [3, 5], [6, 10]]);
  });
});
