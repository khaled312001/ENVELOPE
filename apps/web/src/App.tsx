/**
 * The nine-step flow — PRD §20.1.
 *
 * ```
 * 0. SHEET        read an affection plan, or skip          ← optional entry
 * 1. PLOT         form + boundary + edge classification   ┐
 * 2. PARAMETERS   FAR, height, coverage, plate cap        │ sequential
 * 3. RULES        + parking-in-FAR declaration (blocking) │ and gated
 * 4. ASSUMPTIONS  applicable set, citations, exclusions   ┘
 * 5. CAPACITY     bands A/B/C, governing band, massing    ┐
 * 6. PARKING      the level drawn, bays, ramp, entrance   │ freely
 * 7. CHECKS       invariants, validation, claims          │ navigable
 * 8. EVIDENCE     provenance tree, click-through          │
 * 9. EXPORT       PDF + JSON + DXF + XLSX                 ┘
 * ```
 *
 * Step 0 is not gated and not required. An affection plan is the fastest way in
 * and the one the client reacted to, but a plot whose sheet is not to hand is
 * still a plot — making the upload mandatory would turn a convenience into an
 * obstacle.
 *
 * Steps 1–4 are gated because each one shows the user something they must have
 * seen before the next is meaningful. Steps 5–9 are free because by then they
 * have seen it. Enforcing that ordering in the client is a convenience; the
 * server enforces it for real, because a gate a client can skip is not a gate.
 */

import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react';

import {
  api,
  ApiError,
  type Actor,
  type ExportResult,
  type PlotView,
  type RunRequestBody,
  type RunView,
} from './api/client.js';
import { AssumptionRegister } from './components/AssumptionRegister.js';
import { CapacityBands } from './components/CapacityBands.js';
import { PlotCanvas } from './components/PlotCanvas.js';
import { ProvenanceTree, type ProvTree } from './components/ProvenanceTree.js';
import { ProvenanceLegend, TracedValue } from './components/TracedValue.js';
import { MassingPanel } from './components/MassingPanel.js';
import { DrawingSet, useSheets } from './components/DrawingSet.js';
import { ParkingPlan, VehicleAccessPanel } from './components/ParkingPlan.js';
import { AffectionPlanIntake, type Prefill } from './screens/AffectionPlanIntake.js';
import { ChecksStep } from './screens/ChecksStep.js';
import { EvidenceStep } from './screens/EvidenceStep.js';
import { ParametersStep } from './screens/ParametersStep.js';
import { PlotForm } from './screens/PlotForm.js';
import { Link, type Href } from './router.js';
import { RulesStep } from './screens/RulesStep.js';
import { AR } from './i18n/app.ar.js';
import { EN } from './i18n/app.en.js';
import { useDict, useLocale, Verbatim } from './i18n/locale.js';
import { hashOf } from './gateHash.js';

