/**
 * `/settings` with an account signed in, which `shoot.mjs` cannot photograph.
 *
 * `shoot.mjs` walks `routes.json` as a visitor, so every workspace route is shot
 * in its signed-out branch. That is the right default — it is what a stranger
 * sees — but it means the four panels a reader actually meets on this page have
 * never been looked at. This registers a throwaway account and shoots both
 * themes, both languages and a phone.
 *
 *   pnpm dev, then: node scripts/shoot-settings.mjs [dir]
 *
 * It writes nothing to the repository and leaves an account in the dev database,
 * which is a dev database.
 */

import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const OUT = process.argv[2] ?? '.shots';
const BASE = process.env.BASE ?? 'http://localhost:5173';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge' });

/** A fresh address per run, so a second run is not a duplicate-email refusal. */
const EMAIL = `shots-${process.pid}@example.com`;
const PASSWORD = 'a correct horse battery staple';

const shoot = async (label, options, locale, theme) => {
  const context = await browser.newContext(options);
  const page = await context.newPage();

  /*
    THE THEME IS `data-theme` ON `<html>`, READ FROM `localStorage`, AND NOT
    `prefers-color-scheme`.

    A context opened with `colorScheme: 'dark'` therefore renders the LIGHT page,
    which is what the first dark pass of this script produced: a screenshot named
    "dark" showing the light theme. `addInitScript` runs before the app does, so
    the key is set before `useTheme`'s initialiser reads it.
  */
  if (theme) {
    await context.addInitScript((t) => {
      try {
        localStorage.setItem('envelope.theme', t);
      } catch {
        /* a blocked store is not a reason to fail to shoot */
      }
    }, theme);
  }

  // Sign up through the API rather than the antechamber: this script is about the
  // settings page, and driving the account panel to get there would make a
  // failure in the panel look like a failure here.
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    async ([email, password]) => {
      const body = JSON.stringify({ email, password, name: 'Khaled Haggagy', licence: 'DM-12345' });
      const made = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
      });
      if (!made.ok) {
        await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
      }
    },
    [EMAIL, PASSWORD],
  );

  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });
  if (locale === 'ar') {
    await page.getByRole('button', { name: /العربية|arabic/i }).first().click();
    await page.waitForTimeout(300);
  }
  await page.getByRole('heading', { level: 1 }).first().waitFor();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/24-settings-${label}.png`, fullPage: true });
  await context.close();
};

await shoot('light', { viewport: { width: 1440, height: 1000 } }, 'en');
await shoot('dark', { viewport: { width: 1440, height: 1000 } }, 'en', 'dark');
await shoot('arabic', { viewport: { width: 1440, height: 1000 } }, 'ar');
await shoot('mobile', { viewport: { width: 390, height: 844 } }, 'en');

await browser.close();
console.log(`shot /settings signed in, four passes, into ${OUT}/`);
