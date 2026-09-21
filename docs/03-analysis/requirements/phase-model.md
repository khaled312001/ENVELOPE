# Phase model (0–5), AI/LLM architecture boundary, stack by phase, evaluation framework and golden dataset — ENVELOPE PRD v2

> Source: ENVELOPE_PRD_v2 / Deck / client comms. Auto-extracted reference — verify against the original PDFs before quoting a threshold.

Source: `E:\ENVELOPE\_client_material\extracted\ENVELOPE_PRD_v2.txt` (3,587 lines). Sections read: 1.3, 2.2–2.4, 3, 4, 5, 6, 7, 8, 9.2–9.6, 15, 16.5, 17, 18, 19, 20.3–20.4, 21, 22, 23, 24, 26, 28, 31.2–31.4, 32, 33.

**Caveat on table fidelity:** several tables in the extracted text are column-scrambled by the PDF-to-text conversion (§4.4 Phase 1 criteria, §6.6 Phase 3 criteria, §15.1 capacity concepts, §26 kill criteria, §28.1 data acquisition, §21.2 approver table). Where I reconstructed the pairing by row order and semantics, I mark it **[reconstructed]**. Anything load-bearing for a contract should be re-verified against the original PDF.

---

## 1. THE PHASE MODEL — THE CENTRAL ARGUMENT

### 1.1 Layering stated as dependency, not sequence (§1.3)
This is described verbatim as "the entire argument of V2". Each arrow is a **hard technical dependency, not a preference**:

- Phase 0 CAPACITY ENGINE — "needs nothing but geometry, rules, and arithmetic"
- Phase 1 CONFIGURATIONS — "needs a capacity engine to configure WITHIN"
- Phase 2 PRECEDENT — "needs a deterministic baseline to calibrate AGAINST"
- Phase 3 AI EXTRACTION — "needs a rule model to extract INTO, and a review workflow"
- Phase 4 GENERATION — "needs constraints that are both checkable and constructive"
- Phase 5 OPTIMIZATION — "needs a generator whose outputs are trustworthy"

### 1.2 Phase gate table (§2.3)
| Phase | Name | Duration | Ships to |
|---|---|---|---|
| 0 | Proof of Engine | 8–12 weeks | 1–2 design partners, free |
| 1 | Development Configuration Engine | 10–14 weeks | 3–5 paying customers |
| 2 | Precedent Intelligence | 12–16 weeks | Same, as upgrade |
| 3 | AI Document Understanding | 10–12 weeks | Same, reduces onboarding cost |
| 4 | AI Generation | 16–20 weeks | Gated on architect panel |
| 5 | Full Optimization | 12–16 weeks | Gated on Phase 4 |

Cumulative to full vision: **~18–24 months**. Explicitly longer than V1's 11-month estimate; the difference is attributed to "honesty about the knowledge-authoring workstream and about the sequencing dependencies".

**Rule: "Each phase ships to real users before the next begins. Each phase has explicit kill/re-scope criteria (§26). A phase that fails its criteria does not proceed on hope."**

### 1.3 Release naming, and the Phase 3-before-Phase 2 swap (§33)
| Release | Phase | Duration | Capability | Commercial |
|---|---|---|---|---|
| V0 | 0 | 8–12 wk | Deterministic capacity engine with provenance | 1–2 design partners, free |
| V1 | 1 | +10–14 wk | Configurations, standards, brief, objectives, comparison | 3–5 paying customers |
| V1.5 | 3 | +10–12 wk | AI document extraction with human review | Onboarding cost halved |
| V2 | 2 | +12–16 wk | Precedent, similarity, benchmarking, historically-observed capacity (gated) | Upgrade; approval-outcome instrumentation begins; Premium tier |
| V2.5 | 4 | +16–20 wk | Massing, core, floorplate, typical floor (gated on architect panel) | Enterprise |
| V3 | 5 | +12–16 wk | Multi-objective optimization, Pareto, weight sensitivity (only if enumeration proves insufficient) | Expansion |
| V4 | — | — | Second jurisdiction; commercial and mixed-use typologies; IFC export; approval-risk model | — |

**Delivery order is Phase 3 BEFORE Phase 2** in the roadmap, even though numbering says otherwise: "AI extraction is placed earlier than precedent because it reduces onboarding cost immediately and has no external data dependency, whereas Phase 2 is gated on partner portfolio acquisition whose timeline is outside our control. Either order works; this one de-risks the schedule." Second jurisdiction is a **V4** decision — "Expanding geographically before Dubai is profitable multiplies the largest cost in the business before proving it can be recovered."

---

## 2. PHASE 0 — PROOF OF ENGINE (context for the gate into Phase 1)

**Goal (§3.1):** produce a buildable envelope and capacity calculation for a real Dubai residential-tower plot that "falls within the disagreement band of two practising architects, in seconds, with every number traceable." Accuracy target is **relative to human disagreement, not an imaginary true value**.

**In scope (§3.2):** one Dubai community, one land-use type, residential towers; form-based plot input + manual boundary draw on basemap; **rectilinear and simple convex polygon plots only**; **~40 mechanized rules as typed records**; buildable envelope (per-edge setbacks, height, FAR, coverage, tower plate cap); parking demand → area → level count → podium implication; **three capacity bands (regulation-limited, geometry-limited, parking-limited)**; user-entered realism discount (USER_SET multiplier); assumption register with perturbation sensitivity; full click-through provenance graph; invariant/conservation layer; independent validation module; JSON + PDF output.

**Out of Phase 0 (§3.2):** LLM anything · optimization · multiple configurations · floor plans · precedent · similarity · jurisdiction overlays · DXF · realistic capacity band.

**Why no LLM in Phase 0 (§3.3)** — four stated reasons: (1) extraction is a known bounded problem, capacity computation with defensible provenance is not; (2) AI extraction has nothing to extract *into* until the rule model exists — Phase 3 depends on Phase 0's schema, "building extraction first means building it twice"; (3) a form takes 90 seconds — for 10 plots manual entry costs less than debugging the pipeline; (4) it isolates the variable — "If Phase 0 fails, we need to know it failed on geometry and rules, not on OCR."

**Phase 0 success criteria (§3.5):**
| ID | Criterion | Threshold |
|---|---|---|
| P0-S1 | Inter-architect variance measured and published | Measured (any value) |
| P0-S2 | Engine result within the two-architect band | ≥8 of 10 plots |
| P0-S3 | Every emitted value has provenance class + complete derivation | 100% |
| P0-S4 | Invariant layer passes on all emitted configurations | 100% |
| P0-S5 | Runtime, full computation | < 10 s |
| P0-S6 | Design-partner users open provenance tree unprompted | ≥2 of 3 sessions |
| P0-S7 | Mechanization rate and authoring throughput measured | Measured and reported |
| P0-S8 | Land-pack completeness rate measured | Measured and reported |

S1, S7, S8 are **measurement criteria, not performance criteria**. "Phase 0's most valuable output is not the software — it is four numbers that size the rest of the business."

**Phase 0 team (§32.1) — four people, no AI/ML engineer:** Regulatory Architect (licensed, Dubai practice, 1.0 FTE — "the single most important hire", full team member with **veto over rule publication**); Senior Backend/Geometry Engineer 1.0; Full-stack Engineer 1.0 (owns invariant + validation modules — **different owner from the capacity engine**, Principle 4); Product/Tech Lead 1.0. Contracted: **3 architects, ~10 days total**, for variance measurement and golden set.

