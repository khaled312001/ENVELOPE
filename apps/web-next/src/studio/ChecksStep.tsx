import { CircleCheck, CircleDashed, CircleX } from 'lucide-react';

import type { RunView } from '@web/api/client.js';

import { cn } from '../lib/cn.js';
import { engineNote } from '../lib/engine-notes.js';
import { EngineText, useLocale } from '../lib/locale.js';
import { Badge, PanelHeader } from '../ui/primitives.js';
import { AdvisorBox } from './AdvisorBox.js';
import { Footer, Heading, More, NextStep } from './parts.js';

/*
  THE CHECKS, WITH THE DENOMINATOR THAT MEANS SOMETHING.

  "Passed" is "nothing failed", not "everything was checked": a DORMANT check
  had no data and did not run, and it is drawn as an open circle with its own
  word, never as a tick. The five-way claim statement is the engine's own, in
  its own words, with regulatory validity last and never assessed.
*/
export function ChecksCanvas({ run }: { readonly run: RunView }): JSX.Element {
  const { t, locale } = useLocale();
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
                  {engineNote(r.observed, locale) ?? r.observed}
                  {r.expected !== null ? ` / ${engineNote(r.expected, locale) ?? r.expected}` : ''}
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

export function ChecksPanel({
  run,
  onNext,
}: {
  readonly run: RunView;
  /** Optional so a caller that does not wire it keeps working; when given, it is the panel's one primary action. */
  readonly onNext?: () => void;
}): JSX.Element {
  const { t } = useLocale();
  const inv = run.checks.invariants;
  const v = run.checks.validation;
  return (
    <div>
      <PanelHeader title={t.checks.title} />
      <div className="grid grid-cols-1 gap-6 p-4">
        {/* The answer: did anything fail, and how many checks actually ran. A check that did not run is not a pass. */}
        <section className="grid gap-3" aria-label={t.checks.title}>
          <p className="flex items-center gap-2 text-[18px] font-medium text-fg">
            {inv.passed ? (
              <CircleCheck className="size-5 shrink-0 text-secondary" aria-hidden="true" />
            ) : (
              <CircleX className="size-5 shrink-0 text-variance" aria-hidden="true" />
            )}
            <span className={inv.passed ? undefined : 'text-variance'}>{inv.passed ? t.checks.noneFailed : t.checks.failed}</span>
          </p>
          <p className="text-[12.5px] text-secondary">{t.checks.ran(inv.ran, inv.total, inv.dormant.length)}</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Fact label={t.checks.hardChecked} value={v.summary.hardChecked} />
            <Fact label={t.checks.hardViolated} value={v.summary.hardViolated} tone={v.summary.hardViolated > 0 ? 'variance' : undefined} />
          </dl>
        </section>

        {/* The five-way claim statement, in the engine's words, regulatory validity last and set apart. */}
        <section className="grid gap-2" aria-labelledby="claims">
          <Heading id="claims">{t.checks.claimsTitle}</Heading>
          <dl className="grid divide-y divide-subtle border-y border-subtle">
            {CLAIMS.map((k) =>
              k === 'regulatoryValidity' ? null : (
                <div key={k} className="grid gap-1 py-2">
                  <dt className="flex items-baseline justify-between gap-2 text-[12.5px] font-medium text-fg">
                    {t.checks.claim[k]}
                    <EngineText className="figure text-[11px] text-secondary">{v.claims[k].status}</EngineText>
                  </dt>
                  <dd className="text-[12px] leading-relaxed text-secondary">
                    <EngineText>{v.claims[k].detail}</EngineText>
                  </dd>
                </div>
              ),
            )}
          </dl>
          <dl className="grid gap-1 rounded-md border border-strong bg-raised p-3">
            <dt className="flex items-baseline justify-between gap-2 text-[13px] font-semibold text-fg">
              {t.checks.claim.regulatoryValidity}
              <EngineText className="figure not-assessed text-[11.5px] text-fg">{v.claims.regulatoryValidity.status}</EngineText>
            </dt>
            <dd className="text-[12px] leading-relaxed text-secondary">
              <EngineText>{v.claims.regulatoryValidity.detail}</EngineText>
            </dd>
          </dl>
        </section>

        <More summary={t.checks.validation}>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Fact label={t.checks.notEvaluable} value={v.summary.hardNotEvaluable} />
            <Fact label={t.checks.deferred} value={v.summary.deferredDeclared} />
            <Fact label={t.checks.lifeSafety} value={v.summary.lifeSafetyDeferred} />
          </dl>
          <EngineText className="block text-[12px] leading-relaxed text-secondary">{v.selfConsistencyNotice}</EngineText>
          <EngineText className="block text-[11.5px] leading-relaxed text-tertiary">{v.independenceLimit}</EngineText>
        </More>

        <AdvisorBox ask={{ step: 'checks', runId: run.runId }} />

        {onNext ? (
          <Footer>
            <NextStep label={t.studio.step.export} onClick={onNext} />
          </Footer>
        ) : null}
      </div>
    </div>
  );
}

function Fact({ label, value, tone }: { readonly label: string; readonly value: number; readonly tone?: 'variance' | undefined }): JSX.Element {
  return (
    <div className="grid content-start gap-0.5">
      <dt className="text-[11.5px] text-secondary">{label}</dt>
      <dd className={cn('figure text-[18px] font-medium', tone === 'variance' ? 'text-variance' : 'text-fg')}>{value}</dd>
    </div>
  );
}
