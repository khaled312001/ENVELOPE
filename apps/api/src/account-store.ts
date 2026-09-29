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
 * `CLAUDE.md` recorded that per-author scoping was *considered and rejected*:
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

/* -------------------------------------------------------------------------
   TENANCY — organisations, membership, invitations, scope and the audit log.

   `CLAUDE.md` names the hole this closes: "there is no tenancy (firm or
   project)". Until now the only container for work was one account, and the only
   way a second person saw a run was a per-run share the author granted by hand.
   That is workable for one architect and untenable for a practice: a firm of
   eight cannot re-grant every run to every colleague, and when someone leaves
   there is no single act that removes them.

   WHAT AN ORGANISATION IS HERE. A named container of accounts, each holding one
   workspace role, plus the set of runs and plots created inside it. It is NOT a
   billing entity, NOT a domain, and NOT verified against anything — there is no
   check that "Dubai Design Partners" is that firm, and the settings screen says
   so in those words. What it buys is the two properties a practice actually
   needs: colleagues see each other's work without a hand-granted share, and
   removing a membership removes that access in one act.

   THE TWO AXES DO NOT MERGE. A run role (`author` / `reviewer` / `reader`) says
   what somebody may do to ONE run. A workspace role says what somebody may do to
   the organisation. They are resolved separately in `access.ts` and a workspace
   role is never allowed to manufacture `author` — G1–G3 acknowledge the author's
   own inputs, and an admin who never entered them has nothing to acknowledge.
   ------------------------------------------------------------------------- */

/**
 * What a member may do to the organisation itself.
 *
 *   owner   everything, including renaming the organisation and changing or
 *           removing any other member. The last owner cannot be demoted or
 *           removed — an organisation with no owner is one nobody can administer.
 *   admin   invite, change roles below owner, remove members below owner.
 *   member  create plots and runs inside the organisation, and read its work.
 *   viewer  read its work. No plot, no run, no gate.
 */
export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export const WORKSPACE_ROLES: readonly WorkspaceRole[] = ['owner', 'admin', 'member', 'viewer'];

/** Rank, so "may not act on somebody at or above me" is one comparison. */
export const WORKSPACE_RANK: Readonly<Record<WorkspaceRole, number>> = {
  owner: 3,
  admin: 2,
  member: 1,
  viewer: 0,
};

export interface StoredOrganisation {
  readonly orgId: string;
  readonly name: string;
  readonly createdAt: string;
  readonly createdByAccountId: string;
}

export interface StoredMembership {
  readonly orgId: string;
  readonly accountId: string;
  readonly role: WorkspaceRole;
  readonly addedByAccountId: string;
  readonly addedAt: string;
}

/**
 * AN INVITATION IS A LINK, NOT AN EMAIL — because this deployment has no mailer.
 *
 * `auth-routes.ts` already records that absence on the sign-up route and refuses
 * to claim "check your inbox" for a message it never sent. The same honesty
 * applies here: the invite route mints a token, returns the link ONCE, and the
 * person who invited carries it to their colleague by whatever means they already
 * use. When a mailer exists this gains a send step; until then the product does
 * not pretend to have one.
 *
 * Only the hash is stored. A row read out of a database backup is then not a set
 * of live invitations, for the same reason a session row is not a live session.
 */
export interface StoredInvite {
  readonly inviteId: string;
  readonly orgId: string;
  /** Normalised. The invite is only redeemable by an account holding this address. */
  readonly email: string;
  readonly role: WorkspaceRole;
  readonly tokenHash: string;
  readonly invitedByAccountId: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly acceptedAt: string | null;
  readonly acceptedByAccountId: string | null;
  readonly revokedAt: string | null;
}

/**
 * WHICH ORGANISATION A RUN OR PLOT BELONGS TO — in its own table, deliberately.
 *
 * `runs` and `plots` are append-only under §13.4 and are already deployed with
 * rows in them. Adding a column would mean an `ALTER TABLE` on a shipped
 * append-only table and a backfill value for every existing row — and there is no
 * true value to backfill, because those runs were made before organisations
 * existed. A row here is a fact created at the same moment as the run; its
 * absence is also a fact, and it means "personal", not "unknown".
 *
 * `tenant_id` on `runs` is NOT reused for this. It currently holds the actor id,
 * and making one column mean "an actor, or an organisation, depending" is exactly
 * the ambiguity this codebase refuses everywhere else.
 */
