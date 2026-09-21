# ENVELOPE — site architecture

**Status:** authoritative. Build from this document. Where it contradicts any of the three
source proposals, this document wins; the contradictions are deliberate and each one is
argued at the point it occurs.

**Scope:** the public site plus the two existing application routes. It does not change the
engine except where a page would otherwise print a number the engine does not emit — and
where that happens, the change is to the engine or to the verifier, never to the page.

---

## 1. The argument

A visitor arrives with one question — *is this real, or is it a deck* — and roughly ninety
seconds in which to answer it. So `/` carries the whole argument at a hard word budget, and
every other public page exists for the second visit: the moment the link is forwarded to an
analyst, an architect, or a lawyer. That is the only reason this becomes a multi-page site.
The fold carries one engine-produced figure that decomposes into the engine's own formula
string, and directly beneath it, at equal weight, the sentence the product refuses to say.
A reader who reads nothing else has seen a traced number and the boundary of the claim in
the same eyeful. Below that, the refusals are not a caveat block: they occupy a nav slot, a
permalink, and more of the site than the feature surface — and they are written as things
the software *does* (a 422, a 409, a run that is never persisted), because behaviour reads
as engineering and prose reads as apology.

**Deliberately left out, and why.** No pricing, no plans, no "contact us for pricing" — no
price exists anywhere in this repository and the one negotiated figure that does exist does
not generalise. No testimonials, no logo wall, no customer count, no case study — there are
no customers, and every real plot in the corpus belongs to the client or to a named
developer, so the material to build one is confidential rather than merely absent. No
competitor comparison — the only competitor material we hold is a machine transcript of a
private call. No accuracy figure, no time-saved figure, no "N% faster" — PRD §22.2's
inter-architect variance study has not been run. No security or trust page with badges —
accounts and per-run access are recent and nothing has audited them — no security review,
no penetration test, no certification — so every badge would be false. No uptime page — nothing monitors availability, and `/dashboard` must never be
renamed in a way that implies it does. No team or about page and no terms or privacy policy
— there is no legal entity, and drafting a legal instrument in-house is not a design task.
No blog, no newsletter, no integrations page. Not one of these is declined for taste.
`/refusals` §12 says so on the record, which turns a short site into a stated position
rather than an unfinished one.

**Three things every proposal got wrong, corrected here.** First, the parking claim inverts
the engine: `packages/capacity/src/pipeline.ts` runs `computeBands` (line 367) *before*
`planParkingLevel` (line 453), and Band C rests on `parking.provided_bays`, which is
`floor(available area ÷ 32 m²/bay)` at `parking.ts:306` with that 32 `ASSUMED`. The
governing number **is** an area divided by a factor. No page may say otherwise; §4.2 below
rewrites the claim into one that is true and, as it happens, stronger. Second,
`verified.totalBays` (265) is *demand* at the probe scheme, not supply — the engine says so
itself in the note on `parking.demand_at_governing_capacity` — so it may never appear under
placement copy. Third, every seed rule carries `instrumentId:
'PLACEHOLDER-NOT-A-REAL-INSTRUMENT'`, `sourcePage: 0` and clause text prefixed
`[NOT SOURCED]`, so the current headline "which line in the code says so" promises a
citation that does not exist in this deployment. The h1 changes.

---

## 2. Route table

Only routes that are **built** enter the `ROUTES` tuple. A route in the union that renders
nothing is a dead link in the footer sitemap and a lie in the `/404` page's own site list,
so `later` routes are absent from the tuple until the day they land.

| Route | Page title (`<title>`) | Access | Priority | Prohibitions test |
|---|---|---|---|---|
| `/` | ENVELOPE — development capacity | public | must | `apps/web/test/landing.test.tsx` |
| `/parking` | Parking — ENVELOPE | public | must | `apps/web/test/parking-page.test.tsx` |
| `/refusals` | What it refuses — ENVELOPE | public | must | `apps/web/test/refusals.test.tsx` |
| `/dashboard` | Deployment readiness — ENVELOPE | public read; live when signed in | must | `apps/web/test/dashboard.test.tsx` |
| `/app` | The engine — ENVELOPE | name prompt | must | `apps/web/test/antechamber.test.tsx` |
| *(unmatched)* | That page is not here — ENVELOPE | public | must | `apps/web/test/not-found.test.tsx` |
| `/worked-example` | One run, printed in full — ENVELOPE | public | should | `apps/web/test/worked-example-page.test.tsx` |
| `/method` | Method — ENVELOPE | public | should | `apps/web/test/method.test.tsx` |
| `/rules` | The rule library — ENVELOPE | public | should | `apps/web/test/rules-page.test.tsx` |
| `/inputs` | What it needs from you — ENVELOPE | public | should | `apps/web/test/inputs.test.tsx` |
| `/exports` | What comes out — ENVELOPE | public | should | `apps/web/test/exports.test.tsx` |
| `/glossary` | Terms — ENVELOPE | public | later | `apps/web/test/glossary.test.tsx` |
| `/security` | What this deployment does not protect | public | later — **blocked**, §9 Q1 | `apps/web/test/security.test.tsx` |
| `/contact` | Contact — ENVELOPE | public | later — **blocked**, §9 Q3 | `apps/web/test/contact.test.tsx` |
| `/api` | API — ENVELOPE | public | later — **blocked**, no OpenAPI document exists | `apps/web/test/api-page.test.tsx` |
| `/changelog` | Change record — ENVELOPE | public | later — **blocked**, the repository has no commit history | `apps/web/test/changelog.test.tsx` |

Every prohibitions test imports the shared module described in §6.4. A page that has no test
does not ship; a page whose colours are not in `scripts/contrast.mjs` `PAIRS` does not ship;
a page not visited by `scripts/smoke.mjs` at 320 px and 390 px does not ship. Those three are
one gate, not three chores — an unmeasured surface counts as a failure here, not as a skip.

**And the table above does not enforce that.** A hand-listed column of filenames is the same
shape of defect this document diagnoses in `smoke.mjs` and `shoot.mjs` one section below: it
drifts the first time a route lands without one. So the rule is mechanised in three places,
all reading `apps/web/src/routes.json` (§5):

- `apps/web/test/route-coverage.test.ts` enumerates the route table and fails when a route has
  no `apps/web/test/<slug>.test.tsx`, when that file does not import `prohibitions.ts`, and
  when a route is absent from `PAGES`. This is why `/dashboard` gets its own test file: while
  its assertions lived inside `landing.test.tsx`'s `describe('the status dashboard')` the rule
  could not be mechanised at all, because one route's coverage was invisibly supplied by
  another route's filename. Move the block, do not copy it.
- `scripts/smoke.mjs` derives its walk from the same file, so a route cannot exist and go
  unvisited.
- `scripts/contrast.mjs` fails on any token painted in the stylesheets that no pair measures
  (§6.3). That is a weaker guarantee than per-route colour coverage and is described honestly
  as such where it is specified.

### 2.1 Prerequisites, in order

These land **before** the first new page, not alongside it. Each one is a defect that
multiplies once there are ten routes instead of three.

1. **`NOT_FOUND` in the router** (§5). Today an unknown path renders `/` under the wrong
   URL. Adding seven routes without this multiplies one silent substitution, on a product
   whose proposition is that nothing is silently substituted.
2. **`apps/web/src/routes.json` and `PAGES`** (§5). One record drives dispatch, the header
   nav, the footer sitemap, `document.title`, the `/404` site list, `scripts/smoke.mjs` and
   `scripts/shoot.mjs`. `smoke.mjs` and `shoot.mjs` hardcode their paths today; at ten routes
   that is three hand-maintained lists that will drift apart.
   **The split matters and the first draft of this section got it wrong.** Both scripts are
   plain `.mjs` run by `node`; `pages.tsx` holds JSX and imports every screen component, so
   neither script can import it and nothing would have changed. So the *data* — path, title,
   description, nav label, footer label, group, `needsActor` — lives in `routes.json`, which
   Vite imports natively and `node` reads with `readFileSync`. `pages.tsx` imports the same
   file and adds the one thing JSON cannot hold, the component. No loader, no build step, no
   dependency.
3. **`apps/web/test/prohibitions.ts`** (§6.4), with the one real regex defect fixed. Note the
   correction: all three proposals claimed the scans run against raw HTML. They do not —
   `landing.test.tsx:121` and `:152` both already do `landing().replace(/<[^>]*>/g, ' ')`. The
   single genuine defect is that `/\bcertified\b/i` is banned outright, which would fail the
   honest sentence *"no output of this engine is certified by any authority"*. It gets the
   same negation window `compliance check` already has.
4. **`SiteChrome` and one `DISCLAIMER` constant.** `Header` is typed `actor: Actor`, so no
   signed-out page can use the app chrome; `useTheme()` has three instances that already
   desynchronise; the permanent sentence is hand-copied at `Root.tsx:92`, `App.tsx:386` and
   `Landing.tsx:737` with nothing binding them. Lift the theme to `Root` alone, widen
   `Header` to `Actor | null`, extract the skip link, header and footer, and export the
   sentence once. A test asserts every route in `PAGES` emits it.
5. **The verifier extension** (§6.2). Three pages print nothing until it lands.
6. **Three source deletions, and one recolour.** `.stat--ok` in `landing.css:900` — the
   styling for a green readiness tile is one `className` away from shipping and is caught only
   by a string assertion; delete the rule, and delete `'ok'` from `Stat`'s `state` union
   (`Dashboard.tsx:382`) so the class cannot be reached at all. And the `gated` flag in
   `App.tsx`'s `STEPS` table, which is unused metadata that has drifted from the `reachable`
   computation that actually gates.
   **The recolour is `.stat--partial` (`landing.css:899`), and the first draft of this document
   missed it.** It is `border-left-color: var(--uncertain); background: var(--uncertain-surface)`
   and it is emitted by `Dashboard.tsx:386` for the invariants tile, which is hardcoded
   `state="partial"`. Making `/dashboard` public therefore ships amber as a *readiness status*
   on the site's most-forwarded page of numbers — the one thing R6 forbids, on the page the
   R6 audit did not read. The tile does not mean "assumed"; it means the rest of the checks had
   nothing to read, which is not-assessed. So it takes the deferred pair — `--deferred` and
   `--deferred-surface` — and the state is renamed `dormant`, because a class called `partial`
   invites the next amber. Both new pairs go into `PAIRS` (§6.3).
7. **Two content defects fixed at source, not on the page.** `PLOT_W`/`PLOT_D` and the
   literals `'COLLECTOR ROAD'`/`'LOCAL ROAD'` (`Landing.tsx:131-132, 199, 202`) must read
   from `input.plot.vertices` and `input.plot.edges[].roadHierarchy`. And `Landing.tsx:415`
   performs float subtraction in the view layer to publish the coverage margin — the one
   figure on the site that cannot answer where it came from. The engine emits
   `envelope.coverageHeadroomM2` with a derivation, or the sentence goes.
8. **The confidential basis string — already closed, and kept here as the standing rule.**
   `input.run.saleableEfficiency.basis` read *"the conservative end of the 93-97%
   saleable-to-GFA range in the developer brief"* when this document was drafted: a named third
   party's confidential commercial range, with attribution, sitting in a fixture that several
   pages will render verbatim. It now reads *"the conservative end of the saleable-to-GFA range
   in the project brief on file"* — the figure and the attribution are both gone, and nothing
   further is required. **Do not re-edit it.** The rule it leaves behind is the point: a basis
   string is engine-authored prose that reaches the public site verbatim, so every basis on the
   recorded input is copy under §8, and the fix is always at source and never a truncation on
   the page — an assumption without a basis is not an assumption.
   That this prerequisite was stale within a day of being written is itself the argument for
   §6.1's table being generated rather than transcribed.

---

## 3. Global rules that govern every page

These are enforceable in copy review. They are here rather than repeated on every page.

**R1 — A refusal is a verb the software performs, never an absence it regrets.** Not *"it
does not yet decide the parking-in-FAR question"* but *"it returns 422 and refuses to compute
until you declare it."*

The banned set splits in two, because the first draft's single list was not implementable.
*Unfortunately, limitation, we hope to, just, simply, please note* have no honest reading on
this site and are asserted over the rendered markup of every page. *Not yet* and *currently*
are different: §16.5's own claim status is the string **NOT YET MEASURED**, and
`packages/validation/src/claims.ts:326-331` — which §6.1 renders verbatim, and which is on the
page today at `Landing.tsx:590, 596, 608` — says the variance band is set by *"architects who
have not yet been engaged"*. A regex over rendered markup would
fail the engine's own honest claim statement, and the escape the first draft wrote for it
(*"except in a sentence that names the human who closes the gap"*) is not expressible as a
pattern: no regex detects a named human. So *not yet* and *currently* are banned in the site's
**hand-written** copy and asserted over the source of the content module (§6.1), where the file
is the unit of assertion and the exception disappears. Engine-authored strings — claim
statements, `blocking`, `levelPlanRefusal`, basis strings — are exempt by construction, because
they are not hand-written and cannot be edited on the page.

R2 already requires every gap to name its owner in its own sentence. A sentence that does that
does not need the words *not yet*.

**R2 — Every gap names its owner.** A gap with an owner is a plan; a gap without one is an
excuse. Zero approved rules → a licensed Dubai architect authors and approves each one
against the actual instrument. Unsigned annex → the definitions annex is signed. No agreement
figure → §22.2's variance study needs contracted architects. Eight dormant invariants → they
need a unit and per-level schedule Phase 0 does not generate, and synthesising one would be
verifying the engine against its own output. **No dates.** An owner is a plan; a date is a
promise, and this product does not make those.

**R3 — Refusal pages use the feature-page chassis.** Same `.lp-section` grid, same index
numerals, same type scale, same cards. `/refusals` is longer than `/parking` and must not
look like an errata sheet — length reads as thoroughness only when the layout treats it as
content.

**R4 — Precision is the luxury signal; decoration is not.** The polish budget is spent on
typography, measure, whitespace and drawing quality. `6,774.194 m²` in Plex Mono with tabular
numerals, set inside a Plex Sans sentence, with a visible derivation under it, is a more
expensive-looking object than any gradient. No glass, no gradients on brand surfaces, no
animated counters — a number that counts up is a number pretending to be computed.

**R5 — Every page ends on a limit, never on a CTA.** The last block of every page is what
that page did not prove.

**R6 — Amber means `ASSUMED` and nothing else.** Four rulings, made here so nothing copies an
unresolved one, and so that the audit covers every rule that paints `--uncertain*` rather than
only the ones on `/`.

1. `.lp-verdict`'s `border-left: 2px solid var(--uncertain)` (`landing.css:518`) marks a
   governing-band statement about `DERIVED` figures — that is emphasis, not uncertainty.
   **It moves to `--border-strong` now**, before the stylesheet grows and every new verdict
   paragraph inherits a decorative amber.
2. `.lp-claim--partial` (`landing.css:648`) stays. A partially-quantified claim is genuinely an
   uncertainty statement about that claim's support.
3. `.lp-status--partial` (`landing.css:633`, `--uncertain-strong`) **stays, and this is a
   ruling rather than an oversight.** It is not a second question: it is the status chip inside
   the very `.lp-claim--partial` row ruled on above — `Landing.tsx:616-620` emits both class
   names from the same `c.m` — so the chip and the rule it sits on must carry the same colour or
   the row would say two things. The ruling is inherited, not new.
4. `.stat--partial` (`landing.css:899`) **moves off amber**, and the first draft of this
   document missed it. See §2.1 prerequisite 6: it is a *readiness state*, not an assumed value,
   and this plan makes the page that renders it public.

