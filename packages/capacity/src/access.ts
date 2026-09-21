/**
 * Vehicle access — where the driveway goes.
 *
 * The second half of the client's priority. He said "الباركينج **والمداخل**",
 * and then specified the rule himself, twice, without being asked:
 *
 *   "عرض المدخل هيبقى 6 متر، عشان 3 متر رايح و 3 متر راجع... ومقدرش أقلل أكتر
 *    من 6 متر، عشان موجود في الدبي بيلدنج كود إن الطريق الواحد 3 متر."   — 29:18
 *
 *   "لو عندي جار من هنا مش قادر أحط مدخل... بس أقدر أحط مدخل من هنا أو من هنا." — 30:29
 *
 * And what he actually wants from the software:
 *
 *   "أنا عايز الـ software يقول لي حط المدخل فين... أدوس هنا يقول لي إن المدخل
 *    من هنا أحسن."   — 29:02
 *
 * ---
 *
 * **This turned out to be more mechanizable than it first looked.** The initial
 * reading was that ≥15 m from a junction needs a road-network layer nobody has.
 * But B.7.2.1 measures that distance "from the chamfered edge of the plot" — the
 * plot corner, which is a vertex the engine already holds. And the clause's other
 * two constraints are pure edge attributes the domain model already carries:
 *
 * - Access goes on a `ROAD` edge. A boundary shared with a neighbour is not an
 *   access option, which is the client's own rule in his own words.
 * - "If the building is facing more than one road, the vehicle access point
 *   should be from the **secondary** road" — and `RoadHierarchy` ranks exactly
 *   that.
 *
 * So the placement is derivable today. What is *not* derivable is whether a real
 * junction sits opposite the chosen point (B.7.2.1's "shall not be located
 * opposite a T junction"), because that needs the road network. That single
 * residue is reported as NOT ASSESSED rather than being allowed to block the
 * ninety per cent that is answerable.
 */

import {
  Decimal,
  EdgeClassification,
  mmToM,
  RoadHierarchy,
  type Citation,
  type Mm,
  type Plot,
  type PlotEdge,
  type Point,
  type Traced,
  type Tracer,
} from '@envelope/core';

// ---------------------------------------------------------------------------
// Rule data
// ---------------------------------------------------------------------------

/** B.7.2.1 — where a vehicle access may be, relative to junctions and roads. */
export const CLAUSE_B_7_2_1: Citation = {
  instrumentId: 'DUBAI_BUILDING_CODE',
  instrumentVersion: '2021',
  clauseReference: 'B.7.2.1 — Vehicle access and movement, general requirements',
  documentUri: 'docs/00-source/regulations/Dubai Building Code_English_2021 Edition_compressed.pdf',
  sourcePage: 78,
  sourceBbox: [0, 0, 842, 595],
  sourceTextVerbatim:
    'Vehicle access shall be separated from local road intersection or minor T junctions ' +
    'by not less than 15 m from the chamfered edge of the plot (see Figure B.49 and ' +
    'Figure B.50). … If the building is facing more than one road, the vehicle access ' +
    'point should be from the secondary road, or as specified on the affection plan.',
};

/** Table B.11 — the two-way driveway width the 6 m comes from. */
export const TABLE_B11_DRIVEWAY: Citation = {
  instrumentId: 'DUBAI_BUILDING_CODE',
  instrumentVersion: '2021',
  clauseReference: 'B.7.2.4 Table B.11 — Minimum dimensions for parking, driveway width',
  documentUri: 'docs/00-source/regulations/Dubai Building Code_English_2021 Edition_compressed.pdf',
  sourcePage: 86,
  sourceBbox: [0, 0, 842, 595],
  sourceTextVerbatim:
    'The dimension of car parking bays and driveways shall be not less than the minimum ' +
    'values given in Table B.11.',
};

/** Metres of clear plot frontage that must sit between access and each corner. */
export const JUNCTION_CLEARANCE_M = '15';

/** Two-way access: 3 m in, 3 m out. Table B.11's two-way driveway width. */
export const TWO_WAY_ACCESS_WIDTH_M = '6';

