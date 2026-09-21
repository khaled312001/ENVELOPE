# Engagement And Scope

## Verdict

Buildable — but the client verbally described Phase 4 and sent a document that funds Phase 0, and that gap is the whole engagement. Khaled should give the feasibility verdict FREE on the call (it is what wins the job), then sell a 2-week paid Discovery + Spike that proves the setback↔floor-count fixpoint and envelope solver on one real plot with click-through provenance. Do NOT quote Phase 0 as written: the PRD's Phase 0 is 32–48 person-weeks across 4 FTE; Khaled solo delivers ~12 in the same calendar. A solo Phase 0 is only honest at roughly half the specified scope, and only if the client owns the rule authoring, the 10 land packs, the metric-definitions annex and the contracted architects. Roughly half the Phase 0 critical path is not software. Sigma PMO reuse is real for rules/citations/provenance/audit/approval/tenancy/reporting and zero for the geometry and capacity core — which is exactly where the risk is. No budget, no timeline, no named community, no design partner and no answer to the blocking parking-in-FAR question exist anywhere in the corpus; nothing can be priced until those are answered.

---

## 1. The verdict he actually asked for

His literal ask (voice note 3, verified verbatim in the transcript): *«محتاج حد فاهم في الموضوع، وهو أصلا يعرف يقول لي هو فعلا الموضوع ده قابل للتنفيذ ولا لا»* — "I need someone who understands this, who can actually tell me whether this thing is implementable or not."

He did not ask for a price, a timeline, a proposal, or a portfolio. **Opening with commercials answers a question he did not ask.** Give the verdict on the call, free, in this shape:

| Layer of his own stack | Verdict | Why |
|---|---|---|
| Rule engine + citations + provenance | **Yes, confidently.** Shipped this before. | It is records, versioning, approval and graph traversal. Sigma does it today. |
| Geometry kernel + envelope solver (per-edge offsets, coverage, plate cap, height, the setback↔floor fixpoint) | **Yes, with real effort.** ~4–6 weeks of careful work. | 2D polygon offset/intersection on rectilinear and convex plots is engineering, not research. The fixpoint his own deck works out (G+10→7.50 m→7.6 floors, converging in 3 passes) is a bounded iteration. |
| Parking chain + three capacity bands + invariants + report | **Yes.** | Arithmetic with discipline. |
| Constraint solver over unit packing, generation of floor plans, "it does the design for me" | **Not in the first year, and not from a fixed price.** | Unit packing on arbitrary polygons is the genuinely hard case; the PRD defers it to Phase 4 (16–20 weeks, ~12–18 months out) and pre-authorizes never shipping it if a blind architect panel scores <60%. |
| Optimization (Phase 5) | **Should be optioned, never committed.** | The PRD's own arithmetic: 100 pop × 50 gens × 2 s inner solve ≈ 2.8 CPU-hours/run; realistic first implementation 30–90 min. And it may be unnecessary if enumeration suffices. |

**The one sentence to say to him:** the bottom of your stack is buildable now and nobody in Dubai has it; the top of your stack is a research bet you should not fund until the bottom has been measured. That is not a downgrade of his idea — it is his own PRD's argument (§1.3), which he sent and has never described.

---

## 2. Three different scopes, which he is conflating

### (a) What the PRD demands
The full ENVELOPE: 6 phases, ~18–24 months, a **4×1.0-FTE team** (verified at PRD §32.1: Regulatory Architect with veto over rule publication, Senior Backend/Geometry Engineer, Full-stack Engineer, Product/Tech Lead) plus 3 contracted architects (~10 days), plus UAE counsel review of the disclaimer, plus PI insurance before the first paying customer. Phase 0 alone is 8–12 weeks × 4 FTE.

**This is a company, not a freelance engagement.** He is hiring one developer from a Facebook post with no budget stated.

### (b) What he verbally asked for
A **design generator**: *«هو اللي يعمل لي الديزاين نفسه»* — "it is the one that does the design for me, itself." His typed stack ends at `BIM / CAD Output`. His diagram ends at `GENERATION → OPTIMIZATION → VALIDATION → OUTPUT`.

PRD §3.2 Out (verified at line 426): *"LLM anything · optimization · multiple configurations · floor plans · precedent · similarity · jurisdiction overlays · DXF · realistic capacity band."* **Phase 0 draws nothing.** For 8–12 weeks he receives a PDF and a JSON — nothing he can open in his own CAD software.

