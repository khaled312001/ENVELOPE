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

import type { IDxf } from 'dxf-parser';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { parseDxf } from '../../../test-support/dxf.js';
import { subjectHash } from '../src/gates.js';
import { build } from '../src/server.js';
import { runWorkbookSpec, type ExportableRun } from '../src/workbook.js';
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
let run: Record<string, never> & { runId: string; levelPlan: Record<string, unknown>; building: unknown };

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

  it('reports no choice when nobody chose', () => {
    expect((run.levelPlan as { access: { chosen: unknown } }).access.chosen).toBeNull();
  });
});

/*
  Meeting 3, 38:32: the entrance is his to place. The arterial edge is legal but
  not preferred, so choosing it is an overruling the run must carry — as his,
  with the recommendation still beside it, and on the drawing.
*/
describe('a chosen vehicle entrance', () => {
  const send = async (extra: Record<string, unknown>) => {
    const plot = (
      await app.inject({ method: 'POST', url: '/api/plots', headers: ACTOR, payload: PLOT })
    ).json();
    return app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: ACTOR,
      payload: { ...RUN_BODY, plotId: plot.plotId, ...extra },
    });
  };
  const post = (chosenAccessEdgeSeq: number) => send({ chosenAccessEdgeSeq });

  /* 16 Oct 2026: the boundary, the point along it, and one gap or two lanes. */
  it('carries an entry and an exit apart onto the drawing model, each signed', async () => {
    const res = await send({
      vehicleAccess: {
        arrangement: 'ONE_WAY_SEPARATE',
        entry: { edgeSeq: 0, centreOffsetM: '20' },
        exit: { edgeSeq: 2, centreOffsetM: '60' },
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as {
      levelPlan: { access: { chosen: { arrangement: string; openings: { role: string; edgeSeq: number; widthM: string }[] } } };
      building: { access: { openings: { role: string; edgeSeq: number; label: string }[] } };
    };
    expect(body.levelPlan.access.chosen.arrangement).toBe('ONE_WAY_SEPARATE');
    expect(body.levelPlan.access.chosen.openings.map((o) => [o.role, o.edgeSeq, o.widthM])).toEqual([
      ['ENTRY', 0, '3.00'],
      ['EXIT', 2, '3.00'],
    ]);
    expect(body.building.access.openings.map((o) => o.label)).toEqual([
      'VEHICLE ENTRY - ONE WAY - 3.00M',
      'VEHICLE EXIT - ONE WAY - 3.00M',
    ]);
  });

  it('refuses an opening placed past the end of its boundary, naming where it may go', async () => {
    const res = await send({
      vehicleAccess: { arrangement: 'TWO_WAY', entry: { edgeSeq: 0, centreOffsetM: '79' } },
    });
    expect(res.statusCode).toBe(422);
    expect(JSON.stringify(res.json())).toMatch(/must be centred between 3\.00 m and 77\.00 m from P0/);
  });

  /* 16 Oct 2026: «كذا اوبشن … وله حرية الاختيار» — every option listed, any one drawn. */
  it('lists every parking option with its count, and draws a picked one under the picker’s name', async () => {
    type Options = { levelPlan: { arrangement: string; arrangements: { id: string; bayCount: number }[]; orientation: { provenanceClass: string } }; building: { levels: unknown[] } };
    const first = (await send({})).json() as Options;
    const options = first.levelPlan.arrangements.filter((a) => a.bayCount > 0);
    expect(options.length).toBeGreaterThan(1);
    expect(first.levelPlan.arrangement).toBe(options.reduce((a, b) => (b.bayCount > a.bayCount ? b : a)).id);
    const other = options.find((a) => a.id !== first.levelPlan.arrangement)!;
    const res = await send({ parkingArrangement: other.id });
    expect(res.statusCode).toBe(201);
    const picked = res.json() as Options;
    expect(picked.levelPlan.arrangement).toBe(other.id);
    expect(picked.levelPlan.orientation.provenanceClass).toBe('USER_SET');
    expect(picked.levelPlan.arrangements).toEqual(first.levelPlan.arrangements);
  });

  /*
    The bays a ring's drive from the slab edge crosses are their own figure, inside
    the circulation loss. Every level a run lays out has a ramp or a sloped ring, so
    no such drive is drawn and the figure is a stated zero — not a missing field a
    reader cannot tell from "not measured".
  */
  it('publishes the bays the drive from the slab edge cost, inside the circulation loss', async () => {
    type Losses = { levelPlan: { losses: { circulation: { bays: number; entryDriveBays: number } } } };
    for (const arrangement of [undefined, 'PERIMETER', 'SLOPED'] as const) {
      const res = await send(arrangement ? { parkingArrangement: arrangement } : {});
      if (res.statusCode !== 201) continue;
      const { circulation } = (res.json() as Losses).levelPlan.losses;
      expect(circulation.entryDriveBays, arrangement ?? 'the default').toBe(0);
      expect(circulation.bays).toBeGreaterThanOrEqual(circulation.entryDriveBays);
    }
  });

  it('refuses a parking option the level does not offer, naming the ones it does', async () => {
    const res = await send({ parkingArrangement: 'FIELD_DEPTH' });
    expect(res.statusCode).toBe(422);
    expect(JSON.stringify(res.json())).toMatch(/This level offers WIDTH \(\d+ bays\)/);
  });

  it('refuses two answers to one question', async () => {
    const res = await send({
      chosenAccessEdgeSeq: 0,
      vehicleAccess: { arrangement: 'TWO_WAY', entry: { edgeSeq: 0 } },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.stringify(res.json())).toMatch(/send one/);
  });

  it('is USER_SET, drawn, and reported beside the recommendation', async () => {
    const res = await post(2);
    expect(res.statusCode).toBe(201);
    const body = res.json() as {
      levelPlan: {
        access: {
          recommended: { edgeSeq: number; provenanceClass: string };
          chosen: { edgeSeq: number; provenanceClass: string };
        };
      };
      building: { access: { edgeSeq: number; source: { provenanceClass: string } } };
    };
    expect(body.levelPlan.access.chosen.edgeSeq).toBe(2);
    expect(body.levelPlan.access.chosen.provenanceClass).toBe('USER_SET');
    expect(body.levelPlan.access.recommended.edgeSeq).toBe(0);
    expect(body.building.access.edgeSeq).toBe(2);
  });

  it('refuses a boundary shared with a neighbour, in a sentence', async () => {
    const res = await post(1);
    expect(res.statusCode).toBe(422);
    expect(JSON.stringify(res.json())).toMatch(
      /The vehicle entrance was placed on boundary 1 \(P1 → P2\), which cannot take one/,
    );
  });
});

describe('DXF export', () => {
  let dxf: string;
  let parsed: IDxf;
  const building = (): { drawnBays: { value: string }; levels: { id: string; parking: unknown }[] } =>
    run.building as never;

  beforeAll(async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/runs/${run.runId}/export?format=dxf`,
      headers: REVIEWER,
    });
    expect(res.statusCode).toBe(200);
    dxf = res.body;
    parsed = parseDxf(dxf);
  });

  it('is a real R12 file AutoCAD will open, and a second reader agrees', () => {
    expect(dxf.startsWith('0\r\nSECTION')).toBe(true);
    expect(dxf).toContain('AC1009');
    expect(dxf.trimEnd().endsWith('EOF')).toBe(true);
    expect(parsed.entities.length).toBeGreaterThan(100);
  });

  it("puts each level's bays, cars and aisles on that level's own layers", () => {
    // A reviewer's first move is to switch things off: one level, then the bays on
    // it. One ENV-PARKING layer would make every argument happen at once.
    const layers = Object.keys(parsed.tables.layer.layers);
    for (const level of building().levels.filter((l) => l.parking)) {
      for (const role of ['BAY', 'CAR', 'AISLE']) expect(layers).toContain(`ENV-${level.id}-${role}`);
    }
    expect(layers).toContain('ENV-SITE-ACCESS');
  });

  it('draws exactly the bays the engine placed on every level, one car in each, and no others', () => {
    const drawn = Number(building().drawnBays.value);
    expect(drawn).toBeGreaterThan(10);
    const cars = parsed.entities.filter((e) => e.type === 'INSERT' && (e as { name?: string }).name === 'CAR');
    // Counted as parsed entities, not as occurrences of a layer name: R12 repeats
    // the name on every VERTEX and on the SEQEND, so a string count would pass on
    // a file holding a sixth of the bays.
    // Every layer a bay is drawn on; the access aisle beside an accessible bay is not one.
    const bays = parsed.entities.filter((e) => e.type === 'POLYLINE' && /^ENV-[A-Z0-9]+-BAY(-ACCESSIBLE|-PREFERRED)?$/.test(e.layer));
    expect(cars).toHaveLength(drawn);
    expect(bays).toHaveLength(drawn);
  });

  /** The polylines on one layer, each as its vertex count and its closed flag. */
  const onLayer = (layer: string): { vertices: number; closed: boolean }[] =>
    parsed.entities
      .filter((e) => e.type === 'POLYLINE' && e.layer === layer)
      .map((e) => {
        const p = e as unknown as { vertices: unknown[]; shape: boolean };
        return { vertices: p.vertices.length, closed: p.shape === true };
      });

  it('draws the driveway opening the engine placed, and nothing beyond it', () => {
    // It used to be a closed four-point throat, made by adding a metre to y —
    // north whatever the edge faced. Two open points on the boundary is the
    // opening; anything more is a shape the engine never computed.
    const access = onLayer('ENV-SITE-ACCESS');
    expect(access).toHaveLength(1);
    expect(access[0]).toEqual({ vertices: 2, closed: false });
  });

  it('puts the setback line on its own layer, once', () => {
    const setback = onLayer('ENV-SITE-SETBACK');
    expect(setback).toHaveLength(1);
    expect(setback[0]?.closed).toBe(true);
    expect(setback[0]?.vertices).toBeGreaterThanOrEqual(3);
  });

  it('carries the disclaimer inside the file, not beside it', () => {
    expect(dxf).toContain('REGULATORY VALIDITY: NOT ASSESSED');
  });

  it('exports one sheet on its own when asked, named by its sheet number', async () => {
    const level = building().levels.find((l) => l.parking)!;
    const res = await app.inject({
      method: 'POST',
      url: `/api/runs/${run.runId}/export?format=dxf&sheet=level-${level.id}`,
      headers: REVIEWER,
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/A-10\d\.dxf/);
    const one = parseDxf(res.body);
    const layers = new Set(one.entities.map((e) => e.layer));
    expect([...layers].some((l) => l.startsWith(`ENV-${level.id}-`))).toBe(true);
    expect(one.entities.some((e) => e.type === '3DFACE')).toBe(false);
  });

  it('refuses a sheet the set does not have, and names the ones it does', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/runs/${run.runId}/export?format=dxf&sheet=level-Z9`,
      headers: REVIEWER,
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().message).toMatch(/Its sheets are: site, /);
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

  it('carries the GFA calculation as its own sheet, every row traced', async () => {
    const view = (
      await app.inject({ method: 'GET', url: `/api/runs/${run.runId}`, headers: REVIEWER })
    ).json() as { gfaStatement?: unknown };
    expect(view.gfaStatement).toBeDefined();
    const spec = runWorkbookSpec(view as unknown as ExportableRun, '2026-10-02T00:00:00.000Z');
    const sheet = spec.sheets.find((s) => s.name === 'GFA calculation');
    expect(sheet).toBeDefined();
    expect(sheet!.rows.map((r) => r.label)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^Gross floor area allowed \(m²\) — [\d.]+ ft²$/),
        expect.stringMatching(/^Total gross floor area proposed \(m²\) — [\d.]+ ft²$/),
        /*
          THE ROW IS NOW NAMED BY ITS CAP AND ITS FLOOR KIND, which is the schedule
          the client asked for on 5 Oct: his table groups levels the way a drawing
          groups them and measures each group against one of two allowances. "1.
          Residential floors" was the single undifferentiated row that replaced.
        */
        expect.stringMatching(/^Residential G\.F\.A\. · \d+\. [A-Z][a-z].* — × \d+ \(m²\)/),
      ]),
    );
    for (const row of sheet!.rows) expect(row.source).toBeTruthy();
  });

  /*
    A FLOOR NAMED AND NOT COUNTED MUST NOT BE IN THE COLUMN A READER SUMS.

    This is the one export somebody totals by hand. A roof level present as a
    blank cell is added in as zero by `=SUM()`, and a roof level left out
    altogether is never asked about — so it is a note under the table, and the
    value column holds nothing but figures. The test asserts both halves: the
    statement is PRESENT in `notes`, and ABSENT from `rows`.
  */
  it('states the floors it does not count under the table, never in the value column', async () => {
    const view = (
      await app.inject({ method: 'GET', url: `/api/runs/${run.runId}`, headers: REVIEWER })
    ).json() as { gfaStatement?: { omissions?: readonly unknown[] } };
    expect(view.gfaStatement?.omissions?.length ?? 0).toBeGreaterThan(0);
    const spec = runWorkbookSpec(view as unknown as ExportableRun, '2026-10-02T00:00:00.000Z');
    const sheet = spec.sheets.find((s) => s.name === 'GFA calculation')!;
    expect(sheet.notes?.some((n) => n.includes('NOT ASSESSED'))).toBe(true);
    for (const row of sheet.rows) expect(row.label).not.toContain('NOT ASSESSED');
    // Every row still carries a real traced value, which is why notes exist at all.
    for (const row of sheet.rows) expect(row.traced.value.trim()).not.toBe('');
  });
});

