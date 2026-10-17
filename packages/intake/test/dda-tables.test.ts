/**
 * The DDA sheet's tables, read from a synthetic sheet laid out as the real ones
 * are (`fixtures.ts`): the per-side setback table in each of its states, each
 * side placed on the boundary the drawing labels, the land-use split, and the
 * general notes the parking rule and every `SEE NOTES` gap quote.
 *
 * The real sheet these were written for (plot 6457790) is asserted in
 * `plot-sheets.test.ts` where it is on the machine; these run everywhere.
 */
import { describe, expect, it } from 'vitest';

import { placeSides, readGeneralNotes, readLandUseLines, readSetbackTable, setbackCell } from '../src/dda.js';

import { DWELLING_NOTE, QUARTER_NOTE, at, ddaSheet, page, read } from './fixtures.js';

const NUMERIC = [
  ['5', '4'],
  ['7', '6'],
  ['7', '6'],
  ['7', '6'],
] as const;

describe('setbackCell', () => {
  it('keeps a distance, a deferral and N/A as three states', () => {
    expect(setbackCell('7')).toMatchObject({ kind: 'DISTANCE' });
    expect(setbackCell('7.5 M')).toMatchObject({ kind: 'DISTANCE' });
    expect(setbackCell('SEE NOTES')).toEqual({ kind: 'SEE_NOTES', verbatim: 'SEE NOTES' });
    expect(setbackCell('N/A')).toEqual({ kind: 'NOT_APPLICABLE', verbatim: 'N/A' });
    expect(setbackCell('TBC')).toBeUndefined();
    expect(setbackCell('')).toBeUndefined();
  });
});

describe('the SETBACK (M) table', () => {
  /*
    THE DEFECT. A DDA sheet that prints eight numbers was reported as printing
    "SEE NOTES" against every face, because that sentence was said of every DDA
    sheet without opening the table. The podium then went onto the boundary.
  */
  it('reads a numeric table, and says nothing is missing', () => {
    const facts = read(ddaSheet(NUMERIC));
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
    expect(facts.missing.map((m) => m.field)).not.toContain('setbacks');
    expect(facts.missing.map((m) => m.consequence).join(' ')).not.toContain('SEE NOTES');
    expect(facts.sideSetbacks?.value.raw).toBe('SETBACK (M) BUILDING / PODIUM — SIDE ( 1 ): 5 / 4; SIDE ( 2 ): 7 / 6; SIDE ( 3 ): 7 / 6; SIDE ( 4 ): 7 / 6');
  });

  it('places no side on a boundary when there is no surveyed ring, and says so', () => {
    expect(read(ddaSheet(NUMERIC)).sideSetbacks?.value.placement).toMatch(/^No surveyed ring was read from this sheet/);
    expect(read(ddaSheet(NUMERIC)).sideSetbacks?.value.sides.every((s) => s.boundary === undefined)).toBe(true);
  });

  it('still says the quarter-of-the-height rule where every building cell defers to it', () => {
    const facts = read(ddaSheet(NUMERIC.map(() => ['SEE NOTES', 'N/A'] as const), [DWELLING_NOTE, QUARTER_NOTE]));
    expect(facts.missing.find((m) => m.field === 'setbacks')?.consequence).toMatch(/^This sheet prints "SEE NOTES" against every face.*quarter of the building height/);
    expect(facts.sideSetbacks?.value.sides.map((s) => s.building.kind)).toEqual(['SEE_NOTES', 'SEE_NOTES', 'SEE_NOTES', 'SEE_NOTES']);
  });

  it('names the cells that defer when only some do, and reads the rest', () => {
    const facts = read(ddaSheet([['SEE NOTES', '4'], ['7', '6'], ['7', 'SEE NOTES'], ['7', '6']]));
    expect(facts.missing.find((m) => m.field === 'setbacks')?.consequence).toBe(
      'The setback table prints "SEE NOTES" instead of a distance for side 1 (building), side 3 (podium). Those cells defer to the sheet’s notes and no distance is read from them; every other cell is read as printed.',
    );
    expect(facts.sideSetbacks?.value.sides[1]?.building).toMatchObject({ kind: 'DISTANCE' });
  });

  it('quotes the notes a whole-table deferral points at — and says when none states one', () => {
    const facts = read(ddaSheet(NUMERIC.map(() => ['SEE NOTES', 'SEE NOTES'] as const), [DWELLING_NOTE]));
    expect(facts.missing.find((m) => m.field === 'setbacks')?.consequence).toBe(
      'This sheet prints "SEE NOTES" against its whole setback table instead of a value. None of its notes states one. No setback is read from the sheet. Setbacks must come from the approved master plan or the DCR, or be set by a named user.',
    );
  });

  it('refuses the whole table over one unreadable cell, rather than read it with a side missing', () => {
    const facts = read(ddaSheet([['5', '4'], ['TBC', '6'], ['7', '6'], ['7', '6']]));
    expect(facts.sideSetbacks).toBeUndefined();
    expect(facts.missing.find((m) => m.field === 'setbacks')?.consequence).toMatch(
      /^The setback table's row for side 2 reads "TBC" under BUILDING and "6" under PODIUM/,
    );
  });

  it('is not a table without both column headers', () => {
    const p = ddaSheet(NUMERIC);
    const reading = readSetbackTable(page(p.items.filter((i) => i.text !== 'PODIUM')));
    expect(reading).toMatchObject({ ok: false });
  });

  it('says no setback table was found on a DDA sheet that prints none', () => {
    const p = ddaSheet(NUMERIC);
    const facts = read(page(p.items.filter((i) => !/^(SETBACK \(M\)|BUILDING|PODIUM|SIDE)/.test(i.text))));
    expect(facts.missing.find((m) => m.field === 'setbacks')?.consequence).toMatch(/^No setback table was found on this sheet\./);
  });
});

