/**
 * The plot's own shape, read off the site plan.
 *
 * WHAT THE SHEET TURNED OUT TO CARRY. The drawing panel of an affection plan
 * holds no text and no vector path — the whole site plan is ONE RASTER IMAGE,
 * which is why a text extractor finds "All dimensions are in Meters" and then
 * nothing dimensioned. Inside that image the sheet draws its subject plot as a
 * flat yellow fill with a red outline, its neighbours as thin blue lines, roads
 * in grey, and a UTM grid labelled at the corners (`507900 E`, `2783030 N` — the
 * engine's own CRS, zone 40N). On the three sheets on file the image is the same
 * size, with the same palette, from the same generator.
 *
 * So the shape is recoverable, and recovering it answers the question the client
 * asked twice: the plot the engine draws should be the plot on his affection
 * plan, at its angles and its dimensions, rather than a rectangle somebody typed
 * two numbers into.
 *
 * THE METHOD, AND WHERE EACH NUMBER COMES FROM.
 *
 *   - The SHAPE is the sheet's own ink. The subject pixels are hulled, the hull
 *     is cut into straight runs, a total-least-squares line is fitted to each
 *     run, and adjacent lines are intersected for the corners. A corner is
 *     therefore the meeting of two fitted edges and not a staircase pixel, which
 *     is worth 10–15 cm on a 50 m boundary — the difference between a drawing
 *     that reconciles with the sheet and one that nearly does.
 *
 *   - The ANGLES are the drawing's own, and they are GRID BEARINGS rather than
 *     angles off an arbitrary axis, because the grid labels increase east to the
 *     right and north upward: the image is north-up in UTM 40N by its own
 *     printed evidence. Nothing about that is assumed.
 *
 *   - The LENGTHS come from the sheet's printed total area, because the sheet
 *     prints `Scale: NTS` and states no ratio. The outline is scaled uniformly
 *     until its area equals that figure. This is the one real assumption in the
 *     module and it is declared: it holds exactly insofar as the drawing is
 *     geometrically SIMILAR to the plot. On `IC1-CTYL-16_011` it reproduces the
 *     two dimensions the drawing itself prints — `L=50.85` and `L=26.85` — as
 *     50.73 and 26.92, within 12 cm on a 50 m run, and that check is a real one
 *     because those labels are raster text this module never reads.
 *
 * WHAT IT REFUSES, AND THE REFUSAL THAT MATTERS MOST. A convex hull is a CEILING
 * on a shape, not the shape: an L-shaped plot hulls into a rectangle larger than
 * the plot, and every length and angle on it would be wrong while looking
 * entirely plausible. So the fill is measured against its own hull, and an
 * outline whose fill does not reach {@link MIN_FILL_OF_HULL} of it is refused in
 * a sentence rather than reported convex. A plot drawn re-entrant is a plot this
 * module cannot read, which is an answer; a rectangle drawn over it is not.
 *
 * Also refused: no image in the drawing frame, fewer than three fitted edges, a
 * fit whose residual exceeds {@link MAX_FIT_RESIDUAL_PX}, and — separately and
 * without refusing the shape — a sheet that prints no total area, which leaves
 * the angles stated and every length absent. An outline with no scale is still
 * worth having; an outline with an invented one is not.
 *
 * NOTHING HERE IS GEOREFERENCED. The grid labels that would place the plot on
 * the earth are raster text, and reading them would mean recognising digits from
 * pixels — a different kind of claim, with a different failure mode, which this
 * module does not make. The shape is published; where it sits is the reader's,
 * and the map screen is where he says so.
 *
 * JSON-SAFE BY CONSTRUCTION, like `edges.ts`: no `Decimal` in the returned tree,
 * so the object the API hands the screen in process is the object it sends over
 * HTTP.
 */

import { deflateSync } from 'node:zlib';

import { type Traced, type Tracer } from '@envelope/core';

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/** One boundary of the plot as the sheet draws it. */
export interface OutlineLeg {
  /** 1-based, in the order the ring is walked. */
  readonly index: number;
  /**
   * Metres, two decimals, as a decimal string.
   *
   * Absent when the sheet states no total area: there is then no scale, and a
   * length in pixels is not a length. The bearing survives, because an angle
   * needs no scale.
   */
  readonly lengthM?: string;
  /** Degrees clockwise from grid north, two decimals. */
  readonly bearingDeg: string;
  /** The leg's length in image pixels, kept so a reader can redo the scaling. */
  readonly lengthPx: string;
}

