/**
 * SIGN UP, SIGN IN, SIGN OUT, AND THE DRAFTS THAT SURVIVE A CLOSED TAB.
 *
 * `identity.ts` says what this replaces: an actor read from a request header, with
 * no password, no session and no verification — "suitable for a single-tenant
 * design-partner deployment behind a network boundary, and for nothing else."
 *
 * THE HEADER PATH IS NOT DELETED, and that is deliberate. `apps/api/test` and
 * `scripts/smoke.mjs` both drive the engine with `X-Actor-*` headers, and so does
 * any deployment already sitting behind a boundary. `resolveActor` below prefers a
 * session when one is presented and falls back to the headers when one is not, so
 * this is additive. What changes is that a session, where present, is an
 * AUTHENTICATED actor rather than an asserted one — and only a session can own a
 * run or hold a draft.
 *
 * No `@fastify/cookie`. One cookie is read and one is written; a dependency for
 * that is a dependency to audit, and `accounts.ts` already parses the header
 * correctly including the case a naive `includes` gets wrong.
 */

import { randomUUID } from 'node:crypto';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import type { AccountRepository, StoredAccount } from './account-store.js';
import {
  clearedSessionCookie,
  hashPassword,
  looksLikeEmail,
  mintSessionToken,
  needsRehash,
  normaliseEmail,
  passwordProblem,
  readSessionCookie,
  sessionCookie,
  sessionTokenHash,
  verifyPassword,
  PASSWORD_MAX,
  SESSION_TTL_MS,
} from './accounts.js';
import { actorFrom, type Actor } from './identity.js';

/**
 * A REAL SCRYPT VERIFICATION AGAINST A HASH NOBODY OWNS.
 *
 * On an unknown email the obvious implementation returns immediately, and the
 * response time then answers "does this account exist" to anyone with a stopwatch —
 * an unauthenticated user-enumeration oracle on the login route. So an unknown
 * email is verified against this hash instead: the work is identical, the answer is
 * always false, and the two paths take the same time.
 *
 * It is computed once at module load from a random password no one is told, so it
 * cannot be matched even by accident.
 */
const DECOY_HASH_PROMISE = hashPassword(randomUUID() + randomUUID());

/**
 * A DELIBERATELY SMALL, DELIBERATELY HONEST THROTTLE.
 *
 * In-memory, per process, cleared on restart, and it counts failures per
 * email-and-address pair. It is not a rate limiter for a fleet — that is Redis or a
 * proxy, and it is a real piece of work someone has to do. What it is, is the
 * difference between "an online guessing attack takes a week" and "an online
 * guessing attack takes an afternoon", for about twenty lines.
 *
 * Recorded here rather than left implicit: a deployment behind more than one
 * process has a throttle that is weaker by exactly that factor.
 */
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const ATTEMPT_LIMIT = 10;
const attempts = new Map<string, { count: number; first: number }>();

