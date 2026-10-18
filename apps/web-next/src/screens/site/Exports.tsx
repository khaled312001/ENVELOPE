import { Lock, LockOpen } from 'lucide-react';

import worked from '@web/screens/worked-example.json';

import { cn } from '../../lib/cn.js';
import { Band, PageHero, SectionHead, SitePage, useSite } from '../../site/Site.js';
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
  const parity = (['engine', 'drawingSet', 'dxf', 'modelFile'] as const).map((k) => ({ k, n: x.cars[k] }));
  const gateLabel = (signed: readonly string[]): string => (signed.length === 0 ? s.exportsPage.gate.none : signed.length === 1 ? s.exportsPage.gate.g3 : s.exportsPage.gate.both);

  return (
    <SitePage path="/exports">
      <PageHero crumb={s.nav.exports} title={s.exportsPage.title} lede={s.exportsPage.lede} />

      <Band tinted>
        <FileGrid />
      </Band>

      <Band>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHead title={s.exportsPage.parityTitle} lede={s.exportsPage.parityLede} className="mb-6" />
            <dl className="border-t border-line">
              {parity.map(({ k, n }) => (
                <div key={k} className="flex items-baseline justify-between gap-4 border-b border-line py-3.5">
                  <dt className="text-[14.5px] text-secondary">{s.exportsPage.parityRows[k]}</dt>
                  <dd className="figure text-[22px] text-fg">{String(n)}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <SectionHead title={s.exportsPage.gatesTitle} lede={s.exportsPage.gatesLede} className="mb-6" />
            <ol className="border-t border-line">
              {x.gateSequence.map((g) => {
                const ok = g.status === 200;
                return (
                  <li key={g.signed.join('+') || 'none'} className="flex items-center gap-4 border-b border-line py-3.5">
                    {ok ? <LockOpen className="size-5 shrink-0 text-accent" aria-hidden="true" /> : <Lock className="size-5 shrink-0 text-secondary" aria-hidden="true" />}
                    <div className="grid gap-0.5">
                      <p className={cn('text-[14.5px] font-medium', ok ? 'text-fg' : 'text-secondary')}>{gateLabel(g.signed)}</p>
                      <p className="figure text-[12.5px] text-secondary">{s.exportsPage.status(String(g.status))}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </Band>

      <Band tinted>
        <SectionHead title={s.exportsPage.sheetsTitle} />
        <div className="grid gap-12 lg:grid-cols-3">
          <ol className="grid content-start border-t border-line sm:grid-cols-2 sm:gap-x-8 lg:col-span-2">
            {x.drawingSheets.map((sh) => (
              <li key={sh.id} className="flex items-baseline gap-4 border-b border-line py-3">
                <span className="figure w-14 shrink-0 text-[13px] text-secondary">{sh.number}</span>
                <span className="text-[14px] text-fg">{s.exportsPage.sheetName(sh.title)}</span>
              </li>
            ))}
          </ol>
          <div className="grid content-start gap-3">
            <p className="text-[15px] font-semibold text-fg">{s.exportsPage.workbookTitle}</p>
            <ul className="grid gap-1.5">
              {x.workbookSheets.map((w) => (
                <li key={w.name} className="text-[14px] text-secondary">
                  {s.exportsPage.sheetName(w.name)}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <details className="group mt-10">
          <summary className="cursor-pointer text-[15px] font-semibold text-fg">
            {s.exportsPage.layersTitle} <span className="figure ms-1 font-normal text-secondary">({x.dxf.layers.length})</span>
          </summary>
          <ul className="figure mt-4 grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-x-6 gap-y-1 text-[12.5px] text-secondary" dir="ltr">
            {x.dxf.layers.map((l) => (
              <li key={l.name}>{l.name}</li>
            ))}
          </ul>
        </details>
      </Band>

      <Band>
        <div className="grid gap-2 rounded-lg border border-strong p-6 sm:p-8">
          <h2 className="text-[18px] font-semibold text-fg">{s.exportsPage.stampTitle}</h2>
          <p className="max-w-3xl text-[14.5px] leading-relaxed text-secondary">{s.exportsPage.stampBody}</p>
          <p className="figure not-assessed mt-2 text-[13px] text-fg">{x.stampedIn.map((f) => `.${f}`).join('  ')}</p>
        </div>
      </Band>
    </SitePage>
  );
}
