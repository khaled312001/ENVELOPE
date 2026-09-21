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

import type { AssumptionEntry } from './AssumptionRegister.js';
import { TracedValue, type TracedWire } from './TracedValue.js';

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
  readonly explanation: string;
}

const BAND_META = {
  REGULATORY: {
    letter: 'A',
    name: 'Regulatory capacity',
    question: 'What do FAR and the area caps permit?',
  },
  GEOMETRIC: {
    letter: 'B',
    name: 'Geometric capacity',
    question: 'What does the envelope physically hold?',
  },
  PARKING: {
    letter: 'C',
    name: 'Parking capacity',
    question: 'What can the achievable parking supply support?',
  },
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
            Capacity
          </h2>
          <p className="panel__subtitle">
            Three limits, computed separately. The governing capacity is the smallest —
            not the largest, and never an average.
          </p>
        </div>
      </header>

      {/* The answer, once, large. */}
      <div className="governing">
        <div className="governing__figure">
          <span className="governing__label">Governing capacity</span>
          <TracedValue traced={capacity.governingGfa} onInspect={onInspect} size="display" />
          <span className="governing__band">
            Band {BAND_META[capacity.governingBand].letter} ·{' '}
            {BAND_META[capacity.governingBand].name.toLowerCase()}
          </span>
        </div>
        <div className="governing__meta">
          <dl className="kv">
            <div>
              <dt>Binding constraint</dt>
              <dd>
                {capacity.governingConstraint.label}
                <span className="muted"> · {capacity.governingConstraint.ruleId}</span>
              </dd>
            </div>
            <div>
              <dt>Headroom to the next limit</dt>
              <dd>
                <span className="value">{capacity.headroomToNextM2}</span>
                <span className="value__unit">m²</span>
                <span className="muted">
                  {' '}
                  before {BAND_META[capacity.nextBindingBand as keyof typeof BAND_META]?.name.toLowerCase() ??
                    capacity.nextBindingBand.toLowerCase()}{' '}
                  binds
                </span>
              </dd>
            </div>
            <div>
              <dt>Levels</dt>
              <dd>
                <TracedValue traced={capacity.levels} onInspect={onInspect} />
              </dd>
            </div>
            <div>
              {/* §15.4 — the floor that does not fit is real lost capacity and is
                  reported rather than smoothed away. */}
              <dt>Lost to whole floors</dt>
              <dd>
                <span className="value">{capacity.integerGranularityLossM2}</span>
                <span className="value__unit">m²</span>
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
            <span className="chip chip--assumed">Assumed</span> {governingAssumption.label}
          </p>
          <p>
            <span className="value">{governingAssumption.value}</span>
            {governingAssumption.unit ? (
              <span className="value__unit">{governingAssumption.unit}</span>
            ) : null}{' '}
            — {governingAssumption.basis}
          </p>
          {governingAssumption.sensitivity ? (
            <p className="callout__note">
              Perturbed by {governingAssumption.sensitivity.perturbation}, the governing
              capacity moves between{' '}
              <span className="value">{governingAssumption.sensitivity.lowGoverningGfaM2}</span> and{' '}
              <span className="value">{governingAssumption.sensitivity.highGoverningGfaM2}</span> m².
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="governing__explanation">{capacity.explanation}</p>

      {/* The comparison. */}
      <ul className="bands">
        {bands.map(({ key, traced }) => {
          const value = Number(traced.value) || 0;
          const governing = key === capacity.governingBand;
          const meta = BAND_META[key];
          return (
            <li key={key} className={governing ? 'band band--governing' : 'band'}>
              <div className="band__head">
                <span className="band__letter" aria-hidden="true">
                  {meta.letter}
                </span>
                <div>
                  <h3 className="band__name">
                    {meta.name}
                    {governing ? <span className="chip chip--binding">binds</span> : null}
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
            <span className="realism__label">Your realism discount</span>
            <TracedValue traced={capacity.userRealismDiscount} onInspect={onInspect} />
          </div>
          <p className="fine-print">
            The engine does not estimate what is &ldquo;realistically&rdquo; achievable. That
            would need achieved-versus-permitted FAR and efficiency data that no public
            source carries, and a number invented from a heuristic is the one number you
            could not check. If you want to discount these figures, you set the factor and
            it is recorded as yours.
          </p>
        </div>
      </footer>
    </section>
  );
}
