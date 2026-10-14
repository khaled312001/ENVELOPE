import { Ban, Calculator, GitBranch, Link2, ListChecks, Lock, Scale, Split, Wand2 } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

import { AR as LANDING_AR } from '@web/i18n/landing.ar.js';
import { EN as LANDING_EN } from '@web/i18n/landing.en.js';
import worked from '@web/screens/worked-example.json';

import { ClassMark } from '../../components/Traced.js';
import { grouped } from '../../lib/figures.js';
import { useLocale } from '../../lib/locale.js';
import { Art } from '../../site/art.js';
import { Band, PageHero, SectionHead, SitePage, useSite } from '../../site/Site.js';
import { EASE, Item, Spotlight, Stagger } from '../../ui/motion.js';
import { IconTile, toneAt } from '../../ui/tile.js';
import { ClaimsList } from '../Landing.js';

/*
  THE METHOD. The four mechanisms and the five-way claim statement are worded
  by the copy the current site already carries, so the two sites cannot drift
  into describing two different products. The one figure here — what the
  parking-in-FAR answer moves — is the worked example's own comparison.
*/

const CHAIN = [
  ['generate', Wand2],
  ['exact', Calculator],
  ['derivation', GitBranch],
  ['blocks', Lock],
] as const;

export function Method(): JSX.Element {
  const s = useSite();
  const { locale, t } = useLocale();
  const L = locale === 'ar' ? LANDING_AR : LANDING_EN;
  const reduce = useReducedMotion();

  return (
    <SitePage path="/method">
      <PageHero
        crumb={s.nav.method}
        eyebrow={s.method.eyebrow}
        title={s.method.title}
        lede={s.method.lede}
        aside={<Art name="method-chain" alt={s.art.methodChain} eager className="mx-auto w-full max-w-xl rtl:-scale-x-100" />}
      />

      <Band>
        <SectionHead icon={Link2} tone="blue" eyebrow={s.method.chainEyebrow} title={L.guarantees.title} lede={L.guarantees.lede} />
        <ol className="relative grid gap-6 lg:grid-cols-4">
          {/* The chain's spine, drawn as it comes into view. */}
          <motion.span
            aria-hidden="true"
            className="absolute start-5 top-5 bottom-5 hidden w-px origin-top bg-linear-to-b from-accent via-brand-alt to-brand-glow max-lg:block"
            initial={reduce ? false : { scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: EASE }}
          />
          {CHAIN.map(([key, Icon], i) => (
            <motion.li
              key={key}
              className="relative grid content-start gap-3 ps-14 lg:ps-0"
              initial={reduce ? false : { y: 18 }}
              whileInView={{ y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: EASE, delay: i * 0.12 }}
            >
              <span className="group absolute start-0 top-0 lg:static">
                <IconTile icon={Icon} tone={toneAt(i)} />
              </span>
              <span className="figure text-[11px] text-tertiary">0{i + 1}</span>
              <h3 className="text-[16px] font-medium text-fg">{L.guarantees.chain[key].title}</h3>
              <p className="text-[13.5px] leading-relaxed text-secondary">{L.guarantees.chain[key].body}</p>
            </motion.li>
          ))}
        </ol>
        <div className="mt-10 grid gap-3 rounded-xl border border-line bg-panel p-5 shadow-soft">
          <ul className="flex flex-wrap gap-2">
            {(['DERIVED', 'USER_SET', 'ASSUMED'] as const).map((c) => (
              <li key={c}>
                <ClassMark cls={c} />
              </li>
            ))}
          </ul>
          <p className="text-[13px] leading-relaxed text-secondary">{L.guarantees.keyCaption}</p>
        </div>
      </Band>

      <Band tinted>
        <SectionHead icon={Ban} tone="violet" eyebrow={s.method.refusalsEyebrow} title={s.method.refusalsTitle} lede={s.method.refusalsLede} />
        <Stagger className="grid gap-4 md:grid-cols-2" gap={0.06}>
          {(
            [
              ['parkingInFar', s.method.refusals.parkingInFar.body(grouped(worked.verified.parkingInFar.regulatorySpreadM2))],
              ['saleable', s.method.refusals.saleable.body],
              ['gap', s.method.refusals.gap.body],
              ['schedule', s.method.refusals.schedule.body],
            ] as const
          ).map(([key, body]) => (
            <Item key={key} className="h-full">
              <Spotlight className="grid h-full content-start gap-3 rounded-xl border border-line bg-base p-6 shadow-soft">
                <p className="flex items-start gap-2.5 text-[15px] font-medium text-fg">
                  <Ban className="mt-0.5 size-4.5 shrink-0 text-secondary" aria-hidden="true" />
                  {s.method.refusals[key].title}
                </p>
                <p className="ps-7 text-[13.5px] leading-relaxed text-secondary">{body}</p>
              </Spotlight>
            </Item>
          ))}
        </Stagger>
      </Band>

      <Band>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:gap-16">
          <div>
            <SectionHead icon={Split} tone="cyan" eyebrow={s.method.boundaryEyebrow} title={s.method.boundaryTitle} className="mb-6" />
            <p className="text-[15px] leading-relaxed text-secondary">{s.method.boundaryBody}</p>
          </div>
          <Stagger as="ul" className="grid gap-3" gap={0.08}>
            {s.method.boundaryPoints.map((p) => (
              <Item key={p} as="li" className="flex items-start gap-3 rounded-xl border border-line bg-panel p-5 text-[14px] leading-relaxed text-fg shadow-soft">
                <ListChecks className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
                {p}
              </Item>
            ))}
          </Stagger>
        </div>
      </Band>

      <Band tinted>
        <SectionHead icon={Scale} tone="blue" eyebrow={t.landing.claimsEyebrow} title={L.claims.title} lede={L.claims.lede} />
        <ClaimsList />
      </Band>
    </SitePage>
  );
}
