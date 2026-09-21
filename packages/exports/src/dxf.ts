/**
 * DXF writer — the drawing an architect can open.
 *
 * In the 30 Aug 2026 walkthrough the client's test of any tool was the same
 * gesture: generate something, export it, open it in AutoCAD. A capacity number
 * that cannot leave the browser is a number he has to retype, and a tool he has
 * to retype out of is one he will stop opening.
 *
 * Written by hand rather than through a library, for three reasons that matter
 * more here than the convenience would:
 *
 * 1. **R12 is the format everything reads.** It predates the object model that
 *    later versions layer on, so AutoCAD, BricsCAD, Revit's DWG import,
 *    LibreCAD and every online viewer accept it without negotiation. A newer
 *    DXF buys features this drawing does not use.
 * 2. **Layers carry the provenance.** Setback lines land on a different layer
 *    from the plot boundary, and the assumed envelope on a different layer
 *    again, so the amber/neutral distinction the screen makes survives into the
 *    CAD file rather than being flattened into anonymous geometry.
 * 3. **Millimetres in, metres out, once.** The kernel holds integer millimetres
 *    (PRD §14.3); CAD files for Dubai plots are drawn in metres. Converting in
 *    exactly one place means the factor cannot drift between entity types.
 */

import { Decimal, mmToM, type Mm } from '@envelope/core';

/** A point in kernel units — integer millimetres. */
export interface DxfPoint {
  readonly x: Mm;
  readonly y: Mm;
}

/**
 * DXF colour indices used by this writer.
 *
 * Chosen to mirror the screen's provenance palette rather than to be pretty:
 * a reader who has seen the web view should recognise the same distinction in
 * the CAD file without a legend.
 */
export const DxfColor = {
  /** White/black by background — the surveyed plot boundary. */
  BOUNDARY: 7,
  /** Cyan — a bound derived from a cited rule. */
  DERIVED: 4,
  /** Yellow — an assumption. The amber of §13.1, as close as ACI gets. */
  ASSUMED: 2,
  /** Green — the resulting buildable envelope. */
  ENVELOPE: 3,
  /** Grey — annotation. */
  ANNOTATION: 8,
} as const;
export type DxfColor = (typeof DxfColor)[keyof typeof DxfColor];

export interface DxfLayer {
  readonly name: string;
  readonly color: DxfColor;
}

export interface DxfPolyline {
  readonly layer: string;
  readonly points: readonly DxfPoint[];
  readonly closed: boolean;
}

export interface DxfText {
  readonly layer: string;
  readonly at: DxfPoint;
  /** Text height in metres — DXF has no notion of "points". */
  readonly heightM: number;
  readonly value: string;
}

export interface DxfDocument {
  readonly layers: readonly DxfLayer[];
  readonly polylines: readonly DxfPolyline[];
  readonly texts: readonly DxfText[];
}

/**
 * A DXF group code / value pair.
 *
 * DXF is a flat sequence of these: an integer code on one line, its value on the
 * next. Modelling it as pairs rather than string concatenation is what keeps the
 * pairing correct — a single stray newline in a hand-built string shifts every
 * subsequent code by one and produces a file that opens as garbage.
 */
type Pair = readonly [number, string | number];

function fmt(pairs: readonly Pair[]): string {
  // DXF is conventionally CRLF. AutoCAD tolerates LF; some older importers and
  // several web viewers do not, and the failure mode is a silent empty drawing.
  return pairs.map(([code, value]) => `${code}\r\n${value}`).join('\r\n') + '\r\n';
}

/** Millimetres to metres, at the DXF precision this drawing needs. */
function m(v: Mm): string {
  return mmToM(v).toFixed(4);
}

function header(extents: { min: DxfPoint; max: DxfPoint } | undefined): Pair[] {
  const pairs: Pair[] = [
    [0, 'SECTION'],
    [2, 'HEADER'],
    [9, '$ACADVER'],
    [1, 'AC1009'], // R12
    [9, '$INSUNITS'],
    [70, 6], // metres — so a receiving CAD system scales correctly on insert
  ];
  if (extents) {
    pairs.push(
      [9, '$EXTMIN'],
      [10, m(extents.min.x)],
      [20, m(extents.min.y)],
      [30, '0.0'],
      [9, '$EXTMAX'],
      [10, m(extents.max.x)],
      [20, m(extents.max.y)],
      [30, '0.0'],
    );
  }
  pairs.push([0, 'ENDSEC']);
  return pairs;
}

