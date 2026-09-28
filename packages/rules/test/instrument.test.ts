/**
 * The plot's own sheet, beating the draft rule that used to answer for it.
 *
 * This suite exists because of a defect with a specific shape: the affection plan
 * was read, displayed, and then dropped before the engine ran. A run of the Warsan
 * plot used the seed FAR of 5.00 while the sheet in the same session printed 3.5.
 * The published answer happened to be governed by parking, so nothing looked
 * wrong — which is why the tests below assert on the RESOLUTION and not on the
 * final capacity. A test that only checked the answer would have passed
 * throughout the entire life of the bug.
 *
 * The three things it holds:
 *
 *  1. the sheet's limit governs and the seed rule is recorded as superseded,
 *     named rather than absent;
 *  2. a rule built from one plot's sheet does NOT apply to another plot;
 *  3. every limit that binds nothing comes back in `notBound` with a reason —
 *     a builder that silently emitted four rules from a sheet stating six would
 *     understate the instrument while looking complete.
 */

import { Decimal, type Citation, type StatedLimits } from '@envelope/core';
import { describe, expect, it } from 'vitest';

import {
  INSTRUMENT_APPROVER,
  rulesFromInstrument,
  type InstrumentBinding,
} from '../src/instruments/sheet.js';
import { SEED_RULES } from '../src/seed/dubai-residential.js';
import { isPlotSpecific, resolveParameter, ResolutionStatus } from '../src/resolve.js';

const PLOT = '6211383';

const BINDING: InstrumentBinding = {
  plotNumber: PLOT,
  instrumentId: 'WARSAN-6211383-2024-03-11',
  issuedOn: '2024-03-11',
  authoredBy: 'test',
};

function citation(clause: string, verbatim: string): Citation {
  return {
    instrumentId: 'AFFECTION_PLAN',
    instrumentVersion: '2024-03-11',
    clauseReference: clause,
    documentUri: 'IC1-CTYL-16_011-warsan1-621.pdf',
    sourcePage: 1,
    sourceBbox: [10, 20, 90, 30],
    sourceTextVerbatim: verbatim,
  };
}

/** The Warsan sheet, as `intake` reads it. */
const WARSAN: StatedLimits = {
  far: { value: new Decimal('3.5'), citation: citation('far', 'FAR = 3.5') },
  gfaM2: { value: new Decimal('4778.31'), citation: citation('gfa', 'GFA=4778.31 Sq. m') },
  coverage: {
    value: { podium: new Decimal('0.6'), raw: '60% of plot area' },
    citation: citation('coverage', '60% of plot area'),
  },
  setbacks: {
    value: {
      podium: {
        front: { kind: 'FIXED', metres: new Decimal('6') },
        side: { kind: 'FIXED', metres: new Decimal('3') },
        rear: { kind: 'FIXED', metres: new Decimal('3') },
      },
      tower: {},
      raw: 'Front 6.0m, side and rear 3.0m',
      requiresDecision: false,
    },
    citation: citation('setbacks', 'Front 6.0m, side and rear 3.0m'),
  },
  height: {
    value: { typicalFloors: 8, podiumLevels: 2, totalLevels: 11, raw: 'G+2P+8' },
    citation: citation('height', 'G+2P+8'),
  },
};

/** The context the envelope solver builds, reduced to what applicability reads. */
const ctx = (plotNumber: string, edgeClass?: string): Record<string, unknown> => ({
  land_use: 'RESIDENTIAL_MULTI',
  plot: { plot_number: plotNumber, area_m2: 1365.23, community: 'WARSAN FIRST' },
  ...(edgeClass ? { edge: { classification: edgeClass } } : {}),
  levels: { above_ground: 9 },
});

describe('the sheet becomes rules', () => {
  it('binds the FAR the sheet prints, not the one the draft rule assumes', () => {
    const { rules } = rulesFromInstrument(WARSAN, BINDING);
    const far = rules.find((r) => r.parameterId === 'far.max');

    expect(far).toBeDefined();
    expect(far!.evaluatorArgs['value']).toBe('3.5');
    expect(far!.citation.documentUri).toBe('IC1-CTYL-16_011-warsan1-621.pdf');
  });

  it('is plot-specific, which is the whole mechanism', () => {
    const { rules } = rulesFromInstrument(WARSAN, BINDING);
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r.jurisdiction).toBe(`PLOT:${PLOT}`);
      expect(isPlotSpecific(r)).toBe(true);
    }
  });

  it('never claims a human reviewed the transcription', () => {
    const { rules } = rulesFromInstrument(WARSAN, BINDING);
    for (const r of rules) {
      expect(r.approvedBy).toBe(INSTRUMENT_APPROVER);
      // The readiness page's own predicate, which must reject these.
      expect(r.approvedBy?.startsWith('DEVELOPMENT-ONLY') || r.approvedBy === INSTRUMENT_APPROVER).toBe(
        true,
      );
    }
  });

  it('records no period of validity rather than inventing one', () => {
    const { rules } = rulesFromInstrument(WARSAN, BINDING);
    for (const r of rules) {
      expect(r.validFrom).toBe('2024-03-11');
      expect(r.validTo).toBeNull();
      expect(r.note).toMatch(/period of\s+validity is NOT modelled/);
    }
  });
});

