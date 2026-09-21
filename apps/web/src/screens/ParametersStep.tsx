/**
 * Step 2 — confirm the plot, then `G1`.
 *
 * §20.1 makes this a gate: nothing resolves against rules until the user has
 * confirmed the geometry and the classifications the rules will key on. The
 * value of the gate is not the click — it is that the user sees the computed
 * area next to the stated one, and the classification of every edge, at a moment
 * when changing them is free.
 */

import { useState } from 'react';

import type { PlotView } from '../api/client.js';
import { PlotCanvas } from '../components/PlotCanvas.js';

export function ParametersStep({
  plot,
  confirmed,
  onConfirm,
}: {
  readonly plot: PlotView;
  readonly confirmed: boolean;
  readonly onConfirm: () => void;
}): JSX.Element {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <section className="panel" aria-labelledby="params-heading">
      <header className="panel__header">
        <div>
          <h2 id="params-heading" className="panel__title">
            Confirm the plot
          </h2>
          <p className="panel__subtitle">
            Everything after this is computed from what is on this screen. Check it while
            changing it is still free.
          </p>
        </div>
      </header>

      {plot.areaMismatch ? (
        <div className="banner banner--blocked" role="alert">
          <div>
            <strong>The two areas disagree by more than 2%.</strong>
            <p>
              The area computed from your dimensions and the area printed on the affection
              plan differ. One of them is wrong, and we do not assume it is yours — check
              which before continuing.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid grid--2">
        <PlotCanvas
          vertices={plot.vertices}
          edges={plot.edges}
          areaM2={plot.computedAreaM2}
          onSelectEdge={setSelected}
          selectedEdge={selected}
        />

        <dl className="kv">
          <div>
            <dt>Plot</dt>
            <dd>
              {plot.plotNumber} · {plot.community}
            </dd>
          </div>
          <div>
            <dt>Land use</dt>
            <dd>Residential tower</dd>
          </div>
          <div>
            <dt>Computed area</dt>
            <dd>
              <span className="value">{plot.computedAreaM2}</span>
              <span className="value__unit">m²</span>
            </dd>
          </div>
          <div>
            <dt>Shape</dt>
            <dd>
              {plot.shapeClass.toLowerCase().replace('_', ' ')}
              <span className="muted">
                {' '}
                — Phase 0 handles rectilinear and simple convex plots only
              </span>
            </dd>
          </div>
          <div>
            <dt>Road frontages</dt>
            <dd>{plot.edges.filter((e) => e.classification === 'ROAD').length}</dd>
          </div>
        </dl>
      </div>

      <footer className="panel__footer panel__footer--gate">
        {confirmed ? (
          <p className="gate-status gate-status--done">
            <span aria-hidden="true">✓</span> Plot confirmed.
          </p>
        ) : (
          <>
            <p className="gate-status gate-status--pending">
              <span aria-hidden="true">!</span> Rules cannot resolve until this is
              confirmed — they key on the edge classifications above.
            </p>
            <button type="button" className="button button--primary" onClick={onConfirm}>
              This is the plot
            </button>
          </>
        )}
      </footer>
    </section>
  );
}
