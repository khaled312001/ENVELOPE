/**
 * Look at the parking drawings for a handful of plots — the way a reviewer does.
 *
 * Boots the API in process (as `pnpm example` does), computes each plot, composes
 * the drawing set, and writes every parking-level sheet and the site plan as PNG
 * to out/look-parking/. Prints, per level, the bays placed and whether any bay
 * overlaps the core's shafts or the ramp — the defect a picture shows at a glance
 * and a count never does.
 *
 *   node scripts/look-parking.mjs [--allow-core]
 *
 * Needs `tsc -b` to have run: it loads apps/api/dist.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

import { runSheets } from '../apps/api/dist/drawing.js';
import { build } from '../apps/api/dist/server.js';
import { SqliteRunRepository } from '../apps/api/dist/store.js';
import { sheetSvg } from '../packages/sheets/dist/index.js';

const OUT = new URL('../out/look-parking/', import.meta.url);
mkdirSync(OUT, { recursive: true });
const file = (name) => new URL(name, OUT).pathname.replace(/^\/([A-Za-z]:)/, '$1');
// Bays under the core are dropped by default now; this flag keeps them, to
// photograph the defect the default exists to prevent.
const OVER = process.argv.includes('--allow-core');

const rect = (w, d) => [
  { x: '0', y: '0' },
  { x: String(w), y: '0' },
  { x: String(w), y: String(d) },
  { x: '0', y: String(d) },
];
const edges = [
  { seq: 0, classification: 'ROAD', roadHierarchy: 'LOCAL' },
  { seq: 1, classification: 'ADJACENT_PLOT' },
  { seq: 2, classification: 'ROAD', roadHierarchy: 'COLLECTOR' },
  { seq: 3, classification: 'ADJACENT_PLOT' },
];
const RUN = {
  parkingInFar: 'EXCLUDED_FROM_FAR',
  unitMix: {
    source: 'USER_SET',
    entries: [
      { typeId: '1BED', label: '1 bedroom', share: '0.5', nsaM2: '70' },
      { typeId: '2BED', label: '2 bedroom', share: '0.5', nsaM2: '110' },
    ],
  },
  parkingUsableFraction: { value: '0.85', source: 'ASSUMED', basis: 'the usable fraction of a parking level after cores, ramps and plant' },
  saleableEfficiency: { value: '0.93', source: 'USER_SET', basis: 'the conservative end of the saleable-to-GFA range in the project brief on file' },
  realismDiscount: '1.00',
  useDraftRules: true,
  ...(OVER ? { levelPlan: { avoidCore: false } } : {}),
};

// A real sheet bound to its plot, so the run is held to the limits it prints.
const sheet = (name) => ({
  content: readFileSync(new URL(`../docs/00-source/samples/affection-plan/${name}`, import.meta.url)).toString('base64'),
  filename: name,
});
// Al Mamzar's corners as the sheet draws them on DLTM, as metres from its first corner.
const MAMZAR = [
  ['501938.189', '2798367.201'],
  ['501865.390', '2798433.567'],
  ['501855.961', '2798259.639'],
  ['501938.901', '2798349.996'],
].map(([e, n]) => ({ x: (Number(e) - 501938.189).toFixed(3), y: (Number(n) - 2798367.201).toFixed(3) }));

const PLOTS = [
  {
    tag: 'warsan',
    plot: {
      plotNumber: '6211383',
      community: 'WARSAN FIRST',
      landUse: 'RESIDENTIAL_MULTI',
      vertices: rect('50.85', '26.85'),
      edges,
      affectionPlan: sheet('IC1-CTYL-16_011-warsan1-621.pdf'),
    },
    run: { parkingLevelsAvailable: 3, levels: { basements: 0, groundIsParking: true, podiumAboveGround: 2, podiumParkingLevels: 2 } },
  },
  {
    tag: 'mamzar',
    plot: {
      plotNumber: '1341556',
      community: 'AL MAMZAR',
      landUse: 'RESIDENTIAL_MULTI',
      vertices: MAMZAR,
      edges: [
        { seq: 0, classification: 'ROAD', roadHierarchy: 'ARTERIAL' },
        { seq: 1, classification: 'ADJACENT_PLOT' },
        { seq: 2, classification: 'ROAD', roadHierarchy: 'COLLECTOR' },
        { seq: 3, classification: 'OTHER' },
      ],
      affectionPlan: sheet('DM-1341556-al-mamzar.pdf'),
    },
    run: { parkingLevelsAvailable: 2, levels: { basements: 0, groundIsParking: true, podiumAboveGround: 1, podiumParkingLevels: 1 } },
  },
  {
    tag: 'worked-80x40',
    plot: { plotNumber: '345-1234', community: 'Business Bay', landUse: 'RESIDENTIAL_MULTI', vertices: rect('80', '40'), edges },
    run: { parkingLevelsAvailable: 2, levels: { basements: 1, groundIsParking: true, podiumAboveGround: 1, podiumParkingLevels: 0 } },
  },
  {
    tag: 'deep-60x45',
    plot: { plotNumber: 'LOOK-60x45', community: 'Test', landUse: 'RESIDENTIAL_MULTI', vertices: rect('60', '45'), edges },
    run: { parkingLevelsAvailable: 2, levels: { basements: 2, groundIsParking: false, podiumAboveGround: 0, podiumParkingLevels: 0 } },
  },
];

const ACTOR = { 'x-actor-id': 'look', 'x-actor-name': 'Parking look' };
const app = await build(new SqliteRunRepository(':memory:'));
app.log.level = 'silent';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1131 } });

for (const p of PLOTS) {
  const plot = (await app.inject({ method: 'POST', url: '/api/plots', headers: ACTOR, payload: p.plot })).json();
  if (!plot.plotId) {
    console.log(p.tag, 'plot rejected', JSON.stringify(plot).slice(0, 300));
    continue;
  }
  const res = await app.inject({ method: 'POST', url: '/api/runs', headers: ACTOR, payload: { ...RUN, ...p.run, plotId: plot.plotId } });
  const run = res.json();
  if (res.statusCode >= 300) {
    console.log(p.tag, 'run rejected', res.statusCode, JSON.stringify(run).slice(0, 400));
    continue;
  }
  const lp = run.levelPlan;
  console.log(`\n== ${p.tag}: ${lp ? `${lp.bayCount?.value ?? '?'} bays/level` : `no level plan: ${run.levelPlanRefusal}`}`);
  for (const n of lp?.notAssessed ?? []) console.log('   · ' + (process.env.FULL ? n : n.slice(0, 200)));

  // Overlap of bays with the core shaft and the ramp, on the model the drawings draw.
  const model = run.building;
  for (const level of model?.levels ?? []) {
    const bays = level.bays ?? [];
    if (!bays.length) continue;
    console.log(`   ${level.id}: ${bays.length} bays`);
  }

  const sheets = runSheets(run);
  for (const s of sheets) {
    if (!/A-1|A-001/.test(s.number)) continue;
    const svg = sheetSvg(s);
    const name = `${p.tag}${OVER ? '-over-core' : ''}-${s.number}.png`;
    await page.setContent(`<!doctype html><html><body style="margin:0;background:#fff">${svg}</body></html>`);
    await page.locator('svg').first().screenshot({ path: file(name) });
    writeFileSync(file(name.replace('.png', '.svg')), svg);
    console.log('   wrote', name);
  }
}
await browser.close();
await app.close();
