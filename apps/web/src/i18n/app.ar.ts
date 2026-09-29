/**
 * العربية — `/app`: غلاف المحرك، وشريط الخطوات، واللوحات التي يكتبها `App.tsx` بنفسه.
 *
 * Held to `AppDictionary` by the type system, so this file cannot be missing a key
 * and cannot grow one the English does not have. Every choice is argued in
 * `docs/05-design/arabic-glossary.md`; the comments here record only what would
 * otherwise read as a mistranslation.
 *
 * THE STEP LABELS are the glossary's own terms, so a step and the page that talks
 * about it do not call one thing by two names: «القطعة»، «السعة»، «المواقف»،
 * «الفحوصات». §5b replaced «الطاقة» with «السعة» — «الطاقة» is energy first, and
 * «السعة التطويرية» is the term that appears in a feasibility study.
 *
 * NO DIGIT BELOW, in either script. Where the English helper takes a figure — the
 * threshold in "within 1%", the paper in "(A3)", the "3D" and the format version —
 * the Arabic either places the argument where Arabic word order puts it or, for
 * "3D", says «ثلاثي الأبعاد» and has no use for it.
 *
 * NO HEDGE. The refusals on this screen — the engine stopped, the numbers are not
 * an assessment, the licence is recorded and not verified — carry no «قد» and no
 * «ربما». And no «نحن»: "We record it; we cannot verify it" becomes the software
 * speaking of itself in the third person, as §3 of the glossary requires.
 *
 * NO DIACRITICS, per §5. Where a word needed a mark to be read — «حُسبت», «وُزِّع»,
 * «وقِّع» — the word itself was changed rather than propped up: «زمن الحساب»,
 * «بعد توزيع المواقف», «أضف توقيعك». A mark is a way of rescuing a word that is
 * not carrying its own meaning.
 */

import type { AppDictionary } from './app.en.js';

