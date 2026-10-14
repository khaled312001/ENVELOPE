# TOP.ai — برومبتات الصور لـ ChatGPT (التصميم الجديد، اكتوبر 2026)

الملف ده بيكمل `docs/06-plan/image-prompts.md` ومش بيلغيه. نفس الصور ونفس الاسماء ونفس الموضوع، بس بالاسلوب الجديد للموقع (اداه هندسيه زي Forma وTestFit) ومكتوبه بطريقه تناسب ChatGPT.

**ليه نفس الموضوع بالظبط:** النص البديل (alt) لكل صوره مكتوب في الملف القديم، وفيه اختبار (`imagery.test.ts`) بيتأكد انه متطابق مع الكود. لو الصوره رسمت حاجه تانيه، قارئ الشاشه هيوصف صوره مش موجوده.

---

## طريقه الاستخدام

1. افتح محادثه جديده في ChatGPT لكل مجموعه صور (عشان الاسلوب يفضل ثابت).
2. الصق **بلوك الاسلوب** المناسب (A او B تحت) في اول رساله، وبعده برومبت الصوره.
3. اختار المقاس المكتوب جنب كل صوره: **مربع** 1024×1024، **عرضي** 1536×1024، **طولي** 1024×1536. انا هقص الصوره وأصغرها للمقاس النهائي.
4. لو الصوره طلع فيها اي كلام او ارقام او حروف — **ارفضها واطلب اعاده** بجمله: `Regenerate with absolutely no text, letters or numbers anywhere.`
5. ابعتلي الصوره باسم الملف المكتوب بالظبط (مثلا `step-6-parking.png`). النسخه الداكنه اسمها نفس الاسم + `-dark` (مثلا `step-6-parking-dark.png`).
6. الصور بتتحط في `apps/web/src/assets/img/` وبتظهر في مكانها لوحدها. `og-cover.png` بس بيروح `apps/web/public/`.

---

## بلوك الاسلوب A — رسم تقني (لكل الصور ما عدا 1 و18 و25 و26 و27)

انسخه كما هو:

```
STYLE — read carefully and follow exactly.
A precise technical drawing for a professional architecture and site-planning software product.
Flat orthographic plan view, or a clean 30-degree axonometric where the prompt says so.
Crisp vector-like linework with uniform stroke weight (about 2 px at 1024 px), square corners,
no rounding. Calm, engineered, minimal, generous empty space around the subject.

PALETTE — use only these colours:
ink #14161C, graphite #2E3139, grey #55555F, mid grey #84878E, light grey #C8CBD3,
hairline #E3E6EC, paper #F6F8FD, and ONE accent blue #3355E0 with its pale tint #EAF0FD.
The accent is used on one element only — the element the prompt names. Everything else is graphite.

FORBIDDEN — the image is rejected if it contains any of these:
any text, letters, numbers, digits, labels, dimensions, captions, logos or watermarks;
orange, amber, yellow, red or green; gradients, glow, glass, blur, drop shadows, bevels,
glossy 3D, textures, noise, photographic effects; people, faces, hands; computer screens,
user interfaces, browser windows, phones or devices; stamps, seals, ticks, check marks,
certificates, flags, city skylines or landmarks.

Background: plain flat paper #F6F8FD (or transparent if the prompt says transparent).
```

### نسخه داكنه (لما الصوره مكتوب جنبها **dark: yes**)

بعد ما الصوره الفاتحه تطلع كويسه، ابعت في نفس المحادثه:

```
Now redraw exactly the same image, same geometry and composition, for a dark interface:
background #0C0E11, lines #C8CBD3, secondary lines #84878E, filled shapes #2E3139,
accent #7B9DFF with its tint #1C2230. Same forbidden list. No text, no numbers.
```

---

## بلوك الاسلوب B — مجسم معماري ابيض (للصور 1 و18 و25 و26 و27)

ده الاسلوب اللي بيدي الموقع الاحساس العالمي: مجسم معماري ابيض زي ماكيت مكتب هندسي، مش صوره لمبنى حقيقي.

```
STYLE — read carefully and follow exactly.
A high-end architectural "white clay model" render, as used by international architecture
and urban-planning practices. Matte white and very light grey materials only, like a
physical study model made of card and plaster. Soft overcast daylight from the upper left,
gentle ambient occlusion where volumes meet the ground, no harsh shadows.
Camera: aerial three-quarter view, about 35 degrees down, slightly telephoto, no distortion.

COLOUR: everything white, off-white #F6F8FD and light grey #C8CBD3, with ONE accent:
a thin precise line or a translucent volume in blue #3355E0, used only where the prompt says.

FORBIDDEN — the image is rejected if it contains any of these:
any text, letters, numbers, signs, labels, logos or watermarks; real or recognisable buildings,
landmarks or city skylines (no Burj Khalifa, no Dubai skyline); people, cars with detail,
trees with colour; orange, amber, yellow, red or green anywhere; glossy glass, reflections,
lens flare, bokeh, sunset colours, dramatic sky; computer screens, user interfaces, devices;
stamps, seals, ticks, certificates.
```

