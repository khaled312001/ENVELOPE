/**
 * العربية — الخطوة 3: القواعد، وسؤال المواقف في معامل البناء، ومعيار المطور،
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
 * "we will not assume one" is the engine's refusal, in the third person: «ولن
 * يفترض المحرك واحدة». No «قد», no «ربما».
 *
 * THE AMBER NOTICE. «هذا ليس لائحة تنظيمية.» — «لائحة» is the word in «لوائح ضبط
 * التطوير», the regulation this screen's rules come from, so the notice denies
 * exactly the category the reader might put a developer's brief in. It stays in
 * the amber banner; only its words change.
 *
 * «سلامة الأرواح» and «لم يخضع للتقييم» are the chips — the same words the
 * readiness page uses for the same two facts.
 */

import type { RulesDictionary } from './rules.en.js';

export const AR: RulesDictionary = {
  parkingInFar: {
    /* «هل تدخل المواقف في معامل البناء» rather than «هل تُحتسب»: unvowelled,
       «تحتسب» is read as the active verb and the question changes who is counting. */
    title: 'هل تدخل المواقف في معامل البناء هنا؟',
    subtitle: (swing: string): string =>
      `يغير هذا الإجابة بنسبة ${swing}. لا قيمة افتراضية له، ولن يفترض المحرك واحدة.`,
    legend: 'معالجة المواقف في معامل البناء',
    counts: {
      label: 'نعم، تدخل فيه',
      detail: 'مساحة المواقف تستهلك جزءا من المساحة الطابقية المسموح بها، فيبقى للبيع أقل.',
    },
    excluded: {
      label: 'لا، هي مستثناة',
      detail: 'المساحة الطابقية المسموح بها متاحة كاملة فوق المواقف.',
    },
    /*
      "A legitimate answer." — «إجابة مشروعة», stated flat. The answer blocks the
      run and is still a real answer; the Arabic does not apologise for it.
    */
    open: {
      label: 'لا أعرف بعد',
      detail: 'إجابة مشروعة. لن يحسب المحرك سعة، لكنه يريك ما تساويه كل معالجة.',
    },
    compare: 'أرني ما تساويه كل إجابة',
    compareNeeds:
      'المقارنة تشغل سلسلة الحساب مرتين، فتحتاج أولا إلى حصة المساحة القابلة للبيع من إجمالي المساحة الطابقية أدناه.',
    ifCounts: 'إن دخلت فيه',
    ifExcluded: 'إن استثنيت',

    statement: {
      notARule: 'هذا ليس تشريعا.',
      prefilledBefore: 'الإجابة أدناه مملوءة مسبقا مما ذكره ',
      prefilledBetween: '، ',
      prefilledAfter: '، بتاريخ ',
      prefilledEnd: '. وإن غيرتها صارت إجابتك أنت، وتسجل باسمك.',
      saidLabel: 'بنص كلامه',
      translationLabel: 'الترجمة',
      limitsLabel: 'حدود هذا القول',
      use: 'استخدم هذه الإجابة',
      inUse: 'هذه هي الإجابة أدناه، وتسجل باسمه. وإن غيرتها صارت إجابتك أنت.',
      badge: 'من القول أعلاه',
    },
  },

  core: {
    title: 'النواة',
    subtitle:
      'المصاعد وسلالم الهروب والمناور وبهو المصاعد، بوصفها مساحة واحدة في الدور ' +
      'المتكرر. واتركها فارغة يفترضها المحرك بالكهرماني، ويقول ما افترضه.',
    label: 'مساحة النواة في الدور المتكرر (م²)',
    placeholder: (example: string): string => `مثال: ${example}`,
    help: {
      before: 'إن تركتها فارغة أخذ المحرك ',
      after:
        ' من مسطح البرج — وهو وسط ما تأخذه نواة برج سكني — وعلمها مفترضة حيثما ظهرت. ' +
        'وإن أدخلت رقما سجل باسمك. ولا يرفضه المحرك إلا إن تعذر أن يكون نواة لهذا ' +
        'المسطح، والرفض يذكر المساحتين معا.',
    },
    invalid: 'مساحة النواة رقم أكبر من صفر.',
    notSubtracted:
      'ولا ينقص المحرك شيئا مما فوق من أجل النواة. فالنواة داخل إجمالي المساحة ' +
      'الطابقية وخارج المساحة القابلة للبيع، ومن ثم فإن رقم المساحة القابلة للبيع ' +
      'الذي أدخلته يحسبها أصلا، وهي في دور المواقف داخل ما تخصمه نسبة الاستعمال. أما ' +
      'المحرك فيرسم النواة ويقارنها بالاثنين معا في شاشة النتائج.',
  },

  levels: {
    title: 'الأدوار',
    subtitle:
      'مم يتكون المبنى، من الأسفل إلى الأعلى. أما البرج فلا يدخل هنا — بل يخرج من الحساب.',
    basements: 'البدرومات',
    basementsHelp: 'تحت منسوب الأرض، وكلها مواقف. ولا يمثل المحرك تحت الأرض شيئا سواها.',
    groundIsParking: 'الدور الأرضي مواقف',
    groundHelp: 'وهو يحمل مدخل المركبات مهما كان استعماله. اتركه خاليا إن كان محلات أو بهوا.',
    podiumAbove: 'أدوار البوديوم فوق الدور الأرضي',
    podiumParking: 'وكم منها يحمل مواقف',
    podiumParkingHelp: 'تعد من الأرضي صعودا — فبوديوم دبي يملأ من أسفله.',
    fromSheetBefore: 'قرئ من مخطط الأفكشن على أنه ',
    fromSheetAfter: '. أكده أو عدله — تسجله الدراسة باسمك.',
    example: {
      before: 'عدد أدوار البوديوم في رمز الارتفاع، مثل ',
      between: ' في ',
      after: '. والدور الأرضي ليس منها.',
    },
    codeLabel: 'يقرأ هذا الجدول',
    codeNote:
      'بالصيغة التي يكتب بها رمز الارتفاع على مخطط الأفكشن. ويضاف عدد أدوار البرج متى أخرجه الحساب.',
    problemLead: 'هذا الجدول لا يصف مبنى.',
    parkingLabel: 'أدوار المواقف',
    parkingNote:
      'البدرومات، يضاف إليها الدور الأرضي إن كان مواقف، ثم أدوار البوديوم التي تحمل مواقف.',
  },

  rules: {
    title: 'القواعد',
    subtitle: 'ما ينطبق، وما لا ينطبق. وكلاهما مهم.',
    noneApproved: 'لا توجد قاعدة معتمدة في هذا النشر.',
    loading: 'جاري تحميل مجموعة القواعد…',
    groups: {
      generative: {
        title: 'بناء الغلاف',
        note: 'هذه تبني الهندسة مباشرة — فيصير الارتداد إزاحة لا اختبارا.',
      },
      filtering: {
        title: 'استبعاد البدائل',
        note: 'تطبق أثناء البناء؛ فالبديل المخالف لا ينشأ أصلا.',
      },
      evaluative: {
        title: 'ترفض فقط، ولا تبني',
        note: (phase: string): string =>
          `القواعد الطوبولوجية لا مقابل بنائي لها. وفي المرحلة ${phase} لا شيء ينتج مسطح دور، فلا يمكن إلا الإعلان عنها.`,
      },
      /* «لم يخضع للتقييم» — the absence of an act, never «غير صالحة» or «غير
         مطابقة», and never the vowelled «لم تُقيَّم» that §5 retired. */
      deferred: {
        title: 'منطبقة، ولم تخضع للتقييم',
        note: 'تعلن في كل ناتج كي يكون ما لم يفحص ظاهرا لا غائبا.',
      },
    },
    lifeSafety: 'سلامة الأرواح',
    notAssessed: 'لم يخضع للتقييم',
  },

  mix: {
    title: 'خليط الوحدات الذي تستخدمه هذه الدراسة',
    subtitle:
      'عدد الوحدات هو المساحة الطابقية المسموح بها مقسومة على ما تشغله الوحدة الواحدة. وهذه هي المساحات التي يقسم عليها.',
    share: (percent: string): string => `${percent}% `,
    area: (m2: string): string => ` بمساحة صافية قابلة للبيع ${m2} م²`,
    assumed: 'مفترض.',
    /* USER_SET → «أنت أدخلته», the glossary's second-person form. */
    userSet: 'أنت أدخلته.',
  },

  standard: {
    title: 'البناء وفق معيار المطور',
    subtitle:
      'اختياري، ويغير الإجابة. موجز المطور يثبت توزيع الوحدات والمساحات التي يسعر عليها المشروع — وهذا ما يحول إجمالي المساحة الطابقية المسموح بها إلى عدد وحدات.',
    notice: 'هذا ليس لائحة تنظيمية.',
    brief: {
      before: 'لهذه القطعة موجزها الخاص — ',
      plot: '، القطعة ',
      end: '.',
      statesFar: 'ينص على معامل بناء ',
      statesAnd: ' و',
      statesGfa: ' m² من إجمالي المساحة الطابقية.',
      /* «خيارات», not «سيناريوهات»: no transliteration where Arabic has the word. */
      replaces:
        'تحل خياراته محل خيارات المعيار العام — فالتوزيع الأوسع لا ينطبق على هذه القطعة.',
    },
    none: {
      label: 'لا شيء — استخدم توزيعا عاما',
      detail: 'بديل لم يدخله أحد. يعلن بوصفه افتراضا، ويحرك عدد الوحدات مباشرة.',
    },
    fromBrief: 'من موجز هذه القطعة',
    entryShare: (percent: string): string => `${percent}% `,
    entryArea: (area: string): string => ` بمساحة ${area} m²`,
    entrySeparator: ' · ',
    whereFrom: 'من أين تأتي هذه المساحات',
    page: '، ص. ',
    quoteBefore: ' — «',
    quoteAfter: '»',
    notMechanized: 'ما يطلبه المعيار ولا يفعله هذا المحرك',
  },

  efficiency: {
    title: 'ما القابل للبيع من إجمالي المساحة الطابقية؟',
    subtitle: (assumed: string): string =>
      `النوى والممرات والإنشاء والمعدات والمرافق كلها داخل إجمالي المساحة الطابقية، ولا يباع منها شيء. لا قيمة افتراضية هنا: كان هذا المحرك يأخذ ${assumed} دون أن يقول ذلك، فيعلن عددا من الوحدات أكبر مما يتسع له أي مبنى.`,
    label: 'المساحة القابلة للبيع ÷ إجمالي المساحة الطابقية',
    placeholder: (example: string): string => `مثلا ${example}`,
    fromStandard: {
      before: 'ينص ',
      states: ' على ',
      to: ' إلى ',
      quoteBefore: ' — «',
      after: '». وما تدخله يسجل باسمك.',
    },
    bounds: (above: string, atMost: string): string =>
      `رقم أكبر من ${above} ولا يتجاوز ${atMost}. وما تدخله يسجل باسمك.`,
    /*
      What is wrong, then why the bound is where it is — the English order, kept.
      No hedge: the building cannot sell more area than it has, so the sentence
      does not say it «قد» mean that.
    */
    invalid: (above: string, atMost: string): string =>
      `لا بد أن يكون أكبر من ${above} ولا يتجاوز ${atMost}. فما فوق ${atMost} يعني أن المبنى يبيع مساحة أكثر مما فيه.`,

    unit: {
      legend: 'أدخله على هيئة',
      ratio: {
        label: 'نسبة من إجمالي المساحة الطابقية',
        detail: 'اختره إن كان لديك هدف — موجز ينص على 93% إلى 97% من إجمالي المساحة الطابقية.',
      },
      area: {
        label: 'مساحة بالمتر المربع',
        detail:
          'اختره إن كان لديك أمتار مربعة. يقسمها المحرك على إجمالي المساحة الطابقية التي يعطيها هذا الغلاف ويعرض لك النسبة.',
      },
    },
    areaLabel: 'المساحة القابلة للبيع (م²)',
    areaPlaceholder: (example: string): string => `مثلا ${example}`,
    areaHelp:
      'يقسم المحرك هذه المساحة على إجمالي المساحة الطابقية التي يعطيها هذا الغلاف، ويعرض لك النسبة الناتجة بجوار الإجابة. فإن لم تكن تلك النسبة ما تتوقعه، فأحد الرقمين خطأ.',
    areaInvalid: 'مساحة أكبر من صفر، بالمتر المربع.',
  },

  run: {
    busy: 'جاري الحساب…',
    idle: 'احسب السعة',
    needsParking: 'أجب عن سؤال المواقف أعلاه للمتابعة.',
    needsEfficiency:
      'أدخل حصة المساحة القابلة للبيع من إجمالي المساحة الطابقية للمتابعة. وليست إجراء شكليا — فهي تحرك عدد الوحدات بمقدار كل ما ليس قابلا للبيع.',
    needsSaleableArea:
      'أدخل المساحة القابلة للبيع للمتابعة. وليست إجراء شكليا — فهي تحرك عدد الوحدات بمقدار كل ما ليس قابلا للبيع.',
  },
};
