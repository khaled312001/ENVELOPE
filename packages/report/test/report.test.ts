/**
 * The report is the artifact a person acts on, so the properties tested here are
 * the ones `docs/03-analysis/open-questions.md` says we should be willing to put
 * in a contract — JSON round-trip identity, fingerprint stability — rather than
 * the measurement criteria we do not control.
 *
 * The fixture is a complete Phase 0 run for an 80 × 40 m plot, deliberately
 * including one `ASSUMED` value, one `USER_SET` value, one `NOT_ASSESSED`
 * invariant and one deferred check, because those four are the states most
 * likely to be quietly dropped by a renderer.
 */

import {
  ANNEX_VERSION,
  CapacityBand,
  ClaimStatus,
  ParkingInFar,
  ProvenanceClass,
  RENDER_HINTS,
  RenderHint,
  NodeKind,
  EdgeKind,
  ALL_DEFINITIONS,
  metric,
} from '@envelope/core';
import type { Citation, NodeId, ProvenanceEdge, ProvenanceNode, TracedWire } from '@envelope/core';
import { runPipeline } from '@envelope/capacity';
import { composeSheets, type Sheet } from '@envelope/sheets';
import { beforeAll, describe, expect, it } from 'vitest';
import { initGeometry } from '@envelope/geometry';

import { META, RECT_80x40, runInput } from '../../../test-support/pipeline.js';

import { esc } from '../src/html.js';
import { METRIC_AR } from '../src/words/index.js';

import {
  CLAIM_STATEMENT_VERBATIM,
  ClaimOverreachError,
  InvariantFailureError,
  InvariantStatus,
  RenderHintTamperedError,
  ReportImportError,
  RuleDisposition,
  RuleSetApproval,
  canonicalJson,
  decimalString,
  fromJson,
  groupDigits,
  runFingerprint,
  drawingSetHtml,
  studyReportHtml,
  toHtml,
  toJson,
  toJsonString,
  type AssumptionEntry,
  type ClauseRegisterSection,
  type RunReport,
} from '../src/index.js';
import { CLAUSE_DETAIL, DBC_REGISTER, PROPOSAL_DATE, WRITTEN_PROMISES } from '@envelope/rules';
import { clauseRegisterReport } from '@envelope/validation';

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

const d = (text: string) => decimalString(text);

let nodeCounter = 0;
const nodes: ProvenanceNode[] = [];
const edges: ProvenanceEdge[] = [];

/**
 * A traced value on the wire, with the render hint the engine would have
 * attached. Building it any other way would let a test assert a treatment the
 * engine cannot produce.
 */
function wire(
  parameterId: string,
  value: string,
  provenanceClass: ProvenanceClass,
  unit?: string,
): TracedWire {
  const node = `n${nodeCounter++}` as NodeId;
  nodes.push({
    id: node,
    kind: NodeKind.VALUE,
    parameterId,
    label: parameterId,
    value,
    provenanceClass,
    ...(unit !== undefined ? { unit } : {}),
  });
  const computation = `n${nodeCounter++}` as NodeId;
  nodes.push({ id: computation, kind: NodeKind.COMPUTATION, label: `derivation of ${parameterId}`, formula: `${parameterId} := ${value}` });
  edges.push({ from: node, to: computation, kind: EdgeKind.DERIVED_FROM });
  return {
    value,
    node,
    parameterId,
    provenanceClass,
    renderHint: RENDER_HINTS[provenanceClass],
    ...(unit !== undefined ? { unit } : {}),
  };
}

function citation(clauseReference: string, sourcePage: number): Citation {
  return {
    instrumentId: 'DBC',
    instrumentVersion: '2021',
    clauseReference,
    documentUri: 's3://envelope/instruments/dbc-2021.pdf',
    sourcePage,
    sourceBbox: [72, 640.5, 523.25, 668],
    sourceTextVerbatim: `Clause ${clauseReference}: the setback shall be not less than 7.5 m.`,
  };
}

const SEED_WARNING =
  'This output was produced from DRAFT rules with placeholder citations. It is a ' +
  'demonstration of the engine, not a capacity assessment.';

