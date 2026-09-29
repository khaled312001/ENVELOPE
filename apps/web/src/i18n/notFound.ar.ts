/**
 * العربية — the 404.
 *
 * Held to `NotFoundDictionary` by the type system, so a missing key is a compile
 * error. Every term is checked against `docs/05-design/arabic-glossary.md`; the
 * comments here record only what would otherwise look like a mistranslation.
 *
 * The status code is not in here, and neither is any address, for the reasons
 * `notFound.en.ts` gives — both stay in the component, verbatim.
 */

import type { NotFoundDictionary } from './notFound.en.js';

export const AR: NotFoundDictionary = {
  hero: {
    title: 'الصفحة المطلوبة ليست هنا',
    /*
      «ولم يوضع شيء آخر مكانها», not «تمت إعادة توجيهك». The sentence states the
      absence of a substitution; a redirect notice would describe the very act the
      page refuses to have performed.
    */
    lede: 'لا توجد صفحة على هذا العنوان، ولم يوضع شيء آخر مكانها.',

    /*
      Renders immediately before the chip, as in English. The chip is an LTR run
      isolated by `.nf__path`, so the label reads right to left into it without the
      path's slashes migrating to the wrong end.
    */
    echoLabel: 'لا صفحة عند',

    note:
      'النظام الذي يقدم في صمت إجابة غير التي طلبت منه هو الخلل الذي يدور حوله هذا ' +
      'المنتج كله. لذلك يبقى في شريط العنوان ما طلبته، ولم توضع الصفحة الرئيسية مكانه، ' +
      'ويذكر الإخفاق صراحة.',

    specimen:
      'العنوان أعلاه معروض بوصفه عينة لا جملة: بخط ثابت العرض، على أرضية مستقلة، وكل ' +
      'حرف خارج مجموعة ضيقة يستبدل به نقطة، والعنوان الطويل يقتطع. وما يقوله العنوان هو ' +
      'ما كتب فيه أيا كان، وعرضه ليس إقرارا به.',
  },

  index: {
    title: 'كل صفحات هذا الموقع',
    lede:
      'هذه القائمة مولدة من سجل المسارات نفسه الذي تقرؤه القائمة العلوية والتذييل، فلا ' +
      'يمكن أن توجد صفحة وتغيب عنها، ولا أن يقود رابط هنا إلى صفحة ليست في هذا الإصدار.',
  },

  instead: {
    title: 'إلى أين تذهب بدلا منها',

    residue: {
      /*
        «يمكن أن», not «قد». The glossary bars a hedge from a refusal, and although
        this is a limit rather than a refusal, «قد» would read as uncertainty about
        whether the defect exists. It does exist; what varies is the deployment.
        «ترويسة الاستجابة» names the HTTP header specifically — «العنوان» would
        collide with the address the whole page is about.
      */
      headline: 'يمكن أن تكون ترويسة الاستجابة خاطئة والمحتوى صحيحا.',
      beforeStatus:
        ' فالاستضافة الثابتة المضبوطة على إحالة احتياطية واحدة تقدم هذا الهيكل لكل ' +
        'عنوان، وتجيب بالرمز ',
      afterStatus:
        '، فتصل صفحة تقول إن شيئا لم يستبدل، تحت ترويسة تقول إن صفحة وجدت. وتطلب هذه ' +
        'الصفحة من محركات البحث ألا تفهرس العنوان، وهذا هو النصف الذي يغلق من داخل ' +
        'الصفحة. أما رمز الحالة نفسه فمن إعدادات الإحالة في الاستضافة، وهو مسؤولية من ' +
        'ينشر هذا الإصدار.',
    },
  },
};
