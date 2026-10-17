/**
 * Circulation — can a car actually reach the bay?
 *
 * Eng. Mohamed, 2026-09-28, naming the two halves of the massing complaint:
 * *"و الاهم ال core لازم يكون في الحسبه و **ممر الي ماشي فيه السيارات مظبوط**"*.
 * The core is `core.ts`. This is the driveway.
 *
 * The aisles were already the right width — 6.00 m two-way, Table B.11,
 * corroborated by the client's own drawings. What was missing is that **nothing
 * checked they connect**. `layout.ts` packed double-loaded modules up the level
 * one after another, each with its own aisle running the full width, and no two
 * of those aisles touched: between the aisle of module 1 and the aisle of
 * module 2 stood eleven metres of parked cars. Every bay in module 3 was
 * counted, drawn, exported to DXF and stood up in the 3D view, and no car could
 * get to any of them.
 *
 * A bay count that cannot be laid out is not a bay count — that argument is at
 * the top of `layout.ts` and it is why bays are placed as rectangles rather than
 * divided out of an area. A bay that is laid out and cannot be reached fails the
 * same argument one step later.
 *
 * ---
 *
 * **The model.** Drive aisles and the ramp are nodes. Two nodes are connected
 * when their rectangles share an edge at least as long as the driveway is wide:
 * a 400 mm gap between two aisles is a drafting artifact, not a way through, and
 * a graph that accepted it would be the permissive check this codebase refuses
 * everywhere else. One node — and only one — is the way onto the level: the ramp
 * where there is one, otherwise the aisle that meets the slab edge where the
 * driveway lands. Every other node must reach it.
 *
 * A bay is served when its **open end** — its short side, the side the car noses
 * in through — lies wholly against a reachable node. Wholly, because a bay
 * overlapping an aisle by 1.2 m of its 2.5 m width is a bay with a column across
 * half its mouth.
 *
 * **Why this is not a nineteenth invariant.** `packages/invariants` carries the
 * PRD's INV-01…INV-18 and reports; it does not change a number. Reachability has
 * to change the number — an unreachable bay is not counted, which is the whole
 * point — so it belongs in the engine, before the count is emitted. The
 * independent re-check is in `pnpm parity`, which walks the model the renderers
 * actually draw, and it was made to fail on a doctored layout before it was
 * trusted.
 */

import { Decimal } from '@envelope/core';

/** An axis-aligned rectangle in level-local metres. `layout.ts`'s `Rect`. */
export interface CircRect {
  readonly x: Decimal;
  readonly y: Decimal;
  readonly width: Decimal;
  readonly height: Decimal;
}

const span = (lo1: Decimal, hi1: Decimal, lo2: Decimal, hi2: Decimal): Decimal =>
  Decimal.min(hi1, hi2).minus(Decimal.max(lo1, lo2));

/** Overlap of two rectangles on each axis. Negative means apart on that axis. */
function overlaps(a: CircRect, b: CircRect): { readonly x: Decimal; readonly y: Decimal } {
  return {
    x: span(a.x, a.x.plus(a.width), b.x, b.x.plus(b.width)),
    y: span(a.y, a.y.plus(a.height), b.y, b.y.plus(b.height)),
  };
}

/**
 * The length of the opening between two rectangles — how wide the way through
 * is — or zero when there is none.
 *
 * Rectangles that merely touch at a corner give zero: a corner is not a
 * doorway. Rectangles that genuinely overlap give the smaller overlap, which
 * only arises from a layout defect and is treated as connected so the defect
 * surfaces as an overlap test rather than as a phantom disconnection.
 */
export function openingM(a: CircRect, b: CircRect): Decimal {
  const o = overlaps(a, b);
  if (o.x.lt(0) || o.y.lt(0)) return new Decimal(0);
  if (o.x.gt(0) && o.y.gt(0)) return Decimal.min(o.x, o.y);
  if (o.x.gt(0)) return o.x;
  if (o.y.gt(0)) return o.y;
  return new Decimal(0);
}

export interface CirculationInput {
  /** Aisles and the ramp — everything a car drives on, in one list. */
  readonly drivable: readonly CircRect[];
  /** Indices of `drivable` that are the way onto the level. Usually exactly one. */
  readonly entries: readonly number[];
  /** An opening narrower than this is not a way through. The driveway width. */
  readonly minOpeningM: Decimal;
}

