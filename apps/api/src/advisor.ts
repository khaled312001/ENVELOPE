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

/** Keys that carry geometry, graphs or ids: bulk a reader of the figures does not need. */
const DROP = new Set([
  'graph', 'nodes', 'provenance', 'rects', 'world', 'ring', 'outline', 'podiumRing', 'packingRect', 'setbackRing',
  'levels', 'sheets', 'scene', 'building', 'node', 'nodeId', 'uses', 'citation', 'opening', 'start', 'end', 'drives',
  'plantBand', 'svg', 'document', 'payload', 'gates', 'access_', 'runId', 'plotId', 'actor', 'issuedAt',
]);

/** A traced value as "value unit"; everything else walked, bulk dropped, depth bounded. */
export function compactStep(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || value === undefined) return value ?? null;
  if (Array.isArray(value)) return value.slice(0, 30).map((v) => compactStep(v, depth + 1));
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

const STEP_KEYS: Readonly<Record<Step, readonly string[]>> = {
  capacity: ['envelope', 'capacity', 'assumptions', 'core', 'warning'],
  parking: ['parking', 'levelPlan', 'levelPlanRefusal'],
  checks: ['checks'],
  refusal: [],
};

const STEPS = ['capacity', 'parking', 'checks', 'refusal'] as const;
type Step = (typeof STEPS)[number];

const body = z.object({
  step: z.enum(STEPS),
  locale: z.enum(['ar', 'en']),
  runId: z.string().min(1).max(80).optional(),
  /** A refusal's own sentence, when the step is one. */
  refusal: z.string().max(8000).optional(),
  /** The request that was refused, for a refusal: its answers, never a file. */
  request: z.unknown().optional(),
});

const SYSTEM = (locale: 'ar' | 'en'): string =>
  [
    'You are the plan reviewer inside TOP.ai, a development-capacity study tool for plots in Dubai.',
    'The Dubai Building Code 2021, Part B chapters B.4 and B.7, is given to you between <code> tags. Read it FIRST,',
    'and ground every point you make in it, citing the clause, table or figure number (e.g. B.7.2.4, Table B.11).',
    'Then analyse the study step given between <step> tags: what it shows, what looks inconsistent or at risk',
    'against the code, and what the architect should review.',
    'Rules you must keep:',
    '- Never say or imply that the scheme complies with, satisfies, or would be approved under any regulation.',
    '  Regulatory validity is NOT assessed by this tool. At most say a figure is "consistent with clause X as read".',
    '- Use only numbers that appear in the step data or in the code text. Never invent, estimate or round a figure.',
    '- If the code text given does not cover a question, say that it does not; do not answer from memory.',
    '- Do not suggest searching positions for maximum yield; layout optimisation is out of scope.',
    '- Entries set aside under a practitioner statement (ids starting STMT-) are the study owner\'s own decisions for this',
    '  phase (podium on the boundary, parking outside FAR, the 0.50 m gap after every three bays). Take them as given; never',
    '  quote a statement id, a person\'s name or an internal rule id (R-…, INV-…) — name the clause of the code instead.',
    '- Be brief: at most 7 short bullet lines in total, under three headings.',
    locale === 'ar'
      ? 'Answer in Modern Standard Arabic without diacritics; every sentence in Arabic, no English phrases. Headings: «من كود دبي» then «التحليل» then «للمراجعة». Keep only clause numbers and units in Latin characters.'
      : 'Answer in English. Headings: "From the Dubai code", "Analysis", "To review".',
    'Plain text with "- " bullets. No markdown tables, no bold, no preamble, no sign-off.',
  ].join('\n');

interface Cached {
  readonly at: number;
  readonly text: string;
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
    const { step, locale, runId, refusal } = parsed.data;
    if (step === 'refusal' ? !refusal : !runId) {
      return reply.code(400).send({ error: 'BadRequest', message: step === 'refusal' ? 'a refusal needs its sentence.' : 'a step needs its run.' });
    }
    // The run first, under the same rule as reading it: a stranger gets 404 whether or not the analysis is on.
    const run = step === 'refusal' ? null : await deps.loadRun(request, runId!);

    const code = dubaiBuildingCode();
    if (config === null || code === null) {
      return reply.code(503).send({ error: 'AdvisorOff', message: 'The analysis is not switched on for this site.' });
    }

    const data =
      run === null
        ? { refusal, request: compactStep(parsed.data.request ?? null) }
        : Object.fromEntries(STEP_KEYS[step].filter((k) => k in run).map((k) => [k, compactStep(run[k])]));
    const stepText = JSON.stringify(data).slice(0, STEP_CHARS);

    const key = `${step}|${locale}|${runId ?? ''}|${stepText}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return { text: hit.text, model: config.model, consulted: ['B.4', 'B.7'] };

    let text: string;
    try {
      text = await askClaude(config, SYSTEM(locale), `<code>\n${code}\n</code>\n\n<step name="${step}">\n${stepText}\n</step>`);
    } catch (error) {
      request.log.warn({ upstream: (error as { upstreamStatus?: number }).upstreamStatus ?? null, error: (error as Error).message }, 'advisor failed');
      return reply.code(502).send({ error: 'AdvisorUnavailable', message: 'Claude could not be reached for this analysis. Try again shortly.' });
    }
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
    cache.set(key, { at: Date.now(), text });
    return { text, model: config.model, consulted: ['B.4', 'B.7'] };
  });
}
