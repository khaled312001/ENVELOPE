/**
 * Identity — a workstream the PRD does not contain.
 *
 * `tenant_id` appears exactly once in 3,587 lines of PRD (§10.2, on `PLOT`), and
 * there is no functional requirement anywhere for authentication, users,
 * organisations, sessions, roles or permissions. Meanwhile:
 *
 * * `G4` requires "a named reviewer on export";
 * * `USER_SET` provenance must display "the user's name" (§13.1);
 * * `FR-GOV-001` requires a "named approver" on every shared asset;
 * * `FR-RUL-001 AC2` requires `approved_by` to be "a qualified human";
 * * §24.4 requires an audit trail of who approved what.
 *
 * Five requirements that need an identity system, and no identity system. This
 * is the largest silent omission in the 12-week plan — see
 * `docs/03-analysis/open-questions.md`.
 *
 * ---
 *
 * **What this file is, and what it is not.**
 *
 * It is a deliberately minimal actor model: a request carries a named actor, and
 * every `USER_SET` value and every gate acknowledgement is attributed to them.
 * That is enough to make the provenance graph honest and the gates meaningful.
 *
 * It is **not authentication**. There is no password, no session, no token
 * verification, and the actor is taken from a request header. In this form it is
 * suitable for a single-tenant design-partner deployment behind a network
 * boundary, and for nothing else. Wiring a real identity provider is a
 * scoped-but-real piece of work that must be quoted, not absorbed.
 *
 * It is written this way rather than stubbed with a hard-coded `"system"` user
 * because a hard-coded user would make every `USER_SET` badge in the product a
 * lie, and the badge is one of the four trust mechanisms.
 */

import type { FastifyRequest } from 'fastify';

export interface Actor {
  readonly id: string;
  readonly name: string;
  /** Set when the actor asserts professional qualification (rule approval, G4). */
  readonly licence?: string;
}

export class UnidentifiedActorError extends Error {
  override readonly name = 'UnidentifiedActorError';
  constructor() {
    super(
      'this request must be attributed to a named person. Every USER_SET value ' +
        'carries the identity of whoever entered it, and G4 requires a named ' +
        'reviewer before anything may be exported. Send X-Actor-Id and ' +
        'X-Actor-Name headers.',
    );
  }
}

/**
 * Read the actor from a request.
 *
 * Throws rather than falling back to an anonymous default: an anonymous default
 * would silently attribute a human's judgement to the system, which is precisely
 * the confusion the provenance model exists to prevent.
 */
export function actorFrom(request: FastifyRequest): Actor {
  const id = header(request, 'x-actor-id');
  const name = header(request, 'x-actor-name');
  if (!id || !name) throw new UnidentifiedActorError();
  const licence = header(request, 'x-actor-licence');
  return { id, name, ...(licence ? { licence } : {}) };
}

function header(request: FastifyRequest, key: string): string | undefined {
  const v = request.headers[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim().length > 0 ? s.trim() : undefined;
}

/**
 * Whether an actor may act as the named reviewer on export (`G4`).
 *
 * Requires an asserted licence. The system cannot verify it — verification is a
 * regulatory-body integration nobody has scoped — so what this enforces is that
 * a person put their licence number next to the export. That is the same
 * standard a signed drawing meets, and it is honest about being an assertion
 * rather than a check.
 */
export function canReview(actor: Actor): boolean {
  return typeof actor.licence === 'string' && actor.licence.length > 0;
}
