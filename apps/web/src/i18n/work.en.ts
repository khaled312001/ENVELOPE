/**
 * `/work` — the account's list of runs, in English, lifted out of the JSX unchanged.
 *
 * `export type WorkDictionary = typeof EN`, so this module IS the contract and
 * `work.ar.ts` is held to it: a missing Arabic key is a compile error rather than a
 * sentence that silently renders in the wrong language. NOTE THE ABSENCE OF
 * `as const` — with it every value would narrow to its own literal and the Arabic
 * could satisfy the shape only by repeating the English.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS NOT IN HERE, AND WHY.
 *
 * 1. NO FIGURE AND NO IDENTIFIER. The plot number, the community, the governing
 *    figure, the binding label, every name and every timestamp come off the row the
 *    API sent, and stay in the component. So does the `4` in "2 of 4" — the number
 *    of gates is the component's, as it was before this file existed; a digit typed
 *    here would be a second copy of it in a file nobody checks against the first.
 *
 * 2. NO BAND LETTER. `A`, `B` and `C` are how the bands are named in the PRD, the
 *    report and every export, so they live beside the band tokens in `Work.tsx` and
 *    only the question each band answers is copy. `band` carries the word order
 *    around the two.
 *
 * 3. NO AGGREGATE. There was never a total, an average or a trend on this page, and
 *    there is no key for one here — a dictionary with a slot for "total capacity"
 *    is a page one component away from filling it.
 *
 * ---------------------------------------------------------------------------
 * WHY SOME STRINGS CARRY A LEADING OR TRAILING SPACE. A sentence that wraps a value
 * the API issued is split into the part before it and the part after it, because
 * the value may not be translated and does not sit in the same place in an Arabic
 * sentence. The spaces belong to the sentence, and keeping them in the strings is
 * what makes the English render byte-identical to the JSX it was lifted out of.
 */

export const EN = {
  hero: {
    title: 'Your work',
    lede:
      'Every run you author is kept exactly as it was computed, with its inputs, its ' +
      'assumptions and its provenance graph. Nothing here is recomputed to fill a column.',
  },

  /**
   * The four counts across the top. Every label names a LIST, not a quantity of
   * anything in the world — see `WorkTally` for the line this page may not cross.
   * "Runs you authored" is a length; "capacity authored" would be a sum over
   * plots that share nothing.
   */
  tally: {
    heading: 'How much is in this workspace',
    authored: 'Runs you authored',
    shared: 'Shared with you',
    signed: 'Both export gates signed',
    drafts: 'Drafts in progress',
    /*
      THE WORDING AVOIDS THE WORDS IT IS ABOUT, and the test is right to make it.

      The first draft read "nothing here is a total, an average or a trend across
      plots" — which is true, and which `states no aggregate over runs` rejects,
      because that test scans this dictionary for those words and cannot tell a
      denial from a claim. That is the same prohibition the landing page is held
      to and it is not a limitation: a test that could read negation would pass on
      a page that said "no averages" and then printed one. So the sentence makes
      the point without naming them.
    */
    note: 'Counts of what is listed below, and nothing more. Two runs on two plots share no input, so no single figure describes both.',
  },

  checking: 'Checking whether you are signed in…',

  signedOut: {
    body:
      'This list is kept against an account. Open the engine and create one, or sign in ' +
      '— a run authored without an account is computed identically and is not kept.',
    cta: 'Open the engine',
  },

  /**
   * The two failures this page words itself. A third — the server's own sentence —
   * is rendered as the server wrote it and is not in here.
   */
  fetch: {
    statusBefore: 'the server answered ',
    statusAfter: '',
    failed: 'the list could not be loaded',
  },

  loading: 'Loading your runs…',

  authored: {
    title: 'Runs you authored',
    caption: 'Runs authored by this account',
    /**
     * The label is the chrome's own `runAPlot`, passed in: the button this sentence
     * points at and the words it points with cannot drift apart.
     */
    empty: (runAPlot: string): string =>
      `You have not authored a run yet. The engine opens from “${runAPlot}”.`,
  },

  shared: {
    title: 'Shared with you',
    /*
      The one sentence on this page that describes a control, so it says exactly what
      the control is and stops. Being named a reviewer means the run is readable; it
      does not mean the licence was checked.
    */
    note:
      'A run someone shared with you, in the role they named. A reviewer role makes the ' +
      'run readable; it does not verify anybody’s licence.',
    caption: 'Runs shared with this account',
    empty: 'Nothing has been shared with you.',
  },

  drafts: {
    title: 'Unfinished',
    note:
      'What you had typed when you last closed the tab. A draft is not a run: nothing ' +
      'in it has been computed, and it carries no provenance.',
    empty: 'Nothing unfinished.',
    /** The draft keys the product writes, in the reader's words rather than the form's. */
    labels: {
      'plot-form': 'A plot you started entering',
    },
    resume: 'Resume it',
  },

  /**
   * THE DISCLOSURE THIS PAGE IS OBLIGED TO CARRY — there are no firms or projects,
   * only accounts, and a reviewer's licence is never checked. `work.test.tsx` asserts
   * both sentences PRESENT in this module, because deleting them makes the page read
   * better and no prohibition can see an absence.
   */
  disclosure: {
    before:
      'Only you and the accounts you share a run with can open it. ' +
      'There are no firms or projects in this deployment, only accounts, and a ' +
      'reviewer’s licence is recorded but never checked. Both are on ',
    link: 'what it refuses',
    after: '.',
  },

  /** `RunTable` — six column headings and four qualifiers. */
  table: {
    columns: {
      plot: 'Plot',
      governing: 'Governing capacity',
      binds: 'What binds it',
      assumed: 'Assumed',
      gates: 'Export gates',
      run: 'Run',
    },
    /** Between the gates signed and the gates there are. Both figures are the row's. */
    /** The card's own way in. A verb and its object: the run, opened. */
    open: 'Open this run',
    of: ' of ',
    signedBy: 'signed by ',
    notSigned: 'not signed',
    draftRules: 'draft rules',
    /** The role a run was shared in. The API sends the token; this is what it is called. */
    roles: {
      reviewer: 'reviewer',
      reader: 'reader',
    },
  },

  /** The question each band answers, as the capacity screen names it. */
  bands: {
    REGULATORY: 'what the code permits',
    GEOMETRIC: 'what the envelope holds',
    PARKING: 'what the parking supports',
  },
  band: (letter: string, question: string): string => `band ${letter} · ${question}`,
  /** A band token this page has no question for: the engine's word, untranslated. */
  bandToken: (token: string): string => `band ${token}`,
};

export type WorkDictionary = typeof EN;
