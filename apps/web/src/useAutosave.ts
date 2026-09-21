/**
 * WHAT WAS TYPED SURVIVES THE TAB CLOSING.
 *
 * The request was "حفظ تلقائي للمدخلات لو الصفحه قفلت" — auto-save the inputs if the
 * page closes — and the second half is the hard half. A debounce alone does not do
 * it: a reader who types a setback and closes the tab two seconds later loses the
 * setback, because the timer never fired. Three mechanisms, each covering what the
 * others cannot:
 *
 *   1. A DEBOUNCED WRITE while they type. Covers the ordinary case and is the only
 *      one that runs often enough to keep the server copy fresh.
 *   2. A FLUSH ON `visibilitychange` TO HIDDEN. This is the one that actually
 *      catches a closed tab, and `beforeunload` is NOT used for it — on mobile
 *      Safari and on Android a tab is very often discarded without ever firing
 *      `beforeunload`, whereas `visibilitychange` fires when the app is
 *      backgrounded, which is the last moment anything is guaranteed to run.
 *   3. A MIRROR IN `localStorage`, written synchronously on every change. It is the
 *      only copy that exists when the network is down, when the reader is signed
 *      out, and in the milliseconds between a keystroke and a debounce.
 *
 * `keepalive: true` is what makes (2) survive the document being torn down: a
 * normal `fetch` is cancelled with the page, and a request cancelled mid-flight is
 * a draft that was reported saved and was not.
 *
 * ---------------------------------------------------------------------------
 * THE LOCAL MIRROR IS NOT A FALLBACK, IT IS THE FIRST COPY.
 *
 * Restoring prefers whichever is NEWER, not whichever is remote. A reader who typed
 * for a minute with no connection and came back has a local copy strictly better
 * than the server's, and "the server is authoritative" would throw their work away
 * to preserve a rule that serves nobody here. Drafts are not runs; §13.4's
 * immutability argument applies to what the engine computed, never to a half-filled
 * form.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { drafts } from './api/auth.js';

const LOCAL_PREFIX = 'envelope.draft.';

/** Milliseconds of quiet before a write. Long enough not to write per keystroke. */
const DEBOUNCE_MS = 1200;

export type SaveState = 'idle' | 'saving' | 'saved' | 'local-only' | 'error';

interface Stored<T> {
  readonly payload: T;
  readonly updatedAt: string;
}

