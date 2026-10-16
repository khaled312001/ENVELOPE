/**
 * The building outline under a click, fetched by the server for the browser.
 *
 * ---------------------------------------------------------------------------
 * WHY THE BROWSER DOES NOT ASK OPENSTREETMAP ITSELF ANY MORE.
 *
 * It did, and on 14 Oct 2026 "Pick a building" failed on every click. The
 * public Overpass server answers a request from a browser `406 Not Acceptable`
 * and the same query sent with an identifying User-Agent `200`, measured side
 * by side the same afternoon. A page cannot set its own User-Agent — the header
 * is forbidden to `fetch` — so no change to the screen could fix it. The
 * server can, and it is also what Overpass's usage policy asks of an
 * application: to say who is calling.
 *
 * Nothing here is engine work and nothing here is traced. It returns OSM's own
 * geometry and tags, trimmed to what the picker reads, and the picker's own
 * refusals (`none-here`, `not-a-ring`) stay where they were, in `PlotMap`.
 * A picked outline is still only a starting trace the reader corrects.
 *
 * ---------------------------------------------------------------------------
 * ONE SERVER IS NOT ENOUGH, SO THE MIRRORS ARE ASKED TOO — LATE.
 *
 * The main instance took 22 s to answer that afternoon and the two mirrors
 * did not answer inside 40 s; on another call one mirror answered in 75 s. So
 * each server is started a few seconds after the one before it (a hedged
 * request), the first good answer wins and the rest are cancelled. A quick
 * answer from the main server costs the mirrors nothing; a slow one does not
 * leave the reader waiting on it alone.
 *
 * ---------------------------------------------------------------------------
 * AND OVERPASS IS NOT ASKED FIRST.
 *
 * Within the hour all three were down together: 504 from the main server,
 * nothing from either mirror in 60 s. Overpass is a query engine run on
 * donated machines, and a picker that leans on it alone fails on the
 * afternoons it is busy. The same OpenStreetMap buildings are published as
 * vector tiles by OpenFreeMap, a static file on a CDN, which answered in
 * 0.38 s. So the tile is read first, and Overpass is asked only when the tile
 * cannot answer: no building there (Overpass also knows plots by their
 * landuse), or the one under the click crosses the tile's edge, where the tile
 * holds only a clipped piece of it.
 */

import { VectorTile, classifyRings } from '@mapbox/vector-tile';
import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify';
import { PbfReader } from 'pbf';
import { z } from 'zod';

/** In the order they are asked. The first is the public instance; the others are its listed mirrors. */
export const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
] as const;

/** Who is asking, as Overpass's policy wants it said. The site's address, never a person's. */
const USER_AGENT = 'Plotlogic/1.0 (plot outline lookup; +https://plotlogic.dev)';

/** How long after one server the next is asked. */
const HEDGE_MS = 6_000;
/** Past this the reader is told the data could not be reached, rather than kept waiting. */
const GIVE_UP_MS = 45_000;
/** One villa plot, not one neighbourhood — the radius the picker has always used. */
const RADIUS_M = 40;
const M_PER_DEG_LAT = 111_320;

/* The UAE and a margin: a click outside it is not a plot this product reads. */
const query = z.object({
  lat: z.coerce.number().min(22).max(27),
  lng: z.coerce.number().min(51).max(57),
});

export interface FootprintWay {
  readonly geometry: readonly { readonly lat: number; readonly lon: number }[];
  readonly tags: Readonly<Record<string, string>>;
}

/** The tags the picker reads. The rest of OSM's record is not ours to pass on. */
const KEPT_TAGS = ['building', 'landuse', 'name'] as const;

function overpassQuery(lat: number, lng: number): string {
  // A box rather than `around`: the public servers answer a box far sooner, and the picker chooses inside it anyway.
  const dLat = RADIUS_M / M_PER_DEG_LAT;
  const dLng = RADIUS_M / (M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));
  const box = `${(lat - dLat).toFixed(6)},${(lng - dLng).toFixed(6)},${(lat + dLat).toFixed(6)},${(lng + dLng).toFixed(6)}`;
  return `[out:json][timeout:25];(way["building"](${box});way["landuse"](${box}););out geom;`;
}

