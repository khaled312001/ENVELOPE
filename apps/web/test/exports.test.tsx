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
 *
 *   * IN ARABIC, THE FILE STILL SPEAKS ENGLISH. The page's own sentences are
 *     translated; what it read out of a file is not. Every layer, sheet title,
 *     workbook sheet name and note is asserted present on the Arabic page AND
 *     outside its Arabic reading text — set `Verbatim` or in `code` — because a
 *     translated sheet title is a title no drawing carries.
 *
 * The page's copy now lives in `i18n/exports.en.ts` and its Arabic twin, so every
 * SOURCE scan reads the component and both dictionaries: a layer name typed into a
 * dictionary is the same defect as one typed into the component.
 */

import { readFileSync } from 'node:fs';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

/* The component directly, not through `PAGES` — the choice `refusals.test.tsx`
   records, for the same reason. */
import { IFC_GLTF } from '../src/content/shared.js';
import { IFC_GLTF_AR } from '../src/content/shared.ar.js';
import { StaticLocale } from '../src/i18n/locale.js';
import Exports from '../src/screens/Exports.js';
import WORKED from '../src/screens/worked-example.json' with { type: 'json' };
import {
  arabicReadingText,
  BANNED_IN_HAND_WRITTEN_COPY,
  expectAssumedTreatmentPresent,
  expectNoEnglishProse,
  expectSitewideProhibitions,
  pageProps,
  stripTags,
} from './prohibitions.js';

const X = WORKED.verified.exports;

const markup = (): string =>
  renderToStaticMarkup(<Exports {...pageProps()} />);

/** What a reader reads: tags stripped, entities that matter decoded, whitespace collapsed. */
const text = (): string =>
  stripTags(markup())
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

/** A module's source with its comments removed: comments discuss rejected words to reject them. */
const stripped = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const CODE = stripped('../src/screens/Exports.tsx');
/** The page's English copy, which used to be inline in the component. */
const DICT = stripped('../src/i18n/exports.en.ts');
const DICT_AR = stripped('../src/i18n/exports.ar.ts');

