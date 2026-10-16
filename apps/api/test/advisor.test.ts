/**
 * Claude's reading of a step (`advisor.ts`). Never calls Anthropic: a recorder
 * stands in for `fetch`, so these hold what is SENT — the code first, the step's
 * figures, the rules of the prompt — and what is never sent: the key to the
 * browser, a run to a stranger, geometry, a developer's name.
 */
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { SqliteAccountRepository } from '../src/account-store.js';
import { compactStep, dubaiBuildingCode, takeEdits } from '../src/advisor.js';
import { optionsFromEnv } from '../src/main.js';
import { build } from '../src/server.js';
import { SqliteRunRepository } from '../src/store.js';

process.env['LOG_LEVEL'] = 'silent';

const KEY = 'test-key-not-real';
const ALICE = { 'x-actor-id': 'guest-alice', 'x-actor-name': 'Alice', 'x-actor-licence': 'DM-1' };
const MALLORY = { 'x-actor-id': 'guest-mallory', 'x-actor-name': 'Mallory', 'x-actor-licence': 'DM-2' };

const PLOT = {
  plotNumber: '345-1234',
  community: 'TEST',
  landUse: 'RESIDENTIAL_MULTI' as const,
  vertices: [
    { x: '0', y: '0' },
    { x: '80', y: '0' },
    { x: '80', y: '40' },
    { x: '0', y: '40' },
  ],
  edges: [
    { seq: 0, classification: 'ROAD' as const, roadHierarchy: 'LOCAL' as const },
    { seq: 1, classification: 'ADJACENT_PLOT' as const },
    { seq: 2, classification: 'ROAD' as const, roadHierarchy: 'LOCAL' as const },
    { seq: 3, classification: 'ADJACENT_PLOT' as const },
  ],
};
const RUN_BODY = {
  parkingInFar: 'EXCLUDED_FROM_FAR' as const,
  unitMix: { source: 'USER_SET' as const, entries: [{ typeId: '1BED', label: '1 bedroom', share: '1', nsaM2: '70' }] },
  parkingLevelsAvailable: 2,
  parkingUsableFraction: { value: '0.85', source: 'ASSUMED' as const, basis: 'the usable fraction of a parking level after cores, ramps and plant' },
  saleableEfficiency: { value: '0.93', source: 'USER_SET' as const },
  realismDiscount: '1.00',
  useDraftRules: true,
};

interface Sent {
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly body: { model: string; system: string; thinking: unknown; messages: { content: string }[] };
}

let app: FastifyInstance | null = null;
let stores: { close(): Promise<void> }[] = [];
afterEach(async () => {
  await app?.close();
  for (const s of stores) await s.close();
  app = null;
  stores = [];
});

async function start(answer: { status: number; json: unknown } | null): Promise<Sent[]> {
  const sent: Sent[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    sent.push({ url, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) });
    return new Response(JSON.stringify(answer?.json ?? {}), { status: answer?.status ?? 200 });
  }) as unknown as typeof fetch;
  const runs = new SqliteRunRepository();
  const accounts = new SqliteAccountRepository();
  stores = [accounts, runs];
  app = await build(runs, accounts, answer ? { advisor: { apiKey: KEY, model: 'claude-opus-5-5', fetchImpl } } : {});
  return sent;
}

async function aRun(headers: Record<string, string>): Promise<string> {
  const plot = await app!.inject({ method: 'POST', url: '/api/plots', headers, payload: PLOT });
  const run = await app!.inject({ method: 'POST', url: '/api/runs', headers, payload: { ...RUN_BODY, plotId: plot.json().plotId } });
  expect(run.statusCode).toBe(201);
  return run.json().runId as string;
}

const SAID = { content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: 'من كود دبي\n- B.7.2.4' }] };

describe('the Dubai Building Code on file', () => {
  it('is read from the repository: B.4 and B.7, in the code’s own words', () => {
    const code = dubaiBuildingCode();
    expect(code).toContain('<chapter id="B04">');
    expect(code).toContain('<chapter id="B07">');
    expect(code).toContain('B.7.2.1 General requirements');
  });
});

