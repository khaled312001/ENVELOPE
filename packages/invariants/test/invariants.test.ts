/**
 * The invariant layer — PRD §12.
 *
 * Three things are proved here, in order of how much they matter.
 *
 * 1. **The V1 failure is caught.** §12.1 is the whole justification for this
 *    package, so the last describe block reconstructs the withdrawn V1 worked
 *    example from the figures §12.1 prints and asserts the layer refuses it.
 * 2. **Nothing passes vacuously.** Every check is exercised against a subject
 *    that carries no data for it, and none of them returns `PASS`.
 * 3. **Each check is independently wrong-detecting.** For all eighteen there is
 *    a subject broken in exactly that one way, and the assertion is that
 *    exactly that one check fails — not "at least" that one. A check that also
 *    fires on someone else's breakage is a check that will one day fire on
 *    nothing at all.
 *
 * The coherent baseline is PRD Appendix A, entered as printed. That is not
 * decoration: §12.3 requires this layer to run "against every worked example in
 * every product document as a CI job", and Appendix A is the document's own
 * example. Where A.7's arithmetic and A.5's figures disagree — it evaluates
 * INV-12 with the *required* 158 bays while supplying 165 — the stronger
 * reading is used and the divergence is noted at the check.
 */

import { CapacityBand, ParkingInFar } from '@envelope/core';
import { describe, expect, it } from 'vitest';

