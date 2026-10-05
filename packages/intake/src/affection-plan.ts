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
  type SetbackFace,
  type SetbackSchedule,
  type SetbackValue,
  type Traced,
  type TracedDecimal,
  type Tracer,
} from '@envelope/core';
import { readBoundaries, type EdgeReadings } from './edges.js';
import {
  locate,
  pageLines,
  pageText,
  readPdfText,
  valueLeftOf,
  type PdfPageText,
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
    sourceTextVerbatim: item.text.replace(/\s+/g, ' ').trim(),
  };
}

/**
 * `G+2P+8`, `G+3P+6`, `G+11`.
 *
 * NOT THE CAUSE OF THE `G+4` → 13 DEFECT, and this note is here so nobody
 * "fixes" it twice. `docs/03-analysis/meeting-03-2026-10-04.md` §2.1 records the
 * client reading `G+4` off a plan while the screen reported 13 levels, and names
 * two candidate causes that had to be told apart before either was touched. They
 * were, and it is the second:
 *
 *   `parseHeight('G+4')` returns `typicalFloors 4, podiumLevels 0,
 *   totalLevels 5`. The test below asserts it by name.
 *
 * The 13 is the FAR-driven level count, uncapped by the stated height. The
 * sheet's `G+N` deliberately binds nothing — `packages/rules/src/instruments/
 * sheet.ts` pushes it to `notBound` because `height.max` is a ceiling in metres
 * and converting a level count into one needs a floor-to-floor that is itself a
 * resolved parameter — so the solver's ceiling is the generic seed rule
 * `R-HEIGHT-MAX-RES` at 45.00 m over `floor_to_floor` 3.20 m, which is 14, and
 * the answer is `min(14, ceil(permitted GFA ÷ plate))`. Nothing in that formula
 * is the number printed on the sheet. The fix belongs to the envelope solver and
 * the rule builder, not here; this parser's job is to read `4` and it reads `4`.
 */
