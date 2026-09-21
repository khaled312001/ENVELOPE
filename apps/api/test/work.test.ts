/**
 * `/api/work` — the first route in this product with any authorization at all.
 *
 * `CLAUDE.md` discloses the state of the rest: *"no authorization at all: any
 * identified actor can read, gate and export any run"*, and records that per-author
 * scoping was **considered and rejected**, because G4 is signed by a reviewer who is
 * deliberately not the author.
 *
 * These tests exist to hold both halves of the resolution at once. The isolation has
 * to be real — an account must not see another account's run — AND the reviewer flow
 * has to survive it, because an isolation that breaks G4 has traded a disclosure for
 * a broken gate. The two tests that matter are `does not list another account's run`
 * and `a reviewer share is what lets G4 happen at all`; the rest support them.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { SqliteAccountRepository } from '../src/account-store.js';
import { SqliteRunRepository, type StoredRun } from '../src/store.js';
import { build } from '../src/server.js';

let app: FastifyInstance;
let accounts: SqliteAccountRepository;
let runs: SqliteRunRepository;

function cookieFrom(headers: Record<string, unknown>): string {
  const raw = headers['set-cookie'];
  const list = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
  for (const c of list) {
    const m = /(?:^|;\s*)envelope_session=([^;]*)/.exec(c);
    if (m && m[1]) return `envelope_session=${m[1]}`;
  }
  throw new Error('no session cookie was set');
}

/** A stored run is a lot of JSON; only the fields `summariseRun` reads matter here. */
function storedRun(runId: string, actorId: string, actorName: string): StoredRun {
  return {
    runId,
    tenantId: 't1',
    plotId: `plot-${runId}`,
    parentRunId: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    createdByActorId: actorId,
    createdByActorName: actorName,
    engineVersion: '0.1.0',
    annexVersion: '0.1.0-UNSIGNED',
    ruleSetHash: 'hash',
    input: '{}',
    output: JSON.stringify({
      plot: { plotNumber: `P-${runId}`, community: 'Al Warsan First', areaM2: '1365.23' },
      capacity: {
        governingBand: 'PARKING',
        governingGfa: { value: '6774.194' },
        levels: { value: '5' },
        governingConstraint: { ruleId: 'parking.bay_area_factor', label: 'Parking' },
      },
      assumptions: [{ parameterId: 'parking.bay_area_factor' }],
    }),
    report: '{}',
    fingerprint: `fp-${runId}`,
    draftRules: true,
    gates: '{}',
  };
}

async function signUp(email: string): Promise<{ cookie: string; accountId: string }> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: 'a correct horse battery', name: email.split('@')[0] },
  });
  return { cookie: cookieFrom(res.headers), accountId: res.json().account.accountId };
}

beforeEach(async () => {
  accounts = new SqliteAccountRepository();
  runs = new SqliteRunRepository();
  app = await build(runs, accounts);
});

afterEach(async () => {
  await app.close();
  await accounts.close();
  await runs.close();
});

