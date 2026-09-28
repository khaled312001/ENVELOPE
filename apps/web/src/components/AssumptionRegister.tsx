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

import { useDict } from '../i18n/locale.js';
import { AR } from '../i18n/register.ar.js';
import { EN } from '../i18n/register.en.js';
import { EngineText, EngineValue } from './TracedValue.js';

/** The engine's perturbation for the sensitivity column — a figure, so not a word in a dictionary. */
const PERTURBATION = '±10%';

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
  const t = useDict(EN, AR);
  const measured = assumptions.filter((a) => a.sensitivity !== null);
  const strongest = measured[0]?.sensitivity
    ? Number(measured[0].sensitivity.relativeEffect)
    : 0;

  return (
    <section className="panel" aria-labelledby="assumptions-heading">
      <header className="panel__header">
        <div>
          <h2 id="assumptions-heading" className="panel__title">
            {t.title}
          </h2>
          <p className="panel__subtitle">
            {assumptions.length === 0
              ? t.none
              : (assumptions.length === 1 ? t.noRule.one : t.noRule.other)(String(assumptions.length)) +
                (strongest > 0 ? t.topMoves((strongest * 100).toFixed(1)) : '')}
          </p>
        </div>
      </header>

      {/*
        WHAT AN ASSUMPTION IS, BEFORE THE LIST OF THEM.

        §20.2 calls this step "the moment the user understands this is not magic",
        and the step was opening on a ranked table that assumed the reader already
        held the vocabulary. A client read it and wrote back «Assumptions مش
        فاهمها». A ranked disclosure nobody can read is not a disclosure.

        ---------------------------------------------------------------------
        THE EXPLAINER MOVED TO `StepPrimer`, AND THAT IS NOT A DEMOTION.

        The fix written here first — fact, then the amber sentence, then what to
        do, then the argument behind a closed disclosure — turned out to be the
        answer for all ten steps and not only this one, so it became a component
        and the copy became `primer.*.ts`. Two blocks saying nearly the same thing
        at the top of this one step was the alternative, and it is the shape a
        generalisation leaves behind when nobody deletes the original.

        THE ONE THING THAT DID NOT SURVIVE INTACT is that this block was shown
        even on a run with no assumptions, where the sentence is what makes the
        absence legible. The primer is rendered for the step rather than for the
        list, so that still holds — it is above this component either way. The
        `explainer` keys stay in `register.*.ts` for exactly one reason: `none`
        below reads "Nothing was assumed", and a reader meeting that needs the
        primer's sentence to have already happened, which it has.
      */}

      {assumptions.length === 0 ? null : (
        <table className="data-table">
          <caption className="sr-only">{t.caption}</caption>
          <thead>
            <tr>
              <th scope="col" className="data-table__rank">
                #
              </th>
              <th scope="col">{t.columns.assumption}</th>
              <th scope="col" className="data-table__num">
                {t.columns.value}
              </th>
              <th scope="col">{t.columns.why}</th>
              <th scope="col" className="data-table__num">
                {t.columns.effectAt(PERTURBATION)}
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
            <span aria-hidden="true">✓</span>
            {t.acknowledged}
          </p>
        ) : (
          <>
            <p className="gate-status gate-status--pending">
              <span aria-hidden="true">!</span>
              {t.pending}
            </p>
            <button type="button" className="button button--primary" onClick={onAcknowledge}>
              {t.acknowledge}
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
  const t = useDict(EN, AR);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.value);

  const effect = entry.sensitivity ? Number(entry.sensitivity.relativeEffect) : null;
  /*
    A VALUE THAT IS A SENTENCE, NOT A QUANTITY. Every `.value` is `nowrap`, because a
    figure broken across two lines is misread — but the unit mix is a list of types,
    and on one unbreakable line it pushed the basis column down to a word per line:
    the register rendered twenty thousand pixels tall on the one assumption that
    moves the answer most. The engine joins list items with "; ", so each one is set
    on its own line here and the cell is allowed to wrap. Nothing is recomputed.
  */
  const isText = /[A-Za-z]{2}/.test(entry.value);
  const lines = isText ? entry.value.split('; ') : [];
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
          title={t.showUse}
        >
          <EngineText>{entry.label}</EngineText>
        </button>
        <span className="muted data-table__param">
          <EngineText>{entry.parameterId}</EngineText>
        </span>
      </th>

      <td className={isText ? 'data-table__text' : 'data-table__num'}>
        {editing ? (
          <span className="inline-edit">
            <label className="sr-only" htmlFor={`edit-${entry.nodeId}`}>
              <EngineText>{entry.label}</EngineText>
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
            aria-label={t.editLabel(entry.label, `${entry.value}${entry.unit ? ` ${entry.unit}` : ''}`)}
          >
            <span className="value">
              {isText ? (
                lines.map((line, i) => (
                  <span key={`${i}:${line}`} className="value__line">
                    <EngineText>{line}</EngineText>
                  </span>
                ))
              ) : (
                <EngineValue>{entry.value}</EngineValue>
              )}
              {entry.unit ? <span className="value__unit">{entry.unit}</span> : null}
            </span>
            <span className="traced__marker" aria-hidden="true" />
          </button>
        )}
      </td>

      <td className="data-table__basis">
        <EngineText>{entry.basis}</EngineText>
      </td>

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
              {t.moves((effect! * 100).toFixed(1), entry.sensitivity.perturbation)}
            </span>
          </span>
        ) : (
          <span className="not-assessed" title={t.notMeasuredTitle}>
            <span aria-hidden="true">⌗</span>
            {t.notMeasured}
          </span>
        )}
      </td>
    </tr>
  );
}
