/**
 * `/refusals` — the prohibitions, rendered.
 *
 * This file is the coverage `route-coverage.test.ts` enumerates, and the shared
 * scans it runs come from `prohibitions.ts`: a page test asserts what is true of
 * THIS page and nothing that is true of every page, because a page that
 * re-implements the scans is a page that will fall behind them.
 *
 * ALMOST EVERYTHING HERE IS A PROHIBITION. This is the page a reader forwards to
 * their lawyer, so it is also the page where one comfortable sentence does the most
 * damage — and a test that only asserted the honest copy was present would pass on
 * a page that had added the comfortable sentence underneath it. The three that are
 * PRESENCE assertions are marked as such and each one guards a failure that no
 * prohibition can see: a disclosure deleted is invisible to a regex looking for a
 * claim.
 *
 * THE ONE THIS PAGE EXISTS FOR is the reviewer gate. `canReview` tests that a
 * licence string is non-empty and nothing else; it is the only check the G4 handler
 * makes; it never compares the actor to the run's author. Four sentences asserting
 * a separation this software does not perform were caught in review across three
 * pages, so they are banned here by pattern — and the disclosure that replaces them
 * is asserted present, because an asserted control is worse than a missing one and
 * a deleted disclosure is how an asserted one comes back.
 */

import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

/*
  THE COMPONENT DIRECTLY, NOT THROUGH `PAGES`.

  `pages.tsx` imports every screen in the product, so a test that reaches this page
  through it evaluates all of them — and `SiteChrome` used to import `pages.tsx`
  back, which made any screen importing `SiteChrome` a cycle that left `PAGES`
  undefined at module-evaluation time, failing every other route's test with an error
  naming neither. The chrome reads `page-meta.ts` now and the cycle is gone; the
  direct import stays because `route-coverage.test.ts` already asserts that
  `PAGES['/refusals']` dispatches to a component, so nothing is gained by asserting it
  twice, and this file goes on testing this page while a sibling is mid-edit.
*/
import Refusals from '../src/screens/Refusals.js';
import SNAPSHOT from '../src/screens/readiness.json' with { type: 'json' };
import WORKED from '../src/screens/worked-example.json' with { type: 'json' };
import {
  BANNED_IN_HAND_WRITTEN_COPY,
  expectNoCountInHeadings,
  expectSitewideProhibitions,
  stripTags,
} from './prohibitions.js';

const Page = Refusals;

const markup = (): string =>
  renderToStaticMarkup(
    <Page navigate={() => {}} actor={null} setActor={() => {}} search="" />,
  );

/** What a reader reads: tags stripped, whitespace collapsed. */
const text = (): string => stripTags(markup()).replace(/\s+/g, ' ');

const SOURCE = readFileSync(new URL('../src/screens/Refusals.tsx', import.meta.url), 'utf8');

