/**
 * THE USER GUIDE, BUILT: the template filled from a real run, then printed to A4.
 *
 *   node scripts/guide/capture.mjs   # pictures, the run, the downloaded files
 *   node scripts/guide/build.mjs     # → out/user-guide/index.html + TOP.ai-user-guide.pdf
 *
 * NO FIGURE IN THE GUIDE IS TYPED BY HAND. The template holds `{{name}}` wherever it
 * quotes a number, and every name is filled here from what `capture.mjs` saved: the
 * run as the API holds it, the affection plan as the engine read it, the readiness
 * figures, and the files a reader downloaded — the workbook, the CAD file and the 3D
 * model, each read back with a reader that is not ours. A name the template uses
 * and this script does not fill stops the build; a blank in a guide is a figure
 * somebody will fill in by hand later.
 *
 * The contents list carries page numbers, which the browser cannot compute for
 * itself, so the guide is printed twice: once to find which page each chapter lands
 * on (read back out of the PDF), and once with those numbers filled in.
 *
 * And the finished PDF is checked for what must never be in it: a developer's name
 * from a brief shared in confidence, and a value printed as "[object Object]".
 */

import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { chromium } from '@playwright/test';

const OUT = process.env.GUIDE_OUT ?? 'out/user-guide';
const SRC = 'docs/04-delivery/user-guide';
const FILES = join(OUT, 'files');
const PDF = join(OUT, 'TOP.ai-user-guide.pdf');

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const run = read(join(FILES, 'run-view.json'));
const intake = read(join(FILES, 'intake.json'));
const dash = read(join(FILES, 'dashboard.json'));
const manifest = read(join(OUT, 'manifest.json'));
const tabs = read(join(FILES, 'sheet-tabs.json')).map((t) => t.replace(/\s+/g, ' ').trim());

// ---------------------------------------------------------------------------
// Figures, as the engine printed them
// ---------------------------------------------------------------------------

