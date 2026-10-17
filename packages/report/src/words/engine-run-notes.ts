// A cycle with engine-notes.ts, and a safe one: both names are read inside readers, at call time, never at load.
import { ARRANGEMENT_NAME, engineNote, type Reader, type Said } from './engine-notes.js';

/*
  THE REST OF WHAT THE ENGINE SAYS ON SCREEN, IN THE PAGE'S LANGUAGE.

  `engine-notes.ts` began with the parking sentences. Eng. Mohamed, 16 Oct 2026:
  every note at every step in Arabic on the Arabic site and English on the
  English one — refusals included — and none of them spelled out at length. So
  the bases, the checks, the claim statement, the drawing notes and the refusals
  are recognised by their fixed wording here, their figures lifted from the
  engine's own text, and said again briefly in both languages.

  The screen and the study report read these; the drawings, the DXF and the JSON
  keep the engine's words verbatim. A sentence nothing here recognises is shown as written, so a
  new note arrives in English rather than not at all — and `refusalOf` puts an
  Arabic headline over an unrecognised refusal so the page never opens on one.
*/

const starts =
  (start: string, said: Said): Reader =>
  (t) =>
    t.startsWith(start) ? said : null;

/** The level the street reaches, as `ENTRY_LEVEL_WORDS` in `packages/capacity/src/accessible.ts` names it. */
const ENTRY_LEVEL: Readonly<Record<string, Said>> = {
  'ground floor': { en: 'the ground floor', ar: 'الدور الأرضي' },
  'first basement': { en: 'the first basement', ar: 'البدروم الأول' },
  'first podium parking level': { en: 'the first podium parking level', ar: 'أول دور مواقف في البوديوم' },
};

/** The eighteen invariants, by id. Their statements are fixed strings in `packages/invariants`. */
export const INVARIANT: Readonly<Record<string, Said>> = {
  'INV-01': { en: 'Level GFAs add up to the total GFA', ar: 'مجموع المساحة الطابقية للأدوار = الإجمالي' },
  'INV-02': { en: 'Units, core, circulation and services fill each level', ar: 'الوحدات والنواة والحركة والخدمات = مساحة الدور' },
  'INV-03': { en: 'Total GFA ÷ plot area = the reported FAR', ar: 'إجمالي المساحة الطابقية ÷ مساحة القطعة = معامل البناء المعلن' },
  'INV-04': { en: 'Unit counts by type add up to the total', ar: 'مجموع الوحدات حسب النوع = العدد المعلن' },
  'INV-05': { en: 'The mix shares add up to 1', ar: 'مجموع نسب التوزيع = 1' },
  'INV-06': { en: 'Units × mean saleable area = total saleable area', ar: 'عدد الوحدات × متوسط المساحة البيعية = إجمالي المساحة البيعية' },
  'INV-07': { en: 'Efficiency = saleable area ÷ GFA', ar: 'الكفاءة = المساحة البيعية ÷ المساحة الطابقية' },
  'INV-08': { en: 'Podium within its setback line', ar: 'البوديوم داخل خط ارتداده' },
  'INV-09': { en: 'Podium within the coverage cap', ar: 'البوديوم ضمن حد التغطية' },
  'INV-10': { en: 'Tower plate within the podium and its cap', ar: 'مسطح البرج داخل البوديوم وضمن حده' },
  'INV-11': { en: 'Total height within the height ceiling', ar: 'الارتفاع الكلي ضمن حد الارتفاع' },
  'INV-12': { en: 'Parking bays fit the parking area', ar: 'المواقف تتسع لها مساحة المواقف' },
  'INV-13': { en: 'Parking bays meet the demand', ar: 'المواقف تغطي العدد المطلوب' },
  'INV-14': { en: 'The levels fit the height they draw on', ar: 'الأدوار تتسع ضمن الارتفاع المتاح' },
  'INV-15': { en: 'Every area term is defined', ar: 'كل مصطلح مساحة معرف' },
  'INV-16': { en: 'Governing capacity is the least of A, B and C', ar: 'السعة الحاكمة هي الأقل من A وB وC' },
  'INV-17': { en: 'Achieved FAR within the permitted FAR', ar: 'معامل البناء المحقق ضمن المسموح' },
  'INV-18': { en: 'GFA treats parking as declared', ar: 'المساحة الطابقية تعامل المواقف كما أعلن' },
};

const STATEMENT_TO_ID: ReadonlyMap<string, string> = new Map([
  ['Σ(level GFA) = total GFA', 'INV-01'],
  ['Σ(unit NSA) + core + circulation + services = level gross area', 'INV-02'],
  ['total GFA / plot area = reported FAR', 'INV-03'],
  ['Σ(unit counts by type) = reported unit count', 'INV-04'],
  ['Σ(mix shares) = 1.000', 'INV-05'],
  ['Reported unit count × weighted mean unit NSA = total NSA', 'INV-06'],
  ['Reported efficiency = NSA / GFA, at the definition scope stated', 'INV-07'],
  ['Podium footprint ≤ setback-permitted footprint', 'INV-08'],
  ['Podium footprint ≤ coverage cap', 'INV-09'],
  ['Tower plate ≤ podium footprint AND ≤ tower plate cap', 'INV-10'],
  ['Σ(level heights) = reported total height ≤ height ceiling', 'INV-11'],
  ['Parking bays × bay area factor ≤ available parking area', 'INV-12'],
  ['Parking bays ≥ computed demand', 'INV-13'],
  ['Level count × level height budget is integer-consistent', 'INV-14'],
  ['Every area term used appears in the metric definitions annex', 'INV-15'],
  ['Governing capacity = min(A, B, C) and is labelled as such', 'INV-16'],
  ['Achieved FAR ≤ permitted FAR', 'INV-17'],
  ['GFA composition matches the declared parking-in-FAR treatment', 'INV-18'],
]);

/** The words a claim's status and a check's verdict are given in. */
const STATUS: Readonly<Record<string, Said>> = {
  SUPPORTED: { en: 'Supported', ar: 'مدعوم' },
  PARTIAL: { en: 'Partial', ar: 'جزئي' },
  MEASURED: { en: 'Measured', ar: 'مقيس' },
  NOT_ASSESSED: { en: 'Not assessed', ar: 'لم يقيم' },
  NEVER_CLAIMED: { en: 'Never claimed', ar: 'لا يدعى أبدا' },
  NOT_YET_MEASURED: { en: 'Not yet measured', ar: 'لم يقس بعد' },
};

/** The labels a binding constraint is named by. */
const BINDING: Readonly<Record<string, Said>> = {
  'height ceiling': { en: 'height ceiling', ar: 'حد الارتفاع' },
  'tower plate': { en: 'tower plate', ar: 'مسطح البرج' },
  'tower plate cap': { en: 'tower plate cap', ar: 'حد مسطح البرج' },
  'tower coverage cap': { en: 'tower coverage cap', ar: 'حد تغطية البرج' },
  'plot coverage cap': { en: 'coverage cap', ar: 'حد التغطية' },
  'setback-permitted footprint': { en: 'setback line', ar: 'خط الارتداد' },
  'podium setback line': { en: 'podium setback line', ar: 'خط ارتداد البوديوم' },
  'level count stated on the affection plan': { en: 'level count on the affection plan', ar: 'عدد الأدوار في مخطط الأفكشن' },
  FAR: { en: 'FAR', ar: 'معامل البناء' },
  'permitted GFA': { en: 'permitted GFA', ar: 'المساحة الطابقية المسموحة' },
  'parking supply': { en: 'parking supply', ar: 'عدد المواقف المتاح' },
};

