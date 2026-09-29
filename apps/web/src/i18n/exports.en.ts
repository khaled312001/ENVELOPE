/**
 * `/exports` — what comes out, in English, lifted out of the JSX unchanged.
 *
 * `export type ExportsDictionary = typeof EN`, so this module IS the contract and
 * `exports.ar.ts` is held to it. NOTE THE ABSENCE OF `as const`: with it every value
 * would narrow to its own literal and the Arabic could only satisfy the shape by
 * repeating the English.
 *
 * ---------------------------------------------------------------------------
 * THE PAGE'S OWN RULE, ONE LEVEL DOWN: NOTHING READ OUT OF A FILE IS IN HERE.
 *
 * Every layer name, sheet number, sheet title, workbook sheet name and note, the
 * Status line, the DXF and glTF versions and extension names, the notice sentences,
 * the JSON's field names and its `regulatoryValidity` status and detail, and every
 * HTTP status code come from `verified.exports` in `worked-example.json` and stay
 * in the component. They are what the FILE says; a translated sheet title or note
 * would be a second record that no file carries, and the glossary's §1 argument
 * for basis strings applies to them word for word.
 *
 * NOR IS ANY DIGIT. `R12` and `A3` are named in the component, once, rather than
 * in two dictionaries that could drift apart — which is why the sentences around
 * them are split. The gate ids (`G3`, `G4`) are read off the gate tokens the check
 * recorded; only what a gate is CALLED is copy.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS STILL PROHIBITED, IN BOTH LANGUAGES: a program's name, a count of formats,
 * an integration claim, and "two people" signing. `exports.test.tsx` scans this
 * module and the rendered page for each.
 */

