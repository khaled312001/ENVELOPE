/**
 * The study report — what a reader takes away from a run, in the language they
 * work in, with the drawings in it.
 *
 * ---
 *
 * ## Why a second report
 *
 * `toHtml` is the §3.4 audit document: every rule considered and excluded, every
 * area definition, a footnote on every figure and the derivation index that
 * resolves them. It is complete and it is long, in English, and it holds no
 * drawing. The owner asked on 16 Oct 2026 for a report that is «احترافي وكامل
 * وفيه الرسومات والأشياء المهمة فقط، حسب اللغة الحالية» — professional, complete,
 * with the drawings and only what matters, in the current language. That is a
 * different reader, so it is a different document; the audit trail is not lost,
 * it is in the JSON export, and this report says so.
 *
 * ## What it keeps, whatever it leaves out
 *
 * - `REGULATORY VALIDITY: NOT ASSESSED` on the cover, in every page footer and in
 *   the claim statement — permanent, in English as well as Arabic.
 * - Every assumption, amber, with a ◆ and a dotted underline, ranked, with its
 *   basis and its measured effect. The cover counts them and points at the list.
 * - A not-assessed item is listed as not assessed, never dropped.
 * - The five claim lines, all five.
 *
 * ## It renders. It does not compute.
 *
 * Every figure is a value the engine traced: off the stored report, off the
 * provenance graph by its parameter id (and only when exactly one node carries
 * it), or off the building model. Nothing here adds or converts. A computed
 * figure is PRINTED to two decimals, a count whole (`precision.ts`); the exact
 * figure stays on the element and in the JSON export, and the annex quotes
 * inputs and instruments as given. The only numbers this module produces are
 * counts of the rows it prints.
 *
 * ## The drawings
 *
 * Each sheet is printed on its own A3 landscape page, at full size, inside the
 * A4 report (`@page sheet`). It used to be reduced onto A4, and A3 to A4 is the
 * A-series √2: 2.5 mm notes printed at 1.77 mm and 2 mm dimension figures at
 * 1.41 mm, under ISO 3098's 1.8 mm floor (`packages/sheets/src/lettering.ts`),
 * with every title strip's scale wrong by the same factor. At full size the
 * lettering is what the sheet set it at and the scale bar tells the truth. The
 * sheet carries its own frame, title strip and stamp, so the page has no margin
 * and no running footer. The DXF remains the file to measure from. The drawings
 * stay in English, as their DXF layers do.
 */

import {
  CapacityBand,
  ClaimStatus,
  NodeKind,
  RENDER_HINTS,
  RenderHint,
  metric,
  type BuildingModel,
  type Citation,
} from '@envelope/core';
import { type Sheet, sheetSvg } from '@envelope/sheets';

import { CLAIM_STATEMENT_VERBATIM, esc, groupDigits, treatmentFor } from './html.js';
import { forDisplay } from './precision.js';
import {
  InvariantStatus,
  RuleSetApproval,
  assertEmittable,
  unsignedAnnexNotice,
  type GfaStatementSection,
  type RunReport,
} from './json.js';
import { INVARIANT, METRIC_AR, engineNote, type Locale } from './words/index.js';

export interface StudyReportOptions {
  /** The language the reader was working in when they asked for the report. */
  readonly locale: Locale;
  /** The drawing set, composed by the caller from the run's building model. */
  readonly sheets: readonly Sheet[];
  /** The building model the sheets were drawn from; null on a run stored before it existed. */
  readonly building: BuildingModel | null;
  /**
   * What the plot's own affection plan states that this run did not apply, as
   * the API's sheet report lists it. Null when no sheet was attached, or on a
   * run stored before 17 Oct 2026 that did not keep the list — said in a line,
   * not left as an empty table that would read as "nothing was left out".
   */
  readonly notBound?: readonly { readonly field: string; readonly stated: string; readonly reason: string }[] | null;
}

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

const EN = {
  docType: 'Development capacity study',
  plot: (n: string): string => `Plot ${n}`,
  computedAt: 'Computed',
  reviewedBy: 'Reviewed by',
  noReviewer: 'No named reviewer',
  noLicence: 'named reviewer, no licence stated',
  lead: (gfa: string, band: string, letter: string): string =>
    `The governing capacity is ${gfa}, set by the ${band} limit (band ${letter}).`,
  fig: {
    governing: 'Governing capacity',
    units: 'Units',
    levels: 'Levels',
    height: 'Height',
    heightOf: (c: string): string => `of ${c} permitted`,
    far: 'Floor area ratio',
    farOf: (c: string): string => `of ${c} permitted`,
    plotArea: 'Plot area',
    bayRequired: 'Parking required',
    bayProbe: 'Parking the largest scheme would need',
    bayDrawn: 'Parking laid out',
  },
  stampTitle: 'Regulatory validity: not assessed',
  stampBody: 'This study does not and cannot determine whether an authority would approve this scheme.',
  assumed: (n: number): string =>
    `${n} value${n === 1 ? ' is' : 's are'} assumed rather than taken from a rule. Each is marked ◆ in amber and listed in section 5.`,
  draftTitle: 'Computed on rules not yet approved',
  draftBody: 'The rule set used here is a development draft. Treat every figure as provisional until the rules are approved.',
  annexTitle: 'Area definitions not yet signed',
  annexBody: 'The definitions of GFA and the other area terms used here are awaiting sign-off.',
  keyTitle: 'How values are marked',
  key: {
    derived: 'From a cited rule',
    assumed: 'Assumed — not from a rule',
    user: 'Entered by a named person',
    notAssessed: 'Not assessed',
  },
  hintLabel: {
    derived: 'from a cited rule',
    assumed: 'assumed, not from a rule',
    user: 'entered by a named person',
    variance: 'governed by a documented variance',
    deferred: 'not assessed',
  },
  userBadge: 'USER',
  contents: 'Contents',
  sections: [
    'Plot and envelope',
    'Capacity',
    'Parking',
    'Drawings',
    'Assumptions and limits',
    'Checks and claims',
    'Sources and run',
    'Annex: inputs, rules and definitions',
  ],
  inputsTitle: 'Inputs entered by a named person',
  inputsLede: 'Every value a person entered for this run, with who entered it and when. Each one is marked as entered wherever it is used.',
  noInputs: 'No value in this run was entered by hand.',
  colInput: 'Input',
  colEnteredBy: 'Entered by',
  colWhen: 'Date',
  rulesTitle: 'Rules applied',
  rulesLede: (applied: number, considered: number): string =>
    `${applied} rule${applied === 1 ? '' : 's'} set a value in this run, and ${considered} more ${considered === 1 ? 'was' : 'were'} considered and not applied — listed, because a rule that did not apply is a fact, not a silence.`,
  colParameter: 'Parameter',
  excludedTitle: 'Rules considered and not applied',
  notBoundTitle: 'Limits the affection plan states that this study does not apply',
  notBoundLede:
    'Each is printed on the plot’s own sheet and was read; none of them cut the envelope. They are listed so the sheet is not reported as saying less than it does.',
  colField: 'Limit',
  colStated: 'As printed',
  colOutcome: 'Outcome',
  disposition: {
    APPLIED: 'Applied',
    NOT_APPLICABLE: 'Does not apply',
    SUPERSEDED: 'Superseded',
    DEFERRED: 'Not assessed',
    NOT_APPROVED: 'Not approved',
    OUT_OF_SCOPE: 'Out of scope',
  } as Readonly<Record<string, string>>,
  definitionsTitle: 'Area definitions',
  definitionsLede: (version: string): string =>
    `Each area term this study uses, with what it includes and leaves out, from annex ${version}. Two studies that define an area differently are not comparable.`,
  colTerm: 'Term',
  colDefinition: 'Definition',
  colIncludes: 'Includes',
  colExcludes: 'Leaves out',
  pending: 'Awaiting sign-off',
  community: 'Community',
  landUse: 'Land use',
  areaStated: 'Plot area on the affection plan',
  areaComputed: 'Plot area from the boundary',
  notOnPlan: 'Not on the affection plan',
  areaMismatch: 'The stated and computed areas differ by more than 2%. Every area here is computed from the boundary.',
  boundaries: 'Boundaries and setbacks',
  colEdge: 'Boundary',
  colLength: 'Length',
  colSetback: 'Setback',
  envelope: 'Buildable envelope',
  colDimension: 'Dimension',
  colValue: 'Value',
  colSetBy: 'Set by',
  colSource: 'Source',
  bandsLede: 'Three limits, computed separately. The governing capacity is the smallest of the three, never an average.',
  colBand: 'Band',
  colMeasures: 'What it measures',
  colGfa: 'Floor area',
  governs: 'Governs',
  next: (letter: string, h: string): string => `The next limit is band ${letter}, ${h} above the governing figure.`,
  granularity: (x: string): string => `Floor area no whole number of floors can use: ${x}.`,
  gfaTitle: 'GFA calculation',
  allowed: 'Allowed',
  proposed: 'Proposed',
  remaining: 'Left within the allowance',
  colFloor: 'Floor',
  colPerLevel: 'Per level',
  colArea: 'Area',
  colAreaFt: 'Area (ft²)',
  notCounted: 'Not counted',
  row: {
    GROUND: 'Ground floor',
    PODIUM: 'Podium floors',
    TYPICAL: 'Typical floors',
    UNPLACED: 'Counted, not placed under the height ceiling',
    PARKING: 'Parking counted in FAR',
    COMMERCIAL: 'Commercial',
    ROOF: 'Roof floor',
  },
  parkingInFar: 'Parking in FAR',
  declaredBy: (n: string): string => `declared by ${n}`,
  demand: 'Parking required',
  requiredAtAnswer: 'Bays the reported capacity needs',
  probeTitle: 'The largest scheme the envelope allows',
  probeNote:
    'These figures find the parking ceiling (Band C). They are the demand of the largest scheme the envelope allows, not of the building this report describes.',
  resident: 'Resident bays',
  visitor: 'Visitor bays',
  totalRequired: 'Total required',
  supply: 'Parking laid out, level by level',
  colLevel: 'Level',
  colBays: 'Bays',
  allLevels: 'All parking levels',
  unitsSupported: 'Units the parking supports',
  accessibleTitle: 'Accessible and preferred bays',
  module: (w: string, l: string, a: string): string =>
    `Bays ${w} × ${l} m, drive aisles ${a} m wide (Dubai Building Code, Table B.11).`,
  noModel: 'This run was computed before the building model existed. Compute it again to lay out and draw the parking.',
  drawingsLede:
    'Every drawing comes from the one building model the figures were computed from — the drawing the screen shows and the DXF carries.',
  fullSize: 'Each is printed on its own A3 page at full size, so the scale in its title strip holds on paper. The DXF remains the file to measure from.',
  drawingsInEnglish: '',
  sheetCount: (n: number): string => `${n} sheet${n === 1 ? '' : 's'}, one to a page.`,
  noDrawings: 'This run has no drawings: it was computed before drawings were made from the building model.',
  assumptionsLede:
    'Ranked by measured effect on the governing capacity. Each can be changed in the studio, and every figure that depends on it is computed again.',
  colAssumption: 'Assumption',
  colBasis: 'Basis',
  colEffect: 'Effect',
  noAssumptions: 'No value in this run is assumed: each traces to a cited rule or to a named person.',
  notModelledTitle: 'What the model does not contain',
  checksTitle: 'Arithmetic checks',
  checksLede: (p: number, n: number): string =>
    `${p} passed, ${n} not assessed. A check that cannot run is listed, never left out; passing them shows the arithmetic closes, not that the scheme complies.`,
  colCheck: 'Check',
  colResult: 'Result',
  result: {
    PASS: 'Passed',
    FAIL: 'Failed',
    NOT_APPLICABLE: 'Not applicable',
    NOT_ASSESSED: 'Not assessed',
  },
  deferredTitle: 'Applicable and not assessed',
  colRequirement: 'Requirement',
  colWhy: 'Why',
  noDeferred: 'Every applicable rule in the encoded set was evaluated — a statement about the encoded set, not about the regulation.',
  claimTitle: 'What this study claims',
  claimNames: {
    SELF_CONSISTENCY: 'Self-consistency',
    RULE_COVERAGE: 'Rule coverage',
    GEOMETRIC_VALIDITY: 'Geometric validity',
    REGULATORY_VALIDITY: 'Regulatory validity',
    PROFESSIONAL_AGREEMENT: 'Professional agreement',
  },
  status: {
    SUPPORTED: 'Supported',
    PARTIAL: 'Partial',
    MEASURED: 'Measured',
    NOT_ASSESSED: 'Not assessed',
    NEVER_CLAIMED: 'Never claimed',
  },
  disclaimerTitle: 'Professional use',
  sourcesTitle: 'Clauses cited',
  colInstrument: 'Instrument',
  colClause: 'Clause',
  colPage: 'Page',
  runTitle: 'Run',
  runId: 'Run id',
  engine: 'Engine',
  ruleSet: 'Rule set',
  annex: 'Area definitions annex',
  unsigned: 'unsigned',
  draft: 'development draft',
  approved: 'approved',
  jsonNote: "The full derivation of every figure — each rule, input and formula — is in this run's JSON export.",
  page: 'page',
  of: 'of',
  edge: {
    ROAD: 'Road',
    ADJACENT_PLOT: 'Neighbouring plot',
    OPEN_SPACE: 'Open space',
    OTHER: 'Other',
  } as Readonly<Record<string, string>>,
  road: {
    ARTERIAL: 'arterial',
    COLLECTOR: 'collector',
    LOCAL: 'local',
    ACCESS: 'access',
  } as Readonly<Record<string, string>>,
  use: {
    RESIDENTIAL_MULTI: 'Residential, multi-unit',
    RESIDENTIAL_SINGLE: 'Residential, single unit',
    COMMERCIAL: 'Commercial',
    MIXED_USE: 'Mixed use',
    INDUSTRIAL: 'Industrial',
  } as Readonly<Record<string, string>>,
  band: { REGULATORY: 'regulatory', GEOMETRIC: 'geometric', PARKING: 'parking' },
  instrument: {
    DUBAI_BUILDING_CODE: 'Dubai Building Code',
    // A development rule's citation, said for what it is: no instrument stands behind it yet.
    'PLACEHOLDER-NOT-A-REAL-INSTRUMENT': 'Placeholder, not yet sourced —',
  } as Readonly<Record<string, string>>,
  units: {} as Readonly<Record<string, string>>,
};

