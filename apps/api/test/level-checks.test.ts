/**
 * INV-01, INV-11 AND INV-18 RUN ON THE ENGINE'S OWN LEVEL SCHEDULE. 17 Oct 2026.
 *
 * They were DORMANT on a note saying Phase 0 produced no schedule. The engine had
 * long since begun stacking the building, and the check that would have caught
 * 6,400 m² counted on no drawn level was the one switched off. These tests hold
 * the three to running, to passing on a right run, and to failing on a run
 * doctored back into the defect — a check that cannot fail is worth nothing.
 */

import type { FastifyInstance } from 'fastify';
import { Decimal, type Citation, type StatedLimits } from '@envelope/core';
import { runPipeline, type RunInput, type RunOutput } from '@envelope/capacity';
import { initGeometry } from '@envelope/geometry';
import { InvariantStatus, runInvariants } from '@envelope/invariants';
import { rulesFromInstrument } from '@envelope/rules';
import { engineNote } from '@envelope/report/words';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { RECT_80x40, plotOf, runInput } from '../../../test-support/pipeline.js';
import { buildInvariantSubject, LEVEL_SCHEDULE_NOTE, presentChecks, runChecks } from '../src/checks.js';
import { PARKING_LEVELS_MAX } from '../src/schemas.js';
import { build } from '../src/server.js';
import { SqliteRunRepository } from '../src/store.js';

process.env['LOG_LEVEL'] = 'silent';

const A_104 = { basements: 3, groundIsParking: false, podiumAboveGround: 5, podiumParkingLevels: 5 } as const;

function checksOf(input: RunInput, output: RunOutput) {
  return runChecks({
    runId: 'run-test',
    plot: input.plot,
    input,
    output,
    engineVersion: 'test',
    ruleSetHash: 'test',
    geometry: { areasRecomputed: 1, areaDisagreements: 0 },
    validatedAt: '2026-10-17T00:00:00.000Z',
  });
}

const status = (checks: ReturnType<typeof checksOf>, id: string): string =>
  checks.invariants.results.find((r) => r.id === id)!.status;

function citation(clause: string, verbatim: string): Citation {
  return {
    instrumentId: 'AFFECTION_PLAN',
    instrumentVersion: '01-01-2026',
    clauseReference: clause,
    documentUri: 'test-sheet.pdf',
    sourcePage: 1,
    sourceBbox: [10, 20, 90, 30],
    sourceTextVerbatim: verbatim,
  };
}

beforeAll(async () => {
  await initGeometry();
});

describe('the level checks read the engine’s schedule', () => {
  const runs: readonly [string, RunInput][] = [
    ['no schedule', runInput(RECT_80x40)],
    ['A-104, shops on G', runInput(RECT_80x40, { levelSchedule: A_104 })],
    ['parking counts toward FAR', runInput(RECT_80x40, { parkingInFar: 'COUNTS_TOWARD_FAR' })],
  ];
  for (const [name, input] of runs) {
    it(`runs and passes INV-01, INV-11 and INV-18 — ${name}`, () => {
      const checks = checksOf(input, runPipeline(input));
      for (const id of ['INV-01', 'INV-11', 'INV-18']) expect(status(checks, id), id).toBe(InvariantStatus.PASS);
      // INV-02 needs a unit layout, and says so rather than passing.
      expect(status(checks, 'INV-02')).toBe(InvariantStatus.DORMANT);
      // Every invariant that ran passes — INV-16 among them, held to whole levels.
      expect(checks.invariants.results.filter((r) => r.status === InvariantStatus.FAIL)).toEqual([]);
    });
  }

  it('says which level check still sleeps, and why, rather than the old Phase 0 note', () => {
    const input = runInput(RECT_80x40);
    const shown = presentChecks(checksOf(input, runPipeline(input)));
    expect(shown.invariants.dormantNote).toBe(LEVEL_SCHEDULE_NOTE);
    expect(LEVEL_SCHEDULE_NOTE).toContain('INV-02');
    expect(LEVEL_SCHEDULE_NOTE).not.toContain('Phase 0 generates no');
  });

  it('INV-01 fails on the defect: plate × every storey under the ceiling, parking included', () => {
    const input = runInput(RECT_80x40, { levelSchedule: A_104 });
    const out = runPipeline(input);
    const subject = buildInvariantSubject('run-test', input.plot, input, out);
    // What band B used to report on this scheme: fourteen plates for nine drawn levels.
    const old = out.envelope.towerPlateCap.value.times(out.envelope.maxLevelsByHeight.value);
    const result = runInvariants({ ...subject, totalGfaM2: old.toString() }).results.find((r) => r.id === 'INV-01')!;
    expect(result.status).toBe(InvariantStatus.FAIL);
  });

  it('INV-11 fails on the old cover height: the answer’s levels alone, the parking under them left out', () => {
    const input = runInput(RECT_80x40, { levelSchedule: A_104 });
    const out = runPipeline(input);
    const subject = buildInvariantSubject('run-test', input.plot, input, out);
    const old = out.envelope.floorToFloorM.value.times(out.capacity.levels.value);
    const result = runInvariants({
      ...subject,
      height: { ...subject.height!, reportedTotalHeightM: old.toString() },
    }).results.find((r) => r.id === 'INV-11')!;
    expect(result.status).toBe(InvariantStatus.FAIL);
  });

  it('INV-18 fails when a parking level is carried into GFA against the declaration', () => {
    const input = runInput(RECT_80x40);
    const out = runPipeline(input);
    const subject = buildInvariantSubject('run-test', input.plot, input, out);
    const levels = subject.levels!.map((l) => (l.kind === 'PARKING' ? { ...l, countedInGfa: true } : l));
    const result = runInvariants({ ...subject, levels }).results.find((r) => r.id === 'INV-18')!;
    expect(result.status).toBe(InvariantStatus.FAIL);
  });
});

