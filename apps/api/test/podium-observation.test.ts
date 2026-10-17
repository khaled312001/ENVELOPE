/**
 * The podium row is observed under its own parameter (17 Oct 2026).
 *
 * The sheet's podium row binds `setback.podium.<class>`, and nothing was
 * published under that key, so the validator could only ever say it had no
 * observation for it. `observationsFrom` now publishes the least podium setback
 * a sheet rule set per parameter — and none for an edge where the run ASSUMED
 * the podium's line, because no rule governed it there.
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
} from '@envelope/core';
import { runPipeline, type RunInput } from '@envelope/capacity';
import { analysePlot, initGeometry, type Ring } from '@envelope/geometry';
import { asOfNow, loadSeedRulesForDevelopment, rulesFromInstrument, RuleStore } from '@envelope/rules';
import { beforeAll, describe, expect, it } from 'vitest';

import { observationsFrom } from '../src/checks.js';

const m = (v: number): Mm => asMm(Math.round(v * 1000));
const RING: Ring = [
  { x: m(0), y: m(0) },
  { x: m(50.85), y: m(0) },
  { x: m(50.85), y: m(26.85) },
  { x: m(0), y: m(26.85) },
];
const d = (s: string): Decimal => new Decimal(s);
const cite = (verbatim: string): Citation => ({
  instrumentId: 'AFFECTION_PLAN',
  instrumentVersion: '22-12-2025',
  clauseReference: 'setbacks',
  documentUri: 'sheet.pdf',
  sourcePage: 1,
  sourceBbox: [0, 0, 1, 1],
  sourceTextVerbatim: verbatim,
});

beforeAll(async () => {
  await initGeometry();
});

function plot(): Plot {
  const g = analysePlot(RING);
  const classes = ['ROAD', 'ADJACENT_PLOT', 'ADJACENT_PLOT', 'ADJACENT_PLOT'] as const;
  return {
    plotId: 'p',
    tenantId: 't',
    plotNumber: '6211383',
    community: 'WARSAN FIRST',
    landUse: LandUse.RESIDENTIAL_MULTI,
    ring: RING,
    edges: RING.map((start, i) => {
      const end = RING[(i + 1) % RING.length]!;
      return {
        seq: i,
        start,
        end,
        classification: classes[i]!,
        ...(classes[i] === EdgeClassification.ROAD ? { roadHierarchy: 'LOCAL' as const } : {}),
        lengthMm: asMm(Math.round(Math.hypot(end.x - start.x, end.y - start.y))),
        bearingDeg: d('0'),
      };
    }),
    shapeClass: 'RECTILINEAR',
    statedAreaM2: d('1365.23'),
    computedAreaMm2: g.areaMm2,
    areaMismatch: false,
    principalAxisDeg: g.principalAxisDeg,
    mbrWidthMm: g.mbr.widthMm,
    mbrDepthMm: g.mbr.depthMm,
    convexityRatio: g.convexityRatio,
    frontageCount: 1,
  };
}

function input(limits: StatedLimits): RunInput {
  return {
    plot: plot(),
    rules: [
      ...new RuleStore().add(...loadSeedRulesForDevelopment('I understand these rules are not approved')).load(asOfNow('2026-08-30')),
      ...rulesFromInstrument(limits, { plotNumber: '6211383', instrumentId: 'S', issuedOn: '2025-12-22', authoredBy: 'test' }).rules,
    ],
    actor: { id: 'u1', name: 'Test Architect' },
    parkingInFar: 'EXCLUDED_FROM_FAR',
    unitMix: {
      source: 'USER_SET',
      entries: [
        { typeId: '1BED', label: '1 bedroom', share: d('0.5'), nsaM2: d('70') },
        { typeId: '2BED', label: '2 bedroom', share: d('0.5'), nsaM2: d('110') },
      ],
    },
    parkingLevelsAvailable: 3,
    saleableEfficiency: { value: d('0.95'), source: 'ASSUMED', basis: 'test fixture: the mid-point of the 93 to 97% the brief states' },
    parkingUsableFraction: { value: d('0.85'), source: 'ASSUMED', basis: 'the fraction of a parking level left for bays and aisles.' },
    realismDiscount: d('1.00'),
    podiumAtBoundaryStatement: {
      statementId: 'STMT-PODIUM-SETBACK-2026-10-16',
      statedBy: 'Eng. Mohamed',
      statedOn: '2026-10-16',
      verbatim: 'the ground floor, podium and basements take the whole plot',
    },
  };
}

const fixed = (metres: string) => ({ kind: 'FIXED', metres: d(metres) });
const limits = (podium: object): StatedLimits => ({
  far: { value: d('3.5'), citation: cite('FAR = 3.5') },
  setbacks: { value: { podium, tower: {}, raw: 'GF & Podium', requiresDecision: false } as never, citation: cite('GF & Podium') },
  height: { value: { typicalFloors: 8, podiumLevels: 2, totalLevels: 11, raw: 'G+2P+8' }, citation: cite('G+2P+8') },
});

describe('the podium row, observed', () => {
  it('publishes the least podium setback per parameter the sheet set', () => {
    const obs = observationsFrom(runPipeline(input(limits({ front: fixed('1'), side: fixed('2'), rear: fixed('2') }))));
    const value = (k: string): string | undefined => (obs[k] as { value?: { value: Decimal } } | undefined)?.value?.value.toString();
    expect(value('setback.podium.road')).toBe('1');
    expect(value('setback.podium.adjacent_plot')).toBe('2');
  });

  it('observes nothing for the podium where the run ASSUMED its line', () => {
    const conditional = { kind: 'CONDITIONAL', options: [{ condition: 'to solid wall', metres: d('0') }, { condition: 'to window wall', metres: d('4') }] };
    const obs = observationsFrom(runPipeline(input(limits({ front: fixed('0'), side: conditional, rear: conditional }))));
    expect(obs['setback.podium.adjacent_plot']).toBeUndefined();
    expect(obs['setback.podium.road']).toBeDefined();
  });
});
