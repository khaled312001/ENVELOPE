/**
 * Vehicular ramps — DBC B.7.2.2 Tables B.9 and B.10, and the 4% parked slope of
 * B.7.2.3.1. Encoded, cited, and used to SIZE the ramp rather than to excuse it.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS.
 *
 * Until 15 Oct 2026 the ramp was a 6 m × 30 m rectangle with an assumed run,
 * clipped to whatever room the level had left, and its gradient was reported
 * "NOT ASSESSED — B.7.2.2 is not encoded". The clipping is what made that
 * sentence dangerous rather than merely incomplete: on the worked example the
 * ring layout stood the ramp ACROSS a 6.5 m island and printed 49.23% on the
 * sheet; on the client's own plot the module layout printed 23.03%. Neither is a
 * ramp a car can drive, and both were drawn, exported to DXF and stood up in 3D.
 *
 * The clause is short and mechanical, so it is now encoded. A straight ramp is
 * sized from the storey it climbs: the main run at Table B.9's maximum slope,
 * with Table B.10's blended transition at each end. A level that cannot hold
 * that run does not get a steeper ramp — the arrangement that needed it is
 * refused, in a sentence naming both lengths, and another one is tried.
 *
 * The sloped floor is the client's own arrangement (his podium drawing, 5 Oct:
 * "sloped parking ramp 4%", a closed loop with bays on it). B.7.2.3.1 permits a
 * parked floor to fall at up to 4% (Figure B.55), so a ring aisle that climbs one
 * storey over one lap at no more than 4% IS the ramp, and needs no strip of its
 * own. Its gradient is the storey over the lap, checked against the 4%.
 *
 * HEADROOM is assessed as a BUDGET, not a claim. Every parking level carries the
 * same layout, so the ramps stand in one strip, stacked: over any point of one
 * ramp is the next, one storey higher, and the clear height there is the storey
 * less the depth of that ramp's slab and whatever hangs below it. Table B.9's
 * 2.4 m therefore fixes the deepest that structure may be — derived, with no
 * slab thickness assumed. The engine draws no structure, so whether a design
 * fits the budget is the structural engineer's; the budget is ours. The sloped
 * ring is the same section, one lap per storey. Not modelled: the street ramp to
 * the first basement, whose ceiling is the ground floor slab.
 *
 * Still NOT ASSESSED: surface finish, drainage, mirrors and guards (items 1–6
 * under Table B.9), which are specification, not geometry.
 */

import { Decimal, type Citation, type TracedDecimal, type Tracer } from '@envelope/core';

const DBC_PDF = 'docs/00-source/regulations/Dubai Building Code_English_2021 Edition_compressed.pdf';

export const TABLE_B9: Citation = {
  instrumentId: 'DUBAI_BUILDING_CODE',
  instrumentVersion: '2021',
  clauseReference: 'B.7.2.2 Table B.9 — Ramp slope and width',
  documentUri: DBC_PDF,
  sourcePage: 80,
  sourceBbox: [0, 0, 842, 595],
  sourceTextVerbatim:
    'Ramps allocated for vehicular access shall conform to Table B.9 and the following. ' +
    'Straight: maximum slope percentage 12%, minimum single lane width 3 m, minimum ' +
    'vertical clear height above any point 2.4 m. Lane separation for ramps shall be ' +
    'provided through curbs, walls or other structural segregation. Curbs shall be not ' +
    'less than 300 mm in width.',
};

export const TABLE_B10: Citation = {
  instrumentId: 'DUBAI_BUILDING_CODE',
  instrumentVersion: '2021',
  clauseReference: 'B.7.2.2 Table B.10 — Transition and ramp slopes recommendations',
  documentUri: DBC_PDF,
  sourcePage: 82,
  sourceBbox: [0, 0, 842, 595],
  sourceTextVerbatim:
    'Ramp design should provide blended transitions to horizontal parking levels. The ' +
    'transition should be equal to half the percentage of ramp’s slope. Ramp slope 12%, ' +
    'transition slope 6%, transition length (minimum) 3.6 m.',
};

