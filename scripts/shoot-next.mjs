/**
 * Screenshots of the new front end at /next — one PNG per screen, the way
 * `pnpm shots` does for the current site, because a screen is reviewed by
 * looking at it.
 *
 * It drives the worked example through every step as a reader would: enters
 * with a name, files the plot, answers the rules, computes, and visits each step.
 * Nothing is stubbed — the API on :4000 computes every figure in the pictures.
 *
 *   node scripts/shoot-next.mjs [base]      base defaults to http://localhost:5174/next
 */
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const BASE = (process.argv[2] ?? 'http://localhost:5174/next').replace(/\/$/, '');
const OUT = new URL('../out/shots-next/', import.meta.url);
mkdirSync(OUT, { recursive: true });
const path = (name) => new URL(`${name}.png`, OUT).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const browser = await chromium.launch({ channel: 'msedge' });

async function walk(locale, viewport, tag) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await context.addInitScript((l) => {
    try {
      localStorage.setItem('envelope.locale', l);
      localStorage.removeItem('envelope.actor');
    } catch {}
  }, locale);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto(`${BASE}/`);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path(`${tag}-01-landing`) });
  await page.screenshot({ path: path(`${tag}-01-landing-full`), fullPage: true });

  await page.goto(`${BASE}/studio?example=1`);
  await page.waitForURL(/enter/);
  await page.screenshot({ path: path(`${tag}-02-enter`) });
  await page.locator('input[autocomplete="name"]').fill('Studio Reviewer');
  await page.locator('form').nth(1).locator('button[type="submit"]').click();
  await page.waitForURL(/studio/);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path(`${tag}-03-plot`) });

  const primary = (re) => page.getByRole('button', { name: re });
  await primary(locale === 'ar' ? /تسجيل القطعة/ : /File the plot/).click();
  await page.waitForTimeout(1200);
  await primary(locale === 'ar' ? /المتابعة إلى القواعد/ : /Continue to the rules/).click().catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: path(`${tag}-04-rules`) });

  await primary(locale === 'ar' ? /احسب الدراسة/ : /Compute the study/).click();
  await page.waitForURL(/studio\/[0-9a-f-]{8,}/, { timeout: 60_000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path(`${tag}-05-capacity`) });

  const step = async (re, name, wait = 1500) => {
    await page.getByRole('navigation').getByRole('button', { name: re }).click();
    await page.waitForTimeout(wait);
    await page.screenshot({ path: path(`${tag}-${name}`) });
  };
  await step(locale === 'ar' ? /المواقف/ : /Parking/, '06-parking');
  await step(locale === 'ar' ? /الفحوصات/ : /Checks/, '07-checks');
  await step(locale === 'ar' ? /التصدير/ : /Export/, '08-export');

  // A traced value opens its derivation.
  await page.getByRole('navigation').getByRole('button', { name: locale === 'ar' ? /السعة/ : /Capacity/ }).click();
  await page.waitForTimeout(1500);
  await page.locator('aside button[data-class]').first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path(`${tag}-09-derivation`) });
  await page.keyboard.press('Escape');

  await page.goto(`${BASE}/studies`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path(`${tag}-10-studies`) });

  console.log(`${tag}: ${errors.length ? errors.join('\n  ') : 'no console errors'}`);
  await context.close();
}

/*
  The public site: every page, in each language and each theme, full length —
  and on a phone, where any sideways scroll is a failure. Each page's head is
  read back too: its title must be its own and it must declare both languages.
*/
const PAGES = ['', 'product', 'parking', 'method', 'exports', 'limits', 'faq'];
async function site(locale, theme, viewport, tag) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await context.addInitScript(
    ([l, th]) => {
      try {
        localStorage.setItem('envelope.locale', l);
        localStorage.setItem('envelope.theme', th);
      } catch {}
    },
    [locale, theme],
  );
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const problems = [];
  for (const p of PAGES) {
    await page.goto(`${BASE}${locale === 'ar' ? '/ar' : ''}/${p}`);
    await page.waitForTimeout(p === '' || p === 'product' ? 2500 : 1200);
    // Settle every scroll reveal before the full-page picture, as a reader scrolling would.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(900);
    await page.screenshot({ path: path(`${tag}-site-${p || 'home'}`), fullPage: true });
    const head = await page.evaluate(() => ({
      title: document.title,
      lang: document.documentElement.lang,
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
      alternates: document.querySelectorAll('link[rel="alternate"][hreflang]').length,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      h1: document.querySelectorAll('h1').length,
    }));
    if (head.lang !== locale) problems.push(`${p}: lang ${head.lang}`);
    if (!head.canonical) problems.push(`${p}: no canonical`);
    if (head.alternates < 3) problems.push(`${p}: ${head.alternates} hreflang links`);
    if (head.overflow > 0) problems.push(`${p}: ${head.overflow}px sideways`);
    if (head.h1 !== 1) problems.push(`${p}: ${head.h1} h1`);
  }
  console.log(`${tag}: ${problems.length ? problems.join('; ') : 'heads, h1 and width ok'} · ${errors.length ? errors.join('\n  ') : 'no console errors'}`);
  await context.close();
}

if (process.argv.includes('--site')) {
  await site('en', 'light', { width: 1440, height: 900 }, 'en-light');
  await site('en', 'dark', { width: 1440, height: 900 }, 'en-dark');
  await site('ar', 'light', { width: 1440, height: 900 }, 'ar-light');
  await site('ar', 'dark', { width: 1440, height: 900 }, 'ar-dark');
  await site('en', 'light', { width: 390, height: 844 }, 'phone-en');
  await site('ar', 'dark', { width: 390, height: 844 }, 'phone-ar');
  await browser.close();
  process.exit(0);
}

await walk('en', { width: 1440, height: 900 }, 'en');
await walk('ar', { width: 1440, height: 900 }, 'ar');

// The phone: the landing and the studio must not scroll sideways.
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await phone.newPage();
await p.goto(`${BASE}/`);
await p.waitForTimeout(2000);
await p.screenshot({ path: path('phone-landing'), fullPage: true });
const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log(`phone landing horizontal overflow: ${overflow}px`);
await browser.close();
