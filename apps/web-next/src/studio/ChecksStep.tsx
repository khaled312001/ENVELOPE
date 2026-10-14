import { CircleCheck, CircleDashed, CircleX } from 'lucide-react';

import type { RunView } from '@web/api/client.js';

import { cn } from '../lib/cn.js';
import { EngineText, useLocale } from '../lib/locale.js';
import { Badge, PanelHeader } from '../ui/primitives.js';

/*
  THE CHECKS, WITH THE DENOMINATOR THAT MEANS SOMETHING.

  "Passed" is "nothing failed", not "everything was checked": a DORMANT check
  had no data and did not run, and it is drawn as an open circle with its own
  word, never as a tick. The five-way claim statement is the engine's own, in
  its own words, with regulatory validity last and never assessed.
*/
export function ChecksCanvas({ run }: { readonly run: RunView }): JSX.Element {
  const { t } = useLocale();
  const inv = run.checks.invariants;
  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto grid max-w-4xl gap-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[20px] font-light text-fg">{t.checks.title}</h2>
            <p className="text-[13px] text-secondary">{t.checks.ran(inv.ran, inv.total, inv.dormant.length)}</p>
          </div>
          <Badge tone={inv.passed ? 'neutral' : 'variance'}>{inv.passed ? t.checks.noneFailed : t.checks.failed}</Badge>
        </header>
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-2">
          {inv.results.map((r) => (
            <li
              key={r.id}
              className={cn(
                'grid gap-1.5 rounded-md border bg-panel p-3',
                r.status === 'FAIL' ? 'border-variance/60' : r.status === 'DORMANT' ? 'border-dashed border-line' : 'border-line',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="figure text-[12px] text-fg">{r.id}</span>
                <span className={cn('flex items-center gap-1 text-[11.5px]', r.status === 'FAIL' ? 'text-variance' : 'text-secondary')}>
                  {r.status === 'PASS' ? (
                    <CircleCheck className="size-3.5" aria-hidden="true" />
                  ) : r.status === 'FAIL' ? (
                    <CircleX className="size-3.5" aria-hidden="true" />
                  ) : (
                    <CircleDashed className="size-3.5" aria-hidden="true" />
                  )}
                  {t.checks.status[r.status]}
                </span>
              </div>
              <EngineText className="text-[12px] leading-relaxed text-secondary">{r.statement}</EngineText>
              {r.observed !== null ? (
                <p className="figure text-[11px] !whitespace-normal break-words text-tertiary">
                  {r.observed}
                  {r.expected !== null ? ` / ${r.expected}` : ''}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        <EngineText className="text-[12px] leading-relaxed text-tertiary">{inv.dormantNote}</EngineText>
      </div>
    </div>
  );
}

const CLAIMS = ['selfConsistency', 'ruleCoverage', 'geometricValidity', 'professionalAgreement', 'regulatoryValidity'] as const;

export function ChecksPanel({ run }: { readonly run: RunView }): JSX.Element {
  const { t } = useLocale();
  const v = run.checks.validation;
  return (
    <div>
      <PanelHeader title={t.checks.claimsTitle} hint={t.checks.claimsHint} />
      <div className="grid grid-cols-1 gap-4 p-4">
        <dl className="grid gap-2">
          {CLAIMS.map((k) => (
            <div key={k} className={cn('grid gap-1 rounded-md border p-3', k === 'regulatoryValidity' ? 'border-strong bg-raised' : 'border-line bg-base')}>
              <dt className="flex items-center justify-between gap-2 text-[12.5px] font-medium text-fg">
                {t.checks.claim[k]}
                <EngineText className={cn('figure text-[11px]', k === 'regulatoryValidity' ? 'not-assessed text-fg' : 'text-secondary')}>{v.claims[k].status}</EngineText>
              </dt>
              <dd className="text-[12px] leading-relaxed text-secondary">
                <EngineText>{v.claims[k].detail}</EngineText>
              </dd>
            </div>
          ))}
        </dl>
        <section className="grid gap-1.5 text-[12px]">
          <h3 className="font-medium text-fg">{t.checks.validation}</h3>
          <dl className="grid grid-cols-2 gap-2">
            <Fact label={t.checks.hardChecked} value={v.summary.hardChecked} />
            <Fact label={t.checks.hardViolated} value={v.summary.hardViolated} tone={v.summary.hardViolated > 0 ? 'variance' : undefined} />
            <Fact label={t.checks.notEvaluable} value={v.summary.hardNotEvaluable} />
            <Fact label={t.checks.deferred} value={v.summary.deferredDeclared} />
            <Fact label={t.checks.lifeSafety} value={v.summary.lifeSafetyDeferred} />
          </dl>
        </section>
        <EngineText className="block rounded-md border border-line bg-base p-3 text-[12px] leading-relaxed text-secondary">{v.selfConsistencyNotice}</EngineText>
        <EngineText className="block text-[11.5px] leading-relaxed text-tertiary">{v.independenceLimit}</EngineText>
      </div>
    </div>
  );
}

function Fact({ label, value, tone }: { readonly label: string; readonly value: number; readonly tone?: 'variance' | undefined }): JSX.Element {
  return (
    <div className="rounded-md border border-line bg-base px-2.5 py-2">
      <dt className="text-[11px] text-secondary">{label}</dt>
      <dd className={cn('figure text-[15px]', tone === 'variance' ? 'text-variance' : 'text-fg')}>{value}</dd>
    </div>
  );
}
