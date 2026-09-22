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

  blocked: {
    title: 'This sheet cannot drive a capacity run.',
    /** The labels of the missing limits sit between these, as `packages/intake` names them. */
    before: ' It omits ',
    labelSeparator: ', ',
    after:
      '. Those are not values this engine will supply — a limit borrowed from a neighbouring plot is the precise mistake this product exists to prevent. You can still create the plot and enter the limits from the governing regulation yourself.',
  },

  use: 'Use these values',
  /** The tolerance is supplied by the component. */
  carryOver: (tolerance: string): string =>
    'The plot number, community and stated area carry over, and the podium count waits for you to confirm it on the rules step. Width and depth do not carry over: the sheet gives an area, and a rectangle inferred from an area is a plot shape nobody surveyed. ' +
    `Enter the dimensions and the ${tolerance} check will compare them against the area above.`,
};

export type IntakeDictionary = typeof EN;
