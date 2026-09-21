# Core engine models — PRD V2 §§10–16 (Data, Rule, Invariant, Provenance, Geometry, Capacity, Validation)

> Source: ENVELOPE_PRD_v2 / Deck / client comms. Auto-extracted reference — verify against the original PDFs before quoting a threshold.

# ENVELOPE PRD v2 — §§10–16 exhaustive extraction

Source: `E:\ENVELOPE\_client_material\extracted\ENVELOPE_PRD_v2.txt` (3,587 lines). §10 begins line 1590, §17 begins line 2178. Cross-references pulled from §2.2 (line 310), §2.4 principles (line 368), §9 Functional Requirements (lines 801–1590), §22 metrics (line 2515), §24 MVP acceptance (line 2634), §29 red-team corrections (line 2959), Appendix A worked example (lines 3060–3200).

**Extraction caveat:** the file is PDF-derived text. Several tables (notably §15.1 capacity concepts, §10.3 change log, Appendix A.1/A.4/A.8) have column-shifted so that labels and values are separated by one or more rows. Where I reconstruct, I say so explicitly. All schema field names below are quoted verbatim from the file.

---

## 1. §10 DATA MODEL

### 1.1 Four design principles (§10.1)
1. **Separate epistemic classes at the type level.** `Rule`, `Standard`, `Target`, and `PrecedentObservation` are *distinct types with distinct capabilities*. "PrecedentObservation is structurally incapable of being a Constraint source. Principle 1 is a property of the type system, not a policy someone can forget."
2. **Everything authoritative is bitemporal.** Validity time (when the rule was in force) + transaction time (when we recorded it). "Without both, you cannot reproduce a past run or answer 'was this correct at the time?'"
3. **Parameters are first-class.** `setback.front` is an entity, not a string key. Rules, standards and targets all bind to it — "this is what makes cross-source conflict detection tractable rather than string-matching."
4. **Runs are immutable. Results are append-only.** An asset change creates a new run; it never mutates an old one.

### 1.2 Core entities (§10.2) — verbatim field lists

**`METRIC_DEFINITION`** — tagged "FR-DEF-001; root of everything"
```
metric_id, name, formula_statement
inclusions[], exclusions[]
version, approved_by, approved_at
```
FR-DEF-001 (line 801) adds the required coverage: **at minimum GFA, BUA, NSA, Sellable Area, Gross Efficiency, Tower Efficiency, Parking Area, Bay Area Factor, FAR, Plot Coverage** (AC1); each definition states explicit inclusions/exclusions for balconies, terraces, plant, cores, circulation, parking, basements (AC2); records whether parking counts toward FAR or marks it `OPEN REGULATORY QUESTION` (AC3); versioned and cited in every report (AC4); **"No code merges that computes an area term absent from the annex"** (AC5). Priority "P0 — week 1, before any code". Dependencies: **none — everything else depends on it.**

**`PARAMETER`** — "the shared vocabulary"
```
parameter_id            -- 'setback.front', 'parking.ratio.2bed'
name, domain, unit_type, value_type
is_life_safety: bool
rule_class_default: GENERATIVE | FILTERING | EVALUATIVE_ONLY
```

**`PLOT`**
```
plot_id, tenant_id
plot_number, community, land_use
stated_area, computed_area, area_mismatch_flag
geometry: Polygon, geometry_source, geometry_class (USER_SET in Phase 0)
shape_class: RECTILINEAR | SIMPLE_CONVEX | COMPLEX   -- COMPLEX rejected in Phase 0
derived: principal_axis, mbr, convexity_ratio, frontage_count
```
FR-PLT-001 adds: computed-vs-stated area deviation **> 2% blocks until resolved** (AC2); edge classification mandatory for every edge, **no default** (AC3); trained user completes plot entry in **≤ 3 minutes**, measured (AC4).

**`PLOT_EDGE`**
```
edge_id, plot_id, seq, geometry: LineString
classification: ROAD | ADJACENT_PLOT | OPEN_SPACE | OTHER
road_hierarchy, length_m, bearing_deg
applied_setback_value, applied_setback_rule_id
```
Design note (line ~856): edge classification is **deliberately not automated in Phase 0** — reliable road-edge detection needs a road-hierarchy GIS layer joined to cadastral edges, whose availability and join quality are unverified (§30).

**`RULE`** — see §11.2. **`DEVELOPER_STANDARD`** — Phase 1. **`PROJECT_BRIEF`** — Phase 1. **`OBJECTIVE_PROFILE`** — Phase 1, versioned, governed.

**`CONSTRAINT_SET`** — "materialized, immutable per run"
```
generative[], filtering[], evaluative[], deferred[]
preferences[]
-- TYPE INVARIANT: no PrecedentObservation in any derivation path
```

**`BUILDABLE_ENVELOPE`**
```
setback_permitted_footprint_m2, coverage_cap_m2, podium_footprint_m2
tower_plate_cap_m2, height_ceiling_m
max_levels_by_height, binding_constraint_per_dimension{}
```

**`CAPACITY_RESULT`**
```
regulation_limited_gfa                 -- band A
geometry_limited_gfa                   -- band B
parking_limited_gfa                    -- band C
governing_band, governing_constraint_rule_id
commercially_preferred_gfa             -- Phase 1, nullable
historically_observed_gfa              -- Phase 2, nullable, distribution
user_realism_discount                  -- USER_SET, default 1.00
integer_granularity_loss_m2
```

**`CONFIGURATION`** — Phase 1+
```
config_id, run_id, typology_id, parameter_vector
massing{}, core{}, unit_schedule[], parking{}
metrics{}, scores{}
invariant_report_id, validation_report_id, provenance_root_id
```

