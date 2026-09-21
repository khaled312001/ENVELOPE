/**
 * The assumption register — `FR-ASM-001`, and §20.2's second "moment that
 * carries the product": *the moment the user understands this is not magic.*
 *
 * Three properties the PRD makes non-negotiable, and each is load-bearing:
 *
 * * **Non-skippable.** `G3` blocks export until it is acknowledged. There is no
 *   "skip" affordance in this component, and adding one would be a defect.
 * * **Sensitivity-ranked.** The assumption that moves the answer most is first.
 *   A register sorted alphabetically is a list; sorted by effect it is a
 *   priority order, and that is the difference between disclosure and use.
 * * **Inline-editable.** A user who disagrees with an assumption changes it
 *   here and sees the answer move, rather than filing it as a caveat.
 *
 * One thing this component does that the PRD does not ask for: it shows
 * assumptions whose effect could **not** be measured, marked as such. An
 * unmeasured assumption is not a harmless one, and a register that quietly
 * dropped them would rank a partial list and present it as complete.
 */

import { useState } from 'react';

export interface AssumptionEntry {
  readonly nodeId: string;
  readonly parameterId: string;
  readonly label: string;
  readonly value: string;
  readonly unit: string | null;
  readonly basis: string;
  readonly sensitivity: {
    readonly perturbation: string;
    readonly lowGoverningGfaM2: string;
    readonly highGoverningGfaM2: string;
    readonly relativeEffect: string;
  } | null;
}

export interface AssumptionRegisterProps {
  readonly assumptions: readonly AssumptionEntry[];
  readonly acknowledged: boolean;
  readonly onAcknowledge: () => void;
  readonly onEdit: (parameterId: string, value: string) => void;
  readonly onInspect: (nodeId: string) => void;
}

export function AssumptionRegister({
  assumptions,
  acknowledged,
  onAcknowledge,
  onEdit,
  onInspect,
}: AssumptionRegisterProps): JSX.Element {
  const measured = assumptions.filter((a) => a.sensitivity !== null);
  const strongest = measured[0]?.sensitivity
    ? Number(measured[0].sensitivity.relativeEffect)
    : 0;

  return (
    <section className="panel" aria-labelledby="assumptions-heading">
      <header className="panel__header">
        <div>
          <h2 id="assumptions-heading" className="panel__title">
            Assumptions
          </h2>
          <p className="panel__subtitle">
            {assumptions.length === 0
              ? 'Every value in this run came from a rule or from you. Nothing was assumed.'
              : `${assumptions.length} value${assumptions.length === 1 ? '' : 's'} had no ` +
                `governing rule. ${
                  strongest > 0
                    ? `The one at the top moves the answer by ${(strongest * 100).toFixed(1)}%.`
                    : ''
                }`}
          </p>
        </div>
      </header>

      {assumptions.length === 0 ? null : (
        <table className="data-table">
          <caption className="sr-only">
            Assumptions made in this run, ordered by how much each moves the governing
            capacity
          </caption>
          <thead>
            <tr>
              <th scope="col" className="data-table__rank">
                #
              </th>
              <th scope="col">Assumption</th>
              <th scope="col" className="data-table__num">
                Value
              </th>
              <th scope="col">Why it was assumed</th>
              <th scope="col" className="data-table__num">
                Effect at ±10%
              </th>
            </tr>
          </thead>
          <tbody>
            {assumptions.map((a, i) => (
              <AssumptionRow
                key={a.nodeId}
                entry={a}
                rank={i + 1}
                strongest={strongest}
                onEdit={onEdit}
                onInspect={onInspect}
              />
            ))}
          </tbody>
        </table>
      )}

      <footer className="panel__footer panel__footer--gate">
        {acknowledged ? (
          <p className="gate-status gate-status--done">
            <span aria-hidden="true">✓</span> You acknowledged these assumptions. You can
            still change any of them.
          </p>
        ) : (
          <>
            <p className="gate-status gate-status--pending">
              <span aria-hidden="true">!</span> Read these before exporting. The report
              carries them, and so does any decision made from it.
            </p>
            <button type="button" className="button button--primary" onClick={onAcknowledge}>
              I have read the assumptions
            </button>
          </>
        )}
      </footer>
    </section>
  );
}

function AssumptionRow({
  entry,
  rank,
  strongest,
  onEdit,
  onInspect,
}: {
  readonly entry: AssumptionEntry;
  readonly rank: number;
  readonly strongest: number;
  readonly onEdit: (parameterId: string, value: string) => void;
  readonly onInspect: (nodeId: string) => void;
}): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.value);

  const effect = entry.sensitivity ? Number(entry.sensitivity.relativeEffect) : null;
  // Bar length is relative to the strongest assumption, so the top row is always
  // full and the rest are read against it. An absolute scale would make every
  // bar a sliver on a plot where nothing much is assumed.
  const barWidth = effect !== null && strongest > 0 ? Math.max(2, (effect / strongest) * 100) : 0;

  const commit = (): void => {
    setEditing(false);
    if (draft !== entry.value) onEdit(entry.parameterId, draft);
  };

  return (
    <tr>
      <td className="data-table__rank">{rank}</td>

      <th scope="row" className="data-table__label">
        <button
          type="button"
          className="link-button"
          onClick={() => onInspect(entry.nodeId)}
          title="Show where this assumption is used"
        >
          {entry.label}
        </button>
        <span className="muted data-table__param">{entry.parameterId}</span>
      </th>

      <td className="data-table__num">
        {editing ? (
          <span className="inline-edit">
            <label className="sr-only" htmlFor={`edit-${entry.nodeId}`}>
              {entry.label}
            </label>
            <input
              id={`edit-${entry.nodeId}`}
              className="input input--num"
              value={draft}
              inputMode="decimal"
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') {
                  setDraft(entry.value);
                  setEditing(false);
                }
              }}
              onBlur={commit}
            />
          </span>
        ) : (
          <button
            type="button"
            className="traced traced--assumed"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${entry.label}, currently ${entry.value}${
              entry.unit ? ` ${entry.unit}` : ''
            }`}
          >
            <span className="value">
              {entry.value}
              {entry.unit ? <span className="value__unit">{entry.unit}</span> : null}
            </span>
            <span className="traced__marker" aria-hidden="true" />
          </button>
        )}
      </td>

      <td className="data-table__basis">{entry.basis}</td>

      <td className="data-table__num">
        {entry.sensitivity ? (
          <span className="sensitivity">
            <span className="sensitivity__figure">{(effect! * 100).toFixed(1)}%</span>
            <span
              className="sensitivity__bar"
              style={{ '--w': `${barWidth}%` } as React.CSSProperties}
              aria-hidden="true"
            />
            <span className="sr-only">
              Moves the governing capacity by {(effect! * 100).toFixed(1)} percent when
              perturbed by {entry.sensitivity.perturbation}
            </span>
          </span>
        ) : (
          <span className="not-assessed" title="This assumption could not be perturbed independently.">
            <span aria-hidden="true">⌗</span>
            Not measured
          </span>
        )}
      </td>
    </tr>
  );
}
