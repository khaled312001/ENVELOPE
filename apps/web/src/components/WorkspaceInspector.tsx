/**
 * THE INSPECTOR — the column beside the drawing (direction-2026-10.md §3).
 *
 * A drawing tool keeps the answer in view while the reader works on the drawing:
 * Forma's analysis panel, TestFit's yield column. Here that is three short
 * sections — the plot, the answer, the gates — on every step, so a reader on the
 * parking level still sees the governing figure the level is being laid out for.
 *
 * IT RESTATES AND NEVER COMPUTES. Every figure is a `TracedWire` the engine
 * returned, rendered through `TracedValue`, so a click opens the same derivation
 * the step screens open and an ASSUMED value carries the same word. A summary that
 * re-derived a number would be a second source for it, and the first time the two
 * disagreed the summary would be the one a reader believed.
 *
 * The derivation itself still opens BELOW this, in `ProvenanceTree`, when a value
 * is inspected — the column is where the tree has always appeared, now with the
 * answer above it instead of empty space.
 */

import type { ReactNode } from 'react';

import type { PlotView, RunView } from '../api/client.js';
import { AR as BANDS_AR } from '../i18n/bands.ar.js';
import { EN as BANDS_EN } from '../i18n/bands.en.js';
import { AR } from '../i18n/inspector.ar.js';
import { EN } from '../i18n/inspector.en.js';
import { useDict, Verbatim } from '../i18n/locale.js';
import { TracedValue } from './TracedValue.js';

/** The four gates in the order a run passes them. Ids are the server's. */
const GATES = [
  'G1_PLOT_CONFIRMED',
  'G2_RULES_ACKNOWLEDGED',
  'G3_ASSUMPTIONS_ACKNOWLEDGED',
  'G4_REVIEWER_NAMED',
] as const;

export function WorkspaceInspector({
  plot,
  run,
  gates,
  onInspect,
  onOpenAssumptions,
  children,
}: {
  readonly plot: PlotView | null;
  readonly run: RunView | null;
  readonly gates: Readonly<Record<string, boolean>>;
  readonly onInspect: (nodeId: string) => void;
  readonly onOpenAssumptions: () => void;
  /** The derivation, when a value is being inspected. */
  readonly children?: ReactNode;
}): JSX.Element {
  const t = useDict(EN, AR);
  const bands = useDict(BANDS_EN, BANDS_AR);

  return (
    <aside className="inspector" aria-label={t.label}>
      <section className="inspector__section" aria-labelledby="inspector-plot">
        <h2 className="inspector__heading" id="inspector-plot">
          {t.plot.heading}
        </h2>
        {plot ? (
          <dl className="inspector__facts">
            <div>
              <dt>{t.plot.number}</dt>
              <dd>
                <Verbatim>{plot.plotNumber}</Verbatim>
              </dd>
            </div>
            <div>
              <dt>{t.plot.area}</dt>
              <dd>
                <Verbatim>{`${plot.computedAreaM2} m²`}</Verbatim>
              </dd>
            </div>
            <div>
              <dt>{t.plot.edges}</dt>
              <dd>
                <Verbatim>{String(plot.edges.length)}</Verbatim>
              </dd>
            </div>
          </dl>
        ) : (
          <p className="inspector__empty">{t.plot.none}</p>
        )}
      </section>

      <section className="inspector__section" aria-labelledby="inspector-answer">
        <h2 className="inspector__heading" id="inspector-answer">
          {t.answer.heading}
        </h2>
        {run ? (
          <>
            <div className="inspector__figure">
              <span className="inspector__label">{t.answer.governing}</span>
              <TracedValue
                traced={run.capacity.governingGfa}
                onInspect={onInspect}
                size="display"
              />
              <span className="inspector__band">
                {bands.bands[run.capacity.governingBand].name}
              </span>
            </div>
            <dl className="inspector__facts">
              <div>
                <dt>{t.answer.levels}</dt>
                <dd>
                  <TracedValue traced={run.capacity.levels} onInspect={onInspect} />
                </dd>
              </div>
              <div>
                <dt>{t.answer.assumptions}</dt>
                <dd>
                  <button
                    type="button"
                    className="inspector__link"
                    onClick={onOpenAssumptions}
                  >
                    <Verbatim>{String(run.assumptions.length)}</Verbatim>
                    <span className="sr-only"> — {t.answer.assumptionsOpen}</span>
                  </button>
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="inspector__empty">{t.answer.none}</p>
        )}
      </section>

      <section className="inspector__section" aria-labelledby="inspector-gates">
        <h2 className="inspector__heading" id="inspector-gates">
          {t.gates.heading}
        </h2>
        <ol className="inspector__gates">
          {GATES.map((id) => {
            const done = gates[id] === true;
            return (
              <li key={id} className="inspector__gate" data-done={done}>
                <span className="inspector__gate-mark" aria-hidden="true" />
                <span className="inspector__gate-name">{t.gates[id]}</span>
                <span className="inspector__gate-state">
                  {done ? t.gates.done : t.gates.open}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {children}
    </aside>
  );
}
