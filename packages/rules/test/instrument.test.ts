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
  DecisionKind,
  decisionKindOf,
  faceOptionsOf,
  INSTRUMENT_APPROVER,
  PODIUM_SIDE_REAR_REASON,
  podiumSetbackParameter,
  rulesFromInstrument,
  TOWER_FRONT_REASON,
  TOWER_SIDE_REAR_REASON,
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

/**
 * The Warsan sheet, as `intake` reads it — the two schedules exactly as
 * `parseAffectionPlan` returns them for `IC1-CTYL-16_011-warsan1-621.pdf`.
 */
const WARSAN: StatedLimits = {
  far: { value: new Decimal('3.5'), citation: citation('far', 'FAR = 3.5') },
  gfaM2: { value: new Decimal('4778.31'), citation: citation('gfa', 'GFA=4778.31 Sq. m') },
  coverage: {
    value: { podium: new Decimal('1'), tower: new Decimal('0.6'), raw: 'GF & Podium: 100% | Tower: Maximum 60%' },
    citation: citation('plot_coverage', 'GF & Podium: 100%'),
  },
  setbacks: {
    value: {
      podium: {
        front: { kind: 'FIXED', metres: new Decimal('0') },
        side: { kind: 'FIXED', metres: new Decimal('0') },
        rear: { kind: 'FIXED', metres: new Decimal('0') },
      },
      tower: {
        front: { kind: 'FIXED', metres: new Decimal('0') },
        side: { kind: 'FIXED', metres: new Decimal('3') },
        rear: { kind: 'FIXED', metres: new Decimal('3') },
      },
      raw: 'GF & Podium: 0m from all sides | Tower: Front = 0m, Sides & Rear = 3m',
      requiresDecision: false,
    },
    citation: citation('setbacks', 'GF & Podium: 0m from all sides'),
  },
  height: {
    value: { typicalFloors: 8, podiumLevels: 2, totalLevels: 11, raw: 'G+2P+8' },
    citation: citation('height', 'G+2P+8'),
  },
};

/** The context the envelope solver builds, reduced to what applicability reads. */
const ctx = (plotNumber: string, edgeClass?: string, roads = 1): Record<string, unknown> => ({
  land_use: 'RESIDENTIAL_MULTI',
  plot: { plot_number: plotNumber, area_m2: 1365.23, community: 'WARSAN FIRST', frontage_count: roads },
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
    expect(onRoad.governing!.value).toEqual({ kind: 'scalar', value: new Decimal('0') });

    const onBoundary = resolveParameter('setback.road', all, ctx(PLOT, 'ADJACENT_PLOT'));
    expect(onBoundary.status).toBe(ResolutionStatus.NOT_GOVERNED);
  });

  it('binds coverage in per cent, the unit the parameter is declared in', () => {
    const { rules } = rulesFromInstrument(WARSAN, BINDING);
    const resolution = resolveParameter('coverage.max', [...SEED_RULES, ...rules], ctx(PLOT));

    // The sheet says 1.00 of the plot for the podium; `coverage.max` is a percentage.
    expect(resolution.governing!.value).toEqual({ kind: 'scalar', value: new Decimal('100') });
  });
});

