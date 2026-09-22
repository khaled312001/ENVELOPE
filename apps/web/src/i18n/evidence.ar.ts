/**
 * العربية — الخطوة 8، الأدلّة.
 *
 * Held to `EvidenceDictionary`. The trade terms, not the dictionary ones: «ارتداد»
 * for setback (never «تراجع»), «مسطّح البناء» for footprint, «المصطبة» and «البرج»,
 * «موقف / مواقف» for bays. A consultant who meets the dictionary word instead of the
 * trade one concludes that the product does not know the field.
 *
 * The band letters stay Latin, as the report and every export print them.
 */

import type { EvidenceDictionary } from './evidence.en.js';

/** What an edge faces, in the accusative its verb takes. An unknown token is shown as sent. */
const FACES: Readonly<Record<string, string>> = {
  ROAD: 'طريقًا',
  ADJACENT_PLOT: 'قطعةً مجاورة',
  OPEN_SPACE: 'فضاءً مفتوحًا',
  OTHER: 'حدًّا آخر',
};

export const AR: EvidenceDictionary = {
  plot: {
    title: 'قطعة الأرض، وما اقتطعته القواعد منها',
    subtitle: 'الشريط المُهشَّر هو الارتداد. اختر ضلعًا لترى القاعدة التي حدّدته.',
  },

  numbers: {
    title: 'كل رقم في هذه التشغيلة',
    subtitle: 'كلٌّ منها يفتح اشتقاقه. ولا يعود أيٌّ منها إلى «قرّر النظام».',
  },

  groups: {
    envelope: 'الغلاف البنائي',
    parking: 'المواقف',
    capacity: 'الطاقة التطويرية',
  },

  rows: {
    setbackFootprint: 'مسطّح البناء الذي تسمح به الارتدادات',
    coverageCap: 'سقف نسبة التغطية',
    podiumFootprint: 'مسطّح المصطبة',
    towerPlate: 'لوح البرج',
    heightCeiling: 'سقف الارتفاع',
    floorToFloor: 'الارتفاع من طابق إلى طابق',
    levelsByHeight: 'عدد الطوابق وفق الارتفاع',
    residentBays: 'مواقف السكّان',
    visitorBays: 'مواقف الزوّار',
    totalBays: 'إجمالي المواقف',
    areaPerBay: 'المساحة لكل موقف',
    areaRequired: 'المساحة المطلوبة',
    unitsParkingCarries: 'الوحدات التي تستوعبها المواقف',
    bandA: 'النطاق A — تنظيمي',
    bandB: 'النطاق B — هندسي',
    bandC: 'النطاق C — المواقف',
    governing: 'الحاكم',
    levels: 'الطوابق',
    realismDiscount: 'خصم الواقعية',
  },

  edge: {
    edge: 'الضلع ',
    faces: (classification: string): string => ` يواجه ${FACES[classification] ?? classification}. `,
    setbackBefore: 'الارتداد ',
    setbackMid: ' مصدره ',
    setbackAfter: '. ',
    showDerivation: 'اعرض الاشتقاق',
    noSetback: 'لم يُحسَم ارتداد لهذا الضلع.',
  },
};
