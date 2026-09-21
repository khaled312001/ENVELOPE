/**
 * Shared domain vocabulary — PRD §10.2.
 *
 * These are the types every package agrees on. They carry no behaviour: the
 * geometry kernel, the rule engine and the invariant layer all speak this
 * vocabulary without importing each other.
 */

import type { Decimal, Mm, Mm2 } from './numeric.js';
import type { Traced, TracedDecimal } from './provenance/traced.js';

// ---------------------------------------------------------------------------
// Plot
// ---------------------------------------------------------------------------

export const LandUse = {
  RESIDENTIAL_MULTI: 'RESIDENTIAL_MULTI',
  RESIDENTIAL_SINGLE: 'RESIDENTIAL_SINGLE',
  COMMERCIAL: 'COMMERCIAL',
  MIXED_USE: 'MIXED_USE',
  INDUSTRIAL: 'INDUSTRIAL',
} as const;
export type LandUse = (typeof LandUse)[keyof typeof LandUse];

/** Phase 0 covers one land use. Anything else is rejected, not silently handled. */
export const PHASE_0_LAND_USES: ReadonlySet<LandUse> = new Set([LandUse.RESIDENTIAL_MULTI]);

/**
 * PRD §14.1: rectilinear and simple convex polygons only, "enforced at the data
 * layer via `shape_class`, not by convention". `COMPLEX` is rejected with a
 * message naming the restriction — never approximated.
 */
export const ShapeClass = {
  RECTILINEAR: 'RECTILINEAR',
  SIMPLE_CONVEX: 'SIMPLE_CONVEX',
  COMPLEX: 'COMPLEX',
} as const;
export type ShapeClass = (typeof ShapeClass)[keyof typeof ShapeClass];

/**
 * PRD `FR-PLT-001 AC3`: "Edge classification is mandatory for every edge; no
 * default." §873 lists exactly these four. Deliberately not automated in Phase 0
 * — automatic classification needs a road-hierarchy GIS layer whose existence is
 * open question Q6.
 */
export const EdgeClassification = {
  ROAD: 'ROAD',
  ADJACENT_PLOT: 'ADJACENT_PLOT',
  OPEN_SPACE: 'OPEN_SPACE',
  OTHER: 'OTHER',
} as const;
export type EdgeClassification = (typeof EdgeClassification)[keyof typeof EdgeClassification];

/** Road hierarchy, which keys the setback table for `ROAD` edges. */
export const RoadHierarchy = {
  ARTERIAL: 'ARTERIAL',
  COLLECTOR: 'COLLECTOR',
  LOCAL: 'LOCAL',
  ACCESS: 'ACCESS',
} as const;
export type RoadHierarchy = (typeof RoadHierarchy)[keyof typeof RoadHierarchy];

/** A point on the 1 mm grid, in the local metric CRS (UTM 40N). PRD §14.4. */
export interface Point {
  readonly x: Mm;
  readonly y: Mm;
}

/** A closed ring. First vertex is not repeated at the end. */
export type Ring = readonly Point[];

export interface PlotEdge {
  readonly seq: number;
  readonly start: Point;
  readonly end: Point;
  /** Mandatory. No default — `FR-PLT-001 AC3`. */
  readonly classification: EdgeClassification;
  /** Required when `classification === 'ROAD'`; forbidden otherwise. */
  readonly roadHierarchy?: RoadHierarchy;
  readonly lengthMm: Mm;
  /** Bearing of the outward normal, degrees clockwise from grid north. */
  readonly bearingDeg: Decimal;
}

export interface Plot {
  readonly plotId: string;
  readonly tenantId: string;
  readonly plotNumber: string;
  readonly community: string;
  readonly landUse: LandUse;
  readonly ring: Ring;
  readonly edges: readonly PlotEdge[];
  readonly shapeClass: ShapeClass;
  /** Area as printed on the affection plan, in m². Compared against `computedArea`. */
  readonly statedAreaM2: Decimal | undefined;
  readonly computedAreaMm2: Mm2;
  /**
   * `FR-PLT-001 AC2` blocks when stated and computed area deviate by > 2%.
   * See Q23: an architect holds dimensions, not coordinates, so this fires on
   * the primary input path far more often than the PRD assumes.
   */
  readonly areaMismatch: boolean;
  readonly principalAxisDeg: Decimal;
  readonly mbrWidthMm: Mm;
  readonly mbrDepthMm: Mm;
  readonly convexityRatio: Decimal;
  readonly frontageCount: number;
}

