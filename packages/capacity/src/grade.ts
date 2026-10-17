/**
 * The ground floor, where it holds parking: what that level gives up that the
 * levels below it do not.
 *
 * Every parking level is laid out alike (`level-plan.ts`), and for a basement
 * that is right. The level at grade is the one the street reaches, and two
 * things stand on it and nowhere else:
 *
 * - **The drive from the entrance** (Eng. Mohamed, 16 Oct 2026: the circulation
 *   starts at the entrance). Each opening the reader placed, or the B.7.2.1
 *   recommendation, is swept straight onto the plot until it reaches a drive
 *   aisle. A bay the drive crosses is a bay a car drives through, so it is given
 *   up at grade and counted as given up.
 * - **The transformer room on the road** («لو عندي ضلع واحد فيه شارع هيكون ال
 *   مسطح بتاع ال محول من الضلع دا مش من الضلع الي فيه جار»). A band is cut
 *   against a ROAD boundary — never one shared with a neighbour — as long as
 *   DEWA §11.4.1's substation and the LV room beside it, and as deep as the bay
 *   row it replaces. `ground-program.ts` lays both rooms in it.
 *
 * What this does NOT do: reroute an aisle, move the core, or search for where
 * the band costs fewest bays. The band goes at the end of the road boundary
 * farthest from the entrance, by a stated rule — a search over positions for
 * the most bays would be the optimiser `PHASE_0_CLASSES` refuses.
 */

import { Decimal, EdgeClassification, mmToM, type Plot, type PlotEdge, type Traced, type Tracer } from '@envelope/core';
import { area, containsPoint, intersect, type Pt, type Ring } from '@envelope/geometry';

import { AccessChoiceRefusedError, type AccessOpening, type AccessResult } from './access.js';
import { plantRunMm } from './ground-program.js';
import type { WorldRect } from './level-plan.js';
import { clearCentres, clearWords } from './street-ramp.js';

/** Wider than one lane, an opening's centre is bounded by the 6 m range; else by the 3 m one. */
const ONE_LANE_M = new Decimal('3.5');

/** Overlap below this, in mm², is a shared edge rather than a crossing. */
const TOUCH_MM2 = 10_000;
/** How far into an aisle a drive runs before it is on it: half a metre. */
const INTO_AISLE_MM = 500;
/**
 * Share of a drive's width that must run straight into an aisle for the drive to
 * land on it. Half, not nearly all: an entrance on a diagonal frontage meets the
 * end of an aisle with part of its width, and a car turns onto it from there. The
 * drive still runs at its full width to the deepest of those lanes, so every bay
 * in front of any part of the opening is given up.
 */
const LANDS_ON = 0.5;

export interface GradeDrive {
  readonly opening: AccessOpening;
  /** Plot millimetres: the opening, then the opening carried inward to the aisle. */
  readonly world: readonly Pt[];
  readonly depthM: Decimal;
  readonly label: string;
}

export interface GradePlan {
  /** The level's rectangles at grade: the shared layout less the bays given up. */
  readonly rects: readonly WorldRect[];
  readonly drives: readonly GradeDrive[];
  /** The band against the road for the substation and the LV room, when one fits. */
  readonly plantBand?: { readonly world: readonly Pt[]; readonly edgeSeq: number };
  readonly bayCount: Traced<number>;
  readonly dropped: { readonly drive: number; readonly plant: number };
  /** Said, never omitted: what was not drawn and why. */
  readonly notes: readonly string[];
}

export interface GradeInput {
  readonly tracer: Tracer;
  readonly plot: Plot;
  readonly rects: readonly WorldRect[];
  readonly perLevel: Traced<number>;
  readonly access: AccessResult;
  /** The bay row's depth, which is also the band's: the room takes the row's place. */
  readonly bayLengthM: Decimal;
  /** What a drive may not run through: the core's shafts and the ramp. */
  readonly obstacles: readonly { readonly ring: readonly Pt[]; readonly what: string }[];
  /**
   * Where the core stands, in words, when it is an assumption (`core.ts` always
   * places it by one). A drive refused for running into the core says so: the
   * reader is being refused by a position nobody chose.
   */
  readonly coreAssumedAt?: string;
}

