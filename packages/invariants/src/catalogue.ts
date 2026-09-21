/**
 * The invariant catalogue — PRD §12.2, all eighteen checks.
 *
 * §12.1 states the reason this layer exists better than a restatement could:
 * V1 claimed "a 21-storey tower with a 792 m² plate and 6,700 m² GFA. 21 × 792
 * = 16,632. It claimed 172 units in 5,268 m² of NSA against minimum unit areas
 * of 65–155 m² — 30.6 m² per unit." Nothing caught it, "because constraint
 * checking asks 'is this permitted?' and invariant checking asks 'does this
 * arithmetic close?'".
 *
 * So every check below is a conservation law over a *plain* artifact. It takes
 * `Decimal | number | string`, never `Traced<T>`, because §12.3 requires the
 * layer to run "against every worked example in every product document as a CI
 * job" — and a worked example pasted out of a PDF has no provenance graph to
 * offer. A checker that could only read artifacts it watched being built would
 * be unable to audit the very documents that produced the V1 failure.
 *
 * ---
 *
 * **Five checks are dormant in Phase 0, and that is modelled, not hidden.**
 * INV-02, 04, 05, 06 and 07 all reference unit NSA, unit counts and mix shares.
 * §3.2 puts "configurations · floor plans" out of Phase 0 scope and there is no
 * functional requirement anywhere in 3,587 lines that supplies a unit mix (see
 * `docs/03-analysis/open-questions.md` Q19 and Q20). They are implemented in
 * full and return `DORMANT` when the subject carries no unit schedule. They
 * never return `PASS` on an empty subject: a check with nothing to check is how
 * a checkbox gets ticked without evidence, which is the failure mode this
 * entire layer exists to prevent.
 *
 * The consequence is contractual and must not be absorbed silently: §24.1's
 * checkbox "Invariant layer: 18 checks, independent module, blocks emission"
 * **cannot honestly be ticked in Phase 0** — thirteen run, five are dormant.
 * The PRD is already inconsistent with itself here: Appendix A.7 tabulates only
 * sixteen results (INV-14 and INV-15 are absent) while A.8 asserts "PASS — all
 * 18 invariants". See {@link PHASE_0_DORMANT_NOTE}.
 */

import {
  ANNEX_VERSION,
  CapacityBand,
  Decimal,
  DEFINED_METRIC_IDS,
  isDefined,
  ParkingInFar,
  relativeDifference,
  within,
  withinAbsolute,
} from '@envelope/core';

// ---------------------------------------------------------------------------
// Numeric intake
// ---------------------------------------------------------------------------

/**
 * What a subject field may hold.
 *
 * `number` is accepted here and nowhere else in the engine. The reason is
 * §12.3: a subject may be a JSON payload transcribed from a slide, and JSON has
 * no decimal type. Every value is widened to `Decimal` on the first line that
 * touches it and no float arithmetic is ever performed on it, so the numeric
 * policy in `core/numeric.ts` is preserved — the float only ever names a
 * quantity, it never participates in one.
 */
export type Numeric = Decimal | number | string;

/**
 * `Decimal` is imported from `@envelope/core`, not from `decimal.js`, because
 * core is where `Decimal.set({ precision: 28 })` runs. Importing the
 * constructor directly would silently get the library default of 20 significant
 * digits and put this layer on a different arithmetic from the engine it
 * audits — which would make a disagreement between them uninterpretable.
 */
const dec = (v: Numeric): Decimal => new Decimal(v);

const sum = (values: readonly Decimal[]): Decimal =>
  values.reduce((acc, v) => acc.plus(v), new Decimal(0));

/** Display form for `observed` / `expected`. Never used before a comparison. */
const show = (v: Decimal): string => v.toDecimalPlaces(6, Decimal.ROUND_HALF_EVEN).toString();

/**
 * The residual `FR-INV-001` requires the report to carry alongside "computed
 * vs. expected". Stated both absolutely and relatively because the §12.2
 * tolerance column mixes the two forms.
 */
const residual = (observed: Decimal, expected: Decimal): string =>
  `residual ${observed.minus(expected).toDecimalPlaces(6).toString()} ` +
  `(${relativeDifference(observed, expected).times(100).toDecimalPlaces(4).toString()}% relative)`;

// ---------------------------------------------------------------------------
// The subject — a plain artifact under check
// ---------------------------------------------------------------------------

/**
 * What a level is, for the checks that partition a schedule.
 *
 * `PARKING` is the only member that changes an outcome (INV-18). The rest exist
 * so that a level schedule transcribed from a document can be written down
 * without inventing a category — that is the state in which people quietly drop
 * a level from a sum.
 */
export const LevelKind = {
  BASEMENT: 'BASEMENT',
  PARKING: 'PARKING',
  PODIUM: 'PODIUM',
  GROUND: 'GROUND',
  TYPICAL: 'TYPICAL',
  AMENITY: 'AMENITY',
  PLANT: 'PLANT',
  ROOF: 'ROOF',
} as const;
export type LevelKind = (typeof LevelKind)[keyof typeof LevelKind];

/**
 * The internal balance of one level — INV-02's operands.
 *
 * Optional on every level because Phase 0 generates no floor plan. A level
 * without it makes INV-02 dormant rather than passing vacuously.
 */
export interface LevelComposition {
  readonly unitNsaM2: Numeric;
  readonly coreM2: Numeric;
  readonly circulationM2: Numeric;
  readonly servicesM2: Numeric;
}

export interface LevelRecord {
  readonly label: string;
  readonly kind: LevelKind;
  /** Gross area of this level, m², measured as the annex defines GFA. */
  readonly grossAreaM2: Numeric;
  /**
   * Whether this level's gross area is inside the reported total GFA.
   *
   * Explicit rather than inferred from {@link LevelKind}, because inferring it
   * would be a hidden default with a 15–35% swing attached — exactly what
   * `FR-DEF-002` forbids for the parking-in-FAR question this flag encodes.
   */
  readonly countedInGfa: boolean;
  /**
   * Whether the level contributes to building height. Explicit for the same
   * reason: a podium parking deck is above ground and outside GFA, and no rule
   * of thumb over {@link LevelKind} gets both of those right at once.
   */
  readonly aboveGround: boolean;
  /** Floor-to-floor height of this level, m. INV-11. */
  readonly heightM?: Numeric;
  readonly composition?: LevelComposition;
}