---

## 1 · الهويه والمشاركه

### #1 — `og-cover.png` · عرضي · dark: no
**المكان:** الصوره اللي بتظهر لما اللينك يتبعت على واتساب او لينكدان. المقاس النهائي 1200×630.
**الاسلوب:** B

```
A single irregular land plot seen from the aerial three-quarter camera, modelled as a thin
white plinth with six unequal straight edges and one gently curved edge. Inside it, a smaller
outline offset inward by an even margin — the buildable envelope — drawn as a thin crisp blue
#3355E0 line with a barely visible pale blue translucent floor. Two sides of the plot are
bordered by slightly lower white strips that read as roads. Nothing is built on the plot.
The plot sits in the left half of the frame; the right 40% of the image is calm empty white
ground, left free for a title to be added later. Landscape 1536x1024.
```

### #2 — `mark.svg` — **لا تولده**
اللوجو بيترسم بالكود. ChatGPT مش بيطلع SVG، واللوجو لازم يفضل واضح في 16 بكسل. سيبه.

---

## 2 · صور اقسام الصفحه الرئيسيه · مربع · dark: yes للكل
**الاسلوب:** A. المقاس النهائي 640×480 (هقصها من المربع).

### #3 — `lp-capacities.png`
```
Three tall narrow upright rectangles standing side by side on one common baseline, evenly
spaced, each a different height. The SHORTEST of the three is filled solid accent blue #3355E0;
the other two are empty outlines in graphite. One thin horizontal graphite line runs across
all three at exactly the height of the shortest one and continues a little past them on both
sides. Flat front view. No axis, no ticks, no scale, no numbers.
```

### #4 — `lp-parking.png`
```
Plan view from directly above of one rectangular parking floor. A heavier graphite outline for
the floor edge. Inside it, two rows of small identical narrow rectangles (parking bays) standing
perpendicular to a wide empty central aisle bounded by two parallel lines. At one end, a long
tapering parallelogram crosses two of the rows at a shallow angle — a ramp — drawn as an outline
filled with sparse 45-degree hatching in mid grey #84878E, clearly different from the bays.
Bays are thin graphite outlines with no fill. No cars, no arrows, no numbers.
```

### #5 — `lp-guarantees.png`
```
A small tree diagram growing downward. At the top, one solid filled square in accent blue
#3355E0. Below it, four empty graphite outlined squares. Below those, seven smaller squares,
some outlined solid and some outlined with a dotted line. Connectors are straight orthogonal
lines only — horizontal and vertical with square elbows, never diagonal, never curved. Every
bottom square ends in a short horizontal line that stops exactly at one shared vertical rule
on the right side, as if each one cites a source. No labels.
```

### #6 — `lp-claims.png`
```
Five horizontal bars of identical length stacked vertically with equal gaps, each a thin
graphite outlined rectangle with no fill. The first three are plain. The fourth has a dotted
outline. The fifth is crossed out from corner to corner by one thin straight diagonal line.
Graphite only, no blue. It must look like a printed schedule, not a progress bar: no fills,
no ticks, no crosses inside boxes, no percentages.
```

### #7 — `lp-limits.png`
```
A large rectangle outlined in graphite on three sides only; the fourth (right) side is simply
open — the line stops, no dashes, no arrow. Inside the closed region, a dense regular grid of
small solid graphite squares. Beyond the open side, the same grid continues outward but the
squares become empty outlines and spread further and further apart until they stop. The
opening reads as the edge of what is known, not as a wall.
```

### #8 — `lp-hero-backdrop.png` · عرضي · dark: yes
**المكان:** خلفيه باهته جدا ورا عنوان الصفحه الرئيسيه. المقاس النهائي 1920×900.
```
A survey-sheet background covering the whole canvas: a fine square grid in #EEF1F8 with every
fifth line very slightly heavier. Over it, three or four unrelated land-plot outlines of
different sizes and rotations, drawn as hairlines in light grey #C8CBD3, overlapping each other
and running off every edge of the canvas, as if several drawings were laid on one table. No
fills, no blue, no focal point. It must be almost invisible at a glance. Landscape 1536x1024.
```

