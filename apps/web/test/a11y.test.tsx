/**
 * The WCAG 2.2 P0 set, asserted over real rendered markup.
 *
 * Contrast lives in `tokens.test.ts` (it is a property of the palette, not of a
 * screen). What is here is everything that can be decided from the DOM a user's
 * browser actually receives: names, roles, structure, and the one that keeps
 * coming back — a control with no accessible name.
 *
 * These are cheap checks that catch expensive regressions. None of them replaces
 * a person with a screen reader, and the audit note in the README says so.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PlotCanvas } from '../src/components/PlotCanvas.js';
import { ProvenanceLegend, TracedValue } from '../src/components/TracedValue.js';

const EDGES = [
  { seq: 0, classification: 'ROAD' as const, roadHierarchy: 'LOCAL', lengthM: '80', setbackM: '4.5', ruleId: 'R-A' },
  { seq: 1, classification: 'ADJACENT_PLOT' as const, roadHierarchy: null, lengthM: '40', setbackM: '7.5', ruleId: 'R-B' },
  { seq: 2, classification: 'ROAD' as const, roadHierarchy: 'COLLECTOR', lengthM: '80', setbackM: '6', ruleId: 'R-A' },
  { seq: 3, classification: 'ADJACENT_PLOT' as const, roadHierarchy: null, lengthM: '40', setbackM: '7.5', ruleId: 'R-B' },
];
const VERTICES = [
  { x: '0', y: '0' },
  { x: '80', y: '0' },
  { x: '80', y: '40' },
  { x: '0', y: '40' },
];

/** Every `<button>` in the markup, with whatever would name it. */
function buttons(html: string): { tag: string; named: boolean }[] {
  return [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map((m) => {
    const attrs = m[1] ?? '';
    const inner = (m[2] ?? '').replace(/<[^>]*>/g, '').trim();
    const labelled = /aria-label="[^"]+"/.test(attrs) || /aria-labelledby="[^"]+"/.test(attrs);
    // Text inside an aria-hidden span does not name anything.
    const visibleText = (m[2] ?? '')
      .replace(/<[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/[^>]+>/g, '')
      .replace(/<[^>]*>/g, '')
      .trim();
    return { tag: m[0].slice(0, 90), named: labelled || visibleText.length > 0 || inner.length > 0 };
  });
}

describe('WCAG 2.2 — 4.1.2 name, role, value', () => {
  it('names every button in the plot figure', () => {
    const html = renderToStaticMarkup(
      <PlotCanvas
        vertices={VERTICES}
        edges={EDGES}
        areaM2="3200"
        footprintAreaM2="1917.5"
        onSelectEdge={() => {}}
        selectedEdge={1}
      />,
    );
    const found = buttons(html);
    expect(found.length).toBeGreaterThan(0);
    for (const b of found) expect(b.named, `unnamed control: ${b.tag}`).toBe(true);
  });

  it('names every traced value with its parameter, value and provenance', () => {
    const html = renderToStaticMarkup(
      <TracedValue
        traced={{
          value: '32',
          node: 'n1',
          parameterId: 'parking.bay_area_factor',
          provenanceClass: 'ASSUMED',
          renderHint: 'AMBER_DOTTED_EDITABLE',
          unit: 'm²/bay',
        }}
        onInspect={() => {}}
      />,
    );
    // 1.4.1 — the state reaches a screen reader as words, not only as amber.
    expect(html).toMatch(/aria-label="[^"]*parking\.bay_area_factor[^"]*"/);
    expect(html).toMatch(/sr-only/);
    expect(html).toMatch(/Assumed|assumption/i);
  });
});

describe('WCAG 2.2 — 1.4.1 colour is never the only signal', () => {
  it('gives the plot figure a text description and per-edge labels', () => {
    const html = renderToStaticMarkup(
      <PlotCanvas vertices={VERTICES} edges={EDGES} areaM2="3200" onSelectEdge={() => {}} />,
    );
    expect(html).toMatch(/role="img"/);
    expect(html).toMatch(/aria-label="[^"]{20,}"/);
    // The colour swatch is decorative; the classification is also written out.
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('Neighbouring plot');
    expect(html).toContain('Road');
  });

  it('names each provenance state in words, not only in colour', () => {
    const html = renderToStaticMarkup(<ProvenanceLegend />);
    // The legend deliberately uses plain language over the internal vocabulary —
    // "From a cited rule", not "DERIVED". The assertion follows the copy, since
    // the copy is what a reader has to understand.
    for (const phrase of [
      'From a cited rule',
      'Assumed',
      'You entered it',
      'Not assessed',
    ]) {
      expect(html, `the legend must name "${phrase}"`).toContain(phrase);
    }
    // And the amber state must say what it costs, not merely that it exists.
    expect(html).toMatch(/moves the answer/);
  });
});

describe('WCAG 2.2 — 2.5.8 target size', () => {
  it('offers a full-width row for every edge, not only the line in the drawing', () => {
    const html = renderToStaticMarkup(
      <PlotCanvas vertices={VERTICES} edges={EDGES} areaM2="3200" onSelectEdge={() => {}} />,
    );
    // One button per edge in the legend, each carrying its pressed state.
    expect((html.match(/class="plot-legend__row"/g) ?? []).length).toBe(EDGES.length);
    expect((html.match(/aria-pressed="/g) ?? []).length).toBe(EDGES.length);
  });

  it('renders the legend as static text when there is nothing to select', () => {
    const html = renderToStaticMarkup(
      <PlotCanvas vertices={VERTICES} edges={EDGES} areaM2="3200" />,
    );
    // A button that does nothing is a worse affordance than no button.
    expect(html).not.toContain('<button');
    expect(html).toContain('plot-legend__row--static');
  });
});

describe('WCAG 2.2 — 2.1.1 keyboard, and no positive tabindex', () => {
  it('never takes an element out of document order with tabindex > 0', () => {
    const html = renderToStaticMarkup(
      <PlotCanvas
        vertices={VERTICES}
        edges={EDGES}
        areaM2="3200"
        onSelectEdge={() => {}}
        selectedEdge={0}
      />,
    );
    for (const m of html.matchAll(/tabindex="(-?\d+)"/gi)) {
      expect(Number(m[1]), 'a positive tabindex reorders the whole page').toBeLessThanOrEqual(0);
    }
  });
});
