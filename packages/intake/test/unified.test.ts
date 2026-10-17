/**
 * The DDA's unified site plan — the sheet the reference project's plot comes
 * on, from which nothing at all used to be read.
 *
 * Two halves. `textRuns` rebuilds text from the operator list, because the
 * text layer splits that sheet's labels into glyphs with guessed spaces; it is
 * driven here with synthetic operators. And `readFacts` reads a synthetic page
 * laid out as the sheet is — values left of their English labels, the dates
 * set vertically, the roads beside the sides they are drawn against. The real
 * sheet is asserted in `plot-sheets.test.ts` where it is on the machine.
 */
import { describe, expect, it } from 'vitest';

import { isUnifiedSitePlan, textRuns, unifiedSideRoads, type TextOps } from '../src/unified.js';

import { at, page, read } from './fixtures.js';

const O: TextOps = {
  save: 1,
  restore: 2,
  transform: 3,
  beginText: 4,
  endText: 5,
  setFont: 6,
  setTextMatrix: 7,
  moveText: 8,
  setLeadingMoveText: 9,
  nextLine: 10,
  setLeading: 11,
  setCharSpacing: 12,
  setWordSpacing: 13,
  setHScale: 14,
  showText: 15,
  showSpacedText: 16,
  nextLineShowText: 17,
  nextLineSetSpacingShowText: 18,
};

/** An operator list under construction. */
function ops(): { fnArray: number[]; argsArray: unknown[]; op(fn: number, args?: unknown[]): void } {
  const fnArray: number[] = [];
  const argsArray: unknown[] = [];
  return {
    fnArray,
    argsArray,
    op(fn, args = []) {
      fnArray.push(fn);
      argsArray.push(args);
    },
  };
}

/** A glyph 500/1000 em wide: 5 pt at 10 pt type. A space is a glyph too, as the generator writes it. */
const glyph = (c: string): { unicode: string; width: number; isSpace: boolean } => ({ unicode: c, width: 500, isSpace: c === ' ' });

/** The generator's habit: one `Tj` per glyph, then a `Td` by its advance. */
function perGlyph(o: ReturnType<typeof ops>, text: string): void {
  for (const c of text) {
    o.op(O.showText, [[glyph(c)]]);
    o.op(O.moveText, [5, 0]);
  }
}

describe('textRuns', () => {
  it('rebuilds a label set one glyph at a time, with the spaces the generator wrote', () => {
    const o = ops();
    o.op(O.beginText);
    o.op(O.setFont, ['F1', 10]);
    o.op(O.setTextMatrix, [[1, 0, 0, 1, 100, 700]]);
    perGlyph(o, 'SEE NOTES');
    o.op(O.endText);
    const runs = textRuns(o, O);
    expect(runs.map((r) => r.text)).toEqual(['SEE NOTES']);
    expect(runs[0]?.bbox).toEqual([100, 700, 145, 710]);
  });

  it('starts a new run across a gutter, below the baseline, and at each BT', () => {
    const o = ops();
    o.op(O.beginText);
    o.op(O.setFont, ['F1', 10]);
    o.op(O.setTextMatrix, [[1, 0, 0, 1, 100, 700]]);
    perGlyph(o, 'Parcel ID');
    o.op(O.moveText, [100, 0]);
    perGlyph(o, '6000001');
    o.op(O.moveText, [-200, -14]);
    perGlyph(o, 'Community');
    o.op(O.endText);
    o.op(O.beginText);
    o.op(O.setTextMatrix, [[1, 0, 0, 1, 400, 700]]);
    perGlyph(o, 'X');
    o.op(O.endText);
    expect(textRuns(o, O).map((r) => r.text)).toEqual(['Parcel ID', '6000001', 'Community', 'X']);
  });

  it('boxes a run set at 90° around its rotated glyphs', () => {
    const o = ops();
    o.op(O.save);
    o.op(O.transform, [0, 1, -1, 0, 300, 100]);
    o.op(O.beginText);
    o.op(O.setFont, ['F1', 10]);
    o.op(O.showText, [['2', '3'].map(glyph)]);
    o.op(O.endText);
    o.op(O.restore);
    const [run] = textRuns(o, O);
    expect(run?.text).toBe('23');
    expect(run?.bbox).toEqual([290, 100, 300, 110]);
  });
});

