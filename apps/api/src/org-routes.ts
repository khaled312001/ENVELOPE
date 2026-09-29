/**
 * ORGANISATIONS, MEMBERSHIP, INVITATIONS AND THE AUDIT LOG.
 *
 * `docs/06-plan/platform-plan.md` §6.4 states the rule this file exists to satisfy:
 *
 *   > No roles screen ships before the server enforces the roles it displays.
 *
 * A members table with a role dropdown is the easiest screen in any product to
 * build and the easiest to make a lie. It renders four words, it looks like
 * governance, and unless every one of those words is checked on the way into a
 * handler it is decoration over an API where everybody can do everything. So the
 * enforcement is here, with its tests, and the screen reads it.
 *
 * ---------------------------------------------------------------------------
 * FOUR RULES, WRITTEN ONCE.
 *
 * 1. **You cannot act on somebody at or above your own rank, and you cannot hand
 *    out a rank above your own.** Two halves, and both are needed: an admin may
 *    not demote an owner (the first half) and may not promote anybody to owner
 *    (the second). Without either, `admin` is `owner` with an extra step.
 *
 *    The second half is `>`, not `>=`, and that is load-bearing rather than a
 *    looser reading. An owner must be able to make a second owner, because rule 3
 *    below refuses to let the last one leave — with `>=` those two rules together
 *    are a trap with no exit, and the only person who can administer a workspace
 *    is also the only person who can never walk away from it. It fell out of the
 *    tests as a 403 on the one promotion that had to be allowed.
 * 2. **You cannot change your own role.** Not a safety rail — a correctness one.
 *    Self-promotion is the same statement as rule 1 read from the other side, and
 *    an owner demoting themselves is how an organisation ends up with none.
 * 3. **The last owner stays.** An organisation with no owner cannot be renamed,
 *    cannot invite, and cannot be repaired from inside the product.
 * 4. **An invitation that cannot be redeemed says so in one sentence, always the
 *    same sentence.** Expired, revoked, already accepted, addressed to a different
 *    person, or never existed — one message. Distinguishing them turns the accept
 *    route into an oracle that answers "is this person a member of that firm" to
 *    anyone with a URL.
 *
 * ---------------------------------------------------------------------------
 * AN INVITATION IS A LINK THE INVITER CARRIES, because there is no mailer. See
 * `StoredInvite`. The route returns the link exactly once, in the response to the
 * request that created it; it is not stored and cannot be shown again. A second
 * look means a second invitation, which is also the correct behaviour — the first
 * one may by then be in somebody else's inbox.
 */

import { randomUUID } from 'node:crypto';

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';

import {
  WORKSPACE_RANK,
  WORKSPACE_ROLES,
  type AccountRepository,
  type StoredAccount,
  type StoredAuditEvent,
  type StoredInvite,
  type StoredMembership,
  type WorkspaceRole,
} from './account-store.js';
import { mintSessionToken, normaliseEmail, sessionTokenHash } from './accounts.js';
import { organisationsFor, requireOrgFor, workspaceRoleOn } from './access.js';
import { sessionFrom, type SessionActor } from './auth-routes.js';

/**
 * The invite token is minted and hashed exactly as a session token is.
 *
 * Same requirement, same answer: 256 bits of CSPRNG output, and only the SHA-256
 * of it reaches the database, so a readable backup is not a bag of live
 * invitations. `accounts.ts` argues both choices in full; duplicating the
 * functions here to give them invite-flavoured names would duplicate the risk of
 * one of the two copies being weakened later.
 */
const mintInviteToken = mintSessionToken;
const inviteTokenHash = sessionTokenHash;

/** Seven days. Long enough to reach somebody on leave, short enough that a stale link dies. */
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Rule 4. One sentence for every way an invitation can fail to be redeemable. */
const INVITE_REFUSED =
  'that invitation cannot be used. It may have expired, been withdrawn, already ' +
  'been accepted, or been addressed to a different email address. Ask whoever ' +
  'invited you to send a new one.';

