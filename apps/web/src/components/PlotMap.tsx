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
const OPENING_VIEW: LngLat = { lng: 54.6, lat: 24.3 };

/**
 * The whole country, and then the reader says where.
 *
 * It opened on one street corner in Bur Dubai at zoom 17, which answers a
 * question nobody asked: a reader whose plot is in Al Ain or Ras Al Khaimah
 * arrives already lost, and one whose plot IS in Dubai cannot tell whether the
 * view followed his sheet or happened to land there. So the opening view is the
 * seven emirates, and the first thing the panel offers is a search. A supplied
 * `centre` still overrides it — that one came from a document.
 *
 * Still not a hidden default, by the same argument as before: it is a view, not
 * a value. Nothing is computed from it, no output names it, and the reader's
 * first gesture replaces it.
 */
const OPENING_ZOOM = 6.6;
/** The zoom a search result or a picked footprint settles at: a plot fills it. */
const PLOT_ZOOM = 18;
/**
 * Below this, a plot is a speck and a corner dropped into the view is invisible
 * in it. A district fills the frame at fifteen; a forty-metre boundary is a few
 * pixels. It governs one thing only — whether a typed corner brings the camera
 * with it — and never what is traced or measured.
 */
const TRACE_ZOOM_FLOOR = 15;

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

/**
 * Set one boundary's length, by sliding its far corner along its own bearing.
 *
 * THE TRACE IS A DRAWING, AND A DRAWING IS MEASURED AND THEN CORRECTED. The
 * client's words on 6 Oct 2026, having traced a plot on imagery:
 * *«لما أرسمه طلع 33 متر لا أنا عايز أخليه 40 متر فا يمدلي الضلع لـ40 متر»* — the
 * trace measured 33 m, the affection plan says 40, and the boundary should
 * become 40. Dragging a corner on a satellite tile cannot hit a figure to the
 * centimetre and nobody should be asked to try; the dimension is on the
 * document, and this is how it gets onto the shape.
 *
 * WHAT MOVES, AND WHAT DOES NOT. The corner this boundary STARTS at stays where
 * the reader put it, and the corner it ENDS at slides along the bearing already
 * traced until the leg measures what was typed. Every other corner is untouched.
 * So the boundary becomes exactly the stated length, its direction is unchanged,
 * and the NEXT boundary changes as a consequence — which is what happens on
 * paper too, and is why the table shows every length rather than the one being
 * edited.
 *
 * It does not rotate, scale or close anything. A ring whose boundaries each came
 * from a printed dimension is a traverse, and `walkTraverse` on the plot form is
 * where a traverse's closure is reported — this is a drawing tool, and it would
 * be dishonest for it to quietly fix a misclosure the reader has not seen.
 *
 * Returns the ring unchanged for a length that is not a positive number, or on a
 * leg of zero length, which has no direction to slide along.
 */
