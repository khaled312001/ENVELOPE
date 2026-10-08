/**
 * العربية — `/exports`، ما يخرج منه.
 *
 * Held to `ExportsDictionary` by the type system, so this file cannot be missing a
 * key. Every term is checked against `docs/05-design/arabic-glossary.md`; the
 * comments here record only what would otherwise read as a mistranslation.
 *
 * ---------------------------------------------------------------------------
 * WHAT STAYS ENGLISH ON THE ARABIC PAGE, AND WHY IT IS NOT IN THIS FILE.
 *
 * Everything the page read out of a file: layer names, sheet numbers AND sheet
 * titles, the workbook's sheet names, the notes above its tables and its Status
 * line, the glTF version and extension names, the model's notice sentences, the
 * JSON's field names and its `regulatoryValidity` status and detail, the status
 * codes. A reader holding the DXF sees `Parking level B1`, not «دور المواقف B1»,
 * and a page that showed the second would be quoting a file that does not exist.
 * The component sets each of them `Verbatim` or in `code`.
 *
 * ---------------------------------------------------------------------------
 * THE PROHIBITIONS, IN ARABIC TOO.
 *
 * - No program is named. «برنامج يفتح الملف» is the generic phrase the English
 *   uses, and no name follows it.
 * - No count of formats. The list is the list.
 * - Never "two people sign". «لا تشترط بوابة المراجعة شخصا ثانيا» denies it, and
 *   «وقع دراسته هو» is the correction the test holds present.
 * - «رقم رخصة لم يؤكده أحد» — asserted, the same verb as «لا يؤكدها النظام
 *   إطلاقا» in the claims table, on purpose. The licence is recorded and never
 *   verified.
 *
 * TWO KINDS OF SHEET, TWO WORDS. A drawing sheet is «لوحة», as on a drawing
 * register; a workbook sheet is «ورقة». English uses one word for both and the
 * page would be ambiguous in Arabic without the split.
 *
 * NO DIGIT. `R12` and `A3` are the component's, set between the halves of the
 * sentences that name them.
 */

import type { ExportsDictionary } from './exports.en.js';

