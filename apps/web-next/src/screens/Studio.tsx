import { useQueryClient } from '@tanstack/react-query';
import { Box, Check, ClipboardCheck, FileDown, FileText, Layers, MapPinned, ScrollText } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';

import { legBetween } from '@web/geo.js';

import {
  type Actor,
  api,
  ApiError,
  encodeAttachment,
  type PlotCreated,
  type PlotView,
  type RunRequestBody,
  type RunView,
} from '@web/api/client.js';

import { DerivationDrawer } from '../components/Derivation.js';
import type { MapTrace } from '../components/PlotMapView.js';
import { onPageOf, type SheetUnderlay, underlayRegion } from '../components/sheet-underlay.js';
import { TopBar } from '../components/Shell.js';
import { InspectProvider } from '../components/Traced.js';
import { cn } from '../lib/cn.js';
import { useLocale } from '../lib/locale.js';
import { useNav } from '../lib/nav.js';
import { toneAt } from '../ui/tile.js';
import { CapacityCanvas, CapacityPanel } from '../studio/CapacityStep.js';
import { ChecksCanvas, ChecksPanel } from '../studio/ChecksStep.js';
import { ComputingMark } from '../studio/ComputingMark.js';
import { ExportPanel } from '../studio/ExportStep.js';
import {
  type DraftPlot,
  EMPTY_PLOT,
  EMPTY_RULES,
  exampleStudy,
  plotIdentity,
  recalledRequest,
  rememberRequest,
  requestBody,
  type RulesForm,
  rulesFrom,
  typedSetbacksOf,
} from '../studio/model.js';
import { fetchRoadsBeside, type RoadBeside } from '../studio/edge-suggest.js';
import { pointsToDraft, pointsToRing, ringToDraft } from '../studio/geometry.js';
import { ParkingCanvas, ParkingPanel, type VehicleAccessBody } from '../studio/ParkingStep.js';
import { PlotCanvas, PlotPanel, type PlotViewMode } from '../studio/PlotStep.js';
import { AdvisorProvider } from '../studio/AdvisorBox.js';
import { RefusalNotice } from '../studio/RefusalNotice.js';
import { RulesPanel } from '../studio/RulesStep.js';
import { SHEET_MAX_BYTES, SheetCanvas, SheetPanel, type SheetState } from '../studio/SheetStep.js';

/*
  THE STUDIO: A CANVAS IN THE MIDDLE, THE STEPS ON ONE SIDE, THE FIGURES ON THE OTHER.

  The drawing is the hero — the plot, the building in 3D, the parking sheets —
  and the panels around it are dense and quiet. On an Arabic page the whole
  frame mirrors: steps on the right, inspector on the left. The drawing does not
  mirror, because north does not move with the language.

  The steps are the engine's own order and they gate the same way: no rules
  before a filed plot, no capacity before a run.
*/

