/**
 * العربية — أدوات العرض ثلاثي الأبعاد وتلميحاته.
 *
 * Held to `ViewerDictionary`. The model is not translated and cannot be: it is the
 * engine's building, drawn by `@envelope/massing`. The words beside it are the
 * package's phrases, looked up by their exact English in `scene` below; the level
 * name, id and figure round each phrase stay as the model states them.
 *
 * Key names — Shift, Home, + and − — are the keys' own labels and stay as printed
 * on the keyboard in the reader's hand. "3D" is said in words, «ثلاثي الأبعاد»;
 * the button that selects it is «مجسم», which is how an Arabic drawing tool names
 * the view, and it needs no figure.
 */

import type { ViewerDictionary } from './viewer.en.js';

export const AR: ViewerDictionary = {
  label: (_view: string): string =>
    'المبنى في عرض ثلاثي الأبعاد. وكل دور فيه مدرج في الجدول أدناه.',
  roleDescription: (_view: string): string => 'عرض ثلاثي الأبعاد',

  turnOn: 'تشغيل الدوران والتكبير',
  reset: 'إعادة ضبط العرض',
  viewGroup: 'العرض',
  axon: (_view: string): string => 'مجسم',
  top: 'من الأعلى',
  show: 'اعرض',
  everyLevel: 'كل الأدوار',
  notPlaced: ' · مسموح به، ولم يوضع',
  spread: 'باعد بين الأدوار',
  envelope: 'اعرض ما تسمح به القواعد',
  cutAt: 'اقطع عند',
  noCut: 'بلا قطع',

  hint: {
    figureLive:
      'اسحب لتديره، ومرر أو اقرص بإصبعين للتكبير. وحين يكون التركيز عليه، تديره مفاتيح ' +
      'الأسهم ويعيده مفتاح Home إلى البداية.',
    figureStill: 'يبقى ساكنا حتى تشغله، فالتمرير فوقه يحرك الصفحة.',
    full:
      'اسحب لتديره ومرر للتكبير — أو، حين يكون التركيز عليه، استخدم مفاتيح الأسهم (مع ' +
      'Shift للتحريك)، ومفتاحي + و− للتكبير والتصغير، ومفتاح Home للعودة إلى البداية.',
    select: ' اختر سيارة، أو مسطح دور، أو المنحدر، أو الغلاف البنائي لترى مصدرها.',
  },

  north: '↑ شمال الشبكة',
  failed: (_view: string): string =>
    'تعذر على هذا المتصفح بدء الرسم ثلاثي الأبعاد — WebGL معطل أو غير متاح. وكل دور ' +
    'مدرج في الجدول أدناه، وكل دور مواقف مرسوم في خطوة المواقف.',

  scene: {
    permittedNotPlaced: 'مسموح به، ولم يوضع',
    gradientNotAssessed: 'الميل لم يخضع للتقييم',
    heightCeiling: 'سقف الارتفاع',
    setback: 'ارتداد',
  },
};
