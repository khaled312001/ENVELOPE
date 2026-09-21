/**
 * `TracedValue` — the component every number in the product goes through.
 *
 * There is deliberately no other way to render a figure. A `<span>{value}</span>`
 * anywhere in this app is a bug, because it is a number with its provenance
 * stripped off — and a number whose provenance has been stripped off is exactly
 * the thing the whole system exists to prevent. §20.2: "Every number is a link.
 * This is the interaction that converts a skeptical architect."
 *
 * The visual treatment comes from `renderHint`, which the **engine** puts on the
 * wire. The frontend does not decide what an assumption looks like — if it did,
 * the two would drift, and the drift would always go one way: toward making
 * assumptions quieter.
 */

import type { ReactNode } from 'react';

export type ProvenanceClass =
  | 'DERIVED'
  | 'ASSUMED'
  | 'USER_SET'
  | 'OBSERVED'
  | 'TRADEOFF'
  | 'VARIANCE';

export interface TracedWire {
  readonly value: string;
  readonly node: string;
  readonly parameterId: string;
  readonly provenanceClass: ProvenanceClass;
  readonly renderHint: string;
  readonly unit?: string;
}

/** Plain-language description of each class, for the title and the legend. */
export const CLASS_DESCRIPTION: Readonly<Record<ProvenanceClass, string>> = {
  DERIVED: 'Computed from a cited rule. Open to see the clause.',
  ASSUMED: 'Assumed — no rule governs this. You can edit it.',
  USER_SET: 'You entered this value.',
  OBSERVED: 'Observed across comparable approved projects.',
  TRADEOFF: 'Chosen by the optimiser among feasible alternatives.',
  VARIANCE: 'Governed by a documented exemption. Open to see the evidence.',
};

export const CLASS_LABEL: Readonly<Record<ProvenanceClass, string>> = {
  DERIVED: 'Derived',
  ASSUMED: 'Assumed',
  USER_SET: 'You set this',
  OBSERVED: 'Observed',
  TRADEOFF: 'Trade-off',
  VARIANCE: 'Variance',
};

/**
 * DISPLAY PRECISION IS A SURFACE POLICY. It changes no provenance and no computed
 * value.
 *
 * The numeral was the one element in a product about numbers with no typographic
 * specification, and it is the loudest possible tell: a screenshot of the capacity
 * step printed `3512.8506 m²`, and the checks step printed
 * `0.15141242937853107344632766836 ratio`. No separator policy, no significant
 * figures, no decimal alignment down a column. Everything else on the page can be
 * beautifully argued and a reader still sees a console.
 *
 * The engine holds `Decimal`; this formats at the leaf; the rounded string never
 * re-enters a computation. That is structurally true rather than a convention —
 * `TracedValue` is the only place a figure is rendered and it has no path back into
 * the engine.
 *
 * FULL PRECISION IS NOT THROWN AWAY AND IS NOT HIDDEN IN A `title`. A title
 * attribute is unreachable by keyboard and unread by touch, so it is not a
 * disclosure, it is a place to put something and claim it was disclosed. It goes in
 * `data-full` and in the derivation panel, which is already the mechanism the whole
 * product is built around.
 *
 * THE POLICY APPLIES TO VALUES AND NEVER TO FORMULA STRINGS. A formula shown when a
 * figure is expanded is the engine's own string off the provenance graph, so after
 * this change a plot area displayed as 3,200.0 sits beside an engine formula saying
 * 3200.00. That mismatch is the correct outcome and is left visible: reformatting
 * the engine's string to match the display would be re-typing it, and a re-typed
 * formula drifts exactly as easily as a re-typed value and less visibly. If the two
 * are to agree, the engine emits the formula differently — a change in `packages/`,
 * not here.
 */
const DECIMALS: Readonly<Record<string, number>> = {
  m2: 1,
  'm²': 1,
  m: 1,
  ratio: 3,
  far: 3,
  percent: 1,
  '%': 1,
};

/** Units whose figures are grouped in thousands. A ratio is never grouped. */
const GROUPED = new Set(['m2', 'm²', 'm', 'count', 'levels', 'bays', 'units', '']);

export function formatTraced(raw: string, unit?: string): string {
  const n = Number(raw);
  // A value the engine did not emit as a number is passed through untouched. It is
  // more likely to be a label than a figure, and inventing a rounding for it would
  // be the surface deciding something the engine did not.
  if (!Number.isFinite(n) || raw.trim() === '') return raw;

  const key = (unit ?? '').trim().toLowerCase();
  // Counts — levels, bays, units, and a bare figure with no unit — are integers and
  // take no decimals. A bay count with a decimal point is a bay count nobody can
  // lay out.
  const decimals = DECIMALS[key] ?? 0;
  const grouped = GROUPED.has(key);

  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: grouped,
  });
}