**Phase 0 12-week schedule (§32.2), week by week:** W1 metric definitions annex signed + parameter vocabulary for ~40 rules + inter-architect variance measurement (3 plots, 3 architects) + secure 10 land packs + Q1 parking-in-FAR research; W2 rule record schema, evaluator registry (≤12), bitemporal store, test harness, approval workflow, repo skeleton with import linter, first 10 rules; W3 geometry kernel (per-edge offsets, intersection, area with independent recomputation, validity, exact predicates) + invariant module built alongside **by the other engineer**; W4 envelope solver (setbacks → footprint → coverage → plate cap → height) + binding-constraint attribution, rules 10–25; W5 parking model (demand → area → levels → headroom → supportable unit ceiling), rules 25–40; W6 capacity bands A/B/C, governing band, integer granularity, user realism discount, independent validation module; W7 provenance graph at every boundary; W8 assumption register with perturbation sensitivity, five-way claim statement, deferred-check list; W9 frontend; W10 PDF + JSON + round-trip test + CI invariant checks on all documentation examples; W11 golden-set validation (10 plots vs 2 architects each); W12 3 design-partner sessions + write-up. **Buffer: weeks 11–12. If rule authoring is slower than assumed, cut to 30 rules rather than extend — "the measurement matters more than the count."**

**Critical path (§32.3):** metric definitions annex (wk1) is the root — "Nothing computes an area term until it is signed. This is a one-week, four-person-hour document that gates the entire project — and skipping it is precisely how V1's example ended up wrong by 3×."

---

## 3. PHASE 1 — DEVELOPMENT CONFIGURATION ENGINE (10–14 wk, 3–5 paying customers)

**Goal (§4.1):** move the output from "what can fit?" to "what are the reasonable ways to develop this?"

### 3.1 What Phase 1 adds (§4.2)
- **Developer Standards** — structured library per organization, hard/soft classification elicited at onboarding, reconciliation against rules
- **RFP / Brief** — structured targets, contradiction detection before computation
- **Parameterized tower typologies** — a small architect-authored library (**4–6**), each with a bounded parameter vector
- **Configuration enumeration** — a coarse **deterministic grid** over typology parameters, **not a search algorithm**
- **Objective functions** — explicit terms, explicit normalization, explicit weights
- **Configuration comparison** — aligned metrics, decomposable scoring
- **Developer-specific priorities** — organization objective policy with governance (§20.4)
- **Commercially preferred capacity** — the fourth capacity concept (§15)
- Also Phase 1: **role lenses** (§20.4 — presentation order only; "Divergent rankings by role would be a defect"), background jobs, DXF/XLSX export, gates G5/G6.

### 3.2 Deliberately still absent in Phase 1 (§4.3)
**"No NSGA-II. No CP-SAT. No Pareto front."** Phase 1 enumerates a grid of perhaps **50–500 configurations**, evaluates them all deterministically, ranks them. "This is not an optimizer; it is exhaustive evaluation of a coarse space." It defers the entire performance problem (§8.4) until there is evidence the search space is too large to enumerate. **"If exhaustive enumeration turns out to be sufficient at production granularity, Phase 5 may be substantially reduced or skipped. This is a real possible outcome and would be good news."**

Also absent: no "realistic/expected/likely" capacity band in Phase 0 **or Phase 1** — absence is **enforced by schema, the field does not exist** (§15.3). In its place `user_realism_discount`, default **1.00**, class `USER_SET`, attributed to the user who entered it.

### 3.3 Phase 1 success criteria (§4.4) **[reconstructed — source table is column-scrambled]**
| ID | Criterion | Threshold |
|---|---|---|
| P1-S1 | Distinct configurations produced per project | 3–6, distinct in **design space** (§18.3) |
| P1-S2 | Every configuration passes invariants and validation | 100% |
| P1-S3 | Brief contradictions detected before computation | 100% of arithmetic contradictions |
| P1-S4 | Ranking fully decomposable to term contributions | 100% |
| P1-S5 | Enumeration completes | < 60 s |
| P1-S6 | Paying customers | ≥3 |
| P1-S7 | Recommended configuration carried into design without material capacity revision | ≥40% (baseline measurement) |

### 3.4 Phase 1 functional requirements (§9.2) — full detail
**FR-STD-001 Developer Standards Library** (P0/Phase 1). Rationale: whether a standard is contractually mandatory or merely preferred is "the largest source of downstream error, and standards documents almost never say. Inferring it will be wrong roughly a third of the time, invisibly." Processing: structure into parameter-bound requirements; **elicit hard/soft classification from the customer's design manager once per document**; reconcile against rule set into `COMPATIBLE / MORE_RESTRICTIVE / LESS_RESTRICTIVE / ORTHOGONAL`. Output `ReconciledStandardSet`. AC1 classification is **elicited, never inferred**; AC2 every LESS_RESTRICTIVE standard produces a visible record ("regulation governs") with quantified impact; AC3 library versioned and reused across the org's projects; AC4 a standard cannot override a rule except through a documented variance (FR-GOV-003). Depends on FR-RUL-002.

**FR-RFP-001 Brief Structuring and Contradiction Detection** (P0/Phase 1). Rationale example: catching "180 units needs 21,900 m² against a 16,000 m² ceiling" in 30 seconds. Input: structured form (Phase 1) or document (Phase 3). Processing: type each target `HARD_TARGET / SOFT_TARGET / ASPIRATION`; run the contradiction battery (§16.2); compare against band A. Output: `ProjectBrief`, `Contradictions`, `BriefGaps`. AC1 all arithmetic contradictions detected before computation, naming the incompatible pair and quantifying the shortfall; AC2 targets exceeding band A flagged with governing rule cited; AC3 gaps become assumption-register entries, **never silently defaulted**.

**FR-CFG-001 Typology Library and Configuration Enumeration** (P0/Phase 1). Rationale: "Free-form generation produces novel, unbuildable, unexplainable geometry and destroys traceability. Curated typologies give most of the value with full explainability." Processing: per typology, enumerate a coarse grid over its bounded parameter vector; reject candidates failing filter rules at instantiation; evaluate survivors exhaustively. AC1 **≥4 typologies attempted where the envelope permits**, infeasible typologies report why; AC2 100% of emitted configurations pass invariants and independent validation; AC3 **typology library is data-driven — adding a typology requires no code deployment**; AC4 enumeration < 60 s; **AC5 "No search algorithm. Exhaustive evaluation only."**

**FR-OBJ-001 Objective Functions and Ranking** (P0/Phase 1). Processing: normalize each term via a **versioned, approval-controlled normalization function** (§21); apply weights; produce decomposable scores; compute margin over runner-up; test robustness under weight perturbation. AC1 score fully decomposable to term contributions; **AC2 if the top two are within 3%, the system states the recommendation is not robust and explains what distinguishes them**; AC3 every report states objective profile ID and version; **AC4 re-ranking on weight change does not re-enumerate; completes in < 2 s**; AC5 **no fictional objectives — marketability and view quality excluded until the underlying data exists**.

**FR-CAP-003 Commercially Preferred Capacity** (P1/Phase 1) — the fourth capacity concept. Output `commercially_preferred_capacity` with the profile version that produced it. AC1 **always accompanied by the governing band, never shown alone**; AC2 delta from governing band explained by named objective terms.

**Governance active from Phase 1 (§9.6):** FR-GOV-002 Objective Profile Governance — three tiers: org policy (set by development director, versioned, audited), project profile (within org bounds, justification required outside them), exploratory (**watermarked, non-exportable**). "If every user sets their own weights, two people in the same company produce contradictory recommendations for the same plot and the product's authority collapses at the investment committee." FR-GOV-003 Variance Handling (P1/Phase 1) — documented, evidenced, **expiring** override bound to rule + plot + evidence + asserter + expiry; **AC1 no variance without an uploaded evidence document, no "upload later"; AC2 life-safety rules cannot be varied — the pathway is disabled for that rule class**; AC3 face-page notice on every report produced under a variance; AC5 second-reviewer default on for multi-seat orgs.

