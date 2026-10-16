# C.6 Building access and vehicular requirements — DBC 2021 rule reference

**Part C: Accessibility.** A supplement from outside Part B, included for the accessible-bay rules
that B.7 cross-refers to.

Source: Dubai Building Code, 2021 Edition, Part C: Accessibility. English PDF pp. 190–196, Arabic PDF
pp. 190–196 (offset 0; printed labels C 40–C 46). Extracted with pdfjs-dist and checked against page
renders. Verbal forms per DBC A.3.2: shall = mandatory (يجب) · should = recommended (يُفضل) ·
may = permitted (يمكن).

Arabic title: اشتراطات الوصول إلى المبنى وحركة المركبات

## Contents
- [C.6.1 Vehicular entries and accessible routes](#c61-vehicular-entries-and-accessible-routes--مسارات-الوصول-ودخول-المركبات) — EN p190 · AR p190
- [C.6.2 Curb ramps](#c62-curb-ramps--مُنحدرات-الرصيف) — EN p191–193 · AR p191–193
  - [C.6.2.1 General](#c621-general--عام) — EN p191 · AR p191
  - [C.6.2.2 Types of curb ramps](#c622-types-of-curb-ramps--أنواع-منحدرات-الرصيف) — EN p192 · AR p192
    - [C.6.2.2.1 Curb ramps with flared sides](#c6221-curb-ramps-with-flared-sides--منحدرات-الرصيف-بجوانب-مائلة) — EN p192 · AR p192
    - [C.6.2.2.2 Returned curb ramps](#c6222-returned-curb-ramps--منحدرات-الرصيف-المنحصرة) — EN p192 · AR p192
    - [C.6.2.2.3 Curb ramps in curb extensions](#c6223-curb-ramps-in-curb-extensions--منحدرات-الأرصفة-في-توسعات-الرصيف) — EN p193 · AR p193
    - [C.6.2.2.4 Lowered sidewalk curb ramps](#c6224-lowered-sidewalk-curb-ramps--منحدرات-الرصيف-الجانبي-المنخفض) — EN p193 · AR p193
- [C.6.3 Pickup and drop-off areas](#c63-pickup-and-drop-off-areas--مناطق-إنزال-وتحميل-الركاب) — EN p194 · AR p194
- [C.6.4 Accessible parking](#c64-accessible-parking--أماكن-مواقف-السيارات-المخصصة-لأصحاب-الهمم) — EN p194–196 · AR p194–196
  - [C.6.4.1 Accessible parking provision](#c641-accessible-parking-provision--توفير-مواقف-سيارات-المخصصة-لأصحاب-الهمم) — EN p194 · AR p194
  - [C.6.4.2 Location of accessible parking spaces](#c642-location-of-accessible-parking-spaces--موقع-أماكن-وقوف-السيارات-المخصصة-لأصحاب-الهمم) — EN p195–196 · AR p195–196

## Summary counts
Rules recorded: 42 (shall: 31, should: 6, may: 3, informative: 2, definition: 0). Table rows: 10.
Figure dimensions: 25. UNREADABLE: 0. EDITION MISMATCH: 5.

Counting convention: an entry whose quote mixes verbal forms is counted under its strongest verb
(shall > should > may) and the mix is stated in its Obligation field.

Internal inconsistencies inside the code (both editions print the same, so not EDITION MISMATCH):
- Figure C.59 dimensions the accessible van bay as ≥3.3 m wide; Table C.18 gives 3.35 m (EN/AR p194, p196).
- Figure C.58 prints a curb height of 75-120 (mm); C.6.2.1 a) states 75–150 mm (p191, p193).
- Table C.16 has a 200 mm sidewalk-height row "(only for existing sidewalks)"; C.6.2.1 a) caps curb height at 150 mm (p191).

---

## C.6.1 Vehicular entries and accessible routes — مسارات الوصول ودخول المركبات
EN p190 · AR p190

#### C.6.1 ¶1
- **Pages:** EN p190 · AR p190
- **EN:** "The level and minimum width of an accessible route shall not be affected by a vehicular entry (see Figure C.52). The level difference between an accessible sidewalk and a vehicular access should be resolved as shown in Figure C.53 or Figure C.54."
- **AR:** "يجب ألا يتأثر مستوى وأدنى عرض لمسار الوصول بمداخل المركبات (انظر الشكل C.52). يُفضل تسوية الاختلاف في المستوى بين الرصيف الجانبي المهيأ لسهولة الوصول ومدخل المركبات على النحو الموضح في الشكل C.53 أو الشكل C.54."
- **Values:** accessible-route level and min width unchanged across a vehicular entry; sidewalk depression slopes ≤5 % (Figure C.54)
- **Conditions / exceptions:** Figures C.53 / C.54 show the two accepted resolutions.
- **Refs:** Figure C.52, Figure C.53, Figure C.54
- **Obligation:** shall (level and width unaffected) + should (resolution per C.53/C.54)
- **Mechanisable from plot geometry + inputs?** partly — the engine knows where the driveway crosses the plot edge; the sidewalk profile is outside the plot and not modelled.

#### C.6.1 ¶2
- **Pages:** EN p190 · AR p190
- **EN:** "Barrier access and queuing on a vehicular access shall not obstruct an accessible route."
- **AR:** "يجب ألا تعيق حواجز وصفوف المركبات عند مدخلها مسار الوصول."
- **Values:** —
- **Conditions / exceptions:** applies to barriers and vehicle queues at the vehicular access.
- **Refs:** —
- **Obligation:** shall (prohibition)
- **Mechanisable from plot geometry + inputs?** partly — needs a barrier position and a queue length, neither of which is an input today; with them it is a geometric overlap test against the accessible route.

#### Figure C.52 Unacceptable vehicle entry
- **Pages:** EN p190 · AR p190
- **AR caption:** "مدخل مركبات غير مقبول"
- No dimension labels printed. Shows a sidewalk whose level is broken by a driveway, crossed out.

#### Figure C.53 Possible solution for vehicle entry
- **Pages:** EN p190 · AR p190
- **AR caption:** "حل مسموح لمدخل المركبات"
- No dimension labels printed. Shows the sidewalk kept continuous and level across the driveway, the ramp to the road confined to the kerb strip.

#### Figure C.54 Depression of sidewalk – Possible vehicle entry alternative
- **Pages:** EN p190 · AR p190
- **AR caption:** "هبوط في الرصيف - بديل محتمل لمدخل المركبات"
- ≤5% — gradient of the left transition slope, where the sidewalk descends along its length into the depressed section
- ≤5% — gradient of the depressed sidewalk section directly in front of the vehicle door, sloping across the sidewalk (arrow points toward the door)
- ≤5% — gradient of the right transition slope, where the sidewalk rises along its length back to full height
- Key: none printed.

---

## C.6.2 Curb ramps — مُنحدرات الرصيف
EN p191 · AR p191

### C.6.2.1 General — عام
EN p191 · AR p191

#### C.6.2.1 ¶1
- **Pages:** EN p191 · AR p191
- **EN:** "All curb ramp types described in C.6.2.2 shall conform to the following."
- **AR:** "يجب أن تتوافق جميع أنواع منحدرات الرصيف الموصوفة في C.6.2.2 مع ما يلي."
- **Values:** —
- **Conditions / exceptions:** introduces a)–k).
- **Refs:** C.6.2.2
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — scope statement.

#### C.6.2.1 a)
- **Pages:** EN p191 · AR p191
- **EN:** "The running gradient shall be not more than 8%. Depending on the height of the sidewalk, the length shall conform to Table C.16. The curb height shall be not less than 75 mm and not more than 150 mm."
- **AR:** "يجب ألا يزيد انحدار المسار عن 8%. اعتمادًا على ارتفاع الرصيف الجانبي، يجب أن يتوافق الطول مع الجدول C.16. يجب ألا يقل ارتفاع الرصيف عن 75 mm ولا يزيد عن 150 mm."
- **Values:** running gradient max 8 %; curb height 75–150 mm; length per Table C.16
- **Conditions / exceptions:** Table C.16 also lists 200 mm "only for existing sidewalks"; Figure C.58 shows 75-120.
- **Refs:** Table C.16
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** yes — length = curb height ÷ 0.08, checkable once a curb height is given.

#### C.6.2.1 b)
- **Pages:** EN p191 · AR p191
- **EN:** "The total width of curb ramps in pedestrian crossings shall be the same as that of the accessible route. The total width shall be not less than 1,200 mm, with no interruptions by any obstacle or raised pavement."
- **AR:** "يجب أن يكون العرض الإجمالي لمنحدرات الرصيف في معابر المشاة هو نفس عرض مسار الوصول دون تغيير. يجب ألا يقل العرض الإجمالي عن 1,200 mm، ويُشترط عدم وجود عوائق أو منصات مرتفعة."
- **Values:** width = accessible route width; min 1,200 mm
- **Conditions / exceptions:** no obstacle or raised pavement within the width.
- **Refs:** —
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** yes — a width check.

#### C.6.2.1 c)
- **Pages:** EN p191 · AR p191
- **EN:** "Curb ramps shall not interfere with the accessible route. Curb ramps shall be free of any obstruction such as signposts, traffic lights and similar items."
- **AR:** "يجب ألا تتداخل منحدرات الرصيف مع مسارات الوصول. يجب أن تكون منحدرات الرصيف خالية من أي عوائق مثل لافتات الطريق والإشارات المرورية وما شابه ذلك."
- **Values:** —
- **Conditions / exceptions:** —
- **Refs:** —
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — street furniture is not modelled.

#### C.6.2.1 d)
- **Pages:** EN p191 · AR p191
- **EN:** "Curb ramps shall have tactile warning paving at 300 mm from the curb edge to driveways."
- **AR:** "يجب أن تحتوي منحدرات الرصيف على رصف تحذيري محسوس على بعد 300 mm من حافة الرصيف يصل إلى طريق السيارات."
- **Values:** tactile warning paving at 300 mm from the curb edge
- **Conditions / exceptions:** EN does not say whether 300 mm is the depth of the paving band or its set-back; AR reads "at a distance of 300 mm from the curb edge". Recorded as printed.
- **Refs:** —
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — paving detail.

#### C.6.2.1 e)
- **Pages:** EN p191 · AR p191
- **EN:** "Curb ramp edge surfaces shall be completely level with the road."
- **AR:** "يجب أن تكون أسطح حافة منحدرات الرصيف مستوية تمامًا مع الطريق."
- **Values:** 0 mm lip at road edge
- **Conditions / exceptions:** —
- **Refs:** —
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — construction detail.

#### C.6.2.1 f)
- **Pages:** EN p191 · AR p191
- **EN:** "The colour and texture of the curb ramp should be similar to the accessible route."
- **AR:** "يُفضل أن يكون لون وملمس منحدر الرصيف مشابهًا لمسار الوصول."
- **Values:** —
- **Conditions / exceptions:** —
- **Refs:** —
- **Obligation:** should
- **Mechanisable from plot geometry + inputs?** no — finish.

#### C.6.2.1 g)
- **Pages:** EN p191 · AR p191
- **EN:** "The surface of the curb ramp shall conform to C.7.2.1."
- **AR:** "يجب أن يتوافق سطح منحدر الرصيف مع C.7.2.1."
- **Values:** per C.7.2.1
- **Conditions / exceptions:** —
- **Refs:** C.7.2.1
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — finish.

#### C.6.2.1 h)
- **Pages:** EN p191 · AR p191
- **EN:** "The maximum cross-slope gradient shall be 2%."
- **AR:** "يجب أن يكون الحد الأقصى لانحدار الميل العمودي على اتجاه الحركة 2%."
- **Values:** cross-slope max 2 %
- **Conditions / exceptions:** flared sides in parking and drop-off areas may reach 12 % (C.6.2.2.1 ¶2).
- **Refs:** C.6.2.2.1
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — levels not modelled.

#### C.6.2.1 i)
- **Pages:** EN p191 · AR p191
- **EN:** "Curb ramps shall be located or protected to prevent obstruction by parked vehicles."
- **AR:** "يجب وضع منحدرات الرصيف وحمايتها على نحو يمنع إعاقة المركبات المتوقفة لمستخدمي المنحدرات."
- **Values:** —
- **Conditions / exceptions:** EN "located or protected"; AR "وضع ... وحمايتها" (located and protected). Wording differs (or / and); no number differs. Not counted as EDITION MISMATCH.
- **Refs:** —
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — the engine places bays and could test that no bay overlaps a curb-ramp footprint, if curb ramps were placed.

#### C.6.2.1 j)
- **Pages:** EN p191 · AR p191
- **EN:** "Curb ramps located on both sides of a street should align."
- **AR:** "يُفضل محاذاة منحدرات الرصيف الواقعة على جانبي الشارع."
- **Values:** —
- **Conditions / exceptions:** —
- **Refs:** —
- **Obligation:** should
- **Mechanisable from plot geometry + inputs?** no — street design outside the plot.

#### C.6.2.1 k)
- **Pages:** EN p191 · AR p191
- **EN:** "Visual, audible and tactile warning devices shall be provided when a pedestrian crossing is required."
- **AR:** "يجب توفير أجهزة تحذير مرئية ومسموعة ومحسوسة عندما يكون هناك معبر للمشاة."
- **Values:** —
- **Conditions / exceptions:** EN "when a pedestrian crossing is required"; AR "when there is a pedestrian crossing".
- **Refs:** —
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — street design.

#### Table C.16 Dimensions and gradients of curb ramps
- **Pages:** EN p191 · AR p191
- **AR caption:** "أبعاد وانحدار منحدرات الرصيف"
- EN column groups: Sidewalk height (mm) · Central passage dimensions [Length (mm) · Width (mm) · Max. gradient (%)] · Flared sides [Length (mm) · Max. gradient (%)].
- AR column groups: ارتفاع الرصيف (mm) · أبعاد الممر المركزي [الطول (mm) · العرض (mm) · الحد الأقصى للانحدار (%)] · جوانب المنحدر المائلة [الطول (mm) · الحد الأقصى للانحدار (%)].

| Sidewalk height (mm) | Central passage Length (mm) | Central passage Width (mm) | Central passage Max. gradient (%) | Flared sides Length (mm) | Flared sides Max. gradient (%) | AR (row as printed) | Values (normalised) | Conditions | Obligation | Mechanisable |
|---|---|---|---|---|---|---|---|---|---|---|
| 100 | 1,250 | Equal to crossing area width – 1,200 min. | 8 | 1,250 | 8 | 100 · 1,250 · يساوي عرض منطقة الممر - 1,200 بحد أدنى · 8 · 1,250 · 8 | h 100 mm → L 1,250 mm; W = crossing width, min 1,200 mm; max 8 % | Width cell spans rows 1–3; both "Max. gradient" cells span rows 1–3 | shall (via C.6.2.1 a)) | yes — arithmetic (100 / 0.08 = 1,250) |
| 150 | 1,875 | Equal to crossing area width – 1,200 min. | 8 | 1,875 | 8 | 150 · 1,875 · (spanning width cell) · 8 · 1,875 · 8 | h 150 mm → L 1,875 mm; W min 1,200 mm; max 8 % | spans as above | shall (via C.6.2.1 a)) | yes — arithmetic (150 / 0.08 = 1,875) |
| 200 (only for existing sidewalks) | 2,500 | Equal to crossing area width – 1,200 min. | 8 | 2,500 | 8 | 200 (للأرصفة الجانبية القائمة فقط) · 2,500 · (spanning width cell) · 8 · 2,500 · 8 | h 200 mm → L 2,500 mm; W min 1,200 mm; max 8 % | existing sidewalks only; exceeds the 150 mm cap of C.6.2.1 a) | shall (via C.6.2.1 a)) | yes — arithmetic (200 / 0.08 = 2,500) |

### C.6.2.2 Types of curb ramps — أنواع منحدرات الرصيف
EN p192 · AR p192

### C.6.2.2.1 Curb ramps with flared sides — منحدرات الرصيف بجوانب مائلة
EN p192 · AR p192

#### C.6.2.2.1 ¶1
- **Pages:** EN p192 · AR p192
- **EN:** "Curb ramps with flared sides are preferred. They shall have three slopes (see Figure C.55)."
- **AR:** "يُفضل وضع منحدرات الرصيف ذات الجوانب المائلة. ويكون لها ثلاث أوجه مائلة (انظر الشكل C.55)."
- **Values:** three slopes
- **Conditions / exceptions:** EDITION MISMATCH — EN "They shall have three slopes" (mandatory); AR "ويكون لها ثلاث أوجه مائلة" ("and they have three sloped faces", no يجب — descriptive).
- **Refs:** Figure C.55
- **Obligation:** should ("preferred") + shall (three slopes, EN only)
- **Mechanisable from plot geometry + inputs?** no — kerb design.

#### C.6.2.2.1 ¶2
- **Pages:** EN p192 · AR p192
- **EN:** "In exceptional cases, the flared sides of ramps located in parking and drop-off areas can have higher cross-slope gradients, but shall not exceed 12%."
- **AR:** "في حالات استثنائية، يمكن أن يكون لجوانب المنحدرات الواقعة في مناطق وقوف السيارات ومناطق إنزال الركاب تدرج أعلى للميل العمودي على اتجاه الحركة، ولكن يجب ألا يتجاوز 12%."
- **Values:** flared-side cross-slope max 12 %
- **Conditions / exceptions:** exceptional cases only; parking and drop-off areas only.
- **Refs:** C.6.2.1 h)
- **Obligation:** may (higher slope) + shall (cap 12 %)
- **Mechanisable from plot geometry + inputs?** no — kerb levels not modelled.

#### Figure C.55 Example of flared side curb ramps
- **Pages:** EN p192 · AR p192
- **AR caption:** "مثال على منحدرات الرصيف ذات الجوانب المائلة"
- 75-150 — curb height (mm), at the sidewalk edge beside the ramp
- ≥1,200 — width of the central passage of the curb ramp, measured parallel to the curb across the sloped centre panel
- (Dimension line marked 01 — width of the accessible route; no figure printed.)
- (Slope direction triangles on the central panel and both flared sides; no gradient printed.)
- Key (EN): 01: Accessible route · 02: Drain grids outside the intersection
- Key (AR): 01: مسار الوصول · 02: مكان فتحة الصرف خارج المسار المتقاطع

### C.6.2.2.2 Returned curb ramps — منحدرات الرصيف المنحصرة
EN p192 · AR p192

#### C.6.2.2.2 ¶1
- **Pages:** EN p192 · AR p192
- **EN:** "Returned curb ramps comprise a single slope placed longitudinally from the crossing direction, creating two different levels of variable height on its sides (see Figure C.56)."
- **AR:** "تتكون منحدرات الرصيف المنحصرة من منحدر واحد يتم وضعه طوليًا في اتجاه العبور، مما يخلق مستويين مختلفين بارتفاع متغير على الجوانب (انظر الشكل C.56)."
- **Values:** —
- **Conditions / exceptions:** description of the type.
- **Refs:** Figure C.56
- **Obligation:** informative
- **Mechanisable from plot geometry + inputs?** no — description.

#### C.6.2.2.2 ¶2
- **Pages:** EN p192 · AR p192
- **EN:** "The level change on the curb side edges should be protected by a barrier or urban furniture."
- **AR:** "يُفضل حماية تغيير المستوى على حواف الرصيف الجانبية باستخدام حاجز أو عناصر حضرية."
- **Values:** —
- **Conditions / exceptions:** —
- **Refs:** —
- **Obligation:** should
- **Mechanisable from plot geometry + inputs?** no — street furniture.

#### Figure C.56 Example of returned curb ramp
- **Pages:** EN p192 · AR p192
- **AR caption:** "مثال على منحدر الرصيف المنحصرة"
- 75-150 — curb height (mm), at the sidewalk edge beside the traffic-light pole
- ≥1,200 — width of the returned curb ramp, measured across the single slope
- ≤8% — running gradient of the single slope (arrow on the ramp)
- (Dimension line marked 01 — width of the accessible route; no figure printed.)
- Key (EN): 01: Accessible route · Key (AR): 01: مسار الوصول

### C.6.2.2.3 Curb ramps in curb extensions — منحدرات الأرصفة في توسعات الرصيف
EN p193 · AR p193

#### C.6.2.2.3 ¶1
- **Pages:** EN p193 · AR p193
- **EN:** "Curb ramps in curb extensions are appropriate when the sidewalk is narrow. Extensions in the street corners can be created to reduce the pedestrian crossing distance (see Figure C.57)."
- **AR:** "تُعد منحدرات الأرصفة في توسعات الرصيف مناسبة في حال كان الرصيف ضيقًا. يمكن إنشاء هذه التوسيعات في زوايا الشارع لتقليل مسافة عبور المشاة (انظر الشكل C.57)."
- **Values:** —
- **Conditions / exceptions:** narrow sidewalk; "narrow" not quantified.
- **Refs:** Figure C.57
- **Obligation:** may
- **Mechanisable from plot geometry + inputs?** no — street design outside the plot.

#### Figure C.57 Example of curb ramps in curb extensions
- **Pages:** EN p193 · AR p193
- **AR caption:** "مثال على المُنحدرات في توسعات الرصيف"
- No dimension labels printed (slope triangles only).
- Key: none printed.

### C.6.2.2.4 Lowered sidewalk curb ramps — منحدرات الرصيف الجانبي المنخفض
EN p193 · AR p193

#### C.6.2.2.4 ¶1
- **Pages:** EN p193 · AR p193
- **EN:** "Lowered sidewalk curb ramps are permitted when the sidewalk width does not allow the use of other curb cut types (see Figure C.58)."
- **AR:** "يُسمح باستخدام منحدرات الرصيف الجانبي المنخفض عندما لا يسمح عرض الرصيف باستخدام أنواع أخرى من قطاعات الرصيف (انظر الشكل C.58)."
- **Values:** —
- **Conditions / exceptions:** only where sidewalk width rules out other types.
- **Refs:** Figure C.58
- **Obligation:** may ("permitted")
- **Mechanisable from plot geometry + inputs?** no — sidewalk width is not a plot input.

#### C.6.2.2.4 ¶2
- **Pages:** EN p193 · AR p193
- **EN:** "Two running slopes lower the sidewalk’s full width to the roadway level. A minimum 1,200 mm long landing should be provided between the two slopes. The border level with the roadway shall include a tactile warning pavement."
- **AR:** "يعمل ميل اتجاه الحركة على خفض العرض الكامل للرصيف حتى يصل إلى مستوى الطريق. يُفضل توفير بسطة بطول 1,200 mm على الأقل بين المنحدرين. يجب أن يشتمل مستوى الحد الفاصل مع الطريق على رصيف تحذير محسوس."
- **Values:** landing min 1,200 mm long between the two slopes; slopes ≤5 %, 2,400 long (Figure C.58)
- **Conditions / exceptions:** —
- **Refs:** Figure C.58
- **Obligation:** should (landing) + shall (tactile warning pavement)
- **Mechanisable from plot geometry + inputs?** no — street design.

#### C.6.2.2.4 ¶3
- **Pages:** EN p193 · AR p193
- **EN:** "This is the only curb ramp that is permitted to obstruct the pedestrian route."
- **AR:** "هذا هو منحدر الرصيف الوحيد الذي يُسمح بإعاقته للمسار المخصص للمشاة."
- **Values:** —
- **Conditions / exceptions:** implies all other curb-ramp types may not obstruct the pedestrian route (see C.6.2.1 c)).
- **Refs:** C.6.2.1 c)
- **Obligation:** may ("permitted")
- **Mechanisable from plot geometry + inputs?** no — street design.

#### Figure C.58 Example of lowered curb cut in a corner
- **Pages:** EN p193 · AR p193
- **AR caption:** "مثال على الرصيف المنخفض في زاوية"
- 75-120 — curb height (mm) at the sidewalk edge (left end). Differs from the 75–150 mm of C.6.2.1 a).
- 2,400 — length of the left running slope, measured along the building face
- 1,200 — length of the level landing from the end of the left slope to the corner, measured along the building face
- 1,200 — length of the level landing from the corner to the start of the right slope, measured along the building face
- 2,400 — length of the right running slope, measured along the building face
- ≤5% — gradient of the left running slope
- ≤5% — gradient of the right running slope
- (Dimension line marked 01 — width of the accessible route; no figure printed. 2,400 × 5 % = 120 mm, consistent with the 75-120 label.)
- Key (EN): 01: Accessible route · Key (AR): 01: مسار الوصول

