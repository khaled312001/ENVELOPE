/**
 * DBC 2021 Table B.1, as the page prints it.
 *
 * The seed cited "Part B, Table B.1" for a road setback of 9 / 6 / 4.5 / 3 m by
 * road hierarchy and for neighbour tiers one floor off that skipped 3.75 and
 * 6.75 m. The page prints 0 m facing a road at every height, and a G+8 building
 * 6.75 m from its neighbour where the seed gave 6.00. These hold the rules to the
 * page at EVERY row, because the defect lived at the thresholds — a test at G+11
 * alone passed on the wrong table throughout.
 */

import { Decimal } from '@envelope/core';
import { describe, expect, it } from 'vitest';

import { tableRows, unfoundOnPage } from '../../../test-support/dbc-reference.js';
import { resolveParameter, ResolutionStatus } from '../src/resolve.js';
import {
  loadSeedRulesForDevelopment,
  SEED_RULES,
  TABLE_B1,
  TABLE_B1_HEADINGS,
  TABLE_B1_PRINTED,
} from '../src/seed/dubai-residential.js';

const RULES = loadSeedRulesForDevelopment('I understand these rules are not approved');

const ctx = (classification: string, floors: number | undefined, roadHierarchy?: string) => ({
  land_use: 'RESIDENTIAL_MULTI',
  edge: { classification, ...(roadHierarchy ? { road_hierarchy: roadHierarchy } : {}) },
  ...(floors === undefined ? {} : { levels: { above_ground: floors } }),
});

const valueAt = (parameterId: string, classification: string, floors: number, road?: string): string => {
  const r = resolveParameter(parameterId, RULES, ctx(classification, floors, road));
  expect(r.status, `${parameterId} at ${floors} floor(s)`).toBe(ResolutionStatus.RESOLVED);
  const v = r.governing!.value;
  if (v.kind !== 'scalar') throw new Error('not a scalar');
  return v.value.toString();
};

/*
  The column, keyed on floors above ground with the ground floor counted
  (B.4.2.2 ¶7: G+10 is 11 floors). Typed here a second time ON PURPOSE, from
  the page and not from `TABLE_B1_PRINTED`: a test that read the transcription
  it checks would pass on any transcription.
*/
const NEIGHBOUR_BY_FLOORS: Readonly<Record<number, string>> = {
  1: '3', //   G
  2: '3', //   G+1
  3: '3', //   G+2
  4: '3', //   G+3
  5: '3.75', // G+4
  6: '4.5', //  G+5
  7: '5.25', // G+6
  8: '6', //    G+7
  9: '6.75', // G+8
  10: '7.5', // G+9
  11: '7.5', // G+10
  12: '7.5', // G+11
  40: '7.5', // G+39
};

describe('Table B.1, setback from neighbour', () => {
  for (const [floors, expected] of Object.entries(NEIGHBOUR_BY_FLOORS)) {
    it(`${floors} floor(s) above ground → ${expected} m`, () => {
      expect(valueAt('setback.adjacent_plot', 'ADJACENT_PLOT', Number(floors))).toBe(expected);
    });
  }

  it('changes between G+3 and G+4, and between G+7 and G+8 — the thresholds the old table missed', () => {
    expect(valueAt('setback.adjacent_plot', 'ADJACENT_PLOT', 4)).toBe('3');
    expect(valueAt('setback.adjacent_plot', 'ADJACENT_PLOT', 5)).toBe('3.75');
    expect(valueAt('setback.adjacent_plot', 'ADJACENT_PLOT', 8)).toBe('6');
    expect(valueAt('setback.adjacent_plot', 'ADJACENT_PLOT', 9)).toBe('6.75');
  });

  it('does not apply at zero floors above ground rather than borrowing the ground row', () => {
    const r = resolveParameter('setback.adjacent_plot', RULES, ctx('ADJACENT_PLOT', 0));
    expect(r.status).toBe(ResolutionStatus.NOT_GOVERNED);
  });
});

describe('Table B.1, setback from road', () => {
  it('is 0 m at every floor count', () => {
    for (let floors = 1; floors <= 40; floors += 1) {
      expect(valueAt('setback.road', 'ROAD', floors)).toBe('0');
    }
  });

  it('is 0 m whatever the road hierarchy — the table prints none', () => {
    for (const road of ['ARTERIAL', 'COLLECTOR', 'LOCAL', 'ACCESS', undefined]) {
      expect(valueAt('setback.road', 'ROAD', 12, road)).toBe('0');
    }
  });

  it('no seed rule reads the road hierarchy to set a setback', () => {
    const keyed = SEED_RULES.filter((r) => JSON.stringify(r.evaluatorArgs).includes('road_hierarchy'));
    expect(keyed.map((r) => r.ruleId)).toEqual([]);
  });
});

