/**
 * Affection-plan intake, driven by the three real sheets the client supplied.
 *
 * These are not fixtures. They are the actual Trakhees-issued plans for three
 * Dubai plots, and the tests assert the numbers a reader can see printed on
 * them. That matters more than coverage here: the product's entire claim is
 * that it reproduces what the instrument says, so a test against a synthesised
 * sheet would be the engine agreeing with itself.
 *
 * `DJAZ1MED12RES011` is the important one. It prints `G+11` and no FAR, no GFA,
 * no setback and no coverage — and the assertion is that intake reports those as
 * missing rather than filling them, which is the behaviour the whole "no hidden
 * defaults" rule exists to produce.
 */

import { readFile } from 'node:fs/promises';

import { ProvenanceClass, ProvenanceGraph, Tracer } from '@envelope/core';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  blockingGaps,
  crossChecksPassed,
  parseAffectionPlan,
  parseHeight,
  parseSetbackFace,
  readFacts,
  type AffectionPlanFacts,
} from '../src/index.js';
import type { PdfPageText } from '../src/pdf-text.js';

import { absentNote, sourceSheet } from './source-sheets.js';

/**
 * Long enough for three real PDFs on a loaded machine.
 *
 * Vitest defaults hooks to 10 s. Parsing these sheets takes under three
 * seconds on an idle machine and comfortably over ten when the rest of the
 * suite runs in parallel beside it — so the default turned a passing suite
 * into an intermittent failure that depended on scheduling. The parse is the
 * thing under test; the clock is not.
 */
const HOOK_TIMEOUT_MS = 60_000;

const SHEETS = {
  warsan: 'docs/00-source/samples/affection-plan/IC1-CTYL-16_011-warsan1-621.pdf',
  med12: 'docs/00-source/developer-standards/azizi/Plot DJAZ1MED12RES011-178.pdf',
  tre10: 'docs/00-source/developer-standards/azizi/Plot DJAZ1TRE10RES022-196.pdf',
  /** The second dialect — see `dda.ts`. Issued by the DDA, 18/11/2025. */
  dda: 'docs/00-source/samples/affection-plan/DDA-5134565-saih-shuaib-1.pdf',
  /** The third dialect — see `dm.ts`. Dubai Municipality, request SAPS-08082026-195370. */
  dm: 'docs/00-source/samples/affection-plan/DM-1341556-al-mamzar.pdf',
} as const;

async function parse(key: keyof typeof SHEETS, graph = new ProvenanceGraph()): Promise<AffectionPlanFacts> {
  const path = sourceSheet(SHEETS[key]);
  if (path === undefined) throw new Error(`${SHEETS[key]} is not on this machine`);
  const bytes = new Uint8Array(await readFile(path));
  const tracer = new Tracer(graph);
  return parseAffectionPlan(bytes, { documentUri: SHEETS[key], tracer });
}

/* The two Azizi sheets live in the ignored developer-standards folder: skipped, by name, where absent. */
const absent = (key: keyof typeof SHEETS): boolean => sourceSheet(SHEETS[key]) === undefined;
const named = (key: keyof typeof SHEETS, title: string): string => (absent(key) ? `${title} ${absentNote(SHEETS[key])}` : title);

/** A value with its Decimals as the strings they print as. */
const plain = (v: unknown): unknown => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

/** Every quotation a parse put in its provenance graph: the citation's and the value's own. */
function quotations(graph: ProvenanceGraph): readonly string[] {
  return graph.nodes.flatMap((n) => [
    ...(n.citation ? [n.citation.sourceTextVerbatim] : []),
    ...(typeof n.detail?.['verbatim'] === 'string' ? [n.detail['verbatim']] : []),
  ]);
}

