/**
 * The nine-step flow, driven in a real browser.
 *
 * The render tests in `apps/web/test` put real engine output through the
 * screens, which catches a missing field or a wrong assertion. They cannot
 * catch what only exists once a browser lays the page out: a control nobody can
 * reach, a dialog that never opens, a page that scrolls sideways on a phone.
 * Every one of those was found here and not there.
 *
 * It drives Microsoft Edge through Playwright's `channel: 'msedge'` — the
 * browser is already on the machine, so this adds no download to a checkout.
 *
 * Run: `pnpm dev` in one terminal, then `pnpm smoke`.
 */

import { readFileSync } from 'node:fs';

import { chromium } from '@playwright/test';

/**
 * THE WALK IS DERIVED FROM `routes.json`, so a route cannot exist and go unvisited.
 *
 * Three lists of the same routes — the route table, this file and `shoot.mjs` — is
 * the shape of defect this repository diagnoses everywhere else: it drifts the first
 * time a route lands, and it drifts silently, because each list keeps passing over
 * the routes it does know about. One record, read by all three.
 */
const ROUTE_DATA = JSON.parse(
  readFileSync(new URL('../apps/web/src/routes.json', import.meta.url), 'utf8'),
);

const errors = [];
// SMOKE_HOST_RULES points a hostname at an address, e.g.
// "MAP tob.khaledahmed.net 84.32.84.123": a release can be checked on the real host
// before its DNS record exists, rather than after a reader has already met it.
const browser = await chromium.launch({
  channel: 'msedge',
  args: process.env.SMOKE_HOST_RULES ? [`--host-resolver-rules=${process.env.SMOKE_HOST_RULES}`] : [],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
let passingHostCheck = false;
/** The one URL whose 4xx is being asked for right now, or null. */
let expectedRefusal = null;
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  // The CDN's own browser check, answered once before the walk starts (see below).
  if (passingHostCheck) return;
  const at = m.location()?.url ?? '';
  // The one 404 this walk asks for. A deployment answers an unknown path with a real
  // 404 status (a dev server answers 200), and the browser logs that document load
  // as an error; it is asserted on below rather than counted here.
  if (/status of 404/.test(m.text()) && at.endsWith('/no-such-page')) return;
  /*
    A REFUSAL A STEP ASKED FOR IS NOT A DEFECT, and the allowance is narrow on
    purpose: one URL, and only while a step has said it is about to provoke one.
    The `/settings` steps drive a wrong current password and a short new one, both
    of which the server must refuse — the browser logs each 4xx as a resource
    error, and counting those would make "the refusal works" and "the page is
    broken" the same result.
  */
  if (expectedRefusal && at.endsWith(expectedRefusal)) return;
  errors.push(`console: ${m.text()}${at ? ` (${at})` : ''}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

const step = async (label, fn) => {
  try { await fn(); console.log(`  ok   ${label}`); }
  catch (e) { console.log(`  FAIL ${label}: ${String(e).split('\n')[0]}`); errors.push(`${label}: ${e}`); }
};

const BASE = process.env.SMOKE_URL ?? 'http://localhost:5173/';

/*
  THE ACCOUNT THE `/settings` STEPS USE, AND WHY IT IS ONE ACCOUNT AND NOT A NEW
  ONE EACH RUN.

  The first version keyed the address on `Date.now()`, which is fine against a dev
  database and wrong against a deployment: every production smoke run would leave
  another account behind, in the client's live database, and there is no route
  that deletes one — deliberately, since this product has no delete-account
  control and `/settings` says so.

  So the address is FIXED and the run is idempotent. The account is registered on
  the first run and signed into on every run after; the last step changes the
  password and then changes it back, so the next run finds it where it left it.
  `signIn` tries both passwords because a run that failed between those two
  changes would otherwise poison every run after it.
*/
const SMOKE_EMAIL = 'smoke@example.com';
const SMOKE_PASSWORD = 'a correct horse battery staple';
const SMOKE_PASSWORD_ALT = 'another long secret phrase';

/**
 * Every wait below was sized against a dev server on this machine. Pointed at a
 * deployment, the same page crosses a CDN and a real uplink: a 1.3 MB affection plan
 * posts as 1.7 MB of base64 and took 23 s from a site-office connection to a host
 * that answered in 0.13 s. The assertions stay exactly as strict; only the patience
 * scales — a smoke test that fails on the uploader's bandwidth reports nothing about
 * the release.
 */
const REMOTE = !['localhost', '127.0.0.1'].includes(new URL(BASE).hostname);
const wait = (ms) => (REMOTE ? ms * 6 : ms);
if (REMOTE) page.setDefaultTimeout(wait(30000));

/**
 * THE HOST'S BROWSER CHECK IS PASSED ONCE, BEFORE ANYTHING IS MEASURED.
 *
 * Hostinger's CDN answers an automated browser's first request with its own
 * "Checking your browser" page — a 403 — and lets it through a few seconds later on a
 * cookie. `curl` is not stopped; this browser is. The first walk against the live
 * site failed three landing-page steps on that page and passed every other step, so
 * the failures described the host's bot filter, not the release. The check is the
 * host's, so it is completed the way the host intends — by waiting — and not worked
 * around. Nothing of ours is cached by it: every step below still loads its route
 * from the server, and the only error not counted is the check's own 403.
 */
if (REMOTE) {
  passingHostCheck = true;
  await page.goto(BASE);
  await page.waitForSelector('#main', { timeout: 60000 });
  passingHostCheck = false;
}

/**
 * WCAG 1.4.10 — reflow, measured on the document rather than eyeballed.
 *
 * `documentElement.scrollWidth` is the only number that matters here: a child
 * whose layout box exceeds the viewport is fine if a scroll container clips it,
 * and a 1px visually-hidden span is *not* fine if nothing clips it. Both look
 * identical in a screenshot.
 */
const noSidewaysScroll = async (label) => {
  const { px, culprits, clipped, box, stretched } = await page.evaluate(() => {
    const d = document.documentElement;
    const px = d.scrollWidth - d.clientWidth;
    const box = `scrollWidth=${d.scrollWidth} clientWidth=${d.clientWidth} innerWidth=${window.innerWidth} bodyScroll=${document.body.scrollWidth}`;
    if (px <= 1) return { px, culprits: [], clipped: [], box, stretched: [] };
    // Name what did it. "31px of overflow" sends you hunting; "the .plot-legend
    // row is 351px wide" is a fix. Elements inside a scroll container are
    // skipped — their layout box legitimately exceeds the viewport.
    const inScroller = (el) => {
      let p = el.parentElement;
      while (p && p !== d) {
        if (/(auto|scroll|hidden)/.test(getComputedStyle(p).overflowX)) return true;
        p = p.parentElement;
      }
      return false;
    };
    const culprits = [];
    const clipped = [];
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.right <= window.innerWidth + 1) continue;
      const cs = getComputedStyle(el);
      const line =
        `<${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 40)}"> ` +
        `w=${Math.round(r.width)} right=${Math.round(r.right)} pos=${cs.position} ` +
        `op=${el.offsetParent ? el.offsetParent.tagName.toLowerCase() + '.' + String(el.offsetParent.className).slice(0, 20) : 'none'}`;
      if (inScroller(el)) clipped.push(line);
      else culprits.push(line);
    }
    // WHEN NOTHING UNCLIPPED IS FOUND, REPORT THE CLIPPED ONES ANYWAY.
    // "no unclipped element found" was a dead end: the document demonstrably
    // scrolls, so something is doing it, and a message that names nothing sends
    // the reader hunting instead of fixing. The usual cause is an element whose
    // nearest `overflow` ancestor is not its containing block — an absolutely
    // positioned descendant of a static parent is laid out against a far-off
    // ancestor and is not clipped by the scroller it appears to sit in, which is
    // exactly the visually-hidden-span defect this repo has already shipped once.
    // AND THE CONTAINER THAT IS ACTUALLY BEING STRETCHED. An element box can stay
    // inside the viewport while its own scrollable overflow does not — a margin, a
    // pseudo-element or a shrink-wrapped inline run all do it — so the box scan
    // above can come back empty over a document that demonstrably scrolls. Walking
    // for `scrollWidth > clientWidth` on a visible-overflow element names the
    // ancestor that is carrying the extra width, which is where the fix goes.
    const stretched = [];
    for (const el of document.querySelectorAll('body, body *')) {
      if (el.scrollWidth - el.clientWidth <= 1) continue;
      if (/(auto|scroll|hidden)/.test(getComputedStyle(el).overflowX)) continue;
      stretched.push(
        `<${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 40)}"> ` +
          `scroll=${el.scrollWidth} client=${el.clientWidth}`,
      );
    }
    return {
      px,
      culprits: culprits.slice(-4),
      clipped: clipped.slice(-6),
      box,
      stretched: stretched.slice(-6),
    };
  });
  if (px > 1) {
    throw new Error(
      `${label}: ${px}px of horizontal overflow (WCAG 1.4.10) [${box}]` +
        (culprits.length
          ? ` — ${culprits.join('; ')}`
          : clipped.length
            ? ` — nothing unclipped overflows; the widest inside a scroller are ` +
              `${clipped.join('; ')} (one of them is escaping its scroller)`
            : ' — and no element box overflows at all, so the width is coming from a ' +
              'margin, a transform or a pseudo-element') +
        (stretched.length ? ` | stretched: ${stretched.join('; ')}` : ''),
    );
  }
};

/**
 * R12 — reveals animate `transform` ONLY, and this is the half that LOOKS.
 *
 * A comment is not a gate. The first version of the scroll reveal faded from
 * `opacity: 0`, and a scroll-driven animation holds its start state for anything
 * that has never entered a viewport — so three whole sections were blank in a
 * full-page screenshot and would have been blank on paper. A second class of the
 * same defect sat unnoticed for longer: `animation-fill-mode: both` applies the
 * `from` state THROUGH the delay, so a time-based reveal with a delay holds zero
 * opacity for as long as the delay lasts.
 *
 * After the motion pass no element in this product is ever at zero opacity, which
 * is a property that can be asserted rather than a habit that has to be kept. This
 * asserts it: nothing carrying a reveal class computes below full opacity, on any
 * route, at any moment this runs.
 */