function makeRun(): RunReport {
  nodeCounter = 0;
  nodes.length = 0;
  edges.length = 0;

  const setbackFootprint = wire(
    'envelope.setback_permitted_footprint',
    '1625.00',
    ProvenanceClass.DERIVED,
    'm²',
  );
  const podium = wire('envelope.podium_footprint', '1600.00', ProvenanceClass.DERIVED, 'm²');
  const plate = wire('envelope.tower_plate_cap', '1060.00', ProvenanceClass.DERIVED, 'm²');
  const height = wire('envelope.height_ceiling_m', '120.000', ProvenanceClass.DERIVED, 'm');
  const bayFactor = wire('parking.bay_area_factor', '32.00', ProvenanceClass.ASSUMED, 'm²/bay');
  const realism = wire('capacity.user_realism_discount', '1.00', ProvenanceClass.USER_SET, 'ratio');
  const far = wire('rules.far_max', '5.000000', ProvenanceClass.DERIVED, 'ratio');

  const regulatory = wire('capacity.regulation_limited_gfa', '16000.00', ProvenanceClass.DERIVED, 'm²');
  const geometric = wire('capacity.geometry_limited_gfa', '15900.00', ProvenanceClass.DERIVED, 'm²');
  const parkingBand = wire('capacity.parking_limited_gfa', '14820.00', ProvenanceClass.ASSUMED, 'm²');

  return {
    runId: 'run_01JB8Z0M4Q',
    tenantId: 'tenant_demo',
    producedAt: '2026-08-30T09:15:00.000Z',
    engineVersion: 'envelope-engine/0.1.0',
    metricDefinitionsVersion: ANNEX_VERSION,
    ruleSet: {
      approval: RuleSetApproval.APPROVED,
      ruleSetVersion: 'dubai-residential/2026-08-01',
      contentHash: 'sha256:0f2c1a',
    },
    reviewer: {
      id: 'user_7',
      name: 'A. Reviewer',
      role: 'Development director',
      acknowledgedAt: '2026-08-30T09:20:00.000Z',
    },
    disclaimer:
      'For professional use in feasibility assessment only. Not a regulatory submission and not ' +
      'a substitute for a licensed architect.',
    plot: {
      plotId: 'plot_1',
      plotNumber: '345-8821',
      community: 'BUSINESS BAY',
      landUse: 'RESIDENTIAL_MULTI',
      shapeClass: 'RECTILINEAR',
      statedAreaM2: d('3200.00'),
      computedAreaM2: d('3200.00'),
      areaMismatch: false,
    },
    parkingInFar: {
      treatment: ParkingInFar.EXCLUDED_FROM_FAR,
      value: wire('definitions.parking_in_far', 'EXCLUDED_FROM_FAR', ProvenanceClass.USER_SET),
      citation: citation('§4.2.1', 44),
      declaredBy: 'A. Reviewer',
    },
    envelope: {
      dimensions: [
        {
          dimension: 'setback_permitted_footprint',
          label: 'Setback-permitted footprint',
          metricId: 'SETBACK_PERMITTED_FOOTPRINT',
          value: setbackFootprint,
          binding: {
            ruleId: 'R-SETBACK-ROAD',
            label: 'road setback, arterial frontage',
            value: d('7.500'),
            unit: 'm',
            citation: citation('§7.3.2', 148),
            runnerUp: null,
          },
        },
        {
          dimension: 'podium_footprint',
          label: 'Podium footprint',
          metricId: 'PODIUM_FOOTPRINT',
          value: podium,
          binding: {
            ruleId: 'R-COVERAGE-RES',
            label: 'plot coverage cap',
            value: d('1600.00'),
            unit: 'm²',
            citation: citation('§6.1.4', 121),
            runnerUp: {
              ruleId: 'R-SETBACK-ROAD',
              label: 'setback-permitted footprint',
              value: d('1625.00'),
              withinOnePercent: true,
            },
          },
        },
        {
          dimension: 'tower_plate',
          label: 'Tower plate cap',
          metricId: 'TOWER_PLATE',
          value: plate,
          binding: {
            ruleId: 'R-PLATE-MAX',
            label: 'tower plate cap',
            value: d('1060.00'),
            unit: 'm²',
            citation: citation('§6.4.1', 130),
            runnerUp: null,
          },
        },
        {
          dimension: 'height_ceiling',
          label: 'Height ceiling',
          metricId: null,
          value: height,
          binding: {
            ruleId: 'R-HEIGHT-MAX',
            label: 'height ceiling',
            value: d('120.000'),
            unit: 'm',
            citation: citation('§5.2.1', 96),
            runnerUp: null,
          },
        },
      ],
      edges: [
        {
          seq: 0,
          classification: 'ROAD',
          roadHierarchy: 'ARTERIAL',
          lengthM: d('80.000'),
          appliedSetbackM: d('7.500'),
          setbackRuleId: 'R-SETBACK-ROAD',
        },
        {
          seq: 1,
          classification: 'ADJACENT_PLOT',
          roadHierarchy: null,
          lengthM: d('40.000'),
          appliedSetbackM: d('6.000'),
          setbackRuleId: 'R-SETBACK-BOUNDARY-RES',
        },
      ],
      fixpointIterations: 3,
      fixpointConverged: true,
    },
    capacity: {
      bands: [
        {
          band: CapacityBand.REGULATORY,
          label: 'Regulation-limited',
          question: 'What do FAR and the area caps permit?',
          gfa: regulatory,
          metricId: 'GFA',
          derivation: 'FAR 5.000000 × plot area 3,200.00 m²',
          inputs: [{ name: 'FAR ceiling', value: far }],
          governing: false,
        },
        {
          band: CapacityBand.GEOMETRIC,
          label: 'Geometry-limited',
          question: 'What does the envelope physically hold under height and footprint limits?',
          gfa: geometric,
          metricId: 'GFA',
          derivation: 'tower plate 1,060.00 m² × 15 levels',
          inputs: [{ name: 'Tower plate', value: plate }],
          governing: false,
        },
        {
          band: CapacityBand.PARKING,
          label: 'Parking-limited',
          question: 'What can the achievable parking supply support?',
          gfa: parkingBand,
          metricId: 'GFA',
          derivation: '412 bays ÷ 1.5 bays per unit × 120.00 m² per unit ÷ efficiency 0.78',
          inputs: [{ name: 'Bay area factor', value: bayFactor }],
          governing: true,
        },
      ],
      governingBand: CapacityBand.PARKING,
      governingGfa: parkingBand,
      governingConstraint: {
        ruleId: 'R-PARKING-RATIO-RES',
        label: 'achievable parking supply',
        value: d('14820.00'),
        unit: 'm²',
        citation: citation('§9.1.1', 201),
        runnerUp: {
          ruleId: 'R-PLATE-MAX',
          label: 'geometry-limited capacity',
          value: d('15900.00'),
          withinOnePercent: false,
        },
      },
      nextBindingBand: CapacityBand.GEOMETRIC,
      headroomToNextM2: d('1080.00'),
      integerGranularityLossM2: d('300.00'),
      userRealismDiscount: realism,
      levels: wire('capacity.levels', '15', ProvenanceClass.DERIVED, 'levels'),
    },
    parking: {
      residentBays: wire('parking.resident_bays', '353', ProvenanceClass.DERIVED, 'bays'),
      visitorBays: wire('parking.visitor_bays', '59', ProvenanceClass.DERIVED, 'bays'),
      totalBays: wire('parking.total_bays', '412', ProvenanceClass.DERIVED, 'bays'),
      bayAreaFactorM2: bayFactor,
      requiredAreaM2: wire('parking.required_area', '13184.00', ProvenanceClass.ASSUMED, 'm²'),
      availableAreaPerLevelM2: wire(
        'parking.available_area_per_level',
        '1600.00',
        ProvenanceClass.DERIVED,
        'm²',
      ),
      levelsRequired: wire('parking.levels_required', '9', ProvenanceClass.ASSUMED, 'levels'),
      levelsAvailable: wire('parking.levels_available', '8', ProvenanceClass.DERIVED, 'levels'),
      headroomBays: d('-38'),
      supportableUnitCeiling: wire('parking.supportable_units', '123', ProvenanceClass.ASSUMED, 'units'),
      podiumImplication:
        'Parking demand exceeds the basement supply by one level. Either the podium absorbs a ' +
        'parking deck, which reduces the saleable podium area, or the unit count falls.',
      ratioCitations: [citation('§9.1.1', 201)],
      metricIds: ['PARKING_AREA', 'BAY_AREA_FACTOR'],
    },
    rules: {
      applied: [
        {
          ruleId: 'R-SETBACK-ROAD',
          parameterId: 'setback.road',
          label: 'Road setback by hierarchy',
          ruleClass: 'GENERATIVE',
          value: '7.5',
          unit: 'm',
          citation: citation('§7.3.2', 148),
        },
        {
          ruleId: 'R-FAR-MAX',
          parameterId: 'far.max',
          label: 'Maximum floor area ratio',
          ruleClass: 'GENERATIVE',
          value: '5.0',
          unit: 'ratio',
          citation: citation('§6.1.1', 118),
        },
      ],
      excluded: [
        {
          ruleId: 'R-SETBACK-ROAD-COLLECTOR',
          parameterId: 'setback.road',
          label: 'Road setback, collector frontage',
          disposition: RuleDisposition.SUPERSEDED,
          reason:
            'Both rules govern setback.road on edge 0. The arterial rule is more specific on ' +
            'road hierarchy and is more restrictive, so it governs.',
          supersededByRuleId: 'R-SETBACK-ROAD',
          citation: citation('§7.3.3', 149),
        },
        {
          ruleId: 'R-PODIUM-VILLA',
          parameterId: 'coverage.max',
          label: 'Coverage cap, single-family',
          disposition: RuleDisposition.NOT_APPLICABLE,
          reason: 'Applies to RESIDENTIAL_SINGLE; this plot is RESIDENTIAL_MULTI.',
          supersededByRuleId: null,
          citation: citation('§6.1.9', 124),
        },
      ],
      encodedCount: 41,
      identifiedApplicableCount: 47,
      deferredCount: 6,
    },
    assumptions: [
      {
        rank: 1,
        parameterId: 'parking.bay_area_factor',
        label: 'Bay area factor',
        value: bayFactor,
        basis:
          'No approved rule states a gross area per bay for structured basement parking in this ' +
          'community. 32 m²/bay is the mid-point of the 28–35 m²/bay range the annex records for ' +
          'this construction type.',
        perturbation: '+3 m²/bay',
        relativeEffect: d('0.0662'),
        impactStatement: 'removes 1 parking level: −1,060 m² GFA, −8 units',
      },
      {
        rank: 2,
        parameterId: 'parking.efficiency',
        label: 'Parking level efficiency',
        value: wire('parking.efficiency', '0.780000', ProvenanceClass.ASSUMED, 'ratio'),
        basis:
          'No rule governs the usable fraction of a parking level. 0.78 is the value the seed ' +
          'rule set records for a rectangular basement with a single ramp.',
        perturbation: '−0.05',
        relativeEffect: d('0.0310'),
        impactStatement: 'reduces supportable units by 6',
      },
    ],
    invariants: [
      {
        invariantId: 'INV-03',
        statement: 'total GFA ÷ plot area = reported FAR',
        tolerance: '0.1%',
        status: InvariantStatus.PASS,
        observed: d('4.631250'),
        expected: d('4.631250'),
        detail: '',
      },
      {
        invariantId: 'INV-10',
        statement: 'tower plate ≤ podium footprint AND ≤ tower plate cap',
        tolerance: 'exact',
        status: InvariantStatus.PASS,
        observed: d('1060.00'),
        expected: d('1600.00'),
        detail: 'plate is within both bounds',
      },
      {
        invariantId: 'INV-04',
        statement: 'Σ(unit counts by type) = reported unit count',
        tolerance: 'exact',
        status: InvariantStatus.NOT_ASSESSED,
        observed: null,
        expected: null,
        detail: 'Requires a unit schedule, which Phase 0 does not generate.',
      },
      {
        invariantId: 'INV-16',
        statement: 'governing capacity = min(A, B, C) and is labelled as such',
        tolerance: 'exact',
        status: InvariantStatus.PASS,
        observed: d('14820.00'),
        expected: d('14820.00'),
        detail: '',
      },
    ],
    claim: {
      selfConsistency: { status: ClaimStatus.SUPPORTED, detail: 'PASS — 13 of 18 invariants run, 13 passed' },
      ruleCoverage: {
        status: ClaimStatus.PARTIAL,
        detail: 'We encoded 41 of 47 requirements identified as applicable. 6 are deferred. Coverage 87%',
      },
      geometricValidity: {
        status: ClaimStatus.SUPPORTED,
        detail: 'PASS — three independent area computations agree exactly',
      },
      professionalAgreement: { status: ClaimStatus.NOT_ASSESSED, detail: 'NOT YET MEASURED' },
      regulatoryValidity: { status: ClaimStatus.NEVER_CLAIMED, detail: 'NOT ASSESSED' },
    },
    deferredChecks: [
      {
        ruleId: 'R-TRAVEL-DISTANCE',
        parameterId: 'egress.travel_distance',
        label: 'Maximum travel distance to a protected exit',
        reason:
          'Evaluative-only: assessable once a floor plate is laid out, which Phase 0 does not ' +
          'produce. There is no way to generate a floorplate from a travel-distance limit.',
        citation: citation('§3.4.1', 88),
      },
    ],
    provenance: { nodes: [...nodes], edges: [...edges] },
    structuredInputs: {
      plot: {
        plotNumber: '345-8821',
        ring: [
          { x: 0, y: 0 },
          { x: 80000, y: 0 },
          { x: 80000, y: 40000 },
          { x: 0, y: 40000 },
        ],
        statedAreaM2: '3200.00',
      },
      landUse: 'RESIDENTIAL_MULTI',
    },
    userInputs: [
      {
        parameterId: 'capacity.user_realism_discount',
        label: 'Realism discount',
        value: '1.00',
        unit: 'ratio',
        enteredBy: { id: 'user_7', name: 'A. Reviewer' },
        enteredAt: '2026-08-30T09:10:00.000Z',
      },
      {
        parameterId: 'definitions.parking_in_far',
        label: 'Parking-in-FAR treatment',
        value: 'EXCLUDED_FROM_FAR',
        unit: null,
        enteredBy: { id: 'user_7', name: 'A. Reviewer' },
        enteredAt: '2026-08-30T09:11:00.000Z',
      },
    ],
    areaTermsUsed: [
      'SETBACK_PERMITTED_FOOTPRINT',
      'PODIUM_FOOTPRINT',
      'TOWER_PLATE',
      'GFA',
      'PARKING_AREA',
      'BAY_AREA_FACTOR',
    ],
  };
}

