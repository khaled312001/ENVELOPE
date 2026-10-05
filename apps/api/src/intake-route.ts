/**
 * Affection-plan intake over HTTP.
 *
 * This is the feature the client reacted to most directly in the 30 Aug 2026
 * meeting. Offered an upload box that reads the file by itself:
 *
 *   Khaled — "أنا لو عملتلك upload box كده، ترفع فيه الفايل ده، وتلقائيًا
 *             يستخرج النص واللي فيه."
 *   Client — "الله الله."                                            — 14:53
 *
 * Two decisions shape the endpoint, and both are about not overreaching:
 *
 * 1. **It reads. It does not create a plot.** The response is what the sheet
 *    says, what it does not say, and the arithmetic re-checked — nothing is
 *    persisted. Turning a parse straight into a `Plot` would let a
 *    mis-recognised number enter the system with nobody having looked at it,
 *    and the whole point of the review screen is that somebody looks.
 *
 * 2. **A gap is an answer.** `missing[]` comes back populated and `blocking`
 *    tells the caller whether computation may proceed at all. The sheet for
 *    `DJAZ1MED12RES011` prints a height and nothing else; this endpoint reports
 *    that faithfully rather than returning a tidy object with plausible holes
 *    filled in.
 */

import {
  blockingGaps,
  crossChecksPassed,
  parseAffectionPlan,
  type AffectionPlanFacts,
} from '@envelope/intake';
import { ProvenanceGraph, toWire, Tracer, type Traced } from '@envelope/core';
import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify';
import { z } from 'zod';

/**
 * The upload.
 *
 * Base64 in a JSON body rather than multipart. An affection plan is one sheet —
 * the three real ones are 1.2–1.5 MB, so ~2 MB encoded, inside the server's 4 MB
 * body limit — and this keeps the contract inspectable with `curl` and the
 * client a plain `fetch`. Multipart earns its complexity when files are large or
 * numerous; here it would only add a dependency and a parser.
 */
export const affectionPlanUpload = z.object({
  /** Base64-encoded PDF. */
  content: z.string().min(1, 'the file is empty'),
  /** Original filename, kept so the citation's `documentUri` names something real. */
  filename: z.string().min(1).max(255),
});

const PDF_MAGIC = '%PDF-';

/** A traced value on the wire, plus the sheet text it was read from. */
function fieldOf(t: Traced<unknown> | undefined): unknown {
  if (!t) return null;
  const wire = toWire(t as Traced<string>);
  return { ...wire, value: String((t as { value: unknown }).value) };
}

/**
 * Serialise the facts for the review screen.
 *
 * Structured values — height, setbacks, coverage — are sent as their objects
 * rather than as `String(...)`, because the screen renders a podium row and a
 * tower row from them. Their provenance travels alongside.
 */
function present(facts: AffectionPlanFacts): unknown {
  const traced = (t: Traced<unknown> | undefined): unknown =>
    t === undefined
      ? null
      : {
          value: t.value,
          node: t.node,
          parameterId: t.parameterId,
          provenanceClass: t.provenanceClass,
          ...(t.unit === undefined ? {} : { unit: t.unit }),
        };

  return {
    parcelId: fieldOf(facts.parcelId),
    community: fieldOf(facts.community),
    developer: fieldOf(facts.developer),
    landUse: fieldOf(facts.landUse),
    issueDate: fieldOf(facts.issueDate),
    drawingRef: fieldOf(facts.drawingRef),
    parkingDeferredTo: fieldOf(facts.parkingDeferredTo),

    totalAreaSqm: fieldOf(facts.totalAreaSqm),
    far: fieldOf(facts.far),
    gfaSqm: fieldOf(facts.gfaSqm),

    height: traced(facts.height),
    setbacks: traced(facts.setbacks),
    coverage: traced(facts.coverage),

    /*
      THE BOUNDARY READINGS, PASSED THROUGH WHOLE AND NOT RESHAPED.

      `EdgeReadings` is JSON-safe by construction — its own header states it and
      holds no `Decimal` anywhere in the tree — so this is the one field on this
      object that needs no presenter. Mapping it through a `traced(...)` per
      proposal would build a second description of a shape `edges.ts` already
      publishes, and the scar in this file's own footnote is what that costs: a
      value that becomes the string its wire type declares only when something
      serialises it, and a screen handed the unserialised one throwing on a field
      whose type says `string`.

      It is what answers the client's complaint of 5 Oct — the readings arriving
      at step 1 instead of four empty selects. Without this line the module, its
      tests and the panel all exist and the browser receives none of it.
    */
    edges: facts.edges,

    /*
      THE DRAWING, PASSED THROUGH THE SAME WAY AND FOR THE SAME REASON.

      `SitePlanReading` is JSON-safe by construction too, and the picture inside
      it is base64 rather than a buffer precisely so that this line can be a
      pass-through: a `Buffer` here would serialise to `{"type":"Buffer",…}` over
      HTTP and arrive as an object on a field whose type says `string` — the
      scar above, one layer down.

      It is the other half of the 5 Oct complaint: the plot the engine draws
      should be the plot on his affection plan, at its angles and dimensions.
      Optional on the facts, so optional here — absent means the raster was
      never looked at, while `refusals` inside means it was and says why.
    */
    ...(facts.sitePlan ? { sitePlan: facts.sitePlan } : {}),

    missing: facts.missing,
    crossChecks: facts.crossChecks,
    crossChecksPassed: crossChecksPassed(facts),
    blocking: blockingGaps(facts),
  };
}

