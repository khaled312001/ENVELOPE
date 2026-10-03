/**
 * The building, as one model every drawing reads.
 *
 * Three outputs draw the same scheme — the sheets on screen, the massing view and
 * the DXF — and until this type existed each of them was handed a different slice
 * of a run and left to assemble a building from it. Three assemblies of one scheme
 * is three chances for the drawing to disagree with the count, and the massing
 * view, which is the most persuasive surface in the product, was the one with the
 * most room to invent.
 *
 * So the engine emits the building once, here, and every output only reads it:
 *
 * - **Geometry is integer millimetres in plot coordinates**, the kernel's own
 *   units (PRD §14.3). Nothing downstream converts, rotates or offsets.
 * - **Every element names the traced value that defines it** — its `source` — so
 *   its colour is the provenance class of that value and a click on it opens that
 *   value's derivation. An element with no traced value behind it cannot be
 *   written, because `source` is not optional.
 * - **Every word drawn inside the model is the engine's.** "6.00 M WIDE 2 WAY
 *   DRIVEWAY" is emitted with the aisle it labels, from the standard that sized
 *   it; a renderer that typed its own label would be quoting a number it did not
 *   check.
 * - **What is not modelled is listed**, in `notModelled`. A drawing with no
 *   columns reads as a scheme with no columns unless it says why.
 *
 * The type lives in `core` and is built in `capacity`, so `exports` can draw it
 * without being able to see the engine that made it (`pnpm boundaries`).
 * Everything in it is plain JSON: the API sends it as it is.
 */

import type { EdgeClassification, RoadHierarchy } from './domain.js';
import type { Mm } from './numeric.js';
import type { ProvenanceClass } from './provenance/classes.js';
import type { NodeId } from './provenance/graph.js';
import type { TracedWire } from './provenance/traced.js';

/** A point on the 1 mm grid, in plot coordinates. */
export interface ModelPoint {
  readonly x: Mm;
  readonly y: Mm;
}

/** A closed ring; the first vertex is not repeated. */
export type ModelRing = readonly ModelPoint[];

/**
 * The traced value an element is drawn from.
 *
 * Its class is the element's colour. Its node is where a click on the element
 * goes — the derivation of the number that put it there.
 */
export interface ElementSource {
  readonly node: NodeId;
  readonly provenanceClass: ProvenanceClass;
}

export const LevelUse = {
  /** Below grade, holding parking. */
  BASEMENT_PARKING: 'BASEMENT_PARKING',
  /** A podium level holding parking — "the podium is all garage and core". */
  PODIUM_PARKING: 'PODIUM_PARKING',
  /** A podium level the declared parking does not reach. */
  PODIUM: 'PODIUM',
  /** A tower floor on the plate. */
  TYPICAL: 'TYPICAL',
} as const;
export type LevelUse = (typeof LevelUse)[keyof typeof LevelUse];

export interface ModelBay {
  /** 1-based, per level, in the order a reader scans the sheet: row, then along it. */
  readonly number: number;
  readonly outline: ModelRing;
  readonly accessible: boolean;
}

export interface ModelAisle {
  readonly outline: ModelRing;
  /** The aisle's centre line, end to end, for a direction arrow. */
  readonly centreLine: readonly [ModelPoint, ModelPoint];
  readonly twoWay: boolean;
  /** Drawn along the aisle. Emitted from the standard that sized it. */
  readonly label: string;
  /**
   * The cross aisle, which joins the module aisles to the way onto the level.
   *
   * Said here rather than inferred from the drawing, because every aisle on a
   * level is the same width and runs at one of two right angles: a renderer
   * guessing which one is the connector would guess, and the first sheet that
   * dimensioned a module across it measured a run of bays that does not exist.
   */
  readonly crossing: boolean;
}

/**
 * Area taken off a parking level before any bay is placed.
 *
 * Cores, plant, the ramp landing and circulation that is not drive aisle — the
 * run declares how much (the usable fraction), and not where each of those
 * things goes. So this is drawn as what it is: a reserved zone of the declared
 * size, not a core with stairs and lifts nobody laid out.
 */
export interface ModelReservedZone {
  readonly outline: ModelRing;
  readonly areaM2: TracedWire;
  readonly label: string;
}

/** A room of the indicative ground-floor program. See `ground-program.ts` in `@envelope/capacity`. */
export interface ModelGroundRoom {
  readonly name: string;
  /** [origin, +along, +along+across, +across] — so a sheet recovers the room's axes. */
  readonly outline: ModelRing;
}

/**
 * The entrance and plant rooms drawn in the ground floor's reserved strip — an
 * assumed program, never a services design. Only on the parking level at grade.
 */
