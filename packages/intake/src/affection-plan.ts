/**
 * Affection-plan intake.
 *
 * The affection plan is where a Dubai project actually starts: the consultant
 * receives it from the client or the master developer, and every number that
 * bounds the scheme — plot area, FAR, GFA, permitted height, setbacks, coverage
 * — is printed on that one sheet. In the 30 Aug 2026 walkthrough the client read
 * a plot's whole envelope off it in under four minutes and then asked the only
 * question that matters here: *can software take this sheet and derive the same
 * numbers?*
 *
 * Three properties make that answerable rather than aspirational:
 *
 * 1. **The sheet is an instrument, not a hint.** Dubai Building Code B.7.2.6.1
 *    says parking "set out in the affection plan or DCR shall take precedent
 *    over Table B.13". So a value read off the plan is `DERIVED` from a cited
 *    instrument, and the citation points at the box on the sheet it was read
 *    from. It is not `OBSERVED` — that class means a precedent distribution and
 *    is not emittable in Phase 0 anyway.
 *
 * 2. **A field that is not printed is missing, never defaulted.** Of the three
 *    real plans in `docs/00-source`, `DJAZ1MED12RES011` prints `G+11` and no
 *    FAR, no GFA, no setback and no coverage at all. Inventing 3.5 there because
 *    the neighbouring plot had 3.5 would be the exact failure this product
 *    exists to prevent. Missing fields come back in `missing[]` and the caller
 *    must obtain a `USER_SET` value or refuse to compute.
 *
 * 3. **What is printed is cross-checked.** FAR × plot area must reproduce the
 *    printed GFA. On all three samples it does, to the rounding the sheet shows.
 *    When it does not, that is a finding about the document, surfaced — not an
 *    averaging opportunity.
 */

import {
  Decimal,
  ProvenanceClass,
  qArea,
  qRatio,
  type Citation,
  type CoverageSchedule,
  type HeightAllowance,
  type ParkingRequirement,
  type SetbackFace,
  type SetbackSchedule,
  type SetbackValue,
  type SideSetback,
  type SideSetbackTable,
  type Traced,
  type TracedDecimal,
  type Tracer,
} from '@envelope/core';
import {
  isDdaSheet,
  metricArea,
  placeSides,
  readGeneralNotes,
  readLandUseLines,
  readSetbackTable,
  readSurveyTable,
  surveyAreaM2,
  surveyLegs,
  valueBelow,
  valueRightOf,
  type SetbackTableReading,
  type SurveyLeg,
  type SurveyPoint,
} from './dda.js';
import { parseParkingRequirement } from './parking.js';
import {
  isUnifiedSitePlan,
  readTextRuns,
  unifiedCell,
  unifiedDate,
  unifiedDimensions,
  unifiedNotes,
  unifiedSideRoads,
} from './unified.js';
import {
  isDmSheet,
  pagePaths,
  parseArabicFar,
  parseArabicHeight,
  readDmDrawing,
  readDmPlot,
  readDmRequest,
  readDmRows,
  type EdgeHint,
} from './dm.js';
import { readBoundaries, type EdgeReadings } from './edges.js';
import { matchDrawnRing, type PagePlacement, placementFromGrid } from './on-page.js';
import { readSitePlan, type SitePlanReading } from './site-plan.js';
import {
  cellLeftOf,
  cleanVerbatim,
  lineContaining,
  locate,
  pageLines,
  pageText,
  readPdfText,
  unionCell,
  type PdfPageText,
  type TextItem,
} from './pdf-text.js';

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/*
 * THE SHAPES MOVED TO `core`, AND ARE RE-EXPORTED FROM HERE UNCHANGED.
 *
 * `HeightAllowance`, `SetbackValue`, `SetbackFace`, `SetbackSchedule` and
 * `CoverageSchedule` were written here, because this is where they were first
 * needed. They describe what an INSTRUMENT states, not how a PDF is read, and
 * `@envelope/rules` now needs the same shapes to build the plot-specific records
 * that §11.5 step 1 lets govern — while `check-boundaries.mjs` forbids
 * `intake → rules` and the reverse edge would put a PDF parser under the rule
 * store. See `packages/core/src/instrument.ts` for the argument in full.
 *
 * Re-exported rather than moved silently: every existing importer of
 * `@envelope/intake` keeps working, and the type it gets is the same type the
 * rule builder receives — one declaration, so they cannot drift.
 */
export type {
  CoverageSchedule,
  HeightAllowance,
  SetbackFace,
  SetbackSchedule,
  SetbackValue,
} from '@envelope/core';

/*
 * `AffectionPlanFacts.edges` is typed by `edges.ts`, and those names are NOT
 * re-exported from here. `index.ts` exports that module directly, and doing
 * both would give the barrel two `export *` paths to one name — legal when they
 * resolve to the same binding and a confusing failure the day one of them stops
 * doing so. One route to a type.
 */

/** A field the sheet does not print. Never filled in by this module. */
export interface MissingField {
  readonly field: string;
  readonly label: string;
  /** What the caller must do — obtain it, or refuse to compute. */
  readonly consequence: string;
}

export interface CrossCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly detail: string;
}

/**
 * The plot as its surveyor recorded it: a grid, a list of corners, and the
 * boundaries that follow from them.
 *
 * `DERIVED`, every field, from the one box on the sheet that states the plot's
 * shape in numbers rather than in ink. The legs are what the plot form's
 * traverse already takes — a length and a grid bearing each — so a reader
 * accepts this ring into the same editable boxes a typed traverse uses, and can
 * still overtype any of it.
 */
export interface SurveyReading {
  /** `DLTM`, read off the sheet's own footer. */
  readonly system: Traced<string>;
  /** Where the drawn plot sits on the page, when a path matches the table. Places a picture; changes no figure. */
  readonly onPage?: PagePlacement;
  readonly points: Traced<readonly SurveyPoint[]>;
  readonly legs: Traced<readonly SurveyLeg[]>;
  /** The shoelace area of the ring, which the caller cross-checks. */
  readonly areaM2: TracedDecimal;
  /** Said under every drawing made from this ring. */
  readonly notModelled: readonly string[];
}

/**
 * THE PLOT AS A VECTOR DRAWING PLACES IT — the Municipality's sheet, see `dm.ts`.
 *
 * A third shape, and kept apart from both of the others on purpose. It is not
 * a coordinate table (`survey`): no corner's easting is printed. It is not a
 * raster fit (`sitePlan.outline`): its corners are the drawing's own vertices,
 * exact in page points, and the drawing's own grid crosses put them in metres.
 * Published only once its ring reproduces the printed plot area; its legs are
 * then DERIVED. The grid's NAME is the one inference, and `system` says so.
 */
export interface DrawnPlotReading {
  /** `DLTM`, identified from the eastings rather than printed — ASSUMED. */
  readonly system: Traced<string>;
  readonly points: Traced<readonly SurveyPoint[]>;
  readonly legs: Traced<readonly SurveyLeg[]>;
  readonly areaM2: TracedDecimal;
  /** One per boundary, in ring order; null where the drawing labels nothing outside it. Suggestions, never answers. */
  readonly edgeHints: readonly (EdgeHint | null)[];
  /** The page on the grid, from the same crosses. Places a picture; changes no figure. */
  readonly onPage: PagePlacement;
  readonly notModelled: readonly string[];
}

/** One line of a land-use split: `RESIDENTIAL : APARTMENT` and `12255.45`. */
export interface LandUseShare {
  readonly use: string;
  /** m², digits as printed without the grouping commas; absent where the line prints no area. */
  readonly areaM2?: string;
}

/** A road the drawing labels beside one of its numbered sides. */
export interface SideRoad {
  readonly side: number;
  /** The label as printed: `ROAD 12.00M`. */
  readonly verbatim: string;
  /** The width it prints, metres, as printed. */
  readonly widthM: string;
}

/** What is said under `unplacedRoads`, every time. */
export const UNPLACED_ROADS_NOTE =
  'The drawing prints these roads, and no numbered side is nearest each in turn, so none is placed ' +
  'on a side. Its width is information, never a road’s rank; which boundary it runs along is for ' +
  'the reader to say on the plot step.';

