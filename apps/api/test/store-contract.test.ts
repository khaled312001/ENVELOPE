/**
 * ONE CONTRACT, BOTH DATABASES.
 *
 * The MySQL stores had no test at all. They were written "in the subset SQLite and
 * MySQL share", which is a claim about two dialects that only running both can
 * check — and production runs the one the suite never touched.
 *
 * So the same assertions run against each implementation. SQLite always; MySQL when
 * `MYSQL_TEST_HOST` (and `_USER`, `_PASSWORD`, `_DATABASE`, optionally `_PORT`)
 * name a database to write to. Every row written carries this run's prefix and is
 * deleted afterwards, so the suite can be pointed at a real, empty deployment
 * database before launch without leaving anything behind.
 */

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { MysqlAccountRepository } from '../src/account-store-mysql.js';
import { SqliteAccountRepository, type AccountRepository } from '../src/account-store.js';
import { createMysqlPool, MysqlRunRepository, type MysqlPool } from '../src/store-mysql.js';
import { SqliteRunRepository, type RunRepository, type StoredPlot, type StoredRun } from '../src/store.js';

const P = `t${randomUUID().slice(0, 8)}-`;

interface Stores {
  readonly runs: RunRepository;
  readonly accounts: AccountRepository;
  readonly strict: boolean;
  cleanup(): Promise<void>;
}

const env = process.env;
const mysqlConfigured =
  !!env['MYSQL_TEST_HOST'] && !!env['MYSQL_TEST_USER'] && !!env['MYSQL_TEST_DATABASE'];

const IMPLEMENTATIONS: readonly (readonly [string, () => Promise<Stores>])[] = [
  [
    'sqlite',
    async () => {
      const runs = new SqliteRunRepository();
      const accounts = new SqliteAccountRepository();
      return {
        runs,
        accounts,
        strict: false,
        cleanup: async () => {
          await accounts.close();
          await runs.close();
        },
      };
    },
  ],
  ...(mysqlConfigured
    ? ([
        [
          'mysql',
          async () => {
            const pool: MysqlPool = await createMysqlPool({
              host: env['MYSQL_TEST_HOST']!,
              port: Number(env['MYSQL_TEST_PORT'] ?? 3306),
              user: env['MYSQL_TEST_USER']!,
              password: env['MYSQL_TEST_PASSWORD'] ?? '',
              database: env['MYSQL_TEST_DATABASE']!,
              connectionLimit: 2,
            });
            const runs = await MysqlRunRepository.open(pool);
            const accounts = await MysqlAccountRepository.open(pool);
            return {
              runs,
              accounts,
              strict: true,
              cleanup: async () => {
                // Children before parents: runs reference plots.
                for (const [table, column] of [
                  ['runs', 'run_id'],
                  ['plots', 'plot_id'],
                  ['run_shares', 'run_id'],
                  ['drafts', 'account_id'],
                  ['sessions', 'token_hash'],
                  ['org_scope', 'scope_id'],
                  ['org_invites', 'invite_id'],
                  ['org_members', 'org_id'],
                  ['organisations', 'org_id'],
                  ['audit_events', 'event_id'],
                  ['accounts', 'account_id'],
                ] as const) {
                  await pool.execute(`DELETE FROM ${table} WHERE ${column} LIKE ?`, [`${P}%`]);
                }
                await pool.end();
              },
            };
          },
        ],
      ] as const)
    : []),
];

const plot = (id: string, actor: string, createdAt: string): StoredPlot => ({
  plotId: `${P}${id}`,
  tenantId: actor,
  plotNumber: '345-1234',
  community: 'TEST',
  landUse: 'RESIDENTIAL_MULTI',
  createdAt,
  createdByActorId: actor,
  createdByActorName: 'Somebody',
  computedAreaM2: '3200.000000000000000000000001',
  areaMismatch: false,
  frontageCount: 2,
  shapeClass: 'RECTANGLE',
  plot: '{}',
});

/** A payload past 64 KB with text MySQL's default collation would mangle if it could. */
const BIG = JSON.stringify({ note: 'مخطط الأرض — ٣٫٥ ✓ 𝛼', pad: 'x'.repeat(300_000) });