function trim(elements: unknown): FootprintWay[] {
  if (!Array.isArray(elements)) return [];
  const out: FootprintWay[] = [];
  for (const e of elements as { geometry?: unknown; tags?: Record<string, unknown> }[]) {
    if (!Array.isArray(e.geometry)) continue;
    const geometry = (e.geometry as { lat?: unknown; lon?: unknown }[])
      .filter((g): g is { lat: number; lon: number } => typeof g.lat === 'number' && typeof g.lon === 'number')
      .map((g) => ({ lat: g.lat, lon: g.lon }));
    const tags: Record<string, string> = {};
    for (const k of KEPT_TAGS) {
      const v = e.tags?.[k];
      if (typeof v === 'string') tags[k] = v;
    }
    out.push({ geometry, tags });
  }
  return out;
}

/**
 * Ask the servers in turn, a few seconds apart, and keep the first good answer.
 *
 * Resolves `null` when none answered usefully before `giveUpMs` — never throws,
 * because "could not be reached" is an answer the screen has words for.
 */
export async function fetchFootprintWays(
  lat: number,
  lng: number,
  fetchImpl: typeof fetch = fetch,
  timing: { readonly hedgeMs: number; readonly giveUpMs: number } = { hedgeMs: HEDGE_MS, giveUpMs: GIVE_UP_MS },
): Promise<FootprintWay[] | null> {
  const body = new URLSearchParams({ data: overpassQuery(lat, lng) }).toString();
  const controllers: AbortController[] = [];
  const timers: ReturnType<typeof setTimeout>[] = [];

  const ask = async (url: string): Promise<FootprintWay[]> => {
    const controller = new AbortController();
    controllers.push(controller);
    const res = await fetchImpl(url, {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json', 'user-agent': USER_AGENT },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`${url} answered ${res.status}`);
    const json = (await res.json()) as { elements?: unknown };
    return trim(json.elements);
  };

  try {
    return await new Promise<FootprintWay[] | null>((resolve) => {
      let next = 0;
      let running = 0;
      // The next server: on the hedge clock, or at once when one refuses — a 406 in 300 ms is not a reason to wait 6 s.
      const start = (): void => {
        const url = OVERPASS_SERVERS[next];
        if (url === undefined) return;
        next += 1;
        running += 1;
        ask(url).then(resolve, () => {
          running -= 1;
          if (next < OVERPASS_SERVERS.length) start();
          else if (running === 0) resolve(null);
        });
      };
      start();
      for (let i = 1; i < OVERPASS_SERVERS.length; i += 1) timers.push(setTimeout(start, i * timing.hedgeMs));
      timers.push(setTimeout(() => resolve(null), timing.giveUpMs));
    });
  } finally {
    for (const t of timers) clearTimeout(t);
    for (const c of controllers) c.abort();
  }
}

/* =========================================================================
   THE TILE, READ FIRST
   ========================================================================= */

/** OpenFreeMap's TileJSON. The tile path inside it carries a weekly build stamp, so it is read, not written down. */
const TILEJSON_URL = 'https://tiles.openfreemap.org/planet';
/** The deepest zoom the tiles are built to: every building is in it, unsimplified. */
const TILE_Z = 14;
const TILE_TIMEOUT_MS = 8_000;
const TILEJSON_TTL_MS = 6 * 60 * 60 * 1000;

let tileTemplate: { at: number; url: string } | null = null;

async function tileUrlTemplate(fetchImpl: typeof fetch): Promise<string> {
  if (tileTemplate && Date.now() - tileTemplate.at < TILEJSON_TTL_MS) return tileTemplate.url;
  const res = await fetchImpl(TILEJSON_URL, { headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(TILE_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`TileJSON answered ${res.status}`);
  const url = ((await res.json()) as { tiles?: unknown }).tiles;
  if (!Array.isArray(url) || typeof url[0] !== 'string') throw new Error('TileJSON names no tiles');
  tileTemplate = { at: Date.now(), url: url[0] };
  return url[0];
}

/** Web Mercator, tile space: the fraction of the way across the world, times 2^z. */
const tileX = (lng: number, n: number): number => ((lng + 180) / 360) * n;
const tileY = (lat: number, n: number): number => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
};
const lngOf = (x: number, n: number): number => (x / n) * 360 - 180;
const latOf = (y: number, n: number): number => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;

function contains(ring: readonly { x: number; y: number }[], p: { x: number; y: number }): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i]!;
    const b = ring[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/**
 * The buildings within reach of the click, off the z14 tiles that cover it.
 *
 * `null` means "ask Overpass": nothing within reach, or the building under the
 * click is clipped at a tile edge. A tile carries a margin of its neighbours'
 * buildings cut off at that margin, so a ring with a vertex outside the tile is
 * a piece, never the building — it is left out, and it is the one building
 * whose being clicked sends the request on. Throws when the tiles cannot be
 * fetched, which the caller also treats as "ask Overpass".
 */
export async function footprintFromTiles(lat: number, lng: number, fetchImpl: typeof fetch = fetch): Promise<FootprintWay[] | null> {
  const n = 2 ** TILE_Z;
  const dLat = RADIUS_M / M_PER_DEG_LAT;
  const dLng = RADIUS_M / (M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));
  // Reach, in world tile units: x grows east, y grows south.
  const reach = { x0: tileX(lng - dLng, n), x1: tileX(lng + dLng, n), y0: tileY(lat + dLat, n), y1: tileY(lat - dLat, n) };
  const click = { x: tileX(lng, n), y: tileY(lat, n) };

  const template = await tileUrlTemplate(fetchImpl);
  const ways: FootprintWay[] = [];
  let clickedClipped = false;
  for (let tx = Math.floor(reach.x0); tx <= Math.floor(reach.x1); tx += 1) {
    for (let ty = Math.floor(reach.y0); ty <= Math.floor(reach.y1); ty += 1) {
      const url = template.replace('{z}', String(TILE_Z)).replace('{x}', String(tx)).replace('{y}', String(ty));
      const res = await fetchImpl(url, { headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(TILE_TIMEOUT_MS) });
      if (res.status === 204 || res.status === 404) continue; // an empty tile: nothing built there
      if (!res.ok) throw new Error(`tile ${tx}/${ty} answered ${res.status}`);
      const layer = new VectorTile(new PbfReader(new Uint8Array(await res.arrayBuffer()))).layers['building'];
      if (!layer) continue;
      const e = layer.extent;
      for (let i = 0; i < layer.length; i += 1) {
        const f = layer.feature(i);
        if (f.type !== 3) continue;
        for (const polygon of classifyRings(f.loadGeometry())) {
          const outer = polygon[0];
          if (!outer || outer.length < 4) continue;
          // In world tile units, so one test serves every tile.
          const ring = outer.map((p) => ({ x: tx + p.x / e, y: ty + p.y / e }));
          const xs = ring.map((p) => p.x);
          const ys = ring.map((p) => p.y);
          if (Math.max(...xs) < reach.x0 || Math.min(...xs) > reach.x1 || Math.max(...ys) < reach.y0 || Math.min(...ys) > reach.y1) continue;
          const clipped = outer.some((p) => p.x < 0 || p.x > e || p.y < 0 || p.y > e);
          if (clipped) {
            if (contains(ring, click)) clickedClipped = true;
            continue;
          }
          // The tile closes each ring by repeating its first point, as an OSM way does; the picker drops it.
          ways.push({ geometry: ring.map((p) => ({ lat: latOf(p.y, n), lon: lngOf(p.x, n) })), tags: { building: 'yes' } });
        }
      }
    }
  }
  const underClick = ways.some((w) => contains(w.geometry.map((g) => ({ x: tileX(g.lon, n), y: tileY(g.lat, n) })), click));
  if (clickedClipped && !underClick) return null;
  return ways.length > 0 ? ways : null;
}

/* =========================================================================
   THE ROAD BESIDE EACH BOUNDARY
   ========================================================================= */

/*
  WHAT LIES OUTSIDE EACH BOUNDARY, READ OFF THE MAP AS A SUGGESTION.

  Eng. Mohamed, 16 Oct 2026: the boundaries' classes should come up by
  themselves, from the affection plan and from where the plot sits on the map,
  and stay changeable. The sheet answers part of it — it prints ROAD or the
  neighbouring plot's number outside each side — and says nothing about how
  important a road is. The map does: OpenStreetMap ranks every road it draws,
  and the same OpenFreeMap tiles the footprint picker reads carry that rank.

  So a boundary is matched to a road that runs alongside it — within 30° of
  parallel, on the OUTSIDE of the plot, its centreline within 40 m (a 23.5 m
  road's centreline is about 12 m off the plot line; an arterial's carriageway
  can be farther), for at least a third of the boundary's length — and the
  nearest such road wins. Nothing here is engine work and nothing is traced: it
  is a suggestion the screen puts in the boundary's field with its source
  written beside it, and the reader files the plot or changes it.

  THE RANK IS OSM'S, TRANSLATED BY A STATED CONVENTION, never a measurement:
  motorway, trunk and primary are arterial; secondary and tertiary collector;
  minor local; service access. A footway, a track or a tram line is not a road
  a car can enter a plot from, so it is not offered at all.
*/

export const ROAD_HIERARCHY_OF_OSM: Readonly<Record<string, 'ARTERIAL' | 'COLLECTOR' | 'LOCAL' | 'ACCESS'>> = {
  motorway: 'ARTERIAL',
  trunk: 'ARTERIAL',
  primary: 'ARTERIAL',
  secondary: 'COLLECTOR',
  tertiary: 'COLLECTOR',
  minor: 'LOCAL',
  service: 'ACCESS',
};

/** How far outside a boundary a road's centreline may be and still be the road beside it. */
const ROAD_REACH_M = 40;
/** How much of a boundary a road must run along. */
const ROAD_MIN_OVERLAP = 1 / 3;
/** Within 30° of parallel. */
const ROAD_MAX_SKEW = Math.sin((30 * Math.PI) / 180);

export interface MapRoad {
  readonly osmClass: string;
  readonly name?: string;
  readonly nameAr?: string;
  readonly line: readonly { readonly lng: number; readonly lat: number }[];
}

export interface RoadBeside {
  readonly seq: number;
  readonly road: {
    readonly osmClass: string;
    readonly hierarchy: 'ARTERIAL' | 'COLLECTOR' | 'LOCAL' | 'ACCESS';
    readonly name: string | null;
    readonly nameAr: string | null;
    /** From the boundary to the road's centreline, rounded to the metre — said, never computed from. */
    readonly distanceM: number;
  } | null;
}

/**
 * For each boundary of `ring` (boundary i runs from corner i to corner i+1),
 * the road beside it on the map, or null. Pure, so it is tested without a tile.
 */
export function roadsBesideEdges(
  ring: readonly { readonly lng: number; readonly lat: number }[],
  roads: readonly MapRoad[],
): RoadBeside[] {
  const lat0 = ring.reduce((s, p) => s + p.lat, 0) / ring.length;
  const lng0 = ring.reduce((s, p) => s + p.lng, 0) / ring.length;
  const kx = M_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);
  const local = (p: { lng: number; lat: number }): { x: number; y: number } => ({ x: (p.lng - lng0) * kx, y: (p.lat - lat0) * M_PER_DEG_LAT });
  const pts = ring.map(local);
  let twice = 0;
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length]!;
    twice += p.x * q.y - q.x * p.y;
  });
  // Counter-clockwise, the inside is on the left of travel and the outside on the right.
  const outward = twice > 0 ? 1 : -1;
  const lines = roads
    .filter((r) => ROAD_HIERARCHY_OF_OSM[r.osmClass] !== undefined)
    .map((r) => ({ road: r, pts: r.line.map(local) }));

  return pts.map((a, seq) => {
    const b = pts[(seq + 1) % pts.length]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len === 0) return { seq, road: null };
    const ux = (b.x - a.x) / len;
    const uy = (b.y - a.y) / len;
    // The outward normal: the direction a step off the plot goes.
    const nx = uy * outward;
    const ny = -ux * outward;
    let best: { road: MapRoad; distance: number } | null = null;
    for (const { road, pts: line } of lines) {
      let overlap = 0;
      let weighted = 0;
      for (let k = 0; k + 1 < line.length; k += 1) {
        const p = line[k]!;
        const q = line[k + 1]!;
        const sl = Math.hypot(q.x - p.x, q.y - p.y);
        if (sl === 0 || Math.abs(((q.x - p.x) * uy - (q.y - p.y) * ux) / sl) > ROAD_MAX_SKEW) continue;
        const t0 = (p.x - a.x) * ux + (p.y - a.y) * uy;
        const t1 = (q.x - a.x) * ux + (q.y - a.y) * uy;
        const lo = Math.max(0, Math.min(t0, t1));
        const hi = Math.min(len, Math.max(t0, t1));
        if (hi <= lo) continue;
        // The off-plot distance at the middle of the stretch that lies alongside the boundary.
        const f = ((lo + hi) / 2 - t0) / (t1 - t0);
        const mx = p.x + (q.x - p.x) * f;
        const my = p.y + (q.y - p.y) * f;
        const off = (mx - a.x) * nx + (my - a.y) * ny;
        if (off <= 0 || off > ROAD_REACH_M) continue;
        overlap += hi - lo;
        weighted += off * (hi - lo);
      }
      if (overlap < len * ROAD_MIN_OVERLAP) continue;
      const distance = weighted / overlap;
      if (best === null || distance < best.distance) best = { road, distance };
    }
    if (best === null) return { seq, road: null };
    return {
      seq,
      road: {
        osmClass: best.road.osmClass,
        hierarchy: ROAD_HIERARCHY_OF_OSM[best.road.osmClass]!,
        name: best.road.name ?? null,
        nameAr: best.road.nameAr ?? null,
        distanceM: Math.round(best.distance),
      },
    };
  });
}

