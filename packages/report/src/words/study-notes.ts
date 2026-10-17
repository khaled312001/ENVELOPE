import type { Reader, Said } from './engine-notes.js';

/*
  THE SENTENCES THE STUDY REPORT READS THAT THE SCREEN HAD NOT YET NEEDED.

  The report (16 Oct 2026: «حسب اللغة الحالية») is issued in the reader's language,
  and a run's report carries engine text the steps never showed: the capacity
  bands' questions, each assumption's measured sensitivity, the claim statement's
  fixed lines, the disclaimer, the deferred checks and what the model does not
  contain. Each is recognised by its fixed wording, its figures lifted from the
  engine's own text, and said briefly in both languages — as `engine-run-notes.ts`
  does for the screen, which reads these too.
*/

const exact =
  (map: Readonly<Record<string, Said>>): Reader =>
  (t) =>
    map[t] ?? null;

/** Band labels, questions and the names of their inputs, as `apps/api/src/report.ts` writes them. */
const BANDS: Readonly<Record<string, Said>> = {
  regulatory: { en: 'Regulatory', ar: 'تنظيمي' },
  geometric: { en: 'Geometric', ar: 'هندسي' },
  parking: { en: 'Parking', ar: 'المواقف' },
  'What do FAR and the area caps permit?': {
    en: 'What FAR and the area caps permit.',
    ar: 'ما يسمح به معامل البناء وحدود المساحة.',
  },
  'What does the envelope physically hold within height and footprint limits?': {
    en: 'What the envelope holds within the height and footprint limits.',
    ar: 'ما يستوعبه الغلاف البنائي ضمن حدود الارتفاع ومسطح البناء.',
  },
  'What can the achievable parking supply support?': {
    en: 'What the parking that can be laid out supports.',
    ar: 'ما تدعمه المواقف التي يمكن توزيعها فعلا.',
  },
  'permitted FAR': { en: 'Permitted FAR', ar: 'معامل البناء المسموح' },
  'levels by height': { en: 'Levels the height permits', ar: 'الأدوار التي يسمح بها الارتفاع' },
  'bays the levels supply': { en: 'Bays the levels supply', ar: 'المواقف التي توفرها الأدوار' },
  'units parking supports': { en: 'Units the parking supports', ar: 'الوحدات التي تدعمها المواقف' },
};

/** The envelope's dimensions, by the label the report adapter gives them. */
const DIMENSIONS: Readonly<Record<string, Said>> = {
  'Setback-permitted footprint': { en: 'Footprint within the setbacks', ar: 'مسطح البناء داخل خطوط الارتداد' },
  'Podium footprint': { en: 'Podium footprint', ar: 'مسطح البوديوم' },
  'Tower plate': { en: 'Tower plate', ar: 'مسطح البرج' },
  'Height ceiling': { en: 'Height ceiling', ar: 'سقف الارتفاع' },
  'Levels the height ceiling permits': { en: 'Levels the height ceiling permits', ar: 'الأدوار التي يسمح بها سقف الارتفاع' },
};

