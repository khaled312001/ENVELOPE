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

export type PaperItem =
  | {
      readonly kind: 'poly';
      readonly role: PaperRole;
      readonly points: readonly PaperPoint[];
      readonly closed: boolean;
      /** For a legend swatch: the model role whose ink it shows, and in which class. */
      readonly swatch?: { readonly role: Role; readonly provenanceClass?: ProvenanceClass };
    }
  | {
      readonly kind: 'text';
      readonly role: PaperRole;
      readonly at: PaperPoint;
      readonly value: string;
      readonly sizeMm: number;
      readonly anchor: 'start' | 'middle' | 'end';
      readonly bold: boolean;
      /** A traced figure's class: its ink, and — for ASSUMED — its word. */
      readonly provenanceClass?: ProvenanceClass;
    };

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
}

/** Who and what the set is for — printed in every title strip. */
export interface SheetMeta {
  readonly plotNumber: string;
  readonly community: string;
  readonly runId: string;
}
