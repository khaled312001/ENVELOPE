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

  /**
   * The section that changes with the step: what the drawing in the middle is
   * answering. Band names are `bands.*.ts`'s and the three losses are the parking
   * page's, so neither is named twice.
   */
  step: {
    capacity: {
      heading: 'The three bands',
      /** Beside the band the answer comes from; said in words, not only marked. */
      governs: 'governs',
    },
    /*
      The two counts are NOT the same quantity, and the labels say so. The level
      plan lays out ONE level; the demand is the whole building's. Printed as
      "laid out 56 / required 265" they read as a shortfall nobody computed.
    */
    parking: {
      heading: 'Parking',
      laidOut: 'Bays on one level',
      required: 'Bays the building needs',
      lossesHeading: 'Given up on that level, by cause',
      /** After a loss's bay count. */
      bays: ' bays',
      none: 'No level was laid out for this run. The parking step says why.',
    },
    checks: {
      heading: 'Checks',
      invariants: 'Conservation checks',
      outcomes: 'Re-checked against the rules',
    },
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
