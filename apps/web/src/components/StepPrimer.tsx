/**
 * What a step is — one line, and nothing else.
 *
 * ---------------------------------------------------------------------------
 * THIS COMPONENT USED TO BE FOUR TIMES THIS SIZE, AND THE CLIENT ASKED FOR IT BACK.
 *
 * It was written against a note in which he said he did not understand the flow,
 * and the answer at the time was a three-layer structure: a fact, what it means
 * for the reader, and the argument behind a closed disclosure, with a
 * commissioned drawing beside it. That answer was right for the reader it was
 * written for.
 *
 * It is not the reader he has. On 4 Oct 2026 he drove the product himself and
 * said five separate times that there is too much prose — *«الكلام اللي فيه شرح
 * زيادة»* (05:47), *«كل ده أنا مش عايزه — الشرح ده»* (36:43), *«عايز أخش بس على
 * الصفحة دي على طول»* (37:19) — and then gave the reason, which is the part that
 * settles it:
 *
 *     *«اللي هيستعمل حاجة زي كده مش هيبقى حد … هيبقى مهندس لازم.»* — 37:43
 *
 * The reader is a practising engineer. He does not need the screen explained to
 * him; he needs to know which screen he is on. In writing afterwards: *«مش عاوز
 * في الخطوات صور ثابتة أو شرح»*.
 *
 * ---------------------------------------------------------------------------
 * WHAT WAS REMOVED, AND WHAT THAT COST.
 *
 *   - `means` — the second layer. Gone from the render.
 *   - the `<details>` argument. Gone from the render.
 *   - the amber sentence. Gone twice over: the prose went with the rest, and the
 *     distinction it taught was itself removed on 5 Oct — *«احذف التمييز نهائيًا»*.
 *   - the commissioned figure. Gone, with `STEP_IMAGE` and the `img.js` import.
 *
 * NOTHING HONEST WAS REMOVED, and that distinction is the whole of why this was
 * safe to do. Not one of those four carried a claim, a refusal, a provenance
 * class or a limit — the claim statement is on `/`, the refusals are on
 * `/refusals`, every ASSUMED value still says ASSUMED on the value itself, and
 * `REGULATORY VALIDITY: NOT ASSESSED` is still in the masthead above every one
 * of these screens. What went was teaching. If a later edit finds itself deleting
 * something a reader is entitled to rely on, it has stopped doing what this
 * change did and is doing something else.
 *
 * THE DICTIONARIES ARE NOT TOUCHED. `primer.en.ts` and `primer.ar.ts` keep all
 * four fields for all ten steps, translated and reviewed. Deleting them would
 * make this irreversible for the price of nothing — the unused fields cost a few
 * hundred bytes in a bundle and are the only record of what the screens used to
 * say. He changes his mind about this; the file should let him.
 *
 * ---------------------------------------------------------------------------
 * STILL NO HEADING, for the reason it never had one: every panel below carries
 * its own `<h2>`, and a heading here would put "About this step" above "The
 * plot" in the outline of a screen whose whole point is that it has one subject.
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
    </div>
  );
}
