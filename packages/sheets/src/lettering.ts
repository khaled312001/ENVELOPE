/**
 * How tall the lettering on a sheet is, in paper millimetres on A3 — in one place.
 *
 * The audit that set these measured the drawings as printed: bay numbers at
 * 1.6 mm, room and core labels at 1.2 mm, the notes at 2.0 mm. ISO 3098-0's
 * smallest nominal lettering height is 1.8 mm, and drawing-office practice puts
 * notes and labels on an A3 sheet at the next height in the series, 2.5 mm (the
 * reference drawings the client sent are A1, and their smallest body text
 * measures about 2.6 mm). Text below that is a drawing a reader holds up to the
 * light. Those two figures are the basis; no standard is claimed to be met.
 *
 * So, on the ISO 3098 series (1.8, 2.5, 3.5, 5, 7 mm):
 *
 * - **2.5 mm** for anything a reader reads as a statement: notes, legend rows,
 *   labels on the drawing, room names, bay numbers and tags, title-block values.
 * - **1.8 mm at the least** for what a reader looks up rather than reads: the
 *   figures of a dimension string (printed at 2.0), the small captions over a
 *   title-block value, the figures under the scale bar.
 *
 * A label that will not fit at these heights is MOVED or the sheet's scale
 * changes; it is never shrunk below them. `test/lettering.test.ts` holds every
 * text item on every sheet to the floor.
 *
 * WHAT THE FIGURE MEASURES. `sizeMm` is the height the DXF writes as a TEXT
 * entity's height — a CAD text height, which is the height of the capitals —
 * and the font size the SVG and the screen set. An SVG font size is an em, and
 * IBM Plex's capitals are about 0.70 of it, so on the PDF and the screen the
 * capitals of 2.5 mm text stand about 1.75 mm tall. That difference is the
 * renderers', it is not hidden here, and it is the next thing to close: scaling
 * the SVG's font size by 1/0.70 enlarges every label on every sheet by 43%, and
 * the strip and the labels would have to be laid out again around it.
 */
export const LETTERING = {
  /** ISO 3098-0's smallest nominal height. Nothing on a sheet is smaller. */
  minimumMm: 1.8,
  /** Notes, labels, legend rows, room names, bay numbers, title-block values. */
  noteMm: 2.5,
  /** The figures of a dimension string. */
  dimensionMm: 2,
  /** The small captions over a title-block value and under the scale bar. */
  captionMm: 2,
} as const;
