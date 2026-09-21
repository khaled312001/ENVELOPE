/**
 * العربية — `/app`، الغرفة التي تسبق المحرّك، ولوحة الحساب التي تعرضها.
 *
 * Held to `AntechamberDictionary` by the type system, so this file cannot be
 * missing a key. Every choice is argued in `docs/05-design/arabic-glossary.md`; the
 * comments here record only what would otherwise look like a mistranslation.
 *
 * THIS SCREEN IS THREE REFUSALS AND A FORM, and the refusals are the reason the
 * page exists:
 *
 *   1. the licence is RECORDED and NOT VERIFIED — «تُسجَّل ولا يُتحقَّق منها»;
 *   2. separation of duties is NOT ENFORCED — «الفصل بين المهامّ ضابط لا تملكه»;
 *   3. running without an account KEEPS NOTHING — «لا يُحفَظ شيء».
 *
 * Each is stated with the same force as the English and with no hedge: no «قد», no
 * «ربما», no «عادةً». A hedge in a refusal is a claim, and a refusal that reads
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
 *   المهامّ» is the settled Arabic for separation of duties and is what an auditor
 *   in this market writes.
 *
 *   «مُدَّعى» for "asserted" — claimed and not established. It is the same root as
 *   «لا يُدَّعى بها» in the permanent sentence, deliberately: the licence number on
 *   an export is asserted in exactly the sense regulatory validity is never
 *   asserted.
 *
 *   «التشغيلة» for a run, «المُخرَج» for an export, «بوّابة» for a gate — the
 *   glossary's own terms, so the same object is not called two things across two
 *   screens.
 *
 * NO DIGIT APPEARS BELOW, in either script. «أمرين اثنين» and «اثنا عشر محرفًا» are
 * written as words for the same reason the English writes "two" and "twelve" — the
 * page's guarantee is that no figure reaches it, and Arabic-Indic digits would
 * break it twice over.
 */

import type { AntechamberDictionary } from './antechamber.en.js';