---

## 4. PHASE 2 — PRECEDENT INTELLIGENCE (12–16 wk, same customers as upgrade)

**Goal (§5.1):** introduce approved-project data as evidence, "and only then introduce the historically-observed capacity concept."

### 4.1 Two acquisition paths, planned in parallel (§5.2)
"Neither is assumed to succeed. The phase is scoped so that **either one alone is sufficient to deliver reduced value**, and failure of both degrades the product gracefully rather than blocking it."
- **Path A — public/municipal data:** published municipal open-data channels (building permits, building summary information, floor-level information, building usages, project records) under a commercial licence permitting derivative analytical use. Strength: volume, breadth, low relationship cost. Weakness: **almost certainly lacks NSA, unit mix, and permitted FAR** — precisely the calibration fields. Path A alone supports density, floor-count and parking-ratio benchmarking only.
- **Path B — developer-partner portfolio:** **10–40 completed projects per partner**, contributed under contract, with full internal records. Contains NSA, mix, permitted FAR, efficiency. Weakness: small n, selection bias toward one developer's practice, contractual complexity.
- **The honest consequence:** "The metrics that make a 'historically observed capacity' credible require Path B. Path A cannot produce them. This is stated here rather than discovered in month nine. Phase 2 planning assumes Path B is the primary source and Path A is breadth support."

### 4.2 Deliverables (§5.3)
Historical project schema with data tiering and licence tagging (§17.1) · similarity engine (faceted, regime-gated, per-domain transferability, §17.4) · precedent retrieval and pattern extraction with minimum-n enforcement · benchmarking against comparable approvals · precedent-based calibration → the historically-observed capacity concept.

### 4.3 Realistic capacity band — entry condition (§5.4)
The band V1 shipped in MVP is **removed from Phase 0 and Phase 1 entirely**. It may be introduced only when **all** hold:
| Condition | Threshold |
|---|---|
| Observations in the conditioning cell | **n ≥ 8** |
| Fields required present | plot area, permitted FAR, achieved GFA, NSA, unit count |
| Regulatory regime match | Same regime, or divergence explicitly flagged |
| Backtest coverage on held-out projects | **≥80% within P10–P90** |
| Backtest sharpness | **median (P90−P10)/P50 ≤ 20%** |

"Coverage without sharpness is meaningless — a band of '3,000 to 30,000 m²' achieves 100% coverage and zero value. Both are required." Below n=8 the system returns `INSUFFICIENT_PRECEDENT` and the user keeps the Phase 0 USER_SET realism discount.

### 4.4 Phase 2 success criteria (§5.5)
| ID | Criterion | Threshold |
|---|---|---|
| P2-S1 | Precedent records at Tier B completeness | ≥120 (Path B ≥40) |
| P2-S2 | Top-5 retrieved precedents judged relevant by an architect | ≥70% |
| P2-S3 | Backtest coverage and sharpness both met | Per §5.4 |
| P2-S4 | Zero precedent values in any constraint derivation path | 100%, CI-asserted |
| P2-S5 | Every precedent record carries source, licence, redistributable flag | 100% |

### 4.5 Phase 2 functional requirements (§9.3)
**FR-PRE-001 Precedent Corpus with Tiering and Licensing** — entity resolution to plot, normalization, derived metrics, tier assignment, licence tagging, regulatory-regime tagging. **AC2 licence review is a gate on ingestion, owned by a named person, not a cleanup task. AC3 records lacking a regulatory-regime tag cannot enter the similarity index. AC4 Tier A (with geometry) is not required for the phase to succeed.**

**FR-PRE-002 Pattern Extraction with Minimum-n** — "Derive conditional distributions, never single values… A precedent-derived point estimate is indistinguishable from a fact in the reader's mind. A distribution with n is not." Output `PrecedentPattern` with n, median, quartiles, deciles. **AC1 no pattern with n < 8 → `INSUFFICIENT_PRECEDENT`; AC2 every displayed pattern shows n, median, IQR; AC3 `PrecedentPattern` cannot be a constraint source — type-level, CI-asserted.**

**FR-SIM-001 Faceted Similarity with Regime Gate** — "A single '92% similar' figure is false precision that encourages copying the closest project — the exact behaviour the product must prevent." Stage 1 hard regime gate with reported exclusion count; Stage 2 faceted scoring across `spatial, dimensional, regulatory, programmatic, contextual` with `temporal` as modifier, **facet weights configured per query domain**. **AC1 no single composite percentage ever displayed as headline; AC2 each precedent lists its top three divergences; AC3 regime-gate exclusions shown as a count; AC4 architect evaluation ≥70% of top-5 judged genuinely relevant across 30 subject plots.**

**FR-CAP-004 Historically Observed Capacity** — the fifth capacity concept. Class `OBSERVED`, emitted as a distribution with n. **AC1 never below n=8; AC2 both backtest coverage (≥80%) and sharpness (≤20%) required before the feature is enabled for a jurisdiction; AC3 always displayed alongside bands A/B/C, never replacing them; AC4 configurations exceeding the 95th percentile of precedent flagged `OPTIMISTIC_VS_PRECEDENT` — advisory only, never removed from the result set, "because a legitimately better design should be allowed to beat precedent."**

### 4.6 Data acquisition targets (§28.2)
- **Path A target (breadth):** 300 Dubai residential towers approved since 2010, ten fields — plot reference, community, approval date, land use, plot area, built-up area, floors above, floors below, unit count, parking bays.
- **Path B target (depth):** from 2–3 developer partners, **40+ projects** adding permitted FAR, NSA, unit mix, achieved efficiency.
- **If Path B fails:** historically-observed band does not ship; users keep the USER_SET discount; benchmarking still works on Path A fields. "The product degrades; it does not break. This is designed-in, not improvised."
- Municipal asks, in order (§28.3): Tier 1 likely obtainable (bulk/API permit, building summary, floor-level, building usage, project datasets with commercial derivative licence; schema docs; historical depth; plot-level cadastral geometry under licence); Tier 2 requires relationship (approved GFA and permitted FAR per project, unit schedules and mix, structured setback/height conditions per plot, approval-cycle statistics, anonymized variance/exemption statistics); Tier 3 long horizon (approved drawing files, review comment text, submission→revision→approval sequences). **"Do not make any roadmap contingent on Tier 2 or Tier 3."**
- §28.4 licensing discipline: "Marketed floor plans, broker listings and consultant drawings are protected works. Scraping them creates exposure that surfaces at diligence."

---

## 5. PHASE 3 — AI DOCUMENT UNDERSTANDING (10–12 wk) — the first LLM in the product

**Goal (§6.1):** "Reduce the cost of getting data into the system, **without letting a model become an authority**."

**Scope (§6.2):** AI extraction for regulation documents, developer standards, RFPs; plus requirement classification, assumption identification, conflict identification, and the human review workflow that governs all of it.

### 5.1 The mandatory pipeline — no exceptions (§6.3)
```
Source document
  → LLM extraction to a strict candidate schema
  → DETERMINISTIC NORMALIZATION
       unit conversion · parameter-vocabulary binding · type coercion
       · arithmetic cross-checks · duplicate detection
  → CANDIDATE RULE (status = DRAFT, never evaluable)
  → Human review by a qualified reviewer
  → Approval (second reviewer for life-safety and planning parameters)
  → Versioned rule with validity window
  → Production
```
"An LLM output can never reach production as an authoritative rule. **Enforced at the schema level: `rule.approved_by` is NOT NULL and the rule evaluator refuses to load records with `status != APPROVED`. There is no configuration flag that bypasses this.**"

