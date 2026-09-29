/**
 * العربية — لوحة الكتلة البنائية.
 *
 * Held to `MassingDictionary`. The 3D view is the most persuasive surface in the
 * product, which makes the words beside it the ones that most need to hold: the
 * banner that says the shape rests on an assumption says so in Arabic at the same
 * weight, and nothing here calls a placed building a designed one.
 *
 * «المصطبة» and «البرج» for podium and tower; «الكتلة البنائية» for massing;
 * «طابق» for a level and «منسوب الأرضية» for its floor level; «المنحدر» for the ramp.
 * A volume is named from the engine's id through the table below, which is a
 * hand-written label for a stable key, never a translation of an engine sentence;
 * an id the table does not know is shown as the engine labelled it.
 *
 * THE ASSUMED VOLUMES ARE LISTED AFTER A COLON. The English puts them in the
 * subject position — "podium and tower carry the amber" — and an Arabic verb in
 * front of them would have to agree with whichever volumes the run assumed. A colon
 * is correct for every set.
 */

import type { MassingDictionary } from './massing.en.js';

const VOLUME: Readonly<Record<string, string>> = {
  podium: 'المصطبة',
  tower: 'البرج',
};

const volume = (id: string, label: string): string => VOLUME[id] ?? label;

export const AR: MassingDictionary = {
  title: 'الكتلة البنائية',
  subtitle:
    'المبنى الذي وزّعه المحرّك، طابقًا طابقًا، داخل الغلاف البنائي الذي تسمح به القواعد. لا ' +
    'شيء هنا مُصمَّم: لا واجهات ولا وحدات، لأنّ المحرّك لا يحسب أيًّا منهما، والنواة مساحة لا ' +
    'نواة موزَّعة.',
  stored: (_view: string): string =>
    'حُسِبت هذه التشغيلة قبل أن يبني المحرّك نموذجًا للمبنى كاملًا، فلا عرض ثلاثي الأبعاد لها. ' +
    'احسب التشغيلة من جديد لترى طوابقها ومواقفها ومنحدرها قائمةً.',

  answer: {
    partial:
      'الطوابق المُصمَتة هي الإجابة. والخطوط الخارجية فوقها حيّزٌ تتركه القواعد غير مُستخدَم.',
    whole: 'كل طابق مرسوم هو طابقٌ تضعه الإجابة.',
    levelsPlaced: ' الطوابق التي تضعها هذه الإجابة: ',
  },

  heights: {
    title: 'يقوم هذا الشكل على افتراض، ويُرسَم على هذا النحو.',
    before:
      'الارتفاع الكلّي مُشتَقّ: سقف الارتفاع مقسومًا على الارتفاع من طابق إلى طابق، وكلاهما من ' +
      'قواعد مُستشهَد بها. أمّا ما ',
    not: 'ليس',
    mid:
      ' مُشتَقًّا فهو أين تنتهي المصطبة ويبدأ البرج — وهذا ما يذكره مخطّط الأفكشن ' +
      '(Affection Plan)، إذ يعني «',
    afterExample: '» طابقَين للمصطبة، ولم يُقدَّم لهذه التشغيلة مخطّطٌ كهذا. لذلك يُرسَم بالكهرماني: ',
    and: ' و',
    after:
      '؛ والتدرّج الذي تراه في الصورة بين المصطبة والبرج هو الجزء الذي لا ينبغي أن تثق به. ولا ' +
      'يُغيّر أيَّ رقم للطاقة في هذه التشغيلة.',
    volume,
  },

  placements: {
    title: 'موضع كل جزء هو ما وضعه المحرّك، لا ما تفرضه قاعدة.',
    body:
      'المساحات محسوبة؛ أمّا مواضعها على قطعة الأرض فليست كذلك، إذ لا تُثبّتها أي قاعدة. ' +
      'فوضعها المحرّك، وتُرسَم خطوطها الخارجية بالكهرماني لذلك:',
  },

  levels: {
    caption: (_view: string): string =>
      'كل طابق ومنحدر في العرض ثلاثي الأبعاد، مع منسوب أرضيته، والمواقف الموزّعة عليه، ومصدر ' +
      'حدّه الخارجي أو ميله',
    columns: {
      level: 'الطابق',
      floorLevel: 'منسوب الأرضية',
      bays: 'المواقف',
      source: 'الحدّ الخارجي أو الميل',
    },
    notPlaced: ' · مسموح به، ولم يوضع',
    notParking: 'لا شيء — ليس طابق مواقف',
    outlineOf: (levelId: string): string => `الحدّ الخارجي للطابق ${levelId}`,
    ramp: 'المنحدر ',
    rampDetail: (from: string, to: string): string => `· من ${from} إلى ${to}، الميل لم يُقيَّم`,
    everyParkingLevel: 'كل طوابق المواقف',
    heightCeiling: 'سقف الارتفاع',
    setbackLine: 'خطّ الارتداد',
    sourceLabel: (what: string, provenance: string): string => `${what}: ${provenance}. اعرض مصدره.`,
  },

  volumes: {
    caption: 'المصطبة والبرج، مع الارتفاع الذي بُني إليه كلٌّ منهما ومصدر ذلك الارتفاع',
    columns: {
      volume: 'الكتلة',
      levels: 'الطوابق',
      base: 'منسوب القاعدة',
      height: 'الارتفاع',
      what: 'ما هي',
    },
    name: volume,
    total: 'الإجمالي',
    totalNote:
      'الارتفاع المبني. سقف الارتفاع الذي اشتُقّ منه حدٌّ تخطيطي، لا حدٌّ إنشائي ولا حدٌّ للملاحة ' +
      'الجوية — ولم يُقيَّم أيٌّ منهما.',
  },

  core: {
    title: 'النواة',
    body:
      'تُرسَم النواة في كلّ طابق تمرّ به، ولا يُخصَم من أيّ رقم فوقها شيء من أجلها. فالنواة ' +
      'داخل إجمالي المساحة الطابقية وخارج المساحة القابلة للبيع، ومن ثمّ فإنّ رقم المساحة ' +
      'القابلة للبيع الذي أُعطي لهذه التشغيلة يحسبها أصلًا، وهي في طابق المواقف داخل ما ' +
      'تخصمه نسبة الاستعمال. وخصمها مرّة أخرى يُحمّلك ثمن الجدار مرّتين. أمّا ما يفعله ' +
      'المحرّك فهو المقارنة:',
    areaLabel: 'مساحة النواة',
    shareLabel: 'نسبتها من بلاطة البرج',
    shape:
      'وحدّها الخارجيّ هو بلاطة البرج مُصغَّرة إلى تلك المساحة. والمساحة وحدها كمّيّة ' +
      'محسوبة: فلا مصعد ولا سلّم ولا منوَر ولا جدار نواة موضوع.',
  },

  notModelled: 'ليس في هذا النموذج',
};
