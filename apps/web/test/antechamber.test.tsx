/**
 * `/app` — the antechamber, rendered.
 *
 * OWNER: the `/app` page. This file is the coverage `route-coverage.test.ts`
 * enumerates. The shared scans live in `prohibitions.ts` and run on every route, so
 * what is here is what is true of THIS page and nothing that is true of every page —
 * a page test that re-implements the scans is a page test that will fall behind them.
 *
 * Almost every assertion below is a PROHIBITION. This is the first screen behind
 * every public call to action, which makes it the page where a reassurance is
 * cheapest to add and most expensive to be wrong about: "your licence is verified"
 * would read better than anything the software actually does, and `canReview`
 * (`apps/api/src/identity.ts:88-90`) tests that a licence string is non-empty and
 * nothing else. A test that only asserted the honest sentence was present would pass
 * on a page that had added the reassurance underneath it.
 *
 * Two of these scans read the SOURCE rather than the markup, and each says why at
 * the point it does it. Neither is a substitute for a browser: `smoke.mjs` is what
 * measures the laid-out page, and nothing here proves what happens on a click.
 */

import { readFileSync } from 'node:fs';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

/*
  IMPORTED DIRECTLY, NOT THROUGH `PAGES`. This began as a workaround: `pages.tsx`
  imports `Dashboard.tsx`, which imported `SiteChrome.tsx`, which imported
  `pages.tsx` back — a cycle whose outcome depended on which module the runner
  reached first, and reaching `pages.tsx` first left `PAGES` undefined while
  `SiteChrome`'s module-scope `PRIMARY` was computed from it. The chrome now reads
  `page-meta.ts`, which imports no screen, so there is no cycle to enter from the
  wrong end and this import is a preference again: the assertions here are about the
  screen, and the route table is `route-coverage.test.ts`'s.
*/
import Antechamber from '../src/screens/Antechamber.js';
import {
  expectNoCountInHeadings,
  expectSitewideProhibitions,
  stripTags,
} from './prohibitions.js';

const Page = Antechamber;

const markup = (search = ''): string =>
  renderToStaticMarkup(
    <Page navigate={() => {}} actor={null} setActor={() => {}} search={search} />,
  );

/** The three states this page has, and every scan below runs over all three. */
const RENDERS: readonly (readonly [string, string])[] = [
  ['no hint', ''],
  ['the demo hint', '?demo=worked-example'],
  ['an unrecognised step', '?step=notastep'],
];

/**
 * The page's source WITH ITS COMMENTS REMOVED, and the removal is load-bearing.
 *
 * The module's own docblocks quote the line the scan below bans, in order to explain
 * why it is banned — so a scan over the raw file fails on the explanation and passes
 * on nothing. `shared-content.test.tsx` solves the same problem the same way, by
 * asserting over the strings rather than over the prose around them.
 */
const SOURCE = readFileSync(new URL('../src/screens/Antechamber.tsx', import.meta.url), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, ' ');
/**
 * The stylesheet, also with its comments removed, and for the same reason twice
 * over: the file's own header names the amber tokens in order to say it does not
 * paint them. `scripts/contrast.mjs` strips comments before any scan for exactly
 * this hazard — §2.0's record is that the comment celebrating a fix is what broke
 * the fix — and a scan written here without the same guard would have been the third
 * instance of that bug in this repository.
 */
