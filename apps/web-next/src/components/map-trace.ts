import { admitVertex, setLegLength } from '@web/components/PlotMap.js';
import { fromUtm40, legBetween, type LngLat, toUtm40 } from '@web/geo.js';

/*
  THE TRACE AS A LIST OF CORNERS, AND EVERY EDIT TO IT AS A FUNCTION.

  Eng. Mohamed's test of the map (Oct 2026) asked for five edits the canvas did
  not have: type a boundary's length, move the whole outline, delete a corner,
  add one, and see the length of the segment being drawn. Each one is a pure
  function here and the map only calls it, for the reason the classic map gives:
  a suite with no WebGL can then hold every one of them to a figure, and the
  canvas stays one way of editing a list of coordinates.

  Every length is measured on the UTM 40N grid through `legBetween`, the one
  measure in the web app, and every move is made on that grid too. A degree of
  longitude in Dubai is about 101 km and a degree of latitude about 111, so an
  outline translated in degrees would come out a different shape.
*/

/**
 * Which boundary of the corner table each traced edge descends from.
 *
 * The corner table classifies boundaries, the map does not, and "Use this
 * outline" copies corners across. While both have the same number of sides the
 * classifications stay put by position. An inserted corner or a deleted one
 * changes that count, and without this record every boundary the reader had
 * already classified would be asked again. So an edit records it: a split edge's
 * two halves both descend from the edge that was split, and a merged edge from
 * the edge that ENTERED the deleted corner — the merged edge starts where that
 * one started, which is also what the table's own "Remove corner" keeps.
 */
export interface TraceLineage {
  /** How many sides the trace had when the record began. */
  readonly sides: number;
  /** For each edge of the ring now, the edge it descends from. */
  readonly edges: readonly number[];
}

export interface MapTrace {
  readonly ring: readonly LngLat[];
  readonly closed: boolean;
  /**
   * Placed from the affection plan's own grid rather than drawn. The corner
   * table already holds the sheet's corners, exactly; copying this ring back
   * would replace them with the same plot measured through a projection, so
   * the map offers no "use" for it. Any edit makes a fresh trace without it.
   */
  readonly fromSheet?: true;
  /** Absent until a corner is inserted or deleted on a closed outline. */
  readonly lineage?: TraceLineage;
}

export const EMPTY_TRACE: MapTrace = { ring: [], closed: false };

const edgesOf = (t: MapTrace): readonly number[] => t.lineage?.edges ?? t.ring.map((_, i) => i);

/** An edited trace: never "from the sheet" any more, and still descended from what it was. */
function edited(t: MapTrace, ring: readonly LngLat[], lineage?: TraceLineage): MapTrace {
  const keep = lineage ?? t.lineage;
  return keep ? { ring, closed: t.closed, lineage: keep } : { ring, closed: t.closed };
}

/* ── one boundary's length ─────────────────────────────────────────── */

export type LengthRefusal = 'not-a-number' | 'not-positive' | 'zero-length' | 'outside-zone-40';

export type LengthInput = { readonly lengthM: number; readonly refusal?: never } | { readonly refusal: LengthRefusal; readonly lengthM?: never };

/* Arabic-Indic digits and the Arabic decimal separator, so a figure typed on an Arabic keyboard is a figure. */
const ARABIC_DIGITS = /[٠-٩]/g;

/** A length as the reader typed it, in metres. Refused, in a code, unless it is a positive number. */
export function parseLength(text: string): LengthInput {
  const s = text
    .trim()
    .replace(ARABIC_DIGITS, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/٫/g, '.');
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return { refusal: 'not-a-number' };
  const lengthM = Number(s);
  if (!(lengthM > 0)) return { refusal: 'not-positive' };
  return { lengthM };
}

export type EdgeLengthResult = { readonly trace: MapTrace; readonly refusal?: never } | { readonly refusal: LengthRefusal; readonly trace?: never };

/**
 * Boundary `i` set to `lengthM`, by the classic map's `setLegLength`: the corner
 * it starts at and its bearing stay, the corner it ends at slides along it, and
 * the next boundary changes as a consequence.
 */
export function withEdgeLength(trace: MapTrace, i: number, lengthM: number): EdgeLengthResult {
  const { ring } = trace;
  const end = (i + 1) % ring.length;
  const a = ring[i];
  const b = ring[end];
  if (!a || !b || ring.length < 2) return { refusal: 'zero-length' };
  if (!(legBetween(a, b).lengthM > 0)) return { refusal: 'zero-length' };
  const next = setLegLength(ring, i, lengthM);
  if (next === ring) return { refusal: 'not-positive' };
  if (admitVertex([], next[end]!).refusal) return { refusal: 'outside-zone-40' };
  return { trace: edited(trace, next) };
}

