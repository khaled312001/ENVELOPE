/**
 * The envelope as volumes.
 *
 * The client asked for "نفس نظام الثلاثي الأبعاد" after being shown Zenerate,
 * and the useful part of that ask is narrow: he reads an envelope off a sheet in
 * minutes, but he cannot quickly *see* what a 60% tower plate on a 100% podium
 * leaves — the step-back, the podium roof, where the tower can sit. That is a
 * volume question and a picture answers it in a second.
 *
 * The trap is that a 3D view is the most persuasive surface in the product. A
 * massing built by the *renderer* would be a building nobody computed, drawn
 * convincingly. So the masses are built here, in the engine, out of traced
 * numbers, and the viewer only extrudes them.
 *
 * **The podium height is the honest problem.** The engine derives the total
 * level count from the height ceiling and the floor-to-floor, and it derives
 * both footprints. It does not derive how many of those levels stand on the
 * podium footprint: the affection plan states that, and a run that was not
 * given one does not know it. So an ungiven podium count is `ASSUMED` with a
 * basis and the podium draws amber — which is exactly what it is.
 *
 * And the count is the **footprint** count, the ground floor included: `G+2P+8`
 * is three here, not two. Writing "the 2 in G+2P+8" in this file's own comments
 * is how the massing came to draw a two-level podium on a sheet saying three.
 * `podiumFootprintLevels` in `@envelope/core` does that arithmetic once so no
 * caller has to remember which of the two numbers a signature means.
 */

import {
  Decimal,
  type Traced,
  type TracedDecimal,
  type Tracer,
} from '@envelope/core';
import type { Pt, Ring } from '@envelope/geometry';

/** One extruded volume. */
export interface Mass {
  readonly id: string;
  readonly label: string;
  /** Footprint in plot coordinates, millimetres. */
  readonly footprint: Ring;
  readonly baseM: TracedDecimal;
  readonly heightM: TracedDecimal;
  readonly levels: Traced<number>;
  /** What the mass is for, in one sentence a reader can check against a number. */
  readonly note: string;
}

export interface MassingInput {
  readonly tracer: Tracer;
  readonly podiumRing: Ring;
  readonly plateRing: Ring;
  readonly floorToFloorM: TracedDecimal;
  readonly maxLevelsByHeight: Traced<number>;
  /**
   * Levels standing on the podium footprint, **the ground floor included**.
   *
   * `USER_SET` when a person entered it; absent means nobody has, and the
   * massing says so rather than picking a number that looks right.
   *
   * `G+2P+8` is `3`. Callers holding a height code should pass
   * `podiumFootprintLevels(schedule)` rather than the podium digit.
   */
  readonly podiumLevels?: {
    readonly value: number;
    readonly actor: { readonly id: string; readonly name: string };
  };
}

export interface MassingResult {
  readonly masses: readonly Mass[];
  /** Total built height, so a caption can state it without re-adding the parts. */
  readonly totalHeightM: TracedDecimal;
  /**
   * Levels the height ceiling permits above the podium.
   *
   * Surfaced rather than left inside, because the height code a reader sees —
   * `2B+G+3P+35` — ends in this number, and re-deriving it at the point of
   * display would be the second place the same subtraction lives.
   */
  readonly towerLevels: Traced<number>;
}

const PODIUM_BASIS =
  'How many levels stand on the podium footprint is stated on the affection plan — ' +
  '"G+2P+8" is three, the ground floor included — and this run was not given a ' +
  'level schedule, so the massing shows a single podium level. It changes the ' +
  'picture and the podium roof level; it changes no capacity figure in this run. ' +
  'Enter the level schedule to replace it.';

/**
 * Build the massing.
 *
 * Two volumes, never one. A single extrusion of the plate to the full height
 * would draw a tower standing on nothing and lose the step-back, which is the
 * only thing in the picture the client cannot get from the numbers.
 */
export function buildMassing(input: MassingInput): MassingResult {
  const { tracer } = input;
  const f2f = input.floorToFloorM;
  const total = input.maxLevelsByHeight;

  const podiumLevelsValue = Math.max(
    0,
    Math.min(input.podiumLevels?.value ?? 1, total.value),
  );
  const podiumLevels =
    input.podiumLevels === undefined
      ? tracer.assumed('massing.podium_levels', podiumLevelsValue, {
          basis: PODIUM_BASIS,
          unit: 'levels',
        })
      : tracer.userSet('massing.podium_levels', podiumLevelsValue, {
          actor: input.podiumLevels.actor,
          label: 'podium levels',
          unit: 'levels',
        });

  const podiumHeightValue = f2f.value.times(podiumLevelsValue).toDecimalPlaces(3);
  const podiumHeight = tracer.computed('massing.podium_height_m', podiumHeightValue, {
    formula: `${podiumLevelsValue} podium level(s) × ${f2f.value.toString()} m floor to floor`,
    uses: { levels: podiumLevels, f2f },
    unit: 'm',
  });

  const towerLevelsValue = Math.max(0, total.value - podiumLevelsValue);
  const towerLevels = tracer.computed('massing.tower_levels', towerLevelsValue, {
    formula: `${total.value} level(s) permitted by height − ${podiumLevelsValue} podium level(s)`,
    uses: { total, podium: podiumLevels },
    unit: 'levels',
  });

  const towerHeightValue = f2f.value.times(towerLevelsValue).toDecimalPlaces(3);
  const towerHeight = tracer.computed('massing.tower_height_m', towerHeightValue, {
    formula: `${towerLevelsValue} tower level(s) × ${f2f.value.toString()} m floor to floor`,
    uses: { levels: towerLevels, f2f },
    unit: 'm',
  });

  const zero = tracer.computed('massing.ground_level_m', new Decimal(0), {
    formula: 'ground level datum',
    uses: {},
    unit: 'm',
  });

  const masses: Mass[] = [
    {
      id: 'podium',
      label: 'Podium',
      footprint: input.podiumRing,
      baseM: zero,
      heightM: podiumHeight,
      levels: podiumLevels,
      note:
        'The footprint left once every boundary setback is applied, capped by the ' +
        'coverage rule where one governs.',
    },
  ];

  if (towerLevelsValue > 0) {
    masses.push({
      id: 'tower',
      label: 'Tower',
      footprint: input.plateRing,
      baseM: podiumHeight,
      heightM: towerHeight,
      levels: towerLevels,
      note:
        'The tower plate cap, sitting on the podium roof. Its position on that ' +
        'roof is not decided by this engine — only its area and the height it ' +
        'may reach are.',
    });
  }

  const totalHeight = tracer.computed(
    'massing.total_height_m',
    podiumHeightValue.plus(towerHeightValue),
    {
      formula: `${podiumHeightValue.toString()} m podium + ${towerHeightValue.toString()} m tower`,
      uses: { podium: podiumHeight, tower: towerHeight },
      unit: 'm',
    },
  );

  return { masses, totalHeightM: totalHeight, towerLevels };
}

/** Metres, for a consumer that draws rather than computes. */
export function ringToMetres(ring: Ring): readonly (readonly [number, number])[] {
  return ring.map((p: Pt) => [Number(p.x) / 1000, Number(p.y) / 1000] as const);
}
