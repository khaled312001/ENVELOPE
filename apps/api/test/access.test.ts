/**
 * ONE ACCESS RULE, EVERY ROUTE — `src/access.ts`.
 *
 * `CLAUDE.md` disclosed the defect this closes: "any identified actor can read, gate
 * and export any run". The tests are written as the attack rather than as the
 * feature: somebody else's run id, tried on every route that takes one. A test that
 * only checked the author could read their own run would pass on the old server.
 *
 * Runs here are real engine runs, not stored fixtures, because the gate records and
 * provenance a reviewer can see are what made the account-id impersonation route
 * possible in the first place — a fixture would not carry them.
 */

import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SqliteAccountRepository } from '../src/account-store.js';
import { optionsFromEnv } from '../src/main.js';
import { build, type BuildOptions } from '../src/server.js';
import { SqliteRunRepository } from '../src/store.js';
import { subjectHash } from '../src/gates.js';

process.env['LOG_LEVEL'] = 'silent';

const PLOT = {
  plotNumber: '345-1234',
  community: 'TEST',
  landUse: 'RESIDENTIAL_MULTI' as const,
  vertices: [
    { x: '0', y: '0' },
    { x: '80', y: '0' },
    { x: '80', y: '40' },
    { x: '0', y: '40' },
  ],
  edges: [
    { seq: 0, classification: 'ROAD' as const, roadHierarchy: 'LOCAL' as const },
    { seq: 1, classification: 'ADJACENT_PLOT' as const },
    { seq: 2, classification: 'ROAD' as const, roadHierarchy: 'LOCAL' as const },
    { seq: 3, classification: 'ADJACENT_PLOT' as const },
  ],
};

const RUN_BODY = {
  parkingInFar: 'EXCLUDED_FROM_FAR' as const,
  unitMix: {
    source: 'USER_SET' as const,
    entries: [
      { typeId: '1BED', label: '1 bedroom', share: '0.5', nsaM2: '70' },
      { typeId: '2BED', label: '2 bedroom', share: '0.5', nsaM2: '110' },
    ],
  },
  parkingLevelsAvailable: 2,
  parkingUsableFraction: {
    value: '0.85',
    source: 'ASSUMED' as const,
    basis: 'the usable fraction of a parking level after cores, ramps and plant',
  },
  saleableEfficiency: {
    value: '0.93',
    source: 'USER_SET' as const,
    basis: 'the conservative end of the saleable-to-GFA range in the project brief on file',
  },
  realismDiscount: '1.00',
  useDraftRules: true,
};

const ALICE = { 'x-actor-id': 'guest-alice', 'x-actor-name': 'Alice', 'x-actor-licence': 'DM-1' };
const MALLORY = { 'x-actor-id': 'guest-mallory', 'x-actor-name': 'Mallory', 'x-actor-licence': 'DM-2' };

let app: FastifyInstance;
let runs: SqliteRunRepository;
let accounts: SqliteAccountRepository;
/** Set by `start`; the option-parsing tests at the end never open a server. */
let open = false;

async function start(options: BuildOptions = {}): Promise<void> {
  runs = new SqliteRunRepository();
  accounts = new SqliteAccountRepository();
  app = await build(runs, accounts, options);
  open = true;
}

afterEach(async () => {
  if (!open) return;
  open = false;
  await app.close();
  await accounts.close();
  await runs.close();
});

async function plotAndRun(
  headers: Record<string, string>,
): Promise<{ plotId: string; runId: string; run: Record<string, unknown> }> {
  const plot = await app.inject({ method: 'POST', url: '/api/plots', headers, payload: PLOT });
  expect(plot.statusCode).toBe(201);
  const plotId = plot.json().plotId as string;
  const run = await app.inject({
    method: 'POST',
    url: '/api/runs',
    headers,
    payload: { ...RUN_BODY, plotId },
  });
  expect(run.statusCode).toBe(201);
  return { plotId, runId: run.json().runId as string, run: run.json() };
}

function cookieFrom(headers: Record<string, unknown>): string {
  const raw = headers['set-cookie'];
  const list = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
  for (const c of list) {
    const m = /(?:^|;\s*)envelope_session=([^;]*)/.exec(c);
    if (m && m[1]) return `envelope_session=${m[1]}`;
  }
  throw new Error('no session cookie was set');
}

