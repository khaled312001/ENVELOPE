/**
 * The five-way claim statement — PRD §2.2, §16.5, Principles 7 and 8.
 *
 * This is the most important file in the package and arguably in the product.
 * Everything else here computes numbers; this decides what the numbers are
 * allowed to be described as.
 *
 * §16.5: "Every validation report contains these five statements, separately,
 * verbatim." Principle 7: "the validator agreeing with the generator is
 * self-consistency, nothing more. No output, no report, no marketing material
 * may describe it as compliance."
 *
 * ---
 *
 * **Regulatory validity is structurally unclaimable.**
 *
 * The requirement is not "default it to NOT ASSESSED and trust reviewers". It is
 * that no caller can produce a claim statement that says anything else. Four
 * mechanisms, each of which alone would be enough and which together leave no
 * path:
 *
 * 1. {@link ClaimEvidence} — the only parameter {@link buildClaimStatement}
 *    accepts — has no field that could carry a regulatory finding. There is
 *    nothing to pass. Under `exactOptionalPropertyTypes` an object literal
 *    carrying a `regulatoryValidity` key is rejected by excess-property
 *    checking, so the mistake does not compile either.
 * 2. The emitted regulatory statement is {@link REGULATORY_VALIDITY_CLAIM}, a
 *    module-level frozen constant. It is the same object every time.
 * 3. The returned statement and all five of its members are frozen, so
 *    `report.claims.regulatoryValidity.status = 'SUPPORTED'` throws a
 *    `TypeError` in strict mode rather than silently succeeding.
 * 4. {@link assertClaimStatementHonest} re-checks the emitted statement on the
 *    export path, so a statement assembled by hand somewhere else — the type is
 *    a plain interface in `@envelope/core` and cannot be sealed there — still
 *    cannot reach a report.
 *
 * ---
 *
 * **Two places the PRD contradicts itself, and the readings taken.** Both are
 * recorded in `docs/03-analysis/open-questions.md` (technical section, alongside
 * Q19); neither is papered over here.
 *
 * *First:* §2.2's table says regulatory validity is "Never claimed. Not
 * obtainable." §16.5's printed line says "NOT ASSESSED. This system does not and
 * cannot determine whether an authority would approve this scheme." The status
 * vocabulary in `@envelope/core` offers both `NEVER_CLAIMED` and `NOT_ASSESSED`.
 * Reading taken: the **status** is `NEVER_CLAIMED`, because that is the stronger
 * and more permanent of the two and matches §2.2 and `CLAUDE.md`; the **detail**
 * carries §16.5's sentence verbatim, including the words "NOT ASSESSED", so
 * `FR-VAL-001 AC4` ("the five-way claim distinction appears verbatim") is met on
 * the printed line as well. Both readings are satisfied simultaneously; neither
 * is discarded.
 *
 * *Second:* §16.5 specifies "Status: PASS / FAIL" for self-consistency and for
 * geometric validity, but the five-value vocabulary the same document defines
 * has no FAIL. There is no honest mapping — `NOT_ASSESSED` means "we did not
 * look", which is a different and materially weaker statement than "we looked
 * and it failed". Reading taken: a failure emits `NOT_ASSESSED` with the word
 * **FAIL** leading the detail string, *and* is recorded in the validation
 * report's `emissionBlocked` list. The missing status has no practical
 * consequence because a configuration whose self-consistency or geometry failed
 * is never emitted at all (Principle 3, §12.3: "Failure blocks emission. Never a
 * warning, never a configurable severity"), so no reader ever sees the ambiguous
 * status without the block alongside it.
 */

import { ClaimStatus, type ClaimStatement, Decimal } from '@envelope/core';

import type { DeferredConstraint } from './categories.js';

// ---------------------------------------------------------------------------
// The honesty constants. Printed, not paraphrased.
// ---------------------------------------------------------------------------