describe('parseHeight', () => {
  it('decomposes a podium height code', () => {
    expect(parseHeight('G+2P+8')).toMatchObject({
      podiumLevels: 2,
      typicalFloors: 8,
      totalLevels: 11,
    });
  });

  it('reads a code with no podium without inventing one', () => {
    expect(parseHeight('G+11')).toMatchObject({
      podiumLevels: 0,
      typicalFloors: 11,
      totalLevels: 12,
    });
  });

  it('reads G+4 as four typical floors and is therefore not the 13-level defect', () => {
    /*
      THE TEST THAT TELLS THE TWO CANDIDATES APART.

      `docs/03-analysis/meeting-03-2026-10-04.md` §2.1: the client read `G+4`
      off a plan and the screen reported 13 levels, and the note names two
      possible causes that had to be separated before either was touched —
      either this parser misreads the plain `G+N` form, or the FAR-driven floor
      count is not capped by the stated height. This assertion rules out the
      first, permanently, so nobody re-opens it.

      The second is the real one. The sheet's `G+N` binds nothing by design:
      `packages/rules/src/instruments/sheet.ts` pushes it to `notBound` because
      `height.max` is a ceiling in metres and converting a level count into one
      needs a floor-to-floor, which is itself a resolved parameter. So the
      solver's ceiling is the generic seed rule `R-HEIGHT-MAX-RES` at 45.00 m
      over `floor_to_floor` 3.20 m — 14 — and the answer is
      `min(14, ceil(permitted GFA ÷ plate))`. The printed 4 is not in it.
    */
    expect(parseHeight('G+4')).toMatchObject({
      podiumLevels: 0,
      typicalFloors: 4,
      totalLevels: 5,
    });
    // And with whitespace and a trailing note, as sheets print it.
    expect(parseHeight('Height: G + 4 (Residential)')).toMatchObject({ typicalFloors: 4 });
  });

  /*
    THE FORMS DUBAI SHEETS PRINT, and what each one says. `G+M+4` and
    `B+G+P+10` used to come back undefined — a blocking gap on a sheet that
    prints its height — and `G+4+R` and `2B+G+4P+20` came back half-read, the
    roof and the basements dropped. Mezzanines and the roof are carried and not
    counted in `totalLevels`: whether they count against the cap is the
    client's question, and counting them here would answer it.
  */
  it.each([
    ['G+4', { podiumLevels: 0, typicalFloors: 4, totalLevels: 5 }],
    ['G+2P+8', { podiumLevels: 2, typicalFloors: 8, totalLevels: 11 }],
    ['G+P+10', { podiumLevels: 1, typicalFloors: 10, totalLevels: 12 }],
    ['G+M+4', { podiumLevels: 0, typicalFloors: 4, mezzanines: 1, totalLevels: 5 }],
    ['B+G+P+10', { basements: 1, podiumLevels: 1, typicalFloors: 10, totalLevels: 12 }],
    ['B+G+M+15', { basements: 1, mezzanines: 1, typicalFloors: 15, totalLevels: 16 }],
    ['2B+G+4P+20', { basements: 2, podiumLevels: 4, typicalFloors: 20, totalLevels: 25 }],
    ['G+4+R', { typicalFloors: 4, roof: true, totalLevels: 5 }],
    ['G+3P+9+R', { podiumLevels: 3, typicalFloors: 9, roof: true, totalLevels: 13 }],
    ['G + 1P + 16', { podiumLevels: 1, typicalFloors: 16, totalLevels: 18 }],
    ['G+2M+6', { mezzanines: 2, typicalFloors: 6, totalLevels: 7 }],
    ['G+4P', { podiumLevels: 4, typicalFloors: 0, totalLevels: 5 }],
  ] as const)('reads %s whole', (code, expected) => {
    const h = parseHeight(code);
    expect(h).toMatchObject(expected);
    // A token the code does not print is absent, not zero or false.
    for (const k of ['basements', 'mezzanines', 'roof'] as const) {
      if (!(k in expected)) expect(h).not.toHaveProperty(k);
    }
  });

  it.each([
    ['G+4+5', 'two plain storey counts are two readings of one building'],
    ['G+R+4', 'a roof is the last thing in a code'],
    ['G+2R', 'a roof takes no count'],
    ['G+M', 'a mezzanine over ground is not a building with storeys'],
    ['B+4', 'no ground floor'],
  ])('refuses %s rather than picking a reading (%s)', (code) => {
    expect(parseHeight(code)).toBeUndefined();
  });
});

