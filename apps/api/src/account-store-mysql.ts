/**
 * ACCOUNTS, SESSIONS, SHARES AND DRAFTS ON MYSQL.
 *
 * The sibling `account-store.ts` promised: "written in the subset SQLite and MySQL
 * share, so `store-mysql.ts` gains a sibling implementation rather than a rewrite".
 * The statements below are those statements; what changes is the DDL, for the
 * reasons `store-mysql.ts` gives for the run tables and one more.
 *
 * - Identifiers and hashes are `VARCHAR` with `utf8mb4_bin`. A session token hash
 *   compared case-insensitively is a hash with fewer bits than it claims.
 * - `email` is `utf8mb4_bin` too, and that is safe only because `accounts.ts`
 *   normalises it before it is stored or looked up. A case-insensitive collation
 *   would hide a missed normalisation instead of failing on it.
 * - Timestamps are ISO-8601 strings, as in every other table here, so
 *   `expires_at <= ?` compares the same way in both databases.
 * - A draft payload is `LONGTEXT`. The route caps it at 256 KB; `TEXT` stops at 64.
 */

import type {
  AccountRepository,
  StoredAccount,
  StoredDraft,
  StoredSession,
  StoredShare,
} from './account-store.js';
import type { MysqlPool } from './store-mysql.js';

