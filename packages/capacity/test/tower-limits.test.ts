/**
 * THE TOWER IS HELD TO THE TOWER ROW OF ITS OWN SHEET. 17 Oct 2026.
 *
 * The defect, on the plot Eng. Mohamed walked us through (Warsan, IC1-CTYL-16_011,
 * parcel 6211383). The sheet prints two schedules:
 *
 *   GF & Podium: 0m from all sides   | Tower: Front = 0m, Sides & Rear = 3m
 *   GF & Podium: 100%                | Tower: Maximum 60%
 *
 * The podium row bound the parameters the envelope cuts the TOWER with, and the
 * tower row went to `notBound`. So the tower stood on all four boundaries over
 * 100% of the plot (1,365 m² against his 625.55 m² typical floor), three levels
 * were proposed where he draws seven, and a reader who typed the sheet's own 3 m
 * was refused because "the affection plan states 0 m" — the podium's figure.
 *
 * The plot here is his: 50.85 × 26.85 m (1,365.32 m², the printed 1,365.23 to
 * the boundary's own precision), one road and three neighbours, with the sheet
 * exactly as `parseAffectionPlan` reads it and the podium statement the studio
 * sends. Every assertion is on the real pipeline.
 */

import {
  asMm,
  Decimal,
  EdgeClassification,
  LandUse,
  ProvenanceClass,
  type Citation,
  type Mm,
  type Plot,
  type StatedLimits,
  type UnitTypeMix,
} from '@envelope/core';
import { analysePlot, initGeometry, type Ring } from '@envelope/geometry';
import {
  asOfNow,
  loadSeedRulesForDevelopment,
  rulesFromInstrument,
  RuleStore,
  type InstrumentBinding,
} from '@envelope/rules';
import { beforeAll, describe, expect, it } from 'vitest';

import { EnvelopeHaltedError, runPipeline, type RunInput } from '../src/index.js';

const ACK = 'I understand these rules are not approved';
const m = (v: number): Mm => asMm(Math.round(v * 1000));
const pt = (x: number, y: number) => ({ x: m(x), y: m(y) });

/** Warsan 6211383, as the studio files it: edge 0 the road, 1–3 the neighbours. */
const RING: Ring = [pt(0, 0), pt(50.85, 0), pt(50.85, 26.85), pt(0, 26.85)];
const PLOT_NUMBER = '6211383';

const MIX: readonly UnitTypeMix[] = [
  { typeId: '1BED', label: '1 bedroom', share: new Decimal('0.5'), nsaM2: new Decimal('70') },
  { typeId: '2BED', label: '2 bedroom', share: new Decimal('0.5'), nsaM2: new Decimal('110') },
];

const PODIUM_STATEMENT = {
  statementId: 'STMT-PODIUM-SETBACK-2026-10-16',
  statedBy: 'Eng. Mohamed',
  statedOn: '2026-10-16',
  verbatim: 'ال دور ال ارضي و البوديوم و البدروم بياخدو مساحه الارض كلها مفيش setbacks',
};

beforeAll(async () => {
  await initGeometry();
});

type Cls = (typeof EdgeClassification)[keyof typeof EdgeClassification];

function makePlot(classes: readonly Cls[] = ['ROAD', 'ADJACENT_PLOT', 'ADJACENT_PLOT', 'ADJACENT_PLOT']): Plot {
  const g = analysePlot(RING);
  const edges = RING.map((start, i) => {
    const end = RING[(i + 1) % RING.length]!;
    const cls = classes[i]!;
    return {
      seq: i,
      start,
      end,
      classification: cls,
      ...(cls === EdgeClassification.ROAD ? { roadHierarchy: 'LOCAL' as const } : {}),
      lengthMm: asMm(Math.round(Math.hypot(end.x - start.x, end.y - start.y))),
      bearingDeg: new Decimal(0),
    };
  });
  return {
    plotId: 'warsan',
    tenantId: 't1',
    plotNumber: PLOT_NUMBER,
    community: 'WARSAN FIRST',
    landUse: LandUse.RESIDENTIAL_MULTI,
    ring: RING,
    edges,
    shapeClass: 'RECTILINEAR',
    statedAreaM2: new Decimal('1365.23'),
    computedAreaMm2: g.areaMm2,
    areaMismatch: false,
    principalAxisDeg: g.principalAxisDeg,
    mbrWidthMm: g.mbr.widthMm,
    mbrDepthMm: g.mbr.depthMm,
    convexityRatio: g.convexityRatio,
    frontageCount: classes.filter((c) => c === EdgeClassification.ROAD).length,
  };
}