const nothingIsInvisible = async (label) => {
  const faded = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('.reveal, .lp-reveal, [class*="reveal"]')) {
      const o = Number(getComputedStyle(el).opacity);
      if (Number.isFinite(o) && o < 1) {
        out.push(`<${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 48)}"> opacity=${o}`);
      }
    }
    return out.slice(0, 4);
  });
  if (faded.length > 0) {
    throw new Error(
      `${label}: a reveal is holding an opacity below 1 — ${faded.join('; ')}. ` +
        `A decoration that can hide content prints blank below the fold.`,
    );
  }
};

/**
 * EVERY ROUTE, AT BOTH PHONE WIDTHS, BEFORE ANYTHING ELSE RUNS.
 *
 * This is a cold visit to each URL — the way a forwarded link arrives — rather than
 * a click-through, so it also proves that a pasted address renders the page it
 * names. The engine route is included: it is behind a name prompt, and the
 * antechamber is a page like any other.
 */
await step('every route in the route table renders, cold, at phone widths', async () => {
  for (const [width, height] of [
    [320, 800],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    for (const r of ROUTE_DATA) {
      await page.goto(new URL(r.path, BASE).href, { waitUntil: 'networkidle' });
      await page.waitForTimeout(200);
      await noSidewaysScroll(`${r.path} at ${width}px`);
      await nothingIsInvisible(`${r.path} at ${width}px`);
      const h1 = await page.locator('h1').count();
      if (h1 === 0) throw new Error(`${r.path} renders no <h1>`);
      const mains = await page.locator('#main').count();
      if (mains !== 1) throw new Error(`${r.path} has ${mains} elements with id="main"`);
    }

    /*
      AN UNKNOWN PATH REACHES A REAL 404 AND KEEPS THE ADDRESS IT WAS ASKED FOR.
      It used to render the landing page under the wrong URL, which is a silent
      substitution on a product whose whole proposition is that nothing is silently
      substituted.
    */
    const missing = await page.goto(new URL('/no-such-page', BASE).href, { waitUntil: 'networkidle' });
    // Deployed, the status must say it too: a 404 page served as 200 is indexed as
    // content. Vite's dev server answers every path 200, so that half is remote-only.
    if (REMOTE && missing?.status() !== 404) {
      throw new Error(`an unknown path answered ${missing?.status()}, not 404`);
    }
    if (!/\/no-such-page/.test(page.url())) {
      throw new Error(`the 404 changed the address to ${page.url()}`);
    }
    const body = await page.textContent('body');
    if (!/nothing has been substituted/i.test(body)) {
      throw new Error('an unknown path did not reach the 404');
    }
    await noSidewaysScroll(`the 404 at ${width}px`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
});

await page.goto(BASE, { waitUntil: 'networkidle' });

await step('the landing page states all five claims, not the flattering ones', async () => {
  await page.getByRole('heading', { level: 1 }).waitFor({ timeout: wait(8000) });
  const t = await page.textContent('body');
  for (const phrase of [
    'Self-consistency',
    'Rule coverage',
    'Geometric validity',
    'Agreement with professional judgement',
    'Regulatory validity',
    'Never claimed',
  ]) {
    if (!t.includes(phrase)) throw new Error(`landing page is missing: ${phrase}`);
  }
});

await step('the landing page quotes no number the engine did not produce', async () => {
  const t = await page.textContent('body');
  // The failure mode this guards: "80% faster", "trusted by 40 developers",
  // "99.9% accurate". §22.2's variance study has not been run, so any accuracy
  // or time-saved figure would be a number nobody could defend on a page whose
  // whole subject is defensible numbers.
  const invented = [
    /\b\d{1,3}\s?% (faster|accurate|quicker|more)/i,
    /\btrusted by\b/i,
    /\b\d+\+? (customers|clients|firms|developers) /i,
    /\bsave[sd]? \d+ (hours|days|weeks)/i,
  ];
  for (const re of invented) {
    if (re.test(t)) throw new Error(`landing page makes an unmeasured claim: ${re}`);
  }
  // And it must never describe itself as a compliance check.
  if (/\b(ensures?|guarantees?) compliance\b/i.test(t)) {
    throw new Error('landing page claims compliance');
  }
});

await step('the landing page says what the product will not do', async () => {
  const t = await page.textContent('body');
  for (const phrase of [
    'does not design a building',
    'does not check life safety',
    'does not replace a professional',
  ]) {
    if (!t.toLowerCase().includes(phrase)) throw new Error(`missing limit: ${phrase}`);
  }
});

await step('the landing page stands its worked example up in 3D, and leaves the scroll to the page', async () => {
  // The hero's figure is the run's own model, loaded after the page paints. It has
  // to have drawn — frames, not an element that exists and may be blank — and its
  // caption has to quote the answer's levels against the ceiling's, never the
  // ceiling's alone beside a picture of the whole stack.
  const figure = page.locator('.lp-hero__figure');
  await page.waitForFunction(
    () => Number(document.querySelector('.lp-hero__figure .massing-viewer')?.dataset.frames ?? 0) > 0,
    null,
    { timeout: wait(20000) },
  );
  const caption = await figure.locator('figcaption').innerText();
  if (!/Levels the answer places\s*\d+ of \d+ the height permits/i.test(caption)) {
    throw new Error('the 3D figure is not captioned with the levels the answer places');
  }
  // It says scrolling over it moves the page, so a wheel over it must. A figure that
  // takes the scroll from someone reading past it has taken the page.
  const viewer = figure.locator('.massing-viewer');
  const wheelOver = async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await viewer.scrollIntoViewIfNeeded();
    const start = await page.evaluate(() => window.scrollY);
    const box = await viewer.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(350);
    return (await page.evaluate(() => window.scrollY)) - start;
  };
  if (!((await wheelOver()) > 0)) throw new Error('a wheel over the still 3D figure did not scroll the page');
  // Turned on, the wheel is the model's zoom and the page stays put.
  const toggle = figure.getByLabel('Turn and zoom the model');
  await toggle.check();
  const moved = await wheelOver();
  await toggle.uncheck();
  if (moved !== 0) throw new Error(`with the model turned on, a wheel over it still scrolled the page ${moved}px`);
  await page.evaluate(() => window.scrollTo(0, 0));
});

await step('the landing page reflows on a phone', async () => {
  for (const [width, height] of [
    [320, 800],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(250);
    await noSidewaysScroll(`landing at ${width}px`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
});

await step('the landing page leads into the engine', async () => {
  /*
    THE NAV'S BUTTON IS THE DOOR NOW, NOT THE ENGINE.

    It said "Run a plot" in both states until 6 Oct 2026 and now says "Sign in"
    signed out, so the engine is reached from the PAGE rather than from the
    chrome — which is the arrangement this walk should have been testing all
    along: a reader arrives on the landing page, reads it, and takes the way on
    that the page itself offers.
  */
  await page.getByRole('link', { name: /open the engine anyway/i }).first().click();
  await page.waitForURL('**/app', { timeout: wait(8000) });
});

await step('the antechamber explains itself before it asks for anything', async () => {
  await page.getByRole('heading', { name: /before the engine opens/i }).waitFor({ timeout: wait(5000) });
  const t = await page.textContent('body');
  // It is the first screen behind every public call to action, so it is the worst
  // place on the site to assert a control the software does not have.
  if (!/not verified|cannot verify/i.test(t)) {
    throw new Error('the antechamber does not say the licence is unverified');
  }
  /*
    THIS USED TO ASSERT "not authentication", AND THAT ASSERTION IS NOW WRONG.

    It was right for as long as the screen took a name and nothing else. There is
    now a password (scrypt), a session (a random token stored as its SHA-256) and a
    cookie script cannot read, so a page still saying "this is not authentication"
    would be denying a control it has — the mirror image of the defect this step was
    written to catch, and just as dishonest.

    What replaces it is STRONGER rather than weaker, because the account made a new
    false sentence available: "signed in" now sits one line from "reviewer", and the
    tempting next step is to let one imply the other. So the two refusals the
    account does NOT touch are asserted here, by name, on the screen where the
    account is offered.
  */
  if (!/separation of duties/i.test(t)) {
    throw new Error('the antechamber no longer says separation of duties is not enforced');
  }
  // It used to say "nothing is kept", which was false: a guest's runs were always
  // stored. What a guest lacks is a way back from another browser.
  if (!/open only from this browser/i.test(t)) {
    throw new Error('the antechamber does not say what running without an account costs');
  }
  // And the account may never be described as making anything secure or verified.
  for (const banned of [/\bsecure\b/i, /\bverified identity\b/i, /\btrusted\b/i]) {
    if (banned.test(t)) throw new Error(`the antechamber claims ${banned} of an account`);
  }
});

await step('signing in reaches the affection-plan intake', async () => {
  await page.getByLabel('Your name').fill('Khaled Haggagy');
  await page.getByLabel(/licence number/i).fill('DM-12345');
  await page.getByRole('button', { name: /open the engine/i }).first().click();
  await page.getByRole('heading', { name: /read an affection plan/i }).waitFor({ timeout: wait(5000) });
});

/**
 * The upload, driven against a real Trakhees sheet.
 *
 * Not a fixture and not a stub. Everything downstream of here — the plot, the
 * run, the drawing, the workbook — traces back to a PDF that was actually
 * issued, which is the only version of this test worth having: a parser that
 * works on a document we wrote ourselves has been tested against our own
 * assumptions.
 */
await step('reading a real affection plan reports its printed values', async () => {
  await page.setInputFiles(
    '#affection-plan-file',
    'docs/00-source/samples/affection-plan/IC1-CTYL-16_011-warsan1-621.pdf',
  );
  await page.getByRole('heading', { name: /IC1-CTYL-16_011/i }).waitFor({ timeout: wait(20000) });
  const t = await page.textContent('.reading');
  for (const printed of ['1365.23', '3.5', '4778.31']) {
    if (!t.includes(printed)) throw new Error(`the sheet's ${printed} was not read`);
  }
  // The arithmetic on the sheet, re-done and shown. This is the cheapest
  // available evidence that the read was right, and it is the first thing a
  // sceptical reader would check by hand.
  if (!/agrees/i.test(t)) throw new Error('the cross-check result was not shown');
  if (!/NOT ASSESSED/i.test(t)) throw new Error('the intake dropped the disclaimer');
});

await step('the sheet carries into the plot form without inventing a shape', async () => {
  await page.getByRole('button', { name: /use these values/i }).click();
  await page.getByRole('heading', { name: /^the plot$/i }).waitFor({ timeout: wait(5000) });
  const t = await page.textContent('body');
  if (!/Carried over from the sheet/i.test(t)) throw new Error('no prefill notice');
  // The area came across; the dimensions did not. A rectangle inferred from an
  // area would pass the 2% check against the very number it was computed from.
  const width = await page.getByLabel('Width (m)').inputValue();
  const stated = await page.getByLabel(/Area on the affection plan/i).inputValue();
  if (stated !== '1365.23') throw new Error(`stated area did not carry: ${stated}`);
  if (width === '1365.23') throw new Error('a dimension was inferred from the area');
});

await step('the form refuses to continue with unclassified edges', async () => {
  const cont = page.getByRole('button', { name: /^Continue$/ });
  if (!(await cont.isDisabled())) throw new Error('Continue was enabled with edges unset');
});

await step('a plot can be entered boundary by boundary, and the misclose is stated', async () => {
  /*
    THE CLIENT'S SECOND POINT, ON SCREEN. Plots carry several dimensions,
    fractions and curves; they are not only rectangles. The engine always took an
    arbitrary ring - only the form was a rectangle.

    WHAT IS ACTUALLY BEING CHECKED HERE is the refusal, not the arithmetic.
    `traverse.test.ts` owns the sines. A browser is the only place that can show
    that a fifth boundary can be added, that the closure is reported rather than
    adjusted away, and that the sentence saying what was done with the residue is
    on the page a reader is looking at.
  */
  // The frontage read off the sheet, and the depth its area implies at that
  // frontage. Entered here because the traverse is seeded from them.
  await page.getByLabel('Width (m)').fill('50.85');
  await page.getByLabel('Depth (m)').fill('26.85');
  await page.getByLabel(/Boundary by boundary/i).check();
  await page.locator('#edge-0-length').waitFor({ timeout: wait(5000) });

  // The rectangle that was there arrives as four boundaries, already filled.
  const first = await page.locator('#edge-0-length').inputValue();
  if (first !== '50.85') throw new Error(`the rectangle did not carry over: ${first}`);

  await page.getByRole('button', { name: /add a boundary/i }).click();
  await page.locator('#edge-4-length').fill('9');
  await page.locator('#edge-4-bearing').fill('205');

  const open = await page.textContent('body');
  if (!/do not return to the corner they started from/i.test(open)) {
    throw new Error('the misclose was not reported');
  }
  if (!/Nothing has been adjusted/i.test(open)) {
    throw new Error('the page does not say what was done with the misclose');
  }
  /*
    AND A BOUNDARY MAY CURVE, which is the other half of the same point:
    *«و كيرفات»*. The corners do not move — the length and the bearing
    stay the chord's — and a radius and a side say how the boundary travels
    between them.

    WHAT IS BEING CHECKED HERE is that the radius is turned into the figure the
    affection plan prints, on the screen, beside the box it was typed into.
    `traverse.test.ts` owns the trigonometry; only a browser can show that the
    reader sees it.
  */
  await page.locator('#edge-0-curve').selectOption('right');
  await page.locator('#edge-0-radius').fill('200');
  const curved = await page.textContent('body');
  // 200 m of radius across a 50.85 m chord: 50.988 m along the curve, leaving
  // the straight line by 1.623 m at its deepest.
  if (!/50\.988 m along the curve/.test(curved ?? '')) {
    throw new Error('the curve did not report what the radius implies');
  }
  if (!/1\.623 m at its deepest/.test(curved ?? '')) {
    throw new Error('the curve did not report how far it leaves the chord');
  }

  // A circle too small to reach across the boundary is refused here rather than
  // by the API, and the form will not submit on it.
  await page.locator('#edge-0-radius').fill('9');
  const tooSmall = await page.textContent('body');
  if (!/at least half the length above/.test(tooSmall ?? '')) {
    throw new Error('a radius that cannot span its own boundary was accepted');
  }
  if (!(await page.getByRole('button', { name: /^Continue$/ }).isDisabled())) {
    throw new Error('Continue was enabled with a curve that cannot be drawn');
  }
  await page.locator('#edge-0-curve').selectOption('');

  // A boundary with no length makes the shape unusable rather than being dropped.
  await page.locator('#edge-4-length').fill('');
  if (!(await page.getByRole('button', { name: /^Continue$/ }).isDisabled())) {
    throw new Error('Continue was enabled with a boundary that has no length');
  }

  // Back to the rectangle, which is what the rest of this walk runs on.
  await page.getByRole('button', { name: /remove boundary 5/i }).click();
  await page.getByLabel(/A rectangle/i).check();
  await page.getByLabel('Width (m)').waitFor({ timeout: wait(5000) });
});

await step('classifying every edge and submitting the plot', async () => {
  // The frontage read off the sheet, and the depth its area implies at that
  // frontage — which is what an architect would type, and which the 2% check
  // then confirms against the printed area rather than against itself.
  await page.getByLabel('Width (m)').fill('50.85');
  await page.getByLabel('Depth (m)').fill('26.85');
  await page.getByLabel('Edge 1 faces').selectOption('ROAD');
  await page.getByLabel('Road type').first().selectOption('LOCAL');
  await page.getByLabel('Edge 2 faces').selectOption('ADJACENT_PLOT');
  await page.getByLabel('Edge 3 faces').selectOption('ROAD');
  await page.getByLabel('Road type').last().selectOption('COLLECTOR');
  await page.getByLabel('Edge 4 faces').selectOption('ADJACENT_PLOT');
  await page.getByRole('button', { name: /^Continue$/ }).click();
  await page.getByRole('heading', { name: /confirm the plot/i }).waitFor({ timeout: wait(8000) });
});

await step('the computed area agrees with the sheet inside 2%', async () => {
  const body = await page.textContent('body');
  if (!body.includes('1365.32')) throw new Error('computed area 1365.32 not on screen');
  if (/differs? from the stated/i.test(body)) {
    throw new Error('the 2% check fired on dimensions that match the sheet');
  }
});

await step('confirming the plot (G1)', async () => {
  await page.getByRole('button', { name: /this is the plot/i }).click();
  await page.getByRole('heading', { name: /does parking count toward far/i }).waitFor({ timeout: wait(5000) });
});

/**
 * THE ADDRESS BAR, WHICH USED TO BE READ AND NEVER WRITTEN.
 *
 * `?step=` was read on arrival and written by nobody, so from the second step
 * onward the address named a screen the reader was not looking at. Three things
 * followed, all of them live until now: Back left the flow entirely, because
 * nine step changes had written no history at all; a reload returned to the
 * start with the address still naming the step it was not showing; and a pasted
 * link opened somewhere else.
 *
 * Only a browser can check any of this — it is history, not markup — and it is
 * checked in both directions, because a Back that moves the address without
 * moving the screen is the same defect wearing the opposite face.
 */
await step('the address names the open step, and Back walks the flow rather than leaving it', async () => {
  if (!/[?&]step=rules(&|$)/.test(new URL(page.url()).search)) {
    throw new Error(`confirming the plot left the address at ${page.url()}`);
  }
  await page.goBack();
  await page.getByRole('heading', { name: /confirm the plot/i }).waitFor({ timeout: wait(8000) });
  if (!/[?&]step=parameters(&|$)/.test(new URL(page.url()).search)) {
    throw new Error(`Back moved the screen but not the address: ${page.url()}`);
  }
  await page.goForward();
  await page
    .getByRole('heading', { name: /does parking count toward far/i })
    .waitFor({ timeout: wait(8000) });
  if (!/[?&]step=rules(&|$)/.test(new URL(page.url()).search)) {
    throw new Error(`Forward did not return to the rules step: ${page.url()}`);
  }
});

/**
 * THE SHEET'S OWN LIMITS, BINDING THE RUN AND SAYING WHAT THEY DO NOT BIND.
 *
 * The highest-severity defect in the plan was this: the affection plan was read
 * here, shown on the previous screen, and dropped before the engine ran. This
 * plot ran on a draft FAR of 5.00 while the document open in the same session
 * printed 3.5, with a full derivation under the wrong number.
 *
 * Checked in a browser because the path only exists end to end: the file was
 * chosen by a person, posted with the plot, parsed by the server, resolved by the
 * engine under §11.5 step 1, and reported back. Every layer has its own test and
 * none of them can see this.
 *
 * THE SECOND HALF IS THE HALF THAT MATTERS. A panel listing what the sheet bound
 * and staying quiet about what it did not would be the same silence one screen
 * later, so the unapplied limits are asserted too.
 */
await step('the plot’s own sheet binds the run, and names what it does not bind', async () => {
  const panel = page.locator('.pl');
  await panel.waitFor({ timeout: wait(8000) });
  const t = await panel.textContent();

  if (!t.includes('IC1-CTYL-16_011')) throw new Error('the panel does not name the document');
  if (!t.includes('3.5')) throw new Error('the sheet’s own FAR is not shown as applied');
  if (!t.includes('far.max')) throw new Error('the bound parameter is not named');

  // Stated on this sheet and applied by nothing: a level allowance, a stated
  // GFA, and the tower’s own setback schedule.
  for (const field of ['height', 'gfaSqm', 'setbacks.tower']) {
    if (!t.includes(field)) throw new Error(`${field} is stated on the sheet and not reported`);
  }

  // Amber means ASSUMED and nothing here is assumed. §13.1.
  if (await panel.locator('.traced--assumed').count()) {
    throw new Error('the plot-limits panel painted amber');
  }
  if (!/never assessed and never claimed/i.test(t)) {
    throw new Error('the panel dropped the claim sentence');
  }
});

await step('the sheet\'s podium count waits on the rules step to be confirmed', async () => {
  // The Warsan sheet prints G+2P+8. It used to be read at intake and dropped at
  // the composition root, so every massing showed one podium level in amber. It
  // now arrives here pre-filled — visible and editable before it goes anywhere.
  //
  // The field holds the SHEET'S DIGIT, 2: it asks for podium levels above the
  // ground floor, which is the part of the code a reader can copy across without
  // doing arithmetic. The massing draws 1 + 2. Both numbers are correct and they
  // are different, which is the whole reason the schedule type exists.
  const value = await page.getByLabel('Podium levels').inputValue();
  if (value !== '2') throw new Error(`podium levels pre-filled as "${value}", not the sheet's 2`);
  const t = await page.textContent('body');
  if (!t.includes('G+2P+8')) throw new Error('the field does not say where its value came from');
});

/*
  THE LEVEL SCHEDULE READS BACK AS A HEIGHT CODE — Eng. Mohamed, 2026-09-28.

  Checked in a browser because the panel is the only place the three numbers a
  person types and the code they add up to sit side by side. The engine's own
  `levelCode` writes the string, so this asserts the screen ran it rather than
  that somebody typed the same format twice.
*/
await step('the level schedule reads back the way an affection plan prints one', async () => {
  const panel = page.locator('section[aria-labelledby="levels-heading"]');
  await panel.waitFor({ timeout: wait(8000) });
  const t = (await panel.textContent()).replace(/\s+/g, ' ');
  // One basement, the ground floor given to parking, and the sheet's two podium
  // levels: G with a basement in front of it, and the tower left off because no
  // run has produced one.
  if (!t.includes('1B+G+2P')) throw new Error(`the schedule does not read back as a code: ${t}`);
  if (/1B\+G\+2P\+\d/.test(t)) throw new Error('a tower count was printed before a run produced one');
  // The derived parking count, which is the figure the parking solver takes.
  // The label and the figure are adjacent elements, so the text runs together:
  // "Parking levels2Basements, plus…". No word boundary falls after the 2.
  if (!/Parking levels\s*2(?!\d)/.test(t)) {
    throw new Error('the parking level count the schedule provides is not shown');
  }
  // Amber means ASSUMED. Three numbers a person just typed are not assumed.
  if (await panel.locator('.traced--assumed').count()) {
    throw new Error('the level schedule painted amber');
  }
});

await step('the parking question has no pre-selected answer', async () => {
  const checked = await page.locator('input[name="parking-far"]:checked').count();
  if (checked !== 0) throw new Error(`${checked} option(s) pre-selected — FR-DEF-002 forbids a default`);
  const compute = page.getByRole('button', { name: /compute capacity/i });
  if (!(await compute.isDisabled())) throw new Error('Compute was enabled before the question was answered');
});

/*
  THE ANSWER ON FILE IS OFFERED, AND TAKING IT IS AN ACT.

  The client answered `FR-DEF-002` in writing on 2026-09-28. The plan asked for
  that answer to arrive pre-selected; the step above is why it does not, and this
  step is what replaced it. A recorded statement, with his words and the edge of
  his claim on it, and a button — so the 15–35% swing still belongs to somebody
  after the click, which a checked radio could never guarantee.

  All four parts of the panel are asserted, because the panel is the entire
  difference between this and the hidden default the requirement forbids.
*/
await step('the answer on file is offered with its source, and taking it is one click', async () => {
  /*
    WAIT FOR IT, because the panel arrives from `/api/statements` in an effect.

    Reading the body straight away passed on localhost every time and failed
    against the deployed site: over HTTPS the fetch had not come back yet, so
    the assertion said the statement was not marked as something other than a
    regulation when what had actually happened is that it was not there yet. The
    developer-standard step beside this one already carries the same wait, and
    for the same reason.
  */
  await page.getByRole('button', { name: /use this answer/i }).waitFor({ timeout: wait(8000) });
  const t = await page.textContent('body');
  if (!/This is not a regulation/.test(t)) {
    throw new Error('the statement is not marked as something other than a regulation');
  }
  if (!/Eng\. Mohamed/.test(t)) throw new Error('the statement does not say whose it is');
  // His own words, which are the evidence for the sentence above them.
  if (!/الباركنج/.test(t)) throw new Error('the statement is not quoted verbatim');
  // Where the claim stops — the field this kind of record exists to carry.
  if (!/15–35%/.test(t)) throw new Error('the statement does not say where it stops');

  await page.getByRole('button', { name: /use this answer/i }).click();
  const checked = await page.locator('input[name="parking-far"]:checked').count();
  if (checked !== 1) throw new Error('taking the answer did not answer the question');
  const value = await page.locator('input[name="parking-far"]:checked').getAttribute('value');
  if (value !== 'EXCLUDED_FROM_FAR') throw new Error(`took "${value}", not the recorded answer`);
});

/**
 * A deployment may withhold the developer standards — `DEVELOPER_STANDARDS=off`, the
 * production default, because they are a client's brief given in confidence. Then
 * the panel must still be there and say why, and must not leak the developer's name
 * anywhere on the page. Both states are checked; neither is skipped.
 */
let standardsOffered = true;
await step('a developer standard is offered and marked as not a regulation, or withheld and said so', async () => {
  // Both states render this heading, and only once `/api/standards` has answered.
  // Reading the page before it did passed on localhost and failed across a CDN.
  await page.locator('#standard-heading').waitFor({ timeout: wait(8000) });
  const t = await page.textContent('body');
  if (!/Azizi Developments/.test(t)) {
    standardsOffered = false;
    if (!/in confidence/i.test(t)) throw new Error('no developer standard offered, and no word on why');
    if (/azizi/i.test(t)) throw new Error('a withheld standard still names its developer');
    return;
  }
  // The distinction the whole panel exists to preserve.
  if (!/This is not a regulation/i.test(t)) {
    throw new Error('the standard is not marked as a commercial brief');
  }
  // And what it asks for that the engine does not do.
  if (!/[Bb]alcony/.test(t)) throw new Error('the unmechanized parts are not listed');
});

await step('selecting a scenario fills the mix and the efficiency from the document', async () => {
  if (!standardsOffered) {
    // Nothing to select. The efficiency is typed, as a user without the brief would.
    await page.getByLabel(/Saleable area/i).fill('0.93');
    return;
  }
  await page.getByRole('radio', { name: /Best case/i }).first().check();
  const value = await page.getByLabel(/Saleable area/i).inputValue();
  // 0.93 — the conservative end of the range the document states.
  if (value !== '0.93') throw new Error(`efficiency was not filled from the standard: ${value}`);
  const t = await page.textContent('body');
  // The derivation, in square feet, with the conversion shown.
  if (!/ft²/.test(t)) throw new Error('the unit areas do not show their source units');
  if (!/maxima|Max/.test(t)) throw new Error('the maxima-as-areas caveat is missing');
});

await step('the efficiency has no default and blocks the run until answered', async () => {
  await page.getByLabel(/Saleable area/i).fill('');
  const compute = page.getByRole('button', { name: /compute capacity/i });
  if (!(await compute.isDisabled())) {
    throw new Error('Compute was enabled with no saleable efficiency — that is a hidden 1.00');
  }
  await page.getByLabel(/Saleable area/i).fill('0.93');
});

/*
  THE DEFECT THAT LOCKED THE FLOW ON THE LIVE SITE. ٠٫٩٣ typed on an Arabic
  keyboard, and 93% typed the way the screen itself writes the range, were both
  refused with "it has to sit above 0 and at most 1"; Compute stayed disabled and
  every step after it read "Complete the earlier steps first". A right answer
  written the way a reader writes it must count, and the screen must say what the
  engine will receive.
*/
await step('a share typed in Arabic digits or as a percentage counts, and says how it was read', async () => {
  const field = page.getByLabel(/Saleable area/i);
  const blocked = /Enter the saleable share of GFA to continue/;
  for (const typed of ['٠٫٩٣', '93%']) {
    await field.fill(typed);
    const t = await page.textContent('body');
    if (blocked.test(t)) throw new Error(`${typed} was refused as an unanswered share`);
    if (!/The engine reads this as\s*0\.93/.test(t)) {
      throw new Error(`${typed} was accepted without saying the engine reads it as 0.93`);
    }
  }
  await field.fill('93');
  const t = await page.textContent('body');
  if (!/looks like a percentage/.test(t)) {
    throw new Error('a bare 93 was not told it looks like a percentage');
  }
  await field.fill('0.93');
});

await step('the comparison shows what each answer is worth', async () => {
  await page.getByRole('button', { name: /what each answer is worth/i }).click();
  await page.locator('.comparison__verdict').waitFor({ timeout: wait(8000) });
});

await step('computing the capacity lands on the assumption register first', async () => {
  await page.getByRole('radio', { name: /no, it is excluded/i }).check();
  await page.getByRole('button', { name: /compute capacity/i }).click();
  // §20.2: the register is not a screen you can skip past to the number. The
  // run completes and the *first* thing shown is what it had to assume.
  await page.locator('.data-table').first().waitFor({ timeout: wait(10000) });
});

const NAV = async (name) => {
  await page.getByRole('button', { name, exact: false }).first().click();
};

await step('the assumption register lists a basis for each assumption', async () => {
  const t = await page.textContent('body');
  if (!/bay_area_factor|usable_fraction/.test(t)) throw new Error('no assumptions listed');
});

await step('the governing band is named, and the binding one is marked', async () => {
  await NAV(/^Capacity$/);
  await page.locator('.governing__figure').waitFor({ timeout: wait(8000) });
  const t = await page.textContent('body');
  if (!/Governing capacity/.test(t)) throw new Error('no governing capacity on screen');
  if (!/binds/.test(t)) throw new Error('the binding band is not marked');
  /*
    The 15–35% question, one click from the figure it moves. It reached the graph
    as a `detail` field on band A until it had a node of its own, which meant the
    largest single lever on the number above could not be opened from it.
  */
  if (!/Parking in FAR/.test(t)) throw new Error('the parking-in-FAR treatment is not reported');
  // §15.3 — the field does not exist, and neither does the word.
  if (/realistic/i.test(t)) throw new Error('a "realistic" band appeared');
});

await step('the massing view stands the building up, and says what it assumed', async () => {
  // The canvas is hidden from assistive technology on purpose — it duplicates the
  // levels table beside it, and announcing it would make a screen reader read
  // geometry. So the meaning is asserted on the table and the amber notice; the
  // canvas only has to have drawn. It draws on demand, so "drawn" is a frame count
  // the viewer reports, not a canvas element that exists and may be blank.
  await page.waitForFunction(
    () => Number(document.querySelector('.massing-viewer')?.dataset.frames ?? 0) > 0,
    null,
    { timeout: wait(20000) },
  );
  const t = await page.textContent('body');
  if (!/Podium/.test(t)) throw new Error('no podium volume listed');
  // The podium count came from the sheet and was confirmed on the rules step, so
  // it is the reader's value and the massing must not call it an assumption. The
  // unentered case — ASSUMED, amber, with a basis — is asserted in
  // `apps/api/test/api.test.ts`, where both halves sit side by side.
  // Read from the row itself. Falling back to the body text would pass on any
  // "3" anywhere on the page, which is a check that cannot fail.
  const podium = page.locator('section[aria-labelledby="massing-heading"] tbody tr', {
    has: page.locator('th', { hasText: /^\s*Podium/ }),
  });
  if ((await podium.count()) === 0) throw new Error('no podium row in the massing table');
  const levels = await podium.first().locator('td').first().textContent();
  /*
    THREE, NOT THE SHEET'S 2 — and this assertion held the defect.

    `G+2P+8` is ground plus two podium levels: THREE levels standing on the
    podium footprint. The rules step asks for the digit (`2`, "podium levels
    above the ground floor") because that is what the sheet prints; the massing
    draws `1 + 2`. This step read the digit off the sheet and demanded the
    massing show it, so the podium was drawn one level short on every plot whose
    sheet stated one, and the gate that should have caught it agreed with it.

    The cell reads "3levels (You set this)", so a word boundary never falls
    after the 3.
  */
  if (!/^\s*3(?!\d)/.test(levels ?? '')) {
    throw new Error(`the podium shows "${levels}", not the 1 + 2 the sheet's G+2P+8 means`);
  }
  if (/rests on an assumption/i.test(t)) {
    throw new Error('a podium count the reader confirmed is still described as assumed');
  }
});

await step('the 3D view holds the engine’s bays, and paints its assumptions amber', async () => {
  const section = page.locator('section[aria-labelledby="massing-heading"]');
  const viewer = page.locator('.massing-viewer');
  // Cars on the GPU, counted off the scene, against the engine's own figure in the
  // table under it. `pnpm parity` proves the builder; this proves the page ran it.
  const drawn = Number(await viewer.getAttribute('data-cars'));
  const row = section.locator('tbody tr', { has: page.locator('th', { hasText: /^\s*Every parking level/ }) });
  const engine = Number(((await row.locator('td').nth(1).textContent()) ?? '').match(/\d+/)?.[0] ?? NaN);
  if (!(drawn > 0) || drawn !== engine) {
    throw new Error(`the 3D view drew ${drawn} cars; the engine placed ${engine}`);
  }

  // §13.1 inside the canvas, where no stylesheet gate can look. The words pinned to
  // the model are DOM and could carry the amber on their own, so they are hidden
  // for the measurement: this counts only what WebGL painted.
  //
  // What the canvas paints by class is the slabs (their outline's class) and the
  // ramps (their gradient's). A floor level is not painted, so an assumed one is
  // not expected to show — which is why this reads the table's Outline-or-slope
  // column rather than counting every amber value on the panel.
  const levels = section.locator('table', { has: page.locator('caption', { hasText: /Every level and ramp/ }) });
  // A level the answer does not place is drawn as a neutral outline, not in its
  // outline's class, so its row is left out of the count.
  const outlines = await levels
    .locator('tbody tr', { hasNot: page.locator('th', { hasText: /permitted, not placed/ }) })
    .locator('button[aria-label*=" outline: Assumed"]')
    .count();
  const ramps = await levels
    .locator('tbody tr', { has: page.locator('th', { hasText: /^\s*Ramp/ }) })
    .locator('.traced--assumed')
    .count();
  await page.locator('.massing-viewer__labels').evaluate((el) => { el.style.visibility = 'hidden'; });
  const png = await page.locator('.massing-viewer__canvas').screenshot();
  await page.locator('.massing-viewer__labels').evaluate((el) => { el.style.visibility = ''; });
  const share = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let amber = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i] / 255, gr = d[i + 1] / 255, b = d[i + 2] / 255;
      const max = Math.max(r, gr, b), min = Math.min(r, gr, b), delta = max - min;
      if (delta < 0.12 || max === 0) continue; // greys and near-greys carry no hue
      let h = max === r ? ((gr - b) / delta) % 6 : max === gr ? (b - r) / delta + 2 : (r - gr) / delta + 4;
      h *= 60;
      if (h < 0) h += 360;
      if (h >= 18 && h <= 50 && delta / max >= 0.25) amber += 1;
    }
    return amber / (d.length / 4);
  }, png.toString('base64'));
  const pct = `${(share * 100).toFixed(2)}%`;
  console.log(`         amber inside the canvas: ${pct} of its pixels; ${outlines} assumed outline(s), ${ramps} assumed ramp(s)`);
  // Both ways. Amber where the model is assumed, in proportion to what is; and none
  // where nothing is — amber that turns up on a cited slab is the same defect.
  if (outlines > 0 && share < 0.01) throw new Error(`${outlines} assumed outline(s), and only ${pct} of the view is amber`);
  if (outlines === 0 && ramps > 0 && share < 0.0005) throw new Error(`an assumed ramp, and only ${pct} of the view is amber`);
  if (outlines === 0 && ramps === 0 && share >= 0.0005) throw new Error(`nothing painted is assumed, and ${pct} of the view is amber`);
});

await step('the parking levels are drawn bay by bay, one sheet a level', async () => {
  await NAV(/^Parking$/);
  await page.locator('.sheet-set').waitFor({ timeout: wait(8000) });
  const selected = await page.locator('[role="tab"][aria-selected="true"]').innerText();
  if (!/A-1\d\d/.test(selected)) throw new Error(`the drawing set opened on "${selected}", not a parking level`);
  const sheet = page.locator('.sheet-view__svg').first();
  const bays = await sheet.locator('[data-bay]').count();
  const cars = await sheet.locator('[data-car]').count();
  if (bays < 10) throw new Error(`only ${bays} bays drawn — this is a summary, not a layout`);
  if (cars !== bays) throw new Error(`${bays} bays but ${cars} cars on the sheet`);

  const t = await page.textContent('body');
  // The ramp is the one shape whose compliance is unknown, and the sheet has to
  // say so on the drawing rather than let a tidy picture imply otherwise.
  if (!/GRADIENT NOT ASSESSED/.test(t)) throw new Error('the ramp was drawn as if it were checked');
  if (!/B\.7\.2\.2/.test(t)) throw new Error('the ramp clause is not cited');
});

await step('the entrance is recommended with its alternatives and refusals', async () => {
  const t = await page.textContent('body');
  if (!/Vehicle access/i.test(t)) throw new Error('no access panel');
  if (!/Refused, and why/i.test(t)) throw new Error('refused frontages are not listed');
  // "Opposite a T junction" needs a road network this engine was not given. It
  // is reported, never quietly dropped.
  if (!/junction/i.test(t)) throw new Error('the T-junction residue is not disclosed');
});

await step('the checks screen carries the five-way claim statement', async () => {
  await NAV(/checks/i);
  await page.locator('.claim--never').waitFor({ timeout: wait(5000) });
  const t = await page.textContent('body');
  for (const s of ['Regulatory validity', 'Never claimed', 'Conservation checks', 'not counted as passes']) {
    if (!t.includes(s)) throw new Error(`missing: ${s}`);
  }
});

await step('the not-assessed checks can be revealed, not just hidden', async () => {
  await page.getByRole('button', { name: /checks that had nothing to check/i }).click();
  await page.locator('tr.is-not-assessed').first().waitFor({ timeout: wait(5000) });
});

await step('a number opens its derivation (P0-S6)', async () => {
  await NAV(/evidence/i);
  // `button.traced`, not `.traced` — the legend renders inert samples with the
  // same class, and clicking one of those proves nothing.
  await page.locator('button.traced').first().click();
  await page.locator('[role="dialog"]').waitFor({ timeout: wait(5000) });
  const t = await page.textContent('[role="dialog"]');
  if (!/PLACEHOLDER|clause|rule/i.test(t)) throw new Error('derivation reached no clause');
  await page.keyboard.press('Escape');
});

await step('the export refuses until both gates are satisfied', async () => {
  await NAV(/^Export$/);
  const go = page.getByRole('button', { name: /export report/i });
  if (!(await go.isDisabled())) throw new Error('Export was enabled with gates outstanding');
  // And the unmet gate has to lead somewhere. An unactionable checklist item is
  // a dead end, which is what this row was before it had this link.
  await page.getByRole('button', { name: /assumption register/i }).waitFor({ timeout: wait(5000) });
});

await step('acknowledging the register and signing unlocks the export', async () => {
  await page.getByRole('button', { name: /assumption register/i }).click();
  await page.getByRole('button', { name: /I have read the assumptions/i }).click();
  // Wait for the gate to actually land — the acknowledgement is a round trip to
  // the server, and clicking on to the next screen before it returns is a race
  // this test lost roughly half the time.
  await page.getByText(/You acknowledged these assumptions/i).waitFor({ timeout: wait(8000) });

  await NAV(/^Export$/);
  await page.getByRole('button', { name: /sign this export/i }).click();
  const go = page.getByRole('button', { name: /export report/i });
  await go.waitFor({ timeout: wait(8000) });
  await page.waitForFunction(
    () =>
      !document.querySelector('button.button--primary[disabled]') ||
      ![...document.querySelectorAll('button')].some(
        (b) => /export report/i.test(b.textContent ?? '') && b.disabled,
      ),
    undefined,
    { timeout: wait(8000) },
  );
  if (await go.isDisabled()) throw new Error('Export still blocked after both gates');
});

await step('the export hands over a report and a JSON document', async () => {
  await page.getByRole('button', { name: /export report/i }).click();
  await page.getByRole('button', { name: /open the report/i }).waitFor({ timeout: wait(15000) });
  await page.getByRole('button', { name: /open the json export/i }).waitFor({ timeout: wait(5000) });
  const body = await page.textContent('body');
  // §13.4 — both fingerprints on screen, because a reproducibility guarantee a
  // reader cannot check is a claim, not a guarantee.
  if (!/Run fingerprint/.test(body)) throw new Error('no run fingerprint shown');
  if (!/Report fingerprint/.test(body)) throw new Error('no report fingerprint shown');
  if (!/annex .*is not signed|NOT SIGNED/i.test(body)) {
    throw new Error('the unsigned-annex notice did not reach the export screen');
  }
});

await step('the drawing, the 3D model and the workbook download, behind the same gates', async () => {
  for (const [label, ext] of [
    [/download the cad drawing/i, 'dxf'],
    [/download the 3d model/i, 'glb'],
    [/download the workbook/i, 'xlsx'],
  ]) {
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: wait(20000) }),
      page.getByRole('button', { name: label }).click(),
    ]);
    const name = dl.suggestedFilename();
    if (!name.endsWith(`.${ext}`)) throw new Error(`${ext} download was named ${name}`);
    if (ext === 'glb') {
      // The file, not the button: a GLB header, and the two sentences in its metadata.
      const bytes = readFileSync(await dl.path());
      if (bytes.readUInt32LE(0) !== 0x46546c67) throw new Error(`${name} is not a GLB file`);
      const json = bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8');
      if (!json.includes('REGULATORY VALIDITY: NOT ASSESSED')) throw new Error(`${name} does not say it is not assessed`);
    }
  }
});

