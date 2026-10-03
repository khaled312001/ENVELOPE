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
  /** Total built levels including ground: `1 + podium + typical`. */
  readonly totalLevels: number;
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
    }
  /**
   * A share of the building's height, held between a floor and a ceiling — "QUARTER
   * OF THE HEIGHT FROM NEIGHBORING PLOTS … MAXIMUM 7.5M AND A MINIMUM OF 3M", as the
   * Dubai Development Authority and Dubai Municipality both print it. Not a number:
   * the height is what the run solves for, so the distance is too.
   */
  | {
      readonly kind: 'HEIGHT_SHARE';
      readonly share: Decimal;
      readonly minMetres?: Decimal;
      readonly maxMetres?: Decimal;
      /** What it is measured from, in the sheet's own terms. */
      readonly from: string;
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
  /**
   * The setbacks as a Dubai Development Authority sheet states them: per numbered
   * side, for the building and for the podium. The faces above are filled from
   * these only where every side agrees — the sheet's sides are its own numbering,
   * and which of them faces the road is the drawing's to show, not this list's.
   */
  readonly bySide?: readonly {
    readonly side: string;
    readonly building?: SetbackValue;
    readonly podium?: SetbackValue;
    /** The cell printed N/A. */
    readonly buildingNotApplicable?: boolean;
    readonly podiumNotApplicable?: boolean;
  }[];
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
  readonly coverage?: StatedLimit<CoverageSchedule>;
  readonly setbacks?: StatedLimit<SetbackSchedule>;
  readonly height?: StatedLimit<HeightAllowance>;
}
