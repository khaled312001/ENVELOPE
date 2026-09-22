/**
 * End-to-end pipeline: plot → rules → envelope → parking → bands.
 *
 * The tests that matter most here are the ones about refusal. An engine that
 * computes a plausible number when it should have stopped is worse than one
 * that computes nothing, because the number reaches a pro forma and the refusal
 * would have reached a person.
 */

import {
  asMm,
  Decimal,
  EdgeClassification,
  LandUse,
  type Mm,
  type NodeId,
  type Plot,
  ProvenanceClass,
  type UnitTypeMix,
} from '@envelope/core';
import { analysePlot, initGeometry, type Ring } from '@envelope/geometry';
import { asOfNow, loadSeedRulesForDevelopment, RuleStore } from '@envelope/rules';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  buildAssumptionRegister,
  compareParkingInFar,
  explainGoverningBand,
  RunBlockedError,
  runPipeline,
  type RunInput,
} from '../src/index.js';

const ACK = 'I understand these rules are not approved';
const m = (v: number): Mm => asMm(Math.round(v * 1000));
const pt = (x: number, y: number) => ({ x: m(x), y: m(y) });
const PLOT: Ring = [pt(0, 0), pt(80, 0), pt(80, 40), pt(0, 40)];

const MIX: readonly UnitTypeMix[] = [
  { typeId: '1BED', label: '1 bedroom', share: new Decimal('0.5'), nsaM2: new Decimal('70') },
  { typeId: '2BED', label: '2 bedroom', share: new Decimal('0.375'), nsaM2: new Decimal('110') },
  { typeId: '3BED', label: '3 bedroom', share: new Decimal('0.125'), nsaM2: new Decimal('160') },
];

