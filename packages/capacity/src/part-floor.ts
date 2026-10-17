/**
 * The part floor — the governing capacity above its last whole tower plate,
 * drawn as a smaller top floor.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS DRAWN, AND WHY THAT IS AN ASSUMPTION.
 *
 * §15.2 makes the governing capacity `min(A, B, C)`. That figure is almost never
 * a whole number of tower plates: on the worked example band C binds at
 * 9,677.42 m² over a 1,280 m² plate, which is seven plates and 717.42 m² more.
 * For a while the engine reported only the seven plates — 8,960 m² — because
 * the 717.42 m² stood on no drawn level, and a figure no level carries is the
 * defect `level-areas.ts` exists to catch. That fixed the drawing by cutting
 * the answer: 7.4% under what an architect would draw, on every run, in the
 * direction nobody checks.
 *
 * An architect fills the figure. Either the top floor is smaller, or every
 * plate is shrunk until one more level fits. Both reach the same total; they
 * differ in the drawing. Which one Eng. Mohamed draws is a question still open
 * with him, so the engine draws the first — the remainder as a top floor of its
 * own area — and says so in amber: the rule is `ASSUMED`, the part floor's area
 * takes that class, and so does the governing figure that counts it.
 *
 * ITS SHAPE IS A RULE, NOT A DESIGN. The part floor is the tower plate scaled
 * to the remainder's area, the rule the plate and the core are already drawn
 * by. The core passes through it, so it is scaled about the point the core is
 * scaled about: the plate's centre, or, where the core was moved toward the
 * parking island, the one point from which the plate and the core are the same
 * shape at two sizes. From that point the part floor sits between them, holding
 * the core and held by the plate. Nothing is searched; a placement that does
 * not hold is refused in a sentence and the part floor is not drawn.
 *
 * TOO SMALL TO BE A FLOOR. A top floor that cannot hold its core and one unit
 * is not a floor anyone builds. Below that minimum — itself `ASSUMED`, with a
 * basis, measured in the register, and replaceable by a stated figure — the
 * part floor is dropped, the governing capacity is the whole levels, and the
 * drop is said with both figures. Never silently.
 */

import { asMm, Decimal, qArea, type Traced, type TracedDecimal, type Tracer } from '@envelope/core';
import { area, intersect, isSimple, type Ring, scaleToArea } from '@envelope/geometry';

/** What a run did with the part floor above its last whole level. */
export type PartFloor =
  | {
      readonly kind: 'DRAWN';
      /** The part floor's own plate: the governing capacity less the whole levels. */
      readonly areaM2: TracedDecimal;
      /** How it is drawn — the assumption a reader can argue with. */
      readonly rule: Traced<string>;
      readonly minimum: TracedDecimal;
    }
  | {
      readonly kind: 'DROPPED';
      readonly remainderM2: Decimal;
      /** The minimum it fell below; null when it was dropped for its placement. */
      readonly minimum: TracedDecimal | null;
      /** The sentence, with both figures. Said under every drawing and on the governing figure. */
      readonly reason: string;
    };

/** The words the rule is stated in, as its node's value. */
export const PART_FLOOR_RULE_VALUE = 'the remainder drawn as a smaller top floor, the tower plate scaled to its area';

/**
 * The basis of the drawing rule. Run-specific figures, so a reader of the
 * register sees what the assumption is worth here rather than in general.
 */
export function partFloorRuleBasis(input: {
  readonly wholeLevels: number;
  readonly plateM2: Decimal;
  readonly remainderM2: Decimal;
  readonly governingM2: Decimal;
  readonly aboutCore: boolean;
}): string {
  const whole = input.plateM2.times(input.wholeLevels);
  return (
    `The governing capacity of ${input.governingM2.toFixed(2)} m² is ${input.wholeLevels} whole level(s) ` +
    `of the ${input.plateM2.toFixed(2)} m² tower plate and ${input.remainderM2.toFixed(2)} m² more. ` +
    `The remainder is drawn as a smaller top floor of that area: the tower plate scaled ` +
    (input.aboutCore
      ? 'about the point the core is scaled about, so the core, moved toward the parking island, stands inside it'
      : 'about its centre, the rule the plate and the core are drawn by') +
    '. Whether the architect draws a smaller top floor or shrinks every plate so one more level fits ' +
    'is a question still open with the client; both reach the same total. Left out, the governing ' +
    `capacity would be the whole levels alone, ${whole.toFixed(2)} m².`
  );
}

/** The basis of the smallest part floor drawn. */
export function partFloorMinimumBasis(coreM2: Decimal, unitGfaM2: Decimal): string {
  return (
    `The smallest top floor drawn: the core of ${coreM2.toFixed(2)} m² and one unit's ` +
    `${unitGfaM2.toFixed(2)} m² of GFA, ${coreM2.plus(unitGfaM2).toFixed(2)} m² together. A top floor ` +
    'that cannot hold its core and one unit is not a floor anyone builds, so a part floor smaller ' +
    'than this is not drawn and the governing capacity is the whole levels; it errs toward leaving ' +
    'a floor out. No clause of the Dubai Building Code states a smallest floor. Enter one to replace it.'
  );
}

