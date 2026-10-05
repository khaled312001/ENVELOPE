/**
 * The GFA statement — allowed, proposed, and the floors that make it up.
 *
 * Laid out the way the client's own submission drawings lay it out, because on
 * 5 Oct 2026 he sent them and named this table by name — *«podium —
 * Calculations»*. His is three stacked tables: a commercial allowance, a
 * residential allowance with a numbered schedule of floors under it, and the sum
 * of the two. Each floor row carries the area of ONE level and a count —
 * "TYPICAL FLOOR AREA 625.55 Sq.m × 3" — because the reader multiplies the two
 * and checks the third figure, and a pre-multiplied total cannot be checked.
 *
 * It renders; it does not compute. Every area is the engine's — the square
 * metres as traced values a reader can open, the square feet as the engine's
 * exact conversion beside them — and every row total is the engine's own
 * product, reachable in the provenance graph from the per-level area and the
 * level count, not this component's multiplication.
 *
 * ---------------------------------------------------------------------------
 * A TABLE, AND ALMOST NO WORDS.
 *
 * *«وكذلك فى النتائج تكون سهله واحترافيه مش معقده ومش عاوز شرح وكلام كتير»* —
 * results easy and professional, not complex, no explanation, not many words. So
 * the first read is figures, units, a total and an allowance, with the
 * provenance affordance this product already has on every number. There is no
 * explanatory paragraph.
 *
 * The engine's own sentences are not deleted for it. They sit in one disclosure
 * under the table: the reconciliation — what the uniform-plate model does not
 * model, which is the ground floor he counts at 118.00 m² and this engine counts
 * at a plate — the NOT ASSESSED reasons, and the note about the second
 * allowance. "Not many words" is a request about the first read; a table that
 * dropped those sentences would be easy to read and wrong to act on, which is
 * the one failure this product cannot have.
 *
 * ---------------------------------------------------------------------------
 * THE THREE STATES OF AN AREA, AND THE INK EACH ONE GETS.
 *
 *   - A FIGURE goes through `TracedValue`, which takes its treatment from the
 *     engine's `renderHint`. An assumed plate makes an assumed row and the row
 *     is amber, because the engine said so and this component does not decide.
 *   - A FLOOR THE ENGINE DOES NOT MODEL — the roof — is a row in the table body
 *     with the deferred-check treatment: hatched leading edge, dimmed ground,
 *     the word NOT ASSESSED. **Never amber.** §13.1 reserves amber exclusively
 *     for uncertainty the engine declared, and a level it never modelled is not
 *     an assumption, it is an absence.
 *   - A CELL THAT DOES NOT APPLY is an em dash. The parking row has no per-level
 *     area because it is not one area repeated.
 */

import type { GfaStatementView } from '../api/client.js';
import { AR } from '../i18n/gfa.ar.js';
import { EN } from '../i18n/gfa.en.js';
import { useDict } from '../i18n/locale.js';
import { EngineText, formatTraced, NotAssessed, TracedValue } from './TracedValue.js';

type GfaDict = typeof EN;
type CapView = GfaStatementView['caps'][number];
type RowView = GfaStatementView['rows'][number];
type OmissionView = GfaStatementView['omissions'][number];
type Inspect = (nodeId: string) => void;

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

/** A cell with nothing in it, said rather than left blank. */
function NotApplicable(): JSX.Element {
  return <span className="muted">—</span>;
}

/**
 * One allowance: its three figures, then the floors that draw on it.
 *
 * A component rather than an inline block, and it returns a FRAGMENT rather than
 * a wrapper: a fragment creates no element, so the table stays a direct child of
 * the panel — which is what `.panel > .data-table` needs in order to scroll
 * inside itself below 48rem rather than taking the page sideways.
 */
