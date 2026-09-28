/**
 * THE SHEET BINDS A REAL RUN, END TO END.
 *
 * `packages/rules/test/instrument.test.ts` proves the rule builder and the
 * resolver do the right thing. That is not the same as proving the ENGINE does,
 * and the difference is where the original defect lived: the affection plan's
 * limits were read, displayed, and dropped before `runPipeline` ever saw them.
 * Every unit test on either side of that gap passed the whole time.
 *
 * So this suite runs the real pipeline twice — once on the draft seed rules, once
 * with the plot's own sheet added — and asserts the published capacity changes.
 * It also asserts the thing that made the bug survive so long: that the answer is
 * only different when the regulatory band is the one that governs.
 *
 * THE FIXTURE IS CHOSEN SO THE REGULATORY BAND BINDS. The 80×40 plot in
 * `pipeline.test.ts` is governed by parking, which is exactly the case where
 * dropping the sheet costs nothing and looks fine. A sheet FAR low enough to pull
 * band A under the other two is the case that was silently wrong.
 */

import {
  asMm,
  Decimal,
  EdgeClassification,
  LandUse,
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

import { runPipeline, type RunInput } from '../src/index.js';

const ACK = 'I understand these rules are not approved';
const m = (v: number): Mm => asMm(Math.round(v * 1000));
const pt = (x: number, y: number) => ({ x: m(x), y: m(y) });

/** 80 × 40 m, two road frontages — the same shape the pipeline suite uses. */
const RING: Ring = [pt(0, 0), pt(80, 0), pt(80, 40), pt(0, 40)];
const PLOT_NUMBER = '345-1234';

const MIX: readonly UnitTypeMix[] = [
  { typeId: '1BED', label: '1 bedroom', share: new Decimal('0.5'), nsaM2: new Decimal('70') },
  { typeId: '2BED', label: '2 bedroom', share: new Decimal('0.5'), nsaM2: new Decimal('110') },
];

beforeAll(async () => {
  await initGeometry();
});

function makePlot(): Plot {
  const g = analysePlot(RING);
  const classifications = [
    EdgeClassification.ROAD,
    EdgeClassification.ADJACENT_PLOT,
    EdgeClassification.ROAD,
    EdgeClassification.ADJACENT_PLOT,
  ];
  const edges = RING.map((start, i) => {
    const end = RING[(i + 1) % RING.length]!;
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
    plotNumber: PLOT_NUMBER,
    community: 'TEST',
    landUse: LandUse.RESIDENTIAL_MULTI,
    ring: RING,
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

const seedRules = (): RunInput['rules'] =>
  new RuleStore().add(...loadSeedRulesForDevelopment(ACK)).load(asOfNow('2026-08-30'));

function citation(clause: string, verbatim: string): Citation {
  return {
    instrumentId: 'AFFECTION_PLAN',
    instrumentVersion: '2024-03-11',
    clauseReference: clause,
    documentUri: 'sheet-345-1234.pdf',
    sourcePage: 1,
    sourceBbox: [10, 20, 90, 30],
    sourceTextVerbatim: verbatim,
  };
}

const BINDING: InstrumentBinding = {
  plotNumber: PLOT_NUMBER,
  instrumentId: 'TEST-345-1234',
  issuedOn: '2024-03-11',
  authoredBy: 'test',
};

/** A sheet stating a FAR well under the seed rule's 5.00. */
const sheet = (far: string): StatedLimits => ({
  far: { value: new Decimal(far), citation: citation('far', `FAR = ${far}`) },
});

function input(rules: RunInput['rules']): RunInput {
  return {
    plot: makePlot(),
    rules,
    actor: { id: 'u1', name: 'Test Architect' },
    parkingInFar: 'EXCLUDED_FROM_FAR',
    unitMix: { source: 'USER_SET', entries: MIX },
    parkingLevelsAvailable: 2,
    saleableEfficiency: {
      value: new Decimal('1'),
      source: 'USER_SET',
      basis: 'test fixture — GFA and saleable area held equal to isolate the FAR change',
    },
    parkingUsableFraction: {
      value: new Decimal('0.85'),
      source: 'ASSUMED',
      basis:
        'the fraction of a parking level left for bays and aisles after cores, ' +
        'ramps and plant. No cited rule fixes it.',
    },
    realismDiscount: new Decimal('1.00'),
  };
}

function withSheet(far: string): RunInput {
  const { rules } = rulesFromInstrument(sheet(far), BINDING);
  return input([...seedRules(), ...rules]);
}

describe('the affection plan reaches the answer', () => {
  it('the seed rule alone puts band A at FAR 5.00 × 3,200 m²', () => {
    const out = runPipeline(input(seedRules()));
    expect(out.capacity.regulationLimitedGfa.value.toString()).toBe('16000');
  });

  it('the sheet’s own FAR replaces it, and the published band moves', () => {
    const out = runPipeline(withSheet('1.5'));
    // 1.50 × 3,200 m². Not 16,000 — which is the number this plot reported while
    // the sheet in the same session said something else.
    expect(out.capacity.regulationLimitedGfa.value.toString()).toBe('4800');
  });

  it('and it is the sheet that governs the whole run, not merely one band', () => {
    const loose = runPipeline(input(seedRules()));
    const bound = runPipeline(withSheet('1.5'));

    // On the seed rules this plot's bands are A 16,000 · B 17,920 · C 5,940, so
    // PARKING governs — which is precisely why the defect was invisible here. A
    // sheet FAR of 1.5 puts band A at 4,800, under the parking ceiling, and the
    // published answer changes for the first time.
    expect(loose.capacity.governingBand).toBe('PARKING');
    expect(bound.capacity.governingBand).toBe('REGULATORY');
    expect(bound.capacity.governingGfa.value.lt(loose.capacity.governingGfa.value)).toBe(true);
  });

  it('the governing constraint names the sheet, not a draft rule', () => {
    const out = runPipeline(withSheet('1.5'));
    expect(out.capacity.governingConstraint.ruleId).toContain('INSTRUMENT.TEST-345-1234');
  });

  it('the sheet reaches the provenance graph with its own citation', () => {
    const out = runPipeline(withSheet('1.5'));
    const cited = out.graph.nodes.filter(
      (n) => n.citation?.documentUri === 'sheet-345-1234.pdf',
    );
    expect(cited.length).toBeGreaterThan(0);
    expect(cited.every((n) => n.citation!.instrumentId === 'AFFECTION_PLAN')).toBe(true);
  });

  it('a sheet for another plot does not touch this one', () => {
    const elsewhere = rulesFromInstrument(sheet('1.5'), { ...BINDING, plotNumber: '999-9999' });
    const out = runPipeline(input([...seedRules(), ...elsewhere.rules]));
    expect(out.capacity.regulationLimitedGfa.value.toString()).toBe('16000');
  });
});
