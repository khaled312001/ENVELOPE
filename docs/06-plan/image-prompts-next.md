# TOP.ai — برومبتات الصور للموقع الجديد `/next`

16 صوره، مرقمه. كل برومبت كامل لوحده: فيه الاسلوب والالوان والمقاس والممنوعات. انسخه كله والصقه في ChatGPT كما هو، من غير ما تضيف عليه حاجه.

**نسخه واحده لكل صوره تنفع في الوضع الفاتح والداكن:**
- **الصور 1 لـ11 و14 و15 (رسم تقني):** خلفيتها شفافه، وخطوطها بدرجات متوسطه تبان على الابيض وعلى الاسود. الالوان دي اتقاست على خلفيه الموقع الفاتحه (#F8F9FB) والداكنه (#0A0C10):
  - الرمادي #7F889B: ‏3.38 على الفاتح و5.50 على الداكن.
  - الازرق #4F7BF0: ‏3.68 و5.05.
  - البنفسجي #7B5CFF: ‏4.14 و4.49.
  
  كلها فوق الحد المطلوب للعناصر غير النصيه (3:1).
- **الصور 12 و13 و16 (مجسم ابيض):** صوره كامله بخلفيتها، معروضه جوه اطار بحواف. الخلفيه رماديه فاتحه زي استوديو التصوير، فالصوره تبان صوره في الوضعين، والمجسم الابيض واضح عليها.

## طريقه الاستخدام

1. محادثه جديده في ChatGPT لكل مجموعه (الصور 2 لـ7 في محادثه واحده عشان يطلعوا شبه بعض).
2. انسخ البرومبت كله من اول `IMAGE` لاخر سطر والصقه.
3. لو الصوره المفروض تبقى شفافه وطلعت بخلفيه، اكتب: `Regenerate the same image with a fully transparent background (PNG with alpha). Nothing else changes.`
4. لو ظهر اي كلام او ارقام او حروف، اكتب: `Regenerate the same image with absolutely no text, letters or numbers anywhere.`
5. ابعتلي كل صوره بالاسم المكتوب بالظبط. هي بتروح `apps/web-next/src/assets/img/`، وانا اللي بربطها بمكانها وبحولها WebP.

---

## 1 — `home-backdrop.png` — خلفيه عناوين كل الصفحات

**المكان:** خلفيه باهته جدا ورا عنوان كل صفحه. المقاس النهائي 1920×900. **النص البديل:** فاضي، لانها ديكور.

```
IMAGE 1 of 16 — file name: home-backdrop.png
Format: landscape 1536x1024, PNG with a FULLY TRANSPARENT background (alpha). No background
colour, no paper, no fill behind the drawing.

SUBJECT: a faint survey-sheet texture covering the whole canvas. A fine square grid of very thin
lines in grey #7F889B at 15% opacity, every fifth line slightly heavier at 25% opacity. Over the
grid, four unrelated irregular land-plot outlines of different sizes and rotations, drawn as thin
lines in grey #7F889B at 40% opacity, overlapping each other and running off every edge of the
canvas, as if several survey drawings were laid on one table. ONE of the four plot outlines is
drawn instead as a thin line with a smooth gradient from blue #4F7BF0 to violet #7B5CFF at 60%
opacity. No fills anywhere. No focal point. The whole image must be almost invisible at a glance,
a texture rather than a picture.

STYLE: precise technical linework, vector-like, uniform thin stroke, square corners, flat,
orthographic plan view from directly above.

FORBIDDEN — reject and redo if any appear: any text, letters, numbers, digits, labels,
dimensions, north arrows, scale bars, logos or watermarks; orange, amber, yellow, gold, red or
green anywhere; white or black backgrounds; glow, blur, shadows, 3D, textures, noise or
photographic effects; people, screens, devices; stamps, seals, ticks, check marks, certificates;
city skylines or landmarks.
```

---

## 2 — `card-product.png` — كارت «الاستوديو»

**المكان:** فوق كارت الاستوديو في الصفحه الرئيسيه. المقاس النهائي 640×400. **النص البديل:** «قطعه ارض تتحول الى مجموعه لوحات خطوه بخطوه.» / "A plot becoming a drawing set, step by step."

```
IMAGE 2 of 16 — file name: card-product.png
Format: square 1024x1024, PNG with a FULLY TRANSPARENT background (alpha). The subject sits in a
horizontal band across the middle, with generous empty space above and below.
This image is one of a family of six (images 2 to 7): same stroke weight, same spacing, same
scale of objects, same position of the coloured element.

SUBJECT: a horizontal sequence of five small objects standing on one invisible baseline, evenly
spaced, joined left to right by short straight connector lines with square elbows:
1) an irregular land-plot outline with six straight edges;
2) a short stack of three horizontal bars of equal length;
3) three upright rectangles of different heights side by side on one baseline;
4) a tiny parking plan: narrow bays around a rectangular aisle;
5) two overlapping sheets of paper.
All five objects are outlines only, in grey #7F889B, stroke about 3 px. The connector line that
joins them is the only colour: one continuous line with a smooth gradient from blue #4F7BF0 on
the left to violet #7B5CFF on the right, stroke about 3 px.

STYLE: precise technical illustration for a professional architecture software product.
Vector-like, uniform stroke weight, square corners, flat, no perspective. Calm and minimal.

FORBIDDEN — reject and redo if any appear: any text, letters, numbers, digits, labels or
dimensions; orange, amber, yellow, gold, red or green anywhere; white or black backgrounds;
filled shapes, gradients other than the one named, glow, blur, drop shadows, 3D, textures, noise;
people, hands, screens, devices, browser windows; stamps, seals, ticks, check marks, arrows,
certificates; buildings, skylines, landmarks.
```

---

## 3 — `card-parking.png` — كارت «المواقف»

**المكان:** فوق كارت المواقف في الصفحه الرئيسيه. المقاس النهائي 640×400. **النص البديل:** «مسقط دور مواقف: مواقف حول ممر مناوره ومنحدر.» / "A parking floor plan: bays around an aisle, and a ramp."

```
IMAGE 3 of 16 — file name: card-parking.png
Format: square 1024x1024, PNG with a FULLY TRANSPARENT background (alpha). The subject is
centred, filling about 70% of the width, with empty space around it.
This image is one of a family of six (images 2 to 7): same stroke weight, same spacing, same
scale of objects, same position of the coloured element.

SUBJECT: plan view from directly above of one rectangular parking floor, wider than it is deep.
The floor edge is a heavier outline in grey #7F889B, stroke about 4 px. Parking bays stand against
all four walls: rows of identical narrow rectangles, outlines only in grey #7F889B, stroke about
2 px. Inside the bays runs one continuous rectangular ring aisle, outlined in blue #4F7BF0 with a
very light blue #4F7BF0 fill at 15% opacity. In the island the ring encloses, one long rectangle
filled with sparse 45-degree diagonal hatching in grey #7F889B — the ramp. Nothing else.

STYLE: precise technical drawing, orthographic plan view, vector-like, uniform strokes, square
corners, flat. Calm and minimal, like a clean architectural plan.

FORBIDDEN — reject and redo if any appear: any text, letters, numbers, digits, bay numbers,
labels or dimensions; cars; arrows; orange, amber, yellow, gold, red or green anywhere; white or
black backgrounds; glow, blur, drop shadows, 3D, textures, noise; people, screens, devices;
stamps, seals, ticks, check marks, certificates.
```

---

## 4 — `card-method.png` — كارت «المنهجيه»

**المكان:** فوق كارت المنهجيه. المقاس النهائي 640×400. **النص البديل:** «شجره اشتقاق تنتهي كل فروعها الى مرجع.» / "A derivation tree whose every branch ends at a source."

```
IMAGE 4 of 16 — file name: card-method.png
Format: square 1024x1024, PNG with a FULLY TRANSPARENT background (alpha). The subject is
centred with generous empty space around it.
This image is one of a family of six (images 2 to 7): same stroke weight, same spacing, same
scale of objects, same position of the coloured element.

SUBJECT: a small tree diagram growing downward. At the top, ONE solid filled square with a smooth
gradient from blue #4F7BF0 to violet #7B5CFF — the only colour in the image. Below it, three
empty outlined squares in grey #7F889B. Below those, six smaller squares in grey #7F889B: three
with a solid outline and three with a dotted outline. All connectors are straight orthogonal lines
with square elbows — only horizontal and vertical, never diagonal, never curved — in grey
#7F889B, stroke about 3 px. Every bottom square has a short horizontal line leaving its right
side that stops exactly at one shared vertical line on the right of the drawing, as if each one
cites a source.

STYLE: precise technical diagram, vector-like, uniform stroke weight, square corners, flat.

FORBIDDEN — reject and redo if any appear: any text, letters, numbers, digits, labels or icons
inside the squares; orange, amber, yellow, gold, red or green anywhere; white or black
backgrounds; glow, blur, drop shadows, 3D, textures, noise; people, screens, devices; stamps,
seals, ticks, check marks, crosses, certificates.
```

---

## 5 — `card-exports.png` — كارت «النواتج»

**المكان:** فوق كارت النواتج. المقاس النهائي 640×400. **النص البديل:** «ست اوراق متراصه، لكل منها رمز ملفها.» / "Six stacked sheets, each with the symbol of its file."

```
IMAGE 5 of 16 — file name: card-exports.png
Format: square 1024x1024, PNG with a FULLY TRANSPARENT background (alpha). The subject is
centred with generous empty space around it.
This image is one of a family of six (images 2 to 7): same stroke weight, same spacing, same
scale of objects, same position of the coloured element.

SUBJECT: six sheets of paper fanned in a shallow overlapping stack, seen at a slight
30-degree axonometric angle. Each sheet is an outlined rectangle in grey #7F889B, stroke about
3 px, with no fill. Each sheet carries ONE small symbol in its upper-left corner and nothing
else: a land-plot outline; a pair of curly braces; a stack of three thin plates; a small grid of
cells; a wireframe cube; a column of short horizontal lines. The outline of the TOPMOST sheet only
is drawn with a smooth gradient from blue #4F7BF0 to violet #7B5CFF; all other lines are grey.

STYLE: precise technical illustration, vector-like, uniform stroke weight, square corners.

FORBIDDEN — reject and redo if any appear: any text, letters, numbers, digits, file names,
extensions or labels; folded corners, download arrows, file icons; orange, amber, yellow, gold,
red or green anywhere; white or black backgrounds; glow, blur, drop shadows, glossy 3D, textures,
noise; people, hands, screens, devices; stamps, seals, ticks, check marks, certificates.
```

---

## 6 — `card-limits.png` — كارت «ما لا يفعله»

**المكان:** فوق كارت «ما لا يفعله». المقاس النهائي 640×400. **النص البديل:** «شبكه منتظمه تتبعثر عند حد مفتوح.» / "A regular grid that thins out past an open edge."

```
IMAGE 6 of 16 — file name: card-limits.png
Format: square 1024x1024, PNG with a FULLY TRANSPARENT background (alpha). The subject is
centred with generous empty space around it.
This image is one of a family of six (images 2 to 7): same stroke weight, same spacing, same
scale of objects, same position of the coloured element.

SUBJECT: a large rectangle outlined on three sides only (top, left, bottom) in grey #7F889B,
stroke about 3 px. The right side is simply open: the top and bottom lines just stop. At those
two stopping points, two short vertical end-caps are drawn in blue #4F7BF0 — the only colour.
Inside the rectangle, a dense regular grid of small solid squares in grey #7F889B. Beyond the
open right side, the same grid continues outward, but the squares become empty outlines and
spread further and further apart until they stop. It reads as the edge of what is known, not as
a wall.

STYLE: precise technical illustration, flat, vector-like, uniform strokes, square corners.

FORBIDDEN — reject and redo if any appear: any text, letters, numbers, digits or labels;
arrows; orange, amber, yellow, gold, red or green anywhere; white or black backgrounds; glow,
blur, drop shadows, 3D, textures, noise; people, screens, devices; stamps, seals, ticks, crosses,
warning signs, certificates.
```

---

## 7 — `card-faq.png` — كارت «الاسئله»

**المكان:** فوق كارت الاسئله. المقاس النهائي 640×400. **النص البديل:** «ورقه عليها سطور فارغه، وسطر منها معلم.» / "A sheet of blank lines, one of them marked."

```
IMAGE 7 of 16 — file name: card-faq.png
Format: square 1024x1024, PNG with a FULLY TRANSPARENT background (alpha). The subject is
centred with generous empty space around it.
This image is one of a family of six (images 2 to 7): same stroke weight, same spacing, same
scale of objects, same position of the coloured element.

SUBJECT: one portrait sheet of paper lying flat, an outlined rectangle in grey #7F889B, stroke
about 3 px, no fill. On it, eight short horizontal blank lines of unequal length in grey #7F889B,
arranged in four pairs — a longer line followed by a shorter one, like a question and its answer.
The THIRD line from the top is marked: a short vertical bar at its left end in blue #4F7BF0, and a
very light blue #4F7BF0 band at 15% opacity behind the line, as if that line had been opened.
Nothing else is coloured.

STYLE: precise technical illustration, flat, vector-like, uniform strokes, square corners.

FORBIDDEN — reject and redo if any appear: any text, letters, numbers, digits, question marks
or exclamation marks; speech bubbles; orange, amber, yellow, gold, red or green anywhere; white or
black backgrounds; glow, blur, drop shadows, 3D, textures, noise; people, faces, screens,
devices; stamps, seals, ticks, check marks, certificates.
```

---

## 8 — `product-flow.png` — شريط المراحل في صفحه الاستوديو

**المكان:** فوق قسم «ست خطوات» في `/product`. المقاس النهائي 1600×560. **النص البديل:** «من مخطط الافكشن الى مجموعه اللوحات في ست مراحل.» / "From the affection plan to the drawing set in six stages."

```
IMAGE 8 of 16 — file name: product-flow.png
Format: landscape 1536x1024, PNG with a FULLY TRANSPARENT background (alpha). The subject lies
in one wide horizontal band across the vertical middle; the top and bottom quarters stay empty.

SUBJECT: six stages from left to right on one baseline, each inside an outlined square frame of
equal size in grey #7F889B, stroke about 3 px, evenly spaced:
1) a sheet of paper with a small land-plot outline on it;
2) the same land plot alone, its edges drawn in three different line styles (solid, dashed,
   dotted);
3) a horizontal bracket spanning a strip divided into four unequal cells;
4) three upright rectangles of different heights on one baseline, the shortest one drawn with a
   heavier outline;
5) a parking floor plan of narrow bays around a rectangular aisle;
6) a fanned stack of three sheets.
Beneath all six frames, one continuous thin line runs from the first to the last with a smooth
gradient from blue #4F7BF0 on the left to violet #7B5CFF on the right — the only colour.

STYLE: precise technical illustration for a professional architecture software product,
vector-like, uniform stroke weight, square corners, flat, orthographic.

FORBIDDEN — reject and redo if any appear: any text, letters, numbers, digits, step numbers or
labels; arrows; orange, amber, yellow, gold, red or green anywhere; white or black backgrounds;
glow, blur, drop shadows, 3D, textures, noise; people, screens, devices; stamps, seals, ticks,
check marks, certificates; buildings, skylines.
```

---

## 9 — `parking-reach.png` — شبكه الممرات في صفحه المواقف

**المكان:** جنب قسم «الموقف الذي لا يصل اليه احد ليس موقفا» في `/parking`. المقاس النهائي 640×640. **النص البديل:** «شبكه ممرات تصل كل المواقف بمدخل واحد.» / "An aisle network joining every bay to one entrance."

```
IMAGE 9 of 16 — file name: parking-reach.png
Format: square 1024x1024, PNG with a FULLY TRANSPARENT background (alpha). The subject is
centred, filling about 75% of the width.

SUBJECT: plan view from directly above of one rectangular parking floor. Its outer wall is a
heavier outline in grey #7F889B, stroke about 4 px, with ONE short gap in the bottom wall — the
entrance. Inside, two parallel vertical aisles are joined along the bottom by one horizontal cross
aisle, together forming a U shape that meets the entrance gap. Both sides of both vertical aisles
are lined with identical narrow parking bays, outlines only in grey #7F889B, stroke about 2 px.
All three aisles are filled with very light blue #4F7BF0 at 12% opacity. One single path line
starts at the entrance gap, runs along the cross aisle and up the middle of both vertical aisles,
drawn with a smooth gradient from blue #4F7BF0 at the entrance to violet #7B5CFF at the far ends,
stroke about 4 px — as if the network were being flooded from the entrance.

STYLE: precise technical drawing, orthographic plan, vector-like, uniform strokes, square
corners, flat.

FORBIDDEN — reject and redo if any appear: any text, letters, numbers, digits, bay numbers or
labels; arrows or arrowheads; cars; orange, amber, yellow, gold, red or green anywhere; white or
black backgrounds; glow, blur, drop shadows, 3D, textures, noise; people, screens, devices;
stamps, seals, ticks, check marks, certificates.
```

---

## 10 — `method-chain.png` — المراحل الاربع في صفحه المنهجيه

**المكان:** الجنب التاني من عنوان `/method`. المقاس النهائي 1200×800. **النص البديل:** «اربع مراحل متتاليه، اخرها بوابه تمنع الخروج.» / "Four stages in a row, the last one a gate that holds the output back."

```
IMAGE 10 of 16 — file name: method-chain.png
Format: landscape 1536x1024, PNG with a FULLY TRANSPARENT background (alpha). The subject is
one horizontal row across the vertical middle with generous empty space above and below.

SUBJECT: four equal outlined squares in one row, in grey #7F889B, stroke about 3 px, joined left
to right by three short straight connector lines.
Inside the first square: a rectangle with a second, smaller rectangle offset evenly inward
inside it — a setback.
Inside the second: a fine regular square grid.
Inside the third: a tiny tree of three nodes joined by orthogonal lines.
The fourth square is a closed gate: its right side is replaced by one thick solid vertical bar in
blue #4F7BF0, about four times the normal stroke.
The three connectors between the squares have a smooth gradient from blue #4F7BF0 to violet
#7B5CFF. Beyond the gate, one short dotted grey line continues to the right and simply ends.

STYLE: precise technical illustration, flat, vector-like, uniform strokes, square corners.

FORBIDDEN — reject and redo if any appear: any text, letters, numbers, digits or labels;
padlocks, keys, shields, warning signs; arrows; orange, amber, yellow, gold, red or green
anywhere; white or black backgrounds; glow, blur, drop shadows, 3D, textures, noise; people,
screens, devices; stamps, seals, ticks, check marks, certificates.
```

---

## 11 — `not-found.png` — صفحه 404

**المكان:** صفحه «مش موجود». المقاس النهائي 480×320. **النص البديل:** فاضي.

```
IMAGE 11 of 16 — file name: not-found.png
Format: landscape 1536x1024, PNG with a FULLY TRANSPARENT background (alpha). The subject is
centred with generous empty space around it.

SUBJECT: a grid of nine sheets in three rows of three, evenly spaced. Each sheet is an outlined
rectangle in grey #7F889B, stroke about 3 px, with a small irregular land-plot outline drawn
inside it in the same grey. Eight sheets are drawn this way. ONE sheet — in the top-right
position, not the centre — has a dotted outline in blue #4F7BF0 and is empty: its plot is missing.
Nothing marks it as an error.

STYLE: precise technical illustration, flat, vector-like, uniform strokes, square corners.

FORBIDDEN — reject and redo if any appear: any text, letters, numbers, digits, "404" or labels;
crosses, exclamation marks, question marks, torn or crumpled paper, magnifying glasses; orange,
amber, yellow, gold, red or green anywhere; white or black backgrounds; glow, blur, drop shadows,
3D, textures, noise; people, faces, screens, devices; stamps, seals, ticks, certificates.
```

---

## 12 — `parking-section-model.png` — مقطع المجسم في صفحه المواقف

**المكان:** صوره كبيره في اطار في `/parking`، جنب قسم «كل ترتيب يعبأ». المقاس النهائي 1200×800. **النص البديل:** «مقطع في مجسم مبنى يظهر ادوار المواقف تحت الارض والمنحدر بينها.» / "A section through a model building, showing the basement parking levels and the ramp between them."

```
IMAGE 12 of 16 — file name: parking-section-model.png
Format: landscape 1536x1024, opaque image (not transparent).

BACKGROUND: a seamless photography-studio sweep in cool light grey, smooth vertical gradient
from #D5DBE4 at the top to #B7C0CE at the bottom, with no horizon line, no floor texture and no
vignette. This background is part of the image and must look the same everywhere: the image is
shown inside a framed card on both light and dark pages.

SUBJECT: a high-end architectural "white clay model" of one residential building, cut cleanly in
half vertically like a section model, seen from a low three-quarter camera, slightly telephoto,
no lens distortion. Matte white and very light grey materials only, like a physical study model
made of card and plaster. The cut face shows the levels as thin white slabs: two basement parking
levels below a clear ground line, with faint light-grey lines of parking bays on their floors; a
ground floor; a podium of two levels; and a slimmer tower of six levels set back above it. Plain
volumes, no windows, no facade detail. On the cut face, one thin precise line traces the ramp
between the two parking levels, drawn with a smooth gradient from blue #4F7BF0 to violet #7B5CFF
— the ONLY colour in the image. The model stands centred on a thin white plinth with generous
empty space around it.

LIGHT: soft overcast daylight from the upper left, gentle ambient occlusion where volumes meet,
a soft contact shadow under the plinth, no harsh shadows.

FORBIDDEN — reject and redo if any appear: any text, letters, numbers, signs, labels, logos or
watermarks; real or recognisable buildings, landmarks or skylines; people or figurines; cars with
detail; trees; orange, amber, yellow, gold, warm or sunset light, red or green anywhere; glossy
glass, reflections, lens flare, bokeh; dramatic sky; screens or devices; stamps, seals, ticks,
certificates.
```

---

## 13 — `exports-model.png` — المجسم والاوراق في صفحه النواتج

**المكان:** الجنب التاني من عنوان `/exports`، في اطار. المقاس النهائي 1200×800. **النص البديل:** «مجسم ابيض لمبنى، وحوله اوراق مطويه بلا كتابه.» / "A white model building, with blank folded sheets around it."

```
IMAGE 13 of 16 — file name: exports-model.png
Format: landscape 1536x1024, opaque image (not transparent).

BACKGROUND: a seamless photography-studio sweep in cool light grey, smooth vertical gradient
from #D5DBE4 at the top to #B7C0CE at the bottom, with no horizon line, no floor texture and no
vignette. The image is shown inside a framed card on both light and dark pages.

SUBJECT: a high-end architectural "white clay model" of one mid-rise residential building — a
wide podium of three levels and a slimmer tower of about eight levels set back above it — standing
on a thin square white plinth. Plain matte white volumes, no windows, no facade detail. Around the
plinth on the same ground, five sheets of plain white paper lie flat at slightly different angles,
one of them folded in an accordion like a printed drawing set. The sheets are COMPLETELY BLANK.
The top edge of the plinth is traced with one thin precise line with a smooth gradient from blue
#4F7BF0 to violet #7B5CFF — the ONLY colour in the image.
Camera: aerial three-quarter view, about 35 degrees down, slightly telephoto, no distortion. The
model sits slightly right of centre.

LIGHT: soft overcast daylight from the upper left, gentle ambient occlusion, soft contact
shadows, no harsh shadows.

FORBIDDEN — reject and redo if any appear: any text, drawings, lines or marks on the paper
sheets; any letters, numbers, signs, labels, logos or watermarks; real or recognisable
buildings, landmarks or skylines; people, hands, pens, desks, laptops, screens or devices;
orange, amber, yellow, gold, warm or sunset light, red or green anywhere; glossy glass,
reflections, lens flare, bokeh; stamps, seals, ticks, certificates.
```

---

## 14 — `studies-empty.png` — صفحه «دراساتك» وهي فاضيه

**المكان:** فوق رساله «مفيش دراسات لسه». المقاس النهائي 480×320. **النص البديل:** فاضي، لان العنوان والزرار تحتها بيقولوا المعنى.

```
IMAGE 14 of 16 — file name: studies-empty.png
Format: landscape 1536x1024, PNG with a FULLY TRANSPARENT background (alpha). The subject is
centred with generous empty space around it.

SUBJECT: one empty drawing sheet lying flat, seen from directly above: an outlined rectangle in
grey #7F889B, stroke about 3 px, with a second inner border line offset evenly on all four sides,
and a small title-block grid of four empty cells ruled in the lower-right corner. The outline of
the title block only is drawn in blue #4F7BF0 — the only colour. Nothing else on the sheet. It
must look ready to be drawn on, not broken or missing.

STYLE: precise technical illustration, flat, vector-like, uniform strokes, square corners.

FORBIDDEN — reject and redo if any appear: any text, letters, numbers, digits or labels in the
title block or anywhere; plus signs, arrows, pencils, folders; orange, amber, yellow, gold, red or
green anywhere; white or black backgrounds; glow, blur, drop shadows, 3D, textures, noise;
people, hands, screens, devices; stamps, seals, ticks, check marks, certificates.
```

---

## 15 — `cta-pattern.png` — نقشه شريط الدعوه

**المكان:** فوق شريط الدعوه الملون (ازرق لبنفسجي) في اخر كل صفحه. الشريط لونه ثابت في الوضعين، فالنقشه البيضا بتنفع في الاتنين. المقاس النهائي 1600×500. **النص البديل:** فاضي.

```
IMAGE 15 of 16 — file name: cta-pattern.png
Format: landscape 1536x1024, PNG with a FULLY TRANSPARENT background (alpha). It will be laid
over a blue-to-violet band, so it contains ONLY white lines.

SUBJECT: a fine square grid of very thin white #FFFFFF lines at 10% opacity across the whole
canvas. Over it, three large irregular land-plot outlines of different sizes and rotations, drawn
as thin white lines at 30% opacity, running off the right and bottom edges of the canvas. The
LEFT 45% of the canvas is completely empty — no grid, no lines at all — so text placed there stays
clean; the grid fades in smoothly from the middle toward the right.

STYLE: precise technical linework, vector-like, uniform thin strokes, square corners, flat,
orthographic.

FORBIDDEN — reject and redo if any appear: any colour other than white; any background colour;
any text, letters, numbers, digits or labels; glow, blur, shadows, 3D, textures, noise; people,
screens, devices; stamps, seals, ticks, certificates; skylines or landmarks.
```

---

## 16 — `enter-panel.png` — صوره صفحه الدخول

**المكان:** النص التاني من صفحه الدخول (`/enter`). المقاس النهائي 960×1200. **النص البديل:** «مجسم ابيض لمبنى على قطعته، وحدود القطعه بخط ازرق.» / "A white model of a building on its plot, the plot boundary in a blue line."

```
IMAGE 16 of 16 — file name: enter-panel.png
Format: portrait 1024x1536, opaque image (not transparent).

BACKGROUND: a seamless photography-studio sweep in cool light grey, smooth vertical gradient
from #D5DBE4 at the top to #B7C0CE at the bottom, with no horizon line, no floor texture and no
vignette. The image fills one half of the sign-in page on both light and dark themes.

SUBJECT: a high-end architectural "white clay model" of a single mid-rise residential building on
its plot, seen from an aerial three-quarter camera about 35 degrees down, slightly telephoto, no
distortion. Matte white and very light grey materials only, like a physical study model of card
and plaster. A wide podium of three levels and a slimmer tower of about eight levels set back
above it — plain volumes, no windows. The plot is a thin white plinth; its boundary is traced by
one thin precise line with a smooth gradient from blue #4F7BF0 to violet #7B5CFF — the ONLY
colour in the image. One side of the podium is cut open like a section model, showing a parking
level inside as fine light-grey lines of bays. The building sits in the lower-middle of the frame
and runs slightly off the bottom edge; the upper third is calm empty background.

LIGHT: soft overcast daylight from the upper left, gentle ambient occlusion, soft contact
shadows, no harsh shadows.

FORBIDDEN — reject and redo if any appear: any text, letters, numbers, signs, labels, logos or
watermarks; real or recognisable buildings, landmarks or skylines (no Burj Khalifa, no Dubai
skyline); people or figurines; cars with detail; trees; orange, amber, yellow, gold, warm or
sunset light, red or green anywhere; glossy glass, reflections, lens flare, bokeh; dramatic sky;
screens or devices; stamps, seals, ticks, certificates.
```

---

## حاجات **متتولدش** بالصور

- **صوره المشاركه (`og-cover.png`).** لقطه حقيقيه من الصفحه الرئيسيه، وانا بطلعها بالبرنامج.
- **الهيرو والمجسم ولوحه المواقف.** دي المجسم الحقيقي اللي المحرك بناه ومستطيلات المحرك نفسه. صوره متولده مكانهم تبقى مبنى محدش حسبه.
- **صور الشاشه.** بتطلع من `node scripts/shoot-next.mjs`.
- **اللوجو والايقونات ورموز الطرق.** مرسومين بالكود.
- **صور اشخاص او فريق او اراء عملاء.** صوره متولده لشخص تبقى شهاده مزيفه.

## قبل ما تبعتلي اي صوره، راجع دول

1. مفيش اي رقم او حرف او كلمه، ولا حتى مموهه.
2. مفيش برتقالي ولا كهرماني ولا اصفر ولا ذهبي ولا احمر ولا اخضر، ولا ضوء غروب دافي.
3. مفيش اختام ولا علامات صح ولا شهادات ولا دروع. المنتج مش بيؤكد المطابقه، والصوره متقولش عكس كده.
4. مفيش ناس ولا لوجوهات ولا شاشات ولا مباني حقيقيه معروفه.
5. الصور 1 لـ11 و14 و15 خلفيتها شفافه فعلا. افتحها على خلفيه سودا وخلفيه بيضا وتاكد انها باينه في الاتنين.
6. الست كروت (2 لـ7) شبه بعض في سمك الخط والمسافات وحجم العنصر.
