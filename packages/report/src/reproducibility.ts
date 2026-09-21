/**
 * Immutable-run reproducibility — PRD §13.4, metric `M-RUN`.
 *
 * ---
 *
 * ## What §13.4 actually asks for
 *
 * V1 demanded "100% run reproducibility over 24 months", which §13.4 correctly
 * calls impossible and splits in two. What survives, and what this module
 * implements, is the first half:
 *
 * > "A run's stored outputs, inputs, versions, and provenance graph are
 * > retrievable unchanged, and the deterministic portion of the pipeline can be
 * > re-executed from persisted intermediate artifacts to produce byte-identical
 * > results."
 *
 * {@link runFingerprint} reduces that payload to one content hash, so "unchanged"
 * is a string comparison rather than a promise.
 *
 * ## What M-RUN is scoped to, and what it is not
 *
 * **M-RUN is scoped to this structured payload. It is NOT scoped to the PDF
 * bytes, and it must not be written into a contract as though it were.**
 *
 * The PDF is produced by headless Chromium, which embeds a creation timestamp
 * (`/CreationDate`), a modification date, and generated object identifiers in
 * every document it writes. Two renders of an identical run therefore differ in
 * their bytes while being identical in every respect anyone could audit. This is
 * not a Chromium defect and it is not fixable by configuration; it is what a PDF
 * is. Claiming byte-identical PDFs would fail our own release blocker on a
 * metadata field — the exact trap `docs/03-analysis/open-questions.md` **Q24**
 * names, where it was raised against WeasyPrint before the stack changed. The
 * substitution of Chromium for WeasyPrint (§19.1 already says "report/ HTML →
 * PDF") changes nothing about the argument.
 *
 * What we can and do promise: the JSON export re-serialises byte-identically
 * from the same run, and the run fingerprint below reproduces exactly. Point an
 * auditor at those.
 *
 * ## What goes into the hash, and what deliberately does not
 *
 * In, per §13.4's own list of "what is persisted to make this hold":
 *
 * | Member | Why |
 * |---|---|
 * | `engineVersion` | The numeric policy, the snap grid and the solver are all in it. `numeric.ts` is explicit that changing the tolerance requires a version bump. |
 * | `metricDefinitionsVersion` | A different annex is a different definition of the same word. |
 * | `ruleSet` | Version *and* content hash: a bitemporal store can serve different records under one version id. |
 * | `structuredInputs` | Post-extraction, verbatim, as persisted. |
 * | `userInputs` | Every value a named person supplied or overrode. |
 * | `assumptions` | Every `ASSUMED` value and its basis — a run that assumed differently is a different run. |
 * | `provenance` | The whole graph. |
 *
 * Out, each for a stated reason:
 *
 * - **Any timestamp taken at call time.** `Date.now()` never appears in this
 *   file. A hash that changes when you compute it twice is not a content hash.
 * - **`producedAt`.** Rendering a stored run again on Tuesday does not make it a
 *   different run.
 * - **`runId`.** Two runs over identical inputs *should* collide here — that
 *   collision is the useful signal, not a bug.
 * - **`reviewer`.** A named reviewer (gate `G4`) attests to a computation; they
 *   are not an input to it. Including them would mean the fingerprint could not
 *   be reproduced by re-executing the pipeline from persisted inputs, which is
 *   precisely what §13.4 asks the fingerprint to make possible.
 * - **The rendered capacity figures.** Not an omission: every emitted value is a
 *   `VALUE` node in the provenance graph carrying its own serialised value (see
 *   `Tracer` in `core`). Hashing the graph hashes the outputs. Listing them a
 *   second time would create two copies free to disagree.
 */

import { createHash } from 'node:crypto';

import type { RunReport } from './json.js';

/** A value that cannot appear in a canonical payload, and why. */
export class NonCanonicalValueError extends Error {
  override readonly name = 'NonCanonicalValueError';
  constructor(
    message: string,
    readonly at: string,
  ) {
    super(`${message} (at ${at})`);
  }
}

/**
 * Deterministic JSON text: object keys sorted, no insignificant whitespace.
 *
 * Three properties this has and `JSON.stringify` does not:
 *
 * 1. **Sorted keys.** Insertion order is an implementation detail of whichever
 *    code built the object; two payloads with the same content must produce the
 *    same bytes. Sorting is by UTF-16 code unit (`Array.prototype.sort`'s
 *    default), never `localeCompare`, which is locale-dependent and would make
 *    the digest depend on the server's `LANG`.
 * 2. **Rejection instead of coercion.** `JSON.stringify` turns `NaN` into
 *    `null`, drops `undefined`, and quietly calls `toJSON()` on anything that
 *    has one — so a live `Decimal` or a `Date` would serialise to *something*
 *    and hash cleanly. Here, anything that is not a JSON primitive, an array or
 *    a plain object throws. That is the structural check that a `Decimal` never
 *    reached this package: `@envelope/report` must not hold a value it could do
 *    arithmetic with.
 * 3. **No `-0`/`NaN`/`Infinity` ambiguity.** Non-finite numbers are refused
 *    rather than silently becoming `null`.
 *
 * Numbers that do pass are serialised by `Number.prototype.toString`, whose
 * output ECMAScript fixes as the shortest round-tripping representation — so it
 * is deterministic across engines and versions. Quantities do not travel as
 * numbers anyway (see `json.ts`); the numbers reaching here are counts,
 * ordinals, page numbers and PDF bounding-box coordinates.
 */
