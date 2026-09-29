/**
 * `/parking` — how the parking number is made, in English.
 *
 * `export type ParkingDictionary = typeof EN`, so this module IS the contract and
 * `parking.ar.ts` is held to it: a missing Arabic key, a misspelled one or a key
 * nobody removed from either side is a COMPILE ERROR rather than a sentence that
 * silently renders in the wrong language. NOTE THE ABSENCE OF `as const` — with it
 * every value would narrow to its own literal and the Arabic could satisfy the shape
 * only by repeating the English.
 *
 * Every string below was lifted out of `Parking.tsx` unchanged, and the English
 * render is held byte-identical to the one before the move. The page argues about a
 * single sentence it may never write; a translation pass that reworded the English
 * on the way past would be the cheapest place to write it.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS NOT IN HERE, AND WHY EACH ABSENCE IS THE POINT.
 *
 * 1. NO FIGURE. Every number on this page comes from `worked-example.json` — the
 *    bay count, the factor, the band, the dimensions, the spread. The helpers below
 *    (`bayMeta`, `rampMeta`, `summary`, `modelLabel`, `drawingLabel`,
 *    `governingNote`, `provenanceNote`) take their figures as arguments because they
 *    carry the WORD ORDER, which differs between the two languages, and never the
 *    value. The two
 *    digits that do appear are inside NAMES rather than quantities — `Phase 0` is
 *    what the product's phase is called (`chrome.ar.ts` carries «المرحلة 0» for the
 *    same reason) and `3D` is what the view is called — and neither counts anything.
 *
 * 2. NO ENGINE STRING. The bay-area-factor basis, the usable-fraction basis, the
 *    band formula, the access rationales and refusal reasons, the not-assessed
 *    residue, the layout refusal, the parking-in-FAR verdict, the band and class
 *    tokens, the plot number and community, the level ids and every unit the engine
 *    put on a traced value stay in the component and are rendered as the engine
 *    emitted them. `docs/05-design/arabic-glossary.md` §1 carries the argument: a
 *    basis string is a record of why a number was assumed, and a translated record
 *    is a second record nobody issued. The quotation in §3 stays too: it is the
 *    engine's own note, and a translation would put words in its mouth.
 *
 * 3. NO SHARED PARAGRAPH. The optimiser refusal renders here and on `/refusals`, so
 *    it is read from `content/shared.tsx` and its twin in `shared.ar.tsx`, never
 *    restated. A refusal written twice is a refusal that says two things after the
 *    first design pass.
 *
 * 4. NO DRAWN TEXT. The road labels and dimension figures inside the two SVGs are
 *    part of the drawing, in the drawing's own coordinates and vocabulary, and stay
 *    as they are in both languages. The drawings' accessible NAMES are copy and are
 *    here, because a screen reader reads them as sentences.
 *
 * ---------------------------------------------------------------------------
 * WHY SOME STRINGS CARRY A LEADING OR TRAILING SPACE, OR ARE EMPTY.
 *
 * Several sentences wrap a figure or a token the engine issued — «Frontage 0 · local
 * road · 6.00 m wide». The value may not be translated and it does not sit at the
 * same word in an Arabic sentence, so the prose is split into the part BEFORE it and
 * the part AFTER it. English puts "road" after the hierarchy and Arabic puts «طريق»
 * before it, so English has an empty `roadBefore` and Arabic fills it. The spaces
 * belong to the strings because they belong to the sentence.
 */

import type { ReactNode } from 'react';

/** The figures the level drawing's accessible name is built around, all from the run. */
export interface LevelSummary {
  readonly bays: string;
  readonly bayWidth: string;
  readonly bayLength: string;
  readonly aisleWidth: string;
  readonly packWidth: string;
  readonly packDepth: string;
  readonly accessWidth: string;
  readonly frontage: string;
}