/** How well the fitted edges sit on the ink they were fitted to. */
export interface OutlineFit {
  /** RMS distance from the hull points to their own fitted line, in pixels. */
  readonly residualPx: string;
  /** What one pixel is worth in metres, or absent with no scale. */
  readonly pixelM?: string;
  /**
   * The fill's area as a fraction of its hull's, to four decimals.
   *
   * 1.0000 is a convex plot. Anything materially below it is the re-entrant
   * shape this module refuses — published rather than merely thresholded, so a
   * reader can see how close to the edge of the refusal his plot sits.
   */
  readonly fillOfHull: string;
}

export interface PlotOutline {
  /** The ring, ASSUMED — see the module note for what rests on what. */
  readonly legs: Traced<readonly OutlineLeg[]>;
  /** Equals the sheet's printed area by construction, or absent with no scale. */
  readonly areaM2?: string;
  readonly fit: OutlineFit;
  /**
   * What moves if the extraction is off by a pixel.
   *
   * Measured, not estimated, and stated in metres and as a fraction of the
   * shortest leg — the leg a pixel of error hurts most. Prose on both fields:
   * NOT the assumption register's `{ perturbation, relativeEffect }`, whose
   * second field is a decimal string the report multiplies by 100. See
   * `edges.ts` for the same note and the defect that earned it.
   */
  readonly sensitivity: {
    readonly perturbation: string;
    readonly effect: string;
  };
  /** Said under every drawing made from this outline. */
  readonly notModelled: readonly string[];
}

/** The sheet's own picture of the plot, for a reader to lay over a map. */
export interface SitePlanImage {
  /** A PNG, base64, ready for an `image` source or an `<img src>`. */
  readonly pngBase64: string;
  readonly widthPx: number;
  readonly heightPx: number;
  /** Where the image sits on the sheet, in PDF points, for a citation. */
  readonly boxPt: readonly [number, number, number, number];
}

export interface SitePlanReading {
  readonly image?: SitePlanImage;
  readonly outline?: PlotOutline;
  /**
   * Why there is no outline, in the sheet's terms, one sentence each.
   *
   * Empty on success. A reader who gets no shape is told which of the refusals
   * he hit, because "we could not read it" and "your plot is re-entrant and this
   * reader only fits convex rings" are different facts about his plot.
   */
  readonly refusals: readonly string[];
}

export interface ReadSitePlanOptions {
  readonly documentUri: string;
  readonly issueDate: string;
  readonly tracer: Tracer;
  /**
   * The sheet's printed total area in m², as a decimal string.
   *
   * The ONLY scale available: the sheet prints `Scale: NTS`. Absent, the outline
   * is published with its angles and no lengths rather than with a guess.
   */
  readonly statedAreaSqm?: string;
}

// ---------------------------------------------------------------------------
// Constants, each with the reason it is the number it is
// ---------------------------------------------------------------------------

/*
  THE SUBJECT PLOT IS THE YELLOW ONE. That is the generator's own convention on
  every sheet on file: the plot the document is about is filled flat yellow and
  outlined red, and no other feature on the drawing uses either colour. The
  outline is included in the mask with the fill, because the red stroke IS the
  boundary — masking the fill alone would read the inside edge of a line drawn
  three pixels wide and lose a boundary's width, consistently, on every side.

  The thresholds are wide because the raster is generated rather than scanned:
  the fill is one flat colour, so anything near it is anti-aliasing at an edge.
*/
const YELLOW = { rMin: 200, gMin: 200, bMax: 100 } as const;
const RED = { rMin: 180, gMax: 90, bMax: 90 } as const;

/**
 * The smallest fill-to-hull ratio that may still be called convex.
 *
 * A true rectangle measures 1.0000. The slack is for anti-aliasing along the
 * hull and for the rounding of the fitted corners, both of which cost fractions
 * of a percent on a 2000 px image. A notched or L-shaped plot falls far below
 * this — a plot missing one quarter measures 0.75 — so the threshold does not
 * need to be delicate to do its work, and a loose one is the wrong kind of
 * wrong here.
 */
