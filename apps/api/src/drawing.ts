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
  const of = (kind: string): readonly (readonly DxfPoint[])[] =>
    (lp?.rects ?? []).filter((r) => r.kind === kind).map((r) => ring(r.outline));

  // The opening lies on the boundary. Drawn 1 m deep so it reads as a gap in
  // the plot line rather than as a coincident duplicate of it — two identical
  // polylines on one edge is a drawing nobody can select.
  const access: (readonly DxfPoint[])[] = [];
  if (lp?.access.recommended) {
    const o = lp.access.recommended.opening;
    const nudge = (p: WirePoint, dy: number): DxfPoint =>
      pointFromMetres(new Decimal(p.x), new Decimal(p.y).plus(dy));
    access.push([pt(o.start), pt(o.end), nudge(o.end, 1), nudge(o.start, 1)]);
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
  ];

  const doc = siteDrawing({
    plot: ring(plot.ring.map((p) => ({ x: String(p.x / 1000), y: String(p.y / 1000) }))),
    podiumFootprint: ring(run.envelope.podiumOutline),
    towerFootprint: ring(run.envelope.towerOutline),
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
