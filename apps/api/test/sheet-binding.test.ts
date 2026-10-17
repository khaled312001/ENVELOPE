/**
 * What a plot's own sheet binds at `POST /api/runs`, and what stops a run (17 Oct 2026).
 *
 * The defects, as a reader met them:
 *
 *  - A plot whose sheet prints no FAR was computed anyway, on the seed's
 *    placeholder FAR of 5.00 — `blockingGaps()` stopped nothing past intake.
 *  - The seed's placeholder plate cap of 1,280 m² governed plots whose sheet
 *    states no plate at all, every figure marked DERIVED.
 *  - The per-side table and the sheet's parking requirement were read, shown
 *    and bound to nothing.
 *  - The bound list printed rules fenced to plots this one is not.
 *
 * Two of the reference sheets are not in the repository; their tests skip with a
 * message when the file is absent, and the committed samples carry the rest.
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { PROJECT_BRIEFS } from '@envelope/rules';

import { build } from '../src/server.js';
import { SqliteRunRepository, type StoredPlot } from '../src/store.js';

const REPO = new URL('../../../', import.meta.url);
const ACTOR = { 'x-actor-id': 'u-binding', 'x-actor-name': 'Binding Tester' };
const SLOW = 60_000;

const sample = (name: string): string => fileURLToPath(new URL(`docs/00-source/samples/affection-plan/${name}`, REPO));

/** A reference sheet kept out of the repository: the checkout root, or the main checkout's when this is a worktree. */
function reference(name: string): string | undefined {
  for (const base of [REPO, new URL('../../../', REPO)]) {
    const path = fileURLToPath(new URL(name, base));
    if (existsSync(path)) return path;
  }
  return undefined;
}

const b64 = async (path: string): Promise<string> => (await readFile(path)).toString('base64');

type Edge = { seq: number; classification: 'ROAD' | 'ADJACENT_PLOT'; roadHierarchy?: 'LOCAL' };
const rect = (w: number, d: number) => [
  { x: '0', y: '0' },
  { x: String(w), y: '0' },
  { x: String(w), y: String(d) },
  { x: '0', y: String(d) },
];
const oneRoad: Edge[] = [
  { seq: 0, classification: 'ROAD', roadHierarchy: 'LOCAL' },
  { seq: 1, classification: 'ADJACENT_PLOT' },
  { seq: 2, classification: 'ADJACENT_PLOT' },
  { seq: 3, classification: 'ADJACENT_PLOT' },
];

function plotBody(plotNumber: string, sheet?: string, vertices = rect(40, 30), edges: Edge[] = oneRoad) {
  return {
    plotNumber,
    community: 'TEST',
    landUse: 'RESIDENTIAL_MULTI' as const,
    vertices,
    edges,
    ...(sheet ? { affectionPlan: { content: sheet, filename: `${plotNumber}.pdf` } } : {}),
  };
}

