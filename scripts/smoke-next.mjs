/**
 * THE SITE A READER ACTUALLY OPENS, DRIVEN IN A REAL BROWSER.
 *
 * `pnpm smoke` walks the classic front end — its nine-step `/app`, its routes
 * table — and since 14 Oct 2026 a reader meets almost none of it: `/`, the
 * public pages and the studio are `apps/web-next`, and `/app` is a 301. So the
 * gate that found every layout defect so far was guarding pages nobody sees.
 * This is the same discipline pointed at the pages people do see:
 *
 *   - every public page, in both languages, at a desk and on a phone: one h1,
 *     the right `lang` and `dir`, no sideways scroll (1.4.10), no target under
 *     24 px that is not spaced clear of its neighbours (2.5.8), no image
 *     without `alt`, no console error, and neither the old name nor the
 *     engine's name worn as the site's;
 *   - an unknown address reaching a real 404 under the address it was asked;
 *     deployed, every moved path answering 301 to where `moved-paths.mjs` says;
 *   - a new study typed in, filed and computed through the screen — and before
 *     the reader has answered anything, no radio already checked beside an
 *     enabled Compute button, which is the default FR-DEF-002 forbids;
 *   - each of the studio's seven steps for that run, in both languages and both
 *     widths: Claude's review box present, every ASSUMED figure in amber;
 *   - the gates signed through the screen, the report opening in its viewer,
 *     and the viewer's button printing the FRAME — the report's own `@page`
 *     sets A4 — with eight sections, the stamp, and no script inside it.
 *
 * And Claude's review is never asked for. Every call is billed (16 Oct 2026:
 * «قلل من استخدام Api كلود»), so a POST to `/api/advisor` from this walk is a
 * failure, not a step.
 *
 * Run against a dev server: the API, then `pnpm --filter @envelope/web-next dev`,
 * then `pnpm smoke:next`. Against a deployment:
 * `SMOKE_URL=https://plotlogic.dev/ pnpm smoke:next`.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

import { movedPaths } from './deploy/moved-paths.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// The page list is the prerenderer's own, so a page cannot be published and go unvisited.
const SEO = JSON.parse(readFileSync(join(ROOT, 'apps', 'web-next', 'src', 'site', 'seo.json'), 'utf8'));
const PAGES = SEO.pages.map((p) => p.path);

const BASE = process.env.SMOKE_URL ?? 'http://localhost:5174/';
const REMOTE = !['localhost', '127.0.0.1'].includes(new URL(BASE).hostname);
const wait = (ms) => (REMOTE ? ms * 6 : ms);
const at = (path) => new URL(path, BASE).href;
const localised = (path, locale) => (locale === 'ar' ? (path === '/' ? '/ar' : `/ar${path}`) : path);

/*
  ONE GUEST, FIXED, AND WHY IT IS NOT A NEW ONE EACH RUN.

  A guest is a key held in a browser. A new key per run would leave a new plot
  and a new study in the live database every time the gate ran, and there is no
  route that deletes either. So the key is fixed: against a deployment the walk
  reuses the study this guest already has and computes one only if it has none.
  The key is public in this file on purpose — it owns one study of a made-up
  50 × 30 m plot named SMOKE-NEXT, and nothing else.
*/
const SMOKE_ACTOR = {
  id: 'guest-5a0ce000-0000-4000-8000-000000000001',
  name: 'Smoke check',
  licence: 'SMOKE-CHECK-ONLY',
};
const ACTOR_HEADERS = {
  'x-actor-id': SMOKE_ACTOR.id,
  'x-actor-name': SMOKE_ACTOR.name,
  'x-actor-licence': SMOKE_ACTOR.licence,
};

const errors = [];
const step = async (label, fn) => {
  try {
    await fn();
    console.log(`  ok   ${label}`);
  } catch (e) {
    console.log(`  FAIL ${label}: ${String(e).split('\n')[0]}`);
    errors.push(`${label}: ${e}`);
  }
};

