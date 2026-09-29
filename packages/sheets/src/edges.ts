/**
 * The boundary symbols — Eng. Mohamed, 2026-09-28: *"في road , road type … بس
 * لازم رمز ليهم"*. There is a road field and a road-type field, and they need a
 * symbol.
 *
 * He is right and it was overdue. Road hierarchy is the most consequential field
 * on the plot form — it drives the vehicle-access recommendation under B.7.2.1 —
 * and it was a `<select>` that nothing drew. An architect reading the plan could
 * not see which side the arterial was on.
 *
 * ---
 *
 * **ONE SOURCE, FOUR OUTPUTS.** The band is geometry, computed here, so the plot
 * canvas on the plot form, the A3 site plan, the PDF and the DXF all draw the
 * same strip from the same numbers. A legend that the drawings and the screen
 * must share belongs in the display list, not in a PNG — and a symbol drawn
 * twice is a symbol that will one day disagree with itself.
 *
 * **THE WIDTHS ARE A DRAFTING CONVENTION AND NOTHING IS COMPUTED FROM THEM.**
 * They are not carriageway widths: the affection plan states a road's hierarchy
 * and not its width, and a band drawn at a real carriageway width would be
 * asserting a dimension nobody read off a document. They are a graphic ranking —
 * the heavier the band, the higher the hierarchy — and `BAND_NOTE` says so on
 * every sheet that draws one.
 */

import type { EdgeClassification, ModelPoint, ModelRing, RoadHierarchy } from '@envelope/core';

/**
 * The band's width in metres, by road hierarchy.
 *
 * A ranking, not a measurement. See the note at the top of this file, and
 * `BAND_NOTE`, which is printed wherever the band is.
 */
export const ROAD_BAND_M: Readonly<Record<RoadHierarchy, number>> = {
  ARTERIAL: 6,
  COLLECTOR: 4.5,
  LOCAL: 3,
  ACCESS: 1.8,
};

/**
 * The band's width for an edge that is not a road, in metres.
 *
 * A neighbour gets a narrow hatched strip, because the party boundary is a real
 * thing with a real side to it. Open space gets the same width and a different
 * fill. `OTHER` gets none: an unclassified edge is a question, and drawing a
 * band for it would answer the question in ink.
 */
export const EDGE_BAND_M: Readonly<Record<EdgeClassification, number>> = {
  ROAD: 0,
  ADJACENT_PLOT: 1.2,
  OPEN_SPACE: 1.2,
  OTHER: 0,
};

/** Printed wherever a band is drawn. It is a ranking; it is not a width. */
export const BAND_NOTE =
  'The band beside each boundary ranks what the affection plan states about that ' +
  'edge — a heavier band is a higher road hierarchy. It is a drafting convention ' +
  'and not a carriageway width: the sheet states a hierarchy and no width, and ' +
  'nothing is computed from the band.';

/**
 * The widest band, which is what the scaling below is measured against.
 */
const WIDEST_BAND_M = ROAD_BAND_M.ARTERIAL;

/**
 * The share of a plot's own span the widest band may take.
 *
 * A 6 m band beside a 20 m plot is a third of the drawing, and it would run
 * through the frame, the grid and the dimension strings. So every band is scaled
 * by one factor when the plot is small enough for that to happen — ONE factor,
 * so the ranking survives: an arterial stays wider than a collector, which stays
 * wider than a local, whatever the plot.
 */
const BAND_MAX_SHARE_OF_SPAN = 0.06;

/**
 * How wide an edge's band is, in metres. Zero means no band is drawn.
 *
 * `spanM` is the plot's larger dimension. Passing it scales every band together
 * so the widest one never exceeds `BAND_MAX_SHARE_OF_SPAN` of the drawing;
 * omitting it draws the convention at full size, which is what a sheet framed on
 * a large plot wants.
 */
export function bandWidthM(
  classification: EdgeClassification,
  roadHierarchy: RoadHierarchy | null,
  spanM?: number,
): number {
  const base =
    classification === 'ROAD'
      ? roadHierarchy
        ? ROAD_BAND_M[roadHierarchy]
        : 0
      : EDGE_BAND_M[classification];
  if (base === 0 || spanM === undefined || spanM <= 0) return base;
  const factor = Math.min(1, (spanM * BAND_MAX_SHARE_OF_SPAN) / WIDEST_BAND_M);
  return base * factor;
}

/**
 * Twice the signed area of a ring. Positive when the ring runs counter-clockwise.
 *
 * Here rather than from `@envelope/geometry`, because this package may see
 * `core` and nothing else — and the sign is all that is wanted, so no kernel
 * predicate is involved.
 */
function twiceSignedArea(ring: ModelRing): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return sum;
}

/**
 * The band along one edge, on the OUTSIDE of the plot.
 *
 * Outside, because a road is outside the plot and a band drawn inward would sit
 * on the setback strip and read as another limit. The direction comes from the
 * ring's own orientation rather than from an assumed winding: a fixture that
 * happened to be clockwise would otherwise draw every band through the building.
 *
 * Returns `null` when the edge takes no band, or is too short to carry one
 * without the two ends crossing.
 */
export function edgeBand(
  ring: ModelRing,
  start: ModelPoint,
  end: ModelPoint,
  widthM: number,
): ModelRing | null {
  if (widthM <= 0) return null;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len <= 0) return null;

  // The interior lies to the LEFT of each edge on a counter-clockwise ring, so
  // the outward normal is the right-hand one; on a clockwise ring it is the
  // other way about.
  const sign = twiceSignedArea(ring) >= 0 ? 1 : -1;
  const w = widthM * 1000;
  const nx = (sign * dy * w) / len;
  const ny = (-sign * dx * w) / len;
  const off = (p: ModelPoint): ModelPoint => ({
    x: Math.round(p.x + nx) as ModelPoint['x'],
    y: Math.round(p.y + ny) as ModelPoint['y'],
  });
  return [start, end, off(end), off(start)];
}
