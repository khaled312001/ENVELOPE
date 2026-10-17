/**
 * WHAT AN INSTRUMENT STATES ABOUT ONE PLOT.
 *
 * An *instrument* here is a document that carries limits for a named parcel: an
 * affection plan, a Development Control Regulation extract, a developer's
 * consultant-issued brief. It is not a regulation in general — `@envelope/rules`
 * holds those — and it is not a reading of a document either; `@envelope/intake`
 * does that. This module holds only the SHAPE of what such a document says.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS IN `core` AND NOT IN `intake`, WHERE IT WAS WRITTEN.
 *
 * Two packages need these shapes and neither may import the other. `intake`
 * produces them by reading a PDF; `rules` consumes them to build the plot-specific
 * records that §11.5 step 1 lets govern. `check-boundaries.mjs` forbids
 * `intake → rules` — "the moment it can reach the engine it can start filling a
 * gap the document left" — and the reverse edge would put a PDF parser under the
 * rule store, which is worse.
 *
 * The alternative was a second declaration of `SetbackSchedule` inside `rules`,
 * structurally identical and separately maintained. Two copies of a type that
 * must stay in step is the same defect as two copies of a number, and it drifts
 * the same way: silently, at the first field either side adds.
 *
 * ---------------------------------------------------------------------------
 * THE CITATION IS PART OF THE LIMIT, NOT ATTACHED TO IT LATER.
 *
 * `StatedLimit` pairs a value with the box on the page it was read from. There is
 * no constructor for a stated limit without one, for the same reason there is no
 * constructor for an untraced value: a FAR of 3.5 that cannot say which sheet, of
 * which date, printed it is a number somebody typed, and this product's whole
 * claim is that it can tell those two apart.
 */

import type { Decimal } from './numeric.js';
import type { Citation } from './provenance/graph.js';

/** `G+2P+8` decomposed. */
export interface HeightAllowance {
  /** Storeys above ground excluding podium and ground. `8` in `G+2P+8`. */
  readonly typicalFloors: number;
  /** Podium levels. `2` in `G+2P+8`; `0` in `G+11`. */
  readonly podiumLevels: number;
  /**
   * Total built levels including ground: `1 + podium + typical`.
   *
   * MEZZANINES AND THE ROOF ARE NOT IN IT, and that is a held position rather
   * than an oversight: whether an `M` or an `R` counts against the `G+N` cap is a
   * question put to the client (2026-10-17), and adding them here would answer it
   * in a sum nobody reads. They are carried below, separately, so the answer can
   * be applied the day it arrives without re-reading a single sheet.
   */
  readonly totalLevels: number;
  /** Basements printed in the code: `2` in `2B+G+4P+20`. Absent where the code prints none. */
  readonly basements?: number;
  /** Mezzanines printed in the code: `1` in `G+M+4`. Absent where the code prints none. */
  readonly mezzanines?: number;
  /** True where the code ends in `+R`: a roof level is printed. Absent where it is not. */
  readonly roof?: boolean;
  readonly raw: string;
}

/**
 * A setback distance, or the reason it is not a single distance.
 *
 * `DJAZ1TRE10RES022` prints "Side and rear setback is 0m to solid wall and 4.0m
 * to window wall" — the setback depends on whether the façade being set back has
 * openings, which is a design decision, not a datum. Collapsing that to one
 * number would silently pick the applicant's answer for them, so the conditional
 * case is preserved and marked as needing a decision.
 */
export type SetbackValue =
  | { readonly kind: 'FIXED'; readonly metres: Decimal }
  | {
      readonly kind: 'CONDITIONAL';
      readonly options: readonly { readonly condition: string; readonly metres: Decimal }[];
    };

export interface SetbackFace {
  readonly front?: SetbackValue;
  readonly side?: SetbackValue;
  readonly rear?: SetbackValue;
}

/** Setbacks differ between the podium mass and the tower above it. */
export interface SetbackSchedule {
  readonly podium: SetbackFace;
  readonly tower: SetbackFace;
  readonly raw: string;
  /** True when any face came back `CONDITIONAL` and needs a user decision. */
  readonly requiresDecision: boolean;
}

/**
 * ONE CELL OF A SETBACK TABLE, IN THE THREE STATES A SHEET PRINTS.
 *
 * The DDA sheet prints a `SETBACK (M)` table with a row per `SIDE ( n )` and a
 * column for the BUILDING and the PODIUM. On plot 6457790 its cells are numbers
 * (5 / 4, 7 / 6); on plot 5134565 every building cell reads `SEE NOTES` and every
 * podium cell `N/A`. Those are three different answers — a distance, a deferral
 * to the sheet's notes, and "this instrument sets none" — and a reader that
 * folded them into one shape reported "SEE NOTES against every face" for a sheet
 * that prints eight numbers. So each cell keeps its state, and the words.
 */
export type SetbackCell =
  | { readonly kind: 'DISTANCE'; readonly metres: Decimal }
  | { readonly kind: 'SEE_NOTES'; readonly verbatim: string }
  | { readonly kind: 'NOT_APPLICABLE'; readonly verbatim: string };

/** One row of a per-side setback table. */
export interface SideSetback {
  /** The sheet's own number for the side: `1` in `SIDE ( 1 )`. */
  readonly side: number;
  /** The tower — the column the DDA sheet heads `BUILDING`. */
  readonly building: SetbackCell;
  readonly podium: SetbackCell;
  /**
   * The boundary the drawing labels `SIDE n`: index `i` of the surveyed ring's
   * legs, `points[i] → points[i+1]`. ABSENT when the drawing does not place the
   * label on one boundary unambiguously — a side number is the sheet's name for
   * a boundary, and guessing which boundary it names would be choosing the
   * applicant's frontage for him.
   */
  readonly boundary?: number;
}

