/**
 * The worked example's building, as a figure on a page — the landing page's hero and
 * the parking level on /parking.
 *
 * The model is `worked-example.building.json`, which `scripts/verify-worked-example.mjs`
 * writes from the API's own `building` for the recorded run, and which `pnpm example`
 * holds to what the engine returns today. Nothing here builds, trims or re-derives it:
 * a figure assembled for the page would be a building nobody computed, on the surface
 * most likely to be believed.
 *
 * The viewer and the model arrive in a chunk of their own, after the page has painted.
 * Until then the plate keeps its size and stays empty, so the page does not move under
 * a reader who has started reading it.
 */

import type { BuildingModel } from '@envelope/core';
import { lazy, Suspense } from 'react';

import type { BuildingViewerProps } from './BuildingViewer.js';

export type WorkedExampleModelProps = Omit<BuildingViewerProps, 'model' | 'variant' | 'onInspect'>;

const Figure = lazy(async () => {
  const [{ BuildingViewer }, file] = await Promise.all([
    import('./BuildingViewer.js'),
    import('../screens/worked-example.building.json'),
  ]);
  // The API's `BuildingModel`, serialised. JSON typing widens its literal fields, so
  // the type is asserted rather than inferred; the value is checked by `pnpm example`.
  const model = file.default as unknown as BuildingModel;
  function WorkedExampleFigure(props: WorkedExampleModelProps): JSX.Element {
    return <BuildingViewer model={model} variant="figure" {...props} />;
  }
  return { default: WorkedExampleFigure };
});

export function WorkedExampleModel(props: WorkedExampleModelProps): JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="massing massing--figure" data-focus={props.focusLevelId ? 'level' : undefined} aria-hidden="true">
          <div className="massing-tools" />
          <div className="massing-viewer" />
        </div>
      }
    >
      <Figure {...props} />
    </Suspense>
  );
}
