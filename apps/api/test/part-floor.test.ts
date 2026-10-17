/**
 * THE PART FLOOR, THROUGH THE COMPOSITION ROOT. 17 Oct 2026, wave 3.
 *
 * The governing capacity is min(A, B, C) again, and its remainder above the last
 * whole tower plate stands on the drawn building as a smaller top floor,
 * ASSUMED. These tests hold that through the real API on the landing page's
 * worked example, hold INV-01, INV-11, INV-16 and INV-18 to passing on it and to
 * failing on a run doctored back into a defect, and hold every new sentence to
 * the dictionary in both languages.
 */

import { readFileSync } from 'node:fs';

import type { FastifyInstance } from 'fastify';
import { Decimal } from '@envelope/core';
import { buildAssumptionRegister, runPipeline, type RunInput, type RunOutput } from '@envelope/capacity';
import { initGeometry } from '@envelope/geometry';
import { InvariantStatus, runInvariants } from '@envelope/invariants';
import { engineNote } from '@envelope/report/words';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { RECT_80x40, runInput } from '../../../test-support/pipeline.js';
import { buildInvariantSubject } from '../src/checks.js';
import { build } from '../src/server.js';
import { SqliteRunRepository } from '../src/store.js';

process.env['LOG_LEVEL'] = 'silent';

const ARABIC = /[؀-ۿ]/;

beforeAll(async () => {
  await initGeometry();
});

const statusOf = (subject: ReturnType<typeof buildInvariantSubject>, id: string): string =>
  runInvariants(subject).results.find((r) => r.id === id)!.status;

describe('the worked example, through the API', () => {
  let app: FastifyInstance;
  let repo: SqliteRunRepository;
  const ACTOR = { 'x-actor-id': 'u1', 'x-actor-name': 'Test Architect' };
  const published = JSON.parse(
    readFileSync(new URL('../../web/src/screens/worked-example.json', import.meta.url), 'utf8'),
  ) as { input: { plot: unknown; run: Record<string, unknown> } };

  beforeAll(async () => {
    repo = new SqliteRunRepository();
    app = await build(repo);
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
    repo.close();
  });

  /*
    Since the residual strips (wave 3) the worked example's smallest band is
    10,258.07 m²: eight whole plates of 1,280 and 18.07 m² more. That is less
    than the smallest top floor, so it is the dropped case the example shows
    through the real API — the whole levels, the remainder published as the
    granularity loss, and the sentence with both figures. The drawn case is held
    through the composition root on RECT_80x40 below.
  */
  it('reports the whole levels, 10,240 m², and says why the 18.07 m² above them is not drawn', async () => {
    const plot = (
      await app.inject({ method: 'POST', url: '/api/plots', headers: ACTOR, payload: published.input.plot as object })
    ).json() as { plotId: string };
    const res = await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: ACTOR,
      payload: { ...published.input.run, plotId: plot.plotId },
    });
    expect(res.statusCode, res.body.slice(0, 400)).toBeLessThan(300);
    const run = res.json() as {
      capacity: {
        governingGfa: { value: string; provenanceClass: string };
        levels: { value: string };
        bandC: { value: string };
      };
      building: {
        levels: { id: string; placed: boolean; partFloor?: { areaM2: { value: string; provenanceClass: string } } }[];
        notModelled: string[];
      };
      checks: { invariants: { results: { id: string; status: string }[] } };
    };
    expect(new Decimal(run.capacity.bandC.value).toFixed(2)).toBe('10258.07');
    expect(new Decimal(run.capacity.governingGfa.value).toFixed(2)).toBe('10240.00');
    expect(run.capacity.levels.value).toBe('8');
    expect(run.building.levels.filter((l) => l.partFloor)).toEqual([]);
    const why = run.building.notModelled.find((s) => s.startsWith('The part floor above the last whole level is not drawn'));
    expect(why, run.building.notModelled.join('\n')).toBeDefined();
    expect(why).toContain('18.07');
    expect(why).toContain('10240.00');
    // Every check that runs passes on it — the level checks and INV-16 among them.
    const results = run.checks.invariants.results;
    for (const id of ['INV-01', 'INV-11', 'INV-16', 'INV-18']) {
      expect(results.find((r) => r.id === id)?.status, id).toBe(InvariantStatus.PASS);
    }
    expect(results.filter((r) => r.status === InvariantStatus.FAIL)).toEqual([]);
  });
});

