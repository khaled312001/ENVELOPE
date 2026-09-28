/** The nine-step flow with its new rail, at three widths. */
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';
const OUT = process.argv[2] ?? '.shots';
const BASE = process.env.BASE ?? 'http://localhost:5173';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
for (const [label, w, h] of [['wide', 1440, 1000], ['mid', 1000, 900], ['phone', 390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
  await page.getByLabel('Your name').fill('Khaled Haggagy');
  await page.getByRole('button', { name: /open the engine/i }).first().click();
  await page.getByRole('heading', { name: /read an affection plan/i }).waitFor();
  // `click()` scrolls its target into view, so the page is 900px down by the time
  // the heading resolves — which photographed the colophon and an empty grid.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/27-flow-${label}.png`, fullPage: false });
  await ctx.close();
}
await browser.close();
console.log('shot the flow');
