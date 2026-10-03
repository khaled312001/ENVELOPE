/**
 * An indicative ground-floor program in the reserved strip: the entrance lobby
 * and the plant rooms a Dubai residential tower puts at grade.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS, AND WHAT IT IS NOT.
 *
 * The parking layout reserves a strip on every parking level for "cores, plant
 * and circulation" and draws it hatched, "reserved, not laid out". On the ground
 * floor of the client's drawings that strip is rooms — substation, LV room,
 * generator, pump room, water tank, garbage, the entrance — and a reviewer reads
 * the ground floor by them.
 *
 * It is NOT a services design. No room here is sized from a DEWA, Civil Defence or
 * municipality requirement on file; each width is a typical figure, stated in the
 * basis, and the whole program is one assumption drawn in the assumed ink. The
 * strip's AREA stays what the layout reserved — this only says what such a strip
 * is commonly made of.
 *
 * ---------------------------------------------------------------------------
 * HOW IT IS LAID.
 *
 * Along the strip's long side, in the order below, from the end nearer the core,
 * on the side of the strip away from the core — the facade — and no deeper than
 * 7 m; whatever depth is left stays reserved. What does not fit is not squeezed:
 * it is named, and the sheet says it was not placed. A strip shallower than 3 m
 * holds no room at all.
 */

import { asMm, type Tracer, type Traced } from '@envelope/core';

import { frameOf } from './core-layout.js';

interface Pt {
  readonly x: number;
  readonly y: number;
}

/** Name on the drawing, and width along the strip in millimetres. */
const PROGRAM: readonly (readonly [string, number])[] = [
  ['ENTRANCE LOBBY', 6000],
  ['SUBSTATION', 9000],
  ['LV ROOM', 5000],
  ['GENERATOR ROOM', 5000],
  ['PUMP ROOM', 5000],
  ['WATER TANK', 6000],
  ['GARBAGE ROOM', 4000],
  ['TEL ROOM', 2500],
  ['MM ROOM', 2500],
];

const MIN_DEPTH_MM = 3000;
/** A plant room deeper than this is a corridor; the rest of the strip stays reserved. */
const MAX_DEPTH_MM = 7000;

export const GROUND_PROGRAM_BASIS =
  'An indicative ground floor for a residential tower, drawn in the strip the parking ' +
  'layout reserves for plant and circulation: an entrance lobby 6 m wide, a substation ' +
  '9 m, LV and generator rooms and a pump room 5 m each, a water tank 6 m, a garbage room ' +
  '4 m, and TEL and MM rooms 2.5 m, each the depth of the strip up to 7 m, along its outer ' +
  'side. These are typical ' +
  'widths, not figures from a DEWA, Civil Defence or municipality requirement on file, so ' +
  'the program is an assumption; no room is sized, ventilated or access-checked.';

export interface GroundRoom {
  readonly name: string;
  /** [origin, +along, +along+across, +across], integer millimetres. */
  readonly outline: readonly { readonly x: ReturnType<typeof asMm>; readonly y: ReturnType<typeof asMm> }[];
}

export type GroundProgram =
  | {
      readonly kind: 'LAID_OUT';
      readonly rooms: readonly GroundRoom[];
      readonly notPlaced: readonly string[];
      readonly program: Traced<string>;
    }
  | { readonly kind: 'NOT_LAID_OUT'; readonly reason: string };

export function layoutGroundProgram(input: {
  readonly tracer: Tracer;
  readonly zone: readonly Pt[];
  /** Where the core stands, so the entrance is laid at the strip's nearer end. */
  readonly towards?: Pt;
}): GroundProgram {
  const frame = frameOf(input.zone);
  if (!frame) {
    return {
      kind: 'NOT_LAID_OUT',
      reason: 'The reserved strip is not a rectangle, so no plant room is drawn in it.',
    };
  }
  if (frame.depthMm < MIN_DEPTH_MM) {
    return {
      kind: 'NOT_LAID_OUT',
      reason:
        `The reserved strip is ${(frame.depthMm / 1000).toFixed(1)} m deep, under the 3.0 m a ` +
        'plant room needs, so none is drawn in it.',
    };
  }

  // Lay from the end nearer the core: the entrance belongs by the lifts.
  const along = (p: Pt) =>
    (p.x - frame.origin.x) * frame.along.x + (p.y - frame.origin.y) * frame.along.y;
  const fromFar = input.towards !== undefined && along(input.towards) > frame.lengthMm / 2;
  // Across the strip: the rooms take the side away from the core, up to 7 m deep.
  const across = (p: Pt) =>
    (p.x - frame.origin.x) * frame.across.x + (p.y - frame.origin.y) * frame.across.y;
  const depth = Math.min(frame.depthMm, MAX_DEPTH_MM);
  const coreOnFarSide = input.towards !== undefined && across(input.towards) > frame.depthMm / 2;
  const b0 = coreOnFarSide ? 0 : frame.depthMm - depth;

  const rooms: GroundRoom[] = [];
  const notPlaced: string[] = [];
  let used = 0;
  for (const [name, width] of PROGRAM) {
    if (used + width > frame.lengthMm) {
      notPlaced.push(name);
      continue;
    }
    const a0 = fromFar ? frame.lengthMm - used - width : used;
    const at = (a: number, b: number) => ({
      x: asMm(Math.round(frame.origin.x + a * frame.along.x + b * frame.across.x)),
      y: asMm(Math.round(frame.origin.y + a * frame.along.y + b * frame.across.y)),
    });
    rooms.push({
      name,
      outline: [at(a0, b0), at(a0 + width, b0), at(a0 + width, b0 + depth), at(a0, b0 + depth)],
    });
    used += width;
  }
  if (rooms.length === 0) {
    return {
      kind: 'NOT_LAID_OUT',
      reason: 'The reserved strip is shorter than the smallest room of the program.',
    };
  }

  const program = input.tracer.assumed(
    'building.ground_floor_program',
    rooms.map((r) => r.name.toLowerCase()).join(', '),
    { basis: GROUND_PROGRAM_BASIS, label: 'indicative ground-floor rooms' },
  );
  return { kind: 'LAID_OUT', rooms, notPlaced, program };
}
