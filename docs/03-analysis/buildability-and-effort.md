# Buildability And Effort

## Verdict

Buildable — but not as specified, not in 12 weeks, and not by one developer. Phase 0 is ~85% routine engineering wrapped around three genuinely hard things (a rule→geometry fixpoint the PRD never specifies, 100% provenance emission discipline, and a purity/reproducibility constraint that must be designed in on day one). The engineering is 34–42 person-weeks, roughly 1.5× what the PRD's 4×12-week plan allocates to engineering, and that is before an entire unscoped identity/auth workstream. The real risk is not code: it is that the PRD's headline acceptance criterion (8 of 10 within the two-architect band) is almost entirely a function of rule-authoring correctness and regulatory source availability — neither of which a contractor controls. Take the work; never take 8/10 as a contractual acceptance criterion.

---

# ENVELOPE Phase 0 — adversarial buildability assessment

Files verified: `E:\ENVELOPE\_client_material\extracted\ENVELOPE_PRD_v2.txt`, `E:\ENVELOPE\_client_material\extracted\ENVELOPE_Deck.txt`. Specific line references given where a finding is checkable.

---

## 1. Verdict in one paragraph

The PRD is unusually good. It is the best-disciplined spec I have seen come out of an LLM-assisted process, and its central instincts — provenance as a type-level property, invariants as conservation laws separate from constraints, the refusal to ship a "realistic" band, kill criteria agreed in advance — are correct and hard to retrofit. That is exactly why it is worth being blunt about the parts that will not survive contact with an implementer. **Phase 0 is buildable. Phase 0 as written is not.** The document specifies a computation it cannot perform (§2), rests its own worked example on four numbers that violate its own 100%-provenance rule (§3), omits an entire workstream that four of its own gates require (§4.9), and budgets roughly two-thirds of the engineering it actually needs (§6).

---

## 2. The thing that is genuinely hard, and the PRD does not know it is there

**The envelope solver is specified as a feed-forward pipeline. The rule it must implement is a loop.**

FR-PLT-002 (line 964), verbatim processing:

> "Apply per-edge setback offsets → intersect → setback-permitted footprint. Apply coverage cap. Podium footprint = min(setback-permitted, coverage cap). Apply tower plate cap. Apply height ceiling and floor-to-floor to derive maximum level counts."

One direction. Rules in, geometry out. No iteration, no convergence, no bound.

Now the deck, slide 05 — the single slide that sells the entire differentiator:

> "In the Dubai Building Code, the setback from a neighbouring plot depends on how many floors the building has — 3.00 m at ground, rising to 7.50 m at G+9 and above. But the number of floors depends on the footprint, and the footprint depends on the setback."

So the setback rule's lookup key is an *output* of the solver. That is a fixpoint, and it sits in the first computation Phase 0 performs.

I grepped the PRD for every fixpoint/iteration mention. There are exactly two contexts: §11.7 (the occupant-load fixpoint) and line 1465, which is **FR-GEN-001 — Phase 4**. §11.7's machinery — conservative seed, convergence tested on rule-set identity, 5-iteration bound, `NON_CONVERGENT_APPLICABILITY`, `USER_SET` occupancy declaration — is scoped to occupant load for life-safety rules. **Nothing in Phase 0 applies it to setbacks.** The evaluator registry reinforces this: `table_lookup_min` with `evaluator_args: {"key": ["road_hierarchy"]}` (line 1742) keys off a static plot attribute. There is no mechanism for an evaluator's key to be a solver output, and no re-entry path.

Two consequences:

1. **Phase 0 as specified cannot compute the deck's own headline example.** If the client asks for a demo of slide 05 in week 6, the spec does not describe the code that produces it.
2. **The fix is not small.** It converts the envelope solver from a pure function into a bounded fixpoint with monotonicity guarantees, threshold-straddle detection, a declared tie-break, and iteration history in the provenance graph. Call it +1 person-week on the solver and a real design conversation about whether the seed is conservative (over-estimate floors → larger setback → fewer floors, converging downward, which is the safe direction — same argument as §11.7 step 1).

**And the deck's own numbers do not reconcile.** Plot 80 × 40 m, FAR 5.0 → 16,000 m² GFA. Under a simple inward offset:

| Stated setback | Footprint (80−2s)(40−2s) | Floors = 16,000 / footprint | Deck says |
|---|---|---|---|
| 7.50 m | 65 × 25 = 1,625 m² | 9.85 | **7.6** |
| 6.00 m | 68 × 28 = 1,904 m² | 8.40 | **6.9** |
| 5.25 m | 69.5 × 29.5 = 2,050 m² | 7.80 | **6.6** |

