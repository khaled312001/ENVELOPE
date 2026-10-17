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

import { DEAD_END_MAX_BAYS } from '../src/dead-ends.js';
import {
  DEFAULT_ARRANGEMENT_RULE,
  DefaultArrangementRule,
  layoutParkingLevel,
  ParkingArrangement,
  ParkingLayoutError,
  RectKind,
} from '../src/layout.js';

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
  it('reports every arrangement packed, with its count and its dead ends, and draws the most bays within the dead-end limit', () => {
    const r = lay();
    expect(r.arrangements.map((a) => a.id)).toEqual([
      ParkingArrangement.WIDTH,
      ParkingArrangement.DEPTH,
      ParkingArrangement.PERIMETER,
      ParkingArrangement.ONE_WAY_LOOP,
    ]);
    for (const a of r.arrangements) if (a.bayCount > 0) expect(a.deadEnds).toBeDefined();
    const within = r.arrangements.filter((a) => a.bayCount > 0 && Math.max(0, ...(a.deadEnds ?? [])) <= DEAD_END_MAX_BAYS);
    const most = Math.max(...within.map((a) => a.bayCount));
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

/*
  THE DEFAULT, RANKED BY B.7.2.3.3 ¶8 FIRST. On plot 6468096 the default used to be
  modules whose dead ends served 52 and 45 bays, against a "should" of eight, and
  nothing on the screen said so. 64 × 41 m is the same shape of case: modules
  along the depth place the most bays, and each of their aisles is a dead end
  serving 28.
*/
describe('the default arrangement and the dead-end clause', () => {
  const worst = (a: { readonly deadEnds?: readonly number[] }): number => Math.max(0, ...(a.deadEnds ?? []));

  it('is ruled by one named constant', () => {
    expect(DEFAULT_ARRANGEMENT_RULE).toBe(DefaultArrangementRule.MOST_BAYS_WITHIN_DEAD_END_LIMIT);
    expect(DEAD_END_MAX_BAYS).toBe(8);
  });

  it('never defaults to a dead end over eight bays while an arrangement keeps every one within it', () => {
    const r = lay();
    const most = r.arrangements.reduce((a, b) => (b.bayCount > a.bayCount ? b : a));
    expect(worst(most)).toBeGreaterThan(DEAD_END_MAX_BAYS);
    expect(r.arrangement).not.toBe(most.id);
    expect(worst(r.arrangements.find((a) => a.id === r.arrangement)!)).toBeLessThanOrEqual(DEAD_END_MAX_BAYS);
  });

  it('publishes the most bays beside it, with its dead end in words, and lets it be picked', () => {
    const r = lay();
    const most = r.arrangements.reduce((a, b) => (b.bayCount > a.bayCount ? b : a));
    const note = r.notes.find((n) => n.startsWith('Laid out as '));
    expect(note).toMatch(/the most bays where every dead end serves 8 or fewer \(DBC B\.7\.2\.3\.3 ¶8\)/);
    expect(note).toContain(`${most.bayCount} ${most.name} (a dead end serving ${worst(most)} bays)`);
    expect(note).toMatch(/any may be picked/);
    const picked = lay({ arrangement: { id: most.id, actor: ACTOR } });
    expect(picked.bayCount.value).toBe(most.bayCount);
  });

  it('cites the clause on the default, so the choice can be opened', () => {
    const graph = new ProvenanceGraph();
    const r = layoutParkingLevel({
      tracer: new Tracer(graph),
      footprint: { widthM: d('64'), depthM: d('41') },
      deductions: { areaM2: d(0), source: 'ASSUMED', basis: 'test fixture takes no deduction' },
    });
    expect(r.orientation.provenanceClass).toBe(ProvenanceClass.DERIVED);
    expect(JSON.stringify(graph.nodes)).toContain('B.7.2.3.3 ¶8 — Dead-end driveways');
    expect(graph.nodes.some((n) => n.parameterId === 'parking.dead_end_max_bays')).toBe(true);
    const formula = graph.nodes.map((n) => n.formula ?? '').find((f) => f.startsWith('the most bays among'));
    expect(formula).toMatch(/whose every dead end serves 8 bays or fewer, of: /);
  });

  it('takes the most bays and says so where no arrangement keeps within the clause', () => {
    // 20 × 80 m: every module is a dead end of ten bays or more, and no ring fits.
    const r = lay({ footprint: { widthM: d('20'), depthM: d('80') } });
    expect(r.arrangements.every((a) => a.bayCount === 0 || worst(a) > DEAD_END_MAX_BAYS)).toBe(true);
    const most = Math.max(...r.arrangements.map((a) => a.bayCount));
    expect(r.bayCount.value).toBe(most);
    expect(r.notes.join(' ')).toMatch(
      /No arrangement keeps every dead-end driveway to the 8 bays DBC B\.7\.2\.3\.3 ¶8 asks, so the one with the most bays is laid out, and its dead ends serve [\d, ]+ bays\. It is a "should"/,
    );
  });
});