---

## C.6.3 Pickup and drop-off areas — مناطق إنزال وتحميل الركاب
EN p194 · AR p194

#### C.6.3 ¶1
- **Pages:** EN p194 · AR p194
- **EN:** "Drop-off areas shall comply with Dubai Access Management manual requirements [Ref. C.16] Chapter 7.2. Accessible drop-off areas shall include curb ramps conforming to C.6.2."
- **AR:** "يجب أن تتوافق مناطق إنزال الركاب مع الاشتراطات الواردة في دليل الوصول في دبي [المرجع C.16] الفصل 7.2. يجب أن تشتمل مناطق تنزيل وتحميل الركاب المهيأة لسهولة الوصول على منحدرات رصيف مطابقة لـ C.6.2."
- **Values:** no dimension stated in the DBC; dimensions are in Ref. C.16 Ch. 7.2
- **Conditions / exceptions:** accessible drop-off areas need C.6.2 curb ramps.
- **Refs:** Dubai Access Management manual [Ref. C.16] Chapter 7.2; C.6.2
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — the governing dimensions are in an external manual not transcribed here.

#### C.6.3 ¶2
- **Pages:** EN p194 · AR p194
- **EN:** "Passenger drop-off and pickup areas shall provide a vehicular pull-up space in accordance with [Ref. C.16]."
- **AR:** "يجب أن توفر مناطق تنزيل وتحميل الركاب مكانًا لوقوف المركبات وفقًا لـ [المرجع C.16] ."
- **Values:** pull-up space dimensions per Ref. C.16 (not stated in the DBC)
- **Conditions / exceptions:** —
- **Refs:** [Ref. C.16]
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — external manual.

