/**
 * A real run, for tests that draw one.
 *
 * Shared because three suites draw the same building — the sheets, the DXF and
 * the parity gate — and a drawing test fed from a hand-typed model proves the
 * drawing works against a building nobody computed. These build the plot, load
 * the development rules and run the whole pipeline, exactly as the API does.
 */

import type { RunInput } from '@envelope/capacity';
import {
  asMm,
  Decimal,
  EdgeClassification,
  LandUse,
  type Mm,
  type Plot,
  type UnitTypeMix,
} from '@envelope/core';
import { analysePlot, type Ring } from '@envelope/geometry';
import { asOfNow, loadSeedRulesForDevelopment, RuleStore } from '@envelope/rules';

const ACK = 'I understand these rules are not approved';
const m = (v: number): Mm => asMm(Math.round(v * 1000));
export const pt = (x: number, y: number): { x: Mm; y: Mm } => ({ x: m(x), y: m(y) });

const MIX: readonly UnitTypeMix[] = [
  { typeId: '1BED', label: '1 bedroom', share: new Decimal('0.5'), nsaM2: new Decimal('70') },
  { typeId: '2BED', label: '2 bedroom', share: new Decimal('0.5'), nsaM2: new Decimal('110') },
];

export const RECT_80x40: Ring = [pt(0, 0), pt(80, 0), pt(80, 40), pt(0, 40)];
export const RECT_120x80: Ring = [pt(0, 0), pt(120, 0), pt(120, 80), pt(0, 80)];
/** Rotated, so nothing downstream can quietly assume the plot is axis-aligned. */
export const SKEWED: Ring = [pt(10, 0), pt(80, 20), pt(70, 60), pt(0, 40)];

export const META = {
  plotNumber: '345-1234',
  community: 'TEST COMMUNITY',
  runId: 'run-test',
  issuedAt: '2026-06-11T08:00:00.000Z',
} as const;

export function plotOf(ring: Ring): Plot {
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
    plotNumber: META.plotNumber,
    community: META.community,
    landUse: LandUse.RESIDENTIAL_MULTI,
    ring,
    edges: ring.map((start, i) => {
      const end = ring[(i + 1) % ring.length]!;
      const cls = classes[i % classes.length]!;
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

export function runInput(ring: Ring, overrides: Partial<RunInput> = {}): RunInput {
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
