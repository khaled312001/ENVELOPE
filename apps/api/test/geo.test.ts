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

import { fetchFootprintWays, OVERPASS_SERVERS, registerGeoRoutes } from '../src/geo-route.js';

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
