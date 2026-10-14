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
 *
 * THIS FILE IS THE FLOW'S STATE AND NOTHING ELSE (October 2026). It was 1,534
 * lines; the step table, the footer and banners, the envelope, parking and export
 * panels and the assumption edit now live in `engine/`, one concern a file. What
 * stays here is what only the flow knows: which step is open, the plot, the run,
 * the gates, and the address that names them.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  api,
  ApiError,
  type Actor,
  type PlotView,
  type RunRequestBody,
  type RunView,
  type SheetReport,
} from './api/client.js';
import { AssumptionRegister } from './components/AssumptionRegister.js';
import { CapacityBands } from './components/CapacityBands.js';
import { GfaStatement } from './components/GfaStatement.js';
import { MassingPanel } from './components/MassingPanel.js';
import { PlotLimits } from './components/PlotLimits.js';
import { ProvenanceTree, type ProvTree } from './components/ProvenanceTree.js';
import { ProvenanceLegend } from './components/TracedValue.js';
import { WorkspaceInspector } from './components/WorkspaceInspector.js';
import { demoFrom, type Demo } from './demo.js';
import { applyAssumptionEdit } from './engine/assumptionEdit.js';
import { EnvelopePanel } from './engine/EnvelopePanel.js';
import { ExportPanel } from './engine/ExportPanel.js';
import { ParkingStep } from './engine/ParkingStep.js';
import { ErrorBanner, StepFooter, StepHintBanner } from './engine/StepChrome.js';
import { StepFacts } from './engine/StepFacts.js';
import { missingFor, STEPS, type FlowState, type StepHint, type StepId } from './engine/steps.js';
import { useVerbatim } from './engine/verbatim.js';
import { hashOf } from './gateHash.js';
import { AR } from './i18n/app.ar.js';
import { EN } from './i18n/app.en.js';
import { useDict } from './i18n/locale.js';
import type { Navigate } from './router.js';
import { AffectionPlanIntake, type Prefill } from './screens/AffectionPlanIntake.js';
import { ChecksStep } from './screens/ChecksStep.js';
import { EvidenceStep } from './screens/EvidenceStep.js';
import { ParametersStep } from './screens/ParametersStep.js';
import { PlotForm, type PlotDraftFacts } from './screens/PlotForm.js';
import { RulesStep } from './screens/RulesStep.js';

export type { FlowState, StepHint } from './engine/steps.js';

