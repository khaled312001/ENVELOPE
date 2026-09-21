/**
 * The invariant runner — `FR-INV-001`, PRD §12.3.
 *
 * Two entry points and no options object between them. That is deliberate:
 * §12.3 says failure "blocks emission. Never a warning, never a configurable
 * severity", and the cheapest way to honour a rule like that is to give the
 * caller nowhere to put the flag. {@link runInvariants} reports;
 * {@link assertInvariants} throws. There is no third mode.
 *
 * The distinction the rest of this file exists to protect is between *nothing
 * failed* and *everything was checked*. `passed` answers the first question
 * only. A Phase 0 artifact always leaves five checks dormant, so a report can
 * be `passed: true` with five entries in `dormant`, and rendering that as "all
 * 18 invariants pass" is the exact mistake Appendix A.8 makes against its own
 * A.7 table. {@link formatInvariantReport} refuses to make it.
 */

import {
  INVARIANT_CATALOGUE,
  InvariantStatus,
  PHASE_0_DORMANT,
  PHASE_0_DORMANT_NOTE,
  type InvariantId,
  type InvariantSubject,
} from './catalogue.js';

/**
 * One check's result.
 *
 * `observed` and `expected` are absent on a `DORMANT` entry rather than empty
 * strings, because there was nothing to observe — `exactOptionalPropertyTypes`
 * makes that distinction survive into the wire format instead of collapsing
 * into `""`, which a report would then print as a measurement of zero.
 */
export interface InvariantResult {
  readonly id: InvariantId;
  /** Verbatim §12.2 statement. */
  readonly statement: string;
  readonly status: InvariantStatus;
  /** Verbatim §12.2 tolerance. */
  readonly tolerance: string;
  readonly observed?: string;
  readonly expected?: string;
  /** Why the check landed where it did, including the residual FR-INV-001 asks for. */
  readonly detail: string;
}

export interface InvariantReport {
  readonly results: readonly InvariantResult[];
  /**
   * True when nothing failed.
   *
   * **Not** "everything was checked" — read {@link dormant} for that. The two
   * are different claims and conflating them is what §24.1's "18 checks"
   * checkbox invites.
   */
  readonly passed: boolean;
  /** Ids that had nothing to check. Never counted as passes. */
  readonly dormant: readonly InvariantId[];
}

/**
 * Evaluate the whole §12.2 catalogue against a plain artifact.
 *
 * Total, in both senses: it never throws, and it always returns eighteen
 * results in catalogue order. A missing group produces `DORMANT`, so a caller
 * can hand it a fragment of a slide and get back an honest account of what
 * could and could not be verified.
 */
export function runInvariants(subject: InvariantSubject): InvariantReport {
  const results: InvariantResult[] = [];
  const dormant: InvariantId[] = [];

  for (const entry of INVARIANT_CATALOGUE) {
    const outcome = entry.check(subject);
    const base = {
      id: entry.id,
      statement: entry.statement,
      tolerance: entry.tolerance,
    } as const;

    switch (outcome.kind) {
      case InvariantStatus.PASS:
      case InvariantStatus.FAIL:
        results.push({
          ...base,
          status: outcome.kind,
          observed: outcome.observed,
          expected: outcome.expected,
          detail: outcome.detail,
        });
        break;
      case InvariantStatus.DORMANT:
        dormant.push(entry.id);
        results.push({
          ...base,
          status: InvariantStatus.DORMANT,
          // Only the check itself knows whether Phase 0 could ever have fed it.
          // INV-05 with a unit schedule that declares no types is dormant by
          // omission and must not be labelled a phase limitation, or a defect
          // in one artifact reads as a scope conversation with the client.
          detail: outcome.byPhase
            ? `${outcome.detail} This check is dormant by phase, not by omission.`
            : outcome.detail,
        });
        break;
      default: {
        // Exhaustiveness is load-bearing: a fourth status added later must not
        // silently fall through into "not a failure", which is how a new
        // outcome class would quietly become a pass.
        const unreachable: never = outcome;
        throw new Error(`unhandled invariant outcome: ${JSON.stringify(unreachable)}`);
      }
    }
  }

  return {
    results,
    passed: results.every((r) => r.status !== InvariantStatus.FAIL),
    dormant,
  };
}

/**
 * The failure that blocks emission.
 *
 * Carries the whole report, not just the message, so the caller that catches it
 * can render every check rather than re-running the layer to find out what else
 * was wrong.
 */
export class InvariantViolationError extends Error {
  override readonly name = 'InvariantViolationError';
  readonly report: InvariantReport;
  readonly failures: readonly InvariantResult[];

  constructor(report: InvariantReport, label?: string) {
    const failures = report.results.filter((r) => r.status === InvariantStatus.FAIL);
    super(
      `invariant failure blocks emission${label !== undefined ? ` for ${label}` : ''}: ` +
        `${failures.length} of ${report.results.length} check(s) failed — ` +
        failures
          .map((f) => `${f.id} (${f.statement}) observed ${f.observed} expected ${f.expected}`)
          .join('; ') +
        `. PRD §12.3: failure blocks emission, never a warning, never a configurable severity.`,
    );
    this.report = report;
    this.failures = failures;
  }
}

/**
 * Run the catalogue and refuse to continue if anything failed.
 *
 * Dormant checks do **not** throw. That is the one judgement call in this file
 * and it is worth stating plainly: five checks are dormant on every Phase 0
 * artifact (see `PHASE_0_DORMANT_NOTE`), so throwing on dormancy would mean
 * Phase 0 could never emit anything at all. The honest handling is that a
 * dormant check blocks the *claim*, not the emission — `passed` stays true,
 * `dormant` is non-empty, and the report is required to say so.
 *
 * @throws {InvariantViolationError} when any check failed.
 */
export function assertInvariants(subject: InvariantSubject): void {
  const report = runInvariants(subject);
  if (!report.passed) {
    throw new InvariantViolationError(report, subject.label);
  }
}

/**
 * Render a report as text for the §12.3 CI job.
 *
 * A function rather than a `console.log` so the caller owns the stream, and so
 * the summary line can be asserted in a test — the wording of that line is the
 * product's honesty about its own coverage, and wording that is not tested
 * drifts.
 */
export function formatInvariantReport(report: InvariantReport): string {
  const counts = {
    pass: report.results.filter((r) => r.status === InvariantStatus.PASS).length,
    fail: report.results.filter((r) => r.status === InvariantStatus.FAIL).length,
    dormant: report.dormant.length,
  };

  const lines = report.results.map((r) => {
    const measured =
      r.observed !== undefined && r.expected !== undefined
        ? ` observed ${r.observed}, expected ${r.expected};`
        : '';
    return `${r.id} [${r.status}] ${r.statement} (tolerance ${r.tolerance}) —${measured} ${r.detail}`;
  });

  // Never "N of 18 passed". The denominator that matters is how many ran.
  const summary =
    `${counts.pass} passed, ${counts.fail} failed, ${counts.dormant} dormant ` +
    `of ${report.results.length} checks in the §12.2 catalogue. ` +
    (counts.dormant > 0
      ? `${counts.dormant} check(s) had nothing to check and are NOT counted as passes.`
      : 'Every check in the catalogue ran.');

  const phaseNote = report.dormant.some((id) => PHASE_0_DORMANT.has(id))
    ? `\n\n${PHASE_0_DORMANT_NOTE}`
    : '';

  return `${lines.join('\n')}\n\n${summary}${phaseNote}`;
}
