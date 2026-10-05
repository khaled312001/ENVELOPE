/**
 * THE LANDING PAGE — rebuilt 5 Oct 2026.
 *
 * The client's direction was three things in one sentence: delete the current
 * design, build a current one, and cut the explanation down to headings and
 * buttons. The old page was five numbered sections of argued prose; this one is
 * a hero, a figure row, a bento of what it does, two compact tables and a band.
 *
 * ---------------------------------------------------------------------------
 * WHAT DID NOT CHANGE, AND WHY A REDESIGN DOES NOT GET TO CHANGE IT.
 *
 * 1. NO FIGURE ON THIS PAGE IS TYPED BY A HUMAN. Every number comes out of
 *    `worked-example.json`, which `scripts/verify-worked-example.mjs` writes
 *    from a real run and `pnpm check` re-verifies. The page once quoted a
 *    governing capacity the engine had stopped returning, for months, on the
 *    page that sells traced numbers. Shortening the page is not a licence to
 *    start typing its figures.
 *
 * 2. THE FIVE CLAIMS STAY, IN §16.5 ORDER, WITH THE REFUSAL LAST. "Cut the
 *    explanation" is a brief about prose, not about the claim statement — so
 *    the five became a TABLE of five rows instead of five essays. The
 *    information survives; the reading time does not.
 *
 * 3. "WHAT IT DOES NOT DO" STAYS, as cards rather than paragraphs. A marketing
 *    page is exactly where "never claim compliance" dies quietly, and
 *    `landing.test.tsx` enforces its presence as a PROHIBITION — a test that
 *    only checked the honest text was present would pass on a page that had
 *    added "99.4% accurate" underneath it.
 *
 * 4. THE REVEAL ANIMATES TRANSFORM ONLY. A scroll-driven animation holds its
 *    start state for anything that has never entered a viewport, so an opacity
 *    start of 0 left three whole sections blank in a full-page screenshot and
 *    would have been blank on paper.
 *
 * WHAT DID CHANGE AND IS NOT COMING BACK: the amber. The client removed the
 * ASSUMED colour treatment on 5 Oct after being shown what it costs. The
 * assumption is still named in words beside the figure it moves, because he
 * struck a design and not a disclosure.
 */
import type { JSX } from 'react';

import {
  ArrowRight,
  Boxes,
  CircleSlash,
  FileDown,
  Grid3x3,
  Layers,
  type LucideIcon,
  Ruler,
  ScanLine,
  ShieldQuestion,
  SquareStack,
} from 'lucide-react';

import { LIMITS_AR } from '../content/shared.ar.js';
import { LIMITS } from '../content/shared.js';
import { AR } from '../i18n/landing.ar.js';
import { EN } from '../i18n/landing.en.js';
import { useDict, useLocale, Verbatim } from '../i18n/locale.js';
import { Link, type Href } from '../router.js';
import { group } from './Work.js';
import SNAPSHOT from './readiness.json' with { type: 'json' };
import example from './worked-example.json' with { type: 'json' };

const V = example.verified;

/**
 * The figures the hero publishes, read off the fixture and never computed here.
 * `unit` is separate from `value` so the mono figure and its unit can be set at
 * different sizes without a string split at render time.
 */
const STATS: readonly { readonly value: string; readonly unit: string; readonly key: StatKey }[] = [
  { value: V.governingGfaM2, unit: 'm²', key: 'governing' },
  { value: V.towerPlateCapM2, unit: 'm²', key: 'plate' },
  { value: V.levels, unit: '', key: 'levels' },
  { value: V.plotAreaM2, unit: 'm²', key: 'plot' },
];
type StatKey = 'governing' | 'plate' | 'levels' | 'plot';

const STAT_LABEL: Readonly<Record<StatKey, { readonly en: string; readonly ar: string }>> = {
  governing: { en: 'Governing capacity', ar: 'السعة الحاكمة' },
  plate: { en: 'Tower plate cap', ar: 'سقف مسطح البرج' },
  levels: { en: 'Levels', ar: 'عدد الأدوار' },
  plot: { en: 'Plot area', ar: 'مساحة القطعة' },
};

/**
 * WHAT IT DOES — the bento. Six tiles, which the research puts at the middle of
 * the six-to-nine band where the pattern reads as composed rather than as a
 * list. Each is an ACTION the reader performs, not a property the product has:
 * the brief was "focus on usage".
 */