const draftOf = (run: RunReport): RunReport => ({
  ...run,
  ruleSet: {
    approval: RuleSetApproval.DRAFT,
    ruleSetVersion: run.ruleSet.ruleSetVersion,
    contentHash: run.ruleSet.contentHash,
    warning: SEED_WARNING,
  },
});

/** Round-trip through actual text, not through the object graph. */
const roundTrip = (run: RunReport): RunReport =>
  fromJson(JSON.parse(JSON.stringify(toJson(run))) as unknown);

// ---------------------------------------------------------------------------

describe('JSON export', () => {
  it('round-trips through text with identity — FR-OUT-001 AC4', () => {
    const run = makeRun();
    expect(roundTrip(run)).toEqual(run);
  });

  it('round-trips a DRAFT run, warning and all', () => {
    const run = draftOf(makeRun());
    expect(roundTrip(run)).toEqual(run);
  });

  it('serialises every decimal as a string, never as a JSON number', () => {
    const text = toJsonString(makeRun());
    // A bare `: 16000` anywhere would mean a magnitude crossed the wire as a
    // double. Counts and page numbers are the only unquoted numbers permitted.
    expect(text).toContain('"value":"16000.00"');
    expect(text).not.toContain('"value":16000');
    expect(text).toContain('"headroomToNextM2":"1080.00"');
  });

  it('puts SEED_RULES_WARNING first in the canonical serialisation', () => {
    const text = toJsonString(draftOf(makeRun()));
    expect(text.startsWith('{"SEED_RULES_WARNING":')).toBe(true);
    expect(text).toContain(SEED_WARNING);
  });

  it('omits SEED_RULES_WARNING entirely when the rules were approved', () => {
    expect(toJsonString(makeRun())).not.toContain('SEED_RULES_WARNING');
  });

  it('sorts object keys, so the same run always produces the same bytes', () => {
    const run = makeRun();
    expect(toJsonString(run)).toBe(toJsonString(run));
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it('refuses a payload whose stored fingerprint no longer matches its contents', () => {
    const document = JSON.parse(JSON.stringify(toJson(makeRun()))) as {
      run: { engineVersion: string };
    };
    document.run.engineVersion = 'envelope-engine/9.9.9';
    expect(() => fromJson(document)).toThrow(/fingerprint mismatch/);
  });

  it('refuses a decimal that is not in exact plain form', () => {
    expect(() => decimalString('1e5')).toThrow(ReportImportError);
    expect(() => decimalString('1,625.00')).toThrow(ReportImportError);
    expect(() => decimalString('+5')).toThrow(ReportImportError);
    expect(decimalString('-38')).toBe('-38');
  });
});

describe('emission gates', () => {
  it('blocks emission when any invariant failed — §12.3', () => {
    const run = makeRun();
    const [first, ...rest] = run.invariants;
    const failing: RunReport = {
      ...run,
      invariants: [{ ...first!, status: InvariantStatus.FAIL }, ...rest],
    };
    expect(() => toJson(failing)).toThrow(InvariantFailureError);
    expect(() => toHtml(failing)).toThrow(/INV-03/);
  });

  it('blocks any run that claims regulatory validity — Principle 7', () => {
    const run = makeRun();
    const overreaching: RunReport = {
      ...run,
      claim: {
        ...run.claim,
        regulatoryValidity: { status: ClaimStatus.SUPPORTED, detail: 'compliant' },
      },
    };
    expect(() => toHtml(overreaching)).toThrow(ClaimOverreachError);
  });

  it('refuses a value whose render hint was softened away from its class — §13.1', () => {
    const run = makeRun();
    const softened: RunReport = {
      ...run,
      parking: {
        ...run.parking,
        bayAreaFactorM2: {
          ...run.parking.bayAreaFactorM2,
          renderHint: RenderHint.NEUTRAL_WITH_CITATION,
        },
      },
    };
    expect(() => toHtml(softened)).toThrow(RenderHintTamperedError);
  });

  it('refuses an area term the definitions annex does not define — FR-DEF-001 AC5', () => {
    const run = makeRun();
    const undefinedTerm: RunReport = {
      ...run,
      areaTermsUsed: [...run.areaTermsUsed, 'CARPET_AREA'],
    };
    expect(() => toHtml(undefinedTerm)).toThrow(/CARPET_AREA/);
  });
});

describe('run fingerprint — §13.4', () => {
  it('is stable across calls and reads no clock', () => {
    const run = makeRun();
    const first = runFingerprint(run);
    const second = runFingerprint(run);
    expect(first.digest).toBe(second.digest);
    expect(first.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(first.algorithm).toBe('SHA-256');
  });

  it('states that its scope excludes the PDF bytes', () => {
    const { scope } = runFingerprint(makeRun());
    expect(scope).toContain('does NOT cover the PDF bytes');
    expect(scope).toContain('Q24');
  });

  const digestOf = (run: RunReport): string => runFingerprint(run).digest;

  it('changes when an assumption value changes', () => {
    const run = makeRun();
    const [first, ...rest] = run.assumptions;
    const moved: AssumptionEntry = {
      ...first!,
      value: { ...first!.value, value: '35.00' },
    };
    expect(digestOf({ ...run, assumptions: [moved, ...rest] })).not.toBe(digestOf(run));
  });

  it('changes when a user input changes', () => {
    const run = makeRun();
    const [first, ...rest] = run.userInputs;
    expect(
      digestOf({ ...run, userInputs: [{ ...first!, value: '0.92' }, ...rest] }),
    ).not.toBe(digestOf(run));
  });

  it('changes when the rule set content hash changes', () => {
    const run = makeRun();
    expect(
      digestOf({ ...run, ruleSet: { ...run.ruleSet, contentHash: 'sha256:deadbeef' } }),
    ).not.toBe(digestOf(run));
  });

  it('changes when the engine or annex version changes', () => {
    const run = makeRun();
    expect(digestOf({ ...run, engineVersion: 'envelope-engine/0.2.0' })).not.toBe(digestOf(run));
    expect(digestOf({ ...run, metricDefinitionsVersion: '0.2.0' })).not.toBe(digestOf(run));
  });

  it('changes when a structured input changes', () => {
    const run = makeRun();
    expect(
      digestOf({ ...run, structuredInputs: { ...run.structuredInputs, landUse: 'COMMERCIAL' } }),
    ).not.toBe(digestOf(run));
  });

  it('changes when an emitted value in the provenance graph changes', () => {
    // Outputs are covered transitively: every emitted value is a VALUE node.
    const run = makeRun();
    const [first, ...rest] = run.provenance.nodes;
    expect(
      digestOf({
        ...run,
        provenance: { ...run.provenance, nodes: [{ ...first!, value: '9999.00' }, ...rest] },
      }),
    ).not.toBe(digestOf(run));
  });

  it('does NOT change with the render time, the run id, or the reviewer', () => {
    const run = makeRun();
    const baseline = digestOf(run);
    expect(digestOf({ ...run, producedAt: '2027-01-01T00:00:00.000Z' })).toBe(baseline);
    expect(digestOf({ ...run, runId: 'run_A_DIFFERENT_ID' })).toBe(baseline);
    expect(digestOf({ ...run, reviewer: null })).toBe(baseline);
  });

  it('survives the JSON round trip unchanged', () => {
    const run = makeRun();
    expect(digestOf(roundTrip(run))).toBe(digestOf(run));
  });
});

describe('HTML report', () => {
  const html = toHtml(makeRun());

  it('numbers plot edges from 1, as every screen before it does', () => {
    // The fixture's edges carry seq 0 and 1; a reader who classified "edge 1" on the
    // plot step must find edge 1 here, not a row headed 0.
    expect(html).toContain('<tr><th scope="row">1</th><td>ROAD · ARTERIAL</td>');
    expect(html).toContain('<tr><th scope="row">2</th><td>ADJACENT_PLOT</td>');
    expect(html).not.toContain('<tr><th scope="row">0</th>');
  });

  it('names each band once in its heading', () => {
    expect(html).toContain('<h3>Band A · Regulation-limited</h3>');
    expect(html).not.toMatch(/<h3>Band [ABC] · Band [ABC]/);
  });
  it('is a self-contained document with no external resource', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<html lang="en"');
    expect(html).not.toMatch(/<link\b/);
    expect(html).not.toMatch(/<script\b/);
    expect(html).not.toContain('@font-face');
    expect(html).not.toContain('https://');
    expect(html).not.toContain('http://');
  });

  it('carries every section §3.4 promises a user', () => {
    for (const item of ['3.4-1', '3.4-2', '3.4-3', '3.4-4', '3.4-5', '3.4-6', '3.4-7', '3.4-8']) {
      expect(html).toContain(`data-prd="${item}"`);
    }
    expect(html).toContain('Buildable envelope');
    expect(html).toContain('Capacity bands A, B and C');
    expect(html).toContain('Parking');
    expect(html).toContain('Rules applied, and rules considered and excluded');
    expect(html).toContain('Assumption register');
    expect(html).toContain('Invariant results');
    expect(html).toContain('the five-way claim statement');
    expect(html).toContain('Deferred checks');
  });

  it('names the binding constraint for every envelope dimension, near-ties included', () => {
    expect(html).toContain('R-SETBACK-ROAD');
    expect(html).toContain('R-COVERAGE-RES');
    expect(html).toContain('R-PLATE-MAX');
    expect(html).toContain('R-HEIGHT-MAX');
    expect(html).toContain('binds within 1%');
  });

  it('shows the three bands with their derivations and names the governing one', () => {
    expect(html).toContain('Band A');
    expect(html).toContain('Band B');
    expect(html).toContain('Band C');
    expect(html).toContain('FAR 5.000000 × plot area 3,200.00 m²');
    expect(html).toContain('This band governs.');
    expect(html).toContain('Integer granularity loss');
  });

  it('states that no realistic or expected band exists — §15.3', () => {
    expect(html).toContain('There is no realistic, expected or likely capacity band');
  });

  it('lists rules considered and excluded, with reasons', () => {
    expect(html).toContain('R-SETBACK-ROAD-COLLECTOR');
    expect(html).toContain('Superseded');
    expect(html).toContain('R-PODIUM-VILLA');
    expect(html).toContain('Not applicable');
  });

  it('prints the five-way claim statement verbatim — §16.5', () => {
    for (const statement of Object.values(CLAIM_STATEMENT_VERBATIM)) {
      expect(html).toContain(statement);
    }
  });

  it('always states REGULATORY VALIDITY: NOT ASSESSED, including in the footer', () => {
    expect(html).toContain('REGULATORY VALIDITY: NOT ASSESSED');
    expect(html).toContain('<footer class="running-footer">');
  });

  it('carries the run id and the annex version in the repeating footer', () => {
    const footer = html.slice(html.indexOf('<footer'));
    expect(footer).toContain('run_01JB8Z0M4Q');
    expect(footer).toContain(ANNEX_VERSION);
  });

  it('repeats the footer on paper in the page margin, where it cannot cover a heading', () => {
    // It was a fixed element, and the Chromium that prints these put it at the TOP
    // of every page, over each section's heading. A margin box is outside the
    // content area by definition.
    expect(html).toMatch(/@bottom-left \{ content: "Run run_01JB8Z0M4Q[^"]*Metric definitions annex/);
    expect(html).toMatch(/@bottom-right \{ content: "REGULATORY VALIDITY: NOT ASSESSED/);
    expect(html).not.toMatch(/position:\s*fixed/);
  });

  it('cites the metric definitions annex version — FR-DEF-001 AC4', () => {
    expect(html).toContain(`Metric definitions annex ${ANNEX_VERSION}`);
    // …and prints the definition itself, not only the version number, so a
    // reader can see what "GFA" was taken to include on this run.
    expect(html).toContain('Gross Floor Area');
    expect(html).toContain('Parking Area');
    expect(html).toContain('Vertical cores (stairs, lifts, shafts) measured once per level');
  });

  it('renders ASSUMED values in amber AND with a cue that survives greyscale', () => {
    // Colour.
    expect(html).toContain('--assumed-bg: #fdf0d2');
    expect(html).toContain('background: var(--assumed-bg)');
    // Non-colour, twice over: a dotted underline and a glyph.
    expect(html).toMatch(/\.v-assumed\s*\{[^}]*border-bottom:\s*2px dotted/);
    expect(html).toContain('<span class="qty v-assumed"><span class="glyph" aria-hidden="true">◆</span>');
    // And a text alternative for a screen reader.
    expect(html).toContain('(assumed — not a cited rule)');
  });

  it('marks USER_SET with a text badge and deferred items with hatching', () => {
    expect(html).toContain('<span class="badge">USER</span>');
    expect(html).toContain('repeating-linear-gradient');
    expect(html).toContain('NOT ASSESSED');
  });

  it('ranks the assumption register and gives each entry a basis and an impact', () => {
    const register = html.slice(html.indexOf('data-prd="3.4-5"'));
    expect(register.indexOf('Bay area factor')).toBeLessThan(
      register.indexOf('Parking level efficiency'),
    );
    expect(html).toContain('removes 1 parking level: −1,060 m² GFA, −8 units');
  });

  it('shows a not-assessed invariant rather than omitting it', () => {
    expect(html).toContain('INV-04');
    expect(html).toContain('Requires a unit schedule');
  });

  it('footnotes every figure to its provenance and every citation to its clause', () => {
    expect(html).toContain('Derivation index');
    expect(html).toContain('id="fn-1"');
    expect(html).toContain('id="cite-1"');
    expect(html).toContain('the setback shall be not less than 7.5 m');
  });

  it('escapes text taken from source documents', () => {
    const run = makeRun();
    const hostile: RunReport = {
      ...run,
      plot: { ...run.plot, community: '<script>alert("x")</script>' },
    };
    const output = toHtml(hostile);
    expect(output).not.toContain('<script>');
    expect(output).toContain('&lt;script&gt;');
  });

  it('puts SEED_RULES_WARNING above everything when the rules were DRAFT', () => {
    const drafted = toHtml(draftOf(makeRun()));
    expect(drafted).toContain('SEED_RULES_WARNING');
    expect(drafted).toContain(SEED_WARNING);
    expect(drafted.indexOf('SEED_RULES_WARNING')).toBeLessThan(drafted.indexOf('<h1>'));
    expect(html).not.toContain('SEED_RULES_WARNING');
  });

  it('says so when the metric definitions annex is unsigned', () => {
    // The annex ships unsigned (0.1.0-UNSIGNED), so this is the live state and
    // the report must not quietly present placeholder definitions as signed ones.
    expect(html).toContain('Unsigned metric definitions annex');
    expect(html).toContain('is NOT SIGNED');
  });
});

describe('the GFA calculation', () => {
  /*
    The area table a submission drawing carries. A run stored before it existed
    has none and must render none; a run that has one prints every figure as the
    engine stated it, the square feet included.
  */
  /*
    THE FIXTURE IS THE CLIENT'S OWN SCHEME, not a round number.

    `docs/03-analysis/client-drawings-2026-10-05.md` §4 transcribes the table he
    sent on 5 October and asked for by name — *«Calculations»* — on a 1,365.23 m²
    plot at FAR 3.50. Three of its features are what this block has to render and
    none of them survives a one-row fixture: a GROUPED row printed as "× 3", TWO
    allowances capped separately, and a floor the table NAMES without counting.

    So the fixture carries all three, with his figures. A test written against a
    single residential row would pass on a renderer that ignored the cap entirely.
  */
  const withStatement = (): RunReport => {
    const run = makeRun();
    const typical = wire('envelope.tower_plate_cap', '625.55', ProvenanceClass.DERIVED, 'm²');
    const count = wire('gfa_statement.typical_level_count', '3', ProvenanceClass.DERIVED, 'levels');
    return {
      ...run,
      capacity: {
        ...run.capacity,
        gfaStatement: {
          plotArea: { m2: d('1365.23'), ft2: d('14695.23') },
          allowed: wire('gfa_statement.allowed_gfa_m2', '4778.31', ProvenanceClass.DERIVED, 'm²'),
          allowedFt2: d('51433.24'),
          caps: [
            {
              kind: 'RESIDENTIAL',
              allowed: wire('gfa_statement.residential_allowed_m2', '4718.31', ProvenanceClass.DERIVED, 'm²'),
              allowedFt2: d('50787.42'),
              proposed: wire('gfa_statement.residential_proposed_m2', '4717.53', ProvenanceClass.DERIVED, 'm²'),
              proposedFt2: d('50779.03'),
              remaining: wire('gfa_statement.residential_remaining_m2', '0.78', ProvenanceClass.DERIVED, 'm²'),
              remainingFt2: d('8.40'),
              notes: [],
            },
            {
              /* NO ALLOWANCE AND NOTHING PROPOSED, which is three nulls and a
                 sentence rather than three zeros. A zero here would report a
                 commercial ceiling of nothing, which is a limit nobody stated. */
              kind: 'COMMERCIAL',
              allowed: null,
              allowedFt2: null,
              proposed: null,
              proposedFt2: null,
              remaining: null,
              remainingFt2: null,
              notes: ['No affection plan on file states a commercial allowance for this plot.'],
            },
          ],
          rows: [
            {
              kind: 'GROUND',
              cap: 'RESIDENTIAL',
              levelIds: ['G'],
              count: 1,
              perLevel: null,
              perLevelFt2: null,
              levelCount: null,
              area: wire('gfa_statement.ground_gfa_m2', '118.00', ProvenanceClass.DERIVED, 'm²'),
              areaFt2: d('1270.14'),
            },
            {
              kind: 'TYPICAL',
              cap: 'RESIDENTIAL',
              levelIds: ['L02', 'L04', 'L06'],
              count: 3,
              perLevel: typical,
              perLevelFt2: d('6733.40'),
              levelCount: count,
              area: wire('gfa_statement.typical_gfa_m2', '1876.65', ProvenanceClass.DERIVED, 'm²'),
              areaFt2: d('20200.19'),
            },
          ],
          omissions: [
            {
              kind: 'ROOF',
              cap: 'RESIDENTIAL',
              reason:
                'A stair head, lift motor room and tank room stand on the roof. The engine ' +
                'models no roof level, so no area is stated — not zero, which would say the ' +
                'roof is clear.',
            },
          ],
          reconciliation: [
            'Every level is stated at the tower plate. A real scheme steps, so a drawing of ' +
              'this envelope will not match it floor for floor.',
          ],
          proposed: wire('gfa_statement.proposed_gfa_m2', '4777.53', ProvenanceClass.DERIVED, 'm²'),
          proposedFt2: d('51424.84'),
          remaining: wire('gfa_statement.remaining_gfa_m2', '0.78', ProvenanceClass.DERIVED, 'm²'),
          remainingFt2: d('8.40'),
          partFloorNotPlaced: { m2: d('0.00'), ft2: d('0.00') },
        },
      },
    };
  };

  it('is absent from a run stored before the statement existed', () => {
    expect(toHtml(makeRun())).not.toContain('<h3>GFA calculation</h3>');
  });

  it('survives the JSON export: a statement the import dropped was a report missing its area table', () => {
    const run = withStatement();
    expect(roundTrip(run).capacity.gfaStatement).toEqual(run.capacity.gfaStatement);
  });

  it('is in the study report, in both languages', () => {
    for (const locale of ['en', 'ar'] as const) {
      const html = studyReportHtml(withStatement(), { locale, sheets: [], building: null });
      expect(html).toContain('4,778.31');
      expect(html).toContain('51,433.24');
    }
  });

  it('states allowed, proposed and the floors, in square metres and square feet', () => {
    const html = toHtml(withStatement());
    expect(html).toContain('<h3>GFA calculation</h3>');
    expect(html).toContain('Gross floor area allowed');
    expect(html).toContain('Total gross floor area proposed');
    expect(html).toContain('Ground floor');
    expect(html).toContain('L02 to L06');
    expect(html).toContain('20,200.19');
  });

  it('prints a grouped row as the multiplication a reader checks, not a product', () => {
    /*
      "625.55 × 3", which is how his own table prints it. A renderer that
      pre-multiplied would show 1,876.65 alone and the reader would have to take
      it — and the two figures either side of that × are the two the engine traced.
    */
    const html = toHtml(withStatement());
    expect(html).toContain('× 3');
    expect(html).toContain('625.55');
  });

  it('keeps the two allowances apart, and states the one nobody set', () => {
    const html = toHtml(withStatement());
    expect(html).toContain('Residential G.F.A.');
    expect(html).toContain('Commercial G.F.A.');
    // The commercial cap has no allowance. It must say so rather than print 0.00.
    expect(html).toContain('states a commercial allowance');
    const commercial = html.slice(html.indexOf('Commercial G.F.A.'));
    expect(commercial).not.toMatch(/>0\.00</);
  });

  it('names the roof floor it does not count, rather than omitting it', () => {
    /*
      §20.3 — "an invariant silently absent from the table reads as an invariant
      that passed" — and a floor is no different. The row is present, the area is
      NOT ASSESSED, and the reason says what stands there.
    */
    const html = toHtml(withStatement());
    expect(html).toContain('Roof floor');
    expect(html).toContain('floors named and not counted');
    expect(html).toContain('which would say the roof is clear');
  });

  it('says what the uniform-plate model does not model', () => {
    expect(toHtml(withStatement())).toContain('A real scheme steps');
  });
});

describe('the drawing set', () => {
  beforeAll(async () => {
    await initGeometry();
  });
  const sheets = (): readonly Sheet[] => composeSheets(runPipeline(runInput(RECT_80x40)).building, META);

  it('is listed in the report, sheet by sheet, and not drawn inside it', () => {
    // Drawn inside the A4 report, Chromium printed each A3 sheet at 0.91 of true
    // size — a scale bar that lies. So the report names the set and the set is
    // its own document.
    const set = sheets();
    const out = toHtml(makeRun(), { sheets: set });
    for (const s of set) expect(out).toContain(`<span class="mono">${s.number}</span> ${s.title}`);
    expect(out).not.toContain('<svg');
  });

  it('says why there is none, rather than drawing one, for a run without a model', () => {
    expect(toHtml(makeRun())).toContain('computed before drawings were made from the building model');
  });

  it('prints every sheet on its own A3 landscape page, each carrying both sentences', () => {
    const set = sheets();
    const out = drawingSetHtml(set, META);
    expect(out).toContain('@page { size: 420mm 297mm; margin: 0; }');
    expect(out.split('<svg').length - 1).toBe(set.length);
    expect(out.split('NOT FOR CONSTRUCTION').length - 1).toBeGreaterThan(set.length);
    expect(out.split('REGULATORY VALIDITY: NOT ASSESSED').length - 1).toBeGreaterThan(set.length);
    // Every hatch and clip id is unique, or one sheet's ramp hatch paints another's.
    const ids = [...out.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('refuses to be an empty set', () => {
    expect(() => drawingSetHtml([], META)).toThrow(/no sheets/);
  });
});

describe('the study report', () => {
  /*
    The report a reader downloads from the studio, in the studio's language. It
    renders the same run as `toHtml` and is held to the same refusals; what is
    checked here is what a translation or a "cleaner" layout would be tempted
    to drop.
  */
  beforeAll(async () => {
    await initGeometry();
  });
  const built = (): ReturnType<typeof runPipeline> => runPipeline(runInput(RECT_80x40));

  it('carries the stamp on the cover, in every page footer and in the claim statement — in Arabic too', () => {
    for (const locale of ['en', 'ar'] as const) {
      const html = studyReportHtml(makeRun(), { locale, sheets: [], building: null });
      expect(html.split('REGULATORY VALIDITY: NOT ASSESSED').length - 1).toBeGreaterThanOrEqual(3);
      expect(html).toMatch(/@bottom-right \{ content: "REGULATORY VALIDITY: NOT ASSESSED/);
    }
  });

  it('is written in the reader’s language, right to left in Arabic', () => {
    const ar = studyReportHtml(makeRun(), { locale: 'ar', sheets: [], building: null });
    expect(ar).toMatch(/<html lang="ar" dir="rtl">/);
    expect(ar).toContain('لم يخضع للتقييم');
    const en = studyReportHtml(makeRun(), { locale: 'en', sheets: [], building: null });
    expect(en).toMatch(/<html lang="en" dir="ltr">/);
  });

  it('marks every assumption amber and lists each one', () => {
    const run = makeRun();
    expect(run.assumptions.length).toBeGreaterThan(0);
    const html = studyReportHtml(run, { locale: 'en', sheets: [], building: null });
    expect(html).toContain('v-assumed');
    // Each listed with the basis it was assumed on — an assumption without its reason is a hidden default.
    for (const a of run.assumptions) expect(html).toContain(a.basis.slice(0, 40).replace(/&/g, '&amp;').replace(/</g, '&lt;'));
    expect(html).toContain(`${run.assumptions.length} value`);
  });

  it('draws every sheet of the set, on its own page, from the building model', () => {
    const b = built();
    const set = composeSheets(b.building, META);
    const html = studyReportHtml(makeRun(), { locale: 'en', sheets: set, building: b.building });
    expect(html.split('<section class="sheet-page"').length - 1).toBe(set.length);
    expect(html.split('<svg').length - 1).toBeGreaterThanOrEqual(set.length);
  });

  it('prints each drawing on its own A3 page at full size, so no letter falls under 1.8 mm', () => {
    /*
      The sheets were reduced onto A4 landscape at 172 mm tall: 0.58 of the A3
      sheet, so 2.5 mm notes printed at 1.45 mm and 2 mm dimension figures at
      1.16 mm. `packages/sheets/test/lettering.test.ts` holds every letter of
      every sheet to 1.8 mm on A3; this holds the report to printing A3 at A3.
      Measured once in Chromium's PDF: the 80.00 M figure printed 2.00 mm tall
      on a 420.2 × 297.0 mm page.
    */
    const html = studyReportHtml(makeRun(), { locale: 'en', sheets: composeSheets(built().building, META), building: null });
    expect(html).toContain('@page sheet { size: 420mm 297mm; margin: 0; }');
    expect(html).toMatch(/\.sheet-frame svg \{ border: none; width: 420mm; height: 296\.8mm;/);
    expect(html).not.toMatch(/A4 landscape/);
    expect(html).not.toMatch(/Reduced from A3/);
  });

  it('ends with an annex holding the inputs, every rule considered and every area definition used', () => {
    const run = makeRun();
    for (const locale of ['en', 'ar'] as const) {
      const html = studyReportHtml(run, { locale, sheets: [], building: null });
      expect(html).toContain('id="s8"');
      for (const u of run.userInputs) expect(html).toContain(esc(u.enteredBy.name));
      for (const id of run.areaTermsUsed) {
        const name = locale === 'ar' ? METRIC_AR[id]!.name : metric(id).name;
        expect(html).toContain(esc(name));
      }
    }
    expect(studyReportHtml(run, { locale: 'en', sheets: [], building: null }).split('<tr>').length).toBeGreaterThan(
      run.rules.applied.length + run.rules.excluded.length,
    );
  });

  it('lists in the annex what the affection plan states and the run did not apply, in both languages', () => {
    /*
      `notBound` was returned by the API and shown nowhere a reader of the study
      looks, so a sheet stating six limits read as one stating four. The entries
      here are the binder's own, for Trakhees 6211383 on a corner plot.
    */
    const notBound = [
      {
        field: 'setbacks.tower.front',
        stated: 'Tower: Front = 0m, Sides & Rear = 3m',
        reason:
          'The sheet states the tower setback by face, and a plot with more than one road boundary ' +
          'does not say which road is the front. The run asks for the face of each road boundary ' +
          'rather than choosing one.',
      },
      {
        field: 'setbacks.front',
        stated: '0 m to solid wall; 4 m to window wall',
        reason:
          'The sheet makes this setback depend on the façade, which is a design decision and ' +
          'not a datum. Collapsing it to one distance would choose the applicant’s façade for ' +
          'them, so it stays a decision and binds nothing until it is made.',
      },
    ];
    const run = makeRun();
    const en = studyReportHtml(run, { locale: 'en', sheets: [], building: null, notBound });
    expect(en).toContain('Limits the affection plan states that this study does not apply');
    expect(en).toContain('Tower setback, front');
    expect(en).toContain(esc('Tower: Front = 0m, Sides & Rear = 3m'));
    expect(en).toContain('Ground floor and podium setback, front');
    const ar = studyReportHtml(run, { locale: 'ar', sheets: [], building: null, notBound });
    expect(ar).toContain('حدود يذكرها مخطط الأفكشن ولا تطبقها هذه الدراسة');
    expect(ar).toContain('ارتداد البرج، الحد الأمامي');
    // The sheet's words are quoted as printed; the reason is said in Arabic, not left in English.
    expect(ar).toContain(esc('Tower: Front = 0m, Sides & Rear = 3m'));
    expect(ar).not.toContain('does not say which road is the front');
    expect(ar).not.toContain('Collapsing it to one distance');
    // 17 Oct 2026: a printed FAR listed here is the GFA's cross-check, and the limit binds — "none cut the envelope" was false.
    expect(en).not.toContain('none of them cut the envelope');
    expect(en).toContain('none is applied as printed');
    expect(ar).not.toContain('ولم يقطع أي منها الغلاف');
    expect(ar).toContain('ولا يطبق أي منها كما طبع');
    // No sheet, or a run stored before the list was kept: no heading that would read as "nothing left out".
    for (const nb of [{ notBound: null }, {}, { notBound: [] }]) {
      expect(studyReportHtml(run, { locale: 'en', sheets: [], building: null, ...nb })).not.toContain(
        'Limits the affection plan states',
      );
    }
  });

  it('says every area definition in Arabic line for line, so no term loses an inclusion in translation', () => {
    for (const d of ALL_DEFINITIONS) {
      const ar = METRIC_AR[d.metricId];
      expect(ar, d.metricId).toBeDefined();
      expect(ar!.inclusions.length, `${d.metricId} inclusions`).toBe(d.inclusions.length);
      expect(ar!.exclusions.length, `${d.metricId} exclusions`).toBe(d.exclusions.length);
    }
  });

  it('prints nothing after its last page: the closing line is not left alone on a blank sheet', () => {
    expect(studyReportHtml(makeRun(), { locale: 'en', sheets: [], building: null })).toContain(
      'main > section:last-child { break-after: auto; }',
    );
  });

  it('says "required" of the building it reports, never of the probe', () => {
    /*
      `parking.total_bays` is the demand of the largest scheme the envelope
      allows — the probe that finds Band C. It was printed as "Parking required"
      on the cover and as "Total required" in the parking section, so plot 196
      read 384 required against 297 provided for a scheme that needs 234.
    */
    const base = makeRun();
    // The run holds a copy of the graph, so the answer's demand is added to that copy.
    wire('parking.demand_at_governing_capacity', '138', ProvenanceClass.DERIVED, 'bays');
    const run: RunReport = { ...base, provenance: { ...base.provenance, nodes: [...base.provenance.nodes, ...nodes.slice(-2)] } };
    const html = studyReportHtml(run, { locale: 'en', sheets: [], building: null });
    const tileFor = (label: string): string | undefined =>
      new RegExp(`<div class="tile-label">${label}</div><div class="tile-value">(.*?)</div>`).exec(html)?.[1];
    expect(tileFor('Parking required')).toContain('138');
    expect(tileFor('Parking required')).not.toContain('412');
    expect(html).toContain('Bays the reported capacity needs');
    // The probe's figures stay, under their own name.
    expect(html).toContain('The largest scheme the envelope allows');
    expect(tileFor('Parking the largest scheme would need')).toBeUndefined();
  });

  it('names the probe as the probe on a run stored before the answer’s demand existed', () => {
    const html = studyReportHtml(makeRun(), { locale: 'en', sheets: [], building: null });
    expect(html).not.toMatch(/<div class="tile-label">Parking required<\/div>/);
    expect(html).toMatch(/<div class="tile-label">Parking the largest scheme would need<\/div><div class="tile-value"><span[^>]*><bdi class="num">412</);
  });

  it('refuses what the audit report refuses: a failed invariant is not emitted in any language', () => {
    const run = makeRun();
    const failing: RunReport = {
      ...run,
      invariants: run.invariants.map((i, k) => (k === 0 ? { ...i, status: InvariantStatus.FAIL } : i)),
    };
    expect(() => studyReportHtml(failing, { locale: 'ar', sheets: [], building: null })).toThrow(InvariantFailureError);
  });
});

describe('groupDigits', () => {
  it('groups by string surgery and never changes a digit', () => {
    expect(groupDigits('16000.05')).toBe('16,000.05');
    expect(groupDigits('-1234567')).toBe('-1,234,567');
    expect(groupDigits('999')).toBe('999');
    expect(groupDigits('0.1000000000000000000000001')).toBe('0.1000000000000000000000001');
  });

  it('returns anything it does not recognise untouched', () => {
    expect(groupDigits('1e5')).toBe('1e5');
    expect(groupDigits('EXCLUDED_FROM_FAR')).toBe('EXCLUDED_FROM_FAR');
    expect(groupDigits('28–35')).toBe('28–35');
  });
});

describe('the Dubai Building Code clause register in both reports', () => {
  /*
    Before 17 Oct 2026 a clause nobody encoded — bicycle parking, the loading
    area, clear heights — appeared in no output at all, and an absence reads as
    "fine". The register is the validator's, stated whole; these hold both
    reports to printing it, in both languages, and to saying so when a stored
    run predates it rather than printing an empty table.
  */
  const stated = clauseRegisterReport(DBC_REGISTER);
  const register: ClauseRegisterSection = {
    version: stated.version,
    scope: stated.scope,
    counts: stated.counts,
    entries: stated.entries.map((e) => ({ ...e, appliedBy: [...e.appliedBy] })),
    promises: {
      date: PROPOSAL_DATE,
      items: WRITTEN_PROMISES.map((p) => ({ id: p.id, promised: p.promised, status: p.status, exists: p.exists })),
    },
  };
  const withRegister = (): RunReport => ({ ...makeRun(), clauseRegister: register });

  it('lists the clauses a parking study is read for beside the deferred checks, bicycle parking and loading among them', () => {
    const html = studyReportHtml(withRegister(), { locale: 'en', sheets: [], building: null });
    const checks = html.slice(html.indexOf('id="s6"'), html.indexOf('id="s7"'));
    expect(checks).toContain('Code clauses not assessed');
    expect(checks).toContain(`${register.counts.notAssessedMandatory} mandatory clauses`);
    expect(checks).toContain('B.7.2.7 ¶4');
    expect(checks).toContain(esc(CLAUSE_DETAIL.BICYCLE));
    expect(checks).toContain('B.7.3.1.1 ¶2');
    expect(checks).toContain(esc(CLAUSE_DETAIL.LOADING));
  });

  it('prints every clause of the register in the annex, with its page and status', () => {
    const html = studyReportHtml(withRegister(), { locale: 'en', sheets: [], building: null });
    const annex = html.slice(html.indexOf('id="s8"'));
    for (const e of register.entries) expect(annex, e.clause).toContain(`<bdi>${esc(e.clause)}</bdi>`);
    expect(annex).toContain(register.version);
    expect(annex).toContain('No IFC file is written');
  });

  it('says every register sentence in Arabic, leaving only identifiers and the proposal’s own words in English', () => {
    const ar = studyReportHtml(withRegister(), { locale: 'ar', sheets: [], building: null });
    const sentences = new Set(
      register.entries.flatMap((e) => [e.reason, e.rest, e.detail]).filter((s): s is string => s !== null),
    );
    for (const s of [...sentences, register.scope, ...register.promises.items.map((p) => p.exists)]) {
      expect(ar, s).not.toContain(esc(s));
    }
    expect(ar).toContain('سجل بنود كود دبي للبناء');
    expect(ar).toContain('مواقف الدراجات لا تحسب');
  });

  it('says a stored run predates the register instead of printing an empty one', () => {
    for (const locale of ['en', 'ar'] as const) {
      const html = studyReportHtml(makeRun(), { locale, sheets: [], building: null });
      expect(html).toContain(locale === 'en' ? 'computed before the clause register existed' : 'قبل وجود سجل البنود');
    }
    expect(toHtml(makeRun())).toContain('computed before the clause register existed');
  });

  it('prints the register and the written promises in the audit report', () => {
    const html = toHtml(withRegister());
    expect(html).toContain('8a · Dubai Building Code clause register');
    expect(html).toContain('B.7.2.7 ¶4');
    expect(html).toContain('NOT BUILT');
    expect(html).toContain(esc(WRITTEN_PROMISES[0]!.promised));
  });

  it('survives the JSON export and its re-import, fingerprint unchanged', () => {
    const run = withRegister();
    const back = fromJson(JSON.parse(toJsonString(run)));
    expect(back.clauseRegister).toEqual(run.clauseRegister);
    expect(runFingerprint(back).digest).toBe(runFingerprint(makeRun()).digest);
  });
});
