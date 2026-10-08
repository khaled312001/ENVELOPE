/**
 * العربية — `/app`، الغرفة التي تسبق المحرك، ولوحة الحساب التي تعرضها.
 *
 * Held to `AntechamberDictionary` by the type system, so this file cannot be
 * missing a key. Every choice is argued in `docs/05-design/arabic-glossary.md`; the
 * comments here record only what would otherwise look like a mistranslation.
 *
 * THIS SCREEN IS THREE REFUSALS AND A FORM, and the refusals are the reason the
 * page exists:
 *
 *   1. the licence is RECORDED and NOT VERIFIED — «يسجل، ولا يجري التحقق منه»;
 *   2. separation of duties is NOT ENFORCED — «الفصل بين المهام ضابط لا تملكه»;
 *   3. without an account nothing is saved as you type, and runs open ONLY FROM
 *      THIS BROWSER — «لا تفتح دراساتك إلا من هذا المتصفح». The exception is
 *      spelled «إلا»: a restriction stated as a restriction, not «من هذا المتصفح»
 *      alone, which reads as a convenience.
 *
 * Each is stated with the same force as the English and with no hedge: no «قد», no
 * «ربما», no «عادة». A hedge in a refusal is a claim, and a refusal that reads
 * softer in Arabic than in English misrepresents the product to the one reader who
 * cannot check it against the original.
 *
 * FOUR WORDS THAT DO THE WORK, and why each was chosen over the more natural one:
 *
 *   «الرخصة المهنية» for the professional licence, never «الترخيص» — because
 *   «تراخيص» is TRAKHEES, the authority named in the glossary, and a page that used
 *   the same word for the field and for the body that issues nothing here would
 *   read as though the number had been checked with them. It has not.
 *
 *   «الضابط» for a control, in the audit sense the English uses. «الفصل بين
 *   المهام» is the settled Arabic for separation of duties and is what an auditor
 *   in this market writes.
 *
 *   «لم يؤكده أحد» for "asserted" — claimed and not established. It is the same
 *   verb as «لا يؤكدها النظام إطلاقا» in the claims table, deliberately: the licence
 *   number on an export is asserted in exactly the sense regulatory validity is
 *   never asserted. It replaced «مُدَّعى», which needs a shadda to be read at all.
 *
 *   «الدراسة» for a run and «الناتج» for what the run produces — §5b. «التشغيلة»
 *   is a manufacturing batch, and «المخرَج» unvowelled reads as an exit.
 *
 * NO DIGIT APPEARS BELOW, in either script. «أمرين اثنين» and «اثنا عشر محرفا» are
 * written as words for the same reason the English writes "two" and "twelve" — the
 * page's guarantee is that no figure reaches it, and Arabic-Indic digits would
 * break it twice over.
 */

import type { AntechamberDictionary } from './antechamber.en.js';

