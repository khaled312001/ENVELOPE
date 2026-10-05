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
 * On 5 Oct 2026 he sent his own worked scheme and named this table by name —
 * *«podium — Calculations»*. `docs/03-analysis/client-drawings-2026-10-05.md` §4
 * transcribes it. It is a real consultant's output with real numbers on a
 * 1,365.23 m² plot at FAR 3.50, and it settles four things about the shape of
 * this output that no amount of reasoning about it would have settled:
 *
 *   1. **GFA is reported PER LEVEL**, as a schedule that sums to the total.
 *   2. **Levels are GROUPED, and the product is printed as a product** —
 *      "Typical floor 02/04/06  625.55 × 3 = 1,876.66" — because the reader
 *      checks the multiplication. A pre-multiplied figure cannot be checked.
 *   3. **Commercial and residential are capped SEPARATELY** and summed at the
 *      end, and the ground floor is where the two meet (his has a SHOP).
 *   4. **The ground floor and the roof are not plates.** His ground floor
 *      contributes 118.00 m² of residential GFA out of a 1,355 m² footprint;
 *      his roof contributes 92.90 m² of stair head and lift motor room.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT IS MADE OF, AND WHAT IT IS NOT.
 *
 * Nothing new is decided here, and no figure moves. Each row is a figure the run
 * already holds, put against the allowance it draws on:
 *
 *   - ALLOWED is FAR × plot area — the gross allowance, before the parking-in-FAR
 *     treatment, because that is the figure an affection plan prints and the
 *     figure the drawing's table quotes. Derived from the FAR rule, as band A is.
 *   - THE FLOOR ROWS are the tower plate × the levels the answer places, grouped
 *     by what each level is. Both operands are the engine's own nodes
 *     (`envelope.tower_plate_cap`, `capacity.levels`), the group's count is traced
 *     so that the product is a product IN THE GRAPH, and the row is nothing else.
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
 * ---------------------------------------------------------------------------
 * THE ENGINE COUNTS ONE PLATE PER LEVEL, AND THIS STATEMENT SAYS SO.
 *
 * This is the defect his table exposes, and it is reported rather than repaired,
 * because repairing it here would be the worse failure of the two.
 *
 * Band B is `tower plate × levels` (`bands.ts`), and `capacity.levels` is
 * `floor(governing GFA ÷ tower plate)`. So **every** above-ground level the answer
 * places is counted at one uniform plate — the ground floor and the podium levels
 * included. A Dubai ground floor is nothing like a plate: his is 118.00 m² of
 * residential floor area inside a 1,355 m² footprint, the rest being parking, the
 * entrance, plant, refuse and a shop. His podium levels count 50.54 m² each, not
 * a plate. And a parking ground floor, which is the usual case and his, counts
 * **zero** here, where a real scheme counts its lobby and its core.
 *
 * The statement therefore does three things and refuses a fourth:
 *
 *   - it breaks the single residential row into the levels it is made of, so the
 *     ground floor's share is a line a reader can see and argue with rather than
 *     a twelfth of one number;
 *   - it carries `reconciliation`, which names the difference in words and quotes
 *     his own figures as the evidence — the same discipline `reconcileCore` uses:
 *     say so, and change neither side;
 *   - it names the roof level it does not model, as NOT ASSESSED;
 *   - and it does **not** re-apportion the total. The total is the capacity the
 *     whole run was computed from, quoted by the bands panel, the report, the
 *     title block and every export. A statement that quietly disagreed with it
 *     would be a second answer to the question the run already answered, and the
 *     reader would have no way to tell which one anything else used.
 *
 * ---------------------------------------------------------------------------
 * TWO CAPS, NEVER MERGED — AND A CAP THE SHEET DOES NOT STATE DOES NOT GET ONE.
 *
 * His table is three stacked tables: a commercial allowance of 60.00 m² against
 * 60.00 m² proposed, a residential allowance of 4,718.305 m² against the floor
 * schedule, and the sum of the two against 4,778.305 m². The two allowances add
 * to the total exactly, which is the relationship modelled here: a stated
 * commercial allowance is subtracted from the gross allowance to give the
 * residential one.
 *
 * Where no commercial allowance is stated there is ONE cap and the statement says
 * so in a sentence. It is not invented, and there is still no commercial row:
 * this engine places no commercial area, and a commercial table showing 0.00
 * would state a fact about the scheme that nobody decided.
 */

