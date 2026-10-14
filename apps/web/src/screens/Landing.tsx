/**
 * THE LANDING PAGE — rebuilt again, 14 Oct 2026, to the October direction
 * (docs/05-design/direction-2026-10.md).
 *
 * The 5 Oct page was a web product's: a gradient hero, a glowing pill button, a
 * bento of icon cards that lifted on hover. The client's verdict on the result was
 * that opening the site and finding the same design means the redesign failed — so
 * this one is laid out the way the tool it sells is: the words on one side and the
 * run standing in a viewport on the other, the figures in a schedule strip, the
 * workflow as numbered steps, and nothing that floats.
 *
 * ---------------------------------------------------------------------------
 * WHAT DID NOT CHANGE, AND WHY A REDESIGN DOES NOT GET TO CHANGE IT.
 *
 * 1. NO FIGURE ON THIS PAGE IS TYPED BY A HUMAN. Every number comes out of
 *    `worked-example.json`, which `scripts/verify-worked-example.mjs` writes from a
 *    real run and `pnpm check` re-verifies.
 *
 * 2. THE FIVE CLAIMS STAY, IN §16.5 ORDER, WITH THE REFUSAL LAST.
 *
 * 3. "WHAT IT DOES NOT DO" STAYS, and `landing.test.tsx` enforces it as a
 *    PROHIBITION rather than as a copy check.
 *
 * 4. THE REGULATORY STAMP IS IN THE FOLD (`data-claim="regulatory"`, measured by
 *    `scripts/amber.mjs`), and the assumption the governing figure rests on is
 *    printed open beside the figures (`data-state="assumed"`), never behind a
 *    closed disclosure.
 *
 * 5. NOTHING ON THE PAGE IS HIDDEN BY DECORATION. There is no scroll reveal at
 *    all now: the last one that started from `opacity: 0` printed three blank
 *    sections, and the calmer page does not need one.
 */
import type { JSX } from 'react';

import { ArrowRight, CircleSlash, Ruler, SquareStack } from 'lucide-react';

import { LIMITS_AR } from '../content/shared.ar.js';
import { LIMITS } from '../content/shared.js';
import { AR } from '../i18n/landing.ar.js';
import { EN } from '../i18n/landing.en.js';
import { useDict, useLocale, Verbatim } from '../i18n/locale.js';
import { Link, type Href } from '../router.js';
import { WorkedExampleModel } from '../components/WorkedExampleModel.js';
import { group } from './Work.js';
import example from './worked-example.json' with { type: 'json' };

const V = example.verified;

/**
 * The figures the schedule strip publishes, read off the fixture and never
 * computed here. `unit` is separate from `value` so the mono figure and its unit
 * can be set at different sizes without a string split at render time.
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
 * WHAT YOU DO WITH IT — the workflow, in the order the engine runs it. Numbered,
 * because it IS a sequence: the same ten-step bar the workspace opens on, said
 * in six lines a reader can take in before they press the button.
 */
const DOES: readonly {
  readonly en: readonly [string, string];
  readonly ar: readonly [string, string];
}[] = [
  {
    en: ['Read the affection plan', 'Upload the issued sheet. Every figure keeps its page and line.'],
    ar: ['اقرأ مخطط الافكشن', 'ارفع الورقة الصادرة. كل رقم يحتفظ بصفحته وسطره.'],
  },
  {
    en: ['Enter the plot', 'Edge by edge, curves included. Nothing is adjusted to close the shape.'],
    ar: ['أدخل القطعة', 'حدا حدا، والمنحني بانحنائه. ولا يعدل شيء ليقفل الشكل.'],
  },
  {
    en: ['Solve the envelope', 'Setbacks, plate cap and height ceiling, as a fixpoint.'],
    ar: ['حل الغلاف', 'الارتدادات وسقف المسطح وسقف الارتفاع، بحل تقاربي.'],
  },
  {
    en: ['Lay out the parking', 'Bays, aisles and a ramp — placed, not divided out of an area.'],
    ar: ['ارصف المواقف', 'مواقف وممرات ومنحدر — ترصف فعلا، لا تقسم مساحة على معامل.'],
  },
  {
    en: ['Inspect the massing', 'Every level at its floor, every car in its bay.'],
    ar: ['عاينه مجسما', 'كل دور عند منسوبه، وكل سيارة في موقفها.'],
  },
  {
    en: ['Export the set', 'Report, drawings, DXF, glTF, JSON and XLSX — behind two gates.'],
    ar: ['صدر المجموعة', 'تقرير ورسومات وDXF وglTF وJSON وXLSX — خلف بوابتين.'],
  },
];