const DOES: readonly {
  readonly icon: LucideIcon;
  readonly en: readonly [string, string];
  readonly ar: readonly [string, string];
  readonly wide?: true;
}[] = [
  {
    icon: ScanLine,
    en: ['Read the affection plan', 'Upload the issued sheet. Every figure keeps its page and line.'],
    ar: ['اقرأ مخطط الافكشن', 'ارفع الورقة الصادرة. كل رقم يحتفظ بصفحته وسطره.'],
    wide: true,
  },
  {
    icon: Ruler,
    en: ['Enter the plot', 'Edge by edge, curves included. Nothing is adjusted to close the shape.'],
    ar: ['أدخل القطعة', 'حدًا حدًا، والمنحني بانحنائه. ولا يُعدَّل شيء ليُقفل الشكل.'],
  },
  {
    icon: Layers,
    en: ['Solve the envelope', 'Setbacks, plate cap and height ceiling, as a fixpoint.'],
    ar: ['حُلّ الغلاف', 'الارتدادات وسقف المسطح وسقف الارتفاع، بحلٍّ تقاربي.'],
  },
  {
    icon: Grid3x3,
    en: ['Lay out the parking', 'Bays, aisles and a ramp — placed, not divided out of an area.'],
    ar: ['ارصف المواقف', 'مواقف وممرات ومنحدر — تُرصف فعلًا، لا تُقسم مساحة على معامل.'],
    wide: true,
  },
  {
    icon: Boxes,
    en: ['Inspect the massing', 'Every level at its floor, every car in its bay.'],
    ar: ['عاينه مجسَّمًا', 'كل دور عند منسوبه، وكل سيارة في موقفها.'],
  },
  {
    icon: FileDown,
    en: ['Export the set', 'Report, drawings, DXF, glTF, JSON and XLSX — behind two gates.'],
    ar: ['صدّر المجموعة', 'تقرير ورسومات وDXF وglTF وJSON وXLSX — خلف بوابتين.'],
  },
];

