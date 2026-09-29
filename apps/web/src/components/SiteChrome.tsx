/**
 * THE SHELL EVERY PAGE RENDERS INTO.
 *
 * It owns the skip link, the masthead, the nav, the single `<main id="main">` and
 * the colophon. No page component declares any of them, and that is not a
 * preference:
 *
 * `#main` HAS TO BE UNIQUE, AND UNDER THE ENGINE LATCH IT WOULD NOT HAVE BEEN.
 * `EngineApp` stays mounted in a `hidden` div beside whatever public page is
 * showing, so the moment two components each declared `id="main"` the skip link
 * would resolve to whichever came first in the document — usually the hidden one,
 * which is a skip link that focuses nothing a sighted keyboard user can see, and a
 * defect no screenshot and no unit test would show. `shared-content.test.tsx`
 * asserts exactly one `#main` in the document, engine mounted and unmounted.
 *
 * The nav, the footer sitemap and `document.title` are all generated from
 * `routes.json` through `PAGE_META`. Three hand-maintained lists of the same routes
 * is the defect that drifts first, and it drifts silently.
 */

import { useEffect, useId, useRef, useState } from 'react';

import { DISCLAIMER } from '../content/shared.js';
/*
  THE METADATA MODULE, NEVER `pages.tsx`. The chrome needs a nav label, a footer
  label and a column; it does not need a component, and importing the module that
  holds the components imports every screen in the product — three of which import
  this file back. That cycle threw at module scope and took two whole test suites
  down with it before they collected a single assertion. `page-meta.ts` carries the
  full account.
*/
import { useLocale, useT } from '../i18n/locale.js';
import { NOT_FOUND_META, PAGE_META, type PageMeta } from '../page-meta.js';
import { Link, ROUTES, type Href, type Location, type Route } from '../router.js';

/* ==========================================================================
 * THE MARK
 * ======================================================================= */

/**
 * The brand mark: a plot with its setback taken off.
 *
 * ITS INNER RECT IS `--accent` AND MUST NEVER BE `--uncertain`. Amber is reserved
 * exclusively for uncertainty, and a logo is the most-repeated element on a site —
 * teaching a reader that amber means nothing in particular is the one thing the
 * reservation exists to prevent. The favicon in `index.html` follows the same rule.
 */
export function Mark({ size = 30 }: { readonly size?: number }): JSX.Element {
  return (
    <svg className="lp-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" className="lp-mark__ground" />
      <rect x="7" y="7" width="18" height="18" className="lp-mark__plot" />
      <rect x="11" y="11" width="10" height="10" className="lp-mark__inner" />
    </svg>
  );
}

/* ==========================================================================
 * THE DRAWN MARK SET
 * ======================================================================= */

/**
 * Seven marks, drawn, in one optical box, from `currentColor`.
 *
 * NOT AN ICON PACKAGE AND NOT A DINGBAT, refused for the same reason from opposite
 * directions: a dependency is forbidden, and a dingbat is resolved by whatever face
 * the OS supplies. On Windows `U+26A0` commonly resolves through Segoe UI Emoji and
 * renders as a filled colour glyph at a different weight and baseline — which put a
 * rendering artefact inside the VARIANCE non-colour cue, on a trust signal.
 *
 * Every one is `aria-hidden`. The state is already in the text — ASSUMED, NOT
 * ASSESSED, NEVER CLAIMED — and a mark that announced itself would double every row
 * for a screen-reader user.
 *
 * A shape family, not a palette: NEVER CLAIMED is a square rather than a circle
 * because it is the one verdict that is not on the supported/partial/deferred
 * scale, and a different shape family says that before the colour does.
 */
export type MarkName =
  | 'assumed'
  | 'variance'
  | 'derived'
  | 'deferred'
  | 'user-set'
  | 'disabled'
  | 'never-claimed';

const MARK_PATHS: Readonly<Record<MarkName, JSX.Element>> = {
  /* A pencil. The one mark that must read at 14px on a photocopy, so the body is a
     plain wedge and the detail is one ferrule line. */
  assumed: (
    <>
      <path d="M2 14 L3 10.5 L10.5 3 L13 5.5 L5.5 13 Z" />
      <path d="M9.5 4 L12 6.5" />
    </>
  ),
  /* A wedge. This is the mark Segoe UI Emoji was repainting as a yellow-and-black
     colour glyph inside a red treatment. */
  variance: (
    <>
      <path d="M8 2 L15 14 L1 14 Z" />
      <path d="M8 6.5 L8 10" />
      <path d="M8 12 L8 12.01" />
    </>
  ),
  derived: <path d="M2.5 8.5 L6.5 12.5 L13.5 4" />,
  /* A hollow ring. Empty on purpose: the state IS an absence, and this is the only
     mark in the set with nothing inside it. */
  deferred: <circle cx="8" cy="8" r="5.5" />,
  /* A ringed dot. A named person put a value here: the ring is the field, the dot
     is the answer. */
  'user-set': (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <circle className="mark__ink" cx="8" cy="8" r="1.75" />
    </>
  ),
  disabled: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M4.1 11.9 L11.9 4.1" />
    </>
  ),
  'never-claimed': (
    <>
      <path d="M2.5 2.5 H13.5 V13.5 H2.5 Z" />
      <path d="M2.5 2.5 L13.5 13.5" />
      <path d="M13.5 2.5 L2.5 13.5" />
    </>
  ),
};

