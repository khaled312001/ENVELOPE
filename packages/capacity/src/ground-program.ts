/**
 * An indicative ground-floor program in the reserved strip: the entrance lobby
 * and the plant rooms a Dubai residential tower puts at grade.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS, AND WHAT IT IS NOT.
 *
 * The parking layout reserves a strip on every parking level for "cores, plant
 * and circulation" and draws it hatched, "reserved, not laid out". On the ground
 * floor of the client's drawings that strip is rooms — substation, LV room,
 * generator, pump room, water tank, garbage, the entrance — and a reviewer reads
 * the ground floor by them.
 *
 * It is still NOT a services design. But the header of this file used to say that
 * "no room here is sized from a DEWA, Civil Defence or municipality requirement
 * on file; each width is a typical figure", and **that is now only true of seven
 * of the nine rooms.**
 *
 * ---------------------------------------------------------------------------
 * WHAT CHANGED, AND EXACTLY HOW FAR IT GOES.
 *
 * The client sent *DEWA Regulations for Electrical Installations, 2017 edition*
 * and Section 11 is transcribed in `packages/rules/src/instruments/dewa-2017.ts`
 * with a page, a bounding box and the verbatim clause behind every figure. So the
 * SUBSTATION stopped being a guess:
 *
 * - its **area** is §11.4.1's own table, read with a transformer count — 33 m²
 *   for one, 55 m² for two, +25 m² per transformer after that and +10 m² once at
 *   four and above. `DERIVED`, and it reaches the clause in the provenance graph
 *   rather than in this comment;
 * - its **minimum width** is §11.4.1 as well (4.57 m for one, 6.1 m for two),
 *   read out of that record's own lookup table so the figure exists once;
 * - its **position** is §11.3.1 — "directly located on RTA/Public Road or Sikka"
 *   — applied against the boundaries the plot already classifies.
 *
 * Three things it does **not** license, each of which would be the easy mistake:
 *
 * 1. **The transformer count is still an assumption.** The count is the input
 *    DEWA's table is *read with*; assuming one transformer is assuming a
 *    building's electrical load. So the AREA is `DERIVED` while the COUNT is
 *    `ASSUMED`, they are separate nodes, and the assumed one is amber. A reader
 *    who clicks the area walks one hop to the count and reads why it is a guess.
 * 2. **The LV ROOM is still a typical figure.** §11.2.3 requires it *adjacent to*
 *    the substation and that is why it is drawn hard against it — but Section 11
 *    states no LV room area anywhere, so its 5 m width is exactly as unsourced as
 *    it was yesterday. Citing the adjacency does not size the room, and saying it
 *    did would be the laundering this repository exists to refuse. The clause is
 *    also CONDITIONAL on the main panel being private, which no affection plan
 *    states, so the adjacency itself is reported NOT ASSESSED.
 * 3. **Nothing here is ventilated, access-checked, height-checked or routed.**
 *    §11.5.1 (two sides of natural ventilation) is `PARTIALLY_MECHANIZED` in its
 *    own record and is not evaluated here at all; §11.3.3 (24-hour open-to-sky
 *    access), §11.5.3 (the louver door), §11.2.5 (3.7 m clear height) and §11.7
 *    (the transformer transport ramp) are not evaluated either. `DEWA_NOT_MECHANIZED`
 *    names the clauses of Section 11 that were deliberately left out with the
 *    reason for each, and `notAssessed` below is built **from that list** rather
 *    than re-typed from it — a published absence cannot drift from the record it
 *    was published out of.
 *
 * And one figure worth recording, because it is the measure of what a "typical
 * figure" was worth: the substation used to be drawn 9 m along the strip, which
 * at a 7 m strip is **63 m²** — more than §11.4.1 asks for two transformers and
 * less than it asks for three. It was neither the regulation's number nor a
 * defensible margin on it. It was a guess that happened to be generous, and the
 * cited room is usually *smaller* than the one it replaces.
 *
 * ---------------------------------------------------------------------------
 * HOW IT IS LAID.
 *
 * Along the strip's long side, on the side of the strip away from the core — the
 * facade — and no deeper than 7 m; whatever depth is left stays reserved. A strip
 * shallower than 3 m holds no room at all.
 *
 * The strip has two ends and the program is laid from both:
 *
 * - the **substation** goes at the end nearest a classified `ROAD` boundary
 *   (§11.3.1), with the **LV room** immediately beside it (§11.2.3) — which is
 *   also where the client's own ground-floor plan puts the pair, together in the
 *   street-side corner;
 * - everything else is laid from the **opposite** end in the order below, so the
 *   entrance lobby still lands by the lifts whenever the core is not itself at
 *   the road end. Where it is, the cited clause wins and the convention yields —
 *   a drafting habit does not outrank a clause with a page number.
 *
 * Where the plot has **no** `ROAD` boundary classified, §11.3.1 cannot be
 * applied: the substation's position is then `ASSUMED`, amber, with a basis that
 * says so, and the end chosen is the one the old convention left free. The
 * position is never picked silently, and it is never reported as derived from a
 * clause that was not reached.
 *
 * What does not fit is not squeezed: it is named *with the figures that refused
 * it*, and the sheet says it was not placed. That is the one behaviour this file
 * already had and the change only extends it — a strip too shallow for §11.4.1's
 * minimum width now refuses the substation outright rather than drawing a 33 m²
 * room 4 m wide, which is a room that meets the area and fails the regulation.
 */

import {
  asMm,
  Decimal,
  EdgeClassification,
  mmToM,
  qArea,
  toMm,
  type Actor,
  type Mm,
  type PlotEdge,
  type Traced,
  type TracedDecimal,
  type Tracer,
} from '@envelope/core';
import {
  DEWA_NOT_MECHANIZED,
  DEWA_SUBSTATION_RULES,
  SINGLE_ROOM_SUBSTATION_M2,
  singleRoomSubstationAreaM2,
  type RuleRecord,
} from '@envelope/rules';