describe('parseSetbackFace', () => {
  it('spreads "from all sides" across every face', () => {
    const face = parseSetbackFace('0m from all sides');
    expect(face.front).toEqual({ kind: 'FIXED', metres: expect.objectContaining({}) });
    expect(face.front?.kind).toBe('FIXED');
    expect(face.rear?.kind).toBe('FIXED');
  });

  it('does not read "setback" as the rear face', () => {
    const face = parseSetbackFace('Side setback 0m, Front setback 6m');
    expect(face.side?.kind).toBe('FIXED');
    expect(face.front?.kind).toBe('FIXED');
    expect(face.rear).toBeUndefined();
  });

  it('keeps a wall-type-dependent setback conditional instead of picking one', () => {
    const face = parseSetbackFace(
      '0m to street front, Side and rear setback is 0m to solid wall and 4.0m to window wall.',
    );
    expect(face.side?.kind).toBe('CONDITIONAL');
    if (face.side?.kind === 'CONDITIONAL') {
      expect(face.side.options.map((o) => o.metres.toString())).toEqual(['0', '4']);
    }
  });
});

/*
  A SHEET NOBODY HAS ON FILE, built line by line. Each line is one text item, a
  row apart, so these run in a fresh checkout — the real sheets are kept out of
  git — and each pins a defect a differently-worded plan tripped.
*/
function sheet(...lines: string[]): PdfPageText {
  return {
    page: 1,
    width: 1190,
    height: 842,
    items: lines.map((text, i) => ({
      text,
      page: 1,
      bbox: [100, 800 - i * 20, 100 + text.length * 6, 810 - i * 20] as const,
    })),
  };
}
const readSheet = (page: PdfPageText): AffectionPlanFacts =>
  readFacts(page, { documentUri: 'other-project.pdf', tracer: new Tracer(new ProvenanceGraph()) });

describe('a sheet worded differently from the samples', () => {
  it('does not refuse the whole file over a comma in a label', () => {
    // "Plot Area, Sq.M" used to match the number pattern on its comma, and
    // Decimal('') threw: a 422 for a sheet whose area was printed below it.
    const facts = readSheet(sheet('Plot Area, Sq.M', '1,365.23 SQ. M.'));
    expect(facts.totalAreaSqm?.value.toString()).toBe('1365.23');
  });

  it('reads a decimal comma as a decimal point, not as thousands', () => {
    const facts = readSheet(sheet('Total Area', '1365,23 SQ. M.'));
    expect(facts.totalAreaSqm?.value.toString()).toBe('1365.23');
  });

  it('still reads a comma grouping thousands as thousands', () => {
    const facts = readSheet(sheet('Total Area', '12,365 SQ. M.'));
    expect(facts.totalAreaSqm?.value.toString()).toBe('12365');
  });
});