export interface ModelGroundRooms {
  readonly levelId: string;
  readonly rooms: readonly ModelGroundRoom[];
  /** The assumed program: the rooms' ink and click target. */
  readonly source: ElementSource;
  /** Rooms of the program the strip had no length left for. */
  readonly notPlaced: readonly string[];
}

/** A room of the indicative core layout. See `core-layout.ts` in `@envelope/capacity`. */
export interface ModelCoreRoom {
  readonly kind: 'STAIR' | 'LIFT' | 'LOBBY';
  /** [origin, +along, +along+across, +across] — so a sheet recovers the room's axes. */
  readonly outline: ModelRing;
}

/**
 * The vertical core, as the engine sized and placed it.
 *
 * One footprint for the whole stack: the core is the same rectangle of plan on
 * every level it passes through, which is what makes it a core rather than a
 * room that moves. `levelIds` says which levels those are, so a sheet can draw
 * it without deciding for itself.
 *
 * **Only the area is a quantity.** The outline is the tower plate scaled about
 * its centre to that area, because the area fixes how much plate the core takes
 * and says nothing about where it stands. The stairs, lifts and lobby inside it
 * (`rooms`) are an indicative layout, assumed, and never an egress design; no
 * riser or core wall is placed, and `notModelled` says so under every drawing.
 */
export interface ModelCore {
  readonly outline: ModelRing;
  readonly areaM2: TracedWire;
  /** Core ÷ tower plate, traced — the figure the reconciliations are made on. */
  readonly plateShare: TracedWire;
  /** The area's own value: the element's ink and its click target. */
  readonly source: ElementSource;
  readonly label: string;
  /** Every level the core passes through, bottom to top. */
  readonly levelIds: readonly string[];
  /**
   * What the core says about the two inputs that already account for it.
   *
   * A core is inside GFA and outside saleable area, and on a parking level it is
   * inside what the usable fraction deducts. So it is never subtracted twice —
   * it is compared, and these are those comparisons in words. Neither blocks.
   */
  readonly reconciliation: readonly string[];
  /**
   * Stairs, lifts and the lift lobby, as an indicative layout — ASSUMED, drawn in
   * the assumed ink, and never an egress design. Empty when the core is not a
   * rectangle or too small for the program, and `roomsNote` then says why.
   * Absent on a run stored before the layout existed.
   */
  readonly rooms?: readonly ModelCoreRoom[];
  /** The assumed program the rooms are drawn from: their ink and click target. */
  readonly roomsSource?: ElementSource;
  /** Why nothing is drawn inside the core, when nothing is. */
  readonly roomsNote?: string;
  /**
   * What of the core passes through a parking level: the box its stairs, lifts
   * and lift lobby fill. The parking layout places no bay inside it, and the
   * parking sheets and the 3D view draw it there instead of the whole core.
   * Absent where no indicative layout fits — the whole core is then the
   * obstruction — and on a run stored before the shaft existed.
   */
  readonly shaft?: { readonly outline: ModelRing; readonly areaM2: TracedWire; readonly label: string };
}

export interface ModelLevel {
  /** `B1`, `P1`, `L01` — what the sheets and the section call it. */
  readonly id: string;
  readonly name: string;
  readonly use: LevelUse;
  /** Floor level, millimetres from the ground datum. Negative below grade. */
  readonly elevationMm: Mm;
  readonly heightMm: Mm;
  /** The same elevation, traced, in metres — the figure the section quotes. */
  readonly elevationM: TracedWire;
  /** The slab edge. */
  readonly outline: ModelRing;
  readonly outlineSource: ElementSource;
  /**
   * Whether the governing answer places this level.
   *
   * The stack stands to the height ceiling, because that is the envelope the rules
   * permit and the sections and the glass are drawn against it. The answer usually
   * uses less: `capacity.levels` whole levels of floor area. On the worked example
   * the ceiling permits 14 levels above ground and the parking band governs at 5,
   * so a stack that drew all 14 alike was a building the answer does not contain —
   * on the most persuasive surface in the product, beside the figure that says 5.
   *
   * Parking levels are always placed: the answer rests on the bays they hold. The
   * answer's levels are the lowest above the parking, because a building stands on
   * the ground; every level above them is permitted and not placed.
   */
  readonly placed: boolean;
  /** Present on parking levels only. Identical on every one: see `parking.ts`. */
  readonly parking: {
    readonly bays: readonly ModelBay[];
    readonly aisles: readonly ModelAisle[];
    readonly reserved: ModelReservedZone | null;
    /** The ramp strip reserved on this level, whether or not a ramp uses it. */
    readonly rampStrip: ModelRing | null;
    /**
     * The module the level was laid out to, as Table B.11 states it.
     *
     * Three strings, so the sheet can dimension one module across — bay, aisle,
     * bay — with the figures the engine cited rather than distances read off the
     * rectangles it drew. Identical on every parking level, like the rest of
     * this object.
     */
    readonly module: {
      readonly bayWidthM: string;
      readonly bayLengthM: string;
      readonly aisleWidthM: string;
    };
    readonly baysSource: ElementSource;
    /**
     * The engine's count for this level, traced. A sheet prints this, never the
     * length of `bays` — and `pnpm parity` fails the day the two differ.
     */
    readonly bayCount: TracedWire;
  } | null;
}

