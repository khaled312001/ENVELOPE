/**
 * `/exports` — what comes out, rendered.
 *
 * The shared scans come from `prohibitions.ts`. What this page needs beyond them,
 * and why each one is here:
 *
 *   * NO NAME IT WAS NOT GIVEN. Every layer, sheet and note on the page comes out
 *     of `verified.exports`, which the worked-example check writes by opening the
 *     files the API returns. A hand-typed layer name looks like documentation and
 *     is a figure with no provenance, so every `ENV-` token in the markup must be a
 *     layer the file declared, and every layer the file declared must be on the
 *     page — the list is not a sample.
 *
 *   * NO PROGRAM, NO COUNT, NO INTEGRATION. site-map §4.11's "never says": the
 *     name of a program a file opens in, a count of formats, an integration claim.
 *     "Writes DXF R12" is a fact about a file; the rest would be claims about tools
 *     somebody else ships.
 *
 *   * THE GATES AS MEASURED, NOT AS REMEMBERED. The first draft of this page said
 *     "nothing exports before four gates" and "G4 requires a reviewer who is not
 *     the author". Both were false. The page now prints what the export answered
 *     before, between and after the two signatures, and the phrases that were
 *     false are prohibited.
 *
 *   * NO SAMPLE FILE. A file downloadable from a public page would have skipped
 *     the gates the page describes.
 */

import { readFileSync } from 'node:fs';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

/* The component directly, not through `PAGES` — the choice `refusals.test.tsx`
   records, for the same reason. */
import { IFC_GLTF } from '../src/content/shared.js';
import Exports from '../src/screens/Exports.js';
import WORKED from '../src/screens/worked-example.json' with { type: 'json' };
import {
  BANNED_IN_HAND_WRITTEN_COPY,
  expectAssumedTreatmentPresent,
  expectSitewideProhibitions,
  stripTags,
} from './prohibitions.js';

const X = WORKED.verified.exports;

const markup = (): string =>
  renderToStaticMarkup(<Exports navigate={() => {}} actor={null} setActor={() => {}} search="" />);

/** What a reader reads: tags stripped, entities that matter decoded, whitespace collapsed. */
const text = (): string =>
  stripTags(markup())
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

const SOURCE = readFileSync(new URL('../src/screens/Exports.tsx', import.meta.url), 'utf8');
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('/exports', () => {
  it('carries the site-wide prohibitions', () => {
    expectSitewideProhibitions(markup(), '/exports');
  });

  it('uses none of the apology vocabulary in its own source', () => {
    for (const banned of BANNED_IN_HAND_WRITTEN_COPY) {
      const hit = banned.exec(CODE);
      expect(hit?.[0], `Exports.tsx uses "${hit?.[0] ?? ''}"`).toBeUndefined();
    }
  });

  it('opens on one heading', () => {
    expect([...markup().matchAll(/<h1\b/g)].length).toBe(1);
  });

  it('prints every layer the file declares, and no layer it does not', () => {
    const page = text();
    expect(X.dxf.layers.length, 'the fixture carries no layers').toBeGreaterThan(0);
    for (const layer of X.dxf.layers) {
      expect(page, `${layer.name} is in the file and not on the page`).toContain(layer.name);
    }
    const declared = new Set(X.dxf.layers.map((l) => l.name));
    for (const m of page.matchAll(/\bENV-[A-Z0-9][A-Z0-9_-]*/g)) {
      expect(declared.has(m[0]), `${m[0]} is on the page and not in the file`).toBe(true);
    }
    // And in the source there is not one: a layer name typed into the component
    // is the defect this page exists to avoid.
    expect(CODE, 'Exports.tsx types a layer name').not.toMatch(/ENV-[A-Z0-9]/);
  });

  it('marks, in amber, exactly the layers that hold something assumed', () => {
    expectAssumedTreatmentPresent(markup(), '/exports');
    const html = markup();
    for (const layer of X.dxf.layers) {
      const marked = new RegExp(`data-state="assumed"><code class="value">${layer.name}</code>`).test(html);
      expect(marked, `${layer.name}: assumed ink ${layer.assumedInk}, marked ${marked}`).toBe(layer.assumedInk);
    }
  });

  it('prints every sheet of the drawing set and every sheet of the workbook, with its note', () => {
    const page = text();
    for (const s of X.drawingSheets) {
      expect(page).toContain(s.number);
      expect(page).toContain(s.title);
    }
    for (const s of X.workbookSheets) {
      expect(page).toContain(s.name);
      if (s.note) expect(page).toContain(s.note);
    }
    expect(page).toContain(X.workbookStatus);
  });

  it('states the formats as the files state them', () => {
    const page = text();
    expect(page).toContain(X.dxf.version);
    expect(page).toContain(`binary glTF ${X.glb.assetVersion}`);
    expect(X.glb.extensionsRequired, 'the model file now requires an extension').toEqual([]);
    for (const line of X.glb.notice) expect(page).toContain(line);
    for (const field of X.jsonFields) expect(page).toContain(field);
  });

  it('prints the gates as the export answered them', () => {
    const page = text();
    // Refused until both are signed, opened after: the sequence the check recorded.
    expect(X.gateSequence.map((s) => s.status)).toEqual([409, 409, 200]);
    for (const step of X.gateSequence) expect(page).toContain(String(step.status));
    for (const falsehood of [
      /before (all )?four gates/i,
      /\btwo people\b/i,
      /reviewer who is (deliberately )?not the author/i,
      /\bverified (licen[cs]e|credential)/i,
    ]) {
      expect(page, `/exports says ${falsehood}`).not.toMatch(falsehood);
    }
    expect(page, '/exports no longer says the author can sign').toMatch(/signed its own run/);
  });

  it('names no program, counts no formats and claims no integration', () => {
    const page = text();
    for (const claim of [
      /\b(AutoCAD|Revit|BricsCAD|LibreCAD|Blender|SketchUp|Rhino|ArchiCAD|Navisworks|Excel)\b/i,
      /\b(two|three|four|five|six|seven|\d+) (formats|file types|kinds of file|artefacts)\b/i,
      /\bintegrates with\b/i,
      /\bworks (with|in)\b/i,
      /\bopens in\b/i,
      /\bcompatib/i,
      /\bseamless/i,
    ]) {
      expect(page, `/exports says ${claim}`).not.toMatch(claim);
    }
    // IFC appears once, in the shared paragraph, as something that is not produced.
    const shared = stripTags(renderToStaticMarkup(<>{IFC_GLTF.body}</>));
    const inShared = (shared.match(/\bIFC\b/g) ?? []).length;
    expect((page.match(/\bIFC\b/g) ?? []).length).toBe(inShared);
  });

  it('offers no sample file', () => {
    const html = markup();
    expect(html).not.toMatch(/\bdownload\b=/i);
    expect(html).not.toMatch(/href="[^"]*\.(dxf|xlsx|glb|json|pdf)"/i);
  });
});
