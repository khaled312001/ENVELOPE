/**
 * WHO MAY SEE A RUN — one rule, on every route.
 *
 * `CLAUDE.md` disclosed this as the largest open defect in the API: "any identified
 * actor can read, gate and export any run". `/api/work` was the first route that
 * did not open that hole; this module closes it everywhere else, with the rule that
 * route already used, so there is one definition of access rather than one per
 * handler.
 *
 * THE RULE. A run is reachable by the actor who authored it and by every account
 * the author has shared it with. Nothing else — not a matching name, not a tenant,
 * not a list endpoint that "only shows summaries". A summary of someone else's run
 * carries their plot number, their assumptions and the basis strings they typed.
 *
 * A SHARE CARRIES A ROLE, AND THE ROLE BOUNDS THE ACTION.
 *
 *   author    everything, including G1–G3, which acknowledge the author's inputs
 *   reviewer  read, export, and G4 — the signature the share exists to make possible
 *   reader    read and export; no gate, because an acknowledgement is a judgement
 *
 * NOT FOUND, NOT FORBIDDEN. A run the actor may not see answers 404 with the same
 * message as a run that does not exist. A 403 would confirm that the id is real,
 * and run ids are the only thing standing between a guest and someone else's work.
 *
 * WHAT "AUTHORED" MEANS FOR A GUEST. An actor without an account is identified by
 * the key in its `X-Actor-Id` header. `identity.ts` says what that is and is not;
 * the consequence here is that the rule is exactly as strong as that key is hard to
 * guess, which is why a deployment serving the public runs with keyed guests
 * (`build({ guests: 'keyed' })`) and the antechamber mints a random key rather than
 * deriving one from the name somebody typed.
 */

import {
  WORKSPACE_RANK,
  type AccountRepository,
  type ShareRole,
  type StoredMembership,
  type StoredOrganisation,
  type WorkspaceRole,
} from './account-store.js';
import type { Actor } from './identity.js';
import type { RunRepository, StoredPlot, StoredRun } from './store.js';

export type RunRole = 'author' | ShareRole;

/** Every role may read. The narrower lists are spelled out where they are used. */
export const ANY_ROLE: readonly RunRole[] = ['author', 'reviewer', 'reader'];

/** The account behind an actor, when the actor is a proven session. */
function accountOf(actor: Actor): string | null {
  const a = actor as Actor & { accountId?: string; authenticated?: boolean };
  return a.authenticated === true && typeof a.accountId === 'string' ? a.accountId : null;
}

const notFound = (what: 'run' | 'plot' | 'organisation'): Error =>
  Object.assign(new Error(`${what} not found`), { statusCode: 404 });

/* -------------------------------------------------------------------------
   THE SECOND AXIS — an organisation, and what membership of one is worth.

   The first axis above answers "what may this person do to THIS RUN". It does not
   answer "what may this person do to the FIRM", and a practice needs both: a run
   shared one at a time does not scale past two people, and when somebody leaves
   there has to be one act that ends their access rather than a search through
   every run they were ever granted.

   MEMBERSHIP IS A ROLE ON A RUN, DERIVED — NEVER `author`. Being an admin of the
   organisation a run was computed in does not make you its author. `author` is
   what G1–G3 acknowledge, and those gates say "I entered these inputs"; a person
   who did not enter them has nothing to acknowledge and is given `reviewer` at
   most. That is not a rounding-down for safety — it is what the gate MEANS.

   WHAT A MEMBER SEES. Every run and plot scoped to the organisation, including
   ones they did not make. That is a real disclosure and it is the point of an
   organisation: colleagues in one firm read each other's work. The settings screen
   states it in those words before anyone is invited, because a person joining a
   workspace is consenting to it.
   ------------------------------------------------------------------------- */

/** How a workspace role reads when the question is about one run inside it. */
const RUN_ROLE_FROM_WORKSPACE: Readonly<Record<WorkspaceRole, ShareRole>> = {
  owner: 'reviewer',
  admin: 'reviewer',
  member: 'reviewer',
  viewer: 'reader',
};

