/**
 * The report model and the JSON export — `FR-OUT-001`, PRD §3.4.
 *
 * ---
 *
 * ## Why this package cannot compute anything
 *
 * `@envelope/report` depends on `@envelope/core` and `decimal.js`. Nothing else.
 * That is the same structural argument Principle 4 makes about the invariant
 * layer, applied one layer further out: a report package that can reach the
 * capacity engine can *recompute* a number, and a report that can recompute a
 * number can disagree with the engine that produced it. Two different values for
 * the same quantity — one in the PDF, one on screen — is the failure this
 * boundary exists to make impossible, and it is not hypothetical: it is what
 * happens the first time someone "just rounds it for the summary page".
 *
 * So the model below carries **no `Decimal`, and no `number` for any quantity a
 * reader will see**. Every such quantity arrives either inside a `TracedWire`
 * (already `String(value)`-ed by `core`'s `toWire`) or as a
 * {@link DecimalString}, quantised upstream by `qArea` / `qRatio`. The `number`s
 * that remain in this file are counts and ordinals — fixpoint iterations, a
 * sensitivity rank, a rule tally — none of which is a measured magnitude and
 * none of which this package derives.
 *
 * `Decimal` is imported for exactly one purpose, in {@link decimalString}: to
 * *reject* a string that is not a number. It parses; it never computes.
 *
 * ## Why decimals cross the wire as strings
 *
 * Three reasons, in increasing order of how expensive they are to discover late:
 *
 * 1. **JSON numbers are IEEE-754 doubles in every consumer that matters.** A
 *    permitted GFA of `16000.05` re-read as `16000.049999999999` is the same
 *    class of silent, plausible, 4%-wrong-for-six-months defect `numeric.ts` was
 *    written to prevent — except it happens *after* the engine has been careful,
 *    which is worse, because the provenance graph still says the number is
 *    `DERIVED`.
 * 2. **JSON numbers have no canonical text form.** `1.0`, `1`, `1e0` and `1.00`
 *    all parse to the same double and re-serialise to whichever form the writer
 *    happens to choose. §13.4 requires the deterministic portion of the pipeline
 *    to re-execute *byte-identically*; a quantity whose serialisation is not
 *    stable cannot participate in that guarantee.
 * 3. **Trailing zeros are information.** `1,625.00 m²` and `1,625 m²` are the
 *    same magnitude and different statements about precision. `Decimal` keeps
 *    the distinction; a double destroys it silently.
 *
 * ## Round-trip
 *
 * `FR-OUT-001 AC4` — "JSON round-trips: re-importing reproduces the identical
 * report" — is met by construction rather than by care: the model is already a
 * JSON value algebra, so {@link toJson} is a structural wrap and
 * {@link fromJson} is its validated inverse. `fromJson` additionally recomputes
 * the run fingerprint and refuses a payload whose digest does not match the one
 * stored beside it, which is what turns AC4 from a serialisation property into
 * an integrity property an auditor would accept.
 */

import {
  ANNEX_VERSION,
  CapacityBand,
  ClaimStatus,
  Decimal,
  EdgeKind,
  NodeKind,
  ParkingInFar,
  ProvenanceClass,
  RENDER_HINTS,
  RenderHint,
  assertAnnexSigned,
  metric,
  pendingApproval,
} from '@envelope/core';
import type {
  Actor,
  Citation,
  ClaimStatement,
  NodeId,
  ProvenanceEdge,
  ProvenanceNode,
  TracedWire,
} from '@envelope/core';

import { canonicalJson, runFingerprint, type RunFingerprint } from './reproducibility.js';

// ---------------------------------------------------------------------------
// The JSON value algebra
// ---------------------------------------------------------------------------

export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = readonly JsonValue[];
export interface JsonObject {
  readonly [key: string]: JsonValue;
}
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

/**
 * A decimal magnitude in exact text form: optional sign, digits, optional
 * fraction. No exponent, no separators, no unit.
 *
 * Branded so a `number` cannot be passed where a quantity is expected — the same
 * reason `core` brands `Mm` and `Mm2`. The brand is phantom, so a
 * `DecimalString` survives `JSON.parse` unchanged and round-trip identity holds.
 */
declare const DECIMAL_STRING: unique symbol;
export type DecimalString = string & { readonly [DECIMAL_STRING]: true };

/** Version of the export envelope. Bumped when the document shape changes. */
export const REPORT_SCHEMA_VERSION = '1.0.0' as const;

// ---------------------------------------------------------------------------
// Failure modes. Each of these blocks emission; none is a warning.
// ---------------------------------------------------------------------------

/** A payload offered to {@link fromJson} is not a well-formed run export. */
export class ReportImportError extends Error {
  override readonly name = 'ReportImportError';
  constructor(
    message: string,
    readonly at: string,
  ) {
    super(`${message} (at ${at})`);
  }
}

/**
 * An invariant reported `FAIL` and something tried to render it anyway.
 *
 * PRD §12.3: "Failure blocks emission. Never a warning, never a configurable
 * severity." The report *is* the emission, so the refusal belongs here and not
 * only in the caller — a severity switch upstream must not be able to produce an
 * artifact that says `FAIL` in a table on page nine and prints a number on the
 * face page.
 */
export class InvariantFailureError extends Error {
  override readonly name = 'InvariantFailureError';
  constructor(readonly failed: readonly string[]) {
    super(
      `emission blocked: invariant(s) ${failed.join(', ')} failed. PRD §12.3 — ` +
        `invariant failure blocks emission; it is never a warning and never a ` +
        `configurable severity. Fix the configuration or the invariant, not the report.`,
    );
  }
}

/**
 * The run cites a metric-definitions annex version other than the one compiled
 * into this build.
 *
 * The report prints inclusions and exclusions from the *compiled* annex (via
 * {@link metric}). Printing them under a different version id would be a
 * fabricated citation: the reader would believe the definitions shown are the
 * ones the numbers were computed under. `FR-DEF-001 AC4`.
 */
export class AnnexVersionMismatchError extends Error {
  override readonly name = 'AnnexVersionMismatchError';
  constructor(
    readonly runVersion: string,
    readonly compiledVersion: string,
  ) {
    super(
      `the run was computed against metric definitions annex ${runVersion} but this ` +
        `build compiles ${compiledVersion}. FR-DEF-001 AC4 requires the report to cite ` +
        `the annex the numbers were produced under; rendering one version's numbers ` +
        `beside another version's inclusions and exclusions is a fabricated citation.`,
    );
  }
}

/**
 * Something tried to state a claim the product may never make.
 *
 * Principle 7 and §2.2: regulatory validity is "never claimed. Not obtainable."
 * The report does not take the caller's word for that line — see
 * {@link assertEmittable}.
 */
