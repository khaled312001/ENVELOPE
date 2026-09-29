/**
 * العربية — الصفحة الرئيسية `/`.
 *
 * Held to `LandingDictionary` by the type system, so this file cannot be missing a
 * key and cannot grow one the English does not have. Every term is checked against
 * `docs/05-design/arabic-glossary.md`; the comments here record only what would
 * otherwise read as a mistranslation, or as a liberty.
 *
 * ---------------------------------------------------------------------------
 * THIS IS THE PAGE A STRANGER READS FIRST, SO IT IS THE ONE WHERE ARABIC MARKETING
 * REGISTER WOULD DO THE MOST DAMAGE.
 *
 * The English is terse and does not apologise. Arabic landing copy is warmer and
 * more elaborated by habit, and a page that drifted into that register would soften
 * every refusal on it by tone while translating each one correctly word for word.
 * So: verbal sentences in the present tense, no «قد» and no «ربما», no «نحن» — the
 * English says "we" in the claim table and the Arabic speaks of the product in the
 * third person throughout, as the glossary's §3 requires — and nothing added to make
 * a sentence friendlier.
 *
 * ---------------------------------------------------------------------------
 * FOUR WORDS THAT DO THE WORK.
 *
 *   «سعة المواقف» for the parking SUPPLY, never «عرض المواقف». «عرض» is also width
 *   and display, and on a page of setbacks and plot dimensions «عرض المواقف» reads
 *   first as the width of the parking — a figure the page does not print.
 *
 *   «يُلزِم» / «المُلزِم» for binds, and «الحاكمة» for the governing capacity. The
 *   glossary keeps them apart and so does this page: the capacity the answer comes
 *   from governs; the limit that produced it binds.
 *
 *   «مُفترَض», vowelled, for assumed. Never «افتراضي», which is "default" — the one
 *   thing this codebase forbids having.
 *
 *   «الكهرماني» for amber, as a colour word. The page names the colour in prose
 *   because the colour is the mechanism; a vaguer word would leave the reader unable
 *   to find what the sentence points at.
 *
 * DIGITS STAY LATIN AND NONE IS WRITTEN HERE. The four functions carry Arabic WORD
 * ORDER around figures the component supplies from the fixture, and the counts are
 * written «5 من 14» rather than «5 طوابق», because Arabic makes a counted noun agree
 * with the number before it and the number is not known to this file. A sentence
 * whose grammar is right for 5 and wrong for 14 is a sentence that goes wrong the day
 * the engine's answer changes.
 */

import type { LandingDictionary } from './landing.en.js';

/**
 * The road hierarchy, named as a Dubai consultant names it. Keyed by the recorded
 * input's token, never by edge, so the drawing still reads each frontage off the
 * plot; a token this table does not know is named by the token itself rather than
 * by a word nobody chose.
 */
const ROAD: Readonly<Record<string, string>> = {
  ARTERIAL: 'طريق شرياني',
  COLLECTOR: 'طريق تجميعي',
  LOCAL: 'طريق محلي',
  ACCESS: 'طريق خدمة',
};

/** Edge classifications that are not roads, by the same rule. */
const EDGE: Readonly<Record<string, string>> = {
  ROAD: 'طريق',
  ADJACENT_PLOT: 'قطعة مجاورة',
  OPEN_SPACE: 'مساحة مفتوحة',
  OTHER: 'حد آخر',
};

/** The land-use tokens the engine knows, by the same rule. */
const LAND_USE: Readonly<Record<string, string>> = {
  RESIDENTIAL_MULTI: 'سكني متعدد الوحدات',
  RESIDENTIAL_SINGLE: 'سكني وحدة واحدة',
  COMMERCIAL: 'تجاري',
  MIXED_USE: 'متعدد الاستخدامات',
  INDUSTRIAL: 'صناعي',
};