function runBody(plotId: string, mix: readonly (readonly [string, string])[] = [['1BED', '70'], ['2BED', '110']], extra: object = {}) {
  return {
    plotId,
    parkingInFar: 'EXCLUDED_FROM_FAR' as const,
    unitMix: {
      source: 'USER_SET' as const,
      entries: mix.map(([typeId, nsaM2]) => ({ typeId, label: typeId, share: String(1 / mix.length), nsaM2 })),
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

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function filed(app: Awaited<ReturnType<typeof build>>, body: object): Promise<Json> {
  const res = await app.inject({ method: 'POST', url: '/api/plots', headers: ACTOR, payload: body });
  expect(res.statusCode, res.body).toBe(201);
  return res.json() as Json;
}

async function run(app: Awaited<ReturnType<typeof build>>, body: object): Promise<{ status: number; json: Json }> {
  const res = await app.inject({ method: 'POST', url: '/api/runs', headers: ACTOR, payload: body });
  return { status: res.statusCode, json: res.json() as Json };
}

/** The sheet's own survey ring, shifted to its first corner, as the studio enters it. */
async function surveyRing(app: Awaited<ReturnType<typeof build>>, content: string) {
  const res = await app.inject({ method: 'POST', url: '/api/intake/affection-plan', headers: ACTOR, payload: { content, filename: 'sheet.pdf' } });
  const pts = (res.json() as Json)['facts'].survey.points.value as { east: string; north: string }[];
  const e0 = Number(pts[0]!.east);
  const n0 = Number(pts[0]!.north);
  return pts.map((p) => ({ x: (Number(p.east) - e0).toFixed(3), y: (Number(p.north) - n0).toFixed(3) }));
}

describe('the bound list holds only what applies to this plot', () => {
  it('lists one front setback on a one-road plot, not the two-road plot’s question beside it', async () => {
    const app = await build();
    try {
      const plot = await filed(app, plotBody('6211383', await b64(sample('IC1-CTYL-16_011-warsan1-621.pdf'))));
      const roads = (plot['sheet'].bound as Json[]).filter((b) => b['parameterId'] === 'setback.road');
      expect(roads.map((b) => b['value'])).toEqual(['0']);
    } finally {
      await app.close();
    }
  }, SLOW);
});

describe('no placeholder stands in for a sheet', () => {
  it('sets the seed’s placeholder limits aside on a plot with its own sheet, and names each', async () => {
    const app = await build();
    try {
      const plot = await filed(app, plotBody('6211383', await b64(sample('IC1-CTYL-16_011-warsan1-621.pdf'))));
      const r = await run(app, runBody(plot['plotId']));
      expect(r.status, JSON.stringify(r.json)).toBe(201);
      const aside = (r.json['sheet'].placeholdersNotApplied as Json[]).map((p) => p['ruleId']);
      expect(aside).toEqual(expect.arrayContaining(['R-FAR-MAX-RES', 'R-TOWER-PLATE-MAX-RES', 'R-COVERAGE-MAX-RES']));
      // The plate is bounded by the sheet's tower coverage, not by 1,280 m² from the PRD's appendix.
      expect(JSON.stringify(r.json['provenance'])).not.toContain('R-TOWER-PLATE-MAX-RES');
      expect(aside).not.toContain(r.json['capacity'].governingConstraint?.ruleId);
    } finally {
      await app.close();
    }
  }, SLOW);

  it('leaves a plot without a sheet on the general rules, as before, and sets nothing aside', async () => {
    const app = await build();
    try {
      const plot = await filed(app, plotBody('6211383'));
      const r = await run(app, runBody(plot['plotId']));
      expect(r.status).toBe(201);
      expect(r.json['sheet'].attached).toBe(false);
      expect(r.json['sheet'].placeholdersNotApplied).toEqual([]);
    } finally {
      await app.close();
    }
  }, SLOW);
});

/*
  A sheet that omits its FAR, made from the Warsan sheet by taking its FAR and
  GFA off the stored copy — what DJAZ1MED12RES011 and 6468096 are on file. Once
  as a sheet stored before `blocking` was kept (the fallback), once with it.
*/
class Doctored extends SqliteRunRepository {
  constructor(private readonly keepBlocking: boolean) {
    super();
  }
  override async getPlot(plotId: string): Promise<StoredPlot | undefined> {
    const s = await super.getPlot(plotId);
    if (!s) return s;
    const w = JSON.parse(s.plot) as Json;
    if (w['sheet']) {
      delete w['sheet'].far;
      delete w['sheet'].gfaM2;
      if (this.keepBlocking) {
        w['sheet'].blocking = [
          { field: 'far', label: 'FAR', consequence: 'Floor area ratio is not printed on this sheet.' },
          { field: 'gfa_permitted_sqm', label: 'GFA', consequence: 'Maximum GFA is not printed on this sheet.' },
        ];
      } else {
        delete w['sheet'].blocking;
      }
    }
    return { ...s, plot: JSON.stringify(w) };
  }
}

describe('a limit the sheet omits refuses the run, in a sentence', () => {
  for (const keepBlocking of [true, false]) {
    it(`names what the sheet does not state (${keepBlocking ? 'as stored' : 'a sheet stored before 17 Oct 2026'})`, async () => {
      const app = await build(new Doctored(keepBlocking));
      try {
        const plot = await filed(app, plotBody('6211383', await b64(sample('IC1-CTYL-16_011-warsan1-621.pdf'))));
        const r = await run(app, runBody(plot['plotId']));
        expect(r.status).toBe(422);
        expect(r.json['error']).toBe('RunBlockedError');
        expect(r.json['gate']).toBe('G2:sheet');
        expect(r.json['message']).toBe(
          `plot 6211383: its affection plan does not state ${keepBlocking ? 'FAR and GFA' : 'FAR'}, and the study does not ` +
            'fill a limit the plot’s own instrument leaves out. Supply it from the instrument that states it (the master ' +
            'plan or the DCR), or select this plot’s project brief where one is on file; a placeholder figure is not used ' +
            'in its place.',
        );
      } finally {
        await app.close();
      }
    }, SLOW);
  }

  const coa = reference('COA-CPT2-6468096-Z6-04.pdf');
  it.skipIf(!coa)('refuses 6468096, whose sheet prints SEE NOTES for its GFA and height (skipped: reference sheet absent)', async () => {
    const app = await build();
    try {
      const plot = await filed(app, plotBody('6468096', await b64(coa!), rect(70, 64)));
      expect((plot['sheet'].blocking as Json[]).map((g) => g['field'])).toEqual(['gfa_permitted_sqm', 'far', 'height_allowance']);
      const r = await run(app, runBody(plot['plotId']));
      expect(r.status).toBe(422);
      expect(r.json['message']).toMatch(/^plot 6468096: its affection plan does not state GFA, FAR and Height,/);
    } finally {
      await app.close();
    }
  }, SLOW);
});

describe('a project brief, named by the run', () => {
  /** The brief on file for plot 5180196, by its own id. */
  const BRIEF_ID = PROJECT_BRIEFS.find((b) => b.plotNumber === '5180196')!.briefId;

  it('binds the brief’s GFA ÷ its plot area and marks it as the brief’s', async () => {
    const app = await build();
    try {
      const plot = await filed(app, plotBody('5180196'));
      const r = await run(app, runBody(plot['plotId'], undefined, { projectBriefId: BRIEF_ID }));
      expect(r.status, JSON.stringify(r.json)).toBe(201);
      expect(r.json['sheet'].briefBound).toMatchObject([{ parameterId: 'far.max', value: '5.05381' }]);
      expect(r.json['sheet'].briefBound[0].clause).toMatch(/^Developer brief, not an authority document/);
      // 1,200 m² entered × 5.05381, not the placeholder's 5.00.
      expect(r.json['capacity'].bandA.value).toBe('6064.572');
    } finally {
      await app.close();
    }
  }, SLOW);

  it('refuses a brief that is not this plot’s, and one this deployment does not serve', async () => {
    for (const [options, plotNumber] of [[{}, '6211383'], [{ developerStandards: false }, '5180196']] as const) {
      const app = await build(undefined, undefined, options);
      try {
        const plot = await filed(app, plotBody(plotNumber));
        const r = await run(app, runBody(plot['plotId'], undefined, { projectBriefId: BRIEF_ID }));
        expect(r.status).toBe(422);
        expect(r.json['message']).toBe(
          `no project brief "${BRIEF_ID}" is on file for plot ${plotNumber}. Send the id of this plot’s brief, or none.`,
        );
      } finally {
        await app.close();
      }
    }
  }, SLOW);
});

describe('the sheet’s parking requirement, over Table B.13', () => {
  const MAMZAR = sample('DM-1341556-al-mamzar.pdf');

  it('is bound and cited on the Municipality’s sheet, and the run counts by it', async () => {
    const app = await build();
    try {
      const plot = await filed(app, plotBody('1341556', await b64(MAMZAR), rect(90, 82)));
      expect((plot['sheet'].bound as Json[]).find((b) => b['parameterId'] === 'parking.demand')?.['value']).toBe(
        '1 per dwelling ≤ 150 m², 2 above; studio 1',
      );
      const r = await run(app, runBody(plot['plotId'], [['1BED', '70'], ['3BED', '160']]));
      expect(r.status, JSON.stringify(r.json).slice(0, 400)).toBe(201);
      /*
        The resident bays are the sheet's count, by area — not Table B.13's by bedroom.
        Band C names the first parking rule loaded, so a citation alone would pass
        while B.13 still counted; the formula is what only the sheet's rule writes.
      */
      const provenance = JSON.stringify(r.json['provenance']);
      expect(provenance).toMatch(/INSTRUMENT\.1341556[^"]*\.parking\.demand/);
      expect(provenance).toContain('bays by the sheet’s area threshold');
    } finally {
      await app.close();
    }
  }, SLOW);

  it('asks, with both readings, where the area it does not name changes the count', async () => {
    const app = await build();
    try {
      const plot = await filed(app, plotBody('1341556', await b64(MAMZAR), rect(90, 82)));
      const r = await run(app, runBody(plot['plotId'], [['1BED', '70'], ['3BED', '145']]));
      expect(r.status).toBe(422);
      expect(r.json['error']).toBe('InstrumentQuestionError');
      expect(r.json['message']).toMatch(
        /^parking: the affection plan requires 1 bay\(s\) for a dwelling of 150 m² or less and 2 above, and does not say on which area\. A 3BED unit is 145\.00 m² saleable and 152\.63\d* m² of GFA/,
      );
    } finally {
      await app.close();
    }
  }, SLOW);
});

describe('the per-side table, on a plot entered from the sheet’s own coordinate table', () => {
  it('names the boundaries no side of the DDA table names, and binds nothing it defers', async () => {
    const app = await build();
    try {
      const content = await b64(sample('DDA-5134565-saih-shuaib-1.pdf'));
      const vertices = await surveyRing(app, content);
      const edges = vertices.map((_, seq): Edge => ({ seq, classification: 'ADJACENT_PLOT' }));
      const plot = await filed(app, plotBody('5134565', content, vertices, edges));
      const notBound = plot['sheet'].notBound as Json[];
      expect(notBound.find((n) => n['field'] === 'setbacks.unnamed_sides')?.['stated']).toBe('edges 1, 3');
      expect(notBound.find((n) => n['field'] === 'setbacks.by_side')).toBeDefined();
      expect((plot['sheet'].bound as Json[]).map((b) => b['parameterId'])).not.toContain('setback.adjacent_plot');
      expect((plot['sheet'].bound as Json[]).find((b) => b['parameterId'] === 'parking.demand')?.['value']).toBe(
        '1 per dwelling ≤ 150 m² (GFA), 2 above',
      );
    } finally {
      await app.close();
    }
  }, SLOW);

  const wadi = reference('6457790-12.pdf');
  it.skipIf(!wadi)('binds 6457790’s eight figures, side by side (skipped: reference sheet absent)', async () => {
    const app = await build();
    try {
      const content = await b64(wadi!);
      const vertices = await surveyRing(app, content);
      const edges = vertices.map((_, seq): Edge => ({ seq, classification: 'ADJACENT_PLOT' }));
      const plot = await filed(app, plotBody('6457790', content, vertices, edges));
      const bySeq = plot['sheet'].setbacks.bySeq as { tower: Json; podium: Json };
      const metres = (row: Json): string[] => Object.keys(row).sort().map((k) => row[k].metres);
      expect(metres(bySeq.tower).sort()).toEqual(['5', '7', '7', '7']);
      expect(metres(bySeq.podium).sort()).toEqual(['4', '6', '6', '6']);
      const r = await run(app, runBody(plot['plotId'], undefined, { podiumSetbackStatementId: 'STMT-PODIUM-SETBACK-2026-10-16' }));
      expect(r.status, JSON.stringify(r.json).slice(0, 400)).toBe(201);
      // 2,624.73 m² of plot, inside 4/6/6/6 m: the podium no longer stands on the boundary the sheet sets back.
      expect(Number(r.json['envelope'].podiumFootprint.value)).toBeLessThan(1700);
    } finally {
      await app.close();
    }
  }, SLOW);
});
