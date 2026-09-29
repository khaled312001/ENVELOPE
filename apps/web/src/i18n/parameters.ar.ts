/**
 * العربية — الخطوة 2: تأكيد قطعة الأرض، ثم البوابة `G1`.
 *
 * Held to `ParametersDictionary` by the type system. Every choice is argued in
 * `docs/05-design/arabic-glossary.md`.
 *
 * "we do not assume it is yours" — said of the engine, «لا يفترض المحرك», never
 * «لا نفترض»: the product speaks of itself in the third person. And the mismatch
 * is stated as a fact about two numbers, not as a verdict on the reader: one of
 * them is wrong, and nothing here decides which.
 *
 * «الحدود», not «الأضلاع» — §5b, the word an affection plan prints.
 */

import type { ParametersDictionary } from './parameters.en.js';

export const AR: ParametersDictionary = {
  title: 'أكد قطعة الأرض',

  mismatch: {
    title: (tolerance: string): string => `تختلف المساحتان بأكثر من ${tolerance}.`,
    body: 'المساحة المحسوبة من أبعادك والمساحة المطبوعة على مخطط الأفكشن (Affection Plan) مختلفتان. إحداهما خطأ، ولا يفترض المحرك أنها التي أدخلتها أنت — راجع أيهما قبل المتابعة.',
  },

  fields: {
    plot: 'القطعة',
    landUse: 'استعمال الأرض',
    landUseValue: 'برج سكني',
    computedArea: 'المساحة المحسوبة',
    shape: 'الشكل',
    shapeScope: (phase: string): string =>
      ` — لا تتعامل المرحلة ${phase} إلا مع القطع القائمة الزوايا والمحدبة البسيطة`,
    roadFrontages: 'الواجهات على طرق',
  },

  /* The three shape classes `packages/core` defines. */
  shapes: {
    RECTILINEAR: 'قائمة الزوايا',
    SIMPLE_CONVEX: 'محدبة بسيطة',
    COMPLEX: 'معقدة',
  },

  gate: {
    confirmed: 'القطعة مؤكدة.',
    pending: 'لا تحسم القواعد قبل هذا التأكيد — فهي تبنى على تصنيف الحدود أعلاه.',
    confirm: 'هذه هي القطعة',
  },
};
