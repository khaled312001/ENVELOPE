/**
 * العربية — عمود المعاين بجانب الرسم.
 *
 * Held to `InspectorDictionary`. «مفترض» for ASSUMED, never «افتراضي», which is
 * "default" (arabic-glossary.md §2). «السعة الحاكمة» as on the capacity panel, so
 * the column and the step name the same figure the same way. «البوابة» for a gate,
 * as the antechamber and the export step already say it.
 */

import type { InspectorDictionary } from './inspector.en.js';

export const AR: InspectorDictionary = {
  label: 'هذه الدراسة',

  plot: {
    heading: 'قطعة الأرض',
    none: 'لا توجد قطعة بعد. أدخلها في خطوة القطعة.',
    number: 'رقم القطعة',
    area: 'المساحة المحسوبة',
    edges: 'أضلاع الحدود',
  },

  answer: {
    heading: 'النتيجة',
    none: 'لم يحسب شيء بعد. تظهر النتيجة هنا بعد تشغيل خطوة القواعد.',
    governing: 'السعة الحاكمة',
    levels: 'عدد الأدوار',
    assumptions: 'قيم مفترضة',
    assumptionsOpen: 'افتح سجل الافتراضات',
  },

  /* «يحكم» for governs, from «السعة الحاكمة» — never «يلزم», which is the binding
     constraint's verb (bands.ar.ts keeps the two ideas apart). */
  step: {
    capacity: {
      heading: 'النطاقات الثلاثة',
      governs: 'يحكم',
    },
    parking: {
      heading: 'المواقف',
      laidOut: 'المواقف في الدور الواحد',
      required: 'المواقف التي يحتاجها المبنى',
      lossesHeading: 'ما فقد في ذلك الدور، بحسب السبب',
      bays: ' موقف',
      none: 'لم يوزع دور في هذه الدراسة. خطوة المواقف تذكر السبب.',
    },
    checks: {
      heading: 'الفحوصات',
      invariants: 'فحوصات الحفظ الحسابي',
      outcomes: 'إعادة الفحص أمام القواعد',
    },
  },

  gates: {
    heading: 'البوابات',
    G1_PLOT_CONFIRMED: 'تأكيد القطعة',
    G2_RULES_ACKNOWLEDGED: 'الإقرار بالقواعد',
    G3_ASSUMPTIONS_ACKNOWLEDGED: 'قراءة الافتراضات',
    G4_REVIEWER_NAMED: 'توقيع التصدير',
    done: 'تم',
    open: 'لم يتم بعد',
  },
};
