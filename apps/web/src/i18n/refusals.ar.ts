/**
 * العربية — صفحة `/refusals`، ما يرفضه.
 *
 * Held to `RefusalsDictionary` by the type system, so this file cannot be missing a
 * key and cannot grow one the English does not have. Every choice below is argued
 * in `docs/05-design/arabic-glossary.md`; the comments here record only what would
 * otherwise read as a mistranslation, or as a clause dropped.
 *
 * ---------------------------------------------------------------------------
 * THIS IS THE PAGE A READER FORWARDS TO A LAWYER, SO THE REGISTER IS THE REFUSAL.
 *
 * 1. VERBAL SENTENCES, PRESENT TENSE, NO CUSHION. «يرفض»، «لا يتحقق»، «لا يقيد».
 *    Arabic marketing register warms and elaborates; doing that here would soften
 *    every refusal by tone while translating each one correctly word for word. The
 *    English is short, so the Arabic is short.
 *
 * 2. NO HEDGE. Not one «قد» before a present verb, not one «ربما», not one «عادة».
 *    A hedge inside a refusal is a claim. Where the English is hypothetical — "an
 *    optimiser … would be answering", "a standard that bound the envelope would be
 *    reporting" — the Arabic says so with «لو … لـ», which is a condition and not a
 *    hedge.
 *
 * 3. NO «نحن». The English says "we" twice (§10 and the comparison row); the
 *    glossary puts the product in the third person, so those sentences are passive
 *    or name the engine. That also rules out «من نحن» for an about page, which is
 *    why the row says «صفحة تعريف».
 *
 * 4. «مطابقة» APPEARS ONCE, NEGATED: «لا تأكيد للمطابقة», the first permanent item
 *    in §12. The English labels those three items with nouns ("The compliance
 *    claim.") under the heading "Permanent by design"; the Arabic states what is
 *    permanent — no compliance claim, no realism band, no optimiser class — because
 *    the noun alone would put the claim on the page as a heading, and the glossary
 *    allows the word only as a denial.
 *
 * 5. «افتراضي» IS "DEFAULT", AND APPEARS ONLY TO DENY ONE: «لا قيمة افتراضية» in
 *    §05. The realism plate's "No discount, which is the default" is «وهذا هو
 *    الأصل» — the legal register's word for the position that holds until someone
 *    moves it — because a bare «افتراضي» there would be the one sentence on the page
 *    that says the product has a default, which is what CLAUDE.md forbids having.
 *
 * 6. NO DIACRITICS, ANYWHERE. §5 of the glossary. Where a word could not be read
 *    bare — «يُدَّعى», «يُفرَض», «مُخرَج», «مُسمّى» — the WORD was changed, not its
 *    vowelling: «يؤكد», «موضع الفرض», «الناتج», «محدد بالاسم». A page that has to be
 *    vowelled to be read is a page written in the wrong words.
 *
 * ---------------------------------------------------------------------------
 * THE TRADE TERMS, NOT THE DICTIONARY ONES, and the same ones `dashboard.ar.ts`
 * uses: «الدراسة» for a run, «الناتج» for an export, «بوابة» for a gate, «فحص
 * الحفظ» for an invariant, «الوثيقة النظامية» for an instrument, «الإشارة إلى
 * البند» for a clause reference, «المعطى» for a parameter, «ارتداد»، «البوديوم»،
 * «البرج»، «معامل البناء». The affection plan is glossed once, on its only use.
 *
 * DIGITS: none. The status codes, the type names and the realism discount reach
 * the page from the component; the counts the English spells out ("Four gates",
 * "read zero") are spelled out here too.
 */

import { createElement, Fragment, type ReactNode } from 'react';

import type { RefusalsDictionary } from './refusals.en.js';

/** A paragraph assembled around the identifiers it quotes, in Arabic word order. */
const join = (...parts: ReactNode[]): ReactNode => createElement(Fragment, null, ...parts);

