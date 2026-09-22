/**
 * `TracedValue`, `NotAssessed` and `ProvenanceLegend` — the words every figure in
 * the product carries, in English.
 *
 * `export type TracedDictionary = typeof EN`, and no `as const`, so the Arabic module
 * is held to this shape and a missing key is a compile error.
 *
 * WHAT IS IN HERE IS THE LABEL, NEVER THE TOKEN. `ASSUMED` is what the engine
 * emitted and it is not translated anywhere; «مُفترَض» is what the interface calls
 * it. The glossary draws that line and this module is where it is drawn for the
 * whole product, because every figure goes through `TracedValue`.
 *
 * NO FIGURE. The legend's two specimens stay in the component: a digit in a
 * dictionary is a number with no provenance, one language further from anyone who
 * would notice it.
 */

export const EN = {
  /** Plain-language description of each class, for the title and the legend. */
  classDescription: {
    DERIVED: 'Computed from a cited rule. Open to see the clause.',
    ASSUMED: 'Assumed — no rule governs this. You can edit it.',
    USER_SET: 'You entered this value.',
    OBSERVED: 'Observed across comparable approved projects.',
    TRADEOFF: 'Chosen by the optimiser among feasible alternatives.',
    VARIANCE: 'Governed by a documented exemption. Open to see the evidence.',
  },

  classLabel: {
    DERIVED: 'Derived',
    ASSUMED: 'Assumed',
    USER_SET: 'You set this',
    OBSERVED: 'Observed',
    TRADEOFF: 'Trade-off',
    VARIANCE: 'Variance',
  },

  /**
   * A class as a chip, from the token the engine put on the node. English prints
   * the token in lower case, which is how the derivation tree has always read; a
   * token the table does not know is shown as the engine sent it.
   */
  classChip: (token: string): string => token.replace('_', ' ').toLowerCase(),

  editAction: 'Edit this assumption',
  inspectAction: 'Show where this number came from',

  /** The button's accessible name. Word order only; every value is the caller's. */
  ariaLabel: (parameterId: string, figure: string, description: string, action: string): string =>
    `${parameterId}: ${figure}. ${description} ${action}.`,
  title: (label: string, description: string): string => `${label} — ${description}`,
  enteredBy: (name: string): string => `Entered by ${name}`,
  /** The class, said to a screen reader after the figure. Leading space is the sentence's. */
  srClass: (label: string): string => ` (${label})`,

  notAssessed: 'Not assessed',

  legend: {
    label: 'How to read these numbers',
    derived: 'From a cited rule',
    assumed: 'Assumed — editable, and it moves the answer',
    you: 'You',
    userSet: 'You entered it',
    notAssessed: 'Not assessed',
    notChecked: 'Applicable, not checked',
  },
};

export type TracedDictionary = typeof EN;
