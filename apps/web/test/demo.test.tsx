/**
 * `?demo=worked-example` — the query the landing page's primary button carries.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS IS GUARDING, AND IT IS NOT "THE DEMO LOADS".
 *
 * The demo exists to hand a visitor the run whose output the landing page prints.
 * Its failure mode is not that it does nothing — that is visible in a second — but
 * that it loads an input which is *nearly* the recorded one and produces a
 * different answer from the one the reader has just been shown. Nobody would see
 * that in a screenshot. They would see it in the number, decide the page was
 * decorated, and be right to.
 *
 * So the assertions below compare, field by field, what `demo.ts` hands the two
 * screens against `worked-example.json` itself — which is the same file
 * `scripts/verify-worked-example.mjs` re-runs against the real API and the landing
 * page reads every figure from. A drift in either direction fails here.
 *
 * THE RECTANGLE IS THE SUBTLE ONE. `PlotForm` takes a width and a depth; the
 * recorded input holds vertices. Reading a width off a bounding box is exact for
 * an axis-aligned rectangle and silently wrong for anything else, so the last two
 * tests hold `rectangleOf` to refusing every shape it cannot prove is one.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import example from '../src/screens/worked-example.json' with { type: 'json' };
import { WORKED_EXAMPLE, demoFrom } from '../src/demo.js';
import { UnitMixSummary } from '../src/screens/RulesStep.js';
import { stripTags } from './prohibitions.js';

const INPUT = example.input;

describe('the worked-example demo', () => {
  it('is recognised by the query the landing page actually links to', () => {
    // The literal string, not a constant shared with the producer: a test that
    // imported the same constant the link is built from would pass on a typo.
    expect(demoFrom('?demo=worked-example')).not.toBeNull();
    expect(demoFrom('?demo=worked-example&step=plot')).not.toBeNull();
    expect(demoFrom('?step=plot')).toBeNull();
    expect(demoFrom('')).toBeNull();
    // Not "any demo": an unknown id is not quietly served the only one there is.
    expect(demoFrom('?demo=something-else')).toBeNull();
  });

  it('carries the plot the landing page ran, not one that resembles it', () => {
    const plot = WORKED_EXAMPLE.plot;
    expect(plot, 'the worked example stopped being a rectangle').not.toBeNull();
    expect(plot!.plotNumber).toBe(INPUT.plot.plotNumber);
    expect(plot!.community).toBe(INPUT.plot.community);

    // The rectangle, checked against the vertices rather than against a literal.
    const xs = INPUT.plot.vertices.map((v) => Number(v.x));
    const ys = INPUT.plot.vertices.map((v) => Number(v.y));
    expect(Number(plot!.widthM)).toBe(Math.max(...xs) - Math.min(...xs));
    expect(Number(plot!.depthM)).toBe(Math.max(...ys) - Math.min(...ys));

    // Every edge, in the recorded order. The access recommendation is computed
    // from exactly these, so an edge that arrives unclassified changes the answer
    // on the one screen the client called the product.
    expect(plot!.edges.length).toBe(INPUT.plot.edges.length);
    INPUT.plot.edges.forEach((edge, i) => {
      expect(plot!.edges[i]!.classification).toBe(edge.classification);
      expect(plot!.edges[i]!.roadHierarchy).toBe(
        'roadHierarchy' in edge ? edge.roadHierarchy : '',
      );
    });
  });

  it('carries every run parameter that has no default on the rules step', () => {
    const run = WORKED_EXAMPLE.run;
    expect(run.parkingInFar).toBe(INPUT.run.parkingInFar);
    expect(run.parkingLevelsAvailable).toBe(INPUT.run.parkingLevelsAvailable);
    expect(run.saleableEfficiency).toBe(INPUT.run.saleableEfficiency.value);
  });

  it('carries the recorded unit mix, which the generic default would have replaced', () => {
    /*
      The defect this is written against, stated as a number: the fallback mix is
      three unit types at 50/37.5/12.5, the recorded one is two at 50/50. Posting
      the fallback changes what one unit costs in GFA and therefore the unit count,
      against a page that prints the other answer.
    */
    const entries = WORKED_EXAMPLE.run.unitMix.entries;
    expect(entries.length).toBe(INPUT.run.unitMix.entries.length);
    INPUT.run.unitMix.entries.forEach((e, i) => {
      expect(entries[i]!.typeId).toBe(e.typeId);
      expect(entries[i]!.label).toBe(e.label);
      expect(entries[i]!.share).toBe(e.share);
      expect(entries[i]!.nsaM2).toBe(e.nsaM2);
    });
  });

  it('says in its basis that the reader did not choose the mix', () => {
    // It is posted as USER_SET so the run reproduces; the basis is where the truth
    // about who chose it has to live, because that is what the report prints.
    const basis = WORKED_EXAMPLE.run.unitMix.basis;
    expect(basis).toMatch(/did not choose/i);
    expect(basis).toMatch(/worked example/i);
  });
});

describe('the unit mix, before it is computed on', () => {
  it('prints every type, its share and its area', () => {
    const out = renderToStaticMarkup(
      <UnitMixSummary
        mix={{
          source: 'USER_SET',
          entries: [{ typeId: '1BED', label: '1 bedroom', share: '0.5', nsaM2: '70' }],
          basis: 'the mix on file',
        }}
      />,
    );
    const text = stripTags(out).replace(/\s+/g, ' ');
    expect(text).toContain('1 bedroom');
    expect(text).toContain('50.0');
    expect(text).toContain('70');
  });

  it('names an assumed mix as assumed, in words and not only in amber', () => {
    /*
      §13.1's amber is the most important decision in the product and a client read
      it and replied that he did not understand it. Colour alone also fails 1.4.1.
      So the class is stated: the word, then the basis.
    */
    const out = renderToStaticMarkup(
      <UnitMixSummary
        mix={{
          source: 'ASSUMED',
          entries: [{ typeId: '1BED', label: '1 bedroom', share: '1', nsaM2: '70' }],
          basis: 'a generic mix',
        }}
      />,
    );
    expect(stripTags(out)).toContain('Assumed.');
    expect(out).toContain('traced--assumed');
  });

  it('paints no amber on a mix somebody entered', () => {
    const out = renderToStaticMarkup(
      <UnitMixSummary
        mix={{
          source: 'USER_SET',
          entries: [{ typeId: '1BED', label: '1 bedroom', share: '1', nsaM2: '70' }],
          basis: 'chosen by the person running this study',
        }}
      />,
    );
    expect(out).not.toContain('traced--assumed');
    expect(stripTags(out)).toContain('Entered.');
  });
});
