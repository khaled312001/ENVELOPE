/**
 * العربية — سجلّ الافتراضات.
 *
 * Held to `RegisterDictionary`. The register is non-skippable and ranked by effect,
 * and the Arabic keeps both properties in the words: the acknowledgement is a
 * reading, «قرأتُ», not an agreement, and nothing here softens the instruction to
 * read before exporting.
 *
 * COUNTS TAKE A COLON, NOT A COUNTED NOUN. Arabic number–noun agreement changes with
 * the figure (three to ten, eleven to ninety-nine, a hundred), and the figure is the
 * engine's, not ours. «عدد القيم…: 8» is correct for every figure; «8 قيم» would be
 * correct for some and a grammatical error for the rest.
 *
 * «الأساس», not «السبب», for the column that carries each basis: a basis is the
 * ground a number stands on, and a reason would weaken it to a rationale.
 */

import type { RegisterDictionary } from './register.en.js';

const noRule = (count: string): string => `عدد القيم التي لم تحكمها قاعدة: ${count}. `;

export const AR: RegisterDictionary = {
  title: 'الافتراضات',

  none: 'كل قيمة في هذه التشغيلة جاءت من قاعدة أو منك. لم يُفترَض شيء.',
  noRule: { one: noRule, other: noRule },
  topMoves: (percent: string): string => `القيمة في أعلى القائمة تُحرِّك الإجابة بنسبة ${percent}%.`,

  caption: 'الافتراضات المتّخذة في هذه التشغيلة، مرتّبةً بحسب مقدار ما يُحرِّك كلٌّ منها الطاقة الحاكمة',
  columns: {
    assumption: 'الافتراض',
    value: 'القيمة',
    why: 'على أيّ أساس افتُرِض',
    effectAt: (perturbation: string): string => `الأثر عند ${perturbation}`,
  },

  acknowledged: ' أقررتَ بهذه الافتراضات. ولا يزال لك أن تُعدِّل أيًّا منها.',
  pending: ' اقرأها قبل التصدير. يحملها التقرير، ويحملها كل قرار يُتَّخذ بناءً عليه.',
  acknowledge: 'قرأتُ الافتراضات',

  showUse: 'اعرض أين يُستخدَم هذا الافتراض',
  editLabel: (label: string, current: string): string => `عدِّل ${label}، وقيمته الحالية ${current}`,
  moves: (percent: string, perturbation: string): string =>
    `يُحرِّك الطاقة الحاكمة بنسبة ${percent} بالمئة عند تغييره بمقدار ${perturbation}`,
  notMeasuredTitle: 'تعذّر تغيير هذا الافتراض على نحوٍ مستقلّ.',
  notMeasured: 'لم يُقَس',
};
