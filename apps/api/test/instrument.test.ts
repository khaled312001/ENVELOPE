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
};

/** A 40 × 30 m plot — the shape is irrelevant here, the limits are the subject. */
function plotBody(plotNumber: string, withSheet: boolean) {
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
      { seq: 2, classification: 'ROAD' as const, roadHierarchy: 'LOCAL' as const },
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

async function createPlot(plotNumber: string, withSheet: boolean) {
  const app = await build();
  const res = await app.inject({
    method: 'POST',
    url: '/api/plots',
    headers: ACTOR,
    payload: plotBody(plotNumber, withSheet),
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

      const far = sheet.bound.find((b) => b.parameterId === 'far.max');
      expect(far?.value).toBe('3.5');
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

      // This sheet states a GFA, a tower coverage, a tower setback schedule and a
      // height in levels. None of the four binds a parameter, and all four are said.
      expect(fields).toContain('gfaSqm');
      expect(fields).toContain('coverage.tower');
      expect(fields).toContain('setbacks.tower');
      expect(fields).toContain('height');
      for (const n of sheet.notBound) expect(n.reason.length).toBeGreaterThan(30);
    } finally {
      await app.close();
    }
  });

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

      // 1,200 m² of plot. The seed rule says FAR 5.00 → 6,000 m²; the sheet says
      // 3.5 → 4,200 m². The second number is the one the document printed, and
      // the first is what this plot reported before the sheet reached the engine.
      const band = (r: { json(): unknown }): string =>
        (r.json() as { capacity: { bandA: { value: string } } }).capacity.bandA.value;

      expect(band(loose)).toBe('6000');
      expect(band(bound)).toBe('4200');
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
});