import { Decimal, metric, type Traced, type TracedDecimal, type Tracer } from '@envelope/core';

import type { BandSource } from './bands.js';

/** Square metres per square foot, exactly: 0.3048². */
const M2_PER_FT2 = new Decimal('0.09290304');

export const toFt2 = (m2: Decimal): Decimal => m2.div(M2_PER_FT2);

/**
 * Which allowance a row draws on. Two, and they are summed at the end, never
 * merged: a ground-floor tenancy changes which cap a level is measured against,
 * and a single figure cannot say that.
 */
export const GfaCapKind = {
  RESIDENTIAL: 'RESIDENTIAL',
  COMMERCIAL: 'COMMERCIAL',
} as const;
export type GfaCapKind = (typeof GfaCapKind)[keyof typeof GfaCapKind];

/**
 * What a row of the schedule is.
 *
 * Named for what the levels ARE, not for which allowance they draw on — the cap
 * is a separate field. `RESIDENTIAL` used to be the kind of the single
 * undifferentiated floors row; it is gone, because it would now collide with
 * `GfaCapKind.RESIDENTIAL` and name a different thing, which is the mistake
 * `LevelSchedule` was renamed to avoid.
 */
export const GfaRowKind = {
  /** The ground floor, where the answer places floor area on it. */
  GROUND: 'GROUND',
  /** Podium levels above the ground floor that hold floor area, not parking. */
  PODIUM: 'PODIUM',
  /** Typical floors of the tower plate. */
  TYPICAL: 'TYPICAL',
  /**
   * Levels the answer counts that the model could not stack under the height
   * ceiling above the podium parking. Counted in the total because the capacity
   * figure counts them; drawn nowhere, because they do not fit.
   */
  UNPLACED: 'UNPLACED',
  /** Parking, where the declared treatment counts it toward FAR. */
  PARKING: 'PARKING',
  /** A commercial tenancy. No run emits one; the kind exists for the cap. */
  COMMERCIAL: 'COMMERCIAL',
  /** The roof level — stair head, lift motor room, tank room. Never an area. */
  ROOF: 'ROOF',
} as const;
export type GfaRowKind = (typeof GfaRowKind)[keyof typeof GfaRowKind];

/**
 * What a model level id says about the level.
 *
 * The ids are the model's own — `B2, B1, G, P1, L03` — and they are a documented,
 * load-bearing encoding rather than a label: `building.ts` names every level for
 * what it is precisely because "`L00` named three different kinds of level alike",
 * and those ids are DXF layer names an architect carries between drawings. So the
 * grouping reads them, in ONE place, rather than each consumer matching a prefix
 * of its own.
 */
export const LevelIdKind = {
  BASEMENT: 'BASEMENT',
  GROUND: 'GROUND',
  PODIUM: 'PODIUM',
  TYPICAL: 'TYPICAL',
} as const;
export type LevelIdKind = (typeof LevelIdKind)[keyof typeof LevelIdKind];

/**
 * Classify one model level id.
 *
 * Anything unrecognised reads as TYPICAL rather than raising: the partition this
 * feeds must be total, or a level would fall out of the schedule and the rows
 * would stop summing to the total — which is the one property of this table a
 * reader checks with a calculator.
 */
export function classifyLevelId(id: string): LevelIdKind {
  if (/^B\d+$/.test(id)) return LevelIdKind.BASEMENT;
  if (id === 'G') return LevelIdKind.GROUND;
  if (/^P\d+$/.test(id)) return LevelIdKind.PODIUM;
  return LevelIdKind.TYPICAL;
}

export interface GfaStatementRow {
  readonly kind: GfaRowKind;
  /** Which of the two allowances the row draws on. */
  readonly cap: GfaCapKind;
  /** The model's level ids the row covers, bottom to top — `L01`…`L05`. */
  readonly levelIds: readonly string[];
  /** The area of one level. Null where the row is not one area repeated. */
  readonly perLevelM2: TracedDecimal | null;
  readonly count: number;
  /**
   * The row's level count, traced.
   *
   * Here so that `areaM2` is a PRODUCT IN THE GRAPH: its two operands are the
   * per-level area and this count, and a reader who opens the row's area sees the
   * multiplication they were going to do themselves. A count carried only as a
   * plain number would make the row's total an unexplained figure beside two
   * figures that happen to multiply to it. Null where the row is not a repeat.
   */
  readonly levelCount: Traced<number> | null;
  readonly areaM2: TracedDecimal;
  /** The same two areas in square feet, converted here so no reader converts. */
  readonly perLevelFt2: Decimal | null;
  readonly areaFt2: Decimal;
}

