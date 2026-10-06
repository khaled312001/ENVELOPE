/**
 * The plot traced on imagery — the arithmetic, and the half of the panel that
 * exists without a map.
 *
 * ---------------------------------------------------------------------------
 * THERE IS NO GL CONTEXT HERE, AND THAT IS NOT A COMPROMISE.
 *
 * The suite runs with `environment: 'node'`, so there is no DOM at all, let alone
 * WebGL. A test that wanted to drive a real map would need a browser — which is
 * `pnpm smoke`'s territory — and would still not be able to assert the one thing
 * that matters most on this component, which is that a measured figure arrives in
 * the form as something a reader can type over.
 *
 * So `PlotMap.tsx` is written with every measurement in an exported pure function
 * and the canvas as one way of editing a list of coordinates. That is what makes
 * both halves testable here:
 *
 *   - the geometry and the leg emission, called directly;
 *   - the panel's markup, through `renderToStaticMarkup`, which runs no effects —
 *     so the dynamic `import('maplibre-gl')` inside the map effect never happens
 *     and the panel renders exactly as it does in a browser with no WebGL.
 *
 * ---------------------------------------------------------------------------
 * THE ASSERTIONS THAT CARRY THE DESIGN, AND WHY EACH ONE WOULD CATCH SOMETHING.
 *
 * `FR-PLT-001 AC2` blocks a run when the computed and the stated areas differ by
 * more than 2%, and a hand trace on a satellite tile routinely lands 2–5% off.
 * The resolution is that the trace is a PROPOSAL. Two tests hold that by name —
 * "arrives as an editable string" and "is not dressed as an engine value" —
 * because the two ways of losing it are different: emitting a number instead of a
 * string, and emitting a string wearing the provenance treatment that means the
 * engine said it.
 *
 * The calibration test that matters is the one asserting the SCALE COMES FROM THE
 * PRINTED DISTANCE and not from where the reader clicked. Scaling to the clicks
 * is the obvious implementation, it looks right on screen, and it silently
 * absorbs exactly the 2–5% disagreement this whole component is shaped around.
 */

import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { fromUtm40, gridBearingDeg, legBetween, ringToLegs, toUtm40, type LngLat } from '../src/geo.js';
import {
  admitVertex,
  assumedPlacement,
  calibrateUnderlay,
  compareArea,
  dropCollinear,
  fetchFootprint,
  groundToSheetPoint,
  legDrafts,
  PlotMap,
  ringReadout,
  searchPlaces,
  setLegLength,
  sheetPointToGround,
  underlayCorners,
  type SheetPoint,
  type TracedLegDraft,
  type UnderlayPlacement,
} from '../src/components/PlotMap.js';
import { StaticLocale, type Locale } from '../src/i18n/locale.js';
import { AR } from '../src/i18n/plotMap.ar.js';
import { EN } from '../src/i18n/plotMap.en.js';
import { expectNoComplianceClaim, stripTags } from './prohibitions.js';

/**
 * A rectangle built in PROJECTED space and converted back to degrees.
 *
 * The same fixture `geo.test.ts` uses, and for the reason it gives: a ring drawn
 * on a graticule is not a rectangle on the ground — its north and south edges
 * have different lengths — so four longitudes picked by eye would be asserting
 * the convergence of the meridians rather than the code.
 */
const rectangle = (
  originLng: number,
  originLat: number,
  widthM: number,
  depthM: number,
): readonly LngLat[] => {
  const o = toUtm40({ lng: originLng, lat: originLat });
  return [
    fromUtm40(o),
    fromUtm40({ e: o.e + widthM, n: o.n }),
    fromUtm40({ e: o.e + widthM, n: o.n + depthM }),
    fromUtm40({ e: o.e, n: o.n + depthM }),
  ];
};

/** 80 × 40 m, the worked example's own plot, at a Dubai origin. */
const RING = rectangle(55.27, 25.2, 80, 40);

/** A point stepped from another by metres in the projected plane. */
const step = (from: LngLat, eastM: number, northM: number): LngLat => {
  const p = toUtm40(from);
  return fromUtm40({ e: p.e + eastM, n: p.n + northM });
};

const paint = (
  props: Partial<ComponentProps<typeof PlotMap>> = {},
  locale: Locale = 'en',
): string =>
  renderToStaticMarkup(
    <StaticLocale locale={locale}>
      <PlotMap onTraced={() => {}} {...props} />
    </StaticLocale>,
  );

/** What a reader sees: tags gone, entities read, whitespace as a browser lays it. */
const visible = (markup: string): string =>
  stripTags(markup)
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&middot;|&#xB7;/g, '·')
    .replace(/\s+/g, ' ');

/* =========================================================================
 * THE LEG EMISSION — the crucial design point
 * ====================================================================== */