/** INV-03 and INV-17. */
export interface FarClaim {
  readonly plotAreaM2: Numeric;
  /** The FAR the artifact prints. INV-03 recomputes it; INV-17 bounds it. */
  readonly reportedFar: Numeric;
  readonly permittedFar: Numeric;
}

/** INV-08, INV-09, INV-10. */
export interface EnvelopeClaim {
  readonly setbackPermittedFootprintM2: Numeric;
  /** Absent when no approved coverage rule applies — see `capacity/envelope.ts`. */
  readonly coverageCapM2?: Numeric;
  readonly podiumFootprintM2: Numeric;
  readonly towerPlateM2: Numeric;
  /** Absent when no tower plate cap applies. Makes INV-10's conjunction partial. */
  readonly towerPlateCapM2?: Numeric;
}

/** INV-11. */
export interface HeightClaim {
  readonly reportedTotalHeightM: Numeric;
  readonly heightCeilingM: Numeric;
}

/** INV-14. */
export interface LevelBudgetClaim {
  readonly reportedLevelCount: number;
  /** Floor-to-floor allowance the reported levels are drawn at, m. */
  readonly levelHeightBudgetM: Numeric;
  /** Height those levels have to spend, m. */
  readonly heightAvailableM: Numeric;
}

/** INV-12 and INV-13. */
export interface ParkingClaim {
  /** Bays the scheme provides. */
  readonly providedBays: number;
  /** Bays the demand computation requires. */
  readonly requiredBays: Numeric;
  readonly bayAreaFactorM2: Numeric;
  readonly availableParkingAreaM2: Numeric;
}

/** INV-16. Bands A, B and C of §15.1. */
export interface CapacityClaim {
  /** Band A — what FAR and the area caps permit. */
  readonly regulationLimitedGfaM2: Numeric;
  /** Band B — what the envelope physically holds. */
  readonly geometryLimitedGfaM2: Numeric;
  /** Band C — what the achievable parking supply supports. */
  readonly parkingLimitedGfaM2: Numeric;
  readonly governingGfaM2: Numeric;
  readonly governingBand: CapacityBand;
}

/** INV-18. */
export interface CompositionClaim {
  readonly parkingInFar: ParkingInFar;
  /** Total parking floor area in the scheme, m². */
  readonly parkingAreaM2?: Numeric;
}

/** INV-04, INV-05, INV-06 — one row of the unit mix. */
export interface UnitTypeRecord {
  readonly typeId: string;
  readonly count: number;
  readonly nsaPerUnitM2: Numeric;
  readonly mixShare: Numeric;
}

/**
 * INV-07 — one scoped efficiency figure.
 *
 * `scope` is mandatory and is a metric id, because §12.2 says "at the
 * definition scope stated" and Appendix A.4 shows why: the same building
 * reports 72.64% tower efficiency and 63.76% whole-building efficiency, a gap
 * "larger than most of the differences developers argue about". An unscoped
 * efficiency is not a number with a missing label; it is two different numbers
 * wearing one.
 */
export interface EfficiencyClaim {
  /** A metric id from the annex: `TOWER_EFFICIENCY` or `GROSS_EFFICIENCY`. */
  readonly scope: string;
  readonly reported: Numeric;
  readonly nsaM2: Numeric;
  readonly gfaM2: Numeric;
}

/**
 * The unit schedule Phase 0 does not generate.
 *
 * Its absence is the whole of the dormancy story: five checks read only from
 * here. See `docs/03-analysis/open-questions.md` Q19 (18 invariants or 13?) and
 * Q20 (where does the unit mix come from?).
 */
export interface UnitSchedule {
  readonly types: readonly UnitTypeRecord[];
  readonly reportedUnitCount: number;
  readonly totalNsaM2: Numeric;
  readonly efficiencies: readonly EfficiencyClaim[];
}

/**
 * The plain-number artifact under check.
 *
 * Every group is optional and every group is self-contained. That shape is
 * deliberate: §12.3 requires this layer to run against documentation examples,
 * and a slide that states only "21 storeys × 792 m² = 6,700 m²" must be
 * expressible without inventing an envelope, a plot area or a parking supply it
 * never claimed. What is absent produces `DORMANT`, never `PASS`.
 */
export interface InvariantSubject {
  /** Names the artifact in failure messages — a run id, a slide number. */
  readonly label?: string;
  /** Every physical level. INV-01, INV-02, INV-11 and INV-18 partition this. */
  readonly levels?: readonly LevelRecord[];
  /** The GFA the artifact prints. INV-01 sums the schedule against it. */
  readonly totalGfaM2?: Numeric;
  readonly far?: FarClaim;
  readonly envelope?: EnvelopeClaim;
  readonly height?: HeightClaim;
  readonly levelBudget?: LevelBudgetClaim;
  readonly parking?: ParkingClaim;
  readonly capacity?: CapacityClaim;
  readonly composition?: CompositionClaim;
  /** Every metric term the artifact reports, by id. INV-15 checks each one. */
  readonly areaTermsUsed?: readonly string[];
  /** Absent throughout Phase 0. Its absence is what makes five checks dormant. */
  readonly units?: UnitSchedule;
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export const INVARIANT_IDS = [
  'INV-01',
  'INV-02',
  'INV-03',
  'INV-04',
  'INV-05',
  'INV-06',
  'INV-07',
  'INV-08',
  'INV-09',
  'INV-10',
  'INV-11',
  'INV-12',
  'INV-13',
  'INV-14',
  'INV-15',
  'INV-16',
  'INV-17',
  'INV-18',
] as const;
export type InvariantId = (typeof INVARIANT_IDS)[number];

export const InvariantStatus = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  /**
   * The check ran and had nothing to check. Distinct from `PASS` on purpose:
   * §24.1 asks for eighteen checks, and reporting a vacuous truth as a pass is
   * how eighteen becomes a number nobody verified.
   */
  DORMANT: 'DORMANT',
} as const;
export type InvariantStatus = (typeof InvariantStatus)[keyof typeof InvariantStatus];

