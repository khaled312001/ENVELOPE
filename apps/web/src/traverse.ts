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
 * ---------------------------------------------------------------------------
 * A CURVE IS A LENGTH, A DIRECTION AND A RADIUS — NEVER A DRAGGED HANDLE.
 *
 * The other half of the same sentence is *«و كيرفات»*. A boundary on a
 * roundabout or a cul-de-sac head is an arc, and the sheet prints it as a
 * radius. So a leg keeps the chord's length and bearing — the two corners do
 * not move — and adds the radius and the side it bows toward. Everything else
 * about the curve is derived here and shown: its length along the curve, how
 * far it leaves the chord, and the area it adds to or takes from the polygon.
 *
 * The side is asked for as a word, not a sign. `bulge = tan(sweep / 4)` is what
 * the engine stores and a signed number is what a reader inverts silently.
 *
 * ---------------------------------------------------------------------------
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
  /** Metres, as typed. On a curved boundary this is the chord. */
  readonly lengthM: string;
  /** Degrees clockwise from grid north, as typed. The direction of travel. */
  readonly bearingDeg: string;
  /**
   * Which way the boundary bows, as somebody walking it would say it. Empty
   * where it is straight, which is every boundary until a reader says otherwise.
   */
  readonly curve?: '' | 'right' | 'left';
  /** Metres, as typed. Read only where `curve` says the boundary bends. */
  readonly radiusM?: string;
}

/** Why a curve as entered cannot be drawn. Codes, so the words stay in the dictionary. */
export type ArcRefusal = 'no-radius' | 'radius-too-small' | 'too-gentle';

/** The run of `TraverseResult.drawnRing` that one boundary occupies. */
export interface RingSpan {
  readonly from: number;
  readonly count: number;
}

/** What a radius and a chord imply, for the reader to check against the sheet. */
export interface LegArc {
  /** Along the curve. Longer than the chord, and the figure a sheet prints. */
  readonly arcLengthM: string;
  /** How far the boundary leaves its chord at the crown. */
  readonly riseM: string;
  readonly sweepDeg: string;
  /** Signed. Metres² the curve adds to the polygon its corners describe. */
  readonly areaM2: string;
  readonly refusal: ArcRefusal | null;
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
  /**
   * The area of the plot that will be submitted: shoelace over the corners,
   * plus the circular segment of every curved boundary.
   *
   * Not the polygon's area. A curve that adds four square metres and a screen
   * that reports the chord's area would disagree with the engine about the one
   * figure the affection plan is checked against.
   */
  readonly areaM2: string;
  /** One entry per leg, or `null` where the boundary is straight. */
  readonly arcs: readonly (LegArc | null)[];
  /**
   * The corners with every curve broken into straight pieces — what the drawing
   * strokes, and what the engine will store.
   *
   * It is NOT what the form submits. The API receives the corners and the
   * radius, and tessellates from those itself; a browser that sent the polygon
   * would be deciding the shape of a boundary and then asking the server to
   * agree with it.
   */
  readonly drawnRing: readonly Corner[];
  /** Which run of `drawnRing` each leg occupies, in leg order. */
  readonly spans: readonly RingSpan[];
  /**
   * Every leg parses, is positive, has a bearing in range, and — where it is
   * curved — has a radius that can actually span it.
   */
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

  /*
    THE CURVE SITS ON THE CHORD THAT WILL BE DRAWN, not the one that was typed.

    They differ on the last boundary of a traverse that does not close, and only
    there. Resolving a radius against the entered length would put the arc on a
    chord the polygon does not contain, and the crown of the curve would miss
    the corner it is supposed to meet by exactly the misclose.
  */
  const arcs = legs.map((leg, i) => resolveArc(leg, new Decimal(drawn[i] ?? '0')));

  /*
    WHICH WAY THE RING IS WOUND DECIDES WHAT A CURVE DOES TO ITS AREA.

    Bowing to the right of travel is outward on a ring walked anticlockwise and
    inward on one walked clockwise — the same boundary, the same radius, the
    opposite sign. A reader may walk their plot either way, so the winding is
    measured here rather than assumed, and the sign follows it.
  */
  const anticlockwise = signedShoelace(fixed).isPositive();
  let area = signedShoelace(fixed).abs();
  for (const [i, arc] of arcs.entries()) {
    if (arc === null || arc.refusal !== null) continue;
    const outward = (legs[i]?.curve === 'right') === anticlockwise;
    area = outward ? area.plus(arc.areaM2) : area.minus(arc.areaM2);
  }

  /*
    THE DRAWN RING IS BUILT HERE SO THE FORM AND THE ENGINE DRAW ONE SHAPE.

    The server tessellates the same arcs to the same tolerance from the same
    corners. Drawing the chords instead would give a reader a straight-sided
    preview of a plot that arrives back curved, which is the one moment they are
    checking the shape against the document in front of them.
  */
  const drawn2: Corner[] = [];
  const spans: RingSpan[] = [];
  for (const [i, corner] of corners.entries()) {
    const from = drawn2.length;
    drawn2.push(corner);
    const arc = arcs[i];
    const leg = legs[i];
    if (!arc || arc.refusal !== null || !leg) {
      spans.push({ from, count: 1 });
      continue;
    }
    const between = tessellate(
      fixed[i]!,
      fixed[(i + 1) % fixed.length]!,
      new Decimal(leg.radiusM ?? '0'),
      leg.curve === 'right',
    );
    drawn2.push(...between);
    spans.push({ from, count: between.length + 1 });
  }

