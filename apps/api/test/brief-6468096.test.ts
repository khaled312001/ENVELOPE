/**
 * Plot 6468096's project brief, encoded (17 Oct 2026).
 *
 * Until it was on file the plot was refused at the run with nothing a reader
 * could select: its affection plan prints SEE NOTES against its GFA, its FAR
 * and its height. These hold the record to the PDF it was read from, box by
 * box, and hold the run to what the brief may and may not fill: the GFA gap,
 * yes, under the brief's name; the height, no — the brief states a ceiling for
 * every plot of the request, not this plot's height.
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it } from 'vitest';

import { Decimal, type Citation } from '@envelope/core';
import { readPdfText } from '@envelope/intake';
import { engineNote } from '@envelope/report/words';
import { BRIEF_PLOT_6468096, PROJECT_BRIEFS, briefFor, rulesFromBrief } from '@envelope/rules';

import { build } from '../src/server.js';

const REPO = new URL('../../../', import.meta.url);
const ACTOR = { 'x-actor-id': 'u-brief-6468096', 'x-actor-name': 'Brief Tester' };
const SLOW = 60_000;

/** A document beside the repository or the main checkout's, when this is a worktree. */
function onDisk(relative: string): string | undefined {
  for (const base of [REPO, new URL('../../../', REPO)]) {
    const path = fileURLToPath(new URL(relative, base));
    if (existsSync(path)) return path;
  }
  return undefined;
}

const BRIEF_PDF = onDisk(BRIEF_PLOT_6468096.citation.documentUri.replace(/ /g, '%20'));
const COA = onDisk('COA-CPT2-6468096-Z6-04.pdf');

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const rect = (w: number, d: number) => [
  { x: '0', y: '0' },
  { x: String(w), y: '0' },
  { x: String(w), y: String(d) },
  { x: '0', y: String(d) },
];
const EDGES = [
  { seq: 0, classification: 'ROAD', roadHierarchy: 'LOCAL' },
  { seq: 1, classification: 'ROAD', roadHierarchy: 'LOCAL' },
  { seq: 2, classification: 'ROAD', roadHierarchy: 'LOCAL' },
  { seq: 3, classification: 'ROAD', roadHierarchy: 'LOCAL' },
];

const plotBody = (sheet?: string) => ({
  plotNumber: '6468096',
  community: 'WADI AL SAFA 4',
  landUse: 'RESIDENTIAL_MULTI',
  vertices: rect(70, 64),
  edges: EDGES,
  ...(sheet ? { affectionPlan: { content: sheet, filename: 'COA-CPT2-6468096-Z6-04.pdf' } } : {}),
});

const runBody = (plotId: string, extra: object = {}) => ({
  plotId,
  parkingInFar: 'EXCLUDED_FROM_FAR',
  unitMix: { source: 'USER_SET', entries: [{ typeId: '1BED', label: '1BED', share: '1', nsaM2: '70' }] },
  parkingLevelsAvailable: 2,
  parkingUsableFraction: { value: '0.85', source: 'ASSUMED', basis: 'a stated fraction for this test, from no rule.' },
  saleableEfficiency: { value: '0.95', source: 'USER_SET' },
  useDraftRules: true,
  ...extra,
});