export interface AffectionPlanFacts {
  readonly parcelId?: Traced<string>;
  readonly community?: Traced<string>;
  readonly developer?: Traced<string>;
  readonly developerPlotNo?: Traced<string>;
  readonly landUse?: Traced<string>;
  readonly totalAreaSqm?: TracedDecimal;
  readonly far?: TracedDecimal;
  readonly gfaSqm?: TracedDecimal;
  readonly height?: Traced<HeightAllowance>;
  readonly setbacks?: Traced<SetbackSchedule>;
  readonly coverage?: Traced<CoverageSchedule>;
  readonly issueDate?: Traced<string>;
  readonly drawingRef?: Traced<string>;
  /**
   * THE SURVEYED RING, when the sheet prints a coordinate table.
   *
   * Deliberately NOT folded into `sitePlan.outline`, which it superficially
   * resembles. That outline is fitted to a raster, scaled by the printed area
   * and published `ASSUMED`; this is a list of eastings and northings the
   * surveyor wrote down, and its legs are plane trigonometry on them. One is a
   * measurement of a picture, the other is the document's own answer, and
   * giving them one field would make the stronger of the two inherit the
   * weaker's caveats — or, worse, lend the weaker the stronger's standing.
   */
  readonly survey?: SurveyReading;
  /** The plot off a vector drawing with a printed grid. See {@link DrawnPlotReading}. */
  readonly drawn?: DrawnPlotReading;
  /**
   * What the sheet itself requires for parking, verbatim, where it states it.
   *
   * The Municipality's sheet has a Parking row of its own — bays per apartment by
   * size, per office area — which is the affection plan governing parking, the
   * precedence Dubai Building Code B.7.2.6.1 gives it over Table B.13. Kept as
   * the sheet's words: turning them into a rule is the rule store's work.
   */
  readonly parkingRequirement?: Traced<string>;
  /**
   * The same requirement, typed: bays per dwelling by a size threshold and per
   * area by use. Read from the Municipality's Parking row and the DDA's `PARKING:`
   * note. Absent where the sheet prints none, or prints one this reader could not
   * type at all — the words are then still in `parkingRequirement`.
   */
  readonly parking?: Traced<ParkingRequirement>;
  /** The expiry date the unified site plan prints beside its issue date. */
  readonly expiryDate?: Traced<string>;
  /**
   * The setbacks the sheet prints per numbered side (the DDA's `SETBACK (M)`
   * table), each cell a distance, a `SEE NOTES` deferral or `N/A`, and each side
   * placed on a surveyed boundary where the drawing says which.
   */
  readonly sideSetbacks?: Traced<SideSetbackTable>;
  /** `LAND USE / GFA SPLIT`, every line: the use and the area printed beside it. */
  readonly landUseSplit?: Traced<readonly LandUseShare[]>;
  /** The sheet's general notes, each in its own words, continuation lines joined. */
  readonly generalNotes?: Traced<readonly string[]>;
  /** Each boundary dimension the drawing prints, as printed (`87.25`), metres. */
  readonly boundaryDimensionsM?: Traced<readonly string[]>;
  /** Each road label the drawing sets beside a `SIDE n`, with the width it prints. */
  readonly sideRoads?: Traced<readonly SideRoad[]>;
  /**
   * Road labels the drawing prints that no `SIDE n` claims as its nearest (17 Oct
   * 2026). They used to be dropped, so a sheet printing three roads read as
   * printing two. Published as printed, with `UNPLACED_ROADS_NOTE`; never placed.
   */
  readonly unplacedRoads?: Traced<readonly string[]>;
  /** Fields the sheet does not print. The caller must resolve these. */
  readonly missing: readonly MissingField[];
  /** Arithmetic the sheet asserts about itself, re-checked. */
  readonly crossChecks: readonly CrossCheck[];
  /** Whether the sheet defers parking to another instrument. */
  readonly parkingDeferredTo?: Traced<string>;
  /**
   * What the sheet says about its boundaries — the bridge from its FACES to the
   * form's EDGES. See `edges.ts`; every entry is `ASSUMED` and offered, never
   * written into a mandatory field.
   *
   * Required rather than optional, like `missing` and `crossChecks`: an absent
   * field reads as "not computed" and an empty one reads as "the sheet supports
   * none", and on `DJAZ1MED12RES011` the second is the whole answer.
   */
  readonly edges: EdgeReadings;
  /**
   * The sheet's own drawing, and the plot's shape read off it.
   *
   * OPTIONAL WHERE `edges` IS REQUIRED, and the asymmetry is the point: `edges`
   * is a reading of the sheet's TEXT, which `readFacts` always has in hand, so
   * an absent field there would be indistinguishable from "the sheet supports
   * none". This is a reading of its RASTER, which only the async entry point
   * can reach — `readFacts` is pure and sync and stays that way. Absent here
   * means nobody looked; `refusals` inside means somebody looked and says why.
   */
  readonly sitePlan?: SitePlanReading;
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

/*
  A NUMBER STARTS WITH A DIGIT. This was `[\d,]+`, which a lone comma satisfies:
  a sheet labelled "Plot Area, Sq.M" matched the area pattern on the comma, and
  `new Decimal('')` threw — the whole upload refused with "[DecimalError] Invalid
  argument" over a label, on a sheet whose figures were all printed.
*/
const NUM = String.raw`\d[\d,]*(?:\.\d+)?`;

/*
  A COMMA WITH ONE OR TWO DIGITS AFTER IT IS A DECIMAL POINT. It cannot be a
  thousands separator, and stripping it read "1365,23 SQ. M." as 136,523 m² — a
  plot a hundred times its size, which every number downstream would have trusted.
  Every other comma groups thousands, as before.
*/
function toDecimal(raw: string): Decimal {
  if (/^\d+,\d{1,2}$/.test(raw)) return new Decimal(raw.replace(',', '.'));
  return new Decimal(raw.replace(/,/g, ''));
}

/**
 * Build a citation pointing at the box the value was read from.
 *
 * `instrumentVersion` is the sheet's issue date: affection plans are reissued
 * and are valid for two years, so "which affection plan" is a question with a
 * date in the answer.
 */
function cite(
  documentUri: string,
  issueDate: string,
  field: string,
  item: { readonly page: number; readonly bbox: readonly [number, number, number, number]; readonly text: string },
): Citation {
  return {
    instrumentId: 'AFFECTION_PLAN',
    instrumentVersion: issueDate,
    clauseReference: field,
    documentUri,
    sourcePage: item.page,
    sourceBbox: [item.bbox[0], item.bbox[1], item.bbox[2], item.bbox[3]],
    sourceTextVerbatim: quoted(item.text),
  };
}

/**
 * The words a citation quotes: the cell's text with undecodable glyph runs taken
 * out (see `cleanVerbatim`). Where nothing decodable is left, the cell's text as
 * it came — an empty quotation would claim the box holds nothing.
 */
function quoted(text: string): string {
  const clean = cleanVerbatim(text);
  return clean !== '' ? clean : text.replace(/\s+/g, ' ').trim();
}

/**
 * A height code as Dubai sheets print it, found in running text: an optional
 * basement token, `G`, and `+`-joined tokens — `G+2P+8`, `G+M+4`, `B+G+P+10`,
 * `2B+G+4P+20`, `G+4+R`. A token's letter must touch its number and be followed
 * by no further letter, so "G+11 Residential" does not read the R of the next
 * word as a roof.
 */
const HEIGHT_CODE = /(?:\b(?:\d{0,2}B\d{0,2})\s*\+\s*)?\bG(?:\s*\+\s*(?:\d{1,3}[PMR]?|[PMR])(?![A-Za-z0-9]))+/i;

/** The first height code in a run of text, verbatim. */
export function findHeightCode(text: string): string | undefined {
  return HEIGHT_CODE.exec(text)?.[0];
}

/**
 * `G+2P+8`, `G+3P+6`, `G+11` — and since 2026-10-17 the forms the first reader
 * missed: `G+M+4` (a mezzanine), `B+G+P+10` (a basement and a podium level with no
 * count), `2B+G+4P+20` (two basements), `G+4+R` (a roof).
 *
 * Those used to come back `undefined` — a blocking gap on a sheet that prints
 * its height — or, worse, half-read: `G+4+R` was `G+4` with the roof dropped and
 * `2B+G+4P+20` lost its basements, which the level schedule asks about first.
 * Each token is now read or the code is refused: two plain numbers, an unknown
 * letter or a missing `G` return `undefined` and the height is reported unread,
 * rather than one of two readings being picked.
 *
 * THE `G+4` → 13 DEFECT WAS NOT HERE, and the record stays so nobody "fixes" it
 * twice (`docs/03-analysis/meeting-03-2026-10-04.md` §2.1): this parser read `4`
 * all along. The 13 was the FAR-driven level count uncapped by the stated height,
 * and `packages/rules/src/instruments/sheet.ts` now binds the code's
 * `totalLevels` as `levels.max_above_ground`, a count, converting nothing to
 * metres. Mezzanines and the roof are carried and NOT counted in `totalLevels`
 * until the client says whether they count against the cap.
 */
export function parseHeight(raw: string): HeightAllowance | undefined {
  const code = findHeightCode(raw);
  if (code === undefined) return undefined;
  const tokens = code.split('+').map((t) => t.replace(/\s+/g, '').toUpperCase());
  let basements: number | undefined;
  if (/^\d*B\d*$/.test(tokens[0] ?? '')) {
    const b = tokens.shift() ?? '';
    const n = /\d+/.exec(b)?.[0];
    basements = n === undefined ? 1 : Number(n);
  }
  if (tokens.shift() !== 'G') return undefined;

  let podiumLevels = 0;
  let mezzanines = 0;
  let roof = false;
  let typicalFloors: number | undefined;
  for (const t of tokens) {
    const m = /^(\d{1,3})?([PMR])?$/.exec(t);
    if (!m || (m[1] === undefined && m[2] === undefined)) return undefined;
    const n = m[1] === undefined ? 1 : Number(m[1]);
    if (m[2] === 'P') podiumLevels += n;
    else if (m[2] === 'M') mezzanines += n;
    else if (m[2] === 'R') {
      // `R` takes no count, and a roof is the last thing in a code.
      if (m[1] !== undefined || roof) return undefined;
      roof = true;
    } else {
      // Two plain counts is two readings of one building.
      if (typicalFloors !== undefined || roof) return undefined;
      typicalFloors = n;
    }
  }
  const typical = typicalFloors ?? 0;
  if (typicalFloors === undefined && podiumLevels === 0) return undefined;
  return {
    podiumLevels,
    typicalFloors: typical,
    totalLevels: 1 + podiumLevels + typical,
    ...(basements !== undefined ? { basements } : {}),
    ...(mezzanines > 0 ? { mezzanines } : {}),
    ...(roof ? { roof } : {}),
    raw: code.trim(),
  };
}

/** One face's distance, or the conditional pair when the sheet gives two. */
function parseSetbackValue(clause: string): SetbackValue | undefined {
  // "0m to solid wall and 4.0m to window wall" — two answers, both correct,
  // selected by a façade decision nobody has made yet.
  const conditional = [...clause.matchAll(/(\d+(?:\.\d+)?)\s*m\s+to\s+([a-z ]+?wall)/gi)];
  if (conditional.length > 1) {
    return {
      kind: 'CONDITIONAL',
      options: conditional.map((m) => ({
        condition: (m[2] ?? '').trim(),
        metres: new Decimal(m[1] ?? '0'),
      })),
    };
  }
  const fixed = /(\d+(?:\.\d+)?)\s*m\b/i.exec(clause);
  return fixed?.[1] === undefined ? undefined : { kind: 'FIXED', metres: new Decimal(fixed[1]) };
}

/** The two masses a Trakhees sheet sets back separately. */
export const SetbackMass = {
  PODIUM: 'PODIUM',
  TOWER: 'TOWER',
} as const;
export type SetbackMass = (typeof SetbackMass)[keyof typeof SetbackMass];

/**
 * One face named by one clause of a setback line, with the clause kept.
 *
 * THE CLAUSE IS THE POINT. `parseSetbackFace` used to recognise a face and throw
 * the words away, which is all a setback *distance* needs — and it is why nothing
 * could bridge the sheet's faces to the form's edges. "6m to adjacent plot" and
 * "3m" are the same distance to a setback and completely different evidence about
 * what lies beyond the boundary. `edges.ts` reads these clauses; the schedule is
 * folded out of the same list, so the two cannot drift.
 */
export interface FaceClause {
  readonly face: keyof SetbackFace;
  readonly value: SetbackValue;
  /** The clause as the sheet wrote it, trimmed and nothing else. */
  readonly clause: string;
  /** The words that named the face: "Front", "street front", "adjacent plot". */
  readonly label: string;
  /**
   * True where the clause named this face only by implication.
   *
   * "6m to adjacent plot" names every face that is not the street without
   * writing either word, so it must not overwrite a face the sheet did name.
   * This is the `??=` the fold below applies, kept as data so that the order of
   * assignment survives being read by two callers.
   */
  readonly onlyIfUnset: boolean;
}

/** One mass's setback line, split into the faces it names. */
export interface MassSetbackClauses {
  readonly mass: SetbackMass;
  /** The whole line as printed, including its "GF & Podium:" / "Tower:" label. */
  readonly line: string;
  readonly faces: readonly FaceClause[];
}

/**
 * Split a setback line into the faces it names, keeping each clause.
 *
 * The two sample grammars are genuinely different — "Front = 0m, Sides & Rear =
 * 3m" versus "0m to street front, Side and rear setback is 0m to solid wall and
 * 4.0m to window wall" — so this recognises phrases rather than positions, and
 * names no face it does not recognise. An unrecognised face is a missing field,
 * not a zero.
 */
export function parseFaceClauses(line: string): readonly FaceClause[] {
  // "0m from all sides" states one distance for every face and names NONE of
  // them. That distinction is invisible to a setback and decisive to a boundary
  // reading, so the label is the sheet's own "all sides" rather than a face
  // name, and `edges.ts` refuses to read a road frontage out of it.
  const all = /(\d+(?:\.\d+)?)\s*m\s+from\s+(all\s+sides)/i.exec(line);
  if (all?.[1] !== undefined) {
    const value: SetbackValue = { kind: 'FIXED', metres: new Decimal(all[1]) };
    const shared = { value, clause: line.trim(), label: all[2] ?? 'all sides', onlyIfUnset: false };
    // Returned instead of continuing, exactly as the early return did before:
    // a line that states every face has no further clause to read.
    return [
      { face: 'front', ...shared },
      { face: 'side', ...shared },
      { face: 'rear', ...shared },
    ];
  }

  const out: FaceClause[] = [];
  // Split on commas only. Splitting on "and" as well looks tempting but breaks
  // the one grammar that matters most: "Side and rear setback is 0m to solid
  // wall and 4.0m to window wall" would lose the word "Side" from the clause
  // holding the numbers, and the side face would silently come back unset.
  for (const clause of line.split(',')) {
    const c = clause.trim();
    if (c === '') continue;
    const value = parseSetbackValue(c);
    if (!value) continue;
    const named = (
      face: keyof SetbackFace,
      pattern: RegExp,
      onlyIfUnset = false,
    ): void => {
      const label = pattern.exec(c)?.[0];
      if (label === undefined) return;
      out.push({ face, value, clause: c, label: label.trim(), onlyIfUnset });
    };
    named('front', /street\s+front|front|street/i);
    named('side', /sides?/i);
    // Whole words: "setback" ends in "back", and "Side setback 0m" used to set
    // the rear face too — a value for a face the sheet never named.
    named('rear', /\brear\b|\bback\b/i);
    // "6m to adjacent plot" names every face that is not the street: a plot
    // boundary is a side or a rear, and the sheet does not distinguish them.
    named('side', /adjacent\s+plot/i, true);
    named('rear', /adjacent\s+plot/i, true);
  }
  return out;
}

/** The face distances, folded out of {@link parseFaceClauses}. */
export function parseSetbackFace(line: string): SetbackFace {
  const face: { front?: SetbackValue; side?: SetbackValue; rear?: SetbackValue } = {};
  for (const c of parseFaceClauses(line)) {
    if (c.onlyIfUnset) face[c.face] ??= c.value;
    else face[c.face] = c.value;
  }
  return face;
}

/**
 * The two setback lines a sheet prints, matched once.
 *
 * One function because `parseSetbacks` and {@link setbackClauses} must agree
 * about which text is a setback line — two copies of these patterns would
 * eventually read the schedule and the boundary proposals off different
 * sentences, and the proposals would still look right.
 */
function setbackLines(
  text: string,
): readonly { readonly mass: SetbackMass; readonly whole: string; readonly content: string }[] {
  const podiumLine = /(?:GF\s*[&/]\s*Podium|GF\s*and\s*Podium)\s*:?\s*([^\n]*)/i.exec(text);
  const towerLine = /\bTower\s*:?\s*([^\n]*)/i.exec(text);
  const out: { mass: SetbackMass; whole: string; content: string }[] = [];
  // Podium first, because `SetbackSchedule.raw` quotes them in that order and
  // that string is shown to the reader as "as printed".
  if (podiumLine)
    out.push({ mass: SetbackMass.PODIUM, whole: podiumLine[0], content: podiumLine[1] ?? '' });
  if (towerLine)
    out.push({ mass: SetbackMass.TOWER, whole: towerLine[0], content: towerLine[1] ?? '' });
  return out;
}

/** Each mass's line split face by face — what `edges.ts` reads. */
export function setbackClauses(text: string): readonly MassSetbackClauses[] {
  return setbackLines(text).map((l) => ({
    mass: l.mass,
    line: l.whole.replace(/\s+/g, ' ').trim(),
    faces: parseFaceClauses(l.content),
  }));
}

function parseSetbacks(text: string): SetbackSchedule | undefined {
  const lines = setbackLines(text);
  if (lines.length === 0) return undefined;

  const contentOf = (mass: SetbackMass): string =>
    lines.find((l) => l.mass === mass)?.content ?? '';
  const podium = parseSetbackFace(contentOf(SetbackMass.PODIUM));
  const tower = parseSetbackFace(contentOf(SetbackMass.TOWER));
  const faces = [podium.front, podium.side, podium.rear, tower.front, tower.side, tower.rear];
  return {
    podium,
    tower,
    raw: lines.map((l) => l.whole).join(' | ').replace(/\s+/g, ' ').trim(),
    requiresDecision: faces.some((f) => f?.kind === 'CONDITIONAL'),
  };
}

function parseCoverage(text: string): CoverageSchedule | undefined {
  const hits = [
    ...text.matchAll(/(GF\s*[&/]\s*Podium|Tower)\s*:?\s*(?:Maximum\s+)?(\d+(?:\.\d+)?)\s*%/gi),
  ];
  if (hits.length === 0) return undefined;
  const out: { podium?: Decimal; tower?: Decimal } = {};
  for (const h of hits) {
    const pct = new Decimal(h[2] ?? '0').div(100);
    if (/tower/i.test(h[1] ?? '')) out.tower = pct;
    else out.podium = pct;
  }
  return {
    ...out,
    raw: hits.map((h) => h[0].replace(/\s+/g, ' ')).join(' | '),
  };
}

// ---------------------------------------------------------------------------
// What a `SEE NOTES` cell says, in a sentence
// ---------------------------------------------------------------------------

/** The limits a sheet can answer with `SEE NOTES`, each with what that leaves unread. */
const DEFERRED_CONSEQUENCE = {
  'maximum GFA':
    'No GFA and no floor area ratio is read from the sheet. Both must come from the approved master plan or the DCR, or be set by a named user; neither is taken from a neighbouring plot.',
  'maximum height':
    'No storey count is read from the sheet, so it gives the envelope no vertical bound. It must come from the approved master plan or the DCR, or be set by a named user.',
  'maximum plot coverage':
    'No coverage cap is read from the sheet. It must come from the approved master plan or the DCR, or be set by a named user.',
  'whole setback table':
    'No setback is read from the sheet. Setbacks must come from the approved master plan or the DCR, or be set by a named user.',
} as const;
type Deferred = keyof typeof DEFERRED_CONSEQUENCE;

/**
 * A `SEE NOTES` cell, said as the deferral it is, with the notes it points at.
 *
 * The notes are quoted rather than summarised: on plot 6468096 they say
 * "APPROVED MASTER PLAN IS REQUIRED PRIOR TO ANY SUBMITTALS." and nothing else,
 * and that sentence IS the answer — the limit lives in a document the reader
 * has to obtain. A sheet whose notes say nothing gets that said instead.
 */
export function seeNotesDeferral(what: Deferred, notes: string): string {
  return (
    `This sheet prints "SEE NOTES" against its ${what} instead of a value.` +
    (notes.trim() !== '' ? ` Its notes read: «${notes.trim()}».` : ' None of its notes states one.') +
    ` ${DEFERRED_CONSEQUENCE[what]}`
  );
}

/** A table whose cells mix distances and deferrals: which cells defer, by side and mass. */
function partialDeferral(sides: readonly SideSetback[]): string {
  const cells = sides.flatMap((s) => [
    ...(s.building.kind === 'SEE_NOTES' ? [`side ${s.side} (building)`] : []),
    ...(s.podium.kind === 'SEE_NOTES' ? [`side ${s.side} (podium)`] : []),
  ]);
  return (
    `The setback table prints "SEE NOTES" instead of a distance for ${cells.join(', ')}. ` +
    'Those cells defer to the sheet’s notes and no distance is read from them; every other cell is read as printed.'
  );
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export interface ParseAffectionPlanOptions {
  readonly documentUri: string;
  readonly tracer: Tracer;
  /**
   * Where the DDA sheet's drawing places its coordinate table on the page
   * (`matchDrawnRing`), when the async reader found it. With it, `readFacts`
   * attaches the placement to the survey and puts each `SIDE n` of the setback
   * table on the boundary the drawing labels. Without it — a test driving
   * `readFacts` from text — the table is still read and its sides are unplaced,
   * which the table says.
   */
  readonly surveyPlacement?: PagePlacement;
}

/**
 * Read an affection plan into traced facts.
 *
 * Deliberately total: it never throws on a field it cannot find. A sheet that
 * prints nothing useful yields a `AffectionPlanFacts` whose every optional is
 * absent and whose `missing[]` names all of them — which is a correct and
 * actionable answer, where an exception would just be a crash.
 */
export async function parseAffectionPlan(
  bytes: Uint8Array,
  opts: ParseAffectionPlanOptions,
): Promise<AffectionPlanFacts> {
  const [layer] = await readPdfText(bytes, { pages: [1] });
  if (!layer) throw new Error('affection plan has no first page');

  /*
    THE UNIFIED SITE PLAN IS READ FROM ITS CONTENT STREAM. Its text layer is one
    item per glyph with guessed spaces (see `unified.ts`), so the page handed to
    `readFacts` is rebuilt from the operator list: one item per run, with the
    generator's own spaces. Everything downstream reads it like any other page.
  */
  const runs = !isDmSheet(layer) && !isDdaSheet(layer) && isUnifiedSitePlan(layer) ? await readTextRuns(bytes) : undefined;
  const page = runs ?? layer;

  /*
    A DDA SHEET'S DRAWING IS PLACED BEFORE ITS TEXT IS TRACED, because the
    setback table's `SIDE n` rows are only boundaries once the drawing's own
    `SIDE n` labels are on the grid — and a traced value is not re-emitted.
  */
  const table = isDdaSheet(page) ? readSurveyTable(page) : undefined;
  const drawing = table ? await readDmDrawing(bytes) : undefined;
  const surveyPlacement =
    table && drawing ? matchDrawnRing(drawing.paths, table.points, [0, 0, page.width, page.height], page.items) : undefined;
  const facts = readFacts(page, { ...opts, ...(surveyPlacement ? { surveyPlacement } : {}) });

  if (isDmSheet(page)) return readDmFacts(bytes, page, facts, opts);

  /*
    THE DRAWING IS READ AFTER THE TEXT, AND NEEDS WHAT THE TEXT FOUND.

    The site plan prints "Scale: NTS", so the only thing that can turn the
    drawing's proportions into metres is the total area the text panel states —
    which is why this runs second and is handed `facts.totalAreaSqm` rather than
    re-reading the sheet for it. A sheet that prints no area still gets its
    shape, with angles and no lengths; see `readSitePlan`.

    It opens the document a second time, which is a cost paid deliberately:
    `readFacts` is pure and synchronous over `PdfPageText`, every test drives it
    from fixture text without a PDF, and threading a pdfjs document through it to
    save a parse would put the raster reader inside the text reader's signature.
  */
  const sitePlan = await readSitePlan(bytes, {
    documentUri: opts.documentUri,
    issueDate: facts.issueDate?.value ?? 'UNDATED',
    tracer: opts.tracer,
    ...(facts.totalAreaSqm ? { statedAreaSqm: facts.totalAreaSqm.value.toString() } : {}),
  });

  // A DDA sheet draws the plot its table lists: matched, `readFacts` placed the page on the grid.
  return { ...facts, sitePlan };
}

/** How close the drawn ring must come to the printed plot area to be published: half a percent. */
const DRAWN_AREA_TOLERANCE = '0.005';

/**
 * The Municipality's sheet: its site plan is vector, so the plot is read from
 * its paths rather than from a raster. See `dm.ts`.
 *
 * The raster reader is not run. On this sheet the largest image is a location
 * map, and a picture of the wrong drawing captioned as the site plan would be
 * worse than none; `sitePlan` says so in its one refusal.
 */
async function readDmFacts(
  bytes: Uint8Array,
  page: PdfPageText,
  facts: AffectionPlanFacts,
  opts: ParseAffectionPlanOptions,
): Promise<AffectionPlanFacts> {
  const { tracer, documentUri } = opts;
  const issueDate = facts.issueDate?.value ?? 'UNDATED';
  const sitePlan: SitePlanReading = {
    refusals: ['The site plan on this sheet is drawn in vector, not placed as a picture; the plot is read from the drawing itself.'],
  };
  const { paths, OPS } = await readDmDrawing(bytes);
  const plot = readDmPlot(page, paths, OPS, facts.parcelId?.value);
  if (typeof plot === 'string') {
    return { ...facts, sitePlan: { refusals: [...sitePlan.refusals, plot] } };
  }

  const crossChecks: CrossCheck[] = [...facts.crossChecks];
  const area = new Decimal(plot.areaM2.toFixed(2));
  const stated = facts.totalAreaSqm?.value;
  const agrees = stated !== undefined && area.minus(stated).abs().lte(stated.mul(DRAWN_AREA_TOLERANCE));
  crossChecks.push({
    name: 'plot_area = area of the drawn ring',
    passed: agrees,
    detail:
      `The ${plot.points.length} corners of the drawn plot, placed by the drawing's grid crosses ` +
      `(${plot.grid.sx.toFixed(5)} m per point east, ${plot.grid.sy.toFixed(5)} north), close a ring of ` +
      `${qArea(area).toString()} m²` +
      (stated ? ` against a printed plot area of ${stated.toString()} m².` : ', and the sheet prints no plot area to check it against.'),
  });
  plot.dimensions.forEach((d, i) => {
    if (!d) return;
    const gap = Math.abs(Number(d.measured) - Number(d.printed));
    crossChecks.push({
      name: `boundary ${i + 1} = the dimension printed beside it`,
      // Two decimals printed, and a corner drawn to a hundredth of a point at 1:1400: 0.25 m covers both.
      passed: gap <= 0.25,
      detail: `The drawing measures ${d.measured} m between corners ${i + 1} and ${((i + 1) % plot.points.length) + 1}; the sheet prints ${d.printed} m beside it.`,
    });
  });
  if (!agrees) return { ...facts, crossChecks, sitePlan };

  const derived = <T>(field: string, value: T, item: TextItem, formula: string, unit?: string): Traced<T> =>
    tracer.derived(`affection_plan.${field}`, value, {
      rule: { ruleId: `AFFECTION_PLAN.${field}`, citation: cite(documentUri, issueDate, field, item) },
      formula,
      ...(unit !== undefined ? { unit } : {}),
      detail: { verbatim: item.text },
    });
  const legs = surveyLegs(plot.points);
  const drawn: DrawnPlotReading = {
    system: tracer.assumed('affection_plan.drawn_grid_system', 'DLTM', {
      basis:
        `The sheet prints grid coordinates (${plot.grid.box.text}) without naming the grid. Eastings on the ` +
        '500,000 m false easting are Dubai Local Transverse Mercator (EPSG:3997), the grid Dubai Municipality ' +
        'issues in; the same numbers on UTM 40N would fall in Oman. It places the plot on a map and changes no figure.',
      label: 'Grid of the drawing',
      detail: { documentUri },
    }),
    points: derived(
      'drawn_points',
      plot.points,
      plot.box,
      `the drawing's own vertices, each mapped to the grid by the crosses labelled ${plot.grid.box.text}`,
    ),
    legs: derived('drawn_legs', legs, plot.box, 'plane trigonometry between consecutive drawn corners on the grid'),
    areaM2: derived('drawn_area_sqm', qArea(area), plot.box, 'shoelace area of the drawn corners', 'm²'),
    edgeHints: plot.hints,
    onPage: placementFromGrid(plot.grid, plot.box.bbox, [0, 0, page.width, page.height], paths),
    notModelled: [
      'Each corner is the drawing’s own vertex, not a surveyed coordinate: the sheet prints no coordinate table. It is checked against the printed area and the printed dimensions above.',
      'Bearings are clockwise from grid north; the convergence between grid north and true north is not applied.',
      'What lies beyond each boundary is suggested from the labels printed outside it, and must be confirmed.',
    ],
  };
  return { ...facts, crossChecks, sitePlan, drawn };
}

/** The pure half, so tests can drive it from fixture text without a PDF. */
export function readFacts(
  page: PdfPageText,
  opts: ParseAffectionPlanOptions,
): AffectionPlanFacts {
  const { tracer, documentUri } = opts;
  const text = pageText(page);
  const missing: MissingField[] = [];
  const crossChecks: CrossCheck[] = [];

  /*
    SLASHES AS WELL AS HYPHENS, because the two generators punctuate differently.

    Trakhees prints `22-12-2025`; the DDA footer prints `18/11/2025 02:27:59 PM`.
    The hyphen-only pattern left every DDA sheet `UNDATED`, which is not a
    cosmetic loss: `instrumentVersion` on every citation this function emits is
    that string, so an undated sheet cites an undated instrument, and two
    revisions of one plot's affection plan become indistinguishable in the
    evidence pack.
  */
  /* The Municipality's sheet prints no issue date; its request reference carries
     the day it was generated (`SAPS-08082026-…`), and a generated sheet is
     issued the day it is generated. Its free text does hold a date-shaped run —
     "22/2001", a law number — which the pattern below would misread. */
  const dm = isDmSheet(page);
  const dmRequest = dm ? readDmRequest(page) : undefined;
  /*
    WHICH SHEET THIS IS. See `dda.ts` and `unified.ts` for what differs and what it cost.

    Read once and threaded through the readers below rather than sniffed inside
    each: a field that decided its own dialect could read the area off one
    generator's layout and the GFA off the other's, and the pair would still
    cross-check against each other perfectly well.
  */
  const dda = isDdaSheet(page);
  const unified = !dm && !dda && isUnifiedSitePlan(page);
  /* The unified sheet prints an issue date AND an expiry date, each under its own
     label; the first date-shaped run on the page is whichever the stream emits
     first, and dating every citation by the expiry would be a quiet lie. */
  const unifiedIssued = unified ? unifiedDate(page, 'Issue Date') : undefined;
  const unifiedExpires = unified ? unifiedDate(page, 'Expiry Date') : undefined;
  const issueDate =
    dmRequest?.date ??
    unifiedIssued?.text.trim() ??
    (dm || unified ? undefined : /(\d{1,2}[-/]\d{1,2}[-/]\d{4})/.exec(text)?.[1]) ??
    'UNDATED';
  const dmRows = dm ? readDmRows(page) : {};

  /** Emit a `DERIVED` value citing the box it was read from. */
  const fromSheet = <T>(
    field: string,
    value: T,
    verbatim: string,
    unit?: string,
  ): Traced<T> | undefined => {
    /* Never the first word alone: `GF/` was once the whole quotation of a
       setback line. The line the value sits on is a true, if wider, one. */
    const item = locate(page, verbatim) ?? lineContaining(page, verbatim.split(/\s/)[0] ?? verbatim);
    if (!item) return undefined;
    return tracer.derived(`affection_plan.${field}`, value, {
      rule: {
        ruleId: `AFFECTION_PLAN.${field}`,
        citation: cite(documentUri, issueDate, field, item),
      },
      formula: `read from affection plan field "${field}"`,
      ...(unit !== undefined ? { unit } : {}),
      detail: { verbatim: quoted(item.text) },
    });
  };

  /**
   * The same, for a reader that already holds the box.
   *
   * `fromSheet` goes looking for its own citation by matching the text it just
   * parsed, which is the only thing it can do when the value came out of a regex
   * over the whole page. The DDA readers return the cell, so re-finding it by
   * text would be a search that can fail — and on a sheet where `N/A` appears in
   * five boxes, a search that can succeed on the wrong one.
   */
  const fromCell = <T>(
    field: string,
    value: T,
    item: { readonly page: number; readonly bbox: readonly [number, number, number, number]; readonly text: string },
    unit?: string,
  ): Traced<T> =>
    tracer.derived(`affection_plan.${field}`, value, {
      rule: {
        ruleId: `AFFECTION_PLAN.${field}`,
        citation: cite(documentUri, issueDate, field, item),
      },
      formula: `read from affection plan field "${field}"`,
      ...(unit !== undefined ? { unit } : {}),
      detail: { verbatim: quoted(item.text) },
    });

  const absent = (field: string, label: string, consequence: string): undefined => {
    missing.push({ field, label, consequence });
    return undefined;
  };

  /*
    THE NOTES A DEFERRAL POINTS AT. A DDA sheet heads them `GENERAL NOTES`; the
    unified site plan prints its plot-specific remarks as capitalised dash lines
    ("- APPROVED MASTER PLAN IS REQUIRED PRIOR TO ANY SUBMITTALS."). Read once:
    the parking requirement, the setback rule and every `SEE NOTES` gap quote them.
  */
  const notes: readonly { readonly text: string; readonly box: TextItem }[] = dda
    ? readGeneralNotes(page)
    : unified
    ? unifiedNotes(page).map((n) => ({ text: n.text.replace(/^-\s*/, '').replace(/\s+/g, ' ').trim(), box: n }))
    : [];
  /* What a `SEE NOTES` cell defers to, in the sheet's words — every note except
     the parking one, which answers a different question. */
  const deferralNotes = notes
    .filter((n) => !/^PARKING\s*:/i.test(n.text))
    .map((n) => n.text)
    .join(' ');

  /* The unified sheet's limit cells, each the value left of its English label. */
  const uCell = (label: string): TextItem | undefined => (unified ? unifiedCell(page, label) : undefined);
  const uGfa = uCell('Maximum GFA');
  const uHeight = uCell('Maximum Height');
  const uCoverage = uCell('Maximum Plot Coverage') ?? uCell('Maximum Plot');
  const says = (cell: TextItem | undefined, words: RegExp): boolean => cell !== undefined && words.test(cell.text.trim());
  const SEE_NOTES = /^SEE\s*NOTES?$/i;
  const NOT_APPLICABLE = /^N\s*\/\s*A$/i;

  // --- self-describing numeric fields ------------------------------------
  // Scanned line by line, skipping the GFA line. Both figures are written in
  // square metres, and a case-insensitive match for "<n> SQ. M." over the whole
  // sheet hits "GFA=4778.31 Sq. m" first — which silently reports the permitted
  // floor area as the plot area, an error that then propagates into every
  // downstream number while looking entirely plausible.
  /*
    AND ON A DDA SHEET THE SCAN IS NOT USED AT ALL.

    That sheet states its area in a labelled cell — `PLOT AREA` | `1,040.04 M` —
    and running the scan over it read **150** out of the general note "ONE BAY
    FOR EACH UNIT LESS THAN OR EQUAL TO 150 SQ.M GFA". The client was shown a
    1,040 m² plot reported as 150 m². The lesson is not that the regex needs
    another exclusion: a labelled cell is a reading and a page-wide scan is a
    guess, so where the sheet labels the box, the label wins.
  */
  /* The unified sheet's `Total Area` is answered twice, in m² above the label's
     row and in ft² on it; only the metric cell is read, as on the DDA's. */
  const ddaAreaCell = dda
    ? valueRightOf(page, 'PLOT AREA')
    : unified
    ? unifiedCell(page, 'Total Area', (t) => metricArea({ text: t, page: page.page, bbox: [0, 0, 0, 0] }) !== undefined)
    : undefined;
  const ddaArea = metricArea(ddaAreaCell);

  const areaLine = pageLines(page)
    .map((l) => l.text)
    .find((l) => /GFA\s*=/i.test(l) === false && new RegExp(String.raw`${NUM}\s*SQ\.?\s*M\.?`, 'i').test(l));
  const areaMatch =
    areaLine === undefined
      ? null
      : new RegExp(String.raw`(${NUM})\s*SQ\.?\s*M\.?`, 'i').exec(areaLine);
  const totalAreaSqm =
    ddaArea !== undefined && ddaAreaCell !== undefined
      ? fromCell('total_area_sqm', qArea(toDecimal(ddaArea)), ddaAreaCell, 'm²')
      : areaMatch?.[1] !== undefined
      ? fromSheet('total_area_sqm', qArea(toDecimal(areaMatch[1])), areaMatch[0], 'm²')
      : absent(
          'total_area_sqm',
          'Total Area',
          'Plot area is the denominator of every capacity number; computation is blocked without it.',
        );

  const gfaFar = new RegExp(
    String.raw`GFA\s*=\s*(${NUM})\s*Sq\.?\s*m[^A-Za-z]*,?\s*FAR\s*=\s*(${NUM})`,
    'i',
  ).exec(text);

  const ddaGfaCell = dda ? valueRightOf(page, 'MAX. GFA') : uGfa;
  const ddaGfa = metricArea(ddaGfaCell);

  const gfaSqm =
    ddaGfa !== undefined && ddaGfaCell !== undefined
      ? fromCell('gfa_permitted_sqm', qArea(toDecimal(ddaGfa)), ddaGfaCell, 'm²')
      : gfaFar?.[1] !== undefined
      ? fromSheet('gfa_permitted_sqm', qArea(toDecimal(gfaFar[1])), gfaFar[0], 'm²')
      : absent(
          'gfa_permitted_sqm',
          'GFA',
          dm && dmRows.Height?.lines.some((l) => parseArabicFar(l) !== undefined)
            ? 'This sheet states its limit as a floor ratio and prints no GFA. The engine derives GFA as that ratio × the plot area; nothing else is needed from the sheet for it.'
            : says(uGfa, SEE_NOTES)
            ? seeNotesDeferral('maximum GFA', deferralNotes)
            : 'Permitted GFA is not printed on this sheet. It must be obtained from the DCR or set by a named user; it must not be inferred from a neighbouring plot.',
        );

  /*
    A DDA SHEET PRINTS NO FAR, AND THIS FIELD SAYS SO.

    `affection_plan.far` means "the sheet printed this ratio", and a DDA sheet
    prints none, so the field stays absent. The ratio is NOT refused, though:
    the sheet prints a maximum GFA and a plot area, and their quotient is the
    limit in the form the engine carries. `rules/instruments/sheet.ts` binds it
    with the division in its citation, and `blockingGaps` therefore does not
    stop a DDA run. `DJAZ1MED12RES011` is different and still blocks: it prints a
    height and neither a FAR nor a GFA, so there is nothing to divide.
  */
  /* «ونسبة طابقية = 5.0», on the Municipality's Height row — "floor ratio". */
  const dmHeightRow = dmRows.Height;
  const dmFar = dmHeightRow?.lines.map(parseArabicFar).find((v) => v !== undefined);
  const far =
    dmFar !== undefined && dmHeightRow
      ? fromCell('far', qRatio(toDecimal(dmFar)), dmHeightRow.box, 'ratio')
      : gfaFar?.[2] !== undefined
      ? // 'ratio', the unit the engine gives every FAR. Emitted with none, the screen
        // formatted it as a count and printed the sheet's 3.5 as "4".
        fromSheet('far', qRatio(toDecimal(gfaFar[2])), gfaFar[0], 'ratio')
      : absent(
          'far',
          'FAR',
          (dda || unified) && ddaGfa !== undefined
            ? 'This sheet prints a maximum GFA and no floor area ratio. The study takes the ratio from the sheet’s own figures: maximum GFA ÷ plot area. Nothing else is needed for it.'
            : 'Floor area ratio is not printed on this sheet. Required before any capacity figure may be produced.',
        );

  // --- height -------------------------------------------------------------
  /* The Municipality writes the storeys out: «أرضي + أول للقاعدة البرج + (16)
     طابق». Read into the `G+1P+16` the other two generators print, and cited to
     the Arabic row it came from, so the derivation shows the sheet's own words. */
  const dmStoreys = dmHeightRow?.lines.map(parseArabicHeight).find((v) => v !== undefined);
  const heightRaw = unified ? (uHeight ? findHeightCode(uHeight.text) : undefined) : findHeightCode(text);
  const parsedHeight = heightRaw === undefined ? undefined : parseHeight(heightRaw);
  const height =
    dmStoreys !== undefined && dmHeightRow
      ? fromCell(
          'height_allowance',
          {
            podiumLevels: dmStoreys.podiumLevels,
            typicalFloors: dmStoreys.typicalFloors,
            totalLevels: 1 + dmStoreys.podiumLevels + dmStoreys.typicalFloors,
            raw:
              dmStoreys.podiumLevels > 0
                ? `G+${dmStoreys.podiumLevels}P+${dmStoreys.typicalFloors}`
                : `G+${dmStoreys.typicalFloors}`,
          },
          dmHeightRow.box,
        )
      : parsedHeight !== undefined && heightRaw !== undefined
      ? unified && uHeight
        ? fromCell('height_allowance', parsedHeight, uHeight)
        : fromSheet('height_allowance', parsedHeight, heightRaw)
      : absent(
          'height_allowance',
          'Height',
          says(uHeight, SEE_NOTES)
            ? seeNotesDeferral('maximum height', deferralNotes)
            : heightRaw !== undefined
            ? `This sheet prints the height code "${heightRaw}", which does not read as one building: two plain storey counts, a letter other than B, G, P, M or R, or no ground floor. No storey count is read from it; it must be confirmed by a named user.`
            : 'Permitted storey count is not printed; the envelope has no vertical bound.',
        );

  // --- setbacks and coverage ---------------------------------------------
  /*
    A SETBACK TABLE PER SIDE — the DDA's `SETBACK (M)` and the unified sheet's
    `SETBACK (m)`. Read cell by cell, in the cell's own state. It is the only
    setback either sheet prints, so it is read before anything is said about one.
  */
  const sideTable: SetbackTableReading | undefined = dda || unified ? readSetbackTable(page) : undefined;
  const sideCells = sideTable?.ok ? sideTable.sides.flatMap((s) => [s.building, s.podium]) : [];
  const quarterNote = notes.find((n) => /^SETBACK\s*:/i.test(n.text) && /QUARTER\s+OF\s+THE\s+HEIGHT/i.test(n.text));
  const parsedSetbacks = parseSetbacks(text);
  const setbacks =
    parsedSetbacks !== undefined
      ? fromSheet('setbacks', parsedSetbacks, parsedSetbacks.raw.split(' | ')[0] ?? '')
      : absent(
          'setbacks',
          'Setback',
          /*
            `SEE NOTES` IS A DEFERRAL, AND IT IS REPORTED AS ONE — BUT ONLY WHERE
            THE SHEET PRINTS IT.

            Plot 5134565 prints `SEE NOTES` in all four building cells and `N/A`
            in all four podium cells, and its note reads "QUARTER OF THE HEIGHT
            FROM NEIGHBORING PLOTS AND FROM CENTER OF SIKKA - MAXIMUM 7.5M AND A
            MINIMUM OF 3M" — a rule whose input is the storey count, which is
            the engine's fixpoint and not this module's. That sentence used to be
            printed for EVERY DDA sheet, and plot 6457790 prints eight numbers.
            It is now said only of a table whose every building cell defers and
            whose notes carry that rule; any other deferral is said as it is.
          */
          dm && dmRows.Setback
            ? `This sheet states its setback as a rule, not a distance: «${dmRows.Setback.lines.join(' ')}» — a quarter of the building height from the neighbours and from the middle of the sikkas, at most 7.5 m and at least 3 m, as the DDA note says it. Its input is the storey count, so no distance is read from the sheet. It must be authored as a rule or set under a named user.`
            : sideTable?.ok === false
            ? sideTable.reason
            : /*
                A TABLE READ IS NOT A TABLE APPLIED. Where every cell is a
                distance or N/A the table is published whole as `sideSetbacks`,
                and `facts.setbacks` stays empty because a front / side / rear
                schedule cannot say "side 1 is 5 m". Since 17 Oct 2026
                `rules/instruments/sheet.ts` binds each side to the boundary it is
                — but only where the plot was entered as the sheet's surveyed
                ring, leg for leg, since a side is a surveyed leg and not a kind
                of boundary. So the gap stays and says exactly when the table
                binds and what governs where it does not.
              */
              sideTable?.ok && sideCells.every((c) => c.kind === 'NOT_APPLICABLE')
            ? 'This sheet prints "N/A" in every cell of its setback table: it sets no setback. Setbacks must come from the plot guidelines, the master plan or the DCR, or be set by a named user.'
            : sideTable?.ok && !sideCells.some((c) => c.kind === 'SEE_NOTES')
            ? `This sheet prints its setbacks per numbered side, not per face: «${sideTable.raw}». Each side binds the boundary the drawing places it on, the building row the tower and the podium row the podium, where the plot is entered from the sheet’s coordinate table. On a side the drawing does not place, or a plot entered another way, the setback comes from the general rules, and a tower setback typed on the plot step under a named user overrides them.`
            : sideTable?.ok &&
              quarterNote &&
              sideTable.sides.every((s) => s.building.kind === 'SEE_NOTES' && s.podium.kind !== 'DISTANCE')
            ? 'This sheet prints "SEE NOTES" against every face instead of a distance, and defers to a general note setting the setback at a quarter of the building height, capped at 7.5 m and floored at 3 m. That is a rule with the storey count as its input, not a schedule of distances, so no setback is read from the sheet. It must be authored as a rule or set under a named user.'
            : sideTable?.ok && sideCells.every((c) => c.kind === 'SEE_NOTES')
            ? seeNotesDeferral('whole setback table', deferralNotes)
            : sideTable?.ok
            ? partialDeferral(sideTable.sides)
            : dda || unified
            ? 'No setback table was found on this sheet. Setbacks must come from the plot guidelines, the master plan or the DCR, or be set by a named user.'
            : 'No setback schedule on the sheet. Trakhees regulations and the master developer DCR govern instead and must be supplied.',
        );

  const parsedCoverage = parseCoverage(text);
  const coverage =
    parsedCoverage !== undefined
      ? fromSheet('plot_coverage', parsedCoverage, parsedCoverage.raw.split(' | ')[0] ?? '')
      : absent(
          'plot_coverage',
          'Plot Coverage',
          /* `N/A` printed against a cap is a statement — this instrument sets
             none — and it is a different fact from a sheet that has no coverage
             row at all. Both leave the footprint unbound; only one of them has
             been answered. */
          (dda && NOT_APPLICABLE.test(valueRightOf(page, 'MAX. COVERAGE')?.text.trim() ?? '')) || says(uCoverage, NOT_APPLICABLE)
            ? 'This sheet prints "N/A" against the maximum coverage: it sets no coverage cap. The footprint has no horizontal bound from this instrument, and one must come from the DCR or from a named user.'
            : says(uCoverage, SEE_NOTES)
            ? seeNotesDeferral('maximum plot coverage', deferralNotes)
            : 'No coverage cap on the sheet; the footprint has no horizontal bound from this instrument.',
        );

  // --- label/value fields -------------------------------------------------
  /*
    A LABEL IS A WHOLE PHRASE. This read `valueLeftOf(page, label)`, whose anchor
    is the first item CONTAINING the label: on `IC1-CTYL-16_011` that was
    "Developer's" in a general note, and the developer read as "Master"; and the
    value was the single item nearest the label, so `WARSAN 1 - 621` came back
    as "621". Both went straight into the plot form and every title block built
    from it. The label is now matched whole (`cellLeftOf`), the value is its
    whole cell, and a cell that is another label, or an undecodable glyph run,
    does not answer.
  */
  const FORM_LABELS = new Set(
    ['PARCEL ID', 'COMMUNITY', 'DEVELOPER', 'DEVELOPER PLOT NO.', 'AUTHORITY', 'DLD REF NUMBER', 'OWNER', 'TITLE', 'REMARKS', 'USAGE', 'HEIGHT', 'PARKING', 'SETBACK', 'PLOT COVERAGE', 'SITE PLAN -'],
  );
  const formValue = (t: string): boolean =>
    /[\p{L}\p{N}]/u.test(t) && cleanVerbatim(t) === t.replace(/\s+/g, ' ').trim() && !FORM_LABELS.has(t.replace(/\s+/g, ' ').trim().toUpperCase());
  const labelled = (field: string, label: string, accept: (t: string) => boolean = () => true): Traced<string> | undefined => {
    const item = cellLeftOf(page, label, { accept: (t) => formValue(t) && accept(t) });
    if (!item) return undefined;
    const value = item.text.replace(/\s+/g, ' ').trim();
    if (value === '') return undefined;
    return tracer.derived(`affection_plan.${field}`, value, {
      rule: {
        ruleId: `AFFECTION_PLAN.${field}`,
        citation: cite(documentUri, issueDate, label, item),
      },
      formula: `read from affection plan field "${label}"`,
      detail: { verbatim: value },
    });
  };

  /*
    THE DDA SHEET ANSWERS THIS UNDER A HEADING, AND IT ANSWERS IT TWICE OVER.

    `LAND USE / GFA SPLIT` sits over `RESIDENTIAL : APARTMENT`, which the
    Trakhees pattern cannot match: it wants the word alone on its line, and here
    it is followed by the sub-use on the same baseline. The sub-use is the half
    that matters downstream — "residential" picks the rule set and "apartment"
    is what makes a unit mix mean anything — so the line is taken whole rather
    than trimmed back to the word the old pattern knew.
  */
  /* Every line of the split, not the first (see `readLandUseLines`). */
  const ddaLandUse = dda ? readLandUseLines(page) : [];
  const ddaLandUseBox = ddaLandUse.length > 0 ? unionCell(ddaLandUse.map((l) => l.box), page.page) : undefined;
  const unifiedLandUse = unified ? unifiedCell(page, 'Land Use') : undefined;
  const landUseRaw = /Mixed Use \([^)]*\)|(?:^|\n)(Residential|Commercial|Industrial)(?:\n|$)/i.exec(
    text,
  )?.[0];
  /* The Municipality's Land use row: the uses in Arabic, then the zoning code
     printed beside them, which is the key the DCR is looked up by. */
  const dmUse = dmRows.Landuse;
  const landUse =
    dmUse && dmUse.lines.length > 0
      ? fromCell('land_use', `${dmUse.lines.join(' ')}${dmUse.code ? ` (${dmUse.code})` : ''}`, dmUse.box)
      : ddaLandUseBox !== undefined
      ? fromCell('land_use', ddaLandUse.map((l) => l.box.text).join(' + '), { ...ddaLandUseBox, text: ddaLandUse.map((l) => l.box.text).join(' + ') })
      : unifiedLandUse !== undefined
      ? fromCell('land_use', unifiedLandUse.text.replace(/\s+/g, ' ').trim(), unifiedLandUse)
      : landUseRaw !== undefined
      ? fromSheet('land_use', landUseRaw.trim(), landUseRaw.trim())
      : absent('land_use', 'Usage', 'Land use selects the applicable rule set; none can be chosen.');

  /*
    THE SPLIT, TYPED — and checked against the maximum GFA it divides.

    Plot 6457790 allows 13,935.45 m², of which 1,680.00 is retail and 12,255.45
    residential, and a note restricts the retail to the ground floor. Reading the
    land use as one line counted the retail share as flats, in units and in bays.
    Binding the residential share as the cap is the rule builder's work; this
    publishes the shares and whether they add up to the printed maximum.
  */
  const shares = ddaLandUse.filter((l) => l.areaM2 !== undefined);
  const landUseSplit =
    shares.length > 0 && ddaLandUseBox
      ? fromCell(
          'land_use_split',
          ddaLandUse.map((l): LandUseShare => ({ use: l.use, ...(l.areaM2 !== undefined ? { areaM2: l.areaM2 } : {}) })),
          { ...ddaLandUseBox, text: ddaLandUse.map((l) => l.box.text).join(' + ') },
        )
      : undefined;
  if (landUseSplit && gfaSqm && shares.length === ddaLandUse.length) {
    const sum = shares.reduce((acc, l) => acc.plus(toDecimal(l.areaM2 ?? '0')), new Decimal(0));
    crossChecks.push({
      name: 'gfa split = maximum GFA',
      // Each share and the total are printed to the hundredth.
      passed: sum.minus(gfaSqm.value).abs().lte('0.01'),
      detail: `${shares.map((l) => `${l.use} ${l.areaM2 ?? ''} m²`).join(' + ')} = ${qArea(sum).toString()} m² against a printed maximum GFA of ${gfaSqm.value.toString()} m².`,
    });
  }

  /*
    PARKING, IN THE SHEET'S WORDS AND TYPED.

    Trakhees defers parking in words — "(Refer to Trakhees Regulations & Dubai
    Building Code …)". The Municipality prints a Parking row; the DDA a
    `PARKING:` note, which was not read at all, so the sheet step told the
    reader the plot's parking instrument was unknown while the sheet stated it.
    B.7.2.6.1 puts either above Table B.13. The words are kept as before and the
    requirement is typed beside them (`parking.ts`).
  */
  const parkingNote = /\(Refer to [^)]*\)/i.exec(text)?.[0];
  const parkingDeferredTo =
    parkingNote === undefined ? undefined : fromSheet('parking_authority', parkingNote, parkingNote);
  const dmParking = dmRows.Parking;
  const ddaParking = notes.find((n) => /^PARKING\s*:/i.test(n.text));
  const parkingCell =
    dmParking && dmParking.lines.length > 0
      ? { text: dmParking.lines.join(' '), box: dmParking.box }
      : ddaParking
      ? { text: ddaParking.text.replace(/^PARKING\s*:\s*/i, ''), box: ddaParking.box }
      : undefined;
  const parkingRequirement = parkingCell ? fromCell('parking_requirement', parkingCell.text, parkingCell.box) : undefined;
  const parkingTyped = parkingCell ? parseParkingRequirement(parkingCell.text) : undefined;
  const parking = parkingCell && parkingTyped ? fromCell('parking', parkingTyped, parkingCell.box) : undefined;
  if (parkingCell && !parkingTyped) {
    missing.push({
      field: 'parking_requirement',
      label: 'Parking',
      consequence: `This sheet states a parking requirement this reader could not type: «${parkingCell.text}». Its words are kept; no bay count may be read from them until it is confirmed by a named user.`,
    });
  }
  if (parkingDeferredTo === undefined && parkingRequirement === undefined) {
    missing.push({
      field: 'parking_authority',
      label: 'Parking',
      consequence:
        'The sheet does not say which instrument governs parking. Dubai Building Code B.7.2.6.1 gives precedence to the affection plan or DCR over Table B.13, so the governing instrument must be established before a bay count is produced.',
    });
  }

