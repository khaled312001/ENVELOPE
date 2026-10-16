/**
 * The map on the plot step, as Eng. Mohamed tested it (Oct 2026) — every defect
 * he reported, held here by the function that fixes it.
 *
 * There is no WebGL in this suite, and that is the design rather than a gap:
 * each edit is a pure function on a list of corners (`map-trace.ts`) and the
 * canvas only calls it. The browser walk that clicks, types and drags them is
 * done on the real page; what is asserted here is what each edit does to the
 * figures, which is the part a picture cannot be trusted to show.
 *
 * 1. The overlay drew its dashed outline and never the sheet. Two causes: the
 *    picture was handed to maplibre as a url, which maplibre FETCHES and the
 *    site's `connect-src` refuses; and on a DDA sheet the picture was the
 *    authority's logo. `showUnderlay` must never give the source a url, and
 *    `underlayRegion` must not crop to a picture the plot was not read from.
 * 2–5. A boundary typed to a length, the outline moved, a corner deleted or
 *    added with the table's classifications kept, and the live length.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { ProvenanceGraph, Tracer } from '@envelope/core';
import { parseAffectionPlan } from '@envelope/intake';
import { beforeAll, describe, expect, it } from 'vitest';

import { fromUtm40, legBetween, type LngLat, toUtm40 } from '@web/geo.js';

import {
  deleteCorner,
  insertCorner,
  liveLength,
  type MapTrace,
  parseLength,
  translateBy,
  translateTrace,
  withCornerAt,
  withEdgeLength,
} from '../src/components/map-trace.js';
import { hideUnderlay, type Quad, showUnderlay, type UnderlayMap, underlayRegion, UNDERLAY_SOURCE } from '../src/components/sheet-underlay.js';
import { ringToDraft } from '../src/studio/geometry.js';
import type { DraftPlot } from '../src/studio/model.js';

/* A plot built on the grid and turned into degrees, so its lengths are known exactly. */
const ORIGIN = toUtm40({ lng: 55.3, lat: 25.1 });
const at = (e: number, n: number): LngLat => fromUtm40({ e: ORIGIN.e + e, n: ORIGIN.n + n });
/* A 33.15 m first boundary, as on the sheet he tested with, then a rectangle's other three. */
const RECT: MapTrace = { ring: [at(0, 0), at(33.15, 0), at(33.15, 20), at(0, 20)], closed: true };
const len = (t: MapTrace, i: number): number => legBetween(t.ring[i]!, t.ring[(i + 1) % t.ring.length]!).lengthM;
const bearing = (t: MapTrace, i: number): number => legBetween(t.ring[i]!, t.ring[(i + 1) % t.ring.length]!).bearingDeg;

describe('a boundary typed to a length', () => {
  it('reads what was typed, and refuses what is not a positive length in a code', () => {
    expect(parseLength('35')).toEqual({ lengthM: 35 });
    expect(parseLength(' 35.5 ')).toEqual({ lengthM: 35.5 });
    // An Arabic keyboard's digits and decimal separator are a figure too.
    expect(parseLength('٣٥٫٢٥')).toEqual({ lengthM: 35.25 });
    expect(parseLength('0')).toEqual({ refusal: 'not-positive' });
    expect(parseLength('-4')).toEqual({ refusal: 'not-positive' });
    expect(parseLength('')).toEqual({ refusal: 'not-a-number' });
    expect(parseLength('abc')).toEqual({ refusal: 'not-a-number' });
    expect(parseLength('35m')).toEqual({ refusal: 'not-a-number' });
  });

  it('sets 33.15 m to 35.00 m by moving the END corner along the boundary’s own direction', () => {
    expect(len(RECT, 0).toFixed(2)).toBe('33.15');
    const r = withEdgeLength(RECT, 0, 35);
    if (!r.trace) throw new Error(r.refusal);
    expect(len(r.trace, 0).toFixed(2)).toBe('35.00');
    // The start corner stays, and so does the bearing.
    expect(r.trace.ring[0]).toEqual(RECT.ring[0]);
    // To the millidegree the readout prints: a corner stored in degrees round-trips the projection to ~0.05 mm.
    expect(bearing(r.trace, 0)).toBeCloseTo(bearing(RECT, 0), 3);
    // The next boundary adjusts; the corners after it do not move.
    expect(len(r.trace, 1)).not.toBeCloseTo(len(RECT, 1), 3);
    expect(r.trace.ring[2]).toEqual(RECT.ring[2]);
    expect(r.trace.ring[3]).toEqual(RECT.ring[3]);
  });

  it('works on the closing boundary too, whose end corner is the first one', () => {
    const r = withEdgeLength(RECT, 3, 25);
    if (!r.trace) throw new Error(r.refusal);
    expect(len(r.trace, 3).toFixed(2)).toBe('25.00');
    expect(r.trace.ring[3]).toEqual(RECT.ring[3]);
  });

  it('refuses a boundary with no length, which has no direction to extend', () => {
    const degenerate: MapTrace = { ring: [at(0, 0), at(0, 0), at(10, 10)], closed: true };
    expect(withEdgeLength(degenerate, 0, 5)).toEqual({ refusal: 'zero-length' });
  });

  it('is an edit like any other: the trace is no longer the sheet’s own', () => {
    const r = withEdgeLength({ ...RECT, fromSheet: true }, 0, 35);
    expect(r.trace?.fromSheet).toBeUndefined();
  });
});