const MIN_FILL_OF_HULL = 0.97;

/** Beyond this the ink is not a polygon, and a polygon should not be reported. */
const MAX_FIT_RESIDUAL_PX = 3;

/** Below this the mask is a stray swatch — a legend key, not a plot. */
const MIN_SUBJECT_PIXELS = 5000;

/** Two hull segments within this are one straight run. Radians. */
const SAME_DIRECTION_RAD = 0.06;

/** A run shorter than this fraction of the longest is a corner, not an edge. */
const MIN_RUN_FRACTION = 0.08;

/** Metres and degrees print to the centimetre and the hundredth of a degree. */
const LENGTH_DP = 2;
const BEARING_DP = 2;

// ---------------------------------------------------------------------------
// pdfjs, loaded exactly as `pdf-text.ts` loads it
// ---------------------------------------------------------------------------

interface RasterImage {
  readonly width: number;
  readonly height: number;
  readonly kind: number;
  readonly data: Uint8Array | Uint8ClampedArray;
}

interface PdfJsOps {
  readonly save: number;
  readonly restore: number;
  readonly transform: number;
  readonly paintImageXObject: number;
}

interface PdfJsPage {
  getOperatorList(): Promise<{ fnArray: number[]; argsArray: unknown[] }>;
  readonly objs: { get(name: string, cb: (v: unknown) => void): void };
}

interface PdfJsModule {
  getDocument(src: Record<string, unknown>): {
    promise: Promise<{
      readonly numPages: number;
      getPage(n: number): Promise<PdfJsPage>;
      destroy(): Promise<void>;
    }>;
  };
  readonly OPS: PdfJsOps;
}

let cached: PdfJsModule | undefined;

async function pdfjs(): Promise<PdfJsModule> {
  // Before the import, for the same reason `pdf-text.ts` states: pdfjs
  // constructs a DOMMatrix at module level and node has none.
  const { ensureDOMMatrix } = await import('./dom-matrix.js');
  ensureDOMMatrix();
  cached ??= (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfJsModule;
  return cached;
}

// ---------------------------------------------------------------------------
// Geometry, in pixels
// ---------------------------------------------------------------------------

type Pt = readonly [number, number];
type Matrix = readonly [number, number, number, number, number, number];

function multiply(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

/** Twice the signed area, by the shoelace sum. */
function shoelace(ring: readonly Pt[]): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const p = ring[i] as Pt;
    const q = ring[(i + 1) % ring.length] as Pt;
    sum += p[0] * q[1] - q[0] * p[1];
  }
  return sum;
}

const ringArea = (ring: readonly Pt[]): number => Math.abs(shoelace(ring)) / 2;

/** Andrew's monotone chain. Counter-clockwise in a y-down raster frame. */
export function convexHull(points: readonly Pt[]): readonly Pt[] {
  if (points.length < 3) return points;
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt): number =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const chain = (src: readonly Pt[]): Pt[] => {
    const out: Pt[] = [];
    for (const p of src) {
      while (out.length >= 2 && cross(out[out.length - 2] as Pt, out[out.length - 1] as Pt, p) <= 0) {
        out.pop();
      }
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...chain(sorted), ...chain([...sorted].reverse())];
}

interface FittedLine {
  readonly through: Pt;
  readonly direction: Pt;
  readonly points: readonly Pt[];
}

/**
 * The line of best fit through a run of hull points, by total least squares.
 *
 * TOTAL least squares, not the ordinary kind: a boundary running near-vertical
 * has no `y = mx + c` and an ordinary fit blows up on it. The principal axis of
 * the points' own scatter has no preferred direction and handles every bearing
 * the same way, which a plot boundary needs — three of the four edges on
 * `DJAZ1TRE10RES022` are steeper than 45°.
 */
function fitLine(points: readonly Pt[]): FittedLine {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p[0], 0) / n;
  const my = points.reduce((s, p) => s + p[1], 0) / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of points) {
    const dx = p[0] - mx;
    const dy = p[1] - my;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return { through: [mx, my], direction: [Math.cos(theta), Math.sin(theta)], points };
}

