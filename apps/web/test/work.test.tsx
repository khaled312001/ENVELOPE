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
 *   * THE DISCLOSURE STAYS. Every run route is now scoped to the run's author and
 *     the accounts it was shared with, but there are no firms or projects and a
 *     reviewer's licence is never checked. A page that showed a scoped list without
 *     saying that would be implying an isolation the deployment does not have. A
 *     deleted disclosure is invisible to every regex looking for a claim, so it is
 *     asserted PRESENT.
 *
 *   * THE DRAFT-RULES QUALIFIER STAYS ON A ROW. A stored run computed against rules
 *     nobody approved is a demonstration; a list that dropped the chip would be
 *     presenting it as a record.
 *
 * TWO RENDERS, AND THE SECOND ONE IS WHY `RunTable` IS EXPORTED. `renderToStaticMarkup`
 * runs no effects, so the page itself only ever reaches its signed-out branch here
 * and the table — six hand-written column headers and four hand-written qualifiers —
 * would be scanned by nothing at all. `Readiness.tsx` already exports its panel set
 * for the same reason and with the same justification: the alternative is a page
 * test that measures the empty state and reports it as coverage.
 *
 * ---------------------------------------------------------------------------
 * THE SOURCE IS NOW THREE FILES, AND EVERY SOURCE ASSERTION FOLLOWED ITS STRING.
 *
 * The page's copy moved into `i18n/work.en.ts` and `i18n/runPage.en.ts`, so a
 * presence assertion that read `Work.tsx` alone would now fail on a page that
 * carries the sentence — and a prohibition that read it alone would pass on a
 * dictionary that added the claim. Each one reads the component AND its dictionary,
 * and the refusals are held in the Arabic dictionary as well: a disclosure that is
 * present in English and dropped in Arabic is the defect a reader of one language
 * can never see.
 *
 * The Arabic renders at the end go through `StaticLocale`, because
 * `renderToStaticMarkup` runs no effects and `LocaleProvider` could only ever
 * render English here.
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
import { AR as CHROME_AR } from '../src/i18n/chrome.ar.js';
import { StaticLocale } from '../src/i18n/locale.js';
import { AR as RUN_AR } from '../src/i18n/runPage.ar.js';
import { EN as RUN_EN } from '../src/i18n/runPage.en.js';
import { AR as WORK_AR } from '../src/i18n/work.ar.js';
import { ReviewPanel, type ReviewSubject } from '../src/screens/RunPage.js';
import Work, { RunTable, type RunRow } from '../src/screens/Work.js';
import {
  arabicReadingText,
  BANNED_IN_HAND_WRITTEN_COPY,
  expectNoEnglishProse,
  expectSitewideProhibitions,
  pageProps,
  stripTags,
} from './prohibitions.js';

/** A module's source with its comments removed: comments discuss rejected words to reject them. */
const stripped = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const SOURCE = readFileSync(new URL('../src/screens/Work.tsx', import.meta.url), 'utf8');
/** The page's English copy, which used to be inline in `SOURCE`. */
const DICT = stripped('../src/i18n/work.en.ts');
/** And its Arabic, held to the same refusals in meaning. */
const DICT_AR = stripped('../src/i18n/work.ar.ts');

/**
 * The page with no session provider, which is the signed-out branch.
 *
 * That is not a limitation being hidden: it is what a visitor with no account sees,
 * it is the branch that carries the page's only call to action, and the branch it
 * cannot reach is covered by the direct `RunTable` render below.
 */
