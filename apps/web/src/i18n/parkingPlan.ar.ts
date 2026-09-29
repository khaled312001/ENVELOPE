/**
 * العربية — دور المواقف ومدخل المركبات.
 *
 * Held to `ParkingPlanDictionary`. This is the screen the client is buying, so the
 * trade terms matter most here: «موقف / مواقف» for a bay, never «مكان وقوف»;
 * «ممر المناورة» for the drive aisle; «المنحدر (الرامب)» on first use for the
 * ramp; «مدخل المركبات» for vehicular access; «الركن المشطوف» for the chamfer;
 * «الواجهة» for a frontage.
 *
 * THE RAMP IS «لم يخضع للتقييم», NOT «غير مطابق». Its gradient, transitions and
 * headroom are never reached; saying so is the absence of an act, and a verdict
 * word would turn it into a finding the engine never made.
 *
 * The access recommendation is «توصية، لا قرارا نيابة عنك» — advice, not an
 * instruction, which is the whole reason the panel shows the alternatives.
 */

import type { ParkingPlanDictionary } from './parkingPlan.en.js';

/** The road a frontage faces. A hierarchy the table does not know is shown as sent. */
const ROAD: Readonly<Record<string, string>> = {
  ARTERIAL: 'طريق شرياني',
  COLLECTOR: 'طريق تجميعي',
  LOCAL: 'طريق محلي',
  ACCESS: 'طريق خدمة',
};

export const AR: ParkingPlanDictionary = {
  none: 'لا دور مواقف موزعا لهذه الدراسة.',

  packing: {
    exact:
      'البوديوم مستطيل، فوزع الدور على حده الخارجي نفسه — ولم يضح بشيء من أجل الرسم.',
    notRectangle: 'البوديوم ليس مستطيلا.',
    before: ' وزع الدور داخل أكبر مستطيل يقع فيه — ',
    percentOf: '% من مسطح البناء',
    shownDashed: '، مرسوما بخط متقطع',
    after: '. وعدد المواقف حد أدنى، لا حد أعلى.',
  },

  figures: {
    bays: 'المواقف الموزعة',
    areaPerBay: 'المساحة المتحققة لكل موقف',
    moduleDepth: 'عمق الوحدة النمطية',
    deductions: 'النوى وغرف المعدات وبسطة المنحدر',
  },

  summary: (bays: string, width: string, depth: string, areaPerBay: string): string =>
    `المواقف الموزعة: ${bays}، على دور أبعاده ${width} × ${depth} متر، بمعدل ${areaPerBay} ` +
    `متر مربع لكل موقف`,
  summaryAccess: (width: string, frontage: string): string =>
    `. مدخل مركبات بعرض ${width} m على الواجهة ${frontage}.`,
  summaryNoAccess: '. لا تتسع أي واجهة في قطعة الأرض هذه لمدخل مركبات.',

  legend: {
    label: 'ما يظهره الرسم',
    bay: 'موقف — ',
    times: ' × ',
    bayUnit: ' m، الجدول ',
    aisle: 'ممر المناورة — ',
    aisleUnit: ' m، ',
    twoWay: 'ثنائي الاتجاه',
    oneWay: 'أحادي الاتجاه',
    ramp: 'المنحدر (الرامب) — ',
    rampOnly: 'مساحة المسقط الأفقي فقط.',
    rampBefore: ' والميل والانتقالات وارتفاع الخلوص بموجب ',
    rampMid: ' ',
    rampNot: 'لم تخضع للتقييم',
    rampAfter: '.',
    access: 'مدخل المركبات — توصية، لا قرارا نيابة عنك',
  },

  access: {
    title: 'مدخل المركبات',
    subtitleBefore: 'المواضع الممكنة لممر المركبات، مرتبة. يقيس البند ',
    subtitleMid: ' خلوص التقاطع البالغ ',
    subtitleAfter:
      ' من الركن المشطوف لقطعة الأرض، ويفضل الواجهة المطلة على الطريق الأدنى تصنيفا.',
    frontage: 'الواجهة ',
    road: (hierarchy: string): string => ` — ${ROAD[hierarchy] ?? hierarchy}`,
    recommended: (width: string, offset: string): string =>
      `، بعرض ${width} m، ومركزه على بعد ${offset} m على امتدادها.`,
    usable: (window: string): string =>
      `يبقى من تلك الواجهة ${window} m خالية من الركنين بعد اقتطاع خلوص التقاطع من كل طرف.`,
    noneTitle: 'لا تتسع أي واجهة في قطعة الأرض هذه لمدخل مركبات.',
    noneBody:
      ' رفض كل حد للسبب المذكور أدناه. وهذه نتيجة عن قطعة الأرض، لا إخفاق في الدراسة.',
    alternatives: 'البدائل',
    alternativeWindow: (window: string): string => `. نافذة خالية بطول ${window} m.`,
    refused: 'مرفوضة، ولماذا',
    notAssessed: 'لم يخضع للتقييم',
    showDerivation: 'اعرض كيف اشتق هذا الموضع',
  },
};