---

## 3 · صور خطوات التطبيق (العشر خطوات) · عرضي · dark: yes للكل
**الاسلوب:** A. المقاس النهائي 480×320. دي بتظهر فوق كل خطوه وبتشرح الخطوه بتعمل ايه قبل ما الحقول تتقري.

### #9 — `step-0-sheet.png` — المخطط
```
A portrait sheet of paper lying flat, a graphite outlined rectangle. In its upper half, four
short blank horizontal lines of unequal length standing for printed lines (no actual text). In
its lower half, a small land-plot outline. To the right of the sheet, a vertical stack of six
small empty squares. Four of them are connected back to a line or to the plot on the sheet by
thin orthogonal leader lines with square elbows. TWO squares are left unconnected — they are
the subject: what the sheet does not say. The four connected squares have accent blue #3355E0
outlines; the two unconnected ones are dotted graphite.
```

### #10 — `step-1-plot.png` — القطعه
```
Plan view of one irregular land plot with seven straight edges of clearly unequal length plus
one circular-arc edge, closing cleanly. A short perpendicular tick at the midpoint of each edge.
Two adjacent edges have a double line drawn just outside and parallel to them — roads. One
further edge sits against a band of solid diagonal hatching outside it — a neighbouring plot.
One edge is plain. Plot outline in graphite, the two road edges in accent blue #3355E0.
No dimensions, no compass, no numbers.
```

### #11 — `step-3-rules.png` — القواعد
```
Two horizontal bands of equal width, one above the other with a clear gap between them. The
upper band has a solid graphite outline and is divided by thin vertical lines into four unequal
cells, with a pale blue #EAF0FD fill. A thin bracket in accent blue #3355E0 spans the upper band
only. The lower band is detached, has a dotted graphite outline, no subdivisions and no fill —
it is outside the measure. The image says: this is counted, and that is not.
```

### #12 — `step-4-assumptions.png` — الافتراضات · **اتغيرت**
**ليه اتغيرت:** الصوره القديمه كانت بالكهرماني، والعميل لغى اللون الكهرماني يوم 5 اكتوبر. الموقع دلوقتي بيعلم الافتراض بخط جانبي عريض وغامق، وده اللي الصوره لازم ترسمه. (لما الصوره توصل، هعدل الوصف البديل في الملف القديم وفي القاموسين مع بعض.)
```
A vertical list of six horizontal rows of identical height, each a thin graphite outlined
rectangle with a small square at its left end. Four rows are plain and light. TWO rows are
marked unmistakably, by shape and weight rather than by colour: a thick solid dark bar
(#2E3139, about four times the normal stroke) along their left edge, a slightly darker grey
fill (#E3E6EC), a small solid triangle inside their leading square, and a short dotted
underline beneath the row. Those two rows must be the most prominent thing in the image.
No colour other than greys. No blue in this one.
```

### #13 — `step-5-capacity.png` — السعه
```
A clean 30-degree axonometric stack of thin floor plates on one vertical axis with even
spacing, each plate a graphite outlined quadrilateral with a very faint top face. The lower
three plates are larger and share one footprint — the podium. The upper seven are smaller,
share a different footprint and are set back from the podium edge on two sides. Thin vertical
lines join the corners of consecutive plates. One vertical rectangular prism — the core — runs
through every plate from bottom to top in the same position, drawn in accent blue #3355E0 with
a pale blue #EAF0FD fill. No ground, no sky, no facade, no windows.
```

### #14 — `step-6-parking.png` — المواقف
```
Plan view from directly above of one rectangular parking floor. Three rows of narrow parking
bays perpendicular to two aisles that meet in a T shape. A ramp enters from one edge, drawn as
a tapering parallelogram with sparse 45-degree hatching in mid grey #84878E. In every bay of
ONE row only, a schematic car seen from above: a plain rounded-off rectangle with two small
rectangles for the front and rear screens, no wheels, no detail, in light grey #C8CBD3. One
corner bay is wider than the others with a second parallel line inside it. The two aisles are
outlined in accent blue #3355E0. No numbers, no arrows.
```

### #15 — `step-7-checks.png` — الفحوصات
```
Eighteen small squares in a regular grid of six columns and three rows, evenly spaced. Ten of
them are filled solid graphite #2E3139. The other eight are empty and drawn with a dotted
outline. No ticks, no crosses, no colour, no progress ring, no score. It says only: ten ran,
eight did not.
```

