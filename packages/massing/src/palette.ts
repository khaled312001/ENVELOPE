/**
 * The light palette, for a file — kept apart from the writer so the viewer can use
 * it as a fallback without pulling the glTF writer into the browser.
 */

import type { ScenePalette } from './scene.js';

/**
 * The file's colours: the light palette, whatever theme the person exporting was in.
 *
 * A file outlives the screen it was made on, and a dark-mode ink written into it
 * would be a pale green on the white ground of whatever opens it. So the colours are
 * the tokens' light values, written as `var(--token, #hex)` — the same form the
 * sheet stylesheet uses — so that `pnpm contrast` can hold every hex here to the
 * light palette and fail the day one drifts. Amber is on the `assumed` line and no
 * other; the gate checks that too.
 */
const FILE_INKS = {
  derived: 'var(--derived, #1f6b45)',
  assumed: 'var(--uncertain, #55555f)',
  userSet: 'var(--accent, #3355e0)',
  neutral: 'var(--text-secondary, #55555f)',
  ground: 'var(--surface-sunken, #eef1f8)',
  car: 'var(--border-strong, #77797f)',
} as const;

const fallbackOf = (v: string): string => {
  const hex = /#[0-9a-fA-F]{3,8}/.exec(v)?.[0];
  if (!hex) throw new Error(`The file palette entry "${v}" has no colour behind its token.`);
  return hex;
};

export const FILE_PALETTE: ScenePalette = {
  derived: fallbackOf(FILE_INKS.derived),
  assumed: fallbackOf(FILE_INKS.assumed),
  userSet: fallbackOf(FILE_INKS.userSet),
  neutral: fallbackOf(FILE_INKS.neutral),
  ground: fallbackOf(FILE_INKS.ground),
  car: fallbackOf(FILE_INKS.car),
};
