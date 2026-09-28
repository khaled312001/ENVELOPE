# TOP.ai — image prompts

**كيف تستعمل الملف:** كل صورة لها رقم، ومكان محدد في الموقع، ومقاس، والبرومبت بالإنجليزي جاهز
للصق في أي مولّد صور. ابعت لي الصور بالأسماء المكتوبة في `filename` وأنا أركّبها في مكانها.
البرومبت الكامل = **§0 House style block** + برومبت الصورة نفسها. الصق الاتنين ورا بعض.

---

## 0 · House style block — prepend to every prompt

> **هذه الكتلة أُعيد كتابتها في 29 سبتمبر 2026.** النسخة الأولى كانت «رسم متجه مسطّح،
> رماديات جرافيت، بلا تدرّجات، بلا ظلال، أقرب إلى رسم مساحي منه إلى موقع منتج» — وهو
> الأسلوب الذي رفضتَه صراحةً بوصفه باهتًا وقديمًا. هذه النسخة ملوّنة وذات عمق، وتطابق
> الهوية التي صارت على الموقع فعلًا: نطاق أزرق `#e0eafb` في الفاتح و`#182339` في الداكن،
> ولون فاعل `#2b5cd9`، وزوايا مستديرة، ولوحات مرفوعة بظلّ خفيف. **القواعد الخمس الصارمة
> أسفلها لم تتغيّر ولا تُناقش** — هي عن نزاهة المنتج لا عن ذوقه.

> Modern technical illustration for an engineering product, in a cool blue identity.
> Isometric or orthographic; perspective only where an entry says so. Rounded corners
> (4–14px) on any panel or card shape. Soft, believable depth: one low-contrast ambient
> shadow and gentle two-stop gradients are welcome; no hard drop shadows, no glows, no
> bevels, no glass-morphism blur. Confident line weight, not hairline.
>
> **Palette — cool blues and graphite, and nothing else.** Deep navy `#182339`, ink
> `#14161c`, slate `#2e3139`, grey `#55555f`, `#84878e`, `#c8cbd3`; band blue `#e0eafb`,
> pale blue `#eaf0fd`, mid blue `#9dbaf8`, accent blue `#2b5cd9`, deep accent `#1f47b0`;
> paper `#ffffff`. A single desaturated teal `#2f7f7a` is permitted as a secondary accent
> where an entry asks for one. **No other hues.**
>
> Generous, even light. Materials may read as matte surfaces — paper, anodised metal,
> frosted glass — never as chrome or plastic. Composition centred with generous margin,
> or asymmetric where the entry says so.
>
> No text, no numerals, no labels, no legends, no captions, no watermarks, no logos, no
> flags, no badges, no UI chrome, no browser frames, no device mockups, no human figures,
> no faces. Nothing that reads as a screenshot of software. Transparent background unless
> the entry says otherwise.

### The five hard rules — a violation means the image is rejected

**لم تتغيّر واحدة منها.** كل واحدة منها عن شيء يبيعه المنتج، لا عن شكل الصورة.

1. **No legible digits, anywhere.** Not on a dimension line, not on an axis, not on a card,
   not blurred in the background. This product's entire claim is that every number on screen
   was produced by the engine and carries its derivation. A decorative fake figure in an
   illustration is the same defect as a fake figure in a report.
2. **No amber, no orange, no yellow — ever.** `#f0b45c` and `#a87a32` are reserved
   exclusively for `ASSUMED` values, in the UI, in the drawings, in the 3D model and in the
   `.glb` file palette. Teaching a reader that amber is a decorative colour destroys the one
   signal the product cannot afford to lose (PRD §13.1). Only image **#12** may contain
   amber, and there it *is* the subject.

   > هذه القاعدة صارت **أهمّ** بعد تلوين الموقع، لا أقلّ. `scripts/contrast.mjs` يفرض أن
   > تكون أرضية الكهرماني أشدّ الأسطح إشباعًا في النظام كله — وقد رفض النطاق الأزرق فعلًا
   > عند إشباع 31 مقابل 29 للكهرماني حتى خُفِّض إلى 27. صورةٌ فيها برتقالي تنقض ذلك من
   > خارج ما يستطيع أي فاحص قياسه.

3. **Nothing that implies approval, compliance or authority.** No stamps, no seals, no
   ticked checklists, no certificates, no municipality or government marks, no Dubai skyline
   that reads as an official endorsement. The product says `REGULATORY VALIDITY: NOT
   ASSESSED` on every output; an illustration must not quietly contradict it.
