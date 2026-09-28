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

  /*
    THE TIMEOUT IS EXPLICIT, AND IT IS NOT A WORKAROUND FOR A SLOW TEST.

    Twelve sequential sign-in attempts are twelve scrypt verifications, and the
    route hashes a decoy even when the account does not exist so that a missing
    account and a wrong password take the same time. Both facts are deliberate:
    the cost IS the defence. Run alone this finishes in well under a second, but
    under the full suite's CPU contention twelve of them crossed the default
    five-second budget and the file failed on a timeout that read as a throttle
    that had stopped working — which is the most alarming way a green suite can
    lie. A password hash that fits comfortably inside a default test timeout is a
    password hash that is too cheap.
  */
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
  }, 30_000);
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

/* ==========================================================================
 * CHANGING WHAT THE ACCOUNT SAYS
 *
 * Two routes that had no HTTP surface for a long time while the storage for
 * both was already written and already covered by `store-contract`. That is the
 * shape of a half-built feature: the hard part done, the reachable part missing,
 * and nothing failing to say so.
 * ======================================================================= */

describe('editing the profile', () => {
  it('changes the name, and says the new one back', async () => {
    const up = await app.inject({ method: 'POST', url: '/api/auth/register', payload: GOOD });
    const cookie = `envelope_session=${cookieFrom(up.headers)}`;

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/auth/me',
      headers: { cookie },
      payload: { name: 'Khaled Ahmed', licence: '' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().account.name).toBe('Khaled Ahmed');

    // And it survives the round trip, rather than being echoed back unstored.
    const me = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie } });
    expect(me.json().account.name).toBe('Khaled Ahmed');
  });

  it('lets a licence be cleared, not only replaced', async () => {
    const up = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { ...GOOD, licence: 'ENG-12345' },
    });
    const cookie = `envelope_session=${cookieFrom(up.headers)}`;
    expect(up.json().account.licence).toBe('ENG-12345');

    // The whole reason `profileBody.licence` is a required string that may be
    // empty rather than an optional: somebody who asserted a licence they no
    // longer hold must be able to withdraw the assertion. An optional field
    // cannot express "clear it" — omitted would mean "leave it".
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/auth/me',
      headers: { cookie },
      payload: { name: 'Khaled', licence: '' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().account.licence ?? null).toBeNull();
  });

  it('refuses a signed-out caller', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/auth/me',
      payload: { name: 'Somebody Else', licence: '' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('refuses an empty name rather than storing one', async () => {
    const up = await app.inject({ method: 'POST', url: '/api/auth/register', payload: GOOD });
    const cookie = `envelope_session=${cookieFrom(up.headers)}`;
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/auth/me',
      headers: { cookie },
      payload: { name: '   ', licence: '' },
    });
    // A blank name would erase the attribution on every `USER_SET` value this
    // account signs from here on. 400 exactly: `server.ts` turns a ZodError into
    // a 400 with the message, and a 500 here would mean the schema was not what
    // rejected it.
    expect(res.statusCode).toBe(400);
  });

  it('cannot change the email — identity is not a profile field', async () => {
    const up = await app.inject({ method: 'POST', url: '/api/auth/register', payload: GOOD });
    const cookie = `envelope_session=${cookieFrom(up.headers)}`;
    await app.inject({
      method: 'PATCH',
      url: '/api/auth/me',
      headers: { cookie },
      payload: { name: 'Khaled', licence: '', email: 'someone.else@example.com' },
    });
    const me = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie } });
    // Zod strips it; this asserts the STRIPPING, which is the security property.
    // A share is addressed to an email, so moving one without proving the new
    // inbox would hand somebody else's shared runs to whoever typed the address.
    expect(me.json().account.email).toBe('khaled@example.com');
  });
});

describe('changing the password', () => {
  it('changes it, and the new one works while the old one does not', async () => {
    const up = await app.inject({ method: 'POST', url: '/api/auth/register', payload: GOOD });
    const cookie = `envelope_session=${cookieFrom(up.headers)}`;

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/password',
      headers: { cookie },
      payload: { current: GOOD.password, next: 'a different long secret' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().otherSessionsEnded).toBe(true);

    const old = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: GOOD.email, password: GOOD.password },
    });
    expect(old.statusCode).toBe(401);

    const fresh = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: GOOD.email, password: 'a different long secret' },
    });
    expect(fresh.statusCode).toBe(200);
  });

  it('ends every OTHER session and keeps this one', async () => {
    const up = await app.inject({ method: 'POST', url: '/api/auth/register', payload: GOOD });
    const first = `envelope_session=${cookieFrom(up.headers)}`;

    // A second device.
    const other = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: GOOD.email, password: GOOD.password },
    });
    const second = `envelope_session=${cookieFrom(other.headers)}`;

    const changed = await app.inject({
      method: 'POST',
      url: '/api/auth/password',
      headers: { cookie: second },
      payload: { current: GOOD.password, next: 'a different long secret' },
    });
    expect(changed.statusCode).toBe(200);

    // THE POINT OF THE ROUTE. The commonest reason to change a password is that
    // somebody else may hold it; a change that left their session alive would be
    // a security control that does nothing about the thing it was used for.
    const stale = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: first },
    });
    expect(stale.json().account).toBeNull();

    // The device that did it stays signed in, on a fresh cookie.
    const kept = `envelope_session=${cookieFrom(changed.headers)}`;
    const still = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: kept } });
    expect(still.json().account.email).toBe('khaled@example.com');
  });

  it('refuses without the current password', async () => {
    const up = await app.inject({ method: 'POST', url: '/api/auth/register', payload: GOOD });
    const cookie = `envelope_session=${cookieFrom(up.headers)}`;
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/password',
      headers: { cookie },
      payload: { current: 'not the password', next: 'a different long secret' },
    });
    expect(res.statusCode).toBe(403);

    // And the old password still works — a failed change changed nothing.
    const still = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: GOOD.email, password: GOOD.password },
    });
    expect(still.statusCode).toBe(200);
  });

  it('holds the new password to the same length rule as a new account', async () => {
    const up = await app.inject({ method: 'POST', url: '/api/auth/register', payload: GOOD });
    const cookie = `envelope_session=${cookieFrom(up.headers)}`;
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/password',
      headers: { cookie },
      payload: { current: GOOD.password, next: 'short' },
    });
    // A change route with a weaker rule than the register route is a back door
    // into a weak password, reachable by anyone who signs up and immediately
    // changes it.
    expect(res.statusCode).toBe(400);
  });

  it('refuses a signed-out caller', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/password',
      payload: { current: GOOD.password, next: 'a different long secret' },
    });
    expect(res.statusCode).toBe(401);
  });
});