export const AR: AppDictionary = {
  steps: {
    nav: 'الخطوات',
    labels: {
      /* The step reads the affection plan sheet. «المخطط» is that sheet; the
         step's own heading names the instrument in full on first use. */
      intake: 'المخطط',
      plot: 'القطعة',
      /* «المعطيات», not «الوسائط». A consultant calls the figures he is handed
         «معطيات المشروع»; «وسائط» reads first as media. */
      parameters: 'المعطيات',
      rules: 'القواعد',
      assumptions: 'الافتراضات',
      capacity: 'السعة',
      parking: 'المواقف',
      checks: 'الفحوصات',
      evidence: 'الأدلة',
      export: 'التصدير',
    },
    locked: 'أكمل الخطوات السابقة أولا',
    lockedSr: ' (غير متاحة بعد)',

    /*
      THE FOOTER. «رجوع إلى» و«المتابعة إلى» يسبقان اسم الخطوة، والاسم مقروء من
      `labels` أعلاه — فالشريط والتذييل يسميان الخطوة نفسها بالكلمة نفسها.

      لا كلمة اتجاه هنا: «يمين» و«يسار» تنقلبان بين اللغتين، والسهم زخرفة يقلبها
      `app.css`. والجملة في `needs` تسمي الفعل الذي يفتح الخطوة، لا سبب المنع — زر
      معطل بلا جملة طريق مسدود، وهو الرفض الوحيد الذي لا يجوز لهذا المنتج أن يقدمه.
    */
    footer: {
      nav: 'التنقل بين الخطوات',
      backBefore: 'رجوع إلى ',
      nextBefore: 'المتابعة إلى ',
      needs: {
        plot: 'أدخل القطعة أولا، وتفتح هذه الخطوة.',
        confirm: 'أكد بيانات القطعة أولا، وتفتح هذه الخطوة.',
        run: 'ابدأ الحساب في خطوة القواعد أولا، وتفتح هذه الخطوة.',
      },
      end: 'هذه آخر خطوة.',
    },
  },

  /*
    The same fragments, and the same Arabic quotation marks, as the antechamber's
    unrecognised-step line — one refusal, one set of words, on both screens that
    make it.
  */
  hint: {
    unknownLead: 'لا توجد خطوة اسمها «',
    unknownBetween: '». والخطوات هي: ',
    unknownTail: '.',
    lockedLead: 'لا تفتح خطوة «',
    lockedTail: '» إلا حين يصير لدى الخطوات التي قبلها ما تقرؤه.',
  },

  draft: {
    title: 'هذه الأرقام ليست تقييما.',
    fallback:
      'قامت هذه الدراسة على قواعد مسودة بمراجع نائبة. وهي تعرض عمل المحرك، ولا تقيس هذه القطعة.',
  },

  demo: {
    title: 'هذا هو المثال المحسوب المعروض في الصفحة الرئيسية.',
    body:
      'القطعة وحدودها الأربعة، ومعالجة المواقف في معامل البناء، وعدد الأدوار، ' +
      'وكفاءة المساحة القابلة للبيع، وخليط الوحدات — كلها مملوءة من تلك الدراسة، ' +
      'ولك أن تغير أيا منها قبل أن يحسب أي شيء.',
    reproduces: 'اتركها كما هي، وتكون السعة الناتجة هي نفسها التي تنشرها تلك الصفحة.',
  },

  /* The chrome's own words for the same two facts, from `chrome.ar.ts`. */
  build: {
    engine: 'المحرك ',
    annex: ' · ملحق التعريفات',
    unreported: 'غير معلن',
    unsigned: 'غير موقع',
  },

  header: {
    /* «زمن الحساب», not «حُسبت في»: unvowelled, «حسبت» is read as the active
       «حَسَبت», which puts the reader in the sentence instead of the engine. */
    computedIn: (ms: string): string => `زمن الحساب ${ms} ملي ثانية`,
    /* The unit symbol stays Latin on the chip, as m and m² do everywhere. */
    elapsed: (ms: string): string => `${ms} ms`,
    change: 'تعديل',
  },

  /*
    «توقف المحرك هنا» — the engine's refusal is the product working, stated as a
    fact about the engine and not as a failure to apologise for. The sentence under
    it is the API's own and is rendered as the API wrote it.
  */
  error: {
    blocked: 'توقف المحرك هنا',
    failed: 'حدث خطأ ما',
    blockedAt: 'توقف عند: ',
    dismiss: 'إغلاق',
  },

  envelope: {
    title: 'الغلاف البنائي',
    subtitle: 'كل بعد يسمي القيد الذي أنتجه.',
    fields: {
      setbackPermittedFootprint: 'مسطح البناء الذي تسمح به الارتدادات',
      coverageCap: 'حد نسبة التغطية',
      podiumFootprint: 'مسطح البوديوم',
      towerPlate: 'مسطح البرج',
      heightCeiling: 'حد الارتفاع',
      levelsByHeight: 'عدد الأدوار وفق حد الارتفاع',
    },
    /* «يلزم» and «القيد الملزم» — the binding LIMIT. «الحاكم» is kept for the
       governing BAND and the two are not collapsed into «المحدد». */
    bindsTitle: 'ما الذي يلزم كل بعد',
    columns: {
      dimension: 'البعد',
      binding: 'القيد الملزم',
      value: 'القيمة',
      nextClosest: 'الأقرب بعده',
    },
    /*
      THE ENGINE'S DIMENSION TOKENS, LABELLED — the four the capacity package
      emits. The token is a name for a row, the way `ROAD` is a name for an edge,
      and the label is what the interface calls it. A token not in this table is
      shown as the engine wrote it, never guessed at.
    */
    dimensions: {
      podium_footprint: 'مسطح البوديوم',
      tower_plate: 'مسطح البرج',
      levels: 'عدد الأدوار',
      governing_capacity: 'السعة الحاكمة',
    },
    runnerUpAt: ' عند ',
    within: (threshold: string): string => `ضمن ${threshold}`,
    /*
      A LABEL AND A COUNT, NOT A COUNTED NOUN. Arabic agreement between a numeral
      and «دورة» changes form at one, two, three-to-ten and eleven-plus, and the
      count here is the run's. A counted noun would need all four forms to be
      right; the label form is right for every count.
    */
    iterations: (count: number, converged: boolean): string =>
      `عدد دورات حل الارتدادات: ${count}${converged ? '' : '، ولم يستقر الحل'}`,
    fixpointNote:
      'ارتداد الحد يتوقف على عدد الأدوار، وعدد الأدوار يتوقف على مسطح البناء، ومسطح البناء يتوقف على الارتداد. يبدأ المحرك من أشد عدد أدوار معقول تقييدا، ويعيد الدورة حتى تستقر القواعد المنطبقة وقيمها على حال واحدة.',
  },

  parking: {
    title: 'المواقف',
    subtitle: 'الطلب، ثم المعروض، ثم ما يستطيع المعروض أن يخدمه فعلا.',
    fields: {
      residentBays: 'مواقف السكان',
      visitorBays: 'مواقف الزوار',
      totalBays: 'مجموع المواقف',
      areaPerBay: 'المساحة لكل موقف',
      areaRequired: 'المساحة المطلوبة',
      levelsRequired: 'الأدوار المطلوبة',
      levelsAvailable: 'الأدوار المتاحة',
      unitsCarried: 'الوحدات التي تكفيها المواقف',
    },
  },

  parkingStep: {
    drawingsTitle: 'الرسومات',
    /*
      «مفترض» for the factor — the assumed divisor the supply figure rests on. The
      sentence exists to say the headline parking figure was NOT this drawing, and
      it keeps both halves: the drawing is real, and it is not what fixed the
      answer.
    */
    drawingsSubtitle:
      'كل دور مواقف بمواقفه مرقمة وفي كل موقف سيارة، ومخطط الموقع، والدور المتكرر، ومقطعان، وكلها مرسومة من المبنى الواحد الذي حسبه المحرك. وعدد مواقف لا يمكن توزيعه على الدور ليس عدد مواقف. غير أن رقم المعروض الذي ثبت السعة الحاكمة لم يأت من هذا الرسم: جاء من مساحة متاحة مقسومة على معامل مفترض، حسبت قبل توزيع الدور أصلا. والفارق بين الاثنين معروض في صفحة المواقف.',
    levelAsPacked: 'الدور بعد توزيع المواقف',
    noLevelTitle: 'لا يوجد دور مواقف موزع لهذه القطعة.',
    noReason: 'لم يذكر المحرك سببا، وهذا في حد ذاته أمر يستحق أن يثار.',
    noLevelTail: 'أرقام الطلب أعلاه قائمة — الناقص هو الرسم، لا الحساب.',
  },

  export: {
    title: 'التصدير',
    subtitle:
      'لا يخرج أي ملف قبل أمرين: أن تكون قد اطلعت على الافتراضات، وأن يكون أحد قد وضع اسمه على الناتج.',

    assumptionsRead: 'الاطلاع على الافتراضات',
    /* A label and a count, for the reason `envelope.iterations` gives. */
    assumptionCount: (count: number): string => `عدد الافتراضات في هذه الدراسة: ${count}.`,
    readThem: 'اقرأها في سجل الافتراضات',

    signedBy: 'موقع من مراجع محدد بالاسم',
    reviewerBefore: 'يسجل ',
    reviewerAfter: ' بصفته المراجع.',
    /*
      «ولا تستطيع هذه البرمجية التحقق منه» — the English "we cannot verify it",
      said in the third person because the product does not say «نحن». The denial
      uses the reader's own word, «التحقق», as the antechamber does: softer here
      would answer a question nobody asked.
    */
    noLicence:
      'أضف رقم رخصتك المهنية حتى توقع. يسجل الرقم، ولا تستطيع هذه البرمجية التحقق منه.',
    sign: 'أضف توقيعك على هذا الناتج',

    preparing: 'جاري الإعداد…',
    exportReport: 'تصدير التقرير',
    notReady:
      'لا بد من استيفاء الأمرين أعلاه أولا. وليس أي منهما إجراء شكليا: أحدهما يسجل أن شخصا اطلع على ما افترضه المحرك حيث لا تحسم قاعدة، والآخر يسجل من وضع اسمه على الناتج.',

    fixedBefore: 'الدراسة ',
    fixedAfter: ' ثابتة على حالها. وتعديل افتراض من هنا ينشئ دراسة جديدة ويترك هذه كما هي.',

    runFingerprint: 'بصمة الدراسة',
    runFingerprintNote: ' — المدخلات والإصدارات ومجموعة القواعد',
    reportFingerprint: 'بصمة التقرير',
    reportFingerprintBefore: '— بخوارزمية ',
    reportFingerprintAfter: ' على المحتوى',

    annexTitle: 'ملحق تعريفات المقاييس غير موقع.',

    openReport: 'افتح التقرير',
    openDrawingSet: (paper: string): string => `افتح مجموعة الرسومات (${paper})`,
    printReport: 'احفظ التقرير بصيغة PDF',
    printDrawingSet: (paper: string): string => `احفظ مجموعة الرسومات بصيغة PDF (${paper})`,
    pdfNote:
      'متصفحك هو الذي يكتب ملف PDF من المستند نفسه — اختر «الحفظ بصيغة PDF» في نافذة ' +
      'الطباعة. مقاس الورق والهوامش ومواضع قطع الصفحات كلها داخل المستند أصلا، فتخرج ' +
      'الصفحة بترتيب واحد لا اثنين: كاتب ثان على الخادم كان سيرتب التقرير نفسه بمحرك ' +
      'مختلف، ويوم يختلف المحركان تكون النسخة التي حفظتها هي التي لم يقرأها أحد.',
    openJson: 'افتح مخرجات JSON',
    downloadDxf: 'نزل رسم CAD (DXF)',
    downloadModel: (): string => 'نزل النموذج ثلاثي الأبعاد (glTF)',
    downloadXlsx: 'نزل المصنف (XLSX)',

    cad: {
      lead: (): string =>
        'رسم CAD هو المبنى كاملا: كل دور مواقف على منسوبه وفي كل موقف سيارة، والمنحدرات (الرامبات) سطوحا مائلة بين الأدوار، وكتلة المبنى بأوجهها الثلاثية الأبعاد. ولكل دور طبقاته — ',
      between: '، ',
      afterLayers:
        ' — فيستطيع المراجع أن يطفئ دورا واحدا، أو نوعا واحدا من العناصر فيه. أما Revit وIFC فهما ',
      /* «غير» carries the emphasis the English puts on "not". */
      not: 'غير',
      tail:
        ' مدرجين: فتبادل ملفات IFC ذهابا وإيابا دون فقد عمل قائم بذاته لم تدرجه هذه المرحلة في نطاقها، والملف الرديء البنية أسوأ من غيابه.',
    },

    glb: {
      lead: (): string => 'النموذج ثلاثي الأبعاد هو العرض ثلاثي الأبعاد في خطوة السعة، في ملف ',
      /*
        "extension" is a glTF extension, not a file extension — «امتدادات الصيغة»
        says which. The two sentences are the permanent pair every export carries,
        and «نفسهما» keeps them the same two.
      */
      tail: (_threeD: string, format: string): string =>
        `: بصيغة ${format} الثنائية، دون أي امتداد من امتدادات الصيغة يلزم القارئ بدعمه. ووحدته المتر، مقيسا من منتصف القطعة، وفيه عقدة لكل دور ولسياراته. ويحمل الجملتين نفسهما في بياناته الوصفية، لأن الملف ثلاثي الأبعاد لا خانة عنوان فيه تطبعان فيها.`,
    },

    oneSheet: 'لوحة واحدة في كل مرة',
    sheetBefore: 'نزل ',
    sheetBetween: ': ',
    sheetAfter: ' (DXF)',
  },
};
