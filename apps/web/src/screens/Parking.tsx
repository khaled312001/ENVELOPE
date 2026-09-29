/**
 * `/parking` — how the parking number is made.
 *
 * THE ONE SENTENCE THIS PAGE MAY NOT WRITE, and it is the sentence every earlier
 * proposal wanted: *"most tools divide an area by a factor; this one places
 * rectangles."* It is false about this engine. `packages/capacity/src/pipeline.ts`
 * runs `computeBands` at line 367 and `planParkingLevel` at line 453, inside a `try`
 * whose failure is caught and reported rather than thrown. The placed rectangles are
 * strictly DOWNSTREAM of Band C and cannot inform it. Band C rests on
 * `parking.supportableUnitCeiling`, whose supply term is `parking.provided_bays` —
 * `floor(available area ÷ 32 m²/bay)` at `parking.ts:306`, with the 32 `ASSUMED`.
 *
 * Publishing that sentence would put a false causal claim under the site's headline
 * number, on the page that sells traceability, and NO GATE WOULD CATCH IT: `pnpm
 * example` diffs values and not the claims wrapped around them.
 *
 * The true version is the stronger one, and it is what this page is. We compute the
 * supply from an assumed factor. We say so in amber, with the basis printed in full.
 * Then we lay the level out and report what the drawing costs against what the
 * factor predicted. A product naming where its own governing number is weakest, and
 * then measuring the weakness.
 *
 * ---
 *
 * THREE QUANTITIES THAT ARE NOT ONE QUANTITY, and the reason §3 exists at all:
 *
 *   `parking.total_bays`                  demand of the larger scheme used to PROBE
 *                                         for the parking ceiling
 *   `parking.provided_bays`               what the declared levels hold — supply
 *   `parking.demand_at_governing_capacity` what the reported answer actually needs
 *
 * Only the first is on the wire. `apps/api/src/present.ts` serialises `totalBays`
 * and neither of the other two, so this page prints one figure and NAMES the other
 * two in words. Substituting `levelPlan.bayCount` for supply would be reporting a
 * fourth quantity as a second — the exact defect §3 exists to prevent, committed
 * inside the section that prevents it.
 *
 * ---
 *
 * ON THE DRAWING. Every rectangle is one the engine placed, in the kernel's own plot
 * coordinates; this file adds a colour and a label and nothing else. The colours are
 * provenance classes and not a palette: bays and aisles are DERIVED from a cited
 * dimension table, the ramp is DEFERRED because only its plan area is reserved.
 *
 * The ramp used to be amber, here and in `ParkingPlan.tsx`. `app.css:1100` has since
 * moved the legend swatch to the deferred pair and `site.css` maps
 * `.parking-legend__swatch--ramp` to `--deferred`, and that is the correct reading:
 * gradient, transitions and headroom are NOT ASSESSED, which is a deferred fact, not
 * an assumption. Removing an amber that was never an assumption is what makes the
 * remaining amber mean something. This page follows the code, not the older comment.
 *
 * ---
 *
 * TWO LANGUAGES, AND THE ENGINE SPEAKS ONLY ONE OF THEM.
 *
 * Every sentence this page authors comes from `i18n/parking.en.ts` or its Arabic
 * twin, and the English module is the type the Arabic one is held to. Nothing the
 * ENGINE wrote moved: the bases, the formula, the access rationales and refusal
 * reasons, the not-assessed residue, the verdict and the class and band tokens are
 * rendered here as the run emitted them. On the Arabic page they are marked as the
 * English they are — `Engine` wraps an inline run in `Verbatim`, and `engineLang`
 * puts `dir="ltr" lang="en"` on an element whose whole content is the engine's and
 * whose own face must survive (the formula is mono; a `.verbatim` span would set it
 * in sans). On the English page both are no-ops, and the markup is byte-identical to
 * the render before the translation: the English suite in `parking-page.test.tsx`
 * was written against that render, and it reads it unchanged.
 */

import { useCallback, useState, type ReactNode } from 'react';

import { Glyph } from '../components/SiteChrome.js';
import { WorkedExampleModel } from '../components/WorkedExampleModel.js';
import { OPTIMISER_REFUSAL_AR, type SharedParagraph } from '../content/shared.ar.js';
import { OPTIMISER_REFUSAL } from '../content/shared.js';
import { PageContents } from '../components/PageContents.js';
import { useDict, useLocale, Verbatim } from '../i18n/locale.js';
import { AR } from '../i18n/parking.ar.js';
import { EN, type ParkingDictionary } from '../i18n/parking.en.js';
import type { PageProps } from '../Root.js';
import { Link } from '../router.js';
import example from './worked-example.json' with { type: 'json' };

const IN = example.input;
/**
 * The worked example's parking level at grade, in the building model.
 *
 * `G`, because levels are named for what they are rather than for their index —
 * `B2, B1, G, P1, L03` is how a Dubai drawing is numbered, and `L00` named the
 * ground floor, a podium level and a typical floor alike. Checked in
 * `parking-page.test.tsx` against the model file, so a change to how the engine
 * stacks the parking cannot leave this figure framing a level that is not there.
 */
export const MODEL_LEVEL = 'G';
const V = example.verified;

/* -------------------------------------------------------------------------
 * Formatting. Thousands separators, and not one digit of rounding.
 * ---------------------------------------------------------------------- */

