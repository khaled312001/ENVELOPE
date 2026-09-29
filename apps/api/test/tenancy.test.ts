/**
 * THE ROLES A SCREEN WILL DISPLAY, CHECKED WHERE THEY ARE ENFORCED.
 *
 * `docs/06-plan/platform-plan.md` §6.4: "No roles screen ships before the server
 * enforces the roles it displays." This file is the other half of that sentence.
 *
 * Written as the attack, like `access.test.ts`: every test asks whether somebody
 * can do a thing their role forbids, and the assertions that the RIGHT person can
 * still do it sit next to them — so a handler that refuses everybody cannot pass
 * by refusing the attacker too.
 *
 * Runs are real engine runs. A workspace's whole purpose is that a colleague can
 * open a run they did not make, and a stored fixture would not prove that the
 * provenance, the gate record and the export gate all travel with it.
 */

import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SqliteAccountRepository } from '../src/account-store.js';
import { build } from '../src/server.js';
import { SqliteRunRepository } from '../src/store.js';

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

let app: FastifyInstance;
let runs: SqliteRunRepository;
let accounts: SqliteAccountRepository;

beforeEach(async () => {
  runs = new SqliteRunRepository();
  accounts = new SqliteAccountRepository();
  app = await build(runs, accounts, {});
});

afterEach(async () => {
  await app.close();
  await accounts.close();
  await runs.close();
});

function cookieFrom(headers: Record<string, unknown>): string {
  const raw = headers['set-cookie'];
  const list = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
  for (const c of list) {
    const m = /(?:^|;\s*)envelope_session=([^;]*)/.exec(c);
    if (m && m[1]) return `envelope_session=${m[1]}`;
  }
  throw new Error('no session cookie was set');
}

interface Person {
  readonly accountId: string;
  readonly email: string;
  /** Headers for a plain request: the session cookie, and a licence when one was asserted. */
  readonly headers: Record<string, string>;
  /** The same, plus the workspace this request is being made inside. */
  inside(orgId: string): Record<string, string>;
}

async function signUp(email: string, licence?: string): Promise<Person> {
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
  const headers: Record<string, string> = { cookie: cookieFrom(res.headers) };
  if (licence) headers['x-actor-licence'] = licence;
  return {
    accountId: res.json().account.accountId as string,
    email,
    headers,
    inside: (orgId) => ({ ...headers, 'x-workspace-id': orgId }),
  };
}

async function makeWorkspace(person: Person, name = 'Dubai Design Partners'): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/orgs',
    headers: person.headers,
    payload: { name },
  });
  expect(res.statusCode).toBe(201);
  expect(res.json().role).toBe('owner');
  return res.json().orgId as string;
}

/** Invite, accept, and hand back the role actually held afterwards. */
async function addMember(
  owner: Person,
  orgId: string,
  joiner: Person,
  role: 'admin' | 'member' | 'viewer',
): Promise<void> {
  const invite = await app.inject({
    method: 'POST',
    url: `/api/orgs/${orgId}/invites`,
    headers: owner.headers,
    payload: { email: joiner.email, role },
  });
  expect(invite.statusCode).toBe(201);
  const accepted = await app.inject({
    method: 'POST',
    url: '/api/invites/accept',
    headers: joiner.headers,
    payload: { token: invite.json().token },
  });
  expect(accepted.statusCode).toBe(200);
  expect(accepted.json().role).toBe(role);
}

async function plotAndRun(
  headers: Record<string, string>,
): Promise<{ plotId: string; runId: string }> {
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
  return { plotId, runId: run.json().runId as string };
}