function throttled(key: string, now: number): boolean {
  const row = attempts.get(key);
  if (!row) return false;
  if (now - row.first > ATTEMPT_WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return row.count >= ATTEMPT_LIMIT;
}

function recordFailure(key: string, now: number): void {
  const row = attempts.get(key);
  if (!row || now - row.first > ATTEMPT_WINDOW_MS) attempts.set(key, { count: 1, first: now });
  else row.count += 1;
}

/** `Secure` follows the request's own protocol, so `http://localhost` still works. */
function isSecure(request: FastifyRequest): boolean {
  const proto = request.headers['x-forwarded-proto'];
  const first = Array.isArray(proto) ? proto[0] : proto;
  return (first ?? request.protocol) === 'https';
}

export interface SessionActor extends Actor {
  readonly accountId: string;
  readonly email: string;
  /** True when the identity was proved, false when it was merely asserted in a header. */
  readonly authenticated: boolean;
}

/**
 * The session, if the request carries a live one.
 *
 * Expiry is checked HERE and not only by the sweeper. A row whose `expires_at` has
 * passed but which the sweeper has not reached yet is an expired session, and a
 * product that honours it until a background job runs does not have an expiry.
 *
 * The session slides: every authenticated request pushes `expires_at` forward. A
 * fixed thirty days would sign someone out in the middle of a run on day thirty-one
 * regardless of how continuously they had been working.
 */
export async function sessionFrom(
  repo: AccountRepository,
  request: FastifyRequest,
): Promise<SessionActor | null> {
  const token = readSessionCookie(request.headers.cookie);
  if (!token) return null;
  const hash = sessionTokenHash(token);
  const session = await repo.getSession(hash);
  if (!session) return null;

  const now = Date.now();
  if (Date.parse(session.expiresAt) <= now) {
    await repo.deleteSession(hash);
    return null;
  }

  const account = await repo.getAccountById(session.accountId);
  if (!account) {
    /* A session pointing at a deleted account is a dangling session. */
    await repo.deleteSession(hash);
    return null;
  }

  const nowIso = new Date(now).toISOString();
  await repo.touchSession(hash, nowIso, new Date(now + SESSION_TTL_MS).toISOString());

  return {
    id: account.accountId,
    accountId: account.accountId,
    name: account.name,
    email: account.email,
    authenticated: true,
    ...(account.licence ? { licence: account.licence } : {}),
  };
}

/**
 * The actor for a request: the session if there is one, the headers if there is not.
 *
 * The precedence is not arbitrary. A session is proof and a header is an assertion,
 * so a request carrying both is a signed-in person whose client also sent headers,
 * and the proof wins. Reversing it would let a header override an authenticated
 * identity, which is an impersonation route.
 */
export async function resolveActor(
  repo: AccountRepository | null,
  request: FastifyRequest,
  guests: GuestPolicy = 'open',
): Promise<Actor> {
  if (repo) {
    const session = await sessionFrom(repo, request);
    if (session) return session;
  }
  if (guests === 'off') throw new SignInRequiredError();

  const actor = actorFrom(request);
  if (guests === 'keyed' && !GUEST_KEY.test(actor.id)) throw new GuestKeyError();

  /*
    A HEADER MAY NOT NAME AN ACCOUNT.

    Account ids are not secrets: a reviewer reads the author's in the gate record of
    every run shared with them. Without this check, `X-Actor-Id: <that id>` would be
    the author, with no password, on every route — the header path would become an
    impersonation route for exactly the people a run was shared with.
  */
  if (repo && (await repo.getAccountById(actor.id))) throw new AccountIdentityError();
  return actor;
}

/**
 * HOW A DEPLOYMENT TREATS A PERSON WITHOUT AN ACCOUNT.
 *
 *   open   any `X-Actor-Id`. The test suite, `scripts/smoke.mjs`, and a deployment
 *          already behind a network boundary. Access to a run is then only as
 *          private as a name is hard to guess, which is to say not at all.
 *   keyed  the id must be a guest key — `guest-` and a random UUID, minted by the
 *          antechamber and kept in that browser. A deployment the public can reach
 *          runs this way: the key is what makes "only the author may see a run"
 *          mean something for somebody who never made an account.
 *   off    a session or nothing.
 *
 * `keyed` is not authentication and does not claim to be. A key is a bearer
 * credential held in one browser's storage; clearing it loses the runs, and
 * anyone holding it is the guest. What it removes is the case that mattered:
 * two people who typed the same name reading each other's work.
 */
export type GuestPolicy = 'open' | 'keyed' | 'off';

export const GUEST_KEY = /^guest-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export class SignInRequiredError extends Error {
  override readonly name = 'SignInRequiredError';
  readonly statusCode = 401;
  constructor() {
    super('this deployment keeps work against accounts. Sign in, or create an account, to continue.');
  }
}

export class GuestKeyError extends Error {
  override readonly name = 'GuestKeyError';
  readonly statusCode = 401;
  constructor() {
    super(
      'this browser has no guest key. Enter your name again on the start screen — a new ' +
        'key is made for you — or sign in to keep your work against an account.',
    );
  }
}

export class AccountIdentityError extends Error {
  override readonly name = 'AccountIdentityError';
  readonly statusCode = 401;
  constructor() {
    super('that identity belongs to an account. Sign in to act as it.');
  }
}

const registerBody = z.object({
  email: z.string().min(3).max(254),
  password: z.string().min(1).max(PASSWORD_MAX),
  name: z.string().trim().min(1).max(120),
  licence: z.string().trim().max(120).optional(),
});

const loginBody = z.object({
  email: z.string().min(3).max(254),
  password: z.string().min(1).max(PASSWORD_MAX),
});

/**
 * The profile a reader may change about themselves.
 *
 * EMAIL IS NOT IN HERE. It is the account's identity, it is what a share is
 * addressed to, and changing it without a mailer to confirm the new address would
 * let somebody move an account to an inbox nobody proved they hold. The route that
 * changes an email arrives with the mailer, and `/refusals` says so.
 *
 * A licence may be CLEARED, which is why the empty string is allowed where
 * `registerBody` takes an optional. Someone who asserted a licence they no longer
 * hold must be able to withdraw it, and an omitted field would mean "leave it" —
 * two different intentions that one optional cannot carry.
 */
const profileBody = z.object({
  name: z.string().trim().min(1).max(120),
  licence: z.string().trim().max(120),
});

const passwordBody = z.object({
  current: z.string().min(1).max(PASSWORD_MAX),
  next: z.string().min(1).max(PASSWORD_MAX),
});

const draftBody = z.object({
  /* Opaque to this layer. The shape belongs to the form that wrote it. */
  payload: z.unknown(),
});

/** What the client is told about itself. Never the hash, never the token. */
function publicAccount(a: StoredAccount): Record<string, unknown> {
  return {
    accountId: a.accountId,
    email: a.email,
    name: a.name,
    licence: a.licence,
    createdAt: a.createdAt,
  };
}

export function registerAuthRoutes(app: FastifyInstance, repo: AccountRepository): void {
  const setSession = async (reply: FastifyReply, request: FastifyRequest, accountId: string) => {
    const token = mintSessionToken();
    const now = Date.now();
    await repo.createSession({
      tokenHash: sessionTokenHash(token),
      accountId,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
      lastSeenAt: new Date(now).toISOString(),
    });
    reply.header('set-cookie', sessionCookie(token, { secure: isSecure(request) }));
  };

  /**
   * Sign up.
   *
   * IT TELLS YOU THE EMAIL IS TAKEN, and that is an enumeration exposure being
   * accepted rather than overlooked. The alternative — answer "check your inbox"
   * either way — requires a mailer, and this deployment has none. Claiming to have
   * sent a message that was never sent would be a lie told to protect a lesser
   * secret, on a product whose whole proposition is that it does not do that. When
   * a mailer exists this route changes; until then the exposure is named here and
   * in `/refusals` rather than hidden.
   */
  app.post('/api/auth/register', async (request, reply) => {
    const body = registerBody.parse(request.body);
    const email = normaliseEmail(body.email);

    if (!looksLikeEmail(email)) {
      return reply.code(400).send({ error: 'that does not look like an email address' });
    }
    const problem = passwordProblem(body.password);
    if (problem) return reply.code(400).send({ error: problem });

    if (await repo.getAccountByEmail(email)) {
      return reply.code(409).send({ error: 'an account already exists for that email' });
    }

    const account: StoredAccount = {
      accountId: randomUUID(),
      email,
      name: body.name,
      licence: body.licence && body.licence.length > 0 ? body.licence : null,
      passwordHash: await hashPassword(body.password),
      createdAt: new Date().toISOString(),
    };

    try {
      await repo.createAccount(account);
    } catch {
      /* The unique index caught a race the check above could not. Same answer. */
      return reply.code(409).send({ error: 'an account already exists for that email' });
    }

    await setSession(reply, request, account.accountId);
    return reply.code(201).send({ account: publicAccount(account) });
  });

  /**
   * Sign in.
   *
   * One error message for every failure, and the same work done on every path. A
   * wrong password and an unknown email are indistinguishable in both the body and
   * the timing; see `DECOY_HASH_PROMISE`.
   */
  app.post('/api/auth/login', async (request, reply) => {
    const body = loginBody.parse(request.body);
    const email = normaliseEmail(body.email);
    const now = Date.now();
    const key = `${email}|${request.ip}`;

    if (throttled(key, now)) {
      return reply
        .code(429)
        .send({ error: 'too many attempts. Wait fifteen minutes and try again.' });
    }

    const account = await repo.getAccountByEmail(email);
    const hash = account?.passwordHash ?? (await DECOY_HASH_PROMISE);
    const ok = await verifyPassword(body.password, hash);

    if (!ok || !account) {
      recordFailure(key, now);
      return reply.code(401).send({ error: 'that email and password do not match an account' });
    }

    attempts.delete(key);

    /* Raise the cost on the account whose owner just proved they know the password —
       the only moment the plaintext is available to re-derive from. */
    if (needsRehash(account.passwordHash)) {
      await repo.updatePasswordHash(account.accountId, await hashPassword(body.password));
    }

    /* Housekeeping on a route that already touches the session table, so an idle
       deployment does not accumulate dead rows and no cron is invented for it. */
    await repo.deleteExpiredSessions(new Date(now).toISOString());

    await setSession(reply, request, account.accountId);
    return reply.send({ account: publicAccount(account) });
  });

  /**
   * Sign out.
   *
   * The ROW GOES, not just the cookie. Clearing a cookie logs out the browser and
   * leaves the session live for anyone holding the token — which is precisely the
   * case where signing out matters.
   */
  app.post('/api/auth/logout', async (request, reply) => {
    const token = readSessionCookie(request.headers.cookie);
    if (token) await repo.deleteSession(sessionTokenHash(token));
    reply.header('set-cookie', clearedSessionCookie(isSecure(request)));
    return reply.send({ signedOut: true });
  });

  /** Sign out of every device. The reason `deleteSessionsFor` exists. */
  app.post('/api/auth/logout-everywhere', async (request, reply) => {
    const session = await sessionFrom(repo, request);
    if (!session) return reply.code(401).send({ error: 'not signed in' });
    await repo.deleteSessionsFor(session.accountId);
    reply.header('set-cookie', clearedSessionCookie(isSecure(request)));
    return reply.send({ signedOut: true });
  });

  /**
   * Who am I.
   *
   * 200 with `account: null` rather than 401 for a signed-out reader. This is the
   * call every page makes on load, and a 401 on the landing page would put an error
   * in the console of a public page that is working exactly as intended.
   */
  app.get('/api/auth/me', async (request, reply) => {
    const session = await sessionFrom(repo, request);
    if (!session) return reply.send({ account: null });
    const account = await repo.getAccountById(session.accountId);
    return reply.send({ account: account ? publicAccount(account) : null });
  });

  /**
   * Change the name and the licence this account carries.
   *
   * THE LICENCE IS RECORDED AND NEVER VERIFIED, here as everywhere. Nothing on this
   * route checks it against a registry, because no registry is integrated; the
   * screen that offers this field says so in words, and `/refusals` says it again.
   * A route that quietly accepted a licence number would be the place that claim
   * started looking checked.
   *
   * The name change is retroactive to nothing. Every `USER_SET` value already
   * emitted carries the name that was current when it was signed, and a run is
   * never rewritten — §13.4. So a reader who changes their name here will see the
   * old one on old runs, which is correct: it is what the signature said.
   */
  app.patch('/api/auth/me', async (request, reply) => {
    const session = await sessionFrom(repo, request);
    if (!session) return reply.code(401).send({ error: 'not signed in' });

    const body = profileBody.parse(request.body);
    await repo.updateProfile(session.accountId, body.name, body.licence === '' ? null : body.licence);

    const account = await repo.getAccountById(session.accountId);
    return reply.send({ account: account ? publicAccount(account) : null });
  });

  /**
   * Change the password, and sign every other device out.
   *
   * THREE PROPERTIES, AND EACH ONE IS THE REASON THE ROUTE EXISTS RATHER THAN A
   * REFINEMENT OF IT.
   *
   * 1. The current password is required. Without it, anyone who reaches an unlocked
   *    browser takes the account permanently instead of borrowing it.
   * 2. Every other session is destroyed. The commonest reason to change a password
   *    is that somebody else may hold it, and a change that left their session alive
   *    would be a security control that does nothing about the thing it was used
   *    for. `deleteSessionsFor` then a fresh cookie: this device stays signed in,
   *    every other one does not.
   * 3. A wrong current password is 403 and says so plainly. There is nothing to
   *    protect by being vague — the caller has already proved they hold the session.
   */
  app.post('/api/auth/password', async (request, reply) => {
    const session = await sessionFrom(repo, request);
    if (!session) return reply.code(401).send({ error: 'not signed in' });

    const body = passwordBody.parse(request.body);
    const account = await repo.getAccountById(session.accountId);
    if (!account) return reply.code(401).send({ error: 'not signed in' });

    if (!(await verifyPassword(body.current, account.passwordHash))) {
      return reply.code(403).send({ error: 'that is not the current password' });
    }
    const problem = passwordProblem(body.next);
    if (problem) return reply.code(400).send({ error: problem });

    await repo.updatePasswordHash(account.accountId, await hashPassword(body.next));
    await repo.deleteSessionsFor(account.accountId);
    await setSession(reply, request, account.accountId);
    return reply.send({ changed: true, otherSessionsEnded: true });
  });

  /* ======================================================================
   * DRAFTS — what survives a closed tab
   * =================================================================== */

  /**
   * A draft belongs to an account and to nothing else.
   *
   * There is no draft for a header-asserted actor and that is the point: a draft is
   * private data, and the header path is an assertion anyone can make. Storing
   * half-entered plot data against an unverified name would be handing it to the
   * next person who claims that name.
   */
  const requireSession = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<SessionActor | null> => {
    const session = await sessionFrom(repo, request);
    if (!session) {
      reply.code(401).send({
        error:
          'drafts are kept against an account. Sign in and what you type is saved as you go.',
      });
      return null;
    }
    return session;
  };

  const draftKey = z.string().min(1).max(64).regex(/^[a-z0-9-]+$/);

  app.put<{ Params: { key: string } }>('/api/drafts/:key', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return reply;
    const key = draftKey.parse(request.params.key);
    const body = draftBody.parse(request.body);
    const payload = JSON.stringify(body.payload ?? null);
    /* A bound, because this is a write endpoint an authenticated client hits on a
       timer. 256 KB is far more than any form here produces and far less than a
       loop can use to fill a disk. */
    if (payload.length > 256 * 1024) {
      return reply.code(413).send({ error: 'that draft is too large to keep' });
    }
    const updatedAt = new Date().toISOString();
    await repo.putDraft({ accountId: session.accountId, draftKey: key, payload, updatedAt });
    return reply.send({ draftKey: key, updatedAt });
  });

  app.get<{ Params: { key: string } }>('/api/drafts/:key', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return reply;
    const key = draftKey.parse(request.params.key);
    const draft = await repo.getDraft(session.accountId, key);
    if (!draft) return reply.send({ draft: null });
    return reply.send({
      draft: { draftKey: draft.draftKey, updatedAt: draft.updatedAt, payload: JSON.parse(draft.payload) },
    });
  });

  app.delete<{ Params: { key: string } }>('/api/drafts/:key', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return reply;
    const key = draftKey.parse(request.params.key);
    await repo.deleteDraft(session.accountId, key);
    return reply.send({ deleted: true });
  });

  app.get('/api/drafts', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return reply;
    const drafts = await repo.listDrafts(session.accountId);
    return reply.send({
      drafts: drafts.map((d) => ({ draftKey: d.draftKey, updatedAt: d.updatedAt })),
    });
  });
}