/* ── corners ───────────────────────────────────────────────────────── */

/** Corner `i` moved to `p`. A point outside the zone leaves the trace as it was. */
export function withCornerAt(trace: MapTrace, i: number, p: LngLat): MapTrace {
  if (admitVertex([], p).refusal) return trace;
  return edited(
    trace,
    trace.ring.map((q, j) => (j === i ? p : q)),
  );
}

export type CornerRefusal = 'too-few';
export type CornerResult = { readonly trace: MapTrace; readonly refusal?: never } | { readonly refusal: CornerRefusal; readonly trace?: never };

/**
 * Corner `k` deleted. A closed outline keeps at least three corners: below
 * that it is not a plot, and the trace is refused rather than reopened, because
 * a reader who pressed Delete asked for a corner to go and not for the outline
 * to stop being one.
 */
export function deleteCorner(trace: MapTrace, k: number): CornerResult {
  const n = trace.ring.length;
  if (k < 0 || k >= n) return { trace };
  if (trace.closed && n <= 3) return { refusal: 'too-few' };
  const ring = trace.ring.filter((_, j) => j !== k);
  if (!trace.closed) return { trace: { ring, closed: false } };
  // Edges k-1 and k become one, which starts where k-1 started and keeps its descent.
  const edges = edgesOf(trace).filter((_, j) => j !== k);
  return { trace: edited(trace, ring, { sides: trace.lineage?.sides ?? n, edges }) };
}

/** The point halfway along boundary `i`, on the grid. */
export function midpointOf(trace: MapTrace, i: number): LngLat | null {
  const a = trace.ring[i];
  const b = trace.ring[(i + 1) % trace.ring.length];
  if (!a || !b) return null;
  const p = toUtm40(a);
  const q = toUtm40(b);
  return fromUtm40({ e: (p.e + q.e) / 2, n: (p.n + q.n) / 2 });
}

/**
 * A corner inserted on boundary `i`, halfway along it unless `at` is given.
 * Both halves descend from the boundary that was split, so both inherit its
 * classification when the outline is used.
 */
export function insertCorner(trace: MapTrace, i: number, at?: LngLat): MapTrace {
  const n = trace.ring.length;
  if (i < 0 || i >= n || (!trace.closed && i >= n - 1)) return trace;
  const p = at ?? midpointOf(trace, i);
  if (!p || admitVertex([], p).refusal) return trace;
  const ring = [...trace.ring.slice(0, i + 1), p, ...trace.ring.slice(i + 1)];
  if (!trace.closed) return { ring, closed: false };
  const old = edgesOf(trace);
  const edges = [...old.slice(0, i + 1), old[i]!, ...old.slice(i + 1)];
  return edited(trace, ring, { sides: trace.lineage?.sides ?? n, edges });
}

/* ── the whole outline ─────────────────────────────────────────────── */

/**
 * Every corner moved by the same displacement on the grid, so every length and
 * bearing is what it was. A move that would carry a corner out of the zone
 * leaves the trace where it was.
 */
export function translateBy(trace: MapTrace, eastM: number, northM: number): MapTrace {
  try {
    const ring = trace.ring.map((p) => {
      const g = toUtm40(p);
      return fromUtm40({ e: g.e + eastM, n: g.n + northM });
    });
    if (ring.some((p) => admitVertex([], p).refusal)) return trace;
    return edited(trace, ring);
  } catch {
    return trace;
  }
}

/** The outline as it was when the drag began, moved by the drag. */
export function translateTrace(base: MapTrace, from: LngLat, to: LngLat): MapTrace {
  try {
    const a = toUtm40(from);
    const b = toUtm40(to);
    return translateBy(base, b.e - a.e, b.n - a.n);
  } catch {
    return base;
  }
}

/* ── the segment being drawn ───────────────────────────────────────── */

/** How far the pointer is from the last corner placed, in metres; null where it cannot be measured. */
export function liveLength(trace: MapTrace, pointer: LngLat | null): number | null {
  if (!pointer || trace.closed) return null;
  const last = trace.ring[trace.ring.length - 1];
  if (!last) return null;
  try {
    return legBetween(last, pointer).lengthM;
  } catch {
    return null;
  }
}
