import { Check, Equal, FileWarning, Layers, Lock, LockOpen } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

import worked from '@web/screens/worked-example.json';

import { cn } from '../../lib/cn.js';
import { EngineText } from '../../lib/locale.js';
import { Illustration } from '../../site/art.js';
import { Band, PageHero, SectionHead, SitePage, useSite } from '../../site/Site.js';
import { EASE, Item, Stagger } from '../../ui/motion.js';
import { FileGrid } from '../Landing.js';

/*
  THE FILES. Every count, sheet number, layer name and status code on this page
  is read from the worked example — and those were read back out of the files
  the real API wrote, by `scripts/verify-worked-example.mjs`, not from the
  engine's intentions. Sheet titles and layer names are the files' own words,
  so they are shown as engine text and never translated.
*/

const x = worked.verified.exports;

export function Exports(): JSX.Element {
  const s = useSite();
  const reduce = useReducedMotion();
  const parity = (['engine', 'drawingSet', 'dxf', 'modelFile'] as const).map((k) => ({ k, n: x.cars[k] }));
  const gateLabel = (signed: readonly string[]): string => (signed.length === 0 ? s.exportsPage.gate.none : signed.length === 1 ? s.exportsPage.gate.g3 : s.exportsPage.gate.both);

  return (
    <SitePage path="/exports">
      <PageHero
        icon={Layers}
        tone="cyan"
        crumb={s.nav.exports}
        eyebrow={s.exportsPage.eyebrow}
        title={s.exportsPage.title}
        lede={s.exportsPage.lede}
        aside={<Illustration name="exports-model" alt={s.art.exportsModel} eager />}
      />

      <Band>
        <p className="figure mb-6 text-[11.5px] tracking-[0.14em] text-accent uppercase">{s.exportsPage.filesEyebrow}</p>
        <FileGrid />
      </Band>

      <Band tinted>
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHead icon={Equal} tone="blue" eyebrow={s.exportsPage.parityEyebrow} title={s.exportsPage.parityTitle} lede={s.exportsPage.parityLede} className="mb-6" />
            <Stagger as="dl" className="overflow-hidden rounded-xl border border-line bg-base shadow-soft">
              {parity.map(({ k, n }) => (
                <Item key={k} className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 last:border-b-0">
                  <dt className="text-[14px] text-secondary">{s.exportsPage.parityRows[k]}</dt>
                  <dd className="figure flex items-center gap-2 text-[22px] font-light text-fg">
                    {String(n)}
                    {n === x.cars.engine ? <Check className="size-4 text-accent" aria-hidden="true" /> : null}
                  </dd>
                </Item>
              ))}
            </Stagger>
          </div>
          <div>
            <SectionHead icon={Lock} tone="violet" eyebrow={s.exportsPage.gatesEyebrow} title={s.exportsPage.gatesTitle} lede={s.exportsPage.gatesLede} className="mb-6" />
            <ol className="relative grid gap-3">
              {x.gateSequence.map((g, i) => {
                const ok = g.status === 200;
                return (
                  <motion.li
                    key={g.signed.join('+') || 'none'}
                    className={cn('flex items-center gap-4 rounded-xl border bg-base p-4 shadow-soft', ok ? 'ring-brand border-transparent' : 'border-line')}
                    initial={reduce ? false : { x: -16 }}
                    whileInView={{ x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, ease: EASE, delay: i * 0.15 }}
                  >
                    <span
                      className={cn(
                        'grid size-10 shrink-0 place-items-center rounded-lg',
                        ok ? 'bg-linear-to-br from-brand-solid to-brand-alt-solid text-on-brand' : 'border border-strong bg-raised text-secondary',
                      )}
                    >
                      {ok ? <LockOpen className="size-5" aria-hidden="true" /> : <Lock className="size-5" aria-hidden="true" />}
                    </span>
                    <div className="grid gap-0.5">
                      <p className="text-[14px] font-medium text-fg">{gateLabel(g.signed)}</p>
                      <p className="figure text-[12.5px] text-secondary">{s.exportsPage.status(String(g.status))}</p>
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          </div>
        </div>
      </Band>

      <Band glow="cyan">
        <SectionHead icon={Layers} tone="cyan" eyebrow={s.exportsPage.sheetsEyebrow} title={s.exportsPage.sheetsTitle} />
        <div className="grid gap-6 lg:grid-cols-3">
          <Stagger as="ol" className="grid content-start gap-2 lg:col-span-2 sm:grid-cols-2" gap={0.05}>
            {x.drawingSheets.map((sh) => (
              <Item key={sh.id} as="li" className="flex items-center gap-3 rounded-lg border border-line bg-panel px-4 py-3 shadow-soft">
                <span className="figure rounded-md border border-strong px-2 py-0.5 text-[12px] text-fg">{sh.number}</span>
                <EngineText className="text-[13.5px] text-fg">{sh.title}</EngineText>
              </Item>
            ))}
          </Stagger>
          <div className="grid content-start gap-3 rounded-xl border border-line bg-panel p-5 shadow-soft">
            <p className="text-[14px] font-medium text-fg">{s.exportsPage.workbookTitle}</p>
            <ul className="grid gap-1.5">
              {x.workbookSheets.map((w) => (
                <li key={w.name} className="text-[13px] text-secondary">
                  <EngineText>{w.name}</EngineText>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <details className="group mt-6 rounded-xl border border-line bg-panel p-5 shadow-soft">
          <summary className="cursor-pointer text-[14px] font-medium text-fg">
            {s.exportsPage.layersTitle} <span className="figure ms-1 text-secondary">({x.dxf.layers.length})</span>
          </summary>
          <ul className="mt-4 flex flex-wrap gap-1.5" dir="ltr">
            {x.dxf.layers.map((l) => (
              <li key={l.name} className="figure rounded-md border border-line bg-raised px-2 py-0.5 text-[11.5px] text-secondary">
                {l.name}
              </li>
            ))}
          </ul>
        </details>
      </Band>

      <Band tinted>
        <div className="grid gap-4 rounded-xl border border-strong bg-base p-6 shadow-soft sm:grid-cols-[auto_minmax(0,1fr)] sm:p-8">
          <span className="grid size-10 place-items-center rounded-lg border border-strong bg-raised text-secondary">
            <FileWarning className="size-5" aria-hidden="true" />
          </span>
          <div className="grid gap-2">
            <h2 className="text-[18px] font-medium text-fg">{s.exportsPage.stampTitle}</h2>
            <p className="text-[14px] leading-relaxed text-secondary">{s.exportsPage.stampBody}</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {x.stampedIn.map((f) => (
                <li key={f} className="figure not-assessed rounded-md border border-line px-2 py-0.5 text-[11.5px] text-fg">
                  .{f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Band>
    </SitePage>
  );
}
