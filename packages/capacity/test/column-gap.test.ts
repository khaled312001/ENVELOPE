/**
 * Half a metre after every three bays, for the columns (Eng. Mohamed, 16 Oct 2026:
 * «كل ٣ باكييات بينهم مسافه ٥٠ سم»).
 *
 * Asked for twice in one day, because the first drawings packed bays shoulder to
 * shoulder the length of every run. So the assertions are about the drawing, not
 * the count: along every run of every arrangement the engine can pick, bays come
 * in groups of three with exactly 0.50 m between groups, and never four touching.
 */

import { Decimal, ProvenanceClass, ProvenanceGraph, Tracer } from '@envelope/core';
import { describe, expect, it } from 'vitest';

import { layoutParkingLevel, ParkingLayoutError, RectKind, type PlacedRect } from '../src/layout.js';

const d = (v: string | number): Decimal => new Decimal(v);

function lay(widthM: string, depthM: string, gap: boolean, extra: Partial<Parameters<typeof layoutParkingLevel>[0]> = {}) {
  const tracer = new Tracer(new ProvenanceGraph());
  return layoutParkingLevel({
    tracer,
    footprint: { widthM: d(widthM), depthM: d(depthM) },
    deductions: { areaM2: d(0), source: 'ASSUMED', basis: 'test fixture takes no deduction' },
    ...(gap
      ? {
          columnGap: {
            everyBays: 3,
            gapM: tracer.userSet('parking.column_gap_m', d('0.5'), {
              actor: { id: 'STMT-COLUMN-GAP-2026-10-16', name: 'Eng. Mohamed' },
              unit: 'm',
            }),
          },
        }
      : {}),
    ...extra,
  });
}

/** The bays standing side by side along one line: same row, same cross position, same facing. */
function lines(rects: readonly PlacedRect[]): number[][] {
  const bays = rects.filter((r) => r.kind === RectKind.BAY);
  const groups = new Map<string, number[]>();
  for (const b of bays) {
    const alongX = b.width.lt(b.height);
    const key = `${b.row}|${alongX ? 'x' : 'y'}|${(alongX ? b.y : b.x).toFixed(3)}`;
    const at = Number((alongX ? b.x : b.y).toFixed(3));
    groups.set(key, [...(groups.get(key) ?? []), at]);
  }
  return [...groups.values()].map((v) => v.sort((a, b) => a - b));
}

/** Each run of bays along a line, split where the step is wider than one bay and its column gap. */
function groupsOf(line: readonly number[]): number[][] {
  const runs: number[][] = [];
  let group: number[] = [];
  let run: number[] = [];
  const close = (): void => {
    if (group.length) run.push(group.length);
    group = [];
  };
  line.forEach((x, i) => {
    const step = i === 0 ? null : Math.round((x - line[i - 1]!) * 1000) / 1000;
    if (step === null || step === 2.5) group.push(x);
    else if (step === 3) {
      close();
      group.push(x);
    } else {
      close();
      if (run.length) runs.push(run);
      run = [];
      group.push(x);
    }
  });
  close();
  if (run.length) runs.push(run);
  return runs;
}

const SIZES: readonly (readonly [string, string])[] = [
  ['80', '40'],
  ['50.85', '26.85'],
  ['36', '62'],
  ['60', '60'],
];

describe('a column gap after every three bays', () => {
  for (const [w, h] of SIZES) {
    it(`groups the bays in threes with 0.50 m between them, ${w} × ${h} m`, () => {
      const out = lay(w, h, true);
      const runs = lines(out.rects).flatMap(groupsOf);
      expect(runs.length).toBeGreaterThan(0);
      let gaps = 0;
      for (const run of runs) {
        // Every group but a run's last is exactly three; the last may be shorter, never longer.
        run.slice(0, -1).forEach((n) => expect(n).toBe(3));
        expect(run[run.length - 1]!).toBeLessThanOrEqual(3);
        gaps += run.length - 1;
      }
      expect(gaps).toBeGreaterThan(0);
    });
  }

  it('without the statement, the bays still pack shoulder to shoulder, as every older run did', () => {
    const out = lay('80', '40', false);
    const longest = Math.max(...lines(out.rects).flatMap(groupsOf).flat());
    expect(longest).toBeGreaterThan(3);
  });

  it('costs bays, and never gains one', () => {
    for (const [w, h] of SIZES) {
      expect(lay(w, h, true).bayCount.value).toBeLessThanOrEqual(lay(w, h, false).bayCount.value);
    }
  });

  it('puts the gap in the formula and the statement in the graph, USER_SET under his name', () => {
    const graph = new ProvenanceGraph();
    const tracer = new Tracer(graph);
    const out = layoutParkingLevel({
      tracer,
      footprint: { widthM: d('80'), depthM: d('40') },
      deductions: { areaM2: d(0), source: 'ASSUMED', basis: 'test fixture takes no deduction' },
      columnGap: {
        everyBays: 3,
        gapM: tracer.userSet('parking.column_gap_m', d('0.5'), {
          actor: { id: 'STMT-COLUMN-GAP-2026-10-16', name: 'Eng. Mohamed' },
          unit: 'm',
        }),
      },
    });
    const gap = graph.nodes.find((n) => n.parameterId === 'parking.column_gap_m' && n.kind === 'VALUE');
    expect(gap?.provenanceClass).toBe(ProvenanceClass.USER_SET);
    const formulas = graph
      .outgoing(out.bayCount.node)
      .map((e) => graph.node(e.to).formula ?? '')
      .join(' ');
    expect(formulas).toMatch(/0\.50 m left after every 3 bays for the columns/);
    // The count reaches the statement through the graph, not through a comment.
    const reaches = (from: Parameters<typeof graph.outgoing>[0], seen = new Set<string>()): boolean =>
      from === gap!.id ||
      graph.outgoing(from).some((e) => !seen.has(e.to) && (seen.add(e.to), reaches(e.to, seen)));
    expect(reaches(out.bayCount.node)).toBe(true);
    expect(out.notes.join(' ')).toMatch(/No column is drawn in the gap/);
  });

  it('refuses a level given both a structural grid and a column gap', () => {
    expect(() => lay('80', '40', true, { structuralGridM: d('8') })).toThrow(ParkingLayoutError);
  });
});
