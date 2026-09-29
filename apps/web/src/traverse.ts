/**
 * A plot entered the way it is written on an affection plan: edge by edge.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS.
 *
 * The form took a frontage and a depth, and the client's second point was that
 * real plots are not rectangles — *«الاراضي عموما كتير بتكون فيها كذا مقاس و
 * كسور و كيرفات مش بتكون مستطيلله او مربعه بس»*. The engine was never the
 * limitation: `Plot.ring` has always been an arbitrary closed ring and the API
 * has always accepted three or more vertices. Only the way in was a rectangle.
 *
 * ---------------------------------------------------------------------------
 * A TRAVERSE, NOT COORDINATES, AND THAT IS THE WHOLE DESIGN.
 *
 * `PlotForm.tsx` opens with the reason: an architect holds a document stating
 * dimensions and bearings, not survey coordinates, and hand-tracing a plot on a
 * satellite tile lands 2–5% off — which trips the very area check the tracing
 * was meant to satisfy. So the input is the document's own numbers: for each
 * boundary, how long it is and which way it runs. The corners are computed.
 *
 * THE BEARING IS THE DIRECTION OF TRAVEL, not the outward normal. `Plot.edges`
 * stores the outward normal, and the two differ by 90°; the engine computes it
 * from the ring. Asking a reader for a normal would be asking them to do that
 * subtraction in their head against a convention they have never been told.
 *
 * ---------------------------------------------------------------------------
 * THE MISCLOSE IS REPORTED AND NEVER ADJUSTED.
 *
 * A traverse of N boundaries is N lengths and N bearings, and walking them
 * rarely lands exactly back on the first corner. Every survey package offers to
 * distribute that residue across the legs — Bowditch, Crandall, transit — and
 * every one of them CHANGES NUMBERS A PERSON TYPED, quietly, to make a figure
 * look clean. This product does not do that anywhere else and does not start
 * here.
 *
 * So the polygon submitted is the corners as walked, closed by returning the
 * last one to the first. When the traverse does not close, that last boundary is
 * therefore drawn at a length that differs from the one entered — and `lastLegM`
 * says so, beside the number that was typed, in words. The reader decides what
 * to do about it; nothing decides for them.
 *
 * AND NO TOLERANCE IS INVENTED HERE. A surveyor's 1:5000 is a professional
 * standard, not a rule of this product, and a threshold nobody cited would be a
 * hidden default in the one file that exists because rectangles were a hidden
 * assumption. The misclose is a measurement, printed. What already refuses is
 * the check that was there before: the computed area against the area the
 * affection plan prints.
 */

import { Decimal } from '@envelope/core';

/** One boundary as the document states it: how long, and which way it runs. */
export interface TraverseLeg {
  /** Metres, as typed. */
  readonly lengthM: string;
  /** Degrees clockwise from grid north, as typed. The direction of travel. */
  readonly bearingDeg: string;
}

export interface Corner {
  readonly x: string;
  readonly y: string;
}

export interface TraverseResult {
  /** The corners, in walk order. Closed by implication: the last returns to the first. */
  readonly corners: readonly Corner[];
  /** Metres from the walked end back to the first corner. `'0.000'` when it closes. */
  readonly miscloseM: string;
  /**
   * The surveyor's closure ratio, as the `N` in `1 in N` — perimeter over
   * misclose, rounded down. `null` when the traverse closes exactly, because
   * `1 in ∞` is a sentence and not a number.
   */
  readonly closureRatio: string | null;
  /**
   * What each boundary actually measures on the polygon that will be submitted.
   *
   * Identical to the lengths entered, except for the last, which closes the ring
   * back to the first corner. A form that printed the typed length beside a
   * drawing of a different length would be labelling the drawing with a number
   * that is not in it.
   */
  readonly drawnLengthsM: readonly string[];
  /**
   * What the last boundary actually measures once the ring is closed, against
   * the length that was entered for it. Equal when the traverse closes.
   */
  readonly lastLegM: string;
  readonly perimeterM: string;
  /** Shoelace over the corners. Metres squared, two places. */
  readonly areaM2: string;
  /** Every leg parses, is positive, and has a bearing in range. */
  readonly usable: boolean;
}

const PI = Decimal.acos(-1);

/** Metres are sent to the API as decimal strings and land on the 1 mm grid. */
const MM = 3;

/**
 * A metre figure on the millimetre, with negative zero written as zero.
 *
 * `cos(90 degrees)` against an irrational pi lands a fraction BELOW zero, so a
 * boundary running due east put its corner at `-0.000`. It parses back to the
 * same point and the plot is identical - but the string is what the API
 * receives, what the drawing prints and what a reader compares against a
 * document, and a minus sign in front of a zero reads as a measurement rather
 * than as an artefact of arithmetic.
 */
