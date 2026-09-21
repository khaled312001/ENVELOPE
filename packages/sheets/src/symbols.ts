/**
 * Drafting symbols, defined once.
 *
 * The SVG expands each symbol into a path at its insertion point; the DXF writes
 * it as a BLOCK and INSERTs it, which is how a CAD user expects a car to arrive
 * (one entity per car, selectable, countable, replaceable with the office's own
 * block). Both read the geometry from here, so the car on screen and the car in
 * AutoCAD are the same car.
 *
 * The car is a symbol, not a vehicle the engine sized: 4.6 × 1.8 m is a drafting
 * convention for a family car, drawn inside a bay the engine did size (Table
 * B.11). Nothing is computed from it.
 */

import type { SymbolItem, SymbolName } from './types.js';

export interface SymbolGeometry {
  /** Polylines in symbol units: millimetres for the car, one unit of length for an arrow. */
  readonly polylines: readonly { readonly points: readonly (readonly [number, number])[]; readonly closed: boolean }[];
}

const CAR: SymbolGeometry = {
  polylines: [
    {
      // Nose towards +x, centred on the origin.
      points: [
        [-2300, -650],
        [-2050, -900],
        [1950, -900],
        [2300, -550],
        [2300, 550],
        [1950, 900],
        [-2050, 900],
        [-2300, 650],
      ],
      closed: true,
    },
    // Windscreen and rear screen: what makes it read as a car and shows which way it faces.
    { points: [[700, -780], [950, 0], [700, 780]], closed: false },
    { points: [[-1450, -760], [-1450, 760]], closed: false },
  ],
};

const ARROW: SymbolGeometry = {
  polylines: [
    { points: [[-0.5, 0], [0.5, 0]], closed: false },
    { points: [[0.32, 0.09], [0.5, 0], [0.32, -0.09]], closed: false },
  ],
};

const ARROW2: SymbolGeometry = {
  polylines: [
    { points: [[-0.5, 0], [0.5, 0]], closed: false },
    { points: [[0.32, 0.09], [0.5, 0], [0.32, -0.09]], closed: false },
    { points: [[-0.32, 0.09], [-0.5, 0], [-0.32, -0.09]], closed: false },
  ],
};

export const SYMBOLS: Readonly<Record<SymbolName, SymbolGeometry>> = {
  CAR,
  ARROW,
  ARROW2,
};

/** A symbol's polylines placed in the model: rotated, scaled, moved to its point. */
export function placeSymbol(item: SymbolItem): { points: { x: number; y: number }[]; closed: boolean }[] {
  const rad = (item.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return SYMBOLS[item.symbol].polylines.map((line) => ({
    closed: line.closed,
    points: line.points.map(([u, v]) => {
      const x = u * item.scale;
      const y = v * item.scale;
      return { x: item.at.x + x * cos - y * sin, y: item.at.y + x * sin + y * cos };
    }),
  }));
}