describe('POST /api/advise', () => {
  it('sends the code first, then the step, with thinking on, and returns only the answer’s text', async () => {
    const sent = await start({ status: 200, json: SAID });
    const runId = await aRun(ALICE);
    const res = await app!.inject({ method: 'POST', url: '/api/advise', headers: ALICE, payload: { step: 'parking', locale: 'ar', runId } });
    expect(res.statusCode).toBe(200);
    expect(res.json().text).toBe('من كود دبي\n- B.7.2.4');
    expect(sent).toHaveLength(1);
    const [call] = sent;
    expect(call!.url).toBe('https://api.anthropic.com/v1/messages');
    expect(call!.headers['x-api-key']).toBe(KEY);
    expect(call!.body.model).toBe('claude-opus-5-5');
    expect(call!.body.thinking).toEqual({ type: 'adaptive' });
    const user = call!.body.messages[0]!.content;
    expect(user.indexOf('<code>')).toBeLessThan(user.indexOf('<step name="parking">'));
    expect(user).toContain('levelPlan');
    // Never geometry, never the provenance graph.
    expect(user).not.toContain('"rects"');
    expect(user).not.toContain('"graph"');
    expect(call!.body.system).toMatch(/Never say or imply that the scheme complies/);
    expect(call!.body.system).toMatch(/Modern Standard Arabic/);
  });

  it('never hands the key to the browser', async () => {
    await start({ status: 200, json: SAID });
    const runId = await aRun(ALICE);
    const status = await app!.inject({ method: 'GET', url: '/api/advisor' });
    const res = await app!.inject({ method: 'POST', url: '/api/advise', headers: ALICE, payload: { step: 'capacity', locale: 'en', runId } });
    expect(status.json()).toEqual({ enabled: true });
    expect(status.body + res.body).not.toContain(KEY);
  });

  it('answers a stranger 404, as reading the run would', async () => {
    const sent = await start({ status: 200, json: SAID });
    const runId = await aRun(ALICE);
    const res = await app!.inject({ method: 'POST', url: '/api/advise', headers: MALLORY, payload: { step: 'checks', locale: 'en', runId } });
    expect(res.statusCode).toBe(404);
    expect(sent).toHaveLength(0);
  });

  it('reads a refusal from its sentence, with no run', async () => {
    const sent = await start({ status: 200, json: SAID });
    const res = await app!.inject({
      method: 'POST',
      url: '/api/advise',
      headers: ALICE,
      payload: { step: 'refusal', locale: 'ar', refusal: 'this run may not be emitted: 1 finding(s) block it.', request: { parkingLevelsAvailable: 2 } },
    });
    expect(res.statusCode).toBe(200);
    expect(sent[0]!.body.messages[0]!.content).toContain('may not be emitted');
  });

  it('asks Claude once for the same step, and keeps the answer', async () => {
    const sent = await start({ status: 200, json: SAID });
    const runId = await aRun(ALICE);
    for (let i = 0; i < 2; i += 1) {
      await app!.inject({ method: 'POST', url: '/api/advise', headers: ALICE, payload: { step: 'checks', locale: 'ar', runId } });
    }
    expect(sent.filter((s) => s.body.messages[0]!.content.includes('<step name="checks">'))).toHaveLength(1);
  });

  it('says it is off, and the screen does not offer it, where no key was given', async () => {
    await start(null);
    const runId = await aRun(ALICE);
    expect((await app!.inject({ method: 'GET', url: '/api/advisor' })).json()).toEqual({ enabled: false });
    const res = await app!.inject({ method: 'POST', url: '/api/advise', headers: ALICE, payload: { step: 'capacity', locale: 'en', runId } });
    expect(res.statusCode).toBe(503);
  });

  it('reports Claude’s failure without its body, which could echo the key', async () => {
    await start({ status: 401, json: { error: { message: `invalid x-api-key ${KEY}` } } });
    const runId = await aRun(ALICE);
    const res = await app!.inject({ method: 'POST', url: '/api/advise', headers: ALICE, payload: { step: 'capacity', locale: 'en', runId } });
    expect(res.statusCode).toBe(502);
    expect(res.body).not.toContain(KEY);
  });
});

