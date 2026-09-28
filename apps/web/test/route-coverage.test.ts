/**
 * THE ROUTE TABLE, MECHANISED.
 *
 * A hand-listed column of test filenames in a design document is the same shape of
 * defect the document diagnoses everywhere else: it drifts the first time a route
 * lands without one, and it drifts silently, because nothing reads it.
 *
 * THIS IS WHY `/readiness` GETS ITS OWN FILE. While its assertions lived inside
 * `landing.test.tsx`'s `describe('the status dashboard')` the rule could not be
 * mechanised at all — one route's coverage was invisibly supplied by another route's
 * filename, and no enumeration could tell the difference between that and a route
 * with no test.
 *
 * Three things are checked, and each one is a way a route can ship untested:
 * the file is missing; the file exists but does not run the shared prohibitions; the
 * route is in `routes.json` and not in `PAGES`, so it dispatches to nothing.
 */

import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { PAGES } from '../src/pages.js';
import ROUTE_DATA from '../src/routes.json' with { type: 'json' };
import { REDIRECTS, ROUTES } from '../src/router.js';

/** `/` → `landing`, `/parking` → `parking-page`, and so on. */
const SLUGS: Readonly<Record<string, string>> = {
  '/': 'landing',
  '/parking': 'parking-page',
  '/exports': 'exports',
  '/refusals': 'refusals',
  '/app': 'antechamber',
  /* Added with `work.test.tsx`, not ahead of it. This map is the enumeration's
     only hand-written half, so a slug entered for a file that does not exist
     would turn the missing-file assertion below into the thing it is guarding
     against. */
  '/work': 'work',
  /* Both auth routes share one test file, because they are one component: the
     two forms differ by two fields and a verb, and the argument about what an
     account is NOT is the part that must not drift between them. */
  '/sign-in': 'auth-pages',
  '/sign-up': 'auth-pages',
  '/settings': 'settings',
  '/readiness': 'readiness',
};

describe('route coverage', () => {
  it('is the same set in routes.json, ROUTES and PAGES', () => {
    const declared = (ROUTE_DATA as readonly { path: string }[]).map((r) => r.path).sort();
    expect(declared).toEqual([...ROUTES].sort());
    expect(Object.keys(PAGES).sort()).toEqual([...ROUTES].sort());
  });

  it('dispatches every route to a component', () => {
    for (const route of ROUTES) {
      expect(typeof PAGES[route].component, `${route} has no component`).toBe('function');
    }
  });

  it('gives every route a prohibitions test of its own', () => {
    for (const route of ROUTES) {
      const slug = SLUGS[route];
      expect(slug, `${route} has no slug in this file`).toBeTruthy();
      const path = new URL(`./${slug}.test.tsx`, import.meta.url);
      expect(
        existsSync(path),
        `${route} has no apps/web/test/${slug}.test.tsx. A page that has no test does ` +
          `not ship.`,
      ).toBe(true);
      const source = readFileSync(path, 'utf8');
      expect(
        source.includes("./prohibitions"),
        `apps/web/test/${slug}.test.tsx does not import prohibitions.ts. A page test ` +
          `that re-implements the scans is a page test that will fall behind them.`,
      ).toBe(true);
    }
  });

  it('keeps the 404 out of the route tuple', () => {
    // A route renders AT a URL; the 404 renders INSTEAD of one, and the address bar
    // keeps whatever the visitor typed. Keeping it out of `ROUTES` is what keeps it
    // out of the nav, the footer sitemap and the smoke walk — all three enumerate
    // this tuple.
    expect((ROUTES as readonly string[]).includes('NOT_FOUND')).toBe(false);
    expect((ROUTES as readonly string[]).some((r) => r.includes('404'))).toBe(false);
  });

  it('runs every page title and description through the prohibitions', async () => {
    // Social copy is public copy. `og:description` comes from the same field as
    // `document.title`'s neighbour, and no test could see either before this one.
    const { expectSitewideProhibitions } = await import('./prohibitions.js');
    const { NOT_FOUND_PAGE } = await import('../src/pages.js');
    for (const spec of [...ROUTES.map((r) => PAGES[r]), NOT_FOUND_PAGE]) {
      expectSitewideProhibitions(`<p>${spec.title}</p>`, `title "${spec.title}"`);
      expectSitewideProhibitions(
        `<p>${spec.description}</p>`,
        `description "${spec.description}"`,
      );
    }
  });
});

/**
 * MOVED PATHS.
 *
 * `/readiness` became `/readiness`, and the old path is in a user guide that has
 * already been handed over. A rename without a redirect is link rot with a good
 * explanation, and the failure is silent on both sides: nothing in the
 * application knows the old path existed, and nothing in the guide knows it
 * stopped.
 *
 * Three ways a redirect table can be wrong, and all three are here. It can point
 * at a route that does not exist, which is a 404 with an extra hop. It can list a
 * path that IS a route, which is a page that redirects to somewhere else and can
 * never be reached. And the server's rules can disagree with the application's,
 * which is the one that only shows up in production — so the generated
 * `.htaccess` is read and checked against the same file.
 */
describe('redirects', () => {
  it('sends every moved path to a route that exists', () => {
    for (const [from, to] of Object.entries(REDIRECTS)) {
      expect((ROUTES as readonly string[]).includes(to), `${from} → ${to}`).toBe(true);
    }
  });

  it('never redirects a path that is itself a page', () => {
    for (const from of Object.keys(REDIRECTS)) {
      expect(
        (ROUTES as readonly string[]).includes(from),
        `${from} is both a route and a redirect, so it can never be reached`,
      ).toBe(false);
    }
  });

  it('is what the deployment writes into .htaccess', () => {
    // The build reads `redirects.json`; this asserts it reads it into a rule with
    // a 301 in it, rather than into a comment or a rewrite that serves the page
    // at the old address. Read as source, because generating a release here would
    // make a unit test build the site.
    const build = readFileSync(new URL('../../../scripts/deploy/build.mjs', import.meta.url), 'utf8');
    expect(build).toContain("redirects.json");
    expect(build).toMatch(/R=301,L/);
  });
});
