import type { Reader, Said } from './engine-notes.js';

/*
  THE TOWER ROW AND THE PODIUM ROW, IN THE READER'S LANGUAGE (17 Oct 2026).

  An affection plan prints two setback schedules and two coverages — the ground
  floor and podium's, and the tower's — and the engine now binds both, each to
  its own parameter. What it cannot bind it says, and what it asks it asks in a
  sentence: which face a road is when the plot has two, which neighbour is the
  rear, which façade the podium has. Every one of those sentences reaches a
  reader — on the plot step, under a refusal, in the register and in the
  study's annex — so each is recognised here by its fixed wording, its figures
  lifted from the engine's own text, and said in both languages.

  The sentences are written in `packages/rules/src/instruments/sheet.ts` and
  `packages/capacity/src/envelope.ts`; this package may not import either, so
  `apps/api/test/tower-words.test.ts` holds them to this file from outside.
*/

const exact =
  (map: Readonly<Record<string, Said>>): Reader =>
  (t) =>
    map[t] ?? null;

/** A face as `facesSaid` and `faceOptionsFor` name it: front, side, rear, or one of them with the sheet's condition. */
const FACE_AR: Readonly<Record<string, string>> = { front: 'الأمامي', side: 'الجانبي', rear: 'الخلفي' };

/** "front 0 m; side 3 m; rear not stated" — the faces a decision offers, as the engine lists them. */
function facesAr(list: string): string {
  return list
    .split('; ')
    .map((part) => {
      const m = /^(front|side|rear)(.*?) (not stated|[\d.]+ m)$/.exec(part);
      if (!m) return part;
      const figure = m[3] === 'not stated' ? 'غير محدد' : (m[3] ?? '').replace(/ m$/, ' م');
      // A condition ("to solid wall") is the sheet's own wording, kept as printed.
      return `${FACE_AR[m[1] ?? ''] ?? m[1]}${m[2] ?? ''} ${figure}`;
    })
    .join('؛ ');
}

/** The field each limit the engine did not bind is reported under (`UnboundLimit.field`). */
export const NOT_BOUND_FIELD: Readonly<Record<string, Said>> = {
  gfaSqm: { en: 'Gross floor area', ar: 'المساحة الطابقية الإجمالية' },
  'setbacks.tower.front': { en: 'Tower setback, front', ar: 'ارتداد البرج، الحد الأمامي' },
  'setbacks.tower.side': { en: 'Tower setback, sides', ar: 'ارتداد البرج، الحدود الجانبية' },
  'setbacks.tower.rear': { en: 'Tower setback, rear', ar: 'ارتداد البرج، الحد الخلفي' },
  'setbacks.tower.side_and_rear': { en: 'Tower setback, sides and rear', ar: 'ارتداد البرج، الجوانب والخلف' },
  'setbacks.front': { en: 'Ground floor and podium setback, front', ar: 'ارتداد الأرضي والبوديوم، الحد الأمامي' },
  'setbacks.side': { en: 'Ground floor and podium setback, sides', ar: 'ارتداد الأرضي والبوديوم، الحدود الجانبية' },
  'setbacks.rear': { en: 'Ground floor and podium setback, rear', ar: 'ارتداد الأرضي والبوديوم، الحد الخلفي' },
  'setbacks.side_and_rear': {
    en: 'Ground floor and podium setback, sides and rear',
    ar: 'ارتداد الأرضي والبوديوم، الجوانب والخلف',
  },
};

/** Parameters the two rows bind, by id — the annex and the register name rules by these. */
const PARAMETERS: Readonly<Record<string, Said>> = {
  'tower_coverage.max': { en: 'Tower coverage, maximum', ar: 'تغطية البرج، الحد الأقصى' },
  'setback.podium.road': { en: 'Podium setback from a road', ar: 'ارتداد البوديوم عن الطريق' },
  'setback.podium.adjacent_plot': {
    en: 'Podium setback from a neighbouring plot',
    ar: 'ارتداد البوديوم عن القطعة المجاورة',
  },
  'setback.podium.open_space': { en: 'Podium setback from open space', ar: 'ارتداد البوديوم عن المساحة المفتوحة' },
  'setback.podium.other': { en: 'Podium setback from another boundary', ar: 'ارتداد البوديوم عن حد آخر' },
  'envelope.tower_coverage_cap': { en: 'Tower coverage cap', ar: 'حد تغطية البرج' },
  'envelope.tower_coverage_pct': { en: 'Tower coverage', ar: 'تغطية البرج' },
};

