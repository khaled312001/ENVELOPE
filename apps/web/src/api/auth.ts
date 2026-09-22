/**
 * The account and draft calls.
 *
 * A separate module from `client.ts` because it obeys a different rule: every call
 * in `client.ts` takes an `Actor` and puts it in a header, and every call here
 * carries a COOKIE the browser attaches and script cannot read. Mixing them would
 * invite an `actor` parameter onto a route where an actor parameter is exactly the
 * thing being replaced.
 *
 * No `credentials` option anywhere below, and that is correct rather than an
 * omission: `vite.config.ts` proxies `/api` to the API, so the browser sees one
 * origin, and `same-origin` is already the default. Writing `credentials:
 * 'include'` would work here and would quietly become the reason a future
 * cross-origin deployment sent the session to somewhere it should not.
 */

import type { RunView } from './client.js';

export interface Account {
  readonly accountId: string;
  readonly email: string;
  readonly name: string;
  readonly licence: string | null;
  readonly createdAt: string;
}

export interface AuthError {
  readonly status: number;
  readonly message: string;
}

export class AuthFailure extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'AuthFailure';
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
    const message =
      typeof body === 'object' && body !== null && 'error' in body
        ? String((body as { error: unknown }).error)
        : `the server answered ${res.status}`;
    throw new AuthFailure(res.status, message);
  }
  return body as T;
}

export const auth = {
  register: (input: {
    email: string;
    password: string;
    name: string;
    licence?: string;
  }): Promise<{ account: Account }> =>
    call('/api/auth/register', { method: 'POST', body: JSON.stringify(input) }),

  login: (input: { email: string; password: string }): Promise<{ account: Account }> =>
    call('/api/auth/login', { method: 'POST', body: JSON.stringify(input) }),

  logout: (): Promise<{ signedOut: boolean }> => call('/api/auth/logout', { method: 'POST' }),

  logoutEverywhere: (): Promise<{ signedOut: boolean }> =>
    call('/api/auth/logout-everywhere', { method: 'POST' }),

  /** 200 with `account: null` when signed out — see the route's own note on why. */
  me: (): Promise<{ account: Account | null }> => call('/api/auth/me'),
};

export interface Draft<T> {
  readonly draftKey: string;
  readonly updatedAt: string;
  readonly payload: T;
}

export const drafts = {
  put: <T>(key: string, payload: T): Promise<{ draftKey: string; updatedAt: string }> =>
    call(`/api/drafts/${key}`, { method: 'PUT', body: JSON.stringify({ payload }) }),

  get: <T>(key: string): Promise<{ draft: Draft<T> | null }> => call(`/api/drafts/${key}`),

  remove: (key: string): Promise<{ deleted: boolean }> =>
    call(`/api/drafts/${key}`, { method: 'DELETE' }),

  list: (): Promise<{ drafts: readonly { draftKey: string; updatedAt: string }[] }> =>
    call('/api/drafts'),
};

/** What the signed-in account may do with a run, as the server decided it. */
export type RunAccess = 'author' | 'reviewer' | 'reader';

/**
 * A stored run, read on the account's session rather than an actor header — the
 * run page on `/work`. The server answers 404 for a run this account may not see,
 * whether or not it exists, so the page cannot tell the two apart either.
 */
export const accountRuns = {
  get: (runId: string): Promise<RunView & { readonly access: RunAccess }> =>
    call(`/api/runs/${encodeURIComponent(runId)}`),

  /** `{ shared: true }` whether or not an account uses the address: see the route. */
  share: (runId: string, email: string, role: 'reviewer' | 'reader'): Promise<{ shared: boolean }> =>
    call(`/api/runs/${encodeURIComponent(runId)}/share`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),
};
