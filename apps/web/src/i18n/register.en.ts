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

  /**
   * THE EXPLAINER, and it is here because a client read this screen and wrote back
   * «Assumptions مش فاهمها» — *I don't understand them*.
   *
   * §20.2 calls this step "the moment the user understands this is not magic", and
   * it was opening on a ranked table with no statement of what an assumption is.
   * The table is the disclosure; this is the sentence that makes the disclosure
   * mean something.
   *
   * `amber` IS THE LOAD-BEARING ONE, and it is not a nicety. The UAE Design System
   * sets Camel Yellow as the government warning colour, so a reader trained on
   * Dubai portals arrives already knowing that amber means *something is wrong*.
   * §13.1's amber means *this rests on judgement* — a different claim, and one the
   * page can no longer leave to convention. It has to be said in words, on the
   * screen, every time.
   *
   * The argument for assuming at all goes in `why`, behind a disclosure that is
   * closed: it is worth reading and it is not worth blocking on.
   */
  explainer: {
    what: 'An assumption is a number no document stated and no rule supplied. The engine chose one so the run could finish, wrote down why, and marked it.',
    amber: 'Amber means assumed. It is not a warning and nothing has gone wrong — it is the engine naming the figures that rest on its judgement rather than on a document.',
    act: 'Change any of them and the answer moves. Nothing here is hidden; that is what the colour is for.',
    whySummary: 'Why the engine assumes anything at all',
    why: 'A value with no governing rule has three possible fates: stop the run, pick a number in silence, or pick a number and say so. Stopping is right where the missing value is a limit the plot itself must state — an affection plan that omits a plot ratio gets none, and the run blocks rather than borrowing one from a neighbouring plot. Everywhere else, a silent choice is the failure this product exists to prevent, because it produces a plausible answer nobody can audit. So the engine picks, records the basis, measures how far the answer would move if the choice were wrong, and puts it in this list before anything can be exported.',
  },

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
