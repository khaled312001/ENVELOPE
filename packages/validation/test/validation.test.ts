/**
 * Tests for the independent validation module.
 *
 * The centre of gravity here is not the arithmetic — it is the claim statement.
 * Most of this file exists to prove that no sequence of calls, no evidence, and
 * no mutation produces an output describing this system as compliant. PRD
 * Principle 7, §2.2, §16.5.
 *
 * The fixtures deliberately build `ConstraintSet` values by hand rather than
 * calling `materialize()`. Running the resolver to produce the input to the
 * validator would import the generator's behaviour into the test that is
 * supposed to be checking the validator independently of it (§16.3).
 */

import {
  ClaimStatus,
  Decimal,
  ProvenanceGraph,
  Tracer,
  type Actor,
  type ClaimStatement,
} from '@envelope/core';
import {
  Mechanization,
  Operator,
  ResolutionStatus,
  RuleClass,
  ApprovalStatus,
  type ConstraintSet,
  type Resolution,
  type RuleRecord,
  type RuleValue,
} from '@envelope/rules';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  assertClaimStatementHonest,
  assertEmittable,
  buildClaimStatement,
  categoryForRuleClass,
  ClaimIntegrityError,
  claimStatementLines,
  ConstraintCategory,
  CONTRADICTION_BATTERY,
  checkParkingImpliedAreaVsSupply,
  checkTargetFloorsVsHeightBudget,
  checkTargetGfaVsBandA,
  checkTargetGfaVsUnitProgramme,
  checkTargetSellableVsEfficiencyCeiling,
  checkTargetUnitCountVsBandA,
  deferredConstraintsFrom,
  EmissionBlockedError,
  hardConstraintsFrom,
  HardStatus,
  INDEPENDENCE_LIMIT,
  NotEvaluableReason,
  ObservationKind,
  PhaseOneNotWiredError,
  PreferenceDirection,
  REGULATORY_VALIDITY_CLAIM,
  SoftStatus,
  validateConfiguration,
  type ClaimEvidence,
  type GeometryCheckSummary,
  type InvariantSummary,
  type Observation,
  type SoftPreference,
  type ValidationInput,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ACTOR: Actor = { id: 'u-1', name: 'Test Engineer' };

const citation = (clause: string) => ({
  instrumentId: 'TEST-INSTRUMENT',
  instrumentVersion: '1.0.0',
  clauseReference: clause,
  documentUri: 'urn:envelope:test',
  sourcePage: 1,
  sourceBbox: [0, 0, 1, 1] as const,
  sourceTextVerbatim: `test clause ${clause}`,
});

/**
 * A rule record for fixture purposes. `tests: []` is fine here — the store's
 * three-tests-per-rule integrity gate is `@envelope/rules`' concern and is not
 * what is under test.
 */
function testRule(
  overrides: Pick<RuleRecord, 'ruleId' | 'parameterId' | 'operator' | 'unit'> &
    Partial<RuleRecord>,
): RuleRecord {
  return {
    ruleClass: RuleClass.GENERATIVE,
    evaluator: 'scalar_max',
    evaluatorArgs: {},
    applicability: { always: true },
    citation: citation(overrides.ruleId),
    jurisdiction: 'TEST',
    isLifeSafety: false,
    mechanization: Mechanization.MECHANIZED,
    validFrom: '2020-01-01',
    validTo: null,
    recordedAt: '2020-01-01T00:00:00Z',
    version: 1,
    supersedes: null,
    status: ApprovalStatus.APPROVED,
    authoredBy: 'test',
    approvedBy: 'test-approver',
    approvedAt: '2020-01-01T00:00:00Z',
    tests: [],
    ...overrides,
  };
}

const scalar = (v: string): RuleValue => ({ kind: 'scalar', value: new Decimal(v) });

interface SetSpec {
  readonly resolved?: readonly { readonly rule: RuleRecord; readonly value: RuleValue }[];
  readonly evaluative?: readonly RuleRecord[];
  readonly deferred?: readonly RuleRecord[];
  readonly blocked?: readonly Resolution[];
}

function constraintSet(spec: SetSpec): ConstraintSet {
  const resolved = spec.resolved ?? [];
  const resolutions = new Map<string, Resolution>();
  for (const { rule, value } of resolved) {
    resolutions.set(rule.parameterId, {
      parameterId: rule.parameterId,
      status: ResolutionStatus.RESOLVED,
      governing: { rule, value },
      superseded: [],
      deferred: [],
    });
  }
  for (const blocked of spec.blocked ?? []) resolutions.set(blocked.parameterId, blocked);
  return {
    resolutions,
    generative: resolved.map((r) => r.rule).filter((r) => r.ruleClass === RuleClass.GENERATIVE),
    filtering: resolved.map((r) => r.rule).filter((r) => r.ruleClass === RuleClass.FILTERING),
    evaluative: spec.evaluative ?? [],
    deferred: spec.deferred ?? [],
    blocked: spec.blocked ?? [],
  };
}

