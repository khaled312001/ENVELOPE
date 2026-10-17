/**
 * What the plot's own sheet binds since 17 Oct 2026, and what it still says it does not.
 *
 * Four defects, each with its own shape:
 *
 *  1. A sheet printing both a GFA and a FAR bound the FAR, and re-multiplying a
 *     ratio rounded to two places under-reports the GFA the developer priced
 *     (5180196: 5.05 × 1,740.56 = 8,789.83 against 8,796.46 printed).
 *  2. The DDA's per-side setback table was read, shown, and bound to nothing, so
 *     6457790's eight numbers changed no envelope.
 *  3. The sheet's own parking requirement, which DBC B.7.2.6.1 puts above Table
 *     B.13, was kept as a string; demand came from a bedroom table instead.
 *  4. A boundary the table does not name took the general rule without a word.
 *
 * Each test asserts on the RULES and their resolution, not on a capacity, for the
 * reason `instrument.test.ts` gives: a test on the answer passes for the life of a
 * bug the answer happens not to show.
 */

import { Decimal, type Citation, type StatedLimits } from '@envelope/core';
import { describe, expect, it } from 'vitest';

import { evaluate, RuleEvaluationError } from '../src/evaluators.js';
import { BRIEF_NOT_AUTHORITY, rulesFromBrief } from '../src/instruments/brief.js';
import {
  FAR_CROSS_CHECK_REASON,
  FAR_GFA_DISAGREE_REASON,
  InstrumentQuestionError,
  PARKING_AREA_USE_REASON,
  PARKING_MEASURE_REASON,
  rulesFromInstrument,
  SHEET_PARKING_FN,
  SIDE_NOT_PLACED_REASON,
  SIDE_SEE_NOTES_REASON,
  UNNAMED_LEGS_REASON,
  type InstrumentBinding,
} from '../src/instruments/sheet.js';
import { resolveParameter, ResolutionStatus } from '../src/resolve.js';
import { SEED_RULES } from '../src/seed/dubai-residential.js';
import { PROJECT_BRIEFS } from '../src/standards/index.js';

const binding = (plotNumber: string, extra: Partial<InstrumentBinding> = {}): InstrumentBinding => ({
  plotNumber,
  instrumentId: `SHEET-${plotNumber}`,
  issuedOn: '2026-01-01',
  authoredBy: 'test',
  ...extra,
});

const cite = (clause: string, verbatim: string): Citation => ({
  instrumentId: 'AFFECTION_PLAN',
  instrumentVersion: '2026-01-01',
  clauseReference: clause,
  documentUri: 'sheet.pdf',
  sourcePage: 1,
  sourceBbox: [0, 0, 10, 10],
  sourceTextVerbatim: verbatim,
});

const d = (s: string): Decimal => new Decimal(s);

const farOf = (limits: StatedLimits, plot: string): string | undefined =>
  rulesFromInstrument(limits, binding(plot)).rules.find((r) => r.parameterId === 'far.max')?.evaluatorArgs['value'] as
    | string
    | undefined;

describe('a printed GFA governs and the printed FAR is its cross-check', () => {
  const plot5180196: StatedLimits = {
    far: { value: d('5.05'), citation: cite('far', 'FAR 5.05') },
    gfaM2: { value: d('8796.46'), citation: cite('gfa', 'GFA 8,796.46') },
    plotAreaM2: { value: d('1740.56'), citation: cite('area', 'PLOT AREA 1,740.56') },
  };

  it('applies GFA ÷ plot area, so the band never falls short of the GFA the sheet prints', () => {
    const far = d(farOf(plot5180196, '5180196')!);
    expect(far.toString()).toBe('5.05381');
    // Re-multiplying the printed 5.05 gave 8,789.83: 6.63 m² short.
    expect(far.times('1740.56').toNumber()).toBeGreaterThan(8796.45);
    expect(far.times('1740.56').lte('8796.46')).toBe(true);
  });

  it('says so in the citation and lists the FAR as the cross-check it passed', () => {
    const { rules, notBound } = rulesFromInstrument(plot5180196, binding('5180196'));
    const far = rules.find((r) => r.parameterId === 'far.max')!;
    expect(far.citation.sourceTextVerbatim).toMatch(/^the printed GFA governs and the printed FAR 5\.05 is its cross-check;/);
    expect(notBound).toContainEqual({
      field: 'far',
      stated: 'FAR 5.05; GFA 8796.46 m² ÷ plot area 1740.56 m² = 5.05381',
      reason: FAR_CROSS_CHECK_REASON,
    });
    expect(notBound.map((n) => n.field)).not.toContain('gfaSqm');
  });

  it('binds the lower of the two where they disagree beyond the FAR’s rounding, and says they disagree', () => {
    const lowFar = { ...plot5180196, far: { value: d('4.00'), citation: cite('far', 'FAR 4.00') } };
    expect(farOf(lowFar, '5180196')).toBe('4');
    const highFar = { ...plot5180196, far: { value: d('6.00'), citation: cite('far', 'FAR 6.00') } };
    expect(farOf(highFar, '5180196')).toBe('5.05381');
    for (const limits of [lowFar, highFar]) {
      expect(rulesFromInstrument(limits, binding('5180196')).notBound.find((n) => n.field === 'far')?.reason).toBe(
        FAR_GFA_DISAGREE_REASON,
      );
    }
  });

  it('still binds a printed FAR alone where no plot area is printed to divide by', () => {
    expect(farOf({ far: plot5180196.far!, gfaM2: plot5180196.gfaM2! }, '5180196')).toBe('5.05');
  });
});

