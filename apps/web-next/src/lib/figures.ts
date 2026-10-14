/**
 * Figures as the engine wrote them, grouped for reading — and never parsed.
 *
 * The API sends every quantity as a decimal string. Turning one into a JS
 * `number` to format it would round the last digit the product exists to
 * defend, so grouping is done on the characters: the digits before the point
 * get thin separators and the rest is left exactly as it arrived.
 */
export function grouped(value: string): string {
  const negative = value.startsWith('-');
  const digits = negative ? value.slice(1) : value;
  const [whole = '', frac] = digits.split('.');
  if (!/^\d+$/.test(whole)) return value;
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${withCommas}${frac !== undefined ? `.${frac}` : ''}`;
}

/**
 * Trim a decimal string to at most `places` decimals, by truncation of the
 * characters — for a chip that has no room for six. The full figure stays one
 * click away in the derivation, which prints it as the engine wrote it.
 */
export function trimmed(value: string, places: number): string {
  const [whole, frac] = value.split('.');
  if (frac === undefined || frac.length <= places) return value;
  const cut = frac.slice(0, places).replace(/0+$/, '');
  return cut ? `${whole}.${cut}` : (whole ?? value);
}

/** A share written by the engine as `0.93`, shown as `93%` — by moving the point, not by multiplying. */
export function percent(share: string): string {
  const m = /^(\d*)\.?(\d*)$/.exec(share);
  if (!m) return share;
  const whole = m[1] ?? '';
  const frac = (m[2] ?? '').padEnd(2, '0');
  const moved = `${whole}${frac.slice(0, 2)}`.replace(/^0+(?=\d)/, '');
  const rest = frac.slice(2).replace(/0+$/, '');
  return `${moved}${rest ? `.${rest.slice(0, 1)}` : ''}%`;
}