function makePlot(): Plot {
  const g = analysePlot(PLOT);
  const classifications = [
    EdgeClassification.ROAD,
    EdgeClassification.ADJACENT_PLOT,
    EdgeClassification.ROAD,
    EdgeClassification.ADJACENT_PLOT,
  ];
  const edges = PLOT.map((start, i) => {
    const end = PLOT[(i + 1) % PLOT.length]!;
    const cls = classifications[i]!;
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
    plotId: 'p1',
    tenantId: 't1',
    plotNumber: '345-1234',
    community: 'TEST',
    landUse: LandUse.RESIDENTIAL_MULTI,
    ring: PLOT,
    edges,
    shapeClass: 'RECTILINEAR',
    statedAreaM2: new Decimal('3200'),
    computedAreaMm2: g.areaMm2,
    areaMismatch: false,
    principalAxisDeg: g.principalAxisDeg,
    mbrWidthMm: g.mbr.widthMm,
    mbrDepthMm: g.mbr.depthMm,
    convexityRatio: g.convexityRatio,
    frontageCount: 2,
  };
}

function baseInput(overrides: Partial<RunInput> = {}): RunInput {
  const store = new RuleStore().add(...loadSeedRulesForDevelopment(ACK));
  return {
    plot: makePlot(),
    rules: store.load(asOfNow('2026-08-30')),
    actor: { id: 'u1', name: 'Test Architect' },
    parkingInFar: 'EXCLUDED_FROM_FAR',
    unitMix: { source: 'USER_SET', entries: MIX },
    parkingLevelsAvailable: 2,
    /*
      1.00 here, stated rather than assumed.

      Most of these tests are about something else — the fixpoint, the bands,
      the parking ceiling — and an efficiency of 1 keeps GFA and saleable area
      equal so those assertions read directly. That is a fixture choice and it
      is written down, which is the whole difference from what the engine used
      to do: it took 1.00 implicitly, everywhere, and nobody could see it.
      `saleable efficiency` below exercises a real one.
    */
    saleableEfficiency: {
      value: new Decimal('1'),
      source: 'USER_SET',
      basis: 'test fixture — GFA and saleable area held equal to isolate other variables',
    },
    parkingUsableFraction: {
      value: new Decimal('0.85'),
      source: 'ASSUMED',
      basis:
        'the fraction of a parking level left for bays and aisles after cores, ' +
        'ramps and plant. No cited rule fixes it.',
    },
    realismDiscount: new Decimal('1.00'),
    ...overrides,
  };
}

beforeAll(async () => {
  await initGeometry();
});

describe('the pipeline refuses before it guesses', () => {
  it('blocks while parking-in-FAR is an open regulatory question — FR-DEF-002', () => {
    expect(() => runPipeline(baseInput({ parkingInFar: 'OPEN_REGULATORY_QUESTION' }))).toThrow(
      RunBlockedError,
    );
    expect(() => runPipeline(baseInput({ parkingInFar: 'OPEN_REGULATORY_QUESTION' }))).toThrow(
      /15–35%/,
    );
  });

  it('refuses an ASSUMED unit mix with no basis', () => {
    expect(() =>
      runPipeline(baseInput({ unitMix: { source: 'ASSUMED', entries: MIX } })),
    ).toThrow(/you have a guess/);
  });

  it('refuses a unit mix whose shares do not sum to 1.000 — INV-05 upstream', () => {
    const broken = MIX.map((e, i) => (i === 0 ? { ...e, share: new Decimal('0.9') } : e));
    expect(() =>
      runPipeline(baseInput({ unitMix: { source: 'USER_SET', entries: broken } })),
    ).toThrow(/sum to/);
  });

  it('refuses an empty unit mix rather than treating it as zero demand', () => {
    expect(() =>
      runPipeline(baseInput({ unitMix: { source: 'USER_SET', entries: [] } })),
    ).toThrow(/no unit mix supplied/);
  });
});

describe('a complete run', () => {
  it('produces three bands, names the governing one, and reports headroom', () => {
    const out = runPipeline(baseInput());

    expect(out.capacity.regulationLimitedGfa.value.gt(0)).toBe(true);
    expect(out.capacity.geometryLimitedGfa.value.gt(0)).toBe(true);
    expect(out.capacity.parkingLimitedGfa.value.gte(0)).toBe(true);

    const bands = [
      out.capacity.regulationLimitedGfa.value,
      out.capacity.geometryLimitedGfa.value,
      out.capacity.parkingLimitedGfa.value,
    ];
    const smallest = bands.reduce((a, b) => (a.lt(b) ? a : b));
    // §15.2: governing = min(A, B, C). Not an average, not the maximum.
    expect(out.capacity.governingGfa.value.toString()).toBe(smallest.toString());
    expect(out.capacity.governingConstraint.ruleId).toBeTruthy();
    expect(out.capacity.headroomToNextM2.gte(0)).toBe(true);
  });

  it('has no field for a realistic or expected band — §15.3', () => {
    const out = runPipeline(baseInput());
    const keys = Object.keys(out.capacity);
    expect(keys).not.toContain('realisticGfa');
    expect(keys).not.toContain('expectedGfa');
    expect(keys).not.toContain('likelyGfa');
    // The honest substitute exists, defaults to 1.00, and is USER_SET.
    expect(out.capacity.userRealismDiscount.value.toString()).toBe('1');
    expect(out.capacity.userRealismDiscount.provenanceClass).toBe(ProvenanceClass.USER_SET);
  });

  it('reports integer granularity loss rather than absorbing it — §15.4', () => {
    const out = runPipeline(baseInput());
    expect(out.capacity.integerGranularityLossM2.gte(0)).toBe(true);
  });

  it('every emitted value has a provenance class — M-PRV, 100%', () => {
    const out = runPipeline(baseInput());
    const values = out.graph.nodes.filter((n) => n.kind === 'VALUE');
    expect(values.length).toBeGreaterThan(15);
    expect(values.every((n) => n.provenanceClass !== undefined)).toBe(true);
  });

  it('is a pure function — the same input twice gives the same graph', () => {
    const input = baseInput();
    const a = runPipeline(input);
    const b = runPipeline(input);
    expect(a.capacity.governingGfa.value.toString()).toBe(b.capacity.governingGfa.value.toString());
    // Node ids are deterministic, which is what M-RUN (§13.4) rests on.
    expect(JSON.stringify(a.graph.toJSON())).toBe(JSON.stringify(b.graph.toJSON()));
  });

  it('explains the governing band in words a development director can act on', () => {
    const out = runPipeline(baseInput());
    const text = explainGoverningBand(out.capacity);
    expect(text.length).toBeGreaterThan(60);
    expect(text).toMatch(/limits this plot/);
  });
});

describe('parking-in-FAR — the question worth 15–35%', () => {
  it('the treatment always moves regulatory capacity — FR-DEF-002 AC4', () => {
    const cmp = compareParkingInFar(baseInput());
    expect(cmp.countsTowardFar).not.toBeInstanceOf(Error);
    expect(cmp.excludedFromFar).not.toBeInstanceOf(Error);
    // Band A is what the treatment acts on directly. A zero spread here would
    // mean the declared treatment had been applied nowhere in the pipeline —
    // which would quietly turn the product's most important open question into
    // one that does not matter.
    expect(cmp.regulatorySpreadM2!.gt(0)).toBe(true);
  });

  it('says plainly when the treatment does not change the decision', () => {
    // On this plot another band binds below both treatments, so regulatory
    // capacity moves and the governing capacity does not. That is a real and
    // useful finding — it says the blocking question is not worth waiting for
    // *here* — and reporting only one spread would hide it either way.
    const cmp = compareParkingInFar(baseInput());
    expect(cmp.spreadM2).not.toBeNull();
    if (cmp.spreadM2!.isZero()) {
      expect(cmp.verdict).toMatch(/does not change the answer/);
      expect(cmp.verdict).toMatch(/binds below both treatments/);
    } else {
      expect(cmp.verdict).toMatch(/must be settled/);
    }
  });

  it('records the treatment on Band A so INV-18 can check the composition', () => {
    const out = runPipeline(baseInput({ parkingInFar: 'COUNTS_TOWARD_FAR' }));
    const node = out.graph.node(out.capacity.regulationLimitedGfa.node);
    const computation = out.graph.outgoing(node.id)[0];
    expect(computation).toBeTruthy();
    const formula = out.graph.node(computation!.to).formula ?? '';
    expect(formula).toContain('parking counts toward FAR');
  });
});

describe('assumption register — FR-ASM-001', () => {
  it('lists every ASSUMED value with its basis', () => {
    const input = baseInput();
    const register = buildAssumptionRegister(input, runPipeline(input));
    expect(register.length).toBeGreaterThan(0);
    for (const entry of register) {
      expect(entry.provenanceClass).toBe(ProvenanceClass.ASSUMED);
      expect(entry.basis).not.toContain('no basis recorded');
      expect(entry.basis.length).toBeGreaterThan(20);
    }
  });

  it('shows what was assumed, not how JavaScript prints an object', () => {
    // The unit mix is an array of entries, and every register used to open on
    // "[object Object],[object Object],[object Object]" — the assumption that moves
    // the answer most, printed as nothing a reader could check.
    const input = baseInput({
      unitMix: { source: 'ASSUMED', entries: MIX, basis: 'a generic mix, for this test only' },
    });
    const register = buildAssumptionRegister(input, runPipeline(input));
    const mix = register.find((e) => e.parameterId === 'parking.unit_mix');
    expect(mix, 'no unit mix in the register').toBeDefined();
    for (const entry of register) expect(entry.value).not.toContain('[object Object]');
    for (const e of MIX) {
      expect(mix!.value).toContain(e.typeId);
      expect(mix!.value).toContain(e.share.toString());
    }
  });

  it('ranks by measured effect on governing capacity, ±10%', () => {
    const input = baseInput();
    const register = buildAssumptionRegister(input, runPipeline(input));
    const measured = register.filter((e) => e.sensitivity !== null);
    expect(measured.length).toBeGreaterThan(0);
    for (const e of measured) {
      expect(e.sensitivity!.perturbation).toBe('±10%');
    }
    // Descending by effect.
    const effects = measured.map((e) => Number(e.sensitivity!.relativeEffect));
    expect([...effects].sort((a, b) => b - a)).toEqual(effects);
  });

  it('lists every root assumption, and no consumer of one', () => {
    const input = baseInput();
    const out = runPipeline(input);
    const register = buildAssumptionRegister(input, out);

    const assumedValues = out.graph.nodes.filter(
      (n) => n.kind === 'VALUE' && n.provenanceClass === ProvenanceClass.ASSUMED,
    );
    const rootAssumptions = assumedValues.filter((n) =>
      out.graph.outgoing(n.id).some((e) => out.graph.node(e.to).kind === 'ASSUMPTION'),
    );

    // Every root assumption is in the register — none may be silently dropped.
    expect(register.length).toBe(rootAssumptions.length);
    expect(register.length).toBeGreaterThan(0);

    // And there are strictly more ASSUMED values than register rows, because
    // class propagates: anything computed from an assumption is itself assumed.
    // Those are consumers, not assumptions, and putting them in the register
    // would bury the rows a user can actually act on.
    expect(assumedValues.length).toBeGreaterThan(register.length);
  });

  it('a consumer of an assumption still traces back to it — §13.3', () => {
    const input = baseInput();
    const out = runPipeline(input);
    const consumers = out.graph.nodes.filter(
      (n) =>
        n.kind === 'VALUE' &&
        n.provenanceClass === ProvenanceClass.ASSUMED &&
        !out.graph.outgoing(n.id).some((e) => out.graph.node(e.to).kind === 'ASSUMPTION'),
    );
    expect(consumers.length).toBeGreaterThan(0);
    // §13.3 is a CI-asserted invariant on provenance: an ASSUMED value must
    // reach an assumption in its derivation path. Excluding consumers from the
    // register must not break that.
    for (const c of consumers) {
      expect(out.graph.hasKindBelow(c.id, 'ASSUMPTION')).toBe(true);
    }
  });

});

describe('§13.3 — every DERIVED value reaches a cited rule', () => {
  it('holds for every traced value the API publishes', () => {
    const out = runPipeline(baseInput());
    const derived: [string, { node: NodeId; provenanceClass: string }][] = [
      ['envelope.setbackPermittedFootprint', out.envelope.setbackPermittedFootprint],
      ['envelope.coverageCap', out.envelope.coverageCap],
      ['envelope.podiumFootprint', out.envelope.podiumFootprint],
      ['envelope.towerPlateCap', out.envelope.towerPlateCap],
      ['envelope.heightCeilingM', out.envelope.heightCeilingM],
      ['envelope.floorToFloorM', out.envelope.floorToFloorM],
      ['envelope.maxLevelsByHeight', out.envelope.maxLevelsByHeight],
      ['capacity.bandA', out.capacity.regulationLimitedGfa],
      ['capacity.bandB', out.capacity.geometryLimitedGfa],
      ['capacity.bandC', out.capacity.parkingLimitedGfa],
      ['capacity.governingGfa', out.capacity.governingGfa],
      ['capacity.levels', out.capacity.levels],
      ['capacity.achievedFar', out.capacity.achievedFar],
      ['capacity.achievedCoveragePct', out.capacity.achievedCoveragePct],
      ['capacity.achievedHeightM', out.capacity.achievedHeightM],
      ['capacity.permittedFar', out.capacity.permittedFar],
      ['parking.residentBays', out.parking.residentBays],
      ['parking.visitorBays', out.parking.visitorBays],
      ['parking.achievedVisitorFraction', out.parking.achievedVisitorFraction],
    ];

    for (const [label, traced] of derived) {
      if (traced.provenanceClass !== 'DERIVED') continue;
      expect(out.graph.hasKindBelow(traced.node, 'RULE'), `${label} reaches no RULE`).toBe(true);
      expect(
        out.graph.hasKindBelow(traced.node, 'SOURCE_CLAUSE'),
        `${label} reaches no SOURCE_CLAUSE`,
      ).toBe(true);
    }
  });

  it('lets the footprint name the setback that produced each edge', () => {
    const out = runPipeline(baseInput());
    // The click-through §20.2 calls "the interaction that converts a sceptical
    // architect": footprint → this edge's setback → the clause that set it.
    const footprint = out.envelope.setbackPermittedFootprint.node;
    expect(out.graph.hasKindBelow(footprint, 'RULE')).toBe(true);
    for (const applied of out.envelope.appliedSetbacks) {
      expect(out.graph.hasKindBelow(applied.traced.node, 'SOURCE_CLAUSE')).toBe(true);
      expect(applied.parameterId).toMatch(/^setback\./);
    }
  });
});

/**
 * Saleable efficiency — the hidden default that was not written down.
 *
 * The engine computed units as `GFA ÷ saleable-area-per-unit`, which holds only
 * if every square metre of GFA is saleable. Cores, corridors, structure, plant
 * and amenity are all inside GFA and none of them sells, so the count came out
 * high on every run. It survived for as long as it did precisely because it was
 * implicit: there was no `1.00` anywhere to argue with.
 */
describe('saleable efficiency', () => {
  /** Same envelope, efficiency varied, parking relieved so regulation governs. */
  const unitsAt = (value: string, levels = 12): number =>
    runPipeline(
      baseInput({
        parkingLevelsAvailable: levels,
        saleableEfficiency: {
          value: new Decimal(value),
          source: 'USER_SET',
          basis: 'test — the saleable share of GFA, varied to measure its effect',
        },
      }),
    ).governingUnitCount.value;

  it('reports fewer units at 93% than at 100% when regulation governs', () => {
    const full = unitsAt('1');
    const real = unitsAt('0.93');
    expect(real).toBeLessThan(full);
    // Roughly 7% fewer, which is the size of the error the implicit 1.00 made.
    expect(real).toBeGreaterThan(Math.floor(full * 0.9));
  });

  it('leaves the unit count alone when parking governs, because parking set it', () => {
    /*
      Not a bug, and worth pinning down so nobody "fixes" it.

      On a parking-governed plot the unit count comes from the bays, not from the
      GFA — Band C is `supportable units × GFA per unit`, and the governing unit
      count divides that same GFA back by the same factor. The efficiency
      cancels. What it does move is Band C itself: at a lower efficiency the same
      units consume *more* GFA, so the parking-limited band rises and can stop
      being the one that binds.
    */
    expect(unitsAt('0.93', 2)).toBe(unitsAt('1', 2));

    const bandCAt = (value: string): Decimal =>
      runPipeline(
        baseInput({
          parkingLevelsAvailable: 2,
          saleableEfficiency: {
            value: new Decimal(value),
            source: 'USER_SET',
            basis: 'test — the saleable share of GFA, varied to measure its effect',
          },
        }),
      ).capacity.parkingLimitedGfa.value;

    expect(bandCAt('0.93').gt(bandCAt('1'))).toBe(true);
  });

  it('carries the efficiency into the derivation of the unit count', () => {
    const out = runPipeline(baseInput());
    const node = out.graph
      .toJSON()
      .nodes.find((n) => n.parameterId === 'capacity.gfa_per_unit_m2');
    expect(node).toBeDefined();
    // The formula names both operands, so a reader can redo the division.
    const computation = out.graph
      .toJSON()
      .nodes.find((n) => (n.formula ?? '').includes('saleable per m² of GFA'));
    expect(computation).toBeDefined();
  });

  it('refuses an efficiency above 1 rather than reporting a building that oversells', () => {
    expect(() =>
      runPipeline(
        baseInput({
          saleableEfficiency: {
            value: new Decimal('1.2'),
            source: 'USER_SET',
            basis: 'test — impossible, and it should be refused rather than clamped',
          },
        }),
      ),
    ).toThrow(/sells more area than it has/);
  });

  it('is USER_SET in the graph, never engine-estimated', () => {
    const out = runPipeline(baseInput());
    const node = out.graph
      .toJSON()
      .nodes.find(
        (n) => n.parameterId === 'capacity.saleable_efficiency' && n.provenanceClass,
      );
    expect(node?.provenanceClass).toBe('USER_SET');
  });
});
