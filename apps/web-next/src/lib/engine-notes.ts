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
  'rows across the whole footprint, along the width': {
    en: 'rows across the whole footprint, along the width',
    ar: 'صفوف على كامل المسقط بموازاة العرض',
  },
  'rows across the whole footprint, along the depth': {
    en: 'rows across the whole footprint, along the depth',
    ar: 'صفوف على كامل المسقط بموازاة العمق',
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
    const m = /^A ([\d.]+) × ([\d.]+) m straight ramp (runs down one edge|runs along the island the ring encloses|continues the longest drive aisle from its end): 12% with a 3\.6 m transition at 6% at each end/.exec(t);
    if (!m) return null;
    const where =
      m[3] === 'runs down one edge'
        ? { en: 'along one edge', ar: 'بطول أحد الأطراف' }
        : m[3] === 'runs along the island the ring encloses'
          ? { en: 'on the island', ar: 'على الجزيرة' }
          : { en: 'continuing the longest aisle', ar: 'امتدادا لأطول ممر' };
    return {
      en: `Straight ramp ${m[1]} × ${m[2]} m ${where.en}: 12%, with a 3.6 m transition at 6% at each end (DBC Tables B.9, B.10).`,
      ar: `رامب مستقيم ${m[1]} × ${m[2]} م ${where.ar}: ميل 12% مع انتقال 3.6 م بميل 6% عند كل طرف (جدولا B.9 وB.10 من كود دبي).`,
    };
  },
  (t) => {
    const ok = /^Headroom \(Table B\.9, 2\.4 m clear above any point of a ramp\): .*one ([\d.]+) m storey up\. .*at most ([\d.]+) m deep/.exec(t);
    if (ok) {
      return {
        en: `Headroom: 2.4 m clear over every ramp (Table B.9). With ${ok[1]} m storeys, the slab and beams over a ramp may be at most ${ok[2]} m deep. No structure is drawn: this is the limit a design must meet.`,
        ar: `الارتفاع الحر: 2.4 م فوق كل رامب (جدول B.9). مع دور ارتفاعه ${ok[1]} م، لا يزيد عمق البلاطة والكمرات فوق الرامب عن ${ok[2]} م. لا يرسم الإنشاء: هذا هو الحد الذي يجب أن يلتزم به التصميم.`,
      };
    }
    const no = /^Headroom \(Table B\.9, 2\.4 m clear above any point of a ramp\) cannot be met: the storey is ([\d.]+) m/.exec(t);
    if (!no) return null;
    return {
      en: `Headroom cannot be met: a ${no[1]} m storey leaves no room for a slab over the ramp under Table B.9's 2.4 m. The storey height must change.`,
      ar: `الارتفاع الحر غير ممكن: دور ارتفاعه ${no[1]} م لا يترك مكانا لبلاطة فوق الرامب مع 2.4 م المطلوبة في جدول B.9. يجب تغيير ارتفاع الدور.`,
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
    const m = /^Of the ([\d,.]+) m² reserved for plant and circulation, ([\d,.]+) m² is drawn on the island in (\d+) piece\(s\) and ([\d,.]+) m² has no room on it at all/.exec(t);
    if (!m) return null;
    return {
      en: `Of the ${m[1]} m² reserved for plant and circulation, ${m[2]} m² is drawn on the island in ${m[3]} piece(s); ${m[4]} m² has no room there. All of it is still deducted.`,
      ar: `من ${m[1]} م² محجوزة للمعدات والحركة، رسم ${m[2]} م² على الجزيرة في ${m[3]} جزء، و${m[4]} م² لا مكان لها. وتخصم كلها من عدد المواقف.`,
    };
  },
  (t) => {
    const m = /^Bays are laid in rows across the whole footprint, not inside the largest rectangle in it: (\d+) row\(s\) of ([\d.]+) m bays either side of a ([\d.]+) m aisle, .*joined by (\d+) connector\(s\)/.exec(t);
    if (!m) return null;
    return {
      en: `Rows across the whole footprint, not only the largest rectangle in it: ${m[1]} row(s) of ${m[2]} m bays either side of a ${m[3]} m aisle, joined by ${m[4]} connector(s). Every bay lies wholly inside the setback line.`,
      ar: `صفوف على كامل المسقط لا داخل أكبر مستطيل فيه فقط: ${m[1]} صف من مواقف بطول ${m[2]} م على جانبي ممر بعرض ${m[3]} م، تربطها ${m[4]} وصلة. كل موقف يقع بكامله داخل خط الارتداد.`,
    };
  },
  (t) => {
    const m = /^Of the ([\d,.]+) m² deducted for cores, plant and the ramp landing, (?:([\d,.]+) m² is the core, standing where it is drawn \((\d+) bay\(s\) were not placed there\); )?([\d,.]+) m² stands in the stretches of the bay rows that no aisle serves, where it costs no bay; and ([\d,.]+) m² takes (\d+) bay\(s\)/.exec(t);
    if (!m) return null;
    const core = m[2] ? { en: ` ${m[2]} m² is the core (${m[3]} bays not placed under it).`, ar: ` منها ${m[2]} م² للنواة (${m[3]} مواقف لم توضع تحتها).` } : null;
    return {
      en: `Of the ${m[1]} m² deducted for cores, plant and the ramp landing:${core?.en ?? ''} ${m[4]} m² sits in row ends no aisle serves, at no cost; ${m[5]} m² takes ${m[6]} bays. Counted, not estimated.`,
      ar: `من ${m[1]} م² مخصومة للنوى والمعدات وبسطة الرامب:${core?.ar ?? ''} ${m[4]} م² في أطراف صفوف لا يخدمها ممر، بلا تكلفة؛ و${m[5]} م² تأخذ ${m[6]} موقفا. محسوبة عدا لا تقديرا.`,
    };
  },
  (t) => {
    const m = /^The setback-permitted footprint is not a rectangle, so the rows were laid across the whole of it rather than inside the largest rectangle in it \(([\d.]+ × [\d.]+) m, ([\d.]+)% of the footprint\)\. ([\d,.]+) m² along its edges holds no whole bay or aisle, about (\d+) bays/.exec(t);
    if (!m) return null;
    return {
      en: `The footprint is not a rectangle, so the rows cover all of it, not only the largest rectangle inside (${m[1]} m, ${m[2]}%). ${m[3]} m² along the edges holds no whole bay — about ${m[4]} bays — so the count is a floor.`,
      ar: `المسقط ليس مستطيلا، فوزعت الصفوف على كامله لا على أكبر مستطيل بداخله فقط (${m[1]} م، ${m[2]}%). على الحواف ${m[3]} م² لا تتسع لموقف كامل — نحو ${m[4]} موقفا — فالعدد حد أدنى.`,
    };
  },
  (t) => {
    const m = /^The connectors between the rows cost (\d+) bays across ([\d,.]+) m²/.exec(t);
    if (!m) return null;
    return {
      en: `The connectors between the rows cost ${m[1]} bays (${m[2]} m²): the price of reaching every bay.`,
      ar: `الوصلات بين الصفوف تكلف ${m[1]} موقفا (${m[2]} م²): ثمن الوصول إلى كل موقف.`,
    };
  },
  (t) => {
    const m = /^The cross aisle costs (\d+) bays across ([\d,.]+) m²/.exec(t);
    if (!m) return null;
    return {
      en: `The cross aisle costs ${m[1]} bays (${m[2]} m²): the price of reaching every bay.`,
      ar: `الممر العرضي يكلف ${m[1]} موقفا (${m[2]} م²): ثمن الوصول إلى كل موقف.`,
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
      en: `${m[1]} ramp(s), one per parking level: ${m[2]} down to a basement, ${m[3]} up to the podium.`,
      ar: `${m[1]} رامب، واحد لكل دور مواقف: ${m[2]} نزولا إلى البدروم و${m[3]} صعودا إلى البوديوم.`,
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
