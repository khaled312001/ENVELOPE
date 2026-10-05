/**
 * Boundary readings — the bridge from the sheet's FACES to the form's EDGES.
 *
 * On 4 Oct 2026 the client uploaded a sheet, reached step 1, and found a heading
 * that read "4 STILL UNCLASSIFIED" over four empty dropdowns:
 *
 *   «لسه برضو مش جايب الرسم على الخريطه الحقيقيه والمفروض القراءات تطلع كامله
 *    من الرسمه بتاعت الافكشن بلان»
 *
 * He was right about the symptom and the cause is a vocabulary mismatch, not a
 * missing feature. `parseAffectionPlan` reads a `SetbackSchedule` of **faces** —
 * front, side, rear — because that is what a Trakhees sheet prints. `PlotForm`
 * asks a different question per **boundary**: an `EdgeClassification` (ROAD /
 * ADJACENT_PLOT / OPEN_SPACE / OTHER) and, for a road, a `RoadHierarchy`.
 * Nothing translated between the two, so every edge arrived unanswered even on a
 * sheet whose setback schedule says, in so many words, what each face abuts.
 *
 * This module translates. What it may and may not say was settled by reading the
 * three real sheets in `docs/00-source` rather than by reasoning about them, and
 * four findings shape every type below.
 *
 * 1. **The drawing carries no text at all.** On `IC1-CTYL-16_011` and
 *    `DJAZ1MED12RES011` the site-plan panel (y 555–755 of an A3 landscape sheet)
 *    holds exactly **zero** text items — the boundary, the north point and the
 *    neighbouring parcels are vector artwork. There is no road name to read off
 *    the picture on any of the three. So the scan for road names below finds
 *    nothing on every sheet we hold, and that is the correct answer, not a
 *    parser failure.
 *
 * 2. **The only boundary vocabulary on these sheets is the setback schedule's.**
 *    `IC1-CTYL-16_011` prints "Tower: Front = 0m, Sides & Rear = 3m";
 *    `DJAZ1TRE10RES022` prints "Tower: 0m to street front, 6m to adjacent plot".
 *    Those phrases — "front", "street front", "adjacent plot" — are the whole of
 *    it, and they are enough for two honest proposals and no more.
 *
 * 3. **The sheet has a box for the answer and leaves it empty.** Every Trakhees
 *    site plan carries a field labelled `Access Side`, and on all three samples
 *    the cell beside it is **blank**. That is the single most useful thing this
 *    module can report: the sheet itself declines to say which boundary the
 *    access is on, so a reader who is asked to mark it is being asked for
 *    something the instrument genuinely does not contain.
 *
 * 4. **Road hierarchy is never printed.** No road name, no road number, no
 *    carriageway width, no classification word, on any of the three. `RoadHierarchy`
 *    keys the setback table, and nothing on an affection plan ranks a road. It is
 *    reported as a gap on every sheet, permanently.
 *
 * WHY EVERY PROPOSAL IS `ASSUMED` AND NONE IS `DERIVED`.
 *
 * `affection-plan.ts` emits the sheet's printed figures as `DERIVED`, and the
 * argument is sound: Dubai Building Code B.7.2.6.1 makes the affection plan an
 * instrument that outranks Table B.13, so a value *printed* on it reaches a cited
 * clause. A boundary classification is not printed on it. The sheet states a
 * setback **for the front face**; that a particular boundary of this plot *is*
 * the front, and that the front abuts a public road, is an inference drawn from
 * a drafting convention. `DERIVED` in this system means the value reached a cited
 * regulatory instrument in the provenance graph — and dressing a convention as a
 * clause is the laundering `CLAUDE.md` calls the most consequential available
 * here. So: `ASSUMED`, amber, with a basis naming the face label and the box it
 * was read from, and offered to the reader rather than written into the form.
 *
 * WHY THE PROPOSALS ARE KEYED BY ROLE AND NOT BY EDGE INDEX.
 *
 * A proposal per edge would require knowing which edge is the front, and the one
 * field that would say so is the blank `Access Side` cell of finding 3. Numbering
 * the boundaries ourselves and declaring edge 0 the frontage would answer, in
 * ink, the question the sheet refused to answer — on a mandatory field that
 * `FR-PLT-001 AC3` says has no default. So a proposal names a **role**, the
 * reader says which boundary holds it, and `FR-PLT-001 AC3` survives.
 */

import {
  EdgeClassification,
  type Citation,
  type SetbackFace,
  type Traced,
  type Tracer,
} from '@envelope/core';

import type {
  FaceClause,
  MassSetbackClauses,
  MissingField,
  SetbackMass,
} from './affection-plan.js';
import { pageLines, type PdfPageText, type TextItem } from './pdf-text.js';

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/**
 * The boundary roles a Dubai affection plan's setback schedule names.
 *
 * Deliberately *not* `EdgeClassification`. A role is a position on the sheet
 * ("the front") and a classification is what lies beyond a boundary ("a road").
 * The whole defect this module fixes was the two being treated as one word.
 */
export const BoundaryRole = {
  FRONT: 'FRONT',
  SIDE: 'SIDE',
  REAR: 'REAR',
} as const;
export type BoundaryRole = (typeof BoundaryRole)[keyof typeof BoundaryRole];

