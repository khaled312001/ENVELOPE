/**
 * The inspector section that changes with the step (direction-2026-10.md §3).
 *
 * The step in the middle shows the drawing; this says what the drawing answers.
 * On capacity, the three bands and which one governs. On parking, the bays the
 * level holds against the bays it needs, and the three losses apart. On checks,
 * the two counts. Every other step has no section, because the plot and the
 * answer above already say what there is to say.
 *
 * IT RESTATES AND NEVER COMPUTES, like the rest of the inspector. Figures are
 * `TracedValue`s off the run, the loss figures are the level plan's own, and
 * the check counts are tallied from the engine's statuses exactly as
 * `ChecksStep` tallies them. A summary that re-derived a number would be a
 * second source for it.
 */

import type { RunView } from '../api/client.js';
import { TracedValue } from '../components/TracedValue.js';
import { AR as BANDS_AR } from '../i18n/bands.ar.js';
import { EN as BANDS_EN } from '../i18n/bands.en.js';
import { AR as CHECKS_AR } from '../i18n/checks.ar.js';
import { EN as CHECKS_EN } from '../i18n/checks.en.js';
import { AR } from '../i18n/inspector.ar.js';
import { EN } from '../i18n/inspector.en.js';
import { useDict, Verbatim } from '../i18n/locale.js';
import { AR as PARKING_AR } from '../i18n/parking.ar.js';
import { EN as PARKING_EN } from '../i18n/parking.en.js';
import type { StepId } from './steps.js';

/** The band letters are names, not words — as `CapacityBands` prints them. */
const BANDS = [
  { id: 'REGULATORY', letter: 'A', key: 'bandA' },
  { id: 'GEOMETRIC', letter: 'B', key: 'bandB' },
  { id: 'PARKING', letter: 'C', key: 'bandC' },
] as const;

export function StepFacts({
  step,
  run,
  onInspect,
}: {
  readonly step: StepId;
  readonly run: RunView | null;
  readonly onInspect: (nodeId: string) => void;
}): JSX.Element | null {
  const t = useDict(EN, AR).step;
  const bands = useDict(BANDS_EN, BANDS_AR);
  const checks = useDict(CHECKS_EN, CHECKS_AR);
  const parking = useDict(PARKING_EN, PARKING_AR);
  if (!run) return null;

  if (step === 'capacity') {
    const c = run.capacity;
    return (
      <section className="inspector__section" aria-labelledby="inspector-step">
        <h2 className="inspector__heading" id="inspector-step">
          {t.capacity.heading}
        </h2>
        <dl className="inspector__facts">
          {BANDS.map((b) => {
            const governs = c.governingBand === b.id;
            return (
              <div key={b.id} data-governing={governs ? 'true' : undefined}>
                <dt>
                  <span className="inspector__letter">{b.letter}</span>
                  {bands.bands[b.id].name}
                  {governs ? <span className="inspector__governs">{t.capacity.governs}</span> : null}
                </dt>
                <dd>
                  <TracedValue traced={c[b.key]} onInspect={onInspect} />
                </dd>
              </div>
            );
          })}
        </dl>
      </section>
    );
  }

  if (step === 'parking') {
    const plan = run.levelPlan;
    const losses = plan
      ? [
          { k: parking.losses.reserved, n: plan.losses.reserved.bays, a: plan.losses.reserved.areaM2 },
          { k: parking.losses.circulation, n: plan.losses.circulation.bays, a: plan.losses.circulation.areaM2 },
          { k: parking.losses.footprint, n: plan.losses.footprint.bays, a: plan.losses.footprint.areaM2 },
        ]
      : [];
    return (
      <section className="inspector__section" aria-labelledby="inspector-step">
        <h2 className="inspector__heading" id="inspector-step">
          {t.parking.heading}
        </h2>
        {plan ? (
          <>
            <dl className="inspector__facts">
              <div>
                <dt>{t.parking.laidOut}</dt>
                <dd>
                  <TracedValue traced={plan.bayCount} onInspect={onInspect} />
                </dd>
              </div>
              <div>
                <dt>{t.parking.required}</dt>
                <dd>
                  <TracedValue traced={run.parking.totalBays} onInspect={onInspect} />
                </dd>
              </div>
            </dl>
            <h3 className="inspector__subheading">{t.parking.lossesHeading}</h3>
            <dl className="inspector__facts inspector__facts--losses">
              {losses.map((l) => (
                <div key={l.k}>
                  <dt>{l.k}</dt>
                  <dd>
                    <Verbatim>{String(l.n)}</Verbatim>
                    <span className="inspector__unit">{t.parking.bays}</span>
                    <span className="inspector__aside">
                      <Verbatim>{`${l.a} m²`}</Verbatim>
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <p className="inspector__empty">{t.parking.none}</p>
        )}
      </section>
    );
  }

  if (step === 'checks') {
    const inv = run.checks.invariants;
    const sum = run.checks.validation.summary;
    const passed = inv.results.filter((r) => r.status === 'PASS').length;
    const failed = inv.results.filter((r) => r.status === 'FAIL').length;
    return (
      <section className="inspector__section" aria-labelledby="inspector-step">
        <h2 className="inspector__heading" id="inspector-step">
          {t.checks.heading}
        </h2>
        <dl className="inspector__facts inspector__facts--stacked">
          <div>
            <dt>{t.checks.invariants}</dt>
            <dd className="inspector__chips">
              <span className="chip chip--ok">{checks.invariants.passed(String(passed))}</span>
              {failed > 0 ? (
                <span className="chip chip--danger">{checks.invariants.failed(String(failed))}</span>
              ) : null}
              <span className="chip">{checks.invariants.notAssessed(String(inv.dormant.length))}</span>
            </dd>
          </div>
          <div>
            <dt>{t.checks.outcomes}</dt>
            <dd className="inspector__chips">
              <span className="chip chip--ok">{checks.outcomes.satisfiedCount(String(sum.hardSatisfied))}</span>
              {sum.hardViolated > 0 ? (
                <span className="chip chip--danger">
                  {checks.outcomes.violatedCount(String(sum.hardViolated))}
                </span>
              ) : null}
              {sum.hardNotEvaluable > 0 ? (
                <span className="chip">{checks.outcomes.notEvaluableCount(String(sum.hardNotEvaluable))}</span>
              ) : null}
            </dd>
          </div>
        </dl>
      </section>
    );
  }

  return null;
}
