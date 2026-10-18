import { CircleSlash } from 'lucide-react';

import { AR as LANDING_AR } from '@web/i18n/landing.ar.js';
import { EN as LANDING_EN } from '@web/i18n/landing.en.js';

import { useLocale } from '../../lib/locale.js';
import { Band, PageHero, SitePage, useSite } from '../../site/Site.js';
import { LimitsList, Readiness } from '../Landing.js';

/*
  WHAT IT DOES NOT DO — the whole list, with where this deployment stands
  directly beneath it. Both are the current site's own copy.
*/
export function Limits(): JSX.Element {
  const s = useSite();
  const { locale } = useLocale();
  const L = locale === 'ar' ? LANDING_AR : LANDING_EN;
  return (
    <SitePage path="/limits">
      <PageHero icon={CircleSlash} tone="cyan" crumb={s.footer.limits} eyebrow={s.limitsPage.eyebrow} title={L.limits.title} lede={L.limits.lede} />
      <Band tinted>
        <LimitsList />
      </Band>
      <section className="mx-auto max-w-[1320px] px-4 pt-20 sm:px-6">
        <p className="figure mb-4 text-[11.5px] tracking-[0.14em] text-accent uppercase">{s.limitsPage.readinessEyebrow}</p>
        <Readiness />
      </section>
    </SitePage>
  );
}
