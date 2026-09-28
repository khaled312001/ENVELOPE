/**
 * العربية — `/sign-in` و`/sign-up`.
 *
 * Held to `AuthDictionary` by the type system, so this file cannot be missing a
 * key and cannot grow one the English does not have. Every term is checked
 * against `docs/05-design/arabic-glossary.md`; the comments here record only what
 * would otherwise read as a mistranslation.
 *
 * ---------------------------------------------------------------------------
 * «الرخصة», NEVER «الترخيص» — «تراخيص» is TRAKHEES, the authority, and a field
 * labelled with the authority's name would read as though the number had been
 * checked with them. The sentence beside it says the opposite.
 *
 * ---------------------------------------------------------------------------
 * THE THREE SENTENCES THIS FILE MAY NOT SOFTEN, each asserted present by the
 * test, because each is the honest half of a pair whose polite half reads better:
 *
 *   1. «ولا يجعل تشغيلةً مُراجَعةً» — an account reviews nothing.
 *   2. «ولا يُتحقَّق منه إطلاقًا» — the licence is recorded, never verified.
 *   3. «لا توجد استعادة لكلمة المرور» — there is no reset, and why.
 *
 * A sign-up screen is where a translation is most tempted to promise, and least
 * likely to be read by anyone who can check it against the English.
 */

import type { AuthDictionary } from './auth.en.js';

export const AR: AuthDictionary = {
  in: {
    title: 'تسجيل الدخول',
    lede: 'تشغيلاتك، محفوظة كما حُسبت.',
    submit: 'سجّل الدخول',
    busy: 'يُسجَّل الدخول…',
    switchPrompt: 'ليس لديك حساب بعد؟',
    switchCta: 'أنشئ واحدًا',
  },
  up: {
    title: 'إنشاء حساب',
    lede: 'يتغيّر شيئان: تُحفَظ تشغيلاتك، ويُحفَظ ما تكتبه كما تكتبه.',
    submit: 'أنشئ الحساب',
    busy: 'يُنشأ…',
    switchPrompt: 'لديك حساب بالفعل؟',
    switchCta: 'سجّل الدخول',
  },

  fields: {
    email: {
      label: 'البريد الإلكتروني',
      help:
        'هذا هو العنوان الذي تُشارَك إليه التشغيلة. ولا يمكن تغييره لاحقًا دون رسالة ' +
        'تُثبت الصندوق الجديد، وهذا النشر لا يُرسل بريدًا.',
    },
    password: {
      label: 'كلمة المرور',
      /* «اثنا عشر» in words, not a numeral: a digit here is a second copy of
         `PASSWORD_MIN`, and the copy that drifts is the one nothing runs. */
      help:
        'اثنا عشر محرفًا على الأقل. والطول هو القاعدة الوحيدة — جملة عادية طويلة أقوى ' +
        'من كلمة قصيرة محشوّة بعلامات الترقيم، وهذا النظام لا يدّعي غير ذلك.',
      show: 'أظهر كلمة المرور',
      hide: 'أخفِ كلمة المرور',
    },
    name: {
      label: 'الاسم',
      help: 'يُسجَّل على كل قيمة تضبطها بيدك وعلى كل مراجعة توقّعها.',
      missing: 'تشغيلة لا يوقّعها أحد هي تشغيلة بلا مُنشئ. أدخل الاسم المراد تسجيله.',
    },
    licence: {
      label: 'رقم الرخصة',
      optional: 'اختياري',
      help:
        'يُسجَّل على المراجعة التي توقّعها، ولا يُتحقَّق منه إطلاقًا. لا يوجد سجلّ ' +
        'مهني موصول بهذا النظام، فهذا إقرار منك ويُخزَّن بوصفه كذلك.',
    },
  },

  noRecovery:
    'لا توجد استعادة لكلمة المرور. هذا النشر لا يُرسل بريدًا، فرابط الاستعادة سيكون ' +
    'رابطًا إلى لا شيء — والنسخة الصادقة من ذلك هي هذه الجملة، لا نموذج يفشل.',

  aside: {
    what:
      'يحفظ الحساب تشغيلاتك كما حُسبت تمامًا، بمدخلاتها وافتراضاتها وشبكة مصدر اشتقاقها.',
    not:
      'ولا يجعل تشغيلةً مُراجَعةً ولا مُتحقَّقًا منها ولا معتمَدةً ولا مطابِقة. ' +
      'فالصلاحية التنظيمية لا تُقيَّم إطلاقًا، بحساب أو بغير حساب.',
    guest:
      'يمكنك استخدام المحرّك بلا حساب. وعندها تُحفَظ تشغيلاتك مقابل مفتاح في هذا ' +
      'المتصفّح: من يملك المفتاح يملك التشغيلات، ومسحُ المتصفّح يفقدها.',
    guestCta: 'استخدمه بلا حساب',
  },

  returning: 'وستعود إلى حيث كنت.',

  signedIn: {
    before: 'أنت داخل باسم ',
    after: '.',
    cta: 'اذهب إلى أعمالك',
    settings: 'الإعدادات',
  },

  failed: 'لم ينجح ذلك. ولم يتغيّر شيء.',
};
