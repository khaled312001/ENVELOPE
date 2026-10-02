/**
 * The GFA statement — allowed, proposed, and the floors that make it up.
 *
 * Laid out the way the client's own submission drawings lay it out: plot area,
 * gross floor area allowed, gross floor area proposed, then a numbered table of
 * floors with the area of one level, the count, and the total, in square metres
 * and square feet. A reviewer checks a scheme against that table first, and a
 * capacity figure they have to reassemble from bands and levels is one they will
 * reassemble differently.
 *
 * It renders; it does not compute. Every area is the engine's — the square
 * metres as traced values a reader can open, the square feet as the engine's
 * exact conversion beside them — and the row totals are the engine's products,
 * not this component's multiplication.
 */

import type { GfaStatementView } from '../api/client.js';
import { AR } from '../i18n/gfa.ar.js';
import { EN } from '../i18n/gfa.en.js';
import { useDict } from '../i18n/locale.js';
import { EngineText, formatTraced, TracedValue } from './TracedValue.js';

/*
  A FIGURE AND ITS UNIT, ISOLATED LEFT TO RIGHT. On the Arabic page a bare number
  beside a bare unit is reordered by the bidi algorithm — "3200.00 m²" came out as
  "m² … 3200.00" — so each pair is one LTR island, as a traced value's button is.
  Grouped and rounded by the same rule as every m² on the screen, so the two units
  on one row read at the same precision.
*/
function Area({ value, unit }: { readonly value: string; readonly unit: 'm²' | 'ft²' }): JSX.Element {
  return (
    <span className="value" dir="ltr" data-full={value}>
      {formatTraced(value, 'm²')}
      <span className="value__unit">{unit}</span>
    </span>
  );
}

function Feet({ ft2 }: { readonly ft2: string }): JSX.Element {
  return <Area value={ft2} unit="ft²" />;
}

export function GfaStatement({
  statement,
  onInspect,
}: {
  readonly statement: GfaStatementView;
  readonly onInspect: (nodeId: string) => void;
}): JSX.Element {
  const t = useDict(EN, AR);
  const partFloor = Number(statement.partFloorNotPlaced.m2) > 0;

  return (
    <section className="panel" aria-labelledby="gfa-heading">
      <header className="panel__header">
        <div>
          <h2 id="gfa-heading" className="panel__title">
            {t.title}
          </h2>
          <p className="panel__subtitle">{t.subtitle}</p>
        </div>
      </header>

      <dl className="kv">
        <div>
          <dt>{t.plotArea}</dt>
          <dd>
            <Area value={statement.plotArea.m2} unit="m²" />
            <span className="muted">
              {' · '}
              <Feet ft2={statement.plotArea.ft2} />
            </span>
          </dd>
        </div>
        <div>
          <dt>{t.allowed}</dt>
          <dd>
            <TracedValue traced={statement.allowed.traced} onInspect={onInspect} />
            <span className="muted">
              {' · '}
              <Feet ft2={statement.allowed.ft2} />
            </span>
            <p className="field__help">{t.allowedNote}</p>
          </dd>
        </div>
        <div>
          <dt>{t.proposed}</dt>
          <dd>
            <TracedValue traced={statement.proposed.traced} onInspect={onInspect} />
            <span className="muted">
              {' · '}
              <Feet ft2={statement.proposed.ft2} />
            </span>
          </dd>
        </div>
      </dl>

      {/* A direct child of the panel, so below 48rem it scrolls inside itself. */}
      <table className="data-table">
        <caption className="sr-only">{t.caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="data-table__rank">
              {t.column.number}
            </th>
            <th scope="col">{t.column.description}</th>
            <th scope="col" className="data-table__num">
              {t.column.perLevel}
            </th>
            <th scope="col" className="data-table__num">
              {t.column.area}
            </th>
            <th scope="col" className="data-table__num">
              ft²
            </th>
          </tr>
        </thead>
        <tbody>
          {statement.rows.map((row, i) => {
            const first = row.levelIds[0];
            const last = row.levelIds[row.levelIds.length - 1];
            return (
              <tr key={row.kind}>
                <td className="data-table__rank">{i + 1}</td>
                <th scope="row" className="data-table__label">
                  {t.rows[row.kind]}
                  {first !== undefined && last !== undefined ? (
                    <span className="data-table__param muted">
                      <EngineText>
                        {first === last ? first : t.levelRange(first, last)}
                      </EngineText>
                    </span>
                  ) : null}
                </th>
                <td className="data-table__num">
                  {row.perLevel ? (
                    <>
                      <TracedValue traced={row.perLevel.traced} onInspect={onInspect} />{' '}
                      <span className="value" dir="ltr">
                        {t.times(String(row.count))}
                      </span>
                    </>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td className="data-table__num">
                  <TracedValue traced={row.area.traced} onInspect={onInspect} />
                </td>
                <td className="data-table__num">
                  <Feet ft2={row.area.ft2} />
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={3}>
              {t.total}
            </th>
            <td className="data-table__num">
              <TracedValue traced={statement.proposed.traced} onInspect={onInspect} />
            </td>
            <td className="data-table__num">
              <Feet ft2={statement.proposed.ft2} />
            </td>
          </tr>
        </tfoot>
      </table>

      <dl className="kv">
        <div>
          <dt>{t.remaining}</dt>
          <dd>
            <TracedValue traced={statement.remaining.traced} onInspect={onInspect} />
            <span className="muted">
              {' · '}
              <Feet ft2={statement.remaining.ft2} />
            </span>
          </dd>
        </div>
      </dl>

      {partFloor ? (
        <p className="fine-print">
          {t.partFloor.before}
          <Area value={statement.partFloorNotPlaced.m2} unit="m²" />
          {t.partFloor.after}
        </p>
      ) : null}
      <p className="fine-print">{t.noCommercial}</p>
    </section>
  );
}