  // --- cross-checks -------------------------------------------------------
  if (totalAreaSqm && far && gfaSqm) {
    const recomputed = totalAreaSqm.value.mul(far.value);
    // The sheet rounds FAR to two decimals, so the reconstruction can only be
    // as tight as that rounding allows: 0.005 of FAR across the plot area.
    const tolerance = totalAreaSqm.value.mul('0.005').abs();
    const delta = recomputed.minus(gfaSqm.value).abs();
    crossChecks.push({
      name: 'gfa = far × plot_area',
      passed: delta.lte(tolerance),
      detail:
        `${far.value.toString()} × ${totalAreaSqm.value.toString()} m² = ` +
        `${qArea(recomputed).toString()} m² vs printed ${gfaSqm.value.toString()} m² ` +
        `(Δ ${qArea(delta).toString()} m², tolerance ${qArea(tolerance).toString()} m²)`,
    });
  }

  /*
    THE RATIO THE TWO PRINTED FIGURES IMPLY — as a cross-check, never as a FAR.

    On a sheet that prints both an area and a maximum GFA and no ratio, the
    quotient is the one piece of arithmetic a reader will do in his head within
    a second of looking at it, and saying nothing about it is not neutrality: it
    leaves him to do it himself and to assume the engine agrees. So it is stated,
    in the one place in this module whose contents are explicitly statements
    about the document rather than values of the plot.
  */
  if (dda && totalAreaSqm && gfaSqm && !far && totalAreaSqm.value.gt(0)) {
    const implied = gfaSqm.value.div(totalAreaSqm.value);
    crossChecks.push({
      name: 'gfa ÷ plot_area (this sheet prints no FAR)',
      /* Nothing is being checked AGAINST anything, so there is nothing that can
         fail. `true` here means "stated", and the name says what it is. */
      passed: true,
      detail:
        `${gfaSqm.value.toString()} m² ÷ ${totalAreaSqm.value.toString()} m² = ` +
        `${qRatio(implied).toString()}. This sheet prints no FAR; the study binds this ` +
        'quotient of its two printed figures as the ratio, and says so in its citation.',
    });
  }

