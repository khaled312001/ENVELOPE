/**
 * The step primer, on all ten steps and in both languages.
 *
 * ---------------------------------------------------------------------------
 * THIS IS A TEST ABOUT SHAPE, BECAUSE THE SHAPE IS THE FIX.
 *
 * Three of the nine points in the client's reply are the same point — he read a
 * panel and could not tell what it was for. The answer was not more words: each
 * of those panels already said something true and important. It was an order.
 * Fact first, then what it costs the reader, then the argument behind a closed
 * disclosure.
 *
 * A test asserting the copy is present would pass on a step whose primer opened
 * with the argument again, which is the exact defect. So what is held here is the
 * ORDER, the CLOSED disclosure, and the completeness of the set — plus the two
 * prohibitions that apply to every surface on this site.
 *
 * AND THE AMBER SENTENCE IS HELD BOTH WAYS. It must be on the three steps where
 * an ASSUMED value is actually on screen, and absent from the other seven: a
 * sentence explaining a colour that is not there teaches a reader that the colour
 * is decoration, which is the precise opposite of what §13.1 reserves it for.
 */

import { readdirSync, readFileSync } from 'node:fs';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { STEP_IMAGE, StepPrimer } from '../src/components/StepPrimer.js';
import { hasImage } from '../src/img.js';
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

/** The three steps that put an ASSUMED value on screen. */
const AMBER_STEPS: readonly PrimerStep[] = ['assumptions', 'capacity', 'parking'];

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

      it('opens with the fact and not with the argument', () => {
        const text = stripTags(out).replace(/\s+/g, ' ').trim();
        expect(text.startsWith(p.fact.replace(/\s+/g, ' ')), `${step} opens: ${text.slice(0, 80)}`).toBe(
          true,
        );
        // The fact before what it means, and both before the disclosure.
        expect(out.indexOf(p.fact.slice(0, 20))).toBeLessThan(out.indexOf(p.means.slice(0, 20)));
        expect(out.indexOf(p.means.slice(0, 20))).toBeLessThan(out.indexOf('<details'));
      });

      it('states one fact, not a paragraph of them', () => {
        /*
          A `fact` that has grown to three sentences has become the argument
          again, which is what this whole component exists to move. One sentence
          — a single terminal full stop, at the end.
        */
        const sentences = p.fact.split(/\.\s/).length;
        expect(sentences, `${step}: "${p.fact}"`).toBe(1);
      });

      it('keeps the argument available and out of the way', () => {
        expect(out).toMatch(/<details[^>]*class="disclosure"/);
        expect(out, `${step} opens its disclosure`).not.toMatch(/<details[^>]*\sopen[\s>]/);
        expect(stripTags(out)).toContain(p.whySummary);
      });

      it('claims no compliance and uses none of the banned vocabulary', () => {
        expectNoComplianceClaim(stripTags(out), step);
        expectNoBannedVocabulary(stripTags(out), step);
      });

      it(`${AMBER_STEPS.includes(step) ? 'teaches amber, where amber is on screen' : 'does not teach a colour this step does not show'}`, () => {
        const shows = AMBER_STEPS.includes(step);
        expect(p.amber !== undefined, `${step} amber`).toBe(shows);
        expect(out.includes('traced--assumed'), `${step} swatch`).toBe(shows);
        if (shows) {
          // In words, not in the colour alone — 1.4.1, and a client who read the
          // colour and wrote back that he did not understand it.
          expect(stripTags(out).toLowerCase()).toContain('amber');
          expect(stripTags(out).toLowerCase()).toMatch(/assumed/);
        }
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

describe('the amber sentence', () => {
  it('names the colour and refuses the reading a Dubai reader arrives with', () => {
    /*
      The UAE Design System makes amber the government warning colour, so a
      reader trained on Dubai portals arrives holding the opposite meaning. This
      cannot be left to convention, and it is the one sentence in the primer that
      may not be shortened away.
    */
    for (const step of AMBER_STEPS) {
      const text = stripTags(en(step)).toLowerCase();
      expect(text, `${step}`).toMatch(/not a warning|not unsafe|nothing has gone wrong/);
    }
  });

  it('is beside the colour, not a paragraph away from it', () => {
    for (const step of AMBER_STEPS) {
      expect(en(step)).toContain('<p class="primer__amber"><span class="traced traced--assumed"');
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

/**
 * THE FIGURE, AND THE TWO WAYS IT COMES APART.
 *
 * A step's drawing is named here and described in `imagery.en.ts` /
 * `imagery.ar.ts`, which `imagery.test.ts` holds to the brief that commissioned
 * it. What is left for this file is the half that is the primer's own: that the
 * right steps have a figure at all, that the names are ones the brief
 * commissions, and that the panel does not change shape until a file exists.
 *
 * THE SECOND OF THOSE IS THE ONE WITH NO FILES IN IT. None of the twenty-five
 * images exists yet; `img.tsx` makes absence silent, and the assertion below is
 * written so that it holds BEFORE and AFTER they land - an `<img>` is present in
 * the markup exactly when the file is on disk, never on the strength of a name
 * in a table.
 */
describe('the step figure', () => {
  const ILLUSTRATED = STEPS.filter((s) => STEP_IMAGE[s] !== undefined);

  it('is commissioned for every step but the confirmation screen', () => {
    expect(ILLUSTRATED).toEqual(STEPS.filter((s) => s !== 'parameters'));
  });

  /*
    THE NAMES ARE HELD TO THE BRIEF, not to themselves. `image-prompts.md` is what
    was commissioned and what will be delivered; a name invented here would be a
    slot no file ever lands in, and the panel would go on rendering nothing with
    every gate green.
  */
  it('names the files image-prompts.md commissions for a step', () => {
    const brief = readFileSync(
      new URL('../../../docs/06-plan/image-prompts.md', import.meta.url),
      'utf8',
    );
    const commissioned = new Set(
      [...brief.matchAll(/^### #\d+ \u2014 `(step-[a-z0-9-]+)\.[a-z]+`/gm)].map((m) => m[1]!),
    );
    expect(commissioned.size).toBe(ILLUSTRATED.length);
    for (const step of ILLUSTRATED) {
      expect(commissioned.has(STEP_IMAGE[step]!), `${step}: ${STEP_IMAGE[step]}`).toBe(true);
    }
  });

  it('renders an image exactly when the file is on disk', () => {
    for (const step of STEPS) {
      const markup = renderToStaticMarkup(
        <StaticLocale locale="en">
          <StepPrimer step={step} />
        </StaticLocale>,
      );
      const name = STEP_IMAGE[step];
      const expected = name !== undefined && hasImage(name);
      expect(
        /<img\b/.test(markup),
        `${step}: an image while the file is ${expected ? 'present' : 'absent'}`,
      ).toBe(expected);
    }
  });
});
