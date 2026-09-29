/**
 * العربية — the chrome.
 *
 * Held to `ChromeDictionary` by the type system, so this file cannot be missing a
 * key. Every choice below is argued in `docs/05-design/arabic-glossary.md`; the
 * comments here record only what would otherwise look like a mistranslation.
 */

import type { ChromeDictionary } from './chrome.en.js';

export const AR: ChromeDictionary = {
  switchTo: 'English',
  switchToLabel: 'تحويل الموقع إلى الإنجليزية، من اليسار إلى اليمين',

  skipTo: (page: string): string => `تخطَّ إلى ${page}`,
  navLabel: 'الموقع',
  sections: 'الأقسام',
  close: 'إغلاق',
  runAPlot: 'شغِّل قطعة',

  /*
    «السمة» for a visual theme, not «الموضوع» — which is a subject — and not
    «الثيم». «الداكنة» and «الفاتحة» are what the market writes for dark and light.
    The imperative matches «شغِّل قطعة» beside it: a button commands.
  */
  themeToggle: {
    toDark: 'حوِّل إلى السمة الداكنة',
    toLight: 'حوِّل إلى السمة الفاتحة',
  },

  /*
    شريط مساحة العمل. اسم المَعلَم ليس «التنقّل»: في الصفحة مَعلَمٌ آخر اسمه «الموقع»،
    ومَعلَمان بالاسم نفسه سطران متطابقان في قائمة قارئ الشاشة لا يُفرَّق بينهما.

    وجملة «ضيف» صورةٌ مختصرة من رفضٍ تحمله صفحة «ما يرفضه» كاملًا. شريطٌ لا يتغيّر
    بين الحالتين يُخفي أيَّهما أنت — والفرق ليس شكليًّا: تشغيلات الضيف خلف مفتاح في
    متصفّح واحد، تضيع بمسحه.
  */
  /*
   * «في هذه الصفحة» لا «المحتويات»: القارئ داخل الصفحة فعلًا، والعبارة تقول ما
   * يغطّيه الفهرس وما لا يغطّيه معًا.
   */
  contents: {
    title: 'في هذه الصفحة',
  },

  rail: {
    label: 'مساحة عملك',
    heading: 'مساحة العمل',
    signedInAs: 'داخل باسم',
    filingUnder: 'تُحفَظ الأعمال تحت',
    personal: 'وحدي',
    /* «اطوِ» و«افرد» — فعلان صريحان. The name changes with the state for the
       reason the English carries. */
    collapse: 'اطوِ شريط مساحة العمل',
    expand: 'افرد شريط مساحة العمل',
    guest: 'أنت تعمل كضيف. هذا المتصفّح يحمل مفتاح هذه التشغيلات؛ مسحُه يفقدها، ولا يبلغها جهاز آخر.',
  },

  masthead: {
    /*
      لم تُقيَّم, not غير صالح.

      The passive states the ABSENCE OF AN ACT, which is exactly the claim. "غير
      صالح" would say the scheme is invalid, and "غير مطابق" would say it is
      non-compliant — both are verdicts, and the product's whole position is that it
      has not reached one. Translating a refusal to judge into an adverse judgement
      is a stronger claim than the affirmative one it refuses to make.
    */
    validity: 'الصلاحية التنظيمية — لم تُقيَّم',
    rulesApproved: 'القواعد المعتمدة',
    definitionsSigned: 'التعريفات الموقَّعة',
  },

  colophon: {
    groups: {
      claim: 'ما لا يدَّعيه',
      product: 'المنتج',
      method: 'كيف تتحقّق منه',
      reference: 'هذا النشر',
    },
    engineVersion: 'المحرّك',
    annexVersion: 'ملحق التعريفات',
    unreported: 'غير مُبلَّغ عنه',
    unsigned: 'غير موقَّع',
    /*
      The same wording as the route description in `routes['/readiness']` — one
      claim, one set of words. «زمن التشغيل» is uptime and «الإتاحة» is
      availability; collapsing the two would drop half the denial, and the sentence
      exists to deny both.
    */
    readinessNote: 'جاهزية، لا زمن تشغيل — لا شيء هنا يراقب الإتاحة.',
  },

  disclaimer: {
    lead: 'TOP.ai · المرحلة 0 · ',
    /*
      Present tense and إطلاقًا rather than أبدًا.

      The English is "is never assessed and never claimed" — a permanent property of
      the product, not a fact about one run, so the Arabic stays in the present.
      أبدًا reads as "always" in some registers and this is the one sentence on the
      site that may not be ambiguous.
    */
    emphasis: 'الصلاحية التنظيمية لا تُقيَّم إطلاقًا ولا يُدَّعى بها.',
    /*
      مطابقة appears here, negated, and that is the only place it may appear. The
      glossary makes any Arabic sentence that predicates مطابق of an output a defect
      of the same class as an untraced value.
    */
    body:
      ' يُبلِّغ هذا المحرّك بما تقتضيه قواعده المُرمَّزة. وهو ليس فحص مطابقة، ولا يُغني أيُّ جزء منه ' +
      'عن المراجعة المهنية.',
  },

  verbatimNotice:
    'ما ينتجه المحرّك — أساسٌ أو صيغةٌ أو مرجع قاعدة — يُعرض كما أصدره، دون ترجمة.',

  untranslated: {
    title: 'هذه الصفحة لم تُترجَم بعد',
    body: 'إطارها بالعربية ونصّها ما زال بالإنجليزية. المحرّك وكل رقم يعملان بالطريقة نفسها في اللغتين.',
  },

  /*
    THE GOVERNING TEXT, AND WHY THIS LINE EXISTS ONLY IN ARABIC.

    The English page needs no such statement — it is the governing text. This one
    protects the REFUSALS: if an Arabic rendering of "regulatory validity is never
    assessed" were ever weaker than the English, the product would be
    misrepresenting itself to the reader who cannot check. Naming the governing
    language costs a line and closes that gap. It is the same instinct as
    `REGULATORY VALIDITY: NOT ASSESSED` being permanent rather than contextual.
  */
  governingLanguage: 'النصّ الإنجليزي هو النصّ الحاكم عند أي اختلاف.',

  routes: {
    '/': {
      title: 'TOP.ai — الطاقة التطويرية',
      description:
        'يُبلِّغ TOP.ai بما تقتضيه القواعد المُرمَّزة لقطعة أرض، وباشتقاق كل رقم يقول ذلك. الصلاحية التنظيمية لا تُقيَّم إطلاقًا ولا يُدَّعى بها.',
      navLabel: null,
      footerLabel: 'الإجابة',
    },
    '/parking': {
      title: 'المواقف — TOP.ai',
      description:
        'كيف يُصنع رقم المواقف فعليًّا: معامل مساحة مُفترَض أولًا، ثم طابق مرسوم بمواقفه، والفارق بينهما يُقاس لا يُخفى.',
      navLabel: 'المواقف',
      footerLabel: 'المواقف',
    },
    '/exports': {
      title: 'ما يخرج منه — TOP.ai',
      description:
        'الملفات التي يكتبها المحرّك — الرسم، وملف النموذج، والمصنَّف، والتشغيلة بياناتٍ، والتقرير — وما يحمله كلٌّ منها. كل اسم في الصفحة مقروء من ملف، ولا يخرج أيُّ ملف قبل توقيع بوّابتين.',
      navLabel: null,
      footerLabel: 'ما يخرج منه',
    },
    '/refusals': {
      title: 'ما يرفضه — TOP.ai',
      description:
        'كل ما لن يفعله هذا المحرّك، بادئًا بما يرفضه أثناء التشغيل. إن كنت تبحث عن الادّعاء الزائد، فابدأ من هنا.',
      navLabel: 'ما يرفضه',
      footerLabel: 'ما يرفضه',
    },
    '/app': {
      title: 'المحرّك — TOP.ai',
      description:
        'مرِّر قطعة أرض عبر المحرّك، وراقب كل خطوة وهي ترفض أو تفترض أو تشتقّ في العلن.',
      navLabel: null,
      footerLabel: 'شغِّل قطعة',
    },
    '/work': {
      title: 'أعمالك — TOP.ai',
      /*
        «لا مجاميع ولا متوسّطات» is not modesty about the feature; it is the page's
        design, and the description says so because a reader arriving from a search
        result is entitled to know what this list refuses to be before they open it.
      */
      description:
        'كل تشغيلة أنشأها هذا الحساب، محفوظة كما حُسبت تمامًا، ومعها ما حكمها وما افترضته. لا مجاميع ولا متوسّطات: متوسّط طاقتين حاكمتين لقطعتين مختلفتين ليس حقيقةً عن شيء.',
      navLabel: null,
      footerLabel: 'أعمالك',
    },
    '/sign-in': {
      title: 'تسجيل الدخول — TOP.ai',
      description:
        'سجّل الدخول لتُحفَظ تشغيلاتك كما حُسبت تمامًا. الحساب يغيّر شيئين ولا يراجع شيئًا: فالصلاحية التنظيمية لا تُقيَّم إطلاقًا، بحساب أو بغير حساب.',
      navLabel: null,
      footerLabel: 'تسجيل الدخول',
    },
    '/sign-up': {
      title: 'إنشاء حساب — TOP.ai',
      /* The description carries the refusal, not the invitation. A sign-up page
         is where a translation is most tempted to promise. */
      description:
        'أنشئ حسابًا لتُحفَظ تشغيلاتك. وهو لا يجعل تشغيلةً مُراجَعةً ولا مُتحقَّقًا منها ولا معتمَدةً ولا مطابِقة، ورقم الرخصة الذي يُسجَّل لا يُتحقَّق منه في أيّ سجلّ.',
      navLabel: null,
      footerLabel: 'إنشاء حساب',
    },
    '/settings': {
      title: 'الإعدادات — TOP.ai',
      /*
        The description carries the disclosure, not only the feature list. A reader
        arriving from a search result is entitled to know that the licence field
        records an assertion before they type a number into it — «تُسجَّل ولا
        يُتحقَّق منها», the same words the page itself uses.
      */
      description:
        'اسمك ورقم رخصتك وكلمة المرور — وما يفعله كلٌّ منها بتشغيلة توقّعها. الرخصة تُسجَّل ولا يُتحقَّق منها؛ وهذه الصفحة تقول ذلك عند الحقل الذي يُكتب فيه الرقم.',
      navLabel: null,
      footerLabel: 'الإعدادات',
    },
    '/workspace': {
      title: 'مساحة العمل — TOP.ai',
      description:
        'مكتبٌ ومَن فيه وما يحقّ لكلٍّ منهم. لا يتحقّق أحد من شيء هنا: الاسم لافتةٌ اختارها أعضاؤه، ورقم الرخصة على المراجعة يُسجَّل ولا يُتحقَّق منه.',
      navLabel: null,
      footerLabel: 'مساحة العمل',
    },
    '/accept-invite': {
      title: 'دعوة — TOP.ai',
      description:
        'الطرف الآخر من دعوة مساحة عمل. الرابط يعمل لحسابٍ واحد، ولا يقول شيئًا عن سبب رفضه.',
      navLabel: null,
      footerLabel: 'دعوة',
    },
    '/readiness': {
      title: 'جاهزية النشر — TOP.ai',
      description:
        'ما ليس جاهزًا في هذا النشر، والإجراء البشري الذي يُغيّر كل رقم منه. جاهزية، لا زمن تشغيل — لا شيء هنا يراقب الإتاحة.',
      navLabel: 'الجاهزية',
      footerLabel: 'جاهزية النشر',
    },
  },

  notFound: {
    title: 'غير موجودة — TOP.ai',
    footerLabel: 'غير موجودة',
  },
};
