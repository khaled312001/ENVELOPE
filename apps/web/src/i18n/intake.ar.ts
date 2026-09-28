/**
 * العربية — الخطوة 0: قراءة مخطّط الأفكشن (Affection Plan).
 *
 * Held to `IntakeDictionary` by the type system. Every choice is argued in
 * `docs/05-design/arabic-glossary.md`; the comments here record only what would
 * otherwise look like a mistranslation.
 *
 * THE INSTRUMENT IS NAMED ONCE IN FULL AND GLOSSED — «مخطّط الأفكشن (Affection
 * Plan)» — in the step's heading, because the reader is holding a sheet that says
 * "Affection Plan" and needs to match the word. After that it is «المخطّط». FAR and
 * GFA are glossed at their labels for the same reason: they are printed on the
 * sheet in English.
 *
 * "We read the printed values" is said of the engine, «يقرأ المحرّك», never «نقرأ»:
 * the product speaks of itself in the third person.
 *
 * THE GAP IS AS LOUD AS A VALUE. «غير مطبوع على هذا المخطّط» is a statement about
 * the sheet and not a verdict on the plot, and the blocked banner keeps its reason
 * whole: a limit borrowed from a neighbouring plot is the mistake the product
 * exists to prevent.
 */

import type { IntakeDictionary } from './intake.en.js';

