/**
 * Numerical policy — PRD §14.3.
 *
 * The PRD asks for "exact predicates for orientation and intersection; never raw
 * floating-point comparison" and for a "snap tolerance declared explicitly, not
 * implicit in the library" — and then never states a value.
 *
 * The policy implemented here, which must be agreed in writing before it is
 * quoted against (see `docs/03-analysis/open-questions.md` Q21):
 *
 * 1. Every coordinate is snapped once, on entry, to a **1 mm grid** and held
 *    thereafter as an **integer number of millimetres**.
 * 2. All geometry then runs in integer arithmetic (Clipper), which makes the
 *    orientation and intersection predicates exact *by construction* rather than
 *    by convention. There is no float comparison anywhere in the kernel.
 * 3. Areas come back as integer mm². A 10 km × 10 km plot is 1e14 mm², three
 *    orders of magnitude inside `Number.MAX_SAFE_INTEGER` (9.007e15), so integer
 *    area arithmetic is exact for any plot this product will ever see.
 * 4. Non-geometric arithmetic — FAR, ratios, efficiencies, parking factors —
 *    uses `Decimal` at 28 significant digits. Never `number`.
 *
 * 1 mm is far below survey accuracy and far above the noise floor of anything
 * we could do in float64 at UTM coordinate magnitudes (~1e5–1e6 m, where one ULP
 * is ~1e-10 m). The tolerance is part of the engine version: changing it changes
 * results and therefore requires a version bump (PRD §13.4).
 */

import { Decimal } from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_EVEN });

export { Decimal };

/** Anything `Decimal` accepts. Aliased here so callers need not import the
 * decimal.js namespace to name a parameter type. */
export type DecimalValue = string | number | bigint | Decimal;

// ---------------------------------------------------------------------------
// Branded integer units. The brands are what stop a metre being passed where a
// millimetre was meant — the single most likely arithmetic mistake in a codebase
// that mixes the two.
// ---------------------------------------------------------------------------

declare const MM: unique symbol;
declare const MM2: unique symbol;

/** An integer number of millimetres. Exact. */
export type Mm = number & { readonly [MM]: true };

/** An integer number of square millimetres. Exact. */
export type Mm2 = number & { readonly [MM2]: true };

/** Millimetres per metre — the snap grid denominator. */
export const SCALE = 1000 as const;

/** The declared snap tolerance, in metres. PRD §14.3. */
export const SNAP_TOLERANCE_M = '0.001' as const;

/**
 * Relative tolerance at which the two independent area computations must agree.
 * Disagreement above this is a P0 defect, not a rounding note (PRD §14.3).
 */
export const AREA_AGREEMENT_TOLERANCE = new Decimal('0.001'); // 0.1%

/**
 * An offset result thinner than this in any direction is a sliver, not a
 * buildable footprint. PRD §14.3: degenerate results raise rather than return.
 */
export const DEGENERATE_MIN_DIMENSION_MM = 100 as Mm; // 100 mm

// ---------------------------------------------------------------------------
// Conversion. `toMm` is the ONLY place approximation may enter the kernel.
// ---------------------------------------------------------------------------

/** Snap a metre value onto the 1 mm grid and brand it. Half-even at the boundary. */
export function toMm(metres: DecimalValue): Mm {
  const scaled = new Decimal(metres).times(SCALE);
  const snapped = scaled.toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN).toNumber();
  if (!Number.isSafeInteger(snapped)) {
    throw new RangeError(`coordinate out of exact range: ${String(metres)} m`);
  }
  return snapped as Mm;
}

/** Exact conversion back to metres for reporting. Never used before a comparison. */
export function mmToM(mm: Mm | number): Decimal {
  return new Decimal(mm).div(SCALE);
}

/** Exact conversion of an integer mm² area to m². */
export function mm2ToM2(mm2: Mm2 | number): Decimal {
  return new Decimal(mm2).div(SCALE * SCALE);
}

