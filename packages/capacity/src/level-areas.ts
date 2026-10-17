/**
 * The level schedule the run reports — what each level of the drawn building
 * counts, in GFA and in height.
 *
 * ---------------------------------------------------------------------------
 * WHY IT EXISTS, AND WHY IT IS NOT THE SYNTHESIS THE CHECKS REFUSED.
 *
 * INV-01 (Σ level GFA = total), INV-11 (Σ level heights = height ≤ ceiling) and
 * INV-18 (parking in GFA as declared) read a per-level schedule. For as long as
 * the engine produced none, `apps/api/src/checks.ts` left them DORMANT, and said
 * why: a schedule written there from the level count and the plate would be the
 * engine checked against its own arithmetic, a pass with nothing behind it.
 *
 * That premise stopped being true when the engine began to stack the building
 * (`building.ts`): every level, at its elevation, parking or not, placed or not.
 * The capacity figure is computed by a separate path (`bands.ts`: whole levels ×
 * plate, under a ceiling less the parking). So the two can now disagree, and did
 * — the 3B+G+5P scheme reported 17,920 m² while its drawn levels held 11,520 —
 * which is precisely what INV-01 exists to catch.
 *
 * This module reads the MODEL's levels and attaches to each the figure the run
 * counts on it. It decides nothing: which levels are placed, which park and how
 * high each stands are the model's; what one placed level of floor area counts
 * is the tower plate, because that is what the capacity was computed from (the
 * GFA statement says so, and what a real podium or ground floor holds is NOT
 * ASSESSED there). The adapter then maps these records with no arithmetic.
 */

import {
  type BuildingModel,
  LevelUse,
  type TracedDecimal,
  type Tracer,
} from '@envelope/core';

export interface LevelArea {
  /** The model's level id — `B2`, `G`, `P1`, `L03`. */
  readonly levelId: string;
  readonly use: LevelUse;
  /** Whether the run places this level (or parks on it), as the model says. */
  readonly placed: boolean;
  /** Below grade or not, read off the model's elevation. */
  readonly aboveGround: boolean;
  /**
   * Whether the level is part of the building's height: at or above grade, and
   * under the top of the highest placed level. A shop floor nobody counts that
   * stands under podium parking is part of the height; a permitted level above
   * the last placed one is not.
   */
  readonly standsInHeight: boolean;
  /** Floor to floor, the figure the model stacks the level at. */
  readonly heightM: TracedDecimal;
  /** What the level counts toward GFA, or null where it counts nothing. */
  readonly gfaM2: TracedDecimal | null;
  /** Whether `gfaM2` is inside the reported total GFA. */
  readonly countedInGfa: boolean;
}

export interface LevelAreasInput {
  readonly tracer: Tracer;
  readonly building: BuildingModel;
  /** One placed level of floor area counts one plate — the capacity's own model. */
  readonly towerPlate: TracedDecimal;
  readonly floorToFloorM: TracedDecimal;
  readonly parkingInFar: 'COUNTS_TOWARD_FAR' | 'EXCLUDED_FROM_FAR';
  /** The parking area band A deducted; counted on the parking levels when parking counts. */
  readonly parkingArea: TracedDecimal;
}

const isParking = (use: LevelUse): boolean =>
  use === LevelUse.BASEMENT_PARKING || use === LevelUse.PODIUM_PARKING;

/** Each level of the model with what the run counts on it. */
export function levelAreasOf(input: LevelAreasInput): readonly LevelArea[] {
  const { tracer, building } = input;
  const counts = input.parkingInFar === 'COUNTS_TOWARD_FAR';
  const parking = building.levels.filter((l) => isParking(l.use));

  /*
    WHERE PARKING COUNTS TOWARD FAR, ITS AREA IS SPREAD OVER THE PARKING LEVELS,
    AND THE FORMULA SAYS SO. The parking area is one figure for the scheme (bays ×
    the bay area factor), not a figure per level; the engine states no per-level
    parking area. An even share is the only split that adds back to the figure
    band A deducted, and it is named as a share rather than presented as a
    measurement.
  */
  const parkingShare =
    counts && parking.length > 0
      ? tracer.computed(
          'capacity.parking_gfa_per_level_m2',
          input.parkingArea.value.div(parking.length),
          {
            formula:
              `parking area ${input.parkingArea.value.toFixed(2)} m² ÷ ${parking.length} parking level(s) — ` +
              'an even share of the scheme-wide figure, not a measured area per level',
            uses: { parking: input.parkingArea },
            unit: 'm²',
          },
        )
      : null;

  const aboveGrade = building.levels.filter((l) => l.placed && l.elevationMm >= 0);
  const top = aboveGrade.reduce((t, l) => Math.max(t, l.elevationMm + l.heightMm), 0);

  return building.levels.map((l) => {
    const parks = isParking(l.use);
    const gfaM2 = parks ? parkingShare : l.placed ? input.towerPlate : null;
    return {
      levelId: l.id,
      use: l.use,
      placed: l.placed,
      aboveGround: l.elevationMm >= 0,
      standsInHeight: l.elevationMm >= 0 && l.elevationMm < top,
      heightM: input.floorToFloorM,
      gfaM2,
      countedInGfa: gfaM2 !== null && (parks ? counts : true),
    };
  });
}
