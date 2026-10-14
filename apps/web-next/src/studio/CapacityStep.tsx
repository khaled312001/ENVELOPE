import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

import type { RunView } from '@web/api/client.js';

import { Massing3D, type MassingControls } from '../components/Massing3D.js';
import { ClassMark, Legend, Traced, useInspect } from '../components/Traced.js';
import { cn } from '../lib/cn.js';
import { grouped, percent } from '../lib/figures.js';
import { EngineText, useLocale } from '../lib/locale.js';
import { Button } from '../ui/button.js';
import { Notice, PanelHeader, Select } from '../ui/primitives.js';

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

export function CapacityPanel({ run }: { readonly run: RunView }): JSX.Element {
  const { t } = useLocale();
  const c = run.capacity;
  // A bar's width is the one place a figure becomes a JS number, and only for drawing the bar.
  const max = Math.max(...BANDS.map((b) => Number(c[b.key].value)), 1);
  return (
    <div>
      <PanelHeader title={t.capacity.title} hint={t.capacity.hint2} />
      <div className="grid grid-cols-1 gap-5 p-4">
        {run.warning ? <Notice tone="neutral">{run.warning}</Notice> : null}

        <section className="grid gap-2">
          <h3 className="text-[12px] font-medium text-secondary">{t.capacity.governing}</h3>
          <Traced value={c.governingGfa} size="xl" places={2} />
          <p className="text-[12.5px] text-secondary">
            {t.capacity.governedBy(BANDS.find((b) => b.band === c.governingBand)?.letter ?? '?', t.bands[BANDS.find((b) => b.band === c.governingBand)?.key ?? 'bandA'].name)}
          </p>
          <p className="text-[12.5px] text-secondary">
            {t.capacity.binding} <EngineText className="text-fg">{c.governingConstraint.label}</EngineText>{' '}
            <span className="figure text-tertiary">{c.governingConstraint.ruleId}</span>
          </p>
        </section>

        <section className="grid gap-2.5" aria-labelledby="bands">
          <h3 id="bands" className="text-[12px] font-medium text-secondary">
            {t.capacity.bands}
          </h3>
          {BANDS.map((b) => {
            const gov = b.band === c.governingBand;
            const w = Math.max(2, (Number(c[b.key].value) / max) * 100);
            return (
              <div key={b.key} className={cn('grid gap-1.5 rounded-md border p-2.5', gov ? 'border-accent/50 bg-accent-subtle/40' : 'border-line bg-base')}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-[12.5px] text-fg">
                    <span className="figure grid size-5 place-items-center rounded border border-strong text-[10.5px]">{b.letter}</span>
                    {t.bands[b.key].name}
                  </span>
                  <Traced value={c[b.key]} size="sm" places={0} />
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
                  <div className={cn('h-full rounded-full', gov ? 'bg-accent' : 'bg-strong')} style={{ width: `${w}%` }} />
                </div>
              </div>
            );
          })}
          <p className="text-[12px] text-secondary">
            {t.capacity.headroom(grouped(c.headroomToNextM2))}
          </p>
        </section>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-subtle pt-4">
          <Row label={t.capacity.levels}>
            <Traced value={c.levels} />
          </Row>
          <Row label={t.capacity.saleable}>
            <Traced value={c.saleableAreaM2} places={0} />
          </Row>
          <Row label={t.capacity.saleableShare}>
            <Traced value={c.saleableEfficiency} places={4} />
          </Row>
          <Row label={t.capacity.farTreatment}>
            <Traced value={c.parkingInFarTreatment} />
          </Row>
          <Row label={t.capacity.height}>
            <Traced value={run.envelope.heightCeilingM} />
          </Row>
          <Row label={t.capacity.plate}>
            <Traced value={run.envelope.towerPlateCap} places={0} />
          </Row>
          {run.core ? (
            <Row label={t.capacity.core}>
              <Traced value={run.core.areaM2} places={1} />
            </Row>
          ) : null}
          <Row label={t.capacity.totalBays}>
            <Traced value={run.parking.totalBays} />
          </Row>
        </dl>

        {run.core && run.core.reconciliation.length > 0 ? (
          <section className="grid gap-1.5 rounded-md border border-line bg-base p-3 text-[12px] text-secondary">
            <h3 className="font-medium text-fg">{t.capacity.coreRec}</h3>
            {run.core.reconciliation.map((r, i) => (
              <EngineText key={i} className="block leading-relaxed">
                {r}
              </EngineText>
            ))}
          </section>
        ) : null}

        <section className="grid gap-2" aria-labelledby="assumed">
          <h3 id="assumed" className="flex items-center gap-2 text-[12px] font-medium text-secondary">
            {t.capacity.assumptions(run.assumptions.length)}
          </h3>
          <ul className="grid gap-2">
            {run.assumptions.map((a) => (
              <li key={a.nodeId} className="grid gap-1.5 rounded-md border border-dashed border-assumed/60 bg-base p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <EngineText className="text-[12.5px] font-medium text-fg">{a.label}</EngineText>
                  <ClassMark cls="ASSUMED" />
                </div>
                <p className="figure text-[13px] text-assumed">
                  {grouped(a.value)}
                  {a.unit ? <span className="ms-1 text-secondary">{a.unit}</span> : null}
                </p>
                <EngineText className="text-[12px] leading-relaxed text-secondary">{a.basis}</EngineText>
                {a.sensitivity ? (
                  <p className="text-[11.5px] text-tertiary">
                    {t.capacity.sensitivity(a.sensitivity.perturbation, grouped(a.sensitivity.lowGoverningGfaM2), grouped(a.sensitivity.highGoverningGfaM2), percent(a.sensitivity.relativeEffect))}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Row({ label, children }: { readonly label: string; readonly children: React.ReactNode }): JSX.Element {
  return (
    <div className="grid gap-0.5">
      <dt className="text-[11.5px] text-secondary">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
