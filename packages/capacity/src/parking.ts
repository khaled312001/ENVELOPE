/**
 * The parking model — `FR-PRK-001`.
 *
 * demand → bay area factor → required area → levels → headroom → supportable
 * unit ceiling. The last of those is what makes parking a *capacity* concept
 * rather than a compliance checkbox: on a constrained plot the parking supply,
 * not the FAR, is what decides how many units the plot can carry, and a
 * developer who learns that at planning stage has learned something worth
 * paying for.
 *
 * ---
 *
 * **A gap in the PRD you should know about before reading further.**
 *
 * `FR-PRK-001` requires "per-type ratios → resident bays". Band C, all parking
 * demand, NSA, both efficiency figures and five of the eighteen invariants all
 * depend on a unit mix and per-type unit areas. But §3.2 puts configurations,
 * floor plans and unit packing *out* of Phase 0, `CONFIGURATION` is a Phase 1+
 * entity (§10.2), and **there is no functional requirement, no entity and no
 * input field for unit mix anywhere in the PRD.**
 *
 * So the mix has to come from somewhere, and there are only two honest options:
 * the user declares it (`USER_SET`), or the engine assumes it (`ASSUMED`, with a
 * basis and a sensitivity, amber everywhere). Both are implemented. What is not
 * implemented is a silent default, because a silently assumed unit mix would
 * propagate into the parking band, the efficiency figures and five invariants
 * without ever appearing on screen. See open-questions.md Q20.
 */

import {
  Decimal,
  metric,
  type ParkingResult,
  type Traced,
  type TracedDecimal,
  type Tracer,
  type UnitTypeMix,
} from '@envelope/core';
import {
  resolveParameter,
  ResolutionStatus,
  SHEET_PARKING_FN,
  type EvalContext,
  type Resolution,
  type RuleRecord,
} from '@envelope/rules';

export interface ParkingInput {
  readonly rules: readonly RuleRecord[];
  readonly tracer: Tracer;
  readonly context: EvalContext;
  /** Where the unit mix came from. There is no third option. */
  readonly mix: {
    readonly source: 'USER_SET' | 'ASSUMED';
    readonly entries: readonly UnitTypeMix[];
    /** Required when `source === 'ASSUMED'`. Why this mix and not another. */
    readonly basis?: string;
    readonly actor?: { readonly id: string; readonly name: string };
  };
  /** Total units the envelope could hold, before parking is considered. */
  readonly targetUnits: number;
  /**
   * Saleable area ÷ GFA, as the run resolved it. Optional and additive (17 Oct
   * 2026): it puts each unit type's share of GFA — its saleable area ÷ this — into
   * the demand context, because an affection plan's parking rule is set by a
   * dwelling's AREA ("one bay for each unit ≤ 150 m² GFA"), not by its bedrooms.
   * Absent, only the saleable area is there, and a rule that needs GFA says so.
   */
  readonly saleableEfficiency?: Traced<Decimal>;
  /** Gross area available per parking level, m². Usually the podium footprint. */
  readonly areaPerLevelM2: Decimal;
  /** Levels of parking the scheme can physically provide (basement + podium). */
  readonly levelsAvailable: number;
  /** Fraction of a parking level that is actually usable for bays and aisles. */
  readonly usableFraction: UsableFractionInput;
  /**
   * The same fraction, already traced by the caller. The level plan reads the
   * fraction before the supply is counted, and one fraction must be one node:
   * two declarations of it is how a drawing and a table come to disagree.
   */
  readonly usableTraced?: TracedDecimal;
  /**
   * Bays the layout actually drew on one parking level. When present, supply is
   * COUNTED — drawn bays × parking levels — rather than divided out of an area
   * by an assumed factor. A bay count that cannot be laid out is not a bay count.
   */
  readonly laidOut?: {
    readonly baysPerLevel: Traced<number>;
    /**
     * The ground floor's own count, where it parks and differs: the drive from
     * the entrance and the substation on the road stand on it (`grade.ts`).
     * Counted once, in place of one of the levels at `baysPerLevel`.
     */
    readonly groundBays?: Traced<number>;
    /**
     * Which level `groundBays` is, in words: the ground floor, or the first
     * basement where the ground floor does not park and the accessible bays stand
     * on the first level below it. The ground floor when absent.
     */
    readonly firstLevel?: string;
  };
}

export interface UsableFractionInput {
  readonly value: Decimal;
  readonly source: 'DERIVED' | 'ASSUMED';
  readonly basis?: string;
}