type Words = typeof EN;

const AR: Words = {
  docType: 'دراسة السعة التطويرية',
  // Isolated left to right (U+2066 … U+2069): in a right-to-left line "345-1234" otherwise prints as "1234-345".
  plot: (n) => `قطعة الأرض ⁦${n}⁩`,
  computedAt: 'تاريخ الحساب',
  reviewedBy: 'المراجع',
  noReviewer: 'لا يوجد مراجع مسمى',
  noLicence: 'مراجع مسمى، دون رقم ترخيص',
  lead: (gfa, band, letter) => `السعة الحاكمة ${gfa}، ويحددها قيد ${band} (النطاق ${letter}).`,
  fig: {
    governing: 'السعة الحاكمة',
    units: 'الوحدات',
    levels: 'الأدوار',
    height: 'الارتفاع',
    heightOf: (c) => `من ${c} مسموحة`,
    far: 'معامل البناء',
    farOf: (c) => `من ${c} مسموح`,
    plotArea: 'مساحة القطعة',
    bayRequired: 'المواقف المطلوبة',
    bayProbe: 'المواقف التي يحتاجها أكبر مخطط',
    bayDrawn: 'المواقف الموزعة',
  },
  stampTitle: 'الصلاحية التنظيمية: لم تخضع للتقييم',
  stampBody: 'هذه الدراسة لا تحدد ولا تستطيع أن تحدد ما إذا كانت الجهة المختصة ستعتمد هذا المخطط.',
  assumed: (n) =>
    `${n} من القيم مفترضة وليست مأخوذة من قاعدة. كل منها معلم بـ ◆ باللون الكهرماني ومذكور في القسم 5.`,
  draftTitle: 'حسبت على قواعد لم تعتمد بعد',
  draftBody: 'مجموعة القواعد المستخدمة مسودة تطوير. اعتبر كل رقم مبدئيا حتى تعتمد القواعد.',
  annexTitle: 'تعريفات المساحات لم توقع بعد',
  annexBody: 'تعريفات المساحة الطابقية ومصطلحات المساحة الأخرى المستخدمة هنا بانتظار الاعتماد.',
  keyTitle: 'كيف تعلم القيم',
  key: {
    derived: 'من قاعدة مستشهد بها',
    assumed: 'مفترض — ليس من قاعدة',
    user: 'أدخلها شخص مسمى',
    notAssessed: 'لم يخضع للتقييم',
  },
  hintLabel: {
    derived: 'من قاعدة مستشهد بها',
    assumed: 'مفترض، ليس من قاعدة',
    user: 'أدخلها شخص مسمى',
    variance: 'يحكمها استثناء موثق',
    deferred: 'لم يخضع للتقييم',
  },
  userBadge: 'مدخل',
  contents: 'المحتويات',
  sections: [
    'القطعة والغلاف البنائي',
    'السعة',
    'المواقف',
    'الرسومات',
    'الافتراضات والحدود',
    'الفحوصات وما تدعيه الدراسة',
    'المصادر وبيانات الحساب',
    'ملحق: المدخلات والقواعد والتعريفات',
  ],
  inputsTitle: 'مدخلات أدخلها شخص مسمى',
  inputsLede: 'كل قيمة أدخلها شخص لهذا الحساب، ومن أدخلها ومتى. وكل منها معلمة كمدخل حيثما استخدمت.',
  noInputs: 'لا توجد قيمة أدخلت يدويا في هذا الحساب.',
  colInput: 'المدخل',
  colEnteredBy: 'أدخلها',
  colWhen: 'التاريخ',
  rulesTitle: 'القواعد المطبقة',
  rulesLede: (applied, considered) =>
    `حددت ${applied} من القواعد قيما في هذا الحساب، ودرست ${considered} أخرى ولم تطبق — وهي مذكورة، لأن عدم انطباق قاعدة حقيقة تذكر لا صمت.`,
  colParameter: 'العنصر',
  excludedTitle: 'قواعد درست ولم تطبق',
  notBoundTitle: 'حدود يذكرها مخطط الأفكشن ولا تطبقها هذه الدراسة',
  notBoundLede:
    'كل منها مطبوع في مخطط القطعة نفسها وقرئ، ولم يقطع أي منها الغلاف. تذكر هنا حتى لا ينقل عن المخطط أقل مما يقول.',
  colField: 'الحد',
  colStated: 'كما طبع',
  colOutcome: 'النتيجة',
  disposition: {
    APPLIED: 'طبقت',
    NOT_APPLICABLE: 'لا تنطبق',
    SUPERSEDED: 'حلت محلها أخرى',
    DEFERRED: 'لم تخضع للتقييم',
    NOT_APPROVED: 'غير معتمدة',
    OUT_OF_SCOPE: 'خارج النطاق',
  },
  definitionsTitle: 'تعريفات المساحات',
  definitionsLede: (version) =>
    `كل مصطلح مساحة تستخدمه هذه الدراسة، وما يشمله وما لا يشمله، من الملحق ${version}. دراستان تعرفان المساحة بشكل مختلف لا تصح المقارنة بينهما.`,
  colTerm: 'المصطلح',
  colDefinition: 'التعريف',
  colIncludes: 'يشمل',
  colExcludes: 'لا يشمل',
  pending: 'بانتظار الاعتماد',
  community: 'المنطقة',
  landUse: 'استخدام الأرض',
  areaStated: 'مساحة القطعة في مخطط الأفكشن',
  areaComputed: 'مساحة القطعة من الحدود',
  notOnPlan: 'غير مذكورة في المخطط',
  areaMismatch: 'تختلف المساحتان بأكثر من 2%. كل مساحة هنا محسوبة من الحدود.',
  boundaries: 'الحدود والارتدادات',
  colEdge: 'الحد',
  colLength: 'الطول',
  colSetback: 'الارتداد',
  envelope: 'الغلاف البنائي',
  colDimension: 'البعد',
  colValue: 'القيمة',
  colSetBy: 'يحدده',
  colSource: 'المصدر',
  bandsLede: 'ثلاثة قيود يحسب كل منها على حدة. السعة الحاكمة هي أصغرها، وليست متوسطا.',
  colBand: 'النطاق',
  colMeasures: 'ما يقيسه',
  colGfa: 'المساحة الطابقية',
  governs: 'حاكم',
  next: (letter, h) => `القيد التالي هو النطاق ${letter}، أعلى من الرقم الحاكم بمقدار ${h}.`,
  granularity: (x) => `مساحة لا يستوعبها عدد صحيح من الأدوار: ${x}.`,
  gfaTitle: 'حساب المساحة الطابقية',
  allowed: 'المسموح',
  proposed: 'المقترح',
  remaining: 'المتبقي ضمن المسموح',
  colFloor: 'الدور',
  colPerLevel: 'لكل دور',
  colArea: 'المساحة',
  colAreaFt: 'المساحة (قدم²)',
  notCounted: 'لا تحسب',
  row: {
    GROUND: 'الدور الأرضي',
    PODIUM: 'أدوار البوديوم',
    TYPICAL: 'الأدوار المتكررة',
    UNPLACED: 'محسوبة ولم توضع تحت سقف الارتفاع',
    PARKING: 'مواقف محسوبة في معامل البناء',
    COMMERCIAL: 'تجاري',
    ROOF: 'دور السطح',
  },
  parkingInFar: 'المواقف في معامل البناء',
  declaredBy: (n) => `حددها ${n}`,
  demand: 'المواقف المطلوبة',
  requiredAtAnswer: 'المواقف التي تحتاجها السعة المعلنة',
  probeTitle: 'أكبر مخطط يسمح به الغلاف',
  probeNote:
    'تحدد هذه الأرقام سقف المواقف (النطاق C). وهي طلب أكبر مخطط يسمح به الغلاف، لا طلب المبنى الذي يصفه هذا التقرير.',
  resident: 'مواقف السكان',
  visitor: 'مواقف الزوار',
  totalRequired: 'إجمالي المطلوب',
  supply: 'المواقف الموزعة حسب الدور',
  colLevel: 'الدور',
  colBays: 'المواقف',
  allLevels: 'كل أدوار المواقف',
  unitsSupported: 'الوحدات التي تدعمها المواقف',
  accessibleTitle: 'مواقف أصحاب الهمم والمواقف المفضلة',
  module: (w, l, a) => `الموقف ${w} × ${l} م، وممر المناورة بعرض ${a} م (كود دبي للبناء، جدول B.11).`,
  noModel: 'حسب هذا الحساب قبل وجود نموذج المبنى. أعد حسابه لتوزيع المواقف ورسمها.',
  drawingsLede: 'كل رسم مأخوذ من نموذج المبنى نفسه الذي حسبت منه الأرقام، وهو ما تعرضه الشاشة ويحمله ملف DXF.',
  fullSize: 'تطبع كل لوحة على صفحة A3 خاصة بها بالحجم الكامل، فيبقى المقياس المكتوب في إطار العنوان صحيحا على الورق. ويبقى ملف DXF هو المرجع للقياس.',
  drawingsInEnglish: 'تكتب الرسومات بالإنجليزية، كما تكتب طبقات ملف DXF.',
  sheetCount: (n) => `${n} لوحة، كل لوحة في صفحة.`,
  noDrawings: 'لا رسومات لهذا الحساب: حسب قبل أن ترسم اللوحات من نموذج المبنى.',
  assumptionsLede: 'مرتبة حسب أثرها المقيس على السعة الحاكمة. يمكن تعديل أي منها في الاستوديو فيعاد حساب كل رقم يعتمد عليها.',
  colAssumption: 'الافتراض',
  colBasis: 'الأساس',
  colEffect: 'الأثر',
  noAssumptions: 'لا توجد قيمة مفترضة في هذا الحساب: كل قيمة ترجع إلى قاعدة مستشهد بها أو إلى شخص مسمى.',
  notModelledTitle: 'ما لا يحتويه النموذج',
  checksTitle: 'فحوصات الحفظ',
  checksLede: (p, n) =>
    `نجح ${p}، و${n} لم تخضع للتقييم. الفحص الذي لا يمكن تشغيله يذكر ولا يحذف؛ ونجاحها يعني أن الحسابات متسقة، لا أن المخطط مطابق.`,
  colCheck: 'الفحص',
  colResult: 'النتيجة',
  result: {
    PASS: 'ناجح',
    FAIL: 'لم ينجح',
    NOT_APPLICABLE: 'لا ينطبق',
    NOT_ASSESSED: 'لم يخضع للتقييم',
  },
  deferredTitle: 'منطبقة ولم تخضع للتقييم',
  colRequirement: 'المتطلب',
  colWhy: 'السبب',
  noDeferred: 'قيمت كل قاعدة منطبقة في المجموعة المرمزة — وهذا وصف للمجموعة المرمزة، لا للأنظمة.',
  claimTitle: 'ما تدعيه هذه الدراسة',
  claimNames: {
    SELF_CONSISTENCY: 'الاتساق الذاتي',
    RULE_COVERAGE: 'تغطية القواعد',
    GEOMETRIC_VALIDITY: 'السلامة الهندسية',
    REGULATORY_VALIDITY: 'الصلاحية التنظيمية',
    PROFESSIONAL_AGREEMENT: 'التوافق المهني',
  },
  status: {
    SUPPORTED: 'مدعوم',
    PARTIAL: 'جزئي',
    MEASURED: 'مقيس',
    NOT_ASSESSED: 'لم يخضع للتقييم',
    NEVER_CLAIMED: 'لا يدعى أبدا',
  },
  disclaimerTitle: 'الاستخدام المهني',
  sourcesTitle: 'البنود المستشهد بها',
  colInstrument: 'الوثيقة',
  colClause: 'البند',
  colPage: 'الصفحة',
  runTitle: 'بيانات الحساب',
  runId: 'رقم الحساب',
  engine: 'المحرك',
  ruleSet: 'مجموعة القواعد',
  annex: 'ملحق تعريفات المساحة',
  unsigned: 'غير موقع',
  draft: 'مسودة تطوير',
  approved: 'معتمدة',
  jsonNote: 'الاشتقاق الكامل لكل رقم — كل قاعدة ومدخل ومعادلة — موجود في ملف JSON لهذا الحساب.',
  page: 'صفحة',
  of: 'من',
  edge: {
    ROAD: 'طريق',
    ADJACENT_PLOT: 'قطعة مجاورة',
    OPEN_SPACE: 'مساحة مفتوحة',
    OTHER: 'أخرى',
  },
  road: {
    ARTERIAL: 'شرياني',
    COLLECTOR: 'تجميعي',
    LOCAL: 'محلي',
    ACCESS: 'خدمة',
  },
  use: {
    RESIDENTIAL_MULTI: 'سكني متعدد الوحدات',
    RESIDENTIAL_SINGLE: 'سكني لوحدة واحدة',
    COMMERCIAL: 'تجاري',
    MIXED_USE: 'متعدد الاستخدامات',
    INDUSTRIAL: 'صناعي',
  },
  band: { REGULATORY: 'التنظيم', GEOMETRIC: 'الشكل الهندسي', PARKING: 'المواقف' },
  instrument: { DUBAI_BUILDING_CODE: 'كود دبي للبناء', 'PLACEHOLDER-NOT-A-REAL-INSTRUMENT': 'مرجع مؤقت لم يوثق بعد —' },
  units: {
    'm²': 'م²',
    m: 'م',
    mm: 'مم',
    bays: 'موقف',
    levels: 'دور',
    units: 'وحدة',
    'm²/bay': 'م²/موقف',
    'bays/unit': 'موقف/وحدة',
    transformers: 'محول',
    'ft²': 'قدم²',
  },
};

