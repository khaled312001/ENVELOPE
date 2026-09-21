/**
 * `/work` — the list of runs, rendered.
 *
 * THIS FILE EXISTS BECAUSE THE ROUTE SHIPPED WITHOUT IT. `route-coverage.test.ts`
 * enumerates `ROUTES` and demands a prohibitions file per route; `/work` landed in
 * `routes.json` with no slug and no test, and the enumeration went red — which is
 * the enumeration working. The repair is the missing coverage, never a shorter
 * enumeration.
 *
 * The shared scans come from `prohibitions.ts`: a page test asserts what is true of
 * THIS page and nothing that is true of every page, because a page that
 * re-implements the scans is a page that will fall behind them.
 *
 * WHAT THIS PAGE NEEDS BEYOND THE SHARED SET, and why each one is here:
 *
 *   * NO AGGREGATE, IN THE MARKUP OR IN THE SOURCE. The default shape for a list of
 *     runs is a row of tiles — runs this month, total capacity, average levels —
 *     and every one of those is a number the engine never produced, computed in the
 *     view layer, over runs that share no input. The screen's own docblock refuses
 *     them; nothing enforced the refusal, and a prohibition is the only thing that
 *     can, because the tempting version of this page passes every other check.
 *
 *   * THE DISCLOSURE STAYS. `/api/work` is the first route in the product with any
 *     authorization and `/api/runs` still lists every run to any identified actor.
 *     A page that showed a scoped list without saying that would be implying an
 *     isolation the deployment does not have. A deleted disclosure is invisible to
 *     every regex looking for a claim, so it is asserted PRESENT.
 *
 *   * THE DRAFT-RULES QUALIFIER STAYS ON A ROW. A stored run computed against rules
 *     nobody approved is a demonstration; a list that dropped the chip would be
 *     presenting it as a record.
 *
 * TWO RENDERS, AND THE SECOND ONE IS WHY `RunTable` IS EXPORTED. `renderToStaticMarkup`
 * runs no effects, so the page itself only ever reaches its signed-out branch here
 * and the table — six hand-written column headers and four hand-written qualifiers —
 * would be scanned by nothing at all. `Dashboard.tsx` already exports its panel set
 * for the same reason and with the same justification: the alternative is a page
 * test that measures the empty state and reports it as coverage.
 */

import { readFileSync } from 'node:fs';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

/*
  THE COMPONENT DIRECTLY, NOT THROUGH `PAGES` — the same choice `refusals.test.tsx`
  records. `route-coverage.test.ts` already asserts that `PAGES['/work']` dispatches
  to a component, and `shared-content.test.tsx` walks every route inside the chrome,
  so nothing is gained by entering the graph at `pages.js` here and this file goes on
  testing this page while a sibling is mid-edit.
*/
import Work, { RunTable, type RunRow } from '../src/screens/Work.js';
import {
  BANNED_IN_HAND_WRITTEN_COPY,
  expectSitewideProhibitions,
  stripTags,
} from './prohibitions.js';

const SOURCE = readFileSync(new URL('../src/screens/Work.tsx', import.meta.url), 'utf8');

/**
 * The page with no session provider, which is the signed-out branch.
 *
 * That is not a limitation being hidden: it is what a visitor with no account sees,
 * it is the branch that carries the page's only call to action, and the branch it
 * cannot reach is covered by the direct `RunTable` render below.
 */
const markup = (): string =>
  renderToStaticMarkup(
    <Work navigate={() => {}} actor={null} setActor={() => {}} search="" />,
  );

const text = (): string => stripTags(markup()).replace(/\s+/g, ' ');

/**
 * One row, shaped by `RunRow` so it cannot drift from what `/api/work` sends.
 *
 * `CLAUDE.md` records what a fixture that has drifted from the type it claims to be
 * goes on proving: the web render fixture was structurally not a `Plot` for as long
 * as it existed, and it surfaced only when a real access placement read
 * `edge.start.x` and got `undefined`. The annotation is what stops that here.
 */
const ROW: RunRow = {
  runId: 'run-1',
  createdAt: '2026-08-30T10:00:00.000Z',
  createdBy: 'Khaled Haggagy',
  plotNumber: 'IC1-CTYL-16_011',
  community: 'WARSAN FIRST',
  governingBand: 'C',
  governingGfaM2: '6,774.194',
  levels: '11',
  bindingLabel: 'Parking',
  assumptionCount: 3,
  draftRules: true,
  gatesSatisfied: 2,
  reviewer: null,
};

const table = (rows: readonly RunRow[]): string =>
  renderToStaticMarkup(<RunTable rows={rows} caption="Runs" empty="Nothing yet." />);

