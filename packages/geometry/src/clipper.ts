/**
 * Clipper wrapper — the third, genuinely independent area opinion, and the
 * boolean-operation engine.
 *
 * Clipper operates on integer coordinates, which is why it was chosen over a
 * float geometry library: PRD §14.3's "exact predicates for orientation and
 * intersection; never raw floating-point comparison" is satisfied by
 * construction rather than by convention. Our coordinates are already integer
 * millimetres, so they pass through unscaled and unrounded.
 *
 * The library initialises asynchronously (it is a WASM module). {@link initGeometry}
 * must be awaited once at process start; every synchronous kernel function below
 * asserts that it has been.
 */

import { asMm2, DegenerateGeometryError, type Mm2 } from '@envelope/core';
import * as clipperLib from 'js-angusj-clipper';

import { area as exactArea, type Ring } from './exact.js';

let instance: clipperLib.ClipperLibWrapper | undefined;

/** Initialise the WASM geometry backend. Idempotent. Await once at start-up. */
export async function initGeometry(): Promise<void> {
  if (instance) return;
  instance = await clipperLib.loadNativeClipperLibInstanceAsync(
    clipperLib.NativeClipperLibRequestedFormat.WasmWithAsmJsFallback,
  );
}

function lib(): clipperLib.ClipperLibWrapper {
  if (!instance) {
    throw new Error('geometry backend not initialised — await initGeometry() at start-up');
  }
  return instance;
}

/** Whether the backend is ready. Used by health checks and tests. */
export function isGeometryReady(): boolean {
  return instance !== undefined;
}

type Path = { x: number; y: number }[];

const toPath = (ring: Ring): Path => ring.map((p) => ({ x: p.x, y: p.y }));
const fromPath = (path: Path): Ring => path.map((p) => ({ x: p.x as never, y: p.y as never }));

/**
 * Area by Clipper's own C++ implementation — method C of the independent
 * recomputation required by §14.3.
 *
 * Clipper returns twice-signed-area semantics in its own convention; the
 * absolute value in mm² is what we compare against our two expressions.
 */
export function clipperArea(ring: Ring): Mm2 {
  return asMm2(Math.abs(lib().area(toPath(ring))));
}

/**
 * How many polygons this process has cross-checked, and how many disagreed.
 *
 * A counter rather than a derived number because §16.5's second claim —
 * "geometric integrity" — is only worth printing if it reports a *measurement*.
 * "The kernel would have thrown, therefore geometry is valid" is an argument
 * about the code, not evidence about this run, and a validation report that
 * prints an argument is the thing Principle 8 exists to stop.
 *
 * Module-level and mutable, which is safe under exactly one condition: a run is
 * synchronous from `runPipeline` to its return, so a snapshot taken either side
 * of one is an exact difference for that run. Read it any other way — across an
 * await, from two concurrent requests — and it counts somebody else's polygons.
 * {@link geometryChecksSince} is the only supported access and takes the
 * baseline explicitly so a caller cannot forget to.
 */
const counters = { verified: 0, disagreed: 0 };

export interface GeometryCheckCounters {
  /** Polygons whose area was computed by three independent methods. */
  readonly areasRecomputed: number;
  /**
   * Recomputations that disagreed.
   *
   * Always 0 in a completed run: a disagreement raises
   * {@link DegenerateGeometryError} and the run never reaches a report (§14.3
   * classes it a P0 defect, not a rounding note). The field is carried because
   * the same summary type is used when validating an artifact transcribed from
   * a document, where a disagreement is data rather than a crash.
   */
  readonly areaDisagreements: number;
}

/** A baseline to difference against. Take it immediately before a run. */
export function geometryCheckBaseline(): GeometryCheckCounters {
  return { areasRecomputed: counters.verified, areaDisagreements: counters.disagreed };
}

/** What happened between {@link geometryCheckBaseline} and now. */
export function geometryChecksSince(baseline: GeometryCheckCounters): GeometryCheckCounters {
  return {
    areasRecomputed: counters.verified - baseline.areasRecomputed,
    areaDisagreements: counters.disagreed - baseline.areaDisagreements,
  };
}

/**
 * Area cross-checked across all three independent methods.
 *
 * The two exact expressions must agree bit-for-bit (they are checked inside
 * {@link exactArea}); Clipper must then agree with them exactly too. Integer
 * arithmetic throughout means "exactly" is achievable, which is stricter than
 * the 0.1% §14.3 settles for.
 */
export function verifiedArea(ring: Ring, label = 'polygon'): Mm2 {
  const exact = exactArea(ring);
  const viaClipper = clipperArea(ring);
  counters.verified += 1;
  if (exact !== viaClipper) {
    counters.disagreed += 1;
    throw new DegenerateGeometryError(
      `independent area recomputation disagreed on ${label}: ` +
        `exact ${exact} mm² vs Clipper ${viaClipper} mm². ` +
        `Both are integer methods, so any difference is a defect, not rounding.`,
      { exact, viaClipper, label },
    );
  }
  return exact;
}

/**
 * Intersect two rings.
 *
 * Returns every resulting ring. A setback offset that splits a plot into two
 * pieces is a real (if unusual) outcome on an L-shaped plot; callers decide
 * whether to take the largest piece or reject, because that is a product
 * decision rather than a geometric one.
 */
export function intersect(subject: Ring, clip: Ring): readonly Ring[] {
  const out = lib().clipToPaths({
    clipType: clipperLib.ClipType.Intersection,
    subjectFillType: clipperLib.PolyFillType.EvenOdd,
    subjectInputs: [{ data: toPath(subject), closed: true }],
    clipInputs: [{ data: toPath(clip) }],
  });
  return (out ?? []).map(fromPath);
}

/**
 * Uniform inward offset. Used for the sanity check in tests and for the simple
 * case where every edge carries the same setback; the per-edge path in
 * `offset.ts` is what the envelope solver actually calls.
 *
 * `miter` join with a high limit keeps corners sharp — a rounded corner would
 * silently lose buildable area at every vertex.
 */
export function offsetUniform(ring: Ring, insetMm: number): readonly Ring[] {
  if (insetMm < 0) throw new RangeError('inset must be non-negative; offsets are inward');
  const out = lib().offsetToPaths({
    delta: -insetMm,
    miterLimit: 1000,
    offsetInputs: [
      {
        data: toPath(ring),
        joinType: clipperLib.JoinType.Miter,
        endType: clipperLib.EndType.ClosedPolygon,
      },
    ],
  });
  return (out ?? []).map(fromPath);
}

/** Union of rings — used when reassembling a footprint from pieces. */
export function union(rings: readonly Ring[]): readonly Ring[] {
  if (rings.length === 0) return [];
  const [first, ...rest] = rings;
  const out = lib().clipToPaths({
    clipType: clipperLib.ClipType.Union,
    subjectFillType: clipperLib.PolyFillType.NonZero,
    subjectInputs: [{ data: toPath(first!), closed: true }],
    ...(rest.length ? { clipInputs: rest.map((r) => ({ data: toPath(r) })) } : {}),
  });
  return (out ?? []).map(fromPath);
}

/** Remove collinear vertices and near-duplicate points, on the integer grid. */
export function cleanRing(ring: Ring): Ring {
  const cleaned = lib().cleanPolygon(toPath(ring), 0);
  return fromPath(cleaned ?? []);
}