The converse obligation is equally real — `/` currently argues in a card titled *"Assumptions
are declared, ranked and amber"* and shows no amber anywhere, while `bayAreaFactorClass:
"ASSUMED"` sits unread in the fixture. `landing.test.tsx` gains a **presence** assertion: the
`ASSUMED` treatment must be rendered on `/`, not merely permitted. A prohibitions test is blind
to a design pass that tones amber down, and a design review that tones it down has failed.

The audit itself is the durable part, and its scope is stated rather than implied. The four
rulings above are **every** rule in `landing.css` that reads `--uncertain*` — lines 518, 633,
648 and 899, and no others. That file is the whole public chassis R3 tells the eight new pages
to reuse, so nothing they inherit is unruled. `provenance.css` is amber by definition: it *is*
the `ASSUMED` treatment. `app.css` is the engine's own stylesheet and paints `--uncertain*` in
fourteen further places behind `/app`; several of them (`.banner--blocked`, `.callout--warn`,
`.gate-status--pending`) are the same question asked about a different surface, and auditing
them is real work this document has not done and does not claim to have done. A new
`--uncertain*` rule in `landing.css` needs a ruling in this section before it is written.

**R7 — Status vocabulary, never hedging vocabulary.** *Not assessed* is a status with a
defined meaning inside a four-shape glyph system that survives greyscale. *Dormant is not a
pass.* *Never claimed* — a status, not a deferral, and never softened into a schedule. Flat
declaratives, sentence case, no intensifiers.

*(The first draft of this rule illustrated itself with the strings it was banning, which made
R7 fail R1. The illustration is gone; the §16.5 claim statement still carries the negated forms
verbatim, and R1 exempts it explicitly because it is engine-authored.)*

**R8 — No count, ratio or dimension is typed into rendered copy anywhere on the public site.**
This is NN#3 read at its full width rather than only over `worked-example.json` values. It
bans, specifically: *"Eighteen conservation checks. Ten of them ran."* as an h1; *"Nine steps,
five of which can refuse you"* over a list of ten rows; *"Twelve refusals"*; *"18 invariants"*;
*"13 rules"*; *"15 m junction clearance"*; *"5.5 + 6.0 + 5.5 = 17.0 m"*; and **the 15–35%
parking-in-FAR swing**. Every one of those either interpolates from a generated fixture at
render time or does not appear. The swing in particular is deleted as a figure and replaced by
something better: `/parking` shows the actual spread for the actual worked plot, from
`POST /api/runs/parking-in-far-comparison`, which is engine output under `pnpm example`. A
cited specification range was the weakest number available; a measured spread on a real run is
the strongest.

**Scope, stated in three parts — because the first draft of this document broke R8 in eleven of
its own specified headings.** *"Three capacities, never averaged"*, *"Four things hold the
answer up"*, *"A number is made in four moves"*, *"Six gates, and what each catches"*, *"The
three that block"*, *"The one declaration with no default"*, *"Three capacities"*, *"The three
you probably wanted"*, *"DXF R12 — the drawing"*, *"Two formats that are not built"* and
*"Four files…"* were all prescribed as page copy by a document that bans them, and two of them
ship on `/` today (`Landing.tsx:429, 468`). Every one is rewritten at the point it occurs. None
is granted an exception: a count in a heading is exactly where a reader stops reading, and
*"Four things hold the answer up"* over five cards is the defect in miniature.

1. **This document's own prose is not rendered copy.** A section brief that says *"three rows"*
   or *"the four artefacts"* is an instruction to whoever builds the page. R8 governs what a
   visitor reads.
2. **Absolutely banned, everywhere in rendered copy:** any figure about the plot, the engine's
   output, the rules, the code corpus or the deployment. These interpolate from a generated
   fixture or they do not appear. That is NN#3 and it has no exception.
3. **Absolutely banned in an `<h1>`–`<h3>`:** any count, in digits or in words. This is the half
   `prohibitions.ts` can enforce, and it is enforced bluntly precisely because a regex cannot
   tell an honest structural count from a marketing one and should not be asked to. It is also
   why identifiers move out of headings: `DXF R12`, `B.7.2.4 Table B.11`, `422`, `409`, `G1`–`G4`
   and `ANNEX 0.1.0-UNSIGNED` are names rather than measurements (§6.1 already draws that line
   for status codes), and they read perfectly well in the first sentence under a heading that
   does not contain them.
4. **Permitted in body prose, and listed:** a count of something the reader can verify on the
   same page, or one the type system fixes — *four gates* is true because `Gate` has four
   members and adding a fifth is a compile-time event. This is the carve-out, it is narrow, and
   it is not mechanised: no test can distinguish it, so every instance is a copy-review item and
   the register of them is this list. One instance is claimed today — *"four gates exist, two of
   them stand in front of export"* on `/exports` §6, where `Gate` fixes both numbers and naming
   them is the whole content of the correction. Another needs an argument added here before it
   is written. Everywhere else the count is interpolated, or the sentence is rewritten not to
   need one, which was possible in every case tried.

**R9 — Wherever a `ruleId` is rendered, the record's approval status is rendered in the same
eyeful.** A rule id set beside a metric figure reads as a regulation. Today the only mention
of placeholder citations sits six sections below the drawing that prints
`R-SETBACK-ROAD-RES` next to `4.500 m`. A `DRAFT · not sourced` chip goes beside every one.

**R10 — No page may assert which band governs in static prose, a heading, a nav label or a
route name.** `pnpm example` diffs values, not the claims wrapped around them, so a rule edit
that made Band A bind would leave a site full of "parking governs" headings false with every
gate green. Band-governance sentences are templated from `verified.governingBand` and
`verified.nextBindingBand`, and `parking-page.test.tsx` asserts that the rendered governance
string matches the fixture rather than a literal.

**R11 — No page asserts a control the software does not perform.** This is the softest and most
damaging form of the compliance claim, and the first draft of this document made it four times
on three pages. *"None available until two people have put their names to it"*, *"G4 requires a
reviewer who is deliberately not the author"*, *"every export names a reviewer who is
deliberately not the author"* and *"the reviewer gate requires a person who is not the author"*
all describe a separation-of-duties control. `canReview` (`apps/api/src/identity.ts:88-90`) is
`typeof actor.licence === 'string' && actor.licence.length > 0`. It is the only check the G4
handler makes (`server.ts:878`). It never compares the actor to `run.createdByActorId` and it
never verifies the licence, so one person holding any non-empty licence string can author a run
and sign it. CLAUDE.md already discloses that *"any identified actor can read, gate and export
any run"*.

An asserted control is worse than a missing one, because a missing control is visible. So: every
sentence about a gate states what the handler does — records an assertion — and, where a reader
would otherwise infer a separation that is not there, says the separation is not enforced. The
material is not a weakness on `/refusals`; it is the strongest single item on it, and §4.3 §7
now carries it.

Two more of the same class were found and corrected in place: *"an export before gates G1–G4
returns 409"* (§4.3 §2, §4.11 §6) — `EXPORT_GATES` (`gates.ts:117-118`) is `[G3, G4]`, the
export handler's own docblock says so (`server.ts:903`), and it computes G1 and G2 hashes that
`requireExportGates` then never reads; and *"R12 is the version everything reads"* (§4.11 §2), an
unverifiable universal claim about third-party software, forbidden five items later by §4.11 §7's
own *"'works with AutoCAD' would be a claim about a tool, and it is not made"*.

Note for whoever writes `/refusals` and `/exports`: `README.md:167-170` — which §6.1 names as
the source for the refusal contract — also says *"an export before gates G1–G4 is 409"*. The
README is wrong in the same way. Take the status codes from it; take the gate list from
`gates.ts`.

**R12 — Reveals animate `transform` only, on every page, and a gate looks.** `landing.css:802-820`
carries the record: the first version faded from `opacity: 0`, and a scroll-driven animation
holds its start state for anything that has never entered a viewport, so three whole sections
were blank in a full-page screenshot and would have been blank on paper. R3 sends eight new
pages to copy that chassis, which is eight new ways to reintroduce it. Two mechanisms, because
a comment is not a gate: `scripts/shoot.mjs` photographs every route in `routes.json` full-page
rather than `/` and `/app` only; and `smoke.mjs` asserts, on every route, that no element
carrying a reveal class computes to `opacity` below 1. R4's ban on animated counters and
gradients stands and is a different rule.

**R13 — Every page states its behaviour below 46 rem, and wide content scrolls inside its own
container.** `noSidewaysScroll` in `smoke.mjs` measures `documentElement.scrollWidth` and
exempts anything inside an `overflow-x` scroller, so this is enforced rather than reviewed. Four
of the new surfaces need it named explicitly and each does so in its own section: `/rules`'s
row table, `/worked-example`'s vertex and edge lists, `/parking`'s placed-level drawing and
`/parking`'s two-column comparison. A scroll container that is keyboard-reachable is
`role="region"` with an `aria-label` and `tabindex="0"`, because 2.1.1 applies to a scroller the
same way it applies to a control.

---

## 4. The pages

### 4.1 `/` — the home page

**Purpose:** give a non-technical reader, in ninety seconds and without a click, what the
engine does, one number they watch decompose into the engine's own formula, and the sentence
this product will never say.

**Budget.** The first draft set one — *"~250 words of body prose above the readiness band
(today: 1,294 across the whole page)"* — which compares a section against a whole page, so
nothing could be said to have met it, and no gate counts words anyway. It is stated as what it
actually is: a copy-review instruction, not a measurement. The fold, §02 and §03 together must
be readable in the ninety seconds §1 allows. The cut comes from §02's four cards and from the
hero's second lede — **not** from the five limit items, which stay here in full. Moving those to
another route would leave `landing.test.tsx`'s five lowercase substring assertions gripping the
page by coincidence, which is the wrong reason for the strongest gate in the codebase to keep
working.

| # | Section | Content | Figures — exact source |
|---|---|---|---|
| 1 | Skip link + shell header | `.lp-skip` → `#main`. `SiteChrome`: Mark (on `--accent`, never amber), brand, strapline, five nav links, theme toggle, one CTA. | none |
| 2 | **The fold** | Eyebrow *"Phase 0 · engine demonstration"*. h1: **"What these rules imply for this plot, and the derivation of every figure that says so."** *(The first draft's h1 was "What **can be built** on this plot…", which is a permission claim: it says the scheme is buildable, in the largest text on the site, with NOT ASSESSED underneath as the mitigation. The engine's own thesis — quoted two rows below and again at §4.8 §2 — is that it "reports what its encoded rules imply". The h1 now says that, and the second clause is unchanged because the derivation is the actual offer.)* One lede, ~28 words, the generate-vs-check thesis from `README.md:15-22`. Then the site's single most important element: the governing capacity as a large mono figure rendered as the existing `BandRow` disclosure — a real `<button>` with `aria-expanded`/`aria-controls`, accessibly named `why 6,774.194 m²?` (today the `why?` span is `aria-hidden`, leaving the control named by a bare number). Expanding discloses `formulas.bandC` and `formulas.governingGfa`, and inside that panel the bay-area factor in the amber `ASSUMED` treatment with its class announced as text. Beneath, at equal weight and never smaller: the crossed-square glyph and `REGULATORY VALIDITY — NOT ASSESSED`, with one line — no rule in this deployment is approved. CTAs: *Run this plot yourself* → `/app?demo=worked-example`, *What it refuses* → `/refusals`. **The href is `?demo=`, not `?step=intake`.** A step hint only *selects* a step; a CTA reading *run this plot yourself* that landed a visitor on an empty intake form would promise the worked plot and deliver a blank one, which is the same class of defect as a figure the engine did not produce. `?demo=worked-example` loads the recorded input — the button §4.5 §4 specifies, reached by URL. Right column: `PlotPlan` and its five-row spec list. | `verified.governingGfaM2`, `.governingBand`, `.formulas.bandC`, `.formulas.governingGfa`, `.bayAreaFactorM2` + `.bayAreaFactorClass`; drawing from `.podiumOutline`, `.towerOutline`, `.setbacksM[].setbackM`, `.footprintM2`, `.towerPlateCapM2`, `.levels`; and — after prerequisite 7 — `input.plot.vertices` for the outer rectangle and `input.plot.edges[].roadHierarchy` for the edge labels |
| 3 | **Capacities are reported separately, never averaged** | *(Renamed under R8: the shipped heading is "Three capacities, never averaged" — `Landing.tsx:429` — and a typed count in an h2 is the exact thing R8 bans. Nothing is lost: the reader can see how many bands there are.)* Three `BandRow`s, each expandable to the engine's own formula. The binding one carries the word *binds*, a 3× heavier left rule and a larger figure, so colour carries none of the meaning alone; the tag is computed by comparison against `governingGfaM2`, never hardcoded. Verdict line, templated per R10: *"On this run, {governingBand} binds. The {nextBindingBand} ceiling sits {headroomToNextM2} m² above the answer."* Lede cut from 66 words to ~30. | `verified.bandAM2`, `.bandBM2`, `.bandCM2`, `.governingGfaM2`, `.governingBand`, `.nextBindingBand`, `.headroomToNextM2`, `.formulas.bandA/.bandB/.bandC` |
| 4 | **How the parking number is actually made** | Four sentences and a link; the full argument is §4.2. Band C is the smaller of what floor area permits and what the parking supply can serve. That supply is computed as an available area divided by an area-per-bay factor, **and the factor is assumed** — it is the amber figure in the fold. The engine then lays that level out as bays, aisles and a ramp inside the podium outline, and reports what the drawing costs against what the factor predicted. Link → `/parking`. **Degradation clause, written into the page brief and not into a risk register: until the verifier writes `verified.levelPlan`, this section renders no rectangle and no bay count — the amber factor and the link only.** A hand-drawn parking diagram on this site would be the exact defect the product exists to prevent, committed on the page that sells the prevention. | `verified.bayAreaFactorM2` + `.bayAreaFactorClass` (amber); after the extension, `verified.levelPlan.bayCount`, `.areaPerBayM2`, `.rects[]`, `.packingRect.coveragePct`. **Never `verified.totalBays`** — that is demand. |
| 5 | What holds the answer up | *(Renamed under R8; shipped heading is "Four things hold the answer up", `Landing.tsx:468`. It was also the more brittle of the two — a fifth card would have made the heading false.)* The largest and least-designed section today: four undifferentiated boxes. Recut to four one-sentence claims, each paired with a ≤3-element inline SVG and a link into `/method` — rules that generate rather than judge (an inward offset arrow); exact arithmetic on a declared integer grid (two edges resolving to one vertex); every value carries its derivation and a filled gap is amber (the existing zero-prop `ProvenanceLegend`, rendered verbatim); an independent layer that blocks emission rather than warning (a barred arrow). Under 80 words total. | none printed; diagrams are schematic and carry no dimension |
| 6 | Exactly what we claim | The five-way claim statement in §16.5 order, verbatim, with the four glyph shapes — filled disc, half disc, hollow ring, crossed square — so it survives greyscale and CVD. `.lp-claim--never` stays the loudest element on the page. Ends: *what each status would take to change* → `/refusals`. | none |
| 7 | What it does not do | All five items **with their paragraphs**, unchanged; the five substrings are load-bearing. §04's lede stops claiming to be *"longer than the feature list"* — it is longer by item count (5 vs 4) and shorter by word count (232 vs 251), and a self-description the page does not satisfy is a small dishonesty on the page that sells honesty. It becomes *"More of them than there are features, and deliberately so."* Then: *there are more, and three the software performs at runtime* → `/refusals`, with no count in the sentence (R8). | none |
| 8 | Readiness band | The page's one colour inversion, spent on the not-approved paragraph. Both CTAs now resolve: *See the readiness numbers* → `/dashboard` (public), *Open the engine anyway* → `/app`. | counts live on `/dashboard`; this band states the condition in words |
| 9 | Site footer | `SiteFooter`: four-column sitemap generated from `PAGES`, *What it does not claim* first; the permanent sentence from the one `DISCLAIMER` constant; engine and annex versions. | `SNAPSHOT.engineVersion`, `SNAPSHOT.readiness.annexVersion` |

