/**
 * `/dashboard` — deployment readiness, rendered.
 *
 * MOVED here out of `landing.test.tsx`, where it lived inside
 * `describe('the status dashboard')`. It was moved and not copied: while it sat
 * there, `/dashboard`'s coverage was invisibly supplied by `/`'s filename, and
 * `route-coverage.test.ts` could not distinguish a route with a test from a route
 * without one.
 *
 * A dashboard wants a green ring. Almost every assertion here is a PROHIBITION
 * against one, because a test that only asserted the honest copy was present would
 * pass on a page that had added "94% ready" underneath it.
 *
 * The prohibitions this page needs beyond the site-wide set, and why each exists:
 *
 *   * NO GREEN READINESS STATE, in the markup or in the union that produces it.
 *   * NO AMBER OUTSIDE AN ASSUMED VALUE. `.stat--partial` used to paint the
 *     invariants tile in `--uncertain`, which is amber as a readiness status on the
 *     site's most-forwarded page of numbers.
 *   * NO COMPOSITE SCORE and no percentage of the invariant total.
 *   * NO FIGURE TYPED INTO COPY. Every count on the page is asserted to come from
 *     the payload by rendering a SECOND payload and checking the first one's
 *     figures have gone.
 *   * NO CONFIDENTIAL FIGURE IN THE SNAPSHOT. A basis string is rendered verbatim,
 *     so the guard belongs on the file rather than on a truncation in the page.
 */

/*
  THIS FILE DOES NOT IMPORT `PAGES`, and it began as a workaround with a named owner.

  `SiteChrome.tsx` computed `PRIMARY` from `PAGES` at module scope, and every page
  screen imports `Glyph` from `SiteChrome` — so `pages → screen → SiteChrome →
  pages` was a cycle, and any module graph ENTERED at `pages.js` read `PAGES` before
  it was assigned and threw. `route-coverage.test.ts` and `not-found.test.tsx` were
  red for exactly that, and this page's import of the shared mark set was not what
  introduced it. The repair was not the one-line deferral of the read: the record
  split, and the chrome now takes its nav labels from `page-meta.ts`, which imports no
  screen and therefore closes no loop.

  The page is still rendered directly here. The ROUTE-level render — `PAGES['/dashboard'].component`
  inside the chrome, with the site-wide prohibitions over it — is covered by
  `shared-content.test.tsx`, which walks every route in `PAGES` and enters the graph
  through `App.js`. That is one route's coverage supplied by a file that covers all
  of them, which is the correct shape: the assertion is about the chrome.
*/
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { DashboardView } from '../src/api/client.js';
import { Dashboard, DashboardPanels } from '../src/screens/Dashboard.js';
import SNAPSHOT from '../src/screens/readiness.json' with { type: 'json' };
import WORKED from '../src/screens/worked-example.json' with { type: 'json' };
import { expectSitewideProhibitions, stripTags } from './prohibitions.js';