/**
 * The roads within reach of the ring, off the z14 tiles that cover it — each
 * line cut to its own tile, so a road drawn in two tiles' margins is not
 * counted twice. Names come from the tiles' name layer, matched to a road of
 * the same class that runs within a few metres of it.
 */
export async function roadsFromTiles(
  ring: readonly { readonly lng: number; readonly lat: number }[],
  fetchImpl: typeof fetch = fetch,
): Promise<MapRoad[]> {
  const n = 2 ** TILE_Z;
  const lat0 = ring.reduce((s, p) => s + p.lat, 0) / ring.length;
  const dLat = ROAD_REACH_M / M_PER_DEG_LAT;
  const dLng = ROAD_REACH_M / (M_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180));
  const lngs = ring.map((p) => p.lng);
  const lats = ring.map((p) => p.lat);
  const reach = {
    x0: tileX(Math.min(...lngs) - dLng, n),
    x1: tileX(Math.max(...lngs) + dLng, n),
    y0: tileY(Math.max(...lats) + dLat, n),
    y1: tileY(Math.min(...lats) - dLat, n),
  };
  const template = await tileUrlTemplate(fetchImpl);
  const roads: MapRoad[] = [];
  const named: { osmClass: string; name?: string; nameAr?: string; pts: { x: number; y: number }[] }[] = [];
  for (let tx = Math.floor(reach.x0); tx <= Math.floor(reach.x1); tx += 1) {
    for (let ty = Math.floor(reach.y0); ty <= Math.floor(reach.y1); ty += 1) {
      const url = template.replace('{z}', String(TILE_Z)).replace('{x}', String(tx)).replace('{y}', String(ty));
      const res = await fetchImpl(url, { headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(TILE_TIMEOUT_MS) });
      if (res.status === 204 || res.status === 404) continue;
      if (!res.ok) throw new Error(`tile ${tx}/${ty} answered ${res.status}`);
      const tile = new VectorTile(new PbfReader(new Uint8Array(await res.arrayBuffer())));
      const ways = tile.layers['transportation'];
      if (ways) {
        const e = ways.extent;
        for (let i = 0; i < ways.length; i += 1) {
          const f = ways.feature(i);
          const osmClass = String(f.properties['class'] ?? '');
          if (f.type !== 2 || ROAD_HIERARCHY_OF_OSM[osmClass] === undefined) continue;
          for (const part of f.loadGeometry()) {
            for (const piece of clipToTile(part, e)) {
              roads.push({ osmClass, line: piece.map((p) => ({ lat: latOf(ty + p.y / e, n), lng: lngOf(tx + p.x / e, n) })) });
            }
          }
        }
      }
      const names = tile.layers['transportation_name'];
      if (names) {
        const e = names.extent;
        for (let i = 0; i < names.length; i += 1) {
          const f = names.feature(i);
          const name = f.properties['name:en'] ?? f.properties['name:latin'] ?? f.properties['name'];
          const nameAr = f.properties['name:ar'];
          if (f.type !== 2 || (typeof name !== 'string' && typeof nameAr !== 'string')) continue;
          for (const part of f.loadGeometry()) {
            named.push({
              osmClass: String(f.properties['class'] ?? ''),
              ...(typeof name === 'string' ? { name } : {}),
              ...(typeof nameAr === 'string' ? { nameAr } : {}),
              pts: part.map((p) => ({ x: (tx + p.x / e) * 256, y: (ty + p.y / e) * 256 })),
            });
          }
        }
      }
    }
  }
  if (named.length === 0) return roads;
  // A road takes the name of a named line of its class that passes within about 4 m (a z14 pixel ≈ 7 m in Dubai, so half of one).
  return roads.map((r) => {
    const mid = r.line[Math.floor(r.line.length / 2)]!;
    const at = { x: tileX(mid.lng, n) * 256, y: tileY(mid.lat, n) * 256 };
    const hit = named.find((nm) => nm.osmClass === r.osmClass && nearLine(nm.pts, at, 0.6));
    return hit ? { ...r, ...(hit.name ? { name: hit.name } : {}), ...(hit.nameAr ? { nameAr: hit.nameAr } : {}) } : r;
  });
}