import {
  assertInvariants,
  formatInvariantReport,
  InvariantViolationError,
  LevelKind,
  PHASE_0_DORMANT,
  runInvariants,
  type CapacityClaim,
  type CompositionClaim,
  type EnvelopeClaim,
  type FarClaim,
  type HeightClaim,
  type InvariantId,
  type InvariantReport,
  type InvariantStatus,
  type InvariantSubject,
  type LevelBudgetClaim,
  type LevelRecord,
  type ParkingClaim,
  type UnitSchedule,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusOf = (report: InvariantReport, id: InvariantId): InvariantStatus => {
  const hit = report.results.find((r) => r.id === id);
  if (!hit) throw new Error(`catalogue produced no result for ${id}`);
  return hit.status;
};

const detailOf = (report: InvariantReport, id: InvariantId): string => {
  const hit = report.results.find((r) => r.id === id);
  if (!hit) throw new Error(`catalogue produced no result for ${id}`);
  return hit.detail;
};

const failedIds = (report: InvariantReport): readonly InvariantId[] =>
  report.results.filter((r) => r.status === 'FAIL').map((r) => r.id);

const dormantIds = (report: InvariantReport): readonly InvariantId[] => report.dormant;

// ---------------------------------------------------------------------------
// PRD Appendix A, entered as printed.
//
// Values are given as strings where the PRD prints a decimal and as numbers
// where it prints a count — exercising both arms of `Numeric` on purpose, since
// a subject transcribed out of a JSON export arrives as numbers and one typed
// from a PDF arrives as strings.
// ---------------------------------------------------------------------------

const FAR: FarClaim = {
  plotAreaM2: 3200, // 80.0 × 40.0 m (A.1)
  reportedFar: '4.906', // A.4 — 15,700 / 3,200, printed to three places
  permittedFar: '5.0',
};

const ENVELOPE: EnvelopeClaim = {
  setbackPermittedFootprintM2: '2094.5', // (80 − 4.5 − 4.5) × (40 − 6.0 − 4.5)
  coverageCapM2: '1920.0', // 3,200 × 0.60
  podiumFootprintM2: '1920.0', // min(2,094.5, 1,920.0) — coverage binds
  towerPlateM2: '1060.0', // A.2 "selected", derivation unstated — see annex note
  towerPlateCapM2: '1280.0', // 40% of plot
};

const HEIGHT: HeightClaim = {
  reportedTotalHeightM: '53.1', // 11.5 + 13 × 3.2
  heightCeilingM: '100.0',
};

const LEVEL_BUDGET: LevelBudgetClaim = {
  reportedLevelCount: 13, // tower floors; FAR-limited, not height-limited
  levelHeightBudgetM: '3.2',
  heightAvailableM: '88.5', // 100.0 − 11.5 base height
};

const PARKING: ParkingClaim = {
  providedBays: 165, // A.5 supply
  requiredBays: 158, // A.5 required (136.5 → 137 resident + 21 visitor)
  bayAreaFactorM2: '32.0',
  availableParkingAreaM2: '5299.2', // (1 basement + 2 podium) × 1,920 × 0.92
};

const CAPACITY: CapacityClaim = {
  regulationLimitedGfaM2: 15700,
  geometryLimitedGfaM2: 30540,
  parkingLimitedGfaM2: 15700,
  governingGfaM2: 15700,
  governingBand: CapacityBand.REGULATORY,
};

const COMPOSITION: CompositionClaim = {
  parkingInFar: ParkingInFar.EXCLUDED_FROM_FAR, // A.1 "Parking counts toward FAR: No"
  parkingAreaM2: '5299.2',
};

const AREA_TERMS = [
  'GFA',
  'NSA',
  'FAR',
  'PLOT_COVERAGE',
  'SETBACK_PERMITTED_FOOTPRINT',
  'PODIUM_FOOTPRINT',
  'TOWER_PLATE',
  'PARKING_AREA',
  'BAY_AREA_FACTOR',
  'PARKING_IN_FAR',
  'GROSS_EFFICIENCY',
  'TOWER_EFFICIENCY',
] as const;

/** The Phase 0 level schedule: no floor plan, so no `composition` anywhere. */
function levels(opts: { readonly composed: boolean }): readonly LevelRecord[] {
  const towerComposition = {
    unitNsaM2: 770, // 4×70 + 3×110 + 1×160
    coreM2: 180,
    circulationM2: 80,
    servicesM2: 30, // core + circulation + services = 290 (A.4)
  } as const;

  const tower: LevelRecord[] = [];
  for (let i = 1; i <= 13; i++) {
    tower.push({
      label: `Tower L${String(i).padStart(2, '0')}`,
      kind: LevelKind.TYPICAL,
      grossAreaM2: '1060.0',
      countedInGfa: true,
      aboveGround: true,
      heightM: '3.2',
      ...(opts.composed ? { composition: towerComposition } : {}),
    });
  }

  return [
    // Below ground, outside GFA under the declared treatment, and outside the
    // height sum. Three independent facts, all stated rather than inferred.
    {
      label: 'B1 basement parking',
      kind: LevelKind.PARKING,
      grossAreaM2: '1920.0',
      countedInGfa: false,
      aboveGround: false,
    },
    {
      label: 'Ground',
      kind: LevelKind.GROUND,
      grossAreaM2: '1920.0',
      countedInGfa: true,
      aboveGround: true,
      heightM: '4.5',
    },
    {
      label: 'Podium P1 parking',
      kind: LevelKind.PARKING,
      grossAreaM2: '1920.0',
      countedInGfa: false,
      aboveGround: true,
      heightM: '3.5',
    },
    {
      label: 'Podium P2 parking',
      kind: LevelKind.PARKING,
      grossAreaM2: '1920.0',
      countedInGfa: false,
      aboveGround: true,
      heightM: '3.5',
    },
    ...tower,
  ];
}

/** A.4's configuration. Phase 0 does not generate it; Phase 1 will. */
const UNITS: UnitSchedule = {
  types: [
    { typeId: '1-bed', count: 52, nsaPerUnitM2: 70, mixShare: '0.500' },
    { typeId: '2-bed', count: 39, nsaPerUnitM2: 110, mixShare: '0.375' },
    { typeId: '3-bed', count: 13, nsaPerUnitM2: 160, mixShare: '0.125' },
  ],
  reportedUnitCount: 104,
  totalNsaM2: 10010, // 13 × 770
  efficiencies: [
    { scope: 'TOWER_EFFICIENCY', reported: '0.7264', nsaM2: 770, gfaM2: 1060 },
    { scope: 'GROSS_EFFICIENCY', reported: '0.6376', nsaM2: 10010, gfaM2: 15700 },
  ],
};

/** Appendix A as Phase 0 can actually produce it — no unit schedule. */
function appendixAPhase0(over: InvariantSubject = {}): InvariantSubject {
  return {
    label: 'PRD Appendix A (Phase 0)',
    levels: levels({ composed: false }),
    totalGfaM2: 15700,
    far: FAR,
    envelope: ENVELOPE,
    height: HEIGHT,
    levelBudget: LEVEL_BUDGET,
    parking: PARKING,
    capacity: CAPACITY,
    composition: COMPOSITION,
    areaTermsUsed: [...AREA_TERMS],
    ...over,
  };
}

/** Appendix A in full, including the A.4 configuration. Wakes the five. */
function appendixAFull(over: InvariantSubject = {}): InvariantSubject {
  return appendixAPhase0({
    label: 'PRD Appendix A (with A.4 configuration)',
    levels: levels({ composed: true }),
    units: UNITS,
    ...over,
  });
}

// ---------------------------------------------------------------------------

describe('the catalogue', () => {
  it('is the eighteen checks of §12.2, in order, each with its printed tolerance', () => {
    const report = runInvariants({});
    expect(report.results.map((r) => r.id)).toEqual([
      'INV-01', 'INV-02', 'INV-03', 'INV-04', 'INV-05', 'INV-06',
      'INV-07', 'INV-08', 'INV-09', 'INV-10', 'INV-11', 'INV-12',
      'INV-13', 'INV-14', 'INV-15', 'INV-16', 'INV-17', 'INV-18',
    ]);
    // Verbatim from the §12.2 tolerance column — these are quoted in reports
    // and to a reader they are the promise the number was checked against.
    expect(report.results.map((r) => r.tolerance)).toEqual([
      '0.1%', '0.5%', '0.1%', 'exact', '0.001', '1%',
      '0.1%', 'exact', 'exact', 'exact', '0.01 m', 'exact',
      'exact', 'exact', 'exact', 'exact', 'exact', 'exact',
    ]);
  });

  it('names the five Phase 0 dormant checks and no others', () => {
    expect([...PHASE_0_DORMANT].sort()).toEqual(['INV-02', 'INV-04', 'INV-05', 'INV-06', 'INV-07']);
  });
});

// ---------------------------------------------------------------------------

describe('a coherent subject', () => {
  it('passes every check that has data, on the PRD Appendix A configuration', () => {
    const report = runInvariants(appendixAFull());
    expect(failedIds(report)).toEqual([]);
    expect(dormantIds(report)).toEqual([]);
    expect(report.passed).toBe(true);
    expect(report.results.every((r) => r.status === 'PASS')).toBe(true);
  });

  it('accepts the same artifact whether it arrives as strings or as numbers', () => {
    // §12.3 requires this layer to run against worked examples pasted out of
    // documents. A transcription that types "1920.0" must be the same subject
    // as an export that emits 1920.
    const asNumbers = appendixAFull({
      far: { plotAreaM2: 3200, reportedFar: 4.906, permittedFar: 5 },
      envelope: {
        setbackPermittedFootprintM2: 2094.5,
        coverageCapM2: 1920,
        podiumFootprintM2: 1920,
        towerPlateM2: 1060,
        towerPlateCapM2: 1280,
      },
      height: { reportedTotalHeightM: 53.1, heightCeilingM: 100 },
    });
    expect(failedIds(runInvariants(asNumbers))).toEqual([]);
  });

  it('reports the A/C tie at the governing band rather than hiding it', () => {
    // Appendix A.3 has band A and band C both at 15,700 m². Either label is
    // defensible; a band binding with zero headroom is something the user must
    // be told about (§15.2).
    const report = runInvariants(appendixAFull());
    expect(statusOf(report, 'INV-16')).toBe('PASS');
    expect(detailOf(report, 'INV-16')).toContain('tie');
  });

  it('passes INV-09 when the podium sits exactly on the coverage cap', () => {
    // A.2: podium 1,920.0 = coverage cap 1,920.0. "exact" means ≤, not <.
    expect(statusOf(runInvariants(appendixAPhase0()), 'INV-09')).toBe('PASS');
  });
});

// ---------------------------------------------------------------------------

describe('dormancy — a check with nothing to check is never a pass', () => {
  it('returns DORMANT for all eighteen on an empty subject, and PASS for none', () => {
    const report = runInvariants({});
    expect(report.results.every((r) => r.status === 'DORMANT')).toBe(true);
    expect(report.dormant).toHaveLength(18);
    // Uncomfortable but correct: nothing failed, so nothing blocks emission.
    // The honesty lives in `dormant`, which the report is required to print.
    expect(report.passed).toBe(true);
    expect(formatInvariantReport(report)).toContain('0 passed, 0 failed, 18 dormant');
  });

  it('leaves exactly the five unit-schedule checks dormant on a Phase 0 artifact', () => {
    const report = runInvariants(appendixAPhase0());
    expect([...report.dormant]).toEqual(['INV-02', 'INV-04', 'INV-05', 'INV-06', 'INV-07']);
    expect(failedIds(report)).toEqual([]);
    expect(report.passed).toBe(true);
  });

  it('marks the five DORMANT rather than PASS, and says they are dormant by phase', () => {
    const report = runInvariants(appendixAPhase0());
    for (const id of ['INV-02', 'INV-04', 'INV-05', 'INV-06', 'INV-07'] as const) {
      expect(statusOf(report, id)).toBe('DORMANT');
      expect(detailOf(report, id)).toContain('dormant by phase, not by omission');
      expect(detailOf(report, id)).toContain('Q19');
    }
  });

  it('never reports "13 of 18 passed" — the denominator is how many ran', () => {
    const text = formatInvariantReport(runInvariants(appendixAPhase0()));
    expect(text).toContain('13 passed, 0 failed, 5 dormant');
    expect(text).toContain('NOT counted as passes');
    // The §24.1 checkbox problem, in the report, in the client's own terms.
    expect(text).toContain('cannot honestly be ticked in Phase 0');
    expect(text).toContain('Appendix A.7 tabulates sixteen results');
  });

  it('the five wake up as soon as a unit schedule exists', () => {
    const report = runInvariants(appendixAFull());
    for (const id of ['INV-02', 'INV-04', 'INV-05', 'INV-06', 'INV-07'] as const) {
      expect(statusOf(report, id)).toBe('PASS');
    }
  });

  it('distinguishes dormant-by-phase from dormant-by-omission', () => {
    // A unit schedule that declares no types is a defect in one artifact, not a
    // Phase 0 scope limitation. Labelling it as the latter would turn a fixable
    // omission into a conversation with the client about deliverables.
    const emptyTypes = appendixAPhase0({
      units: { types: [], reportedUnitCount: 0, totalNsaM2: 0, efficiencies: [] },
    });
    const report = runInvariants(emptyTypes);
    expect(statusOf(report, 'INV-05')).toBe('DORMANT');
    expect(detailOf(report, 'INV-05')).toContain('declares no types');
    expect(detailOf(report, 'INV-05')).not.toContain('dormant by phase');
    // INV-02 still is by phase here: no level carries a composition.
    expect(detailOf(report, 'INV-02')).toContain('dormant by phase');
  });

  it('reports DORMANT, not PASS, when a cap that would bound a value is absent', () => {
    // No coverage rule → INV-09 has no cap to check. An absent cap is an
    // unchecked cap, not a satisfied one.
    const noCoverage = appendixAPhase0({
      envelope: {
        setbackPermittedFootprintM2: '2094.5',
        podiumFootprintM2: '1920.0',
        towerPlateM2: '1060.0',
        towerPlateCapM2: '1280.0',
      },
    });
    expect(statusOf(runInvariants(noCoverage), 'INV-09')).toBe('DORMANT');
  });

  it('treats a half-evaluated conjunction as DORMANT when the evaluable arm holds', () => {
    const noPlateCap = appendixAPhase0({
      envelope: {
        setbackPermittedFootprintM2: '2094.5',
        coverageCapM2: '1920.0',
        podiumFootprintM2: '1920.0',
        towerPlateM2: '1060.0',
      },
    });
    const report = runInvariants(noPlateCap);
    expect(statusOf(report, 'INV-10')).toBe('DORMANT');
    expect(detailOf(report, 'INV-10')).toContain('half-evaluated conjunction is not a pass');
  });

  it('still FAILs the half-evaluated conjunction when the evaluable arm fails', () => {
    const overPodium = appendixAPhase0({
      envelope: {
        setbackPermittedFootprintM2: '2094.5',
        coverageCapM2: '1920.0',
        podiumFootprintM2: '1920.0',
        towerPlateM2: '2000.0',
      },
    });
    expect(statusOf(runInvariants(overPodium), 'INV-10')).toBe('FAIL');
  });

  it('refuses to sum a partial height schedule', () => {
    const [first, ...rest] = levels({ composed: false });
    if (!first) throw new Error('fixture is empty');
    const partial = appendixAPhase0({
      levels: [
        first,
        { label: 'Ground', kind: LevelKind.GROUND, grossAreaM2: 1920, countedInGfa: true, aboveGround: true },
        ...rest.slice(1),
      ],
    });
    const report = runInvariants(partial);
    expect(statusOf(report, 'INV-11')).toBe('DORMANT');
    expect(detailOf(report, 'INV-11')).toContain('partial sum would under-report');
  });
});

// ---------------------------------------------------------------------------

describe('each check fires on its own breakage, and only its own', () => {
  const only = (id: InvariantId, subject: InvariantSubject): void => {
    const report = runInvariants(subject);
    expect(failedIds(report)).toEqual([id]);
    expect(report.passed).toBe(false);
  };

  it('INV-01 — a level dropped from the GFA sum', () => {
    // Ground floor understated by 20 m²: 15,680 vs 15,700 is 0.127%, outside 0.1%.
    const broken = levels({ composed: true }).map((l) =>
      l.label === 'Ground' ? { ...l, grossAreaM2: 1900 } : l,
    );
    only('INV-01', appendixAFull({ levels: broken }));
  });

  it('INV-02 — a level whose parts do not sum to its gross area', () => {
    const broken = levels({ composed: true }).map((l) =>
      l.kind === LevelKind.TYPICAL && l.composition
        ? { ...l, composition: { ...l.composition, coreM2: 170 } }
        : l,
    );
    only('INV-02', appendixAFull({ levels: broken }));
  });

  it('INV-03 — a printed FAR that does not recompute from GFA and plot area', () => {
    only('INV-03', appendixAFull({ far: { ...FAR, reportedFar: '4.8' } }));
  });

  it('INV-04 — unit counts by type that do not sum to the reported count', () => {
    only('INV-04', appendixAFull({ units: { ...UNITS, reportedUnitCount: 105 } }));
  });

  it('INV-05 — mix shares that do not sum to 1.000', () => {
    const types = UNITS.types.map((t) => (t.typeId === '3-bed' ? { ...t, mixShare: '0.130' } : t));
    only('INV-05', appendixAFull({ units: { ...UNITS, types } }));
  });

  it('INV-06 — a total NSA the unit count and mean cannot produce', () => {
    only('INV-06', appendixAFull({ units: { ...UNITS, totalNsaM2: 9000 } }));
  });

  it('INV-07 — an efficiency that does not equal NSA / GFA at its stated scope', () => {
    const efficiencies = UNITS.efficiencies.map((e) =>
      e.scope === 'TOWER_EFFICIENCY' ? { ...e, reported: '0.80' } : e,
    );
    only('INV-07', appendixAFull({ units: { ...UNITS, efficiencies } }));
  });

  it('INV-07 — an efficiency reported without a scope', () => {
    // FR-DEF-001's reason for existing: "a report quoting efficiency without a
    // scope is meaningless" (Appendix A.4 note).
    const efficiencies = [{ scope: '  ', reported: '0.7264', nsaM2: 770, gfaM2: 1060 }];
    const report = runInvariants(appendixAFull({ units: { ...UNITS, efficiencies } }));
    expect(statusOf(report, 'INV-07')).toBe('FAIL');
    expect(detailOf(report, 'INV-07')).toContain('carries no scope');
  });

  it('INV-08 — a podium outside the setback line', () => {
    only('INV-08', appendixAFull({ envelope: { ...ENVELOPE, setbackPermittedFootprintM2: '1900' } }));
  });

  it('INV-09 — a podium over the coverage cap', () => {
    only('INV-09', appendixAFull({ envelope: { ...ENVELOPE, coverageCapM2: '1900' } }));
  });

  it('INV-10 — a tower plate over its cap', () => {
    only('INV-10', appendixAFull({ envelope: { ...ENVELOPE, towerPlateM2: '1300' } }));
  });

  it('INV-11 — a reported height the level schedule does not add up to', () => {
    only('INV-11', appendixAFull({ height: { ...HEIGHT, reportedTotalHeightM: '53.5' } }));
  });

  it('INV-11 — a building over the height ceiling', () => {
    only('INV-11', appendixAFull({ height: { ...HEIGHT, heightCeilingM: '50.0' } }));
  });

  it('INV-12 — more bays than the parking area physically holds', () => {
    only('INV-12', appendixAFull({ parking: { ...PARKING, bayAreaFactorM2: '34.0' } }));
  });

  it('INV-13 — fewer bays supplied than the demand computation requires', () => {
    only('INV-13', appendixAFull({ parking: { ...PARKING, requiredBays: 200 } }));
  });

  it('INV-14 — a fractional level count', () => {
    // Appendix A.3 itself derives "13.5 floors" before reporting 13.
    const report = runInvariants(
      appendixAFull({ levelBudget: { ...LEVEL_BUDGET, reportedLevelCount: 13.5 } }),
    );
    expect(failedIds(report)).toEqual(['INV-14']);
    expect(detailOf(report, 'INV-14')).toContain('13.5 floors');
  });

  it('INV-14 — more levels than the height budget holds', () => {
    only('INV-14', appendixAFull({ levelBudget: { ...LEVEL_BUDGET, reportedLevelCount: 30 } }));
  });

  it('INV-14 — does NOT require the level count to be maximal', () => {
    // 13 of an available 27. FAR binds, not height, and §15.2 calls the
    // difference headroom. A maximality clause would fail the PRD's own example.
    const report = runInvariants(appendixAFull());
    expect(statusOf(report, 'INV-14')).toBe('PASS');
    expect(detailOf(report, 'INV-14')).toContain('27 level(s) would fit');
  });

  it('INV-15 — an area term absent from the definitions annex', () => {
    // The independent re-check of FR-DEF-001 AC5, using core's own annex.
    const report = runInvariants(appendixAFull({ areaTermsUsed: [...AREA_TERMS, 'NIA'] }));
    expect(failedIds(report)).toEqual(['INV-15']);
    expect(detailOf(report, 'INV-15')).toContain('NIA');
    expect(detailOf(report, 'INV-15')).toContain('FR-DEF-001 AC5');
  });

  it('INV-15 — an artifact that reports areas while naming no terms at all', () => {
    only('INV-15', appendixAFull({ areaTermsUsed: [] }));
  });

  it('INV-16 — the right minimum under the wrong band label', () => {
    const report = runInvariants(
      appendixAFull({ capacity: { ...CAPACITY, governingBand: CapacityBand.GEOMETRIC } }),
    );
    expect(failedIds(report)).toEqual(['INV-16']);
    expect(detailOf(report, 'INV-16')).toContain('label arm fails');
  });

  it('INV-16 — a governing figure that is not the minimum', () => {
    only('INV-16', appendixAFull({ capacity: { ...CAPACITY, governingGfaM2: 30540 } }));
  });

  it('INV-17 — an achieved FAR over the permitted cap', () => {
    only('INV-17', appendixAFull({ far: { ...FAR, permittedFar: '4.5' } }));
  });

  it('INV-18 — a GFA composition contradicting the declared parking treatment', () => {
    only(
      'INV-18',
      appendixAFull({
        composition: { ...COMPOSITION, parkingInFar: ParkingInFar.COUNTS_TOWARD_FAR },
      }),
    );
  });

  it('INV-18 — a GFA reported while the parking-in-FAR question is still open', () => {
    // FR-DEF-002 forbids a default and blocks computation. An artifact that got
    // this far has computed something it was not permitted to compute.
    const report = runInvariants(
      appendixAFull({
        composition: { parkingInFar: ParkingInFar.OPEN_REGULATORY_QUESTION },
      }),
    );
    expect(failedIds(report)).toEqual(['INV-18']);
    expect(detailOf(report, 'INV-18')).toContain('FR-DEF-002');
  });

  it('INV-03 — a FAR printed against a zero plot area', () => {
    const report = runInvariants(appendixAFull({ far: { ...FAR, plotAreaM2: 0 } }));
    expect(failedIds(report)).toEqual(['INV-03']);
    expect(detailOf(report, 'INV-03')).toContain('plot area is zero');
  });
});

// ---------------------------------------------------------------------------

describe('tolerance boundaries — just inside and just outside', () => {
  /** A minimal subject: everything not named goes DORMANT, which is the point. */
  const gfa = (levelArea: string, total: string): InvariantSubject => ({
    levels: [
      {
        label: 'L1',
        kind: LevelKind.TYPICAL,
        grossAreaM2: levelArea,
        countedInGfa: true,
        aboveGround: true,
      },
    ],
    totalGfaM2: total,
  });

  it('INV-01 at 0.1%: 999 against 1000 passes, 998.9 fails', () => {
    expect(statusOf(runInvariants(gfa('999', '1000')), 'INV-01')).toBe('PASS');
    expect(statusOf(runInvariants(gfa('998.9', '1000')), 'INV-01')).toBe('FAIL');
  });

  const composed = (parts: readonly [string, string, string, string], gross: string) =>
    runInvariants({
      levels: [
        {
          label: 'L1',
          kind: LevelKind.TYPICAL,
          grossAreaM2: gross,
          countedInGfa: true,
          aboveGround: true,
          composition: {
            unitNsaM2: parts[0],
            coreM2: parts[1],
            circulationM2: parts[2],
            servicesM2: parts[3],
          },
        },
      ],
    });

  it('INV-02 at 0.5%: parts summing to 995 of 1000 pass, 994.9 fails', () => {
    expect(statusOf(composed(['800', '100', '80', '15'], '1000'), 'INV-02')).toBe('PASS');
    expect(statusOf(composed(['800', '100', '80', '14.9'], '1000'), 'INV-02')).toBe('FAIL');
  });

  const far = (reported: string): InvariantSubject => ({
    totalGfaM2: '5000',
    far: { plotAreaM2: '1000', reportedFar: reported, permittedFar: '10' },
  });

  it('INV-03 at 0.1%: 4.995 against a computed 5 passes, 4.9949 fails', () => {
    expect(statusOf(runInvariants(far('4.995')), 'INV-03')).toBe('PASS');
    expect(statusOf(runInvariants(far('4.9949')), 'INV-03')).toBe('FAIL');
  });

  const shares = (third: string): InvariantSubject => ({
    units: {
      types: [
        { typeId: 'a', count: 1, nsaPerUnitM2: 100, mixShare: '0.5' },
        { typeId: 'b', count: 1, nsaPerUnitM2: 100, mixShare: '0.5' },
        { typeId: 'c', count: 1, nsaPerUnitM2: 100, mixShare: third },
      ],
      reportedUnitCount: 3,
      totalNsaM2: 300,
      efficiencies: [],
    },
  });

  it('INV-05 at 0.001 absolute: a sum of 1.001 passes, 1.0011 fails', () => {
    expect(statusOf(runInvariants(shares('0.001')), 'INV-05')).toBe('PASS');
    expect(statusOf(runInvariants(shares('0.0011')), 'INV-05')).toBe('FAIL');
  });

  const nsa = (total: string): InvariantSubject => ({
    units: {
      types: [{ typeId: 'a', count: 100, nsaPerUnitM2: '10', mixShare: '1' }],
      reportedUnitCount: 100,
      totalNsaM2: total,
      efficiencies: [],
    },
  });

  it('INV-06 at 1%: 990 against a computed 1000 passes, 989 fails', () => {
    expect(statusOf(runInvariants(nsa('990')), 'INV-06')).toBe('PASS');
    expect(statusOf(runInvariants(nsa('989')), 'INV-06')).toBe('FAIL');
  });

  const efficiency = (reported: string): InvariantSubject => ({
    units: {
      types: [],
      reportedUnitCount: 0,
      totalNsaM2: 0,
      efficiencies: [{ scope: 'GROSS_EFFICIENCY', reported, nsaM2: '500', gfaM2: '1000' }],
    },
  });

  it('INV-07 at 0.1%: 0.4995 against a computed 0.5 passes, 0.49949 fails', () => {
    expect(statusOf(runInvariants(efficiency('0.4995')), 'INV-07')).toBe('PASS');
    expect(statusOf(runInvariants(efficiency('0.49949')), 'INV-07')).toBe('FAIL');
  });

  const height = (reported: string): InvariantSubject => ({
    levels: [
      {
        label: 'L1',
        kind: LevelKind.TYPICAL,
        grossAreaM2: 100,
        countedInGfa: true,
        aboveGround: true,
        heightM: '50',
      },
    ],
    height: { reportedTotalHeightM: reported, heightCeilingM: '100' },
  });

  it('INV-11 at 0.01 m: 50.01 against a summed 50 passes, 50.02 fails', () => {
    expect(statusOf(runInvariants(height('50.01')), 'INV-11')).toBe('PASS');
    expect(statusOf(runInvariants(height('50.02')), 'INV-11')).toBe('FAIL');
  });

  it('the exact checks have no slack at all — a micrometre over is over', () => {
    const at = (podium: string): InvariantStatus =>
      statusOf(
        runInvariants({
          envelope: {
            setbackPermittedFootprintM2: '2094.5',
            podiumFootprintM2: podium,
            towerPlateM2: '1',
            towerPlateCapM2: '1',
          },
        }),
        'INV-08',
      );
    expect(at('2094.5')).toBe('PASS');
    expect(at('2094.500001')).toBe('FAIL');
  });
});

// ---------------------------------------------------------------------------

describe('assertInvariants blocks emission', () => {
  it('does not throw on a coherent artifact', () => {
    expect(() => assertInvariants(appendixAFull())).not.toThrow();
  });

  it('does not throw merely because checks are dormant', () => {
    // Five are dormant on every Phase 0 artifact. Throwing on dormancy would
    // mean Phase 0 could never emit anything at all; the honest handling is
    // that dormancy blocks the *claim*, not the emission.
    expect(() => assertInvariants(appendixAPhase0())).not.toThrow();
  });

  it('throws with the failing checks named, and carries the whole report', () => {
    const broken = appendixAFull({ far: { ...FAR, permittedFar: '4.5' } });
    try {
      assertInvariants(broken);
      throw new Error('assertInvariants did not throw');
    } catch (err) {
      expect(err).toBeInstanceOf(InvariantViolationError);
      const violation = err as InvariantViolationError;
      expect(violation.failures.map((f) => f.id)).toEqual(['INV-17']);
      expect(violation.message).toContain('blocks emission');
      expect(violation.message).toContain('never a configurable severity');
      expect(violation.message).toContain('PRD Appendix A');
      expect(violation.report.results).toHaveLength(18);
    }
  });
});

// ---------------------------------------------------------------------------

describe('regression — the V1 worked example that §12.1 withdraws', () => {
  /**
   * §12.1, verbatim: "The V1 worked example claimed a 21-storey tower with a
   * 792 m² plate and 6,700 m² GFA. 21 × 792 = 16,632. It claimed 172 units in
   * 5,268 m² of NSA against minimum unit areas of 65–155 m² — 30.6 m² per unit.
   * Its own contradiction checker, two pages later, computed a maximum near
   * 55–60 units on the same plot."
   *
   * The unit *mix* V1 used is unrecoverable — the examples are withdrawn. What
   * is reconstructed below is a mix at the band endpoints and midpoint the PRD
   * does state (65 / 110 / 155 m²), with counts summing to the claimed 172 so
   * that INV-04 and INV-05 pass and cannot be mistaken for the catch. The
   * reconstruction is deliberately not load-bearing: the final case in this
   * block shows that *every* mix inside the stated band fails INV-06, so the
   * layer catches V1 regardless of what mix V1 actually meant.
   */
  function v1(mix: readonly { typeId: string; count: number; nsa: number; share: string }[]) {
    const tower: LevelRecord[] = [];
    for (let i = 1; i <= 21; i++) {
      tower.push({
        label: `L${String(i).padStart(2, '0')}`,
        kind: LevelKind.TYPICAL,
        grossAreaM2: 792,
        countedInGfa: true,
        aboveGround: true,
      });
    }
    const subject: InvariantSubject = {
      label: 'V1 worked example (withdrawn, §12.1)',
      levels: tower,
      totalGfaM2: 6700,
      units: {
        types: mix.map((m) => ({
          typeId: m.typeId,
          count: m.count,
          nsaPerUnitM2: m.nsa,
          mixShare: m.share,
        })),
        reportedUnitCount: 172,
        totalNsaM2: 5268,
        efficiencies: [
          // 5,268 / 6,700 = 78.63%. Arithmetically consistent with the two
          // numbers V1 printed, and wildly implausible as a residential
          // efficiency — see the last assertion in this block.
          { scope: 'GROSS_EFFICIENCY', reported: '0.7863', nsaM2: 5268, gfaM2: 6700 },
        ],
      },
    };
    return runInvariants(subject);
  }

  const RECONSTRUCTED = [
    { typeId: '1-bed', count: 58, nsa: 65, share: '0.337209302325581395' },
    { typeId: '2-bed', count: 57, nsa: 110, share: '0.331395348837209302' },
    { typeId: '3-bed', count: 57, nsa: 155, share: '0.331395348837209302' },
  ] as const;

  it('catches the GFA claim: 21 × 792 = 16,632, not 6,700', () => {
    const report = v1([...RECONSTRUCTED]);
    expect(statusOf(report, 'INV-01')).toBe('FAIL');
    const result = report.results.find((r) => r.id === 'INV-01');
    expect(result?.observed).toBe('16632');
    expect(result?.expected).toBe('6700');
  });

  it('catches the unit claim: 172 units cannot live in 5,268 m² of NSA', () => {
    expect(statusOf(v1([...RECONSTRUCTED]), 'INV-06')).toBe('FAIL');
  });

  it('catches it whatever mix is assumed inside the 65–155 m² band', () => {
    // The lower bound is the friendliest possible reconstruction for V1: every
    // unit at the smallest type it declared. 172 × 65 = 11,180 m², still more
    // than twice the 5,268 m² claimed.
    const allSmallest = [{ typeId: '1-bed', count: 172, nsa: 65, share: '1.000' }];
    const allLargest = [{ typeId: '3-bed', count: 172, nsa: 155, share: '1.000' }];
    expect(statusOf(v1(allSmallest), 'INV-06')).toBe('FAIL');
    expect(statusOf(v1(allLargest), 'INV-06')).toBe('FAIL');
  });

  it('blocks emission, naming both failures', () => {
    const report = v1([...RECONSTRUCTED]);
    expect(report.passed).toBe(false);
    expect(failedIds(report)).toEqual(['INV-01', 'INV-06']);
    expect(() =>
      assertInvariants({
        label: 'V1 worked example (withdrawn, §12.1)',
        levels: Array.from({ length: 21 }, (_, i) => ({
          label: `L${i + 1}`,
          kind: LevelKind.TYPICAL,
          grossAreaM2: 792,
          countedInGfa: true,
          aboveGround: true,
        })),
        totalGfaM2: 6700,
      }),
    ).toThrow(InvariantViolationError);
  });

  it('does not pretend to catch what invariants cannot catch (§12.4)', () => {
    // V1's implied 78.63% gross efficiency is arithmetically consistent with
    // the two numbers it printed, so INV-07 passes it. §12.4: "a configuration
    // can pass every invariant and be entirely non-compliant — it is merely
    // arithmetically coherent." Recording that here so nobody later reads a
    // green INV-07 as an endorsement of the number.
    expect(statusOf(v1([...RECONSTRUCTED]), 'INV-07')).toBe('PASS');
  });
});