export const AR: RefusalsDictionary = {
  hero: {
    title: 'ما يرفضه',
    lede:
      'كل رفض هنا فعل يؤديه البرنامج، لا شيء ينقصه. وإن كنت تبحث عن الادعاء الزائد، ' +
      'فابدأ من هذه الصفحة.',
    /*
      «يأبى نظام الأنواع إنشاءه»: a class the type system WILL NOT construct is a
      refusal, not an incapacity, so the verb is one of refusal.
    */
    note:
      'كل بند أدناه رمز حالة تعيده واجهة البرمجة (API)، أو صنف يأبى نظام الأنواع ' +
      'إنشاءه، أو صفحة يمتنع هذا الموقع عن طباعتها. وحيث يكون الشيء غائبا حقا لا ' +
      'مرفوضا، فهو في القسم قبل الأخير، إلى جانب اسم من يسده.',
  },

  contract: {
    title: 'عقد الرفض',
    lede:
      'قبل أي شرح: ما تفعله واجهة البرمجة أثناء التشغيل، والملف الذي يفعله. هذه ليست ' +
      'سياسات مكتوبة في مكان ما. إنها الاستجابات نفسها.',
    regionLabel: 'ما ترفضه واجهة البرمجة أثناء التشغيل',
    caption:
      'ثلاثة طلبات ترفضها واجهة البرمجة، والاستجابة التي يتلقاها كل منها، والملف الذي ' +
      'يفرضها.',
    columns: {
      asked: 'ما يطلب',
      response: 'ما يعود',
      enforced: 'موضع الفرض',
    },
    cells: {
      asked: 'المطلوب',
      response: 'الاستجابة',
      enforced: 'موضع الفرض',
    },
    undeclared: 'دراسة لم تعلن فيها معالجة احتساب المواقف ضمن معامل البناء',
    /* Arabic comma: it follows the status code, which the component isolates. */
    noGuess: '، ولا تخمين',
    exportGate: 'تصدير قبل استيفاء بوابة الافتراضات أو بوابة المراجعة',
    failsCheck: 'دراسة تخفق في فحص حفظ أو في قيد صارم',
    neverStored: '، ولا تحفظ الدراسة إطلاقا',
    /*
      «لا تصير ناتجا أصلا»: the English repeats the verb to deny the artefact
      outright — "does not become a stored artefact…; it does not become an
      artefact" — and the Arabic repeats it for the same reason. Collapsing the two
      clauses into one would keep the meaning and lose the refusal.
    */
    thirdRow:
      'الصف الثالث هو الذي يسهل تليينه، ولم يلين. الدراسة التي تخفق في فحص لا تصير ' +
      'ناتجا محفوظا مع تحفظ ملحق به؛ لا تصير ناتجا أصلا. تجري الفحوصات قبل أن يكتب أي ' +
      'شيء، ولا مستوى للتحذير، ولا درجة خطورة قابلة للضبط، ولا مفتاح للتجاوز — وإضافة ' +
      'أي منها عيب لا ميزة.',
    gatesTitle: 'أين تقف كل بوابة',
    /*
      THE TWO EXPORT GATES ARE NAMED, AND NO OTHERS. «سجل الافتراضات والمراجع المحدد
      بالاسم» is the whole of `EXPORT_GATES`; the other two are said to stand
      elsewhere, and the last sentence denies the chain in the same words the
      English uses to deny it — «بالاستنتاج لا بالقراءة».
    */
    gatesBody: (gate: ReactNode, conflict: ReactNode): ReactNode =>
      join(
        'توجد أربع بوابات. وكتابة هذا العدد مأمونة لأن النوع ',
        gate,
        ' له أربعة أعضاء، وإضافة عضو خامس حدث في زمن الترجمة البرمجية لا تعديل في ' +
          'النص. اثنتان منها تقفان أمام التصدير — سجل الافتراضات، والمراجع المحدد ' +
          'بالاسم — والتصدير الذي يطلب قبل الإقرار بأي منهما يجاب بالرمز ',
        conflict,
        '، وكذلك التصدير الذي أعطي إقراره على محتوى مختلف فسقط. والاثنتان الأخريان ' +
          'تسميان خطوتين سابقتين، هما تحديد القواعد وحساب السعة، وهناك يسجلهما الملف؛ ' +
          'وباب التصدير ليس موضعهما. ولا سلسلة في الشيفرة المصدرية تجعل بوابة تنتظر ' +
          'أخرى، فالصفحة التي تقول لك إن التصدير ينتظر البوابات الأربع كلها تصف ضابطا ' +
          'بالاستنتاج لا بالقراءة.',
      ),
  },

  draw: {
    model:
      'العرض ثلاثي الأبعاد هو نموذج المحرك نفسه للمبنى — كل دور عند منسوبه، وكل سيارة ' +
      'في موقفها، والمنحدر بين الدورين اللذين يصل بينهما — وكل عنصر فيه ملون بصنف مصدر ' +
      'الاشتقاق للقيمة التي يمثلها، لا بلوحة ألوان اختارتها أداة الرسم. والمبنى الذي ' +
      'يجمع في العارض سيكون مبنى لم يحسبه أحد، مرسوما رسما مقنعا، على أكثر سطح في ' +
      'المنتج إقناعا — ولذلك يبنى في المحرك، وتأتي الصورة تالية للحساب.',
    notDrawnTitle: 'ما لا يرسمه النموذج',
    /*
      «بنصه» — "in its own words". The list that follows is the model file's
      metadata, rendered verbatim and therefore in English. One word tells the
      Arabic reader why the language changes under the colon, which is a thing the
      English reader never needs told.
    */
    notDrawnLede:
      'العرض الخالي من النوى يقرأ مبنى بلا نوى ما لم يقل السبب. لذلك يحفظ المحرك ' +
      'القائمة مع النموذج، وتنتقل القائمة معه: تحت الصورة على الشاشة، وفي البيانات ' +
      'الوصفية لملف النموذج نفسه. وعن المثال المحلول على الصفحة الرئيسية، يقول الملف ' +
      'بنصه:',
    neighbours:
      'الواجهات والمباني المجاورة هما الأمران اللذان يدعو العرض ثلاثي الأبعاد القارئ ' +
      'إلى افتراضهما أكثر من سواهما. ولا شيء منهما في الدراسة، فلا يرسم أي منهما — لا ' +
      'كتلة نائبة ولا إكساء. أما ما تسمح به القواعد وتتركه الإجابة دون استغلال فيرسم، ' +
      'بخطه الخارجي، لأن هذا بالذات حسبه المحرك.',
    /*
      «مفترضا», never «افتراضيا»: the podium count is ASSUMED, and the second word
      would call it a default. «كهرماني» is the colour; the page paints nothing in
      it, and the sentence only reports what the massing does.
    */
    podium:
      'موضع انتهاء البوديوم وبداية البرج لا يشتق من دراسة. ينص عليه مخطط أفكشن ' +
      '(Affection Plan). ولذلك تحمل الدراسة التي لم يعط لها عدد أدوار البوديوم عددا ' +
      'مفترضا: فهو كهرماني، ومدرج في سجل الافتراضات، ويقال بالكلمات كما يقال باللون، ' +
      'لأن القارئ الذي لا يرى اللون يجب أن تخبره الجملة بالشيء نفسه.',
  },

  lifeSafety: {
    /*
      NOT THE SHARED LEDE'S WORDS. The paragraph above this one ends «الفحص الغائب
      يقرأ فحصا ناجحا», and the English varies its own restatement ("absent", then
      "missing") rather than printing one sentence twice in a row. So does the
      Arabic: «المفقود» and «اجتاز».
    */
    omission:
      'يقرأ الفحص المفقود على أنه فحص اجتاز. وهذا هو السبب كله في أن القيود المؤجلة ' +
      'تسمى في كل ناتج بلا استثناء بدل أن تسقط منه — فالقارئ يستطيع أن يجادل في قائمة، ' +
      'ولا يستطيع أن يجادل في إغفال.',
    emptyTitle: 'القائمة المؤجلة ليست في هذا الإصدار.',
    emptyBody:
      'يقرأ هذا القسم القيود المؤجلة من لقطة جاهزية مولدة، واللقطة التي يحملها هذا ' +
      'الإصدار لا تسمي أيا منها. وليس هذا قولا بأنه لا شيء مؤجل، ولذلك لا يدرج شيء بدل ' +
      'أن يعرض جدول فارغ. وإعادة توليد اللقطة من دراسة حقيقية تعيدها.',
    regionLabel: 'القيود التي يؤجلها هذا المحرك',
    caption:
      'القيود التي يؤجلها هذا المحرك، والمعطى الذي يحكمه كل منها، وحالة الاستشهاد الذي ' +
      'يستند إليه.',
    columns: {
      rule: 'القاعدة',
      parameter: 'المعطى',
      clause: 'الإشارة إلى البند',
    },
    /*
      «مسودة · بلا مرجع», the words `dashboard.ar.ts` puts on the same records, so
      one record carries one chip on both pages. «الاستشهاد مسجل» — recorded, not
      «موثق», which a reader takes for verified: the chip reports that the record
      names a real instrument, and nothing about whether anyone checked it.
    */
    chips: {
      lifeSafety: 'سلامة الأرواح',
      sourced: 'الاستشهاد مسجل',
      notSourced: 'مسودة · بلا مرجع',
    },
    chipNote:
      'الشارة إلى جانب كل معرف تبلغ بحالة الاستشهاد في ذلك السجل نفسه، لا أكثر. كل ' +
      'قاعدة أولية في هذا النشر تسمي وثيقة نظامية نائبة ونص بند موسوما بأنه بلا مرجع، ' +
      'فكل شارة تقول ذلك — وتقوله لأن السجل يقوله، لا لأن هذه الصفحة كتبت حين كان ذلك ' +
      'صحيحا. الإشارة إلى البند على صفحة كهذه وعد؛ والشارة هي ما يبقي الوعد صادقا إلى ' +
      'أن يقرأ مهندس معماري مرخص الوثيقة النظامية ويضع اسمه على القاعدة.',
  },

  realistic: {
    /*
      «مخطط البيانات» for the schema, not «المخطط» alone: on a page that also names
      the affection plan, a bare «المخطط» is a drawing.
    */
    schema:
      'لا نطاق واقعي، ولا نطاق متوقع، ولا نطاق مرجح. والحقل غير موجود في مخطط ' +
      'البيانات، فلا يمكن ضبطه، ولا تفعيله لعميل، ولا إضافته في نشر — فالغياب بنيوي، لا ' +
      'إعداد تركه أحد معطلا. وأي رقم يوضع هناك سيصل بلا اشتقاق، في منتج يحمل كل رقم آخر ' +
      'فيه اشتقاقه، ولا شيء في المحرك يستطيع أن يمنحه اشتقاقا.',
    discountLabel: 'خصم الواقعية على الدراسة التي ينشرها هذا الموقع:',
    discountNote: (userSet: ReactNode): ReactNode =>
      join(
        'لا خصم، وهذا هو الأصل. وصنفه ',
        userSet,
        ' لا مفترضا: يبقى قائما حتى يغيره شخص محدد بالاسم، ومن يغيره يسجل إلى جانب ' +
          'الرقم الذي اختاره. وهذا هو البديل الصادق عن نطاق الواقعية — خصم يوقع عليه ' +
          'شخص، لا خصم يطبقه المحرك نيابة عنه ويسميه قابلا للتحقيق.',
      ),
  },

  parking: {
    noDefault: (derived: ReactNode, userSet: ReactNode): ReactNode =>
      join(
        'لا قيمة افتراضية، ولم تكن هناك واحدة لتزال. فالمعالجة إما ',
        derived,
        ' من قاعدة مستشهد بها، وإما ',
        userSet,
        ' من شخص محدد بالاسم؛ ومن دون أي منهما يرفض المحرك الدراسة قبل أن يحسب أي نطاق ' +
          'للسعة أصلا. وهذا الرفض هو الصف الأول من العقد أعلاه.',
      ),
    spreadBefore:
      'لا يقتبس هنا أي مدى، وهذا حذف مقصود لا إغفال. المدى المقتبس من وثيقة مواصفات ' +
      'قول عن وثائق؛ أما الفارق بين الإجابتين لقطعة أرض شغلها المحرك فعلا فقياس. ولذلك ' +
      'يطبع هذا الموقع القياس، على ',
    spreadLink: 'صفحة المواقف',
    spreadAfter:
      '، حيث توضع الإجابتان للقطعة نفسها جنبا إلى جنب، ويكون الفارق بينهما ناتجا من ' +
      'المحرك لا جملة.',
  },

  professional: {
    titleAnd: 'ولا يفرض أن يكون المراجع غير من أنشأ الدراسة.',
    doesTitle: 'ما تفعله بوابة المراجعة',
    /*
      «يصرح» — ASSERTS. The licence number is a statement the actor makes and the
      gate records; no verb in this paragraph may suggest the gate checks it.
    */
    doesBody:
      'ترفض الإقرار ما لم يصرح مقدمه برقم رخصة مهنية، وتكتب ذلك الاسم وتلك الرخصة وذلك ' +
      'الختم الزمني على الناتج. لا يغادر النظام شيء بلا توقيع، والتوقيع لشخص لا للنظام: ' +
      'لا يبلغ المحرك إطلاقا بأنه قرر شيئا.',
    doesNotTitle: 'ما لا تفعله',
    /*
      THE STRONGEST ITEM ON THE PAGE. Both denials keep their own verb — «لا تتحقق»
      for the licence, «ولا تقارن» for the signer against the author — because
      folding them into one «لا تفحص» would let a reader believe one of the two
      checks happens. The test for this page grips both sentences in Arabic.
    */
    doesNotBody:
      'لا تتحقق من الرخصة لدى أي جهة — لا يستشار أي سجل رسمي، لأن تكاملا كهذا لم يحدد ' +
      'نطاقه. ولا تقارن الشخص الذي يوقع بالشخص الذي أنشأ الدراسة. الفحص هو أن نص ' +
      'الرخصة غير فارغ، وهو الفحص الوحيد الذي يجريه معالج الطلب.',
    calloutTitle: 'فشخص واحد يستطيع أن ينشئ دراسة ويوقعها.',
    calloutBody:
      'شخص واحد، يحمل رقم رخصة واحدا، يستطيع أن يفعل الأمرين — وسيسجل هذا النشر ' +
      'النتيجة ناتجا اجتاز بوابة المراجعة. البوابة سطر توقيع، وسطر التوقيع يساوي تماما ' +
      'ما يساويه التوقيع.',
    share:
      'درس حصر الدراسة في منشئها وحده، ورفض. فالبوابة موجودة للحالة التي يوقع فيها شخص ' +
      'آخر، وفحص الملكية كان سيرفض تلك الحالة بعينها. وما بني بدلا من ذلك مشاركة: يسمي ' +
      'المنشئ حسابا مراجعا أو قارئا، ولا تفتح الدراسة إلا لتلك الحسابات. المشاركة تسمي ' +
      'من يوقع؛ ولا شيء يتحقق من هوياتهم، ولا شيء يمنع منشئا من أن يوقع دراسته. ولا ' +
      'شركات ولا مشاريع كذلك — فالدراسة تعود إلى حساب واحد. وليس في شيء من ذلك دليل ' +
      'على أن ضابطا آخر حل محل الغائب. الضابط الذي يؤكد ولا يفعل أسوأ من الضابط الغائب، ' +
      'لأن الغائب مرئي، وقول ذلك هنا هو ما يجعل القارئ قادرا على تصديق بقية الصفحة.',
  },

  optimiser: {
    judgement:
      'لو رتبت أداة تحسين التوزيعات، لأجابت عن سؤال في التفضيل بسلطة الحساب، ولكان كل ' +
      'رقم تنتجه رقما لا يستطيع القارئ تتبعه إلى قاعدة — لأنه لا قاعدة. هناك تقدير، ' +
      'والتقدير للمعماري.',
  },

  standards: {
    title: 'لا يستطيع معيار المطور أن يقتطع من غلافك البنائي، مهما كثر ما يحمله',
    lede:
      'موجز المطور تفضيل تجاري. أما اللائحة فتلزم. ونظام الأنواع هو الموضع الذي يفرض ' +
      'فيه هذا الفرق، لأن جملة في وثيقة ليست فرضا.',
    /*
      The Arabic opens on the negated verb — «لا يعد … ولا …» — where the English
      opens on the two type names. The type names are the component's; this carries
      only where they sit.
    */
    mechanism: (standard: ReactNode, brief: ReactNode, record: ReactNode): ReactNode =>
      join(
        'لا يعد ',
        standard,
        ' ولا ',
        brief,
        ' من نوع ',
        record,
        '، وذلك عن قصد. وهذه هي الآلية كلها: السجل من نوع ',
        record,
        ' يحله محلل المعطيات، فيستطيع أن يقيد الغلاف البنائي؛ وهذان لا يحلهما، فلا ' +
          'يقيدان شيئا. ويقدمان من نقطة نهاية خاصة بهما، ولا يدمجان في مجموعة القواعد ' +
          'إطلاقا. ولو قيد معيار الغلاف البنائي، لكان يبلغ عن موجز عميل كأنه حد قانوني ' +
          '— هدف خاص مطبوع بسلطة كود — والشاشة التي تعرض المعايير تقول، فوق أداة ' +
          'الاختيار، إن المعيار ليس لائحة.',
      ),
    confidential:
      'لا يظهر على هذا الموقع أي سقف أو هدف أو مقياس مرجعي أو نسبة من موجز أي مطور، لا ' +
      'بالأرقام ولا بالكلمات، ولا يسمى أي مطور. تنقل تلك الأرقام بدقة، ويحمل كل منها ' +
      'الصفحة والمستطيل المحيط الذي أخذ منه، كي يمكن فحص النقل لا الوثوق به، ولا يوصل ' +
      'إليها إلا عبر التطبيق بعد تسجيل الدخول. والرقم السري إذا أعيدت كتابته جملة يبقى ' +
      'هو الرقم.',
  },

  coverage: {
    title: 'لا يغطي الكود كله',
    lede:
      'ما سجل في المحرك جزء مما ينطبق على مبنى، وهذا الجزء غير محسوب بالأرقام، لأنه لا ' +
      'شيء في هذا الإصدار يستطيع أن يحسبه بأمانة.',
    families:
      'عائلات البنود المسجلة في المحرك هي المواقف، والارتدادات، والأبعاد، والمداخل. أما ' +
      'كود الحريق فلا يقرأ إطلاقا — لا جزئيا، ولا مع الإشارة إلى الثغرات. إنه ليس مدخلا ' +
      'لهذا المحرك، ولذلك تظهر سلامة الأرواح أعلاه قائمة من القيود المؤجلة، لا مجموعة ' +
      'فحوصات مع تحفظ.',
    /*
      «أكواد البناء المصدرية» — the building codes the rules are drawn from. «الأكواد
      المصدرية» alone is source code, and a reader would take the sentence for a
      statement about the software.
    */
    noPageCount:
      'لا يظهر على هذا الموقع أي عدد لصفحات أكواد البناء المصدرية. رقم مجموعة الوثائق ' +
      'يأتي من جرد مولد أو لا يظهر، وهذا الإصدار لا يحمل جردا كهذا — فالبيان الصادق ' +
      'للتغطية هو قائمة العائلات في الجملة أعلاه، ويكمل القارئ بنفسه تقديره لما ينقصها. ' +
      'والنسبة المئوية المكتوبة باليد ستقرأ قياسا، وستكون الرقم الوحيد هنا الذي لا ' +
      'يستطيع أحد تتبعه.',
  },

  files: {
    /* "we" becomes the engine or the passive — see item 3 at the top. */
    behaviour:
      'ما يفعله برنامج آخر بملف يكتبه هذا المحرك هو سلوك ذلك البرنامج، ولا يؤكد عنه ' +
      'شيء. لا يختبر المحرك مقابل أي تطبيق لطرف ثالث، ولا يقال إن ملفا يعمل مع أحدها، ' +
      'ولا يسمى أي منها على هذا الموقع. الصيغة شيء يحاسب عليه هذا المنتج؛ أما سلوك ' +
      'الأداة فشيء يصدره غيره.',
  },

  notOnSite: {
    title: 'ما ليس على هذا الموقع، ولماذا',
    /*
      «بحكم العرف» for "by default": the genre supplies these pages by convention.
      Not «افتراضيا», which is the forbidden word, and not «عادة», which is on the
      glossary's list of hedges.
    */
    lede:
      'لم يستبعد أي من هذه لأسباب ذوقية. فكل منها صفحة يقدمها هذا الصنف من المواقع ' +
      'بحكم العرف، وليس لدى هذا المنتج ما هو صادق ليضعه عليها.',
    regionLabel: 'صفحات وادعاءات لا يحملها هذا الموقع',
    caption: 'الصفحات والادعاءات المعتادة التي لا يحملها هذا الموقع، وسبب كل منها.',
    columns: {
      notHere: 'ليس هنا',
      why: 'لماذا',
    },
    rows: {
      accuracy: {
        what: 'رقم للدقة',
        why:
          'لم تجر دراسة التباين بين المعماريين التي تنتج هذا الرقم، فلا اتفاق مقيسا ' +
          'يبلغ عنه. والتخمين التقريبي سيكون الرقم الوحيد على هذا الموقع الذي لا يستطيع ' +
          'أن يجيب من أين جاء.',
      },
      customers: {
        what: 'عدد العملاء أو جدار شعارات',
        why: 'لا يوجد عملاء.',
      },
      caseStudy: {
        what: 'دراسة حالة',
        why:
          'كل قطعة أرض حقيقية في مجموعة الوثائق ملك لجهة أخرى. والمادة اللازمة لبناء ' +
          'دراسة كهذه سرية، لا غائبة فحسب.',
      },
      comparison: {
        what: 'جدول مقارنة',
        /*
          «لم يجر تقييم», and not «لم يخضع للتقييم»: the second is the glossary's
          fixed rendering of NOT ASSESSED, and spending it on a competitor would
          blur the one term the product reserves for its own output.
        */
        why:
          'لم يجر تقييم لأي منافس. والمادة الوحيدة المحفوظة عن المنافسين في أي مكان ' +
          'تفريغ آلي لمكالمة خاصة، وهو ليس تقييما، ولا يحق لهذا المنتج نشره.',
      },
      price: {
        what: 'سعر',
        why:
          'لا شيء في التعاقد الحالي يصلح للتعميم، والرقم الذي لا يعمم إذا طبع كأنه يعمم ' +
          'فهو العيب نفسه الذي في أي رقم آخر لا يمكن تتبعه.',
      },
      certification: {
        what: 'شارة اعتماد',
        why: 'لا ناتج لهذا المحرك معتمد من أي جهة، ولا اعتماد تصنع له شارة.',
      },
      security: {
        what: 'صفحة أمان أو ثقة',
        why:
          'الشارة قول عن نشر يطلقه من يطبعها. والصفحة التي تبين الوضع الأمني لهذا النشر ' +
          'تكتب حين يحسمه من يحددونه، لا قبل ذلك.',
      },
      uptime: {
        /* «زمن التشغيل» is uptime, as in `chrome.ar.ts`; «الإتاحة» is availability. */
        what: 'صفحة زمن التشغيل',
        why:
          'لا شيء يراقب الإتاحة، فلا شيء يبلغ عنه. وصفحة الجاهزية تعد ما ليس جاهزا، ' +
          'وهذا سؤال آخر، وتسميه كذلك.',
      },
      blog: {
        what: 'مدونة أو نشرة بريدية',
        why:
          'لن تحمل أي منهما شيئا ليس على هذا الموقع أصلا، وجدول النشر وعد عن المستقبل.',
      },
      integrations: {
        what: 'صفحة تكاملات',
        why: 'تنتقل النواتج ملفات، وهذا هو القسم أعلاه. لا شيء يدرج.',
      },
      team: {
        what: 'صفحة فريق أو صفحة تعريف',
        why: 'لا كيان قانوني يوصف.',
      },
      terms: {
        what: 'الشروط أو سياسة الخصوصية',
        why:
          'لا كيان قانوني، وصياغة وثيقة قانونية داخليا ليست مهمة تصميم. يكتبها محام، ' +
          'لكيان، ولا وجود لأي منهما.',
      },
    },
    ruleTitle: 'القاعدة التي أنتجت القائمة',
    ruleBody:
      'لا رقم على هذا الموقع يكتبه إنسان بيده. كل رقم على كل صفحة عامة يقرأ من ملف ' +
      'بيانات يكتبه نص برمجي من دراسة حقيقية، وخطوة في بناء الإصدار تعيد تشغيل المحرك ' +
      'وتقارن النتيجة — فالرقم الذي ينحرف يخفق عند بوابة بدل أن يستقر على صفحة. ' +
      'والصفحة التي لا تستطيع أن تستشهد برقم لا تطبعه، ولهذا لا يحمل هذا القسم أي رقم.',
  },

  whoChanges: {
    title: 'أي هذه يمكن أن يتغير، ومن يغيره',
    lede:
      'الفجوة التي لها مسؤول خطة؛ والفجوة التي بلا مسؤول عذر. لذلك يسمي كل بند أدناه ما ' +
      'يسده، وتقول البنود الدائمة صراحة إنه لا شيء يسدها.',
    /* The three labels state what is permanent, as denials — see item 4 at the top. */
    permanent: {
      title: 'دائم بالتصميم',
      compliance: {
        label: 'لا تأكيد للمطابقة.',
        body:
          'الصلاحية التنظيمية لا تخضع للتقييم هنا ولا يؤكدها النظام إطلاقا، في أي درجة ' +
          'من الجاهزية، وفي أي نشر. ليست فجوة؛ إنها هوية المنتج.',
      },
      realism: {
        label: 'لا نطاق للواقعية.',
        body: 'لا سعة واقعية ولا متوقعة ولا مرجحة، ولا حقل في مخطط البيانات يحملها.',
      },
      optimiser: {
        label: 'لا صنف لأداة التحسين.',
        body: (tradeoff: ReactNode): ReactNode =>
          join(
            'تقع القيمة من صنف ',
            tradeoff,
            ' خارج مجموعة الأصناف التي تصدرها هذه المرحلة، ويرمي المنشئ خطأ عند أي قيمة ' +
              'كهذه.',
          ),
      },
    },
    awaiting: {
      title: 'بانتظار شخص محدد بالاسم',
      approval: {
        label: 'اعتماد القواعد.',
        body:
          'يحرر مهندس معماري مرخص في دبي كل قاعدة ويعتمدها أمام الوثيقة النظامية ' +
          'الفعلية. وإلى أن يفعل، يبقى كل استشهاد على كل شاشة نائبا، ويقول ذلك.',
      },
      annex: {
        label: 'توقيع الملحق.',
        body:
          'يراجع ملحق تعريفات المقاييس ويوقع. وذلك التوقيع هو ما يرفع الحجب عن كل حد ' +
          'مساحي في المنتج، والحدود المساحية أكثر حدوده.',
      },
      study: {
        label: 'دراسة مدى الاتفاق.',
        body:
          'يحتاج نطاق التباين إلى معماريين متعاقد معهم، يقيسون قطع الأرض التي قاسها هذا ' +
          'المحرك.',
      },
    },
    outside: {
      title: 'خارج هذه المرحلة من العمل',
      units: {
        label: 'تخطيط الوحدات.',
        body: 'السعة ليست مخططا، وهذه المرحلة تقف عند الغلاف البنائي.',
      },
      coverage: {
        label: 'تغطية أوسع للكود.',
        body:
          'كل عائلة تضاف مجموعة قواعد يحررها ويستشهد لها ويعتمدها المعماري المحدد ' +
          'بالاسم نفسه.',
      },
      dormant: {
        label: 'فحوصات الحفظ الساكنة.',
        body:
          'تقرأ جدول وحدات وجدولا لكل دور لا تولدهما هذه المرحلة. وتوليد أحدهما لإيقاظها ' +
          'تحقق من المحرك أمام ناتجه هو، وهذا ليس تحققا.',
      },
    },
    noDate:
      'لا يظهر أي تاريخ في شيء من ذلك، ولن يظهر. المسؤول خطة؛ والتاريخ وعد، وهذا المنتج ' +
      'لا يقطع وعودا. والجملة التي تسمي الشخص الذي يسد الفجوة لا تحتاج إلى أن تقول متى.',
  },

  unproven: {
    title: 'ما لم تثبته هذه الصفحة',
    lede: 'أن حالات الرفض أعلاه هي المجموعة كاملة.',
    authors:
      'كتب هذه الصفحة من بنوا المحرك، من الملفات التي تفرض كل بند فيها. والرفض الذي لم ' +
      'يخطر لأحد أن يدونه ليس هنا، ولا تستطيع أي بوابة في هذا المستودع أن تجده — ' +
      'فاختبار الحظر يلتقط الجملة التي تقول أكثر مما ينبغي، ويعمى عن الجملة التي لم ' +
      'تكتب قط. فالقائمة كاملة بقدر اكتمال كاتبيها، وهذا بالضبط المعيار الذي يرفض هذا ' +
      'المنتج أن يقبله من أي أحد آخر.',
    readiness:
      'صفحة الجاهزية هي الطريق الأقصر إلى مجادلة هذه الصفحة. فهي تعد ما ليس جاهزا في ' +
      'هذا النشر بدل أن تصفه، وتبدأ بالأرقام التي تساوي صفرا، ولا تحمل درجة مركبة يقف ' +
      'عندها القارئ.',
    cta: 'اطلع على ما ليس جاهزا',
    ctaNote: 'عدد القواعد المعتمدة وعدد التعريفات الموقعة كلاهما صفر في هذا النشر.',
  },
};
