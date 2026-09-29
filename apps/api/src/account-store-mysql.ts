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

import {
  toWorkspaceRole,
  type AccountRepository,
  type StoredAccount,
  type StoredAuditEvent,
  type StoredDraft,
  type StoredInvite,
  type StoredMembership,
  type StoredOrganisation,
  type StoredScope,
  type StoredSession,
  type StoredShare,
  type WorkspaceRole,
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

  /* TENANCY. See `account-store.ts` for what an organisation is and is not. */
  `CREATE TABLE IF NOT EXISTS organisations (
     org_id                VARCHAR(64)  NOT NULL,
     name                  VARCHAR(160) NOT NULL,
     created_at            VARCHAR(32)  NOT NULL,
     created_by_account_id VARCHAR(64)  NOT NULL,
     PRIMARY KEY (org_id)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`,

  `CREATE TABLE IF NOT EXISTS org_members (
     org_id              VARCHAR(64) NOT NULL,
     account_id          VARCHAR(64) NOT NULL,
     role                VARCHAR(16) NOT NULL,
     added_by_account_id VARCHAR(64) NOT NULL,
     added_at            VARCHAR(32) NOT NULL,
     PRIMARY KEY (org_id, account_id),
     KEY members_by_account (account_id, added_at DESC)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`,

  `CREATE TABLE IF NOT EXISTS org_invites (
     invite_id              VARCHAR(64)  NOT NULL,
     org_id                 VARCHAR(64)  NOT NULL,
     email                  VARCHAR(254) NOT NULL,
     role                   VARCHAR(16)  NOT NULL,
     token_hash             VARCHAR(128) NOT NULL,
     invited_by_account_id  VARCHAR(64)  NOT NULL,
     created_at             VARCHAR(32)  NOT NULL,
     expires_at             VARCHAR(32)  NOT NULL,
     accepted_at            VARCHAR(32)  NULL,
     accepted_by_account_id VARCHAR(64)  NULL,
     revoked_at             VARCHAR(32)  NULL,
     PRIMARY KEY (invite_id),
     UNIQUE KEY invites_by_token (token_hash),
     KEY invites_by_org (org_id, created_at DESC)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`,

  `CREATE TABLE IF NOT EXISTS org_scope (
     org_id     VARCHAR(64) NOT NULL,
     scope_kind VARCHAR(16) NOT NULL,
     scope_id   VARCHAR(64) NOT NULL,
     created_at VARCHAR(32) NOT NULL,
     PRIMARY KEY (scope_kind, scope_id),
     KEY scope_by_org (org_id, scope_kind, created_at DESC)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`,

  /*
    `detail` is LONGTEXT for the reason `store-mysql.ts` gives for the payloads: a
    TEXT column truncates at 64 KB under a non-strict SQL mode, silently, and an
    audit row that was silently shortened is worse than no audit row at all.
  */
  `CREATE TABLE IF NOT EXISTS audit_events (
     event_id         VARCHAR(64)  NOT NULL,
     at               VARCHAR(32)  NOT NULL,
     org_id           VARCHAR(64)  NULL,
     actor_account_id VARCHAR(64)  NULL,
     actor_label      VARCHAR(160) NOT NULL,
     action           VARCHAR(64)  NOT NULL,
     subject          VARCHAR(160) NULL,
     detail           LONGTEXT     NOT NULL,
     PRIMARY KEY (event_id),
     KEY audit_by_org (org_id, at DESC)
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

/** MySQL hands back `null` for a NULL column; every other layer wants `string | null`. */
const orNull = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));

const toOrg = (r: Row): StoredOrganisation => ({
  orgId: str(r['org_id']),
  name: str(r['name']),
  createdAt: str(r['created_at']),
  createdByAccountId: str(r['created_by_account_id']),
});

const toMember = (r: Row): StoredMembership => ({
  orgId: str(r['org_id']),
  accountId: str(r['account_id']),
  role: toWorkspaceRole(str(r['role'])),
  addedByAccountId: str(r['added_by_account_id']),
  addedAt: str(r['added_at']),
});

const toInvite = (r: Row): StoredInvite => ({
  inviteId: str(r['invite_id']),
  orgId: str(r['org_id']),
  email: str(r['email']),
  role: toWorkspaceRole(str(r['role'])),
  tokenHash: str(r['token_hash']),
  invitedByAccountId: str(r['invited_by_account_id']),
  createdAt: str(r['created_at']),
  expiresAt: str(r['expires_at']),
  acceptedAt: orNull(r['accepted_at']),
  acceptedByAccountId: orNull(r['accepted_by_account_id']),
  revokedAt: orNull(r['revoked_at']),
});

const toScope = (r: Row): StoredScope => ({
  orgId: str(r['org_id']),
  scopeKind: str(r['scope_kind']) === 'run' ? 'run' : 'plot',
  scopeId: str(r['scope_id']),
  createdAt: str(r['created_at']),
});

const toAudit = (r: Row): StoredAuditEvent => ({
  eventId: str(r['event_id']),
  at: str(r['at']),
  orgId: orNull(r['org_id']),
  actorAccountId: orNull(r['actor_account_id']),
  actorLabel: str(r['actor_label']),
  action: str(r['action']),
  subject: orNull(r['subject']),
  detail: str(r['detail']),
});

const placeholders = (n: number): string => new Array(n).fill('?').join(', ');

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

  async getAccountsByIds(accountIds: readonly string[]): Promise<readonly StoredAccount[]> {
    if (accountIds.length === 0) return [];
    const rows = await this.#rows(
      `SELECT * FROM accounts WHERE account_id IN (${placeholders(accountIds.length)})`,
      accountIds,
    );
    return rows.map(toAccount);
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

  async createOrganisation(org: StoredOrganisation, owner: StoredMembership): Promise<void> {
    const ORG = `INSERT INTO organisations (org_id, name, created_at, created_by_account_id)
                 VALUES (?, ?, ?, ?)`;
    const MEMBER = `INSERT INTO org_members (org_id, account_id, role, added_by_account_id, added_at)
                    VALUES (?, ?, ?, ?, ?)`;
    const orgValues = [org.orgId, org.name, org.createdAt, org.createdByAccountId];
    const memberValues = [
      owner.orgId,
      owner.accountId,
      owner.role,
      owner.addedByAccountId,
      owner.addedAt,
    ];

    const take = this.#pool.getConnection;
    if (take) {
      const conn = await take.call(this.#pool);
      try {
        await conn.beginTransaction();
        await conn.execute(ORG, orgValues);
        await conn.execute(MEMBER, memberValues);
        await conn.commit();
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
      return;
    }

    /*
      NO TRANSACTION AVAILABLE — the membership goes in FIRST, deliberately.

      A pool without `getConnection` cannot give these two statements one session,
      so one of the two orders has to be chosen for what it leaves behind when the
      second write never happens. A membership row pointing at no organisation is
      invisible: `listMembershipsFor` resolves each row through `getOrganisation`
      and drops the ones that resolve to nothing. An organisation row with no
      members is the opposite — it exists, it is administered by nobody, and there
      is no role anywhere that can delete it. The recoverable half-state is the
      one that gets written first.
    */
    await this.#pool.execute(MEMBER, memberValues);
    await this.#pool.execute(ORG, orgValues);
  }

  async getOrganisation(orgId: string): Promise<StoredOrganisation | undefined> {
    const [row] = await this.#rows('SELECT * FROM organisations WHERE org_id = ?', [orgId]);
    return row ? toOrg(row) : undefined;
  }

  async renameOrganisation(orgId: string, name: string): Promise<void> {
    await this.#pool.execute('UPDATE organisations SET name = ? WHERE org_id = ?', [name, orgId]);
  }

  async putMembership(m: StoredMembership): Promise<void> {
    await this.#pool.execute('DELETE FROM org_members WHERE org_id = ? AND account_id = ?', [
      m.orgId,
      m.accountId,
    ]);
    await this.#pool.execute(
      `INSERT INTO org_members (org_id, account_id, role, added_by_account_id, added_at)
       VALUES (?, ?, ?, ?, ?)`,
      [m.orgId, m.accountId, m.role, m.addedByAccountId, m.addedAt],
    );
  }

  async getMembership(orgId: string, accountId: string): Promise<StoredMembership | undefined> {
    const [row] = await this.#rows(
      'SELECT * FROM org_members WHERE org_id = ? AND account_id = ?',
      [orgId, accountId],
    );
    return row ? toMember(row) : undefined;
  }

  async removeMembership(orgId: string, accountId: string): Promise<void> {
    await this.#pool.execute('DELETE FROM org_members WHERE org_id = ? AND account_id = ?', [
      orgId,
      accountId,
    ]);
  }

  async listMembers(orgId: string): Promise<readonly StoredMembership[]> {
    const rows = await this.#rows('SELECT * FROM org_members WHERE org_id = ? ORDER BY added_at ASC', [
      orgId,
    ]);
    return rows.map(toMember);
  }

  async listMembershipsFor(accountId: string): Promise<readonly StoredMembership[]> {
    const rows = await this.#rows(
      'SELECT * FROM org_members WHERE account_id = ? ORDER BY added_at ASC',
      [accountId],
    );
    return rows.map(toMember);
  }

  async countMembersWithRole(orgId: string, role: WorkspaceRole): Promise<number> {
    const [row] = await this.#rows(
      'SELECT COUNT(*) AS n FROM org_members WHERE org_id = ? AND role = ?',
      [orgId, role],
    );
    return Number(row?.['n'] ?? 0);
  }

  async createInvite(i: StoredInvite): Promise<void> {
    await this.#pool.execute(
      `INSERT INTO org_invites (
         invite_id, org_id, email, role, token_hash, invited_by_account_id,
         created_at, expires_at, accepted_at, accepted_by_account_id, revoked_at
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        i.inviteId,
        i.orgId,
        i.email,
        i.role,
        i.tokenHash,
        i.invitedByAccountId,
        i.createdAt,
        i.expiresAt,
        i.acceptedAt,
        i.acceptedByAccountId,
        i.revokedAt,
      ],
    );
  }

  async getInviteByTokenHash(tokenHash: string): Promise<StoredInvite | undefined> {
    const [row] = await this.#rows('SELECT * FROM org_invites WHERE token_hash = ?', [tokenHash]);
    return row ? toInvite(row) : undefined;
  }

  async getInvite(inviteId: string): Promise<StoredInvite | undefined> {
    const [row] = await this.#rows('SELECT * FROM org_invites WHERE invite_id = ?', [inviteId]);
    return row ? toInvite(row) : undefined;
  }

  async listInvites(orgId: string): Promise<readonly StoredInvite[]> {
    const rows = await this.#rows(
      'SELECT * FROM org_invites WHERE org_id = ? ORDER BY created_at DESC',
      [orgId],
    );
    return rows.map(toInvite);
  }

  async markInviteAccepted(inviteId: string, at: string, accountId: string): Promise<void> {
    await this.#pool.execute(
      'UPDATE org_invites SET accepted_at = ?, accepted_by_account_id = ? WHERE invite_id = ?',
      [at, accountId, inviteId],
    );
  }

  async markInviteRevoked(inviteId: string, at: string): Promise<void> {
    await this.#pool.execute('UPDATE org_invites SET revoked_at = ? WHERE invite_id = ?', [
      at,
      inviteId,
    ]);
  }

  async putScope(s: StoredScope): Promise<void> {
    await this.#pool.execute('DELETE FROM org_scope WHERE scope_kind = ? AND scope_id = ?', [
      s.scopeKind,
      s.scopeId,
    ]);
    await this.#pool.execute(
      'INSERT INTO org_scope (org_id, scope_kind, scope_id, created_at) VALUES (?, ?, ?, ?)',
      [s.orgId, s.scopeKind, s.scopeId, s.createdAt],
    );
  }

  async getScope(scopeKind: 'run' | 'plot', scopeId: string): Promise<StoredScope | undefined> {
    const [row] = await this.#rows(
      'SELECT * FROM org_scope WHERE scope_kind = ? AND scope_id = ?',
      [scopeKind, scopeId],
    );
    return row ? toScope(row) : undefined;
  }

  async listScopeIds(
    orgId: string,
    scopeKind: 'run' | 'plot',
    limit: number,
  ): Promise<readonly string[]> {
    const rows = await this.#rows(
      `SELECT scope_id FROM org_scope WHERE org_id = ? AND scope_kind = ?
       ORDER BY created_at DESC LIMIT ?`,
      [orgId, scopeKind, limit],
    );
    return rows.map((r) => str(r['scope_id']));
  }

  async appendAudit(e: StoredAuditEvent): Promise<void> {
    await this.#pool.execute(
      `INSERT INTO audit_events
         (event_id, at, org_id, actor_account_id, actor_label, action, subject, detail)
       VALUES (?,?,?,?,?,?,?,?)`,
      [e.eventId, e.at, e.orgId, e.actorAccountId, e.actorLabel, e.action, e.subject, e.detail],
    );
  }

  async listAudit(orgId: string, limit: number): Promise<readonly StoredAuditEvent[]> {
    const rows = await this.#rows(
      'SELECT * FROM audit_events WHERE org_id = ? ORDER BY at DESC, event_id DESC LIMIT ?',
      [orgId, limit],
    );
    return rows.map(toAudit);
  }

  async close(): Promise<void> {
    if (this.#ownsPool) await this.#pool.end();
  }
}
