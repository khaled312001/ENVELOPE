/**
 * BAND A'S BASE, THE BOUNDARIES HELD TO A NEIGHBOUR'S LINE, AND THE LIMITS A
 * READER TYPES FOR A PLOT WITH NO SHEET. Every assertion is on the real pipeline.
 *
 *  1. A sheet's FAR is applied to the plot area the sheet PRINTS. Warsan 6211383
 *     entered at 40 × 30 m reported band A 4,200.0036 m² against a sheet that
 *     prints 4,778.31 m², because its ratio was multiplied by the traced outline.
 *  2. A short boundary held to its long neighbour's setback line costs footprint,
 *     and that cost is said — published, in the register, in a sentence — never
 *     silent.
 *  3. With no sheet, the seed's placeholder FAR and plate cap read ASSUMED with
 *     their reason; a FAR, GFA or storey count the reader types replaces them,
 *     USER_SET under their name, and may never replace the plot's own sheet.
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
import { analysePlot, initGeometry, toCounterClockwise, type Ring } from '@envelope/geometry';
import {
  asOfNow,
  loadSeedRulesForDevelopment,
  rulesFromInstrument,
  RuleStore,
  type InstrumentBinding,
} from '@envelope/rules';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  buildAssumptionRegister,
  EnvelopeHaltedError,
  heldBoundarySentence,
  placeholderFarBasis,
  runPipeline,
  TYPED_LIMIT_REASON,
  type RunInput,
  type StatedPlotArea,
} from '../src/index.js';

const ACK = 'I understand these rules are not approved';
const m = (v: number): Mm => asMm(Math.round(v * 1000));
const pt = (x: number, y: number) => ({ x: m(x), y: m(y) });

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

function makePlot(ring: Ring, classes: readonly Cls[], plotNumber: string): Plot {
  const g = analysePlot(ring);
  return {
    plotId: plotNumber,
    tenantId: 't1',
    plotNumber,
    community: 'TEST',
    landUse: LandUse.RESIDENTIAL_MULTI,
    ring,
    edges: ring.map((start, i) => {
      const end = ring[(i + 1) % ring.length]!;
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
    }),
    shapeClass: g.shapeClass,
    statedAreaM2: undefined,
    computedAreaMm2: g.areaMm2,
    areaMismatch: false,
    principalAxisDeg: g.principalAxisDeg,
    mbrWidthMm: g.mbr.widthMm,
    mbrDepthMm: g.mbr.depthMm,
    convexityRatio: g.convexityRatio,
    frontageCount: classes.filter((c) => c === EdgeClassification.ROAD).length,
  };
}

const seedRules = (): RunInput['rules'] =>
  new RuleStore().add(...loadSeedRulesForDevelopment(ACK)).load(asOfNow('2026-08-30'));

function baseInput(plot: Plot, rules: RunInput['rules'], over: Partial<RunInput> = {}): RunInput {
  return {
    plot,
    rules,
    actor: { id: 'u1', name: 'Test Architect' },
    parkingInFar: 'EXCLUDED_FROM_FAR',
    unitMix: { source: 'USER_SET', entries: MIX },
    parkingLevelsAvailable: 2,
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

/* ------------------------------------------------------------------------- */
/* 1. Band A on the sheet's printed area                                       */
/* ------------------------------------------------------------------------- */

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

/** Warsan 6211383's limits as intake reads them: FAR, GFA and the printed plot area. */
const WARSAN: StatedLimits = {
  far: { value: new Decimal('3.5'), citation: citation('far', 'FAR = 3.5') },
  gfaM2: { value: new Decimal('4778.31'), citation: citation('gfa', 'GFA 4778.31 m²') },
  plotAreaM2: { value: new Decimal('1365.23'), citation: citation('plot_area', 'PLOT AREA 1365.23 m²') },
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
  plotNumber: '6211383',
  instrumentId: '6211383@22-12-2025',
  issuedOn: '2025-12-22',
  authoredBy: 'test',
};

/** What the composition root hands the engine for this sheet: its area, its GFA, and whose FAR they are the base of. */
const WARSAN_AREA: StatedPlotArea = {
  farRuleId: 'INSTRUMENT.6211383@22-12-2025.far.max',
  areaM2: WARSAN.plotAreaM2!.value,
  citation: WARSAN.plotAreaM2!.citation,
  gfa: { valueM2: WARSAN.gfaM2!.value, citation: WARSAN.gfaM2!.citation },
};

