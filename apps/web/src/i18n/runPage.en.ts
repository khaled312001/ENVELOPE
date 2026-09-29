/**
 * `/work?run=…` — one stored run, in English, lifted out of the JSX unchanged.
 *
 * `export type RunPageDictionary = typeof EN`, so this module IS the contract and
 * `runPage.ar.ts` is held to it. NOTE THE ABSENCE OF `as const`: with it every value
 * would narrow to its own literal and the Arabic could only satisfy the shape by
 * repeating the English.
 *
 * ---------------------------------------------------------------------------
 * FOUR SENTENCES HERE ARE HELD BY `work.test.tsx`, AND EACH IS A REFUSAL.
 *
 * - `siblings.note` — nothing is computed between two runs of one plot. A
 *   difference column is one component away on this page at all times.
 * - `error.missing` — ONE sentence for a run that does not exist and a run that
 *   was not shared with you, because the server gives one answer for both and a
 *   page that told them apart would leak what the server is careful not to.
 * - `form.done` — the share confirmation says what happens IF an account uses the
 *   address, and says that the page will not tell you whether one does. Anything
 *   more is an account-enumeration oracle.
 * - `form.note` — nobody's licence is checked.
 *
 * ---------------------------------------------------------------------------
 * NOTHING THE RUN CARRIES IS IN HERE. The plot number, the community, the figures,
 * the binding label, the names, the timestamps and the gate id `G4` stay in the
 * component. The helpers (`model.label`, `siblings.caption`) take their values as
 * arguments and carry only word order. Strings that begin or end with a space are
 * the halves of a sentence around such a value, and the space is the sentence's.
 */

