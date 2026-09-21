/**
 * The auth routes, driven through a real Fastify instance.
 *
 * `app.inject` and not a mocked request: the things most likely to be wrong here —
 * a cookie attribute, a status code, whether a header can override a session — are
 * properties of the HTTP layer, and a unit test that calls the handler directly
 * cannot see any of them.
 *
 * Each block names the failure it exists to catch.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { SqliteAccountRepository } from '../src/account-store.js';
import { SqliteRunRepository } from '../src/store.js';
import { build } from '../src/server.js';

let app: FastifyInstance;
let accounts: SqliteAccountRepository;

const GOOD = { email: 'khaled@example.com', password: 'a correct horse battery', name: 'Khaled' };

/** The `envelope_session` value out of a `set-cookie` header. */
function cookieFrom(headers: Record<string, unknown>): string | null {
  const raw = headers['set-cookie'];
  const list = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
  for (const c of list) {
    const m = /(?:^|;\s*)envelope_session=([^;]*)/.exec(c);
    if (m && m[1]) return m[1];
  }
  return null;
}

beforeEach(async () => {
  accounts = new SqliteAccountRepository();
  app = await build(new SqliteRunRepository(), accounts);
});

afterEach(async () => {
  await app.close();
  await accounts.close();
});

describe('signing up', () => {
  it('creates an account and signs the person in in one step', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: GOOD });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.account.email).toBe('khaled@example.com');
    // The two things that must never leave the server.
    expect(JSON.stringify(body)).not.toContain('passwordHash');
    expect(JSON.stringify(body)).not.toContain(GOOD.password);
    expect(cookieFrom(res.headers)).toBeTruthy();
  });

  it('sets a cookie script cannot read and a cross-site POST will not send', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: GOOD });
    const raw = String(res.headers['set-cookie']);
    // HttpOnly is the single most valuable attribute here: an XSS anywhere on the
    // site cannot exfiltrate the session.
    expect(raw).toContain('HttpOnly');
    expect(raw).toContain('SameSite=Lax');
    expect(raw).toContain('Path=/');
  });

  it('normalises the email, so one person is one account', async () => {
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: GOOD });
    const again = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { ...GOOD, email: '  KHALED@Example.COM ' },
    });
    expect(again.statusCode).toBe(409);
  });

  it('refuses a short password and says why, in a sentence', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { ...GOOD, password: 'short' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/12 characters/);
    // No composition rules, and the message says so rather than listing any.
    expect(res.json().error).toMatch(/no composition rules/i);
  });
});

describe('signing in', () => {
  beforeEach(async () => {
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: GOOD });
  });

  it('accepts the right password and issues a NEW session', async () => {
    const a = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: GOOD.email, password: GOOD.password },
    });
    expect(a.statusCode).toBe(200);
    const b = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: GOOD.email, password: GOOD.password },
    });
    // Session fixation: a sign-in must mint a token rather than re-use one.
    expect(cookieFrom(a.headers)).not.toBe(cookieFrom(b.headers));
  });

  it('gives one answer to a wrong password and to an unknown email', async () => {
    // Two different messages here is an unauthenticated user-enumeration oracle.
    const wrong = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: GOOD.email, password: 'not the password at all' },
    });
    const unknown = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'nobody@example.com', password: 'not the password at all' },
    });
    expect(wrong.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(401);
    expect(wrong.json().error).toBe(unknown.json().error);
    expect(cookieFrom(wrong.headers)).toBeNull();
  });

  it('throttles repeated failures rather than answering forever', async () => {
    let last = 0;
    for (let i = 0; i < 12; i++) {
      const r = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'throttle@example.com', password: `guess number ${i}` },
      });
      last = r.statusCode;
    }
    expect(last).toBe(429);
  });
});

describe('the session', () => {
  let cookie: string;

  beforeEach(async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: GOOD });
    cookie = `envelope_session=${cookieFrom(res.headers)}`;
  });

  it('answers "who am I" with 200 and null when nobody is signed in', async () => {
    // A 401 here would print an error in the console of a public page that is
    // working exactly as intended — this is the call every page makes on load.
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(200);
    expect(res.json().account).toBeNull();
  });

  it('recognises its own cookie', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie } });
    expect(res.json().account.email).toBe('khaled@example.com');
  });

  it('is not fooled by a cookie whose name merely ends with ours', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: `x_${cookie}` },
    });
    expect(res.json().account).toBeNull();
  });

  it('deletes the row on sign-out, not just the cookie', async () => {
    await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie } });
    // Clearing a cookie logs out the browser and leaves the session live for anyone
    // holding the token — which is the case where signing out matters.
    const after = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie } });
    expect(after.json().account).toBeNull();
  });

  it('signs out everywhere in one statement', async () => {
    const second = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: GOOD.email, password: GOOD.password },
    });
    const secondCookie = `envelope_session=${cookieFrom(second.headers)}`;
    await app.inject({ method: 'POST', url: '/api/auth/logout-everywhere', headers: { cookie } });
    for (const c of [cookie, secondCookie]) {
      const r = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: c } });
      expect(r.json().account).toBeNull();
    }
  });
});

describe('drafts', () => {
  let cookie: string;

  beforeEach(async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: GOOD });
    cookie = `envelope_session=${cookieFrom(res.headers)}`;
  });

  it('keeps what was typed, and hands it back', async () => {
    const payload = { width: '50.85', depth: '26.85', edges: [{ seq: 0, classification: 'ROAD' }] };
    const put = await app.inject({
      method: 'PUT',
      url: '/api/drafts/plot-form',
      headers: { cookie },
      payload: { payload },
    });
    expect(put.statusCode).toBe(200);
    const get = await app.inject({
      method: 'GET',
      url: '/api/drafts/plot-form',
      headers: { cookie },
    });
    expect(get.json().draft.payload).toEqual(payload);
  });

  it('refuses to keep a draft for an actor who is only asserted', async () => {
    // A header is a claim anyone can make. Storing half-entered plot data against an
    // unverified name is handing it to the next person who claims that name.
    const res = await app.inject({
      method: 'PUT',
      url: '/api/drafts/plot-form',
      headers: { 'x-actor-id': 'a1', 'x-actor-name': 'Someone' },
      payload: { payload: { width: '1' } },
    });
    expect(res.statusCode).toBe(401);
  });

  it('does not let one account read another account’s draft', async () => {
    await app.inject({
      method: 'PUT',
      url: '/api/drafts/plot-form',
      headers: { cookie },
      payload: { payload: { width: 'mine' } },
    });
    const other = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { ...GOOD, email: 'other@example.com' },
    });
    const otherCookie = `envelope_session=${cookieFrom(other.headers)}`;
    const res = await app.inject({
      method: 'GET',
      url: '/api/drafts/plot-form',
      headers: { cookie: otherCookie },
    });
    expect(res.json().draft).toBeNull();
  });

  it('bounds the size, because a signed-in client writes to this on a timer', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/drafts/plot-form',
      headers: { cookie },
      payload: { payload: { blob: 'x'.repeat(300 * 1024) } },
    });
    expect(res.statusCode).toBe(413);
  });

  it('refuses a key that is not a key', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/drafts/..%2Fetc',
      headers: { cookie },
      payload: { payload: {} },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});
