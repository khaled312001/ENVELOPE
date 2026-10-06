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

import { useDict, useLocale, Verbatim } from '../i18n/locale.js';
import { AR } from '../i18n/traced.ar.js';
import { EN } from '../i18n/traced.en.js';

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

/**
 * Plain-language description of each class, for the title and the legend — the
 * English, still exported for a caller that reads it outside a render. A render
 * reads `useDict(EN, AR).classDescription`, which is this same object in English.
 */
export const CLASS_DESCRIPTION: Readonly<Record<ProvenanceClass, string>> = EN.classDescription;

export const CLASS_LABEL: Readonly<Record<ProvenanceClass, string>> = EN.classLabel;

/**
 * WHAT THE ENGINE SAID, MARKED AS SUCH ON AN ARABIC PAGE AND UNTOUCHED ON AN ENGLISH ONE.
 *
 * A basis, a rule's label, a placement statement, a validator's sentence: the
 * glossary forbids translating them, and on a right-to-left page each needs
 * `Verbatim` — `dir="ltr" lang="en"` — so its punctuation stays at its own end and
 * a screen reader changes voice for it. On an English page the wrapper would be a
 * span that says nothing, and the English render of every screen that shows engine
 * text is held byte-for-byte to what it was, so there it renders the text alone.
 */
export function EngineText({ children }: { readonly children: ReactNode }): JSX.Element {
  const { locale } = useLocale();
  return locale === 'ar' ? <Verbatim>{children}</Verbatim> : <>{children}</>;
}

/**
 * A value as the engine emitted it. Most are figures and render as they are; some
 * are words the engine chose — a placement is "centred on the podium" — and those
 * are the engine's English, so they go through `EngineText` like any other engine
 * string rather than being read to an Arabic reader as Arabic copy.
 */
export function EngineValue({ children }: { readonly children: string }): JSX.Element {
  return /[A-Za-z]{2}/.test(children) ? <EngineText>{children}</EngineText> : <>{children}</>;
}

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
  const decimals = DECIMALS[key];
  const grouped = GROUPED.has(key);

  /*
    A FIGURE WITH NO KNOWN UNIT IS NEVER ROUNDED TO A WHOLE NUMBER IT IS NOT.

    Treating every unlisted unit as a count was right for bays and levels and wrong
    for anything else that arrived without a unit: the affection plan's FAR did, and
    the sheet's 3.5 was printed as "4" on the screen that exists to show what the
    sheet says. A count the engine emits is already whole and loses nothing here; a
    fraction keeps up to three places, and a count that arrives fractional shows its
    fraction instead of hiding a defect behind a rounded integer.
  */
  if (decimals === undefined) {
    return n.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: Number.isInteger(n) ? 0 : 3,
      useGrouping: grouped,
    });
  }

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
  /**
   * AN IDENTIFIER IS NOT A QUANTITY, and the formatter cannot tell them apart.
   *
   * `formatTraced` groups a unitless figure in thousands, which is right for a
   * bay count and wrong for a plot number: the affection plan screen printed
   * Trakhees plot 6211383 as **6,211,383** and DDA plot 5134565 as
   * **5,134,565** — a number a reader would copy into a submission and a number
   * that matches no plot. It is not a rounding bug and it cannot be fixed in the
   * formatter, because nothing on the wire distinguishes the two: both arrive as
   * a numeric string with no unit.
   *
   * So the caller says. `verbatim` prints `traced.value` exactly as the engine
   * sent it, with no grouping and no rounding, and every other treatment — the
   * class, the chip, the derivation, the screen-reader announcement — is
   * unchanged. Spend it on identifiers only: a plot number, a drawing reference,
   * a parcel id. A figure that means a quantity is still formatted.
   */
  readonly format?: 'auto' | 'verbatim';
  readonly children?: ReactNode;
}

export function TracedValue({
  traced,
  onInspect,
  onEdit,
  actorName,
  size = 'inline',
  format = 'auto',
}: TracedValueProps): JSX.Element {
  const t = useDict(EN, AR);
  const cls = traced.provenanceClass;
  const isAssumed = cls === 'ASSUMED';

  // An assumed value's primary action is *edit*, not inspect — §20.2 makes the
  // register "inline-editable", and a user who clicks an amber number is far
  // more likely to want to change it than to read how it was not derived.
  const handleClick = (): void => {
    if (isAssumed && onEdit) onEdit(traced.parameterId);
    else onInspect(traced.node);
  };

  const description = t.classDescription[cls];
  const action = isAssumed && onEdit ? t.editAction : t.inspectAction;
  const shown = format === 'verbatim' ? traced.value : formatTraced(traced.value, traced.unit);
  const figure = `${shown}${traced.unit ? ` ${traced.unit}` : ''}`;

  return (
    <span className={size === 'display' ? 'traced-display' : undefined}>
      <button
        type="button"
        className={`traced traced--${cls.toLowerCase()}`}
        onClick={handleClick}
        aria-label={t.ariaLabel(traced.parameterId, figure, description, action)}
        title={t.title(t.classLabel[cls], description)}
      >
        {/* `data-full` carries the engine's own string, unrounded, so the
            precision the engine computed is on the element rather than in a
            tooltip nobody can reach. */}
        <span className="value" data-full={traced.value}>
          <EngineValue>{shown}</EngineValue>
          {traced.unit ? <span className="value__unit">{traced.unit}</span> : null}
        </span>
        <span className="traced__marker" aria-hidden="true">
          {cls === 'DERIVED' ? '§' : null}
        </span>
      </button>
      {cls === 'USER_SET' && actorName ? (
        <span className="badge-user" title={t.enteredBy(actorName)}>
          {actorName}
        </span>
      ) : null}
      {/* The class is announced to assistive technology as text, not conveyed by
          colour. A screen-reader user must learn that a number is assumed at the
          same moment a sighted user does. */}
      <span className="sr-only">{t.srClass(t.classLabel[cls])}</span>
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
  const t = useDict(EN, AR);
  return (
    <span className="not-assessed" title={reason}>
      <span aria-hidden="true">⌗</span>
      {t.notAssessed}
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
  const t = useDict(EN, AR);
  const sample = (cls: ProvenanceClass, value: string): TracedWire => ({
    value,
    node: 'legend',
    parameterId: 'legend',
    provenanceClass: cls,
    renderHint: '',
  });

  return (
    <div className="provenance-legend" role="note" aria-label={t.legend.label}>
      <span className="provenance-legend__item">
        <span className="traced traced--derived">
          <span className="value">{sample('DERIVED', '5.25').value}</span>
          <span className="traced__marker" aria-hidden="true">
            §
          </span>
        </span>
        {t.legend.derived}
      </span>
      <span className="provenance-legend__item">
        <span className="traced traced--assumed">
          <span className="value">32.0</span>
          <span className="traced__marker" aria-hidden="true" />
        </span>
        {t.legend.assumed}
      </span>
      <span className="provenance-legend__item">
        <span className="badge-user">{t.legend.you}</span>
        {t.legend.userSet}
      </span>
      <span className="provenance-legend__item">
        <span className="not-assessed">
          <span aria-hidden="true">⌗</span>
          {t.legend.notAssessed}
        </span>
        {t.legend.notChecked}
      </span>
    </div>
  );
}