/**
 * The sheet's face keys mapped to roles.
 *
 * Keyed on `keyof SetbackFace` rather than on a string, so adding a fourth face
 * to the schedule in `core` is a compile error here rather than a role that
 * silently reads `undefined`.
 */
const ROLE_OF_FACE: Readonly<Record<keyof SetbackFace, BoundaryRole>> = {
  front: BoundaryRole.FRONT,
  side: BoundaryRole.SIDE,
  rear: BoundaryRole.REAR,
};

/**
 * The named rule that produced a proposal.
 *
 * Carried so a reviewer can argue with the *rule* rather than with the answer.
 * "FRONT_FACE_IS_ROAD is wrong on a plot whose front gives onto a sikka" is a
 * conversation; "the classification is wrong" is not.
 */
export const ProposalRule = {
  /** The schedule names a front face, and a front face gives onto the street. */
  FRONT_FACE_IS_ROAD: 'FRONT_FACE_IS_ROAD',
  /** The front clause contains the sheet's own word for a street. */
  STREET_WORDING: 'STREET_WORDING',
  /** A side or rear clause says, verbatim, what it is set back from. */
  ADJACENT_PLOT_WORDING: 'ADJACENT_PLOT_WORDING',
  /** A road name is printed on the sheet, so a road abuts the plot somewhere. */
  ROAD_LABEL_ON_SHEET: 'ROAD_LABEL_ON_SHEET',
} as const;
export type ProposalRule = (typeof ProposalRule)[keyof typeof ProposalRule];

/**
 * Where on the sheet a reading came from — enough to open the PDF at it.
 *
 * `bbox` is PDF user space, origin bottom-left, exactly as `Citation.sourceBbox`
 * carries it. The three real sheets are **A3 landscape** (1190.551 × 841.89 pt),
 * not A4, so a box is checked against the page's own declared size and never
 * against an assumed paper.
 */
export interface EdgeEvidence {
  /** The sheet's words, whitespace-collapsed. Never paraphrased. */
  readonly verbatim: string;
  /** 1-based, matching `Citation.sourcePage`. */
  readonly page: number;
  readonly bbox: readonly [number, number, number, number];
  /** The face label or road token as the sheet wrote it: "Front", "adjacent plot". */
  readonly label: string;
  /** Which mass's schedule the clause belongs to; absent for a road name. */
  readonly mass?: SetbackMass;
}

/**
 * One boundary role, and the classification the sheet supports for it.
 *
 * There is no `roadHierarchy` field and that is not an oversight — see finding 4
 * in the module note. A rank the sheet does not print would have to be invented,
 * and the gap is reported in `EdgeReadings.missing` instead.
 */
export interface EdgeProposal {
  readonly role: BoundaryRole;
  /** `ASSUMED`, always. The module note carries the argument. */
  readonly classification: Traced<EdgeClassification>;
  /** Every rule that contributed, in the order they were applied. */
  readonly basedOn: readonly ProposalRule[];
  /** Each phrase the proposal rests on, with its page and box. */
  readonly evidence: readonly EdgeEvidence[];
  /**
   * What moves if the reader answers differently.
   *
   * NOT THE ASSUMPTION REGISTER'S SHAPE, and the field is named `effect` rather
   * than `relativeEffect` to keep it from being mistaken for it. The register's
   * `relativeEffect` is a `DecimalString`: `packages/report/src/json.ts` reads it
   * through `readDecimal`, `apps/api/src/report.ts` multiplies it by 100 to print
   * a percentage, and `packages/capacity/src/pipeline.ts` ranks assumptions by
   * `Number()` of it. A paragraph in that field throws in the first, prints `NaN%`
   * in the second and sorts last in the third — and this comment used to claim
   * the opposite, that an accepted proposal "needs no new type downstream", which
   * is the invitation to wire a sentence into a decimal.
   *
   * The magnitude is honestly absent and says so: a classification selects which
   * setback parameter governs the boundary, the distances those parameters
   * resolve to live in `@envelope/rules`, and this package depends on
   * `@envelope/core` ONLY — by manifest, not by convention. Measuring it here
   * would mean importing the rule store into a PDF reader. Whoever accepts a
   * proposal into a run measures it there, where both distances are in hand.
   */
  readonly sensitivity: {
    readonly perturbation: string;
    /** Prose. A sentence, deliberately not a number — see above. */
    readonly effect: string;
  };
}

/**
 * Everything one sheet says about its boundaries, and everything it does not.
 *
 * JSON-SAFE BY CONSTRUCTION. No `Decimal` anywhere in this tree, so the object
 * the API passes to the screen in process is byte-for-byte the object it sends
 * over HTTP. `apps/api/src/intake-route.ts` carries the scar that made this
 * worth stating: a `Decimal` only becomes the string its wire type declares when
 * something serialises it, and a screen handed the unserialised value throws on
 * a field whose type says `string`. A setback distance is quoted here only as
 * part of `EdgeEvidence.verbatim`, in the sheet's own words.
 */
