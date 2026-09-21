# ENVELOPE — working notes for Claude

Deterministic development-capacity engine for Dubai plots. Read [`README.md`](README.md) first,
then [`docs/03-analysis/open-questions.md`](docs/03-analysis/open-questions.md).

## Always use the installed skills

35 skills live in [`.claude/skills/`](.claude/skills/), curated from four community repos.
**Invoke the ones matching the slice of work before starting it** — not only when a task
obviously triggers one. Shared reference material the UX skills read from is in
[`.claude/ux-kit/`](.claude/ux-kit/) (their internal paths were repointed there on install).

| Slice of work | Invoke |
|---|---|
| Engine / kernel code | `typescript-pro`, `strict-api`, `zero-hallucination-coder` |
| API routes & contracts | `api-designer`, `fastapi-expert` (patterns transfer to Fastify) |
| Any UI work | `ui-ux-pro-max`, `design-system`, `design-tokens`, `design-component`, `react-expert` |
| Interface copy — labels, errors, empty states | `ux-writing` ← **high value here**, see below |
| Charts and the capacity/sensitivity visuals | built-in `dataviz`, then `ui-ux-pro-max` (charts domain) |
| Before calling any UI done | `a11y-audit`, `design-review`, `design-qa` |
| Tests | `test-master`, `playwright-expert` |
| Completion pass | `code-reviewer`, `secure-code-guardian`, built-in `code-review` |
| Data layer | `database-optimizer`, `sql-pro`, `postgres-pro` |

`ux-writing` matters more than usual on this product: the entire trust proposition lives in
labels. "Not assessed" vs "compliant", "governing band", "assumed — you may edit this",
"regulatory validity: never claimed". Getting that copy wrong undoes the engineering.

> Skills installed mid-session are not registered with the `Skill` tool until Claude Code
> restarts. Until then, read the relevant `SKILL.md` directly and apply it — same effect.

## Architecture, and why

TypeScript monorepo (pnpm). **This deviates from PRD §19.4, which specifies Python / FastAPI /
Shapely — the client must be told.** The reasons, verified by spike before the decision:

1. **Clipper works in integer arithmetic.** PRD §14.3 demands "exact predicates… never raw
   floating-point comparison". Shapely/GEOS does not provide exact predicates at all. Clipper
   gives them by construction on the 1 mm grid.
2. **Principle 4 becomes structural.** `@envelope/invariants` does not list `@envelope/capacity`
   in its dependencies, so importing it is *impossible*, not merely linted. Stronger than the
   PRD asks for.
3. One type system end-to-end, so the provenance render hints cannot drift between engine and UI.

```
packages/
  core/        types · provenance · numeric policy · metric definitions annex
  intake/      affection-plan reading — positioned PDF text → cited facts. `core` ONLY
  geometry/    Clipper kernel — per-edge offset, intersection, area ×3, analysis,
               largest inscribed rectangle
  rules/       typed rule records · 12 evaluators · bitemporal store · resolution ·
               developer standards and project briefs (a *separate* type, see below)
  capacity/    envelope · setback↔floor fixpoint · parking · layout · access ·
               level plan · massing · bands A/B/C
  invariants/  18 checks. Depends on `core` ONLY. ✗ never capacity, geometry, rules
  validation/  independent validation + five-way claim statement. ✗ never capacity/geometry
  report/      HTML → PDF · JSON export
  exports/     DXF R12 · XLSX. Depends on `core` ONLY — never the engine
apps/
  api/         Fastify + Zod · SQLite or MySQL behind one repository seam
  web/         React + TypeScript + Vite · Three.js massing view
```

### The nine-step flow, as built

`0 Sheet → 1 Plot → 2 Parameters → 3 Rules → 4 Assumptions → 5 Capacity →
6 Parking → 7 Checks → 8 Evidence → 9 Export`

Step 0 reads an affection plan and is *not* gated — a plot whose sheet is not to
hand is still a plot. Step 3 also carries the developer-standard picker and the
saleable-efficiency question. Step 5 carries the 3D massing; step 6 carries the
parking level drawn as rectangles and the vehicle-access recommendation. Step 9
emits HTML, JSON, **DXF and XLSX**, all four behind the same G3/G4 gates.

