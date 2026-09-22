/**
 * The massing panel — the words beside the 3D view — in English.
 *
 * `export type MassingDictionary = typeof EN`; `massing.ar.ts` is held to it.
 *
 * NOT IN HERE, AND NOT TRANSLATED IN EITHER LANGUAGE: every placement statement,
 * every line of `notModelled`, each level's id and name, each volume's note. Those
 * are the engine's account of what it placed and what it left out, and the Arabic
 * page renders them as the engine wrote them. A placement statement is the reason
 * a building is drawn amber; a translated one would be a reason nobody gave.
 *
 * NO FIGURE. "3D" and the affection-plan example `G+2P+8` stay in the component,
 * passed to the helpers that need them.
 */

export const EN = {
  title: 'Massing',
  subtitle:
    'The building the engine laid out, level by level, inside the envelope the rules ' +
    'permit. Nothing here is designed: there are no façades, cores or units, because the ' +
    'engine computes none of them.',
  stored: (view: string): string =>
    `This run was computed before the engine built a model of the whole building, so there ` +
    `is no ${view} view of it. Compute the run again to see its levels, bays and ramp stood up.`,

  answer: {
    partial:
      'The solid levels are the answer. The outlines above them are room the rules leave unused.',
    whole: 'Every level drawn is one the answer places.',
    /** After the engine's placement statement, before the traced level count. */
    levelsPlaced: ' Levels this answer places: ',
  },

  /** The podium/tower split, which an affection plan states and this run was not given. */
  heights: {
    title: 'This shape rests on an assumption, and it is drawn that way.',
    before:
      'The total height is derived: the height ceiling divided by the floor-to-floor, both ' +
      'from cited rules. What is ',
    not: 'not',
    /** Up to the affection-plan example, which the component supplies. */
    mid:
      ' derived is where the podium stops and the tower starts — an affection plan states ' +
      'that (“',
    afterExample: '” is two podium levels) and this run was not given one. So ',
    and: ' and ',
    after:
      ' carry the amber, and the step-back you can see in the picture is the part to distrust. ' +
      'It changes no capacity figure in this run.',
    /** A volume named inside that sentence. */
    volume: (_id: string, label: string): string => label.toLowerCase(),
  },

  placements: {
    title: 'Where each part stands is the engine’s placement, not a rule’s.',
    body:
      'The areas are computed; their positions on the plot are not, because no rule fixes ' +
      'them. So the engine placed them, and the outlines are drawn amber for it:',
  },

  levels: {
    caption: (view: string): string =>
      `Every level and ramp in the ${view} view, with its floor level, the bays laid out on ` +
      `it, and where its outline or its slope came from`,
    columns: {
      level: 'Level',
      floorLevel: 'Floor level',
      bays: 'Bays',
      source: 'Outline or slope',
    },
    notPlaced: ' · permitted, not placed',
    notParking: 'none — not a parking level',
    outlineOf: (levelId: string): string => `${levelId} outline`,
    ramp: 'Ramp ',
    rampDetail: (from: string, to: string): string => `· ${from} to ${to}, gradient not assessed`,
    everyParkingLevel: 'Every parking level',
    heightCeiling: 'Height ceiling',
    setbackLine: 'Setback line',
    /** A source's button: what it is, its class, and the way in to its derivation. */
    sourceLabel: (what: string, provenance: string): string =>
      `${what}: ${provenance}. Show where it came from.`,
  },

  volumes: {
    caption:
      'The podium and the tower, with the height each was built to and where that height came from',
    columns: {
      volume: 'Volume',
      levels: 'Levels',
      base: 'Base',
      height: 'Height',
      what: 'What it is',
    },
    /** A volume's name in its own row. */
    name: (_id: string, label: string): string => label,
    total: 'Total',
    totalNote:
      'Built height. The height ceiling this was derived from is a planning limit, not a ' +
      'structural or aviation one — neither is assessed.',
  },

  notModelled: 'Not in this model',
};

export type MassingDictionary = typeof EN;
