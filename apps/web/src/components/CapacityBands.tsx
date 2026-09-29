/**
 * The three capacity bands, and which one binds.
 *
 * §15.2: "Knowing which limit binds is worth more than knowing the maximum — it
 * tells you whether to negotiate, redesign, or accept." So the governing band is
 * the only large number on the page, and the other two are shown *beside* it
 * rather than under it, because the comparison is the content.
 *
 * The visual grammar, chosen so it survives greyscale and a colour-blind reader:
 * the governing band gets a solid left border and a "binding" chip; the others
 * get a hairline. The bar lengths are the only quantitative encoding, and every
 * bar is also labelled with its value.
 */

import { AR } from '../i18n/bands.ar.js';
import { EN } from '../i18n/bands.en.js';
import { useDict } from '../i18n/locale.js';
import type { AssumptionEntry } from './AssumptionRegister.js';
import { EngineText, EngineValue, TracedValue, type TracedWire } from './TracedValue.js';

export interface CapacityView {
  readonly bandA: TracedWire;
  readonly bandB: TracedWire;
  readonly bandC: TracedWire;
  readonly governingBand: 'REGULATORY' | 'GEOMETRIC' | 'PARKING';
  readonly governingGfa: TracedWire;
  readonly governingConstraint: { readonly ruleId: string; readonly label: string };
  readonly headroomToNextM2: string;
  readonly nextBindingBand: string;
  readonly integerGranularityLossM2: string;
  readonly userRealismDiscount: TracedWire;
  readonly levels: TracedWire;
  /**
   * Saleable area, both ways round — the share and the square metres.
   *
   * Both are always present, whichever one the run was asked for. The figure a
   * reader did not type is the one that tells them the other is wrong.
   */
  readonly saleableEfficiency: TracedWire;
  readonly saleableAreaM2: TracedWire;
  readonly explanation: string;
}

/**
 * The band letters, which are names rather than words — the PRD, the report and
 * every export call the bands A, B and C in either language. Each band's name and
 * question are copy, and live in `i18n/bands.*.ts`.
 */
const BAND_LETTER = {
  REGULATORY: 'A',
  GEOMETRIC: 'B',
  PARKING: 'C',
} as const;

