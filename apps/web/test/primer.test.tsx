/**
 * The step primer, on all ten steps and in both languages.
 *
 * ---------------------------------------------------------------------------
 * THIS FILE USED TO ASSERT THE OPPOSITE OF WHAT IT ASSERTS NOW, AND THAT IS THE
 * POINT OF READING THE COMMENT BEFORE THE CODE.
 *
 * It was written to hold a three-layer structure in place — a fact, then what
 * the step costs the reader, then the argument behind a closed disclosure, with
 * a commissioned drawing beside it. That structure answered a note in which the
 * client said he could not tell what a panel was for, and the test guarded the
 * ORDER rather than the copy, because a test that only checked the words were
 * present would have passed on a panel that opened with the argument again.
 *
 * On 4 Oct 2026 he drove the product himself and asked for all of it back, five
 * times in one call, and then said why: *«اللي هيستعمل حاجة زي كده … هيبقى مهندس
 * لازم»* (37:43). In writing afterwards: *«مش عاوز في الخطوات صور ثابتة أو شرح»*.
 *
 * So the assertions are inverted rather than deleted. A REMOVAL THAT LEAVES NO
 * TEST BEHIND IS NOT A DECISION, IT IS AN ABSENCE — the next contributor who
 * finds a bare `fact` on ten screens has nothing telling them it is deliberate,
 * and the three-layer primer grows back one step at a time. What is held now:
 *
 *   1. One line renders, and it is the fact.
 *   2. NOTHING ELSE renders — no second paragraph, no disclosure, no image, no
 *      state swatch. Each is asserted by its own absence, by name.
 *   3. Everything that was ALWAYS true stays true: ten steps, both languages,
 *      no compliance claim, no banned vocabulary, no English left in the Arabic,
 *      and no sentence repeated from the panel below it.
 *
 * THE DICTIONARIES STILL CARRY ALL FOUR FIELDS and the tests below still read
 * them. `means`, `why` and `amber` are translated, reviewed prose that nothing
 * renders today; holding them to the no-repetition rule costs one loop and keeps
 * them usable if he asks for any of it back.
 */

import { readdirSync, readFileSync } from 'node:fs';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { StepPrimer } from '../src/components/StepPrimer.js';
import { StaticLocale } from '../src/i18n/locale.js';
import { EN, type PrimerStep } from '../src/i18n/primer.en.js';
import { AR } from '../src/i18n/primer.ar.js';
import {
  arabicReadingText,
  expectNoBannedVocabulary,
  expectNoComplianceClaim,
  expectNoEnglishProse,
  stripTags,
} from './prohibitions.js';

/**
 * The ten step ids, in flow order, written out rather than derived.
 *
 * Derived from `EN.steps` this test would assert that the dictionary matches
 * itself. The list is the flow's, and `App.tsx` passing a `StepId` to
 * `StepPrimer` is what ties the two together at compile time; this is the runtime
 * half of the same claim.
 */
const STEPS: readonly PrimerStep[] = [
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
];

const en = (step: PrimerStep): string => renderToStaticMarkup(<StepPrimer step={step} />);
const ar = (step: PrimerStep): string =>
  renderToStaticMarkup(
    <StaticLocale locale="ar">
      <StepPrimer step={step} />
    </StaticLocale>,
  );