import { frameOf } from './core-layout.js';

interface Pt {
  readonly x: number;
  readonly y: number;
}

/* ==========================================================================
 * THE CITED RECORDS
 *
 * `@envelope/capacity` may import `@envelope/rules` — `scripts/check-boundaries.mjs`
 * does not list `capacity` among the packages with forbidden edges, the manifest
 * and the project references already declare it, and `envelope.ts`, `parking.ts`
 * and `pipeline.ts` already resolve parameters through it. So the figures are
 * read from the instrument here rather than handed in from the composition root:
 * a copy of 33 and 4.57 in this file would be two numbers where the repository
 * is entitled to one, and the copy is the one that drifts.
 *
 * The records are looked up **by id, at module load, and the lookup throws**.
 * Renaming a record in `dewa-2017.ts` must not quietly cost this file its
 * citation and leave a `DERIVED` value pointing at nothing; it must fail on the
 * first import instead.
 * ======================================================================= */

function dewaRule(ruleId: string): RuleRecord {
  const found = DEWA_SUBSTATION_RULES.find((r) => r.ruleId === ruleId);
  if (!found) {
    throw new Error(
      `ground-program.ts cites ${ruleId}, which is no longer in DEWA_SUBSTATION_RULES. ` +
        'The substation area, its minimum width and its position are all read off that ' +
        'record set; a missing record would leave a DERIVED value with no clause at the ' +
        'end of its chain, which is the one defect provenance exists to prevent.',
    );
  }
  return found;
}

/** §11.4.1 — the single-room substation area table. */
const AREA_RULE = dewaRule('R-DEWA-11.4.1-SUBSTATION-AREA');
/** §11.4.1 — the minimum width the same table states beside each area. */
const WIDTH_RULE = dewaRule('R-DEWA-11.4.1-SUBSTATION-WIDTH');
/** §11.3.1 — the substation is directly located on a road. */
const ON_ROAD_RULE = dewaRule('R-DEWA-11.3.1-SUBSTATION-ON-ROAD');
/** §11.2.3 — the LV room is adjacent to the substation, if the panel is private. */
const LV_ADJACENT_RULE = dewaRule('R-DEWA-11.2.3-LV-ROOM-ADJACENT');

/** The key `R-DEWA-11.4.1-*` tabulates against. */
const TRANSFORMER_KEY = 'plant.substation.transformers';

/**
 * The minimum width §11.4.1 states for `transformers`, in metres.
 *
 * Read out of the width record's own `evaluatorArgs.table` rather than re-typed
 * here. `evaluatorArgs` is `Record<string, unknown>` by design — the evaluators
 * are generic — so this reader validates the shape and throws rather than
 * narrowing with a cast and hoping. A silent `undefined` out of a drifted record
 * would read as "the table states no width for this count", which is a different
 * and defensible state, and the two must not be confusable.
 *
 * Returns `undefined` where the table genuinely states no width: §11.4.1 gives
 * one for a single transformer and one for two, and **nothing for three or
 * more**. That residue is reported, not filled — extrapolating 6.1 m to a
 * four-transformer room would be inventing a regulation.
 */
function citedMinWidthM(transformers: number): Decimal | undefined {
  const rows = (WIDTH_RULE.evaluatorArgs as { readonly table?: unknown }).table;
  if (!Array.isArray(rows)) {
    throw new Error(
      `${WIDTH_RULE.ruleId} no longer carries a lookup table. DEWA §11.4.1's minimum ` +
        'width is read out of that record so the figure exists once in this repository.',
    );
  }
  for (const row of rows as readonly {
    readonly when?: Readonly<Record<string, unknown>>;
    readonly value?: unknown;
  }[]) {
    if (row.when?.[TRANSFORMER_KEY] !== transformers) continue;
    if (typeof row.value !== 'number') {
      throw new Error(
        `${WIDTH_RULE.ruleId} tabulates a non-numeric minimum width for ` +
          `${transformers} transformer(s). A width that is not a number cannot bound a room.`,
      );
    }
    return new Decimal(row.value);
  }
  return undefined;
}

/* ==========================================================================
 * THE PROGRAM
 * ======================================================================= */

/**
 * The one room whose area a clause on file states. Named rather than flagged in
 * the table below, because it is sized by a different mechanism entirely: the
 * others declare a width, this one declares an area and lets the width fall out
 * of the strip's depth.
 */
const SUBSTATION_NAME = 'SUBSTATION';

/**
 * Drawn against the substation by §11.2.3. Its **width is still a typical
 * figure** — Section 11 states no LV room area — so it sits here, in the typical
 * table's units, and not beside the cited area above.
 */
const LV_ROOM = { name: 'LV ROOM', widthMm: 5000 } as const;

/**
 * Name on the drawing, and width along the strip in millimetres.
 *
 * Every width here is a typical figure and nothing more. No clause of DEWA
 * Section 11, no Civil Defence requirement and no municipality requirement on
 * file sizes any of these rooms; the order is the laying order, from the end of
 * the strip away from the substation.
 */
const TYPICAL_ROOMS: readonly { readonly name: string; readonly widthMm: number }[] = [
  { name: 'ENTRANCE LOBBY', widthMm: 6000 },
  { name: 'GENERATOR ROOM', widthMm: 5000 },
  { name: 'PUMP ROOM', widthMm: 5000 },
  { name: 'WATER TANK', widthMm: 6000 },
  { name: 'GARBAGE ROOM', widthMm: 4000 },
  { name: 'TEL ROOM', widthMm: 2500 },
  { name: 'MM ROOM', widthMm: 2500 },
];

const MIN_DEPTH_MM = 3000;
/** A plant room deeper than this is a corridor; the rest of the strip stays reserved. */
const MAX_DEPTH_MM = 7000;

