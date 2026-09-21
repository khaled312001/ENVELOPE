/**
 * Builds the TOP.ai proposal: two languages, self-contained HTML, and a PDF.
 *
 *   node docs/04-delivery/proposal/build.mjs
 *
 * Three things this script exists to guarantee, all of which the previous
 * version of the document got wrong:
 *
 * 1. **One stylesheet.** The Arabic and the English document are the same CSS
 *    with `dir` flipped. Two copies of a stylesheet is two stylesheets that
 *    disagree by the third edit.
 *
 * 2. **Small files.** The old build inlined eleven full font faces across three
 *    families — 279 KB of base64 in a 317 KB HTML, and a 1.0 MB PDF. Here each
 *    document gets one family, and each face is subset to the characters that
 *    document actually uses before it is inlined. An Arabic face carries several
 *    thousand glyphs; a proposal uses a couple of hundred.
 *
 * 3. **Page breaks that land where the author put them.** The PDF is rendered
 *    with `preferCSSPageSize`, so `@page { size: A4 }` and the `break-before`
 *    rules in `proposal.css` are what decide the pagination — not Playwright's
 *    own margin box.
 *
 * Requires `python` with `fonttools[woff]` (already present in this repo's
 * toolchain) and Playwright's bundled Edge.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { chromium } from '@playwright/test';

const HERE = new URL('.', import.meta.url);
const OUT = new URL('../', HERE);
const CSS = readFileSync(new URL('proposal.css', HERE), 'utf8');

/** Chrome's UA, so Google Fonts serves woff2 rather than a legacy format. */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/126.0.0.0 Safari/537.36';

const DOCS = [
  {
    lang: 'en',
    dir: 'ltr',
    title: 'TOP.ai — Development Capacity Engine · Technical & Commercial Proposal',
    family: 'IBM Plex Sans',
    // Plex Mono carries every figure in both documents; the numerals are the one
    // thing a reader compares down a column.
    extra: 'IBM Plex Mono',
  },
  {
    lang: 'ar',
    dir: 'rtl',
    title: 'TOP.ai — محرك الطاقة الاستيعابية · عرض فني ومالي',
    // One Arabic family that also carries Latin, so "DXF" inside an Arabic
    // sentence does not fall back to a different face mid-line.
    family: 'IBM Plex Sans Arabic',
    extra: 'IBM Plex Mono',
  },
];

const WEIGHTS = [400, 600, 700];
const work = join(tmpdir(), `proposal-fonts-${process.pid}`);
mkdirSync(work, { recursive: true });

