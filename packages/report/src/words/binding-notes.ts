import type { Reader, Said } from './engine-notes.js';

/*
  WHAT THE SHEET NOW BINDS, AND WHAT IT STILL DOES NOT, IN THE READER'S LANGUAGE
  (17 Oct 2026).

  The binder learned four things that day: a printed GFA governs and the printed
  FAR becomes its cross-check; the DDA's per-side table binds the boundary each
  side is; the sheet's own parking requirement takes precedence over Table B.13
  (DBC B.7.2.6.1); and the seed's placeholder limits are no longer loaded on a
  plot with its own sheet, so a limit the sheet omits refuses the run instead.
  Every sentence that says so reaches a reader — on the plot step, under a
  refusal, in the study's annex — so each is recognised here by its fixed
  wording, its figures lifted from the engine's text and never recomputed.

  The sentences are written in `packages/rules/src/instruments/sheet.ts`,
  `packages/capacity/src/envelope.ts` and `apps/api/src/{instrument,server}.ts`;
  this package may not import any of them, so `apps/api/test/binding-words.test.ts`
  holds them to this file from outside.
*/

const exact =
  (map: Readonly<Record<string, Said>>): Reader =>
  (t) =>
    map[t] ?? null;

const commaAr = (s: string): string => s.replace(/, /g, '، ');

/** The fields the binder reports a limit under, where the name is fixed. */
const FIELDS: Readonly<Record<string, Said>> = {
  far: { en: 'Floor area ratio, as printed', ar: 'معامل البناء كما طبع' },
  'setbacks.by_side': { en: 'Setback table, by numbered side', ar: 'جدول الارتدادات حسب الجانب المرقم' },
  'setbacks.unnamed_sides': { en: 'Boundaries no side of the table names', ar: 'حدود لا يسميها أي جانب في الجدول' },
  'setbacks.rule': { en: 'Setback, stated as a rule', ar: 'الارتداد، مذكور كقاعدة' },
  'parking.dwelling_area': { en: 'Parking: the area the threshold is on', ar: 'المواقف: المساحة التي يقاس عليها الحد' },
  'parking.retail': { en: 'Parking for retail', ar: 'مواقف التجزئة' },
  'parking.commercial': { en: 'Parking for commercial use', ar: 'مواقف الاستعمال التجاري' },
  'parking.office': { en: 'Parking for offices', ar: 'مواقف المكاتب' },
  'parking.unread': { en: 'Parking clause not read into a rule', ar: 'بند مواقف لم يحول إلى قاعدة' },
  'parking.deferred': { en: 'Parking, referred to the DCR', ar: 'المواقف، محالة إلى اشتراطات المطور الرئيسي' },
  'parking.demand': { en: 'Parking demand', ar: 'الطلب على المواقف' },
};

/** A field named for one side of the per-side table. */
const SIDE_FIELDS: Reader = (t) => {
  const m = /^setbacks\.side_(\d+)(?:\.(building|podium))?$/.exec(t);
  if (!m) return null;
  const n = m[1] ?? '';
  if (m[2] === 'building') return { en: `Tower setback, side ${n}`, ar: `ارتداد البرج، الجانب ${n}` };
  if (m[2] === 'podium') return { en: `Podium setback, side ${n}`, ar: `ارتداد البوديوم، الجانب ${n}` };
  return { en: `Setback, side ${n}`, ar: `الارتداد، الجانب ${n}` };
};