/*
  `gated` is DELETED. It was metadata nobody read: the flag said `plot` was gated
  and the `reachable` computation below puts `plot` in the done set unconditionally,
  so the two had drifted and only one of them was doing anything. A second,
  plausible-looking source of truth for what blocks a step is worse than none —
  someone reads the table, believes it, and writes a guard against a fact the
  application does not hold.

  THE LABELS MOVED TO `i18n/app.en.ts` AND THE IDS STAYED. An id is the engine's
  name for a step — what `?step=` answers to and what the antechamber lists — and a
  translated id would name a step nothing here answers to. The label is copy.
*/
const STEPS = [
  { id: 'intake' },
  { id: 'plot' },
  { id: 'parameters' },
  { id: 'rules' },
  { id: 'assumptions' },
  { id: 'capacity' },
  { id: 'parking' },
  { id: 'checks' },
  { id: 'evidence' },
  { id: 'export' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

/**
 * What a step is still waiting for, or `null` when it is open.
 *
 * ONE function, and both the strip's `reachable` set and the footer's sentence are
 * built from it. They are the same fact asked two ways — *may I go there* and *why
 * not yet* — and a footer that worked out its own answer would be a second opinion
 * about what blocks a step. The two would drift the first time a gate moved, and
 * the drift would be invisible: the strip would unlock a step the footer still
 * refused, or worse, the other way round.
 */
type Missing = 'plot' | 'confirm' | 'run';

export interface FlowState {
  readonly plot: PlotView | null;
  readonly confirmed: boolean;
  readonly run: RunView | null;
}

function missingFor(id: StepId, state: FlowState): Missing | null {
  switch (id) {
    /* Step 0 is not gated — a plot whose sheet is not to hand is still a plot —
       and step 1 is where the flow begins, so neither ever waits for anything. */
    case 'intake':
    case 'plot':
      return null;
    case 'parameters':
      return state.plot ? null : 'plot';
    case 'rules':
      if (!state.plot) return 'plot';
      return state.confirmed ? null : 'confirm';
    /* Steps 5–9 are freely navigable ONCE THERE IS A RUN, and not before: each of
       them renders the run's own figures and has nothing to show without it. */
    default:
      return state.run ? null : 'run';
  }
}

/**
 * What the `?step=` banner has to say, kept as DATA and not as a sentence.
 *
 * It used to be stored as an English string, set once in an effect. A sentence in
 * state is a sentence in the language that was active when the effect ran — switch
 * to Arabic and the banner stays English until the address changes. The facts are
 * stored instead and the sentence is written at render, in whichever language is
 * current.
 */
export type StepHint =
  | { readonly kind: 'unknown'; readonly wanted: string }
  | { readonly kind: 'locked'; readonly step: StepId };

/**
 * An engine string, isolated on the Arabic page and untouched on the English one.
 *
 * A Latin run inside an Arabic sentence is reordered at its boundaries by the
 * bidirectional algorithm, so a trailing full stop or a bracketed citation lands at
 * the wrong end. `Verbatim` sets `dir="ltr" lang="en"`. On the English page the
 * document already is both, so the span would carry nothing — and this screen's
 * English rendering is held byte-identical to what it was before its copy moved.
 */
function useVerbatim(): (value: ReactNode) => ReactNode {
  const { locale } = useLocale();
  return (value) => (locale === 'ar' ? <Verbatim>{value}</Verbatim> : value);
}

/**
 * The figures inside sentences on this screen, each named once.
 *
 * They are not in the dictionary because no digit is. "within 1%" is the engine's
 * `withinOnePercent` flag, labelled; A3 is the paper the drawing set is composed
 * for; the model file is glTF 2.0 because that is what `@envelope/massing` writes.
 */
const WITHIN_THRESHOLD = '1%';
const DRAWING_SET_PAPER = 'A3';
const THREE_D = '3D';
const MODEL_FORMAT = 'glTF 2.0';
const LAYER_EXAMPLES = ['ENV-B1-BAY', 'ENV-B1-CAR'] as const;

export function EngineApp({
  navigate,
  actor,
  setActor,
  search,
}: {
  readonly navigate: (to: Href) => void;
  /**
   * The identity, owned by `Root` rather than by this screen.
   *
   * It used to be local state here, and `Root` kept its own copy for the
   * status page. Signing in on the engine therefore never reached the
   * dashboard, which asked for a name again on a browser that already had one
   * — two components each certain they owned the same fact. There is one
   * `useState` for the actor in this application and it is in `Root`.
   *
   * There is still no anonymous mode: every `USER_SET` value carries a name,
   * and a placeholder name would make the badge meaningless. In a real
   * deployment this comes from an identity provider — see
   * `apps/api/src/identity.ts` for why that is separate, unquoted work rather
   * than something absorbed here.
   */
  readonly actor: Actor | null;
  readonly setActor: (a: Actor | null) => void;
  /**
   * The live query string, passed in rather than read off `window`.
   *
   * This component mounts once and stays mounted behind the public pages, so a
   * `location.search` read on mount never re-runs: an in-app click from `/parking`
   * to `/app?step=parking` would land on whatever step was already open. An effect
   * keys on this instead.
   */
  readonly search: string;
}): JSX.Element {
  const t = useDict(EN, AR);
  const ltr = useVerbatim();

  const [step, setStep] = useState<StepId>('intake');
  const [stepHint, setStepHint] = useState<StepHint | null>(null);
  const [prefill, setPrefill] = useState<Prefill | null>(null);
  const [plot, setPlot] = useState<PlotView | null>(null);
  const [plotHash, setPlotHash] = useState<string | null>(null);
  const [run, setRun] = useState<RunView | null>(null);
  const [request, setRequest] = useState<RunRequestBody | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  const [gates, setGates] = useState<Record<string, boolean>>({});
  const [inspecting, setInspecting] = useState<{ nodeId: string; tree: ProvTree | null } | null>(
    null,
  );

  const flow: FlowState = { plot, confirmed: gates['G1_PLOT_CONFIRMED'] === true, run };

  const reachable = useMemo(
    () => new Set(STEPS.filter((s) => missingFor(s.id, flow) === null).map((s) => s.id)),
    /* eslint-disable-next-line react-hooks/exhaustive-deps -- `flow` is rebuilt every
       render from exactly these three, so depending on the object would defeat the memo. */
    [plot, run, gates],
  );

  /**
   * `?step=<id>` and `?demo=worked-example`.
   *
   * AN UNRECOGNISED STEP ID IS NOT SILENTLY IGNORED. Quietly serving a different
   * screen from the one the URL asked for is the defect the 404 exists to refuse,
   * and it does not stop being that inside the engine. So an unknown id opens the
   * earliest step and prints one line naming the steps that exist.
   *
   * A step that IS recognised but is not reachable yet opens at the earliest step
   * too, and says which prerequisite is missing — the client-side ordering is a
   * convenience and the server enforces it for real.
   *
   * The effect keys on `search`, not on mount: this component mounts once and stays
   * mounted behind the public pages, so a mount-time read would leave an in-app
   * click from `/parking` to `/app?step=parking` on whatever step was already open.
   */
  useEffect(() => {
    const params = new URLSearchParams(search);
    const wanted = params.get('step');
    if (!wanted) {
      setStepHint(null);
      return;
    }
    const known = STEPS.find((st) => st.id === wanted);
    if (!known) {
      setStep('intake');
      setStepHint({ kind: 'unknown', wanted });
      return;
    }
    if (!reachable.has(known.id)) {
      setStep('intake');
      setStepHint({ kind: 'locked', step: known.id });
      return;
    }
    setStepHint(null);
    setStep(known.id);
  }, [search, reachable]);

  const inspect = useCallback(
    async (nodeId: string) => {
      if (!actor || !run) return;
      setInspecting({ nodeId, tree: null });
      try {
        const tree = await api.provenance(actor, run.runId, nodeId);
        setInspecting({ nodeId, tree });
      } catch (e) {
        setInspecting(null);
        if (e instanceof ApiError) setError(e);
      }
    },
    [actor, run],
  );

  const acknowledge = useCallback(
    async (gate: string, subjectHash: string) => {
      if (!actor || !run) {
        setGates((g) => ({ ...g, [gate]: true }));
        return;
      }
      try {
        await api.acknowledgeGate(actor, run.runId, gate, subjectHash);
        setGates((g) => ({ ...g, [gate]: true }));
      } catch (e) {
        if (e instanceof ApiError) setError(e);
      }
    },
    [actor, run],
  );

  // `Root` renders the antechamber and does not mount this component without an
  // actor, so this is the impossible branch rather than a screen. It returns an
  // empty fragment rather than a prompt: a second name form, reachable only when the
  // shell has already decided there is no name, is a second place for "signed in" to
  // be decided — which is the defect that had the engine and the status page each
  // certain they owned the same fact.
  if (!actor) return <></>;

  /** The API's own sentence when it sent one; the fallback is ours. */
  const draftWarning = run?.warning ?? null;

  return (
    <div className="app">
      {/* No header and no <main> here. `SiteChrome` owns the single
          `<main id="main">` and this renders INTO it, because two elements with
          that id resolve the skip link to whichever comes first in the document —
          usually the hidden engine, which is a skip link that focuses nothing a
          sighted keyboard user can see. */}
      {stepHint ? <StepHintBanner hint={stepHint} /> : null}

      {error ? (
        <ErrorBanner error={error} onDismiss={() => setError(null)} />
      ) : null}

      {run?.draftRules ? (
        <div className="banner banner--danger" role="alert">
          <strong>{t.draft.title}</strong>{' '}
          {draftWarning === null ? t.draft.fallback : ltr(draftWarning)}
        </div>
      ) : null}

      {/*
        THE THREE COLUMNS §5.1 ASKS FOR: the steps as a rail, the canvas, and the
        provenance inspector — the last of which `.layout--with-panel` already
        owned, so this adds the first and nothing else moves.

        THE BANNERS ARE NOW ABOVE THE GRID RATHER THAN BETWEEN THE STEPPER AND THE
        CANVAS, which is the ordering fix the restructure made obvious: the error
        and the draft-rules warning are both `role="alert"`, and an alert placed
        after the navigation is an alert a screen reader reaches second. They span
        the full width, because a message about the run is not a property of the
        column it happened to sit in.

        THE RAIL IS A WIDE-WIDTH ARRANGEMENT ONLY. Below 64rem the stepper goes
        back to the horizontal scroller it has always been — which is tuned, which
        hides all but the current label on a phone, and which is the shape that
        passes `no screen scrolls sideways`. A vertical rail on a phone would
        spend a third of the viewport showing ten words.
      */}
      <div className="flow">
        <nav className="stepper" aria-label={t.steps.nav}>
          <ol>
            {STEPS.map((s, i) => {
              const available = reachable.has(s.id);
              const current = step === s.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`stepper__step${current ? ' is-current' : ''}${
                      available ? '' : ' is-locked'
                    }`}
                    onClick={() => available && setStep(s.id)}
                    disabled={!available}
                    aria-current={current ? 'step' : undefined}
                    title={available ? undefined : t.steps.locked}
                  >
                    <span className="stepper__num" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span className="stepper__label">{t.steps.labels[s.id]}</span>
                    {!available ? <span className="sr-only">{t.steps.lockedSr}</span> : null}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className={`layout${inspecting ? ' layout--with-panel' : ''}`}>
          <div className="layout__main">
            {step === 'intake' ? (
              <AffectionPlanIntake
                actor={actor}
                onUse={(p) => {
                  setPrefill(p);
                  setStep('plot');
                }}
                onSkip={() => setStep('plot')}
              />
            ) : null}

            {step === 'plot' ? (
              <PlotForm
                actor={actor}
                busy={busy}
                prefill={prefill}
                onCreated={(created, view) => {
                  setPlot(view);
                  setPlotHash(created.gateSubjectHash);
                  setStep('parameters');
                }}
                onError={setError}
                setBusy={setBusy}
              />
            ) : null}

            {step === 'parameters' && plot ? (
              <ParametersStep
                plot={plot}
                confirmed={gates['G1_PLOT_CONFIRMED'] === true}
                onConfirm={() => {
                  setGates((g) => ({ ...g, G1_PLOT_CONFIRMED: true }));
                  setStep('rules');
                }}
              />
            ) : null}

            {step === 'rules' && plot ? (
              <RulesStep
                actor={actor}
                plot={plot}
                sheetPodiumLevels={prefill?.podiumLevels ?? null}
                busy={busy}
                onRun={async (body) => {
                  setBusy(true);
                  setError(null);
                  try {
                    const result = await api.createRun(actor, body);
                    setRun(result);
                    setRequest(body);
                    setGates((g) => ({ ...g, G2_RULES_ACKNOWLEDGED: true }));
                    setStep('assumptions');
                  } catch (e) {
                    if (e instanceof ApiError) setError(e);
                  } finally {
                    setBusy(false);
                  }
                }}
                onError={setError}
              />
            ) : null}

            {step === 'assumptions' && run ? (
              <AssumptionRegister
                assumptions={run.assumptions}
                acknowledged={gates['G3_ASSUMPTIONS_ACKNOWLEDGED'] === true}
                onAcknowledge={() =>
                  acknowledge('G3_ASSUMPTIONS_ACKNOWLEDGED', hashOf(run.assumptions))
                }
                onEdit={async (parameterId, value) => {
                  if (!request) return;
                  // Editing an assumption re-runs the pipeline. §13.4 keeps the
                  // original run intact — this creates a new one rather than
                  // mutating what someone may already have exported.
                  const next = applyAssumptionEdit(request, parameterId, value);
                  setBusy(true);
                  try {
                    const result = await api.createRun(actor, next);
                    setRun(result);
                    setRequest(next);
                    setGates((g) => ({ ...g, G3_ASSUMPTIONS_ACKNOWLEDGED: false }));
                  } catch (e) {
                    if (e instanceof ApiError) setError(e);
                  } finally {
                    setBusy(false);
                  }
                }}
                onInspect={inspect}
              />
            ) : null}

            {step === 'capacity' && run ? (
              <>
                <ProvenanceLegend />
                {/*
                  The assumption under the governing figure, picked out of the run's
                  own register rather than rebuilt. `parking.bay_area_factor` is the
                  divisor in `floor(available area ÷ factor)`, and that quotient is
                  what fixes Band C — so when PARKING binds, this is the assumption
                  the headline number rests on. It is passed only then: on a run
                  governed by the regulatory or geometric band the factor is not what
                  bound the answer, and showing it beside the figure would be amber
                  spent on a parameter that did not decide anything.
                */}
                <CapacityBands
                  capacity={run.capacity}
                  onInspect={inspect}
                  governingAssumption={
                    run.capacity.governingBand === 'PARKING'
                      ? run.assumptions.find((a) => a.parameterId === 'parking.bay_area_factor')
                      : undefined
                  }
                />
                {plot ? (
                  <MassingPanel run={run} onInspect={inspect} />
                ) : null}
                <EnvelopePanel run={run} onInspect={inspect} />
              </>
            ) : null}

            {step === 'parking' && run ? (
              <ParkingStep run={run} plot={plot} onInspect={inspect} />
            ) : null}

            {step === 'checks' && run ? <ChecksStep run={run} /> : null}

            {step === 'evidence' && run && plot ? (
              <EvidenceStep run={run} plot={plot} onInspect={inspect} />
            ) : null}

            {step === 'export' && run ? (
              <ExportPanel
                actor={actor}
                run={run}
                gates={gates}
                onAcknowledge={acknowledge}
                onGoToAssumptions={() => setStep('assumptions')}
                onError={setError}
              />
            ) : null}

            {/* Below the step body, not above it: the way on is read after the step
                has been read, and a control that moves as the body grows is a control
                that is somewhere different on every step. */}
            <StepFooter step={step} flow={flow} onGo={setStep} />
          </div>

          {inspecting ? (
            <ProvenanceTree
              tree={inspecting.tree}
              loading={inspecting.tree === null}
              onClose={() => setInspecting(null)}
            />
          ) : null}
        </div>
      </div>

      {/* The permanent sentence is NOT repeated here. It was hand-copied in three
          files with nothing binding them, which is three places for a required
          disclosure to drift; `SiteChrome`'s colophon renders it once, from the one
          `DISCLAIMER` constant, on every route including this one. What is left is
          the build line, which is information rather than a claim. */}
      <p className="colophon__build">
        {t.build.engine}
        {run?.engineVersion !== undefined ? ltr(run.engineVersion) : t.build.unreported}
        {t.build.annex}{' '}
        {run?.annexVersion !== undefined ? ltr(run.annexVersion) : t.build.unsigned}
      </p>
    </div>
  );
}

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

// ---------------------------------------------------------------------------

/**
 * Light or dark, as a choice rather than an inheritance.
 *
 * The OS preference is not read. Both palettes are contrast-verified
 * (`pnpm contrast`), so dark is a supported option — but the default is the one
 * this artifact is for: a capacity study that gets printed, screenshotted into a
 * deck, and read across a table.
 */
export type Theme = 'light' | 'dark';

/** The three row heights `tokens.css` declares, by the names the attribute uses. */
export const DENSITIES = ['compact', 'comfortable', 'spacious'] as const;
export type Density = (typeof DENSITIES)[number];

/**
 * WHETHER THE WORKSPACE RAIL IS COLLAPSED TO ITS GLYPHS.
 *
 * Written as `data-sidebar-collapsed` on `<html>`, which the stylesheet reads to
 * set the grid column. The attribute is also set by the pre-paint script in
 * `index.html`, for the reason the theme is: a width applied after hydration
 * flashes wide and then narrow, and on a rail beside the content that flash moves
 * every word on the page.
 *
 * It is stored in the BROWSER, like the theme, the language and the density, and
 * `/settings` says so in those words. §6.4's rule is why: a preference that
 * claimed to follow an account would be the smallest possible version of a claim
 * this deployment cannot honour, since there is no tenancy.
 */
export function useSidebar(): [boolean, (v: boolean) => void] {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('envelope.sidebar') === 'collapsed';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (collapsed) root.setAttribute('data-sidebar-collapsed', '');
    else root.removeAttribute('data-sidebar-collapsed');
    try {
      localStorage.setItem('envelope.sidebar', collapsed ? 'collapsed' : 'expanded');
    } catch {
      /* blocked storage is not a reason to fail to render */
    }
  }, [collapsed]);

  return [collapsed, setCollapsed];
}

/**
 * THE READING DENSITY OF EVERY SCHEDULE IN THE PRODUCT.
 *
 * Written as `data-density` on `<html>`, which `tokens.css` turns into `--row-h`,
 * which every table row reads as a minimum. One owner, like the theme, and for
 * the same reason: `Root` holds it and passes it down, because three copies of
 * one fact desynchronised once already and the note on `useTheme` records what
 * that looked like.
 *
 * `comfortable` writes NO attribute rather than writing its own name. The
 * stylesheet declares comfortable as the default, so a document with no
 * preference and a document that chose comfortable render identically — and they
 * are one state in the reader's head, so they are one state in the markup.
 */
export function useDensity(): [Density, (d: Density) => void] {
  const [density, setDensity] = useState<Density>(() => {
    try {
      const saved = localStorage.getItem('envelope.density');
      return (DENSITIES as readonly string[]).includes(saved ?? '')
        ? (saved as Density)
        : 'comfortable';
    } catch {
      return 'comfortable';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (density === 'comfortable') root.removeAttribute('data-density');
    else root.setAttribute('data-density', density);
    try {
      localStorage.setItem('envelope.density', density);
    } catch {
      /* blocked storage is not a reason to fail to render */
    }
  }, [density]);

  return [density, setDensity];
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('envelope.theme');
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('envelope.theme', theme);
    } catch {
      /* blocked storage is not a reason to fail to render */
    }
  }, [theme]);

  return [theme, () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))];
}

