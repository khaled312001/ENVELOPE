/**
 * The title block's words, from the run request to the sheet and the DXF (17 Oct 2026).
 *
 * The strip had fields for the project, client, consultant, description and
 * status and printed NOT STATED in every one, because the run had nowhere to
 * hold them. These hold the path end to end: stated on the request, stored with
 * the run under the actor's name, printed on the sheet the screen and the A3 set
 * draw, and in the DXF's title lines — and refused, in a sentence, when a value
 * would print as question marks in the CAD file.
 */

import { describe, expect, it } from 'vitest';

import { engineNote } from '@envelope/report/words';
import { TitleField, type PaperText } from '@envelope/sheets';

import { runDrawing, runSheets, type DrawableRun } from '../src/drawing.js';
import { TITLE_CONTROL_CODE, TITLE_NOT_ASCII } from '../src/schemas.js';
import { build } from '../src/server.js';

const ACTOR = { 'x-actor-id': 'u-title', 'x-actor-name': 'Title Tester' };
const SLOW = 60_000;

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const PLOT = {
  plotNumber: '6211383',
  community: 'TEST',
  landUse: 'RESIDENTIAL_MULTI',
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

const STATED = {
  projectName: '  Plot 04 Residential  ',
  client: 'A Client LLC',
  consultant: 'Studio Three',
  description: '3B+G+5P+38 residential building',
  status: '   ',
};

const valueOf = (items: readonly { kind: string }[], field: TitleField): string =>
  (items.filter((i): i is PaperText => i.kind === 'text').find((t) => t.field === field) ?? { value: '(none)' }).value;

describe('the title block, stated with the run', () => {
  it('stores what was stated under the actor, trimmed, and prints it on the sheet and in the DXF', async () => {
    const app = await build();
    try {
      const plot = await app.inject({ method: 'POST', url: '/api/plots', headers: ACTOR, payload: PLOT });
      const r = await app.inject({
        method: 'POST',
        url: '/api/runs',
        headers: ACTOR,
        payload: runBody((plot.json() as Json)['plotId'], { titleBlock: STATED }),
      });
      expect(r.statusCode, r.body).toBe(201);
      const run = r.json() as Json;
      // Whitespace is not a statement: the blank status is dropped, not stored as "".
      expect(run['titleBlock']).toEqual({
        projectName: 'Plot 04 Residential',
        client: 'A Client LLC',
        consultant: 'Studio Three',
        description: '3B+G+5P+38 residential building',
        statedBy: 'Title Tester',
      });
      // And it is the stored run's, not only the response's.
      const again = await app.inject({ method: 'GET', url: `/api/runs/${run['runId']}`, headers: ACTOR });
      expect((again.json() as Json)['titleBlock']).toEqual(run['titleBlock']);

      const drawable = run as unknown as DrawableRun;
      const [site] = runSheets(drawable);
      expect(valueOf(site!.paperItems, TitleField.PROJECT)).toBe('Plot 04 Residential');
      expect(valueOf(site!.paperItems, TitleField.CLIENT)).toBe('A Client LLC');
      expect(valueOf(site!.paperItems, TitleField.CONSULTANT)).toBe('Studio Three');
      expect(valueOf(site!.paperItems, TitleField.STATUS)).toBe('NOT STATED');

      const { dxf } = runDrawing(drawable);
      expect(dxf).toContain('Project: Plot 04 Residential. Client: A Client LLC. Consultant: Studio Three.');
      expect(dxf).toContain('Description: 3B+G+5P+38 residential building. Status: NOT STATED.');
    } finally {
      await app.close();
    }
  }, SLOW);

  it('stores nothing when nothing was stated, and the sheet says NOT STATED', async () => {
    const app = await build();
    try {
      const plot = await app.inject({ method: 'POST', url: '/api/plots', headers: ACTOR, payload: PLOT });
      const r = await app.inject({
        method: 'POST',
        url: '/api/runs',
        headers: ACTOR,
        payload: runBody((plot.json() as Json)['plotId'], { titleBlock: { client: '' } }),
      });
      expect(r.statusCode, r.body).toBe(201);
      const run = r.json() as Json;
      expect(run['titleBlock']).toBeUndefined();
      const [site] = runSheets(run as unknown as DrawableRun);
      expect(valueOf(site!.paperItems, TitleField.PROJECT)).toBe('NOT STATED');
    } finally {
      await app.close();
    }
  }, SLOW);

  it('refuses, in a sentence, a value the DXF would print as question marks or as a control code', async () => {
    const app = await build();
    try {
      const plot = await app.inject({ method: 'POST', url: '/api/plots', headers: ACTOR, payload: PLOT });
      const plotId = (plot.json() as Json)['plotId'];
      for (const [titleBlock, sentence] of [
        [{ client: 'شركة التطوير' }, TITLE_NOT_ASCII],
        [{ projectName: 'Café Tower' }, TITLE_NOT_ASCII],
        [{ description: 'tower at 90%%d' }, TITLE_CONTROL_CODE],
      ] as const) {
        const r = await app.inject({ method: 'POST', url: '/api/runs', headers: ACTOR, payload: runBody(plotId, { titleBlock }) });
        expect(r.statusCode).toBe(400);
        const message = (r.json() as Json)['message'] as string;
        expect(message).toContain(sentence);
        // The studio shows it under the refusal in the reader's language.
        expect(engineNote(message, 'ar')).toMatch(/^خانة «[^»]+» /);
      }
      const long = await app.inject({
        method: 'POST',
        url: '/api/runs',
        headers: ACTOR,
        payload: runBody(plotId, { titleBlock: { status: 'x'.repeat(41) } }),
      });
      expect(long.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  }, SLOW);
});
