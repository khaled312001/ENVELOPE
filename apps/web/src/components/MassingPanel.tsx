/**
 * The 3D view, with the numbers that built it beside it.
 *
 * `BuildingViewer` draws the engine's `BuildingModel`: every level at its floor,
 * every car in its bay, the ramp between the levels it joins, the envelope round
 * all of it. This panel decides what goes beside the picture, and the decision is
 * the same one the sheets made: **only what the engine emitted, and what it did
 * not.**
 *
 * - The **levels table** is the view's equivalent, not a caption for it. A canvas
 *   cannot be read aloud; a table of the same levels, floor levels, bays and
 *   outline sources can, and each of its values opens the same derivation a click
 *   in the canvas opens.
 * - The **placements** are said in words. Where the podium and the tower stand on
 *   their footprints is not a rule's to say, so the engine placed them and marked
 *   the placement ASSUMED — and the whole building is drawn amber for it. A reader
 *   who cannot see the colour gets the same warning here.
 * - What the model **does not contain** is listed under the picture. A 3D view with
 *   no cores reads as a building with no cores unless it says why.
 *
 * A run stored before the model existed gets a sentence instead of a picture. The
 * old view extruded a podium and a tower from area figures, and drew the parking
 * flat on the ground inside them; rebuilding that from a stored run would be
 * drawing the defect the model was made to end.
 */

import type { ElementSource } from '@envelope/core';
import { lazy, Suspense } from 'react';

import type { RunView } from '../api/client.js';
import { useDict } from '../i18n/locale.js';
import { AR } from '../i18n/massing.ar.js';
import { EN } from '../i18n/massing.en.js';
import { AR as TRACED_AR } from '../i18n/traced.ar.js';
import { EN as TRACED_EN } from '../i18n/traced.en.js';
import { EngineText, TracedValue } from './TracedValue.js';

/*
  THE WORDS LIVE IN `i18n/massing.*.ts`. What stays here is what the engine and
  the model supply — placement statements, `notModelled`, level ids and names,
  volume notes — rendered as written in both languages, inside `EngineText` so an
  Arabic page marks each `Verbatim`. And two constants that are not words: the
  name of the view, and the affection plan's own notation for a podium split.
*/
const VIEW = '3D';
const PODIUM_SPLIT_EXAMPLE = 'G+2P+8';

/*
  THREE.JS IS FETCHED WHEN A MASSING IS ON SCREEN, AND NOT BEFORE.

  It was a static import, so every page on the site — the landing page, the 404 —
  downloaded and parsed a 3D engine to render prose. `App.tsx` is imported by
  `Root.tsx` so the engine can stay mounted behind the public pages, which put this
  module, and therefore `three`, on the critical path of the first paint of `/`.
*/
const BuildingViewer = lazy(() =>
  import('./BuildingViewer.js').then((m) => ({ default: m.BuildingViewer })),
);

/** A source with no number of its own: its class, as a way into its derivation. */
function SourceButton({
  source,
  what,
  onInspect,
}: {
  readonly source: ElementSource;
  readonly what: string;
  readonly onInspect: (nodeId: string) => void;
}): JSX.Element {
  const t = useDict(EN, AR);
  const classes = useDict(TRACED_EN, TRACED_AR);
  const cls = source.provenanceClass;
  return (
    <button
      type="button"
      className={`traced traced--${cls.toLowerCase()}`}
      onClick={() => onInspect(source.node)}
      aria-label={t.levels.sourceLabel(what, classes.classLabel[cls])}
    >
      <span className="value">{classes.classLabel[cls]}</span>
      <span className="traced__marker" aria-hidden="true">
        {cls === 'DERIVED' ? '§' : null}
      </span>
    </button>
  );
}

