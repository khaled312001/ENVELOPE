/**
 * THE PLOT, TRACED ON REAL IMAGERY — step 1's third way in.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS COMPONENT HAS THE SHAPE IT HAS, WHICH IS THE WHOLE OF ITS DESIGN.
 *
 * `PlotForm.tsx` opens with the argument this file has to honour rather than
 * contradict: `FR-PLT-001` offers "manual polygon drawing on a basemap" and
 * `AC2` then blocks a run when the computed and the stated areas differ by more
 * than 2% — and hand-tracing a plot on a satellite tile routinely lands 2–5%
 * off. The PRD's primary input method trips the PRD's primary input validation.
 *
 * The resolution is NOT to make the trace more accurate. It is to make the trace
 * a PROPOSAL. Every figure this component measures arrives in the boundary table
 * as the same editable decimal string a reader would have typed off the sheet —
 * `lengthM` and `bearingDeg`, the two fields `EdgeDraft` already holds — and the
 * reader overtypes whichever ones the document disagrees with. The client said
 * it in one sentence: *«لو هي مش مظبوطة، أنا أظبّط الرقم»* (4 Oct 2026, 12:40).
 *
 * Three consequences, and each of them is a thing somebody will try to "fix":
 *
 *  1. THE TRACE IS HANDED OVER ON A BUTTON PRESS, never live. A map that wrote
 *     into the form on every click would overwrite a length the reader had
 *     already corrected, silently, at the moment they moved a vertex. That is
 *     the same discipline `PlotForm`'s autosave already states for a recovered
 *     draft: it is OFFERED and never applied, because the reader is the only
 *     party who knows which of the two numbers they wanted.
 *
 *  2. NOTHING HERE IS SUBMITTED. This component has no `api` import and no
 *     knowledge of a plot id. It produces strings for a form. The engine's
 *     `Plot.ring` is built from the TYPED traverse, and the typed traverse is
 *     what the 2% check is run against — which is what makes that check able to
 *     catch a mistraced boundary instead of agreeing with it.
 *
 *  3. NO VALUE HERE IS `Traced`, AND THAT IS CORRECT RATHER THAN AN OMISSION.
 *     `DERIVED` in this system means a value reached a cited regulatory
 *     instrument in the provenance graph. A vertex clicked on a satellite tile
 *     reached a photograph. Wrapping it in a `Traced` node would manufacture a
 *     provenance record for a measurement nobody made — the most consequential
 *     piece of laundering available on this screen. The boundary table's fields
 *     are `USER_SET` by whoever leaves them in place, and that happens at the
 *     form, under their name, after they have looked at each one.
 *
 * ---------------------------------------------------------------------------
 * THE MAP IS THE OPTIONAL HALF OF THIS PANEL.
 *
 * Every number on this screen is computed by the pure functions below from a
 * list of longitude/latitude pairs. The GL canvas is one way of editing that
 * list; a pair of number inputs and an Add button is another, and the table of
 * boundaries is the same content in text. So a browser with no WebGL, a machine
 * with blocked tiles, a screen reader and `renderToStaticMarkup` all get a
 * working panel — which is also why the tests below need no GL context.
 *
 * A map is a pointer-only control unless it is built not to be, and this one
 * carries the three things that make it otherwise: coordinate entry, a real
 * table as the text equivalent of the ring, and every control a real button
 * outside the canvas. `maplibre-gl` is loaded by dynamic import inside the
 * effect, so it is absent from the initial bundle and from the test — the site
 * is opened on a plot with no wifi, and nine hundred kilobytes of map engine is
 * not something a reader who typed four lengths should have paid for.
 *
 * ---------------------------------------------------------------------------
 * THERE IS NO PARCEL LAYER, AND THE UI SAYS SO IN ONE LINE.
 *
 * No free or paid parcel-boundary service for Dubai exists to draw from —
 * `gis.dda.gov.ae` answers "Token Required" on every folder. So the imagery is
 * Esri's World Imagery (keyless, attribution shown), the optional overlay is
 * OpenStreetMap (contributor-drawn building footprints and streets, not a
 * cadastral source), and neither draws a plot line. What a reader sees under
 * the cursor is a roof, a wall or a kerb. The affection plan remains the
 * authority; the underlay below is how the trace is made to agree with it.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Decimal } from '@envelope/core';

import {
  fromUtm40,
  gridBearingDeg,
  legBetween,
  ringAreaM2,
  toUtm40,
  type LngLat,
} from '../geo.js';
import { AR } from '../i18n/plotMap.ar.js';
import { EN } from '../i18n/plotMap.en.js';
import { useDict } from '../i18n/locale.js';

/* `import type` is erased, so naming maplibre's own types costs nothing at
   runtime and the module itself is still loaded only inside the effect. */
import type {
  GeoJSONSource,
  ImageSource,
  Map as MapLibreMap,
  MapLayerMouseEvent,
  MapLayerTouchEvent,
} from 'maplibre-gl';

/* -------------------------------------------------------------------------
 * CONSTANTS. Every one of them named, because none may be typed into a
 * dictionary and none may appear twice.
 * ---------------------------------------------------------------------- */

/**
 * Esri World Imagery. Keyless, and the attribution is rendered on the map.
 *
 * `{z}/{y}/{x}` — ROW BEFORE COLUMN, which is Esri's own path order and NOT the
 * `{z}/{x}/{y}` every other tile service uses. maplibre substitutes the three
 * tokens wherever they appear, so this URL is correct as written; a reader
 * "correcting" the order gets a map of somewhere else, transposed about the
 * diagonal, which at Dubai's latitude still looks like plausible desert.
 */
const ESRI_IMAGERY =
  'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

/** OpenStreetMap's standard raster. Contributor-drawn, ODbL, attribution shown. */
const OSM_RASTER = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

/**
 * `FR-PLT-001 AC2`'s tolerance, as a number so a percentage can be compared
 * against it. `PlotForm.tsx` names the same figure as the string `'2%'` for its
 * own sentences; it is not imported from there because this component may not
 * reach into that file, and the duplication is flagged for the composition root
 * rather than hidden.
 */
const AREA_TOLERANCE_PERCENT = 2;

/**
 * Decimal places on a traced length and bearing: THE GRID'S, NOT THE TRACE'S.
 *
 * Three places is a millimetre, which is the grid the kernel computes on and the
 * precision `walkTraverse` rounds every corner to. Printing two would make the
 * traverse the form walks fail to close by up to a couple of centimetres — and
 * that misclose would be reported to the reader as a property of their trace
 * when it is a property of this formatter. A number that looks like information
 * and is not is worse than no number.
 *
 * `handoff.precision` says the matching sentence out loud on the screen, because
 * three decimal places on a figure clicked off a photograph otherwise reads as
 * an accuracy claim.
 */
const TRACE_DP = 3;

/** Areas, as `AREA_DP` in `@envelope/core` and as `PlotForm`'s own readout. */
const AREA_DP = 2;

/**
 * Degrees printed in the coordinate column. Six places is about 110 mm at this
 * latitude — finer than the imagery can be aimed at and coarse enough to read.
 */
const DEGREE_DP = 6;

/**
 * Where the map opens when nothing says otherwise.
 *
 * THIS IS NOT A HIDDEN DEFAULT, because it is not a value: nothing is computed
 * from the viewport, no output names it, and the reader's first scroll replaces
 * it. The one thing that IS derived from the view is the underlay's opening
 * placement, and that one is reported as an assumption with a basis and a
 * sensitivity — see `assumedPlacement`.
 */
const OPENING_VIEW: LngLat = { lng: 55.2708, lat: 25.2048 };
const OPENING_ZOOM = 17;

/**
 * The sheet's opening opacity, and the width it falls back to.
 *
 * Both are view properties under the same argument as `OPENING_VIEW`: nothing is
 * computed from either, and the reader moves both within a second of seeing the
 * sheet. They are named rather than inlined because an unnamed 60 in a JSX
 * attribute is indistinguishable from a number somebody measured.
 *
 * `FALLBACK_SHEET_WIDTH_M` is reached only when the view itself cannot be
 * measured — a viewport straddling the edge of zone 40N — and the placement it
 * produces is reported as `ASSUMED` with its basis and sensitivity like any other.
 */
const OPENING_OPACITY_PERCENT = 60;
const FALLBACK_SHEET_WIDTH_M = 200;

/** How close a click has to land on the first point to close the ring. */
const CLOSE_PICK_PX = 14;

/** The calibration asks for four picks and then a distance. */
const CALIBRATION_PICKS = 4;

