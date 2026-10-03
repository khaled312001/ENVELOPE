/**
 * The GFA statement — the area table a submission drawing carries — in English.
 *
 * `export type GfaDictionary = typeof EN`; `gfa.ar.ts` is held to it.
 *
 * NO DIGIT. Every figure, every count and every level id is the engine's and is
 * supplied by the component; the helpers here carry the word order around them.
 * "ft²" and "m²" are units, not copy, and stay in the component too.
 */

export const EN = {
  title: 'GFA calculation',
  subtitle:
    'The area table a submission drawing carries: what FAR allows on this plot, what this scheme proposes, and the floors that make it up. Every area is the engine’s — open one to see how it was reached.',
  caption: 'Gross floor area proposed, floor by floor',

  plotArea: 'Plot area',
  allowed: 'Gross floor area allowed',
  allowedNote: 'FAR × plot area, before the parking question is applied.',
  proposed: 'Total gross floor area proposed',

  column: {
    number: 'No.',
    description: 'Description',
    perLevel: 'Area per level',
    area: 'Area',
  },

  rows: {
    RESIDENTIAL: 'Residential floors',
    PARKING: 'Parking, counted toward FAR',
  },
  /** "× 5" — the count beside the area of one level. */
  times: (count: string): string => `× ${count}`,
  /** Level ids, first to last: "L01 to L05". */
  levelRange: (first: string, last: string): string => `${first} to ${last}`,
  total: 'Total',

  remaining: 'Left within the allowance',
  /** The part floor the governing capacity holds above the last whole floor. */
  partFloor: {
    before: 'Whole floors only. The governing capacity is not a whole number of floors; the ',
    after: ' above the last whole floor is not placed, and is not counted here.',
  },
  noCommercial:
    'There is no commercial table: this engine places no commercial area, and a table of zeros would state a decision nobody made.',
};

export type GfaDictionary = typeof EN;