/** Where two fitted lines meet, or null when they are parallel. */
function intersect(a: FittedLine, b: FittedLine): Pt | null {
  const det = a.direction[0] * -b.direction[1] - a.direction[1] * -b.direction[0];
  if (Math.abs(det) < 1e-9) return null;
  const rx = b.through[0] - a.through[0];
  const ry = b.through[1] - a.through[1];
  const t = (rx * -b.direction[1] - ry * -b.direction[0]) / det;
  return [a.through[0] + t * a.direction[0], a.through[1] + t * a.direction[1]];
}

/** Perpendicular distance from a point to a fitted line. */
function distanceTo(line: FittedLine, p: Pt): number {
  const dx = p[0] - line.through[0];
  const dy = p[1] - line.through[1];
  return Math.abs(dx * line.direction[1] - dy * line.direction[0]);
}

/**
 * Cut a hull into straight runs, one per boundary of the plot.
 *
 * A break is declared where the direction turns; the runs between breaks are the
 * edges. Short runs are dropped before fitting, because the hull of a raster
 * puts two- and three-pixel steps at every corner and each of those is a
 * perfectly straight run of its own — fitting them would give a twelve-sided
 * rectangle, which is what the first version of this did.
 */
export function straightRuns(hull: readonly Pt[]): readonly (readonly Pt[])[] {
  const n = hull.length;
  if (n < 3) return [];
  const direction = (a: Pt, b: Pt): number => Math.atan2(b[1] - a[1], b[0] - a[0]);
  const sameWay = (u: number, v: number): boolean => {
    let d = Math.abs(u - v) % (2 * Math.PI);
    if (d > Math.PI) d = 2 * Math.PI - d;
    return d < SAME_DIRECTION_RAD;
  };

  const breaks: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const a = hull[i] as Pt;
    const b = hull[(i + 1) % n] as Pt;
    const c = hull[(i + 2) % n] as Pt;
    if (!sameWay(direction(a, b), direction(b, c))) breaks.push((i + 1) % n);
  }
  if (breaks.length < 2) return [hull];

  const runs: Pt[][] = [];
  for (let b = 0; b < breaks.length; b += 1) {
    const from = breaks[b] as number;
    const to = breaks[(b + 1) % breaks.length] as number;
    const run: Pt[] = [];
    for (let i = from; ; i = (i + 1) % n) {
      run.push(hull[i] as Pt);
      if (i === to) break;
    }
    runs.push(run);
  }

  const span = (run: readonly Pt[]): number => {
    const a = run[0] as Pt;
    const b = run[run.length - 1] as Pt;
    return Math.hypot(b[0] - a[0], b[1] - a[1]);
  };
  const longest = Math.max(...runs.map(span));
  return runs.filter((r) => r.length >= 2 && span(r) >= MIN_RUN_FRACTION * longest);
}

// ---------------------------------------------------------------------------
// The raster
// ---------------------------------------------------------------------------

/** Whether a pixel is the subject plot's own ink. */
function isSubject(r: number, g: number, b: number): boolean {
  const yellow = r >= YELLOW.rMin && g >= YELLOW.gMin && b <= YELLOW.bMax;
  const red = r >= RED.rMin && g <= RED.gMax && b <= RED.bMax;
  return yellow || red;
}

/** Channel count for the three pixel layouts pdfjs decodes to. */
function bytesPerPixel(kind: number): number {
  // 1 = GRAYSCALE_1BPP, 2 = RGB_24BPP, 3 = RGBA_32BPP.
  return kind === 3 ? 4 : kind === 2 ? 3 : 0;
}

function subjectPixels(image: RasterImage): readonly Pt[] {
  const bpp = bytesPerPixel(image.kind);
  // A one-bit mask carries no colour, so it cannot hold a yellow plot. Refused
  // by returning nothing rather than by reading a grey pixel as a boundary.
  if (bpp === 0) return [];
  const out: Pt[] = [];
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const s = (y * image.width + x) * bpp;
      if (isSubject(image.data[s] ?? 0, image.data[s + 1] ?? 0, image.data[s + 2] ?? 0)) {
        out.push([x, y]);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// PNG, written here because the alternative is a dependency
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = -1;
  for (const b of bytes) c = (CRC_TABLE[(c ^ b) & 0xff] as number) ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type: string, body: Uint8Array): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length);
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