/**
 * A width in metres, for a basis string. `6000 → "6"`, `2500 → "2.5"`.
 *
 * Exists so every figure in the prose below is **read out of the tables above**
 * rather than typed beside them. The basis is where this product's trust lives,
 * and a re-typed width drifts from the room it describes exactly as easily as a
 * re-typed formula drifts from the engine — and less visibly, because nothing
 * compares a sentence to a drawing.
 */
const widthWords = (mm: number): string => mmToM(mm).toString();

/**
 * The transformer count assumed when nobody states one, and why it is the least
 * indefensible of the available guesses.
 *
 * One is the smallest count §11.4.1 tabulates, so the area it yields is the
 * smallest the clause ever requires and the engine is not inventing an
 * electrical load it has no basis for. **The direction of the error is stated
 * because it is the wrong way round:** a scheme that needs two transformers
 * needs 55 m² rather than 33 m², which is 22 m² more of the strip, so this
 * assumption errs *low* on the plant burden. It is named here, in the basis and
 * in the assumption register for exactly that reason — this is the shape of
 * failure "no hidden defaults" exists to catch, and the fix for it is a reader
 * who can see the number and change it, not a better guess.
 */
const ASSUMED_TRANSFORMERS = 1;

const ASSUMED_TRANSFORMERS_BASIS =
  'Nobody stated how many transformers this building takes, and DEWA §11.4.1 is a ' +
  `table read with that count: ${SINGLE_ROOM_SUBSTATION_M2.one} m² for one, ` +
  `${SINGLE_ROOM_SUBSTATION_M2.two} m² for two, ` +
  `${SINGLE_ROOM_SUBSTATION_M2.perAdditional} m² for each after that and ` +
  `${SINGLE_ROOM_SUBSTATION_M2.fourOrMoreExtra} m² more once at four and above. ` +
  `${ASSUMED_TRANSFORMERS} transformer is assumed because it is the smallest count the ` +
  `clause tabulates, so the substation area is ` +
  `${singleRoomSubstationAreaM2(ASSUMED_TRANSFORMERS)} m² — the smallest §11.4.1 ever ` +
  'requires — and no electrical load has been invented. This errs LOW: a scheme ' +
  `needing two transformers needs ${singleRoomSubstationAreaM2(2)} m², ` +
  `${singleRoomSubstationAreaM2(2) - singleRoomSubstationAreaM2(ASSUMED_TRANSFORMERS)} m² ` +
  `more of the reserved strip, and a scheme needing four needs ` +
  `${singleRoomSubstationAreaM2(4)} m². The count is a load calculation this engine does ` +
  'not perform and is not derivable from an affection plan. Enter it to replace this, ' +
  'and the area, the minimum width and whether the room fits the strip all move with it.';

/**
 * Said wherever this program is drawn. The counterpart of `CORE_NOT_MODELLED`,
 * and it is deliberately not the sentence this file used to carry: a note that
 * still said "no room is sized against a DEWA requirement" would be false in the
 * one field the product's trust lives in.
 */
export const GROUND_PROGRAM_NOT_MODELLED =
  'The ground floor, as a services design. The SUBSTATION is sized and positioned from ' +
  'DEWA Regulations for Electrical Installations 2017 §11.4.1 and §11.3.1, read with an ' +
  'assumed transformer count; every other room in the strip — the entrance lobby, the LV ' +
  'room, the generator, pump, water tank, garbage, TEL and MM rooms — is a typical width ' +
  'that no requirement on file states. No room is ventilated, access-checked, ' +
  'height-checked or routed, and no lift, riser, duct, panel or door is placed. ' +
  'REGULATORY VALIDITY: NOT ASSESSED.';

export const GROUND_PROGRAM_BASIS =
  'An indicative ground floor for a residential tower, drawn in the strip the parking ' +
  'layout reserves for plant and circulation. The SUBSTATION is the one room here that ' +
  'is not a typical figure: its area is the table in DEWA Regulations for Electrical ' +
  'Installations 2017 §11.4.1 read with the transformer count, its minimum width is the ' +
  'figure stated beside that area in the same clause, and the end of the strip it is ' +
  'laid at is §11.3.1 — "Substation room/RMU room to be directly located on RTA/Public ' +
  'Road or Sikka" — applied to the boundaries this plot classifies. Each is cited to a ' +
  'page, a bounding box and the verbatim clause. The LV ROOM is drawn hard against the ' +
  `substation because §11.2.3 requires that adjacency, but its own ` +
  `${widthWords(LV_ROOM.widthMm)} m width is a ` +
  'typical figure: Section 11 states no LV room area. Every other room is a typical ' +
  'width and nothing more — ' +
  // Named exactly as the drawing labels them, so a reader holding the sheet and
  // the basis is reading one list and not two.
  TYPICAL_ROOMS.map((r) => `${r.name} ${widthWords(r.widthMm)} m`).join(', ') +
  ` — each the depth of the strip up to ${widthWords(MAX_DEPTH_MM)} m, along its outer ` +
  'side; no DEWA, Civil Defence or ' +
  'municipality requirement on file sizes any of them. And no room in this program is ' +
  'ventilated, access-checked, height-checked or routed: §11.5.1 is PARTIALLY ' +
  'MECHANIZED in its own rule record and is not evaluated here, and DEWA_NOT_MECHANIZED ' +
  'names the clauses of Section 11 left out of the engine with the reason for each. ' +
  'REGULATORY VALIDITY: NOT ASSESSED.';

/* ==========================================================================
 * TYPES
 * ======================================================================= */

export interface GroundRoom {
  readonly name: string;
  /** [origin, +along, +along+across, +across], integer millimetres. */
  readonly outline: readonly { readonly x: Mm; readonly y: Mm }[];
}

/**
 * A room of the program that was not drawn, and the figures that refused it.
 *
 * A name alone was enough while the only reason was "the strip ran out of
 * length". It is not enough now: the substation can also be refused by a strip
 * too *shallow* for §11.4.1's minimum width, and "no length left for:
 * substation" would be a wrong sentence about a right refusal.
 */
