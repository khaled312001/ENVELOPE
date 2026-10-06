/**
 * العربية — صفحة الدراسة الواحدة، `/work?run=…`.
 *
 * Held to `RunPageDictionary` by the type system, so this file cannot be missing a
 * key. Every term is checked against `docs/05-design/arabic-glossary.md`; the
 * comments here record only what would otherwise read as a mistranslation.
 *
 * ---------------------------------------------------------------------------
 * THE FOUR REFUSALS, AND HOW THE ARABIC HOLDS EACH.
 *
 * 1. «لا شيء هنا يحسب بينها» — nothing is computed between two runs of one plot.
 *    A flat present-tense denial; no «فرق», no «أفضل», no «تحسن» anywhere below.
 *
 * 2. ONE SENTENCE FOR MISSING AND NOT-SHARED: «فإما أنها غير موجودة، وإما أنها لم
 *    تشارك معك». «إما … وإما» keeps both possibilities open with equal weight,
 *    which is the point — the page does not know which, and must not guess.
 *
 * 3. THE SHARE CONFIRMATION IS CONDITIONAL AND STAYS CONDITIONAL. «إن كان حساب
 *    يستخدم العنوان» opens it, and «لا تقول هذه الصفحة ما إذا كان حساب يستخدمه»
 *    closes it. Nothing between the two may read as "the account was found".
 *
 * 4. «لا يتحقق من رخصة أحد» — nobody's licence is checked. «الرخصة» and never
 *    «الترخيص», which is TRAKHEES (see `antechamber.ar.ts`).
 *
 * «ما إذا» and not «هل» after a negated verb of reporting — the careful MSA form,
 * and the register of a refusal is part of it.
 *
 * ---------------------------------------------------------------------------
 * THE ROLES ARE ACCUSATIVE — «مراجعا»، «قارئا» — because both sentences that use
 * them put the role after «بصفتك» or «بصفته» («in the capacity of»), which takes a
 * حال. The chip on the list is a nominative noun and lives in `work.ar.ts`.
 *
 * NO DIGIT BELOW. The level count reaches `model.label` as an argument, and the
 * gate id `G4` is the component's, set `Verbatim` between `noteBefore` and
 * `noteAfter`.
 */

import type { RunPageDictionary } from './runPage.en.js';

