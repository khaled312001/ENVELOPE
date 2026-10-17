import {
  heldBoundarySentence,
  placeholderFarBasis,
  placeholderPlateBasis,
  TYPED_LIMIT_REASON,
} from '@envelope/capacity';
import { Decimal } from '@envelope/core';
import { engineNote } from '@envelope/report/words';
import { describe, expect, it } from 'vitest';

/*
  Band A's base, the boundaries held to a neighbour's line and the limits a
  reader types brought sentences a reader sees: in the register, under a refusal,
  in the validator's set-aside list. `@envelope/report` may not import the
  engine, so they are held to its dictionary from here, built by the engine's own
  constructors — a change to the wording fails here first.
*/

const ARABIC = /[؀-ۿ]/;
const LATIN_WORD = /\b(?:the|boundary|setback|placeholder|typed|plot|instrument|affection)\b/i;

function inArabic(text: string): string {
  const ar = engineNote(text, 'ar');
  expect(ar, text).not.toBeNull();
  expect(ar!).toMatch(ARABIC);
  expect(ar!, ar!).not.toMatch(LATIN_WORD);
  return ar!;
}

describe('the envelope’s new sentences, in both languages', () => {
  it('says a boundary held to its neighbour’s line, with its figures', () => {
    const t = heldBoundarySentence({
      seq: 1,
      lengthM: new Decimal('0.424'),
      ownSetbackM: new Decimal('0'),
      heldToSeq: 0,
      heldAtM: new Decimal('3'),
      costAtMostM2: new Decimal('1.28'),
    });
    const ar = inArabic(t);
    expect(ar).toContain('1.28');
    expect(ar).toContain('الحد 1');
    expect(engineNote(t, 'en')).toMatch(/^Boundary 1 \(0\.42 m, set back 0 m\) follows the setback line of boundary 0 \(3 m\)/);
  });

  it('says the placeholder FAR and plate cap, naming the placeholder', () => {
    const far = inArabic(placeholderFarBasis(new Decimal('5'), 'R-FAR-MAX-RES'));
    expect(far).toContain('R-FAR-MAX-RES');
    const plate = inArabic(placeholderPlateBasis(new Decimal('1280'), 'R-TOWER-PLATE-MAX-RES'));
    expect(plate).toContain('1280');
  });

  it('says the refusals of a typed limit and the rule it set aside', () => {
    inArabic(
      'this plot’s own instrument states its floor area ratio (3.500003: "FAR = 3.5"), and a typed FAR may not replace it. Clear the typed value.',
    );
    inArabic('the affection plan states 11 level(s) above ground ("G+2P+8"), and a typed 9 may not replace it. Clear the typed storeys, or type 11.');
    inArabic('a typed FAR of 0 is outside 0–30. Check the figure.');
    inArabic('a typed storey count of 2.5 is not a whole number from 1 to 200. Count the ground floor as one.');
    inArabic(`set aside for this run and not checked: ${TYPED_LIMIT_REASON}`);
  });

  it('names the new register rows', () => {
    for (const label of ['floor area ratio', 'boundary held to its neighbour’s setback line', 'level count typed by the reader']) {
      inArabic(label);
    }
  });
});