`pnpm boundaries` asserts those `✗` lines across manifests, project references *and*
source imports. It is not decoration: adding `"@envelope/capacity": "workspace:*"` to
one manifest is a one-line diff that looks like plumbing and silently downgrades the
strongest guarantee in the architecture.

### Where the boundary is paid for

`invariants`, `validation` and `report` cannot see the engine, so **the translation
is written by hand at the composition root** — [`apps/api/src/checks.ts`](apps/api/src/checks.ts)
and [`apps/api/src/report.ts`](apps/api/src/report.ts). Two rules govern those files:

1. **Nothing there computes a number a user will see.** When a check needed an operand
   the engine was discarding (achieved FAR, provided bays, the visitor fraction the
   answer reaches), the fix was to *emit it from the engine with a derivation*, never to
   calculate it in the adapter.
2. **Nothing is supplied that the engine did not produce.** A check with no data returns
   `DORMANT`. Synthesising a level schedule to make INV-01 pass would be verifying the
   engine against its own output — see `LEVEL_SCHEDULE_NOTE` for the argument in full.

### Verification, and what each layer actually catches

| Gate | Catches |
|---|---|
| `pnpm boundaries` | Someone re-adding a forbidden dependency. |
| `pnpm contrast` | A colour pair below WCAG 2.2. An **unresolvable** pair counts as a failure, not a skip — a checker reporting "0 failures" over pairs it never measured is the vacuous pass this codebase refuses everywhere else. |
| `pnpm test` | The engine, the API contract, and the screens rendered against **real engine output** rather than a fixture. |
| `pnpm typecheck` | Both the sources *and* `tsconfig.tests.json`. Test files sit outside every package's `rootDir`, so for a long time nothing typechecked them — and the web render fixture had been structurally not a `Plot` for as long as it existed. It surfaced only when the access placement read `edge.start.x` and got `undefined`. A fixture that has drifted from the type it claims to be goes on proving the screens work against a shape the API never sends. |
| `pnpm example` | The landing page quoting a figure the engine no longer returns. It printed a governing capacity of 6,352.5 m² for months after the engine started returning 6,774.194 for the same input — on the page that sells traced numbers. `scripts/verify-worked-example.mjs` re-runs the real API for the recorded input and diffs it against `apps/web/src/screens/worked-example.json`, which is the only place the page reads a number from. |
| `pnpm smoke` | What only exists once a browser lays the page out. Every accessibility defect found so far was found here: a page that scrolled sideways on a phone, a target nobody could hit, a visually-hidden span that widened the document. |
| `pnpm amber` | §13.1 in pixels, which `pnpm contrast` structurally cannot see. Contrast governs *who may paint amber* and *that it out-contrasts every chrome ink*; only a browser knows **how much of the first screen it fills and what is competing with it**. The landing fold once measured 0px² of amber against 37,738px² of accent with every stylesheet gate green — the callout was real, correct and whitelisted, and sat inside a closed disclosure. Moving it out was not enough either: it landed 51px below the fold, then 165px below at 900. Each state passed everything else. It also names, without failing, every route holding `ASSUMED` values the first screen does not show. Needs a running server, so it sits beside `smoke` rather than in `check`. |

Screens are also reviewed by looking at them — `pnpm shots` writes one PNG per screen.

## What the 30 Aug 2026 meeting changed

Read [`docs/03-analysis/meeting-02-2026-08-30.md`](docs/03-analysis/meeting-02-2026-08-30.md)
before touching the parking code. One sentence from it governs priority:

> *"لو عارف يفهم إزاي يحط الباركينج صح، وتوزيعته صح، والرامب بتاعي ماشي صح — أنا كده حلّصت
> 3-4 شهور."* — 09:13

**Parking layout is the product**, not massing. He reads an envelope off an affection plan in
four minutes; what costs him three to four months is laying out the parking.
[`packages/capacity/src/layout.ts`](packages/capacity/src/layout.ts) therefore places bays,
aisles and a ramp as rectangles rather than dividing an area by a factor — a bay count that
cannot be laid out is not a bay count. Its dimensions are Dubai Building Code Table B.11, and
they are corroborated by the client's own AutoCAD drawings ("6.00M WIDE 2 WAY DRIVEWAY").

