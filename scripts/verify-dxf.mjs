/**
 * `pnpm dxf` — the drawings the API actually serves, read back by a second reader.
 *
 * The unit tests check the DXF writer, and they check it with the writer's own
 * inputs in hand. This checks the file a user downloads: it boots the real API,
 * computes real runs — the landing page's recorded worked example among them —
 * signs the two gates an export needs, downloads the whole building and every
 * sheet on its own, and hands each file to `dxf-parser`, a reader that has never
 * seen our code. What it counts is compared with what the engine says it drew.
 *
 * WHY A SECOND READER. A DXF is a flat run of (code, value) pairs. One stray line
 * shifts every pair after it, and the file still looks plausible in a text editor
 * while opening in AutoCAD as an empty drawing, or as a drawing with half its bays.
 * Our writer cannot be trusted to find its own off-by-one; a parser it did not
 * write can.
 *
 * What fails the run, for every file:
 *   - it does not parse, or parses to nothing;
 *   - an entity sits on a layer the file never declared, or inserts a block it
 *     never defined — AutoCAD repairs both silently, which is worse than failing;
 *   - a text is not printable ASCII — R12 is not Unicode, and anything else is
 *     mojibake in somebody's drawing;
 *   - either of the two sentences is missing: NOT FOR CONSTRUCTION, and
 *     REGULATORY VALIDITY: NOT ASSESSED. A file detached from the screen carries
 *     its own disclaimer or none;
 *   - the car count is not the engine's bay count — per level, and in total.
 *
 * Needs the built `dist` of the API and the sheets package: `pnpm check` runs it
 * after `pnpm typecheck`, which builds them.
 *
 * Run: `node scripts/verify-dxf.mjs`
 */

import { readFileSync } from 'node:fs';

import DxfParser from 'dxf-parser';

import { subjectHash } from '../apps/api/dist/gates.js';
import { build } from '../apps/api/dist/server.js';
import { SqliteRunRepository } from '../apps/api/dist/store.js';
import { composeSheets } from '../packages/sheets/dist/index.js';

const ACTOR = { 'x-actor-id': 'verify-dxf', 'x-actor-name': 'DXF check' };
const REVIEWER = { ...ACTOR, 'x-actor-licence': 'CHECK-ONLY' };

const published = JSON.parse(
  readFileSync(new URL('../apps/web/src/screens/worked-example.json', import.meta.url), 'utf8'),
);

const edge = (seq, classification, roadHierarchy) => ({
  seq,
  classification,
  ...(roadHierarchy ? { roadHierarchy } : {}),
});

/**
 * Five runs, chosen to break different things: the recorded worked example,
 * because it is the one a reader of the landing page will download; a plain
 * rectangle with two roads, because the access placement has a choice to make;
 * the same rectangle with a U-turn ramp and with a sloped loop, because a ramp in
 * pieces is written as several faces at their own heights; and a skewed
 * quadrilateral, because a writer that assumed axis-aligned geometry would pass
 * the others.
 */
