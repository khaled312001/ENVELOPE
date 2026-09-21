/**
 * THE ROUTE RECORD WITHOUT THE COMPONENT — and the split is a repair, not a tidy-up.
 *
 * `pages.tsx` imports every screen. Three of those screens import `SiteChrome` for
 * its drawn mark set, and `SiteChrome` builds the nav and the footer sitemap out of
 * the route record — so `pages → screen → SiteChrome → pages` was a cycle, and a
 * cycle is only ever as safe as the order it is entered from. Entered at
 * `pages.tsx` — which is what `not-found.test.tsx` and `route-coverage.test.ts` do,
 * and what any entry point wanting a title before a render would do — `SiteChrome`'s
 * module body ran while `PAGES` was still in its temporal dead zone, and
 * `PAGES['/']` threw `Cannot read properties of undefined`. Two suites failed to
 * COLLECT, so their assertions never ran and their result was unknown rather than
 * green; every other suite entered the cycle at a screen, `pages.tsx` finished
 * first, and the defect was invisible.
 *
 * DEFERRING THE READ TO RENDER TIME WOULD HAVE FIXED THE SYMPTOM AND LEFT THE CYCLE
 * STANDING. Four test files already carried comments saying that import order is
 * load-bearing here and naming the repair as somebody else's to make. A module graph
 * whose correctness depends on which file a runner happens to open first is a
 * property no test can hold in place, so the record splits instead: this module
 * imports `routes.json` and the `Route` type and NOTHING ELSE, `pages.tsx` adds the
 * components on top of it, and nothing that renders chrome has to import a screen in
 * order to learn a nav label. There is no cycle left to enter from the wrong end.
 *
 * The `Route` typing survives the split — the reason `NotFound.tsx` gave for not
 * reading `routes.json` directly — because the record below is still keyed by
 * `Route`, and a page that is not in the tuple is still a compile error.
 */

import ROUTE_DATA from './routes.json' with { type: 'json' };
import type { Route } from './router.js';

/**
 * Everything about a page that is not the page: what the tab says, what a social
 * card says, what the nav and the footer call it, and which column it sits in.
 */
export interface PageMeta {
  /** Becomes `document.title`. Every route reported the same one before this. */
  readonly title: string;
  /** `og:description` too — untested public copy otherwise, and social copy is public copy. */
  readonly description: string;
  /**
   * TWO LABELS, NOT ONE, because the same route gets different names in the two
   * places and both are right: "Readiness" in a nav bar, "Deployment readiness" in
   * a footer column that has room to say it. `navLabel` is null for a route the nav
   * does not name — `/` is reached by the mark, and `/app` is the [Run a plot]
   * button rather than a link.
   *
   * One field would have sent both label sets back into hand-typed lists inside the
   * chrome, which is the exact problem this record exists to end.
   */
  readonly navLabel: string | null;
  readonly footerLabel: string;
  readonly nav: 'primary' | 'footer-only';
  readonly group: 'claim' | 'product' | 'method' | 'reference';
  /** Only `/app`. Everything else is readable without a name. */
  readonly needsActor: boolean;
  /**
   * WHETHER THIS PAGE'S BODY HAS BEEN TRANSLATED — declared, not inferred.
   *
   * The chrome is Arabic on every route; the screens are not, because a screen is
   * translated one at a time by one author. There is no runtime way to ask a
   * component whether it reached for a dictionary, so the fact is recorded beside
   * the route rather than guessed at, and `SiteChrome` reads it to do two things a
   * reader is owed: say, in Arabic, that the body below is still English, and set
   * `dir="ltr" lang="en"` on `<main>` so that English prose is not laid out
   * right-to-left with its full stops migrated to the wrong end of every line.
   *
   * Without the second half this is not a cosmetic gap. `/work`'s lede rendered as
   * `.a column` and `/refusals`'s as `.kept` — the sentence's own punctuation moved
   * to the head of the line, which is the same defect `Verbatim` exists to prevent
   * for a citation, at paragraph scale.
   *
   * A route flipped to `translated` while its screen still holds English strings
   * would silence the notice, so this field goes with the screen's dictionary in
   * the same change, never ahead of it.
   */
  readonly arabic: 'translated' | 'untranslated';
}

type RouteRecord = PageMeta & { readonly path: Route };

export const PAGE_META: Record<Route, PageMeta> = Object.fromEntries(
  (ROUTE_DATA as readonly RouteRecord[]).map((r) => [
    r.path,
    {
      title: r.title,
      description: r.description,
      navLabel: r.navLabel,
      footerLabel: r.footerLabel,
      nav: r.nav,
      group: r.group,
      needsActor: r.needsActor,
      arabic: r.arabic,
    },
  ]),
) as Record<Route, PageMeta>;

/**
 * The 404's own metadata, deliberately OUTSIDE `PAGE_META`.
 *
 * `NOT_FOUND` is not in `ROUTES` — that is what keeps it out of the nav, the footer
 * sitemap and the smoke walk — so `Record<Route, PageMeta>` has nowhere to hold its
 * title or its description. It gets a constant instead of a place in the record,
 * which is one line and keeps the sentinel a sentinel.
 */
export const NOT_FOUND_META: PageMeta = {
  title: 'That page is not here — TOP.ai',
  description: 'There is no page at this address, and nothing has been substituted for it.',
  navLabel: null,
  footerLabel: 'That page is not here',
  nav: 'footer-only',
  group: 'reference',
  needsActor: false,
  /* `NotFound.tsx` reaches for no dictionary, so the notice is owed here too. */
  arabic: 'untranslated',
};
