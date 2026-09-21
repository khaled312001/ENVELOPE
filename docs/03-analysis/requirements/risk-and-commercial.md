# Risk, governance, commercial posture and data dependencies — ENVELOPE PRD v2 (§2, §20–21, §25–34) + Investor Deck

> Source: ENVELOPE_PRD_v2 / Deck / client comms. Auto-extracted reference — verify against the original PDFs before quoting a threshold.

## Sources

- `E:\ENVELOPE\_client_material\extracted\ENVELOPE_PRD_v2.txt` (3,587 lines, PDF-to-text; multi-column tables are column-interleaved in the extraction)
- `E:\ENVELOPE\_client_material\extracted\ENVELOPE_Deck.txt` (230 lines, 12 slides, read in full)

**Reconstruction note:** §21.1, §21.2, §26, §27, §28.1 and §33 are multi-column tables whose columns were flattened out of row order by the PDF extractor. I re-paired them by preserved intra-column ordering and cross-validated every pairing against independent statements elsewhere in the document (§2.3, §3.5, §5.4, §7.6, §23.1, §31). Every pairing below that I could cross-check is confirmed; the three I could not fully confirm are called out in Open Items.

---

# 1. Product Strategy (§2)

**§2.1 Strategic position**
- Core asset / wedge: *"A versioned, cited, human-approved, machine-executable model of Dubai development regulation, plus a deterministic geometry engine that can construct from it, not merely check against it."*
- Expansion claim: "Defensible capacity in minutes, with every number traceable."
- Moat, ascending durability: Configurations → precedent intelligence → document automation → generation → optimization. Stated as: *typology library < precedent corpus < executable rule base < approval-outcome feedback loop.*
- **Explicit non-moat: the LLM, the UI, the optimizer. "All commodity."** (Deck slide 11 repeats: "Not a moat: the model, the interface, the optimiser. All commodity. We are not betting on any of them.")

**§2.2 The three claims that must never be conflated** (actually five states; the table lists claim → supportable?):
| Claim | Meaning | Supportable? |
|---|---|---|
| Self-consistency | Configuration satisfies the constraints we encoded, and its arithmetic closes | **Yes, from Phase 0** |
| Rule coverage | The constraints we encoded are the ones that apply | **Partially; quantified and disclosed** |
| Professional agreement | A qualified architect would produce a comparable answer | **Measured, not asserted (§22)** |
| Regulatory validity | The authority would approve it | **Never claimed. Not obtainable.** |

Principle 7 (non-negotiable): "the validator agreeing with the generator is self-consistency, nothing more. No output, no report, no marketing material may describe it as compliance."

**§2.3 Phase gating — ships to real users before next phase begins**
| Phase | Name | Duration | Ships to |
|---|---|---|---|
| 0 | Proof of Engine | 8–12 weeks | 1–2 design partners, **free** |
| 1 | Development Configuration Engine | 10–14 weeks | **3–5 paying customers** |
| 2 | Precedent Intelligence | 12–16 weeks | Same, as upgrade |
| 3 | AI Document Understanding | 10–12 weeks | Same, reduces onboarding cost |
| 4 | AI Generation | 16–20 weeks | Gated on architect panel |
| 5 | Full Optimization | 12–16 weeks | Gated on Phase 4 |

