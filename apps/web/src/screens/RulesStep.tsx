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

import { Decimal, levelCode, scheduleRefusal, type LevelSchedule } from '@envelope/core';
import { Fragment, useEffect, useState, type ReactNode } from 'react';

import {
  api,
  ApiError,
  type Actor,
  type DeveloperStandardView,
  type ParkingComparison,
  type PlotView,
  type PracticeStatementView,
  type RuleSummary,
  type RunRequestBody,
  type StandardsView,
  type StatementsView,
} from '../api/client.js';
import { readDecimal } from '../decimalInput.js';
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
/*
  The core figures named once, because no digit lives in a dictionary.
  The share is the engine's own `ASSUMED_PLATE_SHARE` written for a reader;
  the example is an ordinary residential core, not this plot's.
*/
const CORE_ASSUMED_SHARE = '18%';
const CORE_AREA_EXAMPLE = '180';
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
  /**
   * THE LEVEL SCHEDULE, which replaced two integers that could not say what a
   * building is made of.
   *
   * Eng. Mohamed, 2026-09-28: it should be the ground floor, how many basements,
   * how many podium levels. Each behaves differently — a basement has no setback
   * and costs ramp length, the ground floor carries the vehicle entrance, a
   * podium level is bound by the podium setback — and "5 parking levels" said
   * none of it.
   *
   * EVERY COUNT STARTS AT ZERO, on the client's instruction of 6 Oct 2026 —
   * *«وخلي دايما الرقم 0 واحنا نزود»*. It opened on one basement and one podium
   * level, which was the old two-integer default said out loud, and that was
   * still a building this screen had described rather than the reader: a basement
   * costs ramp length and excavation and nobody had asked for one. The ground
   * floor stays ticked because something must hold the parking — a schedule with
   * no parking level at all is one the engine refuses, and opening on a refusal
   * is a form that starts by telling the reader he is wrong.
   *
   * The order on screen is the building from the ground up — the ground floor,
   * then the podium, then what is under it — which is the order he reads the
   * height code in and the order he asked for.
   */
  const [basements, setBasements] = useState('0');
  const [groundIsParking, setGroundIsParking] = useState(true);
  const [podiumAbove, setPodiumAbove] = useState<string>(
    sheetPodiumLevels ? String(sheetPodiumLevels.value) : '0',
  );
  const [podiumParking, setPodiumParking] = useState('0');
  /**
   * The schedule as a value, and what is wrong with it if anything.
   *
   * `scheduleRefusal` is the engine's own function, imported rather than
   * re-implemented: a screen that decided for itself what a valid schedule is
   * would drift from the engine that refuses one, and the reader would meet the
   * disagreement as a run that failed after they had been told it was fine.
   */
  const schedule: LevelSchedule = {
    basements: Number(basements),
    groundIsParking,
    podiumAboveGround: Number(podiumAbove),
    podiumParkingLevels: Number(podiumParking),
  };
  const scheduleProblem = [basements, podiumAbove, podiumParking].some(
    (v) => v.trim() === '' || !Number.isInteger(Number(v)),
  )
    ? ''
    : (scheduleRefusal(schedule) ?? '');
  const scheduleOk = scheduleProblem === '' && !Number.isNaN(schedule.basements);
  const [comparison, setComparison] = useState<ParkingComparison | null>(null);
  /*
    THE PRACTITIONER'S STATEMENT IS NO LONGER OFFERED ON THIS SCREEN.

    Removed on the client's instruction of 6 Oct 2026 — *«دي زي ما قلنا الغيها»* —
    and it belongs to the same instruction as the step primers: he wants the
    screens to ask their question and stop talking. The panel was five paragraphs
    deep: a disclaimer that it is not a regulation, the statement in Arabic, a
    translation, a note on where the claim stops, and a button.

    WHAT IS LOST AND WHAT IS NOT. The question keeps all three answers, keeps no
    default, and keeps the refusal to compute until one is chosen — `FR-DEF-002`
    is untouched, and it was never the statement that enforced it. What is gone
    is the shortcut that let a reader adopt Eng. Mohamed's answer under his name
    in one click. `PracticeStatement`, `/api/statements` and the server-side
    refusal of a run that names a statement while sending a different answer all
    remain; nothing on this screen reaches them, so no run can now be attributed
    to a statement at all. That is strictly the safer direction — the hazard the
    whole mechanism was built around was a named person's opinion arriving
    looking like a citation — and it is reversible from one component.
  */
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
  /*
    THE CORE — Eng. Mohamed, 2026-09-28, the one thing he called الاهم.

    Empty is a real state and the right default: the engine assumes 18% of the
    tower plate and says so in amber, and a pre-filled figure here would be the
    hidden default the whole product refuses. This is the one field on the
    screen whose being blank is an answer.
  */
  const [coreArea, setCoreArea] = useState('');
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

  /*
    THE STATEMENT IS OFFERED, NOT APPLIED — and the difference is the requirement.

    The plan asked for this answer to arrive pre-selected. It cannot, and
    `scripts/smoke.mjs` says so in a browser: `FR-DEF-002` forbids a default on
    this question, and a checked radio beside an enabled Compute button is a
    default whatever is written above it. A reader can click past it having
    decided nothing, and the 15–35% then reaches a pro forma unowned.

    So the statement arrives as an offer with a button on it. One click, the
    answer is his, and the run carries his name — which is everything the plan
    wanted from a pre-selection except the part that made it a default.
  */
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
    /* No `parkingInFarStatementId`: this screen no longer offers a statement, so
       every answer it sends is the answer of whoever is signed in. See the note
       where the state used to be declared. */
    unitMix: mix,
    /*
      BOTH FORMS TRAVEL, AND THE SCHEDULE WINS.

      `parkingLevelsAvailable` is required by the contract and is what every
      stored run holds, so it is still sent — derived from the schedule, not
      typed twice. The server takes `levels` when it is there.
    */
    parkingLevelsAvailable:
      schedule.basements +
      (schedule.groundIsParking ? 1 : 0) +
      schedule.podiumParkingLevels,
    levels: schedule,
    /*
      Sent only when it was typed. An empty box is not zero and it is not a
      default: it is the reader saying nothing, and the engine's answer to that
      is an assumption with a basis rather than a number nobody chose.
    */
    ...(coreArea.trim() === '' ? {} : { coreAreaM2: coreRead?.value ?? coreArea.trim() }),
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
      ...(saleableUnit === 'AREA'
        ? { saleableAreaM2: efficiencyRead?.value ?? efficiency }
        : { value: efficiencyRead?.value ?? efficiency }),
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
  /*
    READ, NOT `Number()`. `Number('٠٫٩٣')`, `Number('93%')` and `Number('6,000')`
    are all NaN, and each of them is a right answer typed the way a reader types
    it. The reading is in `decimalInput.ts`; whatever it rewrote is printed beside
    the field, and the run posts the figure printed.
  */
  const efficiencyRead = readDecimal(efficiency, { percent: saleableUnit === 'RATIO' });
  const efficiencyNumber = efficiencyRead ? Number(efficiencyRead.value) : Number.NaN;
  const efficiencyValid =
    efficiencyRead !== null &&
    Number.isFinite(efficiencyNumber) &&
    efficiencyNumber > 0 &&
    (saleableUnit === 'AREA' || efficiencyNumber <= 1);
  /*
    93 TYPED AS A SHARE IS REFUSED, AND SAYS WHAT IT PROBABLY MEANT. It is not
    divided by a hundred here: without a percent sign nothing says it is one, and
    a figure the reader did not type would go to the engine. The sentence names
    both ways of writing it, and the reader picks.
  */
  const percentHint =
    saleableUnit === 'RATIO' &&
    efficiencyRead !== null &&
    !efficiencyRead.percent &&
    efficiencyNumber > 1 &&
    efficiencyNumber <= 100
      ? {
          share: new Decimal(efficiencyRead.value).div(100).toFixed(),
          percent: `${efficiencyRead.value}%`,
        }
      : undefined;

  /*
    EMPTY IS VALID — it means "I have not said", which the engine answers with
    a declared assumption. What is refused is a figure that is not a positive
    number. Whether it FITS the plate the engine decides, because only the
    engine knows the plate, and it refuses in a sentence naming both areas.
  */
  const coreRead = readDecimal(coreArea);
  const coreNumber = coreRead ? Number(coreRead.value) : Number.NaN;
  const coreValid =
    coreArea.trim() === '' || (Number.isFinite(coreNumber) && coreNumber > 0);

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

          {/*
            EXCLUDED IS FIRST BECAUSE IT IS THE ANSWER ON FILE, not because it is
            the safe one — it is the opposite of the safe one, since it produces
            the larger building. Putting the answer the file offers anywhere but
            first would make a reader hunt for the option the panel above just
            described to them.

            It is NOT pre-checked. See the effect above: a checked radio here is
            a default, and this is the one question that may not have one.
          */}
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
      <LevelSchedulePanel
        basements={basements}
        groundIsParking={groundIsParking}
        podiumAbove={podiumAbove}
        podiumParking={podiumParking}
        sheetPodiumLevels={sheetPodiumLevels}
        problem={scheduleProblem}
        onBasements={setBasements}
        onGroundIsParking={setGroundIsParking}
        onPodiumAbove={setPodiumAbove}
        onPodiumParking={setPodiumParking}
      />

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
        {...(efficiencyValid && efficiencyRead?.rewritten ? { reading: efficiencyRead.value } : {})}
        {...(percentHint ? { percentHint } : {})}
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

      {/* --- The core, which has no default and does not subtract ------- */}
      <CoreArea
        area={coreArea}
        valid={coreValid}
        {...(coreValid && coreRead?.rewritten ? { reading: coreRead.value } : {})}
        onChange={setCoreArea}
      />

      <div className="actions">
        <button
          type="button"
          className="button button--primary"
          disabled={!parkingInFar || !efficiencyValid || !coreValid || !scheduleOk || busy}
          onClick={() =>
            parkingInFar && efficiencyValid && scheduleOk && onRun(body(parkingInFar))
          }
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
        {/*
          EVERY REASON THE BUTTON IS DISABLED IS NAMED BESIDE IT. A refused core
          area or level schedule used to disable Compute with nothing here at all,
          and the only sentence saying why was a panel the reader had scrolled past.
        */}
        {!coreValid ? <p className="fine-print">{t.run.needsCore}</p> : null}
        {!scheduleOk ? <p className="fine-print">{t.run.needsLevels}</p> : null}
      </div>
    </>
  );
}