---

## C.6.4 Accessible parking — أماكن مواقف السيارات المخصصة لأصحاب الهمم
EN p194 · AR p194

### C.6.4.1 Accessible parking provision — توفير مواقف سيارات المخصصة لأصحاب الهمم
EN p194 · AR p194

#### C.6.4.1 ¶1
- **Pages:** EN p194 · AR p194
- **EN:** "Public or private parking areas associated with a public street, open space or building shall have accessible parking spaces. These parking spaces shall be reserved for holders of accessible parking stickers issued by any authorized jurisdiction."
- **AR:** "يجب أن تحتوي مواقف السيارات العامة أو الخاصة المرتبطة بشارع عام أو مساحة مفتوحة أو مبنى على مواقف سيارات لأصحاب الهمم. يجب حجز أماكن وقوف السيارات هذه لحاملي ملصقات وقوف السيارات المخصصة لأصحاب الهمم الصادرة عن أي سلطة مختصة."
- **Values:** —
- **Conditions / exceptions:** applies to public and private parking associated with a building. Exception for private housing is in Table C.17.
- **Refs:** Table C.17
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** yes — any building car park the engine lays out is in scope.

#### C.6.4.1 ¶2
- **Pages:** EN p194 · AR p194
- **EN:** "The number of accessible parking spaces shall be obtained from Table C.17."
- **AR:** "يجب الحصول على عدد أماكن وقوف السيارات المخصصة لأصحاب الهمم المطلوبة من الجدول C.17."
- **Values:** per Table C.17
- **Conditions / exceptions:** —
- **Refs:** Table C.17
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** yes — count from total bays and use (see Table C.17 for unstated rounding).