// ---------------------------------------------------------------------------
// Parking-in-FAR — PRD FR-DEF-002, open question Q1
// ---------------------------------------------------------------------------

/**
 * Whether parking area counts toward FAR/GFA.
 *
 * `FR-DEF-002` forbids a default and forbids `ASSUMED`: the value is either
 * `DERIVED` from a cited rule or `USER_SET` by a named user, and capacity
 * computation is blocked until one exists. It swings capacity 15–35%.
 */
export const ParkingInFar = {
  COUNTS_TOWARD_FAR: 'COUNTS_TOWARD_FAR',
  EXCLUDED_FROM_FAR: 'EXCLUDED_FROM_FAR',
  /** The honest state when the regulation does not settle it. Blocks computation. */
  OPEN_REGULATORY_QUESTION: 'OPEN_REGULATORY_QUESTION',
} as const;
export type ParkingInFar = (typeof ParkingInFar)[keyof typeof ParkingInFar];

// ---------------------------------------------------------------------------
// Envelope and capacity — PRD §10.2, §15
// ---------------------------------------------------------------------------

/** Which rule bound a dimension, and by how much the next candidate missed. */
export interface BindingConstraint {
  readonly dimension: string;
  readonly ruleId: string;
  readonly label: string;
  readonly valueM: Decimal;
  /**
   * The runner-up. `FR-CAP-001` requires both to be reported when they bind
   * within 1% — "which limit binds" is only useful if near-ties are visible.
   */
  readonly runnerUp?: {
    readonly ruleId: string;
    readonly label: string;
    readonly valueM: Decimal;
    readonly withinOnePercent: boolean;
  };
}

export interface BuildableEnvelope {
  readonly setbackPermittedFootprint: TracedDecimal;
  readonly coverageCap: TracedDecimal;
  readonly podiumFootprint: TracedDecimal;
  readonly towerPlateCap: TracedDecimal;
  readonly heightCeilingM: TracedDecimal;
  readonly floorToFloorM: TracedDecimal;
  readonly maxLevelsByHeight: Traced<number>;
  readonly bindingConstraints: readonly BindingConstraint[];
  /** Per-edge setback actually applied, keyed by edge seq. */
  readonly appliedSetbacks: readonly {
    readonly seq: number;
    readonly valueM: Decimal;
    readonly ruleId: string;
    /**
     * The parameter the rule governs — `setback.road`, `setback.adjacent_plot`.
     *
     * Carried because the independent validator joins emitted values to
     * constraints on this key. Four edges collapse onto two parameters here,
     * and without the parameter id the join would have to be reconstructed from
     * the edge classification by a second piece of code that could disagree
     * with the first.
     */
    readonly parameterId: string;
    /** The same value as a traced node, so a report can link the edge to its clause. */
    readonly traced: TracedDecimal;
  }[];
  /** Iterations the setback↔floor-count fixpoint took to settle. See `capacity`. */
  readonly fixpointIterations: number;
  readonly fixpointConverged: boolean;
}

/**
 * The five capacity concepts — PRD §15.1, Principle 6: "never merged, never
 * averaged, each with its own derivation and its own field".
 *
 * Note what is *not* here: there is no `realistic`, `expected` or `likely`
 * field. §15.3 — "absence is enforced by schema — the field does not exist".
 */
export const CapacityBand = {
  /** A — what FAR and the area caps permit. */
  REGULATORY: 'REGULATORY',
  /** B — what the envelope physically holds within height and footprint limits. */
  GEOMETRIC: 'GEOMETRIC',
  /** C — what the achievable parking supply can support. */
  PARKING: 'PARKING',
} as const;
export type CapacityBand = (typeof CapacityBand)[keyof typeof CapacityBand];

