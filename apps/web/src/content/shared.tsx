/**
 * EVERY PARAGRAPH THAT APPEARS ON TWO PAGES HAS EXACTLY ONE SOURCE.
 *
 * Duplicated prose diverges. One copy gets edited in a design pass, the other does
 * not, and the site then says two things about the same refusal — which on this
 * product is not a tidiness problem, because the paragraphs below are the refusals
 * the whole proposition rests on. The permanent disclaimer was hand-copied in three
 * files with nothing binding them.
 *
 * So: each is a named exported constant, both pages import it, and
 * `apps/web/test/shared-content.test.tsx` asserts that each is rendered by exactly
 * the routes listed against it here — an assertion that catches a copy pasted back
 * in as easily as one edited apart.
 *
 * THIS MODULE IS ALSO THE FILE THE HAND-WRITTEN-COPY SCAN RUNS OVER.
 * `BANNED_IN_HAND_WRITTEN_COPY` (*not yet*, *currently*) is asserted against this
 * file's SOURCE and never against rendered markup, because the site renders the
 * engine's own claim statement verbatim and that statement contains **NOT YET
 * MEASURED** and "architects who have not yet been engaged". A regex over markup
 * would fail the most honest paragraph on the site. Here the file is the unit of
 * assertion and the exception disappears.
 *
 * NO FIGURE APPEARS IN ANY STRING BELOW. Not a count, not a ratio, not a dimension,
 * not a percentage. Where a paragraph used to carry one — the parking-in-FAR swing
 * was quoted as a range — the figure is gone and the sentence says what it does
 * instead. A cited specification range was the weakest number available on this
 * site; the measured spread for the actual worked plot, which `/parking` renders
 * from a real endpoint, is the strongest.
 */

import type { ReactNode } from 'react';

/**
 * THE PERMANENT SENTENCE.
 *
 * CLAUDE.md makes this a non-negotiable disclosure on every output, and it was
 * hand-copied at three mount points with nothing binding them. `SiteChrome` renders
 * it once, in the colophon, on every route including the engine — and a test
 * asserts every route in `PAGES` emits it.
 *
 * NO COPYRIGHT LINE AND NO ENTITY NAME. There is no legal entity, and asserting a
 * company that does not exist is the same class of defect as asserting an accuracy
 * figure. When an owner supplies one it goes here, once.
 */
export const DISCLAIMER = {
  lead: 'TOP.ai · Phase 0 · ',
  emphasis: 'Regulatory validity is never assessed and never claimed.',
  body:
    ' This engine reports what its encoded rules imply. It is not a compliance check ' +
    'and no part of it substitutes for professional review.',
} as const;

/** The whole sentence as one string, for tests and for anything that needs plain text. */
export const DISCLAIMER_TEXT = `${DISCLAIMER.lead}${DISCLAIMER.emphasis}${DISCLAIMER.body}`;

export interface Refusal {
  readonly id: string;
  readonly heading: string;
  readonly body: ReactNode;
}

/**
 * THE FIVE "DOES NOT" ITEMS.
 *
 * Rendered on `/` and again, expanded, on `/refusals`. The five headings are
 * load-bearing: `landing.test.tsx` grips the page by them, and moving them to
 * another route would leave that gate passing by coincidence, which is the wrong
 * reason for the strongest gate in the codebase to keep working.
 *
 * The fourth item's paragraph is the one that changed. It read "moves capacity by
 * 15–35%… a default here is a silent 15–35%", which is a figure typed into rendered
 * copy — banned outright, and the weakest number on the site besides. The sentence
 * now says what the software does, which reads as engineering rather than as a
 * citation, and `/parking` shows the measured spread for the actual plot.
 */
