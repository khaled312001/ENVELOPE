/**
 * How many decimals a figure is PRINTED to — and nothing else.
 *
 * The reports used to print every figure at the precision the engine quantises
 * it to: a governing GFA of `6,774.194 m²`, a FAR of `4.2339`, a setback of
 * `7.500 m`. A millimetre of area is not a thing a reader can act on, and four
 * decimals of FAR invite the reader to believe the third one. Drawing-office and
 * valuation practice print areas, lengths and FAR to two decimals and counts as
 * whole numbers, and that is what the client's own sheets print (`FAR 5.05`,
 * `8,796.46 m²`).
 *
 * THE TRACED VALUE IS NOT TOUCHED. This module turns a decimal string into
 * another decimal string for the page; the `Decimal` the engine traced, the
 * JSON export, the workbook and the derivation index all keep the exact figure,
 * and the audit report prints it beside every footnote (`Exact value`). A
 * reader who wants to check `6,774.19` against the graph finds `6774.194` one
 * click away. Rounding the VALUE would be a second number the provenance graph
 * never produced — which is why this is a display policy and not a `qArea`.
 *
 * Rounding is half-up, the way a reader checking the figure by hand rounds it.
 * The engine's own quantisation is half-even; the two can differ only on a
 * figure ending in exactly 5 at the third decimal, and the exact value is
 * printed beside it in the audit report.
 */

import { Decimal } from 'decimal.js';

/** Units a figure is a measure in: lengths, areas, ratios (FAR among them), rates and percentages. */
const MEASURES: ReadonlySet<string> = new Set([
  'm',
  'm²',
  'm2',
  'ft²',
  'ft2',
  'm²/bay',
  'm²/unit',
  'ft²/unit',
  'ratio',
  '%',
  'percent',
  'bays/unit',
]);

/** Decimals printed for a measure. */
export const MEASURE_DECIMALS = 2;

const DECIMAL = /^-?\d+(\.\d+)?$/;

/**
 * The figure as the page prints it. Anything that is not a plain decimal — a
 * range, a word, an enum — comes back unchanged.
 *
 * - a measure (`m`, `m²`, `ft²`, `ratio` — FAR is a ratio — `%`, …): two decimals,
 *   padded, so a column of areas lines up: `1,200.00`, not `1,200`;
 * - a count (`bays`, `levels`, `units`, …): the whole number, when it is whole;
 *   a count that is not whole is printed to two decimals rather than rounded to
 *   a whole number it is not;
 * - any other unit, or none: a whole number stays whole and a fraction is
 *   printed to two decimals.
 */
export function forDisplay(text: string, unit: string | undefined): string {
  if (!DECIMAL.test(text)) return text;
  const d = new Decimal(text);
  const measure = unit !== undefined && MEASURES.has(unit);
  // Counts and unknown units alike: whole stays whole, a fraction gets two decimals.
  const fixed = !measure && d.isInteger() ? d.toFixed(0) : d.toFixed(MEASURE_DECIMALS, Decimal.ROUND_HALF_UP);
  // `-0.004` rounds to `-0.00`: a sign on a zero is a figure nobody computed.
  return /^-0(\.0+)?$/.test(fixed) ? fixed.slice(1) : fixed;
}
