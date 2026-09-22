/**
 * Step 7 — what was checked, what was not, and what is never claimed.
 *
 * This screen used to state five claims in text a designer had written. It now
 * states the five the *validator* produced, which is a different thing: the
 * wording is generated from counts the run actually measured, so a screen that
 * says "supported" is a screen where something passed rather than a screen
 * where someone was optimistic. §16.5 fixes the five headings; the detail under
 * each is the validator's own sentence, rendered verbatim.
 *
 * Three deliberate refusals here:
 *
 * 1. **No "10 of 18 passed".** A dormant check is not a pass and not a failure;
 *    it had nothing to check. The counts are shown as three separate numbers
 *    and the denominator that matters — how many *ran* — leads.
 * 2. **Not-assessed rows are grey-hatched, not omitted** (§20.3). An invariant
 *    missing from the table reads as an invariant that passed.
 * 3. **The independence limit is on the screen, not in a tooltip.** The
 *    validator agreeing with the generator is self-consistency; §16.4 requires
 *    the report to say so, and a disclosure a user has to hover to find is a
 *    disclosure written for the author's comfort.
 */

import { useState } from 'react';

import type { ChecksView, RunView } from '../api/client.js';
import { EngineText } from '../components/TracedValue.js';
import { AR } from '../i18n/checks.ar.js';
import { EN } from '../i18n/checks.en.js';
import { useDict } from '../i18n/locale.js';

/*
  THE COPY LIVES IN `i18n/checks.*.ts`. What stays here is everything the validator
  and the run supply — each claim's detail, the notices, every invariant's id,
  statement and figures, every rule's outcome — which is rendered as the engine
  wrote it in either language, inside `EngineText` so an Arabic page marks it
  `Verbatim`. The English render is byte-for-byte what it was before the move.
*/

/** The runtime budget the footer states — a figure, so not a word in a dictionary. */
const RUNTIME_BUDGET = '10 s';

type ClaimKey =
  | 'selfConsistency'
  | 'ruleCoverage'
  | 'geometricValidity'
  | 'professionalAgreement'
  | 'regulatoryValidity';

/** §16.5's order. Fixed, and not a presentation choice; the headings are in the dictionary. */
const CLAIM_ORDER: readonly ClaimKey[] = [
  'selfConsistency',
  'ruleCoverage',
  'geometricValidity',
  'professionalAgreement',
  'regulatoryValidity',
];

const STATUS_CLASS: Record<string, string> = {
  SUPPORTED: 'supported',
  MEASURED: 'supported',
  PARTIAL: 'partial',
  NOT_ASSESSED: 'not-assessed',
  NEVER_CLAIMED: 'never',
};

const STATUS_GLYPH: Record<string, string> = {
  SUPPORTED: '✓',
  MEASURED: '✓',
  PARTIAL: '~',
  NOT_ASSESSED: '⌗',
  NEVER_CLAIMED: '✕',
};

