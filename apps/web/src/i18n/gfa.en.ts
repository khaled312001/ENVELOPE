/**
 * The GFA statement — the area table a submission drawing carries — in English.
 *
 * `export type GfaDictionary = typeof EN`; `gfa.ar.ts` is held to it.
 *
 * NO DIGIT. Every figure, every count and every level id is the engine's and is
 * supplied by the component; the helpers here carry the word order around them.
 * "ft²" and "m²" are units, not copy, and stay in the component too.
 *
 * ---------------------------------------------------------------------------
 * FEW WORDS, AND THE SENTENCES ONE CLICK AWAY.
 *
 * The client has said three times that the results must be plain —
 * *«وكذلك فى النتائج تكون سهله واحترافيه مش معقده ومش عاوز شرح وكلام كتير»*. So
 * this dictionary is labels and column heads: there is no explanatory paragraph
 * on the table, and the only prose on the screen is the engine's own — the
 * reconciliation sentences, the NOT ASSESSED reasons and the cap notes, which
 * are English strings off the run and are rendered through `EngineText` rather
 * than written here.
 *
 * They are behind a disclosure and not deleted, which is the line this file
 * walks: "results, not many words" is a request about the FIRST READ. A table
 * that silently dropped the sentence saying the ground floor is counted at a
 * full plate would be easy to read and wrong to act on.
 */

export const EN = {
  title: 'GFA calculation',
  subtitle:
    'What FAR allows on this plot, what this scheme proposes, and the floors that make it up. Open any figure to see how it was reached.',
  /** Screen-reader caption for one allowance's table. */
  caption: (cap: string): string => `${cap}, floor by floor`,

  plotArea: 'Plot area',
  allowed: 'Gross floor area allowed',
  allowedNote: 'FAR × plot area, before the parking question is applied.',
  proposed: 'Total gross floor area proposed',
  remaining: 'Left within the allowance',

  /**
   * The two allowances, by the names his own table gives them. Separate tables,
   * never one: a ground-floor tenancy changes which allowance a level is
   * measured against, and a merged figure cannot say that.
   */
  caps: {
    RESIDENTIAL: 'Residential G.F.A.',
    COMMERCIAL: 'Commercial G.F.A.',
  },
  capAllowed: 'Allowed',
  capProposed: 'Proposed',
  capRemaining: 'Left',

  column: {
    number: 'No.',
    description: 'Description',
    perLevel: 'Area per level',
    area: 'Area',
  },

  rows: {
    GROUND: 'Ground floor',
    PODIUM: 'Podium floors',
    TYPICAL: 'Typical floors',
    UNPLACED: 'Counted, not placed under the height ceiling',
    PARKING: 'Parking, counted toward FAR',
    COMMERCIAL: 'Commercial tenancy',
    ROOF: 'Roof floor',
  },
  /** "× 5" — the count beside the area of one level. */
  times: (count: string): string => `× ${count}`,
  /** Level ids, first to last: "L01 to L05". */
  levelRange: (first: string, last: string): string => `${first} to ${last}`,
  total: 'Total',

  /** The part floor the governing capacity holds above the last whole floor. */
  partFloor: {
    before: 'Whole floors only. The governing capacity is not a whole number of floors; the ',
    after: ' above the last whole floor is not placed, and is not counted here.',
  },

  /** The disclosure the engine's own sentences sit in. */
  notModelled: 'What this table does not model',
};

export type GfaDictionary = typeof EN;
