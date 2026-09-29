/**
 * العربية — الخطوة 3: القواعد، وسؤال المواقف ضمن معامل البناء، ومعيار المطوّر،
 * وسؤال الكفاءة البيعية.
 *
 * Held to `RulesDictionary` by the type system. Every choice is argued in
 * `docs/05-design/arabic-glossary.md`; the comments here record only what would
 * otherwise read as a mistranslation.
 *
 * ---------------------------------------------------------------------------
 * THE TWO QUESTIONS WITH NO DEFAULT.
 *
 * Both the parking-in-FAR question and the saleable-efficiency question say "there
 * is no default", and both say it as «لا قيمة افتراضية» — the one construction in
 * which «افتراضي» may appear: negated, meaning *default*, and denying one. Anywhere
 * else the word is ASSUMED mistranslated as the thing this codebase forbids having.
 * "we will not assume one" is the engine's refusal, in the third person: «ولن يفترض
 * المحرّك واحدة». No «قد», no «ربما».
 *
 * THE AMBER NOTICE. «هذا ليس لائحةً تنظيمية.» — «لائحة» is the word in «لوائح ضبط
 * التطوير», the regulation this screen's rules come from, so the notice denies
 * exactly the category the reader might put a developer's brief in. It stays in
 * the amber banner; only its words change.
 *
 * «سلامة الأرواح» and «لم يُقيَّم» are the chips — the same words the readiness page
 * uses for the same two facts.
 */

import type { RulesDictionary } from './rules.en.js';

