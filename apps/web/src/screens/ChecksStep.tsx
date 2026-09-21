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

type ClaimKey =
  | 'selfConsistency'
  | 'ruleCoverage'
  | 'geometricValidity'
  | 'professionalAgreement'
  | 'regulatoryValidity';

/** §16.5's order and headings. Fixed, and not a presentation choice. */
const CLAIM_ORDER: readonly { key: ClaimKey; title: string }[] = [
  { key: 'selfConsistency', title: 'Self-consistency' },
  { key: 'ruleCoverage', title: 'Rule coverage' },
  { key: 'geometricValidity', title: 'Geometric validity' },
  { key: 'professionalAgreement', title: 'Professional agreement' },
  { key: 'regulatoryValidity', title: 'Regulatory validity' },
];

const STATUS_CLASS: Record<string, string> = {
  SUPPORTED: 'supported',
  MEASURED: 'supported',
  PARTIAL: 'partial',
  NOT_ASSESSED: 'not-assessed',
  NEVER_CLAIMED: 'never',
};

const STATUS_LABEL: Record<string, string> = {
  SUPPORTED: 'Supported',
  MEASURED: 'Measured',
  PARTIAL: 'Partial',
  NOT_ASSESSED: 'Not assessed',
  NEVER_CLAIMED: 'Never claimed',
};

const STATUS_GLYPH: Record<string, string> = {
  SUPPORTED: '✓',
  MEASURED: '✓',
  PARTIAL: '~',
  NOT_ASSESSED: '⌗',
  NEVER_CLAIMED: '✕',
};

export function ChecksStep({ run }: { readonly run: RunView }): JSX.Element {
  const checks = run.checks;

  return (
    <>
      <section className="panel" aria-labelledby="claims-heading">
        <header className="panel__header">
          <div>
            <h2 id="claims-heading" className="panel__title">
              What we checked, and what we did not
            </h2>
            <p className="panel__subtitle">
              Five different questions, answered separately. They are not the same
              question, and only one of them is about the regulator.
            </p>
          </div>
        </header>

        <dl className="claims">
          {CLAIM_ORDER.map(({ key, title }) => {
            const claim = checks.validation.claims[key];
            const variant = STATUS_CLASS[claim.status] ?? 'not-assessed';
            return (
              <div key={key} className={`claim claim--${variant}`}>
                <dt>
                  <span className="claim__glyph" aria-hidden="true">
                    {STATUS_GLYPH[claim.status] ?? '⌗'}
                  </span>
                  {title}
                  <span className="claim__status">
                    {STATUS_LABEL[claim.status] ?? claim.status}
                  </span>
                </dt>
                <dd>{claim.detail}</dd>
              </div>
            );
          })}
        </dl>

        <div className="callout callout--warn">
          <p>{checks.validation.selfConsistencyNotice}</p>
        </div>

        <details className="disclosure">
          <summary>What independence here does and does not mean</summary>
          <p className="fine-print">{checks.validation.independenceLimit}</p>
        </details>
      </section>

      <InvariantTable checks={checks} />
      <ConstraintOutcomes checks={checks} />

      <p className="fine-print">
        Runtime {run.elapsedMs} ms
        {run.withinRuntimeBudget ? ' — within the 10 s budget.' : ' — over the 10 s budget.'}
        {' · '}
        Definitions annex {run.annexVersion}.
      </p>
    </>
  );
}

