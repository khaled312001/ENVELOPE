# B.4 General architectural provisions — DBC 2021 rule reference

Source: Dubai Building Code, 2021 Edition, Part B: Architecture. English PDF pp. 38–54, Arabic PDF
pp. 38–54 (offset 0; printed labels B 18–B 34). Extracted with pdfjs-dist and checked against page
renders. Verbal forms per DBC A.3.2: shall = mandatory (يجب) · should = recommended (يُفضل) ·
may = permitted (يمكن).

Arabic title: الاشتراطات المعمارية العامة

## Contents
- [B.4.1 General requirements](#b4-1) — EN p38 · AR p38
- [B.4.2 Development limitation](#b4-2) — EN p38 · AR p38
  - [B.4.2.1 Gate level](#b4-2-1) — EN p38 · AR p38
  - [B.4.2.2 Building height](#b4-2-2) — EN p39–40 · AR p39–40
  - [B.4.2.3 Building setbacks](#b4-2-3) — EN p41–44 · AR p41–44
  - [B.4.2.4 Building areas](#b4-2-4) — EN p45–46 · AR p45–46
    - [B.4.2.4.1 Gross area (GA)](#b4-2-4-1) — EN p45 · AR p45
    - [B.4.2.4.2 Net area (NA)](#b4-2-4-2) — EN p46 · AR p46
  - [B.4.2.5 Balconies, building projections and terraces](#b4-2-5) — EN p47–51 · AR p47–51
    - [B.4.2.5.1 Limitations](#b4-2-5-1) — EN p47–49 · AR p47–49
    - [B.4.2.5.2 Guardrails for fall protection](#b4-2-5-2) — EN p49–50 · AR p49–50
    - [B.4.2.5.3 Access doors](#b4-2-5-3) — EN p51 · AR p51
  - [B.4.2.6 Plot coverage](#b4-2-6) — EN p51 · AR p51
- [B.4.3 Building floors general requirements](#b4-3) — EN p52 · AR p52
  - [B.4.3.1 Ground floor](#b4-3-1) — EN p52 · AR p52
  - [B.4.3.2 Basements](#b4-3-2) — EN p53 · AR p53
  - [B.4.3.3 Podium](#b4-3-3) — EN p53 · AR p53
  - [B.4.3.4 Roof](#b4-3-4) — EN p54 · AR p54

## Summary counts
Rules recorded: 89 (shall: 59, should: 4, may: 16, informative: 6, definition: 4). Table rows: 10.
Figure dimensions: 42. UNREADABLE: 0. EDITION MISMATCH: 4.

Edition mismatches: B.4.2.2 ¶8 b) (EN p40 · AR p40), B.4.2.3 ¶4 sentences 2–3 (EN p41 · AR p41),
B.4.2.3 ¶10 (EN p42 · AR p42), B.4.2.5.3 ¶1 (EN p51 · AR p51). Not counted as a mismatch, but noted
where they occur: the caption of Figure B.10 differs (EN "Setback plan", AR "الارتداد من الطريق");
B.4.3.2 ¶3 and B.4.2.6 ¶1 carry "shall" in EN but no يجب in AR (indicative verb only).

Reading notes for an engine (not rules; pointers to the entries below):
- This chapter does **not** define GFA, BUA or FAR. It defines GA (B.4.2.4.1, inside face of external
  walls, for occupant load) and NA (B.4.2.4.2, for occupant load **and parking rates B.7.2.6.1**), and
  plot coverage (B.4.2.6, outside face of external walls). FAR appears only as a named limitation in
  B.4.1 c). No plot-coverage percentage and no built-up-area limit is set anywhere in B.4.
- Setbacks, heights and projections all defer first to the affection plan / DCR (B.4.2.2 ¶1,
  B.4.2.3 ¶1, B.4.2.5.1 a)); Table B.1 applies only "when setback limitations for the plot or
  development are not defined" (B.4.2.3 ¶2).

---

<a id="b4-1"></a>
## B.4.1 General requirements — الاشتراطات العامة
EN p38 · AR p38

#### B.4.1 ¶1 a)–f)
- **Pages:** EN p38 · AR p38
- **EN:** "Buildings shall be designed according to the planning limitations and provisions required by the Authorities, as stipulated in development control regulations (DCR) and/or affection plans. Limitations on development include, but are not limited to: a) authorized use of the building; b) building setbacks; c) floor to area ratio; d) access locations; e) the gate level; f) building service lines."
- **AR:** "يجب تصميم المباني وفقًا للمحددات والاشتراطات التخطيطية التي تتطلبها الجهات المعنية، على النحو المنصوص عليه في اشتراطات نظم التطوير (DCR) و/أو الخارطة الموقعية. وتشمل المحددات المفروضة على التطوير، على سبيل المثال لا الحصر، ما يلي: a) الاستخدام المصرح به للمبنى؛ b) ارتداد المبنى؛ c) النسبة الطابقية؛ d) المداخل المسموح بها؛ e) المنسوب المرجعي؛ f) خطوط خدمات المبنى."
- **Values:** —
- **Conditions / exceptions:** List is open ("include, but are not limited to"). AR d) reads "المداخل المسموح بها" (permitted entrances) for "access locations".
- **Refs:** DCR, affection plan
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — setbacks, FAR and access positions held as affection-plan inputs can be checked; "authorized use" and "service lines" are planning facts the engine does not hold.

#### B.4.1 ¶2
- **Pages:** EN p38 · AR p38
- **EN:** "Buildings located in heritage areas shall respect the identity of these areas and shall adhere to any conservation requirements imposed by the Authorities."
- **AR:** "يجب أن تحترم المباني الواقعة في المناطق التراثية هوية هذه المناطق وأن تلتزم بأي اشتراطات حماية تفرضها الجهات المعنية."
- **Values:** —
- **Conditions / exceptions:** Applies only in heritage areas.
- **Refs:** —
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — "respect the identity" is a design judgement; conservation requirements are external.

#### B.4.1 ¶3 1)–4)
- **Pages:** EN p38 · AR p38
- **EN:** "The building or development should take the following into account: 1) Arabic and Islamic cultural identity; 2) local architectural character, especially for buildings of cultural significance; 3) the building’s relationship with the surrounding environment; 4) the building’s compatibility with the planning limitations and urban planning themes of surrounding developments."
- **AR:** "يفضل أن يراعي المبنى أو مشروع التطوير ما يلي: 1) الهوية الثقافية العربية والإسلامية؛ 2) الطابع المعماري المحلي، وخاصةً المباني ذات الأهمية الثقافية؛ 3) علاقة المبنى بالبيئة المحيطة؛ 4) توافق المبنى مع المحددات التخطيطية والطابع الحضري في مشاريع التطوير المحيطة."
- **Values:** —
- **Conditions / exceptions:** —
- **Refs:** —
- **Obligation:** should
- **Mechanisable from plot geometry + inputs?** no — architectural judgement.

#### B.4.1 ¶4
- **Pages:** EN p38 · AR p38
- **EN:** "The massing of the proposed building should take into account the visual privacy of adjacent structures and buildings in the surrounding properties and neighbourhoods, as well as the privacy of different uses and occupancies within the same development."
- **AR:** "يفضل أن تأخذ كُتلة المبنى المقترحة بالاعتبار الخصوصية البصرية للمباني والمنشآت في الحي والأحياء المحيطة، إلى جانب خصوصية الاستخدامات والإشغالات المختلفة داخل نفس المشروع."
- **Values:** —
- **Conditions / exceptions:** —
- **Refs:** —
- **Obligation:** should
- **Mechanisable from plot geometry + inputs?** no — privacy is a design judgement; no distance is stated.

---

<a id="b4-2"></a>
## B.4.2 Development limitation — محددات التطوير
EN p38 · AR p38

(Heading only; no text of its own.)

<a id="b4-2-1"></a>
### B.4.2.1 Gate level — المنسوب المرجعي
EN p38 · AR p38

#### B.4.2.1 ¶1
- **Pages:** EN p38 · AR p38
- **EN:** "The gate level is a defined height on the plot boundary at the vehicular or pedestrian access point to the plot. It is an elevation difference between the road level (existing or future) and the level of the plot’s access point."
- **AR:** "المنسوب المرجعي هو الارتفاع المحدد على حدود قطعة الأرض عند نقطة وصول المركبات أو المشاة إليها. ويمثل فرق الارتفاع بين مستوى الطريق (الحالي أو المستقبلي) ومستوى نقطة الوصول إلى قطعة الأرض."
- **Values:** —
- **Conditions / exceptions:** Road level may be existing or future.
- **Refs:** —
- **Obligation:** definition
- **Mechanisable from plot geometry + inputs?** partly — the access point is an edge position the engine holds; the levels are not plot-polygon facts.

#### B.4.2.1 ¶2
- **Pages:** EN p38 · AR p38
- **EN:** "The gate level of a plot shall be a minimum height of +300 mm from the edge of the road or a slope of between 2-5% from the edge of the road to the plot’s access point."
- **AR:** "يجب أن يكون المنسوب المرجعي لقطعة الأرض على ارتفاع ‎+300 mm‎ كحدٍ أدنى من حافة الطريق أو منحدر بين 2-5% من حافة الطريق إلى نقطة الوصول إلى قطعة الأرض."
- **Values:** gate level `min +300 mm` above road edge, **or** slope `2 %–5 %` from road edge to plot access point
- **Conditions / exceptions:** Two alternative compliance routes ("or").
- **Refs:** —
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — arithmetic is trivial given road-edge level, access-point level and distance; none of those is held from an affection plan.

#### B.4.2.1 ¶3
- **Pages:** EN p38 · AR p38
- **EN:** "The gate level, and the levels of the plot’s corners, are calculated based on Dubai Roads and Transport Authority’s (RTA) standard cross-section of road right of way (ROW), next to the plot."
- **AR:** "يتم حساب المنسوب المرجعي ومستويات زوايا قطعة الأرض استنادًا إلى معايير هيئة الطرق والمواصلات في دبي لقطاعات حرم الطريق بجانب قطعة الأرض."
- **Values:** —
- **Conditions / exceptions:** —
- **Refs:** RTA standard ROW cross-section
- **Obligation:** informative
- **Mechanisable from plot geometry + inputs?** no — needs RTA cross-section data.

<a id="b4-2-2"></a>
### B.4.2.2 Building height — ارتفاع المبنى
EN p39–40 · AR p39–40

#### B.4.2.2 ¶1
- **Pages:** EN p39 · AR p39
- **EN:** "Building heights shall follow the DCRs and affection plans."
- **AR:** "يجب أن تتبع ارتفاعات المباني اشتراطات نظم التطوير (DCR) والخارطة الموقعية."
- **Values:** — (height comes from DCR / affection plan)
- **Conditions / exceptions:** —
- **Refs:** DCR, affection plan
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** yes — the affection-plan height/storey limit is an input.

#### B.4.2.2 ¶2
- **Pages:** EN p39 · AR p39
- **EN:** "Buildings plots located in areas requiring Dubai Civil Aviation Authority (DCAA) approval (as noted in the affection plan, DCR or DCAA map) shall meet the Authority’s requirements and the height limitation imposed."
- **AR:** "المباني الواقعة في أماكن تتطلب موافقة هيئة دبي للطيران المدني (كما هو مذكور بالخارطة الموقعية، أو اشتراطات نظم التطوير (DCR)، أو خارطة هيئة دبي للطيران المدني) يجب أن تتوافق مع متطلبات الهيئة ومحددات الارتفاع المفروضة."
- **Values:** — (DCAA height limit, external)
- **Conditions / exceptions:** Only where the affection plan, DCR or DCAA map flags DCAA approval.
- **Refs:** DCAA map
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — if the affection plan prints the DCAA flag and limit it is an input; the DCAA map is not held.

#### B.4.2.2 ¶3
- **Pages:** EN p39 · AR p39
- **EN:** "Building height shall be calculated from the approved road edge level at the main plot access to the average finished floor level (FFL) of the roof as shown in Figure B.6."
- **AR:** "يجب حساب ارتفاع المبنى من مستوى حافة الطريق المعتمد عند المدخل الرئيسي لقطعة الأرض إلى متوسط مستوى تشطيب أرضية السطح (FFL) كما هو موضح في الشكل B.6."
- **Values:** building height = average roof FFL − approved road edge level at main plot access
- **Conditions / exceptions:** Datum is the road edge at the **main** plot access, not the gate level.
- **Refs:** Figure B.6
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — needs road edge level and floor-to-floor heights; the level schedule gives storey count only.

#### B.4.2.2 ¶4
- **Pages:** EN p39 · AR p39
- **EN:** "The total building height is the vertical distance measured from the approved road edge level at the main plot access to the highest roof surface or element."
- **AR:** "يحتسب الارتفاع الإجمالي للمبنى بالمسافة الرأسية المقاسة من مستوى حافة الطريق المعتمد عند المدخل الرئيسي لقطعة الأرض إلى أعلى مستوى للسطح أو لأعلى عنصر في المبنى."
- **Values:** total building height = highest roof surface or element − approved road edge level at main plot access
- **Conditions / exceptions:** Distinct from "building height" (¶3). ¶6 caps the "total allowable building height"; ¶8 lets listed parts exceed the "maximum allowable height".
- **Refs:** Figure B.6
- **Obligation:** definition
- **Mechanisable from plot geometry + inputs?** partly — same level data needed as ¶3.

#### B.4.2.2 ¶5 (sentence 1)
- **Pages:** EN p39 · AR p39
- **EN:** "Building ground should be elevated from adjacent roads to protect from flooding."
- **AR:** "يفضل رفع أرضية المبنى عن الطرق المجاورة لحمايتها من الفيضانات."
- **Values:** — (no height stated)
- **Conditions / exceptions:** —
- **Refs:** —
- **Obligation:** should
- **Mechanisable from plot geometry + inputs?** no — no figure is set.

#### B.4.2.2 ¶5 (sentence 2)
- **Pages:** EN p39 · AR p39
- **EN:** "Elevated access points shall also meet the requirements in C.5."
- **AR:** "يجب أن تفي مداخل المبنى المرتفعة بالاشتراطات الواردة في C.5."
- **Values:** —
- **Conditions / exceptions:** Only for elevated access points.
- **Refs:** C.5
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — depends on C.5 and the entrance design.

#### Figure B.6 Building height
- **Pages:** EN p39 · AR p39
- **AR caption:** الشكل B.6 ارتفاع المبنى
- Dimensions:
  - `2%-5%` — slope of the ground from road edge level (07) up to the gate level (06) at the plot limit (01).
  - (04) Total building height — vertical dimension from road edge level (07) to the top of the roof structure (08).
  - (05) Building height — vertical dimension from road edge level (07) to the roof level (02).
- Key (EN): 01: Plot limit · 02: Roof level · 03: Last floor · 04: Total building height · 05: Building height · 06: Gate level · 07: Road edge level · 08: Roof structure · 09: Ground floor · 10: Basement
- Key (AR): 01: حد قطعة الأرض · 02: مستوى السطح · 03: الطابق الأخير · 04: ارتفاع المبنى الإجمالي · 05: ارتفاع المبنى · 06: المنسوب المرجعي · 07: مستوى حافة الطريق · 08: مباني السطح · 09: الطابق الأرضي · 10: طابق السرداب

#### B.4.2.2 ¶6
- **Pages:** EN p40 · AR p40
- **EN:** "To calculate the total allowable building height, the allowable number of floors, as defined by the affection plan or DCR, shall be multiplied by 6 m per floor. This does not impose restrictions on single floor heights."
- **AR:** "لحساب الارتفاع الإجمالي المسموح به لأي مبنى، يجب ضرب عدد الطوابق المسموح به، كما هو محدد في الخارطة الموقعية أو اشتراطات نظم التطوير (DCR) في 6 m لكل طابق. وهذا لا يفرض قيودًا على ارتفاع أي طابق بعينه."
- **Values:** max total allowable building height = allowable number of floors × `6 m`; no per-floor height limit
- **Conditions / exceptions:** Floor count is the one in the affection plan or DCR. Per ¶7 the ground floor counts (G+10 = 11 floors). Figure B.7 counts the two podium floors among the 11.
- **Refs:** affection plan, DCR, Figure B.7
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** yes — storey limit × 6 m, given the affection-plan floor count.

#### B.4.2.2 ¶7
- **Pages:** EN p40 · AR p40
- **EN:** "Example: For a building with G+10 floors limit, the maximum allowable height shall be calculated as 11 (the number of floors) × 6 m (the factor) = 66 m maximum building height. See Figure B.7."
- **AR:** "مثال: بالنسبة للمبنى المحدد بعدد طوابق أرضي + 10 طوابق، يجب حساب أقصى ارتفاع مسموح به على أنه 11 (عدد الطوابق) × 6 m (العامل) = 66 m كأقصى ارتفاع للمبنى. انظر الشكل B.7."
- **Values:** G+10 → 11 floors × 6 m = `max 66 m`
- **Conditions / exceptions:** Worked example; shows that the "G" counts as one floor.
- **Refs:** Figure B.7
- **Obligation:** informative
- **Mechanisable from plot geometry + inputs?** yes — arithmetic.

#### B.4.2.2 ¶8 a)
- **Pages:** EN p40 · AR p40
- **EN:** "Parts of buildings and installations may exceed the maximum allowable height provided that this increase does not conflict with DCAA or DCR requirements. These parts include: a) ornamental elements such as minarets, dome and towers that are embellished in traditional and aesthetic patterns;"
- **AR:** "يمكن أن تتجاوز أجزاء من المباني وتركيباتها أقصى ارتفاع مسموح به بشرط ألا تتعارض هذه الزيادة مع اشتراطات هيئة دبي للطيران المدني أو اشتراطات نظم التطوير (DCR). وتشمل هذه الأجزاء ما يلي: a) العناصر الزخرفية مثل المآذن والقباب والأبراج المزخرفة بأشكال تقليدية وجمالية؛"
- **Values:** — (no cap on the excess stated)
- **Conditions / exceptions:** Only if no conflict with DCAA or DCR.
- **Refs:** DCAA, DCR
- **Obligation:** may
- **Mechanisable from plot geometry + inputs?** no — the model carries no ornamental elements.

#### B.4.2.2 ¶8 b)
- **Pages:** EN p40 · AR p40
- **EN:** "b) chimneys and smokestacks, water reservoirs, elevator shafts, stairways, radio and television aerials, wind towers, pergolas, helipads and roof shading devices;"
- **AR:** "b) المداخن بأنواعها، وخزانات المياه، وآبار المصاعد والسلالم وهوائيات الراديو والتلفزيون وأبراج الرياح والبرجولات ومهابط الطائرات العمودية وعناصر التظليل؛"
- **Values:** —
- **Conditions / exceptions:** Same proviso as ¶8 (no conflict with DCAA or DCR). **EDITION MISMATCH** — EN "roof shading devices"; AR "عناصر التظليل" (shading elements, no "roof"), a wider class in AR.
- **Refs:** DCAA, DCR
- **Obligation:** may
- **Mechanisable from plot geometry + inputs?** partly — lift/stair cores are in the model; tanks, aerials etc. are not.

#### B.4.2.2 ¶8 c)
- **Pages:** EN p40 · AR p40
- **EN:** "c) advertisement boards conforming to Authority regulations for advertising (see E.10.9 for restrictions on advertising within façades)."
- **AR:** "c) اللوحات الإعلانية المطابقة لاشتراطات الجهة المعنية للإعلان (انظر E.10.9 للاطلاع على القيود المفروضة على الدعاية والإعلان في الواجهات)."
- **Values:** —
- **Conditions / exceptions:** Boards must conform to advertising regulations; same proviso as ¶8.
- **Refs:** E.10.9
- **Obligation:** may
- **Mechanisable from plot geometry + inputs?** no — signage is not modelled.

#### B.4.2.2 ¶9
- **Pages:** EN p40 · AR p40
- **EN:** "When helipads are provided on buildings, they shall conform to standard specifications approved by DCAA."
- **AR:** "عندما يتم توفير مهبط للطائرات العمودية فوق المباني، يجب أن تتوافق مع المواصفات القياسية المعتمدة من قبل هيئة دبي للطيران المدني."
- **Values:** —
- **Conditions / exceptions:** Only when a helipad is provided.
- **Refs:** DCAA specifications
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — external specification.

#### Figure B.7 Example of allowable building height calculation
- **Pages:** EN p40 · AR p40
- **AR caption:** الشكل B.7 مثال على حساب الارتفاع المسموح به للمبنى
- Dimensions:
  - `≤66 m` (01) — maximum allowable total building height; vertical dimension from the base of floor 1 (bottom of the podium block) to the top of floor 11 (top of the tower block).
  - Floor labels `1`–`11` (not dimensions): floors 1–2 are drawn as the podium block, floors 3–11 as the tower; all eleven are counted.
- Key (EN): 01: Maximum allowable total building height
- Key (AR): 01: الحد الأقصى المسموح به لارتفاع المبنى الإجمالي

<a id="b4-2-3"></a>
### B.4.2.3 Building setbacks — ارتداد المبنى
EN p41–44 · AR p41–44

#### B.4.2.3 ¶1
- **Pages:** EN p41 · AR p41
- **EN:** "The building setback requirements in the affection plan or DCR shall take precedence over the setback requirements in this section."
- **AR:** "يجب أن تكون الأولوية لاشتراطات الارتدادات الواردة في الخارطة الموقعية أو اشتراطات نظم التطوير (DCR) على اشتراطات الارتداد الواردة في هذا القسم."
- **Values:** —
- **Conditions / exceptions:** Affection plan / DCR overrides everything in B.4.2.3.
- **Refs:** affection plan, DCR
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** yes — precedence rule over held inputs.

#### B.4.2.3 ¶2
- **Pages:** EN p41 · AR p41
- **EN:** "When setback limitations for the plot or development are not defined, setbacks shall be calculated from the plot limit to the face of buildings in accordance with Table B.1."
- **AR:** "عندما تكون محددات الارتداد غير معرفة لقطعة أرض أو مشروع ما، يجب احتساب الارتداد من حد قطعة الأرض إلى واجهة المباني وفقًا للجدول B.1."
- **Values:** setback measured plot limit → face of building; values per Table B.1
- **Conditions / exceptions:** Only when the plot's / development's setback limitations "are not defined" (by affection plan or DCR, per ¶1).
- **Refs:** Table B.1
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — the table lookup is mechanical; deciding that setbacks are "not defined" for a plot (as opposed to omitted from one sheet) is a human call.

#### Table B.1 Setback calculation table
- **Pages:** EN p41 · AR p41
- **AR caption:** الجدول B.1 جدول حساب الارتدادات
- AR column headers: ارتفاع المبنى حسب عدد الطوابق · الارتداد من الجار (X) (انظر الشكل B.8) (m) · الارتداد من الشارع (انظر الشكل B.9) (m)

| Building height by number of floors | Setback from neighbour (X) (see Figure B.8) (m) | Setback from road (see Figure B.9) (m) | AR: ارتفاع المبنى حسب عدد الطوابق | AR: الارتداد من الجار (X) | AR: الارتداد من الشارع | Values (normalised) | Conditions | Obligation | Mechanisable |
|---|---|---|---|---|---|---|---|---|---|
| Basement | 0 | 0 | طابق السرداب | 0 | 0 | neighbour 0 m · road 0 m | Only where affection plan/DCR define no setbacks (¶1–¶2) | shall | yes — lookup by storey count |
| Ground (G) | 3 | 0 | الطابق الأرضي | 3 | 0 | neighbour `min 3.00 m` · road 0 m | as above | shall | yes |
| G+1 to G+3 | 3 | 0 | طابق أرضي + طابق واحد حتى طابق أرضي + 3 طوابق | 3 | 0 | neighbour `min 3.00 m` · road 0 m | as above | shall | yes |
| G+4 | 3.75 | 0 | طابق أرضي + 4 طوابق | 3.75 | 0 | neighbour `min 3.75 m` · road 0 m | as above | shall | yes |
| G+5 | 4.50 | 0 | طابق أرضي + 5 طوابق | 4.50 | 0 | neighbour `min 4.50 m` · road 0 m | as above | shall | yes |
| G+6 | 5.25 | 0 | طابق أرضي + 6 طوابق | 5.25 | 0 | neighbour `min 5.25 m` · road 0 m | as above | shall | yes |
| G+7 | 6 | 0 | طابق أرضي + 7 طوابق | 6 | 0 | neighbour `min 6.00 m` · road 0 m | as above | shall | yes |
| G+8 | 6.75 | 0 | طابق أرضي + 8 طوابق | 6.75 | 0 | neighbour `min 6.75 m` · road 0 m | as above | shall | yes |
| G+9 | 7.50 | 0 | طابق أرضي + 9 طوابق | 7.50 | 0 | neighbour `min 7.50 m` · road 0 m | as above | shall | yes |
| G+10 and above | 7.50 | 0 | طابق أرضي + 10 طوابق فأكثر | 7.50 | 0 | neighbour `min 7.50 m` (cap) · road 0 m | as above; value stops rising at G+9 | shall | yes |

Table B.1 carries no footnotes. The table does not say whether the storey count is the building's
total or the count at the level being set back (i.e. whether a podium and a tower on one plot take
different X); the table is indexed by "Building height by number of floors" only.

#### B.4.2.3 ¶3
- **Pages:** EN p41 · AR p41
- **EN:** "Setbacks shall be calculated from ground floor and above."
- **AR:** "يجب احتساب الارتداد من الطابق الأرضي وما فوقه."
- **Values:** setbacks apply from G upward; basement levels exempt (cf. Table B.1 row "Basement" = 0)
- **Conditions / exceptions:** —
- **Refs:** Table B.1
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** yes — level schedule distinguishes basements from G and above.

#### B.4.2.3 ¶4 (sentence 1)
- **Pages:** EN p41 · AR p41
- **EN:** "Allowance for zero setback from neighbours shall be according to each affection plan or development DCR."
- **AR:** "يجب أن تعتمد سماحية عدم الارتداد من الجار على محددات الخارطة الموقعية أو اشتراطات نظم التطوير (DCR)."
- **Values:** —
- **Conditions / exceptions:** —
- **Refs:** affection plan, DCR
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** yes — if the affection plan states zero setback on an edge, that is an input.

#### B.4.2.3 ¶4 (sentences 2–3)
- **Pages:** EN p41 · AR p41
- **EN:** "Zero setback between two neighbouring retail plots is allowed unless otherwise defined in the affection plan or DCR. This only applies when both plots have retail use classification and for dedicated retail occupancy floors."
- **AR:** "يُسمح بعدم وجود ارتداد بين قطعتي أرض مخصصتين لاستخدام المحلات التجارية شريطة عدم تحديد غير ذلك بالخارطة الموقعية أو اشتراطات نظم التطوير (DCR). ولا ينطبق هذا إلا عندما يكون لكل من قطعتي الأرض نفس تصنيف الاستعمال وأن يتم تخصيصهما لهذا الغرض عند تصميم المبنى"
- **Values:** neighbour setback `0 m` between two retail plots
- **Conditions / exceptions:** Unless the affection plan/DCR says otherwise; both plots retail. **EDITION MISMATCH** — EN limits it to "dedicated retail occupancy floors"; AR says both plots have the same use classification and are allocated "for this purpose when designing the building" (no per-floor limitation). The AR sentence ends without a full stop as printed.
- **Refs:** affection plan, DCR
- **Obligation:** may
- **Mechanisable from plot geometry + inputs?** partly — needs the neighbour plot's use, which the engine does not hold.

#### Figure B.8 Setback from neighbours
- **Pages:** EN p41 · AR p41
- **AR caption:** الشكل B.8 الارتداد من الجار
- Dimensions:
  - `X` (left of plot limit) — horizontal distance from the shared plot limit to the face of the left building.
  - `X` (right of plot limit) — horizontal distance from the shared plot limit to the face of the right building.
- Key (EN): 01: Plot · X: Setback from neighbour (see Table B.1) · ------ Plot limit
- Key (AR): 01: قطعة الأرض · X: الارتداد من الجار (انظر الجدول B.1) · ------ حد قطعة الأرض

#### Figure B.9 Zero setback facing road
- **Pages:** EN p41 · AR p41
- **AR caption:** الشكل B.9 ارتداد صفري بمواجهة الطريق
- Dimensions: none printed (building face drawn on the plot limit, road side).
- Key (EN): 01: Plot · ------ Plot limit
- Key (AR): 01: قطعة الأرض · ------ حد قطعة الأرض

#### B.4.2.3 ¶5
- **Pages:** EN p42 · AR p42
- **EN:** "Setbacks are shown in plan view in Figure B.10. Setbacks shall also allow for fire separation between buildings and fire truck access routes. To prevent external fire spread, the building, shall be physically separated from adjacent plots/buildings or external walls and openings of the building shall be fire resistance rated (see Sections 2.7 and 2.8, Ch. 1 of UAE FLSC [Ref. B.1])."
- **AR:** "يوضح الارتداد بمخطط أفقي في الشكل B.10. يجب أن يسمح الارتداد بالفصل المطلوب لفصل الحرائق بين المباني والسماح بوصول سيارات الإطفاء. لمنع انتشار الحريق خارجيًا، يجب فصل كتلة المبنى عن المباني المجاورة أو أن تكون الجدران والفتحات الخارجية للمبنى مقاومة للحريق (انظر القسمين 2.7 و 2.8، الفصل 1 من UAE FLSC [المرجع B.1])."
- **Values:** — (separation distances are in UAE FLSC)
- **Conditions / exceptions:** Alternative: physical separation **or** fire-resistance-rated external walls and openings.
- **Refs:** Figure B.10; UAE FLSC Ch. 1 Sections 2.7, 2.8 [Ref. B.1]
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — needs UAE FLSC separation tables and façade ratings.

#### B.4.2.3 ¶6
- **Pages:** EN p42 · AR p42
- **EN:** "Fire truck access shall be provided between buildings and around buildings as required by Ch. 2 of UAE FLSC [Ref. B.1]. This vehicle access might need to be accommodated within the plot limits."
- **AR:** "يجب توفير ممر حركي لسيارات الإطفاء بين المباني وحولها على النحو المطلوب في الفصل الثاني من UAE FLSC [المرجع B.1]. قد يلزم أن يكون ممر حركة سيارة الإطفاء ضمن حدود قطعة الأرض."
- **Values:** —
- **Conditions / exceptions:** Access may have to be inside the plot.
- **Refs:** UAE FLSC Ch. 2 [Ref. B.1]
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — fire access geometry is set by UAE FLSC Ch. 2, not by this clause.

#### B.4.2.3 ¶7
- **Pages:** EN p42 · AR p42
- **EN:** "Where high-rise and super high-rise buildings (as defined by UAE FLSC [Ref. B.1]) are built on a podium and the distance from fire truck accessway to the façade of the high-rise/super high-rise exceeds 30 m, fire truck access to the podium shall be provided as required by Section 2.8, Ch. 2 of UAE FLSC [Ref. B.1]."
- **AR:** "في المباني المرتفعة وشاهقة الارتفاع (على النحو المحدد في UAE FLSC [المرجع B.1]) التي تكون مبنية على طوابق قاعدة الأبراج (البوديوم podium) والتي تتجاوز فيها المسافة من مسار سيارة الإطفاء إلى واجهة المبنى المرتفع/شاهق الارتفاع عن 30 m، يجب توفير وصول شاحنة الإطفاء إلى منصة البوديوم (podium) وفقًا لما هو مطلوب في القسم 2.8، الفصل 2 من UAE FLSC [المرجع B.1]."
- **Values:** trigger: distance fire truck accessway → high-rise façade `> 30 m`
- **Conditions / exceptions:** Only high-rise / super high-rise on a podium.
- **Refs:** UAE FLSC Ch. 2 Section 2.8 [Ref. B.1]
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — the 30 m distance from a road edge to the tower face is computable; the high-rise classification and the access route are not.

#### B.4.2.3 ¶8
- **Pages:** EN p42 · AR p42
- **EN:** "Setbacks from sikkas shall be calculated from the centre of the sikka (see Figure B.11). When the sikka width is more than 6 m, the maximum applicable width from the centre of the sikka is 3 m. If the building setback from the plot limit is found to be 1.5 m or less, no setback is required."
- **AR:** "يجب حساب الارتداد من جهة السكة من منتصف السكة (انظر الشكل B.11). عندما يكون عرض السكة أكثر من 6 m، يكون أقصى عرض قابل للتطبيق من مركز السكة هو 3 m. وإذا تبين أن الارتداد للمبنى من حد قطعة الأرض يبلغ 1.5 m أو أقل، فلا يتطلب وجود ارتداد."
- **Values:** setback (Y) measured from sikka centreline; creditable half-width `max 3 m` when sikka width `> 6 m`; if resulting setback from plot limit `≤ 1.5 m` → `0 m` required
- **Conditions / exceptions:** Applies to edges facing a sikka. The setback distance itself is not stated here (Figure B.11 labels it only "Y: Setback from centre of sikka").
- **Refs:** Figure B.11
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — arithmetic is mechanical once an edge is known to face a sikka and its width is known; affection plans state hierarchy, not width.

#### B.4.2.3 ¶9
- **Pages:** EN p42 · AR p42
- **EN:** "Plots neighbouring cemeteries shall provide a minimum setback of 3 m."
- **AR:** "يجب أن توفر قطع الأراضي المجاورة للمقابر ارتدادا لا يقل 3 m كحدٍ أدنى."
- **Values:** `min 3 m` setback from a cemetery
- **Conditions / exceptions:** AR printed "لا يقل 3 m" (no "عن") — transcribed as printed.
- **Refs:** —
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — yes if the edge's neighbour is recorded as a cemetery; that is not a standard edge class.

#### B.4.2.3 ¶10
- **Pages:** EN p42 · AR p42
- **EN:** "Plots adjacent to metro stations or metro infrastructure shall conform to the RTA railway protection code for the emirate of Dubai [Ref. B.2]."
- **AR:** "يجب أن تتوافق ارتدادات قطع الأراضي المجاورة لمحطات المترو أو البنية التحتية للمترو مع دليل القواعد الإجرائية لحماية السكك الحديدية في دبي الصادر عن هيئة الطرق والمواصلات [المرجع B.2]."
- **Values:** — (external code)
- **Conditions / exceptions:** **EDITION MISMATCH** — EN: the *plots* shall conform; AR: the plots' *setbacks* (ارتدادات) shall conform. (The same requirement is repeated at B.4.2.5.1 ¶2, where AR has no "ارتدادات".)
- **Refs:** RTA railway protection code [Ref. B.2]
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — external code not held.

#### Figure B.10 Setback plan
- **Pages:** EN p42 · AR p42
- **AR caption:** الشكل B.10 الارتداد من الطريق — caption differs from EN ("Setback plan" vs "Setback from road"); not a numeric difference.
- Dimensions:
  - `X` (left) — from the plot limit on the neighbour (02) side to the setback line.
  - `X` (right) — from the plot limit on the neighbour (02) side to the setback line.
  - `Y` (top) — from the centreline of the sikka (dash-dot line) to the setback line.
  - Road side (04, bottom): setback line drawn on the plot limit (zero); allowable projections (03) drawn beyond the plot limit into the road.
- Key (EN): 01: Building footprint · 02: Neighbour · 03: Allowable projection · 04: Road · X: Setback from neighbour (see Table B.1) · Y: Setback from centre of sikka · ------ Plot limit · – – – Setback line
- Key (AR): 01: كتلة المبنى · 02: الجار · 03: البروز المسموح به · 04: الطريق · X: الارتداد من جهة الجار (انظر الجدول B.1) · Y: ارتداد من وسط السكة · حد قطعة الأرض · خط الارتداد

#### Figure B.11 Setback from sikka
- **Pages:** EN p42 · AR p42
- **AR caption:** الشكل B.11 الارتداد من السكة
- Dimensions:
  - `Y` (left) — from the sikka centreline to the left plot's plot limit / setback line.
  - `Y` (right) — from the sikka centreline to the right plot's plot limit / setback line.
- Key (EN): 01: Plot · Y: Setback from centre of sikka · ------ Plot limit
- Key (AR): 01: قطعة الأرض · Y: ارتداد من وسط السكة · ------ حد قطعة الأرض

#### B.4.2.3 ¶11
- **Pages:** EN p43 · AR p43
- **EN:** "The distance between multiple buildings on the same plot shall be equal to the setback required for both buildings from a neighbouring building plot, identified as (X) in Figure B.12, measured from the least horizontal distance between buildings. This distance shall be not less than 3 m between buildings height of ground floor only."
- **AR:** "يجب أن تكون المسافة بين المباني المتعددة على قطعة الأرض نفسها (الارتداد الداخلي) مساوية للارتداد المطلوب لكلا المبنيين من قطعة أرض مجاورة، والمحددة بـ (X) في الشكل B.12، وتُقاس من أقل مسافة أفقية بين المبنيين. يجب ألا تقل هذه المسافة عن 3 m عندما يكون ارتفاع المبنيين محصور بالطابق الأرضي فقط."
- **Values:** separation = X(building 1) + X(building 2) (drawn as `X` + `X` in Figure B.12), measured at the least horizontal distance; `min 3 m` when both buildings are ground floor only
- **Conditions / exceptions:** The 3 m minimum for G-only buildings is less than the X + X = 6 m that Table B.1 (G = 3 m each) would give; the text does not reconcile the two.
- **Refs:** Figure B.12, Table B.1
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** yes — once each building's storey count is known.

#### Figure B.12 Setbacks between buildings in same plot
- **Pages:** EN p43 · AR p43
- **AR caption:** الشكل B.12 الارتدادات بين المباني في قطعة الأرض نفسها
- Dimensions:
  - `X` (left boundary) — plot limit (neighbour 02) to setback line.
  - `X` (right boundary) — plot limit (neighbour 02) to setback line.
  - `X` + `X` (internal) — between the two building footprints (01), each X measured from a building face to a dash-dot line drawn between them.
  - `Y` (top) — sikka centreline to setback line.
- Key (EN): 01: Building footprint · 02: Neighbour · 03: Allowable projection · 04: Road · X: Setback from neighbour, internal setback between buildings · Y: Setback from centre of sikka · ------ Plot limit · – – – Setback line
- Key (AR): 01: كتلة المبنى · 02: الجار · 03: البروز المسموح به · 04: الطريق · X: الارتداد من الجار، ارتداد داخلي بين المباني · Y: ارتداد من وسط السكة · حد قطعة الأرض · خط الارتداد

#### B.4.2.3 ¶12 a)
- **Pages:** EN p44 · AR p44
- **EN:** "The following structures shall be allowed within setbacks up to the plot limit as shown in Figure B.13: a) plot boundary wall/fence;"
- **AR:** "يُسمح بتواجد المنشآت التالية ضمن الارتدادات حتى حد قطعة الأرض على النحو الموضح في الشكل B.13: a) سور/سياج قطعة الأرض؛"
- **Values:** permitted within setback, up to plot limit
- **Conditions / exceptions:** Subject to ¶13 (must not obstruct exit discharge / fire access).
- **Refs:** Figure B.13
- **Obligation:** may
- **Mechanisable from plot geometry + inputs?** yes — permission keyed on element type.

#### B.4.2.3 ¶12 b)
- **Pages:** EN p44 · AR p44
- **EN:** "b) site enhancement landscape and hardscape;"
- **AR:** "b) المناطق الخضراء والأسطح المرصفة المحسنة للموقع؛"
- **Values:** permitted within setback, up to plot limit
- **Conditions / exceptions:** Subject to ¶13.
- **Refs:** Figure B.13
- **Obligation:** may
- **Mechanisable from plot geometry + inputs?** yes — permission keyed on element type.

#### B.4.2.3 ¶12 c)
- **Pages:** EN p44 · AR p44
- **EN:** "c) ring main unit (RMU) rooms and substations as required by service Authorities;"
- **AR:** "c) غرف حلقة الوحدة الرئيسية (RMU) والمحطات الفرعية على النحو المطلوب من قبل جهة الخدمة المعنية؛"
- **Values:** permitted within setback, up to plot limit
- **Conditions / exceptions:** "as required by service Authorities"; subject to ¶13.
- **Refs:** Figure B.13
- **Obligation:** may
- **Mechanisable from plot geometry + inputs?** partly — permission is mechanical; whether an RMU/substation is required is an Authority decision.

#### B.4.2.3 ¶12 d)
- **Pages:** EN p44 · AR p44
- **EN:** "d) basement and building substructure;"
- **AR:** "d) السرداب والبنية التحتية للمبنى؛"
- **Values:** basement permitted within setback, up to plot limit (consistent with Table B.1 "Basement" 0 / 0)
- **Conditions / exceptions:** Not beyond the plot limit (B.4.3.2 ¶2); subject to ¶13.
- **Refs:** Figure B.13, B.4.3.2
- **Obligation:** may
- **Mechanisable from plot geometry + inputs?** yes — basement footprint may equal the plot polygon unless the affection plan says otherwise.

#### B.4.2.3 ¶12 e)
- **Pages:** EN p44 · AR p44
- **EN:** "e) pergolas and light weight parking shading structures;"
- **AR:** "e) العرائش (البرجولات) ومظلات مواقف السيارات خفيفة الوزن؛"
- **Values:** permitted within setback, up to plot limit
- **Conditions / exceptions:** Lightweight only; subject to ¶13.
- **Refs:** Figure B.13
- **Obligation:** may
- **Mechanisable from plot geometry + inputs?** partly — permission is mechanical; "light weight" is a construction judgement.

#### B.4.2.3 ¶12 f)
- **Pages:** EN p44 · AR p44
- **EN:** "f) uncovered car parking and roadways;"
- **AR:** "f) مواقف السيارات والطرق المكشوفة؛"
- **Values:** uncovered parking and roadways permitted within setback, up to plot limit
- **Conditions / exceptions:** Uncovered only; subject to ¶13.
- **Refs:** Figure B.13
- **Obligation:** may
- **Mechanisable from plot geometry + inputs?** yes — surface parking and driveways may occupy the setback strip.

#### B.4.2.3 ¶12 g)
- **Pages:** EN p44 · AR p44
- **EN:** "g) security and/or guard rooms;"
- **AR:** "g) غرف الأمن و/أو الحراسة؛"
- **Values:** permitted within setback, up to plot limit
- **Conditions / exceptions:** Subject to ¶13.
- **Refs:** Figure B.13
- **Obligation:** may
- **Mechanisable from plot geometry + inputs?** yes — permission keyed on element type.

#### B.4.2.3 ¶12 h)
- **Pages:** EN p44 · AR p44
- **EN:** "h) retail structures on plots where the neighbour is also a retail occupancy."
- **AR:** "h) المحلات التجارية على قطع الأراضي التي يكون فيها الجار أيضًا محلات تجارية."
- **Values:** permitted within setback, up to plot limit
- **Conditions / exceptions:** Neighbour must also be retail occupancy; cf. ¶4; subject to ¶13.
- **Refs:** Figure B.13
- **Obligation:** may
- **Mechanisable from plot geometry + inputs?** partly — needs the neighbour's occupancy.

#### B.4.2.3 ¶13
- **Pages:** EN p44 · AR p44
- **EN:** "Such arrangements shall not obstruct exit discharge to fire vehicle access way/public road (if any)."
- **AR:** "يجب ألا تعيق مثل هذه الترتيبات تفريغ المخارج ومسار سيارة الإطفاء/الطريق العام (إن وجد)."
- **Values:** —
- **Conditions / exceptions:** Applies to all of ¶12 a)–h).
- **Refs:** —
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — exit discharge positions and fire access route are not modelled.

#### Figure B.13 Allowed construction within setback
- **Pages:** EN p44 · AR p44
- **AR caption:** الشكل B.13 البناء المسموح به ضمن الارتداد
- Dimensions: none printed. As drawn: the basement/substructure (02) fills the plot to the plot limit on the sikka side and both neighbour sides; the RMU room (05) and the security room (06) sit across the setback line at the road (04) corners, touching the plot limit; the above-ground footprint (01) stays inside the setback line.
- Key (EN): 01: Building footprint – above ground · 02: Basement & building substructure · 03: Sikka · 04: Road · 05: RMU rooms substations · 06: Security or guard rooms · ------ Plot limit · – – – Setback line
- Key (AR): 01: كتلة المبنى - فوق سطح الأرض · 02: السرداب والبنية التحتية للمبنى · 03: السكة · 04: الطريق · 05: غرف حلقة الوحدة الرئيسية (RMU)- المحطة الفرعية · 06: غرف أمن أو حراسة · حد قطعة الأرض · خط الارتداد

<a id="b4-2-4"></a>
### B.4.2.4 Building areas — مساحات المبنى
EN p45–46 · AR p45–46

<a id="b4-2-4-1"></a>
#### B.4.2.4.1 Gross area (GA) — المساحة الإجمالية (GA)
EN p45 · AR p45

#### B.4.2.4.1 ¶1
- **Pages:** EN p45 · AR p45
- **EN:** "Gross area (GA) is the floor area within the inside perimeter of the external walls of a building. The measurement excludes shafts and courtyards, but includes corridors, stairways, ramps, closets, base of atria (or similar voids) and the thickness of interior walls, columns or other features."
- **AR:** "المساحة الإجمالية (GA) هي المساحة الأرضية الإجمالية محتسبة من المحيط الداخلي للجدران الخارجية. ولا تشمل مساحات الأفنية والمناور، ولكنها تشمل الممرات والسلالم والمنحدرات والخزانات وقاعدة الأفنية الداخلية المسقفة (base of atria) (أو الفتحات المماثلة) وسماكة الجدران الداخلية أو الأعمدة أو العناصر الأخرى."
- **Values:** GA = floor area inside the inner face of external walls; − shafts − courtyards; includes corridors, stairs, ramps, closets, base of atria, interior walls, columns
- **Conditions / exceptions:** This is the code's occupant-load measure, not a planning GFA; it is measured to the **inside** face of external walls. AR renders "shafts and courtyards" as "الأفنية والمناور" (courtyards and light wells).
- **Refs:** Figure B.14
- **Obligation:** definition
- **Mechanisable from plot geometry + inputs?** partly — needs wall thickness and shaft areas, which the model does not draw.

#### B.4.2.4.1 ¶2
- **Pages:** EN p45 · AR p45
- **EN:** "GA is illustrated in Figure B.14. The highlighted areas are those included in the definition."
- **AR:** "تم توضيح المساحة الإجمالية (GA) في الشكل B.14. المناطق المظللة هي تلك التي تم تضمينها في التعريف."
- **Values:** —
- **Conditions / exceptions:** See the Figure B.14 note on the staircase shading.
- **Refs:** Figure B.14
- **Obligation:** informative
- **Mechanisable from plot geometry + inputs?** no — illustration.

#### B.4.2.4.1 ¶3
- **Pages:** EN p45 · AR p45
- **EN:** "GA is used for occupant load calculations as defined in Table B.2, elevator exemptions in Part C, in addition to other requirements in the DBC."
- **AR:** "تُستخدم المساحة الإجمالية (GA) لحسابات الإشغال على النحو المحدد في الجدول B.2، وإعفاء المباني من المصاعد في الجزء C، بالإضافة إلى الاشتراطات الأخرى الواردة في كود دبي للبناء."
- **Values:** —
- **Conditions / exceptions:** —
- **Refs:** Table B.2, Part C
- **Obligation:** informative
- **Mechanisable from plot geometry + inputs?** no — states where GA is used.

#### Figure B.14 GA plan
- **Pages:** EN p45 · AR p45
- **AR caption:** الشكل B.14 مخطط أفقي للمساحة الإجمالية (GA)
- Dimensions: none printed. As drawn (zoomed render): residential units (01), elevator lobby (02) and corridor (03) are shaded (included); balconies (04) outside the external wall line are unshaded; inside the cores the lift/service shafts, the service room (05) and the staircases (06) are drawn unshaded. The unshaded staircases conflict with the text, which includes "stairways"; the text governs.
- Key (EN): 01: Residential unit · 02: Elevator lobby · 03: Corridor · 04: Balcony · 05: Service room · 06: Staircase
- Key (AR): 01: الوحدة السكنية · 02: ردهة المصاعد · 03: الممر · 04: الشرفة (balcony) · 05: غرفة خدمية · 06: بيت السلم

<a id="b4-2-4-2"></a>
#### B.4.2.4.2 Net area (NA) — المساحة الصافية (NA)
EN p46 · AR p46

#### B.4.2.4.2 ¶1
- **Pages:** EN p46 · AR p46
- **EN:** "Net area (NA) is the actual occupied area, not including unoccupied accessory areas such as corridors, stairways, ramps, toilet rooms, mechanical rooms and closets."
- **AR:** "المساحة الصافية (NA) هي المساحة المشغولة الفعلية، ولا تشمل المساحات الملحقة غير المشغولة مثل الممرات والسلالم والمنحدرات وغرف دورات المياه والغرف الميكانيكية والخزائن."
- **Values:** NA = occupied area − corridors − stairways − ramps − toilet rooms − mechanical rooms − closets
- **Conditions / exceptions:** Exclusion list is open ("such as").
- **Refs:** Figure B.15
- **Obligation:** definition
- **Mechanisable from plot geometry + inputs?** partly — needs a room schedule; the engine holds unit areas, not room-level plans.

#### B.4.2.4.2 ¶2
- **Pages:** EN p46 · AR p46
- **EN:** "The calculation of NA is illustrated in the sample plan shown in Figure B.15."
- **AR:** "يوضح الشكل B.15 مثال مخطط أفقي لحساب المساحة الصافية (NA)."
- **Values:** —
- **Conditions / exceptions:** —
- **Refs:** Figure B.15
- **Obligation:** informative
- **Mechanisable from plot geometry + inputs?** no — illustration.

#### B.4.2.4.2 ¶3
- **Pages:** EN p46 · AR p46
- **EN:** "NA is used for occupant load calculations as defined in Table B.2 and parking rates defined in B.7.2.6.1, in addition to other requirements in the DBC."
- **AR:** "تُستخدم المساحة الصافية (NA) في حسابات الإشغال على النحو المحدد في الجدول B.2 ومعدلات المواقف المحددة في B.7.2.6.1، بالإضافة إلى الاشتراطات الأخرى الواردة في كود دبي للبناء."
- **Values:** —
- **Conditions / exceptions:** Parking rates in B.7.2.6.1 that are expressed per area are per **NA**, not GA or GFA.
- **Refs:** Table B.2, B.7.2.6.1
- **Obligation:** informative
- **Mechanisable from plot geometry + inputs?** partly — the engine can apply it if NA is supplied or derived; it does not hold NA today.

#### Figure B.15 Example of net area for different occupancies
- **Pages:** EN p46 · AR p46
- **AR caption:** الشكل B.15 مثال للمساحة الصافية لإشغالات مختلفة
- Dimensions: none printed. As drawn: meeting rooms (01, 06), ballroom (03), prayer room (04) and restaurant (07) are shaded, in different tones per occupancy; lobby (02), toilets (05), kitchen (08), corridors, stairs and lift shafts are unshaded.
- Key (EN): 01: Meeting room 1 · 02: Lobby · 03: Ballroom · 04: Prayer room · 05: Toilets · 06: Meeting room 2 · 07: Restaurant · 08: Kitchen
- Key (AR): 01: قاعة الاجتماعات 1 · 02: الردهة · 03: قاعة الاحتفالات · 04: غرفة الصلاة · 05: دورات المياه · 06: قاعة الاجتماعات 2 · 07: مطعم · 08: مطبخ

<a id="b4-2-5"></a>
### B.4.2.5 Balconies, building projections and terraces — الشرفات (balconies) والبروزات والمصاطب (terraces)
EN p47–51 · AR p47–51

<a id="b4-2-5-1"></a>
#### B.4.2.5.1 Limitations — المحددات
EN p47–49 · AR p47–49

#### B.4.2.5.1 ¶1 (sentence 1)
- **Pages:** EN p47 · AR p47
- **EN:** "A balcony, building projection or terrace (see Figure B.16 and Figure B.17) can be provided along the whole or part of the building façade constructed on the side of the plot that overlooks a road or neighbours."
- **AR:** "يمكن إنشاء شرفة (balcony) أو بروز مبنى أو مصطبة (terrace) (انظر الشكل B.16 والشكل B.17) على طول واجهة المبنى بالكامل أو جزء منها على جانب قطعة الأرض الذي يطل على طريق أو جار."
- **Values:** —
- **Conditions / exceptions:** Road side or neighbour side; subject to a)–g).
- **Refs:** Figure B.16, Figure B.17
- **Obligation:** may
- **Mechanisable from plot geometry + inputs?** yes — edge class (road / neighbour) is held.

#### B.4.2.5.1 ¶1 (sentence 2)
- **Pages:** EN p47 · AR p47
- **EN:** "Balconies, building projections and terraces shall meet the following requirements and limitations."
- **AR:** "يجب أن تفي الشرفات (balconies) وبروزات المباني والمصاطب (terraces) بالاشتراطات والمحددات التالية."
- **Values:** —
- **Conditions / exceptions:** Introduces a)–g).
- **Refs:** —
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — see a)–g).

#### B.4.2.5.1 a)
- **Pages:** EN p47 · AR p47
- **EN:** "a) The affection plan or DCR shall take precedence over the provisions in this subclause."
- **AR:** "a) يجب يكون لاشتراطات الخارطة الموقعية واشتراطات نظم التطوير (DCR) الأولوية على الأحكام الواردة في هذا البند الفرعي."
- **Values:** —
- **Conditions / exceptions:** AR printed "يجب يكون" (no "أن") — transcribed as printed. EN "or", AR "و" (and) between affection plan and DCR.
- **Refs:** affection plan, DCR
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** yes — precedence over held inputs.

#### B.4.2.5.1 b)
- **Pages:** EN p47 · AR p47
- **EN:** "b) A balcony or projecting building element shall be situated at an elevated level from ground floor, not less than 3 m from FFL of sidewalks and footpaths as shown in Figure B.16."
- **AR:** "b) يجب أن تكون الشرفة (balcony) أو عنصر المبنى البارز في مستوى مرتفع من الطابق الأرضي، ما لا يقل عن 3 m من مستوى تشطيب أرضية الأرصفة الجانبية (FFL) وممرات المشاة على النحو الموضح في الشكل B.16."
- **Values:** projection soffit `min 3 m` above sidewalk/footpath FFL
- **Conditions / exceptions:** —
- **Refs:** Figure B.16
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — needs floor heights; the lowest projecting level is a design input.

#### B.4.2.5.1 c)
- **Pages:** EN p47 · AR p47
- **EN:** "c) Projections from vehicle roads shall be set back a minimum of 0.6 m from the edge of vehicle road, or a height clearance of not less than 5.5 m shall be maintained from road level as shown in Figure B.16."
- **AR:** "c) يجب أن ترتد البروزات من طرق المركبات بمقدار 0.6 m على الأقل من حافة الطريق المستخدم للمركبات، أو أن يتم الحفاظ على ارتفاع صافي لا يقل عن 5.5 m عن مستوى الطريق على النحو الموضح في الشكل B.16."
- **Values:** horizontal `min 0.6 m` from edge of vehicle road, **or** vertical clearance `min 5.5 m` above road level
- **Conditions / exceptions:** Either condition suffices.
- **Refs:** Figure B.16
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — needs the carriageway edge position (not on an affection plan) and floor heights.

#### B.4.2.5.1 d)
- **Pages:** EN p47 · AR p47
- **EN:** "d) Projections above fire truck accessways shall be not less than 4.5 m in height from road level in accordance with Section 2, Ch. 2 of UAE FLSC [Ref. B.1]."
- **AR:** "d) يجب ألا يقل ارتفاع البروز فوق مسارات سيارات الإطفاء عن 4.5 m عن مستوى الطريق وفقًا للقسم 2، الفصل 2 من UAE FLSC [المرجع B.1]."
- **Values:** clearance under projection over fire truck accessway `min 4.5 m`
- **Conditions / exceptions:** Only over fire truck accessways.
- **Refs:** UAE FLSC Ch. 2 Section 2 [Ref. B.1]
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — fire access route is not modelled.

#### B.4.2.5.1 e)
- **Pages:** EN p47 · AR p47
- **EN:** "e) Projections outside the plot boundary are permitted on the road-facing side when the width of road in which the balcony or projection protrudes exceeds 9 m."
- **AR:** "e) يُسمح بالبروز خارج حدود قطعة الأرض على الجانب المواجه للطريق عندما يزيد عرض الطريق الذي تبرز فيه الشرفة (balcony) أو البروز على 9 m."
- **Values:** projection beyond plot limit allowed only on road side, road width `> 9 m`
- **Conditions / exceptions:** Road-facing side only; limited further by f).
- **Refs:** —
- **Obligation:** may
- **Mechanisable from plot geometry + inputs?** partly — road side is held; road width is not printed on affection plans.

#### B.4.2.5.1 f)
- **Pages:** EN p47 · AR p47
- **EN:** "f) Balconies and building projections shall be limited to 10% of the facing street width beyond the plot limit and 1.8 m maximum projection into the ROW as shown in Figure B.16."
- **AR:** "f) يجب أن تقتصر الشرفات (balconies) وبروز المباني خارج حد قطعة الأرض على 10% من عرض الشارع المواجه وبحدٍ أقصى 1.8 m للبروز في حرم الطريق على النحو الموضح في الشكل B.16."
- **Values:** projection beyond plot limit `max min(10 % × facing street width, 1.8 m)`
- **Conditions / exceptions:** Applies to projection into the ROW.
- **Refs:** Figure B.16
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — needs street width; the 1.8 m cap alone is mechanical.

#### B.4.2.5.1 g)
- **Pages:** EN p47 · AR p47
- **EN:** "g) The minimum horizontal distance of balconies and building projections from other adjacent buildings, structures or neighbouring plots shall maintain the minimum required setback (see Figure B.17)."
- **AR:** "g) يجب أن تحافظ المسافة الأفقية الدنيا بين شرفات (balconies) وبروزات المبنى والمباني المجاورة أو قطع الأراضي المجاورة على الحد الأدنى للارتداد المطلوب (انظر الشكل B.17)."
- **Values:** projection face to neighbour plot / building ≥ required setback (projections may not enter the neighbour setback)
- **Conditions / exceptions:** —
- **Refs:** Figure B.17
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** yes — setback measured to the outermost projection face on neighbour edges.

#### B.4.2.5.1 ¶2
- **Pages:** EN p47 · AR p47
- **EN:** "Plots adjacent to metro stations or metro infrastructure shall conform to the RTA railway protection code for the emirate of Dubai [Ref. B.2]."
- **AR:** "يجب أن تتوافق قطع الأراضي المجاورة لمحطات المترو أو البنية التحتية للمترو مع دليل القواعد الإجرائية لحماية السكك الحديدة في دبي [المرجع B.2]."
- **Values:** —
- **Conditions / exceptions:** AR printed "الحديدة" (sic) here; B.4.2.3 ¶10 prints "الحديدية".
- **Refs:** RTA railway protection code [Ref. B.2]
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — external code.

#### B.4.2.5.1 ¶3
- **Pages:** EN p47 · AR p47
- **EN:** "Privacy of neighbouring plots should be taken into account when setting the location and orientation of balconies."
- **AR:** "يفضل مراعاة خصوصية قطع الأراضي المجاورة عند تحديد موقع واتجاه الشرفات (balconies)."
- **Values:** —
- **Conditions / exceptions:** —
- **Refs:** —
- **Obligation:** should
- **Mechanisable from plot geometry + inputs?** no — judgement.

#### B.4.2.5.1 ¶4
- **Pages:** EN p47 · AR p47
- **EN:** "A privacy partition shall be provided between connected balconies of different residential units."
- **AR:** "يجب توفير حواجز للخصوصية بين الشرفات المتصلة (balconies) للوحدات السكنية المختلفة."
- **Values:** —
- **Conditions / exceptions:** Only connected balconies of different residential units.
- **Refs:** —
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — balconies are not modelled.

#### Figure B.16 Projection from ROW
- **Pages:** EN p48 · AR p48
- **AR caption:** الشكل B.16 بروز على حرم الطريق
- Dimensions (left half, road with carriageway and sidewalk):
  - `x` — road width: horizontal from the outer edge of the road surface drawn at road level (01) to the plot limit (03), spanning carriageway and sidewalk.
  - `≤10% of x` / `≤1.8 m` (one dimension, two labels) — projection depth of a balcony measured from the plot limit / wall face (03) to the balcony's outer face.
  - `≥0.6 m` — horizontal from the edge of the vehicle road (dashed vertical kerb line) to the outer face of the lowest projection, which is held back over the sidewalk.
  - `≥5.5 m` — vertical from road level (01) to the soffit of the projection that extends past the kerb line over the carriageway.
  - `≥3 m` — vertical from sidewalk level to the soffit of the lowest projection.
- Dimensions (right half, sidewalk only):
  - `≤1.8 m` — projection depth from the wall face to the balcony's outer face.
  - `≥3 m` — vertical from sidewalk level (02) to the soffit of the lowest projection.
- Key (EN): 01: Road level · 02: Sidewalk level · 03: Plot limit · X: Road width
- Key (AR): 01: مستوى الطريق · 02: مستوى الرصيف الجانبي · 03: حد قطعة الأرض · X: عرض الطريق

#### Figure B.17 Projections within setbacks
- **Pages:** EN p49 · AR p49
- **AR caption:** الشكل B.17 البروز ضمن الارتدادات
- Dimensions:
  - (03) Minimum required setback — horizontal from the plot limit (01) to the outer face of the projection.
  - `≥3 m` — vertical from ground level (04) to the soffit of the projection.
- Key (EN): 01: Plot limit, if applicable · 02: Neighbour · 03: Minimum required setback · 04: Ground level
- Key (AR): 01: حد قطعة الأرض، حيثما ينطبق ذلك · 02: الجار · 03: الحد الأدنى للارتداد المطلوب · 04: مستوى الأرضية

<a id="b4-2-5-2"></a>
#### B.4.2.5.2 Guardrails for fall protection — حواجز الحماية من السقوط (guardrails)
EN p49–50 · AR p49–50

#### B.4.2.5.2 ¶1 a)–f)
- **Pages:** EN p49 · AR p49
- **EN:** "Guardrails are required for any space, walking or standing which is elevated 760 mm above the FFL, with the exception of: a) the loading side of loading docks; b) the audience side of stages and raised platforms, including stairs leading up to the stage and raised platforms; c) raised stage and platform floor areas, such as runways, ramps and side stages; d) vertical openings in the performance area of stages and platforms; e) elevated walking surfaces associated with stages and platforms for access/use of special lighting or equipment; and f) along vehicle service pits not accessible to the public."
- **AR:** "يلزم وجود حواجز حماية (guardrails) لأي فراغ أو ممشى أو مكان يرتفع 760 mm فوق مستوى تشطيب الأرضية (FFL)، باستثناء: a) جانب التحميل من أرصفة التحميل؛ b) جانب الجمهور من المسارح والمنصات المرتفعة، بما في ذلك السلالم المؤدية إلى خشبة المسرح والمنصات المرتفعة؛ c) مناطق خشبة المسرح والمنصات المرتفعة، مثل الممرات والمنحدرات والمنصات الجانبية؛ d) الفتحات الرأسية في منطقة الأداء للمسارح والمنصات؛ e) أسطح المشي المرتفعة المرتبطة بالمسارح والمنصات للوصول/لاستخدام الإضاءة أو المعدات الخاصة؛ و f) على طول الحفر الخدمية للمركبات التي لا يمكن أن يصل إليها العامة."
- **Values:** guardrail required where drop `760 mm` above FFL
- **Conditions / exceptions:** Exceptions a)–f). The text does not say whether 760 mm itself triggers (≥) or only more than 760 mm.
- **Refs:** —
- **Obligation:** shall (stated as "are required" / يلزم)
- **Mechanisable from plot geometry + inputs?** partly — level differences on roofs and podium edges are in the model; stages, docks and pits are not.

#### B.4.2.5.2 ¶2
- **Pages:** EN p49 · AR p49
- **EN:** "The guardrail height from FFL (or lowest stepping feature, A in Figure B.18) shall be not less than 1,200 mm."
- **AR:** "يجب ألا يقل ارتفاع حاجز الحماية (guardrail) عن 1,200 mm من مستوى تشطيب الأرضية (FFL) (أو أدنى جزء بالعنصر القابل للتسلق) للشرفة (balcony) أو المساحة المرتفعة (A في الشكل B.18)."
- **Values:** guardrail height `min 1,200 mm` from FFL or lowest stepping feature
- **Conditions / exceptions:** AR adds "of the balcony or raised area" (للشرفة أو المساحة المرتفعة); same value.
- **Refs:** Figure B.18
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — component detail.

#### B.4.2.5.2 ¶3
- **Pages:** EN p49 · AR p49
- **EN:** "The separation distance between vertical posts or members (see Figure B.18), curved frames or design features, of balcony, guardrail or handrail shall not allow the passage of a 100 mm diameter sphere."
- **AR:** "يجب ألا تسمح المسافة بين العناصر أو القوائم الرأسية (انظر الشكل B.18) أو إطارات أو مكونات التصميم أو الشرفة (balcony) أو حاجز الحماية (guardrail) أو الدرابزين (handrail) بمرور جسم كروي قطره 100 mm."
- **Values:** openings must reject a `100 mm` diameter sphere
- **Conditions / exceptions:** —
- **Refs:** Figure B.18
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — component detail.

#### B.4.2.5.2 ¶4
- **Pages:** EN p49 · AR p49
- **EN:** "Horizontal climbable elements are not permitted within 865 mm height of the bottom of the guardrail, i.e. (B) in Figure B.18."
- **AR:** "لا يُسمح بعناصر تسلق أفقية حتى ارتفاع 865 mm من الجزء السفلي من حاجز الحماية (guardrail)، أي (B) في الشكل B.18."
- **Values:** no horizontal climbable element within `865 mm` of the guardrail bottom
- **Conditions / exceptions:** —
- **Refs:** Figure B.18
- **Obligation:** shall (stated as "not permitted")
- **Mechanisable from plot geometry + inputs?** no — component detail.

#### B.4.2.5.2 ¶5
- **Pages:** EN p49 · AR p49
- **EN:** "If the design requires any gap between finished floor surface and the bottommost horizontal component of the railing (see Figure B.18), the gap shall be not more than 100 mm."
- **AR:** "إذا تطلب تصميم الحاجز وجود أي فجوة بين سطح الأرضية النهائي والجزء الأفقي السفلي من الحاجز (انظر الشكل B.18)، فيجب ألا تزيد هذه الفجوة عن 100 mm."
- **Values:** floor-to-bottom-rail gap `max 100 mm`
- **Conditions / exceptions:** Only if a gap is designed.
- **Refs:** Figure B.18
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — component detail.

#### B.4.2.5.2 ¶6
- **Pages:** EN p49 · AR p49
- **EN:** "The balcony, handrail, guardrail assembly shall be able to withstand the loads specified in ASCE/SEI 7-16."
- **AR:** "يجب أن تكون مكونات الشرفة (balcony) والدرابزين (handrails) وحواجز الحماية (guardrails) قادرة على تحمل الأحمال المحددة في ASCE/SEI 7-16."
- **Values:** —
- **Conditions / exceptions:** —
- **Refs:** ASCE/SEI 7-16
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — structural.

#### B.4.2.5.2 ¶7
- **Pages:** EN p49 · AR p49
- **EN:** "If the design demands usage of glass panels in the balcony construction, such glass shall provide containment and withstand the loads specified in ASCE/SEI 7-16 (see E.9.2)."
- **AR:** "إذا كان التصميم يتطلب استخدام الألواح الزجاجية في بناء الشرفة (balcony)، فيجب أن يوفر هذا الزجاج احتواء وتحمل للأحمال المحددة في ASCE/SEI 7-16 (راجع E.9.2)."
- **Values:** —
- **Conditions / exceptions:** Only where glass panels are used.
- **Refs:** ASCE/SEI 7-16, E.9.2
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — structural / material.

#### Figure B.18 Guardrail specifications
- **Pages:** EN p50 · AR p50
- **AR caption:** الشكل B.18 مواصفات حاجز الحماية (guardrails)
- Sub-captions (EN): (a) Guardrail with stepping feature within 865 mm from FFL · (b) Guardrail without stepping feature within 865 mm from FFL
- Sub-captions (AR): (a) حاجز حماية (guardrail) مع عنصر قابل للتسلق في حدود 865 mm من مستوى · (b) حاجز حماية (guardrail) بدون عنصر قابل للتسلق حتى حدود 865 mm من مستوى تشطيب الأرضية (FFL) — the AR caption of (a) ends at "من مستوى" as printed.
- Dimensions, (a) vertical balusters with a low horizontal rail:
  - `≤100` (top) — vertical gap between the top rail and the intermediate rail (pointer 01).
  - `≤100` (left) — clear gap between adjacent vertical balusters.
  - `≤100` (right, bottom) — vertical gap between floor surface and the bottom horizontal rail.
  - `B ≥ 865` — height from the bottom of the guardrail to the intermediate horizontal rail (zone in which horizontal climbable elements are not permitted).
  - `A ≥ 1,200` — guardrail height to the top of the handrail.
- Dimensions, (b) glass infill:
  - `≤100` (top) — vertical gap between top rail and intermediate rail (pointer 01).
  - `≤100` (right, bottom) — vertical gap between floor surface and the bottom horizontal component.
  - `B ≥ 865` — as in (a).
  - `A ≥ 1,200` — as in (a).
  - Lower datum of A and B: per text, FFL or the lowest stepping feature; the oblique extension lines do not let the datum be read more precisely from the image.
- Units: printed without unit; text gives mm.
- Key (EN): 01: Gaps more than 100 mm not acceptable · 02: Stepping feature within 865 mm of base of guardrail not acceptable
- Key (AR): 01: الفتحات التي تزيد عن 100 mm غير مقبولة · 02: العناصر القابلة للتسلق في حدود 865 mm من قاعدة الحاجز غير مقبولة

<a id="b4-2-5-3"></a>
#### B.4.2.5.3 Access doors — أبواب الشرفات (balconies)
EN p51 · AR p51

#### B.4.2.5.3 ¶1
- **Pages:** EN p51 · AR p51
- **EN:** "Balconies and terraces shall not have self-closing, self-latching or self-locking doors, which can accidentally lock people outside in the balcony or terrace."
- **AR:** "يجب ألا تحتوي الشرفات (balconies) والمصطبات (terraces) على أبواب ذاتية الإغلاق أو ذاتية القفل، والتي يمكن أن تنغلق عن طريق الخطأ عندما يكون الأشخاص بالخارج في الشرفة (balcony) أو المصطبة (terrace)."
- **Values:** —
- **Conditions / exceptions:** **EDITION MISMATCH** — EN prohibits three door types (self-closing, self-latching, self-locking); AR names two (ذاتية الإغلاق، ذاتية القفل) and omits self-latching.
- **Refs:** —
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — door hardware.

<a id="b4-2-6"></a>
### B.4.2.6 Plot coverage — المساحة المغطاة
EN p51 · AR p51

#### B.4.2.6 ¶1
- **Pages:** EN p51 · AR p51
- **EN:** "Plot coverage shall be calculated as the horizontal area occupied by all main and annex buildings on the same plot, calculated from the external surfaces of external walls or useful roofed balconies in the ground or upper floors, whichever have more floor projections."
- **AR:** "تحسب المساحة المغطاة على أنها المساحة الأفقية التي تشغلها جميع المباني الرئيسية والملحقة على قطعة الأرض نفسها، ويكون حساب المساحة من الأسطح الخارجية للجدران الخارجية أو الشرفات (balconies) المسقوفة المستغلة في الطوابق الأرضية أو العلوية، أيهما يحتوي على المزيد من البروزات."
- **Values:** plot coverage = horizontal projected area of all main + annex buildings, to the **outside** face of external walls or of useful roofed balconies, on whichever floor (ground or upper) projects furthest
- **Conditions / exceptions:** Defines the measure only — **no maximum coverage percentage is set in B.4**; any limit comes from the affection plan / DCR. AR uses the indicative "تحسب" without يجب.
- **Refs:** Figure B.19
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** yes — union of the outermost floor outlines of all buildings on the plot, given the drawn footprints (balconies are not modelled).

#### B.4.2.6 ¶2 a)
- **Pages:** EN p51 · AR p51
- **EN:** "The following shall be excluded (see Figure B.19): a) lightweight structures such as a canopy, parking shade(s), pergola(s); and"
- **AR:** "يجب استثناء ما يلي من المساحة المغطاة (انظر الشكل B.19): a) هياكل خفيفة الوزن مثل المظلات ومظلات مواقف السيارات والعرائش (البرجولات)؛ و"
- **Values:** excluded from coverage: canopies, parking shades, pergolas
- **Conditions / exceptions:** Lightweight structures only.
- **Refs:** Figure B.19
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** yes — exclusion keyed on element type.

#### B.4.2.6 ¶2 b)
- **Pages:** EN p51 · AR p51
- **EN:** "b) ornamental and non-accessible building projections such as roof eaves, window shades."
- **AR:** "b) بروزات المبنى الزخرفية غير المستغلة مثل حلية السقف وكواسر تظليل النوافذ."
- **Values:** excluded from coverage: ornamental / non-accessible projections (roof eaves, window shades)
- **Conditions / exceptions:** —
- **Refs:** Figure B.19
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** yes — exclusion keyed on element type.

#### Figure B.19 Plot coverage
- **Pages:** EN p51 · AR p51
- **AR caption:** الشكل B.19 المساحة المغطاة
- Dimensions: none printed. As drawn: buildings (01) and annex building (06) shaded (counted); pergola (02), non-functional projection (03), parking canopy (04), roof eaves (07, outline beyond the left building) unshaded (excluded); surface parking (05) unshaded.
- Key (EN): 01: Building · 02: Pergola · 03: Non-functional projection · 04: Parking canopy · 05: Parking · 06: Annex building · 07: Roof eaves · ------ Plot limit
- Key (AR): 01: المبنى · 02: عريشة (برجولا) · 03: بروز غير وظيفي · 04: مظلة مواقف السيارات · 05: مواقف السيارات · 06: الملحق · 07: حلية السقف · ------ حد قطعة الأرض

---

<a id="b4-3"></a>
## B.4.3 Building floors general requirements — الاشتراطات العامة لطوابق المبنى
EN p52 · AR p52

<a id="b4-3-1"></a>
### B.4.3.1 Ground floor — الطابق الأرضي
EN p52 · AR p52

#### B.4.3.1 ¶1 (sentence 1)
- **Pages:** EN p52 · AR p52
- **EN:** "Ground floor use allowance shall conform to planning regulations."
- **AR:** "يجب أن يتوافق استخدام الطابق الأرضي مع الاشتراطات التخطيطية."
- **Values:** —
- **Conditions / exceptions:** —
- **Refs:** planning regulations
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — only if permitted ground-floor uses are an input.

#### B.4.3.1 ¶1 (sentence 2)
- **Pages:** EN p52 · AR p52
- **EN:** "A building or facility may have more than one ground floor where a split-level entrance has been provided and where a building plot has significant level difference."
- **AR:** "يمكن أن يحتوي المبنى أو المنشأة على أكثر من طابق أرضي عند وجود مداخل من مستويات مختلفة وعندما يوجد اختلاف كبير في مستويات قطعة الأرض الخاصة بالمبنى."
- **Values:** —
- **Conditions / exceptions:** Both conditions ("and"): split-level entrance provided and significant plot level difference. "Significant" is not quantified.
- **Refs:** —
- **Obligation:** may
- **Mechanisable from plot geometry + inputs?** no — needs topography and a judgement of "significant".

#### B.4.3.1 ¶2 (sentence 1)
- **Pages:** EN p52 · AR p52
- **EN:** "The ground floor shall be connected to the adjacent public ways by lobbies."
- **AR:** "يجب أن يكون الطابق الأرضي متصلاً بالطرق العامة المجاورة عن طريق الردهات."
- **Values:** —
- **Conditions / exceptions:** —
- **Refs:** —
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — lobbies are not modelled.

#### B.4.3.1 ¶2 (sentence 2)
- **Pages:** EN p52 · AR p52
- **EN:** "The number and location of exits discharging directly from the building to outside shall conform to Section 3.10, Ch. 3 of UAE FLSC [Ref. B.1]."
- **AR:** "يجب أن يتوافق عدد ومواقع مخارج المبنى المتصلة بالخارج مباشرة مع القسم 3.10، الفصل 3 من UAE FLSC [المرجع B.1]."
- **Values:** —
- **Conditions / exceptions:** —
- **Refs:** UAE FLSC Ch. 3 Section 3.10 [Ref. B.1]
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — external code; exits not modelled.

#### B.4.3.1 ¶2 (sentence 3)
- **Pages:** EN p52 · AR p52
- **EN:** "The points of exit discharge shall be separated from each other on plan by one third (sprinklered buildings) or one half (unsprinklered buildings) of the largest measurements of the building diagonal distance (see Figure B.20)."
- **AR:** "يجب فصل نقاط تفريغ المخارج عن بعضها بعضًا على المخطط الأفقي بمقدار ثلث (في المباني المزودة بنظام مرشات حريق) أو نصف (في المباني الغير مزودة بنظام مرشات حريق) أكبر قياسات المسافة القطرية للمبنى (انظر الشكل B.20)."
- **Values:** exit-discharge separation on plan `≥ 1/3 × max building diagonal` (sprinklered), `≥ 1/2 × max building diagonal` (unsprinklered)
- **Conditions / exceptions:** Text gives the separation, read as a minimum; Figure B.20 note writes it as an equality ("B = 1/3 A").
- **Refs:** Figure B.20
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — the diagonal of the ground-floor footprint is computable; exit positions are not modelled.

#### B.4.3.1 ¶3 (sentence 1)
- **Pages:** EN p52 · AR p52
- **EN:** "An emergency command centre conforming to Table 1.9, Ch. 1 and Section 2.9, Ch. 2 of UAE FLSC [Ref. B.1] shall be provided in malls, amusement park, high-rise and super high-rise buildings."
- **AR:** "يجب توفير مركز ادارة للطوارئ يتوافق مع الجدول 1.9، الفصل 1 والقسم 2.9، الفصل 2 من UAE FLSC [المرجع B.1] في مراكز التجارية والمتنزهات الترفيهية والمباني المرتفعة وشاهقة الارتفاع."
- **Values:** —
- **Conditions / exceptions:** Malls, amusement parks, high-rise and super high-rise buildings only.
- **Refs:** UAE FLSC Ch. 1 Table 1.9, Ch. 2 Section 2.9 [Ref. B.1]
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — trigger from use and height class is decidable; room not modelled.

#### B.4.3.1 ¶3 (sentence 2)
- **Pages:** EN p52 · AR p52
- **EN:** "The emergency command centre may be shared with a security room, rest area or control room, provided that it meets emergency command centre specifications."
- **AR:** "يمكن مشاركة مركز إدارة لطوارئ مع غرفة الأمن أو استراحة المبنى أو غرفة التحكم، بشرط أن يفي بمواصفات مركز إدارة الطوارئ."
- **Values:** —
- **Conditions / exceptions:** Shared room must still meet ECC specifications.
- **Refs:** —
- **Obligation:** may
- **Mechanisable from plot geometry + inputs?** no — room planning.

#### B.4.3.1 ¶4
- **Pages:** EN p52 · AR p52
- **EN:** "The emergency command centre shall be at ground floor and separated from the remainder of the building by a 1 h fire barrier constructed in accordance with Ch. 1 of UAE FLSC [Ref. B.1]. The entrance to the emergency command centre shall be on the exterior of the building along the fire accessway or if this is not feasible, at the main entrance lobby of the building. Emergency command centres shall meet the minimum room sizes specified in B.5.2."
- **AR:** "يجب أن يكون مركز إدارة الطوارئ في الطابق الأرضي ومنفصلًا عن باقي المبنى بحاجز مقاوم للحريق لمدة 1 h ويتوافق بناؤه مع الفصل 1 من UAE FLSC [المرجع B.1]. يجب أن يكون المدخل إلى مركز إدارة الطوارئ من خارج المبنى، مطلاً على مسار سيارة الإطفاء أو إذا لم يكن ذلك ممكنًا، يكون مدخل المركز عند ردهة المدخل الرئيسي للمبنى. يجب أن يستوفي مركز إدارة الطوارئ الحد الأدنى من قياسات الغرف المحددة في B.5.2."
- **Values:** location ground floor; fire barrier `1 h`; room size per B.5.2
- **Conditions / exceptions:** Entrance from exterior along fire accessway, or (if not feasible) at the main entrance lobby.
- **Refs:** UAE FLSC Ch. 1 [Ref. B.1], B.5.2
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — room placement and construction.

#### Figure B.20 Building exit separation
- **Pages:** EN p52 · AR p52
- **AR caption:** الشكل B.20 الفصل بين المخارج في المبنى
- Dimensions:
  - `A` (left plan, rectangular building) — building diagonal, corner to corner of the outline.
  - `B` (left plan) — direct distance between the doors of the two exit stairs.
  - `A` (right plan, irregular outline) — largest diagonal across the outline.
  - `B` (right plan) — direct distance between the two exit doors.
- Note as printed (EN): "B = 1/3 A for sprinklerled buildings" (sic) · "B = 1/2 A for unsprinklered buildings"
- Note as printed (AR): "B = 1/3 A للمباني المزودة بمرشات الحريق" · "B = 1/2 A للمباني الغير المزودة بمرشات الحريق"
- Key (EN): A: Building diagonal distance · B: Direct distance between exit doors
- Key (AR): A: المسافة القطرية للمبنى · B: المسافة المباشرة بين أبواب المخارج

<a id="b4-3-2"></a>
### B.4.3.2 Basements — السراديب
EN p53 · AR p53

#### B.4.3.2 ¶1
- **Pages:** EN p53 · AR p53
- **EN:** "The space use shall conform to planning regulations."
- **AR:** "يجب أن يتوافق استخدام السرداب مع الاشتراطات التخطيطية."
- **Values:** —
- **Conditions / exceptions:** —
- **Refs:** planning regulations
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — only if permitted basement uses are an input.

#### B.4.3.2 ¶2
- **Pages:** EN p53 · AR p53
- **EN:** "Basement floors shall not extend beyond the plot limits."
- **AR:** "يجب ألا تتعدى طوابق السرداب حدود قطعة الأرض."
- **Values:** basement footprint ⊆ plot polygon
- **Conditions / exceptions:** Read with B.4.2.3 ¶12 d) and Table B.1: basement may reach the plot limit, not cross it.
- **Refs:** —
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** yes — containment test against the plot polygon.

#### B.4.3.2 ¶3
- **Pages:** EN p53 · AR p53
- **EN:** "The basement shall be connected to the building by means of vertical circulation (staircases/elevators) in accordance with Ch. 1 to Ch. 10 of UAE FLSC [Ref. B.1]."
- **AR:** "يتصل السرداب بالمبنى عن طريق الحركة الرأسية (سلالم/مصاعد) طبقًا للفصل 1 إلى الفصل 10 من UAE FLSC [المرجع B.1]."
- **Values:** —
- **Conditions / exceptions:** AR uses the indicative "يتصل" with no يجب (verbal form differs; EN is "shall").
- **Refs:** UAE FLSC Ch. 1–Ch. 10 [Ref. B.1]
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — the core is drawn on every level; stairs and lifts inside it are not placed.

#### B.4.3.2 ¶4
- **Pages:** EN p53 · AR p53
- **EN:** "The basement slab soffit level shall not extend 1.2 m above the building gate level as shown in Figure B.21."
- **AR:** "يجب ألا يرتفع مستوى السطح السفلي (بطنية) لبلاطة السرداب بمقدار 1.2 m فوق المنسوب المرجعي للمبنى على النحو الموضح في الشكل B.21."
- **Values:** basement ceiling (soffit of the slab over the basement) `max 1.2 m` above gate level
- **Conditions / exceptions:** The text does not say what a level exceeding 1.2 m becomes.
- **Refs:** Figure B.21, B.4.2.1
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — needs gate level and slab levels; storey count alone does not decide it.

#### Figure B.21 Basement height from gate level
- **Pages:** EN p53 · AR p53
- **AR caption:** الشكل B.21 ارتفاع السرداب من المنسوب المرجعي
- Dimensions:
  - `≤1.2 m` — vertical from the gate level (04, top of the external ground slab) to the underside of the ground-floor slab (02), i.e. the soffit of the slab roofing the basement (03).
- Key (EN): 01: Upper floor · 02: Ground floor · 03: Basement floor · 04: Gate level
- Key (AR): 01: الطابق العلوي · 02: الطابق الأرضي · 03: طابق السرداب · 04: المنسوب المرجعي

<a id="b4-3-3"></a>
### B.4.3.3 Podium — قاعدة الأبراج (البوديوم podium)
EN p53 · AR p53

#### B.4.3.3 ¶1
- **Pages:** EN p53 · AR p53
- **EN:** "Building podiums shall conform to planning regulations."
- **AR:** "يجب أن تتوافق طوابق قاعدة الأبراج (البوديوم podium) مع الاشتراطات التخطيطية."
- **Values:** —
- **Conditions / exceptions:** No podium dimension, height or setback is set in B.4; it comes from planning regulations.
- **Refs:** planning regulations
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — the affection plan's podium count is an input; other podium rules are external.

#### B.4.3.3 ¶2
- **Pages:** EN p53 · AR p53
- **EN:** "When podium floors are used for habitable and occupiable spaces, these spaces shall be designed as indoor spaces with building envelope, acoustic treatment and ventilation/thermal comfort as required by Part E and Part H."
- **AR:** "عندما تُستخدم طوابق قاعدة الأبراج (البوديوم podium) للسكن والإشغالات الاخرى، يجب تصميم هذه الفراغات كفراغات داخلية بغلاف خارجي يراعي المعالجة الصوتية والتهوية والراحة الحرارية على النحو المطلوب في الجزء E والجزء H."
- **Values:** —
- **Conditions / exceptions:** Only habitable / occupiable podium floors (not podium parking).
- **Refs:** Part E, Part H
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — envelope design.

<a id="b4-3-4"></a>
### B.4.3.4 Roof — السطح
EN p54 · AR p54

#### B.4.3.4 ¶1
- **Pages:** EN p54 · AR p54
- **EN:** "The space use shall conform to planning regulations."
- **AR:** "يجب أن يتوافق استخدام السطح مع الاشتراطات التخطيطية."
- **Values:** —
- **Conditions / exceptions:** —
- **Refs:** planning regulations
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — only if permitted roof uses are an input.

#### B.4.3.4 ¶2
- **Pages:** EN p54 · AR p54
- **EN:** "Accessible roofs shall be provided with life safety features such as fall protection and guardrails in accordance with B.4.2.5.2."
- **AR:** "يجب أن تزود الأسطح القابلة للدخول بتجهيزات السلامة مثل متطلبات الحماية من السقوط وحواجز الحماية (guardrails) وفقًا لـ B.4.2.5.2."
- **Values:** guardrails per B.4.2.5.2 (`min 1,200 mm`)
- **Conditions / exceptions:** Accessible roofs only.
- **Refs:** B.4.2.5.2
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — roof edge length is computable; accessibility is a design choice.

#### B.4.3.4 ¶3
- **Pages:** EN p54 · AR p54
- **EN:** "Water proofing and thermal insulation material shall be fitted on the roof deck in order to protect it from water leaks (see E.7.3.2) and solar gain effects (see E.5.2.3)."
- **AR:** "يجب تثبيت مواد العزل المائي والعزل الحراري على السطح لحمايته من تسرب المياه (انظر E.7.3.2) وتأثيرات أشعة الشمس (انظر E.5.2.3)."
- **Values:** —
- **Conditions / exceptions:** —
- **Refs:** E.7.3.2, E.5.2.3
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — material specification.

#### B.4.3.4 ¶4
- **Pages:** EN p54 · AR p54
- **EN:** "Structures at roof level shall not exceed 50% of the roof floor area as shown in Figure B.22."
- **AR:** "يجب ألا تزيد المساحة المبنية على السطح عن 50% من مساحة أرضية السطح على النحو الموضح في الشكل B.22."
- **Values:** roof structures `max 50 %` of roof floor area
- **Conditions / exceptions:** Staircases and elevator rooms count toward the 50 % (¶5). Exceeding it makes the roof a regular floor (¶6).
- **Refs:** Figure B.22
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** yes — area ratio, given a roof-structure footprint.

#### B.4.3.4 ¶5
- **Pages:** EN p54 · AR p54
- **EN:** "Roof structures shall be set back a minimum of 1.5 m from the building envelope. Staircases and elevator rooms are excluded from the 1.5 m setback requirement, but they shall be calculated as part of the 50% construction area."
- **AR:** "يجب أن تتراجع المساحة المبنية على السطح بمقدار 1.5 m على الأقل من حدود المبنى. تُستثنى بيوت السلالم وغرف المصاعد من شرط الارتداد البالغ 1.5 m، ولكن يتم حسابها ضمن مساحة البناء المسموح بها والبالغة 50%."
- **Values:** roof structures set back `min 1.5 m` from building envelope; staircases / elevator rooms exempt from the setback but counted in the `50 %`
- **Conditions / exceptions:** Exemption for staircases and elevator rooms (setback only).
- **Refs:** Figure B.22
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** yes — inward offset of the top-floor plate by 1.5 m; core exempt.

#### B.4.3.4 ¶6
- **Pages:** EN p54 · AR p54
- **EN:** "Roof structures occupying more than 50% of the roof floor area or not provided with setback shall be treated as a regular floor."
- **AR:** "يجب التعامل مع الأسطح المبنية التي تشغل أكثر من 50% من مساحة أرضية السطح أو غير المزودة بالارتداد كطابق عادي وليس كطابق سطح."
- **Values:** roof structure `> 50 %` of roof area **or** without the 1.5 m setback → counted as a regular floor
- **Conditions / exceptions:** AR adds "وليس كطابق سطح" (and not as a roof floor) — same meaning.
- **Refs:** ¶4, ¶5
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** yes — follows from ¶4–¶5; affects the storey count used in B.4.2.2 ¶6 and Table B.1.

#### Figure B.22 Roof coverage and setback
- **Pages:** EN p54 · AR p54
- **AR caption:** الشكل B.22 نسبة تغطية الأسطح والارتداد
- Dimensions:
  - `≥1.5 m` (top) — from the building envelope (roof edge / parapet) to the top edge of the roof structure (02).
  - `≥1.5 m` (left) — from the building envelope to the left edge of the roof structure (02).
  - `≥1.5 m` (bottom) — from the bottom edge of the roof structure (02) to the building envelope.
  - As drawn, the staircase / elevator room (01, dashed) reaches the envelope at the top-left corner with no setback, inside the outline of 02.
- Key (EN): 01: Staircase or elevator room · 02: Roof structure not more than 50% of the roof area · 03: Roof
- Key (AR): 01: بيت السلم أو غرفة المصعد · 02: لا تزيد المساحة المبنية عن 50% من مساحة السطح · 03: السطح