/*
  6457790's table as printed: BUILDING / PODIUM 5/4, 7/6, 7/6, 7/6, each side on
  the surveyed leg the drawing labels. Edges are the plot's boundaries in the order
  the server stores them, each with the leg it IS.
*/
const SIDES: StatedLimits = {
  setbacksBySide: {
    value: {
      sides: [
        { side: 1, building: { kind: 'DISTANCE', metres: d('5') }, podium: { kind: 'DISTANCE', metres: d('4') }, boundary: 2 },
        { side: 2, building: { kind: 'DISTANCE', metres: d('7') }, podium: { kind: 'DISTANCE', metres: d('6') }, boundary: 3 },
        { side: 3, building: { kind: 'DISTANCE', metres: d('7') }, podium: { kind: 'DISTANCE', metres: d('6') }, boundary: 0 },
        { side: 4, building: { kind: 'DISTANCE', metres: d('7') }, podium: { kind: 'DISTANCE', metres: d('6') } },
      ],
      raw: 'SETBACK (M) BUILDING / PODIUM — SIDE ( 1 ): 5 / 4; SIDE ( 2 ): 7 / 6; SIDE ( 3 ): 7 / 6; SIDE ( 4 ): 7 / 6',
      placement: 'Each side of the table is the surveyed boundary the drawing labels with its number: side 1 runs from corner 3 to corner 4.',
    },
    citation: cite('setbacks_by_side', 'SETBACK (M)'),
  },
};
const EDGES = [
  { seq: 0, classification: 'ADJACENT_PLOT', surveyLeg: 2 },
  { seq: 1, classification: 'ADJACENT_PLOT', surveyLeg: 3 },
  { seq: 2, classification: 'ADJACENT_PLOT', surveyLeg: 0 },
  { seq: 3, classification: 'ADJACENT_PLOT', surveyLeg: 1 },
] as const;

const edgeCtx = (seq: number): Record<string, unknown> => ({
  land_use: 'RESIDENTIAL_MULTI',
  plot: { plot_number: '6457790', frontage_count: 0 },
  edge: { classification: 'ADJACENT_PLOT', seq },
});