No constant scaling factor reconciles the three rows (implied k = 0.772, 0.821, 0.846). Applying the 60% coverage cap from Appendix A does not fix it either. The direction is right — smaller setback, bigger footprint, fewer floors — but the magnitudes are not reproducible from the stated inputs. Back-solving, the deck's floor counts correspond to setbacks of roughly 5.0 / 3.9 / 3.4 m, not 7.50 / 6.00 / 5.25.

Worse, "converges in three passes" is not demonstrated. The sequence shown is *assume G+10 → 7.6 floors → assume G+7 → 6.9 → assume G+6 → 6.6*. The assumption never tracks its own output, and 6.6 floors rounds into a lower DBC setback band, which yields a larger footprint and fewer floors again. That is a threshold straddle, which is precisely the failure mode §11.7 exists to handle by declaring a basis rather than picking one. The honest statement is "this needs a bounded fixpoint and a declared tie-break," not "converges in three passes."

This is the same defect class the PRD says destroyed V1 (§30.3 item 2: errors of ~2.8× on GFA, ~3× on unit count) and that the invariant layer exists to prevent — and it is on the marketing slide, which the invariant CI job does not cover because it only runs on examples in *product documents*.

---

## 3. The PRD's flagship worked example violates the PRD's own release-blocking metric

Appendix A is presented as the fix for V1 — "every number below was computed by the invariant checker," "verified in CI" (§30.3 item 1). The arithmetic does close; I checked it. A.3: 1,920 + 13 × 1,060 = 15,700; a 14th floor gives 16,760 > 16,000, so integer granularity loss = 300 m² = 1.88%. A.5: 52 + 58.5 + 26 = 136.5 → 137, +15% visitor = 21, total 158; 158 × 32 = 5,056 ≤ 3 × 1,920 × 0.92 = 5,299. All consistent.

**But four load-bearing numbers have no derivation and appear in no input table.**

A.1 lists twenty inputs with provenance classes. It does **not** contain:

| Number | Value in A.2/A.4 | Where it comes from |
|---|---|---|
| **Selected tower plate** | 1,060 m² | Nowhere. The printed computation is `min(podium footprint, 1,280.0)` = **1,280**, not 1,060. The row is literally labelled "Tower plate (**selected**)" and the binding column says "Within cap" — i.e. no constraint produced it |
| **Units per floor / mix** | 8 units — 4 × 1-bed, 3 × 2-bed, 1 × 3-bed | Nowhere |
| **Unit NSA by type** | 70 / 110 / 160 m² | Nowhere (could be rule minima; not stated) |
| **Core + circulation + services** | 290 m² | Nowhere |

P0-S3 and M-PRV require **100% of emitted values to carry a provenance class and a complete derivation**, "CI-asserted; a null class fails the build," and §22.3 calls it a release blocker. The document's own showcase example fails it. And the invariant layer cannot catch this — by §12.4's own admission, invariants check that arithmetic closes, not that inputs are derived. The example passes 16 of 18 checks (INV-14 and INV-15 are absent from A.7 while A.8 claims "all 18") precisely because closure and provenance are different questions.

**Why this matters commercially, not just pedantically:** the tower plate is the single largest lever on every headline number, and the example sets it to a free value. Substitute the cap (1,280 m²) and Band A becomes 1,920 + 11 × 1,280 = 16,000 m² with **zero** granularity loss instead of 15,700 with 300. Band B goes from 30,540 to 36,480. In the golden-set comparison, the architect will choose a plate for design reasons — slab depth, core efficiency, view corridors, unit depth — and the engine has no regulatory basis to choose anything. **P0-S2 (8 of 10 within band) is therefore partly a test of whether the engine happens to guess the same plate the architect drew.** Phase 0 explicitly excludes configurations (§3.2), so there is no mechanism to select one; it has to be `USER_SET`, which means the product's headline output is conditioned on a user input the PRD never asks for.

---

## 4. Under-specifications an implementer hits immediately

Ordered by how early you hit them.

**4.1 — Where does the unit mix come from?** (hit in week 5, blocks the parking model and Band C)
FR-PRK-001 requires "per-type ratios → resident bays." Appendix A has a full unit schedule. §3.2 puts configurations, floor plans and unit packing out of Phase 0, and `CONFIGURATION` is a Phase 1+ entity (§10.2). There is **no functional requirement, no entity, and no input field anywhere in the PRD for unit mix, unit areas, or core/circulation allowance** — yet Band C, all parking demand, NSA, both efficiency figures, and INV-02/04/05/06/07 depend on them. This is not a detail; it is a missing FR at the centre of the pipeline.

**4.2 — Five of the eighteen invariants have nothing to check.** INV-02, 04, 05, 06, 07 all reference unit NSA, unit counts, mix shares. Either Phase 0 has a unit schedule (contradicting §3.2) or those five are dormant and the §24.1 checkbox "Invariant layer: 18 checks" cannot be ticked. Pick one before quoting. My reading of Appendix A is that Phase 0 *does* need a user-declared unit mix — which means §3.2's scope line is wrong, not the invariants.