**Remaining entities (declared, detailed elsewhere):** `PRECEDENT_PROJECT` (Phase 2; §17.1), `PRECEDENT_OBSERVATION` ("NEVER a constraint source"), `VARIANCE` ("evidence-bound, expiring, non-life-safety"), `RUN` ("immutable; §13.4"), `PROVENANCE_NODE / EDGE` (§13.2), `INVARIANT_REPORT` (§12).

`PRECEDENT_PROJECT` fields (§17.1, for completeness since it is referenced from §10.2):
```
precedent_id
acquisition_path: PUBLIC | PARTNER
data_tier: A | B | C
source, licence, redistributable: bool, acquired_at
plot_reference, community, approval_date, land_use
plot_area, permitted_far, built_up_area, gfa
floors_above, floors_below, unit_count, unit_mix, nsa
parking_bays
achieved_far (derived), efficiency (derived, requires nsa)
regulatory_regime_id      -- required for the similarity gate
geometry                  -- Tier A only
feature_vector
```
`VARIANCE` semantics from FR-GOV-003: bound to **rule + plot + evidence + asserter + expiry**; no variance without an uploaded evidence document ("no 'upload later'"); **life-safety rules cannot be varied — the pathway is disabled for that rule class**; face-page notice on every report produced under a variance; variances expire and require re-confirmation; second-reviewer requirement tenant-configurable, defaults on for multi-seat.

### 1.3 Changes from V1 (§10.3) — table is column-shifted in the text; reconstructed pairs
| Change | Reason |
|---|---|
| `METRIC_DEFINITION` added as a first-class entity | V1 used GFA/BUA/NSA/efficiency without definitions; the root cause of its broken example |
| `shape_class` on plot | Enforces the Phase 0 geometry restriction at the data layer, not in a comment |
| `realistic_capacity` field **removed**; `historically_observed` nullable | Cannot be computed without data that does not yet exist |
| `user_realism_discount` added, `USER_SET` | Honest substitute during Phases 0–1 |
| `binding_constraint_per_dimension` promoted to a structured field | It is the most decision-relevant output and was buried in prose |
| `integer_granularity_loss` added | The floor that does not fit is real capacity loss and was previously absorbed silently |
| Rule class (generative/filtering/evaluative) added | V1 required all rules to be constructive, which is impossible |
| `INVARIANT_REPORT` added | New layer |

---

## 2. §11 RULE MODEL

### 2.1 Typed records, not a DSL (§11.1)
**Decision:** Phase 0 stores rules as **typed data records evaluated by a registry of named functions. No DSL, no compiler.** Rationale: a DSL designed before ~100 rules exist encodes the wrong abstractions; typed records deliver bitemporality, provenance, versioning and testability immediately, and leave awkward rules expressible as a registered Python evaluator. "Extract a DSL around rule 100, when the shape is known… the migration is mechanical because the records are already typed."

**Guard:** the evaluator registry is **capped at 12 functions in Phase 0**. "Exceeding it signals the abstraction is wrong and triggers a design review rather than a thirteenth function."

### 2.2 Rule record (§11.2) — verbatim JSON
```json
{
  "rule_id": "R-SETBACK-ROAD-RES",
  "parameter_id": "setback.road",
  "rule_class": "GENERATIVE",
  "evaluator": "table_lookup_min",
  "evaluator_args": {"key": ["road_hierarchy"], "table": "T-SETBACK-01"},
  "unit": "m",
  "applicability": {
     "all": [
         {"land_use": {"in": ["RESIDENTIAL_MULTI"]}},
         {"edge.classification": {"eq": "ROAD"}}
     ]
  },
  "citation": {
     "instrument_id": "...", "instrument_version": "...",
     "clause_reference": "...", "document_uri": "...",
     "source_page": 0, "source_bbox": [0,0,0,0],
     "source_text_verbatim": "..."
  },
  "jurisdiction": "DM_MAINLAND",
  "is_life_safety": false,
  "mechanization": "MECHANIZED",
  "valid_from": "YYYY-MM-DD", "valid_to": null,
  "recorded_at": "...", "version": 3, "supersedes": "...",
  "status": "APPROVED",
  "authored_by": "...", "approved_by": "...", "approved_at": "...",
  "tests": [
     {"kind": "POSITIVE",  "context": {...}, "expected": 6.0},
     {"kind": "BOUNDARY",  "context": {...}, "expected": 4.5},
     {"kind": "NEGATIVE",  "context": {"land_use": "INDUSTRIAL"}, "expected": "NOT_APPLICABLE"}
  ]
}
```
Rule immediately following: **"All nine Principle-9 fields are non-null. `status != APPROVED` is not loadable by the evaluator."**

### 2.3 The "nine mandatory fields" (Principle 9) — and a counting discrepancy
Principle 9 (§2.4, line ~377) states every rule carries: **"source, citation, effective date, jurisdiction, applicability, version, approval, provenance"** — enforcement: "Schema: all NOT NULL. §11." FR-RUL-001 AC1 (line 909) repeats it as **"source, citation, effective date, jurisdiction, applicability, version, approval status, provenance -- all non-null (Principle 9)."**

**That enumeration lists eight items, not nine**, in both places, while §11.2 and §24.1 both say "all nine Principle-9 fields." Mapping the eight onto §11.2 record fields:

| Principle-9 item | Rule-record field(s) |
|---|---|
| source | `citation.instrument_id`, `citation.instrument_version`, `citation.document_uri` |
| citation | `citation.clause_reference`, `citation.source_page`, `citation.source_bbox`, `citation.source_text_verbatim` |
| effective date | `valid_from`, `valid_to` (validity time) + `recorded_at` (transaction time) |
| jurisdiction | `jurisdiction` |
| applicability | `applicability` |
| version | `version`, `supersedes` |
| approval (status) | `status`, `authored_by`, `approved_by`, `approved_at` |
| provenance | derivation linkage into the provenance graph (§13) |