describe('placeSides', () => {
  const ring = [
    { id: '1', east: '0', north: '0' },
    { id: '2', east: '40', north: '0' },
    { id: '3', east: '40', north: '40' },
    { id: '4', east: '0', north: '40' },
  ];
  const identity = (x: number, y: number): readonly [number, number] => [x, y];
  // Each label a few metres inside the boundary it is drawn against; boundary k runs from corner k+1.
  const labels = [at('SIDE 1', 15, 2, 10, 2), at('SIDE 2', 34, 19, 10, 2), at('SIDE 3', 15, 36, 10, 2), at('SIDE 4', 1, 19, 10, 2)];

  it('puts each side on the boundary its label is drawn against, one to one', () => {
    const placed = placeSides(page(labels), [1, 2, 3, 4], ring, identity);
    expect(placed instanceof Map ? [...placed.entries()] : placed).toEqual([
      [1, 0],
      [2, 1],
      [3, 2],
      [4, 3],
    ]);
  });

  it('ignores the table’s own row labels, which are not marks on a boundary', () => {
    const placed = placeSides(page([...labels, at('Side 1', 200, 200), at('SIDE ( 1 )', 300, 300)]), [1, 2, 3, 4], ring, identity);
    expect(placed).toBeInstanceOf(Map);
  });

  it('places nothing when a side is not labelled', () => {
    expect(placeSides(page(labels.slice(0, 3)), [1, 2, 3, 4], ring, identity)).toBe(
      'The drawing does not label side 4 against a surveyed boundary, so no side of the table is placed on one.',
    );
  });

  it('places nothing when two labels claim one boundary', () => {
    const crowded = [...labels.slice(0, 3), at('SIDE 4', 25, 2, 10, 2)];
    expect(placeSides(page(crowded), [1, 2, 3, 4], ring, identity)).toMatch(/^Two side labels on the drawing are nearest the same surveyed boundary/);
  });

  it('places nothing when one side is labelled twice', () => {
    expect(placeSides(page([...labels, at('SIDE 2', 15, 36, 10, 2)]), [1, 2, 3, 4], ring, identity)).toBe(
      'The drawing labels side 2 more than once, so no side is placed on a boundary.',
    );
  });
});

