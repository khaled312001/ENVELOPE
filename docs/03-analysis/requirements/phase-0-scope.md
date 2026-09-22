# Phase 0 scope, functional requirements, acceptance criteria and 8–12 week delivery plan (ENVELOPE PRD v2, §3, §9.1, §24, §32 + supporting sections)

> Source: ENVELOPE_PRD_v2 / Deck / client comms. Auto-extracted reference — verify against the original PDFs before quoting a threshold.

Source file: `E:\ENVELOPE\_client_material\extracted\ENVELOPE_PRD_v2.txt` (3,587 lines). Note: the extracted text has mangled glyphs — `→`, `≤`, `≥`, `≈`, `Σ`, `±`, `√`, `m²` render as `` or blanks — and several tables (§15.1, §22.1, §26, §28.1) have mis-aligned columns. Where I reconstruct a mapping I say so.

---

## 1. PHASE 0 — GOAL AND FRAMING (§3.1, §34)

**Goal (verbatim intent):** "Prove that a deterministic engine can take a real Dubai residential-tower plot and produce a buildable envelope and capacity calculation that falls within the disagreement band of two practising architects, in seconds, with every number traceable."

Critical framing: **the accuracy target is relative to human disagreement, not to a true value.** "If two qualified architects differ by 6% on the same plot and the engine lands between them, the engine is as good as the profession."

Phase 0 = "V0" release: **8–12 weeks**, ships to **1–2 design partners, free** (§2.3, §33). Full vision cumulative ~18–24 months across Phases 0–5.

CEO framing (§34): Phase 0 builds four assets, none of which is a calculation — (1) an executable model of Dubai development regulation (the moat), (2) a deterministic geometry engine that **constructs from rules, not merely checks against them**, (3) a provenance system (unretrofittable), (4) an invariant layer making it "structurally impossible to publish an impossible building." Comparison claim: today "what can I build here?" is a **2–6 week consultant exercise costing AED 50,000–250,000**; after Phase 0 it is **ten seconds** with every number linked to its clause.

---

## 2. PHASE 0 SCOPE — IN (§3.2, verbatim list)

- One Dubai community, one land-use type, **residential towers**
- Form-based plot input; **manual boundary drawing on a basemap**
- **Rectilinear and simple convex polygon plots only**
- **~40 mechanized rules as typed records**
- Buildable envelope: per-edge setbacks, height, FAR, coverage, tower plate cap
- Parking demand → parking area → level count → podium implication
- **Three capacity bands: regulation-limited, geometry-limited, parking-limited**
- User-entered realism discount (a `USER_SET` multiplier, "clearly not a system estimate")
- Assumption register with perturbation sensitivity
- Full provenance graph, click-through
- Invariant / conservation layer
- Independent validation module
- **JSON + PDF output**

## 3. PHASE 0 SCOPE — OUT (§3.2, verbatim)

"Out: LLM anything · optimization · multiple configurations · floor plans · precedent · similarity · jurisdiction overlays · DXF · realistic capacity band."

**Also explicitly removed from the Phase 0 architecture (§19.2)** — each with a stated reintroduction trigger:
| Removed | Why | Reintroduce when |
|---|---|---|
| Microservices | "Eight services for a team of four pre-PMF is a platform, not a product" | Team > 12, or independent scaling need |
| Temporal / durable workflow | Phase 0 runs are seconds, not minutes | Phase 5 |
| Redis | Nothing to cache at this latency | When a measured cache-hit benefit exists |
| pgvector | No embeddings until Phase 2 similarity | Phase 2, if vector search beats faceted scoring |
| Graph DB | Provenance is a bounded per-run DAG; Postgres recursive CTEs handle it | If cross-run graph queries become a product feature |
| Rule DSL + compiler | Premature abstraction before rule 100 | ~Rule 100 |
| NSGA-II / pymoo | No search until enumeration is proven insufficient | Phase 5, with evidence |
| CP-SAT / OR-Tools | No packing until Phase 4 | Phase 4 |
| Rhino / Grasshopper | Windows-licensed, stateful, hard to containerize; wrong in a SaaS critical path | Never in core path; optional interop only |
| DXF export | JSON + PDF suffice for Phase 0 | Phase 1 |

**Geometry deferred to Phase 4 (§14.5):** non-convex and irregular plots · unit packing on arbitrary polygons · 3D massing beyond extrusion · façade surface analysis.