const WORDS: Readonly<Record<Locale, Words>> = { en: EN, ar: AR };

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

/** A value as the page shows it: the engine's figure, its unit and its provenance treatment. */
interface Shown {
  readonly value: string;
  readonly unit?: string | undefined;
  readonly renderHint: RenderHint;
}

const NUMBER = /^-?\d+(\.\d+)?$/;

/** Engine text in the reader's language where the shared tables know it; as written otherwise. */
function say(text: string, locale: Locale): string {
  return engineNote(text, locale) ?? text;
}

function unitOf(unit: string | undefined, w: Words): string {
  if (unit === undefined || unit === 'ratio' || unit === '') return '';
  return w.units[unit] ?? unit;
}

/*
  HOW A FIGURE IS PRINTED (`precision.ts`): a measure to two decimals, a count
  whole. `exact` prints the figure as given instead, for the annex, where a
  value is QUOTED — what the reader typed, what the instrument states — rather
  than computed; rounding a quotation changes what somebody said. The exact
  figure of everything rounded is in the JSON export, which carries the graph.
*/
function digits(text: string, unit: string | undefined, exact: boolean): string {
  return groupDigits(exact ? text : forDisplay(text, unit));
}

/** The figure itself, with the exact one on the element when the page rounded it. */
function num(text: string, unit: string | undefined, exact: boolean): string {
  const printed = digits(text, unit, exact);
  const kept = !exact && NUMBER.test(text) && forDisplay(text, unit) !== text ? ` data-exact="${esc(text)}"` : '';
  return `<bdi class="num"${kept}>${esc(printed)}</bdi>`;
}