  /*
    THE SURVEYED RING, AND THE ONE THING THAT MAKES IT SAFE TO OFFER.

    The coordinate table is the only description of the plot's SHAPE on the sheet
    that is written in numbers. Everything else — the drawing, its dimension
    strings — is ink, and the raster reader in `site-plan.ts` fits a polygon to
    it and publishes the result `ASSUMED` for exactly that reason.
    Six eastings and northings are not fitted to anything.

    But a misread table is also a perfectly plausible ring, so the shoelace area
    is checked against the printed plot area before the shape is offered at all.
    On plot 5134565 it returns 1040.04 m² against a printed 1,040.04 m². A table
    that does NOT reproduce the printed area has been misread — a dropped row
    closes the ring across a corner and loses a triangle, quietly — and the ring
    is withheld rather than published with a warning nobody reads.
  */
  const surveyTable = dda ? readSurveyTable(page) : undefined;
  let survey: SurveyReading | undefined;
  if (surveyTable) {
    const ringArea = toDecimal(surveyAreaM2(surveyTable.points));
    /* A tenth of a percent. The coordinates are printed to the millimetre, so
       the only slack needed is the rounding of the printed area itself. */
    const agrees =
      totalAreaSqm === undefined
        ? false
        : ringArea.minus(totalAreaSqm.value).abs().lte(totalAreaSqm.value.mul('0.001'));

    crossChecks.push({
      name: 'plot_area = area of the surveyed ring',
      passed: agrees,
      detail:
        `${surveyTable.points.length} coordinates on the ${surveyTable.system} grid close a ring ` +
        `of ${qArea(ringArea).toString()} m²` +
        (totalAreaSqm
          ? ` against a printed plot area of ${totalAreaSqm.value.toString()} m².`
          : ', and the sheet prints no plot area to check it against.'),
    });

    if (agrees) {
      const legs = surveyLegs(surveyTable.points);
      survey = {
        system: fromCell('survey_system', surveyTable.system, surveyTable.box),
        ...(opts.surveyPlacement ? { onPage: opts.surveyPlacement } : {}),
        points: fromCell('survey_points', surveyTable.points, surveyTable.box),
        legs: fromCell('survey_legs', legs, surveyTable.box),
        areaM2: fromCell('survey_area_sqm', qArea(ringArea), surveyTable.box, 'm²'),
        notModelled: [
          `Bearings are clockwise from ${surveyTable.system} grid north, as the coordinates give them. The convergence between grid north and true north is not applied: the sheet states no value for it.`,
          'Every boundary is taken as a straight line between two surveyed corners. A boundary the sheet draws as a curve is reported here as its chord.',
          'Corner elevations are not printed, so the ring is flat and its area is a plan area.',
        ],
      };
    }
  }