/** A fresh tracer per configuration — provenance graphs are per run (§13.2). */
function observations(): {
  quantity: (id: string, value: string, unit: string, metricId?: string) => Observation;
  count: (id: string, value: number) => Observation;
  option: (id: string, value: string) => Observation;
} {
  const tracer = new Tracer(new ProvenanceGraph());
  return {
    quantity: (id, value, unit, metricId) => ({
      kind: ObservationKind.QUANTITY,
      value: tracer.userSet(id, new Decimal(value), { actor: ACTOR, unit }),
      unit,
      ...(metricId !== undefined ? { metricId } : {}),
    }),
    count: (id, value) => ({
      kind: ObservationKind.COUNT,
      value: tracer.userSet(id, value, { actor: ACTOR, unit: 'count' }),
      unit: 'count',
    }),
    option: (id, value) => ({
      kind: ObservationKind.OPTION,
      value: tracer.userSet(id, value, { actor: ACTOR }),
    }),
  };
}

const CLEAN_INVARIANTS: InvariantSummary = { run: 18, failed: 0, failedIds: [] };
const CLEAN_GEOMETRY: GeometryCheckSummary = {
  topologyChecked: true,
  topologyValid: true,
  areasRecomputed: 3,
  areaDisagreements: 0,
};

function input(
  set: ConstraintSet,
  observed: Readonly<Record<string, Observation>>,
  extra: Partial<ValidationInput> = {},
): ValidationInput {
  return {
    configuration: {
      runId: 'run-1',
      engineVersion: '0.1.0',
      ruleSetHash: 'rs_deadbeef_1',
      observations: observed,
    },
    constraintSet: set,
    invariants: CLEAN_INVARIANTS,
    geometry: CLEAN_GEOMETRY,
    professionalAgreement: undefined,
    validatedAt: '2026-08-30T00:00:00Z',
    ...extra,
  };
}

const evidence = (overrides: Partial<ClaimEvidence> = {}): ClaimEvidence => ({
  selfConsistency: {
    invariants: CLEAN_INVARIANTS,
    hardConstraintsChecked: 9,
    hardConstraintsViolated: 0,
  },
  ruleCoverage: { encoded: 9, applicable: 11, deferred: [] },
  geometry: CLEAN_GEOMETRY,
  professionalAgreement: undefined,
  ...overrides,
});

// Rules used across the behavioural tests.
const FAR_MAX = testRule({
  ruleId: 'R-FAR-MAX',
  parameterId: 'far.max',
  operator: Operator.MAX,
  unit: 'ratio',
});
const SETBACK_ROAD = testRule({
  ruleId: 'R-SETBACK-ROAD',
  parameterId: 'setback.road',
  operator: Operator.MIN,
  unit: 'm',
});
const COVERAGE_MAX = testRule({
  ruleId: 'R-COVERAGE-MAX',
  parameterId: 'coverage.max',
  operator: Operator.MAX,
  unit: '%',
});
const PODIUM_AREA = testRule({
  ruleId: 'R-PODIUM-AREA',
  parameterId: 'podium.footprint',
  operator: Operator.MAX,
  unit: 'm²',
});
const EGRESS_STAIRS = testRule({
  ruleId: 'R-EGRESS-STAIRS',
  parameterId: 'egress.stairs',
  operator: Operator.MIN,
  unit: 'count',
  ruleClass: RuleClass.FILTERING,
  isLifeSafety: true,
});
const TRAVEL_DISTANCE = testRule({
  ruleId: 'R-EGRESS-TRAVEL',
  parameterId: 'egress.travel_distance.max',
  operator: Operator.MAX,
  unit: 'm',
  ruleClass: RuleClass.EVALUATIVE_ONLY,
  isLifeSafety: true,
});
const FACADE = testRule({
  ruleId: 'R-FACADE-FIRE',
  parameterId: 'facade.fire_performance',
  operator: Operator.ENUM,
  unit: 'enum',
  ruleClass: RuleClass.DEFERRED,
  mechanization: Mechanization.NON_MECHANIZABLE,
});

// ---------------------------------------------------------------------------
// §16.3 — independence, asserted against the manifest rather than by inspection
// ---------------------------------------------------------------------------

describe('independence from the generator (§16.3, Principle 4)', () => {
  const read = (name: string): string =>
    readFileSync(fileURLToPath(new URL(`../${name}`, import.meta.url)), 'utf8');

  it('declares no dependency on the capacity engine or the geometry kernel', () => {
    // §16.3 asks for an import linter. This is stronger: the dependency is not
    // discouraged, it is absent, so the import cannot resolve.
    const manifest = JSON.parse(read('package.json')) as {
      dependencies: Readonly<Record<string, string>>;
    };
    expect(Object.keys(manifest.dependencies).sort()).toEqual([
      '@envelope/core',
      '@envelope/rules',
      'decimal.js',
    ]);
  });

  it('references only core and rules from its TypeScript project graph', () => {
    const tsconfig = JSON.parse(read('tsconfig.json')) as {
      references: readonly { readonly path: string }[];
    };
    expect(tsconfig.references.map((r) => r.path).sort()).toEqual(['../core', '../rules']);
  });
});

