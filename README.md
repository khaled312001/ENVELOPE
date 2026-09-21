# ENVELOPE

AI development-capacity engine for Dubai plots. Takes a plot, the regulations, the developer's
standards and the brief, and produces the buildable envelope and capacity — with every number
traced back to a cited rule, a declared assumption, or a named person.

> **Status: pre-engagement.** Nothing is signed. No budget, timeline, target community or
> parking-in-FAR answer exists yet. See [`docs/03-analysis/open-questions.md`](docs/03-analysis/open-questions.md)
> — those answers change the scope materially and should land before any code that is meant to ship.

**Client:** Ahmed Amin — practising architect, Dubai (+971 54 717 8555). First contact 29 Aug 2026.

---

## The product in one paragraph

A compliance checker asks *"is this setback at least 5.25 m?"* and needs a drawing to exist.
ENVELOPE turns the same rule into *"offset every boundary inward by 5.25 m"* and needs only a plot.
The rule **generates** the answer instead of testing it. Around that sits a trust layer — provenance
on every emitted value, an invariant layer that blocks impossible output, human-approved rules, and
an assumption register — because a capacity number that cannot be defended to an investment
committee is worth nothing.

---

## Repository layout

```
docs/
├── 00-source/                  # originals — the contractual source of truth
│   ├── client/
│   │   ├── ENVELOPE_PRD_v2.pdf         78 pp · 34 sections · the spec
│   │   ├── ENVELOPE_Deck.pdf           12 slides · the pitch
│   │   └── pipeline-diagram.jpg        client's own architecture sketch
│   └── reference/
│       └── Sigma-PMO-User-Guide-AR.pdf Khaled's prior platform — shared with client, confidential
├── 01-extracted/               # machine-readable text of the above (for grep/diff, NOT for quoting)
├── 02-communications/          # WhatsApp chat + transcribed voice notes
└── 03-analysis/                # what the material actually means
    ├── engagement-and-scope.md         contractable scope, client obligations, Sigma reuse, contract terms
    ├── buildability-and-effort.md      adversarial feasibility read + person-week estimate
    ├── open-questions.md               ← blocking questions for the client
    └── requirements/                   extracted reference, by dimension
        ├── phase-0-scope.md            Phase 0 IN/OUT, all FRs, acceptance criteria, 12-week plan
        ├── core-engine-models.md       rule / invariant / provenance / geometry / capacity models
        ├── phase-model.md              Phases 1–5, AI architecture, stack by phase, eval framework
        ├── risk-and-commercial.md      risk register, kill criteria, assumptions, roadmap
        └── client-voice.md             what the client actually said, in his own framing
```

> ⚠️ **Quote thresholds from the PDFs, never from `01-extracted/`.** Text extraction dropped every
> `≤ ≥ → Σ ± m²` and column-scrambled §15.1, §22.1, §26 and §28.1. A tolerance direction read from
> the `.txt` may be reversed.

---

## Before writing shipping code — read these three, in order

1. [`docs/03-analysis/open-questions.md`](docs/03-analysis/open-questions.md) — what is unanswered and why it blocks
2. [`docs/03-analysis/engagement-and-scope.md`](docs/03-analysis/engagement-and-scope.md) — what is in scope, and what is the client's job not ours
3. [`docs/03-analysis/buildability-and-effort.md`](docs/03-analysis/buildability-and-effort.md) — where the real engineering risk sits

---

## Three findings that change the build

All three are now built and tested — the entries stay because they are the reasons the
architecture looks the way it does, and because findings 1 and 3 remain **deviations from
the PRD as written** that the client has not yet been told about.

**1. The envelope solver is a fixpoint, and the PRD specifies a straight line.**
The setback depends on floor count → floor count depends on footprint → footprint depends on the
setback. `FR-PLT-002` writes this as a one-directional pipeline with no iteration. The PRD's
fixpoint machinery (§11.7) exists only for occupant load, and the evaluator registry has no path for
a lookup key to be a solver output. **As specified, Phase 0 cannot compute the deck's own slide 05.**
Needs a bounded fixpoint with a conservative seed, monotonicity, threshold-straddle detection, a
declared tie-break, and iteration history in the provenance graph.