export const PARKED_SLOPE_B7231: Citation = {
  instrumentId: 'DUBAI_BUILDING_CODE',
  instrumentVersion: '2021',
  clauseReference: 'B.7.2.3.1 and Figure B.55 — Parking at slope',
  documentUri: DBC_PDF,
  sourcePage: 83,
  sourceBbox: [0, 0, 842, 595],
  sourceTextVerbatim:
    'The slope in areas where vehicles are parked shall be not more than 4% (as shown ' +
    'in Figure B.55).',
};

/** Table B.9, straight ramp, and Table B.10's row for it. Strings: stated figures. */
export const STRAIGHT_RAMP = {
  maxSlope: '0.12',
  laneWidthM: '3',
  separationM: '0.3',
  clearHeightM: '2.4',
  transitionSlope: '0.06',
  transitionLengthM: '3.6',
} as const;

/** B.7.2.3.1: the steepest a floor with parked cars on it may fall. */
export const MAX_PARKED_SLOPE = '0.04';

export interface StraightRampRequirement {
  /** Two lanes and the curb between them — Table B.9. */
  readonly widthM: TracedDecimal;
  /** Plan length: both transitions and the main run, for one storey. */
  readonly runM: TracedDecimal;
  /** The main run's slope, as a percentage. Table B.9's maximum, by construction. */
  readonly slopePct: TracedDecimal;
}

/**
 * The plan size of a straight two-way ramp that climbs `storeyHeightM`.
 *
 * Main run at 12%, a 3.6 m transition at 6% at each end:
 * `run = 2 × 3.6 + (H − 2 × 3.6 × 0.06) ÷ 0.12`. At 3.2 m that is 30.27 m. Width is
 * two 3 m lanes and a 300 mm curb, 6.30 m — two-way traffic on one ramp needs the
 * lane separation clause (c), and a 6 m strip with no separation does not meet it.
 */
export function straightRampRequirement(tracer: Tracer, storeyHeightM: TracedDecimal): StraightRampRequirement {
  const r = STRAIGHT_RAMP;
  const H = storeyHeightM.value;
  const maxSlope = tracer.derived('parking.ramp_max_slope', new Decimal(r.maxSlope), {
    rule: { ruleId: 'DBC.B.7.2.2.TABLE_B9', citation: TABLE_B9 },
    formula: 'straight vehicular ramp, maximum slope 12%',
  });
  const transition = tracer.derived('parking.ramp_transition_m', new Decimal(r.transitionLengthM), {
    rule: { ruleId: 'DBC.B.7.2.2.TABLE_B10', citation: TABLE_B10 },
    formula: 'transition at half the ramp slope (6%), at least 3.6 m long, at each end',
    unit: 'm',
  });
  const lane = tracer.derived('parking.ramp_lane_width_m', new Decimal(r.laneWidthM), {
    rule: { ruleId: 'DBC.B.7.2.2.TABLE_B9', citation: TABLE_B9 },
    formula: 'minimum single lane width, straight ramp',
    unit: 'm',
  });

  const tLen = transition.value;
  const tRise = tLen.times(r.transitionSlope).times(2);
  if (H.lte(tRise)) {
    // Unreachable for any real storey; asserted, not assumed.
    throw new Error(`a ${H.toString()} m storey is lower than the rise of the two transitions alone`);
  }
  const main = H.minus(tRise).div(maxSlope.value).toDecimalPlaces(2, Decimal.ROUND_UP);
  const runValue = main.plus(tLen.times(2));

  const widthM = tracer.computed('parking.ramp_width_m', lane.value.times(2).plus(r.separationM), {
    formula: `2 × ${lane.value.toString()} m lanes + ${r.separationM} m curb between them (B.7.2.2 c, d)`,
    uses: { lane },
    unit: 'm',
  });
  const runM = tracer.computed('parking.ramp_run_m', runValue, {
    formula:
      `2 × ${tLen.toString()} m transitions at 6% + (${H.toString()} m storey − ` +
      `${tRise.toFixed(3)} m they climb) ÷ 12% = ${runValue.toFixed(2)} m`,
    uses: { storey: storeyHeightM, slope: maxSlope, transition },
    unit: 'm',
    detail: {
      note:
        'The plan length a straight ramp needs to climb one storey within Table B.9 and ' +
        'Table B.10. A level that cannot hold it is not given a steeper ramp.',
    },
  });
  const slopePct = tracer.computed('parking.ramp_slope_pct', maxSlope.value.times(100), {
    formula: 'main run at the Table B.9 maximum, 12%; 6% over each transition',
    uses: { slope: maxSlope },
    unit: '%',
  });
  return { widthM, runM, slopePct };
}

