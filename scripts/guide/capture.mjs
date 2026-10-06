/**
 * THE USER GUIDE'S SCREENSHOTS, TAKEN FROM A REAL RUN.
 *
 * Every picture in the guide is taken here, from the running product, on the real
 * Warsan affection plan the smoke test drives — never mocked up. The figures the guide
 * quotes are read out of the same run (`files/run-view.json`), so a number in the
 * prose is the number in the screenshot beside it, and re-running this script after
 * the engine changes re-takes both.
 *
 * Two accounts: an author who computes the run and acknowledges its assumptions, and
 * a reviewer it is shared with, who signs the review gate on the run page. The
 * reviewer's account is made BEFORE the share, because a share to an address no
 * account uses is dropped without a word — on purpose, so the form cannot be used to
 * find out who has an account — and the guide has to say so.
 *
 * The flow is driven in English — the smoke test's selectors — and each picture is
 * taken after switching the page to Arabic with its own language control, because
 * the guide is written in Arabic. The engine's state survives the switch. Crops are
 * chosen by CSS, never by text, because the text changes with the language.
 *
 *   GUIDE_URL        the site (default http://localhost:5190/) — its API must run
 *                    with DEVELOPER_STANDARDS=off, so no developer's brief appears
 *   GUIDE_OUT        where pictures, files and facts go (default out/user-guide)
 *   GUIDE_EXPLORE=1  full-page pictures plus a structure dump, for choosing crops
 *
 * The two servers it drives, each in its own terminal, after `npx tsc -b`:
 *
 *   PORT=4100 DEVELOPER_STANDARDS=off GUESTS=keyed node apps/api/dist/main.js
 *   cd apps/web && npx vite --config vite.guide.config.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { chromium } from '@playwright/test';

const BASE = process.env.GUIDE_URL ?? 'http://localhost:5190/';
const OUT = process.env.GUIDE_OUT ?? 'out/user-guide';
const EXPLORE = process.env.GUIDE_EXPLORE === '1';
const SHOTS = join(OUT, 'shots');
const FILES = join(OUT, 'files');
for (const d of [SHOTS, FILES, join(OUT, 'structure')]) mkdirSync(d, { recursive: true });

const PLAN = 'docs/00-source/samples/affection-plan/IC1-CTYL-16_011-warsan1-621.pdf';
/*
  THE TWO ACCOUNTS, AND WHY THEY CAN NOW BE FIXED.

  They were stamped with `Date.now()`, which is right against a scratch database:
  a fresh pair every run, nothing to collide with, nothing left behind that
  matters. It is wrong against a DEPLOYMENT — every capture would leave another
  account in the client's live database, and there is no route that deletes one.

  So the four values are taken from the environment when it supplies them, and
  `enter` below signs IN where the account already exists instead of failing on
  the sign-up. One fixed demo account, reused by every capture, is also the thing
  the guide needs: a login a reader can be given to try the site with.

  NO PASSWORD IS WRITTEN IN THIS FILE OR ANY OTHER FILE IN THE REPOSITORY. The
  defaults below are for the throwaway local pair; a real one is passed in, used,
  and printed only into the built guide, which is not tracked.
*/
const stamp = Date.now().toString(36);
const AUTHOR = {
  name: process.env.GUIDE_AUTHOR_NAME ?? 'Mona Architect',
  email: process.env.GUIDE_AUTHOR_EMAIL ?? `author-${stamp}@guide.example`,
  password: process.env.GUIDE_AUTHOR_PASSWORD ?? 'guide-author-password',
  licence: process.env.GUIDE_AUTHOR_LICENCE ?? 'DM-ARCH-20417',
};
const REVIEWER = {
  name: process.env.GUIDE_REVIEWER_NAME ?? 'Yusuf Reviewer',
  email: process.env.GUIDE_REVIEWER_EMAIL ?? `reviewer-${stamp}@guide.example`,
  password: process.env.GUIDE_REVIEWER_PASSWORD ?? 'guide-reviewer-password',
  licence: process.env.GUIDE_REVIEWER_LICENCE ?? 'DM-ENG-31188',
};

