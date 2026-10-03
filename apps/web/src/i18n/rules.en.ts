/**
 * Step 3 — the rules, the parking-in-FAR question, the developer-standard picker
 * and the saleable-efficiency question. In English.
 *
 * `export type RulesDictionary = typeof EN` is the contract `rules.ar.ts` is held
 * to; no `as const`. Every string was lifted out of `RulesStep.tsx` unedited.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS NOT IN HERE, AND WHY THE LINE IS WHERE IT IS.
 *
 * 1. EVERY RULE RECORD, AND EVERY DEVELOPER STANDARD, IS RENDERED AS ISSUED.
 *    Rule ids, parameter ids, instruments, clause references and rule notes are the
 *    rule store's. A standard's developer, title, scenario labels, unit-type labels,
 *    derivations, citations, range notes and not-mechanised items are the
 *    developer's commercial text, transcribed with a page and a bounding box so the
 *    transcription can be checked. The API's warning, disclaimer, withheld reason
 *    and comparison verdict are the API's. None of them is copy.
 *
 * 2. THE BASES `RulesStep.tsx` SENDS WITH A RUN ARE NOT HERE EITHER. The generic
 *    mix's basis, the usable-fraction basis and the saleable-efficiency basis look
 *    like interface copy and are not: they are posted to the engine, recorded in the
 *    provenance graph, printed in the report and signed at G4. They stay English in
 *    the component, in both languages, for the reason a basis string is never
 *    translated.
 *
 * 3. NO DIGIT. The 15–35% swing, the phase number, the example height code and its
 *    podium digit, the example efficiency, the 1.00 the engine used to assume, and
 *    the bounds of a valid efficiency are supplied by the component. The helpers
 *    below carry the word order around them, never the value.
 *
 * `THIS IS NOT A REGULATION` — `standard.notice` — IS translated. It is the
 * interface's own sentence, it sits in amber above the picker, and it is the one
 * line on this screen whose job is to stop a commercial brief being read as law.
 */

