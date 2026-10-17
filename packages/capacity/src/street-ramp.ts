/**
 * The ramps from the street, where the ground floor does not park.
 *
 * Every other ramp in the building stands in one strip, stacked level over level
 * (`layout.ts`), because every other ramp joins two parking levels one storey
 * apart. Plot 6468096 is the case that strip cannot answer: the architect puts
 * shops on the ground floor (A-104) and parks B3–B1 below it and P1–P5 above it.
 * B1 and P1 are then two storeys apart with a shop floor between them, so no ramp
 * of the strip joins them, and the street has to reach each of them by a ramp of
 * its own — one down to B1 and one up to P1, both starting on the ground floor.
 *
 * WHAT THIS USED TO BE. A sentence in `notModelled`: "The ramp from the street
 * down to the first basement." It was true, and the bay count beside it was not:
 * B1 and P1 were drawn and counted with every bay the street ramps stand on, and
 * the most constrained ramp in the building charged nothing anywhere.
 *
 * THE RULE, STATED. From the entrance the reader placed (or the B.7.2.1
 * recommendation), two fixed placements, both tried and both reported:
 *
 * - **Straight in.** A straight 6 m approach inside the plot (B.7.2.3.3 ¶4: "a
 *   straight, and preferably level, 6 m long access should be provided before
 *   vehicle access barriers"), then each ramp straight on, side by side — the
 *   ramp down on a driver's right as they turn in, the ramp up on the left (a
 *   drafting rule, the side a car keeps to; no clause says it).
 * - **Along the frontage.** A landing square to the boundary, then each ramp
 *   turning off it and running along the boundary — down to the right, up to the
 *   left. The landing is as deep and as wide as a car needs to make that turn at
 *   Table B.9's curved-ramp figures (4 m inner radius, 3.5 m lane), taken by
 *   analogy as `turning.ts` takes them for an aisle, and ASSUMED for it.
 *
 * Each ramp is sized by Tables B.9 and B.10 for the storey it climbs
 * (`straightRampRequirement`): its length follows the floor-to-floor, so a stated
 * storey height moves it. The one that gives up fewer bays on B1 and P1 is kept,
 * and the other's count or refusal is in the formula — two fixed candidates, both
 * reported, exactly as the orientation sweep is. It is never a search over
 * positions: that is the optimiser of meeting 02's 34:37, a `TRADEOFF` value
 * `PHASE_0_CLASSES` refuses by construction.
 *
 * WHAT A STREET RAMP COSTS, AND WHERE. A ramp from grade down to B1 stands in B1's
 * storey: on B1 it takes the bays under it and cuts the aisles it crosses, and the
 * ground floor's slab is open over it. A ramp from grade up to P1 stands on the
 * ground floor and opens P1's slab: on P1 it takes the bays over the opening and
 * cuts the aisles there. So on each level it reaches the level is re-flooded from
 * the ramp's end, by `circulation.ts`'s own graph: a bay the cut strands is given
 * up like a bay under the ramp, and a ramp whose end lands on no aisle, or which
 * cuts the level off from the ramp to the next level, is refused in a sentence.
 * On the ground floor, which holds no bays, the area the landing and the ramps
 * take is published in square metres and nothing is deducted from it — how it
 * bears on the ground floor's floor area is NOT ASSESSED, and said.
 *
 * NOT DONE, AND SAID: the ramps are straight (a curved street ramp, which the
 * architect draws on A-104, is not placed); the gate level above the road
 * (B.4.2.1) is not added to the climb; and a frontage that is not square to the
 * parking level's rows is not given a ramp at all, because where it would land
 * among those rows is not something this module can say.
 */

import {
  Decimal,
  type Citation,
  type Plot,
  type PlotEdge,
  type Traced,
  type TracedDecimal,
  type Tracer,
} from '@envelope/core';
import { area, containsPoint, intersect, type Pt, type Ring } from '@envelope/geometry';

import type { AccessCandidate, AccessOpening, CentreRange } from './access.js';
import { servingNode, traceCirculation, type CircRect } from './circulation.js';
import { RectKind, RING_AISLE_ROW } from './layout.js';
import type { LevelPlan, WorldRect } from './level-plan.js';
import { straightRampRequirement, type StraightRampRequirement } from './ramp-rules.js';

const DBC_PDF = 'docs/00-source/regulations/Dubai Building Code_English_2021 Edition_compressed.pdf';

/** B.7.2.3.3 ¶4 — the straight approach before the barrier. Held to p84 by `dbc-citations.test.ts`. */
export const CLAUSE_B_7_2_3_3_4: Citation = {
  instrumentId: 'DUBAI_BUILDING_CODE',
  instrumentVersion: '2021',
  clauseReference: 'B.7.2.3.3 ¶4 — Parking areas technical requirements, entry and exit',
  documentUri: DBC_PDF,
  sourcePage: 84,
  sourceBbox: [0, 0, 842, 595],
  sourceTextVerbatim:
    'For parking entry and exit, a straight, and preferably level, 6 m long access should be ' +
    'provided before vehicle access barriers as shown in Figure B.57.',
};

/** The approach B.7.2.3.3 ¶4 asks, metres. A "should", taken as stated. */
export const STREET_APPROACH_M = '6';

/**
 * The square a car turns 90° in, off the landing onto a ramp along the boundary:
 * Table B.9's curved-ramp inner radius and lane, 4 m + 3.5 m. By analogy — the
 * code gives no turning figure for a landing — and so ASSUMED, with that basis.
 */
const TURN_SQUARE_M = '7.5';
const TURN_BASIS =
  'DBC Part B states no turning figure for a car turning off an entrance landing onto a ramp. ' +
  'Table B.9 gives, for a curved ramp, a minimum inner circle radius of 4 m and a minimum lane ' +
  'of 3.5 m, the nearest figures the code gives for a car turning, so the landing a ramp along ' +
  'the boundary turns off is taken as 4 + 3.5 = 7.5 m square.';

/** Overlap below this, in mm², is a shared edge rather than a crossing. As `grade.ts`. */
const TOUCH_MM2 = 10_000;
/** A frontage within half a degree of a row direction is square to the rows. */
const SQUARE_SIN = Math.sin((0.5 * Math.PI) / 180);
/** Rectangles closer than this, mm, on either axis do not overlap: the 1 mm grid's rounding. */
const SLIVER_MM = 2;