describe('/api/work', () => {
  it('refuses a reader with no account, and says what an account is for', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/work' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toMatch(/kept against an account/i);
  });

  it('is not reachable by asserting a header', async () => {
    // The header path is an assertion anyone can make. It identifies; it does not
    // authenticate, and this is the one route where that distinction is the feature.
    const res = await app.inject({
      method: 'GET',
      url: '/api/work',
      headers: { 'x-actor-id': 'somebody', 'x-actor-name': 'Somebody' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('lists what this account authored', async () => {
    const a = await signUp('author@example.com');
    await runs.insert(storedRun('r1', a.accountId, 'Author'));
    const res = await app.inject({ method: 'GET', url: '/api/work', headers: { cookie: a.cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.json().authored.map((r: { runId: string }) => r.runId)).toEqual(['r1']);
  });

  it('does not list another account’s run', async () => {
    // The whole point. `/api/runs` still lists everything to any identified actor —
    // that hole is disclosed and open — and this route is the first surface that
    // does not open it.
    const a = await signUp('author@example.com');
    const b = await signUp('other@example.com');
    await runs.insert(storedRun('r1', a.accountId, 'Author'));
    const res = await app.inject({ method: 'GET', url: '/api/work', headers: { cookie: b.cookie } });
    expect(res.json().authored).toEqual([]);
    expect(res.json().shared).toEqual([]);
  });

  it('a reviewer share is what lets G4 happen at all', async () => {
    /*
      The test that holds the design together.

      `CLAUDE.md` rejected per-author scoping precisely because G4 is signed by
      somebody who is not the author, and an isolation that hid the run from that
      person would have broken the one flow the gate exists for. The share is the
      answer: the author names who will sign, and the run becomes reachable by that
      account and by no other.
    */
    const author = await signUp('author@example.com');
    const reviewer = await signUp('reviewer@example.com');
    const stranger = await signUp('stranger@example.com');
    await runs.insert(storedRun('r1', author.accountId, 'Author'));

    const shared = await app.inject({
      method: 'POST',
      url: '/api/runs/r1/share',
      headers: { cookie: author.cookie },
      payload: { email: 'reviewer@example.com', role: 'reviewer' },
    });
    expect(shared.statusCode).toBe(200);

    const seen = await app.inject({
      method: 'GET',
      url: '/api/work',
      headers: { cookie: reviewer.cookie },
    });
    expect(seen.json().shared.map((r: { runId: string }) => r.runId)).toEqual(['r1']);
    expect(seen.json().shared[0].sharedRole).toBe('reviewer');
    // And the grant is to one account, not to everyone who hears about the run.
    const not = await app.inject({
      method: 'GET',
      url: '/api/work',
      headers: { cookie: stranger.cookie },
    });
    expect(not.json().shared).toEqual([]);
  });

  it('lets only the author share', async () => {
    const author = await signUp('author@example.com');
    const other = await signUp('other@example.com');
    await runs.insert(storedRun('r1', author.accountId, 'Author'));
    const res = await app.inject({
      method: 'POST',
      url: '/api/runs/r1/share',
      headers: { cookie: other.cookie },
      payload: { email: 'other@example.com', role: 'reader' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('answers the same whether or not the email is an account', async () => {
    // An author who can enumerate the customer list one address at a time is still
    // an author who can enumerate the customer list.
    const author = await signUp('author@example.com');
    await runs.insert(storedRun('r1', author.accountId, 'Author'));
    const real = await app.inject({
      method: 'POST',
      url: '/api/runs/r1/share',
      headers: { cookie: author.cookie },
      payload: { email: 'author@example.com', role: 'reader' },
    });
    const fake = await app.inject({
      method: 'POST',
      url: '/api/runs/r1/share',
      headers: { cookie: author.cookie },
      payload: { email: 'nobody-at-all@example.com', role: 'reader' },
    });
    expect(real.statusCode).toBe(fake.statusCode);
    expect(real.json()).toEqual(fake.json());
  });

  it('refuses a role the server does not recognise', async () => {
    const author = await signUp('author@example.com');
    await runs.insert(storedRun('r1', author.accountId, 'Author'));
    const res = await app.inject({
      method: 'POST',
      url: '/api/runs/r1/share',
      headers: { cookie: author.cookie },
      payload: { email: 'author@example.com', role: 'owner' },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('carries the open drafts, so the list can offer to resume one', async () => {
    const a = await signUp('author@example.com');
    await app.inject({
      method: 'PUT',
      url: '/api/drafts/plot-form',
      headers: { cookie: a.cookie },
      payload: { payload: { width: '50.85' } },
    });
    const res = await app.inject({ method: 'GET', url: '/api/work', headers: { cookie: a.cookie } });
    expect(res.json().drafts).toEqual([
      { draftKey: 'plot-form', updatedAt: expect.any(String) },
    ]);
  });
});
