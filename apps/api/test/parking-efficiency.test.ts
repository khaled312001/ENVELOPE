/**
 * The car park's gross area per bay, and the target beside it only where one
 * was attached (17 Oct 2026).
 *
 * The defect: the one area-per-bay figure the run published divided ONE level's
 * packed region by its bays — not the car park a developer's brief measures
 * ("Car park minimum efficiency should achieve: 37.5 m2 per car"), which has
 * ramps, cores and plant inside it. And no run said whether any target applied.
 * Now the gross figure is published beside it, and the brief's target is
 * compared only when the run names that brief: never a default.
 */

import { describe, expect, it } from 'vitest';

import { DEVELOPER_STANDARDS, PROJECT_BRIEFS } from '@envelope/rules';

import { build } from '../src/server.js';

const ACTOR = { 'x-actor-id': 'u-efficiency', 'x-actor-name': 'Efficiency Tester' };
const SLOW = 60_000;

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const BRIEF = PROJECT_BRIEFS.find((b) => b.plotNumber === '5180196')!;
const TARGET = DEVELOPER_STANDARDS.find((s) => s.standardId === BRIEF.standardId)!.targets.parkingAreaPerBayM2;

const plotBody = {
  plotNumber: '5180196',
  community: 'TEST',
  landUse: 'RESIDENTIAL_MULTI' as const,
  vertices: [
    { x: '0', y: '0' },
    { x: '40', y: '0' },
    { x: '40', y: '30' },
    { x: '0', y: '30' },
  ],
  edges: [
    { seq: 0, classification: 'ROAD', roadHierarchy: 'LOCAL' },
    { seq: 1, classification: 'ADJACENT_PLOT' },
    { seq: 2, classification: 'ADJACENT_PLOT' },
    { seq: 3, classification: 'ADJACENT_PLOT' },
  ],
};

function runBody(plotId: string, extra: object = {}) {
  return {
    plotId,
    parkingInFar: 'EXCLUDED_FROM_FAR' as const,
    unitMix: {
      source: 'USER_SET' as const,
      entries: [
        { typeId: '1BED', label: '1BED', share: '0.5', nsaM2: '70' },
        { typeId: '2BED', label: '2BED', share: '0.5', nsaM2: '110' },
      ],
    },
    parkingLevelsAvailable: 2,
    parkingUsableFraction: {
      value: '0.85',
      source: 'ASSUMED' as const,
      basis: 'the fraction of a parking level left for bays and aisles after cores, ramps and plant. No cited rule fixes it.',
    },
    saleableEfficiency: { value: '0.95', source: 'USER_SET' as const },
    useDraftRules: true,
    ...extra,
  };
}

async function computed(extra: object): Promise<Json> {
  const app = await build();
  try {
    const plot = await app.inject({ method: 'POST', url: '/api/plots', headers: ACTOR, payload: plotBody });
    expect(plot.statusCode, plot.body).toBe(201);
    const res = await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: ACTOR,
      payload: runBody((plot.json() as Json)['plotId'], extra),
    });
    expect(res.statusCode, res.body.slice(0, 400)).toBe(201);
    return res.json() as Json;
  } finally {
    await app.close();
  }
}

describe('the car park’s gross area per bay', () => {
  it('is every parking level whole over the bays provided, and states no target when none is attached', async () => {
    const run = await computed({});
    const eff = run['parkingEfficiency'];
    const levels = Number(run['parking'].levelsAvailable.value);
    const provided = Number(run['parking'].providedBays.value);
    expect(levels).toBeGreaterThan(0);
    expect(provided).toBeGreaterThan(0);
    // The podium footprint once per parking level — not the one level's packed region.
    const footprint = Number(run['envelope'].podiumFootprint.value);
    expect(Number(eff.grossAreaM2.value)).toBeCloseTo(footprint * levels, 2);
    expect(Number(eff.grossAreaPerBayM2.value)).toBeCloseTo((footprint * levels) / provided, 2);
    expect(eff.target).toBeNull();
    expect(eff.notes).toContain('No car park efficiency target is stated for this run, and none is assumed.');
  }, SLOW);

  it('is compared with the brief’s target when, and only when, the run names the brief', async () => {
    const run = await computed({ projectBriefId: BRIEF.briefId });
    const eff = run['parkingEfficiency'];
    expect(eff.target.m2PerBay.value).toBe(TARGET.value);
    // A developer's figure, entered under the person who attached it — never DERIVED.
    expect(eff.target.m2PerBay.provenanceClass).toBe('USER_SET');
    const gap = Number(eff.grossAreaPerBayM2.value) - Number(TARGET.value);
    expect(Number(eff.target.gapM2.value)).toBeCloseTo(gap, 2);
    // Which levels the target covers is not stated, so the comparison is amber.
    expect(eff.target.gapM2.provenanceClass).toBe('ASSUMED');
    expect(eff.notes.join(' ')).toMatch(/Against the attached standard's target of 37\.5 m² per bay/);
    expect(eff.notes.join(' ')).toContain('A developer\'s target, not a regulation.');
  }, SLOW);
});
