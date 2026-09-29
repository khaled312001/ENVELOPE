/**
 * WHICH WORKSPACE THE READER IS WORKING INSIDE — one owner, like the session.
 *
 * `session.tsx` argues the shape and this file follows it, including the four-state
 * machine and the reason for it: collapsing "not yet known" into "none" would make
 * a returning member's first computation land in their personal work rather than
 * their firm's, silently, and a run cannot be moved afterwards.
 *
 * ---------------------------------------------------------------------------
 * THE ACTIVE WORKSPACE IS REMEMBERED PER ACCOUNT.
 *
 * One key holding one id would hand the second person to sign in on a shared
 * machine the first person's workspace — and the server would refuse it, which is
 * correct, but the reader would then be looking at a rail naming a firm they are
 * not in. The key is `envelope.workspace.<accountId>`, and it is cleared when the
 * account leaves or loses the workspace it names.
 *
 * ---------------------------------------------------------------------------
 * A REMEMBERED ID IS CHECKED AGAINST THE LIST, NEVER TRUSTED.
 *
 * `localStorage` is a note the browser kept, not a fact about membership. A stale
 * id names a workspace the reader may have been removed from an hour ago, so the
 * chosen workspace is always the intersection of what was remembered and what the
 * server just said. The server refuses it too — `activeOrgFor` checks membership on
 * every request — but a screen that displays a workspace the server is ignoring is
 * a screen that lies about where the work is going.
 *
 * ---------------------------------------------------------------------------
 * NOTHING HERE FALLS BACK TO "the first one".
 *
 * A reader in two firms who has never chosen gets `null`, which means personal, and
 * personal is a real answer. Picking a workspace on their behalf would file work
 * under a client's name because of an array index.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { workspaces, type WorkspaceSummary } from './api/workspace.js';
import { useSession } from './session.js';

export type WorkspaceState = 'checking' | 'ready' | 'none' | 'offline';

interface WorkspaceValue {
  readonly state: WorkspaceState;
  /** Every workspace this account belongs to, newest membership last. */
  readonly list: readonly WorkspaceSummary[];
  /** The one work is being filed under, or `null` for personal. */
  readonly active: WorkspaceSummary | null;
  readonly setActive: (orgId: string | null) => void;
  readonly refresh: () => Promise<void>;
  /** Create one and switch to it — the only place that chooses on the reader's behalf. */
  readonly create: (name: string) => Promise<WorkspaceSummary>;
}

const WorkspaceContext = createContext<WorkspaceValue>({
  state: 'none',
  list: [],
  active: null,
  setActive: () => {},
  refresh: async () => {},
  create: async () => {
    throw new Error('no workspace provider');
  },
});

const keyFor = (accountId: string): string => `envelope.workspace.${accountId}`;

function remembered(accountId: string): string | null {
  try {
    return localStorage.getItem(keyFor(accountId));
  } catch {
    /* A blocked store means the reader chooses again, not that the app fails. */
    return null;
  }
}

function remember(accountId: string, orgId: string | null): void {
  try {
    if (orgId) localStorage.setItem(keyFor(accountId), orgId);
    else localStorage.removeItem(keyFor(accountId));
  } catch {
    /* Works for this visit; will not be remembered. */
  }
}

export function WorkspaceProvider({ children }: { readonly children: ReactNode }): JSX.Element {
  const { state: sessionState, account } = useSession();
  const [state, setState] = useState<WorkspaceState>('checking');
  const [list, setList] = useState<readonly WorkspaceSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const accountId = account?.accountId ?? null;

  const load = useCallback(async (): Promise<void> => {
    if (!accountId) {
      /* A guest has no workspace. Not an error, and not "checking" forever. */
      setList([]);
      setActiveId(null);
      setState('none');
      return;
    }
    try {
      const { organisations } = await workspaces.list();
      setList(organisations);
      const saved = remembered(accountId);
      /* The intersection, never the note on its own. */
      const still = organisations.some((o) => o.orgId === saved) ? saved : null;
      if (saved !== null && still === null) remember(accountId, null);
      setActiveId(still);
      setState(organisations.length > 0 ? 'ready' : 'none');
    } catch {
      /*
        Unreachable is not "you have no workspace". Telling a member their firm is
        gone because a request failed is the same class of error as telling a
        signed-in reader to sign in — see `session.tsx` on `offline`.
      */
      setState('offline');
    }
  }, [accountId]);

  useEffect(() => {
    if (sessionState === 'checking') return;
    void load();
  }, [sessionState, load]);

  const setActive = useCallback(
    (orgId: string | null) => {
      if (!accountId) return;
      const valid = orgId !== null && list.some((o) => o.orgId === orgId) ? orgId : null;
      remember(accountId, valid);
      setActiveId(valid);
    },
    [accountId, list],
  );

  const create = useCallback(
    async (name: string): Promise<WorkspaceSummary> => {
      const made = await workspaces.create(name);
      setList((current) => [...current, made]);
      if (accountId) remember(accountId, made.orgId);
      setActiveId(made.orgId);
      setState('ready');
      return made;
    },
    [accountId],
  );

  const value = useMemo<WorkspaceValue>(
    () => ({
      state,
      list,
      active: list.find((o) => o.orgId === activeId) ?? null,
      setActive,
      refresh: load,
      create,
    }),
    [state, list, activeId, setActive, load, create],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceValue {
  return useContext(WorkspaceContext);
}