describe('a traced leg', () => {
  /*
    THE ASSERTION THIS COMPONENT EXISTS FOR, held by name.

    `EdgeDraft` holds `lengthM` and `bearingDeg` as strings a reader types into.
    A number would mean the form had to format it, at which point there are two
    formatters and one of them is wrong — and, worse, a number reads as a value
    rather than as a draft. The string IS the affordance.
  */
  it('arrives as an editable string and not as a locked value', () => {
    const legs = legDrafts(RING);
    expect(legs).toHaveLength(4);
    for (const leg of legs) {
      expect(typeof leg.lengthM, 'a length must arrive as a string').toBe('string');
      expect(typeof leg.bearingDeg, 'a bearing must arrive as a string').toBe('string');
      // The API's own `decimalString` form, which is also what the form's inputs
      // hold: nothing is wrapped, flagged, frozen or marked authoritative.
      expect(leg.lengthM).toMatch(/^\d+\.\d{3}$/);
      expect(leg.bearingDeg).toMatch(/^\d+\.\d{3}$/);
    }
    // And the emitted object carries NOTHING ELSE. A `locked`, `provenance`,
    // `readOnly` or `source` field would be this map telling the form how to
    // treat a number it measured off a photograph.
    for (const leg of legs) {
      expect(Object.keys(leg).sort()).toEqual(['bearingDeg', 'lengthM']);
    }
  });

  it('measures the rectangle it was built from, to the millimetre', () => {
    const legs = legDrafts(RING);
    expect(legs[0]!.lengthM).toBe('80.000');
    expect(legs[1]!.lengthM).toBe('40.000');
    expect(legs[2]!.lengthM).toBe('80.000');
    expect(legs[3]!.lengthM).toBe('40.000');
  });

  it('bears east, north, west and south, in that order', () => {
    const legs = legDrafts(RING);
    expect(legs[0]!.bearingDeg).toBe('90.000');
    expect(legs[1]!.bearingDeg).toBe('0.000');
    expect(legs[2]!.bearingDeg).toBe('270.000');
    expect(legs[3]!.bearingDeg).toBe('180.000');
  });

  /*
    THE PRECISION IS THE GRID'S, AND THIS IS WHY IT IS THREE PLACES.

    `walkTraverse` rounds every corner to the millimetre, so legs written to the
    millimetre walk back to the first corner and the form reports a traverse that
    closes. Written to two places the same trace would misclose by up to a couple
    of centimetres — and the form would report that to the reader as a property of
    their trace when it is a property of the formatter. A number that looks like
    information and is not is worse than no number.
  */
  it('is written to the millimetre, so the traverse the form walks closes', () => {
    const legs = legDrafts(RING);
    let e = 0;
    let n = 0;
    for (const leg of legs) {
      const b = (Number(leg.bearingDeg) * Math.PI) / 180;
      e += Number(leg.lengthM) * Math.sin(b);
      n += Number(leg.lengthM) * Math.cos(b);
    }
    expect(Math.hypot(e, n), 'the walked traverse should return to its first corner').toBeLessThan(
      0.002,
    );
  });

  it('closes the figure with its last leg rather than by repeating a vertex', () => {
    // A repeated first point would make a fifth leg of zero length, which the
    // form would then ask somebody to classify.
    expect(legDrafts(RING)).toHaveLength(RING.length);
    expect(legDrafts(rectangle(55.27, 25.2, 50, 50)).every((l) => Number(l.lengthM) > 1)).toBe(true);
  });

  it('reports nothing for a ring that is not one', () => {
    expect(legDrafts([])).toEqual([]);
    expect(legDrafts([RING[0]!, RING[1]!])).toEqual([]);
  });
});

/* =========================================================================
 * THE GATE EVERY VERTEX PASSES THROUGH
 * ====================================================================== */

describe('admitting a point', () => {
  /*
    `toUtm40` throws outside zone 40N rather than projecting, because a point one
    zone over comes back as a plausible easting that is kilometres wrong — and it
    would then be dimensioned, drawn, exported and x-referenced into a submission
    set. The refusal is caught at the gate so every function downstream may assume
    its ring is projectable.
  */
  it('refuses a point outside UTM zone 40N, and the ring is unchanged', () => {
    const riyadh: LngLat = { lng: 46.6753, lat: 24.7136 }; // zone 38
    const result = admitVertex(RING, riyadh);
    expect(result.refusal).toBe('outside-zone-40');
    /*
      THE SAME REFERENCE, not an equal copy. This is what lets the panel tell a
      refusal from a success without a second flag — and it is what `addTyped`
      relies on to leave a mistyped coordinate in its boxes. An earlier version
      of that handler emptied the boxes whenever the two fields parsed as
      numbers, so a reader was shown "outside zone 40N" beside two empty boxes
      with nothing left to correct. A refusal that also deletes its own input is
      a refusal and a deletion.
    */
    expect(result.ring).toBe(RING);
  });

  it('refuses something that is not a coordinate', () => {
    expect(admitVertex([], { lng: Number.NaN, lat: 25 }).refusal).toBe('not-a-coordinate');
    expect(admitVertex([], { lng: 55.27, lat: Number.POSITIVE_INFINITY }).refusal).toBe(
      'not-a-coordinate',
    );
  });

  it('admits a point inside the zone and appends it', () => {
    const result = admitVertex([RING[0]!], RING[1]!);
    expect(result.refusal).toBeNull();
    expect(result.ring).toHaveLength(2);
  });

  /* The zone's own edges, which are the UAE's. A gate that refused Abu Dhabi or
     Ras Al Khaimah would be a gate nobody could trace a plot through. */
  it('admits the whole country', () => {
    for (const p of [
      { lng: 55.2708, lat: 25.2048 }, // Dubai
      { lng: 54.3773, lat: 24.4539 }, // Abu Dhabi
      { lng: 55.9432, lat: 25.7895 }, // Ras Al Khaimah
      { lng: 56.3269, lat: 25.3375 }, // Fujairah
    ]) {
      expect(admitVertex([], p).refusal, `${p.lng}, ${p.lat}`).toBeNull();
    }
  });
});

/* =========================================================================
 * THE TEXT EQUIVALENT
 * ====================================================================== */

