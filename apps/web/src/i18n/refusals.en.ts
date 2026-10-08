/**
 * `/refusals` — what it refuses, in English.
 *
 * `export type RefusalsDictionary = typeof EN`, so this module IS the contract and
 * `refusals.ar.ts` is held to it: a missing Arabic key is a compile error rather
 * than an English sentence rendering under an Arabic heading. NOTE THE ABSENCE OF
 * `as const`: with it every value would narrow to its own literal and the Arabic
 * could only satisfy the shape by repeating the English.
 *
 * EVERY STRING HERE WAS LIFTED OUT OF THE JSX UNCHANGED. The English render of the
 * page is byte-for-byte what it was before the page had a second language, and the
 * page's test grips that text — the reviewer disclosure, the two export gates, the
 * absence of any date. Editing a sentence while moving it would be editing the page
 * the reader forwards to their lawyer under cover of a refactor.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS NOT IN HERE.
 *
 * 1. NO ENGINE STRING. The deferred rule records out of `readiness.json` (rule,
 *    parameter and instrument ids, clause references), the list of what the model
 *    does not draw (read out of the worked example's model file), every file path,
 *    every status code and every type name stay in the component, and on the Arabic
 *    page they are rendered inside `Verbatim`. `docs/05-design/arabic-glossary.md`
 *    §1 carries the argument: a record translated is a second record nobody issued.
 *
 * 2. NO FIGURE. The realism discount is read from `worked-example.json` by its own
 *    key, and the status codes are identifiers. The only numbers in this file are
 *    the ones the English prose has always spelled out — "Four gates exist", "two
 *    of them", "read zero" — and the Arabic states the same facts in words.
 *
 * 3. NO SHARED PARAGRAPH. The five "does not" items, the file paragraph and the
 *    optimiser refusal come from `content/shared.tsx` and its Arabic twin, picked
 *    with `useDict` in the component. A second copy here would diverge from the
 *    first the next time somebody edited either.
 *
 * ---------------------------------------------------------------------------
 * SENTENCES THAT CARRY AN IDENTIFIER ARE FUNCTIONS OF IT.
 *
 * `Gate`, `409`, `USER_SET`, `RuleRecord` and the rest are specimens, not copy, and
 * they do not sit in the same place in an Arabic sentence as in an English one.
 * Where a paragraph holds one or more of them it is a function that takes the
 * rendered identifiers as arguments and returns the paragraph, so each language
 * carries its own WORD ORDER and neither carries the identifier. The component
 * builds the identifier once, so on the Arabic page it arrives already isolated.
 * A cell holding one identifier and a trailing clause keeps the simpler form: the
 * clause, with its leading comma, as its own string.
 */

import { createElement, Fragment, type ReactNode } from 'react';

/** A paragraph assembled around the identifiers it quotes. No key warnings, no wrapper. */
const join = (...parts: ReactNode[]): ReactNode => createElement(Fragment, null, ...parts);

