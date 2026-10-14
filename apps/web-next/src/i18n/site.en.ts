/*
  THE PUBLIC SITE'S WORDS — every page outside the studio.

  Under the same discipline as a report. No figure is typed here: every number
  a page shows is read from `worked-example.json`, which a real run writes and
  `pnpm example` re-verifies, and the sentences around them are templates. No
  sentence describes an output in the words the product refuses, and
  `test/tokens.test.ts` reads this file to hold it to that.
*/
export const SITE_EN = {
  nav: {
    label: 'Site',
    product: 'Studio',
    parking: 'Parking',
    method: 'Method',
    exports: 'Exports',
    faq: 'Questions',
    open: 'Open the studio',
    menu: 'Open the menu',
    close: 'Close the menu',
    skip: 'Skip to content',
  },

  footer: {
    blurb: 'Development capacity for Dubai plots, with the source of every figure.',
    product: 'Product',
    trust: 'Trust',
    studio: 'Studio',
    overview: 'The studio',
    parking: 'Parking',
    exports: 'Exports',
    example: 'The worked example',
    method: 'Method',
    limits: 'What it does not do',
    faq: 'Questions',
    start: 'Start a study',
    studies: 'Your studies',
    enter: 'Sign in',
    classic: 'Classic studio',
    rights: (year: string): string => `© ${year} Plotlogic.dev`,
    contact: 'Contact',
    whatsapp: 'WhatsApp',
    email: 'Email',
    top: 'Back to top',
  },

  /* The floating button. Its label says where it goes, because an icon alone does not. */
  whatsapp: {
    label: 'Message us on WhatsApp',
    tip: 'Questions? WhatsApp',
    greeting: 'Hello, I have a question about Plotlogic.',
  },

  crumbs: { label: 'Breadcrumb', home: 'Home' },

  cta: {
    title: 'See a finished study',
    body: 'Every figure opens to its source.',
    primary: 'Open the worked example',
    secondary: 'Start a study',
  },

  home: {
    explore: 'Read more',
    pagesEyebrow: 'The site',
    pagesTitle: 'Everything behind the figures',
    pagesLede: 'How the studio works, how parking is placed, what you can export, and what it does not do.',
    cards: {
      product: { title: 'The studio', body: 'Six steps from a plot to a drawing set.' },
      parking: { title: 'Parking, laid out', body: 'Bays, aisles and the ramp, placed level by level.' },
      method: { title: 'The method', body: 'Cited rules, exact arithmetic and checks that block.' },
      exports: { title: 'Six files, one model', body: 'Report, A3 drawings, DXF, 3D model, workbook and JSON.' },
      limits: { title: 'What it does not do', body: 'Everything it leaves to you.' },
      faq: { title: 'Questions', body: 'Amber, accuracy, privacy and the vehicle entrance.' },
    },
  },

  product: {
    eyebrow: 'The studio',
    title: 'From affection plan to drawing set',
    lede: 'Each step opens once the one before is answered. Every value opens to its derivation.',
    modelCaption: 'The worked example in 3D. Turn it, isolate a level, click an element.',
    featuresEyebrow: 'What it does',
    featuresTitle: 'What the studio does',
    features: {
      plot: { title: 'Files the plot', body: 'Corners and classified boundaries, with the area on an exact millimetre grid.' },
      rules: { title: 'Resolves the rules', body: 'Setbacks, FAR, coverage and height come from recorded rules — a draft set, not yet approved. Where no rule decides, it asks you.' },
      bands: { title: 'Computes three capacities', body: 'Code, envelope and parking, each computed separately. The answer is the smallest.' },
      parking: { title: 'Lays out the parking', body: 'Bays, aisles and the ramp, level by level. Unreachable bays are not counted.' },
      access: { title: 'Recommends the entrance', body: 'A vehicle entrance under B.7.2.1, with the rejected frontages — or your own choice.' },
      core: { title: 'Draws the core', body: 'Sized, placed by a stated rule and drawn on every level. Never subtracted.' },
      massing: { title: 'Builds the massing', body: 'Every level and every car in 3D, coloured by source.' },
      sheets: { title: 'Draws the set', body: 'Site plan, parking levels, typical floor and two sections — the same drawing on screen, on paper and in the DXF.' },
    },
    classesEyebrow: 'Provenance',
    classesTitle: 'Every value says where it came from',
    classesLede: 'Three classes, each shown in ink, border and words. Amber means assumed, and nothing else.',
    classes: {
      DERIVED: 'Traced to a recorded rule. Open it to see each step.',
      USER_SET: 'You entered it, under your name.',
      ASSUMED: 'No rule decides it, so the engine filled it with a written basis. You may edit it. Exports wait until someone acknowledges it.',
    },
    stepsEyebrow: 'The flow',
    stepsTitle: 'Six steps, each gated by the one before',
  },

  parking: {
    eyebrow: 'Parking',
    title: 'Parking laid out, not divided',
    lede: 'The engine places every bay instead of dividing an area by a factor.',
    planCaption: 'A parking level from the worked example.',
    planLabel: 'Parking level plan: bays along the walls around one ring aisle, with the ramp in the middle',
    key: { bay: 'Bay', aisle: 'Aisle', ramp: 'Ramp', other: 'Reserved' },
    stats: {
      bays: 'Bays on this level',
      cars: 'Cars drawn, all levels',
      perBay: 'Gross area per bay',
      module: 'Module depth',
    },
    tableEyebrow: 'The dimensions',
    tableTitle: 'Dubai Building Code Table B.11',
    tableLede: 'Dimensions as cited in the study.',
    table: { bay: 'Bay', driveway: 'Driveway', angle: 'Angle', width: 'width', length: 'length', twoWay: 'two-way', deg90: '90°' },
    reachEyebrow: 'Reachability',
    reachTitle: 'A bay nobody can drive to is not a bay',
    reachBody: 'A cross aisle joins every aisle to one entrance. Any bay that cannot be reached from it is dropped from the count.',
    reachTest: 'A test removes the cross aisle and checks that the level splits apart.',
    lossesEyebrow: 'The price, itemised',
    lossesTitle: 'Three losses, shown separately',
    lossesLede: 'For the worked example’s level, in bays and m².',
    losses: {
      reserved: { title: 'The reserved zone', body: 'Cores, plant and the ramp landing.' },
      circulation: { title: 'Circulation', body: 'The aisles that reach every bay.' },
      footprint: { title: 'The unreachable corner', body: 'Podium area outside the largest rectangle.' },
      bays: (n: string): string => `${n} bays`,
    },
    orientationEyebrow: 'Orientation',
    orientationTitle: 'Every arrangement tried, the best kept',
    orientationBody: 'Rows across, rows along and a ring aisle are each packed. The one with the most bays is kept. The engine’s note:',
    accessEyebrow: 'Vehicle entrance',
    accessTitle: 'Vehicle entrance under B.7.2.1',
    accessBody: 'The 15 m junction clearance is measured from the chamfered corner, and the secondary road comes from the road hierarchy. “Opposite a T junction” needs a road network, so it is not assessed.',
    accessRecommended: 'Recommended on the worked example',
    accessWidth: 'Opening width',
    accessWindow: 'Usable window on that frontage',
    accessRejected: 'Rejected frontages',
    notEyebrow: 'Not assessed',
    notTitle: 'What the layout does not check',
    notLede: 'Printed under every parking drawing.',
    noOptimiser: 'It does not search ramp and core positions for maximum yield. That is a design trade-off, and this phase does not produce one.',
  },

  method: {
    eyebrow: 'Method',
    title: 'How a figure earns its place',
    lede: 'Four steps, in order. Any one of them can stop the answer.',
    chainEyebrow: 'What holds the answer up',
    refusalsEyebrow: 'Refusals',
    refusalsTitle: 'Questions the engine will not answer for you',
    refusalsLede: 'The study stops until a person answers each one, under their own name.',
    refusals: {
      parkingInFar: {
        title: 'Does parking count towards FAR?',
        body: (m2: string): string =>
          `No default. On the worked example the two answers differ by ${m2} m² of regulatory capacity. Answer it, or compare both.`,
      },
      saleable: { title: 'What share of GFA sells?', body: 'Cores, corridors and plant are inside GFA but do not sell. Assuming 100% overcounts units.' },
      gap: { title: 'What the affection plan left out', body: 'A missing FAR is reported as a gap, never borrowed from the plot next door.' },
      schedule: { title: 'A level schedule that is not a building', body: 'Refused, not rounded. Correct the schedule and compute again.' },
    },
    boundaryEyebrow: 'Independence',
    boundaryTitle: 'The checks cannot see the engine',
    boundaryBody: 'The checks cannot import the engine, and an automated check fails if anyone adds it. A check with no data reports that it did not run.',
    boundaryPoints: ['A failed check blocks the output — never just a warning.', 'Degenerate geometry stops the run.', 'Every area is computed by independent methods that must agree exactly.'],
  },

  exportsPage: {
    eyebrow: 'Exports',
    title: 'Six files, one building',
    lede: 'Every file comes from the same building model, so the cars match in all of them.',
    filesEyebrow: 'The files',
    parityEyebrow: 'Parity',
    parityTitle: 'The same cars in every file',
    parityLede: 'Counted by reading each file back, for the worked example:',
    parityRows: { engine: 'The engine’s count', drawingSet: 'The A3 drawing set', dxf: 'The DXF', modelFile: 'The 3D model (.glb)' },
    sheetsEyebrow: 'The drawing set',
    sheetsTitle: 'Sheet list',
    layersTitle: 'DXF layers',
    workbookTitle: 'Workbook sheets',
    gatesEyebrow: 'The gates',
    gatesTitle: 'Nothing leaves until both gates are signed',
    gatesLede: 'G3 acknowledges every assumption. G4 names a reviewer. Until both are signed, every export is refused. The worked example:',
    gate: { none: 'Nothing signed', g3: 'Assumptions acknowledged', both: 'Both gates signed' },
    status: (code: string): string => (code === '200' ? `${code} — the file is written` : `${code} — refused`),
    stampTitle: 'The stamp is inside every file',
    stampBody: 'All six files carry “Regulatory validity: not assessed” inside them, wherever they go.',
    /** A sheet or workbook tab as the file names it; the Arabic page says it in Arabic. */
    sheetName: (title: string): string => title,
  },

  limitsPage: {
    eyebrow: 'Limits',
    readinessEyebrow: 'Readiness',
    /*
      The site's own wording, not the classic studio's: that one says the notice
      is "stated on every screen", which stopped being true here on 14 Oct 2026.
    */
    readinessTitle: 'Where this deployment stands',
    readinessBody:
      'A demonstration on draft rules. No rule is approved yet and the metric definitions are unsigned, so no figure is quotable to a third party. Every report says so.',
  },

  faq: {
    eyebrow: 'Questions',
    title: 'What people ask first',
    lede: 'Short answers to common questions.',
    more: 'Still unsure? See the method and limits pages.',
  },

  /* Alternative text for the illustrations that carry meaning. The rest are decoration and say nothing. */
  art: {
    productFlow: 'Six stages from affection plan to drawing set.',
    parkingReach: 'An aisle network joining every bay to one entrance.',
    methodChain: 'Four stages in a row, ending in a gate.',
    sectionModel: 'Section through a study model: two parking levels and a ramp.',
    exportsModel: 'A study model of a building with blank sheets around it.',
    enterPanel: 'A study model of a building on its plot.',
    // An illustration of a building sits on pages about buildings the engine computed; it must say it is not one.
    illustration: 'Illustration',
  },
};

export type SiteDict = typeof SITE_EN;
