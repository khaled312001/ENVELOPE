/**
 * Step 2 — confirm the plot, then `G1`.
 *
 * §20.1 makes this a gate: nothing resolves against rules until the user has
 * confirmed the geometry and the classifications the rules will key on. The
 * value of the gate is not the click — it is that the user sees the computed
 * area next to the stated one, and the classification of every edge, at a moment
 * when changing them is free.
 *
 * The copy is in `i18n/parameters.en.ts` and `parameters.ar.ts`. What stays here is
 * what the plot supplies — its number, community, area and frontage count — and
 * the two figures inside sentences, named once below.
 */

import { useState, type ReactNode } from 'react';

import type { PlotView } from '../api/client.js';
import { PlotCanvas } from '../components/PlotCanvas.js';
import { AR } from '../i18n/parameters.ar.js';
import { EN } from '../i18n/parameters.en.js';
import { useDict, useLocale, Verbatim } from '../i18n/locale.js';

/** `FR-PLT-001 AC2`'s tolerance, and the phase whose scope the shape note states. */
const AREA_TOLERANCE = '2%';
const PHASE = '0';

export function ParametersStep({
  plot,
  confirmed,
  onConfirm,
}: {
  readonly plot: PlotView;
  readonly confirmed: boolean;
  readonly onConfirm: () => void;
}): JSX.Element {
  const t = useDict(EN, AR);
  const { locale } = useLocale();
  const [selected, setSelected] = useState<number | null>(null);

  /* The plot's own names, isolated on the Arabic page and untouched on the English. */
  const ltr = (value: ReactNode): ReactNode =>
    locale === 'ar' ? <Verbatim>{value}</Verbatim> : value;

  return (
    <section className="panel" aria-labelledby="params-heading">
      <header className="panel__header">
        <div>
          <h2 id="params-heading" className="panel__title">
            {t.title}
          </h2>
          <p className="panel__subtitle">{t.subtitle}</p>
        </div>
      </header>

      {plot.areaMismatch ? (
        <div className="banner banner--blocked" role="alert">
          <div>
            <strong>{t.mismatch.title(AREA_TOLERANCE)}</strong>
            <p>{t.mismatch.body}</p>
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
            <dt>{t.fields.plot}</dt>
            <dd>
              {ltr(plot.plotNumber)} · {ltr(plot.community)}
            </dd>
          </div>
          <div>
            <dt>{t.fields.landUse}</dt>
            <dd>{t.fields.landUseValue}</dd>
          </div>
          <div>
            <dt>{t.fields.computedArea}</dt>
            <dd>
              <span className="value">{plot.computedAreaM2}</span>
              <span className="value__unit">m²</span>
            </dd>
          </div>
          <div>
            <dt>{t.fields.shape}</dt>
            <dd>
              {t.shapes?.[plot.shapeClass] ??
                ltr(plot.shapeClass.toLowerCase().replace('_', ' '))}
              <span className="muted">{t.fields.shapeScope(PHASE)}</span>
            </dd>
          </div>
          <div>
            <dt>{t.fields.roadFrontages}</dt>
            <dd>{plot.edges.filter((e) => e.classification === 'ROAD').length}</dd>
          </div>
        </dl>
      </div>

      <footer className="panel__footer panel__footer--gate">
        {confirmed ? (
          <p className="gate-status gate-status--done">
            <span aria-hidden="true">✓</span> {t.gate.confirmed}
          </p>
        ) : (
          <>
            <p className="gate-status gate-status--pending">
              <span aria-hidden="true">!</span> {t.gate.pending}
            </p>
            <button type="button" className="button button--primary" onClick={onConfirm}>
              {t.gate.confirm}
            </button>
          </>
        )}
      </footer>
    </section>
  );
}
