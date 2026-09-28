/**
 * §13.1, MEASURED IN PIXELS.
 *
 * `scripts/contrast.mjs` already governs everything about amber that is knowable
 * from the stylesheet: which selectors may paint it, that it out-contrasts every
 * chrome ink on every ground, and that no other surface in the system is more
 * chromatic. All three are necessary and none of them can see the one thing that
 * decides whether a reader notices an assumption — HOW MUCH OF THE SCREEN IT
 * OCCUPIES, AND WHAT ELSE IS COMPETING WITH IT.
 *
 * That is a browser fact. It is produced by layout, by source order, by a
 * disclosure that starts closed, and by whatever happens to sit above the fold at
 * the viewport a reader actually opens. A stylesheet checker is structurally blind
 * to all four.
 *
 * THE DEFECT THIS EXISTS TO PREVENT HAS ALREADY HAPPENED, TWICE:
 *
 *   1. The landing fold measured 0px2 of amber against 37,738px2 of accent. Every
 *      stylesheet gate was green. The amber callout was real, correctly styled and
 *      correctly whitelisted — and it was inside a `hidden` disclosure panel, so
 *      the first screen of the page that sells traced numbers showed a reader no
 *      assumption at all.
 *   2. Moving it out of the disclosure was not enough either: it landed 51px BELOW
 *      the fold, and then 165px below it at 900. Each intermediate state passed
 *      every check in the repository. Only the measurement said no.
 *
 * So the measurement is a gate rather than a note in a review, for the same reason
 * `verify-worked-example.mjs` is a gate: a constraint that is only ever checked by
 * a person looking at the page is a constraint that survives exactly until the next
 * design pass, and it fails silently when it goes.
 *
 * Run: `pnpm dev` in one terminal, then `pnpm amber`.
 */

import { readFileSync } from 'node:fs';

import { chromium } from '@playwright/test';

/* One route record, read by the router, `smoke.mjs`, `shoot.mjs` and this file. A
   second hand-maintained list of routes is the defect that drifts first. */
const ROUTE_DATA = JSON.parse(
  readFileSync(new URL('../apps/web/src/routes.json', import.meta.url), 'utf8'),
);

const BASE = (process.env.SMOKE_URL ?? 'http://localhost:5173/').replace(/\/$/, '');

/**
 * TWO HEIGHTS, NOT ONE.
 *
 * 1000 is a maximised laptop window; 900 is the same window with a bookmarks bar
 * and a taskbar. The second blocker above passed at 1000 and failed at 900, which
 * is the whole argument for measuring both: the fold is not a number, it is a
 * range, and a constraint that holds only at the taller end holds for roughly half
 * of readers.
 */
const FOLDS = [
  { w: 1440, h: 1000 },
  { w: 1440, h: 900 },
];

/**
 * THE MARGIN, AND WHY IT IS NOT 1.
 *
 * "Amber is the loudest thing on the surface" is the claim. Expressed as area, the
 * bare form of that claim is `amber > accent` — but a page that clears it by 4%
 * has not made the assumption loud, it has made it tie. The recorded state of the
 * landing fold when this gate was written is 86,791px2 amber against 6,241px2
 * accent, a ratio of 13.9. Three leaves a colour pass a great deal of room to use
 * the accent honestly — on a call to action, on a binding limit — while still
 * failing the inversion this is here to catch.
 *
 * The measured ratio is printed on every run whether it passes or not. A drift
 * from 13.9 to 3.2 is a passing run and is also the thing you want to see.
 */
const MIN_RATIO = 3;

/**
 * WHERE AMBER MUST BE PRESENT ABOVE THE FOLD, not merely dominant if present.
 *
 * A page with no amber at all passes a ratio test vacuously, and that is exactly
 * the state the landing page was in. `/` is on this list because it is the page
 * that quotes a governing capacity to someone who has not yet been told what the
 * product refuses to claim; a first screen there with no visible assumption is the
 * product misrepresenting itself, not a styling preference.
 */
const MUST_SHOW_AMBER = ['/'];

