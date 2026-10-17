/**
 * The parking layout's new sentences (17 Oct 2026), said in the reader's language.
 *
 * The default ranked by the dead-end clause, the one-way loop, the sloped ring's
 * level landing and the columns sentence under every drawing all brought
 * sentences a reader sees. `@envelope/report` may not import the engine, so they
 * are held to its dictionary from here, where both are visible — and each is the
 * engine's own text from a real run, not a copy, wherever a run can produce it.
 */

import { Decimal, ProvenanceGraph, Tracer } from '@envelope/core';
import { layoutParkingLevel, runPipeline, type RunInput } from '@envelope/capacity';
import { initGeometry } from '@envelope/geometry';
import { engineNote } from '@envelope/report/words';
import { COLUMN_GAP_STATEMENT, PODIUM_SETBACK_STATEMENT } from '@envelope/rules';
import { beforeAll, describe, expect, it } from 'vitest';

import { pt, RECT_80x40, runInput } from '../../../test-support/pipeline.js';

beforeAll(async () => {
  await initGeometry();
});

const ARABIC = /[؀-ۿ]/;
/** Three English words in a row: a sentence left half untranslated. */
const ENGLISH_RUN = /[A-Za-z]{4,} [A-Za-z]{4,} [A-Za-z]{4,}/;
const figures = (t: string): string[] => t.match(/\d+(?:\.\d+)?/g) ?? [];

/** Said in Arabic, with no run of English, and with no figure the engine did not write. */
function inArabic(text: string): string {
  const ar = engineNote(text, 'ar');
  expect(ar, text).not.toBeNull();
  expect(ar!, text).toMatch(ARABIC);
  expect(ar!, text).not.toMatch(ENGLISH_RUN);
  for (const f of figures(ar!)) expect(figures(text), `${f} in: ${ar}`).toContain(f);
  expect(engineNote(text, 'en'), text).not.toBeNull();
  return ar!;
}

const lay = (widthM: string, depthM: string, extra: Partial<Parameters<typeof layoutParkingLevel>[0]> = {}) => {
  const tracer = new Tracer(new ProvenanceGraph());
  return layoutParkingLevel({
    tracer,
    footprint: { widthM: new Decimal(widthM), depthM: new Decimal(depthM) },
    deductions: { areaM2: new Decimal(0), source: 'ASSUMED', basis: 'test fixture takes no deduction' },
    ...extra,
  });
};

const ref = (s: typeof PODIUM_SETBACK_STATEMENT) => ({
  statementId: s.statementId,
  statedBy: s.statedBy.name,
  statedOn: s.statedOn,
  verbatim: s.verbatim,
});
/** Plot 6468096, run as the studio sends it: the one-way loop is its default. */
const P6468096 = runInput([pt(3.148, 0), pt(82.998, 0), pt(87.25, 4.89), pt(87.25, 51.38), pt(0, 51.38), pt(0, 4)] as never, {
  levelSchedule: { basements: 3, groundIsParking: false, podiumAboveGround: 5, podiumParkingLevels: 5 },
  podiumAtBoundaryStatement: ref(PODIUM_SETBACK_STATEMENT),
  columnGapStatement: { ...ref(COLUMN_GAP_STATEMENT), gapM: new Decimal(COLUMN_GAP_STATEMENT.value) },
} as never) as RunInput;

const find = (notes: readonly string[], start: string): string => {
  const t = notes.find((n) => n.startsWith(start));
  expect(t, `no note starting "${start}" in:\n${notes.join('\n')}`).toBeDefined();
  return t!;
};

describe('the default arrangement, ranked by B.7.2.3.3 ¶8', () => {
  it('says which was laid out, why, and what the others came to with their dead ends', () => {
    const t = find(lay('64', '41').notes, 'Laid out as ');
    expect(t).toMatch(/the most bays where every dead end serves 8 or fewer/);
    const ar = inArabic(t);
    expect(ar).toContain('B.7.2.3.3');
    expect(ar).toMatch(/بممر مسدود يخدم \d+ موقفا/);
  });

  it('says so where no arrangement keeps within it', () => {
    inArabic(find(lay('20', '80').notes, 'No arrangement keeps every dead-end driveway'));
  });

  it('names the one-way loop as an arrangement', () => {
    expect(engineNote('bays to the walls and on islands, one-way aisles round them', 'ar')).toBe(
      'مواقف على الجدران وفي الجزر حولها ممرات باتجاه واحد',
    );
  });
});