/** The actor's role on a run, or null when the actor has none. */
export async function roleOn(
  run: StoredRun,
  actor: Actor,
  accounts: AccountRepository | null,
): Promise<RunRole | null> {
  if (run.createdByActorId === actor.id) return 'author';
  const account = accountOf(actor);
  if (!accounts || account === null) return null;

  const share = await accounts.getShare(run.runId, account);
  if (share) return share.role;

  /*
    THE SHARE IS CHECKED FIRST AND THE ORGANISATION SECOND, so an explicit grant
    can only ever widen. A run scoped to an organisation where the actor is a
    `viewer` would otherwise override a `reviewer` share its author deliberately
    made — downgrading somebody by a rule they did not ask for.
  */
  const scope = await accounts.getScope('run', run.runId);
  if (!scope) return null;
  const membership = await accounts.getMembership(scope.orgId, account);
  return membership ? RUN_ROLE_FROM_WORKSPACE[membership.role] : null;
}

/** The actor's role in an organisation, or null when it is not a member of it. */
export async function workspaceRoleOn(
  accounts: AccountRepository | null,
  orgId: string,
  actor: Actor,
): Promise<WorkspaceRole | null> {
  const account = accountOf(actor);
  if (!accounts || account === null) return null;
  const membership = await accounts.getMembership(orgId, account);
  return membership ? membership.role : null;
}

/**
 * Load an organisation the actor is a member of, or throw.
 *
 * 404 AND NOT 403 when the actor is not a member, for the reason the run rule
 * gives: an organisation id confirmed to exist is a fact about a firm that the
 * person asking has no relationship with. 403 once membership is established and
 * the role is too low — at that point the workspace is not a secret from them,
 * and "you are a member, and a member cannot do this" is the useful answer.
 */
export async function requireOrgFor(
  accounts: AccountRepository | null,
  orgId: string,
  actor: Actor,
  atLeast: WorkspaceRole,
): Promise<{ readonly org: StoredOrganisation; readonly role: WorkspaceRole }> {
  if (!accounts) throw notFound('organisation');
  const role = await workspaceRoleOn(accounts, orgId, actor);
  const org = role === null ? undefined : await accounts.getOrganisation(orgId);
  if (!org || role === null) throw notFound('organisation');

  if (WORKSPACE_RANK[role] < WORKSPACE_RANK[atLeast]) {
    throw Object.assign(
      new Error(
        `you are a ${role} of this workspace, and a ${role} cannot do this. ` +
          `Ask an owner or an admin.`,
      ),
      { statusCode: 403 },
    );
  }
  return { org, role };
}

/** Every organisation an account belongs to, with the role it holds in each. */
export async function organisationsFor(
  accounts: AccountRepository | null,
  actor: Actor,
): Promise<readonly { readonly org: StoredOrganisation; readonly membership: StoredMembership }[]> {
  const account = accountOf(actor);
  if (!accounts || account === null) return [];
  const memberships = await accounts.listMembershipsFor(account);
  const resolved = await Promise.all(
    memberships.map(async (membership) => {
      const org = await accounts.getOrganisation(membership.orgId);
      /* A membership whose organisation is missing is the half-write
         `createOrganisation` documents. It is dropped, not reported. */
      return org ? { org, membership } : null;
    }),
  );
  return resolved.filter((r): r is { org: StoredOrganisation; membership: StoredMembership } => r !== null);
}

/**
 * Load a run the actor holds one of `allowed` roles on, or throw.
 *
 * 404 when the actor holds no role at all; 403 only when the actor can already see
 * the run and is asking for an action its role does not include — at that point
 * the run's existence is not a secret from them.
 */
export async function requireRunFor(
  repo: RunRepository,
  accounts: AccountRepository | null,
  runId: string,
  actor: Actor,
  allowed: readonly RunRole[],
): Promise<{ readonly run: StoredRun; readonly role: RunRole }> {
  const run = await repo.get(runId);
  const role = run ? await roleOn(run, actor, accounts) : null;
  if (!run || role === null) throw notFound('run');
  if (!allowed.includes(role)) {
    throw Object.assign(
      new Error(
        `this run was shared with you as a ${role}, and a ${role} cannot do this. ` +
          'Ask its author for a different role, or to do it themselves.',
      ),
      { statusCode: 403 },
    );
  }
  return { run, role };
}