function InvariantTable({ checks }: { readonly checks: ChecksView }): JSX.Element {
  const [showAll, setShowAll] = useState(false);
  const { invariants } = checks;
  const passed = invariants.results.filter((r) => r.status === 'PASS').length;
  const failed = invariants.results.filter((r) => r.status === 'FAIL').length;
  const rows = showAll
    ? invariants.results
    : invariants.results.filter((r) => r.status !== 'DORMANT');

  return (
    <section className="panel" aria-labelledby="invariants-heading">
      <header className="panel__header">
        <div>
          <h2 id="invariants-heading" className="panel__title">
            Conservation checks
          </h2>
          <p className="panel__subtitle">
            Arithmetic that has to close whatever the rules say. A failure here blocks
            the run — it is never a warning.
          </p>
        </div>
        <div className="panel__header-actions">
          <span className="chip chip--ok">{passed} passed</span>
          {failed > 0 ? <span className="chip chip--danger">{failed} failed</span> : null}
          <span className="chip">{invariants.dormant.length} not assessed</span>
        </div>
      </header>

      {/*
        The count sentence, spelled out rather than reduced to a ratio.
        "10 of 18" invites the reader to supply the missing eight as passes,
        which is exactly the claim the engine refuses to make.
      */}
      <p className="fine-print">
        {invariants.ran} of {invariants.total} checks in the catalogue ran on this
        artifact. {invariants.dormant.length} had nothing to check and are{' '}
        <strong>not counted as passes</strong>.
      </p>

      <table className="data-table">
        <caption className="sr-only">
          Invariant results, with the observed and expected values for each
        </caption>
        <thead>
          <tr>
            <th scope="col">Check</th>
            <th scope="col">Statement</th>
            <th scope="col">Observed</th>
            <th scope="col">Expected</th>
            <th scope="col">Tolerance</th>
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
                {r.statement}
                {r.status === 'DORMANT' || r.status === 'FAIL' ? (
                  <span className="data-table__basis"> — {r.detail}</span>
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
              <td className="data-table__num">{r.tolerance}</td>
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
            {showAll
              ? 'Hide the checks that had nothing to check'
              : `Show the ${invariants.dormant.length} checks that had nothing to check`}
          </button>
          <p className="fine-print">{invariants.dormantNote}</p>
        </>
      ) : null}
    </section>
  );
}

const NUMERIC = /^[-\d.,\s]+$/;

function Measured({ value }: { readonly value: string | null }): JSX.Element {
  if (value === null) return <td className="data-table__num muted">—</td>;
  return <td className={NUMERIC.test(value) ? 'data-table__num' : ''}>{value}</td>;
}

function StatusChip({ status }: { readonly status: string }): JSX.Element {
  if (status === 'PASS') return <span className="chip chip--ok">pass</span>;
  if (status === 'FAIL') return <span className="chip chip--danger">fail</span>;
  return <span className="chip chip--deferred">not assessed</span>;
}

function ConstraintOutcomes({ checks }: { readonly checks: ChecksView }): JSX.Element {
  const { summary, outcomes } = checks.validation;
  const hard = outcomes.filter((o) => o.category === 'HARD');
  const deferred = outcomes.filter((o) => o.category === 'DEFERRED');

  return (
    <section className="panel" aria-labelledby="constraints-heading">
      <header className="panel__header">
        <div>
          <h2 id="constraints-heading" className="panel__title">
            The answer, re-checked against the rules
          </h2>
          <p className="panel__subtitle">
            By a module that cannot see the one that produced it. Agreement is
            self-consistency — never compliance.
          </p>
        </div>
        <div className="panel__header-actions">
          <span className="chip chip--ok">{summary.hardSatisfied} satisfied</span>
          {summary.hardViolated > 0 ? (
            <span className="chip chip--danger">{summary.hardViolated} violated</span>
          ) : null}
          {summary.hardNotEvaluable > 0 ? (
            <span className="chip chip--warn">
              {summary.hardNotEvaluable} not evaluable
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
                <span className="chip chip--ok">satisfied</span>
              ) : o.status === 'VIOLATED' ? (
                <span className="chip chip--danger">violated</span>
              ) : (
                <span className="chip chip--warn">not evaluable</span>
              )}
              {o.isLifeSafety ? <span className="chip chip--danger">life safety</span> : null}
            </div>
            <span className="muted">{o.statement}</span>
          </li>
        ))}
      </ul>

      {deferred.length > 0 ? (
        <div className="rule-group rule-group--deferred">
          <h3 className="panel__section">
            Applicable, and not assessed <span className="chip">{deferred.length}</span>
            {summary.lifeSafetyDeferred > 0 ? (
              <span className="chip chip--danger">
                {summary.lifeSafetyDeferred} life safety
              </span>
            ) : null}
          </h3>
          <p className="fine-print">
            Declared in every output. What was not checked has to be visible rather
            than absent — an omitted check reads as a check that passed.
          </p>
          <ul className="rule-list">
            {deferred.map((o) => (
              <li key={o.ruleId}>
                <div className="rule-list__head">
                  <code>{o.ruleId}</code>
                  <span className="chip chip--deferred">not assessed</span>
                  {o.isLifeSafety ? (
                    <span className="chip chip--danger">life safety</span>
                  ) : null}
                </div>
                <span className="muted">{o.reason ?? o.statement}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
