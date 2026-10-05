/**
 * Step 0 — reading an affection plan, in English.
 *
 * `export type IntakeDictionary = typeof EN` is the contract `intake.ar.ts` is held
 * to. NO `as const`, so every value widens to `string` and the SHAPE is what the
 * Arabic must match. Every string was lifted out of `AffectionPlanIntake.tsx`
 * unedited; the English rendering is byte-identical to what it was.
 *
 * WHAT IS NOT IN HERE:
 *
 *   Nothing `packages/intake` or the API wrote. The filename, every value read off
 *   the sheet, the height code as printed, the setback line as printed, a
 *   conditional setback's own conditions, each cross-check's detail, each gap's
 *   label and consequence, and the disclaimer are rendered as they arrived. They
 *   are a record of what the sheet says and what the reader found, and a
 *   translated record is a second record nobody issued.
 *
 *   No digit. The file-size figures, the percentages, the 2% tolerance and the
 *   worked example of a conditional setback are supplied by the component; the
 *   helpers here carry only the word order around them.
 */

export const EN = {
  title: 'Read an affection plan',
  subtitle:
    'Drop the PDF in. We read the printed values, re-check the sheet’s own arithmetic, and list what it does not say. Nothing is saved until you have looked at it.',

  dropzone: {
    busy: 'Reading the sheet…',
    idle: 'Choose a PDF, or drop one here',
    issuedOnly:
      'The sheet must be the issued PDF. A photograph or a scan has no text on it to read, and this does not guess at pixels.',
  },

  /**
   * A file refused before upload. Its own name sits between `before` and `after`,
   * as the reader's file system gave it; both sizes are supplied by the component.
   * What it is and why it is refused; the dropzone's own line says what to upload.
   */
  tooLarge: {
    before: '',
    after: (sizeMb: string, typicalMb: string): string =>
      ` is ${sizeMb} MB. Affection plans are ` +
      `single sheets of about ${typicalMb} MB — a file this large is usually a scanned ` +
      'bundle, and a scan has no text to read.',
  },

  skip: 'Skip — I’ll type the values in',

  fields: {
    plotNumber: 'Plot number',
    community: 'Community',
    landUse: 'Land use',
    plotArea: 'Plot area',
    far: 'FAR',
    gfa: 'Permitted GFA',
    issued: 'Issued',
    drawingRef: 'Drawing reference',
  },
  notPrinted: 'not printed on this sheet',
  notStated: 'not stated',

  /** The three faces of one mass. */
  faces: {
    front: 'front',
    side: 'side',
    rear: 'rear',
  },
  faceSeparator: ', ',
  needsDecision: 'needs a decision',
  /** Between the options of a conditional setback. */
  or: ' or ',

  height: {
    label: 'Height:',
    /**
     * The three counts are the parser's reading of the printed code, and each sits
     * between its own pair — split rather than a function because a count the
     * reading does not carry must render as nothing, exactly as it did inline.
     */
    groundBefore: '',
    groundAfter: ' ground, ',
    podiumBefore: '',
    podiumAfter: ' podium, ',
    typicalBefore: '',
    typicalAfter: ' typical.',
  },

  setbacks: {
    title: 'Setbacks, as printed',
    podium: 'Ground floor and podium',
    tower: 'Tower',
    asPrintedBefore: 'As printed: “',
    asPrintedAfter: '”',
    decision: {
      title: 'One of these setbacks depends on a decision nobody has made.',
      /** The worked example of a conditional face sits between these. */
      before: 'The sheet states two values for the same face — typically “',
      after:
        '”. That is the sheet being precise, not vague: it depends on a façade the applicant has not chosen. Collapsing it to one number would pick the façade for them, so it stays as printed and the run is blocked until someone chooses.',
    },
  },

  /**
   * THE BOUNDARY READINGS. The client's complaint of 4 Oct 2026, in full:
   *
   *   «لسه برضو مش جايب الرسم على الخريطه الحقيقيه والمفروض القراءات تطلع كامله
   *    من الرسمه بتاعت الافكشن بلان»
   *
   * He had reached step 1 after reading a sheet and met "4 STILL UNCLASSIFIED"
   * over four empty dropdowns. The copy here is held to what the sheet actually
   * supports: each line is a PROPOSAL about a role, the amber chip is the
   * product's own word for an assumption, and every gap is the engine's own
   * sentence rendered as it arrived.
   *
   * `roles` reuses `faces` rather than translating "front", "side" and "rear" a
   * second time — the same three words twice in one dictionary is the
   * `.chip--assumed` / `.chip--warn` defect in a dictionary.
   *
   * The four types ARE translated, like the provenance class labels: they are a
   * closed set of interface vocabulary, not a sentence the engine wrote. A type
   * this table does not know is shown as the engine sent it.
   */
  boundaries: {
    title: 'Boundaries, as the setback schedule names them',
    /** Fact, then action — the structure the missing-fields panel was fixed into. */
    lead:
      'Each line is a proposal. Apply it to a boundary on the next step, or classify that boundary yourself.',
    types: {
      ROAD: 'Road',
      ADJACENT_PLOT: 'Adjacent plot',
      OPEN_SPACE: 'Open space',
      OTHER: 'Other',
    },
    /** The sheet's own clause sits between these, quoted as printed. */
    readFromBefore: 'Read from “',
    readFromAfter: '”',
    whySummary: 'Why these are proposals and not readings',
    why:
      'The sheet states a setback for a face. It does not classify a boundary, and it does not say which boundary of this plot is the front. So each line is an inference from the sheet’s own wording. A boundary type has no default in this product: you confirm it, and it is recorded against your name.',
    /** The empty state. Value, then the first action. */
    none:
      'This sheet classifies no boundary. Its setback schedule is absent or silent on every face, and the drawing panel carries no text to read. Classify each boundary on the next step.',
    /**
     * NOT "What this sheet does not say about its boundaries", which was the
     * first wording and was wrong twice. `screens.test.tsx` asserts that a sheet
     * stating every limit shows no "What this sheet does not say" heading, and a
     * heading that merely CONTAINS that phrase trips it — correctly, because the
     * two sections are different findings and a reader scanning two headings that
     * open on the same seven words reads one of them.
     */
    gapsTitle: 'Boundaries this sheet leaves open',
    accessSide: 'Access side, as printed',
  },

  coverage: {
    label: 'Coverage:',
    podium: (percent: string): string => `podium ${percent}% of plot area`,
    podiumMissing: 'podium not stated',
    tower: (percent: string): string => `, tower ${percent}%`,
    end: '.',
  },

  crossChecks: {
    title: 'The sheet’s own arithmetic, re-checked',
    agrees: 'agrees',
    disagrees: 'disagrees',
  },

  missingTitle: 'What this sheet does not say',

  /**
   * THE THREE LAYERS — fact, then consequence, then argument — and the reason the
   * panel was restructured is a line in the client's reply: *"وفي حجات موجوده مش
   * مفهومه بالنسبالي"*.
   *
   * The panel was correct and unreadable. It opened on a heading, listed the gaps,
   * and then put the whole of the argument inside a red banner's closing sentence —
   * so the first thing a reader met was a paragraph about borrowed plot ratios,
   * before they had been told in plain words what the list underneath them was.
   *
   * `missingLead` is the fact and the action. `missingWhy` is the argument, behind
   * a disclosure that is closed by default: it is worth reading and it is not worth
   * blocking on. `blocked.after` keeps only the sentence that names what the reader
   * can do next — it used to carry the argument too, in a `role="alert"`, which is
   * the worst place on the screen to put a paragraph.
   */
  missingLead:
    'These are limits this sheet is silent on. The engine will not fill them in. You can enter each one from the regulation that governs this plot, or attach a document that states it.',
  missingWhySummary: 'Why the engine will not fill a gap in a sheet',
  missingWhy:
    'Because the obvious way to fill it is to take the figure from a plot next door, and that is the precise mistake this product exists to prevent. Two plots in one community routinely carry different limits, and a borrowed plot ratio produces a building that is plausible, well drawn, fully costed and not permitted. A gap that is named costs an afternoon; a gap that is filled in silence is found by a regulator.',

  blocked: {
    title: 'This sheet cannot drive a capacity run.',
    /** The labels of the missing limits sit between these, as `packages/intake` names them. */
    before: ' It omits ',
    labelSeparator: ', ',
    after:
      '. You can still create the plot and enter those limits yourself, from the regulation that governs it.',
  },

  use: 'Use these values',
  /**
   * The tolerance is supplied by the component.
   *
   * THE WIDTH-AND-DEPTH PARAGRAPH STANDS, and the boundary clause was added
   * beside it rather than in place of it. The two refusals are different: a
   * rectangle inferred from an area is a shape nobody surveyed, and a boundary
   * type written into the form without being confirmed is a mandatory field with
   * a default. Adding boundary readings answers the second only by offering.
   */
  carryOver: (tolerance: string): string =>
    'The plot number, community and stated area carry over, and the podium count waits for you to confirm it on the rules step. The boundary readings carry over as proposals: each one waits for you to apply it, because a boundary type has no default. Width and depth do not carry over: the sheet gives an area, and a rectangle inferred from an area is a plot shape nobody surveyed. ' +
    `Enter the dimensions and the ${tolerance} check will compare them against the area above.`,
};

export type IntakeDictionary = typeof EN;