/**
 * What one check returns.
 *
 * A discriminated union rather than a nullable pass flag, so that `DORMANT`
 * cannot be spelled as "passed with no observation" — the type makes the honest
 * answer the only expressible one, and forces every decided check to state what
 * it saw (`FR-INV-001`: "per-check pass/fail with computed vs. expected").
 */
export type CheckOutcome =
  | {
      readonly kind: typeof InvariantStatus.PASS;
      readonly observed: string;
      readonly expected: string;
      readonly detail: string;
    }
  | {
      readonly kind: typeof InvariantStatus.FAIL;
      readonly observed: string;
      readonly expected: string;
      readonly detail: string;
    }
  | {
      readonly kind: typeof InvariantStatus.DORMANT;
      readonly detail: string;
      /**
       * True when the check is dormant because Phase 0 has no data source for
       * it *at all*, false when this particular artifact merely omitted
       * something it could have supplied. The distinction is the difference
       * between a scope conversation with the client and a defect in one
       * subject, and collapsing the two loses the one that costs money.
       */
      readonly byPhase: boolean;
    };

const verdict = (
  held: boolean,
  o: { readonly observed: string; readonly expected: string; readonly detail: string },
): CheckOutcome => ({ kind: held ? InvariantStatus.PASS : InvariantStatus.FAIL, ...o });

/** This artifact did not carry what the check needed. */
const dormant = (detail: string): CheckOutcome => ({
  kind: InvariantStatus.DORMANT,
  detail,
  byPhase: false,
});

/** Nothing in Phase 0 could have carried what the check needed. */
const dormantByPhase = (detail: string): CheckOutcome => ({
  kind: InvariantStatus.DORMANT,
  detail,
  byPhase: true,
});

/** One entry of the §12.2 catalogue. */
export interface InvariantCheck {
  readonly id: InvariantId;
  /** Verbatim from the §12.2 table. Not paraphrased — it is quoted in reports. */
  readonly statement: string;
  /** Verbatim from the §12.2 tolerance column. */
  readonly tolerance: string;
  /**
   * True for the five that cannot run until a unit schedule exists.
   *
   * Static metadata about the catalogue, not about any one subject — it is what
   * {@link PHASE_0_DORMANT} is built from, so a report can name the five before
   * it has an artifact to check. The per-run answer is `CheckOutcome.byPhase`.
   */
  readonly phase0Dormant: boolean;
  readonly check: (subject: InvariantSubject) => CheckOutcome;
}

// ---------------------------------------------------------------------------
// Tolerances. The strings on each check are what a report prints; these are
// what the comparison uses. They are written twice on purpose — a typo in one
// is visible against the other, and a tolerance that drifts from its printed
// value is a defect nobody would otherwise see.
// ---------------------------------------------------------------------------

const TOL_0_1_PCT = new Decimal('0.001');
const TOL_0_5_PCT = new Decimal('0.005');
const TOL_1_PCT = new Decimal('0.01');
const TOL_MIX_SHARE = new Decimal('0.001');
const TOL_HEIGHT_M = new Decimal('0.01');

/**
 * "exact" in §12.2 means no slack at all, not "to machine precision". Every
 * exact check below is an integer comparison or a `Decimal` comparison with no
 * epsilon, which is available only because the arithmetic never touched a float.
 */
const EXACT = 'exact';

const NO_UNIT_SCHEDULE =
  'no unit schedule: Phase 0 generates no configuration (§3.2), so this check has ' +
  'nothing to check. DORMANT, not PASS — see open-questions.md Q19.';

// ---------------------------------------------------------------------------
// INV-01 — Σ(level GFA) = total GFA
// ---------------------------------------------------------------------------

const inv01: InvariantCheck = {
  id: 'INV-01',
  statement: 'Σ(level GFA) = total GFA',
  tolerance: '0.1%',
  phase0Dormant: false,
  check: (s) => {
    if (!s.levels || s.levels.length === 0 || s.totalGfaM2 === undefined) {
      return dormant('no level schedule or no reported total GFA was supplied.');
    }
    const counted = s.levels.filter((l) => l.countedInGfa);
    if (counted.length === 0) {
      return dormant(
        'the level schedule contains no level flagged as counting toward GFA, so ' +
          'there is no sum to compare against the reported total.',
      );
    }
    const observed = sum(counted.map((l) => dec(l.grossAreaM2)));
    const expected = dec(s.totalGfaM2);
    return verdict(within(observed, expected, TOL_0_1_PCT), {
      observed: show(observed),
      expected: show(expected),
      detail:
        `${counted.length} of ${s.levels.length} level(s) count toward GFA; ` +
        `${residual(observed, expected)}. ` +
        `This is the check that would have caught V1: 21 × 792 = 16,632, not 6,700 (§12.1).`,
    });
  },
};

// ---------------------------------------------------------------------------
// INV-02 — Σ(unit NSA) + core + circulation + services = level gross area
// ---------------------------------------------------------------------------

const inv02: InvariantCheck = {
  id: 'INV-02',
  statement: 'Σ(unit NSA) + core + circulation + services = level gross area',
  tolerance: '0.5%',
  phase0Dormant: true,
  check: (s) => {
    const composed = (s.levels ?? []).filter(
      (l): l is LevelRecord & { composition: LevelComposition } => l.composition !== undefined,
    );
    if (composed.length === 0) return dormantByPhase(NO_UNIT_SCHEDULE);

    // Every composed level must balance, and every failure is named. Reporting
    // only the worst would let a second, smaller error hide behind the first —
    // and the second error is usually the one nobody expected.
    const failures: string[] = [];
    let worstObserved = new Decimal(0);
    let worstExpected = new Decimal(0);
    let worstRel = new Decimal(-1);
    for (const level of composed) {
      const c = level.composition;
      const observed = sum([
        dec(c.unitNsaM2),
        dec(c.coreM2),
        dec(c.circulationM2),
        dec(c.servicesM2),
      ]);
      const expected = dec(level.grossAreaM2);
      const rel = relativeDifference(observed, expected);
      if (rel.gt(worstRel)) {
        worstRel = rel;
        worstObserved = observed;
        worstExpected = expected;
      }
      if (!within(observed, expected, TOL_0_5_PCT)) {
        failures.push(`${level.label}: ${show(observed)} vs ${show(expected)}`);
      }
    }
    return verdict(failures.length === 0, {
      observed: show(worstObserved),
      expected: show(worstExpected),
      detail:
        failures.length === 0
          ? `${composed.length} composed level(s) balance; worst ` +
            `${residual(worstObserved, worstExpected)}.`
          : `${failures.length} of ${composed.length} level(s) do not balance — ` +
            `${failures.join('; ')}.`,
    });
  },
};