export function ChecksStep({ run }: { readonly run: RunView }): JSX.Element {
  const t = useDict(EN, AR);
  const checks = run.checks;
  const statusLabel = t.status as Readonly<Record<string, string>>;

  return (
    <>
      <section className="panel" aria-labelledby="claims-heading">
        <header className="panel__header">
          <div>
            <h2 id="claims-heading" className="panel__title">
              {t.title}
            </h2>
            <p className="panel__subtitle">{t.subtitle}</p>
          </div>
        </header>

        <dl className="claims">
          {CLAIM_ORDER.map((key) => {
            const claim = checks.validation.claims[key];
            const variant = STATUS_CLASS[claim.status] ?? 'not-assessed';
            return (
              <div key={key} className={`claim claim--${variant}`}>
                <dt>
                  <span className="claim__glyph" aria-hidden="true">
                    {STATUS_GLYPH[claim.status] ?? '⌗'}
                  </span>
                  {t.claims[key]}
                  <span className="claim__status">
                    {statusLabel[claim.status] ?? claim.status}
                  </span>
                </dt>
                <dd>
                  <EngineText>{claim.detail}</EngineText>
                </dd>
              </div>
            );
          })}
        </dl>

        <div className="callout callout--warn">
          <p>
            <EngineText>{checks.validation.selfConsistencyNotice}</EngineText>
          </p>
        </div>

        <details className="disclosure">
          <summary>{t.independence}</summary>
          <p className="fine-print">
            <EngineText>{checks.validation.independenceLimit}</EngineText>
          </p>
        </details>
      </section>

      <InvariantTable checks={checks} />
      <ConstraintOutcomes checks={checks} />

      <p className="fine-print">
        {t.footer.runtime}
        {run.elapsedMs}
        {run.withinRuntimeBudget ? t.footer.within(RUNTIME_BUDGET) : t.footer.over(RUNTIME_BUDGET)}
        {t.footer.annex}
        <EngineText>{run.annexVersion}</EngineText>.
      </p>
    </>
  );
}

function InvariantTable({ checks }: { readonly checks: ChecksView }): JSX.Element {
  const t = useDict(EN, AR).invariants;
  const [showAll, setShowAll] = useState(false);
  const { invariants } = checks;
  const passed = invariants.results.filter((r) => r.status === 'PASS').length;
  const failed = invariants.results.filter((r) => r.status === 'FAIL').length;
  const rows = showAll
    ? invariants.results
    : invariants.results.filter((r) => r.status !== 'DORMANT');
  const ranSentence = t.ran(
    String(invariants.ran),
    String(invariants.total),
    String(invariants.dormant.length),
  );

  return (
    <section className="panel" aria-labelledby="invariants-heading">
      <header className="panel__header">
        <div>
          <h2 id="invariants-heading" className="panel__title">
            {t.title}
          </h2>
          <p className="panel__subtitle">{t.subtitle}</p>
        </div>
        <div className="panel__header-actions">
          <span className="chip chip--ok">{t.passed(String(passed))}</span>
          {failed > 0 ? <span className="chip chip--danger">{t.failed(String(failed))}</span> : null}
          <span className="chip">{t.notAssessed(String(invariants.dormant.length))}</span>
        </div>
      </header>

      {/*
        The count sentence, spelled out rather than reduced to a ratio.
        "10 of 18" invites the reader to supply the missing eight as passes,
        which is exactly the claim the engine refuses to make.
      */}
      <p className="fine-print">
        {ranSentence.before}
        <strong>{ranSentence.emphasis}</strong>
        {ranSentence.after}
      </p>

      <table className="data-table">
        <caption className="sr-only">{t.caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t.columns.check}</th>
            <th scope="col">{t.columns.statement}</th>
            <th scope="col">{t.columns.observed}</th>
            <th scope="col">{t.columns.expected}</th>
            <th scope="col">{t.columns.tolerance}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className={r.status === 'DORMANT' ? 'is-not-assessed' : undefined}
            >
              <th scope="row" className="data-table__label">
                <code>{r.id}</code>
                <StatusChip status={r.status} />
              </th>
              <td>
                <EngineText>{r.statement}</EngineText>
                {r.status === 'DORMANT' || r.status === 'FAIL' ? (
                  <span className="data-table__basis">
                    {' — '}
                    <EngineText>{r.detail}</EngineText>
                  </span>
                ) : null}
              </td>
              {/*
                Right-aligned tabular numerals only when the cell holds a
                number. Several checks report a sentence — "≤ min(1917.5,
                1280)", "8 of 8 defined" — and right-aligning prose against a
                column of figures makes both harder to scan.
              */}
              <Measured value={r.observed} />
              <Measured value={r.expected} />
              <td className="data-table__num">
                <EngineText>{r.tolerance}</EngineText>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {invariants.dormant.length > 0 ? (
        <>
          <button
            type="button"
            className="link-button"
            aria-expanded={showAll}
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? t.hideDormant : t.showDormant(String(invariants.dormant.length))}
          </button>
          <p className="fine-print">
            <EngineText>{invariants.dormantNote}</EngineText>
          </p>
        </>
      ) : null}
    </section>
  );
}

