import { Check } from 'lucide-react';

import { AR as LANDING_AR } from '@web/i18n/landing.ar.js';
import { EN as LANDING_EN } from '@web/i18n/landing.en.js';
import worked from '@web/screens/worked-example.json';

import { ClassMark } from '../../components/Traced.js';
import { grouped } from '../../lib/figures.js';
import { useLocale } from '../../lib/locale.js';
import { Band, PageHero, SectionHead, SitePage, useSite } from '../../site/Site.js';
import { ClaimsList } from '../Landing.js';

/*
  THE METHOD. The four mechanisms and the five-way claim statement are worded
  by the copy the current site already carries, so the two sites cannot drift
  into describing two different products. The one figure here — what the
  parking-in-FAR answer moves — is the worked example's own comparison.
*/

const CHAIN = ['generate', 'exact', 'derivation', 'blocks'] as const;

export function Method(): JSX.Element {
  const s = useSite();
  const { locale } = useLocale();
  const L = locale === 'ar' ? LANDING_AR : LANDING_EN;

  return (
    <SitePage path="/method">
      <PageHero crumb={s.nav.method} title={s.method.title} lede={s.method.lede} />

      <Band tinted>
        <SectionHead title={L.guarantees.title} lede={L.guarantees.lede} />
        {/* Each mechanism stands on the one before it, so the order is the content. */}
        <ol className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {CHAIN.map((key, i) => (
            <li key={key} className="grid grid-cols-[2rem_minmax(0,1fr)] content-start gap-x-2 gap-y-1.5">
              <span className="figure row-span-2 text-[15px] text-secondary">{i + 1}</span>
              <h3 className="text-[16px] font-semibold text-fg">{L.guarantees.chain[key].title}</h3>
              <p className="text-[14px] leading-relaxed text-secondary">{L.guarantees.chain[key].body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 grid gap-3">
          <ul className="flex flex-wrap gap-2">
            {/* PHASE_0_CLASSES, all four: the caption beneath counts them. */}
            {(['DERIVED', 'USER_SET', 'ASSUMED', 'VARIANCE'] as const).map((c) => (
              <li key={c}>
                <ClassMark cls={c} />
              </li>
            ))}
          </ul>
          <p className="max-w-3xl text-[14px] leading-relaxed text-secondary">{L.guarantees.keyCaption}</p>
        </div>
      </Band>

      <Band>
        <SectionHead title={s.method.refusalsTitle} lede={s.method.refusalsLede} />
        <dl className="grid gap-x-10 gap-y-8 md:grid-cols-2">
          {(
            [
              ['parkingInFar', s.method.refusals.parkingInFar.body(grouped(worked.verified.parkingInFar.regulatorySpreadM2))],
              ['saleable', s.method.refusals.saleable.body],
              ['gap', s.method.refusals.gap.body],
              ['schedule', s.method.refusals.schedule.body],
            ] as const
          ).map(([key, body]) => (
            <div key={key} className="grid content-start gap-1.5 border-t border-line pt-4">
              <dt className="text-[16px] font-semibold text-fg">{s.method.refusals[key].title}</dt>
              <dd className="text-[14px] leading-relaxed text-secondary">{body}</dd>
            </div>
          ))}
        </dl>
      </Band>

      <Band tinted>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:gap-16">
          <div>
            <SectionHead title={s.method.boundaryTitle} className="mb-6" />
            <p className="text-[16px] leading-relaxed text-secondary">{s.method.boundaryBody}</p>
          </div>
          <ul className="grid gap-4">
            {s.method.boundaryPoints.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[15px] leading-relaxed text-fg">
                <Check className="mt-1 size-4 shrink-0 text-accent" aria-hidden="true" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </Band>

      <Band>
        <SectionHead title={L.claims.title} lede={L.claims.lede} />
        <ClaimsList />
      </Band>
    </SitePage>
  );
}