export interface StoredScope {
  readonly orgId: string;
  readonly scopeKind: 'run' | 'plot';
  readonly scopeId: string;
  readonly createdAt: string;
}

/**
 * ONE THING THAT HAPPENED, WRITTEN ONCE AND NEVER CHANGED.
 *
 * §24.4 asks for an audit trail of who approved what, and the platform plan §6.5
 * asks for it to be append-only. There is no update and no delete in the
 * interface below, which is what makes "append-only" a property of the code
 * rather than a promise in a document.
 *
 * `detail` is canonical JSON and is shown to a reader verbatim. It carries what
 * changed, never a rendered sentence: a sentence stored at write time cannot be
 * translated, and this product ships in two languages.
 */
export interface StoredAuditEvent {
  readonly eventId: string;
  readonly at: string;
  readonly orgId: string | null;
  readonly actorAccountId: string | null;
  /** The actor's name as it stood at the time. A later rename must not rewrite history. */
  readonly actorLabel: string;
  /** A stable key — `member.role_changed`, `invite.created`. Never a sentence. */
  readonly action: string;
  readonly subject: string | null;
  readonly detail: string;
}

export interface AccountRepository {
  createAccount(account: StoredAccount): Promise<void>;
  getAccountByEmail(email: string): Promise<StoredAccount | undefined>;
  getAccountById(accountId: string): Promise<StoredAccount | undefined>;
  /** The named accounts, in one statement — a members list resolves names this way. */
  getAccountsByIds(accountIds: readonly string[]): Promise<readonly StoredAccount[]>;
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

  /**
   * Create an organisation and its first owner together.
   *
   * ONE METHOD, NOT TWO CALLS, because the half-state is unrecoverable: an
   * organisation whose owner row failed to write is administered by nobody and
   * cannot be deleted by anybody. Both implementations do it in a transaction.
   */
  createOrganisation(org: StoredOrganisation, owner: StoredMembership): Promise<void>;
  getOrganisation(orgId: string): Promise<StoredOrganisation | undefined>;
  renameOrganisation(orgId: string, name: string): Promise<void>;

  putMembership(membership: StoredMembership): Promise<void>;
  getMembership(orgId: string, accountId: string): Promise<StoredMembership | undefined>;
  removeMembership(orgId: string, accountId: string): Promise<void>;
  listMembers(orgId: string): Promise<readonly StoredMembership[]>;
  /** Every organisation one account belongs to, with the role it holds in each. */
  listMembershipsFor(accountId: string): Promise<readonly StoredMembership[]>;
  countMembersWithRole(orgId: string, role: WorkspaceRole): Promise<number>;

  createInvite(invite: StoredInvite): Promise<void>;
  getInviteByTokenHash(tokenHash: string): Promise<StoredInvite | undefined>;
  getInvite(inviteId: string): Promise<StoredInvite | undefined>;
  listInvites(orgId: string): Promise<readonly StoredInvite[]>;
  markInviteAccepted(inviteId: string, at: string, accountId: string): Promise<void>;
  markInviteRevoked(inviteId: string, at: string): Promise<void>;

  putScope(scope: StoredScope): Promise<void>;
  getScope(scopeKind: 'run' | 'plot', scopeId: string): Promise<StoredScope | undefined>;
  /** The ids of one kind inside an organisation, newest first. */
  listScopeIds(orgId: string, scopeKind: 'run' | 'plot', limit: number): Promise<readonly string[]>;

