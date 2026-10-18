import { Plus } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';

import { LIMITS } from '@web/content/shared.js';
import { LIMITS_AR } from '@web/content/shared.ar.js';
import { AR as LANDING_AR } from '@web/i18n/landing.ar.js';
import { EN as LANDING_EN } from '@web/i18n/landing.en.js';
import worked from '@web/screens/worked-example.json';

import { cn } from '../lib/cn.js';
import { grouped } from '../lib/figures.js';
import { useLocale } from '../lib/locale.js';
import { Link } from '../lib/nav.js';
import { Band, SectionHead, SitePage, useSite } from '../site/Site.js';
import { Button } from '../ui/button.js';

// three.js and the model are most of the page's weight; the words and figures paint before they arrive.
const WorkedModel = lazy(() => import('../components/WorkedModel.js').then((m) => ({ default: m.WorkedModel })));

/*
  THE LANDING PAGE IS UNDER THE SAME DISCIPLINE AS A REPORT.

  No figure on it is typed by a person: every one is read from
  `worked-example.json`, which `scripts/verify-worked-example.mjs` writes from a
  real run and `pnpm example` re-verifies. The formulas shown are the engine's
  own `formula` strings. The building in the hero is that run's BuildingModel,
  drawn by `@envelope/massing` — the same scene the studio shows — and it is the
  page's one picture, set large, because it is the one picture that is true.

  Nothing on it moves to be looked at (18 Oct 2026). The five-way claim
  statement is here in §16.5's order, and "what it does not do" is a longer list
  than the feature list.
*/

const v = worked.verified;
const GRID_MM = '1';

const BAND = {
  REGULATORY: { key: 'bandA', letter: 'A', value: v.bandAM2 },
  GEOMETRIC: { key: 'bandB', letter: 'B', value: v.bandBM2 },
  PARKING: { key: 'bandC', letter: 'C', value: v.bandCM2 },
} as const;

const FRAME = 'mx-auto max-w-[1240px] px-4 sm:px-6';

