/**
 * The landing page's worked example, re-derived from the engine.
 *
 * The landing page prints one run in full — setbacks, footprint, three bands,
 * which one binds and by how much — and its own comment claims that "every
 * figure in it is what the engine actually returns for that input". That claim
 * was false when this script was written. The page said the footprint was
 * 1,917.5 m² (true) and the governing capacity 6,352.5 m² (not true: the engine
 * returns 6,774.194 for that input, and had done since the saleable-efficiency
 * fix). Nobody noticed, because nothing checked.
 *
 * That is the exact failure the product exists to prevent, committed on the
 * page that advertises the prevention. A number quoted from memory is a number
 * with no provenance, whoever quotes it.
 *
 * So the figures live in `apps/web/src/screens/worked-example.json` — data, not
 * prose — and this script re-runs the real API in-process against the input
 * recorded beside them and fails if any published figure has moved.
 *
 *   node scripts/verify-worked-example.mjs          # check
 *   node scripts/verify-worked-example.mjs --write  # accept the engine's answer
 *
 * `--write` is how the page is *corrected*, never how a disagreement is
 * silenced: what it writes is what the engine said, so the page follows the
 * engine rather than the other way round.
 *
 * It needs `tsc -b` to have run — it loads `apps/api/dist`, the same composition
 * root the server uses, rather than reassembling a `RunInput` of its own. A
 * second assembly would be a second engine to keep in step.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import DxfParser from 'dxf-parser';

import { runSheets } from '../apps/api/dist/drawing.js';
import { subjectHash } from '../apps/api/dist/gates.js';
import { build } from '../apps/api/dist/server.js';
import { SqliteRunRepository } from '../apps/api/dist/store.js';
import { CLASS_ACI } from '../packages/exports/dist/index.js';

/* `exceljs` is the exports package's dependency, not the root's, so it is resolved
   from there. It is the library that wrote the file, reading it back: enough to
   read sheet names and notes, and no evidence about any other program. */
const ExcelJS = createRequire(new URL('../packages/exports/package.json', import.meta.url))('exceljs');

const FIXTURE = new URL('../apps/web/src/screens/worked-example.json', import.meta.url);
/**
 * The worked example's building model, which the landing page and /parking stand up
 * in 3D. A file of its own so the page's first chunk does not carry it: it is loaded
 * with the viewer, and only by a browser that can draw it. It is the API's `building`
 * for the recorded run, whole — a model rebuilt or trimmed here would be a second
 * engine, and the 3D figure would be of a building nobody computed.
 */
const MODEL = new URL('../apps/web/src/screens/worked-example.building.json', import.meta.url);
const WRITE = process.argv.includes('--write');

const published = JSON.parse(readFileSync(FIXTURE, 'utf8'));
const ACTOR = { 'x-actor-id': 'verify', 'x-actor-name': 'Worked example check' };

const repo = new SqliteRunRepository(':memory:');
const app = await build(repo);
app.log.level = 'silent';

const plot = (
  await app.inject({ method: 'POST', url: '/api/plots', headers: ACTOR, payload: published.input.plot })
).json();
if (!plot.plotId) {
  console.error('the plot was rejected:', JSON.stringify(plot));
  process.exit(1);
}

const res = await app.inject({
  method: 'POST',
  url: '/api/runs',
  headers: ACTOR,
  payload: { ...published.input.run, plotId: plot.plotId },
});
const run = res.json();
if (res.statusCode >= 300) {
  console.error('the run was rejected:', res.statusCode, JSON.stringify(run).slice(0, 600));
  process.exit(1);
}

/** A `Traced` value as the API presents it, reduced to what the page prints. */
const v = (t) => t?.value ?? null;