/** Said, with both figures, when the part floor is smaller than the minimum. */
export function partFloorBelowMinimum(remainderM2: Decimal, minimumM2: Decimal, wholeM2: Decimal): string {
  return (
    `The part floor above the last whole level is not drawn: its ${remainderM2.toFixed(2)} m² is less ` +
    `than the ${minimumM2.toFixed(2)} m² this run takes as the smallest top floor, its core and one ` +
    `unit. The governing capacity is the whole levels, ${wholeM2.toFixed(2)} m².`
  );
}

/** Said, with both figures, when no top floor of the remainder's area holds the core inside the plate. */
export function partFloorNotPlaced(remainderM2: Decimal, wholeM2: Decimal): string {
  return (
    `The part floor above the last whole level is not drawn: a top floor of ${remainderM2.toFixed(2)} m², ` +
    'drawn by the rule the plate and the core are drawn by, does not hold the core inside the tower ' +
    `plate. The governing capacity is the whole levels, ${wholeM2.toFixed(2)} m².`
  );
}

/** The smallest part floor drawn — the core and one unit's GFA, or the figure somebody stated. */
export function partFloorMinimum(
  tracer: Tracer,
  core: TracedDecimal,
  unitGfa: TracedDecimal,
  stated: { readonly areaM2: Decimal; readonly actor: { readonly id: string; readonly name: string } } | undefined,
): TracedDecimal {
  if (stated) {
    return tracer.userSet('capacity.part_floor_minimum_m2', qArea(stated.areaM2), {
      actor: stated.actor,
      unit: 'm²',
      label: 'smallest top floor drawn',
    });
  }
  return tracer.assumed('capacity.part_floor_minimum_m2', qArea(core.value.plus(unitGfa.value)), {
    basis: partFloorMinimumBasis(core.value, unitGfa.value),
    unit: 'm²',
    label: 'smallest top floor drawn',
  });
}

const centreOf = (ring: Ring): { readonly x: Decimal; readonly y: Decimal } => ({
  x: ring.reduce((s, p) => s.plus(p.x), new Decimal(0)).div(ring.length),
  y: ring.reduce((s, p) => s.plus(p.y), new Decimal(0)).div(ring.length),
});

/** Every corner of `inner` inside `outer`: all of its area shared. The containment test `solveCore` uses. */
function holds(outer: Ring, inner: Ring): boolean {
  const shared = intersect(inner, outer).reduce((s, r) => s + Math.abs(area(r)), 0);
  return shared >= Math.abs(area(inner)) * 0.9999;
}

export interface PartFloorRingInput {
  /** The tower plate, as the envelope drew it. */
  readonly plateRing: Ring;
  /** The core, as `solveCore` placed it — scaled from the plate, perhaps moved whole. */
  readonly coreRing: Ring;
  /** The core's area, m², the figure `solveCore` scaled the plate to. */
  readonly coreAreaM2: Decimal;
  /** The part floor's area, m². */
  readonly areaM2: Decimal;
}

/** The part floor's ring, and whether it is scaled about the core rather than the plate's centre. */
export type PartFloorRing =
  | { readonly kind: 'PLACED'; readonly ring: Ring; readonly aboutCore: boolean }
  | { readonly kind: 'NOT_PLACED' };

/**
 * The part floor, drawn.
 *
 * The plate scaled to the part floor's area about the plate's centre when the
 * core stands there, which is `scaleToArea` exactly. Where `solveCore` moved the
 * core whole by `t`, the core is the plate scaled by `k` about `h = c + t ÷ (1 − k)`
 * (`c` the plate's centre); scaling the plate about the same `h` by the part
 * floor's own factor puts it between the two, so it holds the core and the plate
 * holds it. Both are verified on the grid, never assumed.
 */
export function partFloorRing(input: PartFloorRingInput): PartFloorRing {
  const targetMm2 = input.areaM2.times(1_000_000).toDecimalPlaces(0).toNumber();
  if (targetMm2 <= 0) return { kind: 'NOT_PLACED' };
  const plate = centreOf(input.plateRing);
  const core = centreOf(input.coreRing);
  const tx = core.x.minus(plate.x);
  const ty = core.y.minus(plate.y);
  // Within a millimetre of the plate's centre is the plate's centre: `centredOn` moves by whole millimetres.
  const moved = tx.abs().gt(1) || ty.abs().gt(1);

  let ring: Ring;
  if (!moved) {
    try {
      ring = scaleToArea(input.plateRing, targetMm2);
    } catch {
      return { kind: 'NOT_PLACED' };
    }
  } else {
    const plateMm2 = new Decimal(Math.abs(area(input.plateRing)));
    const k = input.coreAreaM2.times(1_000_000).div(plateMm2).sqrt();
    const s = new Decimal(targetMm2).div(plateMm2).sqrt();
    if (k.gte(1) || s.gte(1)) return { kind: 'NOT_PLACED' };
    const hx = plate.x.plus(tx.div(new Decimal(1).minus(k)));
    const hy = plate.y.plus(ty.div(new Decimal(1).minus(k)));
    ring = input.plateRing.map((p) => ({
      x: asMm(new Decimal(p.x).minus(hx).times(s).plus(hx).toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN).toNumber()),
      y: asMm(new Decimal(p.y).minus(hy).times(s).plus(hy).toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN).toNumber()),
    }));
  }
  if (!isSimple(ring) || !holds(input.plateRing, ring) || !holds(ring, input.coreRing)) {
    return { kind: 'NOT_PLACED' };
  }
  return { kind: 'PLACED', ring, aboutCore: moved };
}
