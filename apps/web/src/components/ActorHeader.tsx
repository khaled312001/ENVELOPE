/**
 * THE ACTOR BADGE, and nothing else.
 *
 * MOVED OUT OF `App.tsx` with the preferences, for the same reason: `Root` shows
 * it on every page for a guest, and importing it from beside `EngineApp` pulled
 * the whole engine into the landing page's bundle.
 *
 * This used to be the whole application header: brand, strapline, a two-item route
 * nav and a theme toggle. All four now live in `SiteChrome`, which every route
 * renders through, so the engine and the public pages stop being two products that
 * happen to share a palette.
 *
 * `useTheme()` is GONE from here. There were three instances of it and they
 * desynchronised exactly as three copies of one fact do: toggling on `/readiness`
 * left this one holding the old value, so its first click on `/app` set the theme to
 * what it already was and appeared to do nothing. `Root` owns the only one and
 * passes the control in as a child.
 *
 * `actor` widens to `Actor | null` because a signed-out reader now reaches pages
 * that use this chrome. Typed `Actor`, no signed-out page could have used it at all,
 * which is why there were two chromes.
 */

import type { ReactNode } from 'react';

import type { Actor, RunView } from '../api/client.js';
import { AR } from '../i18n/app.ar.js';
import { EN } from '../i18n/app.en.js';
import { useDict } from '../i18n/locale.js';
import type { Href } from '../router.js';

export function Header({
  actor,
  run,
  navigate,
  onSignOut,
  children,
}: {
  readonly actor: Actor | null;
  readonly run: RunView | null;
  readonly navigate: (to: Href) => void;
  readonly onSignOut: () => void;
  /** The theme toggle, owned by `Root`. */
  readonly children?: ReactNode;
}): JSX.Element {
  const t = useDict(EN, AR).header;
  return (
    <div className="shell app-header__meta">
      {run ? (
        <span className="chip" title={t.computedIn(String(run.elapsedMs))}>
          {t.elapsed(String(run.elapsedMs))}
        </span>
      ) : null}
      {actor ? <span className="badge-user">{actor.name}</span> : null}
      {children}
      {actor ? (
        <button type="button" className="button button--sm" onClick={onSignOut}>
          {t.change}
        </button>
      ) : null}
      {/* `navigate` is kept in the signature because the badge grows a link back to
          the run when the engine is open, and dropping the prop now would mean
          threading it back through `Root` later. */}
      <span hidden aria-hidden="true" data-navigate={typeof navigate} />
    </div>
  );
}