The plausible ninth is `rule_class` (FR-RUL-001 AC4: "Every rule declares its class") or `is_life_safety`/`mechanization`. **The PRD never enumerates nine explicitly — an implementer must have this pinned before writing the NOT NULL constraints.**

### 2.4 Other rule-record obligations (FR-RUL-001, lines 890–924)
- AC2: `approved_by` non-null and a **qualified human**. "The evaluator refuses to load unapproved records. **No bypass flag exists.**"
- AC3: **Every rule has 3 passing tests including one boundary and one negative case.**
- AC5: **Bitemporal — the rule set as of any past date is reconstructible.**
- AC6: evaluator registry ≤ 12 functions at Phase 0.
- Authoring pipeline: "Author record → bind to parameter vocabulary → attach citation → author 3 tests → review → approve → publish with validity window."

### 2.5 The three rule classes + DEFERRED (§11.3)
Note: the PRD says "three rule classes" but tabulates **four partitions** — `DEFERRED` is the fourth, and FR-RUL-003 AC1 requires "**Every applicable rule lands in exactly one partition. Unassigned rules fail the build.**" Outputs of FR-RUL-003: `GenerativeSet`, `FilterSet`, `EvaluativeSet`, `DeferredCheckList`.

| Class | Definition | Operational role | Examples |
|---|---|---|---|
| `GENERATIVE` | Can directly construct geometry or a numeric bound | Builds the envelope; runs first | Setbacks (polygon offset), height ceiling, FAR ceiling, coverage cap, tower plate cap |
| `FILTERING` | Prunes candidates during construction | Applied at instantiation; a candidate violating it is never created | Minimum unit area, minimum corridor width, minimum stair width, parking ratio |
| `EVALUATIVE_ONLY` | Assessable only after a candidate exists; **has no constructive inverse** | Applied post-construction; **can only reject, never modify** | Maximum travel distance, exit separation, dead-end corridor length, aggregate occupant load |
| `DEFERRED` | Applicable but not mechanizable at this fidelity | **Declared in every output** (in the body — FR-RUL-003 AC2) | Performance-based smoke control, façade fire performance, discretionary judgement |

Architectural consequence stated verbatim: "V1 required every rule to declare a 'constructive form,' which is impossible for topological rules — there is no way to generate a floorplate from a travel-distance limit. EVALUATIVE_ONLY rules prune only after the fact, which changes search efficiency materially. **Phase 5 must budget for rejection rates in the outer loop; that cost is now visible.**"

### 2.6 Evaluator registry — Phase 0, exactly 12 (§11.4)
```
scalar_min · scalar_max · table_lookup_min · table_lookup_max · ratio_per_unit_type ·
percentage_of_base · polygon_offset_inward · count_minimum · range_bound ·
enum_permitted_set · conditional_scalar · custom_python
```
`custom_python` is qualified: "(registered, tested, reviewed like any other rule)."

### 2.7 Overlap resolution — scalar parameters (§11.5)
For a parameter with multiple applicable rules:
1. **A plot-specific instrument specifying the parameter governs** — "it is the instrument that applies the general framework to this plot. **Exception: it cannot relax a life-safety parameter.**"
2. Otherwise, **across authorities, most restrictive governs**. "An overlay adds restriction; it does not relax a baseline."
3. **Every non-governing candidate is recorded as a `supersededBy` edge and is visible to the user.**

"Most restrictive" defined for scalars: **for MIN operators the maximum value; for MAX operators the minimum value.**

FR-RUL-002 adds: applicability materialization produces an **`ApplicableRuleSet` with per-rule inclusion reason and near-miss exclusion reasons**; immutable once bound; re-running after a rule-base change **creates a new run**.

### 2.8 Non-scalar conflict handling (§11.6)
| Parameter type | Partial order | Resolution |
|---|---|---|
| Scalar with MIN/MAX | Total order | Automatic |
| Bounded range | Intersection | Automatic; **empty intersection → IRRECONCILABLE** |
| Count | Total order (max) | Automatic |
| Enumerated set | Set intersection | Automatic if intersection non-empty; **empty → IRRECONCILABLE** |
| Enumerated single value | **No order exists** | **REQUIRES_ADJUDICATION** |
| Topological | **No order exists** | **REQUIRES_ADJUDICATION** |
| Cross-unit (ratio vs. absolute) | Comparable only within a fixed context | Evaluate both in context; if still incomparable → **REQUIRES_ADJUDICATION** |

- **`REQUIRES_ADJUDICATION` behaviour:** the conflict is surfaced, **computation for the affected parameter halts**, and a **human-authored `AdjudicationRecord`** is required. The record is "a shared, versioned, approval-controlled asset under FR-GOV-001 — authored **once per conflicting rule pair**, **reused across all projects**, and **cited in every report that relies on it**."
- **`IRRECONCILABLE` behaviour:** no configuration exists that satisfies both. "The system reports infeasibility **naming both rules** — it does not pick one."
- **"The system never silently resolves a conflict it has no defined order for."** FR-RUL-002 AC3 restates: non-scalar conflicts "never silently resolved."

### 2.9 Circular dependencies — the occupant-load fixpoint (§11.7)
The circularity: applicable rules depend on occupant load → occupant load depends on the design → the design depends on the rules. **Resolution: a bounded, conservative, monotone fixpoint**, six steps verbatim:

1. **SEED conservatively.** "Occupant load seeded at the maximum the buildable envelope could physically support under the least restrictive plausible density. Conservative = over-estimates load = selects the more restrictive rule set. Erring toward more restriction is the safe direction."
2. **ITERATE.** "Compute rule set from current load → compute configuration → recompute load from the configuration."
3. **CONVERGENCE TEST.** "Converged when the **applicable rule set is identical across two consecutive iterations**. Note: on the **RULE SET, not on the load value** — rules switch at thresholds, so load can oscillate within a band while the rule set is stable."
4. **BOUND.** "**Maximum 5 iterations.**"
5. **NON-CONVERGENCE.** "If the rule set has not stabilized in 5 iterations, the system does **NOT** pick one. It emits **`NON_CONVERGENT_APPLICABILITY`**, **names the oscillating rules and the threshold they straddle**, and **requires the user to declare the occupancy basis (recorded `USER_SET`)**. Computation resumes from that declaration."
6. **RECORD.** "The **iteration history is part of the provenance graph**. The report states **how many iterations were required**."