describe('IC1-CTYL-16_011 — Warsan 1, Nakheel', () => {
  let facts: AffectionPlanFacts;
  const graph = new ProvenanceGraph();
  beforeAll(async () => {
    facts = await parse('warsan', graph);
  }, HOOK_TIMEOUT_MS);

  /*
    THE LABEL IS A WHOLE PHRASE. The value used to be found left of the first
    item CONTAINING the label, and "Developer's" in a general note contains
    "Developer": the developer read "Master", and the community — nearest single
    item — "621". Both went into the plot form and every title block.
  */
  it('reads the identity cells whole, beside their own labels', () => {
    expect(facts.parcelId?.value).toBe('6211383');
    expect(facts.community?.value).toBe('WARSAN 1 - 621');
    expect(facts.developer?.value).toBe('NAKHEEL');
    expect(facts.developerPlotNo?.value).toBe('IC1-CTYL-16_011');
  });

  /* The Arabic on these sheets is set in a font with no ToUnicode map and
     decodes to Latin Extended letters; quoted, it is evidence nobody can check. */
  it('quotes no undecodable glyph run and no lone token', () => {
    const quotes = quotations(graph);
    expect(quotes.length).toBeGreaterThan(10);
    for (const q of quotes) expect(q, q).not.toMatch(/[À-ɏ¨ª¯´¸º]/);
    expect(quotes).not.toContain('GF/');
  });

  it('reads the printed plot area, FAR and GFA', () => {
    expect(facts.totalAreaSqm?.value.toString()).toBe('1365.23');
    expect(facts.far?.value.toString()).toBe('3.5');
    expect(facts.gfaSqm?.value.toString()).toBe('4778.31');
  });

  it('gives the FAR the unit the engine gives every FAR', () => {
    // Without one the screen formatted it as a count and printed 3.5 as "4".
    expect(facts.far?.unit).toBe('ratio');
    expect(facts.totalAreaSqm?.unit).toBe('m²');
  });

  it("reproduces the sheet's own GFA arithmetic", () => {
    const check = facts.crossChecks.find((c) => c.name === 'gfa = far × plot_area');
    expect(check?.passed, check?.detail).toBe(true);
    expect(crossChecksPassed(facts)).toBe(true);
  });

  it('reads G+2P+8 as two podium levels over ground plus eight', () => {
    expect(facts.height?.value).toMatchObject({ podiumLevels: 2, typicalFloors: 8 });
  });

  it('separates podium and tower setbacks', () => {
    const s = facts.setbacks?.value;
    expect(s?.podium.front?.kind).toBe('FIXED');
    expect(s?.tower.side?.kind).toBe('FIXED');
    if (s?.tower.side?.kind === 'FIXED') expect(s.tower.side.metres.toString()).toBe('3');
    expect(s?.requiresDecision).toBe(false);
  });

  it('quotes the setback line without the panel beside it', () => {
    // The QR-code validation panel sits at the same height as the setback note
    // and is typeset in an embedded Arabic font with no usable ToUnicode map.
    // Grouping a page by baseline alone joined the two, and the sentence shown
    // to the user read "0m from all sides اŘرÆªاد Please scan QR code …". The
    // *parsed* values were right — which is the reason this is checked on the
    // raw text: it was correct by luck, and the same join on a sheet whose
    // neighbouring panel held a number would have been correct by nothing.
    const raw = facts.setbacks?.value.raw ?? '';
    expect(raw).toContain('GF & Podium');
    expect(raw).toContain('Tower');
    expect(raw).not.toMatch(/QR code/i);
    // Nothing outside Latin-1 punctuation, digits and the ASCII the sheet is
    // set in. A mojibake run is exactly what this excludes.
    expect(raw).toMatch(/^[\x20-\x7E|=&,.\s-]+$/);
  });

  it('reads the coverage cap as a fraction of plot area', () => {
    expect(facts.coverage?.value.podium?.toString()).toBe('1');
    expect(facts.coverage?.value.tower?.toString()).toBe('0.6');
  });

  it('records that the sheet defers parking to another instrument', () => {
    expect(facts.parkingDeferredTo?.value).toMatch(/Trakhees|Dubai Building Code|DCR/i);
  });

  it('cites the box each value was read from', () => {
    for (const t of [facts.totalAreaSqm, facts.far, facts.gfaSqm]) {
      expect(t?.provenanceClass).toBe(ProvenanceClass.DERIVED);
    }
  });

  it('has no blocking gaps', () => {
    expect(blockingGaps(facts)).toEqual([]);
  });
});

