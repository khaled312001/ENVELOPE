# B.5 Minimum space requirements — DBC 2021 rule reference

Source: Dubai Building Code, 2021 Edition, Part B: Architecture. English PDF pp. 55–59, Arabic PDF
pp. 55–59 (offset 0; printed labels B 35–B 39). Extracted with pdfjs-dist and checked against page
renders. Verbal forms per DBC A.3.2: shall = mandatory (يجب) · should = recommended (يُفضل) ·
may = permitted (يمكن).

Arabic title: الحد الأدنى لمتطلبات الفراغات

## Contents
- [B.5.1 Occupant loads](#b-5-1) — EN p55 · AR p55
- [B.5.2 Minimum room sizes](#b-5-2) — EN p57 · AR p57
- [B.5.3 Minimum clear heights](#b-5-3) — EN p58 · AR p58

## Summary counts
Rules recorded: 8 (shall: 7, should: 0, may: 1, informative: 0, definition: 0). Table rows: 67
(Table B.2: 36, Table B.3: 13, Table B.4: 18). Figure dimensions: 7. UNREADABLE: 0. EDITION MISMATCH: 0.

Abbreviations as printed in the tables: GA = gross area (AR: المساحة الإجمالية (GA)); Net area (AR:
المساحة الصافية (NA)); FFL = finished floor level (AR: مستوى تشطيب الأرضية (FFL)).

---

<a id="b-5-1"></a>
## B.5.1 Occupant loads — الحمل الإشغالي
EN p55–56 · AR p55–56

#### B.5.1 ¶1
- **Pages:** EN p55 · AR p55
- **EN:** "Occupant load factors shall be determined in accordance with Table B.2."
- **AR:** "يجب تحديد عوامل إشغال الفراغات وفقًا للجدول B.2."
- **Values:** —
- **Conditions / exceptions:** Exits are NOT sized from Table B.2 — see B.5.1 ¶2.
- **Refs:** Table B.2
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — the factor lookup is mechanical; it needs per-use net/gross areas the engine does not lay out.

#### Table B.2 Occupant load factor per person
- **Pages:** EN p55–56 · AR p55–56 (continued on p56: "Table B.2 Occupant load factor per person (continued)" / "الجدول B.2 عامل الحمل الإشغالي لكل شخص (تتمة)")
- **Arabic caption:** الجدول B.2 عامل الحمل الإشغالي لكل شخص
- **Column headings:** EN "Occupancy · Use · Occupant load factor (m² per person unless otherwise stated) · Area used for calculation" — AR "الإشغال · الاستخدام · عامل الحمل الإشغالي (m² لكل شخص ما لم يذكر خلاف ذلك) · المساحة المستخدمة في الحساب"
- Obligation of every row: **shall** (via B.5.1 ¶1). Occupancy cells span several rows; repeated per row and noted.

| # | Occupancy | Use | Occupant load factor (m² per person unless otherwise stated) | Area used for calculation | AR (الإشغال · الاستخدام · العامل · المساحة) | Values (normalised) | Conditions | Obligation | Mechanisable |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Assembly | Concentrated – ballrooms, multipurpose-assembly halls | 0.65 | Net area | التجمعات · إشغال مُركّز – قاعات الاحتفالات، متعدد الأغراض- قاعات التجمعات · 0.65 · المساحة الصافية (NA) | 0.65 m²/person, net area | "Assembly" cell spans rows 1–11 (EN p55 left table) | shall | partly — needs net area of the use |
| 2 | Assembly | Mosques, prayer halls and prayer rooms | 0.9 for prayer area | Net area | التجمعات · المساجد وقاعات الصلاة وغرف الصلاة · 0.9 لمنطقة الصلاة · المساحة الصافية (NA) | 0.9 m²/person of prayer area, net area | Factor applies to the prayer area | shall | partly — needs prayer-area net area |
| 3 | Assembly | Less concentrated – outdoor buildings, restaurants, dining areas, seated waiting areas | 1.4 | Net area | التجمعات · إشغال أقل تركيزًا - المباني الخارجية، المطاعم وغرف الطعام مناطق الانتظار المزودة بمقاعد · 1.4 · المساحة الصافية (NA) | 1.4 m²/person, net area | — | shall | partly — needs net area of the use |
| 4 | Assembly | Conference rooms, meeting rooms | 1.4 | Net area | التجمعات · قاعات المؤتمرات، قاعات الاجتماعات · 1.4 · المساحة الصافية (NA) | 1.4 m²/person, net area | — | shall | partly — needs net area of the use |
| 5 | Assembly | Exhibition halls, production studios | 1.4 | Net area | التجمعات · قاعات المعارض، استوديوهات الإنتاج · 1.4 · المساحة الصافية (NA) | 1.4 m²/person, net area | — | shall | partly — needs net area of the use |
| 6 | Assembly | Bench seating | 455 mm linear | Net area | التجمعات · مقاعد الجلوس الطولية · 455 mm خطي · المساحة الصافية (NA) | 1 person per 455 mm of bench length | Unit is linear length, not m² | shall | no — needs bench lengths |
| 7 | Assembly | Fixed seating spaces (cinemas, theatres and similar) | According to number of fixed seats provided | Net area | التجمعات · أماكن المقاعد الثابتة (دور سينما ومسارح وما شابه) · حسب عدد المقاعد الثابتة المتوفرة · المساحة الصافية (NA) | occupants = number of fixed seats | — | shall | no — needs a seat count |
| 8 | Assembly | Waiting areas – standing | 0.65 | Net area | التجمعات · مناطق الانتظار - الوقوف · 0.65 · المساحة الصافية (NA) | 0.65 m²/person, net area | — | shall | partly — needs net area of the use |
| 9 | Assembly | Kitchens (e.g. in restaurants, not private residential) | 9.3 | GA | التجمعات · المطابخ (في المطاعم، المساحات غير السكنية الخاصة) · 9.3 · المساحة الإجمالية (GA) | 9.3 m²/person, gross area | Excludes private residential kitchens (EN). AR reads "(in restaurants, private non-residential spaces)" and has no "e.g." — wording only, no number differs | shall | partly — needs kitchen gross area |
| 10 | Assembly | Library – reading areas | 4.6 | Net area | التجمعات · المكتبة - مناطق القراءة · 4.6 · المساحة الصافية (NA) | 4.6 m²/person, net area | — | shall | partly — needs net area of the use |
| 11 | Assembly | Library – stack areas | 9.3 | GA | التجمعات · المكتبة - مناطق التخزين · 9.3 · المساحة الإجمالية (GA) | 9.3 m²/person, gross area | — | shall | partly — needs gross area of the use |
| 12 | Assembly | Swimming pools – water surface | 4.6 | GA | التجمعات · أحواض سباحة - سطح مائي · 4.6 · المساحة الإجمالية (GA) | 4.6 m²/person of water surface, GA | "Assembly" cell spans rows 12–22 (EN p55 right table) | shall | partly — needs pool area |
| 13 | Assembly | Swimming pools – deck | 2.8 | GA | التجمعات · أحواض سباحة - منصة · 2.8 · المساحة الإجمالية (GA) | 2.8 m²/person, GA | — | shall | partly — needs deck area |
| 14 | Assembly | Exercise room – without equipment | 1.4 | GA | التجمعات · غرفة تمرين - بدون معدات · 1.4 · المساحة الإجمالية (GA) | 1.4 m²/person, GA | — | shall | partly — needs gross area of the use |
| 15 | Assembly | Exercise room – with equipment | 4.6 | GA | التجمعات · غرفة تمرين - مع معدات · 4.6 · المساحة الإجمالية (GA) | 4.6 m²/person, GA | — | shall | partly — needs gross area of the use |
| 16 | Assembly | Stages | 1.4 | Net area | التجمعات · خشبات المسارح · 1.4 · المساحة الصافية (NA) | 1.4 m²/person, net area | — | shall | partly — needs net area of the use |
| 17 | Assembly | Gaming, amusement arcades | 1.0 | GA | التجمعات · غرف اللعب والتسلية · 1.0 · المساحة الإجمالية (GA) | 1.0 m²/person, GA | — | shall | partly — needs gross area of the use |
| 18 | Assembly | Skating rinks | 4.6 | GA | التجمعات · حلبات التزلج · 4.6 · المساحة الإجمالية (GA) | 4.6 m²/person, GA | — | shall | partly — needs gross area of the use |
| 19 | Assembly | Food courts – seating areas | 1.4 | Net area | التجمعات · صالات الطعام - مناطق الجلوس · 1.4 · المساحة الصافية (NA) | 1.4 m²/person, net area | — | shall | partly — needs net area of the use |
| 20 | Assembly | Airport waiting areas | 1.4 | GA | التجمعات · مناطق الانتظار بالمطار · 1.4 · المساحة الإجمالية (GA) | 1.4 m²/person, GA | — | shall | partly — needs gross area of the use |
| 21 | Assembly | Airport baggage claim | 1.9 | GA | التجمعات · استلام الأمتعة بالمطار · 1.9 · المساحة الإجمالية (GA) | 1.9 m²/person, GA | — | shall | partly — needs gross area of the use |
| 22 | Assembly | Art galleries, museums | 5.0 | GA | التجمعات · المعارض الفنية والمتاحف · 5.0 · المساحة الإجمالية (GA) | 5.0 m²/person, GA | — | shall | partly — needs gross area of the use |
| 23 | Business | Office – enclosed offices, low concentration | 9.3 | GA | إداري (أعمال) · مكتب - مكاتب مغلقة ذات تركيز منخفض · 9.3 · المساحة الإجمالية (GA) | 9.3 m²/person, GA | "Business" cell spans rows 23–24 | shall | partly — office GA known only if the use split is entered |
| 24 | Business | Office – open offices, high concentration | 4.6 | GA | إداري (أعمال) · مكتب - مكاتب مفتوحة، ذات تركيز عالي · 4.6 · المساحة الإجمالية (GA) | 4.6 m²/person, GA | — | shall | partly — office GA known only if the use split is entered |
| 25 | Retail | Retail shops | 5.6 | GA | محلات تجارية · المحلات التجارية · 5.6 · المساحة الإجمالية (GA) | 5.6 m²/person, GA | "Retail" cell spans rows 25–27 (EN p56) | shall | partly — retail GA known only if the use split is entered |
| 26 | Retail | Department stores, multi-level retail | 3.7 | GA | محلات تجارية · متاجرمتعددة الأقسام، متاجر متعدد المستويات · 3.7 · المساحة الإجمالية (GA) | 3.7 m²/person, GA | — | shall | partly — needs gross area of the use |
| 27 | Retail | Floors used for goods not accessed by public | 27.9 | GA | محلات تجارية · الطوابق المستخدمة للسلع التي لا يدخلها العامة · 27.9 · المساحة الإجمالية (GA) | 27.9 m²/person, GA | — | shall | partly — needs gross area of the use |
| 28 | Mall | Mall – less than 14,000 m² in area | 2.8 | Gross leasable area in accordance with UAE FLSC [Ref. B.1] | المراكز التجارية · مركز تجاري - أقل من 14,000 m² من حيث المساحة · 2.8 · إجمالي المساحة القابلة للتأجير وفقًا لـ UAE FLSC [المرجع B.1] | 2.8 m²/person of gross leasable area, mall < 14,000 m² | "Mall" cell spans rows 28–29. A mall of exactly 14,000 m² is covered by neither row as printed | shall | partly — needs GLA per FLSC definition |
| 29 | Mall | Mall – more than 14,000 m² in area | 3.3 | Gross leasable area in accordance with UAE FLSC [Ref. B.1] | المراكز التجارية · مركز تجاري - أكثر من 14,000 m² من حيث المساحة · 3.3 · إجمالي المساحة القابلة للتأجير وفقًا لـ UAE FLSC [المرجع B.1] | 3.3 m²/person of GLA, mall > 14,000 m² | as row 28 | shall | partly — needs GLA per FLSC definition |
| 30 | Industrial | Factories | 9.3 | GA | صناعي · المصانع · 9.3 · المساحة الإجمالية (GA) | 9.3 m²/person, GA | — | shall | partly — needs gross area of the use |
| 31 | Storage | Warehouse | 27.9 | GA | تخزين · المستودعات · 27.9 · المساحة الإجمالية (GA) | 27.9 m²/person, GA | — | shall | partly — needs gross area of the use |
| 32 | Educational | Classrooms | 1.9 | Net area | تعليمي · قاعات الدراسة · 1.9 · المساحة الصافية (NA) | 1.9 m²/person, net area | "Educational" cell spans rows 32–33 | shall | partly — needs net area of the use |
| 33 | Educational | Laboratories, vocational | 4.6 | Net area | تعليمي · المعامل، المهنية · 4.6 · المساحة الصافية (NA) | 4.6 m²/person, net area | — | shall | partly — needs net area of the use |
| 34 | Residential | Accommodation, shared sleeping spaces | 5.0 | Net area | سكني · السكن، مساحات النوم المشتركة · 5.0 · المساحة الصافية (NA) | 5.0 m²/person, net area | "Residential" cell spans rows 34–35. Ordinary apartments are not listed — see B.5.1 ¶3 | shall | partly — needs net area of the use |
| 35 | Residential | Labour accommodation – sleeping spaces | 3.7 | Net area | سكني · سكن العمال - أماكن النوم · 3.7 · المساحة الصافية (NA) | 3.7 m²/person, net area | — | shall | partly — needs net area of the use |
| 36 | Healthcare | (blank) | Refer to DHA regulations and guidelines [Ref. B.3 to Ref. B.18] | (blank) | صحي · (فارغ) · راجع أنظمة وإرشادات هيئة الصحة بدبي [المرجع B.3 إلى المرجع B.18] · (فارغ) | — (external: DHA) | Refs: Ref. B.3 to Ref. B.18 | shall | no — external instrument |

Parking is not a row of Table B.2; B.5.1 ¶3 sends any unlisted space to UAE FLSC Table 3.13.

#### B.5.1 ¶2
- **Pages:** EN p56 · AR p56
- **EN:** "The occupant load factors in Table B.2 generally align with UAE FLSC [Ref. B.1] with the exception of residential. However, exit widths and number of exits from a room, space, floor and building shall be calculated using the occupant load factors in Table 3.13, Ch. 3 of UAE FLSC [Ref. B.1]."
- **AR:** "تتوافق عوامل الحمل الإشغالي في الجدول B.2 بشكلٍ عام مع UAE FLSC [المرجع B.1] باستثناء الإشغال السكني. ومع ذلك، يجب حساب عرض وعدد المخارج من أي فراغ، مساحة، طابق ومبنى باستخدام عوامل الحمل الإشغالي في الجدول 3.13، الفصل 3 من UAE FLSC [المرجع B.1]."
- **Values:** —
- **Conditions / exceptions:** Table B.2 is not the basis for exit width or exit count; FLSC Table 3.13 is. Residential factors in Table B.2 differ from FLSC.
- **Refs:** Table B.2; UAE FLSC Table 3.13, Ch. 3 [Ref. B.1]
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — needs FLSC Table 3.13 (not in this chapter) and per-space areas.

#### B.5.1 ¶3
- **Pages:** EN p56 · AR p56
- **EN:** "Any space or building not listed in Table B.2 above shall conform to the occupant load factors noted in Table 3.13, Ch. 3 of UAE FLSC [Ref. B.1]."
- **AR:** "يجب أن تتوافق أي مساحة أو مبنى غير مدرج في الجدول B.2 أعلاه مع عوامل الحمل الإشغالي المذكورة في الجدول 3.13، الفصل 3 من UAE FLSC [المرجع B.1]."
- **Values:** —
- **Conditions / exceptions:** Applies to anything not in Table B.2 — including parking and ordinary residential apartments.
- **Refs:** Table B.2; UAE FLSC Table 3.13, Ch. 3 [Ref. B.1]
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — needs FLSC Table 3.13.

---

<a id="b-5-2"></a>
## B.5.2 Minimum room sizes — الحد الأدنى لقياسات الغرف
EN p57–58 · AR p57–58

#### B.5.2 ¶1
- **Pages:** EN p57 · AR p57
- **EN:** "The net area and clear dimension of a room/space shall be not less than the minimum sizes given in Table B.3. Minimum sizes for some other occupancies are given in B.9."
- **AR:** "يجب ألا تقل المساحة والأبعاد الصافية للغرفة/الفراغ عن الحد الأدنى الوارد في الجدول B.3. تتوفر الأبعاد الدنيا لبعض الإشغالات الأخرى في B.9."
- **Values:** —
- **Conditions / exceptions:** Net area and clear dimension (not gross).
- **Refs:** Table B.3; B.9
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — checkable against a unit area input; room dimensions need a room layout the engine does not produce.

#### Table B.3 Minimum room sizes
- **Pages:** EN p57 · AR p57
- **Arabic caption:** الجدول B.3 الحد الأدنى لقياسات الغرف
- **Column headings:** EN "Occupancy/use · Minimum area (m²) · Minimum dimension – length and width of a room (m)" — AR "الإشغال/الاستخدام · المساحة الدنيا (m²) · البعد الأدنى - طول وعرض الغرفة (m)"
- Obligation of every row: **shall** (via B.5.2 ¶1).

| # | Occupancy/use | Minimum area (m²) | Minimum dimension – length and width of a room (m) | AR (الإشغال/الاستخدام · المساحة · البعد) | Values (normalised) | Conditions | Obligation | Mechanisable |
|---|---|---|---|---|---|---|---|---|
| 1 | Residential living space (bedroom, living room) | 10.5 | 3 (See Figure B.23) | مساحة المعيشة السكنية (غرفة نوم، غرفة معيشة) · 10.5 · (See Figure B.23) 3 | min 10.5 m² net; min 3.0 m length and width | Net area / clear dimension per B.5.2 ¶1 | shall | no — needs a room layout |
| 2 | Residential studio (including bathroom and kitchen space) | 21 | 3 | وحدة استوديو سكنية (يشمل ذلك الحمام والمطبخ) · 21 · 3 | min 21 m² net incl. bathroom and kitchen; min 3 m | Area includes bathroom and kitchen | shall | partly — the 21 m² floor on a studio unit area input is checkable; 3 m needs a layout |
| 3 | Housekeeper's/guard rooms (single occupancy only exclusive of toilet area) | 4.5 | 2.1 | غرف مدبر (مدبرة) المنزل/الحارس (لاستخدام فردي فقط ولا تشمل مساحة المرحاض) · 4.5 · 2.1 | min 4.5 m² net excl. toilet; min 2.1 m | Single occupancy only; toilet area excluded | shall | no — needs a room layout |
| 4 | Retail shop | — | 2.4 | محل تجاري · — · 2.4 | min 2.4 m dimension; no area minimum | — | shall | no — needs a shop layout |
| 5 | Retail showroom | — | 9 | معرض تجاري · — · 9 | min 9 m dimension; no area minimum | — | shall | no — needs a showroom layout |
| 6 | Enclosed office | — | 2.4 | المكتب المغلق (غرفة مكتبية) · — · 2.4 | min 2.4 m dimension; no area minimum | — | shall | no — needs a room layout |
| 7 | Enclosed kitchen | 5.4 | 1.8 | المطبخ المغلق · 5.4 · 1.8 | min 5.4 m² net; min 1.8 m | See also B.5.2 ¶2 (1.2 m manoeuvring space) | shall | no — needs a room layout |
| 8 | Bathroom and toilets | Shall meet fixture clearances noted in B.8.1.5 | (cell spans both value columns) | الحمام والمرحاض · يجب الالتزام بالمتطلبات المذكورة في B.8.1.5 | — (see B.8.1.5) | Cell spans the area and dimension columns. AR says "requirements", EN "fixture clearances" — wording only | shall | no — needs fixture layout |
| 9 | Toilet stalls | Shall conform to B.8.1.4 | (cell spans both value columns) | مقصورات المراحيض · يجب أن تتوافق مع B.8.1.4 | — (see B.8.1.4) | Cell spans the area and dimension columns | shall | no — needs fixture layout |
| 10 | Hotel establishment | Refer to applicable DTCM classification criteria [Ref. B.19 to Ref. B.36] | (cell spans both value columns) | المنشآت الفندقية · راجع معايير التصنيف المعمول بها في دائرة السياحة والتسويق التجاري بدبي [المرجع B.19 إلى المرجع B.36] | — (external: DTCM) | Cell spans the area and dimension columns | shall | no — external instrument |
| 11 | Healthcare facilities | Refer to DHA regulations and guidelines [Ref. B.3 to Ref. B.18] | (cell spans both value columns) | المنشآت الصحية · راجع أنظمة وإرشادات هيئة الصحة بدبي [المرجع B.3 إلى المرجع B.18] | — (external: DHA) | Cell spans the area and dimension columns | shall | no — external instrument |
| 12 | Fire pump rooms | Refer to Table 1.9, Ch. 1 of UAE FLSC [Ref. B.1] for minimum room sizes dependent upon equipment selected and other requirements such as proximity to exit stairways. | (cell spans both value columns) | غرف مضخات الحريق · راجع الجدول 1.9، الفصل 1 من UAE FLSC [المرجع B.1] للحد الأدنى لقياسات الغرف التي تعتمد على المعدات المختارة والاشتراطات الأخرى مثل القرب من سلالم الخروج. | — (external: FLSC Table 1.9) | Depends on equipment selected; proximity to exit stairways | shall | no — depends on equipment selection |
| 13 | Emergency command centre | 19 | 3 | مركز إدارة الطوارئ · 19 · 3 | min 19 m² net; min 3 m | — | shall | no — needs a room layout |

#### Figure B.23 Minimum residential living space dimensions
- **Pages:** EN p57 · AR p57
- **Arabic caption:** الشكل B.23 الأبعاد الدنيا لغرفة المعيشة السكنية
- ≥3.0 m — room width, inner face to inner face of the walls (horizontal dimension across the top of the plan)
- ≥3.0 m — room length, inner face to inner face of the walls (vertical dimension on the left of the plan)
- A ≥ 10.5 m² — room area (label inside the room)
- **Key:** EN "A: Room area" — AR "A: مساحة الغرفة"

#### B.5.2 ¶2 (kitchen manoeuvring space)
- **Pages:** EN p58 · AR p58
- **EN:** "The manoeuvring space between kitchen counters or adjacent to a single-sided kitchen counter shall be not less than 1.2 m, as shown in Figure B.24."
- **AR:** "يجب ألا تقل مساحة الحركة بين مناضد المطبخ أو المساحة المجاورة لمنضدة المطبخ أحادية الجانب عن 1.2 m، على النحو الموضح في الشكل B.24."
- **Values:** min 1.2 m clear between counters, or in front of a single-sided counter
- **Conditions / exceptions:** —
- **Refs:** Figure B.24
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** no — needs a kitchen layout.

#### Figure B.24 Manoeuvring space within kitchen
- **Pages:** EN p58 · AR p58
- **Arabic caption:** الشكل B.24 مساحة الحركة داخل المطبخ
- ≥1.2 m — left drawing (section): clear distance between the fronts of the two facing counters
- ≥1.2 m — right drawing (plan): clear distance from the counter front (hob side) to the opposite units
- **Key:** none printed

---

<a id="b-5-3"></a>
## B.5.3 Minimum clear heights — الحد الأدنى للارتفاعات
EN p58–59 · AR p58–59

#### B.5.3 ¶1
- **Pages:** EN p58 · AR p58
- **EN:** "The clear height of a space shall be not less than the minimum values given in Table B.4."
- **AR:** "يجب ألا يقل الارتفاع الصافي للفراغات عن القيم الدنيا الواردة في الجدول B.4."
- **Values:** —
- **Conditions / exceptions:** Mechanical parking may have less than these heights: B.7 states "The net floor height of the parking levels shall match the system specification requirements, and may be less than the minimum clear heights given in B.5.3" (EN p82, outside this chapter).
- **Refs:** Table B.4
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — needs floor-to-floor height and structural depth per level, which are not affection-plan facts.

#### B.5.3 ¶2
- **Pages:** EN p58 · AR p58
- **EN:** "The clear heights shall be calculated from FFL to any structural suspended element or ceiling soffits, as shown in Figure B.25."
- **AR:** "يجب حساب الارتفاع الصافي من مستوى تشطيب الأرضية (FFL) إلى أي عنصر إنشائي متدلي أو أسفل السقف المعلق، على النحو الموضح في الشكل B.25."
- **Values:** measured FFL → underside of the lowest structural suspended element (e.g. downstand beam) or ceiling soffit
- **Conditions / exceptions:** The upper datum is the lowest element (beam), not the slab soffit — Figure B.25 measures the car park's 2.3 m to the underside of the beam. AR says "underside of the suspended ceiling" (أسفل السقف المعلق) where EN says "ceiling soffits". This is a wording difference only: both measure to the lowest overhead surface.
- **Refs:** Figure B.25
- **Obligation:** shall
- **Mechanisable from plot geometry + inputs?** partly — the arithmetic is trivial once floor-to-floor height and beam depth are inputs; neither is derivable from the plot.

#### Table B.4 Minimum clear heights
- **Pages:** EN p58–59 · AR p58–59 (continued on p59: "Table B.4 Minimum clear heights (continued)" / "الجدول B.4 الحد الأدنى للارتفاع الصافي (تتمة)")
- **Arabic caption:** الجدول B.4 الحد الأدنى للارتفاع الصافي
- **Column headings:** EN "Occupancy · Use · Minimum clear heights (m)" — AR "الإشغال · الاستخدام · الحد الأدنى للارتفاعات (m)"
- Obligation of every row: **shall** (via B.5.3 ¶1).

| # | Occupancy | Use | Minimum clear heights (m) | AR (الإشغال · الاستخدام · الحد الأدنى) | Values (normalised) | Conditions | Obligation | Mechanisable |
|---|---|---|---|---|---|---|---|---|
| 1 | Assembly | Awqat mosque prayer hall | 3.8 | التجمعات · قاعة الصلاة في مسجد أوقات · 3.8 | min 3.8 m clear | "Assembly" cell spans rows 1–4 | shall | partly — needs floor-to-floor and structure depth |
| 2 | Assembly | Jumaa mosque prayer hall | 5.0 | التجمعات · قاعة الصلاة في مسجد الجمعة · 5.0 | min 5.0 m clear | — | shall | partly — needs floor-to-floor and structure depth |
| 3 | Assembly | Prayer rooms | 2.7 | التجمعات · غرف الصلاة في المباني · 2.7 | min 2.7 m clear | AR reads "prayer rooms in buildings" | shall | partly — needs floor-to-floor and structure depth |
| 4 | Assembly | Ballrooms, multipurpose assembly halls | 2.7 | التجمعات · قاعات الاحتفالات، قاعات التجمعات متعددة الأغراض · 2.7 | min 2.7 m clear | — | shall | partly — needs floor-to-floor and structure depth |
| 5 | Business | Offices | 2.5 | اداري (اعمال) · المكاتب · 2.5 | min 2.5 m clear | — | shall | partly — needs floor-to-floor and structure depth |
| 6 | Retail, mall | Retail shops/stores, showrooms | 2.5 | محلات تجارية، ومراكز تجارية · المحلات التجارية/متاجر البيع والمعارض التجارية · 2.5 | min 2.5 m clear | — | shall | partly — needs floor-to-floor and structure depth |
| 7 | Educational | Schools, nurseries and kindergartens – classrooms | 2.7 | تعليمي · المدارس ودور الحضانة ورياض الأطفال - الفصول الدراسية · 2.7 | min 2.7 m clear | — | shall | partly — needs floor-to-floor and structure depth |
| 8 | Healthcare | — | Refer to DHA regulations and guidelines [Ref. B.3 to Ref. B.18] | صحي · — · راجع أنظمة وإرشادات هيئة الصحة بدبي [المرجع B.3 إلى المرجع B.18] | — (external: DHA) | — | shall | no — external instrument |
| 9 | Residential, hotel | Living and bedroom spaces | 2.7 | سكني، فندقي · مساحات المعيشة وغرفة النوم · 2.7 | min 2.7 m clear | Figure B.25 (lower) shows this case | shall | partly — needs floor-to-floor and structure depth |
| 10 | Industrial | Industrial equipment areas | Minimum headroom for industrial equipment access shall conform to Table 3.4, Ch. 3 of UAE FLSC [Ref. B.1]. | صناعي · مساحات المعدات الصناعية · يجب أن يتوافق الحد الأدنى من الارتفاع لوصول المعدات الصناعية حسب الجدول 3.4، الفصل 3 من UAE FLSC [المرجع B.1]. | — (external: FLSC Table 3.4) | — | shall | no — external instrument |
| 11 | Common areas | Parking – for light vehicles | 2.3 | الفراغات العامة · مواقف السيارات - للسيارات الخفيفة · 2.3 | min 2.3 m clear, FFL to underside of lowest structural element | "Common areas" cell spans rows 11–18. Light vehicles only. Measured per B.5.3 ¶2 / Figure B.25 to the beam underside. Vehicular ramps are governed separately by Table B.9 (2.4 m, B.7) | shall | partly — the engine knows each parking level, not its floor-to-floor or beam depth |
| 12 | Common areas | Corridors, passageways and elevator lobbies | 2.3 | الفراغات العامة · الممرات وردهات المصاعد · 2.3 | min 2.3 m clear | — | shall | partly — needs floor-to-floor and structure depth |
| 13 | Common areas | Occupiable spaces (other than listed above) | 2.3 | الفراغات العامة · الفراغات المشغلة (بخلاف المذكورة أعلاه) · 2.3 | min 2.3 m clear | Catch-all for occupiable spaces not listed | shall | partly — needs floor-to-floor and structure depth |
| 14 | Common areas | Washrooms and toilets | 2.3 | الفراغات العامة · الحمامات ودورات المياه · 2.3 | min 2.3 m clear | — | shall | partly — needs floor-to-floor and structure depth |
| 15 | Common areas | Storage and utility space | 2.3 | الفراغات العامة · المخازن والمساحات الخدمية · 2.3 | min 2.3 m clear | — | shall | partly — needs floor-to-floor and structure depth |
| 16 | Common areas | Stairways | 2.03 m above the stair treads and 2.3 m above the stair landings (see B.6.4.1.15) | الفراغات العامة · السلالم · 2.03 m فوق مداس السلم و 2.3 m فوق بسطة (صدفة) السلم (انظر B.6.4.1.15) | min 2.03 m above treads; min 2.3 m above landings | Measurement per B.6.4.1.15 / Figure B.41 | shall | partly — needs stair section and floor-to-floor |
| 17 | Common areas | Means of egress | 2.3 (plus the protrusion sentence — see entry below) | الفراغات العامة · وسائل الخروج · 2.3 | min 2.3 m clear | Protruding objects allowed below it over ≤50% of the ceiling area with ≥2.03 m headroom — see "Table B.4, means of egress cell" | shall | partly — needs floor-to-floor and structure depth |
| 18 | Common areas | Fire pump room | 2.5 (see Table 1.9, Ch. 1 of UAE FLSC [Ref. B.1]) | الفراغات العامة · غرف مضخات الحريق · 2.5 (انظر الجدول 1.9، الفصل 1 من UAE FLSC [المرجع B.1]) | min 2.5 m clear | Refs: UAE FLSC Table 1.9, Ch. 1 | shall | partly — needs floor-to-floor and structure depth |

#### Table B.4, means of egress cell — protruding objects
- **Pages:** EN p59 · AR p59
- **EN:** "In not more than 50% of the ceiling area, protruding objects may extend below the minimum clear ceiling height, where a minimum headroom of 2.03 m from FFL shall be provided."
- **AR:** "يمكن أن تمتد الأجسام البارزة إلى ما دون الحد الأدنى لارتفاع السقف فيما لا يزيد عن 50% من مساحة السقف الصافي، حيث يجب توفير مسافة رأسية لا تقل عن 2.03 m من مستوى تشطيب الأرضية (FFL)."
- **Values:** protrusions over ≤50 % of ceiling area; min 2.03 m headroom from FFL under them
- **Conditions / exceptions:** Printed inside the "Means of egress" row only. The table does not say whether it extends to the parking row. AR says "net ceiling area" (مساحة السقف الصافي).
- **Refs:** —
- **Obligation:** may (the protrusion); shall (the 2.03 m headroom under it)
- **Mechanisable from plot geometry + inputs?** no — needs an MEP/structure ceiling plan.

#### Figure B.25 Clear heights
- **Pages:** EN p59 · AR p59
- **Arabic caption:** الشكل B.25 ارتفاعات صافية
- ≥ 2.3 m — upper drawing (car park section with a car): vertical from the finished floor to the **underside of the downstand beam** (the dimension's upper leader is drawn to the beam bottom, not the slab soffit). The text extraction reads "> 2.3 m"; the page image shows "≥ 2.3 m".
- ≥ 2.7 m — lower drawing (bedroom section): vertical from the finished floor to the underside of the ceiling bulkhead/soffit at the right-hand wall. The text extraction reads "> 2.7 m"; the page image shows "≥ 2.7 m".
- **Key:** none printed