export function Glyph({ name }: { readonly name: MarkName }): JSX.Element {
  return (
    <svg className="mark" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {MARK_PATHS[name]}
    </svg>
  );
}

/* ==========================================================================
 * THE MASTHEAD
 * ======================================================================= */

/**
 * The deployment's own state, permanently, in the most-repeated position on the
 * site.
 *
 * This is the rare case where the premium editorial ornament and the product's
 * central refusal are the same element. `REGULATORY VALIDITY — NOT ASSESSED` never
 * drops, at any width; the two counts beside it do, because they are the items a
 * phone can afford to lose and that one is not.
 *
 * The counts are passed in rather than read here, so this component cannot become
 * the place where a figure is typed.
 */
export function Masthead({
  rulesApproved,
  definitionsSigned,
}: {
  readonly rulesApproved?: string | undefined;
  readonly definitionsSigned?: string | undefined;
}): JSX.Element {
  const t = useT();
  return (
    <div className="masthead">
      <div className="shell masthead__inner">
        {rulesApproved !== undefined ? (
          <dl className="masthead__item">
            <dt>{t.masthead.rulesApproved}</dt>
            <dd>{rulesApproved}</dd>
          </dl>
        ) : null}
        {definitionsSigned !== undefined ? (
          <dl className="masthead__item">
            <dt>{t.masthead.definitionsSigned}</dt>
            <dd>{definitionsSigned}</dd>
          </dl>
        ) : null}
        <p className="masthead__validity">
          <Glyph name="never-claimed" />
          {t.masthead.validity}
        </p>
      </div>
    </div>
  );
}

/* ==========================================================================
 * THE NAV
 * ======================================================================= */

const PRIMARY: readonly Route[] = ROUTES.filter(
  (r) => PAGE_META[r].nav === 'primary' && PAGE_META[r].navLabel !== null,
);

/**
 * Below the fold the links become a DISCLOSURE, and this deliberately overrides the
 * refusal of a menu.
 *
 * The refusal was aimed at a hamburger with eight states, a focus trap and an exit
 * animation — a component nobody had designed. What shipped instead was
 * `display: none`, which leaves a phone reader scrolling a long page with no table
 * of contents and no way to reach the refusals at all. That measured worse than the
 * thing being refused.
 *
 * This is a real `<button>` with `aria-expanded` and `aria-controls`, it closes on
 * Escape and on route change, and it has no exit to design. ITS FIRST ITEM IS
 * "WHAT IT REFUSES", and `[Run a plot]` is visible at every width and never
 * collapsed into it.
 */
