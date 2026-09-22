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
  LOCAL: 'طريق محلّي',
  ACCESS: 'طريق وصول',
};

/** Edge classifications that are not roads, by the same rule. */
const EDGE: Readonly<Record<string, string>> = {
  ROAD: 'طريق',
  ADJACENT_PLOT: 'قطعة مجاورة',
  OPEN_SPACE: 'مساحة مفتوحة',
  OTHER: 'حدّ آخر',
};

/** The land-use tokens the engine knows, by the same rule. */
const LAND_USE: Readonly<Record<string, string>> = {
  RESIDENTIAL_MULTI: 'سكني متعدّد الوحدات',
  RESIDENTIAL_SINGLE: 'سكني أحادي الوحدة',
  COMMERCIAL: 'تجاري',
  MIXED_USE: 'متعدّد الاستخدامات',
  INDUSTRIAL: 'صناعي',
};

export const AR: LandingDictionary = {
  eyebrow: (phase: string): string => `المرحلة ${phase} · عرض توضيحي للمحرّك`,

  /*
    «ما تقتضيه هذه القواعد», the verb the chrome's own route description uses for
    the same claim — and never «ما يمكن بناؤه», which is the permission claim the
    English h1 was rewritten to stop making.
  */
  title: 'ما تقتضيه هذه القواعد لقطعة الأرض هذه، واشتقاقُ كل رقم يقول ذلك.',

  answerLabel: 'الطاقة الحاكمة لهذه التشغيلة',

  bands: {
    word: 'النطاق ',
    a: {
      name: 'ما يسمح به الكود',
      note: 'معامل البناء مُطبَّقًا على قطعة الأرض. وهو النطاق الوحيد الذي تحسبه حاسبةُ معامل البناء.',
    },
    b: {
      name: 'ما يستوعبه الغلاف البنائي',
      note: 'اللوح الذي تتركه الارتدادات والحدّ الأقصى للوح، مرصوصًا طابقًا فوق طابق حتى حدّ الارتفاع.',
    },
    c: {
      name: 'ما تدعمه المواقف',
      /*
        «مقسومة على», and nothing about bays that fit. The band is an area divided by
        a factor; the drawn level comes after it and cannot inform it.
      */
      note: 'مساحةٌ متاحة مقسومة على معامل مساحة الموقف، والمعامل مُفترَض.',
    },
    binds: 'يُلزِم',
    why: 'لماذا',
    /* The imperative, as every control in the chrome commands («شغِّل», «حوِّل»). */
    hide: 'أخفِ',
    question: '؟',
  },

  assumed: {
    titleAfter: ' — المساحة التي يُعَدّ أنّ الموقف الواحد يستهلكها',
    before: 'تُحسَب سعةُ المواقف بقسمة مساحةٍ متاحة على',
    /* «القاسم» is the divisor — the number divided BY — which is what 32 m²/bay is. */
    after: '، وهذا القاسم ليس ثابتًا: ',
  },

  validity: {
    /*
      The masthead's own wording, «الصلاحية التنظيمية — لم تُقيَّم», so the refusal
      reads identically in the chrome and under the answer. «لم تُقيَّم» is the
      absence of an act; «غير صالحة» or «غير مطابقة» would be verdicts, and a
      stronger claim than the affirmative one the product refuses to make.
    */
    stamp: 'الصلاحية التنظيمية — لم تُقيَّم.',
    /*
      «عناصرُ نائبة» is the settled Arabic for placeholders, as in «تعريف نائب» on
      /dashboard. The plural predicate after «كلُّها» is deliberate: the shorter
      «وكل إشارة إلى بند يحملها عنصرٌ نائب» also parses as "a placeholder carries
      it", which inverts who holds what.
    */
    body:
      ' لا قاعدة في هذا النشر معتمدةٌ من مهني مُسمّى، والإشاراتُ إلى البنود التي يحملها ' +
      'كلُّها عناصرُ نائبة، لا استشهاداتٌ مُسنَدة إلى مرجع.',
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
      'هذا المحرّك ليس أداةَ فحصِ مطابقة. فأداة الفحص تسأل عمّا إذا كان الارتداد يستوفي ' +
      'رقمًا ما، وتحتاج إلى رسمٍ موجود. أمّا هذا المحرّك فيقرأ البند نفسه إزاحةً إلى ' +
      'الداخل، فالقاعدة ',
    emphasis: 'تُولِّد',
    after: ' الإجابة بدل أن تختبر رسمًا.',
  },

  cta: {
    run: 'شغِّل هذه القطعة بنفسك',
    refusals: 'ما يرفضه',
  },

  figure: {
    /* «بأبعاده الثلاثة» says 3D in words; the English "3D" is a name, not a figure. */
    modelLabel: (levels: string, maxLevels: string): string =>
      `مبنى هذه التشغيلة بأبعاده الثلاثة: ${levels} من طوابق المساحة الطابقية فوق ` +
      `المواقف، داخل الغلاف البنائي الذي تسمح به القواعد حتى ${maxLevels} من الطوابق. ` +
      'وتقول الأرقام المجاورة الشيءَ نفسه بالكلمات.',

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
      `مسقط قطعة أرض أبعادها بالمتر ${p.width} في ${p.depth}. تترك الارتداداتُ، وقدرها ` +
      `بالمتر ${p.setbacks[0]} و${p.setbacks[1]} و${p.setbacks[2]} و${p.setbacks[3]}، ` +
      `مسطّحَ بناءٍ مساحته بالمتر المربّع ${p.footprint}، ويترك الحدّ الأقصى للوح البرج ` +
      `داخله ${p.plateCap}.`,

    plateCapTag: 'الحدّ الأقصى للوح البرج',

    edge: (classification: string, roadHierarchy: string | undefined): string =>
      roadHierarchy
        ? (ROAD[roadHierarchy] ?? roadHierarchy)
        : (EDGE[classification] ?? classification.replace(/_/g, ' ')),

    number: 'النموذج',
    landUse: (token: string): string => LAND_USE[token] ?? token.replace(/_/g, ' ').toLowerCase(),

    spec: {
      plotArea: 'مساحة القطعة',
      setbacks: 'الارتدادات، لكل ضلع',
      footprint: 'مسطّح البناء بعد الإزاحة',
      plateCap: 'الحدّ الأقصى للوح البرج',
      levels: 'الطوابق التي تضعها الإجابة',
      /* «5 من 14 يسمح بها الارتفاع» — no counted noun after either figure. */
      levelsOf: ' من ',
      levelsAfter: ' يسمح بها الارتفاع',
    },

    source:
      'هذه التشغيلة، بمقياس رسم، كما رصّ المحرّك طوابقها · الطوابق المُصمَتة هي الإجابة، ' +
      'والخطوط الخارجية ارتفاعٌ تتركه الإجابة دون استخدام · الكهرماني يُعلِّم ما افترضه ' +
      'المحرّك حيث لا تحسم قاعدة · الصلاحية التنظيمية — لم تُقيَّم',
  },

  capacities: {
    title: 'يُبلَّغ عن كل طاقة على حدة، ولا يُحسَب لها متوسّط إطلاقًا',
    lede:
      'ما يسمح به الكود، وما يستوعبه الغلاف البنائي، وما تدعمه المواقف: أسئلةٌ منفصلة. ' +
      'والاكتفاء باقتباس أكبرها هو ما يجعل قطعةَ أرضٍ تُشترى على رقمٍ لم يكن متاحًا قطّ.',

    /*
      «يُلزِم نطاقُ PARKING، ويعلو سقفُ نطاق REGULATORY الإجابةَ بمقدار …».
      The tokens are the engine's and are rendered as it emitted them; «نطاق» before
      each is what lets an engine token stand as the subject of an Arabic verb. The
      sentence still names no band — the fixture does.
    */
    verdict: {
      before: 'في هذه التشغيلة يُلزِم نطاقُ ',
      between: '، ويعلو سقفُ نطاق ',
      after: ' الإجابةَ بمقدار ',
      end: '.',
    },
  },

  parking: {
    title: 'كيف يُصنَع رقم المواقف فعليًّا',
    proseBefore:
      'النطاق C هو الأصغر بين ما تسمح به المساحة الطابقية وما تستطيع سعةُ المواقف أن ' +
      'تخدمه. وهذه السعة مساحةٌ متاحة مقسومة على معامل مساحة الموقف، ولا تُثبِّت أيُّ ' +
      'قاعدة مُستشهَد بها هذا المعامل — إنه الرقم الكهرماني في أعلى الصفحة. ويوزّع المحرّك ' +
      'الطابقَ إلى مواقف وممرّات مناورة ومنحدر داخل حدود المصطبة ',
    proseEmphasis: 'بعد ذلك',
    proseAfter:
      '، فالرسم فحصٌ للمعامل، ولا يكون مصدرَه إطلاقًا. ويُبلَّغ عمّا يكلّفه الرسم مقابل ما ' +
      'توقّعه المعامل، بدل أن يُطوى في الحساب.',

    costed: {
      assumed: 'المُفترَض في نموذج السعة',
      measured: 'المقيس على الطابق كما وُزِّع',
      bays: 'المواقف التي يضمّها الطابق الموزَّع',
    },
    link: 'السلسلة من المعامل إلى النطاق، والطابق مرسومًا',
  },

  guarantees: {
    title: 'ما تقوم عليه الإجابة',
    /*
      «نموذجٌ إحصائي», not «نموذج» alone. The English "model" means a statistical
      one — the next words are "a guess with a confidence interval" — and a bare
      «نموذج» on this page already names the 3D building in the figure caption. The
      qualifier restores the meaning the English carries by context.
    */
    lede: 'لا نموذجٌ إحصائي، ولا تخمينٌ طُلي عليه مجالُ ثقةٍ بعد ذلك.',

    chain: {
      generate: {
        title: 'قواعد تُولِّد، لا قواعد تُصدِر أحكامًا',
        body: 'يصير بند الارتداد إزاحةً إلى الداخل، ولا يُختبَر شيءٌ بعد ذلك.',
      },
      exact: {
        title: 'حسابٌ مضبوط على شبكة مُعلَنة',
        /* «ترمي خطأً» — the phrase `shared.ar.tsx` uses for a constructor that throws. */
        body:
          'ملّيمتراتٌ بأعداد صحيحة واختباراتٌ هندسية مضبوطة؛ والإزاحة شبه المماسّة ترمي ' +
          'خطأً بدل أن تُعيد إجابةً خاطئة تبدو معقولة.',
      },
      derivation: {
        title: 'تحمل كل قيمة اشتقاقها',
        body: 'الفجوة المملوءة كهرمانية، وتقول كم تُكلِّف لا أنها موجودة فحسب.',
      },
      blocks: {
        title: 'طبقةٌ تحجب الإصدار',
        body: 'فحصٌ مستقلّ لا يرى المحرّك؛ والإخفاق يحجب المُخرَج، ولا يكون تحذيرًا إطلاقًا.',
      },
    },

    keyCaption:
      'الأصناف الأربعة كما يعرضها المحرّك. الكهرماني محجوزٌ لواحد منها، ولا يُسمَح لأي شيء ' +
      'آخر في المنتج باستخدامه.',
  },

  claims: {
    /* Third person: "what we claim" is «ما يدّعيه المنتج». §3 bars «نحن». */
    title: 'ما يدّعيه المنتج بالضبط',
    lede:
      'للأسئلة المنفصلة إجاباتٌ منفصلة، في كل تقرير يُنتجه المحرّك، والصياغة مُثبَّتة في ' +
      'المواصفة، لا يكتبها من يبيع.',

    selfConsistency: {
      title: 'الاتّساق الذاتي',
      status: 'مدعوم',
      body:
        'يستوفي المُخرَج كلَّ قيدٍ مُرمَّز، وتتوازن حساباته. وهذا يقول إن المحرّك فعل ما ' +
        'طُلب منه — لا إن ما طُلب منه صحيح.',
    },
    coverage: {
      title: 'تغطية القواعد',
      status: 'جزئية، ومُحدَّدة كمًّا',
      bodyBefore: 'يُبلِّغ المنتج بعدد ما رُمِّز من المتطلّبات التي ',
      bodyEmphasis: 'حدّدها هو',
      bodyAfter:
        '، ويُدرِج ما أُجِّل. والمقام جردُه هو. والمتطلّب الذي لم يفكّر فيه أحد غائبٌ عن ' +
        'طرفَي تلك النسبة، فالنسبة العالية دليلٌ على الاجتهاد، ولا تدلّ على الاكتمال إطلاقًا.',
    },
    geometry: {
      title: 'الصلاحية الهندسية',
      status: 'مدعومة',
      body: (gridMm: string): string =>
        `يُحسَب كل مضلّع بحسابٍ مضبوط بالأعداد الصحيحة على شبكة مُعلَنة خطوتها ${gridMm} mm، ` +
        'ويُعاد حساب كل مساحة بطرق مستقلّة يجب أن تتّفق تمامًا. وترمي الهندسة المتحلّلة ' +
        'خطأً بدل أن تُعيد إجابةً خاطئة تبدو معقولة.',
    },
    judgement: {
      title: 'الاتّفاق مع الحكم المهني',
      status: 'لم يُقَس بعد',
      body:
        'لم يُقَس ما إذا كان معماريٌّ مؤهَّل سيُنتج إجابةً مماثلة. وتحتاج الدراسة أولًا إلى ' +
        'تحديد نطاق التباين بين المعماريين، على أيدي معماريين لم يُكلَّفوا بعد. وحتى ذلك ' +
        'الحين لا يجوز اقتباس أي رقم، ولا يُقتبَس شيء.',
    },
    regulatory: {
      title: 'الصلاحية التنظيمية',
      /* The permanent sentence's own verb: «ولا يُدَّعى بها». */
      status: 'لا يُدَّعى بها إطلاقًا',
      /*
        «ليس فحصَ مطابقة ولا يجوز أن يُوصَف بذلك» — the English "may not be
        described as a compliance check", with the negation placed on «مطابقة»
        itself. The word appears on this page negated, and only negated.
      */
      body:
        'لا يُحدِّد هذا النظام، ولا يستطيع أن يُحدِّد، ما إذا كانت جهةٌ تنظيمية ستعتمد ' +
        'مقترحًا تطويريًّا. لا «ليس بعد». ولا «بانتظار التصديق». إنها لا تُستخرَج من أي ' +
        'حساب، واتّفاقُ مُدقِّقه مع مولِّده اتّساقٌ ذاتيّ لا أكثر، وأيُّ مُخرَج من هذا ' +
        'المنتج ليس فحصَ مطابقة، ولا يجوز أن يُوصَف بذلك.',
    },

    link: 'ما يلزم لتغيير كل حالة من هذه الحالات',
  },

  limits: {
    title: 'ما لا يفعله',
    lede: 'هي أكثر من الميزات عددًا، وذلك عن قصد. كل سطر هنا أمرٌ سيفترضه أحدٌ ما لم يُذكَر.',
    after: 'وهناك غيرها، وبعضها يؤدّيه البرنامج أثناء التشغيل رفضًا تراه يُعيده أمامك.',
    link: 'القائمة كاملةً، وما يلزم لتغيير أيٍّ منها',
  },

  readiness: {
    title: 'أين يقف هذا النشر فعليًّا',
    /*
      «ليس تقييمًا للطاقة التطويرية، ولا يجوز اقتباسه لطرف ثالث» — both halves of
      the English denial, at the same pace, in the words /dashboard uses for the
      same claim.
    */
    body:
      'لا قاعدة فيه معتمدةٌ من مهني مُسمّى، وملحق تعريفات المقاييس غير موقَّع، والإشاراتُ ' +
      'إلى البنود التي يحملها كلُّها عناصرُ نائبة، لا استشهاداتٌ مُسنَدة إلى مرجع. وكل رقم يُنتجه اليوم عرضٌ ' +
      'توضيحي للمحرّك على قواعد مسوّدة — ليس تقييمًا للطاقة التطويرية، ولا يجوز اقتباسه ' +
      'لطرف ثالث. ويُذكَر ذلك على كل شاشة ويُطبَع على كل تقرير.',
    numbers: 'اطّلع على أرقام الجاهزية',
    engine: 'افتح المحرّك على أي حال',
  },
};
