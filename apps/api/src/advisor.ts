import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { FastifyInstance, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import { z } from 'zod';

/*
  CLAUDE, READING A STEP AGAINST THE DUBAI BUILDING CODE.

  Eng. Mohamed, 16 Oct 2026: let Claude think through and analyse each step, and
  have it go back to the Dubai Building Code first. So this route hands Claude
  the code's own text — Part B chapters B.4 (height, setbacks, areas, coverage,
  floors) and B.7 (access, ramps, parking), as extracted from the 2021 edition —
  with the step's figures from the stored run, and returns what it reads.

  What it may not do is the whole design of this file:

  - It changes nothing. No figure, rule, assumption or drawing reads its answer;
    the engine's numbers stay the only numbers, and the screen labels the text as
    an AI reading beside them. A model's opinion entering the computation would
    be a value with no provenance — the one thing this product refuses.
  - It never claims compliance. The system prompt forbids it, and "regulatory
    validity: not assessed" is unchanged by anything it says.
  - It quotes only figures it was given. A number it invents is a number nobody
    computed, said convincingly.

  The key is read from ANTHROPIC_API_KEY in the server's environment and is never
  sent to a browser, logged, or echoed in an error. Without it the route says the
  analysis is off, and the screen does not offer it.

  The same day he asked for more: Claude as guide, assistant and corrector at
  EVERY step, errors included. So the steps before a run (the sheet as read, the
  plot as typed, the rules form) are read from the reader's own inputs, the
  export step from what its two signatures cover, and any failure the studio
  shows — not only a refused run — from its sentence. Correcting means saying
  which field on which step to change, and to what only when that figure is in
  the data or the code; the reader makes the change. Nothing here writes one.
*/

export interface AdvisorConfig {
  readonly apiKey: string;
  readonly model: string;
  readonly fetchImpl?: typeof fetch;
}

const CHAPTERS = ['B04', 'B07'] as const;
/** The step data sent to Claude, at most: enough for a run's figures, never its geometry. */
const STEP_CHARS = 24_000;
const CACHE_LIMIT = 200;
const CACHE_TTL_MS = 60 * 60 * 1000;
const TIMEOUT_MS = 120_000;

/** The code's text, read once: beside the bundle on the host, two levels up in the repository. */
let codeText: string | null | undefined;
export function dubaiBuildingCode(): string | null {
  if (codeText !== undefined) return codeText;
  const here = dirname(fileURLToPath(import.meta.url));
  const dir = [join(here, 'data', 'dbc'), join(here, '..', 'data', 'dbc'), join(here, '..', '..', 'data', 'dbc')].find((d) =>
    existsSync(join(d, `${CHAPTERS[0]}.en.txt`)),
  );
  codeText = dir
    ? CHAPTERS.map((c) => `<chapter id="${c}">\n${readFileSync(join(dir, `${c}.en.txt`), 'utf8')}\n</chapter>`).join('\n')
    : null;
  return codeText;
}

/**
 * Keys that carry geometry, graphs, ids or files: bulk a reader of the figures
 * does not need. `pngBase64`, `attachment` and `sitePlan` are the affection
 * plan's picture and PDF, which the sheet step's reading carries beside its facts.
 */
const DROP = new Set([
  'graph', 'nodes', 'provenance', 'rects', 'world', 'ring', 'outline', 'podiumRing', 'packingRect', 'setbackRing',
  'levels', 'sheets', 'scene', 'building', 'node', 'nodeId', 'uses', 'citation', 'opening', 'start', 'end', 'drives',
  'plantBand', 'svg', 'document', 'payload', 'gates', 'access_', 'runId', 'plotId', 'actor', 'issuedAt',
  'pngBase64', 'attachment', 'sitePlan', 'onPage', 'bbox',
]);
/** A string longer than this is not a figure or a sentence a reader typed; it is cut, said so. */
const STRING_CHARS = 2_000;

/** A traced value as "value unit"; everything else walked, bulk dropped, depth bounded. */
export function compactStep(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || value === undefined) return value ?? null;
  if (Array.isArray(value)) return value.slice(0, 30).map((v) => compactStep(v, depth + 1));
  if (typeof value === 'string') return value.length > STRING_CHARS ? `${value.slice(0, STRING_CHARS)}… [cut]` : value;
  if (typeof value !== 'object') return value;
  const o = value as Record<string, unknown>;
  if (typeof o['value'] === 'string' && typeof o['provenanceClass'] === 'string') {
    return `${o['value']}${o['unit'] ? ` ${String(o['unit'])}` : ''} (${String(o['provenanceClass'])})`;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (DROP.has(k)) continue;
    out[k] = compactStep(v, depth + 1);
  }
  return out;
}