### 5.2 Deterministic-first extraction (§6.4)
"Developer standards documents are **60–80% tables**. The pipeline routes structured content to a deterministic table parser and sends **only prose** to the LLM. Unit normalization, area cross-validation, and parameter binding are separate deterministic passes over model output — **never instructions given to the model**."

### 5.3 Extraction confidence — the labelling rule (§6.5)
"Self-consistency across samples measures sampling variance, not correctness." Therefore two labels only:
| Label | Condition | Permitted use |
|---|---|---|
| `CALIBRATED_CONFIDENCE` | Validated against the gold set, reliability curve published, **Brier score reported** | **May gate the review queue** |
| `HEURISTIC_CONFIDENCE` | Anything else | **Display only, always labelled, may not gate anything** |

"A field is never presented with a bare number. It is `CALIBRATED_CONFIDENCE 0.94` or `HEURISTIC_CONFIDENCE 0.94 (uncalibrated)`."

### 5.4 Phase 3 success criteria (§6.6) **[reconstructed — source table is column-scrambled]**
| ID | Criterion | Threshold |
|---|---|---|
| P3-S1 | Critical-field extraction accuracy on gold set | ≥95% |
| P3-S2 | Rules reaching production without human approval | 0 |
| P3-S3 | Statements silently dropped (neither extracted nor queued) | 0 |
| P3-S4 | Confidence labelled calibrated or heuristic | 100% |
| P3-S5 | Onboarding time reduction vs. manual | ≥50% |

### 5.5 Phase 3 functional requirements (§9.4)
**FR-EXT-001 Document Extraction to Candidate Records** — "an LLM may read, structure and narrate; it may never author a rule that reaches production." Output: candidate records **plus an `UnparsedStatements` queue**. **AC1 candidates are not evaluable — the evaluator refuses `status != APPROVED`; AC2 100% of statements are either extracted or queued — "silent drops are a P0 defect"; AC3 every field carries page and bounding-box reference rendered as a source highlight; AC4 confidence labelled per §6.5.**

**FR-EXT-002 Human Review and Approval Workflow** — "Legal consequence requires human accountability with a name attached." Review queue sorted by **impact then confidence**; side-by-side source; correction capture; **second-reviewer requirement for life-safety and planning parameters**. **AC1 rules reaching production without a named approver: 0; AC2 every correction persisted with original value, corrected value, user, timestamp — "the primary extraction-quality signal"; AC3 review throughput measured and reported — "it is the real capacity limit on the knowledge base."**

---

## 6. PHASE 4 — AI GENERATION (16–20 wk, gated on architect panel)

**Goal (§7.1):** generate massing, core, floorplate, units and typical floors — **"within constraints, never outside them."**

**Scope (§7.2):** tower massing generation · core configuration · floorplate generation · unit planning · typical floor generation · multiple design alternatives.

### 6.1 The generation contract (§7.3)
"**The LLM does not invent geometry.** Geometry is produced by deterministic parametric instantiation and solver-based packing. If any generative model is used for layout proposal in future, its output is **a proposal that must pass constraint enforcement, invariant checks, and independent validation before it can be emitted — the same gate any other candidate passes**."

### 6.2 Fidelity ceiling (§7.4) — stated in the drawing, not just the report
- **Generated:** core component footprints; corridor centreline and width; unit zone polygons with type, area, frontage, depth, orientation, adjacency.
- **Not generated:** internal partitions, rooms, wall thickness, doors, windows, structural grid, balcony geometry beyond area allowance.

### 6.3 Geometry restriction lift (§7.5)
Phase 0 restricts to rectilinear and simple convex plots. **Phase 4 is where non-convex and irregular footprints are addressed**, "because unit packing on arbitrary polygons is the genuinely hard case (§14.5) and should be attempted only with the rest of the stack proven."

### 6.4 Phase 4 gate — pre-authorized deferral (§7.6)
| ID | Criterion | Threshold |
|---|---|---|
| P4-S1 | Generated floors geometrically valid | 100% |
| P4-S2 | Invariant layer pass | 100% |
| P4-S3 | Blind architect panel: "reasonable starting point a designer could develop" | ≥70% |
| P4-S4 | Inter-rater reliability on the panel | **Krippendorff α ≥ 0.6** |

"**If P4-S3 lands below 60%, Phase 4 does not ship.** Phases 0–3 continue as the product and Phase 4 returns to development. This deferral is authorized here, in advance, so it is not a schedule argument later."

### 6.5 Phase 4 functional requirements (§9.5)
**FR-GEN-001 Massing, Core and Floorplate Generation** — "This is the output customers imagine when they hear 'AI'; it is also the least trustworthy layer and therefore the last built." Processing: parametric instantiation; core component sizing from cited rules; corridor topology; **travel distance and exit separation evaluated geometrically as `EVALUATIVE_ONLY` rejections**. AC1 every core component dimension traces to a rule or declared assumption; AC2 100% pass invariants and independent validation; AC3 occupant-load circularity resolved per §11.7 with a **bounded fixpoint**. Dependencies: **Phases 0–3 complete**.

**FR-GEN-002 Unit Planning and Typical Floor** — "The hardest component in the product and the one with **no ground truth**." Processing: constrained assignment over a discretized plate; **geometry adjudicated by the deterministic kernel, never by the solver's own arithmetic**. AC1 100% geometrically valid — no overlaps, façade access where required, every zone adjoins the corridor; AC2 efficiency computed from actual geometry, never assumed; AC3 where mix is unachievable, the achievable mix is returned with quantified deviation — **never a silent substitution**; AC4 architect panel ≥70%, below 60% the phase does not ship.

---

## 7. PHASE 5 — FULL OPTIMIZATION (12–16 wk, gated on Phase 4)

**Entry condition (§8.1):** "Phase 5 begins only when Phase 4's generator is reliable — meaning **P4-S1 through S4 are met and stable across two consecutive evaluation rounds**. Optimizing an untrustworthy generator produces confidently wrong answers faster."

**Scope (§8.2):** multi-objective optimization · Pareto frontier · weight sensitivity · advanced search · **CP-SAT where justified** · surrogate models · caching · performance engineering.

**"Where justified" (§8.3):** "CP-SAT and NSGA-II are introduced **only if Phase 1's exhaustive enumeration has been demonstrated insufficient at production granularity**. The evidence required is a measured configuration space that cannot be enumerated within the runtime budget at the granularity customers need. **Absent that evidence, enumeration stays.**"

### 7.1 The performance problem, costed honestly (§8.4)
"Population 100 × 50 generations = **5,000 evaluations**. At **2 s** per inner packing solve, that is **~2.8 CPU-hours**; on **32 cores, ~5 minutes wall clock** — but only if packing is genuinely 2 s and only if the outer loop parallelizes cleanly against a solver with its own threading. **A realistic first implementation lands at 30–90 minutes.**"

Mitigations that must be **designed in, not discovered**: surrogate models for the inner loop; caching keyed on **floorplate-geometry hash**; pre-solving packing as a **lookup over (footprint × core position)** so the inner solve leaves the hot path entirely. "This is real design work and it is scoped into Phase 5, not assumed away."

