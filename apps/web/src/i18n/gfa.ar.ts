/**
 * The GFA statement, in Arabic. Held to `GfaDictionary`; see `gfa.en.ts`.
 *
 * Three notes on the terms, each from `docs/05-design/arabic-glossary.md`:
 *
 *   - **«مساحة القطعة», not «مساحة الأرض».** The glossary's own term, and the one
 *     `intake.ar.ts` and `landing.ar.ts` already use. This file was the only
 *     dictionary saying it the other way, which is how one product comes to use
 *     two words for the figure printed at the top of every affection plan.
 *   - **«الدور», never «طابق» and never «منسوب».** A منسوب is a datum elevation in
 *     metres, which this product also prints.
 *   - **No diacritics, anywhere.** Where a word would need them to be read, the
 *     word is changed instead — §5 of the glossary.
 *
 * The engine's own sentences are NOT here and are not translated: the
 * reconciliation notes, the NOT ASSESSED reasons and the cap notes come off the
 * run in English and are rendered through `EngineText`, which marks them
 * `lang="en"` so a screen reader changes voice for them. Translating an engine
 * string is a glossary defect (§7 item 3).
 */

import type { GfaDictionary } from './gfa.en.js';

export const AR: GfaDictionary = {
  title: 'حساب إجمالي المساحة الطابقية',
  subtitle:
    'ما يسمح به معامل البناء على هذه القطعة، وما يقترحه هذا المخطط، والأدوار التي يتكون منها. افتح أي رقم لترى طريقة حسابه.',
  caption: (cap: string): string => `${cap}، دورا دورا`,

  plotArea: 'مساحة القطعة',
  allowed: 'إجمالي المساحة الطابقية المسموح بها',
  allowedNote: 'معامل البناء × مساحة القطعة، قبل تطبيق سؤال المواقف.',
  proposed: 'إجمالي المساحة الطابقية المقترحة',
  remaining: 'المتبقي من المسموح به',

  caps: {
    RESIDENTIAL: 'المساحة الطابقية السكنية',
    COMMERCIAL: 'المساحة الطابقية التجارية',
  },
  capAllowed: 'المسموح به',
  capProposed: 'المقترح',
  capRemaining: 'المتبقي',

  column: {
    number: 'م',
    description: 'الوصف',
    perLevel: 'مساحة الدور',
    area: 'المساحة',
  },

  rows: {
    GROUND: 'الدور الأرضي',
    PODIUM: 'أدوار البوديوم',
    TYPICAL: 'الأدوار المتكررة',
    UNPLACED: 'أدوار محتسبة لم توضع تحت حد الارتفاع',
    PARKING: 'المواقف، محتسبة ضمن معامل البناء',
    COMMERCIAL: 'وحدة تجارية',
    ROOF: 'دور السطح',
  },
  times: (count: string): string => `× ${count}`,
  levelRange: (first: string, last: string): string => `من ${first} إلى ${last}`,
  total: 'الإجمالي',

  partFloor: {
    before: 'أدوار كاملة فقط. السعة الحاكمة ليست عددا صحيحا من الأدوار، فالمساحة ',
    after: ' فوق آخر دور كامل لا توضع ولا تحتسب هنا.',
  },

  notModelled: 'ما لا يمثله هذا الجدول',
};
