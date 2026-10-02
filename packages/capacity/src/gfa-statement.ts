/**
 * The GFA statement — the area table a Dubai submission drawing carries.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS.
 *
 * The client's drawings end in a table every reviewer reads first: plot area,
 * gross floor area allowed, gross floor area proposed, and the floors that make up
 * the proposal, each as an area and a count — "TYPICAL FLOOR AREA 625.55 Sq.m × 3".
 * The engine already produced every one of those figures; none of them was laid
 * out the way the reader checks them, and a capacity figure the reader has to
 * reassemble from bands and levels is one they will reassemble differently.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT IS MADE OF, AND WHAT IT IS NOT.
 *
 * Nothing new is decided here. Each row is a figure the run already holds, put
 * against the allowance it draws on:
 *
 *   - ALLOWED is FAR × plot area — the gross allowance, before the parking-in-FAR
 *     treatment, because that is the figure an affection plan prints and the
 *     figure the drawing's table quotes. Derived from the FAR rule, as band A is.
 *   - THE RESIDENTIAL ROW is the tower plate × the whole levels the answer places.
 *     Both are the engine's own nodes (`envelope.tower_plate_cap`,
 *     `capacity.levels`); the row is their product and nothing else.
 *   - THE PARKING ROW appears only where parking counts toward FAR, and is the
 *     parking area band A already deducted (`parking.required_area_m2`). Where
 *     parking is excluded it is not GFA, and a zero row would read as a parking
 *     area of zero.
 *
 * PROPOSED is whole floors. The governing capacity is the smallest band and is
 * rarely a whole number of floors; the part floor above the last whole one is not
 * placed, and the statement says how much that is rather than rounding it in.
 *
 * Square feet are written beside square metres because the drawings carry both.
 * 1 ft = 0.3048 m exactly (international foot), so 1 m² = 1 ÷ 0.09290304 ft²;
 * the conversion is exact and printed to two places like the m² it sits beside.
 *
 * No commercial row. The engine places no commercial area; a commercial table
 * showing 0.00 would state a fact about the scheme that nobody decided.
 */

import { Decimal, type Traced, type TracedDecimal, type Tracer } from '@envelope/core';

import type { BandSource } from './bands.js';

/** Square metres per square foot, exactly: 0.3048². */
const M2_PER_FT2 = new Decimal('0.09290304');

export const toFt2 = (m2: Decimal): Decimal => m2.div(M2_PER_FT2);

export const GfaRowKind = {
  /** Floors of the tower plate the answer places. */
  RESIDENTIAL: 'RESIDENTIAL',
  /** Parking, where the declared treatment counts it toward FAR. */
  PARKING: 'PARKING',
} as const;
export type GfaRowKind = (typeof GfaRowKind)[keyof typeof GfaRowKind];

export interface GfaStatementRow {
  readonly kind: GfaRowKind;
  /** The model's level ids the row covers, bottom to top — `L01`…`L05`. */
  readonly levelIds: readonly string[];
  /** The area of one level. Null where the row is not one area repeated. */
  readonly perLevelM2: TracedDecimal | null;
  readonly count: number;
  readonly areaM2: TracedDecimal;
  /** The same two areas in square feet, converted here so no reader converts. */
  readonly perLevelFt2: Decimal | null;
  readonly areaFt2: Decimal;
}

export interface GfaStatement {
  /** The plot's own area, as every screen states it. Not traced: it is the plot. */
  readonly plotAreaM2: Decimal;
  /** FAR × plot area, before the parking treatment. */
  readonly allowedGfaM2: TracedDecimal;
  readonly rows: readonly GfaStatementRow[];
  /** The rows, summed. Whole floors only. */
  readonly proposedGfaM2: TracedDecimal;
  /** Allowed less proposed. Never negative: proposed is within band A by construction. */
  readonly remainingGfaM2: TracedDecimal;
  /** The part floor above the last whole one — the governing GFA less the placed floors. */
  readonly partFloorNotPlacedM2: Decimal;
  /**
   * Every area above in square feet. Emitted by the engine, so the screen, the
   * report and the workbook print one conversion rather than three.
   */
  readonly ft2: {
    readonly plotArea: Decimal;
    readonly allowed: Decimal;
    readonly proposed: Decimal;
    readonly remaining: Decimal;
    readonly partFloorNotPlaced: Decimal;
  };
}

