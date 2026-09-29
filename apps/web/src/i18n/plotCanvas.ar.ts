/**
 * العربية — الكلمات حول رسم القطعة: الحالة الفارغة، وأسماء تصنيفات الحدود، وسطر
 * المفتاح، والوصفان المنطوقان.
 *
 * Held to `PlotCanvasDictionary` by the type system. Every choice is argued in
 * `docs/05-design/arabic-glossary.md`; the comments here record only what would
 * otherwise read as a mistranslation.
 *
 * ---------------------------------------------------------------------------
 * «الحد», not «الضلع» and not «الحافة» — §5b. «ضلع» is a side of a polygon; an
 * affection plan prints «الحدود», and the plot form now numbers them by that word.
 *
 * «حدودها» is counted with «عدد», not with a numeral before a noun: an Arabic
 * counted noun changes form between three and ten and above it, and the count here
 * is the plot's, not the sentence's. «عدد حدودها 4» is correct at every count.
 *
 * «مسطح البناء» is FOOTPRINT, as in the glossary. The road hierarchy in the legend
 * row is the adjective alone, after «طريق» — «طريق (تجميعي)».
 *
 * The units are spoken in full («متر», «متر مربع») in the two `aria-label`s, since
 * a screen reader reads «م²» as letters; the legend row prints the figure's own
 * unit.
 */

import type { PlotCanvasDictionary } from './plotCanvas.en.js';

export const AR: PlotCanvasDictionary = {
  empty: 'لا حدود للقطعة ترسم بعد.',

  classes: {
    ROAD: 'طريق',
    ADJACENT_PLOT: 'قطعة مجاورة',
    OPEN_SPACE: 'مساحة مفتوحة',
    OTHER: 'أخرى',
  },

  hierarchy: {
    ARTERIAL: 'شرياني',
    COLLECTOR: 'تجميعي',
    LOCAL: 'محلي',
    ACCESS: 'خدمة',
  },

  figure: {
    lead: (areaM2: string, edgeCount: number): string =>
      `قطعة أرض مساحتها ${areaM2} متر مربع، وعدد حدودها ${edgeCount}. `,
    edge: (n: number, label: string, lengthM: string): string =>
      `الحد ${n}، ${label}، طوله ${lengthM} متر`,
    setback: (setbackM: string): string => `، والارتداد ${setbackM} متر`,
    curve: (radiusM: string, arcLengthM: string): string =>
      `، ينحني بنصف قطر ${radiusM} متر، وطوله على امتداد القوس ${arcLengthM} متر`,
    edgeSeparator: '. ',
    footprint: (areaM2: string): string => `. مسطح البناء المتاح ${areaM2} متر مربع.`,
    scale: (gridM: number): string =>
      ` مرسومة بمقياس رسم خطي، والشمال الشبكي إلى الأعلى، وتباعد الشبكة ${gridM} متر.`,
  },

  hit: (n: number, label: string, lengthM: string): string =>
    `الحد ${n}: ${label}، طوله ${lengthM} متر`,

  legend: {
    edge: 'الحد ',
    separator: ' · ',
    setback: 'الارتداد ',
    unresolved: 'الارتداد لم يحسم بعد',
    curve: (radiusM: string, arcLengthM: string): string =>
      `نق ${radiusM} م · ${arcLengthM} م على القوس`,
    bandNote:
      'الشريط الملاصق لكل حد يرتب ما يقوله المخطط عن ذلك الحد: فكلما ثقل الشريط علا ' +
      'تصنيف الطريق. وهو عرف في الرسم لا عرض مسار — إذ يذكر المخطط تصنيفا ولا يذكر ' +
      'عرضا — ولا يحسب منه شيء.',
  },
};
