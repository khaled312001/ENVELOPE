/**
 * A CEILING ON THE ROUTES THAT COST CPU, PER CLIENT.
 *
 * A run is synchronous engine work — the envelope fixpoint, a parking layout, two
 * independent check layers — and so are the comparison (two runs), affection-plan
 * intake (a PDF parse) and the exports. On shared hosting that CPU is not this
 * process's alone: the account's other sites draw on the same LVE allowance, and a
 * loop hitting `POST /api/runs` would slow all of them, not just this one.
 *
 * So each client gets a fixed number of these requests per minute. Fixed window,
 * in memory, per process: the deployment runs one process, and a limit that resets
 * on restart is still a limit. Reading and navigating are not counted — only work.
 *
 * THE KEY IS THE CLIENT ADDRESS, as the nearest trusted proxy saw it. With
 * `trustProxy` set to the number of proxies in front, Fastify's `request.ip` is the
 * `X-Forwarded-For` entry that many hops out — written by a proxy, not the visitor.
 * Without it, it is the socket peer, which behind a proxy is the proxy: every visitor
 * then shares one bucket and the limit throttles the site rather than a client. With
 * `true` it is the left-most entry, which the visitor writes, and a forged address per
 * request is a fresh bucket per request. Both failures were measured on the deployed
 * host before `TRUST_PROXY` became a hop count (`main.ts`, `proxyHops`).
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

export interface Throttle {
  (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply | undefined>;
}

export function createThrottle(perMinute: number, now: () => number = Date.now): Throttle {
  const windows = new Map<string, { start: number; count: number }>();
  const WINDOW_MS = 60_000;

  return async (request, reply) => {
    const t = now();
    // Sweep on the way in rather than on a timer: a timer would keep an idle
    // process awake, and on this host an idle process is one that may be reaped.
    if (windows.size > 5_000) {
      for (const [k, w] of windows) if (t - w.start >= WINDOW_MS) windows.delete(k);
    }

    const key = request.ip || 'unknown';
    const w = windows.get(key);
    if (!w || t - w.start >= WINDOW_MS) {
      windows.set(key, { start: t, count: 1 });
      return undefined;
    }
    w.count += 1;
    if (w.count <= perMinute) return undefined;

    const retryAfter = Math.max(1, Math.ceil((w.start + WINDOW_MS - t) / 1000));
    // Returned, not just sent: an async hook that sends must hand the reply back
    // or Fastify carries on into the handler.
    return reply
      .code(429)
      .header('retry-after', String(retryAfter))
      .send({
        error: 'TooManyRequests',
        message:
          `this address has started ${perMinute} computations in the last minute, which is ` +
          `the limit here. Wait ${retryAfter} seconds and try again — nothing you entered is lost.`,
      });
  };
}
