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

import REDIRECT_DATA from './redirects.json' with { type: 'json' };

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
  '/sign-in',
  '/sign-up',
  '/settings',
  '/readiness',
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

/**
 * What every screen is handed to move the address bar.
 *
 * Named so the one caller that passes `{ replace: true }` can say so in a type
 * rather than widening its own prop and drifting from this signature.
 */
export type Navigate = (to: Href, options?: { readonly replace?: boolean }) => void;

/**
 * Paths that have MOVED, and the route each one moved to.
 *
 * ---------------------------------------------------------------------------
 * A RENAME WITHOUT ONE OF THESE IS A LINK ROT EVENT WITH A GOOD EXPLANATION.
 *
 * `/dashboard` became `/readiness` because the page reports what is NOT READY in
 * a deployment and has never been a dashboard — `site-map.md` already warned it
 * must never be named in a way that implies it monitors uptime, and `dashboard`
 * is the word a reader reaches for when they mean exactly that. But the old path
 * is in a user guide that has been delivered, in the client's browser history and
 * in whatever he has already sent on. None of that is ours to break.
 *
 * IT IS A 301 IN PRODUCTION, and this is the fallback. `scripts/deploy/build.mjs`
 * reads the same file and writes a permanent redirect into `.htaccess`, so a
 * reader on the live site never loads the application to be told where to go. The
 * code below is what happens in development, where Vite serves `index.html` for
 * every path and there is no Apache to do it — and on the day a host's rewrite
 * rules are wrong, which is not a day the address should 404.
 *
 * NOT IN `ROUTES`. A redirect is not a page: putting it there would give it a nav
 * entry, a footer link, a sitemap row and a smoke walk, all pointing at somewhere
 * that immediately sends the reader elsewhere.
 */
export const REDIRECTS: Readonly<Record<string, Route>> = REDIRECT_DATA as Readonly<
  Record<string, Route>
>;

/** The path a URL should be at: itself, or where it moved to. */
function resolve(path: string): string {
  return REDIRECTS[path] ?? path;
}

export function currentRoute(): Location {
  const path = resolve(window.location.pathname.replace(/\/+$/, '') || '/');
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
  /**
   * `replace` rewrites the current history entry instead of adding one.
   *
   * There is one caller and one reason. `/app?demo=worked-example` is an
   * *instruction*, not a place: the flow reads it, fills the worked example in and
   * moves to the plot step. Pushing that move would leave the instruction sitting
   * in history, so Back would re-run it — the reader would press Back expecting
   * the landing page and get handed the demo again, once per press. Replacing it
   * means the address ends up naming where they are, and Back goes where they came
   * from.
   */
  readonly navigate: (to: Href, options?: { readonly replace?: boolean }) => void;
} {
  const [route, setRoute] = useState<Location>(currentRoute);
  const [search, setSearch] = useState<string>(() => window.location.search);

  /*
    THE ADDRESS IS CORRECTED, NOT ONLY THE RENDER.

    `currentRoute` resolves a moved path, so `/dashboard` already DRAWS the
    readiness page. Left there, the address bar would keep saying `/dashboard`
    while the page said `/readiness` — which is the defect the 404 exists to
    refuse, arrived at from the other direction: an address that names a page the
    reader is not looking at. Anyone who then copied the URL would pass on the
    dead one.

    `replaceState`, not `pushState`: the moved path is not a place to go Back to.
  */
  useEffect(() => {
    const from = window.location.pathname.replace(/\/+$/, '') || '/';
    const to = REDIRECTS[from];
    if (to !== undefined) {
      window.history.replaceState({}, '', `${to}${window.location.search}${window.location.hash}`);
    }
  }, []);

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

  const navigate = useCallback((to: Href, options?: { readonly replace?: boolean }) => {
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
    const url = `${path}${nextSearch}${hash}`;
    if (options?.replace === true) window.history.replaceState({}, '', url);
    else window.history.pushState({}, '', url);
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
