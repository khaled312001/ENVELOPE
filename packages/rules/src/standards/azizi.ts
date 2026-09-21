/**
 * Azizi Developments, as their own documents state it.
 *
 * Transcribed from three PDFs the client supplied on 30 Aug 2026:
 *
 * - `250617_UNIT AREAS, AMENITIES, ELECTRICAL LOADS AND WHITE GOODS`, Rev 00,
 *   21 May 2025 — the general standard that applies to every Azizi project.
 * - `Annexure A – Project Brief_ 178`, Rev 00, 11 July 2025 — plot 5180178.
 * - `Annexure A – Project Brief_ 196`, Rev 00 — plot 5180196.
 *
 * Every number below carries the page and the box it was read from, and the
 * verbatim text beside it, so a reviewer can open the PDF and check the
 * transcription rather than trust it. That is not ceremony: the tables in these
 * documents are laid out right-to-left in the content stream, so a naive text
 * extraction reads the podium column as the tower one and silently swaps a
 * 340 ft² studio cap for a 500 ft² one. The columns here were resolved by
 * x-coordinate against the header positions, and the bounding boxes are the
 * evidence.
 *
 * **What is not here.** The balcony strategy book, the numbering standard, the
 * white-goods schedule and the electrical loads are all in
 * `docs/00-source/developer-standards/azizi/` and none of them is encoded. They
 * govern things this engine does not produce — a unit layout, a socket count —
 * and encoding them would be theatre. `notMechanized` says so out loud.
 */

import type { Citation } from '@envelope/core';

import type { DeveloperStandard, ProjectBrief } from './types.js';

const STANDARD_URI =
  'docs/00-source/developer-standards/azizi/250617_UNIT AREAS, AMENITIES,.pdf';
const BRIEF_178_URI =
  'docs/00-source/developer-standards/azizi/Annexure A- Project Brief_ 178.pdf';
const BRIEF_196_URI =
  'docs/00-source/developer-standards/azizi/Annexure A- Project Brief_ 196.pdf';

const AZIZI_STANDARD = 'AZIZI/360-GEN-ENG-27-251030';
const REV = 'Rev 00, 21 May 2025';

/** Cite a box on a page of the general standard. */
function std(
  clause: string,
  page: number,
  bbox: readonly [number, number, number, number],
  verbatim: string,
): Citation {
  return {
    instrumentId: AZIZI_STANDARD,
    instrumentVersion: REV,
    clauseReference: clause,
    documentUri: STANDARD_URI,
    sourcePage: page,
    sourceBbox: bbox,
    sourceTextVerbatim: verbatim,
  };
}

/** Cite a box on a page of one project brief. */
function brief(
  uri: string,
  instrumentId: string,
  clause: string,
  page: number,
  bbox: readonly [number, number, number, number],
  verbatim: string,
): Citation {
  return {
    instrumentId,
    instrumentVersion: 'Rev 00, 11 July 2025',
    clauseReference: clause,
    documentUri: uri,
    sourcePage: page,
    sourceBbox: bbox,
    sourceTextVerbatim: verbatim,
  };
}

// ---------------------------------------------------------------------------
// The general standard
// ---------------------------------------------------------------------------

const UNIT_AREAS_TABLE = std(
  'Unit Areas — Summary',
  3,
  [148, 88, 660, 262],
  'Unit Type / Tower / Podium / Remarks. Max — Maximum means no unit to cross ' +
    'this area Strictly',
);