describe('a workspace, and what membership of one is worth', () => {
  it('makes its creator the owner, and nobody else a member', async () => {
    const owner = await signUp('owner@example.com');
    const stranger = await signUp('stranger@example.com');
    const orgId = await makeWorkspace(owner);

    const mine = await app.inject({ method: 'GET', url: '/api/orgs', headers: owner.headers });
    expect(mine.json().organisations).toEqual([
      expect.objectContaining({ orgId, name: 'Dubai Design Partners', role: 'owner' }),
    ]);

    const theirs = await app.inject({ method: 'GET', url: '/api/orgs', headers: stranger.headers });
    expect(theirs.json().organisations).toEqual([]);

    // Not forbidden — not found. The id of a firm is not confirmed to an outsider.
    const peek = await app.inject({
      method: 'GET',
      url: `/api/orgs/${orgId}`,
      headers: stranger.headers,
    });
    expect(peek.statusCode).toBe(404);
    expect(peek.json().message).toBe('organisation not found');
  });

  it('lets a colleague open a run they did not make, and a stranger not', async () => {
    const owner = await signUp('owner@example.com');
    const colleague = await signUp('colleague@example.com');
    const stranger = await signUp('stranger@example.com');
    const orgId = await makeWorkspace(owner);
    await addMember(owner, orgId, colleague, 'member');

    const { runId } = await plotAndRun(owner.inside(orgId));

    const read = await app.inject({
      method: 'GET',
      url: `/api/runs/${runId}`,
      headers: colleague.headers,
    });
    expect(read.statusCode).toBe(200);
    // A workspace role reads as `reviewer` on a run — never as `author`.
    expect(read.json().access).toBe('reviewer');

    const listed = await app.inject({ method: 'GET', url: '/api/runs', headers: colleague.headers });
    expect((listed.json().runs as { runId: string }[]).map((r) => r.runId)).toContain(runId);

    const denied = await app.inject({
      method: 'GET',
      url: `/api/runs/${runId}`,
      headers: stranger.headers,
    });
    expect(denied.statusCode).toBe(404);
    const strangerList = await app.inject({
      method: 'GET',
      url: '/api/runs',
      headers: stranger.headers,
    });
    expect(strangerList.json().runs).toEqual([]);
  });

  it('does not put a personal run into a workspace the author also belongs to', async () => {
    const owner = await signUp('owner@example.com');
    const colleague = await signUp('colleague@example.com');
    const orgId = await makeWorkspace(owner);
    await addMember(owner, orgId, colleague, 'member');

    // No `x-workspace-id`: this is the author's own work, not the firm's.
    const { runId } = await plotAndRun(owner.headers);

    const read = await app.inject({
      method: 'GET',
      url: `/api/runs/${runId}`,
      headers: colleague.headers,
    });
    expect(read.statusCode).toBe(404);
  });

  it('refuses a workspace the actor does not belong to, without failing the run', async () => {
    const owner = await signUp('owner@example.com');
    const outsider = await signUp('outsider@example.com');
    const orgId = await makeWorkspace(owner);

    // A stale tab naming somebody else's workspace computes personally rather
    // than erroring about workspaces on a screen about plots.
    const { runId } = await plotAndRun(outsider.inside(orgId));
    const theirs = await app.inject({
      method: 'GET',
      url: `/api/runs/${runId}`,
      headers: owner.headers,
    });
    expect(theirs.statusCode).toBe(404);
  });
});

describe('member and viewer are a different answer to one question', () => {
  it('lets a member compute on the workspace’s plot and refuses a viewer', async () => {
    const owner = await signUp('owner@example.com');
    const member = await signUp('member@example.com');
    const viewer = await signUp('viewer@example.com');
    const orgId = await makeWorkspace(owner);
    await addMember(owner, orgId, member, 'member');
    await addMember(owner, orgId, viewer, 'viewer');

    const plot = await app.inject({
      method: 'POST',
      url: '/api/plots',
      headers: owner.inside(orgId),
      payload: PLOT,
    });
    const plotId = plot.json().plotId as string;

    // Both may READ the plot — it is the firm's.
    for (const person of [member, viewer]) {
      const res = await app.inject({
        method: 'GET',
        url: `/api/plots/${plotId}`,
        headers: person.headers,
      });
      expect({ who: person.email, status: res.statusCode }).toEqual({
        who: person.email,
        status: 200,
      });
    }

    const byMember = await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: member.inside(orgId),
      payload: { ...RUN_BODY, plotId },
    });
    expect(byMember.statusCode).toBe(201);

    const byViewer = await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: viewer.inside(orgId),
      payload: { ...RUN_BODY, plotId },
    });
    // 403 and not 404: a viewer can already see this plot, so its existence is
    // not the secret. The message says what a viewer is and what to ask for.
    expect(byViewer.statusCode).toBe(403);
    expect(byViewer.json().message).toMatch(/viewer cannot start a run/);
  });
});

