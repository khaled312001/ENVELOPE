/**
 * Flat routes, and still no router dependency.
 *
 * The condition this file set for its own replacement was "a fourth route that
 * needs params or nesting". More routes arrived; params and nesting did not.
 * Every route is a flat literal, nothing loads data on navigation, and there are
 * no nested outlets — so a library would buy loaders, actions and outlets we do
 * not use, at roughly 15 kB and a new runtime dependency, in exchange for a
 * lookup in a record. It stays. (No count in this sentence on purpose: the number
 * in the tuple is the number, and a docblock that repeats it is a second copy to
 * keep in step.)
 *
 * A route is a *path*. The query and the hash are not part of it and are not in
 * `Route`: `/app?step=parking` and `/app` are the same page in different states,
 * and conflating them puts `PAGES[route] === undefined` one careless `split` away.
 *
 * What did have to change is that an unrecognised path used to be *coerced* to
 * `/`, so `/pricing` rendered the landing page while the address bar kept the
 * wrong path. On a product whose whole proposition is that nothing is quietly
 * substituted, quietly substituting a page is the one bug this file may not have.
 * Hence `NOT_FOUND`, which is a sentinel rather than a route: it has no URL of its
 * own, because a 404 must keep the address the visitor asked for.
 *
 * What it does have to get right is the History API, because the alternative —
 * hash routing — puts `#` in a URL somebody will paste into an email to a client.
 * Vite's dev server and any static host with a SPA fallback serve `index.html` for
 * every path, which is also what makes the 404 ours to render rather than the
 * host's.
 */

import { useCallback, useEffect, useState } from 'react';

/**
 * ONLY ROUTES THAT ARE BUILT ENTER THIS TUPLE.
 *
 * The site map drafts ten. Five are built. A route in the union that renders
 * nothing is a dead link in the generated footer sitemap and a lie in the 404's
 * own site list — both of which enumerate this tuple — so the five that are not
 * built stay out of it until the day they land.
 */
export const ROUTES = [
  '/',
  '/parking',
  '/exports',
  '/refusals',
  '/app',
  '/work',
  '/settings',
  '/dashboard',
] as const;
export type Route = (typeof ROUTES)[number];

/**
 * Not a route. A route renders *at* a URL; this renders *instead of* one, and the
 * URL stays whatever the visitor typed. Keeping it out of `ROUTES` is what stops
 * it appearing in the nav, the footer sitemap and the smoke walk, all of which
 * enumerate `ROUTES`.
 */
export const NOT_FOUND = 'NOT_FOUND' as const;
export type Location = Route | typeof NOT_FOUND;

/**
 * Anything `navigate` or `<Link to>` accepts: a route, optionally with a query
 * and/or a hash.
 *
 * Two arms are enough. `` `${Route}?${string}` `` swallows a trailing hash as
 * well, because `${string}` does not stop at `#`. Every CTA on this site is a
 * query — `/app?demo=worked-example`, `/app?step=parking` — and a `Route`-only
 * type would have rejected all of them at compile time or, worse, let a
 * `to.split('#')` write the whole string into `pushState` and store a value that
 * is not in `ROUTES`. That is a crash, not a 404, and only an in-app click would
 * have triggered it: a pasted URL works either way because `currentRoute()` reads
 * `pathname`.
 */
export type Href = Route | `${Route}?${string}` | `${Route}#${string}`;

export function currentRoute(): Location {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  return (ROUTES as readonly string[]).includes(path) ? (path as Route) : NOT_FOUND;
}

/**
 * Scroll to an `#anchor`, or to the top when there is none.
 *
 * Deferred a frame because the target does not exist until React has committed
 * the new route, and `scrollIntoView` on an absent element is a silent no-op —
 * which is how an in-page link followed from another route lands at the top of the
 * page and looks like it did nothing.
 */
function restoreScroll(hash: string): void {
  const run = (): void => {
    const id = hash.replace(/^#/, '');
    const target = id ? document.getElementById(id) : null;
    if (target) target.scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
  else run();
}

/** Split an `Href` into its three parts. Path first, so it is never guessed. */
function parts(to: Href): { path: Route; search: string; hash: string } {
  const m = /^([^?#]*)(\?[^#]*)?(#.*)?$/.exec(to);
  return { path: (m?.[1] ?? '/') as Route, search: m?.[2] ?? '', hash: m?.[3] ?? '' };
}

export function useRouter(): {
  readonly route: Location;
  /**
   * The live query string, `?step=parking` and all.
   *
   * Returned as STATE rather than read off `window` by whoever needs it, because
   * `EngineApp` mounts once and stays mounted (see `Root`): a `location.search`
   * read on mount never re-runs, so a click from `/parking` to `/app?step=parking`
   * would open whatever step was already showing.
   */
  readonly search: string;
  readonly navigate: (to: Href) => void;
} {
  const [route, setRoute] = useState<Location>(currentRoute);
  const [search, setSearch] = useState<string>(() => window.location.search);

  useEffect(() => {
    // Back and forward have to work. A single-page app that breaks the back
    // button is a page people stop trusting for reasons they cannot name.
    // The hash and the query go with them: `back` out of
    // `/refusals#not-on-this-site` has to land where it was, not at the top of
    // the previous page.
    const onPop = (): void => {
      setRoute(currentRoute());
      setSearch(window.location.search);
      restoreScroll(window.location.hash);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: Href) => {
    const { path, search: nextSearch, hash } = parts(to);
    // Same route, same query, same hash: this used to early-return, which meant
    // clicking the masthead while already on `/` did nothing at all — not even
    // the scroll to top a reader clicking a masthead is asking for. Now the
    // history entry is skipped and the scroll still happens.
    if (
      path === currentRoute() &&
      nextSearch === window.location.search &&
      hash === window.location.hash
    ) {
      restoreScroll(hash);
      return;
    }
    window.history.pushState({}, '', `${path}${nextSearch}${hash}`);
    setRoute(path);
    setSearch(nextSearch);
    restoreScroll(hash);
  }, []);

  return { route, search, navigate };
}

/**
 * An anchor that navigates without a reload.
 *
 * A real `<a href>`, not a button styled as a link: middle-click, ⌘-click and
 * "copy link address" all have to work, and they only do if the browser can see
 * a URL. The click handler is an optimisation over that, not a replacement for
 * it — modified clicks are left to the browser.
 */
export function Link({
  to,
  navigate,
  className,
  children,
  ...rest
}: {
  readonly to: Href;
  readonly navigate: (to: Href) => void;
  readonly className?: string | undefined;
  readonly children: React.ReactNode;
  readonly 'aria-current'?: 'page' | undefined;
  readonly onClick?: (() => void) | undefined;
}): JSX.Element {
  const { onClick, ...aria } = rest;
  return (
    <a
      href={to}
      {...(className !== undefined ? { className } : {})}
      {...aria}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        onClick?.();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}
