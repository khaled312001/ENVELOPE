import type { RunRequestBody } from '@web/api/client.js';
import worked from '@web/screens/worked-example.json' with { type: 'json' };

/*
  THE STUDY AS THE STUDIO HOLDS IT BEFORE THE ENGINE HAS SEEN IT.

  Everything here is what the reader typed, as strings. Nothing is a number the
  engine produced, so nothing here is shown as a figure: the plot's area, its
  boundary lengths and every capacity come back from the API, traced.
*/

export type EdgeClass = 'ROAD' | 'ADJACENT_PLOT' | 'OPEN_SPACE' | 'OTHER' | '';
export type Hierarchy = 'ARTERIAL' | 'COLLECTOR' | 'LOCAL' | 'ACCESS' | '';

export interface DraftPlot {
  readonly plotNumber: string;
  readonly community: string;
  readonly vertices: readonly { readonly x: string; readonly y: string }[];
  readonly edges: readonly {
    readonly classification: EdgeClass;
    readonly roadHierarchy: Hierarchy;
    /**
     * The TOWER setback the reader typed for this boundary, metres. Blank uses the
     * affection plan's or the general rule's. Not part of the plot: it is sent
     * with the run, so changing it never un-files the plot.
     */
    readonly towerSetback?: string;
  }[];
}

/** The plot as the engine files it — everything but the typed tower setbacks. */
export function plotIdentity(d: DraftPlot): string {
  return JSON.stringify({
    ...d,
    edges: d.edges.map((e) => ({ classification: e.classification, roadHierarchy: e.roadHierarchy })),
  });
}

/** The typed tower setbacks, as the run sends them. A blank or unreadable box sends nothing. */
export function typedSetbacksOf(d: DraftPlot): readonly { edgeSeq: number; metres: string }[] {
  return d.edges.flatMap((e, edgeSeq) => {
    const v = e.towerSetback?.trim() ?? '';
    return /^\d+(\.\d+)?$/.test(v) ? [{ edgeSeq, metres: v }] : [];
  });
}

export const PODIUM_SETBACK_STATEMENT_ID = 'STMT-PODIUM-SETBACK-2026-10-16';

/* Half a metre after every three bays, for the columns (Eng. Mohamed, 16 Oct 2026), sent under his statement. */
export const COLUMN_GAP_STATEMENT_ID = 'STMT-COLUMN-GAP-2026-10-16';

export const EMPTY_PLOT: DraftPlot = {
  plotNumber: '',
  community: '',
  vertices: [
    { x: '0', y: '0' },
    { x: '', y: '' },
    { x: '', y: '' },
    { x: '', y: '' },
  ],
  edges: [0, 1, 2, 3].map(() => ({ classification: '' as EdgeClass, roadHierarchy: '' as Hierarchy })),
};

export interface MixRow {
  readonly typeId: string;
  readonly label: string;
  readonly share: string;
  readonly nsaM2: string;
}

/*
  TWO QUESTIONS THIS STUDIO NO LONGER ASKS, AND WHAT IS SENT INSTEAD.

  Eng. Mohamed, 16 Oct 2026: «الغي اول سؤال بتاع parking in FAR لا دايما
  مبيتحسبش» and «ال سوال التاني بتاع saleable area مش هيكون في المرحله دي».

  Parking-in-FAR is sent as his recorded statement, by id — so the run carries
  USER_SET by Eng. Mohamed, quoted, never a default nobody owns (FR-DEF-002).
  The server refuses an id whose recorded answer differs from the one sent.

  The saleable share is sent ASSUMED, with the basis below, and it is amber in
  the run's assumptions like every other filled gap.
*/
export const PARKING_IN_FAR_STATEMENT_ID = 'STMT-PARKING-IN-FAR-2026-09-28';