/* -------------------------------------------------------------------------
 * THE PURE FUNCTIONS. Everything the panel reports is computed here, out of
 * React, so it is testable without a DOM and without a GL context.
 * ---------------------------------------------------------------------- */

/**
 * One boundary, in the two fields `PlotForm`'s `EdgeDraft` already holds.
 *
 * STRINGS, DELIBERATELY. The form's fields are strings a reader types into, and
 * handing it a number would mean the form had to format it — at which point
 * there are two formatters and one of them is wrong. Strings also make the
 * design visible: what arrives is text in a box, which is what "you may
 * overtype this" looks like.
 */
export interface TracedLegDraft {
  readonly lengthM: string;
  readonly bearingDeg: string;
}

/** Why a point was refused. Codes, so the words stay in the dictionary. */
export type VertexRefusal = 'outside-zone-40' | 'not-a-coordinate';

export interface VertexAdmission {
  readonly ring: readonly LngLat[];
  readonly refusal: VertexRefusal | null;
}

/**
 * The gate every vertex passes through, whether it was clicked or typed.
 *
 * `toUtm40` throws outside zone 40N rather than projecting, because a point one
 * zone over comes back as a plausible easting that is kilometres wrong — and it
 * would then be dimensioned, drawn, exported and x-referenced into a submission
 * set. Catching it HERE rather than at the readout is what keeps the ring itself
 * projectable: every function below may assume its ring is in the zone, so none
 * of them has to carry a refusal path of its own.
 */
export function admitVertex(ring: readonly LngLat[], point: LngLat): VertexAdmission {
  if (!Number.isFinite(point.lng) || !Number.isFinite(point.lat)) {
    return { ring, refusal: 'not-a-coordinate' };
  }
  try {
    toUtm40(point);
  } catch {
    /* The only two reasons `toUtm40` throws are a non-coordinate, which is
       already answered above, and a position outside the zone. */
    return { ring, refusal: 'outside-zone-40' };
  }
  return { ring: [...ring, point], refusal: null };
}

/** Fixed-place formatting, through `Decimal`, so no float ever reaches a string. */
const fixed = (value: number, dp: number): string => new Decimal(value).toFixed(dp);

/**
 * The traverse this screen hands the form.
 *
 * `ringToLegs` closes the figure with the caller's last leg rather than by
 * repeating a vertex, so the count of legs equals the count of points and the
 * form never receives a zero-length boundary that then wants a classification.
 */
export function legDrafts(ring: readonly LngLat[]): readonly TracedLegDraft[] {
  if (ring.length < 3) return [];
  const legs: TracedLegDraft[] = [];
  for (let i = 0; i < ring.length; i += 1) {
    const leg = legBetween(ring[i]!, ring[(i + 1) % ring.length]!);
    legs.push({
      lengthM: fixed(leg.lengthM, TRACE_DP),
      bearingDeg: fixed(leg.bearingDeg, TRACE_DP),
    });
  }
  return legs;
}

/** One row of the text equivalent: a boundary and the corner it leaves. */
export interface RingRow {
  /** 1-based, matching the boundary numbers the form and the drawing use. */
  readonly n: number;
  readonly lengthM: string;
  readonly bearingDeg: string;
  readonly lat: string;
  readonly lng: string;
}

export interface RingReadout {
  readonly rows: readonly RingRow[];
  /** `null` below three points, because there is no ring to measure. */
  readonly areaM2: string | null;
  readonly perimeterM: string | null;
}

/**
 * THE TRACE AS TEXT, and it is a table rather than a description.
 *
 * A text equivalent of a polygon is not a sentence about its shape; it is its
 * boundaries and their corners, which is a row per boundary. This is the same
 * content the canvas draws, and it is the only version of it that exists for a
 * reader who is not looking at a screen — so it carries the corner coordinates
 * as well as the measurements, since a length alone cannot be checked against
 * anything.
 */
export function ringReadout(ring: readonly LngLat[]): RingReadout {
  const drafts = legDrafts(ring);
  if (drafts.length === 0) return { rows: [], areaM2: null, perimeterM: null };

  let perimeter = new Decimal(0);
  const rows = drafts.map((leg, i) => {
    perimeter = perimeter.plus(new Decimal(leg.lengthM));
    const from = ring[i]!;
    return {
      n: i + 1,
      lengthM: leg.lengthM,
      bearingDeg: leg.bearingDeg,
      lat: fixed(from.lat, DEGREE_DP),
      lng: fixed(from.lng, DEGREE_DP),
    };
  });

  return {
    rows,
    areaM2: fixed(ringAreaM2(ring), AREA_DP),
    perimeterM: perimeter.toFixed(TRACE_DP),
  };
}

export interface AreaComparison {
  readonly tracedM2: string;
  readonly statedM2: string;
  readonly differencePercent: string;
  readonly beyondTolerance: boolean;
}

/**
 * The traced area beside the sheet's, with the gap between them.
 *
 * `null` where there is nothing to compare: no ring yet, or no stated area. A
 * zero or negative stated area is also `null` rather than a division — there is
 * no honest percentage against it, and inventing one would put a figure on the
 * screen that no input produced.
 */
export function compareArea(
  ring: readonly LngLat[],
  statedAreaM2: string | undefined,
  tolerancePercent: number = AREA_TOLERANCE_PERCENT,
): AreaComparison | null {
  if (ring.length < 3) return null;
  const text = (statedAreaM2 ?? '').trim();
  if (text === '') return null;

  let stated: Decimal;
  try {
    stated = new Decimal(text);
  } catch {
    return null;
  }
  if (!stated.isFinite() || stated.lessThanOrEqualTo(0)) return null;

  const traced = new Decimal(ringAreaM2(ring));
  const gap = traced.minus(stated).abs().div(stated).times(100);
  return {
    tracedM2: traced.toFixed(AREA_DP),
    statedM2: stated.toFixed(AREA_DP),
    differencePercent: gap.toFixed(AREA_DP),
    beyondTolerance: gap.greaterThan(tolerancePercent),
  };
}

/* -------------------------------------------------------------------------
 * THE UNDERLAY — the sheet's own drawing, laid over the imagery
 * ---------------------------------------------------------------------- */

/**
 * A point on the sheet image, in the image's own normalised space.
 *
 * `u` runs left to right and `v` top to bottom, both in `[0, 1]`, which is the
 * order an image's pixels are addressed in. Nothing is stored in pixels: the
 * same sheet re-exported at a different resolution would then need recalibrating
 * for a change that is not a change to the drawing.
 */
export interface SheetPoint {
  readonly u: number;
  readonly v: number;
}

/**
 * WHERE A SHEET IMAGE SITS ON THE GROUND. A SIMILARITY, NEVER A SHEAR.
 *
 * Four numbers rather than four corner coordinates, and that is the point: a
 * quad of four free corners can be stretched into a shape the sheet is not, and
 * a sheared affection plan is a drawing nobody issued, scaled differently along
 * two axes that the document scales equally. maplibre's image source accepts an
 * arbitrary quad; this type is what stops one being built.
 */
export interface UnderlayPlacement {
  /** The image centre's position on the ground. */
  readonly centre: LngLat;
  /** The image's width on the ground, metres, left edge to right edge. */
  readonly widthM: number;
  /** The image's own height ÷ width, read off the file. Never guessed. */
  readonly aspect: number;
  /** Clockwise from grid north. Zero puts the image's top edge toward north. */
  readonly rotationDeg: number;
}

const rad = (d: number): number => (d * Math.PI) / 180;

/**
 * An offset in the image's own frame, rotated into the projected plane.
 *
 * `x` is along the image's width and `y` up its height, both in metres; the
 * result is an easting/northing offset. The rotation is CLOCKWISE, because that
 * is the sense `rotationDeg` carries and the sense a bearing carries — a
 * counter-clockwise copy of this function would place the sheet correctly for
 * every rotation of zero and one hundred and eighty degrees.
 */
function rotateIntoGrid(
  x: number,
  y: number,
  rotationDeg: number,
): { readonly e: number; readonly n: number } {
  const c = Math.cos(rad(rotationDeg));
  const s = Math.sin(rad(rotationDeg));
  return { e: x * c + y * s, n: -x * s + y * c };
}

/** The inverse of `rotateIntoGrid`, for turning a ground click into a sheet point. */
function rotateOutOfGrid(
  e: number,
  n: number,
  rotationDeg: number,
): { readonly x: number; readonly y: number } {
  const c = Math.cos(rad(rotationDeg));
  const s = Math.sin(rad(rotationDeg));
  return { x: e * c - n * s, y: e * s + n * c };
}

