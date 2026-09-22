/**
 * The parking level, drawn.
 *
 * This is the screen the 30 Aug 2026 meeting was about. The client reads an
 * envelope off an affection plan in four minutes; what costs him three to four
 * months is laying out the parking, and he said so three separate times:
 *
 *   "لو عارف يفهم إزاي يحط الباركينج صح، وتوزيعته صح، والرامب بتاعي ماشي صح —
 *    أنا كده حلّصت 3-4 شهور."                                          — 09:13
 *
 * So every rectangle here is one the engine placed, in plot coordinates, and
 * this file adds a colour and a label and nothing else. If the drawing and the
 * bay count ever disagree, the drawing is wrong and it must be obvious.
 *
 * **The ramp is NOT ASSESSED, and is drawn in the deferred ink.** Only its plan
 * area is reserved; gradient, transitions and headroom under B.7.2.2 are never
 * reached. Drawing it in the same ink as a cited setback would claim they were.
 *
 * It used to be amber, and the argument for that was wrong in a way worth
 * recording: amber is not "be careful here", it is ASSUMED — a number the engine
 * chose and can defend with a written basis. A quantity nobody computed is the
 * deferred state and has its own treatment. §13.1 calls the assumed treatment
 * "the most important UI decision in the product", and the way that decision
 * actually dies is not by being softened; it is by being spent on things that
 * are not assumptions until it stops meaning anything in particular.
 *
 * Accessibility: colour never carries a meaning on its own. The ramp is hatched
 * *and* captioned "plan area only", the recommended driveway is heavy *and*
 * labelled, and every fact in the drawing also appears in the tables beneath it.
 */

import type { LevelPlanView, WirePoint } from '../api/client.js';
import { useDict } from '../i18n/locale.js';
import { AR } from '../i18n/parkingPlan.ar.js';
import { EN } from '../i18n/parkingPlan.en.js';
import { EngineText, TracedValue } from './TracedValue.js';

/*
  THE WORDS ROUND THE DRAWING LIVE IN `i18n/parkingPlan.*.ts`; the drawing itself
  is not copy and does not change with the language. The clauses below are cited,
  not worded, so they stay here and render verbatim in both languages — as do the
  junction clearance, which is a figure, and every rationale, refusal and
  not-assessed line the engine wrote.
*/
const BAY_TABLE = 'B.11';
const RAMP_CLAUSE = 'B.7.2.2';
const ACCESS_CLAUSE = 'B.7.2.1';
const JUNCTION_CLEARANCE = '15 m';

interface Pt {
  readonly x: number;
  readonly y: number;
}

/*
  The ramp is NOT ASSESSED, not ASSUMED, and the two have different colours.

  Both of these were amber. The docblock above states the reason the ramp is
  drawn at all — only its plan area is reserved; gradient, transitions and
  headroom under B.7.2.2 are not assessed — which is the definition of the
  deferred state, not of an assumption. An assumption is a number the engine
  chose and can defend with a basis; a not-assessed quantity is one it never
  reached. Painting the second in the first's colour spends the amber budget on
  a rectangle that is not an assumption, and teaches a reader that amber means
  "be careful here" rather than "this figure was assumed" — which is the drift
  §13.1 exists to prevent. Amber is reserved exclusively for uncertainty of the
  ASSUMED kind, and nothing else in the system is permitted to use it.
*/
const FILL: Record<LevelPlanView['rects'][number]['kind'], string> = {
  BAY: 'var(--accent-subtle)',
  ACCESSIBLE_BAY: 'var(--derived-surface)',
  AISLE: 'var(--surface-sunken)',
  RAMP: 'var(--deferred-surface)',
  OBSTRUCTION: 'var(--deferred-surface)',
};

const STROKE: Record<LevelPlanView['rects'][number]['kind'], string> = {
  BAY: 'var(--accent)',
  ACCESSIBLE_BAY: 'var(--derived)',
  AISLE: 'var(--border-default)',
  RAMP: 'var(--deferred-hatch)',
  OBSTRUCTION: 'var(--deferred-hatch)',
};