#### C.6.4.1 ¶3
- **Pages:** EN p194 · AR p194
- **EN:** "For hospitals and healthcare facilities, 10% of the overall parking capacity should be accessible."
- **AR:** "بالنسبة للمستشفيات ومنشآت الرعاية الصحية، يُفضل أن يكون 10% من إجمالي سعة مواقف السيارات مهيأة لأصحاب الهمم."
- **Values:** 10 % of overall parking capacity
- **Conditions / exceptions:** hospitals and healthcare facilities only.
- **Refs:** —
- **Obligation:** should
- **Mechanisable from plot geometry + inputs?** yes — arithmetic on total bays given a use flag.

#### C.6.4.1 ¶4
- **Pages:** EN p194 · AR p194
- **EN:** "Accessible van parking should be provided at a rate of 10% of overall accessible parking count. At least one accessible van parking space should be provided for each building or facility."
- **AR:** "يُفضل توفير مواقف شاحنات صغيرة لأصحاب الهمم (accessible van) بنسبة 10% من إجمالي عدد مواقف السيارات المتاحة المخصصة لأصحاب الهمم. يُفضل توفير موقف واحد على الأقل للشاحنات الصغيرة لأصحاب الهمم (accessible van) في كل مبنى أو مرفق."
- **Values:** van spaces = 10 % of accessible spaces; min 1 per building or facility
- **Conditions / exceptions:** rounding of 10 % not stated.
- **Refs:** Table C.18 (van dimensions)
- **Obligation:** should
- **Mechanisable from plot geometry + inputs?** yes — arithmetic on the accessible count.

