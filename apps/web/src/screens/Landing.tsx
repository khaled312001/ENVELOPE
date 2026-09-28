/**
 * `/` — TOP.ai, development capacity.
 *
 * This is the single most dangerous file in the product.
 *
 * Everything else is built so that a number cannot be published without its
 * derivation, an assumption cannot exist without a basis, and compliance is never
 * claimed. A marketing page is where all three are traditionally discarded:
 * "AI-powered instant compliance for Dubai plots" is one sentence, it would test
 * better than anything below, and it would make every disclosure in the engine a lie
 * the reader has already been told past.
 *
 * So the constraints that govern the engine govern this page too, and three of them
 * are load-bearing enough to name here:
 *
 * * **No number appears that the engine did not produce.** Every figure below reads
 *   from `worked-example.json` by its own key. That was once enforced by nothing but
 *   a comment, and the comment had already failed: the page printed a governing
 *   capacity of 6,352.5 m² long after the engine started returning 6,774.194 for the
 *   same input. `scripts/verify-worked-example.mjs` writes the fixture from a real run
 *   and `pnpm check` re-verifies it. A hand-typed number here is a number with no
 *   provenance, and the fact that a human typed it is not a defence — it is the
 *   accusation.
 * * **The five-way claim statement appears here**, in §16.5's own order and wording,
 *   rather than in a footer. If the strongest honest claim is not good enough to sell
 *   on, the answer is a better product, not a quieter page.
 * * **"What it does not do" is a section, not a caveat**, and its five items come from
 *   `content/shared.tsx` so that the copy on `/` and the copy on `/refusals` cannot
 *   drift apart.
 *
 * ---
 *
 * THREE THINGS THIS PAGE USED TO SAY AND NO LONGER MAY.
 *
 * (1) The old h1 was "What **can be built** on this plot — and which line in the code
 * says so." Both halves are defects. "What can be built" is a permission claim: it
 * says the scheme is buildable, in the largest text on the site, with NOT ASSESSED
 * underneath as the mitigation. And "which line in the code says so" promises a
 * citation this deployment does not have — every seed rule in
 * `packages/rules/src/seed/dubai-residential.ts` carries `instrumentId:
 * 'PLACEHOLDER-NOT-A-REAL-INSTRUMENT'`, `sourcePage: 0` and clause text prefixed
 * `[NOT SOURCED]`. The engine's own thesis is that it reports what its encoded rules
 * imply, so the h1 says that, and the fold says the citations are placeholders in the
 * same eyeful as the number rather than six sections below it.
 *
 * (2) "Parking governs this plot, not the code" was a static band-governance claim.
 * `pnpm example` diffs values, not the claims wrapped around them, so a rule edit that
 * made band A bind would have left that sentence false with every gate green. The
 * verdict is now templated from `governingBand`, `nextBindingBand` and
 * `headroomToNextM2`.
 *
 * (3) The figure caption published a coverage margin computed as
 * `Number(V.coverageCapM2) - Number(V.footprintM2)` — a float subtraction performed in
 * the view layer, and therefore the one figure on the site that could not answer where
 * it came from. The engine does not emit `envelope.coverageHeadroomM2`, and adding it
 * is an engine change outside this pass, so THE SENTENCE IS GONE. It is not replaced
 * by an em dash: a hyphen in a figure slot is a number the reader supplies themselves.
 *
 * ---
 *
 * AND ONE THING IT MUST GO ON SAYING, WHICH IS THE HARDEST.
 *
 * `packages/capacity/src/pipeline.ts` runs `computeBands` at line 367 and
 * `planParkingLevel` at line 453. The placed bay, aisle and ramp rectangles are
 * strictly DOWNSTREAM of the bands and cannot inform them: the parking band's supply
 * term is `floor(available area ÷ 32 m²/bay)` with that 32 `ASSUMED`. So the governing
 * capacity **is** an area divided by a factor, no sentence on this page may imply
 * otherwise, and the assumption is rendered in the amber ASSUMED treatment inside the
 * same disclosure as the number — which is why the hero's panel opens by default. A
 * product naming where its own governing number is weakest, and then measuring the
 * weakness, is the entire proposition demonstrated instead of asserted.
 *
 * ---
 *
 * On the visual design. The drawing is not decoration and is not a stock illustration
 * of a building: it is the run beside it, to scale, in the same coordinates the kernel
 * used. The hatched band is the setback the rules produced; the inner rectangle is the
 * tower plate cap. Drawing anything else here would be inventing a building on the
 * page that argues against inventing buildings.
 *
 * ---
 *
 * TWO LANGUAGES, AND EVERY CONSTRAINT ABOVE SURVIVES BOTH.
 *
 * Every sentence comes from `i18n/landing.en.ts` or its Arabic twin, and the English
 * module is the type the Arabic one is held to. Nothing else moved. No figure is in
 * either dictionary: the sentences that carry one are functions that hold the word
 * order and take the value from the fixture. No engine string is in either: the basis,
 * the formulas, and the class and band tokens are read here, as before, and on the
 * Arabic page they go through `AsEmitted`, which is `Verbatim` there and nothing at
 * all on the English page — so the English markup is the markup this page had before
 * it had a second language, byte for byte, and the Arabic page carries every engine
 * string in the language the engine wrote it in.
 */

import { useCallback, useState } from 'react';

// `Glyph` and `ProvenanceLegend` are imported rather than redrawn. The mark set and
// the provenance key both exist inside the engine, and a second copy on the marketing
// page is a copy that drifts — which on the key would mean the site teaching a reader
// one meaning for amber and the engine showing them another.
import { Glyph } from '../components/SiteChrome.js';
import { ProvenanceLegend } from '../components/TracedValue.js';
import { WorkedExampleModel } from '../components/WorkedExampleModel.js';
import { LIMITS_AR } from '../content/shared.ar.js';
import { LIMITS } from '../content/shared.js';
import { AR } from '../i18n/landing.ar.js';
import { EN } from '../i18n/landing.en.js';
import { PageContents } from '../components/PageContents.js';
import { useDict, useLocale, Verbatim } from '../i18n/locale.js';
// `Href`, not `Route`. Every CTA on this site carries a query — `/app?demo=…` — and a
// `Route`-only signature rejects all of them.
import { Link, type Href } from '../router.js';
import SNAPSHOT from './readiness.json' with { type: 'json' };
import example from './worked-example.json' with { type: 'json' };

