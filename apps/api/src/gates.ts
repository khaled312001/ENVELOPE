/**
 * Human approval gates — PRD §21.1.
 *
 * | Gate | Actor | Blocks | Phase |
 * |---|---|---|---|
 * | G1 Plot & parameter confirmation | User | rule resolution | 0 |
 * | G2 Rule set acknowledgement | User | capacity computation | 0 |
 * | G3 Assumption register acknowledgement | User | any export | 0 |
 * | G4 Named reviewer on export | User | external sharing | 0 |
 *
 * §20.1 makes steps 1–4 sequential and gated, and §20.2 names two of these as
 * two of "the three moments that carry the product". They are enforced here,
 * server-side, because a gate a client can skip is a gate that does not exist —
 * and the entire value proposition is that a user cannot receive a number
 * without having been shown what it rests on.
 *
 * There is no bypass parameter. Adding one would be a defect.
 */

export const Gate = {
  /** Plot geometry, edge classifications and parameters confirmed by the user. */
  G1_PLOT_CONFIRMED: 'G1_PLOT_CONFIRMED',
  /** The applicable rule set — including exclusions and reasons — acknowledged. */
  G2_RULES_ACKNOWLEDGED: 'G2_RULES_ACKNOWLEDGED',
  /**
   * The assumption register acknowledged. §20.2: "the moment the user
   * understands this is not magic. Non-skippable, sensitivity-ranked,
   * inline-editable."
   */
  G3_ASSUMPTIONS_ACKNOWLEDGED: 'G3_ASSUMPTIONS_ACKNOWLEDGED',
  /** A named, licensed reviewer signed the export. */
  G4_REVIEWER_NAMED: 'G4_REVIEWER_NAMED',
} as const;
export type Gate = (typeof Gate)[keyof typeof Gate];

export interface GateAcknowledgement {
  readonly gate: Gate;
  readonly actorId: string;
  readonly actorName: string;
  readonly at: string;
  /** Present for G4. The licence the reviewer asserted. */
  readonly licence?: string;
  /**
   * What the actor was shown when they acknowledged.
   *
   * A hash of the material, so that "I acknowledged the assumptions" can be
   * checked against *which* assumptions. Without it an acknowledgement survives
   * an edit to the thing it acknowledged, which would make G3 decorative.
   */
  readonly subjectHash: string;
}

export type GateRecord = Partial<Record<Gate, GateAcknowledgement>>;

export class GateNotSatisfiedError extends Error {
  override readonly name = 'GateNotSatisfiedError';
  constructor(
    readonly gate: Gate,
    readonly action: string,
    detail: string,
  ) {
    super(`${action} is blocked by ${gate}: ${detail}`);
  }
}

export class GateStaleError extends Error {
  override readonly name = 'GateStaleError';
  constructor(readonly gate: Gate) {
    super(
      `${gate} was acknowledged against different content and no longer applies. ` +
        `The material changed after it was acknowledged, so the acknowledgement ` +
        `has lapsed and must be given again.`,
    );
  }
}

const REQUIREMENTS: Readonly<Record<Gate, { action: string; detail: string }>> = {
  [Gate.G1_PLOT_CONFIRMED]: {
    action: 'rule resolution',
    detail:
      'the plot boundary, every edge classification and the plot parameters must be ' +
      'confirmed first. Edge classification has no default (FR-PLT-001 AC3).',
  },
  [Gate.G2_RULES_ACKNOWLEDGED]: {
    action: 'capacity computation',
    detail:
      'the user must see which rules apply, with citations, and which were considered ' +
      'and excluded with reasons, before a number is computed from them.',
  },
  [Gate.G3_ASSUMPTIONS_ACKNOWLEDGED]: {
    action: 'export',
    detail:
      'the assumption register is non-skippable. Where no rule governs, the system ' +
      'declares an assumption, ranks it by how much it moves the answer, and requires ' +
      'acknowledgement before export.',
  },
  [Gate.G4_REVIEWER_NAMED]: {
    action: 'export',
    detail:
      'a named reviewer with an asserted licence must sign the export. The system ' +
      'never says "the AI decided", and it never issues an unsigned document.',
  },
};

/** Assert a gate has been satisfied against the current content. */
export function requireGate(record: GateRecord, gate: Gate, subjectHash: string): void {
  const ack = record[gate];
  if (!ack) {
    const req = REQUIREMENTS[gate];
    throw new GateNotSatisfiedError(gate, req.action, req.detail);
  }
  if (ack.subjectHash !== subjectHash) throw new GateStaleError(gate);
}

/** The gates that must be satisfied before anything may leave the system. */
export const EXPORT_GATES: readonly Gate[] = [
  Gate.G3_ASSUMPTIONS_ACKNOWLEDGED,
  Gate.G4_REVIEWER_NAMED,
];

export function requireExportGates(record: GateRecord, hashes: Record<Gate, string>): void {
  for (const gate of EXPORT_GATES) requireGate(record, gate, hashes[gate]);
}

/**
 * Stable content hash of whatever a gate is acknowledging.
 *
 * FNV-1a over a canonical JSON rendering. This identifies content; it is not a
 * defence against an adversary editing the database, which is a different
 * problem with a different solution.
 */
export function subjectHash(subject: unknown): string {
  const payload = canonical(subject);
  let h = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
}