/** The studio's seven steps, in its order; the names Claude uses when it says where a correction goes. */
const STUDIO = ['sheet', 'plot', 'rules', 'capacity', 'parking', 'checks', 'export'] as const;
type StudioStep = (typeof STUDIO)[number];
const STEPS = [...STUDIO, 'refusal'] as const;
type Step = (typeof STEPS)[number];
/** Read from the reader's own inputs: there is no run yet. */
const BEFORE_RUN: ReadonlySet<Step> = new Set<Step>(['sheet', 'plot', 'rules']);

const STEP_KEYS: Readonly<Record<Exclude<Step, 'sheet' | 'plot' | 'rules' | 'refusal'>, readonly string[]>> = {
  capacity: ['envelope', 'capacity', 'assumptions', 'core', 'warning'],
  parking: ['parking', 'levelPlan', 'levelPlanRefusal'],
  checks: ['checks'],
  export: ['assumptions', 'capacity', 'draftRules'],
};

const STEP_NAME: Readonly<Record<'ar' | 'en', Readonly<Record<StudioStep, string>>>> = {
  en: { sheet: 'Sheet', plot: 'Plot', rules: 'Rules', capacity: 'Capacity', parking: 'Parking', checks: 'Checks', export: 'Export' },
  ar: { sheet: 'المخطط', plot: 'القطعة', rules: 'القواعد', capacity: 'السعة', parking: 'المواقف', checks: 'الفحوصات', export: 'التصدير' },
};

/** What a corrector looks for on each step. A focus, not a script: the answer still comes from the code. */
const FOCUS: Readonly<Record<Step, string>> = {
  sheet:
    'This is what was read off an affection plan, with the limits it states and the ones it is silent on. Check the values read for ' +
    'internal consistency (plot area against FAR and GFA, the height code, setbacks per face). A limit the sheet does not state is a ' +
    'gap the reader must fill from another instrument; never fill it with a number, and never borrow one from another plot.',
  plot:
    'These are the plot as the reader typed it: corners, each boundary\'s class (ROAD, ADJACENT_PLOT, OTHER) and a road\'s hierarchy, ' +
    'the stated area, any tower setback typed per boundary. Point to boundaries left unclassified, roads with no hierarchy, a stated area ' +
    'missing, or anything that would make the vehicle access under B.7.2.1 impossible to place.',
  rules:
    'These are the reader\'s answers on the rules step before computing. Point to answers that contradict each other (for example more ' +
    'podium parking levels than podium levels, a level count against the height the sheet states) and questions left blank that will ' +
    'block the run.',
  capacity: 'This is the computed envelope and capacity. Point to the binding limit, any warning, and the assumptions that move it most.',
  parking: 'This is the parking demand and the laid-out levels. Point to any shortfall, what it comes from, and which input changes it.',
  checks: 'These are the invariant checks and the claim statement. Explain any failed or dormant check and what input or step it traces to.',
  export:
    'The reader is about to sign: G3 acknowledges every assumption listed, G4 names a reviewer. Say what each signature covers here and ' +
    'which assumed values deserve a second look before signing.',
  refusal:
    'This is an error or refusal the studio showed, with the input that produced it when there was one. Say in plain words what it means, ' +
    'which field on which step causes it, and what to change. If the sentence names the figure it accepts, use that figure.',
};

const body = z.object({
  step: z.enum(STEPS),
  locale: z.enum(['ar', 'en']),
  runId: z.string().min(1).max(80).optional(),
  /** The step an error was shown on, so a correction can say where to go back to. */
  at: z.enum(STUDIO).optional(),
  /** A refusal's own sentence, when the step is one. */
  refusal: z.string().max(8000).optional(),
  /** The reader's inputs: the refused request, or a step before the run. Answers and figures, never a file. */
  request: z.unknown().optional(),
  /** The inputs Claude may propose to change, with their values now. Absent, it proposes nothing. */
  editable: z
    .record(z.string().max(60), z.string().max(60))
    .refine((r) => Object.keys(r).length <= 120, 'too many fields')
    .optional(),
});

/** A proposed change to one input. The reader applies it on the screen, or does not; the server writes nothing. */
export interface AdvisorEdit {
  readonly field: string;
  readonly value: string;
  readonly clause: string;
  readonly why: string;
}
const MAX_EDITS = 6;
const EDITS_BLOCK = /<edits>([\s\S]*?)<\/edits>/;
/** A clause or table number as the code prints it: B.7.2.4, Table B.11, Figure B.20. */
const CLAUSE_REF = /\b(?:(?:Table|Figure)\s+[A-Z]\.\d+(?:\.\d+)*|[A-Z]\.\d+(?:\.\d+)+)\b/g;

/**
 * The edits Claude proposed, kept only where every one rests on the code:
 * a field it was offered, a value that changes it, and a clause that is in the
 * code text it was given (16 Oct 2026: «وكل شئ بناء على كود دبي»). A clause it
 * remembered rather than read is dropped, along with the edit it was carrying.
 * The block is cut out of the text either way.
 */
