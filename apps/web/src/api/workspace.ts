/**
 * The workspace calls — organisations, membership, invitations and the audit log.
 *
 * A third API module, beside `client.ts` and `auth.ts`, and the split follows the
 * same rule those two already obey: `client.ts` puts an actor in a header, `auth.ts`
 * carries a cookie the browser attaches, and so does this. A workspace role is a
 * statement about a PERSON, and a header actor is a statement about a browser — the
 * server refuses these routes to anything but a proven session, so an `actor`
 * parameter here would be a parameter that cannot help.
 *
 * ---------------------------------------------------------------------------
 * THE REFUSAL IS READ FROM `message`, NOT `error`.
 *
 * `auth.ts` reads `body.error`, because the account routes put their sentence
 * there. `org-routes.ts` throws instead, so Fastify serialises `{ statusCode,
 * error, message }` with `error` holding the STATUS NAME — "Forbidden" — and
 * `message` holding the sentence. Reading `error` here would show a reader the word
 * "Forbidden" where the server had written "you are an admin of this workspace, and
 * cannot change an owner's role."
 *
 * Every refusal on those routes was written to be read by the person it refuses.
 * This function is what makes them arrive.
 */

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

/** Rank, mirrored from the server so a screen can hide a control it may not use. */
export const RANK: Readonly<Record<WorkspaceRole, number>> = {
  owner: 3,
  admin: 2,
  member: 1,
  viewer: 0,
};

export interface WorkspaceSummary {
  readonly orgId: string;
  readonly name: string;
  readonly createdAt: string;
  readonly role: WorkspaceRole;
}

export interface MemberView {
  readonly accountId: string;
  readonly role: WorkspaceRole;
  readonly addedAt: string;
  /** `null` when the account row has gone. Shown as missing, never as a blank name. */
  readonly name: string | null;
  readonly email: string | null;
  readonly licence: string | null;
}

export type InviteState = 'open' | 'accepted' | 'withdrawn' | 'expired';

export interface InviteView {
  readonly inviteId: string;
  readonly email: string;
  readonly role: WorkspaceRole;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly acceptedAt: string | null;
  readonly revokedAt: string | null;
  readonly state: InviteState;
}

export interface WorkspaceDetail {
  readonly orgId: string;
  readonly name: string;
  readonly createdAt: string;
  readonly role: WorkspaceRole;
  readonly members: readonly MemberView[];
  /** Empty for a member or a viewer — the server does not send them, and says so. */
  readonly invites: readonly InviteView[];
  readonly mayInvite: boolean;
  readonly mayRename: boolean;
}

export interface AuditEventView {
  readonly eventId: string;
  readonly at: string;
  /** A stable key — `member.role_changed`. The screen turns it into a sentence. */
  readonly action: string;
  readonly subject: string | null;
  readonly detail: Readonly<Record<string, unknown>>;
  readonly actor: {
    readonly accountId: string | null;
    /** The name as it stood when this happened. Never re-resolved. */
    readonly label: string;
    readonly currentName: string | null;
  };
}

/** What the invite route returns ONCE. There is no call that returns it again. */
export interface MintedInvite {
  readonly invite: InviteView;
  readonly token: string;
  readonly path: string;
  readonly note: string;
}

export class WorkspaceFailure extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'WorkspaceFailure';
    this.status = status;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  const body: unknown = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const shape = body as { message?: unknown; error?: unknown };
    const sentence =
      typeof shape.message === 'string'
        ? shape.message
        : typeof shape.error === 'string'
          ? shape.error
          : `the server answered ${res.status}`;
    throw new WorkspaceFailure(res.status, sentence);
  }
  return body as T;
}

const id = (v: string): string => encodeURIComponent(v);

export const workspaces = {
  list: (): Promise<{ organisations: readonly WorkspaceSummary[] }> => call('/api/orgs'),

  create: (name: string): Promise<WorkspaceSummary> =>
    call('/api/orgs', { method: 'POST', body: JSON.stringify({ name }) }),

  get: (orgId: string): Promise<WorkspaceDetail> => call(`/api/orgs/${id(orgId)}`),

  rename: (orgId: string, name: string): Promise<{ orgId: string; name: string }> =>
    call(`/api/orgs/${id(orgId)}`, { method: 'PATCH', body: JSON.stringify({ name }) }),

  /**
   * Mint an invitation. The token comes back once and is never stored.
   *
   * There is deliberately no `resend`. A second look at a link is a second
   * invitation, which is also the correct behaviour — by then the first one may be
   * in somebody else's inbox.
   */
  invite: (orgId: string, email: string, role: WorkspaceRole): Promise<MintedInvite> =>
    call(`/api/orgs/${id(orgId)}/invites`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),

  withdrawInvite: (orgId: string, inviteId: string): Promise<{ inviteId: string }> =>
    call(`/api/orgs/${id(orgId)}/invites/${id(inviteId)}`, { method: 'DELETE' }),

  setRole: (
    orgId: string,
    accountId: string,
    role: WorkspaceRole,
  ): Promise<{ accountId: string; role: WorkspaceRole }> =>
    call(`/api/orgs/${id(orgId)}/members/${id(accountId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  /** Removing yourself is the same call. The server treats leaving as one act. */
  remove: (orgId: string, accountId: string): Promise<{ accountId: string }> =>
    call(`/api/orgs/${id(orgId)}/members/${id(accountId)}`, { method: 'DELETE' }),

  audit: (orgId: string, limit = 100): Promise<{ events: readonly AuditEventView[] }> =>
    call(`/api/orgs/${id(orgId)}/audit?limit=${limit}`),

  /** What an invitation is for. Refused with the same sentence `accept` uses. */
  preview: (
    token: string,
  ): Promise<{ orgId: string; organisation: string; role: WorkspaceRole; email: string }> =>
    call('/api/invites/preview', { method: 'POST', body: JSON.stringify({ token }) }),

  accept: (
    token: string,
  ): Promise<{
    orgId: string;
    organisation: string;
    role: WorkspaceRole;
    alreadyMember: boolean;
  }> => call('/api/invites/accept', { method: 'POST', body: JSON.stringify({ token }) }),
};