#### C.6.4.1 ¶5
- **Pages:** EN p194 · AR p194
- **EN:** "Accessible parking spaces shall conform to the minimum dimensions in Table C.18."
- **AR:** "يجب أن تتوافق مواقف السيارات المهيأة لأصحاب الهمم مع الأبعاد الدنيا الواردة في الجدول C.18."
- **Values:** per Table C.18 (minimum dimensions)
- **Conditions / exceptions:** —
- **Refs:** Table C.18
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** yes — rectangle dimensions.

#### Table C.17 Minimum number of accessible parking spaces
- **Pages:** EN p194 · AR p194
- **AR caption:** "الحد الأدنى لعدد أماكن وقوف السيارات المخصصة لأصحاب الهمم"
- EN columns: Use of the building, establishment or area · Minimum number of accessible spaces (the second column is split in two sub-cells on rows 1–2: total-parking band · requirement).
- AR columns: استخدام المبنى أو المنشأة أو المساحة · الحد الأدنى لمواقف السيارات المخصصة لأصحاب الهمم.

| Use of the building, establishment or area | Total parking band | Minimum number of accessible spaces | AR (row as printed) | Values (normalised) | Conditions | Obligation | Mechanisable |
|---|---|---|---|---|---|---|---|
| All buildings except private housing | 25 to 500 total parking spaces | 2% of the total, and a minimum of one | جميع المباني ما عدا السكن الخاص والفلل الخاصة. · إجمالي مواقف السيارات 25 إلى 500 · 2% من الإجمالي، مع توفير موقف واحد على الأقل | total 25–500: accessible ≥ 2 % of total, and ≥ 1 | Use cell spans rows 1–2. EDITION MISMATCH — EN excepts "private housing"; AR excepts "السكن الخاص والفلل الخاصة" (private housing and private villas). Rounding of 2 % not stated (e.g. 130 bays → 2.6). No row for fewer than 25 total spaces. | shall (via C.6.4.1 ¶2) | partly — yes for exact multiples of 50; rounding rule not stated |
| All buildings except private housing | More than 500 total parking spaces | 1% for additional parking spaces over 500 | (same use cell, spanning) · إجمالي مواقف السيارات أكثر من 500 · 1% لمواقف السيارات الإضافية التي تزيد عن 500 | total > 500: 1 % of (total − 500) for the spaces above 500 | Use cell spans rows 1–2. The row does not state the count for the first 500; reading it as 10 (2 % of 500) + 1 % of the excess is an interpretation, not printed text. Rounding not stated. | shall (via C.6.4.1 ¶2) | partly — formula needs the interpretation above and a rounding rule |
| Buildings with reserved seating space for wheelchair users, such as cinemas and sport facilities | — | One for every two reserved seating spaces for wheelchair users | المباني التي تحتوي على مقاعد مخصصة لمستخدمي الكراسي المتحركة، مثل دور السينما والمرافق الرياضية. · يخصص موقف واحد لأصحاب الهمم من كل مساحتين (أو مقعدين) مخصصين لأصحاب الهمم في المبنى | accessible spaces = wheelchair seating spaces ÷ 2 | Rounding for an odd count not stated. Relationship to rows 1–2 (cumulative or alternative) not stated. | shall (via C.6.4.1 ¶2) | partly — needs wheelchair-seat count, not an engine input |
| Buildings and open spaces without parking facilities but with the following uses: a) administration headquarters; b) hospitals; c) education buildings; d) sport facilities; e) beaches with accessible routes; f) rehabilitation and day care centres; and g) clinics. | — | Two bays in the public areas, as close as possible to the building entrance (maximum 50 m) | المباني والمساحات المفتوحة بدون مواقف للسيارات ولكن تنطوي على الاستخدامات التالية: a) مقرات إدارية؛ b) المستشفيات؛ c) مباني تعليمية؛ d) منشآت رياضية؛ e) شواطئ بمسارات وصول؛ f) مراكز إعادة التأهيل والرعاية النهارية؛ و g) العيادات. · موقفان للسيارات في المناطق العامة، أقرب ما يمكن إلى مدخل المبنى (بحد أقصى 50 m) | 2 bays; max 50 m from building entrance | only where the building has no parking facilities; bays are in public areas | shall (via C.6.4.1 ¶2) | partly — count yes; location in the public realm is outside the plot |

