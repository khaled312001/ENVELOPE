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
  it('is said in both languages', () => {
    expect(engineNote(ENTRY, 'ar')).toMatch(/[؀-ۿ]/);
    expect(engineNote(ENTRY, 'en')).not.toBeNull();
  });

  it('keeps the bays it cost and the drive it measured', () => {
    for (const locale of ['ar', 'en'] as const) {
      const said = engineNote(ENTRY, locale) ?? '';
      expect(said).toContain('3');
      expect(said).toContain('6 × 5.5');
    }
  });
});