function group(value: string): string {
  const [whole, frac] = value.split('.');
  const grouped = (whole ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${grouped}.${frac}` : grouped;
}

/** `"6.000"` → `"6"`. The engine pads; a dimension line does not. */
const trim = (value: string): string =>
  value.includes('.') ? value.replace(/\.?0+$/, '') : value;

/**
 * `DEG_90` → `90°`, `TWO_WAY` → `two way` · «ثنائي الاتجاه». The wire enum, made
 * readable. The angle is formatting and the same in both languages; the words are
 * the dictionary's. A token neither dictionary knows falls back to the rule this
 * function always applied, so a new engine enum renders as its own word rather than
 * as nothing.
 */
const readable = (t: ParkingDictionary, token: string): string =>
  token.startsWith('DEG_')
    ? `${token.slice(4)}°`
    : (t.tokens[token] ?? token.toLowerCase().replace(/_/g, ' '));

/* -------------------------------------------------------------------------
 * THE ENGINE'S OWN WORDS, MARKED AS SUCH.
 *
 * Two instruments, because the engine's strings arrive in two shapes. An inline
 * run inside a sentence the page wrote — a band token, a basis — takes `Engine`,
 * which is `Verbatim` on the Arabic page. An element whose WHOLE content is the
 * engine's and whose own face must survive — the mono formula, the class token in
 * the gauge — takes `engineLang` on the element itself: a `.verbatim` span inside it
 * would set the run in sans. Either way the result is `dir="ltr" lang="en"`, which
 * is what isolates the run from the bidirectional algorithm and switches a screen
 * reader's voice.
 *
 * Both are no-ops in English. That is not a shortcut: the English markup is held
 * byte-identical to the render the English suite was written against.
 * ---------------------------------------------------------------------- */

const ENGINE_LANG = { dir: 'ltr', lang: 'en' } as const;
const AS_WRITTEN = {} as const;

function useEngineLang(): typeof ENGINE_LANG | typeof AS_WRITTEN {
  return useLocale().locale === 'ar' ? ENGINE_LANG : AS_WRITTEN;
}

function Engine({ children }: { readonly children: ReactNode }): JSX.Element {
  return useLocale().locale === 'ar' ? <Verbatim>{children}</Verbatim> : <>{children}</>;
}

/* -------------------------------------------------------------------------
 * THE WIRE SHAPES, WIDENED ON PURPOSE.
 *
 * `worked-example.json` is a build-time import, so TypeScript reads the fixture
 * that happens to be on disk today and narrows every optional key out of
 * existence. That makes the degradation paths below unwritable — and they are
 * the paths the site-map specifies by name: a run whose level plan was refused,
 * a fixture regenerated without one, a comparison leg that threw.
 *
 * So each is annotated to the type the API can actually return. The guards are
 * a contract with `scripts/verify-worked-example.mjs`, not dead branches: the
 * next `--write` can legitimately produce any of them.
 * ---------------------------------------------------------------------- */

/** `side()` in the comparison handler returns `{ error }` for a leg that threw. */
interface FarLeg {
  readonly regulatoryGfaM2: string;
  readonly governingGfaM2: string;
  readonly governingBand: string;
}
interface FarError {
  readonly error: string;
}
type FarSide = FarLeg | FarError;
const answered = (side: FarSide): side is FarLeg => 'regulatoryGfaM2' in side;

const levelPlan: typeof V.levelPlan | undefined = V.levelPlan;
const levelPlanRefusal: string | null = V.levelPlanRefusal;
const parkingInFar: typeof V.parkingInFar | undefined = V.parkingInFar;

/*
  WHETHER THE FAR SECTION IS DRAWN AT ALL, decided HERE rather than inside the
  component that draws it. `ParkingInFar` returns null when neither leg of the
  declaration was answered, and while that decision lived only inside the
  component nothing outside could know whether the section existed — which is
  exactly what a contents list and a section ordinal both have to know. A guard
  only the guarded code can see makes every count around it a guess.
*/
const FAR_SHOWN: boolean =
  parkingInFar !== undefined &&
  (answered(parkingInFar.countsTowardFar) || answered(parkingInFar.excludedFromFar));

/* -------------------------------------------------------------------------
 * THE ASSUMPTIONS THE SUPPLY MODEL RESTS ON.
 *
 * Built by FILTERING on the class the engine put on the wire, never by counting
 * by hand: the margin tally in the rail gutter reads its length, so if the
 * engine ever stops calling the area factor an assumption the tally moves on
 * its own. A hand-typed 2 would go on saying two after the engine said one.
 * ---------------------------------------------------------------------- */

interface Assumed {
  readonly id: string;
  readonly label: string;
  readonly provenanceClass: string;
}

const SUPPLY_INPUTS: readonly Assumed[] = [
  {
    id: 'factor',
    label: 'Gross area per bay',
    provenanceClass: V.bayAreaFactorClass,
  },
  {
    id: 'usable',
    label: 'Usable fraction of a level',
    provenanceClass: IN.run.parkingUsableFraction.source,
  },
];

const SUPPLY_ASSUMPTIONS = SUPPLY_INPUTS.filter((a) => a.provenanceClass === 'ASSUMED');

/* -------------------------------------------------------------------------
 * PLOT GEOMETRY. Metres, y running north; SVG's y runs down, so the flip is
 * done per point rather than by transforming the group — a `scale(1,-1)` would
 * mirror every label with it.
 * ---------------------------------------------------------------------- */

interface Pt {
  readonly x: number;
  readonly y: number;
}
interface WirePt {
  readonly x: string;
  readonly y: string;
}

const VX = IN.plot.vertices.map((v) => Number(v.x));
const VY = IN.plot.vertices.map((v) => Number(v.y));
const X0 = Math.min(...VX);
const X1 = Math.max(...VX);
const Y0 = Math.min(...VY);
const Y1 = Math.max(...VY);
const PLOT_W = X1 - X0;
const PLOT_D = Y1 - Y0;

/** One stroke unit, so every line in the drawing is proportional to the plot. */
const SW = Math.max(PLOT_W, PLOT_D) / 400;

const toSvg = (p: WirePt): Pt => ({ x: Number(p.x) - X0, y: Y1 - Number(p.y) });
const poly = (ring: readonly WirePt[]): string =>
  ring.map(toSvg).map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(' ');

/* The kinds, ordered so bay outlines are not overpainted by the aisle they sit
   against, and mapped to the provenance class of the thing each one is. */
const KIND_ORDER: Readonly<Record<string, number>> = {
  AISLE: 0,
  RAMP: 1,
  OBSTRUCTION: 2,
  BAY: 3,
  ACCESSIBLE_BAY: 4,
};
const KIND_FILL: Readonly<Record<string, string>> = {
  BAY: 'var(--derived-surface)',
  ACCESSIBLE_BAY: 'var(--derived-surface)',
  AISLE: 'var(--surface-sunken)',
  RAMP: 'url(#pk-ramp-hatch)',
  OBSTRUCTION: 'var(--deferred-surface)',
};
const KIND_STROKE: Readonly<Record<string, string>> = {
  BAY: 'var(--derived)',
  ACCESSIBLE_BAY: 'var(--derived)',
  AISLE: 'var(--border-control)',
  RAMP: 'var(--deferred)',
  OBSTRUCTION: 'var(--deferred-hatch)',
};
/* The legend's row labels are copy, and live in `parking.en.ts` as `kinds`. */
/*
 * THE SWATCH CARRIES THE DRAWING'S OWN INK, and getting this wrong is worse than
 * having no legend at all.
 *
 * `app.css` supplies a `--bay` swatch in the interactive blue. That is right inside
 * the engine's own plan and wrong here, where the bays are drawn in the DERIVED ink
 * and the blue is reserved for things a reader can click. So bay, aisle and access
 * take classes declared beside the drawing that paints them.
 *
 * THE RAMP KEEPS THE SHARED CLASS, and that is the exception rather than an
 * oversight: `.parking-legend__swatch--ramp` is the single place the ruling "the
 * ramp is DEFERRED, not assumed" is written, it already carries the hatch, and
 * copying it here would be a second copy of the one decision that matters most on
 * this drawing.
 */
const KIND_SWATCH: Readonly<Record<string, string>> = {
  BAY: 'pk-legend__swatch--bay',
  AISLE: 'pk-legend__swatch--aisle',
  RAMP: 'parking-legend__swatch--ramp',
};

/* -------------------------------------------------------------------------
 * Small components. Each is one pattern from the chassis, filled in.
 * ---------------------------------------------------------------------- */

/**
 * A figure with its label above it. NEVER a hyphen or a dash where a number
 * belongs: a section whose figure did not arrive renders prose instead, and the
 * call site decides that, not this component.
 */
function Fig({
  label,
  value,
  unit,
  unitIsEngine,
  note,
}: {
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
  /**
   * The unit is the one the engine put on the traced value, not one this page
   * supplied, so on the Arabic page it is marked as the English it is. A unit the
   * page supplies («موقف» for the demand figure) is copy and is translated.
   */
  readonly unitIsEngine?: boolean;
  /** A node rather than a string: a note can carry an engine token inside a sentence. */
  readonly note?: ReactNode;
}): JSX.Element {
  const engineLang = useEngineLang();
  return (
    <div className="pk-fig">
      <p className="pk-fig__label">{label}</p>
      <p className="pk-fig__value">
        <span className="value">{value}</span>
        {unit ? (
          <span className="value__unit" {...(unitIsEngine ? engineLang : AS_WRITTEN)}>
            {unit}
          </span>
        ) : null}
      </p>
      {note ? <p className="pk-fig__note">{note}</p> : null}
    </div>
  );
}

/**
 * An ASSUMED value, in the treatment §13.1 calls the most important UI decision
 * in the product: amber ground, dotted underline, weight step, drawn pencil, and
 * the class announced as TEXT so it survives greyscale and a screen reader.
 *
 * The amber arrives through `.traced--assumed` and through nothing else — this
 * page's stylesheet never writes `var(--uncertain)`, which is what keeps
 * `assertAmberExclusive` stable while six page sheets are written in parallel.
 */
function AssumedValue({
  value,
  unit,
}: {
  readonly value: string;
  readonly unit?: string;
}): JSX.Element {
  /* The spoken class is «مُفترَض» on the Arabic page and never «افتراضي», which
     is "default" — the one thing this codebase forbids having. The amber itself
     does not change with the language. */
  const t = useDict(EN, AR);
  return (
    <span className="traced--assumed">
      <span className="value">{value}</span>
      {unit ? <span className="value__unit">{unit}</span> : null}
      <span className="traced__marker" aria-hidden="true" />
      <span className="sr-only">{t.assumed.spoken}</span>
    </span>
  );
}

/** The rail-gutter tally: channel 5 of the ASSUMED treatment. */
function Tally({ count }: { readonly count: number }): JSX.Element {
  const t = useDict(EN, AR);
  return count > 0 ? (
    <p className="margin-tally">
      <Glyph name="assumed" />
      {count}
      <span className="margin-tally__label">{t.assumed.tally}</span>
    </p>
  ) : (
    <p className="margin-tally margin-tally--none">
      <span className="margin-tally__label">{t.assumed.tallyNone}</span>
    </p>
  );
}

/** NOT ASSESSED, in the deferred treatment: hatched band, dashed edge, italic. */
function NotAssessed({ children }: { readonly children: string }): JSX.Element {
  return (
    <span className="not-assessed">
      <Glyph name="deferred" />
      {children}
    </span>
  );
}

function Section({
  index,
  id,
  title,
  lede,
  tally,
  minor,
  children,
}: {
  readonly index: string;
  readonly id: string;
  readonly title: string;
  readonly lede?: JSX.Element;
  readonly tally?: JSX.Element;
  readonly minor?: boolean;
  readonly children: React.ReactNode;
}): JSX.Element {
  return (
    <section
      className={`shell section${minor ? ' section--minor' : ''}`}
      id={id}
      aria-labelledby={`${id}-h`}
    >
      <div className="railed section__head">
        <div className="railed__margin">
          {tally}
          <p className="index" aria-hidden="true">
            {index}
          </p>
        </div>
        <div className="railed__body">
          <h2 id={`${id}-h`}>{title}</h2>
          {lede ? <p className="pk__lede">{lede}</p> : null}
        </div>
      </div>
      <div className="railed">
        <div className="railed__body section__body">{children}</div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------
 * THE DRAWING.
 *
 * It scales by viewBox and never scrolls. A drawing that has to be panned on a
 * phone is a drawing nobody reads, so it is the LEGEND below that reflows —
 * which is also the only part of this figure a reader has to be able to hit.
 * ---------------------------------------------------------------------- */

function LevelDrawing({
  plan,
  emphasis,
}: {
  readonly plan: NonNullable<typeof levelPlan>;
  readonly emphasis: string | null;
}): JSX.Element {
  const t = useDict(EN, AR);
  const rects = [...plan.rects].sort(
    (a, b) => (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9),
  );
  const access = V.access.recommended;
  const open = { a: toSvg(access.opening.start), b: toSvg(access.opening.end) };

  /* Edge labels are placed from the plot's own vertex ring and its own
     `roadHierarchy`, never from a literal: an edge relabelled in the fixture
     relabels here. The outward normal is the midpoint less the centroid, which
     is exact for a convex ring and is the only case an affection plan draws. */
  const centre = { x: PLOT_W / 2, y: PLOT_D / 2 };
  const roadLabels = IN.plot.edges.flatMap((e) => {
    // `in`, not optional chaining: an edge that faces a neighbouring plot has no
    // `roadHierarchy` key at all on the wire, so the two shapes are a union and
    // there is nothing to chain off.
    if (e.classification !== 'ROAD' || !('roadHierarchy' in e) || !e.roadHierarchy) return [];
    const a = IN.plot.vertices[e.seq];
    const b = IN.plot.vertices[(e.seq + 1) % IN.plot.vertices.length];
    if (!a || !b) return [];
    const m = { x: (toSvg(a).x + toSvg(b).x) / 2, y: (toSvg(a).y + toSvg(b).y) / 2 };
    const dx = m.x - centre.x;
    const dy = m.y - centre.y;
    const len = Math.hypot(dx, dy) || 1;
    const vertical = Math.abs(dx) > Math.abs(dy);
    return [
      {
        seq: e.seq,
        text: `${e.roadHierarchy} ROAD`,
        x: m.x + (dx / len) * 3.4,
        y: m.y + (dy / len) * 3.4 + (vertical ? 0 : dy > 0 ? 1.8 : -0.4),
        vertical,
      },
    ];
  });

  /* The drawing's accessible NAME is copy and is translated; the text drawn inside
     it (the road labels below) is part of the drawing and is not. Every figure in
     the name is the run's. */
  const summary = t.level.summary({
    bays: plan.bayCount.value,
    bayWidth: plan.standard.bayWidthM,
    bayLength: plan.standard.bayLengthM,
    aisleWidth: plan.standard.drivewayWidthM,
    packWidth: plan.packingRect.widthM,
    packDepth: plan.packingRect.depthM,
    accessWidth: access.widthM,
    // Numbered from 1, as the plot step and its figure number edges; `edgeSeq` is 0-based.
    frontage: String(access.edgeSeq + 1),
  });

  return (
    <svg
      className="pk-plan"
      viewBox={`${-10} ${-6} ${PLOT_W + 20} ${PLOT_D + 14}`}
      role="img"
      aria-label={summary}
    >
      <defs>
        {/* The ramp hatch: a pattern rather than a fill opacity, because opacity
            is a colour difference and this has to survive a greyscale print and
            a reader with a colour vision deficiency. */}
        <pattern
          id="pk-ramp-hatch"
          width="1.8"
          height="1.8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="1.8" height="1.8" fill="var(--deferred-surface)" />
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="1.8"
            stroke="var(--deferred-hatch)"
            strokeWidth={SW * 2}
          />
        </pattern>
      </defs>

      {/* The plot, then what the setbacks leave, then what was packed into it. */}
      <polygon
        points={poly(IN.plot.vertices)}
        fill="none"
        stroke="var(--text-tertiary)"
        strokeWidth={SW}
        strokeDasharray={`${SW * 5} ${SW * 4}`}
      />
      <polygon
        points={poly(plan.podiumRing)}
        fill="var(--surface-raised)"
        stroke="var(--border-strong)"
        strokeWidth={SW * 1.6}
      />
      {/* The pack target. Drawn dashed even where it coincides with the podium:
          the coincidence IS what `packingRect.exact` means, and a reader who
          cannot see the target cannot see that it was met. */}
      <polygon
        points={poly(plan.packingRect.outline)}
        fill="none"
        stroke="var(--border-control)"
        strokeWidth={SW * 1.2}
        strokeDasharray={`${SW * 4} ${SW * 3}`}
      />

      {rects.map((r, i) => (
        <polygon
          key={`${r.kind}-${r.row}-${i}`}
          points={poly(r.outline)}
          fill={KIND_FILL[r.kind] ?? 'none'}
          stroke={KIND_STROKE[r.kind] ?? 'var(--border-strong)'}
          strokeWidth={
            emphasis === r.kind ? SW * 3.2 : SW * (r.kind === 'AISLE' ? 0.7 : 1)
          }
        />
      ))}

      {/* Where the cars get in. DERIVED, so it is drawn in the derived ink and
          not in the interactive blue: one blue, interactive affordance only. */}
      <line
        x1={open.a.x}
        y1={open.a.y}
        x2={open.b.x}
        y2={open.b.y}
        stroke="var(--derived)"
        strokeWidth={SW * 5}
        strokeLinecap="butt"
      />

      <g className="pk-plan__edge">
        {roadLabels.map((l) => (
          <text
            key={l.seq}
            x={l.x}
            y={l.y}
            textAnchor="middle"
            transform={l.vertical ? `rotate(-90 ${l.x} ${l.y})` : undefined}
          >
            {l.text}
          </text>
        ))}
      </g>
    </svg>
  );
}

/**
 * The ramp on its own, at its plan dimensions, with the dimension lines a
 * drawing draws — and NOT ASSESSED said in words beside it.
 *
 * Drawing a ramp that reads as checked when only its plan area was considered
 * would be worse than drawing none, so the footprint keeps the hatch, the dashed
 * edge and the real italic of the deferred treatment rather than the solid line
 * every other rectangle on this page gets.
 */
function RampDrawing({
  widthM,
  depthM,
}: {
  readonly widthM: string;
  readonly depthM: string;
}): JSX.Element {
  const t = useDict(EN, AR);
  const w = Number(widthM);
  const d = Number(depthM);
  const s = Math.max(w, d) / 220;
  /* The viewBox is wide enough on the left for the rotated dimension figure and
     deep enough below for the horizontal one. A dimension line drawn outside the
     viewBox is a dimension line nobody sees, and it fails silently. */
  return (
    <svg
      className="pk-ramp"
      viewBox={`${-w * 1.9} ${-d * 0.08} ${w * 3.2} ${d * 1.38}`}
      role="img"
      aria-label={t.ramp.drawingLabel(trim(widthM), trim(depthM))}
    >
      <defs>
        <pattern
          id="pk-ramp-hatch-2"
          width={w * 0.3}
          height={w * 0.3}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width={w * 0.3} height={w * 0.3} fill="var(--deferred-surface)" />
          <line
            x1="0"
            y1="0"
            x2="0"
            y2={w * 0.3}
            stroke="var(--deferred-hatch)"
            strokeWidth={s * 2.4}
          />
        </pattern>
      </defs>
      <rect
        x="0"
        y="0"
        width={w}
        height={d}
        fill="url(#pk-ramp-hatch-2)"
        stroke="var(--deferred)"
        strokeWidth={s * 2}
        strokeDasharray={`${s * 6} ${s * 5}`}
      />
      <g className="pk-ramp__rule">
        <line x1={-w * 0.9} y1="0" x2={-w * 0.9} y2={d} />
        <line x1={-w * 1.2} y1="0" x2={-w * 0.6} y2="0" />
        <line x1={-w * 1.2} y1={d} x2={-w * 0.6} y2={d} />
        <line x1="0" y1={d * 1.09} x2={w} y2={d * 1.09} />
        <line x1="0" y1={d * 1.05} x2="0" y2={d * 1.13} />
        <line x1={w} y1={d * 1.05} x2={w} y2={d * 1.13} />
      </g>
      <g className="pk-ramp__dim">
        <text
          x={-w * 1.5}
          y={d / 2}
          textAnchor="middle"
          transform={`rotate(-90 ${-w * 1.5} ${d / 2})`}
        >
          {trim(depthM)} m
        </text>
        <text x={w / 2} y={d * 1.26} textAnchor="middle">
          {trim(widthM)} m
        </text>
      </g>
    </svg>
  );
}

/* ---------------------------------------------------------------------- */

export default function Parking({ navigate }: PageProps): JSX.Element {
  const t = useDict(EN, AR);
  const engineLang = useEngineLang();
  /* The optimiser refusal is SHARED with `/refusals`, so it is switched between its
     two single sources rather than translated here a second time. */
  const optimiser = useDict<SharedParagraph>(OPTIMISER_REFUSAL, OPTIMISER_REFUSAL_AR);

  /* The legend doubles as the target-size control list: each row is a real
     button that thickens its own kind in the drawing. A 1px polygon edge is not
     a target anybody can hit, and 2.5.8's answer is a full-width row beside it —
     the same move `.plot-legend__row` already makes on the engine's plan. */
  const [emphasis, setEmphasis] = useState<string | null>(null);
  const toggle = useCallback(
    (kind: string) => setEmphasis((current) => (current === kind ? null : kind)),
    [],
  );

  const plan = levelPlan;
  const refusal = levelPlanRefusal;
  const ramp = plan?.rects.find((r) => r.kind === 'RAMP');
  const access = V.access;
  const drawable = plan !== undefined && refusal === null;

  /*
    ONE RECORD FOR THE ORDER, THE ORDINALS AND THE CONTENTS.

    The ordinals used to be typed into each `<Section index="NN">`, which is how
    two sections both came to be `04` — they are alternatives, so on any one
    reading only one renders and the duplicate never showed. The same property
    made every number after a SUPPRESSED section wrong: with no level plan the
    page printed 02, then 11, then 12. Those were positions in a page somebody
    had in mind, not in the page being read.

    Derived, they are positions in what is actually on screen, and the contents
    list cannot offer a link to a section that was never drawn.
  */
  const order: readonly { readonly id: string; readonly label: string }[] = [
    { id: 'pk-chain', label: t.chain.title },
    ...(plan !== undefined ? [{ id: 'pk-demand', label: t.demand.title }] : []),
    ...(plan !== undefined && refusal !== null
      ? [{ id: 'pk-refused', label: t.refused.title }]
      : []),
    ...(drawable
      ? [
          { id: 'pk-level', label: t.level.title },
          { id: 'pk-cost', label: t.cost.title },
          { id: 'pk-pack', label: t.pack.title },
          { id: 'pk-dims', label: t.dims.title },
          ...(ramp ? [{ id: 'pk-ramp', label: t.ramp.title }] : []),
          { id: 'pk-access', label: t.access.title },
        ]
      : []),
    ...(FAR_SHOWN ? [{ id: 'pk-far', label: t.far.title }] : []),
    { id: 'pk-not', label: t.not.title },
    { id: 'pk-unproven', label: t.unproven.title },
  ];
  const idx = (id: string): string =>
    String(order.findIndex((s) => s.id === id) + 1).padStart(2, '0');

  /* R10: which band binds is templated from the fixture and asserted against it.
     `pnpm example` diffs values and not the claims wrapped around them, so a
     rule edit that made another band bind would leave a hand-typed sentence
     false with every gate green. */
  const band = V.governingBand;

  return (
    <div className="pk">
      {/* --- 1. The claim ------------------------------------------------- */}
      <section className="shell section section--opening" aria-labelledby="pk-h1">
        <div className="railed">
          {/* THE CLAIM HOLDS ITS OWN EVIDENCE (direction.md §4). The lede says "here
              is the assumption", and for as long as this page existed the assumption
              was 1,100px further down: the first screen of the page about an
              assumption carried no amber at all, which `pnpm amber` named on every
              run. The figure and the value it rests on stand beside the sentence now,
              read from the same fixture as everything below. */}
          <div className="railed__body pk-opening">
            <div className="pk-opening__claim">
              <p className="eyebrow">{t.opening.eyebrow}</p>
              <h1 id="pk-h1" className="pk-claim">
                {t.opening.title}
              </h1>
              <p className="pk__lede pk-claim__lede">{t.opening.lede}</p>
            </div>
            <aside className="pk-opening__evidence" aria-label={t.opening.evidenceLabel}>
              <Fig
                label={t.opening.governingLabel}
                value={group(V.governingGfaM2)}
                unit="m²"
                note={t.opening.governingNote(band)}
              />
              <p className="pk-fig__label">{t.opening.restsOn}</p>
              <div className="callout" data-state="assumed">
                <span className="callout__mark" aria-hidden="true">
                  <Glyph name="assumed" />
                </span>
                <div className="callout__body">
                  {/* The unit stays `m²/bay` in both languages: it is the notation the
                      engine's basis and its achieved-area figure both use, and §5 sets
                      the two side by side. One unit written two ways there would read
                      as two units. */}
                  <strong>
                    {t.factorName}{' '}
                    <AssumedValue value={V.bayAreaFactorM2} unit="m²/bay" /> ·{' '}
                    <Engine>{V.bayAreaFactorClass}</Engine>
                  </strong>
                  <p className="pk-basis">
                    <Engine>{V.bayAreaFactorBasis}</Engine>
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <PageContents entries={order} />

      {/* --- 2. Where the governing number comes from ---------------------- */}
      <Section
        index={idx('pk-chain')}
        id="pk-chain"
        title={t.chain.title}
        tally={<Tally count={SUPPLY_ASSUMPTIONS.length} />}
        lede={<>{t.chain.lede}</>}
      >
        <ol className="pk-chain">
          <li className="pk-chain__item">
            <p className="pk-chain__name">{t.chain.mix.name}</p>
            <p className="pk-chain__note">{t.chain.mix.note}</p>
          </li>
          <li className="pk-chain__item">
            <p className="pk-chain__name">{t.chain.probe.name}</p>
            <p className="pk-chain__note">{t.chain.probe.note}</p>
          </li>
          <li className="pk-chain__item">
            <p className="pk-chain__name">{t.chain.available.name}</p>
            <p className="pk-chain__note">{t.chain.available.note}</p>
            <p className="pk-chain__fig">
              <span className="pk-chain__op" aria-hidden="true">
                ×
              </span>
              <span>
                <span className="value">{IN.run.parkingLevelsAvailable}</span>
                <span className="value__unit">{t.chain.available.levels}</span>
              </span>
              <span className="pk-chain__op" aria-hidden="true">
                ×
              </span>
              <AssumedValue
                value={IN.run.parkingUsableFraction.value}
                unit={t.chain.available.usable}
              />
            </p>
            <p className="pk-chain__basis">
              {t.chain.available.basis}
              <Engine>{IN.run.parkingUsableFraction.basis}</Engine>.
            </p>
          </li>

          <li className="pk-chain__item pk-chain__item--pivot">
            <p className="pk-chain__name">{t.chain.divide.name}</p>
            <p className="pk-chain__note">{t.chain.divide.note}</p>
            <div className="callout" data-state="assumed">
              <span className="callout__mark" aria-hidden="true">
                <Glyph name="assumed" />
              </span>
              <div className="callout__body">
                <strong>
                  {`${t.factorName} `}
                  <AssumedValue value={V.bayAreaFactorM2} unit="m²/bay" />{' '}
                  · <Engine>{V.bayAreaFactorClass}</Engine>
                </strong>
                <p className="pk-basis">
                  <Engine>{V.bayAreaFactorBasis}</Engine>
                </p>
              </div>
            </div>
          </li>

          <li className="pk-chain__item">
            <p className="pk-chain__name">{t.chain.ceiling.name}</p>
            <p className="pk-chain__note">{t.chain.ceiling.note}</p>
          </li>
          <li className="pk-chain__item pk-chain__item--result">
            <p className="pk-chain__name">{t.chain.band}</p>
            <p className="pk-chain__formula" {...engineLang}>
              {V.formulas.bandC}
            </p>
            <p className="pk-chain__fig">
              <span className="value">{group(V.bandCM2)}</span>
              <span className="value__unit">m²</span>
            </p>
          </li>
        </ol>

        <p className="pk-verdict">
          {t.chain.verdictBefore}
          <strong>
            <Engine>{band}</Engine>
          </strong>
          {t.chain.verdictMid}
          <span className="value">{group(V.governingGfaM2)}</span>
          <span className="value__unit">m²</span>
          {t.chain.verdictAfter}
        </p>
      </Section>

      {/* --- 3. Demand and supply are different numbers -------------------- */}
      {plan !== undefined ? (
        <Section
          index={idx('pk-demand')}
          id="pk-demand"
          title={t.demand.title}
          lede={<>{t.demand.lede}</>}
        >
          <div className="pk-figures">
            <Fig
              label={t.demand.probeLabel}
              value={group(V.totalBays)}
              unit={t.demand.bays}
              note={t.demand.probeNote}
            />
          </div>

          <div className="callout">
            <div className="callout__body">
              <strong>{t.demand.gapTitle}</strong>
              <p>{t.demand.gapBody}</p>
              <p>{t.demand.fourth}</p>
            </div>
          </div>

          {/* THE QUOTATION IS NOT TRANSLATED. It is the engine's own note, from the
              block in `pipeline.ts` that computes the demand of the emitted answer, and
              it is presented as that. An Arabic rendering would put words in the
              engine's mouth that its source does not contain; the attribution under it
              is the page's, and is. */}
          <blockquote className="pk-quote">
            <p>
              <Engine>
                “Comparing one scheme’s supply against the other’s demand reports a correct
                answer as a shortfall.”
              </Engine>
            </p>
            <footer>{t.demand.quoteSource}</footer>
          </blockquote>
        </Section>
      ) : null}

      {/* --- 4 to 8: the drawing, or the refusal that replaces it ---------- */}
      {plan !== undefined && refusal !== null ? (
        <Section
          index={idx('pk-refused')}
          id="pk-refused"
          title={t.refused.title}
          lede={<>{t.refused.lede}</>}
        >
          <div className="callout" data-state="blocked">
            <span className="callout__mark" aria-hidden="true">
              <Glyph name="variance" />
            </span>
            <div className="callout__body">
              <strong>{t.refused.callout}</strong>
              <p>
                <Engine>{refusal}</Engine>
              </p>
            </div>
          </div>
        </Section>
      ) : null}

      {drawable && plan !== undefined ? (
        <>
          {/* --- 4. The level, drawn -------------------------------------- */}
          <Section
            index={idx('pk-level')}
            id="pk-level"
            title={t.level.title}
            lede={<>{t.level.lede}</>}
          >
            <figure className="figure reveal">
              <div className="figure__plate">
                <LevelDrawing plan={plan} emphasis={emphasis} />
              </div>
              <figcaption className="figure__caption">
                <p className="figure__label">
                  <span className="figure__no">{IN.plot.plotNumber}</span>
                  <span>{t.level.figureLabel}</span>
                  {/* The community is named as the affection plan names it. */}
                  <span {...engineLang}>{IN.plot.community}</span>
                </p>

                {/* The legend, and the target-size control list. Below the fold it
                    becomes a single column of 44px rows; the drawing above it keeps
                    its aspect ratio and never scrolls. */}
                <ul className="pk-legend parking-legend" aria-label={t.level.legendLabel}>
                  {(['BAY', 'AISLE', 'RAMP'] as const).map((kind) => {
                    const count = plan.rects.filter((r) => r.kind === kind).length;
                    const rows = [
                      ...new Set(
                        plan.rects.filter((r) => r.kind === kind).map((r) => r.row),
                      ),
                    ];
                    return (
                      <li key={kind}>
                        <button
                          type="button"
                          className="pk-legend__row"
                          aria-pressed={emphasis === kind}
                          onClick={() => toggle(kind)}
                        >
                          <span
                            className={`pk-legend__swatch parking-legend__swatch ${KIND_SWATCH[kind] ?? ''}`}
                            aria-hidden="true"
                          />
                          <span className="pk-legend__text">
                            <span className="pk-legend__name">{t.kinds[kind] ?? kind}</span>
                            <span className="pk-legend__meta">
                              {kind === 'BAY'
                                ? t.level.bayMeta(
                                    plan.standard.bayWidthM,
                                    plan.standard.bayLengthM,
                                    String(count),
                                  )
                                : null}
                              {kind === 'AISLE'
                                ? `${plan.standard.drivewayWidthM} m · ${readable(t, plan.standard.driveway)}`
                                : null}
                              {kind === 'RAMP' ? t.level.rampMeta(rows) : null}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  <li>
                    <span className="pk-legend__row pk-legend__row--static">
                      <span
                        className="pk-legend__swatch parking-legend__swatch pk-legend__swatch--access"
                        aria-hidden="true"
                      />
                      <span className="pk-legend__text">
                        <span className="pk-legend__name">{t.level.accessName}</span>
                        <span className="pk-legend__meta">
                          {access.recommended.widthM}
                          {t.level.accessOn}{' '}
                          {access.recommended.edgeSeq + 1}
                          {t.level.accessRecommended}
                        </span>
                      </span>
                    </span>
                  </li>
                </ul>

                <p className="figure__source">{t.level.validity}</p>
              </figcaption>
            </figure>

            {/* The same level from the engine's building model, where the drawing
                above is from its level plan: two readings of one run, and the bays are
                the same node. The model puts this level at grade, with the ramp going
                down to the level below it. */}
            <figure className="figure reveal pk-model">
              <div className="figure__plate">
                <WorkedExampleModel
                  focusLevelId={MODEL_LEVEL}
                  label={t.level.modelLabel(plan.bayCount.value)}
                  fallback={<p className="massing-viewer__failed">{t.level.modelFallback}</p>}
                />
              </div>
              <figcaption className="figure__caption">
                <p className="figure__label">
                  <span className="figure__no">{IN.plot.plotNumber}</span>
                  <span>{t.level.modelFigureLabel}</span>
                </p>
                <p className="figure__source">
                  {plan.bayCount.value}
                  {t.level.modelSource}
                </p>
              </figcaption>
            </figure>
          </Section>

          {/* --- 5. What the drawing costs the assumption ----------------- */}
          <Section
            index={idx('pk-cost')}
            id="pk-cost"
            title={t.cost.title}
            tally={<Tally count={SUPPLY_ASSUMPTIONS.length} />}
            lede={<>{t.cost.lede}</>}
          >
            <div className="pk-gauge reveal">
              <div className="pk-gauge__row">
                <p className="pk-gauge__label">
                  {t.cost.spent}
                  <span className="pk-gauge__class" {...engineLang}>
                    {V.bayAreaFactorClass}
                  </span>
                </p>
                <p className="pk-gauge__value">
                  <AssumedValue value={V.bayAreaFactorM2} unit="m²/bay" />
                </p>
                <span
                  className="meter meter--lg"
                  data-state="assumed"
                  aria-hidden="true"
                  style={
                    {
                      '--meter-value': `${(
                        (Number(V.bayAreaFactorM2) /
                          Math.max(
                            Number(V.bayAreaFactorM2),
                            Number(plan.areaPerBayM2.value),
                          )) *
                        100
                      ).toFixed(2)}%`,
                    } as React.CSSProperties
                  }
                >
                  <span className="meter__fill" />
                </span>
              </div>

              <div className="pk-gauge__row">
                <p className="pk-gauge__label">
                  {t.cost.achieved}
                  <span className="pk-gauge__class" {...engineLang}>
                    {plan.areaPerBayM2.provenanceClass}
                  </span>
                </p>
                <p className="pk-gauge__value">
                  <span className="value">{plan.areaPerBayM2.value}</span>
                  <span className="value__unit" {...engineLang}>
                    {plan.areaPerBayM2.unit}
                  </span>
                </p>
                {/* The datum sits where the assumption predicted, so the bar answers
                    "how far past" and not only "how long". It is a tick in the gutter
                    above the track and never a stroke across the fill: a rule crossing
                    a variable-width fill is unmeasurable as a pair. */}
                <span
                  className="meter meter--lg"
                  aria-hidden="true"
                  style={
                    {
                      '--meter-value': '100%',
                      '--meter-datum': `${(
                        (Number(V.bayAreaFactorM2) / Number(plan.areaPerBayM2.value)) *
                        100
                      ).toFixed(2)}%`,
                    } as React.CSSProperties
                  }
                >
                  <span className="meter__fill" />
                  <span className="meter__datum" />
                </span>
              </div>
            </div>

            <p className="pk-verdict">
              {Number(plan.areaPerBayM2.value) > Number(V.bayAreaFactorM2) ? (
                <>
                  <strong>{t.cost.heavierTitle}</strong> {t.cost.heavierBody}
                </>
              ) : (
                <>
                  <strong>{t.cost.lighterTitle}</strong> {t.cost.lighterBody}
                </>
              )}
            </p>

            <div className="pk-figures">
              <Fig
                label={t.cost.placed}
                value={group(plan.bayCount.value)}
                unit={plan.bayCount.unit}
                unitIsEngine
                note={t.cost.placedNote}
              />
              <Fig
                label={t.cost.usable}
                value={group(plan.usableAreaM2.value)}
                unit={plan.usableAreaM2.unit}
                unitIsEngine
                note={t.cost.provenanceNote(plan.usableAreaM2.provenanceClass)}
              />
              <Fig
                label={t.cost.deductions}
                value={group(plan.deductionsM2.value)}
                unit={plan.deductionsM2.unit}
                unitIsEngine
                note={t.cost.provenanceNote(plan.deductionsM2.provenanceClass)}
              />
            </div>

            <div className="callout">
              <div className="callout__body">
                <strong>{t.cost.neitherTitle}</strong>
                <p>{t.cost.neitherBody}</p>
              </div>
            </div>
          </Section>

          {/* --- 6. Packed inside the podium ------------------------------ */}
          <Section
            index={idx('pk-pack')}
            id="pk-pack"
            title={t.pack.title}
            lede={<>{t.pack.lede}</>}
          >
            <div className="pk-figures">
              <Fig label={t.pack.width} value={trim(plan.packingRect.widthM)} unit="m" />
              <Fig label={t.pack.depth} value={trim(plan.packingRect.depthM)} unit="m" />
              <Fig
                label={t.pack.module}
                value={plan.moduleDepthM.value}
                unit={plan.moduleDepthM.unit}
                unitIsEngine
                note={t.pack.moduleNote}
              />
              <Fig label={t.pack.coverage} value={plan.packingRect.coveragePct} unit="%" />
            </div>

            {plan.packingRect.exact ? (
              <p className="pk-verdict">
                <strong>{t.pack.exactTitle}</strong>
                {t.pack.exactBody}
              </p>
            ) : (
              <p className="pk-verdict">
                <strong>{t.pack.inexactTitle}</strong>
                {t.pack.inexactBody}
              </p>
            )}
          </Section>

          {/* --- 7. The dimensions this run was cut to -------------------- */}
          <Section
            index={idx('pk-dims')}
            id="pk-dims"
            title={t.dims.title}
            lede={<>{t.dims.lede}</>}
          >
            <div className="schedule" role="region" aria-label={t.dims.regionLabel} tabIndex={0}>
              <table>
                <caption className="sr-only">{t.dims.caption}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t.dims.dimension}</th>
                    <th scope="col" className="schedule__num">
                      {t.dims.thisRun}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { k: t.dims.angle, v: readable(t, plan.standard.angle), u: '' },
                    { k: t.dims.driveway, v: readable(t, plan.standard.driveway), u: '' },
                    { k: t.dims.bayWidth, v: plan.standard.bayWidthM, u: 'm' },
                    { k: t.dims.bayLength, v: plan.standard.bayLengthM, u: 'm' },
                    { k: t.dims.drivewayWidth, v: plan.standard.drivewayWidthM, u: 'm' },
                  ].map((row) => (
                    <tr key={row.k}>
                      {/* `data-label` is re-emitted as the row header below the fold, so
                          it is rendered copy and takes the column's own key. */}
                      <th scope="row" data-label={t.dims.dimension}>
                        {row.k}
                      </th>
                      <td className="schedule__num" data-label={t.dims.thisRun}>
                        <span className="value">
                          {row.v}
                          {row.u ? <span className="value__unit">{row.u}</span> : null}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="callout">
              <div className="callout__body">
                <strong>{t.dims.heldTitle}</strong>
                <p>{t.dims.heldBody}</p>
              </div>
            </div>
          </Section>

          {/* --- 8. The ramp ---------------------------------------------- */}
          {ramp ? (
            <Section
              index={idx('pk-ramp')}
              id="pk-ramp"
              title={t.ramp.title}
              lede={<>{t.ramp.lede}</>}
            >
              <div className="pk-ramp-block reveal">
                <div className="pk-ramp-block__drawing">
                  <RampDrawing widthM={ramp.widthM} depthM={ramp.heightM} />
                </div>
                <div className="pk-ramp-block__body">
                  <div className="pk-figures">
                    <Fig label={t.ramp.width} value={trim(ramp.widthM)} unit="m" />
                    <Fig label={t.ramp.length} value={trim(ramp.heightM)} unit="m" />
                  </div>
                  {/* The chip carries the STATUS and the sentence carries the subject.
                      Putting the subject inside the chip makes it an inline-flex box
                      that shrink-wraps to max-content and cannot wrap, which is a
                      sideways scroll at 320px on a page whose drawing is the point. */}
                  <p className="pk-fig__note">
                    <NotAssessed>{t.notAssessed}</NotAssessed>
                    {t.ramp.notAssessedBody}
                  </p>
                </div>
              </div>
            </Section>
          ) : null}

          {/* --- 9. Where the cars get in --------------------------------- */}
          <Section
            index={idx('pk-access')}
            id="pk-access"
            title={t.access.title}
            lede={<>{t.access.lede}</>}
          >
            <div className="callout" data-state="derived">
              <span className="callout__mark" aria-hidden="true">
                <Glyph name="derived" />
              </span>
              <div className="callout__body">
                {/* Three values off the run, in the word order of the page's language:
                    Arabic puts «طريق» before the hierarchy and «بعرض» before the
                    width, which is why English has two empty slots here. */}
                <strong>
                  {t.access.frontage}
                  {access.recommended.edgeSeq + 1} ·{' '}
                  {t.access.roadBefore}
                  {readable(t, access.recommended.hierarchy)}
                  {t.access.roadAfter}{' '}
                  {t.access.widthBefore}
                  {access.recommended.widthM}
                  {t.access.widthAfter}
                </strong>
                <p>
                  <Engine>{access.recommended.rationale}</Engine>
                </p>
                <p>
                  {t.access.centredBefore}
                  {access.recommended.centreOffsetM}
                  {t.access.centredMid}{' '}
                  {access.recommended.usableWindowM}
                  {t.access.centredAfter}
                </p>
              </div>
            </div>

            <h3 className="pk-subhead">{t.access.rankedTitle}</h3>
            <div
              className="schedule"
              role="region"
              aria-label={t.access.rankedRegion}
              tabIndex={0}
            >
              <table>
                <caption className="sr-only">{t.access.rankedCaption}</caption>
                <thead>
                  <tr>
                    <th scope="col" className="schedule__rank">
                      {t.access.rank}
                    </th>
                    <th scope="col">{t.access.frontageColumn}</th>
                    <th scope="col" className="schedule__fill">
                      {t.access.why}
                    </th>
                    <th scope="col" className="schedule__num">
                      {t.access.clearWindow}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {access.candidates.map((c) => (
                    <tr key={c.edgeSeq}>
                      <td className="schedule__rank" data-label={t.access.rank}>
                        {c.rank}
                      </td>
                      <th scope="row" data-label={t.access.frontageColumn}>
                        {c.edgeSeq + 1} · {readable(t, c.hierarchy)}
                      </th>
                      <td className="schedule__fill" data-label={t.access.why}>
                        <p>
                          <Engine>{c.rationale}</Engine>
                        </p>
                      </td>
                      <td className="schedule__num" data-label={t.access.clearWindow}>
                        <span className="value">
                          {c.usableWindowM}
                          <span className="value__unit">m</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="pk-subhead">{t.access.refusedTitle}</h3>
            <div
              className="schedule"
              role="region"
              aria-label={t.access.refusedRegion}
              tabIndex={0}
            >
              <table>
                <caption className="sr-only">{t.access.refusedCaption}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t.access.frontageColumn}</th>
                    <th scope="col">{t.access.classification}</th>
                    <th scope="col" className="schedule__fill">
                      {t.access.reason}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {access.rejected.map((r) => (
                    <tr key={r.edgeSeq}>
                      <th scope="row" data-label={t.access.frontageColumn}>
                        {r.edgeSeq + 1}
                      </th>
                      <td data-label={t.access.classification}>
                        {readable(t, r.classification)}
                      </td>
                      <td className="schedule__fill" data-label={t.access.reason}>
                        <p>
                          <Engine>{r.reason}</Engine>
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="pk-subhead">{t.access.deferredTitle}</h3>
            <p className="pk-fig__note">{t.access.deferredNote}</p>
            <ul className="pk-deferred">
              {plan.notAssessed.map((n) => (
                <li key={n}>
                  <span className="pk-deferred__mark" aria-hidden="true">
                    <Glyph name="deferred" />
                  </span>
                  <span>
                    <Engine>{n}</Engine>
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        </>
      ) : null}

      {/* --- 10. The declaration with no default -------------------------- */}
      {FAR_SHOWN && parkingInFar !== undefined ? (
        <ParkingInFar
          data={parkingInFar}
          declared={IN.run.parkingInFar}
          index={idx('pk-far')}
        />
      ) : null}

      {/* --- 11. What it does not do here --------------------------------- */}
      <Section
        index={idx('pk-not')}
        id="pk-not"
        title={t.not.title}
        minor
        lede={<>{t.not.lede}</>}
      >
        <div className="pk-refusals">
          <div className="refusal reveal">
            <h3 className="refusal__title">{optimiser.heading}</h3>
            <p>{optimiser.body}</p>
          </div>
          {t.not.items.map((r) => (
            <div className="refusal reveal" key={r.h}>
              <h3 className="refusal__title">{r.h}</h3>
              <p>{r.p}</p>
            </div>
          ))}
        </div>

        <div className="cta">
          <Link to="/refusals" navigate={navigate} className="button">
            {t.not.cta}
          </Link>
        </div>
      </Section>

      {/* --- 12. What this page did not prove ----------------------------- */}
      <Section
        index={idx('pk-unproven')}
        id="pk-unproven"
        title={t.unproven.title}
        minor
        lede={<>{t.unproven.lede}</>}
      >
        <ol className="pk-limits">
          <li className="pk-limit">
            <strong>{t.unproven.buildable.title}</strong>
            <p>{t.unproven.buildable.body}</p>
          </li>
          <li className="pk-limit">
            <strong>{t.unproven.factor.title}</strong>
            <p>{t.unproven.factor.body}</p>
          </li>
          <li className="pk-limit">
            <strong>{t.unproven.clauses.title}</strong>
            {/* `[NOT SOURCED]` is what the record carries, in capitals, and it stays
                code in both languages: a reader checking a record looks for exactly
                that string. */}
            <p>
              {t.unproven.clauses.before}
              <code>[NOT SOURCED]</code>
              {t.unproven.clauses.mid}{' '}
              <Link to="/readiness" navigate={navigate}>
                {t.unproven.clauses.link}
              </Link>
              {t.unproven.clauses.after}
            </p>
          </li>
        </ol>
      </Section>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * §10 — the declaration with no default.
 *
 * A LEG CAN FAIL, AND THE FAILURE HAS A STATE. The handler returns `{ error }`
 * for a leg that threw and both spreads are nullable. If one leg answered, the
 * page renders that leg, the engine's own error string for the one that did not,
 * and NO SPREAD AT ALL — never a single column presented as a comparison, and
 * never a spread computed from one side. If both failed the section does not
 * render, and §2's amber factor carries the argument alone. It does NOT fall
 * back to the cited range that used to be quoted here; that figure is deleted
 * from this site, and this failure mode is the reason it was deleted.
 * ---------------------------------------------------------------------- */

function ParkingInFar({
  data,
  declared,
  index,
}: {
  readonly data: NonNullable<typeof parkingInFar>;
  readonly declared: string;
  readonly index: string;
}): JSX.Element | null {
  const t = useDict(EN, AR);
  /* The array is annotated rather than inferred, and that is not decoration. A
     `const` with a declared union type is narrowed by control flow to whatever was
     assigned to it, so inferring the element type here would give `side: FarLeg`,
     collapse the error branch to `never`, and delete the failure state this whole
     component exists to render — silently, with the code still on the page. */
  interface Column {
    readonly id: string;
    readonly label: string;
    readonly side: FarSide;
    readonly token: string;
  }
  const counts: FarSide = data.countsTowardFar;
  const excluded: FarSide = data.excludedFromFar;
  const sides: readonly Column[] = [
    { id: 'counts', label: t.far.counts, side: counts, token: 'COUNTS_TOWARD_FAR' },
    { id: 'excluded', label: t.far.excluded, side: excluded, token: 'EXCLUDED_FROM_FAR' },
  ];
  const bothAnswered = answered(counts) && answered(excluded);
  if (!answered(counts) && !answered(excluded)) return null;

  return (
    <Section index={index} id="pk-far" title={t.far.title} lede={<>{t.far.lede}</>}>
      <div className="pk-compare">
        {sides.map((s) => (
          <div
            className="pk-compare__side"
            key={s.id}
            data-state={declared === s.token ? 'binding' : undefined}
          >
            <p className="pk-compare__label">
              {s.label}
              {declared === s.token ? (
                <span className="pk-compare__tag">{t.far.declared}</span>
              ) : null}
            </p>
            {answered(s.side) ? (
              <dl className="pk-compare__rows">
                <div>
                  <dt>{t.far.regulatoryLimit}</dt>
                  <dd>
                    <span className="value">{group(s.side.regulatoryGfaM2)}</span>
                    <span className="value__unit">m²</span>
                  </dd>
                </div>
                <div>
                  <dt>{t.far.governingCapacity}</dt>
                  <dd>
                    <span className="value">{group(s.side.governingGfaM2)}</span>
                    <span className="value__unit">m²</span>
                  </dd>
                </div>
                <div>
                  <dt>{t.far.governingBand}</dt>
                  <dd>
                    <Engine>{s.side.governingBand}</Engine>
                  </dd>
                </div>
              </dl>
            ) : (
              <div className="callout" data-state="blocked">
                <span className="callout__mark" aria-hidden="true">
                  <Glyph name="variance" />
                </span>
                <div className="callout__body">
                  <strong>{t.far.legFailed}</strong>
                  <p>
                    <Engine>{s.side.error}</Engine>
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {bothAnswered ? (
        <>
          <div className="pk-figures">
            {data.regulatorySpreadM2 !== null ? (
              <Fig
                label={t.far.spreadRegulatory}
                value={group(data.regulatorySpreadM2)}
                unit="m²"
              />
            ) : null}
            {data.governingSpreadM2 !== null ? (
              <Fig
                label={t.far.spreadGoverning}
                value={group(data.governingSpreadM2)}
                unit="m²"
              />
            ) : null}
            {data.governingSpreadRelative !== null ? (
              <Fig
                label={t.far.spreadRelative}
                value={data.governingSpreadRelative}
                note={t.far.spreadRelativeNote}
              />
            ) : null}
          </div>
          <p className="pk-verdict">
            <Engine>{data.verdict}</Engine>
          </p>
        </>
      ) : (
        <div className="callout">
          <div className="callout__body">
            <strong>{t.far.oneLegTitle}</strong>
            <p>{t.far.oneLegBody}</p>
          </div>
        </div>
      )}
    </Section>
  );
}
