/**
 * `/parking` — the prohibitions, rendered.
 *
 * OWNER: the `/parking` page agent. This file is the coverage `route-coverage.test.ts`
 * enumerates, and the shared scans it runs live in `prohibitions.ts` — so what is
 * asserted here is what is true of THIS page and nothing that is true of every page.
 * A page that re-implements the scans is a page that will fall behind them.
 *
 * ALMOST EVERY ASSERTION BELOW IS A PROHIBITION. A test that only checked the honest
 * copy was present would pass on a page that had added the dishonest sentence
 * underneath it, and on this page the dishonest sentence is a specific one that
 * three separate proposals wanted to write.
 *
 * THE ASSERTION THIS PAGE EXISTS FOR: that it never says, or implies, that the placed
 * rectangles produced the bay count. `computeBands` runs at `pipeline.ts:367` and
 * `planParkingLevel` at `:453`, so the placed level is strictly downstream of the
 * governing capacity and cannot inform it. The supply term is an available area
 * divided by an assumed factor. `pnpm example` diffs VALUES and not the claims
 * wrapped around them, so no other gate in this repository can catch that sentence —
 * which makes this file the only thing standing in front of it.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

// The SCREEN, not `PAGES`, as `landing.test.tsx` imports its page too. It used to be
// load-bearing as well as conventional — `SiteChrome` read `PAGES` at module scope and
// `pages.tsx` imports every screen, so entering that graph at `pages.js` evaluated
// `SiteChrome` while `PAGES` was still undefined. `page-meta.ts` ended the cycle, so this
// is now only the division of labour: `route-coverage.test.ts` asserts that this route
// dispatches to this component, and this file asserts what the component says.
import Parking from '../src/screens/Parking.js';
import WORKED from '../src/screens/worked-example.json' with { type: 'json' };
import {
  expectAssumedTreatmentPresent,
  expectNoCountInHeadings,
  expectSitewideProhibitions,
  group,
  stripTags,
} from './prohibitions.js';

const markup = (): string =>
  renderToStaticMarkup(
    <Parking navigate={() => {}} actor={null} setActor={() => {}} search="" />,
  );

/** Rendered markup with tags stripped and whitespace flattened, as a person reads it. */
const text = (): string => stripTags(markup()).replace(/\s+/g, ' ');

const V = WORKED.verified;