const sub = (a: Pt, b: Pt): { x: number; y: number } => ({ x: a.x - b.x, y: a.y - b.y });
const pt = (x: number, y: number): Pt => ({ x: Math.round(x), y: Math.round(y) }) as Pt;
const overlapMm2 = (a: readonly Pt[], b: readonly Pt[]): number =>
  intersect(a as Ring, b as Ring).reduce((s, r) => s + Math.abs(Number(area(r))), 0);

/** The unit normal of `a → b` that points onto the plot. */
function inward(ring: readonly Pt[], a: Pt, b: Pt): { x: number; y: number } {
  const d = sub(b, a);
  const l = Math.hypot(d.x, d.y) || 1;
  const n = { x: -d.y / l, y: d.x / l };
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  return containsPoint(ring as Ring, pt(mid.x + n.x * 100, mid.y + n.y * 100)) ? n : { x: -n.x, y: -n.y };
}

/** A rectangle on `a → b`, carried `depthMm` along `n`. */
function sweep(a: Pt, b: Pt, n: { x: number; y: number }, depthMm: number): readonly Pt[] {
  return [a, b, pt(b.x + n.x * depthMm, b.y + n.y * depthMm), pt(a.x + n.x * depthMm, a.y + n.y * depthMm)];
}

/** Lanes across a drive's width, each followed straight in to where it first meets an aisle. */
const LANES = 9;
/** Each lane's width: wide enough for the clipper to find, narrow enough to be a line. */
const LANE_MM = 20;

/**
 * Carry one opening onto the plot until it lands on a drive aisle: the nearest
 * aisle that at least half the drive's width runs straight into, half a metre
 * past the point where the LAST of those lanes reaches it.
 *
 * Measured lane by lane, in front of the opening, never off the aisle's corners.
 * It was the corners once, and on Al Mamzar's diagonal frontage that failed
 * silently: a long aisle projected onto a slanted boundary "covered" the whole
 * opening and had a corner level with the boundary, so the drive landed half a
 * metre in, crossed nothing, and the four bays it really runs through were
 * drawn, counted and parked across the entrance. A drive that meets an aisle at
 * an angle has to run until its far edge is on it, so the depth is the deepest
 * lane's, not the shallowest.
 */
function driveFrom(
  o: AccessOpening,
  ring: readonly Pt[],
  aisles: readonly (readonly Pt[])[],
): { world: readonly Pt[]; depthMm: number } | null {
  const a = o.start;
  const b = o.end;
  const t = sub(b, a);
  const w = Math.hypot(t.x, t.y);
  if (w === 0) return null;
  const u = { x: t.x / w, y: t.y / w };
  const n = inward(ring, a, b);
  // Far enough to cross the whole plot from any boundary.
  const xs = ring.map((p) => p.x);
  const ys = ring.map((p) => p.y);
  const reachMm = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) + 1000;
  const at = (s: number): Pt => pt(a.x + u.x * s, a.y + u.y * s);

  let best: number | undefined;
  for (const aisle of aisles) {
    const hits: number[] = [];
    for (let k = 0; k < LANES; k += 1) {
      const s = (w * (k + 0.5)) / LANES;
      const lane = sweep(at(s - LANE_MM / 2), at(s + LANE_MM / 2), n, reachMm);
      const met = intersect(lane as Ring, aisle as Ring).flat();
      if (met.length === 0) continue;
      hits.push(Math.min(...met.map((p) => (p.x - a.x) * n.x + (p.y - a.y) * n.y)));
    }
    if (hits.length < LANDS_ON * LANES) continue;
    const reach = Math.max(Math.max(...hits), 0) + INTO_AISLE_MM;
    if (best === undefined || reach < best) best = reach;
  }
  return best === undefined ? null : { world: sweep(a, b, n, best), depthMm: best };
}

const ROLE_WORDS: Readonly<Record<AccessOpening['role'], string>> = {
  ENTRY_EXIT: 'ENTRY DRIVE',
  ENTRY: 'ENTRY DRIVE - ONE WAY IN',
  EXIT: 'EXIT DRIVE - ONE WAY OUT',
};