/**
 * THE ACTOR BADGE, and nothing else.
 *
 * This used to be the whole application header: brand, strapline, a two-item route
 * nav and a theme toggle. All four now live in `SiteChrome`, which every route
 * renders through, so the engine and the public pages stop being two products that
 * happen to share a palette.
 *
 * `useTheme()` is GONE from here. There were three instances of it and they
 * desynchronised exactly as three copies of one fact do: toggling on `/dashboard`
 * left this one holding the old value, so its first click on `/app` set the theme to
 * what it already was and appeared to do nothing. `Root` owns the only one and
 * passes the control in as a child.
 *
 * `actor` widens to `Actor | null` because a signed-out reader now reaches pages
 * that use this chrome. Typed `Actor`, no signed-out page could have used it at all,
 * which is why there were two chromes.
 */
export function Header({
  actor,
  run,
  navigate,
  onSignOut,
  children,
}: {
  readonly actor: Actor | null;
  readonly run: RunView | null;
  readonly navigate: (to: Href) => void;
  readonly onSignOut: () => void;
  /** The theme toggle, owned by `Root`. */
  readonly children?: React.ReactNode;
}): JSX.Element {
  const t = useDict(EN, AR).header;
  return (
    <div className="shell app-header__meta">
      {run ? (
        <span className="chip" title={t.computedIn(String(run.elapsedMs))}>
          {t.elapsed(String(run.elapsedMs))}
        </span>
      ) : null}
      {actor ? <span className="badge-user">{actor.name}</span> : null}
      {children}
      {actor ? (
        <button type="button" className="button button--sm" onClick={onSignOut}>
          {t.change}
        </button>
      ) : null}
      {/* `navigate` is kept in the signature because the badge grows a link back to
          the run when the engine is open, and dropping the prop now would mean
          threading it back through `Root` later. */}
      <span hidden aria-hidden="true" data-navigate={typeof navigate} />
    </div>
  );
}

