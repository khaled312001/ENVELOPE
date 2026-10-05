/**
 * The projection, held to published coordinates and to its own inverse.
 *
 * ---------------------------------------------------------------------------
 * A PROJECTION IS THE EASIEST THING IN THIS CODEBASE TO GET PLAUSIBLY WRONG.
 *
 * Every error it can make — a dropped series term, a radians/degrees slip in
 * one branch, the wrong central meridian — produces numbers that look entirely
 * reasonable. They are metres, they are in the right part of the world, and
 * they are self-consistent. Nothing downstream would notice: the plot would
 * close, the area would compute, the drawing would be dimensioned and the DXF
 * would open. It would simply be the wrong plot.
 *
 * So this is checked two ways, and neither alone is enough. ROUND-TRIP catches
 * nothing at all on its own — an inverse derived from the same wrong forward is
 * perfectly self-consistent — so it is here for the inverse's sake and the
 * forward is held to EXTERNAL values: coordinates computed elsewhere, written
 * down, and compared against.
 */

import { describe, expect, it } from 'vitest';

import { fromUtm40, inZone40, ringAreaM2, ringToLegs, toUtm40 } from '../src/geo.js';

/**
 * THE INDEPENDENT REFERENCE, and why it is computed here rather than typed.
 *
 * Zone 40N's central meridian is 57°E. On it, at any latitude, the easting is
 * the false easting exactly — 500000 — because the point is on the line the
 * projection is built around. That is a property of the DEFINITION of UTM
 * rather than of this implementation, which is what makes it a real check: an
 * implementation with the wrong zone, the wrong false easting or a longitude
 * sign error cannot produce it.
 *
 * The NORTHING on the meridian is k0 times the meridional arc from the equator,
 * and the arc is where a hand-written fixture goes wrong. The first version of
 * this file carried three arcs written from memory, and they were out by 819 m
 * — the test failed, and it failed because the FIXTURE was wrong rather than
 * the code. A number nobody computed is not a reference; it is a second guess
 * that happens to be in the test file, and this repository refuses typed
 * figures everywhere else for exactly that reason.
 *
 * So the reference is INTEGRATED here, by Simpson's rule, straight from the
 * definition:
 *
 *     M(φ) = ∫₀^φ  a(1−e²) / (1 − e² sin²t)^{3/2}  dt
 *
 * That is a different method from the truncated trigonometric series in
 * `geo.ts`, not a copy of it, which is the whole point: the series can only
 * agree with the quadrature if both are right. A dropped series term — the
 * single most likely defect in a hand-written transverse Mercator — shows up
 * immediately, and so would a wrong eccentricity.
 */
const A_WGS84 = 6378137.0;
const E2_WGS84 = (1 / 298.257223563) * (2 - 1 / 298.257223563);

/** Metres from the equator to `latDeg` along a meridian, by quadrature. */
function meridianArc(latDeg: number, panels = 20_000): number {
  const phi = (latDeg * Math.PI) / 180;
  const f = (t: number): number => {
    const s = Math.sin(t);
    return (A_WGS84 * (1 - E2_WGS84)) / (1 - E2_WGS84 * s * s) ** 1.5;
  };
  const h = phi / panels;
  let sum = f(0) + f(phi);
  for (let i = 1; i < panels; i += 1) sum += f(i * h) * (i % 2 === 0 ? 2 : 4);
  return (h / 3) * sum;
}

const K0 = 0.9996;
const LATITUDES: readonly number[] = [24, 25, 26];

describe('the zone', () => {
  it('is the UAE’s own, and its edges are the zone’s', () => {
    expect(inZone40(54)).toBe(true);
    expect(inZone40(55.2708)).toBe(true); // Dubai
    expect(inZone40(59.999)).toBe(true);
    expect(inZone40(60)).toBe(false);
    expect(inZone40(53.999)).toBe(false);
  });

  /*
    A point one zone over does not fail loudly on its own. It comes back as a
    plausible easting that is kilometres wrong, and it would then be dimensioned,
    drawn, exported and x-referenced into a submission set. Degenerate geometry
    raises in this codebase; so does this.
  */
  it('refuses a longitude it cannot project, rather than projecting it anyway', () => {
    expect(() => toUtm40({ lng: 46.6753, lat: 24.7136 })).toThrow(/zone 40N/); // Riyadh, zone 38
    expect(() => toUtm40({ lng: 60.5, lat: 25 })).toThrow(/zone 40N/);
    expect(() => toUtm40({ lng: Number.NaN, lat: 25 })).toThrow(/not a coordinate/);
  });
});

