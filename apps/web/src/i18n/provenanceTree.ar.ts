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
  close: 'أغلق الاشتقاق',
  loading: 'جارٍ تحميل الاشتقاق…',
  none: 'لم يُسجَّل اشتقاق لهذه القيمة.',
  footer:
    'كل قيمة في هذه التشغيلة تعود إلى قاعدة، أو افتراض، أو شخص. ولا شيء يعود إلى ' +
    '«قرّر النظام».',

  edges: {
    derivedFrom: 'يُحسَب على أنه',
    uses: 'باستخدام',
    citedIn: 'مُستشهَد به في',
    enteredBy: 'أدخله',
    justifiedBy: 'لأنّ',
    boundedBy: 'يحدّه',
    sourcedFrom: 'مصدره',
    sensitiveTo: 'حسّاس تجاه',
    supersededBy: 'حلّ محلّه',
  },

  collapse: (label: string): string => `اطوِ ${label}`,
  expand: (label: string): string => `وسِّع ${label}`,

  assumed: 'مُفترَض',
  binding: 'مُلزِم',
};