**4.3 — Basemap drawing versus the 2% area gate.** §14.4 mandates UTM 40N for all computation. FR-PLT-001 offers "form entry + manual polygon drawing on a basemap" and AC2 **blocks** when computed vs. stated area deviates by >2%. An architect has an affection plan with dimensions and bearings, not coordinates. Hand-tracing a 20 × 30 m plot on a satellite tile will routinely land 2–5% off, so **the primary input method will routinely trip the primary input validation**. Appendix A.1 quietly avoids this by entering "80.0 × 40.0 m" as `USER_SET` dimensions. You need a dimension-and-bearing entry path with optional georeferencing — that is the real requirement, and it is not written.

**4.4 — "Exact predicates" names no library, and Shapely/GEOS does not provide them.** §14.3 requires "exact predicates for orientation and intersection; never raw floating-point comparison" alongside a stack of Shapely/GEOS. A literal reading means CGAL bindings or rational arithmetic — a multi-week rabbit hole. The sane reading for rectilinear/convex plots at metre scale: snap all input coordinates to 1 mm, carry `Decimal`/`Fraction` through orientation and area, declare the snap tolerance as a versioned constant. **The PRD requires the snap tolerance be "declared explicitly, not implicit in the library" and then never states a value.** Agree the interpretation in writing before you quote, or you are exposed to a literalist reading later.

**4.5 — "Every area computed twice by independent methods" — the second method is unnamed.** Shoelace vs. GEOS is fifteen minutes. An independent reimplementation is a week. Triangulation-and-sum is a day. The 0.1% gate is meaningless without saying which. Price the cheap reading; say so.

**4.6 — The nine Principle-9 fields are enumerated as eight, twice.** §2.4 and FR-RUL-001 AC1 both list: source, citation, effective date, jurisdiction, applicability, version, approval status, provenance. That is eight. §11.2 and §24.1 both say "nine." The ninth is plausibly `rule_class`, `is_life_safety`, or `mechanization`. You cannot write the NOT NULL constraints or the CI assertion until this is pinned. Trivial to resolve; blocking until it is.

**4.7 — `DEFERRED`: enum value or orthogonal flag?** §11.3 is headed "three rule classes" and tabulates four partitions. FR-RUL-003 AC1 demands every rule land in exactly one of four and fails the build otherwise. §11.2's record shows `rule_class: "GENERATIVE"` only. Is a deferred setback rule `rule_class = DEFERRED`, or `rule_class = GENERATIVE, mechanization = NON_MECHANIZABLE`? The `mechanization` enum is never listed — only the value `"MECHANIZED"` appears anywhere in 3,587 lines — yet §24.3 requires the mechanization *rate* be measured, which needs at least two values.

**4.8 — Six named output objects have no schema.** `AdjudicationRecord`, `InvariantReport`, `ValidationReport`, `ApplicableRuleSet`, `CapacityBands`, `ParkingResult` are all named as required outputs with acceptance criteria attached and given no field lists. `PROVENANCE_NODE` / `PROVENANCE_EDGE` are declared entities in §10.2 with no fields; §13.2 offers an informal edge sketch. That is a day of schema design each, and every one of them is on the critical path.

**4.9 — There is no identity system, and four gates require one.** I grepped: `tenant_id` appears **once** in the entire PRD (line 1626, on `PLOT`). There is no requirement anywhere for authentication, users, organizations, sessions, roles, or permissions. Meanwhile: G4 requires a "named reviewer on export"; `USER_SET` provenance must display "the user's name"; FR-GOV-001 requires a "named approver"; FR-RUL-001 AC2 requires `approved_by` to be "a qualified human"; §24.4 requires an audit trail of who approved what. **This is a 1.5–2 person-week workstream that appears nowhere in the 12-week schedule.** It is the single largest silent omission in the plan.

**4.10 — "Byte-identical" reproducibility, and WeasyPrint.** M-RUN requires the deterministic portion to re-execute byte-identically from persisted artifacts. Achievable for the JSON and provenance payload with pinned GEOS/Shapely versions, fixed decimal serialization, sorted keys, and a stored RNG seed. **Not** achievable for the PDF — WeasyPrint embeds creation timestamps and object IDs. Scope M-RUN to the structured payload explicitly, or you will fail your own release blocker on a metadata field.

**4.11 — The sensitivity engine forces the whole pipeline to be pure.** FR-ASM-001 perturbs each `ASSUMED` value by ±10% and recomputes, ranked by effect on governing capacity; AC3 wants inline edit with *immediate* recompute; FR-DEF-002 AC4 wants a one-click both-treatments parking-in-FAR comparison. With ~10 assumptions that is 20+ full pipeline executions plus 2 for the FAR comparison, inside a <10 s budget. This is fine — but only if the engine is a pure function of (inputs, rule-set version, assumptions) from day one. Discover this in week 8 and you refactor everything. It is an architectural constraint that belongs in §19.1 and is not there.