export const LIMITS: readonly Refusal[] = [
  {
    id: 'draw',
    heading: 'It does not draw a building.',
    body: (
      <>
        Phase 0 produces a buildable envelope and a capacity, not a floor plan, a core, a
        unit layout or a massing. Nothing here is a design.
      </>
    ),
  },
  {
    id: 'life-safety',
    heading: 'It does not check life safety.',
    body: (
      <>
        Travel distances, egress and façade fire performance are applicable and are{' '}
        <em>not</em> assessed. They are listed as deferred in every single output rather
        than omitted, because an absent check reads as a check that passed.
      </>
    ),
  },
  {
    id: 'realistic',
    heading: 'It does not tell you what is realistically achievable.',
    body: (
      <>
        There is no “realistic” band and the field does not exist in the schema. That
        number would need achieved-versus-permitted data no public source carries. If you
        want to discount the figures you set the factor yourself and it is recorded as
        yours.
      </>
    ),
  },
  {
    id: 'parking-in-far',
    heading: 'It does not decide the parking-in-FAR question.',
    body: (
      <>
        Whether parking counts toward floor area moves the answer more than any other
        single declaration. The engine refuses to compute until a person declares the
        treatment or asks to see both, and it returns a refusal rather than a guess. There
        is no default, because a default here is a silent decision made on the applicant’s
        behalf — and the spread it would hide is shown, measured, for this plot.
      </>
    ),
  },
  {
    id: 'professional',
    heading: 'It does not replace a professional.',
    body: (
      <>
        An export records a reviewer’s name and the licence number they typed beside it.
        The system records that assertion; it cannot verify the licence with anybody, and
        it does not check that the person signing is not the person who authored the run.
        Separation of duties is a control this software does not have.
      </>
    ),
  },
];

/**
 * `/refusals` and `/exports`, word for word.
 *
 * Two formats keep being listed against this product in older documents. They are
 * not produced by this engine, and the honest place to say so is once.
 */
export const IFC_GLTF = {
  heading: 'A file is not an integration.',
  body: (
    <>
      Exports travel as files. There is no live link, no round trip and no model-server
      connection, and a change made downstream does not come back. IFC and glTF are not
      produced by this engine — if you have seen them listed against this product they
      were scope in an older document and they do not exist in the software.
    </>
  ),
} as const;

/**
 * `/parking` and `/refusals`.
 *
 * The largest single thing anyone has asked this product for, and the one Phase 0
 * must not quote. It is absent as a STRUCTURAL CONSEQUENCE rather than as a backlog
 * item, and it carries no attribution to any person or conversation.
 *
 * THE LAST SENTENCE USED TO END "…rather than a limitation to apologise for", and
 * `limitation` is in `BANNED_IN_ALL_COPY` — asserted over the rendered markup of
 * every route, so this one word failed `/parking` and `/refusals` at once. The ban is
 * right and the word was wrong: a refusal is a verb this software performs, and a
 * sentence that reaches for `limitation` in order to deny it has already conceded the
 * frame. Naming what a reader would look for instead — a flag, a setting — says more
 * than the denial did and says it without apologising.
 */
export const OPTIMISER_REFUSAL = {
  heading: 'It does not search for the optimal ramp and core position.',
  body: (
    <>
      A choice among feasible alternatives is a <code className="ident">TRADEOFF</code>{' '}
      value, and the Phase 0 class set does not contain that class — the traced-value
      constructor throws on one outside it. So this is not unbuilt work behind a flag and
      there is no setting that turns it on: it is refused by construction, and the
      refusal is the design.
    </>
  ),
} as const;

/**
 * `/dashboard` and `/method`.
 *
 * The sentence that stops a reader completing the row in their head. A check that
 * had nothing to read is not a check that passed, and the gap between those two
 * readings is the whole reason the count is reported as ran-of-total and never as a
 * tick or a percentage.
 */
export const DORMANT_IS_NOT_A_PASS = {
  heading: 'Dormant is not a pass.',
  body: (
    <>
      A dormant check is one that had nothing to read — it needs a unit and per-level
      schedule this phase does not generate. Synthesising one to wake it would be
      verifying the engine against its own output, so the count is reported as ran of
      total and the dormant ones are named. No tick, no green, no percentage: a
      percentage invites a reader to fill in the remainder as passes.
    </>
  ),
} as const;

/**
 * `/dashboard`, quoted from the handler's own docblock.
 *
 * The failure this sentence exists to prevent already happened once: a deployment
 * whose real number of approved rules is zero reported every rule approved, because
 * the development loader stamps each record with an approver whose name says in
 * capitals that it is not one.
 */
export const SEED_RULES_NOT_DEV_RULES = {
  heading: 'Counted over the seed records, never over the development loader.',
  body: (
    <>
      The development loader stamps every rule{' '}
      <code className="ident">APPROVED / DEVELOPMENT-ONLY-NOT-A-REAL-APPROVER</code> so a
      demonstration can run. Counting that reported every rule in this deployment as
      approved when the real figure is zero. Readiness is counted over the seed records
      themselves, and the figure it produces is the one on this page.
    </>
  ),
} as const;