describe('the trace as numbers', () => {
  it('gives a row per boundary with the corner it starts from', () => {
    const readout = ringReadout(RING);
    expect(readout.rows).toHaveLength(4);
    expect(readout.rows.map((r) => r.n)).toEqual([1, 2, 3, 4]);
    for (const [i, row] of readout.rows.entries()) {
      // A length alone cannot be checked against anything; the corner is what
      // makes a row re-findable on a map or in another tool.
      expect(Number(row.lat)).toBeCloseTo(RING[i]!.lat, 5);
      expect(Number(row.lng)).toBeCloseTo(RING[i]!.lng, 5);
    }
  });

  it('measures the ring’s area and its perimeter', () => {
    const readout = ringReadout(RING);
    expect(Number(readout.areaM2)).toBeCloseTo(3200, 1);
    expect(Number(readout.perimeterM)).toBeCloseTo(240, 2);
  });

  it('has nothing to measure below three points', () => {
    expect(ringReadout([RING[0]!, RING[1]!])).toEqual({ rows: [], areaM2: null, perimeterM: null });
  });
});

describe('the traced area beside the sheet’s', () => {
  it('reports the gap and whether it is beyond AC2’s tolerance', () => {
    // 3,200 m² traced against 3,200 stated: the same figure.
    const same = compareArea(RING, '3200');
    expect(same?.differencePercent).toBe('0.00');
    expect(same?.beyondTolerance).toBe(false);

    // 3,200 against 3,000 is 6.67% — the 2–5% band this component exists for,
    // and past it.
    const apart = compareArea(RING, '3000');
    expect(Number(apart?.differencePercent)).toBeCloseTo(6.67, 1);
    expect(apart?.beyondTolerance).toBe(true);
  });

  it('holds the tolerance at two per cent, in both directions', () => {
    // 3,200 against 3,263.27 is 1.94%; against 3,266 is 2.02%.
    expect(compareArea(RING, '3263.27')?.beyondTolerance).toBe(false);
    expect(compareArea(RING, '3266')?.beyondTolerance).toBe(true);
    // Under-stated as well as over-stated: the check is on the magnitude.
    expect(compareArea(RING, '3000')?.beyondTolerance).toBe(true);
    expect(compareArea(RING, '3500')?.beyondTolerance).toBe(true);
  });

  /*
    NO COMPARISON IS INVENTED. A blank stated area is the honest state of the
    form — the sheet's area is optional — and a zero or negative one has no
    percentage against it. Both are `null` rather than a figure nobody's input
    produced.
  */
  it('reports nothing rather than inventing a percentage', () => {
    expect(compareArea(RING, undefined)).toBeNull();
    expect(compareArea(RING, '')).toBeNull();
    expect(compareArea(RING, '   ')).toBeNull();
    expect(compareArea(RING, '0')).toBeNull();
    expect(compareArea(RING, '-500')).toBeNull();
    expect(compareArea(RING, 'about four thousand')).toBeNull();
    expect(compareArea([RING[0]!, RING[1]!], '3200')).toBeNull();
  });
});

/* =========================================================================
 * THE UNDERLAY
 * ====================================================================== */

/** A landscape sheet, 1.5 × as wide as it is tall, 400 m across. */
const PLACEMENT: UnderlayPlacement = {
  centre: { lng: 55.27, lat: 25.2 },
  widthM: 400,
  aspect: 2 / 3,
  rotationDeg: 0,
};

describe('a sheet laid over the imagery', () => {
  it('opens as an ASSUMED placement, with no rotation guessed', () => {
    const p = assumedPlacement({ lng: 55.27, lat: 25.2 }, 300, 0.75);
    // The rotation is zero because the view is north-up. That is a statement
    // about the map and not a guess about the document — and the panel prints the
    // basis and the sensitivity beside it rather than leaving it implicit.
    expect(p.rotationDeg).toBe(0);
    expect(p.widthM).toBe(300);
    expect(p.aspect).toBe(0.75);
  });

  it('gives its four corners in maplibre’s order — top-left, then clockwise', () => {
    const [tl, tr, br, bl] = underlayCorners(PLACEMENT);
    // Named by where they are on the ground rather than by index, because an
    // anticlockwise quad draws the sheet MIRRORED: every dimension string on the
    // affection plan reads backwards and the plot is the wrong hand.
    expect(tl.lng).toBeLessThan(tr.lng);
    expect(br.lng).toBeGreaterThan(bl.lng);
    expect(tl.lat).toBeGreaterThan(bl.lat);
    expect(tr.lat).toBeGreaterThan(br.lat);
    // And the sheet is the width it says it is.
    expect(legBetween(tl, tr).lengthM).toBeCloseTo(400, 2);
    expect(legBetween(tl, bl).lengthM).toBeCloseTo(400 * (2 / 3), 2);
    // The order is the corner MAPPING's, not a list written twice: each corner
    // is the image coordinate it claims to be.
    expect(underlayCorners(PLACEMENT)).toEqual([
      sheetPointToGround(PLACEMENT, { u: 0, v: 0 }),
      sheetPointToGround(PLACEMENT, { u: 1, v: 0 }),
      sheetPointToGround(PLACEMENT, { u: 1, v: 1 }),
      sheetPointToGround(PLACEMENT, { u: 0, v: 1 }),
    ]);
  });

  it('round-trips a point between the sheet and the ground', () => {
    for (const point of [
      { u: 0, v: 0 },
      { u: 1, v: 1 },
      { u: 0.37, v: 0.82 },
      { u: 0.5, v: 0.5 },
    ] satisfies SheetPoint[]) {
      const back = groundToSheetPoint(PLACEMENT, sheetPointToGround(PLACEMENT, point));
      expect(back.u, `u ${point.u}`).toBeCloseTo(point.u, 6);
      expect(back.v, `v ${point.v}`).toBeCloseTo(point.v, 6);
    }
  });

  /* A rotated placement is where a clockwise/anticlockwise slip hides: it is
     invisible at 0° and at 180°, which are the two rotations anybody tries. */
  it('round-trips under rotation, which is where a sign error hides', () => {
    for (const rotationDeg of [0, 17, 90, 180, 274]) {
      const placement = { ...PLACEMENT, rotationDeg };
      const back = groundToSheetPoint(placement, sheetPointToGround(placement, { u: 0.2, v: 0.9 }));
      expect(back.u, `${rotationDeg}°`).toBeCloseTo(0.2, 6);
      expect(back.v, `${rotationDeg}°`).toBeCloseTo(0.9, 6);
    }
  });

  it('rotates clockwise, so a quarter turn puts the sheet’s top toward the east', () => {
    const turned = { ...PLACEMENT, rotationDeg: 90 };
    const topCentre = sheetPointToGround(turned, { u: 0.5, v: 0 });
    expect(legBetween(turned.centre, topCentre).bearingDeg).toBeCloseTo(90, 3);
  });
});

