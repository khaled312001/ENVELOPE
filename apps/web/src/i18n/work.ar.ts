/**
 * العربية — `/work`، قائمة تشغيلات الحساب.
 *
 * Held to `WorkDictionary` by the type system, so this file cannot be missing a key
 * and cannot grow one the English does not have. Every term is checked against
 * `docs/05-design/arabic-glossary.md`; the comments here record only what would
 * otherwise read as a mistranslation.
 *
 * ---------------------------------------------------------------------------
 * THE TWO THINGS THIS PAGE MAY NOT SOFTEN.
 *
 * 1. NO AGGREGATE. Not «المجموع», not «المتوسّط», not «هذا الشهر». The page states
 *    none in English and none here, and the Arabic test scans for them by name.
 *
 * 2. THE DISCLOSURE. «لا توجد في هذا النشر شركات ولا مشاريع، بل حسابات فقط» and
 *    «تُسجَّل ولا يُتحقَّق منها إطلاقًا» are asserted PRESENT in this file, as their
 *    English is in `work.en.ts`: a page that dropped them would read better and imply
 *    an isolation the deployment does not have.
 *
 * ---------------------------------------------------------------------------
 * «الرخصة», NEVER «الترخيص», for the reviewer's licence — `antechamber.ar.ts` gives
 * the reason: «تراخيص» is TRAKHEES, and a sentence that used the authority's name
 * for the field would read as though the number had been checked with them.
 *
 * «أنشأ» for "author" as a verb: a run is created by the account that computed it,
 * and «ألّف» would make it a piece of writing.
 *
 * DIGITS STAY OUT, and so do the band letters, which live in the component.
 */

import type { WorkDictionary } from './work.en.js';

export const AR: WorkDictionary = {
  hero: {
    title: 'أعمالك',
    /* «شبكة مصدر الاشتقاق» for the provenance graph. «مخطّط» would collide with the
       affection plan, which the glossary gives that word to. */
    lede:
      'تُحفَظ كل تشغيلة تُنشئها كما حُسبت تمامًا، بمدخلاتها وافتراضاتها وشبكة مصدر ' +
      'اشتقاقها. ولا يُعاد هنا حساب شيء لملء عمود.',
  },

  /* The antechamber's own words for the same wait, so one state has one sentence. */
  checking: 'يجري فحص ما إذا كنت مُسجّل الدخول…',

  signedOut: {
    /* «مرتبطةً بحساب», not «على حساب» — which is the idiom "at the expense of". */
    body:
      'تُحفَظ هذه القائمة مرتبطةً بحساب. افتح المحرّك وأنشئ حسابًا، أو سجِّل الدخول — ' +
      'فالتشغيلة التي تُنشأ بلا حساب تُحسَب بالطريقة نفسها، ولا تُحفَظ.',
    cta: 'افتح المحرّك',
  },

  fetch: {
    statusBefore: 'أجاب الخادم بالرمز ',
    statusAfter: '',
    failed: 'تعذّر تحميل القائمة',
  },

  loading: 'جارٍ تحميل تشغيلاتك…',

  authored: {
    title: 'تشغيلات أنشأتها',
    caption: 'التشغيلات التي أنشأها هذا الحساب',
    empty: (runAPlot: string): string =>
      `لم تُنشئ أي تشغيلة بعد. يُفتَح المحرّك من زرّ «${runAPlot}».`,
  },

  shared: {
    title: 'مُشارَكة معك',
    /*
      «ولا يتحقّق من رخصة أحد» — the reader's own word, negated. A reviewer role
      grants reading and nothing else, and «التحقّق» is the control a reader assumes
      the word "reviewer" implies; the denial has to use it.
    */
    note:
      'تشغيلةٌ شاركها أحدٌ معك، بالدور الذي سمّاه. يجعل دورُ المراجِع التشغيلةَ مقروءةً ' +
      'لك؛ ولا يتحقّق من رخصة أحد.',
    caption: 'التشغيلات المُشارَكة مع هذا الحساب',
    empty: 'لم يُشارِك أحدٌ معك شيئًا.',
  },

  drafts: {
    title: 'ما لم يكتمل',
    note:
      'ما كتبته حين أغلقت علامة التبويب آخر مرة. المسوّدة ليست تشغيلة: لم يُحسَب فيها ' +
      'شيء، ولا تحمل مصدر اشتقاق.',
    empty: 'لا شيء لم يكتمل.',
    labels: {
      'plot-form': 'قطعة أرض بدأت إدخالها',
    },
    resume: 'أكمِلها',
  },

  disclosure: {
    before:
      'لا يستطيع فتح التشغيلة إلا أنت والحسابات التي تشاركها معها. ' +
      'لا توجد في هذا النشر شركات ولا مشاريع، بل حسابات فقط، ورخصةُ المراجِع ' +
      'تُسجَّل ولا يُتحقَّق منها إطلاقًا. والأمران كلاهما مذكوران في صفحة ',
    /* The route's own label in `chrome.ar.ts`, so the link and the page it opens are
       not two names for one thing. */
    link: 'ما يرفضه',
    after: '.',
  },

  table: {
    columns: {
      plot: 'قطعة الأرض',
      /* «الحاكمة» is the band the answer comes from; «المُلزِم» is the limit that
         produced it. Two ideas, two words, and never «المحدِّد» for either. */
      governing: 'الطاقة الحاكمة',
      binds: 'القيد المُلزِم',
      /* A count of assumptions, headed by the one word the glossary allows for them.
         «افتراضي» would be "default". */
      assumed: 'المُفترَض',
      gates: 'بوّابات التصدير',
      run: 'التشغيلة',
    },
    of: ' من ',
    /* The run is the object: «وقّعها» — signed it. */
    signedBy: 'وقّعها ',
    notSigned: 'غير موقَّعة',
    draftRules: 'قواعد مسوّدة',
    roles: {
      reviewer: 'مراجِع',
      reader: 'قارئ',
    },
  },

  bands: {
    REGULATORY: 'ما يسمح به الكود',
    GEOMETRIC: 'ما يتّسع له الغلاف',
    /* «ما تكفي له المواقف» — the floor area the parking provision is sufficient for,
       which is what band C measures. «ما تستوعبه المواقف» would be the cars. */
    PARKING: 'ما تكفي له المواقف',
  },
  band: (letter: string, question: string): string => `النطاق ${letter} · ${question}`,
  bandToken: (token: string): string => `النطاق ${token}`,
};