describe('/refusals', () => {
  it('carries the site-wide prohibitions', () => {
    expectSitewideProhibitions(markup(), '/refusals');
  });

  it('renders one heading, and no count in one', () => {
    // R8's mechanical half, enforced bluntly and with no allowlist: a regex cannot
    // tell an honest structural count from a marketing one and should not be asked
    // to. A count in a heading is exactly where a reader stops reading, and it is
    // the first thing to go stale. The page states "four gates" in body prose,
    // where the `Gate` type fixes the number and adding a fifth is a compile-time
    // event — and that sentence is the reason the rule is asserted over headings
    // rather than over the whole page.
    const html = markup();
    expect((html.match(/<h1\b/g) ?? []).length).toBe(1);
    expectNoCountInHeadings(html, '/refusals');
  });

  it('never counts its own refusals', () => {
    // The page argues that a corpus figure comes from a generated inventory or does
    // not appear. "Twelve refusals" is that same defect turned on the page itself,
    // and it is the figure a reader is most likely to quote back.
    expect(text()).not.toMatch(
      /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen)\s+refusals\b/i,
    );
  });

  it('asserts no control the software does not perform', () => {
    // R11, and every one of these was written by somebody in good faith before it
    // was checked against `identity.ts`. The handler tests that a licence string is
    // non-empty. It never compares the signer to the author, and it never verifies
    // the licence with anybody, so each of these sentences describes a control that
    // is not there.
    const t = text();
    for (const claimed of [
      /reviewer who is (deliberately )?not the author/i,
      /deliberately not the author/i,
      /requires? (a|the) (second|different) (person|reviewer)/i,
      /two people have put their names/i,
      /\b(verifies|verified|validates|validated|checks) the licence\b/i,
      /licence is (verified|validated|checked|confirmed)/i,
      /separation of duties is (enforced|guaranteed|required)/i,
    ]) {
      expect(t, `/refusals asserts a control it does not have: ${claimed}`).not.toMatch(
        claimed,
      );
    }
  });

  it('states that the reviewer is not checked against the author', () => {
    // PRESENCE, and it is here because the prohibition above cannot see a deletion.
    // A page that quietly dropped this paragraph would pass every scan in this file
    // and would then describe a gate that sounds like a control. This is the
    // strongest single item on the page; it is asserted rather than trusted.
    const t = text();
    expect(t).toMatch(/does not compare the person signing against the person who authored/i);
    expect(t).toMatch(/separation of duties is a control this software does not have/i);
    expect(t).toMatch(/does not verify the licence with anybody/i);
  });

  it('names the gates that stand in front of export, and no others', () => {
    // `EXPORT_GATES` is the assumption register and the named reviewer. The export
    // handler's own docblock says so, and the two further subject hashes it computes
    // are never read. `README.md` says "G1–G4" and is wrong in that exact way, so a
    // page that copied the README would be describing a control by inference.
    const t = text();
    expect(t).not.toMatch(/G1\s*[-–—]\s*G4/i);
    expect(t).not.toMatch(/all four gates/i);
    expect(t).toMatch(/assumption register and the named reviewer/i);
  });

  it('quotes no figure the engine has not produced, and no percentage at all', () => {
    // §22.2's inter-architect variance study has not been run, so there is no
    // accuracy figure; nothing on this page is a measurement, so there is no
    // percentage either. Asserted as the absence of the SYMBOL rather than of a
    // list of phrasings: a page with no measured quantity on it has no honest use
    // for one, and a bare `%` is the shortest form of every claim this site refuses.
    const t = text();
    expect(t).not.toMatch(/\d\s*%/);
    expect(t).not.toMatch(/\b\d+\s*(x|times)\s+(faster|quicker|cheaper)\b/i);
    // The WORD "accuracy" is not banned — the page has a row saying there is no
    // accuracy figure, and banning the noun would forbid the denial along with the
    // claim, which is the defect `prohibitions.ts` already corrected for
    // `certified`. What is banned is the claim: a qualifier in front of it, or a
    // number behind it.
    expect(t).not.toMatch(/\b(highly|very|extremely|proven|demonstrably)\s+accurate\b/i);
    expect(t).not.toMatch(/\baccuracy\s+of\s+\d/i);
    expect(t).not.toMatch(/\baccurate\s+to\s+(within\s+)?\d/i);
  });

  it('prints no date, anywhere', () => {
    // An owner is a plan; a date is a promise, and this product does not make those.
    // A year is the form the promise takes when it slips into a roadmap sentence.
    const t = text();
    expect(t).not.toMatch(/\b(19|20)\d{2}\b/);
    expect(t).not.toMatch(
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
    );
    expect(t).not.toMatch(/\bQ[1-4]\b/);
  });

  it('carries no confidential third-party figure, in numbers or in prose', () => {
    // A named developer's brief is confidential. Its saleable-to-GFA range, its
    // car-park efficiency benchmark and its unit-area caps are all commercial
    // expectations from a document that is not ours to publish — and rendering one
    // prose-side rather than as a number does not make it publishable.
    const t = text();
    expect(t).not.toMatch(/93\s*[-–—]\s*97/);
    expect(t).not.toMatch(/37\.5/);
    expect(t).not.toMatch(/28\s*[-–—]\s*35/);
    expect(t).not.toMatch(/15\s*[-–—]\s*35/);
    // A basis string is engine-authored prose, and one of them names a third
    // party's commercial range. None reaches this page verbatim.
    expect(t).not.toContain(WORKED.input.run.saleableEfficiency.basis);
    expect(t).not.toContain(WORKED.verified.bayAreaFactorBasis);
    expect(t).not.toMatch(/\bazizi\b/i);
  });

  it('makes no security-posture claim', () => {
    // `/security` is blocked pending a deployment-posture decision, and this page
    // says a badge is a claim rather than describing what is or is not protected.
    // A page that started describing the posture would be writing the blocked page
    // in the margin of this one.
    const t = text();
    for (const forbidden of [
      /\bSOC\s?2\b/i,
      /\bISO\s?\d/i,
      /role[- ]based access/i,
      /\bencrypt/i,
      /\bpenetration test/i,
      /\bauthorization\b/i,
      /\bauthorisation\b/i,
      /\bauthentication\b/i,
    ]) {
      expect(t, `/refusals makes a security-posture claim: ${forbidden}`).not.toMatch(
        forbidden,
      );
    }
  });

  it('uses amber nowhere, because it has no assumed value to spend it on', () => {
    // Amber is reserved exclusively for ASSUMED, and it reaches a page through
    // `[data-state="assumed"]`, `.traced--assumed` and `.margin-tally` and through
    // nothing else — the same set `assertAmberExclusive` enforces in the
    // stylesheets, so the test and the checker cannot drift into permitting
    // different things. This page publishes no assumed value, so it paints none of
    // the three. The WORD "amber" appears in the massing paragraph, describing what
    // the engine does; the colour does not.
    const html = markup();
    expect(html).not.toMatch(/data-state=["']assumed["']/);
    expect(html).not.toMatch(/traced--assumed/);
    expect(html).not.toMatch(/margin-tally/);
    expect(html).not.toMatch(/--uncertain/);
  });

  it('shows every deferred rule with the state of its own citation beside it', () => {
    // PRESENCE, and R9 is why. A rule id set beside a clause reference reads as a
    // regulation unless something in the same view says otherwise, and every seed
    // rule in this deployment names a placeholder instrument with clause text marked
    // not sourced. The chip has to be in the same eyeful — not in a footnote, and
    // never styled to look sourced.
    const html = markup();
    const t = text();
    expect(SNAPSHOT.deferred.length).toBeGreaterThan(0);
    for (const d of SNAPSHOT.deferred) {
      expect(t, `missing deferred rule ${d.ruleId}`).toContain(d.ruleId);
      expect(t, `missing clause for ${d.ruleId}`).toContain(d.citation.clauseReference);
    }
    // One not-sourced chip for every placeholder record, and the row carries the
    // deferred treatment rather than a neutral one.
    const placeholders = SNAPSHOT.deferred.filter(
      (d) => d.citation.instrumentId === 'PLACEHOLDER-NOT-A-REAL-INSTRUMENT',
    );
    expect((html.match(/not sourced/gi) ?? []).length).toBeGreaterThanOrEqual(
      placeholders.length,
    );
    expect((html.match(/data-state="deferred"/g) ?? []).length).toBeGreaterThanOrEqual(
      SNAPSHOT.deferred.length,
    );
    // And a life-safety constraint is named as one. A missing check reads as a check
    // that passed.
    if (SNAPSHOT.deferred.some((d) => d.isLifeSafety)) {
      expect(t).toMatch(/life safety/i);
    }
  });

  it('reads the realism discount from the fixture rather than typing it', () => {
    // The only figure on this page that comes from outside it. If the recorded run
    // ever carried a discount, this assertion follows it; a literal here would be
    // the defect the fixture exists to close, and the landing page has already been
    // caught printing a stale figure for months with a test asserting the stale one.
    expect(text()).toContain(WORKED.input.run.realismDiscount);
  });

  it('never names a real plot, a community or an affection plan', () => {
    // The corpus belongs to somebody else. This page argues that there is no case
    // study for exactly that reason, so quoting one on it would be the argument
    // refuting itself in the same eyeful.
    const t = text();
    expect(t).not.toContain(WORKED.input.plot.plotNumber);
    expect(t).not.toContain(WORKED.input.plot.community);
    expect(t).not.toMatch(/\bDJAZ\w+/i);
  });

  it('avoids the hand-written-copy vocabulary in its own source', () => {
    // *Not yet* and *currently* are banned in hand-written copy and asserted over
    // the SOURCE of the module, never over rendered markup: the site renders the
    // engine's own claim statement verbatim and that statement contains "NOT YET
    // MEASURED". Here the file is the unit of assertion and the exception
    // disappears — comments included, because a comment is where the vocabulary
    // gets rehearsed before it reaches the page.
    for (const banned of BANNED_IN_HAND_WRITTEN_COPY) {
      expect(SOURCE, `Refusals.tsx matched ${banned}`).not.toMatch(banned);
    }
  });

  it('ends on a limit rather than on a call to action', () => {
    // PRESENCE, and the third of three. R5 makes the last block of every page what
    // that page did not prove, and the failure it guards is a design pass that moves
    // a persuasive block to the bottom because that is where a landing page puts
    // one. The completeness of this list is the thing this page cannot demonstrate,
    // and it says so last.
    const t = text();
    expect(t).toMatch(/what this page did not prove/i);
    expect(t.lastIndexOf('did not prove')).toBeGreaterThan(t.indexOf('refusal contract'));
  });
});