describe('two-point calibration', () => {
  /* Two features on a sheet: a quarter and three-quarters along its width, on the
     same horizontal — half the sheet's width apart. */
  const SHEET: readonly [SheetPoint, SheetPoint] = [
    { u: 0.25, v: 0.5 },
    { u: 0.75, v: 0.5 },
  ];
  const A: LngLat = { lng: 55.27, lat: 25.2 };

  /*
    THE ASSERTION THAT PINS THE WHOLE FEATURE.

    The reader's two clicks land 100 m apart; the sheet PRINTS 95 m. Scaling to
    the clicks is the obvious implementation and it would make the sheet agree
    with the reader's aim on a photograph instead of with the dimension on the
    document — absorbing exactly the 2–5% disagreement this component exists to
    publish. So the scale comes from the printed figure, and the gap is reported.
  */
  it('takes the scale from the printed distance and not from where the reader clicked', () => {
    const B = step(A, 100, 0);
    const result = calibrateUnderlay({
      aspect: PLACEMENT.aspect,
      sheet: SHEET,
      ground: [A, B],
      statedM: '95',
    });
    expect(result.refusal).toBeNull();
    const fit = result.fit!;

    // The two sheet features now sit 95 m apart on the ground — the sheet's
    // figure — and NOT the 100 m the clicks measured.
    const placedA = sheetPointToGround(fit.placement, SHEET[0]);
    const placedB = sheetPointToGround(fit.placement, SHEET[1]);
    expect(legBetween(placedA, placedB).lengthM).toBeCloseTo(95, 3);

    // The sheet is twice that across, because the two features are half its
    // width apart.
    expect(fit.placement.widthM).toBeCloseTo(190, 3);

    // And the disagreement is PUBLISHED rather than absorbed.
    expect(fit.measuredM).toBe('100.00');
    expect(fit.statedM).toBe('95.00');
    expect(Number(fit.differencePercent)).toBeCloseTo(5.26, 1);
  });

  it('puts the two features either side of the midpoint of the two clicks', () => {
    const B = step(A, 100, 0);
    const fit = calibrateUnderlay({
      aspect: PLACEMENT.aspect,
      sheet: SHEET,
      ground: [A, B],
      statedM: '95',
    }).fit!;
    const placedA = sheetPointToGround(fit.placement, SHEET[0]);
    const placedB = sheetPointToGround(fit.placement, SHEET[1]);
    const clickMid = toUtm40(step(A, 50, 0));
    const placedMid = {
      e: (toUtm40(placedA).e + toUtm40(placedB).e) / 2,
      n: (toUtm40(placedA).n + toUtm40(placedB).n) / 2,
    };
    expect(placedMid.e).toBeCloseTo(clickMid.e, 2);
    expect(placedMid.n).toBeCloseTo(clickMid.n, 2);
  });

  it('takes the rotation from the two clicks', () => {
    /*
      The two sheet features lie along the sheet's WIDTH, which points east on an
      unrotated placement. So:

        clicks running due east  → the sheet is already right, rotation 0;
        clicks running due north → the sheet's width must point north, which is a
                                   quarter turn ANTICLOCKWISE, i.e. 270° on the
                                   clockwise scale `rotationDeg` is measured on.

      Both cases are asserted because a clockwise/anticlockwise slip gives 90
      where 270 belongs and is invisible on any square sheet traced north-up.
    */
    const east = calibrateUnderlay({
      aspect: PLACEMENT.aspect,
      sheet: SHEET,
      ground: [A, step(A, 100, 0)],
      statedM: '100',
    }).fit!;
    expect(east.placement.rotationDeg).toBeCloseTo(0, 3);

    const north = calibrateUnderlay({
      aspect: PLACEMENT.aspect,
      sheet: SHEET,
      ground: [A, step(A, 0, 100)],
      statedM: '100',
    }).fit!;
    expect(north.placement.rotationDeg).toBeCloseTo(270, 3);

    /* And the proof that 270 is the right number rather than the one the code
       happens to produce: the sheet's own width now runs north on the ground. */
    const left = sheetPointToGround(north.placement, { u: 0, v: 0.5 });
    const right = sheetPointToGround(north.placement, { u: 1, v: 0.5 });
    /* Compared THROUGH THE WRAP. A bearing a hair west of north reads 359.99…
       and not −0.00…, because `gridBearingDeg` normalises to `[0, 360)` — and
       the test for that normalisation is in this very file, so an assertion
       here that forgot it would be failing on the convention it asserts. */
    const bearing = legBetween(left, right).bearingDeg;
    expect(Math.min(bearing, 360 - bearing)).toBeCloseTo(0, 3);
  });

  it('reports no gap when the clicks and the printed figure agree', () => {
    const fit = calibrateUnderlay({
      aspect: PLACEMENT.aspect,
      sheet: SHEET,
      ground: [A, step(A, 61.5, 0)],
      statedM: '61.5',
    }).fit!;
    expect(fit.differencePercent).toBe('0.00');
  });

  /* Refusals, in a sentence, rather than a placement computed from a degeneracy.
     Each of these produces a division by zero or an undefined direction, and each
     one would place the sheet somewhere plausible-looking and wrong. */
  it('refuses two features at one spot on the sheet', () => {
    const result = calibrateUnderlay({
      aspect: PLACEMENT.aspect,
      sheet: [{ u: 0.5, v: 0.5 }, { u: 0.5, v: 0.5 }],
      ground: [A, step(A, 100, 0)],
      statedM: '100',
    });
    expect(result.refusal).toBe('same-sheet-point');
    expect(result.fit).toBeNull();
  });

  it('refuses two clicks at one spot on the imagery', () => {
    const result = calibrateUnderlay({
      aspect: PLACEMENT.aspect,
      sheet: SHEET,
      ground: [A, A],
      statedM: '100',
    });
    expect(result.refusal).toBe('same-ground-point');
  });

  /* NO DEFAULT DISTANCE. A missing dimension is not an occasion to measure the
     clicks instead — that is the hidden default the printed figure exists to
     replace. */
  it('refuses a missing or impossible distance rather than defaulting to the clicks', () => {
    for (const statedM of ['', '   ', '0', '-61.5', 'sixty one point five']) {
      const result = calibrateUnderlay({
        aspect: PLACEMENT.aspect,
        sheet: SHEET,
        ground: [A, step(A, 100, 0)],
        statedM,
      });
      expect(result.refusal, `statedM ${JSON.stringify(statedM)}`).toBe('no-distance');
    }
  });

  it('refuses a click outside the zone rather than projecting it', () => {
    const result = calibrateUnderlay({
      aspect: PLACEMENT.aspect,
      sheet: SHEET,
      ground: [A, { lng: 46.6753, lat: 24.7136 }],
      statedM: '100',
    });
    expect(result.refusal).toBe('outside-zone-40');
  });
});

