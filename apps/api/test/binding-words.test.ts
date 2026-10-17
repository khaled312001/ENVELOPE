import { ANSWERED_BY_FACE_REASON, TYPED_OVER_RULE_REASON } from '@envelope/capacity';
import { ACCESS_SIDE_GAP, ROAD_HIERARCHY_GAP, UNPLACED_ROADS_NOTE } from '@envelope/intake';
import { BINDING_FIELD, engineNote } from '@envelope/report/words';
import {
  FAR_CROSS_CHECK_REASON,
  FAR_GFA_DISAGREE_REASON,
  PARKING_AREA_USE_REASON,
  PARKING_MEASURE_REASON,
  PARKING_UNREAD_REASON,
  SIDE_NOT_PLACED_REASON,
  SIDE_SEE_NOTES_REASON,
  UNNAMED_LEGS_REASON,
} from '@envelope/rules';
import { describe, expect, it } from 'vitest';

import {
  PARKING_DEFERRED_REASON,
  PLACEHOLDER_SET_ASIDE_REASON,
  RING_NOT_SURVEY_REASON,
  SETBACK_RULE_REASON,
} from '../src/instrument.js';
import { sheetGapsSentence } from '../src/server.js';

/*
  WHAT THE SHEET BINDS SINCE 17 OCT 2026, HELD TO ITS ARABIC.

  `@envelope/report` may not import the rules, the engine, intake or this app,
  so every sentence the binding wrote that day is held to the dictionary here,
  where both sides are visible. A new reason without an entry fails this file,
  and the Arabic page would otherwise show it in English.
*/

const ARABIC = /[؀-ۿ]/;
/** English words that would mean a sentence came through untranslated. */
const LATIN_WORD = /\b(?:the|boundary|setback|sheet|typed|podium|tower|parking|rule)\b/i;

function inArabic(text: string): string {
  const ar = engineNote(text, 'ar');
  expect(ar, text).not.toBeNull();
  expect(ar!).toMatch(ARABIC);
  expect(ar!, text).not.toMatch(LATIN_WORD);
  return ar!;
}

describe('the binding’s sentences, said in Arabic', () => {
  it('gives every reason the binder, the API and intake write', () => {
    for (const reason of [
      FAR_CROSS_CHECK_REASON,
      FAR_GFA_DISAGREE_REASON,
      SIDE_SEE_NOTES_REASON,
      SIDE_NOT_PLACED_REASON,
      UNNAMED_LEGS_REASON,
      PARKING_MEASURE_REASON,
      PARKING_AREA_USE_REASON,
      PARKING_UNREAD_REASON,
      PARKING_DEFERRED_REASON,
      SETBACK_RULE_REASON,
      RING_NOT_SURVEY_REASON,
      PLACEHOLDER_SET_ASIDE_REASON,
      UNPLACED_ROADS_NOTE,
      ROAD_HIERARCHY_GAP.consequence,
      ACCESS_SIDE_GAP.consequence,
    ]) {
      inArabic(reason);
    }
  });

  /*
    The plot step's blocking list prints each gap's LABEL through the dictionary
    too, and three of the four labels `blockingGaps` can return had no entry: the
    Arabic page showed "GFA", "Height" and "Total Area" (review, 17 Oct 2026).
  */
  it('names every limit that can stop a run, as the blocking list prints it', () => {
    for (const label of ['Total Area', 'GFA', 'FAR', 'Height']) inArabic(label);
  });

  it('does not say no DCR is on file: the 2008 code is held, and only its ratios are not encoded', () => {
    expect(PARKING_DEFERRED_REASON).not.toMatch(/no DCR is on file/);
    expect(PARKING_DEFERRED_REASON).toMatch(/no DCR’s parking ratios are encoded in this study/);
  });

  it('tells the two set-aside reasons apart, as the validator prints them', () => {
    const typed = inArabic(`set aside for this run and not checked: ${TYPED_OVER_RULE_REASON}`);
    const answered = inArabic(`set aside for this run and not checked: ${ANSWERED_BY_FACE_REASON}`);
    expect(answered).not.toBe(typed);
    expect(answered).toContain('واجهة');
  });

  it('names every field the binder reports under, the numbered sides among them', () => {
    for (const field of Object.keys(BINDING_FIELD)) inArabic(field);
    expect(inArabic('setbacks.side_2.building')).toBe('ارتداد البرج، الجانب 2');
    expect(inArabic('setbacks.side_4.podium')).toBe('ارتداد البوديوم، الجانب 4');
    expect(inArabic('setbacks.side_1')).toBe('الارتداد، الجانب 1');
  });

  it('keeps every figure in the refusals and the stated values', () => {
    const gaps = sheetGapsSentence(
      [
        { field: 'gfa_permitted_sqm', label: 'GFA', consequence: '' },
        { field: 'far', label: 'FAR', consequence: '' },
        { field: 'height_allowance', label: 'Height', consequence: '' },
      ],
      '6468096',
    );
    expect(gaps).toMatch(/does not state GFA, FAR and Height,/);
    const ar = inArabic(gaps);
    expect(ar).toContain('6468096');
    expect(ar).toContain('المساحة الطابقية، معامل البناء والارتفاع');

    // The literal `packages/rules/test/sheet-binding.test.ts` requires the evaluator to throw.
    const question =
      'parking: the affection plan requires 1 bay(s) for a dwelling of 150 m² or less and 2 above, and does not say on which area. A 3BED unit is 145.00 m² saleable and 152.63 m² of GFA, so the answer turns on it (1 or 2 bays each). The study does not choose: change that unit’s area, or have the sheet’s threshold confirmed.';
    const q = inArabic(question);
    for (const figure of ['150', '145.00', '152.63', '3BED']) expect(q).toContain(figure);

    expect(engineNote('FAR 5.05; GFA 8796.46 m² ÷ plot area 1740.56 m² = 5.05381', 'ar')).toBe(
      'معامل البناء 5.05؛ المساحة الطابقية 8796.46 م² ÷ مساحة القطعة 1740.56 م² = 5.05381',
    );
    expect(engineNote('edges 1, 3', 'ar')).toBe('الحدود 1، 3');
    expect(engineNote('1 per dwelling ≤ 150 m² (GFA), 2 above', 'ar')).toBe('1 لكل وحدة سكنية ≤ 150 م² (من المساحة الطابقية)، و2 لما فوقها');
    expect(inArabic('no project brief "BRIEF-1" is on file for plot 6211383. Send the id of this plot’s brief, or none.')).toContain('BRIEF-1');
  });
});
