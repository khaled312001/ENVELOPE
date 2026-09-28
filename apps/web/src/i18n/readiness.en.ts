/**
 * `/dashboard` — the readiness page, in English.
 *
 * `export type ReadinessDictionary = typeof EN`, so this module IS the contract and
 * `dashboard.ar.ts` is held to it. A missing Arabic key is a compile error rather
 * than a sentence that silently renders in the wrong language. NOTE THE ABSENCE OF
 * `as const`: with it every value would narrow to its own literal and the Arabic
 * could only satisfy the shape by repeating the English.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS NOT IN HERE, AND WHY THE OMISSIONS ARE THE INTERESTING PART.
 *
 * 1. NO FIGURE. Not a count, not a ratio, not a version, not a percentage. Every
 *    number on this page arrives from `/api/dashboard` or from `readiness.json`,
 *    and a digit typed into a dictionary is a number with no provenance — the same
 *    defect as a hard-coded capacity, one language further from anyone who would
 *    notice. The three helpers below (`ofTotal`, `ranOfTotal`, `truncated`,
 *    `lifeSafetyDeferred`) take their figures as arguments for exactly that
 *    reason: they carry the WORD ORDER, which differs between the two languages,
 *    and never the value.
 *
 * 2. NO ENGINE STRING. The blocking sentence, every basis, every rule, parameter
 *    and instrument id, every gate name, the clause references, the plot numbers
 *    and the engine and annex versions stay in the component and are rendered as
 *    the engine emitted them. `docs/05-design/arabic-glossary.md` §1 carries the
 *    argument: a basis string is a signed record, and a translated record is a
 *    second record nobody issued.
 *
 * 3. NO SECOND ENGLISH COPY OF A SHARED PARAGRAPH. `DORMANT_IS_NOT_A_PASS` and
 *    `SEED_RULES_NOT_DEV_RULES` render here AND on `/method`, so they are imported
 *    and widened, the way `chrome.en.ts` imports `DISCLAIMER`. Re-typing them here
 *    would be the duplication `content/shared.tsx` exists to prevent.
 *
 * ---------------------------------------------------------------------------
 * WHY SOME STRINGS CARRY A LEADING OR TRAILING SPACE.
 *
 * Several sentences on this page wrap an identifier the engine issued —
 * «FR-RUL-001 requires…», «Annex 0.1.0-UNSIGNED, unsigned.» The identifier may not
 * be translated and it does not sit in the same place in an Arabic sentence, so the
 * prose is split into the part BEFORE it and the part AFTER it. English usually
 * leads with the identifier and so has an empty `…Before`; Arabic leads with the
 * verb and fills it. The spaces belong to the strings because they belong to the
 * sentence, and keeping them here is what makes the English render byte-identical
 * to the JSX it was lifted out of.
 */

import type { ReactNode } from 'react';

import { DORMANT_IS_NOT_A_PASS, SEED_RULES_NOT_DEV_RULES } from '../content/shared.js';