Rationale for the conservative seed: "an optimistic seed can converge to a rule set that is **less restrictive than the true one — a silent under-constraint**. A conservative seed converging downward is safe at every step. Where the two directions disagree, the system reports the discrepancy rather than choosing."

---

## 3. §12 INVARIANT MODEL

### 3.1 Why the layer exists (§12.1)
The V1 worked example claimed a 21-storey tower with a 792 m² plate and 6,700 m² GFA (21 × 792 = 16,632); 172 units in 5,268 m² NSA against minimum unit areas of 65–155 m² = **30.6 m² per unit**; its own contradiction checker two pages later computed a maximum near **55–60 units** on the same plot. "Nothing caught any of it, because **constraint checking asks 'is this permitted?' and invariant checking asks 'does this arithmetic close?'** They are different questions. Only the second catches a configuration that is **impossible** rather than **impermissible**."

"These are **conservation laws, not constraints**. They are cheap, they are absolute, and they run on **every artifact the system produces — including documentation examples, test fixtures, and demo data**."

### 3.2 Invariant catalogue — 18 checks with tolerances (§12.2), verbatim
| ID | Invariant | Tolerance |
|---|---|---|
| INV-01 | Σ(level GFA) = total GFA | 0.1% |
| INV-02 | Σ(unit NSA) + core + circulation + services = level gross area | 0.5% |
| INV-03 | total GFA / plot area = reported FAR | 0.1% |
| INV-04 | Σ(unit counts by type) = reported unit count | exact |
| INV-05 | Σ(mix shares) = 1.000 | 0.001 |
| INV-06 | Reported unit count × weighted mean unit NSA = total NSA | 1% |
| INV-07 | Reported efficiency = NSA / GFA, **at the definition scope stated** | 0.1% |
| INV-08 | Podium footprint ≤ setback-permitted footprint | exact |
| INV-09 | Podium footprint ≤ coverage cap | exact |
| INV-10 | Tower plate ≤ podium footprint **AND** ≤ tower plate cap | exact |
| INV-11 | Σ(level heights) = reported total height ≤ height ceiling | 0.01 m |
| INV-12 | Parking bays × bay area factor ≤ available parking area | exact |
| INV-13 | Parking bays ≥ computed demand | exact |
| INV-14 | Level count × level height budget is integer-consistent | exact |
| INV-15 | Every area term used appears in the metric definitions annex | exact |
| INV-16 | Governing capacity = min(A, B, C) and is labelled as such | exact |
| INV-17 | Achieved FAR ≤ permitted FAR | exact |
| INV-18 | GFA composition matches the declared parking-in-FAR treatment | exact |

(Comparison operators were mangled to blanks by PDF extraction; directions above are reconstructed from Appendix A.7, which shows `1,920 ≤ 2,094.5` for INV-08, `1,060 ≤ 1,920, ≤ 1,280` for INV-10, `5,056 ≤ 5,299` for INV-12, `165 ≥ 158` for INV-13, `4.906 ≤ 5.0` for INV-17.)

### 3.3 Independence and enforcement (§12.3)
- **Separate module. No imports from the generator or capacity engine.** Enforced by an **import linter in CI** (Principle 4).
- **Owned by an engineer who does not own the capacity engine.**
- **Failure blocks emission. Never a warning, never a configurable severity.**
- **Runs against every worked example in every product document as a CI job** — including the PRD's own Appendix A.

Output shape (FR-INV-001): **`InvariantReport`: per-check pass/fail with computed vs. expected and residual.**

### 3.4 What invariants are not (§12.4)
"They do not establish compliance, correctness of rules, or fitness for purpose. **A configuration can pass every invariant and be entirely non-compliant — it is merely arithmetically coherent.** This distinction appears in the report (§16.5)."

### 3.5 Worked-example coverage gap
Appendix A.7 tabulates results for **INV-01…INV-13, INV-16, INV-17, INV-18 = 16 of 18**. **INV-14 (level-count integer consistency) and INV-15 (every area term in the annex) are absent from that table**, yet A.8 asserts "PASS -- all 18 invariants."

---

## 4. §13 PROVENANCE MODEL

### 4.1 Six provenance classes (§13.1)
| Class | Meaning | Rendering |
|---|---|---|
| `DERIVED` | Computed from a cited rule | Neutral, citation link |
| `ASSUMED` | System default filling a gap | **Amber, dotted underline, inline-editable** |
| `USER_SET` | Supplied or overridden by a named user | User badge |
| `OBSERVED` | From precedent distribution (Phase 2+) | Distribution sparkline with n |
| `TRADEOFF` | Optimizer choice among feasible alternatives (Phase 5) | Trade-off link showing what was given up |
| `VARIANCE` | Governed by a documented exemption | Red border, evidence link |

"**The amber `ASSUMED` treatment is the most important UI decision in the product.** The core failure mode is a user mistaking an assumption for a fact. Making assumptions visually loud, everywhere, permanently, is the mitigation. **This must survive design review; softening it for aesthetic reasons defeats the product.**"