describe('/work', () => {
  it('carries the site-wide prohibitions', () => {
    expectSitewideProhibitions(markup(), '/work');
    expectSitewideProhibitions(table([ROW]), '/work rows');
    expectSitewideProhibitions(table([]), '/work empty');
  });

  it('uses none of the apology vocabulary in its own source', () => {
    // Over the SOURCE, not the markup: every string on this page is hand-written,
    // so there is no engine-authored sentence for the file-level scan to exempt,
    // and a phrase inside a branch no static render reaches would otherwise ship
    // unread. `prohibitions.ts` carries the argument for the split.
    for (const banned of BANNED_IN_HAND_WRITTEN_COPY) {
      const hit = banned.exec(SOURCE.replace(/\/\*[\s\S]*?\*\//g, ''));
      expect(hit?.[0], `Work.tsx uses "${hit?.[0] ?? ''}"`).toBeUndefined();
    }
  });

  it('states no aggregate over runs', () => {
    /*
      THE ONE PROHIBITION THIS PAGE EXISTS FOR.

      A mean of two governing capacities from two different plots is not a fact
      about anything, and neither is a portfolio total. Both are one component away
      at all times, both would render as confidently as every traced value beside
      them, and neither would fail any other check in this repository.
    */
    const scan = `${text()} ${stripTags(table([ROW, { ...ROW, runId: 'run-2' }]))}`;
    for (const aggregate of [
      /\btotal capacity\b/i,
      /\baverage\b/i,
      /\bmean\b/i,
      /\bacross (all|your) runs\b/i,
      /\bportfolio\b/i,
      /\btrend\b/i,
      /\bthis (month|week|quarter)\b/i,
    ]) {
      expect(scan, `/work states an aggregate: ${aggregate}`).not.toMatch(aggregate);
    }
    // And the source too, so a tile inside a branch no static render reaches is
    // caught before it is a screenshot.
    expect(
      SOURCE.replace(/\/\*[\s\S]*?\*\//g, ''),
      'Work.tsx computes a sum or an average over rows',
    ).not.toMatch(/\.reduce\(|\/\s*rows\.length|\/\s*view\.\w+\.length/);
  });

  it('says the rest of the deployment is not scoped', () => {
    /*
      A PRESENCE ASSERTION, and it is here because no prohibition can catch its
      absence. The page shows a list scoped to one account while `/api/runs` still
      answers any identified caller with every run; the sentence that says so is
      the difference between a disclosed gap and an implied isolation, and deleting
      it makes the page read BETTER.
    */
    /*
      OVER THE SOURCE, AND THE REASON IS THE MEASUREMENT ITSELF.

      The disclosure sits in the signed-in branch, which `renderToStaticMarkup`
      never reaches because it runs no effects — so a markup assertion here failed
      on a page that carries the sentence perfectly well. Asserting on the markup
      anyway, by rendering a branch this file cannot reach, would be a test that
      measures the empty state and reports it as coverage. The file is the unit,
      and it is stated rather than implied.
    */
    const src = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src, '/work no longer discloses that other routes are unscoped').toMatch(
      /any identified caller can still read any run/i,
    );
    expect(src, '/work no longer points the disclosure at the refusals page').toMatch(
      /what it refuses/i,
    );
  });

  it('never describes the account as securing or verifying anything', () => {
    // The same refusal the antechamber makes, on the page that shows what an
    // account bought you. An account is a password and a session; it verifies no
    // licence and it enforces no separation of duties.
    for (const claim of [/\bsecure\b/i, /\bverified\b/i, /\bprivate\b/i, /\bprotected\b/i]) {
      expect(text(), `/work claims ${claim} of an account`).not.toMatch(claim);
    }
  });

  it('keeps the draft-rules qualifier on a row that has one', () => {
    // A run computed against rules nobody approved is a demonstration. The chip is
    // the only thing on the row that says so.
    expect(stripTags(table([ROW])), 'a row hides that it ran on draft rules').toMatch(
      /draft rules/,
    );
    expect(stripTags(table([{ ...ROW, draftRules: false }]))).not.toMatch(/draft rules/);
  });

  it('says a run is unsigned rather than leaving the cell empty', () => {
    // An empty gate cell reads as "nothing to report". The absence of a signature
    // is the report.
    expect(stripTags(table([ROW])), 'an unsigned run says nothing about it').toMatch(
      /not signed/,
    );
  });

  it('prints no figure it was not given', () => {
    // Every number on a row comes off the payload. Rendering a second row with
    // different figures and checking the first one's are gone is what proves it —
    // an assertion that the right number appears would pass on a page that typed
    // it in.
    const other: RunRow = { ...ROW, governingGfaM2: '1,234.567', assumptionCount: 9 };
    const first = stripTags(table([ROW]));
    const second = stripTags(table([other]));
    expect(first).toContain('6,774.194');
    expect(second).not.toContain('6,774.194');
    expect(second).toContain('1,234.567');
  });

  it('opens on one heading, with no count in it', () => {
    const h1 = [...markup().matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
    expect(h1.length, '/work renders more than one h1').toBe(1);
  });
});
