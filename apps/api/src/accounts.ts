/**
 * PASSWORDS AND SESSIONS — the cryptographic core, with no I/O in it.
 *
 * `identity.ts` opens by saying what this module ends: *"It is **not**
 * authentication. There is no password, no session, no token verification, and the
 * actor is taken from a request header. In this form it is suitable for a
 * single-tenant design-partner deployment behind a network boundary, and for
 * nothing else."* That paragraph was an honest disclosure of a gap. This is the
 * gap being closed, and the disclosure stays until every route is behind it.
 *
 * Everything here is pure: a string in, a string out, no database, no request, no
 * clock beyond what is passed in. That is what makes it testable without a server
 * and reviewable without reading the routes.
 *
 * ---------------------------------------------------------------------------
 * WHY `node:crypto` SCRYPT AND NOT ARGON2 OR BCRYPT.
 *
 * `store.ts` already made this argument for the database and it holds here: *"a
 * design partner can run the product with no database server, no Docker and no
 * native compilation."* `argon2` and `bcrypt` are both native modules. scrypt is in
 * the runtime, it is memory-hard, and it is the algorithm NIST and OWASP both
 * accept where Argon2id is unavailable.
 *
 * The parameters are ENCODED IN THE HASH — `scrypt$N$r$p$salt$key` — for one
 * reason: cost has to be raisable. A stored hash that does not say what produced it
 * can never be strengthened without invalidating every password, so in practice it
 * never is. Here `needsRehash` reports a stale hash and `verify` still accepts it,
 * so the cost can be raised on any deployment and each account upgrades on its next
 * successful sign-in.
 */

import {
  createHash,
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
  type BinaryLike,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (
  password: BinaryLike,
  salt: BinaryLike,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * N = 2^15, r = 8, p = 1 — about 32 MB and roughly 100 ms of work per attempt on a
 * laptop.
 *
 * `maxmem` has to be set explicitly and generously: Node's default is 32 MB, which
 * is *exactly* what these parameters need, and the call fails intermittently at the
 * boundary rather than cleanly. 64 MB is the headroom, not the cost.
 *
 * This is one rung below OWASP's 2^17 recommendation, and the reason is stated
 * rather than hidden: 2^17 is 128 MB per concurrent sign-in, and a deployment that
 * a design partner runs on a laptop with no database server is not a deployment
 * that should fall over on four simultaneous logins. `needsRehash` exists so this
 * number can go up the day the deployment can afford it.
 */
const PARAMS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

const b64 = (b: Buffer): string => b.toString('base64');

/** `scrypt$N$r$p$salt$key`, all base64, `$`-delimited because base64 never contains one. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, PARAMS);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${b64(salt)}$${b64(key)}`;
}

/**
 * Verify a password against a stored hash.
 *
 * `timingSafeEqual` and not `===`. The comparison is of two 64-byte derived keys, so
 * a byte-at-a-time early return leaks how much of a guess was right — slowly, over
 * many attempts, but the fix costs one function call and the argument for skipping
 * it is always "an attacker probably could not measure that".
 *
 * NFKC on the password, on both sides. Two visually identical passwords can be
 * different byte sequences — a composed and a decomposed Arabic or accented
 * character, most obviously — and a reader who set a password on one device and
 * cannot sign in on another has been locked out by a normalisation bug that looks
 * like a typo.
 *
 * It returns `false` rather than throwing on a malformed record. A corrupt row is
 * an authentication failure, not a 500: throwing here would turn a bad hash into a
 * signal that the account exists.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isSafeInteger(N) || !Number.isSafeInteger(r) || !Number.isSafeInteger(p)) return false;
  /* An absurd N in a tampered row would be a denial of service against ourselves. */
  if (N > 1 << 20 || r > 32 || p > 16) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4]!, 'base64');
    expected = Buffer.from(parts[5]!, 'base64');
  } catch {
    return false;
  }
  if (expected.length === 0) return false;

  let actual: Buffer;
  try {
    actual = await scrypt(password.normalize('NFKC'), salt, expected.length, {
      N,
      r,
      p,
      maxmem: Math.max(PARAMS.maxmem, 256 * N * r),
    });
  } catch {
    return false;
  }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** True when the stored hash was produced by weaker parameters than the current ones. */
export function needsRehash(stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return true;
  return (
    Number(parts[1]) < PARAMS.N || Number(parts[2]) < PARAMS.r || Number(parts[3]) < PARAMS.p
  );
}

/* ==========================================================================
 * SESSIONS
 * ======================================================================= */

/**
 * 32 bytes from the CSPRNG, base64url.
 *
 * 256 bits, which is not a number anyone guesses. The encoding is base64url and not
 * hex because the token travels in a cookie and hex would make it 64 characters for
 * the same entropy; and not plain base64 because `+` and `/` in a cookie value are
 * a serialisation problem waiting for the one library that does not quote it.
 */