/**
 * The decoded raster as an 8-bit RGB PNG.
 *
 * Written by hand over `node:zlib` rather than by adding an encoder, and the
 * trade is worth naming: this is forty lines of a format that has not changed
 * since 1996, against a dependency in the one package that reads a file a
 * stranger uploaded. Filter type 0 on every row — a line drawing of flat colours
 * deflates to a twentieth of its size without one, and a filter that helped
 * would be a filter whose choice this module would have to defend.
 */
export function encodePng(image: RasterImage): Buffer {
  const bpp = bytesPerPixel(image.kind);
  if (bpp === 0) throw new Error(`cannot encode a pixel layout of kind ${image.kind}`);
  const { width, height, data } = image;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y += 1) {
    raw[o] = 0;
    o += 1;
    for (let x = 0; x < width; x += 1) {
      const s = (y * width + x) * bpp;
      raw[o] = data[s] ?? 0;
      raw[o + 1] = data[s + 1] ?? 0;
      raw[o + 2] = data[s + 2] ?? 0;
      o += 3;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

interface Placement {
  readonly name: string;
  readonly widthPt: number;
  readonly heightPt: number;
  readonly x: number;
  readonly y: number;
}

/** Every image placed on the page, with the box the CTM puts it in. */
function placements(ops: { fnArray: number[]; argsArray: unknown[] }, OPS: PdfJsOps): Placement[] {
  const out: Placement[] = [];
  const stack: Matrix[] = [];
  let ctm: Matrix = [1, 0, 0, 1, 0, 0];
  for (let i = 0; i < ops.fnArray.length; i += 1) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i];
    if (fn === OPS.save) {
      stack.push(ctm);
    } else if (fn === OPS.restore) {
      ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
    } else if (fn === OPS.transform && Array.isArray(args) && args.length >= 6) {
      ctm = multiply(ctm, args as unknown as Matrix);
    } else if (fn === OPS.paintImageXObject && Array.isArray(args)) {
      const name = args[0];
      if (typeof name === 'string') {
        out.push({
          name,
          widthPt: Math.hypot(ctm[0], ctm[1]),
          heightPt: Math.hypot(ctm[2], ctm[3]),
          x: ctm[4],
          y: ctm[5],
        });
      }
    }
  }
  return out;
}

const round = (n: number, dp: number): string => n.toFixed(dp);

/**
 * Grid bearing of a leg, in a y-down image frame.
 *
 * Image up is grid north, by the sheet's own corner labels: easting increases to
 * the right and northing upward. So `-dy` is the northward component and the
 * bearing is the clockwise angle from it, which is what a surveyor's traverse
 * takes and what `walkTraverse` in the web app consumes unchanged.
 */
function bearingOf(from: Pt, to: Pt): number {
  const deg = (Math.atan2(to[0] - from[0], -(to[1] - from[1])) * 180) / Math.PI;
  return (deg + 360) % 360;
}