### 7.2 Phase 5 success criteria (§8.5)
| ID | Criterion | Threshold |
|---|---|---|
| P5-S1 | Hard-constraint violations in returned set | 0 |
| P5-S2 | Returned options distinct in design space | Per §18.3 metric |
| P5-S3 | Full run wall clock | ≤10 min p95 |
| P5-S4 | Re-rank on weight change without re-search | ≤2 s |
| P5-S5 | Immutable-run reproducibility (§13.4) | 100% |

**FR-OPT-001 Multi-Objective Search** (§9.5) — "Replace enumeration with search only where enumeration is demonstrated insufficient. Introducing NSGA-II and CP-SAT before enumeration has failed adds the largest performance and correctness risk in the system for no measured benefit." **Input is literally "Evidence that the configuration space cannot be enumerated within budget at required granularity."** Processing: evolutionary outer loop, solver inner loop, **hard constraints as feasibility filters, never as penalty terms**, surrogates and caching per §8.4. Output: Pareto front; **ranking decoupled from search**.

---

## 8. AI / LLM ARCHITECTURE — WHERE THE MODEL IS AND IS NOT ALLOWED (§18)

### 8.1 The deterministic / AI boundary table (§18.1) — verbatim
| Concern | Implementation | Phase |
|---|---|---|
| Geometry, areas, envelopes | Deterministic kernel | 0 |
| Rule applicability and evaluation | Deterministic | 0 |
| Capacity computation | Deterministic | 0 |
| Parking demand | Deterministic | 0 |
| Invariants | Deterministic | 0 |
| Validation | Deterministic, independent module | 0 |
| Configuration enumeration and scoring | Deterministic | 1 |
| Similarity scoring | Deterministic faceted (learned facet weights only much later) | 2 |
| Document extraction | **LLM/VLM, schema-constrained, human-reviewed** | 3 |
| Table extraction | **Deterministic parser — not the LLM** | 3 |
| Unit normalization, parameter binding | Deterministic pass over model output | 3 |
| Requirement classification | Deterministic mapping once the parameter is identified | 3 |
| Rule authoring | **Human-authored, LLM-drafted, never auto-published** | 3 |
| Explanation prose | **LLM, graph-grounded, numerically post-verified** | 3 |
| Unit packing | Constraint solver | 4 |
| Massing search | Enumeration → search only if justified | 1→5 |

### 8.2 The invariant (§18.2) — the one-sentence rule
> "**The LLM may read, structure, and narrate. It may never compute a number that reaches a user, and it may never author a rule that reaches production.**"

So the total LLM surface across all five phases is: (a) prose extraction into a strict candidate schema (Phase 3), (b) drafting rules for human approval (Phase 3), (c) explanation prose that is graph-grounded and numerically post-verified (Phase 3), and — only hypothetically and only as a proposal subject to the same gate as any candidate — layout proposal in Phase 4. **No LLM in Phase 0, Phase 1, Phase 2, or Phase 5.**

### 8.3 Design-space distinctness (§18.3) — corrects a V1 error
V1 required generated options "distinct in objective space above a threshold." "That is the wrong space: two schemes can score far apart and be formally identical, or score nearly identically and be completely different buildings." **Corrected: distinctness is measured in design space — typology identifier, core typology, tower plate aspect ratio (binned), floor count, podium level count. Two configurations are distinct if they differ in typology or core type, or in ≥2 of the remaining dimensions.** The threshold is a versioned asset under FR-GOV-001.

### 8.4 Why not end-to-end generative (§18.4)
"Non-reproducible, unexplainable, unfixable (a wrong setback can only be retrained, not corrected), untestable per rule, and legally indefensible. It would also require a training corpus of approved Dubai residential drawings **that does not exist and could not be lawfully assembled**."

### 8.5 Precedent is evidence, never authority (§17.2) — three enforcement levels
1. **Type level** — `PrecedentObservation` cannot be a `Constraint` source. "Not a runtime check; a type error."
2. **CI assertion** — no precedent node appears in any constraint's derivation path.
3. **Output linting** — report text framing precedent as permissive ("this is allowed because a previous project…") is **rejected by a linter before render**.

Precedent's permitted uses, in priority order (§17.3): calibration → plausibility bounding (advisory-only) → benchmarking → generator seeding (Phase 4, biasing typology selection) → explanation ("34 comparable approvals, median efficiency 76%" is "the sentence that persuades a committee"). **Not for:** overriding regulation, geometric copying, or justifying a non-compliant scheme.

---

## 9. HISTORICAL PRECEDENT MODEL (§17) — SCHEMA, TIERS, SIMILARITY

### 9.1 `PRECEDENT_PROJECT` record fields (§17.1)
`precedent_id` · `acquisition_path: PUBLIC | PARTNER` · `data_tier: A | B | C` · `source, licence, redistributable: bool, acquired_at` · `plot_reference, community, approval_date, land_use` · `plot_area, permitted_far, built_up_area, gfa` · `floors_above, floors_below, unit_count, unit_mix, nsa` · `parking_bays` · `achieved_far (derived)` · `efficiency (derived, requires nsa)` · `regulatory_regime_id` (required for the similarity gate) · `geometry` (**Tier A only**) · `feature_vector`.

### 9.2 Tiers
| Tier | Contents | Enables |
|---|---|---|
| A | Attributes + geometry + approval history | Massing precedent, layout patterns |
| B | Full attributes incl. NSA, mix, permitted FAR | **Efficiency and achieved-vs-permitted calibration — "the fields that matter"** |
| C | Partial attributes (typical of public data) | Density, floor count, parking-ratio benchmarking only |

"Public municipal permit data yields **Tier C, occasionally Tier B-minus**. It does not carry NSA, unit mix, or permitted FAR. **Tier B comes overwhelmingly from partner portfolios.**"

### 9.3 Similarity — three stages (§17.4)
- **Stage 1 Regime gate (binary, hard):** exclude precedents governed by a materially different regulatory regime for the parameters queried. "A project approved under a superseded parking standard is not comparable for parking questions, however similar its plot." Exclusion count is reported.
- **Stage 2 Faceted scoring — a vector, never a scalar:** `spatial` (distance, same community, same sub-community) · `dimensional` (plot area ratio, aspect ratio, shape complexity, frontage count) · `regulatory` (land use, permitted FAR, height band, coverage cap) · `programmatic` (building type, unit mix, density) · `contextual` (orientation, adjacency, road hierarchy) · `temporal` (approval recency, decay modifier). **Facet weights are per query domain, not global** — for a parking question, regulatory and temporal dominate and contextual is nearly irrelevant; for a massing question, dimensional and contextual dominate.
- **Stage 3 Transferability, which is not similarity:** "Similarity measures how alike two plots are. Transferability measures how much a specific lesson survives the difference. A precedent 88% similar overall but with two road frontages instead of one has high transferability for efficiency ratios and low transferability for massing and access strategy." Reported per domain with the divergences that reduce it.
- **Presentation rule:** never a headline percentage. Facet breakdown, top-three divergences, plain-language transferability statement. "A '92% similar' badge is false precision."

---

## 10. TECHNICAL ARCHITECTURE (§19)

### 10.1 Phase 0 architecture — one monolith, one SPA (§19.1)
```
React + TypeScript SPA (single app)
  plot form · boundary draw · results · provenance tree · assumption register
        │ REST
ONE Python FastAPI monolith
  api/          thin handlers
  definitions/  metric definitions annex
  rules/        typed records + evaluator registry
  geometry/     Shapely; exact predicates; independent area recomputation
  capacity/     envelope · parking · bands
  invariants/   NO IMPORTS FROM capacity/ or generation/ (import-linted)
  validation/   separate module, separate owner
  provenance/   emission at every boundary
  report/       HTML → PDF; JSON
  Runs execute synchronously (<10 s)
        │
PostgreSQL + PostGIS · S3 (versioned)
```