const failures = [];
/*
 * NOTED, NOT FAILED — and the distinction is the point.
 *
 * A route whose document holds ASSUMED values but whose first screen shows none is
 * the exact shape of the landing-page blocker. It is NOT automatically a defect
 * elsewhere: a page whose fold is a title and whose figures begin below it has
 * nothing to qualify up there yet, and a gate that demanded amber on every fold
 * would be demanding decoration.
 *
 * So this is reported by name on every run rather than enforced. What makes it
 * safe to report rather than enforce is that the enforced rule sits next to it:
 * where amber IS painted it must lead by `MIN_RATIO`, and on `/` it must be
 * painted at all. A silent count would be worth nothing; a named one is the list a
 * design pass works from.
 */
const notes = [];
const fail = (m) => {
  failures.push(m);
  console.log(`  FAIL ${m}`);
};

// SMOKE_HOST_RULES points a hostname at an address, e.g.
// "MAP tob.khaledahmed.net 84.32.84.123": a release can be checked on the real host
// before its DNS record exists, rather than after a reader has already met it.
const browser = await chromium.launch({
  channel: 'msedge',
  args: process.env.SMOKE_HOST_RULES ? [`--host-resolver-rules=${process.env.SMOKE_HOST_RULES}`] : [],
});

/**
 * ONE CONTEXT FOR THE WHOLE RUN, AND THE HOST'S BROWSER CHECK PASSED ONCE IN IT.
 *
 * This file measured nothing at all against the live site and reported it as 124
 * failures — every route, both themes, both folds, all with the same shape: the
 * document carried no `data-theme` and not one palette token resolved to a colour.
 * None of that was the release. Hostinger's CDN answers an automated browser's
 * first request with its own "Checking your browser" page and lets it through a few
 * seconds later on a cookie, and what this file was measuring was the area of amber
 * on the CDN's interstitial, which is correctly zero.
 *
 * `smoke.mjs` has met this check since the first walk against the live site and
 * passes it the way the host intends — by waiting. It gets away with one wait
 * because it drives ONE page for the entire walk. This file opened
 * `browser.newPage()` per route x theme x fold, and every one of those is a FRESH
 * CONTEXT with its own cookie jar, so each of the forty met the challenge again.
 * They are pages of one context now, the check is passed once before anything is
 * measured, and the pages stay separate so a theme seeded in `localStorage` for one
 * measurement is still overwritten before the next.
 *
 * WHAT WAS NOT DONE: launching a different browser. The bundled Chromium is not
 * challenged and swapping to it would have turned 124 failures green in one line —
 * and quietly changed which engine every local run of this gate measures, which is
 * a worse thing to be wrong about than the thing it fixed.
 *
 * The 403 the check itself logs is the only error not counted, and every
 * measurement below still loads its own route from the server.
 */
const REMOTE = !['localhost', '127.0.0.1'].includes(new URL(BASE).hostname);
const context = await browser.newContext();
if (REMOTE) {
  /* Sized the way `smoke.mjs` sizes its waits: a deployment answers across a CDN
     and a real uplink, and a gate that fails on the uploader's bandwidth reports
     nothing about the release. The assertions do not move; only the patience. */
  context.setDefaultTimeout(180000);
  const warm = await context.newPage();
  await warm.goto(BASE);
  await warm.waitForSelector('#main', { timeout: 120000 });
  await warm.close();
}

/**
 * Resolve the token values in the page, then sum the filled area of every element
 * whose painted background is one of them.
 *
 * `getComputedStyle().backgroundColor` is the honest measure of "filled ground".
 * It is deliberately NOT extended to SVG `fill`: the drawings are the one place
 * where amber and accent are geometry rather than emphasis, and folding a plot
 * outline into the same number would let a wider podium pass this gate. What may
 * paint amber inside a drawing is `contrast.mjs`'s whitelist, and it holds there.
 */