const ONE_ROAD: readonly Cls[] = ['ROAD', 'ADJACENT_PLOT', 'ADJACENT_PLOT', 'ADJACENT_PLOT'];
const warsanAt = (w: number, d: number): Plot =>
  makePlot([pt(0, 0), pt(w, 0), pt(w, d), pt(0, d)], ONE_ROAD, '6211383');
const warsanRules = (): RunInput['rules'] => [...rulesFromInstrument(WARSAN, BINDING).rules, ...seedRules()];

describe('band A on the area the sheet prints', () => {
  it('reproduces the defect without the printed area: the ratio times the traced outline', () => {
    const out = runPipeline(baseInput(warsanAt(40, 30), warsanRules()));
    expect(out.capacity.regulationLimitedGfa.value.toString()).toBe('4200.0036');
    expect(out.envelope.farBasis.baseAreaM2.toString()).toBe('1200');
  });

  it('is the printed GFA on a 40 × 30 m outline, and publishes both areas and the difference', () => {
    const out = runPipeline(baseInput(warsanAt(40, 30), warsanRules(), { statedPlotAreas: [WARSAN_AREA] }));
    expect(out.capacity.regulationLimitedGfa.value.toString()).toBe('4778.31');
    const basis = out.envelope.farBasis;
    expect(basis.baseAreaM2.toString()).toBe('1365.23');
    expect(basis.tracedAreaM2.toString()).toBe('1200');
    expect(basis.stated?.differenceM2.toString()).toBe('165.23');
    expect(basis.stated?.areaM2.provenanceClass).toBe(ProvenanceClass.DERIVED);
    // Band A stays DERIVED, and its derivation reaches the printed area's own box.
    expect(out.capacity.regulationLimitedGfa.provenanceClass).toBe(ProvenanceClass.DERIVED);
    const cited = out.graph.nodes.filter((n) => n.citation?.sourceTextVerbatim === 'PLOT AREA 1365.23 m²');
    expect(cited.length).toBeGreaterThan(0);
    expect(basis.formula).toBe(
      'GFA 4778.31 m² as printed — the instrument’s own limit, its FAR 3.500003 being that GFA ÷ its printed ' +
        'plot area 1365.23 m² (the boundary as traced measures 1200.00 m², 165.23 m² less)',
    );
  });

  it('is the printed GFA on an outline entered at the sheet’s own area, too', () => {
    const out = runPipeline(baseInput(warsanAt(50.85, 26.85), warsanRules(), { statedPlotAreas: [WARSAN_AREA] }));
    expect(out.capacity.regulationLimitedGfa.value.toString()).toBe('4778.31');
    expect(out.gfaStatement.allowedGfaM2.value.toString()).toBe('4778.31');
  });

  it('measures the FAR the answer reaches on the same base, so it never exceeds the FAR it is held to', () => {
    const out = runPipeline(baseInput(warsanAt(40, 30), warsanRules(), { statedPlotAreas: [WARSAN_AREA] }));
    const governing = out.capacity.governingGfa.value;
    expect(out.capacity.achievedFar.value.toString()).toBe(governing.div('1365.23').toString());
    expect(out.capacity.achievedFar.value.lte(out.capacity.permittedFar.value)).toBe(true);
  });

  it('ignores an area offered for a FAR rule that does not govern', () => {
    const out = runPipeline(
      baseInput(warsanAt(40, 30), warsanRules(), { statedPlotAreas: [{ ...WARSAN_AREA, farRuleId: 'BRIEF.other.far.max' }] }),
    );
    expect(out.capacity.regulationLimitedGfa.value.toString()).toBe('4200.0036');
  });
});

/* ------------------------------------------------------------------------- */
/* 2. A boundary held to its neighbour's setback line                          */
/* ------------------------------------------------------------------------- */

/** DDA 5134565, six surveyed corners, placed with the first at the origin (see geometry's survey-ring test). */
const DDA_RING: Ring = toCounterClockwise(
  (
    [
      ['464118.299', '2755567.369'],
      ['464104.757', '2755591.604'],
      ['464101.832', '2755597.250'],
      ['464128.864', '2755611.388'],
      ['464129.059', '2755611.011'],
      ['464145.345', '2755582.141'],
    ] as const
  ).map(([e, n]) => ({
    x: asMm(new Decimal(e).minus('464118.299').times(1000).toNumber()) as Mm,
    y: asMm(new Decimal(n).minus('2755567.369').times(1000).toNumber()) as Mm,
  })),
);
const DDA_CLASSES: readonly Cls[] = ['ADJACENT_PLOT', 'ADJACENT_PLOT', 'ROAD', 'ADJACENT_PLOT', 'ADJACENT_PLOT', 'ADJACENT_PLOT'];
const typed = (metres: readonly number[]): NonNullable<RunInput['typedSetbacks']> =>
  metres.map((v, edgeSeq) => ({ edgeSeq, metres: new Decimal(v) }));

