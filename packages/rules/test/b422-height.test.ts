/**
 * DBC 2021 B.4.2.2 ¶6–¶7: the total allowable height is the floors the affection
 * plan or DCR allows × 6 m, the ground floor counted (G+10 → 11 × 6 = 66 m).
 *
 * The seed's height used to be 45.00 m cited to "DCR, plot schedule" — a figure
 * no instrument prints, governing every plot and shown DERIVED. These hold the
 * replacement: the code's own arithmetic when a count is stated, and the old
 * figure only where none is, under a citation that says it is not the code's.
 */

import { describe, expect, it } from 'vitest';

import { unfoundOnPage } from '../../../test-support/dbc-reference.js';
import { resolveParameter, ResolutionStatus } from '../src/resolve.js';
import {
  DBC_B422,
  heightFromStatedFloors,
  loadSeedRulesForDevelopment,
  SEED_RULES,
} from '../src/seed/dubai-residential.js';

const RULES = loadSeedRulesForDevelopment('I understand these rules are not approved');
const RES = { land_use: 'RESIDENTIAL_MULTI' };

const height = (levels: Record<string, number> | undefined, rules = RULES) =>
  resolveParameter('height.max', rules, { ...RES, ...(levels ? { levels } : {}) });

describe('B.4.2.2 ¶6 — stated floors × 6 m', () => {
  it.each([
    [1, '6'],
    [5, '30'],
    [11, '66'], // ¶7's own example, G+10
    [23, '138'],
  ])('%s floor(s) stated → %s m', (floors, metres) => {
    const r = height({ max_above_ground: floors, above_ground: 3 });
    expect(r.status).toBe(ResolutionStatus.RESOLVED);
    expect(r.governing!.rule.ruleId).toBe('R-DBC-B422-HEIGHT');
    expect(r.governing!.value).toEqual({ kind: 'scalar', value: expect.anything() });
    expect(r.governing!.value.kind === 'scalar' && r.governing!.value.value.toString()).toBe(metres);
    // The placeholder does not stand beside it: a stated count is answered by the code.
    expect(r.superseded).toEqual([]);
  });

  it('reads the stated count, never the solver’s level count', () => {
    const withoutDraft = RULES.filter((r) => r.ruleId !== 'R-HEIGHT-MAX-RES');
    expect(height({ above_ground: 14 }, withoutDraft).status).toBe(ResolutionStatus.NOT_GOVERNED);
  });

  it('does not apply to a count that is not a whole number of floors', () => {
    const withoutDraft = RULES.filter((r) => r.ruleId !== 'R-HEIGHT-MAX-RES');
    expect(height({ max_above_ground: 0 }, withoutDraft).status).toBe(ResolutionStatus.NOT_GOVERNED);
    expect(height({ max_above_ground: 4.5 }, withoutDraft).status).toBe(ResolutionStatus.NOT_GOVERNED);
  });

  it('is marked as the count in metres, so the envelope never sets it aside as a rival ceiling', () => {
    const rule = SEED_RULES.find((r) => r.ruleId === 'R-DBC-B422-HEIGHT')!;
    expect(heightFromStatedFloors(rule)).toBe(true);
    expect(heightFromStatedFloors(SEED_RULES.find((r) => r.ruleId === 'R-HEIGHT-MAX-RES')!)).toBe(false);
  });

  it('cites p40 with text that is on the page', () => {
    expect(DBC_B422.instrumentId).toBe('DUBAI_BUILDING_CODE');
    expect(DBC_B422.sourcePage).toBe(40);
    expect(unfoundOnPage(DBC_B422)).toEqual([]);
  });
});

describe('the 45 m placeholder', () => {
  it('answers only where no floor count is stated', () => {
    const r = height({ above_ground: 14 });
    expect(r.governing!.rule.ruleId).toBe('R-HEIGHT-MAX-RES');
    expect(r.governing!.value.kind === 'scalar' && r.governing!.value.value.toString()).toBe('45');
  });

  it('says it is not the code’s, and is not sourced', () => {
    const rule = SEED_RULES.find((r) => r.ruleId === 'R-HEIGHT-MAX-RES')!;
    expect(rule.citation.clauseReference).toMatch(/^Not DBC B\.4\.2\.2/);
    expect(rule.citation.sourceTextVerbatim).toMatch(/^\[NOT SOURCED\]/);
    expect(rule.citation.instrumentId).toBe('PLACEHOLDER-NOT-A-REAL-INSTRUMENT');
  });
});