#### Table C.18 Parking dimensions
- **Pages:** EN p194 · AR p194
- **AR caption:** "أبعاد مواقف السيارات"
- AR columns: نوع موقف السيارات · أبعاد أماكن وقوف السيارات (m).

| Parking type | Parking space dimensions (m) | AR (row as printed) | Values (normalised) | Conditions | Obligation | Mechanisable |
|---|---|---|---|---|---|---|
| Car – angled and perpendicular | 2.5 m × 5.5 m | سيارة – موقف بزاوية وعمودي · 2.5 m × 5.5 m | min 2.5 m wide × 5.5 m long | minimum dimensions (C.6.4.1 ¶5); access aisle ≥1,200 mm is additional (C.6.4.2 f)) | shall (via C.6.4.1 ¶5) | yes — rectangle size |
| Car – parallel – along the sidewalk | 2.5 m × 6.0 m | سيارة – موقف موازي - على طول الرصيف · 2.5 m × 6.0 m | min 2.5 m wide × 6.0 m long | minimum dimensions; rear access aisle ≥1.2 m additional (C.6.4.2 f), Figure C.60) | shall (via C.6.4.1 ¶5) | yes — rectangle size |
| Accessible van | 3.35 m × 5.5 m | شاحنة صغيرة لأصحاب الهمم (accessible van) · 3.35 m × 5.5 m | min 3.35 m wide × 5.5 m long | Figure C.59 dimensions the van bay as ≥3.3 m (internal inconsistency, both editions). Vertical clearance for vans not stated in C.6. | shall (via C.6.4.1 ¶5) | yes — rectangle size |

### C.6.4.2 Location of accessible parking spaces — موقع أماكن وقوف السيارات المخصصة لأصحاب الهمم
EN p195–196 · AR p195–196

#### C.6.4.2 ¶1
- **Pages:** EN p195 · AR p195
- **EN:** "The following requirements and recommendations apply to accessible parking spaces."
- **AR:** "تنطبق الاشتراطات والتوصيات التالية على أماكن وقوف السيارات المخصصة لأصحاب الهمم."
- **Values:** —
- **Conditions / exceptions:** introduces a)–l).
- **Refs:** —
- **Obligation:** informative
- **Mechanisable from plot geometry + inputs?** no — scope statement.

#### C.6.4.2 a)
- **Pages:** EN p195 · AR p195
- **EN:** "Accessible parking spaces should be located as close as possible to public facilities."
- **AR:** "يُفضل أن تكون أماكن وقوف السيارات المخصصة لأصحاب الهمم قريبة قدر الإمكان من المرافق العامة."
- **Values:** —
- **Conditions / exceptions:** "as close as possible" is not quantified (b) gives the 50 m cap).
- **Refs:** —
- **Obligation:** should
- **Mechanisable from plot geometry + inputs?** partly — ranking bays by distance to the core/entrance is computable; "as close as possible" is a preference.