/**
 * Where on a road boundary the plant band goes: the end farthest from any
 * opening on it, moved along half a metre at a time until it is inside the plot
 * and clear of the drives and of what a drive may not cross.
 */
function bandOn(
  edge: PlotEdge,
  ring: readonly Pt[],
  lengthMm: number,
  depthMm: number,
  openings: readonly AccessOpening[],
  avoid: readonly (readonly Pt[])[],
): readonly Pt[] | null {
  const t = sub(edge.end, edge.start);
  const L = Math.hypot(t.x, t.y);
  if (L < lengthMm) return null;
  const u = { x: t.x / L, y: t.y / L };
  const n = inward(ring, edge.start, edge.end);
  const on = openings.filter((o) => o.edgeSeq === edge.seq).map((o) => o.centreOffsetM.times(1000).toNumber());
  // From the end farther from the openings on this boundary; from its start when there are none.
  const fromEnd = on.length > 0 && on.reduce((s, c) => s + c, 0) / on.length < L / 2;
  const at = (s: number): Pt => pt(edge.start.x + u.x * s, edge.start.y + u.y * s);
  const inside = (p: Pt): boolean =>
    containsPoint(ring as Ring, pt(p.x + n.x * 2 + u.x * 2, p.y + n.y * 2 + u.y * 2)) ||
    containsPoint(ring as Ring, pt(p.x + n.x * 2 - u.x * 2, p.y + n.y * 2 - u.y * 2));
  for (let k = 0; k * 500 + lengthMm <= L; k += 1) {
    const s0 = fromEnd ? L - lengthMm - k * 500 : k * 500;
    const band = sweep(at(s0), at(s0 + lengthMm), n, depthMm);
    if (!band.every(inside)) continue;
    if (avoid.some((r) => overlapMm2(band, r) > TOUCH_MM2)) continue;
    return band;
  }
  return null;
}