Vehicle access is the other half of that sentence — *"الباركينج **والمداخل**"* — and is built
too, in [`packages/capacity/src/access.ts`](packages/capacity/src/access.ts). B.7.2.1 turned out
to be far more mechanizable than the first reading suggested: it measures its 15 m junction
clearance "from the chamfered edge of the plot", which is a vertex the engine already holds, and
its "should be from the secondary road" is exactly what `RoadHierarchy` ranks. Only "opposite a
T junction" needs a road network, and that single residue is reported NOT ASSESSED rather than
being allowed to block the rest.

**The one thing he asked for that Phase 0 must not quote:** an optimiser that searches ramp and
core positions for maximum unit yield (34:37, and the largest ask in the meeting). That is a
`TRADEOFF` value, and `PHASE_0_CLASSES` refuses to emit one by construction. It is wanted, it is
out of scope, and the refusal is the design rather than a limitation to apologise for.

Four inputs, enumerated by the client unprompted: **affection plan, RFP, Dubai Building Code,
developer standards.** All four are now in `docs/00-source` — see
[`docs/00-source/INVENTORY.md`](docs/00-source/INVENTORY.md).

### What the developer standards turned out to contain

Reading `250617_UNIT AREAS, AMENITIES,.pdf` and the two `Annexure A` briefs did more
than add data — it found a defect. One sentence in the brief carries it:

> *"GFA achievement is critical. Expectations are between 93%-97% (SA / GFA)."*

The engine had been dividing GFA by saleable-area-per-unit, which assumes 100%. See the
`saleable_efficiency` rule below. The same documents also give the client's own
benchmark for the parking work — *"Car park minimum efficiency should achieve: 37.5 m2
per car with no shortage"* — and a 5% overage above the code minimum.

**A caution when transcribing these.** The tables are laid out right-to-left in the
content stream, so a naive text extraction reads the podium column as the tower one and
silently swaps a 340 ft² studio cap for a 500 ft² one. Every figure in
`packages/rules/src/standards/azizi.ts` was resolved by x-coordinate against the header
positions, and carries the page and bounding box it came from so the transcription can be
checked rather than trusted.

## Rules that are not negotiable

These come from the PRD's ten principles and the analysis in `docs/03-analysis/`. Breaking one
is a defect even when it makes something easier.

- **Never claim compliance.** The validator agreeing with the generator is self-consistency and
  nothing more. `REGULATORY VALIDITY: NOT ASSESSED` is permanent and appears in every output.
- **Every emitted value is `Traced`.** There is no constructor for an untraced value. Do not add
  one. Provenance is a tax on every signature, not a module — retrofitting means a rewrite.
- **No hidden defaults.** A filled gap is an `ASSUMED` entry with a basis and a sensitivity, amber
  on screen, listed in the report. Never a silently chosen number.
- **`assumed()` needs a basis string.** If you cannot write why, you do not have an assumption,
  you have a guess.
- **No area term may be computed unless `metric(id)` resolves.** `FR-DEF-001 AC5`, and `INV-15`
  re-checks it independently.
- **Parking-in-FAR has no default.** `FR-DEF-002` — `DERIVED` from a citation or `USER_SET` by a
  named user, or computation is blocked. It swings capacity 15–35%.
- **An affection plan that omits a limit does not get one.** `DJAZ1MED12RES011` prints `G+11`
  and no FAR, no GFA, no setback and no coverage. Borrowing 3.50 from the neighbouring plot is
  the precise failure this product exists to prevent — `packages/intake` reports the gap and
  `blockingGaps()` stops the run. And a setback printed as "0m to solid wall and 4.0m to window
  wall" stays `CONDITIONAL`: collapsing it to one number picks the applicant's façade for them.
- **`saleable_efficiency` has no default, and never had a right to one.** The engine
  computed units as `GFA ÷ saleable-area-per-unit`, which holds only if every square
  metre of GFA sells. Cores, corridors, structure, plant and amenity are all inside
  GFA and none of them does, so the count came out 3–7% high on every run. It survived
  because it was implicit — there was no `1.00` anywhere to argue with, which is the
  exact shape of failure "no hidden defaults" exists to catch. `capacity.gfa_per_unit_m2`
  and `capacity.weighted_nsa_m2` are now separate nodes: what a unit *costs* in GFA and
  what it *sells*. Azizi's own brief states the market number, 93–97%.