const actual = {
  plotAreaM2: v(run.plot.areaM2) ?? run.plot.areaM2,
  setbacksM: run.envelope.appliedSetbacks.map((s) => ({
    seq: s.seq,
    setbackM: s.setbackM,
    ruleId: s.ruleId,
  })),
  footprintM2: v(run.envelope.setbackPermittedFootprint),
  coverageCapM2: v(run.envelope.coverageCap),
  towerPlateCapM2: v(run.envelope.towerPlateCap),
  maxLevelsByHeight: v(run.envelope.maxLevelsByHeight),
  podiumOutline: run.envelope.podiumOutline,
  towerOutline: run.envelope.towerOutline,
  totalBays: v(run.parking.totalBays),
  bayAreaFactorM2: v(run.parking.bayAreaFactorM2),
  bayAreaFactorClass: run.parking.bayAreaFactorM2.provenanceClass,
  bandAM2: v(run.capacity.bandA),
  bandBM2: v(run.capacity.bandB),
  bandCM2: v(run.capacity.bandC),
  governingBand: run.capacity.governingBand,
  governingGfaM2: v(run.capacity.governingGfa),
  headroomToNextM2: run.capacity.headroomToNextM2,
  nextBindingBand: run.capacity.nextBindingBand,
  levels: v(run.capacity.levels),
  // The derivations the page shows when a figure is expanded. Taken from the
  // provenance graph rather than retyped, because a formula string that has
  // drifted is exactly as misleading as a value that has.
  formulas: Object.fromEntries(
    ['bandA', 'bandB', 'bandC', 'governingGfa', 'levels'].map((k) => [
      k,
      formulaFor(run.provenance, run.capacity[k]?.node),
    ]),
  ),

  /*
    THE PLACED LEVEL, and the refusal that replaces it when there is none.

    `present.ts` already serialises `run.levelPlan` in full — bay count, area per
    bay, deductions, module depth, usable area, the standard row, the podium ring,
    the packing rectangle, every placed rectangle, the access recommendation and the
    not-assessed residue. None of it reached the fixture, so `/parking` had nothing
    to draw and the page brief's degradation clause was the whole page.

    `levelPlanRefusal` is carried beside it rather than left to `null`, because an
    empty plan reads as "no bays" and the engine returns a REASON instead. A page
    that renders nothing where a refusal belongs has turned a finding about the plot
    into a gap in the software.
  */
  levelPlan: run.levelPlan ?? null,
  access: run.levelPlan?.access ?? null,
  levelPlanRefusal: run.levelPlanRefusal ?? null,

  /*
    THE BASIS FOR THE BAY-AREA FACTOR, lifted from the run's own assumption
    register.

    This is not optional and it is not decoration. The governing capacity on this
    plot rests on an available area divided by an assumed area-per-bay factor, and
    wherever that number is shown the assumption has to be visible IN THE SAME
    EYEFUL, amber, WITH ITS BASIS. The fixture carried the factor and its class and
    no basis at all, so the strongest sentence available to the page — the engine's
    own written reason for the number it assumed — was the one thing missing.

    It is engine-authored prose and is rendered verbatim. That is also why every
    basis on the recorded input is copy under the site's own rules: a basis reaches
    the public site word for word, so the fix for one that names a party or a
    commercial figure is always at source, never a truncation on the page. An
    assumption without a basis is not an assumption.
  */
  bayAreaFactorBasis: basisFor(run, 'parking.bay_area_factor'),
};

/** The written basis for one assumed parameter, off the run's assumption register. */
function basisFor(runView, parameterId) {
  const entry = (runView.assumptions ?? []).find((a) => a.parameterId === parameterId);
  return entry?.basis ?? null;
}

/** The `formula` on the COMPUTATION node a published value derives from. */
function formulaFor(graph, nodeId) {
  if (!graph || !nodeId) return null;
  const to = graph.edges.filter((e) => e.from === nodeId).map((e) => e.to);
  for (const id of to) {
    const n = graph.nodes.find((x) => x.id === id);
    if (n?.kind === 'COMPUTATION' && n.formula) return n.formula;
  }
  return null;
}