/**
 * The level schedule — what the building is made of, from the bottom up.
 *
 * Eng. Mohamed, 2026-09-28: *"هو المفروض تكون ground floor, Bassment كام دور,
 * Podium كام دور"*. This panel was two number fields — "levels available" and
 * "podium levels" — and neither could say any of that. A basement, the ground
 * floor and a podium level are three different things:
 *
 * - a basement has no setback and no coverage limit, and costs ramp length;
 * - the ground floor is bound by coverage and carries the vehicle entrance;
 * - a podium level is bound by the podium setback.
 *
 * The readout is the point of the panel as much as the fields are. `levelCode`
 * is the engine's own function, so what a reader sees here is the string the run
 * will print and not a second rendering of it — and it is the form the affection
 * plan itself prints, so the screen and the source document finally agree.
 *
 * Exported for the same reason the panels below it are: a static render runs no
 * effects, and this one sits beside two panels that only appear after an API
 * call, so a test that drove the whole step would not reach it in either language.
 */
export function LevelSchedulePanel({
  basements,
  groundIsParking,
  podiumAbove,
  podiumParking,
  sheetPodiumLevels,
  problem,
  onBasements,
  onGroundIsParking,
  onPodiumAbove,
  onPodiumParking,
}: {
  readonly basements: string;
  readonly groundIsParking: boolean;
  readonly podiumAbove: string;
  readonly podiumParking: string;
  readonly sheetPodiumLevels: { readonly value: number; readonly raw: string } | null;
  /** The engine's own refusal sentence, or the empty string. */
  readonly problem: string;
  readonly onBasements: (v: string) => void;
  readonly onGroundIsParking: (v: boolean) => void;
  readonly onPodiumAbove: (v: string) => void;
  readonly onPodiumParking: (v: string) => void;
}): JSX.Element {
  const t = useDict(EN, AR).levels;
  const ltr = useVerbatim();
  const n = (v: string): number => (Number.isInteger(Number(v)) ? Number(v) : 0);
  const schedule: LevelSchedule = {
    basements: n(basements),
    groundIsParking,
    podiumAboveGround: n(podiumAbove),
    podiumParkingLevels: n(podiumParking),
  };
  /*
    Zero as the tower count, which `levelCode` renders by leaving the tower off
    entirely. The tower comes out of the setback-to-floor fixpoint and nobody has
    run it yet — printing a guess beside three numbers a person just typed would
    make the one figure they cannot check the most prominent thing on the panel.
  */
  const code = levelCode(schedule, 0);
  const parking = schedule.basements + (groundIsParking ? 1 : 0) + schedule.podiumParkingLevels;
  return (
    <section className="panel" aria-labelledby="levels-heading">
      <header className="panel__header">
        <div>
          <h2 id="levels-heading" className="panel__title">
            {t.title}
          </h2>
          <p className="panel__subtitle">{t.subtitle}</p>
        </div>
      </header>

      {/*
        THE BUILDING FROM THE GROUND UP, which is the order it is read in.

        Ground floor, then the podium over it, then what is under both. The panel
        used to open on the basement count, so the first question a reader was
        asked about his building was how far he was digging — before he had said
        whether the ground floor parks cars. He asked for the reversal in those
        words on 6 Oct 2026.
      */}
      <div className="field field--compact">
        <label className="choice">
          <input
            type="checkbox"
            checked={groundIsParking}
            onChange={(e) => onGroundIsParking(e.target.checked)}
          />
          <span>
            <strong>{t.groundIsParking}</strong>
            <span className="choice__detail">{t.groundHelp}</span>
          </span>
        </label>
      </div>

      <div className="field field--compact">
        <label htmlFor="podium-levels">{t.podiumAbove}</label>
        <input
          id="podium-levels"
          className="input input--num"
          type="number"
          inputMode="numeric"
          min={0}
          max={20}
          value={podiumAbove}
          onChange={(e) => onPodiumAbove(e.target.value)}
          aria-describedby="podium-levels-hint"
        />
        <p id="podium-levels-hint" className="field__help">
          {sheetPodiumLevels ? (
            <>
              {t.fromSheetBefore}
              <span className="value">{ltr(sheetPodiumLevels.raw)}</span>
              {t.fromSheetAfter}
            </>
          ) : (
            <>
              {t.example.before}
              {ltr(PODIUM_EXAMPLE_DIGIT)}
              {t.example.between}
              {ltr(PODIUM_EXAMPLE_CODE)}
              {t.example.after}
            </>
          )}
        </p>
      </div>

      <div className="field field--compact">
        <label htmlFor="podium-parking">{t.podiumParking}</label>
        <input
          id="podium-parking"
          className="input input--num"
          type="number"
          inputMode="numeric"
          min={0}
          max={20}
          value={podiumParking}
          onChange={(e) => onPodiumParking(e.target.value)}
          aria-describedby="podium-parking-hint"
        />
        <p id="podium-parking-hint" className="field__help">
          {t.podiumParkingHelp}
        </p>
      </div>

      <div className="field field--compact">
        <label htmlFor="basements">{t.basements}</label>
        <input
          id="basements"
          className="input input--num"
          type="number"
          inputMode="numeric"
          min={0}
          max={8}
          value={basements}
          onChange={(e) => onBasements(e.target.value)}
          aria-describedby="basements-hint"
        />
        <p id="basements-hint" className="field__help">
          {t.basementsHelp}
        </p>
      </div>

      {/*
        WHAT THE SCHEDULE READS AS, live. The engine's own `levelCode`, so this
        is the string the run will print rather than a second rendering of it.
      */}
      <div className="field field--readout">
        <span className="field__readout-label">{t.codeLabel}</span>
        <span className="field__readout-value">{ltr(code)}</span>
        <p className="field__help">{t.codeNote}</p>
      </div>

      <div className="field field--readout">
        <span className="field__readout-label">{t.parkingLabel}</span>
        <span className="field__readout-value">{ltr(String(parking))}</span>
        <p className="field__help">{t.parkingNote}</p>
      </div>

      {/*
        The engine's sentence, not a second opinion about it — led by a line in
        the reader's own language, because the sentence itself is English in
        both. `ErrorBanner` has always done this for the API's refusals; this
        panel printed the bare sentence, which left an Arabic reader looking at
        an English paragraph with nothing saying what it was.
      */}
      {problem !== '' ? (
        <p className="field__help" data-state="blocked" role="alert">
          <strong>{t.problemLead}</strong> {ltr(problem)}
        </p>
      ) : null}
    </section>
  );
}