### 10.2 Explicitly removed from Phase 0, with reintroduction triggers (§19.2)
| Removed | Why | Reintroduce when |
|---|---|---|
| Microservices | "Eight services for a team of four pre-PMF is a platform, not a product" | Team > 12, or independent scaling need |
| Temporal / durable workflow | Phase 0 runs are seconds, not minutes | **Phase 5**, when runs are long and resumable matters — with run boundaries already understood |
| Redis | Nothing to cache at this latency | When a measured cache-hit benefit exists |
| pgvector | No embeddings until Phase 2 similarity | **Phase 2**, if vector search beats faceted scoring on the retrieval eval |
| Graph DB | Provenance is a bounded per-run DAG queried by root; Postgres recursive CTEs handle it | If cross-run graph queries become a product feature |
| Rule DSL + compiler | Premature abstraction before rule 100 | **~Rule 100**, when the shape is known |
| NSGA-II / pymoo | No search until enumeration is proven insufficient | **Phase 5, with evidence** |
| CP-SAT / OR-Tools | (same) | **Phase 4** |
| Rhino / Grasshopper | Windows-licensed, stateful, hard to containerize; wrong in a SaaS critical path | **Never in the core path; optional interop only** |
| DXF export | JSON + PDF suffice for Phase 0 | **Phase 1** |

*(Note: the "Why" and "Reintroduce when" columns are offset in the extracted text; pairings above are reconstructed by row semantics — the "No packing until Phase 4 → Phase 4" pairing for CP-SAT and "Phase 1" for DXF are the sensible readings.)*

### 10.3 Retained from V1 because retrofitting is a rewrite (§19.3)
Bitemporal rule storage · immutable runs · provenance emitted at every layer boundary · validator as a separate module with a different owner · exact geometric predicates with independent area recomputation · invariant layer (new, but same argument). "These are cheap now and unaffordable later. Everything else can wait."

### 10.4 Stack by phase (§19.4) — verbatim
| Phase | Additions |
|---|---|
| **0** | **Python 3.12, FastAPI, Shapely/GEOS, pyproj, PostgreSQL 16 + PostGIS, S3, React/TS, WeasyPrint, pytest** |
| **1** | **Background jobs (simple queue), DXF via ezdxf, XLSX via openpyxl** |
| **2** | **pgvector if it beats faceted scoring on the retrieval eval; data pipeline tooling** |
| **3** | **LLM API (zero-retention), layout-aware document parser, deterministic table parser, review UI** |
| **4** | **OR-Tools CP-SAT, 3D rendering (three.js), geometry kernel extension** |
| **5** | **pymoo, Temporal, Redis, autoscaling worker pool, surrogate model training** |

Note: the LLM is specified only as "LLM API (zero-retention)" — **no vendor, model, or price is named anywhere in the PRD**.

---

## 11. EVALUATION FRAMEWORK (§22)

### 11.1 Eight evaluation layers E0–E7 (§22.1)
| Layer | What | Method | Phase | Gate |
|---|---|---|---|---|
| E0 Invariants | Arithmetic coherence | Automated, **every artifact including documents** | 0 | 100% |
| E1 Rules | Rule correctness | **3 tests each**, boundary + negative | 0 | 100% pass |
| E2 Geometry | Envelope and area correctness | Golden set, independent recomputation | 0 | **≤0.1% self**; band-match vs. architects |
| E3 Professional agreement | "Does a qualified architect agree?" | Two-architect golden set (§23) | 0 | **8/10 within band** |
| E4 Extraction | Field accuracy | Held-out gold set | 3 | **≥95% critical** |
| E5 Precedent backtest | "Do estimates match outcomes?" | Held-out approved projects | 2 | **Coverage ≥80% and sharpness ≤20%** |
| E6 Generation quality | "Are the floors any good?" | **Blind architect panel with real-floor controls** | 4 | **≥70%, α ≥ 0.6** |
| E7 Decision impact | "Did it change the outcome?" | Customer-reported carry-through | 1+ | **≥40% baseline** |

*(E5/E6/E7 thresholds are offset in the extracted table and reconstructed from §5.4, §7.6 and §4.4 respectively.)*

### 11.2 The inter-architect variance measurement — "do this first" (§22.2)
"**Week 1 of Phase 0, before any engine code.** Give three qualified architects the same three plots with the same data packs and ask for buildable envelope, permitted GFA, and parking demand. **Expected spread on setback interpretation, edge classification, and projection treatment: 4–8%.** If that is what it is, then a **2% accuracy target against a single architect's answer is measuring noise**, and the product claim changes from 'accurate' to 'consistent, explicit, and reproducible' — which is a stronger and more defensible claim anyway, and it should be measured before it is marketed."

### 11.3 Metrics that are absolute — release blockers (§22.3)
| ID | Metric | Target |
|---|---|---|
| M-INV | Emitted artifacts passing invariants | 100% |
| M-PRV | Emitted values with a provenance class and complete derivation | 100% |
| M-APP | Rules reaching production without a named approver | 0 |
| M-PRE | Precedent nodes in constraint derivation paths | 0 |
| M-DEF | Reports listing their deferred checks | 100% |
| M-RUN | Immutable-run reproducibility (§13.4) | 100% |

"These are integrity properties, not quality targets. **Any failure is a release blocker.**"

### 11.4 Metrics that must be paired (§22.4)
| Metric | Must be paired with | Why |
|---|---|---|
| Backtest coverage ≥80% | Sharpness ≤20% | "Coverage alone is gamed by widening the band" |
| Self-consistency PASS | Rule coverage % | "Passing constraints you did not encode is meaningless" |
| Extraction accuracy | Queue-vs-drop rate | "99% accuracy on 60% of statements is not 99% accuracy" |

### 11.5 The five-way claim statement, in every validation report (§16.5, §2.2)
Five statements, **separately, verbatim**: SELF-CONSISTENCY (PASS/FAIL) · RULE COVERAGE ("We encoded N of M requirements identified as applicable. K are deferred and listed below." Status N/M, coverage X%) · GEOMETRIC VALIDITY (PASS/FAIL, areas independently recomputed and agree) · **REGULATORY VALIDITY — "NOT ASSESSED. This system does not and cannot determine whether an authority would approve this scheme."** (line 4 "is permanent and never changes") · PROFESSIONAL AGREEMENT (populated from the golden set: "fell within the inter-architect disagreement band in X of Y cases", or NOT YET MEASURED).

Principle 7 (§2.4): "the validator agreeing with the generator is self-consistency, nothing more. **No output, no report, no marketing material may describe it as compliance.**" §24.4: "No marketing material claiming compliance verification, guarantee, or assurance."

---

## 12. GOLDEN DATASET (§23)

### 12.1 Composition, Phase 0 (§23.1)
| Item | Quantity | Source | Purpose |
|---|---|---|---|
| Real plots, one community, one land use | **10** | Design-partner land packs | Golden set |
| Independent architect computations per plot | **2** (two architects, **blind to each other**) | Contracted | Ground truth **and variance measurement** |
| Mechanized rules | **~40** | Authored by the project architect | Rule base |
| Rule test cases | **120** | Concurrent with authoring | E1 |
| Metric definitions | **1 annex** | Architect + partner sign-off | **Root dependency** |

**"Total external data dependency: ten land packs from one friendly developer. No municipal negotiation. No open-data licensing. No scraping."**