describe.skipIf(absent('tre10'))(named('tre10', 'DJAZ1TRE10RES022 — Jabal Ali, Limitless'), () => {
  let facts: AffectionPlanFacts;
  const graph = new ProvenanceGraph();
  beforeAll(async () => {
    facts = await parse('tre10', graph);
  }, HOOK_TIMEOUT_MS);

  /* The developer plot number is the key the developer's brief is filed under. */
  it('reads the identity cells whole, and the developer plot number', () => {
    expect(facts.parcelId?.value).toBe('5180196');
    expect(facts.community?.value).toBe('JABAL ALI INDUSTRIAL 2 - 518');
    expect(facts.developer?.value).toBe('LIMITLESS');
    expect(facts.developerPlotNo?.value).toBe('DJAZ1TRE10RES022');
  });

  /* Its setback was once quoted as "GF/" — the first word of its line. */
  it('quotes the setback line it read, not the first word of it', () => {
    const quotes = quotations(graph);
    expect(quotes).not.toContain('GF/');
    expect(quotes.some((q) => q.startsWith('GF/ Podium: 0m to street front'))).toBe(true);
    for (const q of quotes) expect(q, q).not.toMatch(/[À-ɏ¨ª¯´¸º]/);
  });

  it('reads the printed area, FAR and GFA', () => {
    expect(facts.totalAreaSqm?.value.toString()).toBe('1740.56');
    expect(facts.far?.value.toString()).toBe('5.05');
    expect(facts.gfaSqm?.value.toString()).toBe('8796.46');
  });

  it("reproduces the sheet's own GFA arithmetic within its printed rounding", () => {
    const check = facts.crossChecks.find((c) => c.name === 'gfa = far × plot_area');
    expect(check?.passed, check?.detail).toBe(true);
  });

  it('reads G+3P+6', () => {
    expect(facts.height?.value).toMatchObject({ podiumLevels: 3, typicalFloors: 6 });
  });

  it('flags the wall-type-dependent setback as needing a decision', () => {
    expect(facts.setbacks?.value.requiresDecision).toBe(true);
  });
});

describe.skipIf(absent('med12'))(named('med12', 'DJAZ1MED12RES011 — the sheet that omits its own limits'), () => {
  let facts: AffectionPlanFacts;
  beforeAll(async () => {
    facts = await parse('med12');
  }, HOOK_TIMEOUT_MS);

  it('reads what is printed', () => {
    expect(facts.totalAreaSqm?.value.toString()).toBe('2365.87');
    expect(facts.height?.value).toMatchObject({ podiumLevels: 0, typicalFloors: 11 });
  });

  it('reads the identity cells whole, and the developer plot number', () => {
    expect(facts.community?.value).toBe('JABAL ALI INDUSTRIAL 2 - 518');
    expect(facts.developer?.value).toBe('LIMITLESS');
    expect(facts.developerPlotNo?.value).toBe('DJAZ1MED12RES011');
  });

  it('does not invent the FAR, GFA, setbacks or coverage the sheet omits', () => {
    expect(facts.far).toBeUndefined();
    expect(facts.gfaSqm).toBeUndefined();
    expect(facts.setbacks).toBeUndefined();
    expect(facts.coverage).toBeUndefined();
  });

  it('names each omission and its consequence', () => {
    const fields = facts.missing.map((m) => m.field);
    expect(fields).toContain('far');
    expect(fields).toContain('gfa_permitted_sqm');
    expect(fields).toContain('setbacks');
    for (const m of facts.missing) expect(m.consequence.length).toBeGreaterThan(20);
  });

  it('reports the gaps that block computation', () => {
    const blocking = blockingGaps(facts).map((m) => m.field);
    expect(blocking).toContain('far');
    expect(blocking).toContain('gfa_permitted_sqm');
    expect(blocking).not.toContain('total_area_sqm');
  });

  it('runs no cross-check it lacks the operands for', () => {
    expect(facts.crossChecks).toEqual([]);
  });
});

