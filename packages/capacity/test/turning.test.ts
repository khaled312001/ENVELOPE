/**
 * The turns of the aisle network (16 Oct 2026: «مهم ان يكون في قطر دوران العربيه
 * محسوب»). A check that cannot fail is worth nothing, so a narrow corner is built
 * here and must fail, beside the Table B.11 module that must pass.
 */

import { Decimal, ProvenanceGraph, Tracer } from '@envelope/core';
import { describe, expect, it } from 'vitest';

import { findTurns, layoutParkingLevel, RectKind, type CircRect } from '../src/index.js';

const d = (v: string | number): Decimal => new Decimal(v);
const r = (x: number, y: number, w: number, h: number): CircRect => ({ x: d(x), y: d(y), width: d(w), height: d(h) });
const turnsOf = (aisles: readonly CircRect[], opening = 3) =>
  findTurns({ aisles, innerRadiusM: d(4), laneM: d('3.5'), minOpeningM: d(opening) });

describe('turns between aisles', () => {
  it('finds both turns of a T and fits them on 6 m aisles', () => {
    // A cross aisle running past a module aisle on both sides.
    const t = turnsOf([r(0, 0, 6, 40), r(6, 17, 30, 6)], 6);
    expect(t).toHaveLength(2);
    expect(t.every((x) => x.fits)).toBe(true);
    expect(t.every((x) => x.from === 0 && x.into === 1)).toBe(true);
  });

  it('finds one turn at a corner and none between two aisles in line', () => {
    expect(turnsOf([r(0, 0, 40, 6), r(34, 6, 6, 30)], 6)).toHaveLength(1);
    expect(turnsOf([r(0, 0, 20, 6), r(20, 0, 20, 6)], 6)).toHaveLength(0);
  });

  it('fails a corner of two 3 m aisles: the lane runs onto what is not an aisle', () => {
    const t = turnsOf([r(0, 0, 40, 3), r(37, 3, 3, 30)]);
    expect(t).toHaveLength(1);
    expect(t[0]!.fits).toBe(false);
  });

  it('fails the turn from an aisle that stops a metre past the one it serves, and fits the other side', () => {
    // The cross aisle runs 7 m below the module aisle and 1 m above it.
    const t = turnsOf([r(0, 10, 6, 14), r(6, 17, 30, 6)], 6);
    expect(t).toHaveLength(2);
    expect(t.filter((x) => x.fits)).toHaveLength(1);
    expect(t.find((x) => !x.fits)!.centre.y).toBeCloseTo(24.5, 9);
  });

  it('draws each turn as its two edges, the outer a lane wider than the inner', () => {
    const [t] = turnsOf([r(0, 0, 40, 6), r(34, 6, 6, 30)], 6);
    const dist = (p: { x: number; y: number }) => Math.hypot(p.x - t!.centre.x, p.y - t!.centre.y);
    expect(t!.inner.every((p) => Math.abs(dist(p) - 4) < 1e-9)).toBe(true);
    expect(t!.outer.every((p) => Math.abs(dist(p) - 7.5) < 1e-9)).toBe(true);
  });

  it('fits every turn of every arrangement the packer lays on a Table B.11 module', () => {
    for (const id of ['WIDTH', 'DEPTH', 'PERIMETER'] as const) {
      const lay = layoutParkingLevel({
        tracer: new Tracer(new ProvenanceGraph()),
        footprint: { widthM: d(64), depthM: d(41) },
        deductions: { areaM2: d(0), source: 'ASSUMED', basis: 'test fixture takes no deduction' },
        includeRamp: true,
        arrangement: { id },
      });
      const t = turnsOf(lay.rects.filter((q) => q.kind === RectKind.AISLE), 6);
      expect(t.length).toBeGreaterThan(0);
      expect(t.filter((x) => !x.fits)).toEqual([]);
    }
  });

});
