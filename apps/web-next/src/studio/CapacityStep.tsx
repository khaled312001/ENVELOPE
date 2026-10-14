import { ChevronDown, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

import type { RunView } from '@web/api/client.js';
import type { TracedWire } from '@web/components/TracedValue.js';

import { Massing3D, type MassingControls } from '../components/Massing3D.js';
import { ClassMark, Legend, Traced, useInspect } from '../components/Traced.js';
import { cn } from '../lib/cn.js';
import { grouped, percent } from '../lib/figures.js';
import { EngineText, useLocale } from '../lib/locale.js';
import { Button } from '../ui/button.js';
import { Notice, PanelHeader, Select } from '../ui/primitives.js';
import { assumedFirst, Footer, Heading, More, NextStep, Row } from './parts.js';

export function CapacityCanvas({ run }: { readonly run: RunView }): JSX.Element {
  const { t } = useLocale();
  const inspect = useInspect();
  const [controls, setControls] = useState<MassingControls>({ levelId: null, spread: 0, envelope: true });
  const [failed, setFailed] = useState(false);
  const model = run.building;
  if (!model) return <p className="grid h-full place-items-center p-6 text-center text-secondary">{t.capacity.noModel}</p>;
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-panel px-3 py-2">
        <label className="flex items-center gap-2 text-[12.5px] text-secondary">
          {t.capacity.show}
          <Select value={controls.levelId ?? ''} onChange={(e) => setControls((c) => ({ ...c, levelId: e.target.value || null }))} className="h-8 w-44 text-[12.5px]">
            <option value="">{t.capacity.allLevels}</option>
            {model.levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.id} · {l.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex items-center gap-2 text-[12.5px] text-secondary">
          {t.capacity.spread}
          <input
            type="range"
            min={0}
            max={12}
            step={1}
            value={controls.spread}
            onChange={(e) => setControls((c) => ({ ...c, spread: Number(e.target.value) }))}
            className="w-28 accent-[var(--accent)]"
            aria-valuetext={t.capacity.spreadValue(controls.spread)}
          />
        </label>
        <Button variant="ghost" size="sm" aria-pressed={controls.envelope} onClick={() => setControls((c) => ({ ...c, envelope: !c.envelope }))}>
          {controls.envelope ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
          {t.capacity.envelope}
        </Button>
        <span className="ms-auto hidden text-[11.5px] text-tertiary md:inline">{t.capacity.hint}</span>
      </div>
      <div className="relative min-h-0 flex-1">
        {failed ? (
          <p className="grid h-full place-items-center p-6 text-center text-secondary">{t.landing.noWebgl}</p>
        ) : (
          <Massing3D model={model} controls={controls} onFailed={() => setFailed(true)} {...(inspect ? { onInspect: inspect } : {})} />
        )}
        <div className="pointer-events-none absolute start-3 bottom-3 rounded-md border border-line bg-panel/90 px-3 py-2">
          <Legend />
        </div>
      </div>
      {/* The canvas in words: every level the model holds, at its floor. */}
      <details className="border-t border-line bg-panel">
        <summary className="cursor-pointer px-4 py-2 text-[12.5px] font-medium text-fg">{t.capacity.levelsTable(model.levels.length)}</summary>
        <div className="max-h-56 overflow-auto px-4 pb-3">
          <table className="w-full text-[12.5px]">
            <thead className="text-secondary">
              <tr>
                <th scope="col" className="py-1 text-start font-medium">{t.capacity.level}</th>
                <th scope="col" className="py-1 text-start font-medium">{t.capacity.use}</th>
                <th scope="col" className="py-1 text-start font-medium">{t.capacity.floorAt}</th>
                <th scope="col" className="py-1 text-start font-medium">{t.capacity.bays}</th>
              </tr>
            </thead>
            <tbody>
              {[...model.levels].reverse().map((l) => (
                <tr key={l.id} className="border-t border-subtle">
                  <th scope="row" className="figure py-1 text-start font-normal text-fg">
                    {l.id}
                  </th>
                  <td className="py-1 text-secondary">{t.capacity.uses[l.use]}</td>
                  <td className="py-1">
                    <Traced value={l.elevationM} size="sm" />
                  </td>
                  <td className="figure py-1 text-secondary">{l.parking ? l.parking.bays.length : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

const BANDS = [
  { key: 'bandA', band: 'REGULATORY', letter: 'A' },
  { key: 'bandB', band: 'GEOMETRIC', letter: 'B' },
  { key: 'bandC', band: 'PARKING', letter: 'C' },
] as const;

interface Figure {
  readonly key: string;
  readonly label: string;
  readonly value: TracedWire;
  readonly places: number;
}

export function CapacityPanel({
  run,
  onNext,
}: {
  readonly run: RunView;
  /** Optional so a caller that does not wire it keeps working; when given, it is the panel's one primary action. */
  readonly onNext?: () => void;
}): JSX.Element {
  const { t } = useLocale();
  const c = run.capacity;
  // A bar's width is the one place a figure becomes a JS number, and only for drawing the bar.
  const max = Math.max(...BANDS.map((b) => Number(c[b.key].value)), 1);
  const governing = BANDS.find((b) => b.band === c.governingBand);
  // The figures a reader needs first; the envelope's own limits fold away — unless one of them was assumed.
  const { shown, folded } = assumedFirst<Figure>(
    [
      { key: 'levels', label: t.capacity.levels, value: c.levels, places: 2 },
      { key: 'saleable', label: t.capacity.saleable, value: c.saleableAreaM2, places: 0 },
      { key: 'share', label: t.capacity.saleableShare, value: c.saleableEfficiency, places: 4 },
      { key: 'far', label: t.capacity.farTreatment, value: c.parkingInFarTreatment, places: 2 },
    ],
    [
      { key: 'height', label: t.capacity.height, value: run.envelope.heightCeilingM, places: 2 },
      { key: 'plate', label: t.capacity.plate, value: run.envelope.towerPlateCap, places: 0 },
      ...(run.core ? [{ key: 'core', label: t.capacity.core, value: run.core.areaM2, places: 1 }] : []),
      { key: 'bays', label: t.capacity.totalBays, value: run.parking.totalBays, places: 2 },
    ],
  );
  return (
    <div>
      <PanelHeader title={t.capacity.title} hint={t.capacity.hint2} />
      <div className="grid grid-cols-1 gap-6 p-4">
        {run.warning ? <Notice tone="neutral">{run.warning}</Notice> : null}

        {/* The answer: one figure, and the band and constraint that set it. */}
        <section className="grid gap-2" aria-labelledby="governing">
          <Heading id="governing">{t.capacity.governing}</Heading>
          <Traced value={c.governingGfa} size="xl" places={2} />
          <p className="text-[13px] font-medium text-fg">{t.capacity.governedBy(governing?.letter ?? '?', t.bands[governing?.key ?? 'bandA'].name)}</p>
          <p className="text-[12px] text-secondary">
            {t.capacity.binding} <EngineText className="text-fg">{c.governingConstraint.label}</EngineText>{' '}
            <span className="figure text-tertiary">{c.governingConstraint.ruleId}</span>
          </p>
        </section>

        <section className="grid gap-3" aria-labelledby="bands">
          <Heading id="bands">{t.capacity.bands}</Heading>
          <ul className="grid gap-3">
            {BANDS.map((b) => {
              const gov = b.band === c.governingBand;
              const w = Math.max(2, (Number(c[b.key].value) / max) * 100);
              return (
                <li key={b.key} className="grid gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('flex items-center gap-2 text-[12.5px]', gov ? 'font-medium text-fg' : 'text-secondary')}>
                      <span
                        className={cn(
                          'figure grid size-5 place-items-center rounded border text-[10.5px]',
                          gov ? 'border-accent text-accent-strong' : 'border-line text-secondary',
                        )}
                      >
                        {b.letter}
                      </span>
                      {t.bands[b.key].name}
                    </span>
                    <Traced value={c[b.key]} size="sm" places={0} />
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
                    <div className={cn('h-full rounded-full', gov ? 'bg-accent' : 'bg-strong')} style={{ width: `${w}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-[12px] text-secondary">{t.capacity.headroom(grouped(c.headroomToNextM2))}</p>
        </section>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          {shown.map((f) => (
            <Row key={f.key} label={f.label}>
              <Traced value={f.value} places={f.places} />
            </Row>
          ))}
        </dl>

        {/* Assumptions stay in view, amber, with their values; the basis and the measured sensitivity open beneath each. */}
        {run.assumptions.length > 0 ? (
          <section className="grid gap-2" aria-labelledby="assumed">
            <Heading id="assumed">{t.capacity.assumptions(run.assumptions.length)}</Heading>
            <ul className="grid gap-2">
              {run.assumptions.map((a) => (
                <li key={a.nodeId} className="rounded-md border border-dashed border-assumed/60 bg-base">
                  <details className="group">
                    <summary
                      className={cn(
                        'flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md px-2.5 py-2',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 [&::-webkit-details-marker]:hidden',
                      )}
                    >
                      <span className="grid min-w-0 flex-1 gap-0.5">
                        <EngineText className="text-[12.5px] font-medium text-fg">{a.label}</EngineText>
                        <span className="figure text-[13px] text-assumed">
                          {grouped(a.value)}
                          {a.unit ? <span className="ms-1 text-secondary">{a.unit}</span> : null}
                        </span>
                      </span>
                      <ClassMark cls="ASSUMED" />
                      <ChevronDown
                        className="size-4 shrink-0 text-secondary transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
                        aria-hidden="true"
                      />
                    </summary>
                    <div className="grid gap-1.5 px-2.5 pb-2.5">
                      <EngineText className="text-[12px] leading-relaxed text-secondary">{a.basis}</EngineText>
                      {a.sensitivity ? (
                        <p className="text-[11.5px] text-tertiary">
                          {t.capacity.sensitivity(a.sensitivity.perturbation, grouped(a.sensitivity.lowGoverningGfaM2), grouped(a.sensitivity.highGoverningGfaM2), percent(a.sensitivity.relativeEffect))}
                        </p>
                      ) : null}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div>
          {folded.length > 0 ? (
            <More summary={folded.map((f) => f.label).join(' · ')}>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                {folded.map((f) => (
                  <Row key={f.key} label={f.label}>
                    <Traced value={f.value} places={f.places} />
                  </Row>
                ))}
              </dl>
            </More>
          ) : null}
          {run.core && run.core.reconciliation.length > 0 ? (
            <More summary={t.capacity.coreRec}>
              {run.core.reconciliation.map((r, i) => (
                <EngineText key={i} className="block text-[12px] leading-relaxed text-secondary">
                  {r}
                </EngineText>
              ))}
            </More>
          ) : null}
        </div>

        {onNext ? (
          <Footer>
            <NextStep label={t.studio.step.parking} onClick={onNext} />
          </Footer>
        ) : null}
      </div>
    </div>
  );
}
