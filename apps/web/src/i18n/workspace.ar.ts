/**
 * `/workspace` بالعربية الفصحى.
 *
 * ---------------------------------------------------------------------------
 * THE FOUR DISCLOSURES SURVIVE THE TRANSLATION, AND THAT IS THE WHOLE TEST.
 *
 * `docs/05-design/arabic-glossary.md` §1: a translation failure is invisible to
 * everyone who reads only the original. This page's English says four things a
 * product in this category usually does not say — the name is unverified, members
 * read each other's work, a licence is recorded and never verified, and nothing
 * stops an author signing their own review. An Arabic version that rendered the
 * roles table correctly and softened those four would be a page that passes every
 * mechanical check and undoes the engineering.
 *
 * So each is translated as a REFUSAL in the register §3 sets: verbal sentences,
 * present tense, no **قد**, no hedge. Specifically:
 *
 *   «لا يتحقّق أحد» — nobody verifies. The absence of an act, as «لم يُقيَّم» is.
 *   «يُسجَّل ولا يُتحقَّق منه» — recorded and never verified, the same construction
 *     `/settings` and `/refusals` already carry.
 *   «لا شيء هنا يمنع» — nothing here prevents. Not «قد يستطيع», which would be a
 *     hedge in a refusal, and a hedge in a refusal is a claim.
 *
 * TERMS TAKEN FROM THE GLOSSARY: قطعة الأرض · التشغيلة · الارتداد is not needed
 * here · البوّابة for a gate · مُفترَض is deliberately ABSENT from this page,
 * because nothing on it is an assumed value and the word is reserved.
 *
 * «مساحة العمل» is the term for a workspace: it is the standard Arabic rendering,
 * it is not a transliteration, and it does not collide with «المساحة» as an area —
 * the compound carries the sense. «المنظّمة» was rejected: it reads as an NGO.
 */

import type { WorkspaceDictionary } from './workspace.en.js';