/** Why a limit was not bound, as the sheet binder writes it. */
const REASONS: readonly Reader[] = [
  (t) =>
    t.startsWith('The sheet states the tower setback by face, and a plot with more than one road boundary')
      ? {
          en: 'The sheet gives the tower setback by face, and with more than one road it does not say which road is the front. The run asks which face each road is rather than choosing.',
          ar: 'المخطط يحدد ارتداد البرج حسب الواجهة، ومع وجود أكثر من طريق لا يذكر أي طريق هو الأمامي. الدراسة تسأل عن واجهة كل طريق بدل أن تختار.',
        }
      : null,
  (t) =>
    t.startsWith('The sheet states a different tower setback for the side and for the rear')
      ? {
          en: 'The sheet gives the tower a different setback for the sides and the rear, and does not say which neighbour is the rear. The run asks which face each neighbour is rather than applying either figure to both.',
          ar: 'المخطط يحدد للبرج ارتدادا للجوانب يختلف عن الخلف، ولا يذكر أي جار هو الخلفي. الدراسة تسأل عن واجهة كل جار بدل تطبيق أحد الرقمين على الاثنين.',
        }
      : null,
  (t) =>
    t.startsWith('The sheet states a different podium setback for the side and for the rear')
      ? {
          en: 'The sheet gives the podium a different setback for the sides and the rear, and does not say which neighbour is the rear. Applying either figure to both would choose for the reader.',
          ar: 'المخطط يحدد للبوديوم ارتدادا للجوانب يختلف عن الخلف، ولا يذكر أي جار هو الخلفي. تطبيق أحد الرقمين على الاثنين اختيار نيابة عن القارئ.',
        }
      : null,
  (t) =>
    t.startsWith('The sheet makes this setback depend on the façade')
      ? {
          en: 'The sheet makes this setback depend on the façade, which is a design decision. Collapsing it to one figure would choose the façade for the applicant, so it stays a decision.',
          ar: 'المخطط يجعل هذا الارتداد مرتبطا بنوع الواجهة، وهذا قرار تصميمي. اختزاله في رقم واحد يختار الواجهة نيابة عن المالك، فيبقى قرارا.',
        }
      : null,
  (t) =>
    t.startsWith('The sheet prints a FAR, which binds; its GFA is checked against FAR × plot area')
      ? {
          en: 'The sheet prints a FAR, which binds; its GFA is checked against FAR × plot area rather than set as a second ceiling.',
          ar: 'المخطط يطبع معامل بناء ملزما؛ وتقارن مساحته الطابقية بناتج معامل البناء × مساحة القطعة بدل أن تكون حدا ثانيا.',
        }
      : null,
  (t) =>
    t.startsWith('The sheet prints a GFA and no plot area to divide it by')
      ? {
          en: 'The sheet prints a GFA and no plot area to divide it by, so no FAR could be taken from it. Enter the FAR under a named user.',
          ar: 'المخطط يطبع مساحة طابقية بلا مساحة قطعة يقسم عليها، فلا يؤخذ منه معامل بناء. يدخل المعامل باسم مستخدم محدد.',
        }
      : null,
  (t) => {
    const m = /^side ([\d.]+) m, rear ([\d.]+) m$/.exec(t);
    return m ? { en: t, ar: `الجانبي ${m[1]} م، الخلفي ${m[2]} م` } : null;
  },
];