### #16 — `step-8-evidence.png` — الادله
```
A close crop of a tree diagram: one solid accent blue #3355E0 square at the top; two straight
orthogonal connectors with square elbows descend to two graphite outlined squares; from one of
those, a further connector runs right to a short vertical rule near the right edge of the
canvas, where a small solid graphite rectangle stands for the cited clause. A thin bracket on
the far right spans that clause. One branch is deliberately cut off by the left edge of the
canvas, so it reads as a detail of a larger structure.
```

### #17 — `step-9-export.png` — التصدير
```
Six sheets of paper fanned in a shallow overlapping stack, seen at a slight axonometric angle,
each a thin graphite outlined rectangle. Each sheet carries one small distinguishing symbol in
its upper-left corner and nothing else: a land-plot outline; a pair of curly braces; a stack of
three thin plates; a small grid of cells; a wireframe cube; a column of short lines. The
topmost sheet's outline is accent blue #3355E0, all others graphite. No folded corners, no
download arrows, no file icons, no text.
```

---

## 4 · الدخول ولوحه التحكم

### #18 — `auth-panel.png` · طولي · dark: yes
**المكان:** الجنب التاني من صفحه تسجيل الدخول وانشاء الحساب. المقاس النهائي 960×1200.
**الاسلوب:** B
```
Portrait composition 1024x1536. A white clay study model of a single mid-rise residential
building on its plot, seen from the aerial three-quarter camera: a wide podium of three levels
and a slimmer tower of about eight levels above it, set back from the podium edge, plain
volumes with no windows or detail. The plot boundary around it is a thin precise blue #3355E0
line on the white ground. One side of the podium is cut open like a section model, showing a
parking level inside as fine grey lines of bays. The building sits in the lower-middle of the
frame and runs slightly off the bottom edge; the upper third is calm empty white.
```
**للنسخه الداكنه:** `Redraw exactly the same model as a night-time dark render: ground and volumes in deep graphite #161A22 and #2E3139, soft cool light, the plot line in #7B9DFF. Same forbidden list.`

### #19 — `empty-projects.png` · عرضي · dark: yes
**الاسلوب:** A. المقاس النهائي 400×280.
```
One empty drawing sheet lying flat: a graphite outlined rectangle with an inner border line
offset evenly on all four sides, and a small title-block grid of four empty cells ruled in the
lower-right corner. Nothing else on the sheet. The title-block outline is accent blue #3355E0.
It must look ready to be drawn on, not broken or missing.
```

### #20 — `empty-members.png` · عرضي · dark: yes
**الاسلوب:** A. المقاس النهائي 400×280.
```
A signature block from a drawing title panel: three stacked cells of equal width separated by
thin graphite lines. In the first cell, a short solid horizontal line near its base — a
signature line that has been used — in accent blue #3355E0. In the second and third cells, the
same line drawn dotted in grey — not yet used. No names, no initials, no silhouettes, no plus.
```

### #21 — `empty-shared.png` · عرضي · dark: yes
**الاسلوب:** A. المقاس النهائي 400×280.
```
Two blank sheets of paper side by side, each a thin graphite outlined rectangle. One thin
horizontal connector runs between them at mid height, dotted along its whole length, ending at
both sides in a small open square rather than an arrowhead.
```

### #22 — `dashboard-backdrop.png` · عرضي · dark: yes
**الاسلوب:** A. المقاس النهائي 1600×400 (هقص شريط من الصوره).
```
A long horizontal strip of survey-sheet ground across the middle of a landscape canvas: a fine
square grid in #F3F5F9 with every fifth line in #EEF1F8. Along the strip, five small land-plot
outlines at the same scale, unequally spaced, each a different irregular shape, drawn as
hairlines in light grey #C8CBD3. No fills, no blue, no highlighted plot. The left and right ends
must match so the strip can repeat seamlessly.
```

---

## 5 · حالات خاصه

### #23 — `state-not-here.png` — صفحه 404 · عرضي · dark: yes
**الاسلوب:** A. المقاس النهائي 480×320.
```
A grid of nine sheets in three rows of three, each a thin graphite outlined rectangle with a
small land-plot outline inside. Eight are drawn normally. One — not the centre one — has a
dotted outline and is empty, its plot missing. Nothing marks it as an error: no cross, no
exclamation mark, no question mark, no torn paper.
```

### #24 — `state-refused.png` — رفض · عرضي · dark: yes
**الاسلوب:** A، **مع استثناء واحد:** دي الصوره الوحيده المسموح فيها بالاحمر. ضيف للبلوك سطر: `Exception for this image only: one single stroke of muted red #B47069 is allowed where described.`
المقاس النهائي 480×320.
```
A horizontal pipeline of five stages drawn as graphite outlined rectangles joined left to right
by short straight connectors. Stages one and two are solid outlines. At stage three, one single
vertical bar in muted red #B47069 cleanly crosses the connector and stops it. Stages four and
five are still drawn at the same size, but with dotted outlines — they exist and were never
reached. Nothing else is red. No warning triangle, no stop sign, no hand, no cross.
```

