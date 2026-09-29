/**
 * Step 3 — the rules, and the one question the product refuses to guess.
 *
 * §20.2 calls the parking-in-FAR declaration the first of "the three moments
 * that carry the product": *"A blocking question with no default. It signals
 * immediately that the system will not guess on things that matter."*
 *
 * So it is the first thing on this screen, it has no pre-selected option, and
 * "I don't know yet" is a real and respectable answer that produces a blocked
 * run explaining what the answer is worth — rather than a number computed on a
 * coin flip.
 *
 * Everything else here is disclosure: which rules apply, which were considered
 * and excluded and why, and which are applicable but will not be assessed. §3.4
 * requires all three in every output, and showing them before the computation is
 * what makes the acknowledgement mean something.
 *
 * The copy is in `i18n/rules.en.ts` and `rules.ar.ts`. What stays here, in English
 * in both languages, is what is posted to the engine — the generic mix and its
 * basis, and the two bases below — because a basis string is recorded in the
 * provenance graph, printed in the report and signed at G4, and is never
 * translated.
 */

import { Fragment, useEffect, useState, type ReactNode } from 'react';

import {
  api,
  ApiError,
  type Actor,
  type DeveloperStandardView,
  type ParkingComparison,
  type PlotView,
  type RuleSummary,
  type RunRequestBody,
  type StandardsView,
} from '../api/client.js';
import { AR } from '../i18n/rules.ar.js';
import { EN } from '../i18n/rules.en.js';
import { useDict, useLocale, Verbatim } from '../i18n/locale.js';

/**
 * A rule record, a developer's text or an API sentence, isolated on the Arabic
 * page and untouched on the English one — whose markup is held byte-identical to
 * what it was before this screen's copy moved into `i18n/rules.en.ts`.
 */
function useVerbatim(): (value: ReactNode) => ReactNode {
  const { locale } = useLocale();
  return (value) => (locale === 'ar' ? <Verbatim>{value}</Verbatim> : value);
}

/*
  THE FIGURES INSIDE THIS SCREEN'S SENTENCES, each named once, because no digit is
  typed into a dictionary.

  The swing is `FR-DEF-002`'s: parking-in-FAR moves capacity by 15–35%. The 1.00 is
  what the engine used to assume for saleable efficiency without saying so. The
  example efficiency is the low end of the 93–97% the Azizi brief states. The
  podium example reads the digit out of a real height code.
*/
const PARKING_IN_FAR_SWING = '15–35%';
const PHASE = '0';
const PODIUM_EXAMPLE_DIGIT = '2';
const PODIUM_EXAMPLE_CODE = 'G+2P+8';
const EFFICIENCY_ONCE_ASSUMED = '1.00';
const EFFICIENCY_EXAMPLE = '0.93';
/* The same question asked in square metres. A figure of the order a Dubai
   residential plot actually produces, so the placeholder cannot be mistaken
   for a number in the other unit. */
const SALEABLE_AREA_EXAMPLE = '6000';
const EFFICIENCY_ABOVE = '0';
const EFFICIENCY_AT_MOST = '1';

/**
 * The mix used when no developer standard is chosen.
 *
 * A generic Dubai apartment mix, and it is `ASSUMED` rather than `USER_SET` for
 * that reason: nobody entered these numbers, they are a stand-in so the engine
 * has something to divide by. Selecting a developer standard replaces them with
 * figures that cite a page.
 */
const DEFAULT_MIX = [
  { typeId: '1BED', label: '1 bedroom', share: '0.5', nsaM2: '70' },
  { typeId: '2BED', label: '2 bedroom', share: '0.375', nsaM2: '110' },
  { typeId: '3BED', label: '3 bedroom', share: '0.125', nsaM2: '160' },
];

const DEFAULT_MIX_BASIS =
  'a generic Dubai apartment mix, used because no developer standard was selected. ' +
  'Nobody entered these areas — they are a stand-in, and they move the unit count ' +
  'directly. Select a developer standard, or enter the mix this scheme is priced on.';

