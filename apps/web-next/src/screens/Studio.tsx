import { useQueryClient } from '@tanstack/react-query';
import { Box, Check, ClipboardCheck, FileDown, Layers, MapPinned, ScrollText } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';

import {
  type Actor,
  api,
  ApiError,
  type ParkingComparison,
  type PlotCreated,
  type PlotView,
  type RunRequestBody,
  type RunView,
} from '@web/api/client.js';

import { DerivationDrawer } from '../components/Derivation.js';
import { TopBar } from '../components/Shell.js';
import { InspectProvider } from '../components/Traced.js';
import { cn } from '../lib/cn.js';
import { useLocale } from '../lib/locale.js';
import { useNav } from '../lib/nav.js';
import { Notice, Spinner } from '../ui/primitives.js';
import { CapacityCanvas, CapacityPanel } from '../studio/CapacityStep.js';
import { ChecksCanvas, ChecksPanel } from '../studio/ChecksStep.js';
import { ExportPanel } from '../studio/ExportStep.js';
import {
  type DraftPlot,
  EMPTY_PLOT,
  EMPTY_RULES,
  exampleStudy,
  recalledRequest,
  rememberRequest,
  requestBody,
  type RulesForm,
  rulesFrom,
} from '../studio/model.js';
import { ParkingCanvas, ParkingPanel } from '../studio/ParkingStep.js';
import { PlotCanvas, PlotPanel } from '../studio/PlotStep.js';
import { RulesPanel } from '../studio/RulesStep.js';

/*
  THE STUDIO: A CANVAS IN THE MIDDLE, THE STEPS ON ONE SIDE, THE FIGURES ON THE OTHER.

  The drawing is the hero — the plot, the building in 3D, the parking sheets —
  and the panels around it are dense and quiet. On an Arabic page the whole
  frame mirrors: steps on the right, inspector on the left. The drawing does not
  mirror, because north does not move with the language.

  The steps are the engine's own order and they gate the same way: no rules
  before a filed plot, no capacity before a run.
*/

export type StepId = 'plot' | 'rules' | 'capacity' | 'parking' | 'checks' | 'export';
const STEPS: readonly { id: StepId; icon: typeof Box }[] = [
  { id: 'plot', icon: MapPinned },
  { id: 'rules', icon: ScrollText },
  { id: 'capacity', icon: Box },
  { id: 'parking', icon: Layers },
  { id: 'checks', icon: ClipboardCheck },
  { id: 'export', icon: FileDown },
];

