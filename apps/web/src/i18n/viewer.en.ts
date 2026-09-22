/**
 * The 3D view's controls and hints, in English.
 *
 * `export type ViewerDictionary = typeof EN`; `viewer.ar.ts` is held to it.
 *
 * THE PICTURE IS NOT COPY. The scene — every slab, car, ramp and the glass — is
 * built by `@envelope/massing` from the engine's model, and nothing here reaches
 * it. What is here is the toolbar round it, the hint under it and the sentence that
 * stands in for it where WebGL is missing.
 *
 * `scene` IS THE ONE EXCEPTION, AND IT IS A LOOKUP, NOT A TRANSLATION. The words
 * written beside the model (a level's "permitted, not placed", a ramp's "gradient
 * not assessed") are composed by `@envelope/massing` around the model's own names
 * and figures. The English values below ARE those phrases, exactly as the package
 * writes them; the viewer finds each and puts the active locale's phrase in its
 * place. In English that is the identity, and the level name, id and figure round
 * each phrase are never touched in either language.
 *
 * NO FIGURE. "3D" is passed in by the component wherever a sentence names it.
 */

export const EN = {
  /** The model's accessible name when the page gives none. */
  label: (view: string): string =>
    `The building in ${view}. Every level in it is listed in the table below.`,
  roleDescription: (view: string): string => `${view} view`,

  turnOn: 'Turn and zoom the model',
  reset: 'Reset the view',
  viewGroup: 'View',
  /** The two views. The first is named by the component's constant in English. */
  axon: (view: string): string => view,
  top: 'From above',
  show: 'Show',
  everyLevel: 'Every level',
  notPlaced: ' · permitted, not placed',
  spread: 'Pull the levels apart',
  cutAt: 'Cut through at',
  noCut: 'no cut',

  hint: {
    figureLive:
      'Drag to turn it, and scroll or pinch to zoom. With it focused, the arrow keys turn it ' +
      'and Home starts again.',
    figureStill: 'It stays still until you turn it on, so scrolling over it moves the page.',
    full:
      'Drag to turn it and scroll to zoom — or, once it has focus, use the arrow keys (Shift ' +
      'to pan), + and − to zoom and Home to start again.',
    select: ' Select a car, a slab, the ramp or the envelope to see where it came from.',
  },

  north: '↑ Grid north',
  failed: (view: string): string =>
    `This browser could not start ${view} drawing — WebGL is switched off or unavailable. ` +
    `Every level is listed in the table below, and each parking level is drawn on the ` +
    `Parking step.`,

  /** The package's phrases beside the model, and what each becomes. See the file comment. */
  scene: {
    permittedNotPlaced: 'permitted, not placed',
    gradientNotAssessed: 'gradient not assessed',
    heightCeiling: 'Height ceiling',
    setback: 'setback',
  },
};

export type ViewerDictionary = typeof EN;