export const AR: WorkspaceDictionary = {
  title: 'مساحة العمل',
  lede: 'مكتبٌ، ومَن فيه، وما يحقّ لكلٍّ منهم. لا يتحقّق أحد من شيء هنا — هذا ما أخبرتَ به أنت وزملاؤك هذا المنتج عن أنفسكم.',

  /* ------------------------------------------------------------- no workspace */
  empty: {
    heading: 'تعمل وحدك',
    lede: 'كل ما تحسبه ملكٌ لك وحدك. لا يفتحه أحد غيرك، ولا يُطلب من أحد مراجعته — التشغيلة تُشارَك واحدةً واحدة، إلى عنوان واحد، منك أنت.',
    value:
      'مساحة العمل تغيّر ذلك. يفتح الزملاء فيها تشغيلات بعضهم دون منحٍ لكل تشغيلة على حدة، ومغادرة أحدهم إجراءٌ واحد بدل البحث في كل تشغيلة أُرسلت إليه يومًا، والمراجعة التي توقّع التصدير تأتي ممّن يجلس بجوارك.',
    create: 'سمِّ مكتبك',
    help: 'الاسم الذي يعرفه زملاؤك. يمكنك تغييره لاحقًا، ولا شيء يتحقّق منه.',
    submit: 'أنشئ مساحة العمل',
    creating: 'يجري الإنشاء…',
    missing: 'أعطِ مساحة العمل اسمًا يعرفه زملاؤك.',
  },

  /* ---------------------------------------------------------------- switching */
  picker: {
    label: 'تعمل داخل',
    personal: 'وحدي',
    effect:
      'تُحفَظ القطع والتشغيلات الجديدة هنا. تحتفظ التشغيلة بمساحة العمل التي حُسبت فيها — لا يمكن نقلها بعد ذلك، فتحقّق من هذا قبل أن تبدأ.',
    personalEffect:
      'القطع والتشغيلات الجديدة لك وحدك. لن يراها أحد في مساحات عملك ما لم تشارك واحدة.',
    another: 'أنشئ مساحة عمل أخرى',
  },

  /* ------------------------------------------------------------------ members */
  members: {
    heading: 'الأشخاص',
    lede: 'كل من هنا يفتح كل قطعة وكل تشغيلة حُسبت في مساحة العمل هذه، بما في ذلك ما لم يصنعه هو.',
    disclosure:
      'ويشمل ذلك رقم القطعة، والافتراضات التي أدخلها أحدهم بيده، والأسباب التي كتبها لها. مساحة العمل ملفٌّ مشترك، لا مجلّد مشترك.',
    columns: {
      person: 'الشخص',
      role: 'الدور',
      since: 'في مساحة العمل منذ',
      actions: 'تغيير',
    },
    you: 'أنت',
    missingAccount: 'لم يعد هذا الحساب موجودًا',
    noLicence: 'لا رخصة مُعلَنة',
    licenceLabel: 'الرخصة',
    remove: 'أزِل',
    removing: 'تجري الإزالة…',
    leave: 'غادر مساحة العمل',
    leaving: 'تجري المغادرة…',
    confirmRemove: 'إزالة {name} من مساحة العمل؟',
    confirmRemoveBody:
      'يفقد الوصول إلى كل قطعة وكل تشغيلة فيها، بما في ذلك ما صنعه هو. تبقى التشغيلات التي ألّفها — لا تُحذف تشغيلة أبدًا — ويحتفظ بها في أعماله هو.',
    confirmRemoveAction: 'أزِل {name}',
    confirmLeave: 'مغادرة مساحة العمل؟',
    confirmLeaveBody:
      'تفقد الوصول إلى كل قطعة وكل تشغيلة فيها، بما في ذلك ما صنعته أنت. للعودة، على أحد من هنا أن يدعوك من جديد.',
    confirmLeaveAction: 'غادر مساحة العمل',
    cancel: 'إلغاء',
    roleSaving: 'يجري الحفظ…',
  },

  /* -------------------------------------------------------------------- roles */
  roles: {
    heading: 'ما يحقّ لكل دور',
    owner: {
      name: 'مالك',
      can: 'كل ما يحقّ للمسؤول، وله أن يعيد تسمية مساحة العمل، وأن يغيّر دور أيّ أحد، وأن يجعل غيره مالكًا.',
    },
    admin: {
      name: 'مسؤول',
      can: 'يدعو الأشخاص، ويغيّر دور من هم دونه، ويزيلهم. لا يمسّ مالكًا.',
    },
    member: {
      name: 'عضو',
      can: 'يُدخل القطع، ويُشغّل المحرّك، ويوقّع مراجعة. ويقرأ كل ما في مساحة العمل.',
    },
    viewer: {
      name: 'مُطّلِع',
      can: 'يقرأ كل ما في مساحة العمل ويصدّره. لا يُدخل قطعة ولا يبدأ تشغيلة.',
    },
    lastOwner:
      'المالك الأخير لا يغادر ولا يُزال. مساحة عمل بلا مالك لا يُعاد تسميتها، ولا تدعو أحدًا، ولا تُصلَح من داخل TOP.ai.',
    reviewNote:
      'لأيّ أحد في مساحة العمل أن يوقّع بوّابة المراجعة على تشغيلة، إن وضع رقم رخصة على حسابه. ذلك الرقم يُسجَّل ولا يُتحقَّق منه — لا سجلّ مهنيّ موصول — ولا شيء هنا يمنع من حسب التشغيلة أن يوقّعها بنفسه. الدور ليس عينًا ثانية؛ هو فقط يقول مَن يُسمح له أن يكونها.',
  },

  /* -------------------------------------------------------------- invitations */
  invites: {
    heading: 'الدعوات',
    lede: 'الدعوة رابط. لا يُرسل TOP.ai بريدًا ولا يدّعي ذلك، فتحمل الرابط إلى الشخص بنفسك.',
    emailLabel: 'عنوان بريده الإلكتروني',
    emailHelp:
      'لا بدّ أن يكون العنوان المسجَّل على حسابه في TOP.ai. الرابط لا يعمل إلا لذلك الحساب — وإلّا لدخل كلُّ من فتحه.',
    roleLabel: 'الدور',
    submit: 'أنشئ دعوة',
    submitting: 'يجري إنشاء الرابط…',
    missingEmail: 'أدخل عنوان البريد المسجَّل على حسابه.',

    madeHeading: 'الرابط، مرّة واحدة',
    madeLede:
      'انسخه الآن وأرسله إليه. لا يُخزَّن ولا يمكن إظهاره ثانية — فإن ضاع منك فأنشئ دعوة أخرى، وهي لا تسحب شيئًا: يظل الرابط الأول صالحًا حتى ينتهي أجله أو تسحبه أنت.',
    copy: 'انسخ الرابط',
    copied: 'نُسخ.',
    copyFailed: 'حدّد الرابط وانسخه.',
    expires: 'ينتهي',

    listHeading: 'المعلّقة',
    none: 'لم يُدعَ أحد بعد.',
    noneAdmin: 'حين تدعو أحدًا، يظهر الرابط هنا حتى يُستخدم.',
    columns: { person: 'المدعوّ', role: 'بصفة', state: 'الحالة', expires: 'ينتهي', actions: '' },
    withdraw: 'اسحب',
    withdrawing: 'يجري السحب…',
    confirmWithdraw: 'سحب الدعوة الموجّهة إلى {email}؟',
    confirmWithdrawBody: 'يتوقّف الرابط عن العمل. ولك أن تنشئ رابطًا جديدًا متى شئت.',
    confirmWithdrawAction: 'اسحب الدعوة',
    state: {
      open: 'في الانتظار',
      accepted: 'قُبلت',
      withdrawn: 'سُحبت',
      expired: 'انتهى أجلها',
    },
    hiddenFromMembers: 'لا يرى المدعوّين إلا المالكون والمسؤولون. أنت عضو في مساحة العمل هذه.',
  },

  /* ------------------------------------------------------------------ renaming */
  rename: {
    heading: 'اسم مساحة العمل',
    lede: 'اسمٌ اختاره أعضاؤها. لا شيء تحقّق من وجود مكتب بهذا الاسم، ولا من أنّ من هنا يعملون فيه — ولا يقول أيُّ مُخرَج من TOP.ai غير ذلك.',
    label: 'الاسم',
    submit: 'احفظ الاسم',
    saving: 'يجري الحفظ…',
    saved: 'حُفظ.',
    missing: 'مساحة العمل تحتاج اسمًا.',
    ownerOnly: 'لا يعيد التسمية إلا مالك.',
  },

  /* --------------------------------------------------------------------- audit */
  audit: {
    heading: 'ما جرى هنا',
    lede: 'كل تغيير في مساحة العمل هذه، بترتيب حدوثه. لا يُعدَّل شيء منه ولا يُحذف، من أيّ أحد، ولا من مالك.',
    adminOnly: 'يقرأ هذا المالكون والمسؤولون.',
    none: 'لم يجرِ شيء في مساحة العمل هذه بعد.',
    renamed:
      'من يغيّر اسمه لاحقًا يظهر هنا بالاسم الذي كان له حينها. سجلٌّ يعيد كتابة نفسه ليس سجلًّا.',
    then: 'وكان يُعرَف حينها بـ',
    actions: {
      'org.created': 'أنشأ مساحة العمل',
      'org.renamed': 'أعاد تسمية مساحة العمل',
      'invite.created': 'دعا',
      'invite.revoked': 'سحب الدعوة الموجّهة إلى',
      'invite.accepted': 'انضمّ إلى مساحة العمل',
      'member.role_changed': 'غيّر دورًا',
      'member.removed': 'أزال',
      'member.left': 'غادر مساحة العمل',
      'run.created': 'حسب تشغيلة',
      'gate.signed': 'وقّع بوّابة',
      unknown: 'فعل شيئًا لا اسم له في هذه النسخة',
    },
    roleChange: 'من {from} إلى {to}',
    onPlot: 'على القطعة {plot}',
    gate: 'البوّابة {gate}',
    licenceAsserted: 'رخصة مُعلَنة: {licence}',
    noLicence: 'لا رخصة مُعلَنة',
    more: 'أظهر المزيد',
  },

  /* ------------------------------------------------------------- accept-invite */
  accept: {
    title: 'دعوة',
    checking: 'تجري قراءة الدعوة…',
    heading: 'دُعيتَ إلى {organisation}',
    asRole: 'بصفة {role}',
    lede: 'الانضمام يعني أن كل من في مساحة العمل هذه يفتح كل قطعة وكل تشغيلة فيها، وأنك تفتح ما لهم.',
    submit: 'انضمّ إلى {organisation}',
    submitting: 'يجري الانضمام…',
    joined: 'أنت الآن في {organisation}.',
    already: 'كنت بالفعل في {organisation}.',
    continue: 'اذهب إلى مساحة العمل',
    signInFirst: 'سجّل الدخول بالحساب الذي أُرسلت إليه هذه الدعوة',
    signInWhy:
      'لا يعمل الرابط إلا للحساب صاحب العنوان الذي أُرسل إليه. سجّل الدخول، أو أنشئ حسابًا بذلك العنوان، ثم افتح الرابط مرّة أخرى.',
    noToken: 'لا دعوة في هذا العنوان.',
    noTokenHelp:
      'رابط الدعوة يحمل رمزًا. اطلب ممّن دعاك أن يرسل الرابط كاملًا كما وصله.',
  },

  /* --------------------------------------------------------------------- state */
  state: {
    loading: 'يجري تحميل مساحة العمل…',
    offline: 'تعذّر تحميل مساحة العمل',
    offlineHelp: 'هذا فشلٌ في الطلب، لا جوابٌ عن عضويتك. أعد المحاولة؛ لم يتغيّر شيء.',
    retry: 'أعد المحاولة',
    signedOut: 'مساحة العمل تخصّ حسابًا',
    signedOutHelp:
      'سجّل الدخول لترى المكاتب التي أنت فيها. هويّة الضيف مفتاحٌ محفوظ في متصفّح واحد — لا يحمل عضوية، ومسح المتصفّح يُفقده.',
    signIn: 'تسجيل الدخول',
  },
};
