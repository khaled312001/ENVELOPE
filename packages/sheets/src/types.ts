/**
 * A drawing sheet, as data.
 *
 * Three outputs draw the same sheets: the screen (React), the report (an SVG
 * string inside the PDF) and the DXF. If each of them composed its own sheet from
 * the building model, the bay on the screen and the bay in AutoCAD would be two
 * drawings that happen to agree — until the day one of them was changed. So the
 * sheet is composed once, here, as a display list, and every output only walks
 * the list. `pnpm parity` then counts what each output actually drew.
 *
 * Two coordinate spaces, kept apart on purpose:
 *
 * - **Model items** are in the model's own integer millimetres — plot coordinates
 *   on a plan, (distance along the cut, elevation) on a section. The DXF writes
 *   them at true size, because a CAD user measures off the file; the SVG maps
 *   them to paper through the sheet's `view`.
 * - **Paper items** are in millimetres on the A3 sheet: the title strip, the
 *   scale bar, the north arrow. They have no model size and the DXF puts them
 *   nowhere near the geometry.
 *
 * Nothing in this package is runtime-dependent on `core`: it imports types only,
 * so the browser bundle that draws a sheet does not also carry the engine's
 * numeric library.
 */

import type { ElementSource, ModelPoint, ProvenanceClass } from '@envelope/core';