/**
 * A floor the table NAMES and does not count.
 *
 * The honest third state, and it is a row on the drawing's table rather than a
 * footnote: §20.3's "an invariant silently absent from the table reads as an
 * invariant that passed" is just as true of a floor. A zero would say the floor
 * is empty; an invented area would be a figure nobody computed; leaving it out
 * would say the engine had looked.
 */
export interface GfaOmission {
  readonly kind: GfaRowKind;
  readonly cap: GfaCapKind;
  /** What stands there, why no area is stated, and what it is NOT. */
  readonly reason: string;
}

/**
 * One allowance and what is proposed against it.
 *
 * Every field is nullable except the kind, and each null is a distinct fact the
 * `notes` name: no allowance was stated, or nothing was proposed against one. A
 * zero in either place would be an answer.
 */
export interface GfaCap {
  readonly kind: GfaCapKind;
  readonly allowedM2: TracedDecimal | null;
  readonly allowedFt2: Decimal | null;
  readonly proposedM2: TracedDecimal | null;
  readonly proposedFt2: Decimal | null;
  readonly remainingM2: TracedDecimal | null;
  readonly remainingFt2: Decimal | null;
  /** Why an allowance or a proposal is absent. One sentence each. */
  readonly notes: readonly string[];
}

export interface GfaStatement {
  /** The plot's own area, as every screen states it. Not traced: it is the plot. */
  readonly plotAreaM2: Decimal;
  /** FAR × plot area, before the parking treatment. The two caps sum to it. */
  readonly allowedGfaM2: TracedDecimal;
  /**
   * The two allowances, residential first. Flat totals only — the rows live in
   * `rows` and carry their own `cap`, so no row is stated twice and nothing can
   * disagree with anything.
   */
  readonly caps: readonly GfaCap[];
  readonly rows: readonly GfaStatementRow[];
  /** Floors the table names and does not count. */
  readonly omissions: readonly GfaOmission[];
  /**
   * What the uniform-plate model does not model, in words.
   *
   * Said rather than absorbed, and changing neither side — `reconcileCore`'s
   * discipline applied to the one figure a reader of this table will check
   * against a drawing they already have.
   */
  readonly reconciliation: readonly string[];
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
  /**
   * A separately stated commercial allowance, where the sheet states one.
   *
   * OPTIONAL, AND ABSENT MEANS ONE CAP RATHER THAN A ZERO ONE. An affection plan
   * that prints a single gross floor area has one allowance, and inventing a
   * commercial split for it would answer a question the sheet did not ask — the
   * same refusal `blockingGaps()` makes about a missing FAR.
   */
  readonly commercialAllowance?: TracedDecimal;
  /**
   * The ground floor's non-parking floor area, where the ground floor is a
   * parking level — `LevelPlan.nonParkingFloorAreaM2`.
   *
   * Used to BOUND the sentence about what a parking ground floor really
   * contributes, never to state it: the figure covers the ramp landing too,
   * which the annex calls parking circulation. Optional, and the sentence stands
   * without it.
   */
  readonly groundFloorNonParkingAreaM2?: TracedDecimal;
}

/** Raised when the stated allowances cannot both be true of one plot. */
export class GfaStatementRefusedError extends Error {
  override readonly name = 'GfaStatementRefusedError';
}

/*
  THE SENTENCES. Held here, named, and asserted by name in the tests — because
  "a removal that leaves no test behind is an absence, not a decision", and each
  of these is a decision about what the engine will not claim.

  Every figure quoted from the client's own scheme is attributed to it in the
  sentence that quotes it, and is a transcription from
  `docs/03-analysis/client-drawings-2026-10-05.md` §4 rather than anything this
  engine computed. That distinction is the whole reason the words "the worked
  scheme on file" appear in each one.
*/