/** Where a point on the sheet lands on the ground, under a placement. */
export function sheetPointToGround(placement: UnderlayPlacement, point: SheetPoint): LngLat {
  const { centre, widthM, aspect, rotationDeg } = placement;
  const x = (point.u - 0.5) * widthM;
  const y = (0.5 - point.v) * widthM * aspect;
  const off = rotateIntoGrid(x, y, rotationDeg);
  const c = toUtm40(centre);
  return fromUtm40({ e: c.e + off.e, n: c.n + off.n });
}

/**
 * Where a ground position falls on the sheet, under a placement.
 *
 * This is how a click "on the underlay" becomes a point on the DOCUMENT. The
 * reader clicks the map; the map hands back a longitude and latitude; and the
 * feature they aimed at has to be remembered as a position on the drawing, not
 * as a position on the ground — because the whole purpose of the next step is to
 * move the drawing. Remembering the ground position would calibrate the sheet
 * against where it already was.
 */
export function groundToSheetPoint(placement: UnderlayPlacement, point: LngLat): SheetPoint {
  const { centre, widthM, aspect, rotationDeg } = placement;
  const c = toUtm40(centre);
  const g = toUtm40(point);
  const local = rotateOutOfGrid(g.e - c.e, g.n - c.n, rotationDeg);
  return { u: local.x / widthM + 0.5, v: 0.5 - local.y / (widthM * aspect) };
}

/**
 * The four corners, in maplibre's own order: top-left, then clockwise.
 *
 * The order is load-bearing and silent when wrong — an image source given its
 * corners anticlockwise draws the sheet mirrored, which on an affection plan
 * means every dimension string reads backwards and the plot is the wrong hand.
 * It is the kind of defect that is visible immediately and only if somebody
 * looks, so `plotMap.test.tsx` asserts the order by naming which corner is which.
 */
export function underlayCorners(
  placement: UnderlayPlacement,
): readonly [LngLat, LngLat, LngLat, LngLat] {
  return [
    sheetPointToGround(placement, { u: 0, v: 0 }),
    sheetPointToGround(placement, { u: 1, v: 0 }),
    sheetPointToGround(placement, { u: 1, v: 1 }),
    sheetPointToGround(placement, { u: 0, v: 1 }),
  ];
}

/**
 * THE OPENING PLACEMENT, AND ITS NAME IS ITS PROVENANCE.
 *
 * A dropped image has to go somewhere, at some size, at some rotation, and
 * whatever it lands at is a number nobody entered — a hidden default in exactly
 * the shape this codebase refuses everywhere else. It cannot be avoided (an
 * unplaced image is an invisible image), so it is DECLARED: the panel prints
 * `underlay.uncalibrated` with a basis — the view's own middle and width — and a
 * sensitivity — everything traced against it moves with it.
 *
 * `widthM` is the view's own width, so the sheet arrives filling the screen and
 * is visible without hunting for it. The rotation is zero because the view is
 * north-up; this is a statement about the map, not a guess about the document.
 */
export function assumedPlacement(
  centre: LngLat,
  viewWidthM: number,
  aspect: number,
): UnderlayPlacement {
  return { centre, widthM: viewWidthM, aspect, rotationDeg: 0 };
}

/** Why a calibration was refused. Codes; the words are in the dictionary. */
export type CalibrationRefusal =
  | 'same-sheet-point'
  | 'same-ground-point'
  | 'no-distance'
  | 'outside-zone-40';

export interface UnderlayFit {
  readonly placement: UnderlayPlacement;
  /** What the two ground picks measure between them, metres. */
  readonly measuredM: string;
  /** The distance the sheet prints, as typed and reformatted. */
  readonly statedM: string;
  /** `|measured − stated| ÷ stated`, as a percentage. */
  readonly differencePercent: string;
}

export type UnderlayFitResult =
  | { readonly refusal: null; readonly fit: UnderlayFit }
  | { readonly refusal: CalibrationRefusal; readonly fit: null };

export interface CalibrationInput {
  /** The image's height ÷ width, read off the file. */
  readonly aspect: number;
  /** Two features identified on the SHEET, in the image's own space. */
  readonly sheet: readonly [SheetPoint, SheetPoint];
  /** Where those same two features are on the ground, clicked on the imagery. */
  readonly ground: readonly [LngLat, LngLat];
  /** The separation the sheet prints between them, metres, as typed. */
  readonly statedM: string;
}

/**
 * TWO-POINT CALIBRATION, AND WHICH INPUT DOES WHICH JOB.
 *
 * THE PRINTED DISTANCE SETS THE SCALE. The two clicks on the imagery set the
 * position and the rotation. Nothing sets a shear, because `UnderlayPlacement`
 * has no term for one.
 *
 * The obvious alternative — scaling the sheet so its two features land exactly
 * on the two clicks — is wrong in a way that would never surface. It makes the
 * drawing agree with the reader's aim on a photograph instead of with the
 * dimension printed on the document, and the disagreement between those two is
 * the 2–5% this entire screen is shaped around. Taking the scale from the sheet
 * and REPORTING the gap turns that disagreement into a number a reader can
 * argue with; taking it from the clicks absorbs the gap and prints nothing.
 *
 * So the two features end up straddling the two clicks — on the bearing the
 * clicks give, about their midpoint, at the distance the sheet states — and
 * `differencePercent` says by how much.
 */
export function calibrateUnderlay(input: CalibrationInput): UnderlayFitResult {
  const { aspect, sheet, ground } = input;

  let stated: Decimal;
  try {
    stated = new Decimal((input.statedM ?? '').trim() === '' ? Number.NaN : input.statedM);
  } catch {
    return { refusal: 'no-distance', fit: null };
  }
  if (!stated.isFinite() || stated.lessThanOrEqualTo(0)) {
    return { refusal: 'no-distance', fit: null };
  }

  /* The sheet vector, in fractions of the image's WIDTH. `v` grows downward and
     `y` upward, hence the sign; `aspect` is what makes a vertical fraction and a
     horizontal one commensurable on a sheet that is not square. */
  const sx = sheet[1].u - sheet[0].u;
  const sy = -(sheet[1].v - sheet[0].v) * aspect;
  const sheetLength = Math.hypot(sx, sy);
  if (!(sheetLength > 0)) return { refusal: 'same-sheet-point', fit: null };

  let groundLeg: { readonly lengthM: number; readonly bearingDeg: number };
  try {
    groundLeg = legBetween(ground[0], ground[1]);
  } catch {
    return { refusal: 'outside-zone-40', fit: null };
  }
  if (!(groundLeg.lengthM > 0)) return { refusal: 'same-ground-point', fit: null };

  /* The scale: the printed distance over the sheet separation, so `widthM` is
     how wide the whole image is on the ground once its own dimension is honoured. */
  const widthM = stated.toNumber() / sheetLength;

  /* The rotation: the bearing the clicks give, less the bearing the same vector
     has on an unrotated sheet. `gridBearingDeg` is the one implementation of
     that convention in the web app, and it takes metres precisely so it can be
     asked this question about an image as well as about the ground. */
  const rotationDeg = ((groundLeg.bearingDeg - gridBearingDeg(sx, sy)) % 360 + 360) % 360;

  /* The position: the midpoint of the two sheet features lands on the midpoint
     of the two clicks. Working through UTM rather than averaging degrees,
     because a mean of two longitudes is not a point halfway between them. */
  const g0 = toUtm40(ground[0]);
  const g1 = toUtm40(ground[1]);
  const midE = (g0.e + g1.e) / 2;
  const midN = (g0.n + g1.n) / 2;

  const mu = (sheet[0].u + sheet[1].u) / 2;
  const mv = (sheet[0].v + sheet[1].v) / 2;
  const off = rotateIntoGrid((mu - 0.5) * widthM, (0.5 - mv) * widthM * aspect, rotationDeg);

  const centre = fromUtm40({ e: midE - off.e, n: midN - off.n });
  const gap = new Decimal(groundLeg.lengthM).minus(stated).abs().div(stated).times(100);

  return {
    refusal: null,
    fit: {
      placement: { centre, widthM, aspect, rotationDeg },
      measuredM: fixed(groundLeg.lengthM, AREA_DP),
      statedM: stated.toFixed(AREA_DP),
      differencePercent: gap.toFixed(AREA_DP),
    },
  };
}

/* -------------------------------------------------------------------------
 * THE COMPONENT
 * ---------------------------------------------------------------------- */

/**
 * A PROP-ONLY INTERFACE, because the composition root owns the wiring.
 *
 * Nothing here reaches into `PlotForm` and nothing is imported from it. The
 * optional props are declared with `?:` under `exactOptionalPropertyTypes`, so a
 * caller OMITS a prop rather than passing `undefined` — which is the same
 * discipline `SaleableEfficiencyInput` is held to in the engine and for the same
 * reason: "absent" and "explicitly nothing" are different answers and the type
 * system is where the difference is kept.
 */