function tables(layers: readonly DxfLayer[]): Pair[] {
  const pairs: Pair[] = [
    [0, 'SECTION'],
    [2, 'TABLES'],
    [0, 'TABLE'],
    [2, 'LAYER'],
    [70, layers.length],
  ];
  for (const layer of layers) {
    pairs.push(
      [0, 'LAYER'],
      [2, layer.name],
      [70, 0],
      [62, layer.color],
      [6, 'CONTINUOUS'],
    );
  }
  pairs.push([0, 'ENDTAB'], [0, 'ENDSEC']);
  return pairs;
}

function polyline(p: DxfPolyline): Pair[] {
  // R12 has no LWPOLYLINE. POLYLINE/VERTEX/SEQEND is the portable spelling.
  const pairs: Pair[] = [
    [0, 'POLYLINE'],
    [8, p.layer],
    [66, 1], // vertices follow
    [70, p.closed ? 1 : 0],
    [10, '0.0'],
    [20, '0.0'],
    [30, '0.0'],
  ];
  for (const pt of p.points) {
    pairs.push([0, 'VERTEX'], [8, p.layer], [10, m(pt.x)], [20, m(pt.y)], [30, '0.0']);
  }
  pairs.push([0, 'SEQEND'], [8, p.layer]);
  return pairs;
}

function text(t: DxfText): Pair[] {
  return [
    [0, 'TEXT'],
    [8, t.layer],
    [10, m(t.at.x)],
    [20, m(t.at.y)],
    [30, '0.0'],
    [40, t.heightM.toFixed(4)],
    // DXF R12 is not Unicode. Anything outside ASCII would be mojibake in the
    // drawing, so it is transliterated to a marker rather than written blind.
    [1, t.value.replace(/[^\x20-\x7E]/g, '?')],
  ];
}

function extentsOf(doc: DxfDocument): { min: DxfPoint; max: DxfPoint } | undefined {
  const pts = doc.polylines.flatMap((p) => p.points).concat(doc.texts.map((t) => t.at));
  const first = pts[0];
  if (!first) return undefined;
  let minX = first.x;
  let minY = first.y;
  let maxX = first.x;
  let maxY = first.y;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
}

/** Serialise a document to DXF R12 text. */
export function writeDxf(doc: DxfDocument): string {
  return (
    fmt(header(extentsOf(doc))) +
    fmt(tables(doc.layers)) +
    fmt([
      [0, 'SECTION'],
      [2, 'ENTITIES'],
    ]) +
    doc.polylines.map((p) => fmt(polyline(p))).join('') +
    doc.texts.map((t) => fmt(text(t))).join('') +
    fmt([
      [0, 'ENDSEC'],
      [0, 'EOF'],
    ])
  );
}

// ---------------------------------------------------------------------------
// The site drawing
// ---------------------------------------------------------------------------

/** Layer names, fixed so a receiving CAD standard can map them once. */
export const LAYER = {
  PLOT: 'ENV-PLOT-BOUNDARY',
  SETBACK: 'ENV-SETBACK-LINE',
  PODIUM: 'ENV-ENVELOPE-PODIUM',
  TOWER: 'ENV-ENVELOPE-TOWER',
  ASSUMED: 'ENV-ASSUMED',
  TEXT: 'ENV-ANNOTATION',
  /**
   * The parking level, on four layers rather than one.
   *
   * A reviewer's first move on receiving this file is to switch things off:
   * bays off to check the aisle runs, ramp off to see what it costs, access off
   * to argue with the placement. One `ENV-PARKING` layer would make all four
   * arguments happen at once.
   */
  PARKING_BAY: 'ENV-PARKING-BAY',
  PARKING_AISLE: 'ENV-PARKING-AISLE',
  PARKING_RAMP: 'ENV-PARKING-RAMP',
  ACCESS: 'ENV-VEHICLE-ACCESS',
} as const;

export interface SiteDrawingInput {
  readonly plot: readonly DxfPoint[];
  readonly setbackLine?: readonly DxfPoint[];
  readonly podiumFootprint?: readonly DxfPoint[];
  readonly towerFootprint?: readonly DxfPoint[];
  /**
   * Rings whose position rests on an assumption rather than a cited rule.
   * Drawn on their own layer so the distinction is not lost on export.
   */
  readonly assumedRings?: readonly (readonly DxfPoint[])[];
  readonly annotations?: readonly { readonly at: DxfPoint; readonly value: string }[];
  /**
   * The parking level, as drawn rectangles.
   *
   * Taken as four separate lists rather than as one list of tagged shapes so
   * that the layer assignment lives here, in the drawing standard, instead of
   * in whichever caller happened to build the export. The client reads these
   * files in AutoCAD; the layer names are the only part of the format he will
   * ever configure, and they should be decided once.
   */
  readonly parking?: {
    readonly bays?: readonly (readonly DxfPoint[])[];
    readonly aisles?: readonly (readonly DxfPoint[])[];
    readonly ramps?: readonly (readonly DxfPoint[])[];
    /**
     * The driveway opening: the stretch of boundary the engine chose, as an OPEN
     * polyline on its own layer. It used to arrive as a closed four-point "throat"
     * one metre deep, built by the caller by adding a metre to y — which is north
     * whatever the edge's orientation, so on any edge that was not a southern
     * boundary the throat stood outside the plot or lay along the edge instead of
     * across it. A shape the engine never computed, in a file whose one promise is
     * that it draws what the engine placed. The layer is what makes it selectable.
     */
    readonly access?: readonly (readonly DxfPoint[])[];
  };
}