export interface EdgeReadings {
  /** One per role the sheet supports an answer for. Empty when it supports none. */
  readonly proposals: readonly EdgeProposal[];
  /**
   * Every boundary question the form asks that this sheet does not answer, in
   * this module's own words.
   *
   * Kept here rather than pushed into `AffectionPlanFacts.missing`: that list is
   * the sheet's missing *limits*, it is what `blockingGaps` filters, and three
   * extra rows in it would change a count the reader has already been shown.
   */
  readonly missing: readonly MissingField[];
  /** Road names printed on the sheet. Empty on all three samples — see finding 1. */
  readonly roadLabels: readonly EdgeEvidence[];
  /**
   * The sheet's own `Access Side` cell, when a sheet fills it.
   *
   * `ASSUMED`, not `DERIVED`: the cell names a side of the plot in the issuer's
   * shorthand, and reading "NORTH" as "boundary 2" is still an inference about
   * which boundary that is. Absent on all three samples.
   */
  readonly accessSide?: Traced<string>;
}

// ---------------------------------------------------------------------------
// Reading what the sheet prints
// ---------------------------------------------------------------------------

/*
  A ROAD NAME STARTS WITH A CAPITAL AND IS SHORT, and both halves of that rule
  were written against a real false positive rather than imagined.

  `Plot DJAZ1MED12RES011-178.pdf` prints its Master Community Declaration in full
  on the face of the sheet, and clause 2(a) reads:

    "The roads, turns, crossroad, corridors, pavement edges, drainage sewers,
     island separating the road, arch bridges and drainage systems and their
     relevant parts."

  A case-insensitive search for `\broad\b` hits "road," inside that sentence — on
  the one sheet of the three that prints no setback schedule at all, so the only
  boundary evidence the engine would have held for that plot would have come from
  a paragraph about who owns the infrastructure. A road name on an affection plan
  is set in capitals inside the drawing ("AL KHAIL ROAD", "ROAD 621") or at worst
  in title case; running prose is not. So the token must begin with a capital —
  that initial is the discriminator, not the length — and the item carrying it
  must ALSO be short enough to be a label rather than a sentence, because a
  sentence can begin with "Roads".

  `RD` and `ST` are admitted only beside a number, which is how Dubai numbers its
  streets. Bare, they collide with initials and with the "ST" inside a plot code
  like `IC1-CTYL-16_011`, and a missed road name costs a reported gap while a
  false one costs a wrong classification on a field that has no default.

  AND THE NUMBER MUST NOT BE GLUED TO THE LETTERS, which is the whole of the
  second alternative's separator and the defect it was written without. `\d+\s*ST`
  matches an ENGLISH ORDINAL — `1ST FLOOR PLAN`, `3RD FLOOR`, `23RD`, `31ST` —
  and a drawing index is set in capitals under forty characters, so every one of
  those passed the label test too. On a sheet with no setback schedule the
  resulting FRONT ⇒ ROAD proposal would have rested entirely on the words "1ST
  FLOOR PLAN": a classification with evidence a reviewer opens the PDF to find
  is about something else. Requiring a space is enough, because an ordinal suffix
  is always set tight against its digits and a drawn road number never is ("ROAD
  621", "RD. 621", "621 RD"). `RD` and `ST` keep their `\b` on the left, so the
  first alternative cannot reach the `ST` of "1ST" — a digit-to-letter join is
  not a word boundary — and `23RD` is refused by the same separator as `31ST`.
*/
const ROAD_WORD = /\b(?:ROAD|STREET|SIKKA|Road|Street|Sikka)\b/;
const ROAD_NUMBERED = /\b(?:RD|ST)\.?\s*\d+|\d+\s+(?:RD|ST)\b/;
/** Arabic: street, road, sikka. The Arabic column of a bilingual sheet. */
const ROAD_WORD_AR = /شارع|طريق|سكة/;
/** Longer than any label in the drawing and shorter than any clause of prose. */
const MAX_LABEL_CHARS = 40;

/** The road names printed anywhere on the sheet, each with its own box. */
export function findRoadLabels(page: PdfPageText): readonly EdgeEvidence[] {
  const out: EdgeEvidence[] = [];
  for (const line of pageLines(page)) {
    const text = line.text.trim();
    if (text.length > MAX_LABEL_CHARS) continue;
    const hit =
      ROAD_WORD.exec(text)?.[0] ??
      ROAD_NUMBERED.exec(text)?.[0] ??
      ROAD_WORD_AR.exec(text)?.[0];
    if (hit === undefined) continue;
    out.push({ verbatim: text, page: line.page, bbox: line.bbox, label: hit });
  }
  return out;
}

/**
 * The value cell belonging to a form label, by the column the label sits in.
 *
 * NOT `valueLeftOf`, and the difference is the whole function. `valueLeftOf`
 * anchors on `locate`, whose multi-item fallback joins runs in *content-stream*
 * order — and for `Access Side` on all three sheets that returns a box 66 pt tall
 * spanning x 805→1112 over "TIRVULOIU ÐōÀ POSSESSOR … Access Side". Searching
 * left of that anchor then lands on the Arabic indemnity paragraph at the foot of
 * the sheet, and `valueLeftOf(page, 'Access Side')` really does come back holding
 * mojibake. A cell read that way would be correct by luck at best, and the test
 * beside this pins that difference by name rather than trusting it.
 *
 * So the geometry comes from `pageLines`, and the rule is the form's own
 * structure rather than a direction. **The value is not reliably below its
 * label.** These strips are trilingual-stacked: on `IC1-CTYL-16_011` the Arabic
 * label sits at y 83, the value at y 79 and the English label at y 71, so the
 * value is *above* the label the caller names. What does discriminate is the
 * column: the sheets are laid out right-to-left, and a field's value lies
 * between its own label's right edge and the right edge of the label to its
 * left. On `IC1-CTYL-16_011` that puts the `Access Side` window at x 832→972,
 * leaves "NTS" at x 763→776 inside `Scale`'s window where it belongs, and finds
 * nothing at all inside Access Side's — which is the honest reading, because the
 * cell is empty.
 *
 * Both adjacent rows are searched and nothing further, because a strip has one
 * value row per label row and anything two rows away belongs to another field.
 * A candidate wider than its own column is refused rather than trimmed: erring
 * toward "not printed" costs a reported gap, and erring the other way puts a
 * frontage on a boundary nobody chose.
 */
