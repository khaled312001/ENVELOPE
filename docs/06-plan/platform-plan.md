# TOP.ai — the plan to finish the platform

**Written:** 2026-09-28. **Branch:** `plan/phase-0-stabilise`. **Live:** <https://tob.khaledahmed.net>
(release `914db8f`). **Starting state:** green — `pnpm typecheck` exit 0, 948 tests passing,
`boundaries` / `contrast` / `example` / `dxf` all passing, prod smoke passing in both languages.

**What this document is.** The ordered work to take TOP.ai from *a correct engine behind an
honest but unfinished interface* to *a platform someone can be given a login to*. It is driven
by two inputs: Eng. Mohamed's written reply of 2026-09-28, quoted and answered in full in §2,
and a fresh audit of what is actually in the repository, in §1.

**What it is not.** It does not restate `docs/05-design/direction.md` or
`docs/05-design/design-language.md`; those stand, and §5 is a delta against them. It does not
revisit the ten principles in `CLAUDE.md`. Where a request in §2 collides with one of those
principles, the collision is named at the point it occurs and resolved in the open — never by
quietly doing what was asked.

---

## 1 · Where the platform actually stands

Verified against the source on 2026-09-28, not recalled.

### 1.1 What is real and working

| | |
|---|---|
| **Engine** | Nine-step pipeline, three capacity bands, setback↔floor fixpoint, parking bays/aisles/ramp placed as rectangles from Table B.11, vehicle access under B.7.2.1, a `BuildingModel` that the screen, the A3 set, the DXF and the `.glb` all walk. |
| **Provenance** | Every emitted value is `Traced`. No untraced constructor exists. `packages/capacity/test/pipeline.test.ts` walks the graph for every published value. |
| **Gates** | G1–G4, hashed to their subject, enforced server-side. Exports refuse without G3 and G4. |
| **Accounts** | Real. `scrypt` password hashing with NFKC normalisation, session cookies with a 30-day TTL, `register` / `login` / `logout` / `logout-everywhere` / `me`, server-side drafts. Run access is ownership **plus an explicit grant** — `author`, `reviewer`, `reader` — with 404 rather than 403 so a run's existence does not leak. |
| **Exports** | Six formats: `html` `json` `sheets` `dxf` `glb` `xlsx`. The DXF is read back by an independent parser in `pnpm dxf`. |
| **Languages** | English and Arabic, full RTL, every route smoke-tested in both. |
| **Verification** | Eight gates — `boundaries` `contrast` `typecheck` `test` `example` `dxf` `smoke` `amber` — each catching a class the others cannot. |

### 1.2 What is missing, stated plainly

