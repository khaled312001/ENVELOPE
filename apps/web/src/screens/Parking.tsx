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
 */

import { useCallback, useState } from 'react';

import { Glyph } from '../components/SiteChrome.js';
import { OPTIMISER_REFUSAL } from '../content/shared.js';
import type { PageProps } from '../Root.js';
import { Link } from '../router.js';
import example from './worked-example.json' with { type: 'json' };

const IN = example.input;
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

/** `DEG_90` → `90°`, `TWO_WAY` → `two way`. The wire enum, made readable. */
const readable = (token: string): string =>
  token.startsWith('DEG_')
    ? `${token.slice(4)}°`
    : token.toLowerCase().replace(/_/g, ' ');

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
/** The legend's rows, in the order the drawing paints them. */
const KIND_LABEL: Readonly<Record<string, string>> = {
  BAY: 'Bay',
  AISLE: 'Drive aisle',
  RAMP: 'Ramp',
};
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
  note,
}: {
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
  readonly note?: string;
}): JSX.Element {
  return (
    <div className="pk-fig">
      <p className="pk-fig__label">{label}</p>
      <p className="pk-fig__value">
        <span className="value">{value}</span>
        {unit ? <span className="value__unit">{unit}</span> : null}
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
  return (
    <span className="traced--assumed">
      <span className="value">{value}</span>
      {unit ? <span className="value__unit">{unit}</span> : null}
      <span className="traced__marker" aria-hidden="true" />
      <span className="sr-only"> — assumed</span>
    </span>
  );
}

/** The rail-gutter tally: channel 5 of the ASSUMED treatment. */
function Tally({ count }: { readonly count: number }): JSX.Element {
  return count > 0 ? (
    <p className="margin-tally">
      <Glyph name="assumed" />
      {count}
      <span className="margin-tally__label">assumed here</span>
    </p>
  ) : (
    <p className="margin-tally margin-tally--none">
      <span className="margin-tally__label">nothing assumed here</span>
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

  const summary =
    `Parking level as placed. ${plan.bayCount.value} bays at ` +
    `${plan.standard.bayWidthM} by ${plan.standard.bayLengthM} metres, a ` +
    `${plan.standard.drivewayWidthM} metre aisle, and a ramp strip down one edge, ` +
    `packed into a ${plan.packingRect.widthM} by ${plan.packingRect.depthM} metre ` +
    `rectangle inside the podium. Vehicle access ${access.widthM} metres wide on ` +
    `frontage ${access.edgeSeq}.`;

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
      aria-label={`Ramp footprint, ${trim(widthM)} by ${trim(depthM)} metres in plan.`}
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
          <div className="railed__body">
            <p className="eyebrow">Phase 0 · the parking band</p>
            <h1 id="pk-h1" className="pk-claim">
              The number that governs this plot rests on an assumption.
            </h1>
            <p className="pk__lede pk-claim__lede">
              Here is the assumption, with the basis it was recorded against. Then the
              level is drawn — bay by bay, aisle and ramp, inside the podium the setbacks
              left — and this page reports what the drawing costs against what the
              assumption predicted. The gap is the argument, not the embarrassment.
            </p>
          </div>
        </div>
      </section>

      {/* --- 2. Where the governing number comes from ---------------------- */}
      <Section
        index="02"
        id="pk-chain"
        title="Where the governing number comes from"
        tally={<Tally count={SUPPLY_ASSUMPTIONS.length} />}
        lede={
          <>
            Six links, in the order the engine computes them. The fourth is a division,
            and its divisor is an assumption with a written basis and a measured
            sensitivity rather than a constant. Everything below this section is
            downstream of it.
          </>
        }
      >
        <ol className="pk-chain">
          <li className="pk-chain__item">
            <p className="pk-chain__name">Bays per unit, from the mix</p>
            <p className="pk-chain__note">
              The declared unit mix sets how many bays each unit owes. It is the demand
              side of the model and it is fixed before any area is divided.
            </p>
          </li>
          <li className="pk-chain__item">
            <p className="pk-chain__name">Demand at the probe scheme</p>
            <p className="pk-chain__note">
              The engine takes the unit count that floor area and geometry would allow and
              asks what that scheme would need. This is a probe used to find the ceiling,
              and it is not the demand of the answer. The next section is about nothing
              else.
            </p>
          </li>
          <li className="pk-chain__item">
            <p className="pk-chain__name">Available area across the declared levels</p>
            <p className="pk-chain__note">
              The podium footprint, taken across the levels the run declared, reduced by
              the fraction of a level that cores, ramps and plant consume.
            </p>
            <p className="pk-chain__fig">
              <span className="pk-chain__op" aria-hidden="true">
                ×
              </span>
              <span>
                <span className="value">{IN.run.parkingLevelsAvailable}</span>
                <span className="value__unit">levels declared</span>
              </span>
              <span className="pk-chain__op" aria-hidden="true">
                ×
              </span>
              <AssumedValue value={IN.run.parkingUsableFraction.value} unit="usable" />
            </p>
            <p className="pk-chain__basis">
              Basis, in full: {IN.run.parkingUsableFraction.basis}.
            </p>
          </li>

          <li className="pk-chain__item pk-chain__item--pivot">
            <p className="pk-chain__name">
              Supply is that area divided by an area factor
            </p>
            <p className="pk-chain__note">
              This is the division the whole page is about. No cited rule fixes the gross
              area a bay consumes once its share of aisle, column and circulation is
              charged to it, so the engine records an assumption, demands a basis for it,
              and ranks it in the register by how far the answer moves when it is
              perturbed.
            </p>
            <div className="callout" data-state="assumed">
              <span className="callout__mark" aria-hidden="true">
                <Glyph name="assumed" />
              </span>
              <div className="callout__body">
                <strong>
                  Gross area per bay — <AssumedValue value={V.bayAreaFactorM2} unit="m²/bay" />{' '}
                  · {V.bayAreaFactorClass}
                </strong>
                <p className="pk-basis">{V.bayAreaFactorBasis}</p>
              </div>
            </div>
          </li>

          <li className="pk-chain__item">
            <p className="pk-chain__name">The supportable unit ceiling</p>
            <p className="pk-chain__note">
              Supply, converted back into units at the same bays-per-unit rate. It is a
              floor division, so the ceiling it produces is never rounded up into units
              the parking cannot serve.
            </p>
          </li>
          <li className="pk-chain__item pk-chain__item--result">
            <p className="pk-chain__name">The parking band</p>
            <p className="pk-chain__formula">{V.formulas.bandC}</p>
            <p className="pk-chain__fig">
              <span className="value">{group(V.bandCM2)}</span>
              <span className="value__unit">m²</span>
            </p>
          </li>
        </ol>

        <p className="pk-verdict">
          On this run the <strong>{band}</strong> band is the smallest of the three, so
          the governing capacity is <span className="value">{group(V.governingGfaM2)}</span>
          <span className="value__unit">m²</span>. Trace that figure back through the six
          links above and the fourth one is an assumption. That is the honest shape of the
          headline number on this site, and it is stated here rather than found later.
        </p>
      </Section>

      {/* --- 3. Demand and supply are different numbers -------------------- */}
      {plan !== undefined ? (
        <Section
          index="03"
          id="pk-demand"
          title="Demand and supply are different numbers"
          lede={
            <>
              This section exists because the site would otherwise print one of them as
              the other. Three quantities carry the word “bays” and no two of them are the
              same number.
            </>
          }
        >
          <div className="pk-figures">
            <Fig
              label="Demand, probe scheme"
              value={group(V.totalBays)}
              unit="bays"
              note="What the larger scheme used to probe for the parking ceiling would need."
            />
          </div>

          <div className="callout">
            <div className="callout__body">
              <strong>Two of the three are not on the wire, and neither is printed.</strong>
              <p>
                What the declared levels hold, and what the reported answer actually needs,
                are both computed by the engine and carry their own derivations. Neither is
                serialised by the presenter in the API today, so neither appears here as a
                figure. The gap belongs to that presenter, and closing it is an API change
                rather than a page change.
              </p>
              <p>
                The bay count on the drawing below is a fourth quantity again — bays the
                layout placed — and it is used in the sections about the drawing and
                nowhere else.
              </p>
            </div>
          </div>

          <blockquote className="pk-quote">
            <p>
              “Comparing one scheme’s supply against the other’s demand reports a correct
              answer as a shortfall.”
            </p>
            <footer>The engine’s own note, where the demand of the emitted answer is computed</footer>
          </blockquote>
        </Section>
      ) : null}

      {/* --- 4 to 8: the drawing, or the refusal that replaces it ---------- */}
      {plan !== undefined && refusal !== null ? (
        <Section
          index="04"
          id="pk-refused"
          title="No level was laid out for this run"
          lede={
            <>
              The engine returns a reason rather than an empty object, because an empty
              plan reads as “no bays” and that is a different statement.
            </>
          }
        >
          <div className="callout" data-state="blocked">
            <span className="callout__mark" aria-hidden="true">
              <Glyph name="variance" />
            </span>
            <div className="callout__body">
              <strong>The layout was refused.</strong>
              <p>{refusal}</p>
            </div>
          </div>
        </Section>
      ) : null}

      {drawable && plan !== undefined ? (
        <>
          {/* --- 4. The level, drawn -------------------------------------- */}
          <Section
            index="04"
            id="pk-level"
            title="The level, drawn"
            lede={
              <>
                Every rectangle here is one the engine placed, in the coordinates the
                geometry kernel used. The drawing runs after the band above, on a supply
                figure that was already settled, and nothing in it reaches back into that
                figure.
              </>
            }
          >
            <figure className="figure reveal">
              <div className="figure__plate">
                <LevelDrawing plan={plan} emphasis={emphasis} />
              </div>
              <figcaption className="figure__caption">
                <p className="figure__label">
                  <span className="figure__no">{IN.plot.plotNumber}</span>
                  <span>Parking level · as placed</span>
                  <span>{IN.plot.community}</span>
                </p>

                {/* The legend, and the target-size control list. Below the fold it
                    becomes a single column of 44px rows; the drawing above it keeps
                    its aspect ratio and never scrolls. */}
                <ul className="pk-legend parking-legend" aria-label="What the drawing shows">
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
                            <span className="pk-legend__name">{KIND_LABEL[kind] ?? kind}</span>
                            <span className="pk-legend__meta">
                              {kind === 'BAY'
                                ? `${plan.standard.bayWidthM} × ${plan.standard.bayLengthM} m · ${count} placed`
                                : null}
                              {kind === 'AISLE'
                                ? `${plan.standard.drivewayWidthM} m · ${readable(plan.standard.driveway)}`
                                : null}
                              {kind === 'RAMP'
                                ? `plan area reserved · module row ${rows.join(', ')}`
                                : null}
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
                        <span className="pk-legend__name">Vehicle access</span>
                        <span className="pk-legend__meta">
                          {access.recommended.widthM} m on frontage{' '}
                          {access.recommended.edgeSeq} · recommended, not decided for you
                        </span>
                      </span>
                    </span>
                  </li>
                </ul>

                <p className="figure__source">Regulatory validity — not assessed</p>
              </figcaption>
            </figure>
          </Section>

          {/* --- 5. What the drawing costs the assumption ----------------- */}
          <Section
            index="05"
            id="pk-cost"
            title="What the drawing costs the assumption"
            tally={<Tally count={SUPPLY_ASSUMPTIONS.length} />}
            lede={
              <>
                The section this product is for. The supply model spent a fixed area on
                every bay; the layout then had to find room for aisles, a ramp strip and
                the depth a module actually needs. Set the two against each other and the
                assumption is either vindicated or it is not.
              </>
            }
          >
            <div className="pk-gauge reveal">
              <div className="pk-gauge__row">
                <p className="pk-gauge__label">
                  What the supply model spent, per bay
                  <span className="pk-gauge__class">{V.bayAreaFactorClass}</span>
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
                  What the drawing achieved, per bay
                  <span className="pk-gauge__class">{plan.areaPerBayM2.provenanceClass}</span>
                </p>
                <p className="pk-gauge__value">
                  <span className="value">{plan.areaPerBayM2.value}</span>
                  <span className="value__unit">{plan.areaPerBayM2.unit}</span>
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
                  <strong>
                    The drawing came out heavier than the factor predicted on this plot.
                  </strong>{' '}
                  A bay on the drawn level carries more gross area than the supply model
                  charged it, which makes the supply figure the band above rests on the
                  optimistic one. That is a finding about this plot, and it is printed as
                  one.
                </>
              ) : (
                <>
                  <strong>
                    The drawing came out at or under what the factor predicted on this
                    plot.
                  </strong>{' '}
                  A bay on the placed level carries no more gross area than the supply
                  model charged it. That is a finding about this plot, and it holds for
                  this plot only.
                </>
              )}
            </p>

            <div className="pk-figures">
              <Fig
                label="Bays the layout placed"
                value={group(plan.bayCount.value)}
                unit={plan.bayCount.unit}
                note="Not the supply figure, and not the demand. Bays that were drawn."
              />
              <Fig
                label="Usable area on the level"
                value={group(plan.usableAreaM2.value)}
                unit={plan.usableAreaM2.unit}
                note={`Provenance class ${plan.usableAreaM2.provenanceClass}.`}
              />
              <Fig
                label="Cores, plant and ramp landing"
                value={group(plan.deductionsM2.value)}
                unit={plan.deductionsM2.unit}
                note={`Provenance class ${plan.deductionsM2.provenanceClass}.`}
              />
            </div>

            <div className="callout">
              <div className="callout__body">
                <strong>
                  Both figures are printed and neither is subtracted from the other.
                </strong>
                <p>
                  The engine emits the factor and the achieved area with a derivation
                  each, and emits no traced difference between them. A subtraction
                  performed in this page would be the one number here that could not
                  answer where it came from, which is the defect the whole product exists
                  to prevent. The difference belongs in the engine’s parking layout
                  module, emitted with its own derivation, and that is where it is owed.
                </p>
              </div>
            </div>
          </Section>

          {/* --- 6. Packed inside the podium ------------------------------ */}
          <Section
            index="06"
            id="pk-pack"
            title="Packed inside the podium, never its bounding box"
            lede={
              <>
                A bounding box is easy to pack and it is not the site. The layout targets
                the largest rectangle that fits inside the podium outline, so the error
                runs by containment and the bay count is a floor rather than a hope.
              </>
            }
          >
            <div className="pk-figures">
              <Fig label="Pack rectangle, width" value={trim(plan.packingRect.widthM)} unit="m" />
              <Fig label="Pack rectangle, depth" value={trim(plan.packingRect.depthM)} unit="m" />
              <Fig
                label="Module depth"
                value={plan.moduleDepthM.value}
                unit={plan.moduleDepthM.unit}
                note="Bay, aisle and bay, taken together."
              />
              <Fig
                label="Podium covered by the pack"
                value={plan.packingRect.coveragePct}
                unit="%"
              />
            </div>

            {plan.packingRect.exact ? (
              <p className="pk-verdict">
                <strong>The inscribed rectangle is exact on this run.</strong> The podium
                is itself a rectangle, so nothing was given up to draw the level and the
                pack target and the podium outline coincide. On a podium that is not a
                rectangle they do not, the drawing shows both, and the unusable remainder
                is reported in square metres rather than absorbed into a ratio.
              </p>
            ) : (
              <p className="pk-verdict">
                <strong>The inscribed rectangle is not exact on this run.</strong> The
                podium is not a rectangle, so the pack target is smaller than the
                footprint and the drawing shows both outlines. The remainder is reported
                in square metres rather than absorbed into a ratio, and the bay count that
                follows from it is a floor.
              </p>
            )}
          </Section>

          {/* --- 7. The dimensions this run was cut to -------------------- */}
          <Section
            index="07"
            id="pk-dims"
            title="The dimensions this run was cut to"
            lede={
              <>
                Only the row the run actually used. The full minimum-dimensions table is
                not republished here: the engine holds six rows, not the ten a
                five-angles-by-two-driveways grid implies, so a page promising the grid
                would be describing a table that does not exist — and republishing a code
                table wholesale is an exposure that citing a clause is not.
              </>
            }
          >
            <div className="schedule" role="region" aria-label="Bay dimensions used by this run" tabIndex={0}>
              <table>
                <caption className="sr-only">
                  The bay and driveway dimensions this run was cut to.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Dimension</th>
                    <th scope="col" className="schedule__num">
                      This run
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { k: 'Parking angle', v: readable(plan.standard.angle), u: '' },
                    { k: 'Driveway', v: readable(plan.standard.driveway), u: '' },
                    { k: 'Bay width', v: plan.standard.bayWidthM, u: 'm' },
                    { k: 'Bay length', v: plan.standard.bayLengthM, u: 'm' },
                    { k: 'Driveway width', v: plan.standard.drivewayWidthM, u: 'm' },
                  ].map((row) => (
                    <tr key={row.k}>
                      <th scope="row" data-label="Dimension">
                        {row.k}
                      </th>
                      <td className="schedule__num" data-label="This run">
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
                <strong>Two things this section holds and does not print.</strong>
                <p>
                  The structural clearance charged per obstructed side is a module
                  constant inside the layout engine rather than a field on the dimension
                  record, so it does not travel on the wire. The clause reference the
                  dimensions were taken from is a citation the engine uses internally as a
                  provenance rule, and the presenter serialises it for nothing. Both need
                  a serialiser change in the API, and both are named here rather than
                  filled in: a clause number typed by hand, on the page that argues against
                  typed figures, is the wrong way to close a gap.
                </p>
              </div>
            </div>
          </Section>

          {/* --- 8. The ramp ---------------------------------------------- */}
          {ramp ? (
            <Section
              index="08"
              id="pk-ramp"
              title="The ramp is placed; its gradient is not assessed"
              lede={
                <>
                  The strip below is reserved in plan and nothing more. Drawing a ramp
                  that reads as checked when only its footprint was considered would be
                  worse than drawing none, so it keeps the deferred treatment — the hatch,
                  the dashed edge and the italic — everywhere it appears on this page.
                </>
              }
            >
              <div className="pk-ramp-block reveal">
                <div className="pk-ramp-block__drawing">
                  <RampDrawing widthM={ramp.widthM} depthM={ramp.heightM} />
                </div>
                <div className="pk-ramp-block__body">
                  <div className="pk-figures">
                    <Fig label="Ramp strip, width" value={trim(ramp.widthM)} unit="m" />
                    <Fig label="Ramp strip, length" value={trim(ramp.heightM)} unit="m" />
                  </div>
                  {/* The chip carries the STATUS and the sentence carries the subject.
                      Putting the subject inside the chip makes it an inline-flex box
                      that shrink-wraps to max-content and cannot wrap, which is a
                      sideways scroll at 320px on a page whose drawing is the point. */}
                  <p className="pk-fig__note">
                    <NotAssessed>Not assessed</NotAssessed> — gradient, transitions and
                    headroom. Those are a separate clause family, they need a section
                    rather than a plan, and this run did not read them. The strip is the
                    area the layout took out of the level before it packed anything else,
                    which is why it is visible in the bay count and invisible in the code
                    check.
                  </p>
                </div>
              </div>
            </Section>
          ) : null}

          {/* --- 9. Where the cars get in --------------------------------- */}
          <Section
            index="09"
            id="pk-access"
            title="Where the cars get in"
            lede={
              <>
                The recommendation, the frontages it beat, and every frontage that was
                refused with the reason it was refused. The refusals are the half a
                spreadsheet never gives you, and they are the reason a reviewer can argue
                with the placement instead of taking it.
              </>
            }
          >
            <div className="callout" data-state="derived">
              <span className="callout__mark" aria-hidden="true">
                <Glyph name="derived" />
              </span>
              <div className="callout__body">
                <strong>
                  Frontage {access.recommended.edgeSeq} ·{' '}
                  {readable(access.recommended.hierarchy)} road ·{' '}
                  {access.recommended.widthM} m wide
                </strong>
                <p>{access.recommended.rationale}</p>
                <p>
                  Centred {access.recommended.centreOffsetM} m along it, inside{' '}
                  {access.recommended.usableWindowM} m of frontage that is clear of both
                  corners once the junction clearance is taken off each end.
                </p>
              </div>
            </div>

            <h3 className="pk-subhead">Ranked, in the engine’s own words</h3>
            <div
              className="schedule"
              role="region"
              aria-label="Viable frontages, ranked"
              tabIndex={0}
            >
              <table>
                <caption className="sr-only">
                  Every frontage that can take a vehicle access, ranked, with the reason.
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="schedule__rank">
                      Rank
                    </th>
                    <th scope="col">Frontage</th>
                    <th scope="col" className="schedule__fill">
                      Why
                    </th>
                    <th scope="col" className="schedule__num">
                      Clear window
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {access.candidates.map((c) => (
                    <tr key={c.edgeSeq}>
                      <td className="schedule__rank" data-label="Rank">
                        {c.rank}
                      </td>
                      <th scope="row" data-label="Frontage">
                        {c.edgeSeq} · {readable(c.hierarchy)}
                      </th>
                      <td className="schedule__fill" data-label="Why">
                        <p>{c.rationale}</p>
                      </td>
                      <td className="schedule__num" data-label="Clear window">
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

            <h3 className="pk-subhead">Refused, and why</h3>
            <div
              className="schedule"
              role="region"
              aria-label="Frontages that cannot take a vehicle access"
              tabIndex={0}
            >
              <table>
                <caption className="sr-only">
                  Every frontage that was refused, with the reason it was refused.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Frontage</th>
                    <th scope="col">Classification</th>
                    <th scope="col" className="schedule__fill">
                      Reason
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {access.rejected.map((r) => (
                    <tr key={r.edgeSeq}>
                      <th scope="row" data-label="Frontage">
                        {r.edgeSeq}
                      </th>
                      <td data-label="Classification">{readable(r.classification)}</td>
                      <td className="schedule__fill" data-label="Reason">
                        <p>{r.reason}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="pk-subhead">Reported not assessed</h3>
            <p className="pk-fig__note">
              These come off the run as the engine wrote them. Whether the opening sits
              opposite a junction needs the surrounding road network, which no affection
              plan carries, so it is reported rather than allowed to block the rest — and
              the clause references inside these sentences are the engine’s own strings,
              quoted rather than re-typed. No rule record in this deployment is approved
              against a sourced instrument.
            </p>
            <ul className="pk-deferred">
              {plan.notAssessed.map((n) => (
                <li key={n}>
                  <span className="pk-deferred__mark" aria-hidden="true">
                    <Glyph name="deferred" />
                  </span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </Section>
        </>
      ) : null}

      {/* --- 10. The declaration with no default -------------------------- */}
      {parkingInFar !== undefined ? (
        <ParkingInFar data={parkingInFar} declared={IN.run.parkingInFar} />
      ) : null}

      {/* --- 11. What it does not do here --------------------------------- */}
      <Section
        index="11"
        id="pk-not"
        title="What it does not do here"
        minor
        lede={
          <>
            Each of these is refused rather than unbuilt, and the first is refused by the
            type system rather than by a decision anyone could reverse in a sprint.
          </>
        }
      >
        <div className="pk-refusals">
          <div className="refusal reveal">
            <h3 className="refusal__title">{OPTIMISER_REFUSAL.heading}</h3>
            <p>{OPTIMISER_REFUSAL.body}</p>
          </div>
          {[
            {
              h: 'It does not design a structural grid.',
              p: 'Column positions, transfer structure and the spans a podium needs are absent. The layout charges a clearance where a bay is obstructed and stops there; where the columns actually fall is an engineering decision this phase does not make.',
            },
            {
              h: 'It does not check fire tender access, turning circles or egress.',
              p: 'The access placement reads frontage hierarchy and junction clearance. Whether an appliance can reach the building, turn, and stand is a different clause family and it is not read at all. A missing check reads as a check that passed, so it is named in every output rather than omitted.',
            },
            {
              h: 'It does not lay out mechanical or stacked parking.',
              p: 'Every bay drawn here is a bay a car drives into and out of under its own power. A stacker changes the area per bay, the aisle it needs and the count the level holds, and none of that is modelled.',
            },
            {
              h: 'It does not judge whether the level can be a basement.',
              p: 'Water table, excavation, shoring and the cost of going down are outside this phase. The run declares how many levels are available and the engine takes that declaration at face value, attributed to whoever made it.',
            },
          ].map((r) => (
            <div className="refusal reveal" key={r.h}>
              <h3 className="refusal__title">{r.h}</h3>
              <p>{r.p}</p>
            </div>
          ))}
        </div>

        <div className="cta">
          <Link to="/refusals" navigate={navigate} className="button">
            Everything else it refuses
          </Link>
        </div>
      </Section>

      {/* --- 12. What this page did not prove ----------------------------- */}
      <Section
        index="12"
        id="pk-unproven"
        title="What this page did not prove"
        minor
        lede={<>Every page here ends on a limit. This is the one that matters most.</>}
      >
        <ol className="pk-limits">
          <li className="pk-limit">
            <strong>That the level as drawn is buildable.</strong>
            <p>
              Rectangles that do not overlap and clear their dimensions are a packing
              result, not a design. Nothing here has been checked for structure, drainage,
              ventilation, fire or the hundred things a set of drawings resolves.
            </p>
          </li>
          <li className="pk-limit">
            <strong>That the assumed factor is right for this plot.</strong>
            <p>
              It is the mid-point of a range, recorded with a basis and ranked by
              sensitivity, and it moves the governing capacity in rough proportion to
              itself. The section above measures what the drawing did against it; it does
              not establish that the assumption was correct.
            </p>
          </li>
          <li className="pk-limit">
            <strong>That the clauses encoded here are the clauses that apply.</strong>
            <p>
              Every seed rule in this deployment carries a placeholder instrument, a source
              page of zero and clause text marked <code>[NOT SOURCED]</code>. A licensed
              Dubai architect has to author and approve each record against the actual
              instrument before any of it is a citation. There is no rule library route in
              this build to send you to, so the state is stated here instead of linked, and
              the readiness figures are on the{' '}
              <Link to="/dashboard" navigate={navigate}>
                deployment readiness page
              </Link>
              .
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
}: {
  readonly data: NonNullable<typeof parkingInFar>;
  readonly declared: string;
}): JSX.Element | null {
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
    { id: 'counts', label: 'Parking counted toward floor area', side: counts, token: 'COUNTS_TOWARD_FAR' },
    { id: 'excluded', label: 'Parking excluded from floor area', side: excluded, token: 'EXCLUDED_FROM_FAR' },
  ];
  const bothAnswered = answered(counts) && answered(excluded);
  if (!answered(counts) && !answered(excluded)) return null;

  return (
    <Section
      index="10"
      id="pk-far"
      title="The declaration with no default"
      lede={
        <>
          Whether parking counts toward floor area is not something this engine decides.
          It is derived from a citation, or set by a named person, or the run is refused —
          and rather than quote a range from a specification, this is the same plot run
          both ways.
        </>
      }
    >
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
                <span className="pk-compare__tag">declared on this run</span>
              ) : null}
            </p>
            {answered(s.side) ? (
              <dl className="pk-compare__rows">
                <div>
                  <dt>Regulatory limit</dt>
                  <dd>
                    <span className="value">{group(s.side.regulatoryGfaM2)}</span>
                    <span className="value__unit">m²</span>
                  </dd>
                </div>
                <div>
                  <dt>Governing capacity</dt>
                  <dd>
                    <span className="value">{group(s.side.governingGfaM2)}</span>
                    <span className="value__unit">m²</span>
                  </dd>
                </div>
                <div>
                  <dt>Governing band</dt>
                  <dd>{s.side.governingBand}</dd>
                </div>
              </dl>
            ) : (
              <div className="callout" data-state="blocked">
                <span className="callout__mark" aria-hidden="true">
                  <Glyph name="variance" />
                </span>
                <div className="callout__body">
                  <strong>This leg did not answer.</strong>
                  <p>{s.side.error}</p>
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
                label="Spread, regulatory limit"
                value={group(data.regulatorySpreadM2)}
                unit="m²"
              />
            ) : null}
            {data.governingSpreadM2 !== null ? (
              <Fig
                label="Spread, governing capacity"
                value={group(data.governingSpreadM2)}
                unit="m²"
              />
            ) : null}
            {data.governingSpreadRelative !== null ? (
              <Fig
                label="Governing spread, relative"
                value={data.governingSpreadRelative}
                note="Of the larger of the two governing capacities."
              />
            ) : null}
          </div>
          <p className="pk-verdict">{data.verdict}</p>
        </>
      ) : (
        <div className="callout">
          <div className="callout__body">
            <strong>No spread is reported, because only one leg answered.</strong>
            <p>
              A spread computed from one side is not a spread, and a single column
              presented as a comparison is worse than no comparison. The leg that answered
              is above, in full, with the engine’s own message for the leg that did not.
            </p>
          </div>
        </div>
      )}
    </Section>
  );
}
