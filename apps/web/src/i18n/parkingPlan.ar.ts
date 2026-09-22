/**
 * العربية — طابق المواقف ومدخل المركبات.
 *
 * Held to `ParkingPlanDictionary`. This is the screen the client is buying, so the
 * trade terms matter most here: «موقف / مواقف» for a bay, never «مكان وقوف»;
 * «ممرّ المناورة» for the drive aisle; «المنحدر» for the ramp; «مدخل المركبات» for
 * vehicular access; «الركن المشطوف» for the chamfer; «الواجهة» for a frontage.
 *
 * THE RAMP IS «لم تُقيَّم», NOT «غير مطابقة». Its gradient, transitions and headroom
 * are never reached; saying so is the absence of an act, and a verdict word would
 * turn it into a finding the engine never made.
 *
 * The access recommendation is «مُوصى به، لا مُقرَّر عنك» — advice, not an
 * instruction, which is the whole reason the panel shows the alternatives.
 */

import type { ParkingPlanDictionary } from './parkingPlan.en.js';

/** The road a frontage faces. A hierarchy the table does not know is shown as sent. */
const ROAD: Readonly<Record<string, string>> = {
  ARTERIAL: 'طريق شرياني',
  COLLECTOR: 'طريق تجميعي',
  LOCAL: 'طريق محلّي',
  ACCESS: 'طريق وصول',
};

export const AR: ParkingPlanDictionary = {
  none: 'لم يُوزَّع أي طابق لهذه التشغيلة.',

  packing: {
    exact: 'المصطبة مستطيلة، فوُزِّع الطابق على حدّها الخارجي نفسه — ولم يُتنازَل عن شيء لرسمه.',
    notRectangle: 'المصطبة ليست مستطيلة.',
    before: ' وُزِّع الطابق داخل أكبر مستطيل يقع فيها — ',
    percentOf: '% من مسطّح البناء',
    shownDashed: '، مرسومًا بخطّ متقطّع',
    after: '. عدد المواقف حدٌّ أدنى، لا حدٌّ أعلى.',
  },

  figures: {
    bays: 'المواقف الموزّعة',
    areaPerBay: 'المساحة المُحقَّقة لكل موقف',
    moduleDepth: 'عمق الوحدة النمطية',
    deductions: 'الأنوية والمعدّات ومنبسط المنحدر',
  },

  summary: (bays: string, width: string, depth: string, areaPerBay: string): string =>
    `المواقف الموزّعة: ${bays}، على طابق أبعاده ${width} × ${depth} متر، بمعدّل ${areaPerBay} ` +
    `متر مربع لكل موقف`,
  summaryAccess: (width: string, frontage: string): string =>
    `. مدخل مركبات بعرض ${width} m على الواجهة ${frontage}.`,
  summaryNoAccess: '. لا تتّسع أي واجهة في قطعة الأرض هذه لمدخل مركبات.',

  legend: {
    label: 'ما يُظهره الرسم',
    bay: 'موقف — ',
    times: ' × ',
    bayUnit: ' m، الجدول ',
    aisle: 'ممرّ المناورة — ',
    aisleUnit: ' m، ',
    twoWay: 'ثنائي الاتجاه',
    oneWay: 'أحادي الاتجاه',
    ramp: 'المنحدر — ',
    rampOnly: 'مساحة المسقط الأفقي فقط.',
    rampBefore: ' الميل والانتقالات وارتفاع الخلوص بموجب ',
    rampMid: ' ',
    rampNot: 'لم تُقيَّم',
    rampAfter: '.',
    access: 'مدخل المركبات — مُوصى به، لا مُقرَّر عنك',
  },

  access: {
    title: 'مدخل المركبات',
    subtitleBefore: 'المواضع الممكنة لممرّ المركبات، مرتّبةً. يقيس البند ',
    subtitleMid: ' خلوص التقاطع البالغ ',
    subtitleAfter:
      ' من الركن المشطوف لقطعة الأرض، ويُفضّل الواجهة المُطِلّة على الطريق الأدنى تصنيفًا.',
    frontage: 'الواجهة ',
    road: (hierarchy: string): string => ` — ${ROAD[hierarchy] ?? hierarchy}`,
    recommended: (width: string, offset: string): string =>
      `، بعرض ${width} m، ومركزه على بُعد ${offset} m على امتدادها.`,
    usable: (window: string): string =>
      `يبقى من تلك الواجهة ${window} m خاليةً من الركنين بعد اقتطاع خلوص التقاطع من كل طرف.`,
    noneTitle: 'لا تتّسع أي واجهة في قطعة الأرض هذه لمدخل مركبات.',
    noneBody: ' رُفض كل حدّ للسبب المذكور أدناه. هذه نتيجةٌ عن قطعة الأرض، لا إخفاقٌ للتشغيلة.',
    alternatives: 'البدائل',
    alternativeWindow: (window: string): string => `. نافذة خالية بطول ${window} m.`,
    refused: 'مرفوضة، ولماذا',
    notAssessed: 'لم يُقيَّم',
    showDerivation: 'اعرض كيف اشتُقّ هذا الموضع',
  },
};
