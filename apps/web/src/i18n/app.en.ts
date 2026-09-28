/**
 * `/app` — the engine's shell, in English: the stepper, the banners, the step
 * titles and the panels `App.tsx` writes itself (the envelope, the parking
 * demand, the parking step's frame and the export step).
 *
 * `export type AppDictionary = typeof EN`, so this module IS the contract and
 * `app.ar.ts` is held to it. NO `as const`: with it every value would narrow to its
 * own literal and the Arabic could only satisfy the shape by repeating the English.
 *
 * Every string here was lifted out of `App.tsx` unedited. The English rendering is
 * byte-identical to what it was before the move — `app-arabic.test.tsx` renders
 * both — and that is the only property that makes an extraction safe to do at all.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS NOT IN HERE, AND MAY NEVER BE.
 *
 * 1. NO DIGIT. Not a count, a percentage, a paper size or a format version. Where
 *    the English carried one — "within 1%", "(A3)", "3D", "glTF 2.0" — the helper
 *    below takes it as an argument and `App.tsx` supplies it from one named
 *    constant. A digit in a dictionary is a number nothing checks, in the one
 *    place on the site where nothing would.
 *
 * 2. NO ENGINE STRING. The API's refusal and warning sentences, the engine's
 *    binding-constraint labels, the fixpoint's iteration notes, the podium
 *    implication, the annex notice, rule ids, gate ids, sheet numbers and titles,
 *    versions and fingerprints are rendered by the component as the engine emitted
 *    them. `docs/05-design/arabic-glossary.md` §1: a translated record is a second
 *    record nobody issued.
 *
 * 3. NO STEP ID. `intake`, `plot`, `parking`… are the engine's names for its steps
 *    and are what `?step=` answers to. The LABELS are copy and live here.
 *
 * Several sentences wrap a value the component supplies, so they are split into the
 * part before it and the part after it. English often leaves `…Before` empty and
 * Arabic fills it, because the two languages do not put the value in the same
 * place. The spaces belong to the strings because they belong to the sentence.
 */