/**
 * §16.4, "The honest limit of independence" — the paragraph the report must
 * print next to the validation summary.
 *
 * It exists because this package will otherwise be read as saying more than it
 * does. The validator re-checks the emitted answer against the same encoded
 * constraint set the generator consumed. That catches generator implementation
 * bugs — an off-by-one in the fixpoint, a bound applied to the wrong parameter,
 * a unit dropped between layers. It cannot catch a rule that was transcribed
 * wrongly from the instrument, a rule nobody encoded, or a rule whose
 * applicability predicate selects the wrong plots. Those are failures of the
 * rule base, and no amount of implementation independence detects them.
 *
 * §16.4's own framing of why this matters: V1 stated a "0% hard-constraint
 * violation" metric as though it meant compliance. It means self-consistency.
 */
export const INDEPENDENCE_LIMIT =
  'THE HONEST LIMIT OF INDEPENDENCE (PRD §16.4). Implementation independence is ' +
  'not semantic independence. The validator evaluates the same encoded constraint ' +
  'set the generator consumed. It catches generator implementation bugs. It does ' +
  'not catch a mis-encoded rule, a missing rule, or a rule whose applicability ' +
  'predicate is wrong. A "0% hard-constraint violation" result is a statement ' +
  'about self-consistency, never about compliance.';

/**
 * `FR-VAL-001 AC3`, stated on the report rather than left to a reader's
 * inference. Principle 7 in one sentence.
 */
export const SELF_CONSISTENCY_IS_NOT_COMPLIANCE =
  'Agreement between the validator and the generator is self-consistency, not ' +
  'compliance. This system does not determine whether a scheme complies with ' +
  'Dubai regulation and no output of it may be described as doing so.';

/**
 * The fourth line of §16.5. "The fourth line is permanent and never changes."
 *
 * Frozen, module-scoped, and the only value {@link buildClaimStatement} will
 * ever place in the `regulatoryValidity` slot.
 */
export const REGULATORY_VALIDITY_CLAIM: {
  readonly status: typeof ClaimStatus.NEVER_CLAIMED;
  readonly detail: string;
} = Object.freeze({
  status: ClaimStatus.NEVER_CLAIMED,
  detail:
    'NOT ASSESSED. This system does not and cannot determine whether an authority ' +
    'would approve this scheme. Never claimed. Not obtainable.',
});

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

/** Outcome of the independent invariant layer (`@envelope/invariants`, §12). */
export interface InvariantSummary {
  readonly run: number;
  readonly failed: number;
  readonly failedIds: readonly string[];
}

/** Outcome of the geometry kernel's own checks — §14.3. */
export interface GeometryCheckSummary {
  /** False when no geometry was produced, e.g. a run that halted before solving. */
  readonly topologyChecked: boolean;
  readonly topologyValid: boolean;
  /** How many polygons had their area computed by independent methods. */
  readonly areasRecomputed: number;
  /** Recomputations that disagreed beyond the declared tolerance. A P0 defect. */
  readonly areaDisagreements: number;
}

/**
 * The rule-coverage numbers — `N of M`, and the `K` deferred.
 *
 * `applicable` is the count of requirements **we identified** as applicable. It
 * is not the count of requirements that *are* applicable, and nobody knows that
 * number. See {@link buildClaimStatement} for why that keeps the claim at
 * `PARTIAL` even when the ratio reads 100%.
 */
export interface RuleCoverage {
  readonly encoded: number;
  readonly applicable: number;
  readonly deferred: readonly DeferredConstraint[];
}

/**
 * A golden-set measurement of professional agreement — §22.2, §23.
 *
 * Present only once the inter-architect variance measurement has actually been
 * taken. Its absence is the current state of the world and is reported as
 * `NOT_ASSESSED`, not as a pass.
 */
export interface GoldenSetMeasurement {
  readonly goldenSetVersion: string;
  readonly measuredAt: string;
  readonly plotsMeasured: number;
  readonly withinBand: number;
  /** How the inter-architect band itself was established. §22.2 does it first. */
  readonly bandBasis: string;
}

/**
 * Everything {@link buildClaimStatement} is allowed to know.
 *
 * There is no `regulatoryValidity` member and there must never be one. Adding a
 * field here — even an optional one, even one that only ever holds
 * `NOT_ASSESSED` — would make the fourth claim a parameter, and a parameter is
 * something a caller can set.
 *
 * `professionalAgreement` is required-but-nullable rather than optional on
 * purpose: a caller must write `professionalAgreement: undefined` and see
 * themselves do it. "No hidden defaults" applies to claims more than to numbers.
 */