async function measure(page, fold) {
  return page.evaluate((foldPx) => {
    const root = getComputedStyle(document.documentElement);
    const val = (n) => root.getPropertyValue(n).trim().toLowerCase();
    const hex = (c) => {
      const m = /^rgba?\(([^)]+)\)/.exec(c);
      if (!m) return c.trim().toLowerCase();
      const parts = m[1].split(',').map((x) => Number(x.trim()));
      if (parts.length > 3 && parts[3] === 0) return 'transparent';
      return (
        '#' +
        parts
          .slice(0, 3)
          .map((x) => x.toString(16).padStart(2, '0'))
          .join('')
      );
    };

    /*
     * THE TOKEN SETS ARE ENUMERATED FROM THE STYLESHEET, NOT TYPED HERE.
     *
     * They used to be two hand-written arrays, and the hand was already wrong:
     * `--accent-strong` was in the accent list and does not exist in the palette,
     * while `--accent-hover` and `--accent-focus` — both real, both painted — were
     * not. So the probe that decides whether a colour pass ate amber's lead was
     * resolving TWO of the four accent tokens and silently scoring the other two
     * as neutral ground.
     *
     * That is the same defect as a contrast checker measuring a palette it never
     * read, one level out: a list a person maintains does not grow when a colour
     * pass adds `--accent-wash`, and the run stays green because the new fill is
     * counted as nothing. So the sets are read off `document.styleSheets` by
     * PREFIX — every custom property beginning `--uncertain` or `--accent` that
     * resolves to a colour — and the resolved names are printed on every run.
     *
     * The asymmetry is deliberate and it runs AGAINST the claim being made:
     * every accent token counts toward the competition, which can only lower the
     * ratio. Amber's own set is complete for the same reason it must be — an
     * amber fill this probe could not name would be an amber fill §13.1 cannot
     * police — and the per-token breakdown below makes any inflation visible
     * rather than folded into one number.
     */
    const declaredTokens = (prefix) => {
      const found = new Set();
      for (const sheet of document.styleSheets) {
        let rules;
        try {
          rules = sheet.cssRules;
        } catch {
          continue; // cross-origin: the font sheet, which declares no palette
        }
        const walk = (list) => {
          for (const rule of list) {
            if (rule.cssRules) walk(rule.cssRules);
            const style = rule.style;
            if (!style) continue;
            for (const prop of style) {
              if (prop.startsWith(prefix)) found.add(prop);
            }
          }
        };
        walk(rules);
      }
      return [...found].sort();
    };

    const resolve = (names) => {
      const out = new Map();
      const resolved = [];
      const unresolved = [];
      for (const n of names) {
        const v = val(n);
        const h = v ? hex(v) : '';
        /* A token that does not resolve to a colour is NAMED, never dropped. A
           probe that quietly measured nothing is the vacuous pass this repo
           refuses everywhere else. */
        if (/^#[0-9a-f]{6}$/.test(h)) {
          /* Two tokens may share a hex — `--accent-focus` IS `--accent` in both
             themes. Keep the first name so the breakdown reports the canonical
             token rather than whichever alias sorted last; the area is the same
             either way, but a line reading "--accent-focus 6241px2" for a button
             fill invites a reader to go looking for a focus ring. */
          if (!out.has(h)) out.set(h, n);
          resolved.push(n);
        } else {
          unresolved.push(`${n}=${v || '(empty)'}`);
        }
      }
      return { map: out, resolved, unresolved };
    };

    const amberSet = resolve(declaredTokens('--uncertain'));
    const accentSet = resolve(declaredTokens('--accent'));
    const amber = amberSet.map;
    const accent = accentSet.map;

    /*
     * THE PEER GROUNDS — MEASURED AND PRINTED, NEVER GATED.
     *
     * This file's own header says what it exists to see: "HOW MUCH OF THE SCREEN
     * IT OCCUPIES, AND WHAT ELSE IS COMPETING WITH IT." It then measured amber
     * against the chrome blue and nothing else, so "what else" was answered with
     * one of four candidates. On /dashboard that is not a rounding error: the
     * fold carries two --variance-surface tiles and a --variance-border banner,
     * and the run printed `amber 0px2  accent 4545px2` over them.
     *
     * They are NOT added to the ratio, and the reason is written down rather than
     * assumed. design-language §3.3 scopes the rank assertion to chrome
     * (--accent, --accent-focus) and excludes the provenance peers BY NAME,
     * because forcing amber above --variance would mean softening the token that
     * paints NEVER CLAIMED and REGULATORY VALIDITY — NOT ASSESSED. §2.1 records
     * that trade being attempted and rejected. A gate that ranked amber over
     * variance would be that same softening arrived at from the third side.
     *
     * So they are evidence, not a threshold: a reader of this run can see what
     * shares the fold with an assumption, and nothing here can be satisfied by
     * dimming a refusal.
     */
    const peerSet = resolve([
      '--variance-surface',
      '--derived-surface',
      '--deferred-surface',
    ]);
    const peer = peerSet.map;

    let amberArea = 0;
    let accentArea = 0;
    let peerArea = 0;
    const amberHits = [];
    /* Per-token area, so "amber gained" can be read as WHICH amber gained. */
    const byToken = {};
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.top >= foldPx || r.width === 0 || r.height === 0 || r.bottom <= 0) continue;
      const bg = hex(getComputedStyle(el).backgroundColor);
      if (bg === 'transparent') continue;
      const visible = r.width * (Math.min(r.bottom, foldPx) - Math.max(r.top, 0));
      const token = amber.get(bg) ?? accent.get(bg) ?? peer.get(bg);
      if (token) byToken[token] = Math.round((byToken[token] ?? 0) + visible);
      if (peer.has(bg)) peerArea += visible;
      if (amber.has(bg)) {
        amberArea += visible;
        amberHits.push(
          `${el.tagName.toLowerCase()}.${String(el.className).split(/\s+/)[0] || '(none)'} ` +
            `${Math.round(r.width)}x${Math.round(r.height)} @y=${Math.round(r.top)} ` +
            `[${amber.get(bg)}]`,
        );
      } else if (accent.has(bg)) {
        accentArea += visible;
      }
    }
    return {
      amberArea: Math.round(amberArea),
      accentArea: Math.round(accentArea),
      peerArea: Math.round(peerArea),
      amberHits: amberHits.slice(0, 4),
      byToken,
      amberTokens: amberSet.resolved,
      accentTokens: accentSet.resolved,
      unresolvedTokens: [
        ...amberSet.unresolved,
        ...accentSet.unresolved,
        ...peerSet.unresolved,
      ],
      /* Resolution is reported so an unresolvable token cannot look like a zero.
         `contrast.mjs` treats an unmeasurable pair as a failure rather than a skip;
         a probe that silently measured nothing is the same vacuous pass. */
      amberTokensResolved: amber.size,
      accentTokensResolved: accent.size,
      /* Does the DOCUMENT hold an assumption at all? A page with none legitimately
         shows none above the fold; a page with several and none visible is the
         defect. */
      assumedInDocument: document.querySelectorAll('[data-state="assumed"]').length,
    };
  }, fold);
}