const PLOTS = [
  { name: 'worked example', plot: published.input.plot },
  {
    name: '80 x 40, two roads',
    plot: {
      plotNumber: 'DXF-80X40',
      community: 'CHECK',
      landUse: 'RESIDENTIAL_MULTI',
      vertices: [
        { x: '0', y: '0' },
        { x: '80', y: '0' },
        { x: '80', y: '40' },
        { x: '0', y: '40' },
      ],
      edges: [
        edge(0, 'ROAD', 'LOCAL'),
        edge(1, 'ADJACENT_PLOT'),
        edge(2, 'ROAD', 'ARTERIAL'),
        edge(3, 'ADJACENT_PLOT'),
      ],
    },
  },
  /*
    The two stated ramp forms, on the same plot: a U-turn's legs and landing and
    a loop's sloped aisles are written as faces at their own heights, and the
    cars must still be the engine's bays.
  */
  ...['U_TURN', 'LOOP'].map((rampForm) => ({
    name: `80 x 40, ${rampForm === 'LOOP' ? 'sloped loop' : 'U-turn ramp'}`,
    run: { rampForm },
    plot: {
      plotNumber: `DXF-${rampForm}`,
      community: 'CHECK',
      landUse: 'RESIDENTIAL_MULTI',
      vertices: [
        { x: '0', y: '0' },
        { x: '80', y: '0' },
        { x: '80', y: '40' },
        { x: '0', y: '40' },
      ],
      edges: [
        edge(0, 'ROAD', 'LOCAL'),
        edge(1, 'ADJACENT_PLOT'),
        edge(2, 'ROAD', 'ARTERIAL'),
        edge(3, 'ADJACENT_PLOT'),
      ],
    },
  })),
  {
    name: 'skewed',
    plot: {
      plotNumber: 'DXF-SKEW',
      community: 'CHECK',
      landUse: 'RESIDENTIAL_MULTI',
      vertices: [
        { x: '10', y: '0' },
        { x: '80', y: '20' },
        { x: '70', y: '60' },
        { x: '0', y: '40' },
      ],
      edges: [
        edge(0, 'ROAD', 'LOCAL'),
        edge(1, 'ADJACENT_PLOT'),
        edge(2, 'ROAD', 'COLLECTOR'),
        edge(3, 'ADJACENT_PLOT'),
      ],
    },
  },
];

const failures = [];
const fail = (where, message) => failures.push(`${where}: ${message}`);

const repo = new SqliteRunRepository(':memory:');
const app = await build(repo);
app.log.level = 'silent';

/** dxf-parser's default export is the constructor under Node; see test-support/dxf.ts. */
const parse = (text) => new DxfParser().parseSync(text);

const rows = [];

