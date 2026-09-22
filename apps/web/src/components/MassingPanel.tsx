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
import { CLASS_LABEL, TracedValue } from './TracedValue.js';

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
  const cls = source.provenanceClass;
  return (
    <button
      type="button"
      className={`traced traced--${cls.toLowerCase()}`}
      onClick={() => onInspect(source.node)}
      aria-label={`${what}: ${CLASS_LABEL[cls]}. Show where it came from.`}
    >
      <span className="value">{CLASS_LABEL[cls]}</span>
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
            Massing
          </h2>
          <p className="panel__subtitle">
            The building the engine laid out, level by level, inside the envelope the rules
            permit. Nothing here is designed: there are no façades, cores or units, because
            the engine computes none of them.
          </p>
        </div>
      </header>

      {model ? (
        // The fallback holds the viewer's box, so nothing below moves when the canvas
        // arrives — the same box the CSS gives `.massing-viewer`.
        <Suspense fallback={<div className="massing-viewer" aria-hidden="true" />}>
          <BuildingViewer model={model} onInspect={onInspect} />
        </Suspense>
      ) : (
        <p className="callout">
          This run was computed before the engine built a model of the whole building, so
          there is no 3D view of it. Compute the run again to see its levels, bays and ramp
          stood up.
        </p>
      )}

      {model && answerPlacement ? (
        <div className="callout" role="note">
          <p>
            <strong>
              {unplaced > 0
                ? 'The solid levels are the answer. The outlines above them are room the rules leave unused.'
                : 'Every level drawn is one the answer places.'}
            </strong>
          </p>
          <p>
            {answerPlacement.statement} Levels this answer places:{' '}
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
            <strong>This shape rests on an assumption, and it is drawn that way.</strong>
            <p>
              The total height is derived: the height ceiling divided by the floor-to-floor,
              both from cited rules. What is <em>not</em> derived is where the podium stops
              and the tower starts — an affection plan states that (&ldquo;G+2P+8&rdquo; is
              two podium levels) and this run was not given one. So{' '}
              {assumedHeights.map((m) => m.label.toLowerCase()).join(' and ')} carry the
              amber, and the step-back you can see in the picture is the part to distrust. It
              changes no capacity figure in this run.
            </p>
          </div>
        </div>
      ) : null}

      {assumedPlacements.length > 0 ? (
        <div className="banner banner--assumed" role="note">
          <div>
            <strong>Where each part stands is the engine&rsquo;s placement, not a rule&rsquo;s.</strong>
            <p>
              The areas are computed; their positions on the plot are not, because no rule
              fixes them. So the engine placed them, and the outlines are drawn amber for it:
            </p>
            <ul>
              {assumedPlacements.map((p) => (
                <li key={p.subject}>{p.statement}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {model ? (
        <table className="data-table">
          <caption className="sr-only">
            Every level and ramp in the 3D view, with its floor level, the bays laid out on
            it, and where its outline or its slope came from
          </caption>
          <thead>
            <tr>
              <th scope="col">Level</th>
              <th scope="col">Floor level</th>
              <th scope="col">Bays</th>
              <th scope="col">Outline or slope</th>
            </tr>
          </thead>
          <tbody>
            {model.levels.map((l) => (
              <tr key={l.id}>
                <th scope="row">
                  {l.id}{' '}
                  <span className="muted">
                    {`· ${l.name}${l.placed === false ? ' · permitted, not placed' : ''}`}
                  </span>
                </th>
                <td>
                  <TracedValue traced={l.elevationM} onInspect={onInspect} />
                </td>
                <td>
                  {l.parking ? (
                    <TracedValue traced={l.parking.bayCount} onInspect={onInspect} />
                  ) : (
                    <span className="muted">none — not a parking level</span>
                  )}
                </td>
                <td>
                  <SourceButton source={l.outlineSource} what={`${l.id} outline`} onInspect={onInspect} />
                </td>
              </tr>
            ))}
            {model.ramps.map((r) => (
              <tr key={r.id}>
                <th scope="row">
                  Ramp {r.id} <span className="muted">· {r.fromLevelId} to {r.toLevelId}, gradient not assessed</span>
                </th>
                <td />
                <td />
                <td>
                  <TracedValue traced={r.gradientPct} onInspect={onInspect} />
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">Every parking level</th>
              <td />
              <td>
                <TracedValue traced={model.drawnBays} onInspect={onInspect} />
              </td>
              <td />
            </tr>
            <tr>
              <th scope="row">Height ceiling</th>
              <td>
                <TracedValue traced={model.heightCeilingM} onInspect={onInspect} />
              </td>
              <td />
              <td>
                <SourceButton source={model.setbackSource} what="Setback line" onInspect={onInspect} />
              </td>
            </tr>
          </tbody>
        </table>
      ) : null}

      <table className="data-table">
        <caption className="sr-only">
          The podium and the tower, with the height each was built to and where that height
          came from
        </caption>
        <thead>
          <tr>
            <th scope="col">Volume</th>
            <th scope="col">Levels</th>
            <th scope="col">Base</th>
            <th scope="col">Height</th>
            <th scope="col">What it is</th>
          </tr>
        </thead>
        <tbody>
          {run.massing.masses.map((m) => (
            <tr key={m.id}>
              <th scope="row">{m.label}</th>
              <td>
                <TracedValue traced={m.levels} onInspect={onInspect} />
              </td>
              <td>
                <TracedValue traced={m.baseM} onInspect={onInspect} />
              </td>
              <td>
                <TracedValue traced={m.heightM} onInspect={onInspect} />
              </td>
              <td className="fine-print">{m.note}</td>
            </tr>
          ))}
          <tr>
            <th scope="row">Total</th>
            <td colSpan={2} />
            <td>
              <TracedValue traced={run.massing.totalHeightM} onInspect={onInspect} />
            </td>
            <td className="fine-print">
              Built height. The height ceiling this was derived from is a planning limit,
              not a structural or aviation one — neither is assessed.
            </td>
          </tr>
        </tbody>
      </table>

      {model && model.notModelled.length > 0 ? (
        <>
          <h3 className="panel__subheading">Not in this model</h3>
          <ul className="sheet-facts__notes">
            {model.notModelled.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
