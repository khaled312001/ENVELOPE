/**
 * The plot drawing's words — the ones AROUND the drawing. In English.
 *
 * `export type PlotCanvasDictionary = typeof EN` is the contract `plotCanvas.ar.ts`
 * is held to; no `as const`. Every string was lifted out of `PlotCanvas.tsx`
 * unedited.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS IN HERE: the empty state, the edge-class names, the legend row's words,
 * and the two spoken descriptions — the figure's `aria-label` and each edge's hit
 * target. A screen reader on the Arabic page reads those aloud, so they are copy.
 *
 * WHAT IS NOT: everything inked INSIDE the drawing — the dimension figures, the
 * setback figures, the edge tags, the north letter, the scale caption, the title
 * strip and "NOT FOR CONSTRUCTION". That is the sheet, and a sheet carries its
 * notation in one language the way the A3 set and the DXF do; the legend beside
 * it states every one of those facts again in the reader's language.
 *
 * NO DIGIT. Areas, lengths, setbacks, edge numbers, the edge count and the grid
 * interval are the plot's and the drawing's, and arrive as arguments.
 *
 * `hierarchy` labels the road-hierarchy tokens. English prints the token itself,
 * lower-cased, so it has no table; `null` says "use the token".
 */

export const EN = {
  empty: 'No boundary to draw yet.',

  classes: {
    ROAD: 'Road',
    ADJACENT_PLOT: 'Neighbouring plot',
    OPEN_SPACE: 'Open space',
    OTHER: 'Other',
  },

  hierarchy: null as Readonly<Record<string, string>> | null,

  /** The figure's spoken description, in the order the pieces are joined. */
  figure: {
    lead: (areaM2: string, edgeCount: number): string =>
      `Plot of ${areaM2} square metres with ${edgeCount} edges. `,
    edge: (n: number, label: string, lengthM: string): string =>
      `Edge ${n}, ${label}, ${lengthM} metres`,
    setback: (setbackM: string): string => `, setback ${setbackM} metres`,
    edgeSeparator: '. ',
    footprint: (areaM2: string): string => `. Buildable footprint ${areaM2} square metres.`,
    scale: (gridM: number): string =>
      ` Drawn to a graphic scale, grid north up, grid interval ${gridM} metres.`,
  },

  /** An edge's hit target, spoken. */
  hit: (n: number, label: string, lengthM: string): string =>
    `Edge ${n}: ${label}, ${lengthM} metres`,

  legend: {
    /** The edge number sits after `edge`, its class after `separator`. */
    edge: 'Edge ',
    separator: ' · ',
    setback: 'setback ',
    unresolved: 'setback not yet resolved',
  },
};

export type PlotCanvasDictionary = typeof EN;
