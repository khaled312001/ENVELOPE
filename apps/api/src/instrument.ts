/**
 * THE AFFECTION PLAN, FROM THE UPLOAD TO THE RULE THAT BINDS THE RUN.
 *
 * ---------------------------------------------------------------------------
 * WHY THE SERVER PARSES IT AND THE BROWSER DOES NOT SEND THE NUMBERS.
 *
 * The obvious wiring is the cheap one: the intake screen already reads the sheet
 * and already shows the FAR, so let the browser post `{ far: 3.5 }` with the plot
 * and be done. That would produce a rule whose citation names a page and a
 * bounding box in a document the server never opened — a number somebody typed,
 * wearing the evidence of a number somebody read. On a product whose entire claim
 * is that it can tell those two apart, that is the one shortcut unavailable.
 *
 * So `POST /api/plots` takes the PDF itself, parses it with the same parser the
 * intake route uses, and stores what IT read. The citation on every rule built
 * from it points at a box the server located in bytes the server was given.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS STORED, AND WHY IT IS NOT ON `Plot`.
 *
 * `Plot` is a core domain type and it travels into `geometry` and `capacity`,
 * neither of which has any business knowing an instrument exists. The limits are
 * stored as a sibling of the plot in the same JSON blob the repository already
 * holds — `PlotWire` is the API's own storage format, not a domain type — so
 * there is no migration and an older row simply has no sheet, which is the
 * correct reading of a plot entered before this existed.
 *
 * ---------------------------------------------------------------------------
 * A SHEET THAT DISAGREES WITH THE PLOT IS NOT SILENTLY ACCEPTED.
 *
 * `bindingFor` will not build rules from a sheet whose parcel is not the plot's.
 * The alternative is a run bound by a neighbouring plot's limits, which is the
 * precise failure `CLAUDE.md` names — "borrowing 3.50 from the neighbouring plot
 * is the precise failure this product exists to prevent" — arrived at by upload
 * rather than by inference.
 */

import {
  Decimal,
  ProvenanceGraph,
  Tracer,
  type Citation,
  type CoverageSchedule,
  type HeightAllowance,
  type ParkingRequirement,
  type PlotEdge,
  type SetbackCell,
  type SetbackSchedule,
  type SetbackValue,
  type SideSetbackTable,
  type StatedLimit,
  type StatedLimits,
  type Traced,
} from '@envelope/core';
import { blockingGaps, parseAffectionPlan, type AffectionPlanFacts } from '@envelope/intake';
import {
  citesPlaceholder,
  decisionKindOf,
  DecisionKind,
  faceOptionsOf,
  isApplicable,
  podiumSetbackParameter,
  resolveParameter,
  ResolutionStatus,
  rulesFromInstrument,
  SHEET_PARKING_FN,
  type FaceOption,
  type InstrumentEdge,
  type InstrumentRules,
  type RuleRecord,
  type UnboundLimit,
} from '@envelope/rules';
import { z } from 'zod';

/** The upload, as `POST /api/plots` accepts it. Optional: a plot needs no sheet. */
export const affectionPlanAttachment = z.object({
  /** Base64-encoded PDF, as `/api/intake/affection-plan` takes it. */
  content: z.string().min(1, 'the file is empty'),
  filename: z.string().min(1).max(255),
});

export const PDF_MAGIC = '%PDF-';