/** The claim statement's fixed lines (`CLAIM_STATEMENT_VERBATIM`), the regulatory one included. */
const CLAIM: Readonly<Record<string, Said>> = {
  'The configuration satisfies every constraint we encoded, and its arithmetic closes.': {
    en: 'The configuration satisfies every constraint we encoded, and its arithmetic closes.',
    ar: 'الترتيب يستوفي كل قيد مرمز، وحساباته متسقة.',
  },
  'We encoded N of M requirements identified as applicable. K are deferred and listed below.': {
    en: 'We encoded N of M requirements identified as applicable. K are deferred and listed below.',
    ar: 'رمزنا N من M متطلبا حددت على أنها منطبقة. وأرجئ K منها وهي مذكورة أدناه.',
  },
  'Geometry is topologically valid; areas independently recomputed and agree.': {
    en: 'Geometry is topologically valid; areas independently recomputed and agree.',
    ar: 'الشكل الهندسي سليم، وأعيد حساب المساحات بشكل مستقل فتطابقت.',
  },
  'Where measured against qualified architects on comparable plots, this engine fell within the inter-architect disagreement band in X of Y cases.':
    {
      en: 'Where measured against qualified architects on comparable plots, this engine fell within the inter-architect disagreement band in X of Y cases.',
      ar: 'عند مقارنته بمعماريين مؤهلين على قطع مماثلة، وقع المحرك ضمن نطاق اختلافهم في X من Y حالة.',
    },
  'NOT ASSESSED. This system does not and cannot determine whether an authority would approve this scheme.': {
    en: 'NOT ASSESSED. This system does not and cannot determine whether an authority would approve this scheme.',
    ar: 'لم يخضع للتقييم. هذا النظام لا يحدد ولا يستطيع أن يحدد ما إذا كانت الجهة المختصة ستعتمد هذا المخطط.',
  },
};

const NOT_MODELLED: Readonly<Record<string, Said>> = {
  'Slab thickness. Levels are planes at their floor level. The engine computes no slab depth, and a drawn thickness would be an invented one.':
    { en: 'Slab thickness: not computed, so not drawn.', ar: 'سماكة البلاطات: لا تحسب، فلا ترسم.' },
  'Façades, windows, balconies and units. The engine computes none of them.': {
    en: 'Façades, windows, balconies and units: not computed.',
    ar: 'الواجهات والنوافذ والشرفات والوحدات: لا تحسب.',
  },
  'Neighbouring buildings and the road. The run knows which edges of the plot face a road and which face a neighbour — the site plan writes that on the boundary — but not what stands beyond them, so neither is drawn.':
    {
      en: 'Neighbouring buildings and the road: not drawn; only which boundary faces which is known.',
      ar: 'المباني المجاورة والطريق: لا ترسم؛ المعروف فقط أي حد يطل على طريق وأيه على جار.',
    },
  'Pedestrian entrance, refuse room and escape distances — NOT ASSESSED until their rules are encoded.': {
    en: 'Pedestrian entrance, refuse room and escape distances: not assessed.',
    ar: 'مدخل المشاة وغرفة النفايات ومسافات الهروب: لم تخضع للتقييم.',
  },
};

/** "GARBAGE ROOM: GARBAGE ROOM needs 4.00 m along the strip and 2.00 m of its 13.00 m is left, …" */
const ROOM_AR: Readonly<Record<string, string>> = {
  'GARBAGE ROOM': 'غرفة النفايات',
  'TEL ROOM': 'غرفة الاتصالات',
  'MM ROOM': 'غرفة MM',
  'GENERATOR ROOM': 'غرفة المولد',
  'PUMP ROOM': 'غرفة المضخات',
  'WATER TANK': 'خزان المياه',
  'ENTRANCE LOBBY': 'بهو المدخل',
};

function groundFloorDesign(t: string): Said | null {
  if (!t.startsWith('The ground floor, as a services design.')) return null;
  const left = [...t.matchAll(/([A-Z][A-Z ]+): \1 needs ([\d.]+) m along the strip and ([\d.]+) m of its ([\d.]+) m is left/g)];
  const en = left.map((m) => `${m[1]!.toLowerCase()} not drawn (needs ${m[2]} m, ${m[3]} m left)`);
  const ar = left.map((m) => `${ROOM_AR[m[1]!] ?? m[1]} لم ترسم (تحتاج ${m[2]} م والمتبقي ${m[3]} م)`);
  return {
    en: `Ground-floor rooms are indicative and assumed; none is ventilated or access-checked.${en.length ? ` ${en.join('; ')}.` : ''}`,
    ar: `غرف الدور الأرضي استرشادية ومفترضة، ولم يفحص تهويتها ولا الوصول إليها.${ar.length ? ` ${ar.join('؛ ')}.` : ''}`,
  };
}