/** The pieces of a tile line that lie inside the tile itself, not its margin. */
function clipToTile(line: readonly { x: number; y: number }[], e: number): { x: number; y: number }[][] {
  const inside = (p: { x: number; y: number }): boolean => p.x >= 0 && p.x <= e && p.y >= 0 && p.y <= e;
  const pieces: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];
  for (let k = 0; k < line.length; k += 1) {
    const p = line[k]!;
    if (inside(p)) {
      if (current.length === 0 && k > 0) current.push(edgePoint(line[k - 1]!, p, e));
      current.push({ x: p.x, y: p.y });
    } else if (current.length > 0) {
      current.push(edgePoint(p, current[current.length - 1]!, e));
      pieces.push(current);
      current = [];
    }
  }
  if (current.length > 1) pieces.push(current);
  return pieces.filter((piece) => piece.length > 1);
}

/** Where the segment from an outside point to an inside one crosses the tile's edge. */
function edgePoint(out: { x: number; y: number }, inn: { x: number; y: number }, e: number): { x: number; y: number } {
  // Along out → inn, the first parameter at which every coordinate is inside.
  const dx = inn.x - out.x;
  const dy = inn.y - out.y;
  const enter = (o: number, d: number): number => (o < 0 ? -o / d : o > e ? (e - o) / d : 0);
  const s = Math.max(enter(out.x, dx), enter(out.y, dy));
  return { x: out.x + dx * s, y: out.y + dy * s };
}

