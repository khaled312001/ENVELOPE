/**
 * The printable report — `FR-OUT-001`, PRD §3.4, rendered as one self-contained
 * HTML document.
 *
 * ---
 *
 * ## Why HTML, and why it must stand alone
 *
 * §19.4 lists WeasyPrint in the Phase 0 stack; we replaced it with headless
 * Chromium when the stack moved to TypeScript. §19.1 was already right about the
 * shape — it says "report/ HTML → PDF" — so nothing about the pipeline changes,
 * only the renderer. What that renderer needs is a document that resolves
 * nothing: no CDN, no web font, no external stylesheet, no image URL. Every byte
 * is inline. A print worker that reaches the network is a print worker that
 * produces a differently-typeset PDF the day the network is slow, and this
 * artifact goes to an investment committee.
 *
 * ## Print-first, not screen-with-a-print-stylesheet
 *
 * The base rules target paper: A4, real `break-before: page` boundaries between
 * §3.4's sections, `break-inside: avoid` on every card and table row, and
 * `display: table-header-group` so a long table repeats its own header on each
 * sheet. The footer carrying the run id and the annex version is
 * `position: fixed`, which Chromium repeats on every printed page, sitting in
 * the page's bottom margin — deliberately not a CSS Paged Media margin box,
 * because Chromium does not implement `@bottom-center` and a margin box would
 * silently render nothing. Page *numbers* are the one thing this technique
 * cannot supply: `counter(page)` is only readable inside those margin boxes. If
 * numbering is wanted it comes from the print driver's own footer template, and
 * the identity that has to survive a photocopied page is here regardless.
 *
 * ## The uncertainty treatment is load-bearing
 *
 * §13.1: the amber `ASSUMED` treatment "is the most important UI decision in the
 * product. The core failure mode is a user mistaking an assumption for a fact…
 * This must survive design review; softening it for aesthetic reasons defeats
 * the product."
 *
 * So every uncertainty state is encoded **twice**, once in colour and once in
 * something that survives a greyscale photocopy — because that photocopy is what
 * gets passed around a meeting room:
 *
 * | State | Colour | Non-colour cue |
 * |---|---|---|
 * | `ASSUMED` | amber field | ◆ glyph **and** a dotted underline |
 * | `DERIVED` | neutral | citation superscript |
 * | `USER_SET` | pale blue field | the word `USER` in a badge |
 * | `VARIANCE` | red border | a 2 px solid border and the word `VARIANCE` |
 * | deferred / not assessed | grey | 45° hatching **and** the words `NOT ASSESSED` |
 *
 * A reviewer who asks for the amber to be "calmed down" is asking for the
 * product's central mitigation to be removed; the answer is no, and this comment
 * is the record of that.
 *
 * ## This module renders. It does not compute.
 *
 * There is no arithmetic anywhere below. The one transformation applied to a
 * magnitude is {@link groupDigits}, which inserts thousands separators by string
 * surgery on a matched `-?\d+(\.\d+)?` and returns its input untouched
 * otherwise. It never calls `Number()`, never rounds, and cannot change a digit.
 * Quantities arrive already quantised by `qArea` / `qRatio` upstream; a report
 * that re-rounded could print a different number from the one the engine traced,
 * which is the failure the package boundary exists to prevent.
 */

import { CapacityBand, ClaimStatus, RenderHint, metric } from '@envelope/core';
import type { Citation, MetricDefinition, TracedWire } from '@envelope/core';

import {
  InvariantStatus,
  RuleDisposition,
  RuleSetApproval,
  assertEmittable,
  unsignedAnnexNotice,
  type AssumptionEntry,
  type BindingConstraintView,
  type DeferredCheckEntry,
  type InvariantOutcome,
  type RunReport,
} from './json.js';

/**
 * A provenance class Phase 0 cannot honestly render reached the renderer.
 *
 * `OBSERVED` needs a precedent distribution with n ≥ 8 (Phase 2, §13.3) and
 * `TRADEOFF` needs an optimizer (Phase 5). `Tracer` already refuses to construct
 * either, so arriving here means a hand-built payload — and drawing a sparkline
 * over a distribution the product does not have would be a fabricated chart.
 */
export class Phase0RenderError extends Error {
  override readonly name = 'Phase0RenderError';
  constructor(readonly hint: RenderHint) {
    super(
      `render hint ${hint} is not emittable in Phase 0. PRD §13.3: OBSERVED requires a ` +
        `precedent pattern with n ≥ 8 (Phase 2) and TRADEOFF requires an optimizer ` +
        `(Phase 5). Neither exists, so neither may be drawn.`,
    );
  }
}

// ---------------------------------------------------------------------------
// The five-way claim statement — §16.5, Principle 8
// ---------------------------------------------------------------------------

/**
 * §16.5: "Every validation report contains these five statements, separately,
 * **verbatim**."
 *
 * They are constants in this template rather than fields on the run, which is
 * what Principle 7's enforcement note — "report template makes the distinction
 * structural" — means in practice. A caller cannot reword them, and
 * `REGULATORY_VALIDITY` in particular is not sourced from the run at all: §16.5
 * says "the fourth line is permanent and never changes", so the report prints
 * the constant and `assertEmittable` refuses any run whose regulatory-validity
 * status is anything but `NEVER_CLAIMED` or `NOT_ASSESSED`.
 *
 * The `N`, `M`, `K`, `X` and `Y` placeholders in lines two and five are filled
 * by the validation module's own `detail` string, printed beneath each heading —
 * never recomputed here.
 */
export const CLAIM_STATEMENT_VERBATIM = {
  SELF_CONSISTENCY:
    'The configuration satisfies every constraint we encoded, and its arithmetic closes.',
  RULE_COVERAGE:
    'We encoded N of M requirements identified as applicable. K are deferred and listed below.',
  GEOMETRIC_VALIDITY:
    'Geometry is topologically valid; areas independently recomputed and agree.',
  REGULATORY_VALIDITY:
    'NOT ASSESSED. This system does not and cannot determine whether an authority would ' +
    'approve this scheme.',
  PROFESSIONAL_AGREEMENT:
    'Where measured against qualified architects on comparable plots, this engine fell ' +
    'within the inter-architect disagreement band in X of Y cases.',
} as const;

// ---------------------------------------------------------------------------
// Text safety and presentation
// ---------------------------------------------------------------------------

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escape text for HTML.
 *
 * Applied to every interpolated string without exception, including citation
 * `sourceTextVerbatim`, which is transcribed from a regulatory PDF and is the
 * one field in the model most likely to contain a character that would close a
 * tag.
 */
function esc(text: string): string {
  return text.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]!);
}

const GROUPABLE = /^(-?)(\d+)(\.\d+)?$/;

/**
 * Insert thousands separators, by string surgery only.
 *
 * A committee reads `16,000.00` and misreads `16000.00`; that is the whole
 * reason this exists. It matches an exact decimal, groups the integer part with
 * a regular expression that inserts commas at three-digit boundaries, and
 * returns anything else — a range, a count with a unit, a label — unchanged. No
 * `Number()`, no `parseFloat`, no rounding: the digits that come out are the
 * digits that went in, in the same order.
 */
export function groupDigits(text: string): string {
  const match = GROUPABLE.exec(text);
  if (!match) return text;
  const [, sign = '', whole = '', fraction = ''] = match;
  return `${sign}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction}`;
}

