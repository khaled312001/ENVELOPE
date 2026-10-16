import { fromDltm, type LngLat, toUtm40 } from '@web/geo.js';
import { walkTraverse } from '@web/traverse.js';

import type { TraceLineage } from '../components/map-trace.js';
import type { DraftPlot } from './model.js';

/*
  THE THREE WAYS A PLOT ARRIVES IN THE CORNER TABLE, and the one shape they all
  land in: corners in metres, as strings, on the millimetre — which is what the
  reader would have typed and what the API receives.

  None of them classifies a boundary. A photograph, a fitted outline and a
  coordinate table all say where the corners are and nothing about what lies
  beyond each edge, and FR-PLT-001 AC3 gives that field no default. The class
  is suggested afterwards, from the sheet's labels and the map's roads, with
  its source on screen — `edge-suggest.ts` — never here. A boundary
  the reader had already classified keeps its answer while the ring still has
  the same number of sides, or when the map recorded which boundary each edge
  came from as it inserted or deleted a corner; otherwise every boundary is
  asked again.
*/

const MM = 3;

/** A metre figure on the millimetre, with negative zero written as zero. */
function metres(v: number): string {
  const s = v.toFixed(MM);
  return /^-0\.0+$/.test(s) ? (0).toFixed(MM) : s;
}

const UNASKED = { classification: '' as const, roadHierarchy: '' as const };

function withVertices(prev: DraftPlot, vertices: readonly { x: string; y: string }[], lineage?: TraceLineage): DraftPlot {
  /*
    A ring the map edited by inserting or deleting a corner says which of the
    table's boundaries each of its edges descends from, so a split boundary's
    two halves both keep its answer and a merged one keeps the answer of the
    boundary that entered the deleted corner. Only while the table still has
    the sides that record started from — otherwise it describes another ring.
  */
  if (lineage && lineage.sides === prev.edges.length && lineage.edges.length === vertices.length) {
    return { ...prev, vertices, edges: lineage.edges.map((k) => prev.edges[k] ?? UNASKED) };
  }
  const keep = prev.edges.length === vertices.length;
  return {
    ...prev,
    vertices,
    edges: vertices.map((_, i) => (keep ? prev.edges[i]! : UNASKED)),
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
export function ringToDraft(ring: readonly LngLat[], prev: DraftPlot, lineage?: TraceLineage): DraftPlot {
  const grid = ring.map(toUtm40);
  const origin = grid[0]!;
  return withVertices(
    prev,
    grid.map((g) => ({ x: metres(g.e - origin.e), y: metres(g.n - origin.n) })),
    lineage,
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

/** A corner as a sheet prints it — easting and northing, as written. */
export interface GridPoint {
  readonly east: string;
  readonly north: string;
}

/**
 * The sheet's own corners, as metres from its first corner.
 *
 * Subtracted on the sheet's grid, not walked from rounded legs and not sent
 * through a projection: the differences of printed eastings ARE the plot, and
 * a traverse of three-decimal legs drifts a few millimetres by the last corner.
 */
export function pointsToDraft(points: readonly GridPoint[], prev: DraftPlot): DraftPlot | null {
  const grid = points.map((p) => ({ e: Number(p.east), n: Number(p.north) }));
  if (grid.length < 3 || grid.some((g) => !Number.isFinite(g.e) || !Number.isFinite(g.n))) return null;
  const origin = grid[0]!;
  return withVertices(
    prev,
    grid.map((g) => ({ x: metres(g.e - origin.e), y: metres(g.n - origin.n) })),
  );
}

/**
 * The same corners on the map, for PLACING the plot — never for measuring it.
 *
 * Only on a grid this module can name: DLTM is the one the sheets that print
 * coordinates have used. Anything else returns null, and the map is left where
 * the reader puts it rather than in the wrong emirate.
 */
export function pointsToRing(points: readonly GridPoint[], system: string): readonly LngLat[] | null {
  if (system !== 'DLTM' || points.length < 3) return null;
  const ring = points.map((p) => fromDltm({ e: Number(p.east), n: Number(p.north) }));
  return ring.every((p) => Number.isFinite(p.lng) && Number.isFinite(p.lat)) ? ring : null;
}