export const AR: LandingDictionary = {
  eyebrow: (phase: string): string => `المرحلة ${phase} · عرض توضيحي للمحرك`,

  /*
    «ما تقتضيه هذه القواعد», the verb the chrome's own route description uses for
    the same claim — and never «ما يمكن بناؤه», which is the permission claim the
    English h1 was rewritten to stop making.
  */
  title: 'ما تقتضيه هذه القواعد لقطعة الأرض هذه، واشتقاق كل رقم يقول ذلك.',

  answerLabel: 'السعة الحاكمة في هذه الدراسة',

  bands: {
    word: 'النطاق ',
    a: {
      name: 'ما يسمح به الكود',
      note: 'معامل البناء مطبقا على مساحة قطعة الأرض. وهو النطاق الوحيد الذي تحسبه حاسبة معامل البناء.',
    },
    b: {
      name: 'ما يستوعبه الغلاف البنائي',
      note: 'المسطح الذي تتركه الارتدادات، مع الحد الأقصى لمسطح الدور، مكررا دورا فوق دور حتى حد الارتفاع.',
    },
    c: {
      name: 'ما تخدمه المواقف',
      /*
        «مقسومة على», and nothing about bays that fit. The band is an area divided by
        a factor; the drawn level comes after it and cannot inform it.
      */
      note: 'مساحة متاحة مقسومة على معامل مساحة الموقف، والمعامل مفترض.',
    },
    binds: 'ملزم',
    why: 'لماذا',
    hide: 'إخفاء',
    question: '؟',
  },

  assumed: {
    titleAfter: ' — المساحة التي يستهلكها الموقف الواحد',
    before: 'تحسب سعة المواقف بقسمة المساحة المتاحة على',
    /* «القاسم» is the divisor — the number divided BY — which is what 32 m²/bay is. */
    after: '، وهذا القاسم ليس ثابتا: ',
  },

  validity: {
    /*
      The masthead's own wording, «الصلاحية التنظيمية — لم تُقيَّم», so the refusal
      reads identically in the chrome and under the answer. «لم تُقيَّم» is the
      absence of an act; «غير صالحة» or «غير مطابقة» would be verdicts, and a
      stronger claim than the affirmative one the product refuses to make.
    */
    stamp: 'الصلاحية التنظيمية — لم تخضع للتقييم.',
    /*
      «عناصرُ نائبة» is the settled Arabic for placeholders, as in «تعريف نائب» on
      /readiness. The plural predicate after «كلُّها» is deliberate: the shorter
      «وكل إشارة إلى بند يحملها عنصرٌ نائب» also parses as "a placeholder carries
      it", which inverts who holds what.
    */
    body:
      ' لا توجد في هذا الإصدار قاعدة واحدة معتمدة من مهني محدد بالاسم، والإشارات إلى بنود ' +
      'الكود كلها عناصر نائبة، وليست مراجع موثقة.',
  },

  lede: {
    /*
      THE ONE SENTENCE WHOSE SHAPE CHANGED, AND WHY.

      The English opens on "A compliance checker…" and lets the contrast say that
      this engine is not one. «مطابقة» may appear on this site only negated (§2 of
      the glossary) — a sentence that opens «مدقّق المطابقة يسأل…» puts the word in
      a predicate position on the first screen, and swapping in «الامتثال» to dodge
      the rule would be the rule evaded rather than kept. So the Arabic states the
      negation the English implies, «هذا المحرّك ليس أداةَ فحصِ مطابقة», and then
      carries every clause the English carries: what such a tool asks, that it needs
      a drawing to exist, that this engine reads the clause as an inward offset, and
      that the rule generates the answer instead of testing a drawing.
    */
    before:
      'هذا المحرك ليس أداة فحص مطابقة. أداة الفحص تسأل هل الارتداد يستوفي رقما معينا، ' +
      'وتحتاج إلى رسم جاهز أمامها. أما هذا المحرك فيقرأ البند نفسه على أنه إزاحة إلى ' +
      'الداخل، فالقاعدة ',
    emphasis: 'تنتج',
    after: ' الإجابة بدلا من أن تختبر رسما.',
  },

  cta: {
    run: 'جرب هذه القطعة بنفسك',
    refusals: 'ما يرفضه',
  },

  figure: {
    /* «بأبعاده الثلاثة» says 3D in words; the English "3D" is a name, not a figure. */
    modelLabel: (levels: string, maxLevels: string): string =>
      `مبنى هذه الدراسة بأبعاده الثلاثة: ${levels} من الأدوار السكنية فوق ` +
      `المواقف، داخل الغلاف البنائي الذي تسمح به القواعد حتى ${maxLevels} من الأدوار. ` +
      'والأرقام المجاورة تقول الشيء نفسه بالكلمات.',

    /*
      «بالمتر» and «بالمتر المربّع» name the unit ONCE, before the figures, so no
      noun has to agree with a number this file cannot see.
    */
    planLabel: (p: {
      readonly width: string;
      readonly depth: string;
      readonly setbacks: readonly [string, string, string, string];
      readonly footprint: string;
      readonly plateCap: string;
    }): string =>
      `مسقط قطعة أرض أبعادها بالمتر ${p.width} في ${p.depth}. تترك الارتدادات، وقدرها ` +
      `بالمتر ${p.setbacks[0]} و${p.setbacks[1]} و${p.setbacks[2]} و${p.setbacks[3]}، ` +
      `مسطح بناء مساحته بالمتر المربع ${p.footprint}، ويترك الحد الأقصى لمسطح البرج ` +
      `داخله ${p.plateCap}.`,

    plateCapTag: 'الحد الأقصى لمسطح البرج',

    edge: (classification: string, roadHierarchy: string | undefined): string =>
      roadHierarchy
        ? (ROAD[roadHierarchy] ?? roadHierarchy)
        : (EDGE[classification] ?? classification.replace(/_/g, ' ')),

    number: 'النموذج',
    landUse: (token: string): string => LAND_USE[token] ?? token.replace(/_/g, ' ').toLowerCase(),

    spec: {
      plotArea: 'مساحة القطعة',
      setbacks: 'الارتدادات، لكل حد',
      footprint: 'مسطح البناء بعد الارتداد',
      plateCap: 'الحد الأقصى لمسطح البرج',
      levels: 'الأدوار التي تضعها الإجابة',
      /* «5 من 14 يسمح بها الارتفاع» — no counted noun after either figure. */
      levelsOf: ' من ',
      levelsAfter: ' يسمح بها حد الارتفاع',
    },

    source:
      'هذه الدراسة بمقياس رسم، كما رتب المحرك أدوارها · الأدوار المصمتة هي الإجابة، ' +
      'والخطوط الخارجية ارتفاع تتركه الإجابة دون استخدام · اللون الكهرماني يشير إلى ما افترضه ' +
      'المحرك حيث لا تحسم قاعدة · الصلاحية التنظيمية — لم تخضع للتقييم',
  },

  capacities: {
    title: 'كل سعة تعرض على حدة، ولا يحسب لها متوسط إطلاقا',
    lede:
      'ما يسمح به الكود، وما يستوعبه الغلاف البنائي، وما تخدمه المواقف: ثلاثة أسئلة منفصلة. ' +
      'والاكتفاء بذكر أكبرها هو ما يجعل قطعة أرض تشترى على رقم لم يكن متاحا أصلا.',

    /*
      «يُلزِم نطاقُ PARKING، ويعلو سقفُ نطاق REGULATORY الإجابةَ بمقدار …».
      The tokens are the engine's and are rendered as it emitted them; «نطاق» before
      each is what lets an engine token stand as the subject of an Arabic verb. The
      sentence still names no band — the fixture does.
    */
    verdict: {
      before: 'في هذه الدراسة يلزم نطاق ',
      between: '، ويعلو سقف نطاق ',
      after: ' الإجابة بمقدار ',
      end: '.',
    },
  },

  parking: {
    title: 'كيف يتكون رقم المواقف فعليا',
    proseBefore:
      'النطاق C هو الأصغر بين ما تسمح به المساحة الطابقية وما تستطيع سعة المواقف أن ' +
      'تخدمه. وهذه السعة مساحة متاحة مقسومة على معامل مساحة الموقف، ولا توجد قاعدة ' +
      'موثقة تثبت هذا المعامل — وهو الرقم الكهرماني في أعلى الصفحة. ثم يوزع المحرك ' +
      'الدور إلى مواقف وممرات مناورة ومنحدر داخل حدود البوديوم ',
    proseEmphasis: 'بعد ذلك',
    proseAfter:
      '، فالرسم فحص للمعامل ولا يكون مصدرا له إطلاقا. والفارق بين ما يتيحه الرسم وما ' +
      'توقعه المعامل يعلن، بدلا من أن يبتلع في الحساب.',

    costed: {
      assumed: 'المفترض في نموذج السعة',
      measured: 'المقاس على الدور بعد التوزيع',
      bays: 'المواقف التي يضمها الدور الموزع',
    },
    link: 'السلسلة من المعامل إلى النطاق، والدور مرسوما',
  },

  guarantees: {
    title: 'ما تقوم عليه الإجابة',
    /*
      «نموذجٌ إحصائي», not «نموذج» alone. The English "model" means a statistical
      one — the next words are "a guess with a confidence interval" — and a bare
      «نموذج» on this page already names the 3D building in the figure caption. The
      qualifier restores the meaning the English carries by context.
    */
    lede: 'ليس نموذجا إحصائيا، ولا تخمينا أضيف إليه مجال ثقة بعد ذلك.',

    chain: {
      generate: {
        title: 'قواعد تنتج الإجابة، لا قواعد تصدر أحكاما',
        body: 'بند الارتداد يتحول إلى إزاحة إلى الداخل، ولا يختبر شيء بعد ذلك.',
      },
      exact: {
        title: 'حساب مضبوط على شبكة معلنة',
        /* «ترمي خطأً» — the phrase `shared.ar.tsx` uses for a constructor that throws. */
        body:
          'مليمترات بأعداد صحيحة واختبارات هندسية مضبوطة، والإزاحة شبه المماسة توقف ' +
          'الحساب بخطأ بدلا من أن تعيد إجابة خاطئة تبدو معقولة.',
      },
      derivation: {
        title: 'كل قيمة تحمل اشتقاقها',
        body: 'الفجوة التي ملئت تظهر بالكهرماني، ومعها أثرها على الناتج لا مجرد وجودها.',
      },
      blocks: {
        title: 'طبقة تحجب الإصدار',
        body: 'فحص مستقل لا يرى المحرك، وأي إخفاق يحجب المخرج ولا يكون تحذيرا إطلاقا.',
      },
    },

    keyCaption:
      'الأصناف الأربعة كما يعرضها المحرك. اللون الكهرماني محجوز لصنف واحد منها، ولا ' +
      'يستعمله أي عنصر آخر في المنتج.',
  },

  claims: {
    /*
      Third person throughout — §3 bars «نحن» — and «يؤكد» rather than «يدّعي».
      Unvowelled, «يدّعيه» collapses into «يدعيه», which a reader takes as "invites
      him"; and the shadda that told them apart is exactly what §5 no longer allows.
      «ما يؤكده» carries the same commitment and cannot be misread.
    */
    title: 'ما يؤكده هذا النظام بالضبط',
    lede:
      'لكل سؤال منفصل إجابة منفصلة، في كل تقرير يصدره المحرك. وصيغة هذه الإجابات مثبتة ' +
      'في المواصفة، ولا يكتبها من يتولى البيع.',

    selfConsistency: {
      title: 'الاتساق الذاتي',
      status: 'مؤكد',
      /*
        «نفذ المطلوب منه» rather than «فعل ما طُلب منه»: the passive «طُلب» reads as
        the active «طَلَب» once the marks come off, and the sentence then says the
        engine asked rather than was asked — the opposite of the claim.
      */
      body:
        'المخرج يستوفي كل قيد مسجل في المحرك، وحساباته متوازنة. وهذا يعني أن المحرك نفذ ' +
        'المطلوب منه، لا أن المطلوب نفسه صحيح.',
    },
    coverage: {
      title: 'تغطية القواعد',
      status: 'جزئية، ومعلنة بالأرقام',
      /* «ما سجل في المحرك» — §5b: «مُرمَّز» reads as *encrypted*, which is the
         opposite of what this product claims about its rules. */
      bodyBefore: 'يعرض المنتج عدد ما سجل في المحرك من المتطلبات التي ',
      bodyEmphasis: 'حددها هو',
      bodyAfter:
        '، ويدرج ما تأجل منها. والمقام في هذه النسبة جرده هو. والمتطلب الذي لم يخطر ' +
        'لأحد غائب عن طرفي النسبة، فارتفاع النسبة دليل على الاجتهاد ولا يدل على ' +
        'الاكتمال إطلاقا.',
    },
    geometry: {
      title: 'الصلاحية الهندسية',
      status: 'مؤكدة',
      body: (gridMm: string): string =>
        `كل مضلع يحسب بأعداد صحيحة على شبكة معلنة خطوتها ${gridMm} mm، وكل مساحة تحسب ` +
        'بطرق مستقلة يجب أن تتطابق نتائجها تماما. والهندسة المتحللة توقف الحساب بخطأ ' +
        'بدلا من أن تعيد إجابة خاطئة تبدو معقولة.',
    },
    judgement: {
      title: 'التوافق مع الحكم المهني',
      /* «لم يخضع للقياس», not «لم يُقَس» — §5: the word that needs a mark to be
         read is the wrong word. */
      status: 'لم يخضع للقياس',
      body:
        'لم يقس أحد ما إذا كان معماري مؤهل سيصل إلى الإجابة نفسها. وذلك يحتاج أولا إلى ' +
        'دراسة تحدد مدى التباين بين المعماريين، على أيدي معماريين لم يقع عليهم الاختيار ' +
        'بعد. وإلى أن تتم، لا يجوز اقتباس أي رقم في هذا الباب، ولا يقتبس هنا شيء.',
    },
    regulatory: {
      title: 'الصلاحية التنظيمية',
      status: 'لا يؤكدها النظام إطلاقا',
      /*
        «ليس فحص مطابقة، ولا يجوز وصفه بذلك» — the English "may not be described as
        a compliance check", with the negation placed on «مطابقة» itself. The word
        appears on this page negated, and only negated.
      */
      body:
        'لا يحدد هذا النظام، ولا يستطيع أن يحدد، ما إذا كانت جهة تنظيمية ستعتمد مقترحا ' +
        'تطويريا. لا «ليس بعد»، ولا «بانتظار التصديق». هذه الصلاحية لا تستخرج من أي ' +
        'حساب، واتفاق المدقق مع المحرك الذي أنتج الرقم اتساق ذاتي لا أكثر. وأي مخرج من ' +
        'هذا المنتج ليس فحص مطابقة، ولا يجوز وصفه بذلك.',
    },

    link: 'ما يلزم لتغيير كل حالة من هذه الحالات',
  },

  limits: {
    title: 'ما لا يفعله',
    lede:
      'هذه القائمة أطول من قائمة الميزات، وذلك عن قصد. كل سطر فيها أمر يفترضه القارئ ' +
      'إن لم يقل له أحد غير ذلك.',
    after: 'وهناك غيرها، وبعضها يؤديه البرنامج أثناء التشغيل رفضا تراه يعيده أمامك.',
    link: 'القائمة كاملة، وما يلزم لتغيير أي بند فيها',
  },

  readiness: {
    title: 'أين يقف هذا النشر فعليا',
    /*
      «ليس تقييما للسعة التطويرية، ولا يجوز اقتباسه لطرف ثالث» — both halves of the
      English denial, at the same pace, in the words /readiness uses for the same
      claim. «السعة» not «الطاقة»: §5b.
    */
    body:
      'لا توجد فيه قاعدة واحدة اعتمدها مهني محدد بالاسم، وملحق تعريفات المقاييس غير ' +
      'موقع، والإشارات إلى بنود الكود كلها عناصر نائبة لا مراجع موثقة. وكل رقم يصدره ' +
      'المحرك اليوم عرض توضيحي لقدرته على قواعد مسودة — وليس تقييما للسعة التطويرية، ' +
      'ولا يجوز اقتباسه لطرف ثالث. وهذا مذكور على كل شاشة ومطبوع على كل تقرير.',
    numbers: 'اطلع على أرقام الجاهزية',
    engine: 'افتح المحرك على أي حال',
  },
};