function nearLine(pts: readonly { x: number; y: number }[], at: { x: number; y: number }, within: number): boolean {
  for (let k = 0; k + 1 < pts.length; k += 1) {
    const p = pts[k]!;
    const q = pts[k + 1]!;
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const l2 = dx * dx + dy * dy;
    const s = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((at.x - p.x) * dx + (at.y - p.y) * dy) / l2));
    if (Math.hypot(p.x + dx * s - at.x, p.y + dy * s - at.y) <= within) return true;
  }
  return false;
}

/** `lng,lat;lng,lat;…` — three to sixty-four corners, every one in the UAE. */
const ringQuery = z.object({
  ring: z
    .string()
    .max(4000)
    .transform((s, ctx) => {
      const ring = s.split(';').map((pair) => {
        const [lng, lat] = pair.split(',').map(Number);
        return { lng: lng ?? NaN, lat: lat ?? NaN };
      });
      if (ring.length < 3 || ring.length > 64 || ring.some((p) => !(p.lng >= 51 && p.lng <= 57 && p.lat >= 22 && p.lat <= 27))) {
        ctx.addIssue({ code: 'custom', message: 'ring must be 3 to 64 lng,lat corners in the UAE' });
        return z.NEVER;
      }
      return ring;
    }),
});

const roadCache = new Map<string, { at: number; edges: RoadBeside[] }>();