/** One-way access. Only where a scheme genuinely has separate in and out points. */
export const ONE_WAY_ACCESS_WIDTH_M = '3';

/**
 * Preference order for the road an access takes.
 *
 * Lower is better. This is B.7.2.1's "should be from the secondary road" made
 * operable: an ACCESS road is the most secondary thing available, an ARTERIAL
 * the least, and B.7.1(h) separately discourages roads "carrying heavy volumes
 * of traffic".
 */
const HIERARCHY_PREFERENCE: Readonly<Record<RoadHierarchy, number>> = {
  [RoadHierarchy.ACCESS]: 0,
  [RoadHierarchy.LOCAL]: 1,
  [RoadHierarchy.COLLECTOR]: 2,
  [RoadHierarchy.ARTERIAL]: 3,
};

export class AccessPlacementError extends Error {
  override readonly name = 'AccessPlacementError';
}

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

export interface AccessCandidate {
  readonly edgeSeq: number;
  readonly hierarchy: RoadHierarchy | undefined;
  /** Frontage left once the junction clearance is taken off both corners, m. */
  readonly usableWindowM: Decimal;
  /** Distance along the edge from its start vertex to the driveway centre, m. */
  readonly centreOffsetM: Decimal;
  readonly widthM: Decimal;
  /** The driveway opening, as a segment lying on the plot boundary. */
  readonly opening: { readonly start: Point; readonly end: Point };
  /** Lower is better. Hierarchy first, then the widest window. */
  readonly rank: number;
  readonly rationale: string;
}

export interface RejectedEdge {
  readonly edgeSeq: number;
  readonly classification: EdgeClassification;
  readonly reason: string;
}

export interface AccessResult {
  /** The recommendation. Absent when no edge can legally take one. */
  readonly recommended: Traced<AccessCandidate> | undefined;
  /** Every viable option, best first — the user may overrule the ranking. */
  readonly candidates: readonly AccessCandidate[];
  readonly rejected: readonly RejectedEdge[];
  /** What this placement does not establish. Never silently omitted. */
  readonly notAssessed: readonly string[];
}

// ---------------------------------------------------------------------------
// Placement
// ---------------------------------------------------------------------------

function pointAlong(edge: PlotEdge, distanceM: Decimal): Point {
  const lengthM = mmToM(edge.lengthMm);
  const t = lengthM.isZero() ? new Decimal(0) : distanceM.div(lengthM);
  const lerp = (a: Mm, b: Mm): Mm =>
    Math.round(new Decimal(a).plus(new Decimal(b).minus(a).times(t)).toNumber()) as Mm;
  return { x: lerp(edge.start.x, edge.end.x), y: lerp(edge.start.y, edge.end.y) };
}

export interface PlaceAccessInput {
  readonly tracer: Tracer;
  readonly plot: Plot;
  readonly edges: readonly PlotEdge[];
  /** Two-way unless the scheme separates entry and exit. Default two-way. */
  readonly oneWay?: boolean;
  /**
   * The affection plan's stated access side, when it names one.
   *
   * B.7.2.1 says the access point should be from the secondary road "**or as
   * specified on the affection plan**" — so a stated side outranks the hierarchy
   * preference. The Trakhees sheets carry an "Access Side" box for exactly this.
   */
  readonly affectionPlanAccessEdgeSeq?: number;
}

/**
 * Choose where the vehicle access goes, and say why.
 *
 * Returns every viable option rather than only the winner: the client's ask was
 * "tell me the entrance is better from here", which is a recommendation he can
 * disagree with, not a decision made on his behalf.
 */