const v = (x) => (x && typeof x === 'object' && 'value' in x ? x.value : x);
/** Thousands grouped, the places given — the site's own figure style. */
const fmt = (raw, places) => {
  const n = Number(v(raw));
  if (!Number.isFinite(n)) throw new Error(`not a figure: ${JSON.stringify(raw)}`);
  return n.toLocaleString('en-US', { minimumFractionDigits: places, maximumFractionDigits: places });
};
const pct = (ratio, places = 1) => `${(Number(ratio) * 100).toFixed(places)}%`;
const at = (iso) => `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;

const f = {};

// The run.
f['run.id'] = run.runId;
f['run.short'] = run.runId.slice(0, 8);
f['run.engine'] = run.engineVersion;
f['run.ms'] = String(run.elapsedMs);
f['run.warning'] = run.warning;

// The plot.
f['plot.number'] = run.plot.plotNumber;
f['plot.community'] = run.plot.community;
f['plot.area'] = fmt(run.plot.areaM2, 2);
// Width and depth from the outline the engine built — millimetres, integer.
const xs = run.building.plot.outline.map((p) => p.x);
const ys = run.building.plot.outline.map((p) => p.y);
f['plot.width'] = ((Math.max(...xs) - Math.min(...xs)) / 1000).toFixed(2);
f['plot.depth'] = ((Math.max(...ys) - Math.min(...ys)) / 1000).toFixed(2);
// The setback each edge took, as the engine applied it (edge numbers as the form shows them).
for (const e of run.building.plot.edges) f[`edge${e.seq + 1}.setback`] = fmt(e.setbackM, 2);

// The affection plan, as the engine read it.
const sheet = intake.facts;
const sv = (k) => {
  const x = sheet[k];
  if (x === undefined || x === null) throw new Error(`the reading has no ${k}; its keys are ${Object.keys(sheet).join(', ')}`);
  return v(x);
};
f['sheet.parcel'] = String(sv('parcelId'));
f['sheet.community'] = String(sv('community'));
f['sheet.area'] = String(sv('totalAreaSqm'));
f['sheet.far'] = String(sv('far'));
f['sheet.gfa'] = String(sv('gfaSqm'));
f['sheet.height'] = String(sv('height').raw);
f['sheet.podiumLevels'] = String(sv('height').podiumLevels);
f['sheet.setbacks'] = String(sv('setbacks').raw);
f['sheet.coverage'] = String(sv('coverage').raw);
f['sheet.landUse'] = String(sv('landUse'));
f['sheet.issued'] = String(sv('issueDate'));
f['sheet.drawing'] = String(sv('drawingRef'));
f['sheet.crossCheck'] = sheet.crossChecks.map((c) => c.detail).join('; ');
f['sheet.missing'] = String(sheet.missing.length);
f['sheet.file'] = intake.filename;
f['sheet.farTimesArea'] = (Number(f['sheet.far']) * Number(f['sheet.area'])).toFixed(2);

// The envelope.
const env = run.envelope;
f['env.footprint'] = fmt(env.setbackPermittedFootprint, 1);
f['env.coverage'] = fmt(env.coverageCap, 1);
f['env.height'] = fmt(env.heightCeilingM, 0);
f['env.f2f'] = fmt(env.floorToFloorM, 1);
f['env.maxLevels'] = String(v(env.maxLevelsByHeight));

// Capacity — the three bands, never merged.
const cap = run.capacity;
f['cap.A'] = fmt(cap.bandA, 1);
f['cap.B'] = fmt(cap.bandB, 1);
f['cap.C'] = fmt(cap.bandC, 1);
f['cap.governing'] = fmt(cap.governingGfa, 1);
f['cap.band'] = { REGULATORY: 'A', GEOMETRIC: 'B', PARKING: 'C' }[v(cap.governingBand)];
f['cap.levels'] = String(v(cap.levels));
f['cap.headroom'] = fmt(cap.headroomToNextM2, 1);
f['cap.explanation'] = v(cap.explanation);
f['cap.impliedFar'] = (Number(v(cap.bandA)) / Number(run.plot.areaM2)).toFixed(2);
/*
  WHICH LIMIT BINDS IS A FACT ABOUT THE RUN, SO THE SENTENCE COMES FROM THE RUN.

  This was `if (band !== 'C') throw` and a chapter that said, in the template,
  "parking is what binds this plot". It was true when it was written and stopped
  being true the moment the affection plan began binding `far.max` itself: the
  regulatory band came in at 4,778 m² under the parking band's 4,864, and the
  build refused — correctly, because the alternative was a guide whose prose
  contradicted the figures printed beside it.

  Refusing was right and freezing the answer was not. The guide quotes no figure
  it has not been handed, and the governing band is a figure like any other; a
  template that can only describe one of the three outcomes is a template that
  will be wrong again on the next plot. So the sentence is filled here, one per
  band, and the assertion that remains is that the band is one the guide has a
  sentence for — which fails loudly if the engine ever adds a fourth.
*/
const GOVERNS = {
  A:
    'الحد التنظيمي هو الذي يلزم هذه القطعة: مخطط الأفكشن يثبت معامل البناء بنفسه، ' +
    'فلا يبلغ المشروع ما يسمح به شكل القطعة ولا ما تستطيع المواقف خدمته. ويقول المحرك ذلك بجملته:',
  B:
    'شكل القطعة هو الذي يلزمها: بعد الارتدادات والارتفاع المسموح، لا تتسع الأرض لما ' +
    'يسمح به معامل البناء. ويقول المحرك ذلك بجملته:',
  C:
    'المواقف هي التي تلزم هذه القطعة. يسمح النظام بمساحة أكبر مما يستطيع عرض المواقف ' +
    'أن يخدمه، ويقول المحرك ذلك بجملته:',
};
if (!GOVERNS[f['cap.band']]) {
  throw new Error(`no sentence for governing band ${v(cap.governingBand)}; add one to GOVERNS`);
}
f['cap.governs'] = GOVERNS[f['cap.band']];

// Parking.
const pk = run.parking;
f['pk.required'] = String(v(pk.totalBays));
f['pk.resident'] = String(v(pk.residentBays));
f['pk.visitor'] = String(v(pk.visitorBays));
f['pk.factor'] = String(v(pk.bayAreaFactorM2));
f['pk.levelsRequired'] = String(v(pk.levelsRequired));
f['pk.levelsAvailable'] = String(v(pk.levelsAvailable));
f['pk.unitCeiling'] = String(v(pk.supportableUnitCeiling));
const lp = run.levelPlan;
f['lp.bays'] = String(v(lp.bayCount));
f['lp.areaPerBay'] = String(v(lp.areaPerBayM2));
f['lp.reserved'] = String(v(lp.deductionsM2));
f['lp.usable'] = String(v(lp.usableAreaM2));
f['lp.bayW'] = String(lp.standard.bayWidthM);
f['lp.bayL'] = String(lp.standard.bayLengthM);
f['lp.aisle'] = String(lp.standard.drivewayWidthM);
f['bld.drawnBays'] = String(v(run.building.drawnBays));
const rec = lp.access.recommended;
f['access.edge'] = String(rec.edgeSeq + 1);
f['access.width'] = String(rec.widthM);
f['access.window'] = String(rec.usableWindowM);
f['access.rejected'] = String(lp.access.rejected?.length ?? 0);

// Values the provenance graph holds and the run's top level does not.
const node = (parameterId) => {
  const n = run.provenance.nodes.find((x) => x.parameterId === parameterId);
  if (!n) throw new Error(`the run's graph holds no ${parameterId}`);
  return n.value;
};
f['cap.permittedFar'] = fmt(node('capacity.permitted_far'), 2);
f['cap.achievedFar'] = fmt(node('capacity.achieved_far'), 3);
f['in.efficiency'] = String(node('capacity.saleable_efficiency'));
f['in.parkingLevels'] = String(node('parking.levels_available'));
f['in.realism'] = fmt(node('capacity.user_realism_discount'), 2);
f['pk.requiredArea'] = fmt(pk.requiredAreaM2, 0);
f['cap.granularityLoss'] = fmt(cap.integerGranularityLossM2, 1);
f['ramp.gradient'] = fmt(run.building.ramps[0].gradientPct, 2);
f['bld.levels'] = String(run.building.levels.length);
f['bld.unused'] = String(run.building.levels.filter((l) => !l.placed && l.use === 'TYPICAL').length);

