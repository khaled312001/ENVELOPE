/**
 * The core — Eng. Mohamed, 2026-09-28: *"و الاهم ال core لازم يكون في الحسبه"*.
 *
 * He is right, and until this file the omission was *stated* rather than fixed.
 * `@envelope/massing` said in its own source that it places no core, and the
 * `notModelled` list said it under every picture. Saying it is better than
 * drawing one nobody computed; it is not better than computing one.
 *
 * ---
 *
 * **WHAT "IN THE CALCULATION" HONESTLY MEANS, AND THE TRAP IN IT.**
 *
 * The obvious reading is: subtract the core from the floor area. That reading is
 * wrong twice over, and taking it would have made the answer worse rather than
 * better.
 *
 * A core is **inside GFA** — the annex says so under `CORE_AREA`, and under
 * `TOWER_PLATE`, whose inclusions list "Core" — so deducting it from GFA would
 * report a GFA the plot does not have. And it is **outside saleable area**,
 * which is precisely what the saleable efficiency the run was given already
 * carries: 0.93 means seven per cent of the gross does not sell, and the core is
 * most of that seven per cent. Deducting it again would charge the reader twice
 * for one wall.
 *
 * The same holds one floor down. On a parking level the core is inside what the
 * parking usable fraction already deducts — that fraction's own words are
 * "cores, plant, the ramp landing and circulation that is not drive aisle".
 *
 * So the core does **not** subtract. It does three things instead, and all three
 * are things the product could not do before:
 *
 * 1. **It is drawn**, on every level, in every output, in the ink of the value
 *    that sized it. A tower plate with nothing in it reads as a plate with
 *    nothing in it.
 * 2. **It reconciles.** The core is a share of the plate, and the saleable
 *    efficiency and the parking usable fraction are each a statement about how
 *    much of a level is not saleable or not packable. Those are comparable
 *    numbers, and when the core alone exceeds what one of them allows for, the
 *    input is wrong and nothing else in the system would have said so.
 * 3. **It is a declared quantity** rather than an absence. Unstated, it is
 *    `ASSUMED`, amber, with a basis and a measured sensitivity, in the register.
 *
 * ---
 *
 * **ITS POSITION IS A RULE, NOT A SEARCH.** The core is the tower plate ring
 * scaled about its centre to the core's area — the same deterministic placement
 * the tower plate itself is drawn by, stated in the same words, so a reader who
 * has met one has met both. A core positioned by searching for maximum unit
 * yield is the optimiser at 34:37 of the meeting: it is a `TRADEOFF` value,
 * `PHASE_0_CLASSES` refuses to emit one by construction, and the refusal is the
 * design rather than a limitation to apologise for.
 *
 * The consequence, said plainly wherever the core is drawn: **its shape is the
 * plate's, not a designed core.** Only its area is a quantity. Nobody has laid
 * out a lift bank inside it and this engine does not claim to have.
 */

import {
  asMm,
  Decimal,
  metric,
  qArea,
  qRatio,
  type Traced,
  type TracedDecimal,
  type Tracer,
} from '@envelope/core';
import { area, intersect, ringContainsRing, scaleToArea, type Pt, type Ring } from '@envelope/geometry';

/**
 * A core the run cannot draw, with the sentence a person needs.
 *
 * Its own class rather than a returned refusal string: a function that can
 * return an invalid result invites a caller that forgets to look.
 */
export class CoreRefusedError extends Error {
  override readonly name = 'CoreRefusedError';
}

/**
 * The share of the tower plate a core takes when nobody has said.
 *
 * 15–22% is the range a residential tower core occupies for lifts, escape
 * stairs, risers and the lift lobby; 0.18 is the middle of it. It errs neither
 * way on purpose — a core is not a limit, so there is no conservative direction
 * to err in, and picking one end would make the drawing quietly argumentative.
 */
const ASSUMED_PLATE_SHARE = '0.18';

const ASSUMED_BASIS =
  'A core of 18% of the tower plate: the middle of the 15–22% a residential ' +
  'tower core takes for lift shafts, the lift lobby, escape stairs and risers. ' +
  'No clause of the Dubai Building Code states a core area and no developer ' +
  'standard on file gives one, so this is an assumption and not a derivation. ' +
  'It moves the drawing and the two reconciliations under it; it moves no ' +
  'capacity figure, because a core is inside GFA and outside saleable area and ' +
  'the saleable efficiency this run was given already carries it. Enter the ' +
  'core area to replace it.';

const PLACEMENT_BASIS =
  'The core area fixes how much plate the core takes, not where on the plate it ' +
  'stands. It is drawn as the tower plate outline scaled about its centre to ' +
  'the core area — the same placement the plate itself is drawn by, which keeps ' +
  'its proportions and an equal margin on every side. Where the core actually ' +
  'sits, and how the lifts and stairs sit inside it, are design decisions this ' +
  'engine does not make. Searching for the position that yields the most units ' +
  'is the optimiser this phase refuses by construction.';