export const StreetRampDirection = {
  /** From grade down to the first basement. */
  DOWN: 'DOWN',
  /** From grade up to the first podium parking level. */
  UP: 'UP',
} as const;
export type StreetRampDirection = (typeof StreetRampDirection)[keyof typeof StreetRampDirection];

export const StreetRampPlacement = {
  STRAIGHT_IN: 'STRAIGHT_IN',
  ALONG_FRONTAGE: 'ALONG_FRONTAGE',
} as const;
export type StreetRampPlacement = (typeof StreetRampPlacement)[keyof typeof StreetRampPlacement];

/** The two placements in the order they are tried, and the words a reader sees. */
export const STREET_RAMP_PLACEMENT_NAME: Readonly<Record<StreetRampPlacement, string>> = {
  STRAIGHT_IN: 'straight in from the entrance',
  ALONG_FRONTAGE: 'along the frontage from the entrance',
};

const LEVEL_OF: Readonly<Record<StreetRampDirection, 'B1' | 'P1'>> = { DOWN: 'B1', UP: 'P1' };
const BEYOND_OF: Readonly<Record<StreetRampDirection, string>> = { DOWN: 'B2', UP: 'P2' };
const WHAT_OF: Readonly<Record<StreetRampDirection, string>> = {
  DOWN: 'ramp down to B1',
  UP: 'ramp up to P1',
};

export interface StreetRamp {
  readonly direction: StreetRampDirection;
  /** The parking level the ramp reaches. */
  readonly levelId: 'B1' | 'P1';
  /** Plot millimetres. */
  readonly world: readonly Pt[];
  /** The low end: on B1 for the ramp down, at grade for the ramp up. */
  readonly foot: readonly [Pt, Pt];
  /** The high end: at grade for the ramp down, on P1 for the ramp up. */
  readonly head: readonly [Pt, Pt];
}

/** A level a street ramp reaches, as laid out with the ramp on it. */
export interface StreetLevel {
  readonly levelId: 'B1' | 'P1';
  /** The shared layout less the bays under the ramp and the bays its cut strands; aisles cut. */
  readonly rects: readonly WorldRect[];
  readonly bayCount: Traced<number>;
  readonly givenUp: Traced<number>;
  /** From the ramp's end straight on to the first aisle ahead, where it does not land on one. */
  readonly drive?: readonly Pt[];
}

/** One placement as tried: what it gave up across B1 and P1, or why it was refused. */
export interface StreetRampCandidate {
  readonly placement: StreetRampPlacement;
  readonly name: string;
  readonly baysGivenUp?: number;
  readonly refusal?: string;
}

export interface StreetRampPlan {
  /** Which ramps the schedule needs: down to B1, up to P1, or both. */
  readonly needed: readonly StreetRampDirection[];
  /** The placement kept, traced, with both outcomes in its formula. Absent when none fitted. */
  readonly placement?: Traced<StreetRampPlacement>;
  readonly ramps: readonly StreetRamp[];
  /** The level approach on the ground floor, plot millimetres. */
  readonly landing?: readonly Pt[];
  readonly levels: readonly StreetLevel[];
  readonly requirement: StraightRampRequirement;
  readonly approachM: TracedDecimal;
  /** How far in from the boundary a straight-in ramp reaches: the approach and the run. */
  readonly reachM: TracedDecimal;
  /** The ground floor the landing and the ramps take. Nothing is deducted from it. */
  readonly groundAreaM2?: TracedDecimal;
  readonly candidates: readonly StreetRampCandidate[];
  /** Said, never omitted. */
  readonly notes: readonly string[];
}

export interface StreetRampInput {
  readonly tracer: Tracer;
  readonly plot: Plot;
  /** The ground floor's outline — the podium ring the ramps stand inside. */
  readonly groundOutline: readonly Pt[];
  readonly plan: LevelPlan;
  /** The storey each ramp climbs: the envelope's floor-to-floor. */
  readonly storeyHeightM: TracedDecimal;
  /** A ramp down to B1 is needed; `beyond` when B2 parks too, so B1 must still reach the strip. */
  readonly down?: { readonly beyond: boolean };
  /** A ramp up to P1 is needed; `beyond` when P2 parks too. */
  readonly up?: { readonly beyond: boolean };
  /** The core on the ground floor, whole, and where it stands in words (it is assumed). */
  readonly core?: { readonly ring: readonly Pt[]; readonly placement: string };
}

// ---------------------------------------------------------------------------
// The packing frame, recovered from the level's own rectangle
// ---------------------------------------------------------------------------

interface V {
  readonly x: number;
  readonly y: number;
}

interface Frame {
  readonly o: V;
  readonly ex: V;
  readonly ey: V;
}

const pt = (x: number, y: number): Pt => ({ x: Math.round(x), y: Math.round(y) }) as Pt;

/** `packingRect.world` is origin, +x, opposite, +y — `level-plan.ts` writes it so. */
function frameOf(world: readonly Pt[]): Frame {
  const [w0, w1, , w3] = world as readonly [Pt, Pt, Pt, Pt];
  const lx = Math.hypot(w1.x - w0.x, w1.y - w0.y) || 1;
  const ly = Math.hypot(w3.x - w0.x, w3.y - w0.y) || 1;
  return {
    o: w0,
    ex: { x: (w1.x - w0.x) / lx, y: (w1.y - w0.y) / lx },
    ey: { x: (w3.x - w0.x) / ly, y: (w3.y - w0.y) / ly },
  };
}

const toLocal = (f: Frame, p: V): V => {
  const dx = p.x - f.o.x;
  const dy = p.y - f.o.y;
  return { x: dx * f.ex.x + dy * f.ex.y, y: dx * f.ey.x + dy * f.ey.y };
};
const toWorld = (f: Frame, x: number, y: number): Pt =>
  pt(f.o.x + x * f.ex.x + y * f.ey.x, f.o.y + x * f.ex.y + y * f.ey.y);

/** A rectangle in the gap's own terms: `s` along the boundary, `d` in from it. Millimetres. */
interface SD {
  readonly s0: number;
  readonly s1: number;
  readonly d0: number;
  readonly d1: number;
}