export function RulesStep({
  actor,
  plot,
  sheetPodiumLevels,
  demo,
  busy,
  onRun,
  onError,
}: {
  readonly actor: Actor;
  readonly plot: PlotView;
  /** What the affection plan printed, if it was read at step 0. */
  readonly sheetPodiumLevels: { readonly value: number; readonly raw: string } | null;

  /**
   * The worked example, when the reader arrived by `?demo=worked-example`.
   *
   * Three of these four fields have no default anywhere in this screen, on
   * purpose: the parking treatment, the saleable efficiency and the level count
   * are questions the engine refuses to answer for anybody. The demo does not make
   * them defaults — it answers them the way that run answered them, says so in the
   * banner above, and leaves every control live.
   *
   * THE MIX IS THE ONE THAT MATTERS. Without it the run would silently fall back
   * to the generic mix below, which is three unit types at 50/37.5/12.5 against
   * the worked example's two at 50/50. The unit count would come out different
   * from the one on the landing page, and nothing on screen would have explained
   * why the page and the engine disagreed.
   */
  readonly demo: {
    readonly parkingInFar: string;
    readonly parkingLevelsAvailable: number;
    readonly saleableEfficiency: string;
    readonly unitMix: {
      readonly entries: readonly {
        readonly typeId: string;
        readonly label: string;
        readonly share: string;
        readonly nsaM2: string;
      }[];
      readonly basis: string;
    };
  } | null;
  readonly busy: boolean;
  readonly onRun: (body: RunRequestBody) => void;
  readonly onError: (e: ApiError) => void;
}): JSX.Element {
  const t = useDict(EN, AR);
  const ltr = useVerbatim();
  const [rules, setRules] = useState<{ pending: readonly RuleSummary[]; warning: string } | null>(
    null,
  );
  const [parkingInFar, setParkingInFar] = useState<RunRequestBody['parkingInFar'] | ''>(
    (demo?.parkingInFar as RunRequestBody['parkingInFar'] | undefined) ?? '',
  );
  const [levels, setLevels] = useState(demo?.parkingLevelsAvailable ?? 2);
  /*
    EMPTY MEANS "NOT ENTERED", NOT ZERO AND NOT ONE.

    Left empty, the request omits the field and the engine records the podium as
    ASSUMED with its own basis — amber on the capacity step, listed in the report.
    Pre-filled from the sheet, it is still a field the reader can see and change
    before it goes anywhere, and what is sent is recorded under their name.
  */
  const [podium, setPodium] = useState<string>(
    sheetPodiumLevels ? String(sheetPodiumLevels.value) : '',
  );
  const [comparison, setComparison] = useState<ParkingComparison | null>(null);
  const [standards, setStandards] = useState<StandardsView | null>(null);
  const [scenarioId, setScenarioId] = useState<string>('');
  /**
   * Saleable area over GFA. Empty until somebody answers.
   *
   * No default, for the same reason the parking-in-FAR question has none: the
   * engine used to take 1.00 here without saying so, which treated every square
   * metre of GFA as saleable and reported more units than any building holds.
   * Selecting a developer standard fills it from a cited target.
   */
  const [efficiency, setEfficiency] = useState(demo?.saleableEfficiency ?? '');
  /**
   * Which of the two the reader is typing.
   *
   * Eng. Mohamed on this field: the number he works with is an AREA — two
   * thousand square metres and up — and the field asked him for a factor between
   * 0 and 1. Both readings are legitimate, and the conversion is the engine's to
   * do against the GFA it computed. A reader dividing in their head is a reader
   * dividing by a GFA nobody has shown them yet.
   *
   * The ratio stays first and pre-selected. It is the form a developer standard
   * states, and it is what the standard picker above fills in; changing the
   * default would change what an already-entered number means.
   */
  const [saleableUnit, setSaleableUnit] = useState<'RATIO' | 'AREA'>('RATIO');

  useEffect(() => {
    void api
      .rules(actor)
      .then((r) => setRules({ pending: r.pending, warning: r.warning }))
      .catch((e) => {
        if (e instanceof ApiError) onError(e);
      });
  }, [actor, onError]);

  useEffect(() => {
    void api
      .standards(actor, plot.plotNumber)
      .then(setStandards)
      .catch((e) => {
        if (e instanceof ApiError) onError(e);
      });
  }, [actor, plot.plotNumber, onError]);

  const standard = standards?.standards[0];
  const scenario = standard?.scenarios.find((s) => s.scenarioId === scenarioId);

  /**
   * The mix this run will be computed on — decided once, posted and shown.
   *
   * IT USED TO BE DECIDED INSIDE THE REQUEST BUILDER AND SHOWN NOWHERE. The
   * generic fallback is three unit types with areas nobody entered, and its own
   * basis string says so — "Nobody entered these areas — they are a stand-in, and
   * they move the unit count directly". That sentence was posted to the engine and
   * printed in the report, and the reader on this screen, the one person who could
   * have replaced it before it mattered, never saw it. A default that argues
   * against itself in a place the decision-maker cannot read is a hidden default
   * with a clear conscience.
   *
   * So it is a value now, `UnitMixSummary` prints it, and `body()` posts it. One
   * source, two readers.
   *
   * THE DEMO'S MIX IS `USER_SET` BECAUSE THE RECORDED RUN'S WAS. Reproducing the
   * landing page's figures means posting its input unchanged, and the class is
   * part of the input. What is true — that the reader did not choose these areas —
   * is carried where provenance is actually read, in the basis string, which names
   * the worked example and says the count moves if the mix does.
   */
  const mix: RunRequestBody['unitMix'] = scenario
    ? {
        // USER_SET, because choosing to build to a developer's brief is a
        // decision a person made. The areas inside it are quoted from a cited
        // document, and the basis names it.
        source: 'USER_SET',
        entries: scenario.entries.map((e) => ({
          typeId: e.typeId,
          label: e.label,
          share: e.share,
          nsaM2: e.nsaM2,
        })),
        basis: scenario.basis,
      }
    : demo
      ? {
          source: 'USER_SET',
          entries: demo.unitMix.entries.map((e) => ({
            typeId: e.typeId,
            label: e.label,
            share: e.share,
            nsaM2: e.nsaM2,
          })),
          basis: demo.unitMix.basis,
        }
      : { source: 'ASSUMED', entries: DEFAULT_MIX, basis: DEFAULT_MIX_BASIS };

  const body = (treatment: RunRequestBody['parkingInFar']): RunRequestBody => ({
    plotId: plot.plotId,
    parkingInFar: treatment,
    unitMix: mix,
    parkingLevelsAvailable: levels,
    ...(podium.trim() !== '' ? { podiumLevels: Number(podium) } : {}),
    parkingUsableFraction: {
      value: '0.85',
      source: 'ASSUMED',
      basis:
        'the fraction of a parking level left for bays and aisles once cores, ramps and ' +
        'plant are taken out. No cited rule fixes it.',
    },
    saleableEfficiency: {
      /*
        ONE FIELD, TWO KEYS. The API refuses a body carrying both or neither, so
        exactly one is sent and the engine knows which question was answered
        without a second flag to keep in step with it.
      */
      ...(saleableUnit === 'AREA' ? { saleableAreaM2: efficiency } : { value: efficiency }),
      source: 'USER_SET',
      basis: scenario
        ? `${standard!.developer} states ${standard!.targets.saleableEfficiencyMin.value}` +
          `-${standard!.targets.saleableEfficiencyMax.value} saleable to GFA: ` +
          `"${standard!.targets.saleableEfficiencyMin.citation.sourceTextVerbatim}". ` +
          'Selected by the person running this study.'
        : saleableUnit === 'AREA'
          ? 'a saleable area in square metres, entered by the person running this study; ' +
            'the share of GFA is computed from it, and no developer standard was selected'
          : 'entered by the person running this study; no developer standard was selected',
    },
    realismDiscount: '1.00',
    useDraftRules: true,
  });

  /*
    THE BOUND DEPENDS ON THE UNIT, and getting that wrong is how a screen refuses
    a correct answer. A share sits in (0, 1]; an area is any positive number —
    6,000 m² is an ordinary saleable area and fails the share test every time.

    The upper bound on an area is checked by the ENGINE, not here, because only
    the engine knows the GFA this envelope yields. It refuses in a sentence
    naming both figures rather than reporting a ratio the reader never typed.
  */
  const efficiencyNumber = Number(efficiency);
  const efficiencyValid =
    efficiency.trim() !== '' &&
    Number.isFinite(efficiencyNumber) &&
    efficiencyNumber > 0 &&
    (saleableUnit === 'AREA' || efficiencyNumber <= 1);

  return (
    <>
      {/* --- The blocking question ------------------------------------- */}
      <section className="panel panel--emphasis" aria-labelledby="parking-far-heading">
        <header className="panel__header">
          <div>
            <h2 id="parking-far-heading" className="panel__title">
              {t.parkingInFar.title}
            </h2>
            <p className="panel__subtitle">{t.parkingInFar.subtitle(PARKING_IN_FAR_SWING)}</p>
          </div>
        </header>

        <fieldset className="choice-set">
          <legend className="sr-only">{t.parkingInFar.legend}</legend>

          <label className={`choice ${parkingInFar === 'COUNTS_TOWARD_FAR' ? 'is-selected' : ''}`}>
            <input
              type="radio"
              name="parking-far"
              value="COUNTS_TOWARD_FAR"
              checked={parkingInFar === 'COUNTS_TOWARD_FAR'}
              onChange={() => setParkingInFar('COUNTS_TOWARD_FAR')}
            />
            <span>
              <strong>{t.parkingInFar.counts.label}</strong>
              <span className="choice__detail">{t.parkingInFar.counts.detail}</span>
            </span>
          </label>

          <label className={`choice ${parkingInFar === 'EXCLUDED_FROM_FAR' ? 'is-selected' : ''}`}>
            <input
              type="radio"
              name="parking-far"
              value="EXCLUDED_FROM_FAR"
              checked={parkingInFar === 'EXCLUDED_FROM_FAR'}
              onChange={() => setParkingInFar('EXCLUDED_FROM_FAR')}
            />
            <span>
              <strong>{t.parkingInFar.excluded.label}</strong>
              <span className="choice__detail">{t.parkingInFar.excluded.detail}</span>
            </span>
          </label>

          <label
            className={`choice ${parkingInFar === 'OPEN_REGULATORY_QUESTION' ? 'is-selected' : ''}`}
          >
            <input
              type="radio"
              name="parking-far"
              value="OPEN_REGULATORY_QUESTION"
              checked={parkingInFar === 'OPEN_REGULATORY_QUESTION'}
              onChange={() => setParkingInFar('OPEN_REGULATORY_QUESTION')}
            />
            <span>
              <strong>{t.parkingInFar.open.label}</strong>
              <span className="choice__detail">{t.parkingInFar.open.detail}</span>
            </span>
          </label>
        </fieldset>

        {/*
          The comparison runs the whole pipeline twice, so it needs every input
          the run needs — including the saleable efficiency below. It is gated
          rather than defaulted for that reason: a comparison computed at an
          efficiency nobody chose would put two numbers on screen that the run
          itself would not reproduce.
        */}
        <button
          type="button"
          className="button"
          disabled={busy || !efficiencyValid}
          onClick={async () => {
            try {
              setComparison(await api.compareParkingInFar(actor, body('EXCLUDED_FROM_FAR')));
            } catch (e) {
              if (e instanceof ApiError) onError(e);
            }
          }}
        >
          {t.parkingInFar.compare}
        </button>
        {!efficiencyValid ? <p className="fine-print">{t.parkingInFar.compareNeeds}</p> : null}

        {comparison ? <ComparisonResult comparison={comparison} /> : null}
      </section>

      {/* --- Parking levels ------------------------------------------- */}
      <section className="panel">
        <header className="panel__header">
          <div>
            <h2 className="panel__title">{t.levels.title}</h2>
            <p className="panel__subtitle">{t.levels.subtitle}</p>
          </div>
        </header>
        <div className="field field--compact">
          <label htmlFor="levels">{t.levels.available}</label>
          <input
            id="levels"
            className="input input--num"
            type="number"
            min={0}
            max={8}
            value={levels}
            onChange={(e) => setLevels(Number(e.target.value))}
          />
        </div>
        <div className="field field--compact">
          <label htmlFor="podium-levels">{t.levels.podium}</label>
          <input
            id="podium-levels"
            className="input input--num"
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            value={podium}
            onChange={(e) => setPodium(e.target.value)}
            aria-describedby="podium-levels-hint"
          />
          <p id="podium-levels-hint" className="field__help">
            {sheetPodiumLevels ? (
              <>
                {t.levels.fromSheetBefore}
                <span className="value">{ltr(sheetPodiumLevels.raw)}</span>
                {t.levels.fromSheetAfter}
              </>
            ) : (
              <>
                {t.levels.example.before}
                {ltr(PODIUM_EXAMPLE_DIGIT)}
                {t.levels.example.between}
                {ltr(PODIUM_EXAMPLE_CODE)}
                {t.levels.example.after}
              </>
            )}
          </p>
        </div>
      </section>

      {/* --- Disclosure ------------------------------------------------ */}
      <RuleDisclosure rules={rules} />

      {/* --- The developer's brief ------------------------------------- */}
      <DeveloperStandardPanel
        standards={standards}
        scenarioId={scenarioId}
        onChoose={(id) => {
          setScenarioId(id);
          // Fill the efficiency from the same document, at the
          // conservative end of its range. It stays editable: it is
          // the user's number and it is recorded as theirs.
          if (id !== '' && standard && efficiency === '') {
            setEfficiency(standard.targets.saleableEfficiencyMin.value);
          }
        }}
      />

      {/* --- The mix the run will be computed on ------------------------- */}
      <UnitMixSummary mix={mix} />

      {/* --- Saleable efficiency, which has no default ------------------- */}
      <SaleableEfficiency
        standard={standard}
        efficiency={efficiency}
        unit={saleableUnit}
        valid={efficiencyValid}
        onChange={setEfficiency}
        onUnitChange={(next) => {
          /*
            THE BOX IS CLEARED WHEN THE UNIT CHANGES, deliberately.

            0.93 read as 0.93 m² is a building that sells one square metre, and
            6000 read as a share fails validation and looks like a broken field.
            Converting it silently would be worse than either: it would put a
            figure in the box that the reader did not type, on the one screen
            whose whole proposition is that nothing is quietly substituted.
          */
          setSaleableUnit(next);
          setEfficiency('');
        }}
      />

      <div className="actions">
        <button
          type="button"
          className="button button--primary"
          disabled={!parkingInFar || !efficiencyValid || busy}
          onClick={() => parkingInFar && efficiencyValid && onRun(body(parkingInFar))}
        >
          {busy ? t.run.busy : t.run.idle}
        </button>
        {!parkingInFar ? <p className="fine-print">{t.run.needsParking}</p> : null}
        {parkingInFar && !efficiencyValid ? (
          <p className="fine-print">
            {/* Name the field the reader is looking at, not the other one. */}
            {saleableUnit === 'AREA' ? t.run.needsSaleableArea : t.run.needsEfficiency}
          </p>
        ) : null}
      </div>
    </>
  );
}

