/** The two auth screens, for a look rather than a verdict. */
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';
const OUT = process.argv[2] ?? '.shots';
const BASE = process.env.BASE ?? 'http://localhost:5173';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const shots = [
  ['sign-up', '/sign-up', 'light', 'en', 1440, 1000],
  ['sign-in', '/sign-in', 'light', 'en', 1440, 1000],
  ['sign-up-dark', '/sign-up', 'dark', 'en', 1440, 1000],
  ['sign-up-ar', '/sign-up', 'light', 'ar', 1440, 1000],
  ['sign-up-phone', '/sign-up', 'light', 'en', 390, 844],
];
for (const [label, path, theme, locale, w, h] of shots) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(([t, l]) => {
    try {
      localStorage.setItem('envelope.theme', t);
      localStorage.setItem('envelope.locale', l);
    } catch { /* blocked storage */ }
  }, [theme, locale]);
  const page = await ctx.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/26-${label}.png`, fullPage: true });
  await ctx.close();
}
await browser.close();
console.log('shot the auth screens');
