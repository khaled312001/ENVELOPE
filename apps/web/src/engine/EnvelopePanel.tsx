import type { RunView } from '../api/client.js';
import { TracedValue } from '../components/TracedValue.js';
import { AR } from '../i18n/app.ar.js';
import { EN } from '../i18n/app.en.js';
import { useDict } from '../i18n/locale.js';
import { useVerbatim } from './verbatim.js';

/** "within 1%" is the engine's `withinOnePercent` flag, labelled. No digit is copy. */
const WITHIN_THRESHOLD = '1%';

export function EnvelopePanel({
  run,
  onInspect,
}: {
  readonly run: RunView;
  readonly onInspect: (n: string) => void;
}): JSX.Element {
  const t = useDict(EN, AR).envelope;
  const ltr = useVerbatim();
  const e = run.envelope;
  return (
    <section className="panel" aria-labelledby="envelope-heading">
      <header className="panel__header">
        <div>
          <h2 id="envelope-heading" className="panel__title">
            {t.title}
          </h2>
          <p className="panel__subtitle">{t.subtitle}</p>
        </div>
      </header>

      <dl className="kv kv--grid">
        <div>
          <dt>{t.fields.setbackPermittedFootprint}</dt>
          <dd><TracedValue traced={e.setbackPermittedFootprint} onInspect={onInspect} /></dd>
        </div>
        <div>
          <dt>{t.fields.coverageCap}</dt>
          <dd><TracedValue traced={e.coverageCap} onInspect={onInspect} /></dd>
        </div>
        <div>
          <dt>{t.fields.podiumFootprint}</dt>
          <dd><TracedValue traced={e.podiumFootprint} onInspect={onInspect} /></dd>
        </div>
        <div>
          <dt>{t.fields.towerPlate}</dt>
          <dd><TracedValue traced={e.towerPlateCap} onInspect={onInspect} /></dd>
        </div>
        <div>
          <dt>{t.fields.heightCeiling}</dt>
          <dd><TracedValue traced={e.heightCeilingM} onInspect={onInspect} /></dd>
        </div>
        <div>
          <dt>{t.fields.levelsByHeight}</dt>
          <dd><TracedValue traced={e.maxLevelsByHeight} onInspect={onInspect} /></dd>
        </div>
      </dl>

      <h3 className="panel__section">{t.bindsTitle}</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">{t.columns.dimension}</th>
            <th scope="col">{t.columns.binding}</th>
            <th scope="col" className="data-table__num">{t.columns.value}</th>
            <th scope="col">{t.columns.nextClosest}</th>
          </tr>
        </thead>
        <tbody>
          {e.bindingConstraints.map((b) => (
            <tr key={b.dimension}>
              <th scope="row">
                {t.dimensions?.[b.dimension] ?? ltr(b.dimension.replace(/_/g, ' '))}
              </th>
              {/* The constraint's label, its rule and the runner-up's label are the
                  engine's, and are rendered as it wrote them. */}
              <td>
                {ltr(b.label)} <span className="muted">· {ltr(b.ruleId)}</span>
              </td>
              <td className="data-table__num value">{b.value}</td>
              <td>
                {b.runnerUp ? (
                  <>
                    {ltr(b.runnerUp.label)}
                    {t.runnerUpAt}
                    <span className="value">{b.runnerUp.value}</span>
                    {b.runnerUp.withinOnePercent ? (
                      <span className="chip chip--warn">{t.within(WITHIN_THRESHOLD)}</span>
                    ) : null}
                  </>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/*
        §11.7 step 6 requires the report to state how many iterations the
        applicability fixpoint took. On this product it is also the evidence that
        the setback circularity was solved rather than assumed away, so it is
        shown rather than logged.
      */}
      <details className="disclosure">
        <summary>{t.iterations(e.fixpoint.iterations, e.fixpoint.converged)}</summary>
        <p className="fine-print">{t.fixpointNote}</p>
        {/* Each note is the solver's own record of one pass. */}
        <ol className="iteration-log">
          {e.fixpoint.history.map((h) => (
            <li key={h.index}>{ltr(h.note)}</li>
          ))}
        </ol>
      </details>
    </section>
  );
}
