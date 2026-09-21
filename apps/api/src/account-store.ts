/**
 * ACCOUNTS, SESSIONS, SHARES AND DRAFTS — the seam and the SQLite implementation.
 *
 * A separate file from `store.ts` and a separate interface from `RunRepository`,
 * for the same reason `packages/invariants` cannot see `packages/capacity`: these
 * are different concerns and the boundary should be visible in the imports. A run
 * is an immutable record of a computation; an account is a mutable fact about a
 * person. Putting them behind one interface would let a route that only needs to
 * read a session reach the run store, and there is no reason it should.
 *
 * ---------------------------------------------------------------------------
 * THE DESIGN DECISION THIS FILE EXISTS TO RESOLVE.
 *
 * `CLAUDE.md` records that per-author scoping was *considered and rejected*:
 *
 *   > "Per-author scoping was considered and rejected — `G4` is signed by a
 *   > reviewer who is deliberately *not* the author, so ownership checks would
 *   > break the one flow the gate exists for."
 *
 * That argument is correct and it is not a reason to have no authorization. It is a
 * reason that ownership alone is the wrong model. The resolution is `run_shares`:
 * a run is readable by its author AND by anyone the author has granted access to,
 * and a share carries a ROLE. A `reviewer` share is what makes G4 possible under
 * isolation — the author names the person who will sign, that person can see the
 * run, and the gate's requirement that the signer is not the author is now
 * ENFORCEABLE rather than merely conventional.
 *
 * So the feature strengthens the gate instead of breaking it. Before this, "the
 * reviewer is a different person" was a hope; a database with no identities cannot
 * check it. `run_shares` plus `account_id` makes it a query.
 *
 * ---------------------------------------------------------------------------
 * ON THE SQL DIALECT. As in `store.ts`: written in the subset SQLite and MySQL
 * share, so `store-mysql.ts` gains a sibling implementation rather than a rewrite.
 * No `RETURNING`, no `ON CONFLICT`, no partial indexes.
 */

import { createRequire } from 'node:module';

/* See `store.ts` for why this is `createRequire` and not an import. */
const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite');
type DatabaseSync = InstanceType<typeof DatabaseSync>;

export interface StoredAccount {
  readonly accountId: string;
  /** Normalised: trimmed and lower-cased. `accounts.ts` says what is NOT normalised. */
  readonly email: string;
  readonly name: string;
  /**
   * The professional licence the person asserts, or null.
   *
   * `identity.ts` is explicit that this is recorded and never verified, and
   * `/refusals` says so on the public site: "it cannot verify the licence with
   * anybody". Storing it against an account rather than re-typing it per run does
   * not change that, and the copy must not start implying it does.
   */
  readonly licence: string | null;
  readonly passwordHash: string;
  readonly createdAt: string;
}

export interface StoredSession {
  readonly tokenHash: string;
  readonly accountId: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly lastSeenAt: string;
}

/** `reviewer` is the role that makes G4 possible under isolation. */
export type ShareRole = 'reviewer' | 'reader';

export interface StoredShare {
  readonly runId: string;
  readonly accountId: string;
  readonly role: ShareRole;
  readonly grantedByAccountId: string;
  readonly grantedAt: string;
}

/**
 * AN UNFINISHED FORM, KEPT SO A CLOSED TAB IS NOT A LOST AFTERNOON.
 *
 * Deliberately NOT a run. A run is an immutable record of a completed computation
 * with a provenance graph and a fingerprint; a draft is a bag of half-entered
 * fields that may not even be valid. Conflating them would put unvalidated input
 * into the table §13.4 requires to be reproducible.
 *
 * `payload` is opaque JSON to this layer on purpose. The shape belongs to the form
 * that wrote it, it changes whenever the form changes, and a schema here would have
 * to be migrated in lockstep with a React component.
 */
export interface StoredDraft {
  readonly accountId: string;
  /** Which form. One draft per key per account — the newest write wins. */
  readonly draftKey: string;
  readonly payload: string;
  readonly updatedAt: string;
}

export interface AccountRepository {
  createAccount(account: StoredAccount): Promise<void>;
  getAccountByEmail(email: string): Promise<StoredAccount | undefined>;
  getAccountById(accountId: string): Promise<StoredAccount | undefined>;
  updatePasswordHash(accountId: string, passwordHash: string): Promise<void>;
  updateProfile(accountId: string, name: string, licence: string | null): Promise<void>;

  createSession(session: StoredSession): Promise<void>;
  getSession(tokenHash: string): Promise<StoredSession | undefined>;
  touchSession(tokenHash: string, lastSeenAt: string, expiresAt: string): Promise<void>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteSessionsFor(accountId: string): Promise<void>;
  /** Housekeeping. Called on sign-in, so an idle deployment does not accumulate rows. */
  deleteExpiredSessions(now: string): Promise<number>;