/*
  THE TWO SECTIONS BELOW ARE THEIR OWN COMPONENTS, AND EXPORTED, FOR ONE REASON.

  Both render only once `/api/rules` and `/api/standards` have answered, which
  happens in an effect — and a static render runs no effects. So the copy in them
  was reached by nothing but a browser. Lifting them out changes no markup (a
  component boundary is not an element) and lets a test hand them the API's own
  answers, in either language.
*/

/** What will be applied, what will not, and why — before anything is computed. */
export function RuleDisclosure({
  rules,
}: {
  readonly rules: { readonly pending: readonly RuleSummary[]; readonly warning: string } | null;
}): JSX.Element {
  const deferred = (rules?.pending ?? []).filter(
    (r) => r.ruleClass === 'DEFERRED' || r.mechanization === 'NON_MECHANIZABLE',
  );
  const evaluative = (rules?.pending ?? []).filter((r) => r.ruleClass === 'EVALUATIVE_ONLY');
  const generative = (rules?.pending ?? []).filter((r) => r.ruleClass === 'GENERATIVE');
  const filtering = (rules?.pending ?? []).filter((r) => r.ruleClass === 'FILTERING');
  const t = useDict(EN, AR).rules;
  const ltr = useVerbatim();

  return (
    <section className="panel" aria-labelledby="rules-heading">
      <header className="panel__header">
        <div>
          <h2 id="rules-heading" className="panel__title">
            {t.title}
          </h2>
          <p className="panel__subtitle">{t.subtitle}</p>
        </div>
      </header>

      {rules ? (
        <>
          <div className="banner banner--danger" role="alert">
            <div>
              <strong>{t.noneApproved}</strong>
              {/* The API's own warning, as it wrote it. */}
              <p>{ltr(rules.warning)}</p>
            </div>
          </div>

          <RuleGroup
            title={t.groups.generative.title}
            note={t.groups.generative.note}
            rules={generative}
          />
          <RuleGroup
            title={t.groups.filtering.title}
            note={t.groups.filtering.note}
            rules={filtering}
          />
          <RuleGroup
            title={t.groups.evaluative.title}
            note={t.groups.evaluative.note(PHASE)}
            rules={evaluative}
          />
          <RuleGroup
            title={t.groups.deferred.title}
            note={t.groups.deferred.note}
            rules={deferred}
            deferred
          />
        </>
      ) : (
        <p className="muted">{t.loading}</p>
      )}
    </section>
  );
}