/** A section's index, as a drawing schedule numbers its sheets. Two digits. */
const index = (n: number): string => String(n).padStart(2, '0');

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
       *  HERO — the words, and the run standing in a viewport beside them.
       * ============================================================= */}
      <section className="lp-hero">
        <div className="lp-wrap lp-hero__in">
          <div className="lp-hero__copy">
            <p className="lp-eyebrow">{ar ? 'عرض توضيحي للمحرك' : 'Engine demonstration'}</p>

            <h1 className="lp-title">{t.title}</h1>

            <p className="lp-lede">
              {t.lede.before}
              <em>{t.lede.emphasis}</em>
              {t.lede.after}
            </p>

            <div className="lp-actions">
              {/*
                `?demo=worked-example` IS THE BUTTON'S PROMISE, NOT A CONVENIENCE:
                "run this plot yourself" fills the plot step from the same file
                every figure on this page is read from, so the visitor runs THIS
                plot and reaches the number they have just read.
              */}
              <Link
                className="button button--primary lp-cta"
                to="/app?demo=worked-example"
                navigate={navigate}
              >
                {t.cta.run}
                <ArrowRight aria-hidden="true" className="lp-cta__icon" />
              </Link>
              <Link className="button lp-cta" to="/refusals" navigate={navigate}>
                <CircleSlash aria-hidden="true" className="lp-cta__icon" />
                {t.cta.refusals}
              </Link>
            </div>

            {/* The validity stamp sits IN the fold, at the weight of the actions
                above it. `data-claim="regulatory"` is the hook `scripts/amber.mjs`
                measures the position of — a semantic attribute rather than a class,
                because a gate bound to a class name is a gate a rename deletes. */}
            <p className="lp-validity" data-claim="regulatory">
              <strong>{t.validity.stamp}</strong>
              {t.validity.body}
            </p>
          </div>

          {/*
            THE RUN, STOOD UP, IN A VIEWPORT. The same model every figure on this
            page comes from — `worked-example.json` and its building are written by
            one real run — so the picture and the numbers cannot disagree. It is
            still until the reader turns it on, which is why a wheel over it scrolls
            the page; `pnpm smoke` asserts both.
          */}
          <figure className="figure lp-hero__figure lp-viewport">
            <div className="lp-viewport__bar" aria-hidden="true">
              <span>3D</span>
              <span className="lp-viewport__bar-title">
                {t.figure.landUse(example.input.plot.landUse)}
              </span>
              <span>{t.figure.number}</span>
            </div>
            <div className="figure__plate lp-viewport__plate">
              <WorkedExampleModel
                label={t.figure.modelLabel(V.levels, V.maxLevelsByHeight)}
                fallback={<p className="massing-viewer__failed">{t.figure.noWebgl}</p>}
              />
            </div>
            <figcaption className="figure__caption lp-viewport__caption">
              {/* The one line the picture cannot carry: how much of the permitted
                  stack the answer places. A 3D view of a full-height envelope
                  beside a figure for a shorter building is the drawing winning
                  over the number. */}
              <dl className="figure__spec">
                <div>
                  <dt>{t.figure.spec.levels}</dt>
                  <dd>
                    <span className="value">
                      <Verbatim>{V.levels}</Verbatim>
                    </span>
                    {t.figure.spec.levelsOf}
                    <span className="value">
                      <Verbatim>{V.maxLevelsByHeight}</Verbatim>
                    </span>
                    {t.figure.spec.levelsAfter}
                  </dd>
                </div>
              </dl>
              <p className="figure__source">{t.figure.source}</p>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ================================================================
       *  THE SCHEDULE — one run, read off the fixture.
       * ============================================================= */}
      <section className="lp-section lp-section--figures">
        <div className="lp-wrap">
          <dl className="lp-spec">
            {STATS.map((s) => (
              <div key={s.key} className="lp-spec__cell" data-key={s.key}>
                <dt className="lp-spec__label">
                  {ar ? STAT_LABEL[s.key].ar : STAT_LABEL[s.key].en}
                </dt>
                <dd className="lp-spec__figure">
                  <Verbatim>{group(s.value)}</Verbatim>
                  {s.unit ? <span className="lp-spec__unit"> {s.unit}</span> : null}
                </dd>
              </div>
            ))}
          </dl>

          <div className="lp-notes">
            {/* The band that binds, named in WORDS — the engine's own formula. */}
            <p className="lp-binds">
              <SquareStack aria-hidden="true" className="lp-binds__icon" />
              <Verbatim>{V.formulas.governingGfa}</Verbatim>
            </p>

            {/* THE ASSUMPTION THAT MOVES THE ANSWER, OPEN, beside the figure it
                moves. `data-state="assumed"` is the state layer's hook; the client
                removed the amber COLOUR on 5 Oct and kept the disclosure, so the
                treatment is a tag, a rule and a word. */}
            <p className="lp-assumed" data-state="assumed">
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

            {/* The verdict, TEMPLATED from the fixture and never typed. */}
            <p className="lp-verdict">
              {t.capacities.verdict.before}
              <Verbatim>{V.governingBand}</Verbatim>
              {t.capacities.verdict.between}
              <Verbatim>{V.nextBindingBand}</Verbatim>
              {t.capacities.verdict.after}
              <Verbatim>{group(V.headroomToNextM2)}</Verbatim>
              {' m²'}
              {t.capacities.verdict.end}
            </p>

            {/* THE DERIVATION, BEHIND A DISCLOSURE: the engine's formula strings,
                the levels placed against the levels permitted, and the recorded
                input. No prose. */}
            <details className="lp-derive">
              <summary className="button lp-derive__summary">
                <Ruler aria-hidden="true" className="lp-cta__icon" />
                {ar ? 'من أين جاءت هذه الأرقام' : 'Where these numbers come from'}
              </summary>

              <div className="lp-derive__body">
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

                <p className="lp-derive__levels">
                  {t.figure.spec.levels} <Verbatim>{V.levels}</Verbatim>
                  {t.figure.spec.levelsOf}
                  <Verbatim>{V.maxLevelsByHeight}</Verbatim>
                  {t.figure.spec.levelsAfter}
                </p>

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
        </div>
      </section>

      {/* ================================================================
       *  WHAT YOU DO WITH IT — the workflow, numbered.
       * ============================================================= */}
      <section className="lp-section" id="does">
        <div className="lp-wrap">
          <header className="lp-head">
            <span className="lp-head__index">
              <Verbatim>{index(1)}</Verbatim>
            </span>
            <h2 className="lp-head__title">{ar ? 'ما تفعله به' : 'What you do with it'}</h2>
          </header>

          <ol className="lp-steps">
            {DOES.map((d, i) => {
              const [title, body] = ar ? d.ar : d.en;
              return (
                <li key={title} className="lp-step">
                  <span className="lp-step__no" aria-hidden="true">
                    {index(i + 1)}
                  </span>
                  <h3 className="lp-step__title">{title}</h3>
                  <p className="lp-step__body">{body}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ================================================================
       *  THE FIVE CLAIMS — a schedule, not five essays.
       * ============================================================= */}
      <section className="lp-section lp-section--zoned" id="claims">
        <div className="lp-wrap">
          <header className="lp-head">
            <span className="lp-head__index">
              <Verbatim>{index(2)}</Verbatim>
            </span>
            <h2 className="lp-head__title">{t.claims.title}</h2>
          </header>

          <ul className="lp-claims">
            {claims.map((c) => (
              <li key={c.title} className="lp-claim">
                <span className="lp-claim__title">{c.title}</span>
                <span className="lp-claim__status">{c.status}</span>
              </li>
            ))}
          </ul>

          <Link className="lp-more" to="/refusals" navigate={navigate}>
            {t.claims.link}
            <ArrowRight aria-hidden="true" className="lp-cta__icon" />
          </Link>
        </div>
      </section>

      {/* ================================================================
       *  WHAT IT DOES NOT DO
       * ============================================================= */}
      <section className="lp-section" id="limits">
        <div className="lp-wrap">
          <header className="lp-head">
            <span className="lp-head__index">
              <Verbatim>{index(3)}</Verbatim>
            </span>
            <h2 className="lp-head__title">{t.limits.title}</h2>
          </header>

          <ul className="lp-limits">
            {limits.map((l) => (
              <li key={l.id} className="lp-limit">
                <CircleSlash aria-hidden="true" className="lp-limit__icon" />
                <span className="lp-limit__title">{l.heading}</span>
              </li>
            ))}
          </ul>

          <Link className="lp-more" to="/refusals" navigate={navigate}>
            {t.limits.link}
            <ArrowRight aria-hidden="true" className="lp-cta__icon" />
          </Link>
        </div>
      </section>

      {/* ================================================================
       *  READINESS — the inverted band, and it leads with what is not ready.
       * ============================================================= */}
      <section className="lp-readiness">
        <div className="lp-wrap lp-readiness__in">
          <h2 className="lp-readiness__title">{t.readiness.title}</h2>
          <p className="lp-readiness__body">{t.readiness.body}</p>
          <div className="lp-actions">
            <Link
              className="button button--primary lp-cta"
              to="/readiness"
              navigate={navigate}
            >
              {t.readiness.numbers}
              <ArrowRight aria-hidden="true" className="lp-cta__icon" />
            </Link>
            <Link className="button lp-cta lp-readiness__ghost" to="/app" navigate={navigate}>
              {t.readiness.engine}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