// Assumptions.
const asm = run.assumptions;
f['asm.count'] = String(asm.length);
f['asm.top'] = asm[0].parameterId;
f['asm.topEffect'] = asm[0].sensitivity ? pct(asm[0].sensitivity.relativeEffect) : '—';
f['asm.measured'] = String(asm.filter((a) => a.sensitivity).length);
// The register as the run holds it, ranked as the screen ranks it: one row each.
f['asm.rows'] = asm
  .map((a, i) => {
    const value = a.value.split('; ').map((line) => esc(line)).join('<br>');
    const effect = a.sensitivity ? pct(a.sensitivity.relativeEffect) : 'لم يقس';
    return (
      `<tr><td class="num">${i + 1}</td><td class="en">${esc(a.parameterId)}</td>` +
      `<td class="en small">${value}${a.unit ? ` ${esc(a.unit)}` : ''}</td><td class="num">${effect}</td></tr>`
    );
  })
  .join('');

// Checks.
const inv = run.checks.invariants;
f['inv.ran'] = String(inv.ran);
f['inv.total'] = String(inv.total);
f['inv.dormant'] = String(inv.dormant.length);
f['inv.dormantList'] = inv.dormant.join(' · ');
f['inv.passed'] = String(inv.results.filter((r) => r.status === 'PASS').length);
f['inv.failed'] = String(inv.results.filter((r) => r.status === 'FAIL').length);
// The answer re-checked against the rules by the module that cannot see the engine.
const vs = run.checks.validation.summary;
f['con.checked'] = String(vs.hardChecked);
f['con.satisfied'] = String(vs.hardSatisfied);
f['con.violated'] = String(vs.hardViolated);
f['con.deferred'] = String(vs.deferredDeclared);
f['con.lifeSafety'] = String(vs.lifeSafetyDeferred);

// Gates, as the run recorded them.
const g3 = run.gates.G3_ASSUMPTIONS_ACKNOWLEDGED;
const g4 = run.gates.G4_REVIEWER_NAMED;
if (!g3 || !g4) throw new Error('the captured run is not signed at both export gates');
f['g3.by'] = g3.actorName;
f['g3.at'] = at(g3.at);
f['g4.by'] = g4.actorName;
f['g4.at'] = at(g4.at);
f['author'] = manifest.author;
f['reviewer'] = manifest.reviewer;

/*
  THE TRIAL LOGIN, FROM THE ENVIRONMENT AND FROM NOWHERE ELSE.

  The guide gives a reader an account to try the site with, and a password is not
  a fact about the run — it is a secret that must not be in a tracked file. So it
  arrives the way the capture received it, as `GUIDE_*` environment variables,
  and reaches only the built PDF, which is not tracked.

  It is REFUSED rather than defaulted when the build is not given one. A guide
  that printed "undefined" where the password goes, or worse a placeholder that
  looked like a password, would send a reader to a door that does not open — and
  the template cannot silently drop the section, because an unknown key throws.
*/
f['demo.url'] = process.env.GUIDE_URL ?? manifest.base;
f['demo.email'] = process.env.GUIDE_AUTHOR_EMAIL ?? '';
f['demo.password'] = process.env.GUIDE_AUTHOR_PASSWORD ?? '';
for (const key of ['demo.email', 'demo.password']) {
  if (f[key]) continue;
  throw new Error(
    `the guide prints a trial login and ${key} is not set. Build it with ` +
      'GUIDE_AUTHOR_EMAIL and GUIDE_AUTHOR_PASSWORD in the environment — the same ' +
      'pair the capture used — so the login in the guide is one that opens.',
  );
}

