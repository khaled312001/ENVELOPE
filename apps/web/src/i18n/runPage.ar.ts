/**
 * العربية — صفحة التشغيلة الواحدة، `/work?run=…`.
 *
 * Held to `RunPageDictionary` by the type system, so this file cannot be missing a
 * key. Every term is checked against `docs/05-design/arabic-glossary.md`; the
 * comments here record only what would otherwise read as a mistranslation.
 *
 * ---------------------------------------------------------------------------
 * THE FOUR REFUSALS, AND HOW THE ARABIC HOLDS EACH.
 *
 * 1. «لا شيء هنا يُحسَب بينها» — nothing is computed between two runs of one plot.
 *    A flat present-tense denial; no «فرق», no «أفضل», no «تحسُّن» anywhere below.
 *
 * 2. ONE SENTENCE FOR MISSING AND NOT-SHARED: «فإمّا أنها غير موجودة، وإمّا أنها لم
 *    تُشارَك معك». «إمّا … وإمّا» keeps both possibilities open with equal weight,
 *    which is the point — the page does not know which, and must not guess.
 *
 * 3. THE SHARE CONFIRMATION IS CONDITIONAL AND STAYS CONDITIONAL. «إن كان حسابٌ
 *    يستخدم العنوان» opens it, and «لا تقول هذه الصفحة ما إذا كان حسابٌ يستخدمه»
 *    closes it. Nothing between the two may read as "the account was found".
 *
 * 4. «لا يُتحقَّق من رخصة أحد» — nobody's licence is checked. «الرخصة» and never
 *    «الترخيص», which is TRAKHEES (see `antechamber.ar.ts`).
 *
 * «ما إذا» and not «هل» after a negated verb of reporting — `dashboard.ar.ts` records
 * why: it is the careful MSA form, and the register of a refusal is part of it.
 *
 * ---------------------------------------------------------------------------
 * THE ROLES ARE ACCUSATIVE — «مراجِعًا»، «قارئًا» — because both sentences that use
 * them put the role after «بصفتك» or «بصفته» («in the capacity of»), which takes a
 * حال. The chip on the list is a nominative noun and lives in `work.ar.ts`.
 *
 * NO DIGIT BELOW. The level count reaches `model.label` as an argument, and the gate
 * id `G4` is the component's, set `Verbatim` between `noteBefore` and `noteAfter`.
 */

import type { RunPageDictionary } from './runPage.en.js';