export function takeEdits(
  said: string,
  editable: Readonly<Record<string, string>> | undefined,
  code: string,
): { readonly text: string; readonly edits: readonly AdvisorEdit[] } {
  const m = EDITS_BLOCK.exec(said);
  const text = said.replace(EDITS_BLOCK, '').trim();
  if (!m || !editable) return { text, edits: [] };
  let raw: unknown;
  try {
    raw = JSON.parse(m[1]!.trim());
  } catch {
    return { text, edits: [] };
  }
  if (!Array.isArray(raw)) return { text, edits: [] };
  const edits: AdvisorEdit[] = [];
  const seen = new Set<string>();
  for (const e of raw as unknown[]) {
    if (edits.length >= MAX_EDITS || typeof e !== 'object' || e === null) continue;
    const { field, value, clause, why } = e as Record<string, unknown>;
    if (typeof field !== 'string' || typeof value !== 'string' || typeof clause !== 'string' || typeof why !== 'string') continue;
    const v = value.trim();
    if (!(field in editable) || seen.has(field) || v.length === 0 || v.length > 60 || editable[field] === v) continue;
    const refs = clause.match(CLAUSE_REF) ?? [];
    if (refs.length === 0 || !refs.every((r) => code.includes(r))) continue;
    seen.add(field);
    edits.push({ field, value: v, clause: clause.trim().slice(0, 120), why: why.trim().slice(0, 400) });
  }
  return { text, edits };
}

const EDITS_PROMPT = [
  'The inputs you may propose to change are listed between <editable> tags as field → value now.',
  'After your text, you MAY add one block <edits>[{"field":"…","value":"…","clause":"…","why":"…"}]</edits> proposing changes',
  'that correct or improve those inputs. Rules for edits:',
  '- Only fields listed in <editable>, at most 6, each a value different from the one now.',
  '- Each must rest on the code text given: "clause" names its clause, table or figure number exactly as printed there',
  '  (e.g. "B.7.2.1", "Table B.11"). An edit whose clause is not in the code text is discarded.',
  '- The value must come from the step data or the code text; never a guess. If you cannot source a value, propose nothing.',
  '- Never propose a limit the affection plan states or is silent on (FAR, GFA, height, coverage); those are not in <editable>.',
  '- "why" is one sentence in the answer\'s language. Values use the field\'s own vocabulary (e.g. ROAD, LOCAL, yes, no, a number).',
  '- The reader decides: an edit is applied only if they press Apply, and then it is their input. Say nothing implying otherwise.',
  '- No block at all if there is nothing worth changing.',
].join('\n');

const SYSTEM = (locale: 'ar' | 'en', step: Step, at: StudioStep | undefined, editable: boolean): string =>
  [
    'You are the guide, assistant and corrector inside TOP.ai, a development-capacity study tool for plots in Dubai.',
    'The Dubai Building Code 2021, Part B chapters B.4 and B.7, is given to you between <code> tags. Read it FIRST,',
    'and ground every point you make in it, citing the clause, table or figure number (e.g. B.7.2.4, Table B.11).',
    'Then read the study step given between <step> tags. Find what is wrong or at risk, say how the reader corrects it,',
    'and what to do next.',
    `The studio's steps, in order: ${STUDIO.map((s) => STEP_NAME[locale][s]).join(' → ')}. When a correction goes to a field, name the step it is on.`,
    `This step: ${step === 'refusal' ? `an error shown${at ? ` on the ${STEP_NAME[locale][at]} step` : ''}` : STEP_NAME[locale][step]}. ${FOCUS[step]}`,
    'Rules you must keep:',
    '- You correct by advising. You change nothing yourself: the reader edits the field, or applies an edit you propose.',
    '  Never say a value has been changed or fixed.',
    '- If nothing needs correcting, say so in one line; never invent a problem to fill a heading.',
    '- Never say or imply that the scheme complies with, satisfies, or would be approved under any regulation.',
    '  Regulatory validity is NOT assessed by this tool. At most say a figure is "consistent with clause X as read".',
    '- Use only numbers that appear in the step data or in the code text. Never invent, estimate or round a figure.',
    '- If the code text given does not cover a question, say that it does not; do not answer from memory.',
    '- Do not suggest searching positions for maximum yield; layout optimisation is out of scope.',
    '- Entries set aside under a practitioner statement (ids starting STMT-) are the study owner\'s own decisions for this',
    '  phase (podium on the boundary, parking outside FAR, the 0.50 m gap after every three bays). Take them as given; never',
    '  quote a statement id, a person\'s name or an internal rule id (R-…, INV-…) — name the clause of the code instead.',
    '- Be brief: at most 8 short bullet lines in total, under three headings.',
    locale === 'ar'
      ? 'Answer in Modern Standard Arabic without diacritics; every sentence in Arabic, no English phrases. Headings: «من كود دبي» then «للتصحيح» then «الخطوة التالية». Keep only clause numbers and units in Latin characters.'
      : 'Answer in English. Headings: "From the Dubai code", "To correct", "Next".',
    'Plain text with "- " bullets. No markdown tables, no bold, no preamble, no sign-off.',
    ...(editable ? [EDITS_PROMPT] : []),
  ].join('\n');