export function registerIntakeRoutes(
  app: FastifyInstance,
  /** The throttle, when the deployment has one. A PDF parse is engine-grade work. */
  costly: { readonly preHandler?: preHandlerAsyncHookHandler } = {},
): void {
  /**
   * Read an affection plan and report what it says.
   *
   * Never 4xx for a sheet that merely omits things — an incomplete plan is a
   * valid document and a normal answer. It 4xx's only when the upload is not a
   * PDF at all, which is a caller error rather than a finding.
   */
  app.post('/api/intake/affection-plan', costly, async (request, reply) => {
    const body = affectionPlanUpload.parse(request.body);

    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(Buffer.from(body.content, 'base64'));
    } catch {
      return reply.code(400).send({ error: 'content is not valid base64' });
    }

    // Check the magic rather than trusting the extension: a renamed .docx
    // reaches the parser as a stream of nonsense and fails with a stack trace
    // the user cannot act on. This fails with a sentence they can.
    const head = Buffer.from(bytes.slice(0, 8)).toString('latin1');
    if (!head.startsWith(PDF_MAGIC)) {
      return reply.code(400).send({
        error: 'not a PDF',
        detail:
          `${body.filename} does not begin with ${PDF_MAGIC}. Affection plans are issued ` +
          'as PDFs; a screenshot or a scanned image cannot be read for its printed values.',
      });
    }

    let facts: AffectionPlanFacts;
    try {
      facts = await parseAffectionPlan(bytes, { documentUri: body.filename, tracer: newTracer() });
    } catch (error) {
      return reply.code(422).send({
        error: 'the PDF could not be read',
        detail: error instanceof Error ? error.message : String(error),
      });
    }

    return readingOf(body.filename, facts);
  });
}

/** A tracer per parse. The graph is the parse's own and outlives nothing. */
function newTracer(): Tracer {
  return new Tracer(new ProvenanceGraph());
}

/**
 * The response body, as one function, so the screen can be tested against what the
 * route actually sends.
 *
 * `Reading` in `apps/web` renders this shape and had no render test at all — the
 * most involved panel in the intake screen, covered by nothing. A test could have
 * built a literal of the shape instead, and that is the fixture failure this
 * repository has already paid for once: a shape frozen at the moment it was
 * captured goes on proving the screen works against something the API no longer
 * sends. So the boundary moved here rather than a fixture being written there.
 */
export function readingOf(filename: string, facts: AffectionPlanFacts): unknown {
  return {
    filename,
    facts: present(facts),
    // Said on every response, not only where a gap exists. A reader who sees
    // a full set of numbers is exactly the reader most likely to forget.
    disclaimer:
      'REGULATORY VALIDITY: NOT ASSESSED. These are the values printed on the sheet, ' +
      're-read and re-checked. Confirm each against the document before use.',
  };
}

/**
 * Parse a sheet and return exactly what a client receives.
 *
 * THE JSON ROUND TRIP IS NOT CEREMONY. `present` passes the structured values —
 * setbacks, coverage — through with their `Decimal` operands intact, and a Decimal
 * only becomes the string the wire type declares when something serialises it.
 * Over HTTP, Fastify does. In process, nothing does, and a screen handed the
 * unserialised object throws `Objects are not valid as a React child` on a value
 * whose type says `string`.
 *
 * That was found by giving `Reading` its first render test, which is the argument
 * for the test in one line. The round trip here is the boundary the route crosses,
 * made explicit, so what a test renders is what a browser is sent.
 */
export async function readAffectionPlan(
  bytes: Uint8Array,
  filename: string,
): Promise<unknown> {
  const facts = await parseAffectionPlan(bytes, { documentUri: filename, tracer: newTracer() });
  return JSON.parse(JSON.stringify(readingOf(filename, facts))) as unknown;
}