const ROOM: Readonly<Record<string, string>> = {
  substation: 'غرفة المحولات',
  'lv room': 'غرفة الجهد المنخفض',
  'entrance lobby': 'بهو المدخل',
  'generator room': 'غرفة المولد',
  'pump room': 'غرفة المضخات',
  'water tank': 'خزان المياه',
  'garbage room': 'غرفة النفايات',
  'tel room': 'غرفة الاتصالات',
  'mm room': 'غرفة MM',
};

/** One invariant's sentence from a refusal: `INV-14 FAILED — <statement>. Observed X, expected Y. <detail>`. */
function invariantFailure(reason: string): Said | null {
  const m = /^(INV-\d+) FAILED — .*?Observed (.+?), expected (.+?)\. /.exec(reason);
  const said = m ? INVARIANT[m[1] ?? ''] : undefined;
  if (!m || !said) return null;
  return {
    en: `${m[1]} failed — ${said.en}: got ${m[2]}, expected ${m[3]}.`,
    ar: `${m[1]} لم ينجح — ${said.ar}: الناتج ${m[2]}، والمطلوب ${m[3]}.`,
  };
}

function blockerOf(reason: string): Said | null {
  const inv = invariantFailure(reason);
  if (inv) return inv;
  const hard = /^(\d+) hard constraint\(s\) violated \(([^)]*)\)/.exec(reason);
  if (hard) {
    return {
      en: `${hard[1]} binding limit(s) exceeded (${hard[2]}).`,
      ar: `تجاوز ${hard[1]} من الحدود الملزمة (${hard[2]}).`,
    };
  }
  const halted = /^([\w.]+) halted at (\w+)/.exec(reason);
  if (halted) {
    return {
      en: `${halted[1]}: two rules conflict and nothing ranks them.`,
      ar: `${halted[1]}: قاعدتان متعارضتان ولا ترتيب بينهما.`,
    };
  }
  if (reason.startsWith('geometry is not topologically valid')) {
    return { en: 'The geometry is not valid.', ar: 'الشكل الهندسي غير سليم.' };
  }
  const area = /^(\d+) independent area recomputation\(s\) disagreed/.exec(reason);
  if (area) return { en: `${area[1]} area recomputation(s) disagreed.`, ar: `${area[1]} من إعادات حساب المساحة لم تتطابق.` };
  return null;
}

/*
  THE NAMES OF THE ASSUMED VALUES, as the register heads them. Short, so the
  English-word scan that found the long sentences passed over every one of them.
*/
const LABEL: Readonly<Record<string, Said>> = {
  'core area': { en: 'Core area', ar: 'مساحة النواة' },
  'core, plant and circulation deduction': { en: 'Core, plant and circulation deduction', ar: 'المقتطع للنواة والخدمات والحركة' },
  'height ceiling and tower plate': { en: 'Height ceiling and tower plate', ar: 'سقف الارتفاع ومسطح البرج' },
  'level count on the affection plan and tower plate': {
    en: 'Level count on the affection plan and tower plate',
    ar: 'عدد الأدوار في مخطط الأرض ومسطح البرج',
  },
  'height ceiling': { en: 'Height ceiling', ar: 'سقف الارتفاع' },
  'indicative core layout': { en: 'Indicative core layout', ar: 'توزيع النواة الاسترشادي' },
  'indicative ground-floor rooms': { en: 'Indicative ground-floor rooms', ar: 'غرف الدور الأرضي الاسترشادية' },
  'inner turning radius on an aisle': { en: 'Inner turning radius on an aisle', ar: 'نصف قطر الدوران الداخلي في الممر' },
  'lane a car turns in': { en: 'Lane a car turns in', ar: 'عرض الحارة عند الدوران' },
  'level count stated on the affection plan': { en: 'Level count stated on the affection plan', ar: 'عدد الأدوار في مخطط الأرض' },
  'parking arrangement': { en: 'Parking arrangement', ar: 'ترتيب المواقف' },
  'parking levels available': { en: 'Parking levels available', ar: 'أدوار المواقف المتاحة' },
  'parking supply': { en: 'Parking supply', ar: 'المواقف المتوفرة' },
  'plot coverage cap': { en: 'Plot coverage cap', ar: 'الحد الأعلى لنسبة التغطية' },
  'podium levels': { en: 'Podium levels', ar: 'أدوار المنصة' },
  'ramp arrangement': { en: 'Ramp arrangement', ar: 'نوع المنحدر' },
  'realism discount': { en: 'Realism discount', ar: 'خصم الواقعية' },
  'saleable area ÷ GFA': { en: 'Saleable area ÷ GFA', ar: 'المساحة القابلة للبيع ÷ المساحة الطابقية' },
  'saleable area': { en: 'Saleable area', ar: 'المساحة القابلة للبيع' },
  'storey a ramp climbs': { en: 'Storey a ramp climbs', ar: 'الارتفاع الذي يصعده المنحدر' },
  'tower plate cap': { en: 'Tower plate cap', ar: 'الحد الأعلى لمسطح البرج' },
  'tower setback line': { en: 'Tower setback line', ar: 'خط ارتداد البرج' },
  'transformers the substation holds': { en: 'Transformers the substation holds', ar: 'عدد المحولات في المحطة' },
  'unit mix': { en: 'Unit mix', ar: 'مزيج الوحدات' },
  'where the core stands': { en: 'Where the core stands', ar: 'موضع النواة' },
  'where the podium stands': { en: 'Where the podium stands', ar: 'موضع المنصة' },
  'where the substation stands': { en: 'Where the substation stands', ar: 'موضع المحطة الفرعية' },
  'where the tower stands': { en: 'Where the tower stands', ar: 'موضع البرج' },
  'which levels hold the parking': { en: 'Which levels hold the parking', ar: 'الأدوار التي تضم المواقف' },
  'FAR ceiling': { en: 'FAR ceiling', ar: 'الحد الأعلى لمعامل البناء' },
  Podium: { en: 'Podium', ar: 'المنصة' },
  Tower: { en: 'Tower', ar: 'البرج' },
  'Vehicle entrance, as placed': { en: 'Vehicle entrance, as placed', ar: 'مدخل المركبات كما وضع' },
  'how Table C.17 is read where it is silent': {
    en: 'How the accessible-parking table is read where it is silent',
    ar: 'قراءة جدول مواقف أصحاب الهمم حيث يسكت',
  },
  'how B.7.2.6.2 is rounded': { en: 'How the preferred-parking share is rounded', ar: 'تقريب نسبة المواقف المفضلة' },
};

