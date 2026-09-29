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
  /*
    THE EDGE SENTENCE MOVED UP, to the step primer that now opens every step —
    it was "Every edge needs a classification — the setback depends on it, and
    there is no default", and the primer says the same thing four lines above
    this subtitle. Two adjacent blocks making one point in slightly different
    words is not emphasis; it reads as a product repeating itself, and it was
    visible the moment the two were screenshotted together.
  */
  subtitle: 'Enter the dimensions from the affection plan.',

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

  /**
   * HOW THE SHAPE IS ENTERED, and the sentence under it is the whole argument.
   *
   * A rectangle is a shortcut, not a model of a plot. The client's own words:
   * plots carry several dimensions, fractions and curves, and are not only
   * rectangles or squares. The second mode takes the boundaries as the document
   * states them - a length and a direction each - and computes the corners.
   *
   * NO DIGIT IN HERE. The edge count, the misclose and the closure ratio are all
   * the form's own measurements and arrive as arguments.
   */
  shape: {
    legend: 'How the plot is shaped',
    rectangle: 'A rectangle',
    edges: 'Boundary by boundary',
    rectangleHelp: 'A frontage and a depth. Quickest when the plot really is a rectangle.',
    edgesHelp:
      'A length and a direction for each boundary, as the affection plan states them. The corners are computed from them.',
    switched:
      'Your rectangle is in the boxes below as four boundaries. Change any of them, and add or remove boundaries as the plot needs.',
  },

  traverse: {
    length: 'Length (m)',
    bearing: 'Direction (°)',
    bearingHelp: 'Clockwise from north, along the boundary. North is zero and east is a quarter turn.',
    add: 'Add a boundary',
    remove: 'Remove',
    removeEdge: (edge: string): string => `Remove boundary ${edge}`,
    /** The count is the form's own; three is the fewest a polygon can have. */
    tooFew: 'A plot needs at least three boundaries.',
    unusable:
      'Every boundary needs a length greater than zero and a direction between zero and a full turn. Nothing is computed until they all do.',
    closes: 'The boundaries return to the corner they started from.',
    /** Both figures are measured by the form and arrive here. */
    misclose: (metres: string, ratio: string): string =>
      `The boundaries do not return to the corner they started from: they end ${metres} m away, which is one part in ${ratio} of the way round.`,
    /*
      THE CONSEQUENCE, IN WORDS, and it is the sentence this whole panel exists
      for. Nothing is adjusted to hide the gap, so the shape that is submitted
      closes the last boundary back to the first corner - and that boundary is
      then drawn at a length nobody typed. Saying the misclose without saying
      this would be stating the residue and hiding what was done with it.
    */
    lastLeg: (drawn: string, entered: string): string =>
      `Nothing has been adjusted. The shape that will be submitted closes the last boundary back to the first corner, so it measures ${drawn} m rather than the ${entered} m entered for it.`,
  },

  submit: {
    busy: 'Checking the boundary…',
    idle: 'Continue',
    incomplete:
      'Classify every edge to continue. A default here would silently change the footprint.',
  },
};

export type PlotFormDictionary = typeof EN;