/** A rectangle in the packing frame, millimetres. */
interface LR {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/** How the gap's terms sit in the packing frame. */
interface GapAxes {
  /** Which local axis the boundary runs along. */
  readonly along: 'x' | 'y';
  /** The boundary's local coordinate across it. */
  readonly at: number;
  /** +1 when "in from the boundary" is the local axis's positive way. */
  readonly inward: 1 | -1;
}

function lrOf(g: GapAxes, r: SD): LR {
  const a = g.at + g.inward * r.d0;
  const b = g.at + g.inward * r.d1;
  return g.along === 'x'
    ? { x0: Math.min(r.s0, r.s1), x1: Math.max(r.s0, r.s1), y0: Math.min(a, b), y1: Math.max(a, b) }
    : { y0: Math.min(r.s0, r.s1), y1: Math.max(r.s0, r.s1), x0: Math.min(a, b), x1: Math.max(a, b) };
}

const sdPoint = (f: Frame, g: GapAxes, s: number, d: number): Pt =>
  g.along === 'x' ? toWorld(f, s, g.at + g.inward * d) : toWorld(f, g.at + g.inward * d, s);

function worldOf(f: Frame, r: LR): readonly Pt[] {
  return [toWorld(f, r.x0, r.y0), toWorld(f, r.x1, r.y0), toWorld(f, r.x1, r.y1), toWorld(f, r.x0, r.y1)];
}

const lrFromRect = (r: WorldRect): LR => ({
  x0: r.xM.times(1000).toNumber(),
  y0: r.yM.times(1000).toNumber(),
  x1: r.xM.plus(r.widthM).times(1000).toNumber(),
  y1: r.yM.plus(r.heightM).times(1000).toNumber(),
});

const overlapsLr = (a: LR, b: LR): boolean =>
  Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > SLIVER_MM && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > SLIVER_MM;

const circOf = (r: LR): CircRect => ({
  x: new Decimal(r.x0).div(1000),
  y: new Decimal(r.y0).div(1000),
  width: new Decimal(r.x1 - r.x0).div(1000),
  height: new Decimal(r.y1 - r.y0).div(1000),
});

/** `r` less `cut`, in up to four axis-aligned pieces. */
function subtract(r: LR, cut: LR): LR[] {
  if (!overlapsLr(r, cut)) return [r];
  const out: LR[] = [];
  const cx0 = Math.max(r.x0, cut.x0);
  const cx1 = Math.min(r.x1, cut.x1);
  if (cut.x0 > r.x0 + SLIVER_MM) out.push({ ...r, x1: cut.x0 });
  if (cut.x1 < r.x1 - SLIVER_MM) out.push({ ...r, x0: cut.x1 });
  if (cut.y0 > r.y0 + SLIVER_MM) out.push({ x0: cx0, x1: cx1, y0: r.y0, y1: cut.y0 });
  if (cut.y1 < r.y1 - SLIVER_MM) out.push({ x0: cx0, x1: cx1, y0: cut.y1, y1: r.y1 });
  return out;
}

const overlapMm2 = (a: readonly Pt[], b: readonly Pt[]): number =>
  intersect(a as Ring, b as Ring).reduce((s, r) => s + Math.abs(Number(area(r))), 0);
const ringAreaMm2 = (r: readonly Pt[]): number => Math.abs(Number(area(r as Ring)));
const inside = (poly: readonly Pt[], ring: readonly Pt[]): boolean =>
  ringAreaMm2(poly) - overlapMm2(poly, ring) <= TOUCH_MM2;

const m2 = (mm: number): string => (mm / 1000).toFixed(2);

// ---------------------------------------------------------------------------
// Where an entrance would clear an obstacle — shared with the drive at grade
// ---------------------------------------------------------------------------

/**
 * The stretches of `edge`, in metres from its first corner, where an opening
 * `halfWidthM` either side of its centre would stand clear of `ring` in
 * projection — intersected with what B.7.2.1 allows (`range`).
 *
 * A REPORT, NOT A SEARCH. It does not choose a position; it says, in the
 * refusal, where on the boundary the reader's own entrance would stop running
 * into the element named. The reader places the entrance.
 */
export function clearCentres(
  edge: PlotEdge,
  ring: readonly Pt[],
  halfWidthM: Decimal,
  range: CentreRange | null,
): readonly CentreRange[] {
  if (range === null) return [];
  const t = { x: edge.end.x - edge.start.x, y: edge.end.y - edge.start.y };
  const len = Math.hypot(t.x, t.y) || 1;
  const along = ring.map((p) => ((p.x - edge.start.x) * t.x + (p.y - edge.start.y) * t.y) / len / 1000);
  const p0 = new Decimal(Math.min(...along)).toDecimalPlaces(2, Decimal.ROUND_DOWN);
  const p1 = new Decimal(Math.max(...along)).toDecimalPlaces(2, Decimal.ROUND_UP);
  const out: CentreRange[] = [];
  const below = Decimal.min(range.toM, p0.minus(halfWidthM));
  if (below.gte(range.fromM)) out.push({ fromM: range.fromM, toM: below });
  const above = Decimal.max(range.fromM, p1.plus(halfWidthM));
  if (above.lte(range.toM)) out.push({ fromM: above, toM: range.toM });
  return out;
}

/** "between 3.00 m and 12.40 m from P0, or between …", or null when there is nowhere. */
export function clearWords(ranges: readonly CentreRange[], vertex: string): string | null {
  if (ranges.length === 0) return null;
  return ranges
    .map((r) => `between ${r.fromM.toFixed(2)} m and ${r.toM.toFixed(2)} m from ${vertex}`)
    .join(', or ');
}

// ---------------------------------------------------------------------------
// The plan
// ---------------------------------------------------------------------------

interface Gap {
  readonly edge: PlotEdge;
  readonly a: V;
  readonly b: V;
  readonly widthMm: number;
}

/** The stretch of boundary the street ramps start from: the entry, with its exit lane where the two are side by side. */
function gapOf(entry: AccessCandidate, plot: Plot): Gap | null {
  const edge = plot.edges.find((e) => e.seq === entry.edgeSeq);
  if (!edge) return null;
  const on: AccessOpening[] = entry.openings.filter(
    (o) => o.edgeSeq === entry.edgeSeq && (o.role !== 'EXIT' || entry.arrangement === 'ONE_WAY_PAIR'),
  );
  if (on.length === 0) return null;
  const t = { x: edge.end.x - edge.start.x, y: edge.end.y - edge.start.y };
  const len = Math.hypot(t.x, t.y) || 1;
  const u = { x: t.x / len, y: t.y / len };
  const at = (p: V): number => (p.x - edge.start.x) * u.x + (p.y - edge.start.y) * u.y;
  const ends = on.flatMap((o) => [at(o.start), at(o.end)]);
  const lo = Math.min(...ends);
  const hi = Math.max(...ends);
  return {
    edge,
    a: { x: edge.start.x + u.x * lo, y: edge.start.y + u.y * lo },
    b: { x: edge.start.x + u.x * hi, y: edge.start.y + u.y * hi },
    widthMm: hi - lo,
  };
}

/** One ramp as a placement draws it, in the gap's terms. */
interface Drawn {
  readonly direction: StreetRampDirection;
  readonly sd: SD;
  /** Its end on the level it reaches: a zero-thickness rectangle across the ramp. */
  readonly end: SD;
  /** The end at grade, then the end on the level it reaches. */
  readonly atGrade: readonly [V, V];
  readonly atLevel: readonly [V, V];
}

interface Layout {
  readonly landing: SD;
  readonly ramps: readonly Drawn[];
}

interface Tried {
  readonly placement: StreetRampPlacement;
  readonly layout?: Layout;
  readonly refusal?: string;
  readonly levels?: readonly {
    readonly direction: StreetRampDirection;
    readonly rects: WorldRect[];
    readonly kept: number;
    readonly drive?: readonly Pt[];
  }[];
  readonly givenUp?: number;
}

/**
 * Place the street ramps the schedule needs, or say why not.
 *
 * Called only where the ground floor does not park and some level does; the
 * pipeline asks the schedule which (`aboveGradeParkingOf`).
 */
export function planStreetRamps(input: StreetRampInput): StreetRampPlan {
  const { tracer, plot, plan } = input;
  const needed: StreetRampDirection[] = [
    ...(input.down ? [StreetRampDirection.DOWN] : []),
    ...(input.up ? [StreetRampDirection.UP] : []),
  ];
  const notes: string[] = [];

  const requirement = straightRampRequirement(tracer, input.storeyHeightM);
  const approachM = tracer.derived('parking.street_ramp_approach_m', new Decimal(STREET_APPROACH_M), {
    rule: { ruleId: 'DBC.B.7.2.3.3', citation: CLAUSE_B_7_2_3_3_4 },
    formula: 'a straight, preferably level, 6 m access inside the plot before the barrier',
    unit: 'm',
  });
  const reachM = tracer.computed('parking.street_ramp_reach_m', approachM.value.plus(requirement.runM.value), {
    formula:
      `${approachM.value.toFixed(2)} m straight approach (B.7.2.3.3 ¶4) + ${requirement.runM.value.toFixed(2)} m ` +
      `ramp for a ${input.storeyHeightM.value.toString()} m storey (Tables B.9 and B.10)`,
    uses: { approach: approachM, run: requirement.runM },
    unit: 'm',
    detail: {
      note:
        'How far in from the boundary a ramp from the street reaches when it runs straight in. ' +
        'The run follows the floor-to-floor: rise ÷ 12% plus a 3.6 m transition at 6% at each end.',
    },
  });
  const turnM = tracer.assumed('parking.street_ramp_turn_m', new Decimal(TURN_SQUARE_M), {
    basis: TURN_BASIS,
    label: 'landing a ramp along the boundary turns off',
    unit: 'm',
  });

  const empty = (refusal: string): StreetRampPlan => ({
    needed,
    ramps: [],
    levels: [],
    requirement,
    approachM,
    reachM,
    candidates: [],
    notes: [refusal],
  });

  const entry = plan.access.entry;
  if (!entry) {
    return empty(
      'The ramps from the street. No road boundary can take a vehicle entrance, so no ramp from the street is placed.',
    );
  }
  const gap = gapOf(entry.value, plot);
  if (!gap) {
    return empty('The ramps from the street. The entrance has no opening on its boundary, so no ramp from it is placed.');
  }
  if (entry.value.arrangement === 'ONE_WAY_SEPARATE') {
    notes.push(
      'The exit apart from the entry. The ramps from the street start at the entry; how a car leaving them ' +
        'reaches the exit is NOT ASSESSED.',
    );
  }

  // --- the gap in the packing frame ---------------------------------------------
  const frame = frameOf(plan.packingRect.world);
  const la = toLocal(frame, gap.a);
  const lb = toLocal(frame, gap.b);
  const glen = Math.hypot(lb.x - la.x, lb.y - la.y) || 1;
  const alongX = Math.abs(lb.y - la.y) / glen <= SQUARE_SIN;
  const alongY = Math.abs(lb.x - la.x) / glen <= SQUARE_SIN;
  const seq = gap.edge.seq;
  if (!alongX && !alongY) {
    return empty(
      `The ramps from the street. Boundary ${seq}, where the entrance is, is not square to the parking ` +
        "level's rows, so where a ramp from it would land among them is not something this engine can " +
        'say; no ramp from the street is placed, and the bays it would take are still counted.',
    );
  }
  const sOf = (p: V): number => (alongX ? p.x : p.y);
  const at = alongX ? (la.y + lb.y) / 2 : (la.x + lb.x) / 2;
  const probe = (inward: 1 | -1): Pt => {
    const g: GapAxes = { along: alongX ? 'x' : 'y', at, inward };
    return sdPoint(frame, g, (sOf(la) + sOf(lb)) / 2, 200);
  };
  const plotRing = plot.ring as readonly Pt[];
  const axes: GapAxes = {
    along: alongX ? 'x' : 'y',
    at,
    inward: containsPoint(plotRing as Ring, probe(1)) ? 1 : -1,
  };
  const c = (sOf(la) + sOf(lb)) / 2;
  // A driver turning in heads +d; their right, in a right-handed frame, is (h.y, −h.x).
  const heading = axes.along === 'x' ? { x: 0, y: axes.inward } : { x: axes.inward, y: 0 };
  const right = { x: heading.y, y: -heading.x };
  const rightSign = (axes.along === 'x' ? right.x : right.y) > 0 ? 1 : -1;
  const edgeS = [sOf(toLocal(frame, gap.edge.start)), sOf(toLocal(frame, gap.edge.end))];

  const mm = (d: Decimal): number => d.times(1000).toNumber();
  const rw = mm(requirement.widthM.value);
  const run = mm(requirement.runM.value);
  const approach = mm(approachM.value);
  const gapW = gap.widthMm;
  const vertex = `P${seq}`;
  const boundary = `boundary ${seq}`;

  /**
   * Along the gap's centre line, in from the boundary: where the ground floor's
   * outline begins (0 where it stands on the boundary) and where it ends, mm.
   */
  const outlineDepths = (): { readonly from: number; readonly to: number } => {
    const o = sdPoint(frame, axes, c, 0);
    const far = sdPoint(frame, axes, c, 1_000_000);
    const dir = { x: far.x - o.x, y: far.y - o.y };
    const L = Math.hypot(dir.x, dir.y) || 1;
    const ring = input.groundOutline;
    const hits: number[] = [];
    for (let i = 0; i < ring.length; i += 1) {
      const p = ring[i]!;
      const q = ring[(i + 1) % ring.length]!;
      const e = { x: q.x - p.x, y: q.y - p.y };
      const den = dir.x * e.y - dir.y * e.x;
      if (Math.abs(den) < 1e-9) continue;
      const w = { x: p.x - o.x, y: p.y - o.y };
      const t = (w.x * e.y - w.y * e.x) / den;
      const v = (w.x * dir.y - w.y * dir.x) / den;
      if (t > 1e-9 && v >= -1e-9 && v <= 1 + 1e-9) hits.push(t * L);
    }
    hits.sort((p, q) => p - q);
    const startsInside = containsPoint(ring as Ring, sdPoint(frame, axes, c, 1));
    return startsInside ? { from: 0, to: hits[0] ?? 0 } : { from: hits[0] ?? 0, to: hits[1] ?? 0 };
  };
  /*
    THE PODIUM MAY STAND BACK FROM THE ROAD. A ramp stands in a storey of the
    building — B1's for the ramp down, the ground floor's for the ramp up — so it
    starts where the ground floor's outline does, and the approach before it runs
    across whatever open plot lies between. Measured once, at the gap's centre.
  */
  const depths = outlineDepths();
  const faceMm = Math.round(depths.from);
  const many = needed.length > 1;
  const verb = (one: string, more: string): string => (many ? more : one);

  // --- the two placements ----------------------------------------------------------
  const straightIn = (): Layout => {
    const k = needed.length;
    const W = k * rw;
    const half = Math.max(gapW, W) / 2;
    const landingDepth = Math.max(approach, faceMm);
    const landing: SD = { s0: c - half, s1: c + half, d0: 0, d1: landingDepth };
    const spans: Record<StreetRampDirection, [number, number]> =
      k === 1
        ? { DOWN: [c - rw / 2, c + rw / 2], UP: [c - rw / 2, c + rw / 2] }
        : rightSign > 0
          ? { DOWN: [c, c + rw], UP: [c - rw, c] }
          : { DOWN: [c - rw, c], UP: [c, c + rw] };
    const ramps = needed.map((direction): Drawn => {
      const [s0, s1] = spans[direction];
      const near = landingDepth;
      const far = landingDepth + run;
      return {
        direction,
        sd: { s0, s1, d0: near, d1: far },
        end: { s0, s1, d0: far, d1: far },
        atGrade: [
          { x: s0, y: near },
          { x: s1, y: near },
        ],
        atLevel: [
          { x: s0, y: far },
          { x: s1, y: far },
        ],
      };
    });
    return { landing, ramps };
  };

  const alongFrontage = (turnMm: number): Layout => {
    const L = Math.max(gapW, turnMm);
    const edgeHi = Math.max(...edgeS);
    const edgeLo = Math.min(...edgeS);
    const roomPlus = edgeHi - (c + L / 2);
    const roomMinus = c - L / 2 - edgeLo;
    const wider: 1 | -1 = roomPlus >= roomMinus ? 1 : -1;
    /*
      ONE SIDE EACH WHERE BOTH SIDES HOLD A RAMP — down to the right, up to the
      left — ELSE BOTH ON THE SIDE WITH MORE FRONTAGE, side by side, the ramp down
      against the boundary and the ramp up beside it: what A-104 draws along its
      north strip. One ramp goes to the side with more frontage. A rule read off
      two lengths, not a search: no bay count chooses it.
    */
    const apart = needed.length === 2 && Math.min(roomPlus, roomMinus) >= run;
    const sideOf: Record<StreetRampDirection, 1 | -1> = apart
      ? { DOWN: rightSign as 1 | -1, UP: (-rightSign) as 1 | -1 }
      : { DOWN: wider, UP: wider };
    const laneOf: Record<StreetRampDirection, number> =
      apart || needed.length === 1 ? { DOWN: 0, UP: 0 } : { DOWN: 0, UP: 1 };
    const bands = apart || needed.length === 1 ? 1 : 2;
    // The ramps run along the ground floor's face; the landing reaches past them far enough to turn in.
    const landing: SD = {
      s0: c - L / 2,
      s1: c + L / 2,
      d0: 0,
      d1: Math.max(approach, faceMm + turnMm, faceMm + bands * rw),
    };
    const ramps = needed.map((direction): Drawn => {
      const side = sideOf[direction];
      const near = side > 0 ? landing.s1 : landing.s0;
      const far = near + side * run;
      const d0 = faceMm + laneOf[direction] * rw;
      const d1 = d0 + rw;
      return {
        direction,
        sd: { s0: Math.min(near, far), s1: Math.max(near, far), d0, d1 },
        end: { s0: far, s1: far, d0, d1 },
        atGrade: [
          { x: near, y: d0 },
          { x: near, y: d1 },
        ],
        atLevel: [
          { x: far, y: d0 },
          { x: far, y: d1 },
        ],
      };
    });
    return { landing, ramps };
  };

  const placedWords = (p: StreetRampPlacement): string =>
    p === StreetRampPlacement.STRAIGHT_IN
      ? `Straight in from the entrance on ${boundary}`
      : `Along ${boundary} from the entrance`;
  const whatOf = (dirs: readonly StreetRampDirection[]): string =>
    dirs.length === 2 ? 'two ramps, down to B1 and up to P1 side by side,' : `${WHAT_OF[dirs[0]!]}`;

  const strip = plan.rampStrip?.world;
  const sloped = plan.slopedFloor !== undefined;
  const ringAisles = plan.rects.filter((r) => r.kind === RectKind.AISLE && r.row === RING_AISLE_ROW);
  const driveway = new Decimal(plan.layout.standard.drivewayWidthM);
  const perLevel = plan.bayCount;

  /** Try one placement: refuse it in a sentence, or cut the levels it reaches. */
  const tryPlacement = (placement: StreetRampPlacement, turnMm: number): Tried => {
    const layout = placement === StreetRampPlacement.STRAIGHT_IN ? straightIn() : alongFrontage(turnMm);
    const lead = placedWords(placement);
    const landingW = worldOf(frame, lrOf(axes, layout.landing));
    const rampsW = layout.ramps.map((r) => ({ r, w: worldOf(frame, lrOf(axes, r.sd)) }));

    // Inside the plot and the ground floor.
    const outside = !inside(landingW, plotRing) || rampsW.some(({ w }) => !inside(w, input.groundOutline));
    if (outside) {
      if (placement === StreetRampPlacement.STRAIGHT_IN) {
        const reach = layout.ramps[0]!.sd.d1;
        return {
          placement,
          refusal:
            reach > depths.to + 1
              ? `${lead}, the ${whatOf(needed)} ${verb('needs', 'need')} ${m2(layout.landing.d1)} m of straight ` +
                `approach (B.7.2.3.3 ¶4) and ${m2(run)} m of ramp (Tables B.9 and B.10), ${m2(reach)} m in from ` +
                `the boundary, and the ground floor is ${m2(depths.to)} m deep there.`
              : `${lead}, the ${whatOf(needed)} ${verb('needs', 'need')} ${m2(Math.max(gapW, needed.length * rw))} m ` +
                `of width for ${m2(reach)} m in from the boundary, which the ground floor's outline does not hold there.`,
        };
      }
      const L = layout.landing.s1 - layout.landing.s0;
      const rooms = [Math.max(...edgeS) - layout.landing.s1, layout.landing.s0 - Math.min(...edgeS)].map((x) =>
        Math.max(0, x),
      );
      const short = Math.max(...rooms) < run;
      const band = layout.ramps.reduce((w, r) => Math.max(w, r.sd.d1), 0) - faceMm;
      return {
        placement,
        refusal: short
          ? `${lead}, the ${whatOf(needed)} ${verb('needs', 'need')} a ${m2(L)} m landing to turn in (Table B.9's ` +
            `curved-ramp radius and lane, by analogy) and ${m2(run)} m of ramp beside it, and the boundary has ` +
            `${m2(rooms[0]!)} m on one side of the landing and ${m2(rooms[1]!)} m on the other.`
          : `${lead}, the ${whatOf(needed)} ${verb('needs', 'need')} a ${m2(L)} m landing to turn in and ` +
            `${m2(run)} m of ramp beside it, ${m2(band)} m wide along the ground floor's face, which its outline ` +
            'does not hold there.',
      };
    }

    // What a ramp from the street may not stand across.
    if (input.core) {
      for (const poly of [landingW, ...rampsW.map((x) => x.w)]) {
        if (overlapMm2(poly, input.core.ring) <= TOUCH_MM2) continue;
        const hit = intersect(poly as Ring, input.core.ring as Ring).flat();
        const depthIn = Math.min(
          ...hit.map((p) => {
            const l = toLocal(frame, p);
            return Math.abs((axes.along === 'x' ? l.y : l.x) - axes.at);
          }),
        );
        let where = '';
        if (placement === StreetRampPlacement.STRAIGHT_IN) {
          const half = new Decimal(Math.max(gapW, needed.length * rw)).div(2000);
          const range = gap.widthMm > 3500 ? entry.value.centreRange.sixM : entry.value.centreRange.threeM;
          const clear = clearWords(clearCentres(gap.edge, input.core.ring, half, range), vertex);
          where = clear
            ? ` An entrance on ${boundary} centred ${clear} would clear it.`
            : ` No position on ${boundary} that B.7.2.1 allows clears it.`;
        }
        return {
          placement,
          refusal:
            `${lead}, the ${whatOf(needed)} ${verb('runs', 'run')} into the core ${m2(depthIn)} m in from the boundary. ` +
            `Where the core stands is assumed: ${input.core.placement}.${where}`,
        };
      }
    }
    for (const { r, w } of rampsW) {
      if (strip && overlapMm2(w, strip) > TOUCH_MM2) {
        return {
          placement,
          refusal: `${lead}, the ${WHAT_OF[r.direction]} would stand across the ramp strip between the parking levels.`,
        };
      }
      if (sloped && ringAisles.some((a) => overlapMm2(w, a.world) > TOUCH_MM2)) {
        return {
          placement,
          refusal:
            `${lead}, the ${WHAT_OF[r.direction]} would cut the ring aisle on ${LEVEL_OF[r.direction]}, ` +
            'which is the ramp between the parking levels.',
        };
      }
    }

    // Each level it reaches, cut and flooded again from the ramp's end.
    const levels: { direction: StreetRampDirection; rects: WorldRect[]; kept: number; drive?: readonly Pt[] }[] = [];
    for (const r of layout.ramps) {
      const cut = lrOf(axes, r.sd);
      const endLr = lrOf(axes, r.end);
      const beyond = (r.direction === StreetRampDirection.DOWN ? input.down : input.up)?.beyond ?? false;
      const others = plan.rects.filter((x) => x.kind !== RectKind.AISLE && x.kind !== RectKind.BAY && x.kind !== RectKind.ACCESSIBLE_BAY);
      const stripRect = plan.rects.find((x) => x.kind === RectKind.RAMP);
      const crossed = plan.rects
        .filter((x) => x.kind === RectKind.AISLE)
        .flatMap((x) => subtract(lrFromRect(x), cut).map((p) => ({ src: x, lr: p })));

      /*
        THE RUN-OUT. A ramp's end seldom falls on an aisle: it falls where the
        level's modules happen to put it, often across a row of bays. A car
        leaving it drives straight on to the first aisle ahead that is as wide
        as the driveway across the ramp's width, and the bays it drives across
        are given up — the rule the drive at grade follows (`grade.ts`). No aisle
        ahead, and the ramp is refused.
      */
      const alongY = endLr.y0 === endLr.y1;
      const mid = alongY ? (cut.y0 + cut.y1) / 2 : (cut.x0 + cut.x1) / 2;
      const endAt = alongY ? endLr.y0 : endLr.x0;
      const ahead = endAt >= mid ? 1 : -1;
      const [w0, w1] = alongY ? [endLr.x0, endLr.x1] : [endLr.y0, endLr.y1];
      const drivewayMm = driveway.times(1000).toNumber();
      let reach: number | undefined;
      for (const p of crossed) {
        const [p0, p1] = alongY ? [p.lr.x0, p.lr.x1] : [p.lr.y0, p.lr.y1];
        if (Math.min(p1, w1) - Math.max(p0, w0) < drivewayMm - SLIVER_MM) continue;
        const near = ahead > 0 ? (alongY ? p.lr.y0 : p.lr.x0) - endAt : endAt - (alongY ? p.lr.y1 : p.lr.x1);
        if (near < -SLIVER_MM) continue;
        const dist = Math.max(0, near);
        if (reach === undefined || dist < reach) reach = dist;
      }
      if (reach === undefined) {
        return {
          placement,
          refusal:
            `${lead}, the ${WHAT_OF[r.direction]} ends where no drive aisle on ${LEVEL_OF[r.direction]} lies ` +
            `straight ahead of it ${driveway.toFixed(2)} m wide, so a car leaving it has nowhere to go.`,
        };
      }
      const lo = ahead > 0 ? endAt : endAt - reach;
      const hi = ahead > 0 ? endAt + reach : endAt;
      const runOut: LR | undefined =
        reach > SLIVER_MM ? (alongY ? { x0: w0, x1: w1, y0: lo, y1: hi } : { x0: lo, x1: hi, y0: w0, y1: w1 }) : undefined;
      const pieces = runOut ? crossed.flatMap((p) => subtract(p.lr, runOut).map((lr) => ({ src: p.src, lr }))) : crossed;

      const nodes: LR[] = [...pieces.map((p) => p.lr), ...(stripRect ? [lrFromRect(stripRect)] : [])];
      const stripAt = stripRect ? nodes.length - 1 : -1;
      const drivable = [...nodes.map(circOf), circOf(runOut ?? endLr)];
      const apron = drivable.length - 1;
      const flood = traceCirculation({ drivable, entries: [apron], minOpeningM: driveway });
      const landed = flood.adjacency[apron]!;
      if (landed.length === 0) {
        return {
          placement,
          refusal:
            `${lead}, the ${WHAT_OF[r.direction]} ends where no drive aisle on ${LEVEL_OF[r.direction]} ` +
            `meets it ${driveway.toFixed(2)} m wide, so a car leaving it has nowhere to go.`,
        };
      }
      // The network the level keeps: the one joined to the ramp to the next level
      // where there is one, else the one the ramp lands on — taken WITHOUT the
      // ramp's end, so the drawn aisles hang together on their own.
      const withoutApron = traceCirculation({
        drivable: nodes.map(circOf),
        entries: beyond && stripAt >= 0 ? [stripAt] : [landed[0]!],
        minOpeningM: driveway,
      });
      // Where the ring itself is the ramp on, the network kept must still hold a piece of it.
      const ringKept =
        !beyond || !sloped || pieces.some((p, i) => p.src.row === RING_AISLE_ROW && withoutApron.reachable.has(i));
      if (!landed.some((n) => withoutApron.reachable.has(n)) || !ringKept) {
        return {
          placement,
          refusal:
            `${lead}, the ${WHAT_OF[r.direction]} cuts ${LEVEL_OF[r.direction]} so that its aisles no longer ` +
            `reach the ramp to ${BEYOND_OF[r.direction]}.`,
        };
      }
      const keptNodes = [...withoutApron.reachable].sort((p, q) => p - q);
      const keptCirc = keptNodes.map((n) => circOf(nodes[n]!));
      const bays = plan.rects.filter((x) => x.kind === RectKind.BAY || x.kind === RectKind.ACCESSIBLE_BAY);
      const keptBays = bays.filter((b) => {
        const lr = lrFromRect(b);
        return (
          !overlapsLr(lr, cut) && !(runOut && overlapsLr(lr, runOut)) && servingNode(circOf(lr), keptCirc) !== null
        );
      });
      const keptAisles: WorldRect[] = keptNodes
        .filter((n) => n !== stripAt)
        .map((n) => {
          const { src, lr } = pieces[n]!;
          const whole = lrFromRect(src);
          const uncut = lr.x0 === whole.x0 && lr.x1 === whole.x1 && lr.y0 === whole.y0 && lr.y1 === whole.y1;
          return {
            kind: src.kind,
            row: src.row,
            xM: new Decimal(lr.x0).div(1000),
            yM: new Decimal(lr.y0).div(1000),
            widthM: new Decimal(lr.x1 - lr.x0).div(1000),
            heightM: new Decimal(lr.y1 - lr.y0).div(1000),
            // An uncut aisle keeps the outline the shared layout drew; a piece is drawn anew.
            world: uncut ? src.world : worldOf(frame, lr),
          };
        });
      levels.push({
        direction: r.direction,
        rects: [...others, ...keptAisles, ...keptBays],
        kept: keptBays.length,
        ...(runOut ? { drive: worldOf(frame, runOut) } : {}),
      });
    }
    const givenUp = levels.reduce((s, l) => s + (perLevel.value - l.kept), 0);
    return { placement, layout, levels, givenUp };
  };

  const order = [StreetRampPlacement.STRAIGHT_IN, StreetRampPlacement.ALONG_FRONTAGE];
  const turnMm = mm(turnM.value);
  const tried = order.map((p) => tryPlacement(p, turnMm));
  const fitted = tried.filter((t) => t.layout !== undefined);
  // The fewer bays given up; straight in on a tie, the placement B.7.2.3.3 ¶4 describes.
  const kept = fitted.reduce<Tried | undefined>(
    (best, t) => (best === undefined || t.givenUp! < best.givenUp! ? t : best),
    undefined,
  );
  const candidates: StreetRampCandidate[] = tried.map((t) => ({
    placement: t.placement,
    name: STREET_RAMP_PLACEMENT_NAME[t.placement],
    ...(t.refusal !== undefined ? { refusal: t.refusal } : { baysGivenUp: t.givenUp! }),
  }));
  const outcome = (t: StreetRampCandidate): string =>
    t.refusal !== undefined ? `${t.name}: refused` : `${t.name}: ${t.baysGivenUp} bay(s) given up`;

  if (!kept) {
    return {
      needed,
      ramps: [],
      levels: [],
      requirement,
      approachM,
      reachM,
      candidates,
      notes: [
        ...notes,
        `The ramps from the street are not placed: neither placement fits. ${tried.map((t) => t.refusal).join(' ')} ` +
          'The bays they would take on the levels they reach are still counted.',
      ],
    };
  }

  // The turn is an assumption, so what it moves is measured, not guessed.
  const moved = tryPlacement(StreetRampPlacement.ALONG_FRONTAGE, Math.round(turnMm * 1.1));
  const altGiven = (): number | undefined => {
    const fits = [tried[0]!, moved].filter((t) => t.layout !== undefined);
    if (fits.length === 0) return undefined;
    return Math.min(...fits.map((t) => t.givenUp!));
  };
  const keptTotal = needed.length * perLevel.value - kept.givenUp!;
  // Where nothing fits once the turn is larger, no ramp is placed and no bay is given up.
  const alt = altGiven() ?? 0;
  const relativeEffect =
    keptTotal === 0 ? '0' : new Decimal(kept.givenUp! - alt).div(keptTotal).toDecimalPlaces(4).toString();

  const placement = tracer.computed('parking.street_ramp_placement', kept.placement, {
    formula:
      `${candidates.map(outcome).join('; ')} — the fewer bays given up on ` +
      `${needed.map((d) => LEVEL_OF[d]).join(' and ')} is kept, straight in on a tie`,
    uses: { entrance: entry, run: requirement.runM, approach: approachM, turn: turnM },
    detail: {
      note:
        'Two fixed placements from the entrance, both tried and both reported; never a search ' +
        'over positions for the most bays.',
    },
  });

  const layout = kept.layout!;
  const ramps: StreetRamp[] = layout.ramps.map((r) => {
    // A placement writes a ramp's ends as (s, d) in the fields x and y.
    const toW = (p: V): Pt => sdPoint(frame, axes, p.x, p.y);
    const grade = [toW(r.atGrade[0]), toW(r.atGrade[1])] as const;
    const level = [toW(r.atLevel[0]), toW(r.atLevel[1])] as const;
    return {
      direction: r.direction,
      levelId: LEVEL_OF[r.direction],
      world: worldOf(frame, lrOf(axes, r.sd)),
      foot: r.direction === StreetRampDirection.DOWN ? level : grade,
      head: r.direction === StreetRampDirection.DOWN ? grade : level,
    };
  });

  const levels: StreetLevel[] = kept.levels!.map((l) => {
    const levelId = LEVEL_OF[l.direction];
    const givenUp = tracer.computed('parking.street_ramp_bays_given_up', perLevel.value - l.kept, {
      formula:
        `${perLevel.value} bays laid out per level − ${l.kept} left on ${levelId} beside the ${WHAT_OF[l.direction]}: ` +
        'the bays under it, those its drive on to the first aisle crosses, and those its cut leaves no aisle to',
      uses: { perLevel, placement },
      unit: 'bays',
    });
    const bayCount = tracer.computed('parking.street_level_bays', l.kept, {
      formula: `${perLevel.value} bays laid out per level − ${givenUp.value} given up to the ${WHAT_OF[l.direction]}`,
      uses: { perLevel, givenUp },
      unit: 'bays',
      detail: { level: levelId },
    });
    tracer.sensitiveTo(bayCount, turnM, {
      relativeEffect,
      perturbation:
        'the landing a ramp along the boundary turns off made 10% larger and both placements tried ' +
        'again; the change in the bays the street ramps leave on the levels they reach',
    });
    return { levelId, rects: l.rects, bayCount, givenUp, ...(l.drive ? { drive: l.drive } : {}) };
  });

  const areaMm2 = [layout.landing, ...layout.ramps.map((r) => r.sd)].reduce(
    (s, r) => s + (r.s1 - r.s0) * (r.d1 - r.d0),
    0,
  );
  const groundAreaM2 = tracer.computed(
    'parking.street_ramp_ground_area_m2',
    new Decimal(areaMm2).div(1_000_000).toDecimalPlaces(2),
    {
      formula:
        `the landing ${m2(layout.landing.s1 - layout.landing.s0)} × ${m2(layout.landing.d1 - layout.landing.d0)} m` +
        layout.ramps.map((r) => ` + the ${WHAT_OF[r.direction]} ${m2(r.sd.s1 - r.sd.s0)} × ${m2(r.sd.d1 - r.sd.d0)} m`).join(''),
      uses: { placement, width: requirement.widthM, run: requirement.runM },
      unit: 'm²',
      detail: {
        note:
          'The ground floor the street ramps and their landing take. Nothing is deducted from the ' +
          "ground floor's floor area for it; how it bears on that area is NOT ASSESSED.",
      },
    },
  );

  notes.push(
    `The ramps from the street stand on the ground floor, ${STREET_RAMP_PLACEMENT_NAME[kept.placement]}, and take ` +
      `${groundAreaM2.value.toFixed(2)} m² of it; how that bears on the ground floor's floor area is NOT ASSESSED. ` +
      'They are straight: a curved ramp from the street is not placed, and the gate level above the road ' +
      '(B.4.2.1) is not added to their climb.',
  );

  return {
    needed,
    placement,
    ramps,
    landing: worldOf(frame, lrOf(axes, layout.landing)),
    levels,
    requirement,
    approachM,
    reachM,
    groundAreaM2,
    candidates,
    notes,
  };
}
