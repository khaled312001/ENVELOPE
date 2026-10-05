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
 * THE STATUS DASHBOARD IS NOT HERE. It moved to `readiness.test.tsx`, and it was
 * MOVED rather than copied: while its assertions lived in this file, `/readiness`'s
 * coverage was invisibly supplied by `/`'s filename, so `route-coverage.test.ts`
 * could not tell a route with a test from a route without one.
 *
 * THE ARABIC PAGE IS RENDERED TOO, at the bottom of this file, because a translation
 * is exactly where every guarantee above can fail without an English test noticing:
 * a figure re-typed into a sentence, a basis string translated, a refusal softened,
 * a claim moved up the list. Its grips read the Arabic dictionary and `LIMITS_AR`
 * rather than Arabic literals here, for the reason the English grips read `LIMITS`.
 */

import { readFileSync } from 'node:fs';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LIMITS_AR } from '../src/content/shared.ar.js';
import { LIMITS } from '../src/content/shared.js';
import { AR } from '../src/i18n/landing.ar.js';
import { StaticLocale } from '../src/i18n/locale.js';
import { Landing } from '../src/screens/Landing.js';
import WORKED from '../src/screens/worked-example.json' with { type: 'json' };
import {
  arabicReadingText,
  expectAssumedTreatmentPresent,
  expectClaimOrder,
  expectNoEnglishProse,
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
    /*
      RE-POINTED 5 Oct 2026 FOR THE REBUILT PAGE, AND THE ASSERTION GOT STRONGER.

      This used to require `aria-expanded="true"` on the hero's disclosure. That
      was the right check for a page whose assumption lived inside a panel that
      could ship closed. The rebuilt page has no panel there at all: the class
      token, the factor and the engine's basis are rendered unconditionally
      beside the governing figure. "Not behind a closed disclosure" is what the
      old assertion was buying, so it is now asserted DIRECTLY — the statement
      must not sit inside a `<details>` that lacks `open`.

      The `data-state="assumed"` hook stays required. The client removed the
      amber colour on 5 Oct; the attribute is what the colour used to hang from,
      and it is what still makes the distinction legible in greyscale print and
      to a reader who cannot separate the hues.
    */
    const html = landing();
    const fold = html.slice(0, html.indexOf('id="does"'));
    expect(fold, 'the fold boundary moved — this test is reading the whole page').not.toBe(
      '',
    );

    expect(fold).toContain(V.bayAreaFactorM2);
    expect(fold, 'the provenance class is not announced as text').toContain(
      V.bayAreaFactorClass,
    );
    expect(fold, 'the basis is truncated or missing').toContain(V.bayAreaFactorBasis);
    expect(fold, 'the assumption is a state, not a grey note mentioning one').toMatch(
      /data-state="assumed"/,
    );

    // And it is not shut away: no closed <details> stands between the top of the
    // page and the assumption.
    const beforeAssumption = fold.slice(0, fold.indexOf('data-state="assumed"'));
    const closedDetails = (beforeAssumption.match(/<details(?![^>]*\sopen)/g) ?? []).length;
    const endedDetails = (beforeAssumption.match(/<\/details>/g) ?? []).length;
    expect(
      closedDetails - endedDetails,
      'the assumption is inside a disclosure that ships closed',
    ).toBeLessThanOrEqual(0);
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

  it("quotes the answer's levels beside the 3D model, never the ceiling's as if they were built", () => {
    /*
      The model stands to the height ceiling and the answer uses less of it — 5 of 14
      on this plot. A caption that printed only the ceiling's count beside a picture of
      the whole stack would be the most persuasive wrong statement on the site.
    */
    /*
      RE-POINTED 5 Oct 2026. The rebuilt page carries no 3D model and no plan —
      the client cut the page to headings and buttons, and the massing moved to
      the engine where it is drawn from the run rather than from a fixture. The
      CLAIM the test was defending is not about a picture: it is that the page
      must never print the ceiling's level count as if those levels were built.
      So both counts are still required, together, wherever the page states them.
    */
    const t = text().replace(/\s+/g, ' ');
    expect(t).toContain(
      `Levels the answer places ${V.levels} of ${V.maxLevelsByHeight} the height permits`,
    );
    // The ceiling's count never appears without the answer's beside it.
    const ceilingAlone = new RegExp(`\b${V.maxLevelsByHeight}\b(?![^]{0,80}${V.levels}\b)`);
    expect(
      t.replace(
        `Levels the answer places ${V.levels} of ${V.maxLevelsByHeight} the height permits`,
        '',
      ),
      'the height ceiling is printed without the answer beside it',
    ).not.toMatch(ceilingAlone);
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

/* =========================================================================
 * `/` IN ARABIC.
 *
 * The same page, rendered through `StaticLocale` — `renderToStaticMarkup` runs no
 * effects and has no storage, so `LocaleProvider` could only ever render English
 * here, and every Arabic string on the page would otherwise be rendered by nothing
 * until a browser opened it.
 *
 * The assertions are the English ones asked again of a second language, and the
 * ones that matter most are the ones only a second language can fail: that no figure
 * was re-typed into a sentence, that no engine string was translated, and that the
 * refusal is still last.
 * ====================================================================== */

const arabic = (): string =>
  renderToStaticMarkup(
    <StaticLocale locale="ar">
      <Landing navigate={() => {}} />
    </StaticLocale>,
  );
const arabicText = (): string => stripTags(arabic()).replace(/\s+/g, ' ');

/** Every run of digits a reader sees, de-grouped — the English test's own scan. */
const figuresIn = (t: string): string[] =>
  [...new Set([...t.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => m[0].replace(/,/g, '')))].sort();

describe('/ in Arabic', () => {
  it('carries every site-wide prohibition', () => {
    // The scans are English regexes and most of them cannot fire on Arabic prose.
    // They run anyway, because an Arabic page still carries English: every basis,
    // formula and token the engine wrote, and a component another pass translated.
    expectSitewideProhibitions(arabic(), 'the Arabic landing page');
  });

  it('leaves no English prose outside Verbatim', () => {
    // A page that passes everything else with one paragraph left in English looks
    // finished in two languages at once — the i18n form of a hidden default.
    expectNoEnglishProse(arabic(), 'the Arabic landing page');
  });

  it('prints the same figures as the English page, and not one more', () => {
    /*
      NO FIGURE WAS RE-TYPED INTO A SENTENCE. A translator writing «6774.194» into an
      Arabic string would produce a page that is right today and wrong the day the
      engine moves — the exact defect the fixture exists to close, one language
      further from anyone who would notice.

      Two figures are gripped by name, both read off the fixture: the governing
      capacity, which is the page's answer, and the headroom above it, which is the
      one figure the Arabic verdict wraps in a different word order. Then the
      stronger property: the SET of figures a reader sees is identical in both
      languages, so nothing was added, dropped or rounded in translation. The English
      set is held to the fixture by the test above.
    */
    const en = text();
    const ar = arabicText();
    for (const figure of [group(V.governingGfaM2), group(V.headroomToNextM2)]) {
      expect(en, `${figure} is missing from the English page`).toContain(figure);
      expect(ar, `${figure} is missing from the Arabic page`).toContain(figure);
    }
    expect(figuresIn(ar)).toEqual(figuresIn(en));
  });

  it('carries every engine string in the language the engine wrote it in', () => {
    /*
      A basis string is a record of why a number was assumed, signed at G4 — a
      translated one is a second record nobody issued. So each of these is asserted
      PRESENT in the markup and ABSENT from the Arabic reading text, which is the
      page minus what `Verbatim` marks `lang="en"`. Present-but-unwrapped fails the
      second half; translated fails the first.
    */
    const markup = arabic();
    const reading = arabicReadingText(markup);
    for (const emitted of [
      V.bayAreaFactorBasis,
      V.formulas.bandA,
      V.formulas.bandB,
      V.formulas.bandC,
      V.formulas.governingGfa,
      V.governingBand,
      V.nextBindingBand,
      V.bayAreaFactorClass,
      V.levelPlan.bayCount.provenanceClass,
    ]) {
      expect(markup, `the engine's "${emitted}" is missing`).toContain(emitted);
      expect(reading, `the engine's "${emitted}" is outside Verbatim`).not.toContain(emitted);
    }
  });

  it('keeps the assumed factor and its basis in the same view as the governing figure', () => {
    // A PRESENCE ASSERTION, asked again of the Arabic page: the hero ships open, the
    // amber treatment is rendered, and the basis sits beside the figure in full.
    // Re-pointed 5 Oct 2026 with its English counterpart: the rebuilt page has no
    // disclosure in the fold, so "ships open" is asserted as "is rendered".
    const html = arabic();
    const fold = html.slice(0, html.indexOf('id="does"'));
    expectAssumedTreatmentPresent(fold, 'the Arabic landing page fold');
    expect(fold).toContain(group(V.governingGfaM2));
    expect(fold).toContain(V.bayAreaFactorM2);
    expect(fold).toMatch(/data-state="assumed"/);
    expect(fold, 'the basis is truncated or not Verbatim').toContain(
      `lang="en" class="verbatim">${V.bayAreaFactorBasis}<`,
    );
  });

  it('states all five claims, in §16.5 order, with the refusal last', () => {
    /*
      The Arabic titles are read from the dictionary and found by their claim-title
      element, not by bare text. Arabic has no capitals, so the fold's status stamp
      «الصلاحية التنظيمية — لم تُقيَّم» opens with the fifth title's own words — the
      trick the English stamp uses to stay out of `expectClaimOrder`'s way is not
      available, and a bare `indexOf` would measure the stamp instead of the table.
    */
    const html = arabic();
    const c = AR.claims;
    const order = [c.selfConsistency, c.coverage, c.geometry, c.judgement, c.regulatory].map(
      (claim) => html.indexOf(`<span class="lp-claim__title">${claim.title}</span>`),
    );
    expect(order.every((i) => i >= 0), 'the Arabic page does not state all five claims').toBe(
      true,
    );
    expect([...order].sort((a, b) => a - b), 'the Arabic claims are out of order').toEqual(order);
    expect(arabicText()).toContain(c.regulatory.status);
  });

  it('renders the five shared refusals from LIMITS_AR, and none from LIMITS', () => {
    // The same paragraphs `/refusals` renders, from the one Arabic module both pages
    // read. An English heading here would mean the switch was forgotten.
    const ar = arabicText();
    for (const limit of LIMITS_AR) {
      expect(ar, `missing refusal: ${limit.heading}`).toContain(limit.heading);
    }
    for (const limit of LIMITS) {
      expect(ar, `English refusal on the Arabic page: ${limit.heading}`).not.toContain(
        limit.heading,
      );
    }
  });

  it('templates the verdict from the fixture, in Arabic word order', () => {
    // R10 in Arabic: the dictionary holds the four stretches of sentence and no band
    // name; the tokens and the headroom are the fixture's. Whitespace is squashed
    // because `Verbatim` adds element boundaries a reader does not see.
    const squash = (s: string): string => s.replace(/\s+/g, '');
    const v = AR.capacities.verdict;
    expect(squash(arabicText())).toContain(
      squash(
        `${v.before}${V.governingBand}${v.between}${V.nextBindingBand}${v.after}` +
          `${group(V.headroomToNextM2)} m²${v.end}`,
      ),
    );
  });

  it('names each frontage from the recorded input, never from a literal', () => {
    const html = arabic();
    for (const edge of WORKED.input.plot.edges) {
      if (!('roadHierarchy' in edge)) continue;
      expect(html).toContain(AR.figure.edge(edge.classification, edge.roadHierarchy));
      expect(html, 'the drawing still carries the English road label').not.toContain(
        `${edge.roadHierarchy} ROAD`,
      );
    }
  });

  it('claims no permission, and uses «مطابقة» and «افتراضي» only negated', () => {
    /*
      `arabic.test.ts` holds each dictionary's SOURCE to the glossary. This holds the
      RENDERED page, which also carries `LIMITS_AR` and the components another pass
      translated — the words a reader actually meets on `/`.

      «ما يمكن بناؤه» is the Arabic of the h1 this page was rewritten to stop
      writing. «مطابق» predicated of an output says the opposite of the product;
      «افتراضي» is "default", and may appear only in a sentence that denies one.
    */
    const reading = arabicReadingText(arabic());
    expect(reading).not.toMatch(/يمكن بناؤه/u);
    const negated = /(ليس|ليست|لا|غير|ولا|وليس|بلا|دون)\s+([؀-ۿ]+\s+){0,2}$/u;
    for (const hit of reading.matchAll(/[؀-ۿ]*(مطابق|افتراضي)[؀-ۿ]*/gu)) {
      const before = reading.slice(Math.max(0, (hit.index ?? 0) - 40), hit.index);
      expect(negated.test(before), `«${hit[0]}» unnegated after «${before.trim()}»`).toBe(true);
    }
  });

  it('says the deployment is not ready, in the fold and again at the foot', () => {
    // A PRESENCE ASSERTION. The refusal sits beneath the answer at equal weight in
    // Arabic as in English; a translation that let it slip below the fold would pass
    // every prohibition above.
    const html = arabic();
    const hero = html.slice(0, html.indexOf('id="capacities"'));
    expect(stripTags(hero)).toContain(AR.validity.stamp);
    expect(arabicText()).toContain(AR.readiness.body);
  });
});
