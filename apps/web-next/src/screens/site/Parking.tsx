import { ArrowDownUp, CircleSlash, Route, Ruler, SquareParking } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

import worked from '@web/screens/worked-example.json';

import { cn } from '../../lib/cn.js';
import { grouped } from '../../lib/figures.js';
import { EngineText, useLocale } from '../../lib/locale.js';
import { Band, PageHero, SectionHead, SitePage, useSite } from '../../site/Site.js';
import { EASE, Item, Spotlight, Stagger } from '../../ui/motion.js';

/*
  PARKING, THE PART THE CLIENT IS BUYING.

  The level drawn on this page is the worked example's `levelPlan.rects` — the
  engine's own rectangles, in plot metres — with the plot ring, the podium it
  was packed into and the entrance the engine recommended. The page draws them
  and computes nothing: every figure beside the drawing is read off the same
  run, and every sentence the engine wrote is shown as the engine wrote it.
*/

const v = worked.verified;
const lp = v.levelPlan;

type Pt = { readonly x: string; readonly y: string };

function LevelPlan(): JSX.Element {
  const s = useSite();
  const reduce = useReducedMotion();
  const ring = worked.input.plot.vertices;
  const xs = ring.map((p) => Number(p.x));
  const ys = ring.map((p) => Number(p.y));
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const pad = 6;
  const w = maxX - minX + pad * 2;
  const h = maxY - minY + pad * 2;
  // North up: plot +y is drawn upward.
  const P = (p: Pt): string => `${Number(p.x) - minX + pad},${maxY - Number(p.y) + pad}`;
  const pts = (o: readonly Pt[]): string => o.map(P).join(' ');
  const open = v.access.recommended.opening;
  const [ox1, oy1] = P(open.start).split(',').map(Number) as [number, number];
  const [ox2, oy2] = P(open.end).split(',').map(Number) as [number, number];
  const bays = lp.rects.filter((r) => r.kind === 'BAY');
  const rest = lp.rects.filter((r) => r.kind !== 'BAY');

  return (
    <svg role="img" aria-label={s.parking.planLabel} viewBox={`0 0 ${w} ${h}`} className="h-auto w-full">
      <defs>
        <pattern id="ramp-hatch" width="1.2" height="1.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="1.2" stroke="var(--brand-alt)" strokeWidth="0.35" />
        </pattern>
      </defs>
      <polygon points={pts(ring)} fill="var(--surface-panel)" stroke="var(--text-secondary)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      <polygon points={pts(lp.podiumRing)} fill="none" stroke="var(--border-strong)" strokeDasharray="4 3" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {rest.map((r, i) => (
        <polygon
          key={`r${i}`}
          points={pts(r.outline)}
          fill={r.kind === 'AISLE' ? 'var(--accent-subtle)' : r.kind === 'RAMP' ? 'url(#ramp-hatch)' : 'var(--surface-hover)'}
          stroke={r.kind === 'RAMP' ? 'var(--brand-alt)' : 'none'}
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {bays.map((r, i) => (
        <motion.polygon
          key={`b${i}`}
          points={pts(r.outline)}
          fill="var(--surface-raised)"
          stroke="var(--text-tertiary)"
          strokeWidth={0.75}
          vectorEffect="non-scaling-stroke"
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          // Transform only: a bay not yet in view is drawn, just not yet settled.
          initial={reduce ? false : { scale: 0.4 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: EASE, delay: 0.012 * i }}
        />
      ))}
      <line x1={ox1} y1={oy1} x2={ox2} y2={oy2} stroke="var(--accent)" strokeWidth={4} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <path
        d={`M${(ox1 + ox2) / 2} ${oy1 + 4.5} L${(ox1 + ox2) / 2} ${oy1 + 0.8} M${(ox1 + ox2) / 2 - 1.2} ${oy1 + 2} L${(ox1 + ox2) / 2} ${oy1 + 0.8} L${(ox1 + ox2) / 2 + 1.2} ${oy1 + 2}`}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function KeySwatch({ className, label }: { readonly className: string; readonly label: string }): JSX.Element {
  return (
    <li className="flex items-center gap-2">
      <span className={cn('inline-block h-3 w-5 rounded-[2px] border', className)} aria-hidden="true" />
      {label}
    </li>
  );
}

export function Parking(): JSX.Element {
  const s = useSite();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const m2 = ar ? 'م²' : 'm²';
  const m = ar ? 'م' : 'm';
  const orientationNote = lp.notAssessed.find((n) => n.startsWith('Laid out as'));
  const notes = lp.notAssessed.filter((n) => n !== orientationNote);

  const stats = [
    { label: s.parking.stats.bays, value: lp.bayCount.value, unit: '' },
    { label: s.parking.stats.cars, value: String(v.exports.cars.engine), unit: '' },
    { label: s.parking.stats.perBay, value: lp.areaPerBayM2.value, unit: m2 },
    { label: s.parking.stats.module, value: lp.moduleDepthM.value, unit: m },
  ];

  const losses = [
    { key: 'reserved', ...lp.losses.reserved },
    { key: 'circulation', ...lp.losses.circulation },
    { key: 'footprint', ...lp.losses.footprint },
  ] as const;

  return (
    <SitePage path="/parking">
      <PageHero
        crumb={s.nav.parking}
        eyebrow={s.parking.eyebrow}
        title={s.parking.title}
        lede={s.parking.lede}
        aside={
          <Stagger onMount as="dl" className="grid grid-cols-2 gap-3">
            {stats.map((st) => (
              <Item key={st.label} className="grid gap-1 rounded-xl border border-line bg-panel/90 p-5 shadow-soft backdrop-blur">
                <dt className="text-[12px] text-secondary">{st.label}</dt>
                <dd className="figure text-[28px] font-light text-fg">
                  {st.value}
                  {st.unit ? <span className="ms-1.5 font-sans text-[12px] text-secondary">{st.unit}</span> : null}
                </dd>
              </Item>
            ))}
          </Stagger>
        }
      />

      <Band>
        <figure className="grid gap-4">
          <div className="ring-brand shadow-lifted rounded-xl">
            <div className="canvas-grid overflow-hidden rounded-xl p-4 sm:p-8">
              <LevelPlan />
            </div>
          </div>
          <figcaption className="grid gap-3 text-[12.5px] text-secondary">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              <KeySwatch className="border-tertiary bg-raised" label={s.parking.key.bay} />
              <KeySwatch className="border-accent/40 bg-accent-subtle" label={s.parking.key.aisle} />
              <KeySwatch className="border-brand-alt bg-[repeating-linear-gradient(45deg,var(--brand-alt)_0_1px,transparent_1px_4px)]" label={s.parking.key.ramp} />
              <li className="flex items-center gap-2">
                <span className="inline-block h-1 w-5 rounded-full bg-accent" aria-hidden="true" />
                {s.parking.accessEyebrow}
              </li>
            </ul>
            <p>{s.parking.planCaption}</p>
          </figcaption>
        </figure>
      </Band>

      <Band tinted>
        <SectionHead eyebrow={s.parking.tableEyebrow} title={s.parking.tableTitle} lede={s.parking.tableLede} />
        <Stagger className="grid gap-4 sm:grid-cols-3" gap={0.08}>
          {[
            { icon: SquareParking, title: s.parking.table.bay, rows: [[s.parking.table.width, `${lp.standard.bayWidthM} ${m}`], [s.parking.table.length, `${lp.standard.bayLengthM} ${m}`]] },
            {
              icon: Route,
              title: s.parking.table.driveway,
              rows: [
                [s.parking.table.width, `${lp.standard.drivewayWidthM} ${m}`],
                ['', lp.standard.driveway === 'TWO_WAY' ? s.parking.table.twoWay : lp.standard.driveway],
              ],
            },
            { icon: Ruler, title: s.parking.table.angle, rows: [['', lp.standard.angle === 'DEG_90' ? s.parking.table.deg90 : lp.standard.angle]] },
          ].map((card) => (
            <Item key={card.title} className="grid content-start gap-4 rounded-xl border border-line bg-base p-6 shadow-soft">
              <span className="flex items-center gap-2.5 text-[15px] font-medium text-fg">
                <card.icon className="size-5 text-accent" aria-hidden="true" />
                {card.title}
              </span>
              <dl className="grid gap-2">
                {card.rows.map(([k, val]) => (
                  <div key={`${k}${val}`} className="flex items-baseline justify-between gap-3 border-t border-subtle pt-2">
                    <dt className="text-[12.5px] text-secondary">{k}</dt>
                    <dd className="figure text-[18px] text-fg">{val}</dd>
                  </div>
                ))}
              </dl>
            </Item>
          ))}
        </Stagger>
      </Band>

      <Band>
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHead eyebrow={s.parking.reachEyebrow} title={s.parking.reachTitle} className="mb-6" />
            <p className="text-[15px] leading-relaxed text-secondary">{s.parking.reachBody}</p>
            <p className="mt-4 rounded-lg border border-line bg-panel p-4 text-[13.5px] leading-relaxed text-secondary shadow-soft">{s.parking.reachTest}</p>
          </div>
          <div>
            <SectionHead eyebrow={s.parking.orientationEyebrow} title={s.parking.orientationTitle} className="mb-6" />
            <p className="text-[15px] leading-relaxed text-secondary">{s.parking.orientationBody}</p>
            {orientationNote ? (
              <blockquote className="mt-4 border-s-2 border-accent ps-4 text-[13.5px] leading-relaxed text-fg">
                <EngineText>{orientationNote}</EngineText>
              </blockquote>
            ) : null}
          </div>
        </div>
      </Band>

      <Band tinted>
        <SectionHead eyebrow={s.parking.lossesEyebrow} title={s.parking.lossesTitle} lede={s.parking.lossesLede} />
        <Stagger className="grid gap-4 md:grid-cols-3" gap={0.08}>
          {losses.map((l) => (
            <Item key={l.key} className="h-full">
              <Spotlight className="grid h-full content-start gap-3 rounded-xl border border-line bg-base p-6 shadow-soft">
                <h3 className="text-[15px] font-medium text-fg">{s.parking.losses[l.key].title}</h3>
                <p className="text-[13px] leading-relaxed text-secondary">{s.parking.losses[l.key].body}</p>
                <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-subtle pt-3">
                  <div>
                    <dt className="sr-only">{s.parking.key.bay}</dt>
                    <dd className="figure text-[22px] font-light text-fg">{s.parking.losses.bays(String(l.bays))}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">{m2}</dt>
                    <dd className="figure text-[22px] font-light text-fg">
                      {grouped(l.areaM2)}
                      <span className="ms-1 font-sans text-[12px] text-secondary">{m2}</span>
                    </dd>
                  </div>
                </dl>
              </Spotlight>
            </Item>
          ))}
        </Stagger>
      </Band>

      <Band>
        <SectionHead eyebrow={s.parking.accessEyebrow} title={s.parking.accessTitle} lede={s.parking.accessBody} />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="ring-brand shadow-soft grid content-start gap-4 rounded-xl bg-panel p-6">
            <p className="flex items-center gap-2 text-[14px] font-medium text-fg">
              <ArrowDownUp className="size-4.5 text-accent" aria-hidden="true" />
              {s.parking.accessRecommended}
            </p>
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-[12px] text-secondary">{s.parking.accessWidth}</dt>
                <dd className="figure text-[22px] font-light text-fg">
                  {v.access.recommended.widthM}
                  <span className="ms-1 font-sans text-[12px] text-secondary">{m}</span>
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-secondary">{s.parking.accessWindow}</dt>
                <dd className="figure text-[22px] font-light text-fg">
                  {v.access.recommended.usableWindowM}
                  <span className="ms-1 font-sans text-[12px] text-secondary">{m}</span>
                </dd>
              </div>
            </dl>
            <p className="border-t border-subtle pt-3 text-[13px] leading-relaxed text-fg">
              <EngineText>{v.access.recommended.rationale}</EngineText>
            </p>
          </div>
          <div className="grid content-start gap-3 rounded-xl border border-line bg-panel p-6 shadow-soft">
            <p className="text-[14px] font-medium text-fg">{s.parking.accessRejected}</p>
            <ul className="grid gap-2">
              {v.access.rejected.map((r) => (
                <li key={r.edgeSeq} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-secondary">
                  <span className="figure mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-strong text-[10.5px] text-fg">{r.edgeSeq}</span>
                  <EngineText>{r.reason}</EngineText>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Band>

      <Band tinted>
        <SectionHead eyebrow={s.parking.notEyebrow} title={s.parking.notTitle} lede={s.parking.notLede} />
        <Stagger as="ul" className="grid gap-3" gap={0.05}>
          {notes.map((n) => (
            <Item key={n} as="li" className="flex items-start gap-3 rounded-lg border border-line bg-base p-4 text-[13px] leading-relaxed text-secondary">
              <CircleSlash className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <EngineText className="not-assessed">{n}</EngineText>
            </Item>
          ))}
          <Item as="li" className="flex items-start gap-3 rounded-lg border border-strong bg-panel p-4 text-[13.5px] leading-relaxed text-fg">
            <CircleSlash className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {s.parking.noOptimiser}
          </Item>
        </Stagger>
      </Band>
    </SitePage>
  );
}