describe('the checks fail on a run doctored back into a defect', () => {
  let input: RunInput;
  let out: RunOutput;
  beforeAll(() => {
    input = runInput(RECT_80x40);
    out = runPipeline(input);
  });

  it('passes INV-01, INV-11, INV-16 and INV-18 as computed', () => {
    expect(out.partFloor?.kind).toBe('DRAWN');
    const subject = buildInvariantSubject('run-test', input.plot, input, out);
    for (const id of ['INV-01', 'INV-11', 'INV-16', 'INV-18']) expect(statusOf(subject, id), id).toBe(InvariantStatus.PASS);
  });

  it('fails INV-01 and INV-11 when the part floor is taken out of the level schedule', () => {
    const subject = buildInvariantSubject('run-test', input.plot, input, out);
    const part = out.building.levels.find((l) => l.partFloor)!;
    const levels = subject.levels!.filter((l) => l.label !== part.id);
    expect(levels.length).toBe(subject.levels!.length - 1);
    const doctored = { ...subject, levels };
    // The governing figure counts a floor no level carries, and the height stands on a storey that is gone.
    expect(statusOf(doctored, 'INV-01')).toBe(InvariantStatus.FAIL);
    expect(statusOf(doctored, 'INV-11')).toBe(InvariantStatus.FAIL);
  });

  it('fails INV-18 on its own defect with the part floor standing: parking carried into GFA against the declaration', () => {
    const subject = buildInvariantSubject('run-test', input.plot, input, out);
    const levels = subject.levels!.map((l) => (l.kind === 'PARKING' ? { ...l, countedInGfa: true } : l));
    expect(statusOf({ ...subject, levels }, 'INV-18')).toBe(InvariantStatus.FAIL);
  });

  it('fails INV-16 when the part floor is cut back off the governing figure', () => {
    const subject = buildInvariantSubject('run-test', input.plot, input, out);
    const whole = out.envelope.towerPlateCap.value.times(out.capacity.levels.value);
    const doctored = { ...subject, capacity: { ...subject.capacity!, governingGfaM2: whole.toString() } };
    expect(statusOf(doctored, 'INV-16')).toBe(InvariantStatus.FAIL);
  });

  it('holds a dropped part floor to the whole levels, and fails a figure that kept it', () => {
    if (out.partFloor?.kind !== 'DRAWN') throw new Error('no part floor to drop');
    const small: RunInput = { ...input, partFloorMinimumM2: out.partFloor.areaM2.value.plus(1) };
    const dropped = runPipeline(small);
    expect(dropped.partFloor?.kind).toBe('DROPPED');
    const subject = buildInvariantSubject('run-test', small.plot, small, dropped);
    expect(statusOf(subject, 'INV-16')).toBe(InvariantStatus.PASS);
    expect(statusOf(subject, 'INV-01')).toBe(InvariantStatus.PASS);
    const min = Decimal.min(
      dropped.capacity.regulationLimitedGfa.value,
      dropped.capacity.geometryLimitedGfa.value,
      dropped.capacity.parkingLimitedGfa.value,
    );
    const kept = { ...subject, capacity: { ...subject.capacity!, governingGfaM2: min.toString() } };
    expect(statusOf(kept, 'INV-16')).toBe(InvariantStatus.FAIL);
  });
});

describe('the part floor’s sentences, in both languages, figures kept', () => {
  function said(text: string, figures: readonly string[]): void {
    const ar = engineNote(text, 'ar');
    const en = engineNote(text, 'en');
    expect(ar, text).not.toBeNull();
    expect(en, text).not.toBeNull();
    expect(ar!).toMatch(ARABIC);
    for (const f of figures) {
      expect(ar!, `${f} missing from: ${ar}`).toContain(f);
      expect(en!, `${f} missing from: ${en}`).toContain(f);
    }
  }

  it('says the drawn part floor: its level, its rule, its basis and the smallest floor', () => {
    const input = runInput(RECT_80x40);
    const out = runPipeline(input);
    if (out.partFloor?.kind !== 'DRAWN') throw new Error('no part floor drawn');
    const level = out.building.levels.find((l) => l.partFloor)!;
    const area = out.partFloor.areaM2.value.toFixed(2);
    said(level.name, []);
    said(out.building.placements.find((p) => p.subject === 'part floor')!.statement, [level.id, area]);
    const register = buildAssumptionRegister(input, out);
    const rule = register.find((r) => r.parameterId === 'building.part_floor_rule')!;
    said(rule.basis, [area]);
    said(rule.label, []);
    said(rule.value, []);
    const minimum = register.find((r) => r.parameterId === 'capacity.part_floor_minimum_m2')!;
    said(minimum.basis, [out.partFloor.minimum.value.toFixed(2)]);
    said(minimum.label, []);
    expect(engineNote('Part floor', 'ar')).toMatch(ARABIC);
  });

  it('says the dropped part floor with both figures', () => {
    const base = runPipeline(runInput(RECT_80x40));
    if (base.partFloor?.kind !== 'DRAWN') throw new Error('no part floor drawn');
    const stated = base.partFloor.areaM2.value.plus(1);
    const out = runPipeline(runInput(RECT_80x40, { partFloorMinimumM2: stated }));
    if (out.partFloor?.kind !== 'DROPPED') throw new Error('the part floor was not dropped');
    said(out.partFloor.reason, [base.partFloor.areaM2.value.toFixed(2), stated.toFixed(2)]);
  });
});
