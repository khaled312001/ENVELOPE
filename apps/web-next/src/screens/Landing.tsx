import type { BuildingModel } from '@envelope/core';
import {
  ArrowRight,
  Box,
  CircleSlash,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  FileStack,
  FileText,
  Layers,
  MessageCircleQuestion,
  ScrollText,
  ShieldOff,
  Sparkles,
  Waypoints,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { lazy, Suspense, useState } from 'react';

import { LIMITS } from '@web/content/shared.js';
import { LIMITS_AR } from '@web/content/shared.ar.js';
import { AR as LANDING_AR } from '@web/i18n/landing.ar.js';
import { EN as LANDING_EN } from '@web/i18n/landing.en.js';
import building from '@web/screens/worked-example.building.json';
import worked from '@web/screens/worked-example.json';

import { RegulatoryStamp } from '../components/Shell.js';
import { cn } from '../lib/cn.js';
import { grouped } from '../lib/figures.js';
import { useLocale } from '../lib/locale.js';
import { Link } from '../lib/nav.js';
import { SectionHead, SitePage, useSite } from '../site/Site.js';
import { Button } from '../ui/button.js';
import { arrive, EASE, followPointer, Item, Spotlight, Stagger } from '../ui/motion.js';

// three.js is most of the page's weight; the words and figures paint before it arrives.
const Massing3D = lazy(() => import('../components/Massing3D.js').then((m) => ({ default: m.Massing3D })));

/*
  THE LANDING PAGE IS UNDER THE SAME DISCIPLINE AS A REPORT.

  No figure on it is typed by a person: every one is read from
  `worked-example.json`, which `scripts/verify-worked-example.mjs` writes from a
  real run and `pnpm example` re-verifies. The formulas shown are the engine's
  own `formula` strings. The building turning in the hero is that run's
  BuildingModel, drawn by `@envelope/massing` — the same scene the studio shows.

  The motion is the brand's, never the figures': chips float, borders turn and
  lines draw, but a number arrives whole. The five-way claim statement is here in
  §16.5's order, worded by the copy the current site already carries, and "what
  it does not do" is a longer list than the feature list.
*/

const v = worked.verified;
const model = building as unknown as BuildingModel;
const GRID_MM = '1';

const BAND = {
  REGULATORY: { key: 'bandA', letter: 'A', value: v.bandAM2 },
  GEOMETRIC: { key: 'bandB', letter: 'B', value: v.bandBM2 },
  PARKING: { key: 'bandC', letter: 'C', value: v.bandCM2 },
} as const;

/** A figure off the worked example, floating beside the model. Decoration moves; the figure does not change. */
function FloatChip({ className, delay, children }: { readonly className: string; readonly delay: number; readonly children: React.ReactNode }): JSX.Element {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={cn('absolute z-10 hidden rounded-lg border border-line bg-panel/90 px-3 py-2 shadow-soft backdrop-blur-md md:block', className)}
      initial={reduce ? false : { opacity: 0, y: 12, scale: 0.96 }}
      animate={reduce ? {} : { opacity: 1, y: [0, -6, 0], scale: 1 }}
      transition={{ opacity: { delay, duration: 0.6 }, scale: { delay, duration: 0.6, ease: EASE }, y: { delay: delay + 0.6, duration: 5, repeat: Infinity, ease: 'easeInOut' } }}
    >
      {children}
    </motion.div>
  );
}

