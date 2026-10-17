/**
 * A PLOT WITH NO SHEET, OVER HTTP: THE PLACEHOLDER SAID, AND WHAT REPLACES IT.
 *
 * A run on a plot with no affection plan used to compute on the seed's
 * PLACEHOLDER-NOT-A-REAL-INSTRUMENT FAR and plate, every figure shown DERIVED,
 * with nothing in the request a reader could type to replace them. Now the
 * placeholder FAR is in the register, amber, with its reason; `typedLimits`
 * replaces it USER_SET under the actor; and a typed figure never replaces the
 * plot's own sheet.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { build } from '../src/server.js';

const REPO = new URL('../../../', import.meta.url);
const ACTOR = { 'x-actor-id': 'u-typed', 'x-actor-name': 'Typed Limits Tester' };
const SHEET = 'docs/00-source/samples/affection-plan/IC1-CTYL-16_011-warsan1-621.pdf';

async function plotBody(withSheet: boolean) {
  return {
    plotNumber: '6211383',
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
      { seq: 2, classification: 'ADJACENT_PLOT' as const },
      { seq: 3, classification: 'ADJACENT_PLOT' as const },
    ],
    ...(withSheet
      ? {
          affectionPlan: {
            content: (await readFile(fileURLToPath(new URL(SHEET, REPO)))).toString('base64'),
            filename: 'warsan-6211383.pdf',
          },
        }
      : {}),
  };
}

function runBody(plotId: string, extra: Record<string, unknown> = {}) {
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
      basis: 'the fraction of a parking level left for bays and aisles after cores, ramps and plant.',
    },
    saleableEfficiency: {
      value: '0.95',
      source: 'USER_SET' as const,
      basis: 'the mid-point of the 93–97% range the developer brief states',
    },
    useDraftRules: true,
    ...extra,
  };
}

type RunJson = {
  capacity: { bandA: { value: string; provenanceClass: string } };
  assumptions: { parameterId: string; basis: string }[];
  message?: string;
};

describe('typed limits, on a plot with no sheet', () => {
  it('says the placeholder FAR in the register, and replaces it with the reader’s typed FAR', async () => {
    const app = await build();
    try {
      const plot = await app.inject({ method: 'POST', url: '/api/plots', headers: ACTOR, payload: await plotBody(false) });
      const plotId = plot.json().plotId as string;

      const loose = await app.inject({ method: 'POST', url: '/api/runs', headers: ACTOR, payload: runBody(plotId) });
      expect(loose.statusCode).toBe(201);
      const l = loose.json() as RunJson;
      expect(l.capacity.bandA.value).toBe('6000');
      expect(l.capacity.bandA.provenanceClass).toBe('ASSUMED');
      const placeholder = l.assumptions.find((a) => a.parameterId === 'envelope.far_max');
      expect(placeholder?.basis).toMatch(/^No affection plan or brief stating a FAR is on file for this plot\. 5 is a placeholder \(R-FAR-MAX-RES\)/);

      const typed = await app.inject({
        method: 'POST',
        url: '/api/runs',
        headers: ACTOR,
        payload: runBody(plotId, { typedLimits: { far: '3', maxStoreys: 8 } }),
      });
      expect(typed.statusCode, typed.body).toBe(201);
      const t = typed.json() as RunJson;
      expect(t.capacity.bandA.value).toBe('3600');
      expect(t.capacity.bandA.provenanceClass).toBe('USER_SET');
      expect(t.assumptions.some((a) => a.parameterId === 'envelope.far_max')).toBe(false);
    } finally {
      await app.close();
    }
  }, 60_000);

  it('refuses a typed storey count of zero at the boundary', async () => {
    const app = await build();
    try {
      const plot = await app.inject({ method: 'POST', url: '/api/plots', headers: ACTOR, payload: await plotBody(false) });
      const r = await app.inject({
        method: 'POST',
        url: '/api/runs',
        headers: ACTOR,
        payload: runBody(plot.json().plotId, { typedLimits: { maxStoreys: 0 } }),
      });
      expect(r.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });

  it('refuses a typed FAR on a plot whose own sheet states one, in a sentence', async () => {
    const app = await build();
    try {
      const plot = await app.inject({ method: 'POST', url: '/api/plots', headers: ACTOR, payload: await plotBody(true) });
      const r = await app.inject({
        method: 'POST',
        url: '/api/runs',
        headers: ACTOR,
        payload: runBody(plot.json().plotId, { typedLimits: { far: '4' } }),
      });
      expect(r.statusCode).toBe(422);
      expect((r.json() as RunJson).message).toMatch(/^this plot’s own instrument states its floor area ratio \(3\.500003: /);
    } finally {
      await app.close();
    }
  }, 60_000);
});