export const SALEABLE_ASSUMED = '0.95';
export const SALEABLE_BASIS =
  'not asked in this phase: Eng. Mohamed deferred the saleable question on 16 Oct 2026. ' +
  '0.95 is the middle of the 93–97% of GFA a Dubai developer brief on file expects. It ' +
  'moves the unit count, and through it the parking required, one for one.';

export interface RulesForm {
  readonly basements: string;
  readonly groundIsParking: '' | 'yes' | 'no';
  readonly podiumAboveGround: string;
  readonly podiumParkingLevels: string;
  /** Blank is not zero: the engine assumes a core and says so, in amber. */
  readonly coreArea: string;
  readonly mix: readonly MixRow[];
  readonly mixSource: 'USER_SET' | 'ASSUMED';
  /**
   * The project brief the reader chose for this plot, or '' for none. Opens at ''
   * on every study: a brief is offered with a button and never chosen for the
   * reader (FR-DEF-002's "no default", applied to a developer's document).
   */
  readonly projectBriefId: string;
}

/*
  THE ONE PREFILLED ANSWER, AND IT IS SENT AS WHAT IT IS.

  A generic mix travels as ASSUMED with a basis that says nobody entered it, and
  it is amber in every view of the run. Editing any cell turns it into the
  reader's own mix. Copied from the current site's rules step word for word, so
  the two front ends send the same assumption under the same basis.
*/
export const DEFAULT_MIX: readonly MixRow[] = [
  { typeId: '1BED', label: '1 bedroom', share: '0.5', nsaM2: '70' },
  { typeId: '2BED', label: '2 bedroom', share: '0.375', nsaM2: '110' },
  { typeId: '3BED', label: '3 bedroom', share: '0.125', nsaM2: '160' },
];

export const DEFAULT_MIX_BASIS =
  'a generic Dubai apartment mix, used because no developer standard was selected. ' +
  'Nobody entered these areas — they are a stand-in, and they move the unit count ' +
  'directly. Select a developer standard, or enter the mix this scheme is priced on.';

export const USABLE_FRACTION_BASIS =
  'the fraction of a parking level left for bays and aisles once cores, ramps and ' +
  'plant are taken out. No cited rule fixes it.';

/*
  The three level counts open at 0, visibly, with a − and a + beside each
  (Eng. Mohamed, 16 Oct 2026: «خلي يكون في رقم 0 جاهز و انا ازود او انقص»).
  A zero on the screen is a stated schedule, not a hidden one. Whether the
  ground floor is parking still opens unanswered.
*/
export const EMPTY_RULES: RulesForm = {
  basements: '0',
  groundIsParking: '',
  podiumAboveGround: '0',
  podiumParkingLevels: '0',
  coreArea: '',
  mix: DEFAULT_MIX,
  mixSource: 'ASSUMED',
  projectBriefId: '',
};

/** The worked example's request, exactly as `worked-example.json` records it. */
export function exampleStudy(): { plot: DraftPlot; rules: RulesForm } {
  const p = worked.input.plot;
  const r = worked.input.run;
  return {
    plot: {
      plotNumber: p.plotNumber,
      community: p.community,
      vertices: p.vertices,
      edges: p.edges.map((e) => ({
        classification: e.classification as EdgeClass,
        roadHierarchy: ((e as { roadHierarchy?: string }).roadHierarchy ?? '') as Hierarchy,
      })),
    },
    rules: {
      basements: String(r.levels.basements),
      groundIsParking: r.levels.groundIsParking ? 'yes' : 'no',
      podiumAboveGround: String(r.levels.podiumAboveGround),
      podiumParkingLevels: String(r.levels.podiumParkingLevels),
      coreArea: '',
      mix: r.unitMix.entries,
      mixSource: 'USER_SET',
      projectBriefId: '',
    },
  };
}

const DECIMAL = /^\d+(\.\d+)?$/;
const INTEGER = /^\d+$/;

export interface RulesProblems {
  readonly levels?: 'missing' | 'format' | 'podium';
  readonly coreArea?: true;
  readonly mix?: 'format' | 'total';
}

