import type { Reader, Said } from './engine-notes.js';

/*
  THE CLAUSE REGISTER'S SENTENCES, IN BOTH LANGUAGES.

  `packages/rules/src/register` states every Dubai Building Code clause of B.4,
  B.5, B.7 and C.6.4 with a reason from a closed set, so the study report can
  say three hundred clauses with some forty sentences. Each is matched here by
  its exact English wording; this package may not import the rules package, so
  the wording is repeated, and `apps/api/test/clause-register-citations.test.ts`
  fails the day one side changes without the other.

  Clause numbers, page numbers, rule ids and module paths are not translated:
  they are identifiers, and the glossary keeps identifiers as issued.
*/

const REGISTER: Readonly<Record<string, Said>> = {
  // Where an applied clause acts.
  'The affection plan’s limits': { en: 'The affection plan’s limits', ar: 'حدود مخطط أفكشن' },
  Setbacks: { en: 'Setbacks', ar: 'الارتدادات' },
  Height: { en: 'Height', ar: 'الارتفاع' },
  'Parking required': { en: 'Parking required', ar: 'المواقف المطلوبة' },
  'Parking layout': { en: 'Parking layout', ar: 'توزيع المواقف' },
  Ramps: { en: 'Ramps', ar: 'المنحدرات' },
  'Vehicle access': { en: 'Vehicle access', ar: 'مداخل المركبات' },
  'Accessible and preferred bays': {
    en: 'Accessible and preferred bays',
    ar: 'مواقف أصحاب الهمم والمواقف المفضلة',
  },
  'Ground-floor plant': { en: 'Ground-floor plant', ar: 'غرف المعدات في الدور الأرضي' },
  'Dead-end driveways': { en: 'Dead-end driveways', ar: 'الممرات المسدودة' },

  // Why nothing checks a clause.
  'Can be worked out from the plot and the study’s inputs, and is not encoded yet.': {
    en: 'Can be worked out from the plot and the study’s inputs, and is not encoded yet.',
    ar: 'يمكن حسابه من قطعة الأرض ومدخلات الدراسة، ولم يرمز بعد.',
  },
  'The study’s layout keeps to it as drawn, and no check cites the clause.': {
    en: 'The study’s layout keeps to it as drawn, and no check cites the clause.',
    ar: 'يلتزم به توزيع الدراسة كما هو مرسوم، ولا يستشهد بالبند أي فحص.',
  },
  'Needs levels the study does not hold: road, gate and slab levels, floor-to-floor heights or beam depths.': {
    en: 'Needs levels the study does not hold: road, gate and slab levels, floor-to-floor heights or beam depths.',
    ar: 'يحتاج مناسيب لا تملكها الدراسة: منسوب الطريق والمنسوب المرجعي ومناسيب البلاطات، أو الارتفاع من دور إلى دور، أو عمق الجسور.',
  },
  'Needs road facts an affection plan does not give: widths, traffic, or the road network beyond the plot.': {
    en: 'Needs road facts an affection plan does not give: widths, traffic, or the road network beyond the plot.',
    ar: 'يحتاج معلومات عن الطريق لا يعطيها مخطط أفكشن: العرض أو حركة المرور أو شبكة الطرق خارج القطعة.',
  },
  'Needs use facts the study does not collect: permitted uses, occupant numbers or a neighbour’s use.': {
    en: 'Needs use facts the study does not collect: permitted uses, occupant numbers or a neighbour’s use.',
    ar: 'يحتاج معلومات عن الاستخدام لا تجمعها الدراسة: الاستخدامات المسموحة أو عدد الشاغلين أو استخدام القطعة المجاورة.',
  },
  'Concerns something the study does not lay out: exits, stairs, doors, rooms, balconies, columns, signs or footpaths.':
    {
      en: 'Concerns something the study does not lay out: exits, stairs, doors, rooms, balconies, columns, signs or footpaths.',
      ar: 'يتعلق بعنصر لا ترسمه الدراسة: المخارج أو الأدراج أو الأبواب أو الغرف أو الشرفات أو الأعمدة أو اللافتات أو ممرات المشاة.',
    },
  'A construction, finish or equipment detail beyond a capacity study.': {
    en: 'A construction, finish or equipment detail beyond a capacity study.',
    ar: 'تفصيل إنشائي أو تشطيب أو تجهيز يتجاوز نطاق دراسة السعة.',
  },
  'Defers to an instrument not encoded here: UAE FLSC, RTA manuals, DCAA, DCRs or other parts of the code.': {
    en: 'Defers to an instrument not encoded here: UAE FLSC, RTA manuals, DCAA, DCRs or other parts of the code.',
    ar: 'يحيل إلى مرجع غير مرمز هنا: كود الإمارات للحريق وحماية الأرواح، أو أدلة هيئة الطرق والمواصلات، أو هيئة دبي للطيران المدني، أو نظم التطوير، أو أجزاء أخرى من الكود.',
  },
  'A design judgement with no measurable test.': {
    en: 'A design judgement with no measurable test.',
    ar: 'تقدير تصميمي بلا معيار قابل للقياس.',
  },
  'Whether it applies to this building is an open question with the client, and is not assumed.': {
    en: 'Whether it applies to this building is an open question with the client, and is not assumed.',
    ar: 'انطباقه على هذا المبنى سؤال مفتوح مع العميل، ولم يفترض.',
  },

  // Why a clause cannot bear on the building studied.
  'A definition, example or lead-in; it sets no requirement of its own.': {
    en: 'A definition, example or lead-in; it sets no requirement of its own.',
    ar: 'تعريف أو مثال أو تمهيد، لا يفرض متطلبا بذاته.',
  },
  'Applies to a use other than the residential tower this study models.': {
    en: 'Applies to a use other than the residential tower this study models.',
    ar: 'ينطبق على استخدام غير البرج السكني الذي تدرسه هذه الدراسة.',
  },
  'Applies only where a scheme has an element this study never proposes.': {
    en: 'Applies only where a scheme has an element this study never proposes.',
    ar: 'ينطبق فقط إذا احتوى المخطط على عنصر لا تقترحه هذه الدراسة.',
  },
  'A permission the study does not take.': {
    en: 'A permission the study does not take.',
    ar: 'سماح لا تستخدمه الدراسة.',
  },

  // What a parking study's reader looks for and does not find.
  'Gate level is not computed: the road-edge and access-point levels it starts from are not on an affection plan.': {
    en: 'Gate level is not computed: the road-edge and access-point levels it starts from are not on an affection plan.',
    ar: 'المنسوب المرجعي لا يحسب: منسوبا حافة الطريق ونقطة الدخول اللذان يبدأ منهما ليسا على مخطط أفكشن.',
  },
  'The basement soffit’s 1.2 m limit above the gate level is not checked: neither level is held.': {
    en: 'The basement soffit’s 1.2 m limit above the gate level is not checked: neither level is held.',
    ar: 'حد 1.2 m للوجه السفلي لسقف القبو فوق المنسوب المرجعي لا يفحص: لا يتوفر أي من المنسوبين.',
  },
  'Clear heights, the parking’s included, are not checked: they need floor-to-floor heights and beam depths, and the study’s floor-to-floor figure is a development placeholder, not a cited one.':
    {
      en: 'Clear heights, the parking’s included, are not checked: they need floor-to-floor heights and beam depths, and the study’s floor-to-floor figure is a development placeholder, not a cited one.',
      ar: 'الارتفاعات الصافية، ومنها ارتفاع المواقف، لا تفحص: تحتاج الارتفاع من دور إلى دور وعمق الجسور، ورقم الدراسة للارتفاع من دور إلى دور قيمة مؤقتة للتطوير وليس قيمة مستشهدا بها.',
    },
  'Plot coverage is measured under the study’s own area-definitions annex (PLOT_COVERAGE), not checked against this clause’s wording.':
    {
      en: 'Plot coverage is measured under the study’s own area-definitions annex (PLOT_COVERAGE), not checked against this clause’s wording.',
      ar: 'تقاس نسبة التغطية وفق ملحق تعريفات المساحات في الدراسة (PLOT_COVERAGE)، ولا تفحص مقابل صياغة هذا البند.',
    },
  'Held for the tower. The ground floor and podium stand on the boundary under STMT-PODIUM-SETBACK-2026-10-16, a named practitioner’s statement listed wherever it applies.':
    {
      en: 'Held for the tower. The ground floor and podium stand on the boundary under STMT-PODIUM-SETBACK-2026-10-16, a named practitioner’s statement listed wherever it applies.',
      ar: 'يطبق على البرج. الدور الأرضي والبوديوم على حد القطعة بموجب STMT-PODIUM-SETBACK-2026-10-16، وهي إفادة ممارس مسمى تذكر حيثما تنطبق.',
    },
  'Wheel stoppers are not placed or drawn.': {
    en: 'Wheel stoppers are not placed or drawn.',
    ar: 'مصدات العجلات لا توضع ولا ترسم.',
  },
  'The 6 m straight run before a barrier or ramp is not reserved or checked.': {
    en: 'The 6 m straight run before a barrier or ramp is not reserved or checked.',
    ar: 'المسافة المستقيمة 6 m قبل الحاجز أو المنحدر لا تحجز ولا تفحص.',
  },
  'The extra 300 mm beside a wall, a column or the core is not added to any bay. Beside a column, whether the 0.50 m gap after every three bays (STMT-COLUMN-GAP-2026-10-16) already includes it is an open question; beside a wall or the core it is simply not encoded.':
    {
      en: 'The extra 300 mm beside a wall, a column or the core is not added to any bay. Beside a column, whether the 0.50 m gap after every three bays (STMT-COLUMN-GAP-2026-10-16) already includes it is an open question; beside a wall or the core it is simply not encoded.',
      ar: 'لا تضاف مسافة 300 mm الإضافية بجوار الجدار أو العمود أو النواة إلى أي موقف. بجوار العمود، هل تشملها مسافة 0.50 m بعد كل ثلاثة مواقف (STMT-COLUMN-GAP-2026-10-16) سؤال مفتوح؛ أما بجوار الجدار أو النواة فهي ببساطة غير مرمزة.',
    },
  'Bicycle parking is not computed. The code asks for 5% of the building’s required car bays (¶4), at stands no smaller than Table B.14 and within 30 m of the entrance (¶1); it states no rounding.':
    {
      en: 'Bicycle parking is not computed. The code asks for 5% of the building’s required car bays (¶4), at stands no smaller than Table B.14 and within 30 m of the entrance (¶1); it states no rounding.',
      ar: 'مواقف الدراجات لا تحسب. يطلب الكود 5% من مواقف السيارات المطلوبة للمبنى (¶4)، بحوامل لا تقل عن الجدول B.14 وعلى بعد لا يزيد عن 30 m من المدخل (¶1)، ولا يحدد التقريب.',
    },
  'No loading area is placed. Table B.16 asks for one sized for a 9 m truck wherever an off-street loading area is required, and does not say when a residential building requires one.':
    {
      en: 'No loading area is placed. Table B.16 asks for one sized for a 9 m truck wherever an off-street loading area is required, and does not say when a residential building requires one.',
      ar: 'لا توضع منطقة تحميل. يطلب الجدول B.16 منطقة لشاحنة طولها 9 m حيثما تكون منطقة التحميل داخل القطعة مطلوبة، ولا يحدد متى يحتاجها المبنى السكني.',
    },
  'Parking for a second use, such as shops on the ground floor, is not counted.': {
    en: 'Parking for a second use, such as shops on the ground floor, is not counted.',
    ar: 'مواقف الاستخدام الثاني، كالمحلات في الدور الأرضي، لا تحسب.',
  },

  // What the register is relative to.
  'Every clause of Dubai Building Code 2021 sections B.4, B.5, B.7 and C.6.4, transcribed with its page, for the building this study models: a residential tower on one plot, with its parking. Applied means a cited rule or constant in the engine uses the clause; not assessed means nothing checks it, and says why; not applicable says why it cannot bear on that building.':
    {
      en: 'Every clause of Dubai Building Code 2021 sections B.4, B.5, B.7 and C.6.4, transcribed with its page, for the building this study models: a residential tower on one plot, with its parking. Applied means a cited rule or constant in the engine uses the clause; not assessed means nothing checks it, and says why; not applicable says why it cannot bear on that building.',
      ar: 'كل بنود كود دبي للبناء 2021 في الأقسام B.4 وB.5 وB.7 وC.6.4، منقولة مع صفحاتها، للمبنى الذي تدرسه هذه الدراسة: برج سكني على قطعة واحدة مع مواقفه. التطبيق يعني أن قاعدة أو ثابتا مستشهدا به في المحرك يستخدم البند؛ وعدم الخضوع للتقييم يعني أن لا شيء يفحصه، مع ذكر السبب؛ وعدم الانطباق يذكر لماذا لا يمس ذلك المبنى.',
    },

  // What the proposal promised, against what exists.
  'No IFC file is written. The exports are the study report (HTML, printed to PDF), JSON, the A3 drawing set, DXF, the 3D model as .glb and XLSX.':
    {
      en: 'No IFC file is written. The exports are the study report (HTML, printed to PDF), JSON, the A3 drawing set, DXF, the 3D model as .glb and XLSX.',
      ar: 'لا يكتب ملف IFC. صيغ التصدير هي تقرير الدراسة (HTML يطبع PDF)، وJSON، ومجموعة لوحات A3، وDXF، والمجسم ثلاثي الأبعاد بصيغة glb، وXLSX.',
    },
  'Parking ratios (Table B.13, p89) and setbacks from a road and from a neighbour (Table B.1, p41) are dated rule records with page and verbatim text, still drafts no named architect has approved. Bay and aisle dimensions (Table B.11, p86), access (B.7.2.1, p78) and ramps (Tables B.9 and B.10, p80 and p82) are cited constants with page and verbatim text, not dated records. Setbacks to open space and to an unclassified boundary, the height in metres where a sheet states none, and the floor-to-floor height are placeholders that cite no instrument.':
    {
      en: 'Parking ratios (Table B.13, p89) and setbacks from a road and from a neighbour (Table B.1, p41) are dated rule records with page and verbatim text, still drafts no named architect has approved. Bay and aisle dimensions (Table B.11, p86), access (B.7.2.1, p78) and ramps (Tables B.9 and B.10, p80 and p82) are cited constants with page and verbatim text, not dated records. Setbacks to open space and to an unclassified boundary, the height in metres where a sheet states none, and the floor-to-floor height are placeholders that cite no instrument.',
      ar: 'نسب المواقف (الجدول B.13، ص89) والارتداد عن الطريق وعن الجار (الجدول B.1، ص41) سجلات قواعد مؤرخة مع الصفحة والنص الحرفي، وما زالت مسودات لم يعتمدها معماري مسمى. أبعاد المواقف والممرات (الجدول B.11، ص86) والمداخل (B.7.2.1، ص78) والمنحدرات (الجدولان B.9 وB.10، ص80 وص82) ثوابت مستشهد بها مع الصفحة والنص الحرفي، وليست سجلات مؤرخة. أما الارتداد عن المساحة المفتوحة وعن حد غير مصنف، والارتفاع بالمتر حين لا يذكره المخطط، والارتفاع من دور إلى دور، فقيم مؤقتة لا تستند إلى أي مرجع.',
    },
  'Since 15 Oct 2026 the ramp is sized from Table B.9 (12% and 2.4 m clear height, p80) and Table B.10 (transitions, p82). Its rise is the floor-to-floor height, which is a development placeholder. None of the six requirements B.7.2.2 numbers 1) to 6) is assessed: the floor finish, obstructions, corner protection, mirrors and drainage.':
    {
      en: 'Since 15 Oct 2026 the ramp is sized from Table B.9 (12% and 2.4 m clear height, p80) and Table B.10 (transitions, p82). Its rise is the floor-to-floor height, which is a development placeholder. None of the six requirements B.7.2.2 numbers 1) to 6) is assessed: the floor finish, obstructions, corner protection, mirrors and drainage.',
      ar: 'منذ 15 أكتوبر 2026 يحدد المنحدر من الجدول B.9 (ميل 12% وارتفاع صاف 2.4 m، ص80) والجدول B.10 (الانتقالات، ص82). ارتفاعه هو الارتفاع من دور إلى دور، وهو قيمة مؤقتة للتطوير. لم يخضع للتقييم أي من الاشتراطات الستة التي يرقمها B.7.2.2 من 1 إلى 6: تشطيب الأرضية والعوائق وحماية الزوايا والمرايا والتصريف.',
    },
};

export const REGISTER_READERS: readonly Reader[] = [(t) => REGISTER[t] ?? null];
