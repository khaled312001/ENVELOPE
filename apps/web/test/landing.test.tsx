/**
 * `/`, rendered.
 *
 * It is the screen a stranger reads first, and the one where the product's
 * discipline is cheapest to abandon — a landing page wants a superlative. So almost
 * every assertion here is a PROHIBITION: what this page must never say. A test that
 * only checked the honest copy was present would pass on a page that had added
 * "99.4% accurate" underneath it, which is why the suite is written this way and why
 * the shared scans live in `prohibitions.ts` rather than being re-implemented here.
 *
 * FOUR ASSERTIONS ARE PRESENCE CHECKS, and each one is here because no prohibition
 * can catch the failure it guards against. They are named as such where they occur:
 * a prohibitions test is blind to a design pass that tones the amber down, blind to a
 * disclosure that hides the assumption behind a click, and blind to a fold that drops
 * the refusal. A design review that does any of those has failed, and only a presence
 * assertion says so.
 *
 * THE STATUS DASHBOARD IS NOT HERE. It moved to `dashboard.test.tsx`, and it was
 * MOVED rather than copied: while its assertions lived in this file, `/dashboard`'s
 * coverage was invisibly supplied by `/`'s filename, so `route-coverage.test.ts`
 * could not tell a route with a test from a route without one.
 */

import { readFileSync } from 'node:fs';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LIMITS } from '../src/content/shared.js';
import { Landing } from '../src/screens/Landing.js';
import WORKED from '../src/screens/worked-example.json' with { type: 'json' };
import {
  expectAssumedTreatmentPresent,
  expectClaimOrder,
  expectSitewideProhibitions,
  group,
  stripTags,
} from './prohibitions.js';

const landing = (): string => renderToStaticMarkup(<Landing navigate={() => {}} />);
const text = (): string => stripTags(landing()).replace(/\s+/g, ' ');

const V = WORKED.verified;