// Readiness.
const rd = dash.readiness;
f['rd.rules'] = `${rd.rulesApproved} / ${rd.rulesTotal}`;
f['rd.rulesTotal'] = String(rd.rulesTotal);
f['rd.defs'] = `${rd.definitionsSigned} / ${rd.definitionsTotal}`;
f['rd.defsTotal'] = String(rd.definitionsTotal);
f['rd.annex'] = rd.annexVersion;

// The drawing set, by the tabs the page showed.
f['sheets.count'] = String(tabs.length);
f['sheets.list'] = tabs.join(' · ');

// ---------------------------------------------------------------------------
// The downloaded files, read back
// ---------------------------------------------------------------------------

const exportsReq = createRequire(new URL('../../packages/exports/package.json', import.meta.url));
const ExcelJS = exportsReq('exceljs');
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(join(FILES, 'run.xlsx'));
f['xlsx.count'] = String(wb.worksheets.length);
f['xlsx.sheets'] = wb.worksheets.map((w) => w.name).join(' · ');
// The Capacity sheet's three band rows, as the file holds them.
const capSheet = wb.getWorksheet('Capacity');
const bandRows = [];
capSheet?.eachRow((row) => {
  const label = String(row.getCell(1).value ?? '');
  if (/^Band [ABC]/.test(label)) bandRows.push({ label, value: row.getCell(2).value, cls: row.getCell(4).value });
});
f['xlsx.bands'] = bandRows
  .map((r) => `<tr><td class="en">${esc(r.label)}</td><td class="num">${fmt(r.value, 1)}</td><td><span class="tag tag--derived en">${esc(r.cls)}</span></td></tr>`)
  .join('');

const DxfParser = createRequire(import.meta.url)('dxf-parser');
const dxf = new DxfParser().parseSync(readFileSync(join(FILES, 'run.dxf'), 'utf8'));
const layers = Object.keys(dxf.tables.layer.layers).filter((l) => l !== '0');
const byLayer = {};
for (const e of dxf.entities) byLayer[e.layer] = (byLayer[e.layer] ?? 0) + 1;
f['dxf.layers'] = String(layers.length);
f['dxf.entities'] = String(dxf.entities.length);
f['dxf.cars'] = String(Object.entries(byLayer).filter(([l]) => /-CAR$/.test(l)).reduce((s, [, n]) => s + n, 0));
f['dxf.units'] = dxf.header.$INSUNITS === 6 ? 'metres' : `INSUNITS ${dxf.header.$INSUNITS}`;
f['dxf.sampleLayers'] = layers.filter((l) => /^ENV-(SITE|L00)-/.test(l)).slice(0, 12).join(' · ');
if (f['dxf.cars'] !== f['bld.drawnBays']) throw new Error(`the DXF draws ${f['dxf.cars']} cars; the engine placed ${f['bld.drawnBays']}`);

const glb = readFileSync(join(FILES, 'run.glb'));
const gltf = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8'));
f['glb.kb'] = String(Math.round(glb.length / 1024));
f['glb.nodes'] = String(gltf.nodes?.length ?? 0);
f['glb.notice'] = (gltf.scenes?.[0]?.extras?.notice ?? []).join(' ');

// The day the pictures were taken — the guide describes the site as it was then.
f['guide.date'] = manifest.at.slice(0, 10);

