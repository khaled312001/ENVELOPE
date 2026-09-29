/**
 * العربية — الخطوة 1: قطعة الأرض.
 *
 * Held to `PlotFormDictionary` by the type system. Every choice is argued in
 * `docs/05-design/arabic-glossary.md`; the comments here record only what would
 * otherwise look like a mistranslation.
 *
 * «ولا قيمة افتراضية له» — the one place «افتراضي» may appear, negated, meaning
 * "default" and denying one. Where the English says "A default here would
 * silently change the footprint" the Arabic says «تصنيف تلقائي» instead: the
 * sentence is not denying a default there, it is describing one, and «افتراضي»
 * outside a denial is the word the glossary forbids.
 *
 * THE ROAD TYPES are the glossary's: «طريق تجميعي», «طريق محلّي». A road type is
 * a trade term and a consultant who met «طريق جامع» would conclude the product
 * does not know the field.
 *
 * "we compare it" — the product does not say «نحن», so the comparison is stated
 * in the passive: «تُقارَن».
 */

import type { PlotFormDictionary } from './plotForm.en.js';

export const AR: PlotFormDictionary = {
  draft: {
    title: 'كنت بدأت إدخال قطعة أرض.',
    savedBefore: ' حُفظت في ',
    savedAfter: '. ولم يتغيّر شيء أدناه.',
    restore: 'استرجِعها',
    discard: 'احذفها',
  },

  save: {
    saving: 'جارٍ الحفظ…',
    saved: (time: string): string => `حُفظ في ${time}`,
    localOnly: 'محفوظ على هذا الجهاز فقط — سجِّل الدخول فيتبعك أينما كنت.',
    error: 'لم يصل آخر حفظ إلى الخادم.',
  },

  title: 'قطعة الأرض',
  subtitle: 'أدخل الأبعاد من مخطّط الأفكشن (Affection Plan).',

  carried: {
    title: 'نُقلت من المخطّط الذي رفعته.',
    body: (tolerance: string): string =>
      ` رقم القطعة والمجتمع العمراني والمساحة المذكورة مملوءة. أمّا العرض والعمق فلا: المخطّط يذكر مساحةً لا واجهة، والمستطيل المستنتَج من مساحةٍ سيجتاز عندئذٍ فحص الـ${tolerance} مقابل الرقم الذي استُنتج منه.`,
  },

  which: {
    legend: 'أيّ قطعة',
    plotNumber: 'رقم القطعة',
    community: 'المجتمع العمراني',
    /* A community's name as issued, in the script the affection plan prints it. */
    communityPlaceholder: 'مثلًا Business Bay',
    communityHelp:
      'لائحة ضبط التطوير تخصّ كل مجتمع عمراني على حدة، فهذا الحقل يحدّد القواعد التي تنطبق.',
  },

  size: {
    legend: 'ما حجمها',
    width: 'العرض (m)',
    depth: 'العمق (m)',
    stated: 'المساحة في مخطّط الأفكشن (m²) ',
    optional: 'اختياري',
    statedHelp: (tolerance: string): string =>
      `إن أدخلتها، تُقارَن بالمساحة المحسوبة من أبعادك، وتُبلَّغ إن اختلفتا بأكثر من ${tolerance}.`,
    computed: 'المساحة المحسوبة',
  },

  edges: {
    title: 'الأضلاع',
    unclassified: (count: string): string => `${count} دون تصنيف بعد`,
    allClassified: 'صُنِّفت كلها',
    /* The select's label; its options complete the sentence — «يطلّ على طريق». */
    faces: (edge: string): string => `الضلع ${edge} يطلّ على`,
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
      LOCAL: 'طريق محلّي',
      ACCESS: 'طريق وصول',
    },
    roadHelp: 'يُقرأ جدول الارتدادات بحسب هذا الاختيار.',
  },

  /**
   * كيف تُدخَل صورة القطعة. انظر `plotForm.en.ts` للحجّة كاملة.
   *
   * «مِسَاحة» لا «بوصلة»: الاتجاه هنا هو اتجاه السير على الضلع بالدرجات من
   * الشمال مع عقارب الساعة، وهو ما ينصّ عليه مخطّط الأفكشن. والمحرّك هو من
   * يحسب العمود الخارج من الضلع، فلا يُطلب من القارئ أن يطرح تسعين درجة ذهنيًّا.
   */
  shape: {
    legend: 'شكل القطعة',
    rectangle: 'مستطيل',
    edges: 'ضلعًا ضلعًا',
    rectangleHelp: 'واجهة وعمق. أسرع طريق حين تكون القطعة مستطيلة فعلًا.',
    edgesHelp:
      'طول واتجاه لكل ضلع كما ينصّ عليهما مخطّط الأفكشن، وتُحسب الأركان منهما.',
    switched:
      'مستطيلك الآن في الحقول أدناه بوصفه أربعة أضلاع. غيِّر ما تشاء منها، وأضِف ضلعًا أو احذفه بحسب القطعة.',
  },

  traverse: {
    length: 'الطول (م)',
    bearing: 'الاتجاه (°)',
    bearingHelp: 'بالدرجات من الشمال مع عقارب الساعة على امتداد الضلع: الشمال صفر، والشرق ربع دورة.',
    add: 'أضِف ضلعًا',
    remove: 'احذف',
    removeEdge: (edge: string): string => `احذف الضلع ${edge}`,
    tooFew: 'القطعة تحتاج إلى ثلاثة أضلاع على الأقل.',
    unusable:
      'كل ضلع يحتاج إلى طول أكبر من صفر واتجاه بين الصفر والدورة الكاملة. ولا يُحسب شيء قبل أن يكتمل ذلك.',
    closes: 'تعود الأضلاع إلى الركن الذي بدأت منه.',
    misclose: (metres: string, ratio: string): string =>
      `لا تعود الأضلاع إلى الركن الذي بدأت منه: تنتهي على بُعد ${metres} م، أي جزء واحد من ${ratio} من محيط القطعة.`,
    lastLeg: (drawn: string, entered: string): string =>
      `لم يُعدَّل شيء. الشكل الذي سيُرسَل يُغلق الضلع الأخير عائدًا إلى الركن الأول، فيصير طوله ${drawn} م بدل ${entered} م المُدخَلة له.`,
  },

  submit: {
    busy: 'جارٍ فحص الحدود…',
    idle: 'تابِع',
    incomplete:
      'صنِّف كل ضلع للمتابعة. فلو وُضع هنا تصنيف تلقائي لغيَّر مسطّح البناء دون أن يراه أحد.',
  },
};
