/**
 * Where a horizontal band fits inside a polygon — the one question the
 * whole-footprint parking arrangement asks of the plot, many times.
 *
 * `largestInscribedRectangle` answers "what is the biggest rectangle inside
 * this ring", which on a triangular plot is under half of it. Laying bay rows
 * across the whole footprint needs a different answer: for a band `y0..y1` in
 * the packing frame, the x-spans over which a rectangle of the band's FULL
 * height stands inside the ring. A bay or an aisle drawn in such a span is
 * inside the plot by construction, at every point, not only at its corners.
 *
 * EXACT, NOT SAMPLED. Between two consecutive vertex heights every boundary edge
 * is a straight line, so on that sub-band each edge's x is linear in y and its
 * extreme lies at an end. The sub-band's topology — which edge bounds which span —
 * is read at its midpoint, where no vertex sits, and each bounding edge is then
 * evaluated at both ends. Sampling a few heights instead would be wrong by up to
 * the edge's run over the sampling gap, which on a shallow edge is metres.
 */

export interface XY {
  readonly x: number;
  readonly y: number;
}

/** A closed span `[from, to]` along x, in the caller's unit. */
export type Interval = readonly [number, number];

/** Spans present in both lists. Both must be sorted and non-overlapping. */
export function intersectIntervals(a: readonly Interval[], b: readonly Interval[]): Interval[] {
  const out: Interval[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const lo = Math.max(a[i]![0], b[j]![0]);
    const hi = Math.min(a[i]![1], b[j]![1]);
    if (hi > lo) out.push([lo, hi]);
    if (a[i]![1] < b[j]![1]) i += 1;
    else j += 1;
  }
  return out;
}

/** Spans of `a` not covered by any span of `b`. Both sorted and non-overlapping. */
export function subtractIntervals(a: readonly Interval[], b: readonly Interval[]): Interval[] {
  const out: Interval[] = [];
  for (const [from, to] of a) {
    let at = from;
    for (const [lo, hi] of b) {
      if (hi <= at || lo >= to) continue;
      if (lo > at) out.push([at, lo]);
      at = Math.max(at, hi);
    }
    if (to > at) out.push([at, to]);
  }
  return out;
}

/** x of the edge `p → q` at height `y`. The edge must not be horizontal. */
const xAt = (p: XY, q: XY, y: number): number => p.x + ((q.x - p.x) * (y - p.y)) / (q.y - p.y);

/**
 * The x-spans over which the rectangle `[x0, x1] × [y0, y1]` lies inside the
 * polygon, for any `x0..x1` within one span. Empty where the band leaves the
 * polygon anywhere along its height.
 */
export function bandIntervals(polygon: readonly XY[], y0: number, y1: number): Interval[] {
  if (!(y1 > y0) || polygon.length < 3) return [];
  const breaks = [
    y0,
    ...polygon.map((p) => p.y).filter((y) => y > y0 && y < y1),
    y1,
  ].sort((a, b) => a - b);

  let acc: Interval[] | undefined;
  for (let k = 0; k + 1 < breaks.length; k += 1) {
    const lo = breaks[k]!;
    const hi = breaks[k + 1]!;
    if (!(hi > lo)) continue;
    const mid = (lo + hi) / 2;
    const crossings: { readonly atMid: number; readonly atLo: number; readonly atHi: number }[] = [];
    for (let e = 0; e < polygon.length; e += 1) {
      const p = polygon[e]!;
      const q = polygon[(e + 1) % polygon.length]!;
      if ((p.y <= mid) === (q.y <= mid)) continue;
      crossings.push({ atMid: xAt(p, q, mid), atLo: xAt(p, q, lo), atHi: xAt(p, q, hi) });
    }
    crossings.sort((a, b) => a.atMid - b.atMid);
    const spans: Interval[] = [];
    for (let c = 0; c + 1 < crossings.length; c += 2) {
      const left = crossings[c]!;
      const right = crossings[c + 1]!;
      const from = Math.max(left.atLo, left.atHi);
      const to = Math.min(right.atLo, right.atHi);
      if (to > from) spans.push([from, to]);
    }
    acc = acc === undefined ? spans : intersectIntervals(acc, spans);
    if (acc.length === 0) return [];
  }
  return acc ?? [];
}

/** Twice the signed area; positive for a counter-clockwise ring. */
export function signedArea2(polygon: readonly XY[]): number {
  let s = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const p = polygon[i]!;
    const q = polygon[(i + 1) % polygon.length]!;
    s += p.x * q.y - q.x * p.y;
  }
  return s;
}