/*
  THE PARKING-IN-FAR COMPARISON, from the endpoint that computes it.

  The site quotes no cited range for what this declaration is worth — a
  specification range typed into copy was the weakest number available, and it is
  banned outright. What replaces it is the MEASURED spread for this actual plot,
  which is engine output under `pnpm example` like everything else on the site.

  All six keys the handler returns are carried, not five: the two sides, the two
  spreads, the relative spread and the verdict. A page that had five of them would
  have to compute the sixth, and a figure computed in the view layer is the one
  figure on the site that cannot answer where it came from.

  A LEG CAN FAIL, and the page rests a whole section on this, so the failure has a
  shape rather than a crash: the handler returns `{ error }` for a leg that throws
  and leaves both spreads null. The page then renders the leg that answered, the
  engine's own error string for the leg that did not, and NO SPREAD AT ALL — never a
  single column presented as a comparison, and never a spread computed from one side.
*/
const cmp = await app.inject({
  method: 'POST',
  url: '/api/runs/parking-in-far-comparison',
  headers: ACTOR,
  payload: { ...published.input.run, plotId: plot.plotId },
});
if (cmp.statusCode >= 300) {
  console.error(
    'the parking-in-FAR comparison was rejected:',
    cmp.statusCode,
    JSON.stringify(cmp.json()).slice(0, 600),
  );
  process.exit(1);
}
const comparison = cmp.json();
actual.parkingInFar = {
  countsTowardFar: comparison.countsTowardFar ?? null,
  excludedFromFar: comparison.excludedFromFar ?? null,
  regulatorySpreadM2: comparison.regulatorySpreadM2 ?? null,
  governingSpreadM2: comparison.governingSpreadM2 ?? null,
  governingSpreadRelative: comparison.governingSpreadRelative ?? null,
  verdict: comparison.verdict ?? null,
};

/*
  THE FILES, AS A READER DOWNLOADS THEM — for `/exports`.

  That page names layers, sheets, notes and the format of each file, and every one
  of them is read here out of the bytes the API returns, never out of the module
  that writes them: a layer name read off `layerName` is a statement about a
  function, and the page makes one about a file.

  It also measures the sentence the page opens on — that nothing leaves until the
  assumption register is acknowledged and a reviewer is named — by asking for the
  export before, between and after the two signatures, and recording the answers.

  The reviewer is the run's own author, with a licence string that says what it
  is. That the export then opens is part of what the page reports: nothing
  compares the two.
*/
const STAMP = 'REGULATORY VALIDITY: NOT ASSESSED';
const REVIEWER = { ...ACTOR, 'x-actor-licence': 'CHECK-ONLY' };
const exportAs = (format) =>
  app.inject({ method: 'POST', url: `/api/runs/${run.runId}/export?format=${format}`, headers: REVIEWER });
const refuse = (message) => {
  console.error(`/exports: ${message}`);
  process.exit(1);
};

const gateSequence = [{ signed: [], status: (await exportAs('json')).statusCode }];
const signed = [];
for (const [gate, subject] of [
  ['G3_ASSUMPTIONS_ACKNOWLEDGED', 'assumptions'],
  ['G4_REVIEWER_NAMED', 'capacity'],
]) {
  const r = await app.inject({
    method: 'POST',
    url: `/api/runs/${run.runId}/gates`,
    headers: gate === 'G4_REVIEWER_NAMED' ? REVIEWER : ACTOR,
    payload: { gate, subjectHash: subjectHash(run[subject]) },
  });
  if (r.statusCode >= 300) refuse(`${gate} was refused (${r.statusCode}): ${r.body.slice(0, 300)}`);
  signed.push(gate);
  gateSequence.push({ signed: [...signed], status: (await exportAs('json')).statusCode });
}

const download = async (format) => {
  const r = await exportAs(format);
  if (r.statusCode !== 200) refuse(`the ${format} export answered ${r.statusCode} with both gates signed`);
  return r;
};
const stampedIn = [];
const stamped = (format, text) => {
  if (!text.includes(STAMP)) refuse(`the ${format} file does not carry "${STAMP}"`);
  stampedIn.push(format);
};