/* The routes a reader can reach without entering a name. `/app` is included: it
   renders the antechamber, which is a public screen. */
const routes = ROUTE_DATA.map((r) => r.path);
let announcedTokens = false;

/**
 * BOTH THEMES, BECAUSE §13.1 IS NOT SCOPED TO ONE.
 *
 * The probe only ever loaded the default, and the default is light: `index.html`
 * sets `data-theme="light"` on the element and consults `prefers-color-scheme`
 * DELIBERATELY NOT — the theme is read from `localStorage`. So passing
 * `colorScheme: 'dark'` to a Playwright context produces a byte-identical light
 * page, which is the version of this measurement that looks like it covered dark
 * and did not. The theme is seeded the way a reader sets it, and the applied
 * value is read back off the element before anything is measured.
 *
 * Layout is theme-independent, so the AREAS are expected to match. That is the
 * point: it is an expectation nothing was checking, and a component that swaps
 * its ground by theme — an amber block that goes neutral in dark, a plate that
 * picks up --accent-subtle — would move them and nobody would know.
 */
const THEMES = ['light', 'dark'];

for (const route of routes) {
 for (const theme of THEMES) {
  for (const { w, h } of FOLDS) {
    const page = await context.newPage();
    await page.setViewportSize({ width: w, height: h });
    const label = `${route} @ ${w}x${h} ${theme}`;
    try {
      await page.addInitScript((t) => {
        try {
          localStorage.setItem('envelope.theme', t);
        } catch (e) {
          /* blocked storage; the read-back below is what catches it */
        }
      }, theme);
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
      /* `networkidle` says the transfers stopped, not that the application
         mounted — and the theme attribute and every palette token are written by
         the application. Against a deployment the two are far enough apart to
         measure an empty document and call it zero amber. */
      await page.waitForSelector('#main', { timeout: REMOTE ? 120000 : 15000 });
      const applied = await page.getAttribute('html', 'data-theme');
      if (applied !== theme) {
        fail(
          `${label}: asked for ${theme}, the document is ${applied}. A theme that ` +
            `did not apply measures the other one twice.`,
        );
      }
      /*
       * WAIT FOR THE FACES, OR MEASURE A DIFFERENT PAGE EACH RUN.
       *
       * `networkidle` is not enough. IBM Plex is loaded `display=swap` over the
       * system stack (a deliberate choice — the site is opened on a plot with no
       * wifi), so a fold measured before the swap is a fold laid out in the
       * fallback metrics. Measured here, that moved the amber callout by ~24px
       * between runs and the reported area between 94,390 and 104,142px2 for an
       * unchanged page: a 10% swing in the number that arbitrates §13.1.
       *
       * A gate whose reading depends on when the fonts happened to land is a gate
       * that can be re-rolled until it is green, which is the same worthlessness
       * as a threshold nobody meets. So the probe waits for the real metrics.
       */
      await page.evaluate(() => document.fonts.ready);
      const m = await measure(page, h);

      if (m.amberTokensResolved === 0 || m.accentTokensResolved === 0) {
        fail(
          `${label}: resolved ${m.amberTokensResolved} amber and ` +
            `${m.accentTokensResolved} accent tokens. A probe that measured nothing ` +
            `is not a pass.`,
        );
      }

      if (!announcedTokens) {
        announcedTokens = true;
        console.log(
          `  tokens: amber [${m.amberTokens.join(' ')}]  ` +
            `accent [${m.accentTokens.join(' ')}]`,
        );
      }

      const ratio = m.accentArea === 0 ? Infinity : m.amberArea / m.accentArea;
      const shown = m.accentArea === 0 ? 'no accent' : `${ratio.toFixed(1)}x`;
      console.log(
        `  ${route.padEnd(11)} ${theme.padEnd(5)} ${w}x${h}  ` +
          `amber ${String(m.amberArea).padStart(7)}px2  ` +
          `accent ${String(m.accentArea).padStart(6)}px2  ${shown.padEnd(9)}` +
          `peer ${String(m.peerArea).padStart(6)}px2` +
          `  (${m.assumedInDocument} assumed in document)`,
      );
      for (const hit of m.amberHits) console.log(`               ${hit}`);
      const breakdown = Object.entries(m.byToken)
        .sort((a, b) => b[1] - a[1])
        .map(([t, a]) => `${t} ${a}px2`)
        .join('  ');
      if (breakdown) console.log(`               by token: ${breakdown}`);
      /* An unresolvable token is NAMED. contrast.mjs counts an unresolvable pair
         as a failure rather than a skip, and a probe that scored a real fill as
         neutral ground because its token did not parse is the same hole. */
      if (m.unresolvedTokens.length > 0) {
        fail(
          `${label}: ${m.unresolvedTokens.length} palette token(s) did not resolve ` +
            `to a colour and were scored as neutral ground: ` +
            `${m.unresolvedTokens.join(', ')}.`,
        );
      }

      if (m.amberArea === 0 && m.assumedInDocument > 0) {
        notes.push(
          `${label}: ${m.assumedInDocument} assumed value(s) in the document, none of ` +
            `them visible on the first screen.`,
        );
      }

      if (MUST_SHOW_AMBER.includes(route) && m.amberArea === 0) {
        fail(
          `${label}: 0px2 of amber above the fold. This route must show an ` +
            `assumption on its first screen — see the two blockers in this file's ` +
            `header, both of which were green everywhere else.`,
        );
      }
      if (m.amberArea > 0 && ratio < MIN_RATIO) {
        fail(
          `${label}: amber ${m.amberArea}px2 against accent ${m.accentArea}px2 is ` +
            `${ratio.toFixed(2)}x, under the ${MIN_RATIO}x margin. Amber is no longer ` +
            `the loudest thing on this surface. Move the accent, do not dim the amber ` +
            `— §13.1 calls this "the most important UI decision in the product".`,
        );
      }
    } catch (e) {
      fail(`${label}: ${String(e).split('\n')[0]}`);
    } finally {
      await page.close();
    }
  }
 }
}

await context.close();
await browser.close();

if (notes.length > 0) {
  console.log('\nNOTED — assumptions the first screen does not show:');
  for (const n of notes) console.log(`  note ${n}`);
}

if (failures.length > 0) {
  console.log(`\n${failures.length} failure(s).`);
  process.exit(1);
}
console.log(
  `\nAmber leads every fold it appears on, across ${routes.length} routes x ${FOLDS.length} folds x ${THEMES.length} themes.`,
);