async function signUp(
  email: string,
  licence?: string,
): Promise<{ cookie: string; accountId: string }> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email,
      password: 'a correct horse battery',
      name: email.split('@')[0],
      ...(licence ? { licence } : {}),
    },
  });
  expect(res.statusCode).toBe(201);
  return { cookie: cookieFrom(res.headers), accountId: res.json().account.accountId };
}

describe('somebody else’s run, on every route that takes one', () => {
  beforeEach(() => start());

  it('is not found — not forbidden — for reading, derivation and export', async () => {
    const { runId, run } = await plotAndRun(ALICE);
    const nodeId = (run['capacity'] as { governingGfa: { node: string } }).governingGfa.node;
    expect(nodeId).toBeTruthy();

    for (const [method, url] of [
      ['GET', `/api/runs/${runId}`],
      ['GET', `/api/runs/${runId}/provenance/${nodeId}`],
      ['POST', `/api/runs/${runId}/export?format=json`],
      ['POST', `/api/runs/${runId}/export?format=dxf`],
    ] as const) {
      const theirs = await app.inject({ method, url, headers: MALLORY });
      // The same answer as an id that never existed, so the id is not confirmed.
      expect({ url, status: theirs.statusCode }).toEqual({ url, status: 404 });
      expect(theirs.json().message).toBe('run not found');
    }

    // And the author is not locked out by the same check — on the same URLs, so a
    // 404 above cannot be a route that 404s for everyone.
    for (const url of [`/api/runs/${runId}`, `/api/runs/${runId}/provenance/${nodeId}`]) {
      const own = await app.inject({ method: 'GET', url, headers: ALICE });
      expect({ url, status: own.statusCode }).toEqual({ url, status: 200 });
    }
  });

  it('cannot be acknowledged or signed by a stranger', async () => {
    const { runId, run } = await plotAndRun(ALICE);
    for (const gate of ['G1_PLOT_CONFIRMED', 'G4_REVIEWER_NAMED'] as const) {
      const res = await app.inject({
        method: 'POST',
        url: `/api/runs/${runId}/gates`,
        headers: MALLORY,
        payload: { gate, subjectHash: subjectHash(run[gate === 'G1_PLOT_CONFIRMED' ? 'plot' : 'capacity']) },
      });
      expect(res.statusCode).toBe(404);
    }
  });

  it('is absent from every list', async () => {
    await plotAndRun(ALICE);
    const mine = await plotAndRun(MALLORY);

    const listed = (await app.inject({ method: 'GET', url: '/api/runs', headers: MALLORY })).json();
    expect(listed.runs.map((r: { runId: string }) => r.runId)).toEqual([mine.runId]);
    expect(listed.total).toBe(1);

    const plots = (await app.inject({ method: 'GET', url: '/api/plots', headers: MALLORY })).json();
    expect(plots.plots.map((p: { plotId: string }) => p.plotId)).toEqual([mine.plotId]);

    // The status page aggregates assumption exposure across runs — basis strings
    // somebody typed. Other people's runs are not in its sample.
    const dash = (await app.inject({ method: 'GET', url: '/api/dashboard', headers: MALLORY })).json();
    expect(dash.recentRuns.map((r: { runId: string }) => r.runId)).toEqual([mine.runId]);
  });

  it('keeps the plot too: no reading it, and no running the engine on it', async () => {
    const { plotId } = await plotAndRun(ALICE);
    expect((await app.inject({ method: 'GET', url: `/api/plots/${plotId}`, headers: MALLORY })).statusCode).toBe(404);
    for (const url of ['/api/runs', '/api/runs/parking-in-far-comparison']) {
      const res = await app.inject({ method: 'POST', url, headers: MALLORY, payload: { ...RUN_BODY, plotId } });
      expect({ url, status: res.statusCode }).toEqual({ url, status: 404 });
    }
  });
});

/**
 * "FROM ANY ROUTE" — THE ROUTER'S LIST, NOT THIS FILE'S.
 *
 * Every test above names its URLs by hand, and a hand-written list is complete only on
 * the day it is written: a route added next month passes all of them by not being in
 * them. The acceptance line for accounts is that no account sees another's run *from
 * any route*, so the routes are read out of the server itself, each one must be
 * classified here, and then every route is attacked according to its class. A new
 * route fails this file until its author has said which kind it is — which is the
 * moment that question should be asked, and the only moment anyone reliably asks it.
 *
 * HEAD is left out because Fastify answers it with the GET handler, and the one
 * OPTIONS route is the CORS preflight, which reads nothing.
 */
