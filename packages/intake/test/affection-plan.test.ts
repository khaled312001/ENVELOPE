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
import { fileURLToPath } from 'node:url';

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

const REPO = new URL('../../../', import.meta.url);

const SHEETS = {
  warsan: 'docs/00-source/samples/affection-plan/IC1-CTYL-16_011-warsan1-621.pdf',
  med12: 'docs/00-source/developer-standards/azizi/Plot DJAZ1MED12RES011-178.pdf',
  tre10: 'docs/00-source/developer-standards/azizi/Plot DJAZ1TRE10RES022-196.pdf',
  /** The second dialect — see `dda.ts`. Issued by the DDA, 18/11/2025. */
  dda: 'docs/00-source/samples/affection-plan/DDA-5134565-saih-shuaib-1.pdf',
} as const;

async function parse(key: keyof typeof SHEETS): Promise<AffectionPlanFacts> {
  const path = fileURLToPath(new URL(SHEETS[key], REPO));
  const bytes = new Uint8Array(await readFile(path));
  const tracer = new Tracer(new ProvenanceGraph());
  return parseAffectionPlan(bytes, { documentUri: SHEETS[key], tracer });
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

  it('returns undefined rather than guessing on an unrecognised code', () => {
    expect(parseHeight('B+G+M+15')).toBeUndefined();
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
  beforeAll(async () => {
    facts = await parse('warsan');
  }, HOOK_TIMEOUT_MS);

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

describe('DJAZ1TRE10RES022 — Jabal Ali, Limitless', () => {
  let facts: AffectionPlanFacts;
  beforeAll(async () => {
    facts = await parse('tre10');
  }, HOOK_TIMEOUT_MS);

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

describe('DJAZ1MED12RES011 — the sheet that omits its own limits', () => {
  let facts: AffectionPlanFacts;
  beforeAll(async () => {
    facts = await parse('med12');
  }, HOOK_TIMEOUT_MS);

  it('reads what is printed', () => {
    expect(facts.totalAreaSqm?.value.toString()).toBe('2365.87');
    expect(facts.height?.value).toMatchObject({ podiumLevels: 0, typicalFloors: 11 });
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
    2,288.08 ÷ 1,040.04 = 2.2 exactly, and it is still not this plot's FAR: the
    sheet does not state one, and a field whose meaning is that an instrument
    states it may not be filled by arithmetic. The quotient is reported as a
    cross-check, which is a statement about the document.
  */
  it('publishes no FAR, and says what the two printed figures imply instead', () => {
    expect(facts.far).toBeUndefined();
    expect(blockingGaps(facts).map((m) => m.field)).toContain('far');
    const stated = facts.crossChecks.find((c) => c.name.includes('prints no FAR'));
    expect(stated).toBeDefined();
    /* `2.199992`, not `2.2`: the quotient is quantised to the engine's ratio
       precision and printed as it falls out, because rounding it to the figure a
       reader expects would be the first step towards publishing it as one. */
    expect(stated?.detail).toContain('2.199992');
    expect(stated?.detail).toContain('not published as one');
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