// The JSON, first: it is the stored run, and the drawing list is composed from it
// by the same call the export makes.
const jsonExport = (await download('json')).json();
// In the JSON the claim is a field rather than a sentence, so the field is what is
// read: the first `regulatoryValidity` in the document, which must never be claimed.
const jsonValidity = (function find(node) {
  if (!node || typeof node !== 'object') return null;
  if (node.regulatoryValidity?.status) return node.regulatoryValidity;
  for (const child of Object.values(node)) {
    const hit = find(child);
    if (hit) return hit;
  }
  return null;
})(jsonExport.document);
if (jsonValidity?.status !== 'NEVER_CLAIMED') {
  refuse(`the JSON export's regulatoryValidity is ${JSON.stringify(jsonValidity?.status ?? null)}, not NEVER_CLAIMED`);
}
stampedIn.push('json');
if (!(jsonExport.payload?.provenance?.nodes?.length > 0)) {
  refuse('the JSON export carries no provenance graph, and the page says it carries the whole run');
}

stamped('html', (await download('html')).body);
const drawingSetHtml = (await download('sheets')).body;
stamped('sheets', drawingSetHtml);

// The drawing: the whole building, its layer table, and which layers carry the
// assumed ink the writer maps ASSUMED to.
const dxfText = (await download('dxf')).body;
stamped('dxf', dxfText);
const dxf = new DxfParser().parseSync(dxfText);
const amberInk = CLASS_ACI.ASSUMED;
const inkedAmber = new Set(dxf.entities.filter((e) => e.colorIndex === amberInk).map((e) => e.layer));
// Layer 0 is every DXF's own default layer, not one this writer names or draws on.
const dxfLayers = Object.values(dxf.tables?.layer?.layers ?? {})
  .filter((l) => l.name !== '0')
  .map((l) => ({ name: l.name, assumedInk: l.colorIndex === amberInk || inkedAmber.has(l.name) }));
if (dxfLayers.length === 0) refuse('the building DXF declares no layers');

// Every sheet as its own file, and each one stamped.
const drawingSheets = runSheets(jsonExport.payload).map((s) => ({ id: s.id, number: s.number, title: s.title }));
for (const sheet of drawingSheets) {
  const r = await app.inject({
    method: 'POST',
    url: `/api/runs/${run.runId}/export?format=dxf&sheet=${encodeURIComponent(sheet.id)}`,
    headers: REVIEWER,
  });
  if (r.statusCode !== 200) refuse(`sheet ${sheet.number} answered ${r.statusCode}`);
  if (!r.body.includes(STAMP)) refuse(`sheet ${sheet.number}'s DXF does not carry "${STAMP}"`);
}

// The workbook's sheet names and notes, read back out of the file.
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load((await download('xlsx')).rawPayload);
const workbookSheets = [];
let workbookStatus = null;
workbook.eachSheet((ws) => {
  const a1 = ws.getCell('A1');
  // A sheet's note is its first row, set in italic above the table; the cover opens
  // on a title instead and carries the disclaimer on its Status row.
  workbookSheets.push({ name: ws.name, note: a1.font?.italic ? String(a1.value) : null });
  ws.eachRow((row) => {
    if (row.getCell(1).value === 'Status') workbookStatus = String(row.getCell(2).value);
  });
});
if (!workbookStatus) refuse('the workbook has no Status row');
stamped('xlsx', workbookStatus);

// The 3D model: the container's own version, the glTF asset version, what it
// requires of a reader, and the sentences it carries in the scene's `extras`.
const glbBytes = (await download('glb')).rawPayload;
if (glbBytes.toString('ascii', 0, 4) !== 'glTF') refuse('the .glb does not open with the glTF magic');
const glbJson = JSON.parse(glbBytes.toString('utf8', 20, 20 + glbBytes.readUInt32LE(12)));
const glbExtras = glbJson.scenes?.[glbJson.scene ?? 0]?.extras ?? {};
stamped('glb', (glbExtras.notice ?? []).join(' '));