**4.12 — Halted states have no UI.** `REQUIRES_ADJUDICATION` halts computation for a parameter; `IRRECONCILABLE` reports infeasibility naming both rules; `NON_CONVERGENT_APPLICABILITY` demands a user declaration. None of these appear in §20.1's nine-step flow. Every one needs a screen.

**4.13 — "Ten seconds" is a computation figure, not a user experience.** §34 and deck slide 02 sell "ten seconds" against a 2–6 week / AED 50k–250k consultant exercise. The actual flow is ≤3 min plot entry + G1 + G2 + a mandatory sensitivity-ranked assumption acknowledgement + G4 reviewer sign-off. The computation is <10 s. Worth aligning the claim now, since R-11 (users read self-consistency as compliance) is a Critical-impact risk and this is the same category of over-claim.

---

## 5. What is routine, and what is actually hard

**Routine (~60–65% of the build).** FastAPI + Postgres + React CRUD. Bitemporal storage — it is `valid_from`/`valid_to` plus `recorded_at` and a query helper; the PRD treats it as exotic and it is not. Shapely offsets and intersections on rectilinear/convex polygons — the Phase 0 restriction removes essentially all the geometric difficulty, which is the smartest scoping decision in the document. Provenance persistence as a per-run DAG in Postgres with a recursive CTE. The import linter (the `import-linter` package does this off the shelf). WeasyPrint HTML→PDF. JSON export. The 18 invariants themselves are ~200 lines of arithmetic assertions — genuinely cheap, exactly as the PRD claims.

**Hard, in descending order of risk:**

1. **The setback fixpoint** (§2 above). Unspecified, on the critical path, and it is the demo.
2. **Provenance emission discipline at 100%, CI-enforced.** This is not a module; it is a tax on every function signature in the system. Every computation must construct and thread graph nodes. It is the single thing most likely to rot in a solo build, because the pressure to "add provenance after it works" is enormous and the PRD is correct that retrofitting means rewriting every layer (§19.3, §30.4 item 5). Budget it as ~2.5 person-weeks of cross-cutting work and enforce the CI assertion from week 2, not week 7 as scheduled.
3. **Purity and reproducibility as a day-one architectural constraint** (§4.11, §4.10).
4. **Rule authoring throughput — not the developer's work, but on the developer's schedule.** The PRD is admirably honest here (R-05: first 40 rules run 3–5× slow; budget 14–18 architect-weeks per 300 rules, not 6–10). Each rule needs `source_page`, `source_bbox`, `source_text_verbatim`, three tests including a boundary case at the threshold, and a named approver. That is archival work, not typing. If it slips, the engine has nothing to evaluate.
5. **The 8/10 golden-set result.** Research risk, not engineering risk. See §7.
6. **Conflict resolution machinery** (§11.5/§11.6): most-restrictive-wins across MIN/MAX operators, life-safety non-relaxation, range intersection, `REQUIRES_ADJUDICATION` halts. The rules are stated clearly enough to implement, with two exceptions: what happens when a plot-specific instrument *attempts* to relax a life-safety parameter is undefined (error? ignore? adjudicate?), and cross-unit comparability "in a fixed context" is unimplementable as written.

**Over-specified relative to Phase 0's actual difficulty:** exact predicates, byte-identical reproducibility, bitemporality, the graph-DB-avoidance analysis. These are correct instincts applied at a fidelity the phase does not need. They are cheap enough to keep, but do not let them eat the weeks that belong to the fixpoint and to provenance.

---

## 6. Honest effort, versus the PRD's plan

Single senior full-stack engineer with geometry competence, including tests, to the spec as written plus the omissions above.

| Workstream | Person-weeks |
|---|---|
| Repo, CI, import linter, Postgres/PostGIS, migrations | 1.0 |
| Metric definitions module + INV-15 enforcement | 0.5 |
| Rule schema, bitemporal store, approval workflow, load-gate | 2.0 |
| Evaluator registry (12) + applicability + materialization + §11.5/§11.6 conflicts | 2.5 |
| Rule test harness (120 cases, authoring ingest, runner) | 1.0 |
| Geometry kernel (offsets, predicates, double area, MBR/axis/convexity, degeneracy, CRS) | 2.0 |
| Envelope solver + binding attribution + 1% near-tie + **setback fixpoint** | 3.0 |
| Parking model | 1.0 |
| Capacity bands, governing, integer granularity, realism discount | 1.0 |
| Invariant module (18 checks, report, doc-example CI runner) | 1.5 |
| Validation module + five-way claim statement | 1.0 |
| **Provenance emission (cross-cutting)** | 2.5 |
| Assumption register + perturbation sensitivity | 1.5 |
| Immutable runs, content hashing, deterministic re-execution | 1.5 |
| **Identity / auth / tenancy (absent from PRD)** | 1.5 |
| REST API layer | 1.0 |
| Frontend: plot form, basemap draw, edge classification | 2.0 |
| Frontend: gated 9-step flow, G1–G4 | 1.0 |
| Frontend: results, bands, envelope, parking | 1.5 |
| Frontend: provenance tree, ≤300 ms render | 1.5 |
| Frontend: assumption register, inline edit, amber treatment everywhere | 1.5 |
| Frontend: invariants, validation, deferred, claims | 0.75 |
| PDF report (face page, per-number footnotes, body sections) | 1.5 |
| JSON export + round-trip identity test | 1.0 |
| Integration, perf tuning (<10 s / <2 s / ≤300 ms), golden-set diagnosis | 3.0 |
| **Total engineering** | **~37 (range 34–42)** |

