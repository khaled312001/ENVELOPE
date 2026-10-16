/**
 * The footprint lookup, without a network.
 *
 * What is worth holding here is the behaviour the screen depends on: the
 * request says who is calling (the public server refuses a browser and admits
 * an identified caller), a refusing server hands over to the next at once, a
 * slow one is overtaken, and nothing reachable is `null` rather than a throw.
 */

import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import { fetchFootprintWays, type MapRoad, OVERPASS_SERVERS, registerGeoRoutes, ROAD_HIERARCHY_OF_OSM, roadsBesideEdges } from '../src/geo-route.js';

const AT = { lat: 25.2916, lng: 55.3525 };
const FAST = { hedgeMs: 50, giveUpMs: 500 };
const WAY = { geometry: [{ lat: 25.29, lon: 55.35 }], tags: { building: 'yes', name: 'A', 'addr:street': 'not passed on' } };

type Call = { url: string; init: RequestInit };

/** A fetch that answers each server as `plan` says: a status, or a delay then 200. */
function stub(plan: Record<string, number | { delayMs: number }>, calls: Call[] = []): typeof fetch {
  return (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const p = plan[url] ?? 503;
    if (typeof p === 'object') {
      await new Promise((r, reject) => {
        const t = setTimeout(r, p.delayMs);
        init.signal?.addEventListener('abort', () => {
          clearTimeout(t);
          reject(new Error('aborted'));
        });
      });
      return { ok: true, status: 200, json: async () => ({ elements: [WAY] }) };
    }
    return { ok: p === 200, status: p, json: async () => ({ elements: [WAY] }) };
  }) as unknown as typeof fetch;
}

const [MAIN, MIRROR_A, MIRROR_B] = OVERPASS_SERVERS;

