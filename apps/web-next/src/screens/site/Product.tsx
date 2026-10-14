import type { BuildingModel } from '@envelope/core';
import { Box, DoorOpen, FileStack, Layers, MapPinned, ScrollText, Shapes, SquareStack } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { lazy, Suspense, useState } from 'react';

import building from '@web/screens/worked-example.building.json';
import worked from '@web/screens/worked-example.json';

import { ClassMark } from '../../components/Traced.js';
import { useLocale } from '../../lib/locale.js';
import { Art } from '../../site/art.js';
import { Band, PageHero, SectionHead, SitePage, useSite } from '../../site/Site.js';
import { EASE, Item, Spotlight, Stagger } from '../../ui/motion.js';
import { FlowLine } from '../Landing.js';

const Massing3D = lazy(() => import('../../components/Massing3D.js').then((m) => ({ default: m.Massing3D })));

/*
  THE STUDIO, DESCRIBED. The building in the hero is the worked example's
  BuildingModel, drawn by the same scene the studio draws — the page adds no
  object of its own, so nothing on it is a building nobody computed.
*/

const model = building as unknown as BuildingModel;

const FEATURES = [
  ['plot', MapPinned],
  ['rules', ScrollText],
  ['bands', SquareStack],
  ['parking', Layers],
  ['access', DoorOpen],
  ['core', Shapes],
  ['massing', Box],
  ['sheets', FileStack],
] as const;

export function Product(): JSX.Element {
  const s = useSite();
  const { t } = useLocale();
  const reduce = useReducedMotion();
  const [webgl, setWebgl] = useState(true);

  return (
    <SitePage path="/product">
      <PageHero
        crumb={s.nav.product}
        eyebrow={s.product.eyebrow}
        title={s.product.title}
        lede={s.product.lede}
        aside={
          <motion.figure initial={reduce ? false : { scale: 0.96, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE }}>
            <div className="ring-brand shadow-lifted rounded-xl">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-sunken">
                <div className="canvas-grid absolute inset-0 opacity-70" aria-hidden="true" />
                {webgl ? (
                  <Suspense fallback={null}>
                    <Massing3D model={model} autoRotate onFailed={() => setWebgl(false)} />
                  </Suspense>
                ) : (
                  <p className="relative grid h-full place-items-center p-6 text-center text-secondary">{t.landing.noWebgl}</p>
                )}
                <span className="pointer-events-none absolute start-3 top-3 rounded-md border border-line bg-panel/90 px-2 py-1 text-[11.5px] text-secondary backdrop-blur">
                  <span className="figure text-fg">{worked.input.plot.plotNumber}</span> · {worked.input.plot.community}
                </span>
              </div>
            </div>
            <figcaption className="mt-3 text-[12.5px] text-secondary">{s.product.modelCaption}</figcaption>
          </motion.figure>
        }
      />

      <Band>
        <SectionHead eyebrow={s.product.featuresEyebrow} title={s.product.featuresTitle} />
        <Stagger className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-4" gap={0.05}>
          {FEATURES.map(([key, Icon]) => (
            <Item key={key} className="h-full">
              <Spotlight className="group grid h-full content-start gap-3 rounded-xl border border-line bg-panel p-6 shadow-soft transition-colors hover:border-strong">
                <span className="grid size-10 place-items-center rounded-lg bg-accent-subtle text-accent transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="text-[15.5px] font-medium text-fg">{s.product.features[key].title}</h3>
                <p className="text-[13.5px] leading-relaxed text-secondary">{s.product.features[key].body}</p>
              </Spotlight>
            </Item>
          ))}
        </Stagger>
      </Band>

      <Band tinted>
        <SectionHead eyebrow={s.product.classesEyebrow} title={s.product.classesTitle} lede={s.product.classesLede} />
        <Stagger as="dl" className="grid gap-4 md:grid-cols-3" gap={0.08}>
          {(['DERIVED', 'USER_SET', 'ASSUMED'] as const).map((c) => (
            <Item key={c} className="grid content-start gap-3 rounded-xl border border-line bg-base p-6 shadow-soft">
              <dt>
                <ClassMark cls={c} />
              </dt>
              <dd className="text-[13.5px] leading-relaxed text-secondary">{s.product.classes[c]}</dd>
            </Item>
          ))}
        </Stagger>
      </Band>

      <Band>
        <SectionHead eyebrow={s.product.stepsEyebrow} title={s.product.stepsTitle} lede={t.landing.flowLede} />
        {/* Read from the start of the line in either language, so it is mirrored in Arabic. */}
        <Art name="product-flow" alt={s.art.productFlow} className="mx-auto mb-12 w-full max-w-5xl rtl:-scale-x-100" />
        <FlowLine />
      </Band>
    </SitePage>
  );
}