// ---------------------------------------------------------------------------
// Uncertainty states — §13.1, §20.3
// ---------------------------------------------------------------------------

interface StateTreatment {
  readonly className: string;
  /** Survives greyscale. Empty only where the state needs no marker. */
  readonly glyph: string;
  /** Read aloud by a screen reader; never the only cue. */
  readonly label: string;
}

/**
 * The visual treatment for a render hint.
 *
 * An exhaustive switch on purpose: a provenance class added in a later phase
 * fails this build rather than falling through to a neutral rendering, which is
 * the one outcome §13.1 cannot tolerate — an unmarked value is read as a fact.
 */
function treatmentFor(hint: RenderHint): StateTreatment {
  switch (hint) {
    case RenderHint.NEUTRAL_WITH_CITATION:
      return { className: 'v-derived', glyph: '', label: 'derived from a cited rule' };
    case RenderHint.AMBER_DOTTED_EDITABLE:
      return { className: 'v-assumed', glyph: '◆', label: 'assumed — not a cited rule' };
    case RenderHint.USER_BADGE:
      return { className: 'v-user', glyph: '', label: 'set by a named user' };
    case RenderHint.RED_BORDER_EVIDENCE:
      return { className: 'v-variance', glyph: '▲', label: 'governed by a documented variance' };
    case RenderHint.GREY_HATCHED_NOT_ASSESSED:
      return { className: 'v-deferred', glyph: '–', label: 'not assessed' };
    case RenderHint.DISTRIBUTION_SPARKLINE:
    case RenderHint.TRADEOFF_LINK:
      throw new Phase0RenderError(hint);
    default: {
      const unreachable: never = hint;
      throw new Phase0RenderError(unreachable);
    }
  }
}

/** Footnote and citation registries, assigned in document order. */
class Registry<T> {
  readonly #order: { readonly key: string; readonly item: T }[] = [];
  readonly #index = new Map<string, number>();

  /** One-based ordinal. Stable: the same key always yields the same number. */
  ordinal(key: string, item: T): number {
    const existing = this.#index.get(key);
    if (existing !== undefined) return existing;
    const next = this.#order.length + 1;
    this.#index.set(key, next);
    this.#order.push({ key, item });
    return next;
  }

  entries(): readonly { readonly ordinal: number; readonly key: string; readonly item: T }[] {
    return this.#order.map((entry, index) => ({ ordinal: index + 1, ...entry }));
  }

  get size(): number {
    return this.#order.length;
  }
}

/**
 * The two indexes a report needs to satisfy `FR-OUT-001 AC2` — "every number
 * footnoted to its provenance" — in a static document.
 *
 * On screen, §20.2's third moment is click-through provenance: "every number is
 * a link". On paper there is nowhere to click, so the equivalent is a footnote
 * marker on every traced value resolving to a provenance index at the back, and
 * a bracketed marker on every citation resolving to the clause text. The
 * ordinals are assignment counters, not measurements.
 */
interface Indexes {
  readonly provenance: Registry<TracedWire>;
  readonly citations: Registry<Citation>;
}

// ---------------------------------------------------------------------------
// Value rendering
// ---------------------------------------------------------------------------

/**
 * Render one traced value with its uncertainty state, unit and provenance
 * footnote. This is the only path by which a number reaches the page.
 */
function value(wire: TracedWire, indexes: Indexes): string {
  const treatment = treatmentFor(wire.renderHint);
  const ordinal = indexes.provenance.ordinal(wire.node, wire);
  const glyph = treatment.glyph
    ? `<span class="glyph" aria-hidden="true">${esc(treatment.glyph)}</span>`
    : '';
  const badge =
    wire.renderHint === RenderHint.USER_BADGE ? '<span class="badge">USER</span>' : '';
  const unit = wire.unit !== undefined ? `<span class="unit"> ${esc(wire.unit)}</span>` : '';
  return (
    `<span class="qty ${treatment.className}">${glyph}` +
    `<span class="num">${esc(groupDigits(wire.value))}</span>${unit}${badge}` +
    `<span class="sr-only"> (${esc(treatment.label)})</span>` +
    `<sup class="fn"><a id="fnref-${ordinal}" href="#fn-${ordinal}">${ordinal}</a></sup></span>`
  );
}

/**
 * A magnitude that carries no provenance marker, because it has no provenance of
 * its own to carry.
 *
 * These mirror `core`'s untraced companion fields — `BindingConstraint.valueM`,
 * `CapacityResult.headroomToNextM2`, `integerGranularityLossM2`, the per-edge
 * setback lengths — which restate a magnitude already traced elsewhere rather
 * than constituting a new emitted value. Rendering them in a provenance state
 * they do not have would be the report asserting evidence nobody produced, so
 * they get a deliberately neutral treatment: no glyph, no field, no footnote.
 * That is a real gap in the model, not a rendering shortcut, and it is worth
 * closing upstream when those fields become `Traced` in `core`.
 */
function plain(text: string, unit?: string): string {
  const suffix = unit !== undefined ? `<span class="unit"> ${esc(unit)}</span>` : '';
  return `<span class="qty v-plain"><span class="num">${esc(groupDigits(text))}</span>${suffix}</span>`;
}

/** A short citation marker; the full clause goes in the citations appendix. */
function cite(citation: Citation | null, indexes: Indexes): string {
  if (citation === null) return notAssessedChip('no citation');
  const key = `${citation.instrumentId}|${citation.instrumentVersion}|${citation.clauseReference}|${citation.sourcePage}`;
  const ordinal = indexes.citations.ordinal(key, citation);
  return (
    `<a class="cite" href="#cite-${ordinal}">` +
    `${esc(citation.instrumentId)} ${esc(citation.clauseReference)} <span class="cite-n">[C${ordinal}]</span></a>`
  );
}

/** Grey, hatched, and labelled — §20.3's treatment for anything not assessed. */
function notAssessedChip(label = 'not assessed'): string {
  return `<span class="chip hatched"><span class="glyph" aria-hidden="true">–</span>${esc(
    label.toUpperCase(),
  )}</span>`;
}

// ---------------------------------------------------------------------------
// Small structural helpers
// ---------------------------------------------------------------------------

/**
 * A data table.
 *
 * Every column header is `scope="col"` and the first cell of every row is
 * `<th scope="row">`, so a screen reader announces "Rule R-SETBACK-ROAD,
 * disposition superseded" rather than reading a wall of unattached cells. The
 * `<caption>` is the accessible name; it is not decorative and is never omitted.
 */
