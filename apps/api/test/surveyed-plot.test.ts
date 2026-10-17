/**
 * A SURVEYED RING, FROM THE SHEET'S OWN COORDINATE TABLE TO A RUN, OVER HTTP.
 *
 * DDA sheet 5134565 prints six DLTM corners that close to its printed
 * 1,040.04 m². Pressing "Use this sheet" and then Compute answered 422 "the
 * setbacks over-consume the plot" whatever the boundaries were called, because
 * the offset kernel checked a dropped 0.42 m jog against its line carried on
 * into the plot. These tests take the corners the way the studio does — from the
 * intake's survey, first corner at the origin — and hold the API to an answer.
 *
 * And where an answer is not the engine's to give — one leg of a kinked side
 * called a road and the other a neighbour — the refusal says that in words a
 * reader can act on, rather than blaming the setbacks.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { Decimal } from '@envelope/core';
import { engineNote } from '@envelope/report/words';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { absentNote, sourceSheet } from '../../../packages/intake/test/source-sheets.js';
import { build } from '../src/server.js';

const REPO = new URL('../../../', import.meta.url);
const ACTOR = { 'x-actor-id': 'u-survey', 'x-actor-name': 'Survey Tester' };
const DDA_SHEET = 'docs/00-source/samples/affection-plan/DDA-5134565-saih-shuaib-1.pdf';
const BRIEF_196_SHEET = 'docs/00-source/developer-standards/azizi/Plot DJAZ1TRE10RES022-196.pdf';

/** Reading a real PDF inside a test body; see `instrument.test.ts` for why this one is longer. */
const READS_A_REAL_PDF = 60_000;

type App = Awaited<ReturnType<typeof build>>;
let app: App;
let ddaBase64: string;
let ddaVertices: { x: string; y: string }[];

beforeAll(async () => {
  app = await build();
  ddaBase64 = (await readFile(fileURLToPath(new URL(DDA_SHEET, REPO)))).toString('base64');
  const read = await app.inject({
    method: 'POST',
    url: '/api/intake/affection-plan',
    headers: ACTOR,
    payload: { content: ddaBase64, filename: 'DDA-5134565.pdf' },
  });
  expect(read.statusCode).toBe(200);
  const points = read.json().facts.survey.points.value as { east: string; north: string }[];
  // As the studio's `pointsToDraft` places them: the first corner is the origin, in metres.
  const [first] = points;
  ddaVertices = points.map((p) => ({
    x: new Decimal(p.east).minus(first!.east).toString(),
    y: new Decimal(p.north).minus(first!.north).toString(),
  }));
});

afterAll(async () => {
  await app.close();
});

type EdgeClass = 'ROAD' | 'ADJACENT_PLOT';

async function runOn(
  plot: { plotNumber: string; community: string; vertices: { x: string; y: string }[]; sheet?: { content: string; filename: string } },
  roads: readonly number[],
  statement = false,
) {
  const edges = plot.vertices.map((_, seq) =>
    roads.includes(seq)
      ? { seq, classification: 'ROAD' as EdgeClass, roadHierarchy: 'LOCAL' as const }
      : { seq, classification: 'ADJACENT_PLOT' as EdgeClass },
  );
  const created = await app.inject({
    method: 'POST',
    url: '/api/plots',
    headers: ACTOR,
    payload: {
      plotNumber: plot.plotNumber,
      community: plot.community,
      landUse: 'RESIDENTIAL_MULTI',
      vertices: plot.vertices,
      edges,
      ...(plot.sheet ? { affectionPlan: plot.sheet } : {}),
    },
  });
  expect(created.statusCode, created.body).toBe(201);
  return app.inject({
    method: 'POST',
    url: '/api/runs',
    headers: ACTOR,
    payload: {
      plotId: created.json().plotId,
      parkingInFar: 'EXCLUDED_FROM_FAR',
      unitMix: {
        source: 'USER_SET',
        entries: [
          { typeId: '1BED', label: '1 bedroom', share: '0.5', nsaM2: '70' },
          { typeId: '2BED', label: '2 bedroom', share: '0.5', nsaM2: '110' },
        ],
      },
      parkingLevelsAvailable: 2,
      parkingUsableFraction: {
        value: '0.85',
        source: 'ASSUMED',
        basis: 'the fraction of a parking level left for bays and aisles after cores, ramps and plant. No cited rule fixes it.',
      },
      saleableEfficiency: {
        value: '0.95',
        source: 'USER_SET',
        basis: 'the mid-point of the 93–97% range the developer brief states',
      },
      useDraftRules: true,
      ...(statement ? { podiumSetbackStatementId: 'STMT-PODIUM-SETBACK-2026-10-16' } : {}),
    },
  });
}

