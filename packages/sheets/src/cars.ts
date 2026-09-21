/**
 * Where each car stands, and which way it faces — worked out once.
 *
 * The parking sheet, its DXF and the massing view each draw a car in every bay.
 * Until this was shared, the sheet decided the car's axis and nose and nothing else
 * could ask it, so a 3D view would have had to decide again — and a car that faces
 * the aisle on paper and the wall in the model is two drawings of one building
 * that disagree. So the rule lives here and every renderer reads it:
 *
 * - the car stands on the bay's centroid;
 * - its axis is the bay's long side;
 * - its nose points into the bay, away from the aisle it was driven in from.
 *
 * None of it is a quantity. The bay is the engine's; this only says how to draw a
 * drafting symbol inside it.
 */

import type { ModelBay, ModelLevel, ModelPoint } from '@envelope/core';

import { angleOf, centroidOf, lengthOf, mm, round2 } from './plane.js';

export interface CarPlacement {
  readonly bay: ModelBay;
  /** The bay's centroid, on the 1 mm grid. */
  readonly at: ModelPoint;
  /** The car's heading, anticlockwise from +x, nose first. */
  readonly rotationDeg: number;
  /** The bay's long side, in millimetres — the room the car stands in. */
  readonly bayLengthMm: number;
  /** Just inside the bay's aisle end, where a sheet prints the bay number. */
  readonly tail: ModelPoint;
}

type Parking = NonNullable<ModelLevel['parking']>;

export function placeCars(parking: Parking): CarPlacement[] {
  const aisles = parking.aisles.map((x) => x.centreLine);
  return parking.bays.map((bay) => {
    const [p0, p1, p2] = bay.outline as readonly [ModelPoint, ModelPoint, ModelPoint, ModelPoint];
    const c = centroidOf(bay.outline);
    // The long side is the car's axis.
    const longFirst = lengthOf(p0, p1) >= lengthOf(p1, p2);
    const [la, lb] = longFirst ? [p0, p1] : [p1, p2];
    const bayLength = lengthOf(la, lb);
    let axis = angleOf(la, lb);
    // Nose into the bay, away from the aisle it was driven in from.
    const aisle = nearestOnCentreLines(aisles, c);
    if (aisle) {
      const rad = (axis * Math.PI) / 180;
      const ahead = { x: c.x + Math.cos(rad) * 1000, y: c.y + Math.sin(rad) * 1000 };
      if (dist2(ahead, aisle) < dist2(c, aisle)) axis += 180;
    }
    const rad = (axis * Math.PI) / 180;
    const tail = mm(c.x - Math.cos(rad) * (bayLength / 2 - 260), c.y - Math.sin(rad) * (bayLength / 2 - 260));
    return { bay, at: c, rotationDeg: round2(axis), bayLengthMm: bayLength, tail };
  });
}

function dist2(p: { x: number; y: number }, q: { x: number; y: number }): number {
  return (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
}

/** The nearest point on any aisle's centre line — the aisle a bay is driven into from. */
function nearestOnCentreLines(
  lines: readonly (readonly [ModelPoint, ModelPoint])[],
  c: ModelPoint,
): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bestD = Infinity;
  for (const [a, b] of lines) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.min(1, Math.max(0, ((c.x - a.x) * dx + (c.y - a.y) * dy) / l2));
    const q = { x: a.x + dx * t, y: a.y + dy * t };
    const d = dist2(c, q);
    if (d < bestD) {
      bestD = d;
      best = q;
    }
  }
  return best;
}