### 4.2 Graph shape (§13.2) — verbatim
```
Value derivedFrom Computation uses Rule citedIn SourceClause
                   uses Input enteredBy User
                   uses Assumption justifiedBy Basis
                   uses PrecedentPattern(n) [Phase 2]
boundedBy Constraint sourcedFrom Rule | Standard | Target | Variance
sensitiveTo Assumption (with value/assumption)
```
Node types implied: `Value`, `Computation`, `Rule`, `SourceClause`, `Input`, `User`, `Assumption`, `Basis`, `PrecedentPattern(n)`, `Constraint`, `Standard`, `Target`, `Variance`. Edge types: `derivedFrom`, `uses`, `citedIn`, `enteredBy`, `justifiedBy`, `boundedBy`, `sourcedFrom`, `sensitiveTo`, plus `supersededBy` from §11.5(3). It is a **DAG per run** (FR-PRV-001 output: "Provenance DAG per run"). The occupant-load **iteration history is part of the graph** (§11.7 step 6).

### 4.3 Seven CI-asserted invariants on provenance (§13.3)
Quantifiers/operators were degraded in extraction; reconstructed with the intended logic marked:
```
∀ emitted value     : provenance_class ≠ null
∀ DERIVED value     : ∃ cited rule in derivation path
∀ ASSUMED value     : ∈ assumption register ∧ sensitivity computed
∀ OBSERVED value    : ∃ pattern in path ∧ pattern.n ≥ 8
∀ constraint        : ∄ PrecedentObservation in derivation path
∀ numeral in prose  : ∈ values(provenance subgraph)    [Phase 3+]
∀ life-safety rule  : ∄ variance
```
Corroborated by FR-PRV-001 ACs: AC1 "100% of emitted values have a non-null provenance class. CI-asserted; a null class fails the build"; AC2 "Every DERIVED value's path terminates in a cited rule"; AC3 "**Derivation tree renders in ≤ 300 ms**"; AC4 "No PrecedentObservation appears in any constraint's derivation path (Principle 1). CI-asserted from Phase 2." The `pattern.n ≥ 8` threshold matches §29 item 5 ("n≥8 + coverage + sharpness gates") and §17 minimum-n rules.

### 4.4 Immutable run reproducibility (§13.4)
V1's "100% run reproducibility over 24 months" is declared **impossible** — "the pipeline includes LLM calls from Phase 3, models are deprecated, and even at temperature 0 batching and hardware introduce non-determinism. The requirement conflated two different things."

| Term | Definition | Guarantee |
|---|---|---|
| **Immutable run reproducibility** | A run's stored outputs, inputs, versions, and provenance graph are retrievable unchanged, and the deterministic portion of the pipeline can be re-executed from persisted intermediate artifacts to produce **byte-identical** results | **100%, required** |
| **Pipeline re-execution** | Re-running the full pipeline including extraction from source documents | **Not guaranteed.** Produces a **new run with a new ID** |

**What is persisted to make this hold:** "post-extraction structured inputs, rule set version and **content hash**, metric definitions version, all assumption values, all user inputs, engine version, **RNG seed**, and the full provenance graph."

Customer-facing formulation: "we can always show you exactly what produced this number, and we can always recompute it identically from what we stored — we cannot promise that re-reading your PDF today gives the same extraction as it did last year."

Related governance (FR-GOV-001): shared-asset change → impact analysis → approval by asset owner → publication with a new version → notification; **impacted runs identified within 24 h**; **"Past runs are never mutated by an asset change."**

### 4.5 Assumption register mechanics (FR-ASM-001, feeds §13)
"Collect `ASSUMED` values; **perturb each by ±10% (or ±1 unit for integers); recompute; rank by effect on governing capacity**." Non-skippable before first export (AC1). Impact quantified, e.g. "**+3 m²/bay removes 1 floor: -1,060 m² GFA, -8 units**" (AC2). Every entry editable inline with immediate recompute (AC3). Amber everywhere the value appears, not only in the register (AC4).

---

## 5. §14 GEOMETRY MODEL

### 5.1 Phase 0 restriction (§14.1)
**Rectilinear and simple convex polygons only. Enforced at the data layer via `shape_class`, not by convention.** Complex and non-convex plots are **rejected with a message naming the restriction**. **Lifted in Phase 4.**

Why: "partitioning a non-convex polygon into rectangles under simultaneous area, frontage, depth, aspect-ratio, façade-access and corridor-adjacency constraints is a **research area, not a configuration option**. It is tractable on rectilinear footprints via **strip decomposition**."

### 5.2 Operations required in Phase 0 (§14.2) — eight, verbatim
```
Per-edge inward offset · polygon intersection · area (with independent recomputation by a
second method) · principal axis · minimum bounding rectangle · convexity ratio ·
point-in-polygon · polygon validity
```
FR-PLT-001 adds validation of **polygon simplicity, closure, non-self-intersection**, plus per-edge length and bearing and the stated-vs-computed area cross-check. FR-PLT-002 (envelope solver) processing: "Apply per-edge setback offsets → intersect → setback-permitted footprint. Apply coverage cap. **Podium footprint = min(setback-permitted, coverage cap).** Apply tower plate cap. Apply height ceiling and floor-to-floor to derive maximum level counts. **Recompute every area by an independent method and compare.**" AC3: "**Where two constraints bind within 1%, both are reported.**" AC4: "**Runs in < 2 s for ≤ 12 edges.**"

### 5.3 Numerical policy (§14.3) — four rules, verbatim
- **Exact predicates for orientation and intersection; never raw floating-point comparison**
- **Every area computed twice by independent methods; disagreement > 0.1% is a P0 defect, not a rounding note**
- **Snap tolerance declared explicitly, not implicit in the library**
- **Degenerate results (slivers, near-tangent offsets, self-intersections) raise rather than return**

"This is the class of bug that produces a plausible answer wrong by 4%, silently, for six months. **The double-computation policy is the cheapest insurance available.**"

### 5.4 Coordinate handling (§14.4)
**Local metric CRS (UTM 40N) for all computation. WGS84 stored for display only. No geometric operation in a geographic CRS.**

### 5.5 Deferred to Phase 4 (§14.5)
**Non-convex and irregular plots · unit packing on arbitrary polygons · 3D massing operations beyond extrusion · façade surface analysis.**