const browser = await chromium.launch({
  channel: 'msedge',
  args: process.env.SMOKE_HOST_RULES ? [`--host-resolver-rules=${process.env.SMOKE_HOST_RULES}`] : [],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
/*
  The language each address names, as a reader opening it fresh would get. The
  site remembers the last language chosen and honours it, so without this every
  English step after the Arabic pages opened in Arabic and looked for buttons
  by names that were not on the screen.
*/
await context.addInitScript((actor) => {
  try {
    localStorage.setItem('envelope.actor', actor);
    const p = location.pathname;
    localStorage.setItem('envelope.locale', p === '/ar' || p.startsWith('/ar/') ? 'ar' : 'en');
  } catch {}
}, JSON.stringify(SMOKE_ACTOR));
const page = await context.newPage();
if (REMOTE) page.setDefaultTimeout(wait(30000));

let passingHostCheck = false;
let expectingNotFound = false;
let advisorCalls = 0;
const watch = (p) => {
  p.on('console', (m) => {
    if (m.type() !== 'error' || passingHostCheck) return;
    // The one 404 this walk asks for; its status is asserted below rather than counted here.
    if (expectingNotFound && /status of 404/.test(m.text())) return;
    errors.push(`console on ${p.url()}: ${m.text()}`);
  });
  p.on('pageerror', (e) => errors.push(`pageerror on ${p.url()}: ${e.message}`));
  p.on('request', (r) => {
    if (r.method() === 'POST' && new URL(r.url()).pathname.startsWith('/api/advisor')) advisorCalls += 1;
  });
};
watch(page);
context.on('page', (p) => p !== page && watch(p));

/*
  The host's browser check, passed once by waiting, before anything is measured
  — see the same paragraph in `smoke.mjs`. Hostinger answers an automated
  browser's first request with its own 403 page and lets it through on a cookie.
*/
if (REMOTE) {
  passingHostCheck = true;
  await page.goto(BASE);
  await page.waitForSelector('h1', { timeout: 60000 });
  passingHostCheck = false;
}

/** WCAG 1.4.10, on the document: the one number that says whether a phone scrolls sideways. */
const noSidewaysScroll = async (p, label) => {
  const { px, culprits } = await p.evaluate(() => {
    const d = document.documentElement;
    const px = d.scrollWidth - d.clientWidth;
    if (px <= 1) return { px, culprits: [] };
    const inScroller = (el) => {
      for (let q = el.parentElement; q && q !== d; q = q.parentElement) {
        if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(q).overflowX)) return true;
      }
      return false;
    };
    const culprits = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if ((r.right > window.innerWidth + 1 || r.left < -1) && !inScroller(el)) {
        culprits.push(`<${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 50)}"> ${Math.round(r.left)}..${Math.round(r.right)}`);
      }
    }
    return { px, culprits: culprits.slice(-4) };
  });
  if (px > 1) throw new Error(`${label}: ${px}px of horizontal overflow (WCAG 1.4.10) — ${culprits.join('; ') || 'no element box named'}`);
};

