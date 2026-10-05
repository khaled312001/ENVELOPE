/**
 * Step 1 — tracing the plot on real imagery, in English.
 *
 * `export type PlotMapDictionary = typeof EN` is the contract `plotMap.ar.ts` is
 * held to; no `as const`, so the SHAPE is what the Arabic must match.
 *
 * ---------------------------------------------------------------------------
 * THE WHOLE OF THIS DICTIONARY IS ONE ARGUMENT, MADE IN SHORT SENTENCES.
 *
 * A satellite view is the most persuasive surface in this product — more than the
 * 3D view, because a photograph of the actual ground reads as evidence rather than
 * as a model. A reader who traces four corners on it and sees a length appear has
 * been handed a measurement they did not take, in a place where it looks surveyed.
 *
 * So the copy says three things, repeatedly and in different words, because they
 * are the three things that stop this screen from lying:
 *
 *   1. the affection plan is the authority and this is a tracing aid;
 *   2. every figure the trace produces arrives in the form as an EDITABLE number
 *      and never as the answer;
 *   3. no parcel boundary is drawn here by anybody official. There is no free or
 *      paid parcel layer for Dubai — `gis.dda.gov.ae` answers "Token Required" on
 *      every folder — so what a reader sees under their cursor is a ROOF, a wall,
 *      a kerb, and a roof is not a boundary.
 *
 * ---------------------------------------------------------------------------
 * NO DIGIT IN HERE. The lengths, the bearings, the areas, the vertex count, the
 * `FR-PLT-001 AC2` tolerance and the coordinates are all measurements or
 * constants held in `PlotMap.tsx`, and every one of them arrives as an argument.
 *
 * ATTRIBUTION IS NOT COPY AND IS NOT TRANSLATED. `imagery.credit` and
 * `osm.credit` are the attribution strings the two tile services require to be
 * shown. They name organisations and a licence, and a translated credit is a
 * credit to a body that did not issue the data — the same argument `Verbatim`
 * makes for a basis string. Both dictionaries carry them identically.
 */

