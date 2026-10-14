import type { BuildingModel } from '@envelope/core';
import { ArrowRight, Box, CircleSlash, FileStack, Layers, ScrollText, Waypoints } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router';

import { LIMITS } from '@web/content/shared.js';
import { LIMITS_AR } from '@web/content/shared.ar.js';
import { AR as LANDING_AR } from '@web/i18n/landing.ar.js';
import { EN as LANDING_EN } from '@web/i18n/landing.en.js';
import building from '@web/screens/worked-example.building.json';
import worked from '@web/screens/worked-example.json';

// three.js is most of the page's weight; the words and figures paint before it arrives.
const Massing3D = lazy(() => import('../components/Massing3D.js').then((m) => ({ default: m.Massing3D })));
import { RegulatoryStamp, TopBar } from '../components/Shell.js';
import { cn } from '../lib/cn.js';
import { grouped } from '../lib/figures.js';
import { EngineText, useLocale } from '../lib/locale.js';
import { Button } from '../ui/button.js';

/*
  THE LANDING PAGE IS UNDER THE SAME DISCIPLINE AS A REPORT.

  No figure on it is typed by a person: every one is read from
  `worked-example.json`, which `scripts/verify-worked-example.mjs` writes from a
  real run and `pnpm example` re-verifies. The formulas shown are the engine's
  own `formula` strings. The building turning in the hero is that run's
  BuildingModel, drawn by `@envelope/massing` — the same scene the studio shows.

  The five-way claim statement is here in §16.5's order, worded by the copy the
  current site already carries (so the two cannot drift), and "what it does not
  do" is a longer list than the feature list.
*/

const v = worked.verified;
const model = building as unknown as BuildingModel;
const GRID_MM = '1';

const BAND = {
  REGULATORY: { key: 'bandA', letter: 'A', value: v.bandAM2 },
  GEOMETRIC: { key: 'bandB', letter: 'B', value: v.bandBM2 },
  PARKING: { key: 'bandC', letter: 'C', value: v.bandCM2 },
} as const;

