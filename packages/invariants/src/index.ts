/**
 * `@envelope/invariants` — the conservation layer. PRD §12, `FR-INV-001`.
 *
 * **This package depends on `@envelope/core` and `decimal.js`. Nothing else.**
 *
 * PRD Principle 4 and §12.3 require the invariant layer to be independent of
 * what it checks — "separate module. No imports from the generator or capacity
 * engine. Enforced by an import linter in CI." In this monorepo that
 * independence is enforced by the package manifest instead: `@envelope/capacity`,
 * `@envelope/geometry` and `@envelope/rules` are absent from `package.json`, so
 * importing one of them does not fail a lint rule — it fails to resolve. A lint
 * rule can be disabled with a comment on the offending line; a missing
 * dependency cannot. That is stronger than the PRD asks for, and it is the
 * whole reason this package is a package.
 *
 * The independence has a limit worth stating, because the PRD does not state it
 * and someone will otherwise assume it away. `FR-INV-001 AC4` also requires the
 * layer to be "owned by an engineer who does not own the capacity engine". A
 * package manifest cannot enforce that, and on a solo build it is not met. See
 * `docs/03-analysis/open-questions.md` Q16 — it must be disclosed in writing,
 * not absorbed.
 *
 * What this layer does not do, from §12.4: it does not "establish compliance,
 * correctness of rules, or fitness for purpose. A configuration can pass every
 * invariant and be entirely non-compliant — it is merely arithmetically
 * coherent."
 */

export {
  INVARIANT_CATALOGUE,
  INVARIANT_IDS,
  InvariantStatus,
  LevelKind,
  PHASE_0_DORMANT,
  PHASE_0_DORMANT_NOTE,
  type CapacityClaim,
  type CheckOutcome,
  type CompositionClaim,
  type EfficiencyClaim,
  type EnvelopeClaim,
  type FarClaim,
  type HeightClaim,
  type InvariantCheck,
  type InvariantId,
  type InvariantSubject,
  type LevelBudgetClaim,
  type LevelComposition,
  type LevelRecord,
  type Numeric,
  type ParkingClaim,
  type UnitSchedule,
  type UnitTypeRecord,
} from './catalogue.js';

export {
  assertInvariants,
  formatInvariantReport,
  InvariantViolationError,
  runInvariants,
  type InvariantReport,
  type InvariantResult,
} from './runner.js';
