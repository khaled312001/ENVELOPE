/**
 * THE WARSAN SHEET, FROM UPLOAD TO BOUND RUN, OVER HTTP.
 *
 * This is the defect's own plot and its own document. The engine tests use a
 * fixture; this one uploads `IC1-CTYL-16_011-warsan1-621.pdf` — the real sheet
 * that printed FAR 3.5 while every run of that plot used the draft rule's 5.00 —
 * and asserts the number the API actually returns.
 *
 * Three things it holds that nothing below the API can:
 *
 *  1. THE SERVER READ THE DOCUMENT. The citation on the rule that bound the run
 *     names a page and a box in bytes this process parsed. A browser posting
 *     `{ far: 3.5 }` would produce the same number with borrowed evidence, and
 *     the test that would still pass is the one worth not writing.
 *  2. THE SHEET SURVIVES STORAGE. It goes into the plot blob and comes back out
 *     a request later, Decimals and citations intact.
 *  3. A SHEET FOR THE WRONG PARCEL IS REFUSED AND SAID. Binding a neighbour's
 *     limits is the precise failure this product exists to prevent, and an
 *     upload is a faster way to get there than an inference.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it } from 'vitest';

import { subjectHash } from '../src/gates.js';
import { build } from '../src/server.js';

const REPO = new URL('../../../', import.meta.url);
const ACTOR = { 'x-actor-id': 'u-sheet', 'x-actor-name': 'Sheet Tester' };
const SHEET = 'docs/00-source/samples/affection-plan/IC1-CTYL-16_011-warsan1-621.pdf';

/** The parcel the sheet names. Anything else must be refused. */
const PARCEL = '6211383';

let pdfBase64: string;

beforeAll(async () => {
  const bytes = await readFile(fileURLToPath(new URL(SHEET, REPO)));
  pdfBase64 = bytes.toString('base64');
});

type SheetReport = {
  attached: boolean;
  documentUri: string | null;
  issuedOn: string | null;
  refused: string | null;
  bound: { parameterId: string; value: string; unit: string; clause: string }[];
  notBound: { field: string; stated: string; reason: string }[];
  setbacks?: {
    tower: Record<string, { kind: string; metres?: string; faces?: { face: string; metres: string | null }[]; clause: string }>;
    podium: Record<string, { kind: string; metres?: string; clause: string }>;
  } | null;
};

/**
 * A 40 × 30 m plot — the shape is irrelevant here, the limits are the subject.
 * One road, as Warsan 6211383 has; `roads: 2` makes boundary 2 a second road,
 * which is the plot on which the sheet's "Front" no longer names a boundary.
 */
function plotBody(plotNumber: string, withSheet: boolean, roads: 1 | 2 = 1) {
  return {
    plotNumber,
    community: 'WARSAN FIRST',
    landUse: 'RESIDENTIAL_MULTI' as const,
    vertices: [
      { x: '0', y: '0' },
      { x: '40', y: '0' },
      { x: '40', y: '30' },
      { x: '0', y: '30' },
    ],
    edges: [
      { seq: 0, classification: 'ROAD' as const, roadHierarchy: 'LOCAL' as const },
      { seq: 1, classification: 'ADJACENT_PLOT' as const },
      roads === 2
        ? { seq: 2, classification: 'ROAD' as const, roadHierarchy: 'LOCAL' as const }
        : { seq: 2, classification: 'ADJACENT_PLOT' as const },
      { seq: 3, classification: 'ADJACENT_PLOT' as const },
    ],
    ...(withSheet ? { affectionPlan: { content: pdfBase64, filename: 'warsan-6211383.pdf' } } : {}),
  };
}

function runBody(plotId: string) {
  return {
    plotId,
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
      basis:
        'the fraction of a parking level left for bays and aisles after cores, ' +
        'ramps and plant. No cited rule fixes it.',
    },
    saleableEfficiency: {
      value: '0.95',
      source: 'USER_SET' as const,
      basis: 'the mid-point of the 93–97% range the developer brief states',
    },
    useDraftRules: true,
  };
}

async function createPlot(plotNumber: string, withSheet: boolean, roads: 1 | 2 = 1) {
  const app = await build();
  const res = await app.inject({
    method: 'POST',
    url: '/api/plots',
    headers: ACTOR,
    payload: plotBody(plotNumber, withSheet, roads),
  });
  return { app, res };
}

