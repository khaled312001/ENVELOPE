/**
 * The plan's boundary markers (Eng. Mohamed, 16 Oct 2026): every boundary is
 * numbered, never `?`, and with `onPick` each number is a button that opens it.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PlotSketch, type SketchEdge } from '../src/components/PlotSketch.js';

const SQUARE = [
  { x: '0', y: '0' },
  { x: '40', y: '0' },
  { x: '40', y: '30' },
  { x: '0', y: '30' },
];
const EDGES: readonly SketchEdge[] = [
  { seq: 0, classification: 'ROAD', roadHierarchy: 'LOCAL' },
  { seq: 1, classification: '' },
  { seq: 2, classification: 'ADJACENT_PLOT' },
  { seq: 3, classification: '' },
];

/** The text of every <text> element, in order. */
const texts = (svg: string): string[] => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]!);

describe('the plan view numbers its boundaries', () => {
  it('prints each boundary’s number, classified or not, and never a question mark', () => {
    const svg = renderToStaticMarkup(<PlotSketch vertices={SQUARE} edges={EDGES} label="plan" />);
    const t = texts(svg);
    for (const n of ['0', '1', '2', '3']) expect(t).toContain(n);
    expect(t).not.toContain('?');
  });

  it('marks an unclassified boundary without colour: a broken ring around its number', () => {
    const svg = renderToStaticMarkup(<PlotSketch vertices={SQUARE} edges={EDGES} label="plan" />);
    // Two unanswered boundaries, two dashed marker rings.
    expect(svg.match(/<circle[^>]*stroke-dasharray/g)?.length).toBe(2);
  });

  it('is an image with no controls when nothing can be picked', () => {
    const svg = renderToStaticMarkup(<PlotSketch vertices={SQUARE} edges={EDGES} label="plan" />);
    expect(svg).toContain('role="img"');
    expect(svg).not.toContain('role="button"');
  });

  it('makes every number a named, focusable button when the plan is pickable', () => {
    const svg = renderToStaticMarkup(
      <PlotSketch vertices={SQUARE} edges={EDGES} label="plan" onPick={() => undefined} pickLabel={(i) => `Boundary ${i}`} highlight={2} />,
    );
    // A drawing that holds buttons is a group, not an image (an image's children are not announced).
    expect(svg).toContain('role="group"');
    const buttons = [...svg.matchAll(/<g[^>]*role="button"[^>]*>/g)].map((m) => m[0]);
    expect(buttons).toHaveLength(4);
    for (const [i, b] of buttons.entries()) {
      expect(b).toContain('tabindex="0"');
      expect(b).toContain(`aria-label="Boundary ${i}"`);
    }
    // The open boundary says so to a screen reader, not only in ink.
    expect(buttons[2]).toContain('aria-pressed="true"');
    expect(buttons[0]).toContain('aria-pressed="false"');
  });

  it('draws no marker on the compact thumbnail', () => {
    const svg = renderToStaticMarkup(<PlotSketch vertices={SQUARE} edges={EDGES} label="plan" compact />);
    expect(texts(svg)).toEqual([]);
  });
});
