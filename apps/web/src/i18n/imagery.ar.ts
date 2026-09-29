/**
 * What a screen reader says instead of each commissioned image, in Modern
 * Standard Arabic.
 *
 * Transcribed from `docs/06-plan/image-prompts.md` - see `imagery.en.ts` for why
 * the brief is where these are decided, and `imagery.test.ts` for the test that
 * holds both files to it. A change here is a change there, in the same sitting.
 *
 * `mark` is the one entry that is the same string in both languages, because it
 * is a name and not a sentence. The test that requires the two languages to
 * differ exempts it by name rather than by a rule about length, so the exemption
 * is a list somebody has to add to on purpose.
 */

import type { ImageName } from '../img.js';

export const AR: Readonly<Record<ImageName, string>> = {

  'og-cover': 'حدود قطعة أرض، وبداخلها الغلاف البنائي مزاحا إلى الداخل.',
  'mark': 'TOP.ai',
  'lp-capacities':
    'ثلاثة نطاقات بارتفاعات مختلفة؛ أقصرها مميز، وخط يمد ارتفاعه عبر الاثنين الآخرين.',
  'lp-parking': 'دور مواقف في المسقط: صفا مواقف على جانبي ممر، ومنحدر يعبره بزاوية ضحلة.',
  'lp-guarantees':
    'قيمة في أعلى مخطط، تتفرع نزولا عبر القيم المشتقة منها حتى يبلغ كل فرع مرجعه.',
  'lp-claims': 'خمس عبارات بالوزن نفسه؛ الأخيرة مشطوبة.',
  'lp-limits': 'منطقة ممتلئة داخل حد مفتوح من جهة؛ وراء الفتحة يخف المجال حتى ينتهي.',
  'lp-hero-backdrop': '',
  'step-0-sheet': 'صفحة تتفرع منها قيم إلى قائمة، واثنتان في القائمة بلا مصدر.',
  'step-1-plot': 'قطعة غير منتظمة من ثمانية حدود، أحدها منحن، وطريقان على جانبين وجار على ثالث.',
  'step-3-rules': 'نطاق مقيس مقسم إلى أجزاء، ونطاق ثان تحته منفصل وخارج القياس.',
  'step-4-assumptions':
    'قائمة قيم، اثنتان منها موسومتان بأنهما افتراض، باللون وبعلامة ثانية غير لونية.',
  'step-5-capacity': 'رصة مسطحات أدوار: قاعدة بالأسفل وبرج بالأعلى، ونواة تخترق الأدوار كلها.',
  'step-6-parking':
    'دور مواقف: صفوف مواقف، وممران يلتقيان على شكل T، ومنحدر يدخل من أحد الأطراف، وسيارات في أحد الصفوف.',
  'step-7-checks': 'ثمانية عشر فحصا؛ عشرة ممتلئة وثمانية منقطة وفارغة.',
  'step-8-evidence': 'فرع واحد من الاشتقاق، مفتوح حتى البند الذي يستند إليه.',
  'step-9-export': 'ستة ملفات تخرج من دراسة مكتملة.',
  'auth-panel': '',
  'empty-projects': 'ورقة رسم فارغة بخانة عنوان مسطرة بلا محتوى.',
  'empty-members': 'خانة توقيعات: سطر مستعمل وسطران في انتظار.',
  'empty-shared': 'ورقتان بينهما صلة لم تنشأ بعد.',
  'dashboard-backdrop': '',
  'state-not-here': 'شبكة صفحات، موضع واحد فيها فارغ.',
  'state-refused': 'خط معالجة توقف عند مرحلته الثالثة؛ المراحل بعده مرسومة ولم تبلغ.',
  'guide-cover': 'قطعة أرض وغلافها البنائي، ودور مواقف مرسوم تحتها.',
};
