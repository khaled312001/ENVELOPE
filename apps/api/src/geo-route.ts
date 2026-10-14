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
}