describe('the record', () => {
  const brief = briefFor(PROJECT_BRIEFS, '6468096')!;

  it('is on file for the plot, under a neutral id', () => {
    expect(brief.briefId).toBe('BRIEF-6468096');
    expect(brief.gfaM2.value).toBe('21604.61');
  });

  it('takes the plot area from the printed square feet, exactly', () => {
    expect(new Decimal('48075').times('0.09290304').toString()).toBe(brief.plotAreaM2.value);
    expect(brief.plotAreaM2.citation.sourceTextVerbatim).toBe('48,075');
  });

  it('prints no FAR, and the bound clause says there is none to cross-check', () => {
    expect(brief.far).toBeUndefined();
    const [rule] = rulesFromBrief(brief, { plotNumber: '6468096', authoredBy: 'test', sheetBinds: new Set() });
    expect(rule?.evaluatorArgs).toEqual({ value: '4.837235' });
    expect(rule?.citation.sourceTextVerbatim).toContain('the brief prints no FAR to cross-check it against');
  });

  /* The clause is what the plot step and the study's annex print under "bound by the brief". */
  it('says what it bound in Arabic, the brief’s own words quoted as printed', () => {
    for (const b of PROJECT_BRIEFS) {
      const [rule] = rulesFromBrief(b, { plotNumber: b.plotNumber, authoredBy: 'test', sheetBinds: new Set() });
      const ar = engineNote(rule!.citation.sourceTextVerbatim, 'ar');
      expect(ar, b.briefId).not.toBeNull();
      expect(ar!).toMatch(/موجز مطور، وليس وثيقة نظامية/);
      expect(ar!).toContain(b.gfaM2.value);
      expect(ar!).toContain(`«${b.citation.sourceTextVerbatim}»`);
      expect(ar!).toContain(b.far ? `معامل البناء في الموجز ${b.far.value}` : 'لا يطبع معامل بناء');
    }
  });

  /* The rules step's brief card prints each brief's own notes; on an Arabic page each needs its entry. */
  it('says every note of every brief on file in Arabic', () => {
    for (const b of PROJECT_BRIEFS) {
      const notes = [b.plotAreaM2, b.gfaM2, b.far, b.heightCode, b.landUse, b.levels].map((x) => x?.note);
      for (const n of [...notes, ...b.notMechanized].filter((x): x is string => Boolean(x))) {
        const ar = engineNote(n, 'ar');
        expect(ar, `${b.briefId}: ${n}`).not.toBeNull();
        expect(ar!).toMatch(/[؀-ۿ]/);
      }
    }
  });

  it('records the height as printed, and says it is not this plot’s', () => {
    expect(brief.heightCode.value).toBe('G+5P+45');
    expect(brief.heightCode.note).toMatch(/binds nothing here/);
  });
});

/*
  EVERY BOX, RE-READ FROM THE PDF. A transcription carries its page and box so a
  reviewer can check it instead of trusting it; this is that check, run. The
  boxes are y-down from the top of the page (the other briefs' convention), and
  pdfjs reports y-up, so each item's centre is flipped before it is tested.
*/
describe.skipIf(!BRIEF_PDF)('every citation’s box holds its figure (skipped: the brief PDF is absent)', () => {
  const brief = BRIEF_PLOT_6468096;
  const citations: readonly (readonly [string, Citation])[] = [
    ['brief', brief.citation],
    ['plot area', brief.plotAreaM2.citation],
    ['gfa', brief.gfaM2.citation],
    ['height', brief.heightCode.citation],
    ['land use', brief.landUse.citation],
    ['levels', brief.levels!.citation],
  ];

  /*
    Read once, in the hook. pdfjs takes seconds to load cold, and inside the
    first `it` that ran past the 5 s per-test default whenever the suite was busy
    (18 s once) — a flake on how loaded the laptop was, not on the brief.
  */
  type Page = Awaited<ReturnType<typeof readPdfText>>[number];
  const pages = new Map<number, Page>();
  beforeAll(async () => {
    const bytes = new Uint8Array(await readFile(BRIEF_PDF!));
    const wanted = [...new Set([3, ...citations.map(([, c]) => c.sourcePage!)])];
    const read = await readPdfText(bytes, { pages: wanted });
    wanted.forEach((n, i) => pages.set(n, read[i]!));
  });

  /*
    "All the above plots … range up to G+5P+45" is a sentence about a list, and
    the first draft of the height note read it as a ceiling for OTHER plots, "not
    this one". The list on p3 holds this plot and nothing else. Read it off the
    page, so a note that says the ceiling belongs to somebody else's parcel fails.
  */
  it('height: the plots the ceiling is written of are this plot alone, and the notes say so', () => {
    const page = pages.get(3);
    const listed = page!.items.map((i) => i.text.trim()).filter((t) => /^\d{7}-/.test(t));
    expect(listed).toEqual(['6468096-Z6-04']);
    expect(brief.heightCode.note).toMatch(/it lists only this one/);
    for (const said of [brief.heightCode.note!, ...brief.notMechanized]) {
      expect(said).not.toMatch(/not (?:as |for )this (?:plot|one)/);
    }
  });

  for (const [name, c] of citations) {
    it(`${name}: page ${c.sourcePage}`, () => {
      const page = pages.get(c.sourcePage!);
      const [x0, top, x1, bottom] = c.sourceBbox!;
      const inside = page!.items
        .filter((i) => {
          const cx = (i.bbox[0] + i.bbox[2]) / 2;
          const cy = page!.height - (i.bbox[1] + i.bbox[3]) / 2;
          return cx >= x0 && cx <= x1 && cy >= top && cy <= bottom;
        })
        .map((i) => i.text)
        .join(' ');
      // Every figure the quote carries is printed inside the box — or, for a quote with no figure, every word.
      const words = c.sourceTextVerbatim.split(/\s+/).map((w) => w.replace(/[.,;]+$/, ''));
      const figures = words.some((w) => /\d/.test(w)) ? words.filter((w) => /\d/.test(w)) : words;
      expect(figures.length).toBeGreaterThan(0);
      for (const f of figures) expect(inside, `${name}: ${f}`).toContain(f);
    });
  }
});

