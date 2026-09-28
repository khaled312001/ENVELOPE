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

  /*
    الشرح. كُتب لأن قارئًا عربيًّا للشاشة نفسها ردّ بجملة واحدة: «Assumptions مش فاهمها».

    و«الكهرماني ليس تحذيرًا» هي الجملة التي لا يجوز حذفها: نظام التصميم الإماراتي
    يجعل الأصفر لونَ التحذير، فالقارئ المدرَّب على البوّابات الحكومية يصل وهو يعرف
    سلفًا أن هذا اللون يعني «هناك خطأ». وهو هنا يعني «هذه القيمة تستند إلى اجتهاد
    المحرّك لا إلى وثيقة» — دعوى أخرى، ولم يعد للصفحة أن تتركها للعُرف.

    «افتراض» لا «تقدير»: التقدير يوحي بقياس تقريبي، والافتراض قرارٌ مسجَّل بأساسه.
  */
  explainer: {
    what: 'الافتراض قيمةٌ لم تنصّ عليها وثيقة ولم تُوفِّرها قاعدة. اختارها المحرّك لتكتمل التشغيلة، وكتب على أيّ أساس اختارها، ووسمها.',
    amber: 'اللون الكهرماني يعني: مفترَض. وهو ليس تحذيرًا ولم يقع خطأ — بل هو المحرّك يسمّي القيم التي تستند إلى اجتهاده لا إلى وثيقة.',
    act: 'غيِّر أيًّا منها تتحرّك الإجابة. لا شيء هنا مخفيّ؛ ولهذا وُضِع اللون.',
    whySummary: 'لماذا يفترض المحرّك شيئًا أصلًا',
    why: 'القيمة التي لا تحكمها قاعدة أمامها ثلاثة مصائر: أن تُوقِف التشغيلة، أو أن يُختار لها رقم في صمت، أو أن يُختار لها رقم ويُعلَن. والإيقاف هو الصواب حين تكون القيمة الغائبة حدًّا يجب أن تنصّ عليه القطعة نفسها — فالمخطّط الذي لا يذكر معامل البناء لا يُمنَح واحدًا، وتتوقّف التشغيلة بدل أن تستعير الرقم من قطعة مجاورة. وفيما عدا ذلك، الاختيار الصامت هو العطب الذي وُجِد هذا المنتج ليمنعه، لأنه يُخرِج إجابةً معقولةً لا يستطيع أحد تدقيقها. فيختار المحرّك، ويسجّل الأساس، ويقيس كم تتحرّك الإجابة لو كان اختياره خاطئًا، ويضع ذلك في هذه القائمة قبل أن يُصدَّر أيّ شيء.',
  },

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
