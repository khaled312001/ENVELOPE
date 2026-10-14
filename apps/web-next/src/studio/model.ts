import type { RunRequestBody } from '@web/api/client.js';
import worked from '@web/screens/worked-example.json';

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
  readonly edges: readonly { readonly classification: EdgeClass; readonly roadHierarchy: Hierarchy }[];
}

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

export interface RulesForm {
  /** No default, and none may be added: FR-DEF-002. It swings capacity 15–35%. */
  readonly parkingInFar: RunRequestBody['parkingInFar'] | '';
  readonly saleableUnit: 'RATIO' | 'AREA';
  /** No default either: the engine used to take 1.00 here, and every unit count was 3–7% high. */
  readonly saleable: string;
  readonly basements: string;
  readonly groundIsParking: '' | 'yes' | 'no';
  readonly podiumAboveGround: string;
  readonly podiumParkingLevels: string;
  /** Blank is not zero: the engine assumes a core and says so, in amber. */
  readonly coreArea: string;
  readonly mix: readonly MixRow[];
  readonly mixSource: 'USER_SET' | 'ASSUMED';
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

export const EMPTY_RULES: RulesForm = {
  parkingInFar: '',
  saleableUnit: 'RATIO',
  saleable: '',
  basements: '',
  groundIsParking: '',
  podiumAboveGround: '',
  podiumParkingLevels: '',
  coreArea: '',
  mix: DEFAULT_MIX,
  mixSource: 'ASSUMED',
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
      parkingInFar: r.parkingInFar as RunRequestBody['parkingInFar'],
      saleableUnit: 'RATIO',
      saleable: r.saleableEfficiency.value,
      basements: String(r.levels.basements),
      groundIsParking: r.levels.groundIsParking ? 'yes' : 'no',
      podiumAboveGround: String(r.levels.podiumAboveGround),
      podiumParkingLevels: String(r.levels.podiumParkingLevels),
      coreArea: '',
      mix: r.unitMix.entries,
      mixSource: 'USER_SET',
    },
  };
}

const DECIMAL = /^\d+(\.\d+)?$/;
const INTEGER = /^\d+$/;

export interface RulesProblems {
  readonly parkingInFar?: true;
  readonly saleable?: 'missing' | 'format' | 'range';
  readonly levels?: 'missing' | 'format' | 'podium';
  readonly coreArea?: true;
  readonly mix?: 'format' | 'total';
}

/** What still stops the run. Each problem is a question the reader has not answered, not a default to fill. */
export function rulesProblems(f: RulesForm): RulesProblems {
  const p: { -readonly [K in keyof RulesProblems]: RulesProblems[K] } = {};
  if (f.parkingInFar === '') p.parkingInFar = true;
  const s = f.saleable.trim();
  if (s === '') p.saleable = 'missing';
  else if (!DECIMAL.test(s)) p.saleable = 'format';
  else if (f.saleableUnit === 'RATIO' && !(s.startsWith('0.') || s === '1' || s === '1.0' || s === '1.00')) p.saleable = 'range';
  else if (/^0+(\.0+)?$/.test(s)) p.saleable = 'range';
  const ints = [f.basements, f.podiumAboveGround, f.podiumParkingLevels];
  if (ints.some((x) => x.trim() === '') || f.groundIsParking === '') p.levels = 'missing';
  else if (ints.some((x) => !INTEGER.test(x.trim()))) p.levels = 'format';
  else if (Number(f.podiumParkingLevels) > Number(f.podiumAboveGround)) p.levels = 'podium';
  if (f.coreArea.trim() !== '' && !DECIMAL.test(f.coreArea.trim())) p.coreArea = true;
  if (f.mix.length === 0 || f.mix.some((m) => !DECIMAL.test(m.share.trim()) || !DECIMAL.test(m.nsaM2.trim()) || m.label.trim() === '')) p.mix = 'format';
  return p;
}

export function requestBody(plotId: string, f: RulesForm, chosenAccessEdgeSeq?: number): RunRequestBody {
  const levels = {
    basements: Number(f.basements),
    groundIsParking: f.groundIsParking === 'yes',
    podiumAboveGround: Number(f.podiumAboveGround),
    podiumParkingLevels: Number(f.podiumParkingLevels),
  };
  return {
    plotId,
    parkingInFar: f.parkingInFar as RunRequestBody['parkingInFar'],
    unitMix:
      f.mixSource === 'ASSUMED'
        ? { source: 'ASSUMED', entries: f.mix, basis: DEFAULT_MIX_BASIS }
        : { source: 'USER_SET', entries: f.mix.map((m) => ({ ...m, typeId: m.typeId || m.label.toUpperCase().replace(/\W+/g, '_') })) },
    // Required by the contract and held by every stored run; the schedule below wins on the server.
    parkingLevelsAvailable: levels.basements + (levels.groundIsParking ? 1 : 0) + levels.podiumParkingLevels,
    levels,
    ...(f.coreArea.trim() === '' ? {} : { coreAreaM2: f.coreArea.trim() }),
    ...(chosenAccessEdgeSeq === undefined ? {} : { chosenAccessEdgeSeq }),
    parkingUsableFraction: { value: '0.85', source: 'ASSUMED', basis: USABLE_FRACTION_BASIS },
    saleableEfficiency:
      f.saleableUnit === 'AREA'
        ? {
            saleableAreaM2: f.saleable.trim(),
            source: 'USER_SET',
            basis:
              'a saleable area in square metres, entered by the person running this study; ' +
              'the share of GFA is computed from it, and no developer standard was selected',
          }
        : {
            value: f.saleable.trim(),
            source: 'USER_SET',
            basis: 'entered by the person running this study; no developer standard was selected',
          },
    realismDiscount: '1.00',
    useDraftRules: true,
  };
}

/** Recover the form from a request this browser sent, so a re-run asks nothing twice. */
export function rulesFrom(body: RunRequestBody): RulesForm {
  const area = body.saleableEfficiency.saleableAreaM2;
  return {
    parkingInFar: body.parkingInFar,
    saleableUnit: area !== undefined ? 'AREA' : 'RATIO',
    saleable: area ?? body.saleableEfficiency.value ?? '',
    basements: String(body.levels?.basements ?? ''),
    groundIsParking: body.levels ? (body.levels.groundIsParking ? 'yes' : 'no') : '',
    podiumAboveGround: String(body.levels?.podiumAboveGround ?? ''),
    podiumParkingLevels: String(body.levels?.podiumParkingLevels ?? ''),
    coreArea: body.coreAreaM2 ?? '',
    mix: body.unitMix.entries,
    mixSource: body.unitMix.source,
  };
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
