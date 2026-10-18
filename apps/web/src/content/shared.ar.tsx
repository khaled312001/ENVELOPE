/**
 * THE SHARED PARAGRAPHS, IN ARABIC — one source for each, as in English.
 *
 * `shared.tsx` exists because duplicated prose diverges. Translating each page on its
 * own would have rebuilt that defect one language over: the five "does not" items on
 * `/` and `/refusals`, the file paragraph on `/refusals` and `/exports` and the
 * optimiser refusal on `/parking` and `/refusals` would each have been translated
 * twice, by two hands, and the Arabic site would say two things about one refusal.
 *
 * Each twin has the English constant's shape, so a page picks between the two with
 * `useDict(LIMITS, LIMITS_AR)` and cannot get a field wrong. The ids stay English:
 * they are anchors and test grips, not copy.
 *
 * Held to `docs/05-design/arabic-glossary.md`: فصحى, verbal sentences in the present
 * tense, no «قد» or «ربما» in a refusal, «لم تخضع للتقييم» for not assessed and never
 * a verdict, «مطابقة» only negated, and NO DIACRITICS — where a word needed a mark to
 * be read, the word was changed. `DISCLAIMER` is not here — the chrome's Arabic
 * dictionary carries it, and the colophon is its only mount point.
 * `DORMANT_IS_NOT_A_PASS` and `SEED_RULES_NOT_DEV_RULES` are not here either: their
 * Arabic is in `dashboard.ar.ts`, and `/method`, their other page, is not built.
 */

import type { ReactNode } from 'react';

import { Verbatim } from '../i18n/locale.js';

import type { Refusal } from './shared.js';

/** A shared paragraph with a heading, widened so the Arabic twin can satisfy it. */
export interface SharedParagraph {
  readonly heading: string;
  readonly body: ReactNode;
}

export const LIMITS_AR: readonly Refusal[] = [
  {
    id: 'draw',
    heading: 'لا يصمم مبنى.',
    body: (
      <>
        تضع المرحلة 0 ما تسمح به القواعد وترسمه: الغلاف البنائي، والمواقف دورا دورا
        بسيارة في كل موقف، والمبنى قائما بأبعاده الثلاثة. ولا تختار واجهة، ولا تضع
        نواة، ولا تخطط وحدة. لا شيء مما ترسمه تصميم.
      </>
    ),
  },
  {
    id: 'life-safety',
    heading: 'لا يفحص سلامة الأرواح.',
    body: (
      <>
        مسافات الانتقال ومسارات الإخلاء وأداء الواجهة في الحريق منطبقة، و
        <em>لم تخضع للتقييم</em>. وتدرج مؤجلة في كل ناتج بلا استثناء بدل أن تحذف، لأن
        الفحص الغائب يقرأ فحصا ناجحا.
      </>
    ),
  },
  {
    id: 'realistic',
    heading: 'لا يقول لك ما يمكن تحقيقه واقعيا.',
    body: (
      <>
        لا يوجد نطاق «واقعي»، والحقل غير موجود في مخطط البيانات أصلا. فذلك الرقم يحتاج
        إلى بيانات ما تحقق فعلا أمام ما سمحت به القواعد، ولا يحملها أي مصدر عام. وإن
        أردت أن تخصم من الأرقام فأنت تضع المعامل بنفسك، ويسجل باسمك.
      </>
    ),
  },
  {
    id: 'parking-in-far',
    heading: 'لا يحسم مسألة احتساب المواقف في معامل البناء.',
    body: (
      <>
        احتساب المواقف ضمن المساحة الطابقية أو استثناؤها يحرك الإجابة أكثر من أي إعلان
        منفرد آخر. ويرفض المحرك أن يحسب حتى يعلن شخص المعالجة أو يطلب رؤية الاثنتين،
        ويعيد رفضا لا تخمينا. لا قيمة افتراضية هنا، لأنها في هذا الموضع قرار صامت يتخذ
        نيابة عن مقدم الطلب — والفارق الذي كانت ستخفيه معروض، مقيسا، لهذه القطعة.
      </>
    ),
  },
  {
    id: 'professional',
    heading: 'لا يحل محل المهني.',
    body: (
      <>
        يحمل الناتج اسم المراجع ورقم الرخصة الذي كتبه إلى جانبه. يسجل النظام هذا
        الإقرار، ولا يستطيع التحقق من الرخصة لدى أي جهة، ولا يفحص أن من يوقع ليس هو من
        أنشأ الدراسة. الفصل بين المهام ضابط لا يملكه هذا البرنامج.
      </>
    ),
  },
];

export const IFC_GLTF_AR: SharedParagraph = {
  heading: 'الملف ليس تكاملا.',
  body: (
    <>
      تنتقل النواتج ملفات. لا رابط حي، ولا ذهاب وإياب، ولا اتصال بخادم نماذج، والتغيير
      الذي يجرى بعد الملف لا يعود إليه. ويكتب النموذج ثلاثي الأبعاد ملف glTF، وهو ملف
      كغيره. ولا ينتج هذا المحرك ملفات IFC — وإن رأيتها مدرجة لهذا المنتج فقد كانت
      نطاقا في وثيقة أقدم، ولا وجود لها في البرنامج.
    </>
  ),
};

export const OPTIMISER_REFUSAL_AR: SharedParagraph = {
  heading: 'لا يبحث عن الموضع الأمثل للمنحدر والنواة.',
  body: (
    <>
      المفاضلة بين بدائل ممكنة قيمة من صنف{' '}
      <Verbatim>
        <code className="ident">TRADEOFF</code>
      </Verbatim>
      ، ومجموعة أصناف المرحلة 0 لا تضم هذا الصنف — ومنشئ القيمة المتتبعة يرمي خطأ عند
      أي صنف خارجها. فليس هذا عملا مؤجلا خلف مفتاح، ولا إعدادا يشغله: إنه مرفوض
      بالبناء، والرفض هو التصميم.
    </>
  ),
};