/** The `src: url(...)` for one family+weight, subset to `text` and inlined. */
async function faceFor(family, weight, text) {
  const api =
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}` +
    `&display=swap`;
  const css = await (await fetch(api, { headers: { 'User-Agent': UA } })).text();
  // Google returns one @font-face per unicode-range subset (latin, latin-ext,
  // arabic, …). Every one is downloaded and merged through the subsetter, which
  // then throws away whatever this document does not use.
  const urls = [...css.matchAll(/url\((https:\/\/[^)]+\.woff2)\)/g)].map((m) => m[1]);
  if (urls.length === 0) throw new Error(`no woff2 for ${family} ${weight}`);

  const pieces = [];
  for (const [i, url] of urls.entries()) {
    const raw = Buffer.from(await (await fetch(url)).arrayBuffer());
    const src = join(work, `${slug(family)}-${weight}-${i}.woff2`);
    writeFileSync(src, raw);
    const dst = `${src}.sub.woff2`;
    const txt = join(work, `${slug(family)}-${weight}-${i}.txt`);
    writeFileSync(txt, text, 'utf8');
    try {
      execFileSync(
        'python',
        [
          '-m', 'fontTools.subset', src,
          `--text-file=${txt}`,
          '--flavor=woff2',
          `--output-file=${dst}`,
          // Arabic is a joining script: the shaper reaches initial/medial/final
          // forms through GSUB, and those glyphs are not in the `--text` set.
          // Dropping the layout tables would render every Arabic word in
          // isolated forms — legible to nobody.
          '--layout-features=*',
          '--no-hinting',
          '--desubroutinize',
        ],
        { stdio: 'pipe' },
      );
    } catch {
      continue; // this unicode-range subset shares no character with the text
    }
    if (statSync(dst).size > 600) pieces.push({ dst, weight });
  }
  return pieces.map(
    ({ dst }) =>
      `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};` +
      `font-display:swap;src:url(data:font/woff2;base64,${readFileSync(dst).toString('base64')}) ` +
      `format('woff2')}`,
  );
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const browser = await chromium.launch({ channel: 'msedge' });
const summary = [];

for (const doc of DOCS) {
  const body = readFileSync(new URL(`content.${doc.lang}.html`, HERE), 'utf8');

  /*
    The character set to keep.

    Taken from the rendered text plus the punctuation the stylesheet itself
    injects (the ✓ and ✕ in `content`), plus every digit in both numeral systems
    — a subset that is missing one glyph shows a notdef box, and a proposal with
    a box in it is a proposal that looks unfinished.
  */
  const text =
    body.replace(/<[^>]+>/g, ' ') +
    ' ✓✕·—–…«»‹›“”‘’()[]{}<>/\\|@#%&*+=_~^$£€' +
    '0123456789٠١٢٣٤٥٦٧٨٩٫٬' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' +
    'ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝàáâãäåçèéêëìíîïñòóôõöùúûüýÿ';

  const faces = [];
  for (const family of [doc.family, doc.extra]) {
    for (const w of WEIGHTS) {
      if (family === doc.extra && w === 700) continue; // mono needs 400/600 only
      faces.push(...(await faceFor(family, w, text)));
    }
  }

  const html =
    `<!doctype html>\n<html lang="${doc.lang}" dir="${doc.dir}">\n<head>\n` +
    `<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n` +
    `<title>${doc.title}</title>\n<style>\n${faces.join('\n')}\n</style>\n` +
    `<style>\n${CSS}</style>\n</head>\n<body>\n${body}\n</body>\n</html>\n`;

  const htmlPath = new URL(`TOP-ai-proposal-${doc.lang}.html`, OUT);
  writeFileSync(htmlPath, html, 'utf8');

  const page = await browser.newPage();
  await page.goto(htmlPath.href, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });

  /*
    Every sheet must fit its page, measured rather than eyeballed.

    A sheet that overruns 297mm is content the reader never sees — `overflow:
    hidden` deletes it silently, and without it the section spills onto a page
    of its own with two lines on it. Both failures look fine in a thumbnail,
    which is why this is a build error and not a warning.
  */
  const overfull = await page.evaluate(() => {
    const mm = 297 / 25.4 * 96; // 297mm at CSS 96dpi
    return [...document.querySelectorAll('.sheet')]
      .map((s, i) => ({ i: i + 1, over: Math.round(s.scrollHeight - mm) }))
      .filter((s) => s.over > 1);
  });
  if (overfull.length > 0) {
    const detail = overfull.map((s) => `sheet ${s.i} by ${s.over}px`).join(', ');
    throw new Error(
      `${doc.lang}: ${overfull.length} sheet(s) overflow A4 — ${detail}. ` +
        `Cut content or tighten the block; do not clip it.`,
    );
  }

  const pdfPath = new URL(`TOP-ai-proposal-${doc.lang}.pdf`, OUT);
  await page.pdf({
    path: new URL(pdfPath).pathname.replace(/^\//, ''),
    printBackground: true,
    preferCSSPageSize: true, // `@page { size: A4 }` wins, not Playwright's box
  });

  // How many pages actually came out. The whole point of the rewrite is that
  // this number is five or six, and that nothing was cut mid-card to get there.
  const pdf = readFileSync(pdfPath);
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  await page.close();

  summary.push({
    lang: doc.lang,
    faces: faces.length,
    html: `${(statSync(htmlPath).size / 1024).toFixed(0)} KB`,
    pdf: `${(pdf.length / 1024).toFixed(0)} KB`,
    pages,
  });
}

await browser.close();
rmSync(work, { recursive: true, force: true });

console.table(summary);