await step('the report opens, and it carries the claim statement', async () => {
  const [report] = await Promise.all([
    page.context().waitForEvent('page'),
    page.getByRole('button', { name: /open the report/i }).click(),
  ]);
  await report.waitForLoadState('load');
  const text = await report.textContent('body');
  for (const phrase of ['REGULATORY VALIDITY', 'NOT ASSESSED']) {
    if (!text.toUpperCase().includes(phrase)) throw new Error(`report is missing: ${phrase}`);
  }
  await report.close();
});

await step('save as PDF hands the browser the report, not this page', async () => {
  /*
    THE PDF, WHICH ONLY A BROWSER CAN SHOW IS WORKING.

    The report is print-first HTML and the browser is this product's PDF writer
    (`apps/web/src/documents.ts`). The failure that matters is silent: print the
    OPENER instead of the document and the dialog still opens, the button still
    looks right, and what comes out is a screenshot of the app with the report
    nowhere in it. So the frame's own document is read back here and held to the
    sentence every report carries.

    `print()` itself is a no-op in headless Chromium, which is why the click is
    safe to make in a gate at all.
  */
  await page.getByRole('button', { name: /save the report as pdf/i }).click();
  const frame = page.frameLocator('iframe[aria-hidden="true"]');
  const text = await frame.locator('body').textContent({ timeout: wait(20000) });
  for (const phrase of ['REGULATORY VALIDITY', 'NOT ASSESSED']) {
    if (!text.toUpperCase().includes(phrase)) {
      throw new Error(`the printed document is missing: ${phrase}`);
    }
  }
  // The page itself is not what would have been printed.
  if (/Save the report as PDF/i.test(text)) {
    throw new Error('the print frame holds this page, not the report');
  }
});