describe('the transcription, against the page', () => {
  it('matches docs/02-reference row for row, cell for cell', () => {
    const rows = tableRows('Table B.1');
    // Header, then ten printed rows.
    expect(rows.length).toBe(1 + TABLE_B1_PRINTED.length);
    expect(rows[0]!.slice(0, 3)).toEqual([...TABLE_B1_HEADINGS]);
    TABLE_B1_PRINTED.forEach((r, i) => {
      expect(rows[i + 1]!.slice(0, 3), r.printed).toEqual([r.printed, r.neighbourM, r.roadM]);
    });
  });

  it('cites p41 with a measured box and text that is on the page', () => {
    expect(TABLE_B1.instrumentId).toBe('DUBAI_BUILDING_CODE');
    expect(TABLE_B1.sourcePage).toBe(41);
    const [x0, y0, x1, y1] = TABLE_B1.sourceBbox;
    expect(x1 - x0).toBeGreaterThan(0);
    expect(y1 - y0).toBeGreaterThan(0);
    // The left column of a landscape A4 page, not the whole sheet.
    expect(x1).toBeLessThan(842 / 2);
    expect(unfoundOnPage(TABLE_B1)).toEqual([]);
  });

  it('catches a doctored row — the check can fail', () => {
    const doctored = {
      ...TABLE_B1,
      sourceTextVerbatim: TABLE_B1.sourceTextVerbatim.replace('[G+8 | 6.75 | 0]', '[G+8 | 6.00 | 0]'),
    };
    expect(unfoundOnPage(doctored)).toEqual(['Table B.1 [G+8 | 6.00 | 0]']);
    const paraphrased = { ...TABLE_B1, sourceTextVerbatim: 'Road setback by hierarchy for residential development.' };
    expect(unfoundOnPage(paraphrased).length).toBe(1);
  });

  it('cites Table B.1 only from the two rules that read it', () => {
    // B.1, not B.13 — the parking ratios' table shares the prefix.
    const citing = SEED_RULES.filter((r) => /Table B\.1(?!\d)/.test(r.citation.clauseReference));
    const real = citing.filter((r) => r.citation.instrumentId === 'DUBAI_BUILDING_CODE');
    expect(real.map((r) => r.ruleId).sort()).toEqual(['R-DBC-B1-NEIGHBOUR', 'R-DBC-B1-ROAD']);
    // Any other mention says it is NOT the table's.
    for (const r of citing.filter((c) => !real.includes(c))) {
      expect(r.citation.clauseReference, r.ruleId).toMatch(/^Not DBC Table B\.1/);
      expect(r.citation.sourceTextVerbatim, r.ruleId).toMatch(/^\[NOT SOURCED\]/);
    }
  });

  it('stays DRAFT — a real page makes a rule checkable, not approved', () => {
    for (const id of ['R-DBC-B1-NEIGHBOUR', 'R-DBC-B1-ROAD']) {
      const r = SEED_RULES.find((x) => x.ruleId === id)!;
      expect(r.status).toBe('DRAFT');
      expect(r.approvedBy).toBeNull();
    }
  });
});

describe('the affection plan still governs where it speaks (B.4.2.3 ¶1)', () => {
  it('a plot-specific setback beats the table', () => {
    const sheet = {
      ...SEED_RULES.find((r) => r.ruleId === 'R-DBC-B1-NEIGHBOUR')!,
      ruleId: 'INSTRUMENT.TEST.setback.adjacent_plot',
      jurisdiction: 'PLOT:X1',
      evaluatorArgs: { value: '1.50' },
      evaluator: 'polygon_offset_inward' as const,
      applicability: { all: [{ 'plot.plot_number': { eq: 'X1' } }, { 'edge.classification': { eq: 'ADJACENT_PLOT' } }] },
      status: 'APPROVED' as const,
      approvedBy: 'test',
      approvedAt: '2026-01-01T00:00:00Z',
      citation: { ...TABLE_B1, instrumentId: 'AFFECTION_PLAN', clauseReference: 'side', sourceTextVerbatim: '1.5m' },
    };
    const r = resolveParameter('setback.adjacent_plot', [...RULES, sheet], {
      ...ctx('ADJACENT_PLOT', 12),
      plot: { plot_number: 'X1' },
    });
    expect(r.status).toBe(ResolutionStatus.RESOLVED);
    expect(r.governing!.rule.ruleId).toBe(sheet.ruleId);
    expect(r.governing!.value).toEqual({ kind: 'scalar', value: new Decimal('1.50') });
    expect(r.superseded.map((s) => s.rule.ruleId)).toEqual(['R-DBC-B1-NEIGHBOUR']);
  });
});