// `--facts` prints every figure the template may quote, and stops: the list a writer works from.
if (process.argv.includes('--facts')) {
  for (const [k, val] of Object.entries(f)) console.log(`${k.padEnd(20)} ${String(val).slice(0, 140)}`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// The template
// ---------------------------------------------------------------------------

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
/** Keys whose value is markup this script built, not text to escape. */
const RAW = new Set(['xlsx.bands', 'asm.rows', 'inv.rows']);

const template = readFileSync(join(SRC, 'guide.html'), 'utf8');
const used = new Set();
function fill(html, pages) {
  return html.replace(/\{\{([a-zA-Z0-9.:_-]+)\}\}/g, (_, key) => {
    if (key.startsWith('page:')) {
      if (!pages) return '··';
      const p = pages[key.slice(5)];
      if (p === undefined) throw new Error(`no chapter marker @@${key.slice(5)}@@ was found in the PDF`);
      return String(p);
    }
    if (!(key in f)) throw new Error(`the template quotes {{${key}}}, and nothing fills it`);
    used.add(key);
    return RAW.has(key) ? f[key] : esc(f[key]);
  });
}

// Every picture the template names must have been taken.
for (const [, src] of template.matchAll(/src="(shots\/[^"]+)"/g)) {
  if (!existsSync(join(OUT, src))) throw new Error(`the template shows ${src}, which capture.mjs did not take`);
}

copyFileSync(join(SRC, 'guide.css'), join(OUT, 'guide.css'));
const INDEX = join(OUT, 'index.html');

const browser = await chromium.launch({ channel: 'msedge' });
async function print(html) {
  writeFileSync(INDEX, html);
  const page = await browser.newPage();
  await page.goto(pathToFileURL(resolve(INDEX)).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await page.pdf({ path: PDF, preferCSSPageSize: true, printBackground: true, tagged: true, outline: true });
  await page.close();
}

const intakeLib = await import(pathToFileURL(resolve('packages/intake/dist/index.js')).href);
async function pagesOf() {
  const pages = await intakeLib.readPdfText(new Uint8Array(readFileSync(PDF)));
  const found = {};
  let text = '';
  for (const p of pages) {
    const line = p.items.map((i) => i.text).join(' ');
    text += `\n${line}`;
    // The PDF may split a marker into runs ("@@", "ch-1", "@@"), so it is matched
    // with the spaces between runs taken out.
    for (const [, id] of line.replace(/\s+/g, '').matchAll(/@@([a-z0-9-]+)@@/g)) found[id] ??= p.page;
  }
  return { found, text, count: pages.length };
}

// Pass one: where does each chapter land?
await print(fill(template, null));
const first = await pagesOf();
// Pass two: the contents, numbered.
await print(fill(template, first.found));
const second = await pagesOf();
await browser.close();

for (const [id, p] of Object.entries(first.found)) {
  if (second.found[id] !== p) throw new Error(`chapter ${id} moved from page ${p} to ${second.found[id]} when the contents were numbered`);
}
// What must never be in the guide.
if (/azizi/i.test(second.text) || /azizi/i.test(readFileSync(INDEX, 'utf8'))) throw new Error('the guide names a developer whose brief was shared in confidence');
if (/\[object Object\]/.test(second.text)) throw new Error('the guide prints a value as [object Object]');

/*
  NO DIACRITICS, AND NOW SOMETHING CHECKS.

  `docs/05-design/arabic-glossary.md` §5 states the rule — "No diacritics. None."
  — in the client's own words, and nothing enforced it, so this guide shipped
  1,184 of them: a mark every seventy characters, in a document written for a
  professional who does not read vowelled text. The glossary names the ranges and
  it names the one trap in removing them: `لم يُقيَّم` unvowelled is `لم يقيم`,
  which reads as "he did not stay". The answer there is not to keep the shadda
  but to change the word, and the app had already done it — `checks.ar.ts` ships
  `لم يخضع للتقييم` and says why. The guide now says what the screen says.

  Checked over the PRINTED TEXT and not only the template, because the figures
  are filled at build time and a diacritic can arrive in one of them. U+0640
  (tatweel) is not a diacritic and is not matched: it is a letter-stretching
  character, and a rule that caught it would fail on type nobody set wrong.
*/
const vowelled = second.text.match(/[ً-ْٰ]/g);
if (vowelled) {
  const where = /.{0,40}[ً-ْٰ].{0,40}/.exec(second.text)?.[0] ?? '';
  throw new Error(
    `the guide prints ${vowelled.length} diacritic(s); the glossary's rule is "none". ` +
      `Where a word needs its marks to be read, change the word. First: …${where}…`,
  );
}
const unused = Object.keys(f).filter((k) => !used.has(k));

console.log(`guide: ${second.count} pages → ${PDF}`);
console.log(`chapters: ${Object.entries(second.found).map(([k, p]) => `${k}@${p}`).join(' ')}`);
if (unused.length) console.log(`figures read but not quoted: ${unused.join(', ')}`);