type Reach =
  /** Names a run in its path. A stranger gets the answer a missing id gets. */
  | 'run'
  /** Names a run and needs a session. A signed-in stranger gets the same. */
  | 'run-session'
  /** Names a plot, in its path or its body. A stranger gets 404. */
  | 'plot'
  /** Names an organisation in its path. A non-member gets 404, for the same reason. */
  | 'workspace'
  /** Answers about the caller. Must carry nobody else's run or plot. */
  | 'own'
  /** Carries no run and no plot, for anybody. */
  | 'open';

const ROUTES: Readonly<Record<string, Reach>> = {
  'GET /api/health': 'open',
  'GET /api/definitions': 'open',
  'GET /api/rules': 'open',
  'GET /api/standards': 'open',
  'POST /api/intake/affection-plan': 'open',
  'POST /api/auth/register': 'open',
  'POST /api/auth/login': 'open',
  'POST /api/auth/logout': 'open',
  'POST /api/auth/logout-everywhere': 'open',
  'POST /api/plots': 'open',
  'GET /api/auth/me': 'own',
  /* The two account-editing routes. `own` and not `open`: both refuse a caller
     with no session, and both answer about the caller and nobody else. Neither
     can name a run or a plot — the profile route cannot even name an email, which
     is why `auth.test.ts` asserts that a posted `email` field is stripped. */
  'PATCH /api/auth/me': 'own',
  'POST /api/auth/password': 'own',
  'GET /api/drafts': 'own',
  'GET /api/drafts/:key': 'own',
  'PUT /api/drafts/:key': 'own',
  'DELETE /api/drafts/:key': 'own',
  'GET /api/dashboard': 'own',
  'GET /api/runs': 'own',
  'GET /api/plots': 'own',
  'GET /api/work': 'own',
  'GET /api/plots/:plotId': 'plot',
  'POST /api/runs': 'plot',
  'POST /api/runs/parking-in-far-comparison': 'plot',
  'GET /api/runs/:runId': 'run',
  'GET /api/runs/:runId/provenance/:nodeId': 'run',
  'POST /api/runs/:runId/gates': 'run',
  'POST /api/runs/:runId/export': 'run',
  'POST /api/runs/:runId/share': 'run-session',
  /* Tenancy. `GET`/`POST /api/orgs` answer about the caller's own memberships and
     name nobody else's workspace; everything under `/api/orgs/:orgId` names one,
     and is therefore attacked as a workspace below. The two invite routes carry a
     TOKEN rather than an id — a bearer credential, checked against the signed-in
     account's own email, so they answer about the caller. */
  'GET /api/orgs': 'own',
  'POST /api/orgs': 'own',
  'POST /api/invites/preview': 'own',
  'POST /api/invites/accept': 'own',
  'GET /api/orgs/:orgId': 'workspace',
  'PATCH /api/orgs/:orgId': 'workspace',
  'GET /api/orgs/:orgId/audit': 'workspace',
  'POST /api/orgs/:orgId/invites': 'workspace',
  'DELETE /api/orgs/:orgId/invites/:inviteId': 'workspace',
  'PATCH /api/orgs/:orgId/members/:accountId': 'workspace',
  'DELETE /api/orgs/:orgId/members/:accountId': 'workspace',
};

/** "METHOD /path" for every route the server registered, from its own route tree. */
async function registeredRoutes(): Promise<string[]> {
  await app.ready();
  const out: string[] = [];
  const stack: string[] = [];
  for (const line of app.printRoutes({ commonPrefix: false }).split('\n')) {
    const m = /^((?:[│ ] {3})*)[├└]── (\S+)(?: \(([^)]+)\))?/.exec(line);
    if (!m) continue;
    stack.length = (m[1] ?? '').length / 4;
    stack.push(m[2] ?? '');
    for (const method of (m[3] ?? '').split(', ').filter(Boolean)) {
      if (method === 'HEAD' || method === 'OPTIONS') continue;
      out.push(`${method} ${stack.join('')}`);
    }
  }
  return out;
}

