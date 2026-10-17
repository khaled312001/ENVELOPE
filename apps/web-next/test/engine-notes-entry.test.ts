import { describe, expect, it } from 'vitest';

import { engineNote } from '../src/lib/engine-notes.js';

/*
  The sentence a ring of bays with no ramp writes about the drive from the slab
  edge, verbatim from the engine (`packages/capacity/test/layout.test.ts` holds
  the engine to this exact text). The worked example's ring has a sloped floor
  and so no such drive, so the page's own sentences never carry it: a re-worded
  engine sentence fails here rather than reaching /ar/parking in English.
*/
const ENTRY =
  '3 bay(s) stand where the drive from the slab edge crosses the wall run to reach the ring ' +
  '(6 × 5.5 m), and are not placed: a car drives through them. They are counted as a ' +
  'circulation loss, not as bays.';

describe('the drive from the slab edge to the ring', () => {
  /*
    The whole sentence, not "some Arabic": a test that only asked for an Arabic
    letter passed on an entry that dropped the figures, swapped them, or said
    something else entirely, as long as it said it in Arabic.
  */
  it('is said in both languages, word for word', () => {
    expect(engineNote(ENTRY, 'ar')).toBe(
      '3 مواقف تقع حيث يعبر ممر الدخول (6 × 5.5 م) صف المواقف من حافة الدور إلى الممر الدائري. لا تحسب، فالسيارة تمر من خلالها.',
    );
    expect(engineNote(ENTRY, 'en')).toBe(
      '3 bays stand where the 6 × 5.5 m drive from the slab edge crosses to the ring. They are not counted: a car drives through them.',
    );
  });

  it('keeps the bays it cost and the drive it measured', () => {
    for (const locale of ['ar', 'en'] as const) {
      const said = engineNote(ENTRY, locale) ?? '';
      expect(said).toContain('3');
      expect(said).toContain('6 × 5.5');
    }
  });
});
