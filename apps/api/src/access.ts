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

import type { AccountRepository, ShareRole } from './account-store.js';
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

const notFound = (what: 'run' | 'plot'): Error =>
  Object.assign(new Error(`${what} not found`), { statusCode: 404 });

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
  return share ? share.role : null;
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
  const roleOf = new Map(shares.map((s) => [s.runId, s.role]));
  const shared = await repo.getMany(shares.map((s) => s.runId));
  return [
    ...authored.map((run) => ({ run, role: 'author' as const })),
    ...shared
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
  if (mode === 'read' && accounts && account !== null) {
    const shares = await accounts.listSharesForAccount(account);
    const shared = await repo.getMany(shares.map((s) => s.runId));
    if (shared.some((run) => run.plotId === plotId)) return plot;
  }
  throw notFound('plot');
}