export function parseHeight(raw: string): HeightAllowance | undefined {
  const withPodium = /\bG\s*\+\s*(\d+)\s*P\s*\+\s*(\d+)\b/i.exec(raw);
  if (withPodium?.[1] !== undefined && withPodium[2] !== undefined) {
    const podiumLevels = Number(withPodium[1]);
    const typicalFloors = Number(withPodium[2]);
    return {
      podiumLevels,
      typicalFloors,
      totalLevels: 1 + podiumLevels + typicalFloors,
      raw: withPodium[0],
    };
  }
  const plain = /\bG\s*\+\s*(\d+)\b(?!\s*P)/i.exec(raw);
  if (plain?.[1] !== undefined) {
    const typicalFloors = Number(plain[1]);
    return { podiumLevels: 0, typicalFloors, totalLevels: 1 + typicalFloors, raw: plain[0] };
  }
  return undefined;
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
// Entry point
// ---------------------------------------------------------------------------

export interface ParseAffectionPlanOptions {
  readonly documentUri: string;
  readonly tracer: Tracer;
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
  const [page] = await readPdfText(bytes, { pages: [1] });
  if (!page) throw new Error('affection plan has no first page');
  return readFacts(page, opts);
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

  const issueDate =
    /(\d{1,2}-\d{1,2}-\d{4})/.exec(text)?.[1] ?? 'UNDATED';

  /** Emit a `DERIVED` value citing the box it was read from. */
  const fromSheet = <T>(
    field: string,
    value: T,
    verbatim: string,
    unit?: string,
  ): Traced<T> | undefined => {
    const item = locate(page, verbatim) ?? locate(page, verbatim.split(/\s/)[0] ?? verbatim);
    if (!item) return undefined;
    return tracer.derived(`affection_plan.${field}`, value, {
      rule: {
        ruleId: `AFFECTION_PLAN.${field}`,
        citation: cite(documentUri, issueDate, field, item),
      },
      formula: `read from affection plan field "${field}"`,
      ...(unit !== undefined ? { unit } : {}),
      detail: { verbatim: item.text.replace(/\s+/g, ' ').trim() },
    });
  };

  const absent = (field: string, label: string, consequence: string): undefined => {
    missing.push({ field, label, consequence });
    return undefined;
  };

  // --- self-describing numeric fields ------------------------------------
  // Scanned line by line, skipping the GFA line. Both figures are written in
  // square metres, and a case-insensitive match for "<n> SQ. M." over the whole
  // sheet hits "GFA=4778.31 Sq. m" first — which silently reports the permitted
  // floor area as the plot area, an error that then propagates into every
  // downstream number while looking entirely plausible.
  const areaLine = pageLines(page)
    .map((l) => l.text)
    .find((l) => /GFA\s*=/i.test(l) === false && new RegExp(String.raw`${NUM}\s*SQ\.?\s*M\.?`, 'i').test(l));
  const areaMatch =
    areaLine === undefined
      ? null
      : new RegExp(String.raw`(${NUM})\s*SQ\.?\s*M\.?`, 'i').exec(areaLine);
  const totalAreaSqm =
    areaMatch?.[1] !== undefined
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

  const gfaSqm =
    gfaFar?.[1] !== undefined
      ? fromSheet('gfa_permitted_sqm', qArea(toDecimal(gfaFar[1])), gfaFar[0], 'm²')
      : absent(
          'gfa_permitted_sqm',
          'GFA',
          'Permitted GFA is not printed on this sheet. It must be obtained from the DCR or set by a named user; it must not be inferred from a neighbouring plot.',
        );

  const far =
    gfaFar?.[2] !== undefined
      ? // 'ratio', the unit the engine gives every FAR. Emitted with none, the screen
        // formatted it as a count and printed the sheet's 3.5 as "4".
        fromSheet('far', qRatio(toDecimal(gfaFar[2])), gfaFar[0], 'ratio')
      : absent(
          'far',
          'FAR',
          'Floor area ratio is not printed on this sheet. Required before any capacity figure may be produced.',
        );

  // --- height -------------------------------------------------------------
  const heightRaw = /\bG\s*\+\s*\d+(?:\s*P\s*\+\s*\d+)?\b/i.exec(text)?.[0];
  const parsedHeight = heightRaw === undefined ? undefined : parseHeight(heightRaw);
  const height =
    parsedHeight !== undefined && heightRaw !== undefined
      ? fromSheet('height_allowance', parsedHeight, heightRaw)
      : absent(
          'height_allowance',
          'Height',
          'Permitted storey count is not printed; the envelope has no vertical bound.',
        );

  // --- setbacks and coverage ---------------------------------------------
  const parsedSetbacks = parseSetbacks(text);
  const setbacks =
    parsedSetbacks !== undefined
      ? fromSheet('setbacks', parsedSetbacks, parsedSetbacks.raw.split(' | ')[0] ?? '')
      : absent(
          'setbacks',
          'Setback',
          'No setback schedule on the sheet. Trakhees regulations and the master developer DCR govern instead and must be supplied.',
        );

  const parsedCoverage = parseCoverage(text);
  const coverage =
    parsedCoverage !== undefined
      ? fromSheet('plot_coverage', parsedCoverage, parsedCoverage.raw.split(' | ')[0] ?? '')
      : absent(
          'plot_coverage',
          'Plot Coverage',
          'No coverage cap on the sheet; the footprint has no horizontal bound from this instrument.',
        );

  // --- label/value fields -------------------------------------------------
  const labelled = <T extends string>(
    field: string,
    label: string,
    transform: (s: string) => T = (s) => s as T,
  ): Traced<T> | undefined => {
    const item = valueLeftOf(page, label);
    if (!item) return undefined;
    const value = transform(item.text.replace(/\s+/g, ' ').trim());
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

  const landUseRaw = /Mixed Use \([^)]*\)|(?:^|\n)(Residential|Commercial|Industrial)(?:\n|$)/i.exec(
    text,
  )?.[0];
  const landUse =
    landUseRaw !== undefined
      ? fromSheet('land_use', landUseRaw.trim(), landUseRaw.trim())
      : absent('land_use', 'Usage', 'Land use selects the applicable rule set; none can be chosen.');

  const parkingNote = /\(Refer to [^)]*\)/i.exec(text)?.[0];
  const parkingDeferredTo =
    parkingNote === undefined ? undefined : fromSheet('parking_authority', parkingNote, parkingNote);
  if (parkingDeferredTo === undefined) {
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

  const parcelId = labelled('parcel_id', 'Parcel ID');
  if (parcelId) facts.parcelId = parcelId;
  const community = labelled('community', 'Community');
  if (community) facts.community = community;
  const developer = labelled('developer', 'Developer');
  if (developer) facts.developer = developer;
  const drgRef = /Drg\.\s*Ref\.?\s*:\s*(\S+)/i.exec(text)?.[1];
  const drawingRef = drgRef === undefined ? undefined : fromSheet('drawing_ref', drgRef, drgRef);
  if (drawingRef) facts.drawingRef = drawingRef;
  if (issueDate !== 'UNDATED') {
    const issued = fromSheet('issue_date', issueDate, issueDate);
    if (issued) facts.issueDate = issued;
  }

  return facts;
}

/** Everything the caller must resolve before the engine may run. */
export function blockingGaps(facts: AffectionPlanFacts): readonly MissingField[] {
  const blocking = new Set(['total_area_sqm', 'far', 'gfa_permitted_sqm', 'height_allowance']);
  return facts.missing.filter((m) => blocking.has(m.field));
}

/** True when the sheet is internally consistent on every check that ran. */
export function crossChecksPassed(facts: AffectionPlanFacts): boolean {
  return facts.crossChecks.every((c) => c.passed);
}

export const PROVENANCE_CLASS_FOR_SHEET_VALUES = ProvenanceClass.DERIVED;