describe('/parking', () => {
  it('carries the site-wide prohibitions', () => {
    expectSitewideProhibitions(markup(), '/parking');
  });

  it('renders a heading, and no count in one', () => {
    // R8's mechanical half, enforced bluntly and with no allowlist: a regex cannot
    // tell an honest structural count from a marketing one and should not be asked
    // to. A count in a heading is exactly where a reader stops reading, and it is
    // the first thing to go stale.
    expect(markup()).toMatch(/<h1[^>]*>/);
    expectNoCountInHeadings(markup(), '/parking');
  });

  /* ---------------------------------------------------------------------
   * THE FALSE CAUSAL CLAIM
   * ------------------------------------------------------------------ */

  it('never says the placed rectangles produced the number', () => {
    const t = text();
    // Each of these is a phrasing an earlier draft of this page reached for. The
    // list is patterns rather than one sentence, because the claim is easy to make
    // by accident and hard to make in only one way.
    for (const forbidden of [
      /(rectangles|drawing|layout|level|placement)[^.]{0,60}\b(produced|produces|fixed|fixes|determined|determines|gives|gave)\b[^.]{0,40}\b(bay count|governing|capacity|band)/i,
      /\b(bay count|supply|band c|governing capacity)\b[^.]{0,60}\bcomes? from the (drawing|placement|rectangles|layout)/i,
      /\b(does not|never|rather than|instead of) divid\w*[^.]{0,40}\b(area|factor)/i,
      /\bplaces rectangles\b/i,
      /\bnot by dividing\b/i,
    ]) {
      expect(t, `/parking implies placement produced the number: ${forbidden}`).not.toMatch(
        forbidden,
      );
    }
  });

  it('says the supply is an area divided by a factor, and shows the factor as assumed', () => {
    // The converse obligation, and it is the one a prohibitions-only suite is blind
    // to: a page that merely avoided the false claim while also declining to name
    // the division would have made this page pointless. The amber treatment must be
    // RENDERED, not merely permitted — a design pass that tones it down has failed,
    // and no prohibition can see that.
    const t = text();
    expect(t).toMatch(/divided by an? (area )?factor|area divided by/i);
    expect(t).toContain(V.bayAreaFactorClass);
    expect(t).toContain(V.bayAreaFactorM2);
    expectAssumedTreatmentPresent(markup(), '/parking');
  });

  it('prints the assumption basis in full, from the fixture and not from a paraphrase', () => {
    // An assumption without a basis is a guess. A basis truncated on the page is the
    // same thing with better manners, so the whole engine-authored string is
    // asserted rather than a leading substring of it.
    expect(text()).toContain(V.bayAreaFactorBasis);
    expect(text()).toContain(WORKED.input.run.parkingUsableFraction.basis);
  });

  /* ---------------------------------------------------------------------
   * DEMAND IS NOT SUPPLY
   * ------------------------------------------------------------------ */

  it('labels the one bay figure it has, and invents neither of the two it does not', () => {
    const t = text();
    // `totalBays` is DEMAND at the probe scheme. Printed under a supply label it
    // would report a correct answer as a shortfall, which is the engine's own note.
    expect(t).toMatch(/demand, probe scheme/i);
    // The two quantities that are not serialised are named in words and never as a
    // figure. If the presenter ever adds them, this assertion is what has to be
    // deliberately removed — which is the point of writing it as a prohibition.
    expect(V).not.toHaveProperty('providedBays');
    expect(V).not.toHaveProperty('demandAtGoverningBays');
    expect(V).not.toHaveProperty('governingUnitCount');
    // And the level plan's own bay count is never presented as the supply figure.
    expect(
      t,
      '/parking presents the laid-out bay count as the parking supply',
    ).not.toMatch(/\bsupply\b[^.]{0,40}\bbays the layout placed\b/i);
  });

  /* ---------------------------------------------------------------------
   * R10 — WHICH BAND GOVERNS IS TEMPLATED, NEVER TYPED
   * ------------------------------------------------------------------ */

  it('takes the governing band from the fixture and never from a literal', () => {
    // `pnpm example` diffs values, not the claims wrapped around them, so a rule
    // edit that made another band bind would leave a typed sentence false with every
    // gate green.
    expect(text()).toContain(V.governingBand);
    // No heading may assert a governance at all — a heading is where a reader stops,
    // and it is the copy nobody re-reads when the fixture is regenerated.
    for (const m of markup().matchAll(/<h([123])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
      const heading = stripTags(m[2] ?? '');
      expect(heading, `a heading asserts a band: "${heading}"`).not.toMatch(
        /\b(parking|regulatory|geometry) (governs|binds|is the governing)\b/i,
      );
    }
  });

  /* ---------------------------------------------------------------------
   * CONFIDENTIAL THIRD-PARTY MATERIAL, AND THE DELETED RANGE
   * ------------------------------------------------------------------ */

  it('quotes no developer benchmark, target or unit-area cap', () => {
    const t = text();
    // Every one of these is a named third party's confidential commercial brief.
    // Rendering a figure prose-side rather than as a number does not make it
    // publishable, so the scan is over the rendered text and not over the JSX.
    for (const confidential of [
      /37\.5/,
      /\bper car\b/i,
      /93\s*[-–—]\s*97/,
      /\bsaleable[- ]to[- ]gfa range\b/i,
      /car ?park (minimum )?efficiency/i,
      /\bunit[- ]area cap\b/i,
    ]) {
      expect(t, `/parking carries confidential brief material: ${confidential}`).not.toMatch(
        confidential,
      );
    }
  });

  it('does not quote the deleted parking-in-FAR range, in any form', () => {
    const t = text();
    // The range was the weakest number available to this site and it is deleted.
    // §10 shows the measured spread for this actual plot instead, which is why the
    // fallback this assertion guards against would be a regression and not a
    // convenience.
    expect(t).not.toMatch(/15\s*[-–—]\s*35/);
    expect(t).not.toMatch(/\b15\s*(to|and)\s*35\s*(per cent|%)/i);
    // And the spread that IS printed comes off the endpoint, by its own keys.
    expect(t).toContain(group(V.parkingInFar.regulatorySpreadM2));
    expect(t).toContain(V.parkingInFar.verdict);
  });

  /* ---------------------------------------------------------------------
   * AMBER IS RESERVED, AND THE RAMP IS NOT AN ASSUMPTION
   * ------------------------------------------------------------------ */

  it('reaches amber through the three whitelisted carriers and through nothing else', () => {
    const html = markup();
    // A component that painted amber inline would bypass `assertAmberExclusive`
    // entirely: that checker reads stylesheets, and an inline style is not one.
    expect(html, '/parking paints amber from a component').not.toMatch(/var\(--uncertain/);
    // Every amber carrier in the markup is one of the three the state layer and the
    // contrast checker both recognise. Any fourth is a whitelist widened once per
    // page, which is not a whitelist.
    const WHITELISTED = new Set([
      'traced--assumed',
      'margin-tally',
      'margin-tally--none',
      'margin-tally__label',
    ]);
    const carriers = [...html.matchAll(/class="([^"]*)"/g)].flatMap((m) =>
      (m[1] ?? '').split(/\s+/),
    );
    for (const cls of carriers) {
      if (!/(assumed|partial|uncertain)|margin-tally/.test(cls)) continue;
      expect(
        WHITELISTED.has(cls),
        `/parking carries an amber-adjacent class the whitelist does not know: ${cls}`,
      ).toBe(true);
    }
    expect(html).toMatch(/traced--assumed|data-state="assumed"|margin-tally/);
  });

  it('never renders the amber treatment without the word beside it', () => {
    const html = markup();
    // Amber that does not say ASSUMED is amber a reader has to decode, which is the
    // failure §13.1 exists to prevent. The count of state carriers may never exceed
    // the number of times the page says the word.
    const amber = [...html.matchAll(/data-state="assumed"|traced--assumed/g)].length;
    const said = [...stripTags(html).matchAll(/\bassumed\b/gi)].length;
    expect(said, 'amber appears more often than the word ASSUMED does').toBeGreaterThanOrEqual(
      amber,
    );
  });

  it('draws the ramp as not assessed, never as an assumption', () => {
    const html = markup();
    // Only its plan area is reserved. Gradient, transitions and headroom are a
    // deferred fact, not a value somebody chose — and a deferred fact wearing the
    // assumption's colour, on the one drawing the client cares most about, is how
    // amber stops meaning anything.
    expect(html).toContain('parking-legend__swatch--ramp');
    expect(html).not.toMatch(/parking-legend__swatch--ramp[^"]*traced--assumed/);
    expect(stripTags(html)).toMatch(/gradient, transitions and headroom/i);
    expect(stripTags(html)).toMatch(/not assessed/i);
  });

  /* ---------------------------------------------------------------------
   * NO FIGURE IS TYPED, AND NO CLAUSE NUMBER IS EITHER
   * ------------------------------------------------------------------ */

  it('takes every figure it prints from the fixture', () => {
    const t = text();
    for (const printed of [
      group(V.bandCM2),
      group(V.governingGfaM2),
      group(V.totalBays),
      V.levelPlan.areaPerBayM2.value,
      V.levelPlan.standard.bayWidthM,
      V.levelPlan.standard.drivewayWidthM,
      V.levelPlan.packingRect.coveragePct,
      V.access.recommended.usableWindowM,
    ]) {
      expect(t, `/parking does not print ${printed} from the fixture`).toContain(printed);
    }
  });

  it('prints no clause number of its own', () => {
    const html = markup();
    // The clause reference the dimensions came from is a `Citation` the engine uses
    // internally and serialises for nothing, so §7 states the gap rather than
    // filling it. The engine's own access rationale strings DO carry a clause, and
    // they are quoted verbatim off the run — so the scan is over the page's own copy
    // with those strings removed, which is the only way to tell a typed clause
    // number from a quoted one.
    // `renderToStaticMarkup` escapes the quotation marks inside the engine's own
    // NOT ASSESSED strings, so an unescaped subtraction leaves the clause number
    // behind and this assertion fails on a page that typed nothing.
    let own = stripTags(html)
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, '&');
    for (const engineString of [
      ...V.levelPlan.notAssessed,
      ...V.access.candidates.map((c) => c.rationale),
      V.access.recommended.rationale,
      V.parkingInFar.verdict,
      V.bayAreaFactorBasis,
    ]) {
      own = own.split(engineString).join(' ');
    }
    expect(own, '/parking types a clause number into its own copy').not.toMatch(
      /\bB\.\d+(\.\d+)+/,
    );
    expect(own).not.toMatch(/\bTable B\.\d+/i);
  });

  /* ---------------------------------------------------------------------
   * THE PLACEHOLDER CITATION STATE, AND THE ROUTE THAT DOES NOT EXIST
   * ------------------------------------------------------------------ */

  it('says the seed citations are placeholders, and links to no rule library', () => {
    const t = text();
    expect(t).toMatch(/\[NOT SOURCED\]|not sourced/i);
    expect(t).toMatch(/placeholder/i);
    // There is no `/rules` route in this build, so the page states the fact rather
    // than linking to it. A dead href in the one section about unsourced citations
    // would be the page's own defect enacted.
    expect(markup(), '/parking links to a route that does not exist').not.toMatch(
      /href="\/rules/,
    );
  });

  /* ---------------------------------------------------------------------
   * R5, R12, R13
   * ------------------------------------------------------------------ */

  it('ends on a limit and not on a call to action', () => {
    const html = markup();
    const lastHeading = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].at(-1);
    expect(stripTags(lastHeading?.[1] ?? '')).toMatch(/did not prove/i);
    // Nothing after that heading is a primary CTA. A page that closes by selling has
    // spent the credibility the twelve sections above it just built.
    const tail = html.slice(html.lastIndexOf('<h2'));
    expect(tail, 'the last section carries a primary CTA').not.toMatch(/button--primary/);
  });

  it('animates no reveal by opacity', () => {
    // A scroll-driven animation holds its start state for anything that has never
    // entered a viewport, and "has never entered a viewport" is the permanent
    // condition of a printed page. The stylesheet half of this is `.reveal` in
    // `site.css`, which animates transform only; the half asserted here is that this
    // page never sets an opacity of its own on the way in.
    expect(markup()).not.toMatch(/opacity:\s*0/);
  });

  it('puts every wide block in its own labelled, focusable scroller', () => {
    const html = markup();
    // 2.1.1 applies to a scroller the way it applies to a control. `.schedule` sets
    // `overflow-x: auto`, so each instance needs a role, a name and a tab stop —
    // otherwise a keyboard user cannot reach content a mouse user can.
    const scrollers = [...html.matchAll(/<div class="schedule"[^>]*>/g)];
    expect(scrollers.length).toBeGreaterThan(0);
    for (const s of scrollers) {
      expect(s[0], 'a scroller has no region role').toContain('role="region"');
      expect(s[0], 'a scroller has no accessible name').toContain('aria-label=');
      expect(s[0], 'a scroller is not reachable by keyboard').toContain('tabindex="0"');
    }
  });

  it('renders no bare dash where a figure belongs', () => {
    // An em dash in a figure slot is a number the reader supplies themselves. Where
    // a figure did not arrive this page renders prose and names the owner of the
    // gap; it never renders a placeholder that looks like a value.
    expect(markup()).not.toMatch(/<span class="value">\s*[—–-]\s*<\/span>/);
  });
});