**Empty and error states.** `worked-example.json` is a build-time import — if it is missing
the build fails, which is correct: a landing page that renders without its figures is a
landing page with typed figures waiting to happen. If `readiness.json` is absent, section 8
renders its paragraph and drops the CTA rather than linking to a page with no numbers.

**Never says.** Which band governs, in any heading or static sentence (R10). Any count in
prose (R8). That the placement of the level produced the bay count (§4.2). *Certified,
approved, compliant, validated, accurate, approval-ready, regulator-approved, fully
compliant, trusted by, industry-leading.* Any percentage of anything.

---

### 4.2 `/parking` — how the parking number is made

**Purpose:** show, at depth, how the bay count is actually produced — an assumed area factor
first, a placed level second — and make the gap between those two the page's argument rather
than its embarrassment.

**This page replaces the claim all three proposals made.** They each wanted to write *"most
tools divide an area by a factor; this one places rectangles."* Verified against
`packages/capacity/src/pipeline.ts`: `computeBands` runs at line 367 and `planParkingLevel`
at line 453, inside a `try` whose failure is caught and reported rather than thrown. The
placed rectangles are strictly **downstream** of Band C and cannot inform it. Band C rests on
`parking.supportableUnitCeiling`, whose supply term is `parking.provided_bays` at
`parking.ts:306` — `floor(available area ÷ 32 m²/bay)`, with the 32 `ASSUMED`. Publishing the
sentence they wanted would put a false causal claim under the site's headline number, on the
page that sells traceability, and no gate would catch it because `pnpm example` diffs values
and not the claims wrapped around them.

The true version is better. *We compute the supply from an assumed factor, we say so in
amber, and then we lay the level out and tell you what the drawing costs against what the
factor predicted.* That is a product naming where its own governing number is weakest and
then measuring the weakness — which is the entire proposition, demonstrated instead of
asserted.