function table(
  caption: string,
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): string {
  const head = headers.map((header) => `<th scope="col">${esc(header)}</th>`).join('');
  const body = rows
    .map((cells) => {
      const [first, ...rest] = cells;
      return (
        `<tr><th scope="row">${first ?? ''}</th>` +
        rest.map((cell) => `<td>${cell}</td>`).join('') +
        `</tr>`
      );
    })
    .join('');
  return (
    `<table><caption>${esc(caption)}</caption>` +
    `<thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
  );
}

function definitionRows(rows: readonly (readonly [string, string])[]): string {
  return rows
    .map(([term, description]) => `<div class="dl-row"><dt>${esc(term)}</dt><dd>${description}</dd></div>`)
    .join('');
}

function bandLetter(band: CapacityBand): string {
  switch (band) {
    case CapacityBand.REGULATORY:
      return 'A';
    case CapacityBand.GEOMETRIC:
      return 'B';
    case CapacityBand.PARKING:
      return 'C';
    default: {
      const unreachable: never = band;
      throw new Error(`unhandled capacity band ${String(unreachable)}`);
    }
  }
}

interface InvariantTreatment {
  readonly className: string;
  readonly glyph: string;
  readonly label: string;
}

function invariantTreatment(status: InvariantStatus): InvariantTreatment {
  switch (status) {
    case InvariantStatus.PASS:
      return { className: 'inv-pass', glyph: '✓', label: 'PASS' };
    case InvariantStatus.FAIL:
      // Unreachable through a public entry point: `assertEmittable` refuses a run
      // with any FAIL before rendering starts (§12.3). Kept so the switch stays
      // total and so the treatment exists if this is ever rendered in a triage view.
      return { className: 'inv-fail', glyph: '✗', label: 'FAIL' };
    case InvariantStatus.NOT_APPLICABLE:
      return { className: 'inv-na', glyph: '—', label: 'NOT APPLICABLE' };
    case InvariantStatus.NOT_ASSESSED:
      return { className: 'inv-not-assessed hatched', glyph: '–', label: 'NOT ASSESSED' };
    default: {
      const unreachable: never = status;
      throw new Error(`unhandled invariant status ${String(unreachable)}`);
    }
  }
}

function dispositionLabel(disposition: RuleDisposition): string {
  switch (disposition) {
    case RuleDisposition.APPLIED:
      return 'Applied';
    case RuleDisposition.NOT_APPLICABLE:
      return 'Not applicable';
    case RuleDisposition.SUPERSEDED:
      return 'Superseded';
    case RuleDisposition.DEFERRED:
      return 'Deferred';
    case RuleDisposition.NOT_APPROVED:
      return 'Not approved';
    case RuleDisposition.OUT_OF_SCOPE:
      return 'Out of scope';
    default: {
      const unreachable: never = disposition;
      throw new Error(`unhandled rule disposition ${String(unreachable)}`);
    }
  }
}

function binding(constraint: BindingConstraintView, indexes: Indexes): string {
  const runnerUp =
    constraint.runnerUp === null
      ? ''
      : `<div class="runner-up">Runner-up: ${esc(constraint.runnerUp.label)} ` +
        `(${esc(constraint.runnerUp.ruleId)}) at ${plain(constraint.runnerUp.value, constraint.unit)}` +
        (constraint.runnerUp.withinOnePercent
          ? ' <strong class="near-tie">— binds within 1%</strong>'
          : '') +
        '</div>';
  return (
    `<div class="binding"><span class="binding-label">${esc(constraint.label)}</span> ` +
    `<span class="rule-id">${esc(constraint.ruleId)}</span> ` +
    `${plain(constraint.value, constraint.unit)} ${cite(constraint.citation, indexes)}` +
    `${runnerUp}</div>`
  );
}

// ---------------------------------------------------------------------------
// Stylesheet
// ---------------------------------------------------------------------------

/**
 * The whole stylesheet, inline.
 *
 * Type scale is set in `rem` against a root that is 16 px on screen — the
 * accessibility floor for body text — and 10.5 pt in print, which is the size a
 * dense financial document is set at. One scale, two media, no second set of
 * numbers to keep in step.
 *
 * The font stacks name faces likely to be installed and then fall through to a
 * generic, because a headless Chromium container often has neither Charter nor
 * Segoe UI and must still lay the document out predictably. No `@font-face`, so
 * nothing is fetched.
 */
const STYLESHEET = `
:root {
  --ink: #14171c;
  --ink-2: #4a515c;
  --ink-3: #6b7280;
  --rule: #c9ced8;
  --rule-strong: #7b8494;
  --paper: #ffffff;
  --surface: #f4f5f7;
  --assumed-bg: #fdf0d2;
  --assumed-ink: #5a3a00;
  --assumed-edge: #9a6b12;
  --user-bg: #e7edf8;
  --user-ink: #1c3b74;
  --user-edge: #4a6ea8;
  --variance-bg: #fbeceb;
  --variance-ink: #7a1a17;
  --variance-edge: #a4231f;
  --hatch: #9aa1ad;
  --pass-ink: #14532d;
  --fail-ink: #7f1d1d;
  --font-body: "Charter", "Sitka Text", Cambria, Georgia, "Times New Roman", serif;
  --font-ui: "Inter", "Segoe UI", -apple-system, "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, "Cascadia Mono", Consolas, "Liberation Mono", monospace;
  --space: 4px;
}

* { box-sizing: border-box; }

html { font-size: 16px; }

body {
  margin: 0;
  padding: 0 24px 96px;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 1.55;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

main { max-width: 190mm; margin: 0 auto; }

h1, h2, h3, h4 { font-family: var(--font-ui); line-height: 1.25; margin: 0 0 calc(var(--space) * 2); }
h1 { font-size: 1.9rem; font-weight: 700; letter-spacing: -0.015em; }
h2 { font-size: 1.3rem; font-weight: 650; margin-top: calc(var(--space) * 8); padding-bottom: calc(var(--space) * 2); border-bottom: 2px solid var(--ink); }
h3 { font-size: 1.02rem; font-weight: 650; margin-top: calc(var(--space) * 6); }
h4 { font-size: 0.92rem; font-weight: 650; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-2); }
p { margin: 0 0 calc(var(--space) * 3); max-width: 68ch; }
.lede { font-size: 1.06rem; color: var(--ink-2); }
.note { font-size: 0.86rem; color: var(--ink-2); max-width: 74ch; }

.eyebrow {
  font-family: var(--font-ui); font-size: 0.72rem; font-weight: 650;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-3);
  margin: 0 0 calc(var(--space) * 2);
}

.skip-link {
  position: absolute; left: -9999px; top: 0;
  background: var(--ink); color: var(--paper); padding: 8px 14px; z-index: 10;
}
.skip-link:focus { left: 8px; }
a { color: inherit; }
a:focus-visible { outline: 3px solid var(--user-edge); outline-offset: 2px; }

.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

/* --- Quantities and uncertainty states (PRD §13.1, §20.3) ---------------- */

.qty {
  font-family: var(--font-ui);
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
  white-space: nowrap;
}
.qty .num { font-weight: 600; }
.qty .unit { font-weight: 400; color: var(--ink-2); }
.qty .glyph { font-size: 0.72em; margin-right: 0.28em; vertical-align: 0.08em; }

.v-derived { color: var(--ink); }

/* The amber ASSUMED treatment. Colour AND a dotted underline AND a glyph — it
   must still read as "assumed" after a greyscale photocopy. §13.1. */
.v-assumed {
  background: var(--assumed-bg);
  color: var(--assumed-ink);
  border-bottom: 2px dotted var(--assumed-edge);
  padding: 1px 4px 0;
  border-radius: 2px;
}

.v-user {
  background: var(--user-bg);
  color: var(--user-ink);
  border-bottom: 2px solid var(--user-edge);
  padding: 1px 4px 0;
  border-radius: 2px;
}

.v-variance {
  background: var(--variance-bg);
  color: var(--variance-ink);
  border: 2px solid var(--variance-edge);
  padding: 0 4px;
  border-radius: 2px;
}

.v-deferred { color: var(--ink-2); }

/* A figure with no provenance of its own — see plain(). Deliberately unmarked. */
.v-plain { color: var(--ink); }

.badge {
  font-family: var(--font-ui); font-size: 0.62rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  border: 1px solid var(--user-edge); border-radius: 2px;
  padding: 0 3px; margin-left: 5px; vertical-align: 0.12em;
}

.chip {
  display: inline-block; font-family: var(--font-ui); font-size: 0.68rem;
  font-weight: 650; letter-spacing: 0.07em; text-transform: uppercase;
  border: 1px solid var(--rule-strong); border-radius: 2px;
  padding: 1px 6px; color: var(--ink-2);
}

/* Grey hatching for deferred / not assessed. The stripes are the cue that
   survives both greyscale and a colour-blind reader (§20.3).

   The hatch lives in a swatch beside the label rather than behind it: hatching
   under text costs contrast, and a treatment that fails WCAG 1.4.3 in order to
   satisfy §20.3 has traded one accessibility requirement for another. Swatch
   plus the words NOT ASSESSED gives both. */
.hatched { background-color: var(--surface); }
.hatched::before {
  content: "";
  display: inline-block;
  width: 15px;
  height: 0.74em;
  margin-right: 6px;
  vertical-align: -0.08em;
  border: 1px solid var(--rule-strong);
  background-color: var(--paper);
  background-image: repeating-linear-gradient(
    45deg, transparent 0 3px, var(--hatch) 3px 4px
  );
}

sup.fn { font-family: var(--font-ui); font-size: 0.62rem; font-weight: 650; margin-left: 2px; }
sup.fn a { text-decoration: none; color: var(--ink-3); }
.cite { font-family: var(--font-ui); font-size: 0.78rem; color: var(--ink-2); text-decoration: none; }
.cite-n { color: var(--ink-3); }
.rule-id { font-family: var(--font-mono); font-size: 0.78rem; color: var(--ink-2); }
.mono { font-family: var(--font-mono); font-size: 0.82rem; overflow-wrap: anywhere; }

/* --- Tables -------------------------------------------------------------- */

table { width: 100%; border-collapse: collapse; margin: calc(var(--space) * 3) 0 calc(var(--space) * 6); font-size: 0.86rem; }
caption {
  font-family: var(--font-ui); font-size: 0.72rem; font-weight: 650;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-3);
  text-align: left; padding-bottom: calc(var(--space) * 2);
}
thead { display: table-header-group; }
tr { break-inside: avoid; page-break-inside: avoid; }
th, td { text-align: left; vertical-align: top; padding: 7px 10px 7px 0; border-bottom: 1px solid var(--rule); }
thead th { font-family: var(--font-ui); font-size: 0.72rem; font-weight: 650; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-2); border-bottom: 1px solid var(--rule-strong); }
tbody th { font-family: var(--font-body); font-size: 1em; font-weight: 400; letter-spacing: 0; text-transform: none; color: var(--ink); }
tbody tr:last-child th, tbody tr:last-child td { border-bottom: 1px solid var(--rule-strong); }
td ul { margin: 0; padding-left: 16px; }