export const AR: ExportsDictionary = {
  fileNames: {
    json: 'ملف JSON',
    html: 'التقرير',
    sheets: 'مجموعة الرسومات',
    dxf: 'الرسم',
    xlsx: 'المصنف',
    glb: 'ملف النموذج',
  },

  gateNames: {
    G3_ASSUMPTIONS_ACKNOWLEDGED: 'سجل الافتراضات',
    G4_REVIEWER_NAMED: 'مراجع محدد بالاسم',
  },

  /* The Arabic comma. The Latin one reads as an interruption in Arabic type. */
  listSeparator: '، ',
  gateJoin: '، و',

  hero: {
    /* The route's own label in `chrome.ar.ts`. */
    title: 'ما يخرج منه',
    lede:
      'كل ملف يكتبه هذا المحرك يقول إن صلاحيته التنظيمية لم تخضع للتقييم، ولا يغادر أي ' +
      'منها قبل الاطلاع على سجل الافتراضات، وقبل أن يضع شخص محدد بالاسم اسمه على الناتج.',
    note:
      'كل طبقة ولوحة وورقة وملاحظة وإصدار أدناه مقروء من الملفات التي كتبها المحرك ' +
      'للمثال المحسوب على الصفحة الرئيسية، بالفحص الذي يجري قبل بناء هذا الموقع. ولا ' +
      'شيء منها مكتوب هنا باليد: الملف الذي يتغير يغير هذه الصفحة، أو يوقف البناء.',
  },

  drawing: {
    title: 'الرسم',
    lede: {
      /* «ترويسة الملف» for the file's header — the word `notFound.ar.ts` uses for a
         header, and not «العنوان», which is an address or a title. */
      afterFormat: ' — وترويسة الملف نفسها تقول ',
      afterVersion: '. ويسبق ',
      afterRelease:
        ' نموذج الكائنات الذي أضافته المراجعات اللاحقة، فهو أبسط DXF كامل، ولا يستخدم ' +
        'هذا الرسم شيئا ينقصه.',
    },
    body:
      'يأتي على نحوين. المبنى كله في ملف واحد، بأبعاده الثلاثة: مخطط الموقع عند منسوب ' +
      'الأرض، وكل دور مواقف عند أرضيته، وكل مسطح دور عند دوره، وكتلة المبنى بأوجهها، ' +
      'والمنحدر بالميل الذي هو عليه. وكل لوحة من مجموعة الرسومات في ملف مستقل، مسطحة ' +
      'وبالحجم الحقيقي، لتدرجها مرجعا في رسم من رسوماتك. ولا يأتي المقطع إلا لوحة؛ فلو ' +
      'رسم داخل النموذج لقام وسط المواقف. وتأتي اللوحات نفسها أيضا وثيقة واحدة للطباعة، ' +
      'بمقاس ',
    bodyAfterSize: '، لوحة في كل صفحة.',
    pdf:
      'ذلك المستند هو ملف PDF. وهو HTML معد للطباعة أصلا — مقاس الورق والهوامش ومواضع ' +
      'قطع الصفحات داخل الملف — والمتصفح هو الذي يحفظه. وكتابة ملف ثان على الخادم كانت ' +
      'سترتب التقرير نفسه بمحرك مختلف، وترتيبان لتقرير واحد يتباعدان كما يتباعد رسمان ' +
      'لمبنى واحد.',

    sheets: {
      region: 'لوحات مجموعة الرسومات',
      caption:
        'اللوحات التي تضمها مجموعة رسومات المثال المحسوب، وكل منها مكتوب أيضا في ملف ' +
        'DXF مستقل.',
      sheet: 'اللوحة',
      title: 'العنوان',
    },

    layersTitle: 'الطبقات',
    layersBefore: 'طبقة واحدة لكل عنصر في كل دور، اسمها على النمط ',
    layersAfter:
      '. وأول ما يفعله المراجع حين يتسلم الملف أن يطفئ أشياء — يطفئ المواقف ليفحص ' +
      'امتداد ممرات المناورة، ويطفئ المنحدر ليرى كلفته، ويطفئ كل الأدوار إلا واحدا ' +
      'ليقرأه وحده. ولو جمعت المواقف كلها في طبقة واحدة لاشتبكت تلك الحجج كلها في آن ' +
      'واحد.',

    layers: {
      region: 'طبقات ملف DXF للمبنى',
      caption:
        'كل طبقة يعلنها ملف DXF لمبنى المثال المحسوب، مجمعة بحسب الجزء الثاني من اسمها ' +
        '— الموقع، أو دور، أو منحدر، أو التعليقات التوضيحية — بترتيب الملف نفسه. ' +
        'والطبقة المعلمة تحمل شيئا افترضه المحرك.',
      part: 'الجزء',
      inFile: 'الطبقات في الملف',
      cellLabel: 'الطبقات',
      /* «مفترضا» — assumed. «افتراضيا» would be "default". */
      assumedNote: ' (تحمل شيئا مفترضا)',
    },

    marked: {
      before: 'الطبقة المعلمة',
      sample: 'هكذا',
      after:
        'تحمل شيئا افترضه المحرك. وفي الملف تحبر تلك العناصر بالبرتقالي الأقرب إلى ' +
        'كهرماني الشاشة بين ما يحويه فهرس ألوان DXF، على طبقة العنصر الذي هي منه — ' +
        'فيبقى الافتراض بعد التصدير لونا، ولا توجد طبقة منفصلة تطفأ لإخفائه.',
    },
    outline:
      'الأدوار المرسومة بخطها الخارجي وحده ارتفاع تسمح به القواعد وتتركه الإجابة دون ' +
      'استخدام: خط خارجي رمادي على طبقة مستقلة، بلا كتلة.',
  },

  model: {
    title: 'ملف النموذج',
    /* «glTF بصيغته الثنائية» for binary glTF: the format keeps its name and the
       adjective is Arabic. The version that follows is the file's own, `Verbatim`. */
    ledeBefore: 'يكتب glTF بصيغته الثنائية، بالإصدار ',
    ledeAfter: '، ولا يدرج أي امتداد يلزم قارئ الملفات بدعمه. وهذه الجملة هي الادعاء كله.',
    namesBefore: 'يسمي الملف',
    /* «النسخ المتكرر (instancing)» — glossed once, per §6 of the glossary: no
       settled Arabic exists, so the Arabic describes it and the English follows in
       brackets. */
    namesAfter:
      'امتدادا يستخدمه، ولا يسمي أي امتداد يشترطه، فالقارئ الذي لا يعرفه يستطيع أن يرسم ' +
      'المبنى مع ذلك. وتكتب السيارات شبكات مضلعات عادية للسبب نفسه: كان امتداد النسخ ' +
      'المتكرر (instancing) سيجعل الملف أصغر، وهو معلم بأنه مشترط، فالقارئ الذي لا ' +
      'يملكه يضطر إلى رفض الملف كله.',
    /* «جدول العنوان» is the drafting term for a title block. */
    unitsBefore:
      'ليس لملف النموذج جدول عنوان، فيحمل جدوله في البيانات الوصفية للمشهد: الوحدات (',
    unitsAfter: ')، والنقطة من القطعة التي تقاس منها إحداثياته، وقائمة ',
    notDrawn: 'ما لا يرسمه النموذج',
    notDrawnAfter: '، وهاتان الجملتان، حرفا بحرف:',
    server:
      'يكتبه الخادم، بعد البوابتين نفسهما اللتين يمر بهما كل ملف آخر. يحمل المتصفح ' +
      'النموذج نفسه وبوسعه أن يكتب البايتات نفسها، ولو كتب الملف لنفسه لما اجتاز ' +
      'البوابتين إلا لأنه قال ذلك.',
  },

  workbook: {
    title: 'المصنف',
    lede:
      'يكتب XLSX، للقارئ الذي ينقل الأرقام إلى دراسة جدوى تقديرية (pro forma). ويحمل ' +
      'كل صف قيمة صنف مصدر اشتقاقه واستشهاده أو أساسه، ويحتفظ الصف المفترض بتعبئة ' +
      'كهرمانية وحافة متقطعة.',
    region: 'أوراق المصنف',
    caption: 'أوراق المصنف بترتيبها، والجملة التي تضعها كل منها فوق جدولها.',
    sheet: 'الورقة',
    says: 'ما تقوله فوق الجدول',
    saysLabel: 'تقول',
    nothing: 'لا شيء. يبدأ الجدول من الصف الأول.',
  },

  json: {
    title: 'الدراسة بيانات، والتقرير',
    lede:
      'ملف JSON هو الدراسة كاملة، بما فيها شبكة مصدر الاشتقاق، فتستطيع أداة لاحقة أن ' +
      'تتتبع كل اشتقاق من جديد بدل أن تثق بالرقم الذي في آخره.',
    fields: 'حقوله في المستوى الأعلى، كما يحملها الملف:',
    validityBefore: 'في ملف JSON يكون الادعاء التنظيمي حقلا لا جملة: الحقل ',
    validityIs: ' قيمته ',
    detailBefore: '، ونص تفصيله «',
    detailAfter: '»',
    report:
      'والتقرير هو الدراسة نفسها وثيقة تقرأ وتطبع: بيان الادعاءات الخمسة، وسجل ' +
      'الافتراضات بكل أساس فيه، والقيود المؤجلة بأسمائها، وإصدارا المحرك ومجموعة ' +
      'القواعد مع بصمة محتوى مجموعة القواعد، واسم من وقع بوابة المراجعة، ورقم رخصته ' +
      'الذي لم يؤكده أحد، ووقت توقيعه.',
  },

  stamped: {
    title: 'ما يحمله كل ملف',
    ledeBefore:
      'كل منها يقول إن الصلاحية التنظيمية لم تخضع للتقييم، ونظر الفحص الذي كتب هذه ' +
      'الصفحة في كل منها: ',
    ledeMiddle: '. وهي في ملف JSON الحقل المذكور أعلاه؛ وفي البقية، الجملة ',
    ledeAfter: '.',
    /*
      The drawings' own words come first in Arabic and then in English, in brackets
      — §6 of the glossary: a reader holding the sheet needs to match the word on
      it, and the sheet says it in English. The English is the component's,
      `Verbatim`. «ولا تعممه» for "does not round it up": the page does not
      generalise what one file carries to every file.
    */
    restBefore:
      'أما الباقي فلا يرافق كل ملف، ولا تعممه هذه الصفحة. تحمل الرسومات وملف النموذج ' +
      'تلك الجملة وعبارة «ليس للتنفيذ» (',
    restAfter:
      ') — في جدول العنوان، أو في البيانات الوصفية للنموذج — ولا تحمل السجل ولا ' +
      'التوقيع. ويضيف المصنف سجل الافتراضات. ويحمل التقرير وملف JSON ذلك كله: بيان ' +
      'الادعاءات، والسجل، والقيود المؤجلة، والإصدارات، والتوقيع.',
    signature:
      'ويوصف التوقيع بما هو عليه: اسم، ووقت، ورقم الرخصة الذي كتبه الموقع — أو أنه لم ' +
      'يكتب رقما. والرخصة تسجل ولا يتحقق منها أحد إطلاقا.',
  },

  gates: {
    title: 'أي البوابات تقف أمام التصدير',
    lede:
      'توجد أربع بوابات. تقف اثنتان منها أمام التصدير؛ وتسمي الأخريان خطوتين أسبق، هما ' +
      'تحديد القواعد المنطبقة وحساب السعة التطويرية، وتقفان عندهما. وهذا ما أجاب به ' +
      'التصدير في المثال المحسوب، حين طلب قبل التوقيعين وبينهما وبعدهما:',
    region: 'ما أجاب به التصدير عند كل خطوة',
    caption:
      'طلب التصدير ثلاث مرات للدراسة نفسها، ومع كل طلب البوابات الموقعة حتى حينه ورمز ' +
      'الحالة الذي تلقاه.',
    signed: 'ما وقع حتى حينه',
    signedLabel: 'الموقع',
    answered: 'ما أجاب به التصدير',
    answeredLabel: 'الإجابة',
    nothing: 'لا شيء',
    file: ' — الملف',
    refused: ' — رفض، ولا يكتب شيء',
    lapsedBefore:
      'الإقرار يعطى على المحتوى الذي عرض عليه. فإن تغير ذلك المحتوى بعده، سقطت البوابة ' +
      'وأجاب التصدير بالرمز ',
    lapsedAfter:
      ' من جديد. ولا تعدل الدراسة المحفوظة إطلاقا: تعديل افتراض يحسب دراسة جديدة، ' +
      'وتبدأ الدراسة الجديدة ولم يوقع فيها شيء.',
    separationBefore:
      'لا تشترط بوابة المراجعة شخصا ثانيا. تسجل من وقع، ولا تقارنه بمنشئ الدراسة — ' +
      'فالفحص الذي وراء الجدول أعلاه وقع دراسته هو، وانفتح التصدير. والفصل بين المهام ' +
      'ضابط لا تملكه هذه البرمجية، وهو مذكور في صفحة ',
    /* The route's own label in `chrome.ar.ts`. */
    separationLink: 'ما يرفضه',
    separationAfter: '.',
  },

  files: {
    before: '«يكتب DXF ',
    after:
      '» و«يكتب glTF بصيغته الثنائية» حقيقتان عن ملف، ويمكن محاسبة هذه الصفحة عليهما. ' +
      'أما الجملة التي تسمي برنامجا يفتح الملف فادعاء عن أداة يصدرها طرف آخر، ولا يقدم ' +
      'هنا ادعاء من هذا النوع.',
  },

  notProved: {
    title: 'ما لم تثبته هذه الصفحة',
    first: 'أن أيا من هذه الملفات يجوز الاعتماد عليه. والجملة التي على كل منها تقول لماذا.',
    second:
      'ولا يعرض هنا ملف عينة، لأن الملف المنزل من صفحة عامة يتخطى البوابتين اللتين ' +
      'تصفهما هذه الصفحة. وللحصول على الملفات نفسها، افتح المثال المحسوب، وأقر بالاطلاع ' +
      'على سجله، ووقع بوابة المراجعة الخاصة به.',
    cta: 'افتح المثال المحسوب',
  },
};