// ---------------------------------------------------------------------------
// INV-03 — total GFA / plot area = reported FAR
// ---------------------------------------------------------------------------

const inv03: InvariantCheck = {
  id: 'INV-03',
  statement: 'total GFA / plot area = reported FAR',
  tolerance: '0.1%',
  phase0Dormant: false,
  check: (s) => {
    if (!s.far || s.totalGfaM2 === undefined) {
      return dormant('no plot area / reported FAR pair, or no reported total GFA, was supplied.');
    }
    const plotArea = dec(s.far.plotAreaM2);
    const gfa = dec(s.totalGfaM2);
    const reported = dec(s.far.reportedFar);
    if (plotArea.isZero()) {
      // Not guarded away as a division error: an artifact that prints a FAR
      // against a zero plot area is incoherent, and saying so is the job.
      return verdict(false, {
        observed: 'undefined',
        expected: show(reported),
        detail:
          'plot area is zero, so FAR is undefined. A reported FAR against a zero ' +
          'plot area is an artifact defect, not a division to be guarded away.',
      });
    }
    const observed = gfa.div(plotArea);
    return verdict(within(observed, reported, TOL_0_1_PCT), {
      observed: show(observed),
      expected: show(reported),
      detail:
        `${show(gfa)} m² ÷ ${show(plotArea)} m² = ${show(observed)}; ` +
        `${residual(observed, reported)}.`,
    });
  },
};

// ---------------------------------------------------------------------------
// INV-04 — Σ(unit counts by type) = reported unit count
// ---------------------------------------------------------------------------

const inv04: InvariantCheck = {
  id: 'INV-04',
  statement: 'Σ(unit counts by type) = reported unit count',
  tolerance: EXACT,
  phase0Dormant: true,
  check: (s) => {
    if (!s.units) return dormantByPhase(NO_UNIT_SCHEDULE);
    const observed = s.units.types.reduce((acc, t) => acc + t.count, 0);
    const expected = s.units.reportedUnitCount;
    const integral =
      Number.isInteger(expected) && s.units.types.every((t) => Number.isInteger(t.count));
    return verdict(integral && observed === expected, {
      observed: String(observed),
      expected: String(expected),
      detail: integral
        ? `${s.units.types.length} type(s) sum to ${observed} against a reported ${expected}.`
        : 'a unit count is not an integer. There is no such thing as a fractional ' +
          'apartment; a non-integer count here means a division was reported without ' +
          'being resolved.',
    });
  },
};

// ---------------------------------------------------------------------------
// INV-05 — Σ(mix shares) = 1.000
// ---------------------------------------------------------------------------

const inv05: InvariantCheck = {
  id: 'INV-05',
  statement: 'Σ(mix shares) = 1.000',
  tolerance: '0.001',
  phase0Dormant: true,
  check: (s) => {
    if (!s.units) return dormantByPhase(NO_UNIT_SCHEDULE);
    if (s.units.types.length === 0) {
      return dormant('the unit schedule declares no types, so there are no shares to sum.');
    }
    const observed = sum(s.units.types.map((t) => dec(t.mixShare)));
    const one = new Decimal(1);
    // The §12.2 tolerance "0.001" is bare — no percent sign, against a target of
    // exactly 1.000 — so it is read as absolute. At this one target the two
    // readings differ only in the seventh decimal place, but the absolute
    // reading is the one that stays meaningful if the target is ever restated.
    return verdict(withinAbsolute(observed, one, TOL_MIX_SHARE), {
      observed: show(observed),
      expected: '1',
      detail:
        `${s.units.types.length} share(s) sum to ${show(observed)}; ` +
        `absolute residual ${observed.minus(one).abs().toDecimalPlaces(9).toString()}.`,
    });
  },
};

// ---------------------------------------------------------------------------
// INV-06 — Reported unit count × weighted mean unit NSA = total NSA
// ---------------------------------------------------------------------------

const inv06: InvariantCheck = {
  id: 'INV-06',
  statement: 'Reported unit count × weighted mean unit NSA = total NSA',
  tolerance: '1%',
  phase0Dormant: true,
  check: (s) => {
    if (!s.units) return dormantByPhase(NO_UNIT_SCHEDULE);
    if (s.units.types.length === 0) {
      return dormant('the unit schedule declares no types, so there is no mean to weight.');
    }
    // Weighted by mix share, following §12.2's wording. Weighting by count
    // gives the identical mean whenever INV-04 and INV-05 hold, so the two
    // readings only diverge on an artifact that has already failed one of them.
    const mean = sum(s.units.types.map((t) => dec(t.mixShare).times(dec(t.nsaPerUnitM2))));
    const observed = mean.times(s.units.reportedUnitCount);
    const expected = dec(s.units.totalNsaM2);
    return verdict(within(observed, expected, TOL_1_PCT), {
      observed: show(observed),
      expected: show(expected),
      detail:
        `${s.units.reportedUnitCount} unit(s) × ${show(mean)} m² weighted mean = ` +
        `${show(observed)} m²; ${residual(observed, expected)}. ` +
        `V1 failed here by roughly 3×: 172 units in 5,268 m² of NSA is 30.6 m² per ` +
        `unit, below every unit type it declared (§12.1).`,
    });
  },
};

// ---------------------------------------------------------------------------
// INV-07 — Reported efficiency = NSA / GFA, at the definition scope stated
// ---------------------------------------------------------------------------