  return {
    corners,
    drawnRing: drawn2,
    spans,
    miscloseM: metres(misclose),
    closureRatio: misclose.isZero() ? null : perimeter.div(misclose).floor().toFixed(0),
    drawnLengthsM: drawn,
    lastLegM: drawn[drawn.length - 1] ?? '0.000',
    perimeterM: metres(perimeter),
    areaM2: area.toFixed(2),
    arcs,
    usable: usable && arcs.every((a) => a === null || a.refusal === null),
  };
}

/**
 * The smallest departure from a chord this product will call a curve: one
 * millimetre, the grid the kernel is drawn on. Below it the arc IS the chord,
 * and recording it as a curve buys a hundred vertices for a straight boundary.
 * The engine refuses the same figure in the same words — see
 * `packages/geometry/src/arcs.ts`.
 */
const MIN_RISE_M = new Decimal('0.001');

/** Resolve one leg's radius against the chord the polygon will actually hold. */
function resolveArc(leg: TraverseLeg, chordM: Decimal): LegArc | null {
  if (leg.curve !== 'right' && leg.curve !== 'left') return null;
  const blank: LegArc = {
    arcLengthM: '0.000',
    riseM: '0.000',
    sweepDeg: '0.0',
    areaM2: '0.00',
    refusal: 'no-radius',
  };
  const radius = parse(leg.radiusM ?? '');
  if (radius === null || !radius.gt(0)) return blank;
  if (chordM.lte(0)) return blank;
  if (radius.times(2).lt(chordM)) return { ...blank, refusal: 'radius-too-small' };

  const sweep = chordM.div(radius.times(2)).asin().times(2);
  const rise = radius.times(new Decimal(1).minus(sweep.div(2).cos()));
  if (rise.lt(MIN_RISE_M)) return { ...blank, refusal: 'too-gentle' };
  return {
    arcLengthM: metres(radius.times(sweep)),
    riseM: metres(rise),
    sweepDeg: sweep.times(180).div(PI).toFixed(1),
    // ½r²(θ − sin θ), the circular segment, in closed form.
    areaM2: radius.times(radius).times(sweep.minus(sweep.sin())).div(2).toFixed(2),
    refusal: null,
  };
}

/**
 * The points between two corners of a curved boundary, on the millimetre grid.
 *
 * The same construction as `packages/geometry/src/arcs.ts`, held to the same
 * one-millimetre sagitta, so a reader's preview and the stored plot are the
 * same polygon rather than two renderings of the same intention. The corners
 * themselves are never moved: they are surveyed points.
 */
function tessellate(
  a: { x: Decimal; y: Decimal },
  b: { x: Decimal; y: Decimal },
  radius: Decimal,
  bulgesRight: boolean,
): readonly Corner[] {
  const dx = b.x.minus(a.x);
  const dy = b.y.minus(a.y);
  const chord = dx.times(dx).plus(dy.times(dy)).sqrt();
  if (chord.lte(0) || radius.times(2).lt(chord)) return [];
  const sweep = chord.div(radius.times(2)).asin().times(2);

  // Left of travel, which is where the centre of a right-bowing arc sits.
  const ux = dx.div(chord);
  const uy = dy.div(chord);
  const side = bulgesRight ? new Decimal(1) : new Decimal(-1);
  const apothem = radius.times(sweep.div(2).cos()).times(side);
  const cx = a.x.plus(b.x).div(2).plus(uy.negated().times(apothem));
  const cy = a.y.plus(b.y).div(2).plus(ux.times(apothem));

  const perSegment = Decimal.acos(new Decimal(1).minus(MIN_RISE_M.div(radius))).times(2);
  const n = Math.min(MAX_SEGMENTS, Math.max(1, sweep.div(perSegment).ceil().toNumber()));
  const total = sweep.times(side);
  const rx = a.x.minus(cx);
  const ry = a.y.minus(cy);
  const out: Corner[] = [];
  for (let i = 1; i < n; i += 1) {
    const angle = total.times(i).div(n);
    const cos = angle.cos();
    const sin = angle.sin();
    out.push({
      x: metres(cx.plus(rx.times(cos)).minus(ry.times(sin))),
      y: metres(cy.plus(rx.times(sin)).plus(ry.times(cos))),
    });
  }
  return out;
}

/** The kernel's own ceiling, so the preview cannot draw a curve it would refuse. */
const MAX_SEGMENTS = 256;

/** The signed area. Positive when the corners are walked anticlockwise. */
function signedShoelace(ring: readonly { x: Decimal; y: Decimal }[]): Decimal {
  let twice = new Decimal(0);
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % n]!;
    twice = twice.plus(a.x.times(b.y).minus(b.x.times(a.y)));
  }
  return twice.div(2);
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
    { lengthM: widthM, bearingDeg: '90', curve: '', radiusM: '' },
    { lengthM: depthM, bearingDeg: '0', curve: '', radiusM: '' },
    { lengthM: widthM, bearingDeg: '270', curve: '', radiusM: '' },
    { lengthM: depthM, bearingDeg: '180', curve: '', radiusM: '' },
  ];
}
