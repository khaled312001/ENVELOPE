/**
 * The three capacity bands, and which one binds — in English.
 *
 * `export type BandsDictionary = typeof EN`; `bands.ar.ts` is held to it.
 *
 * THE LETTERS STAY IN THE COMPONENT. A, B and C are how the PRD, the report and
 * every export name the bands, and a reader matching one against another needs the
 * same letter on both, so they are not words in either language.
 *
 * NOT IN HERE: the binding constraint's label and rule id, the explanation, the
 * governing assumption's label and basis, and every figure. Those are the engine's.
 */

export const EN = {
  bands: {
    REGULATORY: {
      name: 'Regulatory capacity',
      question: 'What do FAR and the area caps permit?',
    },
    GEOMETRIC: {
      name: 'Geometric capacity',
      question: 'What does the envelope physically hold?',
    },
    PARKING: {
      name: 'Parking capacity',
      question: 'What can the achievable parking supply support?',
    },
  },

  title: 'Capacity',
  subtitle:
    'Three limits, computed separately. The governing capacity is the smallest — not the ' +
    'largest, and never an average.',

  governing: 'Governing capacity',
  /** Before the band's letter; the band's name follows it, in lower case in English. */
  band: 'Band ',
  bandName: (name: string): string => name.toLowerCase(),

  binding: 'Binding constraint',
  headroom: 'Headroom to the next limit',
  /** After the headroom figure. Leading space is the sentence's. */
  beforeBinds: (band: string): string => ` before ${band} binds`,
  levels: 'Levels',
  lostToFloors: 'Lost to whole floors',
  /*
    BOTH SALEABLE FIGURES, BECAUSE ONLY ONE OF THEM WAS TYPED.

    The rules step asks for a share of GFA or an area in square metres, and the
    engine publishes whichever one it computed beside the one it was given. A
    reader who entered 6,000 m² and sees a 34% share knows immediately that one
    of the two numbers is from a different plot — which is the whole point of
    showing it rather than storing it.
  */
  saleableArea: 'Saleable area',
  saleableShare: 'Saleable share of GFA',

  assumed: 'Assumed',
  /** Around the two governing figures the perturbation moved it between. */
  perturbedBefore: (perturbation: string): string =>
    `Perturbed by ${perturbation}, the governing capacity moves between `,
  perturbedAnd: ' and ',
  perturbedAfter: ' m².',

  binds: 'binds',

  realismLabel: 'Your realism discount',
  realismNote:
    'The engine does not estimate what is “realistically” achievable. That would need ' +
    'achieved-versus-permitted FAR and efficiency data that no public source carries, and a ' +
    'number invented from a heuristic is the one number you could not check. If you want to ' +
    'discount these figures, you set the factor and it is recorded as yours.',
};

export type BandsDictionary = typeof EN;