/**
 * Build the site drawing: boundary, setback line, and the resulting envelope.
 *
 * This is the "2D" the client asked for when he was shown the affection plan and
 * asked whether software could read it and draw the result — his own answer to
 * "2D or 3D?" was "2D", because the setback line on the plot is the thing he
 * would check first.
 */
export function siteDrawing(input: SiteDrawingInput): DxfDocument {
  const polylines: DxfPolyline[] = [{ layer: LAYER.PLOT, points: input.plot, closed: true }];
  if (input.setbackLine) {
    polylines.push({ layer: LAYER.SETBACK, points: input.setbackLine, closed: true });
  }
  if (input.podiumFootprint) {
    polylines.push({ layer: LAYER.PODIUM, points: input.podiumFootprint, closed: true });
  }
  if (input.towerFootprint) {
    polylines.push({ layer: LAYER.TOWER, points: input.towerFootprint, closed: true });
  }
  for (const ring of input.assumedRings ?? []) {
    polylines.push({ layer: LAYER.ASSUMED, points: ring, closed: true });
  }

  const parking = input.parking;
  for (const r of parking?.bays ?? []) {
    polylines.push({ layer: LAYER.PARKING_BAY, points: r, closed: true });
  }
  for (const r of parking?.aisles ?? []) {
    polylines.push({ layer: LAYER.PARKING_AISLE, points: r, closed: true });
  }
  for (const r of parking?.ramps ?? []) {
    polylines.push({ layer: LAYER.PARKING_RAMP, points: r, closed: true });
  }
  for (const r of parking?.access ?? []) {
    polylines.push({ layer: LAYER.ACCESS, points: r, closed: false });
  }

  return {
    layers: [
      { name: LAYER.PLOT, color: DxfColor.BOUNDARY },
      { name: LAYER.SETBACK, color: DxfColor.DERIVED },
      { name: LAYER.PODIUM, color: DxfColor.ENVELOPE },
      { name: LAYER.TOWER, color: DxfColor.ENVELOPE },
      { name: LAYER.ASSUMED, color: DxfColor.ASSUMED },
      { name: LAYER.TEXT, color: DxfColor.ANNOTATION },
      { name: LAYER.PARKING_BAY, color: DxfColor.ENVELOPE },
      { name: LAYER.PARKING_AISLE, color: DxfColor.DERIVED },
      // The ramp carries the assumed colour deliberately: only its plan area is
      // reserved. Gradient, transitions and headroom under B.7.2.2 are not
      // assessed, and a ramp drawn in the same ink as a cited setback would
      // claim they were.
      { name: LAYER.PARKING_RAMP, color: DxfColor.ASSUMED },
      { name: LAYER.ACCESS, color: DxfColor.BOUNDARY },
    ],
    polylines,
    texts: (input.annotations ?? []).map((a) => ({
      layer: LAYER.TEXT,
      at: a.at,
      heightM: 0.5,
      value: a.value,
    })),
  };
}

/**
 * The disclaimer block every exported drawing carries.
 *
 * The same sentence the report and the screen carry. A DXF is the output most
 * likely to be detached from its context — forwarded, x-reffed into a submission
 * set, printed — so the claim it does *not* make travels inside it.
 */
export function disclaimerText(at: DxfPoint): DxfText {
  return {
    layer: LAYER.TEXT,
    at,
    heightM: 0.4,
    value:
      'REGULATORY VALIDITY: NOT ASSESSED. Generated capacity study, not a submission drawing.',
  };
}

/** Metres to kernel millimetres, for callers building rings from metre input. */
export function pointFromMetres(x: Decimal | number, y: Decimal | number): DxfPoint {
  const toMm = (v: Decimal | number): Mm =>
    Math.round(new Decimal(v as never).times(1000).toNumber()) as Mm;
  return { x: toMm(x), y: toMm(y) };
}