export interface GroundRoomRefusal {
  readonly name: string;
  /** One sentence naming both figures, so a reader can argue with the refusal. */
  readonly reason: string;
}

/**
 * The substation's cited figures.
 *
 * `transformers` and `requiredAreaM2` are emitted whether or not the room was
 * drawn — the required area is a fact about the clause, and when the room is
 * refused it is *the reason* it was refused, so withholding it would withhold
 * the argument. `drawn` is present only when there is a rectangle to describe.
 */
export interface SubstationSizing {
  /** The count §11.4.1's table was read with. `USER_SET`, or `ASSUMED` at one. */
  readonly transformers: Traced<number>;
  /** §11.4.1's area for that count. `DERIVED` — it reaches the clause. */
  readonly requiredAreaM2: TracedDecimal;
  /** §11.4.1's minimum width for that count. Absent where the table states none. */
  readonly minWidthM?: TracedDecimal;
  readonly drawn?: {
    readonly widthMm: Mm;
    readonly depthMm: Mm;
    /** The rectangle actually drawn — never less than `requiredAreaM2`. */
    readonly areaM2: TracedDecimal;
    /** Which end of the strip, and whether §11.3.1 was reached or not. */
    readonly placement: Traced<string>;
  };
}

export type GroundProgram =
  | {
      readonly kind: 'LAID_OUT';
      readonly rooms: readonly GroundRoom[];
      /**
       * Names of the rooms not drawn. Kept as names because the building model
       * and the sheets read it; `refused` carries the same rooms with the reason.
       */
      readonly notPlaced: readonly string[];
      readonly refused: readonly GroundRoomRefusal[];
      readonly program: Traced<string>;
      /** The substation's cited figures. Absent only if the strip holds no room. */
      readonly substation?: SubstationSizing;
      /** What this program does not check, named rather than omitted. */
      readonly notAssessed: readonly string[];
    }
  | { readonly kind: 'NOT_LAID_OUT'; readonly reason: string };

export interface GroundProgramInput {
  readonly tracer: Tracer;
  readonly zone: readonly Pt[];
  /** Where the core stands, so the entrance is laid at the strip's nearer end. */
  readonly towards?: Pt;
  /**
   * The plot's boundaries, so DEWA §11.3.1 can be applied to the substation's
   * position. Omitted — or carrying no `ROAD` edge — makes that position
   * `ASSUMED` with a basis saying the clause was not reached. It never makes the
   * engine pick a corner and keep quiet about it.
   */
  readonly edges?: readonly PlotEdge[];
  /**
   * The transformer count §11.4.1's table is read with.
   *
   * Absent means nobody has said, and the count is `ASSUMED` at one with
   * `ASSUMED_TRANSFORMERS_BASIS`. Present with an `actor` it is `USER_SET` by
   * that named person — a count is a statement about a building's electrical
   * load and there is deliberately no `DERIVED` path to one, because no document
   * on file states a transformer count for any plot.
   */
  readonly substation?: {
    readonly transformers: number;
    readonly actor?: Actor;
  };
}

/* ==========================================================================
 * GEOMETRY HELPERS
 * ======================================================================= */

/**
 * Distance from a point to a segment, in millimetres.
 *
 * On a curved boundary `PlotEdge.start`/`end` are the chord, not the arc. That
 * is adequate here and nowhere else: this distance only *ranks* two ends of a
 * strip against each other to decide which is the road end, and no figure a
 * reader sees is computed from it. A dimension would read `ModelEdge.lengthMm`.
 */
function distanceToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Which end of the strip §11.3.1 puts the substation at, and on what evidence. */
interface SubstationEnd {
  /** `0`: the strip's `a = 0` end. `1`: its `a = lengthMm` end. */
  readonly at: 0 | 1;
  /** The `ROAD` boundary laid toward. Absent where the plot classifies none. */
  readonly roadEdgeSeq?: number;
  readonly roadDistanceM?: Decimal;
}

/**
 * Pick the end of the strip nearest a classified `ROAD` boundary.
 *
 * Ranked on the midpoint of each short side rather than on a corner, because a
 * corner of a strip that runs *along* a road is nearer to it than the strip's
 * other corner by an accident of which way the ring winds.
 *
 * THE RANKING IS A TOTAL ORDER, which is not pedantry. PRD §13.4 requires the
 * deterministic part of the pipeline to re-execute byte-identically from
 * persisted inputs, so "whichever candidate the comparison happened to see
 * first" is not good enough — and a tolerance band is not either, because
 * `a ≈ b` and `b ≈ c` without `a ≈ c` is not transitive and a three-way
 * near-tie would then resolve by iteration order. So distances are **snapped to
 * the millimetre grid** the rest of the kernel works on, which absorbs float
 * noise properly, and the remaining ties break on the lower boundary sequence
 * and then on the `a = 0` end.
 *
 * §11.3.1 does **not** prefer a secondary road the way vehicle access does under
 * B.7.2.1; it asks only that the room be on an RTA/Public Road or Sikka. So
 * `RoadHierarchy` is deliberately not consulted here: ranking by it would import
 * a preference from a different clause about a different thing.
 */
function chooseSubstationEnd(
  frame: NonNullable<ReturnType<typeof frameOf>>,
  edges: readonly PlotEdge[],
  coreNearFarEnd: boolean,
): SubstationEnd {
  const at = (a: number, b: number): Pt => ({
    x: frame.origin.x + a * frame.along.x + b * frame.across.x,
    y: frame.origin.y + a * frame.along.y + b * frame.across.y,
  });
  const ends: readonly [Pt, Pt] = [
    at(0, frame.depthMm / 2),
    at(frame.lengthMm, frame.depthMm / 2),
  ];

  const best = edges
    .filter((e) => e.classification === EdgeClassification.ROAD)
    .flatMap((edge) =>
      ([0, 1] as const).map((end) => ({
        end,
        seq: edge.seq,
        distanceMm: Math.round(distanceToSegment(ends[end], edge.start, edge.end)),
      })),
    )
    .sort((a, b) => a.distanceMm - b.distanceMm || a.seq - b.seq || a.end - b.end)[0];

  if (!best) {
    // No ROAD boundary: §11.3.1 is unreachable. Fall back to the end the old
    // convention left free — the one away from the core — so the entrance still
    // lands by the lifts. The position is traced ASSUMED, not derived.
    return { at: coreNearFarEnd ? 0 : 1 };
  }
  return { at: best.end, roadEdgeSeq: best.seq, roadDistanceM: mmToM(best.distanceMm) };
}