His own PRD logs this as **R-18: "Customers reject Phase 0 as 'just a calculator'"** (Medium/High), and dedicates §34 to rebutting it. The rebuttal is pre-written, in his own file, in his own words. **Surface this on call one, not at delivery.** Get his reaction while it costs nothing.

### (c) What a first engagement should sensibly be
Two steps, and only the first is priced now:

**Step 1 — Discovery + Spike (2 weeks, fixed fee).** See §4.
**Step 2 — "Phase 0-cut" (10–12 weeks, fixed scope, priced only after Step 1).** See §5.

Everything from Phase 1 onward is optioned, never committed.

---

## 3. The arithmetic that settles the scope argument

| | Person-weeks |
|---|---|
| PRD Phase 0 as written (4 FTE × 12 wk) | **48** (32 at the 8-week end) |
| — of which Regulatory Architect (rule authoring, annex, deferred classification, approvals) | 12 → **client's own time if Ahmed is that person** |
| — of which Product/Tech Lead (design partner, land packs, measurement) | 12 → **mostly client's** |
| Engineering proper (geometry/capacity + full-stack/invariants/report) | **24** |
| Khaled solo, full-time, 12 weeks | **12** |

**Conclusion:** full Phase 0 solo is ~24 weeks calendar, or ~12 weeks at roughly half the scope. Quoting the PRD's Phase 0 at a solo rate on a 12-week calendar is a guaranteed overrun with the blame landing on Khaled. This table is the single most useful thing to put in front of the client.

---

## 4. The first paid milestone

**Give the verdict free on the call. Sell the proof.**

### Milestone 0 — Discovery + Technical Spike · 2 weeks · fixed fee

