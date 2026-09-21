/**
 * The landing page, at the three widths a design review actually argues about.
 *
 * Separate from `shoot.mjs` because that script signs in and walks the engine —
 * eleven screenshots to reach a page that needs no state at all. Iterating on
 * the landing page through it meant a forty-second round trip per adjustment.
 *
 *   BASE=http://localhost:5180 node scripts/shoot-landing.mjs .shots/after
 */

import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const OUT = process.argv[2] ?? '.shots/landing';
const BASE = process.env.BASE ?? 'http://localhost:5173';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge' });

for (const [name, viewport, colorScheme] of [
  ['desktop', { width: 1440, height: 1000 }, 'light'],
  ['desktop-dark', { width: 1440, height: 1000 }, 'dark'],
  ['tablet', { width: 834, height: 1112 }, 'light'],
  ['phone', { width: 390, height: 844 }, 'light'],
  ['phone-320', { width: 320, height: 640 }, 'light'],
]) {
  const page = await browser.newPage({ viewport, colorScheme, deviceScaleFactor: 1 });
  // The dark shots need the stored preference, not the OS one: index.html
  // deliberately ignores `prefers-color-scheme` so a printed report is light.
  if (colorScheme === 'dark') {
    await page.addInitScript(() => localStorage.setItem('envelope.theme', 'dark'));
  }
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  await page.screenshot({ path: `${OUT}/${name}-fold.png` });

  // The one measurement a screenshot cannot show. A page that scrolls sideways
  // on a phone is the defect this repo has shipped most often.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  console.log(`${name.padEnd(14)} overflow=${overflow}px`);
  if (overflow > 0) process.exitCode = 1;
  await page.close();
}

await browser.close();
console.log(`shot -> ${OUT}`);