/*
  `ActorPrompt` MOVED to `screens/Antechamber.tsx` and is respecified as a public
  page. It is the first screen behind every public CTA, so it is site copy: it
  keeps the shared header, nav and colophon, it goes through the site's
  prohibitions test, and it says three things before it asks for anything — why
  the name is wanted, what the licence field does and does not do, and that this
  is not authentication. It was none of those as a bare form on a blank page.
*/

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

export function EnvelopePanel({
  run,
  onInspect,
}: {
  readonly run: RunView;
  readonly onInspect: (n: string) => void;
}): JSX.Element {
  const t = useDict(EN, AR).envelope;
  const ltr = useVerbatim();
  const e = run.envelope;
  return (
    <section className="panel" aria-labelledby="envelope-heading">
      <header className="panel__header">
        <div>
          <h2 id="envelope-heading" className="panel__title">
            {t.title}
          </h2>
          <p className="panel__subtitle">{t.subtitle}</p>
        </div>
      </header>

      <dl className="kv kv--grid">
        <div>
          <dt>{t.fields.setbackPermittedFootprint}</dt>
          <dd><TracedValue traced={e.setbackPermittedFootprint} onInspect={onInspect} /></dd>
        </div>
        <div>
          <dt>{t.fields.coverageCap}</dt>
          <dd><TracedValue traced={e.coverageCap} onInspect={onInspect} /></dd>
        </div>
        <div>
          <dt>{t.fields.podiumFootprint}</dt>
          <dd><TracedValue traced={e.podiumFootprint} onInspect={onInspect} /></dd>
        </div>
        <div>
          <dt>{t.fields.towerPlate}</dt>
          <dd><TracedValue traced={e.towerPlateCap} onInspect={onInspect} /></dd>
        </div>
        <div>
          <dt>{t.fields.heightCeiling}</dt>
          <dd><TracedValue traced={e.heightCeilingM} onInspect={onInspect} /></dd>
        </div>
        <div>
          <dt>{t.fields.levelsByHeight}</dt>
          <dd><TracedValue traced={e.maxLevelsByHeight} onInspect={onInspect} /></dd>
        </div>
      </dl>

      <h3 className="panel__section">{t.bindsTitle}</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">{t.columns.dimension}</th>
            <th scope="col">{t.columns.binding}</th>
            <th scope="col" className="data-table__num">{t.columns.value}</th>
            <th scope="col">{t.columns.nextClosest}</th>
          </tr>
        </thead>
        <tbody>
          {e.bindingConstraints.map((b) => (
            <tr key={b.dimension}>
              <th scope="row">
                {t.dimensions?.[b.dimension] ?? ltr(b.dimension.replace(/_/g, ' '))}
              </th>
              {/* The constraint's label, its rule and the runner-up's label are the
                  engine's, and are rendered as it wrote them. */}
              <td>
                {ltr(b.label)} <span className="muted">· {ltr(b.ruleId)}</span>
              </td>
              <td className="data-table__num value">{b.value}</td>
              <td>
                {b.runnerUp ? (
                  <>
                    {ltr(b.runnerUp.label)}
                    {t.runnerUpAt}
                    <span className="value">{b.runnerUp.value}</span>
                    {b.runnerUp.withinOnePercent ? (
                      <span className="chip chip--warn">{t.within(WITHIN_THRESHOLD)}</span>
                    ) : null}
                  </>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/*
        §11.7 step 6 requires the report to state how many iterations the
        applicability fixpoint took. On this product it is also the evidence that
        the setback circularity was solved rather than assumed away, so it is
        shown rather than logged.
      */}
      <details className="disclosure">
        <summary>{t.iterations(e.fixpoint.iterations, e.fixpoint.converged)}</summary>
        <p className="fine-print">{t.fixpointNote}</p>
        {/* Each note is the solver's own record of one pass. */}
        <ol className="iteration-log">
          {e.fixpoint.history.map((h) => (
            <li key={h.index}>{ltr(h.note)}</li>
          ))}
        </ol>
      </details>
    </section>
  );
}

/**
 * Step 6 — the demand panel, then the drawings or the engine's reason for having
 * none.
 *
 * Its own component, and exported, for one reason: the stepper opens on step 0
 * and a static render never reaches step 6, so the copy here was rendered by
 * nothing but a browser. Lifting it out changes no markup — a component boundary
 * is not an element — and lets `app-arabic.test.tsx` read both languages of it.
 */
export function ParkingStep({
  run,
  plot,
  onInspect,
}: {
  readonly run: RunView;
  readonly plot: PlotView | null;
  readonly onInspect: (n: string) => void;
}): JSX.Element {
  const t = useDict(EN, AR).parkingStep;
  const ltr = useVerbatim();
  return (
    <>
      <ParkingPanel run={run} onInspect={onInspect} />
      {run.levelPlan ? (
        <>
          <section className="panel" aria-labelledby="level-heading">
            <header className="panel__header">
              <div>
                <h2 id="level-heading" className="panel__title">
                  {t.drawingsTitle}
                </h2>
                <p className="panel__subtitle">{t.drawingsSubtitle}</p>
              </div>
            </header>
            {/* A run stored before the building model existed has no sheets;
                it keeps the level drawing it was computed with, below. */}
            {run.building ? (
              <>
                <DrawingSet run={run} onInspect={onInspect} />
                <h3 className="panel__subheading">{t.levelAsPacked}</h3>
              </>
            ) : null}
            <ParkingPlan
              levelPlan={run.levelPlan}
              plotVertices={plot?.vertices}
              onInspect={onInspect}
              figure={!run.building}
            />
          </section>
          <VehicleAccessPanel levelPlan={run.levelPlan} onInspect={onInspect} />
        </>
      ) : (
        <div className="banner banner--assumed" role="note">
          <div>
            <strong>{t.noLevelTitle}</strong>
            <p>
              {run.levelPlanRefusal !== null && run.levelPlanRefusal !== undefined
                ? ltr(run.levelPlanRefusal)
                : t.noReason}{' '}
              {t.noLevelTail}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export function ParkingPanel({
  run,
  onInspect,
}: {
  readonly run: RunView;
  readonly onInspect: (n: string) => void;
}): JSX.Element {
  const t = useDict(EN, AR).parking;
  const ltr = useVerbatim();
  const p = run.parking;
  const fits = Number(p.headroomBays) >= 0;
  return (
    <section className="panel" aria-labelledby="parking-heading">
      <header className="panel__header">
        <div>
          <h2 id="parking-heading" className="panel__title">
            {t.title}
          </h2>
          <p className="panel__subtitle">{t.subtitle}</p>
        </div>
      </header>

      <dl className="kv kv--grid">
        <div><dt>{t.fields.residentBays}</dt><dd><TracedValue traced={p.residentBays} onInspect={onInspect} /></dd></div>
        <div><dt>{t.fields.visitorBays}</dt><dd><TracedValue traced={p.visitorBays} onInspect={onInspect} /></dd></div>
        <div><dt>{t.fields.totalBays}</dt><dd><TracedValue traced={p.totalBays} onInspect={onInspect} /></dd></div>
        <div><dt>{t.fields.areaPerBay}</dt><dd><TracedValue traced={p.bayAreaFactorM2} onInspect={onInspect} /></dd></div>
        <div><dt>{t.fields.areaRequired}</dt><dd><TracedValue traced={p.requiredAreaM2} onInspect={onInspect} /></dd></div>
        <div><dt>{t.fields.levelsRequired}</dt><dd><TracedValue traced={p.levelsRequired} onInspect={onInspect} /></dd></div>
        <div><dt>{t.fields.levelsAvailable}</dt><dd><TracedValue traced={p.levelsAvailable} onInspect={onInspect} /></dd></div>
        <div>
          <dt>{t.fields.unitsCarried}</dt>
          <dd><TracedValue traced={p.supportableUnitCeiling} onInspect={onInspect} /></dd>
        </div>
      </dl>

      {/* The engine's sentence about what the supply means for the podium. */}
      <p className={`callout ${fits ? 'callout--ok' : 'callout--warn'}`}>
        {ltr(p.podiumImplication)}
      </p>
    </section>
  );
}

/** What the export step holds once the report has been prepared. */
export interface ExportDoneState {
  readonly result: ExportResult;
  readonly html: string;
  readonly sheets: string | null;
}

export function ExportPanel({
  actor,
  run,
  gates,
  onAcknowledge,
  onGoToAssumptions,
  onError,
}: {
  readonly actor: Actor;
  readonly run: RunView;
  readonly gates: Record<string, boolean>;
  readonly onAcknowledge: (gate: string, hash: string) => void;
  readonly onGoToAssumptions: () => void;
  readonly onError: (e: ApiError) => void;
}): JSX.Element {
  const t = useDict(EN, AR).export;
  const [done, setDone] = useState<ExportDoneState | null>(null);
  const [busy, setBusy] = useState(false);
  const canSign = Boolean(actor.licence);
  const ready =
    Boolean(gates['G3_ASSUMPTIONS_ACKNOWLEDGED']) && Boolean(gates['G4_REVIEWER_NAMED']);

  return (
    <section className="panel" aria-labelledby="export-heading">
      <header className="panel__header">
        <div>
          <h2 id="export-heading" className="panel__title">
            {t.title}
          </h2>
          <p className="panel__subtitle">{t.subtitle}</p>
        </div>
      </header>

      <ol className="gate-list">
        <li className={gates['G3_ASSUMPTIONS_ACKNOWLEDGED'] ? 'is-done' : undefined}>
          <span className="gate-list__glyph" aria-hidden="true">
            {gates['G3_ASSUMPTIONS_ACKNOWLEDGED'] ? '✓' : '○'}
          </span>
          <div>
            <strong>{t.assumptionsRead}</strong>
            <p>{t.assumptionCount(run.assumptions.length)}</p>
            {/*
              Acknowledged on the register, not here. §20.2 makes the register
              "the moment the user understands this is not magic", and a tick box on
              the export screen would let someone accept a list they never opened.
              What this screen owes them is the way back — an unactionable circle on
              a checklist is a dead end, and that is what it was.
            */}
            {!gates['G3_ASSUMPTIONS_ACKNOWLEDGED'] ? (
              <button type="button" className="link-button" onClick={onGoToAssumptions}>
                {t.readThem}
              </button>
            ) : null}
          </div>
        </li>
        <li className={gates['G4_REVIEWER_NAMED'] ? 'is-done' : undefined}>
          <span className="gate-list__glyph" aria-hidden="true">
            {gates['G4_REVIEWER_NAMED'] ? '✓' : '○'}
          </span>
          <div>
            <strong>{t.signedBy}</strong>
            <p>
              {canSign ? (
                <>
                  {t.reviewerBefore}
                  <PersonName name={actor.name} />
                  {t.reviewerAfter}
                </>
              ) : (
                t.noLicence
              )}
            </p>
            {!gates['G4_REVIEWER_NAMED'] && canSign ? (
              <button
                type="button"
                className="button"
                onClick={() => onAcknowledge('G4_REVIEWER_NAMED', hashOf(run.capacity))}
              >
                {t.sign}
              </button>
            ) : null}
          </div>
        </li>
      </ol>

      <div className="actions">
        <button
          type="button"
          className="button button--primary"
          disabled={!ready || busy}
          onClick={async () => {
            setBusy(true);
            try {
              // The drawing set only when the run has a model to draw; a run stored
              // before it existed would be refused, and that refusal is not a
              // reason to withhold the report.
              const [result, html, sheets] = await Promise.all([
                api.exportRun(actor, run.runId),
                api.exportRunHtml(actor, run.runId),
                run.building ? api.exportRunHtml(actor, run.runId, 'sheets') : Promise.resolve(null),
              ]);
              setDone({ result, html, sheets });
            } catch (e) {
              if (e instanceof ApiError) onError(e);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? t.preparing : t.exportReport}
        </button>
        {!ready ? <p className="fine-print">{t.notReady}</p> : null}
      </div>

      {done ? <ExportDone actor={actor} run={run} done={done} onError={onError} /> : null}
    </section>
  );
}

/**
 * The name a person typed, isolated on the Arabic page.
 *
 * Not `Verbatim`: a name is not an engine string and need not be English, so it
 * gets no `lang`. It gets `<bdi>` — its direction is its own, and a Latin name at
 * the edge of an Arabic sentence would otherwise carry the full stop with it.
 */
function PersonName({ name }: { readonly name: string }): JSX.Element {
  const { locale } = useLocale();
  return locale === 'ar' ? <bdi>{name}</bdi> : <>{name}</>;
}

/**
 * The export step after the report has been prepared: the fixed run, its two
 * fingerprints and every file behind the same two gates.
 *
 * Its own component, and exported, because it renders only after a click — so the
 * copy in it was rendered by nothing but a browser. Lifting it out changes no
 * markup, and `useSheets` moves with it: the sheet list is read only where it is
 * shown.
 */
export function ExportDone({
  actor,
  run,
  done,
  onError,
}: {
  readonly actor: Actor;
  readonly run: RunView;
  readonly done: ExportDoneState;
  readonly onError: (e: ApiError) => void;
}): JSX.Element {
  const t = useDict(EN, AR).export;
  const ltr = useVerbatim();
  const sheets = useSheets(run);

  return (
    <>
      <div className="callout callout--ok">
        <p>
          {t.fixedBefore}
          <code>{run.runId.slice(0, 8)}</code>
          {t.fixedAfter}
        </p>
      </div>

      {/*
        Two artifacts, and two fingerprints beside them.

        §3.4 item 9 promises a report and a JSON export; a screen that said
        "export prepared" and handed over neither had promised and not
        delivered. The fingerprints are printed rather than hidden because
        §13.4's guarantee is only worth something if a reader can check it —
        one covers the question that was asked, the other the answer that came
        back.
      */}
      <dl className="kv">
        <div>
          <dt>{t.runFingerprint}</dt>
          <dd>
            <code>{done.result.fingerprint}</code>
            <span className="muted">{t.runFingerprintNote}</span>
          </dd>
        </div>
        <div>
          <dt>{t.reportFingerprint}</dt>
          <dd>
            <code>{done.result.reportFingerprint.digest.slice(0, 16)}…</code>
            <span className="muted">
              {' '}
              {t.reportFingerprintBefore}
              {ltr(done.result.reportFingerprint.algorithm)}
              {t.reportFingerprintAfter}
            </span>
          </dd>
        </div>
      </dl>

      {done.result.annexNotice ? (
        <div className="banner banner--danger" role="alert">
          <div>
            <strong>{t.annexTitle}</strong>
            <p>{ltr(done.result.annexNotice)}</p>
          </div>
        </div>
      ) : null}

      <div className="actions actions--row">
        <button
          type="button"
          className="button"
          onClick={() => openDocument(done.html, 'text/html')}
        >
          {t.openReport}
        </button>
        {done.sheets ? (
          <button
            type="button"
            className="button"
            onClick={() => openDocument(done.sheets!, 'text/html')}
          >
            {t.openDrawingSet(DRAWING_SET_PAPER)}
          </button>
        ) : null}
        <button
          type="button"
          className="button"
          onClick={() =>
            openDocument(JSON.stringify(done.result.document, null, 2), 'application/json')
          }
        >
          {t.openJson}
        </button>
        {/*
          CAD and Excel, behind the same two gates as the report.

          The client asked for both by name. The temptation is to treat a
          drawing as a lesser artifact that can skip the acknowledgement; it
          is the opposite — a DXF is the output most likely to be x-reffed
          into a submission set and read by someone who never saw the
          assumption register, so it is gated identically and it carries the
          disclaimer inside the file.

          Downloaded rather than opened in a tab: neither format renders in a
          browser, and a tab of binary is a broken feature.
        */}
        <button
          type="button"
          className="button"
          onClick={() => void download(actor, run.runId, 'dxf', onError)}
        >
          {t.downloadDxf}
        </button>
        {run.building ? (
          <button
            type="button"
            className="button"
            onClick={() => void download(actor, run.runId, 'glb', onError)}
          >
            {t.downloadModel(THREE_D)}
          </button>
        ) : null}
        <button
          type="button"
          className="button"
          onClick={() => void download(actor, run.runId, 'xlsx', onError)}
        >
          {t.downloadXlsx}
        </button>
      </div>

      <p className="fine-print">
        {t.cad.lead(THREE_D)}
        <code>{LAYER_EXAMPLES[0]}</code>
        {t.cad.between}
        <code>{LAYER_EXAMPLES[1]}</code>
        {t.cad.afterLayers}
        <strong>{t.cad.not}</strong>
        {t.cad.tail}
      </p>
      {run.building ? (
        <p className="fine-print">
          {t.glb.lead(THREE_D)}
          <code>.glb</code>
          {t.glb.tail(THREE_D, MODEL_FORMAT)}
        </p>
      ) : null}

      {/*
        One sheet at a time, behind the same two gates as the whole building.
        A consultant who needs level B2 should not have to take the building
        apart to get it, and a sheet downloaded alone is exactly the sheet on
        screen — flat, framed and titled, at true size in metres.
      */}
      {sheets.length > 0 ? (
        <>
          <h3 className="panel__subheading">{t.oneSheet}</h3>
          <ul className="sheet-downloads">
            {sheets.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => void download(actor, run.runId, 'dxf', onError, s)}
                >
                  {t.sheetBefore}
                  {ltr(s.number)}
                  {t.sheetBetween}
                  {ltr(s.title)}
                  {t.sheetAfter}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}

/**
 * Save a binary export.
 *
 * A real download, unlike `openDocument`: a DXF opened in a tab is a wall of
 * group codes and an XLSX is a zip, and both read as a broken feature. The
 * filename comes from the run id so two runs of one plot do not overwrite each
 * other in the Downloads folder — which they did, and the second one silently
 * won.
 */
async function download(
  actor: Actor,
  runId: string,
  format: 'dxf' | 'xlsx' | 'glb',
  onError: (e: ApiError) => void,
  sheet?: { readonly id: string; readonly number: string },
): Promise<void> {
  try {
    const blob = await api.exportRunFile(actor, runId, format, sheet?.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `envelope-${runId.slice(0, 8)}${sheet ? `-${sheet.number}` : ''}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    if (e instanceof ApiError) onError(e);
  }
}

/**
 * Hand the browser a document the server produced.
 *
 * A new tab rather than a download, because the report is meant to be *read*
 * before it is filed — and a file that lands in Downloads unopened is how a
 * claim statement goes unread. The object URL is revoked after a minute; the
 * tab keeps its own copy.
 */
function openDocument(text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  window.open(url, '_blank', 'noopener');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ---------------------------------------------------------------------------


function applyAssumptionEdit(
  body: RunRequestBody,
  parameterId: string,
  value: string,
): RunRequestBody {
  switch (parameterId) {
    case 'parking.usable_fraction':
      return { ...body, parkingUsableFraction: { ...body.parkingUsableFraction, value } };
    case 'capacity.user_realism_discount':
      return { ...body, realismDiscount: value };
    default:
      // An assumption the client does not know how to feed back is left alone
      // rather than silently ignored — the register will still show it, and the
      // gap is visible instead of looking like an edit that did nothing.
      return body;
  }
}