const V = example.verified;
const I = example.input;

/**
 * THE TWO DIGITS THIS PAGE TYPES, held here and in neither dictionary.
 *
 * Both are facts about the software rather than figures about the plot, and both are
 * on `landing.test.tsx`'s allowlist with the reason: the phase this demonstration
 * belongs to, and the grid the kernel is defined on. They are passed into the
 * sentences that carry them, the way `NotFound.tsx` passes its `200`, so the
 * dictionaries stay free of every digit and a reader of either can see that at a
 * glance.
 */
const PHASE = '0';
const GRID_MM = '1';

/**
 * WHAT THE ENGINE SAID, IN THE LANGUAGE IT SAID IT.
 *
 * `Verbatim` on the Arabic page — `dir="ltr" lang="en"` and an isolate, so a basis
 * string keeps its English voice and its full stop stays at the end it belongs to —
 * and NOTHING on the English page, where the span would be `lang="en"` inside
 * `lang="en"` and would change the markup of a page whose English is held
 * byte-identical to what it was before the Arabic existed.
 *
 * It wraps OUTSIDE a `.value`, never inside one: `.verbatim` sets the sans face, and
 * a figure is mono. `rtl.css` already isolates `.value` on its own.
 */
function AsEmitted({ children }: { readonly children: React.ReactNode }): JSX.Element {
  return useLocale().locale === 'ar' ? <Verbatim>{children}</Verbatim> : <>{children}</>;
}

