/**
 * The page placed on the grid, so the sheet lies under the map exactly where
 * its drawing says the plot is (Eng. Mohamed, 16 Oct 2026). Held to the two
 * sheets on file that can say so, and to a path that merely resembles the plot.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { ProvenanceGraph, Tracer } from '@envelope/core';
import { describe, expect, it } from 'vitest';

import { parseAffectionPlan, type AffectionPlanFacts } from '../src/affection-plan.js';
import { matchDrawnRing, type PagePlacement } from '../src/on-page.js';

const REPO = new URL('../../../', import.meta.url);
const SHEETS = {
  warsan: 'docs/00-source/samples/affection-plan/IC1-CTYL-16_011-warsan1-621.pdf',
  dda: 'docs/00-source/samples/affection-plan/DDA-5134565-saih-shuaib-1.pdf',
  dm: 'docs/00-source/samples/affection-plan/DM-1341556-al-mamzar.pdf',
} as const;

async function parse(key: keyof typeof SHEETS): Promise<AffectionPlanFacts> {
  const bytes = new Uint8Array(await readFile(fileURLToPath(new URL(SHEETS[key], REPO))));
  return parseAffectionPlan(bytes, { documentUri: SHEETS[key], tracer: new Tracer(new ProvenanceGraph()) });
}

const toGrid = (p: PagePlacement, x: number, y: number): [number, number] => [p.ax * x + p.bx * y + p.cx, p.ay * x + p.by * y + p.cy];

/** The plot's box on the page, carried to the grid, against the box of the corners the sheet gives. */
function boxGap(p: PagePlacement, points: readonly { east: string; north: string }[]): number {
  const [x0, y0, x1, y1] = p.plotBoxPt;
  const mapped = [toGrid(p, x0, y0), toGrid(p, x1, y0), toGrid(p, x1, y1), toGrid(p, x0, y1)];
  const e = points.map((q) => Number(q.east));
  const n = points.map((q) => Number(q.north));
  const me = mapped.map((m) => m[0]);
  const mn = mapped.map((m) => m[1]);
  return Math.max(
    Math.abs(Math.min(...me) - Math.min(...e)),
    Math.abs(Math.max(...me) - Math.max(...e)),
    Math.abs(Math.min(...mn) - Math.min(...n)),
    Math.abs(Math.max(...mn) - Math.max(...n)),
  );
}

describe('the page on the grid', () => {
  it('the DDA sheet: the drawn plot matches its coordinate table to the centimetre', async () => {
    const facts = await parse('dda');
    const onPage = facts.survey?.onPage;
    expect(onPage).toBeDefined();
    expect(onPage!.residualM).toBeLessThan(0.01);
    expect(boxGap(onPage!, facts.survey!.points.value)).toBeLessThan(0.05);
    // The drawing's frame: four strokes, with the PLOT DETAILS panel to the right of x = 949.1 left out.
    expect(onPage!.frameBoxPt.map((v) => Number(v.toFixed(1)))).toEqual([241.4, 73.9, 949.1, 818.7]);
  }, 60_000);

  it('the Municipality sheet: the grid crosses carry the drawn plot onto its own corners', async () => {
    const facts = await parse('dm');
    const onPage = facts.drawn?.onPage;
    expect(onPage).toBeDefined();
    expect(onPage!.bx).toBe(0);
    expect(onPage!.ay).toBe(0);
    expect(boxGap(onPage!, facts.drawn!.points.value)).toBeLessThan(0.01);
    // The map frame, not the page: the tables and location maps sit outside it.
    expect(onPage!.frameBoxPt.map((v) => Math.round(v))).toEqual([613, 255, 1153, 754]);
  }, 60_000);

  it('a sheet with neither a table nor a grid is not placed, rather than placed by a guess', async () => {
    const facts = await parse('warsan');
    expect(facts.survey?.onPage).toBeUndefined();
    expect(facts.drawn).toBeUndefined();
  }, 60_000);

  it('NEGATIVE: a path that only resembles the plot does not place the page', () => {
    const table = [
      { id: '1', east: '0', north: '0' },
      { id: '2', east: '40', north: '0' },
      { id: '3', east: '40', north: '30' },
      { id: '4', east: '0', north: '30' },
    ];
    // Four corners, but a square, not a 4:3 rectangle: the best similarity misses by metres.
    const square = { paint: 20, fill: null, closed: true, points: [[0, 0], [100, 0], [100, 100], [0, 100]] as [number, number][] };
    expect(matchDrawnRing([square], table, [0, 0, 600, 400])).toBeUndefined();
    // The right shape, rotated and scaled on the page, is found.
    const drawn = { ...square, points: [[200, 100], [200, 180], [140, 180], [140, 100]] as [number, number][] };
    const hit = matchDrawnRing([square, drawn], table, [0, 0, 600, 400]);
    expect(hit?.residualM).toBeLessThan(0.001);
    expect(toGrid(hit!, 200, 100).map((v) => Number(v.toFixed(6)))).toEqual([0, 0]);
  });
});