/* =========================================================================
 * THE CONVENTION THE CALIBRATION BORROWS
 * ====================================================================== */

describe('the bearing convention', () => {
  /*
    `gridBearingDeg` was added to `geo.ts` and `ringToLegs` was rewritten to go
    through `legBetween`, so there is ONE `atan2` in the web app. A second copy is
    the kind of thing that gets written with its arguments the other way round,
    and a transposed bearing is a plot of exactly the right size, mirrored about
    the north–south axis — which passes every area check there is.

    This is the test left behind by that change, asserting the new truth by name.
  */
  it('is north-zero and east-ninety, over metres in the projected plane', () => {
    expect(gridBearingDeg(0, 10)).toBeCloseTo(0, 9);
    expect(gridBearingDeg(10, 0)).toBeCloseTo(90, 9);
    expect(gridBearingDeg(0, -10)).toBeCloseTo(180, 9);
    expect(gridBearingDeg(-10, 0)).toBeCloseTo(270, 9);
    // Never 360. North is zero, and a ring whose first leg came out as 360 would
    // sort, compare and print differently from the identical plot drawn the other
    // way round.
    expect(gridBearingDeg(-1e-12, 10)).toBeLessThan(360);
  });

  it('is the same one `ringToLegs` walks, leg for leg', () => {
    const legs = ringToLegs(RING);
    for (const [i, leg] of legs.entries()) {
      const direct = legBetween(RING[i]!, RING[(i + 1) % RING.length]!);
      expect(leg.lengthM).toBe(direct.lengthM);
      expect(leg.bearingDeg).toBe(direct.bearingDeg);
    }
  });
});

/* =========================================================================
 * THE PANEL, RENDERED WITH NO MAP
 * ====================================================================== */

