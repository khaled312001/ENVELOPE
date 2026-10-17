import { engineNote, NOT_BOUND_FIELD } from '@envelope/report/words';
import { PODIUM_SIDE_REAR_REASON, TOWER_FRONT_REASON, TOWER_SIDE_REAR_REASON } from '@envelope/rules';
import { describe, expect, it } from 'vitest';

/*
  The tower row and the podium row (17 Oct 2026) brought new sentences a reader
  sees: why a limit was not bound, the refusals and questions the envelope halts
  with, and the assumption it records where the sheet leaves the podium a
  choice. `@envelope/report` may not import the rules or the engine, so they are
  held to its dictionary from here, where both are visible. The envelope's
  sentences are the literals `packages/capacity/test/tower-limits.test.ts`
  requires the engine to write, so a change to one fails one of the two.
*/

const ARABIC = /[؀-ۿ]/;
const LATIN_WORD = /\b(?:the|boundary|setback|sheet|typed|podium|tower)\b/i;

function inArabic(text: string): string {
  const ar = engineNote(text, 'ar');
  expect(ar, text).not.toBeNull();
  expect(ar!).toMatch(ARABIC);
  return ar!;
}

describe('the tower and podium rows, said in Arabic', () => {
  it('names every field a limit is left unbound under, and never calls the podium row the tower’s', () => {
    for (const field of [
      'gfaSqm',
      'setbacks.tower.front',
      'setbacks.tower.side',
      'setbacks.tower.rear',
      'setbacks.tower.side_and_rear',
      'setbacks.front',
      'setbacks.side',
      'setbacks.rear',
      'setbacks.side_and_rear',
    ]) {
      expect(NOT_BOUND_FIELD[field], field).toBeDefined();
      inArabic(field);
      const en = engineNote(field, 'en')!;
      expect(en.includes('Tower'), field).toBe(field.startsWith('setbacks.tower'));
    }
  });

  it('gives each reason the binder writes in Arabic', () => {
    const conditional =
      'The sheet makes this setback depend on the façade, which is a design decision and ' +
      'not a datum. Collapsing it to one distance would choose the applicant’s façade for ' +
      'them, so it stays a decision and binds nothing until it is made.';
    for (const reason of [TOWER_FRONT_REASON, TOWER_SIDE_REAR_REASON, PODIUM_SIDE_REAR_REASON, conditional]) {
      expect(inArabic(reason)).not.toMatch(LATIN_WORD);
    }
    expect(inArabic('side 3 m, rear 4 m')).toBe('الجانبي 3 م، الخلفي 4 م');
  });

  it('translates the envelope’s refusals and questions, keeping every figure and the sheet’s quote', () => {
    const cases: readonly (readonly [string, readonly string[]])[] = [
      [
        'edge 1: the affection plan states a tower setback of 3 m for this boundary ("Tower: Front = 0m, ' +
          'Sides & Rear = 3m"), and a typed 2 m may not replace it. Clear the typed value, or type 3 m.',
        ['الحد 1', '3 م', '2 م', 'Tower: Front = 0m, Sides & Rear = 3m'],
      ],
      [
        'edge 0: the affection plan states the tower setback by face (front 0 m; side 3 m; rear 3 m) and does ' +
          'not say which face this boundary is. Type the figure for the face it is on the plot step.',
        ['الحد 0', 'الأمامي 0 م', 'الجانبي 3 م', 'الخلفي 3 م'],
      ],
      [
        'edge 2: a typed tower setback of 1.5 m is none of the figures the affection plan states by face ' +
          '(front 0 m; side 3 m; rear 3 m). Type the figure for the face this boundary is.',
        ['الحد 2', '1.5 م', 'الأمامي 0 م'],
      ],
      [
        'edge 1: the affection plan sets the podium back 2 m on this boundary and the tower stands on the ' +
          'podium, so a tower setback of 1 m cannot be built. Type at least 2 m, or clear the value.',
        ['الحد 1', '2 م', '1 م'],
      ],
      [
        'podium setback on edges 1, 2, 3, where the affection plan leaves a choice',
        ['1، 2، 3'],
      ],
      [
        'The affection plan sets the podium back by façade on edges 1, 2, 3 (side to solid wall 0 m; side to ' +
          "window wall 4 m). The podium is taken as a solid wall there, 0 m, because Eng. Mohamed's statement " +
          'STMT-PODIUM-SETBACK-2026-10-16 puts the podium on the boundary. A window wall would need 4 m.',
        ['Eng. Mohamed', 'STMT-PODIUM-SETBACK-2026-10-16', '4 م', 'الجانبي to solid wall 0 م'],
      ],
      [
        'The affection plan states a different podium setback for the side and for the rear (side 3 m; rear ' +
          '4 m), and which boundary is the rear is not on the sheet. The larger, 4 m, is taken on edges 1, 3, ' +
          'so the podium is drawn inside both lines.',
        ['الجانبي 3 م', 'الخلفي 4 م', '1، 3'],
      ],
    ];
    for (const [sentence, keeps] of cases) {
      const ar = inArabic(sentence);
      for (const k of keeps) expect(ar, sentence).toContain(k);
    }
  });

  it('names the tower coverage cap when it is what binds the plate', () => {
    expect(inArabic('tower coverage cap')).toBe('حد تغطية البرج');
    expect(inArabic('tower_coverage.max')).toBe('تغطية البرج، الحد الأقصى');
    expect(inArabic('setback.podium.adjacent_plot')).toBe('ارتداد البوديوم عن القطعة المجاورة');
  });
});