export interface ClaimEvidence {
  readonly selfConsistency: {
    readonly invariants: InvariantSummary;
    readonly hardConstraintsChecked: number;
    readonly hardConstraintsViolated: number;
  };
  readonly ruleCoverage: RuleCoverage;
  readonly geometry: GeometryCheckSummary;
  readonly professionalAgreement: GoldenSetMeasurement | undefined;
}

// ---------------------------------------------------------------------------
// The five statements
// ---------------------------------------------------------------------------

const pct = (numerator: number, denominator: number): string =>
  denominator === 0
    ? 'n/a'
    : `${new Decimal(numerator).div(denominator).times(100).toDecimalPlaces(1).toString()}%`;

function selfConsistencyClaim(
  evidence: ClaimEvidence['selfConsistency'],
): { status: ClaimStatus; detail: string } {
  const { invariants, hardConstraintsChecked, hardConstraintsViolated } = evidence;
  const arithmeticCloses = invariants.failed === 0;
  const constraintsHold = hardConstraintsViolated === 0;
  const counts =
    `${hardConstraintsChecked} hard constraint(s) checked, ` +
    `${hardConstraintsViolated} violated; ${invariants.run} invariant(s) run, ` +
    `${invariants.failed} failed`;

  if (arithmeticCloses && constraintsHold) {
    return {
      // §2.2: "Yes, from Phase 0" — the one claim this product can support today.
      status: ClaimStatus.SUPPORTED,
      detail:
        `PASS. The configuration satisfies every constraint we encoded, and its ` +
        `arithmetic closes (${counts}). This is self-consistency and nothing more: ` +
        `it says the engine did what it was told, not that what it was told is right.`,
    };
  }

  const failures = [
    constraintsHold ? '' : `${hardConstraintsViolated} hard constraint(s) violated`,
    arithmeticCloses
      ? ''
      : `${invariants.failed} invariant(s) failed (${invariants.failedIds.join(', ')})`,
  ].filter((s) => s !== '');

  return {
    // No FAIL status exists in the §16.5 vocabulary — see the module header.
    // The word FAIL leads the detail and the report blocks emission.
    status: ClaimStatus.NOT_ASSESSED,
    detail:
      `FAIL. ${failures.join('; ')} (${counts}). A configuration that is not ` +
      `self-consistent may not be emitted (Principle 3, §12.3): failure blocks ` +
      `emission, never a warning and never a configurable severity.`,
  };
}

function ruleCoverageClaim(coverage: RuleCoverage): { status: ClaimStatus; detail: string } {
  const deferredIds = coverage.deferred.map((d) => d.ruleId);
  const lifeSafetyDeferred = coverage.deferred.filter((d) => d.isLifeSafety);
  return {
    /**
     * PARTIAL. Always. Not "PARTIAL until the rule base is complete".
     *
     * §2.2 answers "can we support it?" with "Partially; quantified and
     * disclosed", and that answer does not improve with effort, because the
     * denominator is our own inventory of what we thought applied. Encoding 40
     * of 40 requirements we identified says nothing about the forty-first we
     * never knew to look for. The ratio below is a measure of our diligence
     * against our own list; it is not a measure of coverage of Dubai regulation,
     * and reporting it as SUPPORTED would be the exact conflation Principle 8
     * exists to prevent.
     */
    status: ClaimStatus.PARTIAL,
    detail:
      `PARTIAL. We encoded ${coverage.encoded} of ${coverage.applicable} requirements ` +
      `identified as applicable (coverage ${pct(coverage.encoded, coverage.applicable)}). ` +
      `${coverage.deferred.length} are deferred and listed` +
      `${deferredIds.length > 0 ? `: ${deferredIds.join(', ')}` : ''}` +
      `${
        lifeSafetyDeferred.length > 0
          ? `. ${lifeSafetyDeferred.length} of the deferred rule(s) are life-safety ` +
            `rules (${lifeSafetyDeferred.map((d) => d.ruleId).join(', ')})`
          : ''
      }. ` +
      `The denominator is the set of requirements we identified, not the set that ` +
      `applies. A requirement nobody identified is absent from both sides of this ` +
      `ratio, so a high percentage is evidence of diligence against our own list ` +
      `and is not evidence of completeness.`,
  };
}

