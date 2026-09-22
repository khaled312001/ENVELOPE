/**
 * The drawing set, on screen — the words round the sheets, in English.
 *
 * `export type DrawingSetDictionary = typeof EN`; `drawingSet.ar.ts` is held to it.
 *
 * A SHEET IS NOT COPY. Its geometry, its title strip, its notes and its legend are
 * composed by `@envelope/sheets` from the engine's `BuildingModel`, and the same
 * display list is printed in the report and written to the DXF; `pnpm parity`
 * compares the screen with the paper path for path. So the sheet's own number,
 * title, facts and notes render as the sheet states them in both languages, and a
 * reader holding the A3 print sees the same words on the screen. What is here is
 * the toolbar, the tab list's name, the caption and each value's accessible name.
 */

export const EN = {
  stored:
    'This run was computed before drawings were made from the building model, so there is ' +
    'nothing to draw. Compute the run again to see its sheets.',
  none: 'The engine drew no sheets for this run.',
  tabs: 'Sheets in this drawing set',

  zoomGroup: (sheet: string): string => `Zoom, ${sheet}`,
  zoomOut: 'Zoom out',
  zoomIn: 'Zoom in',
  fitted: 'Fitted to width',
  zoomed: (percent: string): string => `${percent}% of fitted`,
  fit: 'Fit to width',
  scroller: (number: string, title: string): string => `${number} ${title}, scrollable`,
  /** The drawing's accessible name. The scale is the sheet's own, passed in whole. */
  drawing: (number: string, title: string, scale: string): string =>
    `${number} ${title}, drawn at ${scale}. The values it quotes are listed below the drawing.`,
  hint:
    'Select a bay, a floor plate or a setback line to see where it came from. Everything the ' +
    'title strip quotes is also listed below.',

  notes: 'Notes on this sheet',
  /** A quoted value's button. The class description is the traced dictionary's. */
  factLabel: (label: string, value: string, description: string, action: string): string =>
    `${label}: ${value}. ${description} ${action}.`,
};

export type DrawingSetDictionary = typeof EN;
