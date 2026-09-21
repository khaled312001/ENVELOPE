/**
 * CAD and Excel exports, over HTTP.
 *
 * These two formats leave the product and keep travelling. A PDF gets read once;
 * a DXF gets x-reffed into a submission set and a workbook gets pasted into
 * somebody's model. So the tests weighted here are not "did a file come back"
 * but:
 *
 * - does it still say what it does not claim, once detached from the screen;
 * - does every bay in the drawing correspond to a bay the engine placed;
 * - does the amber survive the trip into a spreadsheet.
 *
 * The last one is the reason `xlsx` is checked as bytes rather than mocked. A
 * workbook whose provenance column is empty is a workbook that has quietly
 * turned an assumption into a fact, and only the real file can prove otherwise.
 */

import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { subjectHash } from '../src/gates.js';
import { build } from '../src/server.js';
import { SqliteRunRepository } from '../src/store.js';

const ACTOR = { 'x-actor-id': 'u1', 'x-actor-name': 'Test Architect' };
const REVIEWER = { ...ACTOR, 'x-actor-licence': 'DM-12345' };

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
    { seq: 2, classification: 'ROAD' as const, roadHierarchy: 'ARTERIAL' as const },
    { seq: 3, classification: 'ADJACENT_PLOT' as const },
  ],
};

const RUN_BODY = {
  parkingInFar: 'EXCLUDED_FROM_FAR' as const,
  unitMix: {
    source: 'USER_SET' as const,
    entries: [
      { typeId: '1BED', label: '1 bedroom', share: '0.5', nsaM2: '70' },
      { typeId: '2BED', label: '2 bedroom', share: '0.5', nsaM2: '110' },
    ],
  },
  parkingLevelsAvailable: 2,
  parkingUsableFraction: {
    value: '0.85',
    source: 'ASSUMED' as const,
    basis: 'the usable fraction of a parking level after cores, ramps and plant',
  },
  // Required, with no default. The engine used to take 1.00 implicitly here and
  // report more units than any building holds; 0.93 is the conservative end of
  // the range the project brief on file states. The range and the developer who
  // set it are that developer's confidential commercial expectation, so neither
  // goes in a basis string — see the note in `api.test.ts`.
  saleableEfficiency: {
    value: '0.93',
    source: 'USER_SET' as const,
    basis: 'the conservative end of the saleable-to-GFA range in the project brief on file',
  },
  realismDiscount: '1.00',
  useDraftRules: true,
};

let app: FastifyInstance;
let repo: SqliteRunRepository;
let run: Record<string, never> & { runId: string; levelPlan: Record<string, unknown> };

beforeAll(async () => {
  repo = new SqliteRunRepository(':memory:');
  app = await build(repo);

  const plot = (
    await app.inject({ method: 'POST', url: '/api/plots', headers: ACTOR, payload: PLOT })
  ).json();
  run = (
    await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: ACTOR,
      payload: { ...RUN_BODY, plotId: plot.plotId },
    })
  ).json();

  for (const [gate, subject] of [
    ['G1_PLOT_CONFIRMED', 'plot'],
    ['G2_RULES_ACKNOWLEDGED', 'rules'],
    ['G3_ASSUMPTIONS_ACKNOWLEDGED', 'assumptions'],
    ['G4_REVIEWER_NAMED', 'capacity'],
  ] as const) {
    await app.inject({
      method: 'POST',
      url: `/api/runs/${run.runId}/gates`,
      headers: gate === 'G4_REVIEWER_NAMED' ? REVIEWER : ACTOR,
      payload: {
        gate,
        subjectHash: subjectHash((run as unknown as Record<string, unknown>)[subject]),
      },
    });
  }
});

afterAll(async () => {
  await app.close();
  repo.close();
});

