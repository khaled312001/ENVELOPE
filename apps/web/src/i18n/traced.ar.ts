/**
 * العربية — الكلمات التي يحملها كل رقم في المنتج.
 *
 * Held to `TracedDictionary`. Every figure on every screen goes through
 * `TracedValue`, so a word chosen badly here is chosen badly everywhere at once.
 *
 * «مُفترَض — لك أن تُعدِّله». The dash and the second clause are the point: an
 * assumption is an invitation to the reader, not a warning about the system. The
 * vowels stay on «مُفترَض» and «مُشتَقّ» because the unvowelled forms are ambiguous
 * and these two words are the product. «افتراضي» is never used: it means *default*,
 * the one thing this codebase forbids having.
 *
 * «أنت أدخلته» for USER_SET — second person, to the reader, as the English legend
 * is; not «مُدخَل من المستخدم», which is about a user rather than to one.
 *
 * The TOKEN (`ASSUMED`) is never in here. Where the product shows the machine value
 * it shows it as the engine emitted it.
 */

import type { TracedDictionary } from './traced.en.js';

const CLASS_LABEL: TracedDictionary['classLabel'] = {
  DERIVED: 'مُشتَقّ',
  ASSUMED: 'مُفترَض',
  USER_SET: 'أنت أدخلته',
  OBSERVED: 'مرصود',
  TRADEOFF: 'مفاضلة',
  VARIANCE: 'استثناء',
};

export const AR: TracedDictionary = {
  classDescription: {
    DERIVED: 'محسوب من قاعدة مُستشهَد بها. افتحه لترى البند.',
    ASSUMED: 'مُفترَض — لا تحكمه قاعدة. لك أن تُعدِّله.',
    USER_SET: 'أنت أدخلت هذه القيمة.',
    OBSERVED: 'مرصود عبر مشاريع مُعتمَدة مماثلة.',
    TRADEOFF: 'اختاره المُحسِّن من بين بدائل ممكنة.',
    VARIANCE: 'يحكمه استثناء موثَّق. افتحه لترى الدليل.',
  },

  classLabel: CLASS_LABEL,

  /* A token the table does not know is shown as the engine sent it, not guessed at. */
  classChip: (token: string): string => (CLASS_LABEL as Record<string, string>)[token] ?? token,

  editAction: 'عدِّل هذا الافتراض',
  inspectAction: 'اعرض من أين جاء هذا الرقم',

  ariaLabel: (parameterId: string, figure: string, description: string, action: string): string =>
    `${parameterId}: ${figure}. ${description} ${action}.`,
  title: (label: string, description: string): string => `${label} — ${description}`,
  enteredBy: (name: string): string => `أدخله ${name}`,
  srClass: (label: string): string => ` (${label})`,

  /* The absence of an act, never a verdict: not «غير صالح», not «غير مطابق». */
  notAssessed: 'لم يُقيَّم',

  legend: {
    label: 'كيف تُقرأ هذه الأرقام',
    derived: 'من قاعدة مُستشهَد بها',
    assumed: 'مُفترَض — لك أن تُعدِّله، وهو يُحرِّك الإجابة',
    you: 'أنت',
    userSet: 'أنت أدخلته',
    notAssessed: 'لم يُقيَّم',
    notChecked: 'منطبق، ولم يُفحَص',
  },
};