export function Landing({
  navigate,
}: {
  readonly navigate: (to: Href) => void;
}): JSX.Element {
  const t = useDict(EN, AR);
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const limits = ar ? LIMITS_AR : LIMITS;

  /* The five claims, in §16.5 order. The refusal is LAST and the order is not a
     layout choice — `landing.test.tsx` finds each by first occurrence and fails
     if the regulatory row is not final. */
  const claims = [
    t.claims.selfConsistency,
    t.claims.coverage,
    t.claims.geometry,
    t.claims.judgement,
    t.claims.regulatory,
  ] as const;

  return (
    <div className="lp">
      {/* ================================================================
       *  HERO
       * ============================================================= */}
      <section className="mhero">
        <div className="mx mhero__in">
          <p className="meyebrow m-rise" style={{ '--m-order': 0 } as React.CSSProperties}>
            {ar ? 'عرض توضيحي للمحرك' : 'Engine demonstration'}
          </p>

          <h1 className="mdisplay m-rise" style={{ '--m-order': 1 } as React.CSSProperties}>
            {t.title}
          </h1>

          <p className="mlede m-rise" style={{ '--m-order': 2 } as React.CSSProperties}>
            {t.lede.before}
            <em>{t.lede.emphasis}</em>
            {t.lede.after}
          </p>

          <div
            className="mhero__actions m-rise"
            style={{ '--m-order': 3 } as React.CSSProperties}
          >
            <Link className="mbtn mbtn--primary mbtn--lg" to="/app" navigate={navigate}>
              {t.cta.run}
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link className="mbtn mbtn--ghost mbtn--lg" to="/refusals" navigate={navigate}>
              <CircleSlash aria-hidden="true" />
              {t.cta.refusals}
            </Link>
          </div>

          {/* The validity stamp sits IN the fold, at the same weight as the
              action beside it. Below it, it would be a footnote to a claim the
              reader has already formed.

              `data-claim="regulatory"` is not styling and nothing reads it as
              styling. It is the hook `scripts/amber.mjs` measures the POSITION of,
              and a semantic attribute rather than the `lp-validity` class because a
              gate bound to a class name is a gate a rename silently deletes — the
              same reason the colophon carries `data-group`. That sentence above
              needed something to hold it to, because for as long as this page has
              existed its placement has been enforced by nothing: the unit test can
              see the stamp is PRESENT and only a browser knows it is above the fold,
              and amber.mjs is the only gate in this repository that opens one here. */}
          <p
            className="lp-validity m-rise"
            data-claim="regulatory"
            style={{ '--m-order': 4 } as React.CSSProperties}
          >
            <strong>{t.validity.stamp}</strong>
            {t.validity.body}
          </p>
        </div>
      </section>

      {/* ================================================================
       *  THE FIGURES — one run, read off the fixture.
       * ============================================================= */}
      <section className="msection lp-figures">
        <div className="mx">
          <div className="mstats m-reveal">
            {STATS.map((s) => (
              <div key={s.key} className="mstat">
                <div className="mstat__figure">
                  <Verbatim>{group(s.value)}</Verbatim>
                  {s.unit ? <span className="mstat__unit"> {s.unit}</span> : null}
                </div>
                <div className="mstat__label">
                  {ar ? STAT_LABEL[s.key].ar : STAT_LABEL[s.key].en}
                </div>
              </div>
            ))}
          </div>

          {/* The band that binds, named in WORDS. Colour carries none of it. */}
          <p className="lp-binds m-reveal">
            <SquareStack aria-hidden="true" />
            <Verbatim>{V.formulas.governingGfa}</Verbatim>
          </p>

          {/* ----------------------------------------------------------------
              THE ASSUMPTION THAT MOVES THE ANSWER, IN THE FOLD AND SHIPPED OPEN.

              Not inside the disclosure below. The governing capacity rests on an
              area divided by an assumed factor, and the assumption has to be in
              the same eyeful as the number rather than one click away — behind a
              closed disclosure it is present in the markup and absent from the
              page, which is the shape of every disclosure defect this product
              exists to prevent.

              `data-state="assumed"` is the state layer's own hook and it stays.
              The client removed the amber COLOUR on 5 Oct, and the attribute is
              what the colour used to hang from — so the treatment is now a tag,
              a rule and a word, with no hue in it. The distinction survives in
              the markup, which is also what keeps it legible in greyscale print
              and to a reader who cannot separate the hues.
              -------------------------------------------------------------- */}
          <p className="lp-assumed m-reveal" data-state="assumed">
            <span className="lp-assumed__tag">
              <Verbatim>{V.bayAreaFactorClass}</Verbatim>
            </span>
            <span>
              {t.assumed.before} <Verbatim>{V.bayAreaFactorM2}</Verbatim>
              {' m²/bay'}
              {t.assumed.after}
              <Verbatim>{V.bayAreaFactorBasis}</Verbatim>
            </span>
          </p>

          {/* The verdict, TEMPLATED from the fixture and never typed. A rule edit
              that made a different band bind rewrites this sentence; a typed one
              would stay false with every gate green. */}
          <p className="lp-verdict m-reveal">
            {t.capacities.verdict.before}
            <Verbatim>{V.governingBand}</Verbatim>
            {t.capacities.verdict.between}
            <Verbatim>{V.nextBindingBand}</Verbatim>
            {t.capacities.verdict.after}
            <Verbatim>{group(V.headroomToNextM2)}</Verbatim>
            {' m²'}
            {t.capacities.verdict.end}
          </p>

          {/* ------------------------------------------------------------
              THE DERIVATION, BEHIND A DISCLOSURE.

              The brief was "headings and buttons, cut the explanation", and
              the product's rule is that no figure is published without its
              derivation. A disclosure satisfies both: the surface is a
              button, and every number above remains one click from the
              engine's own words. It is NOT the old page's five sections
              moved behind a toggle — there is no prose in here at all, only
              the engine's formula strings, the assumption that moves the
              answer, and the recorded input the run was computed from.
              ---------------------------------------------------------- */}
          <details className="lp-derive m-reveal">
            <summary className="mbtn mbtn--ghost">
              <Ruler aria-hidden="true" />
              {ar ? 'من أين جاءت هذه الأرقام' : 'Where these numbers come from'}
            </summary>

            <div className="lp-derive__body">
              {/* Each published figure, with the engine's own formula. */}
              <dl className="lp-derive__list">
                {(
                  [
                    ['bandA', V.bandAM2],
                    ['bandB', V.bandBM2],
                    ['bandC', V.bandCM2],
                  ] as const
                ).map(([k, value]) => (
                  <div key={k} className="lp-derive__row" data-state="derived">
                    <dt>
                      <span className="lp-derive__class">
                        <Verbatim>DERIVED</Verbatim>
                      </span>{' '}
                      <Verbatim>{group(value)}</Verbatim> m²
                    </dt>
                    <dd>
                      <Verbatim>{V.formulas[k]}</Verbatim>
                    </dd>
                  </div>
                ))}
              </dl>

              {/* The levels the ANSWER places, against the levels the height
                  ceiling permits. Two different counts, and printing the
                  ceiling's as if they were built is the overclaim this line
                  exists to prevent. */}
              <p className="lp-derive__levels">
                {t.figure.spec.levels} <Verbatim>{V.levels}</Verbatim>
                {t.figure.spec.levelsOf}
                <Verbatim>{V.maxLevelsByHeight}</Verbatim>
                {t.figure.spec.levelsAfter}
              </p>

              {/* The recorded input the run was computed from: the plot, and
                  what each boundary faces. Named from the input's own tokens,
                  never from a literal per edge. */}
              <ul className="lp-derive__edges">
                <li>
                  <Verbatim>{t.figure.landUse(example.input.plot.landUse)}</Verbatim>
                </li>
                {example.input.plot.edges.map((e) => (
                  <li key={e.seq}>
                    <Verbatim>
                      {t.figure.edge(
                        e.classification,
                        'roadHierarchy' in e ? e.roadHierarchy : undefined,
                      )}
                    </Verbatim>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </div>
      </section>

      {/* ================================================================
       *  WHAT IT DOES — the bento
       * ============================================================= */}
      <section className="msection" id="does">
        <div className="mx">
          <h2 className="mdisplay mdisplay--sm m-reveal">
            {ar ? 'ما تفعله به' : 'What you do with it'}
          </h2>

          <div className="mbento m-reveal">
            {DOES.map((d) => {
              const [title, body] = ar ? d.ar : d.en;
              const Mark = d.icon;
              return (
                <article
                  key={title}
                  className={`mcard mcard--lift${d.wide ? ' mbento__wide' : ''}`}
                >
                  <span className="mcard__icon">
                    <Mark aria-hidden="true" />
                  </span>
                  <h3 className="mcard__title">{title}</h3>
                  <p className="mcard__body">{body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================================
       *  THE FIVE CLAIMS — a table, not five essays.
       * ============================================================= */}
      <section className="msection lp-claims-s" id="claims">
        <div className="mx">
          <h2 className="mdisplay mdisplay--sm m-reveal">{t.claims.title}</h2>

          <ul className="lp-claims m-reveal">
            {claims.map((c) => (
              <li key={c.title} className="lp-claim">
                <span className="lp-claim__title">{c.title}</span>
                <span className="lp-claim__status">{c.status}</span>
              </li>
            ))}
          </ul>

          <Link className="mbtn mbtn--quiet" to="/refusals" navigate={navigate}>
            {t.claims.link}
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* ================================================================
       *  WHAT IT DOES NOT DO
       * ============================================================= */}
      <section className="msection" id="limits">
        <div className="mx">
          <h2 className="mdisplay mdisplay--sm m-reveal">{t.limits.title}</h2>

          <div className="mbento m-reveal">
            {limits.map((l) => (
              <article key={l.id} className="mcard lp-limit">
                <span className="mcard__icon lp-limit__icon">
                  <ShieldQuestion aria-hidden="true" />
                </span>
                <h3 className="mcard__title">{l.heading}</h3>
              </article>
            ))}
          </div>

          <Link className="mbtn mbtn--quiet" to="/refusals" navigate={navigate}>
            {t.limits.link}
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* ================================================================
       *  READINESS — the inverted band, and it leads with what is not ready.
       * ============================================================= */}
      <section className="lp-readiness">
        <div className="mx lp-readiness__in">
          <h2 className="mdisplay mdisplay--sm">{t.readiness.title}</h2>
          <p className="lp-readiness__body">{t.readiness.body}</p>
          <div className="mhero__actions">
            <Link className="mbtn mbtn--primary" to="/readiness" navigate={navigate}>
              {t.readiness.numbers}
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link className="mbtn mbtn--ghost" to="/app" navigate={navigate}>
              {t.readiness.engine}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