export interface RampHeadroom {
  /** Table B.9's minimum vertical clear height above any point of a ramp. */
  readonly clearHeightM: TracedDecimal;
  /** The deepest the slab and anything below it over a ramp may be: storey − 2.4 m. */
  readonly structuralBudgetM: TracedDecimal;
  /** False where the storey itself is no taller than the clear height. */
  readonly feasible: boolean;
}

/**
 * The structural depth a stacked ramp leaves room for — Table B.9's 2.4 m clear
 * height, under the same ramp one storey up. Derived; nothing is assumed about
 * the slab, and the caller says in words that the structure is not drawn.
 */
export function rampHeadroom(tracer: Tracer, storeyHeightM: TracedDecimal): RampHeadroom {
  const clearHeightM = tracer.derived('parking.ramp_clear_height_m', new Decimal(STRAIGHT_RAMP.clearHeightM), {
    rule: { ruleId: 'DBC.B.7.2.2.TABLE_B9', citation: TABLE_B9 },
    formula: 'minimum vertical clear height above any point of a vehicular ramp, 2.4 m',
    unit: 'm',
  });
  const budget = storeyHeightM.value.minus(clearHeightM.value);
  const structuralBudgetM = tracer.computed('parking.ramp_structural_budget_m', budget, {
    formula:
      `${storeyHeightM.value.toString()} m storey − ${clearHeightM.value.toString()} m clear ` +
      'height (Table B.9), under the same ramp one storey up',
    uses: { storey: storeyHeightM, clear: clearHeightM },
    unit: 'm',
    detail: {
      note:
        'The deepest the slab, its beams and anything hung below them may be over a ' +
        'ramp. The engine draws no structure: this is the budget a design must fit in, ' +
        'not a statement that one does.',
    },
  });
  return { clearHeightM, structuralBudgetM, feasible: budget.gt(0) };
}

/**
 * The gradient of a ring aisle that climbs one storey per lap, or null where it
 * would be steeper than the 4% a parked floor is allowed. The gradient is traced;
 * the caller says in words what a refusal means for the arrangement.
 */
export function slopedFloorGradient(
  tracer: Tracer,
  storeyHeightM: TracedDecimal,
  lapM: Decimal,
): { readonly gradientPct: TracedDecimal; readonly within: boolean } {
  const limit = tracer.derived('parking.max_parked_slope', new Decimal(MAX_PARKED_SLOPE), {
    rule: { ruleId: 'DBC.B.7.2.3.1', citation: PARKED_SLOPE_B7231 },
    formula: 'a floor with parked cars on it falls at no more than 4%',
  });
  const g = storeyHeightM.value.div(lapM);
  const gradientPct = tracer.computed('parking.sloped_floor_gradient_pct', g.times(100).toDecimalPlaces(2, Decimal.ROUND_UP), {
    formula: `${storeyHeightM.value.toString()} m storey ÷ ${lapM.toFixed(2)} m lap along the aisle's centre line`,
    uses: { storey: storeyHeightM, limit },
    unit: '%',
    detail: { limitPct: '4', note: 'The ring aisle is the ramp: one lap climbs one storey.' },
  });
  return { gradientPct, within: g.lte(limit.value) };
}