describe('a boundary held to its neighbour’s setback line', () => {
  const plot = makePlot(DDA_RING, DDA_CLASSES, '5134565');

  it('publishes the jog, what it is held to and the most it costs, and says it in a sentence', () => {
    const input = baseInput(plot, seedRules(), { typedSetbacks: typed([3, 0, 3, 3, 3, 3]) });
    const out = runPipeline(input);
    const held = out.envelope.heldToNeighbourLine;
    expect(held).toHaveLength(1);
    const h = held[0]!;
    expect(h.seq).toBe(1);
    expect(h.heldToSeq).toBe(0);
    expect(h.ownSetbackM.toString()).toBe('0');
    expect(h.heldAtM.toString()).toBe('3');
    expect(h.lengthM.toFixed(2)).toBe('0.42');
    // 0.424 m × 3 m, rounded up: an upper bound is never rounded down.
    expect(h.costAtMostM2.toFixed(2)).toBe('1.28');
    expect(out.envelope.droppedBoundaries).toContain(1);

    // The footprint rests on it, so it is not DERIVED; the register lists it with the sentence.
    expect(out.envelope.setbackPermittedFootprint.provenanceClass).toBe(ProvenanceClass.ASSUMED);
    const entry = buildAssumptionRegister(input, out).find(
      (e) => e.parameterId === 'envelope.held_to_neighbour_line.edge_1',
    );
    expect(entry?.basis).toBe(heldBoundarySentence(h));
    expect(entry?.basis).toBe(
      'Boundary 1 (0.42 m, set back 0 m) is held to the setback line of boundary 0 (3 m), which it almost ' +
        'continues. Where two such lines meet — a step at the corner, or the larger setback wrapping round it — ' +
        'is a drafting convention not settled for this engine, so the one reading that needs no answer is taken: ' +
        'every setback is still met, and at most 1.28 m² of tower footprint is given up.',
    );
  });

  it('holds nothing where a boundary is dropped for free', () => {
    const out = runPipeline(baseInput(plot, seedRules(), { typedSetbacks: typed([3, 3, 3, 3, 3, 3]) }));
    expect(out.envelope.droppedBoundaries).toContain(1);
    expect(out.envelope.heldToNeighbourLine).toEqual([]);
    expect(out.graph.nodes.some((n) => n.parameterId?.startsWith('envelope.held_to_neighbour_line') ?? false)).toBe(false);
  });
});

/* ------------------------------------------------------------------------- */
/* 3. No sheet: the placeholders, and what a reader types to replace them      */
/* ------------------------------------------------------------------------- */