export function Landing(): JSX.Element {
  const { t, locale } = useLocale();
  const s = useSite();
  const L = locale === 'ar' ? LANDING_AR : LANDING_EN;
  const [webgl, setWebgl] = useState(true);
  const governing = v.governingBand as keyof typeof BAND;
  const max = Math.max(...Object.values(BAND).map((b) => Number(b.value)));

  return (
    <SitePage path="/">

      {/* ── Hero: the sentence, then the building the engine drew ─────────── */}
      <section className={cn(FRAME, 'pt-12 pb-16 lg:pt-16')}>
        <h1 className="heading-display max-w-[30ch] text-[30px] font-semibold tracking-[-0.025em] text-fg sm:text-[42px]">
          {t.landing.titleA} {t.landing.titleB}
        </h1>
        <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <p className="max-w-2xl text-[17px] leading-relaxed text-fg/80">{t.landing.lede}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="primary" size="lg">
              <Link to="/studio?example=1">{t.landing.ctaExample}</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to="/studio">{t.landing.ctaStudio}</Link>
            </Button>
          </div>
        </div>

        <figure className="mt-10">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-sunken sm:aspect-[16/9] lg:aspect-[2/1]">
            <div className="canvas-grid absolute inset-0 opacity-70" aria-hidden="true" />
            {webgl ? (
              <Suspense fallback={null}>
                <WorkedModel onFailed={() => setWebgl(false)} />
              </Suspense>
            ) : (
              <p className="relative grid h-full place-items-center p-6 text-center text-secondary">{t.landing.noWebgl}</p>
            )}
          </div>
          <figcaption className="mt-3 text-[13px] text-secondary">
            <span className="figure text-fg">{worked.input.plot.plotNumber}</span>, {worked.input.plot.community}. {t.landing.live}.
          </figcaption>

          {/* The worked example's figures, as the engine returned them. */}
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
            {[
              { k: t.landing.figGoverning, val: grouped(v.governingGfaM2), unit: 'm²' },
              { k: t.landing.figBand, val: BAND[governing].letter, unit: t.bands[BAND[governing].key].name },
              { k: t.landing.figLevels, val: v.levels, unit: '' },
              { k: t.landing.figPlot, val: grouped(v.plotAreaM2), unit: 'm²' },
            ].map((f) => (
              <div key={f.k} className="grid gap-1">
                <dt className="text-[13px] text-secondary">{f.k}</dt>
                <dd className="figure text-[28px] text-fg">
                  {f.val}
                  {f.unit ? <span className="ms-1.5 font-sans text-[13px] text-secondary">{f.unit}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        </figure>
      </section>

      {/* ── Three bands, side by side ─────────────────────────────────────── */}
      <Band tinted>
        <SectionHead title={t.landing.bandsTitle} lede={t.landing.bandsLede} />
        <div className="grid gap-10 md:grid-cols-3 md:gap-8">
          {(Object.keys(BAND) as (keyof typeof BAND)[]).map((b) => {
            const band = BAND[b];
            const isGov = b === governing;
            return (
              <article key={b} className="grid content-start gap-4">
                <div className="flex items-baseline gap-3">
                  <span className="figure text-[15px] text-secondary">{band.letter}</span>
                  <h3 className="text-[17px] font-semibold text-fg">{t.bands[band.key].name}</h3>
                  {isGov ? <span className="text-[13px] font-medium text-accent-strong">{t.landing.governs}</span> : null}
                </div>
                <p className="text-[14px] text-secondary">{t.bands[band.key].question}</p>
                <p className="figure text-[32px] text-fg">
                  {grouped(band.value)}
                  <span className="ms-1.5 font-sans text-[13px] text-secondary">m²</span>
                </p>
                {/* The bar's length is the one place a figure becomes a number, and only to draw the bar. */}
                <div className="h-1.5 bg-raised" aria-hidden="true">
                  <div className={cn('h-full', isGov ? 'bg-accent' : 'bg-strong')} style={{ width: `${(Number(band.value) / max) * 100}%` }} />
                </div>
                <p dir="ltr" className="figure text-start text-[12px] leading-relaxed !whitespace-normal break-words text-secondary">
                  {v.formulas[band.key]}
                </p>
              </article>
            );
          })}
        </div>
      </Band>

      {/* ── The flow, in the studio's order ───────────────────────────────── */}
      <Band>
        <SectionHead title={t.landing.flowTitle} lede={t.landing.flowLede} />
        <FlowLine />
      </Band>

      {/* ── What it writes ────────────────────────────────────────────────── */}
      <Band tinted>
        <SectionHead title={t.landing.outTitle} lede={t.landing.outLede} />
        <FileGrid />
      </Band>

      {/* ── The five-way claim statement, §16.5's order ───────────────────── */}
      <Band>
        <SectionHead title={L.claims.title} lede={L.claims.lede} />
        <ClaimsList />
      </Band>

      {/* ── What it does not do ───────────────────────────────────────────── */}
      <Band tinted>
        <SectionHead title={L.limits.title} lede={L.limits.lede} />
        <LimitsList />
      </Band>

      {/* ── The rest of the site, one layer down each ─────────────────────── */}
      <Band>
        <SectionHead title={s.home.pagesTitle} lede={s.home.pagesLede} />
        <ul className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {(['product', 'parking', 'method', 'exports', 'limits', 'faq'] as const).map((key) => (
            <li key={key} className="grid content-start gap-2">
              <Link to={`/${key}`} className="text-[16px] font-semibold text-fg underline decoration-strong underline-offset-4 transition-colors hover:decoration-fg">
                {s.home.cards[key].title}
              </Link>
              <p className="text-[14px] leading-relaxed text-secondary">{s.home.cards[key].body}</p>
            </li>
          ))}
        </ul>
      </Band>

      {/* ── Where this deployment stands — said before anything is sold ──── */}
      <section className={FRAME}>
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
    <dl className="divide-y divide-line border-y border-line">
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
        <div key={c.title} className="grid gap-2 py-5 md:grid-cols-[16rem_12rem_minmax(0,1fr)] md:gap-6">
          <dt className="text-[15px] font-semibold text-fg">{c.title}</dt>
          <dd
            className={cn(
              'text-[14px] font-medium',
              tone === 'never' ? 'not-assessed text-fg' : tone === 'ok' ? 'text-accent-strong' : 'text-secondary',
            )}
          >
            {c.status}
          </dd>
          <dd className="text-[14px] leading-relaxed text-secondary">{body}</dd>
        </div>
      ))}
    </dl>
  );
}

/** "What it does not do" — the whole list, from the copy the current site carries. */
export function LimitsList(): JSX.Element {
  const { locale } = useLocale();
  const s = useSite();
  const L = locale === 'ar' ? LANDING_AR : LANDING_EN;
  // The classic site's list, then this site's own: the limits its wider description makes worth saying.
  const limits = [...(locale === 'ar' ? LIMITS_AR : LIMITS), ...s.limitsPage.extra];
  return (
    <>
      <ul className="grid border-t border-line md:grid-cols-2 md:gap-x-10">
        {limits.map((l) => (
          <li key={l.id} className="border-b border-line">
            {/* The heading says it; the reason is one click away rather than a paragraph every reader must wade through. */}
            <details className="group">
              <summary className="flex cursor-pointer list-none items-start gap-3 py-4 text-[15px] font-medium text-fg [&::-webkit-details-marker]:hidden">
                <span className="flex-1">{l.heading}</span>
                <Plus className="mt-0.5 size-4 shrink-0 text-secondary transition-transform duration-200 group-open:rotate-45" aria-hidden="true" />
              </summary>
              <div className="pb-5 text-[14px] leading-relaxed text-secondary">{l.body}</div>
            </details>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-[14px] text-secondary">{L.limits.after}</p>
    </>
  );
}

/** The six files the engine writes, each from the one building model. */
export function FileGrid(): JSX.Element {
  const { t } = useLocale();
  return (
    <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
      {(['html', 'sheets', 'dxf', 'glb', 'xlsx', 'json'] as const).map((f) => (
        <div key={f} className="grid content-start gap-1">
          <dt className="text-[15px] font-semibold text-fg">{t.exports.file[f].name}</dt>
          <dd className="text-[14px] leading-relaxed text-secondary">{t.exports.file[f].body}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The six steps, in the studio's own order. A real sequence, so a real ordered list. */
export function FlowLine(): JSX.Element {
  const { t } = useLocale();
  // The refusal that used to close the line is now said where it happens: on the sheet.
  const flow = [t.landing.flow.sheet, t.landing.flow.plot, t.landing.flow.rules, t.landing.flow.capacity, t.landing.flow.parking, t.landing.flow.export];
  return (
    <ol className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {flow.map((step, i) => (
        <li key={step.title} className="grid grid-cols-[2rem_minmax(0,1fr)] content-start gap-x-2 gap-y-1">
          <span className="figure row-span-2 text-[15px] text-secondary">{i + 1}</span>
          <h3 className="text-[15px] font-semibold text-fg">{step.title}</h3>
          <p className="text-[14px] leading-relaxed text-secondary">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}

/** The readiness statement: a status, so it is drawn as one — not on the brand, and not in amber. */
export function Readiness(): JSX.Element {
  const s = useSite();
  return (
    <div className="grid gap-2 rounded-lg border border-strong p-6 sm:p-8">
      <h2 className="text-[18px] font-semibold text-fg">{s.limitsPage.readinessTitle}</h2>
      <p className="not-assessed max-w-3xl text-[14.5px] leading-relaxed text-secondary">{s.limitsPage.readinessBody}</p>
    </div>
  );
}