/** Said wherever the core is drawn. It is a footprint, not a laid-out core. */
export const CORE_NOT_MODELLED =
  'The core, as a design. Its outline is the tower plate scaled to the core ' +
  'area, and only that area is a computed quantity. The stairs, lifts and lobby ' +
  'drawn inside it are an indicative layout, assumed: egress, lift traffic and ' +
  'fire-fighting are NOT ASSESSED, and no riser or core wall is placed.';

export interface CoreInput {
  readonly tracer: Tracer;
  /** The tower plate the core must fit inside. The tightest of the footprints. */
  readonly plateRing: Ring;
  readonly plateAreaM2: TracedDecimal;
  /**
   * The core area, stated.
   *
   * Absent is a real state and not a missing input: nobody has said, and the
   * engine declares an assumption rather than pretending the building has no
   * core. Present, it is `USER_SET` by the person who entered it.
   *
   * There is deliberately no third, `DERIVED`, path. The plan asked for one
   * "from a developer standard where one is attached" — and no standard on file
   * states a core area or a core ratio. A branch that reads a figure no document
   * holds is a branch that would one day read the wrong one.
   */
  readonly stated?: {
    readonly areaM2: Decimal;
    readonly actor: { readonly id: string; readonly name: string };
  };
  /**
   * Where the core stands, stated: set against one boundary of the plot.
   *
   * Absent, the core is centred on the plate — an assumption, and on a narrow
   * plot an expensive one: centred, its shafts stand across the only drive aisle
   * of the parking level, and every bay beyond them has no way in. Where the core
   * goes is a design decision, so this engine does not move it; a person who
   * states a boundary does, and the core is slid towards that boundary, unchanged
   * in size and shape, until it meets the edge of the tower plate. One stated
   * input, one deterministic answer — never a search for the position that parks
   * the most cars, which is the optimiser this phase refuses.
   */
  readonly position?: {
    readonly edge: {
      readonly seq: number;
      readonly label: string;
      readonly start: Pt;
      readonly end: Pt;
    };
    readonly actor: { readonly id: string; readonly name: string };
  };
}

export interface CoreResult {
  readonly areaM2: TracedDecimal;
  /** Core ÷ tower plate. The figure both reconciliations are made against. */
  readonly plateShare: TracedDecimal;
  /** The core footprint, in plot coordinates. Identical on every level. */
  readonly ring: Ring;
  /** Where it stands, and why that is a rule rather than a design. */
  readonly placement: Traced<string>;
}

/**
 * Size and place the core.
 *
 * @throws {CoreRefusedError} when the stated area cannot be a core of this
 * plate. Refused rather than clamped: a core that does not fit is a number to
 * fix, and silently shrinking it would answer a question about the building that
 * whoever entered it got wrong.
 */
export function solveCore(input: CoreInput): CoreResult {
  // `FR-DEF-001 AC5`: no area term is computed until the annex defines it.
  metric('CORE_AREA');
  metric('TOWER_PLATE');

  const { tracer } = input;
  const plate = input.plateAreaM2.value;

  const areaTraced = input.stated
    ? tracer.userSet('building.core_area_m2', qArea(input.stated.areaM2), {
        actor: input.stated.actor,
        unit: 'm²',
        label: 'core area',
      })
    : tracer.assumed('building.core_area_m2', qArea(plate.times(ASSUMED_PLATE_SHARE)), {
        basis: ASSUMED_BASIS,
        label: 'core area',
        unit: 'm²',
      });

  const coreArea = areaTraced.value;
  if (coreArea.lte(0)) {
    throw new CoreRefusedError(
      `a core area of ${coreArea.toFixed(2)} m² was entered. A core has an area ` +
        'greater than zero, and a tower with none is not a scheme this engine can draw.',
    );
  }
  if (coreArea.gte(plate)) {
    throw new CoreRefusedError(
      `a core of ${coreArea.toFixed(2)} m² was entered and the tower plate is ` +
        `${plate.toFixed(2)} m². A core cannot be the whole floor. Check the unit — a ` +
        'figure in square feet read as square metres is the usual cause — or raise the plate.',
    );
  }

  const centred = scaleToArea(
    input.plateRing,
    coreArea.times(1_000_000).toDecimalPlaces(0).toNumber(),
  );
  const ring = input.position ? slideTowards(centred, input.plateRing, input.position.edge) : centred;

  const plateShare = tracer.computed('building.core_plate_share', qRatio(coreArea.div(plate)), {
    formula: `${coreArea.toFixed(2)} m² core ÷ ${plate.toFixed(2)} m² tower plate`,
    uses: { core: areaTraced, plate: input.plateAreaM2 },
    unit: 'ratio',
  });

  const placement = input.position
    ? tracer.userSet(
        'building.core_placement',
        `against boundary ${input.position.edge.seq + 1} (${input.position.edge.label}), ` +
          "in the plate's own proportions, slid from the centre until it meets the plate edge",
        { actor: input.position.actor, label: 'where the core stands' },
      )
    : tracer.assumed(
        'building.core_placement',
        "centred on the tower plate, in the plate's own proportions",
        { basis: PLACEMENT_BASIS, label: 'where the core stands' },
      );

  return { areaM2: areaTraced, plateShare, ring, placement };
}