export const EN = {
  title: 'Trace it on the imagery',
  /*
    THE ONE SHORT LINE, and it is first because it governs everything under it.
    The brief for this screen asked for a sentence rather than a paragraph: a
    paragraph of caveat is a paragraph a reader scrolls past.
  */
  authority:
    'The affection plan is the authority. This is a tracing aid — no parcel boundary on this map is official.',

  /** What the reader is looking at, and what it is not. */
  imagery: {
    label: 'Satellite imagery',
    credit: 'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    /*
      A ROOF IS NOT A BOUNDARY. This is the single most useful sentence on the
      screen and it is the one a reader does not think of: at 25°N a twelve-storey
      façade leans several metres off its own footprint in an oblique tile, and the
      line somebody traces is the top of the parapet.
    */
    roofNote:
      'What you can see is a roof line, a wall and a kerb. A roof overhangs and a tall building leans away from the camera, so the edge under your cursor is not the plot line.',
  },

  /** The OpenStreetMap overlay, named for what it actually contains. */
  osm: {
    label: 'OpenStreetMap overlay',
    /*
      CALLED AN OVERLAY AND NOT "PARCELS". It draws building footprints and streets
      as contributors mapped them. Calling it a parcel layer would be the claim this
      whole screen is built to avoid, and it would be a claim about somebody else's
      data rather than about ours.
    */
    help: 'Building footprints and streets as OpenStreetMap contributors mapped them. Not a cadastral source and not a survey.',
    credit: 'Map data © OpenStreetMap contributors, ODbL',
    show: 'Show overlay',
    hide: 'Hide overlay',
  },

  /** How to trace, said once, above the map. */
  how: {
    heading: 'How to trace',
    click: 'Click a corner on the imagery to drop a point.',
    drag: 'Drag a point to move it.',
    close: 'Click the first point again, or press Close the ring, once three points are down.',
    keyboard: 'Or enter a latitude and longitude below and press Add point — no pointer needed.',
  },

  /** The drawing controls. */
  controls: {
    heading: 'The trace',
    closeRing: 'Close the ring',
    reopen: 'Reopen the ring',
    undo: 'Undo the last point',
    clear: 'Clear every point',
    /** The vertex number is the component's own count. */
    removePoint: (n: string): string => `Remove point ${n}`,
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    /** The count is the component's own. */
    counted: (n: string): string => `${n} points down`,
    none: 'No points down yet.',
    closed: 'The ring is closed.',
    open: 'The ring is open — the last point does not return to the first.',
  },

  /** Entering a vertex from the keyboard, which is the whole of the non-pointer path. */
  keyboard: {
    heading: 'Add a point by coordinate',
    /*
      LATITUDE FIRST, which is the order a person reads a coordinate off a phone, a
      GPS or a browser's own location readout. `geo.ts` holds a point as lng-then-lat
      because that is the order a map library hands one over; the form asks in the
      order a human holds one, and the component does the swap.
    */
    lat: 'Latitude (°N)',
    lng: 'Longitude (°E)',
    add: 'Add point',
    help: 'Decimal degrees, WGS84 — the form a phone or a browser gives you. Dubai is about twenty-five north, fifty-five east.',
  },

  /** The traced ring, as a table a screen reader can read straight through. */
  table: {
    heading: 'The trace, as numbers',
    /*
      A REAL TABLE AND NOT A LIST OF LABELS. A map is a pointer-only control until
      its content exists in text, and a text EQUIVALENT of a polygon is its
      boundaries and their corners — which is a table with a row per boundary, not
      a paragraph describing a shape.
    */
    caption:
      'One row per boundary of the traced ring: its length, its direction, and the corner it starts from. Every figure is measured from the points on the imagery and is editable once it reaches the boundary table.',
    boundary: 'Boundary',
    length: 'Length (m)',
    bearing: 'Direction (°)',
    corner: 'Starts at',
    remove: 'Remove',
    empty: 'Three points are needed before there is a boundary to measure.',
    /** Both figures are the component's own measurement. */
    cornerAt: (lat: string, lng: string): string => `${lat}°N, ${lng}°E`,
  },

  /** What the trace measures, beside what the sheet states. */
  area: {
    traced: 'Area of the traced ring',
    stated: 'Area on the affection plan',
    /** The difference and the tolerance are both the component's own. */
    difference: (percent: string): string => `${percent}% apart`,
    /*
      THE SENTENCE THIS WHOLE COMPONENT IS SHAPED BY. `FR-PLT-001 AC2` blocks a run
      when the computed and stated areas differ by more than the tolerance, and a
      hand trace on a satellite tile routinely lands outside it. Saying so HERE,
      before the reader has invested in the shape, is the difference between a tool
      and a trap.
    */
    tolerance: (tolerance: string): string =>
      `A run is blocked when the area computed from the boundaries and the area on the sheet differ by more than ${tolerance}. A hand trace on imagery often does. Type the sheet's own lengths over these before you continue.`,
    beyond: (tolerance: string): string =>
      `This trace is further than ${tolerance} from the stated area. It is a starting point, not a plot.`,
    within: (tolerance: string): string =>
      `This trace is within ${tolerance} of the stated area. That agreement is not a measurement of the plot — it is a measurement of the trace.`,
  },

  /** Handing the trace to the traverse, which is the point of the whole screen. */
  handoff: {
    /*
      THE BUTTON SAYS WHAT WILL HAPPEN TO THE NUMBERS, not "apply" or "use".
      A reader has to know, before pressing it, that what arrives is editable —
      otherwise the honest design is invisible and they treat the result as fixed.
    */
    button: 'Fill the boundary table with these',
    help: 'Each boundary arrives as a length and a direction you can type over. Nothing is locked, and nothing is submitted from this map.',
    /** The boundary count is the component's own. */
    done: (n: string): string =>
      `${n} boundaries were written into the table below. Every one of them is editable — check each against the sheet.`,
    blocked: 'Close the ring first. An open trace has no last boundary to measure.',
    precision:
      'Lengths and directions are written to the millimetre because that is the grid the engine computes on. It is not a claim about how accurately the imagery was traced.',
  },

  /** The sheet's own drawing, laid over the imagery. */
  underlay: {
    heading: 'Lay the affection plan over the imagery',
    /*
      WHY THIS EXISTS AT ALL. A trace against a roof line is a guess; a trace
      against the sheet's own drawing, scaled by a dimension printed on it, is a
      transcription. This is the one feature that makes a traced ring agree with
      the document rather than with a photograph.
    */
    lede: 'A trace against a roof line is a guess. A trace against the sheet, scaled by a dimension printed on it, follows the document.',
    choose: 'Choose the sheet image',
    chooseHelp: 'A PNG or JPEG of the affection plan. It stays in this browser and is never uploaded.',
    remove: 'Remove the sheet image',
    opacity: 'Sheet opacity',
    /** The percentage is the slider's own value. */
    opacityValue: (percent: string): string => `${percent}%`,

    /*
      UNCALIBRATED IS AN ASSUMED PLACEMENT AND IS SAID SO IN WORDS.

      A dropped image has to go SOMEWHERE at SOME size, and whatever it lands at is
      a number nobody entered. That is a hidden default in the exact shape this
      codebase refuses everywhere else, so it is stated instead: the placement is an
      assumption, its basis is "the map's own view", and the sensitivity is that
      every figure traced against it moves with it.
    */
    uncalibrated: {
      title: 'This placement is assumed.',
      basis:
        'The sheet was laid over the middle of the view at a size no dimension has set. Where it sits, how big it is and which way it faces were all chosen by this screen and not by you.',
      sensitivity:
        'Anything traced against it moves with it. Calibrate it against a dimension printed on the sheet before you trace a corner from it.',
    },

    /** Two-point calibration, stated as the three things it asks for. */
    calibrate: {
      heading: 'Calibrate it against a printed dimension',
      lede: 'Pick two features on the sheet whose distance apart it prints — two plot corners, the ends of a dimension line. Then show where those same two features are on the imagery, and type the printed distance.',
      /** The step number and the total are the component's own. */
      step: (n: string, of: string): string => `Step ${n} of ${of}`,
      pickSheetA: 'Click the first feature on the sheet',
      pickGroundA: 'Now click that same feature on the imagery',
      pickSheetB: 'Click the second feature on the sheet',
      pickGroundB: 'Now click that same feature on the imagery',
      distance: 'Distance between them, as the sheet prints it (m)',
      apply: 'Scale and rotate the sheet to fit',
      restart: 'Start the calibration again',
      cancel: 'Cancel',
      /*
        WHAT THE TYPED DISTANCE DOES, AND WHAT THE TWO CLICKS DO. The scale comes
        from the DOCUMENT and the position and rotation come from the two clicks.
        It is written down because the obvious alternative — scaling to the two
        clicks — would make the sheet agree with the reader's aim instead of with
        the dimension, and nothing afterwards would reveal it.
      */
      how: 'The printed distance sets the scale. Your two clicks on the imagery set the position and the rotation. The sheet is never stretched out of shape.',
      /** Both figures are the component's own measurement. */
      residual: (measuredM: string, statedM: string): string =>
        `Where you placed the two features on the imagery they are ${measuredM} m apart. The sheet prints ${statedM} m.`,
      /** The percentage is the component's own measurement. */
      residualGap: (percent: string): string =>
        `${percent}% apart. The sheet's figure was used for the scale, so this gap is between the imagery and the document — not an error in either.`,
      residualExact: 'Your two clicks and the printed distance agree.',
      done: 'Calibrated against a printed dimension.',
      /** Why a calibration was refused. Codes live in the component; these are the words. */
      refusals: {
        sameSheetPoint:
          'Those are the same point on the sheet. Two features at one spot give no distance to scale by.',
        sameGroundPoint:
          'Those are the same point on the imagery. Two features at one spot give no direction to rotate to.',
        noDistance: 'Type the distance the sheet prints between the two features. There is no default for it.',
        outsideZone:
          'One of those points is outside the projection this engine computes in. See the sentence below the map.',
      },
    },
  },

  /** Refusals. A sentence, never a silent drop. */
  refusals: {
    /*
      OUTSIDE ZONE 40N. `toUtm40` throws rather than projecting, because a point one
      zone over returns a plausible easting that is kilometres wrong — and it would
      then be dimensioned, drawn, exported and x-referenced into a submission set.
      The refusal is caught here and said.
    */
    outsideZone:
      'That point is outside UTM zone 40N, which is the projection this engine measures in. The zone covers fifty-four to sixty degrees east — the whole of the UAE. Nothing was added.',
    notACoordinate: 'That is not a coordinate. A latitude and a longitude in decimal degrees are needed.',
    /*
      NO WEBGL. The map is the optional half of this screen and this sentence says
      so: the coordinate entry, the table, the areas and the handoff are all
      arithmetic and work with no map at all.
    */
    noMap:
      'This browser could not open a map canvas. Everything else on this panel still works: enter each corner as a latitude and longitude, and the boundaries are measured the same way.',
    offline:
      'The imagery tiles did not load. The trace, the measurements and the boundary table do not depend on them.',
  },

  /** The last line, under everything. */
  claim:
    'Nothing on this map is a survey, and tracing a shape is not a finding about it. Regulatory validity is never assessed and never claimed.',
};

export type PlotMapDictionary = typeof EN;