/* ==========================================================================
 * THE LAYOUT
 * ======================================================================= */

export function layoutGroundProgram(input: GroundProgramInput): GroundProgram {
  const frame = frameOf(input.zone);
  if (!frame) {
    return {
      kind: 'NOT_LAID_OUT',
      reason: 'The reserved strip is not a rectangle, so no plant room is drawn in it.',
    };
  }
  if (frame.depthMm < MIN_DEPTH_MM) {
    return {
      kind: 'NOT_LAID_OUT',
      reason:
        `The reserved strip is ${(frame.depthMm / 1000).toFixed(1)} m deep, under the 3.0 m a ` +
        'plant room needs, so none is drawn in it.',
    };
  }

  const { tracer } = input;

  // Lay from the end nearer the core: the entrance belongs by the lifts.
  const along = (p: Pt): number =>
    (p.x - frame.origin.x) * frame.along.x + (p.y - frame.origin.y) * frame.along.y;
  const coreNearFarEnd = input.towards !== undefined && along(input.towards) > frame.lengthMm / 2;
  // Across the strip: the rooms take the side away from the core, up to 7 m deep.
  // That is also the outward side — the one a ventilated room would need — but
  // §11.5.1 is not evaluated here and the choice claims nothing about it.
  const across = (p: Pt): number =>
    (p.x - frame.origin.x) * frame.across.x + (p.y - frame.origin.y) * frame.across.y;
  /*
    WHOLE MILLIMETRES, AND FLOORED RATHER THAN ROUNDED.

    `frame.depthMm` is fractional on a strip that is not axis-aligned — the
    `'skewed'` plot in `pnpm parity` reaches here with 4651.990219250251 — and
    every coordinate in this file goes through `at()`, which rounds. This value
    did not, and once the substation began reporting its own drawn depth as an
    `Mm` it became the first unrounded one: `asMm` refuses a non-integer by
    construction, so eleven tests across the sheets, the DXF and the parity walk
    failed on one arithmetic that had been harmless for as long as nothing
    measured it.

    FLOOR, because the room is drawn INSIDE the strip. Rounding 4651.99 up to
    4652 puts the rooms' far edge a fraction of a millimetre outside the reserved
    strip, which is the one direction this file may not err in — the strip is what
    the parking layout gave up, and a room crossing it is a room standing in a
    bay. It composes with the substation's own direction: `sizeSubstation` takes
    `ceil(area ÷ depth)` along the strip, so a shallower depth buys a wider room
    and §11.4.1's area is still reached from above.
  */
  const depth = Math.floor(Math.min(frame.depthMm, MAX_DEPTH_MM));
  const coreOnFarSide = input.towards !== undefined && across(input.towards) > frame.depthMm / 2;
  const b0 = coreOnFarSide ? 0 : frame.depthMm - depth;

  const substationEnd = chooseSubstationEnd(frame, input.edges ?? [], coreNearFarEnd);
  const typicalEnd: 0 | 1 = substationEnd.at === 0 ? 1 : 0;

  const at = (a: number, b: number): { readonly x: Mm; readonly y: Mm } => ({
    x: asMm(Math.round(frame.origin.x + a * frame.along.x + b * frame.across.x)),
    y: asMm(Math.round(frame.origin.y + a * frame.along.y + b * frame.across.y)),
  });

  const rooms: GroundRoom[] = [];
  const refused: GroundRoomRefusal[] = [];
  /** Millimetres of the strip's length taken from each end. */
  const consumed: [number, number] = [0, 0];
  const remaining = (): number => frame.lengthMm - consumed[0] - consumed[1];

  /** Place `width` of strip at `end`, or refuse it with the figures. */
  const place = (name: string, end: 0 | 1, width: number): void => {
    if (width > remaining()) {
      refused.push({
        name,
        reason:
          `${name} needs ${(width / 1000).toFixed(2)} m along the strip and ` +
          `${(remaining() / 1000).toFixed(2)} m of its ${(frame.lengthMm / 1000).toFixed(2)} m ` +
          'is left, so it was not drawn rather than drawn narrow.',
      });
      return;
    }
    const a0 = end === 0 ? consumed[0] : frame.lengthMm - consumed[1] - width;
    rooms.push({
      name,
      outline: [at(a0, b0), at(a0 + width, b0), at(a0 + width, b0 + depth), at(a0, b0 + depth)],
    });
    consumed[end] += width;
  };

  // --- the substation, sized from §11.4.1 -------------------------------------------
  /*
    FIRST, and before any typical room. A short strip must drop a guess before it
    drops the room a clause on file requires — the opposite order would let an MM
    room 2.5 m wide, which no document mentions, displace a substation DEWA does.
  */
  const substation = sizeSubstation({
    tracer,
    stated: input.substation,
    depthMm: depth,
  });

  let substationDrawn: SubstationSizing['drawn'];
  if (substation.refusal !== undefined) {
    refused.push({ name: SUBSTATION_NAME, reason: substation.refusal });
  } else if (substation.widthMm > remaining()) {
    refused.push({
      name: SUBSTATION_NAME,
      reason:
        `DEWA §11.4.1 requires ${substation.requiredAreaM2.value.toString()} m² for ` +
        `${substation.transformers.value} transformer(s), which in a ` +
        `${(depth / 1000).toFixed(2)} m deep strip is ${(substation.widthMm / 1000).toFixed(2)} m ` +
        `along it. The strip is ${(frame.lengthMm / 1000).toFixed(2)} m long, so the room was ` +
        'not drawn rather than drawn under the cited area.',
    });
  } else {
    /*
      Drawn here rather than through `place()` so the refusals above can name
      §11.4.1's own figures. `place()`'s message is about a strip running out of
      length, which is the right sentence for a typical room and the wrong one
      for a room a clause sized.
    */
    const width = substation.widthMm;
    const a0 = substationEnd.at === 0 ? consumed[0] : frame.lengthMm - consumed[1] - width;
    rooms.push({
      name: SUBSTATION_NAME,
      outline: [at(a0, b0), at(a0 + width, b0), at(a0 + width, b0 + depth), at(a0, b0 + depth)],
    });
    consumed[substationEnd.at] += width;

    const drawnAreaM2 = tracer.computed(
      'plant.substation.drawn_area_m2',
      qArea(new Decimal(width).times(depth).div(1_000_000)),
      {
        formula:
          `${mmToM(width).toFixed(2)} m along the reserved strip × ` +
          `${mmToM(depth).toFixed(2)} m of its depth — the smallest rectangle in this strip ` +
          `that holds §11.4.1's ${substation.requiredAreaM2.value.toString()} m²`,
        uses: { required: substation.requiredAreaM2 },
        unit: 'm²',
      },
    );
    substationDrawn = {
      widthMm: asMm(width),
      depthMm: asMm(depth),
      areaM2: drawnAreaM2,
      placement: placeOnRoad(tracer, substationEnd, frame.lengthMm),
    };
  }

  // --- the LV room, beside it by §11.2.3 --------------------------------------------
  /*
    Only beside the substation, and only if there is a substation. §11.2.3 states
    an ADJACENCY and nothing else; an LV room drawn somewhere else in the strip
    would be a typical figure in a typical place, which is what it was before, and
    one drawn with no substation beside it would be adjacent to nothing while
    carrying a clause that is about adjacency.
  */
  if (substationDrawn) {
    place(LV_ROOM.name, substationEnd.at, LV_ROOM.widthMm);
  } else {
    refused.push({
      name: LV_ROOM.name,
      reason:
        `DEWA §11.2.3 puts the LV room adjacent to the substation, and the substation was ` +
        'not drawn, so there is nothing for it to be adjacent to. It is not drawn ' +
        'elsewhere in the strip: its position is the only thing a clause on file states ' +
        'about it.',
    });
  }

  // --- the typical rooms, from the other end ----------------------------------------
  for (const room of TYPICAL_ROOMS) place(room.name, typicalEnd, room.widthMm);

  if (rooms.length === 0) {
    return {
      kind: 'NOT_LAID_OUT',
      reason: 'The reserved strip is shorter than the smallest room of the program.',
    };
  }

  const notAssessed = notAssessedFor(substationEnd);
  const program = tracer.assumed(
    'building.ground_floor_program',
    rooms.map((r) => r.name.toLowerCase()).join(', '),
    {
      basis:
        `${GROUND_PROGRAM_BASIS} On this run the substation was read with ` +
        `${substation.transformers.value} transformer(s) ` +
        `(${substation.transformers.provenanceClass.toLowerCase().replace('_', ' ')}), which ` +
        `§11.4.1 sizes at ${substation.requiredAreaM2.value.toString()} m²` +
        (substationDrawn
          ? `, drawn ${mmToM(substationDrawn.widthMm).toFixed(2)} × ` +
            `${mmToM(substationDrawn.depthMm).toFixed(2)} m` +
            (substationEnd.roadEdgeSeq === undefined
              ? ', at an end of the strip this engine chose by convention because no ' +
                'boundary of this plot is classified ROAD and §11.3.1 could not be applied.'
              : `, at the end of the strip nearest boundary ${substationEnd.roadEdgeSeq}, ` +
                'which is classified ROAD (§11.3.1).')
          : '; it was not drawn, and the reason is reported with the room.'),
      label: 'indicative ground-floor rooms',
      detail: { notAssessed },
    },
  );

  /*
    THE PROGRAM STAYS `ASSUMED`, and that is not an oversight.

    Every renderer inks all nine rooms from this one node, so its class is the
    colour of the drawing. The *set* of rooms, and where eight of the nine stand,
    is still an assumption — citing one room's area does not make the program a
    services design, and letting the drawing go out of amber would tell a reader
    the opposite of what is true. The substation's own DERIVED figures are
    published separately, on `substation`, for a surface that wants to show them.
  */
  return {
    kind: 'LAID_OUT',
    rooms,
    notPlaced: refused.map((r) => r.name),
    refused,
    program,
    substation: {
      transformers: substation.transformers,
      requiredAreaM2: substation.requiredAreaM2,
      ...(substation.minWidthM !== undefined ? { minWidthM: substation.minWidthM } : {}),
      ...(substationDrawn ? { drawn: substationDrawn } : {}),
    },
    notAssessed,
  };
}

