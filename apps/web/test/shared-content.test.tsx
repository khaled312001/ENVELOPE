/**
 * THE CHROME, AND THE PARAGRAPHS THAT APPEAR ON MORE THAN ONE PAGE.
 *
 * Three properties, and each one guards a failure that has already happened here or
 * is one edit away.
 *
 * `#main` HAS TO BE UNIQUE. `EngineApp` stays mounted in a `hidden` div beside
 * whatever public page is showing, so the moment two components each declared
 * `id="main"` the skip link would resolve to whichever came first in the document —
 * usually the hidden one, which is a skip link that focuses nothing a sighted
 * keyboard user can see. Nothing else in the suite could see that: the markup is
 * valid, the render is correct, and the defect only exists in the composition.
 *
 * THE PERMANENT SENTENCE REACHES EVERY ROUTE. It was hand-copied in three files
 * with nothing binding them, which is three places for a required disclosure to
 * drift apart.
 *
 * AND A SHARED PARAGRAPH HAS EXACTLY ONE SOURCE. Duplicated prose diverges: one copy
 * gets edited in a design pass, the other does not, and the site then says two
 * things about the same refusal.
 */

import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { EngineApp } from '../src/App.js';
import { AppSidebar } from '../src/components/AppSidebar.js';
import { SiteChrome } from '../src/components/SiteChrome.js';
import {
  DISCLAIMER,
  DORMANT_IS_NOT_A_PASS,
  IFC_GLTF,
  LIMITS,
  OPTIMISER_REFUSAL,
} from '../src/content/shared.js';
import { NOT_FOUND_PAGE, PAGES } from '../src/pages.js';
import { PAGE_META } from '../src/page-meta.js';
import { NOT_FOUND, ROUTES, type Location } from '../src/router.js';
import {
  BANNED_IN_HAND_WRITTEN_COPY,
  expectSitewideProhibitions,
  stripTags,
} from './prohibitions.js';

const PROPS = {
  navigate: () => {},
  actor: null,
  setActor: () => {},
  search: '',
} as const;

/** One route, rendered the way `Root` renders it: the page inside the chrome. */
function page(route: Location): string {
  const spec = route === NOT_FOUND ? NOT_FOUND_PAGE : PAGES[route];
  return renderToStaticMarkup(
    <SiteChrome route={route} navigate={() => {}}>
      <spec.component {...PROPS} />
    </SiteChrome>,
  );
}

const ids = (markup: string): string[] =>
  [...markup.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1] ?? '');

describe('the site chrome', () => {
  it('renders exactly one #main on every route', () => {
    for (const route of [...ROUTES, NOT_FOUND] as Location[]) {
      const found = ids(page(route)).filter((id) => id === 'main');
      expect(found.length, `${String(route)} has ${found.length} elements with id="main"`).toBe(
        1,
      );
    }
  });

  it('still renders exactly one #main with the engine mounted beside the page', () => {
    // The composition `Root` actually produces: the latched engine in a hidden div,
    // and a public page in the chrome. Two `#main`s here and the skip link points at
    // the invisible one.
    const markup = renderToStaticMarkup(
      <>
        <div hidden>
          <EngineApp
            navigate={() => {}}
            actor={{ id: 'a', name: 'A Person' }}
            setActor={() => {}}
            search=""
          />
        </div>
        <SiteChrome route="/" navigate={() => {}}>
          <p>a public page</p>
        </SiteChrome>
      </>,
    );
    expect(ids(markup).filter((id) => id === 'main').length).toBe(1);
  });

  it('emits the permanent sentence on every route', () => {
    for (const route of [...ROUTES, NOT_FOUND] as Location[]) {
      const text = stripTags(page(route)).replace(/\s+/g, ' ');
      expect(text, `${String(route)} does not emit the disclaimer emphasis`).toContain(
        DISCLAIMER.emphasis,
      );
      expect(text, `${String(route)} does not emit the disclaimer body`).toContain(
        DISCLAIMER.body.trim(),
      );
    }
  });

  /**
   * THE PRESENCE HALF OF THE `compliance check` RULE, and its move is a correction.
   *
   * The prohibition — no unnegated occurrence — runs on every page. The assertion
   * that the phrase appears AT ALL used to sit beside it, and under the shared
   * chrome that phrase lives in `DISCLAIMER` rather than in any page component, so a
   * presence assertion run on a page render would fail on every page. One rule that
   * is true of every page, one that is true of the chrome, and neither pretending to
   * be the other.
   */
  it('says in the chrome that this is not a compliance check', () => {
    const text = stripTags(page('/'));
    const occurrences = [...text.matchAll(/\bcompliance check\b/gi)];
    expect(occurrences.length).toBeGreaterThan(0);
  });

  it('carries the site-wide prohibitions on every route', () => {
    for (const route of [...ROUTES, NOT_FOUND] as Location[]) {
      expectSitewideProhibitions(page(route), String(route));
    }
  });

  it('names TOP.ai and never ENVELOPE as the site', () => {
    // ENVELOPE is the engine: a package name, a directory, a storage key, a code
    // comment. It is never the name of the site, and the wordmark is the one place
    // that distinction is visible to a reader.
    const markup = page('/parking');
    expect(markup).toContain('TOP.ai');
    expect(stripTags(markup)).not.toMatch(/\bENVELOPE\b/);
  });
});