export function setLegLength(
  ring: readonly LngLat[],
  index: number,
  lengthM: number,
): readonly LngLat[] {
  if (!Number.isFinite(lengthM) || lengthM <= 0) return ring;
  if (ring.length < 2 || index < 0 || index >= ring.length) return ring;

  const endIndex = (index + 1) % ring.length;
  const from = ring[index];
  const to = ring[endIndex];
  if (!from || !to) return ring;

  /* In metres on the grid, not in degrees: a degree of longitude in Dubai is
     about 101 km and a degree of latitude about 111, so scaling the lng/lat
     difference would shorten the leg in one axis and not the other and swing
     its bearing while claiming to change only its length. */
  const a = toUtm40(from);
  const b = toUtm40(to);
  const de = b.e - a.e;
  const dn = b.n - a.n;
  const current = Math.hypot(de, dn);
  if (!(current > 0)) return ring;

  const k = lengthM / current;
  const moved = fromUtm40({ e: a.e + de * k, n: a.n + dn * k });
  return ring.map((p, i) => (i === endIndex ? moved : p));
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

/* =========================================================================
   PICKING A FOOTPRINT OFF THE MAP, AND WHAT IT IS WORTH

   Eng. Mohamed asked to be able to click a building or a parcel and get its
   real dimensions out, editable. OpenStreetMap is the only footprint data this
   panel can reach, and the honest version of the feature is narrow:

   - **It is not a cadastral source and it is not a survey.** It is what a
     contributor traced, usually off the same imagery the reader is looking at.
     So a picked ring arrives as a DRAFT the reader is expected to correct, every
     vertex draggable, and the panel says whose outline it is in the sentence
     beside it — never "the plot boundary".
   - **A building is not a plot.** A footprint is the building's outline, which
     is inside the parcel and is not the parcel. The panel says that too, because
     a reader who takes a villa's outline for his plot will under-report his own
     land by the setbacks.
   - **It refuses rather than guesses.** Nothing within reach, no network, or a
     shape that is not a simple ring: a refusal naming which, not a nearest
     rectangle.

   Collinear vertices are dropped on the way in. A contributor's trace carries
   points that are not corners — three nodes down one straight wall — and every
   one of them would arrive as a boundary wanting its own classification and its
   own setback. The tolerance is angular and generous for the same reason the
   whole thing is a draft.
   ========================================================================= */

/** Why no footprint came back. Codes; the words live in the dictionary. */
export type FootprintRefusal = 'offline' | 'none-here' | 'not-a-ring';

export interface FootprintResult {
  readonly ring: readonly LngLat[] | null;
  readonly refusal: FootprintRefusal | null;
  /** What OpenStreetMap calls it, when it calls it anything. Quoted verbatim. */
  readonly name: string | null;
  /** `building`, `landuse`, … — what kind of thing was picked. */
  readonly kind: string | null;
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
/** How far from the click to look. One villa plot, not one neighbourhood. */
const FOOTPRINT_RADIUS_M = 40;
/** A corner is a turn of at least this much. Below it the point is on a wall. */
const COLLINEAR_TOLERANCE_DEG = 4;

/** Drop the points that are not corners, keeping the ring's shape. */
export function dropCollinear(
  ring: readonly LngLat[],
  toleranceDeg: number = COLLINEAR_TOLERANCE_DEG,
): readonly LngLat[] {
  if (ring.length < 4) return ring;
  const kept: LngLat[] = [];
  for (let i = 0; i < ring.length; i += 1) {
    const before = kept.length > 0 ? kept[kept.length - 1]! : ring[(i - 1 + ring.length) % ring.length]!;
    const here = ring[i]!;
    const after = ring[(i + 1) % ring.length]!;
    const a = legBetween(before, here).bearingDeg;
    const b = legBetween(here, after).bearingDeg;
    /* The deflection between the leg arriving and the leg leaving: zero down a
       straight wall, signed and in (−180, 180]. A corner is a turn of at least
       the tolerance; anything less is a node on a wall. */
    const deflection = ((b - a + 540) % 360) - 180;
    if (Math.abs(deflection) >= toleranceDeg) kept.push(here);
  }
  return kept.length >= 3 ? kept : ring;
}

interface OverpassWay {
  readonly geometry?: readonly { readonly lat: number; readonly lon: number }[];
  readonly tags?: Readonly<Record<string, string>>;
}

/** Is the point inside the ring? Ray casting, on degrees — a containment test
 *  over forty metres does not need a projection. */
function ringContains(ring: readonly LngLat[], p: LngLat): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i]!;
    const b = ring[j]!;
    const straddles = a.lat > p.lat !== b.lat > p.lat;
    if (straddles && p.lng < ((b.lng - a.lng) * (p.lat - a.lat)) / (b.lat - a.lat) + a.lng) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * The outline OpenStreetMap holds at this point, as a draft ring.
 *
 * `fetchImpl` is a parameter so the refusals can be tested without a network,
 * which is the only part of this worth testing: the happy path is a fetch and a
 * map, and the refusals are the behaviour.
 */
export async function fetchFootprint(
  at: LngLat,
  radiusM: number = FOOTPRINT_RADIUS_M,
  fetchImpl: typeof fetch = fetch,
): Promise<FootprintResult> {
  const query =
    `[out:json][timeout:20];(` +
    `way(around:${radiusM},${at.lat},${at.lng})["building"];` +
    `way(around:${radiusM},${at.lat},${at.lng})["landuse"];` +
    `);out geom;`;
  let ways: readonly OverpassWay[];
  try {
    const res = await fetchImpl(OVERPASS_URL, { method: 'POST', body: query });
    if (!res.ok) return { ring: null, refusal: 'offline', name: null, kind: null };
    const body = (await res.json()) as { readonly elements?: readonly OverpassWay[] };
    ways = body.elements ?? [];
  } catch {
    return { ring: null, refusal: 'offline', name: null, kind: null };
  }
  if (ways.length === 0) return { ring: null, refusal: 'none-here', name: null, kind: null };

  const rings = ways
    .map((w) => ({
      way: w,
      /* An OSM way repeats its first node to close itself; the ring this panel
         holds does not, so the repeat comes off here rather than becoming a
         zero-length boundary that then wants a classification. */
      ring: (w.geometry ?? []).map((g) => ({ lng: g.lon, lat: g.lat })).slice(0, -1),
    }))
    .filter((r) => r.ring.length >= 3);
  if (rings.length === 0) return { ring: null, refusal: 'not-a-ring', name: null, kind: null };

  /* The one the reader clicked inside, else the smallest within reach — a click
     between two villas should not pick the compound wall around both. */
  const containing = rings.filter((r) => ringContains(r.ring, at));
  const pool = containing.length > 0 ? containing : rings;
  const picked = pool.reduce((a, b) => (ringAreaM2(b.ring) < ringAreaM2(a.ring) ? b : a));
  const tags = picked.way.tags ?? {};
  return {
    ring: dropCollinear(picked.ring),
    refusal: null,
    name: tags['name'] ?? null,
    kind: tags['building'] !== undefined ? 'building' : (tags['landuse'] ?? null),
  };
}

/* =========================================================================
   FINDING THE PLACE, since the map now opens on seven emirates
   ========================================================================= */

export interface PlaceHit {
  readonly label: string;
  readonly at: LngLat;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

/** Search, restricted to the UAE. Returns an empty list on any failure: a
 *  search that cannot reach the internet found nothing, which is the truth. */
export async function searchPlaces(
  query: string,
  fetchImpl: typeof fetch = fetch,
): Promise<readonly PlaceHit[]> {
  const q = query.trim();
  if (q === '') return [];
  const url = `${NOMINATIM_URL}?format=jsonv2&countrycodes=ae&limit=6&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetchImpl(url, { headers: { accept: 'application/json' } });
    if (!res.ok) return [];
    const body = (await res.json()) as readonly {
      readonly display_name?: string;
      readonly lat?: string;
      readonly lon?: string;
    }[];
    return body
      .filter((h) => h.lat !== undefined && h.lon !== undefined && h.display_name !== undefined)
      .map((h) => ({
        label: h.display_name!,
        at: { lng: Number(h.lon), lat: Number(h.lat) },
      }))
      .filter((h) => Number.isFinite(h.at.lng) && Number.isFinite(h.at.lat));
  } catch {
    return [];
  }
}

/**
 * A measurement drawn over the canvas, in page pixels.
 *
 * The labels are DOM rather than a maplibre symbol layer, and that is not a
 * stylistic preference: a symbol layer needs a `glyphs` endpoint, which is a
 * font fetched from somebody else's server — on a panel whose whole premise is
 * that it is opened on a plot with no wifi, and in a canvas no contrast gate can
 * read. As DOM they are inked from `tokens.css`, measured by `pnpm contrast`
 * like everything else, and read aloud in order by a screen reader.
 */
export interface MapLabel {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly kind: 'leg' | 'area' | 'tape';
}

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
  /**
   * The sheet's own site plan, base64, laid over the imagery on open.
   *
   * THE PICTURE, NOT A PLACEMENT. It arrives with no position, no rotation and
   * no scale — the server reads a raster out of a PDF and the PDF says nothing
   * about where on the earth the drawing sits. So it opens at `assumedPlacement`
   * exactly as a picked file does, dashed, and the calibration below is what
   * turns it into something a boundary may be traced from. Nothing downstream
   * can tell the two apart, which is correct: a drawing is a drawing whether a
   * reader found it on his disk or the engine found it in his sheet.
   */
  readonly sheetPngBase64?: string;
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
  tape: 'pm-tape',
  tapePoints: 'pm-tape-points',
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
  map.addSource(ID.tape, { type: 'geojson', data: EMPTY_FC });
  map.addSource(ID.tapePoints, { type: 'geojson', data: EMPTY_FC });

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

  /*
    THE TAPE IS DRAWN LIKE A TAPE AND NOT LIKE A BOUNDARY.

    Dashed, thinner, and in the chrome ink rather than the accent: a reader who
    cannot tell at a glance which line is the plot and which is a distance he
    measured will hand over the wrong one. It carries no fill, because a tape
    encloses nothing even when its ends happen to meet.
  */
  map.addLayer({
    id: ID.tape,
    type: 'line',
    source: ID.tape,
    layout: { 'line-join': 'round', 'line-cap': 'butt' },
    paint: {
      'line-width': 2,
      'line-dasharray': [2, 2],
      ...(ink ? { 'line-color': ink } : {}),
    },
  });
  map.addLayer({
    id: ID.tapePoints,
    type: 'circle',
    source: ID.tapePoints,
    paint: {
      'circle-radius': 4,
      'circle-stroke-width': 2,
      ...(plate ? { 'circle-color': plate } : {}),
      ...(ink ? { 'circle-stroke-color': ink } : {}),
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
  sheetPngBase64,
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
  /** Whether any tile has ever been drawn. See the `error` handler. */
  const tilesSeenRef = useRef(false);
  const [osmVisible, setOsmVisible] = useState(false);

  /**
   * Which pointer tool the canvas is holding.
   *
   * `trace` adds a corner, `measure` lays a tape and adds nothing to the ring,
   * and `pan` does neither. A map that is always armed to add a corner cannot be
   * panned without adding one, and a map that is never armed gives a reader no
   * way to start — the first draft had the second problem and the controls for
   * it were below the fold, where nobody looked.
   */
  const [tool, setTool] = useState<'pan' | 'trace' | 'measure'>('trace');
  /** The tape's points. Measured, never handed over: it is not the plot. */
  const [tape, setTape] = useState<readonly LngLat[]>([]);
  /** Label positions, re-projected whenever the map moves. */
  const [labels, setLabels] = useState<readonly MapLabel[]>([]);

  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [hits, setHits] = useState<readonly PlaceHit[]>([]);

  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<FootprintResult | null>(null);

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

  /*
    THE LENGTH BEING TYPED, held apart from the ring it will change.

    A boundary's length is derived from two corners, so an input bound straight
    to it cannot be typed into: clearing the box to type "40" would publish a
    ring with a zero-length leg on the first keystroke, and `4` would move the
    corner four metres away before the `0` arrived. The text lives here until it
    is committed, and `null` means the table is showing measurements again.
  */
  const [lengthEdit, setLengthEdit] = useState<{ readonly n: number; readonly text: string } | null>(
    null,
  );

  const commitLength = useCallback(() => {
    if (lengthEdit === null) return;
    const wanted = Number(lengthEdit.text);
    setLengthEdit(null);
    /* A blank or unparseable box is a reader who changed their mind, and the
       boundary they were editing keeps the length it was traced at. */
    if (!Number.isFinite(wanted) || wanted <= 0) return;
    publish(setLegLength(ring, lengthEdit.n - 1, wanted));
  }, [lengthEdit, ring, publish]);

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
      /*
        THE TOOL DECIDES WHAT A CLICK IS, and `pan` means it is nothing.

        The panel used to add a corner on every click, which is a map that
        cannot be examined without being drawn on: a reader looking for his plot
        left a trail of vertices behind the search. The tape adds nothing to the
        ring for the same reason in reverse — a distance somebody measured is
        not a boundary somebody surveyed, and the two must not share a geometry.
      */
      if (tool === 'measure') {
        setTape((t0) => [...t0, point]);
        return;
      }
      if (tool === 'pan') return;
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
    [stage, takePick, ring.length, addPoint, tool],
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
          /* A supplied centre came from a document, so the view goes to the
             plot. With none, the country — see `OPENING_ZOOM`. */
          zoom: centre ? PLOT_ZOOM : OPENING_ZOOM,
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

        /*
          ONE ABORTED TILE IS NOT A FAILED BASEMAP.

          `map.on('error')` fires for every tile that 404s at the edge of
          coverage and for every request the renderer aborts while the reader is
          still panning — so this banner read "the imagery tiles did not load"
          over a screen full of imagery, which teaches a reader that the panel's
          warnings are noise. The failure it exists to report is a basemap that
          never arrived at all, so it is only claimed while no tile has ever
          been drawn, and it is withdrawn the moment one is.

          Reported, not thrown either way: a view without a photograph is still
          a view, and the trace, the measurements and the table are arithmetic
          that does not depend on one.
        */
        map.on('error', () => {
          if (!cancelled && !tilesSeenRef.current) setTilesFailed(true);
        });
        map.on('data', (e) => {
          if (cancelled) return;
          if (e.dataType === 'source' && 'tile' in e && e.tile !== undefined) {
            tilesSeenRef.current = true;
            setTilesFailed(false);
          }
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

  /* The tape, in its own sources: it is a measurement, never a boundary. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapState !== 'ready') return;
    const line = map.getSource(ID.tape) as GeoJSONSource | undefined;
    const pts = map.getSource(ID.tapePoints) as GeoJSONSource | undefined;
    if (!line || !pts) return;
    void line.setData(
      tape.length >= 2
        ? {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: tape.map((p) => [p.lng, p.lat]) },
          }
        : EMPTY_FC,
    );
    void pts.setData({
      type: 'FeatureCollection',
      features: tape.map((p, i) => ({
        type: 'Feature',
        properties: { i },
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      })),
    });
  }, [tape, mapState]);

  /*
    THE DIMENSIONS ON THE DRAWING, RE-PROJECTED AS THE READER MOVES.

    Every boundary carries its length and its grid bearing at its midpoint, and
    the figure carries its area and perimeter at its centroid — which is what
    makes the trace read as a survey traverse rather than as a shape somebody
    sketched. The figures are the same ones the table below states, computed by
    the same functions, so there is one set of numbers on this panel and not two.

    Recomputed on `render` rather than on `move`, because a zoom animation and an
    inertial pan both emit `render` and neither emits `move` on every frame; a
    label that lags its line by two frames reads as a label that belongs to
    something else.
  */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapState !== 'ready') return;

    const project = (): void => {
      const next: MapLabel[] = [];
      const legs = ring.length >= 3 ? legDrafts(ring) : [];
      const shown = closed ? legs.length : Math.max(0, ring.length - 1);
      for (let i = 0; i < shown; i += 1) {
        const a = ring[i]!;
        const b = ring[(i + 1) % ring.length]!;
        const at = map.project([(a.lng + b.lng) / 2, (a.lat + b.lat) / 2]);
        const leg = legs[i];
        if (!leg) continue;
        next.push({
          id: `leg-${i}`,
          x: at.x,
          y: at.y,
          text: `${leg.lengthM} m · ${leg.bearingDeg}°`,
          kind: 'leg',
        });
      }
      if (closed && ring.length >= 3) {
        const read = ringReadout(ring);
        const cx = ring.reduce((s, p) => s + p.lng, 0) / ring.length;
        const cy = ring.reduce((s, p) => s + p.lat, 0) / ring.length;
        const at = map.project([cx, cy]);
        if (read.areaM2 !== null && read.perimeterM !== null) {
          next.push({
            id: 'area',
            x: at.x,
            y: at.y,
            text: `${read.areaM2} m² · ${read.perimeterM} m`,
            kind: 'area',
          });
        }
      }
      for (let i = 0; i + 1 < tape.length; i += 1) {
        const a = tape[i]!;
        const b = tape[i + 1]!;
        const at = map.project([(a.lng + b.lng) / 2, (a.lat + b.lat) / 2]);
        const leg = legBetween(a, b);
        next.push({
          id: `tape-${i}`,
          x: at.x,
          y: at.y,
          text: `${new Decimal(leg.lengthM).toFixed(TRACE_DP)} m`,
          kind: 'tape',
        });
      }
      setLabels(next);
    };

    project();
    map.on('render', project);
    return () => {
      map.off('render', project);
    };
  }, [ring, closed, tape, mapState]);

  /* The pointer says what a click will do. A crosshair over a map that is only
     going to pan is a lie the cursor tells before anything else can. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapState !== 'ready') return;
    map.getCanvas().style.cursor = tool === 'pan' ? '' : 'crosshair';
  }, [tool, mapState]);

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

  /*
    THE SHEET IS FLATTENED ONTO WHITE BEFORE IT IS LAID ON THE MAP.

    A PDF page rastered with an alpha channel has NO white background — it has
    nothing where the paper is, and every pixel the drawing does not ink is
    transparent. Laid over satellite imagery at 60% that reads as a dark
    rectangle with a few faint blue lines in it, which is exactly what the client
    photographed on 6 Oct 2026 and described as the sheet not showing: it was
    showing, and it was unreadable, which for a tracing underlay is the same
    thing.

    Compositing here rather than painting a white rectangle under the layer, for
    two reasons. The layer is positioned by four corners that move as the sheet
    is calibrated, so a second layer would have to be kept in step with it
    forever. And the opacity slider must fade the sheet TOWARDS the imagery — a
    white rectangle under a fading drawing fades to white, not to the ground.

    A sheet that is already opaque is unchanged by this: drawing it onto white
    and reading it back is a no-op for every pixel whose alpha is 1.
  */
  const onWhite = (img: HTMLImageElement): Promise<Blob | null> =>
    new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });

  const takeSheet = (file: Blob | undefined): void => {
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
      let measured = false;
      if (view) {
        try {
          widthM = legBetween(
            { lng: view.getWest(), lat: viewCentre.lat },
            { lng: view.getEast(), lat: viewCentre.lat },
          ).lengthM;
          measured = true;
        } catch {
          /* A view straddling the edge of zone 40N cannot be measured, so the
             sheet opens at `FALLBACK_SHEET_WIDTH_M`. Either way the placement is
             the one this screen chose, which is what the callout says. */
        }
      }
      /* The placement is set first and from the same frame, so the sheet never
         appears at one size and jumps to another while the flatten resolves. */
      setPlacement(assumedPlacement(viewCentre, widthM, aspect));
      /*
        AND THE CAMERA COMES DOWN TO IT, OR THE SHEET IS INVISIBLE AND THE PANEL
        LIES ABOUT IT.

        The map opens on the whole of the Emirates. A view that wide cannot be
        measured in zone 40N, so `legBetween` throws and the placement falls back
        to two hundred metres — which at the opening zoom is a fraction of one
        pixel. The reader saw the opacity slider, the "this placement is assumed"
        callout and the Remove button all appear, and no drawing anywhere on the
        imagery: every piece of state said the sheet was laid down and the one
        thing that mattered showed nothing. That was reported as "I uploaded the
        sheet and it did not appear on the map", and it was exactly right.

        So where the width is a FALLBACK rather than a measurement, the view goes
        to the sheet. A camera move asserts nothing — the placement is still
        `ASSUMED`, still says so, and still has to be calibrated against a printed
        dimension before anything is traced from it. Where the width WAS measured
        the sheet already fills the view, and the camera is left where the reader
        put it.
      */
      if (map && !measured) map.jumpTo({ center: [viewCentre.lng, viewCentre.lat], zoom: PLOT_ZOOM });
      setFit(null);
      setStage('idle');
      setPicks({ sheetA: null, groundA: null, sheetB: null, groundB: null });

      void onWhite(img).then((flat) => {
        if (flat === null) {
          /* No 2D context — a browser with canvas disabled, or an image the
             canvas refuses. The sheet is still laid down, transparent where the
             paper is: harder to read on dark imagery, and better than no
             underlay at all. */
          setSheetUrl(url);
          return;
        }
        URL.revokeObjectURL(url);
        setSheetUrl(URL.createObjectURL(flat));
      });
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

  /*
    THE SHEET'S OWN DRAWING, THROUGH THE SAME DOOR A PICKED FILE USES.

    Decoded into a Blob and handed to `takeSheet`, rather than set as a data URL
    on `sheetUrl` directly. Three things come free from that and each of them was
    a bug waiting in the shorter version: the aspect is read off the decoded
    image instead of assumed, the opening placement is computed from the view the
    reader is actually looking at, and the object URL is revoked by the one
    effect below that revokes every other one. A data URL set straight into
    `sheetUrl` would have been revoked too — harmlessly, which is worse, because
    the next person would read that line as proof the lifetimes were handled.

    `sheetUrl === null` guards it, so this runs once and a reader who drops the
    sheet is not handed it back on the next render. Dropping it is an answer.
  */
  useEffect(() => {
    if (!sheetPngBase64 || sheetUrl !== null) return;
    try {
      const binary = atob(sheetPngBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      takeSheet(new Blob([bytes], { type: 'image/png' }));
    } catch {
      /* A sheet that will not decode is a sheet the reader never sees, and the
         map is still a map. The file picker below remains the way in. */
    }
    // `takeSheet` is re-created every render and depending on it would re-run
    // this on every keystroke; the `sheetUrl` guard is what makes it once-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetPngBase64, sheetUrl]);

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
    /*
      AND THE CAMERA FOLLOWS A TYPED CORNER THAT LANDS OFF SCREEN.

      The map opens on the whole of the Emirates, by design, and a plot is forty
      metres across. So a reader who enters his corners by coordinate — the
      keyboard path, and the only path open to someone who has the surveyor's
      numbers rather than a view of the roof — added four points, closed the
      ring, and saw an unchanged picture of the coast. The trace was right, the
      table was right, and nothing on the imagery moved.

      Moving the camera asserts nothing: a view is not a value, it carries no
      provenance, and the ring it flies to is the ring the reader just typed. It
      moves when the point is outside the view, and when the view is too wide for
      a plot to be more than a speck in it — a corner inside the frame at country
      zoom is inside a frame it cannot be seen in, which is the same nothing.
      Above `TRACE_ZOOM_FLOOR` the camera is left exactly where the reader put it,
      so working corner by corner at plot scale is never interrupted by one's own
      typing; and the first typed corner lifts the zoom past the floor, so at most
      one move happens per ring.
    */
    const map = mapRef.current;
    const at = { lng: Number(lngText), lat: Number(latText) };
    if (map && (map.getZoom() < TRACE_ZOOM_FLOOR || !map.getBounds().contains([at.lng, at.lat]))) {
      map.jumpTo({ center: [at.lng, at.lat], zoom: PLOT_ZOOM });
    }
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

  /** Move the view to a found place. Nothing about the trace changes. */
  const goTo = (at: LngLat): void => {
    const map = mapRef.current;
    if (!map) return;
    map.jumpTo({ center: [at.lng, at.lat], zoom: PLOT_ZOOM });
    setHits([]);
  };

  const runSearch = async (): Promise<void> => {
    setSearching(true);
    try {
      const found = await searchPlaces(searchText);
      setHits(found);
      setSearched(true);
      if (found.length === 1) goTo(found[0]!.at);
    } finally {
      setSearching(false);
    }
  };

  /*
    PICKING THE OUTLINE AT THE CENTRE OF THE VIEW, not at a click.

    A click is already spoken for three ways over, and a fourth meaning on the
    same gesture is how a reader ends up adding a corner when he meant to pick a
    building. The centre of the view is unambiguous, works from the keyboard, and
    is where a reader has already put the thing he is looking at.

    It REPLACES the ring, and only when there is nothing to lose: a reader who
    has already traced corners keeps them, because a picked outline silently
    discarding somebody's work is the one failure this panel cannot apologise
    for. He clears first if he wants the draft.
  */
  const pickFootprint = async (): Promise<void> => {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    setPicking(true);
    try {
      const found = await fetchFootprint({ lng: c.lng, lat: c.lat });
      setPicked(found);
      if (found.ring && ring.length === 0) {
        setRing(found.ring);
        setClosed(true);
      }
    } finally {
      setPicking(false);
    }
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

      {/* ---- Finding the place ------------------------------------------- */}
      <div className="field-group pm-search">
        <p className="field-group__legend">{t.search.heading}</p>
        <div className="pm-search__row">
          <div className="field field--compact pm-search__field">
            <label htmlFor="pm-search">{t.search.label}</label>
            <input
              id="pm-search"
              className="input"
              value={searchText}
              placeholder={t.search.placeholder}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void runSearch();
                }
              }}
            />
          </div>
          <button
            type="button"
            className="button button--sm"
            onClick={() => void runSearch()}
            disabled={searching || searchText.trim() === ''}
          >
            {searching ? t.search.searching : t.search.run}
          </button>
        </div>
        {hits.length > 0 ? (
          <ul className="pm-search__hits">
            {hits.map((h) => (
              <li key={`${h.at.lng},${h.at.lat}`}>
                <button type="button" className="button button--sm button--ghost" onClick={() => goTo(h.at)}>
                  <span lang="en" dir="ltr">
                    {h.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {searched && hits.length === 0 ? (
          <p className="pm-controls__state" role="status">
            {t.search.none}
          </p>
        ) : null}
        <p className="fine-print">{t.search.note}</p>
      </div>

      {/* ---- The map frame ---------------------------------------------- */}
      <div className="pm-frame">
        {/* maplibre builds the canvas inside this host and labels and describes
            it on load. Nothing is put here by React, because React and maplibre
            would then both own the same children. */}
        <div ref={hostRef} className="pm-map" />

        {/*
          THE TOOLBAR, ON THE MAP, BECAUSE THAT IS WHERE THE QUESTION IS ASKED.

          These controls were below the fold in a field group under the table,
          and the reader's complaint was the right one: the panel offered a map
          with a plus, a minus and an overlay toggle, and nothing on it said that
          a click would draw. A radio group states which of the three answers is
          armed, in words, and the cursor agrees with it.

          A radio group rather than toggle buttons: the three are exclusive, one
          is always on, and that is exactly what a radio group means to a screen
          reader without an `aria-pressed` on each saying it three times.
        */}
        <div className="pm-tools" role="radiogroup" aria-label={t.tools.heading}>
          {(
            [
              ['trace', t.tools.trace],
              ['measure', t.tools.measure],
              ['pan', t.tools.pan],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={tool === id}
              className="button button--sm pm-tools__button"
              data-selected={tool === id ? 'true' : undefined}
              onClick={() => setTool(id)}
              disabled={mapState !== 'ready'}
            >
              {label}
            </button>
          ))}
        </div>

        {/*
          THE MEASUREMENTS, OVER THE CANVAS AND NOT INSIDE IT.

          `aria-hidden`: every figure here is already a row in the table below,
          read in order and with its corner coordinates beside it. Reading them
          twice — once as floating text with no order and no context, once as the
          table — would make the panel worse for the reader it is meant to serve.
        */}
        <div className="pm-labels" aria-hidden="true">
          {labels.map((l) => (
            <span
              key={l.id}
              className="pm-label"
              data-kind={l.kind}
              style={{ transform: `translate(${String(l.x)}px, ${String(l.y)}px) translate(-50%, -50%)` }}
            >
              {l.text}
            </span>
          ))}
        </div>

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
          <button
            type="button"
            className="button button--sm"
            onClick={() => setTape([])}
            disabled={tape.length === 0}
          >
            {t.tools.clearTape}
          </button>
        </div>
        <p className="fine-print">
          {tool === 'trace' ? t.tools.traceHelp : tool === 'measure' ? t.tools.measureHelp : t.tools.panHelp}
        </p>

        {/* ---- Picking an outline off the map --------------------------- */}
        <div className="pm-controls__row">
          <button
            type="button"
            className="button button--sm"
            onClick={() => void pickFootprint()}
            disabled={picking || mapState !== 'ready'}
          >
            {picking ? t.tools.picking : t.tools.pick}
          </button>
        </div>
        <p className="fine-print">{t.tools.pickHelp}</p>
        {picked?.refusal ? (
          <div className="callout" data-state="blocked" role="alert">
            <div className="callout__body">
              {picked.refusal === 'offline'
                ? t.tools.refusals.offline
                : picked.refusal === 'none-here'
                  ? t.tools.refusals.noneHere
                  : t.tools.refusals.notARing}
            </div>
          </div>
        ) : null}
        {picked?.ring ? (
          /*
            WHAT WAS PICKED, AND WHOSE IT IS — amber, because a contributor's
            trace is an ASSUMED boundary in every sense this product uses the
            word: nobody surveyed it, and the reader is expected to correct it.
          */
          <div className="callout" data-state="assumed" role="note">
            <div className="callout__body">
              <p>
                {picked.name !== null
                  ? t.tools.picked(picked.name, String(picked.ring.length))
                  : t.tools.pickedUnnamed(String(picked.ring.length))}
              </p>
              <p className="fine-print">{t.tools.pickedNote}</p>
            </div>
          </div>
        ) : null}
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
                  {/*
                    THE ONE FIGURE ON THIS TABLE A READER MAY OVERTYPE.

                    The bearing is not editable and the corner is not editable,
                    and that is not an omission. A length is printed on an
                    affection plan; a grid bearing almost never is, and a corner
                    never is in lng/lat. Offering boxes for the other two would
                    invite a reader to type figures no document states, into the
                    one shape the whole run is built on.
                  */}
                  <td className="schedule__num" data-label={t.table.length}>
                    <input
                      className="input input--num pm-ring__length"
                      inputMode="decimal"
                      aria-label={t.table.setLength(String(row.n))}
                      value={lengthEdit?.n === row.n ? lengthEdit.text : row.lengthM}
                      onChange={(e) => setLengthEdit({ n: row.n, text: e.target.value })}
                      onBlur={commitLength}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          /* A table inside a form: Enter would submit it, and the
                             plot would be created from the ring as traced rather
                             than as corrected. */
                          e.preventDefault();
                          commitLength();
                        }
                        if (e.key === 'Escape') setLengthEdit(null);
                      }}
                    />
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