export function Studio({ actor }: { readonly actor: Actor }): JSX.Element {
  const { t } = useLocale();
  const { runId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNav();
  const queries = useQueryClient();
  const reduce = useReducedMotion();

  const [draft, setDraft] = useState<DraftPlot>(EMPTY_PLOT);
  const [created, setCreated] = useState<PlotCreated | null>(null);
  const [plot, setPlot] = useState<PlotView | null>(null);
  const [rules, setRules] = useState<RulesForm>(EMPTY_RULES);
  const [request, setRequest] = useState<RunRequestBody | null>(null);
  const [run, setRun] = useState<RunView | null>(null);
  const [step, setStep] = useState<StepId>('plot');
  const [busy, setBusy] = useState<'plot' | 'run' | 'load' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [node, setNode] = useState<string | null>(null);
  const [comparison, setComparison] = useState<ParkingComparison | null>(null);

  // The worked example, on request: the plot and the answers the landing page describes.
  useEffect(() => {
    if (runId || params.get('example') !== '1') return;
    const ex = exampleStudy();
    setDraft(ex.plot);
    setRules(ex.rules);
  }, [runId, params]);

  // A stored run, opened by its address.
  useEffect(() => {
    if (!runId || run?.runId === runId) return;
    let live = true;
    setBusy('load');
    setError(null);
    (async () => {
      try {
        const loaded = await api.getRun(actor, runId);
        const view = await api.getPlot(actor, loaded.plot.plotId);
        if (!live) return;
        setRun(loaded);
        setPlot(view);
        setDraft({
          plotNumber: view.plotNumber,
          community: view.community,
          vertices: view.vertices,
          edges: view.edges.map((e) => ({ classification: e.classification, roadHierarchy: (e.roadHierarchy ?? '') as DraftPlot['edges'][number]['roadHierarchy'] })),
        });
        const body = recalledRequest(runId);
        setRequest(body);
        if (body) setRules(rulesFrom(body));
        setStep((s) => (s === 'plot' || s === 'rules' ? 'capacity' : s));
      } catch (e) {
        if (live) setError(e instanceof ApiError ? e.message : t.studio.loadFailed);
      } finally {
        if (live) setBusy(null);
      }
    })();
    return () => {
      live = false;
    };
  }, [runId, actor, run?.runId, t]);

  const plotId = plot?.plotId ?? created?.plotId ?? null;

  const fileplot = useCallback(async () => {
    setBusy('plot');
    setError(null);
    try {
      const made = await api.createPlot(actor, {
        plotNumber: draft.plotNumber.trim(),
        community: draft.community.trim(),
        landUse: 'RESIDENTIAL_MULTI',
        vertices: draft.vertices.map((v) => ({ x: v.x.trim(), y: v.y.trim() })),
        edges: draft.edges.map((e, seq) => ({
          seq,
          classification: e.classification,
          ...(e.classification === 'ROAD' && e.roadHierarchy ? { roadHierarchy: e.roadHierarchy } : {}),
        })),
      });
      const view = await api.getPlot(actor, made.plotId);
      setCreated(made);
      setPlot(view);
      setRun(null);
      setRequest(null);
      setStep('rules');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t.studio.plotFailed);
    } finally {
      setBusy(null);
    }
  }, [actor, draft, t]);

  const compute = useCallback(
    async (body: RunRequestBody) => {
      setBusy('run');
      setError(null);
      try {
        const result = await api.createRun(actor, body);
        rememberRequest(result.runId, body);
        setRequest(body);
        setRun(result);
        setStep((s) => (s === 'rules' ? 'capacity' : s));
        void queries.invalidateQueries({ queryKey: ['runs'] });
        navigate(`/studio/${result.runId}`, { replace: true });
      } catch (e) {
        setError(e instanceof ApiError ? e.message : t.studio.runFailed);
      } finally {
        setBusy(null);
      }
    },
    [actor, navigate, queries, t],
  );

  const compare = useCallback(
    async (body: RunRequestBody) => {
      setBusy('run');
      setError(null);
      try {
        setComparison(await api.compareParkingInFar(actor, body));
      } catch (e) {
        setError(e instanceof ApiError ? e.message : t.studio.runFailed);
      } finally {
        setBusy(null);
      }
    },
    [actor, t],
  );

  const refresh = useCallback(async () => {
    if (!run) return;
    setRun(await api.getRun(actor, run.runId));
  }, [actor, run]);

  const editPlot = (next: DraftPlot): void => {
    setDraft(next);
    // A plot the engine already filed is not this plot any more.
    if (created || plot) {
      setCreated(null);
      setPlot(null);
      setRun(null);
      setRequest(null);
      if (runId) navigate('/studio', { replace: true });
    }
  };

  const reachable: Record<StepId, boolean> = {
    plot: true,
    rules: plotId !== null,
    capacity: run !== null,
    parking: run !== null,
    checks: run !== null,
    export: run !== null,
  };
  const done: Record<StepId, boolean> = {
    plot: plotId !== null,
    rules: run !== null,
    capacity: run !== null,
    parking: run?.levelPlan != null,
    checks: run?.checks.invariants.passed === true,
    export: Boolean(run?.gates?.['G3_ASSUMPTIONS_ACKNOWLEDGED'] && run?.gates?.['G4_REVIEWER_NAMED']),
  };

  const canvas: ReactNode = useMemo(() => {
    if (busy === 'load') {
      return (
        <p className="flex h-full items-center justify-center gap-2 text-secondary">
          <Spinner /> {t.studio.loading}
        </p>
      );
    }
    switch (step) {
      case 'plot':
      case 'rules':
        return <PlotCanvas draft={draft} plot={plot} />;
      case 'capacity':
        return run ? <CapacityCanvas run={run} /> : null;
      case 'parking':
        return run ? <ParkingCanvas run={run} /> : null;
      case 'checks':
        return run ? <ChecksCanvas run={run} /> : null;
      case 'export':
        return run ? <ParkingCanvas run={run} initialKind="SITE" /> : null;
    }
  }, [busy, step, draft, plot, run, t]);

  return (
    <InspectProvider value={run ? setNode : null}>
      <div className="flex h-dvh flex-col bg-base">
        <TopBar>
          <div className="ms-3 hidden min-w-0 items-center gap-2 border-s border-line ps-3 md:flex">
            <span className="figure truncate text-[13px] text-fg">{draft.plotNumber || t.studio.untitled}</span>
            {draft.community ? <span className="truncate text-[12.5px] text-secondary">· {draft.community}</span> : null}
            {run?.draftRules ? (
              <span className="rounded-sm border border-line px-1.5 py-px text-[10.5px] text-secondary">{t.studio.draftRules}</span>
            ) : null}
          </div>
        </TopBar>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[208px_minmax(0,1fr)_400px] xl:grid-cols-[220px_minmax(0,1fr)_440px]">
          {/* ── Steps ── */}
          <nav aria-label={t.studio.steps} className="border-b border-line bg-panel lg:border-e lg:border-b-0">
            <ol className="flex gap-1 overflow-x-auto p-2 lg:grid lg:gap-0.5 lg:overflow-visible lg:p-3">
              {STEPS.map((s, i) => {
                const active = step === s.id;
                const can = reachable[s.id];
                return (
                  <li key={s.id} className="shrink-0">
                    <button
                      type="button"
                      disabled={!can}
                      onClick={() => setStep(s.id)}
                      aria-current={active ? 'step' : undefined}
                      className={cn(
                        'relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-start text-[13px] transition-colors duration-150',
                        active ? 'bg-raised text-fg' : 'text-secondary hover:bg-hover hover:text-fg',
                        'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
                      )}
                    >
                      {active ? (
                        <motion.span
                          layoutId="step-marker"
                          className="absolute inset-y-1.5 start-0 w-0.5 rounded-full bg-accent"
                          transition={{ duration: reduce ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
                          aria-hidden="true"
                        />
                      ) : null}
                      <span
                        className={cn(
                          'grid size-6 shrink-0 place-items-center rounded-md border text-[11px]',
                          // Accent, not green: green says DERIVED, and a finished step is not a provenance class.
                          done[s.id] ? 'border-accent/50 bg-accent-subtle text-accent-strong' : active ? 'border-accent/60 text-accent-strong' : 'border-line',
                        )}
                      >
                        {done[s.id] ? <Check className="size-3.5" aria-hidden="true" /> : <s.icon className="size-3.5" aria-hidden="true" />}
                      </span>
                      <span className="min-w-0">
                        <span className="figure me-1.5 text-[10.5px] text-tertiary">{i + 1}</span>
                        {t.studio.step[s.id]}
                        {done[s.id] ? <span className="sr-only"> ({t.studio.stepDone})</span> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="not-assessed hidden px-5 pt-3 text-[11.5px] leading-relaxed text-tertiary lg:block">{t.stamp.long}</p>
          </nav>

          {/* ── Canvas ── */}
          <main className="canvas-grid relative min-h-[46vh] overflow-hidden lg:min-h-0" aria-label={t.studio.canvas}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                className="absolute inset-0"
                initial={reduce ? false : { opacity: 0.4, scale: 0.995 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? {} : { opacity: 0.4 }}
                transition={{ duration: 0.18 }}
              >
                {canvas}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* ── Inspector ── */}
          <aside aria-label={t.studio.inspector} className="min-h-0 overflow-y-auto border-t border-line bg-panel lg:border-s lg:border-t-0">
            <motion.div
              // Each step's panel rises into place; it is never faded, so nothing in it is ever unread.
              key={step}
              initial={reduce ? false : { y: 12 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
            {error ? (
              <div className="p-4 pb-0">
                <Notice title={t.studio.refused}>{error}</Notice>
              </div>
            ) : null}
            {step === 'plot' ? (
              <PlotPanel draft={draft} onChange={editPlot} created={created} plot={plot} busy={busy === 'plot'} onFile={fileplot} onNext={() => setStep('rules')} />
            ) : step === 'rules' && plotId ? (
              <RulesPanel
                form={rules}
                onChange={setRules}
                busy={busy === 'run'}
                onCompute={() => void compute(requestBody(plotId, rules))}
                onCompare={() => void compare(requestBody(plotId, rules))}
                comparison={comparison}
                hasRun={run !== null}
              />
            ) : step === 'capacity' && run ? (
              <CapacityPanel run={run} />
            ) : step === 'parking' && run ? (
              <ParkingPanel
                run={run}
                busy={busy === 'run'}
                canChoose={request !== null}
                onChoose={(seq) => {
                  if (!request) return;
                  // The same request, with only the entrance changed — or the choice taken back.
                  const { chosenAccessEdgeSeq: _previous, ...rest } = request;
                  void compute(seq === null ? rest : { ...rest, chosenAccessEdgeSeq: seq });
                }}
              />
            ) : step === 'checks' && run ? (
              <ChecksPanel run={run} />
            ) : step === 'export' && run ? (
              <ExportPanel actor={actor} run={run} onSigned={refresh} />
            ) : null}
            </motion.div>
          </aside>
        </div>
      </div>
      {run ? <DerivationDrawer actor={actor} runId={run.runId} nodeId={node} onClose={() => setNode(null)} /> : null}
    </InspectProvider>
  );
}