export interface TracedValueProps {
  readonly traced: TracedWire;
  /** Opens the derivation. Every value must have one — see the file comment. */
  readonly onInspect: (nodeId: string) => void;
  /** Present only for ASSUMED values, which are inline-editable (`FR-ASM-001 AC3`). */
  readonly onEdit?: (parameterId: string) => void;
  /** Who set it, shown as a badge for USER_SET. */
  readonly actorName?: string;
  readonly size?: 'inline' | 'display';
  readonly children?: ReactNode;
}

export function TracedValue({
  traced,
  onInspect,
  onEdit,
  actorName,
  size = 'inline',
}: TracedValueProps): JSX.Element {
  const cls = traced.provenanceClass;
  const isAssumed = cls === 'ASSUMED';

  // An assumed value's primary action is *edit*, not inspect — §20.2 makes the
  // register "inline-editable", and a user who clicks an amber number is far
  // more likely to want to change it than to read how it was not derived.
  const handleClick = (): void => {
    if (isAssumed && onEdit) onEdit(traced.parameterId);
    else onInspect(traced.node);
  };

  const description = CLASS_DESCRIPTION[cls];
  const action = isAssumed && onEdit ? 'Edit this assumption' : 'Show where this number came from';

  return (
    <span className={size === 'display' ? 'traced-display' : undefined}>
      <button
        type="button"
        className={`traced traced--${cls.toLowerCase()}`}
        onClick={handleClick}
        aria-label={`${traced.parameterId}: ${formatTraced(traced.value, traced.unit)}${
          traced.unit ? ` ${traced.unit}` : ''
        }. ${description} ${action}.`}
        title={`${CLASS_LABEL[cls]} — ${description}`}
      >
        {/* `data-full` carries the engine's own string, unrounded, so the
            precision the engine computed is on the element rather than in a
            tooltip nobody can reach. */}
        <span className="value" data-full={traced.value}>
          {formatTraced(traced.value, traced.unit)}
          {traced.unit ? <span className="value__unit">{traced.unit}</span> : null}
        </span>
        <span className="traced__marker" aria-hidden="true">
          {cls === 'DERIVED' ? '§' : null}
        </span>
      </button>
      {cls === 'USER_SET' && actorName ? (
        <span className="badge-user" title={`Entered by ${actorName}`}>
          {actorName}
        </span>
      ) : null}
      {/* The class is announced to assistive technology as text, not conveyed by
          colour. A screen-reader user must learn that a number is assumed at the
          same moment a sighted user does. */}
      <span className="sr-only"> ({CLASS_LABEL[cls]})</span>
    </span>
  );
}

/**
 * A value that was applicable but not assessed — the deferred-check treatment.
 *
 * §3.4 item 8 requires the deferred-check list in every output. Rendering these
 * as blanks would read as zero; rendering them as hatched and labelled reads as
 * "nobody looked at this", which is the true statement and the useful one.
 */
export function NotAssessed({ reason }: { readonly reason: string }): JSX.Element {
  return (
    <span className="not-assessed" title={reason}>
      <span aria-hidden="true">⌗</span>
      Not assessed
    </span>
  );
}

/**
 * The legend. Rendered once per screen that shows figures.
 *
 * Not optional and not collapsible. A user who has not been told what amber
 * means has not been told that the number is an assumption.
 */
export function ProvenanceLegend(): JSX.Element {
  const sample = (cls: ProvenanceClass, value: string): TracedWire => ({
    value,
    node: 'legend',
    parameterId: 'legend',
    provenanceClass: cls,
    renderHint: '',
  });

  return (
    <div className="provenance-legend" role="note" aria-label="How to read these numbers">
      <span className="provenance-legend__item">
        <span className="traced traced--derived">
          <span className="value">{sample('DERIVED', '5.25').value}</span>
          <span className="traced__marker" aria-hidden="true">
            §
          </span>
        </span>
        From a cited rule
      </span>
      <span className="provenance-legend__item">
        <span className="traced traced--assumed">
          <span className="value">32.0</span>
          <span className="traced__marker" aria-hidden="true" />
        </span>
        Assumed — editable, and it moves the answer
      </span>
      <span className="provenance-legend__item">
        <span className="badge-user">You</span>
        You entered it
      </span>
      <span className="provenance-legend__item">
        <span className="not-assessed">
          <span aria-hidden="true">⌗</span>
          Not assessed
        </span>
        Applicable, not checked
      </span>
    </div>
  );
}