Plus, not engineering and not the contractor's to deliver: metric definitions annex (~0.5 architect-week + partner sign-off), 40 rules × 3 tests (3–6 architect-weeks at the PRD's own honest R-05 rate, not the optimistic A4 rate), 3 contracted architects × ~10 days for variance + golden set, land-pack acquisition, design-partner sessions, UAE counsel, PI insurance.

**Against the PRD's plan.** 4 FTE × 12 weeks = 48 person-weeks, of which realistically 24 is engineering (2 engineers), ~12 architect, ~12 product. **The engineering allocation is short by roughly 50%** — and that is before the identity workstream (§4.9) and before the fixpoint (§2). Weeks 11–12 are nominally buffer, but they are also when the golden set runs and the design-partner sessions happen, so they are not buffer at all; they are the two most schedule-fragile weeks in the plan. The PRD's own escape hatch — "cut to 30 rules rather than extending the schedule" — cuts the wrong variable: rule count is the client's cost, engineering weeks are the schedule.

**Solo.** Full spec, one developer: **30–40 weeks**. A defensible, honest, demonstrable Phase 0 for one community — dimension-based plot entry, 20–30 rules, real fixpoint, real provenance, real invariants, single-tenant, no auth beyond a shared login, PDF without per-number footnote polish, sensitivity computed async — is **14–18 weeks**. That is the shape I would sell.

**Principle 4 is structurally unsatisfiable by one developer.** "Invariant layer independent of the generator — separate module, separate owner, no shared imports, import-linted" plus FR-INV-001 AC4 "owned by an engineer who does not own the capacity engine." A solo contractor cannot honour this. Three options, in order of preference: (a) the client — a practising Dubai architect — owns the invariant *catalogue* and its expected values while the developer implements them, which preserves most of the epistemic independence; (b) contract a second engineer for 2–3 weeks to own `invariants/` and `validation/` outright; (c) write the invariant module first, from the signed annex, before any capacity code exists, in a separate package with the import linter live from day one, and **disclose in writing that owner-independence is not met**. Do not silently absorb this — it is one of the ten non-negotiable principles, and quietly breaking it is exactly the behaviour the whole document is designed to prevent.

---

## 7. The single biggest thing that is not a software problem

**The regulatory knowledge asset — and by extension the acceptance criterion built on it.**

The PRD is explicit that the moat is "a versioned, cited, human-approved, machine-executable model of Dubai development regulation" and that the software is the lesser artefact (§34: "A Phase 0 that ships perfect software and measures none of these has failed"). It is right. But that means the outcome the client will judge — **P0-S2, engine within the two-architect band on 8 of 10 plots** — is overwhelmingly determined by things a developer neither owns nor influences:

- **Whether the governing instruments are obtainable at all.** §30.1 item 6 says only "A consolidated Dubai Building Code exists and is issued by Dubai Municipality." That is the sum total of verified knowledge about the primary source. FAR, height, coverage and plate caps mostly live in per-community Development Control Regulations — and the deck's own framing is "a different DCR for every plot." §28.1 asserts "regulatory source documents — published, Low difficulty, **blocking**" with no evidence and no named instrument. If the DCR for the chosen community is not published in a citable form, the rule base has no source and `citation.document_uri` cannot be populated — which fails FR-RUL-001 AC1, which blocks the evaluator from loading anything.
- **Whether a licensed architect authors 40 correct, cited, tested, approved rules.** R-05 already concedes the first 40 run 3–5× slow.
- **Whether the 10 land packs actually carry FAR, height and setbacks.** §30.1 item 5 states plainly that the affection plan "is not guaranteed to carry FAR, height limits, or full setback schedules" — so A1 is not merely untested, it is known-doubtful. The kill criterion (<5 of 10) turns the whole thing into a data-assembly product.
- **Q1: does parking count toward FAR.** Unresolved, blocking, and it swings capacity 15–35%. Until answered, every capacity number the engine emits is conditioned on a user declaration.

**Two adversarial observations about the acceptance criterion itself that no one seems to have made:**

