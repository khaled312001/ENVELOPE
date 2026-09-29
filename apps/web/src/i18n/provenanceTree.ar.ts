/**
 * العربية — شجرة الاشتقاق.
 *
 * Held to `ProvenanceTreeDictionary`. Only the relations between nodes are Arabic;
 * every node is the engine's record and is rendered as it was written, inside
 * `Verbatim`. «الاشتقاق» for derivation and «مصدر الاشتقاق» for provenance, as the
 * glossary sets them.
 *
 * «يعود إلى» for "resolves to": the footer's claim is that every value traces back
 * to a rule, an assumption or a person, and the verb has to carry the tracing.
 */

import type { ProvenanceTreeDictionary } from './provenanceTree.en.js';

export const AR: ProvenanceTreeDictionary = {
  title: 'من أين جاء هذا الرقم',
  close: 'إغلاق الاشتقاق',
  loading: 'جاري تحميل الاشتقاق…',
  none: 'لا اشتقاق مسجلا لهذه القيمة.',
  footer:
    'كل قيمة في هذه الدراسة تعود إلى قاعدة، أو افتراض، أو شخص. ولا شيء يعود إلى ' +
    '«قرر النظام».',

  edges: {
    derivedFrom: 'يحسب على أنه',
    uses: 'باستخدام',
    citedIn: 'مستشهد به في',
    enteredBy: 'أدخله',
    justifiedBy: 'لأن',
    boundedBy: 'يحده',
    sourcedFrom: 'مصدره',
    sensitiveTo: 'يتأثر بـ',
    supersededBy: 'حل محله',
  },

  /* Masdar on both, so neither reads as a past-tense verb without its marks. */
  collapse: (label: string): string => `طي ${label}`,
  expand: (label: string): string => `فتح ${label}`,

  assumed: 'مفترض',
  binding: 'ملزم',
};