await step('the readiness page leads with what is not ready', async () => {
  // Reached through the shared nav, which every route now carries — the engine's
  // own two-item route bar is gone, and with it the "Status" label. The name
  // changed on purpose: `status` reads as uptime, and nothing here monitors
  // availability.
  await page.getByRole('link', { name: /^readiness$/i }).click();
  await page.waitForURL('**/readiness', { timeout: wait(8000) });
  await page.getByRole('heading', { name: /what is not ready/i }).waitFor({ timeout: wait(8000) });

  const t = await page.textContent('body');
  // Zero approved rules and an unsigned annex, stated rather than scored.
  if (!/0 of \d+/.test(t)) throw new Error('no zero-of-N readiness figure on the page');
  if (!/Nothing produced here is a capacity assessment/i.test(t)) {
    throw new Error('missing the blocking notice');
  }
  // And never a composite health number, which is what a reader would stop at.
  if (/health score|overall score|\b9\d% ready\b/i.test(t)) {
    throw new Error('the status page invented a composite score');
  }
});

await step('the status page shows the run that was just made', async () => {
  const t = await page.textContent('body');
  // The parcel id printed on the sheet the run started from, not a fixture.
  if (!/6211383/.test(t)) throw new Error('the run does not appear in recent runs');
  // Checks are reported as "ran", never as a tick.
  if (!/\d+ of 18 ran/.test(t)) throw new Error('invariants shown without the ran/total split');
  if (!/life safety/i.test(t)) throw new Error('the deferred life-safety rule is not surfaced');
});

