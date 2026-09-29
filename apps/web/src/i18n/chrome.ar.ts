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

  skipTo: (page: string): string => `انتقل إلى ${page}`,
  navLabel: 'الموقع',
  sections: 'الأقسام',
  close: 'إغلاق',
  /*
    «ابدأ دراسة» rather than «شغّل قطعة». A consultant runs a STUDY on a plot —
    that is the word on the fee proposal — and «شغّل» is what you do to a machine.
    The old label also needed a shadda to be read at all. See glossary §5b.
  */
  runAPlot: 'ابدأ دراسة',

  /*
    «الوضع» for a visual mode, not «السمة» — which a reader meets first as a
    character trait — and not «الثيم». «الداكن» and «الفاتح» are what the market
    writes. «التبديل إلى» rather than the imperative «حوّل», which needed a shadda.
  */
  themeToggle: {
    toDark: 'التبديل إلى الوضع الداكن',
    toLight: 'التبديل إلى الوضع الفاتح',
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
    signedInAs: 'مسجل الدخول باسم',
    filingUnder: 'تحفظ الأعمال باسم',
    personal: 'حسابي الشخصي',
    /* «طي» و«فتح» — مصدران بلا تشكيل. The name changes with the state for the
       reason the English carries. */
    collapse: 'طي شريط مساحة العمل',
    expand: 'فتح شريط مساحة العمل',
    guest: 'أنت تعمل كضيف. هذا المتصفح وحده يحمل مفتاح هذه الدراسات: إذا مسحت بياناته فقدتها، ولا يمكن الوصول إليها من جهاز آخر.',
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
    validity: 'الصلاحية التنظيمية — لم تخضع للتقييم',
    rulesApproved: 'القواعد المعتمدة',
    definitionsSigned: 'التعريفات الموقعة',
  },

  colophon: {
    groups: {
      claim: 'ما لا يؤكده',
      product: 'المنتج',
      method: 'كيف تتحقق منه',
      reference: 'هذا الإصدار',
    },
    engineVersion: 'المحرك',
    annexVersion: 'ملحق التعريفات',
    unreported: 'غير معلن',
    unsigned: 'غير موقع',
    /*
      The same wording as the route description in `routes['/readiness']` — one
      claim, one set of words. «زمن التشغيل» is uptime and «الإتاحة» is
      availability; collapsing the two would drop half the denial, and the sentence
      exists to deny both.
    */
    readinessNote: 'جاهزية النظام، لا زمن التشغيل — لا شيء هنا يراقب توفر الخدمة.',
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
    emphasis: 'الصلاحية التنظيمية لا تخضع للتقييم إطلاقا ولا يؤكدها هذا النظام.',
    /*
      مطابقة appears here, negated, and that is the only place it may appear. The
      glossary makes any Arabic sentence that predicates مطابق of an output a defect
      of the same class as an untraced value.
    */
    body:
      ' يعرض هذا المحرك ما تقتضيه القواعد المسجلة فيه. وهو ليس فحص مطابقة، ولا يغني أي جزء منه ' +
      'عن المراجعة المهنية.',
  },

  verbatimNotice:
    'ما ينتجه المحرك — أساس الافتراض أو المعادلة أو مرجع القاعدة — يعرض كما أصدره، دون ترجمة.',

  untranslated: {
    title: 'هذه الصفحة لم تترجم بعد',
    body: 'إطارها بالعربية ونصها ما زال بالإنجليزية. المحرك وكل رقم يعملان بالطريقة نفسها في اللغتين.',
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
  governingLanguage: 'النص الإنجليزي هو النص الحاكم عند أي اختلاف.',

  routes: {
    '/': {
      title: 'TOP.ai — السعة التطويرية',
      description:
        'يعرض TOP.ai ما تقتضيه القواعد المسجلة فيه لقطعة أرض، ومعه اشتقاق كل رقم. الصلاحية التنظيمية لا تخضع للتقييم إطلاقا ولا يؤكدها هذا النظام.',
      navLabel: null,
      footerLabel: 'الإجابة',
    },
    '/parking': {
      title: 'المواقف — TOP.ai',
      description:
        'كيف يتكون رقم المواقف فعليا: معامل مساحة مفترض أولا، ثم دور مرسوم بمواقفه، والفارق بين الاثنين يقاس ولا يخفى.',
      navLabel: 'المواقف',
      footerLabel: 'المواقف',
    },
    '/exports': {
      title: 'المخرجات — TOP.ai',
      description:
        'الملفات التي يكتبها المحرك — اللوحات، والنموذج ثلاثي الأبعاد، وجدول الكميات، وبيانات الدراسة، والتقرير — وما يحمله كل منها. كل اسم في الصفحة مقروء من ملف حقيقي، ولا يخرج أي ملف قبل استيفاء بوابتين.',
      navLabel: null,
      footerLabel: 'المخرجات',
    },
    '/refusals': {
      title: 'ما يرفضه — TOP.ai',
      description:
        'كل ما لن يفعله هذا المحرك، بدءا بما يرفضه أثناء الحساب. إن كنت تبحث عن المبالغة في الادعاء، فابدأ من هنا.',
      navLabel: 'ما يرفضه',
      footerLabel: 'ما يرفضه',
    },
    '/app': {
      title: 'المحرك — TOP.ai',
      description:
        'أدخل قطعة أرض في المحرك، وتابع كل خطوة وهي ترفض أو تفترض أو تشتق أمامك.',
      navLabel: null,
      footerLabel: 'ابدأ دراسة',
    },
    '/work': {
      title: 'أعمالك — TOP.ai',
      /*
        «لا مجاميع ولا متوسّطات» is not modesty about the feature; it is the page's
        design, and the description says so because a reader arriving from a search
        result is entitled to know what this list refuses to be before they open it.
      */
      description:
        'كل دراسة أنشأها هذا الحساب، محفوظة كما حسبت تماما، ومعها ما حكمها وما افترضته. لا مجاميع ولا متوسطات: متوسط سعتين حاكمتين لقطعتين مختلفتين لا يصف شيئا.',
      navLabel: null,
      footerLabel: 'أعمالك',
    },
    '/sign-in': {
      title: 'تسجيل الدخول — TOP.ai',
      description:
        'سجل الدخول لتحفظ دراساتك كما حسبت تماما. الحساب يغير شيئين ولا يراجع شيئا: فالصلاحية التنظيمية لا تخضع للتقييم إطلاقا، بحساب أو بغير حساب.',
      navLabel: null,
      footerLabel: 'تسجيل الدخول',
    },
    '/sign-up': {
      title: 'إنشاء حساب — TOP.ai',
      /* The description carries the refusal, not the invitation. A sign-up page
         is where a translation is most tempted to promise. */
      description:
        'أنشئ حسابا لتحفظ دراساتك. وهو لا يجعل الدراسة مراجعة ولا موثقة ولا معتمدة ولا مطابقة، ورقم الرخصة الذي يسجل لا يتم التحقق منه في أي سجل.',
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
        'اسمك ورقم رخصتك وكلمة المرور — وأثر كل منها على الدراسة التي توقعها. الرخصة تسجل ولا يتم التحقق منها، وهذه الصفحة تقول ذلك عند الحقل الذي يكتب فيه الرقم.',
      navLabel: null,
      footerLabel: 'الإعدادات',
    },
    '/workspace': {
      title: 'مساحة العمل — TOP.ai',
      description:
        'المكتب ومن فيه وصلاحية كل منهم. لا يتم التحقق من شيء هنا: الاسم لافتة اختارها الأعضاء، ورقم الرخصة على المراجعة يسجل ولا يتم التحقق منه.',
      navLabel: null,
      footerLabel: 'مساحة العمل',
    },
    '/accept-invite': {
      title: 'دعوة — TOP.ai',
      description:
        'الطرف الآخر من دعوة مساحة العمل. الرابط يصلح لحساب واحد، ولا يذكر سبب الرفض إن رفض.',
      navLabel: null,
      footerLabel: 'دعوة',
    },
    '/readiness': {
      title: 'جاهزية النظام — TOP.ai',
      description:
        'ما ليس جاهزا في هذا الإصدار، والإجراء البشري الذي يغير كل رقم منه. جاهزية النظام، لا زمن التشغيل — لا شيء هنا يراقب توفر الخدمة.',
      navLabel: 'الجاهزية',
      footerLabel: 'جاهزية النظام',
    },
  },

  notFound: {
    title: 'غير موجودة — TOP.ai',
    footerLabel: 'غير موجودة',
  },
};