| Gap | Evidence |
|---|---|
| **No app shell.** Seven flat routes; the nine-step flow is a horizontal stepper strip inside the public-site chrome. No sidebar, no workspace, no project grouping. | `apps/web/src/routes.json` — 7 entries |
| **No way forward from a completed step.** Once `G1_PLOT_CONFIRMED` is true the parameters step renders a tick and **no button at all**. No step in the flow has a back/next footer. | [ParametersStep.tsx:105-121](apps/web/src/screens/ParametersStep.tsx#L105-L121) |
| **The plot form is a rectangle.** `width` × `depth` and exactly four edges. | [PlotForm.tsx:93-102](apps/web/src/screens/PlotForm.tsx#L93-L102) |
| **…but the API is not.** `plotInput` already accepts `vertices.min(3)` with `edges.length === vertices.length`. | [schemas.ts:61-83](apps/api/src/schemas.ts#L61-L83) |
| **Parking levels are one integer.** `parkingLevelsAvailable: z.number().int().min(0).max(8)` — no ground / basement / podium distinction. | [schemas.ts:115](apps/api/src/schemas.ts#L115) |
| **Saleable GFA is a 0–1 factor only.** No way to enter an absolute area. | [RulesStep.tsx:198](apps/web/src/screens/RulesStep.tsx#L198) |
| **The sheet's own limits are read and then ignored.** `facts.far` and `facts.gfaSqm` are returned by the intake route for display; the prefill carries only plot number, community, stated area and podium count. The run computes with the seed rules' FAR 5.00 while the sheet says 3.5. | [intake-route.ts:90](apps/api/src/intake-route.ts#L90) |
| **The intake parser reads page 1 text only.** `readPdfText(bytes, { pages: [1] })`, then regexes tuned to one issuing format's vocabulary. No geometry is read from the drawing. No OCR. The corpus is **one** affection plan. | [affection-plan.ts:305-312](packages/intake/src/affection-plan.ts#L305-L312) |
| **No core anywhere.** `@envelope/massing` states it outright: *"No cores, stairs, façades or columns. The model does not place them, so neither does this."* | [scene.ts:29-30](packages/massing/src/scene.ts#L29-L30) |
| **No circulation check.** Bays, aisles and a ramp are placed; nothing asserts that every bay can be driven to from the ramp. | `packages/capacity/src/layout.ts` |
| **Parking layout is axis-aligned rectangles only.** Non-rectangular footprints are rejected, not approximated — honest, but a limit. | [layout.ts:25-30](packages/capacity/src/layout.ts#L25-L30) |
| **No PDF.** The report is HTML and the A3 set is SVG-in-HTML. `packages/report` documents feeding it to headless Chromium; the API never does. | `apps/api/src/drawing.ts` |
| **No CAD beyond DXF, no IFC, no Revit path.** | `RunFileFormat = 'html' \| 'json' \| 'sheets' \| 'dxf' \| 'glb' \| 'xlsx'` |
| **No tenancy.** `StoredRun.tenantId` is written and nothing reads it. No organisation, no members, no invites, no roles above the run level. | Q25, `apps/api/src/access.ts` |
| **No auth screens.** Sign-in and sign-up are one toggled panel inside the antechamber. No forgotten password, no email verification, no invite acceptance. | [AccountPanel.tsx:72](apps/web/src/components/AccountPanel.tsx#L72) |
| **No road symbols.** Road hierarchy is a `<select>`; nothing draws it. | `PlotForm.tsx` |
| **Zero images.** `apps/web/public/` is empty; `index.html` references no image. | — |

---

## 2 · Eng. Mohamed's reply, answered point by point

Each item: what he wrote, what is actually true in the code, what we will do, and where it
lands. Where the answer is "we need something from you", it is marked **⛔ blocking** and
repeated in §10.

---

### 2.1 — *"لما بحط ال pdf بيقراه غلط ومش بيطلع كل ال parameters"*

**He is right, and the reason is specific.** The parser reads **page 1 only**, reads **text
only**, and matches with regular expressions tuned to the vocabulary of the **one** affection
plan in the repository (`IC1-CTYL-16_011-warsan1-621.pdf`) plus two Azizi plot sheets. A sheet
issued in a different layout — different authority, different template, different revision —
hits none of the anchors and the fields come back absent. A sheet that is a scan hits nothing
at all, because there is no text to read.

It also **never reads the drawing**. Everything the sheet prints as geometry — the boundary
polygon, the dimension against each edge, the bearings, the road names and widths — is ignored.
That is a second, larger half of *"مش بيطلع كل ال parameters"* and it is why he then has to
retype a width and a depth by hand.

**What we will do — four tiers, §4.1.**

1. **A format registry.** A sheet is fingerprinted, matched to a declarative field map, and read
   through it. A new issuing format becomes a data file, not a code change. This is the pattern
   the rule store already uses.
2. **An extraction review screen.** Every value the parser found is shown **next to the page it
   came from, with its box highlighted**, and can be corrected in place. A corrected value
   becomes `USER_SET` with his name on it, not a silent overwrite. This is the change that makes
   the parser's accuracy stop being a blocker: a wrong read becomes a two-second correction
   instead of a dead end.
3. **Geometry from the sheet.** Read the boundary polyline and the dimension text nearest each
   edge out of the PDF's vector content, propose a plot, and let him confirm or adjust it.
4. **OCR fallback** for raster sheets, marked `ASSUMED` and always routed through the review
   screen — never trusted silently.

**⛔ Blocking: we need 10–20 real affection plans.** Not to guess at — to read. Every format in
the registry has to come from a document we hold. One sample cannot teach a parser what varies.
Send the whole spread: different communities, different authorities, different years, and
please include two or three that are scans, and two or three that this version reads badly, so
we can measure the fix rather than assert it.

---

### 2.2 — *"What does sheet does not say محتاجين نتكلم فيها. وفي حجات موجوده مش مفهومه بالنسبالي"*

**This is a writing failure, not a feature failure.** The panel is correct and says something
important — that this sheet omits a limit, that we will not supply one, and why borrowing a FAR
from the neighbouring plot is the exact mistake the product exists to prevent. But it opens with
the argument and never opens with the fact. Read cold, in a second language, it is opaque.

**What we will do, §4.6.** Every panel in the flow gets the same three-layer structure, applied
uniformly:

1. **One sentence of fact, first, in plain language.** *"This sheet does not print a FAR."*
2. **What that means for you, second.** *"So the run cannot start until you enter one, or
   attach a document that states it."*
3. **Why, third — behind a disclosure** that is closed by default. The existing argument moves
   here, unchanged. It is worth reading and it is not worth blocking on.

Plus a worked-example link on every panel: *"see this on a real plot"* → the corresponding page
of the user guide.

This is the `ux-writing` skill's what → why → how formula applied to the whole flow, and it is
the single cheapest improvement in this document.

---

### 2.3 — *"الطريقه الي عاملها لزيزة بس طول ف عرض بس. الاراضي عموما كتير بتكون فيها كذا مقاس و كسور و كيرفات"*

**He is right, and the good news is bigger than the complaint.** The restriction is in **one
screen**, not in the engine:

- `packages/core/src/domain.ts` already defines `Ring = readonly Point[]` and a `PlotEdge`
  carrying `lengthMm` and `bearingDeg` per edge.
- `apps/api/src/schemas.ts` already accepts `vertices.min(3)` with one edge per vertex.
- `packages/geometry` already offsets **per edge**, which is what a many-sided plot needs.
- `apps/web/src/screens/PlotForm.tsx` computes a four-point rectangle from `width` and `depth`.

So **arbitrary straight-sided plots are one screen away.** Curves are genuinely new work, and
they are worth doing properly — see below.

**What we will do, §4.2.** Three inputs onto one type:

1. **Traverse entry (the way the sheet is written).** One row per edge: bearing and distance;
   for a curved edge, radius and arc length with chord and delta derived. The last leg closes
   automatically if the gap is within tolerance. **The misclose is reported, never silently
   absorbed** — distance and ratio both shown. A compass-rule (Bowditch) adjustment is offered
   as an explicit, consented action that produces an `ASSUMED` record with a basis string, not
   as a correction that happens behind his back. This mirrors Esri's Parcel Drafter, which is
   the established interaction for exactly this data.
2. **Canvas editing.** Drag a vertex, pull an edge into an arc. Every hand-moved point is
   `USER_SET` and the screen says so.
3. **Import.** Read the boundary from a DXF or LandXML the surveyor produced, arcs intact.

**The one decision that matters, and it is not a UI decision.** The arc must be stored
**exactly** — centre, radius, start and end angle, rotation — on the edge, and flattened to the
1 mm integer grid **only at the Clipper boundary**, with the chord tolerance recorded as a
traced derivation. Two reasons:

- The sagitta of a flattened arc changes the area, so `areaMismatch` would start firing against
  the sheet's own stated area for a reason nobody could explain.
- **Offsetting an arc inward is exactly a concentric arc of radius r − d.** Keep the arc and the
  per-edge setback stays exact on a curved boundary. Flatten first and it never can be. This
  preserves the exact-predicates argument in `CLAUDE.md` instead of eroding it.

The stored representation is the DXF `LWPOLYLINE` **bulge** convention — one scalar per vertex,
`tan(θ/4)`. It is the most compact arc-aware ring that exists and it round-trips to CAD
losslessly.

**"Computed area?"** — it is the area of the polygon the engine computes from his own vertices,
three independent ways, and it is compared against the area the sheet states. Within 2% it
proceeds; beyond 2% it blocks. That comparison is the whole point of typing the dimensions
rather than inferring them, and the screen currently explains it in a footnote. It gets its own
line in the new form, next to the stated area, with the difference shown as a number and a
percentage.

---

### 2.4 — *"في road , road type … بس لازم رمز ليهم"*

**Agreed, and it is overdue.** Road hierarchy already drives the vehicle-access recommendation
under B.7.2.1 — it is the most consequential field on the plot form and it is currently a
dropdown with no visual presence at all.

**Done, 29 Sep 2026 — see §4.3b**, which took the symbol set out of §4.2 because it does
not need the N-gon work in front of it. What follows is the plan as written.

**What we will do, §4.2.** One symbol set, drawn **in code** in
`packages/sheets/src/symbols.ts` beside the symbols already there, so that the screen, the A3
sheet, the PDF and the DXF all draw the same glyph from the same source:

| | |
|---|---|
| **Arterial** | heaviest double line, wide band |
| **Collector** | double line, medium band |
| **Local** | double line, narrow band |
| **Access** | single line, narrow band |
| **Adjacent plot** | solid hatch band along the edge |
| **Open space** | sparse dot fill |
| **Vehicle access** | a filled arrow crossing the edge at the recommended point, with its 15 m junction clearance drawn as a dimension from the chamfered vertex |

Each with a legend on the canvas and on the sheet, and each edge numbered from 1 (the
off-by-one was fixed in `5c440bd`). It is **not** commissioned as an image — a legend that the
drawings and the screen must share belongs in the display list, not in a PNG.

---

### 2.5 — *"بعد confirm the plot في زرار المفروض ندوس عليه انو يدخلنا الصفحه الي بعدها مش موجود"*

**Confirmed defect, and worse than he describes.** The first time through, confirming does
advance. But `ParametersStep` renders its footer conditionally: when `confirmed` is true it
shows a tick and **no button**. Go back to the step — from the stepper strip, from a bookmark,
from `?step=parameters` — and there is no way forward at all. And **no step in the flow has a
back/next footer**; the whole nine-step flow relies on a horizontal strip of ten small targets.

**What we will do, §4.10.** A persistent step footer on every one of the ten steps: *back* on
the inline-start side, *next* on the inline-end side, the gate's state in the middle. When a
gate is unsigned, *next* is disabled and carries the reason. When it is signed, *next* is
enabled and says where it goes. The stepper strip stays, as an overview — not as the only
navigation.

Plus: **the step is in the URL and the URL is restorable.** `?step=` already exists; the run
and plot ids join it, so a step can be linked, bookmarked and reopened. That is also the fix for
"I lose my place when I come back", which is on the Phase 7 list already.

---

### 2.6 — *"الباركنج مش بيتحسب في ال FAR دا منفصل"*

**This closes open question Q2**, which has been blocking since the first analysis — it swings
capacity by 15–35% and `FR-DEF-002` blocks computation until it is declared.

**And we still will not make it a default, and here is the honest reason.** `FR-DEF-002` allows
this value to be `DERIVED` from a citation or `USER_SET` by a named person, and forbids
`ASSUMED` and forbids a default. That is not pedantry: parking-in-FAR varies by community and by
land-use slice, and a hidden `EXCLUDED_FROM_FAR` would silently produce a 15–35% larger building
on the one plot where it happens not to hold — which is precisely the failure that would be
found by a regulator and not by us.

**What we did, §4.3 — landed 29 Sep 2026.** Three changes, all of which take his answer
seriously without laundering it into an assumption. **Two of the three landed as written and one
did not; the one that did not is the important one.**

1. **`EXCLUDED_FROM_FAR` is the first option — and it is *not* pre-selected.** This paragraph
   originally said pre-selected. It cannot be, and the repository said so before a reviewer did:
   `scripts/smoke.mjs` has carried *"the parking question has no pre-selected answer"* since the
   flow was first driven in a browser, and it failed the moment the pre-selection landed.

   The gate is right. A checked radio beside an enabled Compute button **is** a default however
   it is captioned, because a reader can click past it having decided nothing — and then the
   15–35% reaches a pro forma owned by no one. That is the entire failure `FR-DEF-002` names.

   So the answer is **offered**, not applied: a panel above the choice carrying his words, the
   date, and where the claim stops, with one button on it — *"Use this answer"*. One click, the
   answer is his, the run carries his name. That is everything the pre-selection was for, minus
   the part that made it a default.
2. **His statement is a citable source — and a `PracticeStatement`, not a `RuleRecord`, and
   `USER_SET`, not `DERIVED`.** This paragraph originally said both of the other things, and
   both were wrong in the same direction:
   - A `RuleRecord` is resolvable by `resolveParameter` and can bind the envelope. Nothing
     sourced to a practitioner's reply may do either — the same argument that keeps a developer
     standard out of the rule store, at higher stakes.
   - `DERIVED` in this system means a value reached a **cited regulatory instrument**. A
     practitioner saying what the practice is has not done that. `FR-DEF-002` asks for
     *"`USER_SET` by a named person"*, and that is exactly what this is; the named person is
     simply not the runner. Marking it `DERIVED` would have been the single most consequential
     piece of laundering available in this codebase, on the one number where it would matter
     most.

   `packages/rules/src/statements/` holds the type and the record. It is served from
   `/api/statements`, never merged into `/api/rules`, and a run that names the statement while
   sending a different treatment is refused at the boundary — a run may not put its own answer
   under somebody else's name.
3. **The one-click dual comparison stays** (`AC4`) — the screen still shows what the answer
   would be under the other reading, because on the day a community turns out to differ, that
   number is the one that matters. The attribution is **dropped** inside the comparison: it runs
   the pipeline under both treatments, and carrying his name into the arm he did not answer
   would be the same defect as (2) by a side door.

**And the treatment is now a traced value.** It reached the graph as a `detail` field on band A,
which no report could cite and no reader could open — on the largest single lever in the
product. `capacity.parking_in_far` is a node of its own, on the capacity screen, one click from
the figure it moves.

---

### 2.7 — *"هو المفروض تكون ground floor, Bassment كام دور, Podium كام دور"*

**Confirmed gap.** The whole level model is one integer, `parkingLevelsAvailable` (0–8), plus an
optional `podiumLevels` for the massing. The distinction between a basement, the ground floor
and a podium level is not representable — and each of the three behaves differently: a basement
has no setback and no coverage limit but has a ramp length cost; the ground floor is bound by
coverage and carries the vehicle entrance; a podium level is bound by the podium setback and may
or may not count against the height ceiling (**Q27, still open**).

**What we will do, §4.4.** Replace the integer with a structured schedule:

```
levels: {
  basements:     { count, floorToFloor },   // below grade
  ground:        { floorToFloor, parkingOnGround: boolean },
  podium:        { count, floorToFloor, parkingLevels },
  tower:         { count, floorToFloor }    // derived from the height fixpoint
}
```

Every count `USER_SET` or read from the sheet; never defaulted. The massing, the level plan, the
parking supply and the drawing set all read from one schedule instead of three near-copies. The
3D view gains a level picker that names each level by what it is — `B2`, `B1`, `G`, `P1`, `P2`,
`L3` — rather than by index, which is also the fix for the level-picker `lang` defect on the
minor list.

**And the schedule displays as `2B+G+3P+35`**, which is how a Dubai architect writes it and how
the one open-source Dubai peer writes it (§7.6). It is also the form the Warsan sheet itself
prints — `G+2P+8` — so the display form and the source document finally agree.

**⛔ Q27 needs his answer:** *does a podium parking level count against the height allowance?*
`G+2P+8` on the Warsan sheet is ambiguous and the answer changes the tower count.

---

### 2.8 — *"How much GFA is saleable … الرقم بيكون مثلا ٢٠٠٠ متر او اكتر بس هنا معمول معامل من 0 ل 1"*

**Both readings are legitimate and the screen should take either.** The 0–1 factor is the
efficiency the Azizi brief states as a market expectation (*"Expectations are between 93%-97%
(SA / GFA)"*) and it is the right input when the GFA is not yet known. An absolute area is the
right input when he is working from a brief that states one.

**What we did, §4.5 — landed 29 Sep 2026.** One field, two units, one radio pair:

- **As a ratio** — `0.95` — exactly as before.
- **As an area** — `2000 m²` — and the engine divides it by the GFA this envelope yields,
  publishes **both** as traced values, and shows both on the results screen beside the governing
  figure so a typo is visible immediately.

Two decisions inside that are worth stating, because both look like details and neither is:

- **The box is cleared when the unit changes.** `0.93` read as `0.93 m²` is a building that
  sells one square metre; `6000` read as a share fails validation and looks like a broken field.
  Converting it silently would be worse than either — it would put a figure in the box that the
  reader did not type, on the one screen whose whole proposition is that nothing is quietly
  substituted.
- **The refusal names the field the reader is looking at.** Telling somebody who chose square
  metres to "enter the saleable share of GFA" sends them hunting for a control that is not on
  the screen.

And his other point — *"المفروض ال سيستم يعرفها من ال affection plan"* — is half true, and the
half that is false matters. **An affection plan does not state saleable efficiency.** It states
a GFA. What the sheet can supply is the **GFA**, and that is exactly what §4.1 and §2.9 fix: the
sheet's GFA becomes an input to the run instead of a display field. Saleable efficiency is a
commercial expectation, not a regulatory limit, and it will stay something a person enters and
signs for.

---

### 2.9 — *"Assumptions مش فاهمها"*

**The most important sentence in his reply.** Amber `ASSUMED` is the single most important UI
decision in the product (PRD §13.1); if the person reading it does not know what it means, the
product has failed at the thing it is for.

**What we will do, §4.6.**

1. **An explainer at the top of the step**, illustrated (image **#12**), in two sentences:
   *"Six numbers in this run were not stated by any document. The engine chose them, marked them
   amber, wrote down why, and will show you what changes if you change them. Nothing here is
   hidden — that is the whole point of the colour."*
2. **Each row reads as a sentence, not a record.** Today: parameter id, value, basis,
   sensitivity. Instead: *"We assumed **32 m² per bay** because [basis]. If it were 30, the
   answer would be X. You can change it."* — with the id kept, small, for the people who want it.
3. **Sort by consequence, not alphabetically.** The assumption that binds the governing band
   goes first and is marked as the one that decides the answer.
4. **Every assumption editable in place**, which it already is, and the re-run made obvious:
   editing creates a new run and says so, because §13.4 keeps the original intact.

**And a defect this exposes.** The affection plan's own limits are read and **not applied** —
the run uses the draft rules' FAR 5.00 while the Warsan sheet prints 3.5 and a GFA of
4,778.31 m². On that plot the parking band governs, so the answer is unaffected; on a plot where
the regulatory band governs, the result would **exceed the sheet**. Chapter 4 of the user guide
already states this. It is fixed in **Phase D**, and it is the highest-severity item in this
document.

---

### 2.10 — *"ال massing … النتيجه مبتطلعش صح لان المعطيات مش مظبوطه. و الاهم ال core لازم يكون في الحسبه و ممر الي ماشي فيه السيارات مظبوط"*

Three separate things, and separating them is most of the answer.

**(a) "المعطيات مش مظبوطه" — the inputs are wrong.** That is §2.1, §2.3, §2.7 and §2.9. The
massing is a faithful drawing of the numbers it is given; give it a rectangle inferred from a
mistyped width and it will draw that, correctly. Those four fixes land before any massing work,
and a good part of this complaint dissolves with them.

**(b) The core.** He is right and the omission is currently *stated* rather than fixed —
`@envelope/massing` says in its own source: *"No cores, stairs, façades or columns. The model
does not place them."* A core is not decoration: it consumes plate area on every level, it
consumes bays on every parking level, and a tower plate without one overstates the saleable
area by 12–18%.

**What we will do, §4.7.** Place a core in the engine, never in the viewer:

- A rectangular core with a stated area, positioned by a **deterministic rule** — centred on the
  tower plate's centroid, clear of the plate edge by the structural zone, and clear of the
  parking module grid on every level it passes through.
- Its area from three sources in priority order: stated by the user; derived from a developer
  standard where one is attached; otherwise `ASSUMED` from a floor-plate-to-core ratio with a
  basis string and a sensitivity, amber on screen and in the 3D view.
- It appears on every level of the massing, on every parking sheet as an obstruction, in the
  DXF on its own layer, and in the `.glb`.
- **What it will not do:** it will not be *positioned* by a search for maximum yield. That is
  the optimiser at 34:37, it is a `TRADEOFF` value, and `PHASE_0_CLASSES` refuses to emit one by
  construction. A deterministic placement that is stated and can be overridden is in scope; a
  solver that picks the best position is not, and the refusal is the design.

**(c) The driveway — *"ممر الي ماشي فيه السيارات مظبوط"*.** The aisles are placed at 6.00 m
two-way per Table B.11 and corroborated by his own AutoCAD drawings. What is missing is that
**nothing checks they connect.** A bay can currently be placed in a run whose aisle never
reaches the ramp, and the layout will still report the bay.

**What we will do, §4.8 — a circulation graph, and a new invariant.** Build the aisle network as
a graph, connect the ramp to it at its landing, and assert that **every placed bay touches an
aisle that reaches the ramp**. A bay that fails is not drawn and not counted, and the shortfall
is reported in m² and in bays — never quietly absorbed. This is the same technique
`ucalyptus/ParkSolver` uses for aisle connectivity and that `archlang` uses for room reachability,
and it is exactly the kind of check this codebase already runs everywhere else.

Also in §4.8, and cheap: **a stripe-angle sweep.** Today the modules run on the footprint's
principal axis. Trying the module direction at several angles and keeping the arrangement that
places the most bays is a *deterministic* improvement — it searches an orientation, not a
design, so it does not become a `TRADEOFF` value. The angle tried and the angle chosen are both
reported as `DERIVED`.

---

### 2.11 — *"عايزين بعدين نقدر نحملها pdf او كاد او ريفيت"*

| | Status | Plan |
|---|---|---|
| **PDF** | Missing. The report is HTML; the A3 set is SVG inside HTML. | **§4.9, Phase F.** Render server-side. `svg2pdf.js` + jsPDF is viable here specifically because our SVG is machine-written from one display list — the library's own stated limitation is that it cannot handle arbitrary user SVG, and ours is the "carefully curated" case it names. Headless Chromium stays the path for the prose report. |
| **CAD** | **Already shipped.** DXF R12, the whole building or any single sheet, read back by an independent parser in `pnpm dxf`. | Relabel it. The export is called "the drawing"; it will say **"AutoCAD (DXF)"**, because he did not know he already had it. Plus the sheet furniture in §4.9. |
| **Revit** | Missing, and it will stay missing. | **There is no open-source `.rvt` or `.rfa` writer and there will not be one** — the format is closed. The real path is **IFC4**, written server-side (`@ifc-lite/create`, MPL-2.0, TypeScript-native), which Revit imports natively. It will be labelled **"IFC (opens in Revit)"** and never "Revit". Claiming a Revit export we do not have is the same class of error as claiming compliance. The IFC carries `REGULATORY VALIDITY: NOT ASSESSED` in the `IfcProject` description **and** in a property set on every element, so it survives the round trip. |

**And the drawings need more than a file format.** A professional sheet needs thirteen things a
naive SVG export lacks, and ours currently lacks most of them — title block with addressable
fields, a graphic scale bar as well as a ratio, a north arrow driven by the plot's own bearing,
a four-pen line-weight hierarchy, poché on cut solids, dimension **strings** with witness lines
and terminators rather than single numbers, grid bubbles and level datums, a legend, annotation
scale independence, sheet cross-references, a notes block carrying the regulatory sentence and
the assumption register, and a revision table. The full checklist is §4.9.

---

### 2.12 — *"Checks nice 👍"* and *"احنا لازم ندخل meetings"*

Noted, and the meeting agenda is §12 — seven items, each one a question whose answer changes
what gets built, ordered by how much it changes.

---

## 3 · What his reply settles, and what it opens

**Settled.** Three open questions close on this reply:

| | |
|---|---|
| **Q2** — does parking count toward FAR? | **No, it is separate.** Recorded as a citable statement by a named person (§2.6), not as a default. |
| **Q23** — plot entry, dimensions or coordinates? | **Dimensions, bearings and curves.** Traverse entry with reported misclose; coordinates only via import. |
| **Q9** — does he accept that Phase 0 draws nothing? | **Moot.** It draws. He reacted to the drawings twice — *"حلوه اوي فكره ال massing"*, *"حلوه برضو فكره ال drawings"* — and the question is now about drawing *better*. |

**Opened.** Four requirements that were not in the PRD:

1. Curved plot boundaries (§2.3) — new geometry work, and the exact-arc decision is load-bearing.
2. The core in the computation (§2.10b) — new engine work with a hard scope edge against the
   optimiser.
3. A structured level schedule (§2.7) — a type change that touches five packages.
4. IFC export (§2.11) — a new package.

**Still open and still needing him:** Q27 (podium parking against the height ceiling), Q20 (unit
mix source), Q25 (tenancy), and the affection-plan corpus.

---

## 4 · The work, by area

Each area lists the change, the files, and how it is verified. Nothing here ships without a gate.

### 4.1 Intake — reading the affection plan

| | |
|---|---|
| **Format registry** | `packages/intake/src/formats/*.json`, one per issuing template: a fingerprint (anchor strings + their approximate positions) and a field map (each field's anchor, search direction, pattern and unit). New format = new file. |
| **Multi-page** | Read every page, not page 1. Fields may be found on any page and the citation records which. |
| **Extraction review screen** | New step 0b. The page rendered as an image, every found value boxed on it, every value editable. A correction is `USER_SET` with a name. A value left as read stays `DERIVED` with its box as the citation. |
| **Geometry extraction** | Read the boundary polyline from the PDF's vector content; pair each segment with the nearest dimension text; propose a ring; hand it to the plot step as a prefill that must be confirmed. |
| **OCR fallback** | For sheets with no text layer. Everything OCR produces is `ASSUMED`, amber, and forced through the review screen. |
| **The sheet's limits become inputs** | `facts.far`, `facts.gfaSqm`, `facts.setbacks`, `facts.coverage` and `facts.height` carry into the run as `DERIVED` values citing the sheet — see §4.3. |
| **Verified by** | A fixture per format in `packages/intake/test/`, each asserting the fields found *and the fields correctly reported absent*. A parser that finds more than the sheet states is a worse failure than one that finds less. |

### 4.2 Plot — the real shape

| | |
|---|---|
| **Type** | `PlotEdge` gains an optional `arc: { radius, rotation, bulge }`. `Ring` gains a parallel bulge array. Exact until the Clipper boundary; chord tolerance recorded as a traced derivation. |
| **Traverse table** | One row per edge: classification, road hierarchy, bearing, distance — or radius + arc length for a curve. Add/remove/reorder rows. Live misclose distance and ratio. Compass-rule adjustment offered explicitly, producing an `ASSUMED` record. |
| **Canvas** | `PlotCanvas` becomes editable: drag a vertex, pull an edge into an arc, click an edge to classify it. Every hand-moved point `USER_SET`. |
| **Import** | DXF `LWPOLYLINE` (bulge-aware) and LandXML `<Curve>`. |
| **Symbols** | The road-hierarchy set in `packages/sheets/src/symbols.ts`, §2.4, shared by screen / sheet / PDF / DXF. |
| **Computed area** | Shown beside the stated area with the difference as a number and a percentage. |
| **Verified by** | `pnpm parity` extended: the traverse, the canvas, the A3 sheet and the DXF must all describe the same ring. A closure fixture set — plots that close, plots that miss by 0.5%, plots that miss by 5%. |

### 4.3 Rules and parameters

- `EXCLUDED_FROM_FAR` first and **offered** — never pre-selected — sourced to a named
  `PracticeStatement`, `USER_SET` by him. **Done, 29 Sep 2026; see §2.6 for the two parts of
  this line that were wrong as written and what the smoke gate did about the first of them.**
- The sheet's FAR, GFA, setbacks, coverage and height bind the run, with the sheet as the
  citation, and **the sheet's limit wins over a draft seed rule**. Where the two disagree, both
  are shown and the tighter binds.
- A `plot-limits` panel: every limit, its source (sheet / brief / regulation / you), and its
  value, in one table.

### 4.3b Boundary symbols — **done, 29 Sep 2026**

The road-symbol half of §2.4, which §4.2 was carrying and which does not need the N-gon work
in front of it. `packages/sheets/src/edges.ts` computes a **band** along each classified
boundary, and the plot canvas, the A3 site plan, the parking sheets and the DXF all draw the
same strip from the same numbers.

| | |
|---|---|
| **Arterial** | 6 m band, heaviest pen |
| **Collector** | 4.5 m |
| **Local** | 3 m |
| **Access** | 1.8 m, no fill |
| **Adjacent plot** | 1.2 m, hatched |
| **Open space** | 1.2 m, dotted |
| **Unclassified** | *no band* — an unclassified edge is a question, and a band would answer it in ink |

**The band ranks; it does not measure, and it says so.** An affection plan states a road's
hierarchy and never its width, so a strip drawn at a real carriageway width would be asserting
a dimension nobody read off a document. `BAND_NOTE` is printed on every sheet that draws one and
in both languages under the plot canvas.

**Four decisions that were not obvious.**

1. **Outside the plot, and the side comes from the ring's own winding.** Inward, a band lies on
   the setback strip and reads as another limit. The direction is derived from the signed area
   rather than from an assumed counter-clockwise ring — a fixture that happened to be clockwise
   would otherwise draw every band through the building, and `edges.test.ts` runs both windings.
2. **The ranking is not carried by colour alone (1.4.1)** — the same ruling that already gave
   each edge class its own dash. The four road bands are one accent at four widths and four pen
   weights, and the legend swatch draws the band at its own ranking rather than only naming it.
3. **Every band scales by one factor on a small plot.** Six metres beside a 20 m plot is a third
   of the drawing and would run through the frame and the dimension strings, so the widest band
   is capped at 6% of the plot's span — and because all of them scale together, an arterial stays
   wider than a collector at every size.
4. **The 3D DXF draws them once, at grade.** Every plan sheet carries the plot context, which is
   right on paper; stacked into one file it would put a copy of the street through each parking
   level, so the band roles joined `SITE_ROLES` the day they were written.

`ModelEdge` gained `classification` and `roadHierarchy` to make this possible: the drawings
cannot see a `Plot`, and a band derived by parsing the edge's printed label would be a symbol
computed from a string.

### 4.4 The level schedule — **done, 29 Sep 2026**

`LevelSchedule` in `@envelope/core` — basements, whether the ground floor is parking, podium
levels above the ground floor, and how many of those hold parking — threaded through
`pipeline.ts`, `massing.ts` and `building.ts`, and accepted by the API as `levels`. A run given
one no longer needs `parkingLevelsAvailable` or `podiumLevels`: both are derived from it, by
`parkingLevels()` and `podiumFootprintLevels()`, which are the only two places that arithmetic
now lives.

**It found an off-by-one that had shipped.** `G+2P+8` is ground plus two podium levels:
**three** levels standing on the podium footprint. The massing read the `2` and drew two, on
every plot whose sheet states a podium. It moved the picture and the podium roof level and no
capacity figure, which is why it survived — and `scripts/smoke.mjs` held the wrong number too,
asserting the massing show the sheet's digit. The screen still asks for the digit, because that
is what a reader copies off the sheet; `podiumFootprintLevels` does the `1 +` once.

**Two values stopped being assumptions.** Where the parking sits was never derivable from two
integers, so `building.ts` filled the podium from the ground up and declared that in amber. A
stated schedule is a person answering the question, so the placement is `USER_SET` under their
name and `massing.podium_levels` is too. The readiness snapshot's assumption exposure lost both
rows, which `pnpm example` caught and refused to accept without being told to.

**A schedule that does not describe a building is refused, not clamped.** Three podium parking
levels in a one-level podium, or a schedule providing no parking at all, throws
`RunBlockedError` at `G2:level-schedule` before anything is computed. Clamping would answer a
question about the building that whoever filled the form got wrong. The panel prints the
engine's own sentence, led by a line in the reader's language saying what kind of thing it is —
the same treatment `ErrorBanner` gives the API's refusals, and for the same reason.

**Levels are named for what they are.** `B2, B1, G, P1, L03` rather than `L00, L01, L02`, which
named the ground floor, a podium level and a typical floor alike and reached the DXF as layer
names. Typical floors keep their absolute index, so `L03` means the same storey on two plots
with different podiums. The schedule reads back on screen as `1B+G+2P`, written by the engine's
own `levelCode` — the tower left off until a run has produced one, because printing a guess
beside three numbers a person just typed would make the one figure they cannot check the most
prominent thing on the panel.

**Stored runs are not re-interpreted.** `levels` is optional and additive; a run computed from
the two integers reports `levels: null` rather than a code inferred from numbers that cannot
carry one. Re-reading an old answer under a new model would change a number somebody has
already been shown.

**What §2.7 sketched and this deliberately does not carry: a floor-to-floor per band.** The
sketch gave each of basements, ground, podium and tower its own. The engine has one
`floorToFloorM`, and it is the divisor in the height fixpoint — four of them make the fixpoint
solve over four unknowns, and the rule the fixpoint implements does not distinguish them. It is
a real modelling gap (a 4.5 m ground floor under 3.2 m typicals is an ordinary Dubai scheme and
this engine cannot say so) and it is a separate piece of work, not a field to add quietly to a
schedule. The tower is likewise absent from the type on purpose: it comes out of the
setback↔floor fixpoint, and a stated tower count would be an input competing with a computed
answer. **Q27 is still open** and this type does not answer it — it states what the building is,
not how the height allowance treats it.

### 4.5 Saleable GFA — ratio or area — **done, 29 Sep 2026**

One field, two units, both published as traced values and both shown on the results screen
(§2.8). `SaleableEfficiencyInput` takes a ratio **or** an area, exactly one, enforced by the
type rather than by a runtime check; the API schema refuses a body carrying both or neither.

**The divisor is the envelope's own GFA — `plate × levels` — not FAR × plot area, and this
reverses what §9's 28 Sep entry intended.** The reasons, in order of weight:

1. **FAR × plot area is not always available.** `DJAZ1MED12RES011` prints `G+11` and no FAR at
   all. A divisor that is undefined on a real plot in the corpus is not a divisor.
2. **The permitted GFA overstates efficiency wherever the envelope binds below FAR.** A share
   taken against a GFA the scheme never reaches reports an efficiency the scheme does not have.
3. **It is not circular.** The worry in the 28 Sep entry was about the *governing* GFA, which is
   computed after the efficiency is consumed. `plate × levels` is not: it comes out of the
   envelope solve, which does not read the efficiency at all.
4. **The objection that argued for FAR × plot area is answered a different way.** That entry's
   real complaint was that "a reader would have no way to tell which they were shown". They can:
   both figures are published, and the formula on the provenance node names the divisor in full
   — `6 000.00 m² saleable ÷ 17 920.00 m² GFA`.

What this means for a reader, said in the engine's own docblock: an area entered here is the
saleable area of the **full envelope**, so where a band below geometry governs, the saleable
area falls with it. The share is what carries through to the unit count in both directions.

An area larger than the envelope's GFA is refused in a sentence naming both figures — a brief
written for a larger plot, or square feet read as square metres, are the two ways it happens —
rather than reported as a ratio above 1 the reader never typed.

### 4.6 Comprehension — the writing pass

The three-layer structure (§2.2) applied to all ten steps, plus the assumptions rewrite (§2.9),
plus a worked-example link per step. Held to `docs/05-design/arabic-glossary.md` in Arabic and
run through the `ux-writing` ten-item pre-ship checklist in both languages.

### 4.7 The core — **done, 29 Sep 2026**

Sized in the engine (`packages/capacity/src/core.ts`), placed by a rule, drawn on every level it
passes through — on each parking sheet, on the typical floor, as a shaft in the 3D view, as
3DFACE walls on `ENV-<LEVEL>-CORE` in the DXF, and in the `.glb`.

**The obvious reading of "the core must be in the calculation" is wrong, and taking it would
have made the answer worse.** Subtracting the core from the floor area is wrong twice over. A
core is **inside GFA** — the annex says so under `CORE_AREA`, and `TOWER_PLATE` lists "Core"
among its inclusions — so deducting it would report a GFA the plot does not have. And it is
**outside saleable area**, which is exactly what the saleable efficiency already carries: 0.93
means seven per cent of the gross does not sell, and the core is most of that seven per cent.
The same holds one floor down, where the parking usable fraction's own words are "cores, plant,
the ramp landing and circulation that is not drive aisle".

So the core does not subtract. It does three things instead, and each is something the product
could not do before:

1. **It is drawn**, in the ink of the value that sized it. A tower plate with nothing in it
   reads as a plate with nothing in it, and the typical-floor sheet used to print "UNITS, CORES
   AND FACADES NOT MODELLED" across the middle of the plate — which is now where the core is.
2. **It reconciles.** `reconcileCore` compares the core's share of the plate against what the
   saleable efficiency leaves for everything that does not sell, and the core's area against
   what the usable fraction deducts on a parking level. When the core alone exceeds either, the
   input cannot hold — and the engine says so and **changes neither figure**. That arithmetic is
   on the results screen and in the sheets' notes, and nothing else in the system performed it.
3. **It is a declared quantity rather than an absence.** Unstated it is `ASSUMED` at 18% of the
   tower plate — the middle of the 15–22% a residential core takes — amber everywhere, with a
   basis and a **measured** sensitivity of zero in the register. Measured, not `null`: "we moved
   it 10% and the answer did not change" is an answer, and it required `Perturbable.apply` to
   take the run's output, because an assumed value is by definition not in the input.

**Its position is a rule, not a search.** The core is the tower plate ring scaled about its
centre to the core's area — the same deterministic placement the plate itself is drawn by,
stated in the same words. A core positioned by searching for maximum unit yield is the optimiser
at 34:37, it is a `TRADEOFF` value, and `PHASE_0_CLASSES` refuses to emit one by construction.
The consequence is said wherever the core is drawn: **only its area is a quantity.** No lift,
stair, riser or core wall is placed, and `notModelled` carries that sentence.

**Refused, not clamped.** A core of zero or a core at least as large as the plate throws
`RunBlockedError` at `G2:core`, in a sentence naming both areas and the usual cause — a figure
in square feet read as square metres.

**The third source in this plan's own sketch does not exist, and the branch was not written.**
It asked for an area "derived from a developer standard where one is attached". No standard on
file states a core area or a core ratio. A branch that reads a figure no document holds is a
branch that would one day read the wrong one, so there are two sources — `USER_SET` and
`ASSUMED` — and `CoreInput` says why in its own docblock.

### 4.8 Parking circulation

- The aisle graph and the reachability invariant (§2.10c).
- The stripe-angle sweep, reported as `DERIVED`.
- Bays lost to the core, to reachability, and to the non-rectangular shortfall reported
  separately in bays and m² — three different losses, three different numbers.
- The ramp connected to the aisle network at its landing, its run length checked against its
  gradient and the floor-to-floor it serves.

### 4.9 Drawings and exports

**Sheet furniture**, in `packages/sheets`, one display list, drawn by the screen, the A3 set, the
PDF and the DXF:

1. Border and title block with **named, addressable fields** — project, plot, title, scale,
   date, sheet n of m, revision, drawn/checked. (FreeCAD TechDraw's `freecad:editable`
   convention: a field is a key, not a substring.)
2. Stated scale ratio **and** a graphic scale bar.
3. North arrow driven by the plot's own principal bearing.
4. Four pens: cut, outline, hidden, annotation.
5. Poché on cut solids, pattern scale tied to units, hatch never under prose.
6. Dimension **strings**: witness lines, terminators, text above the line, an overall chain and
   an intermediate chain.
7. Grid bubbles and level datums.
8. Legend: layers, colours, the bay-numbering scheme, the symbol key.
9. Annotation scale independence — text sized in mm-on-paper.
10. Sheet numbering and cross-references.
11. A notes block carrying `REGULATORY VALIDITY: NOT ASSESSED` and the assumption register.
12. A revision table.
13. Fit-to-sheet discipline — standard scales only (1:100, 1:200, 1:500), match lines where
    needed, never an arbitrary ratio.

**Formats:** PDF (new), DXF (relabelled, plus a `DIMS` layer carrying dimensions as geometry so
the text is the engine's traced number and not something a CAD app recomputes), IFC4 (new,
server-side, labelled "IFC (opens in Revit)").

### 4.10 Step navigation

The persistent back/next footer, the restorable URL, and the autosave-and-resume already on the
Phase 7 list (§2.5).

---

## 5 · Design — the delta

`docs/05-design/direction.md` and `design-language.md` stand. Straight corners, no shadows, an
ink primary button, amber reserved for uncertainty, semantic tokens only. What follows is what
changes because the product gains an application shell and imagery.

### 5.1 The shell

**Two shells, not one** (§7.1). The public site keeps `SiteChrome`. The **platform** gets a
sidebar shell — projects, library, settings — and inside a run the **flow** gets the category's
three columns: the steps as a left rail, the canvas in the middle, the provenance inspector on
the right. `App.tsx` already has `layout--with-panel` for the inspector; what moves is the
stepper, from a horizontal strip of ten small targets to a rail, which is also what makes the
back/next footer in §4.10 sit naturally under the step body.

The sidebar shell is specified below.

```
grid-template-columns: var(--sidebar-w) 1fr;   /* 256px → 64px collapsed */
```

- **Sidebar 256px expanded, 64px collapsed.** Animate `grid-template-columns`, not margins;
  200ms `cubic-bezier(.4,0,.2,1)`. Labels clear ~75ms *before* the clip reaches them on collapse
  and appear ~100ms *after* the rail opens on expand.
- **Persist per account, not per session**, written as `data-sidebar-collapsed` on `<html>` from
  a pre-paint inline script — otherwise every load flashes wide then narrow.
- **Header 56px.** Content capped at 1280px with a 32px gutter, 20px below 640px.
- **≥1024px** docked and pushing. **768–1024px** collapsed to the rail. **<768px** an off-canvas
  drawer with `translateX`, a click-to-close backdrop, Esc and a focus trap — and the shell
  switches to `display:block` so an open drawer pushes content down rather than painting over it.
- **RTL is a logical-property swap**, not a second layout. `rtl.css` already carries the house
  convention.

### 5.2 Sidebar anatomy

Brand block → workspace switcher → primary nav → section groups → footer block (account, theme,
language). Nav item 36px tall, 12px horizontal padding, icon + label with an 8px gap. Section
headers 12px uppercase with a 24px top margin. **Active state is an 8% accent wash *plus* a 3px
inline-start border** — colour alone is not an indicator, here as everywhere else in this
codebase.

Top bar carries global context only: search, the account menu. Everything inside the workspace
is in the sidebar. The theme toggle goes in the sidebar footer and **not also** in the top bar.

### 5.3 Tokens — what to add

`tokens.css` is already three-tier and already measured in three themes. Four additions:

| | |
|---|---|
| **Sizing** | `--sidebar-w`, `--sidebar-w-collapsed`, `--header-h`, `--content-max`, `--inspector-w`. Today the shell hard-codes these. |
| **Density** | Three named row heights — compact 36px, comfortable 48px, spacious 56px — as tokens, with comfortable the default and the choice stored per account. A single row height is what makes a table feel like a web page instead of a schedule. |
| **Elevation on dark** | Express elevation by **lightening the surface**, never by shadow — shadow vanishes on dark. Four surface tiers: base, raised, nested, overlay. Never `#000` as the page ground. |
| **Motion** | Five durations — 0 / 100 / 200 / 400 / 600ms — and four easings. Arrivals `ease-out`, departures `ease-in`, repositioning `ease-in-out`, progress `linear`. Exits faster than entrances. Never an off-scale duration. All collapse to 0 under `prefers-reduced-motion`. |

**Never animate:** opacity from 0 on scroll-revealed content (this codebase has already been
bitten — three sections printed blank), text content, layout-affecting properties on a table, a
colour that is the sole state indicator, or anything on a value the reader is reading.

### 5.4 Tables and figures

Sticky header. Numeric columns right-aligned with `font-variant-numeric: tabular-nums` — IBM
Plex Sans carries true tabular figures, so a column aligns without switching to mono, and Plex
Mono stays reserved for a traced value quoted inside prose, which is exactly how the product
already uses it.

**No stat row on `/work`.** The research says a 4–6 card stat strip is the category default; this
product refuses it, and `Work.tsx` already argues why in full: *"An average of two governing
capacities from two different plots is not a fact about anything."* That refusal does not change
because the page gets a sidebar.

### 5.5 Imagery

25 images, specified in [image-prompts.md](docs/06-plan/image-prompts.md) — placement, size,
dark variant, prompt, alt text in both languages, and seven hard rules. The three load-bearing
ones: **no legible digits in any image**, **no amber outside the one image where amber is the
subject**, and **nothing that implies approval or compliance**. Three further assets are named
there as *draw in code, do not commission* — the road symbols, every drawing of an actual plot,
and the avatars.

---

## 6 · The dashboard

### 6.1 Routes

Public site (unchanged in kind, `SiteChrome`):

`/` · `/parking` · `/refusals` · `/exports` · `/readiness` · `/sign-in` · `/sign-up` ·
`/forgot-password` · `/reset-password` · `/verify-email` · `/accept-invite`

**`/dashboard` becomes `/readiness`, and `/dashboard` redirects to it permanently.** The name
was always slightly wrong — that page is deployment readiness, not a user's dashboard, and
`site-map.md` warns it must never be renamed in a way that implies it monitors uptime.
`/readiness` is *more* honest, not less. The redirect keeps every link in the delivered user
guide working.

Application shell (new chrome, sidebar):

| Route | What |
|---|---|
| `/app` | Workspace home: what needs you (unsigned gates, shared runs awaiting review), then recent runs. **With no runs it opens on the worked example, not on an empty state** (§7.4.1) — and ours is the only demo in the category that a build gate re-verifies against the engine |
| `/app/projects` | Projects — authored, shared, drafts, as three lists (the `Work.tsx` argument holds) |
| `/app/projects/:id` | One project: its plot, its runs, its documents |
| `/app/runs/:runId` | One run — today's `RunPage` |
| `/app/new` | The nine-step flow — today's `EngineApp`, with the new footer |
| `/app/library/rules` | The rule library, with every rule's status and citation |
| `/app/library/standards` | Developer standards and project briefs, with "this is not a regulation" above the list |
| `/app/settings/profile` | Name, email, licence number |
| `/app/settings/security` | Password, active sessions, sign out everywhere |
| `/app/settings/appearance` | Theme, language, density |
| `/app/settings/members` | Members, roles, pending invitations — **gated on §6.4** |
| `/app/settings/organisation` | Name, and what a tenant is in this deployment — **gated on §6.4** |
| `/app/audit` | Every gate signature, share, role change and export, append-only |

Routes enter `routes.json` **only when built** — the existing rule, mechanised by
`route-coverage.test.ts`, which fails a route with no test file.

### 6.2 Auth screens

Split-screen: a 480px form column and the `auth-panel` image (#18). Card content 360–440px, one
column, labels above fields, a password reveal toggle, errors inline and `aria-live`, never
colour-only.

| | |
|---|---|
| **Sign up** | Name, email, password (12 characters, length the only rule), optional licence number. Nothing else — onboarding questions on a signup screen convert worse and belong past the door. |
| **Sign in** | Email + password. No social sign-in: it would send `info@barmagly.tech` and every client's address to a third party for no gain. |
| **Forgot / reset** | Token, single use, 1-hour expiry, invalidates every session on use. |
| **Verify email** | Required before a run can be **shared** — not before one can be computed. Blocking computation on an inbox would turn a convenience into an obstacle, which is the same argument that keeps step 0 ungated. |
| **Accept invite** | The invited address pre-filled. Rate-limited resends. **One generic error for every rejection** — missing, expired, already accepted, wrong address — so the endpoint does not leak who has an account. This is the same reasoning as the existing 404-not-403 on runs. |

### 6.3 Permissions — two axes, and they are not the same axis

| Axis | Roles | Status |
|---|---|---|
| **Run** | `author` · `reviewer` (may sign G4) · `reader` | **Built.** `apps/api/src/access.ts`. |
| **Workspace** | `owner` · `admin` · `member` · `viewer` | **Not built.** Needs tenancy. |

The members table: avatar + name + email · role (inline select) · status (active / invited /
deactivated, visually distinct) · last active · row actions. Pending invitations in a **separate
section** with revoke, resend and copy-link. The role is assigned **in the invite**, not after
acceptance. A guardrail prevents removing the last owner. Every membership and role change is
written to the audit log.

### 6.4 The rule that governs the whole of §6.3

> **No roles screen ships before the server enforces the roles it displays.**

A polished members table over an API with no tenancy is a screen that claims a capability the
deployment does not have — which is the exact failure mode this product exists to refuse,
committed on the screen that describes who is allowed to do what. So the order is fixed:
organisations and membership in the data model and in `access.ts` first, with tests; the UI
after.

And three facts must be **on that screen**, not buried in a document — they are open question
Q25 and they are true today:

1. A licence number on `G4` is **recorded and never verified** against any registry.
2. **Nothing prevents an author signing their own `G4`.**
3. A guest's identity is **a random key held in one browser**. Whoever holds the key holds the
   runs; clearing the browser loses them.

The site already says the first and third on `/refusals`. The settings screen is where the
person who can act on them will read them.

### 6.5 Audit log

Append-only. Every gate signature, share, role change, invite, export and sign-in, with actor,
time and subject hash. It is not a feature — it is what makes the identity claims checkable, and
without it the roles UI is decoration.

---

## 7 · Peer products — what this category converges on

Twenty-two products were examined. Three facts first, because they change how we talk about this
product: **Delve is dead** (Sidewalk Labs folded it into Google Earth in 2022; the URL now
redirects into a Maps signup), **cove.tool is no longer software** (rebranded to consultancy in
January 2025), and **no UAE product reads affection plans at all** — the nearest thing to a local
competitor sells feasibility as a five-day human service at USD 7,000–9,000. `packages/intake`
is unoccupied ground.

### 7.1 The four-region shell, which is settled

Eight of the products converge on the same arrangement, under different names. This is not a
trend; it is the category's furniture.

| Region | What it holds | Called |
|---|---|---|
| **Top bar** | Project name, save state, share, export, and a **status chip** | TestFit's *Deal Status applicator* |
| **Left** | **Authoring** — a tree or layer list, and a contextual properties panel below it | Navigation Tree (TestFit) · Navigator (Forma) · Work Panel (Giraffe) |
| **Right** | **Reporting** — metrics, analysis, and the selected element's properties | Reporting Panel (Giraffe) · Analysis + Element properties (Forma) · Data Drawers (Finch) · metrics sidebar (Arcol) |
| **Bottom** | Tabular data | Data Output Panel (TestFit) · Data Table (Giraffe) |

And the object model is universally **Workspace → Project → Variant** (Forma: Proposal; TestFit:
Scheme; Giraffe: Scenario; Finch: Variant). Ours is **Plot → Run → Bands A/B/C**, which fits;
§6.1 names it once and the API and the UI use the same word.

**What this changes in §5.1 and §6.1.** Two different shells, not one. The **platform** gets the
sidebar in §5.1 — projects, library, settings. Inside a run, the **flow** gets the category's
three columns: steps on the left, canvas in the middle, inspector on the right. `App.tsx`
already has `layout--with-panel` for the inspector; the steps move from a horizontal strip to a
left rail, which is also what makes the back/next footer in §4.10 sit naturally.

**And one deliberate divergence.** Two products — Hypar's Actions panel and PLOTIQ's workflow
sidebar — put a *guided action list* in the canvas rather than a linear wizard, so a user can
leave step 5 and come back. That is better than a nine-step gate and it is what §4.10's
restorable URL plus a left rail amounts to. Steps 1–4 stay ordered because each shows something
that must be seen before the next is meaningful; steps 5–9 already are freely navigable.

### 7.2 The gap TOP.ai occupies, stated exactly

> **The two market leaders both draw a zoning constraint they do not enforce.**

- **Autodesk Forma**: its zoning *Constraint* volumes are documented as visual reference only —
  they *"will not be included in analysis or impact other geometries."*
- **TestFit**: *"Zoning input does not adjust the building when solving the site, this is solely
  a pass/fail rating."*

That sentence of TestFit's is the single best thing found in this research, and it is in a help
article — a one-line scope refusal placed exactly where a user would otherwise over-assume. **We
already do this and we do it on the landing page.** Keep doing it, and keep it where a buyer
looks rather than where a lawyer files it.

The counter-example is **Snaptrude**, whose AI intake flow is our step 0 with a different
conscience: drop an RFP PDF → a structured table of site, constraints and zoning **with
confidence levels the user reviews and approves or corrects** → generate the envelope. The
review-and-approve gate is exactly right and it is §4.1's extraction review screen, independently
arrived at. What sits above it is not: *"Generate instant, code-compliant design concepts"* and
*"Standards like ADA, IBC, BOMA and Neufert's are built in"*, with no caveat anywhere. That is
the sentence `REGULATORY VALIDITY: NOT ASSESSED` exists to make impossible.

### 7.3 What no peer does

1. **Provenance at the point of the number.** Not one of the twenty-two shows, next to a figure,
   which rule produced it, when that rule was current, or that the value was assumed. Deepblocks
   *claims* traceability in marketing (*"Every published figure can be traced back to the
   ordinance"*) and disclaims it in the terms (*"the Service does not interpret zoning laws"*),
   and the two sentences never appear on the same surface. There is no convention to borrow —
   which means we must teach the vocabulary on the page, and also that nobody holds the ground.
2. **An assumption register as a screen.** The concept exists in software-architecture
   literature and in no product in this category. Step 4 has no competitor — which makes §2.9's
   rewrite the highest-leverage copy work in this document, not the lowest.
3. **A refusal to optimise.** Four of the six generative products lead with ranking. The purest
   optimiser, Delve, is gone.
4. **A disclaimer on a primary surface.** Across all twenty-two: **zero instances.** The honest
   sentences exist — Archistar's clause 12.3, Deepblocks' ToS, TestFit's help article, PLOTIQ's
   README — and every one of them is somewhere a buyer will never look.
5. **Parking actually laid out on a Dubai plot with a reported m² per car.** TestFit is the only
   competitor that places bays and has no Dubai presence. ParkCAD optimises stall count and
   publishes no area-per-stall figure at all. Worth telling the client: **his own 37.5 m²/car
   target is loose** against the structured-parking benchmark of 27.9–32.5 m², and the right
   presentation is achieved-against-target, not a pass.

### 7.4 Five things to adopt

1. **A populated demo on first open, never an empty state.** Finch ships a sample project, Hypar
   offers *"I want to explore a sample project"*, PLOTIQ opens on a worked Business Bay tower.
   **Our worked example should *be* that project** — it is already verified against the engine by
   `pnpm example` on every build, which no competitor's demo is. This changes §6.1: `/app` opens
   on the worked example for an account with no runs, clearly labelled as ours and not theirs.
2. **Bidirectional binding between a metric and the geometry.** Hover a metric, the geometry
   lights (Arcol); click a table row, the building highlights (Modelur). Without it a sidebar of
   numbers reads as a report; with it, as an instrument. We have the harder half already — every
   figure knows its derivation — and not the easy half.
3. **Deficit as a signed quantity in the requirement's own unit.** Modelur reports *Parking
   Spaces Deficit* and *Green Area Deficit*, not a ratio. That independently corroborates our
   rule that a podium shortfall is reported in m², and it is the right shape for the three
   separate parking losses in §4.8.
4. **Arcol's "Unassigned Areas"** as a standing sidebar section — the honest cousin of NOT
   ASSESSED, and a good model for a permanent "what this run does not cover" panel.
5. **Zoneomics' Certified Zoning Letter tier** — a priced, human-signed product sitting beside
   honestly-labelled machine output. That is the commercial resolution of "never claim
   compliance", and it turns the `G4` reviewer grant from an unsolved identity problem into a
   revenue line. Worth raising with the client; out of scope for this plan.

### 7.5 Two things to avoid, both of which we nearly did

- **Colour-only pass/fail.** TestFit's green/red zoning rating and Modelur's red city block both
  fail WCAG 1.4.1 — and worse here, they steal the attention channel amber needs. Every state in
  this product already carries a non-colour cue; it stays that way in the dashboard.
- **"Coming Soon" tiles on a paid pricing page.** Deepblocks ships six of seven modules that way,
  beside a traceability claim. There is no pricing page in this repository and none is planned.

### 7.6 The local context, which changes two decisions

- **Amber means "warning" to a Dubai user.** The UAE Design System v3.0 sets **Camel Yellow
  `#F29F0E`** as the system warning colour, on `designsystem.gov.ae`, and a user trained on
  government portals will read our amber as a warning rather than as *assumed*. §13.1 is not
  wrong — but it can no longer rely on convention. **The amber must be taught in words on every
  screen that uses it**, which is §2.9's explainer, and the legend must be present rather than
  implied. This is a real finding and it is the strongest argument yet for the assumptions
  rewrite.
- **The language toggle convention is uniform**: a single header link reading **عربي**, a full
  page swap, no dropdown. Ours matches. And Dubai Municipality prints *"There is currently no
  translation available for this content"* rather than silently serving English — worth copying
  for any surface that is not yet translated, and exactly the house position on silent
  substitution.
- **The affection plan is a PDF delivered by email.** DLD's Property Map Request costs
  AED 100–250 plus AED 20, with a 12-minute SLA, and **there is no data screen** — a PDF is the
  product. The DDA GIS portal shows Plot Number, Community, Plot Area, Max GFA and Max Height and
  **no setbacks, no FAR, no coverage**. So the parser is not a temporary workaround waiting for
  an API; it is the only route to the data, and §10.1's corpus is the whole ballgame.
- **Issuance splits three ways** — DM for land plots, DLD for registered units and villas, DDA
  inside its zones — which is exactly why §4.1 needs a *format registry* rather than a better
  regex. Three authorities is three templates before any revision history.
- **One open-source Dubai peer exists**: `sdparq/DubaiResidentialPlotAnalysis`. Eight steps, a
  workflow sidebar with ticks, a live KPI bar where *each figure links to the step that drives
  it*, and a height notation of the form `2B+G+3P+35` — which is the level schedule in §2.7,
  written the way a Dubai architect writes it, and we should adopt that notation verbatim as the
  schedule's display form. Its intake **detects the parcel by the DLD highlight colours and
  calibrates the scale from the dimension labels** — a concrete technique for §4.1's geometry
  extraction, and cheaper than general vector parsing. It has no provenance, no invariants and no
  citation per value, and its disclaimer is in the README.

---

## 8 · Open source — what we will use and what we will not

| Use | Why |
|---|---|
| **`@ifc-lite/create`** (MPL-2.0, TS) or **`web-ifc`** (MPL-2.0, WASM) | The only credible Revit path. File-level copyleft: depend unmodified and we are fine. |
| **`svg2pdf.js`** + jsPDF (MIT) | Its stated limit is that it cannot convert arbitrary user SVG. Ours is machine-written from one display list — the case it names as supported. |
| **`dxf-parser`** (MIT) | Already the independent reader in `pnpm dxf`. Correct choice, keep it. |
| **`@flatten-js/core`** (MIT) — *as a reference, not a dependency* | The only mature JS library modelling a polygon as faces of segments **and arcs**, with a morphological offset that handles arcs natively. Study its structure for §4.2; do not adopt it, because it is float arithmetic with no exact predicates and its offset package has been unpublished for three years. |
| **Esri Parcel Drafter's interaction model** (documented, Apache-2.0 port at `brianmcleer/parcel-drafter-widget`) | The established UI for bearing/distance/curve entry with reported misclose. Copy the interaction, write the code. |
| **FreeCAD TechDraw's `freecad:editable` convention** | Makes a title-block field addressable rather than a substring. Adopt the convention. |
| **`ThatOpen/engine_components`** (MIT) — *API shape only* | The reference for section planes, level isolation and clickable elements. **Do not copy its pipeline:** it exports DXF from the renderer, which is precisely the defect `BuildingModel` exists to prevent. |

| Will not use | Why |
|---|---|
| **QCAD / LibreCAD** | GPL. Read them for how a dimension is modelled; do not link them. |
| **Clipper2 for arcs** | It has none — round joins are discretised against a tolerance. It stays for the integer kernel, which is what it is for. |
| **`jsts`** | OGC Simple Features has no curves in its polygon model. |
| **Any parking-layout library** | There is none. The GitHub `parking-lot` topic is booking systems and car detection; the two layout generators that exist have 1 and 2 stars between them, and neither handles a ramp. Hypar's `BuildingBlocks` ships Columns, Core, Egress, Envelope, Façade, Floors, Grids, Levels, Roof, Rooms, Site, Structure, Walls — **and no Parking function.** The commercial state of the art is closed. The client is right that parking is the product, and `packages/capacity/src/layout.ts` has no open-source competitor. |

---

## 9 · Phases

Weeks from 2026-09-29. **A** and **G1** can run in parallel; everything else is ordered.

| | Phase | Weeks | What lands | Answers |
|---|---|---|---|---|
| **A** | Comprehension and navigation | 1 | Step back/next footer, restorable URL, three-layer copy on all ten steps, assumptions rewrite, "what the sheet does not say" rewrite, **amber taught in words wherever it appears** (§7.6) | §2.2 §2.5 §2.9 |
| **G1** | App shell | 1.5 | Platform sidebar, the flow's left rail + canvas + inspector, route map, `/dashboard`→`/readiness` redirect, auth screens, profile/security/appearance, worked example as the first-open demo | the dashboard request, §7.1 §7.4 |
| **B** | The real plot | 2 | N-gon entry, traverse table with misclose, arcs stored exactly, editable canvas, road symbols, DXF/LandXML import | §2.3 §2.4 |
| **C** | Levels, core, circulation | 2.5 | Level schedule, core placed in the engine, aisle graph + reachability invariant, ramp connected, stripe-angle sweep, level picker by name | §2.7 §2.10 |
| **D** | The sheet's own limits | 1 | Sheet FAR/GFA/setbacks bind the run; saleable GFA as ratio **or** area; plot-limits table | §2.8 §2.9 |
| **F** | Drawings and exports | 2 | The thirteen-item sheet furniture, PDF, DXF `DIMS` layer, IFC4 | §2.11 |
| **E** | Intake | 2.5 | Format registry, multi-page, extraction review screen, geometry from the sheet, OCR fallback | §2.1 |
| **G2** | Tenancy and permissions | 2 | Organisations, membership, invites, members UI, audit log, the three disclosures | the dashboard request, Q25 |
| **H** | Design pass and imagery | 1 | Tokens delta, density, motion, the 25 images, a11y sweep, all eight gates green | the design request |

**Total: 14.5 weeks of sequenced work, ~12 with A and G1 overlapped.**

### What has landed, as of 29 Sep 2026

**H — the design pass, done in three rounds, and the first two were the wrong
work.** Recorded because the sequence is the lesson, not the diff.

*Round one* widened four screens that were using half the page: landing §02 and
§05, the antechamber (2,413px tall with 45% of the width empty, now 1,626px), and
the hero figure's floating control. Every measurement improved and the client's
verdict was *"التصميم كما هو"* — nothing changed. He was right: layout is not
look.

*Round two* reversed the three parts of `direction.md` that were **taste rather
than measurement** — square corners to 4/8/14px, `--weight-light` (300) on every
h1 and h2 to a new `--weight-display` (500), and the deleted shadows back as a
plate lift. The one part that was measured, the ink primary button, was left
alone and the trade was put to him with its number instead.

*Round three* is the colour, and it required a decision only he could make.
`pnpm amber` required amber to cover at least 3× the area of every other
chromatic pixel on the first screen, which at 36,270px² of amber left about
10,000px² for everything else — one button. He was given that number and the
objection that relaxing it is a concession on the strongest signal the product
sells to a funder, and he reaffirmed. The **area** margin is now measured,
printed and not gated; the two `fail(` calls are documented at the head of
`scripts/amber.mjs` so re-gating is a two-line change.

**What survived, and earned it.** `contrast.mjs` assertion (3) holds
`--uncertain-surface` as the most chromatic surface in the system, and it refused
the band's first draft at chroma 31 against amber's 29. That is a rule about
**saturation**, not area — which is the measure the area margin never was — so it
is the reason a coloured first screen is possible at all, and it stays enforced.
The band is 27. It is visible on `/parking`, where the whole screen is blue and
the `ASSUMED` card is still plainly the loudest thing on it.

**And the identity is the product's, not the landing page's.** The band was
painted on `.lp-hero` alone, so a reader following a link to `/parking` arrived
somewhere that looked like a different site. It moved to `.section--opening` in
the chassis and reaches ten routes from one rule. `--brand-wash` was added to
`GROUNDS` in `contrast.mjs` in the same change — a tenth measured ground, 483
rows across three themes — because a surface the site paints and the checker has
never read is the vacuous pass this repo refuses everywhere.

**Two defects the round surfaced.** The two dark palettes drifted (`--shadow-*`
landed in one block twice and the other not at all), and in dark the band was
`--blue-133`, which is also dark `--accent-subtle` — one colour carrying two
meanings, and `pnpm amber` correctly attributed the entire 1.3-million-px² band
to the accent ink.

**Deployment is key-based now.** `~/.ssh/tob_ed25519`, installed on the host as
`tob-deploy`. No password is stored anywhere and none is needed; the account
password is still live for hPanel and is due for rotation.

**I — §4.5 saleable GFA, done, and it reversed the divisor this document
intended.** The 28 Sep entry below argued for FAR × plot area. It is wrong on a
plot that prints no FAR — `DJAZ1MED12RES011` prints `G+11` and nothing else —
and it overstates efficiency wherever the envelope binds below FAR. The divisor
is the envelope's own GFA, `plate × levels`, which comes out of a solve that
never reads the efficiency and so is not the circularity that entry feared. The
argument in full is in §4.5; the entry below is left standing rather than edited,
because a plan that quietly rewrites its own reasoning teaches nobody anything.

**J — §2.6 parking-in-FAR, done, and a gate caught the plan.** The client's
answer of 28 Sep is recorded as a `PracticeStatement` — a third instrument type,
weaker than a developer standard and deliberately not a `RuleRecord` — served
from `/api/statements`, quoted verbatim on the rules step with the edge of the
claim beside it, and taken with one button rather than pre-selected. `pnpm smoke`
failed the pre-selection this plan asked for, correctly: a checked radio beside
an enabled Compute button is the default `FR-DEF-002` forbids, whatever is
written above it. The full argument is in §2.6.

**K — §4.4 the level schedule, done, and it found a shipped off-by-one.** The
structured schedule replaced two integers, and the first thing it exposed was
that `G+2P+8` is three levels on the podium footprint where the engine drew two.
The gate that should have caught that held the same wrong number. Two values —
the podium count and where the parking sits — stopped being assumptions, because
a schedule is a person answering a question two integers could not put. The full
argument is in §4.4.

**L — §4.7 the core, done, and the obvious implementation of it was wrong.**
Eng. Mohamed called the core *"الاهم"*, and the reading that suggests itself —
subtract it from the floor area — is wrong twice: a core is inside GFA, and it
is inside the saleable efficiency the run was already given. So it is sized,
placed by a rule, drawn on every level in every output, and **reconciled**
against the two inputs that already carry it, rather than deducted. Unstated it
is `ASSUMED` at 18% of the plate with a *measured* sensitivity of zero. The third
source this plan asked for — a developer standard — states no core figure
anywhere on file, so that branch was not written. The full argument is in §4.7.

**M — §4.3b boundary symbols, done.** Road hierarchy drove the vehicle-access
recommendation under B.7.2.1 and nothing drew it. Each classified boundary now
carries a band — one width table in `packages/sheets/src/edges.ts`, read by the
plot canvas, the sheets and the DXF alike — ranked by pen weight as well as by
ink, scaled together on a small plot so the ranking survives, and captioned in
both languages with the sentence that matters: it ranks, it does not measure.
An unclassified edge gets none. The full argument is in §4.3b.

**Still blocked on the client: the twenty-five images.** `apps/web/src/assets/img/`
holds only its README, so every slot renders nothing — by design, silently. The
prompts in `image-prompts.md` were **rewritten on 29 Sep** for the new identity:
the first version specified the austere flat-graphite house style he rejected.
The five hard rules are unchanged and are not negotiable.

### What had landed, as of 28 Sep 2026

**A — done.** Step footer, restorable `?step=`, the three-layer primer on all ten
steps, amber taught in words on the three steps that paint it.

**G1 — mostly done.** Platform sidebar, the flow's rail, auth screens, settings,
the worked example as the first-open demo, and `/dashboard` → `/readiness` as a
real 301 generated from the same `redirects.json` the router reads. **Not done:**
the `/app/*` route map, which is held back deliberately — most of its rows are
screens that do not exist, and §6.1's own rule is that a route enters
`routes.json` only when it is built.

**D §4.3 — done, and it was the highest-severity item here.** The plot's own
affection plan now binds the run it describes. `rulesFromInstrument` turns the
sheet's limits into `PLOT:`-jurisdiction `RuleRecord`s carrying its citation;
§11.5 step 1 gives them precedence and records the seed rule as superseded rather
than absent. The server parses the PDF — the browser sends the file, never the
numbers off it — and the plot-limits panel reports every limit that bound and
every limit that did not.

Three limits this closed that were being dropped in silence, not one: the sheet's
FAR, and then — found by reading the real Warsan sheet against the builder — its
stated GFA and its *tower* setback schedule, which the engine cannot express and
now says so instead of ignoring.

**D §4.5 — not done as of 28 Sep; done 29 Sep, on a different divisor. See
item I above before reading this.** Saleable GFA as an area rather than a ratio.
It carries a question this document does not settle and should: **which GFA the
entered area is divided by.** The efficiency is consumed before the bands are computed and it
feeds band C through the unit count, so dividing by the *governing* GFA is
circular. Dividing by the gross permitted GFA — FAR × plot area, the figure the
affection plan prints and the one a developer's brief is written against — is
well-defined and available early, and is the intended reading. It needs writing
down before it is built, because the two answers differ on any plot where parking
or geometry governs, and a reader would have no way to tell which they were shown.


**Phase E is last on purpose.** It is the largest single piece and it is the one gated on
material we do not have. Everything else can proceed while the affection-plan corpus is
gathered — and the extraction review screen (E) is what makes the parser's accuracy stop being
a blocker, so it wants the plot work (B) already finished underneath it.

**Every phase ends the same way:** `pnpm check` green, `pnpm smoke` green in both languages,
`pnpm amber` green, a local commit, a build with `--https`, an upload and an `activate.sh`. The
release is never built on the host.

---

## 10 · What we need from Eng. Mohamed — blocking

Ordered by how much each one unblocks.

1. **⛔ 10–20 real affection plans.** Different communities, different authorities, different
   years. Include two or three scans, and two or three that this version reads badly. Without
   them, §4.1 is guesswork. **This is the single most valuable thing he can send.**
2. **⛔ The reference website** he mentioned — *"هبعتلك ريفرنس لفكرة ويبسايت عاملها"* — for plot
   entry. We have designed §4.2 from the established survey-software pattern; if his reference
   does it differently, we want to see it before we build.
3. **⛔ Q27 — does a podium parking level count against the height allowance?** `G+2P+8` is
   ambiguous and the answer changes the tower count.
4. **Two or three of his own AutoCAD parking layouts**, for plots we also have sheets for. They
   are the only way to check the circulation work in §4.8 against what he would actually have
   drawn.
5. **Q20 — where does the unit mix come from** on a plot with no developer brief?
6. **Q25 — what is a tenant?** A firm? A project? It decides the shape of §6.3 and it is cheaper
   to answer than to migrate.
7. **Which community and which land-use slice** we are targeting first (Q1). Parking-in-FAR is
   answered for his practice; the rule store still needs to know which slice the answer is
   recorded against.

---

## 11 · What this plan refuses

Stated so it is not re-litigated mid-build.

- **The ramp-and-core optimiser** (meeting 02, 34:37). It is the largest thing he asked for and
  it is a `TRADEOFF` value that `PHASE_0_CLASSES` refuses by construction. A **deterministic**
  core placement that is stated and overridable is in scope (§4.7); a search for maximum yield
  is not. It is wanted, it is out of scope, and the refusal is the design.
- **A default for parking-in-FAR.** Pre-selected and sourced to him — yes. Defaulted — no
  (§2.6).
- **Any stat row, total, average, trend or score over runs.** `Work.tsx` argues it and the
  argument survives the redesign (§5.4).
- **A "Revit export".** IFC that Revit opens, labelled as such (§2.11).
- **A roles screen over an API that does not enforce roles** (§6.4).
- **Softening amber.** Not for the shell, not for the dashboard, not for the new imagery
  (§5.5).
- **Any claim of compliance, accuracy or approval.** No badges, no certifications, no accuracy
  figure — §22.2's variance study has not been run. The five-way claim statement stays on the
  landing page in §16.5's order and `REGULATORY VALIDITY: NOT ASSESSED` stays on every output,
  including the new PDF and the new IFC.

---

## 12 · Meeting agenda

He asked for a meeting three times. Seven items, ordered by how much the answer changes.

1. **The affection plan corpus** — what he has, in what formats, and how we get it (§10.1).
2. **Plot entry**, live, against his reference site: traverse rows, curves, misclose, and whether
   the compass-rule adjustment should be offered at all (§2.3).
3. **The level schedule and Q27** — basement, ground, podium, and what counts against height
   (§2.7).
4. **The core**: its area, where it comes from when nobody states it, and the hard edge between
   placing it and optimising it (§2.10b).
5. **The driveway**, with one of his own layouts on screen beside ours, so "مبيطلعش مظبوط"
   becomes a specific list (§2.10c).
6. **Parking-in-FAR** — recording his statement as a citable source, and which community and
   slice it is recorded against (§2.6, Q1).
7. **Who else gets a login**, and what a tenant is here (§6.3, Q25) — including the three things
   the licence field does not do.

**Two market notes to raise at the same meeting, not to build from:**

- **His 37.5 m²/car target is loose.** The structured-parking benchmark is 27.9–32.5 m² per
  stall (300–350 ft²), and the only competitor that places bays publishes no area-per-stall
  figure at all (§7.3.5). Reporting achieved-against-target rather than a pass is both more
  useful and more honest, and it is a number we can already produce.
- **The commercial resolution of "never claim compliance" exists in this market.** Zoneomics
  sells a human-signed *Certified Zoning Letter* beside honestly-labelled machine output
  (§7.4.5). That is what the `G4` reviewer grant could become. Out of scope here; worth him
  hearing.

---

## 13 · How this connects to what already exists

- `docs/05-design/direction.md` — **awaiting his approval** since Phase 1. §5 extends it; it does
  not replace it, and it should be approved before Phase H.
- `docs/03-analysis/open-questions.md` — Q2, Q23 and Q9 close on this reply (§3). Q1, Q20, Q25,
  Q27 stay open and are in §10.
- `docs/03-analysis/meeting-02-2026-08-30.md` — the parking-first priority holds and is
  reinforced: *"محتاج تطوير كتير علشان يبدا يظهر مرحله بس ال دور الارضي و الباركينج"*.
- `docs/04-delivery/user-guide/` — the guide is built from a real run by
  `scripts/guide/capture.mjs`. **Every phase that changes a screen invalidates the guide**, so
  the capture re-runs at the end of each phase and the PDF is rebuilt. That is one command and
  it is part of the phase, not a separate task.
- **Phase 7 leftovers** fold into Phase A: autosave for step 3 and resuming the engine position
  (§4.10), `DRAFT_LABELS`, and end-to-end accounts on production MySQL.
- **Housekeeping still owed:** delete `scratchpad/.secrets` when deployments stop; rotate the
  MySQL and SSH passwords; state the scope change in writing (phase-0-scope §17).
