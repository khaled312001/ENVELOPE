/**
 * THE PLOT-LIMITS PANEL — every limit the plot's own sheet states, and what
 * became of it.
 *
 * ---------------------------------------------------------------------------
 * THE SECOND TABLE IS WHY THIS COMPONENT EXISTS.
 *
 * The defect it reports on was an affection plan that was read, displayed, and
 * then dropped before the engine ran: the sheet printed a FAR of 3.5 and the run
 * used a draft rule's 5.00, with a full derivation under the wrong number. Now
 * the sheet binds — and a panel that showed only the limits it bound would be the
 * same silence one screen later. So `notBound` is never collapsed to a count,
 * never hidden behind a disclosure, and never phrased as an error: the sheet is
 * correct and so is the reader, and the engine simply has no parameter for some
 * of what a sheet says.
 *
 * ---------------------------------------------------------------------------
 * NO AMBER, AND THE ABSENCE IS THE DECISION.
 *
 * Nothing here is `ASSUMED`. An applied limit is `DERIVED` from a citation; a
 * limit that binds nothing is not a value at all. §13.1 reserves amber
 * exclusively for uncertainty, and this panel is exactly the kind of place where
 * it would get borrowed to mean "important" — which is the one thing that rule
 * exists to prevent. The unapplied rows carry their weight through position and
 * a heading, like every other neutral fact on the site.
 *
 * ---------------------------------------------------------------------------
 * IT NEVER SAYS THE DESIGN COMPLIES.
 *
 * `claim` is the last line and it is not decoration. A panel headed "applied to
 * this run", full of green-looking rows read out of an official document, is the
 * single most plausible place on this site for a reader to conclude that
 * something was checked. Applying a limit is not a finding that anything meets
 * it, and the sentence saying so sits under the tables rather than in a footer.
 */

import type { SheetReport } from '../api/client.js';
import { useDict } from '../i18n/locale.js';
import { AR } from '../i18n/limits.ar.js';
import { EN } from '../i18n/limits.en.js';
import { EngineText, EngineValue } from './TracedValue.js';

export function PlotLimits({ sheet }: { readonly sheet: SheetReport }): JSX.Element {
  const t = useDict(EN, AR);

  return (
    <section className="panel pl" aria-labelledby="plot-limits-heading">
      <header className="panel__header">
        <h2 id="plot-limits-heading" className="panel__title">
          {t.heading}
        </h2>
      </header>

      {!sheet.attached ? (
        <div className="callout" role="note">
          <div className="callout__body">
            <strong>{t.none.title}</strong>
            <p>{t.none.body}</p>
          </div>
        </div>
      ) : (
        <>
          <p className="pl-source">
            <span className="pl-source__label">{t.read}</span>{' '}
            <EngineText>{sheet.documentUri ?? ''}</EngineText>
            {sheet.issuedOn === null ? null : (
              <>
                {' · '}
                <span className="pl-source__label">{t.issued}</span>{' '}
                {sheet.issuedOn === 'UNDATED' ? (
                  t.undated
                ) : (
                  <EngineValue>{sheet.issuedOn}</EngineValue>
                )}
              </>
            )}
          </p>

          {sheet.refused === null ? null : (
            /*
              `role="note"`, not `alert`. Nothing failed: the run completed on the
              general rules and the reader is being told which document was set
              aside. An alert would report a working run as a broken one.
            */
            <div className="callout" role="note">
              <div className="callout__body">
                <strong>{t.refused.title}</strong>
                <p>
                  <EngineText>{sheet.refused}</EngineText>
                </p>
              </div>
            </div>
          )}

          {sheet.refused !== null ? null : (
            <>
              <h3 className="pl-subhead">{t.bound.title}</h3>
              <p className="pl-lede">{t.bound.lede}</p>
              {sheet.bound.length === 0 ? (
                <p className="fine-print">{t.bound.empty}</p>
              ) : (
                <div className="schedule" role="region" aria-label={t.bound.title} tabIndex={0}>
                  <table>
                    <caption className="sr-only">{t.bound.lede}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{t.bound.parameter}</th>
                        <th scope="col" className="schedule__num">
                          {t.bound.value}
                        </th>
                        <th scope="col">{t.bound.clause}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sheet.bound.map((b) => (
                        <tr key={b.parameterId}>
                          <th scope="row">
                            <code className="ident">{b.parameterId}</code>
                          </th>
                          <td className="schedule__num">
                            <EngineValue>{`${b.value} ${b.unit}`}</EngineValue>
                          </td>
                          <td>
                            <EngineText>{b.clause}</EngineText>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {sheet.notBound.length === 0 ? null : (
            <>
              <h3 className="pl-subhead">{t.notBound.title}</h3>
              <p className="pl-lede">{t.notBound.lede}</p>
              <div className="schedule" role="region" aria-label={t.notBound.title} tabIndex={0}>
                <table>
                  <caption className="sr-only">{t.notBound.lede}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t.notBound.field}</th>
                      <th scope="col">{t.notBound.reason}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.notBound.map((n) => (
                      <tr key={n.field}>
                        <th scope="row">
                          <code className="ident">{n.field}</code>
                          <span className="pl-stated">
                            <EngineText>{n.stated}</EngineText>
                          </span>
                        </th>
                        <td>
                          <EngineText>{n.reason}</EngineText>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      <p className="fine-print pl-claim">{t.claim}</p>
    </section>
  );
}
