/**
 * The assumption register (`FR-ASM-001`), in English.
 *
 * `export type RegisterDictionary = typeof EN`; `register.ar.ts` is held to it.
 *
 * NOT IN HERE: every assumption's label, parameter id, value, unit and basis. Those
 * are the engine's, and the basis above all is a signed record of why a number was
 * assumed. The perturbation (`±10%`) is the engine's figure and stays in the
 * component; the helpers below carry word order around figures and never a figure.
 *
 * Where a sentence opens with a space it is because the JSX it came out of put one
 * there, after a glyph; the English render is held byte-for-byte to what it was.
 */

export const EN = {
  title: 'Assumptions',

  none: 'Every value in this run came from a rule or from you. Nothing was assumed.',
  /** Singular and plural are separate keys rather than arithmetic on a count. */
  noRule: {
    one: (count: string): string => `${count} value had no governing rule. `,
    other: (count: string): string => `${count} values had no governing rule. `,
  },
  topMoves: (percent: string): string => `The one at the top moves the answer by ${percent}%.`,

  caption:
    'Assumptions made in this run, ordered by how much each moves the governing capacity',
  columns: {
    assumption: 'Assumption',
    value: 'Value',
    why: 'Why it was assumed',
    effectAt: (perturbation: string): string => `Effect at ${perturbation}`,
  },

  acknowledged: ' You acknowledged these assumptions. You can still change any of them.',
  pending: ' Read these before exporting. The report carries them, and so does any decision made from it.',
  acknowledge: 'I have read the assumptions',

  showUse: 'Show where this assumption is used',
  editLabel: (label: string, current: string): string => `Edit ${label}, currently ${current}`,
  moves: (percent: string, perturbation: string): string =>
    `Moves the governing capacity by ${percent} percent when perturbed by ${perturbation}`,
  notMeasuredTitle: 'This assumption could not be perturbed independently.',
  notMeasured: 'Not measured',
};

export type RegisterDictionary = typeof EN;
