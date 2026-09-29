/**
 * العربية — الكلمات حول رسم القطعة: الحالة الفارغة، وأسماء فئات الأضلاع، وسطر
 * المفتاح، والوصفان المنطوقان.
 *
 * Held to `PlotCanvasDictionary` by the type system. Every choice is argued in
 * `docs/05-design/arabic-glossary.md`; the comments here record only what would
 * otherwise read as a mistranslation.
 *
 * ---------------------------------------------------------------------------
 * «الضلع», not «الحافة». An edge of a plot is a side of a polygon, and «ضلع» is
 * the surveyor's word and the one the plot form uses for the same numbered edges.
 *
 * «أضلاعها» is counted with «عدد», not with a numeral before a noun: an Arabic
 * counted noun changes form between three and ten and above it, and the count
 * here is the plot's, not the sentence's. «عدد أضلاعها 4» is correct at every count.
 *
 * «مسطّح البناء» is FOOTPRINT, as in the glossary. The road hierarchy in the legend
 * row is the adjective alone, after «طريق» — «طريق (تجميعي)».
 *
 * The units are spoken in full («متر», «متر مربع») in the two `aria-label`s, since a
 * screen reader reads «م²» as letters; the legend row prints the figure's own unit.
 */

import type { PlotCanvasDictionary } from './plotCanvas.en.js';

export const AR: PlotCanvasDictionary = {
  empty: 'لا حدود للقطعة تُرسَم بعد.',

  classes: {
    ROAD: 'طريق',
    ADJACENT_PLOT: 'قطعة مجاورة',
    OPEN_SPACE: 'مساحة مفتوحة',
    OTHER: 'أخرى',
  },

  hierarchy: {
    ARTERIAL: 'شرياني',
    COLLECTOR: 'تجميعي',
    LOCAL: 'محلّي',
    ACCESS: 'وصول',
  },

  figure: {
    lead: (areaM2: string, edgeCount: number): string =>
      `قطعة أرض مساحتها ${areaM2} متر مربع، وعدد أضلاعها ${edgeCount}. `,
    edge: (n: number, label: string, lengthM: string): string =>
      `الضلع ${n}، ${label}، طوله ${lengthM} متر`,
    setback: (setbackM: string): string => `، والارتداد ${setbackM} متر`,
    edgeSeparator: '. ',
    footprint: (areaM2: string): string => `. مسطّح البناء المتاح ${areaM2} متر مربع.`,
    scale: (gridM: number): string =>
      ` مرسومة بمقياس رسم خطّي، والشمال الشبكي إلى الأعلى، وتباعد الشبكة ${gridM} متر.`,
  },

  hit: (n: number, label: string, lengthM: string): string =>
    `الضلع ${n}: ${label}، طوله ${lengthM} متر`,

  legend: {
    edge: 'الضلع ',
    separator: ' · ',
    setback: 'الارتداد ',
    unresolved: 'لم يُحسَم الارتداد بعد',
    bandNote:
      'الشريط الملاصق لكلّ حدّ يُرتّب ما يقوله مخطّط الأثر عن ذلك الحدّ: فكلّما ثقل الشريط ' +
      'علا تصنيف الطريق. وهو عُرف رسوميّ لا عرض مسار — إذ يذكر المخطّط تصنيفًا ولا يذكر ' +
      'عرضًا — ولا يُحسب منه شيء.',
  },
};