function Reveal({ children, className, delay = 0 }: { readonly children: React.ReactNode; readonly className?: string; readonly delay?: number }): JSX.Element {
  const reduce = useReducedMotion();
  // Transform only, never opacity from zero: content a scroll animation has not
  // reached must still be there on paper and in a full-page screenshot.
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { y: 18 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

export function Landing(): JSX.Element {
  const { t, locale } = useLocale();
  const L = locale === 'ar' ? LANDING_AR : LANDING_EN;
  const limits = locale === 'ar' ? LIMITS_AR : LIMITS;
  const [webgl, setWebgl] = useState(true);
  const governing = v.governingBand as keyof typeof BAND;

  return (
    <div className="min-h-full bg-base">
      <TopBar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="canvas-grid absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-[1320px] gap-8 px-4 pt-12 pb-10 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-6 lg:pt-16">
          <div className="grid content-start gap-6">
            <p className="figure text-[12px] tracking-[0.12em] text-accent-strong uppercase">{t.landing.eyebrow}</p>
            <h1 className="text-[40px] leading-[1.05] font-light tracking-[-0.03em] text-fg sm:text-[52px]">{t.landing.title}</h1>
            <p className="max-w-xl text-[16px] leading-relaxed text-secondary">{t.landing.lede}</p>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button asChild variant="primary" size="lg">
                <Link to="/studio?example=1">
                  {t.landing.ctaExample}
                  <ArrowRight className="rtl:-scale-x-100" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link to="/studio">{t.landing.ctaStudio}</Link>
              </Button>
            </div>
            <RegulatoryStamp className="justify-self-start" />
          </div>

          <figure className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-line bg-sunken shadow-[0_40px_120px_-40px_rgb(0_0_0/0.9)] lg:aspect-[16/11]">
              {webgl ? (
                <Suspense fallback={null}>
                  <Massing3D model={model} autoRotate onFailed={() => setWebgl(false)} />
                </Suspense>
              ) : (
                <p className="grid h-full place-items-center p-6 text-center text-secondary">{t.landing.noWebgl}</p>
              )}
              <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-2 p-3">
                <span className="rounded-sm border border-line bg-panel/90 px-2 py-1 text-[11.5px] text-secondary">
                  <span className="figure text-fg">{worked.input.plot.plotNumber}</span> · {worked.input.plot.community}
                </span>
                <span className="hidden rounded-sm border border-line bg-panel/90 px-2 py-1 font-mono text-[11.5px] text-secondary sm:inline">
                  {t.landing.carsDrawn(String(v.exports.cars.engine))}
                </span>
              </div>
            </div>
            <figcaption className="mt-2.5 text-[12.5px] text-secondary">{t.landing.heroCaption}</figcaption>
          </figure>
        </div>

        {/* The worked example's figures, as the engine returned them. */}
        <div className="relative border-t border-line bg-panel/80">
          <dl className="mx-auto grid max-w-[1320px] grid-cols-2 gap-px sm:grid-cols-4">
            {[
              { k: t.landing.figGoverning, val: grouped(v.governingGfaM2), unit: 'm²', accent: true },
              { k: t.landing.figBand, val: BAND[governing].letter, unit: t.bands[BAND[governing].key].name },
              { k: t.landing.figLevels, val: v.levels, unit: '' },
              { k: t.landing.figPlot, val: grouped(v.plotAreaM2), unit: 'm²' },
            ].map((f) => (
              <div key={f.k} className="grid gap-1 px-4 py-4 sm:px-6">
                <dt className="text-[12px] text-secondary">{f.k}</dt>
                <dd className={cn('figure text-[22px] font-light tracking-[-0.01em]', f.accent ? 'text-fg' : 'text-fg')}>
                  {f.val}
                  {f.unit ? <span className="ms-1.5 font-sans text-[12px] text-secondary">{f.unit}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Three bands ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1320px] px-4 py-16 sm:px-6">
        <Reveal className="mb-8 grid max-w-2xl gap-3">
          <h2 className="text-[28px] font-light tracking-[-0.02em] text-fg">{t.landing.bandsTitle}</h2>
          <p className="text-[15px] leading-relaxed text-secondary">{t.landing.bandsLede}</p>
        </Reveal>
        <div className="grid gap-3 md:grid-cols-3">
          {(Object.keys(BAND) as (keyof typeof BAND)[]).map((b, i) => {
            const band = BAND[b];
            const isGov = b === governing;
            return (
              <Reveal key={b} delay={i * 0.06}>
                <article className={cn('grid h-full gap-4 rounded-lg border p-5', isGov ? 'border-accent/60 bg-accent-subtle/40' : 'border-line bg-panel')}>
                  <header className="flex items-center justify-between gap-2">
                    <span className="figure grid size-8 place-items-center rounded-md border border-strong text-[14px] text-fg">{band.letter}</span>
                    {isGov ? (
                      <span className="rounded-sm border border-accent/50 px-1.5 py-px text-[11px] font-medium text-accent-strong">{t.landing.governs}</span>
                    ) : null}
                  </header>
                  <div>
                    <h3 className="text-[15px] font-medium text-fg">{t.bands[band.key].name}</h3>
                    <p className="mt-1 text-[13px] text-secondary">{t.bands[band.key].question}</p>
                  </div>
                  <p className="figure text-[26px] font-light text-fg">
                    {grouped(band.value)}
                    <span className="ms-1.5 font-sans text-[12px] text-secondary">m²</span>
                  </p>
                  <p dir="ltr" className="figure border-t border-subtle pt-3 text-start text-[11.5px] leading-relaxed !whitespace-normal break-words text-tertiary">
                    {v.formulas[band.key]}
                  </p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ── What the studio holds ────────────────────────────────────────── */}
      <section className="border-y border-line bg-panel">
        <div className="mx-auto grid max-w-[1320px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <Reveal className="grid content-start gap-3">
            <h2 className="text-[28px] font-light tracking-[-0.02em] text-fg">{t.landing.flowTitle}</h2>
            <p className="text-[15px] leading-relaxed text-secondary">{t.landing.flowLede}</p>
          </Reveal>
          <ol className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
            {[
              { icon: Waypoints, ...t.landing.flow.plot },
              { icon: ScrollText, ...t.landing.flow.rules },
              { icon: Box, ...t.landing.flow.capacity },
              { icon: Layers, ...t.landing.flow.parking },
              { icon: FileStack, ...t.landing.flow.export },
              { icon: CircleSlash, ...t.landing.flow.refuse },
            ].map((s, i) => (
              <li key={s.title} className="grid content-start gap-2 bg-panel p-5">
                <div className="flex items-center gap-2.5">
                  <s.icon className="size-4 text-accent" aria-hidden="true" />
                  <span className="figure text-[11px] text-tertiary">0{i + 1}</span>
                </div>
                <h3 className="text-[14.5px] font-medium text-fg">{s.title}</h3>
                <p className="text-[13px] leading-relaxed text-secondary">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── The five-way claim statement, §16.5's order ──────────────────── */}
      <section className="mx-auto max-w-[1320px] px-4 py-16 sm:px-6">
        <Reveal className="mb-8 grid max-w-2xl gap-3">
          <h2 className="text-[28px] font-light tracking-[-0.02em] text-fg">{L.claims.title}</h2>
          <p className="text-[15px] leading-relaxed text-secondary">{L.claims.lede}</p>
        </Reveal>
        <dl className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-panel">
          {[
            { c: L.claims.selfConsistency, body: L.claims.selfConsistency.body, tone: 'ok' },
            {
              c: L.claims.coverage,
              body: (
                <>
                  {L.claims.coverage.bodyBefore}
                  <em>{L.claims.coverage.bodyEmphasis}</em>
                  {L.claims.coverage.bodyAfter}
                </>
              ),
              tone: 'partial',
            },
            { c: L.claims.geometry, body: L.claims.geometry.body(GRID_MM), tone: 'ok' },
            { c: L.claims.judgement, body: L.claims.judgement.body, tone: 'none' },
            { c: L.claims.regulatory, body: L.claims.regulatory.body, tone: 'never' },
          ].map(({ c, body, tone }) => (
            <div key={c.title} className="grid gap-2 px-5 py-4 md:grid-cols-[16rem_12rem_minmax(0,1fr)] md:gap-6">
              <dt className="text-[14px] font-medium text-fg">{c.title}</dt>
              <dd className={cn('text-[13px] font-medium', tone === 'never' ? 'not-assessed text-fg' : 'text-secondary')}>{c.status}</dd>
              <dd className="text-[13px] leading-relaxed text-secondary">{body}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── What it does not do ──────────────────────────────────────────── */}
      <section className="border-t border-line bg-panel">
        <div className="mx-auto max-w-[1320px] px-4 py-16 sm:px-6">
          <Reveal className="mb-8 grid max-w-2xl gap-3">
            <h2 className="text-[28px] font-light tracking-[-0.02em] text-fg">{L.limits.title}</h2>
            <p className="text-[15px] leading-relaxed text-secondary">{L.limits.lede}</p>
          </Reveal>
          <ul className="grid gap-3 md:grid-cols-2">
            {limits.map((l) => (
              <li key={l.id} className="grid gap-2 rounded-lg border border-line bg-base p-5">
                <p className="flex items-start gap-2.5 text-[14.5px] font-medium text-fg">
                  <CircleSlash className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
                  {l.heading}
                </p>
                <div className="ps-6.5 text-[13px] leading-relaxed text-secondary">{l.body}</div>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[13px] text-secondary">{L.limits.after}</p>
        </div>
      </section>

      {/* ── Readiness ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1320px] px-4 py-16 sm:px-6">
        <div className="grid gap-5 rounded-lg border border-line bg-panel p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="grid gap-2">
            <h2 className="text-[20px] font-light text-fg">{L.readiness.title}</h2>
            <p className="max-w-3xl text-[13.5px] leading-relaxed text-secondary">{L.readiness.body}</p>
          </div>
          <Button asChild variant="primary" size="lg">
            <Link to="/studio?example=1">{t.landing.ctaExample}</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-[12px] text-secondary sm:px-6">
          <span>{t.landing.footer}</span>
          <EngineText className="not-assessed">REGULATORY VALIDITY: NOT ASSESSED</EngineText>
        </div>
      </footer>
    </div>
  );
}