// ---------------------------------------------------------------------------
// §16.1 — the three categories
// ---------------------------------------------------------------------------

describe('constraint categories (§16.1)', () => {
  it('maps generative and filtering rules to HARD', () => {
    expect(categoryForRuleClass(RuleClass.GENERATIVE)).toBe(ConstraintCategory.HARD);
    expect(categoryForRuleClass(RuleClass.FILTERING)).toBe(ConstraintCategory.HARD);
  });

  it('defers evaluative-only rules rather than passing them unchecked', () => {
    // Phase 0 produces no floorplate, so a travel-distance rule has nothing to
    // be measured against. Reporting SATISFIED here would be the single most
    // dishonest thing this package could do.
    expect(categoryForRuleClass(RuleClass.EVALUATIVE_ONLY)).toBe(ConstraintCategory.DEFERRED);
    expect(categoryForRuleClass(RuleClass.DEFERRED)).toBe(ConstraintCategory.DEFERRED);
  });

  it('gives hard constraints no weight, penalty or score field (Principle 5)', () => {
    const set = constraintSet({ resolved: [{ rule: FAR_MAX, value: scalar('5.00') }] });
    const [hard] = hardConstraintsFrom(set);
    expect(hard).toBeDefined();
    for (const forbidden of ['weight', 'penalty', 'score', 'severity', 'deviation']) {
      expect(Object.hasOwn(hard as object, forbidden)).toBe(false);
    }
  });

  it('carries a citation on every hard constraint (FR-VAL-001 AC2)', () => {
    const set = constraintSet({
      resolved: [
        { rule: FAR_MAX, value: scalar('5.00') },
        { rule: SETBACK_ROAD, value: scalar('4.50') },
      ],
    });
    for (const c of hardConstraintsFrom(set)) {
      expect(c.citation.instrumentId).toBeTruthy();
      expect(c.citation.clauseReference).toBeTruthy();
    }
  });

  it('declares deferred and evaluative-only rules with a reason and a citation', () => {
    const set = constraintSet({ evaluative: [TRAVEL_DISTANCE], deferred: [FACADE] });
    const deferred = deferredConstraintsFrom(set);
    expect(deferred.map((d) => d.ruleId).sort()).toEqual(['R-EGRESS-TRAVEL', 'R-FACADE-FIRE']);
    for (const d of deferred) {
      expect(d.reason.length).toBeGreaterThan(20);
      expect(d.citation.clauseReference).toBeTruthy();
    }
    expect(deferred.find((d) => d.ruleId === 'R-EGRESS-TRAVEL')?.isLifeSafety).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Hard behaviour — feasibility filter, never a penalty
// ---------------------------------------------------------------------------

describe('hard constraints are feasibility filters (§16.1, Principle 5)', () => {
  const o = observations();
  const set = constraintSet({
    resolved: [
      { rule: FAR_MAX, value: scalar('5.00') },
      { rule: SETBACK_ROAD, value: scalar('4.50') },
      { rule: EGRESS_STAIRS, value: { kind: 'count', value: 2 } },
    ],
  });

  it('reports a satisfied configuration as feasible, with headroom', () => {
    const report = validateConfiguration(
      input(set, {
        'far.max': o.quantity('far.max', '4.90', 'ratio'),
        'setback.road': o.quantity('setback.road', '5.25', 'm'),
        'egress.stairs': o.count('egress.stairs', 2),
      }),
    );
    expect(report.summary.feasible).toBe(true);
    expect(report.summary.hardViolated).toBe(0);
    expect(report.summary.hardSatisfied).toBe(3);
    expect(report.emissionBlocked).toEqual([]);
    const far = report.outcomes.find((x) => 'ruleId' in x && x.ruleId === 'R-FAR-MAX');
    expect(far?.category).toBe(ConstraintCategory.HARD);
    expect(far && 'slack' in far ? far.slack?.toString() : undefined).toBe('0.1');
  });

  it('accepts a value sitting exactly on the bound', () => {
    // The case every real scheme lands on: a tower designed to exactly the
    // permitted FAR. A bit-for-bit comparison would report a violation that
    // does not exist once the value has been through Decimal division.
    const report = validateConfiguration(
      input(set, {
        'far.max': o.quantity('far.max', '5.00', 'ratio'),
        'setback.road': o.quantity('setback.road', '4.50', 'm'),
        'egress.stairs': o.count('egress.stairs', 2),
      }),
    );
    expect(report.summary.feasible).toBe(true);
    expect(report.summary.hardViolated).toBe(0);
  });

  it('reports a violating configuration as infeasible rather than penalised', () => {
    const report = validateConfiguration(
      input(set, {
        'far.max': o.quantity('far.max', '5.40', 'ratio'),
        'setback.road': o.quantity('setback.road', '5.25', 'm'),
        'egress.stairs': o.count('egress.stairs', 2),
      }),
    );

    expect(report.summary.feasible).toBe(false);
    expect(report.summary.hardViolated).toBe(1);
    expect(report.summary.violatedRuleIds).toEqual(['R-FAR-MAX']);

    const far = report.outcomes.find((x) => 'ruleId' in x && x.ruleId === 'R-FAR-MAX');
    expect(far && 'status' in far ? far.status : undefined).toBe(HardStatus.VIOLATED);
    // A violation is not a score: there is no deviation, no weight, nothing to
    // trade against. It is a yes/no answer with a magnitude attached.
    expect(Object.hasOwn(far as object, 'deviation')).toBe(false);
    expect(Object.hasOwn(far as object, 'weightedDeviation')).toBe(false);
    expect(far && 'slack' in far ? far.slack?.toString() : undefined).toBe('-0.4');
    expect(far?.statement).toContain('VIOLATED');

    // §16.1: violating candidates are never emitted.
    expect(report.emissionBlocked.length).toBeGreaterThan(0);
    expect(() => assertEmittable(report)).toThrow(EmissionBlockedError);
  });

  it('violates an integer count exactly, with no noise allowance', () => {
    const report = validateConfiguration(
      input(set, {
        'far.max': o.quantity('far.max', '4.90', 'ratio'),
        'setback.road': o.quantity('setback.road', '5.25', 'm'),
        'egress.stairs': o.count('egress.stairs', 1),
      }),
    );
    expect(report.summary.feasible).toBe(false);
    expect(report.summary.violatedRuleIds).toEqual(['R-EGRESS-STAIRS']);
    const stairs = report.outcomes.find((x) => 'ruleId' in x && x.ruleId === 'R-EGRESS-STAIRS');
    expect(stairs?.statement).toContain('LIFE SAFETY');
  });

  it('checks a range bound and an enumerated bound', () => {
    const floorToFloor = testRule({
      ruleId: 'R-F2F',
      parameterId: 'floor_to_floor',
      operator: Operator.RANGE,
      unit: 'm',
    });
    const structure = testRule({
      ruleId: 'R-STRUCTURE',
      parameterId: 'structure.system',
      operator: Operator.ENUM,
      unit: 'enum',
    });
    const rangeSet = constraintSet({
      resolved: [
        {
          rule: floorToFloor,
          value: { kind: 'range', min: new Decimal('2.70'), max: new Decimal('4.20') },
        },
        { rule: structure, value: { kind: 'enum', permitted: ['CONCRETE', 'STEEL'] } },
      ],
    });
    const report = validateConfiguration(
      input(rangeSet, {
        floor_to_floor: o.quantity('floor_to_floor', '3.20', 'm'),
        'structure.system': o.option('structure.system', 'TIMBER'),
      }),
    );
    expect(report.summary.hardSatisfied).toBe(1);
    expect(report.summary.violatedRuleIds).toEqual(['R-STRUCTURE']);
    const structural = report.outcomes.find((x) => 'ruleId' in x && x.ruleId === 'R-STRUCTURE');
    // §11.6: enumerations have no restrictiveness order, so "how far outside the
    // permitted set" is not a quantity and is not invented here.
    expect(structural && 'slack' in structural ? structural.slack : undefined).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Soft behaviour — scored, reported, never load-bearing
// ---------------------------------------------------------------------------

describe('soft preferences are scored and never decide feasibility', () => {
  const o = observations();
  const set = constraintSet({ resolved: [{ rule: FAR_MAX, value: scalar('5.00') }] });
  const preference: SoftPreference = {
    category: ConstraintCategory.SOFT,
    preferenceId: 'P-EFFICIENCY',
    parameterId: 'efficiency.gross',
    label: 'gross efficiency target',
    direction: PreferenceDirection.MAXIMIZE,
    target: new Decimal('0.82'),
    weight: new Decimal('1000000'),
    rationale: 'the developer’s underwriting assumes 82% gross efficiency',
  };

  it('scores a deviation without touching feasibility', () => {
    const report = validateConfiguration(
      input(
        set,
        {
          'far.max': o.quantity('far.max', '4.90', 'ratio'),
          'efficiency.gross': o.quantity('efficiency.gross', '0.41', 'ratio'),
        },
        { preferences: [preference] },
      ),
    );

    // Half the target efficiency, at a weight of a million. Still feasible.
    expect(report.summary.softScored).toBe(1);
    expect(report.summary.totalWeightedDeviation.gt(100000)).toBe(true);
    expect(report.summary.feasible).toBe(true);
    expect(report.emissionBlocked).toEqual([]);

    const soft = report.outcomes.find((x) => 'preferenceId' in x);
    expect(soft?.category).toBe(ConstraintCategory.SOFT);
    expect(soft && 'status' in soft ? soft.status : undefined).toBe(SoftStatus.SCORED);
    expect(soft?.statement).toContain('Reported, not enforced');
    // A preference is not a rule: nothing here cites a clause.
    expect(Object.hasOwn(soft as object, 'citation')).toBe(false);
    expect(Object.hasOwn(soft as object, 'ruleId')).toBe(false);
  });

  it('cannot rescue a violated hard constraint however small its deviation', () => {
    const report = validateConfiguration(
      input(
        set,
        {
          'far.max': o.quantity('far.max', '6.00', 'ratio'),
          'efficiency.gross': o.quantity('efficiency.gross', '0.82', 'ratio'),
        },
        { preferences: [preference] },
      ),
    );
    expect(report.summary.totalWeightedDeviation.isZero()).toBe(true);
    expect(report.summary.feasible).toBe(false);
  });

  it('reports an unscoreable preference as unscored, never as met', () => {
    const report = validateConfiguration(
      input(set, { 'far.max': o.quantity('far.max', '4.90', 'ratio') }, {
        preferences: [preference],
      }),
    );
    const soft = report.outcomes.find((x) => 'preferenceId' in x);
    expect(soft && 'status' in soft ? soft.status : undefined).toBe(SoftStatus.NOT_EVALUABLE);
    expect(report.summary.softScored).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// What the validator refuses to call a pass
// ---------------------------------------------------------------------------

describe('checks that could not be made are never reported as satisfied', () => {
  const o = observations();

  it('reports a missing value as NOT_EVALUABLE, and does not block emission for it', () => {
    const set = constraintSet({ resolved: [{ rule: FAR_MAX, value: scalar('5.00') }] });
    const report = validateConfiguration(input(set, {}));
    expect(report.summary.hardSatisfied).toBe(0);
    expect(report.summary.hardNotEvaluable).toBe(1);
    expect(report.summary.feasible).toBe(true);
    // A gap is a declared deferral, not an encoding defect.
    expect(report.emissionBlocked).toEqual([]);
    const far = report.outcomes.find((x) => 'ruleId' in x && x.ruleId === 'R-FAR-MAX');
    expect(far && 'reason' in far ? far.reason : undefined).toBe(
      NotEvaluableReason.NO_OBSERVATION,
    );
  });

  it('blocks emission on a unit mismatch rather than converting silently', () => {
    const set = constraintSet({ resolved: [{ rule: SETBACK_ROAD, value: scalar('4.50') }] });
    const report = validateConfiguration(
      input(set, { 'setback.road': o.quantity('setback.road', '5250', 'mm') }),
    );
    const outcome = report.outcomes.find((x) => 'ruleId' in x && x.ruleId === 'R-SETBACK-ROAD');
    expect(outcome && 'status' in outcome ? outcome.status : undefined).toBe(
      HardStatus.NOT_EVALUABLE,
    );
    expect(outcome && 'reason' in outcome ? outcome.reason : undefined).toBe(
      NotEvaluableReason.UNIT_MISMATCH,
    );
    expect(report.emissionBlocked.join(' ')).toContain('UNIT_MISMATCH');
  });

  it('blocks an area term the definitions annex does not define (FR-DEF-001 AC5)', () => {
    const set = constraintSet({ resolved: [{ rule: PODIUM_AREA, value: scalar('1600') }] });

    const named = validateConfiguration(
      input(set, {
        'podium.footprint': o.quantity('podium.footprint', '1500', 'm²', 'PODIUM_FOOTPRINT'),
      }),
    );
    expect(named.summary.hardSatisfied).toBe(1);
    expect(named.emissionBlocked).toEqual([]);

    const unnamed = validateConfiguration(
      input(set, { 'podium.footprint': o.quantity('podium.footprint', '1500', 'm²') }),
    );
    expect(unnamed.summary.hardNotEvaluable).toBe(1);
    expect(unnamed.emissionBlocked.join(' ')).toContain('UNDEFINED_AREA_TERM');

    const bogus = validateConfiguration(
      input(set, {
        'podium.footprint': o.quantity('podium.footprint', '1500', 'm²', 'NOT_IN_THE_ANNEX'),
      }),
    );
    expect(bogus.emissionBlocked.join(' ')).toContain('definitions annex');
  });

  it('blocks emission when a parameter halted for adjudication (§11.6)', () => {
    const set = constraintSet({
      blocked: [
        {
          parameterId: 'setback.road',
          status: ResolutionStatus.IRRECONCILABLE,
          superseded: [],
          deferred: [],
          conflict: {
            reason: 'two rules assert different EXACT values',
            rules: ['R-A', 'R-B'],
          },
        },
      ],
    });
    const report = validateConfiguration(input(set, {}));
    expect(report.summary.resolutionsBlocked).toBe(1);
    expect(report.emissionBlocked.join(' ')).toContain('IRRECONCILABLE');
    // No fabricated outcome: a halted parameter has no governing rule and so no
    // honest single citation to attach (FR-VAL-001 AC2).
    expect(report.outcomes).toEqual([]);
  });

  it('blocks emission on invariant failure and on geometric failure', () => {
    const set = constraintSet({ resolved: [{ rule: FAR_MAX, value: scalar('5.00') }] });
    const report = validateConfiguration(
      input(set, { 'far.max': o.quantity('far.max', '4.90', 'ratio') }, {
        invariants: { run: 18, failed: 2, failedIds: ['INV-03', 'INV-17'] },
        geometry: {
          topologyChecked: true,
          topologyValid: true,
          areasRecomputed: 3,
          areaDisagreements: 1,
        },
      }),
    );
    const joined = report.emissionBlocked.join(' ');
    expect(joined).toContain('INV-03');
    expect(joined).toContain('P0 defect');
    expect(() => assertEmittable(report)).toThrow(EmissionBlockedError);
  });
});

// ---------------------------------------------------------------------------
// §16.4 and §16.5 on the report
// ---------------------------------------------------------------------------

describe('every report carries the honest limit and the five claims', () => {
  const o = observations();
  const set = constraintSet({
    resolved: [{ rule: FAR_MAX, value: scalar('5.00') }],
    evaluative: [TRAVEL_DISTANCE],
    deferred: [FACADE],
  });
  const report = validateConfiguration(
    input(set, { 'far.max': o.quantity('far.max', '4.90', 'ratio') }),
  );

  it('prints §16.4 verbatim', () => {
    expect(report.independenceLimit).toBe(INDEPENDENCE_LIMIT);
    expect(report.independenceLimit).toContain('Implementation independence is not semantic');
    expect(report.independenceLimit).toContain('catches generator implementation bugs');
    expect(report.independenceLimit).toContain(
      'not catch a mis-encoded rule, a missing rule, or a rule whose applicability predicate is wrong',
    );
  });

  it('states that agreement is self-consistency, not compliance (AC3)', () => {
    expect(report.selfConsistencyNotice).toContain('self-consistency, not');
    expect(report.selfConsistencyNotice).toContain('compliance');
  });

  it('declares every deferred check in the output (§16.1)', () => {
    expect(report.summary.deferredDeclared).toBe(2);
    expect(report.summary.lifeSafetyDeferred).toBe(1);
    expect(report.claims.ruleCoverage.detail).toContain('R-EGRESS-TRAVEL');
    expect(report.claims.ruleCoverage.detail).toContain('life-safety');
  });

  it('prints the five statements with regulatory validity fourth (§16.5)', () => {
    expect(report.claimLines).toHaveLength(5);
    expect(report.claimLines[0]).toContain('SELF-CONSISTENCY');
    expect(report.claimLines[1]).toContain('RULE COVERAGE');
    expect(report.claimLines[2]).toContain('GEOMETRIC VALIDITY');
    expect(report.claimLines[3]).toContain('REGULATORY VALIDITY');
    expect(report.claimLines[3]).toContain('NOT ASSESSED');
    expect(report.claimLines[4]).toContain('PROFESSIONAL AGREEMENT');
  });
});

// ---------------------------------------------------------------------------
// The claim statement — the point of the package
// ---------------------------------------------------------------------------

describe('the five-way claim statement (§2.2, §16.5, Principle 8)', () => {
  it('supports self-consistency from Phase 0 when the invariants passed', () => {
    const claims = buildClaimStatement(evidence());
    expect(claims.selfConsistency.status).toBe(ClaimStatus.SUPPORTED);
    expect(claims.selfConsistency.detail).toContain('PASS');
    expect(claims.selfConsistency.detail).toContain('self-consistency and nothing more');
  });

  it('does not support self-consistency when an invariant failed', () => {
    const claims = buildClaimStatement(
      evidence({
        selfConsistency: {
          invariants: { run: 18, failed: 1, failedIds: ['INV-01'] },
          hardConstraintsChecked: 9,
          hardConstraintsViolated: 0,
        },
      }),
    );
    expect(claims.selfConsistency.status).not.toBe(ClaimStatus.SUPPORTED);
    expect(claims.selfConsistency.detail.startsWith('FAIL')).toBe(true);
    expect(claims.selfConsistency.detail).toContain('INV-01');
  });

  it('does not support self-consistency when a hard constraint was violated', () => {
    const claims = buildClaimStatement(
      evidence({
        selfConsistency: {
          invariants: CLEAN_INVARIANTS,
          hardConstraintsChecked: 9,
          hardConstraintsViolated: 1,
        },
      }),
    );
    expect(claims.selfConsistency.status).not.toBe(ClaimStatus.SUPPORTED);
    expect(claims.selfConsistency.detail.startsWith('FAIL')).toBe(true);
  });

  it('keeps rule coverage PARTIAL always, quantified, with the deferred list', () => {
    const set = constraintSet({ evaluative: [TRAVEL_DISTANCE], deferred: [FACADE] });
    const claims = buildClaimStatement(
      evidence({
        ruleCoverage: { encoded: 9, applicable: 11, deferred: deferredConstraintsFrom(set) },
      }),
    );
    expect(claims.ruleCoverage.status).toBe(ClaimStatus.PARTIAL);
    expect(claims.ruleCoverage.detail).toContain('We encoded 9 of 11');
    expect(claims.ruleCoverage.detail).toContain('81.8%');
    expect(claims.ruleCoverage.detail).toContain('2 are deferred');
    expect(claims.ruleCoverage.detail).toContain('R-FACADE-FIRE');
  });

  it('keeps rule coverage PARTIAL even at 100% of the identified requirements', () => {
    // The denominator is our own inventory. Encoding every requirement we
    // thought of says nothing about the one we did not.
    const claims = buildClaimStatement(
      evidence({ ruleCoverage: { encoded: 40, applicable: 40, deferred: [] } }),
    );
    expect(claims.ruleCoverage.status).toBe(ClaimStatus.PARTIAL);
    expect(claims.ruleCoverage.detail).toContain('100%');
    expect(claims.ruleCoverage.detail).toContain('not the set that applies');
  });

  it('supports geometric validity only when the kernel checks passed', () => {
    expect(buildClaimStatement(evidence()).geometricValidity.status).toBe(
      ClaimStatus.SUPPORTED,
    );

    const unchecked = buildClaimStatement(
      evidence({
        geometry: {
          topologyChecked: false,
          topologyValid: false,
          areasRecomputed: 0,
          areaDisagreements: 0,
        },
      }),
    );
    expect(unchecked.geometricValidity.status).toBe(ClaimStatus.NOT_ASSESSED);
    expect(unchecked.geometricValidity.detail).toContain('No geometry was produced');

    const failed = buildClaimStatement(
      evidence({
        geometry: {
          topologyChecked: true,
          topologyValid: false,
          areasRecomputed: 3,
          areaDisagreements: 1,
        },
      }),
    );
    expect(failed.geometricValidity.status).not.toBe(ClaimStatus.SUPPORTED);
    expect(failed.geometricValidity.detail.startsWith('FAIL')).toBe(true);
  });

  it('reports professional agreement as NOT_ASSESSED while no golden set exists', () => {
    const claims = buildClaimStatement(evidence());
    expect(claims.professionalAgreement.status).toBe(ClaimStatus.NOT_ASSESSED);
    expect(claims.professionalAgreement.detail).toContain('NOT YET MEASURED');
    expect(claims.professionalAgreement.detail).toContain('§22.2');
  });

  it('reports professional agreement as MEASURED, never SUPPORTED, once measured', () => {
    const claims = buildClaimStatement(
      evidence({
        professionalAgreement: {
          goldenSetVersion: 'gs-2026-09',
          measuredAt: '2026-09-30',
          plotsMeasured: 10,
          withinBand: 8,
          bandBasis: 'two blind architects, §22.2 variance measurement',
        },
      }),
    );
    expect(claims.professionalAgreement.status).toBe(ClaimStatus.MEASURED);
    expect(claims.professionalAgreement.detail).toContain('8 of 10');
    expect(claims.professionalAgreement.detail).toContain('never a warranty');
  });
});

// ---------------------------------------------------------------------------
// Regulatory validity — the line that never moves
// ---------------------------------------------------------------------------

describe('regulatory validity is NEVER_CLAIMED and cannot be set by any caller', () => {
  const permutations: readonly ClaimEvidence[] = [
    evidence(),
    evidence({
      selfConsistency: {
        invariants: { run: 18, failed: 5, failedIds: ['INV-01'] },
        hardConstraintsChecked: 0,
        hardConstraintsViolated: 9,
      },
    }),
    evidence({ ruleCoverage: { encoded: 999, applicable: 999, deferred: [] } }),
    evidence({
      professionalAgreement: {
        goldenSetVersion: 'gs-perfect',
        measuredAt: '2027-01-01',
        plotsMeasured: 1000,
        withinBand: 1000,
        bandBasis: 'every architect agreed with the engine every time',
      },
    }),
  ];

  it('says NEVER_CLAIMED for every possible body of evidence', () => {
    for (const e of permutations) {
      const claims = buildClaimStatement(e);
      expect(claims.regulatoryValidity.status).toBe(ClaimStatus.NEVER_CLAIMED);
      expect(claims.regulatoryValidity).toBe(REGULATORY_VALIDITY_CLAIM);
      expect(claims.regulatoryValidity.detail).toContain('NOT ASSESSED');
      expect(claims.regulatoryValidity.detail).toContain('Not obtainable');
    }
  });

  it('ignores a regulatory finding smuggled into the evidence object', () => {
    // There is no such parameter on ClaimEvidence, so this does not compile
    // without the cast. The cast is here to prove the runtime ignores it too.
    const smuggled = {
      ...evidence(),
      regulatoryValidity: { status: ClaimStatus.SUPPORTED, detail: 'the authority approved it' },
    } as unknown as ClaimEvidence;
    const claims = buildClaimStatement(smuggled);
    expect(claims.regulatoryValidity.status).toBe(ClaimStatus.NEVER_CLAIMED);
    expect(claims.regulatoryValidity.detail).not.toContain('approved');
  });

  it('cannot be overwritten on the returned statement', () => {
    const claims = buildClaimStatement(evidence());
    expect(Object.isFrozen(claims)).toBe(true);
    expect(Object.isFrozen(claims.regulatoryValidity)).toBe(true);
    expect(() => {
      (claims.regulatoryValidity as { status: ClaimStatus }).status = ClaimStatus.SUPPORTED;
    }).toThrow(TypeError);
    expect(() => {
      (claims as { regulatoryValidity: unknown }).regulatoryValidity = {
        status: ClaimStatus.SUPPORTED,
        detail: 'compliant',
      };
    }).toThrow(TypeError);
    expect(claims.regulatoryValidity.status).toBe(ClaimStatus.NEVER_CLAIMED);
  });

  it('refuses a hand-assembled statement that claims more (export gate)', () => {
    const dishonest: ClaimStatement = {
      selfConsistency: { status: ClaimStatus.SUPPORTED, detail: 'PASS' },
      ruleCoverage: { status: ClaimStatus.SUPPORTED, detail: 'complete' },
      geometricValidity: { status: ClaimStatus.SUPPORTED, detail: 'PASS' },
      professionalAgreement: { status: ClaimStatus.SUPPORTED, detail: 'architects agree' },
      regulatoryValidity: { status: ClaimStatus.SUPPORTED, detail: 'compliant with DM rules' },
    };
    expect(() => assertClaimStatementHonest(dishonest)).toThrow(ClaimIntegrityError);
    try {
      assertClaimStatementHonest(dishonest);
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('regulatory validity');
      expect(message).toContain('rule coverage');
      expect(message).toContain('professional agreement');
      expect(message).toContain('describe validator/generator agreement as compliance');
    }
  });

  it('rejects a statement whose regulatory line was reworded', () => {
    const reworded: ClaimStatement = {
      ...buildClaimStatement(evidence()),
      regulatoryValidity: { status: ClaimStatus.NEVER_CLAIMED, detail: 'see appendix' },
    };
    expect(() => assertClaimStatementHonest(reworded)).toThrow(/verbatim/);
  });

  it('passes every statement the module itself builds', () => {
    for (const e of permutations) {
      expect(() => assertClaimStatementHonest(buildClaimStatement(e))).not.toThrow();
    }
  });

  it('prints the permanent fourth line from claimStatementLines', () => {
    const lines = claimStatementLines(buildClaimStatement(evidence()));
    expect(lines[3]).toBe(
      `REGULATORY VALIDITY [NEVER_CLAIMED] ${REGULATORY_VALIDITY_CLAIM.detail}`,
    );
  });
});

// ---------------------------------------------------------------------------
// §16.2 — the contradiction battery, Phase 1
// ---------------------------------------------------------------------------

describe('the contradiction battery is declared and not wired (§16.2, Phase 1)', () => {
  it('tabulates the six checks with their incompatible pairs', () => {
    expect(CONTRADICTION_BATTERY).toHaveLength(6);
    for (const entry of CONTRADICTION_BATTERY) {
      expect(entry.phase).toBe(1);
      expect(entry.wired).toBe(false);
      expect(entry.incompatiblePair).toHaveLength(2);
    }
    expect(CONTRADICTION_BATTERY.map((c) => c.checkId)).toEqual([
      'TARGET_GFA_VS_UNIT_PROGRAMME',
      'TARGET_UNIT_COUNT_VS_BAND_A',
      'TARGET_FLOORS_VS_HEIGHT_BUDGET',
      'PARKING_IMPLIED_AREA_VS_SUPPLY',
      'TARGET_SELLABLE_VS_EFFICIENCY_CEILING',
      'TARGET_GFA_VS_BAND_A',
    ]);
  });

  it('throws rather than returning a false all-clear', () => {
    // A stub that returns null reads as "no contradiction found". That is the
    // V1 failure §12.1 describes, and it is why none of these returns.
    const d = new Decimal(1);
    expect(() =>
      checkTargetGfaVsUnitProgramme({
        targetGfaM2: d,
        unitCount: 1,
        mix: [],
        minUnitAreaM2ByType: {},
        targetEfficiency: d,
      }),
    ).toThrow(PhaseOneNotWiredError);
    expect(() =>
      checkTargetUnitCountVsBandA({
        targetUnitCount: 1,
        bandAGfaM2: d,
        weightedMeanUnitNsaM2: d,
        targetEfficiency: d,
      }),
    ).toThrow(PhaseOneNotWiredError);
    expect(() =>
      checkTargetFloorsVsHeightBudget({
        targetFloors: 1,
        heightCeilingM: d,
        minFloorToFloorM: d,
      }),
    ).toThrow(PhaseOneNotWiredError);
    expect(() =>
      checkParkingImpliedAreaVsSupply({
        parkingImpliedAreaM2: d,
        availableLevels: 1,
        footprintM2: d,
        usableFraction: d,
      }),
    ).toThrow(PhaseOneNotWiredError);
    expect(() =>
      checkTargetSellableVsEfficiencyCeiling({
        targetSellableM2: d,
        targetGfaM2: d,
        maxPlausibleEfficiency: d,
      }),
    ).toThrow(/Phase 1/);
    expect(() => checkTargetGfaVsBandA({ targetGfaM2: d, bandAGfaM2: d })).toThrow(/Q20/);
  });

  it('is not run by validateConfiguration', () => {
    const o = observations();
    const set = constraintSet({ resolved: [{ rule: COVERAGE_MAX, value: scalar('60') }] });
    expect(() =>
      validateConfiguration(
        input(set, { 'coverage.max': o.quantity('coverage.max', '55', '%') }),
      ),
    ).not.toThrow();
  });
});
