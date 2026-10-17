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
 *
 * ---
 *
 * **The 15 m is measured from a junction, not from every corner** (16 Oct 2026).
 * B.7.2.1 ¶4 separates the access "from local road intersection or minor T
 * junctions by not less than 15 m from the chamfered edge of the plot", and
 * Figure B.49 measures it along the side road from where the chamfer meets the
 * boundary. A corner where the road frontage meets a NEIGHBOUR is not an
 * intersection — the road runs on past the neighbour's frontage — so it asks
 * nothing of the access. This file used to take 15 m off both ends of every
 * frontage, which refused a 32 m frontage between two neighbours that the code
 * allows. A corner where the frontage meets another ROAD (or the chamfer, which
 * is itself a road boundary) is a junction; one that meets an `OTHER` boundary
 * might be one, and is treated as one, said in the reason.
 *
 * **The reader places it** (Eng. Mohamed, 16 Oct 2026): the boundary, the point
 * along it, and the arrangement — one two-way opening of 6 m, or an entry and an
 * exit of 3 m each, side by side or apart. Every opening is checked against the
 * rule above and refused in a sentence that names where it may go instead.
 */

import {
  Decimal,
  EdgeClassification,
  mmToM,
  RoadHierarchy,
  type Actor,
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

/**
 * B.7.2.1 — where a vehicle access may be, relative to junctions and roads.
 *
 * ¶5 is quoted to its end. It used to stop at "affection plan." where the page
 * prints "affection plan, as shown in Figure B.49." — a full stop the code does
 * not print, so the piece could not be found on p78 (`dbc-citations.test.ts`).
 */
export const CLAUSE_B_7_2_1: Citation = {
  instrumentId: 'DUBAI_BUILDING_CODE',
  instrumentVersion: '2021',
  clauseReference: 'B.7.2.1 ¶4, ¶5 — Vehicle access and movement, general requirements',
  documentUri: 'docs/00-source/regulations/Dubai Building Code_English_2021 Edition_compressed.pdf',
  sourcePage: 78,
  sourceBbox: [0, 0, 842, 595],
  sourceTextVerbatim:
    'Vehicle access shall be separated from local road intersection or minor T junctions ' +
    'by not less than 15 m from the chamfered edge of the plot (see Figure B.49 and ' +
    'Figure B.50). … If the building is facing more than one road, the vehicle access ' +
    'point should be from the secondary road, or as specified on the affection plan, ' +
    'as shown in Figure B.49.',
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
 * How the cars get in and out — the three arrangements Eng. Mohamed drew on
 * 16 Oct 2026, with the widths B.7.2.1 ¶8 gives internal roads: 6 m two-way,
 * 3 m one-way.
 */
export const AccessArrangement = {
  /** One opening, 6 m: in and out through the same gap. */
  TWO_WAY: 'TWO_WAY',
  /** An entry lane and an exit lane, 3 m each, side by side: one 6 m gap, signed. */
  ONE_WAY_PAIR: 'ONE_WAY_PAIR',
  /** An entry and an exit, 3 m each, at two different places. */
  ONE_WAY_SEPARATE: 'ONE_WAY_SEPARATE',
} as const;
export type AccessArrangement = (typeof AccessArrangement)[keyof typeof AccessArrangement];

export const OpeningRole = {
  ENTRY_EXIT: 'ENTRY_EXIT',
  ENTRY: 'ENTRY',
  EXIT: 'EXIT',
} as const;
export type OpeningRole = (typeof OpeningRole)[keyof typeof OpeningRole];

/** One gap in the boundary that cars cross, and which way they cross it. */
export interface AccessOpening {
  readonly role: OpeningRole;
  readonly edgeSeq: number;
  /** Distance along the edge from its start vertex to the opening's centre, m. */
  readonly centreOffsetM: Decimal;
  readonly widthM: Decimal;
  readonly start: Point;
  readonly end: Point;
}

/** Where on one boundary a reader put an opening. Absent offset: centred in what B.7.2.1 allows. */
export interface OpeningPlacement {
  readonly edgeSeq: number;
  readonly centreOffsetM?: Decimal;
}

/** The entrance a reader placed: the arrangement, the entry, and the exit where it is apart. */
export interface AccessChoice {
  readonly arrangement?: AccessArrangement;
  readonly entry: OpeningPlacement;
  /** Required for `ONE_WAY_SEPARATE`, refused for the other two. */
  readonly exit?: OpeningPlacement;
  readonly actor: Actor;
}

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
  override readonly name: string = 'AccessPlacementError';
}

/**
 * A chosen frontage that cannot take a vehicle entrance.
 *
 * Its own class because the pipeline turns it into a blocked run rather than a
 * missing layout: the choice was the reader's, the reason is a sentence about
 * their plot, and quietly drawing the recommendation instead would put an
 * entrance where they had said it does not go.
 */
export class AccessChoiceRefusedError extends AccessPlacementError {
  override readonly name = 'AccessChoiceRefusedError';
}

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

export interface AccessCandidate {
  readonly edgeSeq: number;
  readonly hierarchy: RoadHierarchy | undefined;
  /** Frontage left once the junction clearance is taken off each junction corner, m. */
  readonly usableWindowM: Decimal;
  /**
   * Where along the edge, from its start vertex, an opening may stand: the
   * stretch B.7.2.1 leaves once 15 m is taken off each end that is a junction.
   */
  readonly window: { readonly fromM: Decimal; readonly toM: Decimal };
  /** Whether each end of the edge is a road junction, so the 15 m applies there. */
  readonly junctionAt: { readonly start: boolean; readonly end: boolean };
  /**
   * Where the centre of an opening may stand on this edge, from its start
   * vertex: the window less half the opening at each end. One range for a 6 m
   * gap (two-way, or two lanes side by side), one for a 3 m lane on its own;
   * null where the window cannot hold that width. Published so a screen bounds
   * its control by the engine's figure and not by one it worked out itself.
   */
  readonly centreRange: { readonly sixM: CentreRange | null; readonly threeM: CentreRange | null };
  /** Distance along the edge from its start vertex to the driveway centre, m. */
  readonly centreOffsetM: Decimal;
  /** The whole gap on this edge: 6 m for two-way and side-by-side lanes, 3 m apart. */
  readonly widthM: Decimal;
  /** The gap on this edge, as a segment lying on the plot boundary. */
  readonly opening: { readonly start: Point; readonly end: Point };
  readonly arrangement: AccessArrangement;
  /**
   * Every opening, signed: one `ENTRY_EXIT`, or an `ENTRY` and an `EXIT`. The
   * exit of a `ONE_WAY_SEPARATE` arrangement may be on another edge.
   */
  readonly openings: readonly AccessOpening[];
  /** Lower is better. Hierarchy first, then the widest window. */
  readonly rank: number;
  readonly rationale: string;
}

export interface CentreRange {
  readonly fromM: Decimal;
  readonly toM: Decimal;
}

export interface RejectedEdge {
  readonly edgeSeq: number;
  readonly classification: EdgeClassification;
  readonly reason: string;
}

export interface AccessResult {
  /** The recommendation. Absent when no edge can legally take one. */
  readonly recommended: Traced<AccessCandidate> | undefined;
  /**
   * The frontage a named person chose, `USER_SET` by them. Absent when nobody
   * chose. The recommendation stays beside it, unchanged: a reader overruling
   * the ranking is told what they overruled.
   */
  readonly chosen: Traced<AccessCandidate> | undefined;
  /**
   * The entrance every drawing shows — the choice when there is one, otherwise
   * the recommendation. One field, so no renderer decides that order itself.
   */
  readonly entry: Traced<AccessCandidate> | undefined;
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
  /**
   * The entrance a person placed (meeting 3, 38:32, and 16 Oct 2026: the
   * boundary, the point along it, and the arrangement). Every opening must stand
   * where B.7.2.1 allows — one the code refuses is refused here too, in a
   * sentence, never redrawn as the recommendation behind the reader's back.
   */
  readonly chosen?: AccessChoice;
}

/** The clearance a junction corner asks, or zero for a corner that is not one. */
function isJunction(classification: EdgeClassification | undefined): boolean {
  return classification === EdgeClassification.ROAD || classification === EdgeClassification.OTHER;
}

/** Where on `edge` an opening may stand, by B.7.2.1 ¶4. */
function windowOf(
  edge: PlotEdge,
  edges: readonly PlotEdge[],
): { fromM: Decimal; toM: Decimal; junctionAt: { start: boolean; end: boolean } } {
  const i = edges.indexOf(edge);
  const n = edges.length;
  const prev = n > 1 ? edges[(i - 1 + n) % n] : undefined;
  const next = n > 1 ? edges[(i + 1) % n] : undefined;
  const clearance = new Decimal(JUNCTION_CLEARANCE_M);
  const start = isJunction(prev?.classification);
  const end = isJunction(next?.classification);
  const lengthM = mmToM(edge.lengthMm);
  return {
    fromM: start ? clearance : new Decimal(0),
    toM: end ? lengthM.minus(clearance) : lengthM,
    junctionAt: { start, end },
  };
}

/** "boundary 2 (P2 → P3)": the name the plot step gives it, in both languages' figures. */
function boundaryName(seq: number, n: number): string {
  return `boundary ${seq} (P${seq} → P${(seq + 1) % Math.max(n, 1)})`;
}

type Window = ReturnType<typeof windowOf>;

/** Where an opening of `widthM` may be centred in `w`, or null when it does not fit. */
function rangeIn(w: Window, widthM: Decimal): CentreRange | null {
  const fromM = w.fromM.plus(widthM.div(2));
  const toM = w.toM.minus(widthM.div(2));
  return toM.lt(fromM) ? null : { fromM, toM };
}

function rangesOf(w: Window): AccessCandidate['centreRange'] {
  return {
    sixM: rangeIn(w, new Decimal(TWO_WAY_ACCESS_WIDTH_M)),
    threeM: rangeIn(w, new Decimal(ONE_WAY_ACCESS_WIDTH_M)),
  };
}

/** Why a road frontage cannot hold an opening of `widthM`, naming the corners that cost it. */
function tooShort(edge: PlotEdge, w: Window, widthM: Decimal, n: number): string {
  const lengthM = mmToM(edge.lengthMm);
  const ends = [
    w.junctionAt.start ? `P${edge.seq}` : undefined,
    w.junctionAt.end ? `P${(edge.seq + 1) % n}` : undefined,
  ].filter((e): e is string => e !== undefined);
  if (ends.length === 0) {
    return `road frontage is ${lengthM.toFixed(2)} m, which cannot hold a ${widthM.toString()} m opening.`;
  }
  const left = Decimal.max(w.toM.minus(w.fromM), 0);
  return (
    `road frontage is ${lengthM.toFixed(2)} m. After ${JUNCTION_CLEARANCE_M} m of junction ` +
    `clearance at ${ends.join(' and at ')} (B.7.2.1) only ${left.toFixed(2)} m remains, which ` +
    `cannot hold a ${widthM.toString()} m opening.`
  );
}

/**
 * Whether the ring runs anticlockwise. The entry lane of a side-by-side pair is
 * the one on a driver's right as they turn in — the UAE drives on the right — and
 * which end of the gap that is depends on which side of the edge the plot lies.
 */
function anticlockwise(edges: readonly PlotEdge[]): boolean {
  let twice = 0;
  for (const e of edges) twice += e.start.x * e.end.y - e.end.x * e.start.y;
  return twice > 0;
}

/**
 * Check where a reader placed the entrance, and build it — or refuse in a sentence
 * that names the boundary, where the opening was put, and where it may go instead.
 */
function placeChoice(
  pick: AccessChoice,
  edges: readonly PlotEdge[],
  rejected: readonly RejectedEdge[],
): AccessCandidate {
  const arrangement = pick.arrangement ?? AccessArrangement.TWO_WAY;
  const separate = arrangement === AccessArrangement.ONE_WAY_SEPARATE;
  if (separate && pick.exit === undefined) {
    throw new AccessChoiceRefusedError(
      'The entry and the exit were to be apart, and only the entry was placed. Place the exit too, ' +
        'or put the two lanes side by side.',
    );
  }
  if (!separate && pick.exit !== undefined) {
    throw new AccessChoiceRefusedError(
      'An exit was placed on its own, and the entrance was not set as an entry and an exit apart. ' +
        'Choose "apart" to place the exit separately.',
    );
  }

  const n = edges.length;
  const gapM = new Decimal(separate ? ONE_WAY_ACCESS_WIDTH_M : TWO_WAY_ACCESS_WIDTH_M);
  const lane = new Decimal(ONE_WAY_ACCESS_WIDTH_M);

  const place = (
    at: OpeningPlacement,
    what: string,
  ): { edge: PlotEdge; w: Window; centre: Decimal } => {
    const edge = edges.find((e) => e.seq === at.edgeSeq);
    if (edge === undefined) {
      throw new AccessChoiceRefusedError(
        `The ${what} was placed on boundary ${at.edgeSeq}, and this plot has no boundary ${at.edgeSeq}.`,
      );
    }
    const where = boundaryName(edge.seq, n);
    if (edge.classification !== EdgeClassification.ROAD) {
      const why = rejected.find((r) => r.edgeSeq === edge.seq)?.reason ?? 'it is not a road frontage';
      throw new AccessChoiceRefusedError(
        `The ${what} was placed on ${where}, which cannot take one: it ${why.replace(/\.$/, '')}.`,
      );
    }
    const w = windowOf(edge, edges);
    const range = rangeIn(w, gapM);
    if (range === null) {
      throw new AccessChoiceRefusedError(
        `The ${what} was placed on ${where}, which cannot take one: its ${tooShort(edge, w, gapM, n).replace(/\.$/, '')}.`,
      );
    }
    const { fromM: lo, toM: hi } = range;
    const centre = at.centreOffsetM ?? lo.plus(hi).div(2);
    if (centre.lt(lo) || centre.gt(hi)) {
      // The reason is the end it ran past: a junction's 15 m, or the corner itself.
      const atStart = centre.lt(lo);
      const junction = atStart ? w.junctionAt.start : w.junctionAt.end;
      const vertex = atStart ? `P${edge.seq}` : `P${(edge.seq + 1) % n}`;
      throw new AccessChoiceRefusedError(
        `The ${what} on ${where} is centred ${centre.toFixed(2)} m from P${edge.seq}. A ` +
          `${gapM.toString()} m opening on this boundary must be centred between ` +
          `${lo.toFixed(2)} m and ${hi.toFixed(2)} m from P${edge.seq}` +
          (junction
            ? `: B.7.2.1 keeps it ${JUNCTION_CLEARANCE_M} m clear of the junction at ${vertex}, ` +
              'measured from the plot corner.'
            : ', so that all of it is on the boundary.'),
      );
    }
    return { edge, w, centre };
  };

  const opening = (
    role: OpeningRole,
    edge: PlotEdge,
    from: Decimal,
    to: Decimal,
  ): AccessOpening => ({
    role,
    edgeSeq: edge.seq,
    centreOffsetM: from.plus(to).div(2),
    widthM: to.minus(from),
    start: pointAlong(edge, from),
    end: pointAlong(edge, to),
  });

  const entry = place(pick.entry, separate ? 'entry' : 'vehicle entrance');
  const { edge, w, centre } = entry;
  const from = centre.minus(gapM.div(2));
  const to = centre.plus(gapM.div(2));

  let openings: AccessOpening[];
  if (arrangement === AccessArrangement.TWO_WAY) {
    openings = [opening(OpeningRole.ENTRY_EXIT, edge, from, to)];
  } else if (arrangement === AccessArrangement.ONE_WAY_PAIR) {
    // Turning in from an anticlockwise ring's road, the driver's right is the
    // edge's end; from a clockwise one, its start.
    const entryTowardEnd = anticlockwise(edges);
    openings = entryTowardEnd
      ? [opening(OpeningRole.ENTRY, edge, centre, to), opening(OpeningRole.EXIT, edge, from, centre)]
      : [opening(OpeningRole.ENTRY, edge, from, centre), opening(OpeningRole.EXIT, edge, centre, to)];
  } else {
    const exit = place(pick.exit!, 'exit');
    if (exit.edge.seq === edge.seq && exit.centre.minus(centre).abs().lt(lane)) {
      throw new AccessChoiceRefusedError(
        `The entry and the exit on ${boundaryName(edge.seq, n)} are centred ` +
          `${centre.toFixed(2)} m and ${exit.centre.toFixed(2)} m from P${edge.seq}, so the two ` +
          `${lane.toString()} m lanes overlap. Move them at least ${lane.toString()} m apart, ` +
          'or put them side by side.',
      );
    }
    openings = [
      opening(OpeningRole.ENTRY, edge, from, to),
      opening(OpeningRole.EXIT, exit.edge, exit.centre.minus(lane.div(2)), exit.centre.plus(lane.div(2))),
    ];
  }

  const words: Record<AccessArrangement, string> = {
    TWO_WAY: `one two-way opening, ${gapM.toString()} m`,
    ONE_WAY_PAIR: `an entry lane and an exit lane side by side, ${lane.toString()} m each`,
    ONE_WAY_SEPARATE: `an entry and an exit apart, ${lane.toString()} m each`,
  };
  return {
    edgeSeq: edge.seq,
    hierarchy: edge.roadHierarchy,
    usableWindowM: w.toM.minus(w.fromM),
    window: { fromM: w.fromM, toM: w.toM },
    junctionAt: w.junctionAt,
    centreRange: rangesOf(w),
    centreOffsetM: centre,
    widthM: gapM,
    opening: { start: pointAlong(edge, from), end: pointAlong(edge, to) },
    arrangement,
    openings,
    rank: -2,
    rationale: `placed by the reader: ${words[arrangement]}, inside the stretch B.7.2.1 leaves`,
  };
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
    // 15 m off each corner that is a junction, and the opening needs its own width.
    const w = windowOf(edge, edges);
    const usableWindowM = w.toM.minus(w.fromM);
    if (usableWindowM.lt(widthM)) {
      rejected.push({
        edgeSeq: edge.seq,
        classification: edge.classification,
        reason: tooShort(edge, w, widthM, edges.length),
      });
      continue;
    }

    const preference =
      edge.roadHierarchy === undefined ? 99 : HIERARCHY_PREFERENCE[edge.roadHierarchy];
    const statedByPlan = input.affectionPlanAccessEdgeSeq === edge.seq;
    // Centred in the stretch B.7.2.1 leaves — furthest from any junction, which
    // is the most defensible position when junction locations are unknown.
    const centreOffsetM = w.fromM.plus(w.toM).div(2);
    const opening = {
      start: pointAlong(edge, centreOffsetM.minus(widthM.div(2))),
      end: pointAlong(edge, centreOffsetM.plus(widthM.div(2))),
    };

    candidates.push({
      edgeSeq: edge.seq,
      hierarchy: edge.roadHierarchy,
      usableWindowM,
      window: { fromM: w.fromM, toM: w.toM },
      junctionAt: w.junctionAt,
      centreRange: rangesOf(w),
      centreOffsetM,
      widthM,
      opening,
      arrangement: AccessArrangement.TWO_WAY,
      openings: [{ role: OpeningRole.ENTRY_EXIT, edgeSeq: edge.seq, centreOffsetM, widthM, ...opening }],
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
  const pick = input.chosen;
  const chosen =
    pick === undefined
      ? undefined
      : tracer.userSet('access.vehicle_entry_chosen', placeChoice(pick, edges, rejected), {
          actor: pick.actor,
          label: 'Vehicle entrance, as placed',
          unit: 'm',
        });

  if (!best) {
    return { recommended: undefined, chosen, entry: chosen, candidates, rejected, notAssessed };
  }

  const frontage = mmToM(edges.find((e) => e.seq === best.edgeSeq)!.lengthMm);
  const recommended = tracer.derived('access.vehicle_entry', best, {
    rule: { ruleId: 'DBC.B.7.2.1', citation: CLAUSE_B_7_2_1 },
    formula:
      `${boundaryName(best.edgeSeq, edges.length)}, centred at ${best.centreOffsetM.toFixed(2)} m along a ` +
      `${frontage.toFixed(2)} m road frontage, between ${best.window.fromM.toFixed(2)} m and ` +
      `${best.window.toM.toFixed(2)} m clear of its junctions, ` +
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

  return { recommended, chosen, entry: chosen ?? recommended, candidates, rejected, notAssessed };
}