/**
 * Every parameter a rule or a named input can carry, by its id — what the study's
 * annex lists rules and inputs under. An id with no name here prints as the id.
 */
const PARAMETERS: Readonly<Record<string, Said>> = {
  'far.max': { en: 'Floor area ratio, maximum', ar: 'معامل البناء، الحد الأقصى' },
  'coverage.max': { en: 'Plot coverage, maximum', ar: 'نسبة التغطية، الحد الأقصى' },
  'tower_plate.max': { en: 'Tower plate, maximum', ar: 'مسطح البرج، الحد الأقصى' },
  'height.max': { en: 'Building height, maximum', ar: 'ارتفاع المبنى، الحد الأقصى' },
  'levels.max_above_ground': { en: 'Floors above ground, maximum', ar: 'الأدوار فوق الأرض، الحد الأقصى' },
  floor_to_floor: { en: 'Floor-to-floor height', ar: 'الارتفاع من دور إلى دور' },
  'setback.road': { en: 'Setback from a road', ar: 'الارتداد عن الطريق' },
  'setback.adjacent_plot': { en: 'Setback from a neighbouring plot', ar: 'الارتداد عن القطعة المجاورة' },
  'setback.open_space': { en: 'Setback from open space', ar: 'الارتداد عن المساحة المفتوحة' },
  'setback.other': { en: 'Setback from another boundary', ar: 'الارتداد عن حد آخر' },
  'parking.demand': { en: 'Parking demand', ar: 'المواقف المطلوبة' },
  'parking.visitor_fraction': { en: 'Visitor parking share', ar: 'نسبة مواقف الزوار' },
  'parking.levels_available': { en: 'Parking levels available', ar: 'أدوار المواقف المتاحة' },
  'parking.usable_fraction': { en: 'Usable share of a parking level', ar: 'النسبة القابلة للاستخدام من دور المواقف' },
  'parking.unit_mix': { en: 'Unit mix', ar: 'توزيع الوحدات' },
  'capacity.saleable_efficiency': { en: 'Saleable share of floor area', ar: 'نسبة المساحة القابلة للبيع' },
  'capacity.user_realism_discount': { en: 'Realism discount', ar: 'خصم الواقعية' },
  'definitions.parking_in_far': { en: 'Parking in FAR', ar: 'المواقف في معامل البناء' },
  'egress.travel_distance.max': { en: 'Escape travel distance, maximum', ar: 'مسافة الهروب، الحد الأقصى' },
  'plant.substation.edge_class': { en: 'Substation: boundary it faces', ar: 'المحطة الفرعية: الحد الذي تواجهه' },
  'plant.substation.min_width_m': { en: 'Substation: minimum width', ar: 'المحطة الفرعية: أقل عرض' },
  'plant.substation.clear_height_m': { en: 'Substation: clear height', ar: 'المحطة الفرعية: الارتفاع الصافي' },
  'plant.substation.ventilated_sides': { en: 'Substation: ventilated sides', ar: 'المحطة الفرعية: الجوانب المهواة' },
  'plant.substation.basement_index': { en: 'Substation: basement level', ar: 'المحطة الفرعية: دور البدروم' },
  'plant.lv_room.adjacency': { en: 'Low-voltage room: beside the substation', ar: 'غرفة الجهد المنخفض: بجوار المحطة الفرعية' },
};