export function cellUnderLabel(page: PdfPageText, label: string): TextItem | undefined {
  const rows = groupRows(pageLines(page));
  const rowIndex = rows.findIndex((r) => r.some((l) => l.text.includes(label)));
  const row = rows[rowIndex];
  const anchor = row?.find((l) => l.text.includes(label));
  if (!row || !anchor) return undefined;

  /*
    THE LABEL MUST OWN ITS COLUMN, or the window is not this field's.

    `splitColumns` separates columns at four line-heights of whitespace, and a
    sheet typeset a little tighter would hand back one segment reading "Scale
    Access Side". Its right edge is then Access Side's and its LEFT wall is
    Total Area's, so the window swallows Scale's column — and `NTS` would be
    reported as the access side of the plot. There is no way to tell that
    reading from a correct one afterwards, so it is refused in front: the label
    must end the segment, and what precedes it must carry no Latin letters.

    An Arabic label sharing the column is admitted deliberately. These strips
    stack the Arabic label above the English one, `groupRows` may keep them
    together, and the Arabic extracts as Latin Extended-A — outside `A-Za-z` —
    so the test passes a bilingual column and fails a doubled English one.
  */
  const before = anchor.text.slice(0, anchor.text.lastIndexOf(label));
  if (!anchor.text.trimEnd().endsWith(label) || /[A-Za-z]/.test(before)) return undefined;

  const leftWall = Math.max(
    Number.NEGATIVE_INFINITY,
    ...row.filter((l) => l.bbox[2] < anchor.bbox[2] - 1).map((l) => l.bbox[2]),
  );

  for (const neighbour of [rows[rowIndex - 1], rows[rowIndex + 1]]) {
    for (const line of neighbour ?? []) {
      if (line.bbox[0] <= leftWall || line.bbox[2] > anchor.bbox[2] + 1) continue;
      const text = line.text.trim();
      if (!isReadableCell(text)) continue;
      return { text, page: line.page, bbox: line.bbox };
    }
  }
  return undefined;
}

/**
 * Regroup `pageLines`' column segments back into rows.
 *
 * `pageLines` flattens rows into segments and its own baseline tolerance is 5 pt,
 * which merges the value row and the Arabic label row above it on
 * `DJAZ1MED12RES011` (y 79 and y 83). A tighter tolerance here keeps them apart,
 * which is what makes "the adjacent row" mean one thing. Same idiom as
 * `pageLines`: compare against the row's first member, not its last, so a long
 * row cannot drift a baseline at a time.
 */
function groupRows(lines: readonly TextItem[]): readonly (readonly TextItem[])[] {
  const rows: TextItem[][] = [];
  for (const line of lines) {
    const current = rows.at(-1);
    const first = current?.[0];
    if (current && first && Math.abs(first.bbox[1] - line.bbox[1]) <= 3) current.push(line);
    else rows.push([line]);
  }
  return rows;
}

/*
  A CELL IS EITHER LATIN OR ARABIC, NEVER BOTH, AND NEVER MOJIBAKE.

  The Arabic panels on these sheets are typeset in an embedded font with no
  usable ToUnicode map, so they extract as runs like `تĢĽěñġĝا` — genuine Arabic
  codepoints interleaved with Latin Extended-A. Requiring a cell to be *wholly*
  one script or the other rejects every such run while admitting both a real
  "NORTH" and a real «شمال». `pdf-text.ts` already fights the same font in
  `splitColumns`; this is the same adversary at a different boundary.
*/
/*
  Written as escapes, not as literal glyphs, for the same reason `pdf-text.ts`
  builds its control-character class from `\u0000`: a source file about mojibake
  must not itself be a place where a copy-paste can corrupt a character class
  invisibly. `؀-ۿ` is the Arabic block, digits included.
*/
const LATIN_CELL = new RegExp('^[\\x20-\\x7E]+$');
const ARABIC_CELL = new RegExp('^[\\u0600-\\u06FF\\s.,/()-]+$');
const ANY_LETTER = new RegExp('[A-Za-z\\u0600-\\u06FF]');

function isReadableCell(text: string): boolean {
  if (text === '' || text.length > MAX_LABEL_CHARS) return false;
  if (!ANY_LETTER.test(text)) return false;
  return LATIN_CELL.test(text) || ARABIC_CELL.test(text);
}

// ---------------------------------------------------------------------------
// Deriving the proposals
// ---------------------------------------------------------------------------

