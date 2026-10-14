/**
 * A plot, from above, at the size of a card: its boundary and its setback line.
 *
 * Drawn from the stored model's own rings, which the run list carries, and from
 * nothing else. It is a key plan, so it carries no dimension and no figure. The
 * card beside it prints the run's figures, and a number scaled onto a thumbnail
 * would be a second place for one to be read wrong.
 *
 * North is up, as on every sheet: model y runs north, and the SVG flips it.
 */

/** Integer millimetres, as `BuildingModel` stores them. */
export interface PlanOutline {
  readonly plot: readonly (readonly [number, number])[];
  readonly setback: readonly (readonly [number, number])[];
}

const points = (ring: PlanOutline['plot']): string =>
  ring.map(([x, y]) => `${x},${-y}`).join(' ');

export function PlotPlan({ outline }: { readonly outline: PlanOutline }): JSX.Element | null {
  if (outline.plot.length < 3) return null;
  const xs = outline.plot.map(([x]) => x);
  const ys = outline.plot.map(([, y]) => -y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xs) - minX;
  const h = Math.max(...ys) - minY;
  // A margin of a tenth of the longer side, so the hairline is not clipped.
  const pad = Math.max(w, h) * 0.1;
  return (
    <svg
      className="plot-plan"
      viewBox={`${minX - pad} ${minY - pad} ${w + pad * 2} ${h + pad * 2}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <polygon className="plot-plan__plot" points={points(outline.plot)} vectorEffect="non-scaling-stroke" />
      {outline.setback.length >= 3 ? (
        <polygon
          className="plot-plan__setback"
          points={points(outline.setback)}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
    </svg>
  );
}
