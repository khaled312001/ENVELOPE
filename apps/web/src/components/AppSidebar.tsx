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
 * THREE THINGS §5.2 OF THE PLAN SPECIFIES THAT THIS DOES NOT BUILD, each with
 * its reason, because a silently dropped requirement is indistinguishable from a
 * forgotten one.
 *
 * 1. **No workspace switcher.** It switches between organisations, and there are
 *    none — `CLAUDE.md` states that plainly and §6.4 of the plan makes it a rule:
 *    no screen ships before the server enforces what it displays. A switcher over
 *    one implicit workspace is a control that claims tenancy this deployment does
 *    not have, on the element a reader would trust most.
 *
 * 2. **The theme toggle stays in the top bar.** §5.2 puts it in the sidebar footer
 *    "and not also in the top bar", which follows from that plan's two separate
 *    shells. This codebase deliberately has ONE chrome plus a rail, so moving the
 *    toggle would make it a control that changes position depending on the route —
 *    worse than either option it was choosing between. It stays in one place on
 *    every page; `/settings` carries the deliberate second copy, because a
 *    settings page is where a person goes to look for a setting.
 *
 * 3. **No off-canvas drawer below 768px.** §5.1 asks for `translateX`, a backdrop,
 *    Esc and a focus trap — and in the same sentence for the shell to switch to
 *    `display: block` so an open drawer pushes content down rather than painting
 *    over it, which is the opposite arrangement. With three items the honest
 *    resolution is the second one: the rail becomes a horizontal row above the
 *    content, everything stays visible, and there is no backdrop, no trap and no
 *    Esc handler to get wrong. A drawer is what a twenty-item nav needs. When the
 *    workspace routes in §6.1 land, this is the decision to revisit.
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

/**
 * THE GLYPHS ARE DRAWN HERE, AND THAT IS A DECISION RATHER THAN AN OMISSION.
 *
 * The obvious move is an icon set, and the obvious failure is approximating its
 * path data from memory — a borrowed "settings" gear reproduced by hand becomes a
 * hamburger, and nothing in a stylesheet gate can see it.
 *
 * But the stronger reason is that this product's visual language IS a drawing
 * sheet: straight corners, no shadows, hairline rules, a mono label. Three marks
 * from a general-purpose icon set would be the one element on the page that came
 * from somewhere else. `image-prompts.md` already names the class — the road
 * symbols and every drawing of a plot are *draw in code, do not commission* — and
 * a nav glyph belongs to it.
 *
 * So each is a figure from the product's own subject matter:
 *
 *   engine    a plot outline with the chamfered corner an affection plan prints,
 *             which is also the vertex `access.ts` measures its 15 m from
 *   work      two sheets, offset — a set of runs, not a folder
 *   settings  two tracks with their stops in different places. Not a gear: a gear
 *             at 16px is four grey teeth and a hole.
 *
 * 16×16, 1.5px stroke, `currentColor`, and `aria-hidden` — the label beside it is
 * the accessible name, and it stays in the accessibility tree when the rail
 * collapses because it is hidden visually rather than removed.
 *
 * THE RECORD IS EXHAUSTIVE OVER `Route`, NOT PARTIAL, and the `null`s are the
 * point: a workspace route added without a glyph fails the build here, in the one
 * place that knows a collapsed rail would render it as an empty 44px box. A
 * `Partial` would compile and ship that box.
 */
const GLYPH: Readonly<Record<Route, JSX.Element | null>> = {
  '/': null,
  '/parking': null,
  '/exports': null,
  '/refusals': null,
  '/dashboard': null,
  '/sign-in': null,
  '/sign-up': null,
  '/app': (
    <>
      <path d="M2.5 4.5 L5.5 2.5 L13.5 2.5 L13.5 13.5 L2.5 13.5 Z" />
      <path d="M5.5 7.5 L10.5 7.5 M5.5 10.5 L10.5 10.5" />
    </>
  ),
  '/work': (
    <>
      <path d="M2.5 5.5 L9.5 5.5 L9.5 13.5 L2.5 13.5 Z" />
      <path d="M5.5 5.5 L5.5 2.5 L12.5 2.5 L12.5 10.5 L9.5 10.5" />
    </>
  ),
  '/settings': (
    <>
      <path d="M2.5 5.5 L13.5 5.5 M2.5 10.5 L13.5 10.5" />
      <path d="M5.5 3.5 L5.5 7.5 M10.5 8.5 L10.5 12.5" />
    </>
  ),
};

function Glyph({ route }: { readonly route: Route }): JSX.Element | null {
  const mark = GLYPH[route];
  if (!mark) return null;
  return (
    <svg
      className="sidebar__glyph"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      {mark}
    </svg>
  );
}

/** The chevron on the collapse control. It points the way the rail will move. */
function Caret({ collapsed }: { readonly collapsed: boolean }): JSX.Element {
  return (
    <svg
      className={collapsed ? 'sidebar__caret sidebar__caret--out' : 'sidebar__caret'}
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M10 3.5 L5.5 8 L10 12.5" />
    </svg>
  );
}

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
  collapsed,
  setCollapsed,
}: {
  readonly route: Location;
  readonly navigate: (to: Href) => void;
  readonly accountName?: string | undefined;
  readonly collapsed: boolean;
  readonly setCollapsed: (v: boolean) => void;
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
        <div className="sidebar__head">
          <p className="sidebar__eyebrow">{t.rail.heading}</p>
          {/*
            ONE BUTTON, AND IT SAYS WHICH WAY IT GOES.

            `aria-expanded` and not `aria-pressed`: this discloses a region rather
            than toggling a setting, and the two are announced differently. The
            accessible name changes with the state — "Collapse the rail" /
            "Expand the rail" — because a name that stayed the same would leave a
            screen-reader user to infer the direction from the state alone.

            It is hidden from the phone layout, where the rail is a horizontal row
            and there is nothing to collapse.
          */}
          <button
            type="button"
            className="sidebar__collapse"
            onClick={() => setCollapsed(!collapsed)}
            aria-expanded={!collapsed}
          >
            <Caret collapsed={collapsed} />
            <span className="sr-only">{collapsed ? t.rail.expand : t.rail.collapse}</span>
          </button>
        </div>

        <ul className="sidebar__list">
          {WORKSPACE.map((r) => (
            <li key={r}>
              <Link
                to={r}
                navigate={navigate}
                className="sidebar__item"
                {...(route === r ? { 'aria-current': 'page' as const } : {})}
                /*
                  THE NATIVE TOOLTIP, AND ONLY WHILE THE LABEL IS CLIPPED.

                  A collapsed rail is three unlabelled marks, and `title` is the one
                  way to name them that needs no JavaScript, survives a hover with a
                  keyboard focus, and is read by every assistive technology. It is
                  removed when the label is visible, because a tooltip repeating the
                  word next to it is noise in every screen reader that announces it.
                */
                {...(collapsed ? { title: t.routes[r].footerLabel } : {})}
              >
                <Glyph route={r} />
                {/*
                  The label is HIDDEN, never removed. `display: none` would take it
                  out of the accessibility tree and leave `aria-current="page"` on a
                  link with no name; clipping it keeps the name and gives the width
                  back to the canvas.
                */}
                <span className="sidebar__label">{t.routes[r].footerLabel}</span>
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