await step('the status page ranks assumption exposure by measured effect', async () => {
  const t = await page.textContent('body');
  if (!/parking\.(usable_fraction|bay_area_factor)/.test(t)) {
    throw new Error('no assumed parameters listed');
  }
  if (!/Largest measured swing/i.test(t)) throw new Error('no measured swing column');
});

await step('back returns to the engine with the run still there', async () => {
  await page.goBack();
  // `**/app` no longer matches: the flow writes `?step=` on every move, so the
  // entry this Back returns to is `/app?step=export`. Matching the path and
  // letting the query be whatever the flow last wrote is what was meant here.
  await page.waitForURL((u) => new URL(u).pathname === '/app', { timeout: wait(8000) });
  // Assert on something only a *completed* run puts on screen. The first
  // version of this checked for the word "Export", which the stepper prints
  // whether or not a run exists — so it passed while the run was being
  // destroyed on every visit to the status page.
  await page.getByRole('button', { name: /open the report/i }).waitFor({ timeout: wait(8000) });
  const stillReachable = await page
    .getByRole('button', { name: /^Capacity$/ })
    .first()
    .isEnabled();
  if (!stillReachable) throw new Error('the steps re-locked — the run was lost');
});

await step('the keyboard reaches the whole flow', async () => {
  // From a known starting point. After a popup closes, focus is on <body> and
  // the first Tab tells you nothing about the page.
  await page.locator('body').click({ position: { x: 2, y: 2 } });
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => {
    const el = document.activeElement;
    return { tag: el?.tagName ?? '', role: el?.getAttribute('role') ?? '' };
  });
  // An SVG element with role="button" and tabindex=0 is a legitimate stop — the
  // plot edges are reachable by keyboard on purpose.
  const ok =
    ['BUTTON', 'A', 'INPUT', 'SELECT', 'SUMMARY', 'TEXTAREA'].includes(focused.tag) ||
    focused.role === 'button';
  if (!ok) throw new Error(`Tab landed on <${focused.tag}> with role="${focused.role}"`);
});

