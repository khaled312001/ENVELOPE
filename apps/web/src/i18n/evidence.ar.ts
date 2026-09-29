/**
 * العربية — الخطوة 8، الأدلة.
 *
 * Held to `EvidenceDictionary`. The trade terms, not the dictionary ones: «ارتداد»
 * for setback (never «تراجع»), «مسطح البناء» for footprint, «البوديوم» and
 * «البرج», «موقف / مواقف» for bays, «الحد» for a plot boundary. A consultant who
 * meets the dictionary word instead of the trade one concludes that the product
 * does not know the field.
 *
 * The band letters stay Latin, as the report and every export print them.
 */

import type { EvidenceDictionary } from './evidence.en.js';

/** What an edge faces. An unknown token is shown as it was sent. */
const FACES: Readonly<Record<string, string>> = {
  ROAD: 'طريقا',
  ADJACENT_PLOT: 'قطعة مجاورة',
  OPEN_SPACE: 'فضاء مفتوحا',
  OTHER: 'حدا آخر',
};

export const AR: EvidenceDictionary = {
  plot: {
    title: 'قطعة الأرض، وما اقتطعته القواعد منها',
    subtitle: 'الشريط المهشر هو الارتداد. اختر حدا لترى القاعدة التي حددته.',
  },

  numbers: {
    title: 'كل رقم في هذه الدراسة',
    subtitle: 'كل منها يفتح اشتقاقه. ولا يعود أي منها إلى «قرر النظام».',
  },

  groups: {
    envelope: 'الغلاف البنائي',
    parking: 'المواقف',
    capacity: 'السعة التطويرية',
  },

  rows: {
    setbackFootprint: 'مسطح البناء الذي تسمح به الارتدادات',
    coverageCap: 'سقف نسبة التغطية',
    podiumFootprint: 'مسطح البوديوم',
    towerPlate: 'مسطح البرج',
    heightCeiling: 'سقف الارتفاع',
    floorToFloor: 'الارتفاع من دور إلى دور',
    levelsByHeight: 'عدد الأدوار وفق الارتفاع',
    residentBays: 'مواقف السكان',
    visitorBays: 'مواقف الزوار',
    totalBays: 'إجمالي المواقف',
    areaPerBay: 'المساحة لكل موقف',
    areaRequired: 'المساحة المطلوبة',
    unitsParkingCarries: 'الوحدات التي تستوعبها المواقف',
    bandA: 'النطاق A — تنظيمي',
    bandB: 'النطاق B — هندسي',
    bandC: 'النطاق C — المواقف',
    governing: 'الحاكم',
    levels: 'الأدوار',
    realismDiscount: 'خصم الواقعية',
  },

  edge: {
    edge: 'الحد ',
    faces: (classification: string): string => ` يواجه ${FACES[classification] ?? classification}. `,
    setbackBefore: 'الارتداد ',
    setbackMid: ' مصدره ',
    setbackAfter: '. ',
    showDerivation: 'اعرض الاشتقاق',
    noSetback: 'لا ارتداد محسوما لهذا الحد.',
  },
};