/** The sentences the envelope halts or asks with, and the assumption it records under the podium statement. */
const ENVELOPE: readonly Reader[] = [
  (t) => {
    const m = /^edge (\d+): the affection plan sets the podium back ([\d.]+) m on this boundary and the tower stands on the podium, so a tower setback of ([\d.]+) m cannot be built\. Type at least ([\d.]+) m, or clear the value\.$/.exec(t);
    return m
      ? {
          en: `Edge ${m[1]}: the affection plan sets the podium back ${m[2]} m here and the tower stands on the podium, so a ${m[3]} m tower setback cannot be built. Type at least ${m[4]} m, or clear it.`,
          ar: `الحد ${m[1]}: مخطط الأفكشن يرد البوديوم ${m[2]} م هنا والبرج قائم فوق البوديوم، فلا يمكن بناء ارتداد برج ${m[3]} م. اكتب ${m[4]} م على الأقل، أو امسح القيمة.`,
        }
      : null;
  },
  (t) => {
    const m = /^edge (\d+): a typed tower setback of ([\d.]+) m is none of the figures the affection plan states by face \((.*)\)\. Type the figure for the face this boundary is\.$/.exec(t);
    return m
      ? {
          en: `Edge ${m[1]}: ${m[2]} m is none of the tower setbacks the affection plan gives by face (${m[3]}). Type the figure for this boundary's face.`,
          ar: `الحد ${m[1]}: ${m[2]} م ليس من ارتدادات البرج التي يحددها مخطط الأفكشن حسب الواجهة (${facesAr(m[3] ?? '')}). اكتب رقم الواجهة التي يقع عليها هذا الحد.`,
        }
      : null;
  },
  (t) => {
    const m = /^edge (\d+): the affection plan states a tower setback of ([\d.—]+) m for this boundary \("([\s\S]*)"\), and a typed ([\d.]+) m may not replace it\. Clear the typed value, or type ([\d.—]+) m\.$/.exec(t);
    return m
      ? {
          en: `Edge ${m[1]}: the affection plan gives a ${m[2]} m tower setback here ("${m[3]}"), and a typed ${m[4]} m may not replace it. Clear it, or type ${m[5]} m.`,
          ar: `الحد ${m[1]}: مخطط الأفكشن يحدد ارتداد البرج ${m[2]} م هنا («${m[3]}»)، ولا تحل محله قيمة مكتوبة ${m[4]} م. امسحها، أو اكتب ${m[5]} م.`,
        }
      : null;
  },
  (t) => {
    const m = /^edge (\d+): the affection plan states the tower setback by face \((.*)\) and does not say which face this boundary is\. Type the figure for the face it is on the plot step\.$/.exec(t);
    return m
      ? {
          en: `Edge ${m[1]}: the affection plan gives the tower setback by face (${m[2]}) and does not say which face this boundary is. Type its face's figure on the plot step.`,
          ar: `الحد ${m[1]}: مخطط الأفكشن يحدد ارتداد البرج حسب الواجهة (${facesAr(m[2] ?? '')}) ولا يذكر أي واجهة هذا الحد. اكتب رقم واجهته في خطوة القطعة.`,
        }
      : null;
  },
  (t) => {
    const m = /^podium setback on edges ([\d, ]+), where the affection plan leaves a choice$/.exec(t);
    return m
      ? {
          en: `Podium setback on edges ${m[1]}, where the affection plan leaves a choice`,
          ar: `ارتداد البوديوم على الحدود ${(m[1] ?? '').replace(/, /g, '، ')}، حيث يترك مخطط الأفكشن خيارا`,
        }
      : null;
  },
  (t) => {
    const m = /^The affection plan sets the podium back by façade on edges ([\d, ]+) \((.*)\)\. The podium is taken as a solid wall there, ([\d.]+) m, because (.+)'s statement (\S+) puts the podium on the boundary\. A window wall would need ([\d.]+) m\.$/.exec(t);
    return m
      ? {
          en: `The affection plan sets the podium back by façade on edges ${m[1]} (${m[2]}). It is taken as a solid wall, ${m[3]} m, because ${m[4]}'s statement ${m[5]} puts the podium on the boundary. A window wall would need ${m[6]} m.`,
          ar: `مخطط الأفكشن يحدد ارتداد البوديوم حسب نوع الواجهة على الحدود ${(m[1] ?? '').replace(/, /g, '، ')} (${facesAr(m[2] ?? '')}). أخذ جدارا مصمتا، ${m[3]} م، لأن إفادة ${m[4]} ${m[5]} تضع البوديوم على حد القطعة. الواجهة ذات النوافذ تحتاج ${m[6]} م.`,
        }
      : null;
  },
  (t) => {
    const m = /^The affection plan states a different podium setback for the side and for the rear \((.*)\), and which boundary is the rear is not on the sheet\. The larger, ([\d.]+) m, is taken on edges ([\d, ]+), so the podium is drawn inside both lines\.$/.exec(t);
    return m
      ? {
          en: `The affection plan gives the podium a different setback for the sides and the rear (${m[1]}), and does not say which boundary is the rear. The larger, ${m[2]} m, is taken on edges ${m[3]}, so the podium stands inside both lines.`,
          ar: `مخطط الأفكشن يحدد للبوديوم ارتدادا للجوانب يختلف عن الخلف (${facesAr(m[1] ?? '')})، ولا يذكر أي حد هو الخلفي. أخذ الأكبر، ${m[2]} م، على الحدود ${(m[3] ?? '').replace(/, /g, '، ')}، فيقع البوديوم داخل الخطين.`,
        }
      : null;
  },
];

export const TOWER_READERS: readonly Reader[] = [exact(PARAMETERS), exact(NOT_BOUND_FIELD), ...REASONS, ...ENVELOPE];