export const AZIZI_RESIDENTIAL: DeveloperStandard = {
  standardId: 'AZIZI-RESIDENTIAL-2025',
  developer: 'Azizi Developments',
  title: 'Unit areas, amenities, electrical loads and white goods',
  citation: UNIT_AREAS_TABLE,

  unitAreas: [
    {
      typeId: 'STUDIO',
      label: 'Studio',
      position: 'TOWER',
      variants: [{ maxAreaFt2: '340', shareOfType: '1' }],
      citation: std('Unit Areas — Studio, Tower', 3, [253.9, 125.1, 271.6, 137.0], '340 ft2 (Max)'),
    },
    {
      typeId: 'STUDIO',
      label: 'Studio',
      position: 'PODIUM',
      variants: [
        {
          maxAreaFt2: '500',
          shareOfType: '1',
          note:
            'Studios are not preferred on podium floors. Provided only on worst-case ' +
            'scenarios where height restrictions apply to typical floors and MEP ' +
            'services cannot be rerouted.',
        },
      ],
      citation: std('Unit Areas — Studio, Podium', 3, [378.6, 125.1, 396.3, 137.0], '500 ft2 (Max)'),
    },
    {
      typeId: '1BED',
      label: '1 bedroom',
      position: 'TOWER',
      variants: [
        { maxAreaFt2: '650', shareOfType: '0.8', note: '650 is for 1-bedroom with one toilet.' },
        {
          maxAreaFt2: '680',
          shareOfType: '0.2',
          note: '680 is for 1-bedroom with 1.5 toilet. One toilet and one powder room.',
        },
      ],
      citation: std('Unit Areas — 1-Bedroom, Tower', 3, [232.1, 145.0, 310.7, 156.9], '650 ft2 ** / 680 ft2 ***, 80% units / 20% units'),
    },
    {
      typeId: '1BED',
      label: '1 bedroom',
      position: 'PODIUM',
      variants: [
        { maxAreaFt2: '900', shareOfType: '0.8' },
        { maxAreaFt2: '930', shareOfType: '0.2' },
      ],
      citation: std('Unit Areas — 1-Bedroom, Podium', 3, [356.8, 145.0, 435.4, 156.9], '900 ft2 ** / 930 ft2 ***, 80% units / 20% units'),
    },
    {
      typeId: '2BED',
      label: '2 bedroom',
      position: 'TOWER',
      variants: [
        { maxAreaFt2: '1150', shareOfType: '0.3' },
        { maxAreaFt2: '850', shareOfType: '0.7' },
      ],
      citation: std('Unit Areas — 2-Bedroom, Tower', 3, [234.7, 187.5, 317.8, 199.4], '1150 ft2 / 850 ft2, 30% units / 70% units'),
    },
    {
      typeId: '2BED',
      label: '2 bedroom',
      position: 'PODIUM',
      variants: [
        { maxAreaFt2: '1400', shareOfType: '0.3' },
        { maxAreaFt2: '950', shareOfType: '0.7' },
      ],
      citation: std('Unit Areas — 2-Bedroom, Podium', 3, [359.4, 187.5, 442.5, 199.4], '1400 ft2 / 950 ft2, 30% units / 70% units'),
    },
    {
      typeId: '3BED',
      label: '3 bedroom',
      position: 'TOWER',
      variants: [
        { maxAreaFt2: '1450', shareOfType: '0.3' },
        { maxAreaFt2: '1000', shareOfType: '0.7' },
      ],
      citation: std('Unit Areas — 3-Bedroom, Tower', 3, [234.7, 229.4, 320.7, 241.3], '1450 ft2 / 1000 ft2, 30% units / 70% units'),
    },
    {
      typeId: '3BED',
      label: '3 bedroom',
      position: 'PODIUM',
      variants: [
        { maxAreaFt2: '1800', shareOfType: '0.3' },
        { maxAreaFt2: '1100', shareOfType: '0.7' },
      ],
      citation: std('Unit Areas — 3-Bedroom, Podium', 3, [359.4, 229.4, 445.4, 241.3], '1800 ft2 / 1100 ft2, 30% units / 70% units'),
    },
  ],

  scenarios: [
    {
      scenarioId: 'AZIZI-BEST',
      label: 'Best case — the mix Azizi prices for',
      entries: [
        { typeId: 'STUDIO', share: '0.80' },
        { typeId: '1BED', share: '0.18' },
        { typeId: '2BED', share: '0.02' },
      ],
      citation: std('Unit Mix — Best Case Scenario', 3, [230, 296, 360, 460], 'Studio 80-85 %, 1-Bedroom 18 %, 2-Bedroom 2%, 3-Bedroom Nil'),
      rangeNote:
        'The document states 80-85% for studios against 18% and 2% for the other ' +
        'two types. Only the low end totals 100%, so 80% is used. The choice is ' +
        'the arithmetic the document implies, but it is still a choice.',
    },
    {
      scenarioId: 'AZIZI-WORST',
      label: 'Worst case — the mix the standard falls back to',
      entries: [
        { typeId: 'STUDIO', share: '0.70' },
        { typeId: '1BED', share: '0.25' },
        { typeId: '2BED', share: '0.03' },
        { typeId: '3BED', share: '0.02' },
      ],
      citation: std('Unit Mix — Worst Case Scenario', 3, [55, 296, 200, 460], 'Studio 70%, 1-Bedroom 25%, 2-Bedroom 3%, 3-Bedroom 2%'),
    },
  ],

  targets: {
    saleableEfficiencyMin: {
      value: '0.93',
      citation: std('Efficiency Guidance and Targets — SA / GFA', 3, [449.0, 442.7, 480.8, 450.8], 'Expected 93%-97%'),
      note:
        'Saleable area over GFA. The engine used to assume 1.00 here without ' +
        'saying so, which overstated the unit count on every run.',
    },
    saleableEfficiencyMax: {
      value: '0.97',
      citation: std('Efficiency Guidance and Targets — SA / GFA', 3, [449.0, 442.7, 480.8, 450.8], 'Expected 93%-97%'),
    },
    balconyShareTarget: {
      value: '0.20',
      citation: brief(BRIEF_178_URI, 'AZIZI/360-1162-ENG-24-251527', '4.1 Efficiency Guidance and Targets, item 4', 7, [173.4, 524.5, 279.4, 535.6], 'Balcony to be 20% of the total sellable area of the unit'),
    },
    balconyShareMax: {
      value: '0.25',
      citation: brief(BRIEF_178_URI, 'AZIZI/360-1162-ENG-24-251527', '4.1 Efficiency Guidance and Targets, item 4', 7, [173.4, 524.5, 360.0, 535.6], 'limited to not more than 25%, unless justified for elevation reasons'),
    },
    parkingAreaPerBayM2: {
      value: '37.5',
      citation: brief(BRIEF_178_URI, 'AZIZI/360-1162-ENG-24-251527', '4.1 Efficiency Guidance and Targets, item 5', 7, [310.9, 551.0, 380.9, 562.1], 'Car park minimum efficiency should achieve: 37.5 m2 per car with no shortage'),
      note:
        'A target the layout is measured against, not a rule it is bound by. The ' +
        'engine reports the area per bay it actually achieved; a level that comes ' +
        'in above 37.5 is a finding for the designer, not a violation.',
    },
    parkingOverage: {
      value: '0.05',
      citation: brief(BRIEF_178_URI, 'AZIZI/360-1162-ENG-24-251527', '4.1 Efficiency Guidance and Targets, item 6', 7, [198.9, 564.2, 360.6, 575.3], 'Parking count to be 5% more than the minimum required.'),
      note:
        'A developer overage above the code minimum. It reduces the units the ' +
        'parking can carry, so applying it is conservative — and not applying it ' +
        'silently would report a scheme this client would not build.',
    },
    amenityShareMin: {
      value: '0.025',
      citation: brief(BRIEF_178_URI, 'AZIZI/360-1162-ENG-24-251527', '4.2 Amenities', 8, [120.3, 103.2, 230.1, 114.3], 'Allow up to 3% of GFA for Amenities (with the minimum being 2.5%)'),
    },
    amenityShareMax: {
      value: '0.03',
      citation: brief(BRIEF_178_URI, 'AZIZI/360-1162-ENG-24-251527', '4.2 Amenities', 8, [120.3, 103.2, 230.1, 114.3], 'Allow up to 3% of GFA for Amenities (with the minimum being 2.5%)'),
    },
    retailGroundFloorShare: {
      value: '0.60',
      citation: brief(BRIEF_178_URI, 'AZIZI/360-1162-ENG-24-251527', 'General Notes (2)', 7, [110.5, 335.1, 260.5, 346.2], '60% of Ground floor Built-up Area (BUA) / Site Area post Allowable Setbacks'),
      note:
        'Whichever applies: the authority allowable limit, or this share. The ' +
        'engine does not choose between them — it has no retail land-use rule ' +
        'encoded, so this is carried as a target and not applied.',
    },
  },

  notMechanized: [
    'Balcony area (20% of sellable, capped at 25%) is not modelled. This engine ' +
      'produces no unit layouts, so it has no balcony to measure.',
    'The amenity allowance of 2.5-3% of GFA is carried as a target and is not ' +
      'deducted from capacity: which levels host it, and whether it sits inside ' +
      'GFA at all, depends on the authority definition this run has not resolved.',
    'Ground-floor retail at 60% of built-up area is not applied. It needs a ' +
      'retail land-use rule and an authority limit to compare against, neither ' +
      'of which is encoded.',
    '"Avoid internal corridors" and "common terraces are discouraged" are design ' +
      'directives with no numeric form. They are reported, never scored.',
    'The white-goods schedule, the electrical loads and the unit-numbering ' +
      'standard govern outputs this engine does not produce.',
  ],
};