  /*
    EACH SIDE OF THE SETBACK TABLE ON THE BOUNDARY THE DRAWING NAMES.

    The table says "SIDE ( 1 ): 5 / 4"; the drawing prints `SIDE 1` inside the
    plot beside one boundary. Placed on the coordinate table's grid by the
    drawing's own fit (`matchDrawnRing`), each label is nearest one surveyed leg,
    and the table's side becomes that leg — one to one, every side, or none.
  */
  let sideSetbacks: Traced<SideSetbackTable> | undefined;
  if (sideTable?.ok) {
    const placement = opts.surveyPlacement;
    const placed =
      survey && placement
        ? placeSides(
            page,
            sideTable.sides.map((s) => s.side),
            survey.points.value,
            (x, y) => [placement.ax * x + placement.bx * y + placement.cx, placement.ay * x + placement.by * y + placement.cy],
          )
        : undefined;
    const ring = survey?.points.value ?? [];
    const sides: SideSetback[] = sideTable.sides.map((s) => {
      const leg = placed instanceof Map ? placed.get(s.side) : undefined;
      return leg === undefined ? s : { ...s, boundary: leg };
    });
    const legName = (i: number): string => `corner ${ring[i]?.id ?? i + 1} to corner ${ring[(i + 1) % ring.length]?.id ?? ((i + 1) % ring.length) + 1}`;
    const placementSentence =
      placed instanceof Map
        ? `Each side of the table is the surveyed boundary the drawing labels with its number: ${sides
            .map((s) => `side ${s.side} runs from ${legName(s.boundary ?? 0)}`)
            .join('; ')}.`
        : typeof placed === 'string'
        ? placed
        : unified
        ? 'This sheet prints no coordinate table, so no side of the setback table is placed on a boundary; the reader says which boundary each side is.'
        : survey === undefined
        ? 'No surveyed ring was read from this sheet, so no side of the setback table is placed on a boundary; the reader says which boundary each side is.'
        : 'The drawing could not be placed on the sheet’s coordinate table, so no side of the setback table is placed on a boundary; the reader says which boundary each side is.';
    sideSetbacks = fromCell('setbacks_by_side', { sides, raw: sideTable.raw, placement: placementSentence }, sideTable.box);
  }