const NUMERIC = /^[-\d.,\s]+$/;

function Measured({ value }: { readonly value: string | null }): JSX.Element {
  if (value === null) return <td className="data-table__num muted">—</td>;
  return (
    <td className={NUMERIC.test(value) ? 'data-table__num' : ''}>
      <EngineText>{value}</EngineText>
    </td>
  );
}

function StatusChip({ status }: { readonly status: string }): JSX.Element {
  const t = useDict(EN, AR).invariants;
  if (status === 'PASS') return <span className="chip chip--ok">{t.pass}</span>;
  if (status === 'FAIL') return <span className="chip chip--danger">{t.fail}</span>;
  return <span className="chip chip--deferred">{t.notAssessedChip}</span>;
}

function ConstraintOutcomes({ checks }: { readonly checks: ChecksView }): JSX.Element {
  const t = useDict(EN, AR).outcomes;
  const { summary, outcomes } = checks.validation;
  const hard = outcomes.filter((o) => o.category === 'HARD');
  const deferred = outcomes.filter((o) => o.category === 'DEFERRED');

  return (
    <section className="panel" aria-labelledby="constraints-heading">
      <header className="panel__header">
        <div>
          <h2 id="constraints-heading" className="panel__title">
            {t.title}
          </h2>
          <p className="panel__subtitle">{t.subtitle}</p>
        </div>
        <div className="panel__header-actions">
          <span className="chip chip--ok">{t.satisfiedCount(String(summary.hardSatisfied))}</span>
          {summary.hardViolated > 0 ? (
            <span className="chip chip--danger">{t.violatedCount(String(summary.hardViolated))}</span>
          ) : null}
          {summary.hardNotEvaluable > 0 ? (
            <span className="chip chip--warn">
              {t.notEvaluableCount(String(summary.hardNotEvaluable))}
            </span>
          ) : null}
        </div>
      </header>

      <ul className="rule-list">
        {hard.map((o) => (
          <li key={`${o.parameterId}-${o.ruleId}`}>
            <div className="rule-list__head">
              <code>{o.parameterId}</code>
              {o.status === 'SATISFIED' ? (
                <span className="chip chip--ok">{t.satisfied}</span>
              ) : o.status === 'VIOLATED' ? (
                <span className="chip chip--danger">{t.violated}</span>
              ) : (
                <span className="chip chip--warn">{t.notEvaluable}</span>
              )}
              {o.isLifeSafety ? <span className="chip chip--danger">{t.lifeSafety}</span> : null}
            </div>
            <span className="muted">
              <EngineText>{o.statement}</EngineText>
            </span>
          </li>
        ))}
      </ul>

      {deferred.length > 0 ? (
        <div className="rule-group rule-group--deferred">
          <h3 className="panel__section">
            {t.deferredTitle}
            <span className="chip">{deferred.length}</span>
            {summary.lifeSafetyDeferred > 0 ? (
              <span className="chip chip--danger">
                {t.lifeSafetyCount(String(summary.lifeSafetyDeferred))}
              </span>
            ) : null}
          </h3>
          <p className="fine-print">{t.deferredNote}</p>
          <ul className="rule-list">
            {deferred.map((o) => (
              <li key={o.ruleId}>
                <div className="rule-list__head">
                  <code>{o.ruleId}</code>
                  <span className="chip chip--deferred">{t.notAssessed}</span>
                  {o.isLifeSafety ? (
                    <span className="chip chip--danger">{t.lifeSafety}</span>
                  ) : null}
                </div>
                <span className="muted">
                  <EngineText>{o.reason ?? o.statement}</EngineText>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