function outlineFrom(
  corners: readonly Pt[],
  lines: readonly FittedLine[],
  fillOfHull: number,
  opts: ReadSitePlanOptions,
): { outline?: PlotOutline; refusals: readonly string[] } {
  const refusals: string[] = [];

  if (corners.length < 3) {
    refusals.push(
      `The drawing's boundary resolved into ${corners.length} straight edge(s), and a ` +
        `plot needs three. No outline is reported.`,
    );
    return { refusals };
  }

  if (fillOfHull < MIN_FILL_OF_HULL) {
    refusals.push(
      `The plot is drawn re-entrant: its fill covers ${(fillOfHull * 100).toFixed(1)}% of its ` +
        `own convex hull, and this reader fits convex rings only. A hull would report a ` +
        `larger plot than the sheet draws, with every length and angle on it wrong, so no ` +
        `outline is reported. Enter the boundaries from the sheet's own dimensions instead.`,
    );
    return { refusals };
  }

  let worst = 0;
  let sum = 0;
  let count = 0;
  for (const line of lines) {
    for (const p of line.points) {
      const d = distanceTo(line, p);
      sum += d * d;
      count += 1;
      worst = Math.max(worst, d);
    }
  }
  const residualPx = count > 0 ? Math.sqrt(sum / count) : 0;
  if (residualPx > MAX_FIT_RESIDUAL_PX) {
    refusals.push(
      `The boundary does not sit on straight lines — the fitted edges miss the drawn ones by ` +
        `${residualPx.toFixed(1)} pixels on average, against a limit of ${MAX_FIT_RESIDUAL_PX}. ` +
        `A curved or stepped boundary is not a polygon and is not reported as one.`,
    );
    return { refusals };
  }

  const areaPx2 = ringArea(corners);
  const stated = opts.statedAreaSqm;
  const statedArea = stated === undefined ? undefined : Number(stated);
  const scale =
    statedArea !== undefined && Number.isFinite(statedArea) && statedArea > 0 && areaPx2 > 0
      ? Math.sqrt(statedArea / areaPx2)
      : undefined;

  if (scale === undefined) {
    refusals.push(
      `The sheet prints no total area, and it prints "Scale: NTS", so the drawing carries no ` +
        `ratio either. The angles below are the drawing's own; no length is stated, because ` +
        `there is nothing to scale it by.`,
    );
  }

  const legs: OutlineLeg[] = corners.map((from, i) => {
    const to = corners[(i + 1) % corners.length] as Pt;
    const lengthPx = Math.hypot(to[0] - from[0], to[1] - from[1]);
    return {
      index: i + 1,
      ...(scale !== undefined ? { lengthM: round(lengthPx * scale, LENGTH_DP) } : {}),
      bearingDeg: round(bearingOf(from, to), BEARING_DP),
      lengthPx: round(lengthPx, 1),
    };
  });

  const shortestPx = Math.min(...legs.map((l) => Number(l.lengthPx)));
  const basis =
    `Read from the site-plan image on the affection plan, not from a dimension table — the ` +
    `sheet's drawing panel holds no text and no vector path. The subject plot is the sheet's ` +
    `own yellow fill with its red outline; a line is fitted to each straight run of that ` +
    `boundary and adjacent lines are intersected for the corners. The angles are the ` +
    `drawing's own and are GRID bearings: the sheet's corner labels put easting to the right ` +
    `and northing up, so the image is north-up in UTM 40N. ` +
    (scale === undefined
      ? `No length is stated: the sheet prints "Scale: NTS" and no total area, so there is ` +
        `nothing to scale the drawing by.`
      : `The sheet prints "Scale: NTS", so the drawing is scaled uniformly until its area ` +
        `equals the ${stated ?? ''} m² the sheet states. A length is right only insofar as ` +
        `the drawing is geometrically similar to the plot. Check one against a dimension ` +
        `printed on the drawing before building on it.`) +
    ` Proposed, not read: confirm it before it governs anything.`;

  const outline: PlotOutline = {
    legs: opts.tracer.assumed('affection_plan.plot_outline', legs as readonly OutlineLeg[], {
      basis,
      label: 'Plot outline, from the site plan',
      detail: {
        method: 'hull → straight runs → total-least-squares lines → corner intersections',
        edges: corners.length,
        documentUri: opts.documentUri,
        instrumentVersion: opts.issueDate,
      },
    }),
    ...(scale !== undefined && statedArea !== undefined
      ? { areaM2: round(statedArea, LENGTH_DP) }
      : {}),
    fit: {
      residualPx: round(residualPx, 2),
      ...(scale !== undefined ? { pixelM: round(scale, 4) } : {}),
      fillOfHull: round(fillOfHull, 4),
    },
    sensitivity: {
      perturbation: 'the fitted boundary is one pixel out, in or out, on every edge',
      effect:
        (scale === undefined
          ? `Not stated in metres, because the drawing carries no scale. In the drawing's ` +
            `own terms one pixel is ${(100 / shortestPx).toFixed(2)}% of the shortest leg.`
          : `One pixel is ${round(scale, 4)} m, so ±${round(scale, 3)} m on any length and ` +
            `${(100 / shortestPx).toFixed(2)}% of the shortest leg.`) +
        ` The area does not move at all: it is held to the sheet's printed figure by ` +
        `construction, so a pixel of error redistributes between the legs rather than ` +
        `changing the total — which is why the area is the wrong number to check this ` +
        `extraction with, and a dimension printed on the drawing is the right one.`,
    },
    notModelled: [
      'No boundary is georeferenced. The grid coordinates printed on the drawing are part ' +
        'of the image and are not read, so this outline has a shape and no position.',
      'No boundary is classified. Which edge faces a road is read separately, from the ' +
        "sheet's setback wording, and is proposed rather than read.",
      'A curved boundary is fitted as a straight one. The fit residual above is how far the ' +
        'drawn ink sits from the lines reported.',
    ],
  };

  return { outline, refusals };
}