export const EN = {
  steps: {
    /** The `<nav>`'s accessible name. */
    nav: 'Steps',
    labels: {
      intake: 'Sheet',
      plot: 'Plot',
      parameters: 'Parameters',
      rules: 'Rules',
      assumptions: 'Assumptions',
      capacity: 'Capacity',
      parking: 'Parking',
      checks: 'Checks',
      evidence: 'Evidence',
      export: 'Export',
    },
    /** `title` on a locked step. */
    locked: 'Complete the earlier steps first',
    /** Screen-reader suffix on a locked step; the leading space is the sentence's. */
    lockedSr: ' (not yet available)',

    /**
     * The footer under every step body — `StepFooter` in `App.tsx`.
     *
     * Each button NAMES THE STEP IT REACHES, so the two halves are a lead-in and a
     * label read out of `labels` above. One dictionary entry for the step's name,
     * used by the strip and by the footer, is what stops the same step being called
     * two things on one screen.
     *
     * `needs` is keyed by `Missing` — what the next step is waiting for. Each is a
     * whole sentence naming the action that opens it, because a disabled control
     * with no stated reason is a dead end, and a dead end is the one refusal this
     * product may not make.
     */
    footer: {
      /** A second `<nav>` on the same page needs a name of its own. */
      nav: 'Move between steps',
      /** Lead-in before the previous step's label; the trailing space is the sentence's. */
      backBefore: 'Back to ',
      /** Lead-in before the next step's label. */
      nextBefore: 'Continue to ',
      needs: {
        plot: 'Create the plot first, and this opens.',
        confirm: 'Confirm the plot first, and this opens.',
        run: 'Run the engine on the rules step first, and this opens.',
      },
      /** The tenth step has nowhere to go, and says so rather than showing a dead control. */
      end: 'This is the last step.',
    },
  },

  /**
   * The `?step=` banner. The step id the VISITOR typed and the engine's list of ids
   * are not copy and sit between these fragments, untranslated.
   */
  hint: {
    unknownLead: 'There is no step called “',
    unknownBetween: '”. The steps are: ',
    unknownTail: '.',
    lockedLead: '“',
    lockedTail: '” opens once the steps before it have something to read.',
  },

  draft: {
    title: 'These numbers are not an assessment.',
    /** Only when the API sent no warning of its own; the API's sentence wins. */
    fallback:
      'This run used draft rules with placeholder citations. It demonstrates the engine; it does not measure this plot.',
  },

  /** The build line under the engine. The versions are the run's. */
  build: {
    engine: 'Engine ',
    annex: ' · definitions annex',
    unreported: 'unreported',
    unsigned: 'unsigned',
  },

  header: {
    computedIn: (ms: string): string => `Computed in ${ms} ms`,
    elapsed: (ms: string): string => `${ms} ms`,
    change: 'Change',
  },

  error: {
    blocked: 'The engine stopped here',
    failed: 'Something went wrong',
    blockedAt: 'Blocked at: ',
    dismiss: 'Dismiss',
  },

  envelope: {
    title: 'Buildable envelope',
    subtitle: 'Each dimension names the constraint that produced it.',
    fields: {
      setbackPermittedFootprint: 'Setback-permitted footprint',
      coverageCap: 'Coverage cap',
      podiumFootprint: 'Podium footprint',
      towerPlate: 'Tower plate',
      heightCeiling: 'Height ceiling',
      levelsByHeight: 'Levels by height',
    },
    bindsTitle: 'What binds each dimension',
    columns: {
      dimension: 'Dimension',
      binding: 'Binding constraint',
      value: 'Value',
      nextClosest: 'Next closest',
    },
    /**
     * The engine's dimension tokens, labelled. English prints the token with its
     * underscores turned into spaces, so it has no table of its own — `null` says
     * "use the token". A token nobody has labelled falls back to the token in
     * either language rather than to a guess.
     */
    dimensions: null as Readonly<Record<string, string>> | null,
    /** Between a runner-up constraint's engine label and its value. */
    runnerUpAt: ' at ',
    /** `withinOnePercent` from the engine; the threshold is supplied by `App.tsx`. */
    within: (threshold: string): string => `within ${threshold}`,
    /**
     * The fixpoint summary. The count is the run's; the plural is English grammar,
     * so it is decided here and not in the component.
     */
    iterations: (count: number, converged: boolean): string =>
      `Setback resolution took ${count} iteration${count === 1 ? '' : 's'}` +
      `${converged ? '' : ' and did not converge'}`,
    fixpointNote:
      'The boundary setback depends on the level count, the level count depends on the footprint, and the footprint depends on the setback. The solver seeds the level count at the most restrictive plausible value and iterates until the applicable rules and their resolved values stop changing.',
  },

  parking: {
    title: 'Parking',
    subtitle: 'Demand, then supply, then what the supply can actually carry.',
    fields: {
      residentBays: 'Resident bays',
      visitorBays: 'Visitor bays',
      totalBays: 'Total bays',
      areaPerBay: 'Area per bay',
      areaRequired: 'Area required',
      levelsRequired: 'Levels required',
      levelsAvailable: 'Levels available',
      unitsCarried: 'Units the parking can carry',
    },
  },

  parkingStep: {
    drawingsTitle: 'The drawings',
    drawingsSubtitle:
      'Every parking level with its bays numbered and a car in each, the site plan, the typical floor and two sections, all drawn from the one building the engine computed. A bay count that cannot be laid out is not a bay count — but the supply figure that fixed the governing capacity was not this drawing. It was an available area divided by an assumed factor, computed before the level was laid out at all. The two are compared on the parking page.',
    levelAsPacked: 'The level as packed',
    noLevelTitle: 'No parking level was laid out for this plot.',
    /** Only when the engine gave no reason; the engine's sentence wins. */
    noReason: 'The engine did not report a reason, which is itself worth raising.',
    noLevelTail:
      'The demand figures above still stand — what is missing is the drawing, not the arithmetic.',
  },

  export: {
    title: 'Export',
    subtitle:
      'Two things have to be true before anything leaves: you have read the assumptions, and someone has put their name to it.',

    assumptionsRead: 'Assumptions read',
    /** The count is the run's. */
    assumptionCount: (count: number): string =>
      `${count} assumption${count === 1 ? '' : 's'} in this run.`,
    readThem: 'Read them on the assumption register',

    signedBy: 'Signed by a named reviewer',
    /** The actor's name sits between these, as they typed it. */
    reviewerBefore: '',
    reviewerAfter: ' will be recorded as the reviewer.',
    noLicence: 'Add your licence number to sign. We record it; we cannot verify it.',
    sign: 'Sign this export',

    preparing: 'Preparing…',
    exportReport: 'Export report',
    notReady:
      'Both of the above have to be true first. Neither is a formality: one records that a person read what the engine had to assume, the other records who put their name to the output.',

    /** The run id sits between these. */
    fixedBefore: 'Run ',
    fixedAfter:
      ' is fixed as it stands. Editing an assumption from here creates a new run and leaves this one untouched.',

    runFingerprint: 'Run fingerprint',
    runFingerprintNote: ' — the inputs, versions and rule set',
    reportFingerprint: 'Report fingerprint',
    /** The hash algorithm's name sits between these. */
    reportFingerprintBefore: '— ',
    reportFingerprintAfter: ' over the content',

    annexTitle: 'The metric definitions annex is not signed.',

    openReport: 'Open the report',
    openDrawingSet: (paper: string): string => `Open the drawing set (${paper})`,
    openJson: 'Open the JSON export',
    downloadDxf: 'Download the CAD drawing (DXF)',
    downloadModel: (threeD: string): string => `Download the ${threeD} model (glTF)`,
    downloadXlsx: 'Download the workbook (XLSX)',

    /** Two layer names sit between `layersLead` and `layersTail`, as code. */
    cad: {
      lead: (threeD: string): string =>
        `The CAD drawing is the whole building: every parking level at its own height with a car in every bay, the ramps as slopes between levels, and the massing stood up as ${threeD} faces. Each level has its own layers — `,
      between: ', ',
      afterLayers: ' — so a reviewer can switch off one level, or one kind of thing on it. Revit and IFC are ',
      /** Emphasised in the sentence. */
      not: 'not',
      tail: ' included: round-tripping IFC is a body of work this phase has not quoted, and a badly-shaped one would be worse than none.',
    },

    /** `.glb` sits between `lead` and `tail`, as code. */
    glb: {
      lead: (threeD: string): string =>
        `The ${threeD} model is the capacity step’s ${threeD} view as a `,
      tail: (threeD: string, format: string): string =>
        ` file: binary ${format}, with no extension a reader is required to support. It is in metres, measured from the middle of the plot, with a node for each level and its cars. It carries the same two sentences in its metadata, because a ${threeD} file has no title block to print them in.`,
    },

    oneSheet: 'One sheet at a time',
    /** The sheet's number and title sit between these, as the drawing set names them. */
    sheetBefore: 'Download ',
    sheetBetween: ': ',
    sheetAfter: ' (DXF)',
  },
};

export type AppDictionary = typeof EN;