export const EN = {
  parkingInFar: {
    title: 'Does parking count toward FAR here?',
    subtitle: (swing: string): string =>
      `This changes the answer by ${swing}. There is no default and we will not assume one.`,
    legend: 'Parking-in-FAR treatment',
    counts: {
      label: 'Yes, it counts',
      detail: 'Parking area consumes part of the permitted floor area, so less is left to sell.',
    },
    excluded: {
      label: 'No, it is excluded',
      detail: 'The full permitted floor area is available above the parking.',
    },
    open: {
      label: 'I don’t know yet',
      detail:
        'A legitimate answer. We will not compute a capacity, but we will show you what each treatment would be worth.',
    },
    compare: 'Show me what each answer is worth',
    compareNeeds:
      'The comparison runs the pipeline twice, so it needs the saleable share of GFA below first.',
    ifCounts: 'If it counts',
    ifExcluded: 'If it is excluded',

    /*
      THE PRE-FILLED ANSWER, AND THE WORDS IT CAME FROM.

      `FR-DEF-002` forbids a default on this question. A pre-filled answer is not
      a default only if the reader can see whose answer it is, read it in the
      words it was given in, and see where the claim stops — so all three are on
      the screen, above the choice, before anything is selected.

      Held to the same discipline as the developer-standard picker: it is not a
      regulation, and the screen says so first.
    */
    statement: {
      notARule: 'This is not a regulation.',
      /** The stator's name and role follow. */
      prefilledBefore: 'The answer below is pre-filled from what ',
      prefilledBetween: ', ',
      /** The date follows. */
      prefilledAfter: ', told us on ',
      prefilledEnd: '. Change it and it becomes your answer, recorded under your name.',
      saidLabel: 'In his words',
      translationLabel: 'Translation',
      limitsLabel: 'Where this stops',
      /** The offer. One click, and the answer below becomes the statement's. */
      use: 'Use this answer',
      /** After it has been taken. A pressed button that does nothing is not left on screen. */
      inUse: 'This is the answer below, recorded under his name. Change it and it becomes yours.',
      /** On the choice itself, while his answer is the one selected. */
      badge: 'From the statement above',
    },
  },

  /*
    THE LEVEL SCHEDULE — Eng. Mohamed's point, 2026-09-28.

    This panel was two number fields: "levels available" and "podium levels".
    Neither says what the building is. A basement, the ground floor and a podium
    level behave differently — a basement has no setback and costs ramp length,
    the ground floor carries the vehicle entrance, a podium level is bound by the
    podium setback — and one integer flattened all three.
  */
  /*
    THE CORE — Eng. Mohamed, 2026-09-28: the core must be in the calculation, and
    it is the one thing he called الاهم.

    The copy leads with what the core does NOT do. "In the calculation" reads as
    "subtracted from the floor area", and it is not subtracted: a core is inside
    GFA and outside saleable area, so the saleable figure one panel up already
    carries it. A reader who assumes otherwise will take the capacity figure as
    wrong by the size of the core.

    And the field arrives EMPTY on purpose. An empty box here means "I have not
    said", which the engine answers with an assumption it declares in amber, with
    a basis and a measured sensitivity. A number in the box on arrival would be
    the hidden default this product refuses everywhere else.
  */
  core: {
    title: 'The core',
    subtitle:
      'Lifts, escape stairs, risers and the lift lobby, as one area on a typical floor. ' +
      'Leave it empty and the engine assumes one, in amber, and says what it assumed.',
    label: 'Core area on a typical floor (m²)',
    placeholder: (example: string): string => `e.g. ${example}`,
    /** The assumed share sits between these. */
    help: {
      before: 'Left empty, the engine takes ',
      after:
        ' of the tower plate — the middle of what a residential tower core takes — and ' +
        'marks it as assumed wherever it appears. Enter a figure and it is recorded as ' +
        'yours. It is refused only if it cannot be a core of this plate, and the refusal ' +
        'names both areas.',
    },
    invalid: 'A core area is a number greater than zero.',
    /** The figure the run will post sits between these, when it is not what was typed. */
    readAs: { before: 'The engine reads this as ', after: '.' },
    notSubtracted:
      'Nothing above is reduced for the core. A core is inside GFA and outside saleable ' +
      'area, so the saleable figure you gave already accounts for it, and on a parking ' +
      'level it is inside what the usable fraction deducts. The engine draws the core and ' +
      'compares it against both, on the results screen.',
  },

  levels: {
    title: 'The levels',
    subtitle:
      'What the building is made of, from the bottom up. The tower is not entered here — it comes out of the run.',
    basements: 'Basements',
    basementsHelp: 'Below grade, all parking. Nothing else below grade is modelled.',
    groundIsParking: 'The ground floor is parking',
    groundHelp:
      'It carries the vehicle entrance whatever is on it. Leave it clear for retail or a lobby.',
    podiumAbove: 'Podium levels above the ground floor',
    podiumParking: 'Of those, levels holding parking',
    podiumParkingHelp: 'Counted from the ground up — a Dubai podium is filled from the bottom.',
    /** The height code as printed sits between these. */
    fromSheetBefore: 'Read from the affection plan as ',
    fromSheetAfter: '. Confirm or change it — the run records it under your name.',
    /** An example podium digit and the height code it is read from sit between these. */
    example: {
      before: 'The number of podium levels in the height code, such as the ',
      between: ' in ',
      after: '. The ground floor is not one of them.',
    },
    /** The live readout. The tower count is absent until the run produces one. */
    codeLabel: 'This schedule reads',
    codeNote:
      'The way a height code is written on an affection plan. The tower count is added once the run produces one.',
    /*
      The lead-in on the refusal. The sentence after it is the ENGINE'S, in
      English, in both languages — the same ruling as the error banner, which
      prints the API's own words because the API is the only party that knows
      why. What the banner does and this did not is say, in the reader's
      language, what kind of thing is about to be said.
    */
    problemLead: 'This schedule does not describe a building.',
    parkingLabel: 'Parking levels',
    parkingNote: 'Basements, plus the ground floor if it is parking, plus the podium levels that hold it.',
  },

  rules: {
    title: 'The rules',
    subtitle: 'What will be applied, and what will not. Both matter.',
    noneApproved: 'No rule in this deployment is approved.',
    loading: 'Loading the rule set…',
    groups: {
      generative: {
        title: 'Construct the envelope',
        note: 'These build geometry directly — a setback becomes an offset, not a test.',
      },
      filtering: {
        title: 'Prune candidates',
        note: 'Applied while constructing; a violating candidate is never created.',
      },
      evaluative: {
        title: 'Can only reject, never construct',
        note: (phase: string): string =>
          `Topological rules have no constructive inverse. In Phase ${phase} nothing generates a floorplate, so these can only be declared.`,
      },
      deferred: {
        title: 'Applicable, and not assessed',
        note: 'Declared in every output so that what we did not check is visible rather than absent.',
      },
    },
    lifeSafety: 'life safety',
    notAssessed: 'not assessed',
  },

  /**
   * The unit mix, disclosed before the run rather than after it.
   *
   * The basis is NOT here — it is posted to the engine and printed in the report,
   * so it stays in the component in both languages, for the reason given at the
   * head of this file.
   */
  mix: {
    title: 'The unit mix this run will use',
    subtitle:
      'The unit count is the permitted floor area divided by what one unit takes. These are the areas it will be divided by.',
    /** The share arrives already converted to a percentage. */
    share: (percent: string): string => `${percent}% `,
    area: (m2: string): string => ` at ${m2} m² net saleable`,
    assumed: 'Assumed.',
    userSet: 'Entered.',
  },

  standard: {
    title: 'Build to a developer’s standard',
    subtitle:
      'Optional, and it changes the answer. A developer’s brief fixes the unit mix and the areas a scheme is priced on — which is what turns a permitted GFA into a unit count.',
    /** Amber, above the picker. The API's own disclaimer follows it verbatim. */
    notice: 'This is not a regulation.',
    brief: {
      /** The brief's id sits after `before`, its plot number after `plot`. */
      before: 'This plot has its own brief — ',
      plot: ', plot ',
      end: '.',
      /** The brief's FAR sits after `statesFar`, its GFA after `statesAnd`. */
      statesFar: 'It states FAR ',
      statesAnd: ' and ',
      statesGfa: ' m² of GFA.',
      replaces:
        'Its scenarios replace the general standard’s — the wider mix does not apply to this plot.',
    },
    none: {
      label: 'None — use a generic mix',
      detail:
        'A stand-in nobody entered. It is declared as an assumption, and it moves the unit count directly.',
    },
    fromBrief: 'from this plot’s brief',
    /** A unit type's share, then its label as the standard names it, then its area. */
    entryShare: (percent: string): string => `${percent}% `,
    entryArea: (area: string): string => ` at ${area} m²`,
    entrySeparator: ' · ',
    whereFrom: 'Where these areas come from',
    /** Between the clause reference and the page number. */
    page: ', p. ',
    quoteBefore: ' — “',
    quoteAfter: '”',
    notMechanized: 'What the standard asks for and this engine does not do',
  },

  efficiency: {
    title: 'How much of the GFA is saleable?',
    subtitle: (assumed: string): string =>
      `Cores, corridors, structure, plant and amenity are all inside GFA and none of them sells. There is no default here: this engine used to take ${assumed} without saying so, and reported more units than any building holds.`,
    label: 'Saleable area ÷ GFA',
    placeholder: (example: string): string => `e.g. ${example}`,
    /**
     * With a standard selected: the developer's name, the two ends of its range and
     * its own wording sit between these.
     */
    fromStandard: {
      before: '',
      states: ' states ',
      to: ' to ',
      quoteBefore: ' — "',
      after: '". Whatever you enter is recorded as yours.',
    },
    bounds: (above: string, atMost: string): string =>
      `A number above ${above} and at most ${atMost}. Whatever you enter is recorded as yours.`,
    /** The validation message: what is wrong, and why the bound is where it is. */
    invalid: (above: string, atMost: string): string =>
      `It has to sit above ${above} and at most ${atMost}. Above ${atMost} would mean the building sells more area than it has.`,
    /** The figure the run will post sits between these, when it is not what was typed. */
    readAs: { before: 'The engine reads this as ', after: '.' },
    /**
     * A share typed as a percentage without its sign. The two ways of writing it
     * sit after `before` and `or`. It is refused, not divided: without the sign
     * nothing says it is a percentage.
     */
    percentHint: {
      before: (atMost: string): string =>
        `Above ${atMost}, so this looks like a percentage. Enter `,
      or: ', or ',
      after: '.',
    },

    /*
      TWO WAYS TO SAY THE SAME THING, because a reader works in one of them and
      converting in their head is where the mistake goes in. Eng. Mohamed on this
      field: the number he has is an area — two thousand square metres or more —
      and this asked him for a factor between 0 and 1.
    */
    unit: {
      legend: 'Enter it as',
      /* Each option carries the one thing that distinguishes it, in the same
         shape the parking question uses — a label and a consequence. The
         consequence here is which of the two the engine treats as exact. */
      ratio: {
        label: 'A share of the GFA',
        detail: 'Use this when what you have is a target — a brief stating 93% to 97% of GFA.',
      },
      area: {
        label: 'An area, in square metres',
        detail:
          'Use this when what you have is square metres. The engine divides it by the GFA this envelope yields and shows you the share.',
      },
    },
    /* The unit goes in the label, as it does on the plot form's own area field. */
    areaLabel: 'Saleable area (m²)',
    areaPlaceholder: (example: string): string => `e.g. ${example}`,
    areaHelp:
      'The engine divides this by the GFA this envelope yields and shows you the share it comes to, beside the answer. If that share is not what you expected, one of the two figures is wrong.',
    areaInvalid: 'An area above zero, in square metres.',
  },

  run: {
    busy: 'Computing…',
    idle: 'Compute capacity',
    needsParking: 'Answer the parking question above to continue.',
    needsEfficiency:
      'Enter the saleable share of GFA to continue. It is not a formality — it moves the unit count by the whole of whatever it is not.',
    /* The same refusal, naming the field the reader is actually looking at.
       Telling somebody who chose square metres to "enter the share" sends them
       hunting for a control that is not on the screen. */
    needsSaleableArea:
      'Enter the saleable area to continue. It is not a formality — it moves the unit count by the whole of whatever is not saleable.',
    needsCore: 'Correct the core area above, or leave it empty, to continue.',
    needsLevels: 'Correct the levels above to continue.',
  },
};

export type RulesDictionary = typeof EN;
