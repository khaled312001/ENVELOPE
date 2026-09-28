/**
 * The route record plus the one thing JSON cannot hold: the component.
 *
 * THE SPLIT IS THE POINT. `scripts/smoke.mjs` and `scripts/shoot.mjs` are plain
 * `.mjs` run by `node`; this module holds JSX and imports every screen, so neither
 * script can import it. Put the route metadata here and the two scripts go back to
 * hand-maintaining their own path lists — three lists of the same routes, which is
 * the defect that drifts first and drifts silently.
 *
 * So the DATA lives in `routes.json`, which Vite imports natively and `node` reads
 * with `readFileSync`, and this file adds the component. No loader, no build step,
 * no dependency.
 *
 * THE DATA IS NOW READ THROUGH `page-meta.ts` RATHER THAN OUT OF `routes.json`
 * DIRECTLY, and that indirection is load-bearing. Because this module imports every
 * screen, anything importing it transitively evaluates all of them — and three of
 * them import `SiteChrome`, which needs the nav labels. Reading the labels from here
 * made `pages → screen → SiteChrome → pages` a cycle that threw when it was entered
 * at this file. `page-meta.ts` holds everything but the component and imports no
 * screen, so the chrome takes its labels from there and the cycle is gone. See that
 * file's docblock for what the cycle actually did.
 */

import type { DashboardView } from './api/client.js';
/* `i18n/locale.js` reaches `chrome.en.js`, which reaches `content/shared.js`,
   `routes.json` and a TYPE-ONLY `router.js`. Nothing on that path imports a screen,
   so this adds no edge back into the cycle `page-meta.ts` exists to have broken. */
import { useT } from './i18n/locale.js';
import { NOT_FOUND_META, PAGE_META, type PageMeta } from './page-meta.js';
import type { PageProps } from './Root.js';
import type { Route } from './router.js';
import Antechamber from './screens/Antechamber.js';
import { Dashboard, DashboardPanels } from './screens/Dashboard.js';
import Exports from './screens/Exports.js';
import { Landing } from './screens/Landing.js';
import NotFound from './screens/NotFound.js';
import Parking from './screens/Parking.js';
import SNAPSHOT from './screens/readiness.json' with { type: 'json' };
import Refusals from './screens/Refusals.js';
import { SignIn, SignUp } from './screens/Auth.js';
import Settings from './screens/Settings.js';
import Work from './screens/Work.js';

export interface PageSpec extends PageMeta {
  readonly component: (p: PageProps) => JSX.Element;
}

const COMPONENTS: Readonly<Record<Route, (p: PageProps) => JSX.Element>> = {
  '/': (p) => <Landing navigate={p.navigate} />,
  '/parking': Parking,
  '/exports': Exports,
  '/refusals': Refusals,
  '/app': Antechamber,
  '/work': Work,
  '/sign-in': SignIn,
  '/sign-up': SignUp,
  '/settings': Settings,
  /* `/dashboard` DISPATCHES ABOVE THE ACTOR CHECK — see `DashboardRoute` below,
     which is a named component rather than an inline arrow because it reads the
     page heading out of the locale and an inline arrow cannot hold a hook. */
  '/dashboard': (p) => <DashboardRoute {...p} />,
};

/**
 * `/dashboard`'s own opening, lifted out of the record so it can hold a hook.
 *
 * `DashboardPanels` opens on an `<h2>`, so this route shipped with no `<h1>` at all
 * — a heading level skipped at the top of the document, on the page a reader is
 * most likely to have forwarded to them. It is here rather than in `Dashboard.tsx`
 * because that component is a panel set reused by both the live and the snapshot
 * paths, and neither of them is "the page".
 *
 * THE HEADING IS READ FROM THE ROUTE RECORD, WHICH IS WHAT ITS FIRST COMMENT ALREADY
 * CLAIMED. It was typed instead, and the cost of that showed up the moment the
 * chrome learnt Arabic: every panel below rendered in Arabic under an English `<h1>`,
 * which is the largest string on the page. `t.routes['/dashboard'].footerLabel` is
 * "Deployment readiness" in English — the same characters, from the record the
 * footer and the tab title already use — and «جاهزية النشر» in Arabic.
 *
 * With an actor it fetches live from the deployment the reader is connected to.
 * Without one it renders a dated snapshot generated at build time by
 * `scripts/verify-readiness.mjs` — the same, already-pure panels, so there is no
 * second implementation of a page of numbers.
 *
 * It does NOT fabricate an actor to reach the API. Putting an invented name into
 * the identity chain of a product whose identity badge is load-bearing is the one
 * failure this site cannot survive, and the snapshot exists precisely so that it
 * never has to. Two of the landing page's calls to action used to land a visitor on
 * "Who is running this?", which asks for identity before giving anything.
 */
function DashboardRoute(p: PageProps): JSX.Element {
  const t = useT();
  return (
    <div className="db">
      <section className="shell section section--opening">
        <h1>{t.routes['/dashboard'].footerLabel}</h1>
      </section>
      {p.actor ? (
        <Dashboard actor={p.actor} navigate={p.navigate} />
      ) : (
        <DashboardPanels data={SNAPSHOT as DashboardView} navigate={p.navigate} />
      )}
    </div>
  );
}

export const PAGES: Record<Route, PageSpec> = Object.fromEntries(
  Object.entries(PAGE_META).map(([path, meta]) => [
    path,
    { ...meta, component: COMPONENTS[path as Route] },
  ]),
) as Record<Route, PageSpec>;

/**
 * The 404's own spec, deliberately OUTSIDE `PAGES` — see `NOT_FOUND_META`, whose
 * docblock carries the reason. This file adds the component and nothing else.
 */
export const NOT_FOUND_PAGE: PageSpec = { ...NOT_FOUND_META, component: NotFound };
