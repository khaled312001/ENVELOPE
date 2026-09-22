/**
 * Step 7 — Checks, in English.
 *
 * `export type ChecksDictionary = typeof EN`; `checks.ar.ts` is held to it.
 *
 * THE FIVE HEADINGS ARE §16.5's, IN §16.5's ORDER, and the order lives in the
 * component rather than here: a dictionary is a set of words, and the order is an
 * assertion the screen makes. What each claim then SAYS — the detail under each
 * heading, the self-consistency notice, the independence limit, every invariant's
 * statement and figures, every rule's outcome — is the validator's own sentence and
 * is rendered as the validator wrote it, in either language.
 *
 * NO FIGURE. The runtime budget, every count and the annex version arrive from the
 * run or from the component; the helpers carry word order around them.
 */

export const EN = {
  claims: {
    selfConsistency: 'Self-consistency',
    ruleCoverage: 'Rule coverage',
    geometricValidity: 'Geometric validity',
    professionalAgreement: 'Professional agreement',
    regulatoryValidity: 'Regulatory validity',
  },

  /** A status the table does not know is shown as the validator's token. */
  status: {
    SUPPORTED: 'Supported',
    MEASURED: 'Measured',
    PARTIAL: 'Partial',
    NOT_ASSESSED: 'Not assessed',
    NEVER_CLAIMED: 'Never claimed',
  },

  title: 'What we checked, and what we did not',
  subtitle:
    'Five different questions, answered separately. They are not the same question, and ' +
    'only one of them is about the regulator.',
  independence: 'What independence here does and does not mean',

  footer: {
    runtime: 'Runtime ',
    /** After the elapsed figure; the budget is the component's constant. */
    within: (budget: string): string => ` ms — within the ${budget} budget.`,
    over: (budget: string): string => ` ms — over the ${budget} budget.`,
    annex: ' · Definitions annex ',
  },

  invariants: {
    title: 'Conservation checks',
    subtitle:
      'Arithmetic that has to close whatever the rules say. A failure here blocks the run — ' +
      'it is never a warning.',
    passed: (count: string): string => `${count} passed`,
    failed: (count: string): string => `${count} failed`,
    notAssessed: (count: string): string => `${count} not assessed`,
    /**
     * The count sentence, spelled out rather than reduced to a ratio. Returned in
     * three parts because its last clause is emphasised in the markup.
     */
    ran: (
      ran: string,
      total: string,
      dormant: string,
    ): { readonly before: string; readonly emphasis: string; readonly after: string } => ({
      before:
        `${ran} of ${total} checks in the catalogue ran on this artifact. ` +
        `${dormant} had nothing to check and are `,
      emphasis: 'not counted as passes',
      after: '.',
    }),
    caption: 'Invariant results, with the observed and expected values for each',
    columns: {
      check: 'Check',
      statement: 'Statement',
      observed: 'Observed',
      expected: 'Expected',
      tolerance: 'Tolerance',
    },
    hideDormant: 'Hide the checks that had nothing to check',
    showDormant: (count: string): string => `Show the ${count} checks that had nothing to check`,
    pass: 'pass',
    fail: 'fail',
    notAssessedChip: 'not assessed',
  },

  outcomes: {
    title: 'The answer, re-checked against the rules',
    subtitle:
      'By a module that cannot see the one that produced it. Agreement is self-consistency — ' +
      'never compliance.',
    satisfiedCount: (count: string): string => `${count} satisfied`,
    violatedCount: (count: string): string => `${count} violated`,
    notEvaluableCount: (count: string): string => `${count} not evaluable`,
    satisfied: 'satisfied',
    violated: 'violated',
    notEvaluable: 'not evaluable',
    lifeSafety: 'life safety',
    deferredTitle: 'Applicable, and not assessed ',
    lifeSafetyCount: (count: string): string => `${count} life safety`,
    deferredNote:
      'Declared in every output. What was not checked has to be visible rather than absent — ' +
      'an omitted check reads as a check that passed.',
    notAssessed: 'not assessed',
  },
};

export type ChecksDictionary = typeof EN;