export const EN = {
  /**
   * The three capacity bands, labelled. The band TOKEN (`PARKING`) is the engine's
   * and is never translated; this is what the interface calls it, which is copy —
   * the same split the glossary draws between `ASSUMED` and «مُفترَض».
   *
   * The letters stay Latin: A, B and C are how the bands are named in the PRD, in
   * the report and in every export, and a reader matching this page against one of
   * those needs the same letter on both.
   */
  bands: {
    REGULATORY: 'Regulatory (A)',
    GEOMETRIC: 'Geometric (B)',
    PARKING: 'Parking (C)',
  },

  /**
   * `n of total`, as a word order rather than as a number.
   *
   * Both figures are the payload's. English puts the preposition between them and
   * so does Arabic, but the preposition is not the same word, and a page that hard
   * codes `${a} of ${b}` renders «0 of 13» inside an Arabic sentence.
   */
  ofTotal: (part: string, total: string): string => `${part} of ${total}`,

  /** The two signed-in states that are not the page. */
  fetch: {
    errorTitle: 'This page could not read the deployment.',
    loading: 'Reading the deployment…',
  },

  /** §1 — where the numbers below came from, said before one of them appears. */
  dateline: {
    live: 'Live from the deployment you are connected to.',
    snapshotBefore: 'Signed out, so this is a snapshot generated at',
    snapshotAfter: 'from a verified run, rather than a live reading.',
    engine: 'Engine',
  },

  /** §2 — the frame around the engine's own blocking sentence. */
  blocking: {
    /*
      "PRODUCED HERE", NOT "ON THIS PAGE", and the Arabic keeps the wider scope.
      The narrower sentence disclaims the page and leaves the deployment
      unqualified, while the engine's blocking sentence underneath disclaims
      everything the deployment emits. `scripts/smoke.mjs` asserts the wider wording.
    */
    title: 'Nothing produced here is a capacity assessment.',
  },

  /** §3 — what is not ready. First and largest on the page. */
  notReady: {
    title: 'What is not ready',
    ledeBefore:
      'Each figure here is a count of something countable, and each one has a named ' +
      'human action behind it. No tile turns green: a readiness figure that has been ' +
      'met is stated plainly and nothing more, because a colour that says',
    /** Emphasised in the sentence, so it is its own key rather than markup in a string. */
    ledeEmphasis: 'done',
    ledeAfter: 'is read faster than the count beside it.',

    rules: {
      label: 'Rules approved by a named professional',
      noteBefore: '',
      noteAfter:
        ' requires a qualified human approver on every rule. The seed set is stamped ' +
        'approved by a development placeholder so a demonstration can run at all, and ' +
        'that placeholder is not counted here.',
    },

    definitions: {
      label: 'Metric definitions signed',
      annexLabel: 'Annex',
      /** Between the annex version and its signature state. Arabic takes «،». */
      annexSeparator: ', ',
      signed: 'signed',
      unsigned: 'unsigned',
      afterSigned: '. ',
      noteBefore: '',
      noteAfter:
        ' forbids computing an area term whose definition is not in a signed annex, so ' +
        'every area on every screen was computed against a placeholder definition.',
    },

    invariants: {
      label: 'Invariants that ran on the last run',
      note:
        'The rest had nothing to read: they need a unit and per-level schedule this ' +
        'phase does not generate. Reported as ran of total, never as a tick and never ' +
        'as a percentage.',
    },

    /*
      IMPORTED, NOT RESTATED — the `chrome.en.ts` treatment of `DISCLAIMER`. Both
      paragraphs also render on `/method`, and a paragraph written twice is a
      paragraph that says two things after the first design pass. The casts widen
      the literal and element types so the Arabic module can satisfy the shape
      without being the English text.
    */
    dormant: {
      heading: DORMANT_IS_NOT_A_PASS.heading as string,
      body: DORMANT_IS_NOT_A_PASS.body as ReactNode,
    },
    seedRules: {
      heading: SEED_RULES_NOT_DEV_RULES.heading as string,
      body: SEED_RULES_NOT_DEV_RULES.body as ReactNode,
    },
  },

  /** §4 — an owner for every gap, and a date for none. */
  change: {
    title: 'What would change these numbers',
    lede:
      'Every figure above has a person and an artefact behind it. None of them carries ' +
      'a date, and that is deliberate: an owner is a plan and a date is a promise.',
    architect: {
      owner: 'A licensed Dubai architect',
      title: 'Each rule authored against the instrument it cites, and approved by name',
      body:
        'That is what moves the approved-rules figure, and nothing else moves it. The ' +
        'approver is recorded on the rule, so the count above is a count of signatures ' +
        'rather than a count of records.',
    },
    annex: {
      owner: 'A named reviewer of the annex',
      title: 'The metric definitions annex reviewed and signed',
      body:
        'This is the one that unblocks every area term on every screen. Until it is ' +
        'signed, an area computed here was computed against a placeholder definition, ' +
        'and the engine says so on each of them.',
    },
    schedule: {
      owner: 'A later phase of the engine',
      title: 'A unit and per-level schedule generated, and the dormant checks read it',
      body:
        'Synthesising a schedule here to wake them would be verifying the engine against ' +
        'its own output. So they stay dormant, they are named in every output, and the ' +
        'count above stops short of its total in the open.',
    },
  },

  /** §5 — activity, deliberately below readiness. */
  volume: {
    title: 'What has been run',
    ledeSnapshot:
      'Signed out, these are the counts of the seeded demonstration store: the ' +
      'synthetic worked example, and nothing else.',
    ledeLive: 'These are the counts held by the deployment you are connected to.',
    ledeTail:
      'Activity sits below readiness on this page on purpose. A page that leads with ' +
      'volume measures motion and calls it progress.',

    plots: 'Plots',
    runs: 'Runs',
    reviewed: 'Reviewed and signed',
    reviewedNoteBefore:
      'A run leaves the building only once a person has put a licence number beside it at ',
    reviewedNoteAfter:
      '. The licence is recorded, not verified, and the signer is not checked against ' +
      'the author.',
    exported: 'Both export gates signed',

    bindsTitle: 'Which limit binds, across what has been run',
    bindsNote:
      'Knowing which limit binds is worth more than knowing the maximum: a portfolio ' +
      'where parking governs everywhere has a single problem rather than many.',

    split: {
      emptyTitle: 'Nothing has been run here, so no limit has bound.',
      emptyBody:
        'Which limit binds is a property of a run, not of a deployment. It appears the ' +
        'moment one plot goes through.',
      /** The quiet half of «4 of 4». */
      of: 'of',
    },
  },

  /** §6 — the assumed inputs, ranked by the effect a run actually measured. */
  exposure: {
    title: 'Where the answers are least anchored',
    lede:
      'Assumed inputs across every run this store holds, in the payload’s own order — ' +
      'largest measured effect first, where an effect was measured. Each carries the ' +
      'basis the engine recorded for it, in the engine’s words rather than in ours.',
    emptyTitle: 'No run here has recorded an assumption.',
    emptyBody:
      'An assumption is created when a rule leaves a value unfixed and the engine has ' +
      'to fill it with a basis and a sensitivity. An empty list means no run has reached ' +
      'that point, not that nothing was assumed.',

    regionLabel: 'Assumed parameters and their measured effect',
    caption:
      'Assumed parameters, the largest effect any single run measured, the number of ' +
      'runs each appeared in, and the basis recorded for each',
    columns: {
      rank: 'Rank',
      parameter: 'Parameter',
      swing: 'Largest measured swing',
      runs: 'Runs',
      basis: 'Basis on record',
    },

    /** The chip beside an assumed parameter. «مُفترَض», never «افتراضي». */
    assumedChip: 'assumed',
    /** What the em dash stands for, for a reader who cannot see it. */
    noFigure: 'no figure',

    noteBefore:
      'A dash in that column is not a zero. This payload does not distinguish a ' +
      'sensitivity nobody measured from one measured at zero — the dashboard serialiser in ',
    noteAfter:
      ' collapses both to the same value before the page sees them — so neither is ' +
      'labelled, and the dash stands for both. Restoring the distinction is a change to ' +
      'that serialiser.',
  },

  /** §7 — the rules that apply to every run and are checked on none of them. */
  deferred: {
    title: 'Applicable, and never assessed',
    lede:
      'These apply to every run this deployment produces and not one of them is checked. ' +
      'They are named here for the same reason they are named in every report: an absent ' +
      'check reads as a check that passed.',
    emptyTitle: 'This deployment holds no deferred rule.',
    emptyBody:
      'That is a statement about the rule records loaded here, not about the code. Whole ' +
      'clause families — fire, egress, structure — are outside the set this engine reads ' +
      'at all, and a rule that was never loaded cannot be listed as deferred.',

    /*
      THE THREE CHIPS, AND THE ONE THAT MAY NOT DRIFT.

      «not assessed» is the absence of an act and never a verdict: لم يُقيَّم, never
      غير صالح and never غير مطابق. Both of those would convert a refusal to assess
      into an adverse finding — a stronger claim than the affirmative one the product
      refuses to make.
    */
    notAssessed: 'not assessed',
    lifeSafety: 'life safety',
    draftNotSourced: 'draft · not sourced',

    refusalTitle: 'A clause reference above is not a sourced clause.',
    refusalBody:
      'Where the instrument is a placeholder the chip says so on the same line, at the ' +
      'same size, and it is not styled to look sourced. The citation carries the ' +
      'instrument it names, the clause it names and the verbatim text it was drawn from; ' +
      'where that text has not been drawn from anything, the record says so and this page ' +
      'repeats it.',
  },

  /**
   * The drawings against the engine. The figures are the worked example's, counted
   * in the files the API wrote by `scripts/verify-worked-example.mjs`; none is typed.
   */
  drawings: {
    title: 'Whether the drawings agree with the engine',
    lede:
      'The cars each file draws for the worked example, counted in the files the API ' +
      'wrote when this build was made. They are counted again on every build, and a ' +
      'build whose files disagree is not published.',
    engine: 'Placed by the engine',
    drawingSet: 'In the drawing set',
    dxf: 'In the DXF',
    modelFile: 'In the model file',
    scopeTitle: 'Agreement is self-consistency, and nothing more.',
    scopeBody:
      'Every file is drawn from the one building model, so equal counts show that no ' +
      'drawing dropped, doubled or invented a car. They do not show that a bay is where ' +
      'the code would put it: the drawings agreeing with each other is not the drawings ' +
      'agreeing with a regulation. A second check, run with the tests, compares the ' +
      'screen as well, over more plots, bay by bay and car by car.',
  },

  /** §8 — signed in only: the table carries the names of real people. */
  runs: {
    title: 'Recent runs',
    lede:
      'Every run is immutable. Editing an assumption creates a new one and leaves the ' +
      'original exactly as it was, which is why this list only ever grows.',
    emptyTitle: 'Nothing has been run in this deployment.',
    emptyBody:
      'A run needs a plot and a declared parking-in-FAR treatment before the engine will ' +
      'compute anything at all.',
    emptyCta: 'Start with a plot',

    regionLabel: 'Recent runs, newest first',
    caption:
      'Recent runs, newest first, with the limit that governed each and the checks that ' +
      'ran on it',
    columns: {
      plot: 'Plot',
      governing: 'Governing',
      capacity: 'Capacity',
      levels: 'Levels',
      checks: 'Checks',
      reviewer: 'Reviewer',
    },

    /** Ran of total, never a tick. Both figures come off the run. */
    ranOfTotal: (ran: string, total: string): string => `${ran} of ${total} ran`,
    lifeSafetyDeferred: (count: string): string => `${count} life-safety deferred`,
    notSigned: 'not signed',
    truncated: (shown: string, total: string): string =>
      `Showing ${shown} of ${total}. The list is bounded on purpose: a page that silently ` +
      `truncates reads as a page that showed everything.`,
  },

  /** §9 — the shape the page refuses to become. */
  noScore: {
    title: 'No score, and nothing here monitors availability',
    composite: {
      heading: 'There is no composite figure on this page.',
      body:
        'No single percentage, no traffic light, no one-word verdict over the deployment. ' +
        'A composite is something a reader stops at, and it would be the arithmetic mean ' +
        'of an approval count, a signature and a set of checks that had nothing to read — ' +
        'three things that do not average. The figures above are the ones that decide ' +
        'whether any output may be relied on, and each is reported on its own terms.',
    },
    availability: {
      heading: 'This page does not watch the service.',
      body:
        'It reports what has been approved, what has been signed and what has been run. ' +
        'It does not report whether the service is reachable, whether a request ' +
        'succeeded, or how long one took. Nothing in this deployment measures any of ' +
        'those, so nothing here claims them.',
    },
    ctaLabel: 'What it refuses',
    ctaNote:
      'The rest of what this engine will not do, including the refusals it performs at ' +
      'runtime and the control it does not enforce at the reviewer gate.',
  },
};

export type ReadinessDictionary = typeof EN;