describe('the panel without a canvas', () => {
  it('renders, and says the affection plan is the authority', () => {
    const text = visible(paint());
    expect(text).toContain('The affection plan is the authority');
    expect(text).toContain('no parcel boundary on this map is official');
  });

  /*
    THE KEYBOARD PATH IS THE WHOLE OF THE NON-POINTER WAY IN, and it is asserted
    as markup rather than as a behaviour because a map is a pointer-only control
    until the DOM says otherwise. Every accessibility defect found on this site so
    far was found in a browser; what a static render CAN prove is that the
    controls exist, are labelled, and are not disabled.
  */
  it('offers coordinate entry, labelled and enabled', () => {
    const markup = paint();
    expect(markup).toContain('id="pm-lat"');
    expect(markup).toContain('id="pm-lng"');
    expect(markup).toContain('for="pm-lat"');
    expect(markup).toContain('for="pm-lng"');
    expect(visible(markup)).toContain(EN.keyboard.add);
    // Neither box waits on a map. A coordinate field that is disabled until a
    // canvas appears is a pointer-only control with extra steps.
    expect(markup).not.toMatch(/id="pm-lat"[^>]*disabled/);
    expect(markup).not.toMatch(/id="pm-lng"[^>]*disabled/);
    expect(markup).not.toMatch(/id="pm-lat"[^>]*readonly/i);
  });

  it('says in words that the map is the optional half', () => {
    expect(visible(paint())).toContain(EN.how.keyboard);
  });

  /*
    THE TEXT EQUIVALENT IS A REAL TABLE. A screen reader navigates a table by row
    and column and reads a `scope` header with each cell; a list of styled divs is
    a shape nobody can interrogate. The caption is where the row's meaning lives,
    and it carries the sentence about every figure being editable.
  */
  it('renders the trace as a real table, with a header per column and a row per boundary', () => {
    const markup = paint({ initialRing: RING });
    expect(markup).toContain('<table>');
    expect(markup).toContain('<caption');
    expect(markup).toContain('scope="col"');
    expect(markup).toContain('scope="row"');
    expect((markup.match(/<tr>/g) ?? []).length).toBe(1 + RING.length); // header + four
    /*
      THE LENGTHS ARE READ OUT OF THE INPUTS, because that is where they now are.

      A boundary's length is the one figure in this table a reader may overtype —
      the affection plan prints it and a trace on imagery cannot hit it — so it
      renders as a box with its measured value in it. Asserting on the stripped
      text would silently pass on a table that had lost the column, since a value
      attribute is not text; asserting on the attribute is what checks that the
      box arrives carrying the measurement rather than empty.
    */
    const lengths = [...markup.matchAll(/class="[^"]*pm-ring__length[^"]*"[^>]*value="([^"]*)"/g)].map(
      (m) => m[1],
    );
    expect(lengths).toEqual(['80.000', '40.000', '80.000', '40.000']);
    const text = visible(markup);
    expect(text).toContain('90.000'); // a bearing, which is not editable
    expect(text).toContain(EN.table.caption);
  });

  /*
    THE CLIENT'S OWN CASE, 6 Oct 2026: the trace measured 33 m and the sheet says
    40, so the boundary becomes 40 along the direction it was traced at.

    Asserted on the pure function rather than through the input, because what
    needs checking is the geometry: the far corner moves, the near one does not,
    and the direction is unchanged. A test driving the box would mostly be
    testing React.
  */
  it('sets a boundary to a typed length, sliding its far corner along its own bearing', () => {
    const before = ringReadout(RING);
    const next = setLegLength(RING, 0, 40);
    const after = ringReadout(next);

    expect(before.rows[0]?.lengthM).toBe('80.000');
    expect(after.rows[0]?.lengthM).toBe('40.000');
    // Same direction, to the millidegree the readout prints.
    expect(after.rows[0]?.bearingDeg).toBe(before.rows[0]?.bearingDeg);
    // The corner it starts from is where the reader put it.
    expect(after.rows[0]?.lat).toBe(before.rows[0]?.lat);
    expect(after.rows[0]?.lng).toBe(before.rows[0]?.lng);
    // And the next boundary changed, because its start moved. That is the point.
    expect(after.rows[1]?.lengthM).not.toBe(before.rows[1]?.lengthM);
    // Nothing else moved: the third corner is untouched.
    expect(after.rows[2]?.lat).toBe(before.rows[2]?.lat);
  });

  it('refuses a length that is not a positive number, and leaves the ring alone', () => {
    expect(setLegLength(RING, 0, 0)).toBe(RING);
    expect(setLegLength(RING, 0, -5)).toBe(RING);
    expect(setLegLength(RING, 0, Number.NaN)).toBe(RING);
    expect(setLegLength(RING, 9, 40)).toBe(RING);
  });

  it('prints the traced area and the boundary each row starts from', () => {
    const text = visible(paint({ initialRing: RING }));
    expect(text).toContain('3200.00');
    expect(text).toContain('25.2'); // the first corner's latitude
  });

  it('puts the stated area beside it and names the gap', () => {
    const text = visible(paint({ initialRing: RING, statedAreaM2: '3000' }));
    expect(text).toContain('3000.00');
    expect(text).toContain('6.67');
    expect(text).toContain('It is a starting point, not a plot.');
  });

  /*
    A CLOSED RING IS A DELIBERATE ACT, and the handoff waits for it. An open trace
    has no last boundary, so handing one over would put a figure in the form for a
    boundary nobody drew.
  */
  it('will not hand over an open trace, and says why', () => {
    const markup = paint({ initialRing: RING });
    expect(markup).toMatch(/button--primary[^>]*disabled/);
    expect(visible(markup)).toContain(EN.handoff.blocked);
  });

  it('shows no points, and no table, before anything is traced', () => {
    const text = visible(paint());
    expect(text).toContain(EN.controls.none);
    expect(text).toContain(EN.table.empty);
    expect(paint()).not.toContain('<table>');
  });

  /* A resumed trace goes through the same gate a click does — the same sentence,
     whether the point arrived a second ago or a week ago. */
  it('drops a stored point that is outside the zone rather than projecting it', () => {
    const markup = paint({ initialRing: [...RING, { lng: 46.6753, lat: 24.7136 }] });
    // Four boundaries, not five: the Riyadh point never entered the ring.
    expect((markup.match(/<tr>/g) ?? []).length).toBe(1 + 4);
  });
});

describe('the attribution', () => {
  /*
    Esri's terms require the credit to be visible. maplibre's own control is
    collapsible and ships collapsed on a narrow screen, which is the same defect
    as a limit behind a disclosure — so the panel renders both credits itself, in
    markup, where they survive a browser with no WebGL and where a test can read
    them without a GL context.
  */
  it('is in the markup, not behind a disclosure, in both languages', () => {
    for (const locale of ['en', 'ar'] as const) {
      const markup = paint({}, locale);
      expect(visible(markup), locale).toContain('Imagery © Esri');
      expect(markup, locale).not.toContain('<details');
    }
  });

  it('credits OpenStreetMap only while its layer is drawn', () => {
    /*
      The overlay is off until a reader turns it on, and a credit for data that is
      not on screen is a credit to the wrong party.

      Asserted against the CREDIT LINE rather than against the words
      "OpenStreetMap contributors", which the overlay's own description also uses
      — the first version of this test failed on that description, which is the
      honest sentence saying the layer is not a cadastral source.
    */
    const text = visible(paint());
    expect(text).not.toContain(EN.osm.credit);
    // The control that turns it on is there, and what it draws is named under
    // the map whether it is drawn or not.
    expect(text).toContain(EN.osm.show);
    expect(text).toContain(EN.osm.label);
    expect(text).toContain('Not a cadastral source');
  });

  it('is not translated, because a translated credit credits nobody', () => {
    expect(AR.imagery.credit).toBe(EN.imagery.credit);
    expect(AR.osm.credit).toBe(EN.osm.credit);
  });
});

