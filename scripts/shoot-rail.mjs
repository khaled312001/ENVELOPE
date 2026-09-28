/** The workspace rail, expanded and collapsed, for a look rather than a verdict. */
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';
const OUT = process.argv[2] ?? '.shots';
const BASE = process.env.BASE ?? 'http://localhost:5173';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
for (const [label, collapsed, theme] of [['open', false, 'light'], ['shut', true, 'light'], ['shut-dark', true, 'dark']]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(([c, t]) => {
    try {
      localStorage.setItem('envelope.sidebar', c ? 'collapsed' : 'expanded');
      localStorage.setItem('envelope.theme', t);
    } catch { /* blocked storage */ }
  }, [collapsed, theme]);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/25-rail-${label}.png`, clip: { x: 0, y: 0, width: 640, height: 560 } });
  await ctx.close();
}
await browser.close();
console.log('shot the rail');