/** Bays first, so the aisle outlines do not sit on top of them. */
const ORDER: Record<LevelPlanView['rects'][number]['kind'], number> = {
  AISLE: 0,
  RAMP: 1,
  OBSTRUCTION: 2,
  BAY: 3,
  ACCESSIBLE_BAY: 4,
};

export function ParkingPlan({
  levelPlan,
  plotVertices,
  onInspect,
  figure = true,
}: {
  readonly levelPlan: LevelPlanView;
  /** The plot boundary, drawn behind the podium so the setback is visible. */
  readonly plotVertices?: readonly WirePoint[] | undefined;
  readonly onInspect: (nodeId: string) => void;
  /**
   * Draw the level. Off where a drawing set already draws it — the run screen,
   * whose sheets are composed from the building model — so one level is not
   * drawn twice by two renderers that could disagree. What is left is the
   * packing statement and the level's figures, which the sheet does not carry.
   */
  readonly figure?: boolean;
}): JSX.Element {
  const t = useDict(EN, AR);
  const num = (p: WirePoint): Pt => ({ x: Number(p.x), y: Number(p.y) });
  const podium = levelPlan.podiumRing.map(num);
  const plot = (plotVertices ?? []).map(num);
  const all = [...podium, ...plot, ...levelPlan.rects.flatMap((r) => r.outline.map(num))];

  if (all.length < 3) return <p className="muted">{t.none}</p>;

  const packing = levelPlan.packingRect.exact ? (
    <>{t.packing.exact}</>
  ) : (
    <>
      <strong>{t.packing.notRectangle}</strong>
      {t.packing.before}
      {levelPlan.packingRect.coveragePct}
      {t.packing.percentOf}
      {figure ? t.packing.shownDashed : ''}
      {t.packing.after}
    </>
  );

  const figures = (
    <dl className="kv kv--grid">
      <div>
        <dt>{t.figures.bays}</dt>
        <dd>
          <TracedValue traced={levelPlan.bayCount} onInspect={onInspect} />
        </dd>
      </div>
      <div>
        <dt>{t.figures.areaPerBay}</dt>
        <dd>
          <TracedValue traced={levelPlan.areaPerBayM2} onInspect={onInspect} />
        </dd>
      </div>
      <div>
        <dt>{t.figures.moduleDepth}</dt>
        <dd>
          <TracedValue traced={levelPlan.moduleDepthM} onInspect={onInspect} />
        </dd>
      </div>
      <div>
        <dt>{t.figures.deductions}</dt>
        <dd>
          <TracedValue traced={levelPlan.deductionsM2} onInspect={onInspect} />
        </dd>
      </div>
    </dl>
  );

  if (!figure) {
    return (
      <div className="parking-plan">
        <p className="fine-print">{packing}</p>
        {figures}
      </div>
    );
  }

  const minX = Math.min(...all.map((p) => p.x));
  const maxX = Math.max(...all.map((p) => p.x));
  const minY = Math.min(...all.map((p) => p.y));
  const maxY = Math.max(...all.map((p) => p.y));
  const w = Math.max(maxX - minX, 1);
  const h = Math.max(maxY - minY, 1);
  const pad = Math.max(w, h) * 0.06;

  // SVG y grows downward; survey y grows north. Flip, so the drawing matches
  // the way an architect holds the affection plan.
  const toSvg = (p: Pt): Pt => ({ x: p.x - minX, y: maxY - p.y });
  const poly = (ring: readonly WirePoint[]): string =>
    ring
      .map(num)
      .map(toSvg)
      .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(' ');

  const sorted = [...levelPlan.rects].sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);
  const access = levelPlan.access.recommended;
  const stroke = Math.max(w, h) / 400;

  const summary =
    t.summary(
      levelPlan.bayCount.value,
      levelPlan.packingRect.widthM,
      levelPlan.packingRect.depthM,
      levelPlan.areaPerBayM2.value,
    ) + (access ? t.summaryAccess(access.widthM, String(access.edgeSeq)) : t.summaryNoAccess);

  return (
    <div className="parking-plan">
      <figure className="parking-plan__figure">
        <svg
          viewBox={`${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}`}
          role="img"
          aria-label={summary}
          className="parking-plan__svg"
        >
          <defs>
            {/*
              The ramp hatch. Its own pattern rather than a fill opacity,
              because opacity is a colour difference and this has to survive a
              greyscale print and a colour-blind reader.
            */}
            <pattern
              id="ramp-hatch"
              width="1.6"
              height="1.6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="1.6" height="1.6" fill="var(--deferred-surface)" />
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="1.6"
                stroke="var(--deferred-hatch)"
                strokeWidth={stroke * 1.4}
              />
            </pattern>
          </defs>

          {plot.length >= 3 ? (
            <polygon
              points={poly(plotVertices ?? [])}
              fill="none"
              stroke="var(--text-tertiary)"
              strokeWidth={stroke}
              strokeDasharray={`${stroke * 5} ${stroke * 4}`}
            />
          ) : null}

          <polygon
            points={poly(levelPlan.podiumRing)}
            fill="var(--surface-raised)"
            stroke="var(--text-primary)"
            strokeWidth={stroke * 1.6}
          />

          {/*
            The packing rectangle, drawn only when it is *not* the podium. On a
            rectangular plot it would be a duplicate outline; on anything else it
            is the honest picture of what was given up, and the caption says how
            much.
          */}
          {!levelPlan.packingRect.exact ? (
            <polygon
              points={poly(levelPlan.packingRect.outline)}
              fill="none"
              stroke="var(--uncertain)"
              strokeWidth={stroke * 1.2}
              strokeDasharray={`${stroke * 3} ${stroke * 3}`}
            />
          ) : null}

          {sorted.map((r, i) => (
            <polygon
              key={`${r.kind}-${r.row}-${i}`}
              points={poly(r.outline)}
              fill={r.kind === 'RAMP' ? 'url(#ramp-hatch)' : FILL[r.kind]}
              stroke={STROKE[r.kind]}
              strokeWidth={stroke * (r.kind === 'AISLE' ? 0.7 : 1)}
            />
          ))}

          {access ? (
            <g>
              <line
                x1={toSvg(num(access.opening.start)).x}
                y1={toSvg(num(access.opening.start)).y}
                x2={toSvg(num(access.opening.end)).x}
                y2={toSvg(num(access.opening.end)).y}
                stroke="var(--derived)"
                strokeWidth={stroke * 5}
                strokeLinecap="butt"
              />
            </g>
          ) : null}
        </svg>

        <figcaption className="fine-print">{packing}</figcaption>
      </figure>

      {/*
        Every entry is swatch + one text block. The text used to sit as bare
        children of the flex row, which made each <strong> and <em> its own flex
        item — the ramp's caption broke into four stacked columns and read as
        nonsense in exactly the place a reader most needs a sentence.
      */}
      <ul className="parking-legend" aria-label={t.legend.label}>
        <li>
          <span className="parking-legend__swatch parking-legend__swatch--bay" aria-hidden="true" />
          <span>
            {t.legend.bay}
            {levelPlan.standard.bayWidthM}
            {t.legend.times}
            {levelPlan.standard.bayLengthM}
            {t.legend.bayUnit}
            <EngineText>{BAY_TABLE}</EngineText>
          </span>
        </li>
        <li>
          <span className="parking-legend__swatch parking-legend__swatch--aisle" aria-hidden="true" />
          <span>
            {t.legend.aisle}
            {levelPlan.standard.drivewayWidthM}
            {t.legend.aisleUnit}
            {levelPlan.standard.driveway === 'TWO_WAY' ? t.legend.twoWay : t.legend.oneWay}
          </span>
        </li>
        <li>
          <span className="parking-legend__swatch parking-legend__swatch--ramp" aria-hidden="true" />
          <span>
            {t.legend.ramp}
            <strong>{t.legend.rampOnly}</strong>
            {t.legend.rampBefore}
            <EngineText>{RAMP_CLAUSE}</EngineText>
            {t.legend.rampMid}
            <em>{t.legend.rampNot}</em>
            {t.legend.rampAfter}
          </span>
        </li>
        <li>
          <span className="parking-legend__swatch parking-legend__swatch--access" aria-hidden="true" />
          <span>{t.legend.access}</span>
        </li>
      </ul>

      {figures}
    </div>
  );
}

