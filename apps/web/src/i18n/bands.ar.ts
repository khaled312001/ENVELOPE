/**
 * العربية — نطاقات السعة الثلاثة، وأيها يلزم.
 *
 * Held to `BandsDictionary`.
 *
 * «النطاق الحاكم» AND «القيد الملزم» ARE TWO IDEAS, and English keeps them apart:
 * the governing band is the band the answer comes from; the binding constraint is
 * the limit that produced it. Careless Arabic collapses both into «المحدد», and a
 * reader then cannot tell which of the two the panel is naming.
 *
 * «السعة», not «الطاقة» — §5b. «الطاقة» is energy first, and «السعة التطويرية» is
 * the term that appears in a feasibility study.
 *
 * The band letters stay Latin and stay in the component, as the report and every
 * export print them. Arabic has no case, so `bandName` is the name as written.
 */

import type { BandsDictionary } from './bands.en.js';

export const AR: BandsDictionary = {
  bands: {
    REGULATORY: {
      name: 'السعة التنظيمية',
      question: 'ما الذي يسمح به معامل البناء وسقوف المساحة؟',
    },
    GEOMETRIC: {
      name: 'السعة الهندسية',
      question: 'ما الذي يتسع له الغلاف البنائي فعليا؟',
    },
    PARKING: {
      /* «سعة المواقف», never «عرض المواقف»: «عرض» is also width, and on a screen of
         setbacks and plot dimensions it reads first as a figure in metres. */
      name: 'سعة المواقف',
      question: 'ما الذي تستطيع المواقف القابلة للتنفيذ أن تخدمه؟',
    },
  },

  title: 'السعة التطويرية',
  /* «ولا متوسطها إطلاقا» — "never an average" keeps its never. */
  subtitle:
    'ثلاثة حدود، يحسب كل منها على حدة. والسعة الحاكمة هي أصغرها — لا أكبرها، ولا ' +
    'متوسطها إطلاقا.',

  governing: 'السعة الحاكمة',
  band: 'النطاق ',
  bandName: (name: string): string => name,

  binding: 'القيد الملزم',
  headroom: 'الهامش حتى الحد التالي',
  beforeBinds: (band: string): string => ` قبل أن تصير ${band} هي الملزمة`,
  levels: 'الأدوار',
  lostToFloors: 'المفقود بسبب تقريب الأدوار إلى عدد صحيح',
  saleableArea: 'المساحة القابلة للبيع',
  saleableShare: 'حصة القابل للبيع من إجمالي المساحة الطابقية',
  parkingInFarTreatment: 'المواقف في معامل البناء',

  assumed: 'مفترض',
  perturbedBefore: (perturbation: string): string =>
    `عند تغييره بمقدار ${perturbation}، تتحرك السعة الحاكمة بين `,
  perturbedAnd: ' و',
  perturbedAfter: ' m².',

  binds: 'ملزم',

  realismLabel: 'خصم الواقعية الذي تحدده أنت',
  realismNote:
    'لا يقدر المحرك ما يمكن تحقيقه «واقعيا». فذلك يحتاج إلى بيانات عن معامل البناء ' +
    'المنفذ مقابل المسموح به وعن الكفاءة، ولا يحملها أي مصدر عام، والرقم المصنوع من ' +
    'قاعدة تقديرية هو الرقم الوحيد الذي لا تستطيع مراجعته. فإن أردت خصم هذه الأرقام، ' +
    'فأنت من يحدد المعامل، ويسجل باسمك.',
};