function Cap({
  t,
  cap,
  rows,
  omissions,
  onInspect,
}: {
  readonly t: GfaDict;
  readonly cap: CapView;
  readonly rows: readonly RowView[];
  readonly omissions: readonly OmissionView[];
  readonly onInspect: Inspect;
}): JSX.Element {
  const label = t.caps[cap.kind];
  // The reason a figure is absent, for the hatched marker that stands in for it.
  const why = cap.notes.join(' ');

  return (
    <>
      <h3 className="panel__subheading">{label}</h3>

      <dl className="kv kv--grid">
        <div>
          <dt>{t.capAllowed}</dt>
          <dd>
            {cap.allowed ? (
              <>
                <TracedValue traced={cap.allowed.traced} onInspect={onInspect} />
                <span className="muted">
                  {' · '}
                  <Feet ft2={cap.allowed.ft2} />
                </span>
              </>
            ) : (
              <NotAssessed reason={why} />
            )}
          </dd>
        </div>
        <div>
          <dt>{t.capProposed}</dt>
          <dd>
            {cap.proposed ? (
              <TracedValue traced={cap.proposed.traced} onInspect={onInspect} />
            ) : (
              <NotAssessed reason={why} />
            )}
          </dd>
        </div>
        <div>
          <dt>{t.capRemaining}</dt>
          <dd>
            {cap.remaining ? (
              <TracedValue traced={cap.remaining.traced} onInspect={onInspect} />
            ) : (
              <NotAssessed reason={why} />
            )}
          </dd>
        </div>
      </dl>

      <table className="data-table">
        <caption className="sr-only">{t.caption(label)}</caption>
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
          {rows.map((row, i) => {
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
                {/* THE PRODUCT, PRINTED AS A PRODUCT. 625.55 × 3, never 1,876.66
                    on its own: the reader multiplies these two and checks the
                    next column, and both figures are the engine's. */}
                <td className="data-table__num">
                  {row.perLevel ? (
                    <>
                      <TracedValue traced={row.perLevel.traced} onInspect={onInspect} />{' '}
                      <span className="value" dir="ltr">
                        {t.times(String(row.count))}
                      </span>
                    </>
                  ) : (
                    <NotApplicable />
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
          {/*
            A FLOOR THE ENGINE DOES NOT MODEL IS A ROW, NOT A FOOTNOTE. §20.3's
            "an invariant silently absent from the table reads as an invariant
            that passed" is just as true of a floor: the roof carries area on a
            real scheme, so leaving it out of the schedule would read as a scheme
            with no roof level. Hatched and dimmed by `is-not-assessed`, which is
            the deferred treatment and is deliberately not amber.
          */}
          {omissions.map((omission, i) => (
            <tr key={omission.kind} className="is-not-assessed">
              <td className="data-table__rank">{rows.length + i + 1}</td>
              <th scope="row" className="data-table__label">
                {t.rows[omission.kind]}
              </th>
              <td className="data-table__num">
                <NotApplicable />
              </td>
              <td className="data-table__num">
                <NotAssessed reason={omission.reason} />
              </td>
              <td className="data-table__num">
                <NotApplicable />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={3}>
              {t.total}
            </th>
            <td className="data-table__num">
              {cap.proposed ? (
                <TracedValue traced={cap.proposed.traced} onInspect={onInspect} />
              ) : (
                <NotAssessed reason={why} />
              )}
            </td>
            <td className="data-table__num">
              {cap.proposed ? <Feet ft2={cap.proposed.ft2} /> : <NotApplicable />}
            </td>
          </tr>
        </tfoot>
      </table>
    </>
  );
}

export function GfaStatement({
  statement,
  onInspect,
}: {
  readonly statement: GfaStatementView;
  readonly onInspect: Inspect;
}): JSX.Element {
  const t = useDict(EN, AR);
  const partFloor = Number(statement.partFloorNotPlaced.m2) > 0;

  /*
    THE ENGINE'S SENTENCES, ONCE EACH.

    A cap's note and an omission's reason are the same string where the same fact
    explains both — a commercial allowance with nothing proposed against it is
    one note in two places on the engine's side, deliberately, so that neither
    reader of the data misses it. Printing it twice on one screen is noise, so
    the set is taken here. It is a display decision about repetition and not a
    figure: nothing is dropped, and nothing is computed.
  */
  const sentences = [
    ...new Set([
      ...statement.reconciliation,
      ...statement.caps.flatMap((c) => c.notes),
      ...statement.omissions.map((o) => o.reason),
    ]),
  ];

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

      {/*
        ONE TABLE PER ALLOWANCE, in the engine's order — residential, then
        commercial where the instrument states one. Two allowances summed at the
        end is his table's structure and it is not cosmetic: the ground floor is
        where the two meet, and a single merged table cannot say which allowance
        a level was measured against.
      */}
      {statement.caps.map((cap) => (
        <Cap
          key={cap.kind}
          t={t}
          cap={cap}
          rows={statement.rows.filter((r) => r.cap === cap.kind)}
          omissions={statement.omissions.filter((o) => o.cap === cap.kind)}
          onInspect={onInspect}
        />
      ))}

      {partFloor ? (
        <p className="fine-print">
          {t.partFloor.before}
          <Area value={statement.partFloorNotPlaced.m2} unit="m²" />
          {t.partFloor.after}
        </p>
      ) : null}

      {/*
        THE ENGINE'S OWN SENTENCES, BEHIND ONE CONTROL AND NOT BEHIND A CLAIM.

        Each is an engine string — a reconciliation, a NOT ASSESSED reason, a note
        about the second allowance — so each goes through `EngineText`, which
        marks it `lang="en"` on the Arabic page. The glossary forbids translating
        them: a basis, a refusal or a reconciliation read to an Arabic reader as
        Arabic copy would be this product paraphrasing its own engine.
      */}
      {sentences.length > 0 ? (
        <details className="disclosure">
          <summary>{t.notModelled}</summary>
          {sentences.map((sentence) => (
            <p key={sentence} className="fine-print">
              <EngineText>{sentence}</EngineText>
            </p>
          ))}
        </details>
      ) : null}
    </section>
  );
}
