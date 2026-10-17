/**
 * The capacity bands — PRD §15.
 *
 * Principle 6: five distinct capacity concepts, "never merged, never averaged,
 * each with its own derivation and its own field". Phase 0 produces three of
 * them; the other two need a developer objective profile (Phase 1) and a
 * precedent corpus (Phase 2) and are absent from the type entirely rather than
 * present and null.
 *
 * §15.2: "governing = min(A, B, C), always named, always with its binding rule
 * cited. Headroom to the next-binding constraint is reported, because that is
 * what tells a developer where to push."
 *
 * ---
 *
 * **What is deliberately not here.** There is no `realistic`, `expected` or
 * `likely` band, and there is no field for one. §15.3: "absence is enforced by
 * schema — the field does not exist." The reasoning is the strongest paragraph
 * in the PRD and is worth keeping in front of anyone who tries to add it:
 * manufacturing a realism band from an unvalidated heuristic and labelling it
 * "realistic" is "the single most damaging thing this product could do, because
 * it is the number customers will act on and it is the one they cannot check".
 *
 * The honest substitute is `user_realism_discount`: defaults to 1.00, class
 * `USER_SET`, attributed to the person who typed it. The engine never estimates it.
 */

import {
  CapacityBand,
  type BindingConstraint,
  type CapacityResult,
  type Citation,
  Decimal,
  metric,
  type Traced,
  type TracedDecimal,
  type Tracer,
} from '@envelope/core';

/**
 * The rule a band is derived from.
 *
 * Not optional, and that is the point. §13.3 makes "DERIVED value ⟹ a cited rule
 * in its derivation path" a CI-asserted invariant on provenance. A band emitted
 * as DERIVED whose derivation reaches only an anonymous computation would
 * satisfy the type checker, satisfy every test that looked at the number, and
 * quietly break the one property the trust layer rests on — that clicking any
 * figure reaches a clause someone can read.
 */
export interface BandSource {
  readonly ruleId: string;
  readonly citation: Citation;
}

export interface BandsInput {
  readonly tracer: Tracer;
  /**
   * The GFA actually available for the development, after the declared
   * parking-in-FAR treatment has been applied.
   */
  readonly permittedGfaM2: Decimal;
  /** FAR × plot area, before the parking-in-FAR treatment. */
  readonly grossPermittedGfaM2: Decimal;
  /** `FR-DEF-002`. Recorded on Band A so `INV-18` can check the composition. */
  readonly parkingInFar: 'COUNTS_TOWARD_FAR' | 'EXCLUDED_FROM_FAR';
  /**
   * The same treatment as a traced value, so band A's derivation reaches it.
   *
   * Band A's formula already says which way the question went. What it could not
   * say is on whose authority — and a 15–35% swing whose source is a word inside
   * a formula string is a number a reader cannot follow anywhere.
   */
  readonly parkingInFarTraced: Traced<'COUNTS_TOWARD_FAR' | 'EXCLUDED_FROM_FAR'>;
  readonly parkingAreaM2: Decimal;
  readonly farMax: Decimal;
  readonly plotAreaM2: Decimal;
  readonly farRule: BandSource;
  /**
   * The tower plate, traced, so band B's derivation reaches it rather than
   * quoting it in a formula string.
   */
  readonly towerPlate: TracedDecimal;
  /**
   * The levels under the height ceiling that can hold floor area — every storey
   * above grade less the ones given to parking. See {@link traceFloorAreaLevels}.
   *
   * Band B used to be `plate × every storey above grade`, so the ground floor and
   * the podium parking levels were each counted as a tower plate of GFA. On the
   * 3B+G+5P scheme that was 6,400 m² standing on no drawn level, and the units
   * were sold out of it.
   */
  readonly floorAreaLevels: Traced<number>;
  /**
   * Which storeys above grade park — the ground floor or not, and how many podium
   * levels above it — so the height the answer reaches can be stated from the
   * same stack the drawings stand. Its count is the traced value behind
   * `floorAreaLevels`; this is its shape.
   */
  readonly aboveGradeParking: { readonly ground: boolean; readonly podium: number };
  /** Storeys the height ceiling allows above grade — `envelope.max_levels_by_height`. */
  readonly maxLevels: Traced<number>;
  /** The rule that bound the levels: the height rule, or the plan's stated level count where that governs. */
  readonly heightRule: BandSource;
  /** Band B's name when the plan's level count, not a height, bound it. */
  readonly geometricLabel?: string;
  /**
   * The podium footprint and floor-to-floor, carried so this module can state
   * what the answer *achieves* on coverage and height rather than only what the
   * rules permit. Both come from the envelope solver; neither is re-derived.
   *
   * `Traced`, not `Decimal`. The achieved coverage is DERIVED from the podium
   * footprint, and §13.3 makes "a DERIVED value reaches a cited rule" a property
   * of the *graph* — declaring the class without putting the operand in `uses`
   * produces a value that claims a citation it cannot reach. It did, until a
   * test walked the graph and said so.
   */
  readonly podiumFootprint: Traced<Decimal>;
  readonly floorToFloorM: Traced<Decimal>;
  /** Absent when no approved coverage rule applies — the achieved figure is then untraceable to a clause. */
  readonly coverageRule?: BandSource;
  /** Units the parking supply can carry, and the GFA that implies. */
  readonly parkingSupportableUnits: number;
  readonly gfaPerUnitM2: Decimal;
  readonly parkingRule: BandSource;
  /**
   * The parking area band A deducted, traced. Read only where parking counts
   * toward FAR: the FAR the answer reaches then includes it, because FAR is
   * measured on the GFA the declaration says parking is part of.
   */
  readonly parkingArea?: TracedDecimal;
  /** §15.3. Defaults to 1.00. Never computed. */
  readonly realismDiscount: {
    readonly value: Decimal;
    readonly actor: { readonly id: string; readonly name: string };
  };
}

