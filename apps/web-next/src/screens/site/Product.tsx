import type { BuildingModel } from '@envelope/core';
import { lazy, Suspense, useState } from 'react';

import building from '@web/screens/worked-example.building.json';
import worked from '@web/screens/worked-example.json';

import { ClassMark } from '../../components/Traced.js';
import { useLocale } from '../../lib/locale.js';
import { Band, PageHero, SectionHead, SitePage, useSite } from '../../site/Site.js';
import { FlowLine } from '../Landing.js';

const Massing3D = lazy(() => import('../../components/Massing3D.js').then((m) => ({ default: m.Massing3D })));

/*
  THE STUDIO, DESCRIBED. The building in the hero is the worked example's
  BuildingModel, drawn by the same scene the studio draws — the page adds no
  object of its own, so nothing on it is a building nobody computed.
*/

const model = building as unknown as BuildingModel;

const FEATURES = ['plot', 'rules', 'bands', 'parking', 'access', 'core', 'massing', 'sheets'] as const;

export function Product(): JSX.Element {
  const s = useSite();
  const { t } = useLocale();
  const [webgl, setWebgl] = useState(true);

  return (
    <SitePage path="/product">
      <PageHero
        crumb={s.nav.product}
        title={s.product.title}
        lede={s.product.lede}
        aside={
          <figure>
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-sunken">
              <div className="canvas-grid absolute inset-0 opacity-70" aria-hidden="true" />
              {webgl ? (
                <Suspense fallback={null}>
                  <Massing3D model={model} autoRotate onFailed={() => setWebgl(false)} />
                </Suspense>
              ) : (
                <p className="relative grid h-full place-items-center p-6 text-center text-secondary">{t.landing.noWebgl}</p>
              )}
            </div>
            <figcaption className="mt-3 text-[13px] text-secondary">
              <span className="figure text-fg">{worked.input.plot.plotNumber}</span>, {worked.input.plot.community}
            </figcaption>
          </figure>
        }
      />

      <Band tinted>
        <SectionHead title={s.product.featuresTitle} />
        <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((key) => (
            <div key={key} className="grid content-start gap-1.5">
              <dt className="text-[15px] font-semibold text-fg">{s.product.features[key].title}</dt>
              <dd className="text-[14px] leading-relaxed text-secondary">{s.product.features[key].body}</dd>
            </div>
          ))}
        </dl>
      </Band>

      <Band>
        <SectionHead title={s.product.classesTitle} lede={s.product.classesLede} />
        <dl className="grid gap-x-10 gap-y-8 md:grid-cols-3">
          {(['DERIVED', 'USER_SET', 'ASSUMED'] as const).map((c) => (
            <div key={c} className="grid content-start gap-3">
              <dt>
                <ClassMark cls={c} />
              </dt>
              <dd className="text-[14px] leading-relaxed text-secondary">{s.product.classes[c]}</dd>
            </div>
          ))}
        </dl>
      </Band>

      <Band tinted>
        <SectionHead title={s.product.stepsTitle} lede={t.landing.flowLede} />
        <FlowLine />
      </Band>
    </SitePage>
  );
}