#### C.6.4.2 b)
- **Pages:** EN p195 · AR p195
- **EN:** "Accessible parking spaces shall be located a maximum of 50 m from the building entrance. An accessible route shall provide access to the sidewalk from the road, or an accessible curb ramp shall be provided."
- **AR:** "يجب أن تقع أماكن وقوف السيارات المخصصة لأصحاب الهمم على بُعد 50 m كحدٍ أقصى من مدخل المبنى. يجب أن يوفر مسار الوصول إمكانية الوصول إلى الرصيف الجانبي من الطريق، أو أن يوفر منحدر رصيف مهيأ لسهولة الوصول."
- **Values:** max 50 m from the building entrance
- **Conditions / exceptions:** how the 50 m is measured (straight line or along the route) and what counts as "the building entrance" for a car park inside the building (e.g. a lift lobby) are not stated.
- **Refs:** C.6.2
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — distance from placed bays to the core/entrance is computable; the measurement basis and the entrance definition are not stated.

#### C.6.4.2 c)
- **Pages:** EN p195 · AR p195
- **EN:** "A minimum of one accessible parking space shall be provided adjacent to each accessible entrance."
- **AR:** "يجب توفير موقف واحد للسيارات على الأقل بجوار كل مدخل مهيأ لسهولة الوصول."
- **Values:** ≥1 accessible space adjacent to each accessible entrance
- **Conditions / exceptions:** "adjacent" not quantified.
- **Refs:** —
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — needs accessible-entrance positions; "adjacent" is not quantified.

#### C.6.4.2 d)
- **Pages:** EN p195 · AR p195
- **EN:** "Where a parking area is served by multiple accessible building entrances, accessible parking spaces shall be a maximum of 50 m from each accessible entrance. The distribution of accessible parking be such that all accessible parking spaces are not located in the same area."
- **AR:** "عندما تخدم منطقة وقوف السيارات مداخل متعددة للمبنى مهيأة لسهولة الوصول، فيجب أن تكون أقصى مسافة بين أماكن وقوف السيارات المخصصة لأصحاب الهمم وكل مدخل مهيأ لسهولة الوصول 50 m. يجب توزيع مواقف السيارات المخصصة لأصحاب الهمم بحيث لا تكون جميعها في نفس المنطقة."
- **Values:** max 50 m from each accessible entrance
- **Conditions / exceptions:** EDITION MISMATCH — the EN distribution sentence has no modal verb ("The distribution ... be such that"); the AR states it as mandatory ("يجب توزيع"). "Same area" not defined.
- **Refs:** —
- **Obligation:** shall (50 m); distribution sentence shall per AR, modal missing in EN
- **Mechanisable from plot geometry + inputs?** partly — the 50 m test is computable once entrances are placed; "not in the same area" is a judgement.

#### C.6.4.2 e)
- **Pages:** EN p195 · AR p195
- **EN:** "When multi-level parking is provided, at least one accessible parking space shall be available at grade level whenever grade parking is provided."
- **AR:** "عندما يتم توفير موقف سيارات متعدد المستويات، يجب توفير موقف واحد على الأقل مخصص لأصحاب الهمم على المستوى الأرضي إذا توفرت مواقف سيارات على نفس المستوى."
- **Values:** ≥1 accessible space at grade level
- **Conditions / exceptions:** only for multi-level parking that includes grade parking.
- **Refs:** —
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** yes — the level schedule says whether the ground level holds parking.

#### C.6.4.2 f)
- **Pages:** EN p195 · AR p195
- **EN:** "Accessible parking spaces shall have an access aisle at least of 1,200 mm wide. The access aisle shall be connected to an accessible route. Angled parking spaces shall have a side access aisle, to allow for approach and transfer from the driver’s side. A rear access aisle shall be provided to parking spaces along a sidewalk."
- **AR:** "يجب أن تحتوي أماكن وقوف السيارات المخصصة لأصحاب الهمم على ممر وصول جانبي لا يقل عرضه عن 1,200 mm. يجب أن يكون ممر الوصول الجانبي متصلاً بمسار وصول. يجب أن تحتوي مواقف السيارات بزاوية على ممر وصول جانبي للسماح بالدخول والانتقال من جانب السائق. يجب توفير ممر وصول خلفي لمواقف السيارات على طول الرصيف الجانبي."
- **Values:** access aisle min 1,200 mm wide; side aisle for angled spaces; rear aisle for spaces along a sidewalk
- **Conditions / exceptions:** EDITION MISMATCH — EN first two sentences say "an access aisle" / "The access aisle" (any position); AR says "ممر وصول جانبي" (a side access aisle) in both, while its last sentence still calls for a rear aisle on spaces along a sidewalk. The 1,200 mm agrees. Whether the aisle may overlap a drive aisle is not stated.
- **Refs:** Figure C.59, Figure C.60
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** yes — width and adjacency of a hatched rectangle beside each accessible bay; "connected to an accessible route" needs a pedestrian route the engine does not yet model.

#### C.6.4.2 g)
- **Pages:** EN p195 · AR p195
- **EN:** "If an accessible parking aisle is shared between two vehicles parking adjacently, the aisle shall be centrally accessible for both vehicles (see Figure C.59)."
- **AR:** "إذا كان ممر الوصول الجانبي لمواقف السيارات مشتركًا بين موقفين متجاورين، يجب أن يكون الممر متاحًا بالتناصف لكليهما (انظر الشكل C.59)."
- **Values:** one ≥1,200 mm aisle may serve two adjacent accessible spaces
- **Conditions / exceptions:** aisle sits between the two spaces (Figure C.59: van bay | aisle | car bay).
- **Refs:** Figure C.59
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** yes — pairing rule on a row of bays.