export const EN = {
  /** A format's id in the check's output, and the name this page gives it. */
  fileNames: {
    json: 'the JSON',
    html: 'the report',
    sheets: 'the drawing set',
    dxf: 'the drawing',
    xlsx: 'the workbook',
    glb: 'the model file',
  },

  /** What a gate is called in a sentence. Its id follows it in brackets. */
  gateNames: {
    G3_ASSUMPTIONS_ACKNOWLEDGED: 'the assumption register',
    G4_REVIEWER_NAMED: 'a named reviewer',
  },

  /** Between the items of a list the check read. */
  listSeparator: ', ',
  /** Between the gates signed so far. */
  gateJoin: ', and ',

  hero: {
    title: 'What comes out',
    lede:
      'Every file this engine writes says its regulatory validity is not assessed, and ' +
      'none of them leaves until the assumption register is acknowledged and someone puts ' +
      'their name and licence on the export.',
    note:
      'Every layer, sheet, note and version below was read out of the files the engine ' +
      'wrote for the worked example on the landing page, by the check that runs before ' +
      'this site is built. None of them is typed here: a file that changes changes this ' +
      'page, or stops the build.',
  },

  drawing: {
    title: 'The drawing',
    /** "DXF R12 — the file's own header says AC1009. R12 predates…" */
    lede: {
      afterFormat: ' — the file’s own header says ',
      afterVersion: '. ',
      afterRelease:
        ' predates the object model later revisions add, so it is the simplest complete ' +
        'DXF, and this drawing uses nothing it lacks.',
    },
    body:
      'It comes two ways. The whole building in one file, in three dimensions: the site ' +
      'plan at grade, each parking level at its own floor, each slab at its level, the ' +
      'massing as faces and the ramp as the slope it is. And each sheet of the drawing ' +
      'set as a file of its own, flat and at true size, for referencing into a drawing of ' +
      'your own. A section comes only as a sheet; drawn into the model, it would stand in ' +
      'the car park. The same sheets also come as one document to print, ',
    bodyAfterSize: ', one sheet to a page.',
    pdf:
      'That document is the PDF. It is print-first HTML — the paper size, the margins and ' +
      'the page breaks are in the file — and the browser saves it. Writing a second one on ' +
      'the server would set the same report in a different engine, and two layouts of one ' +
      'report drift the way two drawings of one building do.',

    sheets: {
      region: 'The sheets of the drawing set',
      caption:
        'The sheets the worked example’s drawing set contains, each also written as a DXF ' +
        'of its own.',
      sheet: 'Sheet',
      title: 'Title',
    },

    layersTitle: 'The layers',
    layersBefore: 'One layer per level per element, named ',
    layersAfter:
      '. A reviewer’s first move on receiving the file is to switch things off — bays off ' +
      'to check the aisle runs, the ramp off to see what it costs, every level but one off ' +
      'to read it alone. One layer for all the parking would make all of those arguments ' +
      'happen at once.',

    layers: {
      region: 'The layers of the building DXF',
      caption:
        'Every layer the worked example’s building DXF declares, grouped by the second part ' +
        'of its name — the site, a level, a ramp or the annotation — in the file’s own ' +
        'order. A marked layer holds something the engine assumed.',
      part: 'Part',
      inFile: 'Layers in the file',
      cellLabel: 'Layers',
      assumedNote: ' (holds something assumed)',
    },

    marked: {
      before: 'A layer marked',
      sample: 'like this',
      after:
        'holds something the engine assumed. In the file, those elements are inked in the ' +
        'orange nearest the screen’s amber that a DXF colour index holds, on the layer of ' +
        'the element they are — so the assumption survives the export as colour, and there ' +
        'is no separate layer to switch off to hide it.',
    },
    outline:
      'Levels drawn as outline only are height the rules permit and the answer leaves ' +
      'unused: a grey outline on a layer of its own, with no mass.',
  },

  model: {
    title: 'The model file',
    ledeBefore: 'It writes binary glTF ',
    ledeAfter:
      ' and lists no extension a reader is required to support. That sentence is the ' +
      'whole claim.',
    namesBefore: 'The file names',
    namesAfter:
      'as an extension it uses, and none as one it requires, so a reader that does not ' +
      'know it can still draw the building. The cars are written as ordinary meshes for ' +
      'the same reason: the instancing extension would have made the file smaller, and it ' +
      'is marked required, so a reader without it would have to refuse the whole file.',
    unitsBefore:
      'A model file has no title block, so it carries its own, in the scene’s metadata: ' +
      'the units (',
    unitsAfter: '), the point of the plot its coordinates are measured from, the list of ',
    notDrawn: 'what the model does not draw',
    notDrawnAfter: ', and these two sentences, word for word:',
    server:
      'It is written by the server, past the same two gates as every other file. The ' +
      'browser holds the same model and could write the same bytes, and a file it wrote ' +
      'for itself would have passed the gates only because it said so.',
  },

  workbook: {
    title: 'The workbook',
    lede:
      'It writes XLSX, for the reader who takes the numbers into a pro forma. Every value ' +
      'row carries its provenance class and its citation or its basis, and an assumed row ' +
      'keeps an amber fill and a dashed edge.',
    region: 'The sheets of the workbook',
    caption: 'The workbook’s sheets in order, and the sentence each one sets above its table.',
    sheet: 'Sheet',
    says: 'What it says above the table',
    saysLabel: 'Says',
    nothing: 'Nothing. The table starts on the first row.',
  },

  json: {
    title: 'The run as data, and the report',
    lede:
      'The JSON is the whole run, provenance graph included, so a tool downstream can walk ' +
      'every derivation again rather than trust the figure at the end of it.',
    fields: 'Its top-level fields, as the file has them:',
    validityBefore: 'In the JSON the regulatory claim is a field rather than a sentence: ',
    validityIs: ' is ',
    detailBefore: ', and its detail reads “',
    detailAfter: '”',
    report:
      'The report is the same run as a document to read and print: the five-way claim ' +
      'statement, the assumption register with every basis, the deferred constraints by ' +
      'name, the engine and rule-set versions with the rule set’s content hash, and the ' +
      'name, asserted licence and time of whoever signed the review gate.',
  },

  stamped: {
    title: 'What every file carries',
    ledeBefore:
      'Each of them says regulatory validity is not assessed, and the check that wrote ' +
      'this page looked in each: ',
    ledeMiddle: '. In the JSON it is the field above; in the rest, the sentence ',
    ledeAfter: '.',
    /** Around the quoted words the drawings carry, which the component holds. */
    restBefore:
      'The rest does not travel everywhere, and this page does not round it up. The ' +
      'drawings and the model file carry that sentence and “',
    restAfter:
      '” — in the title block, or in the model’s metadata — and not the register or the ' +
      'signature. The workbook adds the assumption register. The report and the JSON ' +
      'carry all of it: the claim statement, the register, the deferred constraints, the ' +
      'versions and the signature.',
    signature:
      'The signature is described as what it is: a name, a licence number the signer ' +
      'typed, and a time. The licence is recorded and never checked with anybody.',
  },

  gates: {
    title: 'Which gates stand in front of export',
    lede:
      'Four gates exist. Two stand in front of export; the other two name earlier steps, ' +
      'rule resolution and capacity computation, and stand there. This is what the export ' +
      'answered for the worked example, asked before, between and after the two ' +
      'signatures:',
    region: 'What the export answered at each step',
    caption:
      'The export requested three times for the same run, with the gates signed so far, ' +
      'and the status code each request received.',
    signed: 'Signed so far',
    signedLabel: 'Signed',
    answered: 'The export answered',
    answeredLabel: 'Answered',
    nothing: 'Nothing',
    file: ' — the file',
    refused: ' — refused, and nothing is written',
    lapsedBefore:
      'An acknowledgement is given against the content it was shown. If that content has ' +
      'changed since, the gate has lapsed and the export answers ',
    lapsedAfter:
      ' again. A stored run is never edited: changing an assumption computes a new run, ' +
      'and the new run starts with nothing signed.',
    /*
      "The check signed its own run" is held PRESENT by the test. The first draft of
      this page said a reviewer had to be somebody other than the author; no code
      requires it, and this sentence is the correction.
    */
    separationBefore:
      'The review gate does not require a second person. It records who signed, and it ' +
      'does not compare them with the run’s author — the check behind the table above ' +
      'signed its own run, and the export opened. Separation of duties is a control this ' +
      'software does not have, and it is on ',
    separationLink: 'what it refuses',
    separationAfter: '.',
  },

  files: {
    /** Around `R12`, which the component holds. */
    before: '“Writes DXF ',
    after:
      '” and “writes binary glTF” are facts about a file, and this page can be held to ' +
      'them. A sentence naming a program that opens the file would be a claim about a tool ' +
      'somebody else ships, and none is made here.',
  },

  notProved: {
    title: 'What this page did not prove',
    first: 'That any of these files may be relied on. The sentence on each one says why.',
    second:
      'No sample file is offered here, because a file downloaded from a public page would ' +
      'have skipped the two gates this page describes. To get the same files, run the ' +
      'worked example, acknowledge its register and sign its review gate.',
    cta: 'Run the worked example',
  },
};

export type ExportsDictionary = typeof EN;
