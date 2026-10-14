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
  'bays to the walls, the ring aisle sloped as the ramp': {
    en: 'bays to the walls, the ring sloped as the ramp',
    ar: 'مواقف على الجدران والممر الدائري مائل هو الرامب',
  },
};

/** Longest name first, so "bays to the walls, one ring aisle" never swallows the sloped one. */
const ARRANGEMENT = new RegExp(
  `(\\d+) (${Object.keys(ORIENTATION)
    .sort((a, b) => b.length - a.length)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')})`,
  'g',
);

function rampLabel(label: string): Said | null {
  const straight = /^Straight, two-way: two ([\d.]+) m lanes and a (\d+) mm curb$/.exec(label);
  if (straight) {
    return {
      en: `straight, two-way: two ${straight[1]} m lanes and a ${straight[2]} mm curb`,
      ar: `مستقيم ثنائي الاتجاه: حارتان بعرض ${straight[1]} م بينهما فاصل ${straight[2]} مم`,
    };
  }
  const split = /^Split, ([\d.]+) m in and ([\d.]+) m out side by side$/.exec(label);
  if (split) return { en: `split, ${split[1]} m in and ${split[2]} m out`, ar: `منقسم، ${split[1]} م للدخول و${split[2]} م للخروج` };
  return null;
}

