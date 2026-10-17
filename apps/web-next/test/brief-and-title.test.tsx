/**
 * The project brief on the rules step, the run's sheet report on the plot step,
 * and the title block on the export step (17 Oct 2026) — rendered against what
 * the real API returns, not a fixture of it.
 *
 * Three defects, as a reader met them: the API took `projectBriefId` and no
 * screen could send one, so plot 6468096 was refused with a sentence naming a
 * brief nobody could select; the run reported the placeholders it set aside and
 * what a brief bound, and no screen showed either; and the drawings' title block
 * printed NOT STATED in five fields the reader had nowhere to fill.
 */

import type { RunView, StandardsView } from '@web/api/client.js';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { build } from '../../api/src/server.js';
import { LocaleProvider } from '../src/lib/locale.js';
import { BriefCard } from '../src/studio/BriefPicker.js';
import { TitleBlockDisclosure } from '../src/studio/ExportStep.js';
import {
  EMPTY_RULES,
  EMPTY_TITLE_BLOCK,
  requestBody,
  rulesFrom,
  titleBlockBody,
  titleProblem,
} from '../src/studio/model.js';
import { RunSheetLists } from '../src/studio/sheet-setbacks.js';

const ACTOR = { 'x-actor-id': 'u-next-brief', 'x-actor-name': 'Next Brief Tester' };

type App = Awaited<ReturnType<typeof build>>;
let app: App;
let brief: NonNullable<StandardsView['brief']>;
let run: RunView;

beforeAll(async () => {
  app = await build();
  const standards = await app.inject({ method: 'GET', url: '/api/standards?plotNumber=6468096', headers: ACTOR });
  brief = (standards.json() as StandardsView).brief!;
  const plot = await app.inject({
    method: 'POST',
    url: '/api/plots',
    headers: ACTOR,
    payload: {
      plotNumber: '6468096',
      community: 'WADI AL SAFA 4',
      landUse: 'RESIDENTIAL_MULTI',
      vertices: [
        { x: '0', y: '0' },
        { x: '70', y: '0' },
        { x: '70', y: '64' },
        { x: '0', y: '64' },
      ],
      edges: [0, 1, 2, 3].map((seq) => ({ seq, classification: 'ROAD', roadHierarchy: 'LOCAL' })),
    },
  });
  const plotId = (plot.json() as { plotId: string }).plotId;
  // The studio's own request, with the brief chosen and a title block stated.
  const body = {
    ...requestBody(plotId, { ...EMPTY_RULES, groundIsParking: 'yes', projectBriefId: brief.briefId }),
    titleBlock: { projectName: 'Plot 04 Residential', status: 'Feasibility' },
  };
  const created = await app.inject({ method: 'POST', url: '/api/runs', headers: ACTOR, payload: body });
  expect(created.statusCode, created.body).toBe(201);
  run = created.json() as RunView;
}, 120_000);

afterAll(async () => {
  await app.close();
});

function render(node: JSX.Element, at = '/studio'): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[at]}>
      <LocaleProvider>{node}</LocaleProvider>
    </MemoryRouter>,
  );
}

describe('the project brief, offered on the rules step', () => {
  it('is offered unpressed, under the line saying it is not a regulation', () => {
    const html = render(<BriefCard brief={brief} value="" onChange={() => undefined} sheetOmitsFar />);
    expect(html).toContain('A developer brief, not a regulation.');
    expect(html).toMatch(/aria-pressed="false"[^>]*>Use this brief</);
    expect(html).toContain('Not used. Nothing is taken from the brief unless you choose it.');
    expect(html).toContain('21604.61');
    // The brief prints no FAR, and the card says so instead of showing a quotient under its name.
    expect(html).not.toContain('FAR, as printed');
    expect(html).toContain('The brief prints no FAR.');
    expect(html).toContain('This plot’s affection plan does not state its FAR or GFA.');
  });

  it('says it is chosen once the reader presses it, and offers to stop', () => {
    const html = render(<BriefCard brief={brief} value={brief.briefId} onChange={() => undefined} sheetOmitsFar={false} />);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Stop using this brief</);
    expect(html).not.toContain('does not state its FAR or GFA');
  });

  it('is said in Arabic, the brief’s own notes included', () => {
    const html = render(<BriefCard brief={brief} value="" onChange={() => undefined} sheetOmitsFar />, '/ar/studio');
    expect(html).toContain('موجز مطور، وليس لائحة نظامية.');
    expect(html).toContain('استخدم هذا الموجز');
    expect(html).not.toContain('The brief prints the plot area in square feet only');
    expect(html).not.toContain('Said of every plot the request covers');
  });

  it('is never sent unless chosen, and survives a re-run from the remembered request', () => {
    expect(EMPTY_RULES.projectBriefId).toBe('');
    expect(requestBody('p', EMPTY_RULES)).not.toHaveProperty('projectBriefId');
    const chosen = requestBody('p', { ...EMPTY_RULES, projectBriefId: brief.briefId });
    expect(chosen.projectBriefId).toBe(brief.briefId);
    expect(rulesFrom(chosen).projectBriefId).toBe(brief.briefId);
  });
});

