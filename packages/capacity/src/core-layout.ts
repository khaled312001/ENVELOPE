/**
 * An indicative layout inside the core: two stairs, the lifts, and the lift lobby.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS, AND WHAT IT IS NOT.
 *
 * The client's drawings show the core as a core — stair, lift, lift, stair, with
 * the lobby in front — and the engine drew it as an outlined area. A reviewer
 * reading a parking level needs to see where the lifts land and where the stairs
 * come down, because that is what the bays and the aisle have to leave room for.
 *
 * It is NOT a core design. Nothing here sizes a stair for egress, counts lifts for
 * traffic, or places a fire-fighting shaft; those are life-safety questions the
 * engine does not answer, and the sheet says so beside the drawing. The program is
 * one assumption — typical residential tower dimensions, stated in full in its
 * basis — drawn in the assumed ink, so a reader can see at a glance that nobody
 * cited it.
 *
 * ---------------------------------------------------------------------------
 * THE PROGRAM, AND WHEN IT IS REFUSED.
 *
 * Along the core's long side, from its back edge: stair | lift | lift | stair,
 * centred, with a lift lobby across the front of all four. One lift when two do not
 * fit. When even one does not, or the core is not a rectangle, nothing is drawn
 * inside it and the reason is returned — a program squeezed into a core it does
 * not fit would show stairs no one could build.
 *
 * Coordinates are the model's: integer millimetres in plot space. Each room's
 * outline is ordered [origin, +along, +along+across, +across], so a sheet can
 * recover the room's own axes without a second field.
 */

import { asMm, Decimal, type Tracer, type Traced, type TracedDecimal } from '@envelope/core';

/** Plot-space millimetres, as the core ring is held. */
interface Pt {
  readonly x: number;
  readonly y: number;
}

/** A stair: two flights side by side and a landing at each end. */
const STAIR_ALONG_MM = 5600;
const STAIR_ACROSS_MM = 2800;
/** A lift shaft for a 13-person (1,000 kg) car. */
const LIFT_MM = 2400;
/** The lift lobby, across the front of the stairs and lifts. */
const LOBBY_DEPTH_MM = 2400;

export const CoreRoomKind = {
  STAIR: 'STAIR',
  LIFT: 'LIFT',
  LOBBY: 'LOBBY',
} as const;
export type CoreRoomKind = (typeof CoreRoomKind)[keyof typeof CoreRoomKind];

export interface CoreRoom {
  readonly kind: CoreRoomKind;
  /** [origin, +along, +along+across, +across], integer millimetres. */
  readonly outline: readonly { readonly x: ReturnType<typeof asMm>; readonly y: ReturnType<typeof asMm> }[];
}

export type CoreLayout =
  | {
      readonly kind: 'LAID_OUT';
      readonly rooms: readonly CoreRoom[];
      readonly program: Traced<string>;
      /**
       * The box the stairs, lifts and lobby fill — what passes through a parking
       * level. The rest of the core is the residential floors' (corridors, the
       * floor lobby) and has no business on a car park.
       */
      readonly shaft: { readonly outline: CoreRoom['outline']; readonly areaM2: TracedDecimal };
    }
  | { readonly kind: 'NOT_LAID_OUT'; readonly reason: string };

export const CORE_LAYOUT_BASIS =
  'An indicative core for a residential tower, drawn so a reader can see where the ' +
  'lifts and stairs stand: two stairs of 5.6 × 2.8 m (two flights of about 1.2 m and a ' +
  'landing at each end), lift shafts of 2.4 × 2.4 m for a 13-person car, and a lift ' +
  'lobby 2.4 m deep across their front. No clause of the Dubai Building Code on file ' +
  'is applied and no developer standard gives a core layout, so this is an assumption. ' +
  'Egress capacity, travel distance, lift traffic and fire-fighting provisions are NOT ' +
  'ASSESSED: the stairs drawn are not an egress design.';

const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
const len = (a: Pt): number => Math.hypot(a.x, a.y);
const unit = (a: Pt): Pt => ({ x: a.x / len(a), y: a.y / len(a) });

/**
 * The core's rectangle as an origin and two unit axes, the first along its longer
 * side. Null when the ring is not a rectangle to within a millimetre a metre.
 */
