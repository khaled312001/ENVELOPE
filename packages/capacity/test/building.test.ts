/**
 * The building model — Phase 2's acceptance test.
 *
 * "Every element reaches a traced value, and no derived value lacks a source
 * rule." The model is what three drawings will read; an element here without a
 * node behind it would be drawn three times, convincingly, from nothing.
 */

import {
  asMm,
  type BuildingModel,
  Decimal,
  EdgeClassification,
  LandUse,
  type Mm,
  type NodeId,
  type Plot,
  Tracer,
  type UnitTypeMix,
} from '@envelope/core';
import { analysePlot, area, initGeometry, type Ring } from '@envelope/geometry';
import { asOfNow, loadSeedRulesForDevelopment, RuleStore } from '@envelope/rules';
import { beforeAll, describe, expect, it } from 'vitest';

import { buildBuildingModel, runPipeline, type RunInput, type RunOutput } from '../src/index.js';

const ACK = 'I understand these rules are not approved';
const m = (v: number): Mm => asMm(Math.round(v * 1000));
const pt = (x: number, y: number) => ({ x: m(x), y: m(y) });

const MIX: readonly UnitTypeMix[] = [
  { typeId: '1BED', label: '1 bedroom', share: new Decimal('0.5'), nsaM2: new Decimal('70') },
  { typeId: '2BED', label: '2 bedroom', share: new Decimal('0.5'), nsaM2: new Decimal('110') },
];

function plotOf(ring: Ring): Plot {
  const g = analysePlot(ring);
  const classes = [
    EdgeClassification.ROAD,
    EdgeClassification.ADJACENT_PLOT,
    EdgeClassification.ROAD,
    EdgeClassification.ADJACENT_PLOT,
  ];
  return {
    plotId: 'p1',
    tenantId: 't1',
    plotNumber: '345-1234',
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
    shapeClass: 'RECTILINEAR',
    statedAreaM2: undefined,
    computedAreaMm2: g.areaMm2,
    areaMismatch: false,
    principalAxisDeg: g.principalAxisDeg,
    mbrWidthMm: g.mbr.widthMm,
    mbrDepthMm: g.mbr.depthMm,
    convexityRatio: g.convexityRatio,
    frontageCount: 2,
  };
}

const RECT_80x40: Ring = [pt(0, 0), pt(80, 0), pt(80, 40), pt(0, 40)];
/** Large enough that 60% coverage binds below the setback line. */
const RECT_120x80: Ring = [pt(0, 0), pt(120, 0), pt(120, 80), pt(0, 80)];
/** Narrow enough that the setbacks leave less than 60% of it. */
const RECT_60x30: Ring = [pt(0, 0), pt(60, 0), pt(60, 30), pt(0, 30)];

function input(ring: Ring, overrides: Partial<RunInput> = {}): RunInput {
  return {
    plot: plotOf(ring),
    rules: new RuleStore().add(...loadSeedRulesForDevelopment(ACK)).load(asOfNow('2026-08-30')),
    actor: { id: 'u1', name: 'Test Architect' },
    parkingInFar: 'EXCLUDED_FROM_FAR',
    unitMix: { source: 'USER_SET', entries: MIX },
    parkingLevelsAvailable: 2,
    saleableEfficiency: { value: new Decimal('0.95'), source: 'USER_SET' },
    parkingUsableFraction: {
      value: new Decimal('0.85'),
      source: 'ASSUMED',
      basis: 'test fixture: the share of a parking level left for bays and aisles',
    },
    realismDiscount: new Decimal('1.00'),
    ...overrides,
  };
}