export function mintSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * WHAT GOES IN THE DATABASE IS THE HASH, NEVER THE TOKEN.
 *
 * This is the whole reason the two functions are separate. A session table holding
 * live tokens is a table where read access is session-minting access — a backup, a
 * log line, a `SELECT *` in a support ticket, or an SQL injection anywhere in the
 * product all become "sign in as anybody". Storing SHA-256 of the token means the
 * database can be read in full and no session can be forged from it.
 *
 * Plain SHA-256 and not scrypt, deliberately: this input is 256 bits of uniform
 * randomness, so there is no dictionary to attack and nothing for a slow hash to
 * buy. The slow hash is for passwords, which are guessable; a KDF here would only
 * put ~100 ms in front of every authenticated request.
 */
export function sessionTokenHash(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Thirty days, and it slides.
 *
 * Long because the alternative is a reader losing a half-entered plot to an
 * expiry — and this product is used in sessions measured in hours across days, on a
 * site, on a laptop that gets closed. Sliding because a fixed expiry logs someone
 * out mid-run; `touchSession` moves it forward on use.
 */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * The cookie.
 *
 * `HttpOnly` — script cannot read it, so an XSS anywhere on the site cannot exfiltrate
 *   a session. This is the single most valuable attribute here.
 * `SameSite=Lax` — the browser will not send it on a cross-site POST, which is CSRF
 *   defence that costs nothing. It works because `vite.config.ts` proxies `/api` to
 *   the API, so the browser sees one origin; a deployment that serves the API from
 *   another origin has to revisit this, and would need `SameSite=None; Secure` plus
 *   a CORS allowlist rather than the current permissive one.
 * `Secure` — set from the request's own protocol rather than an environment
 *   variable, so it is on in production and does not silently break `http://localhost`.
 * `Path=/` — the cookie is for the whole product, not just `/api`, because a future
 *   server-rendered route would need it too.
 */
export function sessionCookie(
  token: string,
  { secure, maxAgeMs = SESSION_TTL_MS }: { secure: boolean; maxAgeMs?: number },
): string {
  const parts = [
    `envelope_session=${token}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

/** The same cookie, expired. Used on sign-out and on presenting an unknown token. */
export function clearedSessionCookie(secure: boolean): string {
  const parts = ['envelope_session=', 'HttpOnly', 'SameSite=Lax', 'Path=/', 'Max-Age=0'];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

/**
 * Read our cookie out of a `Cookie` header without a parser dependency.
 *
 * Deliberately tolerant of the things that are legal and surprising — leading
 * spaces, an empty pair from a trailing `;`, another cookie whose name ends in ours
 * (`x_envelope_session`, which a naive `includes` would match).
 */
export function readSessionCookie(header: string | undefined): string | null {
  if (!header) return null;
  for (const pair of header.split(';')) {
    const eq = pair.indexOf('=');
    if (eq < 0) continue;
    if (pair.slice(0, eq).trim() !== 'envelope_session') continue;
    const value = pair.slice(eq + 1).trim();
    return value.length > 0 ? value : null;
  }
  return null;
}

/* ==========================================================================
 * WHAT AN EMAIL IS, FOR OUR PURPOSES
 * ======================================================================= */

/**
 * Normalised for storage and comparison: trimmed and lower-cased.
 *
 * NOT stripped of dots or `+tags`. Gmail treats `a.b+x@gmail.com` as `ab@gmail.com`
 * and almost no other provider does, so a product that normalises for Gmail's rules
 * silently merges two distinct accounts at every provider that does not — and the
 * person who cannot sign in has no way to discover why. The local part is
 * case-sensitive by RFC 5321 and case-insensitive in practice at every provider
 * anyone uses; lower-casing it is the pragmatic choice and it is the only liberty
 * taken.
 */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * A deliberately loose check.
 *
 * There is exactly one way to know an address is real and it is to send mail to it.
 * A strict regex rejects valid addresses — quoted local parts, new TLDs, IDN
 * domains — and buys nothing, because the ones it lets through are still unverified.
 * So: something, an `@`, something with a dot, no whitespace, and a length bound.
 */
export function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

/**
 * TWELVE CHARACTERS, AND NO COMPOSITION RULES.
 *
 * Length is the only password requirement with evidence behind it. "One upper, one
 * digit, one symbol" produces `Password1!` at scale — NIST SP 800-63B dropped
 * composition rules and raised the minimum length for exactly that reason, and this
 * follows it.
 *
 * The upper bound is 256 and it is a denial-of-service control, not a policy: scrypt
 * runs over whatever it is given, and an unbounded password field is a way to make
 * the server do arbitrary work on an unauthenticated route.
 */
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 256;

export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN) {
    return `A password needs at least ${PASSWORD_MIN} characters. Length is the only requirement — there are no composition rules, because they produce weaker passwords rather than stronger ones.`;
  }
  if (password.length > PASSWORD_MAX) return `A password may be at most ${PASSWORD_MAX} characters.`;
  return null;
}
