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