/*
  THE TOWER ROW BINDS THE TOWER (17 Oct 2026).

  Warsan prints "GF & Podium: 0m from all sides | Tower: Front = 0m, Sides &
  Rear = 3m" and "Tower: Maximum 60%". The podium row used to bind the tower's
  parameters and the tower row went to `notBound`, so the tower stood on all four
  boundaries at 100% of the plot. These hold the two rows apart.
*/
describe('the tower row and the podium row, apart', () => {
  const all = (binding = BINDING) => [...SEED_RULES, ...rulesFromInstrument(WARSAN, binding).rules];

  it('binds the tower’s 3 m on every neighbour, not the podium’s 0 m', () => {
    const r = resolveParameter('setback.adjacent_plot', all(), ctx(PLOT, 'ADJACENT_PLOT'));
    expect(r.governing!.value).toEqual({ kind: 'scalar', value: new Decimal('3') });
    expect(r.governing!.rule.jurisdiction).toBe(`PLOT:${PLOT}`);
    // The seed's table, beaten and named.
    expect(r.superseded.length).toBeGreaterThan(0);
  });

  it('cites the tower line, not the podium line it sits under', () => {
    const r = resolveParameter('setback.adjacent_plot', all(), ctx(PLOT, 'ADJACENT_PLOT'));
    expect(r.governing!.rule.citation.sourceTextVerbatim).toBe('Tower: Front = 0m, Sides & Rear = 3m');
    expect(r.governing!.rule.citation.clauseReference).toBe('setbacks (tower)');
  });

  it('binds the podium row under its own parameter, which only the podium line reads', () => {
    for (const cls of ['ROAD', 'ADJACENT_PLOT']) {
      const r = resolveParameter(podiumSetbackParameter(cls), all(), ctx(PLOT, cls));
      expect(r.governing!.value).toEqual({ kind: 'scalar', value: new Decimal('0') });
      expect(r.governing!.rule.citation.sourceTextVerbatim).toBe('GF & Podium: 0m from all sides');
    }
  });

  it('binds the tower’s 60% as a percentage of its own, never as metres or a fixed area', () => {
    const r = resolveParameter('tower_coverage.max', all(), ctx(PLOT));
    expect(r.governing!.value).toEqual({ kind: 'scalar', value: new Decimal('60') });
    expect(r.governing!.rule.unit).toBe('%');
    expect(r.governing!.rule.citation.sourceTextVerbatim).toBe('Tower: Maximum 60%');
    // `tower_plate.max` is an area and the sheet states none.
    const { rules } = rulesFromInstrument(WARSAN, BINDING);
    expect(rules.some((x) => x.parameterId === 'tower_plate.max')).toBe(false);
  });

  it('reports neither the tower schedule nor the tower coverage as unbound any more', () => {
    const { notBound } = rulesFromInstrument(WARSAN, { ...BINDING, roadBoundaries: 1 });
    const fields = notBound.map((n) => n.field);
    expect(fields).not.toContain('setbacks.tower');
    expect(fields).not.toContain('coverage.tower');
    // One road: there is no "which road is the front?" to report.
    expect(fields).not.toContain('setbacks.tower.front');
  });

  /*
    TWO ROADS: the sheet's "Front" names one of them and does not say which. The
    front figure binds only on a one-road plot; on any other, each road gets a
    decision the reader answers.
  */
  it('asks which road is the front on a plot with two roads, rather than choosing', () => {
    const r = resolveParameter('setback.road', all(), ctx(PLOT, 'ROAD', 2));
    expect(r.status).toBe(ResolutionStatus.RESOLVED);
    expect(r.governing!.value).toEqual({ kind: 'enum', permitted: ['0', '3'] });
    expect(decisionKindOf(r.governing!.rule)).toBe(DecisionKind.FACE);
    expect(faceOptionsOf(r.governing!.rule)).toEqual([
      { face: 'front', metres: '0' },
      { face: 'side', metres: '3' },
      { face: 'rear', metres: '3' },
    ]);
    // And says so in the list of what it did not bind, when it knows the plot has two.
    const { notBound } = rulesFromInstrument(WARSAN, { ...BINDING, roadBoundaries: 2 });
    expect(notBound.find((n) => n.field === 'setbacks.tower.front')?.reason).toBe(TOWER_FRONT_REASON);
  });

  it('binds the front on every road when every face states the same figure', () => {
    const allSides: StatedLimits = {
      setbacks: {
        value: {
          podium: {},
          tower: {
            front: { kind: 'FIXED', metres: new Decimal('4') },
            side: { kind: 'FIXED', metres: new Decimal('4') },
            rear: { kind: 'FIXED', metres: new Decimal('4') },
          },
          raw: 'Tower: 4m from all sides',
          requiresDecision: false,
        },
        citation: citation('setbacks', 'Tower: 4m from all sides'),
      },
    };
    const rules = [...SEED_RULES, ...rulesFromInstrument(allSides, BINDING).rules];
    const r = resolveParameter('setback.road', rules, ctx(PLOT, 'ROAD', 2));
    expect(r.governing!.value).toEqual({ kind: 'scalar', value: new Decimal('4') });
  });

  it('asks which neighbour is the rear where the side and rear differ', () => {
    const split: StatedLimits = {
      setbacks: {
        value: {
          podium: {},
          tower: {
            side: { kind: 'FIXED', metres: new Decimal('3') },
            rear: { kind: 'FIXED', metres: new Decimal('6') },
          },
          raw: 'Tower: Side 3m, Rear 6m',
          requiresDecision: false,
        },
        citation: citation('setbacks', 'Tower: Side 3m, Rear 6m'),
      },
    };
    const built = rulesFromInstrument(split, BINDING);
    const r = resolveParameter('setback.adjacent_plot', [...SEED_RULES, ...built.rules], ctx(PLOT, 'ADJACENT_PLOT'));
    expect(r.governing!.value).toEqual({ kind: 'enum', permitted: ['3', '6'] });
    expect(built.notBound.find((n) => n.field === 'setbacks.tower.side_and_rear')?.reason).toBe(
      TOWER_SIDE_REAR_REASON,
    );
  });
});

describe('what it refuses to bind', () => {
  const reasonFor = (field: string): string => {
    const { notBound } = rulesFromInstrument(WARSAN, BINDING);
    const entry = notBound.find((n) => n.field === field);
    expect(entry, `${field} should be reported as unbound`).toBeDefined();
    return entry!.reason;
  };

  it('reports a GFA printed beside a FAR as a cross-check, not a second ceiling', () => {
    expect(reasonFor('gfaSqm')).toMatch(/prints a FAR, which binds/);
    const { rules } = rulesFromInstrument(WARSAN, BINDING);
    expect(rules.some((r) => r.parameterId.startsWith('gfa'))).toBe(false);
  });
});