export const AR: RulesDictionary = {
  parkingInFar: {
    title: 'هل تُحتسب المواقف ضمن معامل البناء هنا؟',
    subtitle: (swing: string): string =>
      `يُغيّر هذا الإجابة بنسبة ${swing}. لا قيمة افتراضية، ولن يفترض المحرّك واحدة.`,
    legend: 'معالجة المواقف ضمن معامل البناء',
    counts: {
      label: 'نعم، تُحتسب',
      detail: 'تستهلك مساحةُ المواقف جزءًا من المساحة الطابقية المسموح بها، فيبقى للبيع أقلّ.',
    },
    excluded: {
      label: 'لا، هي مستثناة',
      detail: 'المساحة الطابقية المسموح بها متاحة كاملةً فوق المواقف.',
    },
    /*
      "A legitimate answer." — «إجابة مشروعة», stated flat. The answer blocks the
      run and is still a real answer; the Arabic does not apologise for it.
    */
    open: {
      label: 'لا أعرف بعد',
      detail: 'إجابة مشروعة. لن يحسب المحرّك طاقةً، لكنه يُريك ما تساويه كل معالجة.',
    },
    compare: 'أرِني ما تساويه كل إجابة',
    compareNeeds:
      'تُشغِّل المقارنةُ سلسلة الحساب مرّتين، فتحتاج أولًا إلى حصّة المساحة القابلة للبيع من إجمالي المساحة الطابقية أدناه.',
    ifCounts: 'إن احتُسبت',
    ifExcluded: 'إن استُثنيت',

    statement: {
      notARule: 'هذا ليس تشريعًا.',
      prefilledBefore: 'الإجابة أدناه مملوءة مسبقًا ممّا ذكره ',
      prefilledBetween: '، ',
      prefilledAfter: '، بتاريخ ',
      prefilledEnd: '. وإن غيّرتها صارت إجابتك أنت، وتُسجَّل باسمك.',
      saidLabel: 'بنصّ كلامه',
      translationLabel: 'الترجمة',
      limitsLabel: 'حدود هذا القول',
      use: 'استخدم هذه الإجابة',
      inUse: 'هذه هي الإجابة أدناه، وتُسجَّل باسمه. وإن غيّرتها صارت إجابتك أنت.',
      badge: 'من القول أعلاه',
    },
  },

  levels: {
    title: 'طوابق المواقف',
    subtitle: 'كم طابقًا من المواقف المبنيّة يستطيع المشروع أن يوفّر.',
    available: 'الطوابق المتاحة',
    podium: 'طوابق المصطبة',
    fromSheetBefore: 'قُرئ من مخطّط الأفكشن على أنه ',
    fromSheetAfter: '. أكِّده أو غيِّره — تُسجّله التشغيلة باسمك.',
    /* «وتَسِمه مُفترَضًا» — marked ASSUMED, with the glossary's word and its vowels. */
    example: {
      before: 'عدد طوابق المصطبة في رمز الارتفاع، مثل ',
      between: ' في ',
      after: '. وإن تُرك فارغًا، تُظهر الكتلة البنائية طابق مصطبة واحدًا وتَسِمه مُفترَضًا.',
    },
  },

  rules: {
    title: 'القواعد',
    subtitle: 'ما سيُطبَّق، وما لن يُطبَّق. وكلاهما مهمّ.',
    noneApproved: 'لا قاعدة معتمدة في هذا النشر.',
    loading: 'جارٍ تحميل مجموعة القواعد…',
    groups: {
      generative: {
        title: 'بناء الغلاف',
        note: 'هذه تبني الهندسة مباشرةً — فيصير الارتداد إزاحةً لا اختبارًا.',
      },
      filtering: {
        title: 'استبعاد البدائل',
        note: 'تُطبَّق أثناء البناء؛ فالبديل المخالف لا يُنشأ أصلًا.',
      },
      evaluative: {
        title: 'ترفض فقط، ولا تبني',
        note: (phase: string): string =>
          `القواعد الطوبولوجية لا معكوس بنائيًّا لها. وفي المرحلة ${phase} لا شيء يُولّد لوح طابق، فلا يمكن إلا الإعلان عنها.`,
      },
      /* «لم تُقيَّم» — the absence of an act, never «غير صالحة» or «غير مطابقة». */
      deferred: {
        title: 'منطبقة، ولم تُقيَّم',
        note: 'تُعلَن في كل مُخرَج كي يكون ما لم يُفحَص ظاهرًا لا غائبًا.',
      },
    },
    lifeSafety: 'سلامة الأرواح',
    notAssessed: 'لم يُقيَّم',
  },

  mix: {
    title: 'خليط الوحدات الذي ستستخدمه هذه التشغيلة',
    subtitle:
      'عدد الوحدات هو المساحة الطابقية المسموح بها مقسومةً على ما تشغله الوحدة الواحدة. وهذه هي المساحات التي سيُقسَم عليها.',
    share: (percent: string): string => `${percent}% `,
    area: (m2: string): string => ` بمساحة صافية قابلة للبيع ${m2} م²`,
    assumed: 'مُفترَض.',
    userSet: 'مُدخَل.',
  },

  standard: {
    title: 'البناء وفق معيار المطوّر',
    subtitle:
      'اختياري، ويُغيّر الإجابة. يُثبّت موجز المطوّر توزيع الوحدات والمساحات التي يُسعَّر عليها المشروع — وهذا ما يُحوّل إجمالي المساحة الطابقية المسموح بها إلى عدد وحدات.',
    notice: 'هذا ليس لائحةً تنظيمية.',
    brief: {
      before: 'لهذه القطعة موجزها الخاص — ',
      plot: '، القطعة ',
      end: '.',
      statesFar: 'ينصّ على معامل بناء ',
      statesAnd: ' و',
      statesGfa: ' m² من إجمالي المساحة الطابقية.',
      /* «خيارات», not «سيناريوهات»: no transliteration where Arabic has the word. */
      replaces:
        'تحلّ خياراته محلّ خيارات المعيار العامّ — فالتوزيع الأوسع لا ينطبق على هذه القطعة.',
    },
    none: {
      label: 'لا شيء — استخدم توزيعًا عامًّا',
      detail: 'بديلٌ لم يُدخله أحد. يُعلَن افتراضًا، ويُحرّك عدد الوحدات مباشرةً.',
    },
    fromBrief: 'من موجز هذه القطعة',
    entryShare: (percent: string): string => `${percent}% `,
    entryArea: (area: string): string => ` بمساحة ${area} m²`,
    entrySeparator: ' · ',
    whereFrom: 'من أين تأتي هذه المساحات',
    page: '، ص. ',
    quoteBefore: ' — «',
    quoteAfter: '»',
    notMechanized: 'ما يطلبه المعيار ولا يفعله هذا المحرّك',
  },

  efficiency: {
    title: 'ما القابل للبيع من إجمالي المساحة الطابقية؟',
    subtitle: (assumed: string): string =>
      `الأنوية والممرّات والإنشاء والمعدّات والمرافق كلها داخل إجمالي المساحة الطابقية، ولا يُباع منها شيء. لا قيمة افتراضية هنا: كان هذا المحرّك يأخذ ${assumed} دون أن يقول ذلك، فأبلغ عن وحدات أكثر مما يتّسع له أيّ مبنى.`,
    label: 'المساحة القابلة للبيع ÷ إجمالي المساحة الطابقية',
    placeholder: (example: string): string => `مثلًا ${example}`,
    fromStandard: {
      before: 'ينصّ ',
      states: ' على ',
      to: ' إلى ',
      quoteBefore: ' — «',
      after: '». وما تُدخله يُسجَّل باسمك.',
    },
    bounds: (above: string, atMost: string): string =>
      `رقم أكبر من ${above} ولا يتجاوز ${atMost}. وما تُدخله يُسجَّل باسمك.`,
    /*
      What is wrong, then why the bound is where it is — the English order, kept.
      No hedge: the building cannot sell more area than it has, so the sentence
      does not say it «قد» mean that.
    */
    invalid: (above: string, atMost: string): string =>
      `يجب أن يكون أكبر من ${above} ولا يتجاوز ${atMost}. فما فوق ${atMost} يعني أنّ المبنى يبيع مساحةً أكثر مما فيه.`,

    unit: {
      legend: 'أدخِله على هيئة',
      ratio: {
        label: 'نسبة من إجمالي المساحة الطابقية',
        detail: 'اختره إن كان لديك هدف — موجز ينصّ على 93% إلى 97% من إجمالي المساحة الطابقية.',
      },
      area: {
        label: 'مساحة بالمتر المربّع',
        detail:
          'اختره إن كان لديك أمتار مربّعة. يقسمها المحرّك على إجمالي المساحة الطابقية التي يعطيها هذا الغلاف ويعرض لك النسبة.',
      },
    },
    areaLabel: 'المساحة القابلة للبيع (م²)',
    areaPlaceholder: (example: string): string => `مثلًا ${example}`,
    areaHelp:
      'يقسم المحرّك هذه المساحة على إجمالي المساحة الطابقية التي يعطيها هذا الغلاف، ويعرض لك النسبة الناتجة بجوار الإجابة. فإن لم تكن تلك النسبة ما تتوقّعه، فأحد الرقمين خطأ.',
    areaInvalid: 'مساحة أكبر من صفر، بالمتر المربّع.',
  },

  run: {
    busy: 'جارٍ الحساب…',
    idle: 'احسب الطاقة',
    needsParking: 'أجِب عن سؤال المواقف أعلاه للمتابعة.',
    needsEfficiency:
      'أدخل حصّة المساحة القابلة للبيع من إجمالي المساحة الطابقية للمتابعة. وليست إجراءً شكليًّا — فهي تُحرّك عدد الوحدات بمقدار كل ما ليس قابلًا للبيع.',
    needsSaleableArea:
      'أدخل المساحة القابلة للبيع للمتابعة. وليست إجراءً شكليًّا — فهي تُحرّك عدد الوحدات بمقدار كل ما ليس قابلًا للبيع.',
  },
};
