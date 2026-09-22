/**
 * العربية — نطاقات الطاقة الثلاثة، وأيّها يُلزِم.
 *
 * Held to `BandsDictionary`.
 *
 * «النطاق الحاكم» AND «القيد المُلزِم» ARE TWO IDEAS, and English keeps them apart:
 * the governing band is the band the answer comes from; the binding constraint is
 * the limit that produced it. Careless Arabic collapses both into «المحدِّد», and a
 * reader then cannot tell which of the two the panel is naming.
 *
 * The band letters stay Latin and stay in the component, as the report and every
 * export print them. Arabic has no case, so `bandName` is the name as written.
 */

import type { BandsDictionary } from './bands.en.js';

export const AR: BandsDictionary = {
  bands: {
    REGULATORY: {
      name: 'الطاقة التنظيمية',
      question: 'ما الذي يسمح به معامل البناء وسقوف المساحة؟',
    },
    GEOMETRIC: {
      name: 'الطاقة الهندسية',
      question: 'ما الذي يتّسع له الغلاف البنائي فعليًا؟',
    },
    PARKING: {
      name: 'طاقة المواقف',
      question: 'ما الذي يستطيع عرضُ المواقف القابل للتحقيق أن يدعمه؟',
    },
  },

  title: 'الطاقة التطويرية',
  /* «لا متوسّطها إطلاقًا» — "never an average" keeps its never. */
  subtitle:
    'ثلاثة حدود، يُحسَب كلٌّ منها على حدة. الطاقة الحاكمة هي أصغرها — لا أكبرها، ولا ' +
    'متوسّطها إطلاقًا.',

  governing: 'الطاقة الحاكمة',
  band: 'النطاق ',
  bandName: (name: string): string => name,

  binding: 'القيد المُلزِم',
  headroom: 'الهامش حتى الحدّ التالي',
  beforeBinds: (band: string): string => ` قبل أن تصبح ${band} هي المُلزِمة`,
  levels: 'الطوابق',
  lostToFloors: 'المفقود بحساب الطوابق كاملةً',

  assumed: 'مُفترَض',
  perturbedBefore: (perturbation: string): string =>
    `عند تغييره بمقدار ${perturbation}، تتحرّك الطاقة الحاكمة بين `,
  perturbedAnd: ' و',
  perturbedAfter: ' m².',

  binds: 'مُلزِم',

  realismLabel: 'خصم الواقعية الذي تحدّده أنت',
  realismNote:
    'لا يُقدِّر المحرّك ما يمكن تحقيقه «واقعيًا». فذلك يحتاج إلى بيانات عن معامل البناء ' +
    'المُحقَّق مقابل المسموح به وعن الكفاءة، ولا يحملها أي مصدر عام، والرقم المُختلَق من قاعدة ' +
    'تقديرية هو الرقم الوحيد الذي لا تستطيع التحقّق منه. إن أردت خصم هذه الأرقام، فأنت من ' +
    'يحدّد المعامل، ويُسجَّل باسمك.',
};