function figure(text: string, unit: string | undefined, locale: Locale, exact: boolean): string {
  return NUMBER.test(text) ? num(text, unit, exact) : `<bdi class="num">${esc(say(text, locale))}</bdi>`;
}

function hintLabel(hint: RenderHint, w: Words): string {
  switch (hint) {
    case RenderHint.AMBER_DOTTED_EDITABLE:
      return w.hintLabel.assumed;
    case RenderHint.USER_BADGE:
      return w.hintLabel.user;
    case RenderHint.RED_BORDER_EVIDENCE:
      return w.hintLabel.variance;
    case RenderHint.GREY_HATCHED_NOT_ASSESSED:
      return w.hintLabel.deferred;
    default:
      return w.hintLabel.derived;
  }
}

/** The one path by which a traced figure reaches the page. */
function shown(s: Shown, locale: Locale, exact = false): string {
  const w = WORDS[locale];
  // `treatmentFor` throws for the two classes Phase 0 may not draw.
  const t = treatmentFor(s.renderHint);
  const glyph = t.glyph ? `<span class="glyph" aria-hidden="true">${esc(t.glyph)}</span>` : '';
  const unit = unitOf(s.unit, w);
  const badge = s.renderHint === RenderHint.USER_BADGE ? `<span class="badge">${esc(w.userBadge)}</span>` : '';
  return (
    `<span class="qty ${t.className}">${glyph}${figure(s.value, s.unit, locale, exact)}` +
    (unit ? `<span class="unit"> ${esc(unit)}</span>` : '') +
    badge +
    `<span class="sr-only"> (${esc(hintLabel(s.renderHint, w))})</span></span>`
  );
}

/** A magnitude restated from a traced one elsewhere — no provenance of its own, so no marking. */
function plain(
  text: string,
  unit: string | undefined,
  locale: Locale,
  how: { readonly measuredIn?: string; readonly exact?: boolean } = {},
): string {
  const u = unitOf(unit, WORDS[locale]);
  return `<span class="qty v-plain">${num(text, how.measuredIn ?? unit, how.exact ?? false)}${u ? `<span class="unit"> ${esc(u)}</span>` : ''}</span>`;
}

function chip(text: string): string {
  return `<span class="chip hatched">${esc(text)}</span>`;
}

/**
 * A value off the provenance graph, by its parameter id — only when exactly one
 * VALUE node carries it. Two would mean the id names more than one figure, and
 * picking one would be choosing which the reader sees.
 */
function fromGraph(run: RunReport, parameterId: string): Shown | null {
  const hits = run.provenance.nodes.filter(
    (n) =>
      n.kind === NodeKind.VALUE &&
      n.parameterId === parameterId &&
      n.value !== undefined &&
      n.provenanceClass !== undefined,
  );
  const n = hits.length === 1 ? hits[0] : undefined;
  if (!n || n.value === undefined || n.provenanceClass === undefined) return null;
  return { value: n.value, unit: n.unit, renderHint: RENDER_HINTS[n.provenanceClass] };
}