/** Thousands separators, and not one digit of rounding. */
function group(value: string): string {
  const [whole, frac] = value.split('.');
  const grouped = (whole ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${grouped}.${frac}` : grouped;
}

/** `"4.500"` → `"4.5"`. The engine pads to three places; a drawing does not. */
const trim = (value: string): string =>
  value.includes('.') ? value.replace(/\.?0+$/, '') : value;

const setbackAt = (seq: number): string =>
  trim(V.setbacksM.find((s) => s.seq === seq)?.setbackM ?? '');

/* -------------------------------------------------------------------------
 * The three bands, as the engine returned them.
 * ---------------------------------------------------------------------- */

/**
 * A band as the ENGINE returned it: its figure and its formula, both off the fixture.
 * Its name and its note are copy and live in the dictionaries under the same id —
 * including the note on C that may never say "bays that fit", which `landing.en.ts`
 * carries with its reason.
 */
interface Band {
  readonly id: 'a' | 'b' | 'c';
  readonly letter: string;
  readonly value: string;
  readonly formula: string;
}

const BANDS: readonly Band[] = [
  { id: 'a', letter: 'A', value: V.bandAM2, formula: V.formulas.bandA },
  { id: 'b', letter: 'B', value: V.bandBM2, formula: V.formulas.bandB },
  { id: 'c', letter: 'C', value: V.bandCM2, formula: V.formulas.bandC },
];

/**
 * The binding band, found by comparison and never named in a literal.
 *
 * R10: no page asserts which band governs in static prose. This page shows the
 * governing figure in its largest type, so the row it comes from has to be computed
 * from the fixture, and the fallback is the last band rather than a hard-coded `c` —
 * `noUncheckedIndexedAccess` makes that explicit rather than implied.
 */
const GOVERNING: Band =
  BANDS.find((b) => b.value === V.governingGfaM2) ?? (BANDS[BANDS.length - 1] as Band);

const widest = Math.max(...BANDS.map((b) => Number(b.value)));

/* -------------------------------------------------------------------------
 * The plan.
 *
 * Plot coordinates are metres with y running north; SVG's y runs down, so the
 * conversion is `PLOT_D - y` and it is done here rather than by transforming the
 * group, because a `scale(1,-1)` would mirror every label with it.
 *
 * THE DIMENSIONS AND THE EDGE LABELS ARE READ, NOT TYPED. `PLOT_W`, `PLOT_D`,
 * `COLLECTOR ROAD` and `LOCAL ROAD` were four literals in the view layer — four
 * figures about the plot that the page could not source. They now come off
 * `input.plot`, which is the recorded request the engine was given.
 *
 * The extents assume an axis-aligned rectangle. That is not a new assumption: the
 * drawing below is built from `x`/`y` extents and dimension rules along two axes, so
 * a rotated or L-shaped plot would already have needed a different drawing rather
 * than a different constant.
 * ---------------------------------------------------------------------- */

const XS = I.plot.vertices.map((v) => Number(v.x));
const YS = I.plot.vertices.map((v) => Number(v.y));
const PLOT_W = Math.max(...XS) - Math.min(...XS);
const PLOT_D = Math.max(...YS) - Math.min(...YS);
const up = (yPlot: number): number => PLOT_D - yPlot;

/**
 * What an edge faces, from the classification it was given. The dictionary names it
 * — in the drawing's own caps in English, by the trade term in Arabic — but the token
 * it names is always the recorded input's, read here and never typed per edge.
 */
function edgeLabel(seq: number, name: typeof EN.figure.edge): string {
  const edge = I.plot.edges.find((e) => e.seq === seq);
  if (!edge) return '';
  const road = 'roadHierarchy' in edge && edge.roadHierarchy ? edge.roadHierarchy : undefined;
  return name(edge.classification, road);
}

const podium = {
  x: Number(V.podiumOutline[1]?.x ?? 0),
  y: up(Number(V.podiumOutline[0]?.y ?? 0)),
  w: Number(V.podiumOutline[0]?.x ?? 0) - Number(V.podiumOutline[1]?.x ?? 0),
  h: Number(V.podiumOutline[0]?.y ?? 0) - Number(V.podiumOutline[2]?.y ?? 0),
};
const tower = {
  x: Number(V.towerOutline[1]?.x ?? 0),
  y: up(Number(V.towerOutline[0]?.y ?? 0)),
  w: Number(V.towerOutline[0]?.x ?? 0) - Number(V.towerOutline[1]?.x ?? 0),
  h: Number(V.towerOutline[0]?.y ?? 0) - Number(V.towerOutline[2]?.y ?? 0),
};

/**
 * The plan. On screen it stands in for the 3D model where WebGL is missing; on paper
 * it always does. Rendered twice in that case, so the hatch's id is the caller's.
 */
function PlotPlan({ hatchId = 'lp-hatch' }: { readonly hatchId?: string }): JSX.Element {
  const t = useDict(EN, AR).figure;
  return (
    <svg
      className="lp-plan"
      viewBox="-12 -6 98 61"
      role="img"
      aria-label={t.planLabel({
        width: String(PLOT_W),
        depth: String(PLOT_D),
        setbacks: [setbackAt(0), setbackAt(1), setbackAt(2), setbackAt(3)],
        footprint: group(V.footprintM2),
        plateCap: group(V.towerPlateCapM2),
      })}
    >
      <defs>
        {/* The setback is area the rules take away, so it is drawn as removed —
            hatched, not filled. Colour alone would not survive a greyscale print,
            and this page gets printed. */}
        <pattern
          id={hatchId}
          width="3"
          height="3"
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
        >
          <line x1="0" y1="0" x2="0" y2="3" className="lp-plan__hatch" />
        </pattern>
      </defs>

      <rect x="0" y="0" width={PLOT_W} height={PLOT_D} fill={`url(#${hatchId})`} />
      <rect
        x={podium.x}
        y={podium.y}
        width={podium.w}
        height={podium.h}
        className="lp-plan__podium"
      />
      <rect x={tower.x} y={tower.y} width={tower.w} height={tower.h} className="lp-plan__tower" />
      <rect x="0" y="0" width={PLOT_W} height={PLOT_D} className="lp-plan__boundary" />

      <g className="lp-plan__label">
        <text x={tower.x + tower.w / 2} y={tower.y + tower.h / 2 - 1.4} textAnchor="middle">
          {t.plateCapTag}
        </text>
        <text
          className="lp-plan__label-v"
          x={tower.x + tower.w / 2}
          y={tower.y + tower.h / 2 + 3.4}
          textAnchor="middle"
        >
          {group(V.towerPlateCapM2)} m²
        </text>
      </g>

      {/* Which edge is which. The setback a rule produces depends on what the edge
          faces, so the drawing has to say what each one faces — and it has to read
          that from the plot rather than remember it.

          Only the two horizontal edges are labelled. The two flanking edges carry
          their setback figure and no caption: a rotated caption in the 12-unit left
          margin collides with the dimension rule at 320px, and the setback is the
          thing a reader is here to check. */}
      <g className="lp-plan__edge">
        <text x={PLOT_W / 2} y={-2.2} textAnchor="middle">
          {edgeLabel(2, t.edge)}
        </text>
        <text x={PLOT_W / 2} y={PLOT_D + 3.6} textAnchor="middle">
          {edgeLabel(0, t.edge)}
        </text>
      </g>

      <g className="lp-plan__dim">
        {[
          { x: PLOT_W / 2, y: podium.y / 2 + 0.9, v: setbackAt(2) },
          { x: PLOT_W / 2, y: PLOT_D - (PLOT_D - (podium.y + podium.h)) / 2 + 0.9, v: setbackAt(0) },
          { x: podium.x / 2, y: PLOT_D / 2 + 0.9, v: setbackAt(3) },
          { x: PLOT_W - podium.x / 2, y: PLOT_D / 2 + 0.9, v: setbackAt(1) },
        ].map((d) => (
          <text key={`${d.x}-${d.y}`} x={d.x} y={d.y} textAnchor="middle">
            {d.v}
          </text>
        ))}
      </g>

      {/* Overall dimensions, drawn the way a drawing draws them: an extension line
          with ticks at both ends and the figure sitting on it. */}
      <g className="lp-plan__rule">
        <line x1="0" y1={PLOT_D + 11} x2={PLOT_W} y2={PLOT_D + 11} />
        <line x1="0" y1={PLOT_D + 9.6} x2="0" y2={PLOT_D + 12.4} />
        <line x1={PLOT_W} y1={PLOT_D + 9.6} x2={PLOT_W} y2={PLOT_D + 12.4} />
        <line x1={-5.6} y1="0" x2={-5.6} y2={PLOT_D} />
        <line x1={-7} y1="0" x2={-4.2} y2="0" />
        <line x1={-7} y1={PLOT_D} x2={-4.2} y2={PLOT_D} />
      </g>
      <g className="lp-plan__overall">
        <text x={PLOT_W / 2} y={PLOT_D + 9.9} textAnchor="middle">
          {PLOT_W} m
        </text>
        <text
          x={-8.6}
          y={PLOT_D / 2}
          textAnchor="middle"
          transform={`rotate(-90 ${-8.6} ${PLOT_D / 2})`}
        >
          {PLOT_D} m
        </text>
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------
 * The assumption the governing number rests on.
 *
 * Rendered through the chassis: `[data-state='assumed']` is one of the five
 * selectors `assertAmberExclusive` permits to reach `--uncertain*`, so the whole
 * ASSUMED treatment — amber ground, 6px rail, drawn pencil, dotted underline that
 * scales with the type, weight step — arrives without this stylesheet declaring a
 * single amber value of its own.
 *
 * The class is announced as TEXT and not by colour: `bayAreaFactorClass` is
 * interpolated into the lead-in, so a screen-reader user learns the number is an
 * assumption at the same moment a sighted user does. The basis is printed in full
 * rather than truncated — an assumption without a basis is not an assumption, and a
 * basis string is engine-authored prose, so shortening it here would be editing the
 * engine's own words on the page that argues against doing that.
 * ---------------------------------------------------------------------- */

function AssumedFactor(): JSX.Element {
  const t = useDict(EN, AR).assumed;
  return (
    <div className="callout lp-assumption" data-state="assumed">
      <span className="callout__mark">
        <Glyph name="assumed" />
      </span>
      <div className="callout__body">
        <strong>
          <AsEmitted>{V.bayAreaFactorClass}</AsEmitted>
          {t.titleAfter}
        </strong>
        <p>
          {t.before}{' '}
          <span className="traced traced--assumed">
            <span className="value">
              {V.bayAreaFactorM2}
              <span className="value__unit">m²/bay</span>
            </span>
            <span className="traced__marker" aria-hidden="true" />
          </span>
          {t.after}
          <AsEmitted>{V.bayAreaFactorBasis}</AsEmitted>
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * A figure that can be asked where it came from.
 *
 * This is the whole product in one control, so it behaves the way it does in the
 * engine: the formulas shown are the engine's own `formula` strings, read out of the
 * provenance graph by the verification script. They are not re-typed explanations of
 * the arithmetic — a re-typed formula drifts exactly as easily as a re-typed value,
 * and less visibly.
 *
 * THE CONTROL IS NAMED BY ITS VISIBLE TEXT, IN THE ORDER IT IS READ. The `why?` span
 * used to be `aria-hidden`, which left a `<button>` whose entire accessible name was
 * a bare number — "6,774.194 m²" announced with no verb and no clue that pressing it
 * does anything. Moving the word in front of the figure gives an accessible name of
 * "why 6,774.194 m²?" that is byte-identical to what is on screen, so 2.5.3 is
 * satisfied by construction rather than by an `aria-label` that has to be kept in
 * step with the label it overrides.
 * ---------------------------------------------------------------------- */

function BandRow({
  band,
  binding,
  open,
  onToggle,
  hero = false,
  extraFormula,
  children,
}: {
  readonly band: Band;
  readonly binding: boolean;
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly hero?: boolean;
  readonly extraFormula?: string;
  readonly children?: React.ReactNode;
}): JSX.Element {
  const t = useDict(EN, AR).bands;
  const share = (Number(band.value) / widest) * 100;
  return (
    <li className={`lp-band${binding ? ' is-binding' : ''}${hero ? ' lp-band--hero' : ''}`}>
      <div className="lp-band__head">
        <span className="lp-band__letter" aria-hidden="true">
          {band.letter}
        </span>
        <span className="lp-band__name">
          {t.word}
          {band.letter} — {t[band.id].name}
          {/* The binding row says so in words, carries a heavier rule and a larger
              figure. Colour carries none of the meaning on its own. */}
          {binding ? <span className="lp-tag lp-tag--binds">{t.binds}</span> : null}
        </span>
        <button
          type="button"
          className="lp-band__value"
          aria-expanded={open}
          aria-controls={`lp-why-${band.id}`}
          onClick={onToggle}
        >
          <span className="lp-band__why">{open ? t.hide : t.why}</span>
          <span className="lp-band__number">{group(band.value)}</span>
          <span className="lp-band__unit">m²</span>
          {open ? null : <span className="lp-band__why">{t.question}</span>}
        </button>
      </div>
      {/* The chassis meter, not a fourth bar primitive. `--meter-value` is the share
          of the widest band, which is a fact about these three rows and about
          nothing else. */}
      <span
        className="meter lp-band__meter"
        aria-hidden="true"
        data-state={binding ? 'binding' : 'neutral'}
        style={{ '--meter-value': `${share.toFixed(2)}%` } as React.CSSProperties}
      >
        <span className="meter__fill" />
      </span>
      {/*
        THE ASSUMPTION RENDERS UNCONDITIONALLY, OUTSIDE THE DISCLOSURE, AND FIRST.

        It used to be the last child of `.lp-band__why-panel`, which is `hidden`
        until a reader presses "why". So on the shipped fold the governing figure
        appeared at y≈1008 and the amber block that says the divisor under it was
        assumed appeared at y=1225 — below a 1000px fold, and further below a
        900px laptop. Measured on the live page, the amber filled ground above the
        fold was 0px².

        A reader who takes the number and leaves is the *normal* reader, and that
        reader was seeing the figure and never the assumption. Putting the
        assumption behind the same toggle as the formula treats "how was this
        computed" and "what was assumed to compute it" as the same optional
        detail; the first is optional and the second is not. `why` still toggles
        the formula strings. The amber does not toggle at all.

        IT ALSO COMES BEFORE THE FORMULA PANEL, not after it. Ordering it last put
        149px of open disclosure between the figure and the amber, which is the same
        defect in a second form: adjacency is the whole mechanism here, and a block
        that is "on the page" 200px below the number it qualifies is not adjacent to
        it. The derivation is the elaboration; the assumption is the condition. The
        condition goes first.
      */}
      {children}
      <div className="lp-band__why-panel" id={`lp-why-${band.id}`} hidden={!open}>
        {/* The engine's own formula strings, never translated: a re-typed formula
            drifts as easily as a re-typed value, and a translated one is a formula
            the engine never wrote. */}
        <p className="lp-band__formula">
          <AsEmitted>{band.formula}</AsEmitted>
        </p>
        {extraFormula ? (
          <p className="lp-band__formula">
            <AsEmitted>{extraFormula}</AsEmitted>
          </p>
        ) : null}
        <p className="lp-band__note">{t[band.id].note}</p>
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------
 * The four claim marks.
 *
 * A shape family, so the verdict survives greyscale, a photocopier and a colour
 * vision deficiency: filled disc, half disc, hollow ring, crossed square. The ring
 * and the square come from `SiteChrome`'s drawn mark set, which is the one place
 * those paths are written.
 *
 * THE FILLED DISC AND THE HALF DISC ARE DRAWN HERE, and that is a gap rather than a
 * preference: `MarkName` has no member for either, and adding two is an edit to a
 * file this pass does not own. They are drawn into the same 16-unit box, at the same
 * stroke weight, through the same `.mark` chassis class, so they sit on the optical
 * baseline the rest of the set does. If the set gains them, these two go.
 * ---------------------------------------------------------------------- */

type ClaimMark = 'supported' | 'partial' | 'deferred' | 'never';

function ClaimGlyph({ mark }: { readonly mark: ClaimMark }): JSX.Element {
  if (mark === 'deferred') return <Glyph name="deferred" />;
  if (mark === 'never') return <Glyph name="never-claimed" />;
  if (mark === 'supported') {
    return (
      <svg className="mark mark--filled" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <circle cx="8" cy="8" r="5.5" />
      </svg>
    );
  }
  return (
    <svg className="mark" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="5.5" />
      <path className="mark__ink" d="M8 2.5 A5.5 5.5 0 0 1 8 13.5 Z" />
    </svg>
  );
}

/* -------------------------------------------------------------------------
 * The four guarantees, and the diagrams that carry them.
 *
 * Each diagram is at most three elements, drawn from `currentColor`, and carries NO
 * dimension: a schematic that printed a figure would be a figure the engine did not
 * produce, drawn convincingly.
 * ---------------------------------------------------------------------- */

function OffsetDiagram(): JSX.Element {
  return (
    <svg className="lp-diagram" viewBox="0 0 64 40" aria-hidden="true" focusable="false">
      <rect x="2" y="2" width="60" height="36" />
      <rect className="lp-diagram__inner" x="12" y="9" width="40" height="22" />
      <path d="M6 20 H10 M8 17 L11 20 L8 23" />
    </svg>
  );
}

function VertexDiagram(): JSX.Element {
  return (
    <svg className="lp-diagram" viewBox="0 0 64 40" aria-hidden="true" focusable="false">
      <path d="M4 34 L32 12 M60 34 L32 12" />
      <circle className="lp-diagram__node" cx="32" cy="12" r="3" />
    </svg>
  );
}

function BlockedDiagram(): JSX.Element {
  return (
    <svg className="lp-diagram" viewBox="0 0 64 40" aria-hidden="true" focusable="false">
      <path d="M4 20 H40 M36 15 L41 20 L36 25" />
      <path className="lp-diagram__bar" d="M48 8 V32" />
    </svg>
  );
}

/**
 * A traced value: the gutter rail, the figure, its dotted underline, and the leader
 * running down to the rule it cites.
 *
 * It replaces the provenance key that used to be this station's mark. The key is the
 * most substantive artefact in the section — it is the engine's own, rendered
 * verbatim — and it was being used as an icon, at icon size, in a row of three line
 * drawings it does not resemble. It now has a strip of its own below the chain, and
 * the station gets a mark drawn to the same 64 x 40 grid as its neighbours.
 */
function TraceDiagram(): JSX.Element {
  return (
    <svg className="lp-diagram" viewBox="0 0 64 40" aria-hidden="true" focusable="false">
      <path className="lp-diagram__bar" d="M5 6 V18" />
      <path d="M11 10 H33" />
      <path className="lp-diagram__trace" d="M11 15 H33" />
      <path d="M22 18 V30 H41" />
      <rect className="lp-diagram__inner" x="41" y="25" width="18" height="10" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */

export function Landing({
  navigate,
}: {
  readonly navigate: (to: Href) => void;
}): JSX.Element {
  /**
   * THE HERO DISCLOSURE OPENS BY DEFAULT, and that is not a convenience.
   *
   * The governing capacity rests on an area divided by an assumed factor, and the
   * assumption has to be in the same eyeful as the number rather than one click
   * away. Behind a closed disclosure it would be present in the markup and absent
   * from the page, which is the shape of every disclosure defect this product
   * exists to prevent. It stays a real disclosure — a reader who has read it can
   * put it away — but the shipped state is open.
   */
  const t = useDict(EN, AR);

  /*
    THE FIVE NUMBERED SECTIONS, AS ONE RECORD.

    The ordinals were typed into each section's margin — `01` … `05` — and the
    headings live in the dictionary, so the page's outline existed nowhere at all.
    The contents list reads this and so do the margin numerals; neither can now be
    edited without the other following.

    The closing status band is deliberately NOT here. It carries no ordinal on the
    page, so listing it would make the outline run to six over a page that counts
    to five — and a reader who finds the two disagreeing has no way to tell which
    of them is the mistake.
  */
  const order: readonly { readonly id: string; readonly label: string }[] = [
    { id: 'capacities', label: t.capacities.title },
    { id: 'parking-number', label: t.parking.title },
    { id: 'guarantees', label: t.guarantees.title },
    { id: 'claims', label: t.claims.title },
    { id: 'limits', label: t.limits.title },
  ];
  const idx = (id: string): string =>
    String(order.findIndex((s) => s.id === id) + 1).padStart(2, '0');
  /* The five refusals `/refusals` also renders, from the one module each language has. */
  const limits = useDict(LIMITS, LIMITS_AR);
  const [heroOpen, setHeroOpen] = useState(true);
  const [openBand, setOpenBand] = useState<string | null>(null);
  const toggle = useCallback(
    (id: string) => setOpenBand((current) => (current === id ? null : id)),
    [],
  );

  /**
   * `/readiness` renders a build-time snapshot when nobody is signed in, so the CTA
   * that points at it is only honest while the snapshot carries figures. A missing
   * `readiness.json` fails the build, exactly as `worked-example.json` does — an
   * empty one does not, and a call to action reading "see the readiness numbers"
   * that lands on a page with none is the same defect as a figure the engine did
   * not produce.
   */
  const readinessHasNumbers = SNAPSHOT.readiness.rulesTotal > 0;

  // The plan draws itself in on load, entirely in CSS and inside a
  // `prefers-reduced-motion: no-preference` block. A JS class added after mount
  // would paint the finished drawing for one frame and then restart it, and a reader
  // who has asked for less motion would still see the flash.
  return (
    <div className="lp">
      {/* NO SKIP LINK, NO HEADER, NO NAV, NO FOOTER AND NO `id="main"` HERE. All of
          them belong to `SiteChrome`, which every route renders through — including
          the engine, which had none at all. Two elements carrying `id="main"` resolve
          the skip link to whichever comes first in the document, usually the hidden
          engine, which is a skip link that focuses nothing a sighted keyboard user
          can see. */}

      {/* ================================================================
          THE FOLD
          ============================================================= */}
      <section className="shell lp-hero" aria-labelledby="lp-title">
        <div className="lp-hero__copy">
          {/* Each direct child carries its own `--motion-order`. The stagger is bound
              to the property and not to `:nth-child`, so inserting a paragraph does
              not silently re-time the hero. */}
          <p className="eyebrow" style={{ '--motion-order': 0 } as React.CSSProperties}>
            {t.eyebrow(PHASE)}
          </p>

          <h1
            className="lp-hero__h1"
            id="lp-title"
            style={{ '--motion-order': 1 } as React.CSSProperties}
          >
            {t.title}
          </h1>

          {/*
            THE ANSWER COMES BEFORE THE LEDE, and that is the site map's own description
            of this fold rather than a liberty taken with it: "the fold carries one
            engine-produced figure that decomposes into the engine's own formula string,
            and directly beneath it, at equal weight, the sentence the product refuses to
            say." With the lede in between, neither reached the fold — the figure landed
            at y=961 and the amber assumption under it at y=1216, so the reader who takes
            the number and leaves saw the claim and never the answer.

            The lede is the strongest sentence in the product and it is not cut; it moves
            below the refusal, where it explains a number the reader has already seen
            rather than promising one they have not. Headline, answer, refusal, then the
            argument.
          */}
          <div className="lp-answer" style={{ '--motion-order': 2 } as React.CSSProperties}>
            <p className="lp-answer__label">{t.answerLabel}</p>
            <ol className="lp-bands lp-bands--single">
              <BandRow
                band={GOVERNING}
                binding
                hero
                open={heroOpen}
                onToggle={() => setHeroOpen((o) => !o)}
                extraFormula={V.formulas.governingGfa}
              >
                <AssumedFactor />
              </BandRow>
            </ol>
          </div>

          {/* Beneath the answer, at equal weight and never smaller. */}
          <p className="lp-validity" style={{ '--motion-order': 3 } as React.CSSProperties}>
            <span className="lp-validity__mark">
              <Glyph name="never-claimed" />
            </span>
            <span>
              {/* Set in caps in the STRING and not by `text-transform`, and the reason is
                  mechanical rather than typographic: `expectClaimOrder` finds each of the
                  five claims by its first occurrence in the markup, so a sentence-case
                  "Regulatory validity" here would be found before the claim statement and
                  the order assertion would measure this stamp instead of that table. The
                  sentence-case string belongs to the claim row; this is the status stamp,
                  and the design language writes it in caps anyway. */}
              <strong>{t.validity.stamp}</strong>
              {t.validity.body}
            </span>
          </p>

          <p className="lp-hero__lede" style={{ '--motion-order': 4 } as React.CSSProperties}>
            {t.lede.before}
            <strong>{t.lede.emphasis}</strong>
            {t.lede.after}
          </p>

          <div
            className="cta lp-cta"
            style={{ '--motion-order': 5 } as React.CSSProperties}
          >
            {/*
              `?demo=`, not `?step=intake`. A step hint only SELECTS a step, so a
              button reading "run this plot yourself" would have promised the worked
              plot and delivered an empty intake form — the same class of defect as a
              figure the engine did not produce.
            */}
            <Link
              to="/app?demo=worked-example"
              navigate={navigate}
              className="button button--primary"
            >
              {t.cta.run}
            </Link>
            <Link to="/refusals" navigate={navigate} className="button">
              {t.cta.refusals}
            </Link>
          </div>
        </div>

        <figure className="figure lp-hero__figure">
          <div className="figure__plate">
            {/* The run's own building model, from the same run as every figure on
                this page. The plan is its stand-in on paper and without WebGL. */}
            <WorkedExampleModel
              label={t.figure.modelLabel(V.levels, V.maxLevelsByHeight)}
              fallback={<PlotPlan hatchId="lp-hatch-fallback" />}
            />
            <div className="print-only">
              <PlotPlan />
            </div>
          </div>
          <figcaption className="figure__caption">
            <p className="figure__label">
              <span className="figure__no">{t.figure.number}</span>
              <span>
                {/* A dimension is a Latin run: isolated on the Arabic page, so the
                    bidirectional algorithm cannot print 80 × 40 as 40 × 80. */}
                <AsEmitted>
                  {PLOT_W} × {PLOT_D} m
                </AsEmitted>{' '}
                · {t.figure.landUse(I.plot.landUse)}
              </span>
            </p>
            <dl className="figure__spec">
              <div>
                <dt>{t.figure.spec.plotArea}</dt>
                <dd>
                  <span className="value">{group(V.plotAreaM2)}</span> m²
                </dd>
              </div>
              <div>
                <dt>{t.figure.spec.setbacks}</dt>
                <dd>
                  <span className="value">
                    {setbackAt(0)} · {setbackAt(1)} · {setbackAt(2)} · {setbackAt(3)}
                  </span>{' '}
                  m
                </dd>
              </div>
              <div>
                <dt>{t.figure.spec.footprint}</dt>
                <dd>
                  <span className="value">{group(V.footprintM2)}</span> m²
                </dd>
              </div>
              <div>
                <dt>{t.figure.spec.plateCap}</dt>
                <dd>
                  <span className="value">{group(V.towerPlateCapM2)}</span> m²
                </dd>
              </div>
              <div>
                <dt>{t.figure.spec.levels}</dt>
                <dd>
                  <span className="value">{V.levels}</span>
                  {t.figure.spec.levelsOf}
                  <span className="value">{V.maxLevelsByHeight}</span>
                  {t.figure.spec.levelsAfter}
                </dd>
              </div>
            </dl>
            <p className="figure__source">{t.figure.source}</p>
          </figcaption>
        </figure>
      </section>

      <PageContents entries={order} />

      {/* ================================================================
          01 — THE THREE CAPACITIES
          ============================================================= */}
      <section
        className="shell section railed lp-section"
        id="capacities"
        aria-labelledby="lp-capacities"
      >
        {/* `aria-hidden`, because "01" read out before a heading is noise. */}
        <p className="index railed__margin" aria-hidden="true">
          {idx('capacities')}
        </p>
        <div className="railed__body">
          <div className="section__head">
            <h2 id="lp-capacities">{t.capacities.title}</h2>
            <p className="lp-lede">{t.capacities.lede}</p>
          </div>

          <ol className="lp-bands">
            {BANDS.map((band) => (
              <BandRow
                key={band.id}
                band={band}
                binding={band.value === V.governingGfaM2}
                open={openBand === band.id}
                onToggle={() => toggle(band.id)}
              />
            ))}
          </ol>

          {/*
            TEMPLATED, NEVER TYPED. The shipped sentence read "Parking governs this
            plot, not the code" — a static band-governance claim on a page whose gate
            diffs values and not the claims wrapped around them. A rule edit that made
            band A bind would have left it false with every gate green.
          */}
          <p className="lp-verdict">
            {t.capacities.verdict.before}
            <strong className="lp-verdict__band">
              <AsEmitted>{V.governingBand}</AsEmitted>
            </strong>
            {t.capacities.verdict.between}
            <span className="lp-verdict__band">
              <AsEmitted>{V.nextBindingBand}</AsEmitted>
            </span>
            {t.capacities.verdict.after}
            <strong>
              <AsEmitted>{group(V.headroomToNextM2)} m²</AsEmitted>
            </strong>
            {t.capacities.verdict.end}
          </p>
        </div>
      </section>

      {/* ================================================================
          02 — HOW THE PARKING NUMBER IS MADE
          ============================================================= */}
      <section
        className="shell section railed lp-section"
        id="parking-number"
        aria-labelledby="lp-parking"
      >
        <p className="index railed__margin" aria-hidden="true">
          {idx('parking-number')}
        </p>
        <div className="railed__body">
          <div className="section__head">
            <h2 id="lp-parking">{t.parking.title}</h2>
          </div>

          <p className="lp-prose">
            {t.parking.proseBefore}
            <em>{t.parking.proseEmphasis}</em>
            {t.parking.proseAfter}
          </p>

          {/*
            THE LEVEL PLAN IS NOT DRAWN HERE, and the degradation rule is written into
            the page rather than into a risk register: this section renders no
            rectangle, on any fixture. A hand-drawn parking diagram on this site would
            be the exact defect the product exists to prevent, committed on the page
            that sells the prevention. The drawing lives on `/parking`, where it is the
            engine's own placed rectangles.

            The two figures below are the ones the placed level actually produced.
            `verified.totalBays` is NEVER among them: that is demand at the probe
            scheme, not supply, and the engine says so itself.
          */}
          <dl className="lp-costed">
            {/* Each row names its own provenance class, interpolated from the fixture
                rather than typed, so the amber row and the two derived rows are
                distinguished by a word as well as by a colour. The first is the same
                figure as the one in the fold, in the same treatment: a reader who meets
                it twice must not meet it once as an assumption and once as a fact. */}
            <div>
              <dt>
                {t.parking.costed.assumed}{' '}
                <span className="lp-costed__class">
                  <AsEmitted>{V.bayAreaFactorClass}</AsEmitted>
                </span>
              </dt>
              <dd>
                <span className="traced traced--assumed">
                  <span className="value">
                    {V.bayAreaFactorM2}
                    <span className="value__unit">m²/bay</span>
                  </span>
                  <span className="traced__marker" aria-hidden="true" />
                </span>
              </dd>
            </div>
            <div>
              <dt>
                {t.parking.costed.measured}{' '}
                <span className="lp-costed__class">
                  <AsEmitted>{V.levelPlan.areaPerBayM2.provenanceClass}</AsEmitted>
                </span>
              </dt>
              <dd>
                <span className="value">{V.levelPlan.areaPerBayM2.value}</span> m²/bay
              </dd>
            </div>
            <div>
              <dt>
                {t.parking.costed.bays}{' '}
                <span className="lp-costed__class">
                  <AsEmitted>{V.levelPlan.bayCount.provenanceClass}</AsEmitted>
                </span>
              </dt>
              <dd>
                <span className="value">{V.levelPlan.bayCount.value}</span>
              </dd>
            </div>
          </dl>

          <p className="lp-prose">
            <Link to="/parking" navigate={navigate}>
              {t.parking.link}
            </Link>
          </p>
        </div>
      </section>

      {/* ================================================================
          03 — WHAT HOLDS THE ANSWER UP
          ============================================================= */}
      <section
        className="shell section railed lp-section"
        id="guarantees"
        aria-labelledby="lp-guarantees"
      >
        <p className="index railed__margin" aria-hidden="true">
          {idx('guarantees')}
        </p>
        <div className="railed__body">
          <div className="section__head">
            <h2 id="lp-guarantees">{t.guarantees.title}</h2>
            <p className="lp-lede">{t.guarantees.lede}</p>
          </div>

          {/*
            A CHAIN, NOT A GRID OF FOUR.

            These four are not four features; they are four STAGES OF ONE MECHANISM,
            in order — a rule becomes an offset, the offset is computed exactly, the
            result carries its derivation, and an independent layer decides whether it
            may be emitted at all. Drawn as a 2x2 grid of bordered cards with a line
            icon each, that order was thrown away, and what was left was the most
            generic shape a landing page has: four boxes.

            The connector is what carries the argument now, and it is drawn PER GAP
            rather than as one line running behind the marks. A line behind them needs
            each station to occlude it with a matching background, which breaks the
            moment the section ground changes — and this section’s ground has changed
            twice already.
          */}
          <ol className="lp-chain">
            <li className="lp-chain__stage reveal">
              <span className="lp-chain__mark">
                <OffsetDiagram />
              </span>
              <h3>{t.guarantees.chain.generate.title}</h3>
              <p>{t.guarantees.chain.generate.body}</p>
            </li>

            <li className="lp-chain__stage reveal">
              <span className="lp-chain__mark">
                <VertexDiagram />
              </span>
              <h3>{t.guarantees.chain.exact.title}</h3>
              <p>{t.guarantees.chain.exact.body}</p>
            </li>

            <li className="lp-chain__stage reveal">
              <span className="lp-chain__mark">
                <TraceDiagram />
              </span>
              <h3>{t.guarantees.chain.derivation.title}</h3>
              <p>{t.guarantees.chain.derivation.body}</p>
            </li>

            <li className="lp-chain__stage reveal">
              <span className="lp-chain__mark">
                <BlockedDiagram />
              </span>
              <h3>{t.guarantees.chain.blocks.title}</h3>
              <p>{t.guarantees.chain.blocks.body}</p>
            </li>
          </ol>

          {/*
            The key, at the width it earns.

            It is rendered by the engine’s own component, so the meaning of amber here
            and the meaning of amber inside a run cannot drift apart. That is exactly
            the reason it should not have been shrunk into a card the size of a line
            drawing, competing with three of them.
          */}
          <figure className="lp-key">
            <ProvenanceLegend />
            <figcaption>{t.guarantees.keyCaption}</figcaption>
          </figure>
        </div>
      </section>

      {/* ================================================================
          04 — THE FIVE-WAY CLAIM STATEMENT
          ============================================================= */}
      <section
        className="shell section section--major railed lp-section"
        id="claims"
        aria-labelledby="lp-claims"
      >
        <p className="index railed__margin" aria-hidden="true">
          {idx('claims')}
        </p>
        <div className="railed__body">
          <div className="section__head">
            <h2 id="lp-claims">{t.claims.title}</h2>
            <p className="lp-lede">{t.claims.lede}</p>
          </div>
        </div>

        {/* THE ORDER IS HERE AND NOT IN A DICTIONARY. It is §16.5's, the refusal is
            last, and `landing.test.tsx` asserts it in both languages — so neither
            dictionary can reorder the claims, only word them. */}
        <dl className="railed__full lp-claims">
          {[
            {
              id: 'self-consistency',
              t: t.claims.selfConsistency.title,
              s: t.claims.selfConsistency.status,
              m: 'supported' as const,
              d: t.claims.selfConsistency.body,
            },
            {
              id: 'coverage',
              t: t.claims.coverage.title,
              s: t.claims.coverage.status,
              m: 'partial' as const,
              d: (
                <>
                  {t.claims.coverage.bodyBefore}
                  <em>{t.claims.coverage.bodyEmphasis}</em>
                  {t.claims.coverage.bodyAfter}
                </>
              ),
            },
            {
              id: 'geometry',
              t: t.claims.geometry.title,
              s: t.claims.geometry.status,
              m: 'supported' as const,
              d: t.claims.geometry.body(GRID_MM),
            },
            {
              id: 'judgement',
              t: t.claims.judgement.title,
              s: t.claims.judgement.status,
              m: 'deferred' as const,
              d: t.claims.judgement.body,
            },
            {
              id: 'regulatory',
              t: t.claims.regulatory.title,
              s: t.claims.regulatory.status,
              m: 'never' as const,
              d: t.claims.regulatory.body,
            },
          ].map((c) => (
            <div className={`lp-claim lp-claim--${c.m} reveal`} key={c.id}>
              <dt>
                <span className="lp-claim__title">{c.t}</span>
                <span className={`lp-status lp-status--${c.m}`}>
                  <ClaimGlyph mark={c.m} />
                  {c.s}
                </span>
              </dt>
              <dd>{c.d}</dd>
            </div>
          ))}
        </dl>

        <p className="railed__body lp-prose lp-after">
          <Link to="/refusals" navigate={navigate}>
            {t.claims.link}
          </Link>
        </p>
      </section>

      {/* ================================================================
          05 — WHAT IT DOES NOT DO
          ============================================================= */}
      <section
        className="shell section section--major railed lp-section"
        id="limits"
        aria-labelledby="lp-limits"
      >
        <p className="index railed__margin" aria-hidden="true">
          {idx('limits')}
        </p>
        <div className="railed__body">
          <div className="section__head">
            <h2 id="lp-limits">{t.limits.title}</h2>
            {/* The lede is honest about its own length; `landing.en.ts` says why. */}
            <p className="lp-lede">{t.limits.lede}</p>
          </div>
        </div>

        {/*
          Composed from `.railed--rows` and the refusal's typography rather than from
          `.refusal` itself. `.refusal` draws its own 2px datum and `.railed--rows`
          already draws the row rule, and two horizontals for one boundary is exactly
          the double-start the section rhythm exists to remove.

          The five items come from `content/shared.tsx`, or its Arabic twin
          `content/shared.ar.tsx`. They are the same paragraphs `/refusals` renders, and a
          second copy here would be a second copy to edit — in either language.
        */}
        <ol className="railed__full railed railed--rows lp-limits">
          {limits.map((limit, i) => (
            <li className="railed__row lp-limit reveal" key={limit.id}>
              <p className="railed__margin index" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </p>
              <div className="railed__body">
                <strong className="lp-limit__title">{limit.heading}</strong>
                <p>{limit.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="railed__body lp-prose lp-after">
          {t.limits.after}{' '}
          <Link to="/refusals" navigate={navigate}>
            {t.limits.link}
          </Link>
        </p>
      </section>

      {/* ================================================================
          06 — THE READINESS BAND
          ============================================================= */}
      <section className="lp-status-band" aria-labelledby="lp-readiness">
        <div className="shell lp-status-band__inner">
          <h2 id="lp-readiness">{t.readiness.title}</h2>
          <p>{t.readiness.body}</p>
          <div className="cta lp-cta">
            {readinessHasNumbers ? (
              <Link to="/readiness" navigate={navigate} className="button button--primary">
                {t.readiness.numbers}
              </Link>
            ) : null}
            <Link to="/app" navigate={navigate} className="button">
              {t.readiness.engine}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