export interface CapacityResult {
  readonly regulationLimitedGfa: TracedDecimal;
  /**
   * What the answer *achieves* against the three headline caps.
   *
   * A permitted maximum and an achieved value are different numbers and the
   * product needs both: §15.2's "where to push" is the gap between them, and
   * the independent validator has nothing to check without them — a validator
   * handed only the caps would be re-reading the rule base and agreeing with
   * itself.
   *
   * All three are derived from values already emitted above, and all three are
   * traced. They are computed in the engine rather than in a handler for the
   * usual reason: a number a user sees and cannot click through to is a number
   * this product does not publish.
   */
  readonly achievedFar: TracedDecimal;
  readonly achievedCoveragePct: TracedDecimal;
  readonly achievedHeightM: TracedDecimal;
  /** The FAR cap that governed, carried so INV-03 and INV-17 have both operands. */
  readonly permittedFar: TracedDecimal;
  readonly geometryLimitedGfa: TracedDecimal;
  readonly parkingLimitedGfa: TracedDecimal;
  readonly governingBand: CapacityBand;
  readonly governingGfa: TracedDecimal;
  readonly governingConstraint: BindingConstraint;
  /** Headroom to the next-binding band — "where to push" (PRD §15.2). */
  readonly headroomToNextM2: Decimal;
  readonly nextBindingBand: CapacityBand;
  /** PRD §15.4: the floor that does not fit is real loss, never absorbed. */
  readonly integerGranularityLossM2: Decimal;
  /** PRD §15.3. Defaults to 1.00, `USER_SET`, never a system estimate. */
  readonly userRealismDiscount: TracedDecimal;
  readonly levels: Traced<number>;
}

// ---------------------------------------------------------------------------
// Parking — PRD FR-PRK-001
// ---------------------------------------------------------------------------

export interface UnitTypeMix {
  readonly typeId: string;
  readonly label: string;
  readonly share: Decimal;
  readonly nsaM2: Decimal;
}

export interface ParkingResult {
  readonly residentBays: TracedDecimal;
  readonly visitorBays: TracedDecimal;
  readonly totalBays: Traced<number>;
  readonly bayAreaFactorM2: TracedDecimal;
  readonly requiredAreaM2: TracedDecimal;
  readonly availableAreaPerLevelM2: TracedDecimal;
  /**
   * The fraction of a parking level that is usable for bays and aisles.
   *
   * Emitted rather than consumed and dropped, because the level *layout* needs
   * the same number: what is not usable is precisely the core, plant and ramp
   * landing the packer must deduct before it places a bay. Two independent
   * declarations of one fraction is how a run comes to report 32 bays on a
   * drawing and 41 in a table.
   */
  readonly usableFraction: TracedDecimal;
  /**
   * Total parking area the declared levels actually supply, and the bays that
   * fit in it.
   *
   * `requiredAreaM2` is demand; these two are supply, and conflating them is
   * how a scheme comes to report parking it cannot build. INV-12 compares
   * provided bays × factor against {@link availableAreaM2}; INV-13 compares
   * provided against required. Both were previously computed inside the solver
   * and discarded, which meant the two checks that exist to catch an
   * over-claimed supply had no supply to look at.
   */
  readonly availableAreaM2: TracedDecimal;
  readonly providedBays: Traced<number>;
  /**
   * Bays one average unit of the declared mix consumes.
   *
   * The conversion factor between a bay count and a unit count, and therefore
   * the hinge of Band C. Emitted rather than kept internal so that the demand
   * of the *governing* capacity can be stated — see `RunOutput`.
   */
  readonly baysPerUnit: TracedDecimal;
  /** Visitor bays ÷ resident bays, as achieved — the operand the visitor rule is checked against. */
  readonly achievedVisitorFraction: TracedDecimal;
  readonly levelsRequired: Traced<number>;
  readonly levelsAvailable: Traced<number>;
  readonly headroomBays: Decimal;
  readonly supportableUnitCeiling: Traced<number>;
  readonly podiumImplication: string;
}

// ---------------------------------------------------------------------------
// Claims — PRD §2.2 / §16.5, Principle 8
// ---------------------------------------------------------------------------

/**
 * The five-way claim statement.
 *
 * PRD Principle 7: "the validator agreeing with the generator is
 * self-consistency, nothing more. No output, no report, no marketing material
 * may describe it as compliance." The statement is structural in the report
 * template rather than a disclaimer someone can delete.
 */
export const ClaimStatus = {
  SUPPORTED: 'SUPPORTED',
  PARTIAL: 'PARTIAL',
  MEASURED: 'MEASURED',
  NOT_ASSESSED: 'NOT_ASSESSED',
  NEVER_CLAIMED: 'NEVER_CLAIMED',
} as const;
export type ClaimStatus = (typeof ClaimStatus)[keyof typeof ClaimStatus];

export interface ClaimStatement {
  readonly selfConsistency: { status: ClaimStatus; detail: string };
  readonly ruleCoverage: { status: ClaimStatus; detail: string };
  readonly geometricValidity: { status: ClaimStatus; detail: string };
  readonly professionalAgreement: { status: ClaimStatus; detail: string };
  readonly regulatoryValidity: { status: ClaimStatus; detail: string };
}