function bandLetter(band: CapacityBand): string {
  switch (band) {
    case CapacityBand.REGULATORY:
      return 'A';
    case CapacityBand.GEOMETRIC:
      return 'B';
    case CapacityBand.PARKING:
      return 'C';
    default: {
      const unreachable: never = band;
      throw new Error(`unhandled capacity band ${String(unreachable)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Citations
// ---------------------------------------------------------------------------

/** Every clause the report cites, in the order it first cites them. */
class Sources {
  readonly #byKey = new Map<string, Citation>();

  add(c: Citation | null): void {
    if (c === null) return;
    const key = `${c.instrumentId}|${c.instrumentVersion}|${c.clauseReference}|${c.sourcePage}`;
    if (!this.#byKey.has(key)) this.#byKey.set(key, c);
  }

  get all(): readonly Citation[] {
    return [...this.#byKey.values()];
  }
}

function instrumentName(c: Citation, w: Words): string {
  return w.instrument[c.instrumentId] ?? c.instrumentId.replace(/_/g, ' ');
}

/** The clause's number, without the heading after the dash: "B.7.2.6.1 ¶1, Table B.13". */
function clauseNumber(c: Citation): string {
  return c.clauseReference.split(' — ')[0] ?? c.clauseReference;
}

function source(c: Citation | null, w: Words, sources: Sources): string {
  if (c === null) return '—';
  sources.add(c);
  return `<span class="cite">${esc(instrumentName(c, w))} <bdi>${esc(clauseNumber(c))}</bdi></span>`;
}

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

function table(
  caption: string,
  headers: readonly string[],
  rows: readonly (readonly string[])[],
  cls = '',
  widths: readonly string[] = [],
): string {
  const head = headers.map((h) => `<th scope="col">${esc(h)}</th>`).join('');
  const cols = widths.length === 0 ? '' : `<colgroup>${widths.map((w) => `<col style="width:${w}">`).join('')}</colgroup>`;
  const body = rows
    .map(([first, ...rest]) => `<tr><th scope="row">${first ?? ''}</th>${rest.map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('');
  return (
    `<table${cls ? ` class="${cls}"` : ''}><caption class="sr-only">${esc(caption)}</caption>${cols}` +
    `<thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
  );
}

function facts(rows: readonly (readonly [string, string])[]): string {
  return `<dl class="facts">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
}

function sectionHead(n: number, w: Words): string {
  return `<header class="sec-head"><span class="sec-n">${n}</span><h2 id="s${n}">${esc(w.sections[n - 1] ?? '')}</h2></header>`;
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

function cover(run: RunReport, o: StudyReportOptions): string {
  const L = o.locale;
  const w = WORDS[L];
  const gov = run.capacity.governingBand;

  const tile = (label: string, value: string, sub = ''): string =>
    `<div class="tile"><div class="tile-label">${esc(label)}</div><div class="tile-value">${value}</div>` +
    (sub ? `<div class="tile-sub">${sub}</div>` : '') +
    `</div>`;

  const units = fromGraph(run, 'capacity.governing_unit_count');
  const height = fromGraph(run, 'capacity.achieved_height_m');
  const ceiling = o.building?.heightCeilingM ?? fromGraph(run, 'envelope.height_ceiling_m');
  const far = fromGraph(run, 'capacity.achieved_far');
  const farCap = fromGraph(run, 'capacity.permitted_far');
  const required = fromGraph(run, 'parking.demand_at_governing_capacity');

  const tiles = [
    tile(w.fig.governing, shown(run.capacity.governingGfa, L), esc(`${w.colBand} ${bandLetter(gov)}`)),
    units ? tile(w.fig.units, shown(units, L)) : '',
    tile(w.fig.levels, shown(run.capacity.levels, L)),
    height ? tile(w.fig.height, shown(height, L), ceiling ? w.fig.heightOf(shown(ceiling, L)) : '') : '',
    far ? tile(w.fig.far, shown(far, L), farCap ? w.fig.farOf(shown(farCap, L)) : '') : '',
    tile(w.fig.plotArea, plain(run.plot.computedAreaM2, 'm²', L)),
    // The demand of the building this report describes; the probe's only when the run predates it, and named as such.
    required ? tile(w.fig.bayRequired, shown(required, L)) : tile(w.fig.bayProbe, shown(run.parking.totalBays, L)),
    o.building ? tile(w.fig.bayDrawn, shown(o.building.drawnBays, L)) : '',
  ].join('');

  const draft =
    run.ruleSet.approval === RuleSetApproval.DRAFT
      ? `<div class="notice notice-red"><p class="notice-title">${esc(w.draftTitle)}</p><p>${esc(w.draftBody)}</p></div>`
      : '';
  const annex =
    unsignedAnnexNotice() === null
      ? ''
      : `<div class="notice"><p class="notice-title">${esc(w.annexTitle)}</p><p>${esc(w.annexBody)}</p></div>`;
  const assumed =
    run.assumptions.length === 0
      ? ''
      : `<div class="notice notice-amber"><p><span class="glyph" aria-hidden="true">◆</span> ${esc(w.assumed(run.assumptions.length))}</p></div>`;

  const reviewer =
    run.reviewer === null
      ? esc(w.noReviewer)
      : `${esc(run.reviewer.name)} — ${esc(
          run.reviewer.role === 'named reviewer (no licence asserted)' ? w.noLicence : run.reviewer.role,
        )} · <bdi>${esc(run.reviewer.acknowledgedAt.slice(0, 10))}</bdi>`;

  const key =
    `<div class="key"><p class="key-title">${esc(w.keyTitle)}</p><ul>` +
    `<li><span class="qty v-derived"><bdi class="num">1,625.00</bdi></span> ${esc(w.key.derived)}</li>` +
    `<li><span class="qty v-assumed"><span class="glyph" aria-hidden="true">◆</span><bdi class="num">0.85</bdi></span> ${esc(w.key.assumed)}</li>` +
    `<li><span class="qty v-user"><bdi class="num">2</bdi><span class="badge">${esc(w.userBadge)}</span></span> ${esc(w.key.user)}</li>` +
    `<li>${chip(w.key.notAssessed)}</li>` +
    `</ul></div>`;

  const contents =
    `<nav class="contents" aria-labelledby="contents"><p id="contents" class="key-title">${esc(w.contents)}</p><ol>` +
    w.sections.map((s, i) => `<li><a href="#s${i + 1}">${esc(s)}</a></li>`).join('') +
    `</ol></nav>`;

  return (
    `<section class="page cover" aria-label="${esc(w.docType)}">` +
    `<div class="masthead"><span class="brand">Plotlogic.dev</span><span>${esc(w.docType)}</span></div>` +
    `<h1>${esc(w.plot(run.plot.plotNumber))}</h1>` +
    `<p class="community">${esc(run.plot.community)} · ${esc(w.use[run.plot.landUse] ?? run.plot.landUse)}</p>` +
    `<p class="lead">${w.lead(shown(run.capacity.governingGfa, L), esc(w.band[gov]), bandLetter(gov))}</p>` +
    `<div class="tiles">${tiles}</div>` +
    `<div class="stamp"><p class="stamp-title">${esc(w.stampTitle)}</p><p>${esc(w.stampBody)}</p>` +
    (L === 'en' ? '' : `<p class="stamp-en" lang="en" dir="ltr">REGULATORY VALIDITY: NOT ASSESSED</p>`) +
    `</div>` +
    assumed +
    draft +
    annex +
    facts([
      [w.computedAt, `<bdi>${esc(run.producedAt.slice(0, 10))}</bdi>`],
      [w.reviewedBy, reviewer],
      [w.runId, `<bdi class="mono">${esc(run.runId)}</bdi>`],
    ]) +
    `<div class="cover-foot">${key}${contents}</div>` +
    `</section>`
  );
}

function plotSection(run: RunReport, L: Locale, sources: Sources): string {
  const w = WORDS[L];
  const edges = run.envelope.edges.map((e) => [
    `${e.seq + 1}`,
    esc(w.edge[e.classification] ?? e.classification) +
      (e.roadHierarchy === null ? '' : ` · ${esc(w.road[e.roadHierarchy] ?? e.roadHierarchy)}`),
    plain(e.lengthM, 'm', L),
    plain(e.appliedSetbackM, 'm', L),
  ]);
  const dims = run.envelope.dimensions.map((d) => [
    esc(say(d.label, L)),
    shown(d.value, L),
    esc(say(d.binding.label, L)),
    source(d.binding.citation, w, sources),
  ]);
  return (
    `<section class="page">${sectionHead(1, w)}` +
    facts([
      [w.community, esc(run.plot.community)],
      [w.landUse, esc(w.use[run.plot.landUse] ?? run.plot.landUse)],
      [w.areaStated, run.plot.statedAreaM2 === null ? chip(w.notOnPlan) : plain(run.plot.statedAreaM2, 'm²', L)],
      [w.areaComputed, plain(run.plot.computedAreaM2, 'm²', L)],
    ]) +
    (run.plot.areaMismatch ? `<p class="note">${esc(w.areaMismatch)}</p>` : '') +
    `<h3>${esc(w.boundaries)}</h3>` +
    table(w.boundaries, ['#', w.colEdge, w.colLength, w.colSetback], edges, 'num-cols') +
    `<h3>${esc(w.envelope)}</h3>` +
    table(w.envelope, [w.colDimension, w.colValue, w.colSetBy, w.colSource], dims) +
    `</section>`
  );
}

function gfaBlock(s: GfaStatementSection, L: Locale): string {
  const w = WORDS[L];
  const rows = s.rows.map((r) => [
    esc(w.row[r.kind]) + (r.levelIds.length === 0 ? '' : ` <span class="muted"><bdi>${esc(r.levelIds.length === 1 ? r.levelIds[0]! : `${r.levelIds[0]!}–${r.levelIds[r.levelIds.length - 1]!}`)}</bdi></span>`),
    r.perLevel ? `${shown(r.perLevel, L)} <bdi>× ${r.count}</bdi>` : '—',
    shown(r.area, L),
    // The column heading names the unit; the figure is still an area.
    plain(r.areaFt2, undefined, L, { measuredIn: 'ft²' }),
  ]);
  const omitted = s.omissions.map((m) => [esc(w.row[m.kind]), chip(w.notCounted), esc(say(m.reason, L)), '']);
  const notes = [...s.caps.flatMap((c) => c.notes), ...s.reconciliation];
  return (
    `<h3>${esc(w.gfaTitle)}</h3>` +
    facts([
      [w.fig.plotArea, `${plain(s.plotArea.m2, 'm²', L)} · ${plain(s.plotArea.ft2, 'ft²', L)}`],
      [w.allowed, `${shown(s.allowed, L)} · ${plain(s.allowedFt2, 'ft²', L)}`],
      [w.proposed, `${shown(s.proposed, L)} · ${plain(s.proposedFt2, 'ft²', L)}`],
      [w.remaining, `${shown(s.remaining, L)} · ${plain(s.remainingFt2, 'ft²', L)}`],
    ]) +
    table(w.gfaTitle, [w.colFloor, w.colPerLevel, w.colArea, w.colAreaFt], [...rows, ...omitted]) +
    (notes.length === 0 ? '' : `<ul class="notes">${notes.map((n) => `<li>${esc(say(n, L))}</li>`).join('')}</ul>`)
  );
}

function capacitySection(run: RunReport, L: Locale): string {
  const w = WORDS[L];
  const bands = run.capacity.bands.map((b) => [
    `<strong>${bandLetter(b.band)}</strong> · ${esc(say(b.label, L))}`,
    esc(say(b.question, L)),
    shown(b.gfa, L),
    b.governing ? `<span class="governs">${esc(w.governs)}</span>` : '',
  ]);
  const pif = run.parkingInFar;
  // The treatment, in words, marked as the class of the value that carries it:
  // "not counted in FAR", set by a named person — not the area it produces.
  const treatment = shown({ value: pif.treatment, renderHint: pif.value.renderHint }, L);
  return (
    `<section class="page">${sectionHead(2, w)}` +
    `<p class="lede">${esc(w.bandsLede)}</p>` +
    table(w.sections[1] ?? '', [w.colBand, w.colMeasures, w.colGfa, ''], bands, 'bands') +
    `<p class="note">${w.next(bandLetter(run.capacity.nextBindingBand), plain(run.capacity.headroomToNextM2, 'm²', L))} ` +
    `${w.granularity(plain(run.capacity.integerGranularityLossM2, 'm²', L))}</p>` +
    facts([
      [
        w.parkingInFar,
        `${treatment}${pif.declaredBy === null ? '' : ` <span class="muted">${esc(w.declaredBy(pif.declaredBy))}</span>`}`,
      ],
    ]) +
    (run.capacity.gfaStatement ? gfaBlock(run.capacity.gfaStatement, L) : '') +
    `</section>`
  );
}

function parkingSection(run: RunReport, o: StudyReportOptions, sources: Sources): string {
  const L = o.locale;
  const w = WORDS[L];
  const p = run.parking;
  // Two parking rules may cite the same table; it is named once.
  const ratios = [...new Set(p.ratioCitations.map((c) => source(c, w, sources)))].join(' · ');
  const required = fromGraph(run, 'parking.demand_at_governing_capacity');

  const levels = (o.building?.levels ?? []).flatMap((l) =>
    l.parking ? [[`<bdi>${esc(l.id)}</bdi> · ${esc(say(l.name, L))}`, shown(l.parking.bayCount, L)]] : [],
  );
  const module = o.building?.levels.find((l) => l.parking)?.parking?.module;

  const accessible = (
    [
      'parking.accessible_required',
      'parking.accessible_bays',
      'parking.preferred_required',
      'parking.accessible_farthest_m',
    ] as const
  ).flatMap((id) => {
    const v = fromGraph(run, id);
    return v ? [[esc(say(id, L)), shown(v, L)] as const] : [];
  });

  return (
    // Joined to the drawings' short introduction on paper, so it does not take a page of its own.
    `<section class="page joined">${sectionHead(3, w)}` +
    /*
      Required = the demand of the building this report describes. The resident,
      visitor and total rows below it belong to the PROBE — the largest scheme the
      envelope allows, which finds Band C — and used to be the only "required"
      on the page: plot 196 read 384 required against 297 provided, a shortage,
      for a scheme that needs 234. They stay, under their own heading.
    */
    (required
      ? `<h3>${esc(w.demand)}</h3>` +
        facts([[w.requiredAtAnswer, `${shown(required, L)}${ratios ? ` <span class="muted">${ratios}</span>` : ''}`]])
      : '') +
    `<h3>${esc(w.probeTitle)}</h3>` +
    `<p class="note">${esc(w.probeNote)}</p>` +
    facts([
      [w.resident, shown(p.residentBays, L)],
      [w.visitor, shown(p.visitorBays, L)],
      [w.totalRequired, `${shown(p.totalBays, L)}${!required && ratios ? ` <span class="muted">${ratios}</span>` : ''}`],
      [w.unitsSupported, shown(p.supportableUnitCeiling, L)],
    ]) +
    `<p class="note">${esc(say(p.podiumImplication, L))}</p>` +
    `<h3>${esc(w.supply)}</h3>` +
    (o.building === null
      ? `<p class="note">${chip(w.key.notAssessed)} ${esc(w.noModel)}</p>`
      : table(w.supply, [w.colLevel, w.colBays], [...levels, [`<strong>${esc(w.allLevels)}</strong>`, shown(o.building.drawnBays, L)]], 'num-cols') +
        (module ? `<p class="note">${esc(w.module(module.bayWidthM, module.bayLengthM, module.aisleWidthM))}</p>` : '')) +
    (accessible.length === 0 ? '' : `<h3>${esc(w.accessibleTitle)}</h3>${facts(accessible)}`) +
    `</section>`
  );
}

function drawingPages(o: StudyReportOptions): string {
  const w = WORDS[o.locale];
  const intro =
    `<section class="page drawings-intro">${sectionHead(4, w)}` +
    `<p class="lede">${esc(w.drawingsLede)}</p>` +
    (o.sheets.length === 0
      ? `<p class="note">${chip(w.key.notAssessed)} ${esc(w.noDrawings)}</p>`
      : `<p class="note">${esc(w.sheetCount(o.sheets.length))} ${esc(w.fullSize)}${w.drawingsInEnglish ? ` ${esc(w.drawingsInEnglish)}` : ''}</p>` +
        `<ol class="sheet-list">${o.sheets
          .map((s) => `<li><bdi class="mono">${esc(s.number)}</bdi> ${esc(say(s.title, o.locale))}</li>`)
          .join('')}</ol>`) +
    `</section>`;
  const pages = o.sheets
    .map(
      (s) =>
        `<section class="sheet-page" aria-label="${esc(`${s.number} ${say(s.title, o.locale)}`)}">` +
        `<p class="sheet-caption"><bdi class="mono">${esc(s.number)}</bdi> ${esc(say(s.title, o.locale))}</p>` +
        `<div class="sheet-frame" dir="ltr">${sheetSvg(s, `study-${s.id}`)}</div></section>`,
    )
    .join('');
  return intro + pages;
}

function assumptionsSection(run: RunReport, o: StudyReportOptions): string {
  const L = o.locale;
  const w = WORDS[L];
  const ordered = [...run.assumptions].sort((a, b) => a.rank - b.rank);
  const rows = ordered.map((a) => {
    const label = engineNote(a.label, L) ?? engineNote(a.parameterId, L) ?? a.label;
    return [
      `${a.rank}`,
      `<strong>${esc(label)}</strong>`,
      shown(a.value, L),
      esc(say(a.basis, L)),
      esc(say(a.impactStatement, L)),
    ];
  });
  const notModelled = o.building?.notModelled ?? [];
  return (
    `<section class="page">${sectionHead(5, w)}` +
    `<p class="lede">${esc(w.assumptionsLede)}</p>` +
    (rows.length === 0
      ? `<p class="note">${esc(w.noAssumptions)}</p>`
      : table(w.sections[4] ?? '', ['#', w.colAssumption, w.colValue, w.colBasis, w.colEffect], rows, 'assumptions', [
          '5%',
          '19%',
          '24%',
          '32%',
          '20%',
        ])) +
    (notModelled.length === 0
      ? ''
      : `<h3>${esc(w.notModelledTitle)}</h3><ul class="notes">${notModelled.map((n) => `<li>${esc(say(n, L))}</li>`).join('')}</ul>`) +
    `</section>`
  );
}

function checksSection(run: RunReport, L: Locale, sources: Sources): string {
  const w = WORDS[L];
  const passed = run.invariants.filter((i) => i.status === InvariantStatus.PASS).length;
  const notAssessed = run.invariants.filter((i) => i.status === InvariantStatus.NOT_ASSESSED).length;
  const invRows = run.invariants.map((i) => {
    const words = INVARIANT[i.invariantId];
    const result = w.result[i.status];
    return [
      `<bdi class="mono">${esc(i.invariantId)}</bdi>`,
      esc(words ? words[L] : i.statement),
      i.status === InvariantStatus.NOT_ASSESSED
        ? chip(result)
        : `<span class="${i.status === InvariantStatus.PASS ? 'pass' : 'muted'}">${esc(result)}</span>`,
    ];
  });
  const deferred = run.deferredChecks.map((c) => [
    esc(say(c.label, L)),
    chip(w.key.notAssessed),
    esc(say(c.reason, L)),
    source(c.citation, w, sources),
  ]);

  /*
    Two of the five lines are templates — "We encoded N of M…" — and the
    validator's detail is that template filled in. The reader is given the filled
    one; the verbatim line is printed beneath it, small and in English, so the
    statement §16.5 requires is on the page word for word.
  */
  const line = (key: keyof typeof CLAIM_STATEMENT_VERBATIM, status: ClaimStatus, detail: string): string => {
    const permanent = key === 'REGULATORY_VALIDITY';
    const verbatim = CLAIM_STATEMENT_VERBATIM[key];
    const template = /\b[NMKXY]\b/.test(verbatim) && detail !== '';
    return (
      `<div class="claim${permanent ? ' permanent' : ''}">` +
      `<p class="claim-name">${esc(w.claimNames[key])} · <span class="claim-status">${esc(w.status[status])}</span></p>` +
      `<p>${esc(say(template ? detail : verbatim, L))}</p>` +
      (L === 'en' && !template ? '' : `<p class="claim-en" lang="en" dir="ltr">${esc(verbatim)}</p>`) +
      (detail && !template ? `<p class="note">${esc(say(detail, L))}</p>` : '') +
      `</div>`
    );
  };

  return (
    `<section class="page">${sectionHead(6, w)}` +
    `<h3>${esc(w.checksTitle)}</h3>` +
    `<p class="note">${esc(w.checksLede(passed, notAssessed))}</p>` +
    table(w.checksTitle, ['', w.colCheck, w.colResult], invRows, 'checks') +
    `<h3>${esc(w.deferredTitle)}</h3>` +
    (deferred.length === 0
      ? `<p class="note">${esc(w.noDeferred)}</p>`
      : table(w.deferredTitle, [w.colRequirement, '', w.colWhy, w.colSource], deferred)) +
    `<h3>${esc(w.claimTitle)}</h3>` +
    line('SELF_CONSISTENCY', run.claim.selfConsistency.status, run.claim.selfConsistency.detail) +
    line('RULE_COVERAGE', run.claim.ruleCoverage.status, run.claim.ruleCoverage.detail) +
    line('GEOMETRIC_VALIDITY', run.claim.geometricValidity.status, run.claim.geometricValidity.detail) +
    // Permanent: printed from the constant, never from the run (§16.5).
    line('REGULATORY_VALIDITY', ClaimStatus.NEVER_CLAIMED, '') +
    line('PROFESSIONAL_AGREEMENT', run.claim.professionalAgreement.status, run.claim.professionalAgreement.detail) +
    `<h3>${esc(w.disclaimerTitle)}</h3><p class="note">${esc(say(run.disclaimer, L))}</p>` +
    `</section>`
  );
}

function sourcesSection(run: RunReport, L: Locale, sources: Sources): string {
  const w = WORDS[L];
  const rows = sources.all.map((c) => [
    `${esc(instrumentName(c, w))} <bdi class="muted">${esc(c.instrumentVersion)}</bdi>`,
    `<bdi>${esc(c.clauseReference)}</bdi>`,
    // Page 0 is a seed rule with no source page yet: a dash, not a page number.
    c.sourcePage > 0 ? `<bdi>${c.sourcePage}</bdi>` : '—',
  ]);
  const approval = run.ruleSet.approval === RuleSetApproval.DRAFT ? w.draft : w.approved;
  return (
    `<section class="page">${sectionHead(7, w)}` +
    (rows.length === 0 ? '' : `<h3>${esc(w.sourcesTitle)}</h3>${table(w.sourcesTitle, [w.colInstrument, w.colClause, w.colPage], rows)}`) +
    `<h3>${esc(w.runTitle)}</h3>` +
    facts([
      [w.runId, `<bdi class="mono">${esc(run.runId)}</bdi>`],
      [w.computedAt, `<bdi class="mono">${esc(run.producedAt)}</bdi>`],
      [w.engine, `<bdi class="mono">${esc(run.engineVersion)}</bdi>`],
      [w.ruleSet, `<bdi class="mono">${esc(run.ruleSet.ruleSetVersion)}</bdi> · ${esc(approval)}`],
      [
        w.annex,
        `<bdi class="mono">${esc(run.metricDefinitionsVersion)}</bdi>${unsignedAnnexNotice() === null ? '' : ` · ${esc(w.unsigned)}`}`,
      ],
    ]) +
    `<p class="note">${esc(w.jsonNote)}</p>` +
    `</section>`
  );
}

/*
  THE ANNEX, SO THE PRINTED STUDY HOLDS EVERYTHING (16 Oct 2026: «شامل كل شئ»).

  The sections above carry what a reader decides on; this carries what an
  auditor checks it against: every value a named person entered, every rule
  that set a value and every rule considered and not applied, and the
  definition of every area term the study used. All of it is the run's own
  record, printed — nothing here is computed. A rule's citation is printed
  beside it rather than added to section 7: those are the clauses the figures
  rest on, these are the ones the engine looked at.
*/
function annexSection(run: RunReport, o: StudyReportOptions): string {
  const L = o.locale;
  const w = WORDS[L];
  const name = (id: string): string => {
    const said = engineNote(id, L);
    return said === null ? `<bdi class="mono">${esc(id)}</bdi>` : esc(said);
  };
  // Quoted, not computed: an instrument's figure and the reader's own entry print as given.
  const valueOf = (value: string, unit: string | null): string =>
    NUMBER.test(value) ? plain(value, unit ?? undefined, L, { exact: true }) : esc(say(value, L));
  const cited = (c: Citation): string =>
    `<span class="cite">${esc(instrumentName(c, w))} <bdi>${esc(clauseNumber(c))}</bdi></span>`;

  const inputs = run.userInputs.map((u) => [
    name(u.parameterId),
    shown({ value: u.value, unit: u.unit ?? undefined, renderHint: RenderHint.USER_BADGE }, L, true),
    esc(u.enteredBy.name),
    `<bdi class="mono">${esc(u.enteredAt.slice(0, 10))}</bdi>`,
  ]);
  const applied = run.rules.applied.map((r) => [name(r.parameterId), valueOf(r.value, r.unit), cited(r.citation)]);
  const excluded = run.rules.excluded.map((r) => [
    name(r.parameterId),
    esc(w.disposition[r.disposition] ?? r.disposition),
    esc(say(r.reason, L)),
    cited(r.citation),
  ]);
  /* The sheet's own words stay as printed, in its language and direction: a translated quote is no longer a quote. */
  const notBound = (o.notBound ?? []).map((n) => {
    const stated = say(n.stated, L);
    return [
      name(n.field),
      stated === n.stated ? `<bdi dir="ltr" lang="en">${esc(stated)}</bdi>` : `<bdi>${esc(stated)}</bdi>`,
      esc(say(n.reason, L)),
    ];
  });
  const list = (items: readonly string[]): string =>
    items.length === 0 ? '—' : `<ul class="terms">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
  const definitions = run.areaTermsUsed.map((id) => {
    const d = metric(id);
    const ar = L === 'ar' ? METRIC_AR[id] : undefined;
    return [
      `${esc(ar?.name ?? d.name)}` + (d.approvalStatus === 'APPROVED' ? '' : `<div class="note">${esc(w.pending)}</div>`),
      esc(ar?.formula ?? d.formulaStatement),
      list(ar?.inclusions ?? d.inclusions),
      list(ar?.exclusions ?? d.exclusions),
    ];
  });

  return (
    `<section class="page">${sectionHead(8, w)}` +
    `<h3>${esc(w.inputsTitle)}</h3><p class="note">${esc(w.inputsLede)}</p>` +
    (inputs.length === 0
      ? `<p class="note">${esc(w.noInputs)}</p>`
      : table(w.inputsTitle, [w.colInput, w.colValue, w.colEnteredBy, w.colWhen], inputs, '', ['38%', '24%', '24%', '14%'])) +
    `<h3>${esc(w.rulesTitle)}</h3>` +
    `<p class="note">${esc(w.rulesLede(run.rules.applied.length, run.rules.excluded.length))}</p>` +
    table(w.rulesTitle, [w.colParameter, w.colValue, w.colSource], applied, '', ['44%', '22%', '34%']) +
    (excluded.length === 0
      ? ''
      : `<h3>${esc(w.excludedTitle)}</h3>` +
        table(w.excludedTitle, [w.colParameter, w.colOutcome, w.colWhy, w.colSource], excluded, '', ['26%', '16%', '36%', '22%'])) +
    (notBound.length === 0
      ? ''
      : `<h3>${esc(w.notBoundTitle)}</h3><p class="note">${esc(w.notBoundLede)}</p>` +
        table(w.notBoundTitle, [w.colField, w.colStated, w.colWhy], notBound, 'not-bound', ['24%', '30%', '46%'])) +
    `<h3>${esc(w.definitionsTitle)}</h3>` +
    `<p class="note">${esc(w.definitionsLede(run.metricDefinitionsVersion))}</p>` +
    table(w.definitionsTitle, [w.colTerm, w.colDefinition, w.colIncludes, w.colExcludes], definitions, 'definitions', [
      '20%',
      '30%',
      '27%',
      '23%',
    ]) +
    `</section>`
  );
}

// ---------------------------------------------------------------------------
// Stylesheet
// ---------------------------------------------------------------------------

/**
 * Inline, and with no web font: the document prints the same on a machine with
 * no network. The Arabic stack names faces Windows, macOS and most Linux images
 * carry. The amber treatment is the audit report's, unsoftened (§13.1).
 */
const STYLESHEET = `
:root {
  --ink: #14171c; --ink-2: #4a515c; --ink-3: #5f6672;
  --rule: #d5d9e0; --rule-strong: #7b8494;
  --paper: #ffffff; --surface: #f4f5f7; --accent: #1d3fa6;
  --assumed-bg: #fdf0d2; --assumed-ink: #5a3a00; --assumed-edge: #9a6b12;
  --user-bg: #e7edf8; --user-ink: #1c3b74; --user-edge: #4a6ea8;
  --variance-bg: #fbeceb; --variance-ink: #7a1a17; --variance-edge: #a4231f;
  --hatch: #9aa1ad; --pass-ink: #14532d;
  --font: "Segoe UI", "Inter", -apple-system, "Helvetica Neue", Arial, sans-serif;
  --font-ar: "Segoe UI", Tahoma, "Noto Sans Arabic", "Geeza Pro", "Arial", sans-serif;
  --mono: ui-monospace, "Cascadia Mono", Consolas, "Liberation Mono", monospace;
}
* { box-sizing: border-box; }
html { font-size: 15px; }
body { margin: 0; background: #e9ebef; color: var(--ink); font-family: var(--font); line-height: 1.5;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html[lang="ar"] body { font-family: var(--font-ar); line-height: 1.7; }
main { max-width: 210mm; margin: 0 auto; padding: 16px 0 48px; }
.page, .sheet-page { background: var(--paper); margin: 0 0 16px; padding: 18mm 16mm; box-shadow: 0 1px 3px rgba(0,0,0,.12); }
.sheet-page { padding: 8mm 10mm; }
h1 { font-size: 2.3rem; line-height: 1.15; margin: 10px 0 4px; letter-spacing: -0.01em; }
h2 { font-size: 1.35rem; margin: 0; }
h3 { font-size: 1rem; margin: 22px 0 8px; padding-bottom: 4px; border-bottom: 1px solid var(--rule); }
p { margin: 0 0 10px; }
a { color: inherit; }
.lede { color: var(--ink-2); max-width: 70ch; }
.note { font-size: 0.86rem; color: var(--ink-2); max-width: 78ch; }
.muted { color: var(--ink-3); font-size: 0.86em; }
.mono { font-family: var(--mono); font-size: 0.86em; overflow-wrap: anywhere; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

.masthead { display: flex; justify-content: space-between; gap: 12px; padding-bottom: 10px; border-bottom: 3px solid var(--ink);
  font-size: 0.8rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-2); }
html[lang="ar"] .masthead { text-transform: none; letter-spacing: 0; }
.brand { color: var(--ink); }
.community { color: var(--ink-2); font-size: 1.05rem; margin-bottom: 14px; }
.lead { font-size: 1.12rem; margin: 6px 0 18px; }
.tiles { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid var(--rule-strong); border-inline-start: 1px solid var(--rule-strong); margin-bottom: 18px; }
.tile { padding: 10px 12px; border-bottom: 1px solid var(--rule-strong); border-inline-end: 1px solid var(--rule-strong); min-height: 78px; break-inside: avoid; }
.tile-label { font-size: 0.74rem; color: var(--ink-2); font-weight: 600; }
.tile-value { font-size: 1.22rem; font-weight: 650; margin-top: 4px; }
.tile-value .unit { font-size: 0.72em; }
.tile-sub { font-size: 0.74rem; color: var(--ink-3); margin-top: 2px; }
.tile-sub .qty .num { font-weight: 500; }

.stamp { border: 2px solid var(--ink); padding: 10px 14px; margin: 0 0 12px; break-inside: avoid; }
.stamp p { margin: 0; }
.stamp-title { font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px !important; }
html[lang="ar"] .stamp-title { text-transform: none; letter-spacing: 0; }
.stamp-en, .claim-en { font-size: 0.72rem; color: var(--ink-3); margin-top: 4px !important; font-family: var(--font); }
.notice { border: 1px solid var(--rule-strong); background: var(--surface); padding: 8px 12px; margin: 0 0 10px; break-inside: avoid; font-size: 0.9rem; }
.notice p { margin: 0; }
.notice-title { font-weight: 650; margin-bottom: 2px !important; }
.notice-red { border: 2px solid var(--variance-edge); background: var(--variance-bg); color: var(--variance-ink); }
.notice-amber { border: 2px solid var(--assumed-edge); background: var(--assumed-bg); color: var(--assumed-ink); }

.facts { margin: 0 0 8px; }
.facts > div { display: grid; grid-template-columns: 58mm 1fr; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--rule); break-inside: avoid; }
.facts dt { font-size: 0.82rem; font-weight: 600; color: var(--ink-2); }
.facts dd { margin: 0; }

.cover-foot { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 18px; }
.key-title { font-size: 0.8rem; font-weight: 650; color: var(--ink-2); margin-bottom: 6px; }
.key ul, .contents ol { margin: 0; padding-inline-start: 18px; font-size: 0.86rem; }
.key ul { list-style: none; padding: 0; }
.key li { margin: 0 0 6px; }
.contents li { margin: 0 0 3px; }
.contents a { text-decoration: none; }

.sec-head { display: flex; align-items: baseline; gap: 10px; padding-bottom: 8px; border-bottom: 3px solid var(--ink); margin-bottom: 14px; }
.sec-n { font-size: 1.35rem; font-weight: 700; color: var(--accent); }

.qty { font-variant-numeric: tabular-nums; white-space: nowrap; }
.qty .num { font-weight: 600; }
.qty .unit { font-weight: 400; color: var(--ink-2); }
.glyph { font-size: 0.72em; margin-inline-end: 0.28em; }
.v-assumed { background: var(--assumed-bg); color: var(--assumed-ink); border-bottom: 2px dotted var(--assumed-edge); padding: 1px 4px 0; }
.v-user { background: var(--user-bg); color: var(--user-ink); border-bottom: 2px solid var(--user-edge); padding: 1px 4px 0; }
.v-variance { background: var(--variance-bg); color: var(--variance-ink); border: 2px solid var(--variance-edge); padding: 0 4px; }
.badge { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; border: 1px solid var(--user-edge); padding: 0 3px; margin-inline-start: 5px; vertical-align: 0.12em; }
.chip { display: inline-block; font-size: 0.72rem; font-weight: 650; border: 1px solid var(--rule-strong); padding: 1px 6px; color: var(--ink-2); white-space: nowrap; }
.hatched { background-color: var(--surface); }
.hatched::before { content: ""; display: inline-block; width: 14px; height: 0.74em; margin-inline-end: 6px; vertical-align: -0.08em;
  border: 1px solid var(--rule-strong); background-color: var(--paper);
  background-image: repeating-linear-gradient(45deg, transparent 0 3px, var(--hatch) 3px 4px); }
.governs { display: inline-block; font-size: 0.72rem; font-weight: 700; color: var(--paper); background: var(--ink); padding: 1px 7px; }
.pass { color: var(--pass-ink); font-weight: 650; }
.cite { font-size: 0.82rem; color: var(--ink-2); }

table { width: 100%; border-collapse: collapse; margin: 6px 0 14px; font-size: 0.86rem; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
th, td { text-align: start; vertical-align: top; padding: 6px 8px; border-bottom: 1px solid var(--rule); }
thead th { font-size: 0.74rem; font-weight: 650; color: var(--ink-2); border-bottom: 1px solid var(--rule-strong); background: var(--surface); }
tbody th { font-weight: 500; }
table.assumptions { table-layout: fixed; }
table.assumptions td:nth-child(4), table.assumptions td:nth-child(5) { font-size: 0.8rem; color: var(--ink-2); }
table.assumptions .qty { white-space: normal; }
ul.notes { margin: 6px 0 0; padding-inline-start: 18px; font-size: 0.82rem; color: var(--ink-2); }
ul.notes li { margin-bottom: 4px; }
table.definitions { table-layout: fixed; }
table.definitions td { font-size: 0.8rem; }
ul.terms { margin: 0; padding-inline-start: 16px; }
ul.terms li { margin-bottom: 2px; }

.claim { border-top: 1px solid var(--rule-strong); padding: 8px 0; break-inside: avoid; }
.claim p { margin: 0 0 4px; }
.claim-name { font-weight: 700; }
.claim-status { font-weight: 600; color: var(--ink-2); }
.claim.permanent { border: 2px solid var(--ink); padding: 8px 12px; }

.sheet-list { columns: 2; font-size: 0.9rem; padding-inline-start: 18px; }
.sheet-caption { font-weight: 650; margin: 0 0 6px; }
.sheet-frame svg { display: block; width: 100%; height: auto; border: 1px solid var(--rule); }

.end-footer { font-size: 0.7rem; color: var(--ink-2); display: flex; flex-wrap: wrap; gap: 4px 16px; padding: 0 16mm; }

@media print {
  @page { size: A4; margin: 14mm 14mm 18mm; }
  /* A3 at full size: reduced to A4, the sheets' lettering fell under 1.8 mm. */
  @page sheet { size: 420mm 297mm; margin: 0; }
  html { font-size: 10pt; }
  body { background: var(--paper); }
  main { max-width: none; padding: 0; }
  .page, .sheet-page { margin: 0; padding: 0; box-shadow: none; break-after: page; }
  .sheet-page { page: sheet; }
  .page.joined { break-after: auto; }
  /* The last section ends the document: a break after it would leave the closing line alone on a blank page. */
  main > section:last-child { break-after: auto; }
  .drawings-intro { margin-top: 10mm; break-inside: avoid; }
  /* The sheet's own strip names it; a caption would push it onto a second page. */
  .sheet-caption { display: none; }
  /* A hair under the page, so rounding cannot push a sheet onto a second page. */
  .sheet-frame svg { border: none; width: 420mm; height: 296.8mm; margin: 0; }
  .end-footer { padding: 0; }
}
@media (max-width: 760px) {
  .page, .sheet-page { padding: 16px; }
  .tiles { grid-template-columns: repeat(2, 1fr); }
  .facts > div, .cover-foot { grid-template-columns: 1fr; }
}
`;

/*
  A CSS string inside a <style> element. The HTML parser ends that element at the
  first `</style`, whatever CSS thinks of it, so `<` and `>` are written as CSS
  escapes: a plot number of `</style><script>…` is otherwise markup in the report.
  The footer carries the plot number, which the reader types.
*/
const cssString = (text: string): string =>
  `"${text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/</g, '\\3c ')
    .replace(/>/g, '\\3e ')
    .replace(/&/g, '\\26 ')
    .replace(/[\r\n]+/g, ' ')}"`;

/** The running footer, on every printed page of both page kinds. Margin boxes take no custom properties. */
function pageFooter(run: RunReport, w: Words): string {
  const box = 'font-family: "Segoe UI", Tahoma, Arial, sans-serif; font-size: 7pt; color: #4a515c;';
  const left = `Plotlogic.dev · Plot ${run.plot.plotNumber} · Run ${run.runId.slice(0, 8)}`;
  const boxes =
    `@bottom-left { content: ${cssString(left)}; ${box} } ` +
    `@bottom-right { content: "REGULATORY VALIDITY: NOT ASSESSED   ·   " ${cssString(w.page)} " " counter(page) " " ${cssString(w.of)} " " counter(pages); ${box} }`;
  // Declared on `@page sheet` too, though a full-size drawing page has no margin
  // to show it in: should that page ever gain one, the stamp is already there.
  // Until then the sheet's own title strip carries the plot, the run and the stamp.
  return `@media print { @page { ${boxes} } @page sheet { ${boxes} } }`;
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

/**
 * The study report: cover, plot and envelope, capacity, parking, the drawings,
 * the assumptions and limits, the checks and the claim statement, and the
 * clauses cited — in the reader's language, as one self-contained page that the
 * browser prints to PDF.
 *
 * @throws whatever `assertEmittable` throws: a failed invariant, a claimed
 *   regulatory validity, an annex mismatch, an undefined area term.
 */
export function studyReportHtml(run: RunReport, options: StudyReportOptions): string {
  assertEmittable(run);
  const L = options.locale;
  const w = WORDS[L];
  const sources = new Sources();
  sources.add(run.capacity.governingConstraint.citation);

  const body = [
    cover(run, options),
    plotSection(run, L, sources),
    capacitySection(run, L),
    parkingSection(run, options, sources),
    drawingPages(options),
    assumptionsSection(run, options),
    checksSection(run, L, sources),
  ].join('');
  // After the sections, so it lists every clause they cited; the annex prints its own beside each rule.
  const end = sourcesSection(run, L, sources) + annexSection(run, options);

  const title = `${w.docType} — ${w.plot(run.plot.plotNumber)}, ${run.plot.community}`;
  return (
    `<!doctype html>` +
    `<html lang="${L}" dir="${L === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>${esc(title)}</title>` +
    `<style>${STYLESHEET}${pageFooter(run, w)}</style></head>` +
    `<body><main id="main">${body}${end}</main>` +
    `<footer class="end-footer"><span dir="ltr">Run <span class="mono">${esc(run.runId)}</span></span>` +
    `<span>REGULATORY VALIDITY: NOT ASSESSED</span></footer>` +
    `</body></html>`
  );
}