describe('the four rules that make “admin” mean less than “owner”', () => {
  it('will not let an admin demote an owner, promote to owner, or invite one', async () => {
    const owner = await signUp('owner@example.com');
    const admin = await signUp('admin@example.com');
    const member = await signUp('member@example.com');
    const outsider = await signUp('outsider@example.com');
    const orgId = await makeWorkspace(owner);
    await addMember(owner, orgId, admin, 'admin');
    await addMember(owner, orgId, member, 'member');

    const demote = await app.inject({
      method: 'PATCH',
      url: `/api/orgs/${orgId}/members/${owner.accountId}`,
      headers: admin.headers,
      payload: { role: 'viewer' },
    });
    expect(demote.statusCode).toBe(403);

    const promote = await app.inject({
      method: 'PATCH',
      url: `/api/orgs/${orgId}/members/${member.accountId}`,
      headers: admin.headers,
      payload: { role: 'owner' },
    });
    expect(promote.statusCode).toBe(403);

    const inviteOwner = await app.inject({
      method: 'POST',
      url: `/api/orgs/${orgId}/invites`,
      headers: admin.headers,
      payload: { email: outsider.email, role: 'owner' },
    });
    expect(inviteOwner.statusCode).toBe(403);

    // …and the admin's real powers still work, so the refusals above are not a
    // handler that refuses everything.
    const allowed = await app.inject({
      method: 'PATCH',
      url: `/api/orgs/${orgId}/members/${member.accountId}`,
      headers: admin.headers,
      payload: { role: 'viewer' },
    });
    expect(allowed.statusCode).toBe(200);
    expect(allowed.json().role).toBe('viewer');
  });

  it('will not let anybody change their own role', async () => {
    const owner = await signUp('owner@example.com');
    const orgId = await makeWorkspace(owner);

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/orgs/${orgId}/members/${owner.accountId}`,
      headers: owner.headers,
      payload: { role: 'member' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().message).toMatch(/cannot change your own role/);
  });

  it('will not let the last owner be removed, or leave', async () => {
    const owner = await signUp('owner@example.com');
    const second = await signUp('second@example.com');
    const orgId = await makeWorkspace(owner);
    await addMember(owner, orgId, second, 'admin');

    const leave = await app.inject({
      method: 'DELETE',
      url: `/api/orgs/${orgId}/members/${owner.accountId}`,
      headers: owner.headers,
    });
    expect(leave.statusCode).toBe(409);
    expect(leave.json().message).toMatch(/last owner/);

    // Once there are two, the first may go.
    const promote = await app.inject({
      method: 'PATCH',
      url: `/api/orgs/${orgId}/members/${second.accountId}`,
      headers: owner.headers,
      payload: { role: 'owner' },
    });
    expect(promote.statusCode).toBe(200);

    const now = await app.inject({
      method: 'DELETE',
      url: `/api/orgs/${orgId}/members/${owner.accountId}`,
      headers: owner.headers,
    });
    expect(now.statusCode).toBe(200);

    const after = await app.inject({ method: 'GET', url: '/api/orgs', headers: owner.headers });
    expect(after.json().organisations).toEqual([]);
  });

  it('only lets an owner rename the workspace', async () => {
    const owner = await signUp('owner@example.com');
    const admin = await signUp('admin@example.com');
    const orgId = await makeWorkspace(owner);
    await addMember(owner, orgId, admin, 'admin');

    const byAdmin = await app.inject({
      method: 'PATCH',
      url: `/api/orgs/${orgId}`,
      headers: admin.headers,
      payload: { name: 'Something Else' },
    });
    expect(byAdmin.statusCode).toBe(403);

    const byOwner = await app.inject({
      method: 'PATCH',
      url: `/api/orgs/${orgId}`,
      headers: owner.headers,
      payload: { name: 'Something Else' },
    });
    expect(byOwner.statusCode).toBe(200);
    expect(byOwner.json().name).toBe('Something Else');
  });
});

describe('an invitation', () => {
  it('is refused with one sentence whatever is wrong with it', async () => {
    const owner = await signUp('owner@example.com');
    const invited = await signUp('invited@example.com');
    const somebodyElse = await signUp('else@example.com');
    const orgId = await makeWorkspace(owner);

    const created = await app.inject({
      method: 'POST',
      url: `/api/orgs/${orgId}/invites`,
      headers: owner.headers,
      payload: { email: invited.email, role: 'member' },
    });
    const token = created.json().token as string;

    // Addressed to somebody else.
    const wrongPerson = await app.inject({
      method: 'POST',
      url: '/api/invites/accept',
      headers: somebodyElse.headers,
      payload: { token },
    });
    // A token that never existed.
    const nonsense = await app.inject({
      method: 'POST',
      url: '/api/invites/accept',
      headers: somebodyElse.headers,
      payload: { token: 'not-a-real-token-at-all' },
    });
    expect(wrongPerson.statusCode).toBe(404);
    expect(nonsense.statusCode).toBe(404);
    // THE SAME SENTENCE. Two different messages here would answer "is that
    // person a member of that firm" to anyone with a URL.
    expect(wrongPerson.json().message).toBe(nonsense.json().message);

    // Withdrawn, and then refused with that same sentence again.
    const inviteId = created.json().invite.inviteId as string;
    const withdrawn = await app.inject({
      method: 'DELETE',
      url: `/api/orgs/${orgId}/invites/${inviteId}`,
      headers: owner.headers,
    });
    expect(withdrawn.statusCode).toBe(200);

    const afterWithdrawal = await app.inject({
      method: 'POST',
      url: '/api/invites/accept',
      headers: invited.headers,
      payload: { token },
    });
    expect(afterWithdrawal.statusCode).toBe(404);
    expect(afterWithdrawal.json().message).toBe(nonsense.json().message);
  });

  it('shows its token exactly once, and never in a listing', async () => {
    const owner = await signUp('owner@example.com');
    const invited = await signUp('invited@example.com');
    const orgId = await makeWorkspace(owner);

    const created = await app.inject({
      method: 'POST',
      url: `/api/orgs/${orgId}/invites`,
      headers: owner.headers,
      payload: { email: invited.email, role: 'member' },
    });
    const token = created.json().token as string;
    expect(token).toBeTruthy();

    const listed = await app.inject({
      method: 'GET',
      url: `/api/orgs/${orgId}`,
      headers: owner.headers,
    });
    const body = JSON.stringify(listed.json());
    expect(body).not.toContain(token);
    // Nor the hash, which is as good as the token to anyone with a database.
    expect(body).not.toMatch(/tokenHash/);
    expect(listed.json().invites[0]).toEqual(
      expect.objectContaining({ email: invited.email, role: 'member', state: 'open' }),
    );
  });

  it('is invisible to a member, who may not invite', async () => {
    const owner = await signUp('owner@example.com');
    const member = await signUp('member@example.com');
    const outsider = await signUp('outsider@example.com');
    const orgId = await makeWorkspace(owner);
    await addMember(owner, orgId, member, 'member');
    await app.inject({
      method: 'POST',
      url: `/api/orgs/${orgId}/invites`,
      headers: owner.headers,
      payload: { email: outsider.email, role: 'member' },
    });

    const seen = await app.inject({
      method: 'GET',
      url: `/api/orgs/${orgId}`,
      headers: member.headers,
    });
    expect(seen.statusCode).toBe(200);
    expect(seen.json().invites).toEqual([]);
    expect(seen.json().mayInvite).toBe(false);

    const tried = await app.inject({
      method: 'POST',
      url: `/api/orgs/${orgId}/invites`,
      headers: member.headers,
      payload: { email: 'another@example.com', role: 'member' },
    });
    expect(tried.statusCode).toBe(403);
  });

  it('previews only for the person it names', async () => {
    const owner = await signUp('owner@example.com');
    const invited = await signUp('invited@example.com');
    const somebodyElse = await signUp('else@example.com');
    const orgId = await makeWorkspace(owner, 'Al Barsha Architects');
    const created = await app.inject({
      method: 'POST',
      url: `/api/orgs/${orgId}/invites`,
      headers: owner.headers,
      payload: { email: invited.email, role: 'viewer' },
    });
    const token = created.json().token as string;

    const mine = await app.inject({
      method: 'POST',
      url: '/api/invites/preview',
      headers: invited.headers,
      payload: { token },
    });
    expect(mine.json()).toEqual(
      expect.objectContaining({ organisation: 'Al Barsha Architects', role: 'viewer' }),
    );

    const theirs = await app.inject({
      method: 'POST',
      url: '/api/invites/preview',
      headers: somebodyElse.headers,
      payload: { token },
    });
    expect(theirs.statusCode).toBe(404);
  });

  it('cannot be used twice', async () => {
    const owner = await signUp('owner@example.com');
    const invited = await signUp('invited@example.com');
    const orgId = await makeWorkspace(owner);
    const created = await app.inject({
      method: 'POST',
      url: `/api/orgs/${orgId}/invites`,
      headers: owner.headers,
      payload: { email: invited.email, role: 'member' },
    });
    const token = created.json().token as string;

    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/invites/accept',
          headers: invited.headers,
          payload: { token },
        })
      ).statusCode,
    ).toBe(200);

    const again = await app.inject({
      method: 'POST',
      url: '/api/invites/accept',
      headers: invited.headers,
      payload: { token },
    });
    expect(again.statusCode).toBe(404);
  });
});

describe('an explicit share is never narrowed by a workspace role', () => {
  it('keeps a reviewer share on a run in a workspace where the account is a viewer', async () => {
    const owner = await signUp('owner@example.com');
    const viewer = await signUp('viewer@example.com', 'DM-77');
    const orgId = await makeWorkspace(owner);
    await addMember(owner, orgId, viewer, 'viewer');

    const { runId } = await plotAndRun(owner.inside(orgId));

    // As a viewer, the derived role is `reader` — no gate.
    const before = await app.inject({
      method: 'GET',
      url: `/api/runs/${runId}`,
      headers: viewer.headers,
    });
    expect(before.json().access).toBe('reader');

    const shared = await app.inject({
      method: 'POST',
      url: `/api/runs/${runId}/share`,
      headers: owner.headers,
      payload: { email: viewer.email, role: 'reviewer' },
    });
    expect(shared.statusCode).toBe(200);

    const after = await app.inject({
      method: 'GET',
      url: `/api/runs/${runId}`,
      headers: viewer.headers,
    });
    expect(after.json().access).toBe('reviewer');
  });
});

describe('the audit log', () => {
  it('records who did what, keeps the name as it stood, and is admin-only', async () => {
    const owner = await signUp('owner@example.com');
    const member = await signUp('member@example.com');
    const orgId = await makeWorkspace(owner);
    await addMember(owner, orgId, member, 'member');
    await app.inject({
      method: 'PATCH',
      url: `/api/orgs/${orgId}/members/${member.accountId}`,
      headers: owner.headers,
      payload: { role: 'viewer' },
    });

    const log = await app.inject({
      method: 'GET',
      url: `/api/orgs/${orgId}/audit`,
      headers: owner.headers,
    });
    expect(log.statusCode).toBe(200);
    const actions = (log.json().events as { action: string }[]).map((e) => e.action);
    expect(actions).toContain('org.created');
    expect(actions).toContain('invite.created');
    expect(actions).toContain('invite.accepted');
    expect(actions).toContain('member.role_changed');

    const change = (log.json().events as { action: string; detail: unknown }[]).find(
      (e) => e.action === 'member.role_changed',
    );
    expect(change?.detail).toEqual({ from: 'member', to: 'viewer' });

    // A later rename does not rewrite history: the recorded label stays, and the
    // current name is offered beside it rather than instead of it.
    await app.inject({
      method: 'PATCH',
      url: '/api/auth/me',
      headers: owner.headers,
      payload: { name: 'Renamed Person', licence: '' },
    });
    const after = await app.inject({
      method: 'GET',
      url: `/api/orgs/${orgId}/audit`,
      headers: owner.headers,
    });
    const first = (after.json().events as { actor: { label: string; currentName: string } }[])[0];
    expect(first?.actor.label).toBe('owner');
    expect(first?.actor.currentName).toBe('Renamed Person');

    const byMember = await app.inject({
      method: 'GET',
      url: `/api/orgs/${orgId}/audit`,
      headers: member.headers,
    });
    expect(byMember.statusCode).toBe(403);
  });

  it('records a run computed in the workspace and the gate signed on it', async () => {
    const owner = await signUp('owner@example.com', 'DM-1');
    const orgId = await makeWorkspace(owner);
    const { runId } = await plotAndRun(owner.inside(orgId));

    const log = await app.inject({
      method: 'GET',
      url: `/api/orgs/${orgId}/audit`,
      headers: owner.headers,
    });
    const created = (log.json().events as { action: string; subject: string }[]).find(
      (e) => e.action === 'run.created',
    );
    expect(created?.subject).toBe(runId);
  });
});

describe('a workspace belongs to accounts', () => {
  it('turns a guest away from every workspace route', async () => {
    const guest = { 'x-actor-id': 'guest-nobody', 'x-actor-name': 'Nobody' };
    for (const [method, url] of [
      ['GET', '/api/orgs'],
      ['POST', '/api/orgs'],
    ] as const) {
      const res = await app.inject({ method, url, headers: guest, payload: { name: 'X' } });
      expect({ url, status: res.statusCode }).toEqual({ url, status: 401 });
    }
  });
});