describe('a plot with no sheet', () => {
  const plot = makePlot([pt(0, 0), pt(80, 0), pt(80, 40), pt(0, 40)], ONE_ROAD, 'NO-SHEET');

  it('reads the placeholder FAR and plate cap as ASSUMED, with the reason, and measures the FAR', () => {
    const input = baseInput(plot, seedRules());
    const out = runPipeline(input);
    expect(out.envelope.farBasis.far.provenanceClass).toBe(ProvenanceClass.ASSUMED);
    expect(out.capacity.regulationLimitedGfa.provenanceClass).toBe(ProvenanceClass.ASSUMED);
    expect(out.capacity.permittedFar.provenanceClass).toBe(ProvenanceClass.ASSUMED);
    expect(out.capacity.regulationLimitedGfa.value.toString()).toBe('16000');
    const register = buildAssumptionRegister(input, out);
    const far = register.find((e) => e.parameterId === 'envelope.far_max');
    expect(far?.basis).toBe(placeholderFarBasis(new Decimal('5'), 'R-FAR-MAX-RES'));
    // Moved ±10% the way a reader would replace it — as a typed FAR — and measured.
    expect(far?.sensitivity).not.toBeNull();
    const plate = register.find((e) => e.parameterId === 'envelope.tower_plate_max_m2');
    expect(plate?.basis).toMatch(/^1280 m² is a placeholder tower plate cap \(R-TOWER-PLATE-MAX-RES\)/);
    expect(out.envelope.towerPlateCap.provenanceClass).toBe(ProvenanceClass.ASSUMED);
  });

  it('takes a typed FAR as the reader’s, sets the placeholder aside and says why', () => {
    const out = runPipeline(baseInput(plot, seedRules(), { typedLimits: { far: new Decimal('3') } }));
    expect(out.envelope.farBasis.far.value.toString()).toBe('3');
    expect(out.envelope.farBasis.far.provenanceClass).toBe(ProvenanceClass.USER_SET);
    expect(out.envelope.farBasis.rule).toBeUndefined();
    expect(out.capacity.regulationLimitedGfa.value.toString()).toBe('9600');
    expect(out.capacity.regulationLimitedGfa.provenanceClass).toBe(ProvenanceClass.USER_SET);
    const aside = out.constraintSet.setAside?.find((s) => s.parameterId === 'far.max');
    expect(aside?.rule.ruleId).toBe('R-FAR-MAX-RES');
    expect(aside?.reason).toBe(TYPED_LIMIT_REASON);
    expect(out.graph.nodes.some((n) => n.kind === 'USER' && n.label === 'Test Architect')).toBe(true);
  });

  it('takes a typed GFA as the gross, and the lower of a typed FAR and GFA binds', () => {
    const gfa = runPipeline(baseInput(plot, seedRules(), { typedLimits: { gfaM2: new Decimal('7000') } }));
    expect(gfa.capacity.regulationLimitedGfa.value.toString()).toBe('7000');
    expect(gfa.envelope.farBasis.far.value.toString()).toBe('2.1875');
    const both = runPipeline(
      baseInput(plot, seedRules(), { typedLimits: { far: new Decimal('3'), gfaM2: new Decimal('12000') } }),
    );
    expect(both.capacity.regulationLimitedGfa.value.toString()).toBe('9600');
  });

  it('takes typed storeys as the floor count B.4.2.2 ¶6 reads, and the 45 m placeholder stops applying', () => {
    const out = runPipeline(baseInput(plot, seedRules(), { typedLimits: { maxStoreys: 8 } }));
    expect(out.envelope.maxLevelsByHeight.value).toBe(8);
    expect(out.envelope.heightCeilingM.value.toString()).toBe('48');
    expect(out.envelope.heightCeilingM.provenanceClass).toBe(ProvenanceClass.DERIVED);
    const levels = out.envelope.bindingConstraints.find((b) => b.dimension === 'levels');
    expect(levels?.label).toBe('level count typed by the reader');
    expect(levels?.ruleId).toBe('USER_SET');
    const count = out.graph.nodes.find((n) => n.parameterId === 'envelope.stated_level_count' && n.kind === 'VALUE');
    expect(count?.provenanceClass).toBe(ProvenanceClass.USER_SET);
  });

  it('refuses typed limits outside any plausible figure, in a sentence', () => {
    expect(halted(() => runPipeline(baseInput(plot, seedRules(), { typedLimits: { far: new Decimal('0') } })))).toBe(
      'a typed FAR of 0 is outside 0–30. Check the figure.',
    );
    expect(halted(() => runPipeline(baseInput(plot, seedRules(), { typedLimits: { maxStoreys: 2.5 } })))).toMatch(
      /^a typed storey count of 2.5 is not a whole number/,
    );
  });
});

describe('a typed limit never replaces the plot’s own sheet', () => {
  it('halts on a typed FAR where the sheet states one, naming the sheet’s words', () => {
    const said = halted(() =>
      runPipeline(baseInput(warsanAt(40, 30), warsanRules(), { typedLimits: { far: new Decimal('4') } })),
    );
    expect(said).toMatch(/^this plot’s own instrument states its floor area ratio \(3\.500003: "the printed GFA governs/);
    expect(said).toMatch(/a typed FAR may not replace it\. Clear the typed value\.$/);
  });

  it('halts on typed storeys that differ from the sheet’s, and accepts the same figure', () => {
    const said = halted(() =>
      runPipeline(baseInput(warsanAt(40, 30), warsanRules(), { typedLimits: { maxStoreys: 9 } })),
    );
    expect(said).toBe(
      'the affection plan states 11 level(s) above ground ("G+2P+8"), and a typed 9 may not replace it. ' +
        'Clear the typed storeys, or type 11.',
    );
    const same = runPipeline(baseInput(warsanAt(40, 30), warsanRules(), { typedLimits: { maxStoreys: 11 } }));
    expect(same.envelope.maxLevelsByHeight.value).toBe(11);
  });
});