// ---------------------------------------------------------------------------
// Project briefs
// ---------------------------------------------------------------------------

/**
 * Plot 5180178 — the sheet that omits its own limits, answered.
 *
 * `packages/intake` reads `DJAZ1MED12RES011` and reports no FAR, no GFA, no
 * setback and no coverage; `blockingGaps()` stops the run. This brief prints
 * `FAR 5` and `Total GFA 11,829.35 sqm` for the same plot, and 5 × 2,365.87 is
 * 11,829.35 exactly — the two documents agree, and the second one is the reason
 * the plot can be computed at all.
 *
 * It is a *different instrument*, issued by the developer's consultant rather
 * than by the authority, and every value taken from it is marked as such. A FAR
 * from a project brief and a FAR from an affection plan are not the same claim.
 */
export const BRIEF_DJAZ1MED12RES011: ProjectBrief = {
  briefId: 'AZIZI-BRIEF-5180178',
  plotNumber: '5180178',
  standardId: 'AZIZI-RESIDENTIAL-2025',
  citation: brief(BRIEF_178_URI, 'AZIZI/360-1162-ENG-24-251527', 'Table 1 Plot Information Summary', 6, [95, 160, 500, 185], 'Plot Number 5180178, Plot Area 2,365.87 sqm, Total GFA 11,829.35 Sqm, Height G+11, FAR 5, Mixed Use (Residential with Retail)'),
  plotAreaM2: {
    value: '2365.87',
    citation: brief(BRIEF_178_URI, 'AZIZI/360-1162-ENG-24-251527', 'Table 1 — Plot Area', 6, [178.9, 169.1, 217.6, 180.2], '2,365.87'),
  },
  gfaM2: {
    value: '11829.35',
    citation: brief(BRIEF_178_URI, 'AZIZI/360-1162-ENG-24-251527', 'Table 1 — Total GFA', 6, [257.0, 169.1, 301.4, 180.2], '11,829.35'),
  },
  far: {
    value: '5',
    citation: brief(BRIEF_178_URI, 'AZIZI/360-1162-ENG-24-251527', 'Table 1 — FAR', 6, [360, 169.1, 400, 180.2], '5'),
    note:
      'The affection plan for this plot prints no FAR at all. This is the only ' +
      'instrument in the file that states one, and it is a developer brief rather ' +
      'than an authority document.',
  },
  heightCode: {
    value: 'G+11',
    citation: brief(BRIEF_178_URI, 'AZIZI/360-1162-ENG-24-251527', 'Table 1 — Height', 6, [330.7, 169.1, 355.4, 180.2], 'G+11'),
  },
  landUse: {
    value: 'Mixed Use (Residential with Retail)',
    citation: brief(BRIEF_178_URI, 'AZIZI/360-1162-ENG-24-251527', 'Table 1 — Use', 6, [410, 169.1, 520, 185], 'Mixed Use (Residential with Retail)'),
  },
  scenarios: [
    {
      scenarioId: 'BRIEF-178-BEST',
      label: 'Best case for this plot — studios only',
      entries: [{ typeId: 'STUDIO', share: '1' }],
      citation: brief(BRIEF_178_URI, 'AZIZI/360-1162-ENG-24-251527', 'Table 3 Best and Worst Case Scenarios', 6, [265.9, 403.4, 420, 455], 'Best Case Scenario: Studio 100 %, 1-Bedroom 0%'),
    },
    {
      scenarioId: 'BRIEF-178-WORST',
      label: 'Worst case for this plot',
      entries: [
        { typeId: 'STUDIO', share: '0.9' },
        { typeId: '1BED', share: '0.1' },
      ],
      citation: brief(BRIEF_178_URI, 'AZIZI/360-1162-ENG-24-251527', 'Table 3 Best and Worst Case Scenarios', 6, [265.9, 490, 420, 556], 'Worst Case Scenario: Studio 90%, 1-Bedroom 10%'),
    },
  ],
  notMechanized: [
    'The brief narrows the standard mix to studios and one-bedrooms only. The ' +
      'wider mix in the general standard does not apply to this plot.',
  ],
};