/** The shape `/api/dashboard` returns, with the values it currently returns. */
const DASHBOARD: DashboardView = {
  generatedAt: '2026-08-30T10:00:00.000Z',
  engineVersion: '0.1.0',
  readiness: {
    rulesApproved: 0,
    rulesTotal: 13,
    definitionsSigned: 0,
    definitionsTotal: 14,
    annexVersion: '0.1.0-UNSIGNED',
    annexSigned: false,
    invariantsRan: 10,
    invariantsTotal: 18,
    blocking:
      'No rule in this deployment is approved and the metric definitions annex is ' +
      'unsigned. Every figure below is an engine demonstration. None of it is a ' +
      'capacity assessment and none of it may be quoted to a third party.',
  },
  volume: { plots: 4, runs: 4, runsShown: 4, exported: 4, reviewed: 4 },
  governingBands: { REGULATORY: 0, GEOMETRIC: 0, PARKING: 4 },
  assumptionExposure: [
    {
      parameterId: 'parking.usable_fraction',
      runs: 4,
      maxRelativeEffect: '0.212121',
      basis:
        'the fraction of a parking level left for bays and aisles once cores, ramps and ' +
        'plant are taken out. No cited rule fixes it.',
    },
    {
      parameterId: 'parking.bay_area_factor',
      runs: 4,
      maxRelativeEffect: '0',
      basis:
        'no cited rule fixes the gross area consumed per bay. 32 m²/bay is the mid-point ' +
        'of the 28–35 m²/bay range typical of a structured basement.',
    },
  ],
  deferred: [
    {
      ruleId: 'R-EGRESS-TRAVEL-DISTANCE',
      parameterId: 'egress.travel_distance.max',
      isLifeSafety: true,
      citation: {
        instrumentId: 'PLACEHOLDER-NOT-A-REAL-INSTRUMENT',
        clauseReference: 'UAE FLS Code, Chapter 2',
      },
    },
    {
      ruleId: 'R-FACADE-FIRE-PERFORMANCE',
      parameterId: 'facade.fire_performance',
      isLifeSafety: false,
      citation: {
        instrumentId: 'PLACEHOLDER-NOT-A-REAL-INSTRUMENT',
        clauseReference: 'UAE FLS Code, Chapter 1',
      },
    },
  ],
  recentRuns: [
    {
      runId: 'r1',
      createdAt: '2026-08-30T09:00:00.000Z',
      createdBy: 'Khaled Haggagy',
      plotId: 'p1',
      plotNumber: '345-1234',
      community: 'Business Bay',
      plotAreaM2: '3200.00',
      draftRules: true,
      governingBand: 'PARKING',
      governingGfaM2: '6352.5',
      levels: '4',
      bindingRuleId: 'R-PARKING-RATIO-RES',
      bindingLabel: 'parking supply',
      assumptionCount: 2,
      invariants: { ran: 10, total: 18, dormant: 8, passed: true },
      lifeSafetyDeferred: 1,
      gatesSatisfied: 4,
      reviewer: { name: 'Ahmed Amin', at: '2026-08-30T09:05:00.000Z' },
    },
  ],
};

/**
 * A SECOND payload, identical in shape and different in every figure.
 *
 * This is what turns "the page shows 0 of 13" from a presence check into a
 * provenance one: a figure typed into copy survives a payload change and a figure
 * read from the payload does not. Nothing else in the suite can tell those apart.
 */
const OTHER: DashboardView = {
  ...DASHBOARD,
  generatedAt: '2026-07-01T08:30:00.000Z',
  engineVersion: '9.9.9',
  readiness: {
    ...DASHBOARD.readiness,
    rulesApproved: 2,
    rulesTotal: 7,
    definitionsSigned: 3,
    definitionsTotal: 11,
    annexVersion: '0.4.2-UNSIGNED',
    invariantsRan: 5,
    invariantsTotal: 9,
  },
  volume: { plots: 6, runs: 8, runsShown: 8, exported: 2, reviewed: 1 },
  governingBands: { REGULATORY: 5, GEOMETRIC: 2, PARKING: 1 },
  // Emptied, so that a figure surviving the swap can only have come from the
  // sections under test. A run summary carries its OWN ran-of-total, read off the
  // run rather than off `readiness`, and leaving one here would make the two
  // payloads share a figure for an honest reason and break the assertion for a
  // dishonest-looking one.
  recentRuns: [],
};

const panels = (data: DashboardView = DASHBOARD, source: 'live' | 'snapshot' = 'live'): string =>
  renderToStaticMarkup(<DashboardPanels data={data} navigate={() => {}} source={source} />);

/**
 * The signed-out reading, from the build-time snapshot rather than from the
 * fixture above — which is the only way to assert that the file that actually
 * ships renders.
 */
const signedOut = (): string =>
  renderToStaticMarkup(<Dashboard actor={null} navigate={() => {}} />);

