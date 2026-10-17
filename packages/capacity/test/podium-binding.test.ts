/**
 * The podium's own row, published; the which-face rule, answered; a sensitivity
 * that cannot be measured, said in words. 17 Oct 2026.
 *
 *  - The sheet's podium row bound `setback.podium.<class>`, and the envelope
 *    published no applied podium setback, so nothing could be observed against it.
 *  - On a two-road plot the reader answers the "which face is this road?" rule
 *    face by face, and the rule was set aside with the reason for a typed figure
 *    replacing a rule — "every edge … carries a tower setback typed", which is
 *    not what happened.
 *  - A window-wall alternative the podium line cannot be drawn with recorded a
 *    relative effect of −1: a 100% loss nobody measured.
 *
 * The plot is Warsan 6211383's (50.85 × 26.85 m, one road, three neighbours).
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
import { asOfNow, loadSeedRulesForDevelopment, rulesFromInstrument, RuleStore } from '@envelope/rules';
import { beforeAll, describe, expect, it } from 'vitest';

import { ANSWERED_BY_FACE_REASON, NOT_MEASURABLE, runPipeline, TYPED_OVER_RULE_REASON, type RunInput } from '../src/index.js';

const ACK = 'I understand these rules are not approved';
const m = (v: number): Mm => asMm(Math.round(v * 1000));
const pt = (x: number, y: number) => ({ x: m(x), y: m(y) });
const RING: Ring = [pt(0, 0), pt(50.85, 0), pt(50.85, 26.85), pt(0, 26.85)];
const PLOT_NUMBER = '6211383';
const d = (s: string): Decimal => new Decimal(s);

const MIX: readonly UnitTypeMix[] = [
  { typeId: '1BED', label: '1 bedroom', share: d('0.5'), nsaM2: d('70') },
  { typeId: '2BED', label: '2 bedroom', share: d('0.5'), nsaM2: d('110') },
];

beforeAll(async () => {
  await initGeometry();
});

type Cls = (typeof EdgeClassification)[keyof typeof EdgeClassification];

function makePlot(classes: readonly Cls[] = ['ROAD', 'ADJACENT_PLOT', 'ADJACENT_PLOT', 'ADJACENT_PLOT']): Plot {
  const g = analysePlot(RING);
  return {
    plotId: 'warsan',
    tenantId: 't1',
    plotNumber: PLOT_NUMBER,
    community: 'WARSAN FIRST',
    landUse: LandUse.RESIDENTIAL_MULTI,
    ring: RING,
    edges: RING.map((start, i) => {
      const end = RING[(i + 1) % RING.length]!;
      const cls = classes[i]!;
      return {
        seq: i,
        start,
        end,
        classification: cls,
        ...(cls === EdgeClassification.ROAD ? { roadHierarchy: 'LOCAL' as const } : {}),
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
    frontageCount: classes.filter((c) => c === EdgeClassification.ROAD).length,
  };
}

const cite = (verbatim: string): Citation => ({
  instrumentId: 'AFFECTION_PLAN',
  instrumentVersion: '22-12-2025',
  clauseReference: 'setbacks',
  documentUri: 'sheet.pdf',
  sourcePage: 1,
  sourceBbox: [10, 20, 90, 30],
  sourceTextVerbatim: verbatim,
});

const sheet = (podium: object, tower: object, raw: string): StatedLimits => ({
  far: { value: d('3.5'), citation: cite('FAR = 3.5') },
  setbacks: { value: { podium, tower, raw, requiresDecision: false } as never, citation: cite(raw) },
  height: { value: { typicalFloors: 8, podiumLevels: 2, totalLevels: 11, raw: 'G+2P+8' }, citation: cite('G+2P+8') },
});

const fixed = (metres: string) => ({ kind: 'FIXED', metres: d(metres) });

function input(limits: StatedLimits, plot = makePlot(), over: Partial<RunInput> = {}): RunInput {
  return {
    plot,
    rules: [
      ...new RuleStore().add(...loadSeedRulesForDevelopment(ACK)).load(asOfNow('2026-08-30')),
      ...rulesFromInstrument(limits, { plotNumber: PLOT_NUMBER, instrumentId: '6211383@22-12-2025', issuedOn: '2025-12-22', authoredBy: 'test' }).rules,
    ],
    actor: { id: 'u1', name: 'Test Architect' },
    parkingInFar: 'EXCLUDED_FROM_FAR',
    unitMix: { source: 'USER_SET', entries: MIX },
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
    ...over,
  };
}

describe('the podium setbacks the sheet set are published, edge by edge', () => {
  it('lists each edge the podium row governs, with its rule and figure', () => {
    const out = runPipeline(input(sheet({ front: fixed('1'), side: fixed('2'), rear: fixed('2') }, {}, 'GF & Podium: 1m front, 2m sides')));
    const bySeq = new Map((out.envelope.appliedPodiumSetbacks ?? []).map((a) => [a.seq, a]));
    expect(bySeq.get(0)?.valueM.toString()).toBe('1');
    expect(bySeq.get(0)?.parameterId).toBe('setback.podium.road');
    for (const seq of [1, 2, 3]) {
      expect(bySeq.get(seq)?.valueM.toString()).toBe('2');
      expect(bySeq.get(seq)?.parameterId).toBe('setback.podium.adjacent_plot');
      expect(bySeq.get(seq)?.traced.provenanceClass).toBe(ProvenanceClass.DERIVED);
    }
  });

  it('publishes none where the statement, not the sheet, puts the podium on the boundary', () => {
    const out = runPipeline(input(sheet({}, { front: fixed('0'), side: fixed('3'), rear: fixed('3') }, 'Tower: Front = 0m, Sides & Rear = 3m')));
    expect(out.envelope.appliedPodiumSetbacks ?? []).toEqual([]);
  });
});

describe('the which-face rule, answered face by face', () => {
  it('is set aside with its own reason, not the reason for a typed figure', () => {
    const warsan = sheet(
      { front: fixed('0'), side: fixed('0'), rear: fixed('0') },
      { front: fixed('0'), side: fixed('3'), rear: fixed('3') },
      'GF & Podium: 0m from all sides | Tower: Front = 0m, Sides & Rear = 3m',
    );
    const out = runPipeline(
      input(warsan, makePlot(['ROAD', 'ADJACENT_PLOT', 'ROAD', 'ADJACENT_PLOT']), {
        typedSetbacks: [
          { edgeSeq: 0, metres: d('0') },
          { edgeSeq: 2, metres: d('3') },
        ],
      }),
    );
    const roadAside = out.envelope.setAside.filter((s) => s.parameterId === 'setback.road');
    expect(roadAside.length).toBeGreaterThan(0);
    for (const s of roadAside) {
      expect(s.reason).toBe(ANSWERED_BY_FACE_REASON);
      expect(s.reason).not.toBe(TYPED_OVER_RULE_REASON);
    }
  });
});

describe('a sensitivity the podium line cannot be drawn with', () => {
  it('says "not measurable" in words and records no −1', () => {
    // Solid wall 0 m, window wall 30 m on a plot 26.85 m deep: the window-wall line cannot be drawn.
    const conditional = { kind: 'CONDITIONAL', options: [{ condition: 'to solid wall', metres: d('0') }, { condition: 'to window wall', metres: d('30') }] };
    const out = runPipeline(
      input(sheet({ front: fixed('0'), side: conditional, rear: conditional }, { side: fixed('2'), rear: fixed('2') }, 'GF & Podium: 0m to solid wall and 30m to window wall | Tower: 2m')),
    );
    const value = out.graph.nodes.find((n) => n.kind === 'VALUE' && n.parameterId === 'setback.podium.adjacent_plot');
    const sensitive = out.graph.edges.find((e) => e.kind === 'sensitiveTo' && e.to === value?.id);
    expect(sensitive?.attrs?.['relativeEffect']).toBe(NOT_MEASURABLE);
    expect(String(sensitive?.attrs?.['perturbation'])).toMatch(/ — not measurable: the podium line cannot be drawn with it \(/);
  });
});