const createBody = z.object({ name: z.string().trim().min(1).max(120) });
const renameBody = z.object({ name: z.string().trim().min(1).max(120) });
const roleSchema = z.enum(['owner', 'admin', 'member', 'viewer']);
const inviteBody = z.object({ email: z.string().min(3).max(254), role: roleSchema });
const memberBody = z.object({ role: roleSchema });
const acceptBody = z.object({ token: z.string().min(8).max(512) });

/** A run role is `reviewer`; a workspace role is one of four. Never inferred from a string. */
export function isWorkspaceRole(v: string): v is WorkspaceRole {
  return (WORKSPACE_ROLES as readonly string[]).includes(v);
}

const now = (): string => new Date().toISOString();

/**
 * A refusal a person will read.
 *
 * THROWN, NOT `reply.code(n).send({ error })`, and the difference is not stylistic.
 * Fastify serialises a thrown error as `{ statusCode, error, message }` where
 * `error` is the status NAME and `message` is the sentence — and `apps/web/src/api/client.ts`
 * is built on exactly that: it puts `body.error` in `ApiError.kind` and `body.message`
 * in the message it shows. A handler that sends its sentence as `error` therefore
 * files it under `kind` and the reader is shown "Request failed with 403" instead.
 * Every sentence in this file was written to be read; this is what makes them arrive.
 */
const refuse = (statusCode: number, message: string): Error =>
  Object.assign(new Error(message), { statusCode });

interface AuditDraft {
  readonly orgId: string | null;
  readonly actor: SessionActor;
  readonly action: string;
  readonly subject?: string;
  readonly detail?: Record<string, unknown>;
}

/**
 * Write one audit row.
 *
 * `actorLabel` is the name as it stands NOW and is never resolved at read time. A
 * person who renames themselves has not changed what they did last March, and a
 * log that re-renders its own history from current state is not a log.
 */
async function audit(repo: AccountRepository, draft: AuditDraft): Promise<void> {
  const event: StoredAuditEvent = {
    eventId: randomUUID(),
    at: now(),
    orgId: draft.orgId,
    actorAccountId: draft.actor.accountId,
    actorLabel: draft.actor.name,
    action: draft.action,
    subject: draft.subject ?? null,
    /* Canonical: keys sorted, so two equal events serialise to two equal strings. */
    detail: JSON.stringify(draft.detail ?? {}, Object.keys(draft.detail ?? {}).sort()),
  };
  await repo.appendAudit(event);
}

/** What a member is told about another member. Never the password hash, never the session. */
function publicMember(
  membership: StoredMembership,
  account: StoredAccount | undefined,
): Record<string, unknown> {
  return {
    accountId: membership.accountId,
    role: membership.role,
    addedAt: membership.addedAt,
    /* An account row that has gone missing is shown as missing, not as a blank
       name that reads like somebody with no name. */
    name: account ? account.name : null,
    email: account ? account.email : null,
    licence: account ? account.licence : null,
  };
}

/**
 * What an admin is told about an invitation. NEVER the token or its hash.
 *
 * The hash is as good as the token to anyone who can present it to a database, and
 * an invites table rendered on a screen is a table somebody screenshots.
 */
function publicInvite(invite: StoredInvite): Record<string, unknown> {
  return {
    inviteId: invite.inviteId,
    email: invite.email,
    role: invite.role,
    createdAt: invite.createdAt,
    expiresAt: invite.expiresAt,
    acceptedAt: invite.acceptedAt,
    revokedAt: invite.revokedAt,
    state: inviteState(invite, Date.now()),
  };
}

type InviteState = 'open' | 'accepted' | 'withdrawn' | 'expired';

function inviteState(invite: StoredInvite, at: number): InviteState {
  if (invite.acceptedAt) return 'accepted';
  if (invite.revokedAt) return 'withdrawn';
  if (Date.parse(invite.expiresAt) <= at) return 'expired';
  return 'open';
}