**No AI/ML engineer, no LLM (§3.3, §32.1).** Four stated reasons: extraction is not the risky part; AI extraction has nothing to extract *into* until the rule model exists (Phase 3 depends on Phase 0's schema); a form takes **90 seconds** and for 10 plots manual entry costs less than debugging an extraction pipeline; it isolates the variable ("if Phase 0 fails, we need to know it failed on geometry and rules, not on OCR").

**No "realistic"/"expected"/"likely" band in Phase 0 or Phase 1 — absence enforced by schema; the field does not exist** (§15.3, FR-CAP-001 AC4).

---

## 4. PHASE 0 OUTPUT — WHAT A USER RECEIVES (§3.4, 9 items)

1. Buildable envelope (podium footprint, tower plate cap, height ceiling) **with the binding constraint named for each dimension**
2. Three capacity bands with derivations
3. Parking demand, area, level count, and headroom
4. Applicable rules with citations, plus **rules considered and excluded with reasons**
5. Assumption register, sensitivity-ranked
6. Invariant check results
7. Validation results, with the five-way claim distinction (§2.2)
8. **Deferred-check list — what was applicable but not assessed**
9. PDF report + JSON

---

## 5. PHASE 0 SUCCESS CRITERIA (§3.5) — verbatim IDs

| # | Criterion | Threshold |
|---|---|---|
| **P0-S1** | Inter-architect variance measured and published | Measured (any value) |
| **P0-S2** | Engine result within the two-architect band | **8 of 10 plots** |
| **P0-S3** | Every emitted value has a provenance class and complete derivation | **100%** |
| **P0-S4** | Invariant layer passes on all emitted configurations | **100%** |
| **P0-S5** | Runtime, full computation | **< 10 s** |
| **P0-S6** | Design-partner users open the provenance tree unprompted | **2 of 3 sessions** |
| **P0-S7** | Mechanization rate and authoring throughput measured | Measured and reported |
| **P0-S8** | Land-pack completeness rate measured | Measured and reported |

"P0-S1, S7 and S8 are measurement criteria, not performance criteria. Phase 0's most valuable output is not the software — it is four numbers that size the rest of the business (§26)."

---

## 6. FUNCTIONAL REQUIREMENTS — §9.1 PHASE 0 FOUNDATIONS (14 FRs, exhaustive)

FR format is: ID · Requirement · Rationale · Input · Processing · Output · Priority · Acceptance Criteria · Dependencies. Prefix legend (§9): DEF definitions · PLT plot & geometry · RUL rule model · CAP capacity · PRK parking · INV invariants · VAL validation · PRV provenance · ASM assumptions · OUT output · GOV governance (STD/RFP/CFG/OBJ/PRE/SIM/EXT/GEN/OPT are later phases).

### FR-DEF-001 — Area & Metric Definitions Annex — **P0, week 1, before any code**
Single versioned human-approved document defining every area and ratio term, cited by every report. Processing: Draft → architect review → design-partner review → sign-off → version. Output: `MetricDefinition` records + a **one-page annex referenced by ID in every report**.
- **AC1:** Defines at minimum **10 terms**: GFA, BUA, NSA, Sellable Area, Gross Efficiency, Tower Efficiency, Parking Area, Bay Area Factor, FAR, Plot Coverage.
- **AC2:** Each definition states explicit **inclusions and exclusions** (balconies, terraces, plant, cores, circulation, parking, basements).
- **AC3:** Records whether parking counts toward FAR, or marks it `OPEN REGULATORY QUESTION`.
- **AC4:** Versioned; every report cites the version used.
- **AC5:** **No code merges that computes an area term absent from the annex.**
- Dependencies: **None. Everything else depends on it.**

### FR-DEF-002 — Parking-in-FAR Determination — **P0**
System must explicitly represent whether parking counts toward FAR/GFA and **must not assume an answer**. Rationale: "changes capacity by **15–35%** on a podium-parking tower… the highest-magnitude quiet error the system can make." Processing: authoritative citable answer → a Rule, class `DERIVED`; else status `OPEN_REGULATORY_QUESTION` and the user must declare a treatment at project setup, recorded `USER_SET`. Output: `parking_counts_toward_far` with provenance class; **both scenarios computable on demand**.
- **AC1:** Value is **never `ASSUMED`**. It is `DERIVED` (cited) or `USER_SET` (declared). **There is no default.**
- **AC2:** While `OPEN_REGULATORY_QUESTION`, the project **cannot compute capacity** until the user declares a treatment.
- **AC3:** Report states the treatment applied, **on the face page**, with its provenance class.
- **AC4:** **One-click comparison** shows capacity under both treatments.
- Dependencies: FR-DEF-001.

### FR-PLT-001 — Plot Input & Boundary — **P0**
Form entry + manual polygon drawing. Processing: validate polygon simplicity, closure, non-self-intersection; compute area, principal axes, minimum bounding rectangle, convexity ratio, per-edge length and bearing; user classifies each edge (`ROAD` with hierarchy / `ADJACENT_PLOT` / `OPEN_SPACE` / `OTHER`); cross-check computed vs. stated area. Output: `Plot` + `PlotEdge[]` with geometry provenance `USER_SET`.
- **AC1:** Only rectilinear and simple convex polygons accepted; others rejected with a clear message naming the restriction.
- **AC2:** Computed vs. stated area deviation **> 2% blocks** until resolved.
- **AC3:** Edge classification **mandatory for every edge; no default**.
- **AC4:** A trained user completes plot entry in **≤ 3 minutes, measured**.
- Dependencies: FR-DEF-001.
- *Design note:* edge classification deliberately **not automated** — automatic road-edge detection needs a road-hierarchy GIS layer joined to cadastral edges whose availability/join quality is unverified (§30). "Making the user classify four edges is a **20-second cost** that removes an unproven dependency from the critical path."

### FR-RUL-001 — Typed Rule Records & Evaluator Registry — **P0**
Rules stored as typed data records evaluated by a small registry of named functions. **No DSL, no compiler in Phase 0.** Processing: Author record → bind to parameter vocabulary → attach citation → author 3 tests → review → approve → publish with validity window.
- **AC1:** Every rule carries source, citation, effective date, jurisdiction, applicability, version, approval status, provenance — **all non-null** (Principle 9).
- **AC2:** `approved_by` non-null and a qualified human. **The evaluator refuses to load unapproved records. No bypass flag exists.**
- **AC3:** Every rule has **3 passing tests including one boundary and one negative case**.
- **AC4:** Every rule declares its class: `GENERATIVE` / `FILTERING` / `EVALUATIVE_ONLY`.
- **AC5:** **Bitemporal** — the rule set as of any past date is reconstructible.
- **AC6:** **Evaluator registry has ≤ 12 functions at Phase 0.** Exceeding is a signal the abstraction is wrong; review before adding.
- Dependencies: FR-DEF-001.

### FR-RUL-002 — Applicability & Rule Set Materialization — **P0**
Select applicable rules and freeze as an immutable set bound to the run. Output: `ApplicableRuleSet` with per-rule inclusion reason and **near-miss exclusion reasons**.
- **AC1:** Immutable once bound; re-running after a rule-base change creates a **new run**.
- **AC2:** User can see why each rule was included and why notable rules were excluded.
- **AC3:** Non-scalar conflicts handled per §11.6 and **never silently resolved**.
- Dependencies: FR-RUL-001.

### FR-RUL-003 — Rule Class Compilation — **P0**
Partition applicable rules into **four** operational forms: `GENERATIVE` (construct geometry/bounds directly), `FILTERING` (prune during construction), `EVALUATIVE_ONLY` (assess after construction; may only reject), `DEFERRED` (applicable, not mechanizable at this fidelity). Outputs: `GenerativeSet`, `FilterSet`, `EvaluativeSet`, `DeferredCheckList`.
- **AC1:** Every applicable rule lands in **exactly one** partition. **Unassigned rules fail the build.**
- **AC2:** `DeferredCheckList` appears in **every output, in the body**.
- **AC3:** `EVALUATIVE_ONLY` rules can only reject a candidate, never modify one.
- Dependencies: FR-RUL-002.
- (Rationale: V1 required every rule to be "constructive," impossible for topological rules — "there is no constructive inverse of a travel-distance limit.")

### FR-PLT-002 — Buildable Envelope Solver — **P0** ("The atomic unit of value")
Processing: per-edge setback offsets → intersect → setback-permitted footprint; apply coverage cap; **podium footprint = min(setback-permitted, coverage cap)**; apply tower plate cap; apply height ceiling and floor-to-floor to derive maximum level counts; **recompute every area by an independent method and compare**. Output: `BuildableEnvelope` (setback-permitted footprint, coverage cap area, podium footprint, tower plate cap, height ceiling, max level counts) — each with binding constraint and rule citation.
- **AC1:** Geometry valid, simple, closed; independent area recomputation agrees to **≤ 0.1%**.
- **AC2:** Every dimension names its binding constraint and cites its rule.
- **AC3:** Where two constraints bind **within 1%, both are reported**.
- **AC4:** Runs in **< 2 s for ≤ 12 edges**.
- **AC5:** Golden set: engine result within the two-architect band on **≥ 8 of 10 plots**.
- Dependencies: FR-PLT-001, FR-RUL-003.

### FR-PRK-001 — Parking Demand, Area and Level Implication — **P0**
Processing: per-type ratios → resident bays; visitor and accessible provisions; total bays. **Bays × bay-area-factor → required area.** Available area = (level footprint × usable fraction). Derive supply in bays, headroom, and maximum supportable unit count. Output: `ParkingResult` (bays by category with citations, required area, supply, headroom, supportable unit ceiling).
- **AC1:** Bay counts derive from cited rules, per category.
- **AC2:** **Bay area factor is explicit, editable, and stated in the report — a top-three sensitivity driver, must never be hidden.**
- **AC3:** Feeds capacity band C before any ranking or recommendation.
- **AC4:** **No bay-level layout is produced.** Output is a quantum, an area, and a level count.
- **AC5:** Headroom reported in **bays and percent**.
- Dependencies: FR-PLT-002, FR-RUL-003.
- Rationale: "Computing GFA first and parking second produces schemes that collapse on contact with reality."

### FR-CAP-001 — Capacity Bands A / B / C — **P0**
A = Regulation-limited (FAR ceiling + explicit area caps); B = Geometry-limited (what the envelope physically holds under height/footprint limits, **ignoring FAR**); C = Parking-limited (largest scheme achievable parking supply supports). **Report the minimum as governing, and name it.** Output: `CapacityBands` with per-band derivation, binding constraint, and headroom to next-binding constraint.
- **AC1:** **All three bands always shown. Showing only one is a P0 defect.**
- **AC2:** The governing band is named explicitly.
- **AC3:** **Integer-granularity losses reported, not absorbed** (e.g. unused FAR because another floor does not fit).
- **AC4:** No "realistic"/"expected" band exists in Phase 0; **absence enforced by schema**.
- Dependencies: FR-PLT-002, FR-PRK-001, FR-DEF-001.

### FR-CAP-002 — User-Entered Realism Discount — **P1** (the only non-P0 in §9.1)
- **AC1:** **Default is 1.00.** The system never pre-fills a discount.
- **AC2:** Labelled `USER_SET` **with the user's name** wherever displayed.
- **AC3:** Report states plainly this is a user judgement, not a system estimate.
- Dependencies: FR-CAP-001.

### FR-INV-001 — Invariant / Conservation Layer — **P0**
Independent layer asserting algebraic identities on every emitted configuration **before emission**. Rationale: "V1's own worked example failed by factors of ~3 because nothing checked that areas summed." Output: `InvariantReport` (per-check pass/fail with computed vs. expected and residual).
- **AC1:** Runs on **every emitted artifact including test fixtures, worked examples, and documentation samples**.
- **AC2:** **A failure blocks emission. It is never a warning.**
- **AC3:** Module with **no imports from the generator or capacity engine**, enforced by an **import linter in CI**.
- **AC4:** **Owned by an engineer who does not own the capacity engine.**
- **AC5:** Every example in every product document passes it, verified in CI.
- Dependencies: FR-DEF-001.

### FR-VAL-001 — Independent Validation — **P0**
Validate configurations against hard constraints, soft preferences and evaluative-only rules, in a module independent of generation. Inputs: Configuration, `FilterSet`, `EvaluativeSet`, `PreferenceSet`. Output: `ValidationReport`.
- **AC1:** **No shared evaluation code with the generator; separate module, separate owner.**
- **AC2:** Every result cites its rule.
- **AC3:** Report states explicitly that agreement between validator and generator is **self-consistency, not compliance** (Principle 7).
- **AC4:** **The five-way claim distinction (§16.5) appears verbatim.**
- Dependencies: FR-RUL-003, FR-INV-001.

### FR-PRV-001 — Provenance Graph — **P0**
Every emitted value carries a provenance class and a complete derivation path. Output: **Provenance DAG per run**.
- **AC1:** **100% of emitted values have a non-null provenance class. CI-asserted; a null class fails the build.**
- **AC2:** Every `DERIVED` value's path terminates in a cited rule.
- **AC3:** **Derivation tree renders in ≤ 300 ms.**
- **AC4:** No `PrecedentObservation` in any constraint's derivation path (Principle 1). CI-asserted from Phase 2.
- Dependencies: All Phase 0 engines.

### FR-ASM-001 — Assumption Register with Sensitivity — **P0**
Processing: collect `ASSUMED` values; **perturb each by ±10% (or ±1 unit for integers); recompute; rank by effect on governing capacity**.
- **AC1:** **Non-skippable before first export.**
- **AC2:** Impact quantified — worked example given verbatim: **"+3 m²/bay removes 1 floor: −1,060 m² GFA, −8 units."**
- **AC3:** Every entry **editable inline with immediate recompute**.
- **AC4:** Rendered in a **visually distinct state (amber) everywhere the value appears**, not only in the register.
- Dependencies: FR-PRV-001.

### FR-OUT-001 — Report and JSON Export — **P0**
- **AC1:** **Face page carries:** metric-definitions version, rule-set version, parking-in-FAR treatment and its provenance, engine version, reviewer, professional-use disclaimer.
- **AC2:** Every number footnoted to its provenance.
- **AC3:** Body contains assumption register, deferred-check list, invariant report, five-way claim statement.
- **AC4:** **JSON round-trips: re-importing reproduces the identical report.**
- Dependencies: All Phase 0.

### Governance FR that is P0 across all phases — FR-GOV-001 — Shared Asset Versioning and Approval (§9.6)
Rationale: "Changing a default bay-area factor **from 32 to 30** silently changes every customer's capacity."
- **AC1:** Covers rules, default assumptions, area definitions, typologies, objective normalizations, and deferred/non-mechanizable classifications.
- **AC2:** No shared asset changes without a named approver.
- **AC3:** **Impacted runs identified within 24 h** and owners notified.
- **AC4:** **Past runs are never mutated** by an asset change.
(FR-GOV-002 is P0-but-Phase-1; FR-GOV-003 Variance Handling is P1/Phase 1 — both out of Phase 0 build scope.)

---

## 7. MVP ACCEPTANCE CRITERIA — §24 (every checkbox, verbatim)

"MVP" = **Phase 0 complete and shipped to design partners.**

### 24.1 Functional (17 boxes)
- [ ] Metric definitions annex signed, versioned, cited in every report
- [ ] Parking-in-FAR treatment declared per project; no default; blocking
- [ ] Plot entry with boundary draw and mandatory edge classification, **≤3 min**
- [ ] **~40 rules as typed records, all nine Principle-9 fields non-null, all approved by a named human**
- [ ] Every rule classified generative / filtering / evaluative-only / deferred
- [ ] Buildable envelope with binding constraint named per dimension
- [ ] Parking demand → area → levels → headroom, with cited ratios
- [ ] Capacity bands A, B, C with derivations; governing band named
- [ ] Integer granularity loss reported
- [ ] User realism discount, default 1.00, `USER_SET`
- [ ] Assumption register, sensitivity-ranked, inline-editable, non-skippable
- [ ] **Invariant layer: 18 checks, independent module, blocks emission**
- [ ] Independent validation with the five-way claim statement
- [ ] Provenance graph, click-through from any number
- [ ] Deferred-check list in every output
- [ ] PDF + JSON export; JSON round-trips
- [ ] Immutable-run reproducibility per §13.4

### 24.2 Quality (5 boxes)
- [ ] **M-INV, M-PRV, M-APP, M-DEF, M-RUN all at 100% / 0**
- [ ] Independent area recomputation agrees **≤0.1%** on all golden plots
- [ ] Engine within the two-architect band on **8 of 10** golden plots
- [ ] Full computation **< 10 s**
- [ ] Every worked example in every product document passes the invariant layer in CI

### 24.3 Measurement deliverables — "equal weight to the software" (5 boxes)
- [ ] Inter-architect variance measured and published
- [ ] Mechanization rate on the first 40 rules measured
- [ ] Rule authoring throughput measured, **by complexity class**
- [ ] Land-pack completeness rate measured (**of 10, how many carried FAR/height/setbacks**)
- [ ] Provenance-tree engagement observed in **3 user sessions**

### 24.4 Governance (4 boxes)
- [ ] Every shared asset versioned with a named approver
- [ ] Import linter enforcing invariant and validator module independence, in CI
- [ ] **Professional-use disclaimer reviewed by UAE counsel**
- [ ] **No marketing material claiming compliance verification, guarantee, or assurance**

### The absolute metrics referenced by 24.2 (§22.3)
| ID | Metric | Target |
|---|---|---|
| **M-INV** | Emitted artifacts passing invariants | 100% |
| **M-PRV** | Emitted values with a provenance class and complete derivation | 100% |
| **M-APP** | Rules reaching production without a named approver | **0** |
| **M-PRE** | Precedent nodes in constraint derivation paths | 0 (Phase 2+) |
| **M-DEF** | Reports listing their deferred checks | 100% |
| **M-RUN** | Immutable-run reproducibility (§13.4 definition) | 100% |
"These are integrity properties, not quality targets. **Any failure is a release blocker.**"

Paired-metric rules (§22.4): Backtest coverage 80% must be paired with sharpness ≤20%; Self-consistency PASS must be paired with rule coverage %; Extraction accuracy with queue-vs-drop rate.

---

## 8. THE 18 INVARIANTS (§12.2) — the "18 checks" in §24.1

| ID | Invariant | Tolerance |
|---|---|---|
| INV-01 | Σ(level GFA) = total GFA | 0.1% |
| INV-02 | Σ(unit NSA) + core + circulation + services = level gross area | 0.5% |
| INV-03 | total GFA / plot area = reported FAR | 0.1% |
| INV-04 | Σ(unit counts by type) = reported unit count | exact |
| INV-05 | Σ(mix shares) = 1.000 | 0.001 |
| INV-06 | Reported unit count × weighted mean unit NSA = total NSA | 1% |
| INV-07 | Reported efficiency = NSA / GFA, at the definition scope stated | 0.1% |
| INV-08 | Podium footprint ≤ setback-permitted footprint | exact |
| INV-09 | Podium footprint ≤ coverage cap | exact |
| INV-10 | Tower plate ≤ podium footprint AND ≤ tower plate cap | exact |
| INV-11 | Σ(level heights) = reported total height ≤ height ceiling | 0.01 m |
| INV-12 | Parking bays × bay area factor ≤ available parking area | exact |
| INV-13 | Parking bays ≥ computed demand | exact |
| INV-14 | Level count × level height budget is integer-consistent | exact |
| INV-15 | Every area term used appears in the metric definitions annex | exact |
| INV-16 | Governing capacity = min(A, B, C) and is labelled as such | exact |
| INV-17 | Achieved FAR ≤ permitted FAR | exact |
| INV-18 | GFA composition matches the declared parking-in-FAR treatment | exact |

Enforcement (§12.3): separate module, no imports from generator/capacity engine, import-linted in CI; **owned by an engineer who does not own the capacity engine**; failure blocks emission — "never a warning, never a configurable severity"; runs against every worked example in every product document as a CI job. §12.4: invariants do **not** establish compliance — "a configuration can pass every invariant and be entirely non-compliant."

Origin of the layer: V1's worked example claimed a 21-storey tower with a **792 m² plate and 6,700 m² GFA (21 × 792 = 16,632)**, and **172 units in 5,268 m² NSA against minimum unit areas of 65–155 m² — 30.6 m²/unit**, while its own contradiction checker computed a max near **55–60 units**.

---

## 9. THE FIVE-WAY CLAIM STATEMENT (§16.5) — must appear verbatim in every validation report
1. **SELF-CONSISTENCY** — "The configuration satisfies every constraint we encoded, and its arithmetic closes." Status: PASS / FAIL
2. **RULE COVERAGE** — "We encoded N of M requirements identified as applicable. K are deferred and listed below." Status: N/M, coverage X%
3. **GEOMETRIC VALIDITY** — "Geometry is topologically valid; areas independently recomputed and agree." Status: PASS / FAIL
4. **REGULATORY VALIDITY** — "NOT ASSESSED. This system does not and cannot determine whether an authority would approve this scheme." — **"The fourth line is permanent and never changes."**
5. **PROFESSIONAL AGREEMENT** — "Where measured against qualified architects on comparable plots, this engine fell within the inter-architect disagreement band in X of Y cases." Status: <measured value or NOT YET MEASURED> — populated from the golden set.

---

## 10. §32 IMPLEMENTATION PLAN — TEAM (§32.1)

**Four people, all 1.0 FTE:**
| Role | FTE | Notes |
|---|---|---|
| **Regulatory Architect** (licensed, Dubai practice) | 1.0 | Owns the rule base and the definitions annex. "**The single most important hire.** Full team member with **veto over rule publication**, not an advisor." |
| **Senior Backend / Geometry Engineer** | 1.0 | Geometry kernel, capacity engine, provenance |
| **Full-stack Engineer** | 1.0 | API, frontend, report generation. **Owns the invariant and validation modules — different owner from the capacity engine** (Principle 4) |
| **Product / Tech Lead** | 1.0 | Scope discipline, data wrangling, design-partner relationship, measurement |

- **No AI/ML engineer. There is no LLM in Phase 0.**
- **Contracted: 3 architects for the variance measurement and golden set (~10 days total).**
- Related risk R-13: "Regulatory architect hiring is the schedule's binding constraint" — mitigation: "Recruit before engineering ramp; **founding-team role, not a hire**."

---

## 11. §32.2 WEEK-BY-WEEK SCHEDULE (12 weeks)

| Week | Work | Deliverable |
|---|---|---|
| **1** | Metric definitions annex drafted and signed. Parameter vocabulary for ~40 rules. **Inter-architect variance measurement: 3 plots, 3 architects.** Secure 10 land packs. **Q1 (parking-in-FAR) research begins.** | Signed annex; variance figure; land-pack completeness count |
| **2** | Rule record schema, **evaluator registry (12)**, bitemporal store, test harness, approval workflow. Architect begins authoring. **Repo skeleton with import linter.** | Rule model + **first 10 rules** |
| **3** | Geometry kernel: per-edge offsets, intersection, area with independent recomputation, validity, exact predicates. **Invariant module built alongside, by the other engineer.** | Kernel + invariant catalogue |
| **4** | Envelope solver: setbacks → footprint → coverage → plate cap → height. Binding-constraint attribution. **Rules 10–25.** | Envelope solver |
| **5** | Parking model: demand → area → levels → headroom → supportable unit ceiling. **Rules 25–40.** | Parking model; **40 rules complete** |
| **6** | Capacity bands A/B/C. Governing band. Integer granularity. User realism discount. **Independent validation module.** | Capacity engine |
| **7** | Provenance graph emitted at every boundary. Class assignment. Derivation query. | Provenance |
| **8** | Assumption register with perturbation sensitivity. Five-way claim statement. Deferred-check list. | Assumption + claims |
| **9** | Frontend: plot form, boundary draw, edge classification, results, click-through provenance tree, assumption register. | UI |
| **10** | PDF report + JSON export + round-trip test. **CI: invariant checks on all documentation examples.** | Outputs |
| **11** | **Golden-set validation: 10 plots vs. 2 architects each.** Diagnose and fix. | Accuracy measurement |
| **12** | **3 design-partner sessions with observation.** Write up the four measurement deliverables. | Findings report |

**Buffer:** weeks 11–12 absorb slip. "**If rule authoring is slower than assumed (A4), cut to 30 rules rather than extending the schedule** — the measurement matters more than the count."

### §32.3 Critical path
Metric definitions (wk 1) → Parameter vocabulary → Rule model (wk 2) → Rule authoring (wk 2–5) → Capacity engine (wk 6); in parallel Geometry kernel (wk 3) → Envelope solver (wk 4); Invariant module (wk 3) → Validation (wk 6); → Provenance (wk 7) → Assumption register (wk 8) → UI (wk 9) → Report + JSON (wk 10) → Golden set (wk 11).

"The metric definitions annex is the root. **Nothing computes an area term until it is signed.** This is a **one-week, four-person-hour document that gates the entire project** — and skipping it is precisely how V1's example ended up **wrong by 3×**."

### §32.4 What Phase 0 delivers beyond software — the four numbers
1. **Inter-architect variance** — sets the accuracy target and the marketing claim
2. **Mechanization rate** — sizes the rule base and the honest coverage claim
3. **Rule authoring throughput by complexity class** — sizes the largest cost in the company
4. **Land-pack completeness rate** — tests the input model

"**A Phase 0 that ships perfect software and measures none of these has failed.**"

---

## 12. PHASE 0 ARCHITECTURE (§19.1) AND STACK (§19.4)

Single **React + TypeScript SPA** (plot form · boundary draw · results · provenance tree · assumption register) → **REST** → **ONE Python FastAPI monolith** with modules: `api/` (thin handlers), `definitions/` (metric definitions annex), `rules/` (typed records + evaluator registry), `geometry/` (Shapely; exact predicates; independent area recomputation), `capacity/` (envelope → parking → bands), `invariants/` (**NO IMPORTS FROM `capacity/` or `generation/` — import-linted**), `validation/` (separate module, separate owner), `provenance/` (emission at every boundary), `report/` (HTML → PDF; JSON). **Runs execute synchronously (<10 s).** Storage: **PostgreSQL + PostGIS · S3 (versioned)**.

**Phase 0 stack:** Python 3.12, FastAPI, Shapely/GEOS, pyproj, PostgreSQL 16 + PostGIS, S3, React/TS, **WeasyPrint**, pytest.

**Retained from V1 because retrofitting is a rewrite (§19.3):** bitemporal rule storage · immutable runs · provenance emitted at every layer boundary · validator as a separate module with a different owner · exact geometric predicates with independent area recomputation · invariant layer.

---

## 13. SUPPORTING MODELS THE PHASE 0 BUILD MUST IMPLEMENT

**Geometry (§14):** rectilinear + simple convex only, enforced at the data layer via `shape_class`, not convention. Operations required in Phase 0: per-edge inward offset · polygon intersection · area (with independent recomputation by a second method) · principal axis · minimum bounding rectangle · convexity ratio · point-in-polygon · polygon validity. Numerical policy: exact predicates for orientation/intersection, never raw float comparison; **every area computed twice, disagreement > 0.1% is a P0 defect, not a rounding note**; snap tolerance declared explicitly; degenerate results (slivers, near-tangent offsets, self-intersections) **raise rather than return**. Coordinates: **local metric CRS (UTM 40N)** for all computation; **WGS84 stored for display only; no geometric operation in a geographic CRS**.

**Capacity (§15):** five distinct capacity concepts never merged/averaged — A regulatory, B geometric, C parking (all Phase 0, all `DERIVED`), D commercially preferred (Phase 1, `DERIVED` + profile version), E historically observed (Phase 2, gated, `OBSERVED` with n). `governing = min(A, B, C)`, always named, always with binding rule cited; headroom to next-binding constraint reported. Integer granularity: remainder reported as `integer_granularity_loss` — worked example **300 m² (1.88% of permitted GFA)**.

**Rule model (§11):** typed records, evaluator registry **capped at 12** — the named 12 are: `scalar_min`, `scalar_max`, `table_lookup_min`, `table_lookup_max`, `ratio_per_unit_type`, `percentage_of_base`, `polygon_offset_inward`, `count_minimum`, `range_bound`, `enum_permitted_set`, `conditional_scalar`, `custom_python`. Rule record fields include `rule_id`, `parameter_id`, `rule_class`, `evaluator`, `evaluator_args`, `unit`, `applicability`, `citation` (instrument_id, instrument_version, clause_reference, document_uri, source_page, source_bbox, **source_text_verbatim**), `jurisdiction`, `is_life_safety`, `mechanization`, `valid_from`/`valid_to`, `recorded_at`, `version`, `supersedes`, `status`, `authored_by`, `approved_by`, `approved_at`, `tests[]` (POSITIVE / BOUNDARY / NEGATIVE). "`status != APPROVED` is not loadable by the evaluator."

**Overlap resolution (§11.5):** (1) a plot-specific instrument governs — **exception: it cannot relax a life-safety parameter**; (2) otherwise, across authorities, **most restrictive governs**; (3) every non-governing candidate recorded as a `supersededBy` edge, visible to the user. "Most restrictive" = for MIN operators the maximum value, for MAX operators the minimum.

**Non-scalar conflicts (§11.6):** scalar MIN/MAX → automatic; bounded range → intersection, empty → `IRRECONCILABLE`; count → max; enumerated set → intersection, empty → `IRRECONCILABLE`; enumerated single value, topological, cross-unit → `REQUIRES_ADJUDICATION` (computation for that parameter **halts**; a human-authored, versioned, approval-controlled `AdjudicationRecord` is required, authored once per conflicting rule pair, reused across projects, cited in every report). `IRRECONCILABLE` → report infeasibility naming both rules; "**the system never silently resolves a conflict it has no defined order for**."

**Occupant-load fixpoint (§11.7):** conservative seed (over-estimates load → selects more restrictive rules) → iterate → convergence tested **on the rule set, not the load value** → **bounded at max 5 iterations** → non-convergence emits `NON_CONVERGENT_APPLICABILITY`, names the oscillating rules and the straddled threshold, requires the user to declare the occupancy basis (`USER_SET`) → iteration history is part of the provenance graph and the report states how many iterations were required.

**Provenance classes (§13.1):** `DERIVED` (neutral, citation link) · `ASSUMED` (**amber, dotted underline, inline-editable**) · `USER_SET` (user badge) · `OBSERVED` (Phase 2+, distribution sparkline with n) · `TRADEOFF` (Phase 5) · `VARIANCE` (red border, evidence link). "The amber `ASSUMED` treatment is the most important UI decision in the product… **This must survive design review; softening it for aesthetic reasons defeats the product**."

**CI-asserted provenance invariants (§13.3):** every emitted value has non-null class; every DERIVED has a cited rule in path; every ASSUMED is in the register with sensitivity computed; every OBSERVED has pattern in path with **n ≥ 8**; **no constraint has a PrecedentObservation in its derivation path**; no numeral in prose outside the provenance subgraph (Phase 3+); **no life-safety rule may have a variance**.

**Immutable run reproducibility (§13.4) — the M-RUN definition:** "A run's stored outputs, inputs, versions, and provenance graph are retrievable unchanged, and the deterministic portion of the pipeline can be re-executed from persisted intermediate artifacts to produce **byte-identical** results." Guarantee 100%, required. Full-pipeline re-execution including extraction from source documents is **not guaranteed** and produces a new run with a new ID. Persisted: post-extraction structured inputs, rule set version and content hash, metric definitions version, all assumption values, all user inputs, engine version, **RNG seed**, full provenance graph.

**Data model entities to build (§10.2):** `METRIC_DEFINITION`, `PARAMETER` (e.g. `setback.front`, `parking.ratio.2bed`; `is_life_safety`, `rule_class_default`), `PLOT` (incl. `stated_area`, `computed_area`, `area_mismatch_flag`, `shape_class` RECTILINEAR|SIMPLE_CONVEX|COMPLEX with COMPLEX rejected, derived principal_axis/mbr/convexity_ratio/frontage_count), `PLOT_EDGE` (classification, road_hierarchy, length_m, bearing_deg, applied_setback_value, applied_setback_rule_id), `RULE`, `CONSTRAINT_SET` (generative[]/filtering[]/evaluative[]/deferred[]/preferences[]; type invariant: no PrecedentObservation in any derivation path), `BUILDABLE_ENVELOPE`, `CAPACITY_RESULT` (`regulation_limited_gfa`, `geometry_limited_gfa`, `parking_limited_gfa`, `governing_band`, `governing_constraint_rule_id`, `commercially_preferred_gfa` nullable Phase 1, `historically_observed_gfa` nullable Phase 2, `user_realism_discount` default 1.00, `integer_granularity_loss_m2`), `VARIANCE`, `RUN`, `PROVENANCE_NODE/EDGE`, `INVARIANT_REPORT`.

---

## 14. UX FLOW AND GATES

**§20.1 Phase 0 flow, 9 steps** (note: the extracted labels and descriptions are offset by one row in the source — labels read PLOT / PARAMETERS / RULES / ASSUMPTIONS / CAPACITY / PARKING / CHECKS / EVIDENCE / EXPORT while the descriptions read: form + boundary draw + edge classification; FAR, height, coverage, plate cap; + parking-in-FAR declaration (blocking, no default); applicable set, citations, inclusions/exclusions [ack gate]; register, sensitivity-ranked, editable [ack gate]; bands A/B/C, governing band, binding constraints; demand, area, levels, headroom; invariants → validation → five-way claim statement; provenance tree, click-through, PDF + JSON [reviewer gate]).
**"Steps 1–4 are sequential and gated. Steps 5–9 are freely navigable."**

**§20.2 The three moments that carry the product:** (1) the parking-in-FAR declaration — blocking, no default; (2) the assumption register — non-skippable, sensitivity-ranked, inline-editable; (3) click-through provenance everywhere — "the interaction that converts a skeptical architect."

**§20.3 Uncertainty as a first-class visual state:** DERIVED neutral + citation superscript; ASSUMED amber background + dotted underline + pencil affordance; USER_SET user badge; OBSERVED distribution sparkline with n; VARIANCE red border + evidence link; Deferred/not assessed grey, hatched, "not assessed" label. "**Uncertainty is not a tooltip.**"

**§21.1 Phase 0 run gates (4):** **G1** Plot & parameter confirmation (User) blocks rule resolution · **G2** Rule set acknowledgement (User) blocks capacity computation · **G3** Assumption register acknowledgement (User) blocks any export · **G4** Named reviewer on export (User) blocks external sharing. (G5 brief contradiction resolution and G6 variance review are Phase 1.)

**§21.2 Shared asset gates** with named approvers: rule publication (qualified regulatory architect) · **life-safety rule (regulatory architect + fire/life-safety specialist, second reviewer)** · default assumption values · metric definitions annex (architect + design partner sign-off) · typology library entries · objective normalization functions · deferred/non-mechanizable classification (regulatory architect — "determines what the report claims not to have checked — a liability statement") · adjudication records · design-space distinctness threshold (computational design lead). All versioned, changelogged, impacted-run identification within 24 h, past runs never mutated.

---

## 15. GOLDEN DATASET (§23) — the Phase 0 validation asset

| Item | Quantity | Source | Purpose |
|---|---|---|---|
| Real plots, one community, one land use | **10** | Design-partner land packs | Golden set |
| Independent architect computations per plot | **2** (two architects, blind to each other) | Contracted | Ground truth and variance measurement |
| Mechanized rules | **~40** | Project architect | Rule base |
| Rule test cases | **120** | Project architect | E1 |
| Metric definitions | **1 annex** | Concurrent with authoring; architect + partner sign-off | Root dependency |

"**Total external data dependency: ten land packs from one friendly developer. No municipal negotiation. No open-data licensing. No scraping.**"

Rule test requirements (§23.4): every rule gets **1 positive, 1 boundary (at the threshold), 1 negative (applicability correctly excludes)**; "boundary cases matter most — threshold-dependent rules switching at the wrong point is the highest-frequency rule defect."

Acknowledged circularity (§23.3): the golden set needs FAR, height and setbacks per plot — the same data the engine needs and which may not be on the affection plan; this makes the exercise a direct test of assumption A1.

**Evaluation layers relevant to Phase 0 (§22.1):** E0 Invariants — automated on every artifact incl. docs — gate **100%**; E1 Rules — 3 tests each, boundary + negative — gate **100% pass**; E2 Geometry — golden set, independent recomputation — gate **≤0.1% self, band-match vs. architects**; E3 Professional agreement — two-architect golden set — gate **8/10 within band**. (E4 extraction 95% critical is Phase 3; E5 precedent backtest coverage 80% / sharpness 20% is Phase 2; E6 generation blind panel 40% is Phase 4.)

**§22.2 Inter-architect variance measurement — "do this first":** Week 1 of Phase 0, **before any engine code**. Three qualified architects, same three plots, same data packs; asked for **buildable envelope, permitted GFA, and parking demand**. **Expected spread on setback interpretation, edge classification and projection treatment: 4–8%.** If so, "a 2% accuracy target against a single architect's answer is measuring noise, and the product claim changes from 'accurate' to 'consistent, explicit, and reproducible.'"

---

## 16. KILL / RE-SCOPE THRESHOLDS ATTACHED TO PHASE 0 (§26)
(The source table's columns are mis-aligned; this is the reconstructed row mapping.)
- **Inter-architect variance > 10%** → accuracy is not the value proposition; reposition around consistency, explicitness, auditability; **rewrite marketing before shipping**.
- **Mechanization rate on first 40 rules < 50%** → compliance surface too thin to claim coverage; re-scope to a narrower parameter set and **reduce the claimed rule count publicly**.
- **Rule authoring throughput on complex rules < 4/day** → knowledge-base cost is **~3× budget**; raise on that basis or narrow the jurisdiction slice. "Do not proceed on the original estimate."
- **Land packs containing FAR + height + setbacks < 5 of 10** → the input model is wrong; "the product's first job is data assembly, not computation — that is a different product and needs a different plan."
- **Users opening the provenance tree < 1 of 3 sessions** → the trust thesis is wrong; everything downstream of §13 needs re-examination before Phase 1.
- **Engine within two-architect band < 6 of 10** → **do not ship**; diagnose whether it is rules, geometry, or definitions.
- (Later phases: Phase 2 backtest coverage or sharpness "either missed" → historically-observed capacity does not ship; Phase 4 architect panel < 60% → Phase 4 does not ship, pre-authorized; Phase 1 enumeration not demonstrated sufficient → Phase 5 search does not begin.)

## 17. ASSUMPTIONS BEING TESTED IN PHASE 0 (§31.1)
- **A1** Design-partner land packs contain FAR, height and setbacks → test: §23.3 count of 10.
- **A2** Two qualified architects agree within **~5%** on a buildable envelope → test: week 1, three plots, three architects.
- **A3** **50%** of governing residential-tower rules are mechanizable → test: first 40 rules.
- **A4** Rule authoring reaches **8+/day** after the schema stabilizes → **3× cost swing**; if false, budget **14–18 architect-weeks per 300 rules**.
- **A5** Parking has a determinable, citable treatment under FAR (**15–35% capacity swing**) → test: Q1, week 2; if false it stays OPEN REGULATORY QUESTION permanently and the user declares per project.
- **A6** Users will engage with provenance rather than treating output as an oracle → session observation; if false, "re-examine everything downstream of §13."

## 18. PHASE 0 RISKS WITH NUMBERS (§25)
R-01 team builds generation first (High/Critical) — "Phase 0 must ship before Phase 1 starts". R-02 land packs lack FAR/height/setbacks (High/High) — "if <5/10, the product's first job is data assembly". R-03 variance > 10% (Medium/High). R-04 mechanization < 50% (Medium/High). R-05 rule authoring slower than 4/day on complex rules (High/High) — "the first 40 rules run **3–5× slow** because schema is co-designed. Budget **14–18 architect-weeks for 300 rules, not 6–10**." R-07 professional liability (Low/Critical) — disclaimers, **PI insurance before first paying customer**, human gates, five-way claim statement, marketing review. R-10 geometric degeneracy (Medium/High). R-11 users read self-consistency as compliance (High/Critical). R-12 assumption treated as fact (High/High). R-13 regulatory architect hiring is the schedule's binding constraint (High/High). R-17 road-hierarchy layer unavailable (Medium/Low) — Phase 0 keeps edge classification manual. R-18 customers reject Phase 0 as "just a calculator" (Medium/High) — tested in Phase 0 with design partners.

## 19. DATA ACQUISITION FOR PHASE 0 (§28.1)
Four Phase 0 inputs: **10 land packs, one community** — design partner, Low difficulty, **Blocking** ("but one relationship"); **regulatory source documents** — published, Low, **Blocking**; **basemap tiles** — commercial, Low, not blocking; **2× architect computations ×10** — contracted architects, Low, **Blocking**. (Row/column alignment in the source table is degraded; this is the reconstructed mapping consistent with §23.1.)

## 20. NON-NEGOTIABLE PRINCIPLES ENFORCED IN PHASE 0 (§2.4)
1 Precedent is evidence, not authority (type-level, CI assertion) · 2 every important output traces to rule/assumption/objective/precedent (provenance class non-nullable, CI) · 3 every emitted configuration passes the invariant layer (fails build, blocks emission) · 4 invariant layer independent of generator (separate module, separate owner, import linter) · 5 hard constraints separated from soft preferences (distinct types; hard constraints are feasibility filters, never penalty terms) · 6 five capacity concepts never merged · 7 never claim compliance because the validator agrees with the generator · 8 distinguish the five claim types · 9 every rule carries nine fields, all NOT NULL · 10 shared assets versioned and approval-controlled.

**Marketing prohibition (§2.2, §24.4):** "No output, no report, no marketing material may describe it as compliance." Regulatory validity is "**Never claimed. Not obtainable.**"

## Key numbers
- Phase 0 duration: 8-12 weeks; 12-week schedule with weeks 11-12 as buffer; ships to 1-2 design partners, free (V0 release)
- Team: 4 people at 1.0 FTE each (Regulatory Architect, Senior Backend/Geometry Engineer, Full-stack Engineer, Product/Tech Lead) + 3 contracted architects for ~10 days total. No AI/ML engineer.
- ~40 mechanized rules as typed records; fallback to 30 rules rather than extending schedule if authoring is slow (A4)
- 120 rule test cases = 3 per rule (1 positive, 1 boundary at threshold, 1 negative applicability-excluded)
- Evaluator registry capped at 12 named functions (scalar_min, scalar_max, table_lookup_min, table_lookup_max, ratio_per_unit_type, percentage_of_base, polygon_offset_inward, count_minimum, range_bound, enum_permitted_set, conditional_scalar, custom_python)
- 18 invariants INV-01..INV-18; tolerances 0.1% (INV-01/03/07), 0.5% (INV-02), 1% (INV-06), 0.001 (INV-05), 0.01 m (INV-11), exact (INV-04, 08, 09, 10, 12, 13, 14, 15, 16, 17, 18)
- P0-S2 / FR-PLT-002 AC5 / §24.2: engine within two-architect band on 8 of 10 golden plots; kill threshold < 6 of 10
- P0-S5: full computation < 10 s; FR-PLT-002 AC4: envelope solver < 2 s for <=12 edges; FR-PRV-001 AC3: derivation tree renders in <=300 ms
- P0-S3/P0-S4/M-INV/M-PRV/M-DEF/M-RUN = 100%; M-APP = 0; M-PRE = 0
- Independent area recomputation must agree to <=0.1%; >0.1% disagreement is a P0 defect, not a rounding note
- FR-PLT-001: computed vs stated plot area deviation > 2% blocks; trained user completes plot entry in <=3 minutes; form entry costs the user ~90 seconds; edge classification ~20 seconds
- FR-PLT-002 AC3: where two constraints bind within 1%, both are reported
- FR-ASM-001: perturb each ASSUMED value by +/-10% (or +/-1 unit for integers); worked impact example '+3 m2/bay removes 1 floor: -1,060 m2 GFA, -8 units'
- Parking-in-FAR (FR-DEF-002 / Q1 / A5): changes capacity by 15-35% on a podium-parking tower; no default; blocking
- Metric definitions annex: minimum 10 defined terms (GFA, BUA, NSA, Sellable Area, Gross Efficiency, Tower Efficiency, Parking Area, Bay Area Factor, FAR, Plot Coverage); one-page annex; one-week, four-person-hour document
- Golden set: 10 real plots, one community, one land use; 2 independent architect computations per plot (blind to each other)
- Inter-architect variance measured week 1 with 3 architects x 3 plots; expected spread 4-8%; kill/reposition threshold > 10%; assumption A2 says ~5%
- Mechanization rate assumption A3 = 50%; kill threshold < 50% on the first 40 rules
- Rule authoring throughput assumption A4 = 8+/day; kill threshold < 4/day on complex rules; first 40 rules run 3-5x slow; budget 14-18 architect-weeks per 300 rules (not 6-10)
- Land-pack completeness: of 10 packs, kill threshold < 5 of 10 carrying FAR + height + setbacks
- P0-S6: design partners open provenance tree unprompted in 2 of 3 sessions; kill threshold < 1 of 3
- Occupant-load fixpoint bounded at max 5 iterations, convergence tested on the rule set not the load value
- user_realism_discount default 1.00, class USER_SET, P1 priority
- Integer granularity loss reported, not absorbed; worked example 300 m2 = 1.88% of permitted GFA
- Shared-asset changes: impacted runs identified and owners notified within 24 h; past runs never mutated
- OBSERVED values require pattern n >= 8 (CI assertion, Phase 2+)
- Stack: Python 3.12, FastAPI, Shapely/GEOS, pyproj, PostgreSQL 16 + PostGIS, S3, React/TS, WeasyPrint, pytest; single monolith, synchronous runs; UTM 40N for all computation, WGS84 display only
- 4 human run gates in Phase 0 (G1 plot & parameter confirmation, G2 rule set acknowledgement, G3 assumption register acknowledgement, G4 named reviewer on export)
- Market comparison: today 2-6 week consultant exercise at AED 50,000-250,000; after Phase 0, ten seconds
- 24 MVP acceptance checkboxes total: 17 functional + 5 quality + 5 measurement + 4 governance (31 boxes across four subsections)

## Open items
- Q1 / A5 / FR-DEF-002: whether parking counts toward FAR in the target jurisdiction is UNRESOLVED and is a blocking OPEN_REGULATORY_QUESTION. Owner: Regulatory Architect, needed by Phase 0 week 2. A contractor must know whether they are building one FAR treatment or a dual-scenario comparison engine (AC4 requires one-click comparison of both treatments regardless).
- Q2: typical FAR values for target plots are unknown (needed Phase 0 week 1). 'If FAR is 3-5, a 2,000 m2 plot is a small point block, not a tower' - this changes the problem size the machinery targets.
- Which Dubai community and which land-use slice is 'the one community'? Never named in the PRD. Rule authoring, land packs and the golden set all depend on it.
- The regulatory source documents are not enumerated - only 'published, Low difficulty, blocking'. The ~40 rules' source instruments (which authority, which circulars, DM_MAINLAND vs free zone) are unspecified beyond the sample jurisdiction value 'DM_MAINLAND'.
- The Metric Definitions Annex does not exist yet. It is the root dependency, it gates ALL code that computes an area term (FR-DEF-001 AC5), and it requires architect + design-partner sign-off in week 1. Nobody can quote code that computes GFA before it is signed.
- A1: whether the 10 design-partner land packs actually contain FAR, height and setbacks is untested. If < 5 of 10, the project is re-scoped to a data-assembly product - a different product and a different plan. The single external data dependency ('one friendly developer') is not named or secured in the document.
- Who contracts and pays the 3 architects (~10 days) for variance measurement plus the 2-per-plot golden-set computations (10 plots x 2 architects)? Scope, rate and blindness protocol are unspecified.
- The Regulatory Architect is described as a founding-team role with veto over rule publication, not a hire and not an advisor (R-13: 'the schedule's binding constraint'). Whether this person is already identified is unstated - the whole 12-week schedule collapses without them from week 1.
- Basemap tile provider and licence are listed as 'commercial, Low, not blocking' but no vendor, cost or attribution constraint is given; the SPA requires a basemap for manual boundary drawing.
- Q6: whether a road-hierarchy GIS layer exists and joins cleanly to cadastral edges is unresolved (needed Phase 0 week 10) - explicitly worked around in Phase 0 by manual edge classification, but affects any later automation quote.
- Q11: professional-indemnity insurance obtainability and premium for this product description is open (CEO, Phase 0 week 8). §24.4 requires the professional-use disclaimer to be reviewed by UAE counsel before MVP sign-off, and R-07 requires PI insurance before the first paying customer - both are external legal engagements not in the four-person team.
- FR-CAP-002 (user realism discount) is marked P1 while every other §9.1 requirement is P0, yet §24.1 lists it as a required MVP functional checkbox and §32.2 schedules it in week 6. Priority conflict needs resolving before scoping.
- §24.1 says 'Invariant layer: 18 checks' and §12.2 lists exactly 18, but several (INV-02, INV-04, INV-05, INV-06, INV-07) reference unit schedules, unit mix and NSA that Phase 0 does not generate (no floor plans, no configurations - those are Phase 1+). Which invariants are actually exercisable in Phase 0 vs. built-but-dormant must be clarified before quoting the invariant module.
- §34 says the report shows 'four bands showing which constraint actually binds' while §3.2, FR-CAP-001 and INV-16 specify three bands (A/B/C) plus a governing designation. Report design must resolve which.
- Deferred/non-mechanizable classification is called out (§21.2) as 'a liability statement' requiring regulatory-architect approval, but no process, template or record schema for the DeferredCheckList entries is specified beyond 'appears in every output, in the body'.
- The AdjudicationRecord asset (§11.6) is required whenever two rules conflict with no defined order, and computation for that parameter halts until a human authors one. No estimate is given of how many adjudications the ~40-rule set will trigger - a schedule risk with no allowance in §32.2.
- Non-scalar conflict types (enumerated single value, topological, cross-unit) resolve to REQUIRES_ADJUDICATION, and IRRECONCILABLE reports infeasibility naming both rules. The UI/UX for surfacing these halted states is not in the §20.1 nine-step flow.
- Hosting, environment, tenancy and auth are absent from §19.1 (tenant_id appears on PLOT but no auth/identity requirement exists anywhere in §9.1); 'named reviewer on export' (G4) and 'user badge' provenance both imply identity that is never specified as a requirement.
- Q13: whether customers accept a set of options or demand a single answer is open (Phase 1) but shapes the Phase 0 report's presentation of three bands.
- Extraction glyph loss: the source text renders arrows, inequality signs, m2 and Greek letters as blanks, and §15.1, §22.1, §26 and §28.1 tables are column-misaligned. Any contractor quoting from this .txt should work from the original PDF/DOCX to confirm tolerances and threshold directions (>= vs <=).

---

## 17. AS BUILT — where the delivered Phase 0 departs from this scope (22 Sep 2026)

Everything above is an extract of the PRD and stays one. This section is the only part
that is not. It records, against §2 and §3, what the build did differently and why, so
that the extract is never read as a description of the software. Every departure below
was made for a stated reason, and none of them should reach the client for the first
time in a demo.

### 17.1 Built, although §3.2 puts it Out or the PRD does not mention it

| The PRD says | As built | Why |
|---|---|---|
| DXF is Out of Phase 0; §19.4 schedules it for Phase 1 | DXF R12 — the whole building in 3D, or any one sheet — behind the same G3/G4 gates as every other file | The 30 Aug 2026 meeting: laying out parking is what costs the client three to four months, and he lays it out in AutoCAD. A bay count that cannot be opened as a drawing is not the thing he is paying for |
| Floor plans are Out | A drawing set composed from the engine's one `BuildingModel`: a site plan, one sheet per parking level with every bay numbered and a car in each, the typical floor's outline, two sections. **No unit plans.** | Same meeting. The parking level is placed as rectangles to DBC Table B.11, not divided by an area factor, so the count on the sheet is a count that can be laid out |
| Output is JSON + PDF; §19.4 puts XLSX in Phase 1 and three.js in Phase 4 | Also XLSX, a 3D view on screen, and the 3D model as binary glTF (`.glb`), written by the API behind the same gates | The model is an extrusion of the levels the answer places — no slab, core or façade — so it stays inside §14.5's "no 3D massing beyond extrusion", and every file carries a list of what it does not draw |
| Plot entry is a form plus polygon drawing on a basemap (FR-PLT-001) | A dimensions-first form, and a **deterministic** affection-plan reader (positioned PDF text → cited facts). No basemap | Q23: tracing on a basemap routinely trips AC2's 2% block. The reader uses no model of any kind, so "LLM anything" stays Out; it is not Phase 3's document understanding. A limit the sheet omits is reported as a gap and blocks the run |
| — | A vehicle-access recommendation to DBC B.7.2.1, with its alternatives and what it could not assess | The same sentence of the meeting names the parking *and the entrances* |
| — | Developer standards and project briefs, as a type that cannot be resolved as a rule | The client's fourth input. Reading them found the `saleable_efficiency` defect (units 3–7% high on every run) |
| — (no identity requirement anywhere; Q25) | Accounts and sessions; a run is reachable by its author and by accounts it was shared with, as reviewer (may sign G4) or reader; anyone else gets 404; drafts are saved as they are typed | G4 needs a named reviewer who can see the run. What is still open is in Q25 |
| — | A public site in English and Arabic: the landing page, parking, what comes out, what it refuses, readiness, and each account's runs | The client is presenting this to a funder. The pages are held to the same "no claim the engine did not produce" rule as a report |
| §19.4: Python 3.12, FastAPI, Shapely/GEOS, PostgreSQL 16 + PostGIS | A TypeScript monorepo; Clipper on a 1 mm integer grid; Fastify; SQLite or MySQL behind one repository seam | `CLAUDE.md`, "Architecture, and why": exact predicates by construction, and a validator that cannot import the engine |
| Hosting is absent from §19.1 | Deployed at `tob.khaledahmed.net`, built off the host and served by Passenger, with MySQL | — |

### 17.2 Kept Out, although the client asked for it

The optimiser that searches ramp and core positions for the most units (34:37, the
largest ask in the meeting). It is a `TRADEOFF` value, and `PHASE_0_CLASSES` refuses to
emit one by construction. It is wanted and it is out of scope; the refusal is on the
public site, in the product's own words.

### 17.3 In §2's list and not yet met

Measured from the deployment's own readiness figures, not estimated:

- **Rules.** §2 says ~40 mechanized rules. 13 are encoded, and **0** are approved by a
  named approver. The development loader marks every rule approved by
  `DEVELOPMENT-ONLY-NOT-A-REAL-APPROVER` so that a demo can run; nothing counts that as
  an approval.
- **Metric definitions annex.** 14 definitions, **0** signed. The annex is
  `0.1.0-UNSIGNED`.
- **Invariants.** On the worked example **10 of 18 run**; 8 are dormant because Phase 0
  produces no unit schedule and no per-level schedule (Q19, Q26).
- **One community, one land use.** The PRD never names them (open item above).
- **§24.3's measurement deliverables.** The variance study has not been run, so no
  accuracy figure exists and none is printed anywhere.

### 17.4 Open, and it moves a figure

**Q27 — does podium parking count against the height ceiling?** On the 120 × 80 m test
plot the answer places 14 levels and the ceiling permits 14; with one level of podium
parking the model draws 13 and says the fourteenth does not fit. Either reading is
defensible and they give different capacities. The engine does not choose.