/** Step a whole-number field by ±1, never below 0. A field that is not a whole number starts from 0. */
export function stepCount(value: string, delta: 1 | -1): string {
  const n = INTEGER.test(value.trim()) ? Number(value.trim()) : 0;
  return String(Math.max(0, n + delta));
}

/** What still stops the run. Each problem is a question the reader has not answered, not a default to fill. */
export function rulesProblems(f: RulesForm): RulesProblems {
  const p: { -readonly [K in keyof RulesProblems]: RulesProblems[K] } = {};
  const ints = [f.basements, f.podiumAboveGround, f.podiumParkingLevels];
  if (ints.some((x) => x.trim() === '') || f.groundIsParking === '') p.levels = 'missing';
  else if (ints.some((x) => !INTEGER.test(x.trim()))) p.levels = 'format';
  else if (Number(f.podiumParkingLevels) > Number(f.podiumAboveGround)) p.levels = 'podium';
  if (f.coreArea.trim() !== '' && !DECIMAL.test(f.coreArea.trim())) p.coreArea = true;
  if (f.mix.length === 0 || f.mix.some((m) => !DECIMAL.test(m.share.trim()) || !DECIMAL.test(m.nsaM2.trim()) || m.label.trim() === '')) p.mix = 'format';
  return p;
}

export function requestBody(
  plotId: string,
  f: RulesForm,
  chosenAccessEdgeSeq?: number,
  typedSetbacks: readonly { edgeSeq: number; metres: string }[] = [],
): RunRequestBody {
  const levels = {
    basements: Number(f.basements),
    groundIsParking: f.groundIsParking === 'yes',
    podiumAboveGround: Number(f.podiumAboveGround),
    podiumParkingLevels: Number(f.podiumParkingLevels),
  };
  return {
    plotId,
    parkingInFar: 'EXCLUDED_FROM_FAR',
    parkingInFarStatementId: PARKING_IN_FAR_STATEMENT_ID,
    // Basements, ground and podium on the boundary unless the sheet says otherwise (Eng. Mohamed, 16 Oct 2026).
    podiumSetbackStatementId: PODIUM_SETBACK_STATEMENT_ID,
    columnGapStatementId: COLUMN_GAP_STATEMENT_ID,
    ...(typedSetbacks.length ? { typedSetbacks } : {}),
    unitMix:
      f.mixSource === 'ASSUMED'
        ? { source: 'ASSUMED', entries: f.mix, basis: DEFAULT_MIX_BASIS }
        : { source: 'USER_SET', entries: f.mix.map((m) => ({ ...m, typeId: m.typeId || m.label.toUpperCase().replace(/\W+/g, '_') })) },
    // Required by the contract and held by every stored run; the schedule below wins on the server.
    parkingLevelsAvailable: levels.basements + (levels.groundIsParking ? 1 : 0) + levels.podiumParkingLevels,
    levels,
    ...(f.coreArea.trim() === '' ? {} : { coreAreaM2: f.coreArea.trim() }),
    ...(chosenAccessEdgeSeq === undefined ? {} : { chosenAccessEdgeSeq }),
    // Only when the reader pressed "Use this brief"; '' sends nothing and takes nothing from any brief.
    ...(f.projectBriefId === '' ? {} : { projectBriefId: f.projectBriefId }),
    parkingUsableFraction: { value: '0.85', source: 'ASSUMED', basis: USABLE_FRACTION_BASIS },
    saleableEfficiency: { value: SALEABLE_ASSUMED, source: 'ASSUMED', basis: SALEABLE_BASIS },
    realismDiscount: '1.00',
    /*
      Still sent (17 Oct 2026): every seed rule is DRAFT and nothing approved exists to
      load instead. What changed is the server's side of it: on a plot with its own
      sheet, the seed's placeholder FAR, coverage, plate and height are set aside and
      listed, and a limit the sheet omits refuses the run in a sentence.
    */
    useDraftRules: true,
  };
}

