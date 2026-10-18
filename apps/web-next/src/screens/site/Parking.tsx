import worked from '@web/screens/worked-example.json';

import { cn } from '../../lib/cn.js';
import { grouped } from '../../lib/figures.js';
import { EngineNote } from '../../lib/engine-text.js';
import { useLocale } from '../../lib/locale.js';
import { Art } from '../../site/art.js';
import { Band, PageHero, SectionHead, SitePage, useSite } from '../../site/Site.js';

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
          <line x1="0" y1="0" x2="0" y2="1.2" stroke="var(--text-secondary)" strokeWidth="0.35" />
        </pattern>
      </defs>
      <polygon points={pts(ring)} fill="var(--surface-panel)" stroke="var(--text-secondary)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      <polygon points={pts(lp.podiumRing)} fill="none" stroke="var(--border-strong)" strokeDasharray="4 3" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {rest.map((r, i) => (
        <polygon
          key={`r${i}`}
          points={pts(r.outline)}
          fill={r.kind === 'AISLE' ? 'var(--accent-subtle)' : r.kind === 'RAMP' ? 'url(#ramp-hatch)' : 'var(--surface-hover)'}
          stroke={r.kind === 'RAMP' ? 'var(--text-secondary)' : 'none'}
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {bays.map((r, i) => (
        <polygon key={`b${i}`} points={pts(r.outline)} fill="var(--surface-raised)" stroke="var(--text-tertiary)" strokeWidth={0.75} vectorEffect="non-scaling-stroke" />
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
      <span className={cn('inline-block h-3 w-5 border', className)} aria-hidden="true" />
      {label}
    </li>
  );
}

/** A figure with its unit, at the size every figure on this page shares. */
function Figure({ value, unit, size = 'text-[24px]' }: { readonly value: string; readonly unit?: string; readonly size?: string }): JSX.Element {
  return (
    <span className={cn('figure text-fg', size)}>
      {value}
      {unit ? <span className="ms-1.5 font-sans text-[13px] text-secondary">{unit}</span> : null}
    </span>
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

  const table = [
    { title: s.parking.table.bay, rows: [[s.parking.table.width, `${lp.standard.bayWidthM} ${m}`], [s.parking.table.length, `${lp.standard.bayLengthM} ${m}`]] },
    {
      title: s.parking.table.driveway,
      rows: [
        [s.parking.table.width, `${lp.standard.drivewayWidthM} ${m}`],
        ['', lp.standard.driveway === 'TWO_WAY' ? s.parking.table.twoWay : lp.standard.driveway],
      ],
    },
    { title: s.parking.table.angle, rows: [['', lp.standard.angle === 'DEG_90' ? s.parking.table.deg90 : lp.standard.angle]] },
  ];

  return (
    <SitePage path="/parking">
      <PageHero
        crumb={s.nav.parking}
        title={s.parking.title}
        lede={s.parking.lede}
        aside={
          <dl className="grid grid-cols-2 gap-x-8 gap-y-6">
            {stats.map((st) => (
              <div key={st.label} className="grid gap-1 border-t border-line pt-3">
                <dt className="text-[13px] text-secondary">{st.label}</dt>
                <dd>
                  <Figure value={st.value} unit={st.unit} size="text-[30px]" />
                </dd>
              </div>
            ))}
          </dl>
        }
      />

      <section className="mx-auto max-w-[1240px] px-4 pb-20 sm:px-6">
        <figure className="grid gap-4">
          <div className="canvas-grid overflow-hidden rounded-lg p-4 sm:p-8">
            <LevelPlan />
          </div>
          <figcaption>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-secondary">
              <KeySwatch className="border-tertiary bg-raised" label={s.parking.key.bay} />
              <KeySwatch className="border-accent/40 bg-accent-subtle" label={s.parking.key.aisle} />
              <KeySwatch className="border-secondary bg-[repeating-linear-gradient(45deg,var(--text-secondary)_0_1px,transparent_1px_4px)]" label={s.parking.key.ramp} />
              <li className="flex items-center gap-2">
                <span className="inline-block h-1 w-5 bg-accent" aria-hidden="true" />
                {s.parking.key.entrance}
              </li>
            </ul>
          </figcaption>
        </figure>
      </section>

      <Band tinted>
        <SectionHead title={s.parking.tableTitle} lede={s.parking.tableLede} />
        <div className="grid gap-x-10 gap-y-8 sm:grid-cols-3">
          {table.map((group) => (
            <div key={group.title} className="grid content-start gap-2">
              <h3 className="text-[16px] font-semibold text-fg">{group.title}</h3>
              <dl className="border-t border-line">
                {group.rows.map(([k, val]) => (
                  <div key={`${k}${val}`} className="flex items-baseline justify-between gap-3 border-b border-line py-2.5">
                    <dt className="text-[13.5px] text-secondary">{k}</dt>
                    <dd className="figure text-[18px] text-fg">{val}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </Band>

      <Band>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHead title={s.parking.reachTitle} className="mb-6" />
            <p className="text-[16px] leading-relaxed text-secondary">{s.parking.reachBody}</p>
            <p className="mt-4 text-[14.5px] leading-relaxed text-fg">{s.parking.reachTest}</p>
            <Art name="parking-reach" alt={s.art.parkingReach} className="mx-auto mt-8 w-full max-w-sm" />
          </div>
          <div>
            <SectionHead title={s.parking.orientationTitle} className="mb-6" />
            <p className="text-[16px] leading-relaxed text-secondary">{s.parking.orientationBody}</p>
            {orientationNote ? (
              <blockquote className="mt-6 text-[14.5px] leading-relaxed text-fg">
                <EngineNote text={orientationNote} />
              </blockquote>
            ) : null}
          </div>
        </div>
      </Band>

      <Band tinted>
        <SectionHead title={s.parking.lossesTitle} lede={s.parking.lossesLede} />
        <div className="grid gap-x-10 gap-y-10 md:grid-cols-3">
          {losses.map((l) => (
            <div key={l.key} className="grid content-start gap-2">
              <h3 className="text-[16px] font-semibold text-fg">{s.parking.losses[l.key].title}</h3>
              <p className="text-[14px] leading-relaxed text-secondary">{s.parking.losses[l.key].body}</p>
              <dl className="mt-2 flex flex-wrap gap-x-8 gap-y-2">
                <div>
                  <dt className="sr-only">{s.parking.key.bay}</dt>
                  <dd className="figure text-[22px] text-fg">{s.parking.losses.bays(String(l.bays))}</dd>
                </div>
                <div>
                  <dt className="sr-only">{m2}</dt>
                  <dd>
                    <Figure value={grouped(l.areaM2)} unit={m2} size="text-[22px]" />
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </Band>

      <Band>
        <SectionHead title={s.parking.accessTitle} lede={s.parking.accessBody} />
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="grid content-start gap-4">
            <h3 className="text-[16px] font-semibold text-fg">{s.parking.accessRecommended}</h3>
            <dl className="grid grid-cols-2 gap-6">
              <div className="grid gap-1">
                <dt className="text-[13px] text-secondary">{s.parking.accessWidth}</dt>
                <dd>
                  <Figure value={v.access.recommended.widthM} unit={m} />
                </dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-[13px] text-secondary">{s.parking.accessWindow}</dt>
                <dd>
                  <Figure value={v.access.recommended.usableWindowM} unit={m} />
                </dd>
              </div>
            </dl>
            <p className="text-[14.5px] leading-relaxed text-fg">
              <EngineNote text={v.access.recommended.rationale} />
            </p>
          </div>
          <div className="grid content-start gap-4">
            <h3 className="text-[16px] font-semibold text-fg">{s.parking.accessRejected}</h3>
            <ul className="grid border-t border-line">
              {v.access.rejected.map((r) => (
                <li key={r.edgeSeq} className="flex items-start gap-3 border-b border-line py-3 text-[14px] leading-relaxed text-secondary">
                  <span className="figure w-6 shrink-0 text-fg">{r.edgeSeq}</span>
                  <EngineNote text={r.reason} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Band>

      <Band tinted>
        <SectionHead title={s.parking.notTitle} lede={s.parking.notLede} />
        <ul className="grid border-t border-line">
          {notes.map((n) => (
            <li key={n} className="border-b border-line py-3.5 text-[14px] leading-relaxed text-secondary">
              <EngineNote text={n} />
            </li>
          ))}
          <li className="border-b border-line py-3.5 text-[14.5px] leading-relaxed font-medium text-fg">{s.parking.noOptimiser}</li>
        </ul>
      </Band>
    </SitePage>
  );
}
