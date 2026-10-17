/**
 * Every Dubai Building Code citation the engine carries, found on its page.
 *
 * Table B.9's and Table B.10's "verbatim" text used to be cells and clauses joined
 * into sentences p80 and p82 do not print — "Straight: maximum slope percentage
 * 12%, …" — so no audit could find them, and the join had dropped half of
 * B.7.2.2 d): the curb's 150 mm height. A verbatim field is a promise that the
 * words are on the page; this holds every constant to it.
 */

import type { Citation } from '@envelope/core';
import { SEED_RULES } from '@envelope/rules';
import { describe, expect, it } from 'vitest';

import { unfoundOnPage } from '../../../test-support/dbc-reference.js';
import { CLAUSE_B_7_2_1, TABLE_B11_DRIVEWAY } from '../src/access.js';
import { CLAUSE_B_7_2_6_2, CLAUSE_C_6_4_1_4, TABLE_C17 } from '../src/accessible.js';
import { TABLE_B11 } from '../src/layout.js';
import { PARKED_SLOPE_B7231, STRAIGHT_RAMP, TABLE_B10, TABLE_B9 } from '../src/ramp-rules.js';

/*
  EVERY citation constant in `packages/capacity/src` that names the code, not
  only the three this test was written for — docs/02-reference/dbc/README.md
  says each one is held to the page, and B.7.2.1's ¶5 was not: it stopped at a
  full stop the page does not print. A new DBC constant belongs in this list.
*/
const CITATIONS: Readonly<Record<string, Citation>> = {
  TABLE_B9,
  TABLE_B10,
  PARKED_SLOPE_B7231,
  CLAUSE_B_7_2_1,
  TABLE_B11_DRIVEWAY,
  TABLE_B11,
  TABLE_C17,
  CLAUSE_C_6_4_1_4,
  CLAUSE_B_7_2_6_2,
};

describe('DBC citations in the engine', () => {
  for (const [name, c] of Object.entries(CITATIONS)) {
    it(`${name}: every piece of its verbatim text is on p${c.sourcePage}`, () => {
      expect(c.instrumentId).toBe('DUBAI_BUILDING_CODE');
      expect(unfoundOnPage(c)).toEqual([]);
    });
  }

  // The seed's DBC records (Table B.1, B.4.2.2, Table B.13), read as the engine loads them.
  for (const r of SEED_RULES.filter((x) => x.citation.instrumentId === 'DUBAI_BUILDING_CODE')) {
    it(`${r.ruleId}: every piece of its verbatim text is on p${r.citation.sourcePage}`, () => {
      expect(unfoundOnPage(r.citation)).toEqual([]);
    });
  }

  it('B.7.2.1 ¶5 is quoted to its end — a full stop the page does not print is caught', () => {
    const truncated = {
      ...CLAUSE_B_7_2_1,
      sourceTextVerbatim: CLAUSE_B_7_2_1.sourceTextVerbatim.replace(
        'affection plan, as shown in Figure B.49.',
        'affection plan.',
      ),
    };
    expect(unfoundOnPage(truncated).length).toBe(1);
  });

  it('the old, stitched Table B.9 text is caught — the check can fail', () => {
    const stitched = {
      ...TABLE_B9,
      sourceTextVerbatim:
        'Straight: maximum slope percentage 12%, minimum single lane width 3 m, minimum ' +
        'vertical clear height above any point 2.4 m.',
    };
    expect(unfoundOnPage(stitched).length).toBe(1);
    const wrongCell = { ...TABLE_B10, sourceTextVerbatim: 'Table B.10 [12% | 6% | 3.0]' };
    expect(unfoundOnPage(wrongCell)).toEqual(['Table B.10 [12% | 6% | 3.0]']);
  });

  it('carries the curb height B.7.2.2 d) prints beside its width', () => {
    expect(TABLE_B9.sourceTextVerbatim).toContain('not less than 150 mm in height');
    expect(STRAIGHT_RAMP.separationHeightM).toBe('0.15');
    expect(STRAIGHT_RAMP.separationM).toBe('0.3');
  });

  it('the figures the ramp is sized from are the cells cited', () => {
    // Straight row: 12% | 3 | - | 2.4. Table B.10's 12% row: 6% | 3.6.
    expect(TABLE_B9.sourceTextVerbatim).toContain('[Straight See Figure B.51 | 12% | 3 | - | 2.4]');
    expect(TABLE_B10.sourceTextVerbatim).toContain('[12% | 6% | 3.6]');
    expect(STRAIGHT_RAMP).toMatchObject({
      maxSlope: '0.12',
      laneWidthM: '3',
      clearHeightM: '2.4',
      transitionSlope: '0.06',
      transitionLengthM: '3.6',
    });
  });
});