/**
 * Read the site plan: the sheet's own picture, and the plot's shape from it.
 *
 * Returns `{ refusals }` with no image where the sheet has no drawing to read —
 * a scan, a sheet whose plan is vector, or a first page that is a cover. Never
 * throws for a sheet it cannot read: an affection plan the engine cannot
 * photograph is still an affection plan, and `blockingGaps()` is where a run is
 * stopped, not here.
 */
export async function readSitePlan(
  bytes: Uint8Array,
  opts: ReadSitePlanOptions,
): Promise<SitePlanReading> {
  const mod = await pdfjs();
  // Copied, as `readPdfText` copies: pdfjs neuters the buffer it is handed, and
  // this is the second read of the same upload.
  const doc = await mod.getDocument({
    data: Uint8Array.from(bytes),
    isEvalSupported: false,
  }).promise;

  try {
    if (doc.numPages < 1) return { refusals: ['The document has no pages.'] };
    const page = await doc.getPage(1);
    const ops = await page.getOperatorList();
    const placed = placements(ops, mod.OPS);
    if (placed.length === 0) {
      return {
        refusals: [
          'The sheet places no image on its first page, so there is no site plan to read. ' +
            'A sheet whose plan is drawn in vector is not read by this module.',
        ],
      };
    }

    /* The site plan is the largest image on the sheet by a wide margin — on the
       three on file it fills the drawing frame exactly, at 540×450 pt against
       271 pt for the location maps beside it. Largest wins; a sheet where it did
       not would fail the colour test below rather than report somebody's logo. */
    const biggest = [...placed].sort(
      (a, b) => b.widthPt * b.heightPt - a.widthPt * a.heightPt,
    )[0] as Placement;

    const raster = await new Promise<RasterImage | undefined>((resolve) => {
      try {
        page.objs.get(biggest.name, (v) => resolve(v as RasterImage | undefined));
      } catch {
        resolve(undefined);
      }
    });
    if (!raster || bytesPerPixel(raster.kind) === 0) {
      return {
        refusals: [
          'The sheet places an image this reader cannot decode into colour, so the subject ' +
            'plot cannot be told from its neighbours.',
        ],
      };
    }

    const image: SitePlanImage = {
      pngBase64: encodePng(raster).toString('base64'),
      widthPx: raster.width,
      heightPx: raster.height,
      boxPt: [
        biggest.x,
        biggest.y,
        biggest.x + biggest.widthPt,
        biggest.y + biggest.heightPt,
      ],
    };

    const pixels = subjectPixels(raster);
    if (pixels.length < MIN_SUBJECT_PIXELS) {
      return {
        image,
        refusals: [
          `The drawing holds ${pixels.length} pixel(s) of the colour the sheets use for their ` +
            `subject plot, which is too few to be one. The picture is still shown; no shape ` +
            `is read from it.`,
        ],
      };
    }

    const hull = convexHull(pixels);
    const runs = straightRuns(hull);
    const lines = runs.map(fitLine);
    const corners: Pt[] = [];
    for (let i = 0; i < lines.length; i += 1) {
      const meet = intersect(lines[i] as FittedLine, lines[(i + 1) % lines.length] as FittedLine);
      if (meet) corners.push(meet);
    }

    const hullArea = ringArea(hull);
    const fillOfHull = hullArea > 0 ? pixels.length / hullArea : 0;
    const { outline, refusals } = outlineFrom(corners, lines, fillOfHull, opts);
    return { image, ...(outline ? { outline } : {}), refusals };
  } finally {
    await doc.destroy();
  }
}
