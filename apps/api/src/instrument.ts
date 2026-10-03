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
  type SetbackSchedule,
  type SetbackValue,
  type StatedLimit,
  type StatedLimits,
  type Traced,
} from '@envelope/core';
import { parseAffectionPlan, type AffectionPlanFacts } from '@envelope/intake';
import { rulesFromInstrument, type InstrumentRules } from '@envelope/rules';
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
  const coverage = lift<CoverageSchedule>(facts.coverage);
  const setbacks = lift<SetbackSchedule>(facts.setbacks);
  const height = lift<HeightAllowance>(facts.height);

  return {
    ...(far ? { far } : {}),
    ...(gfaM2 ? { gfaM2 } : {}),
    ...(coverage ? { coverage } : {}),
    ...(setbacks ? { setbacks } : {}),
    ...(height ? { height } : {}),
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
  });

  return { ...built, documentUri: sheet.documentUri, issuedOn: sheet.issuedOn };
}

export function isRefusal(b: BoundSheet | SheetRefusal): b is SheetRefusal {
  return 'reason' in b;
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
      bySide?: readonly SideWire[];
    };
    readonly citation: Citation;
  };
  readonly height?: { readonly value: HeightAllowance; readonly citation: Citation };
}

type SetbackValueWire =
  | { readonly kind: 'FIXED'; readonly metres: string }
  | {
      readonly kind: 'CONDITIONAL';
      readonly options: readonly { readonly condition: string; readonly metres: string }[];
    }
  | {
      readonly kind: 'HEIGHT_SHARE';
      readonly share: string;
      readonly minMetres?: string;
      readonly maxMetres?: string;
      readonly from: string;
    };

interface SideWire {
  readonly side: string;
  readonly building?: SetbackValueWire;
  readonly podium?: SetbackValueWire;
  readonly buildingNotApplicable?: boolean;
  readonly podiumNotApplicable?: boolean;
}

/** One setback value to its stored form and back. Every kind, or the sheet loses one. */
const valueOut = (v: SetbackValue): SetbackValueWire =>
  v.kind === 'FIXED'
    ? { kind: 'FIXED', metres: v.metres.toString() }
    : v.kind === 'CONDITIONAL'
      ? {
          kind: 'CONDITIONAL',
          options: v.options.map((o) => ({ condition: o.condition, metres: o.metres.toString() })),
        }
      : {
          kind: 'HEIGHT_SHARE',
          share: v.share.toString(),
          ...(v.minMetres ? { minMetres: v.minMetres.toString() } : {}),
          ...(v.maxMetres ? { maxMetres: v.maxMetres.toString() } : {}),
          from: v.from,
        };

const valueIn = (v: SetbackValueWire): SetbackValue =>
  v.kind === 'FIXED'
    ? { kind: 'FIXED', metres: new Decimal(v.metres) }
    : v.kind === 'CONDITIONAL'
      ? {
          kind: 'CONDITIONAL',
          options: v.options.map((o) => ({ condition: o.condition, metres: new Decimal(o.metres) })),
        }
      : {
          kind: 'HEIGHT_SHARE',
          share: new Decimal(v.share),
          ...(v.minMetres ? { minMetres: new Decimal(v.minMetres) } : {}),
          ...(v.maxMetres ? { maxMetres: new Decimal(v.maxMetres) } : {}),
          from: v.from,
        };

type Side = NonNullable<SetbackSchedule['bySide']>[number];
const sideOut = (s: Side): SideWire => ({
  side: s.side,
  ...(s.building ? { building: valueOut(s.building) } : {}),
  ...(s.podium ? { podium: valueOut(s.podium) } : {}),
  ...(s.buildingNotApplicable ? { buildingNotApplicable: true } : {}),
  ...(s.podiumNotApplicable ? { podiumNotApplicable: true } : {}),
});
const sideIn = (s: SideWire): Side => ({
  side: s.side,
  ...(s.building ? { building: valueIn(s.building) } : {}),
  ...(s.podium ? { podium: valueIn(s.podium) } : {}),
  ...(s.buildingNotApplicable ? { buildingNotApplicable: true } : {}),
  ...(s.podiumNotApplicable ? { podiumNotApplicable: true } : {}),
});

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
    v === undefined ? undefined : valueOut(v);
  const front = one(f.front);
  const side = one(f.side);
  const rear = one(f.rear);
  return { ...(front ? { front } : {}), ...(side ? { side } : {}), ...(rear ? { rear } : {}) };
};

const faceIn = (f: SetbackFaceWire): { front?: SetbackValue; side?: SetbackValue; rear?: SetbackValue } => {
  const one = (v: SetbackValueWire | undefined): SetbackValue | undefined =>
    v === undefined ? undefined : valueIn(v);
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
              ...(l.setbacks.value.bySide ? { bySide: l.setbacks.value.bySide.map(sideOut) } : {}),
            },
            citation: l.setbacks.citation,
          },
        }
      : {}),
    ...(l.height ? { height: { value: l.height.value, citation: l.height.citation } } : {}),
  };
}

export function deserialiseSheet(w: StoredSheetWire): StoredSheet {
  const limits: StatedLimits = {
    ...(w.far ? { far: { value: new Decimal(w.far.value), citation: w.far.citation } } : {}),
    ...(w.gfaM2 ? { gfaM2: { value: new Decimal(w.gfaM2.value), citation: w.gfaM2.citation } } : {}),
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
              ...(w.setbacks.value.bySide ? { bySide: w.setbacks.value.bySide.map(sideIn) } : {}),
            },
            citation: w.setbacks.citation,
          },
        }
      : {}),
    ...(w.height ? { height: { value: w.height.value, citation: w.height.citation } } : {}),
  };
  return {
    limits,
    parcelId: w.parcelId,
    issuedOn: w.issuedOn,
    documentUri: w.documentUri,
  };
}