describe('the sheet travels with the plot', () => {
  /*
    THE ONE TEST IN THE SUITE THAT NEEDS LONGER THAN THE DEFAULT, AND WHY.

    `vitest.config.ts` deliberately leaves per-test timeouts at 5 s and raises
    only `hookTimeout`, because a suite that gives every test a minute stops
    reporting the hang it was meant to catch. This test is the exception: it is
    the first in the process to post a real affection plan, so it pays for
    loading pdfjs and parsing the PDF inside the test body rather than in a
    `beforeAll`. Alone that is ~2 s; with 55 files collecting in parallel on a
    loaded machine it has been measured at 17 s.

    Raising it here rather than globally keeps the failure specific: if this ever
    exceeds 30 s, something about reading a sheet has genuinely changed.
  */
  const READS_A_REAL_PDF = 30_000;

  it('is read by the server and reported at upload', async () => {
    const { app, res } = await createPlot(PARCEL, true);
    try {
      expect(res.statusCode).toBe(201);
      const sheet = res.json().sheet as SheetReport;

      expect(sheet.attached).toBe(true);
      expect(sheet.refused).toBeNull();
      expect(sheet.documentUri).toBe('warsan-6211383.pdf');
      expect(sheet.issuedOn).toBe('22-12-2025');

      // The printed GFA governs (17 Oct 2026): 4,778.31 ÷ 1,365.23, the printed FAR 3.50 its cross-check.
      const far = sheet.bound.find((b) => b.parameterId === 'far.max');
      expect(far?.value).toBe('3.500003');
      expect(far?.clause).toMatch(/^the printed GFA governs and the printed FAR 3\.5 is its cross-check/);
      // The clause is the sheet's own text, located by the parser in this process.
      expect(far?.clause.length).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  }, READS_A_REAL_PDF);

  it('names every limit it will not bind, with the reason', async () => {
    const { app, res } = await createPlot(PARCEL, true);
    try {
      const sheet = res.json().sheet as SheetReport;
      const fields = sheet.notBound.map((n) => n.field);

      // This sheet states a GFA and a FAR; the GFA binds and the FAR is listed as
      // the cross-check it passed. Its parking is referred to the master
      // developer's DCR, which is not on file, and that is said rather than
      // Table B.13 being applied in silence. Its height in levels binds as a
      // count, and its TOWER row binds too — the tower coverage and the tower
      // setbacks used to be listed here and cut nothing.
      expect(fields).toEqual(['far', 'parking.deferred']);
      expect(sheet.notBound[0]?.stated).toBe('FAR 3.5; GFA 4778.31 m² ÷ plot area 1365.23 m² = 3.500003');
      for (const n of sheet.notBound) expect(n.reason.length).toBeGreaterThan(30);
    } finally {
      await app.close();
    }
  }, READS_A_REAL_PDF);

  it('binds the tower row as the tower’s and the podium row as the podium’s', async () => {
    const { app, res } = await createPlot(PARCEL, true);
    try {
      const sheet = res.json().sheet as SheetReport;
      const bound = new Map(sheet.bound.map((b) => [b.parameterId, b]));
      expect(bound.get('tower_coverage.max')?.value).toBe('60');
      expect(bound.get('tower_coverage.max')?.clause).toMatch(/^Tower/);
      expect(bound.get('setback.adjacent_plot')?.value).toBe('3');
      expect(bound.get('setback.adjacent_plot')?.clause).toMatch(/^Tower/);
      expect(bound.get('setback.podium.adjacent_plot')?.value).toBe('0');
      expect(bound.get('setback.podium.adjacent_plot')?.clause).toMatch(/^GF/);
      // What the plot step reads, per kind of boundary: never the podium's 0 under the tower's name.
      expect(sheet.setbacks?.tower['ADJACENT_PLOT']).toMatchObject({ kind: 'FIXED', metres: '3' });
      expect(sheet.setbacks?.tower['ROAD']).toMatchObject({ kind: 'FIXED', metres: '0' });
      expect(sheet.setbacks?.podium['ADJACENT_PLOT']).toMatchObject({ kind: 'FIXED', metres: '0' });
    } finally {
      await app.close();
    }
  }, READS_A_REAL_PDF);

  it('on a plot with two roads, says the front is a question and asks it per road', async () => {
    const { app, res } = await createPlot(PARCEL, true, 2);
    try {
      const sheet = res.json().sheet as SheetReport;
      expect(sheet.notBound.map((n) => n.field)).toContain('setbacks.tower.front');
      const road = sheet.setbacks?.tower['ROAD'];
      expect(road?.kind).toBe('BY_FACE');
      expect(road?.faces?.map((f) => `${f.face} ${f.metres}`)).toEqual(['front 0', 'side 3', 'rear 3']);
    } finally {
      await app.close();
    }
  }, READS_A_REAL_PDF);

  it('refuses a sheet issued for another parcel, and says which', async () => {
    const { app, res } = await createPlot('0000000', true);
    try {
      expect(res.statusCode).toBe(201);
      const sheet = res.json().sheet as SheetReport;

      expect(sheet.attached).toBe(true);
      expect(sheet.refused).toContain(PARCEL);
      expect(sheet.bound).toEqual([]);
    } finally {
      await app.close();
    }
  });

  it('a plot with no sheet is a plot, and says nothing about one', async () => {
    const { app, res } = await createPlot(PARCEL, false);
    try {
      expect(res.statusCode).toBe(201);
      const sheet = res.json().sheet as SheetReport;
      expect(sheet.attached).toBe(false);
      expect(sheet.bound).toEqual([]);
      expect(sheet.notBound).toEqual([]);
    } finally {
      await app.close();
    }
  });

  it('refuses an upload that is not a PDF, before the plot is stored', async () => {
    const app = await build();
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/plots',
        headers: ACTOR,
        payload: {
          ...plotBody(PARCEL, false),
          affectionPlan: {
            content: Buffer.from('this is not a pdf').toString('base64'),
            filename: 'sheet.pdf',
          },
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe('not a PDF');

      // And nothing was stored under that plot number.
      const list = await app.inject({ method: 'GET', url: '/api/plots', headers: ACTOR });
      expect(
        (list.json() as { plots?: { plotNumber: string }[] }).plots?.some(
          (p) => p.plotNumber === PARCEL,
        ) ?? false,
      ).toBe(false);
    } finally {
      await app.close();
    }
  });
});

describe('the sheet binds the run', () => {
  it('the published regulatory band comes from the sheet, not the draft rule', async () => {
    const app = await build();
    try {
      const withSheet = await app.inject({
        method: 'POST',
        url: '/api/plots',
        headers: ACTOR,
        payload: plotBody(PARCEL, true),
      });
      const without = await app.inject({
        method: 'POST',
        url: '/api/plots',
        headers: ACTOR,
        payload: plotBody(PARCEL, false),
      });

      const bound = await app.inject({
        method: 'POST',
        url: '/api/runs',
        headers: ACTOR,
        payload: runBody(withSheet.json().plotId),
      });
      const loose = await app.inject({
        method: 'POST',
        url: '/api/runs',
        headers: ACTOR,
        payload: runBody(without.json().plotId),
      });

      expect(bound.statusCode).toBe(201);
      expect(loose.statusCode).toBe(201);

      // 1,200 m² of plot entered. The seed rule says FAR 5.00 → 6,000 m². The
      // sheet prints GFA 4,778.31 m² on a plot area of 1,365.23 m², and that GFA
      // is band A: it was 3.500003 × the 1,200 m² entered = 4,200.0036 m², a
      // permitted GFA the sheet never printed, off by the tracing.
      const band = (r: { json(): unknown }): string =>
        (r.json() as { capacity: { bandA: { value: string } } }).capacity.bandA.value;

      expect(band(loose)).toBe('6000');
      expect(band(bound)).toBe('4778.31');
    } finally {
      await app.close();
    }
  });

  it('the run says which document bound it', async () => {
    const app = await build();
    try {
      const plot = await app.inject({
        method: 'POST',
        url: '/api/plots',
        headers: ACTOR,
        payload: plotBody(PARCEL, true),
      });
      const run = await app.inject({
        method: 'POST',
        url: '/api/runs',
        headers: ACTOR,
        payload: runBody(plot.json().plotId),
      });

      const sheet = run.json().sheet as SheetReport;
      expect(sheet.documentUri).toBe('warsan-6211383.pdf');
      expect(sheet.bound.map((b) => b.parameterId)).toContain('far.max');
      expect(sheet.refused).toBeNull();
    } finally {
      await app.close();
    }
  });

  it('accepts the sheet’s own 3 m typed on a neighbour, where it used to quote the podium’s 0 m back', async () => {
    const app = await build();
    try {
      const plot = await app.inject({ method: 'POST', url: '/api/plots', headers: ACTOR, payload: plotBody(PARCEL, true) });
      const typed = (metres: string) =>
        app.inject({
          method: 'POST',
          url: '/api/runs',
          headers: ACTOR,
          payload: { ...runBody(plot.json().plotId), typedSetbacks: [{ edgeSeq: 1, metres }] },
        });
      const agrees = await typed('3');
      expect(agrees.statusCode).toBe(201);
      const refused = await typed('2');
      expect(refused.statusCode).toBe(422);
      expect(refused.json().message).toContain('states a tower setback of 3 m for this boundary');
      expect(refused.json().message).not.toMatch(/states 0 m|setback of 0 m/);
    } finally {
      await app.close();
    }
  }, 30_000);

  /*
    TWO ROADS: the run asks which face each road is, and the answer travels.
    Then the stored run carries what the sheet left unbound, and the study's
    annex prints it — in the reader's language, the sheet's words as printed.
  */
  it('halts on two roads until each road’s face is named, and the study lists what was not bound', async () => {
    const app = await build();
    try {
      const plot = await app.inject({ method: 'POST', url: '/api/plots', headers: ACTOR, payload: plotBody(PARCEL, true, 2) });
      const plotId = plot.json().plotId as string;

      const asked = await app.inject({ method: 'POST', url: '/api/runs', headers: ACTOR, payload: runBody(plotId) });
      expect(asked.statusCode).toBe(422);
      expect(asked.json().message).toMatch(
        /^edge 0: the affection plan states the tower setback by face \(front 0 m; side 3 m; rear 3 m\) and does not say which face this boundary is\./,
      );

      const res = await app.inject({
        method: 'POST',
        url: '/api/runs',
        headers: ACTOR,
        payload: {
          ...runBody(plotId),
          typedSetbacks: [
            { edgeSeq: 0, metres: '0' },
            { edgeSeq: 2, metres: '3' },
          ],
        },
      });
      expect(res.statusCode).toBe(201);
      const run = res.json() as Record<string, unknown> & { runId: string; sheet: SheetReport };
      expect(run.sheet.notBound.map((n) => n.field)).toContain('setbacks.tower.front');

      const hashes = {
        G3_ASSUMPTIONS_ACKNOWLEDGED: subjectHash(run['assumptions']),
        G4_REVIEWER_NAMED: subjectHash(run['capacity']),
      };
      for (const [gate, hash] of Object.entries(hashes)) {
        const signed = await app.inject({
          method: 'POST',
          url: `/api/runs/${run.runId}/gates`,
          headers: gate === 'G4_REVIEWER_NAMED' ? { ...ACTOR, 'x-actor-licence': 'DM-12345' } : ACTOR,
          payload: { gate, subjectHash: hash },
        });
        expect(signed.statusCode, gate).toBe(200);
      }
      const study = (lang: 'en' | 'ar') =>
        app.inject({
          method: 'POST',
          url: `/api/runs/${run.runId}/export?format=html&lang=${lang}`,
          headers: { ...ACTOR, 'x-actor-licence': 'DM-12345' },
        });
      const en = await study('en');
      expect(en.statusCode).toBe(200);
      expect(en.body).toContain('Limits the affection plan states that this study does not apply');
      expect(en.body).toContain('Tower setback, front');
      expect(en.body).toContain('Tower: Front = 0m, Sides &amp; Rear = 3m');
      const ar = await study('ar');
      expect(ar.body).toContain('حدود يذكرها مخطط الأفكشن ولا تطبقها هذه الدراسة');
      expect(ar.body).toContain('ارتداد البرج، الحد الأمامي');
    } finally {
      await app.close();
    }
  }, 60_000);
});
