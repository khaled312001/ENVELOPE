/**
 * The click-through derivation tree, in English.
 *
 * `export type ProvenanceTreeDictionary = typeof EN`; `provenanceTree.ar.ts` is held
 * to it.
 *
 * WHAT IS TRANSLATED IS THE RELATION, NEVER THE NODE. "computed as", "using",
 * "cited in" are the panel's own words and are copy. Every node — a formula, a rule
 * id, a clause quoted verbatim from its instrument, a basis, a parameter id, a
 * person's name — is the engine's record and renders as the engine wrote it. A
 * derivation whose clause text had been translated would be quoting a clause
 * nobody issued.
 */

export const EN = {
  title: 'Where this number came from',
  close: 'Close derivation',
  loading: 'Loading the derivation…',
  none: 'No derivation was recorded for this value.',
  footer:
    'Every value in this run resolves to a rule, an assumption, or a person. Nothing ' +
    'resolves to “the system decided”.',

  /** How each edge kind reads in a sentence. An edge kind not listed shows its token. */
  edges: {
    derivedFrom: 'computed as',
    uses: 'using',
    citedIn: 'cited in',
    enteredBy: 'entered by',
    justifiedBy: 'because',
    boundedBy: 'bounded by',
    sourcedFrom: 'from',
    sensitiveTo: 'sensitive to',
    supersededBy: 'superseded by',
  },

  collapse: (label: string): string => `Collapse ${label}`,
  expand: (label: string): string => `Expand ${label}`,

  assumed: 'assumed',
  binding: 'binding',
};

export type ProvenanceTreeDictionary = typeof EN;
