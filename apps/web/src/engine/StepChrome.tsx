/**
 * The controls around a step: the footer that carries the flow, and the two
 * banners above it. Moved out of `App.tsx` unchanged.
 */

import { useId } from 'react';

import type { ApiError } from '../api/client.js';
import { AR } from '../i18n/app.ar.js';
import { EN } from '../i18n/app.en.js';
import { useDict } from '../i18n/locale.js';
import { missingFor, STEPS, type FlowState, type StepHint, type StepId } from './steps.js';
import { useVerbatim } from './verbatim.js';

/**
 * The footer that carries the flow — §20.1's ordering, made operable.
 *
 * ---------------------------------------------------------------------------
 * WHY IT EXISTS, AND IT IS A REPORTED DEFECT RATHER THAN A POLISH ITEM.
 *
 * `ParametersStep` renders its footer conditionally: once `G1` is signed it shows a
 * tick and NO BUTTON AT ALL. Confirming the plot advanced the step the first time
 * through, so the defect was invisible on a clean run — but come back to that step
 * from the strip, from a bookmark or from `?step=parameters`, and there was nothing
 * to press. The client's words: «بعد confirm the plot في زرار المفروض ندوس عليه انو
 * يدخلنا الصفحه الي بعدها مش موجود».
 *
 * And it was worse than the report. NO step had a back control. Ten small targets in
 * a horizontal strip were the whole of the navigation for a nine-step flow, on a
 * screen where each step is a decision someone may want to revisit.
 *
 * ---------------------------------------------------------------------------
 * THE DISABLED BUTTON SAYS WHY, IN THE SENTENCE BESIDE IT.
 *
 * A `next` that is merely dim is a dead end, which is the one shape of refusal this
 * product may not make — `/refusals` is a nav slot precisely because every refusal
 * here is supposed to be legible. `missingFor` supplies the reason and the sentence
 * names what would open the step.
 *
 * The button is genuinely `disabled` rather than `aria-disabled`, and the reason is
 * a sibling paragraph rather than a description on the control. That is this
 * screen's existing pattern — `RulesStep` disables its submit and prints
 * `compareNeeds` next to it — and `app.css`'s `.button:disabled` was written for
 * exactly this case: it drops the accent entirely rather than dimming it, because
 * "the Continue button does nothing" was the most common report of this screen.
 * Two patterns for one state would be worse than either.
 *
 * ---------------------------------------------------------------------------
 * NO DIRECTIONAL WORD IN THE COPY.
 *
 * "Back" and "Continue" name a direction in the flow, not a direction on the screen.
 * The chevrons are `aria-hidden` decoration and `app.css` flips them under `rtl`;
 * copy reading "the button on the right" would be wrong in Arabic and meaningless
 * to a screen reader in both languages. Each button also names the step it reaches,
 * so the accessible name is "Continue to Rules" rather than "Continue" repeated ten
 * times down a tab order.
 */
export function StepFooter({
  step,
  flow,
  onGo,
}: {
  readonly step: StepId;
  readonly flow: FlowState;
  readonly onGo: (id: StepId) => void;
}): JSX.Element {
  const t = useDict(EN, AR);
  const needsId = useId();
  const f = t.steps.footer;

  const index = STEPS.findIndex((s) => s.id === step);
  const previous = index > 0 ? STEPS[index - 1] : undefined;
  const next = index < STEPS.length - 1 ? STEPS[index + 1] : undefined;
  const missing = next ? missingFor(next.id, flow) : null;

  return (
    <nav className="step-footer" aria-label={f.nav}>
      {/* An empty cell rather than no cell: the grid places `next` at the inline end
          whether or not there is a `back`, and a missing first child would slide it. */}
      {previous ? (
        <button
          type="button"
          className="button step-footer__back"
          onClick={() => onGo(previous.id)}
        >
          <Chevron back />
          {f.backBefore}
          {t.steps.labels[previous.id]}
        </button>
      ) : (
        <span />
      )}

      {next ? (
        <div className="step-footer__forward">
          {missing ? (
            <p className="step-footer__needs" id={needsId}>
              {f.needs[missing]}
            </p>
          ) : null}
          <button
            type="button"
            className="button button--primary step-footer__next"
            onClick={() => onGo(next.id)}
            disabled={missing !== null}
          >
            {f.nextBefore}
            {t.steps.labels[next.id]}
            <Chevron />
          </button>
        </div>
      ) : (
        <p className="step-footer__end">{f.end}</p>
      )}
    </nav>
  );
}

/**
 * The footer's chevron — decoration, and the only glyph on this screen that is not
 * in `SiteChrome`'s `MarkName` set.
 *
 * It is deliberately not added there: that set is the PROVENANCE LEGEND — assumed,
 * derived, deferred, user-set, never-claimed — and every mark in it carries a
 * meaning the report and the drawings share. A navigation arrow has no provenance
 * class, and putting it in the legend would be the first mark in that set that means
 * nothing.
 */
function Chevron({ back = false }: { readonly back?: boolean }): JSX.Element {
  return (
    <svg
      className={`step-footer__chev${back ? ' step-footer__chev--back' : ''}`}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 3 L11 8 L6 13" />
    </svg>
  );
}

/**
 * The `?step=` banner, written at render from the facts `EngineApp` stored.
 *
 * The id the visitor typed and the engine's list of ids are not copy in either
 * language, so the sentence is written around them and, on the Arabic page, they
 * are isolated — without which the closing quotation mark and the full stop migrate
 * to the wrong end of the line.
 */
export function StepHintBanner({ hint }: { readonly hint: StepHint }): JSX.Element {
  const t = useDict(EN, AR);
  const ltr = useVerbatim();
  return (
    <p className="banner" role="status">
      {hint.kind === 'unknown' ? (
        <>
          {t.hint.unknownLead}
          {ltr(hint.wanted)}
          {t.hint.unknownBetween}
          {ltr(STEPS.map((st) => st.id).join(', '))}
          {t.hint.unknownTail}
        </>
      ) : (
        <>
          {t.hint.lockedLead}
          {t.steps.labels[hint.step]}
          {t.hint.lockedTail}
        </>
      )}
    </p>
  );
}

export function ErrorBanner({
  error,
  onDismiss,
}: {
  readonly error: ApiError;
  readonly onDismiss: () => void;
}): JSX.Element {
  // The engine's refusals are the product working. They are presented as
  // information the user needs, not as a system failure to apologise for.
  const t = useDict(EN, AR).error;
  const ltr = useVerbatim();
  const blocked = error.status === 422 || error.status === 409;
  return (
    <div className={`banner ${blocked ? 'banner--blocked' : 'banner--danger'}`} role="alert">
      <div>
        <strong>{blocked ? t.blocked : t.failed}</strong>
        {/* The API's sentence, as the API wrote it — the only party that knows why. */}
        <p>{ltr(error.message)}</p>
        {error.gate ? (
          <p className="fine-print">
            {t.blockedAt}
            {ltr(error.gate)}
          </p>
        ) : null}
      </div>
      <button type="button" className="button button--ghost button--icon" onClick={onDismiss} aria-label={t.dismiss}>
        ✕
      </button>
    </div>
  );
}