1. **P0-S2 gets easier the worse the profession performs.** Two blind architects define the band; the engine must land inside it. Wide disagreement → wide band → trivially achievable. Tight agreement → narrow band → very hard. As a research finding, "we land inside the profession's disagreement" is defensible. **As a contractual acceptance criterion it is degenerate**, because its difficulty is set by a measurement taken after the contract is signed.
2. **Ten plots in one community is low rule-diversity.** They share a DCR, so FAR, height and coverage are largely the same values across all ten. The engine can pass 8/10 by getting one document right, which evidences nothing about generalization — and can fail 8/10 for a single mis-transcribed table.

**Therefore: never accept "8 of 10 within the two-architect band" as a delivery acceptance criterion.** Accept criteria you control: M-INV 100%, M-PRV 100%, M-APP 0, M-DEF 100%, all 120 rule tests green, independent area recomputation ≤0.1%, runtime budgets met, JSON round-trip identity, invariant CI running on every documented example. Those are software properties. The band result is a *joint* research finding to be reported, not a warranty.

**Secondary non-software items that also are not the developer's risk:** UAE counsel review of the professional-use disclaimer (a §24.4 MVP checkbox), PI insurance before the first paying customer (R-07, Critical impact, Q11 due week 8), the design-partner relationship that supplies the only external data dependency, and the marketing-review process that R-11 requires and that has no named owner or cadence.

---

## 8. What I would actually say on the call

1. **Answer the question he asked.** He asked whether it is implementable, not what it costs. Answer: yes — the bottom of the stack, deterministically, and here is the exact week it becomes real.
2. **Lead with agreement.** His line — *"nothing gets done in this design unless it has a reference, and that is what distinguishes a twenty-year architect from a new one"* — is a better articulation of the product than anything in the PRD. Say so, and show him Sigma's `/sources` rule: *any inference without a `[SOURCE: id]` tag is treated as an undocumented assumption*. Same doctrine, already shipped, in Arabic, in Dubai construction.
3. **Surface the Phase 4 / Phase 0 gap on call one, not call three.** He described a design generator; his PRD funds an engine that draws nothing for 8–12 weeks and does not export DXF until Phase 1 or IFC until V4. His own document logs this as R-18. Get his reaction now.
4. **Show him the fixpoint finding and the tower-plate finding.** They are checkable in front of him in two minutes, they prove the material was actually read rather than skimmed, and they establish immediately why this needs an engineer and not another LLM pass. They are also the strongest possible evidence for the one thing he needs to believe: that a document can look this rigorous and still be missing the thing that matters.
5. **Ask, don't quote.** Budget, timeline, whether he is himself the regulatory architect (if yes, the hardest and most expensive seat is filled for free and the cost model changes completely), whether the Municipality relationship is real, which community, and who wrote the PRD.

