/**
 * `@envelope/validation` — the independent validation module. PRD §16,
 * `FR-VAL-001`, Principles 5, 7 and 8.
 *
 * **The dependency list is the architecture.** `package.json` names
 * `@envelope/core`, `@envelope/rules` and `decimal.js`. It does not name
 * `@envelope/capacity` or `@envelope/geometry`, and `tsconfig.json` references
 * only `../core` and `../rules`. §16.3 asks for an import linter; this is
 * stronger — importing the generator from here does not fail a lint rule, it
 * fails to resolve. The same structural argument `CLAUDE.md` makes for
 * `@envelope/invariants`.
 *
 * The validator may read the rule base because the rule base is what it
 * validates against (§16.4 says so in as many words: "the validator evaluates
 * the same encoded constraint set the generator consumed"). It may not read the
 * thing that produced the answer.
 *
 * **What this package does not establish.** {@link INDEPENDENCE_LIMIT} is
 * exported so every report prints it, and it is the honest summary of this
 * module's reach: implementation independence is not semantic independence.
 * Agreement between this module and the generator is self-consistency. It is
 * never compliance, and {@link assertClaimStatementHonest} exists to stop any
 * output saying otherwise.
 */

export * from './categories.js';
export * from './claims.js';
export * from './validate.js';