describe('the per-side table binds the boundary each side is', () => {
  const out = rulesFromInstrument(SIDES, binding('6457790', { edges: EDGES }));
  const value = (parameterId: string, seq: number): string | undefined => {
    const r = resolveParameter(parameterId, [...out.rules, ...SEED_RULES], edgeCtx(seq));
    const v = r.governing?.value as { readonly value?: Decimal } | undefined;
    return r.status === ResolutionStatus.RESOLVED ? v?.value?.toString() : undefined;
  };

  it('puts the building row on the tower and the podium row on the podium, edge by edge', () => {
    // edge 0 is leg 2, which the drawing labels side 1: 5 m and 4 m. Edge 1 is side 2.
    expect(value('setback.adjacent_plot', 0)).toBe('5');
    expect(value('setback.podium.adjacent_plot', 0)).toBe('4');
    expect(value('setback.adjacent_plot', 1)).toBe('7');
    expect(value('setback.podium.adjacent_plot', 1)).toBe('6');
    expect(value('setback.adjacent_plot', 2)).toBe('7');
  });

  it('cites the side and its placement, and the rule supersedes the general one', () => {
    const r = out.rules.find((x) => x.ruleId.endsWith('tower.setback.side_1'))!;
    expect(r.citation.sourceTextVerbatim).toMatch(/^SIDE \( 1 \): BUILDING 5 m — Each side of the table/);
    const res = resolveParameter('setback.adjacent_plot', [...out.rules, ...SEED_RULES], edgeCtx(0));
    expect(res.status).toBe(ResolutionStatus.RESOLVED);
    expect(res.governing?.rule.ruleId).toBe(r.ruleId);
  });

  it('names the side it could not place and the boundary no side names, and never defaults them', () => {
    expect(out.notBound).toContainEqual({ field: 'setbacks.side_4', stated: 'SIDE ( 4 ): 7 m / 6 m', reason: SIDE_NOT_PLACED_REASON });
    // Leg 1 (edge 3) is the boundary side 4 was meant to be; no rule of the sheet lands on it.
    expect(out.notBound).toContainEqual({ field: 'setbacks.unnamed_sides', stated: 'edges 3', reason: UNNAMED_LEGS_REASON });
    expect(value('setback.podium.adjacent_plot', 3)).toBeUndefined();
  });

  it('binds no side at all where the plot is not the surveyed ring, and says why', () => {
    const none = rulesFromInstrument(SIDES, binding('6457790', { edgesUnmatched: 'the ring is not the survey' }));
    expect(none.rules.filter((r) => r.parameterId.startsWith('setback.'))).toEqual([]);
    expect(none.notBound).toContainEqual({ field: 'setbacks.by_side', stated: SIDES.setbacksBySide!.value.raw, reason: 'the ring is not the survey' });
  });

  it('reads a SEE NOTES cell as a deferral, not a distance', () => {
    const seeNotes: StatedLimits = {
      setbacksBySide: {
        ...SIDES.setbacksBySide!,
        value: {
          ...SIDES.setbacksBySide!.value,
          sides: [{ side: 1, building: { kind: 'SEE_NOTES', verbatim: 'SEE NOTES' }, podium: { kind: 'DISTANCE', metres: d('4') }, boundary: 2 }],
        },
      },
    };
    const o = rulesFromInstrument(seeNotes, binding('6457790', { edges: EDGES }));
    expect(o.rules.map((r) => r.parameterId)).toEqual(['setback.podium.adjacent_plot']);
    expect(o.notBound).toContainEqual({ field: 'setbacks.side_1.building', stated: 'SIDE ( 1 ): SEE NOTES', reason: SIDE_SEE_NOTES_REASON });
  });
});

/*
  The DDA's note: "1 bay for each unit ≤ 150 SQ.M GFA, 2 bays above". The
  Municipality's row: «موقف لكل شقة … وموقفين لكل شقة تزيد مساحتها عن 150 متر
  مربع» — on an area it does not name.
*/
const parking = (measure: 'GFA' | 'UNSTATED'): StatedLimits => ({
  parking: {
    value: {
      dwelling: { baysAtOrBelow: 1, baysAbove: 2, thresholdM2: d('150'), measure, ...(measure === 'UNSTATED' ? { studioBays: 1 } : {}) },
      byArea: [{ use: 'RETAIL', bays: 1, perM2: d('70'), measure: 'NET_AREA' }],
      unread: [],
      raw: 'PARKING: 1 BAY FOR EACH UNIT ≤ 150 SQ.M GFA',
    },
    citation: cite('parking', 'PARKING'),
  },
});

const mix = (...entries: readonly (readonly [string, number, string, string])[]): Record<string, unknown> => ({
  land_use: 'RESIDENTIAL_MULTI',
  plot: { plot_number: '6457790' },
  unit: { mix: entries.map(([typeId, count, nsa, gfa]) => ({ typeId, count, nsa_m2: nsa, gfa_m2: gfa })) },
});

const scalar = (r: ReturnType<typeof evaluate>): string =>
  (r as { readonly value?: Decimal }).value?.toString() ?? JSON.stringify(r);

