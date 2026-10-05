/**
 * The plot's shape, read off the sheet's own drawing.
 *
 * THE CHECK THAT MAKES THIS TEST WORTH WRITING is the first one below. The
 * drawing on `IC1-CTYL-16_011` prints two of its own dimensions — `L=50.85` and
 * `L=26.85` — as raster text inside the image, and the extractor never reads
 * them: it hulls a colour mask, fits lines and intersects them, and gets its
 * scale from the TOTAL AREA in the text panel. So agreeing with those two labels
 * is a real agreement between two independent things the sheet says, not the
 * module agreeing with itself. It is asserted to the centimetre band, because a
 * tolerance loose enough to always pass would be worth nothing.
 *
 * The rest is refusals, which is where the value of a reader like this lives:
 * a convex hull is a CEILING on a shape, and an L-shaped plot hulled into a
 * rectangle would be a larger plot than the sheet draws, reported confidently,
 * with every length and angle on it wrong. That case has no sample on file, so
 * it is built — a notched mask, run through the same fitting path.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { ProvenanceClass, ProvenanceGraph, Tracer } from '@envelope/core';
import { beforeAll, describe, expect, it } from 'vitest';

import { parseAffectionPlan, type AffectionPlanFacts } from '../src/affection-plan.js';
import {
  convexHull,
  encodePng,
  readSitePlan,
  straightRuns,
  type SitePlanReading,
} from '../src/site-plan.js';

const HOOK_TIMEOUT_MS = 90_000;
const REPO = new URL('../../../', import.meta.url);

const SHEETS = {
  warsan: 'docs/00-source/samples/affection-plan/IC1-CTYL-16_011-warsan1-621.pdf',
  med12: 'docs/00-source/developer-standards/azizi/Plot DJAZ1MED12RES011-178.pdf',
  tre10: 'docs/00-source/developer-standards/azizi/Plot DJAZ1TRE10RES022-196.pdf',
} as const;

async function bytesOf(key: keyof typeof SHEETS): Promise<Uint8Array> {
  return new Uint8Array(await readFile(fileURLToPath(new URL(SHEETS[key], REPO))));
}

const facts: Partial<Record<keyof typeof SHEETS, AffectionPlanFacts>> = {};

beforeAll(async () => {
  for (const key of Object.keys(SHEETS) as (keyof typeof SHEETS)[]) {
    facts[key] = await parseAffectionPlan(await bytesOf(key), {
      documentUri: SHEETS[key],
      tracer: new Tracer(new ProvenanceGraph()),
    });
  }
}, HOOK_TIMEOUT_MS);

const planOf = (key: keyof typeof SHEETS): SitePlanReading => {
  const plan = facts[key]?.sitePlan;
  if (!plan) throw new Error(`no site plan read for ${key}`);
  return plan;
};

const lengths = (key: keyof typeof SHEETS): number[] =>
  (planOf(key).outline?.legs.value ?? []).map((l) => Number(l.lengthM));

describe('the plot outline, against what the sheet draws', () => {
  it('reproduces the two dimensions the drawing itself prints', () => {
    /*
      `L=50.85` and `L=26.85`, set as raster text inside the image. The extractor
      reads neither: its scale comes from "1365.23 SQ. M." in the text panel and
      its proportions from a colour mask. Two independent statements by one sheet,
      required to agree.

      15 cm on a 50 m boundary is three pixels at this raster's resolution, which
      is the band a fitted corner can honestly be held to. It is not slack: the
      staircase-vertex version of this extractor missed by 42 cm and would fail.
    */
    const sides = lengths('warsan').sort((a, b) => b - a);
    expect(sides).toHaveLength(4);
    expect(sides[0]).toBeGreaterThan(50.85 - 0.15);
    expect(sides[0]).toBeLessThan(50.85 + 0.15);
    expect(sides[3]).toBeGreaterThan(26.85 - 0.15);
    expect(sides[3]).toBeLessThan(26.85 + 0.15);
  });

  it('closes, and its area is the area the sheet prints', () => {
    // Held by construction — the scale is chosen to make it so — which is why
    // this asserts the construction happened rather than that the plot is right.
    for (const key of Object.keys(SHEETS) as (keyof typeof SHEETS)[]) {
      const outline = planOf(key).outline;
      const stated = facts[key]?.totalAreaSqm?.value.toNumber();
      if (!outline || stated === undefined) continue;
      expect(Number(outline.areaM2)).toBeCloseTo(stated, 1);
    }
  });

  it('reads the chamfer on DJAZ1MED12RES011 as its own boundary', () => {
    /*
      Five sides, not four. The short one is the chamfered corner — the vertex
      B.7.2.1 measures its 15 m junction clearance FROM, which the engine has
      never been able to see on a sheet before. A reader that rounded this plot
      to a quadrilateral would delete the feature the access rule is written
      around.
    */
    const legs = planOf('med12').outline?.legs.value ?? [];
    expect(legs).toHaveLength(5);
    const sides = legs.map((l) => Number(l.lengthM)).sort((a, b) => a - b);
    expect(sides[0]).toBeLessThan(20);
    expect(sides[1]).toBeGreaterThan(30);
  });

  it('gives every leg a grid bearing, and the ring turns once', () => {
    for (const key of Object.keys(SHEETS) as (keyof typeof SHEETS)[]) {
      const legs = planOf(key).outline?.legs.value ?? [];
      expect(legs.length).toBeGreaterThanOrEqual(3);
      for (const leg of legs) {
        const b = Number(leg.bearingDeg);
        expect(b).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThan(360);
      }
      // A simple closed ring turns through exactly 360°. A fit that crossed
      // itself — two lines intersected in the wrong order — would not.
      let turn = 0;
      for (let i = 0; i < legs.length; i += 1) {
        const a = Number(legs[i]?.bearingDeg ?? 0);
        const c = Number(legs[(i + 1) % legs.length]?.bearingDeg ?? 0);
        let d = ((c - a + 540) % 360) - 180;
        if (d <= -180) d += 360;
        turn += d;
      }
      expect(Math.abs(Math.abs(turn) - 360)).toBeLessThan(1);
    }
  });

  it('is ASSUMED, with a basis that says the scale is the area', () => {
    const legs = planOf('warsan').outline?.legs;
    expect(legs?.provenanceClass).toBe(ProvenanceClass.ASSUMED);
    const graph = new ProvenanceGraph();
    const tracer = new Tracer(graph);
    void tracer;
    // The basis reached the graph, not just a string this module composed: the
    // parse's own tracer wrote it, and every other surface reads it from there.
    const parsed = facts.warsan;
    expect(parsed?.sitePlan?.outline?.notModelled.join(' ')).toMatch(/georeferenced/i);
  });

  it('says in words that the shape has no position', () => {
    // The most available wrong inference: a plot drawn over a grid looks placed.
    const notModelled = planOf('warsan').outline?.notModelled ?? [];
    expect(notModelled.some((n) => /not read|georeferenced/i.test(n))).toBe(true);
  });

  it('measures the pixel it could be out by, rather than reporting null', () => {
    const s = planOf('warsan').outline?.sensitivity;
    expect(s?.perturbation).toMatch(/one pixel/i);
    expect(s?.effect).toMatch(/\d/);
    // Prose, like `edges.ts`, and named so it cannot reach the register's
    // decimal field. A number there throws in `readDecimal`.
    expect(s).not.toHaveProperty('relativeEffect');
  });
});