/* A click on the same spot twice is one lookup. Small, and forgotten after a day. */
const CACHE_LIMIT = 200;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; ways: FootprintWay[] }>();

export function registerGeoRoutes(
  app: FastifyInstance,
  costly: { readonly preHandler?: preHandlerAsyncHookHandler } = {},
  fetchImpl: typeof fetch = fetch,
): void {
  app.get('/api/geo/footprint', costly, async (request, reply) => {
    const parsed = query.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'lat and lng must be a point in the UAE' });
    }
    const { lat, lng } = parsed.data;
    // About a metre: two clicks that close are on the same outline.
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return { elements: hit.ways };

    const fromTiles = await footprintFromTiles(lat, lng, fetchImpl).catch((error: unknown) => {
      request.log.warn({ error: String(error) }, 'footprint tiles unavailable; asking Overpass');
      return null;
    });
    const ways = fromTiles ?? (await fetchFootprintWays(lat, lng, fetchImpl));
    if (ways === null) {
      return reply.code(502).send({ error: 'OpenStreetMap could not be reached' });
    }
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
    cache.set(key, { at: Date.now(), ways });
    return { elements: ways };
  });

  app.get('/api/geo/roads', costly, async (request, reply) => {
    const parsed = ringQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'ring must be 3 to 64 lng,lat corners in the UAE' });
    }
    const ring = parsed.data.ring;
    // About a metre per corner: the same ring traced twice is one lookup.
    const key = ring.map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(';');
    const hit = roadCache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return { edges: hit.edges };
    let roads: MapRoad[];
    try {
      roads = await roadsFromTiles(ring, fetchImpl);
    } catch (error) {
      request.log.warn({ error: String(error) }, 'road tiles unavailable');
      return reply.code(502).send({ error: 'OpenStreetMap could not be reached' });
    }
    const edges = roadsBesideEdges(ring, roads);
    if (roadCache.size >= CACHE_LIMIT) roadCache.delete(roadCache.keys().next().value as string);
    roadCache.set(key, { at: Date.now(), edges });
    return { edges };
  });
}
