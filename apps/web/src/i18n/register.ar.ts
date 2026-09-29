/**
 * العربية — سجل الافتراضات.
 *
 * Held to `RegisterDictionary`. The register is non-skippable and ranked by effect,
 * and the Arabic keeps both properties in the words: the acknowledgement is a
 * reading, «اطلعت على الافتراضات», not an agreement, and nothing here softens the
 * instruction to read before exporting.
 *
 * COUNTS TAKE A COLON, NOT A COUNTED NOUN. Arabic number-noun agreement changes
 * with the figure (three to ten, eleven to ninety-nine, a hundred), and the figure
 * is the engine's, not ours. «عدد القيم…: 8» is correct for every figure; «8 قيم»
 * would be correct for some and a grammatical error for the rest.
 *
 * «الأساس», not «السبب», for the column that carries each basis: a basis is the
 * ground a number stands on, and a reason would weaken it to a rationale.
 */

import type { RegisterDictionary } from './register.en.js';

const noRule = (count: string): string => `عدد القيم التي لم تحكمها قاعدة: ${count}. `;

export const AR: RegisterDictionary = {
  title: 'الافتراضات',

  none: 'كل قيمة في هذه الدراسة جاءت من قاعدة أو منك. ولم يفترض المحرك شيئا.',
  noRule: { one: noRule, other: noRule },
  topMoves: (percent: string): string => `القيمة في أعلى القائمة تحرك الإجابة بنسبة ${percent}%.`,

  caption:
    'الافتراضات التي قامت عليها هذه الدراسة، مرتبة بحسب مقدار ما يحرك كل منها السعة الحاكمة',
  columns: {
    assumption: 'الافتراض',
    value: 'القيمة',
    why: 'على أي أساس قام',
    effectAt: (perturbation: string): string => `الأثر عند ${perturbation}`,
  },

  acknowledged: ' اطلعت على هذه الافتراضات. ولا يزال لك أن تعدل أيا منها.',
  pending: ' اقرأها قبل التصدير. يحملها التقرير، ويحملها كل قرار يبنى عليه.',
  acknowledge: 'اطلعت على الافتراضات',

  showUse: 'اعرض أين يستعمل هذا الافتراض',
  editLabel: (label: string, current: string): string => `تعديل ${label}، وقيمته الحالية ${current}`,
  moves: (percent: string, perturbation: string): string =>
    `يحرك السعة الحاكمة بنسبة ${percent} بالمئة عند تغييره بمقدار ${perturbation}`,
  notMeasuredTitle: 'تعذر تغيير هذا الافتراض وحده.',
  notMeasured: 'لم يخضع للقياس',
};