### #25 — `guide-cover.png` — غلاف دليل المستخدم · طولي · dark: no
**المكان:** الصفحه الاولى من دليل المستخدم PDF. المقاس النهائي A4 (2480×3508) — اطلبها طولي وانا هكبرها.
**الاسلوب:** B
```
Portrait 1024x1536 for a printed cover. In the upper two thirds, a white clay model of one
irregular land plot with eight edges, one of them curved, seen from the aerial three-quarter
camera, with its buildable envelope traced inside it as a precise blue #3355E0 line. Beneath
the plot, as if the ground were cut away, one basement parking level shown as a thin white slab
with fine grey lines of parking bays, two aisles and a ramp. Nothing is built above the plot.
The bottom third of the image is completely empty plain white, left for the title. No border,
no frame.
```

---

## 6 · صور جديده للتصميم الجديد (اختياريه، بس بتفرق جدا)

دول مش في الكود لسه. لما توصل، هضيف اسمها للقائمه وللملف القديم مع الوصف البديل، والاختبار هيفرض ده.

### #26 — `lp-hero-model.png` · عرضي · dark: yes
**المكان:** اول شاشه في الصفحه الرئيسيه، جنب العنوان. اهم صوره في الموقع.
**الاسلوب:** B
```
Landscape 1536x1024. A white clay urban study model seen from the aerial three-quarter camera:
a small neighbourhood block of several plain white plots and simple low massings around a
central plot. On the central plot only, one taller residential massing — a three-level podium
and a slimmer tower set back above it — with its buildable envelope drawn around it as a thin
precise blue #3355E0 wireframe box with a barely visible translucent blue fill. The surrounding
plots are lower and unadorned. Calm overcast light. The central building sits right of centre;
the left third of the frame is quiet empty white ground for the headline.
```
**الوصف البديل المقترح:** «مجسم ابيض لمجموعه قطع، وعلى القطعه الوسطى مبنى داخل غلافه البنائي.» / "A white study model of a block, with one building inside its buildable envelope."

### #27 — `lp-closing-model.png` · عرضي · dark: yes
**المكان:** اخر قسم في الصفحه الرئيسيه، قبل زر «ابدأ».
**الاسلوب:** B
```
Landscape 1536x1024. A white clay section model of one residential building cut cleanly in
half vertically, seen from a low three-quarter camera. The cut face shows the levels as thin
white slabs: two basement parking levels below the ground line with faint grey bay lines, a
ground floor, a podium and a tower above. A thin precise blue #3355E0 line traces the ramp
between the parking levels on the cut face — the only colour in the image. Quiet white ground,
the model centred with generous empty space around it.
```
**الوصف البديل المقترح:** «مقطع في مجسم مبنى يظهر ادوار المواقف تحت الارض والرامب بينها.» / "A section through a model building, showing the basement parking levels and the ramp between them."

---

## 7 · قبل ما تبعتلي الصوره — راجع دول

1. مفيش اي رقم او حرف او كلمه، ولا حتى مموهه في الخلفيه. رقم واحد = الصوره مرفوضه. (المنتج كله قايم على ان كل رقم على الشاشه طالع من المحرك.)
2. مفيش برتقالي ولا كهرماني ولا اصفر. ومفيش احمر غير في #24.
3. مفيش اختام ولا علامات صح ولا شهادات ولا مباني حقيقيه معروفه. البرنامج مش بيدعي المطابقه، والصوره متقولش عكس كده.
4. مفيش ناس ولا لوجوهات ولا شاشات.
5. لون الازرق في حاجه واحده بس في كل صوره.
6. النسخه الداكنه نفس الشكل بالظبط، مش صوره جديده.

---

## 8 · حاجات **متتولدش** بالصور

- **اي مسقط او مجسم او لوحه مواقف لقطعه حقيقيه.** دي بتطلع من المحرك نفسه (`BuildingModel`)، ولو اتحطت صوره مرسومه مكانها هتبقى رسمه لحاجه محدش حسبها. صور المنتج الحقيقيه هطلعها انا من البرنامج بـ`pnpm shots`.
- **رموز الطرق والسهم بتاع مدخل العربيات.** دي بتترسم بالكود في `packages/sheets/src/symbols.ts`.
- **صور الحسابات (avatars).** حروف الاسم في مربع، من غير وجوه.