/*
  THE SECOND DIALECT — a DDA sheet, which not one Trakhees reader could read.

  Before `dda.ts` this sheet produced six fields reading "not printed on this
  sheet" and a plot area of 150 m² against a printed 1,040.04 — the 150 came
  from "ONE BAY FOR EACH UNIT LESS THAN OR EQUAL TO 150 SQ.M GFA" in the general
  notes, because the area reader scans the page for the first `<n> SQ. M` it
  finds. These tests assert the figures a reader can see printed on the sheet,
  for the reason the header of this file gives: a synthesised fixture would be
  the parser agreeing with itself.
*/
describe('the DDA dialect — plot 5134565, Saih Shuaib 1', () => {
  let facts: AffectionPlanFacts;
  beforeAll(async () => {
    facts = await parse('dda');
  }, HOOK_TIMEOUT_MS);

  it('reads the labelled table down the left margin', () => {
    expect(facts.parcelId?.value).toBe('5134565');
    expect(facts.totalAreaSqm?.value.toString()).toBe('1040.04');
    expect(facts.gfaSqm?.value.toString()).toBe('2288.08');
    expect(facts.height?.value).toMatchObject({ typicalFloors: 4, raw: 'G+4' });
  });

  /*
    THE DEFECT THIS DIALECT WAS WRITTEN FOR, named so it cannot come back. A
    plot area is the denominator of every capacity figure downstream, and 150 is
    plausible enough to be believed all the way to a pro forma.
  */
  it('does not read the plot area out of the parking note', () => {
    expect(facts.totalAreaSqm?.value.toString()).not.toBe('150');
  });

  it('reads the right-hand panel, whose values sit below their labels', () => {
    expect(facts.community?.value).toBe('SAIH SHUAIB 1');
    expect(facts.developer?.value).toBe('MERAAS ESTATES (L.L.C)');
    expect(facts.landUse?.value).toBe('RESIDENTIAL : APARTMENT');
  });

  /* The footer punctuates with slashes where Trakhees uses hyphens, and an
     undated sheet cites an undated instrument on every value read from it. */
  it('dates the instrument', () => {
    expect(facts.issueDate?.value).toBe('18/11/2025');
  });

  /*
    ITS PARKING NOTE IS ITS PARKING RULE. B.7.2.6.1 puts an affection plan's
    requirement above Table B.13, and this sheet states one in its general
    notes — which were not read, so the sheet step said the plot's parking
    instrument was unknown. Typed, cited to the note, and the gap is gone.
  */
  it('reads the parking note as the typed requirement it states', () => {
    expect(plain(facts.parking?.value.dwelling)).toEqual({ baysAtOrBelow: 1, baysAbove: 2, thresholdM2: '150', measure: 'GFA' });
    expect(facts.parking?.value.byArea).toEqual([]);
    expect(facts.parking?.value.unread).toEqual([]);
    expect(facts.parking?.provenanceClass).toBe(ProvenanceClass.DERIVED);
    expect(facts.parkingRequirement?.value).toMatch(/^ONE BAY FOR EACH UNIT/);
    expect(facts.missing.map((m) => m.field)).not.toContain('parking_authority');
  });

  it('keeps its general notes, each whole', () => {
    expect(facts.generalNotes?.value).toHaveLength(2);
    expect(facts.generalNotes?.value[1]).toMatch(/^SETBACK: QUARTER OF THE HEIGHT .* MINIMUM OF 3M\.$/);
  });

  /* The table is read cell by cell even where no cell is a distance, and each
     side is put on the boundary the drawing labels with its number. */
  it('reads the setback table in its own states and places each side on a surveyed boundary', () => {
    const t = facts.sideSetbacks?.value;
    expect(t?.sides.map((s) => [s.side, s.building.kind, s.podium.kind, s.boundary])).toEqual([
      [1, 'SEE_NOTES', 'NOT_APPLICABLE', 4],
      [2, 'SEE_NOTES', 'NOT_APPLICABLE', 2],
      [3, 'SEE_NOTES', 'NOT_APPLICABLE', 0],
      [4, 'SEE_NOTES', 'NOT_APPLICABLE', 5],
    ]);
    expect(t?.placement).toMatch(/^Each side of the table is the surveyed boundary/);
  });

  /*
    The sheet prints no FAR, so `facts.far` stays absent — that field means "the
    sheet printed this". But it prints a max GFA and a plot area, and their
    quotient is the ratio: the study is NOT blocked (Eng. Mohamed, 16 Oct 2026 —
    "هو عندو الارقام الي يقدر منها يطلع ال FAR"). `rules` binds the quotient.
  */
  it('publishes no FAR field, does not block, and states the quotient', () => {
    expect(facts.far).toBeUndefined();
    expect(facts.missing.map((m) => m.field)).toContain('far');
    expect(blockingGaps(facts)).toEqual([]);
    const stated = facts.crossChecks.find((c) => c.name.includes('prints no FAR'));
    expect(stated).toBeDefined();
    /* `2.199992`, not `2.2`: the quotient is quantised to the engine's ratio
       precision and printed as it falls out, because rounding it to the figure a
       reader expects would be the first step towards publishing it as one. */
    expect(stated?.detail).toContain('2.199992');
    expect(stated?.detail).toContain('binds this quotient');
  });

  /* `SEE NOTES` is a deferral to a rule with the storey count as its input, and
     `N/A` against the coverage cap is this instrument setting none. Both leave
     the envelope unbound, and both are said rather than left blank. */
  it('treats "SEE NOTES" and "N/A" as answers, not as values', () => {
    expect(facts.setbacks).toBeUndefined();
    expect(facts.coverage).toBeUndefined();
    const setback = facts.missing.find((m) => m.field === 'setbacks');
    expect(setback?.consequence).toContain('SEE NOTES');
    expect(setback?.consequence).toContain('quarter of the building height');
    expect(facts.missing.find((m) => m.field === 'plot_coverage')?.consequence).toContain('N/A');
  });

  /*
    THE SURVEYED RING. Six DLTM corners close to 1040.04 m² against a printed
    1,040.04 — and the leg lengths reproduce the dimensions drawn on the same
    sheet: 27.76, 6.36, 30.51, 0.42, 33.15, 30.82. That agreement is what makes
    the ring safe to offer, and it is why `readFacts` withholds the ring
    entirely when the areas disagree.
  */
  it('reads the coordinate table and closes it to the printed plot area', () => {
    expect(facts.survey).toBeDefined();
    expect(facts.survey?.system.value).toBe('DLTM');
    expect(facts.survey?.points.value).toHaveLength(6);
    expect(facts.survey?.points.value[0]).toEqual({
      id: '1',
      east: '464118.299',
      north: '2755567.369',
    });
    expect(facts.survey?.areaM2.value.toString()).toBe('1040.04');
  });

  it('computes the boundaries the sheet draws dimensions for', () => {
    const lengths = facts.survey?.legs.value.map((l) => l.lengthM) ?? [];
    expect(lengths).toEqual(['27.762', '6.359', '30.506', '0.424', '33.147', '30.817']);
    const bearings = facts.survey?.legs.value.map((l) => Number(l.bearingDeg)) ?? [];
    for (const b of bearings) {
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(360);
    }
  });

  /* DERIVED, not ASSUMED — the whole reason this is a field of its own rather
     than a second `sitePlan.outline`. */
  it('publishes the ring as read from an instrument, not as an assumption', () => {
    expect(facts.survey?.legs.provenanceClass).toBe(ProvenanceClass.DERIVED);
    expect(facts.survey?.areaM2.provenanceClass).toBe(ProvenanceClass.DERIVED);
  });

  it('says under the ring what it does not model', () => {
    const notes = facts.survey?.notModelled ?? [];
    expect(notes.length).toBeGreaterThanOrEqual(3);
    expect(notes.join(' ')).toContain('curve');
    expect(notes.join(' ')).toContain('convergence');
  });
});

