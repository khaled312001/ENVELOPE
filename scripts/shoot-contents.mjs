/**
 * The contents block on each of the five long pages, cropped to itself.
 *
 * `shoot.mjs` photographs whole routes, and a 14,000px page renders this block
 * about 90 pixels tall — too small to judge in the frame that shows it.
 *
 *   BASE=http://localhost:5173 node scripts/shoot-contents.mjs .shots/contents
 */
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const OUT = process.argv[2] ?? '.shots/contents';
const BASE = process.env.BASE ?? 'http://localhost:5173';
const ROUTES = [
  ['/', 'landing'],
  ['/parking', 'parking'],
  ['/exports', 'exports'],
  ['/refusals', 'refusals'],
  ['/readiness', 'dashboard'],
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
let missing = 0;
for (const [route, slug] of ROUTES) {
  for (const [label, width, height] of [
    ['wide', 1440, 1000],
    ['phone', 390, 844],
  ]) {
    const ctx = await browser.newContext({ viewport: { width, height } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    const nav = page.locator('nav.contents');
    if ((await nav.count()) === 0) {
      console.log(`${slug.padEnd(10)} ${label.padEnd(6)} NO CONTENTS BLOCK`);
      missing += 1;
    } else {
      await nav.scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      const box = await nav.boundingBox();
      await page.screenshot({
        path: `${OUT}/${slug}-${label}.png`,
        clip: {
          x: 0,
          y: Math.max(0, box.y - 40),
          width,
          height: Math.min(height, box.height + 90),
        },
      });
      const items = await nav.locator('li').count();
      console.log(
        `${slug.padEnd(10)} ${label.padEnd(6)} ${Math.round(box.width)}x${Math.round(box.height)}  ${items} entries`,
      );
    }
    await ctx.close();
  }
}
await browser.close();
if (missing > 0) {
  console.error(`\n${missing} page(s) render no contents block.`);
  process.exit(1);
}
