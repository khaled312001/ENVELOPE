/**
 * العربية — تتبّع حدود القطعة على صورة جوية حقيقية.
 *
 * Held to `PlotMapDictionary` by the type system. Every choice follows
 * `docs/05-design/arabic-glossary.md`; the comments here record only what would
 * otherwise read as a mistranslation.
 *
 * ---------------------------------------------------------------------------
 * «الحد» for a boundary, never «الضلع» — §5b. «الرأس» for a traced vertex, which
 * is the glossary's own word beside «نقطة مساحية»; the screen says «نقطة» in the
 * controls, because what the reader drops with a click is a point and only
 * becomes a vertex once the ring closes.
 *
 * «مطابق» DOES NOT APPEAR, in any form. §2 reserves it: it is the word for
 * *compliant*, and it may be written only in a negation. The obvious translation
 * of "scale and rotate the sheet to fit" reaches for «ليطابق» immediately, which
 * would put a compliance verb on a button that moves a picture. The button says
 * «ضبط مقياس المخطط ودورانه» instead — what it does, not what it achieves.
 *
 * «افتراضي» does not appear either, for the reason §2 gives: it means *default*,
 * which is the one thing this codebase refuses to have. An assumed placement is
 * «مفترض».
 *
 * THE TWO CREDIT LINES ARE NOT TRANSLATED. They name Esri, Maxar, Earthstar
 * Geographics, OpenStreetMap and the ODbL, and a translated credit credits a body
 * that did not issue the data — the same argument `Verbatim` makes for a basis
 * string. They are byte-identical to the English.
 *
 * NO DIGIT. Every figure is the component's own measurement and arrives as an
 * argument.
 */

import type { PlotMapDictionary } from './plotMap.en.js';

