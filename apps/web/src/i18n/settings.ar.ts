/**
 * العربية — `/settings`، لوحات الحساب الثلاث.
 *
 * Held to `SettingsDictionary` by the type system, so this file cannot be missing
 * a key and cannot grow one the English does not have. Every term is checked
 * against `docs/05-design/arabic-glossary.md`; the comments here record only what
 * would otherwise read as a mistranslation.
 *
 * ---------------------------------------------------------------------------
 * «الرخصة», NEVER «الترخيص». `work.ar.ts` and `antechamber.ar.ts` both carry the
 * reason and it is sharper on this page than anywhere else: «تراخيص» is TRAKHEES,
 * the authority, and a FIELD LABELLED with the authority's name would read as
 * though the number had been checked with them. The English sentence beside it
 * says the opposite — «تُسجَّل ولا يُتحقَّق منها» — and the two must not fight.
 *
 * ---------------------------------------------------------------------------
 * THE FOUR SENTENCES THIS FILE MAY NOT SOFTEN, each asserted present by the test:
 *
 *   1. «ولا يُتحقَّق منها» — the licence is recorded and never verified.
 *   2. «لا يُعاد كتابة تشغيلة» — an old signature keeps the old name.
 *   3. «تُسجَّل الخروج من كل جهاز آخر» — changing the password ends other sessions.
 *   4. «لا توجد قائمة بأجهزتك» — there is no device list, and why.
 *
 * Each is the honest half of a sentence whose polite half reads better. A
 * translation that kept only the polite half would be the one page on this site
 * where the Arabic claimed more than the English.
 *
 * ---------------------------------------------------------------------------
 * DIGITS STAY OUT. The password minimum is supplied by the component from the
 * same constant the server enforces — a translated digit drifts in silence.
 */

import type { SettingsDictionary } from './settings.en.js';

export const AR: SettingsDictionary = {
  title: 'الإعدادات',
  lede: 'اسمك ورقم رخصتك وكلمة المرور. ثلاثة أشياء، وما يفعله كلٌّ منها بتشغيلة توقّعها.',

  profile: {
    heading: 'من أنت',
    /* «تضبطه بيدك» for a `USER_SET` value: the glossary gives «مضبوط يدويًا» for the
       class label, and the verb has to match it or the reader meets two words for
       one thing — here and on the amber legend. */
    lede: 'يُسجَّل هذا الاسم على كل قيمة تضبطها بيدك وعلى كل مراجعة توقّعها.',
    retro:
      'وتغييره لا يغيّر تشغيلة وقّعتها من قبل. فالتوقيع يسجّل الاسم الذي كان ساريًا ' +
      'وقت التوقيع، ولا يُعاد كتابة تشغيلة أبدًا — فستظل التشغيلة الأقدم تعرض الاسم ' +
      'الأقدم، وهو ما قالته فعلًا.',

    name: {
      label: 'الاسم',
      help: 'كما ينبغي أن يظهر بجوار قيمة أدخلتها أنت.',
      missing: 'تشغيلة لا يوقّعها أحد هي تشغيلة بلا مُنشئ. أدخل الاسم المراد تسجيله.',
    },
    licence: {
      label: 'رقم الرخصة',
      optional: 'اختياري',
      help:
        'يُسجَّل على المراجعة التي توقّعها، ولا يُتحقَّق منه إطلاقًا. لا يوجد سجلّ ' +
        'مهني موصول بهذا النظام، فهذا إقرار منك ويُخزَّن بوصفه كذلك.',
      clear: 'اترك الحقل فارغًا لسحب الإقرار.',
    },
    email: {
      label: 'البريد الإلكتروني',
      help:
        'لا يمكن تغييره من هنا. فالتشغيلة تُشارَك إلى عنوان بريد، ونقل العنوان يحتاج ' +
        'رسالة تُثبت أنك تملك الصندوق الجديد — وهذا النشر لا يُرسل بريدًا.',
    },
    save: 'احفظ الاسم والرخصة',
    saving: 'يُحفظ…',
    saved: 'حُفِظ.',
  },

  password: {
    heading: 'كلمة المرور',
    lede: 'تغييرها يُسجّل الخروج من كل جهاز آخر. أمّا هذا الجهاز فيبقى داخلًا.',
    current: {
      label: 'كلمة المرور الحالية',
      help: 'تُطلب حتى لا يستولي متصفّح مفتوح على الحساب استيلاءً دائمًا.',
      wrong: 'هذه ليست كلمة المرور الحالية. ولم يتغيّر شيء.',
    },
    next: {
      label: 'كلمة المرور الجديدة',
      /* «اثني عشر» in words, not a numeral, for the reason the English carries: a
         digit here is a second copy of `PASSWORD_MIN`. And when the server refuses
         a password it refuses in its own English sentence, rendered verbatim
         inside `Ltr` — a translated refusal would be a second record nobody
         issued, which is rule one of the glossary. */
      help:
        'اثنا عشر محرفًا على الأقل. والطول هو القاعدة الوحيدة — جملة عادية طويلة أقوى ' +
        'من كلمة قصيرة محشوّة بعلامات الترقيم، وهذا النظام لا يدّعي غير ذلك.',
    },
    confirm: {
      label: 'كلمة المرور الجديدة مرة أخرى',
      mismatch: 'الكلمتان غير متطابقتين.',
    },
    submit: 'غيّر كلمة المرور',
    submitting: 'يُغيَّر…',
    done: 'تغيّرت كلمة المرور. وسُجِّل الخروج من كل جهاز آخر.',
  },

  sessions: {
    heading: 'الأجهزة',
    lede:
      'تدوم الجلسة ثلاثين يومًا وتُحفَظ في ملف تعريف ارتباط ضبطه هذا الموقع. وتسجيل ' +
      'الخروج من كل الأجهزة يُنهيها جميعًا، بما فيها هذا الجهاز.',
    noList:
      'لا توجد قائمة بأجهزتك. فلا يُسجَّل من أين فُتحت الجلسة، وقائمة صفوفها كلها ' +
      'تقول الشيء نفسه ستبدو وكأنها معلومة.',
    signOutEverywhere: 'سجّل الخروج من كل الأجهزة',
    signingOut: 'يُسجَّل الخروج…',
  },

  appearance: {
    heading: 'المظهر',
    lede:
      'يُحفَظ السِّمة واللغة في هذا المتصفّح لا في حسابك — فهما يتبعان الجهاز لا الشخص.',
    theme: {
      label: 'السِّمة',
      /* «مُفترَضة» is the glossary's label for `ASSUMED`. It has to be the same word
         here as on the register, or the amber means two things. */
      help:
        'تُفحَص السِّمتان كلتاهما على تباين WCAG 2.2 في كل بناء، بما في ذلك اللون ' +
        'الكهرماني الذي يشير إلى قيمة مُفترَضة.',
    },
    language: {
      label: 'اللغة',
      help:
        'الموقع والمحرّك بالعربية والإنجليزية معًا. أمّا ما حسبه المحرّك — رقم قطعة ' +
        'أو استشهاد بقاعدة أو قيمة — فيبقى كما سُجِّل، في اللغتين.',
    },
  },

  signedOut: {
    heading: 'لا يوجد حساب مسجَّل الدخول.',
    body:
      'الإعدادات تخصّ حسابًا. ويمكنك استخدام المحرّك بلا حساب — وعندها تُحفَظ تشغيلاتك ' +
      'مقابل مفتاح في هذا المتصفّح، ومسحُه يفقدها.',
    cta: 'اذهب إلى المحرّك',
  },

  failed: 'لم يُحفَظ ذلك. ولم يتغيّر شيء.',
};