/**
 * The runs an actor may see: what it authored, then what was shared with it.
 *
 * Resolved by id from the grant table, never by reading every run and filtering —
 * see `RunRepository.listRunsByActor` for why the filter has to be the query.
 */
export async function visibleRuns(
  repo: RunRepository,
  accounts: AccountRepository | null,
  actor: Actor,
  limit: number,
): Promise<readonly { readonly run: StoredRun; readonly role: RunRole }[]> {
  const authored = await repo.listRunsByActor(actor.id, limit);
  const account = accountOf(actor);
  if (!accounts || account === null) return authored.map((run) => ({ run, role: 'author' as const }));

  const shares = await accounts.listSharesForAccount(account);
  const roleOf = new Map<string, RunRole>(shares.map((s) => [s.runId, s.role]));

  /*
    THE WORKSPACE'S RUNS, RESOLVED BY ID FROM `org_scope` — never by listing every
    run and keeping the ones whose organisation matches. `RunRepository.listRunsByActor`
    already argues this: the filter IS the security property, and a filter applied
    in memory is one someone can forget without the tests noticing.
  */
  const memberships = await accounts.listMembershipsFor(account);
  const scopedIds: string[] = [];
  for (const membership of memberships) {
    const ids = await accounts.listScopeIds(membership.orgId, 'run', limit);
    const derived = RUN_ROLE_FROM_WORKSPACE[membership.role];
    for (const id of ids) {
      scopedIds.push(id);
      /* A share already recorded for this run wins — see `roleOn` for why. */
      if (!roleOf.has(id)) roleOf.set(id, derived);
    }
  }

  const otherIds = [...new Set([...shares.map((s) => s.runId), ...scopedIds])];
  const others = await repo.getMany(otherIds);
  return [
    ...authored.map((run) => ({ run, role: 'author' as const })),
    ...others
      .filter((run) => run.createdByActorId !== actor.id)
      .map((run) => ({ run, role: roleOf.get(run.runId) ?? ('reader' as const) })),
  ]
    .sort((a, b) => (a.run.createdAt < b.run.createdAt ? 1 : a.run.createdAt > b.run.createdAt ? -1 : 0))
    .slice(0, limit);
}

/**
 * Load a plot the actor may use, or throw 404.
 *
 * `write` is running the engine on it. Only the plot's author may do that: a run is
 * attributed to whoever started it, and a reviewer starting runs on the author's
 * plot would put runs under the author's plot that the author cannot see.
 *
 * Reading is wider by exactly one case — an account that was shared a run on this
 * plot may see the plot the run was computed on, because the run is unreadable
 * without it.
 *
 * INSIDE AN ORGANISATION, `write` OPENS UP, and the paragraph above is why it can.
 * The objection to a non-author running on somebody else's plot was that the runs
 * would land somewhere the plot's owner could not see them. A plot scoped to an
 * organisation does not have that problem: the run is scoped to the same
 * organisation and every member — the plot's owner among them — reads it. So a
 * `member` and above may compute on the workspace's plots, and a `viewer` may not,
 * which is the whole distinction between those two roles.
 */
export async function requirePlotFor(
  repo: RunRepository,
  accounts: AccountRepository | null,
  plotId: string,
  actor: Actor,
  mode: 'read' | 'write',
): Promise<StoredPlot> {
  const plot = await repo.getPlot(plotId);
  if (!plot) throw notFound('plot');
  if (plot.createdByActorId === actor.id) return plot;

  const account = accountOf(actor);
  if (accounts && account !== null) {
    const scope = await accounts.getScope('plot', plotId);
    if (scope) {
      const membership = await accounts.getMembership(scope.orgId, account);
      if (membership) {
        if (mode === 'read') return plot;
        if (WORKSPACE_RANK[membership.role] >= WORKSPACE_RANK['member']) return plot;
        throw Object.assign(
          new Error(
            'you are a viewer of this workspace, and a viewer cannot start a run. ' +
              'Ask an owner or an admin to make you a member.',
          ),
          { statusCode: 403 },
        );
      }
    }
    if (mode === 'read') {
      const shares = await accounts.listSharesForAccount(account);
      const shared = await repo.getMany(shares.map((s) => s.runId));
      if (shared.some((run) => run.plotId === plotId)) return plot;
    }
  }
  throw notFound('plot');
}
