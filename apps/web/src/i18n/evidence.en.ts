/**
 * Step 8 — Evidence, in English.
 *
 * `export type EvidenceDictionary = typeof EN`; `evidence.ar.ts` is held to it.
 *
 * Every figure on this screen is a `TracedValue` and opens its derivation; the only
 * copy is what each figure is called. The rule id that set an edge's setback, and
 * the setback itself, are the engine's and stay in the component.
 */

export const EN = {
  plot: {
    title: 'The plot, with what the rules took off it',
    subtitle: 'The hatched strip is setback. Select an edge to see which rule set it.',
  },

  numbers: {
    title: 'Every number in this run',
    subtitle: 'Each one opens its derivation. None of them resolves to “the system decided”.',
  },

  groups: {
    envelope: 'Envelope',
    parking: 'Parking',
    capacity: 'Capacity',
  },

  rows: {
    setbackFootprint: 'Setback-permitted footprint',
    coverageCap: 'Coverage cap',
    podiumFootprint: 'Podium footprint',
    towerPlate: 'Tower plate',
    heightCeiling: 'Height ceiling',
    floorToFloor: 'Floor to floor',
    levelsByHeight: 'Levels by height',
    residentBays: 'Resident bays',
    visitorBays: 'Visitor bays',
    totalBays: 'Total bays',
    areaPerBay: 'Area per bay',
    areaRequired: 'Area required',
    unitsParkingCarries: 'Units parking can carry',
    bandA: 'Band A — regulatory',
    bandB: 'Band B — geometric',
    bandC: 'Band C — parking',
    governing: 'Governing',
    levels: 'Levels',
    realismDiscount: 'Realism discount',
  },

  /** The selected edge, said in a sentence. The rule id and the setback are the engine's. */
  edge: {
    edge: 'Edge ',
    /** What the edge faces, from the engine's classification token. */
    faces: (classification: string): string =>
      ` faces ${classification.toLowerCase().replace('_', ' ')}. `,
    setbackBefore: 'The setback of ',
    setbackMid: ' came from ',
    setbackAfter: '. ',
    showDerivation: 'Show the derivation',
    noSetback: 'No setback resolved for this edge.',
  },
};

export type EvidenceDictionary = typeof EN;