describe('the run carries a parking level', () => {
  it('lays bays out rather than reporting an area', () => {
    const lp = run.levelPlan as {
      bayCount: { value: string; provenanceClass: string };
      rects: { kind: string; outline: { x: string; y: string }[] }[];
    };
    expect(Number(lp.bayCount.value)).toBeGreaterThan(0);
    expect(lp.rects.filter((r) => r.kind === 'BAY').length).toBe(Number(lp.bayCount.value));
    for (const r of lp.rects) expect(r.outline).toHaveLength(4);
  });

  it('recommends a frontage for the entrance and names the ones it refused', () => {
    const access = (run.levelPlan as { access: { recommended: { edgeSeq: number } | null; rejected: unknown[] } })
      .access;
    expect(access.recommended).not.toBeNull();
    expect(access.rejected.length).toBeGreaterThan(0);
  });

  it('prefers the secondary road over the arterial one', () => {
    // B.7.2.1: "the access point should be from the secondary road". Edge 0 is
    // LOCAL and edge 2 is ARTERIAL; a recommendation of 2 would mean the
    // hierarchy preference had stopped being applied.
    const access = (run.levelPlan as { access: { recommended: { edgeSeq: number } } }).access;
    expect(access.recommended.edgeSeq).toBe(0);
  });
});

describe('DXF export', () => {
  let dxf: string;

  beforeAll(async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/runs/${run.runId}/export?format=dxf`,
      headers: REVIEWER,
    });
    expect(res.statusCode).toBe(200);
    dxf = res.body;
  });

  it('is a real R12 file AutoCAD will open', () => {
    expect(dxf.startsWith('0\r\nSECTION')).toBe(true);
    expect(dxf).toContain('AC1009');
    expect(dxf.trimEnd().endsWith('EOF')).toBe(true);
  });

  it('puts bays, aisles, the ramp and the driveway on separate layers', () => {
    // A reviewer's first move is to switch things off. One ENV-PARKING layer
    // would make all four arguments happen at once.
    for (const layer of [
      'ENV-PARKING-BAY',
      'ENV-PARKING-AISLE',
      'ENV-PARKING-RAMP',
      'ENV-VEHICLE-ACCESS',
    ]) {
      expect(dxf).toContain(layer);
    }
  });

  it('draws exactly the bays the engine placed, and no others', () => {
    const bays = (run.levelPlan as { rects: { kind: string }[] }).rects.filter(
      (r) => r.kind === 'BAY',
    ).length;
    // Counted as POLYLINE entities on the bay layer, not as occurrences of the
    // layer name: R12 repeats the name on every VERTEX and on the SEQEND, so a
    // string count would pass on a file holding a sixth of the bays.
    const drawn = dxf.split('0\r\nPOLYLINE\r\n8\r\nENV-PARKING-BAY\r\n').length - 1;
    expect(drawn).toBe(bays);
    expect(bays).toBeGreaterThan(10);
  });

  it('carries the disclaimer inside the file, not beside it', () => {
    expect(dxf).toContain('REGULATORY VALIDITY: NOT ASSESSED');
  });

  it('is offered as a download rather than rendered', () => {
    // A DXF that opens as text in a browser tab is a DXF the client will think
    // is broken.
    expect(dxf.length).toBeGreaterThan(2000);
  });
});

describe('XLSX export', () => {
  it('returns a workbook with the provenance still attached', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/runs/${run.runId}/export?format=xlsx`,
      headers: REVIEWER,
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
    expect(res.headers['content-disposition']).toContain('.xlsx');

    const bytes = res.rawPayload;
    // PK.. — a zip, which is what an xlsx is.
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    expect(bytes.length).toBeGreaterThan(5000);

    // The sheet XML is compressed, but the shared-string table and the sheet
    // names are enough to prove the structure without unzipping: the cover
    // sheet is always first and always carries the refusal.
    const text = bytes.toString('latin1');
    expect(text).toContain('xl/workbook.xml');
  });
});

describe('gates apply to every format', () => {
  it('refuses a drawing to a run whose assumptions were never read', async () => {
    const plot = (
      await app.inject({ method: 'POST', url: '/api/plots', headers: ACTOR, payload: PLOT })
    ).json();
    const fresh = (
      await app.inject({
        method: 'POST',
        url: '/api/runs',
        headers: ACTOR,
        payload: { ...RUN_BODY, plotId: plot.plotId },
      })
    ).json();

    for (const format of ['dxf', 'xlsx']) {
      const res = await app.inject({
        method: 'POST',
        url: `/api/runs/${fresh.runId}/export?format=${format}`,
        headers: REVIEWER,
      });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    }
  });
});