describe('"from any route" — the router’s list, not this file’s', () => {
  beforeEach(() => start());

  it('classifies every route the server registers, and none it does not', async () => {
    const registered = await registeredRoutes();
    // A parser that found nothing would make the next assertion compare two lists
    // this file wrote. It must find the routes it is checking.
    expect(registered.length).toBeGreaterThan(20);
    expect([...registered].sort()).toEqual(Object.keys(ROUTES).sort());
  });

  it('answers a stranger 404 on every route that names somebody else’s run or plot', async () => {
    const author = await signUp('author@example.com');
    const stranger = await signUp('stranger@example.com', 'DM-7');
    const { plotId, runId, run } = await plotAndRun({ cookie: author.cookie });
    const nodeId = (run['capacity'] as { governingGfa: { node: string } }).governingGfa.node;

    const request = (route: string): { method: 'GET' | 'POST'; url: string; payload?: object } => {
      const [method, path] = route.split(' ') as ['GET' | 'POST', string];
      const url = path.replace(':runId', runId).replace(':plotId', plotId).replace(':nodeId', nodeId);
      if (route.endsWith('/export')) return { method, url: `${url}?format=json` };
      if (route.endsWith('/gates')) {
        return { method, url, payload: { gate: 'G4_REVIEWER_NAMED', subjectHash: subjectHash(run['capacity']) } };
      }
      // The stranger trying to share the author's run with themselves.
      if (route.endsWith('/share')) return { method, url, payload: { email: 'stranger@example.com', role: 'reviewer' } };
      if (method === 'POST') return { method, url, payload: { ...RUN_BODY, plotId } };
      return { method, url };
    };

    const attacked = Object.entries(ROUTES).filter(([, r]) => r === 'run' || r === 'run-session' || r === 'plot');
    expect(attacked.length).toBeGreaterThan(0);

    // Strangers first: the author's own calls below include a share, and after it
    // the stranger would no longer be one.
    for (const [route, reach] of attacked) {
      const as = reach === 'run-session' ? [{ cookie: stranger.cookie }] : [MALLORY, { cookie: stranger.cookie }];
      for (const headers of as) {
        const res = await app.inject({ ...request(route), headers });
        expect({ route, status: res.statusCode }).toEqual({ route, status: 404 });
      }
    }

    // The same requests from the author are not 404, so each 404 above is about who
    // asked, and not a route that answers 404 to everybody.
    for (const [route] of attacked) {
      const res = await app.inject({ ...request(route), headers: { cookie: author.cookie } });
      expect({ route, notFound: res.statusCode === 404 }).toEqual({ route, notFound: false });
    }
  });

  it('answers a non-member 404 on every route that names somebody else’s workspace', async () => {
    const owner = await signUp('owner@example.com');
    const stranger = await signUp('stranger@example.com');

    const created = await app.inject({
      method: 'POST',
      url: '/api/orgs',
      headers: { cookie: owner.cookie },
      payload: { name: 'Dubai Design Partners' },
    });
    expect(created.statusCode).toBe(201);
    const orgId = created.json().orgId as string;

    const request = (
      route: string,
    ): { method: 'GET' | 'POST' | 'PATCH' | 'DELETE'; url: string; payload?: object } => {
      const [method, path] = route.split(' ') as ['GET' | 'POST' | 'PATCH' | 'DELETE', string];
      const url = path
        .replace(':orgId', orgId)
        .replace(':inviteId', 'inv-does-not-matter')
        .replace(':accountId', owner.accountId);
      if (route.includes('/invites') && method === 'POST') {
        return { method, url, payload: { email: 'stranger@example.com', role: 'owner' } };
      }
      if (method === 'PATCH' && route.includes('/members/')) return { method, url, payload: { role: 'owner' } };
      if (method === 'PATCH') return { method, url, payload: { name: 'Taken Over' } };
      return { method, url };
    };

    const attacked = Object.entries(ROUTES).filter(([, r]) => r === 'workspace');
    expect(attacked.length).toBeGreaterThan(0);

    for (const [route] of attacked) {
      for (const headers of [MALLORY, { cookie: stranger.cookie }]) {
        const res = await app.inject({ ...request(route), headers });
        // A guest gets 401 (a workspace belongs to accounts); a signed-in
        // non-member gets 404, which is the same answer an id that never
        // existed gets. Neither is 200, and neither is 403 — a 403 would
        // confirm the workspace is real.
        const expected = 'cookie' in headers ? 404 : 401;
        expect({ route, status: res.statusCode }).toEqual({ route, status: expected });
      }
    }

    // The workspace is really there, so the 404s above are about who asked.
    const own = await app.inject({
      method: 'GET',
      url: `/api/orgs/${orgId}`,
      headers: { cookie: owner.cookie },
    });
    expect(own.statusCode).toBe(200);
  });

  it('carries nobody else’s run or plot in any answer a stranger can read', async () => {
    const author = await signUp('author@example.com');
    const stranger = await signUp('stranger@example.com');
    const { plotId, runId } = await plotAndRun({ cookie: author.cookie });

    // The search can find what it looks for: the author's own list carries the id.
    const own = await app.inject({ method: 'GET', url: '/api/runs', headers: { cookie: author.cookie } });
    expect(own.body).toContain(runId);

    const readable = Object.entries(ROUTES).filter(
      ([route, r]) => route.startsWith('GET ') && (r === 'own' || r === 'open'),
    );
    for (const [route] of readable) {
      const url = route.slice(4).replace(':key', 'plot-form');
      for (const headers of [MALLORY, { cookie: stranger.cookie }]) {
        const res = await app.inject({ method: 'GET', url, headers });
        expect({ route, run: res.body.includes(runId), plot: res.body.includes(plotId) }).toEqual({
          route,
          run: false,
          plot: false,
        });
      }
    }
  });
});