describe('LAND USE / GFA SPLIT', () => {
  const split = [
    at('LAND USE / GFA SPLIT', 600, 780, 100),
    // The superscript of M² is its own item, raised above the baseline.
    at('COMMERCIAL : RETAIL (1,000.00 M', 600, 768, 120, 9),
    at('2', 721, 772, 3, 5),
    at(')', 725, 768, 3, 9),
    at('RESIDENTIAL : APARTMENT (2,000.00 M²)', 600, 759, 160, 9),
    // The next table's heading, a cell's padding further down.
    at('PLOT COORDINATES', 600, 730, 80),
  ];

  /* Every line, not the first: the first is the retail share alone. */
  it('reads every line under the heading, with its area', () => {
    expect(readLandUseLines(page(split)).map((l) => [l.use, l.areaM2])).toEqual([
      ['COMMERCIAL : RETAIL', '1000.00'],
      ['RESIDENTIAL : APARTMENT', '2000.00'],
    ]);
  });

  it('publishes the land use whole and checks the split against the maximum GFA', () => {
    const facts = read(ddaSheet(NUMERIC, [DWELLING_NOTE], split));
    expect(facts.landUse?.value).toBe('COMMERCIAL : RETAIL (1,000.00 M²) + RESIDENTIAL : APARTMENT (2,000.00 M²)');
    expect(facts.landUseSplit?.value).toEqual([
      { use: 'COMMERCIAL : RETAIL', areaM2: '1000.00' },
      { use: 'RESIDENTIAL : APARTMENT', areaM2: '2000.00' },
    ]);
    expect(facts.crossChecks.find((c) => c.name === 'gfa split = maximum GFA')?.passed).toBe(true);
  });

  it('fails the check when the shares do not add up to the printed maximum', () => {
    const wrong = split.map((i) => (i.text.startsWith('RESIDENTIAL') ? { ...i, text: 'RESIDENTIAL : APARTMENT (1,900.00 M²)' } : i));
    const facts = read(ddaSheet(NUMERIC, [DWELLING_NOTE], wrong));
    expect(facts.crossChecks.find((c) => c.name === 'gfa split = maximum GFA')?.passed).toBe(false);
  });
});

describe('GENERAL NOTES', () => {
  it('joins a note that runs over two lines, and stops at the footer', () => {
    const p = page([
      at('GENERAL NOTES', 50, 400, 70),
      at('- PARKING: FOR RETAIL, ONE BAY FOR EACH 70', 130, 400, 300),
      at('SQ.M OF RETAIL NET AREA.', 130, 391, 150),
      at('- SECOND NOTE.', 130, 382, 80),
      // The disclaimer, a line and a half further down at the same margin.
      at('THIS DOCUMENT IS FOR INFORMATION ONLY', 130, 360, 200),
    ]);
    expect(readGeneralNotes(p).map((n) => n.text)).toEqual([
      'PARKING: FOR RETAIL, ONE BAY FOR EACH 70 SQ.M OF RETAIL NET AREA.',
      'SECOND NOTE.',
    ]);
  });

  /* The note was not read, so the sheet step said the plot's parking instrument was unknown. */
  it('reads the parking note as the sheet’s parking requirement', () => {
    const facts = read(ddaSheet(NUMERIC));
    expect(facts.parking?.value.dwelling?.measure).toBe('GFA');
    expect(facts.missing.map((m) => m.field)).not.toContain('parking_authority');
  });

  it('keeps a parking note it cannot type in the sheet’s words, and says no bay count is read from it', () => {
    const facts = read(ddaSheet(NUMERIC, ['- PARKING: AS PER THE APPROVED MASTER PLAN.']));
    expect(facts.parking).toBeUndefined();
    expect(facts.parkingRequirement?.value).toBe('AS PER THE APPROVED MASTER PLAN.');
    expect(facts.missing.find((m) => m.field === 'parking_requirement')?.consequence).toBe(
      'This sheet states a parking requirement this reader could not type: «AS PER THE APPROVED MASTER PLAN.». Its words are kept; no bay count may be read from them until it is confirmed by a named user.',
    );
  });
});