function geometricValidityClaim(
  geometry: GeometryCheckSummary,
): { status: ClaimStatus; detail: string } {
  if (!geometry.topologyChecked) {
    return {
      status: ClaimStatus.NOT_ASSESSED,
      detail:
        'NOT ASSESSED. No geometry was produced or checked in this run, so there is ' +
        'nothing to make this claim about.',
    };
  }
  if (geometry.topologyValid && geometry.areaDisagreements === 0) {
    return {
      status: ClaimStatus.SUPPORTED,
      detail:
        `PASS. Geometry is topologically valid; ${geometry.areasRecomputed} area(s) ` +
        `were independently recomputed and agree. The kernel runs in exact integer ` +
        `arithmetic on a declared 1 mm grid (§14.3), so agreement here is exact ` +
        `rather than within a tolerance.`,
    };
  }
  return {
    status: ClaimStatus.NOT_ASSESSED,
    detail:
      `FAIL. ` +
      `${geometry.topologyValid ? '' : 'Geometry is not topologically valid. '}` +
      `${
        geometry.areaDisagreements > 0
          ? `${geometry.areaDisagreements} of ${geometry.areasRecomputed} independent ` +
            `area recomputations disagreed, which §14.3 classes a P0 defect. `
          : ''
      }` +
      `This configuration may not be emitted.`,
  };
}

function professionalAgreementClaim(
  measurement: GoldenSetMeasurement | undefined,
): { status: ClaimStatus; detail: string } {
  if (measurement === undefined) {
    return {
      // The current state of the world, and §16.5's own "NOT YET MEASURED".
      status: ClaimStatus.NOT_ASSESSED,
      detail:
        'NOT YET MEASURED. No golden-set measurement exists. §22.2 requires the ' +
        'inter-architect variance measurement to be taken first — the band against ' +
        'which the engine is compared is defined by architects who have not yet been ' +
        'engaged, so the comparison cannot be made and no figure may be quoted. ' +
        'Until then this is the honest answer to "is it accurate?".',
    };
  }
  return {
    // MEASURED, not SUPPORTED. §2.2: "Measured, not asserted."
    status: ClaimStatus.MEASURED,
    detail:
      `MEASURED. Where measured against qualified architects on comparable plots, ` +
      `this engine fell within the inter-architect disagreement band in ` +
      `${measurement.withinBand} of ${measurement.plotsMeasured} cases ` +
      `(${pct(measurement.withinBand, measurement.plotsMeasured)}), golden set ` +
      `${measurement.goldenSetVersion}, measured ${measurement.measuredAt}. Band ` +
      `basis: ${measurement.bandBasis}. This is a measurement reported as a joint ` +
      `research finding, never a warranty: the band's width is set by how much the ` +
      `architects disagreed with each other, so the test gets easier the worse the ` +
      `profession performs (see docs/03-analysis/open-questions.md on P0-S2).`,
  };
}

/**
 * Build the five-way claim statement.
 *
 * The signature is the guarantee. `evidence` is the only input, it has no
 * regulatory member, and the fourth claim is not derived from anything — it is
 * {@link REGULATORY_VALIDITY_CLAIM}, unconditionally, forever.
 *
 * The result and all five members are frozen. That is not decoration: a report
 * template, a serializer or a well-meaning API layer that "normalizes" statuses
 * would otherwise be able to rewrite the one line in this product that must
 * never move.
 */
export function buildClaimStatement(evidence: ClaimEvidence): ClaimStatement {
  return Object.freeze({
    selfConsistency: Object.freeze(selfConsistencyClaim(evidence.selfConsistency)),
    ruleCoverage: Object.freeze(ruleCoverageClaim(evidence.ruleCoverage)),
    geometricValidity: Object.freeze(geometricValidityClaim(evidence.geometry)),
    professionalAgreement: Object.freeze(
      professionalAgreementClaim(evidence.professionalAgreement),
    ),
    regulatoryValidity: REGULATORY_VALIDITY_CLAIM,
  });
}