  // --- boundaries ---------------------------------------------------------
  // Read from the same clauses the schedule was folded out of, so the proposals
  // and the distances cannot come from different sentences. It runs whether or
  // not a schedule was found: a sheet with no setback line still has an `Access
  // Side` box, and still owes the reader a reason per unanswered boundary.
  const edges = readBoundaries(page, {
    documentUri,
    issueDate,
    tracer,
    clauses: setbackClauses(text),
  });

  const facts: {
    -readonly [K in keyof AffectionPlanFacts]: AffectionPlanFacts[K];
  } = { missing, crossChecks, edges };

  if (totalAreaSqm) facts.totalAreaSqm = totalAreaSqm;
  if (far) facts.far = far;
  if (gfaSqm) facts.gfaSqm = gfaSqm;
  if (height) facts.height = height;
  if (setbacks) facts.setbacks = setbacks;
  if (coverage) facts.coverage = coverage;
  if (landUse) facts.landUse = landUse;
  if (parkingDeferredTo) facts.parkingDeferredTo = parkingDeferredTo;
  if (parkingRequirement) facts.parkingRequirement = parkingRequirement;
  if (parking) facts.parking = parking;
  if (sideSetbacks) facts.sideSetbacks = sideSetbacks;
  if (landUseSplit) facts.landUseSplit = landUseSplit;
  if (notes.length > 0) {
    facts.generalNotes = fromCell(
      'general_notes',
      notes.map((n) => n.text),
      { ...unionCell(notes.map((n) => n.box), page.page), text: notes.map((n) => n.text).join(' | ') },
    );
  }

