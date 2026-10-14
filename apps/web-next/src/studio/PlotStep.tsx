import { CircleCheck, FileCheck2, Map as MapIcon, PenSquare, Plus, Trash2 } from 'lucide-react';
import { lazy, Suspense, useMemo } from 'react';

import type { PlotCreated, PlotView } from '@web/api/client.js';
import type { LngLat } from '@web/geo.js';

import type { MapTrace, SheetImage } from '../components/PlotMapView.js';
import { PlotSketch } from '../components/PlotSketch.js';
import { grouped } from '../lib/figures.js';
import { EngineText, useLocale } from '../lib/locale.js';
import { Button } from '../ui/button.js';
import { Badge, Field, Input, Notice, PanelHeader, Select, Spinner } from '../ui/primitives.js';
import { Segmented } from '../ui/radix.js';
import { legsToDraft, pointsToDraft } from './geometry.js';
import type { DraftPlot, EdgeClass, Hierarchy } from './model.js';
import { Footer, Heading, NextStep, Row } from './parts.js';
import type { SheetState } from './SheetStep.js';

// maplibre is the heaviest thing the studio loads; it comes down only when the map is opened.
const PlotMapView = lazy(() => import('../components/PlotMapView.js').then((m) => ({ default: m.PlotMapView })));

export type PlotViewMode = 'plan' | 'map';

export function PlotCanvas({
  draft,
  plot,
  view,
  onView,
  trace,
  onTrace,
  statedArea,
  sheetImage,
  onUseTrace,
}: {
  readonly draft: DraftPlot;
  readonly plot: PlotView | null;
  readonly view: PlotViewMode;
  readonly onView: (next: PlotViewMode) => void;
  readonly trace: MapTrace;
  readonly onTrace: (next: MapTrace) => void;
  readonly statedArea: string;
  readonly sheetImage: SheetImage | null;
  readonly onUseTrace: (ring: readonly LngLat[]) => void;
}): JSX.Element {
  const { t } = useLocale();
  const vertices = plot?.vertices ?? draft.vertices;
  const edges = plot
    ? plot.edges.map((e) => ({ seq: e.seq, classification: e.classification, roadHierarchy: e.roadHierarchy, lengthM: e.lengthM }))
    : draft.edges.map((e, seq) => ({ seq, classification: e.classification, roadHierarchy: e.roadHierarchy }));
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-center border-b border-line bg-panel/90 px-3 py-2 backdrop-blur">
        <Segmented<PlotViewMode>
          label={t.plot.view}
          value={view}
          onChange={onView}
          options={[
            {
              value: 'map',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <MapIcon className="size-3.5" aria-hidden="true" />
                  {t.plot.viewMap}
                </span>
              ),
            },
            {
              value: 'plan',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <PenSquare className="size-3.5" aria-hidden="true" />
                  {t.plot.viewPlan}
                </span>
              ),
            },
          ]}
        />
      </div>
      {view === 'map' ? (
        <div className="relative min-h-0 flex-1">
          <Suspense
            fallback={
              <p className="flex h-full items-center justify-center gap-2 text-secondary">
                <Spinner />
              </p>
            }
          >
            <PlotMapView trace={trace} onTrace={onTrace} statedAreaM2={statedArea} sheet={sheetImage} onUse={onUseTrace} />
          </Suspense>
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 p-6 sm:p-10">
            <PlotSketch vertices={vertices} edges={edges} label={t.plot.sketchLabel(draft.plotNumber || t.studio.untitled)} />
          </div>
          <ul aria-label={t.plot.keyLabel} className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-line bg-panel/90 px-4 py-2.5 text-[12px] text-secondary">
            <KeyItem dash={undefined} width={3} stroke="var(--accent)" label={t.plot.cls.ROAD} />
            <KeyItem dash="6 4" width={1.5} stroke="var(--text-secondary)" label={t.plot.cls.ADJACENT_PLOT} />
            <KeyItem dash="2 3" width={1.5} stroke="var(--derived)" label={t.plot.cls.OPEN_SPACE} />
            <KeyItem dash="1 3" width={1.5} stroke="var(--text-tertiary)" label={t.plot.cls.OTHER} />
            <KeyItem dash="1 4" width={1} stroke="var(--text-tertiary)" label={t.plot.unclassified} />
            {plot ? <li className="ms-auto">{t.plot.lengthsFromEngine}</li> : <li className="ms-auto">{t.plot.noLengthsYet}</li>}
          </ul>
        </>
      )}
    </div>
  );
}

