/**
 * Step 2 — confirm the plot, then `G1`. In English.
 *
 * `export type ParametersDictionary = typeof EN` is the contract `parameters.ar.ts`
 * is held to; no `as const`. Every string was lifted out of `ParametersStep.tsx`
 * unedited.
 *
 * NOT IN HERE: the plot number, the community, the computed area and the count of
 * road frontages, which are the plot's; the 2% tolerance and the phase number,
 * which the component supplies because no digit is typed into a dictionary.
 *
 * `shapes` labels the engine's shape-class tokens. English prints the token itself,
 * lower-cased, so it has no table — `null` says "use the token". A token nobody has
 * labelled falls back to the token in either language rather than to a guess.
 */

export const EN = {
  title: 'Confirm the plot',
  subtitle:
    'Everything after this is computed from what is on this screen. Check it while changing it is still free.',

  mismatch: {
    title: (tolerance: string): string => `The two areas disagree by more than ${tolerance}.`,
    body: 'The area computed from your dimensions and the area printed on the affection plan differ. One of them is wrong, and we do not assume it is yours — check which before continuing.',
  },

  fields: {
    plot: 'Plot',
    landUse: 'Land use',
    /** The only land use this phase computes, so the screen states it rather than reading it. */
    landUseValue: 'Residential tower',
    computedArea: 'Computed area',
    shape: 'Shape',
    /** The leading space and dash are the sentence's. */
    shapeScope: (phase: string): string =>
      ` — Phase ${phase} handles rectilinear and simple convex plots only`,
    roadFrontages: 'Road frontages',
  },

  shapes: null as Readonly<Record<string, string>> | null,

  gate: {
    confirmed: 'Plot confirmed.',
    pending:
      'Rules cannot resolve until this is confirmed — they key on the edge classifications above.',
    confirm: 'This is the plot',
  },
};

export type ParametersDictionary = typeof EN;