export function MassingPanel({
  run,
  onInspect,
}: {
  readonly run: RunView;
  readonly onInspect: (nodeId: string) => void;
}): JSX.Element {
  const t = useDict(EN, AR);
  const model = run.building;
  const assumedHeights = run.massing.masses.filter((m) => m.heightM.provenanceClass === 'ASSUMED');
  const assumedPlacements = model?.placements.filter((p) => p.source.provenanceClass === 'ASSUMED') ?? [];
  // Absent on a run stored before the model said how much of the stack the answer uses.
  const answerPlacement = model?.placements.find((p) => p.subject === 'answer');
  const unplaced = model?.levels.filter((l) => l.placed === false).length ?? 0;

  return (
    <section className="panel" aria-labelledby="massing-heading">
      <header className="panel__header">
        <div>
          <h2 id="massing-heading" className="panel__title">
            {t.title}
          </h2>
          <p className="panel__subtitle">{t.subtitle}</p>
        </div>
      </header>

      {model ? (
        // The fallback holds the viewer's box, so nothing below moves when the canvas
        // arrives — the same box the CSS gives `.massing-viewer`.
        <Suspense fallback={<div className="massing-viewer" aria-hidden="true" />}>
          <BuildingViewer model={model} onInspect={onInspect} />
        </Suspense>
      ) : (
        <p className="callout">{t.stored(VIEW)}</p>
      )}

      {model && answerPlacement ? (
        <div className="callout" role="note">
          <p>
            <strong>
              {unplaced > 0 ? t.answer.partial : t.answer.whole}
            </strong>
          </p>
          <p>
            <EngineText>{answerPlacement.statement}</EngineText>
            {t.answer.levelsPlaced}
            <TracedValue traced={model.placedLevels} onInspect={onInspect} />.
          </p>
        </div>
      ) : null}

      {/*
        Amber in the picture, amber in the words. A reader who cannot see the colour,
        or who is looking at a greyscale print, gets the same warning — and the basis
        is a click away rather than a footnote.
      */}
      {assumedHeights.length > 0 ? (
        <div className="banner banner--assumed" role="note">
          <div>
            <strong>{t.heights.title}</strong>
            <p>
              {t.heights.before}
              <em>{t.heights.not}</em>
              {t.heights.mid}
              <EngineText>{PODIUM_SPLIT_EXAMPLE}</EngineText>
              {t.heights.afterExample}
              {assumedHeights.map((m) => t.heights.volume(m.id, m.label)).join(t.heights.and)}
              {t.heights.after}
            </p>
          </div>
        </div>
      ) : null}

      {assumedPlacements.length > 0 ? (
        <div className="banner banner--assumed" role="note">
          <div>
            <strong>{t.placements.title}</strong>
            <p>{t.placements.body}</p>
            <ul>
              {assumedPlacements.map((p) => (
                <li key={p.subject}>
                  <EngineText>{p.statement}</EngineText>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {/*
        THE CORE — Eng. Mohamed, 2026-09-28, the one thing he called "الاهم".

        It leads with what the core does NOT do. The obvious reading of "the core
        is in the calculation" is that the floor area was reduced for it, and it
        was not: a core is inside GFA and outside saleable area, so the saleable
        figure this run was given already carries it. A reader who assumes it was
        subtracted will take the capacity figure above as 18% too low.

        Not a banner. The core's own class is on its figure, where it belongs —
        wrapping the block in amber would paint a paragraph about arithmetic in
        the colour reserved for one specific thing.
      */}
      {run.core ? (
        <>
          <h3 className="panel__subheading">{t.core.title}</h3>
          <p>{t.core.body}</p>
          <dl className="kv">
            <div>
              <dt>{t.core.areaLabel}</dt>
              <dd>
                <TracedValue traced={run.core.areaM2} onInspect={onInspect} />
              </dd>
            </div>
            <div>
              <dt>{t.core.shareLabel}</dt>
              <dd>
                <TracedValue traced={run.core.plateShare} onInspect={onInspect} />
              </dd>
            </div>
          </dl>
          {/* The engine's two comparisons, word for word. */}
          <ul className="sheet-facts__notes">
            {run.core.reconciliation.map((line) => (
              <li key={line}>
                <EngineText>{line}</EngineText>
              </li>
            ))}
          </ul>
          <p className="fine-print">{t.core.shape}</p>
        </>
      ) : null}

      {model ? (
        <table className="data-table">
          <caption className="sr-only">{t.levels.caption(VIEW)}</caption>
          <thead>
            <tr>
              <th scope="col">{t.levels.columns.level}</th>
              <th scope="col">{t.levels.columns.floorLevel}</th>
              <th scope="col">{t.levels.columns.bays}</th>
              <th scope="col">{t.levels.columns.source}</th>
            </tr>
          </thead>
          <tbody>
            {model.levels.map((l) => (
              <tr key={l.id}>
                <th scope="row">
                  {l.id}{' '}
                  <span className="muted">
                    {'· '}
                    <EngineText>{l.name}</EngineText>
                    {l.placed === false ? t.levels.notPlaced : ''}
                  </span>
                </th>
                <td>
                  <TracedValue traced={l.elevationM} onInspect={onInspect} />
                </td>
                <td>
                  {l.parking ? (
                    <TracedValue traced={l.parking.bayCount} onInspect={onInspect} />
                  ) : (
                    <span className="muted">{t.levels.notParking}</span>
                  )}
                </td>
                <td>
                  <SourceButton source={l.outlineSource} what={t.levels.outlineOf(l.id)} onInspect={onInspect} />
                </td>
              </tr>
            ))}
            {model.ramps.map((r) => (
              <tr key={r.id}>
                <th scope="row">
                  {t.levels.ramp}
                  {r.id}{' '}
                  <span className="muted">{t.levels.rampDetail(r.fromLevelId, r.toLevelId)}</span>
                </th>
                <td />
                <td />
                <td>
                  <TracedValue traced={r.gradientPct} onInspect={onInspect} />
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">{t.levels.everyParkingLevel}</th>
              <td />
              <td>
                <TracedValue traced={model.drawnBays} onInspect={onInspect} />
              </td>
              <td />
            </tr>
            <tr>
              <th scope="row">{t.levels.heightCeiling}</th>
              <td>
                <TracedValue traced={model.heightCeilingM} onInspect={onInspect} />
              </td>
              <td />
              <td>
                <SourceButton source={model.setbackSource} what={t.levels.setbackLine} onInspect={onInspect} />
              </td>
            </tr>
          </tbody>
        </table>
      ) : null}

      <table className="data-table">
        <caption className="sr-only">{t.volumes.caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t.volumes.columns.volume}</th>
            <th scope="col">{t.volumes.columns.levels}</th>
            <th scope="col">{t.volumes.columns.base}</th>
            <th scope="col">{t.volumes.columns.height}</th>
            <th scope="col">{t.volumes.columns.what}</th>
          </tr>
        </thead>
        <tbody>
          {run.massing.masses.map((m) => (
            <tr key={m.id}>
              <th scope="row">{t.volumes.name(m.id, m.label)}</th>
              <td>
                <TracedValue traced={m.levels} onInspect={onInspect} />
              </td>
              <td>
                <TracedValue traced={m.baseM} onInspect={onInspect} />
              </td>
              <td>
                <TracedValue traced={m.heightM} onInspect={onInspect} />
              </td>
              <td className="fine-print">
                <EngineText>{m.note}</EngineText>
              </td>
            </tr>
          ))}
          <tr>
            <th scope="row">{t.volumes.total}</th>
            <td colSpan={2} />
            <td>
              <TracedValue traced={run.massing.totalHeightM} onInspect={onInspect} />
            </td>
            <td className="fine-print">{t.volumes.totalNote}</td>
          </tr>
        </tbody>
      </table>

      {model && model.notModelled.length > 0 ? (
        <>
          <h3 className="panel__subheading">{t.notModelled}</h3>
          <ul className="sheet-facts__notes">
            {model.notModelled.map((n) => (
              <li key={n}>
                <EngineText>{n}</EngineText>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
