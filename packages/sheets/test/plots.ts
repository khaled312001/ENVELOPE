/**
 * The plots the drawing tests draw: the landing page's worked example, Warsan
 * 6211383 as the studio files it, and the parity gate's rectangles and skew.
 * Each is a REAL run — a fixture model is a building somebody typed.
 */

import { runPipeline, type RunInput } from '@envelope/capacity';
import { Decimal, EdgeClassification, type Citation, type Plot, type StatedLimits } from '@envelope/core';
import { analysePlot, type Ring } from '@envelope/geometry';
import { rulesFromInstrument } from '@envelope/rules';

import { META, pt, RECT_120x80, RECT_80x40, runInput, SKEWED } from '../../../test-support/pipeline.js';
import { composeSheets } from '../src/compose.js';
import type { Sheet, SheetMeta } from '../src/types.js';

type Cls = (typeof EdgeClassification)[keyof typeof EdgeClassification];
type Rank = 'ARTERIAL' | 'COLLECTOR' | 'LOCAL' | 'ACCESS';

function plotWith(ring: Ring, edges: readonly (readonly [Cls, Rank?])[], over: Partial<Plot> = {}): Plot {
  const base = runInput(ring).plot;
  const g = analysePlot(ring);
  return {
    ...base,
    edges: base.edges.map((e, i) => {
      const [classification, rank] = edges[i]!;
      const { roadHierarchy: _drop, ...rest } = e;
      return { ...rest, classification, ...(rank ? { roadHierarchy: rank } : {}) };
    }),
    computedAreaMm2: g.areaMm2,
    frontageCount: edges.filter(([c]) => c === EdgeClassification.ROAD).length,
    ...over,
  };
}

/** `apps/web/src/screens/worked-example.json`'s input, as the API turns it into a run. */
export function workedExample(): RunInput {
  const base = runInput(RECT_80x40);
  return {
    ...base,
    plot: plotWith(
      RECT_80x40,
      [['ROAD', 'LOCAL'], ['ADJACENT_PLOT'], ['ROAD', 'COLLECTOR'], ['ADJACENT_PLOT']],
      { community: 'Business Bay' },
    ),
    levelSchedule: { basements: 1, groundIsParking: true, podiumAboveGround: 1, podiumParkingLevels: 0 },
    saleableEfficiency: { value: new Decimal('0.93'), source: 'USER_SET' },
  };
}

/** Warsan 6211383 as the studio files it: edge 0 the road, the sheet's two schedules bound. */
const WARSAN_RING: Ring = [pt(0, 0), pt(50.85, 0), pt(50.85, 26.85), pt(0, 26.85)];

const cite = (clause: string, verbatim: string): Citation => ({
  instrumentId: 'AFFECTION_PLAN',
  instrumentVersion: '22-12-2025',
  clauseReference: clause,
  documentUri: 'warsan-affection-plan.pdf',
  sourcePage: 1,
  sourceBbox: [10, 20, 90, 30],
  sourceTextVerbatim: verbatim,
});

const WARSAN: StatedLimits = {
  far: { value: new Decimal('3.5'), citation: cite('far', 'FAR = 3.5') },
  coverage: {
    value: { podium: new Decimal('1'), tower: new Decimal('0.6'), raw: 'GF & Podium: 100% | Tower: Maximum 60%' },
    citation: cite('plot_coverage', 'GF & Podium: 100%'),
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
    citation: cite('setbacks', 'GF & Podium: 0m from all sides'),
  },
  height: {
    value: { typicalFloors: 8, podiumLevels: 2, totalLevels: 11, raw: 'G+2P+8' },
    citation: cite('height', 'G+2P+8'),
  },
};

export function warsan(): RunInput {
  const base = runInput(WARSAN_RING);
  return {
    ...base,
    plot: plotWith(
      WARSAN_RING,
      [['ROAD', 'LOCAL'], ['ADJACENT_PLOT'], ['ADJACENT_PLOT'], ['ADJACENT_PLOT']],
      { plotNumber: '6211383', community: 'WARSAN FIRST', statedAreaM2: new Decimal('1365.23') },
    ),
    rules: [
      ...base.rules,
      ...rulesFromInstrument(WARSAN, {
        plotNumber: '6211383',
        instrumentId: '6211383@22-12-2025',
        issuedOn: '2025-12-22',
        authoredBy: 'test',
      }).rules,
    ],
    parkingLevelsAvailable: 3,
    podiumAtBoundaryStatement: {
      statementId: 'STMT-PODIUM-SETBACK-2026-10-16',
      statedBy: 'Eng. Mohamed',
      statedOn: '2026-10-16',
      verbatim: 'ال دور ال ارضي و البوديوم و البدروم بياخدو مساحه الارض كلها مفيش setbacks',
    },
  };
}

export const PLOTS: readonly { readonly name: string; readonly input: () => RunInput }[] = [
  { name: 'the worked example', input: workedExample },
  { name: 'Warsan 6211383', input: warsan },
  { name: '80 x 40', input: () => runInput(RECT_80x40) },
  { name: '80 x 40, two podium levels', input: () => runInput(RECT_80x40, { podiumLevels: 2 }) },
  { name: '120 x 80', input: () => runInput(RECT_120x80) },
  { name: 'skewed', input: () => runInput(SKEWED) },
  /*
    Shops on G, parking below and above it, as the reference scheme draws it: the
    one run that places the ramps from the street (`street-ramp.ts`), so the one
    that holds their words to the lettering and collision rules every other
    sheet is held to. Without it those rules were never measured on them, and
    the first look found their gradient printed over the entrance's label, a
    dimension and the bay numbers.
  */
  { name: '120 x 80, shops on G, ramps from the street', input: streetRamps },
];

/** The 120 x 80 rectangle with the reference scheme's schedule and an entrance placed 25 m along boundary 0. */
export function streetRamps(): RunInput {
  return runInput(RECT_120x80, {
    levelSchedule: { basements: 3, groundIsParking: false, podiumAboveGround: 5, podiumParkingLevels: 5 },
    podiumAtBoundaryStatement: {
      statementId: 'STMT-PODIUM-SETBACK-2026-10-16',
      statedBy: 'Eng. Mohamed',
      statedOn: '2026-10-16',
      verbatim: 'ال دور ال ارضي و البوديوم و البدروم بياخدو مساحه الارض كلها مفيش setbacks',
    },
    levelPlan: {
      arrangement: 'WIDTH',
      vehicleAccess: { entry: { edgeSeq: 0, centreOffsetM: new Decimal('25') } },
    },
  });
}

export const setOf = (input: RunInput, meta: SheetMeta = META): Sheet[] =>
  composeSheets(runPipeline(input).building, meta);
