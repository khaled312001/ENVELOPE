/**
 * ONE SESSION, OWNED IN ONE PLACE — the third thing `Root` owns, after the theme
 * and the locale, and for the same reason both of those give.
 *
 * The state has FOUR values, not two, and the fourth is the one that matters:
 *
 *   'checking'  — /api/auth/me is in flight and we do not yet know
 *   'signed-in' — an account
 *   'signed-out'— no account
 *   'offline'   — the question could not be asked
 *
 * Collapsing `checking` into `signed-out` is the defect this shape exists to
 * prevent. Every page asks who the reader is on load; if "not yet known" renders as
 * "not signed in", a signed-in reader sees the sign-in prompt flash on every
 * navigation, and — worse — an autosave that fires during that window is a write
 * attributed to nobody.
 *
 * `offline` is separate from `signed-out` for the same class of reason. The API
 * being unreachable is not evidence that the reader has no account, and telling
 * them to sign in when the server is down sends them to a form that cannot work.
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

import { auth, AuthFailure, type Account } from './api/auth.js';

export type SessionState = 'checking' | 'signed-in' | 'signed-out' | 'offline';

interface SessionValue {
  readonly state: SessionState;
  readonly account: Account | null;
  readonly signIn: (email: string, password: string) => Promise<void>;
  readonly signUp: (input: {
    email: string;
    password: string;
    name: string;
    licence?: string;
  }) => Promise<void>;
  readonly signOut: () => Promise<void>;
  readonly refresh: () => Promise<void>;
  /**
   * Change the name and the licence, and update the local copy in the same call.
   *
   * IT LIVES HERE RATHER THAN ON THE PAGE for the reason `setActor` lives on
   * `Root`: the account name is rendered in three places at once — the rail, the
   * header badge and the settings form — and a page that called the API directly
   * would change the row while every other copy of the name went on showing the
   * old one until a reload.
   */
  readonly updateProfile: (input: { name: string; licence: string }) => Promise<void>;
  /** Change the password. Every other device is signed out; this one is not. */
  readonly changePassword: (input: { current: string; next: string }) => Promise<void>;
}

const SessionContext = createContext<SessionValue>({
  state: 'signed-out',
  account: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refresh: async () => {},
  updateProfile: async () => {},
  changePassword: async () => {},
});

export function SessionProvider({ children }: { readonly children: ReactNode }): JSX.Element {
  const [state, setState] = useState<SessionState>('checking');
  const [account, setAccount] = useState<Account | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { account: found } = await auth.me();
      setAccount(found);
      setState(found ? 'signed-in' : 'signed-out');
    } catch (e) {
      /*
        A 4xx from `/api/auth/me` is an answer — it means signed out. Anything else
        is the question failing to be asked, which is a different state and must not
        be reported as "you have no account".
      */
      setAccount(null);
      setState(e instanceof AuthFailure && e.status < 500 ? 'signed-out' : 'offline');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { account: found } = await auth.login({ email, password });
    setAccount(found);
    setState('signed-in');
  }, []);

  const signUp = useCallback(
    async (input: { email: string; password: string; name: string; licence?: string }) => {
      const { account: found } = await auth.register(input);
      setAccount(found);
      setState('signed-in');
    },
    [],
  );

  const signOut = useCallback(async () => {
    /*
      THE LOCAL STATE IS CLEARED EVEN IF THE CALL FAILS.

      A sign-out that leaves the reader looking signed in because the network
      dropped is the worst possible outcome of this button: they walk away from a
      shared machine believing they are out. The server row is what actually
      matters and the request is still made; what changes is that the UI does not
      wait for permission to stop showing someone else's name.
    */
    try {
      await auth.logout();
    } finally {
      setAccount(null);
      setState('signed-out');
    }
  }, []);

  const updateProfile = useCallback(async (input: { name: string; licence: string }) => {
    const { account: saved } = await auth.updateProfile(input);
    setAccount(saved);
  }, []);

  /*
    THE PASSWORD CHANGE DOES NOT TOUCH `account`, AND THAT IS THE POINT.

    Nothing about the account's public fields changes, so re-setting them would
    only re-render three screens for no reason. What DOES change is every other
    session — the server destroys them and hands this device a fresh cookie, which
    the browser stores without anything here doing so.
  */
  const changePassword = useCallback(async (input: { current: string; next: string }) => {
    await auth.changePassword(input);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ state, account, signIn, signUp, signOut, refresh, updateProfile, changePassword }),
    [state, account, signIn, signUp, signOut, refresh, updateProfile, changePassword],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  return useContext(SessionContext);
}