**2. Provenance is a tax on every function signature, not a module.**
`M-PRV` demands 100% coverage, CI-enforced, and §19.3 is right that retrofitting it means rewriting
every layer. It is scheduled for week 7. **Enforce the CI assertion from week 2** — the pressure to
"add provenance once it works" is what kills it.

**3. The engine must be a pure function of (inputs, rule-set version, assumptions) from day one.**
`FR-ASM-001` perturbs every `ASSUMED` value ±10% and recomputes, `FR-DEF-002 AC4` wants a one-click
both-treatments FAR comparison — that is 20+ full pipeline executions inside a <10 s budget.
Fine if the pipeline is pure. A rewrite if that is discovered in week 8.

Plus: **there is no identity system anywhere in the PRD** (`tenant_id` appears once in 3,587 lines)
while four gates require a named reviewer/approver — a 1.5–2 person-week workstream missing from the
schedule. The built API first had no authorization at all. It now scopes every run to its author
*plus the accounts the author shared it with*, as reviewer or reader — ownership alone would have
broken `G4`, which deliberately requires a reviewer who is *not* the author. Anyone else gets a 404.
Tenancy, licence verification and separation of duties are still open. See `open-questions.md`
**Q25**.

---

## Effort, honestly

| | Person-weeks |
|---|---|
| PRD Phase 0 as written (4 FTE × 12 wk) | 32–48 |
| — of which engineering | ~24 |
| Actual engineering needed for the full spec | **34–42** |
| Solo, full spec | 30–40 weeks calendar |
| **Solo, honest reduced Phase 0** | **14–18 weeks** |

Reduced Phase 0 = one community · dimension-based plot entry (no basemap) · 20–30 rules · real
fixpoint · real provenance · **10 live invariants, 8 dormant** · single-tenant · PDF without
per-number footnote polish · async sensitivity.

The invariant count is now measured rather than estimated, and it is worse than the estimate.
Thirteen was the count once the five unit-schedule checks (Q19) were set aside; running the engine
shows four more — INV-01, INV-02, INV-11, INV-18 — also read a per-*level* schedule that Phase 0
does not generate. They could be made to pass by synthesising one, and are not, for the reason set
out in `open-questions.md` **Q26**. "The invariant layer passes" and "the invariant layer ran" are
different claims, and the product only ever makes the second.

**Roughly half the Phase 0 critical path is not software.** Rule authoring by a licensed architect,
the signed metric-definitions annex (which gates *all* area code in week 1), 10 land packs, and 3
contracted architects are the client's, not ours.

---

## Running it

Node ≥ 22 (24 recommended — `node:sqlite` is used, no database server) and pnpm.

```bash
pnpm install
pnpm check          # boundaries + contrast + typecheck + 244 tests
pnpm dev            # builds once, then API on :4000 and the UI on :5173
```

`pnpm dev` starts both apps; the Vite dev server proxies `/api` to the API, so open
**http://localhost:5173** and nothing else needs configuring. Three routes:

| Route | What it is |
|---|---|
| `/` | The landing page — what the product does, and the five-way claim statement in full. No sign-in. |
| `/app` | The engine. Nine steps, plot to export. |
| `/dashboard` | Deployment status: approved rules, signed definitions, invariants that ran, assumption exposure across every run, deferred life-safety checks, recent runs. |

The status page leads with **what is not ready** rather than with volume — approved
rules and signed definitions both currently read zero, and a page that showed "4 runs
this week" above them would be measuring motion and calling it progress. There is
deliberately no composite health score. While iterating on the engine
packages, run `pnpm dev:engine` in a second terminal — `tsc -b --watch` keeps the API's build
output current and `node --watch` picks it up.