export interface PlotMapProps {
  /**
   * The traced boundaries, handed over on a button press.
   *
   * The two fields are `EdgeDraft`'s own and carry no classification: a
   * photograph cannot know whether an edge faces a road, and `AC3` has no
   * default for that. The composition root merges these into the drafts the
   * form already holds and leaves every other field alone.
   */
  readonly onTraced: (legs: readonly TracedLegDraft[]) => void;
  /** The area the affection plan states, as typed in the form. Blank is honest. */
  readonly statedAreaM2?: string;
  /** Where to open the view. Nothing is computed from it — see `OPENING_VIEW`. */
  readonly centre?: LngLat;
  /** Reported on every change, so a parent may persist the trace if it wants. */
  readonly onRingChange?: (ring: readonly LngLat[]) => void;
  /** A trace being resumed. Points outside zone 40N are refused, not projected. */
  readonly initialRing?: readonly LngLat[];
  /** True while the form is submitting, which disables the handoff. */
  readonly busy?: boolean;
}

type MapState = 'pending' | 'ready' | 'unavailable';
type CalibrationStage = 'idle' | 'sheet-a' | 'ground-a' | 'sheet-b' | 'ground-b' | 'distance';

const STAGE_ORDER: readonly CalibrationStage[] = ['sheet-a', 'ground-a', 'sheet-b', 'ground-b'];

/** The source and layer ids, named once so a typo is a compile-time concern. */
const ID = {
  imagery: 'pm-imagery',
  osm: 'pm-osm',
  ring: 'pm-ring',
  shape: 'pm-shape',
  points: 'pm-points',
  sheet: 'pm-sheet',
  sheetEdge: 'pm-sheet-edge',
} as const;

const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] };

/** Dashed while the placement is this screen's; solid once a dimension scaled it. */
const DASH_ASSUMED: readonly [number, number] = [3, 2];
const DASH_CALIBRATED: readonly [number, number] = [1, 0];

/**
 * THE CANVAS IS INKED FROM THE PAGE'S OWN TOKENS.
 *
 * WebGL cannot read a custom property, so a paint value has to be a string — and
 * a hex typed here would be a second palette, drifting from `tokens.css` in
 * whichever theme nobody screenshotted. So the computed value of the semantic
 * token is read off the document element and handed to maplibre, which is the
 * same discipline `packages/sheets` follows with `var(--token, #hex)` and the
 * only form of it available inside a canvas.
 *
 * `null` where the token does not resolve, and the caller then omits the paint
 * property entirely rather than inventing a colour: an unresolved semantic token
 * means `tokens.css` did not load, which is a build fault and not a palette
 * decision. The drawing is a view of the table below it, and the table states
 * every figure in words.
 *
 * `pnpm contrast` cannot see any of this — it reads stylesheets. The gates that
 * can are `pnpm smoke` and `pnpm amber`, which measure painted pixels in a real
 * browser.
 */
function inkOf(token: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return value === '' ? null : value;
}

/** The trace's own sources and layers, added once the style has loaded. */
function addTraceLayers(map: MapLibreMap): void {
  const accent = inkOf('--accent');
  const ink = inkOf('--text-primary');
  const plate = inkOf('--surface-raised');
  const uncertain = inkOf('--uncertain');

  map.addSource(ID.shape, { type: 'geojson', data: EMPTY_FC });
  map.addSource(ID.ring, { type: 'geojson', data: EMPTY_FC });
  map.addSource(ID.points, { type: 'geojson', data: EMPTY_FC });
  map.addSource(ID.sheetEdge, { type: 'geojson', data: EMPTY_FC });

  map.addLayer({
    id: ID.shape,
    type: 'fill',
    source: ID.shape,
    paint: { 'fill-opacity': 0.18, ...(accent ? { 'fill-color': accent } : {}) },
  });
  map.addLayer({
    id: ID.ring,
    type: 'line',
    source: ID.ring,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-width': 3, ...(accent ? { 'line-color': accent } : {}) },
  });
  map.addLayer({
    id: ID.points,
    type: 'circle',
    source: ID.points,
    paint: {
      /* The first point is drawn larger: it is the close-the-ring target, and a
         target has to look like one before anybody aims at it. */
      'circle-radius': ['case', ['==', ['get', 'i'], 0], 9, 6],
      'circle-stroke-width': 2,
      ...(plate ? { 'circle-color': plate } : {}),
      ...(ink ? { 'circle-stroke-color': ink } : {}),
    },
  });

  /*
    THE SHEET'S OUTLINE, AND THE CUE IS THE DASH.

    An uncalibrated placement is an assumption and §13.1 would have it amber. The
    uncertainty tokens were put back on the neutral ladder on the client's
    direction — `scripts/contrast.mjs` asserts a chroma FLOOR on them for exactly
    that reason — so a cue resting on that hue is a cue that is no longer there.
    The dash carries it instead, and the dash is also the channel that survives a
    photocopy and a colour-blind reader.

    Set imperatively rather than by a `case` expression on the feature: a dash
    pattern is not a data-driven paint property in every renderer version, and a
    style that silently ignores the expression would draw every placement alike.
  */
  map.addLayer({
    id: ID.sheetEdge,
    type: 'line',
    source: ID.sheetEdge,
    paint: {
      'line-width': 2,
      'line-dasharray': [...DASH_ASSUMED],
      ...(uncertain ? { 'line-color': uncertain } : {}),
    },
  });
}