export const AR: RunPageDictionary = {
  back: 'أعمالك',

  plot: 'قطعة الأرض ',
  aRun: 'دراسة',

  lede: {
    computedAt: ' · زمن الحساب ',
    computedEarlier: ' · حسبت في وقت سابق',
    /* «وأنشأها» — the account that computed the run is its author, and the
       glossary's verb for making a run is «أنشأ». */
    by: '، وأنشأها ',
    kept: '. تحفظ كما حسبت تماما، ولا يعاد على هذه الصفحة حساب شيء.',
  },

  draftChip: 'قواعد مسودة',
  draftNote: ' حسبت على قواعد لم يعتمدها أي مهني محدد بالاسم.',

  error: {
    missing: 'هذه الدراسة ليست في قائمتك. فإما أنها غير موجودة، وإما أنها لم تشارك معك.',
    failed: 'تعذر تحميل الدراسة. أعد تحميل الصفحة لتحاول مجددا.',
  },
  loading: 'جاري تحميل الدراسة…',

  answer: {
    title: 'الإجابة',
    governing: 'السعة الحاكمة',
    binds: 'القيد الملزم',
    levels: 'الأدوار التي تضعها الإجابة',
    levelsOf: ' من ',
    heightPermits: ' يسمح بها الارتفاع',
    /* «مفترضة» — assumed. Never «افتراضية», which is "default". */
    assumed: 'القيم المفترضة',
    gates: 'بوابات التصدير الموقعة',
    gatesOf: ' من ',
    signedBy: ' · وقعها ',
    notSigned: ' · غير موقعة',
  },

  model: {
    /*
      «أدوار … عددها» carries the count without making the noun agree with it.
      Arabic number agreement changes the form of «دور» between three and ten,
      eleven and up, and one and two; the figure arrives at runtime, so a sentence
      that agreed with it would be right for some runs and wrong for others.
    */
    label: (levels: string): string =>
      `مبنى هذه الدراسة بأبعاده الثلاثة: أدوار من المساحة الطابقية عددها ${levels}، ` +
      'داخل الغلاف البنائي الذي تسمح به القواعد. والأرقام بجانبه تقول الشيء نفسه بالكلمات.',
    none:
      'حسبت هذه الدراسة قبل أن يبني المحرك نموذجا للمبنى كله، فليس هناك ما يقام مجسما. ' +
      'أعد حساب القطعة لتراه.',
    placed:
      'كما رتب المحرك أدواره · الأدوار المصمتة هي الإجابة، والخطوط الخارجية ارتفاع تتركه ' +
      'الإجابة دون استخدام · ',
    stored:
      'كما رتب المحرك أدواره · حفظت قبل أن يسجل النموذج الأدوار التي تضعها الإجابة، فكل ' +
      'دور يسمح به الارتفاع مرسوم مصمتا · ',
    /* The masthead's own words for the permanent refusal: «الصلاحية التنظيمية — لم
       تخضع للتقييم». It states the absence of an act, never «غير صالح». */
    tail: 'اللون الكهرماني يشير إلى ما افترضه المحرك حيث لا تحسم قاعدة · الصلاحية التنظيمية — لم تخضع للتقييم',
  },

  siblings: {
    title: 'دراسات أخرى لهذه القطعة',
    note:
      // «لا شيء هنا يحسب بينها» stays on ONE source line: `work.test.tsx` asserts it
      // over the module text, and a string break inside the phrase hides it.
      'كل منها دراسة قائمة بذاتها، بمدخلاتها وافتراضاتها. اقرأها جنبا إلى جنب؛ ' +
      'ولا شيء هنا يحسب بينها.',
    caption: (plot: string): string => `دراسات أخرى للقطعة ${plot}`,
    empty: 'هذه هي الدراسة الوحيدة لهذه القطعة في قائمتك.',
  },

  /*
    «الاطلاع على الافتراضات» for acknowledge: an acknowledgement is a statement
    that one has read, not an approval, and «يعتمد» would say the author approved
    them. «يوقع» is kept for G4 alone, because that is the gate a name is put to.
  */
  review: {
    title: 'المراجعة والملفات',
    note:
      'لا يخرج شيء من النظام قبل أن توقع بوابتان على هذه الدراسة كما حسبت. ويفحص الخادم ' +
      'الاثنتين من جديد مع كل ملف يسلمه.',
    assumptions: 'الاطلاع على الافتراضات',
    assumptionsWhere:
      'يقر المنشئ بالاطلاع عليها في سجل الافتراضات داخل المحرك، حيث يدرج كل افتراض. ' +
      'ولا يعطى الإقرار هنا، لأن هذه الصفحة لا تدرجها.',
    signed: 'توقيع المراجعة',
    by: 'وقعها ',
    at: ' · ',
    unsigned: 'لم توقع بعد.',
    signBefore: 'وقع بوابة المراجعة (',
    signAfter: ')',
    signing: 'جاري التوقيع…',
    signNote:
      'يسجل التوقيع اسمك ورقم الرخصة المحفوظ في حسابك بجانب هذه الدراسة. ولا يفحص أحد ' +
      'الرخصة، ولا شيء يمنع المنشئ من توقيع دراسته بنفسه.',
    noLicence:
      'يحتاج التوقيع إلى رقم رخصة في الحساب، وهذا الحساب أنشئ من دونه. ويعطى الرقم عند ' +
      'إنشاء الحساب.',
    readerOnly:
      'يمكنك أن تفتح هذه الدراسة وتنزل ملفاتها متى وقعت البوابتان. أما التوقيع فللمنشئ، ' +
      'أو لحساب شورك معه ليراجعها.',
    refusedBefore: 'لم توقع المراجعة. قال الخادم: ',
    session: 'انتهت جلستك. ادخل إلى حسابك من جديد، ثم وقع المراجعة.',
  },

  files: {
    title: 'الملفات',
    viewModel: 'شاهد المجسم ثلاثي الأبعاد',
    viewDrawings: 'شاهد الرسومات',
    locked: 'تفتح الملفات متى وقعت البوابتان.',
    html: 'افتح التقرير',
    sheets: 'افتح مجموعة الرسومات',
    newTab: 'يفتح في علامة تبويب جديدة.',
    print: 'احفظ بصيغة PDF',
    pdfNote:
      'التقرير ومجموعة الرسومات مستندان معدان للطباعة أصلا: وملف PDF هو حفظ متصفحك لهما، ' +
      'بمقاس الورق الموجود داخل المستند.',
    json: 'نزل بيانات التقرير (JSON)',
    dxf: 'نزل المبنى لبرامج CAD (DXF)',
    glb: 'نزل النموذج ثلاثي الأبعاد (glTF)',
    xlsx: 'نزل المصنف (XLSX)',
    preparing: 'جاري الإعداد…',
    refusedBefore: 'لم يسلم الملف. قال الخادم: ',
  },

  share: {
    title: 'شارك هذه الدراسة',
    asBefore: 'يمكنك أن تفتح هذه الدراسة بصفتك ',
    asAfter: ' لها. ولا يشاركها إلا الحساب الذي حسبها.',
  },

  roles: {
    author: 'منشئا',
    reviewer: 'مراجعا',
    reader: 'قارئا',
  },

  form: {
    noteBefore: 'امنح حسابا آخر حق الوصول إلى هذه الدراسة. يجوز للمراجع أن يوقع بوابة المراجعة (',
    noteAfter: ')، ولا يجوز للقارئ إلا أن يفتحها. ولا يتحقق من رخصة أحد.',
    email: 'عنوان البريد الإلكتروني للحساب الآخر',
    emailHelp:
      'العنوان الذي أنشأ به حسابه. اطلب منه أن ينشئ حسابا أولا: فالمشاركة مع عنوان لا ' +
      'يستخدمه حساب لا تفعل شيئا، ولن تقول هذه الصفحة ذلك.',
    legend: 'ما يجوز له',
    review: {
      title: 'أن يراجعها',
      detailBefore: 'يفتح الدراسة ويوقع بوابة المراجعة، ',
      detailAfter: '.',
    },
    read: {
      title: 'أن يقرأها',
      detail: 'يفتح الدراسة، ولا شيء غير ذلك.',
    },
    problem: {
      email: 'أدخل عنوان البريد الإلكتروني للحساب الذي تشارك الدراسة معه.',
      role: 'اختر ما يجوز له أن يفعله بالدراسة: أن يراجعها، أو أن يقرأها فقط.',
      session: 'انتهت جلستك. ادخل إلى حسابك من جديد، ثم شارك الدراسة.',
      failed: 'تعذرت مشاركة الدراسة. حاول مجددا بعد لحظة.',
    },
    sending: 'جاري المشاركة…',
    submit: 'شارك الدراسة',
    done: {
      before: 'إن كان حساب يستخدم العنوان ',
      middle: '، فبوسعه الآن أن يفتح هذه الدراسة بصفته ',
      after:
        '. ولا تقول هذه الصفحة ما إذا كان حساب يستخدمه، فلا يمكن استخدامها لمعرفة من ' +
        'يملك حسابا.',
    },
  },
};