describe('every step, and every error', () => {
  it('reads a step before the run from the reader’s inputs, with no run, and never the sheet’s file', async () => {
    const sent = await start({ status: 200, json: SAID });
    const res = await app!.inject({
      method: 'POST',
      url: '/api/advise',
      headers: ALICE,
      payload: { step: 'sheet', locale: 'en', request: { facts: { far: { value: '3.5', provenanceClass: 'DERIVED' }, sitePlan: { pngBase64: 'iVBORw0KGgo' } } } },
    });
    expect(res.statusCode).toBe(200);
    const user = sent[0]!.body.messages[0]!.content;
    expect(user).toContain('<step name="sheet">');
    expect(user).toContain('3.5 (DERIVED)');
    expect(user).not.toContain('iVBORw0KGgo');
    expect(sent[0]!.body.system).toMatch(/guide, assistant and corrector/);
  });

  it('refuses a step before the run that brings no inputs', async () => {
    const sent = await start({ status: 200, json: SAID });
    const res = await app!.inject({ method: 'POST', url: '/api/advise', headers: ALICE, payload: { step: 'rules', locale: 'en' } });
    expect(res.statusCode).toBe(400);
    expect(sent).toHaveLength(0);
  });

  it('reads any error with the step it was shown on, run or not', async () => {
    const sent = await start({ status: 200, json: SAID });
    const res = await app!.inject({
      method: 'POST',
      url: '/api/advise',
      headers: ALICE,
      payload: { step: 'refusal', at: 'plot', locale: 'ar', refusal: 'The ring is self-intersecting.' },
    });
    expect(res.statusCode).toBe(200);
    expect(sent[0]!.body.messages[0]!.content).toContain('"shownOn":"plot"');
    expect(sent[0]!.body.system).toMatch(/an error shown on the القطعة step/);
  });
});

describe('edits Claude proposes to the inputs', () => {
  const EDITABLE = { 'rules.basements': '0', 'boundary.1.road': '', 'boundary.1.class': 'ROAD' };
  const answerWith = (edits: unknown): { content: { type: string; text: string }[] } => ({
    content: [{ type: 'text', text: `From the Dubai code\n- B.7.2.1\n<edits>${JSON.stringify(edits)}</edits>` }],
  });

  it('returns the ones that rest on a clause in the code text, and cuts the block out of the words', async () => {
    const sent = await start({
      status: 200,
      json: answerWith([
        { field: 'boundary.1.road', value: 'LOCAL', clause: 'B.7.2.1', why: 'Access is taken from the lower-ranked road.' },
        { field: 'rules.basements', value: '2', clause: 'B.99.1', why: 'A clause the code does not have.' },
        { field: 'rules.fakeField', value: '1', clause: 'B.7.2.1', why: 'Not offered.' },
        { field: 'boundary.1.class', value: 'ROAD', clause: 'B.7.2.1', why: 'No change.' },
      ]),
    });
    const res = await app!.inject({
      method: 'POST',
      url: '/api/advise',
      headers: ALICE,
      payload: { step: 'plot', locale: 'en', request: { plot: {} }, editable: EDITABLE },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().text).not.toContain('<edits>');
    expect(res.json().edits).toEqual([{ field: 'boundary.1.road', value: 'LOCAL', clause: 'B.7.2.1', why: 'Access is taken from the lower-ranked road.' }]);
    expect(sent[0]!.body.messages[0]!.content).toContain('<editable>');
    expect(sent[0]!.body.system).toMatch(/An edit whose clause is not in the code text is discarded/);
  });

  it('proposes nothing where the screen offered nothing to change', async () => {
    const sent = await start({ status: 200, json: answerWith([{ field: 'rules.basements', value: '1', clause: 'B.7.2.1', why: 'x' }]) });
    const runId = await aRun(ALICE);
    const res = await app!.inject({ method: 'POST', url: '/api/advise', headers: ALICE, payload: { step: 'export', locale: 'en', runId } });
    expect(res.json().edits).toEqual([]);
    expect(sent[0]!.body.system).not.toMatch(/<editable>/);
  });

  it('survives a block that is not JSON', () => {
    expect(takeEdits('text <edits>not json</edits>', EDITABLE, dubaiBuildingCode()!)).toEqual({ text: 'text', edits: [] });
  });
});

describe('compactStep', () => {
  it('says a traced value as its figure, unit and class, and drops what carries geometry', () => {
    expect(compactStep({ a: { value: '12.5', unit: 'm', provenanceClass: 'DERIVED', node: 'n1' }, rects: [1, 2] })).toEqual({ a: '12.5 m (DERIVED)' });
  });
});

describe('the key, from the environment', () => {
  it('switches the analysis on only when ANTHROPIC_API_KEY is set, with Opus 5.5 by default', () => {
    expect(optionsFromEnv({}).advisor).toBeUndefined();
    expect(optionsFromEnv({ ANTHROPIC_API_KEY: ' k ' }).advisor).toEqual({ apiKey: 'k', model: 'claude-opus-5-5' });
    expect(optionsFromEnv({ ANTHROPIC_API_KEY: 'k', ADVISOR_MODEL: 'claude-sonnet-5-5' }).advisor?.model).toBe('claude-sonnet-5-5');
  });
});