/** Why a rule was considered and not applied, as `apps/api/src/report.ts` (`reasonFor`) writes it. */
function ruleReason(t: string): Said | null {
  if (t.startsWith('Its applicability predicate did not match this plot')) {
    return {
      en: 'Does not apply to this plot: a different land use, community or boundary kind.',
      ar: 'لا تنطبق على هذه القطعة: استخدام أرض أو منطقة أو نوع حد مختلف.',
    };
  }
  const s = /^Considered for (\S+) and superseded by (\S+) under the §11\.5 precedence order\./.exec(t);
  if (s) {
    return {
      en: `Superseded by ${s[2]}, which takes precedence (§11.5).`,
      ar: `حلت محلها القاعدة ${s[2]} لأنها مقدمة عليها (§11.5).`,
    };
  }
  if (t.startsWith('Applicable and not assessed.')) {
    return t.includes('can only reject a candidate')
      ? {
          en: 'Applies, and not assessed: it can only reject a design, and this phase generates none to reject.',
          ar: 'تنطبق ولم تخضع للتقييم: يمكنها فقط رفض تصميم، وهذه المرحلة لا تولد تصميما ترفضه.',
        }
      : { en: 'Applies, and not assessed: it cannot be checked at this level of detail.', ar: 'تنطبق ولم تخضع للتقييم: لا يمكن فحصها بهذا المستوى من التفصيل.' };
  }
  return null;
}