describe('every step in the flow', () => {
  it('has a primer, in both languages', () => {
    for (const step of STEPS) {
      expect(EN.steps[step], `${step} has no English primer`).toBeDefined();
      expect(AR.steps[step], `${step} has no Arabic primer`).toBeDefined();
    }
    // Ten, and not nine with one page of the flow left silent.
    expect(Object.keys(EN.steps).sort()).toEqual([...STEPS].sort());
  });

  for (const step of STEPS) {
    describe(step, () => {
      const out = en(step);
      const p = EN.steps[step];

      it('renders the fact and nothing before it', () => {
        const text = stripTags(out).replace(/\s+/g, ' ').trim();
        expect(text).toBe(p.fact.replace(/\s+/g, ' ').trim());
      });

      it('states one fact, not a paragraph of them', () => {
        /*
          A `fact` that has grown to three sentences has become the argument
          again, which is what this whole component exists to keep out. One
          sentence — a single terminal full stop, at the end.
        */
        const sentences = p.fact.split(/\.\s/).length;
        expect(sentences, `${step}: "${p.fact}"`).toBe(1);
      });

      /*
        THE FOUR ABSENCES, EACH BY NAME.

        One assertion that the markup is short would pass on a primer that had
        regrown a disclosure and lost its fact. These name the four things that
        were removed on 5 Oct 2026, so a reinstated one fails on the line that
        says which.
      */
      it('carries no second paragraph', () => {
        expect(out, `${step} renders "means" again`).not.toContain(p.means.slice(0, 24));
        expect((out.match(/<p[\s>]/g) ?? []).length, `${step} paragraphs`).toBe(1);
      });

      it('carries no disclosure', () => {
        expect(out, `${step} has a <details>`).not.toMatch(/<details/);
        expect(stripTags(out), `${step} shows the summary`).not.toContain(p.whySummary);
      });

      it('carries no image and reserves no space for one', () => {
        expect(out, `${step} renders an <img>`).not.toMatch(/<img\b/);
        expect(out, `${step} keeps the figure layout`).not.toContain('figured');
      });

      it('carries no state swatch', () => {
        /*
          `traced--assumed` was the amber swatch beside the sentence that taught
          the colour. The colour itself was removed the same day — *«احذف التمييز
          نهائيًا»* — so a swatch here would now be a mark for a distinction the
          product no longer draws.
        */
        expect(out, `${step} renders a swatch`).not.toContain('traced--assumed');
      });

      it('claims no compliance and uses none of the banned vocabulary', () => {
        expectNoComplianceClaim(stripTags(out), step);
        expectNoBannedVocabulary(stripTags(out), step);
      });

      it('says it in Arabic, with no English prose left in it', () => {
        const markup = ar(step);
        const text = arabicReadingText(markup);
        expect(text).toContain(AR.steps[step]!.fact);
        /*
          The site's own rule for this, not a stricter local one. A run of four or
          more Latin WORDS is English prose that escaped translation; a shorter run
          is not, and the glossary explicitly sanctions one here — «مخطّط الأفكشن
          (Affection Plan)», the English in brackets once for a term whose Arabic a
          reader may not yet map onto the document in front of them. A blanket ban
          on Latin letters would have failed that on the one step where the
          glossary asks for it.
        */
        expectNoEnglishProse(markup, `${step} in Arabic`);
      });
    });
  }
});

/**
 * THE HONESTY THE REMOVAL DID NOT TOUCH.
 *
 * Cutting prose is safe exactly as far as the prose was teaching. The moment it
 * starts cutting things a reader is entitled to rely on it is a different change
 * wearing the same commit message, so the boundary is asserted rather than
 * described: the masthead sentence, the ASSUMED marks on values and the refusals
 * page are all outside this component and none of them moved. What is checkable
 * from here is that the primer never carried one of them in the first place.
 */
describe('what the primer never carried', () => {
  it('never carried the validity sentence, so removing it moved nothing', () => {
    for (const step of STEPS) {
      const text = stripTags(en(step)).toUpperCase();
      expect(text, `${step}`).not.toContain('NOT ASSESSED');
      expect(text, `${step}`).not.toContain('REGULATORY VALIDITY');
    }
  });
});

/**
 * THE DEFECT THIS WHOLE BLOCK EXISTS FOR WAS FOUND BY LOOKING, NOT BY TESTING.
 *
 * The first primers shipped with three steps whose middle layer restated the
 * panel four lines below it almost word for word — «Everything after this is
 * computed from what is on this screen» against «Everything after it is derived
 * from what is on it», and two more like it. Every assertion above passed. It
 * took a screenshot of the two blocks together to see it, and once seen it is
 * the most obvious thing on the screen: a product that says everything twice
 * reads as one that is not sure you were listening.
 *
 * So it is mechanical now. Any run of forty characters shared between a primer
 * and another dictionary is one of them repeating the other — forty is long
 * enough that no idiom reaches it by chance, and short enough to catch a
 * sentence that was lightly reworded rather than moved.
 *
 * IT STILL READS `means` AND `amber` THOUGH NOTHING RENDERS THEM. They are kept
 * in the dictionary against him asking for them back, and a sentence that has
 * quietly drifted into duplicating a panel while nobody was rendering it is the
 * one that would be reinstated.
 *
 * COMMENTS ARE STRIPPED FIRST, because the comments in these files quote the
 * copy they are explaining, and in the primer's case quote the very sentences
 * that were removed for this reason.
 */
describe('the primer and the panels under it', () => {
  const dir = new URL('../src/i18n/', import.meta.url);
  const strip = (code: string): string =>
    code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

  const others = readdirSync(dir)
    .filter((f) => /\.en\.ts$/.test(f) && !f.startsWith('primer.'))
    .map((f) => ({ file: f, code: strip(readFileSync(new URL(f, dir), 'utf8')) }));

  it('are read', () => {
    expect(others.length).toBeGreaterThan(8);
  });

  it('say each thing once', () => {
    const RUN = 40;
    for (const step of STEPS) {
      const p = EN.steps[step]!;
      // The disclosure is exempt: it is the long-form argument, it is closed, and
      // a phrase it shares with a panel is being explained rather than repeated.
      for (const sentence of [p.fact, p.means, p.amber ?? '']) {
        for (let i = 0; i + RUN <= sentence.length; i += 1) {
          const run = sentence.slice(i, i + RUN);
          for (const other of others) {
            expect(
              other.code.includes(run),
              `${step}: "${run}" is also in ${other.file}`,
            ).toBe(false);
          }
        }
      }
    }
  });
});