/* --- Blocks -------------------------------------------------------------- */

section { break-before: page; page-break-before: always; }
section.first { break-before: auto; page-break-before: auto; }

.banner {
  border: 2px solid var(--variance-edge);
  background: var(--variance-bg);
  color: var(--variance-ink);
  padding: 12px 14px;
  margin: 0 0 calc(var(--space) * 5);
  break-inside: avoid;
}
.banner h2, .banner .banner-title {
  font-family: var(--font-ui); font-size: 0.82rem; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 6px;
  border: 0; padding: 0;
}
.banner p { margin: 0; font-size: 0.9rem; max-width: none; }

.banner-amber {
  border-color: var(--assumed-edge);
  background: var(--assumed-bg);
  color: var(--assumed-ink);
}

.permanent-claim {
  border: 2px solid var(--ink);
  padding: 10px 14px;
  margin: calc(var(--space) * 5) 0;
  font-family: var(--font-ui);
  font-size: 0.82rem;
  font-weight: 650;
  letter-spacing: 0.04em;
  break-inside: avoid;
}

.card {
  border: 1px solid var(--rule-strong);
  padding: 14px 16px;
  margin: 0 0 calc(var(--space) * 4);
  break-inside: avoid;
  page-break-inside: avoid;
}
.card.governing { border-width: 2px; border-color: var(--ink); }
.card-head { display: flex; justify-content: space-between; gap: 16px; align-items: baseline; }
.headline { font-family: var(--font-ui); font-size: 2.1rem; font-weight: 700; letter-spacing: -0.02em; }

dl { margin: 0; }
.dl-row { display: grid; grid-template-columns: 62mm 1fr; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--rule); break-inside: avoid; }
dt { font-family: var(--font-ui); font-size: 0.76rem; font-weight: 650; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink-2); }
dd { margin: 0; }

.legend { margin: calc(var(--space) * 3) 0; }
.legend-item { display: grid; grid-template-columns: 46mm 1fr; gap: 14px; align-items: baseline; padding: 8px 0; border-bottom: 1px solid var(--rule); break-inside: avoid; }
.legend-item .desc { font-size: 0.84rem; color: var(--ink-2); }

.binding { font-size: 0.86rem; }
.binding-label { font-family: var(--font-ui); font-weight: 650; }
.runner-up { color: var(--ink-2); font-size: 0.82rem; margin-top: 3px; }
.near-tie { color: var(--variance-ink); }

.verbatim { font-size: 0.82rem; color: var(--ink-2); border-left: 3px solid var(--rule-strong); padding-left: 10px; margin: 4px 0 0; }