/** `page 1, box [36, 274, 191, 284]` — where a reviewer should open the PDF. */
function at(e: EdgeEvidence): string {
  return `page ${e.page}, box [${e.bbox.map((n) => Math.round(n)).join(', ')}]`;
}

/**
 * The sheet's own word for a street, if the clause uses one.
 *
 * Case-insensitive here, unlike {@link ROAD_WORD}, and the asymmetry is
 * deliberate: this runs over a setback clause the parser has already isolated,
 * not over the whole sheet, so the prose of finding 1 cannot reach it. On
 * `DJAZ1TRE10RES022` it finds the lower-case "street" in "0m to street front".
 */
const STREET_IN_CLAUSE = /street|road|شارع|طريق/i;
/** What the sheet says it is set back from, when it says. */
const ADJACENT_PLOT_IN_CLAUSE = /adjacent\s+plot|neighbou?ring\s+plot|plot\s+boundary/i;
/** The face label the sheet wrote, when the sheet wrote a front. */
const NAMES_THE_FRONT = /front/i;

/**
 * The sensitivity every classification proposal carries.
 *
 * One object, because the statement is the same for all three roles and three
 * copies of a sentence drift. `effect` names what is unmeasured and why rather
 * than reporting `null`: `core.ts` sets the precedent — "we moved it and the
 * answer did not change" is an answer and `null` is not — and the honest version
 * here is that the magnitude exists, belongs to the run, and cannot be reached
 * from a package whose only dependency is `@envelope/core`. It is a sentence and
 * the field name says so; see {@link EdgeProposal.sensitivity} for why the
 * register's own field may not hold one.
 */
const CLASSIFICATION_SENSITIVITY = {
  perturbation:
    'the reader classifies this boundary as one of the other three types — ' +
    'ROAD, ADJACENT_PLOT, OPEN_SPACE or OTHER',
  effect:
    'Not measured on this sheet. The classification selects which setback parameter ' +
    'governs the boundary — setback.road, setback.adjacent_plot, setback.open_space or ' +
    'setback.other — so the effect is the difference between two of those distances ' +
    'applied along this boundary, and it changes the footprint and therefore the level ' +
    'count. Those distances are held in the rule store, which this reader does not and ' +
    'must not depend on; the run reports the measured swing once a classification is set.',
} as const;

interface ProposalDraft {
  readonly role: BoundaryRole;
  readonly classification: EdgeClassification;
  readonly rules: readonly ProposalRule[];
  readonly evidence: readonly EdgeEvidence[];
  readonly reason: string;
}

/** The clause that named a face, as evidence, with the box its line occupies. */
function clauseEvidence(
  page: PdfPageText,
  lines: readonly TextItem[],
  mass: MassSetbackClauses,
  clause: FaceClause,
): EdgeEvidence {
  /*
    The line box from `pageLines`, not from `locate`: the setback clause is a
    segment of a baseline that `splitColumns` has already separated from the
    QR-validation panel beside it, which is the only box that is actually the
    clause. See `cellUnderLabel` for what `locate` returns instead.

    THE MASS'S WHOLE LINE IS MATCHED FIRST, and searching for the clause first
    was wrong on a real sheet. `DJAZ1TRE10RES022` prints

      GF/ Podium: 0m to street front, Side and rear setback is 0m to solid wall…
      Tower: 0m to street front, 6m to adjacent plot

    and the clause "0m to street front" occurs in BOTH. Matching on it returned
    the podium's box for the tower's clause: a proposal attributed to the tower
    schedule, quoting the podium line, citing a box one row away. It was the
    right classification with the wrong evidence, which is the failure mode this
    whole module is arranged against. `mass.line` carries the "Tower:" prefix
    and is unique; the clause stays the fallback for a line the column split has
    reflowed since. Quoting one line too much is a reviewer reading one sentence
    too many; quoting the wrong box is a reviewer opening the wrong part of a PDF.
  */
  const box =
    lines.find((l) => l.text.includes(mass.line.trim())) ??
    lines.find((l) => l.text.includes(clause.clause.trim()));
  return {
    verbatim: (box?.text ?? mass.line).replace(/\s+/g, ' ').trim(),
    page: box?.page ?? page.page,
    bbox: box?.bbox ?? [0, 0, 0, 0],
    label: clause.label,
    mass: mass.mass,
  };
}

/**
 * Draft one proposal per role from the schedule's clauses and the sheet's labels.
 *
 * Evidence accumulates across both masses. A podium clause and a tower clause
 * that name the same face are two readings of the same boundary — the distances
 * differ, what lies beyond it does not — so both are quoted and neither is
 * preferred. The *first* rule that fires fixes the classification; a later
 * clause can add evidence to it but cannot change it, because two clauses that
 * disagreed about what abuts a face would be a finding about the document and
 * not a tie to break silently.
 */
