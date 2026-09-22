/**
 * `/` — the landing page, in English, lifted out of the JSX unchanged.
 *
 * `export type LandingDictionary = typeof EN`, so this module IS the contract and
 * `landing.ar.ts` is held to it: a missing Arabic key, a misspelled one or a key
 * nobody removed from either side is a COMPILE ERROR rather than a sentence that
 * silently renders in the wrong language. NOTE THE ABSENCE OF `as const` — with it
 * every value would narrow to its own literal and the Arabic could satisfy the shape
 * only by repeating the English.
 *
 * The English render is byte-identical to the page before this module existed, and
 * that was checked by diffing the static markup, not by reading it.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS NOT IN HERE, AND WHY EACH ABSENCE IS THE POINT.
 *
 * 1. NO FIGURE. This is the page that once printed 6,352.5 m² for months after the
 *    engine had moved to 6,774.194, and every figure on it now comes from
 *    `worked-example.json`. A digit typed into a dictionary is the same defect one
 *    language further from anyone who would notice. So the sentences that carry a
 *    figure are FUNCTIONS — `eyebrow`, `modelLabel`, `planLabel`, `claims.geometry
 *    .body` — that hold the WORD ORDER, which differs between the two languages, and
 *    take the value as an argument. Even the two digits the page does type, the
 *    phase and the kernel's grid, are held in `Landing.tsx` and passed in, beside
 *    the reason each is allowed. ("3D" in `modelLabel` is the name of a view, not a
 *    quantity; the Arabic says it in words.)
 *
 * 2. NO ENGINE STRING. The basis string, the four formula strings, the provenance
 *    class tokens (`ASSUMED`, `DERIVED`) and the band tokens in the verdict
 *    (`PARKING`, `REGULATORY`) stay in the component, read off the fixture, and on
 *    the Arabic page they are wrapped in `Verbatim`. `docs/05-design/arabic-glossary.md`
 *    §1: a basis string is a record of why a number was assumed, and a translated
 *    record is a second record nobody issued.
 *
 * 3. NO SECOND COPY OF A SHARED PARAGRAPH. The five "does not" items are `LIMITS` and
 *    `LIMITS_AR`, chosen between by `useDict` in the component, so `/` and
 *    `/refusals` cannot say two things about one refusal in either language.
 *
 * ---------------------------------------------------------------------------
 * WHY SOME STRINGS CARRY A LEADING OR TRAILING SPACE.
 *
 * A sentence that wraps a value, a token or an emphasised word is split into the
 * part BEFORE it and the part AFTER it, because the value does not sit at the same
 * word in Arabic. The spaces belong to the strings because they belong to the
 * sentence, and keeping them here is what makes the English render byte-identical
 * to the JSX it was lifted out of.
 */