/** Every `{ node, provenanceClass }` in the model, wherever it sits. */
function sources(model: BuildingModel): { node: NodeId; provenanceClass: string; at: string }[] {
  const found: { node: NodeId; provenanceClass: string; at: string }[] = [];
  const walk = (v: unknown, at: string): void => {
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${at}[${i}]`));
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if (typeof o['node'] === 'string' && typeof o['provenanceClass'] === 'string') {
        found.push({ node: o['node'] as NodeId, provenanceClass: o['provenanceClass'] as string, at });
      }
      for (const [k, x] of Object.entries(o)) walk(x, `${at}.${k}`);
    }
  };
  walk(model, 'model');
  return found;
}

beforeAll(async () => {
  await initGeometry();
});

describe('every element of the model reaches the graph', () => {
  it('names a node that exists, with the class that node carries', () => {
    const out = runPipeline(input(RECT_80x40));
    const refs = sources(out.building);
    expect(refs.length).toBeGreaterThan(10);
    for (const ref of refs) {
      const node = out.graph.node(ref.node);
      expect({ at: ref.at, cls: node.provenanceClass }).toEqual({
        at: ref.at,
        cls: ref.provenanceClass,
      });
    }
  });

  it('has no DERIVED element whose derivation does not reach a cited rule', () => {
    const out = runPipeline(input(RECT_80x40));
    for (const ref of sources(out.building).filter((r) => r.provenanceClass === 'DERIVED')) {
      const tree = JSON.stringify(out.graph.derivationOf(ref.node));
      expect({ at: ref.at, cites: tree.includes('"SOURCE_CLAUSE"') }).toEqual({ at: ref.at, cites: true });
    }
  });

  it('is plain JSON, so the API can send it as it is', () => {
    const { building } = runPipeline(input(RECT_80x40));
    expect(JSON.parse(JSON.stringify(building))).toEqual(building);
  });

  it('is the same model for the same run', () => {
    const a = runPipeline(input(RECT_80x40)).building;
    const b = runPipeline(input(RECT_80x40)).building;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('the stack', () => {
  let out: RunOutput;
  beforeAll(() => {
    out = runPipeline(input(RECT_80x40, { podiumLevels: 2 }));
  });

  it('runs bottom to top with no gap and no overlap between levels', () => {
    const levels = out.building.levels;
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i]!.elevationMm).toBe(levels[i - 1]!.elevationMm + levels[i - 1]!.heightMm);
    }
    expect(levels.filter((l) => l.elevationMm >= 0)).toHaveLength(out.envelope.maxLevelsByHeight.value);
  });

  it('quotes each elevation as a traced figure that agrees with the geometry', () => {
    for (const level of out.building.levels) {
      expect(new Decimal(level.elevationM.value).times(1000).toNumber()).toBe(level.elevationMm);
    }
  });

  it('puts the declared parking levels in the podium, from the ground up', () => {
    const parking = out.building.levels.filter((l) => l.parking);
    expect(parking.map((l) => l.id)).toEqual(['L00', 'L01']);
    expect(out.building.levels.find((l) => l.id === 'L02')!.use).toBe('TYPICAL');
    const placement = out.building.placements.find((p) => p.subject === 'parking levels');
    expect(placement?.source.provenanceClass).toBe('ASSUMED');
  });

  it("places the answer's own levels and no more: capacity.levels above the parking", () => {
    const above = out.building.levels.filter((l) => l.parking === null && l.elevationMm >= 0);
    const answer = out.capacity.levels.value;
    // The case this exists for: the ceiling permits more than the answer uses.
    expect(above.length).toBeGreaterThan(answer);
    expect(above.filter((l) => l.placed).length).toBe(answer);
    expect(out.building.placedLevels.node).toBe(out.capacity.levels.node);
    expect(out.building.placedLevels.value).toBe(String(answer));
  });

  it('places every parking level, and never a level above one it leaves out', () => {
    const levels = out.building.levels;
    expect(levels.filter((l) => l.parking).every((l) => l.placed)).toBe(true);
    const firstGap = levels.findIndex((l) => !l.placed);
    expect(firstGap).toBeGreaterThan(0);
    expect(levels.slice(firstGap).some((l) => l.placed)).toBe(false);
  });

  it('says so in words, citing the answer rather than an assumption', () => {
    const answer = out.building.placements.find((p) => p.subject === 'answer')!;
    expect(answer.source.node).toBe(out.capacity.levels.node);
    expect(answer.source.provenanceClass).not.toBe('ASSUMED');
    const unused = out.building.levels.filter((l) => !l.placed).length;
    expect(answer.statement).toContain(`places ${out.capacity.levels.value} level`);
    expect(answer.statement).toContain(`The ${unused} above them`);
  });

  it('says, rather than draws, an answer that the ceiling cannot hold above its parking', () => {
    // Asked of the builder directly: no seed-rule plot reaches it, and the sentence
    // is the one a reader would most need if one did.
    // A run of its own: the builder adds nodes to the run's graph.
    const run = runPipeline(input(RECT_80x40, { podiumLevels: 2 }));
    const tracer = new Tracer(run.graph);
    const actor = { id: 'u1', name: 'Test Architect' };
    const ceiling = run.envelope.maxLevelsByHeight.value;
    const model = buildBuildingModel({
      tracer,
      plot: plotOf(RECT_80x40),
      envelope: run.envelope,
      massing: run.massing,
      parkingLevels: tracer.userSet('test.parking_levels', 2, { actor, unit: 'levels' }),
      levelPlan: run.levelPlan,
      levelPlanRefusal: run.levelPlanRefusal,
      answerLevels: tracer.userSet('test.answer_levels', ceiling, { actor, unit: 'levels' }),
    });
    const above = model.levels.filter((l) => l.elevationMm >= 0);
    expect(above.every((l) => l.placed)).toBe(true);
    expect(above).toHaveLength(ceiling);
    const answer = model.placements.find((p) => p.subject === 'answer')!;
    expect(answer.statement).toContain('2 of the answer\'s levels do not fit under the height ceiling');
  });

  it('sends parking the podium cannot hold below grade', () => {
    const deep = runPipeline(input(RECT_80x40, { podiumLevels: 1, parkingLevelsAvailable: 3 }));
    const parking = deep.building.levels.filter((l) => l.parking);
    expect(parking.map((l) => l.id)).toEqual(['B2', 'B1', 'L00']);
    expect(parking.map((l) => l.elevationMm < 0)).toEqual([true, true, false]);
  });
});

describe('the parking the sheets will draw', () => {
  it('draws the laid-out count on every parking level, and totals it once', () => {
    const out = runPipeline(input(RECT_80x40, { podiumLevels: 2 }));
    const perLevel = out.levelPlan!.bayCount.value;
    const drawn = out.building.levels.filter((l) => l.parking).map((l) => l.parking!.bays.length);
    expect(drawn).toEqual([perLevel, perLevel]);
    expect(Number(out.building.drawnBays.value)).toBe(perLevel * 2);
  });

  it('numbers the bays 1 to n on each level', () => {
    const out = runPipeline(input(RECT_80x40));
    const bays = out.building.levels.find((l) => l.parking)!.parking!.bays;
    expect(bays.map((b) => b.number)).toEqual(bays.map((_, i) => i + 1));
  });

  it('labels each aisle with the width the standard gave it', () => {
    const out = runPipeline(input(RECT_80x40));
    const aisles = out.building.levels.find((l) => l.parking)!.parking!.aisles;
    expect(aisles.length).toBeGreaterThan(0);
    for (const a of aisles) expect(a.label).toBe('6.00M WIDE 2 WAY DRIVEWAY');
  });

  it('reserves the deducted area as a zone of that size, not as a drawn core', () => {
    const out = runPipeline(input(RECT_80x40));
    const reserved = out.building.levels.find((l) => l.parking)!.parking!.reserved!;
    const drawnM2 = new Decimal(area(reserved.outline)).div(1_000_000);
    expect(drawnM2.minus(new Decimal(reserved.areaM2.value)).abs().lt(1)).toBe(true);
    expect(reserved.label).toMatch(/RESERVED, NOT LAID OUT/);
  });
});

describe('the ramp', () => {
  it('joins each pair of parking levels, climbing one floor over the reserved run', () => {
    const out = runPipeline(input(RECT_80x40, { podiumLevels: 2, parkingLevelsAvailable: 2 }));
    expect(out.building.ramps).toHaveLength(1);
    const ramp = out.building.ramps[0]!;
    expect([ramp.fromLevelId, ramp.toLevelId]).toEqual(['L00', 'L01']);
    const rise = out.envelope.floorToFloorM.value;
    const run = out.levelPlan!.rampStrip!.runM.value;
    expect(ramp.gradientPct.value).toBe(rise.div(run).times(100).toDecimalPlaces(2).toString());
    expect(ramp.toElevationMm - ramp.fromElevationMm).toBe(rise.times(1000).toNumber());
  });

  it('is amber: its run is an assumption, and its gradient is not assessed', () => {
    const out = runPipeline(input(RECT_80x40, { podiumLevels: 2 }));
    const ramp = out.building.ramps[0]!;
    expect(ramp.gradientPct.provenanceClass).toBe('ASSUMED');
    expect(ramp.label).toMatch(/NOT ASSESSED/);
  });

  it('is not invented where there is only one parking level to reach', () => {
    const out = runPipeline(input(RECT_80x40, { parkingLevelsAvailable: 1 }));
    expect(out.building.ramps).toHaveLength(0);
    expect(out.building.notModelled.join(' ')).toMatch(/no second parking level/);
  });
});

describe('the podium is the footprint the figure describes', () => {
  it('is the setback line when coverage does not bind', () => {
    const out = runPipeline(input(RECT_60x30, { parkingLevelsAvailable: 1 }));
    // The precondition, checked rather than hoped for: the setbacks leave less
    // than the cap allows.
    expect(out.envelope.setbackPermittedFootprint.value.lt(out.envelope.coverageCap.value)).toBe(true);
    expect(out.envelope.podiumPlacement).toBeUndefined();
    expect(out.building.levels.find((l) => l.id === 'L00')!.outline).toEqual(out.building.setbackLine);
  });

  it('is cut to the coverage cap when the cap binds, and says where it stands', () => {
    const out = runPipeline(input(RECT_120x80));
    const setbackM2 = new Decimal(area(out.envelope.setbackRing)).div(1_000_000);
    const capM2 = out.envelope.coverageCap.value;
    expect(capM2.lt(setbackM2)).toBe(true);
    // The drawing used to show the whole setback line here: 7,455 m² of slab next
    // to a 5,760 m² footprint figure.
    expect(out.building.setbackLine).not.toEqual(out.building.levels.find((l) => l.id === 'L00')!.outline);

    const podiumM2 = new Decimal(area(out.envelope.podiumRing)).div(1_000_000);
    // The ring is the capped area to within the 1 mm grid's rounding.
    expect(podiumM2.minus(out.envelope.podiumFootprint.value).abs().lt(0.5)).toBe(true);
    expect(out.envelope.podiumPlacement?.provenanceClass).toBe('ASSUMED');
    expect(out.building.placements.map((p) => p.subject)).toContain('podium');
  });

  it('packs the parking into the capped podium, not the setback line', () => {
    const out = runPipeline(input(RECT_120x80));
    const packed = out.levelPlan!.packingRect;
    const packedM2 = packed.widthM.times(packed.depthM);
    expect(packedM2.lte(out.envelope.podiumFootprint.value.plus(0.5))).toBe(true);
  });
});

describe('the sections', () => {
  it('runs along the ramp, and draws each ramp climbing one floor over its run', () => {
    const out = runPipeline(input(RECT_80x40, { podiumLevels: 2, parkingLevelsAvailable: 2 }));
    const section = out.building.sections[0]!;
    expect(section.taken).toMatch(/ramp/);
    expect(section.ramps).toHaveLength(1);
    const r = section.ramps[0]!;
    // The slope in section is the ramp's own run, measured on the cut line.
    const runMm = out.levelPlan!.rampStrip!.runM.value.times(1000).toNumber();
    expect(Math.abs(Math.abs(r.head.alongMm - r.foot.alongMm) - runMm)).toBeLessThanOrEqual(1);
    expect(r.head.elevationMm - r.foot.elevationMm).toBe(out.envelope.floorToFloorM.value.times(1000).toNumber());
  });

  it('opens the slab a ramp passes through, and only that slab', () => {
    const out = runPipeline(input(RECT_80x40, { podiumLevels: 3, parkingLevelsAvailable: 2 }));
    const byId = new Map(out.building.sections[0]!.levels.map((l) => [l.levelId, l]));
    expect(byId.get('L01')!.openings.length).toBeGreaterThan(0);
    expect(byId.get('L02')!.openings).toEqual([]);
    // Cut plus opening is the whole slab: nothing lost, nothing doubled.
    const total = (spans: readonly (readonly [number, number])[]): number =>
      spans.reduce((s, [a, b]) => s + (b - a), 0);
    const l01 = byId.get('L01')!;
    const l02 = byId.get('L02')!;
    expect(total(l01.cut) + total(l01.openings)).toBe(total(l02.cut));
  });

  it('lies inside the plot: every slab span within the boundary spans', () => {
    const out = runPipeline(input(RECT_120x80));
    const section = out.building.sections[0]!;
    const [plotFrom, plotTo] = [section.plot[0]![0], section.plot[section.plot.length - 1]![1]];
    expect(plotFrom).toBe(0);
    expect(plotTo).toBe(section.lengthMm);
    for (const level of section.levels) {
      for (const [a, b] of level.cut) {
        expect(a).toBeGreaterThanOrEqual(plotFrom);
        expect(b).toBeLessThanOrEqual(plotTo);
      }
    }
  });

  it('with a ramp, adds the long section, which cuts the tower the ramp section misses', () => {
    const out = runPipeline(input(RECT_80x40, { podiumLevels: 2 }));
    expect(out.building.sections.map((x) => x.id)).toEqual(['A', 'B']);
    const long = out.building.sections[1]!;
    expect(long.taken).toMatch(/longest side/);
    expect(long.ramps).toEqual([]);
    const tower = out.building.levels.find((l) => l.use === 'TYPICAL')!;
    expect(long.levels.find((l) => l.levelId === tower.id)!.cut.length).toBeGreaterThan(0);
  });

  it('with no ramp, is the long section through the podium', () => {
    const out = runPipeline(input(RECT_80x40, { parkingLevelsAvailable: 1 }));
    const section = out.building.sections[0]!;
    expect(section.ramps).toEqual([]);
    expect(section.taken).toMatch(/longest side/);
    // 80 × 40: the long section is 80 m, boundary to boundary.
    expect(section.lengthMm).toBe(80_000);
  });
});