#### C.6.4.2 h)
- **Pages:** EN p195 · AR p195
- **EN:** "The parking spaces shall be marked with the symbol for people of determination, painted on the ground and on a signpost. This sign should be visible from the driving position and mounted at a height of 2,100 mm (see Figure C.60)."
- **AR:** "يجب تمييز أماكن وقوف السيارات برمز أصحاب الهمم وتكون مطبوعة على الأرض ومكتوبة على لافته مركبة على عمود رأسي. يُفضل أن تكون هذه العلامة مرئية من موضع القيادة ومثبتة على ارتفاع 2,100 mm (انظر الشكل C.60)."
- **Values:** sign mounting height 2,100 mm (Figure C.60: 2.1 m from ground to bottom of sign panel)
- **Conditions / exceptions:** the text does not state the reference point of the 2,100 mm; Figure C.60 dimensions it to the bottom of the sign panel.
- **Refs:** Figure C.60
- **Obligation:** shall (marking) + should (visibility, 2,100 mm)
- **Mechanisable from plot geometry + inputs?** partly — the marking is a drawing symbol the engine can place; a 2,100 mm sign also needs ≥2,100 mm clear height plus panel depth at that bay.

#### C.6.4.2 i)
- **Pages:** EN p195 · AR p195
- **EN:** "For parking areas controlled by vehicle barriers, meters or ticket dispensers, the equipment shall be installed at an appropriate location and height for use by people of determination. The guidance given in BS 8300 on these provisions for people of determination should be followed."
- **AR:** "بالنسبة لمناطق وقوف السيارات التي يتم التحكم فيها باستخدام حواجز المركبات أو العدادات أو أجهزة توزيع التذاكر، يجب تركيب المعدات في موقع وارتفاع مناسبين ليستخدمها أصحاب الهمم. يُفضل اتباع الإرشادات الواردة في BS 8300 بشأن هذه الأحكام الخاصة بأصحاب الهمم."
- **Values:** — (heights per BS 8300, not stated)
- **Conditions / exceptions:** only controlled parking areas.
- **Refs:** BS 8300
- **Obligation:** shall + should (BS 8300)
- **Mechanisable from plot geometry + inputs?** no — equipment fit-out.

#### C.6.4.2 j)
- **Pages:** EN p195 · AR p195
- **EN:** "Wayfinding signs conforming to C.11 shall be provided to indicate the location of accessible parking spaces."
- **AR:** "يجب توفير لافتات استدلال مكاني وفقًا لـ C.11 للإشارة إلى أماكن وقوف السيارات المخصصة لأصحاب الهمم."
- **Values:** —
- **Conditions / exceptions:** —
- **Refs:** C.11
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — signage.

#### C.6.4.2 k)
- **Pages:** EN p195 · AR p195
- **EN:** "For enclosed parking areas, wayfinding signs shall be provided at any directional change option inside the parking area. The signs should use the symbols and colours of each area and floor to help people find their cars, toilets and exits."
- **AR:** "بالنسبة لأماكن وقوف السيارات المغلقة، يجب توفير لافتات استدلال مكاني عند أي خيار لتغيير الاتجاه داخل منطقة وقوف السيارات. يُفضل استخدام رموز وألوان لكل منطقة وكل طابق في اللافتات وذلك لمساعدة الأفراد في العثور على سياراتهم ودورات المياه والمخارج."
- **Values:** a sign at every directional-change option
- **Conditions / exceptions:** enclosed parking areas only.
- **Refs:** B.11
- **Obligation:** shall + should (symbols/colours per area and floor)
- **Mechanisable from plot geometry + inputs?** yes — every junction in the engine's aisle network is a directional-change option and can carry a sign marker.

#### C.6.4.2 l)
- **Pages:** EN p195 · AR p195
- **EN:** "Pedestrian routes within parking areas shall be identified by floor painting with a reflectance contrast of 30 points LRV compared to the vehicular routes."
- **AR:** "يجب تحديد المسارات المخصصة للمشاة داخل مناطق وقوف السيارات من خلال طلاء الأرضيات مع تباين انعكاس لا يقل عن 30 نقطة من قيمة انعكاس الضوء (LRV) مقارنة بالمسارات المخصصة للمركبات."
- **Values:** LRV contrast 30 points (EN) / not less than 30 points (AR)
- **Conditions / exceptions:** EDITION MISMATCH — EN "a reflectance contrast of 30 points LRV" (no bound stated); AR "لا يقل عن 30 نقطة" (not less than 30 points).
- **Refs:** —
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — the engine can draw pedestrian routes on a parking level; the LRV value is a finish specification.

#### Figure C.59 Example of accessible parking spaces with side aisle
- **Pages:** EN p196 · AR p196
- **AR caption:** "مثال على أماكن وقوف السيارات المخصصة لأصحاب الهمم بممر وصول جانبي"
- ≥3.3 m — width of the accessible van bay (left bay, van drawn), between bay lines
- ≥1.2 m — width of the shared hatched access aisle between the van bay and the car bay
- ≥2.5 m — width of the accessible car bay (right bay, wheelchair symbol), between the aisle and the bay line
- ≥5.5 m — length of the accessible bays, from the curb line to the bay end (dimensioned on the car bay)
- ≤8% — gradient of the curb ramp (01) cut into the curb at the head of the shared aisle, leading to the sidewalk
- (Signs 02 are mounted at the curb at the head of each accessible bay.)
- Key (EN): 01: Curb to parking · 02: Sign
- Key (AR): 01: الرصيف المؤدي لموقف السيارات · 02: لافتة

#### Figure C.60 Example of an accessible parking space along the sidewalk with sign on post
- **Pages:** EN p196 · AR p196
- **AR caption:** "مثال على أماكن وقوف السيارات المخصصة لأصحاب الهمم على جانب الرصيف الجانبي ولافتة عمودية"
- ≥6.0 m — length of the parallel accessible bay, along the curb
- ≥1.2 m — length of the hatched rear access aisle at the end of the bay, along the curb (adjoining the curb ramp)
- ≥2.5 m — width of the parallel bay, from the curb line outward
- 2.1 m — height of the sign post, from ground to the bottom of the sign panel
- ≤8% — gradient of the curb ramp (01) from the rear access aisle up to the sidewalk
- (A hatched strip also runs along the traffic side of the bay; it carries no dimension.)
- Sign panel content (both editions): "P" · wheelchair symbol · "مواقف" · "Parking".
- Key (EN): 01: Curb to parking · 02: Sign
- Key (AR): 01: الرصيف المؤدي لموقف السيارات · 02: لافتة