describe('the whole outline, moved', () => {
  it('moves every corner by the drag, on the grid, and keeps every length', () => {
    const moved = translateTrace(RECT, at(5, 5), at(17, -3));
    for (let i = 0; i < 4; i += 1) {
      // To the millimetre: corners are stored in degrees, and the projection round trip is good to ~0.05 mm.
      expect(len(moved, i)).toBeCloseTo(len(RECT, i), 3);
      const a = toUtm40(RECT.ring[i]!);
      const b = toUtm40(moved.ring[i]!);
      expect(b.e - a.e).toBeCloseTo(12, 3);
      expect(b.n - a.n).toBeCloseTo(-8, 3);
    }
    expect(moved.closed).toBe(true);
  });

  it('nudges by metres from the keyboard', () => {
    const moved = translateBy(RECT, 0, 0.5);
    expect(toUtm40(moved.ring[2]!).n - toUtm40(RECT.ring[2]!).n).toBeCloseTo(0.5, 3);
  });

  it('refuses a move that would carry the plot out of zone 40N, and leaves it where it was', () => {
    expect(translateBy(RECT, 2_000_000, 0)).toBe(RECT);
  });
});

/* The corner table, classified, with the corners the trace would put in it. */
const CLASSES = ['ROAD', 'ADJACENT_PLOT', 'OPEN_SPACE', 'OTHER'] as const;
const classified = (n: number): DraftPlot => ({
  plotNumber: '1',
  community: 'X',
  vertices: Array.from({ length: n }, () => ({ x: '0', y: '0' })),
  edges: Array.from({ length: n }, (_, i) => ({ classification: CLASSES[i % 4]!, roadHierarchy: i % 4 === 0 ? ('LOCAL' as const) : ('' as const) })),
});
const classesOf = (d: DraftPlot): readonly string[] => d.edges.map((e) => e.classification);

describe('one corner deleted', () => {
  it('refuses to leave fewer than 3 corners', () => {
    const tri: MapTrace = { ring: RECT.ring.slice(0, 3), closed: true };
    expect(deleteCorner(tri, 1)).toEqual({ refusal: 'too-few' });
  });

  it('merges the two boundaries at the corner, and the merged one keeps the first one’s class', () => {
    const r = deleteCorner(RECT, 2);
    if (!r.trace) throw new Error(r.refusal);
    expect(r.trace.ring).toHaveLength(3);
    expect(r.trace.ring).not.toContainEqual(RECT.ring[2]);
    // Boundary P1→P2 entered the deleted corner; the merged P1→P3 descends from it.
    expect(classesOf(ringToDraft(r.trace.ring, classified(4), r.trace.lineage))).toEqual(['ROAD', 'ADJACENT_PLOT', 'OTHER']);
  });

  it('merges across the closing corner the same way', () => {
    const r = deleteCorner(RECT, 0);
    if (!r.trace) throw new Error(r.refusal);
    // P3→P0 entered P0; it becomes P3→P1, the last boundary of the new ring.
    expect(classesOf(ringToDraft(r.trace.ring, classified(4), r.trace.lineage))).toEqual(['ADJACENT_PLOT', 'OPEN_SPACE', 'OTHER']);
  });

  it('without the record, a changed count would have asked every boundary again', () => {
    const r = deleteCorner(RECT, 2);
    expect(classesOf(ringToDraft(r.trace!.ring, classified(4)))).toEqual(['', '', '']);
  });
});

