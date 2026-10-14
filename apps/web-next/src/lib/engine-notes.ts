import type { Locale } from './locale.js';

/*
  THE ENGINE'S PARKING SENTENCES, SHORT AND IN THE READER'S LANGUAGE.

  The glossary's first rule keeps the engine's own strings verbatim, and in the
  report, the drawings and the DXF they still are. On screen the owner asked on
  14 Oct 2026 for every section in the reader's language and shorter: an Arabic
  page that turns into a paragraph of English halfway down reads as unfinished.

  So each sentence the layout and the access recommendation write is recognised
  by its fixed wording, its figures are lifted from the engine's own text — never
  recomputed, never typed — and it is said again briefly. A sentence this file
  does not recognise returns null and the caller shows the engine's text as it
  stands: a new note from the engine arrives in English rather than not at all.
*/

type Said = Readonly<Record<Locale, string>>;
type Reader = (text: string) => Said | null;

const ROAD: Readonly<Record<string, Said>> = {
  ARTERIAL: { en: 'Arterial road', ar: 'طريق شرياني' },
  COLLECTOR: { en: 'Collector road', ar: 'طريق تجميعي' },
  LOCAL: { en: 'Local road', ar: 'طريق محلي' },
  ACCESS: { en: 'Access road', ar: 'طريق خدمة' },
};

const ORIENTATION: Readonly<Record<string, Said>> = {
  'modules along the width': { en: 'modules along the width', ar: 'وحدات بموازاة العرض' },
  'modules along the depth': { en: 'modules along the depth', ar: 'وحدات بموازاة العمق' },
  'bays to the walls, one ring aisle': { en: 'bays to the walls, one ring aisle', ar: 'مواقف على الجدران حول ممر دائري' },
};

function rampLabel(label: string): Said | null {
  const straight = /^Straight, one ([\d.]+) m two-way run$/.exec(label);
  if (straight) return { en: `straight, one ${straight[1]} m two-way run`, ar: `مستقيم، مسار واحد ثنائي الاتجاه بعرض ${straight[1]} م` };
  const split = /^Split, ([\d.]+) m in and ([\d.]+) m out side by side$/.exec(label);
  if (split) return { en: `split, ${split[1]} m in and ${split[2]} m out`, ar: `منقسم، ${split[1]} م للدخول و${split[2]} م للخروج` };
  return null;
}