describe('resolution — the defect this closes', () => {
  it('the sheet governs FAR and the seed rule is named as superseded', () => {
    const { rules } = rulesFromInstrument(WARSAN, BINDING);
    const resolution = resolveParameter('far.max', [...SEED_RULES, ...rules], ctx(PLOT));

    expect(resolution.status).toBe(ResolutionStatus.RESOLVED);
    const governing = resolution.governing!;
    expect(governing.rule.jurisdiction).toBe(`PLOT:${PLOT}`);
    expect(governing.value).toEqual({ kind: 'scalar', value: new Decimal('3.5') });

    // Beaten, not absent. §11.5 step 3 requires every loser to stay visible.
    expect(resolution.superseded.length).toBe(1);
    expect(resolution.superseded[0]!.value).toEqual({ kind: 'scalar', value: new Decimal('5.00') });
  });

  it('the seed rule still answers for a plot this sheet is not about', () => {
    const { rules } = rulesFromInstrument(WARSAN, BINDING);
    const resolution = resolveParameter('far.max', [...SEED_RULES, ...rules], ctx('0000000'));

    expect(resolution.status).toBe(ResolutionStatus.RESOLVED);
    expect(resolution.governing!.value).toEqual({ kind: 'scalar', value: new Decimal('5.00') });
    expect(resolution.superseded).toEqual([]);
  });

  it('binds the road setback on road edges only', () => {
    const { rules } = rulesFromInstrument(WARSAN, BINDING);
    const all = [...SEED_RULES, ...rules];

    const onRoad = resolveParameter('setback.road', all, ctx(PLOT, 'ROAD'));
    expect(onRoad.governing!.value).toEqual({ kind: 'scalar', value: new Decimal('6') });

    const onBoundary = resolveParameter('setback.road', all, ctx(PLOT, 'ADJACENT_PLOT'));
    expect(onBoundary.status).toBe(ResolutionStatus.NOT_GOVERNED);
  });

  it('binds coverage in per cent, the unit the parameter is declared in', () => {
    const { rules } = rulesFromInstrument(WARSAN, BINDING);
    const resolution = resolveParameter('coverage.max', [...SEED_RULES, ...rules], ctx(PLOT));

    // The sheet says 0.6 of the plot; `coverage.max` is a percentage.
    expect(resolution.governing!.value).toEqual({ kind: 'scalar', value: new Decimal('60') });
  });
});

describe('what it refuses to bind', () => {
  const reasonFor = (field: string): string => {
    const { notBound } = rulesFromInstrument(WARSAN, BINDING);
    const entry = notBound.find((n) => n.field === field);
    expect(entry, `${field} should be reported as unbound`).toBeDefined();
    return entry!.reason;
  };

  it('reports the stated GFA, because no parameter carries a GFA ceiling', () => {
    expect(reasonFor('gfaSqm')).toMatch(/no gfa\.max parameter/);
    const { rules } = rulesFromInstrument(WARSAN, BINDING);
    expect(rules.some((r) => r.parameterId.startsWith('gfa'))).toBe(false);
  });

  it('reports the height, because levels are not metres', () => {
    expect(reasonFor('height')).toMatch(/floor-to-floor/);
    const { rules } = rulesFromInstrument(WARSAN, BINDING);
    expect(rules.some((r) => r.parameterId === 'height.max')).toBe(false);
  });

  it('leaves a conditional setback a decision', () => {
    const conditional: StatedLimits = {
      setbacks: {
        value: {
          podium: {
            side: {
              kind: 'CONDITIONAL',
              options: [
                { condition: 'to solid wall', metres: new Decimal('0') },
                { condition: 'to window wall', metres: new Decimal('4') },
              ],
            },
          },
          tower: {},
          raw: 'Side and rear setback is 0m to solid wall and 4.0m to window wall',
          requiresDecision: true,
        },
        citation: citation('setbacks', 'Side and rear setback is 0m to solid wall'),
      },
    };

    const { rules, notBound } = rulesFromInstrument(conditional, BINDING);
    expect(rules.some((r) => r.parameterId === 'setback.adjacent_plot')).toBe(false);
    const entry = notBound.find((n) => n.field === 'setbacks.side');
    expect(entry?.stated).toContain('to window wall');
    expect(entry?.reason).toMatch(/design decision/);
  });

  it('refuses to bind one parameter from two different distances', () => {
    const split: StatedLimits = {
      setbacks: {
        value: {
          podium: {
            side: { kind: 'FIXED', metres: new Decimal('3') },
            rear: { kind: 'FIXED', metres: new Decimal('6') },
          },
          tower: {},
          raw: 'Side 3.0m, rear 6.0m',
          requiresDecision: false,
        },
        citation: citation('setbacks', 'Side 3.0m, rear 6.0m'),
      },
    };

    const { rules, notBound } = rulesFromInstrument(split, BINDING);
    expect(rules.some((r) => r.parameterId === 'setback.adjacent_plot')).toBe(false);
    expect(notBound.find((n) => n.field === 'setbacks.side_and_rear')?.reason).toMatch(
      /one parameter over every non-road boundary/,
    );
  });

  it('says nothing at all about a limit the sheet does not print', () => {
    // `DJAZ1MED12RES011` prints G+11 and no FAR. An absent field is not an
    // unbound one: the sheet has no opinion, which is different from stating
    // something this module declined to encode.
    const silent: StatedLimits = {
      height: {
        value: { typicalFloors: 11, podiumLevels: 0, totalLevels: 12, raw: 'G+11' },
        citation: citation('height', 'G+11'),
      },
    };

    const { rules, notBound } = rulesFromInstrument(silent, BINDING);
    expect(rules).toEqual([]);
    expect(notBound.map((n) => n.field)).toEqual(['height']);
  });
});
