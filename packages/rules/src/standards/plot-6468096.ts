/**
 * Plot 6468096's project brief, as its own pages state it (17 Oct 2026).
 *
 * The plot's affection plan — the DDA unified site plan, `COA-CPT2-6468096-Z6-04`
 * — prints "SEE NOTES" against its GFA, its height, its setbacks and its
 * coverage, and its one note says an approved master plan is required. So
 * `blockingGaps()` stops the run, correctly. The project brief for the same plot
 * prints a plot area and a total GFA, and that is the second instrument a reader
 * may choose to apply where the sheet is silent — offered, never pre-selected,
 * and marked as a developer's document wherever a figure from it lands.
 *
 * Read from `docs/00-source/samples/rfp/Annexure A- Project Brief -
 * CPT2-6468096-Z6-04.pdf` by position, the same way the other two briefs were.
 * Boxes are `[x0, top, x1, bottom]` in PDF points with y measured DOWN from the
 * top of the page, the convention of the two briefs already on file, and
 * `apps/api/test/brief-6468096.test.ts` re-reads every box from the PDF and
 * requires the quoted figure inside it.
 *
 * WHAT THIS BRIEF DOES NOT PRINT, AND WHAT IS THEREFORE NOT HERE:
 *
 * - **No FAR.** `far` is absent rather than filled with GFA ÷ area: a quotient
 *   under the brief's citation would be a figure the brief does not print. The
 *   run's ratio is that quotient anyway (`rulesFromBrief`), and its clause says
 *   the brief prints no FAR to check it against.
 * - **No plot area in square metres.** The brief prints 48,075 ft². The value
 *   below is that figure × 0.09290304, which is exact by the definition of the
 *   foot; the note says so, and the verbatim text keeps the printed ft².
 * - **No height limit for this plot.** "The building heights range up to
 *   G+5P+45" is a ceiling, written of "all the above plots" — and the list above
 *   it (p3, "Plot no - 6468096-Z6-04") holds this plot and no other, so it is
 *   NOT a figure meant for some other parcel; an earlier draft of this note said
 *   it was, and the test now reads the list off the page. It is recorded as
 *   printed and binds nothing, because a brief supplies only its GFA in this
 *   study (`rulesFromBrief`), and the run's height gap stays open: whether this
 *   ceiling may stand as the plot's height limit is the client's question.
 *
 * Its own mix scenario is not encoded either. The brief's mix (studio 70%,
 * one-bed 25%, two-bed 3%, three-bed 2%) is the general standard's worst case
 * share for share, which the standards endpoint already offers for this plot;
 * its unit SIZES are not that standard's maxima, and resolving its mix against
 * those maxima would quote areas this brief does not state.
 */

import type { Citation } from '@envelope/core';

import type { ProjectBrief } from './types.js';

const URI = 'docs/00-source/samples/rfp/Annexure A- Project Brief - CPT2-6468096-Z6-04.pdf';
/** The brief's own reference for the plot, which is also the request's. */
const INSTRUMENT = 'PROJECT-BRIEF/CPT2-6468096-Z6-04';
const VERSION = 'Revision 00, March 2025';

/** Cite a box on a page of this brief. */
function at(
  clause: string,
  page: number,
  bbox: readonly [number, number, number, number],
  verbatim: string,
): Citation {
  return {
    instrumentId: INSTRUMENT,
    instrumentVersion: VERSION,
    clauseReference: clause,
    documentUri: URI,
    sourcePage: page,
    sourceBbox: bbox,
    sourceTextVerbatim: verbatim,
  };
}

/**
 * Everything but the developer standard it is filed under.
 *
 * That one field is set where the standard is defined (`PROJECT_BRIEFS`), so
 * this transcription carries no party's name in any of its strings — the brief
 * is confidential, and its figures are what the engine needs, not its parties.
 */