| Command | What it does |
|---|---|
| `pnpm check` | The gate. Boundaries, contrast, `tsc -b`, then the whole suite. |
| `pnpm boundaries` | Asserts `invariants`, `validation` and `report` still cannot see the engine — across manifests, project references *and* source imports. |
| `pnpm contrast` | Measures every colour pair the UI paints against WCAG 2.2, in both themes. A pair it cannot resolve counts as a failure, not a skip. |
| `pnpm test` / `pnpm test:watch` | Vitest. |
| `pnpm build` | `tsc -b` over the solution. |
| `pnpm smoke` | Drives the whole nine-step flow in Edge (already on the machine — no browser download). Needs `pnpm dev` running. Checks the refusals, the provenance click-through, the keyboard path, and horizontal overflow on every screen at 320px and 390px. |
| `pnpm shots [dir]` | Screenshots of every screen, for a design review that looks at the thing. |
| `pnpm start` | The API alone, on `$PORT` (default 4000), `$DB_PATH` (default `:memory:`). |

`pnpm check` does not run `pnpm smoke`: the smoke test needs a server, and a gate
that fails because nobody started one is a gate people learn to skip. Run it before
anything that matters — it is where the accessibility defects were found, not in the
unit tests.

**The API refuses more than it answers, on purpose.** A run with no parking-in-FAR declaration
is `422`, not a guess. An export before gates G1–G4 is `409`. A run that fails an invariant or a
hard constraint is `422` and is never persisted — §12.3: failure blocks emission, never a warning.

---

## Source layout, as built

**This deviates from PRD §19.4** (Python / FastAPI / Shapely). The reasons are in
[`CLAUDE.md`](CLAUDE.md) and the client must be told; the short version is that §14.3 demands exact
predicates, GEOS does not have them, and Clipper's integer arithmetic does.

```
packages/
  core/        types · Traced<T> · numeric policy · metric definitions annex
  geometry/    Clipper kernel — per-edge offset, intersection, area ×3, analysis
  rules/       typed rule records · 12 evaluators · bitemporal store · resolution
  capacity/    envelope solver + setback↔floor fixpoint · parking · bands A/B/C
  invariants/  18 checks. Depends on `core` ONLY.
  validation/  independent validation + the five-way claim statement
  report/      HTML → PDF · canonical JSON export · run fingerprint
apps/
  api/         Fastify + Zod + node:sqlite
  web/         React + TypeScript + Vite
```

`invariants`, `validation` and `report` cannot import `capacity`, `geometry` or (except for
`validation`, which must read the constraint set it validates against) `rules`. That is not a lint
rule — the packages are absent from their manifests, so the import **fails to resolve**. §16.3 asks
for an import linter; this is stronger, and `pnpm boundaries` is what stops someone quietly adding
the line back.

The translation between the engine and those three layers is therefore written by hand at the
composition root, in [`apps/api/src/checks.ts`](apps/api/src/checks.ts) and
[`apps/api/src/report.ts`](apps/api/src/report.ts). That cost is the price of the boundary, and it
is paid deliberately.

**Principle 4 is still not fully met.** `FR-INV-001 AC4` also requires the invariant layer to be
*owned by an engineer who does not own the capacity engine*. A package manifest cannot enforce that
and a solo build does not satisfy it. See `docs/03-analysis/open-questions.md` Q16 — it must be
disclosed in writing, not absorbed.

---

## Hard rules carried from the PRD

- **Never claim compliance.** The validator agreeing with the generator is self-consistency, nothing
  more. Reports carry the five-way claim distinction; `REGULATORY VALIDITY: NOT ASSESSED` is permanent.
- **No hidden defaults.** A filled gap is amber on screen and listed in the report.
- **AI reads, the engine computes, humans approve.** An LLM may draft a rule; it never becomes one,
  and it never computes a number a user sees.
- **Unapproved rules cannot load.** There is no override flag.
- **Precedent is evidence, never authority.** A `PrecedentObservation` may not appear in a
  `ConstraintSet` derivation path.