export const EN = {
  /**
   * Wire tokens, made readable. The TOKEN is the engine's and is never translated;
   * this is what the interface calls it, which is copy — the same split the glossary
   * draws between `ASSUMED` and «مُفترَض». Each English value is exactly what the
   * old `token.toLowerCase().replace(/_/g, ' ')` produced, and the component still
   * falls back to that for a token neither dictionary knows. `DEG_90` → `90°` is
   * formatting, not language, and stays in the component.
   */
  tokens: {
    PARALLEL: 'parallel',
    ONE_WAY: 'one way',
    TWO_WAY: 'two way',
    ROAD: 'road',
    ADJACENT_PLOT: 'adjacent plot',
    OPEN_SPACE: 'open space',
    OTHER: 'other',
    ARTERIAL: 'arterial',
    COLLECTOR: 'collector',
    LOCAL: 'local',
    ACCESS: 'access',
  } as Readonly<Record<string, string>>,

  /** The legend's rows. A kind with no label here falls back to its token. */
  kinds: {
    BAY: 'Bay',
    AISLE: 'Drive aisle',
    RAMP: 'Ramp',
  } as Readonly<Record<string, string>>,

  /**
   * The ASSUMED treatment's words. Channel 4 of §13.1 is the class announced as
   * TEXT, so it survives greyscale and a screen reader; channel 5 is the tally.
   */
  assumed: {
    spoken: ' — assumed',
    tally: 'assumed here',
    tallyNone: 'nothing assumed here',
  },

  /** The deferred chip. The absence of an act, never a verdict. */
  notAssessed: 'Not assessed',

  /** The factor's name, as it heads both amber callouts. */
  factorName: 'Gross area per bay —',

  /** §1 — the claim, and the evidence standing beside it. */
  opening: {
    eyebrow: 'Phase 0 · the parking band',
    title: 'The number that governs this plot rests on an assumption.',
    lede:
      'Here is the assumption, with the basis it was recorded against. Then the level ' +
      'is drawn — bay by bay, aisle and ramp, inside the podium the setbacks left — ' +
      'and this page reports what the drawing costs against what the assumption ' +
      'predicted. The gap is the argument, not the embarrassment.',
    evidenceLabel: 'The governing figure, and the assumption it rests on',
    governingLabel: 'Governing capacity, this run',
    /** The band token is the run's, and it is the argument: R10, templated never typed. */
    governingNote: (band: string): ReactNode =>
      `The ${band} band — the smallest of the three, so it governs.`,
    restsOn: 'It rests on',
  },

  /** §2 — the six links, in the order the engine computes them. */
  chain: {
    title: 'Where the governing number comes from',
    lede:
      'Six links, in the order the engine computes them. The fourth is a division, and ' +
      'its divisor is an assumption with a written basis and a measured sensitivity ' +
      'rather than a constant. Everything below this section is downstream of it.',
    mix: {
      name: 'Bays per unit, from the mix',
      note:
        'The declared unit mix sets how many bays each unit owes. It is the demand side ' +
        'of the model and it is fixed before any area is divided.',
    },
    probe: {
      name: 'Demand at the probe scheme',
      note:
        'The engine takes the unit count that floor area and geometry would allow and ' +
        'asks what that scheme would need. This is a probe used to find the ceiling, and ' +
        'it is not the demand of the answer. The next section is about nothing else.',
    },
    available: {
      name: 'Available area across the declared levels',
      note:
        'The podium footprint, taken across the levels the run declared, reduced by the ' +
        'fraction of a level that cores, ramps and plant consume.',
      levels: 'levels declared',
      usable: 'usable',
      /** Followed by the engine's basis string, verbatim, and a full stop. */
      basis: 'Basis, in full: ',
    },
    divide: {
      name: 'Supply is that area divided by an area factor',
      note:
        'This is the division the whole page is about. No cited rule fixes the gross area ' +
        'a bay consumes once its share of aisle, column and circulation is charged to it, ' +
        'so the engine records an assumption, demands a basis for it, and ranks it in the ' +
        'register by how far the answer moves when it is perturbed.',
    },
    ceiling: {
      name: 'The supportable unit ceiling',
      note:
        'Supply, converted back into units at the same bays-per-unit rate. It is a floor ' +
        'division, so the ceiling it produces is never rounded up into units the parking ' +
        'cannot serve.',
    },
    band: 'The parking band',
    /** Around the band token and the governing figure, both the run's. */
    verdictBefore: 'On this run the ',
    verdictMid: ' band is the smallest of the three, so the governing capacity is ',
    verdictAfter:
      '. Trace that figure back through the six links above and the fourth one is an ' +
      'assumption. That is the honest shape of the headline number on this site, and it ' +
      'is stated here rather than found later.',
  },

  /** §3 — three quantities carry the word "bays", and no two are the same number. */
  demand: {
    title: 'Demand and supply are different numbers',
    lede:
      'This section exists because the site would otherwise print one of them as the ' +
      'other. Three quantities carry the word “bays” and no two of them are the same ' +
      'number.',
    probeLabel: 'Demand, probe scheme',
    /** The unit this page supplies for `totalBays`, which has none on the wire. */
    bays: 'bays',
    probeNote: 'What the larger scheme used to probe for the parking ceiling would need.',
    gapTitle: 'Two of the three are not on the wire, and neither is printed.',
    gapBody:
      'What the declared levels hold, and what the reported answer actually needs, are ' +
      'both computed by the engine and carry their own derivations. Neither is ' +
      'serialised by the presenter in the API today, so neither appears here as a ' +
      'figure. The gap belongs to that presenter, and closing it is an API change rather ' +
      'than a page change.',
    fourth:
      'The bay count on the drawing below is a fourth quantity again — bays the layout ' +
      'placed — and it is used in the sections about the drawing and nowhere else.',
    quoteSource:
      'The engine’s own note, where the demand of the emitted answer is computed',
  },

  /** §4, when the engine returned a reason instead of a plan. */
  refused: {
    title: 'No level was laid out for this run',
    lede:
      'The engine returns a reason rather than an empty object, because an empty plan ' +
      'reads as “no bays” and that is a different statement.',
    callout: 'The layout was refused.',
  },

  /** §4 — the level, drawn, and the same level stood up in 3D. */
  level: {
    title: 'The level, drawn',
    lede:
      'Every rectangle here is one the engine placed, in the coordinates the geometry ' +
      'kernel used. The drawing runs after the band above, on a supply figure that was ' +
      'already settled, and nothing in it reaches back into that figure.',
    figureLabel: 'Parking level · as placed',
    legendLabel: 'What the drawing shows',
    bayMeta: (width: string, length: string, placed: string): string =>
      `${width} × ${length} m · ${placed} placed`,
    rampMeta: (rows: readonly number[]): string =>
      `plan area reserved · module row ${rows.join(', ')}`,
    accessName: 'Vehicle access',
    /** Between the access width and the frontage number, then after the number. */
    accessOn: ' m on frontage',
    accessRecommended: ' · recommended, not decided for you',
    validity: 'Regulatory validity — not assessed',
    summary: (p: LevelSummary): string =>
      `Parking level as placed. ${p.bays} bays at ` +
      `${p.bayWidth} by ${p.bayLength} metres, a ` +
      `${p.aisleWidth} metre aisle, and a ramp strip down one edge, ` +
      `packed into a ${p.packWidth} by ${p.packDepth} metre ` +
      `rectangle inside the podium. Vehicle access ${p.accessWidth} metres wide on ` +
      `frontage ${p.frontage}.`,
    modelLabel: (bays: string): string =>
      `The ground parking level in 3D, with a car in each of its ` +
      `${bays} bays and the ramp down to the level below. ` +
      'The plan above draws the same bays.',
    modelFallback:
      'This browser cannot draw in 3D, because WebGL is switched off or unavailable. ' +
      'The plan above draws the same bays.',
    modelFigureLabel: 'The same level, stood up',
    /** Follows the bay count, which is the run's. */
    modelSource:
      ' cars, one in each bay the plan draws · a car is the sheet’s drafting symbol, not ' +
      'a vehicle the engine sized · the ramp’s gradient is not assessed · regulatory ' +
      'validity — not assessed',
  },

  /** §5 — the section this product is for. */
  cost: {
    title: 'What the drawing costs the assumption',
    lede:
      'The section this product is for. The supply model spent a fixed area on every ' +
      'bay; the layout then had to find room for aisles, a ramp strip and the depth a ' +
      'module actually needs. Set the two against each other and the assumption is ' +
      'either vindicated or it is not.',
    spent: 'What the supply model spent, per bay',
    achieved: 'What the drawing achieved, per bay',
    heavierTitle: 'The drawing came out heavier than the factor predicted on this plot.',
    heavierBody:
      'A bay on the drawn level carries more gross area than the supply model charged ' +
      'it, which makes the supply figure the band above rests on the optimistic one. ' +
      'That is a finding about this plot, and it is printed as one.',
    lighterTitle:
      'The drawing came out at or under what the factor predicted on this plot.',
    lighterBody:
      'A bay on the placed level carries no more gross area than the supply model ' +
      'charged it. That is a finding about this plot, and it holds for this plot only.',
    placed: 'Bays the layout placed',
    placedNote: 'Not the supply figure, and not the demand. Bays that were drawn.',
    usable: 'Usable area on the level',
    deductions: 'Cores, plant and ramp landing',
    /** The class token is the engine's and stays a token. */
    provenanceNote: (provenanceClass: string): ReactNode =>
      `Provenance class ${provenanceClass}.`,
    neitherTitle: 'Both figures are printed and neither is subtracted from the other.',
    neitherBody:
      'The engine emits the factor and the achieved area with a derivation each, and ' +
      'emits no traced difference between them. A subtraction performed in this page ' +
      'would be the one number here that could not answer where it came from, which is ' +
      'the defect the whole product exists to prevent. The difference belongs in the ' +
      'engine’s parking layout module, emitted with its own derivation, and that is ' +
      'where it is owed.',
  },

  /** §6 — packed inside the podium, never its bounding box. */
  losses: {
    title: 'Where the bays went, and to what',
    lede:
      'Three different losses, kept apart. One efficiency percentage would hide which ' +
      'of them you can do something about, and they are three different arguments with ' +
      'three different people.',
    regionLabel: 'What the level gave up',
    caption: 'Bays and area given up on this level, by cause.',
    cause: 'Where it went',
    why: 'Why',
    bays: 'Bays',
    area: 'Area',
    reserved: 'Cores, plant and the ramp landing',
    reservedNote:
      'Taken off the level before a bay was placed. It moves with the usable ' +
      'fraction you set on the rules step.',
    circulation: 'The cross aisle',
    circulationNote:
      'What it costs for a car to reach every bay. Without it the modules past the ' +
      'first one have no way in, and their bays would be counted anyway.',
    footprint: 'The corner a rectangle cannot reach',
    footprintNote:
      'Only where the podium is not a rectangle. A layout drawn on the true boundary ' +
      'would hold more, and this engine does not attempt one.',
    orientationTitle: 'Both ways round were packed.',
    orientationBefore: ' The runs were laid ',
    orientationAfter:
      ', because that way places more bays in this rectangle. Which way round the ' +
      'modules run is the only thing searched here — never where the ramp or the core ' +
      'goes.',
    strandedTitle: 'Not every bay that was placed was kept.',
    strandedBody:
      ' of them had no aisle a car can reach past the open end, so they are not ' +
      'counted and not drawn. A bay that cannot be reached is not a bay, however ' +
      'neatly it fits.',
  },
  pack: {
    title: 'Packed inside the podium, never its bounding box',
    lede:
      'A bounding box is easy to pack and it is not the site. The layout targets the ' +
      'largest rectangle that fits inside the podium outline, so the error runs by ' +
      'containment and the bay count is a floor rather than a hope.',
    width: 'Pack rectangle, width',
    depth: 'Pack rectangle, depth',
    module: 'Module depth',
    moduleNote: 'Bay, aisle and bay, taken together.',
    coverage: 'Podium covered by the pack',
    exactTitle: 'The inscribed rectangle is exact on this run.',
    exactBody:
      ' The podium is itself a rectangle, so nothing was given up to draw the level and ' +
      'the pack target and the podium outline coincide. On a podium that is not a ' +
      'rectangle they do not, the drawing shows both, and the unusable remainder is ' +
      'reported in square metres rather than absorbed into a ratio.',
    inexactTitle: 'The inscribed rectangle is not exact on this run.',
    inexactBody:
      ' The podium is not a rectangle, so the pack target is smaller than the footprint ' +
      'and the drawing shows both outlines. The remainder is reported in square metres ' +
      'rather than absorbed into a ratio, and the bay count that follows from it is a ' +
      'floor.',
  },

  /** §7 — only the row the run used, and the two things it holds and does not print. */
  dims: {
    title: 'The dimensions this run was cut to',
    lede:
      'Only the row the run actually used. The full minimum-dimensions table is not ' +
      'republished here: the engine holds six rows, not the ten a ' +
      'five-angles-by-two-driveways grid implies, so a page promising the grid would be ' +
      'describing a table that does not exist — and republishing a code table wholesale ' +
      'is an exposure that citing a clause is not.',
    regionLabel: 'Bay dimensions used by this run',
    caption: 'The bay and driveway dimensions this run was cut to.',
    dimension: 'Dimension',
    thisRun: 'This run',
    angle: 'Parking angle',
    driveway: 'Driveway',
    bayWidth: 'Bay width',
    bayLength: 'Bay length',
    drivewayWidth: 'Driveway width',
    heldTitle: 'Two things this section holds and does not print.',
    heldBody:
      'The structural clearance charged per obstructed side is a module constant inside ' +
      'the layout engine rather than a field on the dimension record, so it does not ' +
      'travel on the wire. The clause reference the dimensions were taken from is a ' +
      'citation the engine uses internally as a provenance rule, and the presenter ' +
      'serialises it for nothing. Both need a serialiser change in the API, and both are ' +
      'named here rather than filled in: a clause number typed by hand, on the page that ' +
      'argues against typed figures, is the wrong way to close a gap.',
  },

  /** §8 — the ramp is placed, and nothing about it is assessed but its plan area. */
  ramp: {
    title: 'The ramp is placed; its gradient is not assessed',
    lede:
      'The strip below is reserved in plan and nothing more. Drawing a ramp that reads ' +
      'as checked when only its footprint was considered would be worse than drawing ' +
      'none, so it keeps the deferred treatment — the hatch, the dashed edge and the ' +
      'italic — everywhere it appears on this page.',
    width: 'Ramp strip, width',
    length: 'Ramp strip, length',
    /** Follows the NOT ASSESSED chip in the same sentence. */
    notAssessedBody:
      ' — gradient, transitions and headroom. Those are a separate clause family, they ' +
      'need a section rather than a plan, and this run did not read them. The strip is ' +
      'the area the layout took out of the level before it packed anything else, which ' +
      'is why it is visible in the bay count and invisible in the code check.',
    drawingLabel: (width: string, depth: string): string =>
      `Ramp footprint, ${width} by ${depth} metres in plan.`,
  },

  /** §9 — where the cars get in, and every frontage refused with its reason. */
  access: {
    title: 'Where the cars get in',
    lede:
      'The recommendation, the frontages it beat, and every frontage that was refused ' +
      'with the reason it was refused. The refusals are the half a spreadsheet never ' +
      'gives you, and they are the reason a reviewer can argue with the placement ' +
      'instead of taking it.',
    /** «Frontage 0 · local road · 6.00 m wide», around three values off the run. */
    frontage: 'Frontage ',
    roadBefore: '',
    roadAfter: ' road ·',
    widthBefore: '',
    widthAfter: ' m wide',
    /** Around the centre offset and the usable window, both the run's. */
    centredBefore: 'Centred ',
    centredMid: ' m along it, inside',
    centredAfter:
      ' m of frontage that is clear of both corners once the junction clearance is ' +
      'taken off each end.',
    rankedTitle: 'Ranked, in the engine’s own words',
    rankedRegion: 'Viable frontages, ranked',
    rankedCaption: 'Every frontage that can take a vehicle access, ranked, with the reason.',
    rank: 'Rank',
    frontageColumn: 'Frontage',
    why: 'Why',
    clearWindow: 'Clear window',
    refusedTitle: 'Refused, and why',
    refusedRegion: 'Frontages that cannot take a vehicle access',
    refusedCaption: 'Every frontage that was refused, with the reason it was refused.',
    classification: 'Classification',
    reason: 'Reason',
    deferredTitle: 'Reported not assessed',
    deferredNote:
      'These come off the run as the engine wrote them. Whether the opening sits opposite ' +
      'a junction needs the surrounding road network, which no affection plan carries, so ' +
      'it is reported rather than allowed to block the rest — and the clause references ' +
      'inside these sentences are the engine’s own strings, quoted rather than re-typed. ' +
      'No rule record in this deployment is approved against a sourced instrument.',
  },

  /** §10 — the declaration with no default, run both ways. */
  far: {
    counts: 'Parking counted toward floor area',
    excluded: 'Parking excluded from floor area',
    title: 'The declaration with no default',
    lede:
      'Whether parking counts toward floor area is not something this engine decides. ' +
      'It is derived from a citation, or set by a named person, or the run is refused — ' +
      'and rather than quote a range from a specification, this is the same plot run ' +
      'both ways.',
    declared: 'declared on this run',
    regulatoryLimit: 'Regulatory limit',
    governingCapacity: 'Governing capacity',
    governingBand: 'Governing band',
    legFailed: 'This leg did not answer.',
    spreadRegulatory: 'Spread, regulatory limit',
    spreadGoverning: 'Spread, governing capacity',
    spreadRelative: 'Governing spread, relative',
    spreadRelativeNote: 'Of the larger of the two governing capacities.',
    oneLegTitle: 'No spread is reported, because only one leg answered.',
    oneLegBody:
      'A spread computed from one side is not a spread, and a single column presented as ' +
      'a comparison is worse than no comparison. The leg that answered is above, in ' +
      'full, with the engine’s own message for the leg that did not.',
  },

  /** §11 — refused rather than unbuilt. The optimiser refusal is shared, not here. */
  not: {
    title: 'What it does not do here',
    lede:
      'Each of these is refused rather than unbuilt, and the first is refused by the type ' +
      'system rather than by a decision anyone could reverse in a sprint.',
    items: [
      {
        h: 'It does not design a structural grid.',
        p: 'Column positions, transfer structure and the spans a podium needs are absent. The layout charges a clearance where a bay is obstructed and stops there; where the columns actually fall is an engineering decision this phase does not make.',
      },
      {
        h: 'It does not check fire tender access, turning circles or egress.',
        p: 'The access placement reads frontage hierarchy and junction clearance. Whether an appliance can reach the building, turn, and stand is a different clause family and it is not read at all. A missing check reads as a check that passed, so it is named in every output rather than omitted.',
      },
      {
        h: 'It does not lay out mechanical or stacked parking.',
        p: 'Every bay drawn here is a bay a car drives into and out of under its own power. A stacker changes the area per bay, the aisle it needs and the count the level holds, and none of that is modelled.',
      },
      {
        h: 'It does not judge whether the level can be a basement.',
        p: 'Water table, excavation, shoring and the cost of going down are outside this phase. The run declares how many levels are available and the engine takes that declaration at face value, attributed to whoever made it.',
      },
    ] as readonly { readonly h: string; readonly p: string }[],
    cta: 'Everything else it refuses',
  },

  /** §12 — every page here ends on a limit. */
  unproven: {
    title: 'What this page did not prove',
    lede: 'Every page here ends on a limit. This is the one that matters most.',
    buildable: {
      title: 'That the level as drawn is buildable.',
      body:
        'Rectangles that do not overlap and clear their dimensions are a packing result, ' +
        'not a design. Nothing here has been checked for structure, drainage, ' +
        'ventilation, fire or the hundred things a set of drawings resolves.',
    },
    factor: {
      title: 'That the assumed factor is right for this plot.',
      body:
        'It is the mid-point of a range, recorded with a basis and ranked by sensitivity, ' +
        'and it moves the governing capacity in rough proportion to itself. The section ' +
        'above measures what the drawing did against it; it does not establish that the ' +
        'assumption was correct.',
    },
    /** Around the `[NOT SOURCED]` marker, which is the record's and stays code. */
    clauses: {
      title: 'That the clauses encoded here are the clauses that apply.',
      before:
        'Every seed rule in this deployment carries a placeholder instrument, a source ' +
        'page of zero and clause text marked ',
      mid:
        '. A licensed Dubai architect has to author and approve each record against the ' +
        'actual instrument before any of it is a citation. There is no rule library route ' +
        'in this build to send you to, so the state is stated here instead of linked, and ' +
        'the readiness figures are on the',
      link: 'deployment readiness page',
      after: '.',
    },
  },
};

export type ParkingDictionary = typeof EN;