describe('what the reader is told about a shop floor counted at the plate', () => {
  /*
    The A-104 ground floor (shops) is one of the levels the capacity counts, at a
    full tower plate. The engine says so; the reader's sentence in either language
    must say it too, with the figure, rather than only "not assessed".
  */
  it('keeps the plate figure in English and in Arabic', () => {
    const input = runInput(RECT_80x40, { levelSchedule: A_104 });
    const out = runPipeline(input);
    const said = out.gfaStatement.reconciliation.find((s) =>
      s.startsWith('The level schedule states the ground floor does not park.'),
    )!;
    expect(said).toContain('counted here at the full tower plate');
    const plate = out.envelope.towerPlateCap.value.toFixed(2);
    expect(engineNote(said, 'en')).toContain(`full tower plate of ${plate} m²`);
    expect(engineNote(said, 'ar')).toContain(`${plate} م²`);
  });
});

describe('the validator observes the plan’s level count', () => {
  it('holds the storeys the building stands to the sheet’s G+N', () => {
    const limits: StatedLimits = {
      far: { value: new Decimal('6'), citation: citation('far', 'FAR = 6') },
      height: {
        value: { typicalFloors: 16, podiumLevels: 1, totalLevels: 18, raw: 'G+1P+16' },
        citation: citation('height', 'G+1P+16'),
      },
    };
    const binding = { plotNumber: '345-1234', instrumentId: 'TEST@01-01-2026', issuedOn: '2026-01-01', authoredBy: 'test' };
    const input = runInput(RECT_80x40, {
      rules: [...runInput(RECT_80x40).rules, ...rulesFromInstrument(limits, binding).rules],
      levelSchedule: { basements: 2, groundIsParking: true, podiumAboveGround: 1, podiumParkingLevels: 1 },
    });
    const checks = checksOf(input, runPipeline(input));
    const outcome = checks.validation.outcomes.find(
      (o) => 'parameterId' in o && o.parameterId === 'levels.max_above_ground',
    );
    expect(outcome).toBeDefined();
    expect('status' in outcome! ? outcome.status : undefined).toBe('SATISFIED');
  });
});

describe('the API accepts the parking levels a schedule can state', () => {
  let app: FastifyInstance;
  let repo: SqliteRunRepository;
  const ACTOR = { 'x-actor-id': 'u1', 'x-actor-name': 'Test Architect' };

  beforeAll(async () => {
    repo = new SqliteRunRepository();
    app = await build(repo);
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
    repo.close();
  });

  it('states its bound as the schedule’s own: 8 basements, the ground floor and 20 podium levels', () => {
    expect(PARKING_LEVELS_MAX).toBe(29);
  });

  it('computes 3B + a parked ground floor + 5P — nine parking levels — where it refused them at eight', async () => {
    const plot = (
      await app.inject({
        method: 'POST',
        url: '/api/plots',
        headers: ACTOR,
        payload: {
          plotNumber: '345-1234',
          community: 'TEST',
          landUse: 'RESIDENTIAL_MULTI',
          vertices: [
            { x: '0', y: '0' },
            { x: '80', y: '0' },
            { x: '80', y: '40' },
            { x: '0', y: '40' },
          ],
          edges: [
            { seq: 0, classification: 'ROAD', roadHierarchy: 'LOCAL' },
            { seq: 1, classification: 'ADJACENT_PLOT' },
            { seq: 2, classification: 'ROAD', roadHierarchy: 'LOCAL' },
            { seq: 3, classification: 'ADJACENT_PLOT' },
          ],
        },
      })
    ).json() as { plotId: string };
    const res = await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: ACTOR,
      payload: {
        plotId: plot.plotId,
        parkingInFar: 'EXCLUDED_FROM_FAR',
        unitMix: {
          source: 'USER_SET',
          entries: [
            { typeId: '1BED', label: '1 bedroom', share: '0.5', nsaM2: '70' },
            { typeId: '2BED', label: '2 bedroom', share: '0.5', nsaM2: '110' },
          ],
        },
        parkingLevelsAvailable: 9,
        levels: { basements: 3, groundIsParking: true, podiumAboveGround: 5, podiumParkingLevels: 5 },
        parkingUsableFraction: {
          value: '0.85',
          source: 'ASSUMED',
          basis: 'the usable fraction of a parking level after cores, ramps and plant',
        },
        saleableEfficiency: {
          value: '0.93',
          source: 'USER_SET',
          basis: 'the developer brief states 93% saleable over GFA',
        },
        realismDiscount: '1.00',
        useDraftRules: true,
      },
    });
    expect(res.statusCode, res.body).toBe(201);
    const parking = (res.json().building.levels as { id: string; parking: unknown }[]).filter((l) => l.parking);
    expect(parking.map((l) => l.id)).toEqual(['B3', 'B2', 'B1', 'G', 'P1', 'P2', 'P3', 'P4', 'P5']);
    // And the plot fixture is the shared one, so nothing here drifts from it.
    expect(plotOf(RECT_80x40).plotNumber).toBe('345-1234');
  });
});