/* ==========================================================================
 * THE SUBSTATION
 * ======================================================================= */

interface SizedSubstation {
  readonly transformers: Traced<number>;
  readonly requiredAreaM2: TracedDecimal;
  readonly minWidthM?: TracedDecimal;
  /** Width along the strip that holds the cited area at the strip's depth. */
  readonly widthMm: number;
  /** Set when the strip cannot hold the room at all. `widthMm` is then unusable. */
  readonly refusal?: string;
}

/**
 * Size the substation from §11.4.1, and reconcile its area against its width.
 *
 * ---------------------------------------------------------------------------
 * THE RECONCILIATION, WHICH IS THE WHOLE POINT OF THIS FUNCTION.
 *
 * The figure this replaces was a *width* — 9 m along the strip. DEWA states an
 * **area** and, in the same row, a **minimum width**. Swapping one number for
 * another would satisfy neither: §11.4.1's own rule record says it in its note,
 * "a 33 m² room 3 m wide meets this record and fails the regulation".
 *
 * So both bind, and they bind on different axes:
 *
 * - the room is drawn at the strip's depth, like every other room in the
 *   program, so its width along the strip is `ceil(area ÷ depth)`. **Ceiling,
 *   not rounding** — §11.4.1 is a `MIN`, and a room 0.4 mm under the cited area
 *   is under it. Errs by containment, the same way `largestInscribedRectangle`
 *   does, so the drawn area is a floor on the cited one and never a shave off it;
 * - the room's *narrower* dimension must reach the stated minimum width. Which
 *   of a room's two dimensions the clause calls "width" is not recoverable from
 *   the table, so the stricter reading is taken: both dimensions must reach it.
 *   The looser reading would pass a 33 m² room 8.25 m × 4.0 m on a 4 m strip,
 *   which is a 4 m-wide transformer room however it is labelled.
 *
 * And when the strip's depth is under that minimum width, **no width along the
 * strip can fix it.** A longer strip gives a bigger room, not a wider one. So
 * the room is refused with both figures named, rather than drawn undersized —
 * extending what this file already did with length to the dimension DEWA added.
 */