/**
 * How cars climb from one parking level to the next — a design choice, stated by a
 * person or assumed, never chosen by the engine to fit more cars.
 *
 * - `STRAIGHT`: one sloped strip, foot to head, beside the cross aisle.
 * - `U_TURN`: two legs side by side and a level landing at the far end, each leg
 *   climbing half the storey; the form on the client's ground-floor drawings.
 * - `LOOP`: no ramp strip at all. The drive aisles run as one loop round the
 *   island of bays the core stands in, and the loop is the ramp: the aisles on
 *   one side climb half a storey to a level landing at the far end, those on the
 *   other climb the second half back — the sloped podium on the client's drawings.
 */
export const RampForm = {
  STRAIGHT: 'STRAIGHT',
  U_TURN: 'U_TURN',
  LOOP: 'LOOP',
} as const;
export type RampForm = (typeof RampForm)[keyof typeof RampForm];

/**
 * One piece of a ramp that is not a single sloped plane: a leg, a landing, a
 * sloped aisle of a loop.
 *
 * `footRise` and `headRise` are the share of the ramp's whole rise at each end —
 * 0 at the lower level, 1 at the upper — so a landing has the same value at both.
 * They place the piece in height; the gradient a reader sees is the ramp's own
 * traced figure, never derived from these.
 */
export interface ModelRampFlight {
  readonly outline: ModelRing;
  readonly foot: readonly [ModelPoint, ModelPoint];
  readonly head: readonly [ModelPoint, ModelPoint];
  readonly footRise: number;
  readonly headRise: number;
}

/**
 * A ramp between two parking levels.
 *
 * A sloped plane from `foot` (on the lower level) to `head` (on the upper), so
 * the massing can stand it up and the section can draw it. The gradient is
 * computed from the rise and the run the layout reserved — and whether that
 * gradient is permitted is NOT ASSESSED: B.7.2.2 is not encoded, and a ramp
 * drawn in cited ink would claim it was.
 */
export interface ModelRamp {
  readonly id: string;
  readonly fromLevelId: string;
  readonly toLevelId: string;
  readonly outline: ModelRing;
  /** The low edge, at the lower level's elevation. */
  readonly foot: readonly [ModelPoint, ModelPoint];
  /** The high edge, at the upper level's elevation. */
  readonly head: readonly [ModelPoint, ModelPoint];
  readonly fromElevationMm: Mm;
  readonly toElevationMm: Mm;
  readonly gradientPct: TracedWire;
  readonly label: string;
  /** How it climbs. Absent on a run stored before the forms existed: a straight strip. */
  readonly form?: RampForm;
  /**
   * Its pieces, when it is not one sloped plane from `foot` to `head` — the legs
   * and landing of a U-turn, the sloped aisles and landing of a loop. Every
   * renderer that stands a ramp up in height draws these instead of the plane.
   */
  readonly flights?: readonly ModelRampFlight[];
  /**
   * A loop's centre line, closed, its corners rounded to the turn a car makes:
   * the drafting path a plan draws for the direction of travel. Emitted by the
   * engine so no renderer decides where the loop runs. Loops only.
   */
  readonly path?: readonly ModelPoint[];
}

/** The words the client writes along his own boundaries, keyed by classification. */
export const EDGE_LABEL = {
  ROAD: 'ROAD SIDE',
  ADJACENT_PLOT: 'NEIGHBOUR',
  OPEN_SPACE: 'OPEN SPACE',
  OTHER: 'BOUNDARY',
} as const;