/**
 * The centred core, slid towards a boundary until it meets the tower plate's edge.
 *
 * The direction is the boundary's outward normal — square to the edge the person
 * named, not towards its midpoint, so a core set against a long side stays
 * opposite the same stretch of it. The distance is the largest whole millimetre
 * at which the core is still wholly inside the plate, found by bisection: the
 * plate is convex or rectilinear at Phase 0, so inside-ness only changes once
 * along the slide. The core's size and shape never change, and the result is
 * checked by area as well as by its corners.
 */
function slideTowards(
  core: Ring,
  plate: Ring,
  edge: { readonly start: Pt; readonly end: Pt },
): Ring {
  const ex = edge.end.x - edge.start.x;
  const ey = edge.end.y - edge.start.y;
  const length = Math.hypot(ex, ey);
  if (length === 0) return core;
  let nx = -ey / length;
  let ny = ex / length;
  const cx = core.reduce((sum, p) => sum + p.x, 0) / core.length;
  const cy = core.reduce((sum, p) => sum + p.y, 0) / core.length;
  const mx = (edge.start.x + edge.end.x) / 2;
  const my = (edge.start.y + edge.end.y) / 2;
  if (nx * (mx - cx) + ny * (my - cy) < 0) {
    nx = -nx;
    ny = -ny;
  }
  const moved = (t: number): Ring =>
    core.map((p) => ({ x: asMm(Math.round(p.x + nx * t)), y: asMm(Math.round(p.y + ny * t)) }));
  const coreArea = Number(area(core));
  const fits = (t: number): boolean => {
    const r = moved(t);
    if (!ringContainsRing(plate, r)) return false;
    const inside = intersect(plate, r).reduce((sum, piece) => sum + Number(area(piece)), 0);
    return Math.abs(inside - coreArea) <= 1_000;
  };
  let lo = 0;
  let hi = Math.ceil(Math.abs(nx * (mx - cx) + ny * (my - cy)));
  if (fits(hi)) return moved(hi);
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  return moved(lo);
}

/**
 * What the core says about the two inputs that already account for it.
 *
 * Neither is a compliance check and neither blocks. They are arithmetic a reader
 * cannot do in their head and that nothing else in the system performs: the core
 * is a share of a level, and the saleable efficiency and the parking usable
 * fraction are each a statement about how much of a level is *not* the thing
 * being counted. When the core alone exceeds what one of them leaves, that input
 * cannot hold — before a single corridor, wall, plant room or ramp landing.
 *
 * Returned as sentences rather than as a boolean, because the useful output is
 * the comparison and not a verdict on it.
 */
export function reconcileCore(input: {
  readonly plateShare: Decimal;
  readonly coreAreaM2: Decimal;
  /** Saleable ÷ gross, as the run was given it. */
  readonly saleableEfficiency: Decimal;
  /** The share of a parking level left for bays and aisles. */
  readonly parkingUsableFraction: Decimal;
  /** Gross area of one parking level — the podium footprint. */
  readonly parkingLevelAreaM2: Decimal;
}): readonly string[] {
  const nonSaleable = new Decimal(1).minus(input.saleableEfficiency);
  const deducted = new Decimal(1)
    .minus(input.parkingUsableFraction)
    .times(input.parkingLevelAreaM2);

  return [
    `The core is ${input.plateShare.times(100).toFixed(1)}% of the tower plate, and the ` +
      `saleable figure this run was given leaves ${nonSaleable.times(100).toFixed(1)}% of ` +
      'the gross for everything that does not sell — the core, the corridors, the ' +
      'structure, the plant and the amenity.' +
      (input.plateShare.gt(nonSaleable)
        ? ' The core alone exceeds it, so the two figures cannot both be right. The ' +
          'engine has changed neither of them.'
        : ' The core fits inside it, which is the arithmetic holding.'),

    `A parking level of ${input.parkingLevelAreaM2.toFixed(0)} m² deducts ` +
      `${deducted.toFixed(0)} m² for cores, plant, the ramp landing and circulation that ` +
      `is not drive aisle, and the core is ${input.coreAreaM2.toFixed(0)} m² of that.` +
      (input.coreAreaM2.gt(deducted)
        ? ' The core alone exceeds the deduction, so the bay count does not account for ' +
          'the difference and the core is drawn over bays the layout placed. Raise the ' +
          'deduction or reduce the core.'
        : ' The rest is what the deduction leaves for everything else.'),
  ];
}