/** The roof the engine has no model of. §4 item 5 of the client's drawings note. */
export const ROOF_NOT_ASSESSED =
  'Roof level. A stair head, a lift motor room and a tank room stand above the top floor, ' +
  'and the annex counts them: GFA includes "Vertical cores (stairs, lifts, shafts) measured ' +
  'once per level" and "Enclosed plant and service rooms". This engine models no roof level, ' +
  'so no area is stated and nothing is added to the total — a figure here would be one nobody ' +
  'computed, and a zero would say the roof is empty. The worked scheme on file counts 92.90 m² ' +
  'on its roof level, which is the order of the omission. NOT ASSESSED.';

/** The ground floor counted as a full plate, which is the defect this table exposes. */
export const groundFloorFullPlateNote = (plateM2: Decimal): string =>
  `The ground floor is counted at the full tower plate of ${plateM2.toFixed(2)} m², like every ` +
  'level above it. A Dubai residential ground floor is not a plate of floor area: it carries ' +
  'the vehicle entrance, the entrance lobby, the plant rooms, the refuse room and often a shop. ' +
  'The worked scheme on file counts 118.00 m² of residential floor area inside a 1,355 m² ground ' +
  'floor, the rest being parking, plant and a shop. This engine computes one plate per level and ' +
  'models nothing of what a ground floor holds, so the ground-floor row above is an upper bound. ' +
  'It is reported and not corrected: the total is the capacity every other output of this run ' +
  'quotes, and a table that disagreed with it would be a second answer.';

/** The ground floor given to parking, which counts nothing here and something in practice. */
export const groundFloorIsParkingNote = (boundM2: Decimal | null): string =>
  'The ground floor is a parking level, so this proposal counts no floor area on it. A built ' +
  'scheme counts some: the annex excludes "Residential lobbies within a parking level" from ' +
  'PARKING_AREA and includes lobbies, cores and enclosed plant rooms in GFA, so the entrance ' +
  'lobby and the core at grade are floor area. ' +
  (boundM2 === null
    ? ''
    : `${boundM2.toFixed(2)} m² of that level is neither bay nor drive aisle, which bounds it ` +
      'from above. ') +
  'How much of it is GFA is NOT ASSESSED — the annex is unsigned, and nothing on file splits ' +
  'the reserved strip between lobby, plant and ramp landing. The worked scheme on file counts ' +
  '118.00 m² of residential floor area on its ground floor, against none here.';

/** Podium levels counted at the tower plate and drawn at the podium footprint. */
export const PODIUM_AT_TOWER_PLATE_NOTE =
  'The podium levels are counted at the tower plate, because that is what the governing ' +
  'capacity was computed from — band B is tower plate × levels. The drawings put them on the ' +
  'podium footprint, which is the larger figure, and a real podium level counts neither: the ' +
  'worked scheme on file counts 50.54 m² on each of its two podium levels, which is a lift ' +
  'lobby and a core. The engine models no level-by-level plate, so one plate is what it states.';

/** One allowance, because the sheet stated one. §4 item 3 of the drawings note. */
export const ONE_ALLOWANCE_NOTE =
  'One allowance, not two. The instrument this run was computed from states a single gross ' +
  'floor area, so there is one cap and every square metre above is measured against it. A sheet ' +
  'that states a commercial allowance separately is measured against two, summed at the end, ' +
  'and the ground floor is where they meet — the worked scheme on file prices a 60.00 m² shop ' +
  'against a 60.00 m² commercial allowance, beside a 4,718.305 m² residential one. Neither a ' +
  'commercial cap nor a commercial row is invented here: this engine places no commercial area, ' +
  'and a table of zeros would state a decision nobody made.';

/** A commercial allowance was stated and nothing was placed against it. */
export const NO_COMMERCIAL_AREA_PLACED_NOTE =
  'Nothing is proposed against the commercial allowance. This engine places no commercial ' +
  'area — no tenancy is sized, located or counted — so the allowance stands unused and what ' +
  'is left of it is NOT ASSESSED rather than equal to the whole of it.';

/**
 * The row kinds that are a plate repeated — the only ones the grouping produces.
 *
 * Narrower than `GfaRowKind` on purpose: it makes `ROW_NODES` total, so the
 * lookup below needs no non-null assertion and a fifth group kind added without
 * a node id is a compile error rather than a row whose area has no name.
 */
type LevelRowKind =
  | typeof GfaRowKind.GROUND
  | typeof GfaRowKind.PODIUM
  | typeof GfaRowKind.TYPICAL
  | typeof GfaRowKind.UNPLACED;

/** Which traced node each row group writes, so a reader meets a named value. */
const ROW_NODES: Readonly<
  Record<LevelRowKind, { readonly area: string; readonly count: string }>