export const AR: AntechamberDictionary = {
  hero: {
    title: 'قبل أن يفتح المحرك',

    lede: {
      record:
        'كل قيمة تحددها يحفظها النظام مقترنة بالاسم الذي تكتبه هنا، ويطبع هذا الاسم على ' +
        /* «يمكن تتبعه» and not a bare passive. The English says a figure CAN be
           traced; «يتتبع» would say every figure IS traced, which is a stronger
           claim than the page makes and therefore the wrong one. */
        'الناتج ويظهر عند كل بوابة — فأي رقم في النتيجة يمكن تتبعه رجوعا إلى من أدخله. ' +
        'ولا يوجد وضع مجهول الهوية، وهذا قرار تصميمي لا سهو.',

      /*
        «لا يجري التحقق منه لدى أي جهة» — the reader's own word, negated.

        Verification is the control a reader assumes a licence field implies, so the
        denial has to use «التحقق» itself. «لا يؤكد» would be true and softer, and
        softer here is the failure: it answers a question nobody asked.

        «ولا تجري مقارنته بمن أنشأ الدراسة» is the second refusal and it is not
        optional. Dropping it would leave a sentence that denies verification while
        letting a reader keep believing the reviewer is somebody else.
      */
      licence:
        'حقل الرخصة يسجله النظام ولا يفعل به شيئا بعد ذلك. لا يجري التحقق منه لدى أي ' +
        'جهة، ولا تجري مقارنته بمن أنشأ الدراسة، فأن تنشئ دراسة وتوقعها بنفسك أمر يسمح ' +
        'به هذا النشر ويسجله. وكل ما تفعله بوابة المراجعة أن تكتب على الناتج اسما، ورقم ' +
        'رخصة لم يؤكده أحد، وختما زمنيا. والفصل بين المهام ضابط لا تملكه هذه البرمجية، ' +
        'وضابط معلن لا يطبق أسوأ من ضابط غائب، لأن الغائب ظاهر.',

      /*
        «أمرين اثنين لا غير» carries "exactly two things" as a word, and the two
        refusals either side of the offer are restated rather than assumed to carry
        over from the paragraph above — the English restates them for that reason
        and an Arabic that trimmed them would be shorter and weaker.
      */
      account:
        'الحساب كلمة مرور وجلسة، ويغير أمرين اثنين لا غير: يحفظ دراساتك باسمك، ويحفظ ما ' +
        'تكتبه أولا بأول، فإغلاق علامة التبويب لا يضيعه. ولا يغير شيئا في الرخصة — تبقى ' +
        'مسجلة، ولا يتحقق منها أحد — ولا شيئا في الفصل بين المهام، الذي لا تزال هذه ' +
        /* «يعمل المحرك بالطريقة نفسها» is the chrome's own wording for this exact
           claim — `untranslated.body` in `chrome.ar.ts` — and the same claim gets
           the same words on every screen. */
        'البرمجية لا تفرضه. ولك أن تمضي باسم وحده: يعمل المحرك بالطريقة نفسها، ولا يحفظ ' +
        'شيئا مما تكتبه، ولا تفتح دراساتك إلا من هذا المتصفح — فإن مسحت بياناته أو ' +
        'انتقلت إلى غيره تعذر الوصول إليها.',
    },
  },

  account: {
    /* «فحص» and not «تحقق»: the panel is asking the server a question, and
       «التحقق» is the word this screen spends three paragraphs denying about the
       licence. Using it for something the software does do would blunt the denial. */
    checking: 'يجري فحص ما إذا كنت مسجل الدخول…',
    offline:
      'تعذر الوصول إلى خدمة الحسابات، فحالة دخولك غير معروفة. وإدخال اسم أدناه يفتح ' +
      'المحرك على أي حال؛ ولن يحفظ النظام ما تكتبه أولا بأول، ولن تفتح دراساتك إلا من ' +
      'هذا المتصفح.',

    signedIn: {
      heading: 'مسجل الدخول',
      terms:
        /* «في أثنائها» and not «في الطريق». The English "on the way" is idiomatic
           for "as the run goes"; the Arabic calque reads as a journey on a road,
           which is the machine-translation register §5 forbids. */
        'الدراسات التي تنشئها يحفظها هذا الحساب، ويحفظ ما تكتبه في أثنائها أولا بأول. ' +
        'ورقم الرخصة المسجل على الناتج يبقى دون تحقق لدى أحد.',
      signOut: 'الخروج من الحساب',
      licence: 'رقم الرخصة في هذا الحساب: ',
      noLicence: 'لا يوجد رقم رخصة في هذا الحساب. وما يوقعه يسجل أنه لم تذكر رخصة.',
    },

    /* A heading names the panel and a button commands an action; English spells
       both "Sign in" and Arabic does not. The masdar heads the panel, the short
       form sits on the button. */
    heading: {
      in: 'تسجيل الدخول',
      up: 'إنشاء حساب',
    },

    terms:
      'يحفظ الحساب دراساتك ويحفظ ما تكتبه أولا بأول. وبدونه يعمل المحرك بالطريقة نفسها، ' +
      'ولا يحفظ شيئا مما تكتبه، ولا تفتح دراساتك إلا من هذا المتصفح.',

    fields: {
      name: {
        label: 'اسمك',
        help: 'هذا هو الاسم الذي يطبع على الناتج ويظهر بجانب كل قيمة تحددها.',
      },
      email: {
        label: 'البريد الإلكتروني',
        help: 'يستعمل لتسجيل الدخول. وليس هو ما يظهر على الناتج — بل الاسم.',
      },
      password: {
        label: 'كلمة المرور',
        /* «اثنا عشر محرفا» — the number as a word, never a digit. */
        helpUp:
          'اثنا عشر محرفا على الأقل. الطول هو القاعدة الوحيدة — لا اشتراط لحروف كبيرة ' +
          'ولا لرموز، لأنها تنتج كلمات مرور أضعف لا أقوى.',
        /* «بصمتها الرقمية» rather than «قيمة التجزئة»: the reader of this screen is
           a consultant, not a cryptographer, and the claim being made is that the
           password itself is not kept. */
        helpIn:
          'لا يحفظ النظام كلمة المرور نفسها، بل بصمتها الرقمية وحدها، فلا سبيل إلى ' +
          'استرجاعها — والبديل استبدالها.',
      },
      /* «ولا يؤكده أحد», as on the name-only form below: confirm, not verify. */
      licence: {
        label: 'رقم الرخصة المهنية (اختياري)',
        help:
          'يلزم لتوقيع المراجعة. يسجل كما تكتبه، ولا يؤكده أحد. ولا يمكن إضافته لاحقا.',
      },
    },

    submit: {
      busy: 'جاري التنفيذ…',
      in: 'الدخول',
      up: 'أنشئ الحساب',
    },

    toggle: {
      toUp: 'إنشاء حساب جديد بدلا من ذلك',
      toIn: 'لدي حساب بالفعل',
    },

    error: {
      /* Lower case in the English because it is a fragment the server's own
         sentences match; Arabic has no case, and the fragment reads as one. */
      unknown: 'لم ينجح ذلك، والسبب غير معروف',
    },
  },

  form: {
    heading: 'الاسم الذي تحمله هذه الدراسة',

    name: {
      label: 'اسمك',
      help: 'مطلوب. يطبع على الناتج ويظهر بجانب كل قيمة تحددها.',
      error: {
        lead: 'لم تدخل اسما.',
        body: 'كل قيمة تسجلها الدراسة تحمل اسما، فلا يفتح المحرك بدونه.',
      },
    },

    licence: {
      label: 'رقم الرخصة المهنية (اختياري)',
      /* «ولا يؤكده أحد» mirrors the English "not confirmed with anybody" — confirm,
         not verify, because the English distinguishes the two here and the prose
         above carries the stronger denial. */
      help: 'يسجل كما تكتبه، ولا يؤكده أحد.',
    },

    hints: {
      demo:
        'يطلب هذا العنوان المثال المحسوب المسجل — الدراسة التي تقتبس الصفحة الرئيسية ' +
        'أرقامها. ويمرر إلى المحرك كما هو تماما، ولك أن تبدأ من قطعة أرضك أنت بدلا منه ' +
        'في الخطوة الأولى.',

      /*
        The two runs between these fragments are Latin and isolated: the step id the
        visitor typed, and the engine's own list. «...» opens in `lead` and closes
        in `between`, so the closing mark belongs to the Arabic run and stays where
        the sentence puts it rather than migrating past the identifier.
      */
      unknownStep: {
        lead: 'لا توجد خطوة اسمها «',
        between: '». والخطوات هي: ',
        tail: '. ويفتح المحرك عند أولاها، بدلا من أن يضع شاشة أخرى مكان التي سماها هذا العنوان.',
      },
    },

    cta: {
      submit: 'افتح المحرك بهذا الاسم',
      /* The same words as the route's own label in `chrome.ar.ts`, so the button and
         the page it opens are not two names for one thing. */
      refusals: 'ما يرفضه',
      note: 'تعرض تلك الصفحة بالكامل ما تسجله بوابة المراجعة وما لا تفحصه.',
    },
  },

  closing: {
    heading: 'ما لا يفعله إدخال الاسم',
    /* «لا يقارنك بأي شيء» for "does not check you against anything". «في مقابل» is
       a calque of the English preposition and reads as "in exchange for"; the verb
       that carries "check against" in Arabic is «قارن», and it is the same verb the
       licence paragraph uses to deny the other comparison, so one idea keeps one
       word across the page. */
    body:
      'لا يقارنك النظام بأي شيء، ولا يحرك رقما واحدا. القطعة نفسها والقواعد نفسها ' +
      'والافتراضات المعلنة نفسها تعطي الإجابة نفسها أيا كان من يجلس إلى لوحة المفاتيح. ' +
      'وما يغيره الاسم هو السجل: يحمله الناتج، وتحمله كل قيمة تحددها بجانبها.',
    readiness: {
      lead: 'ما ليس جاهزا في هذا النشر محصور في ',
      link: 'صفحة الجاهزية',
      tail: '، ولا يغير منه اسم يدخل هنا شيئا.',
    },
  },
};