describe('the run, naming the brief', () => {
  it('binds the brief’s GFA ÷ its plot area on the plot, marked as the brief’s', async () => {
    const app = await build();
    try {
      const plot = await app.inject({ method: 'POST', url: '/api/plots', headers: ACTOR, payload: plotBody() });
      expect(plot.statusCode, plot.body).toBe(201);
      const r = await app.inject({
        method: 'POST',
        url: '/api/runs',
        headers: ACTOR,
        payload: runBody((plot.json() as Json)['plotId'], { projectBriefId: 'BRIEF-6468096' }),
      });
      expect(r.statusCode, r.body).toBe(201);
      const run = r.json() as Json;
      expect(run['sheet'].briefBound).toMatchObject([{ parameterId: 'far.max', value: '4.837235' }]);
      // 70 × 64 = 4,480 m² entered, × 4.837235: the brief's ratio, on this plot's own area.
      expect(run['capacity'].bandA.value).toBe(new Decimal('4.837235').times(4480).toString());
    } finally {
      await app.close();
    }
  }, SLOW);

  it('serves it on the standards endpoint with no FAR and its levels as printed', async () => {
    const app = await build();
    try {
      const res = await app.inject({ method: 'GET', url: '/api/standards?plotNumber=6468096', headers: ACTOR });
      const brief = (res.json() as Json)['brief'];
      expect(brief.briefId).toBe('BRIEF-6468096');
      expect(brief.far).toBeUndefined();
      expect(brief.levels.value).toBe('3 basements, ground and 5 podium levels (max)');
    } finally {
      await app.close();
    }
  }, SLOW);

  it.skipIf(!COA)('fills the GFA gap on the sheet and leaves the height open (skipped: reference sheet absent)', async () => {
    const app = await build();
    try {
      const content = (await readFile(COA!)).toString('base64');
      const plot = await app.inject({ method: 'POST', url: '/api/plots', headers: ACTOR, payload: plotBody(content) });
      expect(plot.statusCode, plot.body).toBe(201);
      const r = await app.inject({
        method: 'POST',
        url: '/api/runs',
        headers: ACTOR,
        payload: runBody((plot.json() as Json)['plotId'], { projectBriefId: 'BRIEF-6468096' }),
      });
      expect(r.statusCode).toBe(422);
      expect((r.json() as Json)['message']).toMatch(/^plot 6468096: its affection plan does not state Height,/);
    } finally {
      await app.close();
    }
  }, SLOW);
});