  /* The unified sheet's drawing: the dimension it prints beside each boundary,
     and each road it labels beside a side. Read, cited, and bound to nothing —
     there is no coordinate table to put them on a ring. */
  if (unified) {
    const dims = unifiedDimensions(page);
    if (dims.length > 0) {
      facts.boundaryDimensionsM = fromCell(
        'boundary_dimensions_m',
        dims.map((d) => d.text.trim().replace(/m$/, '')),
        { ...unionCell(dims, page.page), text: dims.map((d) => d.text.trim()).join(' · ') },
        'm',
      );
    }
    const { paired, unpaired } = unifiedSideRoads(page);
    if (paired.length > 0) {
      facts.sideRoads = fromCell(
        'side_roads',
        paired.map((r): SideRoad => ({ side: r.side, verbatim: r.verbatim, widthM: r.widthM })),
        { ...unionCell(paired.map((r) => r.box), page.page), text: paired.map((r) => r.box.text).join(' · ') },
      );
    }
    // A road no side claims is still a road the sheet prints: published, said, and placed on nothing.
    if (unpaired.length > 0) {
      facts.unplacedRoads = fromCell(
        'unplaced_roads',
        unpaired.map((r) => r.text.replace(/\s+/g, ' ').trim()),
        { ...unionCell(unpaired, page.page), text: unpaired.map((r) => r.text.trim()).join(' · ') },
      );
    }
    if (unifiedExpires) facts.expiryDate = fromCell('expiry_date', unifiedExpires.text.trim(), unifiedExpires);
  }

