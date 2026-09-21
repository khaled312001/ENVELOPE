/**
 * Provenance classes — PRD §13.1.
 *
 * Every value the engine emits carries one of these. The class is non-nullable
 * *by construction*: there is no way to build a `Traced` value without naming
 * one, which is how `M-PRV` (100% provenance coverage) is met structurally
 * rather than by discipline. PRD §19.3 is right that retrofitting provenance
 * means rewriting every layer — so it is the first thing built here, not the
 * seventh.
 */

/** How a value came to exist. PRD §13.1. */
export const ProvenanceClass = {
  /** Computed from a cited rule. Requires a rule in its derivation path. */
  DERIVED: 'DERIVED',
  /**
   * A declared assumption filling a gap where no rule governs.
   * Requires an assumption-register entry *and* a computed sensitivity before
   * the run may be exported (PRD §13.3).
   */
  ASSUMED: 'ASSUMED',
  /** Supplied or overridden by a named user. Carries that user's identity. */
  USER_SET: 'USER_SET',
  /** From a precedent distribution. Phase 2+. Requires n ≥ 8 (PRD §13.3). */
  OBSERVED: 'OBSERVED',
  /** An optimizer's choice among feasible alternatives. Phase 5. */
  TRADEOFF: 'TRADEOFF',
  /** Governed by a documented exemption. Never permitted for a life-safety rule. */
  VARIANCE: 'VARIANCE',
} as const;

export type ProvenanceClass = (typeof ProvenanceClass)[keyof typeof ProvenanceClass];

/**
 * Classes Phase 0 is allowed to emit.
 *
 * Emitting anything else is a defect, not a feature flag: OBSERVED needs a
 * precedent corpus (Phase 2) and TRADEOFF needs an optimizer (Phase 5).
 */
export const PHASE_0_CLASSES: ReadonlySet<ProvenanceClass> = new Set([
  ProvenanceClass.DERIVED,
  ProvenanceClass.ASSUMED,
  ProvenanceClass.USER_SET,
  ProvenanceClass.VARIANCE,
]);

/**
 * How the UI must present a class. PRD §13.1, §20.3.
 *
 * Carried on the wire rather than re-derived in the frontend, so that
 * "uncertainty is not a tooltip" is enforced by the payload. §13.1 is explicit
 * that the amber ASSUMED treatment "is the most important UI decision in the
 * product… softening it for aesthetic reasons defeats the product."
 */
export const RenderHint = {
  NEUTRAL_WITH_CITATION: 'NEUTRAL_WITH_CITATION',
  AMBER_DOTTED_EDITABLE: 'AMBER_DOTTED_EDITABLE',
  USER_BADGE: 'USER_BADGE',
  DISTRIBUTION_SPARKLINE: 'DISTRIBUTION_SPARKLINE',
  TRADEOFF_LINK: 'TRADEOFF_LINK',
  RED_BORDER_EVIDENCE: 'RED_BORDER_EVIDENCE',
  /** Not a provenance class — the treatment for a deferred / not-assessed item. */
  GREY_HATCHED_NOT_ASSESSED: 'GREY_HATCHED_NOT_ASSESSED',
} as const;

export type RenderHint = (typeof RenderHint)[keyof typeof RenderHint];

export const RENDER_HINTS: Readonly<Record<ProvenanceClass, RenderHint>> = {
  [ProvenanceClass.DERIVED]: RenderHint.NEUTRAL_WITH_CITATION,
  [ProvenanceClass.ASSUMED]: RenderHint.AMBER_DOTTED_EDITABLE,
  [ProvenanceClass.USER_SET]: RenderHint.USER_BADGE,
  [ProvenanceClass.OBSERVED]: RenderHint.DISTRIBUTION_SPARKLINE,
  [ProvenanceClass.TRADEOFF]: RenderHint.TRADEOFF_LINK,
  [ProvenanceClass.VARIANCE]: RenderHint.RED_BORDER_EVIDENCE,
};

/** Provenance graph node types — PRD §13.2. */
export const NodeKind = {
  VALUE: 'VALUE',
  COMPUTATION: 'COMPUTATION',
  RULE: 'RULE',
  SOURCE_CLAUSE: 'SOURCE_CLAUSE',
  INPUT: 'INPUT',
  USER: 'USER',
  ASSUMPTION: 'ASSUMPTION',
  BASIS: 'BASIS',
  CONSTRAINT: 'CONSTRAINT',
  STANDARD: 'STANDARD',
  TARGET: 'TARGET',
  VARIANCE: 'VARIANCE',
  PRECEDENT_PATTERN: 'PRECEDENT_PATTERN',
} as const;

export type NodeKind = (typeof NodeKind)[keyof typeof NodeKind];

/**
 * Provenance graph edge types — PRD §13.2.
 *
 * The graph is a bounded per-run DAG queried by root, which is why it lives in
 * a relational store with a recursive CTE rather than a graph database
 * (PRD §19.2).
 */
export const EdgeKind = {
  /** value → computation */
  DERIVED_FROM: 'derivedFrom',
  /** computation → rule | input | assumption | precedent pattern */
  USES: 'uses',
  /** rule → source clause */
  CITED_IN: 'citedIn',
  /** input → user */
  ENTERED_BY: 'enteredBy',
  /** assumption → basis */
  JUSTIFIED_BY: 'justifiedBy',
  /** value → constraint */
  BOUNDED_BY: 'boundedBy',
  /** constraint → rule | standard | target | variance */
  SOURCED_FROM: 'sourcedFrom',
  /** value → assumption, carrying the measured effect of perturbing it */
  SENSITIVE_TO: 'sensitiveTo',
  /** losing rule candidate → governing rule (PRD §11.5 step 3) */
  SUPERSEDED_BY: 'supersededBy',
} as const;

export type EdgeKind = (typeof EdgeKind)[keyof typeof EdgeKind];
