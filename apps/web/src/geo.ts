/**
 * WGS84 → UTM zone 40N, and back.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS AT ALL, AND WHY IT IS SIXTY LINES RATHER THAN A DEPENDENCY.
 *
 * `Point` in `@envelope/core` is "a point on the 1 mm grid, in the local metric
 * CRS (UTM 40N)". A map hands back degrees of longitude and latitude. Something
 * has to convert, and the conversion has to be the SAME projection the kernel
 * already declares or every length the engine computes is in a different space
 * from the one the user drew in.
 *
 * UTM zone 40N is the UAE's own zone — 54°E to 60°E, Dubai at ~55.3°E sits
 * comfortably inside it, well away from the edges where a zone's distortion is
 * worst. That is not a coincidence the code should rely on silently, so
 * `toUtm40` REFUSES a longitude outside the zone rather than returning a number
 * that is wrong by metres.
 *
 * ---------------------------------------------------------------------------
 * THIS IS A MEASUREMENT, NOT A SURVEY, AND THE DIFFERENCE IS THE WHOLE POINT.
 *
 * The transverse Mercator series below is the standard one and is accurate to
 * well under a millimetre within a zone. That accuracy says nothing about the
 * accuracy of the INPUT: a vertex clicked on a satellite tile carries the
 * tile's own georeferencing error, the operator's aim, and the fact that a roof
 * is not a plot boundary. On a 50 m frontage that is routinely 2–5%, which is
 * exactly the band `FR-PLT-001 AC2` blocks on.
 *
 * So nothing in this module may be used to produce a dimension a user is shown
 * as fact. Its output seeds a traverse, every leg of which is typed over by a
 * reader holding the affection plan — which is the client's own description of
 * what he wants: *«لو هي مش مظبوطة، أنا أظبّط الرقم»* (4 Oct 2026, 12:40).
 */

/** Degrees of longitude and latitude, WGS84, in the order a map hands them over. */
export interface LngLat {
  readonly lng: number;
  readonly lat: number;
}

/** Easting and northing in metres, UTM zone 40N. */
export interface Utm {
  readonly e: number;
  readonly n: number;
}

/* WGS84, and the two UTM constants. Named rather than inlined because every one
   of them appears twice and a typo in the second copy is a projection that is
   subtly wrong in one direction only. */
const A = 6378137.0; //            semi-major axis, metres
const F = 1 / 298.257223563; //    flattening
const K0 = 0.9996; //              UTM scale factor on the central meridian
const E0 = 500000.0; //            false easting
const ZONE = 40;
const LON0 = (ZONE - 1) * 6 - 180 + 3; //  57°E, zone 40's central meridian

const E2 = F * (2 - F); //         first eccentricity squared
const EP2 = E2 / (1 - E2); //      second eccentricity squared

const rad = (d: number): number => (d * Math.PI) / 180;
const deg = (r: number): number => (r * 180) / Math.PI;

/** True where a longitude is inside zone 40 (54°E–60°E). */
export function inZone40(lng: number): boolean {
  return lng >= 54 && lng < 60;
}

/**
 * Forward projection. Throws outside the zone rather than projecting anyway.
 *
 * A point one zone over does not fail loudly on its own — it comes back as a
 * plausible easting that is kilometres wrong, which would then be dimensioned,
 * drawn and exported. Degenerate geometry raises in this codebase; so does this.
 */
export function toUtm40({ lng, lat }: LngLat): Utm {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    throw new Error(`toUtm40: not a coordinate (${lng}, ${lat})`);
  }
  if (!inZone40(lng)) {
    throw new Error(
      `toUtm40: longitude ${lng}° is outside UTM zone 40N (54°E–60°E). ` +
        `The kernel's CRS is zone 40 and projecting another zone into it is ` +
        `wrong by kilometres, not by millimetres.`,
    );
  }
  if (lat <= 0 || lat >= 84) {
    throw new Error(`toUtm40: latitude ${lat}° is outside the northern UTM band`);
  }

  const phi = rad(lat);
  const lam = rad(lng);
  const lam0 = rad(LON0);

  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const tanPhi = Math.tan(phi);

  const N = A / Math.sqrt(1 - E2 * sinPhi * sinPhi);
  const T = tanPhi * tanPhi;
  const C = EP2 * cosPhi * cosPhi;
  const Aa = (lam - lam0) * cosPhi;

  /* Meridional arc. The four-term series; the next term is below a millimetre
     at these latitudes and is left out for that reason rather than forgotten. */
  const M =
    A *
    ((1 - E2 / 4 - (3 * E2 * E2) / 64 - (5 * E2 * E2 * E2) / 256) * phi -
      ((3 * E2) / 8 + (3 * E2 * E2) / 32 + (45 * E2 * E2 * E2) / 1024) * Math.sin(2 * phi) +
      ((15 * E2 * E2) / 256 + (45 * E2 * E2 * E2) / 1024) * Math.sin(4 * phi) -
      ((35 * E2 * E2 * E2) / 3072) * Math.sin(6 * phi));

  const e =
    E0 +
    K0 *
      N *
      (Aa +
        ((1 - T + C) * Aa ** 3) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * EP2) * Aa ** 5) / 120);

  const n =
    K0 *
    (M +
      N *
        tanPhi *
        ((Aa * Aa) / 2 +
          ((5 - T + 9 * C + 4 * C * C) * Aa ** 4) / 24 +
          ((61 - 58 * T + T * T + 600 * C - 330 * EP2) * Aa ** 6) / 720));

  return { e, n };
}

