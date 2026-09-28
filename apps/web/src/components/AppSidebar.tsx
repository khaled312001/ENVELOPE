/**
 * The workspace rail — the account's own pages, beside the page rather than above
 * it.
 *
 * ---------------------------------------------------------------------------
 * WHY THE TOP NAV STAYS.
 *
 * Every product in this category puts authoring on the left and reporting on the
 * right, with a top bar for global context, and it is tempting to read that as
 * "replace the nav with a sidebar". `Root.tsx` records what happened the last time
 * this application had its own chrome: the engine was a separate document, so a
 * reader who clicked "Run a plot" left the site and could not re-read the claim
 * statement without losing the run. The masthead's `REGULATORY VALIDITY — NOT
 * ASSESSED` went with it.
 *
 * So the rail ADDS. The masthead, the nav and the colophon are unchanged and still
 * render on every route, and `SiteChrome` still owns the skip link and the single
 * `#main`. What arrives is a second navigation region, named separately, holding
 * the routes an account owns.
 *
 * ---------------------------------------------------------------------------
 * IT LISTS ONLY ROUTES THAT EXIST.
 *
 * Built from `PAGE_META` where `shell === 'workspace'`, in `ROUTES` order. A rail
 * with a greyed "Members (soon)" under it would be a promise with a date attached,
 * which `site-map.md` refuses for the footer and refuses here for the same reason.
 * When a workspace page lands it lands in `routes.json` and appears here; until
 * then it is absent rather than disabled.
 *
 * ---------------------------------------------------------------------------
 * THE ACTIVE STATE IS NOT A COLOUR.
 *
 * `aria-current="page"` carries it for a screen reader, and the stylesheet draws a
 * 3px inline-start border as well as a ground. Two of the products surveyed mark
 * the current item with colour alone; that fails WCAG 1.4.1, and here it would also
 * be spending an attention channel that §13.1 reserves.
 *
 * NO AMBER ANYWHERE IN THIS COMPONENT. A rail is the most-repeated element on a
 * signed-in page, and amber means `ASSUMED`.
 */

import { useT } from '../i18n/locale.js';
import { PAGE_META } from '../page-meta.js';
import { Link, ROUTES, type Href, type Location, type Route } from '../router.js';

/** The workspace routes, in the order the route record declares them. */
const WORKSPACE: readonly Route[] = ROUTES.filter((r) => PAGE_META[r].shell === 'workspace');

export function AppSidebar({
  route,
  navigate,
  /**
   * The account's own name, when there is one.
   *
   * Absent for a guest, and the rail says so in words rather than showing an empty
   * slot: a guest's identity is a random key held in one browser, and a rail that
   * looked identical signed in and signed out would be the one place on this site
   * that hid which of the two you are.
   */
  accountName,
}: {
  readonly route: Location;
  readonly navigate: (to: Href) => void;
  readonly accountName?: string | undefined;
}): JSX.Element {
  const t = useT();
  return (
    <nav className="sidebar" aria-label={t.rail.label}>
      {/*
        AN INNER WRAPPER, AND IT IS NOT A DIV FOR STYLING'S SAKE.

        The rail carries the rule that separates it from the page, and that rule has
        to run the height of the page — a border on a short sticky element stops
        where the list stops, which drew a vertical line ending two thirds of the
        way down a screenshot and reading as an unfinished layout. So `<nav>`
        stretches the grid row and owns the border, and this element is the part
        that sticks.
      */}
      <div className="sidebar__inner">
        <p className="sidebar__eyebrow">{t.rail.heading}</p>
        <ul className="sidebar__list">
          {WORKSPACE.map((r) => (
            <li key={r}>
              <Link
                to={r}
                navigate={navigate}
                className="sidebar__item"
                {...(route === r ? { 'aria-current': 'page' as const } : {})}
              >
                {t.routes[r].footerLabel}
              </Link>
            </li>
          ))}
        </ul>

        {/*
          THE FOOT OF THE RAIL SAYS WHO THIS IS, and for a guest it says what a
          guest is. `/refusals` carries the full sentence; this is the short form,
          in the place a reader is most likely to wonder.
        */}
        <div className="sidebar__who">
          {accountName ? (
            <>
              <span className="sidebar__who-label">{t.rail.signedInAs}</span>
              <span className="sidebar__who-name">{accountName}</span>
            </>
          ) : (
            <p className="sidebar__guest">{t.rail.guest}</p>
          )}
        </div>
      </div>
    </nav>
  );
}
