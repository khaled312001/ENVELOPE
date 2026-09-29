/**
 * What a step is, before the step.
 *
 * ---------------------------------------------------------------------------
 * A CLIENT READ THE FLOW AND WROTE BACK THAT HE DID NOT UNDERSTAND IT.
 *
 * Three of the nine points in his reply are the same point: *«محتاجين نتكلم
 * فيها»* about what the sheet does not say, *«في حجات موجوده مش مفهومه
 * بالنسبالي»*, *«Assumptions مش فاهمها»*. None of those is a missing feature.
 * Each panel was correct, said something that mattered, and opened with the
 * argument instead of the fact — which is readable if you already know what the
 * screen is, and opaque if you do not, in a second language, under time.
 *
 * The plan's §2.2 answer is one structure applied to all ten steps:
 *
 *   1. ONE SENTENCE OF FACT. What this screen is. No caveat inside it.
 *   2. WHAT IT MEANS FOR THE READER. What they have to do, or what it costs.
 *   3. WHY, BEHIND A DISCLOSURE THAT IS CLOSED. The existing argument, unchanged.
 *      Worth reading; not worth blocking on.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS ONE COMPONENT AND TEN DICTIONARY ENTRIES.
 *
 * The obvious alternative was a paragraph at the top of each of the ten screens,
 * written where that screen lives. It was rejected twice over. Ten paragraphs in
 * ten files drift into ten shapes — one grows a list, one loses its disclosure,
 * one is never translated — and the structure is the whole of the fix here. And
 * four of the ten steps are not screens at all: `capacity`, `parking` and
 * `export` are panels inside `App.tsx`, so "the top of the screen" is not a place
 * that exists for them.
 *
 * ONE PRIMER PER STEP, NOT PER PANEL. `/rules` alone renders four panels and the
 * parking step renders three; a primer on each would be six paragraphs of
 * preamble before the first control. The primer answers "what is this step",
 * which is a question with one answer.
 *
 * ---------------------------------------------------------------------------
 * NO HEADING, AND THAT IS DELIBERATE.
 *
 * Every panel below already carries an `<h2>`. An `<h2>` here would put "About
 * this step" above "The plot" in the outline of a screen whose whole point is
 * that it has one subject, and a screen reader's heading list is one of the two
 * ways people navigate these pages. It is prose, first in the reading order,
 * which is where an introduction belongs and how it is already read.
 *
 * The `<details>` is closed on purpose and stays closed. A disclosure that opens
 * itself is a paragraph with extra steps.
 */

import { useDict } from '../i18n/locale.js';
import { AR } from '../i18n/primer.ar.js';
import { EN } from '../i18n/primer.en.js';
import { Illustration, hasImage } from '../img.js';

export type PrimerStep = keyof typeof EN.steps;

/**
 * THE FIGURE FOR EACH STEP, BY FILENAME, IN ONE PLACE AND NOT IN THE DICTIONARIES.
 *
 * A filename is not language. Its alt text is, and that lives in `primer.en.ts`
 * and `primer.ar.ts` beside the sentences it stands in for; the name lives here
 * once, so the Arabic file cannot be edited into pointing at a different drawing
 * from the English one.
 *
 * `parameters` is absent because `image-prompts.md` commissions no drawing for
 * it: it is the confirmation screen, its whole subject is the figures already on
 * it, and a picture above them would be a second thing to look at on the one
 * screen asking the reader to look at the first.
 *
 * NONE OF THESE FILES EXIST YET. They are commissioned, and `hasImage` is what
 * makes that a non-event — `img.tsx` argues it at length. Until a file lands the
 * panel renders exactly as it did before this was written: no element, no
 * request, no reserved gap.
 */
export const STEP_IMAGE: Readonly<Partial<Record<PrimerStep, string>>> = {
  intake: 'step-0-sheet',
  plot: 'step-1-plot',
  rules: 'step-3-rules',
  assumptions: 'step-4-assumptions',
  capacity: 'step-5-capacity',
  parking: 'step-6-parking',
  checks: 'step-7-checks',
  evidence: 'step-8-evidence',
  export: 'step-9-export',
};

export function StepPrimer({ step }: { readonly step: PrimerStep }): JSX.Element {
  const t = useDict(EN, AR);
  const p = t.steps[step];
  const name = STEP_IMAGE[step];

  /*
    THE FIGURE COMES AFTER THE PROSE IN THE DOM, and is put beside it by the
    stylesheet on a wide panel and under it on a narrow one.

    Reading order is the reason, in both senses. A screen reader reaches the
    sentence before the picture of the sentence, which is the right order for a
    panel whose job is to say what the step is. And on a phone the reader gets
    the fact first rather than a drawing occupying the whole first screen —
    the same complaint that moved the landing page's 3D widget below its
    headline.

    It is not hidden on a narrow panel. An `alt`-carrying image behind
    `display: none` is out of the accessibility tree entirely, so the reader who
    most needs the description is the one who loses it.
  */
  const figure =
    name !== undefined && p.imageAlt !== undefined && hasImage(name) ? (
      <Illustration
        name={name}
        alt={p.imageAlt}
        className="primer__figure"
        width={480}
        height={320}
      />
    ) : null;

  return (
    <div className={figure ? 'primer primer--illustrated' : 'primer'}>
      <div className="primer__text">
        <p className="primer__fact">{p.fact}</p>
        <p className="primer__means">{p.means}</p>
        {/* The amber sentence carries the colour it names, so the claim and its
            referent are in the same eyeful rather than a paragraph apart. The marker
            is `aria-hidden`: it is a swatch, and the sentence beside it is the whole
            of what it would have to announce. */}
        {p.amber === undefined ? null : (
          <p className="primer__amber">
            <span className="traced traced--assumed" aria-hidden="true">
              <span className="traced__marker" />
            </span>
            {p.amber}
          </p>
        )}
        <details className="disclosure">
          <summary>{p.whySummary}</summary>
          <p>{p.why}</p>
        </details>
      </div>
      {figure}
    </div>
  );
}
