/**
 * `@envelope/report` — the two artifacts §3.4 item 9 promises a user: a PDF
 * (via headless Chromium over {@link toHtml}) and a complete JSON export.
 *
 * The package depends on `@envelope/core`, `@envelope/sheets` and `decimal.js`
 * and nothing else, by design. See `json.ts` for why a report that could reach
 * the capacity engine would be a report that can disagree with it. `sheets` is
 * not the engine: it draws the engine's building model and computes nothing.
 */

export {
  AnnexVersionMismatchError,
  ClaimOverreachError,
  InvariantFailureError,
  InvariantStatus,
  RenderHintTamperedError,
  REPORT_SCHEMA_VERSION,
  ReportImportError,
  RuleDisposition,
  RuleSetApproval,
  assertEmittable,
  assertReleasable,
  decimalString,
  fromJson,
  toJson,
  toJsonString,
  unsignedAnnexNotice,
  type AppliedRuleView,
  type ApprovedRuleSet,
  type AssumptionEntry,
  type BindingConstraintView,
  type CapacityBandView,
  type CapacitySection,
  type DecimalString,
  type DeferredCheckEntry,
  type DerivationInput,
  type DraftRuleSet,
  type EnvelopeDimensionView,
  type EnvelopeSection,
  type ExcludedRuleView,
  type InvariantOutcome,
  type JsonArray,
  type JsonObject,
  type JsonPrimitive,
  type JsonValue,
  type ParkingInFarDeclaration,
  type ParkingSection,
  type PlotEdgeView,
  type PlotSummary,
  type ProvenanceExport,
  type Reviewer,
  type RuleSetProvenance,
  type RulesSection,
  type RunExportDocument,
  type RunReport,
  type RunnerUpConstraint,
  type UserInputRecord,
} from './json.js';

export {
  CLAIM_STATEMENT_VERBATIM,
  Phase0RenderError,
  drawingSetHtml,
  groupDigits,
  toHtml,
  type DrawingSetMeta,
  type ReportDrawings,
} from './html.js';

export {
  FINGERPRINT_ALGORITHM,
  FINGERPRINT_COVERS,
  FINGERPRINT_SCOPE,
  NonCanonicalValueError,
  canonicalJson,
  canonicalRunPayload,
  runFingerprint,
  type RunFingerprint,
} from './reproducibility.js';
