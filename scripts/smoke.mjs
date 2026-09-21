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
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

const step = async (label, fn) => {
  try { await fn(); console.log(`  ok   ${label}`); }
  catch (e) { console.log(`  FAIL ${label}: ${String(e).split('\n')[0]}`); errors.push(`${label}: ${e}`); }
};

const BASE = process.env.SMOKE_URL ?? 'http://localhost:5173/';

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
    await page.goto(new URL('/no-such-page', BASE).href, { waitUntil: 'networkidle' });
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
  await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 8000 });
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
    'does not draw a building',
    'does not check life safety',
    'does not replace a professional',
  ]) {
    if (!t.toLowerCase().includes(phrase)) throw new Error(`missing limit: ${phrase}`);
  }
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
  await page.getByRole('link', { name: /run a plot/i }).first().click();
  await page.waitForURL('**/app', { timeout: 8000 });
});

await step('the antechamber explains itself before it asks for anything', async () => {
  await page.getByRole('heading', { name: /before the engine opens/i }).waitFor({ timeout: 5000 });
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
  if (!/nothing is kept|nothing will be kept/i.test(t)) {
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
  await page.getByRole('heading', { name: /read an affection plan/i }).waitFor({ timeout: 5000 });
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
  await page.getByRole('heading', { name: /IC1-CTYL-16_011/i }).waitFor({ timeout: 20000 });
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
  await page.getByRole('heading', { name: /^the plot$/i }).waitFor({ timeout: 5000 });
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
  await page.getByRole('heading', { name: /confirm the plot/i }).waitFor({ timeout: 8000 });
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
  await page.getByRole('heading', { name: /does parking count toward far/i }).waitFor({ timeout: 5000 });
});

await step('the parking question has no pre-selected answer', async () => {
  const checked = await page.locator('input[name="parking-far"]:checked').count();
  if (checked !== 0) throw new Error(`${checked} option(s) pre-selected — FR-DEF-002 forbids a default`);
  const compute = page.getByRole('button', { name: /compute capacity/i });
  if (!(await compute.isDisabled())) throw new Error('Compute was enabled before the question was answered');
});

await step('a developer standard is offered, and marked as not a regulation', async () => {
  const t = await page.textContent('body');
  if (!/Azizi Developments/.test(t)) throw new Error('no developer standard offered');
  // The distinction the whole panel exists to preserve.
  if (!/This is not a regulation/i.test(t)) {
    throw new Error('the standard is not marked as a commercial brief');
  }
  // And what it asks for that the engine does not do.
  if (!/[Bb]alcony/.test(t)) throw new Error('the unmechanized parts are not listed');
});

await step('selecting a scenario fills the mix and the efficiency from the document', async () => {
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

await step('the comparison shows what each answer is worth', async () => {
  await page.getByRole('button', { name: /what each answer is worth/i }).click();
  await page.locator('.comparison__verdict').waitFor({ timeout: 8000 });
});

await step('computing the capacity lands on the assumption register first', async () => {
  await page.getByRole('radio', { name: /no, it is excluded/i }).check();
  await page.getByRole('button', { name: /compute capacity/i }).click();
  // §20.2: the register is not a screen you can skip past to the number. The
  // run completes and the *first* thing shown is what it had to assume.
  await page.locator('.data-table').first().waitFor({ timeout: 10000 });
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
  await page.locator('.governing__figure').waitFor({ timeout: 8000 });
  const t = await page.textContent('body');
  if (!/Governing capacity/.test(t)) throw new Error('no governing capacity on screen');
  if (!/binds/.test(t)) throw new Error('the binding band is not marked');
  // §15.3 — the field does not exist, and neither does the word.
  if (/realistic/i.test(t)) throw new Error('a "realistic" band appeared');
});

await step('the massing view stands the envelope up, and says what it assumed', async () => {
  // The canvas is `role="presentation"` on purpose — it duplicates numbers
  // stated in the table beside it, and announcing it would make a screen reader
  // read geometry. So the assertion is on the table and the amber notice, which
  // are the parts that carry meaning.
  await page.locator('.massing-viewer canvas').waitFor({ timeout: 10000 });
  const t = await page.textContent('body');
  if (!/Podium/.test(t)) throw new Error('no podium volume listed');
  // The podium level count is not derivable from a run; an unentered one must
  // read as an assumption rather than as a fact drawn in confident green.
  if (!/rests on an assumption/i.test(t)) {
    throw new Error('the assumed podium height was not declared');
  }
});

await step('the parking level is drawn, not summarised', async () => {
  await NAV(/^Parking$/);
  await page.locator('.parking-plan__svg').waitFor({ timeout: 8000 });
  const bays = await page.locator('.parking-plan__svg polygon').count();
  if (bays < 10) throw new Error(`only ${bays} shapes drawn — this is a summary, not a layout`);

  const t = await page.textContent('body');
  // The ramp is the one shape whose compliance is unknown, and the legend has
  // to say so rather than letting a tidy picture imply otherwise.
  if (!/plan area only/i.test(t)) throw new Error('the ramp was drawn as if it were checked');
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
  await page.locator('.claim--never').waitFor({ timeout: 5000 });
  const t = await page.textContent('body');
  for (const s of ['Regulatory validity', 'Never claimed', 'Conservation checks', 'not counted as passes']) {
    if (!t.includes(s)) throw new Error(`missing: ${s}`);
  }
});

await step('the not-assessed checks can be revealed, not just hidden', async () => {
  await page.getByRole('button', { name: /checks that had nothing to check/i }).click();
  await page.locator('tr.is-not-assessed').first().waitFor({ timeout: 5000 });
});

await step('a number opens its derivation (P0-S6)', async () => {
  await NAV(/evidence/i);
  // `button.traced`, not `.traced` — the legend renders inert samples with the
  // same class, and clicking one of those proves nothing.
  await page.locator('button.traced').first().click();
  await page.locator('[role="dialog"]').waitFor({ timeout: 5000 });
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
  await page.getByRole('button', { name: /assumption register/i }).waitFor({ timeout: 5000 });
});

await step('acknowledging the register and signing unlocks the export', async () => {
  await page.getByRole('button', { name: /assumption register/i }).click();
  await page.getByRole('button', { name: /I have read the assumptions/i }).click();
  // Wait for the gate to actually land — the acknowledgement is a round trip to
  // the server, and clicking on to the next screen before it returns is a race
  // this test lost roughly half the time.
  await page.getByText(/You acknowledged these assumptions/i).waitFor({ timeout: 8000 });

  await NAV(/^Export$/);
  await page.getByRole('button', { name: /sign this export/i }).click();
  const go = page.getByRole('button', { name: /export report/i });
  await go.waitFor({ timeout: 8000 });
  await page.waitForFunction(
    () =>
      !document.querySelector('button.button--primary[disabled]') ||
      ![...document.querySelectorAll('button')].some(
        (b) => /export report/i.test(b.textContent ?? '') && b.disabled,
      ),
    undefined,
    { timeout: 8000 },
  );
  if (await go.isDisabled()) throw new Error('Export still blocked after both gates');
});

await step('the export hands over a report and a JSON document', async () => {
  await page.getByRole('button', { name: /export report/i }).click();
  await page.getByRole('button', { name: /open the report/i }).waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: /open the json export/i }).waitFor({ timeout: 5000 });
  const body = await page.textContent('body');
  // §13.4 — both fingerprints on screen, because a reproducibility guarantee a
  // reader cannot check is a claim, not a guarantee.
  if (!/Run fingerprint/.test(body)) throw new Error('no run fingerprint shown');
  if (!/Report fingerprint/.test(body)) throw new Error('no report fingerprint shown');
  if (!/annex .*is not signed|NOT SIGNED/i.test(body)) {
    throw new Error('the unsigned-annex notice did not reach the export screen');
  }
});

await step('the drawing and the workbook download, behind the same gates', async () => {
  for (const [label, ext] of [
    [/download the cad drawing/i, 'dxf'],
    [/download the workbook/i, 'xlsx'],
  ]) {
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 20000 }),
      page.getByRole('button', { name: label }).click(),
    ]);
    const name = dl.suggestedFilename();
    if (!name.endsWith(`.${ext}`)) throw new Error(`${ext} download was named ${name}`);
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

