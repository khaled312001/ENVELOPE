/**
 * The run, as a CAD drawing.
 *
 * A composition-root adapter, and it is under the same two rules as
 * `checks.ts` and `report.ts`:
 *
 * 1. **Nothing here computes a number a user will see.** Every coordinate in
 *    this file was produced by the engine and travelled here as a string. The
 *    only arithmetic is metres to millimetres, which `pointFromMetres` does.
 * 2. **Nothing is supplied that the engine did not produce.** No bay is drawn
 *    that the layout did not place; when there is no level plan the drawing
 *    carries the boundary and the envelope and says so in the annotation, rather
 *    than filling the plot with a plausible grid of rectangles.
 *
 * `@envelope/exports` cannot see the engine (Principle 4), so the translation is
 * written by hand. That is the price of the boundary and it is being paid here
 * on purpose — the alternative is an exporter that can recompute, and therefore
 * an exporter that can disagree with the report of the same run.
 */

import { Decimal, type Plot } from '@envelope/core';
import {
  disclaimerText,
  pointFromMetres,
  siteDrawing,
  writeDxf,
  type DxfPoint,
} from '@envelope/exports';

/** A point as it arrives on the wire: metres, three decimals, as strings. */
interface WirePoint {
  readonly x: string;
  readonly y: string;
}

interface WireRect {
  readonly kind: string;
  readonly outline: readonly WirePoint[];
}

/** The slice of a presented run this drawing reads. Deliberately narrow. */
export interface DrawableRun {
  readonly runId: string;
  readonly plot: { readonly plotNumber: string; readonly areaM2: string };
  readonly envelope: {
    readonly podiumOutline: readonly WirePoint[];
    readonly towerOutline: readonly WirePoint[];
    readonly maxLevelsByHeight: { readonly value: string };
  };
  readonly capacity: { readonly governingBand: string; readonly governingGfa: { readonly value: string } };
  readonly levelPlan: {
    readonly bayCount: { readonly value: string };
    readonly areaPerBayM2: { readonly value: string };
    readonly rects: readonly WireRect[];
    readonly access: {
      readonly recommended: { readonly opening: { readonly start: WirePoint; readonly end: WirePoint } } | null;
    };
  } | null;
}

const pt = (p: WirePoint): DxfPoint => pointFromMetres(new Decimal(p.x), new Decimal(p.y));
const ring = (r: readonly WirePoint[]): readonly DxfPoint[] => r.map(pt);

/**
 * Draw a run.
 *
 * The plot ring comes from the stored `Plot` rather than from the payload,
 * because the payload carries the plot's *area* and not its boundary — and a
 * boundary reconstructed from an area is the drawing this whole file exists to
 * avoid.
 */
export function runDrawing(plot: Plot, run: DrawableRun): string {
  const lp = run.levelPlan;
  /* With no plate cap the tower IS the podium outline, and there is no placement
     to disclose — drawing it again would put a second copy of the setback line on
     another layer. Compared as the strings the engine emitted, not recomputed. */
  const towerIsPodium =
    JSON.stringify(run.envelope.towerOutline) === JSON.stringify(run.envelope.podiumOutline);
  const of = (kind: string): readonly (readonly DxfPoint[])[] =>
    (lp?.rects ?? []).filter((r) => r.kind === kind).map((r) => ring(r.outline));

  /*
    THE OPENING, EXACTLY AS THE ENGINE PLACED IT: two points on the boundary.

    This used to add one metre to y to make a "throat", on the argument that a
    polyline coincident with the plot line cannot be selected. Two things were
    wrong with it. The metre was north whatever the edge faced, so on a northern
    or a slanted road edge the throat stood outside the plot or lay along the
    boundary — a shape nobody computed, in the one file this adapter promises
    draws only what the engine produced. And selection is what the layer is for:
    `ENV-VEHICLE-ACCESS` switches on and off on its own.
  */
  const access: (readonly DxfPoint[])[] = [];
  if (lp?.access.recommended) {
    const o = lp.access.recommended.opening;
    access.push([pt(o.start), pt(o.end)]);
  }

  // Annotations sit above the plot, in the order a reader scans: what this is,
  // then what it says, then what it refuses to say.
  const top = plot.ring.reduce((m, p) => Math.max(m, p.y), 0) / 1000;
  const bottom = plot.ring.reduce((m, p) => Math.min(m, p.y), 0) / 1000;
  const left = plot.ring.reduce((m, p) => Math.min(m, p.x), 0) / 1000;

  const lines = [
    `Plot ${plot.plotNumber} - ${run.plot.areaM2} sq.m - run ${run.runId}`,
    `Governing band ${run.capacity.governingBand}: ${run.capacity.governingGfa.value} sq.m GFA ` +
      `over ${run.envelope.maxLevelsByHeight.value} level(s)`,
    lp
      ? `Parking level: ${lp.bayCount.value} bays laid out at ${lp.areaPerBayM2.value} sq.m/bay`
      : 'Parking level: NOT LAID OUT for this plot. No bays are drawn.',
    // Said in the file because the layers alone cannot say it. The tower's AREA is
    // the plate cap; its POSITION on the podium roof is not decided by the engine.
    ...(towerIsPodium
      ? []
      : ['Tower outline on ENV-ASSUMED: area from the plate cap, position not decided.']),
  ];

  /*
    WHICH LAYER EACH RING IS ON IS A CLAIM ABOUT ITS PROVENANCE.

    The podium outline IS the setback line — `envelope.ts` takes it straight
    from the per-edge offset, which every edge's cited setback produced — so it
    goes on `ENV-SETBACK-LINE`, which was empty on every export until now.

    The tower outline goes on `ENV-ASSUMED` and not on `ENV-ENVELOPE-TOWER`.
    Its area is derived; where it sits is the podium shrunk about its centroid,
    and `massing.ts` says in so many words that the engine does not decide it.
    A ring drawn in the envelope colour would have claimed a placement nobody
    made. The two envelope layers stay in the table, empty, until the engine
    produces a podium ring cut to the coverage cap and a placed tower.
  */
  const doc = siteDrawing({
    plot: ring(plot.ring.map((p) => ({ x: String(p.x / 1000), y: String(p.y / 1000) }))),
    setbackLine: ring(run.envelope.podiumOutline),
    assumedRings: towerIsPodium ? [] : [ring(run.envelope.towerOutline)],
    parking: {
      bays: [...of('BAY'), ...of('ACCESSIBLE_BAY')],
      aisles: of('AISLE'),
      ramps: of('RAMP'),
      access,
    },
    annotations: lines.map((value, i) => ({
      at: pointFromMetres(left, top + 3.6 - i * 1.2),
      value,
    })),
  });

  return writeDxf({
    ...doc,
    texts: [...doc.texts, disclaimerText(pointFromMetres(left, bottom - 3))],
  });
}