Cumulative to full vision: **~18–24 months** (vs. V1's 11-month estimate; difference attributed to honesty about the knowledge-authoring workstream and sequencing dependencies).

**§2.4 The 10 non-negotiable principles and their *mechanical* enforcement** (this is the compliance surface a contractor must build to):
1. Precedent is evidence not authority — *type-level: `PrecedentObservation` cannot appear in a `ConstraintSet` derivation path; CI assertion*
2. Every output traces to rule/assumption/objective/precedent — *provenance class non-nullable on every emitted value; CI assertion*
3. Every emitted configuration passes an invariant/conservation layer — *§12; fails the build and blocks emission*
4. Invariant layer independent of generator — *separate module, separate owner, no shared imports; **import linter***
5. Hard constraints separated from soft preferences — *distinct types; hard constraints are feasibility filters, never penalty terms*
6. Five distinct capacity concepts, never merged — *each has its own field and derivation*
7. Never claim compliance because the validator agrees — *report template makes the distinction structural*
8. Distinguish self-consistency / rule coverage / geometric validity / regulatory validity / professional agreement — *reported as five separate statements (§16.5)*
9. Every rule carries source, citation, effective date, jurisdiction, applicability, version, approval, provenance — *schema: all NOT NULL*
10. Shared assets versioned and approval-controlled — *§21.2*

**§1.3 dependency argument (the whole thesis):** Phase 5 optimization needs a trustworthy generator → Phase 4 generation needs constraints that are both checkable *and constructive* → Phase 3 extraction needs a rule model to extract INTO + review workflow → Phase 2 precedent needs a deterministic baseline to calibrate AGAINST → Phase 1 configurations need a capacity engine to configure WITHIN → Phase 0 capacity engine "needs nothing but geometry, rules, and arithmetic." *"Each arrow is a hard technical dependency, not a preference."*

---

# 2. UX Flow (§20)

**§20.1 Phase 0 flow — 9 steps, 3 embedded gates**
1. PLOT — form + boundary draw + edge classification
2. PARAMETERS — FAR, height, coverage, plate cap
3. RULES — + parking-in-FAR declaration (**blocking, no default**)
4. ASSUMPTIONS — applicable set, citations, inclusions/exclusions **[ack gate]**
5. CAPACITY — register, sensitivity-ranked, editable **[ack gate]**
6. PARKING — bands A/B/C, governing band, binding constraints
7. CHECKS — demand, area, levels, headroom
8. EVIDENCE — invariants → validation → five-way claim statement
9. EXPORT — provenance tree, click-through from any number; PDF + JSON **[reviewer gate]**

Steps 1–4 sequential and gated. Steps 5–9 freely navigable.

**§20.2 The three moments that carry the product**
1. The parking-in-FAR declaration (step 2) — blocking question with **no default**; "signals immediately that the system will not guess on things that matter."
2. The assumption register (step 4) — "the moment the user understands this is not magic." Non-skippable, sensitivity-ranked, inline-editable.
3. Click-through provenance (everywhere) — "Every number is a link. This is the interaction that converts a skeptical architect."

**§20.3 Uncertainty as a first-class visual state** ("Uncertainty is not a tooltip."):
| State | Treatment |
|---|---|
| DERIVED | Neutral, citation superscript |
| ASSUMED | Amber background, dotted underline, pencil affordance |
| USER_SET | User badge |
| OBSERVED | Distribution sparkline with n |
| VARIANCE | Red border, evidence link |
| Deferred / not assessed | Grey, hatched, "not assessed" label |

**§20.4 Role lenses (Phase 1):** role affects *presentation order only*. Development director sees GFA, unit count, value proxy first; architect sees efficiency, aspect ratios, core relationships first. Same computation, same ranking. **"Divergent rankings by role would be a defect."**

---

# 3. Human Approval Gates (§21) — there are SIX run gates (G1–G6), not five

**§21.1 Run gates**
| Gate | Actor | Blocks | Phase |
|---|---|---|---|
| **G1** Plot & parameter confirmation | User | Rule resolution | 0 |
| **G2** Rule set acknowledgement | User | Capacity computation | 0 |
| **G3** Assumption register acknowledgement | User | **Any export** | 0 |
| **G4** Named reviewer on export | User | External sharing | 0 |
| **G5** Brief contradiction resolution | User | Configuration enumeration | 1 |
| **G6** Variance review | **Second user** (tenant-configurable; default ON for multi-seat) | Variance application | 1 |

Four of the six gates are Phase 0 (G1–G4); G5–G6 arrive in Phase 1. G6 is the only gate requiring a *second* human.

**§21.2 Shared-asset gates — "the gates V1 missed"** — higher blast radius than run gates "because they affect every customer at once."
| Asset | Approver | Why it needs a gate |
|---|---|---|
| Rule publication | Qualified regulatory architect | Legal consequence |
| Life-safety rule | **+ fire/life-safety specialist (second reviewer)** | Highest-consequence class |
| Default assumption values | Regulatory architect + product | "Changing a default bay-area factor silently changes every customer's capacity" |
| Metric definitions annex | Architect + design-partner sign-off | Root of every computed value |
| Typology library entries | Regulatory architect | Each is a design assertion shipped to every customer |
| Objective normalization functions | Product + development director | Determines rankings |
| Deferred / non-mechanizable classification | Regulatory architect | "Determines what the report claims **not** to have checked — a liability statement" |
| Adjudication records (§11.6) | Regulatory architect | Resolves conflicts that have no defined order |
| Design-space distinctness threshold | Computational design lead | Determines what users see as "different options" |

**Every one is versioned, changelogged, and triggers impacted-run identification within 24 h. Past runs are never mutated.** (FR-GOV-001; risk R-14.)

---

# 4. Risk Register (§25) — ALL 18 rows, complete

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| **R-01** | Team builds generation first because it demos well | High | **Critical** | Phase gating with dependency argument (§1.3); Phase 0 must ship before Phase 1 starts | Product |
| **R-02** | Land packs lack FAR / height / setbacks | High | High | Measured in Phase 0 as a deliverable; blocking OPEN state rather than silent default; **if <5/10, the product's first job is data assembly — a different product** | Product |
| **R-03** | Inter-architect variance > 10% | Medium | High | Measured week 1; if high, reposition from "accurate" to "consistent and auditable" **before marketing** | Product |
| **R-04** | Mechanization rate < 50% | Medium | High | Measured on first 40 rules; re-scope to a smaller, better-defended parameter set | Reg. Architect |
| **R-05** | Rule authoring slower than 4/day on complex rules | High | High | Measured; first 40 rules run **3–5× slow** because schema is co-designed. **Budget 14–18 architect-weeks for 300 rules, not 6–10** | Reg. Architect |
| **R-06** | Public precedent data lacks NSA, mix, permitted FAR | High | High | Stated as expected (§17.1); Path B partner portfolios are the primary Tier B source; `INSUFFICIENT_PRECEDENT` degrades gracefully | Data Lead |
| **R-07** | Professional liability | **Low** | **Critical** | Disclaimers, **PI insurance before first paying customer**, human gates, five-way claim statement, marketing review on the same footing as product | CEO / Counsel |
| **R-08** | Precedent corpus copyright exposure | Medium | High | Licence gate on ingestion owned by a **named person**; no scraping of marketed plans | Data Lead |
| **R-09** | Nested optimizer misses runtime budget by 10× | High | Medium | Enumeration in Phase 1 defers the problem entirely; §8.4 costs it honestly before Phase 5 design is chosen | Comp. Design Lead |
| **R-10** | Geometric degeneracy produces a plausible wrong answer | Medium | High | Exact predicates; double area computation; degenerate results **raise rather than return**; invariant layer | Eng Lead |
| **R-11** | Users read self-consistency as compliance | High | **Critical** | Five-way claim statement verbatim in every report; marketing prohibition; disclaimer | Product |
| **R-12** | Assumption treated as fact | High | High | Amber everywhere, non-skippable register, quantified sensitivity | Design |
| **R-13** | Regulatory architect hiring is the schedule's binding constraint | High | High | Recruit **before** engineering ramp; **founding-team role, not a hire** | CEO |
| **R-14** | Shared-asset change silently alters every customer's numbers | Medium | High | FR-GOV-001; impacted-run notification; past runs never mutated | Eng Lead |
| **R-15** | Non-scalar conflicts resolved arbitrarily at runtime | Medium | Medium | §11.6: `REQUIRES_ADJUDICATION` **halts rather than guesses** | Reg. Architect |
| **R-16** | Occupant-load fixpoint fails to converge | Low | Medium | §11.7: bounded at **5 iterations**, conservative seed, user declaration on non-convergence | Comp. Design Lead |
| **R-17** | Road hierarchy layer unavailable for automated edge classification | Medium | **Low** | Phase 0 makes edge classification **manual**; automation is a Phase 3+ convenience, not a dependency | Data Lead |
| **R-18** | Customers reject Phase 0 as "just a calculator" | Medium | High | Tested in Phase 0 with design partners; the CEO brief (§34, cited in-text as §31) is the counter-argument; **if true, accelerate Phase 1** | CEO |

**Severity concentration:** three Critical-impact risks — R-01 (build order), R-07 (professional liability), R-11 (self-consistency misread as compliance). Two of the three are *positioning/communication* risks, not engineering risks. Owner load: Product 4, Reg. Architect 3, Data Lead 3, CEO 3 (+1 shared w/ Counsel), Eng Lead 2, Comp. Design Lead 2, Design 1.

---

# 5. Kill / Re-scope Criteria (§26) — 9 criteria, "agreed in advance so they are evidence-triggered, not argued"

| # | Finding | Threshold | Action |
|---|---|---|---|
| 1 | Inter-architect variance | **> 10%** | "Accuracy is not the value proposition. Reposition around consistency, explicitness and auditability. **Rewrite marketing before shipping.**" |
| 2 | Mechanization rate on first 40 rules | **< 50%** | "The compliance surface is too thin to claim coverage. Re-scope to a narrower, better-defended parameter set and **reduce the claimed rule count publicly**." |
| 3 | Rule authoring throughput on complex rules | **< 4/day** | "Knowledge-base cost is ~3× budget. Either **raise on that basis** or narrow the jurisdiction slice further. Do not proceed on the original estimate." |
| 4 | Land packs containing FAR + height + setbacks | **< 5 of 10** | "The input model is wrong. The product's first job is **data assembly, not computation** — that is a different product and needs a different plan." |
| 5 | Users opening the provenance tree | **< 1 of 3 sessions** | "**The trust thesis is wrong.** Everything downstream of §13 needs re-examination before Phase 1." |
| 6 | Engine within two-architect band | **< 6 of 10** | "**Do not ship.** Diagnose whether it is rules, geometry, or definitions. Fixing the wrong one wastes a quarter." |
| 7 | Phase 2 backtest coverage or sharpness | **Either missed** | "Historically-observed capacity does not ship. Keep the user-entered discount." |
| 8 | Phase 4 architect panel | **< 60%** | "**Phase 4 does not ship.** Phases 0–3 remain the product. **Pre-authorized.**" |
| 9 | Phase 1 enumeration insufficient at production granularity | **Not demonstrated** | "Phase 5 search does not begin. Enumeration stays." |

Cross-validation: #6 is the inverse of success criterion P0-S2 (8 of 10 plots); #5 is the inverse of P0-S6 (≥2 of 3 sessions); #8 is confirmed verbatim in §7.6 ("If P4-S3 lands below 60%, Phase 4 does not ship... This deferral is authorized here, in advance, so it is not a schedule argument later"); #7 maps to §5.4 gates; #9 maps to §8.3 ("Absent that evidence, enumeration stays").

**Note the asymmetry:** criteria 1–6 fire inside Phase 0 (weeks 1–12) and four of them change *marketing/positioning* or *budget*, not the code. Only #6 stops the ship.

---

# 6. Open Questions (§27) — Q1–Q13 with owner, deadline, consequence

| ID | Question | Owner | Needed by | Consequence if unresolved |
|---|---|---|---|---|
| **Q1** | Does parking count toward FAR in the target jurisdiction slice? | Reg. Architect | **Phase 0 wk 2** | Changes capacity **15–35%**. Currently OPEN REGULATORY QUESTION and **blocking per FR-DEF-002** |
| **Q2** | What are typical FAR values for target plots? | Product | Phase 0 wk 1 | "If FAR is 3–5, a 2,000 m² plot is a small point block, not a tower — and much of the generation machinery targets the wrong problem size" |
| **Q3** | Inter-architect variance on envelope and capacity? | Reg. Architect | Phase 0 wk 2 | Sets the accuracy target and the marketing claim |
| **Q4** | What fraction of the governing residential-tower rule set is mechanizable? | Reg. Architect | Phase 0 wk 8 | **Sizes the whole business** |
| **Q5** | Do land packs actually contain FAR, height and setbacks? | Product | Phase 0 wk 3 | Tests assumption A1 |
| **Q6** | Does a road-hierarchy GIS layer exist and join cleanly to cadastral edges? | Data Lead | Phase 3 | Determines whether edge classification can ever be automated |
| **Q7** | Will developers pay for Phase 0 capacity alone? | CEO | Phase 0 wk 10 | Validates or invalidates the phase-gating strategy |
| **Q8** | Do public municipal datasets carry NSA, unit mix, or permitted FAR? | Data Lead | Phase 2 start | Determines whether Path A can support calibration at all — **expected answer is no** |
| **Q9** | What is the real distribution of achieved vs. permitted FAR? | Data Lead | Phase 2 | The core calibration parameter |
| **Q10** | Is exhaustive enumeration sufficient at production granularity? | Comp. Design Lead | Phase 1 end | Determines whether Phase 5 is needed at all |
| **Q11** | What PI insurance is obtainable, at what premium, for this description of product? | CEO | Phase 0 wk 8 | Could change positioning or pricing |
| **Q12** | How frequently do the governing instruments actually change? | Reg. Architect | Phase 1 | Sizes maintenance and the durability of the moat |
| **Q13** | Do customers accept a set of options, or demand a single answer? | Product | Phase 1 | Shapes the recommendation UX |

Cross-validation anchors: A5 states "Q1, week 2"; A15 states "Q11, Phase 0 week 8"; A13 states "Q12 — measure actual change frequency". All three confirm the column pairing.

**Seven of thirteen questions are due inside Phase 0 (Q1–Q5, Q7, Q11).** Q1 is the only one flagged *blocking* at the requirement level.

---

# 7. Assumptions (§31) — A1–A18, with test and consequence-if-false

### §31.1 Dangerous — test in Phase 0
| ID | Assumption | Why dangerous | Test | If false |
|---|---|---|---|---|
| **A1** | Design-partner land packs contain FAR, height and setbacks | The entire input model depends on it | Phase 0 §23.3 — count of 10 | "Product's first job is data assembly, not computation. **Different product, different plan.**" |
| **A2** | Two qualified architects agree within **~5%** on a buildable envelope | Sets the accuracy target and the marketing claim | **Week 1, three plots, three architects** | Reposition from "accurate" to "consistent and auditable" **before any marketing** |
| **A3** | **50%** of governing residential-tower rules are mechanizable | Sizes the whole business | First 40 rules | Narrow the parameter set; **reduce claimed coverage publicly** |
| **A4** | Rule authoring reaches **8+/day** after the schema stabilizes | **3× cost swing** | Measured throughput by complexity class | Budget **14–18 architect-weeks per 300 rules**; raise on that basis |
| **A5** | Parking has a determinable, citable treatment under FAR | **15–35% capacity swing** | Q1, week 2 | Stays OPEN REGULATORY QUESTION **permanently**; user declares per project |
| **A6** | Users will engage with provenance rather than treating output as an oracle | The trust thesis | Session observation | **Re-examine everything downstream of §13** |

### §31.2 Significant — test in Phases 1–2
| ID | Assumption | Test | If false |
|---|---|---|---|
| **A7** | Developers will pay for capacity computation alone | Phase 0 design-partner conversion | Accelerate Phase 1; Phase 0 becomes an internal foundation rather than a product |
| **A8** | Exhaustive enumeration over 4–6 typologies is sufficient at production granularity | Phase 1 measurement | Phase 5 becomes necessary; budget §8.4 mitigations |
| **A9** | 2–3 developer partners will contribute historical portfolios under contract | Phase 2 partnership effort | Tier B unavailable; historically-observed capacity does not ship; USER_SET discount persists |
| **A10** | Public municipal data **lacks** NSA, mix and permitted FAR | Phase 2 profiling | **"Good news"** — Path A becomes viable for calibration and Phase 2 accelerates |
| **A11** | Curated parametric typologies capture the majority of viable residential-tower configurations | Architect review, Phase 1 | Typology library must expand substantially, or free-form generation becomes necessary **far earlier than planned** |
| **A12** | Standards hard/soft classification can be elicited in a **single onboarding session** | Phase 1 onboarding | Onboarding cost rises materially; **may need to be billable** |

(Note A10 is stated as a *negative* assumption — the plan is built on public data being inadequate, so being wrong is upside.)

### §31.3 Structural — carried, monitored
| ID | Assumption | Monitoring |
|---|---|---|
| **A13** | Dubai's regulatory framework is stable enough that a rule base retains value between updates | Q12 — measure actual change frequency |
| **A14** | A qualified regulatory architect is hirable as a full-time founding-team member | Hiring pipeline; **this is the schedule's binding constraint (R-13)** |
| **A15** | Professional indemnity insurance is obtainable for this product description at a viable premium | Q11, Phase 0 week 8 |
| **A16** | Approval-outcome data will eventually be capturable from customers, making it the durable moat | Instrument from Phase 1 even though nothing uses it until much later |
| **A17** | Non-convex plot geometry can be addressed in Phase 4 without invalidating the Phase 0 kernel | Design review before Phase 4 |
| **A18** | Architects will act as a distribution channel rather than resisting the product | Phase 1 shared-link engagement |

### §31.4 The V1 assumptions now surfaced and rejected
| V1 silent assumption | Status in V2 |
|---|---|
| The affection plan carries development parameters | **Rejected. Known false** (§30.1 item 5). `CRITICAL_INPUT_GAP` handling |
| Municipal data will supply efficiency and permitted FAR | Rejected. Expected false (A10). Path B is the primary Tier B source |
| A "realistic" capacity band could be produced at MVP | Rejected. Removed by schema until §5.4 gates are met |
| Every rule can be made constructive | Rejected. Three rule classes (§11.3) |
| "Most restrictive wins" is universally defined | Rejected. Undefined for enums and topological rules (§11.6) |
| The validator agreeing with the generator means compliance | Rejected. Five-way claim statement (§16.5) |
| MVP in 6 months | Rejected. Phase 0 in 8–12 weeks; full vision 18–24 months |

---

# 8. Corrections Applied from Red Team (§29) — all 19

| # | Issue | Resolution | Section |
|---|---|---|---|
| 1 | "100% run reproducibility" impossible | Replaced with **immutable run reproducibility** — outputs and provenance always retrievable and recomputable from persisted artifacts; pipeline re-execution explicitly not guaranteed | §13.4 |
| 2 | No invariant layer | Added: **18 conservation checks**, independent module, blocks emission, runs on documentation examples | §12 |
| 3 | Area terminology undefined | **MetricDefinition annex as FR-DEF-001, signed week 1**, root dependency, cited in every report | §9.1, §10.2 |
| 4 | Parking-in-FAR unstated | Explicit OPEN REGULATORY QUESTION; blocking user declaration; both scenarios computable; **never ASSUMED** | FR-DEF-002 |
| 5 | "Realistic band" without data | Removed from Phases 0–1 **by schema**. Replaced with USER_SET discount. Reintroduced in Phase 2 only under n≥8 + coverage + sharpness gates | §15.3, §5.4 |
| 6 | DSL premature | Typed rule records + evaluator registry **capped at 12**; DSL extraction at ~rule 100 | §11.1 |
| 7 | Over-engineered infrastructure | **Microservices, Temporal, Redis, pgvector, graph DB removed from Phase 0** with named reintroduction conditions | §19.2 |
| 8 | Geometry generality assumed | Phase 0 restricted to rectilinear / simple convex, enforced via `shape_class` at the data layer | §14.1 |
| 9 | NSGA-II / CP-SAT premature | Removed from Phases 0–1; enumeration instead; introduced in Phase 5 only on evidence | §4.3, §8.3 |
| 10 | "All rules constructive" impossible | Three rule classes: `GENERATIVE`, `FILTERING`, `EVALUATIVE_ONLY`, plus `DEFERRED` | §11.3 |
| 11 | Occupant-load circularity unresolved | Bounded monotone fixpoint: conservative seed, convergence on rule-set identity, **5-iteration bound**, user declaration on non-convergence | §11.7 |
| 12 | Non-scalar conflicts undefined | Partial order per parameter type; `REQUIRES_ADJUDICATION` halts and demands a versioned human adjudication record; `IRRECONCILABLE` reports infeasibility | §11.6 |
| 13 | Similarity undefined | Three stages: regime gate, per-domain faceted vector, transferability. **No composite headline percentage** | §17.4 |
| 14 | Confidence uncalibrated | Two labels: `CALIBRATED_CONFIDENCE` (may gate) and `HEURISTIC_CONFIDENCE` (display only, **never gates**) | §6.5 |
| 15 | No shared-asset gates | FR-GOV-001 covering rules, defaults, definitions, typologies, normalizations, deferred classifications, adjudications, distinctness thresholds | §21.2 |
| 16 | Worked examples arithmetically invalid | **All V1 examples withdrawn.** New example derived from first principles and CI-verified against the invariant layer | Appendix A |
| 17 | Backtest coverage gameable | Paired with a sharpness requirement | §5.4, §22.4 |
| 18 | Distinctness in objective space | Corrected to **design space** | §18.3 |
| 19 | Validator independence oversold | §16.4 states the honest limit; five-way claim statement replaces "0% violations = compliant" | §16.4, §16.5 |

---

# 9. Data Acquisition Plan (§28) — dependencies and which are blocking

### §28.1 By phase (12 dependencies)
| Phase | Needed | Source | Difficulty | **Blocking?** |
|---|---|---|---|---|
| 0 | 10 land packs, one community | Design partner | Low | **YES — but one relationship** |
| 0 | Regulatory source documents | Published | Low | **YES** |
| 0 | Basemap tiles | Commercial | Low | No |
| 0 | 2× architect computations ×10 | Contracted architects | Low | **YES** |
| 1 | Developer standards documents | Customer | Low | No |
| 1 | Unit-type dimensional library | Architect-authored | Medium | **YES (Phase 1)** |
| 1 | Typology library (4–6) | Architect-authored | Medium | **YES (Phase 1)** |
| 2 | Public permit / building datasets | Municipal open data, commercial licence | Medium | No |
| 2 | Partner project portfolios | 2–3 developer partners | **High (relationship)** | **YES for Tier B** |
| 2 | Cadastral plot geometry | Licensing | Medium | No — manual fallback |
| 3 | Extraction gold sets | Internal labelling | Medium | **YES (Phase 3)** |
| 4 | Approved floor plates (Tier A) | Partner or municipal | **Very high** | No — Phase 4 does not depend on it |

**Six blocking dependencies total.** Three block Phase 0 (land packs, regulatory documents, contracted architect computations) — and §23.1 states the *total external* data dependency for Phase 0 is "**ten land packs from one friendly developer. No municipal [data]**". Two block Phase 1 (unit-type dimensional library, typology library) — both are *internally authored*, so they are staffing dependencies not acquisition dependencies. One blocks Tier B precedent (partner portfolios, High/relationship difficulty).

### §28.2 Minimum viable precedent dataset (Phase 2) — two parallel paths
- **Path A (breadth):** 300 Dubai residential towers approved since 2010, **ten fields** — plot reference, community, approval date, land use, plot area, built-up area, floors above, floors below, unit count, parking bays. Sufficient for density, floor-count and parking-ratio benchmarking. **Not sufficient for efficiency or achieved-vs-permitted FAR.**
- **Path B (depth):** from **2–3 developer partners, 40+ projects** with additionally permitted FAR, NSA, unit mix, achieved efficiency. *"This is the only realistic source of Tier B, and Tier B is what makes the historically-observed capacity concept credible."*
- **If Path B fails:** historically-observed band does not ship; users keep the USER_SET realism discount; benchmarking still works on Path A fields. *"The product degrades; it does not break. This is designed-in, not improvised."*

### §28.3 What to ask a municipality for, in order
- **Tier 1 (likely obtainable):** bulk/API access to published permit, building summary, floor-level, building usage and project datasets with a **commercial licence permitting derivative analytical use**; schema documentation; historical depth; licence clarification for a commercial derivative product; plot-level cadastral geometry under licence.
- **Tier 2 (requires relationship, transformative):** approved GFA and permitted FAR per project; unit schedules and mix; structured setback and height conditions per plot; aggregated approval-cycle statistics; anonymized variance/exemption grant statistics by parameter.
- **Tier 3 (long horizon, do not plan around):** approved drawing files; review comment text; submission→revision→approval sequences.
- **"Do not make any roadmap contingent on Tier 2 or Tier 3."**

### §28.4 Licensing discipline
Licence review is **a gate on ingestion, owned by a named person, before any record enters the corpus — not a cleanup task.** Marketed floor plans, broker listings and consultant drawings are protected works. *"Scraping them creates exposure that surfaces at diligence."* (= R-08.)

---

# 10. Commercial Roadmap (§33) — V0 → V4

| Release | Phase | Duration | Capability | **Commercial posture** |
|---|---|---|---|---|
| **V0** | 0 | 8–12 wk | Deterministic capacity engine with provenance | **1–2 design partners, free** |
| **V1** | 1 | +10–14 wk | Configurations, standards, brief, objectives, comparison | **3–5 paying customers** |
| **V1.5** | 3 | +10–12 wk | AI document extraction with human review | **Onboarding cost halved** |
| **V2** | 2 | +12–16 wk | Precedent, similarity, benchmarking, historically-observed capacity (gated) | **Upgrade; approval-outcome instrumentation begins** |
| **V2.5** | 4 | +16–20 wk | Massing, core, floorplate, typical floor (gated on architect panel) | **Premium tier** |
| **V3** | 5 | +12–16 wk | Multi-objective optimization, Pareto, weight sensitivity (**only if enumeration proves insufficient**) | **Enterprise** |
| **V4** | — | — | Second jurisdiction; commercial and mixed-use typologies; **IFC export**; approval-risk model | **Expansion** |

**Deliberate re-ordering:** Phase 3 ships *before* Phase 2 (V1.5 before V2). Rationale: "AI extraction is placed earlier than precedent because it reduces onboarding cost immediately and has **no external data dependency**, whereas Phase 2 is gated on partner portfolio acquisition whose timeline is outside our control. Either order works; this one de-risks the schedule."

**Second-jurisdiction discipline:** "The second jurisdiction is a V4 decision. Every jurisdiction is a full rule-base build plus a precedent corpus. **Expanding geographically before Dubai is profitable multiplies the largest cost in the business before proving it can be recovered.**"

**Monetization arc read plainly:** free → seats → cost-reduction upsell → data upgrade → premium tier → enterprise → geographic expansion. There is **no stated price point anywhere in either document** — only customer counts and tier names.

---

# 11. CEO Brief (§34) — the anti-"it's a calculator" argument

One-sentence version: *"we are not building a calculator — we are building the machine-readable model of Dubai development regulation that every later stage of the product computes against, and the capacity output is simply the first thing that model is capable of producing."*

**The market claim (repeated on Deck slide 02):** today "what can I build here?" is a **two-to-six-week consultant exercise costing AED 50,000–250,000** producing **one** answer with undocumented assumptions. After Phase 0: **ten seconds**, every number linked to the clause that produced it.

**Four Phase-0 assets, "none of which is a calculation":**
1. **Executable model of Dubai development regulation** — "This is the moat. It takes an architect months to build, it cannot be bought, and every regulatory change we absorb widens the gap against a new entrant starting from zero."
2. **Deterministic geometry engine that constructs from rules** — "A checker turns a setback into a test. We turn it into a generator of buildable volume."
3. **Provenance system** — "cannot be added later... retrofitting it means rewriting every layer. Building it in Phase 0 is the difference between a product an investment committee can rely on and a black box they cannot."
4. **Invariant layer** — "Our own earlier specification contained a worked example claiming a tower with **three times more units than its floor area could hold**, and nothing caught it."

**Why not build AI generation first:** "you cannot evaluate whether a generated building is good until you can compute, exactly and defensibly, what volume it is allowed to occupy. You cannot calibrate a precedent-based estimate without a deterministic estimate to calibrate against. You cannot review an AI-extracted rule without a rule model to review it into... **Building them out of order means building them twice.**"

**Sales argument for V0 standalone:** "A developer deciding whether to bid on land needs a capacity number they can defend to their board on Thursday... **No developer in Dubai has that today. It is a product, not a milestone.**"

**The four measurements (§32.4), "arguably worth more than the software":** inter-architect variance; mechanization rate; rule-authoring throughput by complexity class; land-pack completeness rate. *"We can commit to the eighteen-month plan honestly only after we have those four numbers. **Twelve weeks to de-risk two years is the cheapest option available to us.**"* And: *"A Phase 0 that ships perfect software and measures none of these has failed."*

---

# 12. Deck (`ENVELOPE_Deck.txt`) — 12 slides, what it commits to publicly

1. **Title** — "AI Development Capacity & Design Generation Engine / ENVELOPE. What can be built on this plot — answered in minutes, with every number traceable. Dubai residential towers · Phase 0 to Phase 5 · Confidential"
2. **The Problem** — 2–6 weeks to a first capacity answer; AED 50k–250k per feasibility study; **one** option explored "out of hundreds"; **zero citations**. "An efficiency percentage typed into a spreadsheet becomes a fact in the pro forma."
3. **The Opportunity** — page counts stated as facts: **Dubai Building Code 843 pages** (Parts A–K), **UAE Fire & Life Safety Code 707 pages**, Development Control Regulations *per plot*, developer standards/RFPs *per client*. **"1,550 pages of shared rules — plus a different DCR for every plot."** Footnote: "Page counts from the Dubai Building Code 2021 Edition and the UAE Fire and Life Safety Code of Practice **as supplied**." Argument: "No consultant reads all of it on any project. They apply the subset they remember... nobody can prove which subset was used."
4. **Product Vision** — INPUTS (Plot → Regulations → Developer standards → RFP → Precedents) → GENERATE → OPTIMIZE → VALIDATE → EXPLAIN. "Most tools start at the middle of this pipeline, because they need a design to already exist." Footer: "Precedents inform the answer. They never authorise it — a previously approved scheme is evidence, not permission."
5. **What Makes ENVELOPE Different** — checker vs. engine ("Is this setback at least 5.25 m?" vs "Offset every boundary inward by 5.25 m"). **The circularity worked example:** DBC setback from a neighbouring plot depends on floor count — **3.00 m at ground rising to 7.50 m at G+9 and above** — but floor count depends on footprint and footprint depends on setback. Iteration shown: G+10 → 7.50 m → 7.6 floors; G+7 → 6.00 m → 6.9 floors; G+6 → 5.25 m → 6.6 floors. **"Converges in three passes."** Cited: Dubai Building Code 2021, Part B, Table B.1, worked on an 80 × 40 m plot at FAR 5.0.
6. **Phase Strategy** — six phases; "SELLABLE ON ITS OWN" over Phase 0; "EACH UNLOCKED BY THE ONE BEFORE IT" over Phases 1–5.
7. **Phase 0 — the MVP** — "One community, one land use, residential towers. Form-based input. No AI in the computation path — deliberately." Why no AI: "Extraction is not the risky part of this product. Geometry, rules and defensible provenance are." / "A form takes ninety seconds. The extraction pipeline takes six weeks to debug." / "It isolates the variable: if Phase 0 fails, we know it failed on geometry or rules, not on document reading." Footer: **"8–12 weeks · four people · ten real plots · 40 rules · benchmarked against two independent architects"**
8. **The Trust Layer** — four mechanisms, "all built in Phase 0, because none of them can be retrofitted later": Provenance ("The system never says 'the AI decided.'"); Human-approved rules ("**Unapproved rules cannot be loaded by the engine — there is no override flag**"); Assumption register; Invariant checks. Footer: "No hidden defaults. If we filled a gap, it is amber on the screen and listed in the report."
9. **The Capacity Model** — five capacities with phase attribution: Regulatory (P0), Geometric (P0), Parking (P0), Commercially preferred (**P1**), Historically observed (**P2**). "The governing capacity is the smallest of them — and we name it, rather than reporting a maximum the plot will never deliver."
10. **The AI Boundary** — "AI reads. The engine computes. Humans approve." / **"An AI may draft a rule. It never becomes one. And it never computes a number you see on a report."**
11. **The Business Moat** — 01 Executable Dubai regulation model (*Hard*), 02 Developer standards library (*Harder* — "creates switching cost from the second project onward"), 03 Precedent corpus (*Harder*), 04 Approval feedback loop (*Hardest* — "Nobody can purchase this dataset. It compounds with every project"). Explicit non-moat line as above.
12. **The Decision** — "Phase 0 is not a calculator. It is the foundation asset for the entire AI design-generation platform." CTA: "Build the Phase 0 engine. Validate it against real projects. Then scale it into the platform."

**Deck-vs-PRD consistency check:** the deck is materially consistent with PRD v2 and does *not* over-claim. It never uses the word "compliance" as an outcome, it carries the precedent-is-not-authority line, and it phase-tags the capacity concepts. Two things the deck omits that the PRD treats as central: (a) the **five-way claim statement** and the "regulatory validity: never claimed" position — the deck's slide 4 "VALIDATE — hard constraints enforced, invariants proven, coverage gaps declared" is the closest it gets; (b) any mention of **kill criteria, risk or the four Phase-0 measurements**, which §34 argues are worth more than the software. Slide 7's "40 rules" is a *committed public number* that kill criterion #2 may force downward ("reduce the claimed rule count publicly").

---

# 13. Supporting thresholds referenced by the kill criteria (for a quoting contractor)

**§3.5 Phase 0 success criteria:** P0-S1 inter-architect variance measured and published (any value); P0-S2 engine within two-architect band **8 of 10 plots**; P0-S3 every emitted value has provenance class + complete derivation **100%**; P0-S4 invariant layer passes on all emitted configurations **100%**; P0-S5 runtime full computation **< 10 s**; P0-S6 design-partner users open the provenance tree unprompted **≥2 of 3 sessions**; P0-S7 mechanization rate + authoring throughput measured; P0-S8 land-pack completeness rate measured.

**§4.4 Phase 1:** P1-S1 **3–6 distinct configurations** per project (distinct in *design space*, §18.3); P1-S2 100% pass invariants+validation; P1-S3 100% of arithmetic contradictions detected before computation; P1-S4 ranking fully decomposable to term contributions 100%; P1-S5 enumeration completes **< 60 s**; P1-S6 **3 paying customers**; P1-S7 recommended configuration carried into design without material capacity revision **≥40%** (baseline measurement).

**§5.4 realistic-band entry conditions (all must hold):** n ≥ 8 observations in the conditioning cell; fields present = plot area, permitted FAR, achieved GFA, NSA, unit count; regulatory regime match (or divergence explicitly flagged); backtest coverage **≥80% within P10–P90**; backtest sharpness **median (P90−P10)/P50 ≤ 20%**. Below n=8 → `INSUFFICIENT_PRECEDENT`.

**§5.5 Phase 2:** P2-S1 **≥120 precedent records at Tier B completeness (Path B ≥40)**; P2-S2 top-5 retrieved precedents judged relevant by an architect **≥70%**; P2-S3 coverage+sharpness per §5.4; P2-S4 zero precedent values in any constraint derivation path (100%, CI-asserted); P2-S5 100% of precedent records carry source, licence, redistributable flag.

**§6.6 Phase 3:** P3-S1 critical-field extraction accuracy on gold set **≥95%**; P3-S2 rules reaching production without human approval **0**; P3-S3 statements silently dropped **0**; P3-S4 confidence labelled calibrated or heuristic **100%**; P3-S5 onboarding time reduction vs manual **≥50%**.

**§7.6 Phase 4:** P4-S1 generated floors geometrically valid 100%; P4-S2 invariant layer pass 100%; P4-S3 blind architect panel "reasonable starting point a designer could develop" **≥70%** (**ship-blocker below 60%**); P4-S4 inter-rater reliability **Krippendorff ≥0.6**.

**§8.5 Phase 5:** P5-S1 hard-constraint violations 0; P5-S2 options distinct in design space; P5-S3 full run wall clock **≤10 min p95**; P5-S4 re-rank on weight change without re-search **≤2 s**; P5-S5 immutable-run reproducibility 100%.

**§22.3 absolute integrity metrics (any failure is a release blocker):** M-INV 100%, M-PRV 100%, M-APP 0 (rules reaching production without a named approver), M-PRE 0 (precedent nodes in constraint derivation paths), M-DEF 100%, M-RUN 100%.

**§22.4 metrics that must be paired:** backtest coverage ≥80% ↔ sharpness ≤20%; self-consistency PASS ↔ rule coverage %; extraction accuracy ↔ queue-vs-drop rate ("99% accuracy on 60% of statements is not 99% accuracy").

**§32.1 team:** four FTE — Regulatory Architect (licensed, Dubai practice; **veto over rule publication**; "the single most important hire"; full team member, not advisor), Senior Backend/Geometry Engineer, Full-stack Engineer (**owns invariant and validation modules — different owner from the capacity engine, per Principle 4**), Product/Tech Lead. **No AI/ML engineer.** Contracted: 3 architects, ~10 days total.

**§32.2/32.3 critical path:** Metric definitions annex (wk 1) is the root — "Nothing computes an area term until it is signed. This is a one-week, four-person-hour document that gates the entire project — and skipping it is precisely how V1's example ended up wrong by 3×." Buffer: weeks 11–12 absorb slip; **if authoring is slower than A4 assumes, cut to 30 rules rather than extending the schedule.**

**§30.3 costed fact:** nested evolutionary-over-solver at population 100 × 50 generations × 2 s inner solve = **~2.8 CPU-hours per run**; §8.4 notes ~5 min wall clock on 32 cores in theory but "a realistic first implementation lands at **30–90 minutes**."

## Key numbers
- Phase durations: P0 8–12 wk; P1 10–14 wk; P2 12–16 wk; P3 10–12 wk; P4 16–20 wk; P5 12–16 wk. Cumulative to full vision ~18–24 months (vs V1's 11-month claim)
- Phase 0 team: 4 FTE, no AI/ML engineer; + 3 contracted architects for ~10 days total
- Phase 0 scope: 1 community, 1 land use, 10 real plots, ~40 rules, 2 independent architects per plot, 18 invariant checks, <10 s full computation
- KILL: inter-architect variance > 10% → reposition from 'accurate' to 'consistent and auditable', rewrite marketing before shipping
- KILL: mechanization rate on first 40 rules < 50% → re-scope parameter set and reduce claimed rule count publicly
- KILL: rule authoring throughput on complex rules < 4/day → knowledge-base cost is ~3× budget; raise on that basis or narrow jurisdiction
- KILL: land packs containing FAR + height + setbacks < 5 of 10 → input model is wrong; product's first job becomes data assembly (different product)
- KILL: users open provenance tree in < 1 of 3 sessions → trust thesis is wrong; re-examine everything downstream of §13
- KILL: engine within two-architect band < 6 of 10 → do not ship (success target is 8 of 10)
- KILL: Phase 2 backtest coverage OR sharpness missed → historically-observed capacity does not ship
- KILL: Phase 4 blind architect panel < 60% → Phase 4 does not ship; Phases 0–3 remain the product; pre-authorized deferral
- KILL: Phase 1 enumeration insufficiency 'not demonstrated' → Phase 5 search does not begin; enumeration stays
- Q1 parking-in-FAR: 15–35% capacity swing; OPEN REGULATORY QUESTION; blocking per FR-DEF-002; due Phase 0 week 2
- A4 rule-authoring cost: budget 14–18 architect-weeks per 300 rules, NOT 6–10; first 40 rules run 3–5× slow; 3× cost swing
- Realistic-band gates (§5.4): n≥8 observations; backtest coverage ≥80% within P10–P90; sharpness median (P90−P10)/P50 ≤20% — both required
- Phase 2 precedent targets: Path A = 300 towers × 10 fields; Path B = 2–3 developer partners × 40+ projects; P2-S1 ≥120 Tier B records
- Blocking data dependencies: 6 of 12 — Phase 0 blocked on 10 land packs (one design-partner relationship), published regulatory documents, contracted architect computations
- Roadmap commercial posture: V0 free (1–2 design partners) → V1 3–5 paying customers → V1.5 onboarding cost halved → V2 upgrade + approval-outcome instrumentation → V2.5 premium tier → V3 enterprise → V4 expansion. NO price point stated anywhere
- Market framing: 2–6 weeks and AED 50,000–250,000 per feasibility study today, one option, zero citations → 10 seconds with citations
- Deck public claims: DBC 843 pages + UAE Fire & Life Safety Code 707 pages = 1,550 pages of shared rules, plus a different DCR per plot
- DBC setback circularity (Deck slide 5): 3.00 m at ground rising to 7.50 m at G+9+; converges in 3 passes on an 80×40 m plot at FAR 5.0
- Human gates: 6 run gates G1–G6 (G1–G4 Phase 0, G5–G6 Phase 1; G6 needs a second user) + 9 shared-asset gates, each triggering impacted-run identification within 24 h
- Risk register: 18 risks; 3 Critical impact (R-01 build order, R-07 professional liability, R-11 self-consistency read as compliance)
- Phase 5 honest cost: 100 pop × 50 gens × 2 s = ~2.8 CPU-hours/run; realistic first implementation 30–90 minutes wall clock
- Integrity metrics that block release: M-INV 100%, M-PRV 100%, M-APP 0, M-PRE 0, M-DEF 100%, M-RUN 100%

## Open items
- Q1 — parking-in-FAR treatment is formally OPEN and BLOCKING (FR-DEF-002). It swings capacity 15–35%. No contractor can quote a capacity engine's outputs until the client states whether this is resolvable by week 2 or stays a permanent per-project user declaration (A5's failure mode).
- Q2/Q5 — typical FAR values and land-pack completeness are unknown. If FAR is 3–5 on 2,000 m² plots, the PRD itself says 'much of the generation machinery targets the wrong problem size'. Quote scope for Phases 4–5 is unsafe until this is measured.
- No price point exists anywhere in the PRD or the deck — only tier names (free / paying / premium / enterprise) and customer counts (1–2, then 3–5). Revenue model, per-seat vs per-project vs per-report, and whether onboarding is billable (A12) are all unstated.
- A14/R-13 — the licensed Dubai regulatory architect is named as the schedule's binding constraint and must be a full-time FOUNDING-TEAM member with veto over rule publication, recruited BEFORE engineering ramp. Whether this person is identified/committed is not stated. Everything else is downstream of it.
- Q11/A15/R-07 — professional indemnity insurance must be in place before the first paying customer, but obtainability and premium for this product description are unknown (due Phase 0 wk 8). This is a Critical-impact risk with no quantified mitigation cost.
- Q7/A7 — whether developers will pay for Phase 0 capacity alone is untested. If false, Phase 0 becomes internal foundation rather than product and Phase 1 must be accelerated (R-18). This changes the entire commercial sequence.
- Design-partner identity and contract are unresolved: the single largest external dependency for Phase 0 is 'ten land packs from one friendly developer'. One relationship gates the whole phase (§28.1, §23.1).
- A9 — 2–3 developer partners contributing historical portfolios under contract is the only realistic Tier B source. If it fails, historically-observed capacity does not ship. No named partners; High/relationship difficulty.
- PDF-table reconstruction caveats: three pairings in §28.1 could not be independently cross-checked — 'Developer standards documents / Customer / Low / No' (a 'No' blocking flag looks counter-intuitive for a Phase 1 input), 'Typology library entries → Regulatory architect' as approver in §21.2, and the Q2/Q3 split of Phase 0 week 1 vs week 2 (§32.2 puts the inter-architect variance measurement in week 1, but the §27 column order assigns week 1 to Q2 and week 2 to Q3). Confirm against the original PDF before quoting these three.
- §25 R-18 cites '§31' for the CEO counter-argument brief, but the CEO brief is §34 and §31 is the assumptions register. Internal cross-reference error in the source document — worth flagging to the client.
- The deck commits publicly to '40 rules' (slide 7), but kill criterion #2 may require reducing the claimed rule count publicly. Marketing and product are coupled here; a marketing-review process on the same footing as product review is required by R-07/R-11 but no owner or cadence is specified beyond 'CEO/Counsel'.
- §26 does not state WHO declares a kill/re-scope trigger met, nor the decision forum or timeframe. The criteria are pre-agreed but the adjudication process is not.
- Q6 (road-hierarchy GIS layer) is deferred to Phase 3 while R-17 makes Phase 0 edge classification manual. A contractor should confirm manual edge classification is acceptable to design partners at the 3-minute plot-entry target (§24.1).
- Second jurisdiction is explicitly a V4 decision and 'every jurisdiction is a full rule-base build plus a precedent corpus'. Any client expectation of multi-emirate or GCC coverage inside 24 months contradicts the PRD.