export const EN = {
  back: 'Your work',

  /** The heading: `Plot` and the run's own plot number, or a placeholder while it loads. */
  plot: 'Plot ',
  aRun: 'A run',

  /** The line under the heading. The community, the time and the author are the run's. */
  lede: {
    computedAt: ' · computed ',
    computedEarlier: ' · computed earlier',
    by: ' by ',
    kept: '. Kept exactly as it was computed; nothing on this page is recomputed.',
  },

  draftChip: 'draft rules',
  draftNote: ' Computed against rules no named professional has approved.',

  error: {
    missing:
      'This run is not on your list. Either it does not exist, or it was not shared with you.',
    failed: 'The run could not be loaded. Reload the page to try again.',
  },
  loading: 'Loading the run…',

  answer: {
    title: 'The answer',
    governing: 'Governing capacity',
    binds: 'What binds it',
    levels: 'Levels the answer places',
    levelsOf: ' of ',
    heightPermits: ' the height permits',
    assumed: 'Values assumed',
    gates: 'Export gates signed',
    gatesOf: ' of ',
    signedBy: ' · signed by ',
    notSigned: ' · not signed',
  },

  model: {
    /** The viewer's accessible name. The level count is the run's. */
    label: (levels: string): string =>
      `This run's building in 3D: ${levels} levels of floor ` +
      'area inside the envelope the rules permit. The figures beside it state the ' +
      'same in words.',
    none:
      'This run was computed before the engine built a model of the whole building, so ' +
      'there is nothing to stand up. Compute the plot again to see it.',
    placed:
      'As the engine stacked it · solid levels are the answer, outlines are height the ' +
      'answer leaves unused · ',
    stored:
      'As the engine stacked it · stored before the model recorded which levels the answer ' +
      'places, so every level the height permits is drawn solid · ',
    tail:
      'amber marks what the engine assumed where no rule decides · regulatory validity — ' +
      'not assessed',
  },

  siblings: {
    title: 'Other runs of this plot',
    note:
      'Each is its own run, with its own inputs and assumptions. Read them side by side; ' +
      'nothing here is computed between them.',
    caption: (plot: string): string => `Other runs of plot ${plot}`,
    empty: 'This is the only run of this plot on your list.',
  },

  /*
    THE TWO EXPORT GATES, AND THE FILES BEHIND THEM.

    `review.assumptionsWhere` is a refusal: the assumptions are acknowledged on the
    register, where each one is listed, and this page does not list them. A tick
    here would let someone accept a list they never opened — the reason the engine's
    own export step sends the reader back to the register rather than offering one.

    `review.signNote` says what a signature records and what it does not: the name
    and licence number on the account, checked with nobody, and nothing stops an
    author signing their own run. Both are true of the server, and the page that
    collects the signature is where a reader needs to hear it.
  */
  review: {
    title: 'Review and files',
    note:
      'Nothing leaves the system until two gates are signed against this run as it was ' +
      'computed. The server checks both again for every file it hands out.',
    assumptions: 'Assumptions acknowledged',
    assumptionsWhere:
      'Given by the author on the assumption register in the engine, where every ' +
      'assumption is listed. Not given here, because this page does not list them.',
    signed: 'Review signed',
    by: 'Signed by ',
    at: ' · ',
    unsigned: 'Not signed yet.',
    signBefore: 'Sign the review gate (',
    signAfter: ')',
    signing: 'Signing…',
    signNote:
      'Signing records your name and the licence number on your account next to this ' +
      'run. Nobody checks the licence, and nothing stops an author signing their own run.',
    noLicence:
      'Signing needs a licence number on the account, and this account was made without ' +
      'one. The number is given when an account is made.',
    readerOnly:
      'You can open this run and download its files once both gates are signed. Signing ' +
      'is for its author, or for an account it was shared with to review.',
    refusedBefore: 'The review was not signed. The server said: ',
    session: 'Your session has ended. Sign in again, then sign the review.',
  },

  files: {
    title: 'Files',
    locked: 'The files open once both gates are signed.',
    html: 'Open the report',
    sheets: 'Open the drawing set',
    newTab: 'Opens in a new tab.',
    print: 'Save as PDF',
    pdfNote:
      'The report and the drawing set are print-first documents: the PDF is your ' +
      'browser\u2019s own save of them, at the paper size already in the document.',
    json: 'Download the report data (JSON)',
    dxf: 'Download the building for CAD (DXF)',
    glb: 'Download the 3D model (glTF)',
    xlsx: 'Download the workbook (XLSX)',
    preparing: 'Preparing…',
    refusedBefore: 'The file was not handed out. The server said: ',
  },

  share: {
    title: 'Share this run',
    asBefore: 'You can open this run as its ',
    asAfter: '. Only the account that computed it can share it.',
  },

  /** What an account may be to a run. The API sends the token; this is what it is called. */
  roles: {
    author: 'author',
    reviewer: 'reviewer',
    reader: 'reader',
  },

  form: {
    noteBefore: 'Give another account access to this run. A reviewer may sign the review gate (',
    noteAfter: '); a reader may only open it. Nobody’s licence is checked.',
    email: 'Their email address',
    emailHelp:
      'The address they signed up with. Ask them to make an account first: a share to an ' +
      'address no account uses does nothing, and this page will not say so.',
    legend: 'What they may do',
    review: {
      title: 'Review it',
      detailBefore: 'Open the run and sign the review gate, ',
      detailAfter: '.',
    },
    read: {
      title: 'Read it',
      detail: 'Open the run. Nothing else.',
    },
    problem: {
      email: 'Enter the email address of the account you are sharing with.',
      role: 'Choose what they may do with the run: review it, or only read it.',
      session: 'Your session has ended. Sign in again, then share the run.',
      failed: 'The run could not be shared. Try again in a moment.',
    },
    sending: 'Sharing…',
    submit: 'Share the run',
    /*
      THE CONFIRMATION MAY NOT SAY WHETHER AN ACCOUNT EXISTS. The server answers the
      same way either way, and this sentence is written so that it stays true in both
      cases — "if an account uses it" — and then says out loud that the page will not
      tell. `work.test.tsx` holds the last sentence present.
    */
    done: {
      before: 'If an account uses ',
      middle: ', it can now open this run as a ',
      after:
        '. This page does not say whether one does, so it cannot be used to find out who ' +
        'has an account.',
    },
  },
};

export type RunPageDictionary = typeof EN;