function Nav({
  route,
  navigate,
  tool,
}: {
  readonly route: Location;
  readonly navigate: (to: Href) => void;
  /**
   * The theme toggle, and nothing else.
   *
   * It used to sit in its own full-width row between the nav and the main content, and
   * a public page that row held NOTHING ELSE — the actor badge and the "Change"
   * button both render only when someone has entered a name. So every public page
   * opened with an empty 42px band above the fold, which is chrome that says
   * nothing occupying the most expensive space on the page. It belongs beside the
   * call to action, which is the other control in the nav.
   */
  readonly tool?: React.ReactNode;
}): JSX.Element {
  const t = useT();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const navRef = useRef<HTMLElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  // Close on route change. A menu left open across a navigation is a menu covering
  // the page the reader just asked for.
  useEffect(() => setOpen(false), [route]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // A 1px sentinel above the nav. IntersectionObserver rather than a scroll
  // listener: no per-frame work and no layout read on the main thread. If the
  // effect never runs — no JS, an error before hydration — the attribute is absent,
  // the border stays transparent, and the nav looks exactly as it does now. The
  // failure mode of this feature is the design, which is the only acceptable
  // failure mode for a decoration.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver !== 'function') return undefined;
    const io = new IntersectionObserver(([e]) =>
      navRef.current?.setAttribute('data-scrolled', String(!e?.isIntersecting)),
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const ordered = [...PRIMARY].sort((a, b) => (a === '/refusals' ? -1 : b === '/refusals' ? 1 : 0));

  return (
    <>
      <div ref={sentinel} aria-hidden="true" />
      <nav className="nav" ref={navRef} aria-label={t.navLabel}>
        <div className="shell nav__inner">
          <Link to="/" navigate={navigate} className="nav__brand">
            <Mark size={26} />
            <span className="nav__wordmark">TOP.ai</span>
          </Link>

          <button
            type="button"
            className="button button--sm nav__disclosure"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? t.close : t.sections}
          </button>

          <div className="nav__links" id={panelId} data-open={open ? 'true' : 'false'}>
            {ordered.map((r) => (
              <Link
                key={r}
                to={r}
                navigate={navigate}
                {...(route === r ? { 'aria-current': 'page' as const } : {})}
              >
                {t.routes[r].navLabel ?? PAGE_META[r].navLabel}
              </Link>
            ))}
          </div>

          <div className="nav__tools">
            {tool}
            <Link to="/app" navigate={navigate} className="button button--primary">
              {t.runAPlot}
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}

/* ==========================================================================
 * THE COLOPHON
 * ======================================================================= */

/*
  THE COLUMN LABELS LIVE IN `chrome.en.ts` AND NOWHERE ELSE.

  A second copy stood here after the labels moved into the dictionary. It was
  unreferenced, so it rendered nothing and cost nothing — and that is the reason to
  delete it rather than leave it: an unreferenced English copy of a translated
  string is the thing a later edit reaches for, and the page would then have two
  answers to what a column is called. `groups.claim` is still deliberately first;
  a conventional site puts the product column there.
*/
const GROUP_ORDER: readonly PageMeta['group'][] = ['claim', 'product', 'method', 'reference'];

function Colophon({
  navigate,
  engineVersion,
  annexVersion,
}: {
  readonly navigate: (to: Href) => void;
  readonly engineVersion?: string | undefined;
  readonly annexVersion?: string | undefined;
}): JSX.Element {
  const t = useT();
  return (
    <footer className="colophon">
      <div className="shell">
        <div className="colophon__map">
          {GROUP_ORDER.map((group) => {
            const members = ROUTES.filter(
              (r) => PAGE_META[r].group === group && PAGE_META[r].nav !== 'unlisted',
            );
            const isReference = group === 'reference';
            // AN EMPTY COLUMN IS OMITTED, never rendered as a heading over nothing.
            // `method` has no members until the pages in it are built, and a greyed
            // link to a page that does not exist is a promise with a date attached.
            if (members.length === 0 && !isReference) return null;
            return (
              <div className="colophon__group" key={group}>
                <h2>{t.colophon.groups[group]}</h2>
                <ul>
                  {members.map((r) => (
                    <li key={r}>
                      <Link to={r} navigate={navigate}>
                        {t.routes[r].footerLabel}
                      </Link>
                    </li>
                  ))}
                  {isReference ? (
                    <>
                      <li className="colophon__build">
                        {t.colophon.engineVersion} {engineVersion ?? t.colophon.unreported} ·{' '}
                        {t.colophon.annexVersion} {annexVersion ?? t.colophon.unsigned}
                      </li>
                      <li>{t.colophon.readinessNote}</li>
                    </>
                  ) : null}
                </ul>
              </div>
            );
          })}
        </div>

        <p>
          {t.disclaimer.lead}
          <strong>{t.disclaimer.emphasis}</strong>
          {t.disclaimer.body}
        </p>
        {/*
          THE GOVERNING TEXT, RENDERED ONLY WHERE IT IS NEEDED.

          The English page IS the governing text and says nothing; the Arabic one
          names it. It protects the refusals rather than the marketing: if an Arabic
          rendering of "regulatory validity is never assessed" were ever weaker than
          the English, the product would be misrepresenting itself to precisely the
          reader who cannot check. One line closes that, and `chrome.en.ts` carries
          an empty string so the rule is a value in the dictionary rather than a
          conditional on the locale.
        */}
        {t.governingLanguage ? <p className="fine-print">{t.governingLanguage}</p> : null}
      </div>
    </footer>
  );
}

/* ==========================================================================
 * THE CHROME
 * ======================================================================= */

/**
 * "This part is still English", said in Arabic.
 *
 * Exported because a route marked `partial` places it itself, directly above the
 * subtree that is English — `SiteChrome` cannot know where inside a route the
 * translated part ends. `dir`/`lang` are set here and not inherited, because the
 * notice is the one Arabic block inside an English region.
 */
export function UntranslatedNotice(): JSX.Element {
  const { t } = useLocale();
  return (
    <section className="shell section section--minor" dir="rtl" lang="ar">
      <div className="plate plate--quiet">
        <p className="plate__title">{t.untranslated.title}</p>
        <p className="plate__subtitle">{t.untranslated.body}</p>
      </div>
    </section>
  );
}

export function SiteChrome({
  route,
  navigate,
  children,
  aside,
  tool,
  sidebar,
  engineVersion,
  annexVersion,
  rulesApproved,
  definitionsSigned,
}: {
  readonly route: Location;
  readonly navigate: (to: Href) => void;
  readonly children: React.ReactNode;
  /**
   * The actor badge and the "Change" button — only once someone has entered a
   * name. On a public page this is absent, and the row is not rendered at all
   * rather than rendered empty.
   */
  readonly aside?: React.ReactNode;
  /** The theme toggle, which lives in the nav on every route. */
  readonly tool?: React.ReactNode;
  /**
   * The workspace rail, on the routes whose record says `shell: 'workspace'`.
   *
   * It is passed in rather than built here, because it needs the account and this
   * component deliberately knows nothing about identity. What this component owns
   * is that the rail and `<main>` share one grid and that there is still exactly
   * ONE `#main` and one skip link on the page — `shared-content.test.tsx` asserts
   * the first on every route, and a second landmark region is the easiest way to
   * break it.
   */
  readonly sidebar?: React.ReactNode;
  readonly engineVersion?: string | undefined;
  readonly annexVersion?: string | undefined;
  readonly rulesApproved?: string | undefined;
  readonly definitionsSigned?: string | undefined;
}): JSX.Element {
  const { locale, t } = useLocale();
  const spec = route === 'NOT_FOUND' ? NOT_FOUND_META : PAGE_META[route];
  const footerLabel =
    route === 'NOT_FOUND' ? t.notFound.footerLabel : t.routes[route].footerLabel;

  /*
    THE BODY BELOW IS STILL ENGLISH, AND THE PAGE SAYS SO RATHER THAN LOOKING
    FINISHED.

    Four routes have an Arabic frame and an English body, because a screen is
    translated one at a time. `chrome.ar.ts` has carried the sentence for this
    state from the first commit of the translation and nothing rendered it, so the
    Arabic reader got English prose under an Arabic header with no statement — the
    i18n form of a hidden default, and the one failure a reader who does not read
    English cannot diagnose for themselves.

    THE `dir`/`lang` PAIR IS THE HALF THAT IS NOT A NOTICE. English laid out in an
    RTL block is reordered at its boundaries, so `…to fill a column.` rendered as
    `.a column` — the sentence's own full stop at the head of the line. Marking
    `<main>` as the English it actually contains is what `Verbatim` does for one
    identifier, at the scale of a page, and it is the same argument: a run in the
    wrong direction is not a styling preference, it is text a reader cannot parse.

    `lang` is not decoration beside `dir`: it puts the Latin face back and it tells
    a screen reader to switch voice for the body while the chrome stays Arabic.

    The notice itself is `dir="rtl" lang="ar"` INSIDE that block, because it is the
    one Arabic thing on the page below the nav.
  */
  const bodyIsEnglish = locale === 'ar' && spec.arabic === 'untranslated';

  return (
    <div className="site">
      {/* Clipped rather than moved off-screen: an absolutely positioned element at
          a negative inline offset still contributes to `scrollWidth` in some
          engines, and this repo has already shipped one visually-hidden span that
          widened the document. */}
      <a className="skip-link" href="#main">
        {t.skipTo(footerLabel)}
      </a>
      <Masthead
        {...(rulesApproved !== undefined ? { rulesApproved } : {})}
        {...(definitionsSigned !== undefined ? { definitionsSigned } : {})}
      />
      <Nav route={route} navigate={navigate} tool={tool} />
      {aside}
      {/*
        THE RAIL AND THE PAGE ARE ONE GRID, and the rail comes first in the DOM
        because it comes first on the page — a rail placed after `<main>` and moved
        with `order` reads in the wrong sequence to everyone not using a mouse.

        The skip link still targets `#main`, so a reader who takes it skips the
        rail as well as the nav, which is the point of it.
      */}
      <div className={sidebar ? 'shell-grid shell-grid--railed' : 'shell-grid'}>
        {sidebar}
        <main id="main" {...(bodyIsEnglish ? { dir: 'ltr' as const, lang: 'en' } : {})}>
          {bodyIsEnglish ? <UntranslatedNotice /> : null}
          {children}
        </main>
      </div>
      <Colophon
        navigate={navigate}
        {...(engineVersion !== undefined ? { engineVersion } : {})}
        {...(annexVersion !== undefined ? { annexVersion } : {})}
      />
    </div>
  );
}