export interface Circulation {
  /** `adjacency[i]` lists the nodes reachable from node `i` in one move. */
  readonly adjacency: readonly (readonly number[])[];
  readonly reachable: ReadonlySet<number>;
}

/** Build the aisle network and flood it from the entries. */
export function traceCirculation(input: CirculationInput): Circulation {
  const n = input.drivable.length;
  const adjacency: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const opening = openingM(input.drivable[i]!, input.drivable[j]!);
      if (opening.gte(input.minOpeningM)) {
        adjacency[i]!.push(j);
        adjacency[j]!.push(i);
      }
    }
  }

  const reachable = new Set<number>();
  const queue = [...input.entries];
  for (const e of queue) reachable.add(e);
  while (queue.length > 0) {
    const at = queue.shift()!;
    for (const next of adjacency[at]!) {
      if (!reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
      }
    }
  }
  return { adjacency, reachable };
}

/**
 * The node serving a bay, or `null` when nothing does.
 *
 * The open end is the bay's short side: a 2.5 × 5.5 m bay is entered across its
 * 2.5 m width, never over the bonnet. The contact must be edge-to-edge and the
 * full width of that end — a bay whose mouth is only half on the aisle is a bay
 * with something parked across the other half.
 */
export function servingNode(
  bay: CircRect,
  drivable: readonly CircRect[],
  only?: ReadonlySet<number>,
): number | null {
  const upright = bay.width.lte(bay.height);
  const mouth = upright ? bay.width : bay.height;
  for (let i = 0; i < drivable.length; i += 1) {
    if (only && !only.has(i)) continue;
    const o = overlaps(bay, drivable[i]!);
    if (upright ? o.y.isZero() && o.x.gte(mouth) : o.x.isZero() && o.y.gte(mouth)) return i;
  }
  return null;
}

/** Whether a bay's open end lies wholly against an aisle a car can reach. */
export function bayIsServed(
  bay: CircRect,
  drivable: readonly CircRect[],
  reachable: ReadonlySet<number>,
): boolean {
  return servingNode(bay, drivable, reachable) !== null;
}

// ---------------------------------------------------------------------------
// One-way circulation
// ---------------------------------------------------------------------------

/**
 * A drivable rectangle with a direction of travel along its long axis: `1`
 * towards larger x (or y), `-1` towards smaller. Absent on what is two-way — the
 * ramp, the drive from the slab edge.
 */
export interface OneWayRect extends CircRect {
  readonly travel?: 1 | -1;
}

export interface OneWayInput {
  readonly drivable: readonly OneWayRect[];
  /** The way onto the level, which is also the way off it: the ramp, or the drive. Two-way. */
  readonly entries: readonly number[];
  /** An opening narrower than this is not a way through: the one-way aisle's width. */
  readonly minOpeningM: Decimal;
}

export interface OneWayCirculation {
  /** Nodes a car reaches from the way in, driving with the traffic. */
  readonly forward: ReadonlySet<number>;
  /** Nodes from which a car gets back to the way out, driving with the traffic. */
  readonly back: ReadonlySet<number>;
  /**
   * Per one-way node, how far up it a car can first be (`earliest`) and how far
   * down it a car can still leave towards the way out (`latest`), in the node's
   * own direction of travel. A bay between the two is passed by a car that came
   * in and can get out; one before `earliest` is behind every way in.
   */
  readonly earliest: ReadonlyMap<number, number>;
  readonly latest: ReadonlyMap<number, number>;
}

const along = (r: CircRect): boolean => r.width.gte(r.height);

/** The contact between two rectangles, as an interval along each one's own axis, in its direction of travel. */
function contact(a: OneWayRect, b: OneWayRect): { readonly onA: [number, number]; readonly onB: [number, number] } {
  const x0 = Decimal.max(a.x, b.x).toNumber();
  const x1 = Decimal.min(a.x.plus(a.width), b.x.plus(b.width)).toNumber();
  const y0 = Decimal.max(a.y, b.y).toNumber();
  const y1 = Decimal.min(a.y.plus(a.height), b.y.plus(b.height)).toNumber();
  const on = (r: OneWayRect): [number, number] => {
    const [lo, hi] = along(r) ? [x0, x1] : [y0, y1];
    const t = r.travel ?? 1;
    return [Math.min(t * lo, t * hi), Math.max(t * lo, t * hi)];
  };
  return { onA: on(a), onB: on(b) };
}