.claim { border-top: 1px solid var(--rule-strong); padding: 12px 0; break-inside: avoid; }
.claim-name { font-family: var(--font-ui); font-size: 0.78rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
.claim-text { margin: 4px 0 0; max-width: 74ch; }
.claim-status { font-family: var(--font-ui); font-size: 0.8rem; font-weight: 650; margin-top: 5px; }
.claim.permanent { border: 2px solid var(--ink); padding: 12px 14px; }

.inv-pass { color: var(--pass-ink); font-weight: 650; }
.inv-fail { color: var(--fail-ink); font-weight: 700; }
.inv-na { color: var(--ink-3); }
.inv-not-assessed { color: var(--ink-2); font-weight: 650; padding: 1px 6px; }

.running-footer {
  margin-top: 32px;
  padding-top: 8px;
  border-top: 1px solid var(--rule-strong);
  font-family: var(--font-ui);
  font-size: 0.68rem;
  color: var(--ink-2);
  display: flex;
  flex-wrap: wrap;
  gap: 4px 18px;
}

@media print {
  @page { size: A4; margin: 16mm 15mm 24mm; }
  html { font-size: 10.5pt; }
  body { padding: 0; }
  /* Chromium repeats a fixed element on every printed page. The negative offset
     parks it inside the page's bottom margin, which the 24mm reserves. */
  .running-footer {
    position: fixed;
    left: 0; right: 0; bottom: -14mm;
    margin: 0;
    background: var(--paper);
  }
  a { text-decoration: none; }
  .skip-link { display: none; }
}
`;

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function facePage(run: RunReport, indexes: Indexes): string {
  const annexNotice = unsignedAnnexNotice();
  // SEED_RULES_WARNING is the first thing in the document body when the run was
  // computed on DRAFT rules, ahead of the plot name and the headline figure. A
  // warning below the number it qualifies is a warning that has already failed.
  const draft =
    run.ruleSet.approval === RuleSetApproval.DRAFT
      ? `<div class="banner"><p class="banner-title">SEED_RULES_WARNING</p>` +
        `<p>${esc(run.ruleSet.warning)}</p></div>`
      : '';
  const unsigned =
    annexNotice === null
      ? ''
      : `<div class="banner banner-amber"><p class="banner-title">Unsigned metric definitions annex</p>` +
        `<p>${esc(annexNotice)}</p></div>`;

  const reviewer =
    run.reviewer === null
      ? `${notAssessedChip('no named reviewer')} <span class="note">Gate G4 (§21.1) blocks external sharing until a person accepts this output.</span>`
      : `${esc(run.reviewer.name)} — ${esc(run.reviewer.role)}, ${esc(run.reviewer.acknowledgedAt)}`;

  const parkingProvenance = `${value(run.parkingInFar.value, indexes)} ${cite(
    run.parkingInFar.citation,
    indexes,
  )}${run.parkingInFar.declaredBy === null ? '' : ` <span class="note">declared by ${esc(run.parkingInFar.declaredBy)}</span>`}`;

  const statedArea =
    run.plot.statedAreaM2 === null
      ? notAssessedChip('not on the affection plan')
      : plain(run.plot.statedAreaM2, 'm²');

  const mismatch = run.plot.areaMismatch
    ? `<p class="note"><strong>Stated and computed plot areas deviate by more than 2%</strong> ` +
      `(<code>FR-PLT-001 AC2</code>). Every area below is computed from the boundary as entered, not from the stated area.</p>`
    : '';

  return (
    `<section class="first" data-prd="face">` +
    draft +
    unsigned +
    `<p class="eyebrow">Development capacity — Phase 0 engine output</p>` +
    `<h1>Plot ${esc(run.plot.plotNumber)}, ${esc(run.plot.community)}</h1>` +
    `<p class="lede">Governing capacity is band ${esc(bandLetter(run.capacity.governingBand))} — ` +
    `${esc(run.capacity.governingBand.toLowerCase())}-limited.</p>` +
    `<p class="headline">${value(run.capacity.governingGfa, indexes)}</p>` +
    `<div class="card"><h3>Governing constraint</h3>${binding(run.capacity.governingConstraint, indexes)}</div>` +
    `<div class="permanent-claim">REGULATORY VALIDITY: NOT ASSESSED. ` +
    `${esc(CLAIM_STATEMENT_VERBATIM.REGULATORY_VALIDITY)}</div>` +
    `<h2>Run identity and versions</h2>` +
    `<dl>` +
    definitionRows([
      ['Run id', `<span class="mono">${esc(run.runId)}</span>`],
      ['Produced at', esc(run.producedAt)],
      ['Engine version', `<span class="mono">${esc(run.engineVersion)}</span>`],
      [
        'Metric definitions annex',
        `<span class="mono">${esc(run.metricDefinitionsVersion)}</span>` +
          (annexNotice === null ? '' : ` ${notAssessedChip('unsigned')}`),
      ],
      [
        'Rule set',
        `<span class="mono">${esc(run.ruleSet.ruleSetVersion)}</span> · ` +
          `content hash <span class="mono">${esc(run.ruleSet.contentHash)}</span> · ` +
          `${esc(run.ruleSet.approval)}`,
      ],
      ['Parking-in-FAR treatment', `${esc(run.parkingInFar.treatment)} — ${parkingProvenance}`],
      ['Named reviewer (G4)', reviewer],
      ['Land use', esc(run.plot.landUse)],
      ['Shape class', esc(run.plot.shapeClass)],
      ['Plot area, stated', statedArea],
      ['Plot area, computed', plain(run.plot.computedAreaM2, 'm²')],
    ]) +
    `</dl>` +
    mismatch +
    `<h3>Professional-use disclaimer</h3><p class="note">${esc(run.disclaimer)}</p>` +
    `</section>`
  );
}

/**
 * The legend.
 *
 * Not decoration and not filler: it is what makes the four uncertainty states
 * legible to a reader who was not in the room, and to one holding a greyscale
 * photocopy. §13.1's mitigation only works if the marks are readable.
 */
function legend(): string {
  return (
    `<section data-prd="legend"><h2>How to read this report</h2>` +
    `<p>Every figure carries the class of evidence behind it. The distinction between a value ` +
    `a regulation determines and a value this engine assumed is the most important thing on ` +
    `these pages, so it is marked twice — once in colour and once in a way that survives a ` +
    `greyscale copy.</p>` +
    `<div class="legend">` +
    `<div class="legend-item"><span class="qty v-derived"><span class="num">1,625.00</span><span class="unit"> m²</span><sup class="fn">n</sup></span>` +
    `<span class="desc"><strong>Derived.</strong> Computed from a cited rule. The superscript resolves to the derivation index; the citation names the clause.</span></div>` +
    `<div class="legend-item"><span class="qty v-assumed"><span class="glyph" aria-hidden="true">◆</span><span class="num">32.00</span><span class="unit"> m²</span></span>` +
    `<span class="desc"><strong>Assumed.</strong> No rule governs this value; the engine declared one, with a basis and a measured sensitivity. Amber field, dotted underline, ◆ marker. Every assumption is listed and ranked in §5.</span></div>` +
    `<div class="legend-item"><span class="qty v-user"><span class="num">1.00</span><span class="badge">USER</span></span>` +
    `<span class="desc"><strong>User-set.</strong> Supplied or overridden by a named person, whose identity is in the derivation index.</span></div>` +
    `<div class="legend-item">${notAssessedChip()}` +
    `<span class="desc"><strong>Not assessed.</strong> Applicable and not checked at this fidelity. Grey hatching, never a blank cell — an absent row reads as a row that passed.</span></div>` +
    `</div>` +
    `<p class="note">No value in this report is a system estimate presented as a fact. Where the ` +
    `engine could not determine something, it says so rather than choosing a number.</p>` +
    `</section>`
  );
}

function envelopeSection(run: RunReport, indexes: Indexes): string {
  const dimensionRows = run.envelope.dimensions.map((dimension) => [
    `<strong>${esc(dimension.label)}</strong>` +
      (dimension.metricId === null
        ? ''
        : `<div class="note">measured as ${esc(metric(dimension.metricId).name)}</div>`),
    value(dimension.value, indexes),
    binding(dimension.binding, indexes),
  ]);

  const edgeRows = run.envelope.edges.map((edge) => [
    `${edge.seq}`,
    esc(edge.classification) + (edge.roadHierarchy === null ? '' : ` · ${esc(edge.roadHierarchy)}`),
    plain(edge.lengthM, 'm'),
    plain(edge.appliedSetbackM, 'm'),
    `<span class="rule-id">${esc(edge.setbackRuleId)}</span>`,
  ]);

  const fixpoint = run.envelope.fixpointConverged
    ? `<p class="note">The setback↔floor-count fixpoint settled in ${run.envelope.fixpointIterations} ` +
      `iteration(s). The setback tier that produced this footprint depends on the level count the ` +
      `footprint permits, so the two were solved jointly rather than in one pass — see §11.7. ` +
      `<code>FR-PLT-002</code> specifies a one-directional pipeline, which cannot compute this ` +
      `case; the deviation is deliberate and recorded in <code>docs/03-analysis/open-questions.md</code>.</p>`
    : `<p class="note">${notAssessedChip('fixpoint did not converge')} The applicable rule set ` +
      `oscillated across a threshold. §11.7 step 5: the system does not choose — a declared level ` +
      `basis is required before these figures may be relied upon.</p>`;

  return (
    `<section data-prd="3.4-1"><h2>1 · Buildable envelope</h2>` +
    `<p>Each dimension is reported with the constraint that binds it. Where a second constraint ` +
    `binds within 1%, both are named — <code>FR-CAP-001</code> — because a near-tie is where a ` +
    `variance is worth pursuing.</p>` +
    table(
      'Envelope dimensions and their binding constraints',
      ['Dimension', 'Value', 'Binding constraint'],
      dimensionRows,
    ) +
    `<h3>Per-edge setbacks applied</h3>` +
    `<p class="note">Edge classification is mandatory for every edge and has no default — ` +
    `<code>FR-PLT-001 AC3</code>.</p>` +
    table(
      'Setback applied to each plot edge',
      ['Edge', 'Classification', 'Length', 'Setback applied', 'Rule'],
      edgeRows,
    ) +
    fixpoint +
    `</section>`
  );
}

function capacitySection(run: RunReport, indexes: Indexes): string {
  const cards = run.capacity.bands
    .map((band) => {
      const inputs = band.inputs
        .map((input) => `<div class="dl-row"><dt>${esc(input.name)}</dt><dd>${value(input.value, indexes)}</dd></div>`)
        .join('');
      return (
        `<div class="card${band.governing ? ' governing' : ''}">` +
        `<div class="card-head"><h3>Band ${esc(bandLetter(band.band))} · ${esc(band.label)}</h3>` +
        `<div>${value(band.gfa, indexes)}</div></div>` +
        `<p class="note">${esc(band.question)}</p>` +
        `<h4>Derivation</h4><p class="mono">${esc(band.derivation)}</p>` +
        `<dl>${inputs}</dl>` +
        `<p class="note">Measured as ${esc(metric(band.metricId).name)} (${esc(band.metricId)}).` +
        (band.governing ? ' <strong>This band governs.</strong>' : '') +
        `</p></div>`
      );
    })
    .join('');

  return (
    `<section data-prd="3.4-2"><h2>2 · Capacity bands A, B and C</h2>` +
    `<p>Three capacity concepts, never merged and never averaged — Principle 6, §15.1. Each has ` +
    `its own derivation and its own field. Governing capacity is <code>min(A, B, C)</code>, named ` +
    `and cited.</p>` +
    cards +
    `<h3>Governing band and headroom</h3>` +
    `<dl>` +
    definitionRows([
      [
        'Governing band',
        `Band ${esc(bandLetter(run.capacity.governingBand))} — ${esc(run.capacity.governingBand)}`,
      ],
      ['Governing GFA', value(run.capacity.governingGfa, indexes)],
      ['Binding constraint', binding(run.capacity.governingConstraint, indexes)],
      [
        'Next binding band',
        `Band ${esc(bandLetter(run.capacity.nextBindingBand))} — ${esc(run.capacity.nextBindingBand)}`,
      ],
      ['Headroom to next band', plain(run.capacity.headroomToNextM2, 'm²')],
      ['Levels', value(run.capacity.levels, indexes)],
      ['Integer granularity loss', plain(run.capacity.integerGranularityLossM2, 'm²')],
      ['User realism discount', value(run.capacity.userRealismDiscount, indexes)],
    ]) +
    `</dl>` +
    `<p class="note"><strong>Headroom</strong> is reported because it is what tells a developer ` +
    `where to push (§15.2). <strong>Integer granularity loss</strong> is the permitted area that ` +
    `no integer number of floors can consume; §15.4 requires it to be reported rather than ` +
    `absorbed into the headline.</p>` +
    `<p class="note"><strong>There is no realistic, expected or likely capacity band, here or ` +
    `anywhere in this product.</strong> §15.3 — its absence is enforced by schema; the field does ` +
    `not exist. The honest substitute is the user realism discount above: a multiplier the user ` +
    `sets, defaulting to 1.00, attributed to them and never to the engine. Manufacturing a ` +
    `"realistic" band from an unvalidated heuristic would be the single most damaging thing this ` +
    `product could do, because it is the number a customer would act on and the one they cannot ` +
    `check.</p>` +
    `</section>`
  );
}

function parkingSection(run: RunReport, indexes: Indexes): string {
  const citations = run.parking.ratioCitations
    .map((citation) => cite(citation, indexes))
    .join(' · ');
  return (
    `<section data-prd="3.4-3"><h2>3 · Parking</h2>` +
    `<p>Demand, area, level count and headroom, with the ratios cited.</p>` +
    `<dl>` +
    definitionRows([
      ['Resident bays', value(run.parking.residentBays, indexes)],
      ['Visitor bays', value(run.parking.visitorBays, indexes)],
      ['Total bays required', value(run.parking.totalBays, indexes)],
      ['Bay area factor', value(run.parking.bayAreaFactorM2, indexes)],
      ['Parking area required', value(run.parking.requiredAreaM2, indexes)],
      ['Area available per level', value(run.parking.availableAreaPerLevelM2, indexes)],
      ['Levels required', value(run.parking.levelsRequired, indexes)],
      ['Levels available', value(run.parking.levelsAvailable, indexes)],
      ['Headroom', plain(run.parking.headroomBays, 'bays')],
      ['Supportable unit ceiling', value(run.parking.supportableUnitCeiling, indexes)],
      [
        'Ratios cited',
        citations === '' ? notAssessedChip('no cited ratio') : citations,
      ],
    ]) +
    `</dl>` +
    `<h3>Podium implication</h3><p>${esc(run.parking.podiumImplication)}</p>` +
    `<p class="note">Parking area is measured as ` +
    `${run.parking.metricIds.map((id) => `${esc(metric(id).name)} (${esc(id)})`).join(', ')}. ` +
    `Whether it counts toward FAR is declared on the face page and is not a default: ` +
    `<code>FR-DEF-002</code> forbids one, because the choice swings capacity by 15–35%.</p>` +
    `</section>`
  );
}

function rulesSection(run: RunReport, indexes: Indexes): string {
  const appliedRows = run.rules.applied.map((rule) => [
    `<span class="rule-id">${esc(rule.ruleId)}</span><div>${esc(rule.label)}</div>`,
    `<span class="mono">${esc(rule.parameterId)}</span>`,
    `${esc(rule.value)}${rule.unit === null ? '' : ` <span class="unit">${esc(rule.unit)}</span>`}`,
    esc(rule.ruleClass),
    cite(rule.citation, indexes),
  ]);

  const excludedRows = run.rules.excluded.map((rule) => [
    `<span class="rule-id">${esc(rule.ruleId)}</span><div>${esc(rule.label)}</div>`,
    `<span class="mono">${esc(rule.parameterId)}</span>`,
    esc(dispositionLabel(rule.disposition)) +
      (rule.supersededByRuleId === null
        ? ''
        : ` <span class="rule-id">→ ${esc(rule.supersededByRuleId)}</span>`),
    esc(rule.reason),
    cite(rule.citation, indexes),
  ]);

  return (
    `<section data-prd="3.4-4"><h2>4 · Rules applied, and rules considered and excluded</h2>` +
    `<p>Every rule that governed a value, and every rule that was considered and did not. §11.5 ` +
    `step 3 requires non-governing candidates to stay visible: a list of what applied cannot be ` +
    `audited for what was missed, and what was missed is the whole of the rule-coverage claim.</p>` +
    `<p class="note">Rules encoded: ${run.rules.encodedCount}. Requirements identified as ` +
    `applicable: ${run.rules.identifiedApplicableCount}. Deferred: ${run.rules.deferredCount}. ` +
    `The coverage fraction is stated once, in the five-way claim statement in §7, so that two ` +
    `figures for the same thing cannot appear on different pages.</p>` +
    table(
      'Rules applied',
      ['Rule', 'Parameter', 'Value', 'Class', 'Source'],
      appliedRows,
    ) +
    `<h3>Considered and excluded</h3>` +
    table(
      'Rules considered and excluded, with reasons',
      ['Rule', 'Parameter', 'Disposition', 'Reason', 'Source'],
      excludedRows,
    ) +
    `</section>`
  );
}

function assumptionsSection(
  assumptions: readonly AssumptionEntry[],
  indexes: Indexes,
): string {
  // Ordered by the engine's supplied rank. Comparing given ordinals is
  // presentation; comparing `relativeEffect` magnitudes would be arithmetic,
  // and this package does none.
  const ordered = [...assumptions].sort((a, b) => a.rank - b.rank);
  const rows = ordered.map((assumption) => [
    `${assumption.rank}`,
    `<strong>${esc(assumption.label)}</strong><div class="mono">${esc(assumption.parameterId)}</div>`,
    value(assumption.value, indexes),
    esc(assumption.basis),
    `${esc(assumption.perturbation)} → ${esc(assumption.impactStatement)}`,
  ]);

  const empty =
    ordered.length === 0
      ? `<p class="note">${notAssessedChip('no assumptions declared')} Every value in this run ` +
        `traces to a cited rule or to a named user.</p>`
      : '';

  return (
    `<section data-prd="3.4-5"><h2>5 · Assumption register</h2>` +
    `<p>Ranked by measured sensitivity: the assumption at rank 1 moves governing capacity more ` +
    `than any other. Each entry states what was assumed, why, and what changes if it is wrong. ` +
    `This is the section that establishes the engine is not magic — §20.2 — and it is why the ` +
    `amber marking appears on the figure everywhere it is used, not only here.</p>` +
    empty +
    (ordered.length === 0
      ? ''
      : table(
          'Assumption register, sensitivity-ranked',
          ['Rank', 'Assumption', 'Value', 'Basis', 'Perturbation and impact'],
          rows,
        )) +
    `<p class="note">An assumption without a basis is not an assumption, it is a guess; the ` +
    `engine cannot construct one — <code>Tracer.assumed</code> requires the basis string. Edit ` +
    `any of these in the application and every figure derived from it recomputes.</p>` +
    `</section>`
  );
}

function invariantsSection(invariants: readonly InvariantOutcome[]): string {
  const rows = invariants.map((outcome) => {
    const treatment = invariantTreatment(outcome.status);
    return [
      `<span class="rule-id">${esc(outcome.invariantId)}</span>`,
      esc(outcome.statement),
      esc(outcome.tolerance),
      `<span class="${treatment.className}"><span class="glyph" aria-hidden="true">${esc(
        treatment.glyph,
      )}</span> ${esc(treatment.label)}</span>`,
      outcome.observed === null && outcome.expected === null
        ? esc(outcome.detail)
        : `${outcome.observed === null ? '—' : plain(outcome.observed)} vs ` +
          `${outcome.expected === null ? '—' : plain(outcome.expected)}` +
          (outcome.detail === '' ? '' : `<div class="note">${esc(outcome.detail)}</div>`),
    ];
  });

  const notAssessed = invariants.filter(
    (outcome) => outcome.status === InvariantStatus.NOT_ASSESSED,
  );

  return (
    `<section data-prd="3.4-6"><h2>6 · Invariant results</h2>` +
    `<p>Conservation laws, not constraints. Constraint checking asks "is this permitted?"; ` +
    `invariant checking asks "does this arithmetic close?" — only the second catches a ` +
    `configuration that is impossible rather than impermissible (§12.1). The invariant layer is a ` +
    `separate module that cannot import the capacity engine, and a failure blocks emission: this ` +
    `report cannot be produced with a failing invariant in it.</p>` +
    table(
      'Invariant check results',
      ['ID', 'Invariant', 'Tolerance', 'Result', 'Observed vs expected'],
      rows,
    ) +
    (notAssessed.length === 0
      ? ''
      : `<p class="note"><strong>${notAssessed.length} invariant(s) were not assessed</strong> ` +
        `(${notAssessed.map((outcome) => esc(outcome.invariantId)).join(', ')}). They depend on a ` +
        `unit schedule Phase 0 does not generate. They are shown hatched rather than omitted, ` +
        `because a missing row reads as a row that passed.</p>`) +
    `<p class="note">Passing every invariant establishes arithmetic coherence and nothing else. ` +
    `A configuration can pass all of them and be entirely non-compliant — §12.4.</p>` +
    `</section>`
  );
}

function claimSection(run: RunReport): string {
  const line = (
    name: string,
    verbatim: string,
    status: ClaimStatus,
    detail: string,
    permanent = false,
  ): string =>
    `<div class="claim${permanent ? ' permanent' : ''}">` +
    `<div class="claim-name">${esc(name)}</div>` +
    `<p class="claim-text">${esc(verbatim)}</p>` +
    (permanent
      ? ''
      : `<div class="claim-status">Status: ${esc(status)} — ${esc(detail)}</div>`) +
    `</div>`;

  return (
    `<section data-prd="3.4-7"><h2>7 · Validation — the five-way claim statement</h2>` +
    `<p>Principle 8 requires these five statements to appear separately and verbatim. They are ` +
    `part of the template, not a disclaimer someone can delete, because the validator agreeing ` +
    `with the generator is self-consistency and nothing more (Principle 7, §16.4).</p>` +
    line(
      'Self-consistency',
      CLAIM_STATEMENT_VERBATIM.SELF_CONSISTENCY,
      run.claim.selfConsistency.status,
      run.claim.selfConsistency.detail,
    ) +
    line(
      'Rule coverage',
      CLAIM_STATEMENT_VERBATIM.RULE_COVERAGE,
      run.claim.ruleCoverage.status,
      run.claim.ruleCoverage.detail,
    ) +
    line(
      'Geometric validity',
      CLAIM_STATEMENT_VERBATIM.GEOMETRIC_VALIDITY,
      run.claim.geometricValidity.status,
      run.claim.geometricValidity.detail,
    ) +
    line(
      'Regulatory validity',
      CLAIM_STATEMENT_VERBATIM.REGULATORY_VALIDITY,
      ClaimStatus.NEVER_CLAIMED,
      '',
      true,
    ) +
    line(
      'Professional agreement',
      CLAIM_STATEMENT_VERBATIM.PROFESSIONAL_AGREEMENT,
      run.claim.professionalAgreement.status,
      run.claim.professionalAgreement.detail,
    ) +
    `<p class="note">The fourth line is permanent and never changes. It is printed from a ` +
    `constant in the report template rather than from the run, so no configuration of this ` +
    `system can produce an output that claims regulatory approval.</p>` +
    `</section>`
  );
}

function deferredSection(checks: readonly DeferredCheckEntry[], indexes: Indexes): string {
  const rows = checks.map((check) => [
    `<span class="rule-id">${esc(check.ruleId)}</span><div>${esc(check.label)}</div>`,
    notAssessedChip(),
    `<span class="mono">${esc(check.parameterId)}</span>`,
    esc(check.reason),
    cite(check.citation, indexes),
  ]);
  return (
    `<section data-prd="3.4-8"><h2>8 · Deferred checks — what was applicable and not assessed</h2>` +
    `<p>These requirements apply to this plot and were <em>not</em> evaluated. §16.1 classifies ` +
    `them <code>DEFERRED</code>: applicable, but not checkable at this fidelity. Listing them is ` +
    `the difference between a bounded answer and a misleading one.</p>` +
    (checks.length === 0
      ? `<p class="note">${notAssessedChip('no deferred checks recorded')} Every applicable rule ` +
        `in the encoded set was evaluated. That is a statement about the encoded set, not about ` +
        `the regulation.</p>`
      : table('Deferred checks', [
          'Rule',
          'Status',
          'Parameter',
          'Why it was not assessed',
          'Source',
        ], rows)) +
    `</section>`
  );
}

function definitionsSection(run: RunReport): string {
  const definitions: readonly MetricDefinition[] = run.areaTermsUsed.map((id) => metric(id));
  const rows = definitions.map((definition) => [
    `<strong>${esc(definition.name)}</strong><div class="mono">${esc(definition.metricId)}</div>`,
    esc(definition.formulaStatement),
    definition.inclusions.length === 0
      ? '—'
      : `<ul><li>${definition.inclusions.map((item) => esc(item)).join('</li><li>')}</li></ul>`,
    definition.exclusions.length === 0
      ? '—'
      : `<ul><li>${definition.exclusions.map((item) => esc(item)).join('</li><li>')}</li></ul>`,
    definition.approvalStatus === 'APPROVED'
      ? `${esc(definition.approvedBy ?? '')} · ${esc(definition.approvedAt ?? '')}`
      : notAssessedChip('approval pending'),
  ]);

  return (
    `<section data-prd="annex"><h2>9 · Metric definitions annex ${esc(
      run.metricDefinitionsVersion,
    )}</h2>` +
    `<p>Every area term above is defined here, with its inclusions and exclusions, at the annex ` +
    `version this run was computed under — <code>FR-DEF-001 AC4</code>. No area term may be ` +
    `computed unless it appears in this annex (<code>AC5</code>), which <code>INV-15</code> ` +
    `re-checks independently. Two feasibility studies that do not agree on what "net saleable ` +
    `area" includes are not comparable, and neither is wrong.</p>` +
    table(
      `Metric definitions cited by this report (annex ${run.metricDefinitionsVersion})`,
      ['Term', 'Definition', 'Includes', 'Excludes', 'Approved by'],
      rows,
    ) +
    `</section>`
  );
}