export function registerOrgRoutes(app: FastifyInstance, repo: AccountRepository): void {
  /**
   * Every route here needs a proven session, not an asserted actor.
   *
   * A guest key identifies a browser; a workspace role is a statement about a
   * person, and the two cannot be the same thing. `resolveActor` would hand back a
   * header actor here and the membership lookup would simply find nothing — which
   * is a 404 that reads like "no such workspace" when the truth is "sign in".
   */
  const session = async (request: FastifyRequest): Promise<SessionActor> => {
    const actor = await sessionFrom(repo, request);
    if (!actor) {
      throw Object.assign(
        new Error('a workspace belongs to accounts. Sign in to see yours.'),
        { statusCode: 401 },
      );
    }
    return actor;
  };

  /** The workspaces this account belongs to, with the role it holds in each. */
  app.get('/api/orgs', async (request) => {
    const actor = await session(request);
    const rows = await organisationsFor(repo, actor);
    return {
      organisations: rows.map(({ org, membership }) => ({
        orgId: org.orgId,
        name: org.name,
        createdAt: org.createdAt,
        role: membership.role,
      })),
    };
  });

  /**
   * Create a workspace. The account that creates it is its first owner.
   *
   * THERE IS NO CHECK THAT THE NAME IS A REAL FIRM, and `/refusals` says so. A
   * name here is a label its members chose; the product does not verify companies
   * and must not let a workspace name imply that it did.
   */
  app.post('/api/orgs', async (request, reply) => {
    const actor = await session(request);
    const body = createBody.parse(request.body);

    const orgId = `org-${randomUUID()}`;
    const at = now();
    await repo.createOrganisation(
      { orgId, name: body.name, createdAt: at, createdByAccountId: actor.accountId },
      {
        orgId,
        accountId: actor.accountId,
        role: 'owner',
        addedByAccountId: actor.accountId,
        addedAt: at,
      },
    );
    await audit(repo, {
      orgId,
      actor,
      action: 'org.created',
      subject: orgId,
      detail: { name: body.name },
    });
    return reply.code(201).send({ orgId, name: body.name, createdAt: at, role: 'owner' });
  });

  /** The workspace, its members, and — for an admin — its invitations. */
  app.get('/api/orgs/:orgId', async (request) => {
    const actor = await session(request);
    const { orgId } = request.params as { orgId: string };
    const { org, role } = await requireOrgFor(repo, orgId, actor, 'viewer');

    const members = await repo.listMembers(orgId);
    const accounts = await repo.getAccountsByIds(members.map((m) => m.accountId));
    const byId = new Map(accounts.map((a) => [a.accountId, a]));

    const mayAdminister = WORKSPACE_RANK[role] >= WORKSPACE_RANK['admin'];
    const invites = mayAdminister ? await repo.listInvites(orgId) : [];

    return {
      orgId: org.orgId,
      name: org.name,
      createdAt: org.createdAt,
      role,
      members: members.map((m) => publicMember(m, byId.get(m.accountId))),
      /* An empty list and "you may not see this" are different facts, so the
         second one is stated rather than rendered as the first. */
      invites: invites.map(publicInvite),
      mayInvite: mayAdminister,
      mayRename: role === 'owner',
    };
  });

  app.patch('/api/orgs/:orgId', async (request) => {
    const actor = await session(request);
    const { orgId } = request.params as { orgId: string };
    const body = renameBody.parse(request.body);
    const { org } = await requireOrgFor(repo, orgId, actor, 'owner');

    await repo.renameOrganisation(orgId, body.name);
    await audit(repo, {
      orgId,
      actor,
      action: 'org.renamed',
      subject: orgId,
      detail: { from: org.name, to: body.name },
    });
    return { orgId, name: body.name };
  });

  /**
   * Invite somebody. Returns the link ONCE — see the file header.
   *
   * Rule 1 applies to the role being offered: an admin cannot invite an owner,
   * because an invitation is a membership with a delay.
   */
  app.post('/api/orgs/:orgId/invites', async (request, reply) => {
    const actor = await session(request);
    const { orgId } = request.params as { orgId: string };
    const body = inviteBody.parse(request.body);
    const { role } = await requireOrgFor(repo, orgId, actor, 'admin');

    /* An invitation is a membership with a delay, so it is bound by rule 1. */
    if (WORKSPACE_RANK[body.role] > WORKSPACE_RANK[role]) {
      throw refuse(
        403,
        `you are ${article(role)} ${role} of this workspace, and cannot invite ` +
          `somebody as ${article(body.role)} ${body.role}.`,
      );
    }

    const email = normaliseEmail(body.email);
    const existing = await repo.getAccountByEmail(email);
    if (existing && (await repo.getMembership(orgId, existing.accountId))) {
      throw refuse(409, 'that person is already in this workspace.');
    }

    const token = mintInviteToken();
    const at = Date.now();
    const invite: StoredInvite = {
      inviteId: `inv-${randomUUID()}`,
      orgId,
      email,
      role: body.role,
      tokenHash: inviteTokenHash(token),
      invitedByAccountId: actor.accountId,
      createdAt: new Date(at).toISOString(),
      expiresAt: new Date(at + INVITE_TTL_MS).toISOString(),
      acceptedAt: null,
      acceptedByAccountId: null,
      revokedAt: null,
    };
    await repo.createInvite(invite);
    await audit(repo, {
      orgId,
      actor,
      action: 'invite.created',
      subject: email,
      detail: { role: body.role, inviteId: invite.inviteId },
    });

    return reply.code(201).send({
      invite: publicInvite(invite),
      /* The one and only time this is ever returned. */
      token,
      /* The client builds the URL; the API does not know the site's origin and
         must not guess it from a header an attacker can set. */
      path: `/accept-invite?token=${encodeURIComponent(token)}`,
      note:
        'This link is shown once. Send it to the person yourself — TOP.ai does not ' +
        'send email, and does not claim to.',
    });
  });

  app.delete('/api/orgs/:orgId/invites/:inviteId', async (request, reply) => {
    const actor = await session(request);
    const { orgId, inviteId } = request.params as { orgId: string; inviteId: string };
    await requireOrgFor(repo, orgId, actor, 'admin');

    const invite = await repo.getInvite(inviteId);
    /* An invitation belonging to another workspace is not found, not forbidden. */
    if (!invite || invite.orgId !== orgId) {
      throw refuse(404, 'invitation not found');
    }
    if (invite.acceptedAt) {
      throw refuse(409, 'that invitation has already been accepted. Remove the member instead — ' +
          'withdrawing the link now would change nothing.');
    }
    await repo.markInviteRevoked(inviteId, now());
    await audit(repo, {
      orgId,
      actor,
      action: 'invite.revoked',
      subject: invite.email,
      detail: { inviteId },
    });
    return { inviteId, state: 'withdrawn' };
  });

  /**
   * What an invitation is for, before accepting it.
   *
   * Requires a session, and answers with the same refusal as `accept` for every
   * token it will not honour — a preview that distinguished "expired" from
   * "not yours" would be the oracle rule 4 exists to close, with a friendlier URL.
   */
  app.post('/api/invites/preview', async (request, reply) => {
    const actor = await session(request);
    const body = acceptBody.parse(request.body);
    const invite = await repo.getInviteByTokenHash(inviteTokenHash(body.token));

    if (!invite || inviteState(invite, Date.now()) !== 'open' || invite.email !== actor.email) {
      throw refuse(404, INVITE_REFUSED);
    }
    const org = await repo.getOrganisation(invite.orgId);
    if (!org) throw refuse(404, INVITE_REFUSED);

    return { orgId: org.orgId, organisation: org.name, role: invite.role, email: invite.email };
  });

  /**
   * Accept an invitation.
   *
   * THE EMAIL MUST MATCH THE SIGNED-IN ACCOUNT. Without that the token alone is
   * the membership, and a link forwarded to the wrong person — or pasted into a
   * chat — admits whoever opens it first.
   */
  app.post('/api/invites/accept', async (request, reply) => {
    const actor = await session(request);
    const body = acceptBody.parse(request.body);
    const invite = await repo.getInviteByTokenHash(inviteTokenHash(body.token));

    if (!invite || inviteState(invite, Date.now()) !== 'open' || invite.email !== actor.email) {
      throw refuse(404, INVITE_REFUSED);
    }
    const org = await repo.getOrganisation(invite.orgId);
    if (!org) throw refuse(404, INVITE_REFUSED);

    const at = now();
    /* Already a member: mark the invitation used and say so plainly. Re-writing the
       membership would silently change a role somebody may have adjusted since. */
    const already = await repo.getMembership(invite.orgId, actor.accountId);
    if (already) {
      await repo.markInviteAccepted(invite.inviteId, at, actor.accountId);
      return { orgId: org.orgId, organisation: org.name, role: already.role, alreadyMember: true };
    }

    await repo.putMembership({
      orgId: invite.orgId,
      accountId: actor.accountId,
      role: invite.role,
      addedByAccountId: invite.invitedByAccountId,
      addedAt: at,
    });
    await repo.markInviteAccepted(invite.inviteId, at, actor.accountId);
    await audit(repo, {
      orgId: invite.orgId,
      actor,
      action: 'invite.accepted',
      subject: actor.email,
      detail: { role: invite.role, inviteId: invite.inviteId },
    });
    return { orgId: org.orgId, organisation: org.name, role: invite.role, alreadyMember: false };
  });

  /** Change a member's role. Rules 1, 2 and 3. */
  app.patch('/api/orgs/:orgId/members/:accountId', async (request, reply) => {
    const actor = await session(request);
    const { orgId, accountId } = request.params as { orgId: string; accountId: string };
    const body = memberBody.parse(request.body);
    const { role } = await requireOrgFor(repo, orgId, actor, 'admin');

    if (accountId === actor.accountId) {
      throw refuse(403, 'you cannot change your own role. Ask another owner — this is what stops a ' +
          'workspace from being taken over by one member, and what stops the last ' +
          'owner from demoting themselves by accident.');
    }
    const target = await repo.getMembership(orgId, accountId);
    if (!target) throw refuse(404, 'that person is not in this workspace');

    if (WORKSPACE_RANK[target.role] >= WORKSPACE_RANK[role]) {
      throw refuse(403, `you are ${article(role)} ${role} of this workspace, and cannot change ${article(target.role)} ${target.role}'s role.`);
    }
    if (WORKSPACE_RANK[body.role] > WORKSPACE_RANK[role]) {
      throw refuse(
        403,
        `you are ${article(role)} ${role} of this workspace, and cannot make ` +
          `anybody ${article(body.role)} ${body.role}.`,
      );
    }

    await repo.putMembership({ ...target, role: body.role });
    await audit(repo, {
      orgId,
      actor,
      action: 'member.role_changed',
      subject: accountId,
      detail: { from: target.role, to: body.role },
    });
    return { accountId, role: body.role };
  });

  /**
   * Remove a member, or leave.
   *
   * LEAVING IS THE SAME ROUTE, deliberately: it is the same act, and a separate
   * `/leave` would be a second place for rule 3 to be forgotten.
   */
  app.delete('/api/orgs/:orgId/members/:accountId', async (request, reply) => {
    const actor = await session(request);
    const { orgId, accountId } = request.params as { orgId: string; accountId: string };
    const leaving = accountId === actor.accountId;

    /* A viewer may leave; only an admin may remove somebody else. */
    const { role } = await requireOrgFor(repo, orgId, actor, leaving ? 'viewer' : 'admin');

    const target = await repo.getMembership(orgId, accountId);
    if (!target) throw refuse(404, 'that person is not in this workspace');

    if (!leaving && WORKSPACE_RANK[target.role] >= WORKSPACE_RANK[role]) {
      throw refuse(403, `you are ${article(role)} ${role} of this workspace, and cannot remove ${article(target.role)} ${target.role}.`);
    }

    /* Rule 3, and it applies to leaving too — an owner walking out of a workspace
       they are the last owner of leaves it unadministrable, which is the same
       damage as being removed. */
    if (target.role === 'owner' && (await repo.countMembersWithRole(orgId, 'owner')) <= 1) {
      throw refuse(409, 'this is the last owner of the workspace. Make somebody else an owner first — ' +
          'a workspace with no owner cannot be renamed, cannot invite anybody, and ' +
          'cannot be repaired from inside TOP.ai.');
    }

    await repo.removeMembership(orgId, accountId);
    await audit(repo, {
      orgId,
      actor,
      action: leaving ? 'member.left' : 'member.removed',
      subject: accountId,
      detail: { role: target.role },
    });
    return { accountId, removed: true };
  });

  /**
   * The audit log.
   *
   * Admins and owners, because it names who did what to whom. Append-only in the
   * store, so there is no route here that edits or deletes one — the absence is
   * the guarantee.
   */
  app.get('/api/orgs/:orgId/audit', async (request) => {
    const actor = await session(request);
    const { orgId } = request.params as { orgId: string };
    await requireOrgFor(repo, orgId, actor, 'admin');

    const limitRaw = Number((request.query as { limit?: string }).limit ?? 100);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, limitRaw), 500) : 100;
    const events = await repo.listAudit(orgId, limit);
    const accounts = await repo.getAccountsByIds(
      [...new Set(events.map((e) => e.actorAccountId).filter((id): id is string => id !== null))],
    );
    const byId = new Map(accounts.map((a) => [a.accountId, a]));

    return {
      events: events.map((e) => ({
        eventId: e.eventId,
        at: e.at,
        action: e.action,
        subject: e.subject,
        detail: JSON.parse(e.detail) as unknown,
        actor: {
          accountId: e.actorAccountId,
          /* The name AS RECORDED. The current name is offered beside it, never
             instead of it — a log that silently updates is not evidence. */
          label: e.actorLabel,
          currentName: e.actorAccountId ? (byId.get(e.actorAccountId)?.name ?? null) : null,
        },
      })),
      limit,
    };
  });
}