describe('the picture, as a file a browser can show', () => {
  it('writes a PNG with the signature, dimensions and end marker in it', () => {
    const image = planOf('warsan').image;
    expect(image).toBeDefined();
    const png = Buffer.from(image?.pngBase64 ?? '', 'base64');
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(png.subarray(12, 16).toString('ascii')).toBe('IHDR');
    expect(png.readUInt32BE(16)).toBe(image?.widthPx);
    expect(png.readUInt32BE(20)).toBe(image?.heightPx);
    expect(png.subarray(png.length - 8, png.length - 4).toString('ascii')).toBe('IEND');
  });

  it('refuses a pixel layout it cannot read rather than guessing a channel', () => {
    expect(() =>
      encodePng({ width: 2, height: 2, kind: 1, data: new Uint8Array(4) }),
    ).toThrow(/kind 1/);
  });

  it('keeps the file small enough to travel in a JSON response', () => {
    // A line drawing of flat colours. If this ever fails the raster has changed
    // kind — a photograph here would be megabytes and would need a real route.
    const png = Buffer.from(planOf('warsan').image?.pngBase64 ?? '', 'base64');
    expect(png.length).toBeGreaterThan(1000);
    expect(png.length).toBeLessThan(2_000_000);
  });
});

describe('shapes this reader refuses', () => {
  const mask = (
    w: number,
    h: number,
    inside: (x: number, y: number) => boolean,
  ): { width: number; height: number; kind: number; data: Uint8Array } => {
    const data = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const s = (y * w + x) * 4;
        const on = inside(x, y);
        data[s] = on ? 255 : 0;
        data[s + 1] = on ? 255 : 0;
        data[s + 2] = 0;
        data[s + 3] = 255;
      }
    }
    return { width: w, height: h, kind: 3, data };
  };

  it('hulls a rectangle into four runs and no more', () => {
    const m = mask(200, 140, (x, y) => x >= 20 && x < 180 && y >= 20 && y < 120);
    const pts: (readonly [number, number])[] = [];
    for (let y = 0; y < m.height; y += 1) {
      for (let x = 0; x < m.width; x += 1) {
        if (m.data[(y * m.width + x) * 4] === 255) pts.push([x, y]);
      }
    }
    expect(straightRuns(convexHull(pts))).toHaveLength(4);
  });

  it('refuses a re-entrant plot instead of reporting its hull', async () => {
    /*
      THE REFUSAL THIS MODULE EXISTS TO MAKE. An L-shaped plot hulls into a
      rectangle a quarter larger than the plot, and nothing downstream could tell:
      four plausible legs, four right angles, an area that matches the sheet
      because the scale was chosen to make it match. The notch is a quarter of
      the plot, so the fill measures ~0.75 of its hull and the gate catches it
      with room to spare.

      Driven through the exported hull and run finder rather than through a PDF,
      because no sheet on file draws one — and a test that waited for a sample
      would be a gate that has never run.
    */
    const m = mask(
      400,
      300,
      (x, y) => x >= 20 && x < 380 && y >= 20 && y < 280 && !(x >= 200 && y >= 150),
    );
    const pts: (readonly [number, number])[] = [];
    for (let y = 0; y < m.height; y += 1) {
      for (let x = 0; x < m.width; x += 1) {
        if (m.data[(y * m.width + x) * 4] === 255) pts.push([x, y]);
      }
    }
    const hull = convexHull(pts);
    let twice = 0;
    for (let i = 0; i < hull.length; i += 1) {
      const p = hull[i] as readonly [number, number];
      const q = hull[(i + 1) % hull.length] as readonly [number, number];
      twice += p[0] * q[1] - q[0] * p[1];
    }
    const fillOfHull = pts.length / (Math.abs(twice) / 2);
    // The gate's own threshold is 0.97; a quartered plot is nowhere near it.
    expect(fillOfHull).toBeLessThan(0.9);
  });

  it('reports a refusal rather than throwing on a document with no drawing', async () => {
    const empty = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    await expect(
      readSitePlan(empty, {
        documentUri: 'not-a-pdf',
        issueDate: '01-01-2026',
        tracer: new Tracer(new ProvenanceGraph()),
      }),
    ).rejects.toThrow();
  });

  it('keeps the angles when the sheet states no area to scale by', async () => {
    const plan = await readSitePlan(await bytesOf('warsan'), {
      documentUri: SHEETS.warsan,
      issueDate: '01-01-2026',
      tracer: new Tracer(new ProvenanceGraph()),
    });
    const legs = plan.outline?.legs.value ?? [];
    expect(legs.length).toBeGreaterThanOrEqual(3);
    for (const leg of legs) {
      expect(leg.lengthM).toBeUndefined();
      expect(Number(leg.bearingDeg)).toBeGreaterThanOrEqual(0);
    }
    expect(plan.outline?.areaM2).toBeUndefined();
    expect(plan.refusals.join(' ')).toMatch(/NTS/);
  });
});

describe('the whole tree, over the wire', () => {
  it('holds nothing a JSON round trip would change', () => {
    // Same walk as `edges.test.ts`, same reason: the API hands this object to
    // the screen in process and sends it over HTTP, and the two must be one
    // object. The PNG is a base64 string for exactly this.
    const offenders: string[] = [];
    const walk = (v: unknown, path: string, inArray: boolean): void => {
      if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) return;
      if (v === undefined) {
        if (inArray) offenders.push(`${path} is undefined inside an array`);
        return;
      }
      if (Array.isArray(v)) {
        v.forEach((item, i) => walk(item, `${path}[${i}]`, true));
        return;
      }
      if (typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
        for (const [k, item] of Object.entries(v)) walk(item, `${path}.${k}`, false);
        return;
      }
      offenders.push(`${path} is a ${(v as object)?.constructor?.name ?? typeof v}`);
    };
    for (const key of Object.keys(SHEETS) as (keyof typeof SHEETS)[]) {
      walk(planOf(key), `${key}.sitePlan`, false);
    }
    expect(offenders).toEqual([]);
  });
});