const inv07: InvariantCheck = {
  id: 'INV-07',
  statement: 'Reported efficiency = NSA / GFA, at the definition scope stated',
  tolerance: '0.1%',
  phase0Dormant: true,
  check: (s) => {
    if (!s.units) return dormantByPhase(NO_UNIT_SCHEDULE);
    if (s.units.efficiencies.length === 0) {
      return dormant('the unit schedule reports no efficiency figure.');
    }
    const failures: string[] = [];
    let worstObserved = new Decimal(0);
    let worstExpected = new Decimal(0);
    let worstRel = new Decimal(-1);
    for (const e of s.units.efficiencies) {
      const reported = dec(e.reported);
      if (e.scope.trim() === '') {
        // "at the definition scope stated" is unsatisfiable when no scope was
        // stated. This is the FR-DEF-001 failure mode in miniature.
        failures.push('an efficiency figure carries no scope');
        continue;
      }
      const gfa = dec(e.gfaM2);
      if (gfa.isZero()) {
        failures.push(`${e.scope}: GFA is zero, so the ratio is undefined`);
        continue;
      }
      const observed = dec(e.nsaM2).div(gfa);
      const rel = relativeDifference(observed, reported);
      if (rel.gt(worstRel)) {
        worstRel = rel;
        worstObserved = observed;
        worstExpected = reported;
      }
      if (!within(observed, reported, TOL_0_1_PCT)) {
        failures.push(`${e.scope}: ${show(observed)} vs reported ${show(reported)}`);
      }
    }
    return verdict(failures.length === 0, {
      observed: show(worstObserved),
      expected: show(worstExpected),
      detail:
        failures.length === 0
          ? `${s.units.efficiencies.length} scoped efficiency figure(s) recompute; worst ` +
            `${residual(worstObserved, worstExpected)}.`
          : `${failures.join('; ')}.`,
    });
  },
};

// ---------------------------------------------------------------------------
// INV-08 — Podium footprint ≤ setback-permitted footprint
// ---------------------------------------------------------------------------

const inv08: InvariantCheck = {
  id: 'INV-08',
  statement: 'Podium footprint ≤ setback-permitted footprint',
  tolerance: EXACT,
  phase0Dormant: false,
  check: (s) => {
    if (!s.envelope) return dormant('no envelope was supplied.');
    const podium = dec(s.envelope.podiumFootprintM2);
    const permitted = dec(s.envelope.setbackPermittedFootprintM2);
    return verdict(podium.lte(permitted), {
      observed: show(podium),
      expected: `≤ ${show(permitted)}`,
      detail:
        `podium ${show(podium)} m² against setback-permitted ${show(permitted)} m²; ` +
        `slack ${permitted.minus(podium).toDecimalPlaces(6).toString()} m². ` +
        `Exceeding it means building outside the setback line, which no tolerance forgives.`,
    });
  },
};

// ---------------------------------------------------------------------------
// INV-09 — Podium footprint ≤ coverage cap
// ---------------------------------------------------------------------------

const inv09: InvariantCheck = {
  id: 'INV-09',
  statement: 'Podium footprint ≤ coverage cap',
  tolerance: EXACT,
  phase0Dormant: false,
  check: (s) => {
    if (!s.envelope) return dormant('no envelope was supplied.');
    if (s.envelope.coverageCapM2 === undefined) {
      return dormant(
        'no coverage cap was supplied. If no approved coverage rule applies the ' +
          'podium is not further reduced, but an absent cap is an unchecked cap — ' +
          'it is not evidence that coverage is satisfied.',
      );
    }
    const podium = dec(s.envelope.podiumFootprintM2);
    const cap = dec(s.envelope.coverageCapM2);
    return verdict(podium.lte(cap), {
      observed: show(podium),
      expected: `≤ ${show(cap)}`,
      detail:
        `podium ${show(podium)} m² against coverage cap ${show(cap)} m²; ` +
        `slack ${cap.minus(podium).toDecimalPlaces(6).toString()} m².`,
    });
  },
};

// ---------------------------------------------------------------------------
// INV-10 — Tower plate ≤ podium footprint AND ≤ tower plate cap
// ---------------------------------------------------------------------------

const inv10: InvariantCheck = {
  id: 'INV-10',
  statement: 'Tower plate ≤ podium footprint AND ≤ tower plate cap',
  tolerance: EXACT,
  phase0Dormant: false,
  check: (s) => {
    if (!s.envelope) return dormant('no envelope was supplied.');
    const plate = dec(s.envelope.towerPlateM2);
    const podium = dec(s.envelope.podiumFootprintM2);
    const withinPodium = plate.lte(podium);

    if (s.envelope.towerPlateCapM2 === undefined) {
      // A conjunction with one arm unevaluated is not satisfied. If the arm we
      // *can* evaluate already fails, the conjunction definitely fails and
      // saying so is more useful than "unknown". If it holds, the conjunction
      // is merely unverified, and reporting that as PASS ticks half a box with
      // the other half missing.
      if (!withinPodium) {
        return verdict(false, {
          observed: show(plate),
          expected: `≤ ${show(podium)}`,
          detail:
            `tower plate ${show(plate)} m² exceeds podium ${show(podium)} m². ` +
            `No tower plate cap was supplied, but the podium arm already fails.`,
        });
      }
      return dormant(
        `no tower plate cap was supplied, so only one arm of the conjunction ran. ` +
          `The plate (${show(plate)} m²) is within the podium (${show(podium)} m²), ` +
          `but a half-evaluated conjunction is not a pass.`,
      );
    }

    const cap = dec(s.envelope.towerPlateCapM2);
    const withinCap = plate.lte(cap);
    return verdict(withinPodium && withinCap, {
      observed: show(plate),
      expected: `≤ min(${show(podium)}, ${show(cap)})`,
      detail:
        `plate ${show(plate)} m²; podium arm ${withinPodium ? 'holds' : 'fails'} ` +
        `(${show(podium)} m²), cap arm ${withinCap ? 'holds' : 'fails'} (${show(cap)} m²). ` +
        `PRD Appendix A selects a 1,060 m² plate with no stated derivation while its ` +
        `own printed computation gives 1,280 — both satisfy this check, which is why ` +
        `it is an invariant and not a validation.`,
    });
  },
};

// ---------------------------------------------------------------------------
// INV-11 — Σ(level heights) = reported total height ≤ height ceiling
// ---------------------------------------------------------------------------