function draftProposals(
  page: PdfPageText,
  lines: readonly TextItem[],
  clauses: readonly MassSetbackClauses[],
  roadLabels: readonly EdgeEvidence[],
): readonly ProposalDraft[] {
  const drafts = new Map<BoundaryRole, ProposalDraft>();

  const add = (draft: ProposalDraft): void => {
    const existing = drafts.get(draft.role);
    if (!existing) {
      drafts.set(draft.role, draft);
      return;
    }
    if (existing.classification !== draft.classification) return;
    drafts.set(draft.role, {
      ...existing,
      rules: [...new Set([...existing.rules, ...draft.rules])],
      evidence: [...existing.evidence, ...draft.evidence],
    });
  };

  for (const mass of clauses) {
    for (const clause of mass.faces) {
      const e = clauseEvidence(page, lines, mass, clause);
      const role = ROLE_OF_FACE[clause.face];

      /*
        THE FRONT RULE NEEDS THE SHEET TO HAVE WRITTEN "FRONT", not merely to
        have set a distance that reaches the front face. "0m from all sides"
        states one distance for every face and names none of them, so there is no
        front *label* in it — and the front inference has two links, "the sheet
        names a front face" and "a front face is the road frontage". With the
        first link missing the second is a guess with a citation attached.
        `parseFaceClauses` labels an all-sides clause "all sides" for exactly
        this gate; a sheet that prints only that gets a reported gap instead.

        THE GATE BELONGS TO THE CLAUSE, NOT TO ONE BRANCH — which is how it was
        written and the defect it left. It guarded the ROAD branch alone, so
        `Tower: 0m from all sides to adjacent plot` walked past it into the
        wording branch below and classified the FRONT as ADJACENT_PLOT: the same
        clause ruled too vague to name the front as a road was precise enough to
        put a neighbour on it. And that direction is the costlier one. A courtyard
        typology prints exactly that sentence — `IC1-CTYL-16_011` is the family —
        where "to adjacent plot" is the draftsman's shorthand for the party-wall
        condition on the faces that abut neighbours; it does not deny the plot its
        frontage, and a plot with no frontage has no vehicle access at all, so
        B.7.2.1 would then be answered against a boundary nobody stated.

        So: an all-sides clause classifies the SIDE and REAR roles, whose
        condition it does state, and the FRONT role not at all. `continue` rather
        than a per-branch condition, because the next rule added here would
        otherwise have to remember to carry the gate too.
      */
      if (role === BoundaryRole.FRONT && !NAMES_THE_FRONT.test(clause.label)) continue;

      /*
        AND THE SHEET'S OWN WORDS OUTRANK THE CONVENTION — which is what the
        branch below got backwards.

        The front rule has two links: "the sheet names a front face", and "a
        front face is the road frontage". The second is a DRAFTING CONVENTION,
        true of Dubai sheets in general and not a statement about this plot. So a
        clause that says, in words, what the face abuts settles it, and the
        convention only answers where the words are silent.

        Reversed, the failure is the worst shape available here. `Tower: Front
        setback 6m to neighbouring plot, Sides 3m` fired this branch on the label
        alone, proposed ROAD, and quoted that very sentence as its support: the
        evidence a reviewer opens the PDF to read says the opposite of the
        classification attached to it. That is "the right classification, wrong
        evidence" failure the module header is arranged against, arriving as the
        wrong classification with the evidence that disproves it — and applied on
        step 1 it resolves `setback.road` where `setback.adjacent_plot` governs,
        under a reader's own name.
      */
      if (role === BoundaryRole.FRONT && !ADJACENT_PLOT_IN_CLAUSE.test(clause.clause)) {
        const street = STREET_IN_CLAUSE.test(clause.clause);
        add({
          role,
          classification: EdgeClassification.ROAD,
          rules: street
            ? [ProposalRule.FRONT_FACE_IS_ROAD, ProposalRule.STREET_WORDING]
            : [ProposalRule.FRONT_FACE_IS_ROAD],
          evidence: [e],
          reason: street
            ? `the sheet sets this face back from the street in its own words — ` +
              `“${e.verbatim}” at ${at(e)}`
            : `the sheet names a front face — “${e.verbatim}” at ${at(e)} — and on a ` +
              `Dubai affection plan the front face is the road frontage: it is the face ` +
              `the setback is measured from the street`,
        });
        continue;
      }

      // A SIDE OR REAR DISTANCE IS NOT A CLASSIFICATION, and this is the
      // failure mode worth naming. `IC1-CTYL-16_011` prints "Sides & Rear = 3m"
      // and never says what is 3 m away: a plot, a sikka, a landscaped strip
      // and a second carriageway all take a side setback. Reading 3 m as
      // ADJACENT_PLOT would put a neighbour on a boundary the sheet left open.
      // So a side or rear proposal needs the clause to say what it abuts.
      if (ADJACENT_PLOT_IN_CLAUSE.test(clause.clause)) {
        add({
          role,
          classification: EdgeClassification.ADJACENT_PLOT,
          rules: [ProposalRule.ADJACENT_PLOT_WORDING],
          evidence: [e],
          reason:
            `the sheet says what this face is set back from — “${e.verbatim}” at ` +
            `${at(e)}`,
        });
        continue;
      }
      // The same evidence test the other way: a side that the sheet itself sets
      // back from a street is a road boundary on the sheet's own wording, and
      // refusing to say so because of where the words sit would be reading the
      // layout instead of the sentence. A corner plot is the ordinary case.
      if (STREET_IN_CLAUSE.test(clause.clause)) {
        add({
          role,
          classification: EdgeClassification.ROAD,
          rules: [ProposalRule.STREET_WORDING],
          evidence: [e],
          reason:
            `the sheet sets this face back from the street in its own words — ` +
            `“${e.verbatim}” at ${at(e)}`,
        });
      }
    }
  }

  // A road name anywhere on the sheet means a road abuts the plot somewhere, and
  // the front is where a sheet puts it. It supports the FRONT role only — it
  // says nothing about which boundary, and nothing at all about the other two.
  // Every name found is evidence: a corner plot names two, and dropping the
  // second would hide the fact that the reader has two frontages to place.
  const first = roadLabels[0];
  if (first) {
    add({
      role: BoundaryRole.FRONT,
      classification: EdgeClassification.ROAD,
      rules: [ProposalRule.ROAD_LABEL_ON_SHEET],
      evidence: roadLabels,
      reason:
        roadLabels.length === 1
          ? `a road is named on the sheet — “${first.verbatim}” at ${at(first)}`
          : `${roadLabels.length} roads are named on the sheet — ` +
            roadLabels.map((l) => `“${l.verbatim}” at ${at(l)}`).join('; '),
    });
  }

  return [...drafts.values()].sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role),
  );
}

