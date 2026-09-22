/**
 * The parking level and the vehicle-access panel, in English.
 *
 * `export type ParkingPlanDictionary = typeof EN`; `parkingPlan.ar.ts` is held to it.
 *
 * THE DRAWING IS NOT IN HERE. Every rectangle in the plan is one the engine placed;
 * this module holds the words round it — the caption, the legend beneath it, the
 * figures' names, and the drawing's accessible name. Every access rationale and
 * refusal reason, and every line of what was not assessed, is the engine's and
 * stays in the component.
 *
 * NO FIGURE. The clauses (Table B.11, B.7.2.2, B.7.2.1), the 15 m junction
 * clearance and every dimension arrive from the component or the level plan. The
 * helpers carry word order around them.
 */

export const EN = {
  none: 'No level was laid out for this run.',

  packing: {
    exact:
      'The podium is a rectangle, so the level was packed on its own outline — nothing was ' +
      'given up to draw it.',
    notRectangle: 'The podium is not a rectangle.',
    /** Before the coverage percentage. Leading space is the sentence's. */
    before: ' The level was packed into the largest rectangle inside it — ',
    percentOf: '% of the footprint',
    shownDashed: ', shown dashed',
    after: '. The bay count is a floor, not a ceiling.',
  },

  figures: {
    bays: 'Bays laid out',
    areaPerBay: 'Area per bay achieved',
    moduleDepth: 'Module depth',
    deductions: 'Cores, plant and ramp landing',
  },

  /** The drawing's accessible name. Every figure is the level plan's. */
  summary: (bays: string, width: string, depth: string, areaPerBay: string): string =>
    `${bays} bays laid out on a ${width} by ${depth} metre level, at ${areaPerBay} square ` +
    `metres per bay`,
  summaryAccess: (width: string, frontage: string): string =>
    `. Vehicle access ${width} m wide on frontage ${frontage}.`,
  summaryNoAccess: '. No frontage on this plot can take a vehicle access.',

  legend: {
    label: 'What the drawing shows',
    bay: 'Bay — ',
    times: ' × ',
    /** Before the clause the bay dimensions come from. */
    bayUnit: ' m, Table ',
    aisle: 'Drive aisle — ',
    aisleUnit: ' m, ',
    twoWay: 'two way',
    oneWay: 'one way',
    ramp: 'Ramp — ',
    rampOnly: 'plan area only.',
    /** Before the clause that was not reached. */
    rampBefore: ' Gradient, transitions and headroom under ',
    rampMid: ' are ',
    rampNot: 'not assessed',
    rampAfter: '.',
    access: 'Vehicle access — recommended, not decided for you',
  },

  access: {
    title: 'Vehicle access',
    /** Around the clause and the junction clearance, both of which the component supplies. */
    subtitleBefore: 'Where the driveway can go, ranked. ',
    subtitleMid: ' measures its ',
    subtitleAfter:
      ' junction clearance from the chamfered corner of the plot, and prefers the more ' +
      'secondary of the frontages.',
    frontage: 'Frontage ',
    /** The road a frontage faces, from the engine's hierarchy token. */
    road: (hierarchy: string): string => ` — ${hierarchy.toLowerCase()} road`,
    recommended: (width: string, offset: string): string =>
      `, ${width} m wide, centred ${offset} m along it.`,
    usable: (window: string): string =>
      `${window} m of that frontage is clear of both corners once the junction clearance is ` +
      `taken off each end.`,
    noneTitle: 'No frontage on this plot can take a vehicle access.',
    noneBody:
      ' Every boundary was refused for the reason listed below. This is a finding about the ' +
      'plot, not a failure of the run.',
    alternatives: 'Alternatives',
    alternativeWindow: (window: string): string => `. ${window} m clear window.`,
    refused: 'Refused, and why',
    notAssessed: 'Not assessed',
    showDerivation: 'Show how this placement was derived',
  },
};

export type ParkingPlanDictionary = typeof EN;
