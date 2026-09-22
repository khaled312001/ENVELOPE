/**
 * Step 1 — the plot form, in English.
 *
 * `export type PlotFormDictionary = typeof EN` is the contract `plotForm.ar.ts` is
 * held to; no `as const`, so the SHAPE is what the Arabic must match. Every string
 * was lifted out of `PlotForm.tsx` unedited.
 *
 * NOT IN HERE: the values a person typed, the draft's timestamp, the computed area,
 * and the 2% tolerance, which `PlotForm.tsx` supplies from one named constant
 * because no digit is typed into a dictionary.
 *
 * `placeholders.community` names a real community as an example of the kind of
 * name the field wants. It is a proper name as issued, so the Arabic keeps it in
 * the Latin script the affection plan prints it in.
 */

export const EN = {
  draft: {
    title: 'You had started entering a plot.',
    /** The time it was saved sits between these. */
    savedBefore: ' Saved ',
    savedAfter: '. Nothing below has been changed.',
    restore: 'Restore it',
    discard: 'Discard it',
  },

  /** The save state, reported and never celebrated. */
  save: {
    saving: 'Saving…',
    saved: (time: string): string => `Saved ${time}`,
    localOnly: 'Kept on this device only — sign in and it follows you.',
    error: 'The last save did not reach the server.',
  },

  title: 'The plot',
  subtitle:
    'Enter the dimensions from the affection plan. Every edge needs a classification — the setback depends on it, and there is no default.',

  carried: {
    title: 'Carried over from the sheet you uploaded.',
    body: (tolerance: string): string =>
      ` The plot number, community and stated area are filled in. Width and depth are not: the sheet gives an area, not a frontage, and a rectangle inferred from an area would then pass the ${tolerance} check against the number it came from.`,
  },

  which: {
    legend: 'Which plot',
    plotNumber: 'Plot number',
    community: 'Community',
    communityPlaceholder: 'e.g. Business Bay',
    communityHelp:
      'The Development Control Regulation is per community, so this decides which rules apply.',
  },

  size: {
    legend: 'How big',
    width: 'Width (m)',
    depth: 'Depth (m)',
    /** The trailing space is the sentence's; "optional" follows in a muted span. */
    stated: 'Area on the affection plan (m²) ',
    optional: 'optional',
    statedHelp: (tolerance: string): string =>
      `If you enter it, we compare it against the area computed from your dimensions and tell you when they disagree by more than ${tolerance}.`,
    computed: 'Computed area',
  },

  edges: {
    title: 'Edges',
    /** The count is the form's own. */
    unclassified: (count: string): string => `${count} still unclassified`,
    allClassified: 'all classified',
    faces: (edge: string): string => `Edge ${edge} faces`,
    choose: 'Choose…',
    classes: {
      ROAD: 'A road',
      ADJACENT_PLOT: 'A neighbouring plot',
      OPEN_SPACE: 'Open space',
      OTHER: 'Something else',
    },
    roadType: 'Road type',
    hierarchy: {
      ARTERIAL: 'Arterial',
      COLLECTOR: 'Collector',
      LOCAL: 'Local',
      ACCESS: 'Access',
    },
    roadHelp: 'The setback table is keyed on this.',
  },

  submit: {
    busy: 'Checking the boundary…',
    idle: 'Continue',
    incomplete:
      'Classify every edge to continue. A default here would silently change the footprint.',
  },
};

export type PlotFormDictionary = typeof EN;