/**
 * The five statements as printable lines, in §16.5's order.
 *
 * §16.5 prints them SELF-CONSISTENCY, RULE COVERAGE, GEOMETRIC VALIDITY,
 * REGULATORY VALIDITY, PROFESSIONAL AGREEMENT — regulatory fourth, because "the
 * fourth line is permanent". The `ClaimStatement` interface in `@envelope/core`
 * declares its members in a different order (regulatory last). Field order in a
 * TypeScript interface is not presentation order, so this function fixes the
 * printed order rather than anyone relying on `Object.keys`.
 *
 * `FR-VAL-001 AC4` requires the distinction to appear verbatim; this is the
 * function the report and the JSON export print from.
 */
export function claimStatementLines(claims: ClaimStatement): readonly string[] {
  return [
    `SELF-CONSISTENCY [${claims.selfConsistency.status}] ${claims.selfConsistency.detail}`,
    `RULE COVERAGE [${claims.ruleCoverage.status}] ${claims.ruleCoverage.detail}`,
    `GEOMETRIC VALIDITY [${claims.geometricValidity.status}] ${claims.geometricValidity.detail}`,
    `REGULATORY VALIDITY [${claims.regulatoryValidity.status}] ${claims.regulatoryValidity.detail}`,
    `PROFESSIONAL AGREEMENT [${claims.professionalAgreement.status}] ` +
      claims.professionalAgreement.detail,
  ];
}

/** Raised when a claim statement asserts something this product may not claim. */
export class ClaimIntegrityError extends Error {
  override readonly name = 'ClaimIntegrityError';
}

/**
 * Re-check a claim statement before it leaves the system.
 *
 * `ClaimStatement` is a plain interface in `@envelope/core`, so a statement can
 * be assembled by hand anywhere — by a report template, by a test fixture, by a
 * deserializer reading a payload someone edited. This is the gate on the export
 * path that catches that, in the same spirit as `INV-15` re-checking the metric
 * annex independently rather than trusting the layer that was supposed to.
 *
 * Deliberately not bypassable by a flag (Principle 9's enforcement note: "there
 * is no override flag").
 */
export function assertClaimStatementHonest(claims: ClaimStatement): void {
  const problems: string[] = [];

  if (claims.regulatoryValidity.status !== ClaimStatus.NEVER_CLAIMED) {
    problems.push(
      `regulatory validity is "${claims.regulatoryValidity.status}" and must be ` +
        `"${ClaimStatus.NEVER_CLAIMED}". §2.2: never claimed, not obtainable.`,
    );
  }
  if (!claims.regulatoryValidity.detail.includes('NOT ASSESSED')) {
    problems.push(
      'the regulatory-validity line must state "NOT ASSESSED" verbatim (§16.5, ' +
        'FR-VAL-001 AC4).',
    );
  }
  if (claims.ruleCoverage.status !== ClaimStatus.PARTIAL) {
    problems.push(
      `rule coverage is "${claims.ruleCoverage.status}" and must be ` +
        `"${ClaimStatus.PARTIAL}": the denominator is our own inventory of ` +
        `applicable requirements, so completeness is not a claim we can make.`,
    );
  }
  if (
    claims.professionalAgreement.status !== ClaimStatus.MEASURED &&
    claims.professionalAgreement.status !== ClaimStatus.NOT_ASSESSED
  ) {
    problems.push(
      `professional agreement is "${claims.professionalAgreement.status}" and must be ` +
        `"${ClaimStatus.MEASURED}" or "${ClaimStatus.NOT_ASSESSED}": §2.2 says ` +
        `measured, not asserted.`,
    );
  }

  if (problems.length > 0) {
    throw new ClaimIntegrityError(
      `claim statement asserts more than this product may claim: ${problems.join(' ')} ` +
        `Principle 7 — no output, no report and no marketing material may describe ` +
        `validator/generator agreement as compliance.`,
    );
  }
}
