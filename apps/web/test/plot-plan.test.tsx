/**
 * The key plan on a run card: the stored rings, north up, and nothing else.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PlotPlan } from '../src/components/PlotPlan.js';

const RECT = {
  plot: [
    [0, 0],
    [80000, 0],
    [80000, 40000],
    [0, 40000],
  ],
  setback: [
    [6000, 7500],
    [74000, 7500],
    [74000, 33500],
    [6000, 33500],
  ],
} as const;

describe('PlotPlan', () => {
  it('draws the plot ring and the setback line from the rings it is given', () => {
    const out = renderToStaticMarkup(<PlotPlan outline={RECT} />);
    expect(out).toContain('class="plot-plan__plot"');
    expect(out).toContain('class="plot-plan__setback"');
    // North up: model y is negated, so the far boundary is drawn at the top.
    expect(out).toContain('points="0,0 80000,0 80000,-40000 0,-40000"');
  });

  /* A key plan carries no figure. The card beside it prints the run's figures,
     and a number scaled onto a thumbnail is a second place to read one wrong. */
  it('prints no figure and hides itself from assistive technology', () => {
    const out = renderToStaticMarkup(<PlotPlan outline={RECT} />);
    expect(out).not.toMatch(/<text/);
    expect(out).toContain('aria-hidden="true"');
  });

  it('draws nothing for a ring that is not a shape', () => {
    expect(renderToStaticMarkup(<PlotPlan outline={{ plot: [[0, 0], [1, 1]], setback: [] }} />)).toBe('');
  });

  it('leaves the setback line out when the model has none', () => {
    const out = renderToStaticMarkup(<PlotPlan outline={{ plot: RECT.plot, setback: [] }} />);
    expect(out).not.toContain('plot-plan__setback');
  });
});
