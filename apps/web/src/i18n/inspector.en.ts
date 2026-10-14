/**
 * The workspace inspector — the column beside the drawing — in English.
 *
 * `export type InspectorDictionary = typeof EN`; `inspector.ar.ts` is held to it.
 *
 * NOT IN HERE: every figure, the plot number, the band's name (that is
 * `bands.*.ts`'s, so the inspector and the capacity panel cannot call one band two
 * things) and the gate ids. The inspector restates what the engine returned; it
 * computes nothing and it words nothing the step screens do not.
 */

export const EN = {
  /** The landmark's accessible name. */
  label: 'This study',

  plot: {
    heading: 'Plot',
    none: 'No plot yet. Enter one on the plot step.',
    number: 'Plot number',
    area: 'Computed area',
    edges: 'Boundary edges',
  },

  answer: {
    heading: 'Answer',
    none: 'Nothing is computed yet. The answer appears here once the rules step runs.',
    governing: 'Governing capacity',
    levels: 'Levels',
    assumptions: 'Assumed values',
    /** The count is the engine's; this is the noun after it. */
    assumptionsOpen: 'Open the register',
  },

  gates: {
    heading: 'Gates',
    G1_PLOT_CONFIRMED: 'Plot confirmed',
    G2_RULES_ACKNOWLEDGED: 'Rules acknowledged',
    G3_ASSUMPTIONS_ACKNOWLEDGED: 'Assumptions read',
    G4_REVIEWER_NAMED: 'Export signed',
    done: 'Done',
    open: 'Not yet',
  },
};

export type InspectorDictionary = typeof EN;