**Deliverables:**
1. **Written feasibility verdict**, component by component, marking what is certain / effortful / research-grade — the artefact he asked for, in writing.
2. **A running spike** on one real plot (use his own example: 20×30 m, or the deck's 80×40 m at FAR 5.0):
   - per-edge inward setback offsets from ~5 hand-encoded DBC rules
   - the **setback↔floor-count fixpoint** — his deck's own worked example, converging in 3 passes (this is the thing that proves the engine constructs rather than checks)
   - envelope → coverage cap → plate cap → height ceiling, with the **binding constraint named per dimension**
   - one capacity band with its derivation
   - **click-through provenance on every number**
   - area computed twice by independent methods, agreeing to ≤0.1%
   Runs in a browser. No polish, no basemap, no PDF, no auth, no database required.
3. **Decision list** with owners and dates for the blocking unknowns (§7 below), including the parking-in-FAR question.
4. **Fixed-price, fixed-scope Phase 0-cut proposal**, conditional on those answers.

**Why this is the right first milestone:**
- It answers his actual question with evidence rather than opinion.
- It is the strongest possible differentiator against the American tools he mentioned but could not name.
- It de-risks *Khaled's own quote* — he will have measured his real throughput on real geometry before pricing 12 weeks.
- It is small enough that a client with no stated budget can say yes.

**Explicitly excluded from Milestone 0:** any UI polish, basemap or map tiles, PDF generation, persistence, authentication, more than a handful of rules, any accuracy claim, any comparison against an architect.

---

## 5. Phase 0-cut — the contractable Step 2

### IN
- Metric-definitions annex **as implemented data structures** (client authors and signs the content — see §6)
- Rule records + evaluator registry (the 12 named functions), bitemporal store, approval workflow, test harness (3 tests/rule: positive, boundary, negative)
- **25–30 rules encoded** (the PRD itself authorizes cutting from 40 to 30 rather than extending the schedule; client authors the regulatory content, Khaled builds the schema and encodes)
- Geometry kernel: per-edge inward offset, polygon intersection, area by two independent methods, validity/simplicity checks, exact predicates, **UTM 40N for all computation, WGS84 display only**
- Envelope solver + binding-constraint attribution + both constraints reported where they bind within 1%
- Setback↔floor-count fixpoint, bounded at 5 iterations, convergence tested on the rule set not the load value
- Parking chain: demand → bay-area factor → required area → levels → headroom → supportable unit ceiling
- Capacity bands A/B/C, governing = min(A,B,C) named, integer-granularity loss reported
- **Invariant module: the 13 checks that are actually exercisable in Phase 0** — separate module, no imports from capacity/, import-linted in CI, failure blocks emission
- Independent validation module + the five-way claim statement verbatim
- Provenance graph, non-null class on every emitted value, click-through derivation tree
- Assumption register with ±10% (or ±1 unit) perturbation, ranked by effect on governing capacity, amber everywhere, inline-editable
- Plot entry: form with per-edge lengths/bearings + **mandatory edge classification, no default**
- PDF + JSON export, JSON round-trips
- Immutable runs: content hashes, engine version, RNG seed, full provenance persisted
- Gates G1–G4; single-tenant with named-user identity (required by G4 "named reviewer" and USER_SET badges — the PRD never specifies auth at all, which is a gap)

### OUT — state these in writing, in the contract
- **Anything generative**: floor plans, unit layouts, unit mix, massing, cores, typical floors
- **CAD/BIM output**: no DXF (Phase 1), no IFC (deferred to V4), no Rhino/Grasshopper ever in the core path
- **Any LLM**, any document extraction, any OCR
- Optimization, multiple configurations, typology library
- Precedent, similarity, municipality data, benchmarking
- Non-convex / irregular plots (`shape_class = COMPLEX` rejected at the data layer)
- Multi-community, multi-land-use, second jurisdiction
- Any "realistic"/"expected"/"likely" capacity band (absence enforced by schema)
- Multi-tenant SaaS, billing, role matrix, mobile
- The §16.2 contradiction battery (the PRD marks it Phase 1)
- **Any compliance claim.** Legal review, PI insurance and marketing review are the client's.

### Two scope reductions worth arguing for explicitly

**(i) The 18 invariants are really 13 in Phase 0.** Five of them — INV-02 (Σ unit NSA + core + circulation = level gross), INV-04 (Σ unit counts = reported count), INV-05 (Σ mix shares = 1.000), INV-06 (count × weighted mean NSA = total NSA), INV-07 (efficiency = NSA/GFA) — all require a unit schedule, unit mix and NSA that **Phase 0 does not generate**. Build them as dormant stubs, activate in Phase 1. Note also that the PRD's own Appendix A.7 tabulates only 16 of 18 (INV-14 and INV-15 are missing) while A.8 claims "PASS — all 18 invariants." Raise this: it is evidence the document has not been engineering-reviewed, and it protects Khaled from a checkbox he cannot satisfy.

**(ii) Basemap boundary drawing is optional, not core.** The client's own description of his input is *«مساحتها كام في كام… عشرين متر في تلاتين متر، الأضلاع بتاعتها»* — "how much by how much, 20 by 30 metres, its sides." **The affection plan gives dimensions, not coordinates.** A form taking per-edge lengths and bearings gets 95% of the value with none of the map-tile licensing, drawing UI, snapping and CRS-transform work. Offer the basemap as a priced add-on.

### Acceptance criteria — the critical contract point
Acceptance must be tied to what Khaled controls: the software computes, traces every value to a provenance class, passes its own invariants, round-trips its JSON, and runs inside the time budget.

**Acceptance must NOT be tied to P0-S2 (engine within the two-architect band on 8 of 10 plots).** That outcome depends on the quality and completeness of rules the *client* authors, on the metric definitions the *client* signs, and on architects the *client* contracts. Khaled cannot warrant it. Same for P0-S6 (users open the provenance tree in 2 of 3 sessions) and every measurement criterion — those are the client's business risk, and four of the six Phase 0 kill criteria fire on measurements Khaled does not control.

---

## 6. What is NOT software delivery — the client's own obligations

This is the section that most changes the shape of the deal. Roughly **half the Phase 0 critical path is not code**, and the PRD's own critical path (§32.3) starts with a document, not a repository: *"The metric definitions annex is the root. Nothing computes an area term until it is signed."*

| Obligation | Why it is the client's | Consequence if he does not do it |
|---|---|---|
| **Regulatory Architect role** — authoring ~30–40 rules, binding each to a parameter, attaching citations (instrument, clause, page, bbox, verbatim text), writing 3 tests each, and **approving every one by name** | PRD §32.1 makes it 1.0 FTE with veto over rule publication and calls it "the single most important hire"; R-13 calls it "the schedule's binding constraint". The evaluator refuses to load unapproved records and **no bypass flag exists** (M-APP = 0) | The engine has nothing to run. Khaled builds a machine with an empty rule base. |
| **Metric-definitions annex** — ≥10 terms (GFA, BUA, NSA, Sellable, Gross/Tower Efficiency, Parking Area, Bay Area Factor, FAR, Plot Coverage), each with explicit inclusions/exclusions, signed week 1 | FR-DEF-001 AC5: *"No code merges that computes an area term absent from the annex."* Architect + design-partner sign-off required | **No area code can be written at all.** This is a hard stop in week 1, not a soft dependency. |
| **10 land packs from a design partner developer** | §23.1: *"Total external data dependency: ten land packs from one friendly developer."* One relationship gates the entire phase | Kill criterion: if <5 of 10 carry FAR + height + setbacks, *"the product's first job is data assembly, not computation — a different product and needs a different plan."* |
| **3 contracted architects** for the variance measurement (3 plots × 3 architects, week 1, ~10 days) **and 20 golden-set computations** (10 plots × 2 architects, blind to each other) | Contracted and paid by the client. This is real cash and it is nowhere in the corpus | No accuracy claim is possible; P0-S1, P0-S2, P0-S7, P0-S8 all go unmeasured — and §32.4 says *"A Phase 0 that ships perfect software and measures none of these has failed."* |
| **Q1: does parking count toward FAR?** | Reg. Architect, due week 2. Swings capacity **15–35%**. FR-DEF-002 AC1: never `ASSUMED`, only `DERIVED` or `USER_SET`, **no default**; AC2: the project cannot compute capacity until declared | Blocking. Either it resolves to a cited rule, or it stays `OPEN_REGULATORY_QUESTION` permanently and Khaled must build the dual-scenario one-click comparison (AC4 requires that regardless) |
| **Naming the community and the land-use slice** | Never named anywhere in the PRD. Rule authoring, land packs and the golden set all depend on it | Nothing can start. |
| **Licensed copies of DBC (843 pp) + UAE Fire & Life Safety Code (707 pp)**, and the right to derive a commercial product from them | The deck cites page counts "as supplied", implying he has them | IP exposure at diligence |
| **Basemap tile licence** (only if the basemap option is taken) | Commercial vendor, unnamed in the PRD | — |
| **UAE counsel review of the professional-use disclaimer**; **PI insurance before the first paying customer** | §24.4 makes counsel review an MVP checkbox; R-07 (Low/**Critical**) makes PI insurance a precondition | Khaled must never be the party making or warranting a compliance claim |
| **Design-partner recruitment**; **Dubai Municipality relationship** (Phase 2) | §28.3 classes the data he wants as Tier 2/3: *"requires relationship"* / *"do not plan around"* | Phase 2 does not ship; the USER_SET discount persists |

**How to frame this to him without it sounding like excuse-making:** *"Half of Phase 0 is your expertise, not my code. That is not me offloading work — it is why this is buildable at all. If I had to hire a licensed Dubai architect to author the rules, this becomes a company with a payroll. Because you are that architect, it becomes a project."* That reframes the biggest cost line as his contribution and his equity in the outcome.

---

## 7. Sigma PMO reuse — real vs. superficial

I verified this directly against the guide rather than accepting the marketing read.

### REAL reuse — patterns Khaled has already shipped in production

| Sigma capability (verified) | Maps to |
|---|---|
| `/sources` — read-only approved-reference catalogue. **«أي استنتاج بلا وسم [SOURCE: id] ُيَعّد افتراضًا غير موّثق»** ("any inference without a `[SOURCE: id]` tag is treated as an undocumented assumption"), and **«لا ُتدَر ج إلا مصادر جرى التأّكد من وجودها؛ ولا ُيستشهد بما لا يمكن فتحه»** ("only sources verified to exist are listed; nothing that cannot be opened is cited") | FR-RUL-001 AC1, Principle 9 citation fields (instrument, clause, page, uri, verbatim text) — **and it is the client's own typed rule A, already running** |
| `/knowledge` — rule library with code, severity, references; a rule row opens **«نّصها ومعيارها والمحّرك الذي يطّبقها»** ("its text, its standard, and the engine that applies it") | The RULE record + evaluator registry pattern. Note: Sigma's rules are governance/checklist rules; the record, versioning, approval and citation machinery transfers, **the evaluator semantics do not** |
| `/journey` + per-line **تتّبع(…)** on `/quantity-survey`, which opens source sheet → row → classification rule → the standard behind it. Described as **«الجواب التدقيقي لسؤال: من أين جاء هذا الرقم»** ("the audit answer to *where did this number come from*") | **§13 provenance graph with click-through.** This is the single most valuable transfer, and the PRD insists it *cannot be retrofitted* |
| `/input` — SHA-256 content-addressed intake, archived unmodified, parse → verify → confidence → route; two-step propose/approve so nothing is written before approval | Immutable runs, content hashes, §13.4 M-RUN reproducibility |
| `/audit` — append-only, **«لا شيء هنا قابل للتعديل أو الحذف»**; `/admin/personas` — editing raises a version rather than overwriting | FR-GOV-001 shared-asset versioning; "past runs are never mutated" |
| `/admin/roles` — server-enforced role × permission grid, multi-tenant, EN/AR | **Fills a real PRD gap**: §9.1 specifies no auth or identity at all, yet G4 ("named reviewer on export") and `USER_SET` badges both require it |
| `/comparison` — AI output beside a human expert's on the same task, **«بلا ذكاء اصطناعي في الصفحة»** (no AI on the page), a manager records the verdict, because **«فأتمتته تفسد القياس نفسه»** ("automating the verdict would corrupt the measurement itself") | **Literally the instrument P0-S1 and P0-S2 need** for the inter-architect variance and golden-set band measurement. Unexpectedly precise fit |
| `/executive`, `/reports/monthly` — every number returns to its source document | FR-OUT-001: every number footnoted to its provenance |
| The three platform doctrines: determinism first, **«وقد يشرح الذكاء الاصطناعي رقمًا، لكنه لا ينتجه أبدًا»** (AI may explain a number, never produce it), and "what was not measured is not scored as fine — the platform names the missing input rather than printing a zero" | Identical to the deck's *"AI READS. THE ENGINE COMPUTES. HUMANS APPROVE"* and *"No hidden defaults — if we filled a gap, it is amber."* **Same doctrine, already built** — this is the trust asset, and it is the client's own instinct reflected back at him |

### SUPERFICIAL / NOT reuse — say this before he asks

- **Geometry: zero.** `/clashes` states plainly **«المنّصة لا ُتجري كشف التضاربات — بل تقرأ التصدير الذي أنتجته أداة التنسيق لديك»** ("the platform does not run clash detection — it reads the export your coordination tool produced"). `/quantity-survey` derives quantities from an uploaded IFC and labels BIM-derived quantities **إرشادية** ("indicative — an invitation to verify against the measured BOQ"). **Sigma reads geometry; it never constructs it.** There is no polygon offset, no exact predicate, no intersection, no CRS handling anywhere in the platform.
- **The entire ENVELOPE core is new work:** per-edge inward offsets, exact orientation/intersection predicates, double-method area computation, the envelope solver, the setback↔floor-count fixpoint, the parking chain, the three capacity bands.
- **The invariant layer is partly new.** Sigma raises a governance note per difference with its magnitude — analogous — but there is no evidence of algebraic conservation identities that *block emission* and run against documentation examples in CI.
- **The evaluator registry semantics** (`polygon_offset_inward`, `table_lookup_min`, `ratio_per_unit_type`, …) are new.
- **The plot-entry / boundary-drawing UI** is new.
- **Caveat Khaled must resolve himself:** the guide does not disclose Sigma's implementation stack. If it is not Python/Postgres, the reuse is patterns and architecture, not code. He should say "patterns and, where the stack matches, code" — not "I already have this."

**Honest summary:** roughly 35–45% of Phase 0's non-geometry surface is ground Khaled has already covered in production. The geometric and capacity core — which is where 100% of the technical risk lives — is 0% reused. **Say it in exactly that shape.** It is more credible than a blanket claim and it is still a very strong position: no competing freelancer has shipped a cited, provenance-traced, approval-gated governance engine in Dubai construction.

---

## 8. Contract mechanics to settle early

- **IP split.** The PRD calls the executable rule base "the moat" — but that moat is the *client's* domain content, not Khaled's code. Separate them in writing: client owns the rules, citations, annex and all regulatory content; Khaled licenses or assigns the engine code; **Khaled retains his generic provenance/rules/audit patterns** (they predate this engagement and are in Sigma). Settle before rule one is authored.
- **Liability carve-out.** Khaled never warrants regulatory validity — the PRD itself makes "REGULATORY VALIDITY: NOT ASSESSED" a permanent, unchangeable line. Contract should mirror that language, and state that professional review, counsel sign-off, PI insurance and all marketing claims are the client's.
- **Dependency clause.** Client-side deliverables (annex signed, rules authored and approved, land packs supplied, architects contracted, Q1 declared, community named) are on the critical path. Each slip moves Khaled's dates day-for-day, in writing.
- **Nothing is signed yet.** Confidentiality is a handshake in both directions and Khaled has already sent the Sigma guide. A one-page mutual NDA before the next document exchange.
- **Do not price Phases 1–5.** Option them at a stated day-rate, gated on Phase 0's measurements.
- **Work from the PDFs, not the extracted text.** The `.txt` has lost `≤`, `≥`, `→`, `Σ`, `±`, `m²` and has column-scrambled §15.1, §22.1, §26 and §28.1. Quoting a tolerance or a threshold direction from the .txt into a contract is a real risk.

---

## 9. What the PRD's own defects mean for quoting

The PRD is almost certainly LLM-authored and LLM-red-teamed with no engineer ever in the loop — he half-admitted it: *«حاولت كمان نعمله على كلود»* ("I also tried to do it on Claude"), and the document describes itself as a red-team review superseding a V1 whose worked examples it withdraws as arithmetically invalid (wrong by ~2.8× on GFA, ~3× on unit count). **Quoting against it verbatim inherits its defects as acceptance criteria.** Known internal contradictions to flag, gently, as evidence of value added:

- "Nine Principle-9 fields, all NOT NULL" — but **only eight are ever enumerated**, in both §2.4 and FR-RUL-001 AC1. The ninth must be pinned before writing the constraints.
- "18 invariants" — but **Appendix A.7 tabulates 16** (INV-14, INV-15 missing) while A.8 claims all 18 pass.
- "Three rule classes" — but **four partitions** are required, and FR-RUL-003 AC1 fails the build on any unassigned rule. Whether `DEFERRED` is an enum value or an orthogonal flag is unspecified.
- **FR-CAP-002** (user realism discount) is marked **P1** while §24.1 lists it as a required MVP checkbox and §32.2 schedules it in week 6.
- **§34 says "four bands"**; §3.2, FR-CAP-001 and INV-16 all say three bands plus a governing designation.
- `AdjudicationRecord`, `InvariantReport`, `ValidationReport`, `ApplicableRuleSet`, `CapacityBands`, `ParkingResult`, `PROVENANCE_NODE/EDGE` are all **named as outputs with no field lists anywhere.**
- §14.3 requires "snap tolerance declared explicitly" but **never states the value**; "exact predicates" names no library; "every area computed twice by independent methods" **never names the second method** — and whether that means a second library, shoelace-vs-triangulation, or an independent reimplementation materially changes effort.
- **Principle 4** requires the invariant module to have a *different owner* from the capacity engine, enforced by an import linter. **A solo engagement cannot satisfy this.** Propose the substitute in writing: independent reimplementation using a different method, no shared imports, import-linted in CI, plus (optionally) a third-party review pass. Do not absorb this silently — it is a built-in acceptance-test failure otherwise.

Raising these on the call is the strongest possible demonstration that he hired the right person: it proves Khaled read 3,587 lines and found what an engineer finds.

---

## 10. Suggested shape of the call

1. **Verdict first**, in one sentence, then the layer table.
2. **Quote him to himself:** *«مفيش حاجة بتتعمل في الديزاين ده غير لما يكون لها reference… وده اللي بيفرق مهندس عنده خبرة عشرين سنة عن مهندس تاني جاي جديد»* — that sentence is the product. It is a better pitch than anything in his own deck, and it came from him.
3. **Show, don't claim:** Sigma's `/sources` rule — any inference without a `[SOURCE: id]` is an undocumented assumption — is his typed rule A, already running, in Arabic, in Dubai construction.
4. **Name the Phase 4 / Phase 0 gap** and get his live reaction.
5. **Name the half-that-is-not-software**, framed as his contribution.
6. **Ask, do not quote.** Then propose the 2-week Discovery + Spike.


## Risks
- EXPECTATION GAP (highest engagement risk): he verbally described a design generator - «هو اللي يعمل لي الديزاين نفسه» - and his diagram ends at BIM/CAD Output, but the PRD he sent funds a Phase 0 that explicitly excludes floor plans, optimization, LLM and DXF, and delivers only PDF + JSON. His own PRD logs this as R-18 'customers reject Phase 0 as just a calculator'. If he signs expecting drawings and receives a capacity report, the engagement fails at delivery regardless of build quality. Must be surfaced on call one.
- SOLO vs 4-FTE MISMATCH: PRD Phase 0 is 32-48 person-weeks across four full-time people plus 3 contracted architects. Khaled solo delivers ~12 person-weeks in the same 12-week calendar. Quoting Phase 0 as written at a solo rate on the PRD's schedule is a guaranteed 2x overrun.
- PRINCIPLE 4 IS STRUCTURALLY UNSATISFIABLE SOLO: the invariant and validation modules must have a DIFFERENT OWNER from the capacity engine, enforced by an import linter, and this is one of ten non-negotiable principles plus an MVP governance checkbox. A single developer cannot satisfy it. If not renegotiated in writing with a named substitute, it is a built-in acceptance-test failure.
- NO BUDGET, NO TIMELINE, NO DEADLINE EXIST ANYWHERE - not in the chat, not in the three voice notes, not in the PRD. The only money figure in the whole corpus is the problem-side AED 50,000-250,000 feasibility-study cost. Nothing is priceable until this is asked directly.
- CLIENT-SIDE DEPENDENCIES SIT ON THE CRITICAL PATH AND ARE OUTSIDE KHALED'S CONTROL: the metric-definitions annex gates ALL area code in week 1 (FR-DEF-001 AC5); ~30-40 rules must be authored and named-approved by a licensed architect; 10 land packs come from one unnamed 'friendly developer'; 3 architects must be contracted and paid. If any slips, Khaled's schedule slips and he wears the blame unless a dependency clause is contracted.
- ACCEPTANCE CRITERIA HE CANNOT CONTROL: P0-S2 (engine within the two-architect band on 8 of 10 plots) depends on rule quality and definitions the CLIENT authors, and on architects the CLIENT contracts. Same for P0-S6 (provenance tree opened in 2 of 3 sessions). Four of six Phase 0 kill criteria fire on measurements Khaled does not own. Payment must never be contingent on them.
- BLOCKING REGULATORY UNKNOWN: Q1 - does parking count toward FAR - is unresolved, swings capacity 15-35%, and FR-DEF-002 AC2 blocks capacity computation entirely until declared. Khaled cannot know whether he is building one FAR treatment or a dual-scenario comparison engine (AC4 requires the one-click both-treatments comparison regardless).
- THE TARGET COMMUNITY AND LAND-USE SLICE ARE NEVER NAMED in the entire PRD, yet rule authoring, the 10 land packs and the golden set all depend on it. Nothing can start until he names it.
- THE PRD IS LIKELY LLM-AUTHORED AND NEVER ENGINEERING-REVIEWED (he half-admitted trying it on Claude himself). It contains provable internal contradictions: 'nine Principle-9 fields' but only eight are ever listed; '18 invariants' but Appendix A.7 tabulates 16; 'three rule classes' but four required partitions; FR-CAP-002 marked P1 yet listed as an MVP checkbox; '§34 four bands' vs '§3.2 three bands'. Quoting against it verbatim inherits these as contractual acceptance criteria.
- FIVE OF THE 18 INVARIANTS ARE NOT EXERCISABLE IN PHASE 0 (INV-02, 04, 05, 06, 07 all require unit schedules, unit mix and NSA that Phase 0 does not generate). The MVP checkbox says '18 checks'. Agree the reduction to 13 live plus 5 dormant stubs in writing, or accept an unsatisfiable checkbox.
- IP OWNERSHIP OF THE RULE BASE IS UNADDRESSED. The PRD calls the executable rule base the moat, but that content is the client's domain expertise, not Khaled's code. Khaled must also protect his pre-existing Sigma provenance/rules/audit patterns from being swept into a work-for-hire assignment.
- PROFESSIONAL LIABILITY (PRD R-07, Low likelihood / CRITICAL impact): the product produces numbers a developer takes to an investment committee. UAE counsel review of the disclaimer and PI insurance are MVP gates the four-person team does not contain. Khaled must contractually never be the party warranting regulatory validity.
- GEOMETRY REUSE FROM SIGMA IS ZERO - verified in the guide: it reads IFC and clash exports and explicitly does not run clash detection or construct geometry. 100% of the technical risk (offsets, exact predicates, envelope solver, setback-floor fixpoint) is new work. Overclaiming Sigma reuse on the call would be caught the moment the client reads the guide he already has.
- SIGMA'S IMPLEMENTATION STACK IS NOT DISCLOSED IN THE GUIDE. If it is not Python/Postgres, the reuse is architectural patterns rather than code, and the effort saving is materially smaller than it sounds.
- NOTHING IS SIGNED: no NDA, no engagement letter, no IP terms - and Khaled has already sent the Sigma PMO user guide on a verbal 'please don't share'.
- PRODUCT-COMPANY vs INTERNAL-TOOL IS UNRESOLVED and moves the price more than any other question. The PRD assumes a CEO, investors, PI insurance, multi-tenant SaaS, design partners and paying customers; his verbal framing is entirely first-person practitioner. Multi-tenancy, auth, governance and legal surface are roughly 30% of the build.
- SOURCE-TEXT FIDELITY: the extracted .txt has lost every inequality sign, arrow, sigma and m2, and has column-scrambled the capacity, evaluation, kill-criteria and data-acquisition tables. Any tolerance or threshold direction quoted from it into a contract may be reversed. Work from the original PDFs.
- THE DECK PUBLICLY COMMITS TO '40 RULES' while kill criterion #2 may force a public reduction of the claimed rule count. Marketing and product are coupled, and no marketing-review owner or cadence exists beyond 'CEO/Counsel'.

## Questions for the client
- Are YOU the licensed regulatory architect on this? Will you author the rules, sign the metric-definitions annex, and put your name on every rule approval yourself - and how many hours per week can you actually commit for 12 weeks? (This is the single largest cost line in the PRD. If you fill it, this is a project. If I have to hire it, this is a company with a payroll.)
- Which community, and which land-use slice? Name it. The PRD never does, and rule authoring, the land packs and the golden set all depend on it - nothing can start without it.
- Do you have the design partner and the 10 land packs? Have you opened them and checked how many actually carry FAR, height and setbacks? (Your own kill criterion: fewer than 5 of 10 means the product's first job is data assembly, not computation - a different product entirely.)
- Does parking count toward FAR in that slice - yes, no, or unknown? If it is still unknown by week 2, are you content for the system to refuse to compute until the user declares a treatment, and for me to build the dual-scenario comparison? (It swings capacity 15-35% and it blocks all capacity computation.)
- Who contracts and pays the three architects - roughly 10 days for the variance measurement, plus 20 separate blind computations for the golden set (10 plots x 2 architects)? That is real cash and it appears nowhere in the documents.
- Is this a product company - investors, paying customers, multi-tenant SaaS, PI insurance - or an internal tool for your own practice? This moves the price more than any other question; it decides whether tenancy, auth, governance and the legal surface are in or out, and that is roughly 30% of the build.
- What is your budget range, and what payment structure - cash, milestones, equity, or a mix? Nothing in the deck, the PRD or our conversation names a figure.
- Is there a deadline or an external clock - an investor, a partner, a bid, a competition? You have never mentioned one, and the 8-12 week and 18-24 month figures are the document's, not yours.
- Who wrote the PRD and the deck, and have you read them end to end? Specifically: do you accept that Phase 0 as written produces a PDF and a JSON and draws nothing - no floor plans, no CAD, no BIM - for the first 8-12 weeks? (You described a design generator in your voice note; the document you sent funds a capacity engine. I need your reaction to that now, not at delivery.)
- What are the typical FAR values and plot sizes you are targeting? If FAR is 3-5 on a 2,000 m2 plot, that is a point block, not a tower, and it changes what the machinery should be built for.
- Is the Dubai Municipality relationship real and warm, or aspirational? Your PRD classes the data you want from them as 'requires relationship' and 'do not plan around' - if your access is genuine, that is an asset the document does not know about and it materially de-risks the later phases.
- Which American tools have you actually evaluated - TestFit, Delve, Spacemaker, Digital Blue Foam, or others? You said they have not reached what you are thinking of; I need to know what you compared against.
- Do you hold licensed copies of the Dubai Building Code and the UAE Fire and Life Safety Code, and do you have the right to build and sell a commercial product derived from them?
- Who owns the rule base? Your PRD calls it the moat - but that moat is your regulatory expertise, not my code. I propose you own all rules, citations and definitions outright, I license you the engine, and I keep the generic provenance and audit patterns I built before this project. Agreed in principle?
- Your PRD requires the invariant and validation modules to have a different owner from the capacity engine, enforced by an import linter in CI. One person cannot satisfy that. Do you accept an independent reimplementation with a different method, no shared imports, CI-enforced - or do you want to fund a second reviewer?
- Would you accept a 2-week paid discovery where I build a working spike - your own 80x40 plot, the setback-to-floor-count loop converging in three passes, the envelope with the binding constraint named per dimension, and click-through provenance on every number - and only then quote you a fixed price for the full engine?