> = {
  [GfaRowKind.GROUND]: {
    area: 'gfa_statement.ground_floor_gfa_m2',
    count: 'gfa_statement.ground_floor_levels',
  },
  [GfaRowKind.PODIUM]: {
    area: 'gfa_statement.podium_gfa_m2',
    count: 'gfa_statement.podium_levels',
  },
  [GfaRowKind.TYPICAL]: {
    area: 'gfa_statement.typical_gfa_m2',
    count: 'gfa_statement.typical_levels',
  },
  [GfaRowKind.UNPLACED]: {
    area: 'gfa_statement.unplaced_gfa_m2',
    count: 'gfa_statement.unplaced_levels',
  },
};

/** One group of identical plates: "Typical floor 02/04/06 — 625.55 × 3". */
interface LevelGroup {
  readonly kind: LevelRowKind;
  readonly ids: readonly string[];
  readonly count: number;
}

export function buildGfaStatement(input: GfaStatementInput): GfaStatement {
  const { tracer } = input;
  // `FR-DEF-001 AC5`: every area term this module states is a GFA term, and the
  // call is the gate rather than the comment.
  const gfa = metric('GFA').metricId;
  const grossAllowed = input.farMax.times(input.plotAreaM2);

  const allowedGfaM2 = tracer.derived('gfa_statement.allowed_gfa_m2', grossAllowed, {
    rule: input.farRule,
    formula:
      `FAR ${input.farMax.toString()} × plot area ${input.plotAreaM2.toFixed(2)} m² ` +
      '(gross, before the parking-in-FAR treatment)',
    unit: 'm²',
    detail: { metric: gfa },
  });

  const floors = input.levels.value;
  /*
    THE FLOORS AS ONE FIGURE, KEPT ALONGSIDE THE SCHEDULE THAT BREAKS IT UP.

    The rows below sum to exactly this, by construction — they are a partition of
    the same `plate × levels`. It stays a node of its own because two other
    things read it: the proposal's formula, which has to name what the parking
    row was added to, and the part floor, which is the governing capacity less
    the floors actually placed. Recomputing either from the rows would be the
    same arithmetic in a second place.
  */
  const residentialArea = tracer.computed(
    'gfa_statement.residential_gfa_m2',
    input.towerPlate.value.times(floors),
    {
      formula: `tower plate ${input.towerPlate.value.toFixed(2)} m² × ${floors} whole level(s)`,
      uses: { plate: input.towerPlate, levels: input.levels },
      unit: 'm²',
      detail: { metric: gfa },
    },
  );

  /*
    THE GROUPING, AND WHY IT IS A PARTITION RATHER THAN A FILTER.

    The ids are the levels the MODEL placed as floor area; `floors` is how many
    levels of plate the ANSWER counts. They are not always equal — the model
    cannot stack a level above the height ceiling, so a run whose podium parking
    eats into the ceiling places fewer than the answer counts (`building.ts`
    says so in a placement sentence and nowhere else). The difference is a row of
    its own, so that the rows still sum to the answer: a schedule whose total is
    not the capacity figure is a schedule a reader stops trusting at the total,
    which is the one line they check.

    Ids are used only when they cannot outnumber the levels the answer counts.
    A list longer than the count would label floors the row is not, and the
    original single row withheld the ids for exactly that reason.
  */
  const ids = input.residentialLevelIds.length <= floors ? input.residentialLevelIds : [];
  const groups: LevelGroup[] = [];
  if (ids.length === 0) {
    // No usable ids: one row of plate, as this statement has always printed —
    // which is also the shape of a run that places no floor area at all.
    if (floors > 0) groups.push({ kind: GfaRowKind.TYPICAL, ids: [], count: floors });
  } else {
    const of = (kind: LevelIdKind): readonly string[] =>
      ids.filter((id) => classifyLevelId(id) === kind);
    const ground = of(LevelIdKind.GROUND);
    const podium = of(LevelIdKind.PODIUM);
    // Everything that is not the ground floor or a podium level, so the three
    // groups are total over `ids` by construction.
    const typical = ids.filter((id) => {
      const k = classifyLevelId(id);
      return k !== LevelIdKind.GROUND && k !== LevelIdKind.PODIUM;
    });
    if (ground.length > 0) {
      groups.push({ kind: GfaRowKind.GROUND, ids: ground, count: ground.length });
    }
    if (podium.length > 0) {
      groups.push({ kind: GfaRowKind.PODIUM, ids: podium, count: podium.length });
    }
    if (typical.length > 0) {
      groups.push({ kind: GfaRowKind.TYPICAL, ids: typical, count: typical.length });
    }
    const unplaced = floors - ids.length;
    if (unplaced > 0) {
      groups.push({ kind: GfaRowKind.UNPLACED, ids: [], count: unplaced });
    }
  }

  const rowOf = (group: LevelGroup): GfaStatementRow => {
    const nodes = ROW_NODES[group.kind];
    /*
      THE COUNT IS TRACED SO THE PRODUCT IS A PRODUCT.

      "625.55 × 3 = 1,876.66" is printed as three figures because the reader
      multiplies the first two and checks the third. That check has to be
      available in the graph as well as on the paper, or the row's total is an
      unexplained number sitting beside two numbers that happen to produce it.
    */
    const levelCount = tracer.computed(nodes.count, group.count, {
      formula:
        group.ids.length > 0
          ? `${group.count} of the ${floors} level(s) the answer places: ${group.ids.join(', ')}`
          : `${group.count} of the ${floors} level(s) the answer places`,
      uses: { levels: input.levels },
      unit: 'levels',
      ...(group.kind === GfaRowKind.UNPLACED
        ? {
            detail: {
              note:
                'Levels the answer counts and the model could not place: the height ' +
                'ceiling is reached above the podium parking. Counted here because the ' +
                'capacity figure counts them. Not the part floor — that is a fraction of ' +
                'one more level above the last whole one, and is reported separately.',
            },
          }
        : {}),
    });
    const areaValue = input.towerPlate.value.times(group.count);
    const areaM2 = tracer.computed(nodes.area, areaValue, {
      formula:
        `${input.towerPlate.value.toFixed(2)} m² per level × ${group.count} level(s)` +
        (group.ids.length > 0 ? ` (${group.ids.join(', ')})` : ''),
      uses: { perLevel: input.towerPlate, levels: levelCount },
      unit: 'm²',
      detail: { metric: gfa, levelIds: [...group.ids] },
    });
    return {
      kind: group.kind,
      cap: GfaCapKind.RESIDENTIAL,
      levelIds: group.ids,
      perLevelM2: input.towerPlate,
      count: group.count,
      levelCount,
      areaM2,
      perLevelFt2: toFt2(input.towerPlate.value),
      areaFt2: toFt2(areaValue),
    };
  };

  const rows: GfaStatementRow[] = groups.map(rowOf);

  const counts = input.parkingInFar === 'COUNTS_TOWARD_FAR';
  if (counts) {
    /*
      PARKING SITS UNDER THE RESIDENTIAL CAP, and it is worth saying why rather
      than leaving it to be inferred: band A took the parking area out of the FAR
      allowance, so the allowance this row is measured against is the same one the
      floors are measured against. It is parking for the residential scheme. The
      client's table has no parking row at all — his parking is excluded from FAR
      — so there is no precedent in it to follow here.
    */
    rows.push({
      kind: GfaRowKind.PARKING,
      cap: GfaCapKind.RESIDENTIAL,
      levelIds: input.parkingLevelIds,
      perLevelM2: null,
      count: input.parkingLevelIds.length,
      levelCount: null,
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
    detail: { metric: gfa },
  });

  const remainingGfaM2 = tracer.computed(
    'gfa_statement.remaining_gfa_m2',
    Decimal.max(new Decimal(0), grossAllowed.minus(proposedValue)),
    {
      formula: `allowed ${grossAllowed.toFixed(2)} m² − proposed ${proposedValue.toFixed(2)} m²`,
      uses: { allowed: allowedGfaM2, proposed: proposedGfaM2 },
      unit: 'm²',
      detail: { metric: gfa },
    },
  );

  // --- the two caps -------------------------------------------------------------
  /*
    REFUSED, NOT CLAMPED. A commercial allowance larger than the whole FAR
    allowance cannot be true of one plot: one of the two figures was transcribed
    wrong, and the residential allowance that falls out of the subtraction would
    be negative. Reporting a negative allowance, or clamping it to zero, answers
    a question about the instrument that whoever read it got wrong — the same
    argument `scheduleRefusal` makes about a podium that does not describe a
    building, and the same one `SaleableEfficiencyInput` makes about an area
    larger than the envelope's own GFA.
  */
  const commercial = input.commercialAllowance;
  if (commercial && commercial.value.gt(grossAllowed)) {
    throw new GfaStatementRefusedError(
      `the stated commercial allowance of ${commercial.value.toFixed(2)} m² is larger than the ` +
        `${grossAllowed.toFixed(2)} m² FAR allows on this plot ` +
        `(FAR ${input.farMax.toString()} × ${input.plotAreaM2.toFixed(2)} m²). ` +
        'The two cannot both be right: check which figure the instrument states, because the ' +
        'residential allowance is the difference between them.',
    );
  }

  const residentialAllowedM2 = commercial
    ? tracer.computed(
        'gfa_statement.residential_allowed_gfa_m2',
        grossAllowed.minus(commercial.value),
        {
          formula:
            `allowed ${grossAllowed.toFixed(2)} m² − commercial allowance ` +
            `${commercial.value.toFixed(2)} m²`,
          uses: { allowed: allowedGfaM2, commercial },
          unit: 'm²',
          detail: { metric: gfa },
        },
      )
    : allowedGfaM2;
  const residentialRemainingM2 = commercial
    ? tracer.computed(
        'gfa_statement.residential_remaining_gfa_m2',
        Decimal.max(new Decimal(0), residentialAllowedM2.value.minus(proposedValue)),
        {
          formula:
            `residential allowance ${residentialAllowedM2.value.toFixed(2)} m² − proposed ` +
            `${proposedValue.toFixed(2)} m²`,
          uses: { allowed: residentialAllowedM2, proposed: proposedGfaM2 },
          unit: 'm²',
          detail: { metric: gfa },
        },
      )
    : remainingGfaM2;

  const caps: GfaCap[] = [
    {
      kind: GfaCapKind.RESIDENTIAL,
      allowedM2: residentialAllowedM2,
      allowedFt2: toFt2(residentialAllowedM2.value),
      proposedM2: proposedGfaM2,
      proposedFt2: toFt2(proposedValue),
      remainingM2: residentialRemainingM2,
      remainingFt2: toFt2(residentialRemainingM2.value),
      notes: commercial ? [] : [ONE_ALLOWANCE_NOTE],
    },
  ];
  if (commercial) {
    caps.push({
      kind: GfaCapKind.COMMERCIAL,
      allowedM2: commercial,
      allowedFt2: toFt2(commercial.value),
      // Null, not zero, and the note says which. Every square metre this engine
      // places is residential, so a 0.00 here would read as a tenancy of no area
      // rather than as no tenancy.
      proposedM2: null,
      proposedFt2: null,
      remainingM2: null,
      remainingFt2: null,
      notes: [NO_COMMERCIAL_AREA_PLACED_NOTE],
    });
  }

  // --- what is named and not counted ---------------------------------------------
  const omissions: GfaOmission[] = [
    { kind: GfaRowKind.ROOF, cap: GfaCapKind.RESIDENTIAL, reason: ROOF_NOT_ASSESSED },
  ];
  if (commercial) {
    omissions.push({
      kind: GfaRowKind.COMMERCIAL,
      cap: GfaCapKind.COMMERCIAL,
      reason: NO_COMMERCIAL_AREA_PLACED_NOTE,
    });
  }

  // --- what the uniform plate does not model -------------------------------------
  const reconciliation: string[] = [];
  const groundRow = rows.find((r) => r.kind === GfaRowKind.GROUND);
  if (groundRow) {
    reconciliation.push(groundFloorFullPlateNote(input.towerPlate.value));
  } else if (input.parkingLevelIds.some((id) => classifyLevelId(id) === LevelIdKind.GROUND)) {
    reconciliation.push(
      groundFloorIsParkingNote(input.groundFloorNonParkingAreaM2?.value ?? null),
    );
  }
  if (rows.some((r) => r.kind === GfaRowKind.PODIUM)) {
    reconciliation.push(PODIUM_AT_TOWER_PLATE_NOTE);
  }

  const partFloorNotPlacedM2 = Decimal.max(
    new Decimal(0),
    input.governingGfa.value.minus(residentialArea.value),
  );
  return {
    plotAreaM2: input.plotAreaM2,
    allowedGfaM2,
    caps,
    rows,
    omissions,
    reconciliation,
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