export const EN = {
  hero: {
    title: 'What it refuses',
    lede:
      'Refusals here are things the software does, not things it lacks. If you are ' +
      'looking for the overclaim, start on this page.',
    note:
      'Each item below is a status code the API returns, a class the type system will ' +
      'not construct, or a page this site declines to print. Where something is ' +
      'genuinely missing rather than refused, it is in the last section but one, next ' +
      'to the name of the person who closes it.',
  },

  /** §01 — the status codes, before a word of prose. */
  contract: {
    title: 'The refusal contract',
    lede:
      'Before any of the prose: what the API does at runtime, and the file that does ' +
      'it. These are not policies written down somewhere. They are the responses.',
    regionLabel: 'What the API refuses at runtime',
    caption:
      'Three requests the API refuses, the response each one receives, and the file ' +
      'that enforces it.',
    columns: {
      asked: 'What is asked for',
      response: 'What comes back',
      enforced: 'Where it is enforced',
    },
    /**
     * `data-label`: re-emitted as each cell's row header below 40rem, so it is a
     * rendered string and belongs here beside the column it repeats.
     */
    cells: {
      asked: 'Asked for',
      response: 'Response',
      enforced: 'Enforced in',
    },
    undeclared: 'A run with the parking-in-FAR treatment undeclared',
    /** After the status code, in the same cell. */
    noGuess: ', and no guess',
    exportGate: 'An export while the assumption gate or the reviewer gate is unsatisfied',
    failsCheck: 'A run that fails an invariant or a hard constraint',
    /** After the status code, in the same cell. */
    neverStored: ', and the run is never stored',
    thirdRow:
      'The third row is the one that is easy to soften, and it has not been. A run that ' +
      'fails a check does not become a stored artefact with a caveat attached to it; it ' +
      'does not become an artefact. The checks run before anything is written, there is ' +
      'no warning level, there is no configurable severity and there is no override ' +
      'flag — and adding one would be a defect rather than a feature.',
    gatesTitle: 'Which gates stand where',
    /**
     * `gate` is the `Gate` type's name and `conflict` the status code, both built by
     * the component. The count is in words because the `Gate` union fixes it: adding
     * a fifth member is a compile-time event, and this sentence says so.
     */
    gatesBody: (gate: ReactNode, conflict: ReactNode): ReactNode =>
      join(
        'Four gates exist. That count is safe to write down because the ',
        gate,
        ' type has four members and adding a fifth is a compile-time event rather than ' +
          'a copy edit. Two of them stand in front of export — the assumption register ' +
          'and the named reviewer — and an export attempted before either has been ' +
          'acknowledged answers ',
        conflict,
        ', as does one whose acknowledgement was given against different content and ' +
          'has lapsed. The other two name earlier steps, rule resolution and capacity ' +
          'computation, and that is where the file records them; the export door is not ' +
          'where they stand. There is no chain in the source that makes one gate wait on ' +
          'another, so a page telling you an export waits on all four would be describing ' +
          'a control by inference rather than by reading.',
      ),
  },

  /** §02 — it does not design a building; what the model draws and does not. */
  draw: {
    model:
      'The 3D view is the engine’s own model of the building — each level at its ' +
      'floor, each car in its bay, the ramp between the levels it joins — and every ' +
      'object in it is coloured by the provenance class of the value it stands for ' +
      'rather than by a palette the renderer chose. A building assembled in the viewer ' +
      'would be a building nobody computed, drawn convincingly, on the most persuasive ' +
      'surface in the product — so it is built in the engine and the picture is ' +
      'downstream of the arithmetic.',
    notDrawnTitle: 'What the model does not draw',
    notDrawnLede:
      'A view with no cores reads as a building with no cores unless it says why. So ' +
      'the engine keeps the list with the model, and the list travels with it: under ' +
      'the picture on screen, and in the model file’s own metadata. For the worked ' +
      'example on the landing page, the file says:',
    neighbours:
      'The façades and the buildings next door are the two a view in three dimensions ' +
      'most invites a reader to assume. Neither is in the run, so neither is drawn — ' +
      'not as a placeholder block and not as a texture. What the rules permit and the ' +
      'answer leaves unused is drawn, as an outline, because that one the engine did ' +
      'compute.',
    podium:
      'Where the podium stops and the tower starts is not derivable from a run. The ' +
      'affection plan states it. A run given no podium level count therefore carries an ' +
      'assumed one: it is amber, it is listed in the assumption register, and it is ' +
      'said in words as well as in colour, because a reader who cannot see the colour ' +
      'has to be told the same thing by the sentence.',
  },

  /** §03 — life safety, and the deferred constraints read off the snapshot. */
  lifeSafety: {
    omission:
      'A missing check reads as a check that passed. That is the whole reason the ' +
      'deferred constraints are named in every single output rather than dropped from ' +
      'it — a reader can argue with a list, and cannot argue with an omission.',
    emptyTitle: 'The deferred list is not in this build.',
    emptyBody:
      'This section reads the deferred constraints from a generated readiness snapshot, ' +
      'and the snapshot this build carries names none. That is not the same statement ' +
      'as nothing being deferred, so nothing is listed rather than an empty table. ' +
      'Regenerating the snapshot from a real run restores it.',
    regionLabel: 'Constraints this engine defers',
    caption:
      'Constraints this engine defers, the parameter each one governs, and the state of ' +
      'the citation behind it.',
    /** Column headers, and the `data-label` each cell repeats below 40rem. */
    columns: {
      rule: 'Rule',
      parameter: 'Parameter',
      clause: 'Clause reference',
    },
    /**
     * The chips. «not sourced» is read off the record by `isSourced`, never typed
     * as a fact about this deployment: the chip changes the day a real citation
     * lands, and the copy has to be able to say both.
     */
    chips: {
      lifeSafety: 'Life safety',
      sourced: 'Citation on file',
      notSourced: 'Draft · not sourced',
    },
    chipNote:
      'The chip beside each id reports the state of that record’s own citation and ' +
      'nothing more. Every seed rule in this deployment names a placeholder instrument ' +
      'and clause text marked not sourced, so every chip says so — and it says so ' +
      'because the record does, not because this page was written while that was true. ' +
      'A clause reference on a page like this one is a promise; the chip is what keeps ' +
      'the promise honest until a licensed architect has read the instrument and put ' +
      'their name to the rule.',
  },

  /** §04 — no realism band, and the one figure on the page that comes from outside it. */
  realistic: {
    schema:
      'There is no realistic band, no expected band and no likely band. The field does ' +
      'not exist in the schema, so one cannot be configured in, enabled for a customer ' +
      'or added by a deployment — the absence is structural rather than a setting ' +
      'somebody left off. Any number put there would arrive without a derivation, on a ' +
      'product where every other figure carries one, and there is nothing in the engine ' +
      'that could give it one.',
    /** The figure follows, read from `worked-example.json`. */
    discountLabel: 'Realism discount on the run this site publishes:',
    discountNote: (userSet: ReactNode): ReactNode =>
      join(
        'No discount, which is the default. It is ',
        userSet,
        ' rather than assumed: it holds until a named person changes it, and whoever ' +
          'changes it is recorded beside the figure they chose. That is the honest ' +
          'substitute for a realism band — a haircut somebody signs, rather than one the ' +
          'engine applies on their behalf and calls achievable.',
      ),
  },

  /** §05 — the parking-in-FAR question. */
  parking: {
    noDefault: (derived: ReactNode, userSet: ReactNode): ReactNode =>
      join(
        'There is no default and there was never one to remove. The treatment is either ',
        derived,
        ' from a cited rule or ',
        userSet,
        ' by a named person; with neither, the run is refused before a capacity band is ' +
          'computed at all. That refusal is the first row of the contract above.',
      ),
    /** The link to `/parking` sits between these two, with its own text. */
    spreadBefore:
      'No range is quoted here, and that is a deliberate deletion rather than an ' +
      'omission. A range cited from a specification is a claim about documents; the ' +
      'spread between the two answers for a plot the engine actually ran is a ' +
      'measurement. So the measurement is what this site prints, on ',
    spreadLink: 'the parking page',
    spreadAfter:
      ', where both answers for the same plot are set side by side and the difference ' +
      'between them is engine output rather than a sentence.',
  },

  /** §06 — a professional, and the control the reviewer gate does not perform. */
  professional: {
    /** Set after the shared heading, in the same `<h2>`. */
    titleAnd: 'And it does not enforce that the reviewer is not the author.',
    doesTitle: 'What the reviewer gate does',
    doesBody:
      'It refuses the acknowledgement from a request that names nobody, and it writes ' +
      'that name, that timestamp and the licence number the signer asserted — or that ' +
      'they asserted none — onto the export. Nothing leaves the system unsigned, and ' +
      'the signature is a person’s rather than the system’s: the engine never reports ' +
      'that it decided anything.',
    doesNotTitle: 'What it does not do',
    doesNotBody:
      'It does not verify the licence with anybody — no registry is consulted, because ' +
      'no such integration has been scoped, and for that reason a licence is recorded ' +
      'rather than required. And it does not compare the person signing against the ' +
      'person who authored the run. The check is that the request carries a name, and ' +
      'it is the only check the handler makes.',
    calloutTitle: 'So one person can author a run and sign it.',
    calloutBody:
      'One person, holding one licence number, can do both — and this deployment will ' +
      'record the result as a reviewed export. The gate is a signature line, and a ' +
      'signature line is worth exactly what the signature is worth.',
    /*
      PHRASED AROUND ITS OWN TEST, in both languages. Written the obvious way this
      paragraph contains the noun phrase "a reviewer who is not the author", which
      describes the flow the gate exists for and reads, one skim later, as the
      control this software does not perform. The Arabic keeps the same shape: the
      share names who signs, and nothing checks who they are.
    */
    share:
      'Scoping a run to its author alone was considered and rejected. The gate exists ' +
      'for the case where a different person signs, and an ownership check would refuse ' +
      'exactly that case. What was built instead is a share: the author names an ' +
      'account as a reviewer or a reader, and only those accounts can open the run. A ' +
      'share names who signs; nothing checks who they are, and nothing stops an author ' +
      'signing their own run. There are no firms or projects either — a run belongs to ' +
      'one account. None of that is evidence that some other control took its place. An ' +
      'asserted control is worse than a missing one, because a missing one is visible, ' +
      'and saying so here is the reason a reader can believe the rest of the page.',
  },

  /** §07 — what an optimiser would have had to claim in order to answer at all. */
  optimiser: {
    judgement:
      'An optimiser that ranked layouts would be answering a question about preference ' +
      'with the authority of a calculation, and every figure it produced would be a ' +
      'number the reader could not trace back to a rule — because there is no rule. ' +
      'There is a judgement, and the judgement is the architect’s.',
  },

  /** §08 — developer standards are a different type, and that is the enforcement. */
  standards: {
    title: 'A developer standard could not cut your envelope, however many it held',
    lede:
      'A developer’s brief is a commercial preference. A regulation binds. The type ' +
      'system is where the difference is enforced, because a sentence in a document is ' +
      'not enforcement.',
    /** The three type names, each built once by the component. `record` appears twice. */
    mechanism: (standard: ReactNode, brief: ReactNode, record: ReactNode): ReactNode =>
      join(
        standard,
        ' and ',
        brief,
        ' are deliberately not ',
        record,
        's. That is the whole mechanism: a ',
        record,
        ' is resolvable by the parameter resolver and can therefore bind the envelope, ' +
          'and these are not resolvable by it, so they cannot bind anything. They are ' +
          'served from their own endpoint and are never merged into the rule set. A ' +
          'standard that bound the envelope would be reporting a client’s brief as a ' +
          'legal limit — a private target printed with the authority of a code — and the ' +
          'screen that offers them says, above the picker, that a standard is not a ' +
          'regulation.',
      ),
    confidential:
      'No cap, target, benchmark or ratio out of any developer’s brief appears on this ' +
      'site, in numbers or in prose, and no developer is named. Those figures are ' +
      'transcribed accurately, each carrying the page and the bounding box it came from ' +
      'so the transcription can be checked rather than trusted, and they are reachable ' +
      'through the signed-in application and nowhere else. A confidential figure ' +
      'rewritten as a sentence is still the figure.',
  },

  /** §09 — not the whole code, and no figure for how much of it. */
  coverage: {
    title: 'It is not the whole code',
    lede:
      'What is encoded is a fraction of what applies to a building, and the fraction is ' +
      'not quantified, because nothing in this build can quantify it honestly.',
    families:
      'The clause families encoded here are parking, setback, dimension and access. The ' +
      'fire code is not read at all — not partially, not with the gaps flagged. It is ' +
      'not an input to this engine, which is why life safety appears above as a list of ' +
      'deferred constraints rather than as a set of checks with a caveat.',
    noPageCount:
      'No page count of the source codes appears on this site. A corpus figure comes ' +
      'from a generated inventory or it does not appear, and this build holds no such ' +
      'inventory — so the honest statement of coverage is the list of families in the ' +
      'sentence above, and the reader supplies their own sense of what is missing from ' +
      'it. A percentage typed by hand would read as measurement and would be the one ' +
      'number here nobody could trace.',
  },

  /** §10 — a file is not an integration; what another program does is its own. */
  files: {
    behaviour:
      'What another program does with a file we write is that program’s behaviour, and ' +
      'we make no claim about it. We do not test against a third-party application, we ' +
      'do not say a file works with one, and we will not name one on this site. A ' +
      'format is a thing we can be held to; a tool’s behaviour is a thing somebody else ' +
      'ships.',
  },

  /** §11 — the pages the genre supplies by default, and why each is absent. */
  notOnSite: {
    title: 'What is not on this site, and why',
    lede:
      'Not one of these is declined for taste. Each is a page the genre supplies by ' +
      'default and this product has nothing true to put on.',
    regionLabel: 'Pages and claims this site does not carry',
    caption: 'Standard pages and claims this site does not carry, and the reason for each.',
    /** Column headers, and the `data-label` each cell repeats below 40rem. */
    columns: {
      notHere: 'Not here',
      why: 'Why',
    },
    /**
     * Keyed rather than listed, so the Arabic cannot drop a row and still compile.
     * The component owns the order, so both languages render the rows in one order.
     */
    rows: {
      accuracy: {
        what: 'An accuracy figure',
        why:
          'The inter-architect variance study that would produce one has not been run, ' +
          'so there is no measured agreement to report. A rounded guess would be the one ' +
          'figure on this site that could not answer where it came from.',
      },
      customers: {
        what: 'A customer count or a logo wall',
        why: 'There are no customers.',
      },
      caseStudy: {
        what: 'A case study',
        why:
          'Every real plot in the corpus belongs to somebody else. The material to build ' +
          'one is confidential rather than merely absent.',
      },
      comparison: {
        what: 'A comparison table',
        why:
          'We have evaluated no competitor. The only competitor material held anywhere ' +
          'is a machine transcript of a private call, which is neither an evaluation nor ' +
          'ours to publish.',
      },
      price: {
        what: 'A price',
        why:
          'Nothing about the present engagement generalises, and a number that does not ' +
          'generalise printed as if it did is the same defect as any other untraceable ' +
          'figure.',
      },
      certification: {
        what: 'A certification badge',
        why:
          'No output of this engine is certified by any authority, and there is no ' +
          'certification to badge.',
      },
      security: {
        what: 'A security or trust page',
        why:
          'A badge is a claim about a deployment, made by whoever prints it. The page ' +
          'that would state this deployment’s posture is written when the people who set ' +
          'that posture have settled it, and not before.',
      },
      uptime: {
        what: 'An uptime page',
        why:
          'Nothing monitors availability, so there is nothing to report. The readiness ' +
          'page counts what is not ready, which is a different question and is named as ' +
          'one.',
      },
      blog: {
        what: 'A blog or a newsletter',
        why:
          'Neither would carry anything that is not already on this site, and a ' +
          'publishing schedule is a promise about the future.',
      },
      integrations: {
        what: 'An integrations page',
        why: 'Exports travel as files, which is the section above. There is nothing to list.',
      },
      team: {
        what: 'A team or an about page',
        why: 'There is no legal entity to describe.',
      },
      terms: {
        what: 'Terms or a privacy policy',
        why:
          'There is no legal entity, and drafting a legal instrument in-house is not a ' +
          'design task. It is written by a lawyer, for an entity, and neither of those is ' +
          'in place.',
      },
    },
    ruleTitle: 'The rule that produced the list',
    ruleBody:
      'No figure on this site is typed by a human. Every number on every public page ' +
      'reads from a fixture written by a script from a real run, and a build step ' +
      're-runs the engine and diffs it — so a figure that drifted would fail a gate ' +
      'rather than sit on a page. A page that cannot cite a number does not print one, ' +
      'which is why this section carries none.',
  },

  /** §12 — an owner for every gap, and a date for none. */
  whoChanges: {
    title: 'Which of these could change, and who changes them',
    lede:
      'A gap with an owner is a plan; a gap without one is an excuse. So every item ' +
      'below names what closes it, and the permanent ones say plainly that nothing does.',
    /** Each item is a bold label and the sentence after it, in one list item. */
    permanent: {
      title: 'Permanent by design',
      compliance: {
        label: 'The compliance claim.',
        body:
          'Regulatory validity is not assessed here and is never claimed, at any ' +
          'readiness, in any deployment. It is not a gap; it is what the product is.',
      },
      realism: {
        label: 'The realism band.',
        body: 'No realistic, expected or likely capacity, and no field in the schema to hold one.',
      },
      optimiser: {
        label: 'The optimiser class.',
        body: (tradeoff: ReactNode): ReactNode =>
          join(
            'A ',
            tradeoff,
            ' value sits outside the class set this phase emits, and the constructor ' +
              'throws on one.',
          ),
      },
    },
    awaiting: {
      title: 'Awaiting a named human',
      approval: {
        label: 'Rule approval.',
        body:
          'A licensed Dubai architect authors and approves each rule against the actual ' +
          'instrument. Until one has, every citation on every screen is a placeholder and ' +
          'says so.',
      },
      annex: {
        label: 'The annex signature.',
        body:
          'The metric definitions annex is reviewed and signed. That signature is what ' +
          'unblocks every area term in the product, which is most of them.',
      },
      study: {
        label: 'The agreement study.',
        body:
          'A variance band needs architects under contract, measuring the plots this ' +
          'engine measured.',
      },
    },
    outside: {
      title: 'Outside this phase of work',
      units: {
        label: 'Unit layouts.',
        body: 'A capacity is not a plan, and this phase stops at the envelope.',
      },
      coverage: {
        label: 'Further code coverage.',
        body:
          'Each family added is a set of rules authored, cited and approved by the same ' +
          'named architect.',
      },
      dormant: {
        label: 'The dormant invariants.',
        body:
          'They read a unit and per-level schedule this phase does not generate. ' +
          'Synthesising one to wake them would be verifying the engine against its own ' +
          'output, which is not verification.',
      },
    },
    noDate:
      'No date appears in any of that, and none will. An owner is a plan; a date is a ' +
      'promise, and this product does not make those. A sentence that names the person ' +
      'who closes a gap does not need to say when.',
  },

  /** §13 — the last block is what this page could not demonstrate. */
  unproven: {
    title: 'What this page did not prove',
    lede: 'That the refusals above are the complete set.',
    authors:
      'This page was written by the people who built the engine, from the files that ' +
      'enforce each item on it. A refusal nobody thought to write down is not here, and ' +
      'no gate on this repository can find one — a prohibition test catches a sentence ' +
      'that says too much, and is blind to a sentence that was never written. So the ' +
      'list is as complete as its authors, which is exactly the standard this product ' +
      'refuses to accept from anybody else.',
    readiness:
      'The readiness page is the shorter route to an argument with this one. It counts ' +
      'what is not ready in this deployment rather than describing it, it leads with the ' +
      'figures that read zero, and it carries no composite score for a reader to stop at.',
    cta: 'See what is not ready',
    ctaNote: 'Approved rules and signed definitions both read zero on this deployment.',
  },
};

export type RefusalsDictionary = typeof EN;