/**
 * The unit mix going into this run, printed before it goes.
 *
 * ---------------------------------------------------------------------------
 * THE UNIT COUNT RESTS ON FOUR NUMBERS NOBODY WAS SHOWN.
 *
 * Units are GFA over area-per-unit, and the areas come from this mix. Selecting
 * a developer standard fills it from a cited document and the picker prints what
 * it filled — but selecting nothing, which is the state this screen opens in and
 * the only state available at all when a deployment withholds the standards,
 * posted a generic mix that appeared on no screen at any point. It reached the
 * reader as a unit count and reached the report as a basis string, which is the
 * wrong order: the moment to argue with an assumption is before it is computed.
 *
 * There is no edit control here yet. Entering a mix by hand is Phase D work and
 * this is not a stand-in for it — it is the disclosure that should have been
 * there either way, and `ASSUMED` is marked as ASSUMED, in amber, in words.
 */
export function UnitMixSummary({
  mix,
}: {
  readonly mix: RunRequestBody['unitMix'];
}): JSX.Element {
  const t = useDict(EN, AR).mix;
  const ltr = useVerbatim();
  const assumed = mix.source === 'ASSUMED';
  return (
    <section className="panel" aria-labelledby="mix-heading">
      <header className="panel__header">
        <div>
          <h2 id="mix-heading" className="panel__title">
            {t.title}
          </h2>
          <p className="panel__subtitle">{t.subtitle}</p>
        </div>
      </header>

      <ul className="mix-list">
        {mix.entries.map((e) => (
          <li key={e.typeId} className="mix-list__item">
            <span className="mix-list__share">{t.share((Number(e.share) * 100).toFixed(1))}</span>
            <span className="mix-list__label">{ltr(e.label)}</span>
            <span className="mix-list__area">{t.area(e.nsaM2)}</span>
          </li>
        ))}
      </ul>

      {/* The class in words, not only in ink. A reader who has not yet learned the
          palette is exactly the reader this panel exists for. */}
      <p className={assumed ? 'mix-basis mix-basis--assumed' : 'mix-basis'}>
        {assumed ? (
          <span className="traced traced--assumed" aria-hidden="true">
            <span className="traced__marker" />
          </span>
        ) : null}
        <strong>{assumed ? t.assumed : t.userSet}</strong> {ltr(mix.basis)}
      </p>
    </section>
  );
}