### 12.2 Why two architects, not one (§23.2)
"A single architect's answer is not ground truth — it is one sample from a distribution whose width nobody has measured." Two independent computations give: (1) **a band, not a point** — the engine target becomes "within the band"; (2) **the variance figure itself, which is a headline product asset** — "If architects disagree by 6%, 'we are consistent and reproducible' is a stronger pitch than 'we are accurate'"; (3) **detection of engine bias** — "Systematically landing at one architect's end of the band is a signal worth investigating."

### 12.3 The circularity, acknowledged (§23.3)
"The golden set requires FAR, height and setbacks per plot — the same plot data the engine needs and which may not be on the affection plan. **This is why the golden set comes from design-partner land packs, not from public sources.** It also makes the golden-set exercise a direct test of assumption A1: of ten land packs, how many actually contained FAR, height and setbacks without further enquiry? **That number is a Phase 0 deliverable in its own right.**"

### 12.4 Rule test requirements (§23.4)
Every rule gets **1 positive, 1 boundary (at the threshold), 1 negative (applicability correctly excludes)** = 3 tests × ~40 rules = 120 cases. "**Boundary cases matter most** — threshold-dependent rules switching at the wrong point is the highest-frequency rule defect."

---

## 13. KILL / RE-SCOPE CRITERIA (§26) **[reconstructed — table columns scrambled in source]**
"Agreed in advance so they are evidence-triggered, not argued."
| Finding | Threshold | Action |
|---|---|---|
| Inter-architect variance | **> 10%** | Accuracy is not the value proposition. Reposition around consistency, explicitness, auditability. **Rewrite marketing before shipping.** |
| Mechanization rate on first 40 rules | **< 50%** | Compliance surface too thin to claim coverage. Re-scope to a narrower parameter set; reduce the claimed rule count publicly. |
| Rule authoring throughput on complex rules | **< 4/day** | Knowledge-base cost is **~3× budget**. Either raise on that basis or narrow the jurisdiction slice. Do not proceed on the original estimate. |
| Land packs containing FAR + height + setbacks | **< 5 of 10** | The input model is wrong. The product's first job is data assembly, not computation — "a different product and needs a different plan." |
| Users opening the provenance tree | **< 1 of 3 sessions** | The trust thesis is wrong. Everything downstream of §13 needs re-examination **before Phase 1**. |
| Engine within two-architect band | **< 6 of 10** | Do not ship. Diagnose whether it is rules, geometry, or definitions. |
| Phase 2 backtest coverage or sharpness | **Either missed** | Historically-observed capacity does not ship. Keep the user-entered discount. |
| Phase 4 architect panel | **< 60%** | Phase 4 does not ship. Phases 0–3 remain the product. **Pre-authorized.** |
| Phase 1 enumeration insufficient at production granularity | **Not demonstrated** | Phase 5 search does not begin. Enumeration stays. |

---

## 14. HUMAN APPROVAL GATES BY PHASE (§21)
**Run gates:** G1 plot & parameter confirmation (user, blocks rule resolution, Phase 0) · G2 rule-set acknowledgement (blocks capacity computation, Phase 0) · G3 assumption-register acknowledgement (blocks **any export**, Phase 0) · G4 named reviewer on export (blocks external sharing, Phase 0) · **G5 brief contradiction resolution (blocks configuration enumeration, Phase 1)** · **G6 variance review (second user, tenant-configurable, default on for multi-seat; blocks variance application, Phase 1)**.

**Shared-asset gates (§21.2)** — "the gates V1 missed… higher blast radius than run gates, because they affect every customer at once": rule publication (qualified regulatory architect); life-safety rules (+ fire/life-safety specialist as second reviewer); default assumption values ("Changing a default bay-area factor silently changes every customer's capacity"); metric definitions annex ("root of every computed value", architect + design partner sign-off); typology library entries; objective normalization functions ("determines rankings"); deferred/non-mechanizable classification ("determines what the report claims not to have checked — a liability statement"); adjudication records; design-space distinctness threshold ("determines what users see as 'different options'"). **Every one versioned, changelogged, triggers impacted-run identification within 24 h. Past runs are never mutated.**

---

## 15. CAPACITY CONCEPTS, KEYED TO PHASE (§15.1) **[reconstructed — table scrambled]**
| # | Concept | Question | Available from | Provenance class |
|---|---|---|---|---|
| A | Regulatory capacity | What does FAR and the area caps permit? | Phase 0 | DERIVED |
| B | Geometric capacity | What does the envelope physically hold under height and footprint limits? | Phase 0 | DERIVED |
| C | Parking capacity | What can the achievable parking supply support? | Phase 0 | DERIVED |
| D | Commercially preferred capacity | What does the developer's own objective profile select? | **Phase 1** | DERIVED + profile version |
| E | Historically observed capacity | What have comparable plots actually achieved? | **Phase 2, gated** | OBSERVED, with n |

`governing = min(A, B, C)`, always named, always with binding rule cited, headroom to next-binding constraint reported. Integer granularity loss reported, not absorbed (worked example: 300 m², 1.88% of permitted GFA).

---

## 16. ASSUMPTIONS THAT PHASES 1–2 EXIST TO TEST (§31.2)
- **A7** Developers will pay for capacity computation alone → tested by Phase 0 design-partner conversion. If false: accelerate Phase 1; Phase 0 becomes an internal foundation rather than a product.
- **A8** Exhaustive enumeration over 4–6 typologies is sufficient at production granularity → Phase 1 measurement. If false: **Phase 5 becomes necessary; budget the §8.4 mitigations.**
- **A9** 2–3 developer partners will contribute historical portfolios under contract → Phase 2 partnership effort. If false: Tier B unavailable; historically-observed capacity does not ship; USER_SET discount persists.
- **A10** Public municipal data lacks NSA, mix and permitted FAR → Phase 2 profiling. If false: **"Good news — Path A becomes viable for calibration and Phase 2 accelerates."**
- **A11** Curated parametric typologies capture the majority of viable residential-tower configurations → architect review, Phase 1. If false: typology library must expand substantially, or free-form generation becomes necessary far earlier than planned.
- **A12** Standards hard/soft classification can be elicited in a single onboarding session → Phase 1 onboarding. If false: onboarding cost rises materially; may need to be billable.
- Structural (§31.3): **A17 — non-convex plot geometry can be addressed in Phase 4 without invalidating the Phase 0 kernel** (monitoring: design review before Phase 4). A14 — a qualified regulatory architect is hirable as a full-time founding-team member: "**this is the schedule's binding constraint**".
- **R-01 risk (§25):** "Team builds generation first because it demos well" — Likelihood High, Impact Critical. Mitigation: phase gating with the dependency argument; **Phase 0 must ship before Phase 1 starts.**