const dda = (withSheet: boolean) => ({
  plotNumber: '5134565',
  community: 'SAIH SHUAIB 1',
  vertices: ddaVertices,
  ...(withSheet ? { sheet: { content: ddaBase64, filename: 'DDA-5134565.pdf' } } : {}),
});

/* Boundaries in the sheet's own order: 27.76, 6.36, 30.51, 0.42, 33.15, 30.82 m. */
describe('DDA 5134565, from its own coordinate table', () => {
  it(
    'computes with every boundary a neighbour, the sheet attached',
    async () => {
      const run = await runOn(dda(true), []);
      expect(run.statusCode, run.body).toBe(201);
      expect(new Decimal(run.json().capacity.governingGfa.value).gt(0)).toBe(true);
    },
    READS_A_REAL_PDF,
  );

  it.each([
    ['the 30.51 m top', [2]],
    ['the 30.82 m base', [5]],
    ['both legs of the kinked 34 m side', [0, 1]],
  ])(
    'computes with the road on %s, with and without the podium statement',
    async (_, roads) => {
      for (const statement of [false, true]) {
        const run = await runOn(dda(false), roads, statement);
        expect(run.statusCode, run.body).toBe(201);
      }
    },
    READS_A_REAL_PDF,
  );

  it(
    'refuses a road on one leg of a kinked side in words, naming both legs by length',
    async () => {
      const run = await runOn(dda(false), [0]);
      expect(run.statusCode).toBe(422);
      expect(run.json().error).toBe('DegenerateGeometryError');
      const message = run.json().message as string;
      expect(message).toMatch(/^Two boundaries meet at a turn of 1\.8°/);
      expect(message).toContain('the 6.36 m boundary');
      expect(message).toContain('the 27.76 m boundary by 0 m');
      expect(message).toContain('give both boundaries the same setback');
      expect(message).not.toMatch(/over-consume/);
      // Said in the reader's language, figure for figure, from the engine's own sentence.
      const ar = engineNote(message, 'ar');
      expect(ar).toContain('حدان يلتقيان بانعطاف 1.8°');
      expect(ar).toContain('الحد بطول 6.36 م');
      expect(ar).toContain('الحد بطول 27.76 م ارتداده 0 م');
      expect(ar).not.toMatch(/[A-Za-z]{4,}/);
      expect(engineNote(message, 'en')).toMatch(/^Two boundaries meet at a turn of 1\.8°/);
    },
    READS_A_REAL_PDF,
  );
});

/*
  Brief plot 5180196 with its own sheet attached was reported refused —
  "the offset footprint escaped the plot boundary" — with each of its four
  boundaries tried as the road. At 3c60d59 it computes; this holds it there.
*/
const brief196 = sourceSheet(BRIEF_196_SHEET);
describe.skipIf(brief196 === undefined)(
  `brief plot 5180196, its sheet attached ${brief196 === undefined ? absentNote(BRIEF_196_SHEET) : ''}`,
  () => {
    const legs: readonly (readonly [number, number])[] = [
      [36.57, 205.06],
      [48.03, 295.08],
      [35.79, 24.81],
      [48.19, 114.15],
    ];
    const vertices: { x: string; y: string }[] = [];
    let x = 0;
    let y = 0;
    for (const [length, bearing] of legs) {
      vertices.push({ x: x.toFixed(3), y: y.toFixed(3) });
      x += length * Math.sin((bearing * Math.PI) / 180);
      y += length * Math.cos((bearing * Math.PI) / 180);
    }

    it(
      'computes with each boundary as the street, with and without the podium statement',
      async () => {
        const content = (await readFile(brief196!)).toString('base64');
        for (const road of [0, 1, 2, 3]) {
          for (const statement of [false, true]) {
            const run = await runOn(
              {
                plotNumber: '5180196',
                community: 'JABAL ALI',
                vertices,
                sheet: { content, filename: 'Plot DJAZ1TRE10RES022-196.pdf' },
              },
              [road],
              statement,
            );
            expect(run.statusCode, `road ${road}, statement ${statement}: ${run.body}`).toBe(201);
          }
        }
      },
      READS_A_REAL_PDF * 2,
    );
  },
);
