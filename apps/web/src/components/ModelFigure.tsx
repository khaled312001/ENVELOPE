/**
 * A run's building model as a still figure on a page — the run page on `/work`.
 *
 * The same viewer the engine uses, in its `figure` variant, fetched with three.js
 * when the figure is on screen and not before. The model is the run's own
 * `building`, as the API returned it; nothing here builds or trims it.
 */

import { lazy, Suspense } from 'react';

import type { BuildingViewerProps } from './BuildingViewer.js';

const BuildingViewer = lazy(() =>
  import('./BuildingViewer.js').then((m) => ({ default: m.BuildingViewer })),
);

export type ModelFigureProps = Omit<BuildingViewerProps, 'variant'>;

/** The plate's box before the viewer arrives, so the page does not move when it does. */
export function ModelFigurePlaceholder({ level }: { readonly level?: boolean }): JSX.Element {
  return (
    <div className="massing massing--figure" data-focus={level ? 'level' : undefined} aria-hidden="true">
      <div className="massing-tools" />
      <div className="massing-viewer" />
    </div>
  );
}

export function ModelFigure(props: ModelFigureProps): JSX.Element {
  return (
    <Suspense fallback={<ModelFigurePlaceholder level={props.focusLevelId !== undefined} />}>
      <BuildingViewer variant="figure" {...props} />
    </Suspense>
  );
}