describe('a share bounds what its holder may do', () => {
  beforeEach(() => start());

  it('lets a reader read and export, and not acknowledge anything', async () => {
    const author = await signUp('author@example.com');
    const reader = await signUp('reader@example.com', 'DM-9');
    const { runId, run } = await plotAndRun({ cookie: author.cookie });

    await app.inject({
      method: 'POST',
      url: `/api/runs/${runId}/share`,
      headers: { cookie: author.cookie },
      payload: { email: 'reader@example.com', role: 'reader' },
    });

    const seen = await app.inject({ method: 'GET', url: `/api/runs/${runId}`, headers: { cookie: reader.cookie } });
    expect(seen.statusCode).toBe(200);
    expect(seen.json().access).toBe('reader');

    const g4 = await app.inject({
      method: 'POST',
      url: `/api/runs/${runId}/gates`,
      headers: { cookie: reader.cookie },
      payload: { gate: 'G4_REVIEWER_NAMED', subjectHash: subjectHash(run['capacity']) },
    });
    expect(g4.statusCode).toBe(403);
    expect(g4.json().message).toMatch(/shared with you as a reader/);
  });

  it('lets a reviewer sign G4 — and only G4', async () => {
    const author = await signUp('author@example.com');
    const reviewer = await signUp('reviewer@example.com', 'DM-12345');
    const { runId, run } = await plotAndRun({ cookie: author.cookie });

    await app.inject({
      method: 'POST',
      url: `/api/runs/${runId}/share`,
      headers: { cookie: author.cookie },
      payload: { email: 'reviewer@example.com', role: 'reviewer' },
    });

    const g4 = await app.inject({
      method: 'POST',
      url: `/api/runs/${runId}/gates`,
      headers: { cookie: reviewer.cookie },
      payload: { gate: 'G4_REVIEWER_NAMED', subjectHash: subjectHash(run['capacity']) },
    });
    expect(g4.statusCode).toBe(200);
    expect(g4.json().gates.G4_REVIEWER_NAMED.actorName).toBe('reviewer');

    // G1–G3 acknowledge the author's inputs; a reviewer does not give them.
    const g1 = await app.inject({
      method: 'POST',
      url: `/api/runs/${runId}/gates`,
      headers: { cookie: reviewer.cookie },
      payload: { gate: 'G1_PLOT_CONFIRMED', subjectHash: subjectHash(run['plot']) },
    });
    expect(g1.statusCode).toBe(403);
  });
});

