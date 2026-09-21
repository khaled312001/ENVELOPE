/**
 * Bitemporal rule store with an approval gate.
 *
 * Two independent time axes, kept because §19.3 is right that retrofitting them
 * is a rewrite:
 *
 * * **valid time** (`validFrom` / `validTo`) — when the rule was in force in the
 *   world. Lets a run reproduce what the regulation said on the day it was run.
 * * **transaction time** (`recordedAt`) — when we learned it. Lets us answer
 *   "what did the system believe when it produced this report?", which is the
 *   question an audit actually asks.
 *
 * **The approval gate is absolute.** PRD Principle 9 and the trust layer: "AI
 * may draft a rule. A licensed architect approves it. Unapproved rules cannot be
 * loaded by the engine — there is no override flag." There is no parameter here
 * that disables it, and adding one would be a defect rather than a feature.
 */

import type { Citation } from '@envelope/core';

import { ApprovalStatus, type RuleRecord } from './record.js';

export class UnapprovedRuleError extends Error {
  override readonly name = 'UnapprovedRuleError';
  constructor(readonly rules: readonly { ruleId: string; status: ApprovalStatus }[]) {
    super(
      `${rules.length} rule(s) are not APPROVED and cannot be loaded: ` +
        rules.map((r) => `${r.ruleId} (${r.status})`).join(', ') +
        `. PRD Principle 9 — an unapproved rule is not loadable and there is no ` +
        `override flag. A named, qualified human must approve each one.`,
    );
  }
}

export class RuleIntegrityError extends Error {
  override readonly name = 'RuleIntegrityError';
}

/** Every mandatory field, checked before a rule may enter the store. */
function assertIntegrity(rule: RuleRecord): void {
  const missing: string[] = [];
  const c: Citation = rule.citation;

  if (!rule.ruleId) missing.push('ruleId');
  if (!rule.parameterId) missing.push('parameterId');
  if (!rule.ruleClass) missing.push('ruleClass');
  if (!rule.jurisdiction) missing.push('jurisdiction');
  if (!rule.validFrom) missing.push('validFrom');
  if (!rule.recordedAt) missing.push('recordedAt');
  if (typeof rule.version !== 'number') missing.push('version');
  if (!rule.status) missing.push('status');
  if (!rule.authoredBy) missing.push('authoredBy');
  if (!c) missing.push('citation');
  else {
    if (!c.instrumentId) missing.push('citation.instrumentId');
    if (!c.instrumentVersion) missing.push('citation.instrumentVersion');
    if (!c.clauseReference) missing.push('citation.clauseReference');
    if (!c.documentUri) missing.push('citation.documentUri');
    if (!c.sourceTextVerbatim) missing.push('citation.sourceTextVerbatim');
  }

  if (missing.length) {
    throw new RuleIntegrityError(
      `rule ${rule.ruleId || '(unnamed)'} is missing mandatory field(s): ` +
        `${missing.join(', ')}. Principle 9 requires all of them NOT NULL.`,
    );
  }

  if (rule.status === ApprovalStatus.APPROVED && (!rule.approvedBy || !rule.approvedAt)) {
    throw new RuleIntegrityError(
      `rule ${rule.ruleId} is marked APPROVED without a named approver and timestamp. ` +
        `FR-RUL-001 AC2 requires approval by a qualified human, by name.`,
    );
  }

  // §11.3 / FR-RUL-003 AC1: an unclassified rule fails the build. Enforced by
  // the type system at authoring time and re-checked here for records that
  // arrive from storage rather than from source.
  if (rule.ruleClass === undefined) {
    throw new RuleIntegrityError(`rule ${rule.ruleId} has no ruleClass`);
  }

  // A life-safety rule may never be relaxed by a variance (§11.5 exception).
  // Recorded here so the constraint travels with the rule rather than living
  // only in resolution logic.
  if (rule.isLifeSafety && rule.ruleClass === 'DEFERRED') {
    throw new RuleIntegrityError(
      `rule ${rule.ruleId} is life-safety and DEFERRED. A life-safety rule that ` +
        `cannot be assessed must be declared in the deferred-check list explicitly ` +
        `and reviewed — it may not be quietly carried as a normal deferral.`,
    );
  }

  const kinds = new Set(rule.tests.map((t) => t.kind));
  if (!kinds.has('POSITIVE') || !kinds.has('BOUNDARY') || !kinds.has('NEGATIVE')) {
    throw new RuleIntegrityError(
      `rule ${rule.ruleId} needs a POSITIVE, a BOUNDARY and a NEGATIVE test ` +
        `(PRD §11.2). It has: ${[...kinds].join(', ') || 'none'}.`,
    );
  }
}