const browser = await chromium.launch({ channel: 'msedge' });
const manifest = [];
const errors = [];

/*
  No motion, no caret, and the site navigation taken out of the sticky layer: a
  sticky bar is painted over the top of whatever element is cropped under it.
*/
const STILL = [
  '*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}',
  '.nav{position:static!important}',
].join('\n');

async function context(viewport = { width: 1280, height: 860 }) {
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: EXPLORE ? 1 : 2,
    acceptDownloads: true,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.setDefaultTimeout(20000);
  return { ctx, page };
}

const url = (path) => new URL(path, BASE).href;

async function lang(page, target) {
  const now = await page.evaluate(() => document.documentElement.lang);
  if (now === target) return;
  await page.locator(`button.button--sm[lang="${target}"]`).first().click();
  await page.waitForFunction((l) => document.documentElement.lang === l, target);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);
}

async function still(page) {
  await page.addStyleTag({ content: STILL }).catch(() => {});
  await page.mouse.move(1, 1);
}

/** The 3D view draws on demand; a picture of it is taken once it has drawn. */
async function drawn(page) {
  if ((await page.locator('.massing-viewer').count()) === 0) return;
  await page
    .waitForFunction(() => Number(document.querySelector('.massing-viewer')?.dataset.frames ?? 0) > 0, null, {
      timeout: 20000,
    })
    .catch(() => {});
  await page.waitForTimeout(400);
}

/**
 * One picture, in Arabic.
 *   sel   crop to an element (CSS; `nth` picks among matches)
 *   maxH  keep only the element's top `maxH` CSS pixels
 *   full  the whole page; otherwise the viewport
 *   top   scroll to the top first (a viewport picture of a page's opening)
 */
async function shot(page, name, { sel, nth = 0, maxH, full = false, top = false, keep = false, caption = '' } = {}) {
  try {
    await lang(page, 'ar');
    await still(page);
    await drawn(page);
    const path = join(SHOTS, `${name}.jpg`);
    const opts = { path, type: 'jpeg', quality: EXPLORE ? 70 : 86 };
    if (EXPLORE) {
      await page.screenshot({ ...opts, fullPage: true });
      writeFileSync(join(OUT, 'structure', `${name}.json`), JSON.stringify(await structure(page), null, 1));
    } else if (sel) {
      const el = page.locator(sel).nth(nth);
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      if (maxH) {
        const box = await el.boundingBox();
        const y = await page.evaluate(() => window.scrollY);
        await page.screenshot({
          ...opts,
          fullPage: true,
          clip: { x: box.x, y: box.y + y, width: box.width, height: Math.min(box.height, maxH) },
        });
      } else {
        await el.screenshot(opts);
      }
    } else {
      if (top) await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ ...opts, fullPage: full });
    }
    manifest.push({ name, caption });
    console.log(`  shot ${name}`);
  } catch (e) {
    errors.push(`${name}: ${String(e).split('\n')[0]}`);
    console.log(`  FAIL ${name}: ${String(e).split('\n')[0]}`);
  } finally {
    if (!keep) await lang(page, 'en').catch(() => {});
  }
}