describe('the one-way loop', () => {
  it('says each of its sentences on plot 6468096', () => {
    const notes = runPipeline(P6468096).levelPlan!.layout.notes;
    inArabic(find(notes, 'A one-way loop: '));
    const more = notes.filter((x) =>
      /^[\d.]+ m of the island's|were placed and then dropped: no car driving|straight ramp stands at one end of the island/.test(x),
    );
    // The leftover depth, the bays the core strands and the ramp on the island: all three, on this plot.
    expect(more).toHaveLength(3);
    for (const n of more) inArabic(n);
    // And the island aisle the core cuts in two, not drawn (review, 17 Oct 2026).
    inArabic(find(notes, '2 stretch(es) of aisle across the island are cut off by the core'));
  });

  it('says the drive in from the slab edge where no ramp reaches the level', () => {
    const notes = lay('60', '60', { arrangement: { id: 'ONE_WAY_LOOP' } }).notes;
    inArabic(find(notes, '3 bay(s) stand where the drive from the slab edge crosses the wall run to reach the loop'));
  });
});

describe('the sloped ring’s level landing', () => {
  it('says how long the level stretch is and what the rest of the lap climbs', () => {
    const out = runPipeline(runInput(RECT_80x40, { podiumLevels: 2 }));
    inArabic(find(out.levelPlan!.layout.notes, 'The ring is kept level for '));
  });

  it('says where none fits', () => {
    inArabic(find(lay('45', '30', { includeRamp: true, arrangement: { id: 'SLOPED' } }).notes, 'No level landing fits'));
  });

  it('says the two sentences no fixture reaches, as the engine words them', () => {
    // Copied from `levelLanding` in layout.ts and `designateAccessible` in accessible.ts.
    inArabic(
      'No level landing is laid on the sloped ring, whose lap climbs 2.81%: no run of bays stands along a long ' +
        'side of the ring between its turns.',
    );
    inArabic(
      "1 of the 3 accessible bays Table C.17 asks for could not be placed on the ground floor: the sloped ring's " +
        'level landing holds no further run of bays side by side, and the rest of the ring climbs 3.24%, above the ' +
        '2% DBC B.7.2.3.1 allows accessible parking.',
    );
  });
});

describe('the columns sentence under every drawing', () => {
  it('says what was applied: the gap, under the statement', () => {
    const notModelled = runPipeline(P6468096).building.notModelled;
    // `columnsNote` in building.ts: the sentence follows the run, here the column-gap statement.
    const t = find(
      notModelled,
      'No column is drawn, and so no grid bubbles: the layout places no column, and a bubble is read as a column line. 0.50 m is left clear',
    );
    expect(t).not.toMatch(/charges Table B\.11's 300 mm/);
    inArabic(t);
  });

  it('says what was applied: nothing, where neither a gap nor a grid was given', () => {
    const out = runPipeline(runInput(RECT_80x40));
    const t = find(
      out.building.notModelled,
      'No column is drawn, and so no grid bubbles: the layout places no column, and a bubble is read as a column line. Bays are packed side by side',
    );
    inArabic(t);
    inArabic(find(out.levelPlan!.layout.notes, 'Bays stand side by side at '));
  });

  it('says what was applied: the 300 mm, where a structural grid was given', () => {
    const columns = lay('40', '34', { structuralGridM: new Decimal('8') }).columns;
    expect(columns).toMatch(/^Each bay is charged 2\.80 m: Table B\.11's 300 mm/);
    inArabic(
      'Columns are not placed, and therefore no grid bubbles. ' +
        columns +
        ' Position on a parking sheet is given by bay number and by the dimensioned module.',
    );
  });
});