/**
 * Compute bands A, B and C, name the governing one, and report headroom.
 *
 * The governing band is the *smallest*, and naming it is the product: §15.2's
 * point is that "knowing which limit binds is worth more than knowing the
 * maximum — it tells you whether to negotiate, redesign, or accept".
 */
export function computeBands(input: BandsInput): BandsResult {
  const { tracer } = input;

  metric('GFA');
  metric('FAR');

  // --- Band A — regulatory capacity ---------------------------------------
  //
  // The formula string differs by treatment on purpose. A reader of the report
  // must be able to see, without opening the provenance tree, whether parking
  // was taken out of the allowance — that single subtraction is the 15–35% swing
  // `FR-DEF-002` is about, and burying it would make two reports on the same
  // plot look like a disagreement about capacity rather than about a rule.
  const countsTowardFar = input.parkingInFar === 'COUNTS_TOWARD_FAR';
  const bandA = tracer.derived('capacity.regulation_limited_gfa', input.permittedGfaM2, {
    rule: input.farRule,
    formula: countsTowardFar
      ? `FAR ${input.farMax.toString()} × plot area ${input.plotAreaM2.toFixed(2)} m² ` +
        `− parking ${input.parkingAreaM2.toFixed(2)} m² (parking counts toward FAR)`
      : `FAR ${input.farMax.toString()} × plot area ${input.plotAreaM2.toFixed(2)} m² ` +
        `(parking excluded from FAR)`,
    unit: 'm²',
    uses: { parkingInFar: input.parkingInFarTraced },
    detail: {
      band: 'A',
      question: 'What do FAR and the area caps permit?',
      metric: 'GFA',
      parkingInFar: input.parkingInFar,
      grossPermittedGfaM2: input.grossPermittedGfaM2.toFixed(2),
      parkingAreaM2: input.parkingAreaM2.toFixed(2),
    },
  });

  // --- Band B — geometric capacity ----------------------------------------
  //
  // Integer granularity is applied here and reported, never absorbed (§15.4).
  /*
    THE LEVELS THAT HOLD FLOOR AREA, NOT EVERY STOREY UNDER THE CEILING.

    A parking level is a storey: it takes a floor-to-floor of the height the
    ceiling allows and the drawings stack it. It holds no GFA (or, where parking
    counts toward FAR, its own parking area, which band A already deducts). So
    band B is the plate on the storeys left once the parking has stood.

    AND ITS CLASS IS THE WEAKEST OF WHAT IT STANDS ON. `tracer.derived` stamps
    DERIVED whatever it uses, so with no floor count stated — the 45 m ceiling an
    assumption, amber — band B still said DERIVED citing the height rule. The
    same for a podium parking count nobody stated. Where every operand is
    DERIVED it still cites the rule that bound the levels; otherwise it is
    computed, and takes the weaker class with the assumption it rests on.
  */
  const plateM2 = input.towerPlate.value;
  const floorAreaLevels = input.floorAreaLevels.value;
  const bandBValue = plateM2.times(floorAreaLevels);
  const bandBFormula =
    `tower plate ${plateM2.toFixed(2)} m² × ${floorAreaLevels} level(s) of floor area ` +
    `(${input.maxLevels.value} under the height ceiling, less ${input.maxLevels.value - floorAreaLevels} given to parking)`;
  const bandBDetail = {
    band: 'B',
    question: 'What does the envelope physically hold within height and footprint limits?',
  };
  const bandBUses = { plate: input.towerPlate, levels: input.floorAreaLevels };
  const bandB =
    input.towerPlate.provenanceClass === 'DERIVED' && input.floorAreaLevels.provenanceClass === 'DERIVED'
      ? tracer.derived('capacity.geometry_limited_gfa', bandBValue, {
          rule: input.heightRule,
          formula: bandBFormula,
          uses: bandBUses,
          unit: 'm²',
          detail: bandBDetail,
        })
      : tracer.computed('capacity.geometry_limited_gfa', bandBValue, {
          formula: bandBFormula,
          uses: bandBUses,
          unit: 'm²',
          detail: bandBDetail,
        });

  // --- Band C — parking capacity ------------------------------------------
  const bandCValue = input.gfaPerUnitM2.times(input.parkingSupportableUnits);
  const bandC = tracer.derived('capacity.parking_limited_gfa', bandCValue, {
    rule: input.parkingRule,
    formula:
      `${input.parkingSupportableUnits} unit(s) supportable by parking × ` +
      `${input.gfaPerUnitM2.toFixed(2)} m² GFA per unit`,
    unit: 'm²',
    detail: { band: 'C', question: 'What can the achievable parking supply support?' },
  });

  // --- Governing = min(A, B, C) -------------------------------------------
  const entries = [
    { band: CapacityBand.REGULATORY, value: input.permittedGfaM2, traced: bandA, ruleId: input.farRule.ruleId, label: 'FAR ceiling' },
    { band: CapacityBand.GEOMETRIC, value: bandBValue, traced: bandB, ruleId: input.heightRule.ruleId, label: input.geometricLabel ?? 'height ceiling and tower plate' },
    { band: CapacityBand.PARKING, value: bandCValue, traced: bandC, ruleId: input.parkingRule.ruleId, label: 'parking supply' },
  ].sort((a, b) => a.value.comparedTo(b.value));

  const governing = entries[0]!;
  const next = entries[1]!;

  const governingConstraint: BindingConstraint = {
    dimension: 'governing_capacity',
    ruleId: governing.ruleId,
    label: governing.label,
    valueM: governing.value,
    runnerUp: {
      ruleId: next.ruleId,
      label: next.label,
      valueM: next.value,
      withinOnePercent: governing.value.isZero()
        ? false
        : next.value.minus(governing.value).div(governing.value).lte('0.01'),
    },
  };

  // --- Integer granularity — §15.4 ----------------------------------------
  //
  // Capacity is quantized by floors. When the smallest band exceeds what an
  // integer number of floors consumes, the remainder is real lost capacity and
  // is reported rather than smoothed away.
  /*
    AND "REPORTED, NOT ABSORBED" NOW MEANS THE GOVERNING FIGURE IS THE WHOLE
    FLOORS. It used to be the band minimum itself, with the part floor above the
    last whole one named beside it as a loss — and then counted anyway: the
    units were cut from it, the saleable area was taken on it, the FAR the
    answer "reaches" included it, and no drawing placed it. On a 1,280 m² plate
    a remainder of 1,279 m² was 13 units of a building nobody drew.

    So the band minimum is kept where it belongs — naming the governing band,
    and the headroom to the next — and the capacity this run reports is the
    levels it places at the plate it draws. The remainder is
    `integerGranularityLossM2`. Shrinking every plate so one more level fits, or
    drawing a part floor at the top, would recover it; both are design choices
    this engine does not make, and the question is with the client.
  */
  const bandMinimum = governing.value;
  const wholeFloors = plateM2.isZero()
    ? 0
    : Decimal.min(new Decimal(floorAreaLevels), bandMinimum.div(plateM2)).floor().toNumber();
  const levels: Traced<number> = tracer.computed('capacity.levels', wholeFloors, {
    formula:
      `floor(min(${floorAreaLevels} level(s) of floor area, smallest band ` +
      `${bandMinimum.toFixed(2)} m² ÷ tower plate ${plateM2.toFixed(2)} m²))`,
    uses: { a: bandA, b: bandB, c: bandC, floorAreaLevels: input.floorAreaLevels, plate: input.towerPlate },
    unit: 'levels',
  });
  const governingValue = plateM2.times(wholeFloors);
  const integerGranularityLossM2 = Decimal.max(new Decimal(0), bandMinimum.minus(governingValue));

  const governingGfa = tracer.computed('capacity.governing_gfa', governingValue, {
    formula:
      `min(band A, band B, band C) = ${bandMinimum.toFixed(2)} m², in whole levels: ` +
      `${wholeFloors} level(s) × tower plate ${plateM2.toFixed(2)} m²`,
    uses: { a: bandA, b: bandB, c: bandC, levels, plate: input.towerPlate },
    unit: 'm²',
    detail: {
      governingBand: governing.band,
      bindingConstraint: governing.label,
      partFloorNotPlacedM2: integerGranularityLossM2.toFixed(2),
      note:
        'The governing capacity is the smallest of the three, not the maximum, ' +
        'held to the whole levels this run places. Reporting a maximum the plot ' +
        'will never deliver is how a pro forma acquires a number nobody can defend; ' +
        'the part floor above the last whole level is reported as lost, not sold.',
    },
  });

  // --- Realism discount — §15.3, USER_SET, never computed -----------------
  const userRealismDiscount = tracer.userSet(
    'capacity.user_realism_discount',
    input.realismDiscount.value,
    {
      actor: input.realismDiscount.actor,
      label: 'realism discount',
      unit: 'ratio',
    },
  );

  const headroom = next.value.minus(governing.value);

  // --- What the answer achieves against the three headline caps ------------
  //
  // Every one of these is the *emitted* answer expressed in the unit the rule
  // speaks, which is the only form the independent validator can check. They
  // are derived from values already traced above, so each carries a derivation
  // reaching the same clause the corresponding cap came from (§13.3).

  const permittedFar = tracer.derived('capacity.permitted_far', input.farMax, {
    rule: input.farRule,
    formula: 'FAR cap from the governing rule',
    unit: 'ratio',
    detail: { metric: 'FAR' },
  });

  /*
    WHERE PARKING COUNTS TOWARD FAR, THE FAR REACHED COUNTS IT TOO. Band A takes
    the parking area out of the allowance so the floors can be measured against
    what is left; the FAR the scheme reaches is the floors AND the parking over
    the plot, or the declaration and the figure disagree about what GFA is.
  */
  const parkingInGfa = countsTowardFar && input.parkingArea ? input.parkingArea : undefined;
  const farGfa = parkingInGfa ? governingValue.plus(parkingInGfa.value) : governingValue;
  const achievedFarValue = input.plotAreaM2.isZero() ? new Decimal(0) : farGfa.div(input.plotAreaM2);
  const achievedFar = tracer.computed('capacity.achieved_far', achievedFarValue, {
    formula: parkingInGfa
      ? `(governing GFA ${governingValue.toFixed(2)} m² + parking ${parkingInGfa.value.toFixed(2)} m², ` +
        `which counts toward FAR) ÷ plot area ${input.plotAreaM2.toFixed(2)} m²`
      : `governing GFA ${governingValue.toFixed(2)} m² ÷ plot area ${input.plotAreaM2.toFixed(2)} m²`,
    uses: parkingInGfa
      ? { governing: governingGfa, parking: parkingInGfa, permitted: permittedFar }
      : { governing: governingGfa, permitted: permittedFar },
    unit: 'ratio',
    detail: {
      metric: 'FAR',
      note:
        'The FAR this answer reaches, not the FAR the code permits. The gap between ' +
        'the two is the headroom §15.2 asks the report to name.',
    },
  });

  const podiumM2 = input.podiumFootprint.value;
  const achievedCoverageValue = input.plotAreaM2.isZero()
    ? new Decimal(0)
    : podiumM2.div(input.plotAreaM2).times(100);
  const achievedCoveragePct = tracer.computed(
    'capacity.achieved_coverage_pct',
    achievedCoverageValue,
    {
      formula:
        `podium footprint ${podiumM2.toFixed(2)} m² ÷ plot area ` +
        `${input.plotAreaM2.toFixed(2)} m² × 100`,
      // The podium footprint, by name. It is itself DERIVED from the coverage
      // and setback rules, so the path from here reaches a clause — which is
      // what makes the DERIVED class below true rather than merely declared.
      uses: { podium: input.podiumFootprint },
      unit: 'percent',
      provenanceClass: 'DERIVED',
      detail: {
        metric: 'PLOT_COVERAGE',
        ...(input.coverageRule ? { governingRule: input.coverageRule.ruleId } : {}),
      },
    },
  );

  /*
    ONE HEIGHT: THE TOP OF THE HIGHEST LEVEL THE RUN PLACES, FROM GRADE.

    This was the answer's own levels × floor-to-floor, which left out the ground
    floor and the podium parking the drawings stand under them — 25.6 m on the
    cover of a building whose section tops out at 38.4 m. The stack is counted
    the way the model stacks it: the parking at grade and in the podium, then the
    answer's levels on the storeys that do not park, from the bottom up. A
    storey that is not placed but stands under one that is (a shop floor under
    podium parking) is counted, because the building stands on it.

    Not DERIVED by fiat any more. It is as certain as the levels and the parking
    placement it counts, and an assumed podium makes it amber.
  */
  const storeys = storeysToTop(
    input.maxLevels.value,
    input.aboveGradeParking.ground,
    input.aboveGradeParking.podium,
    wholeFloors,
  );
  const parkingStoreys = (input.aboveGradeParking.ground ? 1 : 0) + input.aboveGradeParking.podium;
  const levelsAboveGround = tracer.computed('capacity.levels_above_ground', new Decimal(storeys), {
    formula:
      `${storeys} storey(s) from grade to the top of the highest level placed: ` +
      `${parkingStoreys} parking at or above grade, ${wholeFloors} of floor area` +
      (storeys > parkingStoreys + wholeFloors
        ? `, and ${storeys - parkingStoreys - wholeFloors} unplaced under them`
        : ''),
    uses: { levels, floorAreaLevels: input.floorAreaLevels, maxLevels: input.maxLevels },
    unit: 'levels',
    detail: {
      note:
        'The storeys the building the drawings stand has above grade, against the level ' +
        'count the affection plan states.',
    },
  });
  const achievedHeightValue = input.floorToFloorM.value.times(storeys);
  const achievedHeightM = tracer.computed('capacity.achieved_height_m', achievedHeightValue, {
    formula:
      `${storeys} storey(s) above grade × floor-to-floor ${input.floorToFloorM.value.toString()} m`,
    uses: { storeys: levelsAboveGround, floorToFloor: input.floorToFloorM },
    unit: 'm',
    detail: {
      note:
        'The top of the highest level this run places, from grade — the parking at and ' +
        'above grade included — and the same figure as the top of the sections. Roof ' +
        'plant, a stair head and parapets are not modelled, so a built scheme stands ' +
        'taller by them.',
    },
  });

  return {
    regulationLimitedGfa: bandA,
    achievedFar,
    achievedCoveragePct,
    achievedHeightM,
    permittedFar,
    geometryLimitedGfa: bandB,
    parkingLimitedGfa: bandC,
    governingBand: governing.band,
    governingGfa,
    governingConstraint,
    headroomToNextM2: headroom,
    nextBindingBand: next.band,
    integerGranularityLossM2,
    userRealismDiscount,
    levels,
    levelsAboveGround,
  };
}

