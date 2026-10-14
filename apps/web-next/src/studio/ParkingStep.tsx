import type { Sheet } from '@envelope/sheets';
import { Check } from 'lucide-react';

import type { AccessCandidateView, RunView } from '@web/api/client.js';

import { SheetViewer, useSheets } from '../components/SheetViewer.js';
import { Traced } from '../components/Traced.js';
import { cn } from '../lib/cn.js';
import { grouped } from '../lib/figures.js';
import { EngineText, useLocale } from '../lib/locale.js';
import { Button } from '../ui/button.js';
import { Badge, Notice, PanelHeader, Spinner } from '../ui/primitives.js';

/*
  THE SCREEN THE 30 AUG MEETING WAS ABOUT.

  Every bay, aisle and ramp on these sheets was placed by the engine, and the
  sheet is written by the same function the A3 set and the DXF are. The losses
  are three numbers, never one efficiency: a reader can argue with the reserved
  zone, the cross aisle or the corner a rectangle cannot reach, and not with a
  percentage that hides which.
*/
export function ParkingCanvas({ run, initialKind = 'PARKING' }: { readonly run: RunView; readonly initialKind?: Sheet['kind'] }): JSX.Element {
  const { t } = useLocale();
  const sheets = useSheets(run.building, {
    plotNumber: run.plot.plotNumber,
    community: run.plot.community,
    runId: run.runId,
    issuedAt: run.issuedAt,
    ...(run.gates?.['G4_REVIEWER_NAMED']?.actorName ? { checkedBy: run.gates['G4_REVIEWER_NAMED'].actorName } : {}),
  });
  if (!run.building) return <p className="grid h-full place-items-center p-6 text-center text-secondary">{t.capacity.noModel}</p>;
  return <SheetViewer sheets={sheets} initialKind={initialKind} />;
}