/** The usable fraction of a parking level, traced once for every consumer. */
export function traceUsableFraction(tracer: Tracer, usable: UsableFractionInput): TracedDecimal {
  return usable.source === 'DERIVED'
    ? tracer.computed('parking.usable_fraction', usable.value, {
        formula: 'usable fraction of a parking level',
        uses: {},
        unit: 'ratio',
        provenanceClass: 'DERIVED',
      })
    : tracer.assumed('parking.usable_fraction', usable.value, {
        basis:
          usable.basis ??
          'the fraction of a parking level available for bays and aisles after ' +
            'cores, ramps and plant. Not governed by a cited rule.',
        unit: 'ratio',
      });
}

export class ParkingHaltedError extends Error {
  override readonly name = 'ParkingHaltedError';
  constructor(message: string) {
    super(message);
  }
}

const num = (r: Resolution | undefined): Decimal | undefined => {
  if (!r || r.status !== ResolutionStatus.RESOLVED) return undefined;
  const v = r.governing?.value;
  return v && v.kind === 'scalar' ? v.value : undefined;
};

/**
 * Compute the parking chain.
 *
 * Every intermediate is traced, because the interesting question a developer
 * asks here is never "how many bays" — it is "which of these numbers do I have
 * to argue with the authority about", and that is only answerable if each step
 * carries its own provenance.
 */
