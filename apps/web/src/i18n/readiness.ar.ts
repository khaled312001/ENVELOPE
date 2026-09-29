/**
 * العربية — صفحة الجاهزية `/readiness`.
 *
 * Held to `ReadinessDictionary` by the type system, so this file cannot be missing a
 * key and cannot grow one the English does not have. Every choice below is argued in
 * `docs/05-design/arabic-glossary.md`; the comments here record only what would
 * otherwise read as a mistranslation.
 *
 * ---------------------------------------------------------------------------
 * THE FOUR THINGS THIS PAGE MAY NOT SOFTEN, AND HOW THE ARABIC HOLDS THEM.
 *
 * 1. THE ZEROS. Approved rules and signed definitions both read zero, and the copy
 *    around them states it without a cushion. «لم يخضع للتقييم» is the absence of
 *    an act — never «غير صالح» and never «غير مطابق», which are verdicts and would
 *    convert a refusal to assess into an adverse finding.
 *
 * 2. NO COMPOSITE. «لا يوجد رقم مركب على هذه الصفحة» is a flat declarative, and
 *    §9 stays as short in Arabic as it is in English. Arabic marketing register
 *    elaborates and warms; elaboration here would soften a refusal by tone while
 *    translating it correctly word for word.
 *
 * 3. NO HEDGE. Not one «قد» and not one «ربما» anywhere below. A hedge inside a
 *    refusal is a claim.
 *
 * 4. «مفترض», never «افتراضي». The second means *default* — the one thing this
 *    codebase forbids having, and the word an unwary translator reaches for first.
 *
 * ---------------------------------------------------------------------------
 * THE TRADE TERMS, NOT THE DICTIONARY ONES. `معامل البناء` for FAR and not
 * `نسبة الأرضية`; `المواقف` for parking and not `أماكن الوقوف`; `بوابة` for a
 * gate; `فحص الحفظ` for an invariant; `دراسة` for a run; `السعة` for capacity. A
 * Dubai consultant who meets the dictionary-correct word instead of the trade one
 * concludes in one line that the product does not know the field.
 *
 * DIGITS STAY LATIN and no figure is written here at all. The four helpers carry
 * Arabic WORD ORDER around figures the payload supplies and never a value.
 */

import { createElement, Fragment, type ReactNode } from 'react';

import type { ReadinessDictionary } from './readiness.en.js';
import { Verbatim } from './locale.js';

/**
 * The seed-rules paragraph, which has an engine string set inside a sentence.
 *
 * `APPROVED / DEVELOPMENT-ONLY-NOT-A-REAL-APPROVER` is what the development loader
 * actually stamps on a record. It is not copy, it is evidence, so it is carried
 * verbatim inside a `Verbatim` — `dir="ltr" lang="en"` with `unicode-bidi: isolate`
 * — and the Arabic reorders around it rather than through it.
 *
 * Built with `createElement` rather than JSX because a dictionary is a `.ts` module:
 * one screen is three files, and adding a JSX build to two of them to carry one
 * `<code>` would be a worse trade than four lines of `createElement`.
 */
const SEED_RULES_BODY: ReactNode = createElement(
  Fragment,
  null,
  'يختم محمل التطوير كل قاعدة بالوسم ',
  createElement(
    Verbatim,
    null,
    createElement(
      'code',
      { className: 'ident' },
      'APPROVED / DEVELOPMENT-ONLY-NOT-A-REAL-APPROVER',
    ),
  ),
  ' حتى يمكن تشغيل عرض توضيحي. واحتساب ذلك جعل كل قاعدة في هذا النشر تظهر معتمدة ' +
    'والرقم الحقيقي صفر. فتحتسب الجاهزية على السجلات الأولية نفسها، والرقم الذي تنتجه ' +
    'هو الرقم على هذه الصفحة.',
);