- **A developer standard is not a rule, and the type system says so.** `DeveloperStandard`
  and `ProjectBrief` live in `packages/rules/src/standards/` and are deliberately *not*
  `RuleRecord`s: a `RuleRecord` is resolvable by `resolveParameter` and can bind the
  envelope, and Azizi's 340 ft² studio cap is a commercial preference. A plot whose
  envelope was cut by one would be reporting a client's brief as a legal limit. They are
  served from `/api/standards`, never merged into `/api/rules`, and the screen carries
  "this is not a regulation" in amber above the picker.
- **A project brief may unblock a plot the affection plan could not.** `DJAZ1MED12RES011`
  prints `G+11` and no FAR; its Azizi brief prints `FAR 5` and `11,829.35 m²`, and
  5 × 2,365.87 reconciles exactly. That is a *second instrument*, issued by a developer's
  consultant rather than by Trakhees, and every value taken from it is marked as such.
  Note also that on plot 5180196 the printed FAR does **not** reproduce the printed GFA:
  5.05 × 1,740.56 = 8,789.83 against 8,796.46, because 5.0538 was rounded to two decimals.
  The GFA is what the developer priced; re-multiplying the rounded FAR under-reports.
- **A maximum used as an area is an assumption, and it errs low.** The standards state
  caps ("no unit to cross this area Strictly") and no typical areas. `resolveMix` uses the
  cap, which makes units larger and therefore fewer — conservative — and says so in the
  basis string on every mix it returns. It also refuses to normalise a mix whose shares do
  not total 1, and refuses a type the standard states no cap for.
- **The parking level is packed into the largest rectangle *inside* the podium, never its
  bounding box.** `largestInscribedRectangle` errs by containment, so the bay count is a
  floor. On a non-rectangular podium the shortfall is reported in m², not hidden in a ratio.
- **The massing is built in the engine, not the renderer.** A 3D view is the most persuasive
  surface in the product; a massing assembled by `MassingViewer` would be a building nobody
  computed, drawn convincingly. Each volume's colour is the provenance class of its own
  height. The podium/tower split is not derivable from a run — the affection plan states it
  — so an unentered podium level count is `ASSUMED`, amber, and said in words as well.
- **Degenerate geometry raises.** Slivers, self-intersections and near-tangent offsets throw
  rather than return a plausible wrong answer (PRD §14.3).
- **Invariant failure blocks emission.** Never a warning, never a configurable severity.
- **No `realistic` / `expected` / `likely` capacity band.** §15.3 — absence is enforced by schema.
  The honest substitute is `user_realism_discount`, default 1.00, `USER_SET`.
- **The landing page and the status page are under the same discipline as a report.**
  A marketing page is where "never claim compliance" dies quietly. So the five-way claim
  statement is *on* the landing page in §16.5's own order, "what it does not do" is a
  section longer than the feature list, and no number appears that the engine has not
  produced — there is no accuracy figure, because §22.2's variance study has not been run.
  `apps/web/test/landing.test.tsx` enforces this as **prohibitions**, not as copy checks:
  a test that only asserted the honest text was present would pass on a page that had
  added "99.4% accurate" underneath it.
- **The status page leads with what is not ready, and has no composite score.**
  Approved rules and signed definitions both read zero. A single health number is
  something a reader stops at, so there is not one. And count readiness over `SEED_RULES`,
  never over `loadSeedRulesForDevelopment` — the dev loader stamps every rule
  `APPROVED / DEVELOPMENT-ONLY-NOT-A-REAL-APPROVER` so a demo can run, and counting that
  reported 13 of 13 rules approved on a deployment whose real number is zero.
- **No figure on the landing page is typed by a human.** Every one comes from
  `worked-example.json`, which `scripts/verify-worked-example.mjs` writes from a real
  run and `pnpm check` re-verifies. The formulas shown when a figure is expanded are
  the engine's own `formula` strings off the provenance graph, not re-typed
  explanations — a re-typed formula drifts exactly as easily as a re-typed value and
  less visibly. If a number on that page needs changing, change the input or the
  engine and re-run with `--write`.