export function frameOf(ring: readonly Pt[]):
  | { origin: Pt; along: Pt; across: Pt; lengthMm: number; depthMm: number }
  | null {
  if (ring.length !== 4) return null;
  const [p0, p1, p2, p3] = ring as [Pt, Pt, Pt, Pt];
  const e0 = sub(p1, p0);
  const e1 = sub(p3, p0);
  if (len(e0) === 0 || len(e1) === 0) return null;
  const square = Math.abs(e0.x * e1.x + e0.y * e1.y) / (len(e0) * len(e1)) < 1e-3;
  const closes = len(sub(p2, { x: p1.x + e1.x, y: p1.y + e1.y })) <= Math.max(len(e0), len(e1)) / 1000;
  if (!square || !closes) return null;
  return len(e0) >= len(e1)
    ? { origin: p0, along: unit(e0), across: unit(e1), lengthMm: len(e0), depthMm: len(e1) }
    : { origin: p0, along: unit(e1), across: unit(e0), lengthMm: len(e1), depthMm: len(e0) };
}

export function layoutCore(input: { readonly tracer: Tracer; readonly ring: readonly Pt[] }): CoreLayout {
  const frame = frameOf(input.ring);
  if (!frame) {
    return {
      kind: 'NOT_LAID_OUT',
      reason:
        'The core is not a rectangle on this plot, so no stair or lift is drawn inside ' +
        'it; the outline and its area stand alone.',
    };
  }

  const twoLifts = 2 * STAIR_ALONG_MM + 2 * LIFT_MM;
  const lifts = frame.lengthMm >= twoLifts ? 2 : frame.lengthMm >= twoLifts - LIFT_MM ? 1 : 0;
  const needDepth = STAIR_ACROSS_MM + LOBBY_DEPTH_MM;
  if (lifts === 0 || frame.depthMm < needDepth) {
    return {
      kind: 'NOT_LAID_OUT',
      reason:
        `The core is ${(frame.lengthMm / 1000).toFixed(1)} × ${(frame.depthMm / 1000).toFixed(1)} m, ` +
        `and two stairs, one lift and a lobby need ${((twoLifts - LIFT_MM) / 1000).toFixed(1)} × ` +
        `${(needDepth / 1000).toFixed(1)} m. Nothing is drawn inside it rather than a program ` +
        'that does not fit.',
    };
  }

  const program = input.tracer.assumed(
    'building.core_layout',
    `2 stairs 5.6 × 2.8 m, ${lifts} lift${lifts === 1 ? '' : 's'} 2.4 × 2.4 m, lift lobby 2.4 m deep`,
    { basis: CORE_LAYOUT_BASIS, label: 'indicative core layout' },
  );

  const at = (a: number, b: number) => ({
    x: asMm(Math.round(frame.origin.x + a * frame.along.x + b * frame.across.x)),
    y: asMm(Math.round(frame.origin.y + a * frame.along.y + b * frame.across.y)),
  });
  const rect = (kind: CoreRoomKind, a0: number, b0: number, da: number, db: number): CoreRoom => ({
    kind,
    outline: [at(a0, b0), at(a0 + da, b0), at(a0 + da, b0 + db), at(a0, b0 + db)],
  });

  // Centred both ways: the shafts stand in the middle of the core, which is
  // where the core itself stands on the plate.
  const row = 2 * STAIR_ALONG_MM + lifts * LIFT_MM;
  const start = (frame.lengthMm - row) / 2;
  const b0 = (frame.depthMm - needDepth) / 2;
  const rooms: CoreRoom[] = [rect(CoreRoomKind.STAIR, start, b0, STAIR_ALONG_MM, STAIR_ACROSS_MM)];
  for (let i = 0; i < lifts; i++) {
    rooms.push(rect(CoreRoomKind.LIFT, start + STAIR_ALONG_MM + i * LIFT_MM, b0, LIFT_MM, LIFT_MM));
  }
  rooms.push(
    rect(CoreRoomKind.STAIR, start + STAIR_ALONG_MM + lifts * LIFT_MM, b0, STAIR_ALONG_MM, STAIR_ACROSS_MM),
    rect(CoreRoomKind.LOBBY, start, b0 + STAIR_ACROSS_MM, row, LOBBY_DEPTH_MM),
  );
  const shaftArea = new Decimal(row).times(needDepth).div(1_000_000);
  const shaft = {
    outline: rect(CoreRoomKind.LOBBY, start, b0, row, needDepth).outline,
    areaM2: input.tracer.computed('building.core_shaft_area_m2', shaftArea, {
      formula:
        `${(row / 1000).toFixed(1)} m of stairs and lifts × ${(needDepth / 1000).toFixed(1)} m ` +
        'with the lift lobby — what of the core passes through a parking level',
      uses: { program },
      unit: 'm²',
    }),
  };
  return { kind: 'LAID_OUT', rooms, program, shaft };
}