export const EN = {
  /* =======================================================================
   * THE FOLD
   * ==================================================================== */

  /** The phase is passed in; see note 1 above. */
  eyebrow: (phase: string): string => `Phase ${phase} · engine demonstration`,

  /**
   * NOT "what can be built". That is a permission claim in the largest type on the
   * site, and `landing.test.tsx` forbids it in both languages.
   */
  title:
    'What these rules imply for this plot, and the derivation of every figure that says so.',

  answerLabel: 'Governing capacity, this run',

  /**
   * The three bands. The LETTERS stay in the component and stay Latin in both
   * languages — A, B and C are how the bands are named in the PRD, the report and
   * every export — so only the name and the note are copy.
   */
  bands: {
    /** Before the letter: "Band C — What the parking supports". */
    word: 'Band ',
    a: {
      name: 'What the code permits',
      note: 'The floor-area ratio, applied to the plot. The only band a FAR calculator computes.',
    },
    b: {
      name: 'What the envelope holds',
      note: 'The plate the setbacks and the plate cap leave, stacked to the height ceiling.',
    },
    c: {
      name: 'What the parking supports',
      /*
        NOT "bays that fit". The supply term this band rests on is an available area
        divided by an area-per-bay factor; the placed level runs afterwards and cannot
        reach back into it. "Fit" would be the false causal claim §4.2 of the site map
        exists to prevent, and the Arabic is held to the same line.
      */
      note: 'An available area divided by an area-per-bay factor, and the factor is assumed.',
    },
    /** The binding row says so in WORDS; colour carries none of the meaning alone. */
    binds: 'binds',
    /*
      The control is named by its visible text, in reading order — "why 6,774.194 m²
      ?" — so 2.5.3 holds by construction. The question mark is copy, because Arabic
      writes it «؟».
    */
    why: 'why',
    hide: 'hide',
    question: '?',
  },

  /** The amber callout under the governing figure. The class token and basis are the fixture's. */
  assumed: {
    /** After the class token: "ASSUMED — the area a bay is taken to consume". */
    titleAfter: ' — the area a bay is taken to consume',
    /** Before the traced 32 m²/bay. */
    before: 'The parking supply is an available area divided by',
    /** Between the traced value and the engine's basis string. */
    after: ', and that divisor is not a constant: ',
  },

  /**
   * Beneath the answer, at equal weight. The stamp is in caps IN THE STRING and not
   * by `text-transform`: `expectClaimOrder` finds each claim by its first occurrence
   * in the markup, and a sentence-case "Regulatory validity" here would be found
   * before the claim table.
   */
  validity: {
    stamp: 'REGULATORY VALIDITY — NOT ASSESSED.',
    body:
      ' No rule in this deployment is approved by a named professional, and every clause ' +
      'reference it holds is a placeholder rather than a sourced citation.',
  },

  /** The lede, split around the one emphasised verb. */
  lede: {
    before:
      'A compliance checker asks whether a setback clears some figure, and needs a drawing ' +
      'to exist. This engine reads the same clause as an inward offset, so the rule ',
    emphasis: 'generates',
    after: ' the answer instead of testing a drawing.',
  },

  cta: {
    run: 'Run this plot yourself',
    refusals: 'What it refuses',
  },

  /* =======================================================================
   * THE FIGURE
   * ==================================================================== */

  figure: {
    /** The 3D model's accessible name. Both counts are the fixture's. */
    modelLabel: (levels: string, maxLevels: string): string =>
      `This run's building in 3D: ${levels} levels of floor area above the ` +
      `parking, inside the envelope the rules permit to ${maxLevels} ` +
      'levels. The figures beside it state the same in words.',

    /** The plan's accessible name. Every figure is read off the fixture by the caller. */
    planLabel: (p: {
      readonly width: string;
      readonly depth: string;
      readonly setbacks: readonly [string, string, string, string];
      readonly footprint: string;
      readonly plateCap: string;
    }): string =>
      `Plan of a ${p.width} by ${p.depth} metre plot. Setbacks of ` +
      `${p.setbacks[0]}, ${p.setbacks[1]}, ${p.setbacks[2]} and ${p.setbacks[3]} metres leave a ` +
      `footprint of ${p.footprint} square metres, inside which the tower plate cap ` +
      `leaves ${p.plateCap}.`,

    /** Inside the drawing, over the tower plate. */
    plateCapTag: 'TOWER PLATE CAP',

    /**
     * What an edge faces, from the classification it was GIVEN — never a literal per
     * edge. The road hierarchy is the recorded input's token; the drawing names it.
     */
    edge: (classification: string, roadHierarchy: string | undefined): string =>
      roadHierarchy ? `${roadHierarchy} ROAD` : classification.replace(/_/g, ' '),

    number: 'Model',
    /** The land-use token off the recorded input, as the caption names it. */
    landUse: (token: string): string => token.replace(/_/g, ' ').toLowerCase(),

    spec: {
      plotArea: 'Plot area',
      setbacks: 'Setbacks, per edge',
      footprint: 'Footprint after offset',
      plateCap: 'Tower plate cap',
      levels: 'Levels the answer places',
      /** Between the answer's level count and the height's. */
      levelsOf: ' of ',
      levelsAfter: ' the height permits',
    },

    source:
      'This run, to scale, as the engine stacked it · solid levels are the answer, ' +
      'outlines are height the answer leaves unused · amber marks what the engine ' +
      'assumed where no rule decides · regulatory validity — not assessed',
  },

  /* =======================================================================
   * 01 — THE THREE CAPACITIES
   * ==================================================================== */

  capacities: {
    title: 'Capacities are reported separately, never averaged',
    lede:
      'What the code permits, what the envelope holds and what the parking supports are ' +
      'separate questions. Quoting only the largest is how a plot gets bought against a ' +
      'number that was never available.',

    /**
     * TEMPLATED, NEVER TYPED. The band tokens and the headroom are the fixture's; these
     * are the four stretches of sentence around them. No string here names a band.
     */
    verdict: {
      before: 'On this run, ',
      between: ' binds, and the ',
      after: ' ceiling sits ',
      end: ' above the answer.',
    },
  },

  /* =======================================================================
   * 02 — HOW THE PARKING NUMBER IS MADE
   * ==================================================================== */

  parking: {
    title: 'How the parking number is actually made',
    proseBefore:
      'Band C is the smaller of what the floor area permits and what the parking supply ' +
      'can serve. That supply is an available area divided by an area-per-bay factor, ' +
      'and no cited rule fixes the factor — it is the amber figure in the fold. The ' +
      'engine lays the level out as bays, aisles and a ramp inside the podium outline ',
    proseEmphasis: 'afterwards',
    proseAfter:
      ', so the drawing is a check on the factor and never its source. What the drawing ' +
      'costs against what the factor predicted is reported rather than absorbed.',

    /** Each row's provenance class follows it as the fixture's own token. */
    costed: {
      assumed: 'Assumed in the supply model',
      measured: 'Measured on the level as laid out',
      bays: 'Bays the placed level holds',
    },
    link: 'The chain from the factor to the band, and the level drawn',
  },

  /* =======================================================================
   * 03 — WHAT HOLDS THE ANSWER UP
   * ==================================================================== */

  guarantees: {
    title: 'What holds the answer up',
    lede: 'Not a model, and not a guess with a confidence interval painted on afterwards.',

    /** Four stages of one mechanism, in order. Keys, not an array, so order stays in the JSX. */
    chain: {
      generate: {
        title: 'Rules that generate, not rules that judge',
        body: 'A setback clause becomes an inward offset; nothing is tested afterwards.',
      },
      exact: {
        title: 'Exact arithmetic on a declared grid',
        body:
          'Integer millimetres and exact predicates; a near-tangent offset raises rather ' +
          'than returning a plausible wrong answer.',
      },
      derivation: {
        title: 'Every value carries its derivation',
        body: 'A filled gap is amber, and it says what it costs rather than merely that it exists.',
      },
      blocks: {
        title: 'A layer that blocks emission',
        body:
          'An independent check that cannot see the engine; a failure blocks the output and ' +
          'never warns.',
      },
    },

    keyCaption:
      'The four classes, as the engine renders them. Amber is reserved for one of them, and ' +
      'nothing else in the product is permitted to use it.',
  },

  /* =======================================================================
   * 04 — THE FIVE-WAY CLAIM STATEMENT
   *
   * Hand-written copy in §16.5's order, not the engine's claim statement — which is
   * why it is here and translated. The ORDER lives in the component and is asserted
   * in both languages.
   * ==================================================================== */

  claims: {
    title: 'Exactly what we claim',
    lede:
      'Separate questions get separate answers, in every report the engine produces, and ' +
      'the wording is fixed in the specification rather than written by whoever is selling.',

    selfConsistency: {
      title: 'Self-consistency',
      status: 'Supported',
      body:
        'The output satisfies every constraint we encoded and its arithmetic closes. This ' +
        'says the engine did what it was told — not that what it was told is right.',
    },
    coverage: {
      title: 'Rule coverage',
      status: 'Partial, and quantified',
      bodyBefore: 'We report how many of the requirements ',
      bodyEmphasis: 'we identified',
      bodyAfter:
        ' are encoded, and list what is deferred. The denominator is our own inventory. A ' +
        'requirement nobody thought of is missing from both sides of that ratio, so a high ' +
        'proportion is evidence of diligence, never of completeness.',
    },
    geometry: {
      title: 'Geometric validity',
      status: 'Supported',
      /** The grid is the kernel's, passed in by the component; see note 1 above. */
      body: (gridMm: string): string =>
        `Every polygon is computed in exact integer arithmetic on a declared ${gridMm} mm ` +
        'grid, and every area is recomputed by independent methods that must agree ' +
        'exactly. Degenerate geometry raises rather than returning a plausible wrong answer.',
    },
    judgement: {
      title: 'Agreement with professional judgement',
      status: 'Not yet measured',
      body:
        'Whether a qualified architect would produce a comparable answer has not been ' +
        'measured. The study needs the inter-architect variance band established first, by ' +
        'architects who have not yet been engaged. Until then no figure may be quoted, and ' +
        'none is.',
    },
    regulatory: {
      title: 'Regulatory validity',
      status: 'Never claimed',
      body:
        'This system does not and cannot determine whether an authority would approve a ' +
        'scheme. Not “not yet”. Not “pending certification”. It is not obtainable from any ' +
        'computation, our validator agreeing with our generator is self-consistency and ' +
        'nothing more, and no output of this product may be described as a compliance check.',
    },

    link: 'What each of these statuses would take to change',
  },

  /* =======================================================================
   * 05 — WHAT IT DOES NOT DO
   * ==================================================================== */

  limits: {
    title: 'What it does not do',
    /*
      The lede used to call itself "longer than the feature list". It is longer by
      item count and SHORTER by word count, and a self-description the page does not
      satisfy is a small dishonesty on the page that sells honesty.
    */
    lede:
      'More of them than there are features, and deliberately so. Every line here is a ' +
      'thing somebody will otherwise assume.',
    after:
      'There are more of these, and some of them the software performs at runtime as a ' +
      'refusal you can watch it return.',
    link: 'The whole list, and what it would take to change any of it',
  },

  /* =======================================================================
   * 06 — THE READINESS BAND
   * ==================================================================== */

  readiness: {
    title: 'Where this deployment actually stands',
    body:
      'No rule in it is approved by a named professional, the metric definitions annex is ' +
      'unsigned, and every clause reference it carries is a placeholder rather than a ' +
      'sourced citation. Every figure it produces today is an engine demonstration on ' +
      'draft rules — not a capacity assessment, and not quotable to a third party. That is ' +
      'stated on every screen and printed on every report.',
    numbers: 'See the readiness numbers',
    engine: 'Open the engine anyway',
  },
};

export type LandingDictionary = typeof EN;