/** Plot 5180196 — the Jabal Ali sheet, whose own numbers the brief repeats. */
export const BRIEF_DJAZ1TRE10RES022: ProjectBrief = {
  briefId: 'AZIZI-BRIEF-5180196',
  plotNumber: '5180196',
  standardId: 'AZIZI-RESIDENTIAL-2025',
  citation: brief(BRIEF_196_URI, 'AZIZI/360-1163-ENG-24', 'Table 1 Plot Information Summary', 6, [95, 162, 500, 188], 'Plot Number 5180196, Plot Area 1,740.56 sqm, Total GFA 8,796.46 Sqm, Height G+3P+6, FAR 5.05'),
  plotAreaM2: {
    value: '1740.56',
    citation: brief(BRIEF_196_URI, 'AZIZI/360-1163-ENG-24', 'Table 1 — Plot Area', 6, [175.2, 171.6, 214.0, 182.7], '1,740.56'),
  },
  gfaM2: {
    value: '8796.46',
    citation: brief(BRIEF_196_URI, 'AZIZI/360-1163-ENG-24', 'Table 1 — Total GFA', 6, [249.2, 171.6, 287.9, 182.7], '8,796.46'),
    note:
      'The printed FAR does not reproduce this: 5.05 × 1,740.56 = 8,789.83, which ' +
      'is 6.63 m² short. The true ratio is 5.0538 and the document prints it ' +
      'rounded to two decimals. The GFA is the number the developer priced; the ' +
      'FAR is a rounded description of it, and re-multiplying the rounded FAR ' +
      'under-reports on every plot whose ratio does not divide evenly.',
  },
  far: {
    value: '5.05',
    citation: brief(BRIEF_196_URI, 'AZIZI/360-1163-ENG-24', 'Table 1 — FAR', 6, [372.3, 171.6, 391.6, 182.7], '5.05'),
    note:
      'This one agrees with the affection plan, which prints the same FAR and the ' +
      'same GFA. Two independent instruments stating the same number is the ' +
      'cheapest corroboration available, and it is worth recording that it held.',
  },
  heightCode: {
    value: 'G+3P+6',
    citation: brief(BRIEF_196_URI, 'AZIZI/360-1163-ENG-24', 'Table 1 — Height', 6, [310.1, 171.6, 347.4, 182.7], 'G+3P+6'),
  },
  landUse: {
    value: 'Mixed Use (Residential with Retail)',
    citation: brief(BRIEF_196_URI, 'AZIZI/360-1163-ENG-24', 'Table 1 — Use', 6, [400, 171.6, 520, 188], 'Mixed Use (Residential with Retail)'),
  },
  scenarios: [
    {
      scenarioId: 'BRIEF-196-BEST',
      label: 'Best case for this plot — studios only',
      entries: [{ typeId: 'STUDIO', share: '1' }],
      citation: brief(BRIEF_196_URI, 'AZIZI/360-1163-ENG-24', 'Table 3 Best and Worst Case Scenarios', 6, [265, 405, 420, 458], 'Best Case Scenario: Studio 100 %, 1-Bedroom 0%'),
    },
    {
      scenarioId: 'BRIEF-196-WORST',
      label: 'Worst case for this plot',
      entries: [
        { typeId: 'STUDIO', share: '0.9' },
        { typeId: '1BED', share: '0.1' },
      ],
      citation: brief(BRIEF_196_URI, 'AZIZI/360-1163-ENG-24', 'Table 3 Best and Worst Case Scenarios', 6, [265, 492, 420, 558], 'Worst Case Scenario: Studio 90%, 1-Bedroom 10%'),
    },
  ],
  notMechanized: [],
};

export const DEVELOPER_STANDARDS: readonly DeveloperStandard[] = [AZIZI_RESIDENTIAL];

export const PROJECT_BRIEFS: readonly ProjectBrief[] = [
  BRIEF_DJAZ1MED12RES011,
  BRIEF_DJAZ1TRE10RES022,
];