/** The sheet's own layout: each value a cell to the left of its English label. */
function unifiedSheet(extra: readonly ReturnType<typeof at>[] = []): ReturnType<typeof page> {
  const row = (label: string, value: string, y: number): ReturnType<typeof at>[] => [at(label, 400, y), at(value, 340 - value.length * 5, y)];
  return page([
    ...row('Parcel ID', '6000001', 800),
    ...row('Community', 'TEST COMMUNITY 1', 770),
    ...row('Land Use', 'FUTURE DEVELOPMENT', 740),
    ...row('Maximum GFA', 'SEE NOTES', 710),
    ...row('Maximum Height', 'SEE NOTES', 680),
    ...row('Maximum Plot Coverage', 'SEE NOTES', 650),
    at('SETBACK (m)', 50, 560, 60),
    at('BUILDING', 150, 560, 40),
    at('PODIUM', 230, 560, 32),
    ...[1, 2, 3, 4].flatMap((k) => [at(`Side ${k}`, 50, 560 - 12 * k, 30), at('SEE NOTES', 148, 560 - 12 * k), at('SEE NOTES', 224, 560 - 12 * k)]),
    ...row('Total Area', '1000.00 M', 420),
    at('- APPROVED MASTER PLAN IS REQUIRED PRIOR TO ANY SUBMITTALS.', 50, 300, 350),
    at('GIS.DDA.GOV.AE/DIS', 50, 20, 100),
    // The dates run up the margin; each under its own label, one column apart.
    at('Issue Date', 1100, 500, 10, 40),
    at('01/02/2024', 1100, 440, 10, 50),
    at('Expiry Date', 1120, 500, 10, 45),
    at('31/01/2029', 1120, 440, 10, 50),
    // The drawing: a road outside each side it is drawn against, and two dimensions.
    at('SIDE 1', 600, 300, 30),
    at('ROAD 20.00M', 600, 250, 60),
    at('SIDE 2', 800, 400, 30),
    at('ROAD 12.00M', 880, 400, 60),
    at('40.00m', 650, 280, 30),
    at('30.00m', 780, 350, 30),
    ...extra,
  ]);
}

describe('the unified site plan, read', () => {
  it('is told apart by its Parcel ID label and the issuer’s address', () => {
    expect(isUnifiedSitePlan(unifiedSheet())).toBe(true);
    expect(isUnifiedSitePlan(page(unifiedSheet().items.filter((i) => i.text !== 'GIS.DDA.GOV.AE/DIS')))).toBe(false);
  });

  it('reads the plot, its area and both dates', () => {
    const facts = read(unifiedSheet());
    expect(facts.parcelId?.value).toBe('6000001');
    expect(facts.community?.value).toBe('TEST COMMUNITY 1');
    expect(facts.landUse?.value).toBe('FUTURE DEVELOPMENT');
    expect(facts.totalAreaSqm?.value.toString()).toBe('1000');
    // Dated by its issue date, not by whichever date the stream emits first.
    expect(facts.issueDate?.value).toBe('01/02/2024');
    expect(facts.expiryDate?.value).toBe('31/01/2029');
  });

  it('says each SEE NOTES as a deferral quoting the note, and fills nothing', () => {
    const facts = read(unifiedSheet());
    expect(facts.gfaSqm).toBeUndefined();
    expect(facts.height).toBeUndefined();
    expect(facts.coverage).toBeUndefined();
    expect(facts.missing.find((m) => m.field === 'height_allowance')?.consequence).toBe(
      'This sheet prints "SEE NOTES" against its maximum height instead of a value. Its notes read: «APPROVED MASTER PLAN IS REQUIRED PRIOR TO ANY SUBMITTALS.». No storey count is read from the sheet, so it gives the envelope no vertical bound. It must come from the approved master plan or the DCR, or be set by a named user.',
    );
    expect(facts.missing.find((m) => m.field === 'far')?.consequence).toMatch(/^Floor area ratio is not printed/);
    for (const field of ['gfa_permitted_sqm', 'setbacks', 'plot_coverage']) {
      expect(facts.missing.find((m) => m.field === field)?.consequence, field).toMatch(/^This sheet prints "SEE NOTES" against its /);
    }
    expect(facts.sideSetbacks?.value.placement).toMatch(/^This sheet prints no coordinate table/);
  });

  it('reads a height the sheet does print', () => {
    const p = unifiedSheet();
    const facts = read(page(p.items.map((i) => (i.text === 'SEE NOTES' && i.bbox[1] === 680 ? at('G+2P+10', 305, 680) : i))));
    expect(facts.height?.value).toMatchObject({ podiumLevels: 2, typicalFloors: 10 });
  });

  it('reads the roads beside their sides and the dimensions on the drawing', () => {
    const facts = read(unifiedSheet());
    expect(facts.sideRoads?.value).toEqual([
      { side: 1, verbatim: 'ROAD 20.00M', widthM: '20.00' },
      { side: 2, verbatim: 'ROAD 12.00M', widthM: '12.00' },
    ]);
    expect(facts.boundaryDimensionsM?.value).toEqual(['40.00', '30.00']);
  });

  /* A road whose nearest side is nearer another road is not given that side. */
  it('pairs a road with a side only where each is the other’s nearest', () => {
    const { paired, unpaired } = unifiedSideRoads(page([at('SIDE 1', 0, 0, 30), at('ROAD 10.00M', 0, 20, 60), at('ROAD 30.00M', 0, 60, 60)]));
    expect(paired.map((r) => r.verbatim)).toEqual(['ROAD 10.00M']);
    expect(unpaired.map((r) => r.text)).toEqual(['ROAD 30.00M']);
  });
});