const inv11: InvariantCheck = {
  id: 'INV-11',
  statement: 'Σ(level heights) = reported total height ≤ height ceiling',
  tolerance: '0.01 m',
  phase0Dormant: false,
  check: (s) => {
    if (!s.height) return dormant('no reported height / height ceiling pair was supplied.');
    const aboveGround = (s.levels ?? []).filter((l) => l.aboveGround);
    const withHeights = aboveGround.filter(
      (l): l is LevelRecord & { heightM: Numeric } => l.heightM !== undefined,
    );
    if (aboveGround.length === 0 || withHeights.length !== aboveGround.length) {
      return dormant(
        aboveGround.length === 0
          ? 'the subject carries no above-ground level, so there is no sum of level ' +
            'heights to compare against the reported total.'
          : `${aboveGround.length - withHeights.length} of ${aboveGround.length} ` +
            `above-ground level(s) state no height. A partial sum would under-report ` +
            `the building and pass, which is worse than not checking.`,
      );
    }
    const observed = sum(withHeights.map((l) => dec(l.heightM)));
    const reported = dec(s.height.reportedTotalHeightM);
    const ceiling = dec(s.height.heightCeilingM);
    // Both clauses of the statement, in one verdict. The 0.01 m tolerance is
    // absolute and attaches to the equality; the ceiling comparison is an
    // inequality on the *reported* height and takes no tolerance at all — a
    // building 5 mm over the ceiling is over the ceiling.
    const sumsMatch = withinAbsolute(observed, reported, TOL_HEIGHT_M);
    const underCeiling = reported.lte(ceiling);
    return verdict(sumsMatch && underCeiling, {
      observed: show(observed),
      expected: `${show(reported)} (≤ ceiling ${show(ceiling)})`,
      detail:
        `${withHeights.length} above-ground level(s) sum to ${show(observed)} m against a ` +
        `reported ${show(reported)} m ` +
        `(absolute residual ${observed.minus(reported).abs().toDecimalPlaces(6).toString()} m); ` +
        `ceiling arm ${underCeiling ? 'holds' : 'fails'} at ${show(ceiling)} m.`,
    });
  },
};

// ---------------------------------------------------------------------------
// INV-12 — Parking bays × bay area factor ≤ available parking area
// ---------------------------------------------------------------------------

const inv12: InvariantCheck = {
  id: 'INV-12',
  statement: 'Parking bays × bay area factor ≤ available parking area',
  tolerance: EXACT,
  phase0Dormant: false,
  check: (s) => {
    if (!s.parking) return dormant('no parking claim was supplied.');
    // "Parking bays" is read as the bays the scheme *provides*, not the bays it
    // requires. Appendix A.7 evaluates this with the required count (158 × 32.0
    // = 5,056 ≤ 5,299) while A.5 supplies 165 — an inconsistency in the PRD's
    // own worked example. The provided count is the strictly stronger reading
    // and the one that catches an over-claimed supply, which is the only
    // failure this check exists for.
    const bays = new Decimal(s.parking.providedBays);
    const factor = dec(s.parking.bayAreaFactorM2);
    const observed = bays.times(factor);
    const available = dec(s.parking.availableParkingAreaM2);
    return verdict(observed.lte(available), {
      observed: show(observed),
      expected: `≤ ${show(available)}`,
      detail:
        `${s.parking.providedBays} provided bay(s) × ${show(factor)} m²/bay = ` +
        `${show(observed)} m² against ${show(available)} m² available; ` +
        `slack ${available.minus(observed).toDecimalPlaces(6).toString()} m².`,
    });
  },
};

// ---------------------------------------------------------------------------
// INV-13 — Parking bays ≥ computed demand
// ---------------------------------------------------------------------------

const inv13: InvariantCheck = {
  id: 'INV-13',
  statement: 'Parking bays ≥ computed demand',
  tolerance: EXACT,
  phase0Dormant: false,
  check: (s) => {
    if (!s.parking) return dormant('no parking claim was supplied.');
    const provided = new Decimal(s.parking.providedBays);
    const required = dec(s.parking.requiredBays);
    return verdict(provided.gte(required), {
      observed: show(provided),
      expected: `≥ ${show(required)}`,
      detail:
        `${show(provided)} provided against ${show(required)} required; ` +
        `headroom ${provided.minus(required).toDecimalPlaces(6).toString()} bay(s).`,
    });
  },
};

// ---------------------------------------------------------------------------
// INV-14 — Level count × level height budget is integer-consistent
// ---------------------------------------------------------------------------

const inv14: InvariantCheck = {
  id: 'INV-14',
  statement: 'Level count × level height budget is integer-consistent',
  tolerance: EXACT,
  phase0Dormant: false,
  check: (s) => {
    if (!s.levelBudget) return dormant('no level-count / height-budget claim was supplied.');
    const { reportedLevelCount } = s.levelBudget;
    const budget = dec(s.levelBudget.levelHeightBudgetM);
    const available = dec(s.levelBudget.heightAvailableM);

    // §12.2 does not define "integer-consistent". The reading implemented is:
    // (a) the reported level count is a non-negative integer, and (b) the
    // levels claimed physically fit in the height they draw on.
    //
    // A third clause was considered and REJECTED: that the count must also be
    // *maximal*, i.e. exactly floor(available ÷ budget). Appendix A refutes it.
    // The example reports 13 tower floors against 88.5 m of available height at
    // 3.2 m, which holds 27; the 13 is FAR-limited, and the 46.9 m of unused
    // height is reported as headroom (§15.2), not as an error. A maximality
    // clause would fail the PRD's own showcase example. Recorded here because
    // it is exactly the kind of reading someone re-litigates later; the
    // ambiguity belongs on docs/03-analysis/open-questions.md beside Q19.
    if (!Number.isInteger(reportedLevelCount) || reportedLevelCount < 0) {
      return verdict(false, {
        observed: String(reportedLevelCount),
        expected: 'a non-negative integer',
        detail:
          `reported level count ${reportedLevelCount} is not a non-negative integer. ` +
          `A fractional level count is a division printed instead of resolved — ` +
          `Appendix A.3 derives "13.5 floors" and then reports 13, and whether the ` +
          `missing half floor was dropped from the unit count as well is precisely ` +
          `what this check exists to make visible.`,
      });
    }
    if (budget.lte(0)) {
      return verdict(false, {
        observed: show(budget),
        expected: '> 0',
        detail:
          'the level height budget is zero or negative, which makes the product ' +
          'vacuous. An unstated floor-to-floor is not a floor-to-floor of zero.',
      });
    }
    const consumed = budget.times(reportedLevelCount);
    return verdict(consumed.lte(available), {
      observed: show(consumed),
      expected: `≤ ${show(available)}`,
      detail:
        `${reportedLevelCount} level(s) × ${show(budget)} m = ${show(consumed)} m against ` +
        `${show(available)} m available; ${show(available.div(budget).floor())} level(s) ` +
        `would fit. Maximality is deliberately not asserted — see the comment on this check.`,
    });
  },
};