function sizeSubstation(args: {
  readonly tracer: Tracer;
  readonly stated: GroundProgramInput['substation'];
  readonly depthMm: number;
}): SizedSubstation {
  const { tracer, depthMm } = args;

  /*
    USER_SET or ASSUMED, and there is deliberately no third path. A transformer
    count is a statement about a building's electrical load and no document on
    file states one for any plot; a DERIVED branch here would be a branch that
    reads a figure no instrument holds.
  */
  const transformers =
    args.stated !== undefined && args.stated.actor !== undefined
      ? tracer.userSet('plant.substation.transformers', args.stated.transformers, {
          actor: args.stated.actor,
          unit: 'transformers',
          label: 'transformers the substation holds',
        })
      : args.stated !== undefined
        ? tracer.assumed('plant.substation.transformers', args.stated.transformers, {
            basis:
              `${args.stated.transformers} transformer(s) were supplied to the engine with ` +
              'no named person attached, so the count is carried as an assumption rather ' +
              "than as somebody's statement. DEWA §11.4.1 is read with it and the " +
              'substation area moves with it.',
            unit: 'transformers',
            label: 'transformers the substation holds',
          })
        : tracer.assumed('plant.substation.transformers', ASSUMED_TRANSFORMERS, {
            basis: ASSUMED_TRANSFORMERS_BASIS,
            unit: 'transformers',
            label: 'transformers the substation holds',
          });

  /*
    Refused rather than clamped on a count that is not a count.
    `singleRoomSubstationAreaM2` throws on zero and on a fraction, and letting it
    throw is right: a plot with no transformer has no substation, and answering a
    count of 1.5 would put a number nobody can defend onto a drawing.
  */
  const requiredAreaM2 = tracer.derived(
    'plant.substation.required_area_m2',
    qArea(new Decimal(singleRoomSubstationAreaM2(transformers.value))),
    {
      rule: { ruleId: AREA_RULE.ruleId, citation: AREA_RULE.citation },
      formula:
        `DEWA §11.4.1 single-room substation (RMU and transformer in one room, ground ` +
        `floor), ${transformers.value} transformer(s)`,
      uses: { transformers },
      unit: 'm²',
      detail: {
        note:
          'The table is not a formula. 33 → 55 is +22 and every transformer after the ' +
          'second is +25, so 33 + 25 × (n − 1) gives 58 for two and is wrong by 3 m² on ' +
          'the most common case in Dubai; four and above take 10 m² more that no linear ' +
          'fit reaches. The area is DERIVED because §11.4.1 fixes it exactly once the ' +
          'count is known — the uncertainty is in the count, which is its own node.',
        countClass: transformers.provenanceClass,
      },
    },
  );

  const minWidthValue = citedMinWidthM(transformers.value);
  const minWidthM =
    minWidthValue === undefined
      ? undefined
      : tracer.derived('plant.substation.min_width_m', minWidthValue, {
          rule: { ruleId: WIDTH_RULE.ruleId, citation: WIDTH_RULE.citation },
          formula: `DEWA §11.4.1 minimum width, ${transformers.value} transformer(s)`,
          uses: { transformers },
          unit: 'm',
        });

  const requiredMm2 = requiredAreaM2.value.times(1_000_000);
  const minWidthMm = minWidthValue === undefined ? undefined : toMm(minWidthValue);
  const widthMm = Math.max(
    requiredMm2.div(depthMm).ceil().toNumber(),
    minWidthMm ?? 0,
  );

  const base = {
    transformers,
    requiredAreaM2,
    ...(minWidthM !== undefined ? { minWidthM } : {}),
    widthMm,
  };

  if (minWidthMm !== undefined && depthMm < minWidthMm) {
    return {
      ...base,
      refusal:
        `DEWA §11.4.1 requires ${requiredAreaM2.value.toString()} m² at a minimum width of ` +
        `${minWidthValue?.toString()} m for ${transformers.value} transformer(s). The ` +
        `reserved strip is ${mmToM(depthMm).toFixed(2)} m deep, so no room drawn in it ` +
        `reaches that width however long it is made — a ${requiredAreaM2.value.toString()} m² ` +
        `room ${mmToM(depthMm).toFixed(2)} m wide meets the area and fails the clause. The ` +
        'substation was not drawn rather than drawn undersized.',
    };
  }

  return base;
}