/* =========================================================================
 * PROHIBITIONS
 * ====================================================================== */

describe('prohibitions', () => {
  it('never claims the trace complies with anything, in either language', () => {
    for (const locale of ['en', 'ar'] as const) {
      expectNoComplianceClaim(paint({ initialRing: RING }, locale), `plot map (${locale})`);
    }
  });

  it('carries the refusal sentence under the panel, both languages', () => {
    expect(visible(paint())).toContain('never assessed and never claimed');
    expect(visible(paint({}, 'ar'))).toContain('الصلاحية التنظيمية لا تخضع للتقييم إطلاقا');
  });

  /*
    NO AMBER ON THE DEFAULT PANEL, because nothing on it is assumed: a traced
    figure is a measurement the reader took and the boundary table is where it
    becomes USER_SET. §13.1 reserves the colour exclusively for uncertainty, and
    this panel is exactly the kind of place where it would get borrowed to mean
    "careful" — which is the one thing that rule exists to prevent.
  */
  it('paints no amber, because nothing on the panel is an ASSUMED value', () => {
    for (const locale of ['en', 'ar'] as const) {
      const markup = paint({ initialRing: RING, statedAreaM2: '3000' }, locale);
      expect(markup, locale).not.toContain('traced--assumed');
      expect(markup, locale).not.toContain('--uncertain');
      expect(markup, locale).not.toContain('data-state="assumed"');
    }
  });

  /*
    NOT DRESSED AS AN ENGINE VALUE. `TracedValue`'s components label a figure the
    engine emitted and carry its provenance treatment; these were measured off a
    photograph by a reader. `DERIVED` in this system means a value reached a cited
    regulatory instrument, and a vertex clicked on a satellite tile reached a
    photograph — so wrapping one would manufacture a provenance record for a
    measurement nobody made.
  */
  it('does not dress a traced figure in the engine’s own provenance treatment', () => {
    const markup = paint({ initialRing: RING });
    expect(markup).not.toContain('traced--derived');
    expect(markup).not.toContain('engine-value');
    expect(markup).not.toContain('DERIVED');
    expect(markup).not.toContain('USER_SET');
  });

  /*
    THE ONE ASSUMPTION ON THIS PANEL IS THE SHEET'S OPENING PLACEMENT, and an
    assumption with no basis is a guess. It cannot be rendered here — it needs a
    file chosen in a browser — so the dictionary is held to carrying both halves,
    the way `plot-limits.test.tsx` holds each unbound limit to a real reason
    rather than a shrug.
  */
  it('states a basis AND a sensitivity for the assumed sheet placement', () => {
    for (const d of [EN, AR]) {
      expect(d.underlay.uncalibrated.basis.length).toBeGreaterThan(40);
      expect(d.underlay.uncalibrated.sensitivity.length).toBeGreaterThan(40);
    }
    // The basis says WHERE the number came from, and the sensitivity says what
    // moves with it — which is the pair `assumed()` refuses to be built without.
    expect(EN.underlay.uncalibrated.basis).toContain('chosen by this screen');
    expect(EN.underlay.uncalibrated.sensitivity).toContain('moves with it');
  });

  it('says the millimetre is the grid’s precision and not the trace’s accuracy', () => {
    const text = visible(paint({ initialRing: RING }));
    expect(text).toContain('It is not a claim about how accurately the imagery was traced.');
  });

  /*
    THE DICTIONARY HOLDS NO DIGIT. Every figure on the panel is a measurement or a
    named constant in the component, which is what stops a hand-typed number
    appearing on a screen that sells traced ones.

    Two IDENTIFIERS carry digits and are stripped before the scan rather than
    having their whole sentence exempted: `WGS84` is a datum's name and `zone 40N`
    is a zone's designation, and both are the same kind of thing as a rule id or a
    plot number — carried verbatim, never translated, and never a measurement.
    Stripping them instead of the sentence keeps the rest of each sentence under
    the rule, so a length typed into either one still fails.
  */
  it('types no digit into either dictionary', () => {
    const IDENTIFIERS: readonly RegExp[] = [/WGS84/g, /zone 40N/g, /النطاق 40/g];
    const scan = (value: unknown, path: string): void => {
      if (typeof value === 'string') {
        let text = value;
        for (const id of IDENTIFIERS) text = text.replace(id, '');
        expect(text, `${path} types a digit: ${value}`).not.toMatch(/\d/);
        return;
      }
      if (typeof value === 'function') return; // takes its figures as arguments
      if (value !== null && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) scan(v, `${path}.${k}`);
      }
    };
    scan(EN, 'EN');
    scan(AR, 'AR');
  });
});

/* =========================================================================
 * THE HANDOFF
 * ====================================================================== */

describe('handing the trace to the traverse', () => {
  /*
    THE TRACE IS OFFERED, NEVER APPLIED — the same discipline `PlotForm`'s
    autosave states for a recovered draft. A map that wrote into the form on every
    click would overwrite a length the reader had already corrected, silently, at
    the moment they nudged a vertex.

    The press itself needs a DOM, so what is asserted here is the payload the
    callback is built to receive and the shape the button is in before anything is
    pressed: disabled on an open ring, and nothing emitted on render.
  */
  it('emits nothing on render — a trace is handed over on a press', () => {
    const onTraced = vi.fn();
    renderToStaticMarkup(
      <StaticLocale locale="en">
        <PlotMap onTraced={onTraced} initialRing={RING} statedAreaM2="3200" />
      </StaticLocale>,
    );
    expect(onTraced).not.toHaveBeenCalled();
  });

  it('carries no classification, because a photograph cannot know one', () => {
    // `AC3` has no default for an edge class, and a satellite tile cannot see
    // whether a boundary faces a road. The emitted leg has two fields and the
    // composition root merges them into drafts that keep their own.
    const legs: readonly TracedLegDraft[] = legDrafts(RING);
    for (const leg of legs) {
      expect(leg).not.toHaveProperty('classification');
      expect(leg).not.toHaveProperty('roadHierarchy');
    }
  });
});