/**
 * The aisle network of a one-way level, flooded WITH THE TRAFFIC.
 *
 * `traceCirculation` asks only whether two aisles touch, which on a one-way loop
 * is not the question: a car entering an aisle at one end cannot drive back to
 * a bay behind it, and an aisle whose only way out is upstream of its only way in
 * is a trap. So each one-way aisle carries a position along it, in its direction
 * of travel. Forwards from the way in, the EARLIEST point a car can be on each
 * aisle: it may leave an aisle only at an opening that is not behind where it
 * came on. Backwards from the way out, the LATEST point from which a car can
 * still get off it towards the exit. A bay is served when its mouth lies between
 * the two (`oneWayServes`): a car that came in passes it, and the loop leads it
 * back out.
 *
 * Openings are measured as in `traceCirculation`: an edge shared for at least
 * the aisle's width. The directions are the packer's, written on each aisle; the
 * openings are measured, so a direction can never join two aisles that do not
 * touch.
 */
export function traceOneWay(input: OneWayInput): OneWayCirculation {
  const n = input.drivable.length;
  const links: { readonly to: number; readonly onFrom: [number, number]; readonly onTo: [number, number] }[][] =
    Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      if (i === j) continue;
      const a = input.drivable[i]!;
      const b = input.drivable[j]!;
      if (openingM(a, b).lt(input.minOpeningM)) continue;
      const c = contact(a, b);
      links[i]!.push({ to: j, onFrom: c.onA, onTo: c.onB });
    }
  }
  const oneWay = (i: number): boolean => input.drivable[i]!.travel !== undefined;
  const EPS = 1e-6;

  // --- forwards: the earliest point a car can be on each node ---------------------
  const earliest = new Map<number, number>();
  const queue: number[] = [];
  for (const e of input.entries) {
    earliest.set(e, -Infinity);
    queue.push(e);
  }
  while (queue.length > 0) {
    const i = queue.shift()!;
    const at = earliest.get(i)!;
    for (const l of links[i]!) {
      // It leaves where the opening is not wholly behind it.
      if (oneWay(i) && l.onFrom[1] < at - EPS) continue;
      const on = oneWay(l.to) ? l.onTo[0] : -Infinity;
      const before = earliest.get(l.to);
      if (before === undefined || on < before - EPS) {
        earliest.set(l.to, on);
        queue.push(l.to);
      }
    }
  }

  // --- backwards: the latest point from which a car still gets out ------------------
  const latest = new Map<number, number>();
  for (const e of input.entries) {
    latest.set(e, Infinity);
    queue.push(e);
  }
  while (queue.length > 0) {
    const j = queue.shift()!;
    const out = latest.get(j)!;
    for (let i = 0; i < n; i += 1) {
      for (const l of links[i]!) {
        if (l.to !== j) continue;
        // Coming onto j here, a car must still be able to leave j further on.
        if (oneWay(j) && l.onTo[0] > out + EPS) continue;
        const leave = oneWay(i) ? l.onFrom[1] : Infinity;
        const before = latest.get(i);
        if (before === undefined || leave > before + EPS) {
          latest.set(i, leave);
          queue.push(i);
        }
      }
    }
  }

  const forward = new Set(earliest.keys());
  const back = new Set(latest.keys());
  return { forward, back, earliest, latest };
}

/**
 * Whether a one-way level serves a bay: its mouth is wholly on an aisle that is
 * both reached and left (`traceOneWay`), and its centre lies between where a car
 * can first be on that aisle and where it can last leave it.
 */
export function oneWayServes(bay: CircRect, drivable: readonly OneWayRect[], circ: OneWayCirculation): boolean {
  const usable = new Set([...circ.forward].filter((i) => circ.back.has(i)));
  for (let i = 0; i < drivable.length; i += 1) {
    if (!usable.has(i)) continue;
    if (servingNode(bay, [drivable[i]!]) === null) continue;
    const r = drivable[i]!;
    if (r.travel === undefined) return true;
    const c = (along(r) ? bay.x.plus(bay.width.div(2)) : bay.y.plus(bay.height.div(2))).toNumber() * r.travel;
    if (c >= circ.earliest.get(i)! - 1e-6 && c <= circ.latest.get(i)! + 1e-6) return true;
  }
  return false;
}