// ---------------------------------------------------------------------------
// INV-15 — Every area term used appears in the metric definitions annex
// ---------------------------------------------------------------------------

const inv15: InvariantCheck = {
  id: 'INV-15',
  statement: 'Every area term used appears in the metric definitions annex',
  tolerance: EXACT,
  phase0Dormant: false,
  check: (s) => {
    if (s.areaTermsUsed === undefined) {
      return dormant(
        'the subject names no metric terms. FR-DEF-001 AC5 is then unverified, ' +
          'which is not the same as satisfied.',
      );
    }
    if (s.areaTermsUsed.length === 0) {
      // An explicitly empty list is a claim, not an absence: the artifact says
      // it used no defined term while reporting areas anyway.
      return verdict(false, {
        observed: '0 terms named',
        expected: `every reported term present in annex ${ANNEX_VERSION}`,
        detail:
          'an empty term list was supplied explicitly. An artifact that reports areas ' +
          'while naming no metric terms cannot be checked against the annex, and V1 is ' +
          'the record of what that costs: the annex "is the root. Nothing computes an ' +
          'area term until it is signed" (§32.3).',
      });
    }
    // The independent re-check of FR-DEF-001 AC5. `metric()` inside the engine
    // is a gate the engine applies to itself; this is the same question asked
    // by a module that cannot import the engine, and that independence is the
    // only reason the answer carries information (Principle 4, §12.3).
    const undefinedTerms = s.areaTermsUsed.filter((id) => !isDefined(id));
    return verdict(undefinedTerms.length === 0, {
      observed: `${s.areaTermsUsed.length - undefinedTerms.length} of ${s.areaTermsUsed.length} defined`,
      expected: `every reported term present in annex ${ANNEX_VERSION}`,
      detail:
        undefinedTerms.length === 0
          ? `all ${s.areaTermsUsed.length} term(s) resolve against annex ${ANNEX_VERSION} ` +
            `(${DEFINED_METRIC_IDS.size} definitions).`
          : `undefined term(s): ${undefinedTerms.join(', ')}. FR-DEF-001 AC5 — no code ` +
            `may compute an area term absent from the annex.`,
    });
  },
};

// ---------------------------------------------------------------------------
// INV-16 — Governing capacity = min(A, B, C) and is labelled as such
// ---------------------------------------------------------------------------

/**
 * Band letters to the domain enum.
 *
 * The §15.1 table is scrambled in the source PDF — it prints "B Geometric
 * capacity | What does FAR and the area caps permit?" — but Appendix A.3
 * settles it unambiguously: A is regulation-limited, B geometry-limited, C
 * parking-limited. `core/domain.ts` already encodes that reading; this map
 * exists only so INV-16's message can speak the PRD's own letters back to it.
 */
const BAND_LETTER: Readonly<Record<CapacityBand, string>> = {
  [CapacityBand.REGULATORY]: 'A',
  [CapacityBand.GEOMETRIC]: 'B',
  [CapacityBand.PARKING]: 'C',
};

const inv16: InvariantCheck = {
  id: 'INV-16',
  statement: 'Governing capacity = min(A, B, C) and is labelled as such',
  tolerance: EXACT,
  phase0Dormant: false,
  check: (s) => {
    if (!s.capacity) return dormant('no capacity bands were supplied.');
    const a = dec(s.capacity.regulationLimitedGfaM2);
    const b = dec(s.capacity.geometryLimitedGfaM2);
    const c = dec(s.capacity.parkingLimitedGfaM2);
    const bands: ReadonlyMap<CapacityBand, Decimal> = new Map([
      [CapacityBand.REGULATORY, a],
      [CapacityBand.GEOMETRIC, b],
      [CapacityBand.PARKING, c],
    ]);
    const minimum = Decimal.min(a, b, c);
    const governing = dec(s.capacity.governingGfaM2);
    const labelled = bands.get(s.capacity.governingBand);

    // Two arms, because §12.2 says "and is labelled as such". The value arm
    // alone would accept a report whose number is right and whose named band is
    // wrong — and the named band is what a developer reads to decide where to
    // push (§15.2). A wrong label sends them to negotiate the wrong variance,
    // which is a more expensive mistake than a wrong number they would notice.
    const valueHolds = governing.eq(minimum);
    const labelHolds = labelled !== undefined && labelled.eq(minimum);
    const tied = [a, b, c].filter((v) => v.eq(minimum)).length > 1;

    return verdict(valueHolds && labelHolds, {
      observed:
        `${show(governing)} labelled ${BAND_LETTER[s.capacity.governingBand]} ` +
        `(${s.capacity.governingBand})`,
      expected: `${show(minimum)} = min(A ${show(a)}, B ${show(b)}, C ${show(c)})`,
      detail:
        `value arm ${valueHolds ? 'holds' : 'fails'}; label arm ` +
        `${labelHolds ? 'holds' : 'fails'}` +
        (tied
          ? '. Two or more bands tie at the minimum, so more than one label is ' +
            'defensible; the tie is reported because a band that binds with zero ' +
            'headroom is a band the user must be told about (§15.2).'
          : '.'),
    });
  },
};

// ---------------------------------------------------------------------------
// INV-17 — Achieved FAR ≤ permitted FAR
// ---------------------------------------------------------------------------