/**
 * Storeys from grade to the top of the highest level the run places.
 *
 * The same stack `building.ts` draws, counted without drawing it: storey `i`
 * (0 = the ground floor) parks if it is the ground floor and the ground floor
 * parks, or if it is one of the podium parking levels P1..Pk; the answer's levels
 * take the storeys that do not park, from the bottom up. Kept as a second,
 * separate count on purpose — INV-11 sets the model's stacked levels against it,
 * and a check of one code path against itself would be no check at all.
 */
export function storeysToTop(
  maxLevels: number,
  groundParks: boolean,
  podiumParking: number,
  answerLevels: number,
): number {
  let top = -1;
  let placed = 0;
  for (let i = 0; i < maxLevels; i += 1) {
    const parks = i === 0 ? groundParks : i <= podiumParking;
    if (parks) top = i;
    else if (placed < answerLevels) {
      placed += 1;
      top = i;
    }
  }
  return top + 1;
}

/**
 * The storeys under the height ceiling that can hold floor area: every storey
 * above grade less the ones given to parking.
 *
 * Traced from the two counts it is the difference of, so a reader who opens
 * band B sees why it is not the plate times the whole ceiling.
 */
export function traceFloorAreaLevels(
  tracer: Tracer,
  maxLevels: Traced<number>,
  aboveGradeParking: Traced<number>,
  /** How the parking is read against the ceiling, where that reading is itself an assumption. */
  reading?: Traced<string>,
): Traced<number> {
  const value = Math.max(0, maxLevels.value - aboveGradeParking.value);
  return tracer.computed('capacity.floor_area_levels', value, {
    formula:
      `${maxLevels.value} storey(s) under the height ceiling − ${aboveGradeParking.value} ` +
      'parking level(s) at or above grade',
    uses: reading ? { maxLevels, parking: aboveGradeParking, reading } : { maxLevels, parking: aboveGradeParking },
    unit: 'levels',
    detail: {
      note:
        'A parking level at or above grade is a storey: it takes a floor-to-floor of the ' +
        'height the ceiling allows and holds no floor area, so the tower plate is counted ' +
        'on the storeys left.',
    },
  });
}