/*
  THE THIRD DIALECT — the Municipality's Unified Site Plan, plot 1341556.

  Its limits are written in Arabic, one glyph per text item in visual order,
  and its site plan is vector with a printed grid rather than a coordinate
  table. Every figure asserted here is one a reader can see on the sheet: the
  area, the four dimensions drawn beside the boundaries, the height row and the
  request number in the footer.
*/
describe('the Municipality dialect — plot 1341556, Al Mamzar', () => {
  let facts: AffectionPlanFacts;
  beforeAll(async () => {
    facts = await parse('dm');
  }, HOOK_TIMEOUT_MS);

  it('reads the identity of the plot', () => {
    expect(facts.parcelId?.value).toBe('1341556');
    expect(facts.community?.value).toBe('AL MAMZAR');
    expect(facts.landUse?.value).toBe('تجاري، مكاتب، سكني (RC2/18)');
    expect(facts.totalAreaSqm?.value.toString()).toBe('7389.43');
  });

  /* «أرضي + أول للقاعدة + (16) طابق ونسبة طابقية = 5.0» — the lam-lam
     ligature in «للقاعدة» once cost the podium level. */
  it('reads the Arabic height row as G+1P+16 and its floor ratio as the FAR', () => {
    expect(facts.height?.value).toMatchObject({ podiumLevels: 1, typicalFloors: 16, totalLevels: 18, raw: 'G+1P+16' });
    expect(facts.far?.value.toString()).toBe('5');
  });

  it('dates the instrument from its request number', () => {
    expect(facts.drawingRef?.value).toBe('SAPS-08082026-195370');
    expect(facts.issueDate?.value).toBe('08-08-2026');
  });

  it('keeps the parking row in the sheet’s own words', () => {
    expect(facts.parkingRequirement?.value).toContain('موقف لكل شقة');
    expect(facts.parkingRequirement?.provenanceClass).toBe(ProvenanceClass.DERIVED);
  });

  /* «مساحتها» — "its area" — names no measure, so the threshold's measure is
     UNSTATED rather than the DDA's GFA: which area is the client's question. */
  it('types the parking row: per flat and studio, two above 150 m², and by area for commerce and offices', () => {
    expect(plain(facts.parking?.value.dwelling)).toEqual({ baysAtOrBelow: 1, baysAbove: 2, thresholdM2: '150', measure: 'UNSTATED', studioBays: 1 });
    expect(plain(facts.parking?.value.byArea)).toEqual([
      { use: 'COMMERCIAL', bays: 1, perM2: '70', measure: 'UNSTATED' },
      { use: 'OFFICE', bays: 1, perM2: '50', measure: 'UNSTATED' },
    ]);
    expect(facts.parking?.value.unread).toEqual([]);
  });

  /* FAR is printed, so a missing GFA is a gap and not a stop: the engine
     derives GFA from the ratio. The setback is a rule with the height as its
     input, and is not reduced to a number. */
  it('lists what the sheet omits, and blocks on none of it', () => {
    expect(facts.missing.map((m) => m.field)).toEqual(['gfa_permitted_sqm', 'setbacks', 'plot_coverage']);
    expect(blockingGaps(facts)).toEqual([]);
    expect(facts.setbacks).toBeUndefined();
  });

  it('reads the plot off the drawing and closes it to the printed area', () => {
    expect(facts.drawn?.points.value).toHaveLength(4);
    expect(facts.drawn?.points.value[0]).toEqual({ id: '1', east: '501938.189', north: '2798367.201' });
    expect(facts.drawn?.areaM2.value.toString()).toBe('7389.43');
    expect(facts.drawn?.areaM2.provenanceClass).toBe(ProvenanceClass.DERIVED);
  });

  it('reproduces the four dimensions printed beside the boundaries', () => {
    expect(facts.drawn?.legs.value.map((l) => l.lengthM)).toEqual(['98.510', '174.183', '122.652', '17.220']);
    const dims = facts.crossChecks.filter((c) => c.name.startsWith('boundary '));
    expect(dims).toHaveLength(4);
    expect(crossChecksPassed(facts)).toBe(true);
  });

  /* The grid is not named on the sheet; the eastings say which it is. That is
     an inference, so it is ASSUMED, and it moves the plot on a map and no figure. */
  it('names the grid as an assumption, not a reading', () => {
    expect(facts.drawn?.system.value).toBe('DLTM');
    expect(facts.drawn?.system.provenanceClass).toBe(ProvenanceClass.ASSUMED);
  });

  it('suggests what lies beyond each boundary from the labels outside it, and nothing where none is printed', () => {
    expect(facts.drawn?.edgeHints.map((h) => h && [h.classification, h.verbatim])).toEqual([
      ['ROAD', 'ROAD 79.25'],
      ['ADJACENT_PLOT', '1341194'],
      ['ROAD', 'ROAD 30.48'],
      null,
    ]);
  });

  it('does not caption a location map as the site plan', () => {
    expect(facts.sitePlan?.image).toBeUndefined();
    expect(facts.sitePlan?.refusals.join(' ')).toContain('vector');
  });
});