/* The register heads a value with its parameter id where the engine gave it no label. */
const PARAMETER: Readonly<Record<string, Said>> = {
  'parking.usable_fraction': { en: 'Usable share of a parking level', ar: 'النسبة القابلة للاستخدام من دور المواقف' },
  'capacity.saleable_efficiency': { en: 'Saleable area ÷ GFA', ar: 'المساحة القابلة للبيع ÷ المساحة الطابقية' },
  'building.core_area_m2': { en: 'Core area', ar: 'مساحة النواة' },
  'parking.unit_mix': { en: 'Unit mix', ar: 'مزيج الوحدات' },
  'envelope.coverage_cap': { en: 'Plot coverage cap', ar: 'الحد الأعلى لنسبة التغطية' },
  'building.core_placement': { en: 'Where the core stands', ar: 'موضع النواة' },
  'building.core_layout': { en: 'Core layout', ar: 'توزيع النواة' },
  'parking.ramp_type': { en: 'Ramp type', ar: 'نوع المنحدر' },
  'parking.turning_inner_radius_m': { en: 'Inner turning radius on an aisle', ar: 'نصف قطر الدوران الداخلي في الممر' },
  'parking.turning_lane_m': { en: 'Lane a car turns in', ar: 'عرض الحارة عند الدوران' },
  'building.tower_placement': { en: 'Where the tower stands', ar: 'موضع البرج' },
  'plant.substation.transformers': { en: 'Transformers in the substation', ar: 'عدد المحولات في المحطة' },
  'building.ground_floor_program': { en: 'Ground-floor rooms', ar: 'غرف الدور الأرضي' },
  'building.podium_levels': { en: 'Podium levels', ar: 'أدوار المنصة' },
  'building.parking_placement': { en: 'Which levels hold the parking', ar: 'الأدوار التي تضم المواقف' },
  'parking.storey_height_m': { en: 'Storey a ramp climbs', ar: 'الارتفاع الذي يصعده المنحدر' },
  'parking.module_orientation': { en: 'Parking arrangement', ar: 'ترتيب المواقف' },
  'parking.accessible_reading': {
    en: 'How the accessible-parking table is read where it is silent',
    ar: 'قراءة جدول مواقف أصحاب الهمم حيث يسكت',
  },
  'parking.accessible_required': { en: 'Accessible bays required', ar: 'مواقف أصحاب الهمم المطلوبة' },
  'parking.accessible_bays': { en: 'Accessible bays placed', ar: 'مواقف أصحاب الهمم الموزعة' },
  'parking.accessible_basis_total': { en: 'Bays the accessible count is taken from', ar: 'المواقف التي يحسب منها عدد مواقف أصحاب الهمم' },
  'parking.accessible_ratio': { en: 'Accessible parking share', ar: 'نسبة مواقف أصحاب الهمم' },
  'parking.accessible_van_ratio': { en: 'Accessible van bays', ar: 'مواقف الشاحنات الصغيرة لأصحاب الهمم' },
  'parking.accessible_farthest_m': { en: 'Farthest accessible bay from the core', ar: 'أبعد موقف لأصحاب الهمم عن النواة' },
  'parking.entry_level_bays': { en: 'Bays on the level the street reaches', ar: 'المواقف في الدور الذي يصله الشارع' },
  'parking.preferred_reading': { en: 'How the preferred-parking share is rounded', ar: 'تقريب نسبة المواقف المفضلة' },
  'parking.preferred_ratio': { en: 'Preferred parking share', ar: 'نسبة المواقف المفضلة' },
  'parking.preferred_required': { en: 'Preferred bays required', ar: 'المواقف المفضلة المطلوبة' },
};

/* Values the engine writes as words. */
const VALUE: Readonly<Record<string, Said>> = {
  STRAIGHT: { en: 'Straight, two-way', ar: 'مستقيم باتجاهين' },
  SPLIT: { en: 'Split, in and out side by side', ar: 'حارتا دخول وخروج متجاورتان' },
  EXCLUDED_FROM_FAR: { en: 'Not counted in FAR', ar: 'لا تحسب في معامل البناء' },
  INCLUDED_IN_FAR: { en: 'Counted in FAR', ar: 'تحسب في معامل البناء' },
  'rounded up; 10 for the first 500; one under 25': {
    en: 'Rounded up; 10 for the first 500 bays; one under 25',
    ar: 'تقرب للأعلى؛ 10 لأول 500 موقف؛ وموقف واحد لما دون 25',
  },
  'rounded up': { en: 'Rounded up', ar: 'تقرب للأعلى' },
};

const SHEET: Readonly<Record<string, Said>> = {
  'Site plan': { en: 'Site plan', ar: 'المخطط العام' },
  'Typical floor': { en: 'Typical floor', ar: 'الدور المتكرر' },
};

const UNIT_TYPE: Readonly<Record<string, string>> = {
  STUDIO: 'استوديو',
  '1BED': 'غرفة واحدة',
  '2BED': 'غرفتان',
  '3BED': 'ثلاث غرف',
  '4BED': 'أربع غرف',
};