describe('the sheet’s parking requirement takes precedence over Table B.13', () => {
  it('binds parking.demand over the seed rule, citing B.7.2.6.1', () => {
    const { rules } = rulesFromInstrument(parking('GFA'), binding('6457790'));
    const rule = rules.find((r) => r.parameterId === 'parking.demand')!;
    expect(rule.evaluatorArgs['fn']).toBe(SHEET_PARKING_FN);
    expect(rule.citation.clauseReference).toMatch(/B\.7\.2\.6\.1/);
    const res = resolveParameter('parking.demand', [...rules, ...SEED_RULES], mix(['3BED', 10, '145', '152.63']));
    expect(res.status).toBe(ResolutionStatus.RESOLVED);
    expect(res.governing?.rule.ruleId).toBe(rule.ruleId);
  });

  it('counts by the unit’s area and never by its bedrooms', () => {
    const rule = rulesFromInstrument(parking('GFA'), binding('6457790')).rules.find((r) => r.parameterId === 'parking.demand')!;
    // A 145 m² saleable unit is 152.63 m² of GFA at a 95% share: two bays each, on the sheet's measure.
    expect(scalar(evaluate(rule, mix(['3BED', 10, '145', '152.63'], ['1BED', 20, '70', '73.68'])))).toBe('40');
    // At the threshold exactly is "≤ 150": one bay.
    expect(scalar(evaluate(rule, mix(['2BED', 4, '142.5', '150'])))).toBe('4');
  });

  it('refuses a unit type that reaches it without an area', () => {
    const rule = rulesFromInstrument(parking('GFA'), binding('6457790')).rules.find((r) => r.parameterId === 'parking.demand')!;
    expect(() => evaluate(rule, { unit: { mix: [{ typeId: '1BED', count: 3 }] } })).toThrow(RuleEvaluationError);
  });

  it('applies an unnamed area where both readings agree and asks where they do not', () => {
    const rule = rulesFromInstrument(parking('UNSTATED'), binding('1341556')).rules.find((r) => r.parameterId === 'parking.demand')!;
    const ok = evaluate(rule, {
      unit: {
        mix: [
          { typeId: '1BED', count: 3, nsa_m2: '70', gfa_m2: '73.68' },
          { typeId: 'STUDIO', count: 2, nsa_m2: '40', gfa_m2: '42.11' },
        ],
      },
    });
    expect(scalar(ok)).toBe('5');
    let thrown: unknown;
    try {
      evaluate(rule, { unit: { mix: [{ typeId: '3BED', count: 1, nsa_m2: '145', gfa_m2: '152.63' }] } });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(InstrumentQuestionError);
    // The literal `apps/api/test/binding-words.test.ts` holds to its Arabic.
    expect((thrown as Error).message).toBe(
      'parking: the affection plan requires 1 bay(s) for a dwelling of 150 m² or less and 2 above, and does not say on which area. A 3BED unit is 145.00 m² saleable and 152.63 m² of GFA, so the answer turns on it (1 or 2 bays each). The study does not choose: change that unit’s area, or have the sheet’s threshold confirmed.',
    );
  });

  it('lists what it does not bind: the unnamed measure, and every rate per area', () => {
    const { notBound } = rulesFromInstrument(parking('UNSTATED'), binding('1341556'));
    expect(notBound.map((n) => [n.field, n.reason])).toEqual([
      ['parking.dwelling_area', PARKING_MEASURE_REASON],
      ['parking.retail', PARKING_AREA_USE_REASON],
    ]);
    expect(notBound.find((n) => n.field === 'parking.retail')?.stated).toBe('1 bay(s) per 70 m² (retail)');
  });
});

describe('a project brief is a second instrument, not a regulation', () => {
  const brief = PROJECT_BRIEFS[0]!;

  it('binds a FAR from the brief’s own GFA and plot area, marked as the brief’s', () => {
    const rules = rulesFromBrief(brief, { plotNumber: brief.plotNumber, authoredBy: 'test', sheetBinds: new Set() });
    expect(rules.map((r) => r.parameterId)).toEqual(['far.max']);
    expect(rules[0]!.citation.sourceTextVerbatim.startsWith(BRIEF_NOT_AUTHORITY)).toBe(true);
    expect(rules[0]!.jurisdiction).toBe(`PLOT:${brief.plotNumber}`);
  });

  it('binds nothing the plot’s own sheet already binds, and nothing on another plot', () => {
    expect(rulesFromBrief(brief, { plotNumber: brief.plotNumber, authoredBy: 't', sheetBinds: new Set(['far.max']) })).toEqual([]);
    expect(rulesFromBrief(brief, { plotNumber: '1', authoredBy: 't', sheetBinds: new Set() })).toEqual([]);
  });
});
