/**
 * The plot-limits panel, in English.
 *
 * `export type LimitsDictionary = typeof EN` is the contract `limits.ar.ts` is
 * held to, so a string added here fails the Arabic file at compile time.
 *
 * ---------------------------------------------------------------------------
 * THE PANEL'S WHOLE JOB IS THE SECOND LIST.
 *
 * The first list — what the sheet bound — is the good news, and it is one table
 * row per limit. The second list is what the sheet states and the engine did not
 * apply, and it is the reason this panel exists at all: the defect it reports on
 * was a document that was read, displayed, and dropped without a word. A panel
 * that showed only the bound limits would be the same silence, one screen later.
 *
 * So `notBound` is never collapsed, never summarised as a count, and never
 * phrased as an error. Each row says what the sheet states and why it binds
 * nothing, in that order — `ux-writing`'s what → why, with no blame anywhere,
 * because the reader did nothing wrong and neither did the document.
 *
 * ---------------------------------------------------------------------------
 * NO AMBER HERE, AND THAT IS DELIBERATE.
 *
 * Nothing on this panel is `ASSUMED`. A limit the sheet states and the engine
 * applied is `DERIVED` from a citation; a limit the sheet states and the engine
 * did not apply is not a value at all. §13.1 reserves amber exclusively for
 * uncertainty, and a panel that borrowed it to mean "look at this" would teach a
 * reader that amber means emphasis — which is the one thing that rule exists to
 * prevent.
 */

export const EN = {
  heading: 'What this plot’s own sheet states',

  /** No sheet was attached. Not a warning: step 0 is not gated, by design. */
  none: {
    title: 'No affection plan is attached to this plot.',
    body:
      'The run uses the general rules alone. Attach the sheet at the first step and its ' +
      'own limits will bind this plot instead — a plot whose sheet is not to hand is ' +
      'still a plot, so nothing here is blocked.',
  },

  /** The sheet names a different parcel. The run proceeded; the sheet did not. */
  refused: {
    title: 'This sheet was not applied.',
  },

  read: 'Read from',
  issued: 'Issued',
  undated: 'no date printed on the sheet',

  bound: {
    title: 'Applied to this run',
    lede:
      'Each of these replaced the general rule for the same parameter. The rule it beat ' +
      'is still listed with the run, named rather than removed.',
    parameter: 'Limit',
    value: 'Value',
    clause: 'As the sheet prints it',
    empty: 'This sheet states no limit the engine applies.',
  },

  notBound: {
    title: 'Stated on the sheet, not applied',
    lede:
      'The sheet says these and the run does not use them. Each row gives the reason, ' +
      'so the difference between the document and the answer is on the page rather than ' +
      'left for you to find.',
    field: 'What the sheet states',
    reason: 'Why it is not applied',
  },

  /** The line that must be true of this panel however green it looks. */
  claim:
    'Applying a limit is not a finding that the design meets it. Regulatory validity is ' +
    'never assessed and never claimed.',
};

export type LimitsDictionary = typeof EN;
