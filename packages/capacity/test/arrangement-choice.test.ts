/**
 * The parking options, and the reader's pick among them (16 Oct 2026: «كذا اوبشن
 * واكتر من رسمه … وله حرية الاختيار»).
 *
 * Every run packs the same fixed arrangements; these assert that each is reported
 * with its count, that a picked one is laid out as picked — under the picker's
 * name, even where another places more — and that a pick the level cannot honour
 * is refused in a sentence rather than swapped for another.
 */

import { Decimal, ProvenanceClass, ProvenanceGraph, Tracer } from '@envelope/core';
import { describe, expect, it } from 'vitest';

import { layoutParkingLevel, ParkingArrangement, ParkingLayoutError, RectKind } from '../src/layout.js';

const d = (v: string | number): Decimal => new Decimal(v);
const ACTOR = { id: 'u-1', name: 'Test Reader' };

function lay(extra: Partial<Parameters<typeof layoutParkingLevel>[0]> = {}) {
  const tracer = new Tracer(new ProvenanceGraph());
  return layoutParkingLevel({
    tracer,
    footprint: { widthM: d('64'), depthM: d('41') },
    deductions: { areaM2: d(0), source: 'ASSUMED', basis: 'test fixture takes no deduction' },
    ...extra,
  });
}

const bays = (r: ReturnType<typeof lay>): number => r.rects.filter((x) => x.kind === RectKind.BAY).length;

describe('parking options', () => {
  it('reports every arrangement packed, with its count, and draws the one with the most bays', () => {
    const r = lay();
    expect(r.arrangements.map((a) => a.id)).toEqual([ParkingArrangement.WIDTH, ParkingArrangement.DEPTH, ParkingArrangement.PERIMETER]);
    const most = Math.max(...r.arrangements.map((a) => a.bayCount));
    expect(r.bayCount.value).toBe(most);
    expect(r.arrangements.find((a) => a.id === r.arrangement)?.bayCount).toBe(most);
    expect(r.orientation.provenanceClass).toBe(ProvenanceClass.DERIVED);
  });

  it('lays out each picked option as picked, USER_SET under the picker, with the count the list promised', () => {
    const all = lay().arrangements.filter((a) => a.bayCount > 0);
    expect(all.length).toBeGreaterThan(1);
    for (const option of all) {
      const r = lay({ arrangement: { id: option.id, actor: ACTOR } });
      expect(r.arrangement).toBe(option.id);
      expect(r.bayCount.value).toBe(option.bayCount);
      expect(bays(r)).toBe(option.bayCount);
      expect(r.orientation.provenanceClass).toBe(ProvenanceClass.USER_SET);
      // The same list either way: picking changes what is drawn, not what was on offer.
      expect(r.arrangements).toEqual(lay().arrangements);
    }
  });

  it('says it was picked, not the best, where the pick places fewer bays', () => {
    const list = lay().arrangements;
    const fewer = list.find((a) => a.bayCount > 0 && a.bayCount < Math.max(...list.map((x) => x.bayCount)));
    expect(fewer).toBeDefined();
    if (!fewer) return;
    const r = lay({ arrangement: { id: fewer.id, actor: ACTOR } });
    expect(r.notes.some((n) => /^Laid out as .+, as picked: \d+ bays, against /.test(n))).toBe(true);
  });

  it('is an assumption, not somebody’s statement, when handed in under no name', () => {
    const r = lay({ arrangement: { id: ParkingArrangement.DEPTH } });
    expect(r.orientation.provenanceClass).toBe(ProvenanceClass.ASSUMED);
  });

  it('refuses an option this level does not offer, naming the ones it does', () => {
    expect(() => lay({ arrangement: { id: ParkingArrangement.FIELD_WIDTH, actor: ACTOR } })).toThrow(ParkingLayoutError);
    expect(() => lay({ arrangement: { id: ParkingArrangement.SLOPED, actor: ACTOR } })).toThrow(/This level offers WIDTH \(\d+ bays\)/);
  });
});