/** What `computeBands` returns: the bands, and the storeys the answer stands. */
export interface BandsResult extends CapacityResult {
  /** Storeys from grade to the top of the highest placed level. Observed against the plan's G+N. */
  readonly levelsAboveGround: TracedDecimal;
}

/**
 * Sentence explaining what the governing band means for the decision.
 *
 * Copy, not decoration: §20.2 says the moment that converts a sceptical
 * architect is the click-through, but the sentence next to the number is what
 * tells a development director whether to negotiate, redesign or accept. Read
 * `.claude/skills/ux-writing/SKILL.md` before changing any of this wording.
 */
export function explainGoverningBand(result: CapacityResult): string {
  const gap = result.headroomToNextM2;
  const pct = result.governingGfa.value.isZero()
    ? new Decimal(0)
    : gap.div(result.governingGfa.value).times(100);

  switch (result.governingBand) {
    case CapacityBand.REGULATORY:
      return (
        `The FAR ceiling limits this plot. The envelope and the parking supply could ` +
        `both carry more — ${gap.toFixed(0)} m² more (${pct.toFixed(1)}%) before the ` +
        `${result.nextBindingBand.toLowerCase()} limit binds. Additional capacity here ` +
        `requires a planning argument, not a design change.`
      );
    case CapacityBand.GEOMETRIC:
      return (
        `The envelope limits this plot: it cannot physically hold the floor area the ` +
        `FAR permits. ${gap.toFixed(0)} m² (${pct.toFixed(1)}%) of permitted area has ` +
        `nowhere to go. A taller or larger plate would recover it, if the height ` +
        `ceiling and plate cap allow.`
      );
    case CapacityBand.PARKING:
      return (
        `Parking limits this plot. The code permits more floor area than the achievable ` +
        `parking supply can serve, by ${gap.toFixed(0)} m² (${pct.toFixed(1)}%). Another ` +
        `basement level, a smaller bay area factor, or a lower-demand unit mix would ` +
        `each move this number.`
      );
    default: {
      const exhaustive: never = result.governingBand;
      throw new Error(`unhandled band: ${String(exhaustive)}`);
    }
  }
}