  grantShare(share: StoredShare): Promise<void>;
  revokeShare(runId: string, accountId: string): Promise<void>;
  listSharesForRun(runId: string): Promise<readonly StoredShare[]>;
  listSharesForAccount(accountId: string): Promise<readonly StoredShare[]>;
  getShare(runId: string, accountId: string): Promise<StoredShare | undefined>;

  putDraft(draft: StoredDraft): Promise<void>;
  getDraft(accountId: string, draftKey: string): Promise<StoredDraft | undefined>;
  listDrafts(accountId: string): Promise<readonly StoredDraft[]>;
  deleteDraft(accountId: string, draftKey: string): Promise<void>;

  close(): Promise<void>;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS accounts (
  account_id    TEXT PRIMARY KEY,
  email         TEXT NOT NULL,
  name          TEXT NOT NULL,
  licence       TEXT,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL
);
/*
  UNIQUE ON EMAIL, AND IT IS THE DATABASE THAT ENFORCES IT.

  A "does this email exist" check followed by an insert is two statements with a
  race between them, and the race is not theoretical on a sign-up form somebody
  double-clicks. The check exists too, because it produces a better error; this is
  what makes the error impossible to be wrong.
*/
CREATE UNIQUE INDEX IF NOT EXISTS accounts_by_email ON accounts (email);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash   TEXT PRIMARY KEY,
  account_id   TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  expires_at   TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_by_account ON sessions (account_id);
CREATE INDEX IF NOT EXISTS sessions_by_expiry ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS run_shares (
  run_id                TEXT NOT NULL,
  account_id            TEXT NOT NULL,
  role                  TEXT NOT NULL,
  granted_by_account_id TEXT NOT NULL,
  granted_at            TEXT NOT NULL,
  PRIMARY KEY (run_id, account_id)
);
CREATE INDEX IF NOT EXISTS shares_by_account ON run_shares (account_id, granted_at DESC);

CREATE TABLE IF NOT EXISTS drafts (
  account_id TEXT NOT NULL,
  draft_key  TEXT NOT NULL,
  payload    TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (account_id, draft_key)
);
CREATE INDEX IF NOT EXISTS drafts_by_account ON drafts (account_id, updated_at DESC);
`;

interface AccountRow {
  account_id: string;
  email: string;
  name: string;
  licence: string | null;
  password_hash: string;
  created_at: string;
}
interface SessionRow {
  token_hash: string;
  account_id: string;
  created_at: string;
  expires_at: string;
  last_seen_at: string;
}
interface ShareRow {
  run_id: string;
  account_id: string;
  role: string;
  granted_by_account_id: string;
  granted_at: string;
}
interface DraftRow {
  account_id: string;
  draft_key: string;
  payload: string;
  updated_at: string;
}

const toAccount = (r: AccountRow): StoredAccount => ({
  accountId: r.account_id,
  email: r.email,
  name: r.name,
  licence: r.licence,
  passwordHash: r.password_hash,
  createdAt: r.created_at,
});

const toSession = (r: SessionRow): StoredSession => ({
  tokenHash: r.token_hash,
  accountId: r.account_id,
  createdAt: r.created_at,
  expiresAt: r.expires_at,
  lastSeenAt: r.last_seen_at,
});

const toShare = (r: ShareRow): StoredShare => ({
  runId: r.run_id,
  accountId: r.account_id,
  role: r.role === 'reviewer' ? 'reviewer' : 'reader',
  grantedByAccountId: r.granted_by_account_id,
  grantedAt: r.granted_at,
});

const toDraft = (r: DraftRow): StoredDraft => ({
  accountId: r.account_id,
  draftKey: r.draft_key,
  payload: r.payload,
  updatedAt: r.updated_at,
});

export class SqliteAccountRepository implements AccountRepository {
  readonly #db: DatabaseSync;

  constructor(filename = ':memory:') {
    this.#db = new DatabaseSync(filename);
    this.#db.exec('PRAGMA journal_mode = WAL');
    this.#db.exec('PRAGMA foreign_keys = ON');
    this.#db.exec(SCHEMA);
  }

  async createAccount(a: StoredAccount): Promise<void> {
    this.#db
      .prepare(
        `INSERT INTO accounts
           (account_id, email, name, licence, password_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(a.accountId, a.email, a.name, a.licence, a.passwordHash, a.createdAt);
  }

  async getAccountByEmail(email: string): Promise<StoredAccount | undefined> {
    const row = this.#db.prepare('SELECT * FROM accounts WHERE email = ?').get(email) as
      | AccountRow
      | undefined;
    return row ? toAccount(row) : undefined;
  }

  async getAccountById(accountId: string): Promise<StoredAccount | undefined> {
    const row = this.#db.prepare('SELECT * FROM accounts WHERE account_id = ?').get(accountId) as
      | AccountRow
      | undefined;
    return row ? toAccount(row) : undefined;
  }