/** Brand a square-millimetre integer produced by the geometry kernel. */
export function asMm2(value: number): Mm2 {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`area is not an exact integer of mm²: ${value}`);
  }
  return value as Mm2;
}

/** Brand a millimetre integer. */
export function asMm(value: number): Mm {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`length is not an exact integer of mm: ${value}`);
  }
  return value as Mm;
}

// ---------------------------------------------------------------------------
// Reporting precision. Applied at the edge of the system, never mid-derivation.
// ---------------------------------------------------------------------------

export const LENGTH_DP = 3 as const; // mm
export const AREA_DP = 2 as const; // cm²
export const RATIO_DP = 6 as const;

export const qLength = (v: DecimalValue): Decimal =>
  new Decimal(v).toDecimalPlaces(LENGTH_DP, Decimal.ROUND_HALF_EVEN);

export const qArea = (v: DecimalValue): Decimal =>
  new Decimal(v).toDecimalPlaces(AREA_DP, Decimal.ROUND_HALF_EVEN);

export const qRatio = (v: DecimalValue): Decimal =>
  new Decimal(v).toDecimalPlaces(RATIO_DP, Decimal.ROUND_HALF_EVEN);

// ---------------------------------------------------------------------------
// Comparison helpers. Used by the invariant layer, which compares magnitudes
// that were derived by different routes and must agree to a stated tolerance.
// ---------------------------------------------------------------------------

/**
 * Symmetric relative difference, using the larger magnitude as the base.
 *
 * Defined when both sides are zero — an invariant comparing two empty sums must
 * pass, not divide by zero.
 */
export function relativeDifference(a: DecimalValue, b: DecimalValue): Decimal {
  const da = new Decimal(a);
  const db = new Decimal(b);
  const base = Decimal.max(da.abs(), db.abs());
  if (base.isZero()) return new Decimal(0);
  return da.minus(db).abs().div(base);
}

/** Whether two magnitudes agree within a *relative* tolerance. */
export function within(a: DecimalValue, b: DecimalValue, tolerance: DecimalValue): boolean {
  return relativeDifference(a, b).lte(tolerance);
}

/** Whether two magnitudes agree within an *absolute* tolerance. */
export function withinAbsolute(
  a: DecimalValue,
  b: DecimalValue,
  tolerance: DecimalValue,
): boolean {
  return new Decimal(a).minus(b).abs().lte(tolerance);
}

// ---------------------------------------------------------------------------
// Kernel failure modes
// ---------------------------------------------------------------------------

/**
 * A geometric operation produced a sliver, a self-intersection, or an empty
 * result where a footprint was required.
 *
 * PRD §14.3 — this is the exception that stops "a plausible answer wrong by 4%,
 * silently, for six months".
 */
export class DegenerateGeometryError extends Error {
  override readonly name = 'DegenerateGeometryError';
  constructor(
    message: string,
    readonly detail?: Record<string, unknown>,
  ) {
    super(message);
  }
}

/**
 * The two independent area computations disagreed beyond
 * {@link AREA_AGREEMENT_TOLERANCE}.
 *
 * This is a defect in the kernel, not a condition a caller can recover from.
 */
export class AreaDisagreementError extends Error {
  override readonly name = 'AreaDisagreementError';
  readonly relative: Decimal;
  constructor(
    readonly methodA: Decimal,
    readonly methodB: Decimal,
    readonly label = '',
  ) {
    const rel = relativeDifference(methodA, methodB);
    super(
      `independent area recomputation disagreed${label ? ` on ${label}` : ''}: ` +
        `${methodA.toString()} vs ${methodB.toString()} ` +
        `(relative ${rel.times(100).toFixed(6)}%, tolerance ` +
        `${AREA_AGREEMENT_TOLERANCE.times(100).toFixed(3)}%)`,
    );
    this.relative = rel;
  }
}