export const BRIEF_PLOT_6468096: Omit<ProjectBrief, 'standardId'> = {
  briefId: 'BRIEF-6468096',
  plotNumber: '6468096',
  citation: at(
    '2 Project Programme, table 1',
    5,
    [48.0, 178.0, 462.9, 214.6],
    'Plot No. 6468096-Z6-04, Plot Area ft² 48,075, GFA (m²) 21,604.61, GFA (ft²) 232,552',
  ),
  plotAreaM2: {
    value: '4466.313648',
    citation: at('2 Project Programme, table 1 — Plot Area ft²', 5, [154.7, 178.0, 198.5, 214.5], '48,075'),
    note:
      'The brief prints the plot area in square feet only: 48,075 ft² × 0.09290304 (exact, by the ' +
      'definition of the foot) = 4,466.313648 m². The plot’s affection plan prints 4,466.35 m²; a ' +
      'figure rounded to the whole square foot can differ from it by up to 0.046 m², and this one ' +
      'differs by 0.036 m².',
  },
  gfaM2: {
    value: '21604.61',
    citation: at('2 Project Programme, table 1 — GFA (m²)', 5, [241.3, 204.5, 285.6, 214.5], '21,604.61'),
    note:
      'The brief also prints 232,552 ft², and the two do not quite agree: 21,604.61 m² is ' +
      '232,550.09 ft², and 232,552 ft² is 21,604.79 m², 0.18 m² more. The square-metre figure is ' +
      'the one taken, as printed, and the difference is said rather than resolved. Under the ' +
      'table the brief says "25% tolerance in GFA could be considered, so GFA ' +
      'swapping is possible between plots": the figure is the one the brief states, not a fixed ' +
      'allowance. It defines GFA "as defined by DDA Regulations" (section 1.1).',
  },
  heightCode: {
    value: 'G+5P+45',
    citation: at(
      'Section 01, Plot Details',
      3,
      [42.6, 733.3, 510.4, 757.8],
      'All the above plots are designated for high-density developments, featuring a diverse mix of ' +
        'apartment types. The building heights range up to G+5P+45 stories.',
    ),
    note:
      'Printed as a ceiling ("range up to") for the plots the request lists, and it lists only this ' +
      'one. A brief supplies only its GFA in this study, so this binds nothing here: the run’s height ' +
      'stays open until the affection plan’s master plan states it, or the client says this ceiling ' +
      'may stand for it.',
  },
  landUse: {
    value: 'Residential, with retail on the ground floor',
    citation: at(
      'Project Brief a. and b.',
      3,
      [92.3, 96.7, 361.2, 121.2],
      'All the plots shall be designed as complete Residential. Ground Floor to have Retail allocation, maximum possible',
    ),
  },
  levels: {
    value: '3 basements, ground and 5 podium levels (max)',
    citation: at(
      '3 Project Considerations, 1.0 item 10',
      6,
      [132.4, 320.1, 545.7, 353.1],
      'This Unit Mix combination is to be worked out with 3 Basements, Ground and 5 podium levels max ' +
        'or the nearest unit mix based on parking achievable within the 3 Bs and 5 Ps of parking, ' +
        'keeping studios and 1 bed as MAJOR SHARE.',
    ),
    note: 'Information for the reader. The run’s levels are entered on the rules step; nothing is filled from this.',
  },
  scenarios: [],
  notMechanized: [
    'The brief prints no FAR. The study’s ratio is the brief’s GFA ÷ its plot area, and there is no ' +
      'printed ratio to check it against.',
    'The brief’s height, "up to G+5P+45", is a ceiling, not a limit this study binds from a brief, ' +
      'and is not applied. Whether it may stand as this plot’s height limit is an open question.',
    'Sellable area of at least 100% of GFA (section 3, 1.0 item 5), a basement car park of at least ' +
      '37.5 m² per car (item 6), parking on up to 5 levels above the ground (item 7), 6 m retail on ' +
      'the ground floor (item 11) and 3% of GFA for amenities (1.1) are the brief’s targets. None is ' +
      'applied by this study.',
    'The brief’s unit sizes (studio 320 ft², one-bed 550 to 650, two-bed 1,100, three-bed 1,400) are ' +
      'not encoded as a mix. Its shares are the general standard’s worst case, which is offered with ' +
      'that standard’s own maxima as the areas.',
  ],
};