4. **No people, no logos, no customers.** There are no customers to depict and no third
   party has licensed their mark to us.
5. **No red** except in image **#24**, where it is the subject.

### Delivery

| | |
|---|---|
| Vector subjects (#3–#17, #19–#21, #23–#25) | **SVG** preferred — it scales, it is kilobytes, and it re-inks per theme. If the generator only emits raster: PNG, transparent, at the stated width **×3**. |
| Raster-only subjects (#1, #2, #18, #22) | PNG or WebP at the stated width ×2 and ×3. I convert to AVIF + WebP with a PNG fallback. |
| Dark variant | Only where the entry says `dark: yes`. Same geometry, re-grounded: paper `#0c0e11`, panels `#182339`, lines `#c8cbd3`, accent `#7ba3f5`. Name it `<filename>-dark.<ext>`. |
| **Where they land** | **`apps/web/src/assets/img/`** — not `public/`. `src/img.tsx` globs that directory at build time, so a file dropped in is used and a name with no file renders **no element and makes no request**. There is no manifest to update and no 404 to chase. `og-cover.png` is the one exception and goes in `apps/web/public/`, because a link scraper needs a stable unhashed URL. |
| Naming | Exactly the `filename` in each entry. The extension may be any of `svg png avif webp jpg`. |

---

## 1 · Brand and social

### #1 — `og-cover.png`
**Where:** `apps/web/index.html` → `og:image` / `twitter:image`. The card shown when the link
is pasted into WhatsApp, Slack or LinkedIn. **Size:** 1200 × 630. **dark:** no.

> A single irregular land parcel seen from directly above, drawn as a closed polygon of six
> unequal straight edges with one gently curved edge. Inside it, a smaller polygon offset
> inward by a uniform margin — the buildable envelope — drawn in the accent blue `#2b5cd9`
> as a thin outline with a very light blue fill. Outside the parcel, thin double lines on two
> sides indicating roads. Four small solid square tick marks sit on the parcel's corners.
> Cool near-white ground `#f6f8fd`, a faint 10 mm graphite grid behind everything at very low
> opacity. The parcel sits left of centre; the right third is empty for a title to be set over
> it later. Precise, with soft ambient depth and a gentle two-stop wash in the envelope fill.

**alt (en):** A plot outline with the buildable envelope offset inside it.
**alt (ar):** حدود قطعة أرض، وبداخلها الظرف البنائي مزاحًا للداخل.

---

### #2 — `mark.svg`
**Where:** the site header, the favicon set, the PDF cover, the app icon.
**Size:** square, drawn on a 64 × 64 grid, legible at 16 px. **dark:** yes.

> A monogram-scale mark, not a picture. A closed quadrilateral with one corner chamfered —
> a plot — and inside it, a second quadrilateral offset inward by an even margin, sharing the
> chamfer. Two elements only. The outer shape is a 4 px stroke in graphite `#14161c` with no
> fill; the inner shape is a solid fill in graphite `#2e3139`. No blue, no amber, no circle,
> no shield, no letterform, no gradient. It must survive being rendered at 16 × 16 px in a
> browser tab and being printed in one ink.

**Why amber is forbidden here in particular:** a logo is the most-repeated element on a site.
The brand mark used `--uncertain` once already and it was removed for exactly this reason.

**alt (en):** TOP.ai
**alt (ar):** TOP.ai

---

## 2 · Landing page section figures

Each sits in the `.section__head` of an existing section in
[Landing.tsx](apps/web/src/screens/Landing.tsx), at the inline end, as a quiet figure — not a
hero. **Size:** 640 × 480 unless stated. **dark:** yes for all five.

### #3 — `lp-capacities.svg`
**Where:** `#capacities`, the three-band section.

> Three vertical bars of different heights standing on a common baseline, drawn as thin
> outlined rectangles, evenly spaced. The shortest of the three is filled solid in accent
> blue `#2b5cd9`; the other two are empty outlines in graphite `#55555f`. A thin horizontal
> line runs across all three at the height of the shortest bar and continues past the group
> on both sides. No axis, no scale, no ticks, no numbers. The point being made is *the
> smallest one governs* — nothing else.

**alt (en):** Three bands of different heights; the shortest one is picked out, and a line
carries its height across the other two.
**alt (ar):** ثلاثة نطاقات بارتفاعات مختلفة؛ الأقصر مميّز، وخط يمدّ ارتفاعه عبر الاثنين الآخرين.

---

### #4 — `lp-parking.svg`
**Where:** `#parking-number`, the parking section.

> A rectangular floor plate seen from directly above. Inside it, two rows of small identical
> rectangles standing perpendicular to a wide central aisle — parking bays. At one end, a
> long tapering parallelogram crossing two of the rows at a shallow angle — a ramp. The bays
> are thin outlines in graphite `#2e3139` with no fill. The aisle is an empty channel bounded
> by two parallel lines. The ramp is drawn in a distinctly different treatment: an outline
> with a sparse 45° hatch in `#84878e`. The plate's own boundary is a heavier line. No cars,
> no arrows, no dimensions, no bay numbers.

**Note:** the ramp's hatch stands for `DEFERRED`, not for an assumption — gradient, transitions
and headroom are NOT ASSESSED. It must not be amber and it must not match the bays.

**alt (en):** A parking level in plan: two rows of bays either side of an aisle, with a ramp
crossing at a shallow angle.
**alt (ar):** مستوى مواقف في المسقط: صفّا مواقف على جانبَي ممر، ومنحدر يعبره بزاوية ضحلة.

---

### #5 — `lp-guarantees.svg`
**Where:** `#guarantees`.

> A small directed graph, drawn as an acyclic tree that grows downward. One node at the top
> drawn as a solid filled square in accent blue `#2b5cd9`; below it four nodes as empty
> outlined squares; below those, seven smaller nodes, some outlined, some drawn with a dotted
> stroke. Straight connectors at a confident weight, orthogonal only — horizontal and vertical runs with square
> elbows, never diagonals or curves. Every leaf node terminates in a short horizontal stub
> that stops at a common vertical rule on the right, as if each one cites a source. No labels.

**alt (en):** A value at the top of a graph, resolving downward through the values it was
derived from until every branch reaches a citation.
**alt (ar):** قيمة في أعلى مخطّط، تتفرّع نزولًا عبر القيم المشتقّة منها حتى يبلغ كل فرع مرجعه.

---

### #6 — `lp-claims.svg`
**Where:** `#claims`, the five-way claim statement.

> Five horizontal bars of identical length stacked with even gaps, each drawn as a thin
> outlined rectangle. The first three are empty. The fourth is empty but its outline is
> dotted. The fifth is crossed out edge to edge by a single thin diagonal line. Graphite
> `#2e3139` throughout; no blue. The composition must read as a printed schedule, not as a
> progress indicator — no fills, no percentages, no ticks, no crosses in boxes.

**alt (en):** Five statements of the same weight; the last is struck through.
**alt (ar):** خمس عبارات بالوزن نفسه؛ الأخيرة مشطوبة.

---

### #7 — `lp-limits.svg`
**Where:** `#limits`, "what it does not do".

> A large rectangle drawn with a solid boundary on three sides and an open fourth side, the
> open side indicated by the boundary simply stopping — no dashes, no arrow, no fade. Inside
> the closed region, a dense field of small solid graphite squares in a regular grid. Outside
> the open side, the same grid continues but the squares are drawn as empty outlines and are
> progressively more widely spaced until they stop. Nothing marks the boundary as a wall or a
> barrier; it is an edge of knowledge, not a fence.

**alt (en):** A filled region inside a boundary that is open on one side; beyond the opening
the field thins out.
**alt (ar):** منطقة ممتلئة داخل حدّ مفتوح من جهة؛ وراء الفتحة يخفّ المجال حتى ينتهي.

---

### #8 — `lp-hero-backdrop.svg`
**Where:** behind the `.lp-hero` fold, at very low opacity, non-semantic decoration.
**Size:** 1920 × 900. **dark:** yes.

> A survey-sheet ground: a 10 mm square grid in `#eef1f8` with every fifth line slightly
> heavier, covering the whole canvas. Over it, three or four unrelated parcel outlines at
> different scales and rotations, drawn in `#c8cbd3` at hairline weight, overlapping each
> other and running off every edge of the canvas — as if several drawings were laid on one
> table. No fills, no accent colour, no focal point, nothing that competes with text set over
> it. It must be invisible at a glance and only resolve when looked for.

**Critical constraint:** this sits behind the fold, and the fold is measured. `pnpm amber`
counts the amber area on the first screen against what competes with it, and `pnpm contrast`
measures every pair over its real ground. A backdrop that lifts the ground's luminance
anywhere near the hero text fails both. Keep every stroke lighter than `#eef1f8`.

**alt:** decorative — ships with `alt=""` and `aria-hidden="true"`.

---

## 3 · The nine-step flow — one explainer per step

These are the answer to a specific piece of client feedback: *"Assumptions مش فاهمها"*,
*"في بعديها rules بصراحه مش فاهمها"*, *"وفي حجات موجوده مش مفهومه بالنسبالي"*. Each step gains
a small figure at the top of its panel that shows what the step is *for* before any field is
read. **Size:** 480 × 320. **dark:** yes for all.

### #9 — `step-0-sheet.svg` — Sheet
> A portrait sheet of paper seen flat, drawn as a confidently outlined rounded rectangle with a soft ambient shadow. Across its upper
> half, four short horizontal rules of unequal length standing for lines of print. In its
> lower half, a small parcel outline. To the right of the sheet, six small empty squares in a
> vertical stack; four of them are connected back to a rule or to the parcel by a thin
> orthogonal leader line, and **two are left unconnected**. No text on the sheet — the rules
> are blank. The two unconnected squares are the subject: what the sheet does not say.

**alt (en):** A sheet with some of its values traced out to a list, and two entries in the list
left unconnected.
**alt (ar):** صفحة تتفرّع منها قيم إلى قائمة، واثنتان في القائمة بلا مصدر.

---

### #10 — `step-1-plot.svg` — Plot
> One irregular parcel seen from above: seven straight edges of clearly unequal length plus
> one circular arc edge, closing cleanly. Each edge carries a short perpendicular tick at its
> midpoint. Two adjacent edges have a double line drawn parallel and outside them at a small
> offset — roads. One further edge is drawn against a solid hatched band — a neighbouring
> plot. One edge is drawn plain. No dimensions, no bearings, no numbers, no compass.

**Why the arc:** *"الاراضي عموما كتير بتكون فيها كذا مقاس و كسور و كيرفات مش بتكون مستطيلله او
مربعه بس"*. The figure must show the plot the client actually works with, not the rectangle the
form currently accepts.

**alt (en):** An irregular plot of eight edges, one of them curved, with roads on two sides and
a neighbouring plot on a third.
**alt (ar):** قطعة غير منتظمة من ثمانية أضلاع، أحدها منحنٍ، وطريقان على جانبين وجار على ثالث.

---

### #11 — `step-3-rules.svg` — Rules
> Two stacked horizontal bands of equal width. The upper band is drawn with a solid boundary
> and is subdivided by thin vertical rules into four unequal cells. The lower band sits
> clearly detached from it, separated by a visible gap, and is drawn with a **dotted** boundary
> and no subdivisions. A thin bracket spans the upper band only. The two bands must read as
> *counted* and *not counted* — one measure applies to the top, and the bottom is outside it.

**What it states:** *"الباركنج مش بيتحسب في ال FAR دا منفصل"*. The figure carries the shape of
that fact; the screen still asks the user to declare it, because `FR-DEF-002` allows no
default. See the plan, §3.3.

**alt (en):** A measured band subdivided into parts, and a second band below it, detached and
outside the measure.
**alt (ar):** نطاق مقيس مقسّم إلى أجزاء، ونطاق ثانٍ تحته منفصل وخارج القياس.

---

### #12 — `step-4-assumptions.svg` — Assumptions
**The only image in this set permitted to contain amber.** Here amber *is* the subject.

> A vertical list of six horizontal rows of identical height, drawn as thin outlined
> rectangles with a small square at the start of each row. Four rows are entirely graphite.
> **Two rows** are drawn differently and unmistakably: a 2 px left edge in amber `#a87a32`, a
> very pale amber fill `#fdf3e0`, and their leading square is solid amber — *and* those two
> rows additionally carry a short dotted underline beneath the row and a small solid triangle
> in the leading square. The amber rows must be the loudest thing in the image by a clear
> margin.

**Two requirements, both load-bearing.** The colour must not be softened for balance — §13.1
calls this "the most important UI decision in the product" and a review that tones it down has
failed. And the dotted underline and the triangle are not decoration: colour alone fails WCAG
1.4.1, fails in greyscale print, and fails for readers with colour vision deficiency. This
report is printed and taken into rooms.

**alt (en):** A list of values in which two are marked as assumed, by colour and by a second
non-colour cue.
**alt (ar):** قائمة قيم، اثنتان منها موسومتان كافتراض، باللون وبعلامة ثانية غير لونية.

---

### #13 — `step-5-capacity.svg` — Capacity
> An axonometric stack of plates, each a confidently outlined quadrilateral with a faint top-face wash, lifted one above
> another on a shared vertical axis with even spacing. The lower three plates are larger and
> share one footprint — a podium. The upper seven are smaller, share a different footprint,
> and are inset from the podium's edge on two sides. Vertical lines connect the corners
> of consecutive plates. **A vertical prism runs through every plate from the lowest to the
> highest, in the same position on each — the core.** The core is drawn as a solid outlined
> rectangle in accent blue `#2b5cd9` with a light fill. No ground, no sky, no context, no
> façade, no thickness on any plate.

**Why the core is in the picture:** *"و الاهم ال core لازم يكون في الحسبه"*. The figure may not
promise it before the engine places it — this image ships **with** the core work in Phase C of
the plan, not before. See the plan, §3.6.

**alt (en):** A stack of floor plates with a podium below and a tower above, and a core running
through every level.
**alt (ar):** رصّة بلاطات أدوار: قاعدة بالأسفل وبرج بالأعلى، ونواة تخترق كل المستويات.

---

### #14 — `step-6-parking.svg` — Parking
> A parking level in plan, more developed than **#4**. A rectangular plate. Three rows of bays
> perpendicular to two aisles that meet in a T. A ramp entering from one edge, drawn as a
> tapering parallelogram with a sparse 45° hatch. In each bay of one row only, a schematic car
> in plan — a plain rounded-off rectangle with two small rectangles for the windscreen and
> rear screen, no wheels, no detail, all in `#c8cbd3` — showing that the bays are occupied by
> something with a size, not just ruled. One bay in a corner is drawn wider than the others
> with a second, parallel line inside it. No numbers on the bays, no arrows on the aisles.

**alt (en):** A parking level: rows of bays, two aisles meeting in a T, a ramp entering from
one edge, and cars standing in one row.
**alt (ar):** مستوى مواقف: صفوف مواقف، وممرّان يلتقيان على شكل T، ومنحدر يدخل من أحد الأطراف، وسيارات في أحد الصفوف.

---

### #15 — `step-7-checks.svg` — Checks
> Eighteen small squares in a regular grid of six columns by three rows, evenly spaced, each
> drawn as a thin outlined square. Ten are filled solid graphite `#2e3139`. Eight are left
> empty **and** drawn with a dotted stroke rather than a solid one. No ticks, no crosses, no
> green, no red, no percentage, no progress arc, no score. The image says *ten of these ran and
> eight are dormant* and says nothing about whether anything passed.

**Why there is no tick anywhere:** a tick is a claim of compliance. Eight of the eighteen
invariants need a unit schedule Phase 0 does not generate, and a `DORMANT` check is neither a
pass nor a fail.

**alt (en):** Eighteen checks; ten are solid and eight are dotted and empty.
**alt (ar):** ثمانية عشر فحصًا؛ عشرة ممتلئة وثمانية منقّطة وفارغة.

---

### #16 — `step-8-evidence.svg` — Evidence
> A close crop of one branch of the graph in **#5**, enlarged to about four nodes. The top node
> is a solid filled square in accent blue. Two connectors descend from it with square elbows to
> two outlined squares, and from the left of those, one further connector reaches a short
> vertical rule at the right edge of the canvas, where a small filled rectangle stands for the
> cited clause. A thin bracket on the far right spans the citation. The crop must feel like a
> detail of a larger structure — one edge deliberately cut off by the canvas.

**alt (en):** One branch of a derivation, opened down to the clause it cites.
**alt (ar):** فرع واحد من الاشتقاق، مفتوح حتى البند الذي يستند إليه.

---

### #17 — `step-9-export.svg` — Export
> Six sheets of paper fanned in a shallow overlapping stack, seen at a slight isometric angle,
> each a thin outlined rectangle with no content except one distinguishing mark drawn small in
> its upper-left corner: a parcel outline; a bracketed pair of braces; a stack of plates; a
> grid of cells; a wireframe cube; a column of rules. All graphite except the topmost sheet,
> whose outline is accent blue. No file extensions, no icons of the conventional "document"
> kind, no folded corners, no arrows, no download glyphs.

**alt (en):** Six files a finished run produces.
**alt (ar):** ستة ملفات يُخرجها التشغيل المكتمل.

---

## 4 · The dashboard

### #18 — `auth-panel.png`
**Where:** the side panel of `/sign-in`, `/sign-up`, `/forgot-password` and
`/accept-invite` — one image, all four screens. **Size:** 960 × 1200 (portrait). **dark:** yes.

> A tall composition. A survey-sheet ground: a fine square grid, every fifth line heavier, in
> `#eef1f8` on white. Laid over it, one large irregular parcel outline in graphite running off
> the top and bottom edges of the canvas, its buildable envelope offset inside it in accent
> blue with a very pale blue fill. Over the parcel's lower third, a parking level in plan at a
> smaller scale, rotated a few degrees off the parcel's axis, as if it were a separate drawing
> laid on top. Nothing is centred; the composition is a working surface, not a poster. No
> title area, no focal glow, no vignette.

**alt:** decorative — ships with `alt=""`.

---

### #19 — `empty-projects.svg`
**Where:** `/projects` with no projects. **Size:** 400 × 280. **dark:** yes.

> An empty drawing sheet seen flat: a confidently outlined rounded rectangle, softly lifted, with an inner border rule offset
> from it on all four sides, and a title-block grid ruled in the lower-right corner — four
> empty cells, no content in any of them. Nothing else on the sheet. The sheet is clearly
> ready to be drawn on rather than broken or missing.

**Why an empty sheet rather than an empty box or a magnifying glass:** the empty state's job is
value → first action. A ruled sheet with a title block says *this is where a project goes*.

**alt (en):** An empty drawing sheet with a ruled, unfilled title block.
**alt (ar):** ورقة رسم فارغة بخانة عنوان مسطّرة بلا محتوى.

---

### #20 — `empty-members.svg`
**Where:** `/settings/members` with no members besides the owner. **Size:** 400 × 280.
**dark:** yes.

> A signature block from a drawing's title panel, drawn as three stacked cells of equal width
> separated by thin rules. The first cell contains a short horizontal rule near its base — a
> signature line that has been used. The second and third contain the same rule, but drawn
> dotted — signature lines not yet used. No names, no initials, no avatars, no silhouettes,
> no plus signs.

**alt (en):** A signature block with one line used and two waiting.
**alt (ar):** خانة توقيعات: سطر مستعمَل وسطران في انتظار.

---

### #21 — `empty-shared.svg`
**Where:** `/projects` → the "shared with me" list, empty. **Size:** 400 × 280. **dark:** yes.

> Two sheets of paper side by side, each a thin outlined rectangle, with a single thin
> horizontal connector running between them at mid height. The connector is drawn dotted along
> its whole length and terminates at both ends in a small open square rather than an arrowhead.
> Both sheets are blank.

**alt (en):** Two sheets with an unmade connection between them.
**alt (ar):** ورقتان بينهما صِلة لم تُنشأ بعد.

---

### #22 — `dashboard-backdrop.png`
**Where:** behind the dashboard's opening band only. **Size:** 1600 × 400. **dark:** yes.

> A long horizontal strip of survey-sheet ground: fine square grid in `#f3f5f9`, every fifth
> line in `#eef1f8`. Along the strip, five small parcel outlines at the same scale, unequally
> spaced, each a different irregular shape, drawn at hairline weight in `#c8cbd3`. No fills,
> no accent, no envelope offsets, no highlighting of any one parcel. The strip must tile
> plausibly if repeated horizontally.

**alt:** decorative — ships with `alt=""` and `aria-hidden="true"`.

---

## 5 · States and covers

### #23 — `state-not-here.svg`
**Where:** the 404 page, replacing the current text-only opening. **Size:** 480 × 320.
**dark:** yes.

> A sheet-index grid: nine cells in three rows of three, each a thin outlined rectangle with a
> small parcel outline inside it. Eight cells are drawn normally. One cell — not the centre
> one — is drawn with a dotted boundary and is **empty**, its parcel absent. Nothing marks it
> as an error: no cross, no exclamation, no question mark, no broken edge, no torn paper.

**alt (en):** A grid of sheets with one position empty.
**alt (ar):** شبكة صفحات، موضع واحد فيها فارغ.

---

### #24 — `state-refused.svg`
**Where:** the API-error banner's empty illustration slot, and `/refusals`' opening.
**Size:** 480 × 320. **dark:** yes. **The one image permitted red.**

> A horizontal pipeline of five stages drawn as thin outlined rectangles connected left to
> right by short straight connectors. The first two stages are solid graphite outlines. At the
> third, a single vertical bar in restrained red `#b47069` crosses the connector cleanly,
> stopping it. Stages four and five are still drawn, at the same size and weight, but with
> dotted boundaries — they exist, they were simply never reached. The red is one stroke and
> nothing else in the image is red. No warning triangle, no octagon, no hand, no cross in a
> circle.

**Why it is drawn this way:** a refusal in this product is a *behaviour* — a 422, a 409, a run
that is never persisted — not an apology. The stages after the bar are drawn because they are
real and were not run, which is a different fact from their not existing.

**alt (en):** A pipeline stopped at its third stage; the stages after it are drawn but not
reached.
**alt (ar):** خطّ معالجة توقّف عند مرحلته الثالثة؛ المراحل بعده مرسومة لكنها لم تُبلَغ.

---

### #25 — `guide-cover.png`
**Where:** page 1 of `TOP.ai-user-guide.pdf`, replacing the current type-only cover.
**Size:** 2480 × 3508 (A4 at 300 dpi), portrait. **dark:** no — this one prints.

> A full-bleed A4 portrait composition on warm paper white `#ffffff`. In the upper two thirds,
> one irregular parcel of eight edges, one of them curved, drawn large in graphite at a
> confident line weight, with its buildable envelope offset inside it in accent blue. Below
> and overlapping the parcel's lower edge, a parking level in plan at about a third of the
> scale, rotated slightly, with bays, two aisles and a ramp. Both drawings sit over a fine
> survey grid in `#f6f8fd` that fades to nothing before the bottom quarter of the page, which
> is left completely empty for the title to be set. No border, no frame, no rule, no title
> block, no corner marks.

**Print constraint:** this is the one image that goes through a printer. It must hold at 300
dpi in CMYK with no colour beyond the accent blue, and it must still read when photocopied in
one ink — so no tint may sit below about 8% or between 8% and 20% where a laser copier will
drop it.

**alt (en):** A plot with its envelope, and a parking level drawn beneath it.
**alt (ar):** قطعة أرض وظرفها البنائي، ومستوى مواقف مرسوم تحتها.

---

## 6 · Three assets to draw in code, not to generate

Named here so they are not commissioned by mistake. Each is a product surface that must be
driven by engine data, and an image of it would be a picture of something nobody computed.

| | What | Why not generated |
|---|---|---|
| **A** | **The road-hierarchy symbol set** — one glyph each for arterial, collector, local and access, plus the vehicle-access arrow. | This is the client's own request — *"لازم رمز ليهم"*. It is a legend the drawings, the DXF, the A3 set and the screen must all share, so it belongs in `packages/sheets/src/symbols.ts` beside the symbols already there, not in a PNG. Plan §3.2. |
| **B** | **Every plot, envelope, parking level and 3D view shown in the product.** | `CLAUDE.md`: *"A drawing is never assembled from area figures."* Every rectangle on screen is one the engine placed. A decorative drawing of a plan, placed anywhere a reader could mistake it for output, is the defect the `BuildingModel` exists to end. The illustrations above are all abstract for this reason — none of them depicts a specific plot. |
| **C** | **Avatars and the account glyph.** | Initials rendered from the account name in a graphite square. No generated faces, no illustrated people, no photo placeholders — there are no customers to depict. |

---

## 7 · Checklist before an image is merged

1. Open it at 100% and search it for a digit. One digit is a rejection.
2. Sample it for amber, orange or yellow. Anything but **#12** is a rejection.
3. Sample it for red. Anything but **#24** is a rejection.
4. Put it on the light ground and the dark ground. If it was delivered without a dark variant
   and it disappears or glares on `#0c0e11`, it needs one.
5. Run `pnpm contrast` — an image is not a token, but the grounds it sits on are measured, and
   a backdrop that changes a ground's luminance moves a measured pair.
6. Run `pnpm amber` for anything on the landing fold. The fold's amber area is measured against
   what competes with it; a new figure on that screen changes the denominator.
7. Write the alt text from the table above into the component, in both dictionaries. An image
   with no `alt` and no `aria-hidden` does not ship.
8. Convert: AVIF + WebP + PNG fallback, `width`/`height` set on the element, `loading="lazy"`
   on everything below the fold, `decoding="async"`.
