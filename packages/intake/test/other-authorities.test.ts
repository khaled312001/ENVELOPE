/**
 * Affection plans from the two other authorities — Eng. Mohamed's own sheets.
 *
 * The intake was written against Trakhees sheets and read these badly: on the DDA
 * sheet for 5134565 it reported a 1,040.04 m² plot as 150 m², reading the figure
 * out of the parking note, and on all three it found no FAR, no GFA and no setback,
 * so every run from them was blocked. What is asserted is each printed value, and
 * that nothing the sheets do not print comes back as if they did.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { ProvenanceGraph, Tracer } from '@envelope/core';
import { describe, expect, it } from 'vitest';

import { blockingGaps, parseAffectionPlan, type AffectionPlanFacts } from '../src/index.js';

const read = (name: string): Promise<AffectionPlanFacts> =>
  parseAffectionPlan(
    new Uint8Array(
      readFileSync(fileURLToPath(new URL(`../../../docs/00-source/samples/affection-plan/${name}`, import.meta.url))),
    ),
    { documentUri: name, tracer: new Tracer(new ProvenanceGraph()) },
  );

describe('DDA 5134565 — Saih Shuaib 1, Meraas', () => {
  const facts = read('DDA-5134565-saih-shuaib-1.pdf');

  it('reads the plot area off its own row, not the 150 m² in the parking note', async () => {
    expect((await facts).totalAreaSqm?.value.toString()).toBe('1040.04');
  });

  it('reads MAX. GFA, and the FAR as the sheet’s two figures divided', async () => {
    const f = await facts;
    expect(f.gfaSqm?.value.toString()).toBe('2288.08');
    expect(f.far?.value.toFixed(4)).toBe('2.2000');
    expect(f.far?.provenanceClass).toBe('DERIVED');
  });

  it('reads the height, the panel’s labels and the issue date', async () => {
    const f = await facts;
    expect(f.height?.value).toMatchObject({ podiumLevels: 0, typicalFloors: 4 });
    expect(f.parcelId?.value).toBe('5134565');
    expect(f.community?.value).toBe('SAIH SHUAIB 1');
    expect(f.developer?.value).toBe('MERAAS ESTATES (L.L.C)');
    expect(f.landUse?.value).toBe('RESIDENTIAL : APARTMENT');
    expect(f.issueDate?.value).toBe('18/11/2025');
  });

  it('takes "SEE NOTES" to the note: a quarter of the height, 3 m to 7.5 m, from the neighbours', async () => {
    const s = (await facts).setbacks?.value;
    expect(s?.tower.side).toMatchObject({ kind: 'HEIGHT_SHARE', from: expect.stringContaining('neighbouring') });
    if (s?.tower.side?.kind === 'HEIGHT_SHARE') {
      expect(s.tower.side.share.toString()).toBe('0.25');
      expect(s.tower.side.minMetres?.toString()).toBe('3');
      expect(s.tower.side.maxMetres?.toString()).toBe('7.5');
    }
    // The note does not name the road, so no front face is invented.
    expect(s?.tower.front).toBeUndefined();
    expect(s?.bySide?.every((r) => r.podiumNotApplicable)).toBe(true);
  });

  it('quotes its parking rule and its corners, and says coverage is N/A rather than missing', async () => {
    const f = await facts;
    expect(f.parkingRule?.value).toMatch(/^PARKING: ONE BAY FOR EACH UNIT/);
    expect(f.coordinates?.value.system).toBe('DLTM');
    expect(f.coordinates?.value.points).toHaveLength(6);
    expect(f.coordinates?.value.points[0]?.east.toString()).toBe('464118.299');
    expect(f.missing.find((m) => m.field === 'plot_coverage')?.consequence).toMatch(/N\/A/);
    expect(blockingGaps(f)).toEqual([]);
  });
});

describe('DDA 6457790 — Wadi Al Safa 3, Liwan', () => {
  const facts = read('DDA-6457790-wadi-al-safa-3.pdf');

  it('reads area, GFA, height and the GFA split', async () => {
    const f = await facts;
    expect(f.totalAreaSqm?.value.toString()).toBe('2624.73');
    expect(f.gfaSqm?.value.toString()).toBe('13935.45');
    // The FAR multiplies back to the printed GFA, to the centimetre.
    expect(f.far!.value.times(f.totalAreaSqm!.value).minus(f.gfaSqm!.value).abs().lt('0.01')).toBe(true);
    expect(f.height?.value).toMatchObject({ podiumLevels: 3, typicalFloors: 9 });
    expect(f.landUse?.value).toBe('COMMERCIAL : RETAIL (1,680.00 m²); RESIDENTIAL : APARTMENT (12,255.45 m²)');
  });

  it('keeps every side of its setback table, and binds no face it would have to guess', async () => {
    const s = (await facts).setbacks?.value;
    expect(s?.bySide?.map((r) => [r.side, String(r.building?.kind === 'FIXED' && r.building.metres), String(r.podium?.kind === 'FIXED' && r.podium.metres)])).toEqual([
      ['1', '5', '4'],
      ['2', '7', '6'],
      ['3', '7', '6'],
      ['4', '7', '6'],
    ]);
    expect(s?.podium).toEqual({});
    expect(s?.tower).toEqual({});
  });

  it('reads four corners, and is not blocked', async () => {
    const f = await facts;
    expect(f.coordinates?.value.points).toHaveLength(4);
    expect(blockingGaps(f)).toEqual([]);
  });
});

describe('Dubai Municipality 1341556 — Al Mamzar, in Arabic', () => {
  const facts = read('DM-1341556-al-mamzar.pdf');

  it('reads the parcel, community and area', async () => {
    const f = await facts;
    expect(f.parcelId?.value).toBe('1341556');
    expect(f.community?.value).toBe('AL MAMZAR');
    expect(f.totalAreaSqm?.value.toString()).toBe('7389.43');
  });

  it('reads «وبنسبة طابقية = 5.0» as the FAR, and quotes it as a reader reads it', async () => {
    const f = await facts;
    expect(f.far?.value.toString()).toBe('5');
    expect(f.far?.provenanceClass).toBe('DERIVED');
  });

  it('reads «أرضي + أول لقاعدة البرج + (16) طابق» as G+1P+16', async () => {
    expect((await facts).height?.value).toMatchObject({ podiumLevels: 1, typicalFloors: 16, raw: 'G+1P+16' });
  });

  it('reads the setback as a quarter of the height, 3 m to 7.5 m, and the land use', async () => {
    const f = await facts;
    const side = f.setbacks?.value.podium.side;
    expect(side).toMatchObject({ kind: 'HEIGHT_SHARE' });
    if (side?.kind === 'HEIGHT_SHARE') {
      expect(side.share.toString()).toBe('0.25');
      expect(side.minMetres?.toString()).toBe('3');
      expect(side.maxMetres?.toString()).toBe('7.5');
    }
    expect(f.landUse?.value).toBe('RC2/18: commercial, offices, residential');
  });

  it('prints no GFA, and is not blocked by it, because the FAR is printed', async () => {
    const f = await facts;
    expect(f.gfaSqm).toBeUndefined();
    expect(f.missing.find((m) => m.field === 'gfa_permitted_sqm')?.consequence).toMatch(/computes the GFA/);
    expect(blockingGaps(f)).toEqual([]);
  });
});
