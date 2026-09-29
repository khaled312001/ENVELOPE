/**
 * العربية — الخطوة 7، الفحوصات.
 *
 * Held to `ChecksDictionary`. This screen carries three refusals, and the Arabic
 * holds each of them in the words rather than trusting the layout to:
 *
 * 1. «لم يخضع للتقييم» for NOT ASSESSED, everywhere — the absence of an act. Never
 *    «غير صالح» and never «غير مطابق»: both are verdicts, and either would turn a
 *    refusal to assess into an adverse finding. It replaced «لم يُقيَّم», which §5
 *    retired: unvowelled that phrase reads as "he did not stay".
 * 2. «لا يؤكده النظام إطلاقا» for NEVER CLAIMED — present tense, because it is a
 *    permanent property of the product and not a fact about this run, and
 *    «إطلاقا» rather than «أبدا», which in some registers reads as "always".
 * 3. «مطابقة» appears once, negated: «وليس مطابقة إطلاقا». Agreement between the
 *    validator and the generator is self-consistency and nothing more.
 *
 * No «نحن»: "what we checked" becomes «ما جرى فحصه», which is also closer to what
 * happened — a module checked it, not a team.
 *
 * COUNTS TAKE A COLON. Arabic number-noun agreement changes with the figure, and
 * the figure is the run's; «اجتاز: 10» is right for every count.
 */

import type { ChecksDictionary } from './checks.en.js';

export const AR: ChecksDictionary = {
  claims: {
    selfConsistency: 'الاتساق الذاتي',
    ruleCoverage: 'تغطية القواعد',
    geometricValidity: 'الصلاحية الهندسية',
    professionalAgreement: 'التوافق مع الحكم المهني',
    regulatoryValidity: 'الصلاحية التنظيمية',
  },

  status: {
    SUPPORTED: 'مؤكد',
    MEASURED: 'مقيس',
    PARTIAL: 'جزئي',
    NOT_ASSESSED: 'لم يخضع للتقييم',
    NEVER_CLAIMED: 'لا يؤكده النظام إطلاقا',
  },

  title: 'ما جرى فحصه، وما لم يفحص',
  subtitle:
    'خمسة أسئلة مختلفة، لكل منها إجابته على حدة. وليست سؤالا واحدا، وواحد منها فقط ' +
    'يتعلق بالجهة التنظيمية.',
  independence: 'ما تعنيه الاستقلالية هنا وما لا تعنيه',

  footer: {
    runtime: 'زمن التشغيل ',
    within: (budget: string): string => ` ms — ضمن ميزانية ${budget}.`,
    over: (budget: string): string => ` ms — تجاوز ميزانية ${budget}.`,
    annex: ' · ملحق التعريفات ',
  },

  invariants: {
    title: 'فحوصات الحفظ الحسابي',
    subtitle:
      'حساب يجب أن ينغلق أيا كان ما تقوله القواعد. والإخفاق هنا يحجب الدراسة — ولا ' +
      'يكون تحذيرا إطلاقا.',
    passed: (count: string): string => `اجتاز: ${count}`,
    failed: (count: string): string => `أخفق: ${count}`,
    notAssessed: (count: string): string => `لم يخضع للتقييم: ${count}`,
    ran: (
      ran: string,
      total: string,
      dormant: string,
    ): { readonly before: string; readonly emphasis: string; readonly after: string } => ({
      before:
        `جرى من فحوصات الفهرس ${ran} من ${total} على هذا الناتج. ولم يجد ${dormant} منها ` +
        `ما يفحصه، وهي `,
      emphasis: 'لا تحتسب اجتيازات',
      after: '.',
    }),
    caption: 'نتائج فحوصات الحفظ، ومعها القيمة المرصودة والمتوقعة لكل منها',
    columns: {
      check: 'الفحص',
      statement: 'المنطوق',
      observed: 'المرصود',
      expected: 'المتوقع',
      tolerance: 'التفاوت المسموح',
    },
    hideDormant: 'إخفاء الفحوصات التي لم تجد ما تفحصه',
    showDormant: (count: string): string => `إظهار الفحوصات التي لم تجد ما تفحصه (${count})`,
    pass: 'اجتاز',
    fail: 'أخفق',
    notAssessedChip: 'لم يخضع للتقييم',
  },

  outcomes: {
    title: 'الإجابة، بعد إعادة فحصها أمام القواعد',
    subtitle:
      // «وليس مطابقة» stays on ONE source line: `arabic.test.ts` reads the raw
      // module text, so a string break between the negation and the word it negates
      // hides the negation from the check that the word is never predicated.
      'تفحصها وحدة لا ترى الوحدة التي أنتجتها. والاتفاق بينهما اتساق ذاتي — ' +
      'وليس مطابقة إطلاقا.',
    satisfiedCount: (count: string): string => `مستوفاة: ${count}`,
    violatedCount: (count: string): string => `مخالفة: ${count}`,
    notEvaluableCount: (count: string): string => `تعذر تقييمها: ${count}`,
    satisfied: 'مستوفى',
    violated: 'مخالف',
    notEvaluable: 'تعذر تقييمه',
    lifeSafety: 'سلامة الأرواح',
    deferredTitle: 'منطبقة، ولم تخضع للتقييم ',
    lifeSafetyCount: (count: string): string => `سلامة الأرواح: ${count}`,
    deferredNote:
      'معلنة في كل ناتج. وما لم يفحص يجب أن يكون ظاهرا لا غائبا — فالفحص المحذوف يقرأ ' +
      'فحصا ناجحا.',
    notAssessed: 'لم يخضع للتقييم',
  },
};