const run = (id: string, plotId: string, actor: string, createdAt: string): StoredRun => ({
  runId: `${P}${id}`,
  tenantId: actor,
  plotId,
  parentRunId: null,
  createdAt,
  createdByActorId: actor,
  createdByActorName: 'Somebody',
  engineVersion: '0.1.0',
  annexVersion: '0.1.0-UNSIGNED',
  ruleSetHash: 'hash',
  input: '{}',
  output: BIG,
  report: '{}',
  fingerprint: `fp-${id}`,
  draftRules: true,
  gates: '{}',
});

for (const [name, open] of IMPLEMENTATIONS) {
  // A remote database answers in round trips, not microseconds.
  describe(`${name} stores`, { timeout: name === 'mysql' ? 120_000 : 5_000 }, () => {
    let s: Stores;
    beforeAll(async () => {
      s = await open();
    }, 120_000);
    afterAll(async () => {
      await s.cleanup();
    }, 120_000);

    it('returns a large, non-Latin payload byte for byte', async () => {
      await s.runs.insertPlot(plot('p1', `${P}alice`, '2026-09-01T00:00:00.000Z'));
      await s.runs.insert(run('r1', `${P}p1`, `${P}alice`, '2026-09-01T00:00:01.000Z'));
      const back = await s.runs.get(`${P}r1`);
      expect(back?.output).toBe(BIG);
      // Decimal strings are not rounded on the way through.
      expect((await s.runs.getPlot(`${P}p1`))?.computedAreaM2).toBe('3200.000000000000000000000001');
    });

    it('lists by author, newest first, and nobody else’s', async () => {
      await s.runs.insertPlot(plot('p2', `${P}alice`, '2026-09-02T00:00:00.000Z'));
      await s.runs.insertPlot(plot('p3', `${P}bob`, '2026-09-03T00:00:00.000Z'));
      await s.runs.insert(run('r2', `${P}p2`, `${P}alice`, '2026-09-02T00:00:01.000Z'));
      await s.runs.insert(run('r3', `${P}p3`, `${P}bob`, '2026-09-03T00:00:01.000Z'));

      const alice = await s.runs.listRunsByActor(`${P}alice`, 10);
      expect(alice.map((r) => r.runId)).toEqual([`${P}r2`, `${P}r1`]);
      const plots = await s.runs.listPlotsByActor(`${P}alice`, 10);
      expect(plots.map((p) => p.plotId)).toEqual([`${P}p2`, `${P}p1`]);
      expect((await s.runs.getMany([`${P}r3`, `${P}r1`])).map((r) => r.runId)).toEqual([
        `${P}r3`,
        `${P}r1`,
      ]);
    });

    it('records gates and nothing else', async () => {
      await s.runs.recordGate(`${P}r1`, '{"G1":1}');
      const back = await s.runs.get(`${P}r1`);
      expect(back?.gates).toBe('{"G1":1}');
      expect(back?.output).toBe(BIG);
    });

    it('keeps one account per email, enforced by the database', async () => {
      const a = {
        accountId: `${P}acc1`,
        email: `${P}a@example.com`,
        name: 'A',
        licence: null,
        passwordHash: 'scrypt$1$1$1$c2FsdA==$a2V5',
        createdAt: '2026-09-01T00:00:00.000Z',
      };
      await s.accounts.createAccount(a);
      await expect(s.accounts.createAccount({ ...a, accountId: `${P}acc2` })).rejects.toThrow();
      expect((await s.accounts.getAccountByEmail(a.email))?.accountId).toBe(a.accountId);
      await s.accounts.updateProfile(a.accountId, 'A renamed', 'DM-1');
      expect(await s.accounts.getAccountById(a.accountId)).toMatchObject({
        name: 'A renamed',
        licence: 'DM-1',
      });
    });

    it('slides, ends and sweeps sessions', async () => {
      const base = { accountId: `${P}acc1`, createdAt: '2026-09-01T00:00:00.000Z' };
      await s.accounts.createSession({
        ...base,
        tokenHash: `${P}live`,
        expiresAt: '2099-01-01T00:00:00.000Z',
        lastSeenAt: base.createdAt,
      });
      await s.accounts.createSession({
        ...base,
        tokenHash: `${P}dead`,
        expiresAt: '2000-01-01T00:00:00.000Z',
        lastSeenAt: base.createdAt,
      });
      await s.accounts.touchSession(`${P}live`, '2026-09-02T00:00:00.000Z', '2099-02-01T00:00:00.000Z');
      expect((await s.accounts.getSession(`${P}live`))?.expiresAt).toBe('2099-02-01T00:00:00.000Z');
      // ISO strings compare as times in both databases because both compare them as text.
      expect(await s.accounts.deleteExpiredSessions('2026-09-21T00:00:00.000Z')).toBeGreaterThanOrEqual(1);
      expect(await s.accounts.getSession(`${P}dead`)).toBeUndefined();
      await s.accounts.deleteSessionsFor(`${P}acc1`);
      expect(await s.accounts.getSession(`${P}live`)).toBeUndefined();
    });

    it('replaces a share rather than duplicating it', async () => {
      const share = {
        runId: `${P}r1`,
        accountId: `${P}acc1`,
        role: 'reader' as const,
        grantedByAccountId: `${P}alice`,
        grantedAt: '2026-09-01T00:00:00.000Z',
      };
      await s.accounts.grantShare(share);
      await s.accounts.grantShare({ ...share, role: 'reviewer' });
      expect(await s.accounts.listSharesForRun(`${P}r1`)).toHaveLength(1);
      expect((await s.accounts.getShare(`${P}r1`, `${P}acc1`))?.role).toBe('reviewer');
      expect((await s.accounts.listSharesForAccount(`${P}acc1`)).map((x) => x.runId)).toEqual([`${P}r1`]);
      await s.accounts.revokeShare(`${P}r1`, `${P}acc1`);
      expect(await s.accounts.getShare(`${P}r1`, `${P}acc1`)).toBeUndefined();
    });

    it('keeps one draft per form, newest wins', async () => {
      const d = { accountId: `${P}acc1`, draftKey: 'plot', payload: '{"a":1}', updatedAt: '2026-09-01T00:00:00.000Z' };
      await s.accounts.putDraft(d);
      await s.accounts.putDraft({ ...d, payload: BIG, updatedAt: '2026-09-02T00:00:00.000Z' });
      expect((await s.accounts.getDraft(`${P}acc1`, 'plot'))?.payload).toBe(BIG);
      expect(await s.accounts.listDrafts(`${P}acc1`)).toHaveLength(1);
      await s.accounts.deleteDraft(`${P}acc1`, 'plot');
      expect(await s.accounts.getDraft(`${P}acc1`, 'plot')).toBeUndefined();
    });

    /* ---------------------------------------------------------------------
       TENANCY. The same contract, and for the same reason: `account-store.ts`
       claims the tenancy statements are in the subset both dialects share, and
       only running both can check that claim. Production runs MySQL.
       --------------------------------------------------------------------- */

    it('creates an organisation and its first owner together', async () => {
      const orgId = `${P}org1`;
      await s.accounts.createOrganisation(
        { orgId, name: 'Dubai Design Partners', createdAt: '2026-09-01T00:00:00.000Z', createdByAccountId: `${P}acc1` },
        { orgId, accountId: `${P}acc1`, role: 'owner', addedByAccountId: `${P}acc1`, addedAt: '2026-09-01T00:00:00.000Z' },
      );
      expect((await s.accounts.getOrganisation(orgId))?.name).toBe('Dubai Design Partners');
      // Neither half without the other — that is the whole argument for one method.
      expect((await s.accounts.getMembership(orgId, `${P}acc1`))?.role).toBe('owner');
      expect(await s.accounts.countMembersWithRole(orgId, 'owner')).toBe(1);

      await s.accounts.renameOrganisation(orgId, 'Al Barsha Architects');
      expect((await s.accounts.getOrganisation(orgId))?.name).toBe('Al Barsha Architects');
    });

    it('replaces a membership rather than duplicating it, and removes it', async () => {
      const orgId = `${P}org1`;
      const m = { orgId, accountId: `${P}acc2`, role: 'member' as const, addedByAccountId: `${P}acc1`, addedAt: '2026-09-02T00:00:00.000Z' };
      await s.accounts.putMembership(m);
      await s.accounts.putMembership({ ...m, role: 'admin' });
      expect(await s.accounts.listMembers(orgId)).toHaveLength(2);
      expect((await s.accounts.getMembership(orgId, `${P}acc2`))?.role).toBe('admin');
      expect((await s.accounts.listMembershipsFor(`${P}acc2`)).map((x) => x.orgId)).toEqual([orgId]);
      await s.accounts.removeMembership(orgId, `${P}acc2`);
      expect(await s.accounts.getMembership(orgId, `${P}acc2`)).toBeUndefined();
    });

    it('finds an invitation by its token hash and records its outcome', async () => {
      const invite = {
        inviteId: `${P}inv1`,
        orgId: `${P}org1`,
        email: 'invited@example.com',
        role: 'viewer' as const,
        tokenHash: `${P}hash`,
        invitedByAccountId: `${P}acc1`,
        createdAt: '2026-09-02T00:00:00.000Z',
        expiresAt: '2026-09-09T00:00:00.000Z',
        acceptedAt: null,
        acceptedByAccountId: null,
        revokedAt: null,
      };
      await s.accounts.createInvite(invite);
      expect((await s.accounts.getInviteByTokenHash(`${P}hash`))?.inviteId).toBe(`${P}inv1`);
      // NULL must come back as null and not as the empty string — `inviteState`
      // reads these three as the difference between open, used and withdrawn.
      expect(await s.accounts.getInvite(`${P}inv1`)).toMatchObject({ acceptedAt: null, revokedAt: null });
      await s.accounts.markInviteAccepted(`${P}inv1`, '2026-09-03T00:00:00.000Z', `${P}acc2`);
      expect((await s.accounts.getInvite(`${P}inv1`))?.acceptedByAccountId).toBe(`${P}acc2`);
      await s.accounts.markInviteRevoked(`${P}inv1`, '2026-09-04T00:00:00.000Z');
      expect((await s.accounts.getInvite(`${P}inv1`))?.revokedAt).toBe('2026-09-04T00:00:00.000Z');
      expect((await s.accounts.listInvites(`${P}org1`)).map((x) => x.inviteId)).toContain(`${P}inv1`);
    });

    it('scopes a run to exactly one organisation', async () => {
      await s.accounts.putScope({ orgId: `${P}org1`, scopeKind: 'run', scopeId: `${P}r1`, createdAt: '2026-09-02T00:00:00.000Z' });
      await s.accounts.putScope({ orgId: `${P}org2`, scopeKind: 'run', scopeId: `${P}r1`, createdAt: '2026-09-03T00:00:00.000Z' });
      // The second claim replaces the first; it does not sit beside it.
      expect((await s.accounts.getScope('run', `${P}r1`))?.orgId).toBe(`${P}org2`);
      expect(await s.accounts.listScopeIds(`${P}org1`, 'run', 10)).toEqual([]);
      expect(await s.accounts.listScopeIds(`${P}org2`, 'run', 10)).toEqual([`${P}r1`]);
      // A plot with the same id is a different row — the key is (kind, id).
      await s.accounts.putScope({ orgId: `${P}org1`, scopeKind: 'plot', scopeId: `${P}r1`, createdAt: '2026-09-02T00:00:00.000Z' });
      expect((await s.accounts.getScope('plot', `${P}r1`))?.orgId).toBe(`${P}org1`);
    });

    it('appends audit rows newest first and keeps the label as written', async () => {
      for (const [i, action] of ['org.created', 'invite.created', 'member.role_changed'].entries()) {
        await s.accounts.appendAudit({
          eventId: `${P}ev${i}`,
          at: `2026-09-0${i + 1}T00:00:00.000Z`,
          orgId: `${P}org1`,
          actorAccountId: `${P}acc1`,
          actorLabel: 'Somebody',
          action,
          subject: `${P}acc2`,
          detail: '{"from":"member","to":"admin"}',
        });
      }
      const rows = await s.accounts.listAudit(`${P}org1`, 10);
      expect(rows.map((r) => r.action)).toEqual(['member.role_changed', 'invite.created', 'org.created']);
      expect(rows[0]?.actorLabel).toBe('Somebody');
      expect(await s.accounts.listAudit(`${P}org1`, 2)).toHaveLength(2);
    });

    it('resolves many accounts in one statement, and none for none', async () => {
      // The empty case is the one that matters: `IN ()` is a syntax error in both.
      expect(await s.accounts.getAccountsByIds([])).toEqual([]);
      const found = await s.accounts.getAccountsByIds([`${P}acc1`, `${P}nobody`]);
      expect(found.map((a) => a.accountId)).toEqual([`${P}acc1`]);
    });

    it.runIf(name === 'mysql')('refuses a value too long for its column instead of cutting it', async () => {
      // The server's own sql_mode is not strict; the pool makes every session strict.
      await expect(
        s.accounts.createAccount({
          accountId: `${P}acc3`,
          email: `${P}${'e'.repeat(300)}@example.com`,
          name: 'Too long',
          licence: null,
          passwordHash: 'x',
          createdAt: '2026-09-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(/too long/i);
    });
  });
}