describe('one corner added', () => {
  it('splits a boundary at its middle, and both halves keep its class', () => {
    const next = insertCorner(RECT, 1);
    expect(next.ring).toHaveLength(5);
    expect(len(next, 1)).toBeCloseTo(10, 3);
    expect(len(next, 2)).toBeCloseTo(10, 3);
    expect(classesOf(ringToDraft(next.ring, classified(4), next.lineage))).toEqual(['ROAD', 'ADJACENT_PLOT', 'ADJACENT_PLOT', 'OPEN_SPACE', 'OTHER']);
    expect(ringToDraft(next.ring, classified(4), next.lineage).edges[0]!.roadHierarchy).toBe('LOCAL');
  });

  it('splits the closing boundary, and edits compound', () => {
    const split = insertCorner(RECT, 3);
    const moved = withCornerAt(split, 4, at(-3, 10));
    const pruned = deleteCorner(moved, 1).trace!;
    expect(moved.lineage).toEqual(split.lineage);
    expect(classesOf(ringToDraft(pruned.ring, classified(4), pruned.lineage))).toEqual(['ROAD', 'OPEN_SPACE', 'OTHER', 'OTHER']);
  });

  it('a table with a different number of sides is not the ring the record describes', () => {
    const next = insertCorner(RECT, 1);
    expect(classesOf(ringToDraft(next.ring, classified(6), next.lineage))).toEqual(['', '', '', '', '']);
  });
});

describe('the segment being drawn', () => {
  it('measures from the last corner to the pointer, in metres on the grid', () => {
    const open: MapTrace = { ring: [at(0, 0), at(30, 0)], closed: false };
    expect(liveLength(open, at(30, 40))?.toFixed(2)).toBe('40.00');
  });

  it('says nothing once the outline is closed, before a corner is placed, or with no pointer', () => {
    expect(liveLength(RECT, at(1, 1))).toBeNull();
    expect(liveLength({ ring: [], closed: false }, at(1, 1))).toBeNull();
    expect(liveLength({ ring: [at(0, 0)], closed: false }, null)).toBeNull();
  });
});

/* ── 1. the sheet under the map ──────────────────────────────────────── */

/** maplibre's map, as far as the underlay touches it: every call recorded. */
function recorder(): { readonly map: UnderlayMap; readonly calls: unknown[][] } {
  const calls: unknown[][] = [];
  const sources = new Map<string, Record<string, unknown>>();
  const layers = new Set<string>();
  const map = {
    getSource: (id: string) => sources.get(id),
    addSource: (id: string, spec: unknown) => {
      calls.push(['addSource', id, spec]);
      sources.set(id, {
        updateImage: (o: unknown) => calls.push(['updateImage', o]),
        setCoordinates: (q: unknown) => calls.push(['setCoordinates', q]),
      });
    },
    getLayer: (id: string) => (layers.has(id) ? {} : undefined),
    addLayer: (spec: { id: string }, before?: string) => {
      layers.add(spec.id);
      calls.push(['addLayer', spec, before]);
    },
    removeLayer: (id: string) => layers.delete(id),
    removeSource: (id: string) => sources.delete(id),
    setPaintProperty: (...a: unknown[]) => calls.push(['setPaintProperty', ...a]),
  };
  return { map: map as unknown as UnderlayMap, calls };
}

const QUAD: Quad = [
  [55.3, 25.101],
  [55.301, 25.101],
  [55.301, 25.1],
  [55.3, 25.1],
];