export function EngineApp({
  navigate,
  actor,
  setActor,
  search,
}: {
  readonly navigate: Navigate;
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
  const [demo, setDemo] = useState<Demo | null>(null);
  const [plot, setPlot] = useState<PlotView | null>(null);
  const [plotHash, setPlotHash] = useState<string | null>(null);
  /*
    WHAT THE PLOT'S OWN SHEET DID, KEPT FROM THE MOMENT THE PLOT WAS MADE.

    The server reads the affection plan when the plot is created and reports what
    it bound and what it did not. That report belongs on the rules step, which is
    where limits are chosen — so it is held here rather than re-fetched, because
    the endpoint that produced it is a POST and re-running it would create a
    second plot.
  */
  const [sheet, setSheet] = useState<SheetReport | null>(null);
  /* The plot while it is being drawn, for the inspector. Never sent anywhere and
     never mistaken for `plot`: the inspector labels it a draft. */
  const [draftPlot, setDraftPlot] = useState<PlotDraftFacts | null>(null);
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
   * Open a step, and put it in the address bar.
   *
   * ---------------------------------------------------------------------------
   * THE URL IS THE STEP, AND IT USED TO BE READ-ONLY.
   *
   * `?step=` was read on arrival and never written. So the flow had an address
   * that was right for exactly one moment — the click that entered it — and
   * silently wrong from the next step onward. Three things follow from that, and
   * all three were live:
   *
   *   BACK LEFT THE FLOW. Nine steps in, the browser's back button went to
   *   whatever page preceded `/app`, because nine step changes had written no
   *   history at all. There is no way to read that as anything but losing the
   *   work, and it is the one thing `router.tsx` already says a single-page app
   *   may not do.
   *
   *   A RELOAD WENT BACK TO THE START, with the address still naming the step it
   *   was not showing. Copying that address and sending it to a colleague sent
   *   them somewhere else again.
   *
   *   AND THE EFFECT BELOW COULD YANK THE READER BACKWARDS. It depends on
   *   `reachable`, which grows the moment a run returns — so with the address
   *   still saying `?step=rules`, finishing the run re-ran the effect and set the
   *   step back to `rules` under a reader who had just been moved to
   *   `assumptions`. Writing the URL on every move closes that by construction:
   *   the two can no longer disagree, so there is nothing for the effect to
   *   correct.
   *
   * `navigate` skips the history entry when the address is already the one being
   * asked for, so this is safe to call with the step that is already open.
   */
  const goto = useCallback(
    (id: StepId): void => {
      setStep(id);
      setStepHint(null);
      navigate(`/app?step=${id}`);
    },
    [navigate],
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

  /**
   * `?demo=worked-example`, which until now was read by nobody.
   *
   * ---------------------------------------------------------------------------
   * IT LOADS ONCE AND THE QUERY IS SPENT.
   *
   * The demo is an instruction, not a place: it fills the worked example into the
   * plot form and the rules step and moves the reader to the plot. Once that has
   * happened the address should name where they are, so the move REPLACES the
   * history entry rather than pushing one. Pushed, Back would return to the
   * instruction and run it again — a Back button that re-deals the same hand is
   * worse than one that does nothing.
   *
   * IT OPENS AT THE PLOT, NOT AT THE SHEET. Step 0 reads an affection plan; the
   * worked example is not one and there is no PDF to hand. Opening there would
   * put an empty file-drop in front of somebody who came to see a plot run.
   *
   * IT NEVER OVERWRITES A PLOT THAT EXISTS. `plot === null` is the guard: a reader
   * who has already entered their own plot and then pastes a demo link keeps their
   * work, because the alternative is a URL that silently discards it.
   */
  useEffect(() => {
    const wanted = demoFrom(search);
    if (wanted === null || demo !== null || plot !== null) return;
    setDemo(wanted);
    setStep('plot');
    setStepHint(null);
    navigate('/app?step=plot', { replace: true });
  }, [search, demo, plot, navigate]);

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
        THE DEMO SAYS SO, AND KEEPS SAYING SO UNTIL THE RUN EXISTS.

        A form that arrives filled in, with no statement of who filled it, is the
        same defect as a number with no provenance — and this one fills in a plot
        number, a shape, four edge classifications, a parking treatment, a level
        count, an efficiency and a unit mix. `role="note"` rather than `alert`:
        nothing is wrong, and an assertive announcement would interrupt the reader
        to tell them the page did what their click asked for.

        It goes once the run exists, because from the capacity step on, what is on
        screen is the engine's output and the banner would be describing the
        provenance of an input nobody is looking at any more.
      */}
      {/* A PLAIN BANNER, WITH NO STATE MODIFIER, AND THAT IS THE POINT. The three
          that exist are danger, blocked and assumed; amber in particular belongs
          to ASSUMED alone (§13.1). Nothing here is uncertain or wrong — it is a
          neutral statement of where these values came from — so it takes the
          neutral band rather than borrowing a colour that already means something
          else on this screen. */}
      {demo && !run ? (
        <div className="banner" role="note">
          <div>
            <strong>{t.demo.title}</strong>
            <p>{t.demo.body}</p>
            <p className="fine-print">{t.demo.reproduces}</p>
          </div>
        </div>
      ) : null}

      {/*
        THE WORKSPACE, OCTOBER 2026 (direction-2026-10.md §3): a step bar across
        the top, the step's drawing and controls in the middle, and the answer in
        a column beside them that stays put while the middle scrolls.

        The column used to exist only while a value was being inspected, so on
        nine screens out of ten a reader working on the plot or the parking level
        had nothing beside the work telling them what it was for. It is always
        there now, and the derivation still opens in it.

        What the column says changes with the step — `StepFacts` puts the three
        bands beside the building, and the bays and the three losses beside the
        parking level — so the middle can open on the drawing itself.

        THE BANNERS STAY ABOVE THE GRID: the error and the draft-rules warning are
        both `role="alert"`, and an alert placed after the navigation is one a
        screen reader reaches second.
      */}
      <div className="ws">
        <nav className="stepper ws__steps" aria-label={t.steps.nav}>
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
                    onClick={() => available && goto(s.id)}
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

        <div className="ws__body">
          <div className="ws__canvas">
            {/*
              No step primer. 6 Oct 2026, in his words: «وشيل كل الشرح فى كل
              الخطوات عاوز الاستخدام فقط». Not one of the ten lines it rendered
              carried a claim, a refusal, a provenance class or a limit — the claim
              statement is on `/`, the refusals on `/refusals`, every ASSUMED value
              still says ASSUMED on the value, and REGULATORY VALIDITY: NOT
              ASSESSED is in the masthead. `StepPrimer.tsx` and both dictionaries
              are kept, whole and tested, so the decision can be reversed.
            */}

            {step === 'intake' ? (
              <AffectionPlanIntake
                actor={actor}
                onUse={(p) => {
                  setPrefill(p);
                  goto('plot');
                }}
                onSkip={() => goto('plot')}
              />
            ) : null}

            {step === 'plot' ? (
              <PlotForm
                actor={actor}
                busy={busy}
                prefill={prefill}
                demo={demo?.plot ?? null}
                onCreated={(created, view) => {
                  setPlot(view);
                  setPlotHash(created.gateSubjectHash);
                  setSheet(created.sheet);
                  goto('parameters');
                }}
                onError={setError}
                setBusy={setBusy}
                onDraft={setDraftPlot}
              />
            ) : null}

            {step === 'parameters' && plot ? (
              <ParametersStep
                plot={plot}
                confirmed={gates['G1_PLOT_CONFIRMED'] === true}
                onConfirm={() => {
                  setGates((g) => ({ ...g, G1_PLOT_CONFIRMED: true }));
                  goto('rules');
                }}
              />
            ) : null}

            {step === 'rules' && plot && sheet ? <PlotLimits sheet={sheet} /> : null}

            {step === 'rules' && plot ? (
              <RulesStep
                actor={actor}
                plot={plot}
                sheetPodiumLevels={prefill?.podiumLevels ?? null}
                demo={demo?.run ?? null}
                busy={busy}
                onRun={async (body) => {
                  setBusy(true);
                  setError(null);
                  try {
                    const result = await api.createRun(actor, body);
                    setRun(result);
                    setRequest(body);
                    setGates((g) => ({ ...g, G2_RULES_ACKNOWLEDGED: true }));
                    goto('assumptions');
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
                  THE BUILDING FIRST (October 2026). The three bands are in the
                  inspector beside it now, so the middle opens on what was
                  computed rather than on a table of what bounds it. The bands'
                  own panel stays below — it carries the binding constraint, the
                  explanation and the governing assumption, which the inspector's
                  three lines do not.
                */}
                {plot ? (
                  <MassingPanel run={run} onInspect={inspect} />
                ) : null}
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
                {run.gfaStatement ? (
                  <GfaStatement statement={run.gfaStatement} onInspect={inspect} />
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
                onGoToAssumptions={() => goto('assumptions')}
                onError={setError}
              />
            ) : null}

            {/* Below the step body, not above it: the way on is read after the step
                has been read, and a control that moves as the body grows is a control
                that is somewhere different on every step. */}
            <StepFooter step={step} flow={flow} onGo={goto} />
          </div>

          <WorkspaceInspector
            plot={plot}
            run={run}
            gates={gates}
            onInspect={inspect}
            onOpenAssumptions={() => goto('assumptions')}
            draft={draftPlot}
            stepFacts={<StepFacts step={step} run={run} onInspect={inspect} />}
          >
            {inspecting ? (
              <ProvenanceTree
                tree={inspecting.tree}
                loading={inspecting.tree === null}
                onClose={() => setInspecting(null)}
              />
            ) : null}
          </WorkspaceInspector>
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