export function planGrade(input: GradeInput): GradePlan {
  const { tracer, plot, access } = input;
  const ring = plot.ring as readonly Pt[];
  const notes: string[] = [];
  const entry = access.entry;
  const openings = entry?.value.openings ?? [];
  const aisles = input.rects.filter((r) => r.kind === 'AISLE').map((r) => r.world);

  // --- the drives -------------------------------------------------------------------
  const drives: GradeDrive[] = [];
  for (const o of openings) {
    const d = driveFrom(o, ring, aisles);
    const where = `the ${o.role === 'EXIT' ? 'exit' : o.role === 'ENTRY' ? 'entry' : 'entrance'} on boundary ${o.edgeSeq}`;
    if (!d) {
      notes.push(
        `The drive from ${where} reaches no drive aisle straight in from the boundary, so no ` +
          'drive is drawn and no bay is given up for one. How cars get from it to the aisles is ' +
          'NOT ASSESSED.',
      );
      continue;
    }
    for (const ob of input.obstacles) {
      if (overlapMm2(d.world, ob.ring) <= TOUCH_MM2) continue;
      /*
        WHICH ELEMENT, AND WHERE IT WOULD NOT. "Runs through the core" used to be
        the whole sentence, and on plot 6468096 it refused a centred entrance the
        code allows because of a core position nobody chose. It still refuses —
        rerouting a drive round the core is a design this engine does not make —
        but it now says the core's position is assumed, and where on the same
        boundary an entrance of the same width would clear it.
      */
      const edge = plot.edges.find((e) => e.seq === o.edgeSeq);
      const range = entry
        ? o.widthM.gt(ONE_LANE_M)
          ? entry.value.centreRange.sixM
          : entry.value.centreRange.threeM
        : null;
      const clear = edge ? clearWords(clearCentres(edge, ob.ring, o.widthM.div(2), range), `P${edge.seq}`) : null;
      const sentence =
        `The drive from ${where} runs through the ${ob.what} before it reaches a drive aisle.` +
        (ob.what === 'core' && input.coreAssumedAt ? ` Where the core stands is assumed: ${input.coreAssumedAt}.` : '') +
        (edge
          ? clear
            ? ` An opening on boundary ${edge.seq} centred ${clear} would clear it.`
            : ` No position on boundary ${edge.seq} that B.7.2.1 allows clears it.`
          : '');
      // The reader's placement is refused, as any other placement the plan cannot take;
      // the recommendation is the engine's and is reported rather than refused.
      if (access.chosen) {
        throw new AccessChoiceRefusedError(`${sentence} Place the entrance elsewhere on the boundary.`);
      }
      notes.push(`${sentence} The recommendation stands; move the entrance to clear it.`);
    }
    drives.push({
      opening: o,
      world: d.world,
      depthM: mmToM(d.depthMm),
      label: `${ROLE_WORDS[o.role]} - ${o.widthM.toFixed(2)}M`,
    });
  }

  // --- the band on the road ----------------------------------------------------------
  const depthMm = input.bayLengthM.times(1000).toNumber();
  const runMm = plantRunMm(depthMm);
  let plantBand: GradePlan['plantBand'];
  const roads = plot.edges
    .filter((e) => e.classification === EdgeClassification.ROAD)
    // A road with no opening first, then the longest, then the lower number.
    .sort(
      (p, q) =>
        Number(openings.some((o) => o.edgeSeq === p.seq)) - Number(openings.some((o) => o.edgeSeq === q.seq)) ||
        q.lengthMm - p.lengthMm ||
        p.seq - q.seq,
    );
  if (runMm === null) {
    notes.push(
      `The bay row is ${input.bayLengthM.toString()} m deep, under the minimum width DEWA §11.4.1 ` +
        'gives the substation, so no band was cut for it on the road.',
    );
  } else if (roads.length === 0) {
    notes.push('No boundary is classified ROAD, so no band was cut for the substation on a road.');
  } else {
    /*
      And every drive aisle. A bay is what the band may take — it takes the row's
      place — but an aisle is the lane every car on the level drives through: on a
      50 × 30 corner plot the band was cut from the corner straight across the
      lower driveway, which no count of bays given up would have shown.
    */
    const avoid = [...drives.map((d) => d.world), ...input.obstacles.map((o) => o.ring), ...aisles];
    for (const edge of roads) {
      const band = bandOn(edge, ring, runMm, depthMm, openings, avoid);
      if (band) {
        plantBand = { world: band, edgeSeq: edge.seq };
        break;
      }
    }
    if (!plantBand) {
      notes.push(
        `No road boundary has ${mmToM(runMm).toFixed(2)} m clear of the entrance, the drive aisles, ` +
          'the core and the ramp for the substation and the LV room, so no band was cut for them on the road.',
      );
    }
  }

  // --- what is given up --------------------------------------------------------------
  const isBay = (r: WorldRect): boolean => r.kind === 'BAY' || r.kind === 'ACCESSIBLE_BAY';
  let byDrive = 0;
  let byPlant = 0;
  const rects = input.rects.filter((r) => {
    if (!isBay(r)) return true;
    if (drives.some((d) => overlapMm2(r.world, d.world) > TOUCH_MM2)) {
      byDrive += 1;
      return false;
    }
    if (plantBand && overlapMm2(r.world, plantBand.world) > TOUCH_MM2) {
      byPlant += 1;
      return false;
    }
    return true;
  });

  const perLevel = input.perLevel;
  const bayCount = tracer.computed('parking.grade_bays', perLevel.value - byDrive - byPlant, {
    formula:
      `${perLevel.value} bays laid out per level − ${byDrive} under the drive from the entrance` +
      ` − ${byPlant} under the substation and the LV room on the road`,
    uses: { perLevel, ...(entry ? { entrance: entry } : {}) },
    unit: 'bays',
    detail: {
      note:
        'The ground floor only. The levels below it keep the shared layout: the street ' +
        'reaches this level, and the substation stands on it.',
    },
  });

  return {
    rects,
    drives,
    ...(plantBand ? { plantBand } : {}),
    bayCount,
    dropped: { drive: byDrive, plant: byPlant },
    notes,
  };
}