/** Raised when an upload is not a readable affection plan. Carries its own status. */
export class AttachmentError extends Error {
  override readonly name = 'AttachmentError';
  constructor(
    readonly statusCode: number,
    message: string,
    readonly detail: string,
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export interface ReadSheet {
  readonly facts: AffectionPlanFacts;
  readonly limits: StatedLimits;
  /** The parcel the sheet names, when it names one. Checked against the plot. */
  readonly parcelId: string | undefined;
  /** The sheet's issue date, or `UNDATED` — the parser's own word for it. */
  readonly issuedOn: string;
  readonly documentUri: string;
  /** The surveyed ring's legs, where the sheet prints a coordinate table. See {@link SurveyLegWire}. */
  readonly surveyLegs?: readonly SurveyLegWire[];
  /** `blockingGaps(facts)`, kept so `POST /api/runs` refuses what intake refused. */
  readonly blocking: readonly GapWire[];
  /** What the sheet states that no rule binds, read from intake's own sentences. */
  readonly unapplied: readonly UnboundLimit[];
}

/** One leg of the sheet's surveyed ring: metres, and degrees clockwise from grid north. */
export interface SurveyLegWire {
  readonly lengthM: string;
  readonly bearingDeg: string;
}

/** A gap intake reported, as `MissingField` has it. */
export interface GapWire {
  readonly field: string;
  readonly label: string;
  readonly consequence: string;
}

/*
  TWO THINGS A SHEET STATES THAT NO RULE BINDS, READ FROM INTAKE'S OWN WORDS.

  Neither has a typed field to bind from, and that is the point of listing them:
  a run that applied Table B.13 and Table B.1 to a plot whose sheet says otherwise
  must say it did (CLAUDE.md, "set aside is never dropped").
*/

/** The sheet refers parking to the master developer's DCR, which is not on file. */
export const PARKING_DEFERRED_REASON =
  'The sheet refers parking to the master developer’s DCR alongside the Dubai Building Code. ' +
  'B.7.2.6.1 puts a DCR’s parking requirement above Table B.13, and no DCR is on file, so ' +
  'Table B.13 is applied. Where the DCR sets other ratios, the demand shown is not the DCR’s.';
/** The sheet states its setback as a quarter of the building's height. */
export const SETBACK_RULE_REASON =
  'The sheet states the setback as a rule, a quarter of the building height within a minimum ' +
  'and a maximum, whose input is the storey count. It is not encoded, so it is not applied: ' +
  'the study’s setbacks come from the general rules, or from a tower setback typed on the plot step.';

function unappliedFrom(facts: AffectionPlanFacts): UnboundLimit[] {
  const out: UnboundLimit[] = [];
  if (facts.parkingDeferredTo && !facts.parking) {
    out.push({ field: 'parking.deferred', stated: facts.parkingDeferredTo.value, reason: PARKING_DEFERRED_REASON });
  }
  /* Intake's sentence for a setback stated as a rule quotes the rule («…») or names the quarter-height note. */
  const setbackGap = facts.missing.find((m) => m.field === 'setbacks');
  if (setbackGap && /quarter of the building height/i.test(setbackGap.consequence)) {
    const quoted = /«([^»]+)»/.exec(setbackGap.consequence)?.[1];
    out.push({
      field: 'setbacks.rule',
      stated:
        quoted && !quoted.startsWith('SETBACK')
          ? quoted
          : 'SEE NOTES: a quarter of the building height, at most 7.5 m and at least 3 m',
      reason: SETBACK_RULE_REASON,
    });
  }
  return out;
}

/**
 * Parse an attached sheet into the limits it states.
 *
 * Throws `AttachmentError` only for an upload that is not a PDF or cannot be
 * read. A sheet that merely omits every limit is a valid document and a normal
 * answer: `limits` comes back empty and the plot is stored without one.
 */
export async function readAttachedSheet(
  attachment: z.infer<typeof affectionPlanAttachment>,
): Promise<ReadSheet> {
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(Buffer.from(attachment.content, 'base64'));
  } catch {
    throw new AttachmentError(400, 'content is not valid base64', attachment.filename);
  }

  const head = Buffer.from(bytes.slice(0, 8)).toString('latin1');
  if (!head.startsWith(PDF_MAGIC)) {
    throw new AttachmentError(
      400,
      'not a PDF',
      `${attachment.filename} does not begin with ${PDF_MAGIC}. Affection plans are issued ` +
        'as PDFs; a screenshot or a scanned image cannot be read for its printed values.',
    );
  }

  const graph = new ProvenanceGraph();
  let facts: AffectionPlanFacts;
  try {
    facts = await parseAffectionPlan(bytes, {
      documentUri: attachment.filename,
      tracer: new Tracer(graph),
    });
  } catch (error) {
    throw new AttachmentError(
      422,
      'the PDF could not be read',
      error instanceof Error ? error.message : String(error),
    );
  }

  const limits = statedLimitsFrom(facts, graph);
  return {
    facts,
    limits,
    parcelId: facts.parcelId?.value,
    issuedOn: facts.issueDate?.value ?? 'UNDATED',
    documentUri: attachment.filename,
    ...(facts.survey
      ? { surveyLegs: facts.survey.legs.value.map((l) => ({ lengthM: l.lengthM, bearingDeg: l.bearingDeg })) }
      : {}),
    blocking: blockingGaps(facts).map((m) => ({ field: m.field, label: m.label, consequence: m.consequence })),
    unapplied: unappliedFrom(facts),
  };
}

/**
 * Lift the traced facts into `StatedLimits`, pairing each with its citation.
 *
 * A fact whose citation cannot be found in the graph is DROPPED, not carried with
 * a placeholder. `StatedLimit` has no constructor without a citation for the same
 * reason there is no constructor for an untraced value, and a limit that cannot
 * say which box it came from is exactly the thing this module exists to refuse.
 */
export function statedLimitsFrom(
  facts: AffectionPlanFacts,
  graph: ProvenanceGraph,
): StatedLimits {
  const lift = <T>(t: Traced<T> | undefined): StatedLimit<T> | undefined => {
    if (!t) return undefined;
    const citation = graph.citationBelow(t.node);
    return citation ? { value: t.value, citation } : undefined;
  };

  const far = lift<Decimal>(facts.far);
  const gfaM2 = lift<Decimal>(facts.gfaSqm);
  const plotAreaM2 = lift<Decimal>(facts.totalAreaSqm);
  const coverage = lift<CoverageSchedule>(facts.coverage);
  const setbacks = lift<SetbackSchedule>(facts.setbacks);
  const height = lift<HeightAllowance>(facts.height);
  /* The two Wave 1 readings `rules/instruments/sheet.ts` now binds (17 Oct 2026). */
  const setbacksBySide = lift<SideSetbackTable>(facts.sideSetbacks);
  const parking = lift<ParkingRequirement>(facts.parking);

  return {
    ...(far ? { far } : {}),
    ...(gfaM2 ? { gfaM2 } : {}),
    ...(plotAreaM2 ? { plotAreaM2 } : {}),
    ...(coverage ? { coverage } : {}),
    ...(setbacks ? { setbacks } : {}),
    ...(setbacksBySide ? { setbacksBySide } : {}),
    ...(height ? { height } : {}),
    ...(parking ? { parking } : {}),
  };
}

// ---------------------------------------------------------------------------
// Binding
// ---------------------------------------------------------------------------

export interface StoredSheet {
  readonly limits: StatedLimits;
  readonly parcelId: string | null;
  readonly issuedOn: string;
  readonly documentUri: string;
  /** Absent on a sheet stored before 17 Oct 2026; such a sheet binds no per-side setback. */
  readonly surveyLegs?: readonly SurveyLegWire[];
  /** Absent on a sheet stored before 17 Oct 2026: see {@link blockingOf}. */
  readonly blocking?: readonly GapWire[];
  /** Absent on a sheet stored before 17 Oct 2026, which then lists nothing here. */
  readonly unapplied?: readonly UnboundLimit[];
}

/**
 * What still stops a run on this sheet: intake's `blockingGaps`, as stored with it.
 *
 * A sheet stored before 17 Oct 2026 kept no gaps, and is held to the same
 * predicate on the limits it did keep — a FAR, or a GFA with the plot area to
 * divide it by, and a storey count — so an old plot is not let through what a
 * new upload of the same sheet would refuse.
 */
export function blockingOf(sheet: StoredSheet): readonly GapWire[] {
  if (sheet.blocking) return sheet.blocking;
  const l = sheet.limits;
  const gaps: GapWire[] = [];
  if (!l.far && !(l.gfaM2 && l.plotAreaM2)) {
    gaps.push({ field: 'far', label: 'FAR', consequence: 'Floor area ratio is not printed on this sheet.' });
  }
  if (!l.height) {
    gaps.push({ field: 'height_allowance', label: 'Height', consequence: 'Permitted storey count is not printed.' });
  }
  return gaps;
}

/** The parameters a sheet is the instrument for, whose seed placeholder must not stand in for it. */
export const SHEET_PARAMETERS: ReadonlySet<string> = new Set(['far.max', 'coverage.max', 'tower_plate.max', 'height.max']);

/**
 * The seed rules a run on an attached, bound sheet may not use: the placeholders
 * (`PLACEHOLDER-NOT-A-REAL-INSTRUMENT`) for a limit the sheet is the instrument
 * for. Where the sheet states the limit it wins anyway; where it is silent, a
 * placeholder FAR of 5.00, a 60% coverage or a 1,280 m² plate from the PRD's
 * appendix would govern a reported capacity on a plot whose own document says
 * nothing of the kind (CLAUDE.md: "An affection plan that omits a limit does not
 * get one"). Table B.1, B.4.2.2 and B.13 are not placeholders — they cite the
 * code's page — and stay.
 */
export function placeholdersForSheet(rules: readonly RuleRecord[]): readonly RuleRecord[] {
  return rules.filter((r) => citesPlaceholder(r) && SHEET_PARAMETERS.has(r.parameterId));
}

/** Why a placeholder was not loaded for this run, said on the run's sheet report. */
export const PLACEHOLDER_SET_ASIDE_REASON =
  'A placeholder figure no instrument prints. This plot has its own affection plan, so the ' +
  'placeholder is not applied to it: where the sheet states this limit the sheet’s figure is ' +
  'used, and where it is silent the limit is left open rather than filled.';

/*
  WHICH BOUNDARY IS WHICH SURVEYED LEG.

  "SIDE 1" on a DDA sheet names a leg of its coordinate table, and the plot's
  edge 0 is whichever boundary its author entered first. The two rings are matched
  by length and bearing, both ways round and from every starting corner, and the
  match is used only when exactly one exists — on a rectangle entered from a
  traced outline, two do, and choosing between them would be choosing which
  neighbour gets the street's figure.
*/
const LEG_LENGTH_TOLERANCE_M = new Decimal('0.10');
const LEG_BEARING_TOLERANCE_DEG = 1;

/** Degrees clockwise from grid north of the direction start → end. */
function directionDeg(e: PlotEdge): number {
  const deg = (Math.atan2(e.end.x - e.start.x, e.end.y - e.start.y) * 180) / Math.PI;
  return (deg + 360) % 360;
}

const angleApart = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/** Why the plot's boundaries could not be placed on the survey's legs. Said on `notBound`. */
export const RING_NOT_SURVEY_REASON =
  'This plot’s boundaries are not the sheet’s surveyed ring, leg for leg by length and bearing, ' +
  'so no side of the table can be placed on one of them. Enter the plot from the sheet’s ' +
  'coordinate table to apply it.';

/**
 * Each plot edge with the surveyed leg it is, or a sentence saying why none could be told.
 */
export function edgesOnSurvey(
  edges: readonly PlotEdge[],
  legs: readonly SurveyLegWire[] | undefined,
): { readonly edges: readonly InstrumentEdge[]; readonly unmatched?: string } {
  const plain = edges.map((e) => ({ seq: e.seq, classification: e.classification }));
  if (!legs || legs.length === 0) return { edges: plain };
  const n = legs.length;
  if (edges.length !== n || edges.some((e) => e.arc !== undefined)) {
    return { edges: plain, unmatched: RING_NOT_SURVEY_REASON };
  }
  const fits = (edge: PlotEdge, leg: SurveyLegWire, reversed: boolean): boolean => {
    const length = new Decimal(edge.lengthMm).div(1000);
    const want = Number(leg.bearingDeg) + (reversed ? 180 : 0);
    return (
      length.minus(leg.lengthM).abs().lte(LEG_LENGTH_TOLERANCE_M) &&
      angleApart(directionDeg(edge), want) <= LEG_BEARING_TOLERANCE_DEG
    );
  };
  const matches: number[][] = [];
  for (const reversed of [false, true]) {
    for (let k = 0; k < n; k += 1) {
      // Forward: edge i is leg (i + k). Reversed: edge i walks leg (k − i) backwards.
      const legOf = (i: number): number => (reversed ? (((k - i) % n) + n) % n : (i + k) % n);
      if (edges.every((e, i) => fits(e, legs[legOf(i)]!, reversed))) {
        matches.push(edges.map((_, i) => legOf(i)));
      }
    }
  }
  if (matches.length !== 1) return { edges: plain, unmatched: RING_NOT_SURVEY_REASON };
  const legOfEdge = matches[0]!;
  return { edges: edges.map((e, i) => ({ seq: e.seq, classification: e.classification, surveyLeg: legOfEdge[i]! })) };
}

/**
 * Why a stored sheet was not allowed to bind a run. Reported, never swallowed.
 *
 * A plot whose sheet is refused runs on the general rules exactly as it did
 * before — but the reader is told which document was set aside and why, because
 * a sheet that is attached and quietly ignored is worse than no sheet at all.
 */
export interface SheetRefusal {
  readonly documentUri: string;
  readonly reason: string;
}

export interface BoundSheet extends InstrumentRules {
  readonly documentUri: string;
  readonly issuedOn: string;
}

/**
 * Turn a stored sheet into the rules it implies for one plot, or refuse.
 *
 * `plotNumber` is the engine's own name for the plot. The parcel the sheet names
 * must match it: a sheet uploaded against the wrong plot would otherwise bind a
 * run with a neighbour's limits, carrying a citation that proves the numbers were
 * read correctly out of entirely the wrong document.
 */
export function bindSheet(
  sheet: StoredSheet,
  plotNumber: string,
  authoredBy: string,
  /** How many of the plot's boundaries are roads; decides whether "which is the front?" is reported. */
  roadBoundaries?: number,
  /** The plot's boundaries, so a per-side table can be placed on them. See {@link edgesOnSurvey}. */
  plotEdges?: readonly PlotEdge[],
): BoundSheet | SheetRefusal {
  if (sheet.parcelId !== null && !sameParcel(sheet.parcelId, plotNumber)) {
    return {
      documentUri: sheet.documentUri,
      reason:
        `the sheet is issued for parcel ${sheet.parcelId} and this plot is ${plotNumber}. ` +
        'Its limits are not applied. Attach the sheet for this plot, or correct the plot ' +
        'number — a run bound by a neighbouring plot’s limits is the error this refuses.',
    };
  }

  const onSurvey = plotEdges ? edgesOnSurvey(plotEdges, sheet.surveyLegs) : undefined;
  const placed = onSurvey
    ? { edges: onSurvey.edges, ...(onSurvey.unmatched ? { edgesUnmatched: onSurvey.unmatched } : {}) }
    : {};
  const built = rulesFromInstrument(sheet.limits, {
    plotNumber,
    instrumentId: `${sheet.parcelId ?? plotNumber}@${sheet.issuedOn}`,
    /*
      An undated sheet gets the epoch as `validFrom`, not today's date. These
      records bypass the store's temporal window, so the field is inert here —
      but a `validFrom` of "whenever this ran" would be a date the document does
      not carry, invented by the clock, and it would look like provenance.
    */
    issuedOn: sheet.issuedOn === 'UNDATED' ? '1970-01-01' : sheet.issuedOn,
    authoredBy,
    ...(roadBoundaries === undefined ? {} : { roadBoundaries }),
    ...placed,
  });

  return {
    ...built,
    /* What intake read and no rule binds, listed beside what the binder declined. */
    notBound: [...built.notBound, ...(sheet.unapplied ?? [])],
    documentUri: sheet.documentUri,
    issuedOn: sheet.issuedOn,
  };
}

export function isRefusal(b: BoundSheet | SheetRefusal): b is SheetRefusal {
  return 'reason' in b;
}

/** What the plot's own sheet states for the boundaries of one class: one figure, or one per face. */
export type SheetSetback =
  | { readonly kind: 'FIXED'; readonly metres: string; readonly clause: string }
  | {
      /** `BY_FACE`: which face the boundary is. `BY_FACADE`: what its façade will be. */
      readonly kind: 'BY_FACE' | 'BY_FACADE';
      readonly faces: readonly FaceOption[];
      readonly clause: string;
    };

/** The sheet's setbacks per boundary class, the tower's and the podium's kept apart. */
export interface SheetSetbacks {
  readonly tower: Readonly<Record<string, SheetSetback>>;
  readonly podium: Readonly<Record<string, SheetSetback>>;
  /**
   * The same, per boundary, keyed by `seq` (17 Oct 2026). A per-side table binds
   * one boundary and not its class — side 1 is 5 m and side 2 is 7 m, both
   * neighbours — so the plot step reads this first. Absent where the caller gave
   * no boundaries.
   */
  readonly bySeq?: {
    readonly tower: Readonly<Record<string, SheetSetback>>;
    readonly podium: Readonly<Record<string, SheetSetback>>;
  };
}

const EDGE_CLASSES = ['ROAD', 'ADJACENT_PLOT', 'OPEN_SPACE', 'OTHER'] as const;

/**
 * What the sheet's rules say about each class of boundary on THIS plot.
 *
 * Resolved, not re-read: the same `resolveParameter` the envelope calls, over the
 * sheet's own rules only, in a context carrying this plot's number and its count
 * of road boundaries — so a "Front" that binds only on a one-road plot is shown
 * as a question on a two-road one, exactly as the engine will treat it. The plot
 * step reads this to say "tower setback, as the affection plan states" only
 * where the tower row states one, and "podium" where the figure is the podium's.
 * Nothing is computed: each figure is the rule's own.
 */
export function sheetSetbacksFor(
  rules: readonly RuleRecord[],
  plotNumber: string,
  frontageCount: number,
  edges?: readonly { readonly seq: number; readonly classification: string }[],
): SheetSetbacks {
  const one = (parameterId: string, edge: Record<string, unknown>): SheetSetback | undefined => {
    const r = resolveParameter(parameterId, rules, {
      plot: { plot_number: plotNumber, frontage_count: frontageCount },
      edge,
    });
    const g = r.governing;
    if (r.status !== ResolutionStatus.RESOLVED || !g) return undefined;
    const clause = g.rule.citation.sourceTextVerbatim;
    const faces = faceOptionsOf(g.rule);
    if (faces) {
      return { kind: decisionKindOf(g.rule) === DecisionKind.FACADE ? 'BY_FACADE' : 'BY_FACE', faces, clause };
    }
    return g.value.kind === 'scalar' ? { kind: 'FIXED', metres: g.value.value.toString(), clause } : undefined;
  };
  const read = (parameterOf: (cls: string) => string): Record<string, SheetSetback> => {
    const out: Record<string, SheetSetback> = {};
    for (const cls of EDGE_CLASSES) {
      const s = one(parameterOf(cls), { classification: cls });
      if (s) out[cls] = s;
    }
    return out;
  };
  const readSeq = (parameterOf: (cls: string) => string): Record<string, SheetSetback> => {
    const out: Record<string, SheetSetback> = {};
    for (const e of edges ?? []) {
      const s = one(parameterOf(e.classification), { classification: e.classification, seq: e.seq });
      if (s) out[String(e.seq)] = s;
    }
    return out;
  };
  return {
    tower: read((cls) => `setback.${cls.toLowerCase()}`),
    podium: read(podiumSetbackParameter),
    ...(edges
      ? { bySeq: { tower: readSeq((cls) => `setback.${cls.toLowerCase()}`), podium: readSeq(podiumSetbackParameter) } }
      : {}),
  };
}

/**
 * Whether a bound rule applies to THIS plot, on at least one of its boundaries.
 *
 * The sheet report's `bound` list printed every rule the binder emitted, which on
 * a one-road plot included the "which road is the front?" rule fenced to plots
 * with two — two `setback.road` rows, one of them for a plot this is not. Each
 * rule is held to the plot's own context: its number and road count, and, for a
 * boundary rule, each boundary's class and `seq` in turn.
 */
export function appliesToPlot(
  rule: RuleRecord,
  plot: {
    readonly plotNumber: string;
    readonly frontageCount: number;
    readonly edges?: readonly { readonly seq: number; readonly classification: string }[];
  },
): boolean {
  const plotCtx = { plot: { plot_number: plot.plotNumber, frontage_count: plot.frontageCount } };
  if (isApplicable(rule.applicability, plotCtx)) return true;
  return (plot.edges ?? []).some((e) =>
    isApplicable(rule.applicability, { ...plotCtx, edge: { classification: e.classification, seq: e.seq } }),
  );
}

/** A bound rule's value as the sheet panel prints it: the figure, or the figures by face. */
export function boundValueOf(rule: RuleRecord): string {
  const faces = faceOptionsOf(rule);
  if (faces) return faces.map((f) => `${f.face} ${f.metres === null ? 'not stated' : f.metres}`).join('; ');
  /*
    The sheet's dwelling-parking rule carries no single `value`: it is a
    threshold, and printing "undefined" beside it would read as a blank the
    sheet left. Its own terms are printed instead.
  */
  const a = rule.evaluatorArgs;
  if (a['fn'] === SHEET_PARKING_FN) {
    const on = a['measure'] === 'GFA' ? ' (GFA)' : a['measure'] === 'SALEABLE' ? ' (saleable)' : '';
    const studio = a['studioBays'] !== undefined ? `; studio ${String(a['studioBays'])}` : '';
    return `${String(a['baysAtOrBelow'])} per dwelling ≤ ${String(a['thresholdM2'])} m²${on}, ${String(a['baysAbove'])} above${studio}`;
  }
  return String(a['value']);
}

/**
 * Whether a sheet's parcel id and a plot number name the same plot.
 *
 * Compared on their digits and letters alone. The same parcel is written
 * `345-1234` on a form and `3451234` on a sheet, and rejecting a valid sheet over
 * a hyphen would teach people to work around the check rather than use it. What
 * it will not do is treat a missing or extra character as noise.
 */
export function sameParcel(a: string, b: string): boolean {
  const key = (s: string): string => s.toUpperCase().replace(/[^0-9A-Z]/g, '');
  return key(a) === key(b);
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

/** `StatedLimits` as JSON. `Decimal` becomes a string; `Citation` is already plain. */
export interface StoredSheetWire {
  readonly parcelId: string | null;
  readonly issuedOn: string;
  readonly documentUri: string;
  readonly far?: { readonly value: string; readonly citation: Citation };
  readonly gfaM2?: { readonly value: string; readonly citation: Citation };
  /** Absent on every sheet stored before 16 Oct 2026; such a sheet binds no derived FAR. */
  readonly plotAreaM2?: { readonly value: string; readonly citation: Citation };
  readonly coverage?: {
    readonly value: { podium?: string; tower?: string; raw: string };
    readonly citation: Citation;
  };
  readonly setbacks?: {
    readonly value: {
      podium: SetbackFaceWire;
      tower: SetbackFaceWire;
      raw: string;
      requiresDecision: boolean;
    };
    readonly citation: Citation;
  };
  readonly height?: { readonly value: HeightAllowance; readonly citation: Citation };
  /* Since 17 Oct 2026. Absent on every sheet stored before, which binds neither. */
  readonly setbacksBySide?: { readonly value: SideSetbackTableWire; readonly citation: Citation };
  readonly parking?: { readonly value: ParkingRequirementWire; readonly citation: Citation };
  readonly surveyLegs?: readonly SurveyLegWire[];
  readonly blocking?: readonly GapWire[];
  readonly unapplied?: readonly UnboundLimit[];
}

type SetbackCellWire =
  | { readonly kind: 'DISTANCE'; readonly metres: string }
  | { readonly kind: 'SEE_NOTES' | 'NOT_APPLICABLE'; readonly verbatim: string };

interface SideSetbackTableWire {
  readonly sides: readonly {
    readonly side: number;
    readonly building: SetbackCellWire;
    readonly podium: SetbackCellWire;
    readonly boundary?: number;
  }[];
  readonly raw: string;
  readonly placement: string;
}

interface ParkingRequirementWire {
  readonly dwelling?: {
    readonly baysAtOrBelow: number;
    readonly baysAbove: number;
    readonly thresholdM2: string;
    readonly measure: 'GFA' | 'UNSTATED';
    readonly studioBays?: number;
  };
  readonly byArea: readonly {
    readonly use: 'RETAIL' | 'COMMERCIAL' | 'OFFICE';
    readonly bays: number;
    readonly perM2: string;
    readonly measure: 'NET_AREA' | 'GFA' | 'UNSTATED';
  }[];
  readonly unread: readonly string[];
  readonly raw: string;
}

const cellOut = (c: SetbackCell): SetbackCellWire =>
  c.kind === 'DISTANCE' ? { kind: 'DISTANCE', metres: c.metres.toString() } : { kind: c.kind, verbatim: c.verbatim };
const cellIn = (c: SetbackCellWire): SetbackCell =>
  c.kind === 'DISTANCE' ? { kind: 'DISTANCE', metres: new Decimal(c.metres) } : { kind: c.kind, verbatim: c.verbatim };

function sidesOut(t: SideSetbackTable): SideSetbackTableWire {
  return {
    sides: t.sides.map((s) => ({
      side: s.side,
      building: cellOut(s.building),
      podium: cellOut(s.podium),
      ...(s.boundary === undefined ? {} : { boundary: s.boundary }),
    })),
    raw: t.raw,
    placement: t.placement,
  };
}

function sidesIn(t: SideSetbackTableWire): SideSetbackTable {
  return {
    sides: t.sides.map((s) => ({
      side: s.side,
      building: cellIn(s.building),
      podium: cellIn(s.podium),
      ...(s.boundary === undefined ? {} : { boundary: s.boundary }),
    })),
    raw: t.raw,
    placement: t.placement,
  };
}

function parkingOut(p: ParkingRequirement): ParkingRequirementWire {
  const d = p.dwelling;
  return {
    ...(d
      ? {
          dwelling: {
            baysAtOrBelow: d.baysAtOrBelow,
            baysAbove: d.baysAbove,
            thresholdM2: d.thresholdM2.toString(),
            measure: d.measure,
            ...(d.studioBays === undefined ? {} : { studioBays: d.studioBays }),
          },
        }
      : {}),
    byArea: p.byArea.map((a) => ({ use: a.use, bays: a.bays, perM2: a.perM2.toString(), measure: a.measure })),
    unread: p.unread,
    raw: p.raw,
  };
}

function parkingIn(p: ParkingRequirementWire): ParkingRequirement {
  const d = p.dwelling;
  return {
    ...(d
      ? {
          dwelling: {
            baysAtOrBelow: d.baysAtOrBelow,
            baysAbove: d.baysAbove,
            thresholdM2: new Decimal(d.thresholdM2),
            measure: d.measure,
            ...(d.studioBays === undefined ? {} : { studioBays: d.studioBays }),
          },
        }
      : {}),
    byArea: p.byArea.map((a) => ({ use: a.use, bays: a.bays, perM2: new Decimal(a.perM2), measure: a.measure })),
    unread: p.unread,
    raw: p.raw,
  };
}

type SetbackValueWire =
  | { readonly kind: 'FIXED'; readonly metres: string }
  | {
      readonly kind: 'CONDITIONAL';
      readonly options: readonly { readonly condition: string; readonly metres: string }[];
    };

interface SetbackFaceWire {
  readonly front?: SetbackValueWire;
  readonly side?: SetbackValueWire;
  readonly rear?: SetbackValueWire;
}

const faceOut = (f: {
  front?: SetbackValue;
  side?: SetbackValue;
  rear?: SetbackValue;
}): SetbackFaceWire => {
  const one = (v: SetbackValue | undefined): SetbackValueWire | undefined =>
    v === undefined
      ? undefined
      : v.kind === 'FIXED'
        ? { kind: 'FIXED', metres: v.metres.toString() }
        : {
            kind: 'CONDITIONAL',
            options: v.options.map((o) => ({ condition: o.condition, metres: o.metres.toString() })),
          };
  const front = one(f.front);
  const side = one(f.side);
  const rear = one(f.rear);
  return { ...(front ? { front } : {}), ...(side ? { side } : {}), ...(rear ? { rear } : {}) };
};

const faceIn = (f: SetbackFaceWire): { front?: SetbackValue; side?: SetbackValue; rear?: SetbackValue } => {
  const one = (v: SetbackValueWire | undefined): SetbackValue | undefined =>
    v === undefined
      ? undefined
      : v.kind === 'FIXED'
        ? { kind: 'FIXED', metres: new Decimal(v.metres) }
        : {
            kind: 'CONDITIONAL',
            options: v.options.map((o) => ({
              condition: o.condition,
              metres: new Decimal(o.metres),
            })),
          };
  const front = one(f.front);
  const side = one(f.side);
  const rear = one(f.rear);
  return { ...(front ? { front } : {}), ...(side ? { side } : {}), ...(rear ? { rear } : {}) };
};

export function serialiseSheet(sheet: StoredSheet): StoredSheetWire {
  const l = sheet.limits;
  return {
    parcelId: sheet.parcelId,
    issuedOn: sheet.issuedOn,
    documentUri: sheet.documentUri,
    ...(l.far ? { far: { value: l.far.value.toString(), citation: l.far.citation } } : {}),
    ...(l.gfaM2 ? { gfaM2: { value: l.gfaM2.value.toString(), citation: l.gfaM2.citation } } : {}),
    ...(l.plotAreaM2
      ? { plotAreaM2: { value: l.plotAreaM2.value.toString(), citation: l.plotAreaM2.citation } }
      : {}),
    ...(l.coverage
      ? {
          coverage: {
            value: {
              ...(l.coverage.value.podium ? { podium: l.coverage.value.podium.toString() } : {}),
              ...(l.coverage.value.tower ? { tower: l.coverage.value.tower.toString() } : {}),
              raw: l.coverage.value.raw,
            },
            citation: l.coverage.citation,
          },
        }
      : {}),
    ...(l.setbacks
      ? {
          setbacks: {
            value: {
              podium: faceOut(l.setbacks.value.podium),
              tower: faceOut(l.setbacks.value.tower),
              raw: l.setbacks.value.raw,
              requiresDecision: l.setbacks.value.requiresDecision,
            },
            citation: l.setbacks.citation,
          },
        }
      : {}),
    ...(l.height ? { height: { value: l.height.value, citation: l.height.citation } } : {}),
    ...(l.setbacksBySide
      ? { setbacksBySide: { value: sidesOut(l.setbacksBySide.value), citation: l.setbacksBySide.citation } }
      : {}),
    ...(l.parking ? { parking: { value: parkingOut(l.parking.value), citation: l.parking.citation } } : {}),
    ...(sheet.surveyLegs ? { surveyLegs: sheet.surveyLegs } : {}),
    ...(sheet.blocking ? { blocking: sheet.blocking } : {}),
    ...(sheet.unapplied ? { unapplied: sheet.unapplied } : {}),
  };
}

export function deserialiseSheet(w: StoredSheetWire): StoredSheet {
  const limits: StatedLimits = {
    ...(w.far ? { far: { value: new Decimal(w.far.value), citation: w.far.citation } } : {}),
    ...(w.gfaM2 ? { gfaM2: { value: new Decimal(w.gfaM2.value), citation: w.gfaM2.citation } } : {}),
    ...(w.plotAreaM2
      ? { plotAreaM2: { value: new Decimal(w.plotAreaM2.value), citation: w.plotAreaM2.citation } }
      : {}),
    ...(w.coverage
      ? {
          coverage: {
            value: {
              ...(w.coverage.value.podium ? { podium: new Decimal(w.coverage.value.podium) } : {}),
              ...(w.coverage.value.tower ? { tower: new Decimal(w.coverage.value.tower) } : {}),
              raw: w.coverage.value.raw,
            },
            citation: w.coverage.citation,
          },
        }
      : {}),
    ...(w.setbacks
      ? {
          setbacks: {
            value: {
              podium: faceIn(w.setbacks.value.podium),
              tower: faceIn(w.setbacks.value.tower),
              raw: w.setbacks.value.raw,
              requiresDecision: w.setbacks.value.requiresDecision,
            },
            citation: w.setbacks.citation,
          },
        }
      : {}),
    ...(w.height ? { height: { value: w.height.value, citation: w.height.citation } } : {}),
    ...(w.setbacksBySide
      ? { setbacksBySide: { value: sidesIn(w.setbacksBySide.value), citation: w.setbacksBySide.citation } }
      : {}),
    ...(w.parking ? { parking: { value: parkingIn(w.parking.value), citation: w.parking.citation } } : {}),
  };
  return {
    limits,
    parcelId: w.parcelId,
    issuedOn: w.issuedOn,
    documentUri: w.documentUri,
    ...(w.surveyLegs ? { surveyLegs: w.surveyLegs } : {}),
    ...(w.blocking ? { blocking: w.blocking } : {}),
    ...(w.unapplied ? { unapplied: w.unapplied } : {}),
  };
}
