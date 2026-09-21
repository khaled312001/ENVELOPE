/**
 * Affection-plan intake over HTTP, driven by the real sheets.
 *
 * The endpoint's whole job is to be trustworthy about what a document does and
 * does not say, so most of these tests are about the second half of that. A
 * parser that reports four numbers correctly and stays quiet about the four it
 * could not find is more dangerous than one that fails outright.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it } from 'vitest';

import { build } from '../src/server.js';

const REPO = new URL('../../../', import.meta.url);
const ACTOR = { 'x-actor-id': 'u-test', 'x-actor-name': 'Test Reviewer' };

async function upload(path: string, filename: string) {
  const app = await build();
  const bytes = await readFile(fileURLToPath(new URL(path, REPO)));
  const res = await app.inject({
    method: 'POST',
    url: '/api/intake/affection-plan',
    headers: ACTOR,
    payload: { content: bytes.toString('base64'), filename },
  });
  await app.close();
  return res;
}

describe('POST /api/intake/affection-plan', () => {
  let body: {
    disclaimer: string;
    facts: Record<string, { value: unknown; provenanceClass?: string } | null> & {
      crossChecks: { name: string }[];
      crossChecksPassed: boolean;
      blocking: { field: string; consequence: string }[];
    };
  };

  beforeAll(async () => {
    const res = await upload(
      'docs/00-source/samples/affection-plan/IC1-CTYL-16_011-warsan1-621.pdf',
      'IC1-CTYL-16_011.pdf',
    );
    expect(res.statusCode).toBe(200);
    body = res.json();
  });

  it('reads the printed values off a real sheet', () => {
    expect(body.facts['totalAreaSqm']?.value).toBe('1365.23');
    expect(body.facts['far']?.value).toBe('3.5');
    expect(body.facts['gfaSqm']?.value).toBe('4778.31');
  });

  it("re-checks the sheet's own arithmetic and reports the result", () => {
    expect(body.facts.crossChecksPassed).toBe(true);
    expect(body.facts.crossChecks[0]?.name).toContain('gfa = far');
  });

  it('sends the height as a structure the screen can render, not a string', () => {
    expect(body.facts['height']?.value).toMatchObject({ podiumLevels: 2, typicalFloors: 8 });
  });

  it('carries a provenance class on every value it returns', () => {
    for (const key of ['totalAreaSqm', 'far', 'gfaSqm']) {
      expect(body.facts[key]?.provenanceClass).toBe('DERIVED');
    }
  });

  it('says what it has not assessed, even on a complete sheet', () => {
    expect(body.disclaimer).toContain('REGULATORY VALIDITY: NOT ASSESSED');
  });

  it('reports no blocking gaps for a complete sheet', () => {
    expect(body.facts.blocking).toEqual([]);
  });
});

describe('a sheet that omits its own limits', () => {
  it('returns 200 with the gaps named rather than failing', async () => {
    const res = await upload(
      'docs/00-source/developer-standards/azizi/Plot DJAZ1MED12RES011-178.pdf',
      'DJAZ1MED12RES011.pdf',
    );
    expect(res.statusCode).toBe(200);
    const b = res.json();

    expect(b.facts.totalAreaSqm.value).toBe('2365.87');
    expect(b.facts.far).toBeNull();
    expect(b.facts.gfaSqm).toBeNull();

    const blocking = b.facts.blocking.map((x: { field: string }) => x.field);
    expect(blocking).toContain('far');
    expect(blocking).toContain('gfa_permitted_sqm');
    for (const gap of b.facts.blocking) {
      expect(gap.consequence.length).toBeGreaterThan(20);
    }
  });
});

describe('rejections', () => {
  it('refuses a file that is not a PDF, with a reason a user can act on', async () => {
    const app = await build();
    const res = await app.inject({
      method: 'POST',
      url: '/api/intake/affection-plan',
      headers: ACTOR,
      payload: {
        content: Buffer.from('PK not a pdf at all').toString('base64'),
        filename: 'plan.docx',
      },
    });
    await app.close();
    expect(res.statusCode).toBe(400);
    expect(res.json().detail).toContain('does not begin with');
  });

  it('rejects an empty upload at the schema', async () => {
    const app = await build();
    const res = await app.inject({
      method: 'POST',
      url: '/api/intake/affection-plan',
      headers: ACTOR,
      payload: { content: '', filename: 'empty.pdf' },
    });
    await app.close();
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});