describe('the sheet under the map', () => {
  it('is handed to maplibre as a picture already in the page, never as a url to fetch', () => {
    const { map, calls } = recorder();
    const canvas = { width: 2400, height: 1700 } as unknown as HTMLCanvasElement;
    showUnderlay(map, canvas, QUAD, 0.6, 'pm-shape');
    const added = calls.find((c) => c[0] === 'addSource')!;
    // A url — even a data: url — is fetched, and connect-src on the live site refuses the fetch.
    expect(added[2]).not.toHaveProperty('url');
    expect(added[2]).toEqual({ type: 'image', coordinates: QUAD });
    expect(calls).toContainEqual(['updateImage', { image: canvas, coordinates: QUAD }]);
    // Over the imagery, under the trace, at the slider's opacity.
    expect(calls.find((c) => c[0] === 'addLayer')).toEqual([
      'addLayer',
      { id: UNDERLAY_SOURCE, type: 'raster', source: UNDERLAY_SOURCE, paint: { 'raster-opacity': 0.6, 'raster-fade-duration': 0 } },
      'pm-shape',
    ]);
  });

  it('moves without re-sending the picture, and re-sends a new one', () => {
    const { map, calls } = recorder();
    const canvas = {} as HTMLCanvasElement;
    showUnderlay(map, canvas, QUAD, 0.6, 'pm-shape');
    calls.length = 0;
    showUnderlay(map, canvas, QUAD, 0.3, 'pm-shape');
    expect(calls.map((c) => c[0])).toEqual(['setCoordinates', 'setPaintProperty']);
    expect(calls[1]).toEqual(['setPaintProperty', UNDERLAY_SOURCE, 'raster-opacity', 0.3]);
    const other = {} as HTMLCanvasElement;
    calls.length = 0;
    showUnderlay(map, other, QUAD, 0.3, 'pm-shape');
    expect(calls[0]).toEqual(['updateImage', { image: other, coordinates: QUAD }]);
    hideUnderlay(map);
    expect(map.getSource(UNDERLAY_SOURCE)).toBeUndefined();
  });

  describe('is the plan, not a logo', () => {
    const REPO = new URL('../../../', import.meta.url);
    const SHEETS = {
      dda: 'docs/00-source/samples/affection-plan/DDA-5134565-saih-shuaib-1.pdf',
      warsan: 'docs/00-source/samples/affection-plan/IC1-CTYL-16_011-warsan1-621.pdf',
      dm: 'docs/00-source/samples/affection-plan/DM-1341556-al-mamzar.pdf',
    } as const;
    const read: Partial<Record<keyof typeof SHEETS, Awaited<ReturnType<typeof parseAffectionPlan>>>> = {};
    beforeAll(async () => {
      for (const key of Object.keys(SHEETS) as (keyof typeof SHEETS)[]) {
        const bytes = new Uint8Array(await readFile(fileURLToPath(new URL(SHEETS[key], REPO))));
        read[key] = await parseAffectionPlan(bytes, { documentUri: SHEETS[key], tracer: new Tracer(new ProvenanceGraph()) });
      }
    }, 90_000);

    it('on the DDA sheet the largest picture is the 862×172 banner, so the whole page goes under the map', () => {
      const plan = read.dda?.sitePlan;
      // The defect, as the intake hands it over: a picture, wide and short, no plot read from it.
      expect(plan?.image?.widthPx).toBe(862);
      expect(plan?.image?.heightPx).toBe(172);
      expect(plan?.outline).toBeUndefined();
      expect(underlayRegion(plan)).toBeNull();
    });

    it('on an image-plan sheet the plot was read from the picture, so the underlay is cropped to it', () => {
      const plan = read.warsan?.sitePlan;
      expect(plan?.outline).toBeDefined();
      expect(underlayRegion(plan)).toEqual(plan?.image?.boxPt);
    });

    it('on a vector sheet there is no picture at all, and the page still goes under the map', () => {
      expect(read.dm?.sitePlan?.image).toBeUndefined();
      expect(underlayRegion(read.dm?.sitePlan)).toBeNull();
    });
  });
});