function KeyItem({ dash, width, stroke, label }: { dash: string | undefined; width: number; stroke: string; label: string }): JSX.Element {
  return (
    <li className="flex items-center gap-2">
      <svg width="28" height="8" aria-hidden="true">
        <line x1="1" y1="4" x2="27" y2="4" stroke={stroke} strokeWidth={width} strokeDasharray={dash} strokeLinecap="round" />
      </svg>
      {label}
    </li>
  );
}

/** True when the table already holds exactly these corners — the offer has been taken. */
function sameCorners(a: DraftPlot, b: DraftPlot): boolean {
  return a.vertices.length === b.vertices.length && a.vertices.every((v, i) => v.x === b.vertices[i]!.x && v.y === b.vertices[i]!.y);
}

const CLASSES: readonly Exclude<EdgeClass, ''>[] =['ROAD', 'ADJACENT_PLOT', 'OPEN_SPACE', 'OTHER'];
const HIERARCHIES: readonly Exclude<Hierarchy, ''>[] = ['ARTERIAL', 'COLLECTOR', 'LOCAL', 'ACCESS'];

export function PlotPanel({
  draft,
  onChange,
  statedArea,
  onStatedArea,
  sheet,
  created,
  plot,
  busy,
  onFile,
  onNext,
}: {
  readonly draft: DraftPlot;
  readonly onChange: (next: DraftPlot) => void;
  readonly statedArea: string;
  readonly onStatedArea: (next: string) => void;
  /** The affection plan in use for this study, if one was read and chosen. */
  readonly sheet: SheetState | null;
  readonly created: PlotCreated | null;
  readonly plot: PlotView | null;
  readonly busy: boolean;
  readonly onFile: () => void;
  readonly onNext: () => void;
}): JSX.Element {
  const { t } = useLocale();
  const n = draft.vertices.length;
  const unclassified = draft.edges.filter((e) => e.classification === '').length;
  const missingHierarchy = draft.edges.filter((e) => e.classification === 'ROAD' && e.roadHierarchy === '').length;
  const blankCorner = draft.vertices.some((v) => v.x.trim() === '' || v.y.trim() === '');
  const ready = draft.plotNumber.trim() !== '' && draft.community.trim() !== '' && !blankCorner && unclassified === 0 && missingHierarchy === 0 && n >= 3;

  const setVertex = (i: number, key: 'x' | 'y', value: string): void =>
    onChange({ ...draft, vertices: draft.vertices.map((v, j) => (j === i ? { ...v, [key]: value } : v)) });
  const setEdge = (i: number, patch: Partial<DraftPlot['edges'][number]>): void =>
    onChange({ ...draft, edges: draft.edges.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
  const add = (): void =>
    onChange({ ...draft, vertices: [...draft.vertices, { x: '', y: '' }], edges: [...draft.edges, { classification: '', roadHierarchy: '' }] });
  const remove = (i: number): void =>
    onChange({ ...draft, vertices: draft.vertices.filter((_, j) => j !== i), edges: draft.edges.filter((_, j) => j !== i) });

  // What the sheet offers for the corners, built now so a button is never offered that would do nothing.
  const offer = useMemo(() => {
    const facts = sheet?.read.facts;
    if (!facts) return null;
    // Printed eastings (DDA) or the drawing's own vertices on its grid (Municipality): both DERIVED, both exact.
    const ring = facts.survey ?? facts.drawn;
    if (ring) {
      const next = pointsToDraft(ring.points.value, draft);
      if (next) {
        return {
          kind: 'survey' as const,
          next,
          count: ring.points.value.length,
          system: ring.system.value,
          drawn: facts.survey === undefined,
          applied: sameCorners(next, draft),
          hints: facts.survey === undefined ? (facts.drawn?.edgeHints ?? []) : [],
        };
      }
    }
    const legs = facts.sitePlan?.outline?.legs.value;
    if (legs && legs.length >= 3 && legs.every((l) => l.lengthM !== undefined)) {
      const next = legsToDraft(
        legs.map((l) => ({ lengthM: l.lengthM!, bearingDeg: l.bearingDeg })),
        draft,
      );
      if (next) return { kind: 'outline' as const, next, applied: sameCorners(next, draft) };
    }
    return null;
  }, [sheet, draft]);

  /*
    What the sheet prints outside each boundary, as a SUGGESTION for its class.
    Only while the corners are the sheet's own — once a corner moves, boundary 2
    may not be the boundary the label sat beside. A hint fills an unanswered
    boundary on a press and never replaces an answer; the hierarchy is never
    suggested, because a sheet names a road and does not rank it.
  */
  const hints = offer?.kind === 'survey' && offer.applied && offer.hints.length === n ? offer.hints : [];
  const suggestible = hints.filter((h, i) => h !== null && draft.edges[i]?.classification === '').length;
  const applyHints = (): void =>
    onChange({
      ...draft,
      edges: draft.edges.map((e, i) => {
        const h = hints[i];
        return h && e.classification === '' ? { classification: h.classification, roadHierarchy: '' } : e;
      }),
    });

  return (
    <div>
      <PanelHeader title={t.plot.title} hint={t.plot.hint} />
      <div className="grid grid-cols-1 gap-5 p-4">
        {/* The answer first: once the engine has the plot, its measured area leads the panel. */}
        {plot ? (
          <section className="grid gap-2" aria-label={t.plot.filed}>
            <p className="flex items-center gap-2">
              <Badge tone="accent">{t.plot.filed}</Badge>
              <span className="figure text-[11.5px] text-tertiary">{plot.plotId.slice(0, 8)}</span>
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Row label={t.plot.area}>
                <span className="figure text-[28px] leading-none font-light tracking-[-0.02em] text-fg">
                  {grouped(plot.computedAreaM2)} <span className="font-sans text-[12px] text-secondary">m²</span>
                </span>
              </Row>
              <Row label={t.plot.shape}>
                <EngineText className="text-[13.5px] text-fg">{plot.shapeClass}</EngineText>
              </Row>
            </dl>
            {created?.areaMismatchMessage ? (
              <Notice tone="neutral">
                <EngineText>{created.areaMismatchMessage}</EngineText>
              </Notice>
            ) : null}
          </section>
        ) : null}

        {sheet ? (
          <p className="flex items-start gap-2 rounded-md border border-line bg-raised px-3 py-2 text-[12.5px] text-secondary">
            <FileCheck2 className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
            {t.plot.sheetAttached}
          </p>
        ) : null}

        {/* The sheet's corners, offered on a button and never applied by themselves. */}
        {offer && !plot ? (
          <section aria-labelledby="plot-from-sheet" className="grid gap-2">
            <Heading id="plot-from-sheet">{t.plot.fromSheet}</Heading>
            {offer.kind === 'survey' ? (
              <div className="grid gap-2 rounded-md border border-line bg-raised p-3">
                <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-fg">
                  <Badge tone="derived">{t.classLabel.DERIVED}</Badge>
                  {offer.drawn ? t.plot.drawnOffer(String(offer.count)) : t.plot.surveyOffer(String(offer.count), offer.system)}
                </p>
                {offer.applied ? (
                  <p className="flex items-center gap-1.5 text-[12px] text-secondary" role="status">
                    <CircleCheck className="size-3.5 shrink-0 text-derived" aria-hidden="true" />
                    {t.plot.cornersApplied}
                  </p>
                ) : (
                  <>
                    <Button variant="secondary" size="sm" className="justify-self-start" onClick={() => onChange(offer.next)}>
                      {t.plot.surveyUse}
                    </Button>
                    <p className="text-[11.5px] text-tertiary">{t.plot.replaces}</p>
                  </>
                )}
                {suggestible > 0 ? (
                  <Button variant="secondary" size="sm" className="justify-self-start" onClick={applyHints}>
                    {t.plot.useHints(suggestible)}
                  </Button>
                ) : null}
              </div>
            ) : offer.applied ? null : (
              <Notice tone="assumed">
                <span className="grid gap-2">
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge tone="assumed">{t.classLabel.ASSUMED}</Badge>
                    {t.plot.outlineOffer}
                  </span>
                  <Button variant="secondary" size="sm" className="justify-self-start" onClick={() => onChange(offer.next)}>
                    {t.plot.outlineUse}
                  </Button>
                  <span className="text-[11.5px] text-secondary">{t.plot.replaces}</span>
                </span>
              </Notice>
            )}
          </section>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Field label={t.plot.number}>
            {({ id }) => <Input id={id} value={draft.plotNumber} onChange={(e) => onChange({ ...draft, plotNumber: e.target.value })} className="figure" />}
          </Field>
          <Field label={t.plot.community}>
            {({ id }) => <Input id={id} value={draft.community} onChange={(e) => onChange({ ...draft, community: e.target.value })} />}
          </Field>
          <div className="col-span-2">
            <Field label={t.plot.statedArea} hint={t.plot.statedAreaHint}>
              {({ id, describedBy }) => (
                <Input id={id} inputMode="decimal" value={statedArea} onChange={(e) => onStatedArea(e.target.value)} aria-describedby={describedBy} className="figure" />
              )}
            </Field>
          </div>
        </div>

        <fieldset className="grid gap-2">
          <legend className="mb-1 text-[12.5px] font-medium text-fg">{t.plot.corners}</legend>
          <p className="text-[12px] text-secondary">{t.plot.cornersHint}</p>
          {/*
            One card per corner: the corner's two coordinates on its first line,
            the boundary it starts on a full-width line below. A table squeezed
            four columns into the inspector and cut every option's words off.
          */}
          <ol className="grid gap-2">
            {draft.vertices.map((v, i) => {
              const e = draft.edges[i] ?? { classification: '' as EdgeClass, roadHierarchy: '' as Hierarchy };
              const j = (i + 1) % n;
              return (
                <li key={i} className="grid gap-2 rounded-md border border-line bg-panel p-2.5">
                  <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1fr)_2rem] items-center gap-2">
                    <span className="figure grid h-8 place-items-center rounded-md bg-raised text-[12px] font-medium text-fg">P{i}</span>
                    <label className="relative block">
                      <span className="pointer-events-none absolute start-2 top-1/2 -translate-y-1/2 text-[11px] text-tertiary" aria-hidden="true">
                        x
                      </span>
                      <Input aria-label={t.plot.xOf(i)} inputMode="decimal" value={v.x} onChange={(ev) => setVertex(i, 'x', ev.target.value)} className="figure h-8 ps-6 pe-2" dir="ltr" />
                    </label>
                    <label className="relative block">
                      <span className="pointer-events-none absolute start-2 top-1/2 -translate-y-1/2 text-[11px] text-tertiary" aria-hidden="true">
                        y
                      </span>
                      <Input aria-label={t.plot.yOf(i)} inputMode="decimal" value={v.y} onChange={(ev) => setVertex(i, 'y', ev.target.value)} className="figure h-8 ps-6 pe-2" dir="ltr" />
                    </label>
                    <Button variant="ghost" size="icon" className="size-8" aria-label={t.plot.removeCorner(i)} disabled={n <= 3} onClick={() => remove(i)}>
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="grid gap-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3 text-[11.5px] text-secondary">
                      {t.plot.boundary(i, j)}
                      {hints[i] ? (
                        <span className="text-tertiary">
                          {t.plot.sheetSays}: <bdi className="figure" dir="ltr">{hints[i]!.verbatim}</bdi>
                        </span>
                      ) : null}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        aria-label={t.plot.edgeOf(i, j)}
                        value={e.classification}
                        onChange={(ev) => setEdge(i, { classification: ev.target.value as EdgeClass, roadHierarchy: '' })}
                        className="h-9 min-w-0 text-[12.5px]"
                        aria-invalid={e.classification === '' || undefined}
                      >
                        <option value="">{t.plot.choose}</option>
                        {CLASSES.map((c) => (
                          <option key={c} value={c}>
                            {t.plot.cls[c]}
                          </option>
                        ))}
                      </Select>
                      {e.classification === 'ROAD' ? (
                        <Select
                          aria-label={t.plot.hierarchyOf(i)}
                          value={e.roadHierarchy}
                          onChange={(ev) => setEdge(i, { roadHierarchy: ev.target.value as Hierarchy })}
                          className="h-9 min-w-0 text-[12.5px]"
                          aria-invalid={e.roadHierarchy === '' || undefined}
                        >
                          <option value="">{t.plot.hierarchy}</option>
                          {HIERARCHIES.map((h) => (
                            <option key={h} value={h}>
                              {t.plot.road[h]}
                            </option>
                          ))}
                        </Select>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <Button variant="ghost" size="sm" className="justify-self-start" onClick={add}>
            <Plus aria-hidden="true" />
            {t.plot.addCorner}
          </Button>
        </fieldset>

        <Footer>
          {!ready ? (
            <p className="text-[12px] text-secondary" role="status">
              {blankCorner ? t.plot.needCorners : unclassified > 0 ? t.plot.needClass(unclassified) : missingHierarchy > 0 ? t.plot.needHierarchy(missingHierarchy) : t.plot.needNames}
            </p>
          ) : null}
          {plot ? (
            <NextStep label={t.plot.toRules} onClick={onNext} />
          ) : (
            <Button variant="primary" size="lg" className="w-full" disabled={!ready || busy} aria-busy={busy || undefined} onClick={onFile}>
              {busy ? <Spinner /> : null}
              {t.plot.file}
            </Button>
          )}
        </Footer>
      </div>
    </div>
  );
}