/**
 * THE WORKSPACE SHELL.
 *
 * A rail is the most-repeated element on a signed-in page, so the properties worth
 * holding are the ones that would rot invisibly: that it appears exactly where the
 * route record says and nowhere else, that adding a second navigation region did
 * not break the one `#main` the skip link resolves to, that it never lists a route
 * that does not exist, and that it says which of the two identities you are.
 */
describe('the workspace shell', () => {
  const railed = (route: Location, accountName?: string): string =>
    renderToStaticMarkup(
      <SiteChrome
        route={route}
        navigate={() => {}}
        sidebar={
          <AppSidebar
            route={route}
            navigate={() => {}}
            {...(accountName === undefined ? {} : { accountName })}
          />
        }
      >
        <p>a page</p>
      </SiteChrome>,
    );

  it('is asked for by the route record, not by a list in the chrome', () => {
    const workspace = ROUTES.filter((r) => PAGE_META[r].shell === 'workspace');
    const site = ROUTES.filter((r) => PAGE_META[r].shell === 'site');
    expect(workspace.length).toBeGreaterThan(0);
    expect(site.length).toBeGreaterThan(0);
    // A 404 keeps the visitor's address and cannot know whose it was.
    expect(NOT_FOUND_PAGE.shell).toBe('site');
  });

  it('draws no rail on a route that did not ask for one', () => {
    for (const route of [...ROUTES, NOT_FOUND] as Location[]) {
      expect(page(route), `${String(route)} drew a rail`).not.toContain('class="sidebar"');
    }
  });

  it('keeps exactly one #main and one skip link with the rail beside the page', () => {
    const markup = railed('/work', 'A Person');
    expect(ids(markup).filter((id) => id === 'main').length).toBe(1);
    expect((markup.match(/class="skip-link"/g) ?? []).length).toBe(1);
    // The rail precedes the page it belongs to, in the DOM and not only visually.
    expect(markup.indexOf('class="sidebar"')).toBeLessThan(markup.indexOf('id="main"'));
  });

  it('lists only routes that exist, and marks the current one in two channels', () => {
    const markup = railed('/work', 'A Person');
    const hrefs = [...markup.matchAll(/class="sidebar__item"[^>]*/g)].length;
    const links = [...markup.matchAll(/<a href="([^"]+)"[^>]*class="sidebar__item"/g)].map(
      (m) => m[1] ?? '',
    );
    expect(links.length).toBe(hrefs);
    expect(links.length).toBeGreaterThan(0);
    for (const href of links) expect(ROUTES).toContain(href);
    // `aria-current` for a reader who sees no colour; the border is the stylesheet's
    // half of the same fact and is asserted by `pnpm contrast`, not here.
    expect(markup).toMatch(/href="\/work"[^>]*aria-current="page"/);
  });

  it('gives the rail a landmark name of its own, not the nav’s', () => {
    const markup = railed('/app', 'A Person');
    const labels = [...markup.matchAll(/<nav[^>]*aria-label="([^"]+)"/g)].map((m) => m[1] ?? '');
    expect(labels.length).toBeGreaterThan(1);
    expect(new Set(labels).size, `two landmarks share a name: ${labels.join(', ')}`).toBe(
      labels.length,
    );
  });

  /* A guest's runs live behind a key in one browser. A rail that looked the same
     either way would be the one element on this site hiding which you are. */
  it('says what a guest is, and stops saying it once there is an account', () => {
    const guest = stripTags(railed('/work'));
    expect(guest).toContain('You are working as a guest.');
    expect(guest).toContain('clearing it loses them');

    const signedIn = stripTags(railed('/work', 'Mona Architect'));
    expect(signedIn).toContain('Signed in as');
    expect(signedIn).toContain('Mona Architect');
    expect(signedIn).not.toContain('You are working as a guest.');
  });

  /* §13.1. A rail is chrome, and chrome painted in the uncertainty colour teaches a
     reader that amber means nothing in particular. */
  it('paints no amber', () => {
    const markup = railed('/app', 'A Person');
    const rail = markup.slice(markup.indexOf('class="sidebar"'), markup.indexOf('id="main"'));
    expect(rail).not.toMatch(/assumed|uncertain|traced--/);
  });
});