export function PlotMap({
  onTraced,
  statedAreaM2,
  centre,
  onRingChange,
  initialRing,
  busy,
}: PlotMapProps): JSX.Element {
  const t = useDict(EN, AR);

  /*
    THE RING IS THIS COMPONENT'S OWN STATE, and the form's traverse is the
    authority. Two writable copies of one shape is the defect this product is
    built to refuse; so the trace is a working drawing, the traverse is the
    record, and the only traffic between them is one button pressed by a reader.
  */
  const [ring, setRing] = useState<readonly LngLat[]>(() => {
    /* A resumed trace goes through the same gate a click does. A stored point
       outside the zone is refused rather than projected — the same sentence,
       whether it arrived a second ago or a week ago. */
    let admitted: readonly LngLat[] = [];
    for (const p of initialRing ?? []) {
      const next = admitVertex(admitted, p);
      if (next.refusal === null) admitted = next.ring;
    }
    return admitted;
  });
  const [closed, setClosed] = useState(false);
  const [refusal, setRefusal] = useState<VertexRefusal | null>(null);
  const [handedOver, setHandedOver] = useState<number | null>(null);

  /*
    ONE FLAG FOR THE MAP, not two. An earlier draft of this file carried both a
    `mapState` for the chrome and a `mapReady` for the effects, which is two
    copies of one fact — the defect the panel refuses for the ring is the same
    defect for a boolean, and the second copy is the one that gets left behind.
  */
  const [mapState, setMapState] = useState<MapState>('pending');
  const [tilesFailed, setTilesFailed] = useState(false);
  const [osmVisible, setOsmVisible] = useState(false);

  const [latText, setLatText] = useState('');
  const [lngText, setLngText] = useState('');

  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [placement, setPlacement] = useState<UnderlayPlacement | null>(null);
  const [opacity, setOpacity] = useState(OPENING_OPACITY_PERCENT);
  const [stage, setStage] = useState<CalibrationStage>('idle');
  const [picks, setPicks] = useState<{
    sheetA: SheetPoint | null;
    groundA: LngLat | null;
    sheetB: SheetPoint | null;
    groundB: LngLat | null;
  }>({ sheetA: null, groundA: null, sheetB: null, groundB: null });
  const [distanceText, setDistanceText] = useState('');
  const [fit, setFit] = useState<UnderlayFit | null>(null);
  const [calibrationRefusal, setCalibrationRefusal] = useState<CalibrationRefusal | null>(null);

  const readout = useMemo(() => ringReadout(ring), [ring]);
  const area = useMemo(() => compareArea(ring, statedAreaM2), [ring, statedAreaM2]);

  /* -----------------------------------------------------------------------
     EDITING THE RING. Every path — a click, a drag, a typed coordinate, a
     resumed trace — goes through `admitVertex` or moves a point that already
     passed it, so the ring is projectable by construction.
     -------------------------------------------------------------------- */

  const publish = useCallback(
    (next: readonly LngLat[]) => {
      setRing(next);
      setHandedOver(null);
      if (onRingChange) onRingChange(next);
    },
    [onRingChange],
  );

  const addPoint = useCallback(
    (point: LngLat) => {
      const admitted = admitVertex(ring, point);
      setRefusal(admitted.refusal);
      if (admitted.refusal !== null) return;
      publish(admitted.ring);
    },
    [ring, publish],
  );

  const movePoint = useCallback(
    (index: number, point: LngLat) => {
      /* The empty ring is the gate used as a validator: `admitVertex` answers
         "may this position be a vertex" and the ring it would return is
         discarded, because a moved point replaces one rather than appending. */
      const admitted = admitVertex([], point);
      if (admitted.refusal !== null) {
        setRefusal(admitted.refusal);
        return;
      }
      setRefusal(null);
      publish(ring.map((p, i) => (i === index ? point : p)));
    },
    [ring, publish],
  );

  const removePoint = useCallback(
    (index: number) => {
      const next = ring.filter((_, i) => i !== index);
      if (next.length < 3) setClosed(false);
      publish(next);
    },
    [ring, publish],
  );

  const undo = useCallback(() => {
    const next = ring.slice(0, -1);
    if (next.length < 3) setClosed(false);
    publish(next);
  }, [ring, publish]);

  const clear = useCallback(() => {
    setClosed(false);
    setRefusal(null);
    publish([]);
  }, [publish]);

  /* -----------------------------------------------------------------------
     THE CALIBRATION STATE MACHINE. A click means something different at each
     stage, and what it means is held here rather than inside the map effect —
     so the whole sequence is exercisable from a test with no canvas.
     -------------------------------------------------------------------- */

  const takePick = useCallback(
    (point: LngLat) => {
      if (placement === null) return;
      /*
        THE SHEET POINT IS COMPUTED FOR EVERY PICK, including the two that are
        GROUND picks and do not use it. Two reasons, and neither is laziness.

        It is the projection gate: `groundToSheetPoint` projects through
        `toUtm40`, so a click outside zone 40N is refused here for a ground pick
        exactly as it is for a sheet pick, in one place.

        And a sheet pick is remembered as a position on the DOCUMENT rather than
        on the ground, which is what makes the calibration able to move the sheet
        at all — see `groundToSheetPoint`. Remembering a ground position would
        calibrate the sheet against where it already was.
      */
      let sheetPoint: SheetPoint;
      try {
        sheetPoint = groundToSheetPoint(placement, point);
      } catch {
        setCalibrationRefusal('outside-zone-40');
        return;
      }
      setCalibrationRefusal(null);
      if (stage === 'sheet-a') {
        setPicks((p) => ({ ...p, sheetA: sheetPoint }));
        setStage('ground-a');
      } else if (stage === 'ground-a') {
        setPicks((p) => ({ ...p, groundA: point }));
        setStage('sheet-b');
      } else if (stage === 'sheet-b') {
        setPicks((p) => ({ ...p, sheetB: sheetPoint }));
        setStage('ground-b');
      } else if (stage === 'ground-b') {
        setPicks((p) => ({ ...p, groundB: point }));
        setStage('distance');
      }
    },
    [placement, stage],
  );

  const applyCalibration = useCallback(() => {
    if (placement === null) return;
    const { sheetA, groundA, sheetB, groundB } = picks;
    if (!sheetA || !groundA || !sheetB || !groundB) return;
    const result = calibrateUnderlay({
      aspect: placement.aspect,
      sheet: [sheetA, sheetB],
      ground: [groundA, groundB],
      statedM: distanceText,
    });
    setCalibrationRefusal(result.refusal);
    if (result.refusal !== null) return;
    setPlacement(result.fit.placement);
    setFit(result.fit);
    setStage('idle');
  }, [placement, picks, distanceText]);

  const restartCalibration = useCallback(() => {
    setPicks({ sheetA: null, groundA: null, sheetB: null, groundB: null });
    setDistanceText('');
    setCalibrationRefusal(null);
    setStage('sheet-a');
  }, []);

  const cancelCalibration = useCallback(() => {
    setPicks({ sheetA: null, groundA: null, sheetB: null, groundB: null });
    setCalibrationRefusal(null);
    setStage('idle');
  }, []);

  /* -----------------------------------------------------------------------
     WHAT A CLICK ON THE CANVAS MEANS. One function, so the canvas never holds
     a second opinion about it.
     -------------------------------------------------------------------- */

  const handleMapClick = useCallback(
    (point: LngLat, hitFirstPoint: boolean) => {
      /*
        MID-CALIBRATION A CLICK IS A PICK, AND DURING THE TYPED STEP IT IS
        NOTHING. A click that dropped a boundary point while the reader was
        reading "type the printed distance" would put a vertex on the plot for a
        gesture that was aimed at the sheet.
      */
      if (stage !== 'idle') {
        if (stage !== 'distance') takePick(point);
        return;
      }
      /* THE CLOSE AFFORDANCE. Clicking the first point again closes the ring,
         which is the gesture every drawing tool uses; the button beside it does
         the same thing for a reader who is not using a pointer. */
      if (hitFirstPoint && ring.length >= 3) {
        setClosed(true);
        return;
      }
      /*
        A POINT MAY BE ADDED TO A CLOSED RING, and it subdivides the closing
        boundary. The reason is parity rather than convenience: the coordinate
        box below is the whole of the non-pointer way in, and a rule that let a
        click do something a typed coordinate could not would make the keyboard
        path the weaker of the two — which is the one thing a map must not do.
        So there is ONE rule for both, and "Undo the last point" is next to it.
      */
      addPoint(point);
    },
    [stage, takePick, ring.length, addPoint],
  );

  /* Handlers the map effect reaches through, so it can be mounted once and
     still call the current closure. A handler captured at mount would answer a
     click with the ring as it was when the panel opened. */
  const clickRef = useRef(handleMapClick);
  clickRef.current = handleMapClick;
  const moveRef = useRef(movePoint);
  moveRef.current = movePoint;

  /* -----------------------------------------------------------------------
     THE MAP. Mounted once, fed by the effects below.
     -------------------------------------------------------------------- */

  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let map: MapLibreMap | null = null;

    void (async () => {
      try {
        const mod = await import('maplibre-gl');
        if (cancelled) return;
        map = new mod.Map({
          container: host,
          /*
            THE ATTRIBUTION IS RENDERED BY THIS COMPONENT, NOT BY MAPLIBRE.

            Esri's terms require the credit to be visible, and maplibre's own
            control is collapsible — on a narrow screen it ships collapsed behind
            an "i". A credit behind a disclosure is the same defect as a limit
            behind one, which `PlotLimits` exists to refuse. Rendering it in the
            panel's own markup also puts it where a test can read it without a
            GL context, and where it survives a browser with no WebGL at all.
          */
          attributionControl: false,
          /* maplibre's wordmark is optional by its own documentation, and this
             panel already carries two credits that are not. */
          maplibreLogo: false,
          locale: { 'Map.Title': t.imagery.label },
          center: [centre?.lng ?? OPENING_VIEW.lng, centre?.lat ?? OPENING_VIEW.lat],
          zoom: OPENING_ZOOM,
          /* North-up and flat. A rotated or pitched view of a plot is a view in
             which a traced bearing cannot be read off the screen at all, and
             there is nothing here that an oblique view shows better. */
          pitchWithRotate: false,
          dragRotate: false,
          style: {
            version: 8,
            sources: {
              [ID.imagery]: { type: 'raster', tiles: [ESRI_IMAGERY], tileSize: 256, maxzoom: 19 },
              [ID.osm]: { type: 'raster', tiles: [OSM_RASTER], tileSize: 256, maxzoom: 19 },
            },
            layers: [
              { id: ID.imagery, type: 'raster', source: ID.imagery },
              {
                id: ID.osm,
                type: 'raster',
                source: ID.osm,
                layout: { visibility: 'none' },
                /* Half-transparent so the imagery stays legible underneath: the
                   overlay is there to corroborate a footprint, not to replace
                   the photograph a reader is tracing. */
                paint: { 'raster-opacity': 0.55 },
              },
            ],
          },
        });
        mapRef.current = map;

        map.on('error', () => {
          /* Reported, not thrown. A tile that does not load is a view without a
             photograph; the trace, the measurements and the table are arithmetic
             and do not depend on one. */
          if (!cancelled) setTilesFailed(true);
        });

        map.on('load', () => {
          if (cancelled || !map) return;
          addTraceLayers(map);
          /*
            maplibre labels its own canvas from `locale['Map.Title']` and makes
            it focusable. The DESCRIPTION is ours to add: a keyboard reader who
            lands on the canvas needs to be told that the instructions and the
            table beside it are where this control's content actually is.
          */
          map.getCanvas().setAttribute('aria-describedby', 'pm-how-heading pm-table-heading');
          setMapState('ready');
        });

        /*
          CLICK, AND THE ONE QUERY THAT MAKES THE CLOSE GESTURE POSSIBLE.

          `queryRenderedFeatures` over a small box around the pointer is how the
          first point is recognised as a target rather than as empty ground. The
          box is the hit tolerance; a bare point query would require pixel-exact
          aim on a 44px-equivalent target.
        */
        map.on('click', (e) => {
          const box: [[number, number], [number, number]] = [
            [e.point.x - CLOSE_PICK_PX, e.point.y - CLOSE_PICK_PX],
            [e.point.x + CLOSE_PICK_PX, e.point.y + CLOSE_PICK_PX],
          ];
          const hits = map ? map.queryRenderedFeatures(box, { layers: [ID.points] }) : [];
          const first = hits.some((f) => f.properties?.['i'] === 0);
          clickRef.current({ lng: e.lngLat.lng, lat: e.lngLat.lat }, first);
        });

        /*
          DRAGGING A POINT, as a pointer gesture on the circle layer rather than
          as a DOM marker. A marker would need maplibre's own stylesheet — which
          carries its own palette and its own colour literals, in a file
          `pnpm contrast` does not read — and would put a focusable element
          inside the canvas with no label of its own.
        */
        let dragging: number | null = null;
        const begin = (e: MapLayerMouseEvent | MapLayerTouchEvent): void => {
          const i: unknown = e.features?.[0]?.properties?.['i'];
          if (typeof i !== 'number') return;
          dragging = i;
          if (map) map.getCanvas().style.cursor = 'grabbing';
          /* The map must not pan while a point is being moved. */
          if (map) map.dragPan.disable();
        };
        const end = (): void => {
          dragging = null;
          if (map) {
            map.getCanvas().style.cursor = '';
            map.dragPan.enable();
          }
        };
        map.on('mousedown', ID.points, begin);
        map.on('touchstart', ID.points, begin);
        map.on('mousemove', (e) => {
          if (dragging === null) return;
          moveRef.current(dragging, { lng: e.lngLat.lng, lat: e.lngLat.lat });
        });
        map.on('touchmove', (e) => {
          if (dragging === null) return;
          moveRef.current(dragging, { lng: e.lngLat.lng, lat: e.lngLat.lat });
        });
        map.on('mouseup', end);
        map.on('touchend', end);
      } catch {
        /*
          NO CANVAS. A blocked or absent WebGL context is a real state on a site
          opened on site, and it is not a failure of this panel: the sentence
          beside it says which half is gone and the rest of the panel keeps
          working. Swallowing the error silently would leave a grey rectangle.
        */
        if (!cancelled) setMapState('unavailable');
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current = null;
      if (map) map.remove();
    };
    /* Mounted once. The centre is an opening view and re-centring on a prop
       change would move the map out from under a reader mid-trace.
       eslint-disable-next-line react-hooks/exhaustive-deps */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
    The ring, the polygon and the points, pushed to the canvas whenever they
    change. ONE effect, so there is one place the drawing can disagree with the
    table — and it reads the same `ring` the table does.

    `getSource` is typed as the `Source` interface, which has no `setData`. The
    cast is narrow and honest: these three sources were added by
    `addTraceLayers` with `type: 'geojson'` a few lines above, and nothing else
    in this file ever names those ids.
  */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapState !== 'ready') return;
    const coords = ring.map((p) => [p.lng, p.lat]);
    const line = closed && coords.length >= 3 ? [...coords, coords[0]!] : coords;

    const ringSource = map.getSource(ID.ring) as GeoJSONSource | undefined;
    const shapeSource = map.getSource(ID.shape) as GeoJSONSource | undefined;
    const pointSource = map.getSource(ID.points) as GeoJSONSource | undefined;
    if (!ringSource || !shapeSource || !pointSource) return;

    void ringSource.setData(
      line.length >= 2
        ? { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: line } }
        : EMPTY_FC,
    );
    void shapeSource.setData(
      closed && coords.length >= 3
        ? {
            type: 'Feature',
            properties: {},
            geometry: { type: 'Polygon', coordinates: [[...coords, coords[0]!]] },
          }
        : EMPTY_FC,
    );
    void pointSource.setData({
      type: 'FeatureCollection',
      features: ring.map((p, i) => ({
        type: 'Feature',
        properties: { i },
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      })),
    });
  }, [ring, closed, mapState]);

  /* The overlay's visibility. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapState !== 'ready') return;
    map.setLayoutProperty(ID.osm, 'visibility', osmVisible ? 'visible' : 'none');
  }, [osmVisible, mapState]);

  /*
    THE UNDERLAY. An image source is created with its url, so a new sheet means
    a new source; a moved sheet means new coordinates on the one that is there.
    Both paths go through `underlayCorners`, which is the only thing in this file
    that knows maplibre's corner order.
  */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapState !== 'ready') return;

    const existing = map.getSource(ID.sheet);
    if (sheetUrl === null || placement === null) {
      if (existing) {
        if (map.getLayer(ID.sheet)) map.removeLayer(ID.sheet);
        map.removeSource(ID.sheet);
      }
      return;
    }

    const corners = underlayCorners(placement).map((p) => [p.lng, p.lat] as [number, number]);
    const quad: [[number, number], [number, number], [number, number], [number, number]] = [
      corners[0]!,
      corners[1]!,
      corners[2]!,
      corners[3]!,
    ];

    if (!existing) {
      map.addSource(ID.sheet, { type: 'image', url: sheetUrl, coordinates: quad });
      /* Under the trace and over the imagery: the sheet is what a corner is
         traced FROM, so a point dropped on it must stay visible on top of it. */
      map.addLayer(
        {
          id: ID.sheet,
          type: 'raster',
          source: ID.sheet,
          /* No cross-fade. A sheet being dragged into position that ghosts its
             own previous placement is two drawings of one document on screen. */
          paint: { 'raster-opacity': opacity / 100, 'raster-fade-duration': 0 },
        },
        ID.shape,
      );
    } else {
      (existing as ImageSource).setCoordinates(quad);
      map.setPaintProperty(ID.sheet, 'raster-opacity', opacity / 100);
    }

    const edge = map.getSource(ID.sheetEdge) as GeoJSONSource | undefined;
    if (edge) {
      void edge.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: [...corners, corners[0]!] },
      });
      map.setPaintProperty(
        ID.sheetEdge,
        'line-dasharray',
        fit === null ? [...DASH_ASSUMED] : [...DASH_CALIBRATED],
      );
    }
  }, [sheetUrl, placement, opacity, fit, mapState]);

  /* -----------------------------------------------------------------------
     THE SHEET IMAGE. Read in this browser, never uploaded.
     -------------------------------------------------------------------- */

  const takeSheet = (file: File | undefined): void => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      /*
        THE ASPECT IS READ OFF THE FILE AND NEVER ASSUMED. An assumed aspect
        would stretch the drawing — every dimension on it wrong by a different
        factor in each axis — which is the one deformation `UnderlayPlacement`
        has no term for and should not acquire one.
      */
      const aspect = img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 1;
      const map = mapRef.current;
      const view = map ? map.getBounds() : null;
      const viewCentre = map
        ? { lng: map.getCenter().lng, lat: map.getCenter().lat }
        : (centre ?? OPENING_VIEW);
      let widthM = FALLBACK_SHEET_WIDTH_M;
      if (view) {
        try {
          widthM = legBetween(
            { lng: view.getWest(), lat: viewCentre.lat },
            { lng: view.getEast(), lat: viewCentre.lat },
          ).lengthM;
        } catch {
          /* A view straddling the edge of zone 40N cannot be measured, so the
             sheet opens at `FALLBACK_SHEET_WIDTH_M`. Either way the placement is
             the one this screen chose, which is what the callout says. */
        }
      }
      setSheetUrl(url);
      setPlacement(assumedPlacement(viewCentre, widthM, aspect));
      setFit(null);
      setStage('idle');
      setPicks({ sheetA: null, groundA: null, sheetB: null, groundB: null });
    };
    img.src = url;
  };

  const dropSheet = (): void => {
    /* The url is revoked by the effect below when `sheetUrl` changes, so it is
       revoked in ONE place however the sheet goes away — dropped, replaced, or
       the panel unmounted. */
    setSheetUrl(null);
    setPlacement(null);
    setFit(null);
    setStage('idle');
    setCalibrationRefusal(null);
  };

  /* An object URL outlives the component unless it is revoked, and a leaked one
     pins the whole image in memory for the life of the tab. */
  useEffect(
    () => () => {
      if (sheetUrl !== null) URL.revokeObjectURL(sheetUrl);
    },
    [sheetUrl],
  );

  /* -----------------------------------------------------------------------
     THE KEYBOARD PATH. The whole of the non-pointer way in.
     -------------------------------------------------------------------- */

  /**
   * A typed coordinate, through the same gate a click goes through.
   *
   * THE BOXES ARE EMPTIED ONLY WHEN THE POINT WAS ACTUALLY ADMITTED. An earlier
   * version cleared them whenever the two fields parsed as numbers, which threw
   * away a mistyped longitude the instant it was refused — so the reader was
   * shown "that point is outside zone 40N" beside two empty boxes and had
   * nothing left to correct. A refusal has to leave the thing it refused on
   * screen, or it is a refusal and a deletion.
   */
  const addTyped = (): void => {
    if (latText.trim() === '' || lngText.trim() === '') {
      setRefusal('not-a-coordinate');
      return;
    }
    const admitted = admitVertex(ring, { lng: Number(lngText), lat: Number(latText) });
    setRefusal(admitted.refusal);
    if (admitted.refusal !== null) return;
    publish(admitted.ring);
    setLatText('');
    setLngText('');
  };

  const zoomBy = (delta: number): void => {
    const map = mapRef.current;
    if (!map) return;
    /* Instantaneous where a reader asked for less movement. A zoom is a camera
       animation, which is exactly what `prefers-reduced-motion` is about. */
    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    map.easeTo({ zoom: map.getZoom() + delta, duration: reduced ? 0 : 200 });
  };

  const handOver = (): void => {
    const legs = legDrafts(ring);
    if (!closed || legs.length < 3) return;
    onTraced(legs);
    setHandedOver(legs.length);
  };

  const stageIndex = STAGE_ORDER.indexOf(stage);

  return (
    <section className="panel pm" aria-labelledby="plot-map-heading">
      <header className="panel__header">
        <div>
          <h2 id="plot-map-heading" className="panel__title">
            {t.title}
          </h2>
          {/* First, and above the map, because it governs everything under it. */}
          <p className="panel__subtitle pm-authority">{t.authority}</p>
        </div>
      </header>

      {/* ---- How to trace, before the thing to trace on ------------------ */}
      <div className="pm-how">
        <h3 className="pm-subhead" id="pm-how-heading">
          {t.how.heading}
        </h3>
        <ul className="pm-how__list">
          <li>{t.how.click}</li>
          <li>{t.how.drag}</li>
          <li>{t.how.close}</li>
          <li>{t.how.keyboard}</li>
        </ul>
        <p className="fine-print">{t.imagery.roofNote}</p>
      </div>

      {/* ---- The map frame ---------------------------------------------- */}
      <div className="pm-frame">
        {/* maplibre builds the canvas inside this host and labels and describes
            it on load. Nothing is put here by React, because React and maplibre
            would then both own the same children. */}
        <div ref={hostRef} className="pm-map" />

        {/* My own controls, outside the canvas, every one a real button. */}
        <div className="pm-chrome">
          <button
            type="button"
            className="button button--sm pm-chrome__button"
            onClick={() => zoomBy(1)}
            disabled={mapState !== 'ready'}
          >
            <span aria-hidden="true">+</span>
            <span className="sr-only">{t.controls.zoomIn}</span>
          </button>
          <button
            type="button"
            className="button button--sm pm-chrome__button"
            onClick={() => zoomBy(-1)}
            disabled={mapState !== 'ready'}
          >
            <span aria-hidden="true">−</span>
            <span className="sr-only">{t.controls.zoomOut}</span>
          </button>
          {/*
            NO `aria-pressed`, AND THE LABEL IS WHY. `locale.tsx` states the rule
            for the language switch: "pressed" is the wrong model for a control
            that names its own next action, and a changing label plus an
            `aria-pressed` states the toggle twice — "Hide overlay, pressed" is a
            sentence with two readings. The chassis has no pressed treatment for
            `.button` either, so a stable label would leave the state visible to a
            screen reader and invisible to everyone else.
          */}
          <button
            type="button"
            className="button button--sm"
            onClick={() => setOsmVisible((v) => !v)}
            disabled={mapState !== 'ready'}
          >
            {osmVisible ? t.osm.hide : t.osm.show}
          </button>
        </div>

        {/*
          THE CREDITS, IN THE PANEL'S OWN MARKUP AND NEVER BEHIND A DISCLOSURE.
          The OpenStreetMap line appears only while its layer is drawn, because a
          credit for data that is not on screen is a credit to the wrong party.
        */}
        <p className="pm-credit">
          <span lang="en" dir="ltr">
            {t.imagery.credit}
          </span>
          {osmVisible ? (
            <>
              {' · '}
              <span lang="en" dir="ltr">
                {t.osm.credit}
              </span>
            </>
          ) : null}
        </p>
      </div>

      {/*
        WHAT THE OVERLAY IS, ON THE PAGE AND NOT IN A TOOLTIP. The one thing a
        reader will want it to be is a parcel layer, and it is not one — so the
        sentence that says so sits under the map whether the layer is drawn or
        not, rather than appearing only once it has already been believed.
      */}
      <p className="fine-print pm-osm-note">
        <strong>{t.osm.label}</strong> {t.osm.help}
      </p>

      {mapState === 'unavailable' ? (
        <div className="callout" data-state="blocked" role="note">
          <div className="callout__body">{t.refusals.noMap}</div>
        </div>
      ) : null}
      {tilesFailed ? (
        <div className="callout" data-state="blocked" role="note">
          <div className="callout__body">{t.refusals.offline}</div>
        </div>
      ) : null}
      {refusal !== null ? (
        /* `role="alert"`: a point was refused in response to something the
           reader did, and nothing was added. That is the one case on this panel
           where an interruption is the correct behaviour. */
        <div className="callout" data-state="blocked" role="alert">
          <div className="callout__body">
            {refusal === 'outside-zone-40' ? t.refusals.outsideZone : t.refusals.notACoordinate}
          </div>
        </div>
      ) : null}

      {/* ---- The trace controls ----------------------------------------- */}
      <div className="field-group pm-controls">
        <p className="field-group__legend">{t.controls.heading}</p>
        <p className="pm-controls__state" role="status">
          {ring.length === 0 ? t.controls.none : t.controls.counted(String(ring.length))}
          {ring.length >= 3 ? ` · ${closed ? t.controls.closed : t.controls.open}` : null}
        </p>
        <div className="pm-controls__row">
          <button
            type="button"
            className="button button--sm"
            onClick={() => setClosed((c) => !c)}
            disabled={ring.length < 3}
          >
            {closed ? t.controls.reopen : t.controls.closeRing}
          </button>
          <button
            type="button"
            className="button button--sm"
            onClick={undo}
            disabled={ring.length === 0}
          >
            {t.controls.undo}
          </button>
          <button
            type="button"
            className="button button--sm"
            onClick={clear}
            disabled={ring.length === 0}
          >
            {t.controls.clear}
          </button>
        </div>
      </div>

      {/* ---- Coordinate entry ------------------------------------------- */}
      <fieldset className="field-group pm-coords">
        <legend className="field-group__legend">{t.keyboard.heading}</legend>
        <div className="pm-coords__row">
          <div className="field field--compact">
            <label htmlFor="pm-lat">{t.keyboard.lat}</label>
            <input
              id="pm-lat"
              className="input input--num"
              inputMode="decimal"
              value={latText}
              /* A refusal is cleared as soon as the thing it refused changes.
                 An alert that outlives its cause is an alert a reader learns to
                 leave on the screen. */
              onChange={(e) => {
                setLatText(e.target.value);
                setRefusal(null);
              }}
            />
          </div>
          <div className="field field--compact">
            <label htmlFor="pm-lng">{t.keyboard.lng}</label>
            <input
              id="pm-lng"
              className="input input--num"
              inputMode="decimal"
              value={lngText}
              onChange={(e) => {
                setLngText(e.target.value);
                setRefusal(null);
              }}
            />
          </div>
          <button type="button" className="button button--sm" onClick={addTyped}>
            {t.keyboard.add}
          </button>
        </div>
        <p className="field__help">{t.keyboard.help}</p>
      </fieldset>

      {/* ---- The text equivalent ---------------------------------------- */}
      <h3 className="pm-subhead" id="pm-table-heading">
        {t.table.heading}
      </h3>
      {readout.rows.length === 0 ? (
        <p className="fine-print">{t.table.empty}</p>
      ) : (
        <div className="schedule" role="region" aria-label={t.table.heading} tabIndex={0}>
          <table>
            <caption className="sr-only">{t.table.caption}</caption>
            <thead>
              <tr>
                <th scope="col">{t.table.boundary}</th>
                <th scope="col" className="schedule__num">
                  {t.table.length}
                </th>
                <th scope="col" className="schedule__num">
                  {t.table.bearing}
                </th>
                <th scope="col">{t.table.corner}</th>
                <th scope="col">
                  <span className="sr-only">{t.table.remove}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {readout.rows.map((row) => (
                <tr key={row.n}>
                  <th scope="row" data-label={t.table.boundary}>
                    {row.n}
                  </th>
                  {/*
                    `.value` AND NOT `EngineValue`. `TracedValue`'s components
                    label a figure the engine emitted and carry its provenance
                    treatment; these figures were measured off a photograph by
                    the reader. Dressing them in the engine's own styling is the
                    laundering this component's header refuses.
                  */}
                  <td className="schedule__num" data-label={t.table.length}>
                    <span className="value">{row.lengthM}</span>
                  </td>
                  <td className="schedule__num" data-label={t.table.bearing}>
                    <span className="value">{row.bearingDeg}</span>
                  </td>
                  <td data-label={t.table.corner}>
                    <span className="value pm-coord">{t.table.cornerAt(row.lat, row.lng)}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="button button--sm"
                      aria-label={t.controls.removePoint(String(row.n))}
                      onClick={() => removePoint(row.n - 1)}
                    >
                      {t.table.remove}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---- The two areas, beside each other ---------------------------- */}
      {readout.areaM2 === null ? null : (
        <div className="pm-areas">
          <div className="field field--readout">
            <span className="field__readout-label">{t.area.traced}</span>
            <span className="value field__readout-value">
              {readout.areaM2}
              <span className="value__unit">m²</span>
            </span>
          </div>
          {area === null ? null : (
            <>
              <div className="field field--readout">
                <span className="field__readout-label">{t.area.stated}</span>
                <span className="value field__readout-value">
                  {area.statedM2}
                  <span className="value__unit">m²</span>
                </span>
              </div>
              <p className="pm-areas__gap" role="status">
                {t.area.difference(area.differencePercent)}
                {' — '}
                {area.beyondTolerance
                  ? t.area.beyond(`${AREA_TOLERANCE_PERCENT}%`)
                  : t.area.within(`${AREA_TOLERANCE_PERCENT}%`)}
              </p>
            </>
          )}
          <p className="fine-print">{t.area.tolerance(`${AREA_TOLERANCE_PERCENT}%`)}</p>
        </div>
      )}

      {/* ---- The handoff, which is the point of the whole panel ---------- */}
      <div className="pm-handoff">
        <button
          type="button"
          className="button button--primary"
          onClick={handOver}
          disabled={!closed || ring.length < 3 || busy === true}
        >
          {t.handoff.button}
        </button>
        <p className="field__help">{t.handoff.help}</p>
        {!closed && ring.length >= 3 ? <p className="fine-print">{t.handoff.blocked}</p> : null}
        {handedOver === null ? null : (
          <p className="pm-handoff__done" role="status">
            {t.handoff.done(String(handedOver))}
          </p>
        )}
        <p className="fine-print">{t.handoff.precision}</p>
      </div>

      {/* ---- The underlay ------------------------------------------------ */}
      <div className="field-group pm-underlay">
        <p className="field-group__legend">{t.underlay.heading}</p>
        <p className="pm-underlay__lede">{t.underlay.lede}</p>

        <div className="dropzone pm-underlay__drop">
          <input
            id="pm-sheet-file"
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            onChange={(e) => takeSheet(e.target.files?.[0])}
          />
          <label htmlFor="pm-sheet-file" className="dropzone__label">
            <span className="dropzone__glyph" aria-hidden="true">
              ▤
            </span>
            <span className="dropzone__text">
              <strong>{t.underlay.choose}</strong>
              <span className="fine-print">{t.underlay.chooseHelp}</span>
            </span>
          </label>
        </div>

        {sheetUrl === null ? null : (
          <>
            <div className="pm-underlay__row">
              <div className="field field--compact pm-underlay__opacity">
                <label htmlFor="pm-opacity">
                  {t.underlay.opacity}
                  <span className="value pm-underlay__percent">
                    {t.underlay.opacityValue(String(opacity))}
                  </span>
                </label>
                <input
                  id="pm-opacity"
                  className="pm-slider"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                />
              </div>
              <button type="button" className="button button--sm" onClick={dropSheet}>
                {t.underlay.remove}
              </button>
            </div>

            {/*
              THE PLACEMENT IS ASSUMED UNTIL A PRINTED DIMENSION HAS SCALED IT,
              and it says so with a basis and a sensitivity, like any other
              assumption in this product. `data-state="assumed"` reaches the one
              place the amber mapping lives (`site.css` §5), so this panel paints
              no state colour of its own.
            */}
            {fit === null ? (
              <div className="callout" data-state="assumed" role="note">
                <div className="callout__body">
                  <strong>{t.underlay.uncalibrated.title}</strong>
                  <p>{t.underlay.uncalibrated.basis}</p>
                  <p>{t.underlay.uncalibrated.sensitivity}</p>
                </div>
              </div>
            ) : (
              <div className="callout" data-state="derived" role="note">
                <div className="callout__body">
                  <strong>{t.underlay.calibrate.done}</strong>
                  <p>{t.underlay.calibrate.residual(fit.measuredM, fit.statedM)}</p>
                  <p>
                    {new Decimal(fit.differencePercent).isZero()
                      ? t.underlay.calibrate.residualExact
                      : t.underlay.calibrate.residualGap(fit.differencePercent)}
                  </p>
                </div>
              </div>
            )}

            <h4 className="pm-subhead">{t.underlay.calibrate.heading}</h4>
            <p className="pm-underlay__lede">{t.underlay.calibrate.lede}</p>
            <p className="fine-print">{t.underlay.calibrate.how}</p>

            {stage === 'idle' ? (
              <button type="button" className="button button--sm" onClick={restartCalibration}>
                {fit === null ? t.underlay.calibrate.heading : t.underlay.calibrate.restart}
              </button>
            ) : (
              <div className="pm-calibrate">
                <p className="pm-calibrate__step" role="status">
                  {stage === 'distance'
                    ? t.underlay.calibrate.step(
                        String(CALIBRATION_PICKS + 1),
                        String(CALIBRATION_PICKS + 1),
                      )
                    : t.underlay.calibrate.step(
                        String(stageIndex + 1),
                        String(CALIBRATION_PICKS + 1),
                      )}
                  {' — '}
                  {stage === 'sheet-a'
                    ? t.underlay.calibrate.pickSheetA
                    : stage === 'ground-a'
                      ? t.underlay.calibrate.pickGroundA
                      : stage === 'sheet-b'
                        ? t.underlay.calibrate.pickSheetB
                        : stage === 'ground-b'
                          ? t.underlay.calibrate.pickGroundB
                          : t.underlay.calibrate.distance}
                </p>

                {stage === 'distance' ? (
                  <div className="pm-calibrate__row">
                    <div className="field field--compact">
                      <label htmlFor="pm-distance">{t.underlay.calibrate.distance}</label>
                      <input
                        id="pm-distance"
                        className="input input--num"
                        inputMode="decimal"
                        value={distanceText}
                        onChange={(e) => setDistanceText(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="button button--sm"
                      onClick={applyCalibration}
                    >
                      {t.underlay.calibrate.apply}
                    </button>
                  </div>
                ) : null}

                <div className="pm-calibrate__row">
                  <button type="button" className="button button--sm" onClick={restartCalibration}>
                    {t.underlay.calibrate.restart}
                  </button>
                  <button type="button" className="button button--sm" onClick={cancelCalibration}>
                    {t.underlay.calibrate.cancel}
                  </button>
                </div>
              </div>
            )}

            {calibrationRefusal === null ? null : (
              <div className="callout" data-state="blocked" role="alert">
                <div className="callout__body">
                  {calibrationRefusal === 'same-sheet-point'
                    ? t.underlay.calibrate.refusals.sameSheetPoint
                    : calibrationRefusal === 'same-ground-point'
                      ? t.underlay.calibrate.refusals.sameGroundPoint
                      : calibrationRefusal === 'no-distance'
                        ? t.underlay.calibrate.refusals.noDistance
                        : t.underlay.calibrate.refusals.outsideZone}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <p className="fine-print pm-claim">{t.claim}</p>
    </section>
  );
}