  async updatePasswordHash(accountId: string, passwordHash: string): Promise<void> {
    this.#db
      .prepare('UPDATE accounts SET password_hash = ? WHERE account_id = ?')
      .run(passwordHash, accountId);
  }

  async updateProfile(accountId: string, name: string, licence: string | null): Promise<void> {
    this.#db
      .prepare('UPDATE accounts SET name = ?, licence = ? WHERE account_id = ?')
      .run(name, licence, accountId);
  }

  async createSession(s: StoredSession): Promise<void> {
    this.#db
      .prepare(
        `INSERT INTO sessions (token_hash, account_id, created_at, expires_at, last_seen_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(s.tokenHash, s.accountId, s.createdAt, s.expiresAt, s.lastSeenAt);
  }

  async getSession(tokenHash: string): Promise<StoredSession | undefined> {
    const row = this.#db.prepare('SELECT * FROM sessions WHERE token_hash = ?').get(tokenHash) as
      | SessionRow
      | undefined;
    return row ? toSession(row) : undefined;
  }

  async touchSession(tokenHash: string, lastSeenAt: string, expiresAt: string): Promise<void> {
    this.#db
      .prepare('UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE token_hash = ?')
      .run(lastSeenAt, expiresAt, tokenHash);
  }

  async deleteSession(tokenHash: string): Promise<void> {
    this.#db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
  }

  async deleteSessionsFor(accountId: string): Promise<void> {
    this.#db.prepare('DELETE FROM sessions WHERE account_id = ?').run(accountId);
  }

  async deleteExpiredSessions(now: string): Promise<number> {
    const r = this.#db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
    return Number(r.changes ?? 0);
  }

  async grantShare(s: StoredShare): Promise<void> {
    /* No `ON CONFLICT` — it is SQLite-and-Postgres syntax and MySQL spells it
       differently, and this file is written in the subset both share. Delete then
       insert is two statements and the same outcome. */
    this.#db.prepare('DELETE FROM run_shares WHERE run_id = ? AND account_id = ?').run(
      s.runId,
      s.accountId,
    );
    this.#db
      .prepare(
        `INSERT INTO run_shares (run_id, account_id, role, granted_by_account_id, granted_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(s.runId, s.accountId, s.role, s.grantedByAccountId, s.grantedAt);
  }

  async revokeShare(runId: string, accountId: string): Promise<void> {
    this.#db
      .prepare('DELETE FROM run_shares WHERE run_id = ? AND account_id = ?')
      .run(runId, accountId);
  }

  async listSharesForRun(runId: string): Promise<readonly StoredShare[]> {
    const rows = this.#db
      .prepare('SELECT * FROM run_shares WHERE run_id = ? ORDER BY granted_at DESC')
      .all(runId) as unknown as ShareRow[];
    return rows.map(toShare);
  }

  async listSharesForAccount(accountId: string): Promise<readonly StoredShare[]> {
    const rows = this.#db
      .prepare('SELECT * FROM run_shares WHERE account_id = ? ORDER BY granted_at DESC')
      .all(accountId) as unknown as ShareRow[];
    return rows.map(toShare);
  }

  async getShare(runId: string, accountId: string): Promise<StoredShare | undefined> {
    const row = this.#db
      .prepare('SELECT * FROM run_shares WHERE run_id = ? AND account_id = ?')
      .get(runId, accountId) as ShareRow | undefined;
    return row ? toShare(row) : undefined;
  }

  async putDraft(d: StoredDraft): Promise<void> {
    this.#db
      .prepare('DELETE FROM drafts WHERE account_id = ? AND draft_key = ?')
      .run(d.accountId, d.draftKey);
    this.#db
      .prepare('INSERT INTO drafts (account_id, draft_key, payload, updated_at) VALUES (?, ?, ?, ?)')
      .run(d.accountId, d.draftKey, d.payload, d.updatedAt);
  }

  async getDraft(accountId: string, draftKey: string): Promise<StoredDraft | undefined> {
    const row = this.#db
      .prepare('SELECT * FROM drafts WHERE account_id = ? AND draft_key = ?')
      .get(accountId, draftKey) as DraftRow | undefined;
    return row ? toDraft(row) : undefined;
  }

  async listDrafts(accountId: string): Promise<readonly StoredDraft[]> {
    const rows = this.#db
      .prepare('SELECT * FROM drafts WHERE account_id = ? ORDER BY updated_at DESC')
      .all(accountId) as unknown as DraftRow[];
    return rows.map(toDraft);
  }

  async deleteDraft(accountId: string, draftKey: string): Promise<void> {
    this.#db
      .prepare('DELETE FROM drafts WHERE account_id = ? AND draft_key = ?')
      .run(accountId, draftKey);
  }

  async close(): Promise<void> {
    this.#db.close();
  }
}
