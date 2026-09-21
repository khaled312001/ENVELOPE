# Open questions — answer before scoping or pricing

Ordered by how much the answer moves the work. Every one of these is outside our control and
inside the critical path.

---

## Blocking — nothing meaningful ships until these are answered

### Q1 · Which community, and which land-use slice?
**Never named anywhere in 78 pages.** Rule authoring, the 10 land packs and the golden set all
depend on it. The deck's own framing is "a different DCR for every plot" — so until a community is
named, there is no rule set to encode.
**Also needed:** is the per-community Development Control Regulation published in a citable form?
If not, `citation.document_uri` cannot be populated, which fails `FR-RUL-001 AC1`, which means the
evaluator refuses to load anything.

### Q2 · Does parking count toward FAR in that slice?
Swings capacity **15–35%**. `FR-DEF-002` forbids a default and forbids `ASSUMED` — only `DERIVED`
or `USER_SET` — and blocks capacity computation entirely until declared. PRD's own Q1, due week 2.
If it stays unresolved, we build the dual-scenario one-click comparison regardless (`AC4`).

### Q3 · Is the client himself the licensed regulatory architect?
PRD §32.1 makes this a 1.0 FTE role with veto over rule publication and calls it "the single most
important hire"; R-13 calls it the schedule's binding constraint. ~40 rules each need instrument,
clause, page, bbox, verbatim text, three tests including a boundary case, and a named approver.
**If he fills this seat, the most expensive line in the plan is free and the cost model changes
completely. If not, this stops being a project and becomes a company with a payroll.**
Follow-up: how many hours a week, for how many weeks?

### Q4 · Do the 10 land packs exist, and has anyone opened them?
§23.1: "Total external data dependency: ten land packs from one friendly developer." One
relationship gates the whole phase. **His own kill criterion:** if fewer than 5 of 10 carry FAR +
height + setbacks, "the product's first job is data assembly, not computation — a different product
and needs a different plan." And §30.1 item 5 already states the affection plan "is not guaranteed
to carry FAR, height limits, or full setback schedules" — so this is not merely untested, it is
known-doubtful.

### Q5 · Product company, or internal tool for his own practice?
**Moves the price more than any other question.** The PRD assumes a CEO, investors, design partners,
paying customers, multi-tenant SaaS and PI insurance; his voice notes are entirely first-person
practitioner. Tenancy, auth, governance and the legal surface are roughly **30% of the build**.

---

## Commercial — cannot quote without these

### Q6 · Budget range and payment structure?
Cash, milestones, equity, or a mix. **No figure exists anywhere in the corpus** — the only money in
the entire package is the problem-side AED 50k–250k that a feasibility study costs today.

### Q7 · Is there an external clock?
An investor, a partner, a bid, a competition. He has never mentioned a deadline; the 8–12 week and
18–24 month figures are the document's, not his.

### Q8 · Who contracts and pays the three architects?
~10 days for the inter-architect variance measurement, plus 20 separate blind computations for the
golden set (10 plots × 2 architects). Real cash, appears nowhere in the documents, and without it
P0-S1, S2, S7 and S8 all go unmeasured — which §32.4 calls outright failure.

---

## Expectation — surface on call one, not at delivery

### Q9 · Does he accept that Phase 0 draws nothing?
He described a design generator: *«هو اللي يعمل لي الديزاين نفسه»*. The document he sent lists
`Out: LLM anything · optimization · multiple configurations · floor plans · precedent · similarity
· jurisdiction overlays · DXF · realistic capacity band`. For 8–12 weeks he receives a PDF and a
JSON. **His own PRD logs this as R-18 (Medium/High) and dedicates §34 to rebutting it.**
Get his live reaction while it costs nothing.

### Q10 · Who wrote the PRD, and has he read it end to end?
It is almost certainly LLM-authored and LLM-red-teamed with no engineer in the loop — he
half-admitted it: *«حاولت كمان نعمله على كلود»*. It supersedes a V1 whose worked examples it
withdraws as wrong by ~2.8× on GFA and ~3× on unit count. **Quoting against it verbatim inherits
its defects as contractual acceptance criteria.**

### Q11 · Which competing tools has he actually evaluated?
He said American tools "haven't reached what I'm thinking of" but named none. TestFit, Delve,
Spacemaker, Digital Blue Foam? We need to know what the comparison set is.