describe('the run’s sheet report, on the plot step', () => {
  it('lists what the brief bound, in both languages', () => {
    expect(run.sheet?.briefBound?.length).toBe(1);
    const en = render(<RunSheetLists sheet={run.sheet} />);
    expect(en).toContain('Limits taken from the project brief');
    expect(en).toContain('4.837235');
    expect(en).toContain('the brief prints no FAR to cross-check it against');
    const ar = render(<RunSheetLists sheet={run.sheet} />, '/ar/studio');
    expect(ar).toContain('حدود مأخوذة من موجز المشروع');
    expect(ar).toContain('موجز مطور، وليس وثيقة نظامية');
    expect(ar).not.toContain('the brief prints no FAR');
  });

  it('lists the placeholders a run on a plot with its own sheet did not load', () => {
    const sheet = {
      ...run.sheet!,
      briefBound: [],
      placeholdersNotApplied: [
        { ruleId: 'R-FAR-MAX-RES', parameterId: 'far.max', value: '5', unit: 'ratio', reason: 'not used' },
      ],
    };
    const html = render(<RunSheetLists sheet={sheet} />);
    expect(html).toContain('Placeholder limits not used');
    expect(html).toContain('R-FAR-MAX-RES');
  });

  it('shows nothing for a run that set nothing aside and named no brief', () => {
    expect(render(<RunSheetLists sheet={{ ...run.sheet!, briefBound: [], placeholdersNotApplied: [] }} />)).toBe('');
    expect(render(<RunSheetLists sheet={undefined} />)).toBe('');
  });
});

describe('the title block, on the export step', () => {
  it('holds what the run stored, under the name of who stated it', () => {
    expect(run.titleBlock).toEqual({ projectName: 'Plot 04 Residential', status: 'Feasibility', statedBy: 'Next Brief Tester' });
    const html = render(<TitleBlockDisclosure run={run} control={{ canSave: true, busy: false, onSave: () => undefined }} />);
    expect(html).toContain('<details');
    expect(html).not.toMatch(/<details[^>]* open/);
    expect(html).toContain('value="Plot 04 Residential"');
    expect(html).toContain('In the drawings, as entered by Next Brief Tester.');
    expect(html).toContain('Saving computes this study again with the same inputs, as a new study.');
  });

  it('says why it cannot save a run computed on another device', () => {
    const html = render(<TitleBlockDisclosure run={run} control={{ canSave: false, busy: false, onSave: () => undefined }} />);
    expect(html).toContain('This study was computed on another device');
    expect(html).not.toContain('Save and compute again');
  });

  it('checks each field by the server’s rules before anything is sent', () => {
    expect(titleProblem('client', 'شركة التطوير')).toBe('notLatin');
    expect(titleProblem('description', 'at 90%%d')).toBe('controlCode');
    expect(titleProblem('status', 'x'.repeat(41))).toBe('tooLong');
    expect(titleProblem('projectName', 'Plot 04 Residential')).toBeUndefined();
    expect(titleBlockBody(EMPTY_TITLE_BLOCK)).toBeUndefined();
    expect(titleBlockBody({ ...EMPTY_TITLE_BLOCK, client: '  A Client  ', status: '  ' })).toEqual({ client: 'A Client' });
  });
});