/*
  WCAG 2.5.8 — a target is at least 24 × 24 CSS px, or is spaced so that a
  24 px circle on its centre touches no other target. A link inside a sentence
  is exempt, as the criterion says. Hidden and visually-hidden controls are not
  targets anybody can hit and are skipped.
*/
const targetsLargeEnough = async (p, label) => {
  const small = await p.evaluate(() => {
    const SEL = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="tab"], [role="radio"], [role="checkbox"], [role="switch"], [role="menuitem"]';
    const visible = (el) => {
      if (el.closest('[aria-hidden="true"], [inert]')) return false;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
      // Visually hidden until focused (a skip link): clipped to nothing, so nobody's pointer can reach it.
      if (/inset\(50%\)/.test(cs.clipPath) || /rect\(0px,? 0px,? 0px,? 0px\)/.test(cs.clip)) return false;
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2;
    };
    const inline = (el) => {
      if (el.tagName !== 'A' || getComputedStyle(el).display !== 'inline') return false;
      const block = el.parentElement;
      return block ? (block.textContent ?? '').trim().length > (el.textContent ?? '').trim().length + 8 : false;
    };
    const all = [...document.querySelectorAll(SEL)].filter(visible);
    const boxes = all.map((el) => el.getBoundingClientRect());
    const out = [];
    all.forEach((el, i) => {
      const r = boxes[i];
      if ((r.width >= 24 && r.height >= 24) || inline(el)) return;
      // A control drawn inside its own label: the label is what is hit.
      const label = el.closest('label');
      if (label) {
        const lr = label.getBoundingClientRect();
        if (lr.width >= 24 && lr.height >= 24) return;
      }
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const crowded = boxes.some((o, j) => {
        if (j === i || all[j].contains(el) || el.contains(all[j])) return false;
        const dx = Math.max(o.left - cx, 0, cx - o.right);
        const dy = Math.max(o.top - cy, 0, cy - o.bottom);
        return Math.hypot(dx, dy) < 12;
      });
      if (crowded) {
        const name = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30);
        out.push(`<${el.tagName.toLowerCase()}> "${name}" ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
    });
    return out.slice(0, 5);
  });
  if (small.length) throw new Error(`${label}: targets under 24 px and crowded (WCAG 2.5.8) — ${small.join('; ')}`);
};

/** What a public page must be wherever it is opened. */
const pageIsWhole = async (p, label, locale) => {
  const facts = await p.evaluate(() => ({
    lang: document.documentElement.lang,
    dir: document.documentElement.dir || 'ltr',
    h1: document.querySelectorAll('h1').length,
    main: document.querySelectorAll('main, [role="main"]').length,
    noAlt: [...document.querySelectorAll('img:not([alt])')].map((i) => i.getAttribute('src')).slice(0, 3),
    text: document.body.innerText,
  }));
  if (facts.lang !== locale) throw new Error(`${label}: lang="${facts.lang}", expected "${locale}"`);
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  if (facts.dir !== dir) throw new Error(`${label}: dir="${facts.dir}", expected "${dir}"`);
  if (facts.h1 !== 1) throw new Error(`${label}: ${facts.h1} <h1> elements, expected one`);
  if (facts.main < 1) throw new Error(`${label}: no main landmark`);
  if (facts.noAlt.length) throw new Error(`${label}: images without alt — ${facts.noAlt.join(', ')}`);
  // TOP.ai was the site's name until 14 Oct 2026; ENVELOPE is the engine, never the site.
  if (/TOP\.ai/.test(facts.text)) throw new Error(`${label}: still says TOP.ai`);
  if (/\bENVELOPE\b/.test(facts.text)) throw new Error(`${label}: names ENVELOPE as if it were the site`);
};

// ---------------------------------------------------------------------------------------------
console.log(`smoke:next against ${BASE}${REMOTE ? ' (deployed)' : ''}`);

for (const locale of ['en', 'ar']) {
  for (const [width, height] of [
    [1440, 900],
    [375, 812],
  ]) {
    await step(`every public page, ${locale}, at ${width}px`, async () => {
      await page.setViewportSize({ width, height });
      for (const path of PAGES) {
        const res = await page.goto(at(localised(path, locale)), { waitUntil: 'networkidle' });
        if (!res || res.status() >= 400) throw new Error(`${localised(path, locale)} answered ${res?.status()}`);
        await page.waitForTimeout(200);
        const label = `${localised(path, locale)} at ${width}px`;
        await pageIsWhole(page, label, locale);
        await noSidewaysScroll(page, label);
        await targetsLargeEnough(page, label);
      }
    });
  }
}
await page.setViewportSize({ width: 1440, height: 900 });

await step('an unknown address reaches a real 404 and keeps its address', async () => {
  expectingNotFound = true;
  const res = await page.goto(at('/no-such-page'), { waitUntil: 'networkidle' });
  expectingNotFound = false;
  // A dev server answers every path 200; deployed, the status must say it too.
  if (REMOTE && res?.status() !== 404) throw new Error(`answered ${res?.status()}, not 404`);
  if (!page.url().endsWith('/no-such-page')) throw new Error(`the address became ${page.url()}`);
  await page.getByRole('heading', { name: 'There is no page here' }).waitFor({ timeout: wait(10000) });
});

if (REMOTE) {
  await step('every moved path answers 301 to where moved-paths.mjs says', async () => {
    for (const [from, to] of Object.entries(movedPaths(ROOT))) {
      const res = await fetch(at(from), { redirect: 'manual' });
      const location = res.headers.get('location') ?? '';
      if (res.status !== 301 || new URL(location, BASE).href !== at(to)) {
        throw new Error(`${from} answered ${res.status} → ${location || 'nowhere'}, expected 301 → ${to}`);
      }
    }
  });
}

// --- the studio ------------------------------------------------------------------------------

/** The study this guest already has, against a deployment; computing one there is done once. */
const existingRun = async () => {
  if (!REMOTE) return null;
  const res = await fetch(at('/api/runs?limit=5'), { headers: ACTOR_HEADERS });
  if (!res.ok) throw new Error(`listing the smoke guest's studies answered ${res.status}`);
  const { runs } = await res.json();
  return runs[0]?.runId ?? null;
};

let runId = null;
await step('a new study is typed in, filed and computed through the screen', async () => {
  runId = await existingRun();
  if (runId) {
    console.log(`       (reusing ${runId}: this guest's study, computed on an earlier run)`);
    return;
  }
  await page.goto(at('/studio'), { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Skip — draw the plot' }).click();
  // A 50 × 30 m corner plot: boundaries 0 and 1 are roads meeting at P1, 2 and 3 neighbours.
  const xs = ['0', '50', '50', '0'];
  const ys = ['0', '0', '30', '30'];
  for (let n = await page.getByLabel(/^Corner P\d, x in metres$/).count(); n < 4; n += 1) {
    await page.getByRole('button', { name: 'Add a corner' }).click();
  }
  for (let i = 0; i < 4; i += 1) {
    await page.getByLabel(`Corner P${i}, x in metres`).fill(xs[i]);
    await page.getByLabel(`Corner P${i}, y in metres`).fill(ys[i]);
  }
  await page.getByLabel('Plot number', { exact: true }).first().fill('SMOKE-NEXT');
  await page.getByLabel('Community', { exact: true }).first().fill('SMOKE');
  const classes = ['ROAD', 'ROAD', 'ADJACENT_PLOT', 'ADJACENT_PLOT'];
  for (let i = 0; i < 4; i += 1) {
    await page.getByRole('combobox', { name: `Boundary ${i}, from P${i} to P${(i + 1) % 4}` }).selectOption(classes[i]);
    if (classes[i] === 'ROAD') {
      await page.getByLabel(`Road hierarchy of boundary ${i}`).selectOption(i === 0 ? 'LOCAL' : 'COLLECTOR');
    }
  }
  // Filing moves the studio on to the rules by itself.
  await page.getByRole('button', { name: 'File the plot' }).click();

  /*
    FR-DEF-002, IN THE BROWSER. Before the reader has touched the rules step,
    nothing on it may already be answered while Compute is enabled: a checked
    radio there is the hidden default the requirement forbids, whatever the
    copy above it says.
  */
  const compute = page.getByRole('button', { name: 'Compute the study' });
  await compute.waitFor({ timeout: wait(20000) });
  await page.waitForTimeout(300);
  const prechecked = await page.locator('input[type="radio"]:checked, [role="radio"][aria-checked="true"]').count();
  if (prechecked > 0 && (await compute.isEnabled())) {
    throw new Error(`${prechecked} radio(s) already checked beside an enabled Compute button (FR-DEF-002)`);
  }
  await page.getByRole('radio', { name: 'Yes', exact: true }).first().check();
  await compute.click();
  await page.waitForURL(/\/studio\/[0-9a-f-]{36}$/, { timeout: wait(60000) });
  runId = page.url().split('/').pop();
});

const STEP_ORDER = ['sheet', 'plot', 'rules', 'capacity', 'parking', 'checks', 'export'];

/** Every ASSUMED figure drawn in the amber the palette reserves for it, and there are some. */
const assumedIsAmber = async (p, label) => {
  const { count, wrong, amber } = await p.evaluate(() => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--uncertain)';
    document.body.append(probe);
    const amber = getComputedStyle(probe).color;
    probe.remove();
    const figures = [...document.querySelectorAll('[data-class="ASSUMED"]')];
    const wrong = figures.filter((el) => getComputedStyle(el).color !== amber).map((el) => `"${el.textContent?.trim().slice(0, 20)}" ${getComputedStyle(el).color}`);
    return { count: figures.length, wrong: wrong.slice(0, 3), amber };
  });
  if (count === 0) throw new Error(`${label}: no ASSUMED figure on the capacity step — the register has values, so the screen must show them`);
  if (wrong.length) throw new Error(`${label}: ASSUMED figures not in amber (${amber}) — ${wrong.join('; ')}`);
};

if (runId) {
  for (const locale of ['en', 'ar']) {
    for (const [width, height] of [
      [1440, 900],
      [375, 812],
    ]) {
      await step(`the studio's seven steps for that study, ${locale}, at ${width}px`, async () => {
        await page.setViewportSize({ width, height });
        await page.goto(at(localised(`/studio/${runId}`, locale)), { waitUntil: 'networkidle' });
        const steps = page.locator('nav ol > li > button');
        await steps.nth(STEP_ORDER.indexOf('export')).waitFor();
        await page.waitForFunction(() => !document.querySelector('nav ol > li > button[disabled]'), null, { timeout: wait(30000) });
        for (const id of STEP_ORDER) {
          await steps.nth(STEP_ORDER.indexOf(id)).click();
          await page.waitForTimeout(600);
          const label = `${locale} step ${id} at ${width}px`;
          // The sheet step's box reads the sheet as read, never its PDF; a study with no sheet gives it nothing to read.
          if (id !== 'sheet' && (await page.locator('[data-advisor]').count()) === 0) throw new Error(`${label}: no Claude review box`);
          await noSidewaysScroll(page, label);
          if (id === 'capacity') await assumedIsAmber(page, label);
        }
      });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });

  await step('the gates are signed on screen and the report opens in its viewer', async () => {
    await page.goto(at(`/studio/${runId}`), { waitUntil: 'networkidle' });
    await page.locator('nav ol > li > button').nth(STEP_ORDER.indexOf('export')).click();
    for (const action of ['Acknowledge the assumptions', 'Sign as reviewer']) {
      const button = page.getByRole('button', { name: action, exact: true });
      // Signed on an earlier run against a deployment: the gate shows who signed and no button.
      if ((await button.count()) && (await button.isEnabled())) {
        await button.click();
        await button.waitFor({ state: 'detached', timeout: wait(20000) });
      }
    }
    const print = page.getByRole('button', { name: 'Print or save as PDF (A4)' });
    await print.waitFor();
    if (!(await print.isEnabled())) throw new Error('the print button is not enabled once both gates are signed');
    const [viewer] = await Promise.all([context.waitForEvent('page'), page.getByRole('button', { name: 'Report', exact: true }).click()]);
    await viewer.waitForLoadState('domcontentloaded');
    if (!viewer.url().endsWith(`/studio/${runId}/report`)) throw new Error(`the report opened at ${viewer.url()}`);
    await viewer.close();
  });

  for (const locale of ['en', 'ar']) {
    for (const [width, height] of [
      [1440, 900],
      [375, 812],
    ]) {
      await step(`the report viewer prints its frame, ${locale}, at ${width}px`, async () => {
        await page.setViewportSize({ width, height });
        await page.goto(at(localised(`/studio/${runId}/report`, locale)), { waitUntil: 'networkidle' });
        await page.locator('iframe').waitFor({ timeout: wait(60000) });
        await page.waitForFunction(() => {
          const b = [...document.querySelectorAll('button')].find((x) => x.querySelector('svg.lucide-printer'));
          return b && !b.disabled;
        }, null, { timeout: wait(60000) });
        const inside = await page.evaluate(() => {
          const d = document.querySelector('iframe').contentDocument;
          return {
            lang: d.documentElement.lang,
            dir: d.documentElement.dir,
            sections: d.querySelectorAll('.sec-head').length,
            scripts: d.querySelectorAll('script').length,
            stamp: d.body.textContent.includes('REGULATORY VALIDITY: NOT ASSESSED'),
          };
        });
        const label = `${locale} viewer at ${width}px`;
        if (inside.lang !== locale || inside.dir !== (locale === 'ar' ? 'rtl' : 'ltr')) throw new Error(`${label}: the report is lang=${inside.lang} dir=${inside.dir}`);
        if (inside.sections !== 8) throw new Error(`${label}: ${inside.sections} sections, expected 8 (the annex is the eighth)`);
        if (inside.scripts !== 0) throw new Error(`${label}: ${inside.scripts} script element(s) inside the report`);
        if (!inside.stamp) throw new Error(`${label}: the report does not carry the stamp`);
        // The dialog itself is the browser's. What is held here is that the FRAME is asked to print.
        await page.evaluate(() => {
          const w = document.querySelector('iframe').contentWindow;
          w.__printed = 0;
          w.print = () => {
            w.__printed += 1;
          };
        });
        // The Arabic label holds a right-to-left mark before "(A4)", so it is matched around it.
        await page.getByRole('button', { name: locale === 'ar' ? /PDF.*\(A4\)/ : 'Print or save as PDF (A4)' }).click();
        const printed = await page.evaluate(() => document.querySelector('iframe').contentWindow.__printed);
        if (printed !== 1) throw new Error(`${label}: the frame was asked to print ${printed} times`);
        await noSidewaysScroll(page, label);
      });
    }
  }
}

await step("Claude's review was never asked for", async () => {
  if (advisorCalls > 0) throw new Error(`${advisorCalls} POST(s) to /api/advisor — every call is billed, and this walk may press none`);
});

await browser.close();
if (errors.length) {
  console.log(`\n${errors.length} failure(s):`);
  for (const e of errors) console.log(`  - ${e.split('\n')[0]}`);
  process.exit(1);
}
console.log('\nsmoke:next passed');
