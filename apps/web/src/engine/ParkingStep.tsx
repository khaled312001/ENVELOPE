import type { PlotView, RunView } from '../api/client.js';
import { DrawingSet } from '../components/DrawingSet.js';
import { ParkingPlan, VehicleAccessPanel } from '../components/ParkingPlan.js';
import { TracedValue } from '../components/TracedValue.js';
import { AR } from '../i18n/app.ar.js';
import { EN } from '../i18n/app.en.js';
import { useDict } from '../i18n/locale.js';
import { useVerbatim } from './verbatim.js';

/**
 * Step 6 — the drawings first, then the demand they answer.
 *
 * Its own component, and exported, for one reason: the stepper opens on step 0
 * and a static render never reaches step 6, so the copy here was rendered by
 * nothing but a browser. Lifting it out changes no markup — a component boundary
 * is not an element — and lets `app-arabic.test.tsx` read both languages of it.
 *
 * THE DRAWING LEADS (October 2026). Parking layout is the product — the meeting of
 * 30 Aug said so in as many words — and the demand table above it put eight figures
 * between the reader and the level they came to see. The bay count and the three
 * losses are in the inspector beside the drawing now, so nothing is lost by moving
 * the table below it.
 */
export function ParkingStep({
  run,
  plot,
  onInspect,
  onChooseAccess,
  busy = false,
}: {
  readonly run: RunView;
  readonly plot: PlotView | null;
  readonly onInspect: (n: string) => void;
  /** Re-run with this entrance; absent on a stored run, which cannot be re-run. */
  readonly onChooseAccess?: (edgeSeq: number | null) => void;
  readonly busy?: boolean;
}): JSX.Element {
  const t = useDict(EN, AR).parkingStep;
  const ltr = useVerbatim();
  return (
    <>
      {run.levelPlan ? (
        <>
          <section className="panel" aria-labelledby="level-heading">
            <header className="panel__header">
              <div>
                <h2 id="level-heading" className="panel__title">
                  {t.drawingsTitle}
                </h2>
                <p className="panel__subtitle">{t.drawingsSubtitle}</p>
              </div>
            </header>
            {/* A run stored before the building model existed has no sheets;
                it keeps the level drawing it was computed with, below. */}
            {run.building ? (
              <>
                <DrawingSet run={run} onInspect={onInspect} />
                <h3 className="panel__subheading">{t.levelAsPacked}</h3>
              </>
            ) : null}
            <ParkingPlan
              levelPlan={run.levelPlan}
              plotVertices={plot?.vertices}
              onInspect={onInspect}
              figure={!run.building}
            />
          </section>
          <VehicleAccessPanel
            levelPlan={run.levelPlan}
            onInspect={onInspect}
            {...(onChooseAccess ? { onChoose: onChooseAccess } : {})}
            busy={busy}
          />
        </>
      ) : (
        <div className="banner banner--assumed" role="note">
          <div>
            <strong>{t.noLevelTitle}</strong>
            <p>
              {run.levelPlanRefusal !== null && run.levelPlanRefusal !== undefined
                ? ltr(run.levelPlanRefusal)
                : t.noReason}{' '}
              {t.noLevelTail}
            </p>
          </div>
        </div>
      )}
      <ParkingPanel run={run} onInspect={onInspect} />
    </>
  );
}

export function ParkingPanel({
  run,
  onInspect,
}: {
  readonly run: RunView;
  readonly onInspect: (n: string) => void;
}): JSX.Element {
  const t = useDict(EN, AR).parking;
  const ltr = useVerbatim();
  const p = run.parking;
  const fits = Number(p.headroomBays) >= 0;
  return (
    <section className="panel" aria-labelledby="parking-heading">
      <header className="panel__header">
        <div>
          <h2 id="parking-heading" className="panel__title">
            {t.title}
          </h2>
          <p className="panel__subtitle">{t.subtitle}</p>
        </div>
      </header>

      <dl className="kv kv--grid">
        <div><dt>{t.fields.residentBays}</dt><dd><TracedValue traced={p.residentBays} onInspect={onInspect} /></dd></div>
        <div><dt>{t.fields.visitorBays}</dt><dd><TracedValue traced={p.visitorBays} onInspect={onInspect} /></dd></div>
        <div><dt>{t.fields.totalBays}</dt><dd><TracedValue traced={p.totalBays} onInspect={onInspect} /></dd></div>
        <div><dt>{t.fields.areaPerBay}</dt><dd><TracedValue traced={p.bayAreaFactorM2} onInspect={onInspect} /></dd></div>
        <div><dt>{t.fields.areaRequired}</dt><dd><TracedValue traced={p.requiredAreaM2} onInspect={onInspect} /></dd></div>
        <div><dt>{t.fields.levelsRequired}</dt><dd><TracedValue traced={p.levelsRequired} onInspect={onInspect} /></dd></div>
        <div><dt>{t.fields.levelsAvailable}</dt><dd><TracedValue traced={p.levelsAvailable} onInspect={onInspect} /></dd></div>
        <div>
          <dt>{t.fields.unitsCarried}</dt>
          <dd><TracedValue traced={p.supportableUnitCeiling} onInspect={onInspect} /></dd>
        </div>
      </dl>

      {/* The engine's sentence about what the supply means for the podium. */}
      <p className={`callout ${fits ? 'callout--ok' : 'callout--warn'}`}>
        {ltr(p.podiumImplication)}
      </p>
    </section>
  );
}