/** Why each was not bound, or what was done instead. */
const REASONS: Readonly<Record<string, Said>> = {
  'The sheet prints both its maximum GFA and its FAR, and the GFA governs: the FAR is that GFA divided by the plot area and rounded, so multiplying it back under-reports. The study applies the printed GFA ÷ the printed plot area; the printed FAR agrees with it to its own rounding.':
    {
      en: 'The sheet prints both a maximum GFA and a FAR, and the GFA governs: the FAR is that GFA ÷ the plot area, rounded, so multiplying it back under-reports. The study applies the printed GFA ÷ the printed plot area; the printed FAR agrees with it to its rounding.',
      ar: 'المخطط يطبع أقصى مساحة طابقية ومعامل بناء معا، والمساحة الطابقية هي الحاكمة: المعامل هو تلك المساحة ÷ مساحة القطعة مقربا، فضربه مرة أخرى ينقص النتيجة. الدراسة تطبق المساحة الطابقية المطبوعة ÷ مساحة القطعة المطبوعة، والمعامل المطبوع يوافقها في حدود تقريبه.',
    },
  'The sheet’s FAR and its GFA ÷ plot area disagree by more than the FAR’s rounding. Both are limits printed on the sheet, so the lower one binds. Check the sheet.':
    {
      en: 'The sheet’s FAR and its GFA ÷ plot area differ by more than the FAR’s rounding. Both are printed limits, so the lower one binds. Check the sheet.',
      ar: 'معامل البناء في المخطط يختلف عن مساحته الطابقية ÷ مساحة القطعة بأكثر من تقريب المعامل. كلاهما حد مطبوع، فيلزم الأقل. راجع المخطط.',
    },
  'The sheet prints "SEE NOTES" in this cell instead of a distance, so no setback is read from it. The study’s setback on this boundary comes from the general rules, or from a tower setback typed on the plot step.':
    {
      en: 'The sheet prints "SEE NOTES" here instead of a distance, so no setback is read from it. This boundary’s setback comes from the general rules, or from a tower setback typed on the plot step.',
      ar: 'المخطط يطبع «SEE NOTES» هنا بدل مسافة، فلا يقرأ منه ارتداد. ارتداد هذا الحد يؤخذ من القواعد العامة، أو من ارتداد برج يكتب في خطوة القطعة.',
    },
  'The drawing does not place this side on one surveyed boundary, so its figure is applied to no boundary of this plot. The study’s setback there comes from the general rules, or from a tower setback typed on the plot step.':
    {
      en: 'The drawing does not place this side on one surveyed boundary, so its figure is applied to none. The setback there comes from the general rules, or from a tower setback typed on the plot step.',
      ar: 'الرسم لا يضع هذا الجانب على حد مساحي واحد، فلا يطبق رقمه على أي حد. الارتداد هناك يؤخذ من القواعد العامة، أو من ارتداد برج يكتب في خطوة القطعة.',
    },
  'No side of the sheet’s setback table names these boundaries, so none of its figures is used for them. Their setbacks come from the general rules, or from a tower setback typed on the plot step.':
    {
      en: 'No side of the sheet’s setback table names these boundaries, so none of its figures is used for them. Their setbacks come from the general rules, or from a tower setback typed on the plot step.',
      ar: 'لا يسمي أي جانب في جدول ارتدادات المخطط هذه الحدود، فلا يستخدم أي من أرقامه لها. ارتداداتها تؤخذ من القواعد العامة، أو من ارتداد برج يكتب في خطوة القطعة.',
    },
  'The sheet sets its dwelling threshold on the unit’s area without saying which area: saleable area or the unit’s share of GFA. The study applies the sheet’s rule where both readings give the same number of bays, and stops where they do not.':
    {
      en: 'The sheet sets its dwelling threshold on the unit’s area without saying which: saleable area or the unit’s share of GFA. The study applies the sheet’s rule where both give the same bays, and stops where they do not.',
      ar: 'المخطط يحدد عتبة الوحدة السكنية على مساحتها دون أن يذكر أي مساحة: المساحة القابلة للبيع أم نصيب الوحدة من المساحة الطابقية. الدراسة تطبق قاعدة المخطط حيث تعطي القراءتان عدد المواقف نفسه، وتتوقف حيث تختلفان.',
    },
  'This study models no retail, commercial or office floor area, so the sheet’s rate per area adds no bays. Where the scheme has such space, its bays are not in the demand shown.':
    {
      en: 'This study models no retail, commercial or office area, so the sheet’s rate per area adds no bays. Where the scheme has such space, its bays are not in the demand shown.',
      ar: 'هذه الدراسة لا تنمذج مساحات تجزئة أو تجارية أو مكاتب، فلا يضيف معدل المخطط لكل مساحة أي موقف. إن كان في المشروع مثل هذه المساحات، فمواقفها ليست في الطلب المعروض.',
    },
  'This clause of the sheet’s parking requirement could not be read into a rule, so it adds no bays. Read it on the sheet.':
    {
      en: 'This clause of the sheet’s parking requirement could not be read into a rule, so it adds no bays. Read it on the sheet.',
      ar: 'هذا البند من متطلب المواقف في المخطط لم يمكن تحويله إلى قاعدة، فلا يضيف أي موقف. اقرأه على المخطط.',
    },
  'The sheet refers parking to the master developer’s DCR alongside the Dubai Building Code. B.7.2.6.1 puts a DCR’s parking requirement above Table B.13, and no DCR is on file, so Table B.13 is applied. Where the DCR sets other ratios, the demand shown is not the DCR’s.':
    {
      en: 'The sheet refers parking to the master developer’s DCR alongside the Dubai Building Code. B.7.2.6.1 puts a DCR’s requirement above Table B.13; no DCR is on file, so Table B.13 is applied. Where the DCR sets other ratios, the demand shown is not the DCR’s.',
      ar: 'المخطط يحيل المواقف إلى اشتراطات المطور الرئيسي (DCR) مع كود دبي للبناء. البند B.7.2.6.1 يقدم متطلب الاشتراطات على الجدول B.13، ولا توجد اشتراطات في الملف، فيطبق الجدول B.13. إن كانت الاشتراطات تحدد نسبا أخرى، فالطلب المعروض ليس طلبها.',
    },
  'The sheet states the setback as a rule, a quarter of the building height within a minimum and a maximum, whose input is the storey count. It is not encoded, so it is not applied: the study’s setbacks come from the general rules, or from a tower setback typed on the plot step.':
    {
      en: 'The sheet states the setback as a rule — a quarter of the building height, between a minimum and a maximum — whose input is the storey count. It is not encoded, so it is not applied: the setbacks come from the general rules, or from a tower setback typed on the plot step.',
      ar: 'المخطط يذكر الارتداد كقاعدة: ربع ارتفاع المبنى بين حد أدنى وحد أقصى، ومدخلها عدد الأدوار. لم ترمز بعد، فلا تطبق: الارتدادات تؤخذ من القواعد العامة، أو من ارتداد برج يكتب في خطوة القطعة.',
    },
  'This plot’s boundaries are not the sheet’s surveyed ring, leg for leg by length and bearing, so no side of the table can be placed on one of them. Enter the plot from the sheet’s coordinate table to apply it.':
    {
      en: 'This plot’s boundaries are not the sheet’s surveyed ring, leg for leg by length and bearing, so no side of the table can be placed on one. Enter the plot from the sheet’s coordinate table to apply it.',
      ar: 'حدود هذه القطعة ليست الحدود المساحية في المخطط، ضلعا بضلع في الطول والاتجاه، فلا يوضع أي جانب من الجدول على أي منها. أدخل القطعة من جدول إحداثيات المخطط لتطبيقه.',
    },
  'A placeholder figure no instrument prints. This plot has its own affection plan, so the placeholder is not applied to it: where the sheet states this limit the sheet’s figure is used, and where it is silent the limit is left open rather than filled.':
    {
      en: 'A placeholder figure no instrument prints. This plot has its own affection plan, so the placeholder is not applied: where the sheet states the limit its figure is used, and where it is silent the limit is left open, not filled.',
      ar: 'رقم مؤقت لا تطبعه أي وثيقة. لهذه القطعة مخطط أفكشن خاص بها، فلا يطبق عليها: حيث يذكر المخطط الحد يستخدم رقمه، وحيث يسكت يترك الحد مفتوحا ولا يملأ.',
    },
  /* The "which face?" rule, once the reader has answered it boundary by boundary — distinct from a typed figure overriding a rule. */
  'set aside for this run and not checked: the affection plan states this setback by face and does not say which face each boundary is; the reader answered it on the plot step, face by face.':
    {
      en: 'Set aside for this run and not checked: the affection plan gives this setback by face without saying which face each boundary is, and the reader answered it on the plot step, face by face.',
      ar: 'استبعدت في هذه الدراسة ولم تفحص: مخطط الأفكشن يحدد هذا الارتداد حسب الواجهة دون أن يذكر واجهة كل حد، وأجاب القارئ عنها في خطوة القطعة، واجهة واجهة.',
    },
  'The drawing prints these roads, and no numbered side is nearest each in turn, so none is placed on a side. Its width is information, never a road’s rank; which boundary it runs along is for the reader to say on the plot step.':
    {
      en: 'The drawing prints these roads, and no numbered side is nearest each, so none is placed on a side. A width is information, never a road’s rank; which boundary it runs along is yours to say on the plot step.',
      ar: 'الرسم يطبع هذه الطرق، ولا يوجد جانب مرقم هو الأقرب إلى كل منها، فلا يوضع أي منها على جانب. العرض معلومة لا رتبة للطريق؛ وأي حد يمتد بجانبه تحدده أنت في خطوة القطعة.',
    },
  /* intake `edges.ts`: the two boundary gaps, rewritten 17 Oct 2026 because both used to claim what the sheet does print. */
  'No affection plan ranks a road. A sheet may print a road’s name or its width, but neither is a rank, and the setback table is keyed on the rank — arterial, collector, local or access. Take it from the master plan or the DCR; it is not inferred here, and Dubai Building Code B.7.2.1 reads the same rank when it recommends which boundary the vehicle access goes on.':
    {
      en: 'No affection plan ranks a road. A sheet may print a road’s name or width, but neither is a rank, and the setback table is keyed on the rank: arterial, collector, local or access. Take it from the master plan or the DCR; it is not inferred here, and B.7.2.1 reads the same rank when it recommends the access boundary.',
      ar: 'لا يرتب أي مخطط أفكشن الطرق. قد يطبع المخطط اسم الطريق أو عرضه، لكن أيا منهما ليس رتبة، وجدول الارتدادات مبني على الرتبة: شرياني أو تجميعي أو محلي أو خدمة. تؤخذ من المخطط الرئيسي أو اشتراطات المطور الرئيسي، ولا تستنتج هنا، والبند B.7.2.1 يقرأ الرتبة نفسها حين يوصي بحد مدخل المركبات.',
    },
  'The sheet’s Access Side box holds no text this reader can read. On the sheets seen so far it holds a mark (*), drawn rather than typed, with a matching mark beside a boundary on the drawing; whether it means the side the issuer requires or one it permits is not established, so it is not read. Mark the frontage yourself, against the sheet — Dubai Building Code B.7.2.1 reads it when it recommends which boundary the vehicle access goes on.':
    {
      en: 'The sheet’s Access Side box holds no text this reader can read. On the sheets seen so far it holds a drawn mark (*), with a matching mark beside a boundary; whether it means the side the issuer requires or one it permits is not established, so it is not read. Mark the frontage yourself, against the sheet; B.7.2.1 reads it when it recommends the access boundary.',
      ar: 'خانة جهة المدخل في المخطط لا تحمل نصا يمكن قراءته. في المخططات التي رأيناها تحمل علامة (*) مرسومة لا مكتوبة، تقابلها علامة بجانب أحد الحدود في الرسم؛ ولم يثبت هل تعني الجهة التي تشترطها الجهة المصدرة أم جهة تسمح بها، فلا تقرأ. حدد الواجهة بنفسك مقابل المخطط؛ والبند B.7.2.1 يقرأها حين يوصي بحد مدخل المركبات.',
    },
  'set aside for this run and not checked: every edge this rule governs on this plot carries a tower setback typed on the plot step, USER_SET by the person who ran it.':
    {
      en: 'Set aside for this run and not checked: every boundary this rule governs on this plot carries a tower setback typed on the plot step, under the name of the person who ran it.',
      ar: 'استبعدت في هذه الدراسة ولم تفحص: كل حد تحكمه هذه القاعدة في هذه القطعة يحمل ارتداد برج كتب في خطوة القطعة باسم من شغل الدراسة.',
    },
};

