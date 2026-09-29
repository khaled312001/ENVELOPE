/**
 * العربية — مجموعة الرسومات على الشاشة.
 *
 * Held to `DrawingSetDictionary`. «لوحة» for a drawing sheet, as an Arabic drawing
 * register numbers them; «شريط العنوان» for the title strip.
 *
 * The sheet itself is not translated and cannot be without becoming a second
 * drawing: the same display list is the A3 print and the DXF, and a reader who
 * holds the print must find the same number, title and notes on the screen. Those
 * render as the sheet states them, inside `Verbatim`; only the controls round the
 * sheet are Arabic.
 */

import type { DrawingSetDictionary } from './drawingSet.en.js';

export const AR: DrawingSetDictionary = {
  stored:
    'حسبت هذه الدراسة قبل أن تصنع الرسومات من نموذج المبنى، فلا شيء يرسم. أعد حساب ' +
    'الدراسة لترى لوحاتها.',
  none: 'لم يرسم المحرك أي لوحة لهذه الدراسة.',
  tabs: 'اللوحات في مجموعة الرسومات هذه',

  zoomGroup: (sheet: string): string => `التكبير، ${sheet}`,
  zoomOut: 'تصغير',
  zoomIn: 'تكبير',
  fitted: 'ملائمة للعرض',
  zoomed: (percent: string): string => `${percent}% من الملائمة`,
  fit: 'ملاءمة العرض',
  scroller: (number: string, title: string): string => `${number} ${title}، قابلة للتمرير`,
  drawing: (number: string, title: string, scale: string): string =>
    `${number} ${title}، مرسومة بمقياس ${scale}. والقيم التي تذكرها مدرجة أسفل الرسم.`,
  hint:
    'اختر موقفا، أو مسطح دور، أو خط ارتداد لترى مصدره. وكل ما يذكره شريط العنوان مدرج ' +
    'أيضا أدناه.',

  notes: 'ملاحظات على هذه اللوحة',
  factLabel: (label: string, value: string, description: string, action: string): string =>
    `${label}: ${value}. ${description} ${action}.`,
};
