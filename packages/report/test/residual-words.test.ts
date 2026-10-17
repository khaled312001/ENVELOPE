/**
 * The residual strips' sentences, and the car park's, in both languages (17 Oct 2026).
 *
 * Every sentence below is taken from a real engine run, never typed: a re-worded
 * engine sentence then fails here rather than reaching an Arabic page in English.
 * And each Arabic sentence must keep every figure of the English one — a short
 * form that drops the cap or the plot length is a translation nobody can check.
 */
import { asMm, Decimal, NodeKind, ProvenanceGraph, Tracer } from '@envelope/core';
import { layoutParkingLevel, reducedBayAllowance, runPipeline } from '@envelope/capacity';
import { initGeometry } from '@envelope/geometry';
import { describe, expect, it } from 'vitest';

import { pt, RECT_80x40, runInput } from '../../../test-support/pipeline.js';
import { engineNote } from '../src/words/index.js';

// At load, not in a hook: the sentences are the test table, collected before any test runs.
await initGeometry();

const PODIUM = {
  statementId: 'STMT-PODIUM-SETBACK-2026-10-16',
  statedBy: 'Eng. Mohamed',
  statedOn: '2026-10-16',
  verbatim: 'the podium stands on the boundary',
};

/** The sentences this change gave the engine, by their fixed openings. */
const NEW = [
  /^Residual strips: /,
  / are 5 × 2\.5 m under Table B\.11 note \*/,
  / strip past the last bay row is too shallow for a single-loaded row/,
  /^Under Table B\.11 note \* a\)/,
  /^Angled bays \(Table B\.11/,
  / of 5 m are not used on the level the street reaches/,
  /^DBC Table B\.11 note \* lets/,
  /^Car park: /,
  /^No car park efficiency target/,
  /^Against the attached standard's target/,
  /^The target is compared over every parking level/,
  /^The developer standard's car park target does not say/,
];

function sentences(): string[] {
  const out = new Set<string>();
  const runs = [
    runInput([pt(0, 0), pt(40, 0), pt(40, 53.2), pt(0, 53.2)], {
      podiumAtBoundaryStatement: PODIUM,
      levelSchedule: { basements: 2, groundIsParking: true, podiumAboveGround: 1, podiumParkingLevels: 0 },
      levelPlan: { arrangement: 'WIDTH', avoidCore: false, includeRamp: false },
    }),
    runInput([pt(3.6, 0), pt(83.45, 0), pt(87.25, 4.49), pt(87.25, 50.98), pt(0, 50.98), pt(0, 3.6)], {
      podiumAtBoundaryStatement: PODIUM,
      levelSchedule: { basements: 3, groundIsParking: false, podiumAboveGround: 5, podiumParkingLevels: 5 },
    }),
    runInput(RECT_80x40, {
      levelSchedule: { basements: 1, groundIsParking: true, podiumAboveGround: 1, podiumParkingLevels: 0 },
      parkingEfficiencyTarget: { m2PerBay: new Decimal('37.5'), clauseReference: 'item 5', verbatim: 'a target' },
    }),
    runInput(RECT_80x40, {
      levelSchedule: { basements: 1, groundIsParking: true, podiumAboveGround: 1, podiumParkingLevels: 0 },
      parkingEfficiencyTarget: { m2PerBay: new Decimal('30'), clauseReference: 'item 5', verbatim: 'a target' },
    }),
    runInput(RECT_80x40),
  ];
  for (const input of runs) {
    const run = runPipeline(input);
    for (const s of run.levelPlan?.notAssessed ?? []) out.add(s);
    for (const s of run.parkingEfficiency?.notes ?? []) out.add(s);
    for (const n of run.graph.nodes) if (n.kind === NodeKind.BASIS) out.add(n.label);
  }
  // Note * a): a plot under 30 m long, every perpendicular bay may be short.
  const graph = new ProvenanceGraph();
  const tracer = new Tracer(graph);
  const sides = [29, 29, 29, 29].map((m) => ({ lengthMm: asMm(m * 1000) }));
  const level = layoutParkingLevel({
    tracer,
    footprint: { widthM: new Decimal(40), depthM: new Decimal(45.2) },
    deductions: { areaM2: new Decimal(0), source: 'ASSUMED', basis: 'a test level with nothing reserved on it' },
    includeRamp: false,
    arrangement: { id: 'WIDTH' },
    reducedBays: reducedBayAllowance(tracer, sides, {})!,
  });
  for (const s of level.notes) out.add(s);
  // The assumption's basis, as the register shows it.
  for (const n of graph.nodes) if (n.kind === NodeKind.BASIS) out.add(n.label);
  return [...out].filter((s) => NEW.some((r) => r.test(s)));
}

const SAID = sentences();

describe('the residual strips and the car park, in both languages', () => {
  it('reach every new sentence from a real run', () => {
    for (const r of NEW) expect(SAID.some((s) => r.test(s)), String(r)).toBe(true);
  });

  it.each(SAID)('says in Arabic and in English: %s', (s) => {
    expect(engineNote(s, 'ar')).toMatch(/[؀-ۿ]/);
    expect(engineNote(s, 'en')).not.toBeNull();
    /*
      NOT ASSESSED is «لم يخضع للتقييم» (docs/05-design/arabic-glossary.md). The
      glossary rejects «لم يقيم» by name: unvowelled, as it ships, it reads "he did
      not stay", on the one phrase the product's position rests on.
    */
    expect(engineNote(s, 'ar')).not.toContain('لم يقيم');
  });

  it.each(SAID)('keeps every figure: %s', (s) => {
    const ar = engineNote(s, 'ar') ?? '';
    const figures = s.match(/\d+(?:\.\d+)?(?: × \d+(?:\.\d+)?)?/g) ?? [];
    for (const f of figures) {
      // Rule numbers (Table B.11) are a citation, kept by name.
      if (s.includes(`B.${f}`)) continue;
      expect(ar, `${f} missing from: ${ar}`).toContain(f);
    }
  });

  it('says the register’s new labels, ids and values', () => {
    for (const t of [
      'plot length, as Table B.11 note * is read',
      'car park efficiency target of the attached developer standard',
      'parking.reduced_bay_plot_length_m',
      'parking.gross_area_per_bay_m2',
      'parking.reduced_bay_share',
      'up to 10% of perpendicular bays may be 5 m × 2.5 m',
      'every perpendicular bay may be 5 m × 2.5 m',
      'what the car park efficiency target is compared over',
      'parking.target_reading',
      'every parking level, ramps, cores and plant included',
    ]) {
      expect(engineNote(t, 'ar'), t).toMatch(/[؀-ۿ]/);
    }
  });
});
