/**
 * العربية — الخطوة 7، الفحوص.
 *
 * Held to `ChecksDictionary`. This screen carries three refusals, and the Arabic
 * holds each of them in the words rather than trusting the layout to:
 *
 * 1. «لم يُقيَّم» for NOT ASSESSED, everywhere — the absence of an act. Never
 *    «غير صالح» and never «غير مطابق»: both are verdicts, and either would turn a
 *    refusal to assess into an adverse finding.
 * 2. «لا يُدَّعى إطلاقًا» for NEVER CLAIMED — present tense, because it is a
 *    permanent property of the product and not a fact about this run, and
 *    «إطلاقًا» rather than «أبدًا», which in some registers reads as "always".
 * 3. «مطابقة» appears once, negated: «وليس مطابقةً إطلاقًا». Agreement between the
 *    validator and the generator is self-consistency and nothing more.
 *
 * No «نحن»: "what we checked" becomes the passive «ما فُحِص», which is also closer
 * to what happened — a module checked it, not a team.
 *
 * COUNTS TAKE A COLON. Arabic number–noun agreement changes with the figure, and the
 * figure is the run's; «اجتاز: 10» is right for every count.
 */

import type { ChecksDictionary } from './checks.en.js';

export const AR: ChecksDictionary = {
  claims: {
    selfConsistency: 'الاتّساق الذاتي',
    ruleCoverage: 'تغطية القواعد',
    geometricValidity: 'الصلاحية الهندسية',
    professionalAgreement: 'الاتّفاق مع الحكم المهني',
    regulatoryValidity: 'الصلاحية التنظيمية',
  },

  status: {
    SUPPORTED: 'مدعوم',
    MEASURED: 'مَقيس',
    PARTIAL: 'جزئي',
    NOT_ASSESSED: 'لم يُقيَّم',
    NEVER_CLAIMED: 'لا يُدَّعى إطلاقًا',
  },

  title: 'ما فُحِص، وما لم يُفحَص',
  subtitle:
    'خمسة أسئلة مختلفة، يُجاب عن كلٍّ منها على حدة. ليست سؤالًا واحدًا، وواحدٌ منها فقط ' +
    'يتعلّق بالجهة التنظيمية.',
  independence: 'ما تعنيه الاستقلالية هنا وما لا تعنيه',

  footer: {
    runtime: 'زمن التشغيل ',
    within: (budget: string): string => ` ms — ضمن ميزانية ${budget}.`,
    over: (budget: string): string => ` ms — تجاوز ميزانية ${budget}.`,
    annex: ' · ملحق التعريفات ',
  },

  invariants: {
    title: 'فحوص الحفظ الحسابي',
    subtitle:
      'حسابٌ يجب أن ينغلق أيًّا كان ما تقوله القواعد. الإخفاق هنا يحجب التشغيلة — ولا يكون ' +
      'تحذيرًا إطلاقًا.',
    passed: (count: string): string => `اجتاز: ${count}`,
    failed: (count: string): string => `أخفق: ${count}`,
    notAssessed: (count: string): string => `لم يُقيَّم: ${count}`,
    ran: (
      ran: string,
      total: string,
      dormant: string,
    ): { readonly before: string; readonly emphasis: string; readonly after: string } => ({
      before:
        `جرى من فحوص الفهرس ${ran} من ${total} على هذا المُخرَج. ولم يجد ${dormant} منها ` +
        `ما يفحصه، وهي `,
      emphasis: 'لا تُحتسب اجتيازات',
      after: '.',
    }),
    caption: 'نتائج ثوابت التحقُّق، مع القيمة المرصودة والمتوقَّعة لكلٍّ منها',
    columns: {
      check: 'الفحص',
      statement: 'المنطوق',
      observed: 'المرصود',
      expected: 'المتوقَّع',
      tolerance: 'التفاوت المسموح',
    },
    hideDormant: 'أخفِ الفحوص التي لم تجد ما تفحصه',
    showDormant: (count: string): string => `اعرض الفحوص التي لم تجد ما تفحصه (${count})`,
    pass: 'اجتاز',
    fail: 'أخفق',
    notAssessedChip: 'لم يُقيَّم',
  },

  outcomes: {
    title: 'الإجابة، يُعاد فحصها مقابل القواعد',
    subtitle:
      'تفحصها وحدةٌ لا ترى الوحدة التي أنتجتها. الاتّفاق اتّساقٌ ذاتيّ — وليس مطابقةً ' +
      'إطلاقًا.',
    satisfiedCount: (count: string): string => `مُستوفاة: ${count}`,
    violatedCount: (count: string): string => `مُخالَفة: ${count}`,
    notEvaluableCount: (count: string): string => `تعذّر تقييمها: ${count}`,
    satisfied: 'مُستوفى',
    violated: 'مُخالَف',
    notEvaluable: 'تعذّر تقييمه',
    lifeSafety: 'سلامة الأرواح',
    deferredTitle: 'منطبقة، ولم تُقيَّم ',
    lifeSafetyCount: (count: string): string => `سلامة الأرواح: ${count}`,
    deferredNote:
      'مُعلَنة في كل مُخرَج. ما لم يُفحَص يجب أن يكون ظاهرًا لا غائبًا — فالفحص المحذوف ' +
      'يُقرأ فحصًا ناجحًا.',
    notAssessed: 'لم يُقيَّم',
  },
};
