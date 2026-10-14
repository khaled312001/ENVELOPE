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
import { assumedFirst, Footer, Heading, More, NextStep, Row } from './parts.js';

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
  onNext,
}: {
  readonly run: RunView;
  readonly busy: boolean;
  readonly canChoose: boolean;
  readonly onChoose: (edgeSeq: number | null) => void;
  /** Optional so a caller that does not wire it keeps working; when given, it is the panel's one primary action. */
  readonly onNext?: () => void;
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
  // Supply against demand first; how the level was packed folds away — unless any of it was assumed.
  const { shown, folded } = assumedFirst(
    [
      { key: 'required', label: t.parking.required, value: run.parking.totalBays },
      { key: 'perLevel', label: t.parking.baysPerLevel, value: lp.bayCount },
      { key: 'levels', label: t.parking.levelsRequired, value: run.parking.levelsRequired },
      { key: 'perBay', label: t.parking.areaPerBay, value: lp.areaPerBayM2 },
    ],
    [
      { key: 'orientation', label: t.parking.orientation, value: lp.orientation },
      { key: 'module', label: t.parking.module, value: lp.moduleDepthM },
    ],
  );
  return (
    <div>
      <PanelHeader title={t.parking.title} hint={t.parking.hint} />
      <div className="grid grid-cols-1 gap-6 p-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
          {shown.map((f) => (
            <Row key={f.key} label={f.label}>
              <Traced value={f.value} size="lg" />
            </Row>
          ))}
        </dl>

        <section className="grid min-w-0 gap-2.5" aria-labelledby="access">
          <Heading id="access">{t.parking.access}</Heading>
          {inUse ? (
            <div className="grid gap-1">
              <p className="flex flex-wrap items-center gap-2">
                <Badge tone={chosen ? 'accent' : 'neutral'}>{chosen ? t.parking.chosen : t.parking.recommended}</Badge>
                <span className="text-[14px] font-medium text-fg">{t.parking.onBoundary(inUse.edgeSeq)}</span>
              </p>
              <EngineText className="text-[12px] leading-relaxed text-secondary">{inUse.rationale}</EngineText>
              {chosen && recommended && recommended.edgeSeq !== chosen.edgeSeq ? (
                <p className="text-[12px] text-secondary">{t.parking.recommendedWas(recommended.edgeSeq)}</p>
              ) : null}
            </div>
          ) : (
            <Notice tone="neutral">{t.parking.noAccess}</Notice>
          )}
          {!canChoose ? <p className="text-[12px] text-secondary">{t.parking.cannotChoose}</p> : null}
          <ul className="grid min-w-0 divide-y divide-subtle border-y border-subtle">
            {lp.access.candidates.map((cand: AccessCandidateView) => {
              const isOn = inUse?.edgeSeq === cand.edgeSeq;
              return (
                <li key={cand.edgeSeq} className="flex items-center gap-3 py-2">
                  <span
                    className={cn(
                      'figure grid size-6 shrink-0 place-items-center rounded border text-[11px]',
                      isOn ? 'border-accent text-accent-strong' : 'border-strong text-fg',
                    )}
                  >
                    {cand.edgeSeq}
                  </span>
                  <div className="min-w-0 flex-1 text-[12px]">
                    <p className="text-fg">
                      {t.parking.rank(cand.rank)} · {cand.hierarchy ? t.plot.road[cand.hierarchy as 'LOCAL'] ?? cand.hierarchy : t.parking.noHierarchy}
                    </p>
                    {/* Allowed to wrap: a figure's no-wrap here widened the whole panel past its edge. */}
                    <p className="figure !whitespace-normal text-tertiary">{t.parking.window(cand.usableWindowM, cand.widthM)}</p>
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
        </section>

        {/* What was not assessed stays in view: a gap is never one click away. */}
        {lp.notAssessed.length > 0 ? (
          <section className="grid gap-1.5" aria-labelledby="na">
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

        <div>
          {/* Three losses, never one percentage — folded, not merged. */}
          <More summary={t.parking.losses}>
            <ul className="grid divide-y divide-subtle">
              {(
                [
                  ['reserved', lp.losses.reserved],
                  ['circulation', lp.losses.circulation],
                  ['footprint', lp.losses.footprint],
                ] as const
              ).map(([k, loss]) => (
                <li key={k} className="flex items-baseline justify-between gap-2 py-1.5 text-[12.5px]">
                  <span className="text-fg">{t.parking.loss[k]}</span>
                  <span className="figure text-secondary">{t.parking.lossValue(String(loss.bays), grouped(loss.areaM2))}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11.5px] text-tertiary">{t.parking.standard(lp.standard.bayWidthM, lp.standard.bayLengthM, lp.standard.drivewayWidthM)}</p>
          </More>
          {folded.length > 0 ? (
            <More summary={folded.map((f) => f.label).join(' · ')}>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                {folded.map((f) => (
                  <Row key={f.key} label={f.label}>
                    <Traced value={f.value} />
                  </Row>
                ))}
              </dl>
            </More>
          ) : null}
          {lp.access.rejected.length > 0 ? (
            <More summary={t.parking.rejected(lp.access.rejected.length)}>
              <ul className="grid gap-1 text-[12px] text-secondary">
                {lp.access.rejected.map((r) => (
                  <li key={r.edgeSeq}>
                    <span className="figure me-1.5 text-tertiary">{r.edgeSeq}</span>
                    <EngineText>{r.reason}</EngineText>
                  </li>
                ))}
              </ul>
            </More>
          ) : null}
        </div>

        {onNext ? (
          <Footer>
            <NextStep label={t.studio.step.checks} onClick={onNext} />
          </Footer>
        ) : null}
      </div>
    </div>
  );
}