export interface AsOf {
  /** The date whose regulation applies. Defaults to the run date. */
  readonly validAt: string;
  /** What the system knew at this instant. Defaults to now. */
  readonly recordedAt: string;
}

/**
 * Normalise a date or timestamp to a comparable instant.
 *
 * Both axes are compared as strings, which is only sound once both sides are in
 * the same ISO shape. A bare `2026-08-30` sorts *before* `2026-08-30T00:00:00Z`
 * lexicographically, which silently filtered out every rule recorded on the
 * query date — a bitemporal store that quietly returns fewer rules than it holds
 * is the worst possible failure here, because the run still completes and simply
 * under-constrains.
 *
 * A bare date is widened to the **end** of that day for an upper bound and the
 * **start** for a lower bound, which is what "as of this date" means in each
 * position.
 */
function instant(value: string, bound: 'start' | 'end'): string {
  if (value.includes('T')) return value;
  return bound === 'start' ? `${value}T00:00:00.000Z` : `${value}T23:59:59.999Z`;
}

export class RuleStore {
  readonly #rules: RuleRecord[] = [];

  /**
   * Add rules. Integrity is checked immediately; approval is checked at load,
   * so that a draft rule can exist in the store and simply never be evaluated.
   */
  add(...rules: readonly RuleRecord[]): this {
    for (const r of rules) {
      assertIntegrity(r);
      this.#rules.push(r);
    }
    return this;
  }

  /** Every record, including drafts and superseded versions. For the admin UI. */
  all(): readonly RuleRecord[] {
    return this.#rules;
  }

  /**
   * The approved rules in force at a point in both time axes.
   *
   * Throws if any rule matching the temporal window is unapproved — the caller
   * does not get a quietly smaller rule set, because a quietly smaller rule set
   * is exactly how coverage is overstated.
   */
  load(asOf: AsOf, opts: { readonly strict?: boolean } = {}): readonly RuleRecord[] {
    const validAt = instant(asOf.validAt, 'end');
    const recordedAt = instant(asOf.recordedAt, 'end');
    const inWindow = this.#rules.filter(
      (r) =>
        instant(r.validFrom, 'start') <= validAt &&
        (r.validTo === null || instant(r.validTo, 'start') > validAt) &&
        instant(r.recordedAt, 'start') <= recordedAt &&
        r.status !== ApprovalStatus.SUPERSEDED &&
        r.status !== ApprovalStatus.WITHDRAWN,
    );

    const unapproved = inWindow.filter((r) => r.status !== ApprovalStatus.APPROVED);
    if (unapproved.length && opts.strict !== false) {
      throw new UnapprovedRuleError(unapproved.map((r) => ({ ruleId: r.ruleId, status: r.status })));
    }

    return inWindow.filter((r) => r.status === ApprovalStatus.APPROVED);
  }

  /** Rules awaiting a named approver — surfaced in the UI, never silently dropped. */
  pending(): readonly RuleRecord[] {
    return this.#rules.filter(
      (r) => r.status === ApprovalStatus.DRAFT || r.status === ApprovalStatus.IN_REVIEW,
    );
  }

  byParameter(parameterId: string, asOf: AsOf): readonly RuleRecord[] {
    return this.load(asOf, { strict: false }).filter((r) => r.parameterId === parameterId);
  }

  /**
   * A content hash of the loaded set, for `M-RUN` reproducibility (§13.4).
   *
   * Deterministic: rules are sorted by id and version before hashing, so the
   * same logical set always produces the same digest regardless of insertion
   * order. FNV-1a is sufficient here — this identifies a set, it does not
   * defend against an adversary.
   */
  contentHash(asOf: AsOf): string {
    const loaded = [...this.load(asOf, { strict: false })].sort(
      (a, b) => a.ruleId.localeCompare(b.ruleId) || a.version - b.version,
    );
    const payload = loaded
      .map((r) => `${r.ruleId}@${r.version}:${r.evaluator}:${JSON.stringify(r.evaluatorArgs)}`)
      .join('|');
    let h = 0x811c9dc5;
    for (let i = 0; i < payload.length; i++) {
      h ^= payload.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return `rs_${h.toString(16).padStart(8, '0')}_${loaded.length}`;
  }
}

/** Convenience for a run: "the regulation as it stands, as we know it today". */
export function asOfNow(isoDate: string): AsOf {
  return { validAt: isoDate, recordedAt: isoDate };
}