const markup = (): string =>
  renderToStaticMarkup(
    <Work {...pageProps()} />,
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
    // unread. `prohibitions.ts` carries the argument for the split. The copy now
    // lives in the dictionary, so the dictionary is scanned with the component.
    for (const banned of BANNED_IN_HAND_WRITTEN_COPY) {
      const hit = banned.exec(SOURCE.replace(/\/\*[\s\S]*?\*\//g, ''));
      expect(hit?.[0], `Work.tsx uses "${hit?.[0] ?? ''}"`).toBeUndefined();
      const inDict = banned.exec(DICT);
      expect(inDict?.[0], `work.en.ts uses "${inDict?.[0] ?? ''}"`).toBeUndefined();
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
    // The signed-in branch's words are in the dictionary now, where no render here
    // reaches them — so the dictionary is held to the same list.
    for (const aggregate of [
      /\btotal capacity\b/i,
      /\baverage\b/i,
      /\bmean\b/i,
      /\bacross (all|your) runs\b/i,
      /\bportfolio\b/i,
      /\btrend\b/i,
      /\bthis (month|week|quarter)\b/i,
    ]) {
      expect(DICT, `work.en.ts states an aggregate: ${aggregate}`).not.toMatch(aggregate);
    }
  });

  it('says what the scoping does not cover', () => {
    /*
      A PRESENCE ASSERTION, and it is here because no prohibition can catch its
      absence. It used to hold the page to "any identified caller can still read any
      run", which stopped being true when `access.ts` scoped every run route to its
      author and the accounts it was shared with — a test enforcing a sentence the
      code had made false. What is still true is narrower: there are no firms or
      projects, only accounts, and a reviewer's licence is never checked. The sentence
      that says so is the difference between a disclosed gap and an implied
      isolation, and deleting it makes the page read BETTER.
    */
    /*
      OVER THE SOURCE, AND THE REASON IS THE MEASUREMENT ITSELF.

      The disclosure sits in the signed-in branch, which `renderToStaticMarkup`
      never reaches because it runs no effects — so a markup assertion here failed
      on a page that carries the sentence perfectly well. Asserting on the markup
      anyway, by rendering a branch this file cannot reach, would be a test that
      measures the empty state and reports it as coverage. The file is the unit,
      and it is stated rather than implied.

      THE FILE IS NOW THE DICTIONARY. The sentence moved into `work.en.ts` when the
      page's copy did, and the assertion moved with it — held against the component
      as well, so that the disclosure cannot be quietly re-inlined somewhere this
      does not read. The link to `/refusals` must still be the component's.
    */
    const src = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(DICT, '/work no longer says there is no tenancy').toMatch(/no firms\s+or projects/i);
    expect(DICT, '/work no longer says the licence is unchecked').toMatch(/licence is\s+recorded but never checked/i);
    for (const s of [src, DICT]) {
      expect(s, '/work still claims every route is unscoped').not.toMatch(/any identified caller can still read/i);
    }
    expect(DICT, '/work no longer points the disclosure at the refusals page').toMatch(
      /what it refuses/i,
    );
    expect(src, 'the disclosure no longer links to /refusals').toMatch(
      /t\.disclosure\.before[\s\S]{0,80}<Link to="\/refusals"/,
    );

    // The same two refusals in the Arabic, word for word as `work.ar.ts` states them:
    // no firms and no projects, only accounts; the licence recorded and never checked.
    expect(DICT_AR, 'the Arabic drops "no firms or projects"').toContain(
      'لا توجد في هذا النشر شركات ولا مشاريع، بل حسابات فقط',
    );
    expect(DICT_AR, 'the Arabic drops "recorded but never checked"').toContain(
      'تسجل ولا يتحقق منها أحد إطلاقا',
    );
    // The link names the page in the words the site names it with, so the sentence
    // and the page it opens are not two names for one thing.
    expect(WORK_AR.disclosure.link, 'the Arabic disclosure no longer names the refusals page').toBe(
      CHROME_AR.routes['/refusals'].footerLabel,
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

  it('links each run to its own page, as a query on /work', () => {
    const html = renderToStaticMarkup(
      <RunTable rows={[ROW]} caption="Runs" empty="Nothing yet." navigate={() => {}} />,
    );
    expect(html).toContain('href="/work?run=run-1"');
  });
});

describe('the run page', () => {
  const RUN_SOURCE = readFileSync(new URL('../src/screens/RunPage.tsx', import.meta.url), 'utf8');
  const code = RUN_SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  /*
    The page's sentences, which used to be inline in `code`. Each assertion below
    that held a sentence present now holds it present HERE, and each prohibition
    reads both files — a claim added to the dictionary is still a claim on the page.
  */
  const dict = stripped('../src/i18n/runPage.en.ts');
  const dictAr = stripped('../src/i18n/runPage.ar.ts');
  const both = `${code}\n${dict}`;

  it('uses none of the apology vocabulary in its own source', () => {
    for (const banned of BANNED_IN_HAND_WRITTEN_COPY) {
      const hit = banned.exec(both);
      expect(hit?.[0], `RunPage.tsx or runPage.en.ts uses "${hit?.[0] ?? ''}"`).toBeUndefined();
    }
  });

  it('computes nothing between the runs of a plot, and says so', () => {
    // The same prohibition as the list, on the page most tempted to break it: two
    // runs of one plot invite a difference column, and a difference is a number the
    // engine never produced.
    expect(code, 'RunPage.tsx computes over rows').not.toMatch(/\.reduce\(|Decimal|parseFloat|Number\(r\./);
    expect(dict).toMatch(/nothing here is computed between them/i);
    /*
      WORD BOUNDARIES, AND THEY WERE NOT THERE. This list used to hold a literal
      backspace character where each `\b` belonged — a `\b` typed through a layer
      that read it as an escape — so every pattern required a control character no
      source file contains, and the prohibition could not fail. It reads words now.
    */
    for (const claim of [/\bdifference\b/i, /\bdelta\b/i, /\bbest\b/i, /\bimprove/i, /\bsecure\b/i, /\bverified\b/i, /\bprivate\b/i]) {
      expect(both, `RunPage.tsx or runPage.en.ts says ${claim}`).not.toMatch(claim);
    }
    // In Arabic: the same denial, and none of the words a comparison would need —
    // difference, best, improvement — nor a claim that anything is secured or verified.
    expect(dictAr).toContain('لا شيء هنا يحسب بينها');
    for (const claim of [/فرق|الفارق/, /أفضل/, /تحسن|تحسين/, /آمن|مؤمن|محمي/, /متحقق منه/]) {
      expect(dictAr, `runPage.ar.ts says ${claim}`).not.toMatch(claim);
    }
  });

  /*
    THE WHOLE ANSWER IS ON THE RUN PAGE, AND IT IS THE FLOW'S OWN PANELS.

    The page used to show five figures and a small picture, and everything else the
    engine produced — the bands, the area table, the envelope, the parking level and
    its sheets, the checks, the assumptions — existed only inside the ten-step flow,
    which a stored run is no longer in.

    The assertion is on the COMPONENTS, not on the text, and that is the point. A
    page that restated the capacity or the bay count in its own markup would be a
    second renderer of the same figures, free to drift from the first — the defect
    `pnpm parity` catches between the screen, the paper and the DXF, between two
    screens instead. Rendering the flow's components makes the drift impossible.
  */
  it('shows the whole answer, by rendering the engine’s own panels', () => {
    for (const panel of [
      'CapacityBands',
      'GfaStatement',
      'EnvelopePanel',
      'ParkingStep',
      'ChecksStep',
      'AssumptionRegister',
      'ProvenanceTree',
    ]) {
      expect(code, `RunPage.tsx does not render ${panel}`).toContain(`<${panel}`);
    }
    // Read-only, because a stored run is a record: an edit here would change the
    // value under an answer already computed, stored and possibly signed.
    expect(code, 'RunPage.tsx offers an editable assumption register').toContain('readOnly');
    expect(code, 'RunPage.tsx offers the assumption gate it does not own').toContain(
      'onAcknowledge={() => undefined}',
    );
  });

  it('answers a missing run and a run that is not yours in one sentence', () => {
    // The server gives one 404 for both so a run's existence does not leak; a page
    // that told them apart would leak it anyway.
    expect(dict).toMatch(/Either it does not exist, or it was not shared with you/);
    expect(code).not.toMatch(/status === 403/);
    // One kind for both, so there is no second sentence to reach for: the page can
    // only say "missing or not shared", or "could not be loaded".
    expect(Object.keys(RUN_EN.error).sort()).toEqual(['failed', 'missing']);
    expect(dictAr).toContain('فإما أنها غير موجودة، وإما أنها لم تشارك معك');
  });

  it('does not say whether an account uses the address it shared with', () => {
    expect(dict).toMatch(/This page does\s+not say whether one does/);
    expect(both).not.toMatch(/no account (uses|has) that/i);
    // The Arabic opens on a condition and closes on the same refusal, and says
    // nothing in between that reads as "found" or "not found".
    expect(dictAr).toContain('إن كان حساب يستخدم العنوان');
    expect(dictAr).toContain('لا تقول هذه الصفحة ما إذا كان حساب يستخدمه');
    expect(dictAr).not.toMatch(/لا يوجد حساب|لا حساب يستخدم|وجد الحساب|الحساب موجود/);
  });
});

/* -------------------------------------------------------------------------
 * THE ARABIC PAGE, RENDERED.
 * ---------------------------------------------------------------------- */

describe('/work in Arabic', () => {
  const ar = (node: JSX.Element): string =>
    renderToStaticMarkup(<StaticLocale locale="ar">{node}</StaticLocale>);

  const page = (): string =>
    ar(<Work {...pageProps()} />);

  /** Every qualifier a row can carry: signed and unsigned, shared, draft, a named band. */
  const ROWS: readonly RunRow[] = [
    ROW,
    {
      ...ROW,
      runId: 'run-2',
      governingBand: 'PARKING',
      bindingLabel: 'Parking supply at the probe target',
      draftRules: false,
      reviewer: { name: 'Amal Reviewer', at: '2026-09-01T09:30:00.000Z' },
      createdAt: '2026-09-01T09:30:00.000Z',
      sharedRole: 'reviewer',
    },
  ];

  const rows = (r: readonly RunRow[]): string =>
    ar(
      <RunTable
        rows={r}
        caption={WORK_AR.authored.caption}
        empty={WORK_AR.shared.empty}
        navigate={() => {}}
      />,
    );

  it('carries the site-wide prohibitions', () => {
    expectSitewideProhibitions(page(), '/work (ar)');
    expectSitewideProhibitions(rows(ROWS), '/work rows (ar)');
    expectSitewideProhibitions(rows([]), '/work empty (ar)');
  });

  it('leaves no English prose outside what the API sent', () => {
    expectNoEnglishProse(page(), '/work (ar)');
    expectNoEnglishProse(rows(ROWS), '/work rows (ar)');
    expectNoEnglishProse(rows([]), '/work empty (ar)');
  });

  it('opens on one heading', () => {
    expect([...page().matchAll(/<h1\b/g)].length).toBe(1);
  });

  it('prints what a row carries exactly as it was sent, and marks it English', () => {
    // The plot, the community, the binding label, a name and a time are the API's.
    // Translated, they would be a second record nobody issued; unmarked, a screen
    // reader would read them in an Arabic voice and the bidi algorithm would swap
    // the halves of a timestamp.
    const html = rows(ROWS);
    const reading = arabicReadingText(html);
    for (const sent of [
      ROW.plotNumber,
      ROW.community,
      'Parking supply at the probe target',
      'Amal Reviewer',
      '2026-08-30 10:00',
      '2026-09-01 09:30',
    ]) {
      expect(stripTags(html), `${sent} is not on the Arabic row`).toContain(sent);
      expect(reading, `${sent} is on the Arabic row outside Verbatim`).not.toContain(sent);
    }
    // The figure is the engine's, byte for byte, in Western digits.
    expect(stripTags(html)).toContain('6,774.194');
  });

  it('names the band in Arabic and keeps its letter', () => {
    const text = stripTags(rows(ROWS));
    expect(text).toContain(`النطاق C · ${WORK_AR.bands.PARKING}`);
    // A token the page has no question for is printed as the engine sent it.
    expect(text).toContain(`النطاق ${ROW.governingBand}`);
  });

  it('keeps the draft-rules qualifier, the role and the unsigned state, in Arabic', () => {
    expect(stripTags(rows([ROW]))).toContain(WORK_AR.table.draftRules);
    expect(stripTags(rows([{ ...ROW, draftRules: false }]))).not.toContain(WORK_AR.table.draftRules);
    expect(stripTags(rows([ROW]))).toContain(WORK_AR.table.notSigned);
    expect(stripTags(rows(ROWS))).toContain(WORK_AR.table.roles.reviewer);
  });

  it('states no aggregate over runs', () => {
    const scan = `${arabicReadingText(page())} ${arabicReadingText(rows(ROWS))} ${DICT_AR}`;
    for (const aggregate of [
      /متوسط/,
      /مجموع/,
      /إجمالي/,
      /محفظة/,
      /هذا الشهر|هذا الأسبوع|هذا الربع/,
      /اتجاه/,
    ]) {
      expect(scan, `/work (ar) states an aggregate: ${aggregate}`).not.toMatch(aggregate);
    }
  });

  it('never describes the account as securing or verifying anything', () => {
    // «يتحقق» appears in this dictionary only negated — «ولا يتحقق من رخصة أحد».
    // The participle «متحقق منه» would be the claim.
    const text = arabicReadingText(page());
    for (const claim of [/آمن/, /مؤمن/, /محمي/, /متحقق منه/, /موثق/]) {
      expect(text, `/work (ar) claims ${claim} of an account`).not.toMatch(claim);
      expect(DICT_AR, `work.ar.ts claims ${claim}`).not.toMatch(claim);
    }
  });
});

/* -------------------------------------------------------------------------
 * THE REVIEW GATE AND THE FILES, ON THE RUN PAGE.
 *
 * The panel offers what the server would accept and nothing it would not: the review
 * signature to the author or a reviewer holding a licence number, and the files only
 * once both export gates are signed. The server checks all of it again, so what these
 * tests hold is the page's honesty — that it does not offer a control the server
 * would refuse, and that it says what a signature does not prove.
 * ---------------------------------------------------------------------- */

describe('the review panel', () => {
  const SIGNED = {
    G3_ASSUMPTIONS_ACKNOWLEDGED: { actorName: 'Hana Author', at: '2026-09-20T08:15:00.000Z' },
    G4_REVIEWER_NAMED: { actorName: 'Omar Reviewer', at: '2026-09-21T11:40:00.000Z' },
  };
  const subject = (over: Partial<ReviewSubject>): ReviewSubject => ({
    runId: 'run-1',
    gates: {},
    access: 'author',
    capacity: {},
    ...over,
  });
  const panel = (s: ReviewSubject, licence: string | null, locale: 'en' | 'ar' = 'en'): string =>
    renderToStaticMarkup(
      <StaticLocale locale={locale}>
        <ReviewPanel run={s} licence={licence} onSigned={() => {}} />
      </StaticLocale>,
    );
  const buttons = (html: string): string[] =>
    [...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)].map((m) => stripTags(m[1] ?? '').replace(/\s+/g, ' ').trim());

  it('offers the review signature to an author or reviewer with a licence, and says what it does not prove', () => {
    for (const access of ['author', 'reviewer'] as const) {
      const html = panel(subject({ access }), 'DM-12345');
      expect(buttons(html), access).toEqual(['Sign the review gate (G4)']);
      expect(stripTags(html)).toContain('Nobody checks the licence');
      expect(stripTags(html)).toContain('nothing stops an author signing their own run');
    }
  });

  it('offers no signature to a reader, or to an account with no licence number', () => {
    expect(buttons(panel(subject({ access: 'reader' }), 'DM-12345'))).toEqual([]);
    expect(stripTags(panel(subject({ access: 'reader' }), 'DM-12345'))).toContain(RUN_EN.review.readerOnly);
    expect(buttons(panel(subject({ access: 'author' }), null))).toEqual([]);
    expect(stripTags(panel(subject({ access: 'author' }), null))).toContain(RUN_EN.review.noLicence);
  });

  it('never offers the assumption gate, because this page does not list the assumptions', () => {
    // One button in the fullest unsigned state, and it is the review's.
    const html = panel(subject({}), 'DM-12345');
    expect(buttons(html)).toHaveLength(1);
    expect(stripTags(html)).toContain(RUN_EN.review.assumptionsWhere);
    expect(buttons(html).join(' ')).not.toMatch(/assumption|acknowledg/i);
  });

  it('holds the files back until both gates are signed', () => {
    const onlyReview = panel(subject({ gates: { G4_REVIEWER_NAMED: SIGNED.G4_REVIEWER_NAMED } }), null);
    expect(stripTags(onlyReview)).toContain(RUN_EN.files.locked);
    expect(onlyReview).not.toContain(RUN_EN.files.html);

    const both = panel(subject({ gates: SIGNED, access: 'reader' }), null);
    expect(stripTags(both)).not.toContain(RUN_EN.files.locked);
    // A run with no model has nothing to draw, so it is not offered the drawn files —
    // the server would answer 409 for them. The report is offered twice: to read,
    // and to print, which is how this product writes a PDF.
    expect(buttons(both)).toEqual([
      RUN_EN.files.html,
      RUN_EN.files.print,
      RUN_EN.files.json,
      RUN_EN.files.xlsx,
    ]);
  });

  it('names who signed and when, as the run recorded it', () => {
    const text = stripTags(panel(subject({ gates: SIGNED }), 'DM-12345'));
    expect(text).toContain('Omar Reviewer');
    expect(text).toContain('2026-09-21 11:40');
    expect(text).toContain('Hana Author');
    expect(buttons(panel(subject({ gates: SIGNED }), 'DM-12345'))).not.toContain('Sign the review gate (G4)');
  });

  it('in Arabic: no English prose, and what the run carries stays as it was sent', () => {
    const states = [
      panel(subject({}), 'DM-12345', 'ar'),
      panel(subject({ access: 'reader' }), null, 'ar'),
      panel(subject({}), null, 'ar'),
      panel(subject({ gates: SIGNED }), null, 'ar'),
    ];
    for (const html of states) {
      expectSitewideProhibitions(html, 'review panel (ar)');
      expectNoEnglishProse(html, 'review panel (ar)');
    }
    const signed = states[3]!;
    const reading = arabicReadingText(signed);
    for (const sent of ['Omar Reviewer', 'Hana Author', '2026-09-21 11:40']) {
      expect(stripTags(signed)).toContain(sent);
      expect(reading, `${sent} is outside Verbatim`).not.toContain(sent);
    }
    // The gate id sits in its own Verbatim run inside the Arabic label.
    expect(buttons(states[0]!).map((b) => b.replace(/\s/g, ''))).toEqual([
      `${RUN_AR.review.signBefore}G4${RUN_AR.review.signAfter}`.replace(/\s/g, ''),
    ]);
    expect(RUN_AR.review.signNote).toContain('ولا يفحص أحد الرخصة');
    expect(RUN_AR.review.signNote).toContain('توقيع دراسته بنفسه');
  });
});