- **Decoration on the landing page may not hide content.** The scroll reveal animates
  `transform` only. The first version faded from `opacity: 0` and a scroll-driven
  animation holds its start state for anything that has never entered a viewport —
  so three whole sections were blank in a full-page screenshot and would have been
  blank on paper. A page that prints empty below the fold is the same defect as a
  report that omits a check.
- **Amber is the landing page's too.** The brand mark used `--uncertain` and the
  favicon still does not, now: amber "is reserved exclusively for uncertainty, and
  nothing else in the system is permitted to use it", and a logo is the most-repeated
  element on a site. Teaching a reader that amber means nothing in particular is the
  one thing §13.1 exists to prevent.
- **Amber `ASSUMED` styling must not be softened for aesthetics.** §13.1 calls it "the most
  important UI decision in the product". A design review that tones it down has failed.
- **Never state a contrast ratio you did not measure.** The palette is checked by
  `scripts/contrast.mjs` against the tokens as written, in both themes. And the rule cuts
  both ways: a hatch raised to 3:1 for 1.4.11 that then runs *under* prose has traded
  1.4.3 for 1.4.11, which is a swap, not a fix. Move the texture; do not weaken it.
- **A DERIVED value must reach a cited rule in the graph, not in a comment.** Declaring
  `provenanceClass: 'DERIVED'` while passing `uses: {}` produces a number that claims a
  citation it cannot reach. `packages/capacity/test/pipeline.test.ts` walks the graph for
  every published value; that test exists because exactly this happened.

## Conventions

- `const` objects with `as const`, never `enum`.
- Branded types for units (`Mm`, `Mm2`). A metre passed as a millimetre must not compile.
- IBM Plex Sans and IBM Plex Mono, loaded in `apps/web/index.html` over the system
  stack. The two share metrics and a skeleton, which is what lets a mono figure sit
  inside a sans sentence without looking pasted in — and a traced value *is* a figure
  quoted inside a sentence. `display=swap` with the full system fallback behind it:
  the site is opened on a plot with no wifi.
- Integer millimetres inside the kernel; `Decimal` for every non-geometric number. Never `number`
  for a quantity a user will see.
- Public APIs carry explicit return types. `tsc --noEmit` clean before moving on.
- Comment the *why*, especially where the PRD is wrong or silent — those comments are the record
  of a decision someone will otherwise re-litigate.

## Known defects in the source PRD

Do not "fix" these silently in code; they are open questions with the client. Full list in
`docs/03-analysis/open-questions.md`.

- The envelope solver is specified as a one-directional pipeline (`FR-PLT-002`) but the setback
  rule it implements is a **fixpoint** — setback depends on floor count depends on footprint
  depends on setback. As specified, Phase 0 cannot compute the deck's own slide 05.
- Deck slide 05's numbers do not reconcile: at 80×40 m and FAR 5.0, a 7.5 m setback gives
  1,625 m² and 9.85 floors, not the 7.6 printed. Verified exactly by our own kernel.
- "Nine Principle-9 fields" but only eight are ever enumerated.
- "18 invariants" but Appendix A.7 tabulates 16, and five (INV-02/04/05/06/07) need a unit
  schedule Phase 0 does not generate.
- No identity system anywhere (`tenant_id` appears once in 3,587 lines) while four gates require
  a named reviewer or approver. The built API used to have **no authorization at all**. It now
  has ownership *plus an explicit grant* ([`apps/api/src/access.ts`](apps/api/src/access.ts)):
  a run is reachable by its author and by accounts it was shared with, as `reviewer` (may
  sign `G4`) or `reader`; anyone else gets **404, not 403**, so a run's existence does not
  leak. Ownership alone was rejected because `G4` is signed by someone who is not the author —
  the share is what lets that person in. **Still open, and still to be disclosed in writing:**
  there is no tenancy (firm or project), the licence on `G4` is recorded and never verified,
  nothing stops an author signing their own `G4`, and a guest's identity is a random key held
  in one browser — whoever holds the key holds the runs, and clearing the browser loses them.
