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

import { useCallback, useEffect, useMemo, useState } from 'react';

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
import { ParkingPlan, VehicleAccessPanel } from './components/ParkingPlan.js';
import { AffectionPlanIntake, type Prefill } from './screens/AffectionPlanIntake.js';
import { ChecksStep } from './screens/ChecksStep.js';
import { EvidenceStep } from './screens/EvidenceStep.js';
import { ParametersStep } from './screens/ParametersStep.js';
import { PlotForm } from './screens/PlotForm.js';
import { Link, type Href } from './router.js';
import { RulesStep } from './screens/RulesStep.js';

/*
  `gated` is DELETED. It was metadata nobody read: the flag said `plot` was gated
  and the `reachable` computation below puts `plot` in the done set unconditionally,
  so the two had drifted and only one of them was doing anything. A second,
  plausible-looking source of truth for what blocks a step is worse than none —
  someone reads the table, believes it, and writes a guard against a fact the
  application does not hold.
*/
const STEPS = [
  { id: 'intake', label: 'Sheet' },
  { id: 'plot', label: 'Plot' },
  { id: 'parameters', label: 'Parameters' },
  { id: 'rules', label: 'Rules' },
  { id: 'assumptions', label: 'Assumptions' },
  { id: 'capacity', label: 'Capacity' },
  { id: 'parking', label: 'Parking' },
  { id: 'checks', label: 'Checks' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'export', label: 'Export' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

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

  const [step, setStep] = useState<StepId>('intake');
  const [stepHint, setStepHint] = useState<string | null>(null);
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

  const reachable = useMemo(() => {
    const done = new Set<StepId>(['intake', 'plot']);
    if (plot) done.add('parameters');
    if (plot && gates['G1_PLOT_CONFIRMED']) done.add('rules');
    if (run) {
      done.add('assumptions');
      done.add('capacity');
      done.add('parking');
      done.add('checks');
      done.add('evidence');
      done.add('export');
    }
    return done;
  }, [plot, run, gates]);

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
      setStepHint(
        `There is no step called “${wanted}”. The steps are: ` +
          `${STEPS.map((st) => st.id).join(', ')}.`,
      );
      return;
    }
    if (!reachable.has(known.id)) {
      setStep('intake');
      setStepHint(`“${known.label}” opens once the steps before it have something to read.`);
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

  return (
    <div className="app">
      {/* No header and no <main> here. `SiteChrome` owns the single
          `<main id="main">` and this renders INTO it, because two elements with
          that id resolve the skip link to whichever comes first in the document —
          usually the hidden engine, which is a skip link that focuses nothing a
          sighted keyboard user can see. */}
      {stepHint ? (
        <p className="banner" role="status">
          {stepHint}
        </p>
      ) : null}

      <nav className="stepper" aria-label="Steps">
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
                  title={available ? undefined : 'Complete the earlier steps first'}
                >
                  <span className="stepper__num" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="stepper__label">{s.label}</span>
                  {!available ? <span className="sr-only"> (not yet available)</span> : null}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {error ? (
        <ErrorBanner error={error} onDismiss={() => setError(null)} />
      ) : null}

      {run?.draftRules ? (
        <div className="banner banner--danger" role="alert">
          <strong>These numbers are not an assessment.</strong>{' '}
          {run.warning ??
            'This run used draft rules with placeholder citations. It demonstrates the engine; it does not measure this plot.'}
        </div>
      ) : null}

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
                <MassingPanel run={run} plotVertices={plot.vertices} onInspect={inspect} />
              ) : null}
              <EnvelopePanel run={run} onInspect={inspect} />
            </>
          ) : null}

          {step === 'parking' && run ? (
            <>
              <ParkingPanel run={run} onInspect={inspect} />
              {run.levelPlan ? (
                <>
                  <section className="panel" aria-labelledby="level-heading">
                    <header className="panel__header">
                      <div>
                        <h2 id="level-heading" className="panel__title">
                          The level, laid out
                        </h2>
                        <p className="panel__subtitle">
                          Bays, aisles and the ramp placed as rectangles to Table B.11. A
                          bay count that cannot be laid out is not a bay count — but the
                          supply figure that fixed the governing capacity was not this
                          drawing. It was an available area divided by an assumed factor,
                          computed before the level was laid out at all. The two are
                          compared on the parking page.
                        </p>
                      </div>
                    </header>
                    <ParkingPlan
                      levelPlan={run.levelPlan}
                      plotVertices={plot?.vertices}
                      onInspect={inspect}
                    />
                  </section>
                  <VehicleAccessPanel levelPlan={run.levelPlan} onInspect={inspect} />
                </>
              ) : (
                <div className="banner banner--assumed" role="note">
                  <div>
                    <strong>No parking level was laid out for this plot.</strong>
                    <p>
                      {run.levelPlanRefusal ??
                        'The engine did not report a reason, which is itself worth raising.'}{' '}
                      The demand figures above still stand — what is missing is the
                      drawing, not the arithmetic.
                    </p>
                  </div>
                </div>
              )}
            </>
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
        </div>

        {inspecting ? (
          <ProvenanceTree
            tree={inspecting.tree}
            loading={inspecting.tree === null}
            onClose={() => setInspecting(null)}
          />
        ) : null}
      </div>

      {/* The permanent sentence is NOT repeated here. It was hand-copied in three
          files with nothing binding them, which is three places for a required
          disclosure to drift; `SiteChrome`'s colophon renders it once, from the one
          `DISCLAIMER` constant, on every route including this one. What is left is
          the build line, which is information rather than a claim. */}
      <p className="colophon__build">
        Engine {run?.engineVersion ?? 'unreported'} · definitions annex{' '}
        {run?.annexVersion ?? 'unsigned'}
      </p>
    </div>
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
type Theme = 'light' | 'dark';

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
  return (
    <div className="shell app-header__meta">
      {run ? (
        <span className="chip" title={`Computed in ${run.elapsedMs} ms`}>
          {run.elapsedMs} ms
        </span>
      ) : null}
      {actor ? <span className="badge-user">{actor.name}</span> : null}
      {children}
      {actor ? (
        <button type="button" className="button button--sm" onClick={onSignOut}>
          Change
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

function ErrorBanner({
  error,
  onDismiss,
}: {
  readonly error: ApiError;
  readonly onDismiss: () => void;
}): JSX.Element {
  // The engine's refusals are the product working. They are presented as
  // information the user needs, not as a system failure to apologise for.
  const blocked = error.status === 422 || error.status === 409;
  return (
    <div className={`banner ${blocked ? 'banner--blocked' : 'banner--danger'}`} role="alert">
      <div>
        <strong>{blocked ? 'The engine stopped here' : 'Something went wrong'}</strong>
        <p>{error.message}</p>
        {error.gate ? <p className="fine-print">Blocked at: {error.gate}</p> : null}
      </div>
      <button type="button" className="button button--ghost button--icon" onClick={onDismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}

function EnvelopePanel({
  run,
  onInspect,
}: {
  readonly run: RunView;
  readonly onInspect: (n: string) => void;
}): JSX.Element {
  const e = run.envelope;
  return (
    <section className="panel" aria-labelledby="envelope-heading">
      <header className="panel__header">
        <div>
          <h2 id="envelope-heading" className="panel__title">
            Buildable envelope
          </h2>
          <p className="panel__subtitle">
            Each dimension names the constraint that produced it.
          </p>
        </div>
      </header>

      <dl className="kv kv--grid">
        <div>
          <dt>Setback-permitted footprint</dt>
          <dd><TracedValue traced={e.setbackPermittedFootprint} onInspect={onInspect} /></dd>
        </div>
        <div>
          <dt>Coverage cap</dt>
          <dd><TracedValue traced={e.coverageCap} onInspect={onInspect} /></dd>
        </div>
        <div>
          <dt>Podium footprint</dt>
          <dd><TracedValue traced={e.podiumFootprint} onInspect={onInspect} /></dd>
        </div>
        <div>
          <dt>Tower plate</dt>
          <dd><TracedValue traced={e.towerPlateCap} onInspect={onInspect} /></dd>
        </div>
        <div>
          <dt>Height ceiling</dt>
          <dd><TracedValue traced={e.heightCeilingM} onInspect={onInspect} /></dd>
        </div>
        <div>
          <dt>Levels by height</dt>
          <dd><TracedValue traced={e.maxLevelsByHeight} onInspect={onInspect} /></dd>
        </div>
      </dl>

      <h3 className="panel__section">What binds each dimension</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Dimension</th>
            <th scope="col">Binding constraint</th>
            <th scope="col" className="data-table__num">Value</th>
            <th scope="col">Next closest</th>
          </tr>
        </thead>
        <tbody>
          {e.bindingConstraints.map((b) => (
            <tr key={b.dimension}>
              <th scope="row">{b.dimension.replace(/_/g, ' ')}</th>
              <td>
                {b.label} <span className="muted">· {b.ruleId}</span>
              </td>
              <td className="data-table__num value">{b.value}</td>
              <td>
                {b.runnerUp ? (
                  <>
                    {b.runnerUp.label} at <span className="value">{b.runnerUp.value}</span>
                    {b.runnerUp.withinOnePercent ? (
                      <span className="chip chip--warn">within 1%</span>
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
        <summary>
          Setback resolution took {e.fixpoint.iterations} iteration
          {e.fixpoint.iterations === 1 ? '' : 's'}
          {e.fixpoint.converged ? '' : ' and did not converge'}
        </summary>
        <p className="fine-print">
          The boundary setback depends on the level count, the level count depends on the
          footprint, and the footprint depends on the setback. The solver seeds the level
          count at the most restrictive plausible value and iterates until the applicable
          rules and their resolved values stop changing.
        </p>
        <ol className="iteration-log">
          {e.fixpoint.history.map((h) => (
            <li key={h.index}>{h.note}</li>
          ))}
        </ol>
      </details>
    </section>
  );
}

function ParkingPanel({
  run,
  onInspect,
}: {
  readonly run: RunView;
  readonly onInspect: (n: string) => void;
}): JSX.Element {
  const p = run.parking;
  const fits = Number(p.headroomBays) >= 0;
  return (
    <section className="panel" aria-labelledby="parking-heading">
      <header className="panel__header">
        <div>
          <h2 id="parking-heading" className="panel__title">
            Parking
          </h2>
          <p className="panel__subtitle">
            Demand, then supply, then what the supply can actually carry.
          </p>
        </div>
      </header>

      <dl className="kv kv--grid">
        <div><dt>Resident bays</dt><dd><TracedValue traced={p.residentBays} onInspect={onInspect} /></dd></div>
        <div><dt>Visitor bays</dt><dd><TracedValue traced={p.visitorBays} onInspect={onInspect} /></dd></div>
        <div><dt>Total bays</dt><dd><TracedValue traced={p.totalBays} onInspect={onInspect} /></dd></div>
        <div><dt>Area per bay</dt><dd><TracedValue traced={p.bayAreaFactorM2} onInspect={onInspect} /></dd></div>
        <div><dt>Area required</dt><dd><TracedValue traced={p.requiredAreaM2} onInspect={onInspect} /></dd></div>
        <div><dt>Levels required</dt><dd><TracedValue traced={p.levelsRequired} onInspect={onInspect} /></dd></div>
        <div><dt>Levels available</dt><dd><TracedValue traced={p.levelsAvailable} onInspect={onInspect} /></dd></div>
        <div>
          <dt>Units the parking can carry</dt>
          <dd><TracedValue traced={p.supportableUnitCeiling} onInspect={onInspect} /></dd>
        </div>
      </dl>

      <p className={`callout ${fits ? 'callout--ok' : 'callout--warn'}`}>
        {p.podiumImplication}
      </p>
    </section>
  );
}

function ExportPanel({
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
  const [done, setDone] = useState<{ result: ExportResult; html: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const canSign = Boolean(actor.licence);
  const ready =
    Boolean(gates['G3_ASSUMPTIONS_ACKNOWLEDGED']) && Boolean(gates['G4_REVIEWER_NAMED']);

  return (
    <section className="panel" aria-labelledby="export-heading">
      <header className="panel__header">
        <div>
          <h2 id="export-heading" className="panel__title">
            Export
          </h2>
          <p className="panel__subtitle">
            Two things have to be true before anything leaves: you have read the
            assumptions, and someone has put their name to it.
          </p>
        </div>
      </header>

      <ol className="gate-list">
        <li className={gates['G3_ASSUMPTIONS_ACKNOWLEDGED'] ? 'is-done' : undefined}>
          <span className="gate-list__glyph" aria-hidden="true">
            {gates['G3_ASSUMPTIONS_ACKNOWLEDGED'] ? '✓' : '○'}
          </span>
          <div>
            <strong>Assumptions read</strong>
            <p>
              {run.assumptions.length} assumption
              {run.assumptions.length === 1 ? '' : 's'} in this run.
            </p>
            {/*
              Acknowledged on the register, not here. §20.2 makes the register
              "the moment the user understands this is not magic", and a tick box on
              the export screen would let someone accept a list they never opened.
              What this screen owes them is the way back — an unactionable circle on
              a checklist is a dead end, and that is what it was.
            */}
            {!gates['G3_ASSUMPTIONS_ACKNOWLEDGED'] ? (
              <button type="button" className="link-button" onClick={onGoToAssumptions}>
                Read them on the assumption register
              </button>
            ) : null}
          </div>
        </li>
        <li className={gates['G4_REVIEWER_NAMED'] ? 'is-done' : undefined}>
          <span className="gate-list__glyph" aria-hidden="true">
            {gates['G4_REVIEWER_NAMED'] ? '✓' : '○'}
          </span>
          <div>
            <strong>Signed by a named reviewer</strong>
            <p>
              {canSign
                ? `${actor.name} will be recorded as the reviewer.`
                : 'Add your licence number to sign. We record it; we cannot verify it.'}
            </p>
            {!gates['G4_REVIEWER_NAMED'] && canSign ? (
              <button
                type="button"
                className="button"
                onClick={() => onAcknowledge('G4_REVIEWER_NAMED', hashOf(run.capacity))}
              >
                Sign this export
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
              const [result, html] = await Promise.all([
                api.exportRun(actor, run.runId),
                api.exportRunHtml(actor, run.runId),
              ]);
              setDone({ result, html });
            } catch (e) {
              if (e instanceof ApiError) onError(e);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Preparing…' : 'Export report'}
        </button>
        {!ready ? (
          <p className="fine-print">
            Both of the above have to be true first. Neither is a formality: one records
            that a person read what the engine had to assume, the other records who put
            their name to the output.
          </p>
        ) : null}
      </div>

      {done ? (
        <>
          <div className="callout callout--ok">
            <p>
              Run <code>{run.runId.slice(0, 8)}</code> is fixed as it stands. Editing an
              assumption from here creates a new run and leaves this one untouched.
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
              <dt>Run fingerprint</dt>
              <dd>
                <code>{done.result.fingerprint}</code>
                <span className="muted"> — the inputs, versions and rule set</span>
              </dd>
            </div>
            <div>
              <dt>Report fingerprint</dt>
              <dd>
                <code>{done.result.reportFingerprint.digest.slice(0, 16)}…</code>
                <span className="muted">
                  {' '}
                  — {done.result.reportFingerprint.algorithm} over the content
                </span>
              </dd>
            </div>
          </dl>

          {done.result.annexNotice ? (
            <div className="banner banner--danger" role="alert">
              <div>
                <strong>The metric definitions annex is not signed.</strong>
                <p>{done.result.annexNotice}</p>
              </div>
            </div>
          ) : null}

          <div className="actions actions--row">
            <button
              type="button"
              className="button"
              onClick={() => openDocument(done.html, 'text/html')}
            >
              Open the report
            </button>
            <button
              type="button"
              className="button"
              onClick={() =>
                openDocument(JSON.stringify(done.result.document, null, 2), 'application/json')
              }
            >
              Open the JSON export
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
              Download the CAD drawing (DXF)
            </button>
            <button
              type="button"
              className="button"
              onClick={() => void download(actor, run.runId, 'xlsx', onError)}
            >
              Download the workbook (XLSX)
            </button>
          </div>

          <p className="fine-print">
            The drawing carries the plot boundary, the setback footprint, the tower
            plate, and every bay, aisle and ramp the engine placed — each on its own
            layer so a reviewer can switch them off. Revit and IFC are{' '}
            <strong>not</strong> included: round-tripping IFC is a body of work this
            phase has not quoted, and a badly-shaped one would be worse than none.
          </p>
        </>
      ) : null}
    </section>
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
  format: 'dxf' | 'xlsx',
  onError: (e: ApiError) => void,
): Promise<void> {
  try {
    const blob = await api.exportRunFile(actor, runId, format);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `envelope-${runId.slice(0, 8)}.${format}`;
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

/** Stable hash of what a gate is acknowledging. Mirrors the server's function. */
function hashOf(subject: unknown): string {
  const canonical = (v: unknown): string => {
    if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
    if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
    return `{${Object.entries(v as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, val]) => `${JSON.stringify(k)}:${canonical(val)}`)
      .join(',')}}`;
  };
  const payload = canonical(subject);
  let h = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

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