export function placeVehicleAccess(input: PlaceAccessInput): AccessResult {
  const { tracer, edges } = input;
  const widthM = new Decimal(
    input.oneWay ? ONE_WAY_ACCESS_WIDTH_M : TWO_WAY_ACCESS_WIDTH_M,
  );
  const clearance = new Decimal(JUNCTION_CLEARANCE_M);

  if (edges.length === 0) {
    throw new AccessPlacementError('a plot with no edges has no frontage to take an access from');
  }

  const rejected: RejectedEdge[] = [];
  const candidates: AccessCandidate[] = [];

  for (const edge of edges) {
    if (edge.classification !== EdgeClassification.ROAD) {
      rejected.push({
        edgeSeq: edge.seq,
        classification: edge.classification,
        reason:
          edge.classification === EdgeClassification.ADJACENT_PLOT
            ? 'shares a boundary with a neighbouring plot — a vehicle cannot enter through it'
            : `classified ${edge.classification}; vehicle access is only taken from a road frontage`,
      });
      continue;
    }

    const lengthM = mmToM(edge.lengthMm);
    // 15 m off each corner, and the opening itself needs its own width.
    const usableWindowM = lengthM.minus(clearance.times(2));
    if (usableWindowM.lt(widthM)) {
      rejected.push({
        edgeSeq: edge.seq,
        classification: edge.classification,
        reason:
          `road frontage is ${lengthM.toFixed(2)} m. After ${clearance.toString()} m of ` +
          `junction clearance at each corner (B.7.2.1) only ${usableWindowM.toFixed(2)} m ` +
          `remains, which cannot hold a ${widthM.toString()} m opening.`,
      });
      continue;
    }

    const preference =
      edge.roadHierarchy === undefined ? 99 : HIERARCHY_PREFERENCE[edge.roadHierarchy];
    const statedByPlan = input.affectionPlanAccessEdgeSeq === edge.seq;
    // Centre the opening in the usable window — furthest from both corners, which
    // is the most defensible position when junction locations are unknown.
    const centreOffsetM = lengthM.div(2);

    candidates.push({
      edgeSeq: edge.seq,
      hierarchy: edge.roadHierarchy,
      usableWindowM,
      centreOffsetM,
      widthM,
      opening: {
        start: pointAlong(edge, centreOffsetM.minus(widthM.div(2))),
        end: pointAlong(edge, centreOffsetM.plus(widthM.div(2))),
      },
      // Stated-on-the-plan wins outright; otherwise the more secondary road wins,
      // and a wider window breaks a tie because it leaves more room to move the
      // opening once real junction positions are known.
      rank: statedByPlan ? -1 : preference,
      rationale: statedByPlan
        ? 'named as the access side on the affection plan, which B.7.2.1 defers to explicitly'
        : edge.roadHierarchy === undefined
          ? 'road frontage of unstated hierarchy — classify it to rank this properly'
          : `${edge.roadHierarchy} road; B.7.2.1 prefers the more secondary frontage where a ` +
            `plot faces more than one`,
    });
  }

  candidates.sort(
    (a, b) => a.rank - b.rank || b.usableWindowM.comparedTo(a.usableWindowM) || a.edgeSeq - b.edgeSeq,
  );

  const notAssessed = [
    'Whether a T junction sits opposite the chosen opening (B.7.2.1: "Vehicle access shall ' +
      'not be located opposite a T junction"). That needs the surrounding road network, ' +
      'which no affection plan carries.',
    'RTA approval. B.7.2.1 defers the location to RTA requirements and the Dubai access ' +
      'management manual; nothing here substitutes for that.',
    'Whether a traffic impact study is required for this development.',
  ];

  const best = candidates[0];
  if (!best) {
    return { recommended: undefined, candidates, rejected, notAssessed };
  }

  const recommended = tracer.derived('access.vehicle_entry', best, {
    rule: { ruleId: 'DBC.B.7.2.1', citation: CLAUSE_B_7_2_1 },
    formula:
      `edge ${best.edgeSeq}, centred at ${best.centreOffsetM.toFixed(2)} m along a ` +
      `${best.usableWindowM.plus(clearance.times(2)).toFixed(2)} m road frontage, ` +
      `${best.widthM.toString()} m wide`,
    unit: 'm',
    detail: {
      rationale: best.rationale,
      widthBasis:
        `${best.widthM.toString()} m is Table B.11's two-way driveway width — the client's ` +
        `own reading of it: "3 متر رايح و 3 متر راجع".`,
      widthCitation: TABLE_B11_DRIVEWAY.clauseReference,
      rejectedEdges: rejected.length,
      notAssessed,
    },
  });

  return { recommended, candidates, rejected, notAssessed };
}