const READERS: readonly Reader[] = [
  (t) => {
    if (!t.includes('Gradient, transitions and headroom under B.7.2.2')) return null;
    const size = /([\d.]+ × [\d.]+) m/.exec(t)?.[1];
    return size
      ? {
          en: `Ramp: only its plan area is reserved (${size} m). Gradient, transitions and headroom (B.7.2.2) are not assessed.`,
          ar: `المنحدر (الرامب): محجوزة مساحته في المسقط فقط (${size} م). الميل والانتقالات والارتفاع الحر (B.7.2.2) لم تخضع للتقييم.`,
        }
      : {
          en: 'Ramp: only its plan area is reserved. Gradient, transitions and headroom (B.7.2.2) are not assessed.',
          ar: 'المنحدر (الرامب): محجوزة مساحته في المسقط فقط. الميل والانتقالات والارتفاع الحر (B.7.2.2) لم تخضع للتقييم.',
        };
  },
  (t) => {
    const m = /^Bays stand against all four walls and one ([\d.]+) m ring aisle serves them: (\d+) to each long wall and (\d+) to each short one, less the (\d+) the way in/.exec(t);
    if (!m) return null;
    const [, w, long, short, taken] = m;
    const less = taken === '0' ? null : { en: ` The entrance and the core take ${taken}.`, ar: ` يأخذ المدخل والنواة ${taken} منها.` };
    const island = /The island the ring encloses is ([\d.]+ × [\d.]+) m/.exec(t)?.[1];
    return {
      en: `Bays line all four walls around one ${w} m ring aisle: ${long} per long wall, ${short} per short wall.${less?.en ?? ''}${island ? ` Island inside: ${island} m.` : ''}`,
      ar: `المواقف على الجدران الأربعة حول ممر مناورة دائري واحد بعرض ${w} م: ${long} لكل جدار طويل و${short} لكل جدار قصير.${less?.ar ?? ''}${island ? ` الجزيرة في الوسط ${island} م.` : ''}`,
    };
  },
  (t) => {
    const m = /^The ([\d,.]+) m² reserved for plant and circulation is larger than the ([\d,.]+) m² island/.exec(t);
    if (!m) return null;
    return {
      en: `The ${m[1]} m² reserve is larger than the ${m[2]} m² island, so it is drawn at the island's size and still deducted in full.`,
      ar: `المساحة المحجوزة (${m[1]} م²) أكبر من الجزيرة (${m[2]} م²)، فترسم بحجم الجزيرة وتخصم كاملة من عدد المواقف.`,
    };
  },
  (t) => {
    const m = /^Laid out as (.+?): (\d+) bays, against (\d+) (.+?) and (\d+) (.+?), in the same rectangle/.exec(t);
    if (!m) return null;
    const [, chosen = '', bays, n1, name1 = '', n2, name2 = ''] = m;
    const [c, a, b] = [ORIENTATION[chosen], ORIENTATION[name1], ORIENTATION[name2]];
    if (!c || !a || !b) return null;
    return {
      en: `Best of three: ${bays} bays as ${c.en}, against ${n1} as ${a.en} and ${n2} as ${b.en}.`,
      ar: `الأفضل من ثلاثة ترتيبات: ${bays} موقفا (${c.ar})، مقابل ${n1} (${a.ar}) و${n2} (${b.ar}).`,
    };
  },
  (t) => {
    const m = /^The ([\d,.]+) m² deducted for cores, plant and the ramp landing costs about (\d+) bays at ([\d.]+) m² each/.exec(t);
    if (!m) return null;
    return {
      en: `The ${m[1]} m² taken by cores, plant and the ramp landing costs about ${m[2]} bays (${m[3]} m² each).`,
      ar: `المساحة المخصومة للنوى والمعدات وبسطة المنحدر (${m[1]} م²) تعادل نحو ${m[2]} موقفا (${m[3]} م² لكل موقف).`,
    };
  },
  (t) => {
    const m = /^Ramp arrangement: (.+?)\. .*The other (\d+) enumerated arrangement/.exec(t);
    const label = m ? rampLabel(m[1] ?? '') : null;
    if (!m || !label) return null;
    return {
      en: `Ramp: ${label.en}. Its width is not checked against B.7.2.2; the ${m[2]} other arrangements are listed, not ranked.`,
      ar: `المنحدر (الرامب): ${label.ar}. عرضه غير مفحوص مقابل B.7.2.2، والترتيبات الأخرى (${m[2]}) معروضة دون مفاضلة.`,
    };
  },
  (t) =>
    t.startsWith('WHICH WAY THE RAMP RUNS IS NOT ESTABLISHED')
      ? {
          en: 'Ramp direction unknown: no level schedule says whether it goes down to a basement or up to the podium.',
          ar: 'اتجاه المنحدر غير محدد: لا يوجد جدول أدوار يبين هل ينزل إلى البدروم أم يصعد إلى البوديوم.',
        }
      : null,
  (t) =>
    t.startsWith('Whether a T junction sits opposite')
      ? {
          en: 'A T junction opposite the entrance (B.7.2.1): that needs the road network, which no affection plan carries.',
          ar: 'تقاطع على شكل T مقابل المدخل (B.7.2.1): يحتاج إلى شبكة الطرق، ولا يحملها أي مخطط أفكشن.',
        }
      : null,
  (t) =>
    t.startsWith('RTA approval.')
      ? {
          en: 'RTA approval: B.7.2.1 leaves the entrance location to RTA, and nothing here replaces it.',
          ar: 'موافقة هيئة الطرق والمواصلات (RTA): يحيل B.7.2.1 موقع المدخل إليها، ولا شيء هنا يغني عنها.',
        }
      : null,
  (t) =>
    t.startsWith('Whether a traffic impact study is required')
      ? { en: 'Whether a traffic impact study is required.', ar: 'هل تلزم دراسة أثر مروري.' }
      : null,
  (t) => {
    const m = /^(ARTERIAL|COLLECTOR|LOCAL|ACCESS) road; B\.7\.2\.1 prefers the more secondary frontage/.exec(t);
    const road = m ? ROAD[m[1] ?? ''] : undefined;
    if (!road) return null;
    return {
      en: `${road.en}. Where a plot faces more than one road, B.7.2.1 prefers the lesser one.`,
      ar: `${road.ar}. حين تطل القطعة على أكثر من طريق، يفضل B.7.2.1 الطريق الأدنى رتبة.`,
    };
  },
  (t) =>
    t.startsWith('named as the access side on the affection plan')
      ? {
          en: 'The affection plan names this side for access, and B.7.2.1 defers to it.',
          ar: 'مخطط أفكشن يحدد هذا الجانب للمدخل، وB.7.2.1 يأخذ به.',
        }
      : null,
  (t) =>
    t.startsWith('road frontage of unstated hierarchy')
      ? {
          en: 'Road class not stated. Classify the road to rank this side.',
          ar: 'تصنيف الطريق غير محدد. حدد التصنيف لترتيب هذا الجانب.',
        }
      : null,
  (t) =>
    t.startsWith('shares a boundary with a neighbouring plot')
      ? { en: 'Shared with a neighbouring plot: no vehicle can enter here.', ar: 'حد مشترك مع قطعة مجاورة: لا تدخل منه السيارات.' }
      : null,
  (t) => {
    const m = /^road frontage is ([\d.]+) m\. After ([\d.]+) m of junction clearance at each corner \(B\.7\.2\.1\) only ([\d.-]+) m remains, which cannot hold a ([\d.]+) m opening/.exec(t);
    if (!m) return null;
    return {
      en: `${m[1]} m of frontage. After ${m[2]} m of junction clearance at each corner (B.7.2.1), ${m[3]} m is left, too short for a ${m[4]} m opening.`,
      ar: `واجهة بطول ${m[1]} م. بعد ${m[2]} م ابتعاد عن التقاطع عند كل ركن (B.7.2.1) يتبقى ${m[3]} م، وهذا لا يتسع لمدخل بعرض ${m[4]} م.`,
    };
  },
];

/** The engine's sentence, short and in `locale`; null when its wording is not one this file knows. */
export function engineNote(text: string, locale: Locale): string | null {
  for (const read of READERS) {
    const said = read(text);
    if (said) return said[locale];
  }
  return null;
}