describe('the landing page', () => {
  it('carries every site-wide prohibition', () => {
    // Compliance language, invented figures, apology vocabulary, and a count in an
    // h1–h3. All four run on every route; this page is only the one that fails them
    // first, because it is the one written to persuade.
    expectSitewideProhibitions(landing(), 'the landing page');
  });

  it('states all five claims, in §16.5 order, with the refusal last', () => {
    // The order IS the assertion. Any other order buries the refusal in the middle of
    // a list, which is where a reader stops noticing it.
    expectClaimOrder(landing(), 'the landing page');
    expect(text()).toContain('Never claimed');
  });

  /* ---------------------------------------------------------------------
   * NO FIGURE ON THIS PAGE WAS TYPED BY A HUMAN.
   *
   * The rule mechanised, rather than reviewed. The page once printed a governing
   * capacity of 6,352.5 m² for months after the engine had started returning
   * 6,774.194 for the same input, and nothing but a comment said it should not.
   * ------------------------------------------------------------------ */

  it('prints no number that is not in the fixture', () => {
    /*
      Every run of digits in the rendered text has to be findable in
      `worked-example.json`, or be on the short list below with a reason. Commas are
      the page's own thousands separator, so a candidate is de-grouped before it is
      looked for — "16,000" on the page is "16000" in the fixture.

      The allowlist is short on purpose and every entry is a fact about the PAGE
      rather than a claim about the plot, the engine or the deployment:
    */
    const TYPED_AND_ALLOWED = new Set([
      '0', //  "Phase 0", the phase this demonstration belongs to.
      '01', // the section index numerals. `aria-hidden`, a fact about the page's own
      '02', // structure, and the one place a reader can verify the count by
      '03', // scrolling. They are not a measurement of anything.
      '04',
      '05',
      '1', //  "a declared 1 mm grid" — the grid the kernel is defined on, from the
      //       engine's own claim statement, and a constant of the software rather
      //       than a figure about this run.

      /*
        THE LAST TWO ARE NOT THIS PAGE'S, AND THEY ARE RECORDED RATHER THAN EXCUSED.

        `5.25` and `32.0` are the specimen values inside `ProvenanceLegend`
        (`components/TracedValue.tsx`), which this page renders VERBATIM so that the
        meaning of amber here and the meaning of amber inside a run cannot drift
        apart. Re-drawing the key to avoid them would reintroduce exactly the drift
        the shared component prevents, and editing that component is outside this
        pass.

        They are a swatch of a treatment rather than a figure about the plot — but
        `5.25` is setback-shaped, sits under the label "From a cited rule", and is
        not any setback this run produced, so a reader scanning the page could take
        it for one. That is a real defect in a component two screens already render,
        and the honest place to fix it is the legend: its specimens should be
        non-numeric, or should come from the run being shown.
      */
      '5.25',
      '32.0',
    ]);

    const fixture = JSON.stringify(WORKED);
    const offenders = [...text().matchAll(/\d[\d,]*(?:\.\d+)?/g)]
      .map((m) => m[0])
      .filter((raw) => {
        const bare = raw.replace(/,/g, '');
        return !TYPED_AND_ALLOWED.has(bare) && !fixture.includes(bare);
      });

    expect(
      offenders,
      `these figures appear on the landing page and in nothing the engine produced: ` +
        `${offenders.join(', ')}. A hand-typed number here is a number with no ` +
        `provenance, and the fact that a human typed it is not a defence.`,
    ).toEqual([]);
  });

  it('quotes no percentage of anything, and no accuracy or speed figure', () => {
    // §22.2's inter-architect variance study has not been run, so there is no
    // accuracy figure to quote and no agreement figure either. The ban is wider than
    // that: a percentage on this page invites a reader to fill in the remainder
    // themselves, which is how "10 of 18 invariants ran" becomes "56% passed". The
    // level plan's own containment ratio is left off for the same reason, and the
    // containment fact is stated in words instead.
    expect(text()).not.toMatch(/\d\s*%/);
    expect(text()).not.toMatch(/\bpercent(age)?\b/i);
  });

  it('never names a band as governing in a heading or a static sentence', () => {
    /*
      R10. `pnpm example` diffs values, not the claims wrapped around them, so a rule
      edit that made band A bind would leave "parking governs this plot" false with
      every gate green. The verdict is templated, and the test rebuilds the template
      from the fixture rather than asserting the string that ships today.
    */
    const t = text();
    expect(t).not.toMatch(/\b(parking|regulatory|envelope|floor area)\s+governs\b/i);
    expect(t).toContain(
      `On this run, ${V.governingBand} binds, and the ${V.nextBindingBand} ceiling ` +
        `sits ${group(V.headroomToNextM2)} m² above the answer.`,
    );
  });

  /* ---------------------------------------------------------------------
   * THE GOVERNING NUMBER IS AN AREA DIVIDED BY AN ASSUMED FACTOR.
   *
   * `computeBands` runs at `pipeline.ts:367` and `planParkingLevel` at `:453`, so
   * the placed rectangles are strictly downstream of the band and cannot inform it.
   * ------------------------------------------------------------------ */

  it('renders the ASSUMED treatment rather than only arguing about it', () => {
    // A PRESENCE ASSERTION. The page used to carry a card titled "Assumptions are
    // declared, ranked and amber" while showing no amber anywhere, with
    // `bayAreaFactorClass: "ASSUMED"` sitting unread in the fixture. A prohibitions
    // test cannot see that; only this can.
    expectAssumedTreatmentPresent(landing(), 'the landing page');
  });

  it('shows the assumed factor and its basis in the same view as the governing figure', () => {
    /*
      A PRESENCE ASSERTION, and the most important one in this file.

      The governing capacity rests on an available area divided by an area-per-bay
      factor that no cited rule fixes. Behind a closed disclosure that assumption is
      present in the markup and absent from the page, which is exactly the failure the
      whole product exists to prevent — so the hero's panel ships OPEN, and this
      asserts that it does. `aria-expanded="false"` on the hero control fails here.
    */
    const html = landing();
    const hero = html.slice(0, html.indexOf('id="capacities"'));

    expect(hero, 'the hero disclosure does not ship open').toContain('aria-expanded="true"');
    expect(hero).toContain(V.bayAreaFactorM2);
    expect(hero, 'the provenance class is not announced as text').toContain(
      V.bayAreaFactorClass,
    );
    expect(hero, 'the basis is truncated or missing').toContain(V.bayAreaFactorBasis);
    // The panel is the amber treatment, not a grey note that mentions amber.
    expect(hero).toMatch(/data-state="assumed"/);
  });

  it('never says the placed level produced the number that governs', () => {
    /*
      The false causal claim all three site proposals wanted to make. It would put an
      inversion of the pipeline directly under the site's headline number, on the page
      that sells traceability, and no gate would catch it because `pnpm example` diffs
      values and not the claims wrapped around them.
    */
    const t = text();
    for (const inversion of [
      /bays that (fit|it can fit)/i,
      /places rectangles instead of dividing/i,
      /(rather|instead of) dividing an area by a factor/i,
      /counts? the bays it can actually place/i,
      /derived from the placed/i,
    ]) {
      expect(t, `the landing page matched ${inversion}`).not.toMatch(inversion);
    }
    // And it never prints demand as if it were supply. `verified.totalBays` is the
    // demand of the larger scheme used to PROBE for the parking ceiling; the engine
    // says so itself in its own note.
    expect(t, 'the probe scheme’s demand is printed as a bay count').not.toMatch(
      new RegExp(`\\b${group(V.totalBays)}\\b`),
    );
  });

  /* ---------------------------------------------------------------------
   * WHAT MAY NOT REACH A PUBLIC PAGE AT ALL.
   * ------------------------------------------------------------------ */

  it('carries no third party’s confidential commercial figure', () => {
    /*
      The saleable-to-GFA expectation and the car-park efficiency benchmark are a
      named developer's confidential brief. The fixture's basis string was rewritten
      at source to remove the range and the attribution, and the real transcribed
      figures stay in `packages/rules/src/standards/`, where they are reached only
      through the signed-in app. Rendering one prose-side rather than as a number
      would not make it publishable, so both are asserted as strings AND the basis
      that used to carry one is asserted absent.
    */
    const t = text();
    expect(t).not.toMatch(/93\s*[–—-]\s*97/);
    expect(t).not.toMatch(/37\.5\s*m²?\s*(per|\/)\s*car/i);
    expect(t).not.toMatch(/\bsaleable[- ]to[- ]GFA\b/i);
    expect(t).not.toContain(WORKED.input.run.saleableEfficiency.basis);
    // And no real plot identity. The worked plot belongs to someone.
    expect(t).not.toContain(WORKED.input.plot.plotNumber);
    expect(t).not.toContain(WORKED.input.plot.community);
  });

  it('promises no citation this deployment does not have', () => {
    /*
      Every seed rule carries `instrumentId: 'PLACEHOLDER-NOT-A-REAL-INSTRUMENT'`,
      `sourcePage: 0` and clause text prefixed `[NOT SOURCED]`. The old h1 read "which
      line in the code says so", which promises a citation that does not exist here.
      So: no rule id or clause reference may be rendered without the placeholder state
      in the same view, and the fold has to say it rather than a footnote six sections
      below the drawing.
    */
    const t = text();
    const ids = [...t.matchAll(/\bR-[A-Z][A-Z0-9-]{3,}\b/g)].map((m) => m[0]);
    if (ids.length > 0) {
      expect(t, `${ids.join(', ')} is rendered with no placeholder state`).toMatch(
        /placeholder/i,
      );
    }
    expect(t).not.toMatch(/which line in the code says so/i);
    expect(t).toMatch(/placeholder/i);
  });

  it('claims no permission, and no separation of duties', () => {
    const t = text();
    // "What can be built on this plot" is a permission claim in the largest text on
    // the site, with NOT ASSESSED underneath as the mitigation.
    expect(t).not.toMatch(/what can be built/i);
    // `canReview` tests that a licence string is non-empty and nothing else. It never
    // compares the actor to the run's author and it never verifies the licence, so
    // every one of these sentences would assert a control the software does not have.
    for (const asserted of [
      /reviewer who is (deliberately )?not the author/i,
      /two people have (put their names|signed)/i,
      /verified licence/i,
      /licence is verified/i,
    ]) {
      expect(t, `the landing page matched ${asserted}`).not.toMatch(asserted);
    }
  });

  /* ---------------------------------------------------------------------
   * WHAT IT MUST GO ON SAYING.
   * ------------------------------------------------------------------ */

  it('devotes a section to what the product will not do', () => {
    // The five headings are load-bearing and they come from `content/shared.tsx`, so
    // this grips the page through the module both routes read rather than through a
    // literal that could be edited on one page and not the other.
    const lower = text().toLowerCase();
    for (const limit of LIMITS) {
      expect(lower, `missing limit: ${limit.heading}`).toContain(limit.heading.toLowerCase());
    }
    // And the substrings the site map calls load-bearing, asserted independently of
    // the module in case an item is ever renamed out from under them.
    for (const substring of [
      'does not design a building',
      'does not check life safety',
      'does not tell you what is realistically achievable',
      'does not decide the parking-in-far question',
      'does not replace a professional',
    ]) {
      expect(lower, `missing limit: ${substring}`).toContain(substring);
    }
  });

  it('leads with the binding capacity, not the flattering one', () => {
    const html = landing();
    // The governing capacity is the smallest of the three and is well under the
    // regulatory maximum. A hero that showed only the maximum would be a FAR
    // calculator with a logo.
    //
    // Both figures are read from the fixture rather than typed here, because a
    // literal in this file is the defect the fixture exists to close: the page said
    // 6,352.5 for months after the engine started returning 6,774.194, and a test
    // asserting the stale number was what kept it there.
    expect(html).toContain(group(V.governingGfaM2));
    expect(html).toContain(group(V.bandAM2));
    expect(html).toContain('binds');
    expect(Number(V.governingGfaM2)).toBeLessThan(Number(V.bandAM2));
  });

  it('shows the derivation of every figure it publishes, in the engine’s words', () => {
    const html = landing();
    // These strings come off the provenance graph, so a formula that drifted fails
    // here as loudly as a value that did. A re-typed formula drifts exactly as easily
    // as a re-typed value and less visibly.
    for (const formula of [
      V.formulas.bandA,
      V.formulas.bandB,
      V.formulas.bandC,
      V.formulas.governingGfa,
    ]) {
      expect(formula.length).toBeGreaterThan(10);
      expect(html).toContain(formula);
    }
  });

  it('names the plot and its frontages from the recorded input, never from a literal', () => {
    /*
      `PLOT_W`, `PLOT_D`, `COLLECTOR ROAD` and `LOCAL ROAD` were four literals in the
      view layer — four figures about the plot that the page could not source. A
      literal survives a fixture change silently, which is the whole failure mode.
    */
    const t = text();
    const roads = WORKED.input.plot.edges.filter((e) => 'roadHierarchy' in e);
    expect(roads.length).toBeGreaterThan(0);
    for (const edge of roads) {
      if (!('roadHierarchy' in edge)) continue;
      expect(t, `edge ${edge.seq} is not labelled from the input`).toContain(
        `${edge.roadHierarchy} ROAD`,
      );
    }
  });

  it('publishes no figure it computed itself', () => {
    /*
      `Number(V.coverageCapM2) - Number(V.footprintM2)` was a float subtraction done
      in the view layer to print a coverage margin — the one figure on the site that
      could not answer where it came from. The engine emits no
      `envelope.coverageHeadroomM2`, so the sentence is gone rather than restated, and
      it is not replaced by an em dash: a hyphen in a figure slot is a number the
      reader supplies themselves.
    */
    const t = text();
    const margin = String(Number(V.coverageCapM2) - Number(V.footprintM2));
    expect(t).not.toContain(group(margin));
    expect(t).not.toMatch(/coverage cap missed binding/i);
  });

  it('says the deployment is not ready, in the fold and again at the foot', () => {
    // A PRESENCE ASSERTION. `REGULATORY VALIDITY — NOT ASSESSED` sits beneath the
    // governing figure at equal weight and never smaller; a design pass that moved it
    // below the fold would leave every prohibition passing.
    const html = landing();
    const hero = html.slice(0, html.indexOf('id="capacities"'));
    expect(stripTags(hero)).toMatch(/regulatory validity — not assessed/i);

    const t = text();
    expect(t).toMatch(/no rule in it is approved/i);
    expect(t).toMatch(/annex is unsigned/i);
    expect(t).toMatch(/not a capacity assessment/i);
    expect(t).toMatch(/not quotable to a third party/i);
  });

  /* ---------------------------------------------------------------------
   * THE STYLESHEET, because a design pass edits CSS and not TSX.
   * ------------------------------------------------------------------ */

  it('declares amber nowhere outside the two selectors that are allowed it', () => {
    /*
      `--uncertain*` is reserved exclusively for uncertainty. `scripts/contrast.mjs`
      enforces the whitelist across all the stylesheets and is the gate; this asserts
      the same property from inside the suite that runs on every commit, because the
      failure it guards is a DESIGN PASS — an edit to this file, made for aesthetic
      reasons, by someone who ran the tests and not the checker.

      Two selectors, and both are the five-way claim statement's PARTIAL verdict: a
      partially-quantified claim is genuinely an uncertainty statement about that
      claim's support, and the chip is emitted from the same value as the row, so the
      two must carry one colour or the row says two things. Every other amber on this
      page arrives through the state layer in `site.css`.
    */
    const css = readFileSync(
      new URL('../src/styles/landing.css', import.meta.url),
      'utf8',
    ).replace(/\/\*[\s\S]*?\*\//g, '');

    const ALLOWED = /\.lp-claim--partial|\.lp-status--partial/;
    const offenders: string[] = [];
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = (m[1] ?? '').trim();
      const body = m[2] ?? '';
      if (!/var\(--uncertain/.test(body)) continue;
      if (!ALLOWED.test(selector)) offenders.push(selector);
    }
    expect(
      offenders,
      `landing.css paints amber outside the whitelist: ${offenders.join(' | ')}`,
    ).toEqual([]);
  });

  it('reserves the six-pixel rail for ASSUMED and writes no third width', () => {
    /*
      The greyscale and photocopy argument rests on a column of 6px marks reading as a
      POSITION rather than a hue, and position stops identifying ASSUMED the moment a
      second state shares the width. Amber and the accent separate by 1.21× in light,
      which on a photocopy is two mid-greys — so sharing the width collapses the one
      channel that survives the copier back into colour alone. No ratio check can see
      that, which is why it is an assertion.
    */
    const css = readFileSync(
      new URL('../src/styles/landing.css', import.meta.url),
      'utf8',
    ).replace(/\/\*[\s\S]*?\*\//g, '');

    expect(css).not.toMatch(/--rail-w-emphasis/);
    // Both widths are tokens, so any literal is a third one — and a physical
    // `border-left-width` is how the last 6px rail on this page slipped past a
    // checker that only reads the logical property.
    expect(css).not.toMatch(/border-(inline-start|left)(-width)?:\s*\d+px/);
  });
});