/** Sentences with figures in them, recognised by their fixed wording. */
const PATTERNS: readonly Reader[] = [
  /* The sheet-gaps refusal (server.ts `sheetGapsSentence`). */
  (t) => {
    const m = /^plot (\S+): its affection plan does not state (.+), and the study does not fill a limit the plot’s own instrument leaves out\. Supply it from the instrument that states it \(the master plan or the DCR\), or select this plot’s project brief where one is on file; a placeholder figure is not used in its place\.$/.exec(t);
    if (!m) return null;
    const names = (m[2] ?? '').replace(/, /g, '، ').replace(/ and /g, ' و');
    // The labels `blockingGaps` can name (intake's `absent(...)` labels), each said in Arabic.
    const namesAr = names
      .replace(/\bTotal Area\b/g, 'مساحة القطعة')
      .replace(/\bHeight\b/g, 'الارتفاع')
      .replace(/\bGFA\b/g, 'المساحة الطابقية')
      .replace(/\bFAR\b/g, 'معامل البناء');
    return {
      en: `Plot ${m[1]}: its affection plan does not state ${m[2]}, and the study does not fill a limit the plot’s own sheet leaves out. Supply it from the instrument that states it (the master plan or the DCR), or select this plot’s project brief where one is on file. No placeholder is used in its place.`,
      ar: `القطعة ${m[1]}: مخطط الأفكشن الخاص بها لا يذكر ${namesAr}، والدراسة لا تملأ حدا يتركه مخطط القطعة نفسها. يؤخذ من الوثيقة التي تذكره (المخطط الرئيسي أو اشتراطات المطور الرئيسي)، أو يختار موجز المشروع لهذه القطعة إن وجد في الملف. لا يستخدم رقم مؤقت بدلا منه.`,
    };
  },
  /* The parking question the sheet's own words leave open (sheet.ts `InstrumentQuestionError`). */
  (t) => {
    const m = /^parking: the affection plan requires ([\d.]+) bay\(s\) for a dwelling of ([\d.]+) m² or less and ([\d.]+) above, and does not say on which area\. A (\S+) unit is ([\d.]+) m² saleable and ([\d.]+) m² of GFA, so the answer turns on it \(([\d.]+) or ([\d.]+) bays each\)\. The study does not choose: change that unit’s area, or have the sheet’s threshold confirmed\.$/.exec(t);
    return m
      ? {
          en: `Parking: the affection plan requires ${m[1]} bay(s) for a dwelling of ${m[2]} m² or less and ${m[3]} above, without saying on which area. A ${m[4]} unit is ${m[5]} m² saleable and ${m[6]} m² of GFA, so the answer turns on it (${m[7]} or ${m[8]} bays each). The study does not choose: change that unit’s area, or have the sheet’s threshold confirmed.`,
          ar: `المواقف: مخطط الأفكشن يشترط ${m[1]} موقفا للوحدة السكنية التي مساحتها ${m[2]} م² أو أقل و${m[3]} لما فوقها، دون أن يذكر أي مساحة. الوحدة ${m[4]} مساحتها ${m[5]} م² قابلة للبيع و${m[6]} م² من المساحة الطابقية، فالجواب يتوقف على ذلك (${m[7]} أو ${m[8]} موقف لكل وحدة). الدراسة لا تختار: غير مساحة تلك الوحدة، أو اطلب تأكيد عتبة المخطط.`,
        }
      : null;
  },
  /* A project brief that is not on file for the plot (server.ts `projectBriefRulesFor`). */
  (t) => {
    const m = /^no project brief "([^"]+)" is on file for plot (\S+)\. Send the id of this plot’s brief, or none\.$/.exec(t);
    return m
      ? {
          en: `No project brief "${m[1]}" is on file for plot ${m[2]}. Send this plot’s brief, or none.`,
          ar: `لا يوجد في الملف موجز مشروع «${m[1]}» للقطعة ${m[2]}. أرسل موجز هذه القطعة، أو لا شيء.`,
        }
      : null;
  },
  /* The FAR row's "as printed": both figures and the ratio the study takes. */
  (t) => {
    const m = /^FAR ([\d.]+); GFA ([\d.]+) m² ÷ plot area ([\d.]+) m² = ([\d.]+)$/.exec(t);
    return m
      ? { en: t, ar: `معامل البناء ${m[1]}؛ المساحة الطابقية ${m[2]} م² ÷ مساحة القطعة ${m[3]} م² = ${m[4]}` }
      : null;
  },
  (t) => {
    const m = /^edges ([\d, ]+)$/.exec(t);
    return m ? { en: t, ar: `الحدود ${commaAr(m[1] ?? '')}` } : null;
  },
  /* The sheet's dwelling-parking rule as the bound list prints it (instrument.ts `boundValueOf`). */
  (t) => {
    const m = /^([\d.]+) per dwelling ≤ ([\d.]+) m²( \(GFA\)| \(saleable\))?, ([\d.]+) above(?:; studio ([\d.]+))?$/.exec(t);
    if (!m) return null;
    const on = m[3] === ' (GFA)' ? ' (من المساحة الطابقية)' : m[3] === ' (saleable)' ? ' (قابلة للبيع)' : '';
    const studio = m[5] === undefined ? '' : `؛ الاستوديو ${m[5]}`;
    return { en: t, ar: `${m[1]} لكل وحدة سكنية ≤ ${m[2]} م²${on}، و${m[4]} لما فوقها${studio}` };
  },
];

export const BINDING_READERS: readonly Reader[] = [exact(FIELDS), SIDE_FIELDS, exact(REASONS), ...PATTERNS];

/** The fixed field names, for the test that holds every binder field to a name. */
export const BINDING_FIELD: Readonly<Record<string, Said>> = FIELDS;