/**
 * Where the substation stands: §11.3.1 where the plot classifies a road, an
 * assumption where it does not.
 *
 * `DERIVED` here is the same shape as `access.ts`'s B.7.2.1 recommendation — a
 * placement produced by applying a cited clause, with the residue the clause
 * leaves named beside it rather than quietly dropped. The residue is large and
 * is stated in `notAssessed`: the reserved strip sits **inside the podium**,
 * behind the setback, so the room is laid at the strip's road-facing end and is
 * not against the boundary. "Directly located on" needs a frontage this engine
 * does not place, and nothing here claims it has been met.
 */
function placeOnRoad(
  tracer: Tracer,
  end: SubstationEnd,
  stripLengthMm: number,
): Traced<string> {
  const which = end.at === 0 ? 'first' : 'far';
  if (end.roadEdgeSeq === undefined) {
    return tracer.assumed(
      'plant.substation.placement',
      `at the ${which} end of the reserved strip, by convention`,
      {
        basis:
          'DEWA §11.3.1 requires the substation room to be directly located on an ' +
          'RTA/Public Road or Sikka. No boundary of this plot is classified ROAD, so the ' +
          'clause could not be applied and the end of the strip was chosen the way it was ' +
          'before the clause was on file: the end away from the core, so the entrance ' +
          'lobby lands by the lifts. That is a drafting convention and not a derivation. ' +
          'Classify the plot boundaries and the substation moves to the road end. A sikka ' +
          'is not modelled at all — `EdgeClassification` has no member for one and an ' +
          'affection plan does not state one — so §11.3.2 is NOT ASSESSED rather than ' +
          'refused.',
        label: 'where the substation stands',
      },
    );
  }
  return tracer.derived(
    'plant.substation.placement',
    `at the ${which} end of the reserved strip, nearest boundary ${end.roadEdgeSeq}`,
    {
      rule: { ruleId: ON_ROAD_RULE.ruleId, citation: ON_ROAD_RULE.citation },
      formula:
        `the end of the ${mmToM(stripLengthMm).toFixed(2)} m reserved strip nearest a ` +
        `boundary classified ROAD — boundary ${end.roadEdgeSeq}, ` +
        `${end.roadDistanceM?.toFixed(2) ?? '?'} m away`,
      /*
        NO `uses`, and deliberately not `uses: {}` either. The inputs to this
        placement are the plot's edge classifications and the strip's geometry,
        neither of which is a `Traced` value anywhere in this engine — a
        classification is a `Plot` field a reader entered, and the strip is a ring
        the layout returned. The citation is still reached: `derived()` builds the
        RULE and SOURCE_CLAUSE nodes, which is what §13.3 walks for.
      */
      detail: {
        residue:
          'The reserved strip sits inside the podium, behind the setback. So the room is ' +
          'laid at the strip\'s road-facing end and is NOT against the boundary: whether ' +
          'it is "directly located on" the road in §11.3.1\'s sense needs a frontage and a ' +
          'façade this engine does not place, and is NOT ASSESSED.',
        hierarchyNote:
          '§11.3.1 asks only that the boundary be an RTA/Public Road or Sikka and states ' +
          'no preference between roads, so RoadHierarchy is not consulted. B.7.2.1 ' +
          'prefers the secondary road for vehicle access; that is a different clause ' +
          'about a different thing.',
      },
    },
  );
}

/* ==========================================================================
 * THE PUBLISHED ABSENCE
 * ======================================================================= */

/**
 * What this program does not check.
 *
 * The DEWA entries are built **from `DEWA_NOT_MECHANIZED`** rather than re-typed
 * from it. That list is the instrument's own record of which clauses of Section
 * 11 were deliberately left out of the engine and why; a copy here would be a
 * second list that agrees with the first until somebody encodes one of them, and
 * then goes on publishing an absence that is no longer absent.
 */
function notAssessedFor(end: SubstationEnd): readonly string[] {
  return [
    ...(end.roadEdgeSeq === undefined
      ? [
          'Whether the substation is on a road at all (DEWA §11.3.1). No boundary of ' +
            'this plot is classified ROAD, so the clause was not applied and the end of ' +
            'the strip the room was laid at is a drafting convention.',
        ]
      : [
          'Whether the substation is "directly located on" the road (DEWA §11.3.1). It ' +
            'is laid at the end of the reserved strip nearest the classified road ' +
            'boundary, and that strip is inside the podium behind the setback — the room ' +
            'is near the road, not against it.',
        ]),
    'Ventilation (DEWA §11.5.1: "minimum two side\'s ventilation with aluminum louver ' +
      'doors"). PARTIALLY_MECHANIZED in its own record and not evaluated here. It is ' +
      'the clause behind the client\'s own sentence that a substation "cannot sit in ' +
      'the middle", and this engine does not check that it does not.',
    'Clear height (DEWA §11.2.5: 3.7 m minimum at ground floor for a single-room ' +
      'substation). The ground floor\'s floor-to-floor is not held to it, so a level ' +
      'that cannot take this room may still be reported as holding it.',
    'Whether the main panel is private, which is the condition DEWA §11.2.3 attaches ' +
      'to the LV room adjacency. No affection plan states panel ownership, so the ' +
      `adjacency drawn here follows ${LV_ADJACENT_RULE.ruleId} without establishing ` +
      'that the clause applies — and the LV room\'s own 5 m width is a typical figure ' +
      'either way, since Section 11 states no LV room area.',
    'The size of every room other than the substation. The entrance lobby, generator ' +
      'room, pump room, water tank, garbage room, TEL room and MM room are typical ' +
      'widths; no DEWA, Civil Defence or municipality requirement on file states any ' +
      'of them.',
    'The transformer count, unless a named person entered one. It is a load ' +
      'calculation this engine does not perform, and §11.4.1 is a table read with it.',
    ...DEWA_NOT_MECHANIZED.map((c) => `DEWA ${c.clause}. ${c.why}`),
    'REGULATORY VALIDITY: NOT ASSESSED. A cited area is not a compliance check, and ' +
      'the records this program reads are DRAFT — genuinely transcribed, and reviewed ' +
      'by nobody.',
  ];
}
