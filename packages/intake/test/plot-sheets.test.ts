/**
 * Two sheets the client sent loose, read end to end — skipped, by name, where
 * they are not on the machine (see `source-sheets.ts`; they are not in git).
 *
 * 6457790 is a DDA sheet that prints a NUMBER in every setback cell; the reader
 * said "SEE NOTES against every face" of it, and the podium went onto the
 * boundary. 6468096 is the reference project's plot, on the DDA's unified site
 * plan, from which nothing at all was read. Every figure asserted here is one a
 * reader can see printed on the sheet.
 */
import { readFile } from 'node:fs/promises';

import { ProvenanceClass, ProvenanceGraph, Tracer } from '@envelope/core';
import { beforeAll, describe, expect, it } from 'vitest';

import { blockingGaps, crossChecksPassed, parseAffectionPlan, type AffectionPlanFacts } from '../src/index.js';

import { absentNote, sourceSheet } from './source-sheets.js';

const WADI = '6457790-12.pdf';
const COA = 'COA-CPT2-6468096-Z6-04.pdf';

async function parse(relative: string): Promise<AffectionPlanFacts> {
  const path = sourceSheet(relative);
  if (path === undefined) throw new Error(`${relative} is not on this machine`);
  return parseAffectionPlan(new Uint8Array(await readFile(path)), { documentUri: relative, tracer: new Tracer(new ProvenanceGraph()) });
}

/** A value with its Decimals as the strings they print as. */
const plain = (v: unknown): unknown => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

const title = (relative: string, name: string): string => (sourceSheet(relative) ? name : `${name} ${absentNote(relative)}`);

describe.skipIf(sourceSheet(WADI) === undefined)(title(WADI, 'plot 6457790 — a DDA sheet with a numeric setback table'), () => {
  let facts: AffectionPlanFacts;
  beforeAll(async () => {
    facts = await parse(WADI);
  });

  it('reads the table: side 1 at 5 / 4, sides 2 to 4 at 7 / 6 (building / podium)', () => {
    const sides = facts.sideSetbacks?.value.sides ?? [];
    expect(
      sides.map((s) => [
        s.side,
        s.building.kind === 'DISTANCE' ? s.building.metres.toString() : s.building.kind,
        s.podium.kind === 'DISTANCE' ? s.podium.metres.toString() : s.podium.kind,
      ]),
    ).toEqual([
      [1, '5', '4'],
      [2, '7', '6'],
      [3, '7', '6'],
      [4, '7', '6'],
    ]);
    expect(facts.sideSetbacks?.provenanceClass).toBe(ProvenanceClass.DERIVED);
  });

  /*
    EACH SIDE ON THE BOUNDARY THE DRAWING LABELS. The plot is a parallelogram,
    which fits its drawing upside down as well as it fits it the right way up;
    the corner numbers printed beside the drawn corners decide. Upside down,
    every side landed on the boundary opposite its label.
  */
  it('places each side on the surveyed boundary its label is drawn against', () => {
    expect(facts.sideSetbacks?.value.sides.map((s) => [s.side, s.boundary])).toEqual([
      [1, 2],
      [2, 1],
      [3, 0],
      [4, 3],
    ]);
    expect(facts.sideSetbacks?.value.placement).toBe(
      'Each side of the table is the surveyed boundary the drawing labels with its number: side 1 runs from corner 3 to corner 4; side 2 runs from corner 2 to corner 3; side 3 runs from corner 1 to corner 2; side 4 runs from corner 4 to corner 1.',
    );
    expect(facts.survey?.onPage?.residualM).toBeLessThan(0.01);
  });

  /*
    Never "SEE NOTES" — and never silence either. The table is read and bound by
    nothing yet, so the gap says the eight figures are on the sheet and not in
    the study; with no gap, the sheet step printed "Not printed" beside them.
  */
  it('says the per-side table is read and not yet applied, and never that the sheet prints "SEE NOTES"', () => {
    expect(facts.missing.find((m) => m.field === 'setbacks')?.consequence).toBe(
      'This sheet prints its setbacks per numbered side, not per face: «SETBACK (M) BUILDING / PODIUM — SIDE ( 1 ): 5 / 4; SIDE ( 2 ): 7 / 6; SIDE ( 3 ): 7 / 6; SIDE ( 4 ): 7 / 6». The table is read, but no setback from it is applied to the study yet. Until it is, the study’s setbacks do not come from this sheet: they come from the general rules, and a tower setback typed on the plot step under a named user overrides them.',
    );
    expect(facts.missing.map((m) => m.consequence).join(' ')).not.toContain('SEE NOTES');
  });

  it('reads the land use whole, as a split that adds up to the maximum GFA', () => {
    expect(facts.landUse?.value).toBe('COMMERCIAL : RETAIL (1,680.00 M²) + RESIDENTIAL : APARTMENT (12,255.45 M²)');
    expect(facts.landUseSplit?.value).toEqual([
      { use: 'COMMERCIAL : RETAIL', areaM2: '1680.00' },
      { use: 'RESIDENTIAL : APARTMENT', areaM2: '12255.45' },
    ]);
    expect(facts.gfaSqm?.value.toString()).toBe('13935.45');
    const split = facts.crossChecks.find((c) => c.name === 'gfa split = maximum GFA');
    expect(split?.passed, split?.detail).toBe(true);
  });

  it('types its parking note, retail by net area included', () => {
    expect(plain(facts.parking?.value.dwelling)).toEqual({ baysAtOrBelow: 1, baysAbove: 2, thresholdM2: '150', measure: 'GFA' });
    expect(plain(facts.parking?.value.byArea)).toEqual([{ use: 'RETAIL', bays: 1, perM2: '70', measure: 'NET_AREA' }]);
    expect(facts.parking?.value.unread).toEqual([]);
  });

  it('reads the rest of what it prints, and blocks on nothing', () => {
    expect(facts.parcelId?.value).toBe('6457790');
    expect(facts.totalAreaSqm?.value.toString()).toBe('2624.73');
    expect(facts.height?.value).toMatchObject({ podiumLevels: 3, typicalFloors: 9, raw: 'G+3P+9' });
    expect(facts.issueDate?.value).toBe('12/12/2023');
    expect(blockingGaps(facts)).toEqual([]);
    expect(crossChecksPassed(facts)).toBe(true);
  });
});

