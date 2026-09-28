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

export type PrimerStep = keyof typeof EN.steps;

export function StepPrimer({ step }: { readonly step: PrimerStep }): JSX.Element {
  const t = useDict(EN, AR);
  const p = t.steps[step];
  return (
    <div className="primer">
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
  );
}