  /** Append-only by construction: there is no update and no delete. */
  appendAudit(event: StoredAuditEvent): Promise<void>;
  listAudit(orgId: string, limit: number): Promise<readonly StoredAuditEvent[]>;

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

CREATE TABLE IF NOT EXISTS organisations (
  org_id                TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  created_at            TEXT NOT NULL,
  created_by_account_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS org_members (
  org_id              TEXT NOT NULL,
  account_id          TEXT NOT NULL,
  role                TEXT NOT NULL,
  added_by_account_id TEXT NOT NULL,
  added_at            TEXT NOT NULL,
  PRIMARY KEY (org_id, account_id)
);
CREATE INDEX IF NOT EXISTS members_by_account ON org_members (account_id, added_at DESC);

CREATE TABLE IF NOT EXISTS org_invites (
  invite_id              TEXT PRIMARY KEY,
  org_id                 TEXT NOT NULL,
  email                  TEXT NOT NULL,
  role                   TEXT NOT NULL,
  token_hash             TEXT NOT NULL,
  invited_by_account_id  TEXT NOT NULL,
  created_at             TEXT NOT NULL,
  expires_at             TEXT NOT NULL,
  accepted_at            TEXT,
  accepted_by_account_id TEXT,
  revoked_at             TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS invites_by_token ON org_invites (token_hash);
CREATE INDEX IF NOT EXISTS invites_by_org ON org_invites (org_id, created_at DESC);

/*
  SCOPE. See StoredScope in this file for why this is a table and not a column
  on runs. The primary key is (kind, id) and not (org, kind, id): a run belongs
  to at most one organisation, and the key is what makes a second claim
  impossible rather than merely unlikely.
*/
CREATE TABLE IF NOT EXISTS org_scope (
  org_id     TEXT NOT NULL,
  scope_kind TEXT NOT NULL,
  scope_id   TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (scope_kind, scope_id)
);
CREATE INDEX IF NOT EXISTS scope_by_org ON org_scope (org_id, scope_kind, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_events (
  event_id         TEXT PRIMARY KEY,
  at               TEXT NOT NULL,
  org_id           TEXT,
  actor_account_id TEXT,
  actor_label      TEXT NOT NULL,
  action           TEXT NOT NULL,
  subject          TEXT,
  detail           TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_by_org ON audit_events (org_id, at DESC);
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

interface OrgRow {
  org_id: string;
  name: string;
  created_at: string;
  created_by_account_id: string;
}
interface MemberRow {
  org_id: string;
  account_id: string;
  role: string;
  added_by_account_id: string;
  added_at: string;
}
interface InviteRow {
  invite_id: string;
  org_id: string;
  email: string;
  role: string;
  token_hash: string;
  invited_by_account_id: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_by_account_id: string | null;
  revoked_at: string | null;
}
interface ScopeRow {
  org_id: string;
  scope_kind: string;
  scope_id: string;
  created_at: string;
}
interface AuditRow {
  event_id: string;
  at: string;
  org_id: string | null;
  actor_account_id: string | null;
  actor_label: string;
  action: string;
  subject: string | null;
  detail: string;
}

/**
 * A role read back from the database, narrowed.
 *
 * Falls to `viewer`, the least of the four. A row written by a newer version of
 * this code, or corrupted, must not be read as `owner`: the failure mode of
 * guessing high is silent privilege, and the failure mode of guessing low is a
 * member who reports that a button is missing.
 */
export const toWorkspaceRole = (v: string): WorkspaceRole =>
  v === 'owner' || v === 'admin' || v === 'member' ? v : 'viewer';

const toOrg = (r: OrgRow): StoredOrganisation => ({
  orgId: r.org_id,
  name: r.name,
  createdAt: r.created_at,
  createdByAccountId: r.created_by_account_id,
});

const toMember = (r: MemberRow): StoredMembership => ({
  orgId: r.org_id,
  accountId: r.account_id,
  role: toWorkspaceRole(r.role),
  addedByAccountId: r.added_by_account_id,
  addedAt: r.added_at,
});

const toInvite = (r: InviteRow): StoredInvite => ({
  inviteId: r.invite_id,
  orgId: r.org_id,
  email: r.email,
  role: toWorkspaceRole(r.role),
  tokenHash: r.token_hash,
  invitedByAccountId: r.invited_by_account_id,
  createdAt: r.created_at,
  expiresAt: r.expires_at,
  acceptedAt: r.accepted_at,
  acceptedByAccountId: r.accepted_by_account_id,
  revokedAt: r.revoked_at,
});

const toScope = (r: ScopeRow): StoredScope => ({
  orgId: r.org_id,
  scopeKind: r.scope_kind === 'run' ? 'run' : 'plot',
  scopeId: r.scope_id,
  createdAt: r.created_at,
});

const toAudit = (r: AuditRow): StoredAuditEvent => ({
  eventId: r.event_id,
  at: r.at,
  orgId: r.org_id,
  actorAccountId: r.actor_account_id,
  actorLabel: r.actor_label,
  action: r.action,
  subject: r.subject,
  detail: r.detail,
});

/** `IN (?, ?, …)`, or nothing — an empty list must not become `IN ()`, which is a syntax error. */
const placeholders = (n: number): string => new Array(n).fill('?').join(', ');

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

  async getAccountsByIds(accountIds: readonly string[]): Promise<readonly StoredAccount[]> {
    if (accountIds.length === 0) return [];
    const rows = this.#db
      .prepare(`SELECT * FROM accounts WHERE account_id IN (${placeholders(accountIds.length)})`)
      .all(...accountIds) as unknown as AccountRow[];
    return rows.map(toAccount);
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

  async createOrganisation(org: StoredOrganisation, owner: StoredMembership): Promise<void> {
    /* One transaction: see the interface for why the half-state is unrecoverable. */
    this.#db.exec('BEGIN');
    try {
      this.#db
        .prepare(
          `INSERT INTO organisations (org_id, name, created_at, created_by_account_id)
           VALUES (?, ?, ?, ?)`,
        )
        .run(org.orgId, org.name, org.createdAt, org.createdByAccountId);
      this.#db
        .prepare(
          `INSERT INTO org_members (org_id, account_id, role, added_by_account_id, added_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(owner.orgId, owner.accountId, owner.role, owner.addedByAccountId, owner.addedAt);
      this.#db.exec('COMMIT');
    } catch (error) {
      this.#db.exec('ROLLBACK');
      throw error;
    }
  }

  async getOrganisation(orgId: string): Promise<StoredOrganisation | undefined> {
    const row = this.#db.prepare('SELECT * FROM organisations WHERE org_id = ?').get(orgId) as
      | OrgRow
      | undefined;
    return row ? toOrg(row) : undefined;
  }

  async renameOrganisation(orgId: string, name: string): Promise<void> {
    this.#db.prepare('UPDATE organisations SET name = ? WHERE org_id = ?').run(name, orgId);
  }

  async putMembership(m: StoredMembership): Promise<void> {
    this.#db
      .prepare('DELETE FROM org_members WHERE org_id = ? AND account_id = ?')
      .run(m.orgId, m.accountId);
    this.#db
      .prepare(
        `INSERT INTO org_members (org_id, account_id, role, added_by_account_id, added_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(m.orgId, m.accountId, m.role, m.addedByAccountId, m.addedAt);
  }

  async getMembership(orgId: string, accountId: string): Promise<StoredMembership | undefined> {
    const row = this.#db
      .prepare('SELECT * FROM org_members WHERE org_id = ? AND account_id = ?')
      .get(orgId, accountId) as MemberRow | undefined;
    return row ? toMember(row) : undefined;
  }

  async removeMembership(orgId: string, accountId: string): Promise<void> {
    this.#db
      .prepare('DELETE FROM org_members WHERE org_id = ? AND account_id = ?')
      .run(orgId, accountId);
  }

  async listMembers(orgId: string): Promise<readonly StoredMembership[]> {
    const rows = this.#db
      .prepare('SELECT * FROM org_members WHERE org_id = ? ORDER BY added_at ASC')
      .all(orgId) as unknown as MemberRow[];
    return rows.map(toMember);
  }

  async listMembershipsFor(accountId: string): Promise<readonly StoredMembership[]> {
    const rows = this.#db
      .prepare('SELECT * FROM org_members WHERE account_id = ? ORDER BY added_at ASC')
      .all(accountId) as unknown as MemberRow[];
    return rows.map(toMember);
  }

  async countMembersWithRole(orgId: string, role: WorkspaceRole): Promise<number> {
    const row = this.#db
      .prepare('SELECT COUNT(*) AS n FROM org_members WHERE org_id = ? AND role = ?')
      .get(orgId, role) as { n: number } | undefined;
    return Number(row?.n ?? 0);
  }

  async createInvite(i: StoredInvite): Promise<void> {
    this.#db
      .prepare(
        `INSERT INTO org_invites (
           invite_id, org_id, email, role, token_hash, invited_by_account_id,
           created_at, expires_at, accepted_at, accepted_by_account_id, revoked_at
         ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
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
      );
  }

  async getInviteByTokenHash(tokenHash: string): Promise<StoredInvite | undefined> {
    const row = this.#db.prepare('SELECT * FROM org_invites WHERE token_hash = ?').get(tokenHash) as
      | InviteRow
      | undefined;
    return row ? toInvite(row) : undefined;
  }

  async getInvite(inviteId: string): Promise<StoredInvite | undefined> {
    const row = this.#db.prepare('SELECT * FROM org_invites WHERE invite_id = ?').get(inviteId) as
      | InviteRow
      | undefined;
    return row ? toInvite(row) : undefined;
  }

  async listInvites(orgId: string): Promise<readonly StoredInvite[]> {
    const rows = this.#db
      .prepare('SELECT * FROM org_invites WHERE org_id = ? ORDER BY created_at DESC')
      .all(orgId) as unknown as InviteRow[];
    return rows.map(toInvite);
  }

  async markInviteAccepted(inviteId: string, at: string, accountId: string): Promise<void> {
    this.#db
      .prepare(
        'UPDATE org_invites SET accepted_at = ?, accepted_by_account_id = ? WHERE invite_id = ?',
      )
      .run(at, accountId, inviteId);
  }

  async markInviteRevoked(inviteId: string, at: string): Promise<void> {
    this.#db.prepare('UPDATE org_invites SET revoked_at = ? WHERE invite_id = ?').run(at, inviteId);
  }

  async putScope(s: StoredScope): Promise<void> {
    this.#db
      .prepare('DELETE FROM org_scope WHERE scope_kind = ? AND scope_id = ?')
      .run(s.scopeKind, s.scopeId);
    this.#db
      .prepare('INSERT INTO org_scope (org_id, scope_kind, scope_id, created_at) VALUES (?,?,?,?)')
      .run(s.orgId, s.scopeKind, s.scopeId, s.createdAt);
  }

  async getScope(scopeKind: 'run' | 'plot', scopeId: string): Promise<StoredScope | undefined> {
    const row = this.#db
      .prepare('SELECT * FROM org_scope WHERE scope_kind = ? AND scope_id = ?')
      .get(scopeKind, scopeId) as ScopeRow | undefined;
    return row ? toScope(row) : undefined;
  }

  async listScopeIds(
    orgId: string,
    scopeKind: 'run' | 'plot',
    limit: number,
  ): Promise<readonly string[]> {
    const rows = this.#db
      .prepare(
        `SELECT scope_id FROM org_scope WHERE org_id = ? AND scope_kind = ?
         ORDER BY created_at DESC LIMIT ?`,
      )
      .all(orgId, scopeKind, limit) as unknown as { scope_id: string }[];
    return rows.map((r) => r.scope_id);
  }

  async appendAudit(e: StoredAuditEvent): Promise<void> {
    this.#db
      .prepare(
        `INSERT INTO audit_events
           (event_id, at, org_id, actor_account_id, actor_label, action, subject, detail)
         VALUES (?,?,?,?,?,?,?,?)`,
      )
      .run(e.eventId, e.at, e.orgId, e.actorAccountId, e.actorLabel, e.action, e.subject, e.detail);
  }

  async listAudit(orgId: string, limit: number): Promise<readonly StoredAuditEvent[]> {
    const rows = this.#db
      .prepare('SELECT * FROM audit_events WHERE org_id = ? ORDER BY at DESC, event_id DESC LIMIT ?')
      .all(orgId, limit) as unknown as AuditRow[];
    return rows.map(toAudit);
  }

  async close(): Promise<void> {
    this.#db.close();
  }
}