| # | Section | Content | Figures |
|---|---|---|---|
| 1 | The claim | *"The number that governs this plot rests on an assumption. Here is the assumption, and here is what happens when the level is actually drawn."* | none |
| 2 | Where the governing number comes from | The chain, in order, each link a traced value: bays per unit from the mix → demand at the probe scheme → available area across the declared levels → **supply = available area ÷ the area factor** → supportable unit ceiling → Band C. States plainly that the divisor is an assumption with a written basis and a measured sensitivity, and renders it in the amber `ASSUMED` treatment with the basis printed in full. | `verified.bayAreaFactorM2`, `.bayAreaFactorClass`, `input.run.parkingUsableFraction.{value,source,basis}`, `verified.formulas.bandC`; and `verified.providedBays`, `.governingUnitCount`, `.demandAtGoverningBays` (§6.2) |
| 3 | Demand and supply are different numbers | Because the site would otherwise print one as the other. `parking.total_bays` is the demand of the larger scheme used to *probe* for the parking ceiling; `parking.provided_bays` is what the declared levels hold; `parking.demand_at_governing_capacity` is what the reported answer actually needs. The engine's own note is quoted: *"comparing one scheme's supply against the other's demand reports a correct answer as a shortfall."* Three labelled figures, never one. | `verified.totalBays` (labelled *demand, probe scheme*), `.providedBays`, `.demandAtGoverningBays` |
| 4 | The level, drawn | The parking level as placed rectangles — bays by row, aisles, ramp — inside the podium outline, at the hero drawing's scale and in its drawing language. Rectangles carry `kind` and `row`, so a reader can name the third module the way the engine names it. The legend doubles as the target-size control list, as `PlotCanvas` already does. **Below 46 rem (R13):** the SVG keeps its aspect ratio at `width: 100%; height: auto` and does not scroll — a drawing that has to be panned on a phone is a drawing nobody reads — while the legend beneath it becomes a single column with 44 px targets. It is the label list, not the drawing, that overflows at 320 px. | `verified.levelPlan.rects[]{kind,row,widthM,heightM,outline}`, `.podiumRing`, `.packingRect.outline` |
| 5 | What the drawing costs the assumption | The section the product is for. Achieved area per bay from the placed level, set against the factor the supply model used, with the difference stated in m² and in bays. If the drawing is worse than the factor predicted, that is a finding about this plot and it is printed as one. **No developer's benchmark, target or efficiency figure appears** — those are a named third party's confidential commercial brief. | `verified.levelPlan.areaPerBayM2`, `.bayCount`, `.usableAreaM2`, `.deductionsM2`, against `verified.bayAreaFactorM2` |
| 6 | Packed inside the podium, never its bounding box | The pack targets the largest rectangle inscribed in the podium outline, so the error runs by containment and the count is a floor. On a non-rectangular podium the unusable remainder is reported in m², not absorbed into a ratio. States `packingRect.exact` honestly when the inscribed rectangle is not exact. | `verified.levelPlan.packingRect.{widthM,depthM,exact,coveragePct}` |
| 7 | The dimensions this run was cut to | **Only the row the run used**, from the fixture: angle, driveway type, bay width, bay length, driveway width. The full Table B.11 is **not** republished. Two reasons: `BAY_STANDARDS` holds six rows, not the ten a five-angles-by-two-driveways table implies, so a proposal promising the full grid was describing a table that does not exist; and republishing an entire code table on a marketing site is a copyright exposure that citing a clause is not. Never quoted from `docs/01-extracted/` — extraction drops `≤ ≥ ± m²` and scrambles columns. **Two fields the first draft promised are not on the wire, and neither was in the extension list.** `present.ts:180-189` serialises five keys on `standard` and no more. The *structural clearance* is not a field on `standard` at all — it is a module constant, `STRUCTURAL_CLEARANCE_M` at `layout.ts:104`, charged per obstructed side, with `structuralGridM` (`layout.ts:160`) as the optional input that decides where columns fall; and the *clause reference* is `TABLE_B11` (`layout.ts:53`), a `Citation` used inside the engine as a provenance rule at `layout.ts:258` and `:438` and serialised by nothing. Both become §6.2 item 5. Until that lands, this section renders the five dimensions it has and the clause reference is a link to §4.9 rather than a citation printed here — a clause number typed by hand on the page that argues against typed figures is the wrong way to close a gap. | `verified.levelPlan.standard.{angle,driveway,bayWidthM,bayLengthM,drivewayWidthM}`; after §6.2 item 5, `.structuralClearanceM` and `.citation.{clauseReference,instrumentId,instrumentVersion,sourcePage}` |
| 8 | The ramp is placed; its gradient is not assessed | The ramp footprint is drawn at its plan dimensions and labelled `NOT ASSESSED` for gradient, transitions and headroom, in the `NotAssessed` component's own treatment. Drawing a ramp that reads as checked when only its plan dimension was considered would be worse than drawing none. | the `RAMP` rectangle out of `verified.levelPlan.rects[]` |
| 9 | Where the cars get in | The recommended access edge; every viable candidate ranked with the engine's own rationale string; **every rejected edge with the reason it was rejected**, which is the half of the answer a spreadsheet never gives and the reason a reviewer can argue with the placement. Then the residue: whether the access sits opposite a T junction needs a road network the engine does not hold, and is reported `NOT ASSESSED` rather than allowed to block the rest. | `verified.access.recommended`, `.candidates[]`, `.rejected[]{edgeSeq,classification,reason}`, `.notAssessed[]` |
| 10 | The declaration with no default | *(R8 part 3: the first draft's heading was "The one declaration with no default".)* Both answers for this same plot, side by side: parking counted toward FAR, and parking excluded. Regulatory limit, governing GFA and governing band for each, and the spread between them. This is engine output from a real endpoint, which is why the site carries no cited 15–35% range anywhere (R8). Below 46 rem the two columns stack, labelled, rather than scrolling (R13) — a comparison the reader has to scroll between is not a comparison. **A leg can fail, and R8 rests this whole section on the endpoint, so the failure has a state.** `side()` returns `{ error: r.message }` when a leg throws, and both spreads are `?? null`. If either leg is an error the section renders the leg that answered, the engine's own error string for the leg that did not, and **no spread at all** — never a single column presented as a comparison, and never a spread computed from one side. If both fail, the section does not render and `/parking` §2's amber factor carries the argument alone; the page does not fall back to the deleted 15–35% figure, which is the failure mode R8 exists to prevent. | `verified.parkingInFar.{countsTowardFar,excludedFromFar,regulatorySpreadM2,governingSpreadM2,governingSpreadRelative,verdict}` from `POST /api/runs/parking-in-far-comparison` — six keys, not the five the first draft named |
| 11 | What it does not do here | No search for the optimal ramp or core position: a choice among feasible alternatives is a `TRADEOFF` value and `PHASE_0_CLASSES` cannot emit one — refused by construction, stated as a design decision, with **no attribution to any person or conversation**. No structural grid design. No fire tender access, turning circles or egress. No mechanical or stacked parking. No basement or water-table judgement. | none |
| 12 | *(R5)* What this page did not prove | That the level as drawn is buildable; that the assumed factor is right for this plot; that the code clauses encoded here are the clauses that apply. → `/rules`. | none |

**Empty and error states.** If `run.levelPlanRefusal` is non-null on the verified run,
sections 4–8 are replaced by the refusal string in a callout — *an empty plan reads as "no
bays"*, which is why the engine returns a reason rather than an empty object. If the verifier
extension has not landed, sections 3–9 do not render and the page ships as 1, 2, 10, 11, 12.

**Never says.** That placement produced the bay count. That the engine does not divide an area
by a factor. Any developer's benchmark, target or unit-area cap. Any characterisation of a
competing tool. Any threshold quoted from extracted text. Which band governs, other than
templated from the fixture.

---

### 4.3 `/refusals` — what it refuses

**Purpose:** be the permalink a reader forwards to their lawyer or their architect —
everything the product will not do, opening with the three refusals it performs at runtime so
the page reads as behaviour rather than as caveats.

| # | Section | Content | Figures |
|---|---|---|---|
| 1 | Hero | *"Refusals here are things the software does, not things it lacks. If you are looking for the overclaim, start on this page."* | none |
| 2 | **The refusal contract** | First, before any prose. Three rows: a run with no declared parking-in-FAR treatment returns **422** and no guess; an export with the assumption gate or the reviewer gate unsatisfied returns **409**; a run that fails an invariant or a hard constraint returns **422 and is never persisted** — never a warning, never a configurable severity, no override flag. Each row names the file that enforces it. **The second row said "gates G1–G4" in the first draft and that is wrong** (R11): `EXPORT_GATES` is `[G3, G4]` (`gates.ts:117-118`), the handler's own docblock says *"blocked until G3 and G4"* (`server.ts:903`), and the G1/G2 subject hashes it computes at `server.ts:917-918` are never read. G1 gates rule resolution and G2 gates capacity computation, which is where they belong and where the page places them; there is no transitive prerequisite chain in the file, so a page implying one would be describing a control by inference. Note that `README.md:167-170` carries the same error — take the status codes from it, take the gate list from `gates.ts`. | `gates.ts`, `apps/api/src/server.ts`; status codes from `README.md:167-170` |
| 3 | It does not design a building | The item verbatim, plus: the 3D view is the engine's own `BuildingModel` — each level at its floor, each car in its bay, the ramp between the levels it joins — coloured by the provenance class of the value each object stands for, and what the model does not contain (slab thickness, cores, façades) is listed under it. An unentered podium level count is `ASSUMED`, amber, and said in words as well as in colour. *(Renamed from "It does not draw a building" when Phase 4 shipped the 3D view and the .glb: from then on it did draw one, and the refusal that stayed true was the design.)* | none |
| 4 | It does not check life safety | Verbatim, plus the deferred rule list with life-safety chips: a missing check reads as a check that passed, so every deferred constraint is named in every output. | `SNAPSHOT.deferred[]` |
| 5 | It does not tell you what is realistically achievable | Verbatim, plus: there is no realistic/expected/likely band and **the field does not exist in the schema**, so one cannot be configured in. The honest substitute is a user-set realism discount defaulting to no discount, attributed to whoever changed it. | `input.run.realismDiscount` |
| 6 | It does not decide the parking-in-FAR question | Verbatim, plus: no default; `DERIVED` from a citation, or `USER_SET` by a named user, or the run is refused. **No range is quoted** — the link goes to `/parking` §10, which shows the measured spread for this plot. | none here |
| 7 | It does not replace a professional, **and it does not enforce that the reviewer is not the author** | Verbatim, plus the strongest single item available to this page, which the first draft had inverted into a claim (R11). What G4 does: it refuses the acknowledgement unless the actor asserts a professional licence number, and it writes that name, that licence and that timestamp onto the export. What it does not do: verify the licence with anybody, or check that the person signing is not the person who authored the run. `canReview` (`identity.ts:88-90`) tests that a licence string is non-empty and nothing else, and it is the only check the handler makes (`server.ts:878`). So one person holding one licence number can author a run and sign it, and this deployment will record that as a reviewed export. Separation of duties is a control this software does not have; the gate is a signature line, and a signature line is worth exactly what the signature is worth. Saying so here is the reason a reader can believe the rest of the page. | none |
| 8 | It does not search for the optimal ramp and core position | A `TRADEOFF` value; the Phase 0 class set does not contain that class and the traced-value constructor throws on one outside it. Absent as a structural consequence, not as a backlog item. No attribution. | none |
| 9 | A developer standard could not cut your envelope, however many it held | `DeveloperStandard` and `ProjectBrief` are deliberately not `RuleRecord`s, are served from `/api/standards` and are never merged into `/api/rules`. A commercial preference that bound the envelope would be reporting a client's brief as a legal limit. **No brief's contents, caps, targets or figures appear.** | none |
| 10 | It is not the whole code | Parking, setback, dimension and access clauses only. The fire code is not read at all. The four encoded clause families are named; no page count is typed (R8) — a corpus figure comes from a generated inventory or does not appear. | none |
| 11 | A file is not an integration | Exports travel as files. No live link, no round trip, no Revit connection, and a change made downstream does not come back. The 3D model is written as a glTF file, and it is a file like the others. **IFC is not produced by this engine** — if you have seen it listed against this product it was scope in an older document and it does not exist in the software. | none |
| 12 | **What is not on this site, and why** | The highest belief-per-word section on the site. No accuracy percentage — the variance study has not been run. No customer count or logo wall — there are no customers. No case study — every real plot in the corpus belongs to someone else. No comparison table — we have evaluated no competitor. No price — nothing about the current engagement generalises. No certification badge — there is no certification. Closes on the rule that produced the list: no figure on this site is typed by a human, and a page that cannot cite a number does not print one. | none, by construction |
| 13 | Which of these could change, and who changes them | Three groups, permanent first: permanent by design (the compliance claim, the realism band, the optimiser class); awaiting a named human (rule approval, annex signature, the variance study); outside Phase 0 (unit layouts, further code coverage). Nothing in the first group carries a date; nothing anywhere carries a promise. | none |
| 14 | *(R5)* What this page did not prove | That the refusals above are the complete set. → `/dashboard`, `/rules`. | none |

**Empty and error states.** If `readiness.json` is absent, §4's deferred list is replaced by a
line saying the snapshot is missing — never by an empty list, which would read as *nothing is
deferred*, the precise inversion this page exists to prevent.

**Never says.** *Certified* without a negation in its window. Any count of refusals. Any
security-posture claim (that page is blocked, §9 Q1). Anything quoted from the source
specification document.

---

### 4.4 `/dashboard` — deployment readiness

**Purpose:** show anyone, without signing in, exactly how much of this deployment is not
ready, and name the human action that would change each number.

**Route change.** `Root` dispatches `/dashboard` **above** the actor check. With an actor it
fetches live `GET /api/dashboard`; without one it renders a dated snapshot from
`readiness.json`. This closes the funnel defect where two of the four landing CTAs land a
visitor on *"Who is running this?"*. It does **not** fabricate an actor to reach the API at
runtime — `/api/dashboard` calls `actorFrom` (`server.ts:661`), and putting an invented name
into the identity chain of a product whose identity badge is load-bearing is the one failure
this site cannot survive. `readiness.json` is written at **build time** by the same in-process
injection the existing verifier already uses; that is a script with a build-time header, not a
runtime identity. Rendering is the existing, already-pure `DashboardPanels({data, navigate})`
— no second implementation.

**The snapshot is not a dump of `GET /api/dashboard`, and the first draft of this document said
it was.** That payload carries `recentRuns: summaries.slice(0, 12)`, and `summariseRun`
(`server.ts:1207-1231`) emits `plotNumber`, `community`, `createdBy` — an actor's real name —
and `reviewer`. §6.1's own deletion list forbids *"any real plot number, community or affection
plan"* on this site, and a JSON fixture in the public bundle is *on the site* whether or not a
component renders it: it ships, it is fetchable, and no prohibitions test can see inside it
because prohibitions run over rendered markup. `volume.plots` and `.runs` are the same problem
one step removed — they count whatever database the build machine happened to hold.

So `scripts/verify-readiness.mjs` is constrained three ways, and all three are the script's job
rather than the page's:

1. **It seeds its own store.** A fresh `SqliteRunRepository(':memory:')` into which it injects
   the synthetic worked-example plot and run — the same recorded input
   `verify-worked-example.mjs` uses — and nothing else. Every count in the snapshot then
   describes the demonstration, which is what the page claims it describes.
2. **It projects.** `recentRuns` is written as `[]`, not omitted: `DashboardView` requires the
   key, and §4.4 §5 renders the recent-runs table only for a signed-in reader anyway.
3. **It asserts, and fails the build.** After serialising, the script scans its own output for
   the deletion list — any plot number matching the corpus pattern, any community name, any
   actor name that is not the build-time header's — and exits non-zero on a hit. A constraint
   that is only a sentence in a design document is a constraint nobody runs.

**Key paths.** The file keeps the API's own shape, because `DashboardPanels` takes a
`DashboardView` and a second shape would mean a second implementation. It is imported as
`SNAPSHOT`, and the Figures column below names the API's paths exactly: `generatedAt`,
`engineVersion`, `volume`, `governingBands`, `assumptionExposure`, `deferred` and `recentRuns`
are **top level**; `rulesApproved`, `rulesTotal`, `definitionsSigned`, `definitionsTotal`,
`annexVersion`, `annexSigned`, `invariantsRan`, `invariantsTotal` and `blocking` are nested one
level down under `readiness`. The first draft mixed the two levels and wrote `exposure` for what
the handler calls `assumptionExposure`; both are corrected in the table.

| # | Section | Content | Figures |
|---|---|---|---|
| 1 | Provenance of this page | One line, first: live from the deployment you are connected to, or — signed out — a snapshot generated at `{generatedAt}` from a verified run. | `SNAPSHOT.generatedAt` |
| 2 | Blocking banner | The API's own sentence, verbatim: no rule in this deployment is approved and the metric definitions annex is unsigned; every figure below is an engine demonstration; none of it is a capacity assessment and none of it may be quoted to a third party. | `SNAPSHOT.readiness.blocking` |
| 3 | **What is not ready** | Three tiles, first and largest: rules approved, definitions signed, invariants ran. Each `blocked` or `dormant`, never `ok` — and `dormant` is **not amber**, see §2.1 prerequisite 6 and R6. Counted over `SEED_RULES` and **never** over `loadSeedRulesForDevelopment`, which stamps every record `APPROVED / DEVELOPMENT-ONLY-NOT-A-REAL-APPROVER` and once reported every rule approved on a deployment whose real number is zero. *Dormant is not a pass* sits beside the third, from the one shared constant (§6.1). **The invariants tile has a residue and it is named rather than styled around:** `invariantsRan` is `latest?.invariants.ran ?? null` and `invariantsTotal` is `latest?.invariants.total ?? 18` (`server.ts`), so on a store with no run the total is a *typed* eighteen reaching a public page through the API — R8, one layer down. Constraint 1 above closes it, because the seeded store always has a run; and if `invariantsRan` is nonetheless `null` the tile does not render, rather than rendering a total against a missing count. *(A reviewer of this document expected `null of 18` to reach the screen. It does not: `Dashboard.tsx:122-129` already renders `—` when `invariantsRan === null`. The defect is the hardcoded denominator, not the numerator.)* | `SNAPSHOT.readiness.rulesApproved/.rulesTotal`, `.definitionsSigned/.definitionsTotal`, `.annexVersion`, `.annexSigned`, `.invariantsRan/.invariantsTotal` |
| 4 | **What would change these numbers** | New, and the section that converts the zeros from a confession into a plan (R2). Three rows, each naming actor and artefact: a licensed Dubai architect authors each rule against the actual instrument and approves it by name; the metric definitions annex is reviewed and signed, which is what unblocks every area term; the unit and per-level schedule arrives, which is what wakes the dormant checks. No dates. | none |
| 5 | What has been run | Plots, runs, reviewed, exported, and the governing-band split. Deliberately below readiness: a page leading with volume while approvals read zero measures motion and calls it progress. Signed out, these are the counts of the seeded demonstration store and the section says so in its first line — the recent-runs table carries reviewer names, is `[]` in the snapshot, and stays behind the actor. | `SNAPSHOT.volume`, `.governingBands`; live payload when signed in |
| 6 | Where the answers are least anchored | Assumption exposure ranked by the largest effect any run measured, with each basis string. Bars scaled against a fixed reference, not the set maximum, so a small set cannot look dramatic. An unmeasured sensitivity renders *not measured*, never `0.0%` — those mean opposite things. **This needs a second API change and the first draft did not list one.** The handler collapses the distinction server-side: `const effect = a.sensitivity?.relativeEffect ?? '0'`, so a null sensitivity and a measured zero arrive identical and the page cannot tell apart the two things this row says are opposites. `maxRelativeEffect` becomes `string \| null`, the `??  '0'` goes, and the comparison skips nulls. It is listed as §6.2 item 6 and is a prerequisite, not a nicety — without it this sentence is undeliverable and the row should not be built. | `SNAPSHOT.assumptionExposure[]` |
| 7 | Applicable, and never assessed | Deferred rules with life-safety chips and citations. | `SNAPSHOT.deferred[]` |
| 8 | Recent runs — signed in only | *{invariantsRan} of {invariantsTotal} ran*, both interpolated from the payload and neither typed (R8), never a tick, never a percentage. | live payload |
| 9 | No score, and not an uptime page | There is deliberately no health score, no percentage and no *all systems operational*, because a single number is something a reader stops at. Nothing here monitors availability. | none |

**Empty, loading and error states.** Signed out, `readiness.json` is a build-time import, so
there is no loading interval: a missing file fails the build. If it is present but
`readiness.invariantsRan` is null, section 3's third tile does not render (above). Signed in,
the three states already exist in `Dashboard.tsx:45-62` and none of them is replaced: the fetch
resolves to the existing error banner, or to `Reading the deployment…`, or to the panels. **That
line is the loading state** — a reviewer of this document reported there was none; there is, at
`Dashboard.tsx:62`. What this section adds is a prohibition on the obvious next move: it must
not become a skeleton with placeholder figures in the tile positions, because a grey rectangle
where a count belongs is a number the reader supplies themselves.

**Never says.** A composite score. `stat--ok`. A percentage of the invariant total. *Healthy,
green, operational, all clear.* The word *status* anywhere it could be read as uptime.

---

### 4.5 `/app` — the engine

**Purpose:** hand a convinced reader into the ten-step engine without dropping them onto an
unexplained name prompt, and keep the site's disclosure visible inside the product.

| # | Section | Content |
|---|---|---|
| 1 | **The antechamber** (today's `ActorPrompt`, respecified as a public page) | It is the first screen behind every public CTA, so it is site copy and goes through the site's prohibitions test. Keeps the shared header, footer and theme toggle. Three lines above the fields: *why we ask* — the name is printed on the export and recorded against each gate, so a figure can always be traced to whoever entered it; *what the licence field is* — it is recorded, it is not verified, and it is not checked against the author, so signing your own run is something this deployment permits and records (R11, and `/refusals` §7 in full); *what this is not* — there is no password, no session and no token, so it is not authentication. A link to `/refusals` sits beside the submit button. **The first draft's version of the first line claimed the reviewer gate requires a person who is not the author.** It does not, and this is the first screen behind every public CTA, so it is the worst place on the site to assert a control. The button names its outcome rather than saying *Continue*, and no field is labelled by a placeholder. |
| 2 | Shell continuity | The public header and the engine header become one component differing only by the actor badge. One `useTheme` owner in `Root` replaces three desynchronised instances — today toggling on `/dashboard` leaves the engine's toggle stale, so its first click on `/app` appears to do nothing. A skip link ships here (absent today). The second `<h1>ENVELOPE</h1>` inside the hidden engine DOM is removed. |
| 3 | Deep-link entry | Two query hints, and one mechanism. `?step=<id>` opens at that step when it is reachable, and otherwise at the earliest unreachable prerequisite with a line saying which. `?demo=worked-example` loads the recorded input — it is §4 below, reached by URL, and it is what the fold CTA carries (§4.1 §2). An **unrecognised** step id is not silently ignored: the engine opens at the earliest step and prints one line naming the steps that exist, because quietly serving a different screen from the one the URL asked for is the defect `/404` exists to refuse and it does not stop being that inside `/app`. **The hint has to be re-read, and the first draft did not say how.** `EngineApp` mounts once at first paint inside the always-present hidden div; a `location.search` read on mount never re-runs when the route changes, so an in-app click from `/parking` to `/app?step=parking` would land on whatever step was already open. `useRouter` therefore returns `search` alongside `route`, updated by both `navigate` and `popstate`, and `Root` passes it to `EngineApp` as a prop that an effect keys on. Still no router change beyond §5, no params, no dependency. The client-side ordering stays a convenience; the server enforces it for real. |
| 4 | One-click demonstration | A button that loads the recorded worked-example input, so the visitor watches the engine return the number they read ninety seconds earlier. Beside it, *start from my own plot*. Reachable both as a button on the intake step and as `?demo=worked-example`. |
| 5 | Disclosure inside the flow | Steps that refuse say so in the site's own words: the parameters step says the run is refused rather than defaulted; the assumptions step says amber means assumed and links to `/method`; the checks step reports *{ran} of {total} ran*, both interpolated from the run's own `checks.invariants` and neither typed (R8), and never a tick; evidence and export link to `/refusals` rather than restating it. |
| 6 | Exit | The site nav stays reachable from every step, so a reader can re-read the claim statement mid-run without losing the run. **The first draft said this was already true because of the mounted-but-hidden strategy in `Root`. It is not.** `Root.tsx:56` is `if (route === '/') return <Landing navigate={navigate} />;`, which unmounts `EngineApp`, and the comment above it states that as intent. The hidden-div strategy spans `/app` ↔ `/dashboard` only, and this plan adds eight more public routes to lose a run on. Neither of the obvious answers is right: keeping the early return withdraws the promise, and deleting it makes every public page — including the ninety-second first impression — mount the engine and build a WebGL scene nobody asked for. So: **a latch.** `Root` holds `engineMounted`, false until the first navigation to `/app`, true forever after. Before that first visit there is no engine to unmount and no run to lose; after it, the hidden div is rendered on every route and the run survives every public navigation, which is the case the promise was made for. The `three` import is static and already in the bundle today, so what the latch saves is the mount, the scene and the WebGL context — not bytes. Lazy-loading `three` is a real and separate improvement and is not scoped here. After an export, a link to `/dashboard`; after a blocked run, a link to `/refusals` saying that a refusal to compute is designed behaviour rather than a failure. |

**Empty and error states.** Unchanged from today: the existing error banner, the existing
blocked-run 422 rendering, the existing 409 explanation on an early export.

**Never says.** *Sign in, log in, create an account, secure.* Anything implying the licence is
checked.

---

### 4.6 `/404` — that page is not here

**Purpose:** fail loudly instead of silently rendering the home page under someone else's URL.

1. **Statement.** *"There is no page at this address, and nothing has been substituted for
   it."* One line in the house voice: a system that quietly serves a different answer from the
   one you asked for is the failure this whole product is about.

   **The requested path is echoed back under three constraints, and "escaped" was not enough.**
   Escaping stops markup; it does not stop words. `/we-are-fully-compliant-and-certified`
   renders that sentence on an ENVELOPE-branded page in the house voice, and
   `not-found.test.tsx` passes because the test supplies its own path. So: only
   `location.pathname` is echoed, never the query or the hash; it is truncated to 80 characters
   with an ellipsis; every character outside `[A-Za-z0-9/._-]` is replaced with `·`; and it is
   set in a `<code>` chip that is visually a specimen rather than a sentence — a mono string on
   an inset surface cannot be read as the page speaking. If the path is empty after that
   treatment the chip is omitted and the sentence stands alone. `not-found.test.tsx` runs the
   prohibitions set over the page rendered with a **hostile** path, not a benign one; that is
   the assertion, and a test that only supplies `/nope` is not one.
2. **The whole site.** The complete route list, generated from `routes.json` and grouped as the
   footer groups it, *What it does not claim* first. Generated, so a route cannot exist and be
   missing here.
3. **Where to go instead.** *(R8 part 3.)* `/`, `/parking`, `/refusals`. No humour, no
   illustration, no *oops*, no search box.

**The status code, which the first draft never mentioned.** §5's own docblock relies on any
static host with a SPA fallback serving `index.html` for every path — and that fallback returns
**200**. A page reading *"nothing has been substituted for it"* served under 200 OK is a
quieter version of the defect it exists to fix, and it also invites a search engine to index
every mistyped URL as a real page. Two things close what can be closed, and the residue is
stated rather than left implicit: the host's SPA fallback is configured to serve the shell with
a 404 status where the host supports that (Netlify, Cloudflare Pages and Vercel all do; a bare
`vite preview` does not), and the 404 render sets `<meta name="robots" content="noindex">` so
that on a host which cannot, the substituted page is at least not collected. Where neither is
possible the page is honest in its body and wrong in its header, and that is written down here
rather than discovered — it becomes §9's fifth question only if a host is chosen that cannot do
it.

**Title and description.** `NOT_FOUND` is deliberately not in `ROUTES`, so `Record<Route,
PageSpec>` has nowhere to hold its `<title>` or its `og:description` — a gap in the first
draft, which specified both and then made them unreachable. `pages.tsx` exports a separate
`NOT_FOUND_PAGE: PageSpec` beside the record, and `Root`'s title effect reads whichever of the
two the current location resolves to. One extra constant, and the sentinel stays out of the
nav, the footer and the smoke walk, which is the whole reason it is a sentinel.

**Never says.** Anything about the product. This page carries no claims and no figures.

---

### 4.7 `/worked-example` — one run, printed in full  *(should)*

**Purpose:** print the single verified run down to its inputs, so a reader can reconstruct the
headline number without trusting the page.

1. **Hero.** One run, one synthetic plot, and every figure below is what the engine returned
   for the inputs printed above it.
2. **The input, in full** — the fixture's entire `input` block, rendered nowhere today:
   `input.plot.{plotNumber, community, landUse, vertices, edges[]}` and
   `input.run.{parkingInFar, unitMix.entries[], parkingLevelsAvailable, parkingUsableFraction,
   saleableEfficiency, realismDiscount, useDraftRules}`. Each entry carries its provenance
   chip; the one `ASSUMED` input is amber with its basis printed in full; the two `USER_SET`
   values carry the user badge. Prerequisite 8's basis string is already corrected at source and
   nothing further is needed, but every basis on this page is rendered verbatim, so a new one
   that named a party or a commercial figure would reach the public site through this section
   before anyone reviewed it. **Below 46 rem (R13):** the vertex and edge lists are the page's
   widest content and go inside an `overflow-x: auto` container with `role="region"`, an
   `aria-label` and `tabindex="0"`, not a font-size reduction — a coordinate a reader cannot
   read is not evidence.
3. **The plot, to scale** — `PlotPlan`, with outer rectangle, dimension line and road labels
   read from `input.plot`.
4. **Setbacks, per edge, and the rule that produced each** — `verified.setbacksM[].{seq,
   setbackM, ruleId}` with a `DRAFT · not sourced` chip on every row (R9) and a link to
   `/rules`. The section that most tempts a site to imply legal authority is the section that
   states it has none.
5. **The capacities** *(R8 part 3)* — `verified.bandAM2/.bandBM2/.bandCM2` with `formulas.*` disclosed,
   plus `governingGfaM2`, `headroomToNextM2`, `nextBindingBand`.
6. **Levels, footprint and coverage** — `footprintM2`, `coverageCapM2`, `coverageHeadroomM2`
   (engine-emitted, prerequisite 7), `towerPlateCapM2`, `maxLevelsByHeight`, `levels`,
   `formulas.levels`.
7. **Parking** — the three labelled bay figures from `/parking` §3, and the amber factor.
8. **What this run is not.** Draft rules, unsigned annex, one synthetic plot, no real
   affection plan, and the readiness sentence verbatim.
9. **How this page stays true.** The verifier re-runs the real engine in-process against the
   recorded input and fails the build on drift. Then the story told against ourselves: this
   page printed `6,352.5 m²` for months after the engine began returning `6,774.194` for the
   same input, on the page that sells traced numbers, and nothing caught it because nothing
   checked. Both figures read from the fixture and from the script's own header comment, never
   typed.

**Empty and error states.** *"None — the fixture is a build-time import"* was the first draft's
answer and it addressed the wrong failure: a build-time import fails on a missing **file**, and
the case that matters here is a missing **key**. Two answers, one mechanical and one editorial.

*Mechanical, and stronger than expected.* `apps/web/tsconfig.json` sets `resolveJsonModule` and
the fixture is imported directly (`Landing.tsx:48`), so TypeScript types it from its own
contents and reading `verified.coverageHeadroomM2` while that key is absent is a **compile
error**, not `undefined m²` on the page. `apps/web` is a project reference in the root solution,
so `pnpm typecheck` covers it. That is a real guarantee and it is why the fixture is imported
rather than fetched — but it only holds for keys read through TypeScript, so nothing on this
page may reach the fixture through an index signature or a `JSON.parse`.

*Editorial.* A compile error is the correct failure and still an unbuildable page, so each
section that depends on an unlanded prerequisite says what it renders without it. §6 omits the
coverage-headroom sentence until `verified.coverageHeadroomM2` exists (prerequisite 7) and
prints footprint, cap and levels regardless. §7 omits the three labelled bay figures until §6.2
item 2 lands and prints the amber factor alone, which is the section's actual argument. Neither
section prints a hyphen where a figure belongs: an em dash in a figure slot is a number the
reader supplies themselves.

**Never says.** Any figure not in the fixture. Any real plot number, community or developer
from the corpus.

---

### 4.8 `/method` — how a number is made  *(should)*

**Purpose:** one page explaining how a number is produced here, and where each layer's
guarantee stops.

1. **Rule, then geometry, then provenance, then invariant.** *(R8: the first draft's heading
   was "A number is made in four moves", on the page whose own Never-says line is "Any count in
   a heading". Naming the moves is better copy than counting them, and it survives a fifth.)*
   The same four as a diagram, one sentence each.
2. **Rules that generate, not rules that judge.** The `README.md:15-22` paragraph.
3. **Integer millimetres and exact predicates.** Why the specification's named toolchain was
   not used and the deviation disclosed rather than absorbed; branded unit types, so a metre
   passed as a millimetre does not compile; area computed three independent ways; degenerate
   geometry raising rather than returning a plausible wrong answer.
4. **Provenance.** The four-way key rendered with the existing zero-prop `ProvenanceLegend`,
   so the key here and the key inside the engine cannot drift. Amber is reserved exclusively
   for `ASSUMED` — not the mark, not the favicon, not a badge, not a CTA. An assumed value
   carries a basis or it is not an assumption. A value declaring itself `DERIVED` while
   reaching no cited rule in the graph claims a citation it cannot reach, and a test walks the
   graph for every published value because exactly that happened.
5. **The invariant layer.** Constraint checking asks whether something is permitted; invariant
   checking asks whether the arithmetic closes. The catalogue table is **generated** from
   `packages/invariants/src/catalogue.ts` into `invariant-catalogue.json` — id, statement,
   tolerance, ran or dormant, and for every dormant row its written reason. No tick glyph, no
   green, no percentage. *Dormant is not a pass*, and synthesising a schedule to make the
   dormant ones pass would be verifying the engine against its own output.
6. **The boundary the build enforces.** `invariants`, `validation` and `report` do not list
   the engine among their dependencies, so importing it is impossible rather than discouraged,
   and `pnpm boundaries` asserts it across manifests, project references and source imports.
   That is why the independence claim is worth anything: it is a build failure, not a
   convention.
7. **The setback–floor fixpoint.** Setback depends on floor count depends on footprint depends
   on setback. Solved as a fixpoint, and the reason the pipeline as originally specified
   cannot compute its own worked example. Written as an engineering note with **no quotation
   from and no attribution to the source specification document** — see §9 Q2.
8. **The gates, and what each catches.** *(R8, same reason as §1.)* `boundaries`, `contrast`
   (where an unresolvable pair counts as a failure and not a skip), `typecheck`, `test`,
   `example`, `smoke`. The list is generated from `package.json`'s `scripts` block so that a
   gate added or removed cannot leave this page describing a build that no longer exists.
9. *(R5)* **What no gate catches.** A rule transcribed wrongly, a rule nobody encoded, an
   applicability predicate that selects the wrong plots. → `/rules`.

**Empty and error states.** If `invariant-catalogue.json` is absent, §5 renders its prose and
omits the table. It never renders a count in its place.

**Never says.** Any count in a heading. Anything quoted from the source specification. Any
claim that exact arithmetic makes an input correct.

---

### 4.9 `/rules` — the rule library  *(should)*

**Purpose:** show every rule the engine holds, together with the fact that not one is
approved, and refuse to print a threshold until one is.

1. **Hero.** *"A rule library page normally exists to look authoritative. This one exists to
   show that the authority is missing, and to say exactly what would supply it."*
2. **The warning the API already serves**, verbatim and first — `/api/rules` already returns
   `approved: []` plus its warning string.
3. **The library.** One row per record: id, rule class, evaluator, what it applies to, and a
   citation column reading `PLACEHOLDER-NOT-A-REAL-INSTRUMENT` / `[NOT SOURCED]` / page 0 for
   every row. **The threshold column is present and empty**, with one line beneath: values are
   withheld until a named licensed architect approves the record, because publishing a draft
   tier as though it were a Dubai code threshold is the worst failure available on this site.
   A table with a deliberately empty column states more than a paragraph could. **Below 46 rem
   (R13):** the table keeps all six columns and scrolls horizontally inside an `overflow-x:
   auto` container with `role="region"`, an `aria-label` and `tabindex="0"`. It does **not**
   collapse to stacked cards and it does not drop the empty column at narrow widths — the empty
   column *is* the argument, and a responsive rule that hides it on a phone would delete the
   point of the page on the device most of the traffic arrives on.
4. **What an approved rule carries.** A specimen record with every field labelled and none
   filled: instrument id and version, clause reference, document URI, source page, source
   bounding box, verbatim clause text, approver name, approval date, and three tests including
   a boundary case at the tier threshold.
5. **Rules have dates, and a run can be reproduced against them.** The store is bitemporal —
   `validFrom`, `validTo`, `recordedAt`, `version`, `supersedes`, and a deterministic rule-set
   hash. One paragraph, no more.
6. **Never quote a threshold from extracted text.** Our own working rule, published:
   extraction from the source codes drops mathematical symbols and unit marks and scrambles
   multi-column tables, so a clause quoted from an extraction is a clause that may have lost
   its operator. Every citation resolves to the source document and page.
7. **What has to happen before any of this is real.** The four preconditions, verbatim from
   the seed module's own docstring.

**Figures.** Row shapes and citation-absentia fields from a generated `rule-library.json`
(§6.2). **No threshold value is rendered for any record whose status is not `APPROVED` with a
non-development approver** — today that is every record, so the column is empty by computation
and not by choice.

**Empty and error states.** The empty threshold column *is* the state, and it must render as a
present column rather than a hidden one; hiding it would hide the point.

`rule-library.json` is a build-time import, so a missing file fails the build and a missing key
fails `pnpm typecheck` — the same mechanism, and the same limit, as §4.7's. What that does not
cover is the fixture generating **successfully but empty**: `rules: []` is valid JSON, valid
TypeScript and a page saying the library holds nothing, which is the exact inversion of what
this page exists to say. So the generator asserts a non-empty record set and exits non-zero
otherwise, and the page renders no table at all rather than an empty one. §2's warning string
from `/api/rules` stands on its own and is the page's floor.

**Never says.** Any setback tier, FAR, height or coverage value. Any clause text from
`docs/01-extracted/`.

---

### 4.10 `/inputs` — what it needs from you  *(should)*

**Purpose:** let a working engineer decide in two minutes whether he has what the engine
requires, and see which inputs stop a run cold.

1. **Hero.** *"Everything below is either something you supply, something a cited rule
   supplies, or something the run refuses to guess."*
2. **The plot.** Vertices in metres; per-edge classification; road hierarchy on every road
   edge — not optional, because it selects the setback rule and ranks the access
   recommendation. Illustrated by `input.plot`.
3. **The run parameters.** A table **generated from the Zod request schema** in `apps/api`, so
   it cannot describe a field the API does not accept. **The first draft made this page depend
   on a generator no prerequisite assigned to anyone**; it is now §6.2 item 7,
   `scripts/generate-input-schema.mjs`, which walks `runRequest` out of `apps/api/dist/schemas.js`
   — the same `dist` the existing verifier already loads after `tsc -b` — and writes
   `input-schema.json`. Until it exists this page does not ship, and that is stated in the empty
   state below rather than absorbed.

   **What the schema carries, and what it does not.** It gives the field name, its type, whether
   it is required, and its constraints — `parkingLevelsAvailable` is `int().min(0).max(8)`,
   `basis` is `string().min(20)`. It also carries more of the provenance answer than the first
   draft's critic allowed: the parameters that take one have a literal `source` enum, and those
   enums *are* the classes — `parkingUsableFraction.source` is `z.enum(['DERIVED','ASSUMED'])`,
   `unitMix.source` and `saleableEfficiency.source` are `z.enum(['USER_SET','ASSUMED'])`. The
   generator emits those verbatim. What the schema does **not** carry is a class for the fields
   that take no `source` — `plotId`, `parkingInFar`, `parkingLevelsAvailable`,
   `realismDiscount` — and for those the column reads *not carried by the request schema* rather
   than a hand-written mapping beside a generated table, which is the drift this generation
   exists to prevent. Values illustrated from `input.run`.
4. **The inputs that block a run.** *(R8: the first draft's heading was "The three that block".)*
   Parking-in-FAR has no default — no declaration, no computation,
   422. Saleable efficiency has no default: dividing GFA by saleable area per unit assumes
   every square metre of GFA sells, and cores, corridors, structure, plant and amenity are all
   inside GFA and none of them does; `capacity.gfa_per_unit_m2` and `capacity.weighted_nsa_m2`
   are separate quantities for that reason. And an affection plan that omits a limit does not
   get one — the run reports the gap and stops, because borrowing a figure from a neighbouring
   plot is the precise failure this product exists to prevent.
5. **What is assumed, and what that costs.** A filled gap is an `ASSUMED` entry with a written
   basis and a sensitivity, amber on screen and listed in every export. The worked example's
   own assumed input, in amber, with its basis.
6. **Optional inputs that change the answer.** Structural grid for the parking level; an
   affection-plan-stated access side; a developer standard; a unit mix from a project brief.
7. **What it never asks for.** No drawing, no model, no Revit file, no site survey, no login
   beyond a recorded name.
8. *(R5)* **What this page did not prove.** That the inputs you have are the ones your plot
   actually needs — that is what the sheet says, and it may omit them.

**Empty and error states.** If the schema-derived table cannot be generated the page does not
ship; a hand-typed parameter list would drift from the API silently, which is the defect the
generation exists to prevent.

**Never says.** Any real plot number or community. Any developer's brief contents.

---

### 4.11 `/exports` — what comes out  *(should)*

**Purpose:** name exactly the four artefacts the engine emits, what is stamped on each, and
the two formats it does not produce.

1. **Hero.** Every artefact this engine emits is stamped `REGULATORY VALIDITY: NOT ASSESSED`,
   and none of them leaves until the assumption register is acknowledged and someone puts their
   name and licence on the export. *(The first draft read "Four files … and none available until
   two people have put their names to it". The count is R8; the second clause is R11 — no code
   requires two people, and the sentence sat in the hero of the page most likely to be forwarded
   to a lawyer. §6 below states what the two gates actually check.)*
2. **The drawing.** *(R8 part 3: the heading carries no version string; "DXF R12" opens the
   first sentence, where an identifier belongs.)* It writes DXF R12, because R12 predates the
   object model later revisions layer on, so it is the simplest complete DXF and uses no feature
   this drawing needs. **What is not said:
   which programs will open it.** The first draft wrote *"it is the version everything reads"* —
   an unverifiable universal claim about third-party software, forbidden five items down this
   same page by §7's *"'works with AutoCAD' would be a claim about a tool, and it is not made"*.
   Two sentences, one page, and the weaker one was the marketing one. (`dxf.ts`'s own header
   comment names four CAD programs; a source comment is not public copy, and the distinction is
   the point.) Then the layer scheme, generated from `packages/exports/src/dxf.ts`'s
   `layerName(prefix, role)` into the fixture — one layer per level per role, `ENV-B1-BAY`,
   `ENV-L00-AISLE`, `ENV-SITE-SETBACK` — and
   the design reason: a reviewer's first move is to switch things off — bays off to check the
   aisle runs, ramp off to see what it costs, every level but one off to read it alone — and one
   `ENV-PARKING` layer would make all of those arguments happen at once. Anything resting on an
   assumption is inked amber (ACI 30, `CLASS_ACI`) on the layer of the element it is, so
   provenance survives the export as colour and no separate layer can be switched off to hide it.
3. **The workbook.** It writes XLSX. Sheet names and each sheet's own note string, generated from
   `apps/api/src/workbook.ts` — including the Capacity note stating there is no *realistic* or
   *expected* figure in the file because the engine does not produce one, and the Parking
   demand note stating that a level packing fewer bays than demand requires is a real
   reportable state, not an error in either number.
4. **JSON and the HTML report.** The JSON is the whole run including the provenance graph, so
   a downstream tool can re-walk every derivation.
5. **What is stamped on every one.** The five-way claim statement, the assumption register with
   every basis string, the deferred constraints by name, the rule-set hash, engine and annex
   versions, and the name, asserted licence and timestamp of whoever signed it — described in
   exactly those terms, not as a verified credential (R11).
6. **What the gates are, and what each one actually checks.** The first draft of this item was
   wrong twice in two sentences, and both are R11 defects rather than typos.

   *"Nothing exports before four gates."* `EXPORT_GATES` (`gates.ts:117-118`) is `[G3, G4]`. The
   export handler's own docblock says *"blocked until G3 and G4 are satisfied against the
   current content"* (`server.ts:903`), and it computes G1 and G2 subject hashes at
   `server.ts:917-918` that `requireExportGates` never reads. G1 gates rule resolution and G2
   gates capacity computation (`gates.ts:78-95`); there is no transitive prerequisite chain in
   the file. So the page says: four gates exist, two of them stand in front of export and
   return 409, and the other two stand earlier in the flow in front of the steps they name. That
   is a better sentence than the false one, because it tells a reader where a gate actually sits.

   *"G4 requires a reviewer who is deliberately not the author."* It does not. `canReview`
   (`identity.ts:88-90`) tests that a licence string is non-empty; it never compares the actor
   to `run.createdByActorId` and never verifies the licence. The page states what G4 records —
   a name, an asserted licence and a timestamp, stamped onto the artefact — and states plainly
   that the separation is not enforced, linking to `/refusals` §7. Per-author scoping was indeed
   considered and rejected, and the reason stands: a reviewer who is not the author is the flow
   the gate is *for*, so an ownership check would break it. But the reason a control was not
   built is not evidence that a different control exists.

   Editing an assumption resets G3 and creates a new run rather than mutating the old one.
7. **Formats that are not built.** IFC is not produced by this engine. If you have seen it
   listed against this product, it was scope in an older document and it does not exist in the
   software. First person, no hedge. The 3D model *is* built, as binary glTF 2.0 with no
   required extension — and that sentence is the whole claim. *"Writes DXF R12"* and *"writes
   binary glTF 2.0"* are facts about a file; *"works with AutoCAD"* or *"opens in Blender"*
   would be claims about a tool, and they are not made.
8. *(R5)* **What this page did not prove.** That any of these artefacts may be relied on — the
   stamp on each one says why.

**Figures.** `verified.exports.dxfLayers[]`, `verified.exports.workbookSheets[]`, both
serialised into the fixture so a renamed layer breaks `pnpm example` rather than silently
making this page wrong.

**Degradation clause.** §2 and §3 rest entirely on those two arrays (§6.2 item 4), and the first
draft gave `/parking` and `/method` a clause for exactly this and gave this page none. Until the
extension lands, §2 and §3 render their design reasons — why layers carry provenance, why the
workbook's Capacity note says there is no *realistic* figure in the file — and print **no layer
list and no sheet list**. A hand-typed layer name is the same defect as a hand-typed figure and
is harder to spot, because a layer name looks like documentation rather than data. §5's list of
what is stamped on all four artefacts is prose and is unaffected.

**Empty and error states.** No sample artefact is offered for download. The one demo DXF in
the repository is named after a real client plot and may not be published; a sample would have
to be regenerated from the synthetic worked example first, and that is not scoped here.

**Never says.** A count of export formats. IFC. The name of any program a file opens in. Any
integration claim.

---

### 4.12 `/glossary`  *(later, buildable)*

Generated from `GET /api/definitions` and `packages/core/src/definitions/annex.ts` into a
fixture. Opens with the unsigned-annex notice — `ANNEX_VERSION` is `0.1.0-UNSIGNED` and no
definition is signed, so every term carries a *pending signature* chip. Terms the annex does
not define are marked *engine vocabulary, not an agreed definition*; saying which is which is
the point of the page. Closes: two organisations can compute two different floor areas from
the same building and both be right, which is why the definition is signed before the
arithmetic is trusted.

### 4.13 `/security`, `/contact`, `/api`, `/changelog`  *(later, blocked)*

None of these is a design problem and none is built until its blocker clears. `/security` is
blocked on the deployment-posture decision (§9 Q1) — publishing *"any identified actor can
read, gate and export any run"* about a reachable deployment is a different act from
disclosing it to the client in writing, which is what is actually required. `/contact` is
blocked on a legal entity and a business address; the only phone number in this repository
belongs to a prospective client and must never reach a public page, and there will be no form
(a form needs an endpoint or a dependency and collects personal data with no privacy notice to
point at). `/api` is blocked on an OpenAPI document generated from the Zod schemas — a
hand-typed endpoint list would be the only unverified technical document on a site whose claim
is that documents are generated. `/changelog` is blocked because `git log` reports no commits;
the only honest version is generated from the bitemporal rule store and the version constants,
and its first state shows zero approved rules against an unsigned annex. Until each clears the
footer omits the link. An empty slot is the correct state; an invented page is the only kind of
failure this site cannot survive.

---

## 5. The router change

**Extend, do not replace.** The file's own comment invites replacement *"if a fourth route
ever needs params or nesting"*. Ten flat routes with zero params, zero nesting, zero loaders
and zero data-router concepts is not that condition. A library would cost ~15 kB, a new runtime
dependency that NN#7 requires a reason for, and a vocabulary we would not use — in exchange for
a `switch`. What the file genuinely lacks is five things, and they are about fifty lines: a
not-found state, **query and anchor handling**, scroll restoration on `popstate`, a same-route
brand click that scrolls to top instead of doing nothing, and a `search` value the app can react
to.

*(On the count: the `ROUTES` tuple below holds ten — the three that exist plus the seven built
here — and the first draft said "eleven" three times, "at eleven routes" once, and implied
thirteen once. One tuple, three numbers. The prose below now names none of them, because a
hardcoded count in a docblock is stale the moment an eleventh lands, which is the same argument
R8 makes about the public site and it does not stop applying inside `src/`.)*

**The query string is not optional, and the first draft typed it away.** `navigate` and `Link.to`
were typed `` Route | `${Route}#${string}` `` — hash only. Every CTA in this document is a query:
`/app?demo=worked-example` (§4.1 §2), `/app?step=parking` (§4.5 §3), `?step=parameters`,
`?step=export` (§7). None of them would typecheck, and the proposed body did `to.split('#')`, so
`path` would have been the whole string, `pushState` would have written it, `setRoute` would have
stored a value not in `ROUTES`, and `PAGES[route]` would have been `undefined` — a crash, not a
404. A pasted URL would have worked, because `currentRoute()` reads `pathname`; only an in-app
click would have broken, which is the worst version of that bug. The diff below parses path,
search and hash in one regex and keeps them separate.

What does **not** stay in this file is dispatch metadata. `Root` today dispatches with an
`if`/`if`/ternary and also owns identity, theme and the engine's hidden div; with the routes
this document adds that becomes the least reviewable file in the application. The metadata
moves out in two pieces, because one piece cannot serve both consumers:

- **`apps/web/src/routes.json`** — path, title, description, nav label, footer label, group,
  `needsActor`. Data only. Read by `pages.tsx`, `/404`, `scripts/smoke.mjs` and
  `scripts/shoot.mjs`. The two scripts are plain `.mjs` run by `node`, so JSON is what they can
  read; §2.1 prerequisite 2 has the argument in full.
- **`apps/web/src/pages.tsx`** — imports `routes.json`, adds the component for each route, and
  exports `PAGES`. Read by `Root`, `SiteChrome` and `SiteFooter`.

```diff
--- a/apps/web/src/router.tsx
+++ b/apps/web/src/router.tsx
@@
-/**
- * Three routes, and no router dependency.
- *
- * `/` the landing page, `/app` the engine, `/dashboard` the portfolio view.
- * That is the whole surface, so a routing library would be ~15 kB and a set of
- * concepts (loaders, nested outlets, actions) for a switch statement. If a
- * fourth route ever needs params or nesting, swap this out — it is thirty lines
- * and it is meant to be replaceable.
+/**
+ * Flat routes, and still no router dependency.
+ *
+ * The condition this file set for its own replacement was "a fourth route that
+ * needs params or nesting". More routes arrived; params and nesting did not.
+ * Every route is a flat literal, nothing loads data on navigation, and there
+ * are no nested outlets — so a library would buy loaders, actions and outlets
+ * we do not use, at ~15 kB and a new runtime dependency, in exchange for a
+ * lookup in a record. It stays. (No count in this sentence on purpose: the
+ * number in the tuple is the number, and a docblock that repeats it is a
+ * second copy to keep in step.)
+ *
+ * A route is a *path*. The query and the hash are not part of it and are not
+ * in `Route`: `/app?step=parking` and `/app` are the same page in different
+ * states, and conflating them puts `PAGES[route] === undefined` one careless
+ * `split` away.
+ *
+ * What did have to change is that an unrecognised path used to be *coerced* to
+ * `/`, so `/pricing` rendered the landing page while the address bar kept the
+ * wrong path. On a product whose whole proposition is that nothing is quietly
+ * substituted, quietly substituting a page is the one bug this file may not
+ * have. Hence `NOT_FOUND`, which is a sentinel rather than a route: it has no
+ * URL of its own, because a 404 must keep the address the visitor asked for.
  *
  * What it does have to get right is the History API, because the alternative —
  * hash routing — puts `#` in a URL somebody will paste into an email to a
- * client. Vite's dev server and any static host with a SPA fallback serve
- * `index.html` for all three paths.
+ * client. Vite's dev server and any static host with a SPA fallback serve
+ * `index.html` for every path, which is also what makes the 404 ours to render
+ * rather than the host's.
  */

 import { useCallback, useEffect, useState } from 'react';

-export const ROUTES = ['/', '/app', '/dashboard'] as const;
+export const ROUTES = [
+  '/',
+  '/parking',
+  '/refusals',
+  '/worked-example',
+  '/method',
+  '/rules',
+  '/inputs',
+  '/exports',
+  '/app',
+  '/dashboard',
+] as const;
 export type Route = (typeof ROUTES)[number];
+
+/**
+ * Not a route. A route renders *at* a URL; this renders *instead of* one, and
+ * the URL stays whatever the visitor typed. Keeping it out of `ROUTES` is what
+ * stops it appearing in the nav, the footer sitemap and the smoke walk, all of
+ * which enumerate `ROUTES`.
+ */
+export const NOT_FOUND = 'NOT_FOUND' as const;
+export type Location = Route | typeof NOT_FOUND;
+
+/**
+ * Anything `navigate` or `<Link to>` accepts: a route, optionally with a query
+ * and/or a hash.
+ *
+ * Two arms are enough. `` `${Route}?${string}` `` swallows a trailing hash as
+ * well, because `${string}` does not stop at `#`.
+ */
+export type Href = Route | `${Route}?${string}` | `${Route}#${string}`;

-function currentRoute(): Route {
+export function currentRoute(): Location {
   const path = window.location.pathname.replace(/\/+$/, '') || '/';
-  return (ROUTES as readonly string[]).includes(path) ? (path as Route) : '/';
+  return (ROUTES as readonly string[]).includes(path) ? (path as Route) : NOT_FOUND;
 }
+
+/**
+ * Scroll to an `#anchor`, or to the top when there is none.
+ *
+ * Deferred a frame because the target does not exist until React has committed
+ * the new route, and `scrollIntoView` on an absent element is a silent no-op —
+ * which is how an in-page link followed from another route lands at the top of
+ * the page and looks like it did nothing.
+ */
+function restoreScroll(hash: string): void {
+  requestAnimationFrame(() => {
+    const id = hash.replace(/^#/, '');
+    const target = id ? document.getElementById(id) : null;
+    if (target) target.scrollIntoView({ block: 'start' });
+    else window.scrollTo(0, 0);
+  });
+}

+/** Split an `Href` into its three parts. Path first, so it is never guessed. */
+function parts(to: Href): { path: Route; search: string; hash: string } {
+  const m = /^([^?#]*)(\?[^#]*)?(#.*)?$/.exec(to);
+  return { path: (m?.[1] ?? '/') as Route, search: m?.[2] ?? '', hash: m?.[3] ?? '' };
+}
+
 export function useRouter(): {
-  readonly route: Route;
-  readonly navigate: (to: Route) => void;
+  readonly route: Location;
+  /**
+   * The live query string, `?step=parking` and all.
+   *
+   * Returned as state rather than read off `window` by whoever needs it,
+   * because `EngineApp` mounts once and stays mounted (see `Root`): a
+   * `location.search` read on mount never re-runs, so a click from `/parking`
+   * to `/app?step=parking` would open whatever step was already showing.
+   */
+  readonly search: string;
+  readonly navigate: (to: Href) => void;
 } {
-  const [route, setRoute] = useState<Route>(currentRoute);
+  const [route, setRoute] = useState<Location>(currentRoute);
+  const [search, setSearch] = useState<string>(() => window.location.search);

   useEffect(() => {
     // Back and forward have to work. A single-page app that breaks the back
     // button is a page people stop trusting for reasons they cannot name.
-    const onPop = (): void => setRoute(currentRoute());
+    // The hash goes with them: `back` out of `/refusals#not-on-this-site` has
+    // to land where it was, not at the top of the previous page.
+    const onPop = (): void => {
+      setRoute(currentRoute());
+      setSearch(window.location.search);
+      restoreScroll(window.location.hash);
+    };
     window.addEventListener('popstate', onPop);
     return () => window.removeEventListener('popstate', onPop);
   }, []);

-  const navigate = useCallback((to: Route) => {
-    if (to === currentRoute()) return;
-    window.history.pushState({}, '', to);
-    setRoute(to);
-    window.scrollTo(0, 0);
-  }, []);
+  const navigate = useCallback((to: Href) => {
+    const { path, search: nextSearch, hash } = parts(to);
+    // Same route, same query, same hash: this used to early-return, which meant
+    // clicking the masthead while already on `/` did nothing at all — not even
+    // the scroll to top a reader clicking a masthead is asking for. Now the
+    // history entry is skipped and the scroll still happens.
+    if (
+      path === currentRoute() &&
+      nextSearch === window.location.search &&
+      hash === window.location.hash
+    ) {
+      restoreScroll(hash);
+      return;
+    }
+    window.history.pushState({}, '', `${path}${nextSearch}${hash}`);
+    setRoute(path);
+    setSearch(nextSearch);
+    restoreScroll(hash);
+  }, []);

-  return { route, navigate };
+  return { route, search, navigate };
 }
@@
 export function Link({
   to,
   navigate,
   className,
   children,
 }: {
-  readonly to: Route;
-  readonly navigate: (to: Route) => void;
+  readonly to: Href;
+  readonly navigate: (to: Href) => void;
   readonly className?: string | undefined;
   readonly children: React.ReactNode;
 }): JSX.Element {
```

`Root` then reads `PAGES[route]` for anything in `ROUTES` and renders `<NotFound />` for the
sentinel.

**The hidden-div strategy changes, and "keep it untouched" was wrong.** The first draft said to
keep it as it is, on the grounds that conditionally rendering `EngineApp` already threw away a
plot, a run and four acknowledged gates once. Both halves of that are true and they do not
combine into "untouched", because the strategy as written spans `/app` ↔ `/dashboard` only:
`Root.tsx:56` returns `<Landing />` early and unmounts the engine on `/`, and its own comment
says that is deliberate. Leaving it there while adding eight public routes means §4.5 §6 and §7
promise a run that survives navigation and the code discards it on the first click to `/`. The
resolution is §4.5 §6's latch: `engineMounted` starts false, flips true on the first navigation
to `/app`, never flips back, and the hidden div renders whenever it is true. Before the first
visit there is no run to lose and the public pages carry no engine; after it, every route keeps
the run. `Root`'s early return for `/` goes; the `/` branch simply renders `<Landing />` from
`PAGES` like every other page, with the hidden div beside it once the latch is set.

```ts
// apps/web/src/routes.json — data only, so `node` can read it too.
// [{ "path": "/", "title": "ENVELOPE — development capacity",
//    "description": "…", "navLabel": null, "footerLabel": "The answer",
//    "nav": "footer-only", "group": "product", "needsActor": false }, …]

// apps/web/src/pages.tsx — routes.json plus the one thing JSON cannot hold.
export interface PageSpec {
  readonly component: (p: PageProps) => JSX.Element;
  readonly title: string;        // becomes document.title; there is no per-route <title> today
  readonly description: string;  // og:description too — untested public copy otherwise
  /**
   * Two labels, not one, because §7 gives the same route different names in the
   * two places and both are right: "Readiness" in a five-item nav bar,
   * "Deployment readiness" in a footer column that has room to say it.
   * "One run in full" against "One run, printed in full". `/` is "The answer"
   * in the footer and carries the mark rather than a label in the nav.
   *
   * The first draft had neither field, which would have sent both label sets
   * back into hand-typed lists inside `SiteChrome` and `SiteFooter` — the exact
   * three-lists problem §2.1 prerequisite 2 exists to end, reintroduced by the
   * table meant to end it. `navLabel` is null for a route the nav does not name.
   */
  readonly navLabel: string | null;
  readonly footerLabel: string;
  readonly nav: 'primary' | 'footer-only';
  readonly group: 'claim' | 'product' | 'method' | 'reference';
  readonly needsActor: boolean;  // only '/app'
}
export const PAGES: Record<Route, PageSpec> = { /* … */ };

/**
 * The 404's own spec, deliberately outside `PAGES`.
 *
 * `NOT_FOUND` is not in `ROUTES` — that is what keeps it out of the nav, the
 * footer sitemap and the smoke walk — so `Record<Route, PageSpec>` has nowhere
 * to hold its title or its description. It gets a constant instead of a place
 * in the record, which is one line and keeps the sentinel a sentinel.
 */
export const NOT_FOUND_PAGE: PageSpec = { /* … */ };
```

`document.title` is set in one effect in `Root`, from `PAGES[route]` or from `NOT_FOUND_PAGE`
when the location is the sentinel. Today every route reports *ENVELOPE — development capacity*,
which is wrong in a tab strip and wrong in a bookmark. `og:description` comes from the same
field, for both, and is run through the prohibitions regexes, because social copy is public copy
and no test can see it today.

---

## 6. Content sources

### 6.1 The rule

Every figure on the public site resolves to a generated artefact. Every row below whose source
reads *written by hand* is **prose only** — it may not contain a count, a ratio, a dimension or
a currency.

**And every paragraph that appears on two pages has exactly one source.** The first draft
specified five of them twice, verbatim, and named a single source for only one — the five "does
not" items. Duplicated prose diverges: one copy gets edited in a design pass, the other does
not, and the site then says two things about the same refusal. So `apps/web/src/content/shared.tsx`
holds each as a named exported constant, both pages import it, and
`apps/web/test/shared-content.test.tsx` asserts that each constant is rendered by exactly the
routes listed against it here — an assertion that catches a copy pasted back in as easily as one
edited apart. This module is also the file R1's hand-written-copy scan runs over.

| Claim or figure | Source | Kind |
|---|---|---|
| Plot area, setbacks, footprint, coverage cap, tower plate cap, max levels by height, levels | `worked-example.json` `verified.*` ← `scripts/verify-worked-example.mjs` | figure |
| Podium and tower outlines, plot dimensions, road labels | `verified.podiumOutline`, `.towerOutline`, `input.plot.vertices`, `input.plot.edges[].roadHierarchy` | figure |
| Coverage headroom | `verified.coverageHeadroomM2` ← engine (prerequisite 7) | figure |
| Bands A/B/C, governing GFA, governing band, headroom, next binding band | `verified.bandAM2/.bandBM2/.bandCM2/.governingGfaM2/.governingBand/.headroomToNextM2/.nextBindingBand` | figure |
| Every derivation shown under a figure | `verified.formulas.*` — lifted off the provenance graph, never re-typed | figure |
| Bay area factor and its class | `verified.bayAreaFactorM2`, `.bayAreaFactorClass` | figure (amber) |
| Parking demand at the probe scheme | `verified.totalBays` — **labelled as demand** | figure |
| Parking supply | `verified.providedBays` ← `parking.providedBays` (new in `present.ts`) | figure |
| Bays the reported answer needs | `verified.demandAtGoverningBays` ← `demandAtGoverningBays` (new in `present.ts`) | figure |
| Units at the governing capacity | `verified.governingUnitCount` ← `governingUnitCount` (new in `present.ts`) | figure |
| Parking level rectangles, packing rectangle, module depth, area per bay, usable area, deductions | `verified.levelPlan.*` ← `run.levelPlan` (already serialised in full by `present.ts`) | figure |
| Bay dimensions for the row this run used | `verified.levelPlan.standard.*` | figure |
| Vehicle access recommendation, candidates, rejected edges, not-assessed residue | `verified.access.*` ← `run.levelPlan.access` | figure |
| Parking-in-FAR spread, both columns | `verified.parkingInFar.*` ← `POST /api/runs/parking-in-far-comparison` | figure |
| Level-plan refusal string | `verified.levelPlanRefusal` ← `run.levelPlanRefusal` | prose, engine-authored |
| The run's whole input | `input.*` | figure |
| Assumption basis strings | `input.run.*.basis` — **after prerequisite 8** | prose, engine-authored |
| Rules approved, definitions signed, invariants ran, annex version, blocking sentence, assumption exposure, deferred rules, volume, governing-band split | `readiness.json` ← `scripts/verify-readiness.mjs` (`GET /api/dashboard` in-process, against a store seeded **only** with the synthetic worked example, `recentRuns` written as `[]`, output scanned for the deletion list below and the build failed on a hit — §4.4) | figure |
| Invariant catalogue: id, statement, tolerance, dormancy reason, ran state | `invariant-catalogue.json` ← `packages/invariants/src/catalogue.ts` | figure |
| Rule library rows, citation-absentia fields, approval status | `rule-library.json` ← `packages/rules/src/seed/dubai-residential.ts` | figure |
| DXF layer names | `verified.exports.dxfLayers[]` ← `packages/exports/src/dxf.ts` `layerName` | figure |
| XLSX sheet names and note strings | `verified.exports.workbookSheets[]` ← `apps/api/src/workbook.ts` | figure |
| Run parameter table on `/inputs` | `input-schema.json` ← `scripts/generate-input-schema.mjs`, walking `runRequest` out of `apps/api/dist/schemas.js` | figure |
| Metric definitions and annex version | `definitions.json` ← `GET /api/definitions` | figure |
| Engine version, annex version | `SNAPSHOT.engineVersion`, `SNAPSHOT.readiness.annexVersion` | figure |
| The five claim statements and their statuses | `claims.json` ← `packages/validation/src/claims.ts` frozen constants | prose, engine-authored |
| The §16.4 independence paragraph | same | prose, engine-authored |
| The permanent disclaimer sentence | one exported `DISCLAIMER` constant | prose |
| The five "does not" items and their paragraphs | `content/shared.tsx`, moved out of `Landing.tsx` | prose |
| The IFC/glTF paragraph — `/refusals` §11 **and** `/exports` §7, word for word | `content/shared.tsx`, one exported constant | prose |
| The optimiser / `TRADEOFF` refusal — `/parking` §11 **and** `/refusals` §8 | same | prose |
| *Dormant is not a pass* — `/dashboard` §3 **and** `/method` §5 | same | prose |
| The `SEED_RULES` vs `loadSeedRulesForDevelopment` argument — `/dashboard` §3, quoted from the handler's own docblock | same | prose |
| The generate-vs-check thesis | `README.md:15-22` | prose |
| The refusal contract: 422, 409, 422-and-never-persisted | `README.md:167-170`, `apps/api/src/server.ts` | prose — status codes are identifiers, not measurements |
| Gate names G1–G4 | `apps/web/src/App.tsx`, `apps/api/src/server.ts` | prose |
| Clause references B.7.2.1, B.7.2.4 Table B.11, B.7.2.6.1, B.7.2.6.2, B.7.2.7 | the `Citation` objects on the encoded rules, serialised into the fixture — **never** `docs/01-extracted/` | prose |
| Why each layer's guarantee stops where it does | written by hand | **prose only** |
| Why amber is reserved for `ASSUMED` | written by hand | **prose only** |
| Why the boundary is enforced by the build | written by hand | **prose only** |
| Why a developer standard is not a rule | written by hand | **prose only** |
| Everything on `/404` | written by hand | **prose only** |
| Every "what this page did not prove" closing block | written by hand | **prose only** |

**Deleted from every page, with the reason.** The 15–35% parking-in-FAR swing — a typed
figure, superseded by the measured spread. Any page count of the source codes. Any test count
(the repository's own two figures disagree, 414 against 244, and both are typed). Any project,
client, year or country count for whoever built this. Any developer's efficiency benchmark,
unit-area cap or mix percentage. Any real plot number, community or affection plan. Any
competitor name or characterisation. Any price, timeline or payment term. Any quotation from,
or characterisation of, the confidential platform user guide. Any Arabic quotation, timestamp
or reference to the meeting record.

### 6.2 The verifier extension

One script, extended — never a second fixture. `scripts/verify-worked-example.mjs` already
boots the API in-process and injects with a build-time actor header. It gains:

1. `verified.levelPlan` and `verified.access` from `run.levelPlan`, which `present.ts` already
   serialises in full (`bayCount`, `areaPerBayM2`, `deductionsM2`, `moduleDepthM`,
   `usableAreaM2`, `standard`, `podiumRing`, `packingRect`, `rects[]`, `access`,
   `notAssessed`), plus `verified.levelPlanRefusal`.
2. `verified.providedBays`, `verified.demandAtGoverningBays`, `verified.governingUnitCount` —
   **these need three lines in `present.ts` first.** `governingUnitCount` and
   `demandAtGoverningBays` are on the pipeline output (`pipeline.ts:489-490`) and
   `parking.providedBays` exists on the parking result, but none of the three is on the wire.
   This is the one API change the site requires, and it exists because §4.2 §3 must
   distinguish demand from supply or the site prints one as the other.
3. `verified.parkingInFar` from a second injection to
   `POST /api/runs/parking-in-far-comparison` with the same recorded input.
4. `verified.exports.dxfLayers` and `.workbookSheets`, serialised from the export modules, so
   a renamed layer breaks `pnpm example`.
5. `verified.levelPlan.standard.structuralClearanceM` and `.standard.citation` — **two more
   lines in `present.ts`**, and the second API change the first draft missed. `/parking` §7
   promised both and neither is on the wire: `present.ts:180-189` emits five keys on `standard`,
   the structural clearance is the module constant `STRUCTURAL_CLEARANCE_M` (`layout.ts:104`),
   and the clause reference is `TABLE_B11` (`layout.ts:53`), a `Citation` used as a provenance
   rule inside the engine and serialised by nothing. Emit the clearance the layout actually
   charged, and the citation's `clauseReference`, `instrumentId`, `instrumentVersion` and
   `sourcePage` — never `sourceTextVerbatim`, which is code text this site does not republish.
6. **`assumptionExposure[].maxRelativeEffect` becomes `string | null`.** `/dashboard` §6 says an
   unmeasured sensitivity renders *not measured* and never `0.0%`, and the handler makes that
   impossible: `const effect = a.sensitivity?.relativeEffect ?? '0'` collapses null into zero
   before the page sees either. Drop the `?? '0'`, let null through, and skip nulls in the
   comparison. Three lines, and without them one of this document's own honesty rules is
   undeliverable.
7. **`scripts/generate-input-schema.mjs`** — `input-schema.json` from `runRequest` in
   `apps/api/dist/schemas.js`. `/inputs` §3 does not ship without it, so it is listed here with
   an owner rather than assumed into existence.

Two sibling scripts write the artefacts that do not come from a run:
`scripts/verify-readiness.mjs` (`readiness.json`, under §4.4's three constraints — seeded store,
`recentRuns: []`, output scanned against the deletion list) and a build step emitting
`invariant-catalogue.json`, `rule-library.json`, `claims.json` and `definitions.json`. All join
`pnpm example` and therefore `pnpm check`.

**Items 2, 5 and 6 are API changes and they are the only three.** Each exists because a page in
§4 must draw a distinction the wire currently flattens — demand from supply, a dimension from
its citation, an unmeasured sensitivity from a measured zero. None of them adds a computation:
the values exist in the engine and stop at the serialiser, which is the only kind of API change
this site is allowed to ask for.

**These are build-time scripts, not runtime code.** They are how the site's numbers can be
generated without the public bundle importing a single `@envelope` package — `apps/web`
depends on `react`, `react-dom` and `three` and on nothing else, and that must not change. A
content module that imported `packages/validation` to render the claim statements would put
engine code into a public bundle and create the first dependency edge, which is why the claims
arrive as JSON.

### 6.3 Contrast

`scripts/contrast.mjs` `PAIRS` is hand-maintained and already omits pairs the current landing
page paints. Add before the pages that reuse them: `--text-secondary` and `--text-tertiary` on
`--surface-base`; `--text-primary` and `--text-secondary` on `--surface-sunken`;
`--text-tertiary` on `--surface-sunken`; `--accent` on `--surface-sunken`; `--accent` on
`--accent-subtle`; `--uncertain-strong` on `--surface-raised`; `--deferred-hatch` on
`--surface-sunken`. Two more come from R6's recolouring: `--border-strong` on
`--surface-raised` at 3.0 for the `.lp-verdict` rule, and `--text-primary` on
`--deferred-surface` at 4.5 for the recoloured readiness tile. Every token named here resolves
today.

**Adding nine pairs by hand does not fix the mechanism, and the first draft stopped at
observing that it was one.** Eight new pages, a new verdict rule and the amber `ASSUMED`
treatment now required on `/` all introduce pairs, and nothing detects a painted pair nobody
added — which is NN#6 failing in the one place it is easiest to miss, because the checker still
prints a green summary. So `contrast.mjs` gains a second pass: it scans every stylesheet for
`var(--token)` appearing in a `color`, `background`, `background-color`, `border-*-color`,
`fill` or `stroke` declaration, and **fails on any painted token that no pair in `PAIRS`
mentions at all**.

State its limit honestly, because a gate oversold is worse than one absent: this proves every
painted colour is measured *somewhere*, not that it is measured against the surface it is
actually drawn on. Inferring the real background needs a laid-out page, which is `smoke.mjs`'s
territory and not a static scanner's. What it converts is a silent omission into a loud one,
which is the whole of the difference between the two failure modes this repository cares
about. An unmeasured pair is a failure, not a skip — a checker reporting zero failures over
pairs it never measured is the vacuous pass this codebase refuses everywhere else.

### 6.4 `apps/web/test/prohibitions.ts`

Exports `stripTags`, `group` and the pattern sets, so each page's test is a short file rather
than a 300-line copy. Carries, unchanged, the compliance patterns, the invented-number
patterns, the negated-`compliance check` rule, the claim-order assertion and the
figures-come-from-the-fixture assertions. Three changes:

- `/\bcertified\b/i` gains the same 60-character negation window `compliance check` already
  has, so *"no output of this engine is certified by any authority"* passes and *certified*
  standing alone does not. The same reasoning applies to `/\bfully compliant\b/i` and
  `/\bapproval[- ]ready\b/i`. `/security` is the page that would trip this first.
- New: the R1 banned-word set, **in two exports, not one**. `BANNED_IN_ALL_COPY`
  (*unfortunately, limitation, we hope to, just, simply, please note*) runs over rendered
  markup on every route. `BANNED_IN_HAND_WRITTEN_COPY` (*not yet, currently*) runs over the
  source of `content/shared.tsx` and the page modules, never over rendered markup — because
  §16.5's claim statement, which the site renders verbatim from `claims.json`, contains **NOT
  YET MEASURED** and *"architects who have not yet been engaged"*
  (`packages/validation/src/claims.ts:326-331`; on the page today at `Landing.tsx:590, 596,
  608`). A
  regex over markup would fail the most honest paragraph on the site. R1 has the argument; this
  is where it is enforced.
- New: `expectAssumedTreatmentPresent(markup)` — a presence assertion, not a prohibition,
  because no prohibition can catch a design pass that softens amber.
- New: `expectNoCountInHeadings(markup)` — R8's mechanical half. Any digit, and any of the
  number words `one`–`twelve`, in an `<h1>`–`<h3>` fails, with no allowlist, because a regex
  cannot tell an honest structural count from a marketing one and should not be asked to. R8's
  part 3 keeps identifiers out of headings for exactly this reason, and part 4's three permitted
  body-prose counts are copy-review items rather than test exemptions.

---

## 7. Navigation

**Primary nav** — five links and one button, generated from `PAGES` where `nav === 'primary'`,
labelled from `navLabel`. *Parking* → `/parking`. *Method* → `/method`. *What it refuses* →
`/refusals`. *Readiness* → `/dashboard`. *One run in full* → `/worked-example`. Then
`[Run a plot]` → `/app?step=intake`. `/` is reached by the mark and carries `navLabel: null`.

*What it refuses* occupies the slot a conventional B2B site gives to *Why us*, and that is the
decision. `/parking` leads because it is where the product's real work is, and the label is
the capability, never a governance claim (R10).

**Footer** — four columns, generated from `PAGES.group` and labelled from `footerLabel`:

1. **What it does not claim** *(first, deliberately)* — What it refuses `/refusals` ·
   Deployment readiness `/dashboard` · The rule library `/rules`
2. **The product** — The answer `/` · Parking `/parking` · What it needs from you `/inputs` ·
   What comes out `/exports` · Run a plot `/app`
3. **How to check it** — Method `/method` · One run, printed in full `/worked-example`
4. **This deployment** — engine version and annex version, read from `readiness.json` and never
   typed · *"Readiness, not uptime — nothing here monitors availability."*

**No *(later)* entries, and the first draft's two are deleted rather than styled.** It listed
`/security` in column 1 and `/glossary` in column 3 as *(later)*, which three other sections
contradict: §2 keeps unbuilt routes out of `ROUTES`, §5 types `PAGES` as `Record<Route,
PageSpec>`, and §4.13 says *"until each clears the footer omits the link"*. A footer generated
from `PAGES` structurally cannot contain a route that is not in `PAGES`, so the entries could
only have been hand-typed back in — the one thing this section exists to stop. §4.13 is right
and the footer follows it: an empty slot is the correct state, and a greyed-out link to a page
that does not exist is a promise with a date attached, which R2 forbids in words already.

**Legal row**, full width, on every route including `/app` and `/dashboard`, rendered from the
one `DISCLAIMER` constant with a test asserting every route in `PAGES` emits it: the mark, then
*"ENVELOPE · Phase 0 · Regulatory validity is never assessed and never claimed. This engine
reports what its encoded rules imply. It is not a compliance check and no part of it
substitutes for professional review."* **No copyright line and no entity name** until the owner
supplies one — asserting a company that does not exist is the same class of defect as asserting
an accuracy figure.

**Mobile.** Below 46 rem the nav links are `display: none` today, which leaves a phone reader
scrolling the whole page with no table of contents and no way to reach the refusals. They become
a disclosure button instead — `aria-expanded`, `aria-controls`, a real `<button>`, closing on
Escape and on route change — whose **first item is *What it refuses***. The `[Run a plot]`
button stays visible at every width and is never collapsed into the menu.

Below the nav, R13 governs: `/rules`'s table, `/worked-example`'s coordinate lists and
`/parking`'s drawing and comparison each state their own behaviour in their own section, because
`noSidewaysScroll` fails on all four otherwise and a rule stated only here would be a rule
nobody reads at the moment they need it.

**Skip link.** `.lp-skip` ships on every route, including `/app` and `/dashboard`, which have
none today. It targets `#main` and is off-screen until `:focus-visible`.

**And `#main` has to be unique, which under the latch it would not have been.** `id="main"`
exists once today, at `Landing.tsx:347`; `Root`'s `<main className="layout">` (`Root.tsx:89`)
has none. Once every public page carries a `#main` and `EngineApp` stays mounted in a `hidden`
div beside them (§4.5 §6), any page rendered alongside the engine would have two elements with
that id and the skip link would resolve to whichever came first — usually the hidden one, which
is a skip link that focuses nothing a sighted keyboard user can see. So: `SiteChrome` owns the
single `<main id="main">` and every page renders **into** it; no screen component declares the
id itself, and `Landing.tsx:347` loses it in the same change that lifts the header. A test over
every route asserts exactly one `#main` in the document, engine mounted and unmounted.

**Entering and leaving `/app`.** Public CTAs carry one of two hints (§4.5 §3): `?step=intake`,
`?step=parking`, `?step=parameters`, `?step=export` select a step, and
`?demo=worked-example` loads the recorded run. The fold CTA on `/` carries the demo hint,
because *run this plot yourself* has to run this plot. The antechamber (§4.5) is the first
screen behind all of them and explains why a name is asked for before asking for it. Leaving:
the site nav is present on every step, so a reader can re-read the claim statement mid-run
without losing the run — which the latch in §4.5 §6 is what makes true; after an export the
terminal state links to `/dashboard`, and after a blocked run it links to `/refusals` to say
that a refusal to compute is designed behaviour rather than a failure.

**Entering and leaving `/dashboard`.** Public, above the actor check. Signed out it renders the
snapshot and says so in its first line; signed in it fetches live and additionally shows the
recent-runs table, which carries reviewer names. It exits to `/refusals` and to `/rules`, and
it never links to itself as *status* in the availability sense.

---

## 8. What every page must never say

Consolidated so no page brief has to restate it, and so the shared test can assert it.

*Certified* (unnegated) · *fully compliant* (unnegated) · *approval-ready* (unnegated) ·
*regulator-approved* · *ensures / guarantees / verifies / confirms / delivers compliance* ·
*compliance check* without a negation in the preceding 60 characters · any accuracy, speed,
cost or time-saved percentage · *trusted by* · any customer, client, firm, developer or
architect count · *industry-leading* · *enterprise-grade* · *encrypted at rest* · *SOC 2* ·
*ISO* · *role-based access control* · *bank-grade* · a health score, an overall score, a
readiness percentage, *all systems operational* · *realistic*, *expected* or *likely* capacity ·
any statement that a scheme complies, is approved, or would be approved · any band-governance
claim in static prose, a heading, a nav label or a route name · any count, ratio or dimension
typed into rendered copy, and any digit at all in an `<h1>`–`<h3>` · **any control the software
does not perform — separation between author and reviewer, a verified licence, a gate that
stands where it does not** (R11) · any claim about what third-party software will do with a
file we write · *unfortunately*, *limitation*, *we hope to*, *just*, *simply*, *please note*
(rendered markup, every route) · *not yet*, *currently* (hand-written copy; the engine-authored
claim statement is exempt and R1 says why) · any real plot number, community, affection plan,
developer standard, brief figure, competitor name, price, timeline, meeting reference, or
quotation from the confidential platform guide.

---

## 9. Open questions for the client

Four, and only four. Everything else in this document is decided.

**Q1 — The public deployment's posture.** `/security` cannot ship, and no public page may
describe the authorization gap, until it is decided whether the demonstration is
network-isolated, seeded only with the synthetic worked example, or not publicly reachable at
all. The gap itself — identity taken from a request header and verified by nothing, no
authorization check, any identified actor able to read, gate and export any run — must be
disclosed to the client **in writing** regardless, and that disclosure is not a website task.
It is already disclosed in `apps/api/src/server.ts`; it must not be discovered.

**Q2 — May the source specification be characterised publicly?** `/method` §7 states that the
pipeline as specified cannot compute its own worked example. That is true, it was found by
building it, and it is the most credible engineering paragraph available. It is written here
with no quotation and no attribution, which is safe. A stronger version — naming the document,
quoting its own worked figures, listing its internal count discrepancies — needs written
confirmation from the project owner that the document may be characterised publicly and that
it is not attributed to any client. Without that confirmation the section stays as drafted and
nothing more is added.

**Q3 — The entity.** `/contact` and the footer's ownership line are blocked on a legal entity
name, jurisdiction and a business address the owner is willing to publish. Nothing in this
repository may be used: the only phone number in it belongs to a prospective client, and the
personal address and mobile in the proposal are not public contact details. Until this clears
there is no contact route and the footer says nothing about ownership.

**Q4 — The name.** The engine and the application say ENVELOPE; every delivery artefact says
TOP.ai. This document assumes ENVELOPE throughout — every route, title, footer line and
`<title>` tag. Commercial ownership of the name is unsettled, and retrofitting a name across a
site whose entire discipline is that nothing drifts would be a poor first demonstration of the
discipline. It has to be decided before the first page is written, not after.

**Decided here, not asked.** The site is English-only and left-to-right for this build. The
primary reader is Arabic-speaking, a publication-quality Arabic proposal already exists, and a
dir-flipped bilingual print system has been built once in this repository — so an Arabic
edition is clearly wanted eventually. It is not a translation pass: IBM Plex Sans and Mono are
Latin-only, so the Arabic type stack is unsolved, the RTL layout is a second full pass over
every one of these pages, and the amber-means-uncertainty vocabulary has to be re-established
in Arabic before a single amber chip can be trusted there. Shipping a half-translated honesty
vocabulary would be worse than shipping none. It is scoped as a second edition, and it is named
here so that it is a decision rather than a default.

---

## 10. Review

This document was reviewed against the source before any page was written. The review found
eight breaches of a non-negotiable and twenty-six gaps; every claim in it was re-verified
against the files it cited before being acted on, and four of its findings turned out to be
wrong. What follows is the record, because a spec that quietly absorbs its own corrections is
the same object as a page that quietly absorbs a changed figure.

**The eight breaches, all fixed.**

1. **An unenforced control asserted on three public pages.** Four sentences claimed a separation
   between author and reviewer — *"none available until two people have put their names to
   it"*, *"G4 requires a reviewer who is deliberately not the author"*, and two more. `canReview`
   (`identity.ts:88-90`) tests that a licence string is non-empty; it is the only check the G4
   handler makes (`server.ts:878`), it never compares the actor to `run.createdByActorId`, and
   it verifies nothing. This is the softest form of the compliance claim and it sat in the hero
   of the page designed to be forwarded to a lawyer. Now **R11**, a global rule; `/refusals` §7
   states the missing control as the page's strongest item; §4.11 §1, §4.11 §6 and §4.5 §1
   rewritten.
2. **"Nothing exports before four gates."** `EXPORT_GATES` is `[G3, G4]` (`gates.ts:117-118`);
   the handler's own docblock says so (`server.ts:903`) and the G1/G2 hashes it computes at
   `:917-918` are never read. Fixed in §4.11 §6 and in §4.3 §2, which had the same error and
   which the review did not flag. `README.md:167-170` carries it too, and the document now warns
   whoever copies from it.
3. **"Why R12: it is the version everything reads."** An unverifiable universal claim about
   third-party software, forbidden five items later on the same page. §4.11 §2 now states what
   the writer emits and why, and makes no claim about what will open it.
4. **Amber for a readiness state.** R6 audited `.lp-verdict` and `.lp-claim--partial` and
   stopped. `.stat--partial` (`landing.css:899`) is `--uncertain` / `--uncertain-surface`, is
   emitted for the invariants tile at `Dashboard.tsx:386`, and this plan makes that page public.
   R6 now carries four rulings and states its own scope; §2.1 prerequisite 6 recolours the tile
   to the deferred pair and renames the state.
5. **A permission claim as the h1.** *"What can be built on this plot"* asserts buildability in
   the largest text on the site. Now *"What these rules imply for this plot…"*, which is the
   engine's own thesis as quoted twice elsewhere in this document.
6. **R8 broken by the document's own headings — eleven of them, two already shipping.** R8 now
   states its scope in four parts, including one narrow permitted carve-out with a register, and
   every offending heading is rewritten at the point it occurs.
7. **R1's exception was unimplementable and R7 failed R1.** No regex detects "a sentence that
   names a human". Worse, an absolute ban on *not yet* would fail §16.5's own **NOT YET
   MEASURED** and *"architects who have not yet been engaged"*, which the site renders verbatim
   and which are on `/` today at `Landing.tsx:590, 596, 608`. R1 now splits the banned set by
   where it is asserted; R7 no longer quotes the strings it bans.
8. **`readiness.json` would have shipped confidential data.** As a build-time dump of `GET
   /api/dashboard` it carries `recentRuns`, and `summariseRun` emits `plotNumber`, `community`,
   `createdBy` and `reviewer`. §4.4 now constrains the generator three ways — a store seeded
   only with the synthetic worked example, `recentRuns: []`, and a scan of its own output against
   §6.1's deletion list that fails the build.

**Four findings that were wrong, and are recorded rather than acted on.**

- *"On a clean store the public tile is `null of 18`."* It is not: `Dashboard.tsx:122-129`
  already renders `—` when `invariantsRan === null`. The real defect is one layer along — the
  hardcoded `?? 18` denominator — and §4.4 §3 names that instead.
- *"Signed-in `/dashboard` has no loading state."* It has one, at `Dashboard.tsx:62`. What the
  document adds is a prohibition on replacing it with a figure-shaped skeleton.
- *"`coverageHeadroomM2` and the three parking figures render `undefined m²`."* They do not:
  `resolveJsonModule` types the fixture from its own contents, so reading an absent key is a
  compile error and `apps/web` is in `tsc -b`. The gap was real for a different reason — no page
  said what it renders before the prerequisite lands — and §4.7 now carries both the mechanism
  and the degradation clause.
- *"`.lp-status--partial` is the same question and is also unruled."* It is the status chip
  inside the `.lp-claim--partial` row already ruled on, emitted from the same value at
  `Landing.tsx:616-620`. R6 now rules it explicitly, as inherited rather than new.

**The larger repairs.** The router diff typed away the query string every CTA depends on, so
`navigate` and `Link` now take an `Href` and a regex splits path, query and hash; `useRouter`
returns `search` as state, which is also what lets a step hint re-fire on a client-side
navigation into a component that mounts once. `Root`'s early return for `/` unmounted the engine
and contradicted the run-survives-navigation promise in two sections; the resolution is a latch
that mounts the engine on first arrival at `/app` and never unmounts it, so the public pages pay
nothing before that and the run survives everything after. Route metadata splits into
`routes.json` — data the two `.mjs` scripts can actually read — and `pages.tsx`, which adds the
components; `PageSpec` gains the two label fields the nav and footer need; `NOT_FOUND_PAGE`
gives the 404 the title slot the record could not hold. Test coverage, contrast coverage and the
five twice-specified paragraphs each get a mechanism instead of a hand-maintained list. `/404`
constrains the path it echoes and names its status-code residue. `/exports`, `/rules` and
`/worked-example` get the degradation clauses `/parking` and `/method` already had. R12 carries
the transform-only reveal onto the eight new pages with a gate that looks; R13 makes each
data-heavy page state its own behaviour below 46 rem.

**Three things this review did not do.** It did not audit `app.css`'s fourteen further
`--uncertain*` rules behind `/app`; R6 says so rather than implying coverage. It did not
re-litigate §9's four open questions. And it did not touch a section the review did not fault —
the verification work those sections rest on was re-checked and holds: `pipeline.ts:367/453`,
`parking.ts:306`, `BAY_STANDARDS`' six rows, `present.ts` serialising `levelPlan` in full while
`providedBays`, `demandAtGoverningBays` and `governingUnitCount` stay off the wire,
`landing.css:518` and `:899`, `Landing.tsx:415`'s float subtraction, `/api/rules` returning
`approved: []`, and the comparison endpoint's keys — of which there are six, not the five §4.2
§10 named, now corrected.