describe('the readiness page', () => {
  it('leads with readiness, not with volume', () => {
    const markup = panels();
    expect(markup.indexOf('What is not ready')).toBeLessThan(
      markup.indexOf('What has been run'),
    );
    // And the blocking sentence is above both, because a reader who stops at the
    // first heading has still been told the figures may not be quoted.
    expect(markup.indexOf(DASHBOARD.readiness.blocking)).toBeLessThan(
      markup.indexOf('What is not ready'),
    );
  });

  it('says where its numbers came from before it prints one', () => {
    const live = panels(DASHBOARD, 'live');
    const snap = panels(DASHBOARD, 'snapshot');
    expect(stripTags(live)).toMatch(/Live from the deployment you are connected to/);
    expect(stripTags(snap)).toMatch(/snapshot generated at/);
    // The stamp is derived from the payload, not from the machine that rendered it.
    expect(snap).toContain('2026-08-30 10:00 UTC');
    expect(snap).toContain(`dateTime="${DASHBOARD.generatedAt}"`);
    expect(stripTags(snap).indexOf('snapshot generated at')).toBeLessThan(
      stripTags(snap).indexOf('0 of 13'),
    );
  });

  it('renders the engine’s blocking sentence verbatim', () => {
    // Engine-authored prose. Truncating it, paraphrasing it or splitting it across
    // two elements would make the page the author of a sentence the engine wrote.
    expect(stripTags(panels()).replace(/\s+/g, ' ')).toContain(DASHBOARD.readiness.blocking);
  });

  /* ---------------------------------------------------------------------
   * The prohibitions
   * ------------------------------------------------------------------ */

  it('never renders a composite score or a green readiness state', () => {
    const markup = panels();
    for (const forbidden of [
      /health score/i,
      /overall score/i,
      /readiness score/i,
      /\b\d{1,3}\s?% (ready|healthy|complete|passing|green)\b/i,
      /all systems (go|operational)/i,
      /\ball clear\b/i,
      /\boperational\b/i,
      /\bhealthy\b/i,
    ]) {
      expect(stripTags(markup), `dashboard matched ${forbidden}`).not.toMatch(forbidden);
    }
    // The class, and every spelling of it anyone would reach for next.
    for (const green of ['stat--ok', 'stat--good', 'stat--met', 'stat--pass', 'stat--green']) {
      expect(markup, `dashboard emits ${green}`).not.toContain(green);
    }
    // The two zeroed readiness figures are styled blocked, never as neutral chrome.
    expect((markup.match(/stat--blocked/g) ?? []).length).toBe(2);
  });

  it('never paints a readiness state amber', () => {
    // `.stat--partial` painted the invariants tile in `--uncertain`, which is amber
    // as a READINESS STATUS. Amber is reserved exclusively for ASSUMED, so the tile
    // takes the deferred pair and the class is renamed with its emitter — a class
    // called `partial` invites the next amber.
    const markup = panels();
    expect(markup).not.toContain('stat--partial');
    expect(markup).toContain('stat--dormant');

    // AND THE AMBER THAT IS ON THE PAGE IS ONLY EVER ON AN ASSUMED VALUE. Two
    // elements per assumption row may carry it — the chip beside the parameter id,
    // and the striped meter beside a measured swing — and a row with no figure
    // draws no bar, so the expected count is derived from the payload rather than
    // typed.
    const measured = DASHBOARD.assumptionExposure.filter(
      (a) => Number(a.maxRelativeEffect) > 0,
    );
    expect((markup.match(/data-state="assumed"/g) ?? []).length).toBe(
      DASHBOARD.assumptionExposure.length + measured.length,
    );

    // And nothing else on the page carries it. Splitting on the tag delimiter is
    // enough here: a class and a state that appear on one element appear in one
    // fragment, so a readiness tile that had picked up an assumed state would be
    // named rather than counted.
    for (const tag of markup.split('<')) {
      if (!tag.includes('data-state="assumed"')) continue;
      expect(tag, `an assumed state outside an assumption row: ${tag}`).not.toMatch(
        /class="(stat|refusal|plate|empty|callout)/,
      );
    }
  });

  it('reports invariants as ran-of-total, never as a tick or a percentage', () => {
    const markup = stripTags(panels());
    expect(markup).toContain('10 of 18');
    expect(markup).toMatch(/Dormant is not a pass/i);
    // A percentage would invite the reader to fill in the remainder as passes.
    expect(markup).not.toMatch(/5[05](\.\d)?\s?% of/i);
    expect(markup).not.toMatch(/\d{1,3}\s?% of (the )?(invariants|checks)/i);
    expect(markup).not.toMatch(/✓|✔|&check;/);
  });

  it('does not render the invariants tile at all when the count is missing', () => {
    // `invariantsTotal` is `latest?.invariants.total ?? 18` in the handler, so a
    // store with no run puts a TYPED eighteen on a public page through the API.
    // Rendering "— of 18" would print that typed figure in the position a reader
    // trusts most, so the tile does not render.
    const noRun: DashboardView = {
      ...DASHBOARD,
      readiness: { ...DASHBOARD.readiness, invariantsRan: null, invariantsTotal: 18 },
      // A store with no run has no run to list either, and the recent-runs row
      // carries its own ran-of-total off the run rather than off `readiness`.
      recentRuns: [],
    };
    const markup = stripTags(panels(noRun));
    expect(markup).not.toContain('Invariants that ran');
    expect(markup).not.toMatch(/of 18/);
  });

  it('names an owner for every gap and a date for none', () => {
    const markup = stripTags(panels());
    expect(markup).toContain('What would change these numbers');
    expect(markup).toMatch(/licensed Dubai architect/i);
    expect(markup).toMatch(/annex reviewed and signed/i);
    expect(markup).toMatch(/unit and per-level schedule/i);
    // A gap with an owner is a plan; a gap with a date is a promise. There are no
    // promises on this page, so no month, quarter or year appears in that section.
    const section = markup.slice(
      markup.indexOf('What would change these numbers'),
      markup.indexOf('What has been run'),
    );
    expect(section).not.toMatch(
      /\bQ[1-4]\b|\b20\d\d\b|\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i,
    );
    expect(section).not.toMatch(/\b(by|before|within|due)\s+\w+\s+20\d\d\b/i);
  });

  it('shows an unmeasured or zero swing as neither a figure nor a claim', () => {
    const markup = stripTags(panels());
    // `parking.bay_area_factor` arrives as the string "0". The serialiser writes
    // `a.sensitivity?.relativeEffect ?? '0'`, so a sensitivity nobody measured and
    // one measured at zero are the same value by the time the page sees them.
    // "0.0%" would read as "this assumption does not matter"; "not measured" would
    // claim knowledge the payload does not carry. Both are prohibited.
    expect(markup).not.toContain('0.0%');
    expect(markup).not.toMatch(/not measured/i);
    expect(markup).toContain('21.2%');
    // And the page says who owns the distinction rather than papering over it.
    expect(markup).toMatch(/does not distinguish a sensitivity nobody measured/i);
    expect(markup).toMatch(/serialiser/i);
  });

  it('carries the basis for every assumption it lists, verbatim', () => {
    const markup = stripTags(panels()).replace(/\s+/g, ' ');
    for (const a of DASHBOARD.assumptionExposure) {
      expect(markup).toContain(a.parameterId);
      expect(markup, `the basis for ${a.parameterId} is not rendered whole`).toContain(
        a.basis.replace(/\s+/g, ' '),
      );
    }
  });

  it('marks every rule identifier as a draft citation in the same view', () => {
    const markup = panels();
    const text = stripTags(markup);
    expect(text).toContain('R-EGRESS-TRAVEL-DISTANCE');
    expect(text).toContain('life safety');
    expect(text).toContain('UAE FLS Code, Chapter 2');
    // R9. A rule id beside a clause reference reads as a regulation unless
    // something in the same view says otherwise, and every seed rule cites a
    // placeholder instrument at an unsourced page.
    expect((markup.match(/draft · not sourced/g) ?? []).length).toBe(
      DASHBOARD.deferred.length,
    );
    expect(text).toContain('PLACEHOLDER-NOT-A-REAL-INSTRUMENT');
    // The chip is not styled to look sourced: it is a state, not a neutral label.
    expect(markup).toMatch(/data-state="blocked"[^>]*>[\s\S]{0,200}?draft · not sourced/);
  });

  it('keeps the recent-runs table behind the actor', () => {
    // The table carries the names of the people who authored and reviewed each run.
    const out = stripTags(panels(DASHBOARD, 'snapshot'));
    expect(out).not.toContain('Ahmed Amin');
    expect(out).not.toContain('345-1234');
    expect(out).not.toContain('Business Bay');
    const inn = stripTags(panels(DASHBOARD, 'live'));
    expect(inn).toContain('Ahmed Amin');
    expect(inn).toContain('10 of 18 ran');
  });

  it('states that it is not a score and not an availability page', () => {
    const markup = stripTags(panels());
    expect(markup).toMatch(/no composite figure/i);
    expect(markup).toMatch(/does not report whether the service is reachable/i);
    // "Status" must never appear anywhere it could be read as uptime. The route is
    // readiness; the word belongs to a different product.
    expect(markup).not.toMatch(/\bstatus page\b/i);
    expect(markup).not.toMatch(/\buptime\b/i);
    expect(markup).not.toMatch(/\bdowntime\b/i);
  });

  it('never claims a control the software does not perform', () => {
    const markup = stripTags(panels());
    for (const forbidden of [
      /\bcompliant\b/i,
      /\bvalidated\b/i,
      /\bseparation of duties\b/i,
      /\bverified licence\b/i,
      /\bverifies the licence\b/i,
      /\bnot the author\b/i,
    ]) {
      expect(markup, `dashboard matched ${forbidden}`).not.toMatch(forbidden);
    }
    // The honest version of the same fact, on the tile that would otherwise imply
    // a control: the licence is recorded, not checked.
    expect(markup).toMatch(/recorded, not verified/i);
  });

  it('types no figure into its own copy', () => {
    // The provenance assertion. A typed number survives a payload swap; a read one
    // does not, and nothing else in this suite can tell the two apart.
    const a = stripTags(panels(DASHBOARD));
    const b = stripTags(panels(OTHER));
    for (const gone of ['0 of 13', '0 of 14', '10 of 18', '0.1.0-UNSIGNED']) {
      expect(a, `${gone} is not rendered from the first payload`).toContain(gone);
      expect(b, `${gone} survived a payload change, so it is typed`).not.toContain(gone);
    }
    for (const shown of ['2 of 7', '3 of 11', '5 of 9', '0.4.2-UNSIGNED', '9.9.9']) {
      expect(b, `${shown} is not read from the payload`).toContain(shown);
    }
  });

  it('prints the cars each file draws, and says what their agreeing shows', () => {
    // The row reads the worked example's file counts in both modes, because they
    // describe the build rather than the deployment. The build stops if they
    // differ, so the row can only show equal numbers — which is why the sentence
    // bounding them is asserted present: equal counts without it read as a check
    // on the layout, and they are a check on the drawings.
    const cars = WORKED.verified.exports.cars;
    expect(new Set(Object.values(cars)).size, 'the fixture records files that disagree').toBe(1);
    for (const html of [panels(DASHBOARD, 'live'), panels(DASHBOARD, 'snapshot')]) {
      const page = stripTags(html).replace(/\s+/g, ' ');
      expect(page).toContain(`${cars.engine} Placed by the engine`);
      expect(page).toContain(`${cars.modelFile} In the model file`);
      expect(page).toMatch(/Agreement is self-consistency, and nothing more\./);
      expect(page).toMatch(/is not the drawings agreeing with a regulation/);
    }
  });

  it('carries no count in any heading', () => {
    // R8's mechanical half, and the site-wide set runs it too. It is asserted here
    // as well because this page is made of counts, and a heading is exactly where
    // one gets typed.
    expectSitewideProhibitions(panels(), '/dashboard signed in');
  });
});