export const STUDY_READERS: readonly Reader[] = [
  exact(PARAMETERS),
  ruleReason,
  exact(BANDS),
  exact(DIMENSIONS),
  exact(CLAIM),
  exact(NOT_MODELLED),
  groundFloorDesign,
  (t) => {
    const m = /^(±[\d.]+%) moves the governing capacity between ([\d.,]+) m² and ([\d.,]+) m² — a spread of ([\d.]+)% of the reported figure\.$/.exec(t);
    return m
      ? {
          en: `${m[1]}: governing capacity ${m[2]}–${m[3]} m² (${m[4]}%).`,
          ar: `${m[1]}: السعة الحاكمة بين ${m[2]} و${m[3]} م² (${m[4]}%).`,
        }
      : null;
  },
  (t) =>
    t.startsWith('Sensitivity was not measured for this assumption')
      ? { en: 'Effect not measured.', ar: 'لم يقس أثرها.' }
      : null,
  exact({
    'the usable fraction of a parking level after cores, ramps and plant': {
      en: 'The usable share of a parking level after cores, ramps and plant.',
      ar: 'النسبة القابلة للاستخدام من دور المواقف بعد النوى والمنحدرات والمعدات.',
    },
    "centred on the tower plate, in the plate's own proportions": {
      en: "Centred on the tower plate, in the plate's proportions",
      ar: 'في وسط مسطح البرج وبنفس نسبه',
    },
    'not measured': { en: 'not measured', ar: 'لم يقس' },
    '±10%': { en: '±10%', ar: '±10%' },
  }),
  (t) => {
    const m = /^Parking does not fit: (\d+) level\(s\) are needed and (\d+) are available\. Either the podium footprint grows, a basement level is added, or the unit count falls to (\d+)\.$/.exec(t);
    return m
      ? {
          en: `Parking does not fit: ${m[1]} levels are needed and ${m[2]} are available. The footprint must grow, a basement be added, or the units fall to ${m[3]}.`,
          ar: `المواقف لا تكفي: المطلوب ${m[1]} أدوار والمتاح ${m[2]}. إما أن يكبر مسطح البناء، أو يضاف قبو، أو تنخفض الوحدات إلى ${m[3]}.`,
        }
      : null;
  },
  (t) =>
    t.startsWith('PLACEHOLDER — NOT REVIEWED BY COUNSEL.')
      ? {
          en: 'This is a development-capacity study produced by software. It is not a planning submission, not a compliance determination and not a substitute for a licensed professional. This wording has not yet been reviewed by UAE counsel.',
          ar: 'هذه دراسة سعة تطويرية أنتجها برنامج. ليست طلب ترخيص، ولا حكما بالمطابقة، ولا بديلا عن مهني مرخص. ولم تراجع هذه الصياغة بعد من مستشار قانوني في الإمارات.',
        }
      : null,
  (t) =>
    t.startsWith('rule class DEFERRED')
      ? { en: 'Applicable, and not checkable at this stage.', ar: 'منطبقة، ولا يمكن فحصها في هذه المرحلة.' }
      : null,
  (t) =>
    t.startsWith('rule class EVALUATIVE_ONLY')
      ? {
          en: 'Can only be checked against a floor plan, which this stage does not produce.',
          ar: 'لا تفحص إلا على مسقط تفصيلي، وهذه المرحلة لا تنتجه.',
        }
      : null,
  exact({
    'facade.fire_performance': { en: 'Façade fire performance', ar: 'أداء الواجهة في الحريق' },
    'egress.travel_distance.max [LIFE SAFETY]': {
      en: 'Escape travel distance (life safety)',
      ar: 'مسافة الهروب (سلامة الأرواح)',
    },
  }),
  (t) =>
    t.startsWith('One allowance, not two.')
      ? {
          en: 'One allowance: the instrument states a single gross floor area, and no commercial area is placed.',
          ar: 'مساحة مسموحة واحدة: الوثيقة تحدد مساحة طابقية إجمالية واحدة، ولا توضع مساحة تجارية.',
        }
      : null,
  (t) =>
    t.startsWith('The ground floor is a parking level, so this proposal counts no floor area on it.')
      ? {
          en: 'The ground floor is parking, so no floor area is counted on it; the lobby and core there would count in a built scheme (not assessed).',
          ar: 'الدور الأرضي مواقف فلا تحسب عليه مساحة طابقية؛ والبهو والنواة فيه تحسب في المبنى المنفذ (لم يخضع للتقييم).',
        }
      : null,
  (t) =>
    t.startsWith('The podium levels are counted at the tower plate')
      ? {
          en: 'Podium levels are counted at the tower plate, the figure the capacity was computed from; the model has no level-by-level plate.',
          ar: 'تحسب أدوار البوديوم بمسطح البرج، وهو ما حسبت منه السعة؛ والنموذج لا يحدد مسطحا لكل دور.',
        }
      : null,
  (t) =>
    t.startsWith('Roof level. A stair head, a lift motor room and a tank room stand above the top floor')
      ? {
          en: 'Roof level: stair head, lift motor room and tank room are not modelled, so no area is counted. Not assessed.',
          ar: 'دور السطح: بيت الدرج وغرفة محركات المصاعد وغرفة الخزانات غير ممثلة، فلا تحسب لها مساحة. لم يخضع للتقييم.',
        }
      : null,
  (t) => {
    const m = /^The sloped ring is drawn level in 3D and in section\. On plan the ring aisle and the bays on it climb one storey over each ([\d.]+) m lap/.exec(t);
    return m
      ? {
          en: `The sloped ring climbs one storey over each ${m[1]} m lap; the 3D view and the sections draw each level flat.`,
          ar: `الممر الدائري المائل يصعد دورا كل ${m[1]} م؛ والمجسم والمقاطع ترسم كل دور مستويا.`,
        }
      : null;
  },
  (t) =>
    t.startsWith('The core, as a design.')
      ? {
          en: 'The core: only its area is computed. Stairs, lifts and lobby inside it are indicative and assumed; egress and fire-fighting are not assessed.',
          ar: 'النواة: تحسب مساحتها فقط. الدرج والمصاعد والبهو داخلها استرشادية ومفترضة؛ والهروب ومكافحة الحريق لم يخضعا للتقييم.',
        }
      : null,
  (t) =>
    t.startsWith('The level schedule states the ground floor does not park.')
      ? {
          en: 'The ground floor is stated as not parking. What it holds — shops, lobby, plant — is not modelled, and how much of it is GFA, and under which allowance, is not assessed.',
          ar: 'الدور الأرضي محدد بلا مواقف. ما فيه من محلات وبهو وخدمات غير ممثل، ولم يقيم كم منه مساحة طابقية ولا تحت أي مساحة مسموحة يحسب.',
        }
      : null,
];