/** The developer-standard picker, or the deployment's reason for withholding it. */
export function DeveloperStandardPanel({
  standards,
  scenarioId,
  onChoose,
}: {
  readonly standards: StandardsView | null;
  readonly scenarioId: string;
  /** `''` is the generic mix. */
  readonly onChoose: (scenarioId: string) => void;
}): JSX.Element | null {
  const t = useDict(EN, AR).standard;
  const ltr = useVerbatim();
  const { locale } = useLocale();
  const standard = standards?.standards[0];
  const scenario = standard?.scenarios.find((s) => s.scenarioId === scenarioId);

  if (standards && standard) {
    return (
      <section className="panel" aria-labelledby="standard-heading">
        <header className="panel__header">
          <div>
            <h2 id="standard-heading" className="panel__title">
              {t.title}
            </h2>
            <p className="panel__subtitle">{t.subtitle}</p>
          </div>
        </header>

        {/*
          The distinction this panel exists to preserve. A standard is a
          commercial brief; the rules above are regulation. Showing them in one
          list would be the first step to showing them in one ink.
        */}
        <div className="banner banner--assumed" role="note">
          <div>
            <strong>{t.notice}</strong>
            <p>{ltr(standards.disclaimer)}</p>
          </div>
        </div>

        {standards.brief ? (
          <div className="callout callout--ok">
            <p>
              <strong>
                {t.brief.before}
                {ltr(standards.brief.briefId)}
                {t.brief.plot}
                {ltr(standards.brief.plotNumber)}
                {t.brief.end}
              </strong>{' '}
              {t.brief.statesFar}
              {standards.brief.far.value}
              {t.brief.statesAnd}
              {standards.brief.gfaM2.value}
              {t.brief.statesGfa}
            </p>
            {standards.brief.far.note ? (
              <p className="fine-print">{ltr(standards.brief.far.note)}</p>
            ) : null}
            <p className="fine-print">{t.brief.replaces}</p>
          </div>
        ) : null}

        <fieldset className="choice-set">
          <legend className="field-group__legend">
            {ltr(standard.developer)} — {ltr(standard.title)}
          </legend>

          <label className={`choice ${scenarioId === '' ? 'is-selected' : ''}`}>
            <input
              type="radio"
              name="mix-scenario"
              value=""
              checked={scenarioId === ''}
              onChange={() => onChoose('')}
            />
            <span>
              <strong>{t.none.label}</strong>
              <span className="choice__detail">{t.none.detail}</span>
            </span>
          </label>

          {standard.scenarios.map((s) => (
            <label
              key={s.scenarioId}
              className={`choice ${scenarioId === s.scenarioId ? 'is-selected' : ''}`}
            >
              <input
                type="radio"
                name="mix-scenario"
                value={s.scenarioId}
                checked={scenarioId === s.scenarioId}
                onChange={() => onChoose(s.scenarioId)}
              />
              <span>
                <strong>
                  {ltr(s.label)}{' '}
                  {s.fromBrief ? <span className="chip chip--ok">{t.fromBrief}</span> : null}
                </strong>
                <span className="choice__detail">
                  {/* Each unit type's label is the developer's; the share and the area
                      are the resolved figures the API sent. */}
                  {locale === 'ar'
                    ? s.entries.map((e, k) => (
                        <Fragment key={e.typeId}>
                          {k > 0 ? t.entrySeparator : ''}
                          {t.entryShare((Number(e.share) * 100).toFixed(0))}
                          <Verbatim>{e.label}</Verbatim>
                          {t.entryArea(e.nsaM2)}
                        </Fragment>
                      ))
                    : s.entries
                        .map(
                          (e) =>
                            `${t.entryShare((Number(e.share) * 100).toFixed(0))}${e.label}${t.entryArea(e.nsaM2)}`,
                        )
                        .join(t.entrySeparator)}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        {scenario ? (
          <>
            <h3 className="panel__subheading">{t.whereFrom}</h3>
            <ul className="reason-list">
              {scenario.entries.map((e) => (
                <li key={e.typeId}>{ltr(e.derivation)}</li>
              ))}
            </ul>
            <p className="fine-print">
              {ltr(`${scenario.citation.instrumentId} ${scenario.citation.clauseReference}`)}
              {t.page}
              {scenario.citation.sourcePage}
              {t.quoteBefore}
              {ltr(scenario.citation.sourceTextVerbatim)}
              {t.quoteAfter}
            </p>
            {scenario.rangeNote ? (
              <p className="callout callout--warn">{ltr(scenario.rangeNote)}</p>
            ) : null}
          </>
        ) : null}

        <h3 className="panel__subheading">{t.notMechanized}</h3>
        <ul className="reason-list reason-list--uncertain">
          {standard.notMechanized.map((n) => (
            <li key={n}>{ltr(n)}</li>
          ))}
        </ul>
      </section>
    );
  }
  if (standards?.withheld) {
    /* Withheld by the deployment, and said so where the picker would be. An
       absent section would let the reader assume there was nothing to pick. */
    return (
      <section className="panel" aria-labelledby="standard-heading">
        <h2 id="standard-heading" className="panel__title">
          {t.title}
        </h2>
        <p>{ltr(standards.withheld)}</p>
      </section>
    );
  }
  return null;
}

/** What the two treatments are worth, side by side, and the engine's verdict on them. */
export function ComparisonResult({
  comparison,
}: {
  readonly comparison: ParkingComparison;
}): JSX.Element {
  const t = useDict(EN, AR).parkingInFar;
  const ltr = useVerbatim();
  return (
    <div className="comparison">
      <div className="comparison__side">
        <span className="comparison__label">{t.ifCounts}</span>
        <span className="value comparison__value">
          {comparison.countsTowardFar.governingGfaM2 ?? '—'}
          <span className="value__unit">m²</span>
        </span>
      </div>
      <div className="comparison__side">
        <span className="comparison__label">{t.ifExcluded}</span>
        <span className="value comparison__value">
          {comparison.excludedFromFar.governingGfaM2 ?? '—'}
          <span className="value__unit">m²</span>
        </span>
      </div>
      <p className="comparison__verdict">{ltr(comparison.verdict)}</p>
    </div>
  );
}

/**
 * The saleable-efficiency question, which has no default.
 *
 * Its own component, and exported, because the validation line below renders only
 * once somebody has typed an out-of-range value — which a static render never
 * does. Lifting it out changes no markup.
 */
export function SaleableEfficiency({
  standard,
  efficiency,
  unit,
  valid,
  onChange,
  onUnitChange,
}: {
  readonly standard: DeveloperStandardView | undefined;
  readonly efficiency: string;
  readonly unit: 'RATIO' | 'AREA';
  readonly valid: boolean;
  readonly onChange: (value: string) => void;
  readonly onUnitChange: (unit: 'RATIO' | 'AREA') => void;
}): JSX.Element {
  const t = useDict(EN, AR).efficiency;
  const ltr = useVerbatim();
  const area = unit === 'AREA';
  return (
    <section className="panel panel--emphasis" aria-labelledby="efficiency-heading">
      <header className="panel__header">
        <div>
          <h2 id="efficiency-heading" className="panel__title">
            {t.title}
          </h2>
          <p className="panel__subtitle">{t.subtitle(EFFICIENCY_ONCE_ASSUMED)}</p>
        </div>
      </header>

      {/*
        TWO RADIOS IN THE HOUSE CHOICE-SET, not a select and not a segmented
        button. They are two mutually exclusive answers to one question, both
        visible with what each one costs; a select hides the option the reader
        is looking for behind a click, and a pair of styled buttons would have
        to re-implement the arrow-key behaviour a radio group gets for nothing.
      */}
      <fieldset className="choice-set">
        <legend className="field-group__legend">{t.unit.legend}</legend>

        <label className={`choice ${area ? '' : 'is-selected'}`}>
          <input
            type="radio"
            name="saleable-unit"
            value="RATIO"
            checked={!area}
            onChange={() => onUnitChange('RATIO')}
          />
          <span>
            <strong>{t.unit.ratio.label}</strong>
            <span className="choice__detail">{t.unit.ratio.detail}</span>
          </span>
        </label>

        <label className={`choice ${area ? 'is-selected' : ''}`}>
          <input
            type="radio"
            name="saleable-unit"
            value="AREA"
            checked={area}
            onChange={() => onUnitChange('AREA')}
          />
          <span>
            <strong>{t.unit.area.label}</strong>
            <span className="choice__detail">{t.unit.area.detail}</span>
          </span>
        </label>
      </fieldset>

      <div className="field">
        <label htmlFor="saleable-efficiency">{area ? t.areaLabel : t.label}</label>
        <input
          id="saleable-efficiency"
          className="input input--num"
          inputMode="decimal"
          value={efficiency}
          placeholder={
            area ? t.areaPlaceholder(SALEABLE_AREA_EXAMPLE) : t.placeholder(EFFICIENCY_EXAMPLE)
          }
          onChange={(e) => onChange(e.target.value)}
          aria-describedby="saleable-efficiency-help"
        />
        <p id="saleable-efficiency-help" className="field__help">
          {area ? (
            t.areaHelp
          ) : standard ? (
            <>
              {t.fromStandard.before}
              {ltr(standard.developer)}
              {t.fromStandard.states}
              {standard.targets.saleableEfficiencyMin.value}
              {t.fromStandard.to}
              {standard.targets.saleableEfficiencyMax.value}
              {t.fromStandard.quoteBefore}
              {ltr(standard.targets.saleableEfficiencyMin.citation.sourceTextVerbatim)}
              {t.fromStandard.after}
            </>
          ) : (
            t.bounds(EFFICIENCY_ABOVE, EFFICIENCY_AT_MOST)
          )}
        </p>
        {efficiency.trim() !== '' && !valid ? (
          <p className="field__help" role="alert">
            {area ? t.areaInvalid : t.invalid(EFFICIENCY_ABOVE, EFFICIENCY_AT_MOST)}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function RuleGroup({
  title,
  note,
  rules,
  deferred = false,
}: {
  readonly title: string;
  readonly note: string;
  readonly rules: readonly RuleSummary[];
  readonly deferred?: boolean;
}): JSX.Element | null {
  const t = useDict(EN, AR).rules;
  const ltr = useVerbatim();
  if (rules.length === 0) return null;
  return (
    <div className={`rule-group${deferred ? ' rule-group--deferred' : ''}`}>
      <h3 className="panel__section">
        {title} <span className="chip">{rules.length}</span>
      </h3>
      <p className="fine-print">{note}</p>
      <ul className="rule-list">
        {rules.map((r) => (
          <li key={r.ruleId}>
            {/* The rule record as the store holds it: id, parameter, instrument,
                clause and note are never copy. */}
            <div className="rule-list__head">
              <code>{r.ruleId}</code>
              {r.isLifeSafety ? <span className="chip chip--danger">{t.lifeSafety}</span> : null}
              {deferred ? <span className="chip">{t.notAssessed}</span> : null}
            </div>
            <span className="muted">
              {ltr(`${r.parameterId} · ${r.citation.instrumentId} ${r.citation.clauseReference}`)}
            </span>
            {r.note ? <p className="rule-list__note">{ltr(r.note)}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