await step('no screen scrolls sideways on a phone', async () => {
  // Every screen, not one. The first version of this check looked at whichever
  // screen happened to be open and passed while four others overflowed by more
  // than 100px each.
  for (const [width, height] of [
    [320, 800],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });

    for (const nav of [/^Sheet$/, /^Plot$/, /^Parameters$/, /^Rules$/, /^Assumptions$/, /^Capacity$/, /^Parking$/, /^Checks$/, /^Evidence$/, /^Export$/]) {
      await page.getByRole('button', { name: nav }).first().click();
      await page.waitForTimeout(200);
      await noSidewaysScroll(`${String(nav)} at ${width}px`);
    }

    /*
      THE RUN SURVIVES A PUBLIC NAVIGATION, and that is what is being measured here
      as much as the reflow.

      Reached through the nav, not a fresh load: a `goto` reloads the document and
      drops the in-memory run, which locks every step after the first and leaves the
      next pass of this loop waiting on a disabled stepper button. The engine latch
      is what makes the click-through safe — it keeps `EngineApp` mounted behind
      every public page once it has been opened — so if this step starts failing
      with a locked stepper, the latch is what to look at.

      Below the fold the nav links are a disclosure, so the button has to be opened
      before the link inside it can be clicked. It is a real <button> with
      `aria-expanded`, and `[Run a plot]` is never collapsed into it.
    */
    const openNav = async () => {
      const disclosure = page.getByRole('button', { name: /^(sections|close)$/i });
      if ((await disclosure.count()) > 0 && (await disclosure.first().isVisible())) {
        if ((await disclosure.first().getAttribute('aria-expanded')) !== 'true') {
          await disclosure.first().click();
        }
      }
    };

    await openNav();
    await page.getByRole('link', { name: /^readiness$/i }).click();
    await page.waitForURL('**/readiness', { timeout: wait(8000) });
    await page.waitForTimeout(300);
    await noSidewaysScroll(`readiness at ${width}px`);
    await nothingIsInvisible(`readiness at ${width}px`);

    /*
      Back into the engine by its own address. The nav's button is the sign-in
      door now, and `/readiness` offers a way into the engine only when it has no
      runs to list — so a click here would pass on an empty deployment and fail
      on a used one, which is the worst kind of step to leave in a gate.
    */
    await page.goto(new URL('/app', BASE).href, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/app', { timeout: wait(8000) });
    await page.waitForTimeout(300);
  }
});

/**
 * THE ARABIC SITE, WALKED THE WAY THE ENGLISH ONE IS.
 *
 * Every render test that holds an Arabic page to the glossary runs over static
 * markup, and static markup has no width. A right-to-left layout fails in the ways
 * only a browser can show: a `margin-left` that survived the logical-property pass
 * pushes a column off the start edge, a Latin identifier inside an Arabic sentence
 * widens a phone's line, a table that fit in English does not fit in a language
 * whose words are longer. So every route is visited cold in Arabic at both phone
 * widths and on a desktop, and held to what the English walk is held to.
 *
 * AND WHAT A READER HEARS, NOT ONLY WHAT THEY SEE. On a route the route table
 * marks `translated`, no run of four Latin words may stand outside an element
 * marked `lang="en"` — in the text, or in an `aria-label`, `alt`, `title` or
 * `placeholder`. An English label on an Arabic page is read aloud in an Arabic
 * voice, which is a page that cannot be understood by the one reader it was
 * translated for. It is the browser twin of `expectNoEnglishProse`, and it sees
 * what that cannot: attributes, and text a component writes only once mounted.
 *
 * Failures are collected across the whole walk and reported together: stopping at
 * the first route would report one defect and hide the rest behind it.
 */
