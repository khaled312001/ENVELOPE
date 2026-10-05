/**
 * العربية — الخطوة 1: قطعة الأرض.
 *
 * Held to `PlotFormDictionary` by the type system. Every choice is argued in
 * `docs/05-design/arabic-glossary.md`; the comments here record only what would
 * otherwise look like a mistranslation.
 *
 * «تصنيف تلقائي», never «افتراضي». Where the English says "A default here would
 * silently change the footprint" the sentence is describing a default rather than
 * denying one, and «افتراضي» outside a denial is the word the glossary forbids.
 *
 * «الحد», not «الضلع» — §5b. A polygon has sides; an affection plan prints
 * «الحدود», and this form is filled from an affection plan.
 *
 * THE ROAD TYPES are the glossary's: «طريق تجميعي», «طريق محلي». A road type is a
 * trade term and a consultant who met «طريق جامع» would conclude the product does
 * not know the field.
 *
 * "we compare it" — the product does not say «نحن», and §5 no longer allows the
 * vowelled passive «تُقارَن» that used to stand in for it, so the sentence names
 * the actor: «يقارنها النظام».
 */

import type { PlotFormDictionary } from './plotForm.en.js';

export const AR: PlotFormDictionary = {
  draft: {
    title: 'كنت قد بدأت إدخال قطعة أرض.',
    savedBefore: ' آخر حفظ في ',
    savedAfter: '. ولم يتغير شيء أدناه.',
    /* Masdar on both buttons, so neither can be read as a past-tense verb once the
       marks come off: «استرجعها» would otherwise be "he retrieved it". */
    restore: 'استرجاعها',
    discard: 'حذفها',
  },

  save: {
    saving: 'جاري الحفظ…',
    saved: (time: string): string => `آخر حفظ في ${time}`,
    localOnly: 'محفوظ على هذا الجهاز وحده — ادخل إلى حسابك فينتقل معك إلى أي جهاز.',
    error: 'لم يصل آخر حفظ إلى الخادم.',
  },

  title: 'قطعة الأرض',
  subtitle: 'أدخل الأبعاد من مخطط الأفكشن (Affection Plan).',

  carried: {
    title: 'منقولة من المخطط الذي رفعته.',
    body: (tolerance: string): string =>
      ` رقم القطعة والمجتمع العمراني والمساحة المذكورة مملوءة. أما العرض والعمق فلا: المخطط يذكر مساحة ولا يذكر واجهة، ومستطيل يستخرج من مساحة يجتاز فحص الـ${tolerance} أمام الرقم نفسه الذي خرج منه.`,
  },

  which: {
    legend: 'أي قطعة',
    plotNumber: 'رقم القطعة',
    community: 'المجتمع العمراني',
    /* A community's name as issued, in the script the affection plan prints it. */
    communityPlaceholder: 'مثلا Business Bay',
    communityHelp:
      'لائحة ضبط التطوير تختلف من مجتمع عمراني إلى آخر، وهذا الحقل يحدد القواعد التي تنطبق.',
  },

  size: {
    legend: 'ما حجمها',
    width: 'العرض (m)',
    depth: 'العمق (m)',
    stated: 'المساحة في مخطط الأفكشن (m²) ',
    optional: 'اختياري',
    statedHelp: (tolerance: string): string =>
      `إن أدخلتها، يقارنها النظام بالمساحة المحسوبة من أبعادك، ويعلن الفارق إن تجاوز ${tolerance}.`,
    computed: 'المساحة المحسوبة',
  },

  edges: {
    title: 'الحدود',
    unclassified: (count: string): string => `${count} دون تصنيف بعد`,
    allClassified: 'كلها مصنفة',
    /* The select's label; its options complete the sentence — «يطل على طريق». */
    faces: (edge: string): string => `الحد ${edge} يطل على`,
    choose: 'اختر…',
    classes: {
      ROAD: 'طريق',
      ADJACENT_PLOT: 'قطعة مجاورة',
      OPEN_SPACE: 'مساحة مفتوحة',
      OTHER: 'شيء آخر',
    },
    roadType: 'نوع الطريق',
    hierarchy: {
      ARTERIAL: 'طريق شرياني',
      COLLECTOR: 'طريق تجميعي',
      LOCAL: 'طريق محلي',
      ACCESS: 'طريق خدمة',
    },
    roadHelp: 'يقرأ المحرك جدول الارتدادات بحسب هذا الاختيار.',
  },

  /**
   * كيف تدخل صورة القطعة. انظر `plotForm.en.ts` للحجة كاملة.
   *
   * «مساحية» لا «بوصلة»: الاتجاه هنا اتجاه السير على الحد بالدرجات من الشمال مع
   * عقارب الساعة، وهو ما ينص عليه مخطط الأفكشن. والمحرك هو من يحسب العمود الخارج
   * من الحد، فلا يطلب من القارئ أن يطرح تسعين درجة في ذهنه.
   */
  shape: {
    legend: 'شكل القطعة',
    rectangle: 'مستطيل',
    edges: 'حدا بعد حد',
    rectangleHelp: 'واجهة وعمق. أسرع طريق حين تكون القطعة مستطيلة فعلا.',
    edgesHelp: 'طول واتجاه لكل حد كما ينص عليهما مخطط الأفكشن، ومنهما تحسب الأركان.',
    switched:
      'مستطيلك الآن في الحقول أدناه بأربعة حدود. عدل ما تشاء منها، وأضف حدا أو احذفه بحسب القطعة.',
    map: 'ارسمه على خريطة',
    mapHelp:
      'ارسم الحدود على صور الأقمار الصناعية، ومخطط الأفكشن فوقها. وتصل الأطوال والاتجاهات إلى الحقول أدناه قابلة للتعديل.',
    traced: (n: string): string =>
      `${n} حدود مرسومة في الحقول أدناه. والرسم ليس مساحة: راجع كل طول أمام المخطط وعدل ما يخالفه.`,
  },

  /**
   * The sheet's own boundary readings. See the English twin for the argument:
   * the sheet states a reading per FACE and never says which boundary of this
   * plot holds which, so that one question is what is asked.
   */
  roles: {
    legend: 'من مخطط الأفكشن',
    help: 'ينص المخطط على قراءة لكل واجهة. حدد أي حد هو أيها، فتطبق القراءة.',
    which: (n: string): string => `الحد ${n} هو`,
    choose: 'غير محدد',
    FRONT: 'الواجهة الأمامية',
    SIDE: 'الواجهة الجانبية',
    REAR: 'الواجهة الخلفية',
    appliesBefore: 'يقرأ المخطط هذه الواجهة ',
    appliesAfter: '.',
    assumed: 'مفترض',
    evidence: (page: string): string => `قرئت في صفحة ${page}`,
    missing: 'لا ينص المخطط على قراءة لكل واجهة. وما يتركه يبقى غير محدد هنا.',
  },

  traverse: {
    length: 'الطول (م)',
    bearing: 'الاتجاه (°)',
    bearingHelp:
      'بالدرجات من الشمال مع عقارب الساعة على امتداد الحد: الشمال صفر، والشرق ربع دورة.',
    add: 'أضف حدا',
    remove: 'حذف',
    removeEdge: (edge: string): string => `حذف الحد ${edge}`,
    tooFew: 'القطعة تحتاج إلى ثلاثة حدود على الأقل.',
    unusable:
      'كل حد يحتاج إلى طول أكبر من صفر واتجاه بين الصفر والدورة الكاملة. ولا يحسب شيء قبل أن يكتمل ذلك.',
    closes: 'تعود الحدود إلى الركن الذي بدأت منه.',
    misclose: (metres: string, ratio: string): string =>
      `لا تعود الحدود إلى الركن الذي بدأت منه: تنتهي على بعد ${metres} م، أي جزء واحد من ${ratio} من محيط القطعة.`,
    lastLeg: (drawn: string, entered: string): string =>
      `لم يعدل النظام شيئا. الشكل الذي يرسل إلى المحرك يغلق الحد الأخير عائدا إلى الركن الأول، فيصير طوله ${drawn} م بدل ${entered} م التي أدخلتها له.`,

    curve: 'هيئة الحد',
    straight: 'مستقيم',
    bowsRight: 'ينحني إلى اليمين',
    bowsLeft: 'ينحني إلى اليسار',
    curveHelp:
      'اليمين واليسار وأنت تمشي على الحد بالاتجاه المذكور أعلاه. الأركان تبقى في مواضعها، والانحناء هو طريقة سير الحد بينهما.',
    radius: 'نصف القطر (م)',
    radiusHelp: 'نصف القطر كما يطبعه مخطط الأفكشن.',
    arcNote: (arcLength: string, rise: string, sweep: string): string =>
      `${arcLength} م على امتداد القوس، يبتعد عن الخط المستقيم ${rise} م في أقصى نقطة، عبر ${sweep}°.`,
    radiusTooSmall:
      'دائرة بهذا الصغر لا تبلغ طرفي الحد. لا بد أن يكون نصف قطرها نصف الطول المذكور أعلاه على الأقل.',
    curveTooGentle:
      'هذا الانحناء يبتعد عن الخط المستقيم بأقل من مليمتر، وهو المقياس الذي ترسم عليه كل المخططات هنا. أدخله حدا مستقيما.',
  },

  submit: {
    busy: 'جاري فحص الحدود…',
    idle: 'متابعة',
    incomplete:
      'حدد تصنيف كل حد للمتابعة. فلو وضع هنا تصنيف تلقائي لغير مسطح البناء دون أن يراه أحد.',
  },
};
