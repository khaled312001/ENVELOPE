/**
 * Bounded, conservative, monotone fixpoint — PRD §11.7.
 *
 * §11.7 specifies this machinery for one case: the occupant-load circularity
 * (applicable rules depend on occupant load → load depends on the design →
 * design depends on the rules). It is written as if that were the only
 * circularity in the system.
 *
 * **It is not.** The setback rule the deck sells the product on is circular in
 * exactly the same shape: the boundary setback depends on how many floors the
 * building has (3.00 m at ground, rising to 7.50 m at G+9 and above), the floor
 * count depends on the footprint, and the footprint depends on the setback.
 * `FR-PLT-002` nevertheless specifies the envelope solver as a one-directional
 * pipeline with no iteration, no convergence and no bound — so **as written,
 * Phase 0 cannot compute the deck's own slide 05.** See `CLAUDE.md` and
 * `docs/03-analysis/open-questions.md`.
 *
 * The resolution here is to lift §11.7's six steps out of the occupant-load
 * context and apply them to any circular applicability. That is the smallest
 * honest fix: it introduces no new policy, it reuses machinery the client has
 * already reviewed and approved in principle, and it makes the *same*
 * guarantees — conservative seed, convergence on the rule set rather than the
 * value, five-iteration bound, and a named non-convergence outcome that asks a
 * human instead of guessing.
 */

/** Why the iteration stopped. */
export const FixpointStatus = {
  CONVERGED: 'CONVERGED',
  /**
   * §11.7 step 5. The rule set oscillates across a threshold. The system does
   * **not** pick one — it names the oscillating rules and the threshold they
   * straddle and requires a `USER_SET` declaration to resume.
   */
  NON_CONVERGENT_APPLICABILITY: 'NON_CONVERGENT_APPLICABILITY',
} as const;
export type FixpointStatus = (typeof FixpointStatus)[keyof typeof FixpointStatus];

/** §11.7 step 4. Five, stated in the PRD, not a tunable. */
export const MAX_ITERATIONS = 5 as const;

export interface Iteration<S> {
  readonly index: number;
  /** The state this iteration started from. */
  readonly seed: S;
  /** The state it produced. */
  readonly result: S;
  /**
   * Identity of the applicable rule set at this iteration. Convergence is tested
   * on this, **not** on the numeric state — §11.7 step 3: "rules switch at
   * thresholds, so load can oscillate within a band while the rule set is
   * stable."
   */
  readonly ruleSetKey: string;
  /** Human-readable note carried into the provenance graph and the report. */
  readonly note: string;
}

export interface FixpointOutcome<S> {
  readonly status: FixpointStatus;
  readonly state: S;
  /** §11.7 step 6: "the iteration history is part of the provenance graph". */
  readonly history: readonly Iteration<S>[];
  readonly iterations: number;
  /** Present when non-convergent: the rules that oscillated. */
  readonly oscillating?: readonly string[];
  /** Present when non-convergent: a description of the threshold being straddled. */
  readonly straddledThreshold?: string;
}

export interface FixpointSpec<S> {
  /**
   * §11.7 step 1 — SEED CONSERVATIVELY.
   *
   * The seed must over-estimate, so that the *more* restrictive rule set is
   * selected first and the iteration converges downward. §11.7 is explicit
   * about why: "an optimistic seed can converge to a rule set that is less
   * restrictive than the true one — a silent under-constraint."
   */
  readonly seed: S;
  /** §11.7 step 2 — ITERATE. Compute rule set from state, then state from rules. */
  readonly step: (state: S, index: number) => { readonly next: S; readonly note: string };
  /** §11.7 step 3 — the convergence key. Identity of the applicable rule set. */
  readonly ruleSetKey: (state: S) => string;
  /**
   * Describes the threshold two oscillating rule sets straddle, for the
   * non-convergence message. Optional: without it the message names the rules
   * but not the boundary.
   */
  readonly describeThreshold?: (a: S, b: S) => string;
}

/**
 * Run the fixpoint.
 *
 * Never throws on non-convergence — a halted parameter is a product state the
 * UI must render (§20.1 has no screen for it; see Q12 in the open questions),
 * not an exception to swallow.
 */
export function runFixpoint<S>(spec: FixpointSpec<S>): FixpointOutcome<S> {
  const history: Iteration<S>[] = [];
  let state = spec.seed;
  let previousKey = spec.ruleSetKey(state);

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const { next, note } = spec.step(state, i);
    const key = spec.ruleSetKey(next);

    history.push({ index: i, seed: state, result: next, ruleSetKey: key, note });

    // §11.7 step 3: converged when the applicable rule set is identical across
    // two consecutive iterations.
    if (key === previousKey) {
      return {
        status: FixpointStatus.CONVERGED,
        state: next,
        history,
        iterations: i + 1,
      };
    }

    previousKey = key;
    state = next;
  }

  // §11.7 step 5 — NON-CONVERGENCE. Name what oscillated; do not choose.
  const keys = history.map((h) => h.ruleSetKey);
  const oscillating = symmetricDifference(keys);
  const last = history[history.length - 1];
  const secondLast = history[history.length - 2];

  return {
    status: FixpointStatus.NON_CONVERGENT_APPLICABILITY,
    state,
    history,
    iterations: MAX_ITERATIONS,
    oscillating,
    ...(spec.describeThreshold && last && secondLast
      ? { straddledThreshold: spec.describeThreshold(secondLast.result, last.result) }
      : {}),
  };
}

/**
 * Rule ids that appear in some iterations' rule sets but not others — the ones
 * actually switching on and off across the threshold.
 *
 * Rules present in every iteration are stable and are not the cause; naming them
 * in the error would bury the two that matter.
 */
function symmetricDifference(keys: readonly string[]): readonly string[] {
  const sets = keys.map((k) => new Set(k.split('|').filter(Boolean)));
  if (sets.length === 0) return [];
  const everywhere = [...sets[0]!].filter((id) => sets.every((s) => s.has(id)));
  const all = new Set(sets.flatMap((s) => [...s]));
  for (const id of everywhere) all.delete(id);
  return [...all].sort();
}