## Key numbers
- Phase durations: P0 8-12 wk, P1 10-14 wk, P2 12-16 wk, P3 10-12 wk, P4 16-20 wk, P5 12-16 wk; cumulative ~18-24 months
- Ships-to by phase: P0 1-2 design partners free; P1 3-5 paying customers; P2/P3 same base as upgrade; P4/P5 gated
- Phase 0 scope: ~40 mechanized rules, 10 golden plots, 120 rule test cases (3 per rule: positive, boundary, negative), 1 metric definitions annex, 18 invariant checks, 3 capacity bands A/B/C
- Phase 0 team: 4 FTE (regulatory architect, backend/geometry engineer, full-stack engineer owning invariants+validation, product/tech lead) + 3 contracted architects for ~10 days; NO AI/ML engineer
- P0-S2 / E3 gate: engine within two-architect band on 8 of 10 plots; kill if < 6 of 10
- P0-S5: full computation < 10 s, runs synchronous
- P0-S6: provenance tree opened unprompted in >=2 of 3 design-partner sessions; kill if < 1 of 3
- Expected inter-architect spread 4-8%; kill/reposition threshold > 10%; measured Week 1 of Phase 0 with 3 architects x 3 plots
- Phase 1 enumeration: 50-500 configurations, 4-6 typologies, >=4 typologies attempted where envelope permits
- P1-S1: 3-6 distinct configurations per project, distinct in DESIGN space (typology id, core typology, binned plate aspect ratio, floor count, podium level count; differ in typology or core type, or in >=2 remaining dimensions)
- P1-S5 / FR-CFG-001 AC4: enumeration completes < 60 s; FR-OBJ-001 AC4: re-rank on weight change < 2 s without re-enumeration
- FR-OBJ-001 AC2: if top two configurations are within 3%, system must declare the recommendation not robust
- P1-S6: >=3 paying customers; P1-S7 / E7: >=40% of recommended configurations carried into design without material capacity revision (baseline measurement)
- Phase 2 precedent gate: n >= 8 observations in conditioning cell; backtest coverage >= 80% within P10-P90; sharpness median (P90-P10)/P50 <= 20%; below n=8 returns INSUFFICIENT_PRECEDENT
- P2-S1: >=120 precedent records at Tier B completeness, of which Path B >= 40; P2-S2 / FR-SIM-001 AC4: >=70% of top-5 judged relevant across 30 subject plots
- Path A data target: 300 Dubai residential towers approved since 2010, 10 fields; Path B target: 40+ projects from 2-3 partners (10-40 per partner)
- Precedent flagging: configurations above the 95th percentile of precedent tagged OPTIMISTIC_VS_PRECEDENT, advisory only, never removed
- Phase 3: developer standards documents are 60-80% tables; tables go to a deterministic parser, only prose to the LLM
- P3-S1: >=95% critical-field extraction accuracy on gold set; P3-S2 0 rules to production without approval; P3-S3 0 silent drops; P3-S4 100% confidence labelled; P3-S5 >=50% onboarding time reduction
- Phase 4 gate: 100% geometric validity, 100% invariant pass, >=70% blind architect panel, Krippendorff alpha >= 0.6; below 60% panel Phase 4 does not ship (pre-authorized deferral)
- Phase 5 entry: P4-S1..S4 met and stable across two consecutive evaluation rounds
- Phase 5 performance arithmetic: population 100 x 50 generations = 5,000 evaluations; at 2 s per inner packing solve = ~2.8 CPU-hours; ~5 min wall clock on 32 cores; realistic first implementation 30-90 minutes
- P5-S3: full run <= 10 min p95; P5-S4: re-rank <= 2 s; P5-S1: zero hard-constraint violations; P5-S5: 100% immutable-run reproducibility
- Absolute release-blocking metrics: M-INV 100%, M-PRV 100%, M-APP 0, M-PRE 0, M-DEF 100%, M-RUN 100%
- E2 geometry gate: independent area recomputation agrees within 0.1% on all golden plots
- Stack P0: Python 3.12, FastAPI, Shapely/GEOS, pyproj, PostgreSQL 16 + PostGIS, S3, React/TypeScript, WeasyPrint, pytest
- Stack P1: background jobs (simple queue), DXF via ezdxf, XLSX via openpyxl
- Stack P2: pgvector (only if it beats faceted scoring on the retrieval eval), data pipeline tooling
- Stack P3: LLM API (zero-retention), layout-aware document parser, deterministic table parser, review UI
- Stack P4: OR-Tools CP-SAT, three.js 3D rendering, geometry kernel extension
- Stack P5: pymoo, Temporal, Redis, autoscaling worker pool, surrogate model training
- Rule DSL + compiler deferred to ~rule 100; Rhino/Grasshopper never in the core path
- user_realism_discount defaults to 1.00, class USER_SET; no realistic/expected/likely band exists in Phase 0 or 1 - absence enforced by schema (field does not exist)
- Kill thresholds: mechanization rate < 50%; rule authoring throughput < 4 rules/day (=> knowledge-base cost ~3x budget); land packs with FAR+height+setbacks < 5 of 10
- Impacted-run identification within 24 h of any shared-asset change; past runs never mutated

## Open items
- Several source tables are column-scrambled by PDF text extraction and I reconstructed the row pairings: Phase 1 criteria (section 4.4), Phase 3 criteria (section 6.6), capacity concepts (15.1), evaluation layer gates (22.1), kill criteria (26), Phase 0 architecture removals (19.2), data acquisition (28.1), shared-asset approvers (21.2). Any of these that becomes contractual must be re-read from the original PDF before quoting.
- No LLM vendor, model, context window, or price is named anywhere - the stack says only 'LLM API (zero-retention)' at Phase 3. A contractor quoting Phase 3 needs the provider decision, the zero-retention contractual requirement, and expected document volume/pages per onboarding.
- 'Layout-aware document parser' (Phase 3) is unnamed - build vs. buy is unresolved, and it is a material cost line.
- Phase 3 gold set size is never stated. Section 23 defines the Phase 0 golden dataset (10 plots, 2 architects, 120 rule tests) but there is no stated count of documents/fields for the E4 extraction gold set, nor for the 'critical field' list that the >=95% applies to.
- 'Critical fields' for P3-S1 are never enumerated - the 95% threshold has no defined denominator.
- Phase 4 architect panel is unsized: number of panellists, number of floors judged, and the real-floor control set are not specified, yet Krippendorff alpha >= 0.6 and >=70% are hard ship gates.
- Phase 2 is gated on partner-portfolio acquisition whose timeline is explicitly outside the team's control (A9). Contracts with 2-3 developer partners are a prerequisite, not a task.
- Municipal open-data commercial licence permitting derivative analytical use is assumed but unconfirmed; licence review is a named-person ingestion gate with no named owner in the document.
- Open question Q1 (does parking count toward FAR in the target jurisdiction?) is BLOCKING per FR-DEF-002, unresolved, and swings capacity 15-35%. Due Phase 0 week 2.
- Open question Q2 (typical FAR values for target plots) affects whether the generation machinery in Phases 4-5 targets the right problem size: 'If FAR is 3-5, a 2,000 m2 plot is a small point block, not a tower.'
- Team size beyond Phase 0 is never specified. Only the 4-person Phase 0 team is costed; Phases 1-5 (48-74 weeks of additional work) have no stated headcount, which is the single largest gap for a contractor quote.
- Whether Phase 5 happens at all is contingent on A8 - if enumeration is sufficient at production granularity, Phase 5 'may be substantially reduced or skipped'. A quote covering Phase 5 should be optioned, not committed.
- Delivery order is ambiguous between numbering and roadmap: section 2.3 lists 0-1-2-3-4-5, section 33 delivers 0-1-3-2-4-5. The PRD says 'either order works'. The client must pick one before a schedule is priced.
- Non-convex / irregular plot geometry is deferred to Phase 4 on assumption A17 (that it can be added without invalidating the Phase 0 kernel), monitored only by 'design review before Phase 4'. If A17 is false the geometry kernel is partly rebuilt.
- Professional indemnity insurance for this product description (A15) is unconfirmed and is flagged as a Phase 0 week 8 item; UAE counsel review of the professional-use disclaimer is a Phase 0 governance checkbox.
- Hiring risk: A14 states a qualified Dubai-licensed regulatory architect as a full-time founding team member is 'the schedule's binding constraint'. Sequencing any quote around the metric-definitions annex (week 1, gates everything) depends on that person being in place at day one.