export const AR: ReadinessDictionary = {
  /*
    The letters stay Latin. A، B، C are the engine's names for the three bands and
    they appear on the report and on every export; a reader matching this page
    against one of those needs the same letter on both pages.
  */
  bands: {
    REGULATORY: 'تنظيمي (A)',
    GEOMETRIC: 'هندسي (B)',
    PARKING: 'مواقف (C)',
  },

  ofTotal: (part: string, total: string): string => `${part} من ${total}`,

  fetch: {
    errorTitle: 'تعذر على هذه الصفحة قراءة النشر.',
    loading: 'جاري قراءة النشر…',
  },

  dateline: {
    live: 'قراءة حية من النشر الذي تتصل به.',
    snapshotBefore: 'أنت غير مسجل الدخول، فهذه لقطة أعدت في',
    snapshotAfter: 'من دراسة جرى التحقق منها، لا قراءة حية.',
    engine: 'المحرك',
  },

  blocking: {
    /*
      The scope is the DEPLOYMENT, not the page — «لا شيء مما ينتج هنا», which
      covers everything the engine emits, and not «لا شيء على هذه الصفحة», which
      would disclaim the page and leave the deployment unqualified underneath the
      engine's own blocking sentence.
    */
    title: 'لا شيء مما ينتج هنا تقييم للسعة التطويرية.',
  },

  notReady: {
    title: 'ما ليس جاهزا',
    /*
      «رقم الجاهزية», not «الرقم». The English qualifies the noun — "a READINESS
      figure that has been met" — and the qualifier is the sentence: the rule is
      about the counts in §3 and not about every figure on the page. An Arabic that
      drops it reads as a claim over the volume counts in §5 as well, which are not
      readiness figures and are not held to this rule. A qualifier lost in
      translation is the defect the reader of the original can never see.
    */
    ledeBefore:
      'كل رقم هنا عد لشيء قابل للعد، ووراء كل منها إجراء بشري محدد بالاسم. ولا تتحول ' +
      'بطاقة إلى اللون الأخضر: رقم الجاهزية الذي تحقق يذكر صريحا لا أكثر، لأن اللون ' +
      'الذي يقول',
    ledeEmphasis: 'تم',
    ledeAfter: 'يقرأ أسرع من العدد المجاور له.',

    rules: {
      label: 'القواعد المعتمدة من مهني محدد بالاسم',
      /*
        THE IDENTIFIER MOVES, THE SENTENCE DOES NOT.

        English opens with `FR-RUL-001` and Arabic opens with the verb, so the verb
        goes in `noteBefore` — which is empty in English — and the rest follows the
        identifier. The identifier itself is never translated and never moved into
        a string.
      */
      noteBefore: 'تشترط ',
      noteAfter:
        ' موافقة معتمد بشري مؤهل على كل قاعدة. ويختم نائب التطوير مجموعة القواعد ' +
        'الأولية بالاعتماد حتى يمكن تشغيل عرض توضيحي أصلا، ولا يحتسب هذا النائب هنا.',
    },

    definitions: {
      label: 'تعريفات المقاييس الموقعة',
      annexLabel: 'الملحق',
      /* Arabic comma. The Latin one reads as an interruption in Arabic type. */
      annexSeparator: '، ',
      signed: 'موقع',
      unsigned: 'غير موقع',
      afterSigned: '. ',
      noteBefore: 'يمنع ',
      noteAfter:
        ' حساب أي حد مساحي لا يرد تعريفه في ملحق موقع، ولذلك حسبت كل مساحة على كل شاشة ' +
        'أمام تعريف نائب.',
    },

    invariants: {
      label: 'فحوصات الحفظ التي جرت في آخر دراسة',
      note:
        'لم تجد البقية ما تقرؤه: تحتاج إلى جدول وحدات وجدول لكل دور لا تنتجهما هذه ' +
        'المرحلة. وتعلن بما جرى من الإجمالي، لا بعلامة صح ولا بنسبة مئوية.',
    },

    dormant: {
      heading: 'السكون ليس اجتيازا.',
      body:
        'الفحص الساكن فحص لم يجد ما يقرؤه — يحتاج إلى جدول وحدات وجدول لكل دور لا ' +
        'تنتجهما هذه المرحلة. وإنتاج أحدهما لإيقاظه تحقق من المحرك أمام ناتجه هو، ' +
        'فيعلن العدد بما جرى من الإجمالي وتسمى الفحوصات الساكنة. لا علامة صح، ولا لون ' +
        'أخضر، ولا نسبة مئوية: فالنسبة تدعو القارئ إلى ملء الباقي باجتيازات.',
    },
    seedRules: {
      heading: 'يحتسب على السجلات الأولية، لا على محمل التطوير إطلاقا.',
      body: SEED_RULES_BODY,
    },
  },

  change: {
    title: 'ما الذي يغير هذه الأرقام',
    lede:
      'وراء كل رقم أعلاه شخص ومنتج. ولا يحمل أي منها تاريخا، وذلك مقصود: فالمسؤول خطة، ' +
      'والتاريخ وعد.',
    architect: {
      owner: 'مهندس معماري مرخص في دبي',
      title: 'تحرير كل قاعدة أمام الوثيقة النظامية التي تستشهد بها، واعتمادها بالاسم',
      body:
        'هذا وحده يحرك رقم القواعد المعتمدة، ولا يحركه غيره. ويسجل المعتمد على القاعدة ' +
        'نفسها، فالعدد أعلاه عد توقيعات لا عد سجلات.',
    },
    annex: {
      owner: 'مراجع محدد بالاسم للملحق',
      title: 'مراجعة ملحق تعريفات المقاييس وتوقيعه',
      body:
        'هذا هو ما يرفع الحجب عن كل حد مساحي على كل شاشة. وما لم يوقع، فكل مساحة حسبت ' +
        'هنا حسبت أمام تعريف نائب، والمحرك يقول ذلك على كل واحدة منها.',
    },
    schedule: {
      owner: 'مرحلة لاحقة من المحرك',
      title: 'إنتاج جدول وحدات وجدول لكل دور، وقراءة الفحوصات الساكنة له',
      body:
        'إنتاج جدول هنا لإيقاظها تحقق من المحرك أمام ناتجه هو. فتبقى ساكنة، وتسمى في كل ' +
        'ناتج، ويقف العدد أعلاه دون إجماليه في العلن.',
    },
  },

  volume: {
    title: 'ما جرى تشغيله',
    ledeSnapshot:
      'أنت غير مسجل الدخول، فهذه أعداد مخزن العرض التوضيحي المهيأ: المثال المحسوب ' +
      'الاصطناعي، لا غير.',
    ledeLive: 'هذه هي الأعداد التي يحملها النشر الذي تتصل به.',
    ledeTail:
      'ويقع النشاط تحت الجاهزية على هذه الصفحة عن قصد. فالصفحة التي تبدأ بالحجم تقيس ' +
      'الحركة وتسميها تقدما.',

    plots: 'قطع الأرض',
    runs: 'الدراسات',
    reviewed: 'المراجعة والموقعة',
    reviewedNoteBefore: 'لا تغادر الدراسة المبنى إلا بعد أن يضع شخص رقم رخصته بجانبها عند ',
    /*
      «تسجل الرخصة ولا يتحقق منها أحد» — recorded, not verified. The distinction is
      the whole sentence: the software performs no check here, and an Arabic verb
      that implied one would claim a control this deployment does not have.
    */
    reviewedNoteAfter:
      '. وتسجل الرخصة ولا يتحقق منها أحد، ولا يقارن الموقع بمنشئ الدراسة.',
    exported: 'وقعت بوابتا التصدير فيها',

    bindsTitle: 'أي قيد يلزم، عبر ما جرى تشغيله',
    bindsNote:
      'معرفة القيد الملزم أجدى من معرفة الحد الأقصى: فمحفظة تحكمها المواقف في كل موقع ' +
      'لديها مشكلة واحدة لا مشكلات كثيرة.',

    split: {
      emptyTitle: 'لم تجر هنا أي دراسة، فلم يلزم أي قيد.',
      emptyBody: 'القيد الملزم صفة دراسة لا صفة نشر. ويظهر لحظة مرور قطعة أرض واحدة.',
      of: 'من',
    },
  },

  exposure: {
    title: 'حيث تكون الإجابات أقل استنادا',
    lede:
      'المدخلات المفترضة عبر كل دراسة يحملها هذا المخزن، بترتيب الحمولة نفسها — الأثر ' +
      'المقيس الأكبر أولا، حيث قيس أثر. ويحمل كل منها الأساس الذي سجله المحرك له، ' +
      'بكلمات المحرك لا بكلمات هذه الصفحة.',
    emptyTitle: 'لم تسجل أي دراسة هنا افتراضا.',
    emptyBody:
      'ينشأ الافتراض حين تترك قاعدة قيمة غير مثبتة فيلزم المحرك ملؤها بأساس وحساسية. ' +
      'والقائمة الفارغة تعني أن أي دراسة لم تبلغ تلك النقطة، لا أن شيئا لم يفترض.',

    regionLabel: 'المدخلات المفترضة وأثرها المقيس',
    caption:
      'المدخلات المفترضة، وأكبر أثر قاسته دراسة واحدة، وعدد الدراسات التي ظهر فيها كل ' +
      'منها، والأساس المسجل لكل منها',
    columns: {
      rank: 'الترتيب',
      parameter: 'المدخل',
      swing: 'أكبر تحرك مقيس',
      runs: 'الدراسات',
      basis: 'الأساس المسجل',
    },

    assumedChip: 'مفترض',
    noFigure: 'لا رقم',

    /*
      «وحدة كتابة البيانات» IS GLOSSED ONCE, AND THAT IS THE RULE FOR A TERM WITH NO
      TRADE ARABIC. §6 of the glossary ends with it: where no settled Arabic exists,
      describe it in Arabic and put the English in brackets once. «مُسلسِل» was
      rejected outright — without its marks it is «مسلسل», a television serial, and
      §5 no longer allows a word to be propped up by vowelling.
      The gloss is prose, not an engine string, so it is dictionary copy; the
      identifier that follows it in the component is `Verbatim`.
    */
    noteBefore:
      'الشرطة في ذلك العمود ليست صفرا. فهذه الحمولة لا تفرق بين حساسية لم يقسها أحد ' +
      'وحساسية قيست فكانت صفرا — إذ إن وحدة كتابة بيانات لوحة الجاهزية (serialiser) في ',
    noteAfter:
      ' تطوي الاثنتين في قيمة واحدة قبل أن تراهما الصفحة — فلا توسم أي منهما، وتقوم ' +
      'الشرطة مقامهما. وإعادة التفريق تغيير في تلك الوحدة.',
  },

  deferred: {
    title: 'منطبقة، ولم تخضع للتقييم إطلاقا',
    lede:
      'تنطبق هذه على كل دراسة ينتجها هذا النشر، ولا يفحص منها واحد. وتسمى هنا للسبب ' +
      'نفسه الذي تسمى لأجله في كل تقرير: الفحص الغائب يقرأ فحصا ناجحا.',
    emptyTitle: 'لا يحمل هذا النشر أي قاعدة مؤجلة.',
    emptyBody:
      'هذا قول عن سجلات القواعد المحملة هنا، لا عن الشيفرة. فعائلات بنود كاملة — ' +
      'الحريق، ومسارات الإخلاء، والإنشاء — خارج المجموعة التي يقرؤها هذا المحرك أصلا، ' +
      'والقاعدة التي لم تحمل قط لا تدرج مؤجلة.',

    /*
      «لم يخضع للتقييم» AND NOTHING ELSE.

      It states the absence of an act, which is exactly the claim: nobody assessed
      this. «غير صالح» would say invalid and «غير مطابق» would say non-compliant —
      both verdicts, and both stronger than the affirmative claim this product
      refuses to make.
    */
    notAssessed: 'لم يخضع للتقييم',
    lifeSafety: 'سلامة الأرواح',
    /* «بلا مرجع» — the clause text was drawn from nothing, which is a fact about
       the record and not a judgement on the rule. */
    draftNotSourced: 'مسودة · بلا مرجع',

    refusalTitle: 'الإشارة إلى بند أعلاه ليست بندا مسندا إلى مرجع.',
    refusalBody:
      'حيث تكون الوثيقة النظامية نائبة، تقول الشارة ذلك على السطر نفسه وبالحجم نفسه، ' +
      'ولا تنسق لتبدو مسندة. ويحمل الاستشهاد الوثيقة التي يسميها، والبند الذي يسميه، ' +
      'والنص الحرفي الذي أخذ منه؛ وحيث لم يؤخذ ذلك النص من شيء، يقول السجل ذلك وتكرره ' +
      'هذه الصفحة.',
  },

  drawings: {
    title: 'هل تتفق الرسومات مع المحرك',
    lede:
      'السيارات التي يرسمها كل ملف للمثال المحسوب، معدودة في الملفات التي كتبتها واجهة ' +
      'البرمجة (API) حين صنع هذا الإصدار. وتعد من جديد مع كل إصدار، والإصدار الذي تختلف ' +
      'ملفاته لا ينشر.',
    engine: 'ما وضعه المحرك',
    drawingSet: 'في مجموعة الرسومات',
    dxf: 'في ملف DXF',
    modelFile: 'في ملف النموذج',
    scopeTitle: 'الاتفاق اتساق ذاتي، لا أكثر.',
    scopeBody:
      'كل ملف مرسوم من نموذج المبنى الواحد، فتساوي الأعداد يثبت أن أي رسم لم يسقط سيارة ' +
      'ولم يكررها ولم يختلقها. ولا يثبت أن الموقف حيث يضعه الكود: فاتفاق الرسومات فيما ' +
      'بينها ليس اتفاقها مع لائحة. وفحص ثان يجري مع الاختبارات يقارن الشاشة أيضا، على ' +
      'قطع أكثر، موقفا موقفا وسيارة سيارة.',
  },

  runs: {
    title: 'أحدث الدراسات',
    lede:
      'كل دراسة غير قابلة للتغيير. وتعديل افتراض ينشئ دراسة جديدة ويترك الأصل كما هو ' +
      'تماما، ولذلك تنمو هذه القائمة ولا تنقص إطلاقا.',
    emptyTitle: 'لم تجر أي دراسة في هذا النشر.',
    emptyBody:
      'تحتاج الدراسة إلى قطعة أرض وإلى معالجة معلنة لدخول المواقف في معامل البناء قبل ' +
      'أن يحسب المحرك أي شيء.',
    emptyCta: 'ابدأ بقطعة أرض',

    regionLabel: 'أحدث الدراسات، الأحدث أولا',
    caption:
      'أحدث الدراسات، الأحدث أولا، ومعها القيد الذي حكم كلا منها والفحوصات التي جرت عليها',
    columns: {
      plot: 'قطعة الأرض',
      /* «الحاكم» is the band the answer came from; «الملزم» is the limit that
         produced it. English keeps the two apart and careless Arabic collapses both
         into «المحدد». */
      governing: 'الحاكم',
      capacity: 'السعة',
      levels: 'الأدوار',
      checks: 'الفحوصات',
      reviewer: 'المراجع',
    },

    ranOfTotal: (ran: string, total: string): string => `جرى ${ran} من ${total}`,
    lifeSafetyDeferred: (count: string): string => `${count} مؤجلة من سلامة الأرواح`,
    notSigned: 'غير موقعة',
    truncated: (shown: string, total: string): string =>
      `يعرض ${shown} من ${total}. والقائمة محدودة عن قصد: فالصفحة التي تقتطع في صمت تقرأ ` +
      `صفحة عرضت كل شيء.`,
  },

  noScore: {
    title: 'لا درجة، ولا شيء هنا يراقب توفر الخدمة',
    composite: {
      heading: 'لا يوجد رقم مركب على هذه الصفحة.',
      body:
        'لا نسبة مئوية واحدة، ولا إشارة ضوئية، ولا حكم بكلمة واحدة على النشر. فالرقم ' +
        'المركب شيء يقف عنده القارئ، وهو المتوسط الحسابي لعدد اعتمادات وتوقيع ومجموعة ' +
        'فحوصات لم تجد ما تقرؤه — وهذه ثلاثة لا يؤخذ لها متوسط. والأرقام أعلاه هي التي ' +
        'تقرر هل يجوز الاعتماد على أي ناتج، ويعلن كل منها بشروطه هو.',
    },
    availability: {
      heading: 'لا تراقب هذه الصفحة الخدمة.',
      /*
        «ما إذا», not «هل».

        The English denies three things in one breath — reachable, succeeded, how
        long — and the Arabic has to deny all three at the same pace. An embedded
        interrogative after a negated verb of reporting takes «ما إذا» in careful
        MSA; «لا تعلن هل» is the journalistic shortcut, and the register of a
        refusal is part of the refusal.
      */
      body:
        'تعلن ما اعتمد وما وقع وما جرى تشغيله. ولا تعلن ما إذا كانت الخدمة قابلة ' +
        'للوصول، ولا ما إذا نجح طلب، ولا المدة التي استغرقها. ولا شيء في هذا النشر يقيس ' +
        'أيا من ذلك، فلا شيء هنا يؤكده.',
    },
    ctaLabel: 'ما يرفضه',
    ctaNote:
      'بقية ما لن يفعله هذا المحرك، بما في ذلك ما يرفضه أثناء التشغيل والضابط الذي لا ' +
      'يفرضه عند بوابة المراجعة.',
  },
};