export function solveParking(input: ParkingInput): ParkingResult {
  const { rules, tracer, context, mix } = input;

  metric('PARKING_AREA');
  metric('BAY_AREA_FACTOR');

  if (mix.source === 'ASSUMED' && !mix.basis) {
    throw new ParkingHaltedError(
      'an ASSUMED unit mix requires a basis. If you cannot write down why this mix ' +
        'and not another, you do not have an assumption — you have a guess, and a ' +
        'guess must not reach the assumption register.',
    );
  }
  if (mix.entries.length === 0) {
    throw new ParkingHaltedError(
      'no unit mix supplied. Parking demand, Band C, NSA and five invariants all ' +
        'depend on it, and the PRD defines no input for it (open-questions.md Q20). ' +
        'It must be declared by the user or assumed with a basis — never defaulted.',
    );
  }

  const shareTotal = mix.entries.reduce((s, e) => s.plus(e.share), new Decimal(0));
  if (shareTotal.minus(1).abs().gt('0.001')) {
    throw new ParkingHaltedError(
      `unit mix shares sum to ${shareTotal.toString()}, not 1.000. INV-05 would ` +
        `reject any configuration built on this mix, so it is refused here rather ` +
        `than carried forward.`,
    );
  }

  // --- Unit counts by type -------------------------------------------------
  const counts = mix.entries.map((e) => ({
    ...e,
    count: e.share.times(input.targetUnits).toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN).toNumber(),
  }));

  const mixTraced: Traced<readonly typeof counts[number][]> =
    mix.source === 'USER_SET'
      ? tracer.userSet('parking.unit_mix', counts, {
          actor: mix.actor ?? { id: 'unknown', name: 'unnamed user' },
          label: 'unit mix',
        })
      : tracer.assumed('parking.unit_mix', counts, {
          basis: mix.basis!,
          label: 'unit mix',
          detail: {
            warning:
              'Phase 0 does not generate a unit schedule. This mix is an assumption ' +
              'and every parking figure below inherits its uncertainty.',
          },
        });

  // --- Resident bays -------------------------------------------------------
  /*
    Each type's area travels with its count: Table B.13 reads only the type, and
    the plot's own sheet reads the area (`rules/instruments/sheet.ts`). Strings,
    because the context is data and a Decimal is the engine's number type.
  */
  const efficiency = input.saleableEfficiency?.value;
  const demandCtx: EvalContext = {
    ...context,
    unit: {
      mix: counts.map((c) => ({
        typeId: c.typeId,
        count: c.count,
        nsa_m2: c.nsaM2.toString(),
        ...(efficiency && efficiency.gt(0) ? { gfa_m2: c.nsaM2.div(efficiency).toDecimalPlaces(4).toString() } : {}),
      })),
    },
  };
  const demandRes = resolveParameter('parking.demand', rules, demandCtx);
  const residentBaysValue = num(demandRes);
  if (residentBaysValue === undefined || !demandRes.governing) {
    throw new ParkingHaltedError(
      'no approved rule governs parking.demand. The engine does not invent a parking ' +
        'ratio — a wrong ratio moves the governing capacity band without anyone noticing.',
    );
  }
  /* A rule set by the dwelling's share of GFA reads the saleable share too, so the bays name it. */
  const readsGfaShare =
    demandRes.governing.rule.evaluatorArgs['fn'] === SHEET_PARKING_FN && input.saleableEfficiency !== undefined;
  const residentBays = tracer.derived('parking.resident_bays', residentBaysValue, {
    rule: {
      ruleId: demandRes.governing.rule.ruleId,
      citation: demandRes.governing.rule.citation,
    },
    formula: readsGfaShare
      ? counts
          .map((c) => `${c.count} × ${c.label} (${c.nsaM2.toString()} m² saleable ÷ ${efficiency!.toString()})`)
          .join(' + ') + ', bays by the sheet’s area threshold'
      : counts.map((c) => `${c.count} × ${c.label}`).join(' + '),
    uses: readsGfaShare ? { mix: mixTraced, efficiency: input.saleableEfficiency! } : { mix: mixTraced },
    unit: 'bays',
  });

  // --- Visitor bays --------------------------------------------------------
  const visitorRes = resolveParameter('parking.visitor_fraction', rules, demandCtx);
  const visitorFraction = num(visitorRes);
  const visitorValue = visitorFraction
    ? residentBaysValue.times(visitorFraction).ceil()
    : new Decimal(0);
  const visitorBays = visitorFraction
    ? tracer.derived('parking.visitor_bays', visitorValue, {
        rule: {
          ruleId: visitorRes.governing!.rule.ruleId,
          citation: visitorRes.governing!.rule.citation,
        },
        formula: `ceil(${residentBaysValue.toString()} resident bays × ${visitorFraction.toString()})`,
        uses: { resident: residentBays },
        unit: 'bays',
      })
    : tracer.assumed('parking.visitor_bays', visitorValue, {
        basis:
          'no visitor-parking rule applies, so no visitor bays are added. If a ' +
          'requirement exists and has not been encoded, the demand below is understated.',
        unit: 'bays',
      });

  // The visitor ratio the answer actually achieves, against the ratio the rule
  // requires. Without it `parking.visitor_fraction` reaches the independent
  // validator with NO_OBSERVATION — declared unchecked rather than checked, on
  // a parameter the engine plainly did compute.
  const achievedVisitorValue = residentBaysValue.isZero()
    ? new Decimal(0)
    : visitorValue.div(residentBaysValue);
  const achievedVisitorFraction = tracer.computed(
    'parking.achieved_visitor_fraction',
    achievedVisitorValue,
    {
      formula: `${visitorValue.toString()} visitor bays ÷ ${residentBaysValue.toString()} resident bays`,
      uses: { visitor: visitorBays, resident: residentBays },
      unit: 'ratio',
      provenanceClass: 'DERIVED',
      detail: {
        note:
          'At or above the required fraction: above it whenever the bay count is ' +
          'rounded up to a whole bay.',
      },
    },
  );

  const totalBaysValue = residentBaysValue.plus(visitorValue).ceil().toNumber();
  const totalBays = tracer.computed('parking.total_bays', totalBaysValue, {
    formula: 'ceil(resident bays + visitor bays)',
    uses: { resident: residentBays, visitor: visitorBays },
    unit: 'bays',
  });

  // --- Supply per level ----------------------------------------------------
  const usable = input.usableFraction;
  const usableTraced = input.usableTraced ?? traceUsableFraction(tracer, usable);

  const availablePerLevelValue = input.areaPerLevelM2.times(usableTraced.value);
  const availableAreaPerLevel = tracer.computed(
    'parking.available_area_per_level_m2',
    availablePerLevelValue,
    {
      formula: `${input.areaPerLevelM2.toFixed(2)} m² × ${usableTraced.value.toString()} usable`,
      uses: { usable: usableTraced },
      unit: 'm²',
    },
  );

  /*
    THE LAID-OUT LEVEL, when there is one. Its bays were placed one by one to
    Table B.11 and every one is reachable, so it is the supply; the area factor
    is what it measures, not what it is told.
  */
  const laid = input.laidOut;
  const measured = laid !== undefined && laid.baysPerLevel.value > 0 ? laid : undefined;

  // --- Bay area factor -----------------------------------------------------
  const factorRes = resolveParameter('parking.bay_area_factor', rules, demandCtx);
  const factorValue = num(factorRes);
  const bayAreaFactor = factorValue
    ? tracer.derived('parking.bay_area_factor', factorValue, {
        rule: {
          ruleId: factorRes.governing!.rule.ruleId,
          citation: factorRes.governing!.rule.citation,
        },
        formula: 'bay area factor from the governing rule',
        unit: 'm²/bay',
        detail: { metric: metric('BAY_AREA_FACTOR').metricId },
      })
    : measured
      ? tracer.computed(
          'parking.bay_area_factor',
          // Rounded DOWN, so drawn bays × factor never exceeds the area they stand in.
          availablePerLevelValue.div(measured.baysPerLevel.value).toDecimalPlaces(4, Decimal.ROUND_DOWN),
          {
            formula:
              `${availablePerLevelValue.toFixed(2)} m² usable per level ÷ ` +
              `${measured.baysPerLevel.value} bays laid out on it`,
            uses: { perLevel: availableAreaPerLevel, bays: measured.baysPerLevel },
            unit: 'm²/bay',
            detail: {
              metric: metric('BAY_AREA_FACTOR').metricId,
              note:
                'Measured on the drawn level, not assumed. No cited rule fixes the area a ' +
                'bay consumes, and the 28–35 m²/bay rule of thumb this replaced disagreed ' +
                'with the layout the same run draws.',
            },
          },
        )
      : tracer.assumed('parking.bay_area_factor', new Decimal('32'), {
        basis:
          'no cited rule fixes the gross area consumed per bay. 32 m²/bay is the ' +
          'mid-point of the 28–35 m²/bay range typical of a structured basement, ' +
          'and it is ranked in the assumption register because the parking band ' +
          'moves roughly in proportion to it.',
        unit: 'm²/bay',
        detail: { metric: metric('BAY_AREA_FACTOR').metricId, range: '28–35 m²/bay' },
      });

  const factor = bayAreaFactor.value;
  const requiredAreaValue = new Decimal(totalBaysValue).times(factor);
  const requiredArea = tracer.computed('parking.required_area_m2', requiredAreaValue, {
    formula: `${totalBaysValue} bays × ${factor.toString()} m²/bay`,
    uses: { bays: totalBays, factor: bayAreaFactor },
    unit: 'm²',
    detail: { metric: metric('PARKING_AREA').metricId },
  });

  // --- Levels required -----------------------------------------------------
  // The ground floor counts first where it has its own count: it is the level the street reaches.
  const ground = measured?.groundBays;
  const levelsRequiredValue = measured
    ? ground
      ? totalBaysValue <= ground.value
        ? 1
        : 1 + Math.ceil((totalBaysValue - ground.value) / measured.baysPerLevel.value)
      : Math.ceil(totalBaysValue / measured.baysPerLevel.value)
    : availablePerLevelValue.isZero()
      ? 0
      : requiredAreaValue.div(availablePerLevelValue).ceil().toNumber();
  const levelsRequired = measured
    ? ground
      ? tracer.computed('parking.levels_required', levelsRequiredValue, {
          formula:
            `${measured.firstLevel ?? 'the ground floor'}'s ${ground.value} bays, then ceil(${Math.max(0, totalBaysValue - ground.value)} ` +
            `bays still required ÷ ${measured.baysPerLevel.value} bays per level): ${levelsRequiredValue} level(s)`,
          uses: { required: totalBays, perLevel: measured.baysPerLevel, ground },
          unit: 'levels',
        })
      : tracer.computed('parking.levels_required', levelsRequiredValue, {
          formula: `ceil(${totalBaysValue} bays required ÷ ${measured.baysPerLevel.value} bays laid out per level)`,
          uses: { required: totalBays, perLevel: measured.baysPerLevel },
          unit: 'levels',
        })
    : tracer.computed('parking.levels_required', levelsRequiredValue, {
        formula: `ceil(${requiredAreaValue.toFixed(2)} m² ÷ ${availablePerLevelValue.toFixed(2)} m² per level)`,
        uses: { required: requiredArea, perLevel: availableAreaPerLevel },
        unit: 'levels',
      });

  const levelsAvailable = tracer.userSet('parking.levels_available', input.levelsAvailable, {
    actor: mix.actor ?? { id: 'unknown', name: 'unnamed user' },
    label: 'parking levels available',
    unit: 'levels',
  });

  // --- Supply, headroom and the supportable unit ceiling -------------------
  const availableAreaValue = availablePerLevelValue.times(input.levelsAvailable);
  const availableArea = tracer.computed('parking.available_area_m2', availableAreaValue, {
    formula: `${availablePerLevelValue.toFixed(2)} m² per level × ${input.levelsAvailable} level(s)`,
    uses: { perLevel: availableAreaPerLevel, levels: levelsAvailable },
    unit: 'm²',
    detail: { metric: metric('PARKING_AREA').metricId },
  });

  const groundLaid = laid?.groundBays !== undefined && input.levelsAvailable > 0 ? laid.groundBays : undefined;
  const suppliedBays = laid
    ? groundLaid
      ? new Decimal(laid.baysPerLevel.value).times(input.levelsAvailable - 1).plus(groundLaid.value)
      : new Decimal(laid.baysPerLevel.value).times(input.levelsAvailable)
    : availableAreaValue.div(factor).floor();
  const providedBays = laid
    ? tracer.computed('parking.provided_bays', suppliedBays.toNumber(), {
        formula: groundLaid
          ? `${groundLaid.value} bays on ${laid.firstLevel ?? 'the ground floor'} + ${laid.baysPerLevel.value} bays laid out per ` +
            `level × ${input.levelsAvailable - 1} other parking level(s)`
          : `${laid.baysPerLevel.value} bays laid out per level × ${input.levelsAvailable} parking level(s)`,
        uses: { perLevel: laid.baysPerLevel, levels: levelsAvailable, ...(groundLaid ? { ground: groundLaid } : {}) },
        unit: 'bays',
        detail: {
          note:
            'Counted on the drawn level, not divided out of an area: every bay is placed ' +
            'to Table B.11 and reachable from the way in. The same layout on every ' +
            'parking level, less what the drive from the entrance and the substation take ' +
            'on the ground floor and what the access aisles of the accessible bays take on ' +
            'the level the street reaches. When this is below the required count the scheme does not ' +
            'park itself, and Band C is what that costs.',
        },
      })
    : tracer.computed('parking.provided_bays', suppliedBays.toNumber(), {
        formula: `floor(${availableAreaValue.toFixed(2)} m² available ÷ ${factor.toString()} m²/bay)`,
        uses: { area: availableArea, factor: bayAreaFactor },
        unit: 'bays',
        detail: {
          note:
            'No level could be laid out, so this is an ESTIMATE: area divided by a ' +
            'factor, not bays placed. Supply, not demand. When this is below the ' +
            'required count the scheme does not park itself, and Band C is what that costs.',
        },
      });

  const headroomBays = suppliedBays.minus(totalBaysValue);

  // Bays consumed by one "average" unit under this mix. This is what converts a
  // parking supply into a unit ceiling, and it is the number Band C rests on.
  const baysPerUnitValue = new Decimal(residentBaysValue.plus(visitorValue)).div(
    Math.max(1, input.targetUnits),
  );
  const baysPerUnit = tracer.computed('parking.bays_per_unit', baysPerUnitValue, {
    formula: `${residentBaysValue.plus(visitorValue).toString()} bays ÷ ${Math.max(1, input.targetUnits)} unit(s)`,
    uses: { total: totalBays, mix: mixTraced },
    unit: 'bays/unit',
    detail: {
      note:
        'The mix-weighted parking load of one unit. Band C is a bay count divided ' +
        'by this, so an error here scales the whole parking band.',
    },
  });
  const supportableUnitsValue = baysPerUnitValue.isZero()
    ? input.targetUnits
    : suppliedBays.div(baysPerUnitValue).floor().toNumber();

  const supportableUnitCeiling = tracer.computed(
    'parking.supportable_unit_ceiling',
    supportableUnitsValue,
    {
      formula:
        `floor(${suppliedBays.toString()} bays supplied ÷ ${baysPerUnitValue.toFixed(4)} bays per unit)`,
      uses: { bays: providedBays, perUnit: baysPerUnit, levels: levelsAvailable },
      unit: 'units',
      detail: {
        note:
          'This is the ceiling parking imposes on unit count, independent of FAR. ' +
          'When it is the smallest of the three bands, parking — not the code — is ' +
          'what limits this plot.',
      },
    },
  );

  const podiumImplication =
    levelsRequiredValue > input.levelsAvailable
      ? `Parking does not fit: ${levelsRequiredValue} level(s) are needed and ` +
        `${input.levelsAvailable} are available. Either the podium footprint grows, ` +
        `a basement level is added, or the unit count falls to ${supportableUnitsValue}.`
      : `Parking fits in ${levelsRequiredValue} of ${input.levelsAvailable} available ` +
        `level(s), with headroom for ${headroomBays.toString()} further bay(s).`;

  return {
    residentBays,
    visitorBays,
    totalBays,
    bayAreaFactorM2: bayAreaFactor,
    requiredAreaM2: requiredArea,
    availableAreaPerLevelM2: availableAreaPerLevel,
    usableFraction: usableTraced,
    availableAreaM2: availableArea,
    providedBays,
    baysPerUnit,
    achievedVisitorFraction,
    levelsRequired,
    levelsAvailable,
    headroomBays,
    supportableUnitCeiling,
    podiumImplication,
  };
}
