import { useQuery } from '@tanstack/react-query';
import { FolderOpen, Plus, Search } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useMemo, useState } from 'react';

import { api, type Actor, type RunSummary } from '@web/api/client.js';

import { OutlineThumb } from '../components/PlotSketch.js';
import { TopBar } from '../components/Shell.js';
import { grouped, trimmed } from '../lib/figures.js';
import { useLocale } from '../lib/locale.js';
import { Link } from '../lib/nav.js';
import { Button } from '../ui/button.js';
import { followPointer } from '../ui/motion.js';
import { Badge, EmptyState, Input, Notice, Spinner } from '../ui/primitives.js';

/*
  THE STUDIES, AS A GRID OF PLOTS.

  Each card draws the plot and its setback line from the stored model and
  repeats the run's own figures. There is no total, no average and no score
  across studies: a sum of governing capacities on different plots is a number
  nobody computed and that means nothing.
*/
export function Studies({ actor }: { readonly actor: Actor }): JSX.Element {
  const { t, locale } = useLocale();
  const reduce = useReducedMotion();
  const [q, setQ] = useState('');
  const runs = useQuery({ queryKey: ['runs', actor.id], queryFn: () => api.listRuns(actor) });

  const shown = useMemo(() => {
    const all = runs.data?.runs ?? [];
    const needle = q.trim().toLowerCase();
    return needle ? all.filter((r) => `${r.plotNumber} ${r.community}`.toLowerCase().includes(needle)) : all;
  }, [runs.data, q]);

  const date = (iso: string): string =>
    new Intl.DateTimeFormat(locale === 'ar' ? 'ar-AE-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));

  return (
    <div className="flex min-h-full flex-col bg-base">
      <TopBar />
      <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-8 sm:px-6">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-1">
            <h1 className="text-[26px] font-light tracking-[-0.02em] text-fg">{t.studies.title}</h1>
            <p className="text-[13.5px] text-secondary">{t.studies.lede}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-tertiary" aria-hidden="true" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} aria-label={t.studies.search} placeholder={t.studies.searchPlaceholder} className="w-64 ps-8" />
            </div>
            <Button asChild variant="primary">
              <Link to="/studio">
                <Plus aria-hidden="true" />
                {t.shell.newStudy}
              </Link>
            </Button>
          </div>
        </header>

        {runs.isPending ? (
          <p className="flex items-center gap-2 text-secondary">
            <Spinner /> {t.studies.loading}
          </p>
        ) : runs.isError ? (
          <Notice>{(runs.error as Error).message}</Notice>
        ) : shown.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-panel">
            <EmptyState
              icon={<FolderOpen className="size-5" aria-hidden="true" />}
              title={q ? t.studies.noMatch : t.studies.emptyTitle}
              body={q ? t.studies.noMatchBody : t.studies.emptyBody}
              action={
                q ? null : (
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button asChild variant="primary">
                      <Link to="/studio?example=1">{t.landing.ctaExample}</Link>
                    </Button>
                    <Button asChild variant="secondary">
                      <Link to="/studio">{t.shell.newStudy}</Link>
                    </Button>
                  </div>
                )
              }
            />
          </div>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-3">
            {shown.map((r, i) => (
              <motion.li
                key={r.runId}
                initial={reduce ? false : { y: 10 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i, 12) * 0.025, ease: [0.22, 1, 0.36, 1] }}
              >
                <StudyCard run={r} date={date(r.createdAt)} />
              </motion.li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function StudyCard({ run, date }: { readonly run: RunSummary; readonly date: string }): JSX.Element {
  const { t } = useLocale();
  const band = run.governingBand as 'REGULATORY' | 'GEOMETRIC' | 'PARKING';
  const bandName = t.bands[band === 'REGULATORY' ? 'bandA' : band === 'GEOMETRIC' ? 'bandB' : 'bandC']?.name ?? run.governingBand;
  return (
    <Link
      to={`/studio/${run.runId}`}
      onPointerMove={followPointer}
      className="spotlight shadow-soft group grid h-full grid-rows-[160px_auto] overflow-hidden rounded-lg border border-line bg-panel transition-[border-color,transform] duration-200 ease-out hover:-translate-y-1 hover:border-strong motion-reduce:hover:translate-y-0"
    >
      <div className="canvas-grid relative border-b border-line p-5">
        {run.outline ? (
          <OutlineThumb plot={run.outline.plot} setback={run.outline.setback} label={t.studies.thumb(run.plotNumber)} />
        ) : (
          <p className="grid h-full place-items-center text-[12px] text-tertiary">{t.studies.noOutline}</p>
        )}
        <div className="absolute end-3 top-3 flex gap-1.5">
          {run.draftRules ? <Badge tone="neutral">{t.studies.draft}</Badge> : null}
          {run.assumptionCount > 0 ? <Badge tone="assumed">{t.studies.assumed(run.assumptionCount)}</Badge> : null}
        </div>
      </div>
      <div className="grid gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="figure truncate text-[14px] text-fg">{run.plotNumber}</p>
            <p className="truncate text-[12.5px] text-secondary">{run.community}</p>
          </div>
          <p className="shrink-0 text-[12px] text-tertiary">{date}</p>
        </div>
        <dl className="grid grid-cols-3 gap-2 border-t border-subtle pt-3">
          <div>
            <dt className="text-[11px] text-secondary">{t.studies.governing}</dt>
            <dd className="figure text-[13px] text-fg">
              {grouped(trimmed(run.governingGfaM2, 0))}
              <span className="ms-1 font-sans text-[11px] text-secondary">m²</span>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-secondary">{t.studies.band}</dt>
            <dd className="truncate text-[12.5px] text-fg">{bandName}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-secondary">{t.studies.levels}</dt>
            <dd className="figure text-[13px] text-fg">{run.levels}</dd>
          </div>
        </dl>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-secondary">
          <span>
            {run.invariants.ran === null ? t.studies.checksNone : t.studies.checks(run.invariants.ran, run.invariants.total)}
          </span>
          <span>{t.studies.gates(run.gatesSatisfied)}</span>
        </p>
      </div>
    </Link>
  );
}