export class ClaimOverreachError extends Error {
  override readonly name = 'ClaimOverreachError';
  constructor(readonly status: ClaimStatus) {
    super(
      `regulatory validity was reported as ${status}. PRD §2.2 and Principle 7: the ` +
        `only admissible statuses are NEVER_CLAIMED and NOT_ASSESSED. No output, no ` +
        `report and no marketing material may describe this engine's result as ` +
        `compliance.`,
    );
  }
}

/**
 * A traced value arrived with a render hint that does not match its provenance
 * class.
 *
 * §13.1 calls the amber `ASSUMED` treatment "the most important UI decision in
 * the product… softening it for aesthetic reasons defeats the product". The hint
 * travels on the wire so the frontend cannot drift from the engine; this check
 * closes the one remaining hole, which is editing the payload. An `ASSUMED`
 * value relabelled `NEUTRAL_WITH_CITATION` in a JSON file will not render.
 */
export class RenderHintTamperedError extends Error {
  override readonly name = 'RenderHintTamperedError';
  constructor(
    readonly parameterId: string,
    readonly provenanceClass: ProvenanceClass,
    readonly renderHint: RenderHint,
  ) {
    super(
      `${parameterId} carries provenance class ${provenanceClass} but render hint ` +
        `${renderHint}; §13.1 fixes it at ${RENDER_HINTS[provenanceClass]}. The hint is ` +
        `carried on the wire precisely so that the uncertainty treatment cannot be ` +
        `softened downstream.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Face-page provenance — FR-OUT-001 AC1
// ---------------------------------------------------------------------------

/**
 * Approval state of the rule set the run was computed against.
 *
 * A discriminated union rather than a boolean plus an optional string, so that
 * "DRAFT with no warning to print" is not a representable state. The warning
 * text is supplied by the caller — `@envelope/rules` exports `SEED_RULES_WARNING`
 * and this package must not import it. A banner authored here instead would be a
 * second copy, free to drift from the one the rule loader enforces.
 */
export const RuleSetApproval = {
  APPROVED: 'APPROVED',
  DRAFT: 'DRAFT',
} as const;
export type RuleSetApproval = (typeof RuleSetApproval)[keyof typeof RuleSetApproval];

export interface ApprovedRuleSet {
  readonly approval: typeof RuleSetApproval.APPROVED;
  readonly ruleSetVersion: string;
  /** Content hash of the rule records as stored. Part of the run fingerprint. */
  readonly contentHash: string;
}

export interface DraftRuleSet {
  readonly approval: typeof RuleSetApproval.DRAFT;
  readonly ruleSetVersion: string;
  readonly contentHash: string;
  /** Verbatim banner text. Rendered at the top of both the JSON and the HTML. */
  readonly warning: string;
}

export type RuleSetProvenance = ApprovedRuleSet | DraftRuleSet;

/** The named human of gate `G4` (§21.1). Absent until an export is reviewed. */
export interface Reviewer {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly acknowledgedAt: string;
}

/**
 * The parking-in-FAR declaration — `FR-DEF-002`, and the first of §20.2's "three
 * moments that carry the product".
 *
 * `value` is the traced declaration itself, so the face page shows *how* the
 * treatment was settled rather than merely what it is. `FR-DEF-002` admits only
 * `DERIVED` (from a citation) or `USER_SET` (by a named user); `ASSUMED` is
 * forbidden and there is no default, because the choice swings capacity 15–35%.
 */
export interface ParkingInFarDeclaration {
  readonly treatment: ParkingInFar;
  readonly value: TracedWire;
  readonly citation: Citation | null;
  readonly declaredBy: string | null;
}

// ---------------------------------------------------------------------------
// §3.4 item 1 — buildable envelope, binding constraint named per dimension
// ---------------------------------------------------------------------------

export interface RunnerUpConstraint {
  readonly ruleId: string;
  readonly label: string;
  readonly value: DecimalString;
  /** `FR-CAP-001`: near-ties are reported, because that is where to negotiate. */
  readonly withinOnePercent: boolean;
}

export interface BindingConstraintView {
  readonly ruleId: string;
  readonly label: string;
  readonly value: DecimalString;
  readonly unit: string;
  readonly citation: Citation | null;
  readonly runnerUp: RunnerUpConstraint | null;
}

export interface EnvelopeDimensionView {
  /** Stable machine name, e.g. `podium_footprint`. */
  readonly dimension: string;
  readonly label: string;
  /**
   * Annex term this dimension is measured under, or `null` where the dimension
   * is not an area (height, level count). Must appear in
   * {@link RunReport.areaTermsUsed}, and `metric()` must resolve it —
   * `FR-DEF-001 AC5`.
   */
  readonly metricId: string | null;
  readonly value: TracedWire;
  readonly binding: BindingConstraintView;
}

export interface PlotEdgeView {
  readonly seq: number;
  readonly classification: string;
  readonly roadHierarchy: string | null;
  readonly lengthM: DecimalString;
  readonly appliedSetbackM: DecimalString;
  readonly setbackRuleId: string;
}

export interface EnvelopeSection {
  readonly dimensions: readonly EnvelopeDimensionView[];
  readonly edges: readonly PlotEdgeView[];
  /**
   * §11.7's bounded fixpoint. Reported because a solver that had to iterate is a
   * fact about the answer: the setback that produced this footprint depends on
   * the level count that footprint implies, and a reader entitled to audit the
   * number is entitled to know the two were settled jointly.
   */
  readonly fixpointIterations: number;
  readonly fixpointConverged: boolean;
}

// ---------------------------------------------------------------------------
// §3.4 item 2 — three capacity bands with derivations
// ---------------------------------------------------------------------------

export interface DerivationInput {
  readonly name: string;
  readonly value: TracedWire;
}

export interface CapacityBandView {
  readonly band: CapacityBand;
  readonly label: string;
  /** §15.1's question column, per band. Kept verbatim because it is the point. */
  readonly question: string;
  readonly gfa: TracedWire;
  readonly metricId: string;
  /** The formula written the way a human reads it, e.g. `FAR 5.0 × 3,200 m²`. */
  readonly derivation: string;
  readonly inputs: readonly DerivationInput[];
  readonly governing: boolean;
}

export interface CapacitySection {
  readonly bands: readonly CapacityBandView[];
  readonly governingBand: CapacityBand;
  readonly governingGfa: TracedWire;
  readonly governingConstraint: BindingConstraintView;
  readonly nextBindingBand: CapacityBand;
  /** §15.2 — headroom is what tells a developer where to push. */
  readonly headroomToNextM2: DecimalString;
  /** §15.4 — the floor that does not fit is reported, never absorbed. */
  readonly integerGranularityLossM2: DecimalString;
  /** §15.3 — default 1.00, `USER_SET`, never a system estimate. */
  readonly userRealismDiscount: TracedWire;
  readonly levels: TracedWire;
  /**
   * The area table a submission drawing carries — allowed, proposed, and the
   * floors that make it up, in m² and ft². Optional: a run stored before the
   * statement existed has none, and one rebuilt from its numbers would be a
   * table nobody's engine produced.
   */
  readonly gfaStatement?: GfaStatementSection;
}

/** An area as the engine stated it in both units. */
export interface StatedArea {
  readonly m2: DecimalString;
  readonly ft2: DecimalString;
}

export interface GfaStatementSection {
  readonly plotArea: StatedArea;
  readonly allowed: TracedWire;
  readonly allowedFt2: DecimalString;
  readonly rows: readonly {
    readonly kind: 'RESIDENTIAL' | 'PARKING';
    readonly levelIds: readonly string[];
    readonly count: number;
    readonly perLevel: TracedWire | null;
    readonly perLevelFt2: DecimalString | null;
    readonly area: TracedWire;
    readonly areaFt2: DecimalString;
  }[];
  readonly proposed: TracedWire;
  readonly proposedFt2: DecimalString;
  readonly remaining: TracedWire;
  readonly remainingFt2: DecimalString;
  readonly partFloorNotPlaced: StatedArea;
}

// ---------------------------------------------------------------------------
// §3.4 item 3 — parking demand, area, level count, headroom
// ---------------------------------------------------------------------------

export interface ParkingSection {
  readonly residentBays: TracedWire;
  readonly visitorBays: TracedWire;
  readonly totalBays: TracedWire;
  readonly bayAreaFactorM2: TracedWire;
  readonly requiredAreaM2: TracedWire;
  readonly availableAreaPerLevelM2: TracedWire;
  readonly levelsRequired: TracedWire;
  readonly levelsAvailable: TracedWire;
  readonly headroomBays: DecimalString;
  readonly supportableUnitCeiling: TracedWire;
  readonly podiumImplication: string;
  /** §24.1: "parking demand → area → levels → headroom, **with cited ratios**". */
  readonly ratioCitations: readonly Citation[];
  /** Annex terms the parking figures are measured under. `FR-DEF-001 AC5`. */
  readonly metricIds: readonly string[];
}

// ---------------------------------------------------------------------------
// §3.4 item 4 — applicable rules, plus rules considered and excluded
// ---------------------------------------------------------------------------

/**
 * Why a rule that was considered did not govern.
 *
 * §11.5 step 3 requires every non-governing candidate to be recorded and
 * "visible to the user". A report that lists only what applied cannot be audited
 * for what was missed — and what was missed is the whole of claim two in §2.2,
 * rule coverage, which is the claim we can only support *partially*.
 */
export const RuleDisposition = {
  APPLIED: 'APPLIED',
  /** The applicability predicate did not match this plot. */
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  /** Lost overlap resolution to a more specific or more restrictive rule. */
  SUPERSEDED: 'SUPERSEDED',
  /** Applicable but not checkable at this fidelity — §16.1 `DEFERRED`. */
  DEFERRED: 'DEFERRED',
  /** In the store but not approved by a named human — Principle 9. */
  NOT_APPROVED: 'NOT_APPROVED',
  /** Outside the Phase 0 slice: another land use, another community. */
  OUT_OF_SCOPE: 'OUT_OF_SCOPE',
} as const;
export type RuleDisposition = (typeof RuleDisposition)[keyof typeof RuleDisposition];

export interface AppliedRuleView {
  readonly ruleId: string;
  readonly parameterId: string;
  readonly label: string;
  readonly ruleClass: string;
  readonly value: string;
  readonly unit: string | null;
  readonly citation: Citation;
}

export interface ExcludedRuleView {
  readonly ruleId: string;
  readonly parameterId: string;
  readonly label: string;
  readonly disposition: RuleDisposition;
  /** Prose, addressed to a reviewing architect. Never a bare status code. */
  readonly reason: string;
  readonly supersededByRuleId: string | null;
  readonly citation: Citation;
}

export interface RulesSection {
  readonly applied: readonly AppliedRuleView[];
  readonly excluded: readonly ExcludedRuleView[];
  /**
   * Counts feeding §16.5's `RULE COVERAGE` line. Integers, supplied.
   *
   * The report prints `N of M`; it does not compute the percentage. The
   * percentage belongs in {@link ClaimStatement.ruleCoverage}, where the
   * validation module put it, so that the two cannot disagree on the same page.
   */
  readonly encodedCount: number;
  readonly identifiedApplicableCount: number;
  readonly deferredCount: number;
}

// ---------------------------------------------------------------------------
// §3.4 item 5 — assumption register, sensitivity-ranked
// ---------------------------------------------------------------------------

export interface AssumptionEntry {
  /**
   * 1 = most sensitive. The engine's ranking.
   *
   * The report orders by this integer and never re-ranks: comparing supplied
   * ordinals is presentation, comparing `relativeEffect` magnitudes would be
   * arithmetic, and this package does no arithmetic.
   */
  readonly rank: number;
  readonly parameterId: string;
  readonly label: string;
  readonly value: TracedWire;
  /** `Tracer.assumed` refuses an assumption without one; §13.3 requires it here. */
  readonly basis: string;
  /** What was perturbed to measure the effect, e.g. `+3 m²/bay`. */
  readonly perturbation: string;
  /** Measured relative effect on governing capacity. The ranking key. */
  readonly relativeEffect: DecimalString;
  /** `FR-ASM-001 AC2`: "+3 m²/bay removes 1 floor: −1,060 m² GFA, −8 units." */
  readonly impactStatement: string;
}

// ---------------------------------------------------------------------------
// §3.4 item 6 — invariant results
// ---------------------------------------------------------------------------

export const InvariantStatus = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  /** The invariant does not bear on this configuration. */
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  /**
   * In the catalogue, and not run.
   *
   * Five of §12.2's eighteen (INV-02/04/05/06/07) need a unit schedule Phase 0
   * does not generate. "Not assessed" is published rather than omitted, and is
   * rendered grey-hatched — §20.3. An invariant silently absent from the table
   * reads as an invariant that passed.
   */
  NOT_ASSESSED: 'NOT_ASSESSED',
} as const;
export type InvariantStatus = (typeof InvariantStatus)[keyof typeof InvariantStatus];

export interface InvariantOutcome {
  readonly invariantId: string;
  readonly statement: string;
  readonly tolerance: string;
  readonly status: InvariantStatus;
  readonly observed: DecimalString | null;
  readonly expected: DecimalString | null;
  readonly detail: string;
}

// ---------------------------------------------------------------------------
// §3.4 item 8 — deferred-check list
// ---------------------------------------------------------------------------

/**
 * A rule that was applicable and was not assessed.
 *
 * Structurally identical to `@envelope/rules`' `DeferredCheck`, and deliberately
 * re-declared rather than imported: importing it would put the rule engine in
 * this package's dependency graph for the sake of five fields, and the whole
 * point of the boundary is that the report cannot reach a package that computes.
 * The duplication is the cheaper of the two costs, and it is the one the type
 * checker catches at the call site when the shapes diverge.
 */
export interface DeferredCheckEntry {
  readonly ruleId: string;
  readonly parameterId: string;
  readonly label: string;
  readonly reason: string;
  readonly citation: Citation;
}

// ---------------------------------------------------------------------------
// Inputs persisted for §13.4
// ---------------------------------------------------------------------------

export interface UserInputRecord {
  readonly parameterId: string;
  readonly label: string;
  /** Stringified at the boundary. See the header note on decimals as strings. */
  readonly value: string;
  readonly unit: string | null;
  readonly enteredBy: Actor;
  readonly enteredAt: string;
}

export interface ProvenanceExport {
  readonly nodes: readonly ProvenanceNode[];
  readonly edges: readonly ProvenanceEdge[];
}

export interface PlotSummary {
  readonly plotId: string;
  readonly plotNumber: string;
  readonly community: string;
  readonly landUse: string;
  readonly shapeClass: string;
  readonly statedAreaM2: DecimalString | null;
  readonly computedAreaM2: DecimalString;
  /** `FR-PLT-001 AC2` — a >2% stated/computed deviation. Printed, never hidden. */
  readonly areaMismatch: boolean;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

/**
 * Everything the report renders. Nothing here is computed by this package.
 *
 * §3.4's nine items map onto this type as: `envelope` (1), `capacity` (2),
 * `parking` (3), `rules` (4), `assumptions` (5), `invariants` (6), `claim` (7),
 * `deferredChecks` (8). Item 9 — "PDF report + JSON" — is the pair of functions
 * {@link toJson} and `toHtml`.
 */
export interface RunReport {
  readonly runId: string;
  readonly tenantId: string;
  /**
   * Caller-supplied instant. Deliberately **not** part of the run fingerprint —
   * see `reproducibility.ts`. Two renders of one run are one run.
   */
  readonly producedAt: string;
  readonly engineVersion: string;
  /** `FR-DEF-001 AC4`. Must equal the annex compiled into this build. */
  readonly metricDefinitionsVersion: string;
  readonly ruleSet: RuleSetProvenance;
  readonly reviewer: Reviewer | null;
  /**
   * The professional-use disclaimer. Taken as input and never authored here:
   * §24.4 requires it to be "reviewed by UAE counsel", which is not a decision
   * an engineer makes inside a template. The five-way claim statement is a
   * different thing and *is* ours — it is structural, not a disclaimer, and
   * §16.5 fixes its wording.
   */
  readonly disclaimer: string;
  readonly plot: PlotSummary;
  readonly parkingInFar: ParkingInFarDeclaration;
  readonly envelope: EnvelopeSection;
  readonly capacity: CapacitySection;
  readonly parking: ParkingSection;
  readonly rules: RulesSection;
  readonly assumptions: readonly AssumptionEntry[];
  readonly invariants: readonly InvariantOutcome[];
  readonly claim: ClaimStatement;
  readonly deferredChecks: readonly DeferredCheckEntry[];
  readonly provenance: ProvenanceExport;
  /** Post-extraction structured inputs, as persisted. Hashed verbatim (§13.4). */
  readonly structuredInputs: JsonObject;
  readonly userInputs: readonly UserInputRecord[];
  /**
   * Every annex term any figure in this run is measured under.
   *
   * `metric()` must resolve each or {@link assertEmittable} throws — the
   * mechanical form of `FR-DEF-001 AC5` at the last boundary before a human
   * reads the number. `INV-15` checks the same property independently upstream,
   * which is the point of checking it twice.
   */
  readonly areaTermsUsed: readonly string[];
}

/** The exported document. `SEED_RULES_WARNING` is first by design — see below. */
export interface RunExportDocument {
  /**
   * Present only when the run was computed on DRAFT rules.
   *
   * Screaming snake case for two reasons. It reads as a shout in a payload of
   * camelCase; and in the canonical key-sorted serialisation an initial `S`
   * (U+0053) sorts ahead of every lowercase key, so it remains the first thing a
   * consumer encounters even when the keys have been reordered. A consumer that
   * reads nothing else still sees it.
   */
  readonly SEED_RULES_WARNING?: string;
  readonly schemaVersion: string;
  readonly fingerprint: RunFingerprint;
  readonly run: RunReport;
}

// ---------------------------------------------------------------------------
// Construction and validation of a decimal magnitude
// ---------------------------------------------------------------------------

const PLAIN_DECIMAL = /^-?\d+(?:\.\d+)?$/;

/**
 * Brand a string as an exact decimal magnitude, rejecting anything else.
 *
 * The regular expression fixes the *form* — no exponent, no separators, no
 * leading `+` — because a magnitude with more than one spelling cannot support
 * §13.4's byte-identical guarantee. `Decimal` then confirms the string is a
 * number the engine could have produced. That parse is the only appearance of
 * `Decimal` in this package: it rejects, it never computes.
 */
export function decimalString(text: string, at = '$'): DecimalString {
  if (!PLAIN_DECIMAL.test(text)) {
    throw new ReportImportError(
      `expected an exact decimal in plain form (sign, digits, optional fraction), got ` +
        JSON.stringify(text),
      at,
    );
  }
  try {
    // Constructed and discarded. Present to reject, never to compute with.
    new Decimal(text);
  } catch {
    throw new ReportImportError(`not a representable decimal: ${JSON.stringify(text)}`, at);
  }
  return text as DecimalString;
}

// ---------------------------------------------------------------------------
// Emission gates
// ---------------------------------------------------------------------------

/**
 * Walk every {@link TracedWire} in the run, wherever it sits.
 *
 * Structural rather than a hand-maintained list of field paths, on purpose: a
 * field added to the model later is covered the day it is added, which is the
 * opposite of what happens to a checklist of places to remember to check.
 */
function forEachTracedWire(value: unknown, visit: (wire: TracedWire) => void): void {
  if (Array.isArray(value)) {
    for (const item of value as readonly unknown[]) forEachTracedWire(item, visit);
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  const record = value as Record<string, unknown>;
  if (
    typeof record['value'] === 'string' &&
    typeof record['node'] === 'string' &&
    typeof record['parameterId'] === 'string' &&
    typeof record['provenanceClass'] === 'string' &&
    typeof record['renderHint'] === 'string'
  ) {
    visit(record as unknown as TracedWire);
    return;
  }
  for (const child of Object.values(record)) forEachTracedWire(child, visit);
}

/**
 * Everything that must hold before a run may be rendered, in any format.
 *
 * Called by {@link toJson} and by `toHtml`, so there is no output format that
 * skips it, and by {@link fromJson}, so a payload cannot be hand-edited into a
 * state the engine would never have emitted and then re-rendered.
 */
export function assertEmittable(run: RunReport): void {
  if (run.metricDefinitionsVersion !== ANNEX_VERSION) {
    throw new AnnexVersionMismatchError(run.metricDefinitionsVersion, ANNEX_VERSION);
  }

  // FR-DEF-001 AC5, mechanically, at the last boundary before a human reads it.
  for (const metricId of run.areaTermsUsed) metric(metricId);
  const declared = new Set(run.areaTermsUsed);
  for (const dimension of run.envelope.dimensions) {
    if (dimension.metricId !== null && !declared.has(dimension.metricId)) {
      throw new ReportImportError(
        `envelope dimension ${dimension.dimension} is measured as ${dimension.metricId}, ` +
          `which the run does not declare in areaTermsUsed`,
        `$.envelope.dimensions.${dimension.dimension}`,
      );
    }
  }
  for (const band of run.capacity.bands) {
    if (!declared.has(band.metricId)) {
      throw new ReportImportError(
        `capacity band ${band.band} is measured as ${band.metricId}, which the run does ` +
          `not declare in areaTermsUsed`,
        `$.capacity.bands.${band.band}`,
      );
    }
  }
  for (const metricId of run.parking.metricIds) {
    if (!declared.has(metricId)) {
      throw new ReportImportError(
        `parking is measured as ${metricId}, which the run does not declare in areaTermsUsed`,
        '$.parking.metricIds',
      );
    }
  }

  const failed = run.invariants
    .filter((outcome) => outcome.status === InvariantStatus.FAIL)
    .map((outcome) => outcome.invariantId);
  if (failed.length > 0) throw new InvariantFailureError(failed);

  const regulatory = run.claim.regulatoryValidity.status;
  if (regulatory !== ClaimStatus.NEVER_CLAIMED && regulatory !== ClaimStatus.NOT_ASSESSED) {
    throw new ClaimOverreachError(regulatory);
  }

  forEachTracedWire(run, (wire) => {
    if (wire.renderHint !== RENDER_HINTS[wire.provenanceClass]) {
      throw new RenderHintTamperedError(wire.parameterId, wire.provenanceClass, wire.renderHint);
    }
  });
}

/**
 * The gate for an artifact that will leave the building — gate `G4`, §21.1.
 *
 * Deliberately separate from {@link assertEmittable}. If `toHtml` itself called
 * `assertAnnexSigned()` then, with the annex at `0.1.0-UNSIGNED`, no artifact
 * could be produced at all during development — and the pressure to add a bypass
 * flag would land on the signing gate, which is the one thing `FR-DEF-001 AC4`
 * says must not be bypassable. So the unsigned state is rendered loudly on the
 * face page instead, and this is the single call an external-release path makes.
 */
export function assertReleasable(run: RunReport): void {
  assertEmittable(run);
  assertAnnexSigned();
  if (run.ruleSet.approval === RuleSetApproval.DRAFT) {
    throw new Error(
      `run ${run.runId} was computed on DRAFT rules and may not be released: ` +
        run.ruleSet.warning,
    );
  }
  if (run.reviewer === null) {
    throw new Error(
      `run ${run.runId} has no named reviewer. PRD §21.1 gate G4 blocks external sharing ` +
        `until a person accepts the output; there is no anonymous export.`,
    );
  }
}

/** Banner text for an unsigned annex, or `null` when every definition is signed. */
export function unsignedAnnexNotice(): string | null {
  const pending = pendingApproval();
  if (pending.length === 0) return null;
  return (
    `The metric definitions annex (${ANNEX_VERSION}) is NOT SIGNED: ${pending.length} of ` +
    `its definitions await a named approver — ${pending.map((d) => d.metricId).join(', ')}. ` +
    `FR-DEF-001 AC4 requires a signed annex before a report is relied upon. Every area ` +
    `term below was computed against a placeholder definition.`
  );
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/**
 * The machine-readable export — `FR-OUT-001`.
 *
 * The returned document is a plain JSON value: `JSON.stringify` of it, parsed
 * back and handed to {@link fromJson}, yields a `RunReport` deep-equal to the
 * input. That is `AC4`, and it holds by construction because the model admits no
 * type JSON cannot carry.
 */
export function toJson(run: RunReport): RunExportDocument {
  assertEmittable(run);
  const fingerprint = runFingerprint(run);
  const warning =
    run.ruleSet.approval === RuleSetApproval.DRAFT
      ? { SEED_RULES_WARNING: run.ruleSet.warning }
      : {};
  return { ...warning, schemaVersion: REPORT_SCHEMA_VERSION, fingerprint, run };
}

/**
 * Canonical text form of the export: sorted keys, no insignificant whitespace.
 *
 * This is the form to persist. Two runs with the same content produce the same
 * bytes, which makes §13.4's "retrievable unchanged" checkable with a file
 * comparison rather than a semantic diff someone has to be trusted to write.
 */
export function toJsonString(run: RunReport): string {
  return canonicalJson(toJson(run));
}

// ---------------------------------------------------------------------------
// Import — the inverse, with teeth
// ---------------------------------------------------------------------------

function fail(message: string, at: string): never {
  throw new ReportImportError(message, at);
}

function readObject(value: unknown, at: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail('expected an object', at);
  }
  return value as Record<string, unknown>;
}

function readString(value: unknown, at: string): string {
  if (typeof value !== 'string') fail('expected a string', at);
  return value;
}

function readInteger(value: unknown, at: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    fail('expected a safe integer', at);
  }
  return value;
}

function readBoolean(value: unknown, at: string): boolean {
  if (typeof value !== 'boolean') fail('expected a boolean', at);
  return value;
}

function readArray(value: unknown, at: string): readonly unknown[] {
  if (!Array.isArray(value)) fail('expected an array', at);
  return value as readonly unknown[];
}

function readList<T>(
  value: unknown,
  at: string,
  read: (item: unknown, at: string) => T,
): readonly T[] {
  return readArray(value, at).map((item, index) => read(item, `${at}[${index}]`));
}

function readNullable<T>(
  value: unknown,
  at: string,
  read: (item: unknown, at: string) => T,
): T | null {
  return value === null || value === undefined ? null : read(value, at);
}

function readMember<T extends string>(
  value: unknown,
  at: string,
  allowed: Readonly<Record<string, T>>,
): T {
  const text = readString(value, at);
  const values = Object.values(allowed) as readonly string[];
  if (!values.includes(text)) {
    fail(`expected one of ${values.join(' | ')}, got ${JSON.stringify(text)}`, at);
  }
  return text as T;
}

function readDecimal(value: unknown, at: string): DecimalString {
  return decimalString(readString(value, at), at);
}

/** Recursively re-validate a persisted JSON value. Rejects anything non-JSON. */
function readJsonValue(value: unknown, at: string): JsonValue {
  if (value === null) return null;
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return value;
    case 'number':
      if (!Number.isFinite(value)) fail('JSON has no representation for NaN or Infinity', at);
      return value;
    case 'object':
      break;
    default:
      fail(`a ${typeof value} cannot appear in a persisted JSON payload`, at);
  }
  if (Array.isArray(value)) {
    return (value as readonly unknown[]).map((item, index) =>
      readJsonValue(item, `${at}[${index}]`),
    );
  }
  const out: Record<string, JsonValue> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (child === undefined) continue;
    out[key] = readJsonValue(child, `${at}.${key}`);
  }
  return out;
}

function readJsonObject(value: unknown, at: string): JsonObject {
  return readJsonValue(readObject(value, at), at) as JsonObject;
}

function readCitation(value: unknown, at: string): Citation {
  const o = readObject(value, at);
  const raw = readArray(o['sourceBbox'], `${at}.sourceBbox`);
  if (raw.length !== 4) fail('sourceBbox must have exactly four numbers', `${at}.sourceBbox`);
  const bbox = raw.map((n, index) => {
    if (typeof n !== 'number' || !Number.isFinite(n)) {
      fail('expected a finite number', `${at}.sourceBbox[${index}]`);
    }
    return n;
  });
  return {
    instrumentId: readString(o['instrumentId'], `${at}.instrumentId`),
    instrumentVersion: readString(o['instrumentVersion'], `${at}.instrumentVersion`),
    clauseReference: readString(o['clauseReference'], `${at}.clauseReference`),
    documentUri: readString(o['documentUri'], `${at}.documentUri`),
    sourcePage: readInteger(o['sourcePage'], `${at}.sourcePage`),
    sourceBbox: [bbox[0]!, bbox[1]!, bbox[2]!, bbox[3]!],
    sourceTextVerbatim: readString(o['sourceTextVerbatim'], `${at}.sourceTextVerbatim`),
  };
}

function readWire(value: unknown, at: string): TracedWire {
  const o = readObject(value, at);
  const unit = o['unit'];
  const base = {
    value: readString(o['value'], `${at}.value`),
    node: readString(o['node'], `${at}.node`) as NodeId,
    parameterId: readString(o['parameterId'], `${at}.parameterId`),
    provenanceClass: readMember(o['provenanceClass'], `${at}.provenanceClass`, ProvenanceClass),
    renderHint: readMember(o['renderHint'], `${at}.renderHint`, RenderHint),
  };
  return unit === undefined || unit === null
    ? base
    : { ...base, unit: readString(unit, `${at}.unit`) };
}

function readActor(value: unknown, at: string): Actor {
  const o = readObject(value, at);
  return { id: readString(o['id'], `${at}.id`), name: readString(o['name'], `${at}.name`) };
}

function readClaim(value: unknown, at: string): { status: ClaimStatus; detail: string } {
  const o = readObject(value, at);
  return {
    status: readMember(o['status'], `${at}.status`, ClaimStatus),
    detail: readString(o['detail'], `${at}.detail`),
  };
}

function readProvenanceNode(value: unknown, at: string): ProvenanceNode {
  const o = readObject(value, at);
  const optional = <T>(
    key: string,
    read: (item: unknown, at: string) => T,
  ): Record<string, T> | Record<string, never> => {
    const raw = o[key];
    return raw === undefined || raw === null ? {} : { [key]: read(raw, `${at}.${key}`) };
  };
  return {
    id: readString(o['id'], `${at}.id`) as NodeId,
    kind: readMember(o['kind'], `${at}.kind`, NodeKind),
    label: readString(o['label'], `${at}.label`),
    ...optional('parameterId', readString),
    ...optional('value', readString),
    ...optional('unit', readString),
    ...optional('provenanceClass', (v, a) => readMember(v, a, ProvenanceClass)),
    ...optional('formula', readString),
    ...optional('ruleId', readString),
    ...optional('citation', readCitation),
    ...optional('detail', (v, a): Readonly<Record<string, unknown>> => readJsonObject(v, a)),
  } as ProvenanceNode;
}

function readProvenanceEdge(value: unknown, at: string): ProvenanceEdge {
  const o = readObject(value, at);
  const attrs = o['attrs'];
  const base = {
    from: readString(o['from'], `${at}.from`) as NodeId,
    to: readString(o['to'], `${at}.to`) as NodeId,
    kind: readMember(o['kind'], `${at}.kind`, EdgeKind),
  };
  return attrs === undefined || attrs === null
    ? base
    : { ...base, attrs: readJsonObject(attrs, `${at}.attrs`) };
}

function readBinding(value: unknown, at: string): BindingConstraintView {
  const o = readObject(value, at);
  return {
    ruleId: readString(o['ruleId'], `${at}.ruleId`),
    label: readString(o['label'], `${at}.label`),
    value: readDecimal(o['value'], `${at}.value`),
    unit: readString(o['unit'], `${at}.unit`),
    citation: readNullable(o['citation'], `${at}.citation`, readCitation),
    runnerUp: readNullable(o['runnerUp'], `${at}.runnerUp`, (v, a) => {
      const r = readObject(v, a);
      return {
        ruleId: readString(r['ruleId'], `${a}.ruleId`),
        label: readString(r['label'], `${a}.label`),
        value: readDecimal(r['value'], `${a}.value`),
        withinOnePercent: readBoolean(r['withinOnePercent'], `${a}.withinOnePercent`),
      };
    }),
  };
}

function readRuleSet(value: unknown, at: string): RuleSetProvenance {
  const o = readObject(value, at);
  const approval = readMember(o['approval'], `${at}.approval`, RuleSetApproval);
  const ruleSetVersion = readString(o['ruleSetVersion'], `${at}.ruleSetVersion`);
  const contentHash = readString(o['contentHash'], `${at}.contentHash`);
  switch (approval) {
    case RuleSetApproval.APPROVED:
      return { approval, ruleSetVersion, contentHash };
    case RuleSetApproval.DRAFT:
      return {
        approval,
        ruleSetVersion,
        contentHash,
        warning: readString(o['warning'], `${at}.warning`),
      };
    default: {
      const unreachable: never = approval;
      return fail(`unhandled rule-set approval ${String(unreachable)}`, at);
    }
  }
}

function readRun(value: unknown, at: string): RunReport {
  const o = readObject(value, at);
  const plot = readObject(o['plot'], `${at}.plot`);
  const parkingInFar = readObject(o['parkingInFar'], `${at}.parkingInFar`);
  const envelope = readObject(o['envelope'], `${at}.envelope`);
  const capacity = readObject(o['capacity'], `${at}.capacity`);
  const parking = readObject(o['parking'], `${at}.parking`);
  const rules = readObject(o['rules'], `${at}.rules`);
  const claim = readObject(o['claim'], `${at}.claim`);
  const provenance = readObject(o['provenance'], `${at}.provenance`);

  return {
    runId: readString(o['runId'], `${at}.runId`),
    tenantId: readString(o['tenantId'], `${at}.tenantId`),
    producedAt: readString(o['producedAt'], `${at}.producedAt`),
    engineVersion: readString(o['engineVersion'], `${at}.engineVersion`),
    metricDefinitionsVersion: readString(
      o['metricDefinitionsVersion'],
      `${at}.metricDefinitionsVersion`,
    ),
    ruleSet: readRuleSet(o['ruleSet'], `${at}.ruleSet`),
    reviewer: readNullable(o['reviewer'], `${at}.reviewer`, (v, a) => {
      const r = readObject(v, a);
      return {
        id: readString(r['id'], `${a}.id`),
        name: readString(r['name'], `${a}.name`),
        role: readString(r['role'], `${a}.role`),
        acknowledgedAt: readString(r['acknowledgedAt'], `${a}.acknowledgedAt`),
      };
    }),
    disclaimer: readString(o['disclaimer'], `${at}.disclaimer`),
    plot: {
      plotId: readString(plot['plotId'], `${at}.plot.plotId`),
      plotNumber: readString(plot['plotNumber'], `${at}.plot.plotNumber`),
      community: readString(plot['community'], `${at}.plot.community`),
      landUse: readString(plot['landUse'], `${at}.plot.landUse`),
      shapeClass: readString(plot['shapeClass'], `${at}.plot.shapeClass`),
      statedAreaM2: readNullable(plot['statedAreaM2'], `${at}.plot.statedAreaM2`, readDecimal),
      computedAreaM2: readDecimal(plot['computedAreaM2'], `${at}.plot.computedAreaM2`),
      areaMismatch: readBoolean(plot['areaMismatch'], `${at}.plot.areaMismatch`),
    },
    parkingInFar: {
      treatment: readMember(
        parkingInFar['treatment'],
        `${at}.parkingInFar.treatment`,
        ParkingInFar,
      ),
      value: readWire(parkingInFar['value'], `${at}.parkingInFar.value`),
      citation: readNullable(parkingInFar['citation'], `${at}.parkingInFar.citation`, readCitation),
      declaredBy: readNullable(
        parkingInFar['declaredBy'],
        `${at}.parkingInFar.declaredBy`,
        readString,
      ),
    },
    envelope: {
      dimensions: readList(envelope['dimensions'], `${at}.envelope.dimensions`, (v, a) => {
        const d = readObject(v, a);
        return {
          dimension: readString(d['dimension'], `${a}.dimension`),
          label: readString(d['label'], `${a}.label`),
          metricId: readNullable(d['metricId'], `${a}.metricId`, readString),
          value: readWire(d['value'], `${a}.value`),
          binding: readBinding(d['binding'], `${a}.binding`),
        };
      }),
      edges: readList(envelope['edges'], `${at}.envelope.edges`, (v, a) => {
        const e = readObject(v, a);
        return {
          seq: readInteger(e['seq'], `${a}.seq`),
          classification: readString(e['classification'], `${a}.classification`),
          roadHierarchy: readNullable(e['roadHierarchy'], `${a}.roadHierarchy`, readString),
          lengthM: readDecimal(e['lengthM'], `${a}.lengthM`),
          appliedSetbackM: readDecimal(e['appliedSetbackM'], `${a}.appliedSetbackM`),
          setbackRuleId: readString(e['setbackRuleId'], `${a}.setbackRuleId`),
        };
      }),
      fixpointIterations: readInteger(
        envelope['fixpointIterations'],
        `${at}.envelope.fixpointIterations`,
      ),
      fixpointConverged: readBoolean(
        envelope['fixpointConverged'],
        `${at}.envelope.fixpointConverged`,
      ),
    },
    capacity: {
      bands: readList(capacity['bands'], `${at}.capacity.bands`, (v, a) => {
        const b = readObject(v, a);
        return {
          band: readMember(b['band'], `${a}.band`, CapacityBand),
          label: readString(b['label'], `${a}.label`),
          question: readString(b['question'], `${a}.question`),
          gfa: readWire(b['gfa'], `${a}.gfa`),
          metricId: readString(b['metricId'], `${a}.metricId`),
          derivation: readString(b['derivation'], `${a}.derivation`),
          inputs: readList(b['inputs'], `${a}.inputs`, (iv, ia) => {
            const i = readObject(iv, ia);
            return {
              name: readString(i['name'], `${ia}.name`),
              value: readWire(i['value'], `${ia}.value`),
            };
          }),
          governing: readBoolean(b['governing'], `${a}.governing`),
        };
      }),
      governingBand: readMember(
        capacity['governingBand'],
        `${at}.capacity.governingBand`,
        CapacityBand,
      ),
      governingGfa: readWire(capacity['governingGfa'], `${at}.capacity.governingGfa`),
      governingConstraint: readBinding(
        capacity['governingConstraint'],
        `${at}.capacity.governingConstraint`,
      ),
      nextBindingBand: readMember(
        capacity['nextBindingBand'],
        `${at}.capacity.nextBindingBand`,
        CapacityBand,
      ),
      headroomToNextM2: readDecimal(capacity['headroomToNextM2'], `${at}.capacity.headroomToNextM2`),
      integerGranularityLossM2: readDecimal(
        capacity['integerGranularityLossM2'],
        `${at}.capacity.integerGranularityLossM2`,
      ),
      userRealismDiscount: readWire(
        capacity['userRealismDiscount'],
        `${at}.capacity.userRealismDiscount`,
      ),
      levels: readWire(capacity['levels'], `${at}.capacity.levels`),
    },
    parking: {
      residentBays: readWire(parking['residentBays'], `${at}.parking.residentBays`),
      visitorBays: readWire(parking['visitorBays'], `${at}.parking.visitorBays`),
      totalBays: readWire(parking['totalBays'], `${at}.parking.totalBays`),
      bayAreaFactorM2: readWire(parking['bayAreaFactorM2'], `${at}.parking.bayAreaFactorM2`),
      requiredAreaM2: readWire(parking['requiredAreaM2'], `${at}.parking.requiredAreaM2`),
      availableAreaPerLevelM2: readWire(
        parking['availableAreaPerLevelM2'],
        `${at}.parking.availableAreaPerLevelM2`,
      ),
      levelsRequired: readWire(parking['levelsRequired'], `${at}.parking.levelsRequired`),
      levelsAvailable: readWire(parking['levelsAvailable'], `${at}.parking.levelsAvailable`),
      headroomBays: readDecimal(parking['headroomBays'], `${at}.parking.headroomBays`),
      supportableUnitCeiling: readWire(
        parking['supportableUnitCeiling'],
        `${at}.parking.supportableUnitCeiling`,
      ),
      podiumImplication: readString(parking['podiumImplication'], `${at}.parking.podiumImplication`),
      ratioCitations: readList(
        parking['ratioCitations'],
        `${at}.parking.ratioCitations`,
        readCitation,
      ),
      metricIds: readList(parking['metricIds'], `${at}.parking.metricIds`, readString),
    },
    rules: {
      applied: readList(rules['applied'], `${at}.rules.applied`, (v, a) => {
        const r = readObject(v, a);
        return {
          ruleId: readString(r['ruleId'], `${a}.ruleId`),
          parameterId: readString(r['parameterId'], `${a}.parameterId`),
          label: readString(r['label'], `${a}.label`),
          ruleClass: readString(r['ruleClass'], `${a}.ruleClass`),
          value: readString(r['value'], `${a}.value`),
          unit: readNullable(r['unit'], `${a}.unit`, readString),
          citation: readCitation(r['citation'], `${a}.citation`),
        };
      }),
      excluded: readList(rules['excluded'], `${at}.rules.excluded`, (v, a) => {
        const r = readObject(v, a);
        return {
          ruleId: readString(r['ruleId'], `${a}.ruleId`),
          parameterId: readString(r['parameterId'], `${a}.parameterId`),
          label: readString(r['label'], `${a}.label`),
          disposition: readMember(r['disposition'], `${a}.disposition`, RuleDisposition),
          reason: readString(r['reason'], `${a}.reason`),
          supersededByRuleId: readNullable(
            r['supersededByRuleId'],
            `${a}.supersededByRuleId`,
            readString,
          ),
          citation: readCitation(r['citation'], `${a}.citation`),
        };
      }),
      encodedCount: readInteger(rules['encodedCount'], `${at}.rules.encodedCount`),
      identifiedApplicableCount: readInteger(
        rules['identifiedApplicableCount'],
        `${at}.rules.identifiedApplicableCount`,
      ),
      deferredCount: readInteger(rules['deferredCount'], `${at}.rules.deferredCount`),
    },
    assumptions: readList(o['assumptions'], `${at}.assumptions`, (v, a) => {
      const s = readObject(v, a);
      return {
        rank: readInteger(s['rank'], `${a}.rank`),
        parameterId: readString(s['parameterId'], `${a}.parameterId`),
        label: readString(s['label'], `${a}.label`),
        value: readWire(s['value'], `${a}.value`),
        basis: readString(s['basis'], `${a}.basis`),
        perturbation: readString(s['perturbation'], `${a}.perturbation`),
        relativeEffect: readDecimal(s['relativeEffect'], `${a}.relativeEffect`),
        impactStatement: readString(s['impactStatement'], `${a}.impactStatement`),
      };
    }),
    invariants: readList(o['invariants'], `${at}.invariants`, (v, a) => {
      const i = readObject(v, a);
      return {
        invariantId: readString(i['invariantId'], `${a}.invariantId`),
        statement: readString(i['statement'], `${a}.statement`),
        tolerance: readString(i['tolerance'], `${a}.tolerance`),
        status: readMember(i['status'], `${a}.status`, InvariantStatus),
        observed: readNullable(i['observed'], `${a}.observed`, readDecimal),
        expected: readNullable(i['expected'], `${a}.expected`, readDecimal),
        detail: readString(i['detail'], `${a}.detail`),
      };
    }),
    claim: {
      selfConsistency: readClaim(claim['selfConsistency'], `${at}.claim.selfConsistency`),
      ruleCoverage: readClaim(claim['ruleCoverage'], `${at}.claim.ruleCoverage`),
      geometricValidity: readClaim(claim['geometricValidity'], `${at}.claim.geometricValidity`),
      professionalAgreement: readClaim(
        claim['professionalAgreement'],
        `${at}.claim.professionalAgreement`,
      ),
      regulatoryValidity: readClaim(claim['regulatoryValidity'], `${at}.claim.regulatoryValidity`),
    },
    deferredChecks: readList(o['deferredChecks'], `${at}.deferredChecks`, (v, a) => {
      const d = readObject(v, a);
      return {
        ruleId: readString(d['ruleId'], `${a}.ruleId`),
        parameterId: readString(d['parameterId'], `${a}.parameterId`),
        label: readString(d['label'], `${a}.label`),
        reason: readString(d['reason'], `${a}.reason`),
        citation: readCitation(d['citation'], `${a}.citation`),
      };
    }),
    provenance: {
      nodes: readList(provenance['nodes'], `${at}.provenance.nodes`, readProvenanceNode),
      edges: readList(provenance['edges'], `${at}.provenance.edges`, readProvenanceEdge),
    },
    structuredInputs: readJsonObject(o['structuredInputs'], `${at}.structuredInputs`),
    userInputs: readList(o['userInputs'], `${at}.userInputs`, (v, a) => {
      const u = readObject(v, a);
      return {
        parameterId: readString(u['parameterId'], `${a}.parameterId`),
        label: readString(u['label'], `${a}.label`),
        value: readString(u['value'], `${a}.value`),
        unit: readNullable(u['unit'], `${a}.unit`, readString),
        enteredBy: readActor(u['enteredBy'], `${a}.enteredBy`),
        enteredAt: readString(u['enteredAt'], `${a}.enteredAt`),
      };
    }),
    areaTermsUsed: readList(o['areaTermsUsed'], `${at}.areaTermsUsed`, readString),
  };
}

/**
 * Re-import an export document — `FR-OUT-001 AC4`.
 *
 * Three things happen, and the order matters. The payload is validated field by
 * field; the run's fingerprint is recomputed and compared against the digest
 * stored beside it; then {@link assertEmittable} runs again. A payload edited to
 * soften an `ASSUMED` value, to erase an invariant failure, or to claim
 * regulatory validity therefore cannot be re-imported and re-rendered — which is
 * the property "the JSON round-trips" needs before an auditor should care about
 * it.
 */
export function fromJson(document: unknown): RunReport {
  const o = readObject(document, '$');
  const schemaVersion = readString(o['schemaVersion'], '$.schemaVersion');
  if (schemaVersion !== REPORT_SCHEMA_VERSION) {
    fail(
      `export schema ${schemaVersion} cannot be read by this build ` +
        `(${REPORT_SCHEMA_VERSION}); migrate the payload rather than reinterpreting it`,
      '$.schemaVersion',
    );
  }
  const run = readRun(o['run'], '$.run');
  const stored = readObject(o['fingerprint'], '$.fingerprint');
  const storedDigest = readString(stored['digest'], '$.fingerprint.digest');
  const recomputed = runFingerprint(run);
  if (recomputed.digest !== storedDigest) {
    fail(
      `run fingerprint mismatch: the document states ${storedDigest} but its own contents ` +
        `hash to ${recomputed.digest}. PRD §13.4 requires a run's inputs, versions and ` +
        `provenance graph to be retrievable unchanged; this payload has been altered ` +
        `since it was written`,
      '$.fingerprint.digest',
    );
  }
  assertEmittable(run);
  return run;
}
