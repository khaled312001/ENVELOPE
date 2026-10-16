/**
 * Each boundary's class, suggested from the sheet and the map and filled in by
 * itself (Eng. Mohamed, 16 Oct 2026). What must not happen is as important as
 * what must: the map may not overrule the sheet, silence may not become a
 * neighbour, and a reader's answer — including clearing a suggestion — is never
 * written over.
 */
import { describe, expect, it } from 'vitest';

import { fillFromSuggestions, type RoadBeside, suggestEdges } from '../src/studio/edge-suggest.js';
import type { DraftPlot } from '../src/studio/model.js';

const road = (seq: number, hierarchy: 'ARTERIAL' | 'COLLECTOR' | 'LOCAL' | 'ACCESS', osmClass = 'secondary'): RoadBeside => ({
  seq,
  road: { osmClass, hierarchy, name: 'Test Street', nameAr: null, distanceM: 12 },
});
const none = (seq: number): RoadBeside => ({ seq, road: null });

const blank = (n: number): DraftPlot => ({
  plotNumber: 'T',
  community: 'T',
  vertices: Array.from({ length: n }, () => ({ x: '0', y: '0' })),
  edges: Array.from({ length: n }, () => ({ classification: '' as const, roadHierarchy: '' as const })),
});

describe('suggestEdges', () => {
  it('takes the class from the sheet and the rank from the map', () => {
    const s = suggestEdges(
      4,
      [{ classification: 'ROAD', verbatim: 'ROAD 79.25' }, { classification: 'ADJACENT_PLOT', verbatim: '1341194' }, null, null],
      [road(0, 'COLLECTOR'), road(1, 'LOCAL'), road(2, 'ACCESS', 'service'), none(3)],
    );
    expect(s[0]).toMatchObject({ classification: 'ROAD', roadHierarchy: 'COLLECTOR', from: 'both' });
    // The sheet prints a neighbour's number: the map's road does not overrule it.
    expect(s[1]).toMatchObject({ classification: 'ADJACENT_PLOT', roadHierarchy: '', from: 'sheet' });
    expect(s[2]).toMatchObject({ classification: 'ROAD', roadHierarchy: 'ACCESS', from: 'map' });
    // Neither witness says anything: no road on the map is not a neighbour.
    expect(s[3]).toBeNull();
  });

  it('ignores a witness that describes a ring of another size', () => {
    const s = suggestEdges(3, [{ classification: 'ROAD', verbatim: 'ROAD' }], [road(0, 'LOCAL')]);
    expect(s).toEqual([null, null, null]);
  });
});

describe('fillFromSuggestions', () => {
  const suggestions = suggestEdges(3, [], [road(0, 'COLLECTOR'), none(1), road(2, 'LOCAL', 'minor')]);

  it('fills empty fields, and says which', () => {
    const out = fillFromSuggestions(blank(3), suggestions, new Set())!;
    expect(out.draft.edges.map((e) => `${e.classification}/${e.roadHierarchy}`)).toEqual(['ROAD/COLLECTOR', '/', 'ROAD/LOCAL']);
    expect(out.keys).toHaveLength(2);
  });

  it('never writes over an answer, and only adds a missing rank to a road', () => {
    const answered: DraftPlot = {
      ...blank(3),
      edges: [
        { classification: 'ADJACENT_PLOT', roadHierarchy: '' },
        { classification: '', roadHierarchy: '' },
        { classification: 'ROAD', roadHierarchy: '' },
      ],
    };
    const out = fillFromSuggestions(answered, suggestions, new Set())!;
    expect(out.draft.edges.map((e) => `${e.classification}/${e.roadHierarchy}`)).toEqual(['ADJACENT_PLOT/', '/', 'ROAD/LOCAL']);
  });

  it('does not put back a suggestion the reader cleared', () => {
    const first = fillFromSuggestions(blank(3), suggestions, new Set())!;
    const applied = new Set(first.keys);
    // The reader sets boundary 0 back to unanswered; the same suggestion stays applied.
    const cleared = { ...first.draft, edges: first.draft.edges.map((e, i) => (i === 0 ? { classification: '' as const, roadHierarchy: '' as const } : e)) };
    expect(fillFromSuggestions(cleared, suggestions, applied)).toBeNull();
  });
});