const ROLE_ORDER: readonly BoundaryRole[] = [
  BoundaryRole.FRONT,
  BoundaryRole.SIDE,
  BoundaryRole.REAR,
];

// ---------------------------------------------------------------------------
// The gaps
// ---------------------------------------------------------------------------

/** The label a reader sees for a role, in the report and on screen. */
const ROLE_LABEL: Readonly<Record<BoundaryRole, string>> = {
  [BoundaryRole.FRONT]: 'Front boundary',
  [BoundaryRole.SIDE]: 'Side boundary',
  [BoundaryRole.REAR]: 'Rear boundary',
};

/**
 * Why a role with no proposal has none — one sentence per cause, because
 * "not found" is the message that sends a reader back to the PDF to look for
 * something that was never there.
 */
function roleGap(
  role: BoundaryRole,
  namedByTheSchedule: boolean,
  roadNamed: boolean,
): MissingField {
  /*
    THE SECOND CLAUSE IS CONDITIONAL BECAUSE IT IS A CLAIM ABOUT THIS SHEET.
    "No road is named on the drawing" is true of all three samples and would be
    false on a sheet that labels one — where a side face still gets this gap,
    because a road name says a road abuts the plot somewhere and nothing about
    which boundary. A sentence that is usually true is the shape of copy a
    reader learns to skip.
  */
  const noFace = roadNamed
    ? 'This sheet names no such face. Its setback schedule is absent or silent on it, ' +
      'and the road it names says a road abuts the plot without saying which boundary ' +
      'does, so nothing printed here identifies what this boundary gives onto.'
    : 'This sheet names no such face. Its setback schedule is absent or silent on it, ' +
      'and no road is named on the drawing, so nothing printed here identifies what ' +
      'this boundary gives onto.';
  return {
    field: `boundary.${role.toLowerCase()}`,
    label: ROLE_LABEL[role],
    consequence: namedByTheSchedule
      ? 'The sheet sets a distance for this face and never says what is on the other ' +
        'side of it. A distance is not a classification — the neighbour could be a plot, ' +
        'an open space or a second road, and each resolves a different setback — so no ' +
        'type is proposed. Classify this boundary yourself.'
      : `${noFace} Classify it from the regulation that governs the plot.`,
  };
}

const ROAD_HIERARCHY_GAP: MissingField = {
  field: 'boundary.road_hierarchy',
  label: 'Road hierarchy',
  consequence:
    'No affection plan ranks a road. This sheet prints no road name, no road number ' +
    'and no carriageway width, and the setback table is keyed on the rank — arterial, ' +
    'collector, local or access. Take it from the master plan or the DCR; it is not ' +
    'inferred here, and Dubai Building Code B.7.2.1 reads the same rank when it ' +
    'recommends which boundary the vehicle access goes on.',
};

/*
  THE MOST USEFUL THING THIS MODULE REPORTS. Every Trakhees site plan carries an
  `Access Side` field, and on all three real sheets the cell beside it is blank.
  That is the field which would say which boundary the frontage is, so a reader
  asked to mark it is being asked for something the instrument does not contain —
  and saying so is a better answer than a dropdown with four options and no hint.

  It claims nothing about the drawing. A sheet that labels a road in its drawing
  panel would make "the drawing carries no text" false, and a sentence that is
  usually true is a sentence a reader learns to skip.
*/
const ACCESS_SIDE_GAP: MissingField = {
  field: 'boundary.access_side',
  label: 'Access side',
  consequence:
    'The sheet has a box for this and the box is empty, so the issuer did not say ' +
    'which boundary the access is on. Mark the frontage yourself — nothing here ' +
    'infers it, and Dubai Building Code B.7.2.1 reads it when it recommends which ' +
    'boundary the vehicle access goes on.',
};

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export interface ReadBoundariesOptions {
  readonly documentUri: string;
  /** The sheet's issue date, which is what "which affection plan" means. */
  readonly issueDate: string;
  readonly tracer: Tracer;
  /** The setback schedule split face by face, or none when the sheet prints none. */
  readonly clauses: readonly MassSetbackClauses[];
}