/**
 * Where the cars get in — the other half of the client's sentence.
 *
 * Shows the recommendation, the alternatives it beat, and every frontage that
 * was refused with the reason. He asked to be told the entrance is better from
 * one side, which is advice, not an instruction; a panel that showed only the
 * winner would turn it into one.
 */
export function VehicleAccessPanel({
  levelPlan,
  onInspect,
}: {
  readonly levelPlan: LevelPlanView;
  readonly onInspect: (nodeId: string) => void;
}): JSX.Element {
  const t = useDict(EN, AR).access;
  const { recommended, candidates, rejected } = levelPlan.access;

  return (
    <section className="panel" aria-labelledby="access-heading">
      <header className="panel__header">
        <div>
          <h2 id="access-heading" className="panel__title">
            {t.title}
          </h2>
          <p className="panel__subtitle">
            {t.subtitleBefore}
            <EngineText>{ACCESS_CLAUSE}</EngineText>
            {t.subtitleMid}
            {JUNCTION_CLEARANCE}
            {t.subtitleAfter}
          </p>
        </div>
      </header>

      {recommended ? (
        <div className="callout callout--ok">
          <p>
            <strong>
              {t.frontage}
              {recommended.edgeSeq}
              {recommended.hierarchy ? t.road(recommended.hierarchy) : ''}
            </strong>
            {t.recommended(recommended.widthM, recommended.centreOffsetM)}
          </p>
          <p className="fine-print">
            <EngineText>{recommended.rationale}</EngineText>
          </p>
          <p className="fine-print">{t.usable(recommended.usableWindowM)}</p>
        </div>
      ) : (
        <div className="callout callout--warn">
          <p>
            <strong>{t.noneTitle}</strong>
            {t.noneBody}
          </p>
        </div>
      )}

      {candidates.length > 1 ? (
        <>
          <h3 className="panel__subheading">{t.alternatives}</h3>
          <ul className="reason-list">
            {candidates.slice(1).map((c) => (
              <li key={c.edgeSeq}>
                <strong>
                  {t.frontage}
                  {c.edgeSeq}
                </strong>
                {' — '}
                <EngineText>{c.rationale}</EngineText>
                {t.alternativeWindow(c.usableWindowM)}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {rejected.length > 0 ? (
        <>
          <h3 className="panel__subheading">{t.refused}</h3>
          <ul className="reason-list">
            {rejected.map((r) => (
              <li key={r.edgeSeq}>
                <strong>
                  {t.frontage}
                  {r.edgeSeq}
                </strong>
                {' — '}
                <EngineText>{r.reason}</EngineText>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {/*
        Never folded away. What the placement does not establish is the part a
        reader will otherwise assume was checked — and "opposite a T junction"
        genuinely cannot be checked without a road network this engine has not
        been given.
      */}
      {levelPlan.notAssessed.length > 0 ? (
        <>
          <h3 className="panel__subheading">{t.notAssessed}</h3>
          <ul className="reason-list reason-list--uncertain">
            {levelPlan.notAssessed.map((n) => (
              <li key={n}>
                <EngineText>{n}</EngineText>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {recommended ? (
        <button
          type="button"
          className="link-button"
          onClick={() => onInspect(recommended.node)}
        >
          {t.showDerivation}
        </button>
      ) : null}
    </section>
  );
}