/**
 * A sheet's setbacks stated per numbered side rather than per face.
 *
 * Kept apart from {@link SetbackSchedule}, whose front / side / rear faces cannot
 * say "side 1 is 5 m and side 2 is 7 m": forcing this table into that shape
 * would have to pick which side is the front, which the sheet does not say.
 */
export interface SideSetbackTable {
  readonly sides: readonly SideSetback[];
  /** The table as printed, row by row. */
  readonly raw: string;
  /** How each `boundary` was found, or why none was — said under the table. */
  readonly placement: string;
}

/** What a dwelling's parking threshold is measured on. */
export const UnitAreaMeasure = {
  /** The sheet says `GFA`: "150 SQ.M GFA" on the DDA's note. */
  GFA: 'GFA',
  /**
   * The sheet says "its area" and not which one: «تزيد مساحتها عن 150 متر مربع»
   * on the Municipality's row. Whether that is GFA or saleable area is a question
   * to the client, not a reading.
   */
  UNSTATED: 'UNSTATED',
} as const;
export type UnitAreaMeasure = (typeof UnitAreaMeasure)[keyof typeof UnitAreaMeasure];

/** Bays per dwelling by a size threshold — "one bay for each unit ≤ 150 m² GFA and two above". */
export interface DwellingParkingRule {
  readonly baysAtOrBelow: number;
  readonly baysAbove: number;
  readonly thresholdM2: Decimal;
  readonly measure: UnitAreaMeasure;
  /** Bays per studio, where the sheet names studios separately («لكل استوديو»). */
  readonly studioBays?: number;
}

/** A use the sheet rates per area. */
export const AreaParkingUse = {
  RETAIL: 'RETAIL',
  /** «الاستعمال التجاري» — commercial, the Municipality's word, not narrowed to retail. */
  COMMERCIAL: 'COMMERCIAL',
  OFFICE: 'OFFICE',
} as const;
export type AreaParkingUse = (typeof AreaParkingUse)[keyof typeof AreaParkingUse];

/** "One bay for each 70 sq.m of retail net area". */
export interface AreaParkingRule {
  readonly use: AreaParkingUse;
  readonly bays: number;
  readonly perM2: Decimal;
  /** `NET_AREA` where the sheet says "net area"; `UNSTATED` where it names no area. */
  readonly measure: 'NET_AREA' | 'GFA' | 'UNSTATED';
}

/**
 * THE PARKING AN INSTRUMENT REQUIRES, TYPED.
 *
 * Dubai Building Code B.7.2.6.1: "Parking requirements set out in the affection
 * plan or DCR shall take precedent over Table B.13". The Municipality's sheet
 * prints a Parking row and the DDA's a `PARKING:` note, and until this type the
 * first was kept as a string nobody bound and the second was not read at all.
 *
 * NOTHING HERE IS CONVERTED. The threshold stays an area on the measure the sheet
 * names; it is not turned into a bedroom count, because a 151 m² one-bedroom and
 * a 149 m² three-bedroom are the cases that conversion gets wrong.
 */
export interface ParkingRequirement {
  readonly dwelling?: DwellingParkingRule;
  readonly byArea: readonly AreaParkingRule[];
  /** Clauses of the sheet's parking text this reader could not type. Listed, never dropped. */
  readonly unread: readonly string[];
  /** The parking text as printed. */
  readonly raw: string;
}

export interface CoverageSchedule {
  /** Fraction of plot area, e.g. `1.00` for "100% of plot area". */
  readonly podium?: Decimal;
  readonly tower?: Decimal;
  readonly raw: string;
}

/** A value an instrument states, and the box on the page it was read from. */
export interface StatedLimit<T> {
  readonly value: T;
  readonly citation: Citation;
}

/**
 * The limits one instrument states about one plot.
 *
 * EVERY FIELD IS OPTIONAL AND AN ABSENT ONE IS NEVER FILLED IN. `DJAZ1MED12RES011`
 * prints `G+11` and no FAR, no GFA, no setback and no coverage; the correct value
 * of `far` for that sheet is `undefined`, and borrowing 3.50 from the neighbouring
 * plot is the precise failure this product exists to prevent.
 */
export interface StatedLimits {
  readonly far?: StatedLimit<Decimal>;
  readonly gfaM2?: StatedLimit<Decimal>;
  /**
   * The plot area the sheet prints. Not a limit, and it binds nothing by itself:
   * it is carried so that a sheet which prints a maximum GFA and no FAR (every DDA
   * sheet) can have its ratio taken from its OWN two figures — see the FAR block
   * in `rules/instruments/sheet.ts`.
   */
  readonly plotAreaM2?: StatedLimit<Decimal>;
  readonly coverage?: StatedLimit<CoverageSchedule>;
  readonly setbacks?: StatedLimit<SetbackSchedule>;
  /**
   * Setbacks the sheet states per numbered side (the DDA's `SETBACK (M)` table).
   * Bound since 2026-10-17 by `rules/instruments/sheet.ts`, side by side, onto the
   * plot boundary that IS each surveyed leg — the building cell the tower, the
   * podium cell the podium — and only where the plot was entered as that ring.
   */
  readonly setbacksBySide?: StatedLimit<SideSetbackTable>;
  readonly height?: StatedLimit<HeightAllowance>;
  /** The sheet's own parking requirement, which B.7.2.6.1 puts above Table B.13. Its dwelling rule binds `parking.demand` (17 Oct 2026). */
  readonly parking?: StatedLimit<ParkingRequirement>;
}