const READERS: readonly Reader[] = [
  (t) => {
    const m = /^A ([\d.]+) × ([\d.]+) m straight ramp runs (down one edge|along the island the ring encloses): 12% with a 3\.6 m transition at 6% at each end/.exec(t);
    if (!m) return null;
    const where = m[3] === 'down one edge' ? { en: 'along one edge', ar: 'بطول أحد الأطراف' } : { en: 'on the island', ar: 'على الجزيرة' };
    return {
      en: `Straight ramp ${m[1]} × ${m[2]} m ${where.en}: 12%, with a 3.6 m transition at 6% at each end (DBC Tables B.9, B.10). Headroom (2.4 m) not assessed.`,
      ar: `رامب مستقيم ${m[1]} × ${m[2]} م ${where.ar}: ميل 12% مع انتقال 3.6 م بميل 6% عند كل طرف (جدولا B.9 وB.10 من كود دبي). الارتفاع الحر (2.4 م) لم يقيم.`,
    };
  },
  (t) => {
    const m = /^The ring aisle is the ramp: it climbs one ([\d.]+) m storey over one ([\d.]+) m lap, ([\d.]+)%/.exec(t);
    if (!m) return null;
    return {
      en: `The ring aisle is the ramp: one ${m[1]} m storey per ${m[2]} m lap, ${m[3]}% — within the 4% a parked floor may slope (B.7.2.3.1). No separate ramp.`,
      ar: `الممر الدائري هو الرامب نفسه: يصعد دورا واحدا (${m[1]} م) كل لفة طولها ${m[2]} م، بميل ${m[3]}% — ضمن حد 4% لأرضية عليها مواقف (B.7.2.3.1). لا حاجة لرامب منفصل.`,
    };
  },
  (t) => {
    const m = /^Bays stand against all four walls and one ([\d.]+) m ring aisle serves them: (\d+) to each long wall and (\d+) to each short one, less the (\d+) the way in/.exec(t);
    if (!m) return null;
    const [, w, long, short, taken] = m;
    const less = taken === '0' ? null : { en: ` The entrance and the core take ${taken}.`, ar: ` يأخذ المدخل والنواة ${taken} منها.` };
    const island = /The island the ring encloses is ([\d.]+ × [\d.]+) m/.exec(t)?.[1];
    const more = /and (\d+) more bays stand on it facing the ring/.exec(t)?.[1];
    return {
      en:
        `Bays line all four walls around one ${w} m ring aisle: ${long} per long wall, ${short} per short wall.${less?.en ?? ''}` +
        `${island ? ` Island inside: ${island} m.` : ''}${more ? ` ${more} more bays stand on the island.` : ''}`,
      ar:
        `المواقف على الجدران الأربعة حول ممر مناورة دائري واحد بعرض ${w} م: ${long} لكل جدار طويل و${short} لكل جدار قصير.${less?.ar ?? ''}` +
        `${island ? ` الجزيرة في الوسط ${island} م.` : ''}${more ? ` و${more} موقفا إضافيا على الجزيرة.` : ''}`,
    };
  },
  (t) => {
    const m = /^Of the ([\d,.]+) m² reserved for plant and circulation, ([\d,.]+) m² is drawn on the island and ([\d,.]+) m² is not/.exec(t);
    if (!m) return null;
    const none = /\(([\d,.]+) m² of it has no room on the island at all\)/.exec(t)?.[1];
    return {
      en:
        `Of the ${m[1]} m² reserved for plant and circulation, ${m[2]} m² is drawn on the island and ${m[3]} m² is not` +
        `${none ? ` (${none} m² has no room there at all)` : ''}. All of it is still deducted.`,
      ar:
        `من ${m[1]} م² محجوزة للمعدات والحركة، رسم ${m[2]} م² على الجزيرة ولم يرسم ${m[3]} م²` +
        `${none ? ` (منها ${none} م² لا مكان لها على الجزيرة أصلا)` : ''}. وتخصم كلها من عدد المواقف.`,
    };
  },
  (t) => {
    const head = /^Laid out as (.+?): (\d+) bays, against /.exec(t);
    const total = /All (\d+) were packed\.$/.exec(t)?.[1];
    const chosen = head ? ORIENTATION[head[1] ?? ''] : undefined;
    if (!head || !total || !chosen) return null;
    // The losers' own refusals sit in brackets between them; only the counts and names are said again.
    const others = [...t.slice(head[0].length).matchAll(ARRANGEMENT)]
      .map((m) => ({ n: m[1] ?? '', name: ORIENTATION[m[2] ?? ''] }))
      .filter((o): o is { n: string; name: Said } => o.name !== undefined);
    if (others.length === 0) return null;
    return {
      en: `Best of ${total}: ${head[2]} bays as ${chosen.en}, against ${others.map((o) => `${o.n} as ${o.name.en}`).join(', ')}.`,
      ar: `الأفضل من ${total} ترتيبات: ${head[2]} موقفا (${chosen.ar})، مقابل ${others.map((o) => `${o.n} (${o.name.ar})`).join('، ')}.`,
    };
  },
  (t) => {
    const m = /^The setback-permitted footprint is not a rectangle, so the level was packed into the largest rectangle inside it — ([\d.]+ × [\d.]+) m, ([\d.]+)% of the footprint\. ([\d,.]+) m² was left unpacked, about (\d+) bays/.exec(t);
    if (!m) return null;
    return {
      en: `The footprint is not a rectangle: the level is packed into the largest rectangle inside it, ${m[1]} m (${m[2]}%). ${m[3]} m² — about ${m[4]} bays — is left unpacked, so the count is a floor.`,
      ar: `المسقط ليس مستطيلا: رتب الدور في أكبر مستطيل بداخله ${m[1]} م (${m[2]}% من المسقط). بقيت ${m[3]} م² بلا ترتيب — نحو ${m[4]} موقفا — فالعدد حد أدنى.`,
    };
  },
  (t) => {
    const m = /^(\d+) bay\(s\) were placed and then dropped: no aisle a car can reach/.exec(t);
    if (!m) return null;
    return {
      en: `${m[1]} bays were dropped: no aisle a car can reach passes their open end. They are not counted.`,
      ar: `استبعد ${m[1]} موقفا: لا يمر أمامها ممر تصل إليه السيارة. لا تحسب ولا ترسم.`,
    };
  },
  (t) => {
    const m = /^(\d+) bay\(s\) would stand where the core does and are not placed/.exec(t);
    if (!m) return null;
    return {
      en: `${m[1]} bays would stand under the core and are not placed. No parking under the stairs and lifts.`,
      ar: `${m[1]} مواقف كانت ستقع تحت النواة فلم توضع. لا مواقف تحت السلالم والمصاعد.`,
    };
  },
  (t) => {
    const m = /^A ([\d.]+) m cross aisle runs the packed depth down one side/.exec(t);
    if (!m) return null;
    return {
      en: `A ${m[1]} m cross aisle joins the module aisles, so every bay can be reached. Its cost is in the losses.`,
      ar: `ممر عرضي بعرض ${m[1]} م يربط ممرات الوحدات حتى يمكن الوصول إلى كل موقف. وتكلفته محسوبة ضمن الفاقد.`,
    };
  },
  (t) => {
    const m = /^The final ([\d.]+) m strip takes a single-loaded row/.exec(t);
    if (!m) return null;
    return {
      en: `The last ${m[1]} m strip takes a single row of bays on its own aisle — half as efficient as a double row.`,
      ar: `الشريط الأخير (${m[1]} م) يأخذ صفا واحدا من المواقف على ممر خاص به — بنصف كفاءة الصف المزدوج.`,
    };
  },
  (t) => {
    const m = /^([\d.]+) m of depth is left unused/.exec(t);
    if (!m) return null;
    return {
      en: `${m[1]} m of depth is left unused: too shallow for a bay and its aisle.`,
      ar: `بقي ${m[1]} م من العمق بلا استخدام: لا يتسع لموقف وممره.`,
    };
  },
  (t) => {
    const m = /^The ([\d,.]+) m² deducted for cores, plant and the ramp landing costs about (\d+) bays at ([\d.]+) m² each/.exec(t);
    if (!m) return null;
    const core = /Of it, ([\d,.]+) m² is the core, standing where it is drawn \((\d+) bay\(s\) were not placed there\), and ([\d,.]+) m² is the strip/.exec(t);
    const split = core
      ? {
          en: ` Of it, ${core[1]} m² is the core (${core[2]} bays not placed under it) and ${core[3]} m² the reserved strip.`,
          ar: ` منها ${core[1]} م² للنواة (${core[2]} مواقف لم توضع تحتها) و${core[3]} م² للشريط المحجوز.`,
        }
      : null;
    return {
      en: `The ${m[1]} m² taken by cores, plant and the ramp landing costs about ${m[2]} bays (${m[3]} m² each).${split?.en ?? ''}`,
      ar: `المساحة المخصومة للنوى والمعدات وبسطة الرامب (${m[1]} م²) تعادل نحو ${m[2]} موقفا (${m[3]} م² لكل موقف).${split?.ar ?? ''}`,
    };
  },
  (t) => {
    const m = /^Ramp arrangement: (.+?)\. .*The other (\d+) enumerated arrangement/.exec(t);
    const label = m ? rampLabel(m[1] ?? '') : null;
    if (!m || !label) return null;
    return {
      en: `Ramp: ${label.en}, sized to DBC Table B.9. The ${m[2]} other arrangements are listed, not ranked.`,
      ar: `الرامب: ${label.ar}، بمقاسات جدول B.9 من كود دبي. والترتيبات الأخرى (${m[2]}) معروضة دون مفاضلة.`,
    };
  },
  (t) => {
    const m = /^(\d+) ramp\(s\), each serving one parking level: (\d+) descending to a level below grade and (\d+) climbing/.exec(t);
    if (!m) return null;
    return {
      en: `${m[1]} ramp(s), one per parking level: ${m[2]} down to a basement, ${m[3]} up to the podium. Headroom (2.4 m) not assessed.`,
      ar: `${m[1]} رامب، واحد لكل دور مواقف: ${m[2]} نزولا إلى البدروم و${m[3]} صعودا إلى البوديوم. الارتفاع الحر (2.4 م) لم يقيم.`,
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