describe.skipIf(sourceSheet(COA) === undefined)(title(COA, 'plot 6468096 — the DDA unified site plan'), () => {
  let facts: AffectionPlanFacts;
  beforeAll(async () => {
    facts = await parse(COA);
  });

  it('reads the plot, its area and both dates', () => {
    expect(facts.parcelId?.value).toBe('6468096');
    expect(facts.community?.value).toBe('WADI AL SAFA 4');
    expect(facts.landUse?.value).toBe('FUTURE DEVELOPMENT');
    expect(facts.totalAreaSqm?.value.toString()).toBe('4466.35');
    expect(facts.issueDate?.value).toBe('23/11/2022');
    expect(facts.expiryDate?.value).toBe('22/11/2027');
  });

  it('reads the drawing: six boundary dimensions, and a road beside each side', () => {
    expect(facts.boundaryDimensionsM?.value).toEqual(['5.09', '6.48', '46.49', '47.38', '79.85', '87.25']);
    expect(facts.sideRoads?.value).toEqual([
      { side: 1, verbatim: 'ROAD 23.50M', widthM: '23.50' },
      { side: 2, verbatim: 'ROAD 12.00M', widthM: '12.00' },
      { side: 3, verbatim: 'ROAD 18.30M', widthM: '18.30' },
      { side: 4, verbatim: 'ROAD 12.00M', widthM: '12.00' },
    ]);
  });

  /*
    `SEE NOTES` AGAINST EVERY LIMIT, AND ITS ONE NOTE IS THE ANSWER: the limits
    live in an approved master plan the reader has to obtain. Nothing is filled,
    and the run is blocked on the FAR and the height until someone supplies them.
  */
  it('reports every SEE NOTES as a deferral quoting the note, and fills nothing', () => {
    expect(facts.far).toBeUndefined();
    expect(facts.gfaSqm).toBeUndefined();
    expect(facts.height).toBeUndefined();
    expect(facts.setbacks).toBeUndefined();
    expect(facts.coverage).toBeUndefined();
    for (const field of ['gfa_permitted_sqm', 'height_allowance', 'setbacks', 'plot_coverage']) {
      const gap = facts.missing.find((m) => m.field === field);
      expect(gap?.consequence, field).toMatch(/^This sheet prints "SEE NOTES" against its /);
      expect(gap?.consequence, field).toContain('«APPROVED MASTER PLAN IS REQUIRED PRIOR TO ANY SUBMITTALS.»');
    }
    expect(blockingGaps(facts).map((m) => m.field)).toEqual(expect.arrayContaining(['far', 'gfa_permitted_sqm', 'height_allowance']));
  });

  it('reads its setback table as four sides of deferrals, placed on no boundary', () => {
    const t = facts.sideSetbacks?.value;
    expect(t?.sides).toHaveLength(4);
    for (const s of t?.sides ?? []) {
      expect(s.building.kind).toBe('SEE_NOTES');
      expect(s.podium.kind).toBe('SEE_NOTES');
      expect(s.boundary).toBeUndefined();
    }
    expect(t?.placement).toMatch(/^This sheet prints no coordinate table/);
  });

  it('cites every value it read to a box on the sheet', () => {
    for (const t of [facts.parcelId, facts.totalAreaSqm, facts.landUse, facts.issueDate, facts.sideRoads]) {
      expect(t?.provenanceClass).toBe(ProvenanceClass.DERIVED);
    }
  });
});