export const MYSQL_ACCOUNT_SCHEMA: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS accounts (
     account_id    VARCHAR(64)  NOT NULL,
     email         VARCHAR(254) NOT NULL,
     name          VARCHAR(255) NOT NULL,
     licence       VARCHAR(255) NULL,
     password_hash VARCHAR(512) NOT NULL,
     created_at    VARCHAR(32)  NOT NULL,
     PRIMARY KEY (account_id),
     UNIQUE KEY accounts_by_email (email)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`,

  `CREATE TABLE IF NOT EXISTS sessions (
     token_hash   VARCHAR(128) NOT NULL,
     account_id   VARCHAR(64)  NOT NULL,
     created_at   VARCHAR(32)  NOT NULL,
     expires_at   VARCHAR(32)  NOT NULL,
     last_seen_at VARCHAR(32)  NOT NULL,
     PRIMARY KEY (token_hash),
     KEY sessions_by_account (account_id),
     KEY sessions_by_expiry (expires_at)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`,

  `CREATE TABLE IF NOT EXISTS run_shares (
     run_id                VARCHAR(64) NOT NULL,
     account_id            VARCHAR(64) NOT NULL,
     role                  VARCHAR(16) NOT NULL,
     granted_by_account_id VARCHAR(64) NOT NULL,
     granted_at            VARCHAR(32) NOT NULL,
     PRIMARY KEY (run_id, account_id),
     KEY shares_by_account (account_id, granted_at DESC)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`,

  `CREATE TABLE IF NOT EXISTS drafts (
     account_id VARCHAR(64)  NOT NULL,
     draft_key  VARCHAR(64)  NOT NULL,
     payload    LONGTEXT     NOT NULL,
     updated_at VARCHAR(32)  NOT NULL,
     PRIMARY KEY (account_id, draft_key),
     KEY drafts_by_account (account_id, updated_at DESC)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`,
];

type Row = { readonly [column: string]: unknown };

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

const toAccount = (r: Row): StoredAccount => ({
  accountId: str(r['account_id']),
  email: str(r['email']),
  name: str(r['name']),
  licence: r['licence'] === null || r['licence'] === undefined ? null : str(r['licence']),
  passwordHash: str(r['password_hash']),
  createdAt: str(r['created_at']),
});

const toSession = (r: Row): StoredSession => ({
  tokenHash: str(r['token_hash']),
  accountId: str(r['account_id']),
  createdAt: str(r['created_at']),
  expiresAt: str(r['expires_at']),
  lastSeenAt: str(r['last_seen_at']),
});

const toShare = (r: Row): StoredShare => ({
  runId: str(r['run_id']),
  accountId: str(r['account_id']),
  role: r['role'] === 'reviewer' ? 'reviewer' : 'reader',
  grantedByAccountId: str(r['granted_by_account_id']),
  grantedAt: str(r['granted_at']),
});

const toDraft = (r: Row): StoredDraft => ({
  accountId: str(r['account_id']),
  draftKey: str(r['draft_key']),
  payload: str(r['payload']),
  updatedAt: str(r['updated_at']),
});

export class MysqlAccountRepository implements AccountRepository {
  readonly #pool: MysqlPool;
  readonly #ownsPool: boolean;

  private constructor(pool: MysqlPool, ownsPool: boolean) {
    this.#pool = pool;
    this.#ownsPool = ownsPool;
  }

  /**
   * Apply the schema and hand back a repository.
   *
   * `ownsPool` false is the production arrangement — the pool is shared with the
   * run store, and whichever closes last must not find it already ended.
   */
  static async open(pool: MysqlPool, ownsPool = false): Promise<MysqlAccountRepository> {
    for (const ddl of MYSQL_ACCOUNT_SCHEMA) await pool.query(ddl);
    return new MysqlAccountRepository(pool, ownsPool);
  }

  async #rows(sql: string, values: readonly unknown[]): Promise<Row[]> {
    const [rows] = await this.#pool.execute(sql, values);
    return rows as Row[];
  }

  async createAccount(a: StoredAccount): Promise<void> {
    await this.#pool.execute(
      `INSERT INTO accounts (account_id, email, name, licence, password_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [a.accountId, a.email, a.name, a.licence, a.passwordHash, a.createdAt],
    );
  }

  async getAccountByEmail(email: string): Promise<StoredAccount | undefined> {
    const [row] = await this.#rows('SELECT * FROM accounts WHERE email = ?', [email]);
    return row ? toAccount(row) : undefined;
  }

  async getAccountById(accountId: string): Promise<StoredAccount | undefined> {
    const [row] = await this.#rows('SELECT * FROM accounts WHERE account_id = ?', [accountId]);
    return row ? toAccount(row) : undefined;
  }

  async updatePasswordHash(accountId: string, passwordHash: string): Promise<void> {
    await this.#pool.execute('UPDATE accounts SET password_hash = ? WHERE account_id = ?', [
      passwordHash,
      accountId,
    ]);
  }

  async updateProfile(accountId: string, name: string, licence: string | null): Promise<void> {
    await this.#pool.execute('UPDATE accounts SET name = ?, licence = ? WHERE account_id = ?', [
      name,
      licence,
      accountId,
    ]);
  }

  async createSession(s: StoredSession): Promise<void> {
    await this.#pool.execute(
      `INSERT INTO sessions (token_hash, account_id, created_at, expires_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?)`,
      [s.tokenHash, s.accountId, s.createdAt, s.expiresAt, s.lastSeenAt],
    );
  }

  async getSession(tokenHash: string): Promise<StoredSession | undefined> {
    const [row] = await this.#rows('SELECT * FROM sessions WHERE token_hash = ?', [tokenHash]);
    return row ? toSession(row) : undefined;
  }

  async touchSession(tokenHash: string, lastSeenAt: string, expiresAt: string): Promise<void> {
    await this.#pool.execute(
      'UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE token_hash = ?',
      [lastSeenAt, expiresAt, tokenHash],
    );
  }

  async deleteSession(tokenHash: string): Promise<void> {
    await this.#pool.execute('DELETE FROM sessions WHERE token_hash = ?', [tokenHash]);
  }

  async deleteSessionsFor(accountId: string): Promise<void> {
    await this.#pool.execute('DELETE FROM sessions WHERE account_id = ?', [accountId]);
  }

  async deleteExpiredSessions(now: string): Promise<number> {
    const [result] = await this.#pool.execute('DELETE FROM sessions WHERE expires_at <= ?', [now]);
    return Number((result as unknown as { affectedRows?: number }).affectedRows ?? 0);
  }

  async grantShare(s: StoredShare): Promise<void> {
    /* Delete then insert, as in the SQLite sibling: \`ON DUPLICATE KEY UPDATE\` is
       MySQL's spelling of what SQLite calls \`ON CONFLICT\`, and one statement set
       for both is the point of the seam. */
    await this.#pool.execute('DELETE FROM run_shares WHERE run_id = ? AND account_id = ?', [
      s.runId,
      s.accountId,
    ]);
    await this.#pool.execute(
      `INSERT INTO run_shares (run_id, account_id, role, granted_by_account_id, granted_at)
       VALUES (?, ?, ?, ?, ?)`,
      [s.runId, s.accountId, s.role, s.grantedByAccountId, s.grantedAt],
    );
  }

  async revokeShare(runId: string, accountId: string): Promise<void> {
    await this.#pool.execute('DELETE FROM run_shares WHERE run_id = ? AND account_id = ?', [
      runId,
      accountId,
    ]);
  }

  async listSharesForRun(runId: string): Promise<readonly StoredShare[]> {
    const rows = await this.#rows(
      'SELECT * FROM run_shares WHERE run_id = ? ORDER BY granted_at DESC',
      [runId],
    );
    return rows.map(toShare);
  }

  async listSharesForAccount(accountId: string): Promise<readonly StoredShare[]> {
    const rows = await this.#rows(
      'SELECT * FROM run_shares WHERE account_id = ? ORDER BY granted_at DESC',
      [accountId],
    );
    return rows.map(toShare);
  }

  async getShare(runId: string, accountId: string): Promise<StoredShare | undefined> {
    const [row] = await this.#rows(
      'SELECT * FROM run_shares WHERE run_id = ? AND account_id = ?',
      [runId, accountId],
    );
    return row ? toShare(row) : undefined;
  }

  async putDraft(d: StoredDraft): Promise<void> {
    await this.#pool.execute('DELETE FROM drafts WHERE account_id = ? AND draft_key = ?', [
      d.accountId,
      d.draftKey,
    ]);
    await this.#pool.execute(
      'INSERT INTO drafts (account_id, draft_key, payload, updated_at) VALUES (?, ?, ?, ?)',
      [d.accountId, d.draftKey, d.payload, d.updatedAt],
    );
  }

  async getDraft(accountId: string, draftKey: string): Promise<StoredDraft | undefined> {
    const [row] = await this.#rows(
      'SELECT * FROM drafts WHERE account_id = ? AND draft_key = ?',
      [accountId, draftKey],
    );
    return row ? toDraft(row) : undefined;
  }

  async listDrafts(accountId: string): Promise<readonly StoredDraft[]> {
    const rows = await this.#rows(
      'SELECT * FROM drafts WHERE account_id = ? ORDER BY updated_at DESC',
      [accountId],
    );
    return rows.map(toDraft);
  }

  async deleteDraft(accountId: string, draftKey: string): Promise<void> {
    await this.#pool.execute('DELETE FROM drafts WHERE account_id = ? AND draft_key = ?', [
      accountId,
      draftKey,
    ]);
  }

  async close(): Promise<void> {
    if (this.#ownsPool) await this.#pool.end();
  }
}