describe('fetchFootprintWays', () => {
  it('says who is calling, which is what the public server admits', async () => {
    const calls: Call[] = [];
    await fetchFootprintWays(AT.lat, AT.lng, stub({ [MAIN]: 200 }, calls), FAST);
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers['user-agent']).toMatch(/^Plotlogic\//);
    expect(headers['user-agent']).not.toMatch(/@/); // a site address, never a person's
  });

  it('passes on only the tags the picker reads', async () => {
    const ways = await fetchFootprintWays(AT.lat, AT.lng, stub({ [MAIN]: 200 }), FAST);
    expect(ways).toEqual([{ geometry: WAY.geometry, tags: { building: 'yes', name: 'A' } }]);
  });

  it('moves to a mirror at once when a server refuses', async () => {
    const calls: Call[] = [];
    const started = Date.now();
    const ways = await fetchFootprintWays(AT.lat, AT.lng, stub({ [MAIN]: 406, [MIRROR_A]: 200 }, calls), {
      hedgeMs: 5_000,
      giveUpMs: 10_000,
    });
    expect(ways).toHaveLength(1);
    expect(calls.map((c) => c.url)).toEqual([MAIN, MIRROR_A]);
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it('lets a mirror overtake a slow server', async () => {
    const ways = await fetchFootprintWays(
      AT.lat,
      AT.lng,
      stub({ [MAIN]: { delayMs: 400 }, [MIRROR_A]: 200 }),
      { hedgeMs: 50, giveUpMs: 2_000 },
    );
    expect(ways).toHaveLength(1);
  });

  it('answers null, not a throw, when nothing can be reached', async () => {
    expect(await fetchFootprintWays(AT.lat, AT.lng, stub({ [MAIN]: 406, [MIRROR_A]: 504, [MIRROR_B]: 429 }), FAST)).toBeNull();
    expect(await fetchFootprintWays(AT.lat, AT.lng, stub({ [MAIN]: { delayMs: 5_000 } }), FAST)).toBeNull();
  });
});

describe('GET /api/geo/footprint', () => {
  const app = async (fetchImpl: typeof fetch) => {
    const a = Fastify();
    registerGeoRoutes(a, {}, fetchImpl);
    await a.ready();
    return a;
  };

  it('refuses a point outside the UAE', async () => {
    const a = await app(stub({}));
    const res = await a.inject({ method: 'GET', url: '/api/geo/footprint?lat=51.5&lng=-0.12' });
    expect(res.statusCode).toBe(400);
    await a.close();
  });

  /* The tiles are asked first and Overpass only after them; here the tiles
     cannot be reached, which must cost the reader nothing but the fallback. */
  it('reads the tiles first, and falls back to Overpass when they cannot answer', async () => {
    const calls: Call[] = [];
    const a = await app(stub({ [MAIN]: 200 }, calls));
    const res = await a.inject({ method: 'GET', url: `/api/geo/footprint?lat=${AT.lat}&lng=${AT.lng}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().elements[0].tags).toEqual({ building: 'yes', name: 'A' });
    expect(calls[0]!.url).toContain('openfreemap');
    expect(calls[1]!.url).toBe(MAIN);
    await a.close();
  });
});

/*
  The road beside each boundary. A 60 × 40 m plot near Dubai, built in metres
  and turned into degrees, with roads laid around it on purpose: one that
  qualifies, one that is not a road a car uses, one too short, one inside the
  plot, and two on one side where the nearer must win.
*/
describe('roadsBesideEdges', () => {
  const LAT0 = 25.2;
  const LNG0 = 55.3;
  const KX = 111_320 * Math.cos((LAT0 * Math.PI) / 180);
  const at = (x: number, y: number) => ({ lng: LNG0 + x / KX, lat: LAT0 + y / 111_320 });
  // Counter-clockwise: south (0), east (1), north (2), west (3).
  const RING = [at(0, 0), at(60, 0), at(60, 40), at(0, 40)];
  const ROADS: MapRoad[] = [
    { osmClass: 'secondary', name: 'Test Street', line: [at(-20, -12), at(80, -12)] },
    { osmClass: 'path', line: [at(68, -10), at(68, 50)] },
    { osmClass: 'minor', line: [at(40, 50), at(50, 50)] },
    { osmClass: 'minor', line: [at(-10, 35), at(70, 35)] },
    { osmClass: 'service', line: [at(-6, -5), at(-6, 45)] },
    { osmClass: 'primary', line: [at(-30, -5), at(-30, 45)] },
  ];

  it('finds the road alongside each boundary, outside it, and names a frontage by its main road', () => {
    const out = roadsBesideEdges(RING, ROADS);
    // West: a service road at 6 m and a primary at 30 m are one corridor, and the primary names it.
    expect(out.map((e) => e.road?.hierarchy ?? null)).toEqual(['COLLECTOR', null, null, 'ARTERIAL']);
    expect(out[0]!.road).toMatchObject({ osmClass: 'secondary', name: 'Test Street', distanceM: 12 });
    expect(out[3]!.road).toMatchObject({ osmClass: 'primary', distanceM: 30 });
  });

  it('does not reach past the nearest road’s corridor for a bigger one', () => {
    // A local road at 5 m; a primary 38 m out is more than 30 m beyond it, behind something else.
    const out = roadsBesideEdges(RING, [
      { osmClass: 'minor', line: [at(-10, -5), at(70, -5)] },
      { osmClass: 'primary', line: [at(-10, -38), at(70, -38)] },
    ]);
    expect(out[0]!.road).toMatchObject({ osmClass: 'minor', hierarchy: 'LOCAL', distanceM: 5 });
  });

  it('gives the same answer for the ring walked the other way', () => {
    const reversed = [...RING].reverse();
    // Reversed, the ring starts at the north-west corner: 0 is north, 1 east, 2 south, 3 west.
    const out = roadsBesideEdges(reversed, ROADS);
    expect(out.map((e) => e.road?.hierarchy ?? null)).toEqual([null, null, 'COLLECTOR', 'ARTERIAL']);
  });

  it('maps OSM ranks to the four hierarchies by a stated table, and leaves a footway out', () => {
    expect(ROAD_HIERARCHY_OF_OSM['motorway']).toBe('ARTERIAL');
    expect(ROAD_HIERARCHY_OF_OSM['tertiary']).toBe('COLLECTOR');
    expect(ROAD_HIERARCHY_OF_OSM['minor']).toBe('LOCAL');
    expect(ROAD_HIERARCHY_OF_OSM['path']).toBeUndefined();
  });
});

describe('GET /api/geo/roads', () => {
  it('refuses a ring outside the UAE or with too few corners', async () => {
    const a = Fastify();
    registerGeoRoutes(a, {}, (async () => new Response(null, { status: 500 })) as typeof fetch);
    expect((await a.inject({ url: '/api/geo/roads?ring=55.3,25.2;55.31,25.2' })).statusCode).toBe(400);
    expect((await a.inject({ url: '/api/geo/roads?ring=2.3,48.8;2.31,48.8;2.31,48.81' })).statusCode).toBe(400);
    await a.close();
  });

  it('says the map could not be reached rather than answering every boundary "none"', async () => {
    const a = Fastify();
    registerGeoRoutes(a, {}, (async () => new Response(null, { status: 503 })) as typeof fetch);
    const res = await a.inject({ url: '/api/geo/roads?ring=55.3,25.2;55.301,25.2;55.301,25.201' });
    expect(res.statusCode).toBe(502);
    await a.close();
  });
});