/**
 * Read one sheet's boundaries into proposals and named gaps.
 *
 * Total, like `readFacts`: a sheet that supports nothing yields empty proposals
 * and a gap per role, which is an actionable answer where an exception is a
 * crash. `DJAZ1MED12RES011` — the sheet that omits its own limits — takes that
 * path in full and comes back with five gaps and no proposal, which is the
 * correct reading of a sheet that defers its setbacks to another instrument.
 */
export function readBoundaries(page: PdfPageText, opts: ReadBoundariesOptions): EdgeReadings {
  const { tracer, clauses } = opts;
  // Once per sheet. `pageLines` rebuilds every row from every item, and the
  // clause search below asks for a box per face across two masses.
  const lines = pageLines(page);
  const roadLabels = findRoadLabels(page);
  const drafts = draftProposals(page, lines, clauses, roadLabels);
  const missing: MissingField[] = [];

  const proposals = drafts.map((d): EdgeProposal => {
    const first = d.evidence[0];
    /*
      THE BASIS NAMES THE FACE LABEL AND THE BOX, in that order, because those
      are the two things a reviewer needs to disagree with it: the words the
      sheet used, and where to open the PDF to read them. A basis that said only
      "the front face is the road frontage" would be a rule with no evidence
      attached, which is the shape of an assumption nobody can argue with.
    */
    const basis =
      `Proposed, not read. The sheet labels this face “${first?.label ?? 'unlabelled'}”, ` +
      `and ${d.reason}. The sheet states a setback for a face; it does not classify a ` +
      `boundary, so this is an inference from its own wording and is ASSUMED rather than ` +
      `DERIVED. It also does not say which boundary of this plot holds the ` +
      `${d.role.toLowerCase()} role — confirm that before accepting it.`;
    return {
      role: d.role,
      classification: tracer.assumed(
        `affection_plan.boundary_${d.role.toLowerCase()}_classification`,
        d.classification,
        {
          basis,
          label: `${ROLE_LABEL[d.role]} type`,
          detail: {
            rules: d.rules,
            // The quoted phrases and their boxes, so the provenance tree can
            // link straight at the sheet rather than describing it.
            evidence: d.evidence.map((e) => ({
              verbatim: e.verbatim,
              page: e.page,
              bbox: e.bbox,
              label: e.label,
              ...(e.mass === undefined ? {} : { mass: e.mass }),
            })),
            ...(first === undefined ? {} : { citedAt: at(first) }),
          },
        },
      ),
      basedOn: d.rules,
      evidence: d.evidence,
      sensitivity: CLASSIFICATION_SENSITIVITY,
    };
  });

  const answered = new Set(proposals.map((p) => p.role));
  const namedFaces = new Set(clauses.flatMap((m) => m.faces.map((f) => ROLE_OF_FACE[f.face])));
  for (const role of ROLE_ORDER) {
    if (!answered.has(role)) {
      missing.push(roleGap(role, namedFaces.has(role), roadLabels.length > 0));
    }
  }

  // Reported on every sheet, whether or not a ROAD proposal was made: the form
  // asks for the rank the moment a reader classifies any boundary as a road, and
  // a gap that appears only after an answer is a gap nobody planned around.
  missing.push(ROAD_HIERARCHY_GAP);

  const cell = cellUnderLabel(page, 'Access Side');
  const accessCell: EdgeEvidence | undefined =
    cell === undefined
      ? undefined
      : { verbatim: cell.text, page: cell.page, bbox: cell.bbox, label: 'Access Side' };
  const accessSide =
    accessCell === undefined
      ? undefined
      : tracer.assumed('affection_plan.access_side', accessCell.verbatim, {
          basis:
            `The sheet's own “Access Side” cell reads “${accessCell.verbatim}” at ` +
            `${at(accessCell)}. It names a side of the plot in the issuer's shorthand and ` +
            `not a boundary of the ring entered here, so which boundary it means is still ` +
            `an inference — ASSUMED, and for the reader to confirm against the drawing.`,
          label: 'Access side, as printed',
          detail: { page: accessCell.page, bbox: accessCell.bbox, verbatim: accessCell.verbatim },
        });
  if (accessSide === undefined) missing.push(ACCESS_SIDE_GAP);

  return {
    proposals,
    missing,
    roadLabels,
    ...(accessSide === undefined ? {} : { accessSide }),
  };
}

/**
 * A citation pointing at the box a boundary reading came from.
 *
 * Exported for the composition root rather than used here: a proposal is
 * `ASSUMED` and `tracer.assumed` takes a basis, not a citation — that asymmetry
 * is the type system refusing to let an assumption carry the evidence of a
 * derivation. When a reader *accepts* a proposal the value becomes `USER_SET` by
 * them, and this is the citation to file beside it so the sheet they were looking
 * at is on the record.
 */
export function citeBoundary(
  opts: ReadBoundariesOptions,
  role: BoundaryRole,
  evidence: EdgeEvidence,
): Citation {
  return {
    instrumentId: 'AFFECTION_PLAN',
    instrumentVersion: opts.issueDate,
    clauseReference: `boundary.${role.toLowerCase()}`,
    documentUri: opts.documentUri,
    sourcePage: evidence.page,
    sourceBbox: [evidence.bbox[0], evidence.bbox[1], evidence.bbox[2], evidence.bbox[3]],
    sourceTextVerbatim: evidence.verbatim,
  };
}