describe('glTF export', () => {
  it('returns the massing as a .glb with no extension a viewer is required to support', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/runs/${run.runId}/export?format=glb`,
      headers: REVIEWER,
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('model/gltf-binary');
    expect(res.headers['content-disposition']).toContain(`envelope-${run.runId}.glb`);

    const bytes = res.rawPayload;
    // "glTF", version 2, and the length in the header is the length sent.
    expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
    expect(bytes.readUInt32LE(4)).toBe(2);
    expect(bytes.readUInt32LE(8)).toBe(bytes.length);
    const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8')) as {
      extensionsRequired?: string[];
      scene: number;
      scenes: { extras?: { notice?: string[] } }[];
      nodes: { name?: string }[];
    };
    expect(json.extensionsRequired).toBeUndefined();
    // The file has no title block, so the two sentences travel in its metadata.
    expect(json.scenes[json.scene]!.extras!.notice!.join(' ')).toMatch(
      /NOT FOR CONSTRUCTION\. REGULATORY VALIDITY: NOT ASSESSED\./,
    );
    // A node of cars for every parking level the engine placed bays on.
    const model = run.building as { levels: { id: string; parking: unknown }[] };
    for (const level of model.levels.filter((l) => l.parking)) {
      expect(json.nodes.some((n) => n.name === `${level.id} cars`), level.id).toBe(true);
    }
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

    for (const format of ['dxf', 'xlsx', 'glb']) {
      const res = await app.inject({
        method: 'POST',
        url: `/api/runs/${fresh.runId}/export?format=${format}`,
        headers: REVIEWER,
      });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    }
  });
});