---

## 6. §15 CAPACITY MODEL

### 6.1 Five distinct capacity concepts (§15.1, Principle 6)
"**Never merged, never averaged, each with its own derivation and its own field.**" The source table is column-shifted; reconstructed by pairing labels with their questions/availability/provenance:

| # | Concept | Question | Available from | Provenance |
|---|---|---|---|---|
| **A** | **Regulatory capacity** | What does FAR and the area caps permit? | Phase 0 | `DERIVED` |
| **B** | **Geometric capacity** | What does the envelope physically hold under height and footprint limits? | Phase 0 | `DERIVED` |
| **C** | **Parking capacity** | What can the achievable parking supply support? | Phase 0 | `DERIVED` |
| **D** | **Commercially preferred capacity** | What does the developer's own objective profile select? | Phase 1 | `DERIVED` + profile version |
| **E** | **Historically observed capacity** | What have comparable plots actually achieved? | Phase 2, **gated** | `OBSERVED`, with n |

FR-CAP-001 restates A/B/C: "A — Regulation-limited: FAR ceiling and any explicit area caps. B — Geometry-limited: what the envelope physically holds under height and footprint limits, **ignoring FAR**. C — Parking-limited: the largest scheme the achievable parking supply supports." AC1: "**All three bands always shown. Showing only one is a P0 defect.**"

### 6.2 Governing capacity (§15.2)
**`governing = min(A, B, C)`, always named, always with its binding rule cited.** "**Headroom to the next-binding constraint is reported**, because that is what tells a developer where to push." Output object: `CapacityBands` with per-band derivation, binding constraint, and headroom to the next-binding constraint.

### 6.3 What is deliberately absent (§15.3)
"**There is no 'realistic,' 'expected,' or 'likely' band in Phase 0 or Phase 1. Absence is enforced by schema — the field does not exist.**" In its place: **`user_realism_discount`, defaulting to 1.00, class `USER_SET`, attributed to the user who entered it.**

Why: "the metrics that make a realism estimate credible — achieved-vs-permitted FAR, and efficiency — require **permitted FAR per plot** and **NSA per building**. Neither is available in public municipal permit data. Manufacturing the band from an unvalidated heuristic and labelling it 'realistic' is **the single most damaging thing this product could do**, because it is the number customers will act on and it is the one they cannot check."

FR-CAP-002 ACs: default 1.00, "the system never pre-fills a discount"; labelled `USER_SET` **with the user's name** wherever displayed; report states plainly it is a **user judgement, not a system estimate**.

### 6.4 Integer granularity (§15.4)
"Capacity is quantized by floors. When permitted GFA exceeds what an integer number of floors consumes, the remainder is reported as **`integer_granularity_loss`, not absorbed**." Worked example: **300 m² = 1.88% of permitted GFA**.

### 6.5 Parking capacity chain (FR-PRK-001, supplies band C)
"Apply per-type ratios → resident bays; apply visitor and accessible provisions; total bays. Bays × bay-area-factor → required area. Available area = Σ(level footprint × usable fraction). Derive supply in bays, headroom, and the maximum unit count supportable." Output `ParkingResult`: bays by category with citations, required area, supply, headroom, supportable unit ceiling. **AC2: "Bay area factor is explicit, editable, and stated in the report — it is a top-three sensitivity driver and must never be hidden."** AC4: "**No bay-level layout is produced. Output is a quantum, an area, and a level count.**" AC5: headroom reported in bays **and** percent.

### 6.6 Parking-in-FAR as a blocking gate (FR-DEF-002)
"This single question changes capacity by **15–35%** on a podium-parking tower." If confirmed and citable → a `Rule`, class `DERIVED`. If not → **`status OPEN_REGULATORY_QUESTION`**, and the user must declare a treatment at project setup, recorded `USER_SET`. **AC1: "The value is never `ASSUMED`… There is no default." AC2: while `OPEN_REGULATORY_QUESTION`, the project cannot compute capacity until the user declares. AC3: on the face page with its provenance class. AC4: one-click comparison shows capacity under both treatments.**

---

## 7. §16 VALIDATION MODEL

### 7.1 Three constraint categories (§16.1)
| Category | Definition | Behaviour |
|---|---|---|
| `HARD` | Must not be violated | Feasibility filter; **violating candidates are never emitted** |
| `SOFT` | Preferred; deviation scored | Optimized; deviation reported |
| `DEFERRED` | Applicable but not checkable at this fidelity | **Declared explicitly in every output** |

(Principle 5: "Hard constraints separated from soft preferences — Distinct types; hard constraints are feasibility filters, **never penalty terms**.")

### 7.2 Contradiction battery (§16.2, Phase 1) — six checks, **run before any computation**, verbatim
```
target_gfa           vs units × mix × min_unit_area / target_efficiency
target_unit_count    vs band_A_gfa / weighted_mean_unit_area
target_floors        vs height_ceiling / min_floor_to_floor
parking_implied_area vs available_levels × footprint × usable_fraction
target_sellable      vs target_gfa × max_plausible_efficiency
target_gfa           vs band_A_gfa
```
"**Each failure names the incompatible pair and quantifies the shortfall.**"

### 7.3 Independence (§16.3)
"Validator **shares no evaluation code with the generator**; separate module, separate owner, import-linted." FR-VAL-001 inputs: `Configuration`, `FilterSet`, `EvaluativeSet`, `PreferenceSet`; output `ValidationReport`; AC2: **every result cites its rule.**

### 7.4 The honest limit of independence (§16.4)
"**Implementation independence is not semantic independence.** The validator evaluates the same encoded constraint set the generator consumed. It **catches generator implementation bugs**. It **does not catch a mis-encoded rule, a missing rule, or a rule whose applicability predicate is wrong**."

