import type { Map as MapLibreMap } from 'maplibre-gl';

import type { SheetOnPage } from '@web/api/client.js';
import type { UnderlayPlacement } from '@web/components/PlotMap.js';
import { fromDltm, type LngLat, toUtm40 } from '@web/geo.js';

/*
  THE AFFECTION PLAN UNDER THE MAP.

  Eng. Mohamed opened the overlay on plotlogic.dev and saw its panel, its
  opacity and its amber "placed by eye" — and only the dashed outline of a
  sheet on the imagery, never the sheet. Two defects, either one enough:

  1. THE PICTURE WAS FETCHED, AND THE SITE'S POLICY FORBIDS THE FETCH. An
     `image` source given a url — even a `data:` url — is loaded by maplibre
     with `fetch()`, which the Content-Security-Policy governs under
     `connect-src`; ours names 'self' and the tile hosts, not `data:`. So the
     request was refused, the source stayed empty, and the outline beside it,
     which is GeoJSON and needs no request, drew alone. A dev server sends no
     policy, which is why it drew there. The fix is not to widen the policy:
     the picture is already in the page, so it is handed to the source as a
     canvas (`updateImage({ image })`) and no request is made at all.

  2. ON A DDA SHEET THE "SITE PLAN" WAS THE AUTHORITY'S LOGO. The intake takes
     the largest picture placed on page one, which on an image-plan sheet is the
     plan, and on a DDA sheet — whose plan is vector — is the 862×172 banner
     with the emblem. The intake says so (no plot colour in it, no outline read)
     and still returns it, so the map laid a logo over the plot. What goes under
     the map now is the PAGE, drawn by pdf.js exactly as the sheet step draws
     it (`lib/sheet-raster.ts`, one renderer for both); cropped to the intake's picture only when the intake read the plot out
     of that picture, which is the proof that it is the plan.
*/

/** A rectangle in PDF points: x0, y0, x1, y1. */
export type BoxPt = readonly [number, number, number, number];

export interface SheetUnderlay {
  /** The issued PDF, base64, as it was attached. */
  readonly pdfBase64: string;
  /** The part of page 1 to lay down; null is the whole page. */
  readonly region: BoxPt | null;
  /**
   * Where the drawing sits on the DLTM grid, when the intake could tell: the
   * Municipality's grid crosses, or the DDA's drawn plot matched to its table.
   * With it the sheet is laid exactly and cropped around the plot by itself.
   */
  readonly onPage?: SheetOnPage;
}

/*
  THE SHEET LAID EXACTLY, AND CROPPED AROUND THE PLOT.

  Eng. Mohamed, 16 Oct 2026: the picture should sit on the drawn plot by
  itself, be cropped by itself, and still be adjustable. With `onPage` every
  point of the page has a DLTM position, so the image's four corners are
  computed rather than chosen, and the part laid down is the plot with a
  margin round it — its neighbours and the road labels, not the title block
  and the tables. The margin is the reader's to widen or narrow; moving the
  sheet by hand is still offered, and so is putting it back.
*/

/** The `onPage` of a sheet's reading, only on the grid this module can project (DLTM). */
export function onPageOf(facts: {
  readonly survey?: { readonly system: { readonly value: string }; readonly onPage?: SheetOnPage };
  readonly drawn?: { readonly system: { readonly value: string }; readonly onPage: SheetOnPage };
}): SheetOnPage | undefined {
  const reading = facts.survey?.onPage ? facts.survey : facts.drawn;
  return reading?.onPage && reading.system.value === 'DLTM' ? reading.onPage : undefined;
}

/** Metres on the ground per point on the page. */
const metresPerPoint = (p: SheetOnPage): number => Math.hypot(p.ax, p.ay);

/**
 * The plot's box on the page, widened by `marginM` metres on every side and
 * kept inside the drawing's own frame — never the title block or the tables.
 */
export function cropAroundPlot(p: SheetOnPage, marginM: number): BoxPt {
  const m = marginM / metresPerPoint(p);
  const [x0, y0, x1, y1] = p.plotBoxPt;
  const [px0, py0, px1, py1] = p.frameBoxPt;
  return [Math.max(px0, x0 - m), Math.max(py0, y0 - m), Math.min(px1, x1 + m), Math.min(py1, y1 + m)];
}

/** A page point on the ground. */
export function pageToGround(p: SheetOnPage, x: number, y: number): LngLat {
  return fromDltm({ e: p.ax * x + p.bx * y + p.cx, n: p.ay * x + p.by * y + p.cy });
}

/**
 * The four corners of `region` on the ground, top-left then clockwise — the
 * order an image source takes. PDF y grows UP, so the top edge is the larger y.
 */