export type StepId = 'sheet' | 'plot' | 'rules' | 'capacity' | 'parking' | 'checks' | 'export';
const STEPS: readonly { id: StepId; icon: typeof Box }[] = [
  { id: 'sheet', icon: FileText },
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
  // The vehicle entrance the reader placed on the plan, sent with the run; null lets the engine recommend one.
  const [entrance, setEntrance] = useState<VehicleAccessBody | null>(null);
  // A new study opens on the affection plan; the worked example and a stored run already have a plot.
  const [step, setStep] = useState<StepId>(() => (runId || params.get('example') === '1' ? 'plot' : 'sheet'));
  const [busy, setBusy] = useState<'plot' | 'run' | 'load' | 'sheet' | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The run request the engine refused, so a fix its sentence names can resend it changed.
  const [refusedBody, setRefusedBody] = useState<RunRequestBody | null>(null);
  // The run `compute` is navigating to, so the address catching up is not read as a request to open another.
  const navigatingTo = useRef<string | null>(null);
  const [node, setNode] = useState<string | null>(null);

  // Step 0: the sheet as read, and whether the reader chose to use it for this study.
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [sheetUsed, setSheetUsed] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [statedArea, setStatedArea] = useState('');
  const [trace, setTrace] = useState<MapTrace>({ ring: [], closed: false });
  const [plotView, setPlotView] = useState<PlotViewMode>(() => (runId || params.get('example') === '1' ? 'plan' : 'map'));

  /*
    The road beside each boundary, once the plot stands on the map — the second
    witness for each boundary's class (see `edge-suggest.ts`). Asked only while
    the closed trace IS the corner table: same number of sides, and every side
    within half a metre of the table's own length. A trace the reader is still
    drawing, or one the table has since been edited away from, would hang a
    road on the wrong boundary.
  */
  const [mapRoads, setMapRoads] = useState<readonly RoadBeside[] | null>(null);
  const traceIsTable = useMemo(() => {
    if (!trace.closed || trace.ring.length < 3 || trace.ring.length !== draft.vertices.length) return false;
    const v = draft.vertices.map((p) => ({ x: Number(p.x), y: Number(p.y) }));
    return trace.ring.every((p, i) => {
      const a = v[i]!;
      const b = v[(i + 1) % v.length]!;
      const table = Math.hypot(b.x - a.x, b.y - a.y);
      return Number.isFinite(table) && Math.abs(legBetween(p, trace.ring[(i + 1) % trace.ring.length]!).lengthM - table) <= 0.5;
    });
  }, [trace, draft.vertices]);
  useEffect(() => {
    if (!traceIsTable || plot) {
      setMapRoads(null);
      return;
    }
    let live = true;
    void fetchRoadsBeside(trace.ring).then((roads) => {
      if (live) setMapRoads(roads);
    });
    return () => {
      live = false;
    };
  }, [traceIsTable, trace.ring, plot]);

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
    /*
      A run just computed here is in state one render before its address is:
      without this, the old address read as "open the old run", the load began,
      the navigation cancelled it, and the canvas sat on "opening the study" for
      good — on every recompute from inside a run (an option picked, an entrance moved).
    */
    if (run && run.runId === navigatingTo.current) return;
    let live = true;
    setBusy('load');
    setError(null);
    setRefusedBody(null);
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
        setEntrance(body?.vehicleAccess ?? null);
        if (body) setRules(rulesFrom(body));
        setStep((s) => (s === 'sheet' || s === 'plot' || s === 'rules' ? 'capacity' : s));
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
    setRefusedBody(null);
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
        ...(statedArea.trim() ? { statedAreaM2: statedArea.trim() } : {}),
        /* The PDF, not the numbers off it: the server reads the sheet again and its
           limits bind the run with citations into a document it opened itself. */
        ...(sheet && sheetUsed ? { affectionPlan: sheet.attachment } : {}),
      });
      const view = await api.getPlot(actor, made.plotId);
      setCreated(made);
      setPlot(view);
      setRun(null);
      setRequest(null);
      setEntrance(null);
      setStep('rules');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t.studio.plotFailed);
    } finally {
      setBusy(null);
    }
  }, [actor, draft, statedArea, sheet, sheetUsed, t]);

  const readSheet = useCallback(
    async (file: File) => {
      setSheetError(null);
      if (file.size > SHEET_MAX_BYTES) {
        setSheetError(t.sheet.tooLarge(file.name, (file.size / 1024 / 1024).toFixed(1)));
        return;
      }
      setBusy('sheet');
      try {
        const attachment = await encodeAttachment(file);
        const read = await api.readAffectionPlan(actor, attachment);
        setSheet({ read, attachment });
        setSheetUsed(false);
      } catch (e) {
        setSheetError(e instanceof ApiError ? e.message : t.sheet.failed);
      } finally {
        setBusy(null);
      }
    },
    [actor, t],
  );

  const compute = useCallback(
    async (body: RunRequestBody) => {
      setBusy('run');
      setError(null);
      setRefusedBody(null);
      try {
        const result = await api.createRun(actor, body);
        rememberRequest(result.runId, body);
        setRequest(body);
        setEntrance(body.vehicleAccess ?? null);
        setRun(result);
        setStep((s) => (s === 'rules' ? 'capacity' : s));
        void queries.invalidateQueries({ queryKey: ['runs'] });
        navigatingTo.current = result.runId;
        navigate(`/studio/${result.runId}`, { replace: true });
      } catch (e) {
        setError(e instanceof ApiError ? e.message : t.studio.runFailed);
        setRefusedBody(body);
      } finally {
        setBusy(null);
      }
    },
    [actor, navigate, queries, t],
  );

  const refresh = useCallback(async () => {
    if (!run) return;
    setRun(await api.getRun(actor, run.runId));
  }, [actor, run]);

  // A plot the engine already filed is not this plot any more once anything it was filed with changes.
  const unfile = (): void => {
    if (created || plot) {
      setCreated(null);
      setPlot(null);
      setRun(null);
      setRequest(null);
      setEntrance(null);
      if (runId) navigate('/studio', { replace: true });
    }
  };
  const editPlot = (next: DraftPlot): void => {
    setDraft(next);
    // A typed tower setback is sent with the run, not filed with the plot: changing one keeps the plot.
    if (plotIdentity(next) !== plotIdentity(draft)) unfile();
  };
  const editStatedArea = (next: string): void => {
    setStatedArea(next);
    unfile();
  };

  const applySheet = (): void => {
    if (!sheet) return;
    const f = sheet.read.facts;
    // What the sheet prints, filled in where it prints it; a field it does not print keeps what the reader typed.
    const named: DraftPlot = {
      ...draft,
      plotNumber: f.parcelId?.value ?? draft.plotNumber,
      community: f.community?.value ?? draft.community,
    };
    /*
      The corners too, when the sheet gives them exactly: a coordinate table, or
      the Municipality's drawing on its own grid — both DERIVED, both already
      checked against the printed area before the server sent them. "Use this
      sheet" is the reader's act of taking it, and the facts it takes are on the
      screen beside the button. A shape fitted to a picture (ASSUMED) is still
      offered on the plot step on a button of its own.
    */
    const ring = f.survey ?? f.drawn;
    editPlot((ring ? pointsToDraft(ring.points.value, named) : null) ?? named);
    // And where it is: placed on the map from the sheet's grid, so the reader sees the plot on the ground.
    const placed = ring ? pointsToRing(ring.points.value, ring.system.value) : null;
    if (placed) {
      setTrace({ ring: placed, closed: true, fromSheet: true });
      setPlotView('map');
    }
    if (f.totalAreaSqm) setStatedArea(f.totalAreaSqm.value);
    // The podium count G+2P+8 prints, offered in the rules form where it can be read and changed.
    if (f.height && rules.podiumAboveGround === '') setRules({ ...rules, podiumAboveGround: String(f.height.value.podiumLevels) });
    setSheetUsed(true);
    setStep('plot');
  };
  const clearSheet = (): void => {
    setSheet(null);
    setSheetError(null);
    if (trace.fromSheet) setTrace({ ring: [], closed: false });
    if (sheetUsed) {
      setSheetUsed(false);
      unfile();
    }
  };
  const applyTrace = (traced: MapTrace): void => {
    // With the trace's lineage, so a boundary the map split or merged keeps the class the table gave it.
    editPlot(ringToDraft(traced.ring, draft, traced.lineage));
    // Back to the plan: the boundaries are numbered there, and each still needs classifying.
    setPlotView('plan');
  };

  /*
    The affection plan under the map: the issued PDF itself, drawn in this
    browser, and the part of its first page that is the plan — the intake's
    picture only when it read the plot out of it, otherwise the page. Held in a
    memo so a re-render is not a new sheet to draw.
  */
  const sheetUnderlay = useMemo<SheetUnderlay | null>(() => {
    if (!sheet || !sheetUsed) return null;
    const onPage = onPageOf(sheet.read.facts);
    return { pdfBase64: sheet.attachment.content, region: underlayRegion(sheet.read.facts.sitePlan), ...(onPage ? { onPage } : {}) };
  }, [sheet, sheetUsed]);

  const reachable: Record<StepId, boolean> = {
    sheet: true,
    plot: true,
    rules: plotId !== null,
    capacity: run !== null,
    parking: run !== null,
    checks: run !== null,
    export: run !== null,
  };
  const done: Record<StepId, boolean> = {
    sheet: sheetUsed,
    plot: plotId !== null,
    rules: run !== null,
    capacity: run !== null,
    parking: run?.levelPlan != null,
    checks: run?.checks.invariants.passed === true,
    export: Boolean(run?.gates?.['G3_ASSUMPTIONS_ACKNOWLEDGED'] && run?.gates?.['G4_REVIEWER_NAMED']),
  };

  /*
    The entrance, from wherever it was placed — the plan or the parking step. With
    a run on screen the same request is sent again with only the entrance changed
    (or the choice taken back); before the first run it waits and travels with it.
  */
  const placeEntrance = useCallback(
    (placed: VehicleAccessBody | null) => {
      // With a run, the entrance becomes the one in use only once the engine accepts it (`compute` sets it).
      if (!request) {
        setEntrance(placed);
        return;
      }
      const { chosenAccessEdgeSeq: _older, vehicleAccess: _previous, ...rest } = request;
      void compute(placed === null ? rest : { ...rest, vehicleAccess: placed });
    },
    [request, compute],
  );
  const entranceTool = useMemo(
    () => ({ value: entrance, onChange: placeEntrance, access: run?.levelPlan?.access ?? null, recomputes: request !== null }),
    [entrance, placeEntrance, run, request],
  );

  const canvas: ReactNode = useMemo(() => {
    // The mark over the canvas says it; an empty canvas under it, not a second message.
    if (busy === 'load') return <div className="h-full" />;
    switch (step) {
      case 'sheet':
        return <SheetCanvas sheet={sheet} />;
      case 'plot':
        return (
          <PlotCanvas
            draft={draft}
            plot={plot}
            view={plotView}
            onView={setPlotView}
            trace={trace}
            onTrace={setTrace}
            statedArea={statedArea}
            sheetUnderlay={sheetUnderlay}
            onUseTrace={applyTrace}
            onEdit={editPlot}
            created={created}
            entrance={entranceTool}
          />
        );
      case 'rules':
        return (
          <PlotCanvas
            draft={draft}
            plot={plot}
            view="plan"
            onView={(v) => {
              setPlotView(v);
              setStep('plot');
            }}
            trace={trace}
            onTrace={setTrace}
            statedArea={statedArea}
            sheetUnderlay={null}
            onUseTrace={applyTrace}
            entrance={entranceTool}
          />
        );
      case 'capacity':
        return run ? <CapacityCanvas run={run} /> : null;
      case 'parking':
        return run ? <ParkingCanvas run={run} /> : null;
      case 'checks':
        return run ? <ChecksCanvas run={run} /> : null;
      case 'export':
        return run ? <ParkingCanvas run={run} initialKind="SITE" /> : null;
    }
    // `applyTrace` is rebuilt each render but reads only `draft`, which is listed.
  }, [busy, step, draft, plot, created, run, t, sheetUnderlay, sheet, plotView, trace, statedArea, entranceTool]);

  return (
    <AdvisorProvider actor={actor}>
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
          <nav aria-label={t.studio.steps} className="relative border-b border-line bg-panel lg:flex lg:flex-col lg:border-e lg:border-b-0">
            <ol className="relative flex gap-1 overflow-x-auto p-2 lg:grid lg:gap-1 lg:overflow-visible lg:p-3">
              {/* The rail joining the steps, filled in the brand gradient as far as the work has got. */}
              <span aria-hidden="true" className="pointer-events-none absolute start-[36px] top-[34px] bottom-[34px] hidden w-px bg-line lg:block">
                <motion.span
                  className="absolute inset-x-0 top-0 h-full origin-top bg-linear-to-b from-accent via-brand-alt to-brand-glow"
                  initial={false}
                  animate={{ scaleY: STEPS.length > 1 ? Math.max(0, STEPS.findIndex((x) => x.id === step)) / (STEPS.length - 1) : 0 }}
                  transition={{ duration: reduce ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
              {STEPS.map((s, i) => {
                const active = step === s.id;
                const can = reachable[s.id];
                return (
                  <li key={s.id} className="relative shrink-0">
                    <button
                      type="button"
                      disabled={!can}
                      onClick={() => setStep(s.id)}
                      aria-current={active ? 'step' : undefined}
                      className={cn(
                        'group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-[13px] transition-[background-color,color,transform] duration-200',
                        active ? 'text-fg' : 'text-secondary hover:bg-hover hover:text-fg enabled:hover:translate-x-0.5 rtl:enabled:hover:-translate-x-0.5',
                        'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
                      )}
                    >
                      {active ? (
                        <motion.span
                          layoutId="step-marker"
                          className="absolute inset-0 rounded-lg border border-accent/30 bg-linear-to-r from-accent-subtle to-transparent rtl:bg-linear-to-l"
                          transition={{ duration: reduce ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
                          aria-hidden="true"
                        />
                      ) : null}
                      <span
                        className={cn(
                          'relative grid size-7 shrink-0 place-items-center rounded-lg border text-[11px] transition-transform duration-200 group-hover:scale-105',
                          // Brand, not green: green says DERIVED, and a finished step is not a provenance class.
                          active
                            ? cn('tile border-transparent', `tile-${toneAt(i)}`)
                            : done[s.id]
                              ? 'border-accent/50 bg-accent-subtle text-accent-strong'
                              : 'border-line bg-panel',
                        )}
                      >
                        {done[s.id] && !active ? <Check className="size-3.5" aria-hidden="true" /> : <s.icon className="size-3.5" aria-hidden="true" />}
                      </span>
                      <span className="relative min-w-0">
                        <span className="figure me-1.5 text-[10.5px] text-tertiary">{i + 1}</span>
                        <span className={active ? 'font-medium' : undefined}>{t.studio.step[s.id]}</span>
                        {done[s.id] ? <span className="sr-only"> ({t.studio.stepDone})</span> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {/* How far the study has got, as a bar and in words. */}
            <div className="mx-3 mt-auto mb-3 hidden gap-2 rounded-lg border border-line bg-base p-3 lg:grid">
              <p className="text-[12px] text-secondary">
                {t.studio.progress(String(STEPS.filter((x) => done[x.id]).length), String(STEPS.length))}
              </p>
              <span className="h-1.5 overflow-hidden rounded-full bg-raised" aria-hidden="true">
                <motion.span
                  className="block h-full origin-left rounded-full bg-linear-to-r from-accent via-brand-alt to-brand-glow rtl:origin-right"
                  initial={false}
                  animate={{ scaleX: STEPS.filter((x) => done[x.id]).length / STEPS.length }}
                  transition={{ duration: reduce ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
            </div>
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
            {/* Over whatever the canvas held, at every wait: the study opening, the sheet read, the plot filed, the run. */}
            {busy ? <ComputingMark stage={busy} /> : null}
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
                <RefusalNotice message={error} refused={refusedBody} onApply={(body) => void compute(body)} />
              </div>
            ) : null}
            {step === 'sheet' ? (
              <SheetPanel
                sheet={sheet}
                using={sheetUsed}
                busy={busy === 'sheet'}
                error={sheetError}
                onFile={(file) => void readSheet(file)}
                onUse={applySheet}
                onClear={clearSheet}
                onSkip={() => setStep('plot')}
                onNext={() => setStep('plot')}
              />
            ) : step === 'plot' ? (
              <PlotPanel
                draft={draft}
                onChange={editPlot}
                statedArea={statedArea}
                onStatedArea={editStatedArea}
                sheet={sheetUsed ? sheet : null}
                created={created}
                plot={plot}
                busy={busy === 'plot'}
                onFile={fileplot}
                onNext={() => setStep('rules')}
                roads={mapRoads}
              />
            ) : step === 'rules' && plotId ? (
              <RulesPanel
                form={rules}
                onChange={setRules}
                busy={busy === 'run'}
                onCompute={() =>
                  void compute({
                    ...requestBody(plotId, rules, undefined, typedSetbacksOf(draft)),
                    ...(entrance ? { vehicleAccess: entrance } : {}),
                  })
                }
                hasRun={run !== null}
              />
            ) : step === 'capacity' && run ? (
              <CapacityPanel run={run} onNext={() => setStep('parking')} />
            ) : step === 'parking' && run ? (
              <ParkingPanel
                run={run}
                busy={busy === 'run'}
                canChoose={request !== null}
                onPlace={(placed) => {
                  if (request) placeEntrance(placed);
                }}
                picked={request?.parkingArrangement ?? null}
                onArrange={(id) => {
                  if (!request) return;
                  // The same request again with only the arrangement changed; the engine redraws every sheet from it.
                  const { parkingArrangement: _previous, ...rest } = request;
                  void compute(id === null ? rest : { ...rest, parkingArrangement: id });
                }}
                onNext={() => setStep('checks')}
              />
            ) : step === 'checks' && run ? (
              <ChecksPanel run={run} onNext={() => setStep('export')} />
            ) : step === 'export' && run ? (
              <ExportPanel actor={actor} run={run} onSigned={refresh} />
            ) : null}
            </motion.div>
          </aside>
        </div>
      </div>
      {run ? <DerivationDrawer actor={actor} runId={run.runId} nodeId={node} onClose={() => setNode(null)} /> : null}
    </InspectProvider>
    </AdvisorProvider>
  );
}