function citation(clause: string, verbatim: string): Citation {
  return {
    instrumentId: 'AFFECTION_PLAN',
    instrumentVersion: '22-12-2025',
    clauseReference: clause,
    documentUri: 'IC1-CTYL-16_011-warsan1-621.pdf',
    sourcePage: 1,
    sourceBbox: [10, 20, 90, 30],
    sourceTextVerbatim: verbatim,
  };
}

/** The Warsan sheet, exactly as `parseAffectionPlan` returns its two schedules. */
const WARSAN: StatedLimits = {
  far: { value: new Decimal('3.5'), citation: citation('far', 'FAR = 3.5') },
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

const BINDING: InstrumentBinding = {
  plotNumber: PLOT_NUMBER,
  instrumentId: '6211383@22-12-2025',
  issuedOn: '2025-12-22',
  authoredBy: 'test',
};

const seedRules = (): RunInput['rules'] =>
  new RuleStore().add(...loadSeedRulesForDevelopment(ACK)).load(asOfNow('2026-08-30'));

function input(over: Partial<RunInput> = {}, limits: StatedLimits = WARSAN, plot = makePlot()): RunInput {
  return {
    plot,
    rules: [...seedRules(), ...rulesFromInstrument(limits, BINDING).rules],
    actor: { id: 'u1', name: 'Test Architect' },
    parkingInFar: 'EXCLUDED_FROM_FAR',
    unitMix: { source: 'USER_SET', entries: MIX },
    parkingLevelsAvailable: 3,
    saleableEfficiency: {
      value: new Decimal('0.95'),
      source: 'ASSUMED',
      basis: 'test fixture — the mid-point of the 93–97% range the developer brief states',
    },
    parkingUsableFraction: {
      value: new Decimal('0.85'),
      source: 'ASSUMED',
      basis: 'the fraction of a parking level left for bays and aisles after cores, ramps and plant.',
    },
    realismDiscount: new Decimal('1.00'),
    podiumAtBoundaryStatement: PODIUM_STATEMENT,
    ...over,
  };
}

const halted = (f: () => unknown): string => {
  try {
    f();
  } catch (e) {
    if (e instanceof EnvelopeHaltedError) return e.message;
    throw e;
  }
  throw new Error('the run was expected to halt and did not');
};

describe('Warsan 6211383: the tower inside the sheet’s tower row', () => {
  it('sets the tower back 3 m from every neighbour and 0 m from the road, citing the tower line', () => {
    const out = runPipeline(input());
    const bySeq = new Map(out.envelope.appliedSetbacks.map((a) => [a.seq, a]));
    expect(bySeq.get(0)!.valueM.toString()).toBe('0');
    for (const seq of [1, 2, 3]) {
      const a = bySeq.get(seq)!;
      expect(a.valueM.toString()).toBe('3');
      expect(a.ruleId).toBe('INSTRUMENT.6211383@22-12-2025.tower.setback.adjacent_plot');
      expect(a.traced.provenanceClass).toBe(ProvenanceClass.DERIVED);
    }
    const cited = out.graph.nodes.filter((n) => n.citation?.sourceTextVerbatim === 'Tower: Front = 0m, Sides & Rear = 3m');
    expect(cited.length).toBeGreaterThan(0);
    // The tower line itself: (50.85 − 3 − 3) × (26.85 − 3).
    expect(out.envelope.setbackPermittedFootprint.value.toFixed(4)).toBe('1069.6725');
  });

  it('keeps the podium on the whole plot, as both the sheet and the statement say', () => {
    const out = runPipeline(input());
    expect(out.envelope.podiumFootprint.value.toFixed(2)).toBe('1365.32');
  });

  it('caps the plate at 60% of the plot and names the sheet’s tower coverage as binding', () => {
    const out = runPipeline(input());
    const plotArea = new Decimal('1365.3225');
    const cap = plotArea.times('0.6');
    expect(out.envelope.towerPlateCap.value.toFixed(4)).toBe(cap.toFixed(4)); // 819.1935
    expect(out.envelope.towerPlateCap.value.lte('819.14')).toBe(false); // the printed area's 60% is 819.14: see client question
    expect(out.envelope.towerPlateCap.value.lt('1069.6725')).toBe(true);
    expect(out.envelope.towerCoverageCap?.value.toFixed(4)).toBe(cap.toFixed(4));
    expect(out.envelope.towerCoveragePct?.value.toFixed(2)).toBe('60.00');
    const binding = out.envelope.bindingConstraints.find((b) => b.dimension === 'tower_plate');
    expect(binding?.label).toBe('tower coverage cap');
    expect(binding?.ruleId).toBe('INSTRUMENT.6211383@22-12-2025.tower_coverage.max');
    // The plate ring is drawn at the capped area, not the setback line.
    const plateNode = out.graph.nodes.find((n) => n.parameterId === 'envelope.tower_coverage_cap' && n.kind === 'VALUE');
    expect(plateNode?.provenanceClass).toBe(ProvenanceClass.DERIVED);
  });

  it('no longer proposes a tower on the whole plot: more levels on a smaller plate', () => {
    const out = runPipeline(input());
    // 3.5 × 1,365.32 = 4,778.63 m² over an 819.19 m² plate needs six levels;
    // over the whole plot it needed four. His drawing: 1st + six typicals.
    expect(out.envelope.fixpoint.state.levels).toBe(6);
    expect(out.envelope.fixpoint.history.at(-1)?.note).toMatch(/plate 819\.19 m² → 6 level\(s\) needed/);
    // The regulatory band is the sheet's own, and the geometric one is the plate the sheet allows.
    expect(out.capacity.regulationLimitedGfa.value.toFixed(2)).toBe('4778.63');
    // Eleven storeys under G+2P+8, less the ground floor the three parking levels
    // are placed on (the podium is unstated, so one podium level, parked): ten
    // hold floor area. Band B counted all eleven, the parked ground floor too.
    expect(out.floorAreaLevels.value).toBe(10);
    expect(out.capacity.geometryLimitedGfa.value.toFixed(2)).toBe(new Decimal('819.1935').times(10).toFixed(2));
    // The tower line names the boundary that cuts it — a neighbour's 3 m, not the road's 0 m.
    const line = out.envelope.bindingConstraints.find((b) => b.dimension === 'tower_plate')?.runnerUp;
    expect(line?.label).toBe('tower setback line');
    expect(line?.ruleId).toBe('INSTRUMENT.6211383@22-12-2025.tower.setback.adjacent_plot');
  });

  /*
    HIS OWN TABLE, AS FAR AS THIS RUN CAN BE HELD TO IT. His drawing (client
    drawings, 5 Oct 2026 §4) builds 652.23 m² on the 1st floor and 625.55 m²
    on six typicals — 4,405.53 m² above the podium, 4,777.53 m² in all against
    the 4,778.31 m² the sheet allows. The engine draws no level-by-level plate,
    so it is not asked to equal those; it is asked not to exceed what he could
    draw, which the old run (a 1,365 m² tower) did by 74% per level.
  */
  it('holds the plate within the room his own typical floor occupies', () => {
    const out = runPipeline(input());
    const plate = out.envelope.towerPlateCap.value;
    expect(plate.gte('652.23')).toBe(true);
    expect(plate.div('625.55').lt('1.31')).toBe(true);
    // And the permitted GFA reconciles with his total inside one storey's granularity.
    expect(out.capacity.regulationLimitedGfa.value.minus('4777.53').abs().lt(plate)).toBe(true);
  });

  /*
    TYPING THE SHEET'S OWN FIGURE IS AGREEMENT, NOT A CONFLICT. It used to halt
    with "the affection plan states 0 m for this boundary" — the podium's 0.
  */
  it('accepts a typed 3 m on a side edge, and keeps the sheet’s figure DERIVED', () => {
    const out = runPipeline(input({ typedSetbacks: [{ edgeSeq: 1, metres: new Decimal('3') }] }));
    const a = out.envelope.appliedSetbacks.find((s) => s.seq === 1)!;
    expect(a.valueM.toString()).toBe('3');
    expect(a.ruleId).not.toBe('USER_SET');
    expect(a.traced.provenanceClass).toBe(ProvenanceClass.DERIVED);
  });

  it('refuses a typed 2 m on a side edge, quoting the tower figure and the tower line', () => {
    const said = halted(() => runPipeline(input({ typedSetbacks: [{ edgeSeq: 1, metres: new Decimal('2') }] })));
    expect(said).toBe(
      'edge 1: the affection plan states a tower setback of 3 m for this boundary ("Tower: Front = 0m, ' +
        'Sides & Rear = 3m"), and a typed 2 m may not replace it. Clear the typed value, or type 3 m.',
    );
    expect(said).not.toMatch(/states 0 m/);
  });
});

describe('a plot with two roads: the sheet does not say which is the front', () => {
  const twoRoads = (): Plot => makePlot(['ROAD', 'ADJACENT_PLOT', 'ROAD', 'ADJACENT_PLOT']);

  it('halts and asks, rather than taking either figure', () => {
    const said = halted(() => runPipeline(input({}, WARSAN, twoRoads())));
    expect(said).toBe(
      'edge 0: the affection plan states the tower setback by face (front 0 m; side 3 m; rear 3 m) and does ' +
        'not say which face this boundary is. Type the figure for the face it is on the plot step.',
    );
  });

  it('runs once the reader names each road’s face, and records the answers as theirs', () => {
    const out = runPipeline(
      input(
        {
          typedSetbacks: [
            { edgeSeq: 0, metres: new Decimal('0') },
            { edgeSeq: 2, metres: new Decimal('3') },
          ],
        },
        WARSAN,
        twoRoads(),
      ),
    );
    const bySeq = new Map(out.envelope.appliedSetbacks.map((a) => [a.seq, a]));
    expect(bySeq.get(0)!.valueM.toString()).toBe('0');
    expect(bySeq.get(2)!.valueM.toString()).toBe('3');
    expect(bySeq.get(2)!.traced.provenanceClass).toBe(ProvenanceClass.USER_SET);
    const label = out.graph.nodes.find((n) => n.kind === 'INPUT' && n.parameterId === 'setback.road.edge_2')?.label;
    expect(label).toMatch(/states it by face \(front 0 m; side 3 m; rear 3 m\) and the reader named the face/);
  });

  it('refuses a typed figure that is none of the faces', () => {
    const said = halted(() =>
      runPipeline(
        input(
          {
            typedSetbacks: [
              { edgeSeq: 0, metres: new Decimal('0') },
              { edgeSeq: 2, metres: new Decimal('1.5') },
            ],
          },
          WARSAN,
          twoRoads(),
        ),
      ),
    );
    expect(said).toBe(
      'edge 2: a typed tower setback of 1.5 m is none of the figures the affection plan states by face ' +
        '(front 0 m; side 3 m; rear 3 m). Type the figure for the face this boundary is.',
    );
  });
});

describe('a sheet that states only the podium row', () => {
  const podiumOnly: StatedLimits = {
    ...WARSAN,
    setbacks: {
      value: {
        podium: {
          front: { kind: 'FIXED', metres: new Decimal('2') },
          side: { kind: 'FIXED', metres: new Decimal('2') },
          rear: { kind: 'FIXED', metres: new Decimal('2') },
        },
        tower: {},
        raw: 'GF & Podium: 2m from all sides',
        requiresDecision: false,
      },
      citation: citation('setbacks', 'GF & Podium: 2m from all sides'),
    },
  };

  it('accepts a typed tower setback, because the sheet states none for the tower', () => {
    const out = runPipeline(input({ typedSetbacks: [{ edgeSeq: 1, metres: new Decimal('4') }] }, podiumOnly));
    const a = out.envelope.appliedSetbacks.find((s) => s.seq === 1)!;
    expect(a.valueM.toString()).toBe('4');
    expect(a.traced.provenanceClass).toBe(ProvenanceClass.USER_SET);
  });

  it('sets the podium back by the sheet’s podium row, and never calls it the tower’s', () => {
    const out = runPipeline(input({}, podiumOnly));
    // (50.85 − 4) × (26.85 − 4): the podium row's 2 m on every side.
    expect(out.envelope.podiumSetbackFootprint?.value.toFixed(4)).toBe('1070.5225');
    const podiumNode = out.graph.nodes.find((n) => n.parameterId === 'setback.podium.adjacent_plot.edge_1' && n.kind === 'VALUE');
    expect(podiumNode?.provenanceClass).toBe(ProvenanceClass.DERIVED);
  });

  it('refuses a typed tower setback that would put the tower outside the podium', () => {
    const said = halted(() => runPipeline(input({ typedSetbacks: [{ edgeSeq: 1, metres: new Decimal('1') }] }, podiumOnly)));
    expect(said).toBe(
      'edge 1: the affection plan sets the podium back 2 m on this boundary and the tower stands on the ' +
        'podium, so a tower setback of 1 m cannot be built. Type at least 2 m, or clear the value.',
    );
  });
});

/*
  PLOT 196 (DJAZ1TRE10RES022): "0m to street front, Side and rear setback is 0m
  to solid wall and 4.0m to window wall" for the podium, and "6m to adjacent
  plot" for the tower. The tower's 6 m now binds; the podium's façade is a
  choice the sheet leaves open, so it is ASSUMED — the solid wall the statement
  implies — in amber, with the window wall measured against it.
*/
describe('a podium the sheet sets back by façade', () => {
  const tre10: StatedLimits = {
    far: { value: new Decimal('3.5'), citation: citation('far', 'FAR = 3.5') },
    setbacks: {
      value: {
        podium: {
          front: { kind: 'FIXED', metres: new Decimal('0') },
          side: {
            kind: 'CONDITIONAL',
            options: [
              { condition: 'to solid wall', metres: new Decimal('0') },
              { condition: 'to window wall', metres: new Decimal('4') },
            ],
          },
          rear: {
            kind: 'CONDITIONAL',
            options: [
              { condition: 'to solid wall', metres: new Decimal('0') },
              { condition: 'to window wall', metres: new Decimal('4') },
            ],
          },
        },
        tower: {
          side: { kind: 'FIXED', metres: new Decimal('6') },
          rear: { kind: 'FIXED', metres: new Decimal('6') },
        },
        raw:
          'GF & Podium: 0m to street front, Side and rear setback is 0m to solid wall and 4.0m to window wall | ' +
          'Tower: 6m to adjacent plot',
        requiresDecision: true,
      },
      citation: citation('setbacks', 'GF & Podium: 0m to street front'),
    },
  };

  it('holds the tower 6 m from every neighbour, from the tower row', () => {
    const out = runPipeline(input({}, tre10));
    for (const seq of [1, 2, 3]) {
      const a = out.envelope.appliedSetbacks.find((s) => s.seq === seq)!;
      expect(a.valueM.toString()).toBe('6');
      expect(a.traced.provenanceClass).toBe(ProvenanceClass.DERIVED);
    }
  });

  it('assumes the solid wall for the podium, says so, and measures the window wall', () => {
    const out = runPipeline(input({}, tre10));
    expect(out.envelope.podiumSetbackFootprint?.value.toFixed(2)).toBe('1365.32');
    const assumption = out.graph.nodes.find(
      (n) => n.kind === 'ASSUMPTION' && n.parameterId === 'setback.podium.adjacent_plot',
    );
    expect(assumption?.label).toBe('podium setback on edges 1, 2, 3, where the affection plan leaves a choice');
    const basis = out.graph.nodes.find((n) => n.kind === 'BASIS' && /solid wall there, 0 m/.test(n.label));
    expect(basis?.label).toMatch(/A window wall would need 4 m\.$/);
    const value = out.graph.nodes.find((n) => n.kind === 'VALUE' && n.parameterId === 'setback.podium.adjacent_plot');
    const sensitive = out.graph.edges.find((e) => e.kind === 'sensitiveTo' && e.to === value?.id);
    // 4 m on the three neighbours: (50.85 − 8) × (26.85 − 4) against the whole plot, about −28%.
    expect(Number(sensitive?.attrs?.['relativeEffect'])).toBeCloseTo((42.85 * 22.85) / 1365.3225 - 1, 3);
    expect(value?.provenanceClass).toBe(ProvenanceClass.ASSUMED);
  });

  it('without the statement, assumes nothing: the open façade keeps the tower line, the street front the sheet’s 0', () => {
    const { podiumAtBoundaryStatement: _drop, ...rest } = input({}, tre10);
    const out = runPipeline(rest);
    expect(out.graph.nodes.some((n) => n.kind === 'ASSUMPTION' && n.parameterId === 'setback.podium.adjacent_plot')).toBe(false);
    // Edge 0 at the podium row's 0 m; edges 1–3 at the tower's 6 m: 38.85 × 20.85.
    expect(out.envelope.podiumSetbackFootprint?.value.toFixed(4)).toBe('810.0225');
  });
});