export function Landing(): JSX.Element {
  const { t, locale } = useLocale();
  const s = useSite();
  const L = locale === 'ar' ? LANDING_AR : LANDING_EN;
  const reduce = useReducedMotion();
  const [webgl, setWebgl] = useState(true);
  const governing = v.governingBand as keyof typeof BAND;
  const max = Math.max(...Object.values(BAND).map((b) => Number(b.value)));

  return (
    <SitePage path="/">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="canvas-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_70%_40%,black,transparent_75%)]" aria-hidden="true" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="aurora -top-24 end-[-8%] size-[520px] bg-accent" />
          <div className="aurora top-40 end-[22%] size-[380px] bg-brand-alt [animation-delay:-6s]" />
          <div className="aurora -bottom-32 end-[2%] size-[340px] bg-brand-glow [animation-delay:-12s]" />
        </div>

        <div className="relative mx-auto grid max-w-[1320px] gap-10 px-4 pt-14 pb-14 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-8 lg:pt-20">
          <Stagger onMount gap={0.09} className="grid content-start gap-6">
            <Item variants={arrive}>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel/80 py-1 ps-1 pe-3 text-[12px] text-secondary shadow-soft backdrop-blur">
                <span className="grid size-5 place-items-center rounded-full bg-linear-to-br from-accent to-brand-alt text-on-brand">
                  <Sparkles className="size-3" aria-hidden="true" />
                </span>
                {t.landing.eyebrow}
              </span>
            </Item>
            <Item variants={arrive}>
              <h1 className="text-[42px] leading-[1.04] font-light tracking-[-0.035em] text-fg sm:text-[58px]">
                {t.landing.titleA} <span className="text-brand font-normal">{t.landing.titleB}</span>
              </h1>
            </Item>
            <Item variants={arrive}>
              <p className="max-w-xl text-[16.5px] leading-relaxed text-secondary">{t.landing.lede}</p>
            </Item>
            <Item variants={arrive} className="flex flex-wrap items-center gap-3">
              <Button asChild variant="brand" size="lg" className="group">
                <Link to="/studio?example=1">
                  {t.landing.ctaExample}
                  <ArrowRight className="transition-transform duration-200 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link to="/studio">{t.landing.ctaStudio}</Link>
              </Button>
            </Item>
            <Item variants={arrive}>
              <RegulatoryStamp className="justify-self-start" />
            </Item>
          </Stagger>

          <motion.figure
            className="relative"
            initial={reduce ? false : { opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 0.15 }}
          >
            <div className="ring-brand shadow-lifted rounded-xl">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-sunken lg:aspect-[16/11]">
                <div className="canvas-grid absolute inset-0 opacity-70" aria-hidden="true" />
                {webgl ? (
                  <Suspense fallback={null}>
                    <Massing3D model={model} autoRotate onFailed={() => setWebgl(false)} />
                  </Suspense>
                ) : (
                  <p className="relative grid h-full place-items-center p-6 text-center text-secondary">{t.landing.noWebgl}</p>
                )}
                <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-2 p-3">
                  <span className="rounded-md border border-line bg-panel/90 px-2 py-1 text-[11.5px] text-secondary backdrop-blur">
                    <span className="figure text-fg">{worked.input.plot.plotNumber}</span> · {worked.input.plot.community}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-md border border-line bg-panel/90 px-2 py-1 text-[11.5px] text-secondary backdrop-blur">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex size-full animate-pulse-ring rounded-full bg-accent" />
                      <span className="relative inline-flex size-2 rounded-full bg-accent" />
                    </span>
                    {t.landing.live}
                  </span>
                </div>
              </div>
            </div>
            <FloatChip className="-start-6 top-[38%]" delay={0.9}>
              <p className="text-[11px] text-secondary">{t.landing.figGoverning}</p>
              <p className="figure text-[17px] text-fg">
                {grouped(v.governingGfaM2)} <span className="font-sans text-[11px] text-secondary">m²</span>
              </p>
            </FloatChip>
            <FloatChip className="-end-4 bottom-[18%]" delay={1.15}>
              <p className="text-[11px] text-secondary">{t.landing.carsTitle}</p>
              <p className="figure text-[17px] text-fg">{String(v.exports.cars.engine)}</p>
            </FloatChip>
            <figcaption className="mt-4 text-[12.5px] text-secondary">{t.landing.heroCaption}</figcaption>
          </motion.figure>
        </div>

        {/* The worked example's figures, as the engine returned them. */}
        <div className="relative border-t border-line bg-panel/70 backdrop-blur">
          <Stagger as="dl" className="mx-auto grid max-w-[1320px] grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x rtl:sm:divide-x-reverse">
            {[
              { k: t.landing.figGoverning, val: grouped(v.governingGfaM2), unit: 'm²' },
              { k: t.landing.figBand, val: BAND[governing].letter, unit: t.bands[BAND[governing].key].name },
              { k: t.landing.figLevels, val: v.levels, unit: '' },
              { k: t.landing.figPlot, val: grouped(v.plotAreaM2), unit: 'm²' },
            ].map((f) => (
              <Item key={f.k} className="grid gap-1 px-4 py-5 sm:px-6">
                <dt className="text-[12px] text-secondary">{f.k}</dt>
                <dd className="figure text-[24px] font-light tracking-[-0.01em] text-fg">
                  {f.val}
                  {f.unit ? <span className="ms-1.5 font-sans text-[12px] text-secondary">{f.unit}</span> : null}
                </dd>
              </Item>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── Three bands ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1320px] px-4 py-20 sm:px-6">
        <SectionHead eyebrow={t.landing.bandsEyebrow} title={t.landing.bandsTitle} lede={t.landing.bandsLede} />
        <Stagger className="grid gap-4 md:grid-cols-3" gap={0.08}>
          {(Object.keys(BAND) as (keyof typeof BAND)[]).map((b) => {
            const band = BAND[b];
            const isGov = b === governing;
            return (
              <Item key={b} as="article" className="h-full">
                <motion.div whileHover={reduce ? {} : { y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className="h-full">
                  <Spotlight className={cn('grid h-full gap-5 rounded-xl border bg-panel p-6 shadow-soft', isGov ? 'ring-brand border-transparent' : 'border-line')}>
                    <header className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'figure grid size-9 place-items-center rounded-lg text-[15px]',
                          isGov ? 'bg-linear-to-br from-brand-solid to-brand-alt-solid text-on-brand' : 'border border-strong text-fg',
                        )}
                      >
                        {band.letter}
                      </span>
                      {isGov ? (
                        <span className="rounded-full border border-accent/40 bg-accent-subtle px-2.5 py-0.5 text-[11.5px] font-medium text-accent-strong">{t.landing.governs}</span>
                      ) : null}
                    </header>
                    <div>
                      <h3 className="text-[16px] font-medium text-fg">{t.bands[band.key].name}</h3>
                      <p className="mt-1 text-[13px] text-secondary">{t.bands[band.key].question}</p>
                    </div>
                    <div className="grid gap-2">
                      <p className="figure text-[30px] font-light text-fg">
                        {grouped(band.value)}
                        <span className="ms-1.5 font-sans text-[12px] text-secondary">m²</span>
                      </p>
                      {/* The bar's length is the one place a figure becomes a number, and only to draw the bar. */}
                      <div className="h-1.5 overflow-hidden rounded-full bg-raised" aria-hidden="true">
                        <motion.div
                          className={cn('h-full origin-left rounded-full rtl:origin-right', isGov ? 'bg-linear-to-r from-accent to-brand-alt' : 'bg-strong')}
                          style={{ width: `${(Number(band.value) / max) * 100}%` }}
                          initial={reduce ? false : { scaleX: 0 }}
                          whileInView={{ scaleX: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.1, ease: EASE, delay: 0.2 }}
                        />
                      </div>
                    </div>
                    <p dir="ltr" className="figure border-t border-subtle pt-3 text-start text-[11.5px] leading-relaxed !whitespace-normal break-words text-tertiary">
                      {v.formulas[band.key]}
                    </p>
                  </Spotlight>
                </motion.div>
              </Item>
            );
          })}
        </Stagger>
      </section>

      {/* ── The flow, as a line that draws itself ────────────────────────── */}
      <section className="relative overflow-hidden border-y border-line bg-panel">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="aurora -start-40 top-10 size-[420px] bg-brand-alt opacity-[calc(var(--glow-strength)*0.6)]" />
        </div>
        <div className="relative mx-auto max-w-[1320px] px-4 py-20 sm:px-6">
          <SectionHead eyebrow={t.landing.flowEyebrow} title={t.landing.flowTitle} lede={t.landing.flowLede} />
          <FlowLine />
        </div>
      </section>

      {/* ── What it writes ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1320px] px-4 py-20 sm:px-6">
        <SectionHead eyebrow={t.landing.outEyebrow} title={t.landing.outTitle} lede={t.landing.outLede} />
        <FileGrid />
        <p className="mt-5 text-[12.5px] text-secondary">{t.landing.parity(String(v.exports.cars.engine))}</p>
      </section>

      {/* ── The rest of the site, one layer down each ────────────────────── */}
      <section className="border-t border-line bg-panel">
        <div className="mx-auto max-w-[1320px] px-4 py-20 sm:px-6">
          <SectionHead eyebrow={s.home.pagesEyebrow} title={s.home.pagesTitle} lede={s.home.pagesLede} />
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" gap={0.06}>
            {(
              [
                ['/product', 'product', Box],
                ['/parking', 'parking', Layers],
                ['/method', 'method', Waypoints],
                ['/exports', 'exports', FileStack],
                ['/limits', 'limits', CircleSlash],
                ['/faq', 'faq', MessageCircleQuestion],
              ] as const
            ).map(([to, key, Icon]) => (
              <Item key={to} className="h-full">
                <Link
                  to={to}
                  onPointerMove={followPointer}
                  className="spotlight shadow-soft group grid h-full content-start gap-3 rounded-xl border border-line bg-base p-6 transition-[border-color,transform] duration-200 hover:-translate-y-1 hover:border-strong motion-reduce:hover:translate-y-0"
                >
                  <span className="grid size-10 place-items-center rounded-lg bg-linear-to-br from-brand-solid to-brand-alt-solid text-on-brand transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="text-[16px] font-medium text-fg">{s.home.cards[key].title}</h3>
                  <p className="text-[13.5px] leading-relaxed text-secondary">{s.home.cards[key].body}</p>
                  <span className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-accent">
                    {s.home.explore}
                    <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" aria-hidden="true" />
                  </span>
                </Link>
              </Item>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── The five-way claim statement, §16.5's order ──────────────────── */}
      <section className="mx-auto max-w-[1320px] px-4 py-20 sm:px-6">
        <SectionHead eyebrow={t.landing.claimsEyebrow} title={L.claims.title} lede={L.claims.lede} />
        <ClaimsList />
      </section>

      {/* ── What it does not do ──────────────────────────────────────────── */}
      <section className="border-y border-line bg-panel">
        <div className="mx-auto max-w-[1320px] px-4 py-20 sm:px-6">
          <SectionHead eyebrow={t.landing.limitsEyebrow} title={L.limits.title} lede={L.limits.lede} />
          <LimitsList />
        </div>
      </section>

      {/* ── Where this deployment stands — said before anything is sold ──── */}
      <section className="mx-auto max-w-[1320px] px-4 pt-20 sm:px-6">
        <Readiness />
      </section>
    </SitePage>
  );
}

/** The five-way claim statement, in §16.5's order, worded by the copy the current site carries. */
export function ClaimsList(): JSX.Element {
  const { locale } = useLocale();
  const L = locale === 'ar' ? LANDING_AR : LANDING_EN;
  return (
          <Stagger as="dl" className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel shadow-soft">
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
              <Item key={c.title} className="grid gap-2 px-6 py-5 transition-colors hover:bg-raised md:grid-cols-[16rem_12rem_minmax(0,1fr)] md:gap-6">
                <dt className="text-[14.5px] font-medium text-fg">{c.title}</dt>
                <dd>
                  <span
                    className={cn(
                      'inline-flex rounded-full border px-2.5 py-0.5 text-[12px] font-medium',
                      tone === 'never' ? 'not-assessed border-strong text-fg' : tone === 'ok' ? 'border-accent/40 bg-accent-subtle text-accent-strong' : 'border-line text-secondary',
                    )}
                  >
                    {c.status}
                  </span>
                </dd>
                <dd className="text-[13.5px] leading-relaxed text-secondary">{body}</dd>
              </Item>
            ))}
          </Stagger>
  );
}

/** "What it does not do" — the whole list, from the copy the current site carries. */
export function LimitsList(): JSX.Element {
  const { locale } = useLocale();
  const L = locale === 'ar' ? LANDING_AR : LANDING_EN;
  const limits = locale === 'ar' ? LIMITS_AR : LIMITS;
  return (
    <>
      <Stagger as="ul" className="grid gap-3 md:grid-cols-2" gap={0.05}>
        {limits.map((l) => (
          <Item key={l.id} as="li">
            <Spotlight className="grid h-full gap-2 rounded-xl border border-line bg-base p-5 shadow-soft">
              <p className="flex items-start gap-2.5 text-[14.5px] font-medium text-fg">
                <CircleSlash className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
                {l.heading}
              </p>
              <div className="ps-6.5 text-[13px] leading-relaxed text-secondary">{l.body}</div>
            </Spotlight>
          </Item>
        ))}
      </Stagger>
      <p className="mt-6 text-[13px] text-secondary">{L.limits.after}</p>
    </>
  );
}

/** The six files the engine writes, each from the one building model. */
export function FileGrid(): JSX.Element {
  const { t } = useLocale();
  return (
    <Stagger className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-3" gap={0.06}>
      {(
        [
          ['html', FileText],
          ['sheets', Layers],
          ['dxf', FileCode2],
          ['glb', Box],
          ['xlsx', FileSpreadsheet],
          ['json', FileJson],
        ] as const
      ).map(([f, Icon]) => (
        <Item key={f}>
          <Spotlight className="group grid h-full gap-2 rounded-xl border border-line bg-panel p-5 shadow-soft transition-colors hover:border-strong">
            <span className="grid size-9 place-items-center rounded-lg bg-accent-subtle text-accent transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
              <Icon className="size-4.5" aria-hidden="true" />
            </span>
            <h3 className="text-[14px] font-medium text-fg">{t.exports.file[f].name}</h3>
            <p className="text-[12.5px] leading-relaxed text-secondary">{t.exports.file[f].body}</p>
          </Spotlight>
        </Item>
      ))}
    </Stagger>
  );
}

/** The six steps on a line that draws itself in as it scrolls into view. */
export function FlowLine(): JSX.Element {
  const { t } = useLocale();
  const reduce = useReducedMotion();
  const flow = [
    { icon: Waypoints, ...t.landing.flow.plot },
    { icon: ScrollText, ...t.landing.flow.rules },
    { icon: Box, ...t.landing.flow.capacity },
    { icon: Layers, ...t.landing.flow.parking },
    { icon: FileStack, ...t.landing.flow.export },
    { icon: CircleSlash, ...t.landing.flow.refuse },
  ];
  return (
    <div className="relative">
      <svg className="absolute inset-x-0 top-[22px] hidden h-1 w-full lg:block rtl:-scale-x-100" preserveAspectRatio="none" viewBox="0 0 100 1" aria-hidden="true">
        <line x1="0" y1="0.5" x2="100" y2="0.5" stroke="var(--border-default)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <motion.line
          x1="0"
          y1="0.5"
          x2="100"
          y2="0.5"
          stroke="url(#flow-line)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          initial={reduce ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1.8, ease: EASE }}
        />
        <defs>
          <linearGradient id="flow-line" x1="0" x2="1">
            <stop offset="0" stopColor="var(--accent)" />
            <stop offset="0.5" stopColor="var(--brand-alt)" />
            <stop offset="1" stopColor="var(--brand-glow)" />
          </linearGradient>
        </defs>
      </svg>
      <Stagger as="ol" gap={0.12} className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-6 lg:gap-4">
        {flow.map((step, i) => (
          <Item key={step.title} as="li" className="grid content-start gap-3">
            <span className="relative grid size-11 place-items-center rounded-xl border border-line bg-base shadow-soft">
              <step.icon className="size-5 text-accent" aria-hidden="true" />
              <span className="figure absolute -end-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-linear-to-br from-brand-solid to-brand-alt-solid text-[10px] text-on-brand">
                {i + 1}
              </span>
            </span>
            <h3 className="text-[14.5px] font-medium text-fg">{step.title}</h3>
            <p className="text-[13px] leading-relaxed text-secondary">{step.body}</p>
          </Item>
        ))}
      </Stagger>
    </div>
  );
}

/** The readiness statement: a status, so it is drawn as one — not on the brand, and not in amber. */
export function Readiness(): JSX.Element {
  const { locale } = useLocale();
  const L = locale === 'ar' ? LANDING_AR : LANDING_EN;
  return (
    <div className="grid gap-3 rounded-xl border border-strong bg-panel p-6 shadow-soft sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-5 sm:p-8">
      <span className="grid size-10 place-items-center rounded-lg border border-strong bg-raised text-secondary">
        <ShieldOff className="size-5" aria-hidden="true" />
      </span>
      <div className="grid gap-2">
        <h2 className="text-[18px] font-medium text-fg">{L.readiness.title}</h2>
        <p className="not-assessed max-w-3xl text-[14px] leading-relaxed text-secondary">{L.readiness.body}</p>
      </div>
    </div>
  );
}