export function CapacityBands({
  capacity,
  onInspect,
  governingAssumption,
}: {
  readonly capacity: CapacityView;
  readonly onInspect: (nodeId: string) => void;
  /**
   * The assumption the governing figure rests on, picked out of the run's own
   * register by the caller. Optional because a run whose governing band is not
   * PARKING may have no such entry, and because absence must render as absence.
   */
  readonly governingAssumption?: AssumptionEntry | undefined;
}): JSX.Element {
  const t = useDict(EN, AR);
  const bands = [
    { key: 'REGULATORY' as const, traced: capacity.bandA },
    { key: 'GEOMETRIC' as const, traced: capacity.bandB },
    { key: 'PARKING' as const, traced: capacity.bandC },
  ];
  const max = Math.max(...bands.map((b) => Number(b.traced.value) || 0), 1);

  return (
    <section className="panel" aria-labelledby="capacity-heading">
      <header className="panel__header">
        <div>
          <h2 id="capacity-heading" className="panel__title">
            {t.title}
          </h2>
          <p className="panel__subtitle">{t.subtitle}</p>
        </div>
      </header>

      {/* The answer, once, large. */}
      <div className="governing">
        <div className="governing__figure">
          <span className="governing__label">{t.governing}</span>
          <TracedValue traced={capacity.governingGfa} onInspect={onInspect} size="display" />
          <span className="governing__band">
            {t.band}
            {BAND_LETTER[capacity.governingBand]}
            {' · '}
            {t.bandName(t.bands[capacity.governingBand].name)}
          </span>
        </div>
        <div className="governing__meta">
          <dl className="kv">
            <div>
              <dt>{t.binding}</dt>
              <dd>
                <EngineText>{capacity.governingConstraint.label}</EngineText>
                <span className="muted">
                  {' · '}
                  <EngineText>{capacity.governingConstraint.ruleId}</EngineText>
                </span>
              </dd>
            </div>
            <div>
              <dt>{t.headroom}</dt>
              <dd>
                <span className="value">{capacity.headroomToNextM2}</span>
                <span className="value__unit">m²</span>
                <span className="muted">
                  {t.beforeBinds(
                    t.bandName(
                      t.bands[capacity.nextBindingBand as keyof typeof BAND_LETTER]?.name ??
                        capacity.nextBindingBand,
                    ),
                  )}
                </span>
              </dd>
            </div>
            <div>
              <dt>{t.levels}</dt>
              <dd>
                <TracedValue traced={capacity.levels} onInspect={onInspect} />
              </dd>
            </div>
            <div>
              {/* §15.4 — the floor that does not fit is real lost capacity and is
                  reported rather than smoothed away. */}
              <dt>{t.lostToFloors}</dt>
              <dd>
                <span className="value">{capacity.integerGranularityLossM2}</span>
                <span className="value__unit">m²</span>
              </dd>
            </div>
            {/*
              BOTH SALEABLE FIGURES, AND THE ONE THE READER DID NOT TYPE IS THE
              USEFUL ONE.

              The rules step takes either a share of GFA or an area in square
              metres. Whichever was entered, the engine computes the other and
              publishes both — so somebody who typed 6,000 m² and is shown a 34%
              share can see at once that one of the two came from a different
              plot. Holding the conversion inside the engine and never showing it
              would make that mistake invisible until a pro forma was built on it.
            */}
            <div>
              <dt>{t.saleableArea}</dt>
              <dd>
                <TracedValue traced={capacity.saleableAreaM2} onInspect={onInspect} />
              </dd>
            </div>
            <div>
              <dt>{t.saleableShare}</dt>
              <dd>
                <TracedValue traced={capacity.saleableEfficiency} onInspect={onInspect} />
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/*
        THE ASSUMPTION THE GOVERNING FIGURE RESTS ON, BESIDE THE FIGURE.

        When PARKING binds, this number is not a measurement of anything placed.
        `pipeline.ts` runs `computeBands` before `planParkingLevel`, so the laid-out
        bays, aisles and ramp are strictly downstream of Band C and cannot inform
        it. Band C rests on `parking.supportable_unit_ceiling`, whose supply term is
        `floor(available area ÷ the area factor)` — and that factor is ASSUMED.

        Before this, the entire amber budget on this screen was a 60×20px chip in
        the provenance legend three hundred pixels above, while the panel printed
        the governing figure with the binding constraint beside it in accent blue.
        A reader could take the number and never meet the assumption underneath it.
        A legend explains a colour; it does not carry a fact.

        The entry is SELECTED from the run's own assumption register, never rebuilt
        here — `basis` and `sensitivity` are the engine's, and a panel that composed
        its own basis string would be inventing provenance at the composition root.
        If the register has no such entry, nothing renders: absence is reported by
        absence, not by a placeholder that looks like an assumption.
      */}
      {governingAssumption ? (
        <div className="governing__assumption callout" data-state="assumed">
          <p className="callout__title">
            <span className="chip chip--assumed">{t.assumed}</span>{' '}
            <EngineText>{governingAssumption.label}</EngineText>
          </p>
          <p>
            <span className="value">
              <EngineValue>{governingAssumption.value}</EngineValue>
            </span>
            {governingAssumption.unit ? (
              <span className="value__unit">{governingAssumption.unit}</span>
            ) : null}{' '}
            — <EngineText>{governingAssumption.basis}</EngineText>
          </p>
          {governingAssumption.sensitivity ? (
            <p className="callout__note">
              {t.perturbedBefore(governingAssumption.sensitivity.perturbation)}
              <span className="value">{governingAssumption.sensitivity.lowGoverningGfaM2}</span>
              {t.perturbedAnd}
              <span className="value">{governingAssumption.sensitivity.highGoverningGfaM2}</span>
              {t.perturbedAfter}
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="governing__explanation">
        <EngineText>{capacity.explanation}</EngineText>
      </p>

      {/* The comparison. */}
      <ul className="bands">
        {bands.map(({ key, traced }) => {
          const value = Number(traced.value) || 0;
          const governing = key === capacity.governingBand;
          const meta = t.bands[key];
          return (
            <li key={key} className={governing ? 'band band--governing' : 'band'}>
              <div className="band__head">
                <span className="band__letter" aria-hidden="true">
                  {BAND_LETTER[key]}
                </span>
                <div>
                  <h3 className="band__name">
                    {meta.name}
                    {governing ? <span className="chip chip--binding">{t.binds}</span> : null}
                  </h3>
                  <p className="band__question">{meta.question}</p>
                </div>
                <TracedValue traced={traced} onInspect={onInspect} />
              </div>
              <div
                className="band__bar"
                style={{ '--w': `${(value / max) * 100}%` } as React.CSSProperties}
                aria-hidden="true"
              />
            </li>
          );
        })}
      </ul>

      {/*
        §15.3 — there is no "realistic" band and there never will be. The honest
        substitute is a discount the user sets themselves, and saying so plainly
        here is more useful than leaving a gap the reader has to notice.
      */}
      <footer className="panel__footer">
        <div className="realism">
          <div>
            <span className="realism__label">{t.realismLabel}</span>
            <TracedValue traced={capacity.userRealismDiscount} onInspect={onInspect} />
          </div>
          <p className="fine-print">{t.realismNote}</p>
        </div>
      </footer>
    </section>
  );
}