/*
  DDA sheet 5134565 (SAIH SHUAIB 1) prints MAX. GFA 2,288.08 m² and PLOT AREA
  1,040.04 m², and no FAR. The study was blocked on it (Eng. Mohamed, 16 Oct
  2026): the ratio is the sheet's own two figures divided, and refusing it
  protected nothing.
*/
describe('a sheet that prints a GFA and no FAR', () => {
  const DDA_PLOT = '5134565';
  const DDA_BINDING: InstrumentBinding = { ...BINDING, plotNumber: DDA_PLOT, instrumentId: 'DDA-5134565' };
  const DDA: StatedLimits = {
    gfaM2: { value: new Decimal('2288.08'), citation: citation('MAX. GFA', '2,288.08 SQ.M') },
    plotAreaM2: { value: new Decimal('1040.04'), citation: citation('PLOT AREA', '1,040.04 SQ.M') },
  };

  it('binds far.max as the printed GFA ÷ the printed plot area, rounded down', () => {
    const { rules, notBound } = rulesFromInstrument(DDA, DDA_BINDING);
    const far = rules.find((r) => r.parameterId === 'far.max');
    expect(far?.evaluatorArgs['value']).toBe('2.199992');
    // Never above the cap it was taken from.
    expect(new Decimal('2.199992').times('1040.04').lte('2288.08')).toBe(true);
    expect(notBound.some((n) => n.field === 'gfaSqm')).toBe(false);
  });

  it('cites the GFA box and says the ratio was divided out, in words', () => {
    const { rules } = rulesFromInstrument(DDA, DDA_BINDING);
    const far = rules.find((r) => r.parameterId === 'far.max')!;
    expect(far.citation.clauseReference).toBe('MAX. GFA ÷ PLOT AREA');
    expect(far.citation.sourceTextVerbatim).toMatch(/FAR not printed/);
    expect(far.citation.sourceTextVerbatim).toMatch(/2288\.08 m² ÷ plot area 1040\.04 m²/);
  });

  it('governs resolution over the seed rule, as a printed FAR would', () => {
    const { rules } = rulesFromInstrument(DDA, DDA_BINDING);
    const resolution = resolveParameter('far.max', [...SEED_RULES, ...rules], ctx(DDA_PLOT));
    expect(resolution.governing!.value).toEqual({ kind: 'scalar', value: new Decimal('2.199992') });
  });

  it('a printed FAR still wins over the quotient', () => {
    const both: StatedLimits = { ...DDA, far: { value: new Decimal('2.5'), citation: citation('far', 'FAR 2.5') } };
    const far = rulesFromInstrument(both, DDA_BINDING).rules.filter((r) => r.parameterId === 'far.max');
    expect(far).toHaveLength(1);
    expect(far[0]!.evaluatorArgs['value']).toBe('2.5');
  });

  it('a GFA with no plot area binds nothing and says why', () => {
    const { rules, notBound } = rulesFromInstrument({ gfaM2: DDA.gfaM2! }, DDA_BINDING);
    expect(rules.some((r) => r.parameterId === 'far.max')).toBe(false);
    expect(notBound.find((n) => n.field === 'gfaSqm')?.reason).toMatch(/no plot area/);
  });
});

describe('what it refuses to bind, continued', () => {

  /*
    THE LEVEL COUNT BINDS, AS A COUNT. This test used to assert the opposite —
    that `G+2P+8` bound nothing because levels are not metres — and that is how a
    plan printing `G+4` came to report thirteen levels (meeting 03, 41:11). The
    half of the old assertion that was right is kept: no metres are manufactured.
  */
  it('binds the stated level count as a count, and never as metres', () => {
    const { rules, notBound } = rulesFromInstrument(WARSAN, BINDING);
    const levels = rules.find((r) => r.parameterId === 'levels.max_above_ground');
    expect(levels?.evaluatorArgs).toEqual({ value: '11' });
    expect(levels?.unit).toBe('levels');
    expect(rules.some((r) => r.parameterId === 'height.max')).toBe(false);
    expect(notBound.some((n) => n.field === 'height')).toBe(false);
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
    // Bound as a façade decision under the podium's own parameter, never as one number.
    const podium = rules.find((r) => r.parameterId === podiumSetbackParameter('ADJACENT_PLOT'));
    expect(podium && decisionKindOf(podium)).toBe(DecisionKind.FACADE);
    expect(podium && faceOptionsOf(podium)).toEqual([
      { face: 'side to solid wall', metres: '0' },
      { face: 'side to window wall', metres: '4' },
    ]);
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
    expect(notBound.find((n) => n.field === 'setbacks.side_and_rear')?.reason).toBe(PODIUM_SIDE_REAR_REASON);
    const podium = rules.find((r) => r.parameterId === podiumSetbackParameter('ADJACENT_PLOT'));
    expect(podium && decisionKindOf(podium)).toBe(DecisionKind.FACE);
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
    // The one thing it prints binds; nothing it omits is invented.
    expect(rules.map((r) => r.parameterId)).toEqual(['levels.max_above_ground']);
    expect(notBound).toEqual([]);
  });
});
