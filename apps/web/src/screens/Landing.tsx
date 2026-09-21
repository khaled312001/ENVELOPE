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
 */

import { useCallback, useState } from 'react';

// `Glyph` and `ProvenanceLegend` are imported rather than redrawn. The mark set and
// the provenance key both exist inside the engine, and a second copy on the marketing
// page is a copy that drifts — which on the key would mean the site teaching a reader
// one meaning for amber and the engine showing them another.
import { Glyph } from '../components/SiteChrome.js';
import { ProvenanceLegend } from '../components/TracedValue.js';
import { LIMITS } from '../content/shared.js';
// `Href`, not `Route`. Every CTA on this site carries a query — `/app?demo=…` — and a
// `Route`-only signature rejects all of them.
import { Link, type Href } from '../router.js';
import SNAPSHOT from './readiness.json' with { type: 'json' };
import example from './worked-example.json' with { type: 'json' };

const V = example.verified;
const I = example.input;

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

interface Band {
  readonly id: string;
  readonly letter: string;
  readonly name: string;
  readonly value: string;
  readonly formula: string;
  readonly note: string;
}

const BANDS: readonly Band[] = [
  {
    id: 'a',
    letter: 'A',
    name: 'What the code permits',
    value: V.bandAM2,
    formula: V.formulas.bandA,
    note: 'The floor-area ratio, applied to the plot. The only band a FAR calculator computes.',
  },
  {
    id: 'b',
    letter: 'B',
    name: 'What the envelope holds',
    value: V.bandBM2,
    formula: V.formulas.bandB,
    note: 'The plate the setbacks and the plate cap leave, stacked to the height ceiling.',
  },
  {
    id: 'c',
    letter: 'C',
    name: 'What the parking supports',
    value: V.bandCM2,
    formula: V.formulas.bandC,
    // NOT "bays that fit". The supply term this band rests on is an available area
    // divided by an area-per-bay factor; the placed level runs afterwards and cannot
    // reach back into it. Writing "fit" here would be the false causal claim §4.2 of
    // the site map exists to prevent, on the page that sells traceability.
    note: 'An available area divided by an area-per-bay factor, and the factor is assumed.',
  },
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

/** What an edge faces, in the drawing's own caps, from the classification it was given. */
function edgeLabel(seq: number): string {
  const edge = I.plot.edges.find((e) => e.seq === seq);
  if (!edge) return '';
  if ('roadHierarchy' in edge && edge.roadHierarchy) return `${edge.roadHierarchy} ROAD`;
  return edge.classification.replace(/_/g, ' ');
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

function PlotPlan(): JSX.Element {
  return (
    <svg
      className="lp-plan"
      viewBox="-12 -6 98 61"
      role="img"
      aria-label={
        `Plan of a ${PLOT_W} by ${PLOT_D} metre plot. Setbacks of ` +
        `${setbackAt(0)}, ${setbackAt(1)}, ${setbackAt(2)} and ${setbackAt(3)} metres leave a ` +
        `footprint of ${group(V.footprintM2)} square metres, inside which the tower plate cap ` +
        `leaves ${group(V.towerPlateCapM2)}.`
      }
    >
      <defs>
        {/* The setback is area the rules take away, so it is drawn as removed —
            hatched, not filled. Colour alone would not survive a greyscale print,
            and this page gets printed. */}
        <pattern
          id="lp-hatch"
          width="3"
          height="3"
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
        >
          <line x1="0" y1="0" x2="0" y2="3" className="lp-plan__hatch" />
        </pattern>
      </defs>

      <rect x="0" y="0" width={PLOT_W} height={PLOT_D} fill="url(#lp-hatch)" />
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
          TOWER PLATE CAP
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
          {edgeLabel(2)}
        </text>
        <text x={PLOT_W / 2} y={PLOT_D + 3.6} textAnchor="middle">
          {edgeLabel(0)}
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
  return (
    <div className="callout lp-assumption" data-state="assumed">
      <span className="callout__mark">
        <Glyph name="assumed" />
      </span>
      <div className="callout__body">
        <strong>{V.bayAreaFactorClass} — the area a bay is taken to consume</strong>
        <p>
          The parking supply is an available area divided by{' '}
          <span className="traced traced--assumed">
            <span className="value">
              {V.bayAreaFactorM2}
              <span className="value__unit">m²/bay</span>
            </span>
            <span className="traced__marker" aria-hidden="true" />
          </span>
          , and that divisor is not a constant: {V.bayAreaFactorBasis}
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
  const share = (Number(band.value) / widest) * 100;
  return (
    <li className={`lp-band${binding ? ' is-binding' : ''}${hero ? ' lp-band--hero' : ''}`}>
      <div className="lp-band__head">
        <span className="lp-band__letter" aria-hidden="true">
          {band.letter}
        </span>
        <span className="lp-band__name">
          Band {band.letter} — {band.name}
          {/* The binding row says so in words, carries a heavier rule and a larger
              figure. Colour carries none of the meaning on its own. */}
          {binding ? <span className="lp-tag lp-tag--binds">binds</span> : null}
        </span>
        <button
          type="button"
          className="lp-band__value"
          aria-expanded={open}
          aria-controls={`lp-why-${band.id}`}
          onClick={onToggle}
        >
          <span className="lp-band__why">{open ? 'hide' : 'why'}</span>
          <span className="lp-band__number">{group(band.value)}</span>
          <span className="lp-band__unit">m²</span>
          {open ? null : <span className="lp-band__why">?</span>}
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
        <p className="lp-band__formula">{band.formula}</p>
        {extraFormula ? <p className="lp-band__formula">{extraFormula}</p> : null}
        <p className="lp-band__note">{band.note}</p>
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
  const [heroOpen, setHeroOpen] = useState(true);
  const [openBand, setOpenBand] = useState<string | null>(null);
  const toggle = useCallback(
    (id: string) => setOpenBand((current) => (current === id ? null : id)),
    [],
  );

  /**
   * `/dashboard` renders a build-time snapshot when nobody is signed in, so the CTA
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
            Phase 0 · engine demonstration
          </p>

          <h1
            className="lp-hero__h1"
            id="lp-title"
            style={{ '--motion-order': 1 } as React.CSSProperties}
          >
            What these rules imply for this plot, and the derivation of every figure that
            says so.
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
            <p className="lp-answer__label">Governing capacity, this run</p>
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
              {/* Set in caps in the SOURCE and not by `text-transform`, and the reason is
                  mechanical rather than typographic: `expectClaimOrder` finds each of the
                  five claims by its first occurrence in the markup, so a sentence-case
                  "Regulatory validity" here would be found before the claim statement and
                  the order assertion would measure this stamp instead of that table. The
                  sentence-case string belongs to the claim row; this is the status stamp,
                  and the design language writes it in caps anyway. */}
              <strong>REGULATORY VALIDITY — NOT ASSESSED.</strong> No rule in this deployment
              is approved by a named professional, and every clause reference it holds is a
              placeholder rather than a sourced citation.
            </span>
          </p>

          <p className="lp-hero__lede" style={{ '--motion-order': 4 } as React.CSSProperties}>
            A compliance checker asks whether a setback clears some figure, and needs a
            drawing to exist. This engine reads the same clause as an inward offset, so the
            rule <strong>generates</strong> the answer instead of testing a drawing.
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
              Run this plot yourself
            </Link>
            <Link to="/refusals" navigate={navigate} className="button">
              What it refuses
            </Link>
          </div>
        </div>

        <figure className="figure lp-hero__figure">
          <div className="figure__plate">
            <PlotPlan />
          </div>
          <figcaption className="figure__caption">
            <p className="figure__label">
              <span className="figure__no">Plan</span>
              <span>
                {PLOT_W} × {PLOT_D} m · {I.plot.landUse.replace(/_/g, ' ').toLowerCase()}
              </span>
            </p>
            <dl className="figure__spec">
              <div>
                <dt>Plot area</dt>
                <dd>
                  <span className="value">{group(V.plotAreaM2)}</span> m²
                </dd>
              </div>
              <div>
                <dt>Setbacks, per edge</dt>
                <dd>
                  <span className="value">
                    {setbackAt(0)} · {setbackAt(1)} · {setbackAt(2)} · {setbackAt(3)}
                  </span>{' '}
                  m
                </dd>
              </div>
              <div>
                <dt>Footprint after offset</dt>
                <dd>
                  <span className="value">{group(V.footprintM2)}</span> m²
                </dd>
              </div>
              <div>
                <dt>Tower plate cap</dt>
                <dd>
                  <span className="value">{group(V.towerPlateCapM2)}</span> m²
                </dd>
              </div>
              <div>
                <dt>Levels</dt>
                <dd>
                  <span className="value">{V.levels}</span>
                </dd>
              </div>
            </dl>
            <p className="figure__source">
              This run, to scale, in the coordinates the geometry kernel used · hatched area
              is what the setback rules take away · regulatory validity — not assessed
            </p>
          </figcaption>
        </figure>
      </section>

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
          01
        </p>
        <div className="railed__body">
          <div className="section__head">
            <h2 id="lp-capacities">Capacities are reported separately, never averaged</h2>
            <p className="lp-lede">
              What the code permits, what the envelope holds and what the parking supports
              are separate questions. Quoting only the largest is how a plot gets bought
              against a number that was never available.
            </p>
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
            On this run, <strong className="lp-verdict__band">{V.governingBand}</strong> binds,
            and the <span className="lp-verdict__band">{V.nextBindingBand}</span> ceiling sits{' '}
            <strong>{group(V.headroomToNextM2)} m²</strong> above the answer.
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
          02
        </p>
        <div className="railed__body">
          <div className="section__head">
            <h2 id="lp-parking">How the parking number is actually made</h2>
          </div>

          <p className="lp-prose">
            Band C is the smaller of what the floor area permits and what the parking supply
            can serve. That supply is an available area divided by an area-per-bay factor,
            and no cited rule fixes the factor — it is the amber figure in the fold. The
            engine lays the level out as bays, aisles and a ramp inside the podium outline{' '}
            <em>afterwards</em>, so the drawing is a check on the factor and never its
            source. What the drawing costs against what the factor predicted is reported
            rather than absorbed.
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
                Assumed in the supply model{' '}
                <span className="lp-costed__class">{V.bayAreaFactorClass}</span>
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
                Measured on the level as laid out{' '}
                <span className="lp-costed__class">
                  {V.levelPlan.areaPerBayM2.provenanceClass}
                </span>
              </dt>
              <dd>
                <span className="value">{V.levelPlan.areaPerBayM2.value}</span> m²/bay
              </dd>
            </div>
            <div>
              <dt>
                Bays the placed level holds{' '}
                <span className="lp-costed__class">{V.levelPlan.bayCount.provenanceClass}</span>
              </dt>
              <dd>
                <span className="value">{V.levelPlan.bayCount.value}</span>
              </dd>
            </div>
          </dl>

          <p className="lp-prose">
            <Link to="/parking" navigate={navigate}>
              The chain from the factor to the band, and the level drawn
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
          03
        </p>
        <div className="railed__body">
          <div className="section__head">
            <h2 id="lp-guarantees">What holds the answer up</h2>
            <p className="lp-lede">
              Not a model, and not a guess with a confidence interval painted on afterwards.
            </p>
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
              <h3>Rules that generate, not rules that judge</h3>
              <p>A setback clause becomes an inward offset; nothing is tested afterwards.</p>
            </li>

            <li className="lp-chain__stage reveal">
              <span className="lp-chain__mark">
                <VertexDiagram />
              </span>
              <h3>Exact arithmetic on a declared grid</h3>
              <p>
                Integer millimetres and exact predicates; a near-tangent offset raises
                rather than returning a plausible wrong answer.
              </p>
            </li>

            <li className="lp-chain__stage reveal">
              <span className="lp-chain__mark">
                <TraceDiagram />
              </span>
              <h3>Every value carries its derivation</h3>
              <p>
                A filled gap is amber, and it says what it costs rather than merely that
                it exists.
              </p>
            </li>

            <li className="lp-chain__stage reveal">
              <span className="lp-chain__mark">
                <BlockedDiagram />
              </span>
              <h3>A layer that blocks emission</h3>
              <p>
                An independent check that cannot see the engine; a failure blocks the
                output and never warns.
              </p>
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
            <figcaption>
              The four classes, as the engine renders them. Amber is reserved for one of
              them, and nothing else in the product is permitted to use it.
            </figcaption>
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
          04
        </p>
        <div className="railed__body">
          <div className="section__head">
            <h2 id="lp-claims">Exactly what we claim</h2>
            <p className="lp-lede">
              Separate questions get separate answers, in every report the engine produces,
              and the wording is fixed in the specification rather than written by whoever is
              selling.
            </p>
          </div>
        </div>

        <dl className="railed__full lp-claims">
          {[
            {
              t: 'Self-consistency',
              s: 'Supported',
              m: 'supported' as const,
              d: (
                <>
                  The output satisfies every constraint we encoded and its arithmetic closes.
                  This says the engine did what it was told — not that what it was told is
                  right.
                </>
              ),
            },
            {
              t: 'Rule coverage',
              s: 'Partial, and quantified',
              m: 'partial' as const,
              d: (
                <>
                  We report how many of the requirements <em>we identified</em> are encoded,
                  and list what is deferred. The denominator is our own inventory. A
                  requirement nobody thought of is missing from both sides of that ratio, so a
                  high proportion is evidence of diligence, never of completeness.
                </>
              ),
            },
            {
              t: 'Geometric validity',
              s: 'Supported',
              m: 'supported' as const,
              d: (
                <>
                  Every polygon is computed in exact integer arithmetic on a declared 1 mm
                  grid, and every area is recomputed by independent methods that must agree
                  exactly. Degenerate geometry raises rather than returning a plausible wrong
                  answer.
                </>
              ),
            },
            {
              t: 'Agreement with professional judgement',
              s: 'Not yet measured',
              m: 'deferred' as const,
              d: (
                <>
                  Whether a qualified architect would produce a comparable answer has not been
                  measured. The study needs the inter-architect variance band established
                  first, by architects who have not yet been engaged. Until then no figure may
                  be quoted, and none is.
                </>
              ),
            },
            {
              t: 'Regulatory validity',
              s: 'Never claimed',
              m: 'never' as const,
              d: (
                <>
                  This system does not and cannot determine whether an authority would approve
                  a scheme. Not “not yet”. Not “pending certification”. It is not obtainable
                  from any computation, our validator agreeing with our generator is
                  self-consistency and nothing more, and no output of this product may be
                  described as a compliance check.
                </>
              ),
            },
          ].map((c) => (
            <div className={`lp-claim lp-claim--${c.m} reveal`} key={c.t}>
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
            What each of these statuses would take to change
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
          05
        </p>
        <div className="railed__body">
          <div className="section__head">
            <h2 id="lp-limits">What it does not do</h2>
            <p className="lp-lede">
              {/* The lede used to call itself "longer than the feature list". It is
                  longer by item count and SHORTER by word count, and a
                  self-description the page does not satisfy is a small dishonesty on
                  the page that sells honesty. */}
              More of them than there are features, and deliberately so. Every line here is a
              thing somebody will otherwise assume.
            </p>
          </div>
        </div>

        {/*
          Composed from `.railed--rows` and the refusal's typography rather than from
          `.refusal` itself. `.refusal` draws its own 2px datum and `.railed--rows`
          already draws the row rule, and two horizontals for one boundary is exactly
          the double-start the section rhythm exists to remove.

          The five items come from `content/shared.tsx`. They are the same paragraphs
          `/refusals` renders, and a second copy here would be a second copy to edit.
        */}
        <ol className="railed__full railed railed--rows lp-limits">
          {LIMITS.map((limit, i) => (
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
          There are more of these, and some of them the software performs at runtime as a
          refusal you can watch it return.{' '}
          <Link to="/refusals" navigate={navigate}>
            The whole list, and what it would take to change any of it
          </Link>
        </p>
      </section>

      {/* ================================================================
          06 — THE READINESS BAND
          ============================================================= */}
      <section className="lp-status-band" aria-labelledby="lp-readiness">
        <div className="shell lp-status-band__inner">
          <h2 id="lp-readiness">Where this deployment actually stands</h2>
          <p>
            No rule in it is approved by a named professional, the metric definitions annex
            is unsigned, and every clause reference it carries is a placeholder rather than a
            sourced citation. Every figure it produces today is an engine demonstration on
            draft rules — not a capacity assessment, and not quotable to a third party. That
            is stated on every screen and printed on every report.
          </p>
          <div className="cta lp-cta">
            {readinessHasNumbers ? (
              <Link to="/dashboard" navigate={navigate} className="button button--primary">
                See the readiness numbers
              </Link>
            ) : null}
            <Link to="/app" navigate={navigate} className="button">
              Open the engine anyway
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
