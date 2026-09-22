/**
 * WCAG 2.2 contrast, measured over the design tokens as written.
 *
 * §13.1 calls the amber ASSUMED treatment "the most important UI decision in
 * the product" and this repo forbids softening it for aesthetics. That rule
 * cuts both ways: a treatment that is loud but unreadable is not a treatment, so
 * the pairs below are measured rather than trusted, in both themes, and the
 * script exits non-zero when one fails.
 *
 * It parses `tokens.css` rather than taking a hand-copied palette, because a
 * palette copied into a checker is a palette that stops matching the one that
 * ships.
 *
 * Run: `node scripts/contrast.mjs`
 */

import { readdirSync, readFileSync } from 'node:fs';

/**
 * The stylesheet, with comments stripped before anything else looks at it.
 *
 * This is not tidiness. Every scan below is a text search over the source, and a
 * comment is text: the sentence documenting the `@media print` merge bug put the
 * literal characters `@media print` at line 138, inside the light `:root` block.
 * The at-rule screen found *that*, brace-matched from a position with no block to
 * match, ate the rest of the light palette and swallowed `:root[data-theme='dark']`
 * into LIGHT — so the checker measured the dark palette twice and reported
 * "56 pass, 0 fail" over a light theme it had never resolved.
 *
 * That is the third time this file has produced a vacuous pass, each time because
 * a scan matched something that was not a rule. Comments come out first now, so
 * prose about CSS can never again be read as CSS.
 */
const CSS = readFileSync(
  new URL('../apps/web/src/styles/tokens.css', import.meta.url),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '');