/**
 * The recorded statement behind a pre-filled answer.
 *
 * `FR-DEF-002` forbids a default on the parking-in-FAR question, and this screen
 * now arrives with it answered. The difference between that and a default is
 * entirely on this panel: whose answer it is, in the words it was given in,
 * dated, with the edge of the claim written down. Take the panel away and what
 * is left is the hidden default the requirement exists to prevent.
 *
 * Amber, in the same banner the developer-standard notice uses, because it is
 * the same caution: a thing that is not a regulation, sitting where a reader
 * expects one. It renders nothing at all when no statement is on file — the
 * question is then simply unanswered, which is a state this product is built for.
 *
 * Exported for the same reason the panels below are: it renders only after
 * `/api/statements` has answered, which happens in an effect, and a static
 * render runs no effects.
 */
export function StatementNote({
  statement,
  used = false,
  onUse,
}: {
  readonly statement: PracticeStatementView | undefined;
  /** True once this statement is the answer, which turns the offer into a record. */
  readonly used?: boolean;
  readonly onUse?: (statement: PracticeStatementView) => void;
}): JSX.Element | null {
  const t = useDict(EN, AR).parkingInFar.statement;
  const ltr = useVerbatim();
  if (!statement) return null;
  return (
    <div className="banner banner--assumed" role="note">
      <div>
        <strong>{t.notARule}</strong>
        <p>
          {t.prefilledBefore}
          {ltr(statement.statedBy.name)}
          {t.prefilledBetween}
          {ltr(statement.statedBy.role)}
          {t.prefilledAfter}
          {ltr(statement.statedOn)}
          {t.prefilledEnd}
        </p>
        {/*
          HIS OWN WORDS, MARKED AS ARABIC AND RIGHT-TO-LEFT WHATEVER THE PAGE IS.

          The quotation is Arabic. On the Arabic page that is the page's own
          direction and the attributes change nothing; on the English page they
          are what stops a right-to-left sentence being laid out left-to-right,
          which reorders its clauses and its punctuation. A quotation that has
          been re-ordered is not a quotation.
        */}
        <p className="fine-print">
          <strong>{t.saidLabel}</strong>
        </p>
        <blockquote className="statement__verbatim" lang="ar" dir="rtl">
          {statement.verbatim}
        </blockquote>
        <p className="fine-print">
          <strong>{t.translationLabel}</strong> {ltr(statement.translation)}
        </p>
        <p className="fine-print">
          <strong>{t.limitsLabel}</strong> {ltr(statement.limits)}
        </p>
        {/*
          THE OFFER, AND IT IS A BUTTON RATHER THAN A CHECKED RADIO.

          `FR-DEF-002` forbids a default here, and a pre-checked option beside an
          enabled Compute button is a default however it is captioned. This is
          one click and it is unmistakably an act: after it, the answer is the
          statement's and the run carries the name of whoever made it.

          Once taken it becomes a sentence rather than a control. Leaving a
          button that has already been pressed offers a reader a second press
          that would do nothing, and the radio below is where they change it.
        */}
        {used ? (
          <p className="fine-print">
            <strong>{t.inUse}</strong>
          </p>
        ) : onUse ? (
          <p>
            <button type="button" className="button" onClick={() => onUse(statement)}>
              {t.use}
            </button>
          </p>
        ) : null}
      </div>
    </div>
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
  reading,
  percentHint,
  onChange,
  onUnitChange,
}: {
  readonly standard: DeveloperStandardView | undefined;
  readonly efficiency: string;
  readonly unit: 'RATIO' | 'AREA';
  readonly valid: boolean;
  /** The figure the run will post, when it is not the characters typed. */
  readonly reading?: string;
  /** A share typed as a percentage without the sign: the two ways to write it. */
  readonly percentHint?: { readonly share: string; readonly percent: string };
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
        {valid && reading !== undefined ? (
          <p className="field__help" aria-live="polite">
            {t.readAs.before}
            <span className="value">{ltr(reading)}</span>
            {t.readAs.after}
          </p>
        ) : null}
        {efficiency.trim() !== '' && !valid ? (
          <p className="field__help" role="alert">
            {percentHint ? (
              <>
                {t.percentHint.before(EFFICIENCY_AT_MOST)}
                <span className="value">{ltr(percentHint.share)}</span>
                {t.percentHint.or}
                <span className="value">{ltr(percentHint.percent)}</span>
                {t.percentHint.after}
              </>
            ) : area ? (
              t.areaInvalid
            ) : (
              t.invalid(EFFICIENCY_ABOVE, EFFICIENCY_AT_MOST)
            )}
          </p>
        ) : null}
      </div>
    </section>
  );
}