  /*
    THREE FIELDS, TWO LAYOUTS, AND THE HAND CHANGES WITH THE SHEET.

    Trakhees sets a bilingual label with its value in the cell to its LEFT, which
    is what `labelled` reads. The DDA sheet puts the plot number to the RIGHT of
    its label in a plain table, and the community and master developer BELOW
    theirs in a side panel. None of the three was found at all, so the client was
    shown "not printed on this sheet" against a plot number printed in 14-point
    type at the top of the page.
  */
  const ddaCell = (field: string, item: TextItem | undefined): Traced<string> | undefined => {
    const value = item?.text.replace(/\s+/g, ' ').trim() ?? '';
    if (!item || value === '') return undefined;
    return fromCell(field, value, item);
  };

  const parcelId =
    (dda ? ddaCell('parcel_id', valueRightOf(page, 'PLOT NUMBER')) : undefined) ??
    (unified ? ddaCell('parcel_id', unifiedCell(page, 'Parcel ID', (t) => /^\d{5,10}$/.test(t.trim()))) : undefined) ??
    labelled('parcel_id', 'Parcel ID');
  if (parcelId) facts.parcelId = parcelId;
  const community =
    (dda ? ddaCell('community', valueBelow(page, 'COMMUNITY')) : undefined) ??
    (unified ? ddaCell('community', unifiedCell(page, 'Community')) : undefined) ??
    labelled('community', 'Community');
  if (community) facts.community = community;
  /* Not on the unified sheet: its Developer cell runs over two lines, and half
     a name read as the whole would be a confident wrong answer. */
  const developer = dda
    ? ddaCell('developer', valueBelow(page, 'MASTER DEVELOPER'))
    : unified
    ? undefined
    : labelled('developer', 'Developer');
  if (developer) facts.developer = developer;
  /* The master developer's own plot reference — `DJAZ1TRE10RES022` — which is
     the key the developer's brief is filed under, not the land department's. */
  const developerPlotNo = dda || unified ? undefined : labelled('developer_plot_no', 'Developer Plot No.');
  if (developerPlotNo) facts.developerPlotNo = developerPlotNo;
  const drgRef = /Drg\.\s*Ref\.?\s*:\s*(\S+)/i.exec(text)?.[1];
  const drawingRef = drgRef === undefined ? undefined : fromSheet('drawing_ref', drgRef, drgRef);
  if (drawingRef) facts.drawingRef = drawingRef;
  if (survey) facts.survey = survey;
  if (dmRequest) {
    facts.issueDate = fromCell('issue_date', dmRequest.date, dmRequest.item);
    facts.drawingRef = fromCell('drawing_ref', dmRequest.ref, dmRequest.item);
  } else if (unifiedIssued) {
    facts.issueDate = fromCell('issue_date', issueDate, unifiedIssued);
  } else if (issueDate !== 'UNDATED') {
    const issued = fromSheet('issue_date', issueDate, issueDate);
    if (issued) facts.issueDate = issued;
  }

  return facts;
}

/** Everything the caller must resolve before the engine may run. */
export function blockingGaps(facts: AffectionPlanFacts): readonly MissingField[] {
  const blocking = new Set(['total_area_sqm', 'far', 'gfa_permitted_sqm', 'height_allowance']);
  /*
    A missing GFA blocks only beside a missing FAR. The engine derives GFA from
    FAR × plot area and has no `gfa.max` for a printed GFA to bind (see
    `instruments/sheet.ts`), so a sheet that prints FAR 5 and no GFA — the
    Municipality's, every time — lacks nothing the run needs. Telling a reader
    the study is stopped when it is not costs the gaps that do stop it their
    standing. The gap is still listed in `missing`; it just does not block.
  */
  if (facts.far !== undefined) blocking.delete('gfa_permitted_sqm');
  /*
    And a missing FAR blocks only beside a missing GFA or plot area. A sheet that
    prints both (every DDA sheet) states its ratio as their quotient, which
    `rules/instruments/sheet.ts` binds with the arithmetic in its citation. The
    gap stays in `missing` — the sheet does not print a FAR, and saying so is
    still true.
  */
  if (facts.gfaSqm !== undefined && facts.totalAreaSqm !== undefined) blocking.delete('far');
  return facts.missing.filter((m) => blocking.has(m.field));
}

/** True when the sheet is internally consistent on every check that ran. */
export function crossChecksPassed(facts: AffectionPlanFacts): boolean {
  return facts.crossChecks.every((c) => c.passed);
}

export const PROVENANCE_CLASS_FOR_SHEET_VALUES = ProvenanceClass.DERIVED;
