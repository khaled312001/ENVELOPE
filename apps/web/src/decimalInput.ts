/**
 * A number as a person types it, read into the one form the API accepts.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS.
 *
 * The saleable-share field tested what was typed with `Number()`, and the API
 * holds every figure to `^-?\d+(\.\d+)?$`. Between them they refused answers a
 * reader had every reason to think were right:
 *
 *   ٠٫٩٣   the same share, typed on an Arabic keyboard — on a screen offered in Arabic
 *   93%    the form the screen itself uses — "a brief stating 93% to 97% of GFA"
 *   0,93   a decimal comma
 *   6,000  an area with its thousands marked, the way it is printed on every plan
 *
 * Each was told it "has to sit above 0 and at most 1", which three of them do, and
 * Compute capacity stayed disabled with nothing on the screen saying why the answer
 * did not count. A field that refuses a correct answer looks broken, and the reader
 * stops there.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS READ, AND WHAT IS NOT.
 *
 * Only what has exactly one reading:
 *
 *   - Arabic-Indic (٠–٩) and extended Arabic-Indic (۰–۹) digits are digits;
 *   - ٫ is the Arabic decimal separator, ٬ the Arabic thousands separator, ٪ a
 *     percent sign and − a minus sign; ، (the Arabic comma, which is what the
 *     comma key types on an Arabic keyboard) is read exactly as a comma is;
 *   - commas grouping thousands — `6,000`, `12,500.5` — are dropped, and a comma
 *     is read as the decimal point only where it cannot be a grouping (`0,93`);
 *   - a trailing or leading `%` divides by a hundred, and only where the caller
 *     asks for a share. A percent sign is the reader saying "this is a
 *     percentage"; a bare 93 is not, and is refused, with a sentence (see
 *     `RulesStep.tsx`).
 *
 * Anything else is refused, never guessed at.
 *
 * NOTHING IS SUBSTITUTED UNSEEN. `rewritten` is true whenever the figure that
 * will be sent differs from the characters typed, and the screen then prints the
 * figure the engine will receive beside the field. Input already in the API's
 * form comes back unchanged, character for character, so every run that worked
 * before posts exactly what it posted before.
 */

import { Decimal } from '@envelope/core';

/** The API's `decimalString`, `apps/api/src/schemas.ts`. */
const WIRE = /^-?\d+(\.\d+)?$/;
/** Thousands grouped by commas: `6,000`, `1,234,567.25`. No leading zero. */
const GROUPED = /^-?[1-9]\d{0,2}(,\d{3})+(\.\d+)?$/;
/** One comma and no point: the comma is the decimal separator. */
const DECIMAL_COMMA = /^-?\d*,\d+$/;

export interface DecimalReading {
  /** The figure in the form the API accepts. */
  readonly value: string;
  /** True when `value` is not what was typed — the screen must then show it. */
  readonly rewritten: boolean;
  /** True when a percent sign was typed and the figure was divided by a hundred. */
  readonly percent: boolean;
}

export function readDecimal(
  raw: string,
  options: { readonly percent?: boolean } = {},
): DecimalReading | null {
  const typed = raw.trim();
  if (typed === '') return null;

  let s = typed
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, '.')
    .replace(/٬/g, ',')
    // The comma an Arabic keyboard types, read exactly as "," is: a decimal comma
    // in 0،93, a grouping in 6،000, and refused where it could be either.
    .replace(/،/g, ',')
    .replace(/٪/g, '%')
    .replace(/−/g, '-');

  let percent = false;
  if (s.endsWith('%') || s.startsWith('%')) {
    if (!options.percent) return null;
    s = (s.endsWith('%') ? s.slice(0, -1) : s.slice(1)).trim();
    percent = true;
  }

  if (GROUPED.test(s)) s = s.replace(/,/g, '');
  else if (DECIMAL_COMMA.test(s)) s = s.replace(',', '.');

  // ".93" and "93." are complete numbers to a reader and malformed to the API.
  if (s.startsWith('.')) s = `0${s}`;
  else if (s.startsWith('-.')) s = `-0${s.slice(1)}`;
  if (s.endsWith('.')) s = s.slice(0, -1);

  if (!WIRE.test(s)) return null;

  const value = percent ? new Decimal(s).div(100).toFixed() : s;
  return { value, rewritten: value !== typed, percent };
}
