/**
 * العربية — `/app`: غلاف المحرّك، وشريط الخطوات، واللوحات التي يكتبها `App.tsx` بنفسه.
 *
 * Held to `AppDictionary` by the type system, so this file cannot be missing a key
 * and cannot grow one the English does not have. Every choice is argued in
 * `docs/05-design/arabic-glossary.md`; the comments here record only what would
 * otherwise read as a mistranslation.
 *
 * THE STEP LABELS are the glossary's own terms, so a step and the page that talks
 * about it do not call one thing by two names: «القطعة»، «الطاقة»، «المواقف»،
 * «الفحوص» — the words `dashboard.ar.ts` already uses for the same columns.
 * «الوسائط» for Parameters is the dashboard's word for a parameter, kept for the
 * same reason.
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
 */

import type { AppDictionary } from './app.en.js';

export const AR: AppDictionary = {
  steps: {
    nav: 'الخطوات',
    labels: {
      /* The step reads the affection plan sheet. «المخطّط» is that sheet; the
         step's own heading names the instrument in full on first use. */
      intake: 'المخطّط',
      plot: 'القطعة',
      parameters: 'الوسائط',
      rules: 'القواعد',
      assumptions: 'الافتراضات',
      capacity: 'الطاقة',
      parking: 'المواقف',
      checks: 'الفحوص',
      evidence: 'الأدلّة',
      export: 'التصدير',
    },
    locked: 'أكمل الخطوات السابقة أولًا',
    lockedSr: ' (غير متاحة بعد)',

    /*
      THE FOOTER. «رجوع إلى» و«تابِع إلى» يسبقان اسم الخطوة، والاسم مقروء من `labels`
      أعلاه — فالشريط والتذييل يسمّيان الخطوة نفسها بالكلمة نفسها.

      لا كلمة اتجاه هنا: «يمين» و«يسار» تنقلبان بين اللغتين، والسهم زخرفة يقلبها
      `app.css`. والجملة في `needs` تسمّي الفعل الذي يفتح الخطوة، لا سبب المنع — زرّ
      معطّل بلا جملة هو طريق مسدود، وهو الرفض الوحيد الذي لا يجوز لهذا المنتج أن يقدّمه.
    */
    footer: {
      nav: 'التنقّل بين الخطوات',
      backBefore: 'رجوع إلى ',
      nextBefore: 'تابِع إلى ',
      needs: {
        plot: 'أنشئ القطعة أولًا، وتُفتَح هذه الخطوة.',
        confirm: 'أكّد القطعة أولًا، وتُفتَح هذه الخطوة.',
        run: 'شغّل المحرّك في خطوة القواعد أولًا، وتُفتَح هذه الخطوة.',
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
    lockedLead: 'لا تُفتَح خطوة «',
    lockedTail: '» إلا حين يصير لدى الخطوات التي قبلها ما تقرؤه.',
  },

  draft: {
    title: 'هذه الأرقام ليست تقييمًا.',
    fallback:
      'استخدمت هذه التشغيلة قواعد مسوّدة باستشهادات نائبة. إنها تعرض عمل المحرّك، ولا تقيس هذه القطعة.',
  },

  /* The chrome's own words for the same two facts, from `chrome.ar.ts`. */
  build: {
    engine: 'المحرّك ',
    annex: ' · ملحق التعريفات',
    unreported: 'غير مُبلَّغ عنه',
    unsigned: 'غير موقَّع',
  },

  header: {
    computedIn: (ms: string): string => `حُسبت في ${ms} ملّي ثانية`,
    /* The unit symbol stays Latin on the chip, as m and m² do everywhere. */
    elapsed: (ms: string): string => `${ms} ms`,
    change: 'غيِّر',
  },

  /*
    «توقّف المحرّك هنا» — the engine's refusal is the product working, stated as a
    fact about the engine and not as a failure to apologise for. The sentence under
    it is the API's own and is rendered as the API wrote it.
  */
  error: {
    blocked: 'توقّف المحرّك هنا',
    failed: 'حدث خطأ ما',
    blockedAt: 'أُوقِف عند: ',
    dismiss: 'إغلاق',
  },

  envelope: {
    title: 'الغلاف البنائي',
    subtitle: 'كل بُعد يُسمّي القيد الذي أنتجه.',
    fields: {
      setbackPermittedFootprint: 'مسطّح البناء الذي تسمح به الارتدادات',
      coverageCap: 'حدّ نسبة التغطية',
      podiumFootprint: 'مسطّح المصطبة',
      towerPlate: 'لوح البرج',
      heightCeiling: 'حدّ الارتفاع',
      levelsByHeight: 'الطوابق وفق حدّ الارتفاع',
    },
    /* «يُلزِم» and «القيد المُلزِم» — the binding LIMIT. «الحاكم» is kept for the
       governing BAND and the two are not collapsed into «المحدِّد». */
    bindsTitle: 'ما الذي يُلزِم كل بُعد',
    columns: {
      dimension: 'البُعد',
      binding: 'القيد المُلزِم',
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
      podium_footprint: 'مسطّح المصطبة',
      tower_plate: 'لوح البرج',
      levels: 'الطوابق',
      governing_capacity: 'الطاقة الحاكمة',
    },
    runnerUpAt: ' عند ',
    within: (threshold: string): string => `ضمن ${threshold}`,
    /*
      A LABEL AND A COUNT, NOT A COUNTED NOUN. Arabic agreement between a numeral
      and «تكرار» changes form at one, two, three-to-ten and eleven-plus, and the
      count here is the run's. A counted noun would need all four forms to be
      right; the label form is right for every count.
    */
    iterations: (count: number, converged: boolean): string =>
      `تكرارات حلّ الارتدادات: ${count}${converged ? '' : '، ولم يتقارب الحلّ'}`,
    fixpointNote:
      'يتوقّف ارتداد الحدّ على عدد الطوابق، ويتوقّف عدد الطوابق على مسطّح البناء، ويتوقّف مسطّح البناء على الارتداد. يبدأ الحلّال بعدد الطوابق عند أشدّ قيمة معقولة تقييدًا، ويُكرّر حتى تكفّ القواعد المنطبقة وقيمها المحسومة عن التغيّر.',
  },

  parking: {
    title: 'المواقف',
    subtitle: 'الطلب، ثم العرض، ثم ما يستطيع العرض أن يحمله فعلًا.',
    fields: {
      residentBays: 'مواقف السكّان',
      visitorBays: 'مواقف الزوّار',
      totalBays: 'مجموع المواقف',
      areaPerBay: 'المساحة لكل موقف',
      areaRequired: 'المساحة المطلوبة',
      levelsRequired: 'الطوابق المطلوبة',
      levelsAvailable: 'الطوابق المتاحة',
      unitsCarried: 'الوحدات التي تكفيها المواقف',
    },
  },

  parkingStep: {
    drawingsTitle: 'الرسومات',
    /*
      «مُفترَض» for the factor — the assumed divisor the supply figure rests on. The
      sentence exists to say the headline parking figure was NOT this drawing, and
      it keeps both halves: the drawing is real, and it is not what fixed the
      answer.
    */
    drawingsSubtitle:
      'كل طابق مواقف بمواقفه مُرقَّمةً وفي كل موقف سيارة، ومخطّط الموقع، والطابق المتكرّر، ومقطعان، وكلها مرسومة من المبنى الواحد الذي حسبه المحرّك. عدد المواقف الذي لا يمكن توزيعه ليس عدد مواقف — لكنّ رقم العرض الذي ثبّت الطاقة الحاكمة لم يكن هذا الرسم. كان مساحةً متاحة مقسومةً على معامل مُفترَض، حُسبت قبل أن يُوزَّع الطابق أصلًا. ويُقارَن بينهما في صفحة المواقف.',
    levelAsPacked: 'الطابق كما وُزِّع',
    noLevelTitle: 'لم يُوزَّع أي طابق مواقف لهذه القطعة.',
    noReason: 'لم يُبلِّغ المحرّك عن سبب، وهذا في حدّ ذاته أمر يستحقّ أن يُثار.',
    noLevelTail: 'أرقام الطلب أعلاه قائمة — الناقص هو الرسم، لا الحساب.',
  },

  export: {
    title: 'التصدير',
    subtitle:
      'لا بدّ أن يتحقّق أمران قبل أن يخرج أيّ شيء: أن تكون قرأت الافتراضات، وأن يكون أحدٌ وضع اسمه عليه.',

    assumptionsRead: 'قُرئت الافتراضات',
    /* A label and a count, for the reason `envelope.iterations` gives. */
    assumptionCount: (count: number): string => `عدد الافتراضات في هذه التشغيلة: ${count}.`,
    readThem: 'اقرأها في سجلّ الافتراضات',

    signedBy: 'موقَّع من مراجِع مُسمّى',
    reviewerBefore: 'سيُسجَّل ',
    reviewerAfter: ' بصفته المراجِع.',
    /*
      «ولا تستطيع هذه البرمجية التحقّق منه» — the English "we cannot verify it",
      said in the third person because the product does not say «نحن». The denial
      uses the reader's own word, «التحقّق», as the antechamber does: softer here
      would answer a question nobody asked.
    */
    noLicence:
      'أضف رقم رخصتك المهنية لتوقّع. يُسجَّل الرقم، ولا تستطيع هذه البرمجية التحقّق منه.',
    sign: 'وقِّع هذا المُخرَج',

    preparing: 'جارٍ الإعداد…',
    exportReport: 'صدِّر التقرير',
    notReady:
      'لا بدّ أن يتحقّق الأمران أعلاه أولًا. وليس أيٌّ منهما إجراءً شكليًّا: أحدهما يُسجّل أنّ شخصًا قرأ ما اضطُرّ المحرّك إلى افتراضه، والآخر يُسجّل من وضع اسمه على الناتج.',

    fixedBefore: 'التشغيلة ',
    fixedAfter:
      ' ثابتة على حالها. وتعديل افتراضٍ من هنا يُنشئ تشغيلة جديدة ويترك هذه كما هي.',

    runFingerprint: 'بصمة التشغيلة',
    runFingerprintNote: ' — المدخلات والإصدارات ومجموعة القواعد',
    reportFingerprint: 'بصمة التقرير',
    reportFingerprintBefore: '— بخوارزمية ',
    reportFingerprintAfter: ' على المحتوى',

    annexTitle: 'ملحق تعريفات المقاييس غير موقَّع.',

    openReport: 'افتح التقرير',
    openDrawingSet: (paper: string): string => `افتح مجموعة الرسومات (${paper})`,
    openJson: 'افتح مُخرَج JSON',
    downloadDxf: 'نزِّل رسم CAD (DXF)',
    downloadModel: (): string => 'نزِّل النموذج ثلاثي الأبعاد (glTF)',
    downloadXlsx: 'نزِّل المصنَّف (XLSX)',

    cad: {
      lead: (): string =>
        'رسم CAD هو المبنى كاملًا: كل طابق مواقف على منسوبه وفي كل موقف سيارة، والمنحدرات سطوحًا مائلة بين الطوابق، والكتلة البنائية مُقامةً وجوهًا ثلاثية الأبعاد. ولكل طابق طبقاته — ',
      between: '، ',
      afterLayers:
        ' — فيستطيع المراجِع أن يُطفئ طابقًا واحدًا، أو نوعًا واحدًا من العناصر فيه. أمّا Revit وIFC فهما ',
      /* «غير» carries the emphasis the English puts on "not". */
      not: 'غير',
      tail:
        ' مُضمَّنين: فنقل IFC ذهابًا وإيابًا دون فقدٍ عملٌ قائم بذاته لم تُسعِّره هذه المرحلة، والملف الرديء البنية أسوأ من غيابه.',
    },

    glb: {
      lead: (): string => 'النموذج ثلاثي الأبعاد هو العرض ثلاثي الأبعاد في خطوة الطاقة، في ملف ',
      /*
        "extension" is a glTF extension, not a file extension — «امتدادات الصيغة»
        says which. The two sentences are the permanent pair every export
        carries, and «نفسيهما» keeps them the same two.
      */
      tail: (_threeD: string, format: string): string =>
        `: بصيغة ${format} الثنائية، دون أي امتداد من امتدادات الصيغة يُلزَم القارئ بدعمه. ووحدته المتر، مقيسًا من منتصف القطعة، وفيه عقدةٌ لكل طابق ولسياراته. ويحمل الجملتين نفسيهما في بياناته الوصفية، لأنّ الملف ثلاثي الأبعاد لا خانة عنوان فيه تُطبَعان فيها.`,
    },

    oneSheet: 'ورقة واحدة في كل مرّة',
    sheetBefore: 'نزِّل ',
    sheetBetween: ': ',
    sheetAfter: ' (DXF)',
  },
};