export function canonicalJson(value: unknown, at = '$'): string {
  if (value === null) return 'null';

  switch (typeof value) {
    case 'string':
      return JSON.stringify(value);
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      if (!Number.isFinite(value)) {
        throw new NonCanonicalValueError(
          `JSON has no representation for ${String(value)}; JSON.stringify would write ` +
            `"null" here and the loss would be invisible`,
          at,
        );
      }
      return JSON.stringify(value);
    case 'object':
      break;
    default:
      throw new NonCanonicalValueError(
        `a ${typeof value} cannot be part of a run's canonical content`,
        at,
      );
  }

  if (Array.isArray(value)) {
    const items = (value as readonly unknown[]).map((item, index) =>
      canonicalJson(item, `${at}[${index}]`),
    );
    return `[${items.join(',')}]`;
  }

  const prototype = Object.getPrototypeOf(value) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    throw new NonCanonicalValueError(
      `expected a plain object; got an instance of ` +
        `${(value as object).constructor?.name ?? 'an anonymous class'}. A class instance ` +
        `here means a live value — a Decimal, a Date, a Map — reached the report layer, ` +
        `which may only hold what the engine already serialised`,
      at,
    );
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const members: string[] = [];
  for (const key of keys) {
    const child = record[key];
    // JSON has no `undefined`. A key holding it is an absent key, which is how
    // `exactOptionalPropertyTypes` models it upstream anyway.
    if (child === undefined) continue;
    members.push(`${JSON.stringify(key)}:${canonicalJson(child, `${at}.${key}`)}`);
  }
  return `{${members.join(',')}}`;
}

/** The hash function. Named in the artifact so a future change is visible. */
export const FINGERPRINT_ALGORITHM = 'SHA-256' as const;

/**
 * The payload members, in the artifact, so a reader can see the scope without
 * reading this file. Order is alphabetical and fixed.
 */
export const FINGERPRINT_COVERS = [
  'assumptions',
  'engineVersion',
  'metricDefinitionsVersion',
  'provenance',
  'ruleSet',
  'structuredInputs',
  'userInputs',
] as const;

export interface RunFingerprint {
  readonly algorithm: typeof FINGERPRINT_ALGORITHM;
  /** Lowercase hex. */
  readonly digest: string;
  readonly covers: readonly string[];
  /**
   * Stated in the artifact rather than only in this file's documentation,
   * because the place a scope claim gets misread is a contract, not a comment.
   */
  readonly scope: string;
}

/** The scope sentence carried in every fingerprint. See the module header. */
export const FINGERPRINT_SCOPE =
  'Covers the structured run payload only — post-extraction inputs, rule-set version and ' +
  'content hash, metric definitions version, assumption values, user inputs, engine ' +
  'version and the provenance graph. It does NOT cover the PDF bytes: headless Chromium ' +
  'embeds creation timestamps and generated object ids, so a byte-identical PDF is not ' +
  'achievable and is not claimed (PRD §13.4; open-questions.md Q24).';

/**
 * Order-independent canonical form of a collection.
 *
 * The assumption register is ordered by sensitivity rank, which is derived from
 * *outputs*. If the engine re-ranks two assumptions whose values did not change,
 * the run's inputs have not changed and its fingerprint must not move. So the
 * members are canonicalised individually and the resulting strings sorted: the
 * hash then depends on the *set* of assumption values, which is what §13.4's
 * "all assumption values" says.
 *
 * The provenance graph is not treated this way — its node ids are assigned
 * sequentially by `ProvenanceGraph` precisely so that a re-run reproduces them,
 * so its order is content and is preserved.
 */
function canonicalSet(items: readonly unknown[], at: string): readonly string[] {
  return items.map((item, index) => canonicalJson(item, `${at}[${index}]`)).sort();
}

/**
 * The exact object that gets hashed. Exposed so a failing comparison can be
 * diffed rather than guessed at — a bare digest mismatch is unactionable.
 */
export function canonicalRunPayload(run: RunReport): string {
  return canonicalJson({
    engineVersion: run.engineVersion,
    metricDefinitionsVersion: run.metricDefinitionsVersion,
    ruleSet: {
      approval: run.ruleSet.approval,
      ruleSetVersion: run.ruleSet.ruleSetVersion,
      contentHash: run.ruleSet.contentHash,
    },
    structuredInputs: run.structuredInputs,
    userInputs: canonicalSet(
      run.userInputs.map((input) => ({
        parameterId: input.parameterId,
        value: input.value,
        unit: input.unit,
        enteredBy: input.enteredBy,
        enteredAt: input.enteredAt,
      })),
      '$.userInputs',
    ),
    assumptions: canonicalSet(
      run.assumptions.map((assumption) => ({
        parameterId: assumption.parameterId,
        value: assumption.value.value,
        unit: assumption.value.unit ?? null,
        provenanceClass: assumption.value.provenanceClass,
        basis: assumption.basis,
        perturbation: assumption.perturbation,
        relativeEffect: assumption.relativeEffect,
      })),
      '$.assumptions',
    ),
    provenance: {
      nodes: run.provenance.nodes,
      edges: run.provenance.edges,
    },
  });
}

/**
 * The immutable-run content hash — §13.4.
 *
 * Deterministic: called twice on the same run it returns the same digest, and it
 * reads no clock, no environment variable and no random source. Sensitive: any
 * change to a covered member — an assumption value, a user input, the rule-set
 * content hash, the engine version, a node in the provenance graph — changes it.
 *
 * @see {@link FINGERPRINT_SCOPE} for what this does *not* cover, which is the
 * part that matters when someone tries to write it into an acceptance criterion.
 */
export function runFingerprint(run: RunReport): RunFingerprint {
  const digest = createHash('sha256').update(canonicalRunPayload(run), 'utf8').digest('hex');
  return {
    algorithm: FINGERPRINT_ALGORITHM,
    digest,
    covers: FINGERPRINT_COVERS,
    scope: FINGERPRINT_SCOPE,
  };
}
