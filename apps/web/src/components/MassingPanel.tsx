/**
 * The 3D view, with the numbers that built it beside it.
 *
 * `MassingViewer` knows how to extrude and orbit. This decides what it is handed
 * — and the decision is: **only what the engine emitted**. Every footprint here
 * is a ring the solver produced, every height is a traced value, and the
 * provenance class each volume is drawn in is the class of its own height rather
 * than a house style.
 *
 * That last point is the whole reason this file is not fifteen lines. A podium
 * whose level count nobody has entered is `ASSUMED`, so it renders amber and
 * translucent, and the caption says so in words. It would be trivially easy —
 * and much prettier — to draw both volumes in the same confident green. That is
 * the single most persuasive lie the product could tell, so the picture and the
 * palette are wired to the same fact.
 */

import { lazy, Suspense, useState } from 'react';

import type { MassingView, RunView, WirePoint } from '../api/client.js';
import type { Mass } from './MassingViewer.js';
import { TracedValue } from './TracedValue.js';

/*
  THREE.JS IS FETCHED WHEN A MASSING IS ON SCREEN, AND NOT BEFORE.

  It was a static import, so every page on the site — the landing page, the 404 —
  downloaded and parsed a 3D engine to render prose. `App.tsx` is imported by
  `Root.tsx` so the engine can stay mounted behind the public pages, which put this
  module, and therefore `three`, on the critical path of the first paint of `/`.

  The type import above is erased at compile time and pulls nothing in.
*/
const MassingViewer = lazy(() =>
  import('./MassingViewer.js').then((m) => ({ default: m.MassingViewer })),
);

const toRing = (ring: readonly WirePoint[]): readonly (readonly [number, number])[] =>
  ring.map((p) => [Number(p.x), Number(p.y)] as const);

/** The class of a mass is the class of its height. Never a house style. */
function provenanceOf(m: MassingView['masses'][number]): Mass['provenance'] {
  const c = m.heightM.provenanceClass;
  return c === 'ASSUMED' || c === 'USER_SET' ? c : 'DERIVED';
}

export function MassingPanel({
  run,
  plotVertices,
  onInspect,
}: {
  readonly run: RunView;
  readonly plotVertices: readonly WirePoint[];
  readonly onInspect: (nodeId: string) => void;
}): JSX.Element {
  const [showParking, setShowParking] = useState(true);

  const masses: readonly Mass[] = run.massing.masses.map((m) => ({
    id: m.id,
    label: m.label,
    footprint: toRing(m.footprint),
    baseM: Number(m.baseM.value),
    heightM: Number(m.heightM.value),
    provenance: provenanceOf(m),
  }));

  // The parking level is drawn flat on the ground plane, because that is where
  // the engine laid it out: one level, on the podium footprint. Stacking N
  // copies of it up the podium would draw levels nobody computed.
  const lp = run.levelPlan;
  const parking =
    showParking && lp
      ? {
          levelZ: 0,
          rects: lp.rects
            .filter((r) => r.kind === 'BAY' || r.kind === 'AISLE' || r.kind === 'RAMP')
            .map((r) => {
              const xs = r.outline.map((p) => Number(p.x));
              const ys = r.outline.map((p) => Number(p.y));
              return {
                kind: r.kind as 'BAY' | 'AISLE' | 'RAMP',
                x: Math.min(...xs),
                y: Math.min(...ys),
                width: Math.max(...xs) - Math.min(...xs),
                height: Math.max(...ys) - Math.min(...ys),
              };
            }),
        }
      : undefined;

  const assumed = run.massing.masses.filter((m) => m.heightM.provenanceClass === 'ASSUMED');

  return (
    <section className="panel" aria-labelledby="massing-heading">
      <header className="panel__header">
        <div>
          <h2 id="massing-heading" className="panel__title">
            Massing
          </h2>
          <p className="panel__subtitle">
            The envelope, standing up. Drag to orbit; scroll to zoom. Nothing here is
            designed — these are the volumes the caps permit, not a building.
          </p>
        </div>
        {lp ? (
          <label className="toggle">
            <input
              type="checkbox"
              checked={showParking}
              onChange={(e) => setShowParking(e.target.checked)}
            />
            Show the parking level
          </label>
        ) : null}
      </header>

      {/* The fallback holds the viewer's box, so nothing below it moves when the
          canvas arrives — the same box the CSS gives `.massing-viewer`. */}
      <Suspense fallback={<div className="massing-viewer" aria-hidden="true" />}>
        <MassingViewer
          plot={toRing(plotVertices)}
          masses={masses}
          {...(parking ? { parking } : {})}
          className="massing-viewer"
        />
      </Suspense>

      {/*
        Amber in the picture, amber in the words. A reader who cannot see the
        colour, or who is looking at a greyscale print of it, gets the same
        warning — and the basis is a click away rather than a footnote.
      */}
      {assumed.length > 0 ? (
        <div className="banner banner--assumed" role="note">
          <div>
            <strong>This shape rests on an assumption, and it is drawn that way.</strong>
            <p>
              The total height is derived: the height ceiling divided by the floor-to-floor,
              both from cited rules. What is <em>not</em> derived is where the podium stops
              and the tower starts — an affection plan states that (&ldquo;G+2P+8&rdquo; is
              two podium levels) and this run was not given one. So{' '}
              {assumed.map((m) => m.label.toLowerCase()).join(' and ')} carry the amber, and
              the step-back you can see in the picture is the part to distrust. It changes no
              capacity figure in this run.
            </p>
          </div>
        </div>
      ) : null}

      <table className="data-table">
        <caption className="sr-only">
          Each volume in the drawing, with the height it was extruded to and where that
          height came from
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
    </section>
  );
}