/* ===========================================================================
 * PICKING AN OUTLINE OFF THE MAP
 *
 * The happy path here is a fetch and a projection, and it is not what can go
 * wrong. What can go wrong is the panel treating somebody else's trace as a
 * survey, or filling a gap when the answer is that there is nothing there. So
 * these drive the refusals, and the one transformation that changes the shape a
 * reader is handed.
 * ======================================================================== */

describe('an outline picked off OpenStreetMap', () => {
  const at = { lng: 55.2708, lat: 25.2048 };
  /** A response, without a network. */
  const reply = (body: unknown, ok = true): typeof fetch =>
    (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

  it('refuses rather than guessing when nothing can be reached', async () => {
    const dead = (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    const out = await fetchFootprint(at, 40, dead);
    expect(out.ring).toBeNull();
    expect(out.refusal).toBe('offline');
  });

  it('refuses rather than guessing when there is nothing there', async () => {
    const out = await fetchFootprint(at, 40, reply({ elements: [] }));
    expect(out.ring).toBeNull();
    expect(out.refusal).toBe('none-here');
  });

  it('refuses a way that is not a closed outline', async () => {
    const out = await fetchFootprint(
      at,
      40,
      reply({ elements: [{ geometry: [{ lat: 25, lon: 55 }, { lat: 25.001, lon: 55 }] }] }),
    );
    expect(out.refusal).toBe('not-a-ring');
  });

  /*
    AN OSM WAY REPEATS ITS FIRST NODE TO CLOSE ITSELF and this panel's ring does
    not. Left on, the repeat arrives in the form as a zero-length boundary that
    then wants a classification and a setback of its own.
  */
  it('drops the repeated closing node, so no boundary is zero long', async () => {
    const square = [
      { lat: 25.2, lon: 55.2 },
      { lat: 25.2, lon: 55.2005 },
      { lat: 25.2005, lon: 55.2005 },
      { lat: 25.2005, lon: 55.2 },
      { lat: 25.2, lon: 55.2 },
    ];
    const out = await fetchFootprint(
      { lng: 55.20025, lat: 25.20025 },
      40,
      reply({ elements: [{ geometry: square, tags: { building: 'yes', name: 'Villa 12' } }] }),
    );
    expect(out.ring).toHaveLength(4);
    expect(out.name).toBe('Villa 12');
    expect(out.kind).toBe('building');
    for (const leg of legDrafts(out.ring!)) expect(Number(leg.lengthM)).toBeGreaterThan(0);
  });

  it('takes the smallest outline within reach, not the compound wall around both', async () => {
    const box = (dLat: number, dLng: number): readonly { lat: number; lon: number }[] => [
      { lat: 25.2 - dLat, lon: 55.2 - dLng },
      { lat: 25.2 - dLat, lon: 55.2 + dLng },
      { lat: 25.2 + dLat, lon: 55.2 + dLng },
      { lat: 25.2 + dLat, lon: 55.2 - dLng },
      { lat: 25.2 - dLat, lon: 55.2 - dLng },
    ];
    const out = await fetchFootprint(
      { lng: 55.2, lat: 25.2 },
      40,
      reply({
        elements: [
          { geometry: box(0.0008, 0.0008), tags: { building: 'yes', name: 'the wall' } },
          { geometry: box(0.0002, 0.0002), tags: { building: 'yes', name: 'the villa' } },
        ],
      }),
    );
    expect(out.name).toBe('the villa');
  });
});

describe('dropping the points that are not corners', () => {
  /* Three nodes down one straight wall is one boundary, and the two extra ones
     would each arrive in the form wanting a classification and a setback. */
  it('removes a node in the middle of a straight run', () => {
    const ring = [
      { lng: 55.2, lat: 25.2 },
      { lng: 55.2005, lat: 25.2 },
      { lng: 55.201, lat: 25.2 },
      { lng: 55.201, lat: 25.2005 },
      { lng: 55.2, lat: 25.2005 },
    ];
    const kept = dropCollinear(ring);
    expect(kept).toHaveLength(4);
  });

  it('keeps every corner of a chamfered figure', () => {
    const ring = [
      { lng: 55.2, lat: 25.2 },
      { lng: 55.201, lat: 25.2 },
      { lng: 55.2012, lat: 25.2002 },
      { lng: 55.2012, lat: 25.2008 },
      { lng: 55.2, lat: 25.2008 },
    ];
    expect(dropCollinear(ring)).toHaveLength(5);
  });

  it('never returns fewer than three points, whatever the tolerance', () => {
    const ring = [
      { lng: 55.2, lat: 25.2 },
      { lng: 55.201, lat: 25.2 },
      { lng: 55.202, lat: 25.2 },
    ];
    expect(dropCollinear(ring, 180).length).toBeGreaterThanOrEqual(3);
  });
});

describe('finding the place', () => {
  it('finds nothing when it cannot reach the internet, and says so by returning nothing', async () => {
    const dead = (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    expect(await searchPlaces('warsan', dead)).toEqual([]);
  });

  it('drops a hit with no coordinate rather than placing it at zero', async () => {
    const reply = (async () => ({
      ok: true,
      json: async () => [
        { display_name: 'Al Warsan, Dubai', lat: '25.16', lon: '55.41' },
        { display_name: 'A place with no position' },
      ],
    })) as unknown as typeof fetch;
    const hits = await searchPlaces('warsan', reply);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.at.lat).toBeCloseTo(25.16, 5);
  });
});
