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
 */

import { useEffect, useState } from 'react';

import {
  api,
  ApiError,
  type Actor,
  type ParkingComparison,
  type PlotView,
  type RuleSummary,
  type RunRequestBody,
  type StandardsView,
} from '../api/client.js';

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
  busy,
  onRun,
  onError,
}: {
  readonly actor: Actor;
  readonly plot: PlotView;
  /** What the affection plan printed, if it was read at step 0. */
  readonly sheetPodiumLevels: { readonly value: number; readonly raw: string } | null;
  readonly busy: boolean;
  readonly onRun: (body: RunRequestBody) => void;
  readonly onError: (e: ApiError) => void;
}): JSX.Element {
  const [rules, setRules] = useState<{ pending: readonly RuleSummary[]; warning: string } | null>(
    null,
  );
  const [parkingInFar, setParkingInFar] = useState<RunRequestBody['parkingInFar'] | ''>('');
  const [levels, setLevels] = useState(2);
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
  const [efficiency, setEfficiency] = useState('');

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

  const body = (treatment: RunRequestBody['parkingInFar']): RunRequestBody => ({
    plotId: plot.plotId,
    parkingInFar: treatment,
    unitMix: scenario
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
      : { source: 'ASSUMED', entries: DEFAULT_MIX, basis: DEFAULT_MIX_BASIS },
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
      value: efficiency,
      source: 'USER_SET',
      basis: scenario
        ? `${standard!.developer} states ${standard!.targets.saleableEfficiencyMin.value}` +
          `-${standard!.targets.saleableEfficiencyMax.value} saleable to GFA: ` +
          `"${standard!.targets.saleableEfficiencyMin.citation.sourceTextVerbatim}". ` +
          'Selected by the person running this study.'
        : 'entered by the person running this study; no developer standard was selected',
    },
    realismDiscount: '1.00',
    useDraftRules: true,
  });

  const efficiencyValid =
    efficiency.trim() !== '' && Number(efficiency) > 0 && Number(efficiency) <= 1;

  const deferred = (rules?.pending ?? []).filter(
    (r) => r.ruleClass === 'DEFERRED' || r.mechanization === 'NON_MECHANIZABLE',
  );
  const evaluative = (rules?.pending ?? []).filter((r) => r.ruleClass === 'EVALUATIVE_ONLY');
  const generative = (rules?.pending ?? []).filter((r) => r.ruleClass === 'GENERATIVE');
  const filtering = (rules?.pending ?? []).filter((r) => r.ruleClass === 'FILTERING');

  return (
    <>
      {/* --- The blocking question ------------------------------------- */}
      <section className="panel panel--emphasis" aria-labelledby="parking-far-heading">
        <header className="panel__header">
          <div>
            <h2 id="parking-far-heading" className="panel__title">
              Does parking count toward FAR here?
            </h2>
            <p className="panel__subtitle">
              This changes the answer by 15–35%. There is no default and we will not
              assume one.
            </p>
          </div>
        </header>

        <fieldset className="choice-set">
          <legend className="sr-only">Parking-in-FAR treatment</legend>

          <label className={`choice ${parkingInFar === 'COUNTS_TOWARD_FAR' ? 'is-selected' : ''}`}>
            <input
              type="radio"
              name="parking-far"
              value="COUNTS_TOWARD_FAR"
              checked={parkingInFar === 'COUNTS_TOWARD_FAR'}
              onChange={() => setParkingInFar('COUNTS_TOWARD_FAR')}
            />
            <span>
              <strong>Yes, it counts</strong>
              <span className="choice__detail">
                Parking area consumes part of the permitted floor area, so less is left to
                sell.
              </span>
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
              <strong>No, it is excluded</strong>
              <span className="choice__detail">
                The full permitted floor area is available above the parking.
              </span>
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
              <strong>I don&rsquo;t know yet</strong>
              <span className="choice__detail">
                A legitimate answer. We will not compute a capacity, but we will show you
                what each treatment would be worth.
              </span>
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
          Show me what each answer is worth
        </button>
        {!efficiencyValid ? (
          <p className="fine-print">
            The comparison runs the pipeline twice, so it needs the saleable share of GFA
            below first.
          </p>
        ) : null}

        {comparison ? (
          <div className="comparison">
            <div className="comparison__side">
              <span className="comparison__label">If it counts</span>
              <span className="value comparison__value">
                {comparison.countsTowardFar.governingGfaM2 ?? '—'}
                <span className="value__unit">m²</span>
              </span>
            </div>
            <div className="comparison__side">
              <span className="comparison__label">If it is excluded</span>
              <span className="value comparison__value">
                {comparison.excludedFromFar.governingGfaM2 ?? '—'}
                <span className="value__unit">m²</span>
              </span>
            </div>
            <p className="comparison__verdict">{comparison.verdict}</p>
          </div>
        ) : null}
      </section>

      {/* --- Parking levels ------------------------------------------- */}
      <section className="panel">
        <header className="panel__header">
          <div>
            <h2 className="panel__title">Parking levels</h2>
            <p className="panel__subtitle">
              How many levels of structured parking the scheme can provide.
            </p>
          </div>
        </header>
        <div className="field field--compact">
          <label htmlFor="levels">Levels available</label>
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
          <label htmlFor="podium-levels">Podium levels</label>
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
                Read from the affection plan as{' '}
                <span className="value">{sheetPodiumLevels.raw}</span>. Confirm or change it —
                the run records it under your name.
              </>
            ) : (
              <>
                The number of podium levels in the height code, such as the 2 in G+2P+8. Left
                empty, the massing shows one podium level and marks it as assumed.
              </>
            )}
          </p>
        </div>
      </section>

      {/* --- Disclosure ------------------------------------------------ */}
      <section className="panel" aria-labelledby="rules-heading">
        <header className="panel__header">
          <div>
            <h2 id="rules-heading" className="panel__title">
              The rules
            </h2>
            <p className="panel__subtitle">
              What will be applied, and what will not. Both matter.
            </p>
          </div>
        </header>

        {rules ? (
          <>
            <div className="banner banner--danger" role="alert">
              <div>
                <strong>No rule in this deployment is approved.</strong>
                <p>{rules.warning}</p>
              </div>
            </div>

            <RuleGroup
              title="Construct the envelope"
              note="These build geometry directly — a setback becomes an offset, not a test."
              rules={generative}
            />
            <RuleGroup
              title="Prune candidates"
              note="Applied while constructing; a violating candidate is never created."
              rules={filtering}
            />
            <RuleGroup
              title="Can only reject, never construct"
              note="Topological rules have no constructive inverse. In Phase 0 nothing generates a floorplate, so these can only be declared."
              rules={evaluative}
            />
            <RuleGroup
              title="Applicable, and not assessed"
              note="Declared in every output so that what we did not check is visible rather than absent."
              rules={deferred}
              deferred
            />
          </>
        ) : (
          <p className="muted">Loading the rule set…</p>
        )}
      </section>

      {/* --- The developer's brief ------------------------------------- */}
      {standards && standard ? (
        <section className="panel" aria-labelledby="standard-heading">
          <header className="panel__header">
            <div>
              <h2 id="standard-heading" className="panel__title">
                Build to a developer&rsquo;s standard
              </h2>
              <p className="panel__subtitle">
                Optional, and it changes the answer. A developer&rsquo;s brief fixes the
                unit mix and the areas a scheme is priced on — which is what turns a
                permitted GFA into a unit count.
              </p>
            </div>
          </header>

          {/*
            The distinction this panel exists to preserve. A standard is a
            commercial brief; the rules above are regulation. Showing them in one
            list would be the first step to showing them in one ink.
          */}
          <div className="banner banner--assumed" role="note">
            <div>
              <strong>This is not a regulation.</strong>
              <p>{standards.disclaimer}</p>
            </div>
          </div>

          {standards.brief ? (
            <div className="callout callout--ok">
              <p>
                <strong>
                  This plot has its own brief — {standards.brief.briefId}, plot{' '}
                  {standards.brief.plotNumber}.
                </strong>{' '}
                It states FAR {standards.brief.far.value} and {standards.brief.gfaM2.value}{' '}
                m² of GFA.
              </p>
              {standards.brief.far.note ? (
                <p className="fine-print">{standards.brief.far.note}</p>
              ) : null}
              <p className="fine-print">
                Its scenarios replace the general standard&rsquo;s — the wider mix does not
                apply to this plot.
              </p>
            </div>
          ) : null}

          <fieldset className="choice-set">
            <legend className="field-group__legend">
              {standard.developer} — {standard.title}
            </legend>

            <label className={`choice ${scenarioId === '' ? 'is-selected' : ''}`}>
              <input
                type="radio"
                name="mix-scenario"
                value=""
                checked={scenarioId === ''}
                onChange={() => setScenarioId('')}
              />
              <span>
                <strong>None — use a generic mix</strong>
                <span className="choice__detail">
                  A stand-in nobody entered. It is declared as an assumption, and it moves
                  the unit count directly.
                </span>
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
                  onChange={() => {
                    setScenarioId(s.scenarioId);
                    // Fill the efficiency from the same document, at the
                    // conservative end of its range. It stays editable: it is
                    // the user's number and it is recorded as theirs.
                    if (efficiency === '') {
                      setEfficiency(standard.targets.saleableEfficiencyMin.value);
                    }
                  }}
                />
                <span>
                  <strong>
                    {s.label}{' '}
                    {s.fromBrief ? (
                      <span className="chip chip--ok">from this plot&rsquo;s brief</span>
                    ) : null}
                  </strong>
                  <span className="choice__detail">
                    {s.entries
                      .map(
                        (e) =>
                          `${(Number(e.share) * 100).toFixed(0)}% ${e.label} at ${e.nsaM2} m²`,
                      )
                      .join(' · ')}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          {scenario ? (
            <>
              <h3 className="panel__subheading">Where these areas come from</h3>
              <ul className="reason-list">
                {scenario.entries.map((e) => (
                  <li key={e.typeId}>{e.derivation}</li>
                ))}
              </ul>
              <p className="fine-print">
                {scenario.citation.instrumentId} {scenario.citation.clauseReference}, p.{' '}
                {scenario.citation.sourcePage} — &ldquo;{scenario.citation.sourceTextVerbatim}
                &rdquo;
              </p>
              {scenario.rangeNote ? (
                <p className="callout callout--warn">{scenario.rangeNote}</p>
              ) : null}
            </>
          ) : null}

          <h3 className="panel__subheading">
            What the standard asks for and this engine does not do
          </h3>
          <ul className="reason-list reason-list--uncertain">
            {standard.notMechanized.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      ) : standards?.withheld ? (
        /* Withheld by the deployment, and said so where the picker would be. An
           absent section would let the reader assume there was nothing to pick. */
        <section className="panel" aria-labelledby="standard-heading">
          <h2 id="standard-heading" className="panel__title">
            Build to a developer&rsquo;s standard
          </h2>
          <p>{standards.withheld}</p>
        </section>
      ) : null}

      {/* --- Saleable efficiency, which has no default ------------------- */}
      <section className="panel panel--emphasis" aria-labelledby="efficiency-heading">
        <header className="panel__header">
          <div>
            <h2 id="efficiency-heading" className="panel__title">
              How much of the GFA is saleable?
            </h2>
            <p className="panel__subtitle">
              Cores, corridors, structure, plant and amenity are all inside GFA and none of
              them sells. There is no default here: this engine used to take 1.00 without
              saying so, and reported more units than any building holds.
            </p>
          </div>
        </header>

        <div className="field">
          <label htmlFor="saleable-efficiency">Saleable area ÷ GFA</label>
          <input
            id="saleable-efficiency"
            className="input input--num"
            inputMode="decimal"
            value={efficiency}
            placeholder="e.g. 0.93"
            onChange={(e) => setEfficiency(e.target.value)}
            aria-describedby="saleable-efficiency-help"
          />
          <p id="saleable-efficiency-help" className="field__help">
            {standard
              ? `${standard.developer} states ${standard.targets.saleableEfficiencyMin.value} to ${standard.targets.saleableEfficiencyMax.value} — "${standard.targets.saleableEfficiencyMin.citation.sourceTextVerbatim}". Whatever you enter is recorded as yours.`
              : 'A number above 0 and at most 1. Whatever you enter is recorded as yours.'}
          </p>
          {efficiency.trim() !== '' && !efficiencyValid ? (
            <p className="field__help" role="alert">
              It has to sit above 0 and at most 1. Above 1 would mean the building sells
              more area than it has.
            </p>
          ) : null}
        </div>
      </section>

      <div className="actions">
        <button
          type="button"
          className="button button--primary"
          disabled={!parkingInFar || !efficiencyValid || busy}
          onClick={() => parkingInFar && efficiencyValid && onRun(body(parkingInFar))}
        >
          {busy ? 'Computing…' : 'Compute capacity'}
        </button>
        {!parkingInFar ? (
          <p className="fine-print">Answer the parking question above to continue.</p>
        ) : null}
        {parkingInFar && !efficiencyValid ? (
          <p className="fine-print">
            Enter the saleable share of GFA to continue. It is not a formality — it moves
            the unit count by the whole of whatever it is not.
          </p>
        ) : null}
      </div>
    </>
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
            <div className="rule-list__head">
              <code>{r.ruleId}</code>
              {r.isLifeSafety ? <span className="chip chip--danger">life safety</span> : null}
              {deferred ? <span className="chip">not assessed</span> : null}
            </div>
            <span className="muted">
              {r.parameterId} · {r.citation.instrumentId} {r.citation.clauseReference}
            </span>
            {r.note ? <p className="rule-list__note">{r.note}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