/** Pull one `:root`-ish block's custom properties out of `src`. */
function blockAt(start, src = CSS) {
  let depth = 0;
  let i = src.indexOf('{', start);
  const from = i;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) break;
  }
  const out = {};
  for (const m of src.slice(from, i).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

/**
 * Where every `@media` block starts and ends, as [open, close] index pairs.
 *
 * At-rules are located by RANGE, not by truncating the source at the first
 * `@media` and brace-matching from there. The difference is the whole history of
 * this file: truncation cannot express "this `:root` is inside that block", so a
 * `:root` selector could only be screened by deleting the text around it — and
 * one mis-anchored delete took the light palette with it. A range lets a
 * position be TESTED for containment, which is a question with an answer rather
 * than an edit with a side effect.
 */
function atRuleRanges(src) {
  const out = [];
  for (const m of src.matchAll(/@media[^{]*\{/g)) {
    let depth = 0;
    let j = src.indexOf('{', m.index);
    for (; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}' && --depth === 0) break;
    }
    out.push([m.index, j]);
  }
  return out;
}

const AT = atRuleRanges(CSS);
const insideAtRule = (i) => AT.some(([a, b]) => i > a && i < b);

function mergeAll(pattern, src = CSS) {
  const out = {};
  for (const m of src.matchAll(pattern)) Object.assign(out, blockAt(m.index, src));
  return out;
}

/**
 * LIGHT — every top-level `:root` that is not inside an at-rule.
 *
 * The palette is spread across more than one block (scale first, then colour),
 * so every one is merged rather than only the first.
 */
const LIGHT = {};
for (const m of CSS.matchAll(/:root\s*\{/g)) {
  if (!insideAtRule(m.index)) Object.assign(LIGHT, blockAt(m.index, CSS));
}

/**
 * DARK — the explicit `[data-theme='dark']` selector, not the media query.
 *
 * It is the one a theme toggle actually applies, and `apps/web/test/tokens.test.ts`
 * is what keeps the two blocks identical. Reading the media query here and the
 * attribute selector there would mean neither is checked against the other.
 */
const darkAt = /:root\[data-theme=['"]dark['"]\]\s*\{/.exec(CSS);
if (!darkAt) throw new Error("no :root[data-theme='dark'] block in tokens.css");
const DARK = { ...LIGHT, ...blockAt(darkAt.index, CSS) };

/**
 * PRINT — a third measured theme.
 *
 * CLAUDE.md says these reports are printed and carried into rooms, which makes
 * paper the medium with the highest stakes and, until this landed, the only one
 * with no gate.
 *
 * It spreads LIGHT deliberately, and that is design-language §3.0's own code:
 * `@media print` overrides a subset and every other token keeps its screen value
 * while sitting on white paper. §2.3 is explicit that `--accent`, `--uncertain`,
 * `--uncertain-strong`, `--uncertain-border`, `--variance`, `--variance-border`
 * and `--derived` are NOT overridden in print — collapsing the provenance inks to
 * black would delete the provenance system in the medium that matters most — so a
 * PRINT palette resolved from the print block ALONE would report those seven as
 * unresolvable and could never be made green without the very collapse §2.3
 * forbids. Inheritance is the design, not a shortcut.
 */
const printRange = AT.find(([a]) => /@media\s+print/.test(CSS.slice(a, a + 20)));
if (!printRange) throw new Error('no @media print block in tokens.css');
const PRINT = { ...LIGHT, ...blockAt(CSS.indexOf(':root', printRange[0]), CSS) };

const THEMES = [
  ['light', LIGHT],
  ['dark', DARK],
  ['print', PRINT],
];

/**
 * The self-test, and it is not optional.
 *
 * Every bug this file has shipped was invisible because nothing asserted that the
 * palettes DIFFER. A parser that silently returns the same palette twice is worse
 * than no parser: it produces a green summary over a theme it never read, which is
 * the vacuous pass this codebase refuses everywhere else.
 */
for (const [a, b] of [['light', 'dark'], ['light', 'print'], ['dark', 'print']]) {
  const A = THEMES.find((t) => t[0] === a)[1];
  const B = THEMES.find((t) => t[0] === b)[1];
  if (A['--surface-base'] === B['--surface-base'] && A['--text-primary'] === B['--text-primary']) {
    throw new Error(`${a} and ${b} resolved to the same palette — the extractor is broken.`);
  }
}


function resolve(theme, value, seen = 0) {
  if (seen > 10) throw new Error(`token cycle at ${value}`);
  const ref = /^var\((--[\w-]+)\)$/.exec(value.trim());
  if (ref) return resolve(theme, theme[ref[1]] ?? '', seen + 1);
  return value.trim();
}

function rgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

const channel = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

function luminance([r, g, b]) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/* -------------------------------------------------------------------------
 * THE WCAG LANE
 * ---------------------------------------------------------------------- */

/**
 * THE NINE GROUNDS. Every surface anything in this language is painted ON.
 *
 * This array is the definition of the phrase "nine grounds" wherever the design
 * language uses it; there is no second list and no prose count. The rule it
 * exists to discharge is that a token is measured on every ground it CAN be
 * painted on, not on the ground it was designed against — which is how
 * --text-tertiary shipped tuned to 4.55 on one surface and failing 1.4.3 on four
 * others, and how the shipped 28-pair list came back green over the two grounds
 * (--surface-sunken, --surface-inset) it never looked at.
 *
 * --surface-contrast is deliberately NOT here, and the numbers are the reason
 * rather than an oversight: on the inverted band in light, --uncertain measures
 * 2.58 against --accent's 3.12, so the amber loses and assertAmberOutranksChrome
 * would fail there. The exclusion is safe only because it is ENFORCED —
 * assertNoChromeOnBand below keeps every state and chrome ink off the band — and
 * an exclusion resting on "nothing is painted there" is worth exactly as much as
 * the check that nothing is.
 *
 * --accent and --accent-hover are not here either: they are FILLS under a label,
 * not page grounds, and their one pair each is pushed explicitly below.
 */
const GROUNDS = [
  '--surface-raised',
  '--surface-base',
  '--surface-sunken',
  '--surface-inset',
  '--uncertain-surface',
  '--accent-subtle',
  '--variance-surface',
  '--derived-surface',
  '--deferred-surface',
];

/**
 * [foreground, floor, note, grounds?]
 *
 * `grounds` defaults to all nine. Passing a subset is permitted ONLY with the
 * reason in the note, and the excluded pairs are printed by the runner under
 * "recorded exclusions" with their measured ratios — an omission a reader cannot
 * see is how a checker comes back green over a palette it never read.
 */
const INKS = [
  // --- Text. --surface-sunken was a ground 24 times across the stylesheets and
  // appeared in zero measured pairs; it is the ground of `.governing`.
  ['--text-primary', 4.5, 'body text'],
  ['--text-secondary', 4.5, 'prose, help text, chip labels'],
  ['--text-tertiary', 4.5, 'column headers, eyebrows, the labels around the answer'],

  // --- The one blue. Interactive affordance and nothing else. Declared at 4.5
  // and not 3.0: --accent is also the DERIVED citation superscript, which is
  // 0.7em TEXT. The old list called it a graphic, so a palette nudge holding it
  // above 3.0 would have passed the gate while breaking a numeral.
  ['--accent', 4.5, 'links, the binds tag, the citation superscript'],
  ['--accent-focus', 3.0, 'the focus outline — a graphic, 1.4.11 and 2.4.11'],

  // --- ASSUMED. The product's whole trust proposition.
  ['--uncertain', 4.5, 'the drawn pencil, the rail, the meter fill'],
  ['--uncertain-strong', 4.5, 'ASSUMED value text and the margin tally'],
  ['--uncertain-border', 3.0, 'the dotted underline and the hover ring'],

  // --- The other three provenance states.
  ['--derived', 4.5, 'DERIVED value text and chip'],
  ['--variance', 4.5, 'NEVER CLAIMED text, the rail, the masthead validity strip'],
  ['--variance-border', 3.0, 'the VARIANCE frame — §20.3 is "red BORDER", so this is half the spec'],
  // NOT ASSESSED text brings its own ground: a deferred component always sets
  // --state-surface to --deferred-surface, so it is never painted on an inset or
  // on the amber ground. Both excluded pairs are under 4.5 and both are PRINTED
  // by the runner rather than quietly dropped — see EXCLUDED.
  [
    '--deferred',
    4.5,
    'not-assessed text; brings its own ground',
    ['--surface-raised', '--surface-base', '--surface-sunken', '--deferred-surface'],
  ],
  ['--deferred-hatch', 3.0, 'the hatch — the sole surviving cue on a photocopy'],

  // --- Boundaries, split by JOB rather than by weight.
  ['--border-control', 3.0, 'input, button, radio card, the dashed dropzone and .not-assessed edges'],
  ['--border-strong', 3.0, 'the datum rule, the plate cap, the meter, the neutral rail, the header rule'],

  // --- The primary action (direction.md §3). A filled control has no border of its
  // own to measure: its FILL is the boundary 1.4.11 asks about, so the fill is held
  // to 3:1 against every ground it can stand on, like any other control edge.
  ['--action', 3.0, "the primary button's fill, which is its own boundary"],
];

const PAIRS = INKS.flatMap(([fg, floor, note, grounds = GROUNDS]) =>
  grounds.map((bg) => [fg, bg, floor, note]),
);

// Grounds that are not page surfaces: two fills under a label, and the one
// inverted band. Pushed explicitly so GROUNDS stays the list of SURFACES.
//
// site-map §6.3 asks for two further pairs by name — `--text-primary` on
// `--deferred-surface` at 4.5 (the recoloured readiness tile) and
// `--border-strong` on `--surface-raised` at 3.0 (the recoloured `.lp-verdict`
// rule). Both are already generated above, because `--deferred-surface` is one
// of the nine grounds and `--border-strong` is measured on all nine. Adding them
// again would be a second row for one measurement.
PAIRS.push(
  ['--text-on-action', '--action', 4.5, 'primary button label'],
  ['--text-on-action', '--action-hover', 4.5, 'primary button label under the pointer'],
  // The blue fill survives where it marks a STATE rather than an action: the
  // current step's numeral and the binding band's letter.
  ['--text-inverse', '--accent', 4.5, 'the current step and the binding band letter'],
  ['--text-inverse', '--accent-hover', 4.5, 'the same, under the pointer'],
  ['--text-on-contrast', '--surface-contrast', 4.5, 'text on the band'],
  ['--text-on-contrast-dim', '--surface-contrast', 4.5, 'body text on the band'],
  ['--border-on-contrast', '--surface-contrast', 3.0, 'control edge on the band'],
);

/**
 * RECORDED EXCLUSIONS. Printed on every run, in their own block, so a pair that
 * is out of the lane is visible rather than absent.
 *
 * Both are --deferred on a ground it is not painted on, and both would FAIL. If a
 * future pattern ever puts NOT ASSESSED text on an inset or inside an assumed
 * block, --deferred has to move BEFORE that pattern lands — which is the whole
 * reason these are printed with their ratios instead of being left off the list.
 */
const EXCLUDED = [
  ['--deferred', '--surface-inset', 4.5, 'NOT ASSESSED text never sits on an inset'],
  ['--deferred', '--uncertain-surface', 4.5, 'NOT ASSESSED text never sits on the amber ground'],
];

/* -------------------------------------------------------------------------
 * THE HOUSE LANE — a design contract, never a conformance claim
 * ---------------------------------------------------------------------- */

/**
 * House rows record a design contract — "a plate must have a visible edge" — and
 * are NEVER a WCAG claim. They print under their own heading and the verdict word
 * is `held`, never `pass`.
 *
 * The obvious objection is that a second lane is a place to park failures. It is
 * closed structurally by the both-lanes guard below: a FOREGROUND token is either
 * informative (and lives in PAIRS) or decorative (and lives here), never both, so
 * no pair can be demoted out of the WCAG lane to make a build green.
 *
 * Floors are [light, dark, print]. `null` means the pair DOES NOT EXIST in that
 * theme, and every null carries `dischargedBy` — the row that does the same job
 * there. A null with no discharge is rejected by the runner: "not applicable" is
 * a claim, and this repo makes claims checkable.
 *
 * And it runs in all three themes. Print is where these two border tokens matter
 * most: the print theme gives them values (#a0a0a0 and #c8c8c8) that exist in no
 * other theme, so the theme in which they are new was the only one measuring
 * nothing.
 */
const HOUSE_PAIRS = [
  ['--border-subtle', '--surface-raised', [1.3, 1.28, 1.6], 'interior rule inside a plate'],
  ['--border-subtle', '--surface-base', [1.24, 1.4, 1.6], 'interior rule on the page'],
  ['--border-default', '--surface-raised', [1.56, 1.6, 2.4], 'the plate edge'],
  ['--border-default', '--surface-base', [1.48, 1.8, 2.4], 'plate edge against the page'],
  ['--border-default', '--surface-sunken', [1.4, 1.95, 2.4], 'plate edge on a zoned section'],

  /*
   * THE SURFACE LADDER, AND ITS FLOORS ARE NOW CONTRACTS RATHER THAN RECORDS.
   *
   * The light card lift used to be declared at 1.03 and measured 1.04 — a floor
   * set to whatever the token already did, which cannot fail and therefore
   * cannot catch anything. Three near-identical off-whites covered 85% of the
   * landing fold, so the reader did not perceive a surface ladder at all; they
   * perceived one flat white page, which is what the client saw and said.
   *
   * The neutrals are now pitched as an EVEN ladder — about 6% of luminance per
   * rung in light — and each rung carries more chroma than the one above it, so
   * two grounds differ in temperature as well as in lightness. These floors sit
   * just under the measured value on purpose: the next person who nudges a
   * surface has to argue for flattening the ladder, rather than the ladder going
   * flat and nobody finding out.
   *
   * Two rungs still go flat on paper BY DESIGN — base, raised and sunken all
   * print #ffffff, because a tinted plate on paper is a grey smudge. The third
   * does NOT: --surface-inset keeps a 7% tint, so it is measured in print like
   * any other row. "In print the ladder collapses to 1.00" is true of two rungs
   * out of three, and the one it is false of is the meter track — the object the
   * rung exists for.
   */
  [
    '--surface-raised',
    '--surface-base',
    [1.06, 1.13, null],
    'the card lift',
    { dischargedBy: ['--border-default', '--surface-raised'] },
  ],
  ['--surface-inset', '--surface-raised', [1.18, 1.18, 1.15], 'the meter track in its plate'],
  [
    '--surface-sunken',
    '--surface-base',
    [1.06, 1.08, null],
    'a zoned section against the page',
    { dischargedBy: ['--border-default', '--surface-sunken'] },
  ],
  // The fourth rung, and it was never measured: a meter track, a chip or a
  // hovered value inside a ZONED section sits on sunken and not on raised, and
  // the rung that carries it there is the one the ladder never declared.
  ['--surface-inset', '--surface-sunken', [1.05, 1.4, 1.15], 'the meter track in a zoned section'],

  /*
   * THE INVERTED BAND AGAINST THE PAGE.
   *
   * --surface-contrast is the tenth surface and is excluded from GROUNDS by name
   * (see assertNoChromeOnBand). That exclusion governs what may be painted ON
   * the band; it says nothing about whether the band can be SEEN, and the band
   * is the strongest chapter break this language owns. In dark the page is
   * already near-black, so this is the row that stops the band quietly becoming
   * the same colour as the section above it. In print the band inverts back to
   * white to save a page of toner, so the pair does not exist there and its job
   * is done by the band's own control rule — a measured WCAG row, named below.
   */
  [
    '--surface-contrast',
    '--surface-base',
    [12.0, 1.14, null],
    'the inverted band against the page',
    { dischargedBy: ['--border-on-contrast', '--surface-contrast'] },
  ],

  /*
   * THE AMBER GROUND AGAINST THE PAGE, and this row exists because of what the
   * colour pass did to the page.
   *
   * --uncertain-surface is the only COLOURED surface in the language and its
   * loudness at page scale is that filled ground. Deepening the page moves the
   * page TOWARDS the amber fill in luminance — 1.06 to 1.04 — and that is a debt
   * to declare rather than to discover. It is paid in HUE: the neutrals are now
   * cool (blue-grey, chroma 7-12) and the amber ground is warm (chroma 29), so
   * the two are opposed in temperature instead of being two tints of one warm
   * white, and the amber gains against the page by more than it lost.
   * assertAmberSurfaceMostChromatic measures the opposition; this row measures
   * what remains of the luminance separation, so a later ground edit cannot
   * close the last of it in silence.
   *
   * In print every state surface goes white and the ASSUMED treatment carries on
   * its four non-colour channels, so the pair does not exist there; the row that
   * does its job on paper is the dotted underline.
   */
  [
    '--uncertain-surface',
    '--surface-base',
    [1.03, 1.18, null],
    'the amber ground against the page',
    { dischargedBy: ['--uncertain-border', '--uncertain-surface'] },
  ],
];

/* -------------------------------------------------------------------------
 * HELPERS — nothing below is a name without a body
 * ---------------------------------------------------------------------- */

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error(`FAIL  ${msg}`);
};

/** Ratio of two token names in one resolved theme. Throws rather than skipping. */
function ratioOf(theme, fgToken, bgToken) {
  const fg = rgb(resolve(theme, theme[fgToken] ?? ''));
  const bg = rgb(resolve(theme, theme[bgToken] ?? ''));
  if (!fg || !bg) {
    // Unresolvable counts as a FAILURE, not a skip. This is the line that makes
    // `transparent`, `rgb(... / 0.06)` and a missing token all loud instead of
    // absent — and it is why an inner-highlight token is not in this palette.
    throw new Error(`unresolvable pair: ${fgToken} on ${bgToken}`);
  }
  return ratio(fg, bg);
}

/** max(R,G,B) - min(R,G,B) for a resolved token. Crude, and the right crudeness. */
function chromaOf(theme, token) {
  const c = rgb(resolve(theme, theme[token] ?? ''));
  if (!c) throw new Error(`unresolvable colour: ${token}`);
  return Math.max(...c) - Math.min(...c);
}

/**
 * The component stylesheets, comments BLANKED rather than deleted.
 *
 * Blanking preserves every byte position and every newline, so a line number
 * reported below is the line number in the file a reader opens. Deleting them
 * would shift every offset and hand a reviewer a citation that points at the
 * wrong rule — which is its own small version of the defect this file exists to
 * catch.
 *
 * The directory is enumerated rather than hand-listed. A hand-listed set of
 * sheets is the same shape of defect as a hand-listed set of pairs: it drifts the
 * first time a page ships its own stylesheet, and it drifts silently, because the
 * checker keeps printing a green summary over the sheets it does know about.
 */
const STYLE_DIR = new URL('../apps/web/src/styles/', import.meta.url);
const blankComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
const SHEETS = readdirSync(STYLE_DIR)
  .filter((f) => f.endsWith('.css') && f !== 'tokens.css')
  .sort()
  .map((f) => [f, blankComments(readFileSync(new URL(f, STYLE_DIR), 'utf8'))]);

/**
 * Every declaration in a sheet, as [selectorText, declarationBody, lineNumber].
 *
 * Deliberately not a CSS parser: a rule is "the text since the last brace"
 * followed by a block, which is enough for a whitelist scan and carries no
 * dependency. At-rules are descended into, so a rule inside `@media` is scanned
 * with its own selector rather than being swallowed by the query.
 *
 * A construct it cannot read — a nested rule inside a plain selector, i.e. CSS
 * nesting — is reported as UNSCANNED and FAILS the run. Silence is not a pass
 * here either: a scanner that quietly skips the one block it does not understand
 * is a whitelist with a hole in it.
 */
function declarations(css, file) {
  const out = [];
  const lineOf = (i) => css.slice(0, i).split('\n').length;

  const walk = (from, to) => {
    let i = from;
    let chunkStart = from;
    while (i < to) {
      const c = css[i];
      if (c === '}') {
        i += 1;
        chunkStart = i;
        continue;
      }
      if (c !== '{') {
        i += 1;
        continue;
      }
      const sel = css.slice(chunkStart, i).trim();
      let depth = 0;
      let j = i;
      for (; j < to; j++) {
        if (css[j] === '{') depth++;
        else if (css[j] === '}' && --depth === 0) break;
      }
      if (j >= to) {
        fail(`${file}:${lineOf(i)} UNSCANNED — unbalanced block after \`${sel}\`.`);
        return;
      }
      if (sel.startsWith('@')) {
        walk(i + 1, j);
      } else {
        const body = css.slice(i + 1, j);
        if (body.includes('{')) {
          fail(
            `${file}:${lineOf(i)} UNSCANNED — nested rules inside \`${sel}\`. ` +
              `The scanner cannot read CSS nesting, and a scan that skips a block ` +
              `is a whitelist with a hole in it.`,
          );
          walk(i + 1, j);
        }
        out.push([sel, body.replace(/\{[\s\S]*?\}/g, ' '), lineOf(i)]);
      }
      i = j + 1;
      chunkStart = i;
    }
  };

  walk(0, css.length);
  return out;
}

/* -------------------------------------------------------------------------
 * THE ASSERTIONS — thresholds cannot express rank or exclusivity
 * ---------------------------------------------------------------------- */

/**
 * (1) Amber outranks CHROME, on every ground, in every theme.
 *
 * SCOPE, stated rather than assumed. It covers --accent and --accent-focus: the
 * tokens painted as INK or STROKE on a page ground. It excludes:
 *
 *  - --accent-hover, which is only ever a FILL under a pointer. What matters
 *    there is its label, and --text-inverse on it is a declared pair above.
 *  - --derived, --variance and --deferred, which are provenance PEERS. Within
 *    that family differentiation is by cue, by fill and by area, never by
 *    luminance rank. THIS EXCLUSION IS LOAD-BEARING: --variance measures 7.06 on
 *    a panel in light and print against amber's 6.99, so amber does not lead it
 *    there. An earlier draft lightened --variance — the token that paints NEVER
 *    CLAIMED — purely to win this comparison. That is the aesthetic-driven
 *    softening this file exists to prevent, arrived at from the other side, and
 *    the assertion MUST NOT depend on it. Two inks 1.010x apart are not a rank a
 *    reader perceives; what separates ASSUMED from VARIANCE at page scale is the
 *    amber's filled ground and its 6px gutter rail, and VARIANCE has neither.
 *  - --text-* and --border-*, which are achromatic and carry no colour signal.
 *
 * The rank between two dark foregrounds on a light ground is ground-independent,
 * so this is one luminance comparison. It is checked per ground anyway, because
 * that argument holds only while both tokens sit on the same side of the ground.
 */
function assertAmberOutranksChrome(themes, grounds = GROUNDS) {
  for (const [name, T] of themes) {
    for (const g of grounds) {
      for (const c of ['--accent', '--accent-focus']) {
        const amber = ratioOf(T, '--uncertain', g);
        const chrome = ratioOf(T, c, g);
        if (!(amber > chrome)) {
          fail(
            `§13.1: ${c} (${chrome.toFixed(2)}) is at least as loud as ` +
              `--uncertain (${amber.toFixed(2)}) on ${g} in ${name}.`,
          );
        }
      }
    }
  }
}

/**
 * (2) No state ink and no chrome ink on the inverted band.
 *
 * The tenth surface. --surface-contrast is excluded from GROUNDS because on it,
 * in light, --uncertain measures 2.58 against --accent's 3.12 — assertion (1)
 * would fail there. An exclusion that rests on "nothing is painted there" is
 * worth exactly as much as the check that nothing is. So here is the check:
 * inside any rule whose selector mentions the band, the only colour tokens
 * permitted are the band's own three.
 */
const BAND_OK = /^--(text-on-contrast|text-on-contrast-dim|border-on-contrast|surface-contrast)$/;
function assertNoChromeOnBand() {
  for (const [file, css] of SHEETS) {
    for (const [sel, decl, line] of declarations(css, file)) {
      if (!/contrast|status-band/.test(sel)) continue;
      for (const m of decl.matchAll(/var\((--[\w-]+)\)/g)) {
        if (/^--(uncertain|accent|variance|derived|deferred)/.test(m[1]) && !BAND_OK.test(m[1])) {
          fail(
            `${file}:${line} paints ${m[1]} on the inverted band (${sel}). ` +
              `--surface-contrast is excluded from the nine grounds on the ` +
              `strength of this never happening.`,
          );
        }
      }
    }
  }
}

/**
 * (3) The amber ground is the most chromatic surface in the system.
 *
 * Ratio is a luminance measure and says nothing about area or saturation, and at
 * page scale the ASSUMED treatment's loudness comes from its FILLED GROUND — the
 * only coloured ground in the language. Chroma spread is crude and it is the
 * right crudeness here: it caught a defect nothing else could see, that dark
 * --accent-subtle (38) was more chromatic than dark --uncertain-surface (27), so
 * a BINDING tag had a stronger colour ground than an assumption.
 *
 * Screen themes only: in print EVERY state surface is white, which is a uniform
 * rule and not an amber exception.
 */
function assertAmberSurfaceMostChromatic(themes, surfaces = GROUNDS) {
  for (const [name, T] of themes) {
    const amber = chromaOf(T, '--uncertain-surface');
    for (const s of surfaces) {
      if (s === '--uncertain-surface') continue;
      const other = chromaOf(T, s);
      if (other >= amber) {
        fail(
          `§13.1: ${s} (chroma ${other}) is at least as chromatic as ` +
            `--uncertain-surface (${amber}) in ${name}.`,
        );
      }
    }
  }
}

/**
 * (4) Amber is used for uncertainty and nothing else.
 *
 * "Nothing else in the system is permitted to use it" was a rule a reviewer had
 * to remember, spread over fifteen distinct modifier names for what the state
 * layer shows is a handful of states — `.chip--assumed` and `.chip--warn` were
 * byte-identical and both live, so an edit to "the amber chip" changed one and
 * missed the other, and the one it missed carried §13.1's meaning.
 *
 * After the [data-state] consolidation every amber declaration lives in a
 * selector matching this whitelist. Anything else fails the build.
 *
 * EVERY ENTRY CARRIES A COMMENT NAMING THE UNCERTAINTY IT REPRESENTS. An entry
 * without one is a colour looking for an excuse.
 */
const AMBER_OK = [
  /\[data-state=['"]assumed['"]\]/, //  the state layer: an ASSUMED value, the
  //  canonical case the whole token exists for.
  /\.traced--assumed/, //               the inline treatment on an ASSUMED value.
  /\.margin-tally/, //                  channel 5, the rail-gutter tally: a count of
  //  the assumptions a section rests on. Its
  //  --none zero state is the same device saying
  //  "nothing is assumed here", which only reads
  //  as a statement in the same column.
  /\[data-state=['"]partial['"]\]/, //  PARTIALLY SUPPORTED, the five-way claim
  //  statement's verdict. site-map R6 rulings 2
  //  and 3 keep it amber and neither was on the
  //  original list, so the assertion could not
  //  have passed as written. A partially
  //  quantified claim IS an uncertainty statement
  //  about that claim's support, and it is a
  //  state of its own rather than an alias of
  //  `assumed`: mapping it onto `assumed` would
  //  relabel a claim verdict as an assumption,
  //  which is a copy change to §16.5's sentence.
  /\.lp-claim--partial/, //             the same verdict on the landing page, and the
  //  row the chip below sits in.
  /\.lp-status--partial/, //            the status chip inside that very row —
  //  Landing.tsx emits both class names from the
  //  same value, so the chip and its row must
  //  carry one colour or the row says two things.
  //  The ruling is inherited, not new.
  /\.sensitivity__bar/, //              a sensitivity magnitude. Sensitivity is a
  //  property of an ASSUMED entry and of nothing
  //  else: AssumptionRegister renders the bar only
  //  inside `entry.sensitivity`, i.e. only inside
  //  an assumption row.
];

function assertAmberExclusive() {
  for (const [file, css] of SHEETS) {
    for (const [sel, decl, line] of declarations(css, file)) {
      if (!/var\(--uncertain/.test(decl)) continue;
      if (AMBER_OK.some((re) => re.test(sel))) continue;
      fail(`${file}:${line} paints amber outside the whitelist: ${sel}`);
    }
  }
}

/**
 * (5) Every rail width is one of the two, and 6px is ASSUMED alone.
 *
 * §7.4(c) rests the greyscale and photocopy argument on "a column of 6px marks
 * reads as a POSITION, not a hue". That is only true while ASSUMED is the only
 * state at 6px. Amber and the accent separate by 1.21x in light and 1.36x in
 * dark, which on a photocopy is two mid-greys, so sharing the width collapses
 * that channel back into colour alone. No ratio check can see it, which is why
 * it is an assertion and not a review note.
 *
 * ONE exception, and it is the same device rather than a second one:
 * `.margin-tally--none` keeps the 6px in --border-strong, because "nothing is
 * assumed in this section" only reads as a statement if it occupies the same
 * column at the same width.
 */
const EMPHASIS_OK = /\[data-state=['"]assumed['"]\]|\.margin-tally/;
function assertRailWidths() {
  for (const [file, css] of SHEETS) {
    for (const [sel, decl, line] of declarations(css, file)) {
      const usesEmphasis =
        /--rail-width:\s*var\(--rail-w-emphasis\)/.test(decl) ||
        /border-inline-start(?:-width)?:\s*var\(--rail-w-emphasis\)/.test(decl);
      if (usesEmphasis && !EMPHASIS_OK.test(sel)) {
        fail(`${file}:${line} gives ${sel} the 6px rail. It is ASSUMED-only.`);
      }
      // And no third width. Both widths are TOKENS, so any literal is a third one.
      for (const b of decl.matchAll(/border-inline-start(?:-width)?:\s*(\d+)px/g)) {
        fail(`${file}:${line} draws a literal ${b[1]}px rail on ${sel}.`);
      }
    }
  }
}

/**
 * (6) Every painted colour token is measured SOMEWHERE.
 *
 * site-map §6.3's second pass, and its limit is stated here rather than sold:
 * this proves every painted colour appears in some declared pair, NOT that it is
 * measured against the surface it is actually drawn on. Inferring the real ground
 * needs a laid-out page, which is `scripts/smoke.mjs`'s territory and not a
 * static scanner's. What it converts is a silent omission into a loud one, which
 * is the whole of the difference between the two failure modes this repository
 * cares about — nothing detects a painted pair nobody added, and the checker goes
 * on printing a green summary.
 *
 * Both lanes count as measurement: a house row is a recorded ratio with a floor,
 * so --border-subtle and --border-default are measured even though 1.4.11 exempts
 * them. The recorded exclusions count too — they are printed with their numbers.
 *
 * Two narrowings, both deliberate. Only the paint properties below are read, so a
 * token used as a WIDTH (`border-inline-start: var(--rail-w) solid …`) is not
 * mistaken for an ink. And only tokens that are declared in `tokens.css` AND
 * resolve to a colour are considered, so component-level indirections
 * (`--state-surface`, `--rail-color`, `--meter-fill`) are not reported: each one
 * is assigned a palette token at its definition site, and that token is what gets
 * measured.
 */
/*
 * WIDENED, because a colour pass paints with more than `background` and `color`.
 *
 * The list used to stop at fills, strokes and border colours, so a palette token
 * spent as a RING (outline), as a SHADOW (box-shadow) or under a NUMBER
 * (text-decoration-color) was not scanned at all — and every one of those is a
 * response state, which is exactly what this pass adds. A hover ring in a colour
 * nobody declared a pair for would have shipped with the checker printing a green
 * summary over it, which is the shape of failure this file exists to refuse.
 *
 * Tokens that do not resolve to a colour are still ignored downstream by
 * `isPaletteColour`, so `box-shadow: var(--shadow-sm)` — a composite value with an
 * alpha channel — is skipped rather than reported as unresolvable. That is the
 * honest limit of a static scanner and it is why an alpha shadow may never carry
 * hierarchy in this language: what cannot be resolved cannot be measured.
 */
const PAINT_PROPERTIES =
  /(?:^|;)\s*(color|background|background-color|background-image|fill|stroke|border-color|border-[\w-]*-color|outline|outline-color|box-shadow|text-decoration-color|text-emphasis-color|column-rule-color|caret-color|accent-color)\s*:\s*([^;]*)/g;

function assertEveryPaintedTokenIsMeasured() {
  const measured = new Set();
  for (const [fg, bg] of [...PAIRS, ...EXCLUDED, ...HOUSE_PAIRS]) {
    measured.add(fg);
    measured.add(bg);
  }
  const isPaletteColour = (t) => {
    const v = LIGHT[t];
    return v !== undefined && rgb(resolve(LIGHT, v)) !== null;
  };

  for (const [file, css] of SHEETS) {
    for (const [sel, decl, line] of declarations(css, file)) {
      for (const d of decl.matchAll(PAINT_PROPERTIES)) {
        for (const m of d[2].matchAll(/var\((--[\w-]+)/g)) {
          const token = m[1];
          if (!isPaletteColour(token) || measured.has(token)) continue;
          fail(
            `${file}:${line} paints ${token} on ${sel} and no pair measures it. ` +
              `An unmeasured pair is a failure, not a skip.`,
          );
        }
      }
    }
  }
}

/**
 * (7) NO COMPONENT STYLESHEET WRITES A COLOUR LITERAL.
 *
 * Every assertion above this one reads `var(--token)`. That is the hole: they are
 * all blind to a colour written as a value. `background: #fdf3e0` is the amber
 * ground, and `assertAmberExclusive` — which scans for `var(--uncertain` — does
 * not see it, so a decorative amber wash painted as a literal passes §13.1's own
 * checker. `assertEveryPaintedTokenIsMeasured` misses it for the same reason:
 * there is no token to look up, so there is no pair to demand, and the run prints
 * a green summary over an unmeasured ink.
 *
 * The design language already forbids this in prose — a component stylesheet
 * never writes a hex — and as of this run the eleven sheets contain ZERO literal
 * colours in a paint declaration. So this assertion costs nothing today and is
 * worth exactly what the prose was not: it is the difference between a rule that
 * holds and a rule that held when somebody last looked.
 *
 * `transparent` and `currentColor` are not literals in the sense that matters —
 * neither names a colour — and both are left alone. `tokens.css` is excluded
 * because it is where the literals are DEFINED; `SHEETS` already omits it.
 *
 * The print sheet's twelve raw hex values were removed by design-language §2.3's
 * Step 1b for exactly this reason, and this is what stops them coming back: they
 * were inside `@media print`, which is the theme with the highest stakes and the
 * one a screen review never opens.
 */
const LITERAL_COLOUR =
  /#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(|\b(?:white|black|red|blue|green|orange|yellow|grey|gray|silver|navy|teal|purple|maroon|olive|lime|aqua|fuchsia)\b/;

function assertNoLiteralColours() {
  for (const [file, css] of SHEETS) {
    for (const [sel, decl, line] of declarations(css, file)) {
      for (const d of decl.matchAll(PAINT_PROPERTIES)) {
        if (!LITERAL_COLOUR.test(d[2])) continue;
        fail(
          `${file}:${line} paints a colour LITERAL on ${sel} — ` +
            `${d[1]}: ${d[2].trim().slice(0, 60)}. A literal has no token, so no ` +
            `pair measures it and the amber whitelist cannot see it. Semantic ` +
            `tokens only.`,
        );
      }
    }
  }
}

/**
 * (8) THE DRAWING STYLESHEET IS HELD TO THE SAME RULES, READ FROM ITS SOURCE.
 *
 * `@envelope/sheets` inks every drawing — the sheet on screen, the drawing set on
 * paper — from `SHEET_CSS`, a stylesheet held in a TypeScript string. (4), (6) and
 * (7) could not see it: they read `apps/web/src/styles/*.css`, and a string in a
 * package is not a file in that directory. It paints amber, and it writes a colour
 * literal behind every token — precisely the two things this checker exists to
 * see, sitting where it did not look.
 *
 * The literals are deliberate: the drawing set prints without the web's tokens, so
 * each `var(--token, #hex)` falls back to the light theme. So here a literal is
 * not banned, it is MEASURED — it must be the light palette's own value for the
 * token it stands behind, or it is a second palette quietly drifting from the
 * first. Its token must be measured somewhere, as (6) demands of every sheet. And
 * amber may appear only on an ASSUMED value's ink, as (4) demands.
 *
 * The .glb is held to the same rules for the same reason. A 3D file is written
 * with the light palette whatever theme the person exporting was in, so
 * `@envelope/massing` spells its colours the same way — `var(--token, #hex)` —
 * and each one is read here. Its amber belongs on the `assumed:` ink and nowhere
 * else; the scene builder colours by provenance class, so that one entry is the
 * only way amber can reach the model.
 */
/**
 * (9) A PRIMITIVE IS READ BY THE THEMES AND BY NOTHING ELSE.
 *
 * `tokens.css` names every colour twice: once as what it IS (`--graphite-73`) and
 * once as what it is FOR (`--text-primary`). Only the second follows the theme. A
 * stylesheet that reads `var(--graphite-73)` paints the light theme's ink in the
 * dark theme too, and no pair measures it, because pairs are written between
 * roles. (6) would catch it as "unmeasured", which is true and misleading: the fix
 * is not a new pair, it is the role. So the rule is stated here in its own words,
 * and it covers every declaration — not only the paint properties (6) reads — and
 * the drawing sources, whose fallbacks must name roles as well.
 */
const PRIMITIVE = /var\((--(?:graphite|grey|blue|amber|red|green)-\d+)\b/;
function assertPrimitivesPrivate(drawingSources) {
  for (const [file, css] of SHEETS) {
    for (const [sel, decl, line] of declarations(css, file)) {
      const m = PRIMITIVE.exec(decl);
      if (m) {
        fail(
          `${file}:${line} reads the primitive ${m[1]} on ${sel}. A component reads ` +
            `a semantic token; a primitive does not change with the theme.`,
        );
      }
    }
  }
  for (const { file, src } of drawingSources) {
    const m = PRIMITIVE.exec(src);
    if (m) fail(`${file} reads the primitive ${m[1]}. Drawing inks name a role, as the web's do.`);
  }
}

const DRAWING_SOURCES = [
  { file: 'packages/sheets/src/svg.ts', amberOk: /sh-c-assumed/, what: 'an ASSUMED value' },
  { file: 'packages/massing/src/palette.ts', amberOk: /^\s*assumed:/, what: 'the ASSUMED ink' },
].map((s) => ({ ...s, src: readFileSync(new URL(`../${s.file}`, import.meta.url), 'utf8') }));

function assertSheetStylesheet() {
  const measured = new Set();
  for (const [fg, bg] of [...PAIRS, ...EXCLUDED, ...HOUSE_PAIRS]) {
    measured.add(fg);
    measured.add(bg);
  }
  for (const { file, src, amberOk, what } of DRAWING_SOURCES) {
    const fallbacks = [...src.matchAll(/var\((--[\w-]+),\s*(#[0-9a-fA-F]{3,8})\)/g)];
    if (fallbacks.length === 0) {
      fail(`${file}: no var(--token, #hex) found. A scan that matched nothing is not a pass.`);
    }
    for (const [, token, hex] of fallbacks) {
      const want = LIGHT[token] === undefined ? null : rgb(resolve(LIGHT, LIGHT[token]));
      if (!want) {
        fail(`${file}: ${token} is not a light-theme colour, so its fallback ${hex} stands behind nothing.`);
        continue;
      }
      const got = rgb(hex);
      if (!got || got.some((c, i) => c !== want[i])) {
        fail(
          `${file}: ${token} falls back to ${hex}, but the light theme says ` +
            `${resolve(LIGHT, LIGHT[token])}. A fallback that drifted is a second palette.`,
        );
      }
      if (!measured.has(token)) {
        fail(`${file}: paints ${token} and no pair measures it. Unmeasured is a failure, not a skip.`);
      }
    }
    for (const [i, line] of src.split('\n').entries()) {
      if (line.includes('var(--uncertain') && !amberOk.test(line)) {
        fail(`${file}:${i + 1} paints amber on something other than ${what}.`);
      }
    }
    console.log(`\nDRAWING COLOURS — ${fallbacks.length} token fallback(s) in ${file}, each checked against the light palette.`);
  }
}

/* -------------------------------------------------------------------------
 * GUARDS on the lane structure itself
 * ---------------------------------------------------------------------- */

const wcagFg = new Set(PAIRS.map((p) => p[0]));
const houseFg = new Set(HOUSE_PAIRS.map((p) => p[0]));
for (const t of houseFg) {
  if (wcagFg.has(t)) {
    throw new Error(
      `${t} is a foreground in BOTH lanes. A token is informative or decorative, ` +
        `never both — this is how a WCAG pair gets quietly demoted to a house row.`,
    );
  }
}

// A null floor must name the row that does its job in that theme, and that row
// must exist. Otherwise "not applicable in print" is an unchecked assertion.
for (const [fg, bg, floors, , meta] of HOUSE_PAIRS) {
  floors.forEach((floor, i) => {
    if (floor !== null) return;
    const d = meta && meta.dischargedBy;
    if (!d) {
      fail(`${fg} on ${bg} is null in ${THEMES[i][0]} with nothing discharging it.`);
      return;
    }
    // The discharging row may live in EITHER lane, and that is a widening rather
    // than a loosening: the WCAG lane's floors are the higher of the two. A band
    // that inverts to white on paper is carried there by its own 1.4.11 control
    // rule, and an amber ground that drops on paper is carried by its dotted
    // underline — both are measured, floored, printed rows, and neither is a
    // house row. Requiring the discharge to be a house row would have forced
    // either a vacuous 1.00 floor or an undeclared exemption, which are the two
    // shapes of failure this file exists to refuse.
    const discharged =
      HOUSE_PAIRS.some((h) => h[0] === d[0] && h[1] === d[1]) ||
      PAIRS.some((p) => p[0] === d[0] && p[1] === d[1]);
    if (!discharged) {
      fail(`${fg} on ${bg}: dischargedBy names a row that does not exist.`);
    }
  });
}

/* -------------------------------------------------------------------------
 * THE RUN
 * ---------------------------------------------------------------------- */

const rows = [];

for (const [theme, tokens] of THEMES) {
  for (const [fgToken, bgToken, min, what] of PAIRS) {
    const fgHex = resolve(tokens, tokens[fgToken] ?? '');
    const bgHex = resolve(tokens, tokens[bgToken] ?? '');
    const fg = rgb(fgHex);
    const bg = rgb(bgHex);
    if (!fg || !bg) {
      // An unresolvable pair counts as a failure, not a skip. A checker that
      // reports "0 below threshold" over pairs it never measured is the same
      // vacuous pass this codebase refuses everywhere else.
      failures++;
      rows.push([
        theme,
        what,
        '—',
        min,
        'UNRESOLVED',
        `${fgToken}=${fgHex || '(missing)'} ${bgToken}=${bgHex || '(missing)'}`,
      ]);
      continue;
    }
    const r = ratio(fg, bg);
    const ok = r >= min;
    if (!ok) failures++;
    rows.push([theme, what, r.toFixed(2), min.toFixed(1), ok ? 'pass' : 'FAIL', `${fgToken} on ${bgToken}`]);
  }
}

const w = (s, n) => String(s).padEnd(n);
console.log(`${w('theme', 6)} ${w('ratio', 6)} ${w('min', 5)} ${w('', 10)} what`);
for (const [theme, what, r, min, verdict, tokens] of rows) {
  console.log(`${w(theme, 6)} ${w(r, 6)} ${w(min, 5)} ${w(verdict, 10)} ${what}  (${tokens})`);
}

// --- The house lane, under its own heading, with its own verdict word --------

console.log(
  `\nHOUSE ROWS — a design contract, not a conformance claim. The verdict word is\n` +
    `\`held\`; \`pass\` is reserved for the WCAG lane above and never appears here.`,
);
let houseUnder = 0;
for (let i = 0; i < THEMES.length; i++) {
  const [theme, tokens] = THEMES[i];
  for (const [fgToken, bgToken, floors, what, meta] of HOUSE_PAIRS) {
    const floor = floors[i];
    const r = ratioOf(tokens, fgToken, bgToken);
    if (floor === null) {
      const d = meta.dischargedBy;
      console.log(
        `${w(theme, 6)} ${w(r.toFixed(2), 6)} ${w('—', 5)} ${w('discharged', 10)} ` +
          `${what}  (${fgToken} on ${bgToken} → ${d[0]} on ${d[1]})`,
      );
      continue;
    }
    const ok = r >= floor;
    if (!ok) {
      houseUnder++;
      failures++;
    }
    console.log(
      `${w(theme, 6)} ${w(r.toFixed(2), 6)} ${w(floor.toFixed(2), 5)} ` +
        `${w(ok ? 'held' : 'UNDER', 10)} ${what}  (${fgToken} on ${bgToken})`,
    );
  }
}

// --- Recorded exclusions, printed with their numbers -------------------------

console.log(
  `\nRECORDED EXCLUSIONS — pairs deliberately out of the WCAG lane, printed with\n` +
    `their measured ratios so an omission is visible rather than absent.`,
);
for (const [theme, tokens] of THEMES) {
  for (const [fgToken, bgToken, floor, why] of EXCLUDED) {
    const r = ratioOf(tokens, fgToken, bgToken);
    console.log(
      `${w(theme, 6)} ${w(r.toFixed(2), 6)} ${w(floor.toFixed(1), 5)} ${w('excluded', 10)} ` +
        `${why}  (${fgToken} on ${bgToken})`,
    );
  }
}

// --- The assertions ----------------------------------------------------------

const SCREEN_THEMES = THEMES.filter(([n]) => n !== 'print');

assertAmberOutranksChrome(THEMES);
assertNoChromeOnBand();
assertAmberSurfaceMostChromatic(SCREEN_THEMES);
assertAmberExclusive();
assertRailWidths();
assertEveryPaintedTokenIsMeasured();
assertNoLiteralColours();
assertSheetStylesheet();
assertPrimitivesPrivate(DRAWING_SOURCES);

console.log(
  `\n${rows.length} WCAG row(s) across three themes: ${rows.length - failures} pass, ` +
    `${failures} fail, unresolved, under or asserted.`,
);
if (failures > 0) {
  console.error(
    'Contrast failures are not a styling preference. Accessibility is never traded ' +
      'for aesthetics — and an amber that cannot be read is not a warning.',
  );
  process.exit(1);
}