export function regionOnGround(p: SheetOnPage, region: BoxPt): readonly [LngLat, LngLat, LngLat, LngLat] {
  const [ax, ay, bx, by] = region;
  const left = Math.min(ax, bx);
  const right = Math.max(ax, bx);
  const top = Math.max(ay, by);
  const bottom = Math.min(ay, by);
  return [pageToGround(p, left, top), pageToGround(p, right, top), pageToGround(p, right, bottom), pageToGround(p, left, bottom)];
}

/**
 * The same corners as a placement the hand tools understand — centre, width,
 * rotation — so "fit to a dimension" and "place here" start from where the
 * sheet already is. Only the tools read it; the sheet is drawn from the corners.
 */
export function placementOfCorners(corners: readonly [LngLat, LngLat, LngLat, LngLat], aspect: number): UnderlayPlacement {
  const [tl, tr, br, bl] = corners;
  const a = toUtm40(tl);
  const b = toUtm40(tr);
  return {
    centre: { lng: (tl.lng + tr.lng + br.lng + bl.lng) / 4, lat: (tl.lat + tr.lat + br.lat + bl.lat) / 4 },
    widthM: Math.hypot(b.e - a.e, b.n - a.n),
    aspect,
    // Clockwise from grid north, the sense `rotateIntoGrid` reads: the top edge's direction, turned.
    rotationDeg: (Math.atan2(-(b.n - a.n), b.e - a.e) * 180) / Math.PI,
  };
}

/** The longer side of the drawn underlay, in pixels: a printed dimension stays legible at plot zoom. */
export const UNDERLAY_LONG_SIDE_PX = 2400;

/**
 * Which part of the sheet goes under the map.
 *
 * The intake's picture only when it read an outline from it — the outline is
 * read from the plot's own colour, so a picture that yields one is the site
 * plan. Otherwise the whole page, which always holds the plan somewhere and is
 * never a logo. Pure, so it is held by a test to the three sheets on file.
 */
export function underlayRegion(
  sitePlan: { readonly image?: { readonly boxPt: BoxPt }; readonly outline?: unknown } | undefined,
): BoxPt | null {
  return sitePlan?.image && sitePlan.outline ? sitePlan.image.boxPt : null;
}

export const UNDERLAY_SOURCE = 'pm-sheet';

export type Quad = [[number, number], [number, number], [number, number], [number, number]];

/** The part of maplibre's map this needs, so a test can hand it a recorder. */
export type UnderlayMap = Pick<MapLibreMap, 'getSource' | 'addSource' | 'getLayer' | 'addLayer' | 'removeLayer' | 'removeSource' | 'setPaintProperty'>;

interface ImageFeed {
  updateImage(options: { image: HTMLCanvasElement; coordinates: Quad }): unknown;
  setCoordinates(coordinates: Quad): unknown;
}

/**
 * The sheet on the map, as a source with NO url: the canvas is handed over
 * directly, so nothing is fetched and no policy is consulted. `beforeId` keeps
 * it over the imagery and under the trace.
 */
export function showUnderlay(map: UnderlayMap, image: HTMLCanvasElement, quad: Quad, opacity: number, beforeId: string): void {
  let source = map.getSource(UNDERLAY_SOURCE) as unknown as ImageFeed | undefined;
  if (!source) {
    map.addSource(UNDERLAY_SOURCE, { type: 'image', coordinates: quad });
    source = map.getSource(UNDERLAY_SOURCE) as unknown as ImageFeed;
    source.updateImage({ image, coordinates: quad });
    shown.set(source, image);
    // No cross-fade: a sheet being fitted that ghosts its previous placement is two drawings of one document.
    map.addLayer({ id: UNDERLAY_SOURCE, type: 'raster', source: UNDERLAY_SOURCE, paint: { 'raster-opacity': opacity, 'raster-fade-duration': 0 } }, beforeId);
    return;
  }
  if (shown.get(source) !== image) {
    source.updateImage({ image, coordinates: quad });
    shown.set(source, image);
  } else {
    source.setCoordinates(quad);
  }
  map.setPaintProperty(UNDERLAY_SOURCE, 'raster-opacity', opacity);
}

/** Which canvas each source was last given, so a moved sheet is not re-uploaded as a texture. */
const shown = new WeakMap<object, HTMLCanvasElement>();

export function hideUnderlay(map: UnderlayMap): void {
  if (map.getLayer(UNDERLAY_SOURCE)) map.removeLayer(UNDERLAY_SOURCE);
  if (map.getSource(UNDERLAY_SOURCE)) map.removeSource(UNDERLAY_SOURCE);
}