function readLocal<T>(key: string): Stored<T> | null {
  try {
    const raw = localStorage.getItem(LOCAL_PREFIX + key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { payload, updatedAt } = parsed as Stored<T>;
    return typeof updatedAt === 'string' ? { payload, updatedAt } : null;
  } catch {
    /* Blocked storage, private mode, or a value from an older shape. */
    return null;
  }
}

function writeLocal<T>(key: string, value: Stored<T>): void {
  try {
    localStorage.setItem(LOCAL_PREFIX + key, JSON.stringify(value));
  } catch {
    /* A full or blocked store is not a reason to stop typing. */
  }
}

function clearLocal(key: string): void {
  try {
    localStorage.removeItem(LOCAL_PREFIX + key);
  } catch {
    /* as above */
  }
}

/**
 * The `keepalive` write, used when the page is going away.
 *
 * `fetch` rather than `navigator.sendBeacon`: a beacon cannot set a content type
 * that Fastify's JSON parser accepts without the route learning to parse
 * `text/plain`, and a route that accepts `text/plain` on an authenticated PUT is a
 * route that accepts a cross-site form post. The cost of keeping the content type
 * honest is one option.
 */
function flushBeacon<T>(key: string, payload: T): void {
  try {
    void fetch(`/api/drafts/${key}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ payload }),
      keepalive: true,
    }).catch(() => {
      /* The page is leaving; there is nobody left to tell. */
    });
  } catch {
    /* as above */
  }
}

export interface Autosave<T> {
  /**
   * FALSE UNTIL THE LOOKUP HAS ANSWERED, and a caller must not record before it.
   *
   * `recovered` is `null` in two completely different situations — there is no
   * draft, and we have not asked yet — and a caller that cannot tell them apart
   * writes the form’s defaults over a draft that is still in flight. That is not
   * hypothetical: it happened, and it presented as a "Restore it" button that did
   * nothing, because by the time it was pressed the stored draft was the defaults.
   *
   * A third state would have been the other answer. A boolean beside the value is
   * cheaper and it makes the guard readable at the call site.
   */
  readonly ready: boolean;
  /** Call on every change. Cheap: it writes locally and resets the debounce. */
  readonly record: (value: T) => void;
  /** A draft found on load that is newer than nothing, offered rather than applied. */
  readonly recovered: Stored<T> | null;
  /** The reader accepted the recovered draft; stop offering it. */
  readonly acceptRecovered: () => void;
  /** The reader declined it, or finished the form. Both copies go. */
  readonly discard: () => void;
  readonly state: SaveState;
  readonly savedAt: string | null;
}

export function useAutosave<T>(
  key: string,
  { enabled }: { enabled: boolean },
): Autosave<T> {
  const [state, setState] = useState<SaveState>('idle');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [recovered, setRecovered] = useState<Stored<T> | null>(null);
  const [ready, setReady] = useState(false);

  const latest = useRef<T | null>(null);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---- Load: whichever copy is newer, offered and never applied silently. ---- */
  useEffect(() => {
    let cancelled = false;
    const local = readLocal<T>(key);

    const settle = (chosen: Stored<T> | null) => {
      if (cancelled) return;
      setRecovered(chosen);
      setReady(true);
    };

    if (!enabled) {
      settle(local);
      return () => {
        cancelled = true;
      };
    }

    void drafts
      .get<T>(key)
      .then(({ draft }) => {
        if (!draft) return settle(local);
        if (!local) return settle({ payload: draft.payload, updatedAt: draft.updatedAt });
        settle(
          Date.parse(local.updatedAt) > Date.parse(draft.updatedAt)
            ? local
            : { payload: draft.payload, updatedAt: draft.updatedAt },
        );
      })
      .catch(() => settle(local));

    return () => {
      cancelled = true;
    };
  }, [key, enabled]);

  const push = useCallback(async () => {
    if (!dirty.current || latest.current === null) return;
    if (!enabled) {
      /* Signed out: the local mirror is the whole story, and the label says so
         rather than claiming a save that did not happen. */
      setState('local-only');
      return;
    }
    setState('saving');
    try {
      const { updatedAt } = await drafts.put(key, latest.current);
      dirty.current = false;
      setSavedAt(updatedAt);
      setState('saved');
    } catch {
      setState('error');
    }
  }, [key, enabled]);

  const record = useCallback(
    (value: T) => {
      latest.current = value;
      dirty.current = true;
      writeLocal(key, { payload: value, updatedAt: new Date().toISOString() });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void push(), DEBOUNCE_MS);
    },
    [key, push],
  );

  /* ---- The flush that actually catches a closed tab. ---- */
  useEffect(() => {
    const onHide = (): void => {
      if (document.visibilityState !== 'hidden') return;
      if (!dirty.current || latest.current === null || !enabled) return;
      if (timer.current) clearTimeout(timer.current);
      flushBeacon(key, latest.current);
      dirty.current = false;
    };
    document.addEventListener('visibilitychange', onHide);
    /*
      `pagehide` as well, and not instead: Safari fires it on a back-forward-cache
      eviction where `visibilitychange` has already been and gone. Two listeners,
      one guarded flush, and `dirty` makes the second a no-op.
    */
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, [key, enabled]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const acceptRecovered = useCallback(() => setRecovered(null), []);

  const discard = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    dirty.current = false;
    latest.current = null;
    clearLocal(key);
    setRecovered(null);
    setState('idle');
    setSavedAt(null);
    if (enabled) void drafts.remove(key).catch(() => {});
  }, [key, enabled]);

  return { record, recovered, ready, acceptRecovered, discard, state, savedAt };
}
