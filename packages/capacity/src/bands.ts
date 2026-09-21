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
  readonly parkingAreaM2: Decimal;
  readonly farMax: Decimal;
  readonly plotAreaM2: Decimal;
  readonly farRule: BandSource;
  /** Tower plate × achievable levels — what the envelope physically holds. */
  readonly towerPlateM2: Decimal;
  readonly maxLevels: number;
  readonly heightRule: BandSource;
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
export function computeBands(input: BandsInput): CapacityResult {
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
  const bandBValue = input.towerPlateM2.times(input.maxLevels);
  const bandB = tracer.derived('capacity.geometry_limited_gfa', bandBValue, {
    rule: input.heightRule,
    formula: `tower plate ${input.towerPlateM2.toFixed(2)} m² × ${input.maxLevels} level(s)`,
    unit: 'm²',
    detail: {
      band: 'B',
      question: 'What does the envelope physically hold within height and footprint limits?',
    },
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
    { band: CapacityBand.GEOMETRIC, value: bandBValue, traced: bandB, ruleId: input.heightRule.ruleId, label: 'height ceiling and tower plate' },
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

  const governingGfa = tracer.computed('capacity.governing_gfa', governing.value, {
    formula: 'min(band A, band B, band C)',
    uses: { a: bandA, b: bandB, c: bandC },
    unit: 'm²',
    detail: {
      governingBand: governing.band,
      bindingConstraint: governing.label,
      note:
        'The governing capacity is the smallest of the three, not the maximum. ' +
        'Reporting a maximum the plot will never deliver is how a pro forma ' +
        'acquires a number nobody can defend.',
    },
  });

  // --- Integer granularity — §15.4 ----------------------------------------
  //
  // Capacity is quantized by floors. When the permitted GFA exceeds what an
  // integer number of floors consumes, the remainder is real lost capacity and
  // is reported rather than smoothed away.
  const wholeFloors = input.towerPlateM2.isZero()
    ? 0
    : Decimal.min(
        new Decimal(input.maxLevels),
        governing.value.div(input.towerPlateM2),
      )
        .floor()
        .toNumber();
  const consumed = input.towerPlateM2.times(wholeFloors);
  const integerGranularityLossM2 = Decimal.max(new Decimal(0), governing.value.minus(consumed));

  const levels: Traced<number> = tracer.computed('capacity.levels', wholeFloors, {
    formula: `floor(min(${input.maxLevels}, governing GFA ÷ tower plate))`,
    uses: { governing: governingGfa },
    unit: 'levels',
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

  const achievedFarValue = input.plotAreaM2.isZero()
    ? new Decimal(0)
    : governing.value.div(input.plotAreaM2);
  const achievedFar = tracer.computed('capacity.achieved_far', achievedFarValue, {
    formula: `governing GFA ${governing.value.toFixed(2)} m² ÷ plot area ${input.plotAreaM2.toFixed(2)} m²`,
    uses: { governing: governingGfa, permitted: permittedFar },
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

  const achievedHeightValue = input.floorToFloorM.value.times(wholeFloors);
  const achievedHeightM = tracer.computed('capacity.achieved_height_m', achievedHeightValue, {
    formula: `${wholeFloors} level(s) × floor-to-floor ${input.floorToFloorM.value.toString()} m`,
    uses: { levels, floorToFloor: input.floorToFloorM },
    unit: 'm',
    provenanceClass: 'DERIVED',
    detail: {
      note:
        'Above-ground height of the levels this answer actually places. Podium ' +
        'parking and plant are not modelled at Phase 0, so a real building would ' +
        'stand at least this tall and possibly taller.',
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
  };
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