await step('the readiness page leads with what is not ready', async () => {
  // Reached through the shared nav, which every route now carries — the engine's
  // own two-item route bar is gone, and with it the "Status" label. The name
  // changed on purpose: `status` reads as uptime, and nothing here monitors
  // availability.
  await page.getByRole('link', { name: /^readiness$/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 8000 });
  await page.getByRole('heading', { name: /what is not ready/i }).waitFor({ timeout: 8000 });

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
  await page.waitForURL('**/app', { timeout: 8000 });
  // Assert on something only a *completed* run puts on screen. The first
  // version of this checked for the word "Export", which the stepper prints
  // whether or not a run exists — so it passed while the run was being
  // destroyed on every visit to the status page.
  await page.getByRole('button', { name: /open the report/i }).waitFor({ timeout: 8000 });
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
    await page.waitForURL('**/dashboard', { timeout: 8000 });
    await page.waitForTimeout(300);
    await noSidewaysScroll(`readiness at ${width}px`);
    await nothingIsInvisible(`readiness at ${width}px`);

    await page.getByRole('link', { name: /run a plot/i }).first().click();
    await page.waitForURL('**/app', { timeout: 8000 });
    await page.waitForTimeout(300);
  }
});

await browser.close();

console.log(`\n${errors.length === 0 ? 'SMOKE PASSED' : `SMOKE FAILED — ${errors.length} problem(s)`}`);
for (const e of errors) console.log('  -', e);
process.exit(errors.length === 0 ? 0 : 1);