/*
  THE CARS, COUNTED IN EACH FILE — `/dashboard`'s parity row.

  Every drawing is walked from one model, so the files must draw the same cars as
  the engine placed: in the drawing set, a car symbol; in the DXF, an INSERT of the
  CAR block; in the model file, the car count each level's car mesh carries. This
  is the downloaded-file half of `pnpm parity`, which does the same over more plots
  and the screen, bay by bay. A disagreement stops the build here, so the row the
  dashboard prints can only ever show four equal numbers — and says what that is
  and is not evidence of.
*/
const carsEngine = Number(run.building.drawnBays.value);
const carsDrawingSet = (drawingSetHtml.match(/\bsh-symbol sh-car\b/g) ?? []).length;
const carsDxf = dxf.entities.filter((e) => e.type === 'INSERT' && e.name === 'CAR').length;
const carsModelFile = (glbJson.nodes ?? []).reduce((n, node) => n + (node.extras?.carCount ?? 0), 0);
if (new Set([carsEngine, carsDrawingSet, carsDxf, carsModelFile]).size !== 1) {
  refuse(
    `the files do not draw the engine's cars: engine ${carsEngine}, drawing set ${carsDrawingSet}, ` +
      `DXF ${carsDxf}, model file ${carsModelFile}`,
  );
}

actual.exports = {
  gateSequence,
  cars: { engine: carsEngine, drawingSet: carsDrawingSet, dxf: carsDxf, modelFile: carsModelFile },
  stampedIn,
  dxf: { version: dxf.header?.$ACADVER ?? null, layers: dxfLayers },
  drawingSheets,
  workbookSheets,
  workbookStatus,
  glb: {
    containerVersion: glbBytes.readUInt32LE(4),
    assetVersion: glbJson.asset?.version ?? null,
    extensionsRequired: glbJson.extensionsRequired ?? [],
    extensionsUsed: glbJson.extensionsUsed ?? [],
    notice: glbExtras.notice ?? [],
    units: glbExtras.units ?? null,
    notModelled: glbExtras.notModelled ?? [],
  },
  jsonFields: Object.keys(jsonExport),
  jsonValidity: { status: jsonValidity.status, detail: jsonValidity.detail ?? null },
};

await app.close();
repo.close();

if (!run.building) {
  console.error('the run carries no building model, so the 3D figure has nothing to draw.');
  process.exit(1);
}
const model = `${JSON.stringify(run.building)}\n`;

if (WRITE) {
  writeFileSync(
    FIXTURE,
    `${JSON.stringify({ ...published, verified: actual }, null, 2)}\n`,
    'utf8',
  );
  writeFileSync(MODEL, model, 'utf8');
  console.log('worked-example.json and worked-example.building.json rewritten from the engine.');
  process.exit(0);
}

/** Structural diff, so a moved number names itself. */
const problems = [];
(function walk(a, b, path) {
  if (JSON.stringify(a) === JSON.stringify(b)) return;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      walk(a[k], b[k], path ? `${path}.${k}` : k);
    }
    return;
  }
  problems.push(`${path}: page says ${JSON.stringify(a)}, engine says ${JSON.stringify(b)}`);
})(published.verified, actual, '');

// The model is compared whole. A figure on the page that moved is named above; a
// model that moved is one fact — the 3D figure is no longer the engine's building.
let stored = '';
try {
  stored = readFileSync(MODEL, 'utf8');
} catch {
  problems.push('worked-example.building.json: missing — the 3D figure has no model to draw');
}
if (stored && stored.replace(/\r\n/g, '\n') !== model) {
  problems.push('worked-example.building.json: the 3D figure is not the model the engine returns for this run');
}

if (problems.length > 0) {
  console.error('The landing page quotes figures the engine no longer returns:\n');
  for (const p of problems) console.error(`  ${p}`);
  console.error(
    '\nThe page follows the engine, never the reverse. Re-run with --write once you ' +
      'have read what changed and why.',
  );
  process.exit(1);
}

console.log(
  `Worked example verified against the engine: ${actual.setbacksM.length} setbacks, ` +
    `footprint ${actual.footprintM2} m², bands ${actual.bandAM2} / ${actual.bandBM2} / ` +
    `${actual.bandCM2}, ${actual.governingBand} governs.`,
);