## Risks
- Envelope solver is specified feed-forward (FR-PLT-002, line 964) but the Dubai Building Code setback rule the deck sells on slide 05 is height-dependent — a fixpoint. The PRD's only fixpoint machinery (§11.7) is scoped to occupant load and referenced only from FR-GEN-001, which is Phase 4. As specified, Phase 0 cannot compute the client's own demo example. Adds ~1 person-week plus a design decision on seed direction and threshold straddling.
- Deck slide 05's worked numbers do not reconcile: 80×40 m at FAR 5.0 gives 9.85 / 8.40 / 7.80 floors at setbacks of 7.50 / 6.00 / 5.25 m, not the stated 7.6 / 6.9 / 6.6. No constant factor reconciles the three rows. 'Converges in three passes' is not demonstrated — the sequence descends across a DBC threshold band. Same defect class the PRD says killed V1, on the marketing slide the invariant CI job does not cover.
- Appendix A — the CI-verified showcase example — rests on four un-provenanced numbers: selected tower plate 1,060 m² (the printed formula min(podium, 1,280) yields 1,280, and the row is labelled 'selected'), units per floor 4/3/1, unit NSA 70/110/160 m², core+circulation 290 m². None appear in the A.1 input table. This violates P0-S3 / M-PRV (100% provenance, CI-asserted, release blocker). Invariants pass because closure and derivation are different questions (§12.4).
- Tower plate selection has no rule basis and no Phase 0 mechanism (configurations are out of scope per §3.2), yet it is the largest lever on every headline number. Using the cap (1,280) instead of the example's 1,060 moves Band A from 15,700 to 16,000 m² and Band B from 30,540 to 36,480 m². P0-S2 therefore partly tests whether the engine guesses the same plate the architect drew.
- No functional requirement, entity, or input field anywhere in the PRD supplies unit mix, unit areas, or core/circulation allowance — yet Band C, all parking demand, NSA, both efficiency figures and INV-02/04/05/06/07 depend on them. Either §3.2's scope line is wrong or five of the eighteen invariants are dormant and the §24.1 '18 checks' checkbox cannot be ticked.
- No identity system exists in 3,587 lines: 'tenant_id' appears exactly once (line 1626), and there is no auth, user, org, session, role or permission requirement anywhere — while G4 (named reviewer on export), USER_SET provenance ('with the user's name'), FR-GOV-001 (named approver) and FR-RUL-001 AC2 (approved_by a qualified human) all require one. A 1.5–2 person-week workstream absent from the 12-week schedule.
- Engineering is under-budgeted by roughly 50%. Realistic effort is 34–42 person-weeks against the PRD's ~24 engineering person-weeks (2 engineers × 12 weeks). Weeks 11–12 are called buffer but carry the golden-set run and the design-partner sessions, so there is no real buffer. The stated escape hatch (cut to 30 rules) reduces the client's cost, not the engineering schedule.
- Principle 4 (invariant/validation module must have a different owner and no shared imports, import-linted, per FR-INV-001 AC3/AC4) is structurally unsatisfiable by a solo contractor. Must be resolved explicitly — client owns the invariant catalogue, a second engineer is contracted for 2–3 weeks, or non-compliance is disclosed in writing. Silently absorbing it breaks a stated non-negotiable principle.
- P0-S2 (8 of 10 within the two-architect band) is degenerate as a contractual acceptance criterion: its difficulty is set by a variance measurement taken after signing — wider architect disagreement makes the target easier. Compounded by low rule-diversity, since all ten golden plots sit in one community and therefore share one DCR.
- Regulatory source availability is asserted, not verified. §30.1 knows only that 'a consolidated Dubai Building Code exists'. FAR, height, coverage and plate caps live in per-community DCRs ('a different DCR for every plot' per the deck), and §30.1 item 5 confirms the affection plan is not guaranteed to carry FAR, height, or setback schedules. If the community DCR is not published in citable form, citation.document_uri cannot be populated and the evaluator refuses to load any rule.
- Basemap polygon drawing conflicts with FR-PLT-001 AC2's 2% computed-vs-stated area block. Architects hold dimensions and bearings, not coordinates; hand-tracing on satellite tiles routinely lands 2–5% off. Appendix A quietly sidesteps this by entering '80.0 × 40.0 m' as USER_SET. A dimension-and-bearing entry path is required and is not specified.
- 'Exact predicates' (§14.3) names no library and Shapely/GEOS provides none; a literal reading means CGAL or rational arithmetic. The snap tolerance is required to be 'declared explicitly' and is never given a value. The 'second independent area method' is never named — implementations range from fifteen minutes to a week. All three must be pinned in writing before quoting.
- M-RUN's byte-identical re-execution is unachievable for the PDF (WeasyPrint embeds timestamps and object IDs). Must be scoped to the structured JSON/provenance payload with pinned GEOS/Shapely versions and fixed decimal serialization, or the project fails its own release blocker on a metadata field.
- Sensitivity (±10% on every ASSUMED value), inline recompute, and the FR-DEF-002 AC4 both-treatments parking comparison require 20+ full pipeline executions inside a <10 s budget. This forces the engine to be a pure function of (inputs, rule-set version, assumptions) from day one — an architectural constraint absent from §19.1 and catastrophic to discover in week 8.
- Six named output objects have no schema: AdjudicationRecord, InvariantReport, ValidationReport, ApplicableRuleSet, CapacityBands, ParkingResult. PROVENANCE_NODE/EDGE are declared entities with no fields. All are on the critical path.
- The 'nine Principle-9 fields' are enumerated as eight in both §2.4 and FR-RUL-001 AC1; the mechanization enum only ever shows the value 'MECHANIZED' despite §24.3 requiring a mechanization rate; and whether DEFERRED is a rule_class value or an orthogonal flag is undefined. NOT NULL constraints and CI assertions cannot be written until all three are pinned.
- Halted states (REQUIRES_ADJUDICATION, IRRECONCILABLE, NON_CONVERGENT_APPLICABILITY) have no place in the §20.1 nine-step UX flow, and no estimate exists of how many adjudications a 40-rule set triggers. Each needs a screen and each blocks computation for its parameter.
- Q1 (does parking count toward FAR) is unresolved, blocking per FR-DEF-002, and swings capacity 15–35%. Regardless of the answer, AC4 requires a one-click both-treatments comparison, so a dual-scenario engine must be built either way.
- Non-software dependencies the contractor cannot carry but will be judged on: 10 land packs from one unnamed developer (A1 known-doubtful per §30.1 item 5), 3 contracted architects for variance plus 2×10 golden-set computations, 40 authored rules at R-05's honest 3–5× slow rate, UAE counsel review of the disclaimer, and PI insurance before the first paying customer.
- Expectation gap is the top engagement risk: the client verbally described a design generator ('it does the design for me, itself') and his diagram ends at BIM/CAD output, while Phase 0 draws nothing, exports JSON+PDF only, defers DXF to Phase 1 and IFC to V4. His own PRD logs this as R-18. If not surfaced on call one, the engagement fails at delivery regardless of build quality.

## Questions for the client
- Which Dubai community and which land-use slice is 'the one community'? It is never named in the PRD, and rule authoring, the land packs and the golden set all depend on it.
- Can you put the actual governing instruments in front of me — the community DCR, not just the Dubai Building Code — with page and clause references? §28.1 calls regulatory source documents 'published, low difficulty, blocking' with no evidence, and every rule needs a citation.document_uri that resolves or the evaluator refuses to load it.
- Are you yourself the licensed regulatory architect the PRD staffs at 1.0 FTE with veto over rule publication? If yes, the hardest seat is filled and the cost model changes completely. If no, who is, and are they committed from week 1 — R-13 calls this the schedule's binding constraint.
- Do the ten land packs exist and are they secured? Have you opened any of them to check they carry FAR, height and setbacks? §30.1 item 5 says the affection plan is not guaranteed to carry them, so A1 is not merely untested — it is doubtful, and the kill threshold is <5 of 10.
- Q1: does parking count toward FAR in this slice? If unresolved by week 2 it stays a permanent per-project user declaration, and either way FR-DEF-002 AC4 requires the engine to compute both treatments — confirm you want the dual-scenario comparison built in Phase 0.
- Where do the unit mix, unit areas and core/circulation allowance come from? Appendix A uses 8 units per floor (4/3/1) at 70/110/160 m² with 290 m² of core — none of it in the input table, and no FR anywhere supplies it. Parking demand, Band C, NSA and five of the eighteen invariants all depend on it.
- Slide 05's setback-versus-floor-count iteration is your headline differentiator, but FR-PLT-002 specifies a one-pass pipeline with no iteration, and the slide's own numbers do not reproduce from an 80×40 m plot at FAR 5.0. Is the height-dependent setback in Phase 0 scope? It should be — but it is unbudgeted work and needs a declared tie-break at the threshold.
- Appendix A's tower plate of 1,060 m² does not follow from its own printed formula (min(podium, 1,280) = 1,280) and appears in no input table. Who chooses the tower plate — a rule, the user, or an assumption? It moves Band A by 300 m² and Band B by nearly 6,000 m² on this plot.
- Is Phase 0 an internal tool for your practice, or a multi-tenant SaaS with design partners and paying customers? The PRD assumes the second — a CEO, investors, PI insurance, tenancy — while everything you said verbally is first-person practitioner. It changes auth, tenancy, hosting and roughly a third of the scope.
- There is no authentication, user or permission requirement anywhere in the PRD, but four of your gates require a named human (named reviewer on export, named approver on rules, USER_SET showing the user's name). How much identity do you actually need in V0 — a single shared login, or real users and roles?
- What is the budget, and what is the deadline? Neither appears anywhere in the PRD, the deck, the chat or the voice notes. Your own kill criteria warn that knowledge-base cost may run ~3× budget — against a budget that has never been stated.
- Principle 4 requires the invariant and validation modules to have a different owner from the capacity engine, import-linted. One developer cannot satisfy that. Do you want to own the invariant catalogue and its expected values yourself, fund a second engineer for two to three weeks, or accept a written disclosure that owner-independence is not met?
- Will you accept acceptance criteria I control — M-INV/M-PRV/M-DEF 100%, M-APP 0, 120 rule tests green, ≤0.1% area agreement, runtime budgets, JSON round-trip — with the 8-of-10 architect-band result reported as a joint research finding rather than a warranty? Its difficulty is set by a variance measurement taken after we sign.
- What do you actually need to see in week 12 to call it real? Phase 0 exports JSON and PDF only — no DXF until Phase 1, no IFC until V4. Your own stack diagram ends at BIM/CAD output, and for eight to twelve weeks you will receive nothing you can open in your own software.
- Who wrote the PRD and the deck, and has any engineer reviewed them before me? You mentioned trying it on Claude, and the document describes itself as a red-team review of a V1 whose worked examples it withdraws as arithmetically invalid. It changes whether I am critiquing your reasoning or a machine's.
- Is the Dubai Municipality relationship real and warm, or aspirational? You spoke about it as routine; the PRD classes that data as Tier 2/3, 'requires relationship' and 'do not plan around', at High risk. If your access is genuine it is an asset the document does not know about and it materially de-risks Phase 2.
- Which American tools do you mean when you say they haven't reached what you're thinking of? Naming them tells me whether your differentiator survives contact with TestFit, Delve, Spacemaker or Digital Blue Foam — and it sets the ambition and price anchor.
- Who owns the authored rule base? The PRD names it as the moat, it is the most valuable thing Phase 0 produces, and nothing is signed — no NDA, no engagement letter, no IP terms.