/**
 * Inverse projection, so a ring held in the kernel's CRS can be drawn back onto
 * the map it was traced on.
 *
 * Without this the map is write-only: a reader who typed a corrected length
 * would see the form's own diagram update and the satellite view stay on the
 * shape they first clicked, which is two drawings of one plot disagreeing — the
 * defect `pnpm parity` exists to catch between the screen, the paper and the DXF.
 */
export function fromUtm40({ e, n }: Utm): LngLat {
  const x = e - E0;
  const y = n / K0;

  const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));
  const mu = y / (A * (1 - E2 / 4 - (3 * E2 * E2) / 64 - (5 * E2 * E2 * E2) / 256));

  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);

  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const tanPhi1 = Math.tan(phi1);

  const C1 = EP2 * cosPhi1 * cosPhi1;
  const T1 = tanPhi1 * tanPhi1;
  const N1 = A / Math.sqrt(1 - E2 * sinPhi1 * sinPhi1);
  const R1 = (A * (1 - E2)) / (1 - E2 * sinPhi1 * sinPhi1) ** 1.5;
  const D = x / (N1 * K0);

  const phi =
    phi1 -
    ((N1 * tanPhi1) / R1) *
      ((D * D) / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * EP2) * D ** 4) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * EP2 - 3 * C1 * C1) * D ** 6) / 720);

  const lam =
    rad(LON0) +
    (D -
      ((1 + 2 * T1 + C1) * D ** 3) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * EP2 + 24 * T1 * T1) * D ** 5) / 120) /
      cosPhi1;

  return { lng: deg(lam), lat: deg(phi) };
}

/**
 * One traced boundary: its length in metres and its bearing in degrees
 * clockwise from grid north.
 *
 * GRID north, not true north, and the difference is named because it is the
 * kind of thing that is discovered in a submission rather than in a test. The
 * bearing is measured in the projected plane, so it carries UTM's convergence —
 * up to about 1.5° away from the central meridian, and roughly 1° across Dubai.
 * The affection plan's bearings are the authority and these are a starting
 * point, which is the same relationship the lengths have.
 */
export interface TracedLeg {
  readonly lengthM: number;
  readonly bearingDeg: number;
}

/** `[0, 360)` — a bearing of exactly 360 is north and should read as 0. */
const norm360 = (d: number): number => ((d % 360) + 360) % 360;

/**
 * Turn a traced ring into the traverse the plot form already speaks.
 *
 * THE RING IS CLOSED BY THE CALLER'S LAST LEG, NOT BY REPEATING A VERTEX. The
 * form walks legs and closes the figure itself; handing it a duplicated first
 * point would add a zero-length boundary that then wants a classification.
 */
export function ringToLegs(ring: readonly LngLat[]): readonly TracedLeg[] {
  if (ring.length < 3) return [];
  const pts = ring.map(toUtm40);
  const legs: TracedLeg[] = [];
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    const de = b.e - a.e;
    const dn = b.n - a.n;
    legs.push({
      lengthM: Math.hypot(de, dn),
      // atan2(east, north) is the bearing convention: 0 is north, 90 is east.
      bearingDeg: norm360(deg(Math.atan2(de, dn))),
    });
  }
  return legs;
}

/**
 * Area of a traced ring in m², by the shoelace formula in the projected plane.
 *
 * FOR COMPARISON ONLY. It is shown beside the affection plan's stated area so a
 * trace that is wildly off is visible immediately, and it is never submitted:
 * the engine computes the area from the ring the TYPED traverse produces.
 */
export function ringAreaM2(ring: readonly LngLat[]): number {
  if (ring.length < 3) return 0;
  const p = ring.map(toUtm40);
  let twice = 0;
  for (let i = 0; i < p.length; i += 1) {
    const a = p[i]!;
    const b = p[(i + 1) % p.length]!;
    twice += a.e * b.n - b.e * a.n;
  }
  return Math.abs(twice) / 2;
}
