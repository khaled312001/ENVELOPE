/*
 * WHAT THE ARABIC UI ACTUALLY CALLS THINGS, STAGE BY STAGE.
 *
 * The recorder drives the deployed product **in Arabic**, so every string it
 * matches has to be the string the deployment renders — not the one in the
 * dictionary source, which is a different file with its own chance of being
 * stale, and which changed wholesale the day the Arabic was rewritten.
 *
 * So this walks the whole flow with the language-independent handles the app
 * gives us — `#width`, `#edge-0-class`, `input[name="parking-far"]`,
 * `.button--primary`, `[role="tab"]` — and prints every accessible name it finds
 * at each stage. It changes nothing on the server beyond making one ordinary run,
 * and it records nothing.
 *
 * Run it, read the output, write the names into `record.mjs`.
 */
import { chromium } from '@playwright/test';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = process.env.VIDEO_URL ?? 'https://tob.khaledahmed.net/';
const PDF = resolve(ROOT, 'docs/00-source/samples/affection-plan/IC1-CTYL-16_011-warsan1-621.pdf');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.setDefaultTimeout(45_000);

async function dump(label) {
  const out = await page.evaluate(() => {
    const seen = new Set();
    for (const el of document.querySelectorAll('button, a[href], [role="button"], [role="radio"], [role="tab"]')) {
      const t = (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ');
      if (t && t.length < 110) {
        const cls = el.className && typeof el.className === 'string' ? el.className.split(/\s+/)[0] : '';
        seen.add(`  ${el.tagName === 'A' ? 'LNK' : 'BTN'}  .${cls || '—'}  «${t}»`);
      }
    }
    for (const el of document.querySelectorAll('input, select, textarea')) {
      let name = '';
      if (el.id) {
        const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (l) name = l.innerText.trim();
      }
      if (!name) name = el.getAttribute('aria-label') || '';
      const tag = `${el.tagName.toLowerCase()}${el.type ? '[' + el.type + ']' : ''}`;
      seen.add(`  FLD  ${tag}  id=${el.id || '—'}  name=${el.name || '—'}  value=${el.value || '—'}  «${name.replace(/\s+/g, ' ')}»`);
    }
    const h = [...document.querySelectorAll('h1,h2')].map(
      (e) => `  HD   «${e.innerText.trim().replace(/\s+/g, ' ')}»`,
    );
    return [...h, ...seen].join('\n');
  });
  console.log(`\n=========== ${label} ===========\n${out}`);
}

/** The primary action of the step currently on screen. */
const primary = () => page.locator('.button--primary').last();

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

/* The language control is the one whose own label is in the OTHER language. */
const lang = page.getByRole('button', { name: /العربية|عربي|arabic/i }).first();
console.log('language control:', JSON.stringify(await lang.innerText().catch(() => '— not found —')));
await lang.click();
await page.waitForTimeout(2500);
console.log('html dir/lang:', await page.evaluate(() => `${document.documentElement.dir}/${document.documentElement.lang}`));

await dump('1 · LANDING (ar)');

await page.goto(new URL('/app', BASE).href, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await dump('2 · ANTECHAMBER (ar)');

await page.getByLabel('اسمك').first().fill('Khaled Haggagy');
await page.waitForTimeout(400);
await primary().click();
await page.waitForTimeout(2500);
await dump('3 · INTAKE / step 0 (ar)');

await page.setInputFiles('input[type="file"]', PDF);
await page.waitForTimeout(12_000);
await dump('4 · INTAKE, READ (ar)');

await page.getByRole('button', { name: 'استخدم هذه القيم' }).click();
await page.waitForTimeout(3000);
await dump('5 · PLOT (ar)');

await page.locator('#width').fill('50.85');
await page.locator('#depth').fill('26.85');
await page.locator('#edge-0-class').selectOption('ROAD');
await page.locator('#edge-0-road').selectOption('LOCAL');
await page.locator('#edge-1-class').selectOption('ADJACENT_PLOT');
await page.locator('#edge-2-class').selectOption('ROAD');
await page.locator('#edge-2-road').selectOption('COLLECTOR');
await page.locator('#edge-3-class').selectOption('ADJACENT_PLOT');
await page.waitForTimeout(1200);
await dump('6 · PLOT, CLASSIFIED (ar)');

await page.getByRole('button', { name: 'متابعة', exact: true }).click();
const confirm = page.getByRole('button', { name: 'هذه هي القطعة' });
await confirm.waitFor({ timeout: 60_000 });
await page.waitForTimeout(1500);
await dump('7 · PARAMETERS (ar)');

await confirm.click();
await page.waitForTimeout(3000);
await dump('8 · RULES (ar)');

await page.locator('#saleable-efficiency').fill('0.93').catch(() => {});
await page.locator('input[name="parking-far"][value="EXCLUDED"]').check().catch(async () => {
  await page.locator('input[name="parking-far"]').nth(1).check();
});
await page.waitForTimeout(1000);
await dump('9 · RULES, ANSWERED (ar)');

await page.getByRole('button', { name: /احسب|السعة/ }).last().click();
await page.locator('.data-table').first().waitFor({ timeout: 120_000 });
await page.waitForTimeout(2500);
await dump('10 · ASSUMPTIONS (ar)');

await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(2000);
await dump('11 · RESULTS, FOOT OF PAGE (ar)');

console.log('\ntabs:', await page.locator('[role="tab"]').allInnerTexts());

await browser.close();
