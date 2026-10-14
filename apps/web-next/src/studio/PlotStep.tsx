import { ArrowRight, Plus, Trash2 } from 'lucide-react';

import type { PlotCreated, PlotView } from '@web/api/client.js';

import { PlotSketch } from '../components/PlotSketch.js';
import { grouped } from '../lib/figures.js';
import { EngineText, useLocale } from '../lib/locale.js';
import { Button } from '../ui/button.js';
import { Badge, Field, Input, Notice, PanelHeader, Select, Spinner } from '../ui/primitives.js';
import type { DraftPlot, EdgeClass, Hierarchy } from './model.js';

export function PlotCanvas({ draft, plot }: { readonly draft: DraftPlot; readonly plot: PlotView | null }): JSX.Element {
  const { t } = useLocale();
  const vertices = plot?.vertices ?? draft.vertices;
  const edges = plot
    ? plot.edges.map((e) => ({ seq: e.seq, classification: e.classification, roadHierarchy: e.roadHierarchy, lengthM: e.lengthM }))
    : draft.edges.map((e, seq) => ({ seq, classification: e.classification, roadHierarchy: e.roadHierarchy }));
  return (
    <div className="flex h-full flex-col">
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

const CLASSES: readonly EdgeClass[] = ['ROAD', 'ADJACENT_PLOT', 'OPEN_SPACE', 'OTHER'];
const HIERARCHIES: readonly Exclude<Hierarchy, ''>[] = ['ARTERIAL', 'COLLECTOR', 'LOCAL', 'ACCESS'];

export function PlotPanel({
  draft,
  onChange,
  created,
  plot,
  busy,
  onFile,
  onNext,
}: {
  readonly draft: DraftPlot;
  readonly onChange: (next: DraftPlot) => void;
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

  return (
    <div>
      <PanelHeader title={t.plot.title} hint={t.plot.hint} />
      <div className="grid grid-cols-1 gap-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.plot.number}>
            {({ id }) => <Input id={id} value={draft.plotNumber} onChange={(e) => onChange({ ...draft, plotNumber: e.target.value })} className="figure" />}
          </Field>
          <Field label={t.plot.community}>
            {({ id }) => <Input id={id} value={draft.community} onChange={(e) => onChange({ ...draft, community: e.target.value })} />}
          </Field>
        </div>

        <fieldset className="grid gap-2">
          <legend className="mb-1 text-[12.5px] font-medium text-fg">{t.plot.corners}</legend>
          <p className="text-[12px] text-secondary">{t.plot.cornersHint}</p>
          <div className="overflow-hidden rounded-md border border-line">
            <table className="w-full text-[12.5px]">
              <thead className="bg-raised text-secondary">
                <tr>
                  <th scope="col" className="w-10 px-2 py-1.5 text-start font-medium">#</th>
                  <th scope="col" className="px-1 py-1.5 text-start font-medium">x (m)</th>
                  <th scope="col" className="px-1 py-1.5 text-start font-medium">y (m)</th>
                  <th scope="col" className="px-1 py-1.5 text-start font-medium">{t.plot.boundaryFrom}</th>
                  <th scope="col" className="w-9">
                    <span className="sr-only">{t.plot.remove}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {draft.vertices.map((v, i) => {
                  const e = draft.edges[i] ?? { classification: '' as EdgeClass, roadHierarchy: '' as Hierarchy };
                  return (
                    <tr key={i} className="border-t border-subtle align-top">
                      <th scope="row" className="figure px-2 py-1.5 text-start font-normal text-secondary">
                        P{i}
                      </th>
                      <td className="px-1 py-1">
                        <Input aria-label={t.plot.xOf(i)} inputMode="decimal" value={v.x} onChange={(ev) => setVertex(i, 'x', ev.target.value)} className="figure h-8 px-2" />
                      </td>
                      <td className="px-1 py-1">
                        <Input aria-label={t.plot.yOf(i)} inputMode="decimal" value={v.y} onChange={(ev) => setVertex(i, 'y', ev.target.value)} className="figure h-8 px-2" />
                      </td>
                      <td className="grid gap-1 px-1 py-1">
                        <Select
                          aria-label={t.plot.edgeOf(i, (i + 1) % n)}
                          value={e.classification}
                          onChange={(ev) => setEdge(i, { classification: ev.target.value as EdgeClass, roadHierarchy: '' })}
                          className="h-8 px-2 text-[12.5px]"
                          aria-invalid={e.classification === '' || undefined}
                        >
                          <option value="">{t.plot.choose}</option>
                          {CLASSES.map((c) => (
                            <option key={c} value={c}>
                              {t.plot.cls[c as Exclude<EdgeClass, ''>]}
                            </option>
                          ))}
                        </Select>
                        {e.classification === 'ROAD' ? (
                          <Select
                            aria-label={t.plot.hierarchyOf(i)}
                            value={e.roadHierarchy}
                            onChange={(ev) => setEdge(i, { roadHierarchy: ev.target.value as Hierarchy })}
                            className="h-8 px-2 text-[12.5px]"
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
                      </td>
                      <td className="px-1 py-1">
                        <Button variant="ghost" size="icon" className="size-8" aria-label={t.plot.removeCorner(i)} disabled={n <= 3} onClick={() => remove(i)}>
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Button variant="ghost" size="sm" className="justify-self-start" onClick={add}>
            <Plus aria-hidden="true" />
            {t.plot.addCorner}
          </Button>
        </fieldset>

        {!ready ? (
          <p className="text-[12px] text-secondary" role="status">
            {blankCorner ? t.plot.needCorners : unclassified > 0 ? t.plot.needClass(unclassified) : missingHierarchy > 0 ? t.plot.needHierarchy(missingHierarchy) : t.plot.needNames}
          </p>
        ) : null}

        {plot ? (
          <div className="grid gap-3 rounded-md border border-line bg-raised p-3">
            <p className="flex items-center gap-2 text-[13px] font-medium text-fg">
              <Badge tone="accent">{t.plot.filed}</Badge>
              <span className="figure text-secondary">{plot.plotId.slice(0, 8)}</span>
            </p>
            <dl className="grid grid-cols-2 gap-3 text-[12.5px]">
              <div>
                <dt className="text-secondary">{t.plot.area}</dt>
                <dd className="figure text-[15px] text-fg">
                  {grouped(plot.computedAreaM2)} <span className="font-sans text-[11px] text-secondary">m²</span>
                </dd>
              </div>
              <div>
                <dt className="text-secondary">{t.plot.shape}</dt>
                <dd className="text-fg">
                  <EngineText>{plot.shapeClass}</EngineText>
                </dd>
              </div>
            </dl>
            {created?.areaMismatchMessage ? (
              <Notice tone="neutral">
                <EngineText>{created.areaMismatchMessage}</EngineText>
              </Notice>
            ) : null}
            <Button variant="primary" onClick={onNext}>
              {t.plot.toRules}
              <ArrowRight className="rtl:-scale-x-100" aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <Button variant="primary" size="lg" disabled={!ready || busy} aria-busy={busy || undefined} onClick={onFile}>
            {busy ? <Spinner /> : null}
            {t.plot.file}
          </Button>
        )}
      </div>
    </div>
  );
}
