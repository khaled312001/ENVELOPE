import { type LngLat, toUtm40 } from '@web/geo.js';
import { walkTraverse } from '@web/traverse.js';

import type { DraftPlot } from './model.js';

/*
  THE THREE WAYS A PLOT ARRIVES IN THE CORNER TABLE, and the one shape they all
  land in: corners in metres, as strings, on the millimetre — which is what the
  reader would have typed and what the API receives.

  None of them classifies a boundary. A photograph, a fitted outline and a
  coordinate table all say where the corners are and nothing about what lies
  beyond each edge, and FR-PLT-001 AC3 gives that field no default. A boundary
  the reader had already classified keeps its answer only while the ring still
  has the same number of sides; otherwise every boundary is asked again.
*/

const MM = 3;

/** A metre figure on the millimetre, with negative zero written as zero. */
function metres(v: number): string {
  const s = v.toFixed(MM);
  return /^-0\.0+$/.test(s) ? (0).toFixed(MM) : s;
}

function withVertices(prev: DraftPlot, vertices: readonly { x: string; y: string }[]): DraftPlot {
  const keep = prev.edges.length === vertices.length;
  return {
    ...prev,
    vertices,
    edges: vertices.map((_, i) => (keep ? prev.edges[i]! : { classification: '' as const, roadHierarchy: '' as const })),
  };
}

/**
 * A ring traced on the map, as corners in metres from its first corner.
 *
 * On the UTM 40N grid, as the classic studio's traverse is: a degree of longitude
 * and a degree of latitude are different lengths in Dubai, so subtracting degrees
 * would draw a different plot. The ring's orientation is left as traced — the API
 * stores every ring counter-clockwise and turns the edges with it.
 */
export function ringToDraft(ring: readonly LngLat[], prev: DraftPlot): DraftPlot {
  const grid = ring.map(toUtm40);
  const origin = grid[0]!;
  return withVertices(
    prev,
    grid.map((g) => ({ x: metres(g.e - origin.e), y: metres(g.n - origin.n) })),
  );
}

/**
 * Lengths and bearings — the sheet's survey or its fitted outline — walked into
 * corners by the same traverse the classic studio's form walks, so the two front
 * ends turn one sheet into one plot.
 */
export function legsToDraft(
  legs: readonly { readonly lengthM: string; readonly bearingDeg: string }[],
  prev: DraftPlot,
): DraftPlot | null {
  const walked = walkTraverse(legs.map((l) => ({ lengthM: l.lengthM, bearingDeg: l.bearingDeg })));
  if (!walked.usable) return null;
  return withVertices(prev, walked.corners);
}