/** Recover the form from a request this browser sent, so a re-run asks nothing twice. */
export function rulesFrom(body: RunRequestBody): RulesForm {
  return {
    basements: String(body.levels?.basements ?? ''),
    groundIsParking: body.levels ? (body.levels.groundIsParking ? 'yes' : 'no') : '',
    podiumAboveGround: String(body.levels?.podiumAboveGround ?? ''),
    podiumParkingLevels: String(body.levels?.podiumParkingLevels ?? ''),
    coreArea: body.coreAreaM2 ?? '',
    mix: body.unitMix.entries,
    mixSource: body.unitMix.source,
    projectBriefId: body.projectBriefId ?? '',
  };
}

/*
  THE TITLE BLOCK, AS THE READER TYPES IT (17 Oct 2026).

  Five optional strings, each printed in the drawings' title strip and in the
  DXF. The server refuses anything outside printable ASCII and a doubled `%%`
  (a CAD control code), and caps each length; the same rules are checked here
  so the reader learns it beside the field rather than from a refused run.
*/
export const TITLE_FIELDS = ['projectName', 'client', 'consultant', 'description', 'status'] as const;
export type TitleFieldName = (typeof TITLE_FIELDS)[number];
export type TitleBlockForm = Readonly<Record<TitleFieldName, string>>;

/** The server's caps (`apps/api/src/schemas.ts` `titleBlockInput`), field by field. */
export const TITLE_MAX: Readonly<Record<TitleFieldName, number>> = {
  projectName: 80,
  client: 80,
  consultant: 80,
  description: 160,
  status: 40,
};

export const EMPTY_TITLE_BLOCK: TitleBlockForm = { projectName: '', client: '', consultant: '', description: '', status: '' };

export type TitleProblem = 'notLatin' | 'controlCode' | 'tooLong';

/** What stops one field from printing as typed. Nothing for a field that will print. */
export function titleProblem(field: TitleFieldName, value: string): TitleProblem | undefined {
  if (!/^[\x20-\x7E]*$/.test(value)) return 'notLatin';
  if (value.includes('%%')) return 'controlCode';
  if (value.length > TITLE_MAX[field]) return 'tooLong';
  return undefined;
}

/** The form from what a run stored, so the reader edits what the drawings print. */
export function titleFormOf(stored: Partial<Record<TitleFieldName, string>> | undefined): TitleBlockForm {
  return Object.fromEntries(TITLE_FIELDS.map((k) => [k, stored?.[k] ?? ''])) as TitleBlockForm;
}

/** The request's title block: trimmed, blanks left out, and nothing at all when nothing was stated. */
export function titleBlockBody(form: TitleBlockForm): Partial<Record<TitleFieldName, string>> | undefined {
  const kept = Object.fromEntries(TITLE_FIELDS.map((k) => [k, form[k].trim()]).filter(([, v]) => v !== ''));
  return Object.keys(kept).length > 0 ? kept : undefined;
}

/*
  THE REQUEST A RUN WAS MADE WITH, REMEMBERED IN THIS BROWSER.

  The API stores the answer, not the form, so choosing a different vehicle
  entrance on a run computed here re-sends the same request with one field
  changed. A run opened on another device has no request here, and the screen
  says so rather than guessing one.
*/
const requestKey = (runId: string): string => `topai.next.request.${runId}`;

export function rememberRequest(runId: string, body: RunRequestBody): void {
  try {
    localStorage.setItem(requestKey(runId), JSON.stringify(body));
  } catch {
    /* a convenience, not a record */
  }
}

export function recalledRequest(runId: string): RunRequestBody | null {
  try {
    const raw = localStorage.getItem(requestKey(runId));
    return raw ? (JSON.parse(raw) as RunRequestBody) : null;
  } catch {
    return null;
  }
}