describe('a header may identify, never impersonate', () => {
  beforeEach(() => start());

  it('refuses a header naming an account — the id a reviewer can read in any gate record', async () => {
    const author = await signUp('author@example.com');
    const res = await app.inject({
      method: 'GET',
      url: '/api/runs',
      headers: { 'x-actor-id': author.accountId, 'x-actor-name': 'Not the author' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().message).toMatch(/belongs to an account/);
  });
});

describe('guest policy', () => {
  it('keyed: a typed name is not a key, a minted key is', async () => {
    await start({ guests: 'keyed' });
    const named = await app.inject({
      method: 'GET',
      url: '/api/runs',
      headers: { 'x-actor-id': 'alice', 'x-actor-name': 'Alice' },
    });
    expect(named.statusCode).toBe(401);
    expect(named.json().message).toMatch(/no guest key/);

    const keyed = await app.inject({
      method: 'GET',
      url: '/api/runs',
      headers: { 'x-actor-id': 'guest-0f8fad5b-d9cb-469f-a165-70867728950e', 'x-actor-name': 'Alice' },
    });
    expect(keyed.statusCode).toBe(200);
  });

  it('off: only a session', async () => {
    await start({ guests: 'off' });
    const res = await app.inject({ method: 'GET', url: '/api/runs', headers: ALICE });
    expect(res.statusCode).toBe(401);
    expect(res.json().message).toMatch(/Sign in/);
  });
});

describe('developer standards', () => {
  it('are withheld, with the reason, when the deployment does not offer them', async () => {
    await start({ developerStandards: false });
    const res = (await app.inject({ method: 'GET', url: '/api/standards', headers: ALICE })).json();
    expect(res.standards).toEqual([]);
    expect(res.brief).toBeNull();
    expect(res.withheld).toMatch(/in confidence/);
    // A withheld response names no developer either.
    expect(JSON.stringify(res)).not.toMatch(/azizi/i);
  });
});

describe('the computation ceiling', () => {
  it('answers 429 with a wait, once a client passes it', async () => {
    await start({ computationsPerMinute: 2 });
    const post = () => app.inject({ method: 'POST', url: '/api/plots', headers: ALICE, payload: PLOT });
    expect((await post()).statusCode).toBe(201);
    expect((await post()).statusCode).toBe(201);
    const third = await post();
    expect(third.statusCode).toBe(429);
    expect(Number(third.headers['retry-after'])).toBeGreaterThan(0);
    expect(third.json().message).toMatch(/nothing you entered is lost/);

    // Reading is not work, and is not counted.
    expect((await app.inject({ method: 'GET', url: '/api/runs', headers: ALICE })).statusCode).toBe(200);
  });

  it('keys on what the proxy saw, so a forged X-Forwarded-For is not a fresh allowance', async () => {
    // One proxy in front. It appends the address it saw; the visitor wrote the rest.
    await start({ computationsPerMinute: 2, trustProxy: 1 });
    const post = (forged: string, visitor = '203.0.113.9') =>
      app.inject({
        method: 'POST',
        url: '/api/plots',
        headers: { ...ALICE, 'x-forwarded-for': `${forged}, ${visitor}` },
        payload: PLOT,
      });
    expect((await post('10.0.0.1')).statusCode).toBe(201);
    expect((await post('10.0.0.2')).statusCode).toBe(201);
    expect((await post('10.0.0.3')).statusCode).toBe(429);
    // And a different visitor, as the proxy reports it, still has their own.
    expect((await post('10.0.0.3', '198.51.100.7')).statusCode).toBe(201);
  });
});

describe('what production asks for by default', () => {
  it('keys guests, withholds standards, limits computation, and trusts exactly the proxies it is told of', () => {
    expect(optionsFromEnv({ NODE_ENV: 'production', TRUST_PROXY: '1' })).toEqual({
      guests: 'keyed',
      developerStandards: false,
      computationsPerMinute: 30,
      trustProxy: 1,
    });
  });

  it('will not guess how many proxies are in front, and will not believe all of them', () => {
    expect(() => optionsFromEnv({ NODE_ENV: 'production' })).toThrow(/TRUST_PROXY must be set/);
    expect(() => optionsFromEnv({ TRUST_PROXY: 'on' })).toThrow(/including the ones a visitor/);
    expect(() => optionsFromEnv({ TRUST_PROXY: 'several' })).toThrow(/Refusing to guess/);
    expect(optionsFromEnv({ NODE_ENV: 'production', TRUST_PROXY: 'off' }).trustProxy).toBe(false);
  });

  it('changes nothing for development', () => {
    expect(optionsFromEnv({})).toEqual({
      guests: 'open',
      developerStandards: true,
      computationsPerMinute: null,
      trustProxy: false,
    });
  });

  it('answers under its mount whether or not the app server strips it', async () => {
    await start({ mountedAt: '/api' });
    for (const url of ['/api/health', '/health']) {
      const res = await app.inject({ method: 'GET', url });
      expect({ url, status: res.statusCode }).toEqual({ url, status: 200 });
    }
  });

  it('refuses a security setting it cannot read, rather than guessing', () => {
    expect(() => optionsFromEnv({ DEVELOPER_STANDARDS: 'maybe' })).toThrow(/Refusing to guess/);
    expect(() => optionsFromEnv({ GUESTS: 'anyone' })).toThrow(/open, keyed or off/);
  });
});