/** What is on the page, as boxes — for choosing crops. */
function structure(page) {
  return page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll(
      'main section, main figure, main .panel, main table, main form, [role=dialog], .sheet-set, .massing-viewer, body > section, body > div, article, .sheet',
    )) {
      const r = el.getBoundingClientRect();
      if (r.height < 40) continue;
      const h = el.querySelector('h1,h2,h3,caption,legend');
      out.push({
        sel: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${[...el.classList].map((c) => `.${c}`).join('')}${el.getAttribute('aria-labelledby') ? `[aria-labelledby=${el.getAttribute('aria-labelledby')}]` : ''}`,
        head: (h?.textContent ?? '').trim().slice(0, 60),
        y: Math.round(r.top + window.scrollY),
        h: Math.round(r.height),
        w: Math.round(r.width),
      });
    }
    return out;
  });
}

const step = async (label, fn) => {
  try {
    await fn();
    console.log(`  ok   ${label}`);
  } catch (e) {
    console.log(`  FAIL ${label}: ${String(e).split('\n')[0]}`);
    errors.push(`${label}: ${e}`);
  }
};

/** Make an account on the antechamber's own form. */
async function signUp(page, who) {
  await page.goto(url('/app'), { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /create an account instead/i }).click();
  await page.getByLabel('Your name').first().fill(who.name);
  await page.getByLabel(/professional licence number/i).first().fill(who.licence);
  await page.locator('.ac-account input[type="email"]').fill(who.email);
  await page.locator('.ac-account input[type="password"]').fill(who.password);
}

/**
 * Get past the door however it answers.
 *
 * A fixed demo account exists after its first capture, so the sign-up is refused
 * the second time — correctly, and in the server's own sentence. This waits a
 * moment for the engine to open and, if it has not, signs in with the same pair
 * instead. It does NOT retry a wrong password: a refusal that is not "already
 * taken" is left to fail the step, because a capture that quietly carried on
 * would photograph the wrong account.
 */
async function enter(page, who) {
  const opened = await page
    .getByRole('heading', { name: /read an affection plan/i })
    .waitFor({ timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  if (opened) return;
  const taken = await page.getByText(/already|taken|in use/i).first().isVisible().catch(() => false);
  if (!taken) return;
  await page.goto(url('/sign-in'), { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').first().fill(who.email);
  await page.locator('input[type="password"]').first().fill(who.password);
  await page.getByRole('button', { name: /^sign in$/i }).first().click();
  await page.goto(url('/app'), { waitUntil: 'networkidle' });
}

// ---------------------------------------------------------------------------
// 1. The public site
// ---------------------------------------------------------------------------

const pub = await context();
{
  const { page } = pub;
  await page.goto(url('/'), { waitUntil: 'networkidle' });
  await shot(page, 'p01-landing-fold', { top: true });
  /* `section.lp-figures`, not `#capacities`. The redesign renamed the landing
     sections and this crop timed out for a week of captures without failing the
     build — a missing picture is a gap a reader notices and a build does not. */
  await shot(page, 'p02-landing-capacities', { sel: 'section.lp-figures' });
  await shot(page, 'p03-landing-claims', { sel: 'section#claims' });
  await shot(page, 'p04-landing-limits', { sel: 'section#limits', maxH: 1100 });
  for (const [path, name] of [
    ['/parking', 'p05-parking'],
    ['/exports', 'p06-exports'],
    ['/refusals', 'p07-refusals'],
    ['/readiness', 'p08-readiness'],
    ['/no-such-page', 'p09-not-found'],
  ]) {
    await page.goto(url(path), { waitUntil: 'networkidle' });
    await shot(page, name, { top: true });
  }
  await page.goto(url('/readiness'), { waitUntil: 'networkidle' });
  await shot(page, 'p08b-readiness-not-ready', { sel: 'section[aria-labelledby="rd-not-ready"]' });
}
await pub.ctx.close();

// A phone, because the site is opened on a plot.
const phone = await context({ width: 390, height: 844 });
await phone.page.goto(url('/'), { waitUntil: 'networkidle' });
await shot(phone.page, 'p10-landing-phone', { top: true });
await phone.ctx.close();

// And the dark theme, once.
const dark = await context();
await dark.page.goto(url('/'), { waitUntil: 'networkidle' });
await dark.page.evaluate(() => localStorage.setItem('envelope.theme', 'dark'));
await dark.page.goto(url('/'), { waitUntil: 'networkidle' });
await shot(dark.page, 'p11-landing-dark', { top: true });
await dark.ctx.close();

// ---------------------------------------------------------------------------
// 2. The author: an account, then the whole engine on the Warsan sheet
// ---------------------------------------------------------------------------

const author = await context();
const A = author.page;
const NAV = async (i) => {
  await A.locator('.stepper__step').nth(i).click();
  await A.waitForTimeout(300);
};
let runId = null;

await step('the antechamber, and an account made on it', async () => {
  await A.goto(url('/app'), { waitUntil: 'networkidle' });
  await shot(A, 'a01-antechamber', { top: true });
  await shot(A, 'a02-guest-form', { sel: 'section.section--minor', nth: 1 });
  await signUp(A, AUTHOR);
  await shot(A, 'a03-create-account', { sel: 'section.section--minor', nth: 0 });
  await A.getByRole('button', { name: /^create the account$/i }).click();
  await enter(A, AUTHOR);
  await A.getByRole('heading', { name: /read an affection plan/i }).waitFor({ timeout: 30000 });
});

await step('step 0 — the affection plan', async () => {
  await shot(A, 'e00-intake-empty', { top: true });
  // The reading itself is kept, so the guide quotes the sheet's figures as the
  // engine read them rather than as somebody retyped them.
  const reading = A.waitForResponse((r) => r.url().includes('/api/intake/affection-plan'), { timeout: 30000 });
  await A.setInputFiles('#affection-plan-file', PLAN);
  writeFileSync(join(FILES, 'intake.json'), JSON.stringify(await (await reading).json(), null, 1));
  await A.getByRole('heading', { name: /IC1-CTYL-16_011/i }).waitFor({ timeout: 30000 });
  await shot(A, 'e01-intake-read', { sel: 'section[aria-labelledby="intake-heading"]' });
});

await step('step 1 — the plot', async () => {
  await A.getByRole('button', { name: /use these values/i }).click();
  await A.getByRole('heading', { name: /^the plot$/i }).waitFor();
  await shot(A, 'e02-plot-prefilled', { sel: 'form.panel' });
  await A.getByLabel('Width (m)').fill('50.85');
  await A.getByLabel('Depth (m)').fill('26.85');
  await A.getByLabel('Edge 1 faces').selectOption('ROAD');
  await A.getByLabel('Road type').first().selectOption('LOCAL');
  await A.getByLabel('Edge 2 faces').selectOption('ADJACENT_PLOT');
  await A.getByLabel('Edge 3 faces').selectOption('ROAD');
  await A.getByLabel('Road type').last().selectOption('COLLECTOR');
  await A.getByLabel('Edge 4 faces').selectOption('ADJACENT_PLOT');
  await shot(A, 'e03-plot-classified', { sel: 'form.panel' });
  await A.getByRole('button', { name: /^Continue$/ }).click();
  await A.getByRole('heading', { name: /confirm the plot/i }).waitFor();
  await shot(A, 'e04-plot-confirm', { sel: 'section.panel' });
});

await step('step 3 — the rules', async () => {
  await A.getByRole('button', { name: /this is the plot/i }).click();
  await A.getByRole('heading', { name: /does parking count toward far/i }).waitFor();
  await A.locator('#standard-heading').waitFor();
  await shot(A, 'e05-parking-question', { sel: 'section[aria-labelledby="parking-far-heading"]' });
  await shot(A, 'e06-podium', { sel: 'section.panel', nth: 1 });
  await shot(A, 'e07-rules', { sel: 'section[aria-labelledby="rules-heading"]', maxH: 1150 });
  await shot(A, 'e08-standards-withheld', { sel: 'section[aria-labelledby="standard-heading"]' });
  await A.getByLabel(/Saleable area/i).fill('0.93');
  await shot(A, 'e09-efficiency', { sel: 'section[aria-labelledby="efficiency-heading"]' });
  await A.getByRole('radio', { name: /no, it is excluded/i }).check();
  await A.getByRole('button', { name: /what each answer is worth/i }).click();
  await A.locator('.comparison__verdict').waitFor();
  await shot(A, 'e10-comparison', { sel: 'section[aria-labelledby="parking-far-heading"]' });
});

await step('step 4 — the assumption register', async () => {
  await A.getByRole('button', { name: /compute capacity/i }).click();
  await A.locator('.data-table').first().waitFor({ timeout: 30000 });
  await shot(A, 'e11-assumptions', { sel: 'section[aria-labelledby="assumptions-heading"]' });
  await A.getByRole('button', { name: /I have read the assumptions/i }).click();
  await A.getByText(/You acknowledged these assumptions/i).waitFor();
  await shot(A, 'e12-assumptions-acknowledged', { sel: 'section[aria-labelledby="assumptions-heading"] .panel__footer' });
});

await step('step 5 — capacity and the building in 3D', async () => {
  await NAV(5);
  await A.locator('.governing__figure').waitFor();
  await shot(A, 'e13-capacity', { sel: 'section[aria-labelledby="capacity-heading"]' });
  await shot(A, 'e14-massing', { sel: 'section[aria-labelledby="massing-heading"]', maxH: 1150 });
  /*
    THE COVER'S PICTURE IS ITS OWN CROP, of the canvas and nothing else.

    It used to be this chapter's screenshot, repositioned by a CSS rule in
    `guide.css` calibrated in per-cent against one image's pixel dimensions
    ("2400 × 2300 px, building near x 1300, y 900"). The viewport changed, the
    shot came out 1442 wide, and the cover of the guide became a close-up of a
    dropdown and a slider — still a valid picture, still the right file, framed
    on the furniture instead of the building. A crop that is described in prose
    and executed in arithmetic somewhere else drifts silently; a crop taken from
    the element itself cannot.
  */
  await shot(A, 'e14-massing-cover', { sel: '.massing-viewer__stage' });
  await shot(A, 'e15-levels', { sel: 'section[aria-labelledby="massing-heading"] table.data-table', maxH: 1000 });
  await shot(A, 'e16-envelope', { sel: 'section[aria-labelledby="envelope-heading"]' });
});

await step('step 6 — parking, the drawing set and vehicle access', async () => {
  await NAV(6);
  await A.locator('.sheet-set').waitFor();
  await shot(A, 'e17-parking', { sel: 'section[aria-labelledby="parking-heading"]' });
  await shot(A, 'e18-sheet-parking-level', { sel: '.sheet-set' });
  const tabs = A.locator('.sheet-set [role="tab"]');
  const count = await tabs.count();
  const names = [];
  for (let i = 0; i < count; i++) names.push((await tabs.nth(i).innerText()).trim());
  writeFileSync(join(FILES, 'sheet-tabs.json'), JSON.stringify(names, null, 1));
  // One picture per kind of sheet: the site plan, a second parking level if there
  // is one, the typical floor, and the sections.
  const wanted = [
    [/^A-0/, 'e19-sheet-site-plan'],
    [/^A-1\d\d/, 'e20-sheet-parking-level-2', 1],
    [/^A-2/, 'e21-sheet-typical-floor'],
    [/^A-3/, 'e22-sheet-sections'],
  ];
  for (const [pattern, name, skip = 0] of wanted) {
    const hits = names.map((n, i) => [n, i]).filter(([n]) => pattern.test(n));
    const hit = hits[skip];
    if (!hit) continue;
    await tabs.nth(hit[1]).click();
    await A.waitForTimeout(400);
    await shot(A, name, { sel: '.sheet-set' });
  }
  await tabs.first().click();
  await shot(A, 'e23-access', { sel: 'section[aria-labelledby="access-heading"]' });
});

await step('step 7 — checks', async () => {
  await NAV(7);
  await A.locator('.claim--never').waitFor();
  await shot(A, 'e24-claims', { sel: 'section[aria-labelledby="claims-heading"]' });
  await A.getByRole('button', { name: /checks that had nothing to check/i }).click();
  await shot(A, 'e25-invariants', { sel: 'section[aria-labelledby="invariants-heading"]', maxH: 1150 });
  await shot(A, 'e26-constraints', { sel: 'section[aria-labelledby="constraints-heading"]' });
});

await step('step 8 — evidence, and one derivation', async () => {
  await NAV(8);
  await shot(A, 'e27-evidence', { sel: 'section[aria-labelledby="evidence-heading"]' });
  await shot(A, 'e28-numbers', { sel: 'section[aria-labelledby="numbers-heading"]', maxH: 900 });
  await A.locator('section[aria-labelledby="numbers-heading"] button.traced').first().click();
  await A.locator('aside.provenance-panel').waitFor();
  await shot(A, 'e29-derivation', { sel: 'aside.provenance-panel', keep: true });
  await lang(A, 'en');
  await A.keyboard.press('Escape');
});

await step('step 9 — export, with the review still to sign', async () => {
  await NAV(9);
  await shot(A, 'e30-export-gates', { sel: 'section[aria-labelledby="export-heading"]' });
  const body = await (await A.request.get(url('/api/work'))).json();
  runId = body.authored?.[0]?.runId ?? null;
  if (!runId) throw new Error(`no run on the author's list: ${JSON.stringify(body).slice(0, 200)}`);
});

// ---------------------------------------------------------------------------
// 3. The reviewer's account, made before the share
// ---------------------------------------------------------------------------

const reviewer = await context();
const R = reviewer.page;
await step('the reviewer makes an account, and cannot yet open the run', async () => {
  await signUp(R, REVIEWER);
  await R.getByRole('button', { name: /^create the account$/i }).click();
  await enter(R, REVIEWER);
  await R.getByRole('heading', { name: /read an affection plan/i }).waitFor({ timeout: 30000 });
  await R.goto(url(`/work?run=${runId}`), { waitUntil: 'networkidle' });
  await R.locator('.banner--danger').waitFor();
  await shot(R, 'd01-run-not-shared', { sel: 'main', maxH: 520 });
});

// ---------------------------------------------------------------------------
// 4. The author's work, and the share
// ---------------------------------------------------------------------------

await step('the author’s work, and the run page', async () => {
  await A.goto(url('/work'), { waitUntil: 'networkidle' });
  await shot(A, 'd02-work-author', { sel: 'main', maxH: 1300 });
  await A.goto(url(`/work?run=${runId}`), { waitUntil: 'networkidle' });
  await A.locator('#rn-review').waitFor();
  await shot(A, 'd03-run-answer', { sel: 'main', maxH: 1250 });
  await shot(A, 'd04-run-review-unsigned', { sel: 'section[aria-labelledby="rn-review"]' });
  await A.locator('.rn__share input[type="email"]').fill(REVIEWER.email);
  await A.locator('.rn__share input[type="radio"][value="reviewer"]').check();
  await shot(A, 'd05-share-form', { sel: 'section[aria-labelledby="rn-share"]' });
  await A.locator('.rn__share button[type="submit"]').click();
  await A.locator('.rn__shared').waitFor();
  await shot(A, 'd06-shared', { sel: 'section[aria-labelledby="rn-share"]' });
});

// ---------------------------------------------------------------------------
// 5. The reviewer signs
// ---------------------------------------------------------------------------

await step('the reviewer opens the run and signs the review', async () => {
  await R.goto(url('/work'), { waitUntil: 'networkidle' });
  await shot(R, 'd07-work-reviewer', { sel: 'main', maxH: 1100 });
  await R.goto(url(`/work?run=${runId}`), { waitUntil: 'networkidle' });
  await R.locator('#rn-review').waitFor();
  await shot(R, 'd08-review-before', { sel: 'section[aria-labelledby="rn-review"]' });
  await R.getByRole('button', { name: /sign the review gate/i }).click();
  await R.locator('.rn__file-list').waitFor();
  await shot(R, 'd09-review-signed', { sel: 'section[aria-labelledby="rn-review"]' });
});

// ---------------------------------------------------------------------------
// 6. The files
// ---------------------------------------------------------------------------

await step('the report and the drawing set open in a tab', async () => {
  for (const [label, name] of [
    [/open the report/i, 'f01-report'],
    [/open the drawing set/i, 'f02-drawing-set'],
  ]) {
    const [tab] = await Promise.all([reviewer.ctx.waitForEvent('page'), R.getByRole('button', { name: label }).click()]);
    await tab.waitForLoadState('load');
    await tab.setViewportSize({ width: 1280, height: 900 });
    await tab.waitForTimeout(600);
    writeFileSync(join(FILES, `${name}.html`), await tab.content());
    writeFileSync(join(OUT, 'structure', `${name}.json`), JSON.stringify(await structure(tab), null, 1));
    // The document as it opens, then the next three screens of it.
    const height = await tab.evaluate(() => document.documentElement.scrollHeight);
    for (let i = 0; i < 4 && i * 900 < height; i++) {
      await tab.screenshot({
        path: join(SHOTS, `${name}-${i + 1}.jpg`),
        type: 'jpeg',
        quality: 86,
        fullPage: true,
        clip: { x: 0, y: i * 900, width: 1280, height: Math.min(900, height - i * 900) },
      });
      manifest.push({ name: `${name}-${i + 1}` });
    }
    console.log(`  shot ${name} (${height}px tall)`);
    await tab.close();
  }
});

await step('the data, the drawing, the model and the workbook download', async () => {
  for (const [label, ext] of [
    [/report data/i, 'json'],
    [/building for cad/i, 'dxf'],
    [/3d model/i, 'glb'],
    [/workbook/i, 'xlsx'],
  ]) {
    const [dl] = await Promise.all([R.waitForEvent('download'), R.getByRole('button', { name: label }).click()]);
    await dl.saveAs(join(FILES, `run.${ext}`));
    console.log(`  file run.${ext} (${dl.suggestedFilename()})`);
  }
});

await step('the author sees the signature, and the readiness page', async () => {
  await A.goto(url(`/work?run=${runId}`), { waitUntil: 'networkidle' });
  await A.locator('.rn__file-list').waitFor();
  await shot(A, 'd10-author-after-review', { sel: 'section[aria-labelledby="rn-review"]' });
  await A.goto(url('/readiness'), { waitUntil: 'networkidle' });
  await shot(A, 'd11-readiness-volume', { sel: 'section[aria-labelledby="rd-volume"]' });
  await shot(A, 'd12-readiness-exposure', { sel: 'section[aria-labelledby="rd-exposure"]', maxH: 1100 });
  await shot(A, 'd13-readiness-drawings', { sel: 'section[aria-labelledby="rd-drawings"]' });
});

// ---------------------------------------------------------------------------
// 7. The run itself, for the figures the guide quotes
// ---------------------------------------------------------------------------

await step('the run, as the API holds it', async () => {
  const res = await A.request.get(url(`/api/runs/${runId}`));
  writeFileSync(join(FILES, 'run-view.json'), JSON.stringify(await res.json(), null, 1));
  const dash = await A.request.get(url('/api/dashboard'));
  writeFileSync(join(FILES, 'dashboard.json'), JSON.stringify(await dash.json(), null, 1));
});

writeFileSync(
  join(OUT, 'manifest.json'),
  JSON.stringify(
    { at: new Date().toISOString(), base: BASE, runId, author: AUTHOR.name, reviewer: REVIEWER.name, shots: manifest, errors },
    null,
    1,
  ),
);
await browser.close();
console.log(errors.length ? `\n${errors.length} problem(s):\n${errors.join('\n')}` : `\n${manifest.length} pictures taken`);
process.exit(errors.length ? 1 : 0);
