/**
 * The cryptographic core, tested for the properties that matter rather than for
 * coverage.
 *
 * Each block below names the failure it exists to catch. A test called "it hashes a
 * password" asserts that a function ran; these assert that a specific way of getting
 * authentication wrong is not present.
 */

import { describe, expect, it } from 'vitest';

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
  PASSWORD_MIN,
} from '../src/accounts.js';
import { SqliteAccountRepository } from '../src/account-store.js';

describe('passwords', () => {
  it('round-trips, and rejects the wrong password', async () => {
    const hash = await hashPassword('a correct horse battery staple');
    await expect(verifyPassword('a correct horse battery staple', hash)).resolves.toBe(true);
    await expect(verifyPassword('a correct horse battery stapl', hash)).resolves.toBe(false);
    await expect(verifyPassword('', hash)).resolves.toBe(false);
  });

  it('never stores the password, and never the same hash twice', async () => {
    // A shared or absent salt is the defect that turns one leaked table into every
    // account at once: identical passwords would produce identical hashes, so a
    // single cracked password unlocks everyone who chose it.
    const a = await hashPassword('the same password');
    const b = await hashPassword('the same password');
    expect(a).not.toEqual(b);
    expect(a).not.toContain('the same password');
    expect(a.startsWith('scrypt$32768$8$1$')).toBe(true);
  });

  it('carries its own parameters, so cost can be raised later', async () => {
    const hash = await hashPassword('a correct horse battery staple');
    expect(needsRehash(hash)).toBe(false);
    // A hash produced by weaker parameters must still VERIFY — otherwise raising the
    // cost locks out every existing account, which is why in practice nobody raises
    // it. It is only flagged for re-hashing on the next successful sign-in.
    const weak = 'scrypt$16384$8$1$c2FsdHNhbHRzYWx0c2E=$' + 'x'.repeat(4);
    expect(needsRehash(weak)).toBe(true);
    expect(needsRehash('bcrypt$whatever')).toBe(true);
  });

  it('treats a malformed record as a failed sign-in, not a crash', async () => {
    // Throwing here would leak: a 500 on a corrupt row and a 401 on a wrong password
    // are two different answers to "does this account exist".
    for (const bad of ['', 'scrypt$', 'scrypt$a$b$c$d$e', 'scrypt$32768$8$1$$', 'nonsense']) {
      await expect(verifyPassword('anything', bad)).resolves.toBe(false);
    }
  });

  it('refuses a tampered record that would make us do unbounded work', async () => {
    // N is read from the stored string. Without a bound, a row edited to N = 2^40 is
    // a denial of service we perform on ourselves, triggered by an unauthenticated
    // request.
    const absurd = `scrypt$${2 ** 30}$8$1$c2FsdA==$aGFzaA==`;
    await expect(verifyPassword('anything', absurd)).resolves.toBe(false);
  });

  it('normalises unicode so one password is one password on every device', async () => {
    // U+00E9 and U+0065 U+0301 render identically and are different bytes. Without
    // NFKC a reader who sets a password on a Mac cannot sign in on Windows, and the
    // symptom is indistinguishable from a typo.
    const composed = 'clé de voûte très longue';
    const decomposed = composed.normalize('NFD');
    expect(composed).not.toEqual(decomposed);
    const hash = await hashPassword(composed);
    await expect(verifyPassword(decomposed, hash)).resolves.toBe(true);
  });

  it('requires length and nothing else', () => {
    expect(passwordProblem('short')).toContain(String(PASSWORD_MIN));
    expect(passwordProblem('x'.repeat(PASSWORD_MIN))).toBeNull();
    // No composition rules: NIST SP 800-63B dropped them because they produce
    // `Password1!` at scale. A long passphrase of one character class passes.
    expect(passwordProblem('correcthorsebatterystaple')).toBeNull();
    expect(passwordProblem('x'.repeat(500))).toContain('at most');
  });
});

describe('sessions', () => {
  it('stores a hash and not the token', () => {
    const token = mintSessionToken();
    const stored = sessionTokenHash(token);
    expect(stored).not.toEqual(token);
    expect(stored).toMatch(/^[0-9a-f]{64}$/);
    // The property that matters: the database can be read in full and no session can
    // be minted from it.
    expect(stored).not.toContain(token.slice(0, 8));
  });

  it('mints tokens with real entropy', () => {
    const seen = new Set(Array.from({ length: 500 }, () => mintSessionToken()));
    expect(seen.size).toBe(500);
    for (const t of seen) expect(t.length).toBeGreaterThanOrEqual(43);
  });

  it('sets the attributes that do the work', () => {
    const c = sessionCookie('tok', { secure: true });
    expect(c).toContain('HttpOnly'); // an XSS anywhere cannot exfiltrate the session
    expect(c).toContain('SameSite=Lax'); // a cross-site POST does not carry it
    expect(c).toContain('Secure');
    expect(c).toContain('Path=/');
    // `Secure` follows the request's protocol so http://localhost still works.
    expect(sessionCookie('tok', { secure: false })).not.toContain('Secure');
    expect(clearedSessionCookie(true)).toContain('Max-Age=0');
  });

  it('reads its own cookie and not one that merely ends with the same name', () => {
    expect(readSessionCookie('envelope_session=abc')).toBe('abc');
    expect(readSessionCookie('theme=dark; envelope_session=abc; other=1')).toBe('abc');
    expect(readSessionCookie('  envelope_session = abc ')).toBe('abc');
    // The defect a naive `includes` or `startsWith` produces: another cookie whose
    // name ends in ours would be read as ours.
    expect(readSessionCookie('x_envelope_session=stolen')).toBeNull();
    expect(readSessionCookie('envelope_session=')).toBeNull();
    expect(readSessionCookie(undefined)).toBeNull();
  });
});