await step('every route renders in Arabic, right to left, and says nothing in English it should not', async () => {
  const found = [];
  await page.evaluate(() => localStorage.setItem('envelope.locale', 'ar'));
  for (const [width, height] of [
    [320, 800],
    [390, 844],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width, height });
    for (const r of ROUTE_DATA) {
      const label = `${r.path} in Arabic at ${width}px`;
      await page.goto(new URL(r.path, BASE).href, { waitUntil: 'networkidle' });
      await page.waitForTimeout(200);
      const root = await page.evaluate(() => ({
        dir: document.documentElement.getAttribute('dir'),
        lang: document.documentElement.getAttribute('lang'),
      }));
      if (root.dir !== 'rtl' || root.lang !== 'ar') {
        found.push(`${label}: <html dir="${root.dir}" lang="${root.lang}">, not rtl/ar`);
      }
      for (const check of [noSidewaysScroll, nothingIsInvisible]) {
        try {
          await check(label);
        } catch (e) {
          found.push(String(e.message ?? e));
        }
      }
      if (r.arabic !== 'translated' || width !== 1440) continue;
      const prose = await page.evaluate(() => {
        const NOT_COPY = 'code, svg, pre, kbd, samp, script, style, math, canvas, [lang="en"]';
        const PROSE = /[A-Za-z][A-Za-z’'-]*(?:[ ,;:]+[A-Za-z][A-Za-z’'-]*){3,}/g;
        const main = document.body;
        const parts = [];
        const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, {
          acceptNode: (n) =>
            n.parentElement && n.parentElement.closest(NOT_COPY)
              ? NodeFilter.FILTER_REJECT
              : NodeFilter.FILTER_ACCEPT,
        });
        for (let n = walker.nextNode(); n; n = walker.nextNode()) parts.push(n.nodeValue ?? '');
        const hits = [...parts.join(' ').replace(/\s+/g, ' ').matchAll(PROSE)].map((m) => m[0]);
        for (const el of main.querySelectorAll('[aria-label], [alt], [title], [placeholder]')) {
          if (el.closest('[lang="en"]')) continue;
          for (const a of ['aria-label', 'alt', 'title', 'placeholder']) {
            const v = el.getAttribute(a);
            if (v && PROSE.test(v)) hits.push(`${a}="${v}"`);
            PROSE.lastIndex = 0;
          }
        }
        return hits;
      });
      if (prose.length > 0) {
        found.push(`${label} leaves English outside lang="en": «${prose.slice(0, 4).join('» «')}»`);
      }
    }
  }
  await page.evaluate(() => localStorage.setItem('envelope.locale', 'en'));
  await page.setViewportSize({ width: 1440, height: 900 });
  if (found.length > 0) throw new Error(`${found.length} problem(s): ${found.join(' | ')}`);
});

/* ==========================================================================
 * `/settings` — THE TWO MUTATIONS, DRIVEN.
 *
 * Last, and deliberately: this step registers an account, and every step above
 * runs as an actor with no account. Running it earlier would put a name in the
 * rail and a session cookie on the page for the whole walk, which is a different
 * product from the one the rest of this file measures.
 *
 * It is here rather than only in `settings.test.tsx` because a render test cannot
 * see either of the things that can actually be wrong: whether the PATCH reaches
 * the server and comes back in the name the rail draws, and whether a refused
 * password change leaves the account alone. Both are round trips.
 * ======================================================================= */

/*
  A 409 FROM REGISTER IS THE IDEMPOTENCY WORKING, NOT A FAULT.

  On every run after the first, the fixed account already exists and the register
  call is answered "that address is taken" — which is what tells this step to sign
  in instead. The browser logs it as a failed resource, and counting it would mean
  the second run of a suite that passes always reports a problem.
*/
expectedRefusal = '/api/auth/register';
await step('the settings page saves a name, and the rail redraws with it', async () => {
  // Registered through the API, not the account panel. This step is about the
  // settings page; driving the sign-up form to reach it would make a failure in
  // that form look like a failure here, and the antechamber has its own steps.
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  const how = await page.evaluate(
    async ([address, password, alternate]) => {
      const post = (path, body) =>
        fetch(path, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
      const made = await post('/api/auth/register', {
        email: address,
        password,
        name: 'Khaled Haggagy',
        licence: 'DM-1',
      });
      if (made.status === 201) return 'registered';
      // Already there from a previous run. Either password may be the live one:
      // the last step changes it and changes it back, and a run that died between
      // the two left the alternate in place.
      for (const candidate of [password, alternate]) {
        const back = await post('/api/auth/login', { email: address, password: candidate });
        if (back.ok) return candidate === password ? 'signed in' : 'signed in (alternate)';
      }
      return `register ${made.status}, and neither password signs in`;
    },
    [SMOKE_EMAIL, SMOKE_PASSWORD, SMOKE_PASSWORD_ALT],
  );
  if (!how.startsWith('registered') && !how.startsWith('signed in')) throw new Error(how);

  await page.goto(`${BASE.replace(/\/$/, '')}/settings`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /who you are|من أنت/i }).waitFor({ timeout: wait(8000) });

  const name = page.getByLabel(/^Name$/);
  await name.fill('Khaled A. Haggagy');
  await page.getByRole('button', { name: /save name and licence/i }).click();
  await page.getByText(/^Saved\.$/).waitFor({ timeout: wait(8000) });

  // THE POINT OF THE ROUND TRIP: the rail is drawn from the SESSION, not from the
  // form, so it only says the new name if the server stored it and the session
  // picked the stored account back up.
  const rail = page.getByRole('navigation', { name: /your workspace/i });
  await rail.getByText('Khaled A. Haggagy').waitFor({ timeout: wait(8000) });

  // And it survives a reload, which is the difference between stored and echoed.
  await page.reload({ waitUntil: 'networkidle' });
  const stored = await page.getByLabel(/^Name$/).inputValue();
  if (stored !== 'Khaled A. Haggagy') throw new Error(`the name did not persist: "${stored}"`);
});

await step('a licence can be withdrawn, not only replaced', async () => {
  await page.getByLabel(/licence number/i).fill('');
  await page.getByRole('button', { name: /save name and licence/i }).click();
  await page.getByText(/^Saved\.$/).waitFor({ timeout: wait(8000) });
  await page.reload({ waitUntil: 'networkidle' });
  const left = await page.getByLabel(/licence number/i).inputValue();
  // Somebody who no longer holds a licence has to be able to withdraw the
  // assertion. An optional field could not express it — omitted means "leave it".
  if (left !== '') throw new Error(`the licence came back as "${left}"`);
});

expectedRefusal = '/api/auth/password';
await step('a wrong current password is refused, in the server’s own sentence', async () => {
  await page.getByLabel(/current password/i).fill('not the password');
  await page.getByLabel(/^New password$/).fill('another long secret phrase');
  await page.getByLabel(/new password again/i).fill('another long secret phrase');
  await page.getByRole('button', { name: /^change password$/i }).click();
  await page
    .getByText(/that is not the current password/i)
    .waitFor({ timeout: wait(8000) });
});

await step('the confirmation field is checked here, and the length is not', async () => {
  await page.getByLabel(/current password/i).fill(SMOKE_PASSWORD);
  await page.getByLabel(/^New password$/).fill(SMOKE_PASSWORD_ALT);
  await page.getByLabel(/new password again/i).fill('a different long secret');
  await page.getByRole('button', { name: /^change password$/i }).click();
  await page.getByText(/these two do not match/i).waitFor({ timeout: wait(4000) });

  // A short password is refused BY THE SERVER, in the server's words — the form
  // holds no second copy of the rule that could disagree with the one enforced.
  await page.getByLabel(/^New password$/).fill('short');
  await page.getByLabel(/new password again/i).fill('short');
  await page.getByRole('button', { name: /^change password$/i }).click();
  await page.getByText(/at least 12 characters/i).waitFor({ timeout: wait(8000) });
});

expectedRefusal = null;
await step('changing the password says every other device was signed out', async () => {
  const change = async (from, to) => {
    await page.getByLabel(/current password/i).fill(from);
    await page.getByLabel(/^New password$/).fill(to);
    await page.getByLabel(/new password again/i).fill(to);
    await page.getByRole('button', { name: /^change password$/i }).click();
    await page
      .getByText(/every other device has been signed out/i)
      .waitFor({ timeout: wait(10000) });
  };

  await change(SMOKE_PASSWORD, SMOKE_PASSWORD_ALT);

  // This device is NOT signed out: the server hands it a fresh cookie, and the
  // rail would lose the name if it had not.
  const rail = page.getByRole('navigation', { name: /your workspace/i });
  await rail.getByText('Khaled A. Haggagy').waitFor({ timeout: wait(5000) });

  // AND BACK, so the next run finds the account where it left it. That also
  // exercises the change a second time from a cookie the previous change issued,
  // which is the one session the route is required not to have destroyed.
  await change(SMOKE_PASSWORD_ALT, SMOKE_PASSWORD);
});

await step('the settings page offers no control the server cannot honour', async () => {
  const email = page.getByLabel(/^Email$/);
  // `!== null`, not truthiness: a boolean attribute renders as `readonly=""`, and
  // the first version of this check read that empty string as "not present" —
  // reporting an editable email on a field that is read-only.
  if ((await email.getAttribute('readonly')) === null) {
    throw new Error('the email field is editable');
  }
  // `readOnly`, not `disabled`: a disabled input is skipped by keyboard
  // navigation, so a reader tabbing the form would never reach the sentence that
  // explains it.
  if (await email.isDisabled()) throw new Error('the email field is disabled, not read-only');

  const body = (await page.locator('body').innerText()).toLowerCase();
  for (const absent of ['two-factor', 'delete account', 'api key', 'billing']) {
    if (body.includes(absent)) throw new Error(`/settings offers "${absent}"`);
  }
});

await step('the settings page paints no amber', async () => {
  // §13.1: amber is `ASSUMED` and nothing on this page is an assumed value. A
  // stylesheet gate cannot see this — only a browser knows what was painted.
  const amber = await page.evaluate(() => {
    const ink = getComputedStyle(document.documentElement)
      .getPropertyValue('--uncertain')
      .trim()
      .toLowerCase();
    if (!ink) return 'no --uncertain token';
    const hit = [...document.querySelectorAll('main *')].find((el) => {
      const s = getComputedStyle(el);
      return [s.color, s.backgroundColor, s.borderTopColor, s.borderLeftColor].some(
        (v) => v && v !== 'rgba(0, 0, 0, 0)' && v.toLowerCase() === ink,
      );
    });
    return hit ? hit.className || hit.tagName : null;
  });
  if (amber && amber !== 'no --uncertain token') {
    throw new Error(`amber painted on /settings by "${amber}"`);
  }
});

await step('the settings page signs out of everywhere', async () => {
  await page.getByRole('button', { name: /sign out everywhere/i }).click();
  // The page does not redirect; it redraws as the signed-out branch, which is the
  // branch a stranger with the bookmark sees.
  await page.getByText(/there is no account signed in/i).waitFor({ timeout: wait(8000) });
});

