/**
 * THE SHARED PROHIBITIONS, so each page's test is a short file rather than a
 * three-hundred-line copy.
 *
 * Almost every assertion on this site is a PROHIBITION: what a page must never say.
 * A test that only checked the honest copy was present would pass on a page that had
 * added "99.4% accurate" underneath it — which is the whole reason the landing
 * page's suite was written this way, and the reason it is lifted here instead of
 * being pasted per route.
 *
 * The scans run over the rendered markup with tags stripped. That was already true
 * of the landing suite and is worth stating, because all three source proposals for
 * this site claimed the opposite and would have "fixed" a bug that does not exist.
 */

import { expect } from 'vitest';

/** Rendered markup with its tags removed, so a regex reads what a person reads. */
export const stripTags = (markup: string): string => markup.replace(/<[^>]*>/g, ' ');

/** The page's own thousands separator, so an assertion matches what it prints. */
export const group = (value: string): string => {
  const [whole, frac] = value.split('.');
  const grouped = (whole ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${grouped}.${frac}` : grouped;
};

/**
 * Claims with no honest reading anywhere on this site.
 *
 * These are asserted OUTRIGHT: unlike the negated set below, there is no sentence
 * on any page that would legitimately contain one.
 */
export const COMPLIANCE_PATTERNS: readonly RegExp[] = [
  /\b(ensures?|guarantees?|verifies|confirms|delivers) compliance\b/i,
  /\bregulator[- ]approved\b/i,
];

/**
 * THE NEGATED SET, and the correction this module makes.
 *
 * `compliance check` already had a negation window: the site uses the phrase to say
 * this is NOT one, and banning the string outright forbids the denial along with the
 * claim — the first version of that test did exactly that and failed on the honest
 * sentence.
 *
 * `certified`, `fully compliant` and `approval-ready` were banned outright and get
 * the same treatment, because the strongest sentence available to this site is
 * "no output of this engine is certified by any authority" and a bare ban forbids
 * it. `/security`, when it is written, is the page that would trip this first.
 *
 * The window is 60 characters before the match, which is enough for a clause and
 * short enough that a negation two sentences earlier does not launder a claim.
 */
export const NEGATED_PATTERNS: readonly RegExp[] = [
  /\bcompliance check\b/gi,
  /\bcertified\b/gi,
  /\bfully compliant\b/gi,
  /\bapproval[- ]ready\b/gi,
];

const NEGATION = /\b(not|never|no|neither|nor|without|isn't|is not|cannot|rather than|described as)\b/i;

/** Figures this product cannot support, in any phrasing. */
export const INVENTED_NUMBER_PATTERNS: readonly RegExp[] = [
  /\b\d{1,3}\s?%\s?(faster|accurate|accuracy|quicker|cheaper|more)/i,
  /\btrusted by\b/i,
  /\b\d+\+?\s+(customers|clients|firms|developers|architects)\s+(use|trust|rely)/i,
  /\bsaves? \d+ (hours|days|weeks)/i,
  /\bindustry[- ]leading\b/i,
  /\benterprise[- ]grade\b/i,
  /\bbank[- ]grade\b/i,
  /\bhealth score\b/i,
  /\boverall score\b/i,
  /\ball systems (go|operational)\b/i,
];

/**
 * THE BANNED SET SPLITS IN TWO, because one list was not implementable.
 *
 * These have no honest reading on this site and are asserted over the RENDERED
 * MARKUP of every route. A refusal is a verb the software performs, never an absence
 * it regrets.
 */
export const BANNED_IN_ALL_COPY: readonly RegExp[] = [
  /\bunfortunately\b/i,
  /\blimitation\b/i,
  /\bwe hope to\b/i,
  /\bjust\b/i,
  /\bsimply\b/i,
  /\bplease note\b/i,
];

/**
 * These run over the SOURCE of the content module and the page modules, and NEVER
 * over rendered markup.
 *
 * The engine's own five-way claim statement carries the string **NOT YET MEASURED**
 * and the phrase "architects who have not yet been engaged", and the site renders it
 * verbatim. A regex over markup would fail the most honest paragraph on the site.
 * Engine-authored strings — claim statements, blocking sentences, refusal strings,
 * assumption bases — are exempt by construction here, because they are not
 * hand-written and cannot be edited on the page. The file is the unit of assertion
 * and the exception disappears.
 */
export const BANNED_IN_HAND_WRITTEN_COPY: readonly RegExp[] = [/\bnot yet\b/i, /\bcurrently\b/i];

/** Every page: no unnegated compliance claim, in any phrasing. */
export function expectNoComplianceClaim(markup: string, label: string): void {
  const text = stripTags(markup);

  for (const forbidden of COMPLIANCE_PATTERNS) {
    expect(text, `${label} matched ${forbidden}`).not.toMatch(forbidden);
  }

  for (const pattern of NEGATED_PATTERNS) {
    for (const m of text.matchAll(pattern)) {
      const before = text.slice(Math.max(0, m.index - 60), m.index);
      expect(
        NEGATION.test(before),
        `${label}: "${m[0]}" appears unnegated: …${before}${m[0]}`,
      ).toBe(true);
    }
  }
}

/** Every page: no figure the engine has not produced. */
export function expectNoInventedNumber(markup: string, label: string): void {
  const text = stripTags(markup);
  for (const invented of INVENTED_NUMBER_PATTERNS) {
    expect(text, `${label} matched ${invented}`).not.toMatch(invented);
  }
}

/** Every page: no apology vocabulary. */
export function expectNoBannedVocabulary(markup: string, label: string): void {
  const text = stripTags(markup);
  for (const banned of BANNED_IN_ALL_COPY) {
    expect(text, `${label} matched ${banned}`).not.toMatch(banned);
  }
}

/**
 * A PRESENCE ASSERTION, and it is here because no prohibition can catch the failure
 * it guards against.
 *
 * The landing page argues, in a card titled "Assumptions are declared, ranked and
 * amber", while showing no amber anywhere — and `bayAreaFactorClass: "ASSUMED"` sits
 * unread in the fixture. A prohibitions test is blind to a design pass that tones
 * amber down, and a design review that tones it down has failed. So the treatment
 * must be RENDERED, not merely permitted.
 *
 * It accepts any of the three ways the treatment can reach a page, and no others:
 * the state layer, the inline traced treatment, or the margin tally. That set is the
 * same one `assertAmberExclusive` enforces in the stylesheets, so the test and the
 * checker cannot drift into permitting different things.
 */
export function expectAssumedTreatmentPresent(markup: string, label: string): void {
  const present =
    /data-state=["']assumed["']/.test(markup) ||
    /traced--assumed/.test(markup) ||
    /margin-tally/.test(markup);
  expect(
    present,
    `${label} renders no ASSUMED treatment. Amber reaches a page through ` +
      `[data-state="assumed"], .traced--assumed or .margin-tally, and through nothing ` +
      `else. A page that argues about assumptions and shows none has made the argument ` +
      `and withheld the evidence.`,
  ).toBe(true);
}

/**
 * R8's mechanical half: NO COUNT IN AN `<h1>`–`<h3>`, with no allowlist.
 *
 * Bluntly, and on purpose. A regex cannot tell an honest structural count from a
 * marketing one and should not be asked to — which is also why identifiers move out
 * of headings and read perfectly well in the first sentence under one.
 *
 * The design document that specified this site broke the rule in eleven of its own
 * prescribed headings, and two of them shipped. "Four things hold the answer up"
 * over five cards is the defect in miniature: a count in a heading is exactly where
 * a reader stops reading, and it is the first thing to go stale.
 */
const NUMBER_WORDS =
  /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/i;

export function expectNoCountInHeadings(markup: string, label: string): void {
  for (const m of markup.matchAll(/<h([123])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const heading = stripTags(m[2] ?? '').replace(/&[a-z]+;/gi, ' ').trim();
    expect(heading, `${label}: digit in an h${m[1]} — "${heading}"`).not.toMatch(/\d/);
    expect(heading, `${label}: number word in an h${m[1]} — "${heading}"`).not.toMatch(
      NUMBER_WORDS,
    );
  }
}

/**
 * The five-way claim statement, in §16.5's own order, with NEVER CLAIMED last.
 *
 * The order is the assertion. Any other order buries the refusal in the middle of a
 * list, which is where a reader stops noticing it.
 */
export function expectClaimOrder(markup: string, label: string): void {
  const order = [
    'Self-consistency',
    'Rule coverage',
    'Geometric validity',
    'Agreement with professional judgement',
    'Regulatory validity',
  ].map((t) => markup.indexOf(t));
  expect(order.every((i) => i >= 0), `${label} does not state all five claims`).toBe(true);
  expect([...order].sort((a, b) => a - b), `${label} states the claims out of order`).toEqual(
    order,
  );
}

/**
 * The whole set, for a page with nothing special about it.
 *
 * `expectNoComplianceClaim` here is the PROHIBITION only. The matching presence
 * assertion — that the phrase "compliance check" appears at all — moved to
 * `shared-content.test.tsx`, and the move is a correction rather than a tidy-up:
 * under `SiteChrome` that phrase lives in `DISCLAIMER`, not in any page component,
 * so a presence assertion run on a page render would fail on every page. One rule
 * that is true of every page, one that is true of the chrome, and neither pretending
 * to be the other.
 */
export function expectSitewideProhibitions(markup: string, label: string): void {
  expectNoComplianceClaim(markup, label);
  expectNoInventedNumber(markup, label);
  expectNoBannedVocabulary(markup, label);
  expectNoCountInHeadings(markup, label);
}
