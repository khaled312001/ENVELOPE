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
    blurb: 'Development capacity for Dubai plots. Every figure carries the rule, the entry or the assumption that produced it.',
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
  },

  /* The floating button. Its label says where it goes, because an icon alone does not. */
  whatsapp: {
    label: 'Message us on WhatsApp',
    tip: 'Questions? WhatsApp',
    greeting: 'Hello, I have a question about Plotlogic.',
  },

  crumbs: { label: 'Breadcrumb', home: 'Home' },

  cta: {
    title: 'Read a plot the way the engine reads it',
    body: 'Open the worked example and every figure on this site opens with it, down to the rule each one came from.',
    primary: 'Open the worked example',
    secondary: 'Start a study',
  },

  home: {
    explore: 'Read more',
    pagesEyebrow: 'The site',
    pagesTitle: 'Everything behind the figures',
    pagesLede: 'Each page goes one layer further down: how the studio is laid out, how the parking is placed, why the numbers hold, what you can take away, and what it will not do.',
    cards: {
      product: { title: 'The studio', body: 'Six steps from a plot to a drawing set, with the drawing in the middle and the figures beside it.' },
      parking: { title: 'Parking, laid out', body: 'Bays, aisles and the ramp placed as rectangles — the part that costs a consultant months.' },
      method: { title: 'The method', body: 'Rules that generate, exact arithmetic, a derivation behind every value, checks that block.' },
      exports: { title: 'Six files, one model', body: 'Report, A3 drawings, DXF, 3D model, workbook and JSON — the same cars in every one.' },
      limits: { title: 'What it does not do', body: 'A longer list than the feature list, on purpose.' },
      faq: { title: 'Questions', body: 'Amber, accuracy, privacy, the vehicle entrance, and the rest.' },
    },
  },

  product: {
    eyebrow: 'The studio',
    title: 'One studio, from affection plan to drawing set',
    lede: 'The drawing is in the middle and the figures sit beside it. Each step opens only when the one before it is answered, and every value on every step opens to its derivation.',
    modelCaption: 'The worked example’s building, as the engine built it. Turn it, isolate a level, open the value an element names.',
    featuresEyebrow: 'What it does',
    featuresTitle: 'Eight things the studio does with a plot',
    features: {
      plot: { title: 'Files the plot', body: 'Corners and boundaries, each boundary classified — road, neighbouring plot, open space — and the area computed on an exact millimetre grid.' },
      rules: { title: 'Resolves the rules', body: 'Setbacks, FAR, coverage and height come from rules recorded in the engine — today a draft set awaiting a named approver. Where none decides, the studio asks you instead of choosing.' },
      bands: { title: 'Computes three capacities', body: 'What the code permits, what the envelope holds and what the parking supports — separately. The answer is the smallest, never an average.' },
      parking: { title: 'Lays out the parking', body: 'Bays, aisles and the ramp as rectangles, level by level, with the bays nobody can reach taken out of the count.' },
      access: { title: 'Recommends the entrance', body: 'A vehicle entrance under B.7.2.1, the frontages it rejected and why — or the one you choose.' },
      core: { title: 'Draws the core', body: 'Sized, placed by a stated rule and drawn on every level, then compared with what the efficiency figures leave — and never subtracted.' },
      massing: { title: 'Builds the massing', body: 'Every level at its floor and every car in its bay, coloured by where each value came from.' },
      sheets: { title: 'Draws the set', body: 'A site plan, every parking level, the typical floor and two sections — one drawing the screen, the paper and the DXF all share.' },
    },
    classesEyebrow: 'Provenance',
    classesTitle: 'Every value says where it came from',
    classesLede: 'Three classes, drawn three ways — ink, border and words — so none of them is carried by colour alone. Amber belongs to one of them and to nothing else in the product.',
    classes: {
      DERIVED: 'Reached a rule recorded in the engine through the derivation graph. Open it and every step of the path is there.',
      USER_SET: 'You entered it, and it carries your name. The engine does not second-guess it.',
      ASSUMED: 'No rule decides it, so the engine filled it — with a written basis, what it moves, and an export that waits until somebody acknowledges it.',
    },
    stepsEyebrow: 'The flow',
    stepsTitle: 'Six steps, each gated by the one before',
  },

  parking: {
    eyebrow: 'Parking',
    title: 'Parking laid out, not divided',
    lede: 'A consultant reads an envelope off an affection plan in minutes; laying out the parking is what takes months. So the engine does not divide an area by a factor and call it bays — it places them.',
    planCaption: 'A parking level of the worked example, as the engine placed it inside the podium. Bays, aisles, the ramp and the entrance are the engine’s own geometry; nothing was added by the page.',
    planLabel: 'Parking level plan: bays along the walls around one ring aisle, with the ramp in the middle',
    key: { bay: 'Bay', aisle: 'Aisle', ramp: 'Ramp', other: 'Reserved' },
    stats: {
      bays: 'Bays on this level',
      cars: 'Cars drawn, all levels',
      perBay: 'Gross area per bay',
      module: 'Module depth',
    },
    tableEyebrow: 'The dimensions',
    tableTitle: 'Dubai Building Code Table B.11, as the engine cited it',
    tableLede: 'Each dimension is printed from the run, not typed on this page.',
    table: { bay: 'Bay', driveway: 'Driveway', angle: 'Angle', width: 'width', length: 'length', twoWay: 'two-way', deg90: '90°' },
    reachEyebrow: 'Reachability',
    reachTitle: 'A bay nobody can drive to is not a bay',
    reachBody:
      'Modules stacked up a level share no boundary, so a layout that only checks aisle widths counts bays a car can never reach. The engine joins every aisle to the way in with a cross aisle, floods the network from one entry — the ramp, or the aisle the driveway lands on — and drops any bay whose open end does not lie wholly against an aisle it reached.',
    reachTest: 'Delete the cross aisle in a test and the level falls apart into one island per aisle. That is asserted, because a reachability check that cannot fail is worth nothing.',
    lossesEyebrow: 'The price, itemised',
    lossesTitle: 'Three losses, published separately',
    lossesLede: 'One efficiency percentage hides which of these a reader can argue with. Here they are for the worked example’s level, in bays and in square metres.',
    losses: {
      reserved: { title: 'The reserved zone', body: 'Cores, plant and the ramp landing, deducted before a bay is placed.' },
      circulation: { title: 'Circulation', body: 'The aisles that make every counted bay reachable.' },
      footprint: { title: 'The unreachable corner', body: 'What a rectangle cannot reach in a podium that is not one.' },
      bays: (n: string): string => `${n} bays`,
    },
    orientationEyebrow: 'Orientation',
    orientationTitle: 'Every arrangement packed, the best kept',
    orientationBody: 'Runs along a level’s width, runs along its depth, and bays against the walls around one ring aisle place different numbers of bays in the same rectangle. Each is packed, the one that holds most is kept, and the others’ counts stay in the note. The engine’s note for the worked example:',
    accessEyebrow: 'Vehicle entrance',
    accessTitle: 'B.7.2.1, measured rather than paraphrased',
    accessBody: 'The 15 m junction clearance is measured from the plot’s chamfered corner — a vertex the engine already holds — and “from the secondary road” is the road hierarchy the plot already ranks. Only “opposite a T junction” needs a road network, and that one clause is reported as not assessed rather than allowed to block the rest.',
    accessRecommended: 'Recommended on the worked example',
    accessWidth: 'Opening width',
    accessWindow: 'Usable window on that frontage',
    accessRejected: 'Rejected frontages',
    notEyebrow: 'Not assessed',
    notTitle: 'What the layout does not check, in the engine’s own words',
    notLede: 'Printed under every parking drawing, and repeated here as the engine wrote it.',
    noOptimiser: 'It does not search ramp and core positions for maximum yield. That is a trade-off between possible designs, and this phase refuses to emit one by construction.',
  },

  method: {
    eyebrow: 'Method',
    title: 'How a figure earns its place',
    lede: 'Not a model trained on past schemes, and not a guess with a confidence interval painted on afterwards. Four mechanisms, in order, and each one can stop the answer.',
    chainEyebrow: 'What holds the answer up',
    refusalsEyebrow: 'Refusals',
    refusalsTitle: 'Questions the engine will not answer for you',
    refusalsLede: 'Each of these used to be a silent default somewhere. Now the study stops until a person answers it, under their own name.',
    refusals: {
      parkingInFar: {
        title: 'Does parking count towards FAR?',
        body: (m2: string): string =>
          `No default is offered. On the worked example the two answers move the regulatory capacity by ${m2} m². Answer it, or price both answers side by side.`,
      },
      saleable: { title: 'What share of GFA sells?', body: 'Cores, corridors and plant sit inside GFA and none of them sells. A count that assumes 100% is high on every run.' },
      gap: { title: 'What the affection plan left out', body: 'A plan that prints a height and no FAR is a gap, reported as one — never filled from the plot next door.' },
      schedule: { title: 'A level schedule that is not a building', body: 'Refused rather than rounded. Rounding it would answer a question about the building that whoever filled the form got wrong.' },
    },
    boundaryEyebrow: 'Independence',
    boundaryTitle: 'The checks cannot see the engine',
    boundaryBody: 'The package that runs the checks does not list the engine among its dependencies, so importing it is impossible, not merely discouraged — and a build step fails if anyone adds it. A check with no data reports itself dormant rather than being fed figures the engine produced, because that would be verifying the engine against its own output.',
    boundaryPoints: ['A failed check blocks the output. It is never a warning.', 'Degenerate geometry raises instead of returning a plausible wrong answer.', 'Every area is recomputed by independent methods that must agree exactly.'],
  },

  exportsPage: {
    eyebrow: 'Exports',
    title: 'Six files, one building',
    lede: 'Every file is drawn from the one building model the engine builds. Where a car stands and which way it faces is a single function that the drawing, the DXF and the 3D model all call.',
    filesEyebrow: 'The files',
    parityEyebrow: 'Parity',
    parityTitle: 'The same cars in every file',
    parityLede: 'Counted by reading each file back after it was written, for the worked example:',
    parityRows: { engine: 'The engine’s count', drawingSet: 'The A3 drawing set', dxf: 'The DXF', modelFile: 'The 3D model (.glb)' },
    sheetsEyebrow: 'The drawing set',
    sheetsTitle: 'The sheets, numbered as the engine numbers them',
    layersTitle: 'DXF layers',
    workbookTitle: 'Workbook sheets',
    gatesEyebrow: 'The gates',
    gatesTitle: 'Nothing leaves until two people have said so',
    gatesLede: 'The first gate acknowledges every assumption by name. The second is a review of the capacity. Until both are signed, every export answers with a refusal — the worked example’s own sequence:',
    gate: { none: 'Nothing signed', g3: 'Assumptions acknowledged', both: 'Both gates signed' },
    status: (code: string): string => (code === '200' ? `${code} — the file is written` : `${code} — refused`),
    stampTitle: 'The stamp is inside every file',
    stampBody: 'Each of the six carries “Regulatory validity: not assessed” inside the file itself, so the sentence travels wherever the file goes. The check that downloads them reads it back out of every one.',
  },

  limitsPage: {
    eyebrow: 'Limits',
    readinessEyebrow: 'Readiness',
  },

  faq: {
    eyebrow: 'Questions',
    title: 'What people ask first',
    lede: 'Short answers, and the same ones the product gives when it is asked in the studio.',
    more: 'Still unsure? The method page explains how each figure is made, and the limits page lists what the product will not do.',
  },

  /* Alternative text for the illustrations that carry meaning. The rest are decoration and say nothing. */
  art: {
    productFlow: 'From the affection plan to the drawing set, in six stages.',
    parkingReach: 'An aisle network joining every bay to one entrance.',
    methodChain: 'Four stages in a row; the last is a gate that holds the output back.',
    sectionModel: 'A section through a white study model: two parking levels and the ramp between them.',
    exportsModel: 'A white study model of a building, with blank sheets laid around it.',
    enterPanel: 'A white study model of a building on its plot, the plot boundary traced in blue.',
    // An illustration of a building sits on pages about buildings the engine computed; it must say it is not one.
    illustration: 'Illustration. Not drawn by the engine.',
  },
};

export type SiteDict = typeof SITE_EN;