export const AR: RunPageDictionary = {
  back: 'أعمالك',

  plot: 'قطعة الأرض ',
  aRun: 'تشغيلة',

  lede: {
    computedAt: ' · حُسبت في ',
    computedEarlier: ' · حُسبت في وقت سابق',
    /* «وأنشأها» — the account that computed the run is its author, and the glossary's
       verb for making a run is «أنشأ». */
    by: '، وأنشأها ',
    kept: '. تُحفَظ كما حُسبت تمامًا، ولا يُعاد على هذه الصفحة حساب شيء.',
  },

  draftChip: 'قواعد مسوّدة',
  draftNote: ' حُسبت على قواعد لم يعتمدها أيّ مهني مُسمّى.',

  error: {
    missing: 'هذه التشغيلة ليست في قائمتك. فإمّا أنها غير موجودة، وإمّا أنها لم تُشارَك معك.',
    failed: 'تعذّر تحميل التشغيلة. أعِد تحميل الصفحة لتحاول مجدّدًا.',
  },
  loading: 'جارٍ تحميل التشغيلة…',

  answer: {
    title: 'الإجابة',
    governing: 'الطاقة الحاكمة',
    binds: 'القيد المُلزِم',
    levels: 'الطوابق التي تضعها الإجابة',
    levelsOf: ' من ',
    heightPermits: ' يسمح بها الارتفاع',
    /* «مُفترَضة» — assumed. Never «افتراضية», which is "default". */
    assumed: 'القيم المُفترَضة',
    gates: 'بوّابات التصدير الموقَّعة',
    gatesOf: ' من ',
    signedBy: ' · وقّعها ',
    notSigned: ' · غير موقَّعة',
  },

  model: {
    /*
      «طوابقُ … عددها» carries the count without making the noun agree with it. Arabic
      number agreement changes the form of «طابق» between three and ten, eleven and
      up, and one and two; the figure arrives at runtime, so a sentence that agreed
      with it would be right for some runs and wrong for others.
    */
    label: (levels: string): string =>
      `مبنى هذه التشغيلة ثلاثيَّ الأبعاد: طوابقُ من المساحة الطابقية عددها ${levels}، ` +
      'داخل الغلاف البنائي الذي تسمح به القواعد. والأرقام بجانبه تقول الشيء نفسه بالكلمات.',
    none:
      'حُسبت هذه التشغيلة قبل أن يبني المحرّك نموذجًا للمبنى كلّه، فليس هناك ما يُقام ' +
      'مجسَّمًا. احسب القطعة من جديد لتراه.',
    placed:
      'كما رصّ المحرّك طوابقه · الطوابق المُصمَتة هي الإجابة، والخطوط الخارجية ارتفاعٌ ' +
      'تتركه الإجابة غير مستخدَم · ',
    stored:
      'كما رصّ المحرّك طوابقه · حُفظت قبل أن يُسجّل النموذج الطوابق التي تضعها الإجابة، ' +
      'فكل طابق يسمح به الارتفاع مرسومٌ مُصمَتًا · ',
    /* The masthead's own words for the permanent refusal: «الصلاحية التنظيمية — لم
       تُقيَّم». «لم يُقيَّم» is the absence of an act, never «غير صالح». */
    tail: 'يُعلِّم الكهرمانيُّ ما افترضه المحرّك حيث لا تحسم قاعدة · الصلاحية التنظيمية — لم تُقيَّم',
  },

  siblings: {
    title: 'تشغيلات أخرى لهذه القطعة',
    note:
      'كلٌّ منها تشغيلة قائمة بذاتها، بمدخلاتها وافتراضاتها. اقرأها جنبًا إلى جنب؛ ' +
      'لا شيء هنا يُحسَب بينها.',
    caption: (plot: string): string => `تشغيلات أخرى للقطعة ${plot}`,
    empty: 'هذه هي التشغيلة الوحيدة لهذه القطعة في قائمتك.',
  },

  /*
    «يُقرّ بالافتراضات» for acknowledge: an acknowledgement is a statement that one
    has read, not an approval, and «يعتمد» would say the author approved them.
    «يوقّع» is kept for G4 alone, because that is the gate a name is put to.
  */
  review: {
    title: 'المراجعة والملفات',
    note:
      'لا يخرج شيء من النظام قبل أن تُوقَّع بوّابتان على هذه التشغيلة كما حُسبت. ' +
      'ويفحص الخادم الاثنتين من جديد مع كل ملف يُسلِّمه.',
    assumptions: 'الإقرار بالافتراضات',
    assumptionsWhere:
      'يُقرّ بها المُنشئ في سجلّ الافتراضات داخل المحرّك، حيث يُدرَج كل افتراض. ' +
      'ولا يُعطى الإقرار هنا، لأن هذه الصفحة لا تُدرجها.',
    signed: 'توقيع المراجعة',
    by: 'وقّعها ',
    at: ' · ',
    unsigned: 'لم تُوقَّع بعد.',
    signBefore: 'وقِّع بوّابة المراجعة (',
    signAfter: ')',
    signing: 'جارٍ التوقيع…',
    signNote:
      'يُسجِّل التوقيع اسمك ورقم الرخصة المحفوظ في حسابك بجانب هذه التشغيلة. ' +
      'لا يفحص أحدٌ الرخصة، ولا شيء يمنع المُنشئ من توقيع تشغيلته بنفسه.',
    noLicence:
      'يحتاج التوقيع إلى رقم رخصة في الحساب، وهذا الحساب أُنشئ من دونه. ' +
      'ويُعطى الرقم عند إنشاء الحساب.',
    readerOnly:
      'يمكنك أن تفتح هذه التشغيلة وتنزّل ملفاتها متى وُقّعت البوّابتان. أمّا التوقيع ' +
      'فللمُنشئ، أو لحسابٍ شورِكت معه ليراجعها.',
    refusedBefore: 'لم تُوقَّع المراجعة. قال الخادم: ',
    session: 'انتهت جلستك. سجِّل الدخول من جديد، ثم وقِّع المراجعة.',
  },

  files: {
    title: 'الملفات',
    locked: 'تُفتح الملفات متى وُقّعت البوّابتان.',
    html: 'افتح التقرير',
    sheets: 'افتح مجموعة الرسومات',
    newTab: 'يُفتح في علامة تبويب جديدة.',
    print: 'احفظ بصيغة PDF',
    pdfNote:
      'التقرير ومجموعة الرسومات مستندان مُعدّان للطباعة أصلاً: ملف PDF هو حفظ متصفّحك لهما، ' +
      'بمقاس الورق الموجود داخل المستند.',
    json: 'نزِّل بيانات التقرير (JSON)',
    dxf: 'نزِّل المبنى لبرامج CAD (DXF)',
    glb: 'نزِّل النموذج ثلاثي الأبعاد (glTF)',
    xlsx: 'نزِّل المصنَّف (XLSX)',
    preparing: 'جارٍ الإعداد…',
    refusedBefore: 'لم يُسلَّم الملف. قال الخادم: ',
  },

  share: {
    title: 'شارِك هذه التشغيلة',
    asBefore: 'يمكنك أن تفتح هذه التشغيلة بصفتك ',
    asAfter: ' لها. ولا يشاركها إلا الحساب الذي حسبها.',
  },

  roles: {
    author: 'مُنشئًا',
    reviewer: 'مراجِعًا',
    reader: 'قارئًا',
  },

  form: {
    noteBefore: 'امنح حسابًا آخر حقّ الوصول إلى هذه التشغيلة. يجوز للمراجِع أن يوقّع بوّابة المراجعة (',
    noteAfter: ')، ولا يجوز للقارئ إلا أن يفتحها. لا يُتحقَّق من رخصة أحد.',
    email: 'عنوان البريد الإلكتروني للحساب الآخر',
    emailHelp:
      'العنوان الذي أنشأ به حسابه. اطلب منه أن يُنشئ حسابًا أولًا: فالمشاركة مع عنوانٍ لا ' +
      'يستخدمه حساب لا تفعل شيئًا، ولن تقول هذه الصفحة ذلك.',
    legend: 'ما يجوز له',
    review: {
      title: 'أن يراجعها',
      detailBefore: 'يفتح التشغيلة ويوقّع بوّابة المراجعة، ',
      detailAfter: '.',
    },
    read: {
      title: 'أن يقرأها',
      detail: 'يفتح التشغيلة، ولا شيء غير ذلك.',
    },
    problem: {
      email: 'أدخِل عنوان البريد الإلكتروني للحساب الذي تشارك التشغيلة معه.',
      role: 'اختر ما يجوز له أن يفعله بالتشغيلة: أن يراجعها، أو أن يقرأها فقط.',
      session: 'انتهت جلستك. سجِّل الدخول من جديد، ثم شارِك التشغيلة.',
      failed: 'تعذّرت مشاركة التشغيلة. حاول مجدّدًا بعد لحظة.',
    },
    sending: 'جارٍ المشاركة…',
    submit: 'شارِك التشغيلة',
    done: {
      before: 'إن كان حسابٌ يستخدم العنوان ',
      middle: '، فبوسعه الآن أن يفتح هذه التشغيلة بصفته ',
      after:
        '. لا تقول هذه الصفحة ما إذا كان حسابٌ يستخدمه، فلا يمكن استخدامها لمعرفة من ' +
        'يملك حسابًا.',
    },
  },
};