await step('every contents jump clears the sticky nav (WCAG 2.2 · 2.4.11)', async () => {
  /*
    THE FAILURE THIS CATCHES IS INVISIBLE TO EVERY OTHER GATE.

    `.nav` is sticky, so a fragment jump has to clear it, and `.section` carries a
    `scroll-margin-block-start` that does. Four of the five contents lists anchor
    to the section; `/dashboard` anchors to the heading `aria-labelledby` already
    named, and its headings landed 61px UNDER the nav — on every entry, on a page
    whose whole job is being read. No stylesheet check can see it: both rules were
    valid, both tokens resolved, and the two elements were simply not the same one.

    Sampled at three points per page rather than one: the defect was uniform here,
    but a section that had opted out of the chassis would not be.
  */
  /*
    `/` IS NOT IN THIS LIST ANY MORE, AND THAT IS NOT THE CHECK BEING WEAKENED.

    This step holds a contents list to clearing the sticky nav. The redesigned
    landing page carries no contents list at all — it is short, and its sections
    are reached by scrolling rather than by an index — so there is nothing here
    for the step to measure. Four pages still render one and all four are still
    sampled at three entries each; the rule is unchanged, the page simply left
    the set of pages it applies to. A route kept in this list with no list on it
    fails forever and reports nothing, which is how this was found.
  */
  for (const route of ['/parking', '/exports', '/refusals', '/readiness']) {
    await page.goto(new URL(route, BASE).href, { waitUntil: 'domcontentloaded' });
    // `domcontentloaded` is before React paints, and the list is React's.
    await page.locator('nav.contents').first().waitFor({ timeout: wait(10000) });
    const links = page.locator('nav.contents a');
    const n = await links.count();
    if (n < 2) throw new Error(`${route} renders no contents list`);
    for (const i of [0, Math.floor(n / 2), n - 1]) {
      const href = await links.nth(i).getAttribute('href');
      await page.evaluate((h) => {
        window.location.hash = h;
      }, href);
      await page.waitForTimeout(400);
      const clearance = await page.evaluate((h) => {
        const el = document.querySelector(h);
        const nav = document.querySelector('.nav');
        if (!el) return null;
        const navBottom = nav ? nav.getBoundingClientRect().bottom : 0;
        return el.getBoundingClientRect().top - navBottom;
      }, href);
      if (clearance === null) throw new Error(`${route} lists ${href}, which is not in the page`);
      if (clearance < 0) {
        throw new Error(
          `${route} ${href} lands ${Math.round(-clearance)}px under the sticky nav`,
        );
      }
    }
  }
});

/**
 * THE FRONT PAGE'S PRIMARY BUTTON, FOLLOWED THE WAY A VISITOR FOLLOWS IT.
 *
 * `run this plot yourself` links to `/app?demo=worked-example`. The antechamber
 * carries that query across sign-in on purpose and documents why. `EngineApp`'s
 * docblock said it acted on it. Nothing did — the word appeared in four comments,
 * one type annotation and no code — so the strongest call to action on the site
 * signed you in and dropped you on an empty intake form.
 *
 * IN A FRESH CONTEXT, because the walk above has a plot and a run in memory and
 * the demo refuses to overwrite either. That guard is worth having and it would
 * make this step pass without loading anything.
 *
 * WHAT IS ASSERTED IS THE INPUT, NOT THE BUTTON. A demo that filled in roughly
 * this plot would hand a reader a different governing capacity from the one they
 * had just read on the page they clicked from — the failure that matters here is
 * silent, and it is a number.
 */
await step('the front page’s worked example opens as a run the visitor can make', async () => {
  const fresh = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const visitor = await fresh.newPage();
  try {
    await visitor.goto(new URL('/', BASE).href, { waitUntil: 'domcontentloaded' });
    await visitor.getByRole('link', { name: /run this plot yourself/i }).first().click();
    await visitor.getByLabel('Your name').fill('Khaled Haggagy');
    await visitor.getByRole('button', { name: /open the engine/i }).first().click();

    // It opens at the plot, not at the sheet: there is no affection plan to drop.
    await visitor.getByLabel(/plot number/i).waitFor({ timeout: wait(10000) });

    // The query is an instruction and is spent. Left in history, Back would
    // re-run it, and a Back button that re-deals the same hand is worse than one
    // that does nothing.
    const url = new URL(visitor.url());
    if (url.searchParams.has('demo')) {
      throw new Error(`the demo query was left in the address: ${visitor.url()}`);
    }
    if (url.searchParams.get('step') !== 'plot') {
      throw new Error(`the demo did not open the plot step: ${visitor.url()}`);
    }

    // The recorded input, field by field, against the file the landing page reads
    // every figure from and `pnpm example` re-runs against the real API.
    const { input, verified } = JSON.parse(
      readFileSync(new URL('../apps/web/src/screens/worked-example.json', import.meta.url), 'utf8'),
    );
    const xs = input.plot.vertices.map((v) => Number(v.x));
    const ys = input.plot.vertices.map((v) => Number(v.y));
    const expected = {
      'Plot number': input.plot.plotNumber,
      Community: input.plot.community,
      Width: String(Math.max(...xs) - Math.min(...xs)),
      Depth: String(Math.max(...ys) - Math.min(...ys)),
    };
    for (const [label, want] of Object.entries(expected)) {
      const got = await visitor.getByLabel(new RegExp(`^${label}`, 'i')).first().inputValue();
      if (got !== want) throw new Error(`${label} arrived as "${got}", not "${want}"`);
    }

    // Four edges classified, which is what makes the access recommendation say
    // anything at all. Unclassified, the form refuses to submit and the demo has
    // handed the visitor a dead end with a plot number in it.
    // Counted off the live `value` of each <select>, which is a property and not
    // an attribute: `select[value='']` matches nothing in any browser and would
    // have made this assertion pass by measuring the wrong thing.
    const classified = await visitor.evaluate(() =>
      [...document.querySelectorAll('select')].filter(
        (s) => s.value === 'ROAD' || s.value === 'ADJACENT_PLOT',
      ).length,
    );
    if (classified < input.plot.edges.length) {
      throw new Error(
        `${classified} of ${input.plot.edges.length} edges arrived classified`,
      );
    }

    // And it says where the values came from. A form that arrives filled in with
    // no statement of who filled it is the same defect as a number with no
    // provenance, on a product that exists to refuse exactly that.
    const said = await visitor.textContent('body');
    if (!/worked example/i.test(said)) {
      throw new Error('the demo filled the form in and said nothing about it');
    }

    /*
      AND THEN IT IS RUN, BECAUSE THE CLAIM ON SCREEN IS ABOUT A NUMBER.

      The banner says: leave these as they are and the capacity you get is the
      capacity that page quotes. That is checkable in about four clicks and it
      is the only part of this feature that can fail silently — a demo carrying
      a plot that is nearly right hands a visitor a different governing band
      from the one they read a moment ago, and they would be right to conclude
      the page was decorated.

      Compared against `verified.governingGfaM2` in the same file the landing
      page reads every figure from, so this cannot drift from the page: if the
      engine's answer moves, `pnpm example` rewrites both and both move.
    */
    await visitor.getByRole('button', { name: /^Continue$/ }).click();
    await visitor
      .getByRole('heading', { name: /confirm the plot/i })
      .waitFor({ timeout: wait(10000) });
    await visitor.getByRole('button', { name: /this is the plot/i }).click();
    await visitor
      .getByRole('heading', { name: /does parking count toward far/i })
      .waitFor({ timeout: wait(10000) });

    // Nothing is typed here. Every question this screen asks was answered by
    // the recorded run, which is the whole of what the demo is.
    const compute = visitor.getByRole('button', { name: /compute capacity/i });
    if (await compute.isDisabled()) {
      throw new Error('the demo left a question unanswered on the rules step');
    }
    await compute.click();
    await visitor
      .getByRole('button', { name: /^Capacity$/ })
      .first()
      .click({ timeout: wait(20000) });
    await visitor.locator('.governing__figure').waitFor({ timeout: wait(20000) });

    /*
      COMPARED AT THE PRECISION IT IS DISPLAYED AT, which took one failing run to
      get right and is worth the four lines. The recorded figure is 6774.194; the
      capacity screen sets the governing number at display size and prints
      "6,774.2", while the landing page's expanded hero row prints all three
      decimals. A substring test against the recorded value therefore FAILED on a
      demo that had reproduced the run exactly — the first version of this step
      did, and the honest reading of that failure was that the assertion was
      wrong, not the feature.

      So the on-screen token's own precision decides the comparison. A render hint
      that changes how many decimals are shown does not fail this; a run that
      returns a different number does.
    */
    const shown = (await visitor.locator('.governing__figure').first().textContent())
      .replace(/,/g, '')
      .match(/\d[\d.]*/)?.[0];
    if (!shown) throw new Error('no figure in the governing block');
    const places = (shown.split('.')[1] ?? '').length;
    if (Number(shown).toFixed(places) !== Number(verified.governingGfaM2).toFixed(places)) {
      throw new Error(
        `the demo did not reproduce the page: got ${shown}, the page quotes ${verified.governingGfaM2}`,
      );
    }
  } finally {
    await fresh.close();
  }
});

/**
 * THE OLD ADDRESS, WHICH IS IN A GUIDE THAT HAS ALREADY BEEN HANDED OVER.
 *
 * `/dashboard` became `/readiness`, and a rename without a working redirect is
 * link rot with a good explanation. This is checked in a browser rather than by
 * reading `redirects.json`, because there are two implementations of the same
 * fact — a 301 in `.htaccess` for the live site and a `replaceState` in the router
 * for development — and the failure mode is that one of them is right.
 *
 * THE ADDRESS IS ASSERTED, NOT JUST THE PAGE. Rendering readiness at the old URL
 * would leave the address naming a page the reader is not looking at, and anyone
 * who copied it would pass the dead one on.
 */
await step('a path that moved still arrives, and the address says where it went', async () => {
  const moved = JSON.parse(
    readFileSync(new URL('../apps/web/src/redirects.json', import.meta.url), 'utf8'),
  );
  for (const [from, to] of Object.entries(moved)) {
    await page.goto(new URL(from, BASE).href, { waitUntil: 'domcontentloaded' });
    await page.locator('main').first().waitFor({ timeout: wait(10000) });
    const landed = new URL(page.url()).pathname.replace(/\/+$/, '') || '/';
    if (landed !== to) throw new Error(`${from} landed at ${landed}, not ${to}`);
    const body = await page.textContent('body');
    if (/not here|404/i.test(body ?? '')) throw new Error(`${from} reached the 404 page`);
  }
});
await browser.close();

console.log(`\n${errors.length === 0 ? 'SMOKE PASSED' : `SMOKE FAILED — ${errors.length} problem(s)`}`);
for (const e of errors) console.log('  -', e);
process.exit(errors.length === 0 ? 0 : 1);