export interface GfaStatementInput {
  readonly tracer: Tracer;
  readonly farMax: Decimal;
  readonly plotAreaM2: Decimal;
  readonly farRule: BandSource;
  readonly towerPlate: TracedDecimal;
  readonly levels: Traced<number>;
  /** The model's placed, non-parking level ids, bottom to top. */
  readonly residentialLevelIds: readonly string[];
  readonly parkingInFar: 'COUNTS_TOWARD_FAR' | 'EXCLUDED_FROM_FAR';
  readonly parkingArea: TracedDecimal;
  /** The model's parking level ids, bottom to top. */
  readonly parkingLevelIds: readonly string[];
  readonly governingGfa: TracedDecimal;
}

export function buildGfaStatement(input: GfaStatementInput): GfaStatement {
  const { tracer } = input;
  const grossAllowed = input.farMax.times(input.plotAreaM2);

  const allowedGfaM2 = tracer.derived('gfa_statement.allowed_gfa_m2', grossAllowed, {
    rule: input.farRule,
    formula:
      `FAR ${input.farMax.toString()} × plot area ${input.plotAreaM2.toFixed(2)} m² ` +
      '(gross, before the parking-in-FAR treatment)',
    unit: 'm²',
    detail: { metric: 'GFA' },
  });

  const floors = input.levels.value;
  const residentialArea = tracer.computed(
    'gfa_statement.residential_gfa_m2',
    input.towerPlate.value.times(floors),
    {
      formula: `tower plate ${input.towerPlate.value.toFixed(2)} m² × ${floors} whole level(s)`,
      uses: { plate: input.towerPlate, levels: input.levels },
      unit: 'm²',
    },
  );

  const rows: GfaStatementRow[] = [
    {
      kind: GfaRowKind.RESIDENTIAL,
      // Ids only when the model placed exactly the levels the answer counts; a
      // list that disagreed with the count would label floors the row is not.
      levelIds: input.residentialLevelIds.length === floors ? input.residentialLevelIds : [],
      perLevelM2: input.towerPlate,
      count: floors,
      areaM2: residentialArea,
      perLevelFt2: toFt2(input.towerPlate.value),
      areaFt2: toFt2(residentialArea.value),
    },
  ];

  const counts = input.parkingInFar === 'COUNTS_TOWARD_FAR';
  if (counts) {
    rows.push({
      kind: GfaRowKind.PARKING,
      levelIds: input.parkingLevelIds,
      perLevelM2: null,
      count: input.parkingLevelIds.length,
      areaM2: input.parkingArea,
      perLevelFt2: null,
      areaFt2: toFt2(input.parkingArea.value),
    });
  }

  const proposedValue = rows.reduce((sum, r) => sum.plus(r.areaM2.value), new Decimal(0));
  const proposedGfaM2 = tracer.computed('gfa_statement.proposed_gfa_m2', proposedValue, {
    formula: counts
      ? `residential ${residentialArea.value.toFixed(2)} m² + parking ` +
        `${input.parkingArea.value.toFixed(2)} m² (parking counts toward FAR)`
      : `residential ${residentialArea.value.toFixed(2)} m² (parking excluded from FAR)`,
    uses: counts
      ? { residential: residentialArea, parking: input.parkingArea }
      : { residential: residentialArea },
    unit: 'm²',
  });

  const remainingGfaM2 = tracer.computed(
    'gfa_statement.remaining_gfa_m2',
    Decimal.max(new Decimal(0), grossAllowed.minus(proposedValue)),
    {
      formula: `allowed ${grossAllowed.toFixed(2)} m² − proposed ${proposedValue.toFixed(2)} m²`,
      uses: { allowed: allowedGfaM2, proposed: proposedGfaM2 },
      unit: 'm²',
    },
  );

  const partFloorNotPlacedM2 = Decimal.max(
    new Decimal(0),
    input.governingGfa.value.minus(residentialArea.value),
  );
  return {
    plotAreaM2: input.plotAreaM2,
    allowedGfaM2,
    rows,
    proposedGfaM2,
    remainingGfaM2,
    partFloorNotPlacedM2,
    ft2: {
      plotArea: toFt2(input.plotAreaM2),
      allowed: toFt2(grossAllowed),
      proposed: toFt2(proposedValue),
      remaining: toFt2(remainingGfaM2.value),
      partFloorNotPlaced: toFt2(partFloorNotPlacedM2),
    },
  };
}