describe('the shared content module', () => {
  const SOURCE = readFileSync(new URL('../src/content/shared.tsx', import.meta.url), 'utf8');

  /**
   * The hand-written-copy scan, over the SOURCE and never over rendered markup.
   *
   * The site renders the engine's own claim statement verbatim, and that statement
   * contains "NOT YET MEASURED" and "architects who have not yet been engaged". A
   * regex over markup would fail the most honest paragraph on the site. Here the
   * file is the unit of assertion and the exception disappears.
   */
  it('avoids the hand-written-copy vocabulary', () => {
    // The strings, not the prose around them: this module's own docblocks discuss
    // the banned words in order to explain the rule.
    const strings = [
      DISCLAIMER.lead,
      DISCLAIMER.emphasis,
      DISCLAIMER.body,
      ...LIMITS.map((l) => l.heading),
      IFC_GLTF.heading,
      OPTIMISER_REFUSAL.heading,
      DORMANT_IS_NOT_A_PASS.heading,
    ].join(' ');
    for (const banned of BANNED_IN_HAND_WRITTEN_COPY) {
      expect(strings, `shared content matched ${banned}`).not.toMatch(banned);
    }
  });

  it('carries no figure in any shared paragraph', () => {
    // Every one of these appears on two pages, so a figure typed into one of them is
    // a figure typed into two. The parking-in-FAR item is the reason this assertion
    // exists: it quoted a specification range twice in one paragraph, which was both
    // a typed figure and the weakest number available to the site.
    const strings = [
      ...LIMITS.map((l) => l.heading),
      IFC_GLTF.heading,
      OPTIMISER_REFUSAL.heading,
      DORMANT_IS_NOT_A_PASS.heading,
      DISCLAIMER.emphasis,
      DISCLAIMER.body,
    ];
    for (const s of strings) {
      expect(s, `a shared paragraph carries a figure: "${s}"`).not.toMatch(/\d/);
    }
  });

  it('is the only place the permanent sentence is written', () => {
    // A copy pasted back in fails here as easily as one edited apart, which is the
    // property the module exists for.
    expect(SOURCE.split(DISCLAIMER.emphasis).length - 1).toBeGreaterThan(0);
    for (const file of ['Root.tsx', 'App.tsx', 'components/SiteChrome.tsx']) {
      const src = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
      expect(
        src.includes(DISCLAIMER.emphasis),
        `${file} writes the permanent sentence itself instead of importing it`,
      ).toBe(false);
    }
  });

  /**
   * The five refusals are load-bearing and the count is not: the assertion is that
   * every one of them has a heading that names a thing the software does not do, and
   * that they are all reachable from one export.
   */
  it('exports every shared refusal with a heading and a body', () => {
    for (const l of LIMITS) {
      expect(l.heading, `${l.id} has no heading`).toMatch(/^It does not /);
      expect(l.body, `${l.id} has no body`).toBeTruthy();
    }
    for (const r of [IFC_GLTF, OPTIMISER_REFUSAL, DORMANT_IS_NOT_A_PASS]) {
      expect(r.heading.length).toBeGreaterThan(10);
      expect(r.body).toBeTruthy();
    }
  });
});
