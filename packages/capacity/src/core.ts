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
  Decimal,
  metric,
  qArea,
  qRatio,
  type Traced,
  type TracedDecimal,
  type Tracer,
} from '@envelope/core';
import { scaleToArea, type Ring } from '@envelope/geometry';

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
 *
 * ---------------------------------------------------------------------------
 * AND IT HAS SINCE BEEN CORROBORATED, WHICH CHANGES NOTHING HERE.
 *
 * On 2026-10-04 at 32:58 the architect this engine is built for said, unprompted,
 * *«الكور في الغالب من 18 إلى 20% من الـ GFA»* — the core is usually 18 to 20% of
 * the GFA. A constant fraction of every plate is the same fraction of their sum,
 * so his figure and this one are the same quantity, and 0.18 is the low end of his
 * range as well as the middle of the published one.
 *
 * THE FIGURE IS NOT PROMOTED. `DERIVED` in this system means a value reached a
 * cited regulatory instrument; a practitioner agreeing with an assumption produces
 * agreement, not a citation, and `CLAUDE.md` names dressing the one as the other
 * as the most consequential laundering available in this codebase. His answer is a
 * `PracticeStatement` — `STMT-CORE-PLATE-FRACTION-2026-10-04`, `USER_SET` by him,
 * offered from `/api/statements` with a button and never pre-selected. Until
 * somebody presses it this stays what it is: an assumption nobody signed.
 *
 * So what his statement buys is in the basis string below, where a reader can see
 * it, and in `CORE_SHARE_SENSITIVITY`, where 18→20% stops being notional.
 */
const ASSUMED_PLATE_SHARE = '0.18';

/*
  HIS UPPER END IS ALREADY MEASURED, SO NOTHING NEW IS ADDED FOR IT.

  `FR-ASM-001` perturbs every ASSUMED value by ±10% and recomputes; 0.18 × 1.10 is
  0.198, which is within a thousandth of the 0.20 he gave. The register therefore
  already runs his range and already publishes what it does to the answer — which
  is nothing, because a core moves no capacity figure.

  A second constant here, with its own perturbation, would be a parallel
  sensitivity mechanism reporting the same number by a different route: the exact
  shape of drift `pnpm parity` exists to catch between renderers. So the figure is
  stated in the basis string, where a reader meets it, and the arithmetic stays in
  the one place that does it.
*/
const ASSUMED_BASIS =
  'A core of 18% of the tower plate: the middle of the 15–22% a residential ' +
  'tower core takes for lift shafts, the lift lobby, escape stairs and risers, ' +
  'and the lower end of the 18–20% the architect this engine is built for stated ' +
  'on 4 October 2026. His statement is recorded as a practice statement, ' +
  'STMT-CORE-PLATE-FRACTION-2026-10-04, and is offered separately: a named ' +
  'practitioner agreeing with an assumption is agreement and not a citation, so ' +
  'this figure stays ASSUMED until somebody accepts his statement under his name. ' +
  'No clause of the Dubai Building Code states a core area and no developer ' +
  'standard on file gives one, so this is an assumption and not a derivation. ' +
  'At his upper end, 20%, the core is 11.1% larger and the two reconciliations ' +
  'below move with it; no capacity figure moves either way, because a core is ' +
  'inside GFA and outside saleable area and the saleable efficiency this run was ' +
  'given already carries it. Enter the core area to replace it.';

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

  const ring = scaleToArea(
    input.plateRing,
    coreArea.times(1_000_000).toDecimalPlaces(0).toNumber(),
  );

  const plateShare = tracer.computed('building.core_plate_share', qRatio(coreArea.div(plate)), {
    formula: `${coreArea.toFixed(2)} m² core ÷ ${plate.toFixed(2)} m² tower plate`,
    uses: { core: areaTraced, plate: input.plateAreaM2 },
    unit: 'ratio',
  });

  const placement = tracer.assumed(
    'building.core_placement',
    "centred on the tower plate, in the plate's own proportions",
    { basis: PLACEMENT_BASIS, label: 'where the core stands' },
  );

  return { areaM2: areaTraced, plateShare, ring, placement };
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