/**
 * The core's area — Eng. Mohamed, 2026-09-28, the one thing he called الاهم.
 *
 * **The empty box is the answer "I have not said", and the engine answers it
 * with a declared assumption.** That is why nothing is pre-filled here: a figure
 * in the box on arrival is a hidden default, and this product refuses those
 * everywhere else. The panel says what the engine will assume, and what entering
 * a number changes, so a reader who leaves it blank does so knowing.
 *
 * And it says, before anything else, what the core does NOT do. The obvious
 * reading of "the core is in the calculation" is that the floor area is reduced
 * for it. It is not: a core is inside GFA and outside saleable area, so the
 * saleable figure above already carries it. Leaving that unsaid would leave a
 * reader thinking the capacity figure is 18% too high.
 */
export function CoreArea({
  area,
  valid,
  reading,
  onChange,
}: {
  readonly area: string;
  readonly valid: boolean;
  /** The figure the run will post, when it is not the characters typed. */
  readonly reading?: string;
  readonly onChange: (value: string) => void;
}): JSX.Element {
  const t = useDict(EN, AR).core;
  const ltr = useVerbatim();
  return (
    <section className="panel" aria-labelledby="core-heading">
      <header className="panel__header">
        <div>
          <h2 id="core-heading" className="panel__title">
            {t.title}
          </h2>
          <p className="panel__subtitle">{t.subtitle}</p>
        </div>
      </header>

      <div className="field">
        <label htmlFor="core-area">{t.label}</label>
        <input
          id="core-area"
          className="input input--num"
          inputMode="decimal"
          value={area}
          placeholder={t.placeholder(CORE_AREA_EXAMPLE)}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby="core-area-help"
        />
        <p id="core-area-help" className="field__help">
          {t.help.before}
          {ltr(CORE_ASSUMED_SHARE)}
          {t.help.after}
        </p>
        {valid && reading !== undefined ? (
          <p className="field__help" aria-live="polite">
            {t.readAs.before}
            <span className="value">{ltr(reading)}</span>
            {t.readAs.after}
          </p>
        ) : null}
        {area.trim() !== '' && !valid ? (
          <p className="field__help" data-state="blocked" role="alert">
            {t.invalid}
          </p>
        ) : null}
      </div>

      <p className="fine-print">{t.notSubtracted}</p>
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
      {/*
        THE GROUP'S LEDE AND EACH RULE'S NOTE ARE NO LONGER SHOWN.

        Client, 6 Oct 2026, on this screen: *«نفس الكلام الغي الشرح الي بيبان هنا»*.
        The notes are the rule author's working comments — "THIS is the circular
        rule. Its lookup key is a solver output…" — and they are addressed to
        whoever reviews the rule store, not to the person running a plot. They
        are still on every `RuleRecord`, still served by `/api/rules`, and still
        in the evidence pack; what changed is that a screen asking "which rules
        will apply" now answers that and nothing else.

        WHAT STAYED. The rule id, the parameter it binds, the instrument and the
        clause. Every one of those is a fact about what will be applied, and the
        count beside the heading is the only number here. The unapproved-rules
        banner above this list is not copy either and does not move: it is the
        refusal, and it is the one thing on the screen a reader must not miss.
      */}
      <h3 className="panel__section">
        {title} <span className="chip">{rules.length}</span>
      </h3>
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
          </li>
        ))}
      </ul>
    </div>
  );
}
