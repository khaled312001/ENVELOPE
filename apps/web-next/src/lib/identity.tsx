import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { type Account, auth } from '@web/api/auth.js';
import type { Actor } from '@web/api/client.js';
import { guestKey } from '@web/api/guest-key.js';

/*
  ONE IDENTITY, SHARED WITH THE CURRENT SITE.

  Same origin, so the session cookie is the same cookie, and `envelope.actor` is
  the same key: a reader who signed in on `/app` is signed in here, and a guest's
  runs are the same guest's runs. A second key would split one person into two
  and hide their studies from them in whichever front end they opened second.

  A session is proof and a header is an assertion, and the API prefers the proof:
  a signed-in reader's actor is adopted from `/api/auth/me`, never typed.
*/
const KEY = 'envelope.actor';

function remembered(): Actor | null {
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? (JSON.parse(saved) as Actor) : null;
  } catch {
    return null;
  }
}

function remember(actor: Actor | null): void {
  try {
    if (actor) {
      const { workspaceId: _ignored, ...identity } = actor;
      localStorage.setItem(KEY, JSON.stringify(identity));
    } else localStorage.removeItem(KEY);
  } catch {
    /* the session still works; it is just not remembered */
  }
}

export type SessionState = 'checking' | 'signed-in' | 'signed-out' | 'offline';

interface IdentityValue {
  readonly actor: Actor | null;
  readonly account: Account | null;
  readonly session: SessionState;
  readonly signIn: (email: string, password: string) => Promise<void>;
  readonly continueAsGuest: (name: string) => void;
  readonly signOut: () => Promise<void>;
}

const IdentityContext = createContext<IdentityValue | null>(null);

export function IdentityProvider({ children }: { readonly children: ReactNode }): JSX.Element {
  const [actor, setActorState] = useState<Actor | null>(remembered);
  const [account, setAccount] = useState<Account | null>(null);
  const [session, setSession] = useState<SessionState>('checking');

  const setActor = useCallback((next: Actor | null) => {
    remember(next);
    setActorState(next);
  }, []);

  useEffect(() => {
    let live = true;
    auth
      .me()
      .then(({ account: found }) => {
        if (!live) return;
        setAccount(found);
        setSession(found ? 'signed-in' : 'signed-out');
        // Adopt, never override: a name somebody typed for this browser stays theirs.
        if (found) {
          setActorState((current) => {
            if (current) return current;
            const adopted: Actor = { id: found.accountId, name: found.name, ...(found.licence ? { licence: found.licence } : {}) };
            remember(adopted);
            return adopted;
          });
        }
      })
      .catch((e: unknown) => {
        if (!live) return;
        const status = (e as { status?: number }).status ?? 500;
        setSession(status < 500 ? 'signed-out' : 'offline');
      });
    return () => {
      live = false;
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { account: found } = await auth.login({ email, password });
      setAccount(found);
      setSession('signed-in');
      setActor({ id: found.accountId, name: found.name, ...(found.licence ? { licence: found.licence } : {}) });
    },
    [setActor],
  );

  const continueAsGuest = useCallback(
    (name: string) => setActor({ id: guestKey(), name: name.trim() }),
    [setActor],
  );

  const signOut = useCallback(async () => {
    // Cleared even if the call fails: a reader walking away from a shared machine
    // must not be left looking signed in because the network dropped.
    try {
      if (session === 'signed-in') await auth.logout();
    } finally {
      setAccount(null);
      setSession('signed-out');
      setActor(null);
    }
  }, [session, setActor]);

  const value = useMemo<IdentityValue>(
    () => ({ actor, account, session, signIn, continueAsGuest, signOut }),
    [actor, account, session, signIn, continueAsGuest, signOut],
  );
  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>;
}

export function useIdentity(): IdentityValue {
  const v = useContext(IdentityContext);
  if (!v) throw new Error('useIdentity outside IdentityProvider');
  return v;
}