"V1 stated a '0% hard-constraint violation' metric as though it meant compliance. **It means self-consistency.** This document says so wherever the metric appears." (Principle 7: no output, report, or marketing material may describe it as compliance.)

### 7.5 The five-way claim statement (§16.5) — verbatim, in every validation report, separately
```
SELF-CONSISTENCY        The configuration satisfies every constraint we
                        encoded, and its arithmetic closes.
                        Status: PASS / FAIL

RULE COVERAGE           We encoded N of M requirements identified as
                        applicable. K are deferred and listed below.
                        Status: N/M, coverage X%

GEOMETRIC VALIDITY      Geometry is topologically valid; areas independently
                        recomputed and agree.
                        Status: PASS / FAIL

REGULATORY VALIDITY     NOT ASSESSED. This system does not and cannot
                        determine whether an authority would approve this
                        scheme.

PROFESSIONAL AGREEMENT  Where measured against qualified architects on
                        comparable plots, this engine fell within the
                        inter-architect disagreement band in X of Y cases.
                        Status: <measured value or NOT YET MEASURED>
```
"**The fourth line is permanent and never changes.** The fifth is populated from the golden set (§23) and is the honest answer to 'is it accurate?'"

This is the §16.5 expansion of the §2.2 three-claim table: Self-consistency — "Yes, from Phase 0"; Rule coverage — "Partially; quantified and disclosed"; Professional agreement — "Measured, not asserted (§22)"; Regulatory validity — "**Never claimed. Not obtainable.**"

Worked instance (Appendix A.8; the source table is row-shifted, realigned here):
- SELF-CONSISTENCY: **PASS — all 18 invariants, all encoded constraints**
- RULE COVERAGE: **40 of 61 identified applicable requirements encoded. 21 deferred, listed in the report. Coverage 66%.**
- GEOMETRIC VALIDITY: **PASS — areas independently recomputed, max deviation 0.00%**
- REGULATORY VALIDITY: **NOT ASSESSED**
- PROFESSIONAL AGREEMENT: **Engine within the two-architect band on 8 of 10 golden plots; measured inter-architect variance on this community: <to be populated in Phase 0>**

### 7.6 Paired-metric rules (§22.4) bearing on validation claims
- Backtest coverage ≥80% **must be paired with** sharpness ≤20% — "Coverage alone is gamed by widening the band"
- Self-consistency PASS **must be paired with** rule coverage % — "Passing constraints you did not encode is meaningless"
- Extraction accuracy **must be paired with** queue-vs-drop rate

---

## 8. Cross-cutting enforcement an implementer must wire into CI

| Metric | Target | Note |
|---|---|---|
| M-INV | 100% | Emitted artifacts passing invariants |
| M-PRV | 100% | Emitted values with a provenance class **and complete derivation** |
| M-APP | 0 | Rules reaching production without a named approver |
| M-PRE | 0 | Precedent nodes in constraint derivation paths |
| M-DEF | 100% | Reports listing their deferred checks |
| M-RUN | 100% | Immutable-run reproducibility (§13.4 definition) |

"These are **integrity properties, not quality targets. Any failure is a release blocker.**"

Also required in CI: **import linter enforcing invariant-module and validator-module independence**; **every worked example in every product document passes the invariant layer**; **output linter rejecting report text that frames precedent as permissive** (§17.2, level 3); type-level prohibition of `PrecedentObservation` as a `Constraint` source (§17.2, level 1 — "Not a runtime check; a type error").

Report composition obligations (FR-OUT-001): face page carries **metric-definitions version, rule-set version, parking-in-FAR treatment and its provenance, engine version, reviewer, professional-use disclaimer**; every number footnoted to its provenance; body contains **assumption register, deferred-check list, invariant report, and the five-way claim statement**; **JSON round-trips — re-importing reproduces the identical report**.


## Key numbers
- Evaluator registry capped at 12 functions in Phase 0 (exceeding it triggers a design review, not a 13th function); the 12 are scalar_min, scalar_max, table_lookup_min, table_lookup_max, ratio_per_unit_type, percentage_of_base, polygon_offset_inward, count_minimum, range_bound, enum_permitted_set, conditional_scalar, custom_python
- 18 invariant checks (INV-01..INV-18). Tolerances: 0.1% (INV-01, 03, 07), 0.5% (INV-02), 1% (INV-06), 0.001 (INV-05), 0.01 m (INV-11), exact (INV-04, 08, 09, 10, 12, 13, 14, 15, 16, 17, 18)
- Occupant-load fixpoint: maximum 5 iterations; convergence tested on identity of the applicable RULE SET across two consecutive iterations, not on the load value; non-convergence emits NON_CONVERGENT_APPLICABILITY and requires a USER_SET occupancy declaration
- 9 mandatory Principle-9 rule fields asserted NOT NULL, but only 8 are ever enumerated (source, citation, effective date, jurisdiction, applicability, version, approval status, provenance)
- 3 tests per rule, mandatory kinds: POSITIVE, BOUNDARY, NEGATIVE
- 6 provenance classes: DERIVED, ASSUMED, USER_SET, OBSERVED, TRADEOFF, VARIANCE; 7 CI-asserted provenance invariants; OBSERVED requires pattern.n >= 8
- Provenance derivation tree must render in <= 300 ms; 100% of emitted values non-null provenance class (M-PRV)
- Geometry: 8 required Phase 0 operations; every area computed twice by independent methods, disagreement > 0.1% is a P0 defect; UTM 40N for all computation, WGS84 display only
- Buildable envelope solver: < 2 s for <= 12 edges; both constraints reported where two bind within 1%; full computation < 10 s (MVP)
- Plot: computed-vs-stated area deviation > 2% blocks; only RECTILINEAR and SIMPLE_CONVEX accepted in Phase 0, COMPLEX rejected
- 5 capacity concepts A-E, never merged or averaged; governing = min(A, B, C); user_realism_discount default 1.00, class USER_SET; no realistic/expected band exists (schema-enforced absence)
- Parking-in-FAR changes capacity by 15-35% on a podium-parking tower; never ASSUMED, only DERIVED or USER_SET, no default, blocking
- Contradiction battery: 6 checks, run before any computation (Phase 1)
- Five-way claim statement: SELF-CONSISTENCY, RULE COVERAGE, GEOMETRIC VALIDITY, REGULATORY VALIDITY (permanently NOT ASSESSED), PROFESSIONAL AGREEMENT
- Worked example (Appendix A): 40 of 61 applicable requirements encoded = 66% coverage, 21 deferred; integer_granularity_loss 300 m2 = 1.88% of permitted GFA; parking headroom 7 bays (4.4%); tower efficiency 72.64% vs whole-building efficiency 63.76% (8.9 pp gap)
- Assumption sensitivity: perturb each ASSUMED value by +/-10% (or +/-1 unit for integers), rank by effect on governing capacity
- MVP target ~40 rules as typed records; 6 absolute integrity metrics M-INV/M-PRV/M-APP/M-PRE/M-DEF/M-RUN at 100%/0
- Backtest coverage >= 80% must be paired with sharpness <= 20%; golden-set target 8 of 10 plots within the two-architect band
- Shared-asset change: impacted runs identified within 24 h; past runs never mutated
- DSL extraction deferred to ~rule 100