export const AR: IntakeDictionary = {
  title: 'اقرأ مخطّط الأفكشن (Affection Plan)',
  subtitle:
    'أفلِت ملف PDF هنا. يقرأ المحرّك القيم المطبوعة، ويُعيد فحص حساب المخطّط نفسه، ويُدرج ما لا يذكره. ولا يُحفَظ شيء حتى تنظر فيه.',

  dropzone: {
    busy: 'جارٍ قراءة المخطّط…',
    idle: 'اختر ملف PDF، أو أفلِته هنا',
    /* "does not guess at pixels" — the engine reads text and refuses to read an
       image, so the Arabic says what it refuses rather than naming the pixels. */
    issuedOnly:
      'يجب أن يكون المخطّط ملف PDF الصادر نفسه. فالصورة الفوتوغرافية والمسح الضوئي لا نصّ فيهما يُقرأ، ولا يُخمِّن المحرّك نصًّا من صورة.',
  },

  /*
    «في الغالب» carries the English "usually", and it stays: without it the
    sentence would say every large file IS a scanned bundle, which is more than
    the English claims. The refusal itself is not hedged — the file is refused.
  */
  tooLarge: {
    before: 'حجم الملف ',
    after: (sizeMb: string, typicalMb: string): string =>
      ` هو ${sizeMb} MB. ومخطّطات الأفكشن أوراق مفردة بحجم ${typicalMb} MB تقريبًا — والملف بهذا ` +
      'الحجم يكون في الغالب حزمةً ممسوحة ضوئيًّا، والمسح الضوئي لا نصّ فيه يُقرأ.',
  },

  skip: 'تخطَّ — سأُدخل القيم بنفسي',

  fields: {
    plotNumber: 'رقم القطعة',
    community: 'المجتمع العمراني',
    landUse: 'استعمال الأرض',
    plotArea: 'مساحة القطعة',
    far: 'معامل البناء (FAR)',
    gfa: 'إجمالي المساحة الطابقية المسموح بها (GFA)',
    issued: 'تاريخ الإصدار',
    drawingRef: 'مرجع الرسم',
  },
  notPrinted: 'غير مطبوع على هذا المخطّط',
  notStated: 'غير مذكور',

  faces: {
    front: 'أمامي',
    side: 'جانبي',
    rear: 'خلفي',
  },
  faceSeparator: '، ',
  needsDecision: 'يحتاج إلى قرار',
  or: ' أو ',

  height: {
    label: 'الارتفاع:',
    /* A label before each count, so no count needs a counted noun to agree with. */
    groundBefore: 'الطابق الأرضي ',
    groundAfter: '، ',
    podiumBefore: 'طوابق المصطبة ',
    podiumAfter: '، ',
    typicalBefore: 'الطوابق المتكرّرة ',
    typicalAfter: '.',
  },

  setbacks: {
    title: 'الارتدادات كما طُبعت',
    podium: 'الطابق الأرضي والمصطبة',
    tower: 'البرج',
    asPrintedBefore: 'كما طُبع: «',
    asPrintedAfter: '»',
    decision: {
      title: 'أحد هذه الارتدادات يتوقّف على قرار لم يتّخذه أحد.',
      before: 'يذكر المخطّط قيمتين للواجهة نفسها — ومثالها المعتاد «',
      /*
        «واختزالها في رقم واحد يختار الواجهة عنه» — the reason the engine refuses
        to pick, kept whole. The English says the run is BLOCKED until someone
        chooses; «تبقى التشغيلة محجوبة» says the same and does not soften it into
        a warning.
      */
      after:
        '». وهذه دقّة من المخطّط لا غموض: فالقيمة تتوقّف على واجهةٍ لم يخترها مقدّم الطلب. واختزالها في رقم واحد يختار الواجهة عنه، فتبقى كما طُبعت، وتبقى التشغيلة محجوبة حتى يختار أحد.',
    },
  },

  coverage: {
    label: 'نسبة التغطية:',
    podium: (percent: string): string => `المصطبة ${percent}% من مساحة القطعة`,
    podiumMissing: 'المصطبة غير مذكورة',
    tower: (percent: string): string => `، البرج ${percent}%`,
    end: '.',
  },

  crossChecks: {
    title: 'حساب المخطّط نفسه، بعد إعادة فحصه',
    agrees: 'يتّفق',
    disagrees: 'لا يتّفق',
  },

  missingTitle: 'ما لا يذكره هذا المخطّط',

  /*
    الطبقات الثلاث: الواقعة، ثم ما يعنيه لك، ثم الحجّة — والأخيرة خلف إفصاح مغلق.
    أُعيد ترتيب اللوحة لأن قارئها كتب: «وفي حجات موجوده مش مفهومه بالنسبالي». كانت
    اللوحة صحيحةً وغيرَ مقروءة: تبدأ بعنوان، ثم تسرد الثغرات، ثم تضع الحجّة كلها في
    آخر جملةٍ داخل لافتةٍ حمراء — فأوّلُ ما يلقاه القارئ فقرةٌ عن الحدود المستعارة
    قبل أن يُقال له بعبارة صريحة ما هذه القائمة التي تحتها.

    «يُغفِل» لا «ينسى»: الإغفال وصفٌ للوثيقة، والنسيان نسبةُ نيّةٍ إلى من أصدرها.
  */
  missingLead:
    'هذه حدودٌ سكت عنها هذا المخطّط. ولن يملأها المحرّك. لك أن تُدخل كلًّا منها من اللائحة الحاكمة لهذه القطعة، أو أن ترفق وثيقةً تنصّ عليها.',
  missingWhySummary: 'لماذا لا يملأ المحرّك ثغرةً في مخطّط',
  missingWhy:
    'لأن الطريق البديهيّ لملئها أن يُؤخَذ الرقم من قطعةٍ مجاورة، وذاك هو الخطأ بعينه الذي وُجد هذا المنتج لمنعه. فالقطعتان في المجتمع العمرانيّ الواحد تحملان حدودًا مختلفةً في كثير من الأحيان، ومعامل بناءٍ مستعارٌ يُخرِج مبنًى معقولًا، مرسومًا جيّدًا، مُسعَّرًا بالكامل، وغيرَ مرخَّص. الثغرة المُسمّاة تكلّف بعد ظهيرة؛ والثغرة المملوءة في صمت يجدها المُنظِّم.',

  blocked: {
    title: 'لا يكفي هذا المخطّط لإجراء تشغيلة للطاقة.',
    before: ' يُغفِل ',
    labelSeparator: '، ',
    after:
      '. ولك مع ذلك أن تُنشئ القطعة وتُدخل تلك الحدود بنفسك، من اللائحة الحاكمة لها.',
  },

  use: 'استخدم هذه القيم',
  carryOver: (tolerance: string): string =>
    'يُنقَل رقم القطعة والمجتمع العمراني والمساحة المذكورة، وينتظر عدد طوابق المصطبة أن تؤكّده في خطوة القواعد. أمّا العرض والعمق فلا يُنقَلان: المخطّط يذكر مساحةً، والمستطيل المستنتَج من مساحةٍ شكلُ قطعةٍ لم يمسحها أحد. ' +
    `أدخل الأبعاد، وسيُقارِن فحصُ الـ${tolerance} بينها وبين المساحة أعلاه.`,
};