for (const { name, plot: plotBody, run: runExtra } of PLOTS) {
  const plot = (await app.inject({ method: 'POST', url: '/api/plots', headers: ACTOR, payload: plotBody })).json();
  if (!plot.plotId) {
    fail(name, `the plot was rejected: ${JSON.stringify(plot).slice(0, 300)}`);
    continue;
  }
  const res = await app.inject({
    method: 'POST',
    url: '/api/runs',
    headers: ACTOR,
    payload: { ...published.input.run, ...(runExtra ?? {}), plotId: plot.plotId },
  });
  const run = res.json();
  if (res.statusCode >= 300) {
    fail(name, `the run was rejected (${res.statusCode}): ${JSON.stringify(run).slice(0, 300)}`);
    continue;
  }
  if (!run.building) {
    fail(name, 'the run carries no building model, so there is nothing to draw');
    continue;
  }

  for (const [gate, subject] of [
    ['G1_PLOT_CONFIRMED', 'plot'],
    ['G2_RULES_ACKNOWLEDGED', 'rules'],
    ['G3_ASSUMPTIONS_ACKNOWLEDGED', 'assumptions'],
    ['G4_REVIEWER_NAMED', 'capacity'],
  ]) {
    await app.inject({
      method: 'POST',
      url: `/api/runs/${run.runId}/gates`,
      headers: gate === 'G4_REVIEWER_NAMED' ? REVIEWER : ACTOR,
      payload: { gate, subjectHash: subjectHash(run[subject]) },
    });
  }

  const model = run.building;
  const sheets = composeSheets(model, {
    plotNumber: run.plot.plotNumber,
    community: run.plot.community,
    runId: run.runId,
  });
  const parkingLevels = model.levels.filter((l) => l.parking);
  const drawnBays = Number(model.drawnBays.value);

  const download = async (sheet) => {
    const url = `/api/runs/${run.runId}/export?format=dxf${sheet ? `&sheet=${encodeURIComponent(sheet.id)}` : ''}`;
    const r = await app.inject({ method: 'POST', url, headers: REVIEWER });
    return r.statusCode === 200 ? r.body : (fail(`${name} ${sheet?.number ?? 'building'}`, `HTTP ${r.statusCode}`), null);
  };

  /** The checks every file answers to. Returns the parsed file, or null. */
  const common = (where, text) => {
    let dxf;
    try {
      dxf = parse(text);
    } catch (e) {
      fail(where, `does not parse: ${e.message}`);
      return null;
    }
    if (!dxf || dxf.entities.length === 0) {
      fail(where, 'parses to an empty drawing');
      return null;
    }
    const declared = new Set(Object.keys(dxf.tables?.layer?.layers ?? {}));
    const undeclared = new Set(dxf.entities.map((e) => e.layer).filter((l) => !declared.has(l)));
    if (undeclared.size) fail(where, `draws on undeclared layers: ${[...undeclared].join(', ')}`);
    const blocks = new Set(Object.keys(dxf.blocks ?? {}));
    const missing = new Set(dxf.entities.filter((e) => e.type === 'INSERT' && !blocks.has(e.name)).map((e) => e.name));
    if (missing.size) fail(where, `inserts undefined blocks: ${[...missing].join(', ')}`);
    const texts = dxf.entities.filter((e) => e.type === 'TEXT').map((t) => t.text);
    const bad = texts.filter((t) => !/^[\x20-\x7E]*$/.test(t));
    if (bad.length) fail(where, `${bad.length} text(s) outside printable ASCII, e.g. ${JSON.stringify(bad[0])}`);
    const all = texts.join('\n');
    for (const sentence of ['NOT FOR CONSTRUCTION', 'REGULATORY VALIDITY: NOT ASSESSED']) {
      if (!all.includes(sentence)) fail(where, `does not carry "${sentence}"`);
    }
    if (dxf.header?.$INSUNITS !== 6) fail(where, `$INSUNITS is ${dxf.header?.$INSUNITS}, not 6 (metres)`);
    return dxf;
  };
  const cars = (dxf, layer) =>
    dxf.entities.filter((e) => e.type === 'INSERT' && e.name === 'CAR' && (!layer || e.layer === layer));

  // --- the whole building ------------------------------------------------------
  const whole = await download(null);
  if (whole) {
    const where = `${name} building`;
    const dxf = common(where, whole);
    if (dxf) {
      const total = cars(dxf).length;
      if (total !== drawnBays) fail(where, `${total} cars against the engine's ${drawnBays} bays`);
      for (const level of parkingLevels) {
        const want = Number(level.parking.bayCount.value);
        const onLevel = cars(dxf, `ENV-${level.id}-CAR`);
        if (onLevel.length !== want) fail(where, `level ${level.id}: ${onLevel.length} cars against ${want} bays`);
        const z = level.elevationMm / 1000;
        if (onLevel.some((c) => Math.abs((c.position?.z ?? 0) - z) > 1e-4)) {
          fail(where, `level ${level.id}: a car is not at the level's elevation ${z} m`);
        }
      }
      rows.push([name, 'building', dxf.entities.length, Object.keys(dxf.tables.layer.layers).length, total, drawnBays]);
    }
  }

  // --- every sheet on its own ----------------------------------------------------
  for (const sheet of sheets) {
    const text = await download(sheet);
    if (!text) continue;
    const where = `${name} ${sheet.number}`;
    const dxf = common(where, text);
    if (!dxf) continue;
    if (dxf.entities.some((e) => e.type === '3DFACE')) fail(where, 'a flat sheet carries 3D faces');
    const level = parkingLevels.find((l) => l.id === sheet.levelId);
    const want = sheet.kind === 'PARKING' && level ? Number(level.parking.bayCount.value) : 0;
    const got = cars(dxf).length;
    if (got !== want) fail(where, `${got} cars against ${want} bays`);
    rows.push([name, sheet.number, dxf.entities.length, Object.keys(dxf.tables.layer.layers).length, got, want]);
  }
}

await app.close();
repo.close();

const widths = [18, 9, 9, 7, 5, 9];
const line = (cells) => cells.map((c, i) => String(c).padEnd(widths[i])).join(' ');
console.log(line(['plot', 'file', 'entities', 'layers', 'cars', 'engine']));
for (const r of rows) console.log(line(r));

if (rows.length === 0) failures.push('no file was checked — a check over nothing is not a pass');
if (failures.length) {
  console.error(`\n${failures.length} failure(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`\n${rows.length} DXF file(s) read back by dxf-parser; every car is a bay the engine placed.`);