export function ParkingPanel({
  run,
  busy,
  canChoose,
  onChoose,
}: {
  readonly run: RunView;
  readonly busy: boolean;
  readonly canChoose: boolean;
  readonly onChoose: (edgeSeq: number | null) => void;
}): JSX.Element {
  const { t } = useLocale();
  const lp = run.levelPlan;
  if (!lp) {
    return (
      <div>
        <PanelHeader title={t.parking.title} />
        <div className="p-4">
          <Notice tone="neutral" title={t.parking.noPlan}>
            {run.levelPlanRefusal ? <EngineText>{run.levelPlanRefusal}</EngineText> : null}
          </Notice>
        </div>
      </div>
    );
  }
  const chosen = lp.access.chosen ?? null;
  const recommended = lp.access.recommended;
  const inUse = chosen ?? recommended;
  return (
    <div>
      <PanelHeader title={t.parking.title} hint={t.parking.hint} />
      <div className="grid grid-cols-1 gap-5 p-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Row label={t.parking.baysPerLevel}>
            <Traced value={lp.bayCount} size="lg" />
          </Row>
          <Row label={t.parking.areaPerBay}>
            <Traced value={lp.areaPerBayM2} size="lg" />
          </Row>
          <Row label={t.parking.required}>
            <Traced value={run.parking.totalBays} />
          </Row>
          <Row label={t.parking.levelsRequired}>
            <Traced value={run.parking.levelsRequired} />
          </Row>
          <Row label={t.parking.orientation}>
            <Traced value={lp.orientation} />
          </Row>
          <Row label={t.parking.module}>
            <Traced value={lp.moduleDepthM} />
          </Row>
        </dl>

        <section className="grid gap-2" aria-labelledby="losses">
          <h3 id="losses" className="text-[12px] font-medium text-secondary">
            {t.parking.losses}
          </h3>
          <ul className="grid gap-px overflow-hidden rounded-md border border-line bg-line">
            {(
              [
                ['reserved', lp.losses.reserved],
                ['circulation', lp.losses.circulation],
                ['footprint', lp.losses.footprint],
              ] as const
            ).map(([k, loss]) => (
              <li key={k} className="flex items-baseline justify-between gap-2 bg-base px-3 py-2 text-[12.5px]">
                <span className="text-fg">{t.parking.loss[k]}</span>
                <span className="figure text-secondary">
                  {t.parking.lossValue(String(loss.bays), grouped(loss.areaM2))}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[11.5px] text-tertiary">
            {t.parking.standard(lp.standard.bayWidthM, lp.standard.bayLengthM, lp.standard.drivewayWidthM)}
          </p>
        </section>

        <section className="grid gap-2" aria-labelledby="access">
          <h3 id="access" className="text-[12px] font-medium text-secondary">
            {t.parking.access}
          </h3>
          {inUse ? (
            <div className="grid gap-1.5 rounded-md border border-line bg-base p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={chosen ? 'accent' : 'neutral'}>{chosen ? t.parking.chosen : t.parking.recommended}</Badge>
                <span className="text-[13px] text-fg">{t.parking.onBoundary(inUse.edgeSeq)}</span>
              </div>
              <EngineText className="text-[12px] leading-relaxed text-secondary">{inUse.rationale}</EngineText>
              {chosen && recommended && recommended.edgeSeq !== chosen.edgeSeq ? (
                <p className="text-[12px] text-secondary">{t.parking.recommendedWas(recommended.edgeSeq)}</p>
              ) : null}
            </div>
          ) : (
            <Notice tone="neutral">{t.parking.noAccess}</Notice>
          )}
          {!canChoose ? <p className="text-[12px] text-secondary">{t.parking.cannotChoose}</p> : null}
          <ul className="grid gap-1.5">
            {lp.access.candidates.map((cand: AccessCandidateView) => {
              const isOn = inUse?.edgeSeq === cand.edgeSeq;
              return (
                <li key={cand.edgeSeq} className={cn('flex items-center gap-3 rounded-md border px-3 py-2', isOn ? 'border-accent/50' : 'border-line')}>
                  <span className="figure grid size-6 place-items-center rounded border border-strong text-[11px] text-fg">{cand.edgeSeq}</span>
                  <div className="min-w-0 flex-1 text-[12px]">
                    <p className="text-fg">
                      {t.parking.rank(cand.rank)} · {cand.hierarchy ? t.plot.road[cand.hierarchy as 'LOCAL'] ?? cand.hierarchy : t.parking.noHierarchy}
                    </p>
                    <p className="figure text-tertiary">{t.parking.window(cand.usableWindowM, cand.widthM)}</p>
                  </div>
                  {isOn ? (
                    <span className="flex items-center gap-1 text-[12px] text-accent-strong">
                      <Check className="size-3.5" aria-hidden="true" />
                      {t.parking.inUse}
                    </span>
                  ) : (
                    <Button size="sm" variant="secondary" disabled={!canChoose || busy} aria-busy={busy || undefined} onClick={() => onChoose(cand.edgeSeq)}>
                      {busy ? <Spinner /> : null}
                      {t.parking.useThis}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          {chosen ? (
            <Button variant="ghost" size="sm" className="justify-self-start" disabled={!canChoose || busy} onClick={() => onChoose(null)}>
              {t.parking.useRecommendation}
            </Button>
          ) : null}
          {lp.access.rejected.length > 0 ? (
            <details className="text-[12px] text-secondary">
              <summary className="cursor-pointer py-1 text-fg">{t.parking.rejected(lp.access.rejected.length)}</summary>
              <ul className="grid gap-1 pt-1">
                {lp.access.rejected.map((r) => (
                  <li key={r.edgeSeq}>
                    <span className="figure me-1.5 text-tertiary">{r.edgeSeq}</span>
                    <EngineText>{r.reason}</EngineText>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>

        {lp.notAssessed.length > 0 ? (
          <section className="grid gap-1.5 rounded-md border border-line bg-base p-3" aria-labelledby="na">
            <h3 id="na" className="not-assessed text-[12px] font-medium text-fg">
              {t.parking.notAssessed}
            </h3>
            <ul className="grid gap-1 text-[12px] text-secondary">
              {lp.notAssessed.map((n, i) => (
                <li key={i}>
                  <EngineText>{n}</EngineText>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
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
