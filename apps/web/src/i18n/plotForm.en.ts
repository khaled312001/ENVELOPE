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
    map: 'Trace it on a map',
    mapHelp:
      'Draw the boundary on satellite imagery, with the affection plan laid over it. The lengths and directions arrive in the boxes below, editable.',
    /* Said when the trace hands over. Not "imported": the figures are now the
       reader's to accept or overtype, which is the whole reason the handoff lands
       in the same boxes a typed traverse uses. */
    traced: (n: string): string =>
      `${n} traced boundaries are in the boxes below. A tracing is not a survey — check each length against the sheet and change what disagrees.`,
  },

  /**
   * The shape read off the sheet's own drawing.
   *
   * THE COPY CARRIES THE SCALE, because the scale is the assumption. The sheet
   * prints "Scale: NTS" and states an area, so the drawing's proportions are its
   * own and its size is the area's — and a reader who is told only "from your
   * affection plan" would reasonably think a surveyor's dimension had arrived.
   * One sentence, two facts: the angles are drawn, the size is the stated area.
   *
   * It names what to check it against, and names the right thing. Not the area —
   * the area matches by construction and cannot disagree. A dimension printed on
   * the drawing can.
   */
  sheetShape: {
    chip: 'Assumed — you may edit this',
    body: (n: string, area: string): string =>
      `Your affection plan draws this plot with ${n} boundaries. Their angles are the drawing's own. Their lengths are not: the sheet says "Scale: NTS", so the shape was scaled until its area came to the ${area} m² the sheet prints. Check one length against a dimension printed on the drawing before you build on it.`,
    use: 'Use the shape from the sheet',
    refusedTitle: 'No shape was read from the drawing.',
  },

  /**
   * The surveyed ring, and the copy's job is to be a different kind of sentence
   * from the one above it.
   *
   * No hedge, because there is nothing to hedge: the coordinates are printed on
   * the sheet, the legs are trigonometry on them, and the ring's own area has
   * already been checked against the plot area printed beside it — which is the
   * check the traced outline cannot have, since its size comes FROM that area.
   * The one caveat is real and is stated: a boundary the sheet draws as a curve
   * arrives here as the straight line between its two surveyed corners.
   */
  surveyShape: {
    chip: 'From the sheet’s coordinate table',
    body: (n: string, system: string, area: string): string =>
      `Your affection plan prints ${n} surveyed corners on the ${system} grid. The boundaries below are computed from them, and the ring they close measures ${area} m² — the plot area printed on the same sheet. A boundary the sheet draws as a curve arrives as the straight line between its two corners.`,
    use: 'Use the surveyed boundaries',
  },

  /**
   * The sheet's own boundary readings, offered per boundary.
   *
   * THE ONE FACT THE SHEET DOES NOT STATE is which of this plot's boundaries is
   * the front. It states a setback for FRONT, for REAR and for each SIDE, and the
   * reader is the only party who knows which boundary on screen holds which. So
   * the question asked here is exactly that one, and answering it applies the
   * reading the sheet printed for that face. A boundary left unanswered stays
   * unanswered — `AC3` has no default and a sheet does not create one.
   */
  roles: {
    legend: 'From the affection plan',
    help: 'The sheet states a reading per face. Say which boundary is which, and the reading applies.',
    which: (n: string): string => `Boundary ${n} is the plot’s`,
    choose: 'Not answered',
    FRONT: 'Front',
    SIDE: 'Side',
    REAR: 'Rear',
    /** Around the classification the sheet's reading implies. */
    appliesBefore: 'The sheet reads this face as ',
    appliesAfter: '.',
    assumed: 'Assumed',
    /** The page and box, so a reader can open the document at the reading. */
    evidence: (page: string): string => `Read on page ${page}`,
    missing:
      'The sheet does not state a reading for every face. What it leaves out stays unanswered here.',
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

    /*
      A CURVE, ASKED FOR THE WAY SOMEBODY STANDING ON IT WOULD ANSWER.

      The engine stores `tan(sweep / 4)`, signed, and the sign is the side. A
      reader cannot be asked for a sign: an inverted curve is a plot of very
      nearly the right area and the wrong shape, which is exactly the class of
      error the area check does not catch.
    */
    curve: 'Shape',
    straight: 'Straight',
    bowsRight: 'Curves to the right',
    bowsLeft: 'Curves to the left',
    curveHelp:
      'Left and right as you walk the boundary in the direction above. The corners stay where they are; the curve is how the boundary travels between them.',
    radius: 'Radius (m)',
    radiusHelp: 'The radius as the affection plan prints it.',
    /** Three figures, every one of them measured off the radius that was typed. */
    arcNote: (arcLength: string, rise: string, sweep: string): string =>
      `${arcLength} m along the curve, leaving the straight line by ${rise} m at its deepest, across ${sweep}°.`,
    radiusTooSmall:
      'A circle this small cannot reach across the boundary. Its radius has to be at least half the length above.',
    curveTooGentle:
      'This curve leaves the straight line by less than a millimetre, which is the grid every drawing here is made on. Enter it as a straight boundary.',
  },

  submit: {
    busy: 'Checking the boundary…',
    idle: 'Continue',
    incomplete:
      'Classify every edge to continue. A default here would silently change the footprint.',
  },
};

export type PlotFormDictionary = typeof EN;