## Open items
- The 'nine Principle-9 fields' are never enumerated as nine anywhere in the PRD - both S2.4 and FR-RUL-001 AC1 list only eight (source, citation, effective date, jurisdiction, applicability, version, approval status, provenance). The ninth is most plausibly rule_class (FR-RUL-001 AC4 makes it mandatory) or is_life_safety/mechanization. A contractor must have the exact nine pinned before writing NOT NULL constraints and the CI assertion.
- Appendix A.7 tabulates only 16 of the 18 invariants - INV-14 (level count x level height budget integer-consistent) and INV-15 (every area term appears in the metric definitions annex) are missing - yet A.8 claims 'PASS -- all 18 invariants'. Either the appendix table is incomplete or those two checks are not actually implemented in the CI verification script.
- The PRD says 'three rule classes' (S11.3 heading, Principle-9 wording) but tabulates and requires four partitions (GENERATIVE, FILTERING, EVALUATIVE_ONLY, DEFERRED), with FR-RUL-003 AC1 demanding every rule land in exactly one of four. Whether DEFERRED is a rule_class enum value or an orthogonal flag is unspecified - S11.2's rule record only shows rule_class: 'GENERATIVE'.
- AdjudicationRecord is required by S11.6 and named as a governed shared asset in S29 item 15, but it has no schema anywhere in S10 or S11 - no field list, no ID convention, no versioning/expiry fields. Same for InvariantReport, ValidationReport, ApplicableRuleSet, CapacityBands and ParkingResult, which are named as outputs but never given field lists.
- PROVENANCE_NODE / PROVENANCE_EDGE are declared entities in S10.2 but have no field list; S13.2 gives only an informal edge-shape sketch. The node/edge type enumerations, the DAG persistence format, and how the occupant-load iteration history is represented in the graph all need specifying before build.
- The comparison operators in the S12.2 invariant catalogue and the quantifiers in the S13.3 provenance assertions were lost in PDF extraction (blanks where <=, >=, forall, exists, not-in should be). Directions are recoverable from Appendix A.7 but should be confirmed against the source PDF before coding.
- S15.1's capacity table is column-shifted in the extracted text; the concept-to-question-to-phase-to-provenance pairing above is a reconstruction. Confirm against the source PDF, particularly D (Commercially preferred, Phase 1, DERIVED + profile version) and E (Historically observed, Phase 2 gated, OBSERVED with n).
- The pattern.n >= 8 threshold for OBSERVED provenance appears in S13.3 and S29, but the 'coverage + sharpness gates' that also gate Phase 2 reintroduction of the observed band are specified in S5.4/S22.4, not in SS10-16. A contractor scoping only SS10-16 will miss that gate.
- S16.2's contradiction battery is marked Phase 1 while the rest of the validation model is Phase 0 - clarify whether the battery is in or out of the Phase 0 quote.
- S14.3 requires 'snap tolerance declared explicitly, not implicit in the library' but never states the value. Similarly 'exact predicates for orientation and intersection' names no library or implementation - this is a real cost driver (exact-predicate geometry vs. off-the-shelf Shapely) that a contractor must price.
- 'Every area computed twice by independent methods' - the second method is never named. Whether this means a second library, a shoelace-vs-triangulation pair, or an independent reimplementation materially changes effort.
- S11.5 rule 1 says a plot-specific instrument governs but 'cannot relax a life-safety parameter' - the behaviour when a plot-specific instrument DOES attempt to relax a life-safety parameter (error, ignore, adjudicate?) is undefined.
- Cross-unit conflicts resolve 'in a fixed context' - the context definition and the comparability test are not specified, so the boundary between automatic resolution and REQUIRES_ADJUDICATION is unimplementable as written.
- S11.7 step 1 seeds occupant load at 'the maximum the buildable envelope could physically support under the least restrictive plausible density' - 'least restrictive plausible density' has no numeric definition or source.
- MECHANIZED appears as a rule-record 'mechanization' value but the full enum (presumably including a DEFERRED/NON_MECHANIZABLE value) is never listed; S24.3 requires 'mechanization rate on the first 40 rules measured', implying at least two values.
- The two efficiency scopes (tower vs. whole-building) differ by 8.9 pp in the worked example; FR-DEF-001 must fix the scope vocabulary before INV-07 ('at the definition scope stated') is testable. The annex itself is a week-1, pre-code, human-signed deliverable and is the root dependency of every other item - it is not a software line item and must be scoped as such.