---

## Legal and IP — settle before rule one is authored

### Q12 · Who owns the rule base?
The PRD calls the executable rule base "the moat" — but that moat is **his regulatory expertise,
not our code**. Proposed split: he owns all rules, citations, definitions and regulatory content
outright; we license or assign the engine code; we retain the generic provenance / rules / audit
patterns that predate this engagement and already exist in Sigma.

### Q13 · Does he hold licensed copies of the DBC and the UAE Fire & Life Safety Code — with derivative rights?
The deck cites page counts "as supplied" (843 pp + 707 pp), implying he has them. Commercial
derivative use is a diligence exposure if not cleared.

### Q14 · Is the Dubai Municipality relationship real or aspirational?
His own §28.3 classes the data he wants as Tier 2 "requires relationship" and Tier 3 "do not plan
around". If his access is genuine, that is an asset the document does not know about and it
materially de-risks Phase 2.

### Q15 · NDA?
Nothing is signed in either direction, and the Sigma PMO user guide has already been sent on a
verbal "please don't share". A one-page mutual NDA before the next document exchange.

---

## Technical — must be pinned before writing constraints

### Q16 · Principle 4 — invariant module, different owner?
"Separate module, separate owner, no shared imports, import-linted" plus `FR-INV-001 AC4` ("owned by
an engineer who does not own the capacity engine"). **A solo build cannot satisfy this.** Options,
best first: (a) the client owns the invariant *catalogue* and its expected values, we implement;
(b) contract a second engineer for 2–3 weeks to own `invariants/` and `validation/`; (c) write the
invariant module first, in a separate package, import-linter live from day one, and **disclose in
writing** that owner-independence is not met. Do not absorb this silently.

### Q17 · What is the ninth Principle-9 field?
§2.4 and `FR-RUL-001 AC1` both enumerate **eight**: source, citation, effective date, jurisdiction,
applicability, version, approval status, provenance. §11.2 and §24.1 both say nine. Plausibly
`rule_class`, `is_life_safety` or `mechanization`. Cannot write the NOT NULL constraints or the CI
assertion until pinned. Trivial to resolve, blocking until it is.

### Q18 · `DEFERRED` — enum value or orthogonal flag?
§11.3 is headed "three rule classes" and tabulates four partitions; `FR-RUL-003 AC1` fails the build
on any unassigned rule. Is a deferred setback rule `rule_class = DEFERRED`, or
`rule_class = GENERATIVE, mechanization = NON_MECHANIZABLE`? The `mechanization` enum is never
listed — only `"MECHANIZED"` appears in 3,587 lines — yet §24.3 requires the mechanization *rate*
be measured, which needs at least two values.

### Q19 · 18 invariants or 13?
`INV-02, 04, 05, 06, 07` all reference unit NSA, unit counts and mix shares — which Phase 0 does not
generate. Either Phase 0 needs a user-declared unit mix (contradicting §3.2, and Appendix A implies
it does) or those five are dormant and the §24.1 checkbox "18 checks" cannot be ticked.
**Note:** Appendix A.7 tabulates only 16 (INV-14, INV-15 missing) while A.8 claims all 18 pass.

### Q20 · Where does the unit mix come from?
`FR-PRK-001` requires per-type ratios → resident bays. Band C, all parking demand, NSA, both
efficiency figures and five invariants depend on unit mix and unit areas. **There is no functional
requirement, no entity and no input field for any of it anywhere in the PRD.** This is a missing FR
at the centre of the pipeline.

### Q21 · "Exact predicates" — which reading?
§14.3 demands exact predicates for orientation and intersection alongside a Shapely/GEOS stack —
and GEOS does not provide them. Literal reading = CGAL bindings or rational arithmetic, a multi-week
rabbit hole. Sane reading for rectilinear/convex plots at metre scale = snap to 1 mm, carry
`Decimal`/`Fraction` through orientation and area, declare the snap tolerance as a versioned
constant. **The PRD requires the tolerance be "declared explicitly" and then never states a value.**
Agree the interpretation in writing before quoting.

### Q22 · "Every area computed twice by independent methods" — which second method?
Shoelace vs GEOS is fifteen minutes. Triangulation-and-sum is a day. An independent
reimplementation is a week. The 0.1% gate is meaningless without saying which.

### Q23 · Plot entry — dimensions or coordinates?
§14.4 mandates UTM 40N for all computation; `FR-PLT-001 AC2` **blocks** when computed vs stated area
deviates by >2%. But an architect holds an affection plan with dimensions and bearings, not
coordinates — his own words: *«عشرين متر في تلاتين متر، الأضلاع بتاعتها»*. Hand-tracing on a
satellite tile routinely lands 2–5% off, so **the primary input method routinely trips the primary
input validation.** Appendix A.1 quietly sidesteps this by entering `80.0 × 40.0 m` as `USER_SET`.
The real requirement is a dimension-and-bearing entry path with optional georeferencing — and it is
not written. Basemap drawing should be a priced add-on, not core.

### Q24 · Is `M-RUN` byte-identical reproducibility scoped to the JSON only?
Achievable for the structured payload with pinned GEOS/Shapely, fixed decimal serialization, sorted
keys and a stored seed. **Not achievable for the PDF** — WeasyPrint embeds creation timestamps and
object IDs. Scope it explicitly, or fail a release blocker on a metadata field.

### Q25 · What is the tenancy and permission model?
Not a variant of Q16. The built API has **no authorization**: any identified actor can read,
acknowledge gates on, and export any run. `StoredRun.tenantId` is written and nothing reads it.

Scoping runs to their author was considered and rejected on product grounds — `G4` requires a
*named reviewer*, who is by design someone other than whoever computed the run (§21.1). An
ownership check would break the one flow the gate exists for. So the honest answer is that the
model does not exist, not that it was skipped.

Until it is scoped, the deployment is **single-tenant, behind a network boundary, with identity
taken from a request header and verified by nothing**. That sentence has to reach the client in
writing. Answering this question decides: who is a tenant (a firm? a project?), who may read
another person's run, whether a reviewer is a role or an assertion, and whether the licence number
on `G4` is ever verified against a registry — it is currently recorded, never checked, and the
product says so on screen.

### Q26 · Does the client accept eight dormant invariants in Phase 0?
Q19 asks whether the number is 18 or 13. The built engine gives the empirical answer for the deck's
own plot: **ten run, eight are dormant.** INV-01, INV-02, INV-11 and INV-18 read a per-level
schedule on top of the five in Q19 that read a unit schedule.

A schedule could be synthesised from the level count and the tower plate — and it is not, on
purpose. On the deck's plot the governing capacity is 6,352.5 m² while `levels × plate` is 5,120 m²
(the gap is reported as `integerGranularityLossM2`), so a synthesised schedule forces a choice
between INV-01 *failing* on a discrepancy that is correct and disclosed, or *passing* against a
total derived from the numbers it is meant to be checking. The second is the vacuous truth §12.2's
`DORMANT` status exists to keep out of the pass column.

This must be agreed before `P0-S3` is written down, because "the invariant layer passes" and "the
invariant layer ran" are different claims and only one of them is true.

---

## What we must never accept as a contractual acceptance criterion

**`P0-S2` — engine within the two-architect band on 8 of 10 plots.**

Two reasons, and neither has been made anywhere in the client's material:

1. **It gets easier the worse the profession performs.** Two blind architects define the band. Wide
   disagreement → wide band → trivially passed. Tight agreement → narrow band → very hard. Its
   difficulty is set by a measurement taken *after* the contract is signed.
2. **Ten plots in one community is low rule-diversity.** They share a DCR, so FAR, height and
   coverage are largely identical across all ten. The engine can pass 8/10 by getting one document
   right — evidencing nothing about generalization — and can fail 8/10 on a single mis-transcribed
   table.

The result depends on rule quality the **client** authors, definitions the **client** signs, and
architects the **client** contracts. It is a joint research finding to be reported, never a warranty.

**Accept instead — properties we control:** `M-INV` 100% · `M-PRV` 100% · `M-APP` 0 · `M-DEF` 100% ·
all rule tests green · independent area recomputation ≤0.1% · runtime budgets met · JSON round-trip
identity · invariant CI running on every documented example.

Same applies to `P0-S6` (users open the provenance tree in 2 of 3 sessions) and every measurement
criterion. **Four of the six Phase 0 kill criteria fire on measurements we do not own.**
