/**
 * The GFA statement, in Arabic. Held to `GfaDictionary`; see `gfa.en.ts`.
 */

import type { GfaDictionary } from './gfa.en.js';

export const AR: GfaDictionary = {
  title: 'حساب إجمالي المساحة الطابقية',
  subtitle:
    'جدول المساحات الذي تحمله لوحة التقديم: ما يسمح به معامل البناء على هذه الأرض، وما يقترحه هذا المخطط، والأدوار التي يتكون منها. كل مساحة هنا من المحرك — افتح أيا منها لترى كيف حسبت.',
  caption: 'إجمالي المساحة الطابقية المقترحة، دورا دورا',

  plotArea: 'مساحة الأرض',
  allowed: 'إجمالي المساحة الطابقية المسموح بها',
  allowedNote: 'معامل البناء × مساحة الأرض، قبل تطبيق سؤال المواقف.',
  proposed: 'إجمالي المساحة الطابقية المقترحة',

  column: {
    number: 'م',
    description: 'الوصف',
    perLevel: 'مساحة الدور',
    area: 'المساحة',
  },

  rows: {
    RESIDENTIAL: 'الأدوار السكنية',
    PARKING: 'المواقف، محتسبة ضمن معامل البناء',
  },
  times: (count: string): string => `× ${count}`,
  levelRange: (first: string, last: string): string => `من ${first} إلى ${last}`,
  total: 'الإجمالي',

  remaining: 'المتبقي من المسموح به',
  partFloor: {
    before: 'أدوار كاملة فقط. السعة الحاكمة ليست عددا صحيحا من الأدوار، فالمساحة ',
    after: ' فوق آخر دور كامل لا توضع ولا تحتسب هنا.',
  },
  noCommercial:
    'لا يوجد جدول تجاري: هذا المحرك لا يضع مساحة تجارية، وجدول من الأصفار سيعلن قرارا لم يتخذه أحد.',
};
