/**
 * Drafting arithmetic: where a label sits, which way an arrow points.
 *
 * None of it produces a quantity. Every area, count and distance a sheet quotes
 * arrives from the engine as a string and is printed as it came; what is worked
 * out here is only where on the drawing to print it and at what angle. Model
 * points are rounded back to the 1 mm grid so a label position is as exact as the
 * geometry it annotates, and so the same model always yields the same sheet.
 */

import type { Mm, ModelPoint } from '@envelope/core';

import type { PaperPoint, SheetView } from './types.js';

export const mm = (x: number, y: number): ModelPoint => ({
  x: Math.round(x) as Mm,
  y: Math.round(y) as Mm,
});

export function centroidOf(points: readonly ModelPoint[]): ModelPoint {
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return mm(x / points.length, y / points.length);
}

export function midpointOf(a: ModelPoint, b: ModelPoint): ModelPoint {
  return mm((a.x + b.x) / 2, (a.y + b.y) / 2);
}

/** Direction of a → b, anticlockwise from +x, in degrees. */
export function angleOf(a: ModelPoint, b: ModelPoint): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

/**
 * The same direction, turned so text along it reads left to right.
 *
 * A label on a south-facing edge drawn at 180° is upside down; drafting turns it
 * half a revolution so it reads from the bottom or the right of the sheet.
 */
export function readable(deg: number): number {
  let d = ((deg % 360) + 360) % 360;
  if (d > 90 && d <= 270) d -= 180;
  if (d > 180) d -= 360;
  return round2(d);
}

export const round2 = (v: number): number => Math.round(v * 100) / 100;

export function lengthOf(a: ModelPoint, b: ModelPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Twice the signed area. Positive for an anticlockwise ring. */
export function signedArea2(ring: readonly ModelPoint[]): number {
  let s = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const p = ring[i]!;
    const q = ring[(i + 1) % ring.length]!;
    s += p.x * q.y - q.x * p.y;
  }
  return s;
}

/**
 * The unit normal of edge a → b that points into the ring.
 *
 * Which side is "in" depends on the ring's winding, which the plot's does not
 * promise; it is read off the signed area rather than assumed.
 */
export function inwardNormal(
  a: ModelPoint,
  b: ModelPoint,
  ring: readonly ModelPoint[],
): { readonly x: number; readonly y: number } {
  const len = lengthOf(a, b);
  if (len === 0) return { x: 0, y: 0 };
  const left = { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
  return signedArea2(ring) >= 0 ? left : { x: -left.x, y: -left.y };
}

export function offsetPoint(p: ModelPoint, n: { x: number; y: number }, distance: number): ModelPoint {
  return mm(p.x + n.x * distance, p.y + n.y * distance);
}

export interface Box {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export function boxOf(points: readonly ModelPoint[]): Box {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

/** Model to paper. The only place the flip happens. */
export function toPaper(view: SheetView, p: { readonly x: number; readonly y: number }): PaperPoint {
  return {
    x: round2(view.centrePaper.x + (p.x - view.centreModel.x) / view.scale),
    y: round2(view.centrePaper.y - (p.y - view.centreModel.y) / view.scale),
  };
}

/**
 * The drafting scales a sheet may be printed at, smallest denominator first.
 *
 * A scale is chosen, not computed: 1:237 is a scale nobody can put a ruler to.
 */
export const SCALES: readonly number[] = [100, 200, 250, 500, 750, 1000, 1250, 1500, 2000, 2500, 5000, 10000];

/**
 * The largest standard scale at which `box` fits `room`, with `marginMm` of paper
 * left on every side for the labels that sit outside the geometry.
 */
export function fitScale(box: Box, room: { width: number; height: number }, marginMm: number): number {
  const w = box.maxX - box.minX;
  const h = box.maxY - box.minY;
  for (const s of SCALES) {
    if (w / s + 2 * marginMm <= room.width && h / s + 2 * marginMm <= room.height) return s;
  }
  return SCALES[SCALES.length - 1]!;
}