/** What an element is, which decides its layer, its line and its ink. */
export const Role = {
  PLOT: 'plot',
  /** An edge's classification, written along it: "ROAD SIDE", "NEIGHBOUR". */
  EDGE_LABEL: 'edge-label',
  /**
   * The band ranking a boundary — Eng. Mohamed, 2026-09-28, who asked for a
   * symbol for the road and its type.
   *
   * Four roles rather than one with a variant, because the four are inked and
   * weighted differently and the legend names them separately. A single role
   * carrying its hierarchy in a field would put the branch in every renderer.
   */
  BAND_ARTERIAL: 'band-arterial',
  BAND_COLLECTOR: 'band-collector',
  BAND_LOCAL: 'band-local',
  BAND_ACCESS: 'band-access',
  /** A party boundary, and open space. Not roads; not ranked. */
  BAND_NEIGHBOUR: 'band-neighbour',
  BAND_OPEN_SPACE: 'band-open-space',
  SETBACK: 'setback',
  DIMENSION: 'dimension',
  PODIUM: 'podium',
  TOWER: 'tower',
  /** A slab outline on its own level's sheet. */
  SLAB: 'slab',
  /** Something beyond the cut or below the level, drawn for context only. */
  CONTEXT: 'context',
  BAY: 'bay',
  BAY_ACCESSIBLE: 'bay-accessible',
  BAY_NUMBER: 'bay-number',
  CAR: 'car',
  AISLE: 'aisle',
  AISLE_ARROW: 'aisle-arrow',
  RAMP: 'ramp',
  RAMP_ARROW: 'ramp-arrow',
  RESERVED: 'reserved',
  /**
   * The vertical core, drawn through every level it passes.
   *
   * Its own role rather than another obstruction: the reserved zone is an AREA
   * the run declared and did not place, and the core is a footprint the engine
   * did place. They read differently on paper because they mean different
   * things, and a reader who cannot tell them apart learns that the engine laid
   * out the plant room too.
   */
  CORE: 'core',
  /**
   * The indicative layout inside the core — stairs, lifts, the lift lobby.
   *
   * Its own role because it is a different claim from the core: the core's
   * AREA is computed, the rooms inside it are an assumed program, and a reader
   * must be able to switch them off in CAD and see the area alone. Outlines and
   * labels carry the program's class; treads and the lift cross do not, so one
   * assumption is not painted amber forty times over.
   */
  CORE_ROOM: 'core-room',
  /**
   * The entrance and plant rooms of the indicative ground-floor program, drawn
   * in the reserved strip at grade. Its own role for the same reason as the core
   * rooms: the strip's area is the layout's figure, the rooms are an assumption,
   * and CAD must be able to show one without the other.
   */
  GROUND_ROOM: 'ground-room',
  ACCESS: 'access',
  ACCESS_ARROW: 'access-arrow',
  CUT_LINE: 'cut-line',
  /** On a section: the ground line, where the plot is. */
  GROUND: 'ground',
  /** On a section: a level's slab where the line cuts it. */
  SECTION_CUT: 'section-cut',
  /** On a section: a slab seen beyond the cut. */
  SECTION_BEYOND: 'section-beyond',
  SECTION_OPENING: 'section-opening',
  /** On a section: the height the governing rule allows. */
  CEILING: 'ceiling',
  LEVEL_MARK: 'level-mark',
  ANNOTATION: 'annotation',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export interface ShapeItem {
  readonly kind: 'shape';
  readonly role: Role;
  readonly points: readonly ModelPoint[];
  readonly closed: boolean;
  /** The traced value this element is drawn from: its ink and its click target. */
  readonly source?: ElementSource;
  /** Set on a bay, and only on a bay: its number on this level. */
  readonly bay?: number;
  /** An accessible name, for a shape a reader can focus. */
  readonly name?: string;
}

export interface TextItem {
  readonly kind: 'text';
  readonly role: Role;
  readonly at: ModelPoint;
  readonly value: string;
  /** Height on paper, in millimetres. The DXF multiplies it back out by the scale. */
  readonly sizeMm: number;
  /** Anticlockwise from the model's +x, in degrees. Always kept readable (−90, 90]. */
  readonly rotationDeg: number;
  readonly anchor: 'start' | 'middle' | 'end';
  readonly source?: ElementSource;
}

/**
 * A drafting symbol placed in the model: a car in a bay, an arrow along an aisle.
 *
 * A symbol and not a shape because it is one thing to CAD — a block, inserted —
 * and one thing to count. The car symbols on a level are what `pnpm parity`
 * checks against the bays the engine laid out.
 */
export interface SymbolItem {
  readonly kind: 'symbol';
  readonly role: Role;
  readonly symbol: SymbolName;
  readonly at: ModelPoint;
  /** Anticlockwise from the model's +x, in degrees. */
  readonly rotationDeg: number;
  /** Model millimetres per symbol unit: 1 for a true-size car, larger for an arrow. */
  readonly scale: number;
  readonly bay?: number;
}

export type ModelItem = ShapeItem | TextItem | SymbolItem;

export const SymbolName = {
  /** A car at true size, nose towards +x. */
  CAR: 'CAR',
  /** A one-way arrow, one unit long, pointing towards +x. */
  ARROW: 'ARROW',
  /** A two-headed arrow, one unit long, along x. */
  ARROW_2WAY: 'ARROW2',
} as const;
export type SymbolName = (typeof SymbolName)[keyof typeof SymbolName];

/** A point on the sheet, millimetres from its top-left corner. */
export interface PaperPoint {
  readonly x: number;
  readonly y: number;
}

/** Title strip, scale bar, north arrow, frame — ink that has no model size. */
export type PaperRole =
  | 'frame'
  | 'rule'
  | 'title'
  | 'heading'
  | 'label'
  | 'value'
  | 'note'
  | 'warning'
  | 'scale-bar'
  | 'scale-bar-fill'
  | 'north'
  | 'swatch';

/**
 * A title-block field, addressed by KEY rather than by matching its text.
 *
 * FreeCAD TechDraw's `freecad:editable` convention, and it is not ceremony: the
 * sheet count needs it on the first day. A strip is laid out one sheet at a
 * time and only the SET knows how many sheets it has, so `composeSheets` fills
 * `SHEET_OF` afterwards. Filling it by key is a line; filling it by looking for
 * the word "SHEET" also finds the title of every parking sheet.
 */
export const TitleField = {
  PROJECT: 'project',
  PLOT: 'plot',
  COMMUNITY: 'community',
  RUN: 'run',
  TITLE: 'title',
  NUMBER: 'number',
  SHEET_OF: 'sheet-of',
  SCALE: 'scale',
  DATE: 'date',
  REVISION: 'revision',
  DRAWN: 'drawn',
  CHECKED: 'checked',
} as const;
export type TitleField = (typeof TitleField)[keyof typeof TitleField];

export interface PaperPoly {
  readonly kind: 'poly';
  readonly role: PaperRole;
  readonly points: readonly PaperPoint[];
  readonly closed: boolean;
  /** For a legend swatch: the model role whose ink it shows, and in which class. */
  readonly swatch?: { readonly role: Role; readonly provenanceClass?: ProvenanceClass };
}

export interface PaperText {
  readonly kind: 'text';
  readonly role: PaperRole;
  readonly at: PaperPoint;
  readonly value: string;
  readonly sizeMm: number;
  readonly anchor: 'start' | 'middle' | 'end';
  readonly bold: boolean;
  /** A traced figure's class: its ink, and — for ASSUMED — its word. */
  readonly provenanceClass?: ProvenanceClass;
  /**
   * Which title-block field this text IS — set on the value, never on its label.
   *
   * Only the first line of a wrapped value carries it: a field is one value, so
   * a consumer that replaces it replaces that line.
   */
  readonly field?: TitleField;
}

export type PaperItem = PaperPoly | PaperText;

/**
 * How model millimetres land on paper.
 *
 * `paper = centrePaper + (model − centreModel) ÷ scale`, with y flipped because
 * the model's y is north and the sheet's is down the page.
 */
export interface SheetView {
  /** The denominator of the scale: 200 is 1:200. */
  readonly scale: number;
  readonly centreModel: { readonly x: number; readonly y: number };
  readonly centrePaper: PaperPoint;
}

export const SheetKind = {
  SITE: 'SITE',
  PARKING: 'PARKING',
  TYPICAL: 'TYPICAL',
  SECTION: 'SECTION',
} as const;
export type SheetKind = (typeof SheetKind)[keyof typeof SheetKind];

/** One line of the title strip: a label over a value, the value in its own ink. */
export interface StripFact {
  readonly label: string;
  readonly value: string;
  /** Set when the value is traced; an ASSUMED value is printed amber and says so. */
  readonly provenanceClass?: ProvenanceClass;
  /**
   * The provenance node the value was read from. On paper a fact is ink; on
   * screen it is a button that opens its derivation, and this is what it opens.
   */
  readonly node?: string;
}

/** One row of the key: what an ink or a symbol on this sheet means. */
export interface LegendEntry {
  readonly role: Role;
  readonly provenanceClass?: ProvenanceClass;
  readonly label: string;
  /**
   * Show the SYMBOL instead of a colour swatch — §4.9 item 8's symbol key.
   *
   * It is drawn from `SYMBOLS`, the same geometry the sheet inserts and the DXF
   * blocks. Redrawing a little car here would give the legend a symbol the
   * drawing does not use, which is the one thing a key must never do.
   */
  readonly symbol?: SymbolName;
}

export interface Sheet {
  /** Stable, for a URL or a tab: `site`, `level-B1`, `typical`, `section-a`. */
  readonly id: string;
  readonly kind: SheetKind;
  /** The level this sheet draws, on a level sheet. */
  readonly levelId: string | null;
  /** "A-101", in the order a set is bound. */
  readonly number: string;
  readonly title: string;
  readonly paper: { readonly widthMm: number; readonly heightMm: number };
  readonly view: SheetView;
  /**
   * Paper millimetres the model items are drawn inside, and clipped to on paper.
   * The DXF is never clipped: a CAD file is the whole model at true size.
   */
  readonly viewport: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly items: readonly ModelItem[];
  readonly paperItems: readonly PaperItem[];
  /**
   * What the sheet says in words beside the drawing: its placements and what it
   * does not model. On screen these are real text, not paper items, so they
   * reflow and can be read by a screen reader.
   */
  readonly notes: readonly string[];
  /**
   * The values the title strip quotes, as data. The strip prints them; the screen
   * lists them as traced values a keyboard can reach, because a click target
   * inside a drawing is a pointer-only way to a derivation.
   */
  readonly facts: readonly StripFact[];
  /**
   * The key, as data — every ink and every symbol this sheet actually draws.
   *
   * On paper it is ink; here it is a list, which is what lets a test hold the
   * sheet to the property that matters: a symbol drawn and not keyed is a symbol
   * a reader has to guess at.
   */
  readonly legend: readonly LegendEntry[];
}

/** Who and what the set is for — printed in every title strip. */
export interface SheetMeta {
  readonly plotNumber: string;
  readonly community: string;
  readonly runId: string;
  /**
   * When the FIGURES were computed, ISO 8601 — never when the sheet was drawn.
   *
   * A title block's date is read as the date of the information on it. Stamping
   * `new Date()` at export time would re-date a six-month-old run every time
   * somebody downloaded it, on a sheet whose figures had not moved since. So it
   * is supplied by whoever holds the run's record, and there is no default: a
   * date this package invented would be a number the engine did not produce.
   */
  readonly issuedAt: string;
  /**
   * Who signed G4, when somebody has. Absent prints NOT CHECKED, in words.
   *
   * A blank "checked by" box reads as an oversight; this one is a fact, and the
   * difference matters on the sheet somebody x-refs. Note what the name means
   * even when it is there — G4 records a NAMED REVIEWER, not a compliance
   * check, and REGULATORY VALIDITY: NOT ASSESSED is on the same strip.
   */
  readonly checkedBy?: string;
}