describe('the forward projection', () => {
  it('puts the central meridian exactly on the false easting', () => {
    for (const lat of LATITUDES) {
      const { e } = toUtm40({ lng: 57, lat });
      // A millimetre. The grid this feeds is integer millimetres, so anything
      // this check tolerates is a millimetre the kernel would have to round.
      expect(Math.abs(e - 500000)).toBeLessThan(0.001);
    }
  });

  it('matches a numerically integrated meridional arc', () => {
    for (const lat of LATITUDES) {
      const { n } = toUtm40({ lng: 57, lat });
      const reference = K0 * meridianArc(lat);
      // A millimetre, over 2,700 km of arc. The series in `geo.ts` is truncated
      // after four terms; this is what says the terms it kept are enough.
      expect(Math.abs(n - reference), `${lat}°: ${n} vs ${reference}`).toBeLessThan(0.001);
    }
  });

  /*
    DIRECTION, WHICH NO ROUND-TRIP CAN CHECK. A forward transform with east and
    north transposed round-trips perfectly. These four say which way is which.
  */
  it('increases easting to the east and northing to the north', () => {
    const base = toUtm40({ lng: 55.27, lat: 25.2 });
    expect(toUtm40({ lng: 55.28, lat: 25.2 }).e).toBeGreaterThan(base.e);
    expect(toUtm40({ lng: 55.26, lat: 25.2 }).e).toBeLessThan(base.e);
    expect(toUtm40({ lng: 55.27, lat: 25.21 }).n).toBeGreaterThan(base.n);
    expect(toUtm40({ lng: 55.27, lat: 25.19 }).n).toBeLessThan(base.n);
  });

  it('puts Dubai west of the central meridian, where it is', () => {
    // 55.27°E is 1.73° west of 57°E, so the easting is below the false easting.
    expect(toUtm40({ lng: 55.2708, lat: 25.2048 }).e).toBeLessThan(500000);
  });

  /*
    SCALE. One degree of latitude is about 110.9 km at 25°N, and a degree of
    longitude about 100.5 km. A series term dropped from the meridional arc
    shows up here as a number that is close but not close enough.
  */
  it('is to scale in both axes', () => {
    const a = toUtm40({ lng: 55.27, lat: 25.0 });
    const b = toUtm40({ lng: 55.27, lat: 26.0 });
    expect(Math.abs(b.n - a.n)).toBeGreaterThan(110_500);
    expect(Math.abs(b.n - a.n)).toBeLessThan(111_300);

    const c = toUtm40({ lng: 56.27, lat: 25.0 });
    expect(Math.abs(c.e - a.e)).toBeGreaterThan(100_000);
    expect(Math.abs(c.e - a.e)).toBeLessThan(101_500);
  });
});

describe('the inverse', () => {
  it('returns every point it was given, to under a millimetre', () => {
    for (const p of [
      { lng: 55.2708, lat: 25.2048 }, // Dubai
      { lng: 54.3773, lat: 24.4539 }, // Abu Dhabi
      { lng: 55.9432, lat: 25.7895 }, // Ras Al Khaimah
      { lng: 57.0, lat: 25.0 }, // on the meridian
      { lng: 54.0001, lat: 24.0 }, // at the zone's edge
    ]) {
      const back = fromUtm40(toUtm40(p));
      // 1e-8° of latitude is about 1.1 mm.
      expect(Math.abs(back.lng - p.lng), `lng ${p.lng}`).toBeLessThan(1e-8);
      expect(Math.abs(back.lat - p.lat), `lat ${p.lat}`).toBeLessThan(1e-8);
    }
  });
});

/**
 * THE TRAVERSE THE MAP HANDS THE FORM.
 *
 * The fixture is a rectangle built in PROJECTED space and converted back to
 * degrees, rather than four longitudes and latitudes picked by eye. A ring
 * drawn on a graticule is not a rectangle on the ground — its north and south
 * edges have different lengths — so an eyeballed fixture would be asserting the
 * convergence of the meridians rather than the code.
 */
const rectangle = (
  originLng: number,
  originLat: number,
  widthM: number,
  depthM: number,
): readonly { lng: number; lat: number }[] => {
  const o = toUtm40({ lng: originLng, lat: originLat });
  return [
    fromUtm40(o),
    fromUtm40({ e: o.e + widthM, n: o.n }),
    fromUtm40({ e: o.e + widthM, n: o.n + depthM }),
    fromUtm40({ e: o.e, n: o.n + depthM }),
  ];
};

describe('a traced ring', () => {
  const ring = rectangle(55.27, 25.2, 80, 40);

  it('becomes one leg per boundary, closing the figure without a repeated vertex', () => {
    const legs = ringToLegs(ring);
    expect(legs).toHaveLength(4);
    // A repeated first vertex would make a fifth leg of zero length, which the
    // form would then ask somebody to classify.
    expect(legs.every((l) => l.lengthM > 1)).toBe(true);
  });

  it('measures the lengths it was built from', () => {
    const legs = ringToLegs(ring);
    expect(legs[0]!.lengthM).toBeCloseTo(80, 3);
    expect(legs[1]!.lengthM).toBeCloseTo(40, 3);
    expect(legs[2]!.lengthM).toBeCloseTo(80, 3);
    expect(legs[3]!.lengthM).toBeCloseTo(40, 3);
  });

  it('bears east, north, west and south, in that order', () => {
    const legs = ringToLegs(ring);
    expect(legs[0]!.bearingDeg).toBeCloseTo(90, 3);
    expect(legs[1]!.bearingDeg).toBeCloseTo(0, 3);
    expect(legs[2]!.bearingDeg).toBeCloseTo(270, 3);
    expect(legs[3]!.bearingDeg).toBeCloseTo(180, 3);
  });

  it('never reports a bearing of 360', () => {
    // North is 0. A ring whose first leg came out as 360 would sort, compare and
    // print differently from the identical plot drawn the other way round.
    for (const leg of ringToLegs(rectangle(55.27, 25.2, 50, 50))) {
      expect(leg.bearingDeg).toBeGreaterThanOrEqual(0);
      expect(leg.bearingDeg).toBeLessThan(360);
    }
  });

  it('gives an area for comparison, in both winding directions', () => {
    expect(ringAreaM2(ring)).toBeCloseTo(3200, 1);
    expect(ringAreaM2([...ring].reverse())).toBeCloseTo(3200, 1);
  });

  it('reports nothing for a ring that is not one', () => {
    expect(ringToLegs([])).toEqual([]);
    expect(ringToLegs([{ lng: 55.27, lat: 25.2 }])).toEqual([]);
    expect(ringAreaM2([{ lng: 55.27, lat: 25.2 }])).toBe(0);
  });
});