export const RUN_READERS: readonly Reader[] = [
  (t) => LABEL[t] ?? PARAMETER[t] ?? VALUE[t] ?? SHEET[t] ?? null,
  /* ── Level and sheet names ────────────────────────────────── */
  (t) => {
    const m = /^(Basement|Podium|Level) (\d+)( · parking| · typical floor)?$|^Ground floor( · parking| · typical floor)?$/.exec(t);
    if (!m) return null;
    const use = m[3] ?? m[4] ?? '';
    const what = use === ' · parking' ? { en: ' · parking', ar: ' · مواقف' } : use ? { en: ' · typical floor', ar: ' · دور متكرر' } : { en: '', ar: '' };
    const name = !m[1]
      ? { en: 'Ground floor', ar: 'الدور الأرضي' }
      : m[1] === 'Basement'
        ? { en: `Basement ${m[2]}`, ar: `البدروم ${m[2]}` }
        : m[1] === 'Podium'
          ? { en: `Podium ${m[2]}`, ar: `المنصة ${m[2]}` }
          : { en: `Level ${m[2]}`, ar: `الدور ${m[2]}` };
    return { en: name.en + what.en, ar: name.ar + what.ar };
  },
  (t) => {
    const m = /^Parking level (\S+)$/.exec(t);
    return m ? { en: t, ar: `دور المواقف ${m[1]}` } : null;
  },
  (t) => {
    const m = /^Section (\S+)$/.exec(t);
    return m ? { en: t, ar: `المقطع ${m[1]}` } : null;
  },
  /* ── Assumed values written as text ───────────────────────── */
  (t) => {
    if (!t.startsWith('typeId ')) return null;
    const parts = t.split('; ').map((p) => /typeId (\S+), label (.+?), share ([\d.]+), nsaM2 ([\d.]+), count (\d+)/.exec(p));
    if (parts.some((p) => !p)) return null;
    const rows = parts.map((p) => ({ id: p![1] ?? '', label: p![2] ?? '', share: Number(p![3]) * 100, nsa: p![4] ?? '', n: p![5] ?? '' }));
    const pct = (v: number): string => `${Number(v.toFixed(1))}%`;
    return {
      en: rows.map((r) => `${r.label}: ${pct(r.share)}, ${r.nsa} m², ${r.n} units`).join('; '),
      ar: rows.map((r) => `${UNIT_TYPE[r.id] ?? r.label}: ${pct(r.share)}، ${r.nsa} m²، ${r.n} وحدة`).join('؛ '),
    };
  },
  (t) => {
    const m = /^(\d+) stairs ([\d.]+ × [\d.]+) m, (\d+) lifts? ([\d.]+ × [\d.]+) m, lift lobby ([\d.]+) m deep$/.exec(t);
    if (!m) return null;
    return {
      en: t,
      ar: `درج عدد ${m[1]} (${m[2]} m)، ومصعد عدد ${m[3]} (${m[4]} m)، وردهة مصاعد بعمق ${m[5]} m`,
    };
  },
  /* ── The sheet step's own checks ──────────────────────────── */
  (t) => {
    const m = /^The drawing measures ([\d.]+) m between corners (\d+) and (\d+); the sheet prints ([\d.]+) m beside it\.$/.exec(t);
    if (!m) return null;
    return {
      en: `Drawn ${m[1]} m between corners ${m[2]} and ${m[3]}; printed ${m[4]} m.`,
      ar: `المرسوم ${m[1]} m بين الركنين ${m[2]} و${m[3]}، والمطبوع بجانبه ${m[4]} m.`,
    };
  },
  /* ── Parking notes ────────────────────────────────────────── */
  (t) => {
    const m = /^A second ([\d.]+) m cross aisle runs down the far side\./.exec(t);
    if (!m) return null;
    return {
      en: `A second ${m[1]} m cross aisle on the far side reaches the bays the core cuts off.`,
      ar: `ممر عرضي ثان بعرض ${m[1]} m على الجانب الآخر، يوصل إلى المواقف التي تقطعها النواة.`,
    };
  },
  /* ── A check's observed / expected figures (INV-15) ───────── */
  (t) => {
    const m = /^every reported term present in annex (\S+)$/.exec(t);
    return m ? { en: `every reported term defined in annex ${m[1]}`, ar: `كل مصطلح مساحة معرّف في الملحق ${m[1]}` } : null;
  },
  (t) => {
    const m = /^(\d+) of (\d+) defined$/.exec(t);
    return m ? { en: `${m[1]} of ${m[2]} defined`, ar: `${m[1]} من ${m[2]} معرّفة` } : null;
  },
  (t) => (t === '0 terms named' ? { en: 'no terms named', ar: 'لم يُذكر أي مصطلح' } : null),
  /* ── Refusals ─────────────────────────────────────────────── */
  (t) => {
    const m = /^the parking arrangement ([A-Z_]+) (is not one this level can be packed in|places no bay on this level).*?This level offers (.+)\.$/s.exec(t);
    if (!m) return null;
    const offers = [...(m[3] ?? '').matchAll(/([A-Z_]+) \((\d+) bays\)/g)].map((o) => ({ id: o[1] ?? '', n: o[2] ?? '' }));
    const name = (id: string): Said => {
      const en = ARRANGEMENT_NAME[id] ?? id;
      return { en: engineNote(en, 'en') ?? en, ar: engineNote(en, 'ar') ?? en };
    };
    const picked = name(m[1] ?? '');
    const none = m[2]?.startsWith('places') === true;
    return {
      en:
        `The option you picked (${picked.en}) ${none ? 'places no bay on this level' : 'is not available on this level'}. ` +
        `Available: ${offers.map((o) => `${name(o.id).en} — ${o.n} bays`).join('; ')}.`,
      ar:
        `الخيار الذي اخترته (${picked.ar}) ${none ? 'لا يتسع لأي موقف في هذا الدور' : 'غير متاح في هذا الدور'}. ` +
        `المتاح: ${offers.map((o) => `${name(o.id).ar}: ${o.n} موقفا`).join('؛ ')}.`,
    };
  },
  (t) => {
    const m = /^this run may not be emitted: (\d+) finding\(s\) block it\. (.*?) PRD §12\.3/s.exec(t);
    if (!m) return null;
    const reasons = (m[2] ?? '').split(' | ').map((r) => blockerOf(r.trim()));
    const known = reasons.filter((r): r is Said => r !== null);
    const unknown = reasons.length - known.length;
    return {
      en:
        `This study cannot be issued: ${m[1]} check(s) stop it. ${known.map((r) => r.en).join(' ')}` +
        (unknown > 0 ? ` ${unknown} more in the checks step.` : ''),
      ar:
        `لا يمكن إصدار هذه الدراسة: ${m[1]} من الفحوص تمنعها. ${known.map((r) => r.ar).join(' ')}` +
        (unknown > 0 ? ` و${unknown} أخرى في خطوة الفحوصات.` : ''),
    };
  },
  (t) => {
    const m = /^this address has started (\d+) computations in the last minute, which is the limit here\. Wait (\d+) seconds/.exec(t);
    if (!m) return null;
    return {
      en: `${m[1]} computations in the last minute is the limit. Wait ${m[2]} seconds and try again; nothing you entered is lost.`,
      ar: `بلغت الحد: ${m[1]} عملية حساب في الدقيقة. انتظر ${m[2]} ثانية ثم أعد المحاولة؛ لن يضيع شيء مما أدخلته.`,
    };
  },
  (t) => {
    const m = /^The (vehicle entrance|entry|exit) on (.+?) is centred ([\d.]+) m from (P\d+)\. A ([\d.]+) m opening on this boundary must be centred between ([\d.]+) m and ([\d.]+) m from P\d+/.exec(t);
    if (!m) return null;
    const what = m[1] === 'exit' ? { en: 'exit', ar: 'المخرج' } : m[1] === 'entry' ? { en: 'entry', ar: 'المدخل' } : { en: 'entrance', ar: 'مدخل السيارات' };
    return {
      en: `The ${what.en} is ${m[3]} m from ${m[4]}; on this boundary it must sit between ${m[6]} and ${m[7]} m (15 m clear of a junction).`,
      ar: `${what.ar} على بعد ${m[3]} م من ${m[4]}، ويجب أن يكون على هذا الحد بين ${m[6]} و${m[7]} م (15 م بعيدا عن التقاطع).`,
    };
  },
  (t) => {
    const m = /^The (vehicle entrance|entry|exit) was placed on (.+?), which cannot take one/.exec(t);
    if (!m) return null;
    return {
      en: `This boundary cannot take the ${m[1] === 'exit' ? 'exit' : 'entrance'}: it is not a road frontage long enough for one.`,
      ar: `هذا الحد لا يصلح ${m[1] === 'exit' ? 'للمخرج' : 'للمدخل'}: ليس واجهة على طريق تتسع له.`,
    };
  },
  (t) => {
    const m = /^emission blocked by (\d+) finding\(s\)/.exec(t);
    return m ? { en: `Cannot be issued: ${m[1]} check(s) stop it.`, ar: `لا يمكن الإصدار: ${m[1]} من الفحوص تمنعه.` } : null;
  },
  /* No floor count, no placeholder: the envelope refuses rather than invent a height (DBC B.4.2.2). */
  starts('no floor count is stated for this plot, so no height can be computed', {
    en: 'No floor count is stated for this plot, so there is no height to compute (DBC B.4.2.2: the affection plan or DCR sets the floors, × 6 m each). Add the affection plan or the DCR’s floor count.',
    ar: 'لا يوجد عدد أدوار محدد لهذه القطعة، فلا يمكن حساب الارتفاع (كود دبي B.4.2.2: مخطط أفكشن أو اشتراطات نظم التطوير (DCR) تحدد الأدوار، و6 م لكل دور). أضف مخطط أفكشن أو عدد الأدوار من اشتراطات نظم التطوير.',
  }),

  /* ── The sheet step ───────────────────────────────────────── */
  (t) => (t === 'plot_area = area of the drawn ring' ? { en: 'plot area = area of the drawn outline', ar: 'مساحة القطعة = مساحة الحدود المرسومة' } : null),
  (t) => {
    const m = /^boundary (\d+) = the dimension printed beside it$/.exec(t);
    return m ? { en: `boundary ${m[1]} = the dimension printed beside it`, ar: `الحد ${m[1]} = البعد المطبوع بجانبه` } : null;
  },
  (t) => {
    const m = /^The (\d+) corners of the drawn plot, placed by (.+?), close a ring of ([\d,.]+) m² against a printed plot area of ([\d,.]+) m²/.exec(t);
    if (!m) return null;
    const grid = /grid/.test(m[2] ?? '');
    return {
      en: `The ${m[1]} drawn corners${grid ? ', placed by the sheet’s grid,' : ''} enclose ${m[3]} m² against the printed ${m[4]} m².`,
      ar: `الأركان المرسومة (${m[1]})${grid ? ' موضوعة من شبكة المخطط و' : ' '}تحيط بمساحة ${m[3]} م² مقابل ${m[4]} م² مطبوعة.`,
    };
  },
  starts('REGULATORY VALIDITY: NOT ASSESSED. These are the values printed on the sheet', {
    en: 'Values as printed on the sheet, read and checked. Confirm each against the document before use.',
    ar: 'القيم كما طبعت في المخطط، مقروءة ومفحوصة. راجع كلا منها مع الوثيقة قبل الاستخدام.',
  }),

  /* ── Rules and capacity ───────────────────────────────────── */
  starts('a generic Dubai apartment mix', {
    en: 'A typical Dubai apartment mix, as no developer standard was chosen. It moves the unit count: choose a standard or enter the mix.',
    ar: 'توزيع شقق معتاد في دبي، لعدم اختيار معيار مطور. يؤثر في عدد الوحدات: اختر معيارا أو أدخل التوزيع.',
  }),
  starts('This output was produced from DRAFT rules', {
    en: 'Produced from draft rules: a demonstration of the engine, not a capacity assessment. Do not rely on or pass on its figures.',
    ar: 'ناتجة من قواعد مسودة: عرض للمحرك لا تقييم للسعة. لا يعتمد على أرقامها ولا تنقل لطرف آخر.',
  }),
  starts('the fraction of a parking level left for bays and aisles', {
    en: 'The share of a parking level left for bays and aisles after cores, ramps and plant.',
    ar: 'نسبة دور المواقف المتبقية للمواقف والممرات بعد النوى والرامبات والمعدات.',
  }),
  (t) => {
    const m = /^not asked in this phase: .*?([\d.]+) is the middle of the ([\d–-]+)% of GFA/.exec(t);
    if (!m) return null;
    return {
      en: `Not asked in this phase. ${m[1]} is the middle of the usual ${m[2]}% of GFA; it moves the unit count and the parking required.`,
      ar: `لا تطلب في هذه المرحلة. ${m[1]} منتصف النطاق المعتاد ${m[2]}% من المساحة الطابقية، وتؤثر في عدد الوحدات والمواقف المطلوبة.`,
    };
  },
  (t) => {
    const m = /^A core of ([\d.]+)% of the tower plate: the middle of the ([\d–-]+)%/.exec(t);
    if (!m) return null;
    return {
      en: `Core at ${m[1]}% of the tower plate, within the usual ${m[2]}%. It moves no capacity figure. Enter the core area to replace it.`,
      ar: `النواة ${m[1]}% من مسطح البرج، ضمن النطاق المعتاد ${m[2]}%. لا تغير أي رقم للسعة. أدخل مساحة النواة لاستبدالها.`,
    };
  },
  (t) => {
    const m = /^no floor count is stated for this plot, and DBC B\.4\.2\.2 ¶1 leaves height to the affection plan or DCR\. ([\d.]+) m is a placeholder/.exec(t);
    if (!m) return null;
    return {
      en: `No floor count is stated, and the code leaves height to the affection plan or DCR (B.4.2.2). ${m[1]} m is a placeholder no document prints, so the study can run. With the sheet’s floor count the ceiling is that count × 6 m.`,
      ar: `لا يوجد عدد أدوار محدد، والكود يترك الارتفاع لمخطط أفكشن أو اشتراطات نظم التطوير (B.4.2.2). ${m[1]} م قيمة مؤقتة لا تذكرها أي وثيقة، لتعمل الدراسة. مع عدد الأدوار من المخطط يصبح الحد هذا العدد × 6 م.`,
    };
  },
  (t) => {
    const m = /^stated floor count (\d+) × ([\d.]+) m per floor \(DBC B\.4\.2\.2 ¶6, ground floor counted\)$/.exec(t);
    if (!m) return null;
    return {
      en: `${m[1]} floors stated × ${m[2]} m a floor (DBC B.4.2.2, ground floor counted)`,
      ar: `${m[1]} دور محدد × ${m[2]} م للدور (كود دبي B.4.2.2، مع احتساب الدور الأرضي)`,
    };
  },
  starts('the general coverage rule', {
    en: 'The general coverage limit does not apply to a podium on the boundary; this plot’s sheet states none.',
    ar: 'حد التغطية العام لا يطبق على بوديوم على حدود القطعة، ومخطط القطعة لا يحدد تغطية.',
  }),
  (t) => (t === 'centred over the parking island, in the plate\'s own proportions' ? { en: 'centred over the parking island', ar: 'في وسط جزيرة المواقف' } : null),
  (t) => (t === 'centred on the podium' ? { en: 'centred on the podium', ar: 'في وسط البوديوم' } : null),
  starts('The core area fixes how much plate the core takes', {
    en: 'The core’s area is computed; its position is drawn centred, moved toward the parking island where needed. Where it really goes is a design decision.',
    ar: 'مساحة النواة محسوبة، وموضعها مرسوم في الوسط ويزاح نحو جزيرة المواقف عند الحاجة. موضعها الفعلي قرار تصميمي.',
  }),
  (t) => {
    if (!t.startsWith('An indicative core for a residential tower')) return null;
    const m = /two stairs of ([\d.]+ × [\d.]+) m.*?lift shafts of ([\d.]+ × [\d.]+) m/.exec(t);
    return {
      en: `Indicative core: two stairs${m ? ` ${m[1]} m` : ''}, lifts${m ? ` ${m[2]} m` : ''} and a lift lobby. Not an egress or fire design.`,
      ar: `نواة استرشادية: درجان${m ? ` ${m[1]} م` : ''} ومصاعد${m ? ` ${m[2]} م` : ''} وبهو مصاعد. ليست تصميما للهروب أو الحريق.`,
    };
  },
  starts('A straight two-way ramp', {
    en: 'Straight two-way ramp. The alternatives take the same area and are listed beside it.',
    ar: 'رامب مستقيم ثنائي الاتجاه. البدائل تأخذ المساحة نفسها ومعروضة بجانبه.',
  }),
  starts('The tower plate cap fixes the plate', {
    en: 'The tower’s area is computed; it is drawn centred on the podium. Where it really stands is a design decision.',
    ar: 'مساحة البرج محسوبة، ويرسم في وسط البوديوم. موضعه الفعلي قرار تصميمي.',
  }),
  (t) => {
    if (!t.startsWith('Nobody stated how many transformers')) return null;
    const m = /(\d+) transformer is assumed .*?substation area is (\d+) m²/.exec(t);
    return {
      en: `Transformers assumed at ${m?.[1] ?? '1'}, so the substation is ${m?.[2] ?? '33'} m² (DEWA §11.4.1). Enter the count to replace it.`,
      ar: `عدد المحولات مفترض ${m?.[1] ?? '1'}، فغرفة المحولات ${m?.[2] ?? '33'} م² (DEWA §11.4.1). أدخل العدد لاستبداله.`,
    };
  },
  (t) => {
    const parts = t.split(', ');
    if (parts.length < 2 || !parts.every((p) => p in ROOM)) return null;
    return { en: t, ar: parts.map((p) => ROOM[p]).join('، ') };
  },
  (t) => {
    if (!t.startsWith('An indicative ground floor for a residential tower')) return null;
    const m = /sizes at (\d+) m², drawn ([\d.]+ × [\d.]+) m, against boundary (\d+)/.exec(t);
    return {
      en:
        'Indicative ground floor in the strip reserved for plant. The substation follows DEWA §11.4.1 and faces a road (§11.3.1), with the LV room beside it; the other rooms are typical sizes.' +
        (m ? ` Substation ${m[1]} m² (${m[2]} m) on boundary ${m[3]}.` : ''),
      ar:
        'دور أرضي استرشادي في الشريط المحجوز للمعدات. غرفة المحولات حسب DEWA §11.4.1 وتطل على طريق (§11.3.1)، وبجانبها غرفة الجهد المنخفض؛ وباقي الغرف بمقاسات معتادة.' +
        (m ? ` غرفة المحولات ${m[1]} م² (${m[2]} م) على الحد ${m[3]}.` : ''),
    };
  },
  (t) => {
    const m = /^The core is ([\d.]+)% of the tower plate, and the saleable figure this run was given leaves ([\d.]+)% of the gross/.exec(t);
    if (!m) return null;
    return /exceeds it/.test(t)
      ? {
          en: `The core is ${m[1]}% of the plate, more than the ${m[2]}% the saleable share leaves for everything unsold. One of the two figures needs revising.`,
          ar: `النواة ${m[1]}% من المسطح، أكبر من ${m[2]}% التي تتركها نسبة البيع لكل ما لا يباع. أحد الرقمين يحتاج مراجعة.`,
        }
      : {
          en: `The core is ${m[1]}% of the plate, within the ${m[2]}% the saleable share leaves for everything unsold.`,
          ar: `النواة ${m[1]}% من المسطح، ضمن ${m[2]}% التي تتركها نسبة البيع لكل ما لا يباع.`,
        };
  },
  (t) => {
    const m = /^A parking level of ([\d,.]+) m² deducts ([\d,.]+) m² for cores.*?the core is ([\d,.]+) m² of that/.exec(t);
    if (!m) return null;
    return /exceeds the deduction/.test(t)
      ? {
          en: `Each parking level of ${m[1]} m² sets aside ${m[2]} m² for cores and plant; the core alone is ${m[3]} m², more than that. Raise the deduction or reduce the core.`,
          ar: `كل دور مواقف ${m[1]} م² يخصم ${m[2]} م² للنوى والمعدات، والنواة وحدها ${m[3]} م² أكبر من ذلك. ارفع الخصم أو قلل النواة.`,
        }
      : {
          en: `Each parking level of ${m[1]} m² sets aside ${m[2]} m² for cores and plant, ${m[3]} m² of it the core.`,
          ar: `كل دور مواقف ${m[1]} م² يخصم ${m[2]} م² للنوى والمعدات، منها ${m[3]} م² للنواة.`,
        };
  },

  /* ── Drawings ─────────────────────────────────────────────── */
  starts('Columns, and therefore no grid bubbles', {
    en: 'No columns or grid lines are drawn; a position is given by bay number and dimensions.',
    ar: 'لا ترسم أعمدة ولا محاور؛ يحدد الموضع برقم الموقف والأبعاد.',
  }),
  starts('Stairs and lifts as rooms, and plant', {
    en: 'Stairs, lifts and plant: their area on each level is reserved, not their positions.',
    ar: 'السلالم والمصاعد والمعدات: تحجز مساحتها في كل دور لا مواضعها.',
  }),
  starts('The band beside each boundary ranks', {
    en: 'The band beside each boundary shows the road’s rank on the sheet, not its width.',
    ar: 'الشريط بجانب كل حد يبين رتبة الطريق في المخطط، لا عرضه.',
  }),
  (t) => {
    const m = /^Parking levels: (\d+) in the podium from the ground up(?:, (\d+) below grade)?\.$/.exec(t);
    if (!m) return null;
    return {
      en: `Parking levels: ${m[1]} from the ground up${m[2] ? `, ${m[2]} below ground` : ''}.`,
      ar: `أدوار المواقف: ${m[1]} من الأرضي صعودا${m[2] ? `، و${m[2]} تحت الأرض` : ''}.`,
    };
  },
  (t) => {
    const m = /^Parking levels: (\d+) in the podium above a ground floor that does not park(?:, (\d+) below grade)?\.$/.exec(t);
    if (!m) return null;
    return {
      en: `Parking levels: ${m[1]} in the podium above a ground floor without parking${m[2] ? `, ${m[2]} below ground` : ''}.`,
      ar: `أدوار المواقف: ${m[1]} في البوديوم فوق دور أرضي بلا مواقف${m[2] ? `، و${m[2]} تحت الأرض` : ''}.`,
    };
  },
  starts('The ramp from the street down to the first basement.', {
    en: 'The ramp from the street down to the first basement is not modelled: only ramps between two parking levels are.',
    ar: 'المنحدر (الرامب) من الشارع نزولا إلى البدروم الأول غير ممثل: تمثل فقط المنحدرات بين دوري مواقف.',
  }),
  starts('The substation and the LV room. The ground floor does not park', {
    en: 'The substation and the LV room are not placed: the ground floor does not park, and the band on the road is cut only from a parking ground floor. Not assessed.',
    ar: 'غرفة المحول وغرفة الجهد المنخفض غير موضوعة: الدور الأرضي بلا مواقف، وشريط الطريق يقتطع فقط من دور أرضي للمواقف. لم يخضع للتقييم.',
  }),
  starts('The ramp from the street up to the first podium parking level (P1).', {
    en: 'The ramp from the street up to P1 is not modelled: the ground floor does not park, and only ramps between two parking levels are.',
    ar: 'المنحدر (الرامب) من الشارع صعودا إلى P1 غير ممثل: الدور الأرضي بلا مواقف، وتمثل فقط المنحدرات بين دوري مواقف.',
  }),
  starts('Tower: area from the plate cap; drawn centred on the podium.', {
    en: 'Tower: area from the plate cap, drawn centred on the podium.',
    ar: 'البرج: المساحة من حد المسطح، مرسوم في وسط البوديوم.',
  }),
  starts('Podium: area from the coverage cap; drawn centred in the setback line.', {
    en: 'Podium: area from the coverage cap, drawn centred in the setback line.',
    ar: 'البوديوم: المساحة من حد التغطية، مرسوم في وسط خط الارتداد.',
  }),
  (t) => {
    // The ground floor first where it does not park and podium parking stands over it.
    // A one-level answer is the ground floor alone, and says so without "the lowest 0".
    const g = /^The answer places (\d+) levels? of floor area, drawn as the ground floor(?: and the lowest (\d+) above the podium parking)?\./.exec(t);
    if (!g) return null;
    const free = /The (\d+) above (?:it is|them are) what the height ceiling permits/.exec(t)?.[1];
    const over = /(\d+) of the answer's levels (?:does|do) not fit under the height ceiling above (\d+) level/.exec(t);
    return {
      en:
        `The study places ${g[1]} levels of floor area, drawn as the ground floor` +
        (g[2] ? ` and the lowest ${g[2]} above the podium parking.` : '.') +
        (free ? ` ${free} more fit under the height ceiling and are unused.` : '') +
        (over ? ` ${over[1]} do not fit under the ceiling above ${over[2]} parking level(s) and are not drawn.` : ''),
      ar:
        `تضع الدراسة ${g[1]} دورا من المساحة الطابقية، يرسم منها الدور الأرضي` +
        (g[2] ? ` و${g[2]} فوق مواقف البوديوم.` : '.') +
        (free ? ` و${free} أخرى يسمح بها حد الارتفاع ولا تستخدم.` : '') +
        (over ? ` و${over[1]} لا يتسع تحت حد الارتفاع فوق ${over[2]} دور مواقف فلا يرسم.` : ''),
    };
  },
  (t) => {
    const m = /^The answer places (\d+) levels? of floor area(?:, drawn as the lowest (\d+) above (the podium parking|the ground))?\./.exec(t);
    if (!m) return null;
    const free = /The (\d+) above (?:it is|them are) what the height ceiling permits/.exec(t)?.[1];
    const over = /(\d+) of the answer's levels (?:does|do) not fit under the height ceiling above (\d+) level/.exec(t);
    const above = m[3] === 'the ground' ? { en: 'the ground', ar: 'الأرض' } : { en: 'the podium parking', ar: 'مواقف البوديوم' };
    return {
      en:
        `The study places ${m[1]} levels of floor area${m[2] ? `, drawn as the lowest ${m[2]} above ${above.en}` : ''}.` +
        (free ? ` ${free} more fit under the height ceiling and are unused.` : '') +
        (over ? ` ${over[1]} do not fit under the ceiling above ${over[2]} parking level(s) and are not drawn.` : ''),
      ar:
        `تضع الدراسة ${m[1]} دورا من المساحة الطابقية${m[2] ? `، يرسم منها ${m[2]} فوق ${above.ar}` : ''}.` +
        (free ? ` و${free} أخرى يسمح بها حد الارتفاع ولا تستخدم.` : '') +
        (over ? ` و${over[1]} لا يتسع تحت حد الارتفاع فوق ${over[2]} دور مواقف فلا يرسم.` : ''),
    };
  },
  (t) => {
    const m = /^Section ([A-Z])-\1: (.+)$/.exec(t);
    if (!m) return null;
    const body = m[2] ?? '';
    if (body.startsWith('Along the ramp')) {
      return { en: `Section ${m[1]}-${m[1]}: along the ramp.`, ar: `القطاع ${m[1]}-${m[1]}: بطول الرامب.` };
    }
    const p = /parallel to boundary (\d+)/.exec(body);
    return p
      ? { en: `Section ${m[1]}-${m[1]}: through the podium, parallel to boundary ${p[1]}.`, ar: `القطاع ${m[1]}-${m[1]}: عبر البوديوم، موازيا للحد ${p[1]}.` }
      : null;
  },

  /* ── Checks ───────────────────────────────────────────────── */
  (t) => {
    const id = STATEMENT_TO_ID.get(t);
    return id ? (INVARIANT[id] ?? null) : null;
  },
  (t) => (t in STATUS ? (STATUS[t] ?? null) : null),
  (t) => {
    const m = /^(.+?) read a per-level schedule\. Phase 0 generates no configuration/.exec(t);
    if (!m) return null;
    return {
      en: `${m[1]} need a per-level schedule this phase does not make, so they did not run — and are not counted as passes.`,
      ar: `${(m[1] ?? '').replace(/ and /g, ' و')} تحتاج جدولا لكل دور لا تنتجه هذه المرحلة، فلم تشغل ولا تحسب نجاحا.`,
    };
  },
  (t) => {
    const m = /^PASS\. The configuration satisfies every constraint we encoded, and its arithmetic closes \((\d+) hard constraint\(s\) checked, (\d+) violated; (\d+) invariant\(s\) run, (\d+) failed\)/.exec(t);
    if (!m) return null;
    return {
      en: `Pass: every encoded limit holds and the arithmetic closes (${m[1]} limits checked, ${m[2]} exceeded; ${m[3]} checks run, ${m[4]} failed). Self-consistency, not compliance.`,
      ar: `ناجح: كل الحدود المرمزة مستوفاة والحساب متسق (${m[1]} حدا فحص، ${m[2]} تجاوز؛ ${m[3]} فحصا شغل، ${m[4]} فشل). اتساق ذاتي لا امتثال.`,
    };
  },
  (t) => {
    const m = /^FAIL\. (.+?) \((\d+) hard constraint/.exec(t);
    if (!m) return null;
    return { en: `Fail: ${m[1]}. The study cannot be issued.`, ar: `لم ينجح: ${m[1]}. لا يمكن إصدار الدراسة.` };
  },
  (t) => {
    const m = /^PARTIAL\. We encoded (\d+) of (\d+) requirements identified as applicable \(coverage ([\d.]+%)\)\. (\d+) are deferred/.exec(t);
    if (!m) return null;
    return {
      en: `Partial: ${m[1]} of ${m[2]} identified requirements are encoded (${m[3]}); ${m[4]} are deferred. Measured against our own list, not completeness.`,
      ar: `جزئي: رمز ${m[1]} من ${m[2]} متطلبا محددا (${m[3]})، و${m[4]} مؤجلة. مقيس على قائمتنا لا على الاكتمال.`,
    };
  },
  (t) => {
    const m = /^PASS\. Geometry is topologically valid; (\d+) area\(s\) were independently recomputed and agree/.exec(t);
    if (!m) return null;
    return {
      en: `Pass: the geometry is valid and ${m[1]} areas were recomputed independently and agree exactly.`,
      ar: `ناجح: الشكل الهندسي سليم، وأعيد حساب ${m[1]} مساحات بشكل مستقل وتطابقت تماما.`,
    };
  },
  starts('NOT ASSESSED. No geometry was produced', { en: 'Not assessed: no geometry was produced.', ar: 'لم يقيم: لم ينتج شكل هندسي.' }),
  starts('DBC Part B states no turning radius for a car on a parking aisle.', {
    en: 'The code states no turning radius for a parking aisle, so Table B.9’s curved-ramp minimum — inner radius 4 m, lane 3.5 m — is taken for every turn, one car at a time.',
    ar: 'لا يحدد الكود نصف قطر دوران في ممرات المواقف، فاعتمد الحد الأدنى للمنحدر المنحني في الجدول B.9: نصف قطر داخلي 4 m وحارة 3.5 m لكل منعطف، لسيارة واحدة في كل مرة.',
  }),
  /* ── The bays a car park sets aside ───────────────────────── */
  starts('DBC Table C.17 gives 2% of a car park of 25 to 500 spaces', {
    en: 'The code gives 2% of a car park of 25 to 500 bays, at least one, and 1% above 500, and states no rounding. Each gap is read on the side that provides more: fractions round up, the first 500 count as 10, and a car park under 25 gets one.',
    ar: 'يحدد الكود 2% من مواقف السيارات بين 25 و500 موقف، وموقفا واحدا على الأقل، و1% لما يزيد عن 500، ولا يحدد التقريب. فتقرأ كل فجوة على الجانب الذي يوفر أكثر: الكسر يقرب للأعلى، وأول 500 تحسب 10، وما دون 25 يحصل على موقف واحد.',
  }),
  starts('DBC B.7.2.6.2 gives 5% of the bays the building requires', {
    en: 'The code gives 5% of the bays the building requires where it has more than 20, and states no rounding, so a fraction rounds up.',
    ar: 'يحدد الكود 5% من المواقف المطلوبة للمبنى إذا زادت عن 20، ولا يحدد التقريب، فيقرب الكسر للأعلى.',
  }),
  starts('The accessible route from each access aisle to the core', {
    en: 'The accessible route from each access aisle to the core and the sign are not drawn, and walking distance is not assessed: only the straight line to the core is measured.',
    ar: 'لا يرسم المسار الميسر من كل ممر وصول إلى النواة ولا اللافتة، ولا تقيم مسافة المشي: تقاس المسافة المستقيمة إلى النواة فقط.',
  }),
  (t) => {
    const m = /^None of the (\d+) accessible bays Table C\.17 asks for is placed: the (ground floor|first basement|first podium parking level) is the sloped ring, whose floor falls ([\d.]+)%, and DBC B\.7\.2\.3\.1 limits accessible parking to ([\d.]+)%\./.exec(t);
    if (!m) return null;
    const level = ENTRY_LEVEL[m[2] ?? ''] ?? { en: m[2] ?? '', ar: m[2] ?? '' };
    return {
      en: `None of the ${m[1]} accessible bays required is placed: ${level.en} is the sloped ring at ${m[3]}%, and the code limits accessible parking to ${m[4]}%. Every parking level shares that layout. The arrangement was not changed for them; you may pick one with a flat floor.`,
      ar: `لم يوزع أي من ${m[1]} موقفا مطلوبا لأصحاب الهمم: ${level.ar} هو الممر الدائري المائل بميل ${m[3]}%، والكود يحد ميل مواقف أصحاب الهمم بـ ${m[4]}%. كل أدوار المواقف بنفس التوزيع. لم يغير التوزيع من أجلها، ويمكنك اختيار توزيع بأرضية مستوية.`,
    };
  },
  (t) => {
    const m = /^(\d+) of the (\d+) accessible bays Table C\.17 asks for could not be placed on the (ground floor|first basement|first podium parking level):/.exec(t);
    if (!m) return null;
    const level = ENTRY_LEVEL[m[3] ?? ''] ?? { en: 'the first basement', ar: 'البدروم الأول' };
    return {
      en: `${m[1]} of the ${m[2]} accessible bays required could not be placed on ${level.en}: no further run of bays side by side can take one with its access aisle.`,
      ar: `تعذر توزيع ${m[1]} من ${m[2]} موقفا مطلوبا لأصحاب الهمم في ${level.ar}: لا توجد مواقف متجاورة أخرى تتسع لموقف مع ممر الوصول بجانبه.`,
    };
  },
  starts('No van bay was placed:', {
    en: 'No van bay was placed: once widened, the bay would leave less than the 1.2 m access aisle beside it.',
    ar: 'لم يوزع موقف لشاحنة صغيرة: بعد توسيعه لا يبقى بجانبه ممر وصول بعرض 1.2 m.',
  }),
  (t) => {
    const m = /^The farthest accessible bay is ([\d.]+) m from the core in a straight line, beyond the 50 m/.exec(t);
    if (!m) return null;
    return {
      en: `The farthest accessible bay is ${m[1]} m from the core in a straight line, beyond the 50 m allowed from the building entrance.`,
      ar: `أبعد موقف لأصحاب الهمم على ${m[1]} m من النواة في خط مستقيم، أبعد من 50 m المسموح بها من مدخل المبنى.`,
    };
  },
  (t) => {
    const m = /^(\d+) of the (\d+) preferred bays B\.7\.2\.6\.2 asks for could not be marked:/.exec(t);
    if (!m) return null;
    return {
      en: `${m[1]} of the ${m[2]} preferred bays required could not be marked: the level the street reaches has no further bay.`,
      ar: `تعذر تحديد ${m[1]} من ${m[2]} موقفا مفضلا مطلوبا: لا يبقى موقف آخر في الدور الذي يصله الشارع.`,
    };
  },
  starts('NOT YET MEASURED.', {
    en: 'Not yet measured: no comparison with architects has been made, so no accuracy figure is given.',
    ar: 'لم يقس بعد: لم تجر مقارنة مع معماريين، فلا يذكر رقم للدقة.',
  }),
  starts('NOT ASSESSED. This system does not and cannot determine whether an authority would approve', {
    en: 'Not assessed: this system does not say whether an authority would approve the scheme.',
    ar: 'لم يقيم: لا يحدد هذا النظام إن كانت الجهة المختصة ستعتمد المشروع.',
  }),
  starts('Agreement between the validator and the generator is self-consistency', {
    en: 'The checker agreeing with the engine is self-consistency, not compliance with Dubai regulation.',
    ar: 'توافق المدقق مع المحرك اتساق ذاتي، لا امتثال للوائح دبي.',
  }),
  starts('THE HONEST LIMIT OF INDEPENDENCE', {
    en: 'The checker reads the same encoded rules as the engine: it catches calculation errors, not a rule encoded wrongly or missing.',
    ar: 'المدقق يقرأ القواعد المرمزة نفسها التي يقرؤها المحرك: يكشف أخطاء الحساب، لا قاعدة مرمزة خطأ أو ناقصة.',
  }),

  /* ── A binding constraint's label, alone or joined by "and" ── */
  (t) => {
    const parts = t.split(' and ');
    const said = parts.map((p) => BINDING[p]);
    if (!said.every((s): s is Said => s !== undefined)) return null;
    return { en: said.map((s) => s.en).join(' and '), ar: said.map((s) => s.ar).join(' و') };
  },

  /* ── The offset kernel: two boundaries at a corner, set back differently ── */
  (t) => {
    const m =
      /^Two boundaries meet at a turn of ([\d.]+)° but are set back by different distances: the ([\d.]+) m boundary by ([\d.]+) m and the ([\d.]+) m boundary by ([\d.]+) m\. Their setback lines (?:meet ([\d.]+) m away|never meet), so there is no corner to draw where the two meet\./.exec(
        t,
      );
    if (!m) return null;
    const meet = m[6] === undefined ? { en: 'never meet', ar: 'لا يلتقيان' } : { en: `meet ${m[6]} m away`, ar: `يلتقيان على بعد ${m[6]} م` };
    return {
      en:
        `Two boundaries meet at a turn of ${m[1]}° but have different setbacks: the ${m[2]} m boundary ${m[3]} m, ` +
        `the ${m[4]} m boundary ${m[5]} m. Their setback lines ${meet.en}, so no corner can be drawn there. ` +
        `If the two are one side of the plot, give both the same setback.`,
      ar:
        `حدان يلتقيان بانعطاف ${m[1]}° وارتداداهما مختلفان: الحد بطول ${m[2]} م ارتداده ${m[3]} م، ` +
        `والحد بطول ${m[4]} م ارتداده ${m[5]} م. خطا الارتداد ${meet.ar}، فلا توجد زاوية ترسم عند التقائهما. ` +
        `إن كان الحدان جهة واحدة من قطعة الأرض فأعطهما الارتداد نفسه.`,
    };
  },
];