/** "an admin", "a member". Small, but an error message with "a admin" in it reads as unfinished. */
function article(role: WorkspaceRole): 'a' | 'an' {
  return role === 'admin' || role === 'owner' ? 'an' : 'a';
}

/**
 * The organisation a new run or plot belongs to.
 *
 * ONE ACTIVE WORKSPACE, RESOLVED FROM A HEADER the client sends, and checked
 * against membership every time. A client that names a workspace the actor does
 * not belong to gets `null` — the work becomes personal — rather than an error:
 * the alternative is a stale tab in a browser failing every computation after
 * somebody was removed, with an error about workspaces on a screen about plots.
 *
 * `null` means personal, and personal is a real answer. Not every run belongs to a
 * firm, and the product worked that way before organisations existed.
 */
export async function activeOrgFor(
  repo: AccountRepository | null,
  request: FastifyRequest,
  actor: { readonly id: string },
): Promise<string | null> {
  if (!repo) return null;
  const header = request.headers['x-workspace-id'];
  const orgId = (Array.isArray(header) ? header[0] : header)?.trim();
  if (!orgId) return null;
  const role = await workspaceRoleOn(repo, orgId, actor as never);
  return role === null ? null : orgId;
}

/** Record that a run or plot was created inside a workspace. A no-op when it was not. */
export async function scopeToOrg(
  repo: AccountRepository | null,
  orgId: string | null,
  scopeKind: 'run' | 'plot',
  scopeId: string,
): Promise<void> {
  if (!repo || orgId === null) return;
  await repo.putScope({ orgId, scopeKind, scopeId, createdAt: now() });
}

/**
 * Append an audit row for something that happened outside this file — a run
 * computed, a gate signed — when it happened inside a workspace.
 *
 * Takes the actor loosely because `server.ts` holds an `Actor`, which may be a
 * guest. A guest has no account and no workspace, so the row is skipped rather
 * than written with a null actor against an organisation it cannot belong to.
 */
export async function auditInOrg(
  repo: AccountRepository | null,
  orgId: string | null,
  actor: { readonly id: string; readonly name: string },
  action: string,
  subject: string,
  detail: Record<string, unknown>,
): Promise<void> {
  if (!repo || orgId === null) return;
  await repo.appendAudit({
    eventId: randomUUID(),
    at: now(),
    orgId,
    actorAccountId: actor.id,
    actorLabel: actor.name,
    action,
    subject,
    detail: JSON.stringify(detail, Object.keys(detail).sort()),
  });
}