export const AR: AntechamberDictionary = {
  hero: {
    title: 'قبل أن يفتح المحرّك',

    lede: {
      record:
        'كل قيمة تُحدّدها تُسجَّل مقترنةً بالاسم الذي تُدخله هنا، ويُطبع هذا الاسم على المُخرَج ' +
        /* «يمكن تتبُّع» and not «يُتتبَّع». The English says a figure CAN be traced;
           the bare passive would say every figure IS traced, which is a stronger
           claim than the page makes and therefore the wrong one. */
        'ويُكتب عند كل بوّابة — فيمكن تتبُّع أيّ رقم في الناتج رجوعًا إلى من أدخله. لا يوجد وضع ' +
        'مجهول الهوية، وهذا قرار تصميمي لا سهو.',

      /*
        «لا يُتحقَّق منه لدى أيّ جهة» — the reader's own word, negated.

        Verification is the control a reader assumes a licence field implies, so the
        denial has to use «التحقّق» itself. «لا يُؤكَّد» would be true and softer,
        and softer here is the failure: it answers a question nobody asked.

        «لا يُقارَن بمن أنشأ التشغيلة» is the second refusal and it is not optional.
        Dropping it would leave a sentence that denies verification while letting a
        reader keep believing the reviewer is somebody else.
      */
      licence:
        'حقل الرخصة يُسجَّل ولا يحدث له شيء بعد ذلك. لا يُتحقَّق منه لدى أيّ جهة، ولا يُقارَن ' +
        'بمن أنشأ التشغيلة، فأن تُنشئ تشغيلة وتوقّعها بنفسك أمرٌ يسمح به هذا النشر ويُسجّله. ' +
        'وما تفعله بوّابة المراجعة هو أن تكتب على المُخرَج اسمًا ورقم رخصة مُدَّعى وختمًا زمنيًّا. ' +
        'الفصل بين المهامّ ضابطٌ لا تملكه هذه البرمجية، والضابط المُدَّعى أسوأ من الضابط الغائب، ' +
        'لأنّ الغائب ظاهر.',

      /*
        «أمرين اثنين لا غير» carries "exactly two things" as a word, and the two
        refusals either side of the offer are restated rather than assumed to carry
        over from the paragraph above — the English restates them for that reason
        and an Arabic that trimmed them would be shorter and weaker.
      */
      account:
        'الحساب كلمة مرور وجلسة، ويُغيّر أمرين اثنين لا غير: تُحفَظ تشغيلاتك باسمك، ويُحفَظ ما ' +
        'تكتبه أوّلًا بأوّل، فإغلاق علامة التبويب لا يُضيّعه. ولا يُغيّر شيئًا في الرخصة — تبقى ' +
        'مُسجَّلة، ولا يُتحقَّق منها لدى أحد — ولا شيئًا في الفصل بين المهامّ، الذي لا تزال هذه ' +
        /* «يعمل المحرّك بالطريقة نفسها» is the chrome's own wording for this exact
           claim — `untranslated.body` in `chrome.ar.ts` — and the same claim gets
           the same words on every screen. The flourish it replaces («يسلك المسلك
           نفسه») was ornate where the English is flat, and the register section of
           the glossary exists to keep Arabic elaboration out of a refusal. */
        'البرمجية لا تفرضه. ولك أن تمضي باسم وحده: يعمل المحرّك بالطريقة نفسها ولا يُحفَظ شيء.',
    },
  },

  account: {
    /* «فحص» and not «تحقّق»: the panel is asking the server a question, and
       «التحقّق» is the word this screen spends three paragraphs denying about the
       licence. Using it for something the software does do would blunt the denial. */
    checking: 'يجري فحص ما إذا كنت مُسجّل الدخول…',
    offline:
      'تعذّر الوصول إلى خدمة الحسابات، فحالة دخولك غير معروفة. وإدخال اسم أدناه يفتح المحرّك ' +
      'على أيّ حال؛ ولا يُحفَظ شيء.',

    signedIn: {
      heading: 'مُسجّل الدخول',
      terms:
        /* «في أثناء ذلك» and not «في الطريق». The English "on the way" is idiomatic
           for "as the run goes"; the Arabic calque reads as a journey on a road,
           which is the machine-translation register §5 forbids. */
        'التشغيلات التي تُنشئها تُحفَظ في هذا الحساب، ويُحفَظ ما تكتبه في أثناء ذلك أوّلًا بأوّل. ' +
        'والرخصة المُسجَّلة على المُخرَج لا تزال دون تحقُّق لدى أحد.',
      signOut: 'سجِّل الخروج',
    },

    /* A heading names the panel and a button commands an action; English spells
       both "Sign in" and Arabic does not. The masdar heads the panel, the
       imperative sits on the button — matching «شغِّل قطعة» in the chrome. */
    heading: {
      in: 'تسجيل الدخول',
      up: 'إنشاء حساب',
    },

    terms:
      'يحفظ الحساب تشغيلاتك ويحفظ ما تكتبه أوّلًا بأوّل. وبدونه يعمل المحرّك بالطريقة نفسها ولا ' +
      'يُحفَظ شيء.',

    fields: {
      name: {
        label: 'اسمك',
        help: 'هذا هو الاسم الذي يُطبع على المُخرَج ويُكتب بجانب كل قيمة تُحدّدها.',
      },
      email: {
        label: 'البريد الإلكتروني',
        help: 'يُستخدم لتسجيل الدخول. وهو ليس ما يظهر على المُخرَج — بل الاسم.',
      },
      password: {
        label: 'كلمة المرور',
        /* «اثنا عشر محرفًا» — the number as a word, never a digit. */
        helpUp:
          'اثنا عشر محرفًا على الأقل. الطول هو القاعدة الوحيدة — لا اشتراط لحروف كبيرة ولا ' +
          'لرموز، لأنّها تُنتج كلمات مرور أضعف لا أقوى.',
        /* «قيمة التجزئة» is the settled Arabic for a hash and needs no gloss. */
        helpIn: 'لا يُحفَظ منها إلا قيمة التجزئة، فلا يمكن استرجاعها — بل استبدالها فقط.',
      },
    },

    submit: {
      busy: 'يجري التنفيذ…',
      in: 'سجِّل الدخول',
      up: 'أنشئ الحساب',
    },

    toggle: {
      toUp: 'أنشئ حسابًا بدلًا من ذلك',
      toIn: 'لديّ حساب بالفعل',
    },

    error: {
      /* Lower case in the English because it is a fragment the server's own
         sentences match; Arabic has no case, and the fragment reads as one. */
      unknown: 'لم ينجح ذلك، والسبب غير معروف',
    },
  },

  form: {
    heading: 'الاسم الذي ستحمله هذه التشغيلة',

    name: {
      label: 'اسمك',
      help: 'مطلوب. يُطبع على المُخرَج ويُكتب بجانب كل قيمة تُحدّدها.',
      error: {
        lead: 'لم يُدخَل اسم.',
        body: 'كل قيمة تُسجّلها التشغيلة تحمل اسمًا، فلا يفتح المحرّك بدونه.',
      },
    },

    licence: {
      label: 'رقم الرخصة المهنية (اختياري)',
      /* «لا يُؤكَّد لدى أحد» mirrors the English "not confirmed with anybody" —
         confirm, not verify, because the English distinguishes the two here and the
         prose above carries the stronger denial. */
      help: 'يُسجَّل كما تكتبه، ولا يُؤكَّد لدى أحد.',
    },

    hints: {
      demo:
        'يطلب هذا العنوان المثال المحلول المُسجَّل — التشغيلة التي تقتبس الصفحة الرئيسية ' +
        'أرقامها. ويُمرَّر إلى المحرّك كما اتّبعته تمامًا، والبدء من قطعة أرضك أنت بدلًا منه خيارٌ ' +
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
        tail: '. ويفتح المحرّك عند أولاها بدلًا من أن يستبدل شاشةً أخرى بالتي سمّاها هذا العنوان.',
      },
    },

    cta: {
      submit: 'افتح المحرّك بهذا الاسم مُسجَّلًا',
      /* The same words as the route's own label in `chrome.ar.ts`, so the button and
         the page it opens are not two names for one thing. */
      refusals: 'ما يرفضه',
      note: 'تعرض تلك الصفحة بالكامل ما تُسجّله بوّابة المراجعة وما لا تفحصه.',
    },
  },

  closing: {
    heading: 'ما لا يفعله إدخال الاسم',
    /* «لا يقارنك بأيّ شيء» for "does not check you against anything". «في مقابل» is
       a calque of the English preposition and reads as "in exchange for"; the verb
       that carries "check against" in Arabic is «قارن», and it is the same verb the
       licence paragraph uses to deny the other comparison («ولا يُقارَن بمن أنشأ
       التشغيلة»), so one idea keeps one word across the page. */
    body:
      'لا يقارنك بأيّ شيء، ولا يُحرّك شيئًا من الأرقام. القطعة نفسها والقواعد نفسها ' +
      'والافتراضات المُعلَنة نفسها تُعيد الإجابة نفسها أيًّا كان من يجلس إلى لوحة المفاتيح. ' +
      'وما يُغيّره الاسم هو ' +
      'السجلّ: يحمله المُخرَج، وتحمله كل قيمة تُحدّدها بجانبها.',
    readiness: {
      lead: 'ما ليس جاهزًا في هذا النشر يُحصى في ',
      link: 'صفحة الجاهزية',
      tail: '، ولا يُحرّك اسمٌ يُدخَل هنا شيئًا منه.',
    },
  },
};