function provenanceAppendix(run: RunReport, indexes: Indexes): string {
  const byNode = new Map(run.provenance.nodes.map((node) => [node.id as string, node]));

  const provenanceRows = indexes.provenance.entries().map((entry) => {
    const node = byNode.get(entry.key);
    const treatment = treatmentFor(entry.item.renderHint);
    return [
      `<a id="fn-${entry.ordinal}" href="#fnref-${entry.ordinal}">${entry.ordinal}</a>`,
      `<span class="mono">${esc(entry.item.parameterId)}</span>`,
      `${esc(entry.item.provenanceClass)} <span class="note">(${esc(treatment.label)})</span>`,
      `<span class="mono">${esc(entry.key)}</span>`,
      node === undefined
        ? notAssessedChip('node not in the exported graph')
        : esc(node.formula ?? node.label),
    ];
  });

  const citationRows = indexes.citations.entries().map((entry) => [
    `<span id="cite-${entry.ordinal}">C${entry.ordinal}</span>`,
    `${esc(entry.item.instrumentId)} ${esc(entry.item.instrumentVersion)}`,
    esc(entry.item.clauseReference),
    `p. ${entry.item.sourcePage}`,
    `<div class="verbatim">${esc(entry.item.sourceTextVerbatim)}</div>` +
      `<div class="mono note">${esc(entry.item.documentUri)}</div>`,
  ]);

  return (
    `<section data-prd="provenance"><h2>10 · Derivation index and citations</h2>` +
    `<p>On screen every number is a link into its own derivation — §20.2 calls that the ` +
    `interaction that converts a skeptical architect. On paper the equivalent is this index: each ` +
    `superscript above resolves to the provenance node that produced the figure, and each ` +
    `<span class="cite-n">[C<em>n</em>]</span> to the clause that authorises it. ` +
    `<code>FR-OUT-001 AC2</code> — every number footnoted to its provenance.</p>` +
    table(
      'Derivation index — every figure in this report',
      ['№', 'Parameter', 'Provenance class', 'Node', 'Derivation'],
      provenanceRows,
    ) +
    `<h3>Citations</h3>` +
    table(
      'Regulatory clauses cited by this report',
      ['Ref', 'Instrument', 'Clause', 'Page', 'Verbatim source text'],
      citationRows,
    ) +
    `<p class="note">The exported JSON carries the complete provenance graph — ` +
    `${run.provenance.nodes.length} nodes and ${run.provenance.edges.length} edges — of which ` +
    `this index is the flattened, printable projection.</p>` +
    `</section>`
  );
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

/**
 * Render the complete printable report.
 *
 * Self-contained by construction: the returned string references no external
 * resource of any kind, so it renders identically on a machine with no network.
 * Feed it to headless Chromium to obtain the PDF (§19.1).
 *
 * Composition order matters. The body sections are rendered first so that the
 * footnote and citation ordinals are assigned in reading order; the appendix
 * that resolves them is rendered last, from the registries the body filled.
 *
 * @throws {InvariantFailureError} when any invariant failed — §12.3.
 * @throws {ClaimOverreachError} when the run claims regulatory validity.
 * @throws {AnnexVersionMismatchError} when the run cites a different annex.
 * @throws {UndefinedMetricError} when an area term is absent from the annex.
 */
export function toHtml(run: RunReport): string {
  assertEmittable(run);

  const indexes: Indexes = { provenance: new Registry<TracedWire>(), citations: new Registry<Citation>() };

  const body = [
    facePage(run, indexes),
    legend(),
    envelopeSection(run, indexes),
    capacitySection(run, indexes),
    parkingSection(run, indexes),
    rulesSection(run, indexes),
    assumptionsSection(run.assumptions, indexes),
    invariantsSection(run.invariants),
    claimSection(run),
    deferredSection(run.deferredChecks, indexes),
    definitionsSection(run),
  ].join('');

  const appendix = provenanceAppendix(run, indexes);

  const footer =
    `<footer class="running-footer">` +
    `<span>Run <span class="mono">${esc(run.runId)}</span></span>` +
    `<span>Metric definitions annex ${esc(run.metricDefinitionsVersion)}</span>` +
    `<span>Rule set ${esc(run.ruleSet.ruleSetVersion)}</span>` +
    `<span>Engine ${esc(run.engineVersion)}</span>` +
    `<span>REGULATORY VALIDITY: NOT ASSESSED</span>` +
    `</footer>`;

  const title = `Development capacity — Plot ${run.plot.plotNumber}, ${run.plot.community}`;

  return (
    `<!doctype html>` +
    `<html lang="en" dir="ltr"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>${esc(title)}</title>` +
    `<style>${STYLESHEET}</style></head>` +
    `<body><a class="skip-link" href="#main">Skip to the report</a>` +
    `<main id="main">${body}${appendix}</main>` +
    footer +
    `</body></html>`
  );
}