export interface ModelEdge {
  readonly seq: number;
  readonly start: ModelPoint;
  readonly end: ModelPoint;
  /** "ROAD SIDE", "NEIGHBOUR" — the words the client writes on his own sheets. */
  readonly label: string;
  /** The setback applied to this edge, when one was. */
  readonly setbackM: string | null;
  /**
   * What the plot form says this edge is, and how the road is ranked.
   *
   * Carried on the model rather than re-read from the plot, because the drawings
   * cannot see a `Plot`: they read this and nothing else. The label above is the
   * WORDS; these are the FACTS the words were written from, and a band drawn
   * from a parsed label would be a symbol derived from a string.
   *
   * `roadHierarchy` is null on every edge that is not a road, and on a road
   * nobody has ranked yet — which is a real state and not a missing field.
   */
  readonly classification: EdgeClassification;
  readonly roadHierarchy: RoadHierarchy | null;
  /**
   * The edge's own length, as the plot holds it.
   *
   * Carried so a dimension string prints the engine's figure rather than a
   * distance the composer measured off its own drawing. The two agree on a
   * correct model, which is exactly why the disagreement would never be noticed:
   * the drawing would win, silently, in a file an architect x-refs.
   */
  readonly lengthMm: Mm;
}

export interface ModelAccess {
  readonly edgeSeq: number;
  /** The stretch of boundary the driveway crosses. */
  readonly opening: readonly [ModelPoint, ModelPoint];
  readonly source: ElementSource;
  readonly label: string;
}

/** A stretch of the section line: millimetres from its first end, start then end. */
export type ModelSpan = readonly [Mm, Mm];

/**
 * A section, as the engine cut it.
 *
 * A section is spans: along the cut line, where each slab is and where it is not.
 * They are computed in the kernel (`lineSpans`), on the millimetre grid, so the
 * section drawing and the plans are the same geometry seen two ways rather than
 * two drawings that happen to agree. Distances run from `line[0]`, which is where
 * the cut enters the plot.
 */
export interface ModelSection {
  /** A–A along the ramp when there is one; the long section through the tower. */
  readonly id: 'A' | 'B';
  /** In plan, boundary to boundary. The site plan draws it with its section marks. */
  readonly line: readonly [ModelPoint, ModelPoint];
  /** Where and why the cut was taken — a view, not a quantity, and said as one. */
  readonly taken: string;
  readonly lengthMm: Mm;
  readonly plot: readonly ModelSpan[];
  readonly setbackLine: readonly ModelSpan[];
  readonly levels: readonly {
    readonly levelId: string;
    /** The slab where the line cuts it, openings already taken out. */
    readonly cut: readonly ModelSpan[];
    /** Where a ramp passes through this level's slab. */
    readonly openings: readonly ModelSpan[];
    /** The slab's full extent along the line, seen beyond the cut. */
    readonly beyond: ModelSpan;
  }[];
  /** Each ramp as a slope, when the cut runs along one. */
  readonly ramps: readonly {
    readonly rampId: string;
    readonly foot: { readonly alongMm: Mm; readonly elevationMm: Mm };
    readonly head: { readonly alongMm: Mm; readonly elevationMm: Mm };
  }[];
}

export interface BuildingModel {
  readonly schema: 'envelope.building/1';
  readonly plot: {
    readonly outline: ModelRing;
    readonly edges: readonly ModelEdge[];
  };
  /** The line every cited setback produced. */
  readonly setbackLine: ModelRing;
  readonly setbackSource: ElementSource;
  /** The most the building may reach, from the governing height rule. */
  readonly heightCeilingM: TracedWire;
  /** Bottom to top. */
  readonly levels: readonly ModelLevel[];
  /**
   * The answer's own level count — `capacity.levels`, traced — which `placed` is
   * counted from. A caption quotes this, never a count of the placed levels.
   */
  readonly placedLevels: TracedWire;
  readonly ramps: readonly ModelRamp[];
  readonly access: ModelAccess | null;
  /**
   * Bays drawn across every parking level — the figure the sheets, the massing
   * and the DXF must all reproduce (`pnpm parity`).
   */
  readonly drawnBays: TracedWire;
  /**
   * Where each part of the stack sits, when a rule does not say: which levels are
   * parking, where the podium and the tower stand on their footprints. Every one
   * is a traced assumption with a basis, listed here so a caption can say it.
   */
  readonly placements: readonly {
    readonly subject: string;
    readonly source: ElementSource;
    readonly statement: string;
  }[];
  /**
   * The vertical core, when the run sized one.
   *
   * Null on a run stored before the core existed, which is the only way it is
   * null: every run computed since has one, stated or assumed. A reader of such
   * a run sees a note rather than a core inferred from its numbers.
   */
  readonly core: ModelCore | null;
  /**
   * The indicative ground-floor rooms, when the level at grade is a parking level
   * with a reserved strip deep enough to hold them. Absent otherwise, and on a run
   * stored before the program existed.
   */
  readonly groundRooms?: ModelGroundRooms;
  /** Empty only when no line through the scheme crosses the plot — said in `notModelled`. */
  readonly sections: readonly ModelSection[];
  /** What this model does not contain, and why. Shown with every drawing of it. */
  readonly notModelled: readonly string[];
}