const inv17: InvariantCheck = {
  id: 'INV-17',
  statement: 'Achieved FAR ≤ permitted FAR',
  tolerance: EXACT,
  phase0Dormant: false,
  check: (s) => {
    if (!s.far) return dormant('no achieved / permitted FAR pair was supplied.');
    const achieved = dec(s.far.reportedFar);
    const permitted = dec(s.far.permittedFar);
    return verdict(achieved.lte(permitted), {
      observed: show(achieved),
      expected: `≤ ${show(permitted)}`,
      detail:
        `achieved ${show(achieved)} against permitted ${show(permitted)}; ` +
        `headroom ${permitted.minus(achieved).toDecimalPlaces(6).toString()}. ` +
        `Exact: a FAR over the cap by 0.001 is over the cap.`,
    });
  },
};

// ---------------------------------------------------------------------------
// INV-18 — GFA composition matches the declared parking-in-FAR treatment
// ---------------------------------------------------------------------------

const inv18: InvariantCheck = {
  id: 'INV-18',
  statement: 'GFA composition matches the declared parking-in-FAR treatment',
  tolerance: EXACT,
  phase0Dormant: false,
  check: (s) => {
    if (!s.composition) return dormant('no parking-in-FAR declaration was supplied.');
    const { parkingInFar } = s.composition;

    // FR-DEF-002 forbids a default and blocks computation until the treatment
    // is DERIVED from a citation or USER_SET by a named user. An artifact that
    // reports a GFA composition while the question is open has already computed
    // something it was not permitted to compute, and the swing is 15–35%. That
    // is a failure, not a dormancy — there is data here, and it is wrong.
    if (parkingInFar === ParkingInFar.OPEN_REGULATORY_QUESTION) {
      return verdict(false, {
        observed: 'OPEN_REGULATORY_QUESTION',
        expected: 'COUNTS_TOWARD_FAR or EXCLUDED_FROM_FAR',
        detail:
          'the parking-in-FAR treatment is declared OPEN, yet the artifact reports a ' +
          'GFA composition. FR-DEF-002 forbids a default and blocks capacity ' +
          'computation until a treatment is DERIVED from a citation or USER_SET by a ' +
          'named user. See open-questions.md Q2 — the treatment for this land-use ' +
          'slice is still open with the client.',
      });
    }

    if (!s.levels || s.levels.length === 0) {
      return dormant(
        'no level schedule was supplied, so there is no composition to compare ' +
          'against the declaration.',
      );
    }

    const counts = parkingInFar === ParkingInFar.COUNTS_TOWARD_FAR;
    const parkingLevels = s.levels.filter((l) => l.kind === LevelKind.PARKING);
    const inconsistent = parkingLevels.filter((l) => l.countedInGfa !== counts);
    const declaredArea =
      s.composition.parkingAreaM2 === undefined ? undefined : dec(s.composition.parkingAreaM2);

    // The mirror case: the declaration says parking counts, a parking area is
    // stated, and no level in the schedule carries it. Then the reported GFA is
    // missing area the declaration says belongs inside it — the same 15–35%
    // error arrived at from the other direction.
    const missingFromSchedule =
      counts &&
      declaredArea !== undefined &&
      declaredArea.gt(0) &&
      parkingLevels.filter((l) => l.countedInGfa).length === 0;

    const held = inconsistent.length === 0 && !missingFromSchedule;
    const inside = parkingLevels.filter((l) => l.countedInGfa).length;
    return verdict(held, {
      observed: `${parkingLevels.length} parking level(s), ${inside} inside GFA`,
      expected: counts ? 'every parking level inside GFA' : 'no parking level inside GFA',
      detail: held
        ? `declaration ${parkingInFar} is consistent with the level schedule` +
          (declaredArea !== undefined ? ` (${show(declaredArea)} m² of parking area)` : '') +
          '.'
        : missingFromSchedule
          ? `declaration ${parkingInFar} with ` +
            `${show(declaredArea ?? new Decimal(0))} m² of parking area, but no level in ` +
            `the schedule carries it into GFA. Mixing the two treatments in one report ` +
            `moves capacity 15–35%.`
          : `${inconsistent.length} parking level(s) contradict the declaration ` +
            `${parkingInFar}: ${inconsistent.map((l) => l.label).join(', ')}.`,
    });
  },
};

// ---------------------------------------------------------------------------
// The catalogue
// ---------------------------------------------------------------------------

/** All eighteen, in §12.2 order. The order is stable — reports cite it. */
export const INVARIANT_CATALOGUE: readonly InvariantCheck[] = [
  inv01,
  inv02,
  inv03,
  inv04,
  inv05,
  inv06,
  inv07,
  inv08,
  inv09,
  inv10,
  inv11,
  inv12,
  inv13,
  inv14,
  inv15,
  inv16,
  inv17,
  inv18,
];

/**
 * The five checks that cannot run in Phase 0 at all, whatever the subject.
 *
 * Distinct from a check that is dormant because this particular artifact
 * omitted a group: these five have no Phase 0 data source anywhere in the
 * product, not merely in this call.
 */
export const PHASE_0_DORMANT: ReadonlySet<InvariantId> = new Set(
  INVARIANT_CATALOGUE.filter((c) => c.phase0Dormant).map((c) => c.id),
);

/**
 * The sentence a report must carry instead of "18 checks passed".
 *
 * Exported as a constant so the report layer quotes it rather than paraphrasing
 * it into something softer. Every clause in it is load-bearing with the client.
 */
export const PHASE_0_DORMANT_NOTE =
  `Five of the eighteen §12.2 invariants (${[...PHASE_0_DORMANT].join(', ')}) reference ` +
  `unit NSA, unit counts and mix shares. PRD §3.2 puts configurations and floor plans out ` +
  `of Phase 0 scope and no functional requirement anywhere supplies a unit mix, so those ` +
  `five are DORMANT: implemented in full, exercised by tests, and reporting no result on a ` +
  `Phase 0 artifact. Thirteen run. The §24.1 checkbox "Invariant layer: 18 checks" therefore ` +
  `cannot honestly be ticked in Phase 0 — see docs/03-analysis/open-questions.md Q19 and Q20. ` +
  `The PRD is already inconsistent with itself on this point: Appendix A.7 tabulates sixteen ` +
  `results (INV-14 and INV-15 are absent) while A.8 asserts "PASS — all 18 invariants".`;