interface Cached {
  readonly at: number;
  readonly text: string;
  readonly edits: readonly AdvisorEdit[];
}
const cache = new Map<string, Cached>();

/** One Messages API call, thinking first; the answer's text blocks only. */
async function askClaude(config: AdvisorConfig, system: string, user: string): Promise<string> {
  const res = await (config.fetchImpl ?? fetch)('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    // Adaptive thinking: the 5.5 models refuse a fixed `budget_tokens` with a 400. Thinking counts toward max_tokens.
    body: JSON.stringify({
      model: config.model,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      system,
      messages: [{ role: 'user', content: user }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    // The status only: an upstream body can echo request headers, and the key is one.
    throw Object.assign(new Error(`Claude answered ${res.status}.`), { upstreamStatus: res.status });
  }
  const out = (await res.json()) as { readonly content?: readonly { readonly type: string; readonly text?: string }[] };
  const text = (out.content ?? [])
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('\n')
    .trim();
  if (!text) throw new Error('Claude returned no text.');
  return text;
}

export function registerAdvisorRoutes(
  app: FastifyInstance,
  deps: {
    readonly config: AdvisorConfig | null;
    readonly costly?: { readonly preHandler?: preHandlerAsyncHookHandler };
    /** The stored run as the screen sees it, under the same access rule as GET /api/runs/:runId. */
    readonly loadRun: (request: FastifyRequest, runId: string) => Promise<Record<string, unknown>>;
  },
): void {
  const { config } = deps;

  app.get('/api/advisor', async () => ({ enabled: config !== null && dubaiBuildingCode() !== null }));

  app.post('/api/advise', deps.costly ?? {}, async (request, reply) => {
    const parsed = body.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'BadRequest', message: 'step and locale are required; a refusal carries its sentence.' });
    }
    const { step, locale, runId, refusal, at } = parsed.data;
    const missing =
      step === 'refusal'
        ? !refusal && 'a refusal needs its sentence.'
        : BEFORE_RUN.has(step)
          ? parsed.data.request === undefined && 'a step before the run needs its inputs.'
          : !runId && 'a step needs its run.';
    if (missing) return reply.code(400).send({ error: 'BadRequest', message: missing });
    // The run first, under the same rule as reading it: a stranger gets 404 whether or not the analysis is on.
    const run = step === 'refusal' || BEFORE_RUN.has(step) ? null : await deps.loadRun(request, runId!);

    const code = dubaiBuildingCode();
    if (config === null || code === null) {
      return reply.code(503).send({ error: 'AdvisorOff', message: 'The analysis is not switched on for this site.' });
    }

    const data =
      run === null
        ? step === 'refusal'
          ? { refusal, ...(at ? { shownOn: at } : {}), request: compactStep(parsed.data.request ?? null) }
          : { inputs: compactStep(parsed.data.request) }
        : Object.fromEntries(STEP_KEYS[step as keyof typeof STEP_KEYS].filter((k) => k in run).map((k) => [k, compactStep(run[k])]));
    const stepText = JSON.stringify(data).slice(0, STEP_CHARS);

    const { editable } = parsed.data;
    const editableText = editable ? `\n\n<editable>\n${JSON.stringify(editable)}\n</editable>` : '';

    const key = `${step}|${at ?? ''}|${locale}|${runId ?? ''}|${stepText}${editableText}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return { text: hit.text, edits: hit.edits, model: config.model, consulted: ['B.4', 'B.7'] };

    let said: string;
    try {
      said = await askClaude(
        config,
        SYSTEM(locale, step, at, editable !== undefined),
        `<code>\n${code}\n</code>\n\n<step name="${step}">\n${stepText}\n</step>${editableText}`,
      );
    } catch (error) {
      request.log.warn({ upstream: (error as { upstreamStatus?: number }).upstreamStatus ?? null, error: (error as Error).message }, 'advisor failed');
      return reply.code(502).send({ error: 'AdvisorUnavailable', message: 'Claude could not be reached for this analysis. Try again shortly.' });
    }
    const { text, edits } = takeEdits(said, editable, code);
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
    cache.set(key, { at: Date.now(), text, edits });
    return { text, edits, model: config.model, consulted: ['B.4', 'B.7'] };
  });
}