describe('the readiness route', () => {
  it('renders signed out, from the build-time snapshot', () => {
    // `/dashboard` dispatches ABOVE the actor check. Two of the landing page's
    // calls to action used to land a visitor on "Who is running this?", which asks
    // for identity before giving anything — and the snapshot exists so the page
    // never has to fabricate an actor to reach the API.
    const markup = signedOut();
    expect(markup).toContain('What is not ready');
    expect(markup).toContain('snapshot generated at');
    // The figures are the shipped file's, not the fixture's, so a snapshot
    // regenerated with different counts is asserted here rather than assumed.
    const r = (SNAPSHOT as unknown as DashboardView).readiness;
    expect(stripTags(markup)).toContain(`${r.rulesApproved} of ${r.rulesTotal}`);
    expect(stripTags(markup)).toContain(r.blocking);
    expectSitewideProhibitions(markup, '/dashboard signed out');
  });

  it('makes no request and shows no loading state without an actor', () => {
    // A build-time import has no loading interval. What is prohibited is the
    // obvious next move: a skeleton with placeholder figures in the tile positions,
    // because a grey rectangle where a count belongs is a number the reader
    // supplies themselves.
    const markup = renderToStaticMarkup(<Dashboard actor={null} navigate={() => {}} />);
    expect(markup).toContain('What is not ready');
    expect(markup).not.toContain('Reading the deployment');
    expect(markup).not.toMatch(/skeleton|placeholder-figure|shimmer/i);
  });

  it('keeps a loading line rather than a page of zeroes when signed in', () => {
    // It fetches on mount, so a server render has no data. What matters is that it
    // says so instead of rendering a dashboard of zeroes that look like
    // measurements.
    const markup = renderToStaticMarkup(
      <Dashboard actor={{ id: 'k', name: 'Khaled Haggagy' }} navigate={() => {}} />,
    );
    expect(markup).toContain('Reading the deployment');
    expect(markup).not.toContain('What is not ready');
  });

  it('never ships a real name, plot number or community in the snapshot', async () => {
    // A JSON fixture in the public bundle is ON the site whether or not a component
    // renders it: it ships, it is fetchable, and no prohibitions test can see inside
    // it, because prohibitions run over rendered markup. `verify-readiness.mjs` scans
    // its own output and fails the build; this is the same rule asserted from the
    // other side, so a hand-edited fixture is caught too.
    const snapshot = (await import('../src/screens/readiness.json', { with: { type: 'json' } }))
      .default as unknown;
    const text = JSON.stringify(snapshot);
    expect(text).not.toMatch(/\b\d{3,}-\d{4,}\b/);
    expect(text).toContain('"recentRuns":[]');
  });

  it('never ships a confidential third-party figure in the snapshot', async () => {
    /*
      THE BASIS STRINGS ARE RENDERED VERBATIM ON THIS PAGE, so this guard belongs
      on the file rather than on a truncation in the component. A basis string is
      engine-authored prose: an assumption without a basis is not an assumption,
      and the fix for a basis that must not be public is always at source.

      What may not reach a public page is a named developer's confidential
      commercial brief — the saleable-to-GFA expectation, the car-park efficiency
      benchmark, and any unit-area cap out of it. Those figures stay accurate in
      `packages/rules/src/standards/`, which is reached only through the signed-in
      app, and they are scanned for here in both directions: the figures and the
      phrases that would carry them.
    */
    const snapshot = (await import('../src/screens/readiness.json', { with: { type: 'json' } }))
      .default as unknown;
    const text = JSON.stringify(snapshot);
    for (const confidential of [
      /9[37]\s?%/,
      /93\s?[-–]\s?97/,
      /37\.5\s?m/i,
      /m²?\s?\/\s?car\b/i,
      /saleable[- ]to[- ]GFA/i,
      /developer brief/i,
    ]) {
      expect(text, `readiness.json carries ${confidential}`).not.toMatch(confidential);
    }
  });
});
