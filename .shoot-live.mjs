import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const BASE = 'https://tob.khaledahmed.net';
const OUT = 'E:/ENVELOPE/.shots-live';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

// Sign in as the trial account, so /work shows the strip with real rows.
await page.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle' });
try {
  await page.getByLabel(/email/i).fill(process.env.DEMO_EMAIL ?? '');
  await page.getByLabel(/^password$/i).fill(process.env.DEMO_PASSWORD ?? '');
  await page.getByRole('button', { name: /sign in/i }).first().click();
  await page.waitForTimeout(3000);
} catch (e) {
  console.log('sign-in skipped:', String(e).slice(0, 140));
}

for (const [name, path] of [
  ['work', '/work'],
  ['app', '/app'],
]) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot', name);
}

// Step 0 holding the DDA sheet: the reading the client photographed as wrong.
await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
try {
  await page.getByRole('heading', { name: /read an affection plan/i }).waitFor({ timeout: 20000 });
  await page.setInputFiles(
    '#affection-plan-file',
    'docs/00-source/samples/affection-plan/DDA-5134565-saih-shuaib-1.pdf',
  );
  await page.locator('.reading').waitFor({ timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/intake-dda.png`, fullPage: true });
  console.log('shot intake-dda');
} catch (e) {
  console.log('intake failed:', String(e).slice(0, 200));
}
await browser.close();