const metres = (d: Decimal): string => {
  const rounded = d.toDecimalPlaces(MM);
  return (rounded.isZero() ? new Decimal(0) : rounded).toFixed(MM);
};

const parse = (value: string): Decimal | null => {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  try {
    const d = new Decimal(trimmed);
    return d.isFinite() ? d : null;
  } catch {
    return null;
  }
};

/**
 * Walk the legs from the origin and report where they land.
 *
 * A leg that does not parse, is not positive, or carries a bearing outside
 * 0–360 makes the whole traverse unusable rather than being skipped: a boundary
 * quietly dropped from a plot is a different plot, drawn convincingly.
 */
export function walkTraverse(legs: readonly TraverseLeg[]): TraverseResult {
  const parsed = legs.map((leg) => ({
    length: parse(leg.lengthM),
    bearing: parse(leg.bearingDeg),
  }));

  const usable =
    legs.length >= 3 &&
    parsed.every(
      (p) =>
        p.length !== null &&
        p.length.gt(0) &&
        p.bearing !== null &&
        p.bearing.gte(0) &&
        p.bearing.lte(360),
    );

  const corners: Corner[] = [];
  let x = new Decimal(0);
  let y = new Decimal(0);
  let perimeter = new Decimal(0);

  for (const leg of parsed) {
    corners.push({ x: metres(x), y: metres(y) });
    const length = leg.length ?? new Decimal(0);
    const bearing = leg.bearing ?? new Decimal(0);
    const rad = bearing.times(PI).div(180);
    // Clockwise from north: north is +y, and a bearing of 90 runs due east.
    x = x.plus(length.times(Decimal.sin(rad)));
    y = y.plus(length.times(Decimal.cos(rad)));
    perimeter = perimeter.plus(length);
  }

  /*
    THE CORNERS ARE ROUNDED TO THE MILLIMETRE BEFORE ANYTHING IS MEASURED OFF
    THEM, because those rounded strings are what the API receives and what the
    kernel puts on its 1 mm grid. Measuring the misclose against the unrounded
    walk would print a closure the stored plot does not have — a figure right in
    this file and wrong in the one place it is checked.
  */
  const fixed = corners.map((c) => ({ x: new Decimal(c.x), y: new Decimal(c.y) }));
  const first = fixed[0] ?? { x: new Decimal(0), y: new Decimal(0) };
  const end = { x: new Decimal(metres(x)), y: new Decimal(metres(y)) };

  const dx = end.x.minus(first.x);
  const dy = end.y.minus(first.y);
  const misclose = dx.times(dx).plus(dy.times(dy)).sqrt();

  const drawn = fixed.map((a, i) => {
    const b = fixed[(i + 1) % fixed.length] ?? a;
    const ex = b.x.minus(a.x);
    const ey = b.y.minus(a.y);
    return metres(ex.times(ex).plus(ey.times(ey)).sqrt());
  });

  return {
    corners,
    miscloseM: metres(misclose),
    closureRatio: misclose.isZero() ? null : perimeter.div(misclose).floor().toFixed(0),
    drawnLengthsM: drawn,
    lastLegM: drawn[drawn.length - 1] ?? '0.000',
    perimeterM: metres(perimeter),
    areaM2: shoelaceM2(fixed),
    usable,
  };
}

/** Twice the signed area, halved and made positive. Two places, as the form prints areas. */
function shoelaceM2(ring: readonly { x: Decimal; y: Decimal }[]): string {
  let twice = new Decimal(0);
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % n]!;
    twice = twice.plus(a.x.times(b.y).minus(b.x.times(a.y)));
  }
  return twice.div(2).abs().toFixed(2);
}

/**
 * The four legs of a rectangle, for the moment a reader switches to edge entry.
 *
 * Walked anticlockwise from the south-west corner, which is the ring the form
 * has always sent: east along the frontage, north up the side, west back, south
 * home. The server orients whatever it receives, so this is a courtesy rather
 * than a requirement — it means the first thing a reader sees after switching is
 * the rectangle they had, with its numbers in the boxes.
 */
export function rectangleLegs(widthM: string, depthM: string): readonly TraverseLeg[] {
  return [
    { lengthM: widthM, bearingDeg: '90' },
    { lengthM: depthM, bearingDeg: '0' },
    { lengthM: widthM, bearingDeg: '270' },
    { lengthM: depthM, bearingDeg: '180' },
  ];
}
