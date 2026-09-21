/**
 * Screenshots of every screen, for a design review that looks at the thing.
 *
 * `pnpm dev` first, then `pnpm shots <dir>` (defaults to ./.shots). It is not
 * part of `pnpm check` — it produces evidence for a person, not a verdict.
 */

import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

/**
 * THE ROUTES ARE READ FROM `routes.json`, not listed here.
 *
 * This script used to photograph `/` and `/app` and nothing else, so a route could
 * ship and never be looked at — on a repository whose design review IS looking at
 * the screenshots. One record, read by this script, by `smoke.mjs` and by the
 * application, so a route cannot exist and go unphotographed.
 */
const ROUTE_DATA = JSON.parse(
  readFileSync(new URL('../apps/web/src/routes.json', import.meta.url), 'utf8'),
);
const slug = (p) => (p === '/' ? 'landing' : p.replace(/^\//, '').replace(/\//g, '-'));
const OUT = process.argv[2] ?? '.shots';
// The dev server is not always on 5173: a stale process holds the port often
// enough that the fallback (5174, 5180, …) is the common case, and eleven
// screenshots of a connection error is a slow way to find that out.
const BASE = process.env.BASE ?? 'http://localhost:5173';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
// Straight to the engine. The landing page is shot separately below; starting
// there and clicking through cost a step for no picture.
await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
await page.getByLabel('Your name').fill('Khaled Haggagy');
await page.getByLabel(/licence number/i).fill('DM-12345');
await page.getByRole('button', { name: /open the engine/i }).first().click();

// Step 0 twice: empty, then holding a real sheet. The empty state is the first
// thing a new user sees and the one most often shipped unlooked-at.
await page.getByRole('heading', { name: /read an affection plan/i }).waitFor();
await page.screenshot({ path: `${OUT}/00-intake.png`, fullPage: true });
await page.setInputFiles(
  '#affection-plan-file',
  'docs/00-source/samples/affection-plan/IC1-CTYL-16_011-warsan1-621.pdf',
);
await page.locator('.reading').waitFor({ timeout: 20000 });
await page.screenshot({ path: `${OUT}/00b-intake-read.png`, fullPage: true });

await page.getByRole('button', { name: /skip/i }).click();
await page.getByRole('heading', { name: /^the plot$/i }).waitFor();
await page.screenshot({ path: `${OUT}/01-plot.png`, fullPage: true });

await page.getByLabel('Community').fill('Business Bay');
await page.getByLabel('Edge 1 faces').selectOption('ROAD');
await page.getByLabel('Road type').first().selectOption('LOCAL');
await page.getByLabel('Edge 2 faces').selectOption('ADJACENT_PLOT');
await page.getByLabel('Edge 3 faces').selectOption('ROAD');
await page.getByLabel('Road type').last().selectOption('COLLECTOR');
await page.getByLabel('Edge 4 faces').selectOption('ADJACENT_PLOT');
await page.getByRole('button', { name: /^Continue$/ }).click();
await page.getByRole('heading', { name: /confirm the plot/i }).waitFor();
await page.screenshot({ path: `${OUT}/02-parameters.png`, fullPage: true });

await page.getByRole('button', { name: /this is the plot/i }).click();
await page.getByRole('heading', { name: /does parking count toward far/i }).waitFor();
await page.screenshot({ path: `${OUT}/03-rules.png`, fullPage: true });

await page.getByRole('radio', { name: /no, it is excluded/i }).check();
// Select the developer standard, which fills the mix and the efficiency from
// the cited document. The picker is the client's own priority, so it is shot.
await page.getByRole('radio', { name: /Best case/i }).first().check();
await page.screenshot({ path: `${OUT}/03b-standard.png`, fullPage: true });
await page.getByRole('button', { name: /compute capacity/i }).click();
await page.locator('.data-table').first().waitFor({ timeout: 10000 });
await page.screenshot({ path: `${OUT}/04-assumptions.png`, fullPage: true });

const nav = async (n) => { await page.getByRole('button', { name: n }).first().click(); await page.waitForTimeout(400); };
await nav(/^Capacity$/);   await page.screenshot({ path: `${OUT}/05-capacity.png`, fullPage: true });
await nav(/^Parking$/);    await page.screenshot({ path: `${OUT}/06-parking.png`, fullPage: true });
await nav(/^Checks$/);     await page.screenshot({ path: `${OUT}/07-checks.png`, fullPage: true });
await nav(/^Evidence$/);   await page.screenshot({ path: `${OUT}/08-evidence.png`, fullPage: true });
await page.locator('button.traced').first().click();
await page.locator('[role="dialog"]').waitFor();
await page.screenshot({ path: `${OUT}/09-provenance.png`, fullPage: false });
await page.keyboard.press('Escape');
// The export screen is only interesting once the gates are satisfied and the
// artifacts exist; the empty state is a checklist.
await nav(/^Assumptions$/);
await page.getByRole('button', { name: /I have read the assumptions/i }).click();
await nav(/^Export$/);
await page.getByRole('button', { name: /sign this export/i }).click();
await page.getByRole('button', { name: /export report/i }).click();
await page.getByRole('button', { name: /open the report/i }).waitFor({ timeout: 15000 });
await page.screenshot({ path: `${OUT}/10-export.png`, fullPage: true });

/*
  EVERY PUBLIC ROUTE, FULL-PAGE, in both themes and at a phone width.

  `fullPage` is the part that matters and it is not a convenience: the reveal defect
  this repository has already shipped once — three whole sections blank because a
  scroll-driven animation held `opacity: 0` for anything that had never entered a
  viewport — is INVISIBLE in a viewport-sized screenshot and unmissable in a
  full-page one. A screenshot that only shows the fold cannot see the class of bug
  that lives below it.

  The engine route is shot as the antechamber here: a fresh page has no actor, which
  is exactly what a visitor arriving from a public call to action sees.
*/
const shootRoutes = async (label, opts) => {
  const p = await browser.newPage(opts);
  for (const r of ROUTE_DATA) {
    await p.goto(`${BASE}${r.path}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/${label}-${slug(r.path)}.png`, fullPage: true });
  }
  // And the page that renders instead of a route. It keeps whatever address it was
  // asked for, so it is reached by asking for one that is not there.
  await p.goto(`${BASE}/no-such-page`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${OUT}/${label}-not-found.png`, fullPage: true });
  await p.close();
};

await shootRoutes('20-light', { viewport: { width: 1440, height: 1000 } });
await shootRoutes('21-dark', { viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' });
await shootRoutes('22-mobile', { viewport: { width: 390, height: 844 } });

/*
  REDUCED MOTION MUST BE IDENTICAL, not merely acceptable.

  Every animation in this language sits inside `prefers-reduced-motion:
  no-preference`, so the base state IS the final state and there is no override to
  forget. That is a structural guarantee rather than a rule someone remembers, and
  this is how it is checked: the pair of shots below should differ in nothing.
*/
await shootRoutes('23-reduced-motion', {
  viewport: { width: 1440, height: 1000 },
  reducedMotion: 'reduce',
});

await browser.close();
console.log(`shot ${ROUTE_DATA.length + 1} pages per pass, four passes.`);