export const AR: PlotMapDictionary = {
  title: 'تتبّع الحدود على الصورة الجوية',
  authority:
    'المرجع هو مخطط أفكشن (Affection Plan). وهذه أداة تتبّع، ولا يوجد على هذه الخريطة حد رسمي لأي قطعة.',

  imagery: {
    label: 'الصورة الجوية',
    credit: 'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    roofNote:
      'ما تراه هو سطح مبنى وجدار ورصيف. والسطح يتجاوز حدود المبنى، والمبنى المرتفع يميل بعيدا عن الكاميرا، فالحافة التي تحت المؤشر ليست حد القطعة.',
  },

  osm: {
    label: 'طبقة OpenStreetMap',
    help: 'مسطحات المباني والشوارع كما رسمها المساهمون في OpenStreetMap. وليست مصدرا مساحيا رسميا ولا مسحا ميدانيا.',
    credit: 'Map data © OpenStreetMap contributors, ODbL',
    show: 'إظهار الطبقة',
    hide: 'إخفاء الطبقة',
  },

  how: {
    heading: 'كيف تتتبّع الحدود',
    click: 'انقر على ركن في الصورة لإسقاط نقطة.',
    drag: 'اسحب أي نقطة لتحريكها.',
    close: 'انقر على النقطة الأولى مرة أخرى، أو اضغط «إغلاق المضلع»، بعد إسقاط ثلاث نقاط.',
    keyboard: 'أو أدخل خط العرض وخط الطول في الأسفل واضغط «إضافة نقطة» — دون الحاجة إلى مؤشر.',
  },

  controls: {
    heading: 'التتبّع',
    closeRing: 'إغلاق المضلع',
    reopen: 'فتح المضلع',
    undo: 'التراجع عن آخر نقطة',
    clear: 'مسح كل النقاط',
    removePoint: (n: string): string => `حذف النقطة ${n}`,
    zoomIn: 'تكبير',
    zoomOut: 'تصغير',
    /* «عدد النقاط» rather than a numeral before a noun: an Arabic counted noun
       changes form between three and ten and above it, and the count here is the
       trace's. «عدد النقاط 4» is correct at every count. */
    counted: (n: string): string => `عدد النقاط المسقطة ${n}`,
    none: 'لم تسقط أي نقطة بعد.',
    closed: 'المضلع مغلق.',
    open: 'المضلع مفتوح — آخر نقطة لا تعود إلى الأولى.',
  },

  keyboard: {
    heading: 'إضافة نقطة بالإحداثيات',
    lat: 'خط العرض (° شمالا)',
    lng: 'خط الطول (° شرقا)',
    add: 'إضافة نقطة',
    help: 'درجات عشرية على مرجع WGS84 — وهي الصيغة التي يعطيها الهاتف أو المتصفح. ودبي عند نحو خمس وعشرين شمالا وخمس وخمسين شرقا.',
  },

  table: {
    heading: 'التتبّع بالأرقام',
    caption:
      'سطر لكل حد من حدود المضلع المتتبَّع: طوله، واتجاهه، والركن الذي يبدأ منه. وكل رقم مقيس من النقاط المسقطة على الصورة، وقابل للتعديل بمجرد وصوله إلى جدول الحدود.',
    boundary: 'الحد',
    length: 'الطول (م)',
    bearing: 'الاتجاه (°)',
    corner: 'يبدأ عند',
    remove: 'حذف',
    empty: 'يلزم إسقاط ثلاث نقاط قبل أن يوجد حد يقاس.',
    cornerAt: (lat: string, lng: string): string => `${lat}° شمالا، ${lng}° شرقا`,
  },

  area: {
    traced: 'مساحة المضلع المتتبَّع',
    stated: 'المساحة على مخطط أفكشن',
    difference: (percent: string): string => `الفارق ${percent}%`,
    tolerance: (tolerance: string): string =>
      `تتوقف الدراسة إذا اختلفت المساحة المحسوبة من الحدود عن المساحة المذكورة في المخطط بأكثر من ${tolerance}. والتتبّع اليدوي على صورة جوية كثيرا ما يتجاوز ذلك. اكتب أطوال المخطط نفسه فوق هذه الأرقام قبل أن تكمل.`,
    beyond: (tolerance: string): string =>
      `هذا التتبّع يبعد عن المساحة المذكورة بأكثر من ${tolerance}. وهو نقطة بداية، لا قطعة أرض.`,
    within: (tolerance: string): string =>
      `هذا التتبّع في حدود ${tolerance} من المساحة المذكورة. وهذا الاتفاق ليس قياسا للقطعة — إنما هو قياس للتتبّع.`,
  },

  handoff: {
    button: 'ملء جدول الحدود بهذه الأرقام',
    help: 'يصل كل حد طولا واتجاها لك أن تكتب فوقهما. لا شيء مقفل، ولا يرسل شيء من هذه الخريطة.',
    done: (n: string): string =>
      `كُتب في الجدول أدناه عدد من الحدود قدره ${n}. وكل واحد منها قابل للتعديل — راجع كلا منها على المخطط.`,
    blocked: 'أغلق المضلع أولا. التتبّع المفتوح ليس له حد أخير يقاس.',
    precision:
      'تكتب الأطوال والاتجاهات بدقة المليمتر لأن تلك هي الشبكة التي يحسب عليها المحرك. وليست هذه دعوى عن دقة التتبّع على الصورة.',
  },

  underlay: {
    heading: 'ضع مخطط أفكشن فوق الصورة الجوية',
    lede: 'التتبّع على سطح مبنى تخمين. أما التتبّع على المخطط نفسه، مضبوطا بمقاس مطبوع عليه، فيتبع المستند.',
    choose: 'اختر صورة المخطط',
    chooseHelp: 'صورة PNG أو JPEG لمخطط أفكشن. تبقى داخل هذا المتصفح ولا ترفع إلى أي خادم.',
    remove: 'إزالة صورة المخطط',
    opacity: 'درجة وضوح المخطط',
    opacityValue: (percent: string): string => `${percent}%`,

    uncalibrated: {
      title: 'هذا الوضع مفترض.',
      basis:
        'وضع المخطط في منتصف المعروض بحجم لم يحدده أي مقاس. فموضعه وحجمه واتجاهه اختارتها هذه الشاشة كلها ولم تخترها أنت.',
      sensitivity:
        'كل ما يتتبّع عليه يتحرك بحركته. عاير المخطط على مقاس مطبوع عليه قبل أن تتتبّع منه ركنا.',
    },

    calibrate: {
      heading: 'معايرة المخطط على مقاس مطبوع',
      lede: 'اختر معلمين على المخطط المسافة بينهما مطبوعة عليه — ركنين من أركان القطعة، أو طرفي خط أبعاد. ثم بيّن أين يقع المعلمان نفساهما على الصورة الجوية، واكتب المسافة المطبوعة.',
      step: (n: string, of: string): string => `الخطوة ${n} من ${of}`,
      pickSheetA: 'انقر على المعلم الأول في المخطط',
      pickGroundA: 'والآن انقر على المعلم نفسه في الصورة الجوية',
      pickSheetB: 'انقر على المعلم الثاني في المخطط',
      pickGroundB: 'والآن انقر على المعلم نفسه في الصورة الجوية',
      distance: 'المسافة بينهما كما يطبعها المخطط (م)',
      apply: 'ضبط مقياس المخطط ودورانه',
      restart: 'إعادة المعايرة من أولها',
      cancel: 'إلغاء',
      how: 'المسافة المطبوعة هي التي تحدد المقياس. ونقرتاك على الصورة الجوية هما اللتان تحددان الموضع والدوران. ولا يمد المخطط ولا يشوه شكله.',
      residual: (measuredM: string, statedM: string): string =>
        `حيث وضعت المعلمين على الصورة الجوية تبلغ المسافة بينهما ${measuredM} م. والمخطط يطبع ${statedM} م.`,
      residualGap: (percent: string): string =>
        `الفارق ${percent}%. وقد أخذ المقياس من رقم المخطط، فهذا الفارق بين الصورة والمستند — وليس خطأ في أي منهما.`,
      residualExact: 'نقرتاك والمسافة المطبوعة متفقتان.',
      done: 'معايَر على مقاس مطبوع.',
      refusals: {
        sameSheetPoint:
          'هذه نقطة واحدة على المخطط. ومعلمان في موضع واحد لا يعطيان مسافة يضبط عليها المقياس.',
        sameGroundPoint:
          'هذه نقطة واحدة على الصورة الجوية. ومعلمان في موضع واحد لا يعطيان اتجاها يدار إليه.',
        noDistance: 'اكتب المسافة التي يطبعها المخطط بين المعلمين. ولا قيمة مسبقة لها.',
        outsideZone:
          'إحدى هاتين النقطتين خارج الإسقاط الذي يحسب فيه هذا المحرك. انظر الجملة أسفل الخريطة.',
      },
    },
  },

  refusals: {
    outsideZone:
      'هذه النقطة خارج النطاق 40 شمالا من إسقاط UTM، وهو الإسقاط الذي يقيس فيه هذا المحرك. ويمتد النطاق من أربع وخمسين إلى ستين درجة شرقا — أي الإمارات كلها. ولم تضف النقطة.',
    notACoordinate: 'هذا ليس إحداثيا. يلزم خط عرض وخط طول بالدرجات العشرية.',
    noMap:
      'تعذر على هذا المتصفح فتح لوحة رسم للخريطة. وكل ما عدا ذلك في هذه اللوحة يعمل: أدخل كل ركن بخط عرض وخط طول، وتقاس الحدود بالطريقة نفسها.',
    offline:
      'لم تحمل بلاطات الصورة الجوية. والتتبّع والقياسات وجدول الحدود لا يعتمد شيء منها عليها.',
  },

  claim:
    'لا شيء على هذه الخريطة مسح مساحي، وتتبّع شكل ليس حكما عليه. والصلاحية التنظيمية لا تخضع للتقييم إطلاقا ولا يؤكدها هذا النظام.',
};