const STYLES = readFileSync(new URL('../src/styles/antechamber.css', import.meta.url), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ');

/**
 * THE VOCABULARY OF A CONTROL THIS DEPLOYMENT DOES NOT HAVE.
 *
 * This list used to open "there is no password, no session and no token, so every
 * one of these describes a control this deployment does not have", and it banned
 * `sign-in`, `create an account` and `register` along with the rest.
 *
 * THAT PREMISE IS NOW FALSE FOR EXACTLY THREE OF THE NINE ENTRIES. There is a
 * password (scrypt, parameters in the hash), a session (a random token stored as
 * its SHA-256) and a cookie that script cannot read. A page that performs sign-in
 * and may not say "sign in" would have to describe it in a euphemism, which is a
 * worse outcome than the one the ban existed to prevent.
 *
 * So the list SPLITS rather than shrinks, and the half that remains is the half
 * whose premise still holds — plus two entries the account made newly dangerous.
 * `secure`, `authenticated` and `credential` stay because none of them is true of
 * what this screen actually does: an account proves who holds the account, and it
 * proves nothing about the licence typed beside it and enforces nothing about who
 * signs an export. `trusted` and `verified identity` are ADDED, because those are
 * the two sentences an account invites and neither is available.
 *
 * `authentication` is still deliberately absent as a bare stem, for the reason the
 * original gave: a ban on the stem forbids the denial along with the claim.
 */
const AUTHENTICATION_WORDS: readonly RegExp[] = [
  /\bsecure\b/i,
  /\bauthenticated\b/i,
  /\bcredential/i,
  /\btrusted\b/i,
  /\bverified identity\b/i,
];

/**
 * Verbs that would turn the licence field into a check.
 *
 * Not banned outright — the page's whole argument is made in the negative, and
 * *"not confirmed with anybody"* has to be sayable. They take the same negation
 * window `prohibitions.ts` gives `certified`: sixty characters, which is enough for
 * a clause and short enough that a denial two sentences earlier cannot launder a
 * claim in this one.
 */
const CHECKING_VERBS =
  /\b(verif(?:y|ies|ied|ication)|validat(?:e|es|ed)|confirm(?:s|ed)|check(?:s|ed|ing)?|looked up)\b/gi;
const NEGATION = /\b(not|never|no|neither|nor|without|isn't|is not|cannot|rather than)\b/i;

/**
 * The engine's step ids, as the unrecognised-step line prints them.
 *
 * `checks` is one of them, and it is a step name rather than a verb — so the scan
 * above would read the engine's own list of steps as a claim that something is
 * checked. The list is removed as one exact string rather than word by word: taking
 * out every `checks` would also take out a real claim written as one, which is the
 * failure a blunt exclusion hides.
 */
const STEP_LIST =
  'intake, plot, parameters, rules, assumptions, capacity, parking, checks, evidence, export';

describe('/app — the antechamber', () => {
  it('carries the site-wide prohibitions in every state it has', () => {
    for (const [label, search] of RENDERS) {
      expectSitewideProhibitions(markup(search), `/app (${label})`);
    }
  });

  it('opens on a heading, and puts no count in one', () => {
    // R8's mechanical half, enforced bluntly and with no allowlist: a regex cannot
    // tell an honest structural count from a marketing one and should not be asked
    // to. A count in a heading is exactly where a reader stops reading, and it is
    // the first thing to go stale.
    for (const [label, search] of RENDERS) {
      const html = markup(search);
      expect(html.match(/<h1\b/g) ?? [], `/app (${label}) does not have exactly one h1`)
        .toHaveLength(1);
      expectNoCountInHeadings(html, `/app (${label})`);
    }
  });

  it('never uses the vocabulary of authentication', () => {
    for (const [label, search] of RENDERS) {
      const text = stripTags(markup(search));
      for (const word of AUTHENTICATION_WORDS) {
        expect(text, `/app (${label}) matched ${word}`).not.toMatch(word);
      }
    }
  });

  it('never says the licence is checked, in any phrasing', () => {
    // The strongest sentence available to this page is that the licence is recorded
    // and confirmed with nobody. So the verbs are permitted only inside a denial,
    // and the assertion is that every occurrence is one.
    for (const [label, search] of RENDERS) {
      const text = stripTags(markup(search)).split(STEP_LIST).join(' ');
      for (const m of text.matchAll(CHECKING_VERBS)) {
        const before = text.slice(Math.max(0, m.index - 60), m.index);
        expect(
          NEGATION.test(before),
          `/app (${label}): "${m[0]}" appears unnegated: …${before}${m[0]}`,
        ).toBe(true);
      }
    }
  });

  it('never asserts a separation this deployment does not enforce', () => {
    // R11, and the sentence an earlier draft got backwards. `canReview` never
    // compares the actor to `run.createdByActorId`, so a page saying the reviewer
    // must be someone other than the author would describe a control that is not
    // there — and an asserted control is worse than a missing one, because a
    // missing one is visible.
    for (const [label, search] of RENDERS) {
      const text = stripTags(markup(search));
      for (const claim of [
        /\btwo people\b/i,
        /\bsecond person\b/i,
        /\bsomeone else\b/i,
        /\bmust be (?:a )?different\b/i,
        /\bseparation of duties is\s+(?!a control this software does not have)/i,
        /\bindependent(?:ly)? (?:reviewer|signed|verified)\b/i,
      ]) {
        expect(text, `/app (${label}) matched ${claim}`).not.toMatch(claim);
      }
    }
  });

  it('prints no figure of any kind', () => {
    // FIGURES: NONE. This page reads no fixture, so the cheapest honest guarantee
    // is the bluntest one — not one digit reaches the rendered text. It is stronger
    // than reviewing each sentence for a number, and it fails the moment somebody
    // pastes a bay count, a rule count or a readiness figure in here to warm the
    // page up. The unrecognised-step render is excluded only because the offending
    // id is the VISITOR's text, echoed back; it is asserted with a digit-free id
    // above, which is the part this page controls.
    for (const search of ['', '?demo=worked-example']) {
      expect(stripTags(markup(search)), `/app (${search}) prints a digit`).not.toMatch(/\d/);
    }
  });

  it('uses no amber, because it holds no assumed value', () => {
    // Amber reaches a page through `[data-state="assumed"]`, `.traced--assumed` or
    // `.margin-tally`, and through nothing else — the same set `assertAmberExclusive`
    // enforces in the stylesheets. There is no ASSUMED value on this page, so the
    // correct number of amber treatments is none, and a decorative one here would
    // teach a reader that amber means "look at this".
    for (const [label, search] of RENDERS) {
      const html = markup(search);
      for (const channel of [/data-state=["']assumed["']/, /traced--assumed/, /margin-tally/]) {
        expect(html, `/app (${label}) paints ${channel} with nothing assumed`).not.toMatch(
          channel,
        );
      }
    }
    expect(STYLES, 'antechamber.css reaches for amber').not.toMatch(/var\(--uncertain/);
  });

  it('writes no colour of its own in the stylesheet', () => {
    // Semantic tokens only. A hex here is a colour no theme swaps, no checker
    // measures and no reviewer can find.
    expect(STYLES, 'antechamber.css writes a hex value').not.toMatch(/#[0-9a-f]{3,8}\b/i);
    // And every selector stays behind the page's own root class, so six page
    // stylesheets written in parallel cannot restyle each other. `.ac` followed by
    // `_`, `-` or a word boundary: `_` is a word character, so a bare `\b` would
    // reject `.ac__title` and accept nothing this file actually writes.
    for (const rule of STYLES.matchAll(/([^{}]+)\{/g)) {
      const selector = (rule[1] ?? '').trim();
      if (!selector || selector.startsWith('@')) continue;
      for (const one of selector.split(',')) {
        expect(one.trim(), `antechamber.css leaks: ${one.trim()}`).toMatch(/^\.ac(?:[_-]|\b)/);
      }
    }
  });

  it('labels every field with a real label, never a placeholder', () => {
    // A placeholder disappears the moment a user types and is not an accessible
    // name. This is the positive half of that rule, and it is mechanical: every
    // input has an id, and some label points at it.
    for (const [label, search] of RENDERS) {
      const html = markup(search);
      expect(html, `/app (${label}) uses a placeholder`).not.toMatch(/placeholder=/);

      const inputIds = [...html.matchAll(/<input[^>]*\sid="([^"]+)"/g)].map((m) => m[1]);
      const labelFor = new Set([...html.matchAll(/<label[^>]*\sfor="([^"]+)"/g)].map((m) => m[1]));
      expect(inputIds.length, `/app (${label}) renders no field`).toBeGreaterThan(0);
      for (const id of inputIds) {
        expect(labelFor.has(id ?? ''), `/app (${label}): input ${id} has no <label for>`).toBe(
          true,
        );
      }
      // And every field carries a description, because the reader who skips the
      // prose still has to meet what the field does at the field.
      for (const m of html.matchAll(/<input[^>]*>/g)) {
        expect(m[0], `/app (${label}): a field carries no description`).toMatch(
          /aria-describedby="/,
        );
      }
    }
  });

  it('honours the deep-link hints instead of dropping them', () => {
    // A presence assertion, and it is here because no prohibition can catch the
    // failure it guards: a page that silently ignored `?step=` would pass every scan
    // above while quietly serving a different screen from the one the address asked
    // for, which is the defect `/404` exists to refuse and does not stop being that
    // inside `/app`.
    const unknown = stripTags(markup('?step=notastep'));
    expect(unknown).toContain('notastep');
    for (const step of [
      'intake',
      'plot',
      'parameters',
      'rules',
      'assumptions',
      'capacity',
      'parking',
      'checks',
      'evidence',
      'export',
    ]) {
      expect(unknown, `the unrecognised-step line does not name ${step}`).toContain(step);
    }

    // A step that exists is not narrated at somebody who asked for it.
    expect(stripTags(markup('?step=parking'))).not.toContain('There is no step called');

    // The demo hint is named rather than swallowed.
    expect(stripTags(markup('?demo=worked-example'))).toContain('worked example');
    expect(stripTags(markup(''))).not.toContain('worked example');
  });

  it('cannot rewrite the address it was given', () => {
    /*
      A SOURCE SCAN, and what it proves is narrow enough to state.

      The hint has to survive the submit. It does so by not being touched: the
      handler calls `setActor` and nothing else, and `Root` keeps the route while
      `useRouter` keeps `search`. The regression is a single plausible-looking line
      — `navigate('/app')` after the identity is set — which rewrites the URL
      without its query and lands a visitor who clicked "run this plot yourself" on
      a blank intake form. No unit test can click a button here (there is no DOM
      testing library in this workspace and adding one is a new dependency), so the
      line is banned in the file instead. This does not prove the hint survives; it
      proves the one edit that would break it is absent.
    */
    expect(SOURCE, 'the antechamber navigates to its own route').not.toMatch(
      /navigate\(\s*['"`]\/app/,
    );
    expect(SOURCE, 'the antechamber writes history itself').not.toMatch(/history\.(push|replace)State/);
    expect(SOURCE, 'the antechamber reads the address instead of its props').not.toMatch(
      /window\.location/,
    );
  });

  it('avoids the hand-written-copy vocabulary', () => {
    // `not yet` and `currently` are exempt on pages that render the engine's own
    // claim statement verbatim. This page renders no engine-authored string at all,
    // so the scan runs over the markup and the exemption does not apply.
    for (const [label, search] of RENDERS) {
      const text = stripTags(markup(search));
      for (const banned of [/\bnot yet\b/i, /\bcurrently\b/i]) {
        expect(text, `/app (${label}) matched ${banned}`).not.toMatch(banned);
      }
    }
  });

  it('calls the site by its public name and never by the engine name', () => {
    // TOP.ai is the site; ENVELOPE is the engine, and it belongs in a package name,
    // a file path and a code comment. A page that used it as the product name would
    // be a second name for the same thing on the page a visitor arrives at first.
    for (const [label, search] of RENDERS) {
      expect(stripTags(markup(search)), `/app (${label}) says ENVELOPE`).not.toMatch(
        /\bENVELOPE\b/,
      );
    }
  });
});