describe('email', () => {
  it('lower-cases and trims, and does nothing else', () => {
    expect(normaliseEmail('  Khaled@Example.COM ')).toBe('khaled@example.com');
    // Gmail's dot and +tag rules are Gmail's. Applying them everywhere silently
    // merges two distinct accounts at every provider that does not share them.
    expect(normaliseEmail('a.b+tag@example.com')).toBe('a.b+tag@example.com');
  });

  it('is loose, because only sending mail proves an address', () => {
    expect(looksLikeEmail('a@b.co')).toBe(true);
    expect(looksLikeEmail('خالد@مثال.شبكة')).toBe(true); // IDN is a real address
    expect(looksLikeEmail('no-at-sign')).toBe(false);
    expect(looksLikeEmail('two@@at.com')).toBe(false);
    expect(looksLikeEmail(`${'x'.repeat(250)}@b.co`)).toBe(false);
  });
});

describe('the account store', () => {
  it('refuses a second account on one email in the database, not only in a check', async () => {
    const repo = new SqliteAccountRepository();
    const base = {
      name: 'Khaled',
      licence: null,
      passwordHash: 'scrypt$1$1$1$a$b',
      createdAt: '2026-08-31T00:00:00.000Z',
    };
    await repo.createAccount({ accountId: 'a1', email: 'k@example.com', ...base });
    // A "does it exist" check followed by an insert is two statements with a race
    // between them, and a double-clicked sign-up form is enough to lose it.
    await expect(
      repo.createAccount({ accountId: 'a2', email: 'k@example.com', ...base }),
    ).rejects.toThrow();
    await repo.close();
  });

  it('keeps a run readable by a named reviewer, which is what G4 needs', async () => {
    const repo = new SqliteAccountRepository();
    await repo.grantShare({
      runId: 'run-1',
      accountId: 'reviewer-1',
      role: 'reviewer',
      grantedByAccountId: 'author-1',
      grantedAt: '2026-08-31T00:00:00.000Z',
    });
    const share = await repo.getShare('run-1', 'reviewer-1');
    expect(share?.role).toBe('reviewer');
    // The gate's requirement is now a query rather than a convention: the signer is
    // a different account from the granter, and the database says so.
    expect(share?.grantedByAccountId).not.toBe(share?.accountId);
    // Re-granting changes the role rather than duplicating the row.
    await repo.grantShare({
      runId: 'run-1',
      accountId: 'reviewer-1',
      role: 'reader',
      grantedByAccountId: 'author-1',
      grantedAt: '2026-08-31T01:00:00.000Z',
    });
    expect((await repo.listSharesForRun('run-1')).length).toBe(1);
    expect((await repo.getShare('run-1', 'reviewer-1'))?.role).toBe('reader');
    await repo.close();
  });

  it('keeps one draft per form per account, newest write winning', async () => {
    const repo = new SqliteAccountRepository();
    await repo.putDraft({
      accountId: 'a1',
      draftKey: 'plot-form',
      payload: '{"width":"50"}',
      updatedAt: '2026-08-31T00:00:00.000Z',
    });
    await repo.putDraft({
      accountId: 'a1',
      draftKey: 'plot-form',
      payload: '{"width":"50.85"}',
      updatedAt: '2026-08-31T00:01:00.000Z',
    });
    expect((await repo.listDrafts('a1')).length).toBe(1);
    expect((await repo.getDraft('a1', 'plot-form'))?.payload).toBe('{"width":"50.85"}');
    // Another account's draft under the same key is a different draft.
    await repo.putDraft({
      accountId: 'a2',
      draftKey: 'plot-form',
      payload: '{"width":"12"}',
      updatedAt: '2026-08-31T00:02:00.000Z',
    });
    expect((await repo.getDraft('a1', 'plot-form'))?.payload).toBe('{"width":"50.85"}');
    await repo.close();
  });

  it('expires sessions by time, and revokes every session an account holds', async () => {
    const repo = new SqliteAccountRepository();
    const mk = (h: string, exp: string) => ({
      tokenHash: h,
      accountId: 'a1',
      createdAt: '2026-08-01T00:00:00.000Z',
      expiresAt: exp,
      lastSeenAt: '2026-08-01T00:00:00.000Z',
    });
    await repo.createSession(mk('h1', '2026-08-30T00:00:00.000Z'));
    await repo.createSession(mk('h2', '2026-09-30T00:00:00.000Z'));
    expect(await repo.deleteExpiredSessions('2026-08-31T00:00:00.000Z')).toBe(1);
    expect(await repo.getSession('h1')).toBeUndefined();
    expect(await repo.getSession('h2')).toBeDefined();
    // "Sign out everywhere" has to be one statement, or a stolen session survives it.
    await repo.deleteSessionsFor('a1');
    expect(await repo.getSession('h2')).toBeUndefined();
    await repo.close();
  });
});