describe('/exports', () => {
  it('carries the site-wide prohibitions', () => {
    expectSitewideProhibitions(markup(), '/exports');
  });

  it('uses none of the apology vocabulary in its own source', () => {
    for (const banned of BANNED_IN_HAND_WRITTEN_COPY) {
      const hit = banned.exec(CODE);
      expect(hit?.[0], `Exports.tsx uses "${hit?.[0] ?? ''}"`).toBeUndefined();
      const inDict = banned.exec(DICT);
      expect(inDict?.[0], `exports.en.ts uses "${inDict?.[0] ?? ''}"`).toBeUndefined();
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
    // is the defect this page exists to avoid — nor into either dictionary.
    expect(CODE, 'Exports.tsx types a layer name').not.toMatch(/ENV-[A-Z0-9]/);
    expect(DICT, 'exports.en.ts types a layer name').not.toMatch(/ENV-[A-Z0-9]/);
    expect(DICT_AR, 'exports.ar.ts types a layer name').not.toMatch(/ENV-[A-Z0-9]/);
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

/* -------------------------------------------------------------------------
 * THE ARABIC PAGE, RENDERED.
 * ---------------------------------------------------------------------- */

describe('/exports in Arabic', () => {
  const html = (): string =>
    renderToStaticMarkup(
      <StaticLocale locale="ar">
        <Exports {...pageProps()} />
      </StaticLocale>,
    );

  const page = (): string =>
    stripTags(html())
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ');

  /** What an Arabic reader reads as Arabic: everything outside `Verbatim` and `code`. */
  const reading = (): string => arabicReadingText(html());

  it('carries the site-wide prohibitions', () => {
    expectSitewideProhibitions(html(), '/exports (ar)');
  });

  it('leaves no English prose outside what the files say', () => {
    expectNoEnglishProse(html(), '/exports (ar)');
  });

  it('opens on one heading', () => {
    expect([...html().matchAll(/<h1\b/g)].length).toBe(1);
  });

  it('prints every name it read out of a file, as the file has it, and marks it English', () => {
    /*
      THE FILE'S WORDS ARE NOT TRANSLATED. A layer name, a sheet number or title, a
      workbook sheet name, a note above a table, the Status line, the model's notice
      sentences, the JSON's fields and its validity detail: each must be on the
      Arabic page byte for byte, and each must sit OUTSIDE the Arabic reading text —
      inside `Verbatim` or `code` — so a screen reader switches voice for it and the
      bidi algorithm cannot move its full stop.
    */
    const text = page();
    const arabic = reading();
    const fromFile = [
      ...X.dxf.layers.map((l) => l.name),
      ...X.drawingSheets.flatMap((s) => [s.number, s.title]),
      ...X.workbookSheets.flatMap((s) => (s.note ? [s.name, s.note] : [s.name])),
      X.workbookStatus,
      ...X.glb.notice,
      ...X.glb.extensionsUsed,
      X.glb.units,
      ...X.jsonFields,
      X.jsonValidity.status,
      X.jsonValidity.detail,
    ];
    for (const name of fromFile) {
      expect(text, `${name} is in the file and not on the Arabic page`).toContain(name);
      expect(arabic, `${name} is on the Arabic page outside Verbatim or code`).not.toContain(name);
    }
    // Every `ENV-` token on the page is one the file declared, in Arabic as in English.
    const declared = new Set(X.dxf.layers.map((l) => l.name));
    for (const m of text.matchAll(/\bENV-[A-Z0-9][A-Z0-9_-]*/g)) {
      expect(declared.has(m[0]), `${m[0]} is on the Arabic page and not in the file`).toBe(true);
    }
  });

  it('marks, in amber, exactly the layers that hold something assumed', () => {
    expectAssumedTreatmentPresent(html(), '/exports (ar)');
    const markup_ = html();
    for (const layer of X.dxf.layers) {
      const marked = new RegExp(`data-state="assumed"><code class="value">${layer.name}</code>`).test(markup_);
      expect(marked, `${layer.name}: assumed ink ${layer.assumedInk}, marked ${marked}`).toBe(layer.assumedInk);
    }
  });

  it('renders the file paragraph from its one Arabic source', () => {
    // `IFC_GLTF_AR` is the paragraph `/refusals` renders too. A second translation
    // here would be the duplication `content/shared.tsx` exists to prevent.
    const text = page();
    const shared = stripTags(renderToStaticMarkup(<>{IFC_GLTF_AR.body}</>)).replace(/\s+/g, ' ').trim();
    expect(text).toContain(IFC_GLTF_AR.heading);
    expect(text).toContain(shared);
    expect(text).not.toContain(IFC_GLTF.heading);
    // IFC appears exactly as often as that paragraph names it: as something not produced.
    expect((text.match(/\bIFC\b/g) ?? []).length).toBe((shared.match(/\bIFC\b/g) ?? []).length);
  });

  it('prints the gates as the export answered them, and never says two people sign', () => {
    const text = page();
    for (const step of X.gateSequence) expect(text).toContain(String(step.status));
    // The correction the English carries — the check signed its own run — in Arabic.
    expect(text).toContain('وقّع تشغيلته هو');
    for (const falsehood of [/شخصين|شخصان/, /مراجِع ليس هو المُنشئ|غير المُنشئ/, /رخصة مُتحقَّق منها|رخصة موثَّقة/]) {
      expect(text, `/exports (ar) says ${falsehood}`).not.toMatch(falsehood);
    }
  });

  it('names no program, counts no formats and claims no integration', () => {
    const text = page();
    for (const claim of [
      /\b(AutoCAD|Revit|BricsCAD|LibreCAD|Blender|SketchUp|Rhino|ArchiCAD|Navisworks|Excel)\b/i,
      /(صيغتان|صيغتين|ثلاث صيغ|أربع صيغ|خمس صيغ|ستّ صيغ|ست صيغ|\d+ صيغ)/,
      /(أنواع|نوعان|نوعين) من الملفات/,
      /يتكامل مع|تكامل سلس|متوافق مع|يعمل مع|يُفتح في/,
    ]) {
      expect(text, `/exports (ar) says ${claim}`).not.toMatch(claim);
    }
    for (const claim of [/AutoCAD|Revit|Excel|SketchUp|Blender/i, /يتكامل مع|متوافق مع/]) {
      expect(DICT_AR, `exports.ar.ts says ${claim}`).not.toMatch(claim);
    }
  });

  it('offers no sample file', () => {
    expect(html()).not.toMatch(/\bdownload\b=/i);
    expect(html()).not.toMatch(/href="[^"]*\.(dxf|xlsx|glb|json|pdf)"/i);
  });
});
