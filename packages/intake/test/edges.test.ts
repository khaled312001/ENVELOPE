/**
 * Boundary readings, tested by their failure modes.
 *
 * A happy-path test here would be nearly worthless. The bridge from the sheet's
 * faces to the form's edges is useful exactly to the extent that it refuses to
 * answer what the sheet does not say, so what is asserted below is mostly what
 * does *not* come back:
 *
 *   - a sheet with no road label produces no road proposal, even when the word
 *     "road" appears three times in its boilerplate;
 *   - a front face stays a road and never becomes an adjacent plot;
 *   - a side setback distance produces no classification at all;
 *   - "0m from all sides" names no face and therefore no frontage;
 *   - a road hierarchy is never proposed, on any sheet, ever;
 *   - the `Access Side` cell is read by column and not by `valueLeftOf`, which
 *     really does come back holding mojibake.
 *
 * The three real sheets drive it, as in `affection-plan.test.ts`, and for the
 * same reason: a synthesised affection plan would be the parser agreeing with
 * itself. Where a sheet nobody has on file is needed — a filled `Access Side`
 * box, a road name in the drawing — it is built item by item and said to be.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import {
  EdgeClassification,
  EdgeKind,
  NodeKind,
  ProvenanceClass,
  ProvenanceGraph,
  Tracer,
} from '@envelope/core';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  BoundaryRole,
  cellUnderLabel,
  citeBoundary,
  findRoadLabels,
  ProposalRule,
  readBoundaries,
  type EdgeProposal,
} from '../src/edges.js';
import {
  parseAffectionPlan,
  parseFaceClauses,
  parseSetbackFace,
  setbackClauses,
  type AffectionPlanFacts,
} from '../src/affection-plan.js';
import { locate, readPdfText, valueLeftOf, type PdfPageText } from '../src/pdf-text.js';

/** As in `affection-plan.test.ts`: three real PDFs on a loaded machine. */
const HOOK_TIMEOUT_MS = 60_000;

const REPO = new URL('../../../', import.meta.url);

const SHEETS = {
  warsan: 'docs/00-source/samples/affection-plan/IC1-CTYL-16_011-warsan1-621.pdf',
  med12: 'docs/00-source/developer-standards/azizi/Plot DJAZ1MED12RES011-178.pdf',
  tre10: 'docs/00-source/developer-standards/azizi/Plot DJAZ1TRE10RES022-196.pdf',
} as const;

async function bytesOf(key: keyof typeof SHEETS): Promise<Uint8Array> {
  return new Uint8Array(await readFile(fileURLToPath(new URL(SHEETS[key], REPO))));
}

/**
 * The graph each parse wrote, kept so the basis can be read back out of it.
 *
 * A basis asserted against the string the module composed proves the module
 * composed a string. Asserted against the BASIS node the tracer wrote, it
 * proves the sentence reached the provenance graph, which is where every other
 * surface in the product reads it from.
 */
const GRAPHS = new WeakMap<AffectionPlanFacts, ProvenanceGraph>();

async function parse(key: keyof typeof SHEETS): Promise<AffectionPlanFacts> {
  const graph = new ProvenanceGraph();
  const facts = await parseAffectionPlan(await bytesOf(key), {
    documentUri: SHEETS[key],
    tracer: new Tracer(graph),
  });
  GRAPHS.set(facts, graph);
  return facts;
}

/** The BASIS node's label for one assumed parameter, straight off the graph. */
function basisTextFor(facts: AffectionPlanFacts, parameterId: string): string {
  const graph = GRAPHS.get(facts);
  if (!graph) throw new Error('no graph was kept for these facts');
  const assumption = graph.nodes.find(
    (n) => n.kind === NodeKind.ASSUMPTION && n.parameterId === parameterId,
  );
  if (!assumption) throw new Error(`no ASSUMPTION node for ${parameterId}`);
  const justified = graph
    .outgoing(assumption.id)
    .find((e) => e.kind === EdgeKind.JUSTIFIED_BY);
  if (!justified) throw new Error(`${parameterId} reaches no basis`);
  return graph.node(justified.to).label;
}

/** The positioned text of a real sheet, for the geometry assertions. */
async function pageOf(key: keyof typeof SHEETS): Promise<PdfPageText> {
  const [page] = await readPdfText(await bytesOf(key), { pages: [1] });
  if (!page) throw new Error(`${key} has no first page`);
  return page;
}

const proposalFor = (
  facts: AffectionPlanFacts,
  role: (typeof BoundaryRole)[keyof typeof BoundaryRole],
): EdgeProposal | undefined => facts.edges.proposals.find((p) => p.role === role);

const gapFields = (facts: AffectionPlanFacts): readonly string[] =>
  facts.edges.missing.map((m) => m.field);

// ---------------------------------------------------------------------------
// The clause split, which is what the schedule is now folded out of
// ---------------------------------------------------------------------------

describe('parseFaceClauses', () => {
  it('keeps the words that named each face, not only the distance', () => {
    const clauses = parseFaceClauses('Front = 0m, Sides & Rear = 3m');
    expect(clauses.map((c) => [c.face, c.label])).toEqual([
      ['front', 'Front'],
      ['side', 'Sides'],
      ['rear', 'Rear'],
    ]);
  });

  it('labels "all sides" as all sides and names no face', () => {
    // The gate the frontage proposal depends on. One distance for every face is
    // not a statement that there is a front, and a label of "front" here would
    // make `FRONT_FACE_IS_ROAD` fire on a sheet that never wrote the word.
    const clauses = parseFaceClauses('0m from all sides');
    expect(clauses.map((c) => c.label)).toEqual(['all sides', 'all sides', 'all sides']);
    expect(clauses.every((c) => /front/i.test(c.label))).toBe(false);
  });

  it('marks a face named only by implication as overwrite-only-if-unset', () => {
    const clauses = parseFaceClauses('0m to street front, 6m to adjacent plot');
    const implied = clauses.filter((c) => c.onlyIfUnset);
    expect(implied.map((c) => c.face)).toEqual(['side', 'rear']);
    expect(clauses.find((c) => c.face === 'front')?.onlyIfUnset).toBe(false);
  });

  it('does not let an implied face overwrite one the sheet named', () => {
    // "Side 2m" is written; "adjacent plot" implies a side too. The fold must
    // keep the written one — this is the `??=` the clause list carries as data.
    const face = parseSetbackFace('Side setback 2m, 6m to adjacent plot');
    expect(face.side?.kind).toBe('FIXED');
    if (face.side?.kind === 'FIXED') expect(face.side.metres.toString()).toBe('2');
    if (face.rear?.kind === 'FIXED') expect(face.rear.metres.toString()).toBe('6');
  });

  it('splits both masses of a schedule and keeps each line as printed', () => {
    const masses = setbackClauses(
      'GF & Podium: 0m from all sides\nTower: Front = 0m, Sides & Rear = 3m',
    );
    expect(masses.map((m) => m.mass)).toEqual(['PODIUM', 'TOWER']);
    expect(masses[1]?.line).toContain('Tower:');
  });
});

// ---------------------------------------------------------------------------
// Road labels
// ---------------------------------------------------------------------------

/*
  A SHEET NOBODY HAS ON FILE, built item by item, with explicit geometry so the
  column rules below can be exercised. One item per entry; `pageLines` rebuilds
  the rows from the boxes exactly as it does for a real sheet.
*/
function placed(items: readonly (readonly [string, number, number, number])[]): PdfPageText {
  return {
    page: 1,
    // A3 landscape, as all three real sheets are issued.
    width: 1190.551,
    height: 841.89,
    items: items.map(([text, x0, y0, x1]) => ({
      text,
      page: 1,
      bbox: [x0, y0, x1, y0 + 8] as const,
    })),
  };
}

describe('findRoadLabels', () => {
  it('does not read a road out of the Master Community Declaration', () => {
    // Verbatim from `Plot DJAZ1MED12RES011-178.pdf`, clause 2(a), which is
    // printed on the face of the sheet. A case-insensitive `\broad\b` hits
    // "road," inside it — on the one sheet of the three that prints no setback
    // schedule, so this sentence would have been the ONLY boundary evidence the
    // engine held for that plot.
    const page = placed([
      [
        'a. The roads, turns, crossroad, corridors, pavement edges, drainage sewers, island separating the road, arch bridges and drainage',
        39,
        266,
        481,
      ],
    ]);
    expect(findRoadLabels(page)).toEqual([]);
  });

  it('reads a road name set in capitals, with its own box', () => {
    const page = placed([['AL KHAIL ROAD', 300, 600, 400]]);
    const [label] = findRoadLabels(page);
    expect(label?.label).toBe('ROAD');
    expect(label?.verbatim).toBe('AL KHAIL ROAD');
    expect(label?.bbox).toEqual([300, 600, 400, 608]);
  });

  it('reads a numbered street and leaves a plot code alone', () => {
    expect(findRoadLabels(placed([['ST 18', 300, 600, 340]]))[0]?.label).toBe('ST 18');
    // `ST` bare would match the "ST" in a Trakhees plot code. It does not.
    expect(findRoadLabels(placed([['IC1-CTYL-16_011', 300, 600, 400]]))).toEqual([]);
  });

  it('refuses a lower-case road word even in a short line', () => {
    // The capital initial is the discriminator, not the length — so the guard
    // must hold on a fragment short enough to pass the length test.
    expect(findRoadLabels(placed([['road, arch bridges', 39, 266, 120]]))).toEqual([]);
    expect(findRoadLabels(placed([['Road 621', 39, 266, 80]]))[0]?.label).toBe('Road');
  });

  it('keeps every road a corner plot names, not only the first', () => {
    const page = placed([
      ['AL KHAIL ROAD', 300, 600, 400],
      ['STREET 18', 300, 560, 380],
    ]);
    expect(findRoadLabels(page).map((l) => l.verbatim)).toEqual(['AL KHAIL ROAD', 'STREET 18']);
  });

  it('reads the Arabic column of a bilingual label', () => {
    expect(findRoadLabels(placed([['شارع ١٨', 300, 600, 340]]))[0]?.label).toBe('شارع');
  });
});

// ---------------------------------------------------------------------------
// The `Access Side` cell
// ---------------------------------------------------------------------------

/**
 * The bottom strip of `IC1-CTYL-16_011`, at its real coordinates.
 *
 * Labels on one baseline, values on the one above — the layout that makes a
 * "search below the label" rule wrong on these sheets.
 */
const WARSAN_STRIP: readonly (readonly [string, number, number, number])[] = [
  ['1365.23 SQ. M.', 627, 79, 674],
  ['NTS', 763, 79, 776],
  ['Total Area', 697, 71, 730],
  ['Scale', 816, 71, 832],
  ['Access Side', 936, 71, 972],
  ['Validity', 1088, 71, 1111],
];

describe('cellUnderLabel', () => {
  it('reads the cell in the label’s own column, not the field beside it', () => {
    const page = placed([...WARSAN_STRIP, ['NORTH', 860, 79, 900]]);
    expect(cellUnderLabel(page, 'Access Side')?.text).toBe('NORTH');
    // And the neighbouring field still reads its own value, which is the test
    // that the column window is doing the work rather than proximity.
    expect(cellUnderLabel(page, 'Scale')?.text).toBe('NTS');
  });

  it('does not borrow the neighbouring field’s value for an empty cell', () => {
    // "NTS" sits 160 pt to the left of `Access Side` and inside `Scale`'s
    // column. A nearest-left search returns it; this one must not.
    expect(cellUnderLabel(placed(WARSAN_STRIP), 'Access Side')).toBeUndefined();
  });

  it('refuses to read a column the label does not own', () => {
    // A sheet typeset tightly enough that `splitColumns` keeps "Scale" and
    // "Access Side" in one segment. The window would then swallow Scale's
    // column and report "NTS" as the access side, and nothing downstream could
    // tell that from a correct reading — so it is refused in front.
    const merged = placed([
      ['1365.23 SQ. M.', 627, 79, 674],
      ['NTS', 763, 79, 776],
      ['Total Area', 697, 71, 730],
      ['Scale Access Side', 816, 71, 972],
      ['Validity', 1088, 71, 1111],
    ]);
    expect(cellUnderLabel(merged, 'Access Side')).toBeUndefined();
  });

  it('still reads a column the Arabic label shares', () => {
    // The same strips stack the Arabic label above the English one, and it
    // extracts as Latin Extended-A rather than as Latin — so a bilingual
    // column passes the guard above while a doubled English one does not.
    const bilingual = placed([
      ...WARSAN_STRIP.filter(([text]) => text !== 'Access Side'),
      ['اŚرض ĚÄÆĢ Access Side', 936, 71, 972],
      ['NORTH', 860, 79, 900],
    ]);
    expect(cellUnderLabel(bilingual, 'Access Side')?.text).toBe('NORTH');
  });

  it('refuses a mojibake run where a cell should be', () => {
    // The Arabic panels on these sheets use an embedded font with no usable
    // ToUnicode map and extract as Arabic codepoints interleaved with Latin
    // Extended-A. A cell is wholly one script or it is not a cell.
    const page = placed([...WARSAN_STRIP, ['تĢĽěñġĝا', 860, 79, 900]]);
    expect(cellUnderLabel(page, 'Access Side')).toBeUndefined();
  });

  it('is not valueLeftOf, which spans the title block once the label is split', () => {
    /*
      THE PATHOLOGY IN MINIATURE, and the reason this function exists.

      pdfjs emits one item per word, so there is no single item reading
      "Access Side" on a real sheet — `locate` falls back to joining up to
      twelve runs in CONTENT-STREAM order and returning their union box. Here
      the label is split the way the stream splits it, with an unrelated run
      before it, and the anchor `locate` returns is a box spanning both. A
      search left of that anchor is a search left of whatever happened to be
      serialised beside it.

      The real sheet is asserted too — see the `IC1-CTYL-16_011` block, where
      `valueLeftOf(page, 'Access Side')` comes back holding the Arabic
      indemnity paragraph.
    */
    const page = placed([
      ['1365.23 SQ. M.', 627, 79, 674],
      ['Total Area', 697, 71, 730],
      ['POSSESSOR', 1062, 108, 1110],
      ['Access', 936, 71, 958],
      ['Side', 960, 71, 972],
    ]);
    // The anchor is a box drawn across two rows 37 pt apart, because the run
    // serialised before the label is the one the span starts from.
    const anchor = locate(page, 'Access Side');
    expect(anchor?.text).toContain('POSSESSOR');
    expect((anchor?.bbox[3] ?? 0) - (anchor?.bbox[1] ?? 0)).toBeGreaterThan(20);
    // Whatever `valueLeftOf` then finds is not this field's cell. The real
    // sheet's answer is in the `IC1-CTYL-16_011` block; here it finds nothing
    // at all, which is a different wrong answer to the same question.
    expect(valueLeftOf(page, 'Access Side')?.text).not.toBe('NORTH');
    expect(cellUnderLabel(page, 'Access Side')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// The real sheets
// ---------------------------------------------------------------------------

describe('IC1-CTYL-16_011 — a front face, and three questions the sheet does not answer', () => {
  let facts: AffectionPlanFacts;
  let page: PdfPageText;
  beforeAll(async () => {
    facts = await parse('warsan');
    page = await pageOf('warsan');
  }, HOOK_TIMEOUT_MS);

  it('is issued on A3 landscape, which is why no box is checked against A4', () => {
    expect(Math.round(page.width)).toBe(1191);
    expect(Math.round(page.height)).toBe(842);
  });

  it('leaves its own Access Side box empty, and valueLeftOf reads the footnote', () => {
    /*
      THE REAL PATHOLOGY, pinned on the real sheet.

      `valueLeftOf(page, 'Access Side')` anchors on `locate`, whose multi-item
      fallback joins runs in content-stream order: for this label it returns a
      box 66 pt tall spanning x 805→1112 over "TIRVULOIU … POSSESSOR … Access
      Side". Searching left of that anchor lands in the Arabic indemnity
      paragraph at the foot of the sheet, which extracts as Arabic codepoints
      interleaved with Latin Extended-A. A cell read that way would have put
      mojibake in front of the reader as the access side of their plot.
    */
    const borrowed = valueLeftOf(page, 'Access Side')?.text ?? '';
    expect(borrowed).not.toBe('');
    expect(borrowed).not.toMatch(/^[\x20-\x7E]+$/);
    // The column read refuses it, and reports the empty cell as a gap instead.
    expect(cellUnderLabel(page, 'Access Side')).toBeUndefined();
  });

  it('proposes the front boundary as a road, from the sheet’s own "Front"', () => {
    const front = proposalFor(facts, BoundaryRole.FRONT);
    expect(front?.classification.value).toBe(EdgeClassification.ROAD);
    expect(front?.basedOn).toContain(ProposalRule.FRONT_FACE_IS_ROAD);
    expect(front?.evidence.some((e) => /front/i.test(e.label))).toBe(true);
  });

  it('does not let a front face become an adjacent plot', () => {
    // The inversion that would look plausible and be wrong: the tower line
    // reads "Front = 0m, Sides & Rear = 3m", and a reader of distances alone
    // might take 0 m as a shared boundary and 3 m as the street.
    //
    // ASSERTED ON THE SAMPLE *AND* ON A SHEET BUILT TO INVERT IT, below
    // ('refuses the front when the clause names a neighbouring plot'), because
    // on these three sheets this expectation cannot fail: none of them words a
    // front clause that way, so the test passed before the gate existed.
    expect(proposalFor(facts, BoundaryRole.FRONT)?.classification.value).not.toBe(
      EdgeClassification.ADJACENT_PLOT,
    );
    expect(
      facts.edges.proposals.map((p) => p.classification.value),
    ).not.toContain(EdgeClassification.ADJACENT_PLOT);
  });

  it('proposes nothing for the side and rear, because 3 m is a distance', () => {
    expect(proposalFor(facts, BoundaryRole.SIDE)).toBeUndefined();
    expect(proposalFor(facts, BoundaryRole.REAR)).toBeUndefined();
    expect(gapFields(facts)).toContain('boundary.side');
    expect(gapFields(facts)).toContain('boundary.rear');
  });

  it('says why each unanswered boundary is unanswered', () => {
    for (const gap of facts.edges.missing) {
      expect(gap.consequence.length, gap.field).toBeGreaterThan(40);
      expect(gap.label.length, gap.field).toBeGreaterThan(0);
    }
  });

  it('reports the road hierarchy and the access side as gaps', () => {
    expect(gapFields(facts)).toContain('boundary.road_hierarchy');
    expect(gapFields(facts)).toContain('boundary.access_side');
    expect(facts.edges.accessSide).toBeUndefined();
  });

  it('finds no road name, because the drawing panel holds no text at all', () => {
    expect(facts.edges.roadLabels).toEqual([]);
  });
});

describe('DJAZ1TRE10RES022 — the sheet that says what it abuts', () => {
  let facts: AffectionPlanFacts;
  beforeAll(async () => {
    facts = await parse('tre10');
  }, HOOK_TIMEOUT_MS);

  it('reads "0m to street front" as the sheet’s own word for a street', () => {
    const front = proposalFor(facts, BoundaryRole.FRONT);
    expect(front?.classification.value).toBe(EdgeClassification.ROAD);
    expect(front?.basedOn).toContain(ProposalRule.STREET_WORDING);
  });

  it('reads "6m to adjacent plot" as the side and rear classification', () => {
    for (const role of [BoundaryRole.SIDE, BoundaryRole.REAR] as const) {
      const p = proposalFor(facts, role);
      expect(p?.classification.value, role).toBe(EdgeClassification.ADJACENT_PLOT);
      expect(p?.basedOn, role).toContain(ProposalRule.ADJACENT_PLOT_WORDING);
      expect(p?.evidence.some((e) => /adjacent\s+plot/i.test(e.label)), role).toBe(true);
    }
  });

  it('answers every boundary role and still reports the rank it cannot know', () => {
    expect(facts.edges.proposals).toHaveLength(3);
    expect(gapFields(facts)).toContain('boundary.road_hierarchy');
    expect(gapFields(facts)).not.toContain('boundary.front');
  });

  it('cites each mass’s own line, not whichever one shares the clause', () => {
    /*
      PINNED, BECAUSE IT HAPPENED. This sheet prints "0m to street front" on
      BOTH its lines — "GF/ Podium: 0m to street front, Side and rear setback
      is…" and "Tower: 0m to street front, 6m to adjacent plot" — so searching
      the page for the comma-split clause returned the podium's box for the
      tower's clause. The classification was right and the evidence pointed one
      row away, which is the failure this module is arranged against: a box is
      where a reviewer opens the PDF.
    */
    const front = proposalFor(facts, BoundaryRole.FRONT);
    expect(front?.evidence).toHaveLength(2);
    const [podium, tower] = front?.evidence ?? [];
    expect(podium?.mass).toBe('PODIUM');
    expect(tower?.mass).toBe('TOWER');
    expect(tower?.verbatim.startsWith('Tower:')).toBe(true);
    expect(podium?.bbox).not.toEqual(tower?.bbox);
  });
});

describe('DJAZ1MED12RES011 — the sheet that omits its boundaries too', () => {
  let facts: AffectionPlanFacts;
  beforeAll(async () => {
    facts = await parse('med12');
  }, HOOK_TIMEOUT_MS);

  it('proposes nothing at all, because the sheet defers its setbacks', () => {
    expect(facts.edges.proposals).toEqual([]);
  });

  it('produces no road proposal although its boilerplate says "road" three times', () => {
    // The whole reason `findRoadLabels` is case-sensitive and length-limited.
    expect(facts.edges.roadLabels).toEqual([]);
    expect(facts.edges.proposals.map((p) => p.classification.value)).not.toContain(
      EdgeClassification.ROAD,
    );
  });

  it('names all five boundary questions it cannot answer', () => {
    expect([...gapFields(facts)].sort()).toEqual([
      'boundary.access_side',
      'boundary.front',
      'boundary.rear',
      'boundary.road_hierarchy',
      'boundary.side',
    ]);
  });

  it('says the schedule is silent rather than that a face was not recognised', () => {
    const front = facts.edges.missing.find((m) => m.field === 'boundary.front');
    expect(front?.consequence).toMatch(/names no such face/i);
  });
});

// ---------------------------------------------------------------------------
// Properties that must hold on every sheet
// ---------------------------------------------------------------------------

describe('every proposal, on every sheet', () => {
  const all: AffectionPlanFacts[] = [];
  beforeAll(async () => {
    for (const key of ['warsan', 'tre10', 'med12'] as const) all.push(await parse(key));
  }, HOOK_TIMEOUT_MS * 3);

  it('is ASSUMED and is not DERIVED', () => {
    // BY NAME, because this is the laundering that matters. `affection-plan.ts`
    // emits the sheet's printed figures as DERIVED against B.7.2.6.1, and a
    // boundary classification is NOT printed: the sheet states a setback for a
    // face, and that a boundary is that face and abuts a road is an inference
    // from a drafting convention. A DERIVED classification would claim a clause
    // it cannot reach.
    const proposals = all.flatMap((f) => f.edges.proposals);
    expect(proposals.length).toBeGreaterThan(0);
    for (const p of proposals) {
      expect(p.classification.provenanceClass, p.role).toBe(ProvenanceClass.ASSUMED);
      expect(p.classification.provenanceClass, p.role).not.toBe(ProvenanceClass.DERIVED);
    }
  });

  it('carries a basis naming the face label and the box it was read from', () => {
    for (const f of all) {
      for (const p of f.edges.proposals) {
        const first = p.evidence[0];
        expect(first, p.role).toBeDefined();
        expect(first?.verbatim.length, p.role).toBeGreaterThan(0);
        expect(first?.label.length, p.role).toBeGreaterThan(0);
        // The two things a reviewer needs in order to disagree with it: the
        // words the sheet used, and where to open the PDF to read them. Both
        // are asserted through the graph the tracer wrote, not through the
        // string the module composed, so a basis that stopped reaching the
        // node would fail here.
        const basis = basisTextFor(f, p.classification.parameterId);
        expect(basis, p.role).toContain(first?.label ?? '');
        expect(basis, p.role).toMatch(/box \[\s*-?\d+, -?\d+, -?\d+, -?\d+\]/);
        expect(basis, p.role).toMatch(/ASSUMED rather than DERIVED/);
      }
    }
  });

  it('offers the citation a reader’s acceptance would be filed against', () => {
    // `citeBoundary` is what turns an accepted proposal into a USER_SET value
    // with the sheet on the record. Exercised here rather than left as an
    // export nobody calls — and the box it cites is the evidence's own, never
    // a page-sized one.
    const f = all[0]!;
    const p = f.edges.proposals[0]!;
    const e = p.evidence[0]!;
    const citation = citeBoundary(
      {
        documentUri: SHEETS.warsan,
        issueDate: '22-12-2025',
        tracer: new Tracer(new ProvenanceGraph()),
        clauses: [],
      },
      p.role,
      e,
    );
    expect(citation.instrumentId).toBe('AFFECTION_PLAN');
    expect(citation.instrumentVersion).toBe('22-12-2025');
    expect(citation.clauseReference).toBe('boundary.front');
    expect(citation.sourcePage).toBe(e.page);
    expect(citation.sourceBbox).toEqual([...e.bbox]);
    expect(citation.sourceTextVerbatim).toBe(e.verbatim);
  });

  it('cites a page and a box inside the sheet, not inside an assumed A4', () => {
    // The three real sheets are A3 landscape — 1190.551 × 841.89 pt — so a box
    // checked against A4 would fail on every one of them. It is checked against
    // the page's own declared size, which is the only size that is a fact.
    for (const f of all) {
      for (const e of f.edges.proposals.flatMap((p) => p.evidence)) {
        expect(e.page).toBe(1);
        const [x0, y0, x1, y1] = e.bbox;
        expect(x0).toBeGreaterThanOrEqual(0);
        expect(y0).toBeGreaterThanOrEqual(0);
        expect(x1).toBeLessThanOrEqual(1190.551);
        expect(y1).toBeLessThanOrEqual(841.89);
        expect(x1).toBeGreaterThan(x0);
        expect(y1).toBeGreaterThan(y0);
      }
    }
  });

  it('never proposes a road hierarchy, on any sheet', () => {
    // No affection plan ranks a road, so there is no field for one to hide in.
    for (const f of all) {
      expect(JSON.stringify(f.edges)).not.toMatch(/roadHierarchy|ARTERIAL|COLLECTOR/);
      expect(gapFields(f)).toContain('boundary.road_hierarchy');
    }
  });

  it('carries a sensitivity that names what it moves', () => {
    for (const p of all.flatMap((f) => f.edges.proposals)) {
      expect(p.sensitivity.perturbation.length).toBeGreaterThan(0);
      expect(p.sensitivity.effect).toMatch(/setback\.road/);
    }
  });

  it('keeps the prose sensitivity out of the register’s decimal field', () => {
    // The register's `relativeEffect` is a DecimalString: `report/json.ts` reads
    // it with `readDecimal`, `api/report.ts` multiplies it by 100, and
    // `capacity/pipeline.ts` ranks by `Number()` of it. A sentence there throws,
    // prints NaN% and sorts last. So the field is named `effect` and the absence
    // of the other name is what is asserted — a rename back would fail here
    // before it reached a reader.
    for (const p of all.flatMap((f) => f.edges.proposals)) {
      expect(p.sensitivity).not.toHaveProperty('relativeEffect');
      expect(Number(p.sensitivity.effect)).toBeNaN();
    }
  });

  it('holds nothing a JSON round trip would change', () => {
    /*
      `apps/api/src/intake-route.ts` carries the scar: a `Decimal` only becomes
      the string its wire type declares when something serialises it, so an
      in-process object and an over-HTTP one can differ.

      WALKED, NOT ROUND-TRIPPED. The round trip this replaces asserted
      `stringify(parse(stringify(x))) === stringify(x)`, which holds for every
      JSON value there is — and for a `Decimal` especially, since decimal.js
      defines `toJSON = toString`, so the one class the test was written to catch
      would have sailed through it. What catches it is refusing any leaf that is
      not already a JSON primitive.
    */
    const offenders: string[] = [];
    const walk = (v: unknown, path: string, inArray: boolean): void => {
      if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) return;
      // `undefined` on an absent optional field is fine — `stringify` drops the
      // key and the reader's type says `?`. Inside an array it is NOT: it
      // serialises to `null`, so the wire holds an element the engine did not.
      if (v === undefined) {
        if (inArray) offenders.push(`${path} is undefined inside an array`);
        return;
      }
      if (Array.isArray(v)) {
        v.forEach((item, i) => walk(item, `${path}[${i}]`, true));
        return;
      }
      if (typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
        for (const [k, item] of Object.entries(v)) walk(item, `${path}.${k}`, false);
        return;
      }
      offenders.push(`${path} is a ${(v as object)?.constructor?.name ?? typeof v}`);
    };
    for (const f of all) walk(f.edges, 'edges', false);
    expect(offenders).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Sheets nobody has on file, each pinning one refusal
// ---------------------------------------------------------------------------

const boundariesOf = (page: PdfPageText, text: string) =>
  readBoundaries(page, {
    documentUri: 'other-project.pdf',
    issueDate: '01-01-2026',
    tracer: new Tracer(new ProvenanceGraph()),
    clauses: setbackClauses(text),
  });

describe('a sheet worded differently from the samples', () => {
  it('proposes no frontage from "0m from all sides" alone', () => {
    const line = 'GF & Podium: 0m from all sides';
    const page = placed([[line, 36, 291, 164]]);
    const edges = boundariesOf(page, line);
    expect(edges.proposals).toEqual([]);
    expect(edges.missing.map((m) => m.field)).toContain('boundary.front');
  });

  it('proposes no frontage from "all sides" even when the clause says what it abuts', () => {
    /*
      THE SAME GATE, THE OTHER WAY ROUND — and it guarded one direction only.

      An all-sides clause names no face, so it was ruled too vague to call the
      front a road. It then walked into the adjacent-plot wording rule and
      classified the front as ADJACENT_PLOT, which is the costlier error of the
      two: a courtyard typology prints exactly this sentence, "to adjacent plot"
      is the party-wall condition on the faces that have neighbours, and a plot
      with no frontage has no vehicle access for B.7.2.1 to recommend.

      The side and rear keep their classification. The clause does state their
      condition; what it does not state is which face is the front.
    */
    const line = 'Tower: 0m from all sides to adjacent plot';
    const page = placed([[line, 36, 274, 300]]);
    const edges = boundariesOf(page, line);
    expect(edges.proposals.map((p) => p.role)).not.toContain(BoundaryRole.FRONT);
    expect(edges.missing.map((m) => m.field)).toContain('boundary.front');
    const side = edges.proposals.find((p) => p.role === BoundaryRole.SIDE);
    expect(side?.classification.value).toBe(EdgeClassification.ADJACENT_PLOT);
  });

  it('refuses the front when the clause names a neighbouring plot', () => {
    // The sheet's own words outrank the drafting convention. Classified ROAD
    // from the label alone, the proposal quoted this very sentence as its
    // support — the evidence a reviewer opens the PDF to read saying the
    // opposite of the classification attached to it.
    const line = 'Tower: Front setback 6m to neighbouring plot, Sides 3m';
    const page = placed([[line, 36, 274, 300]]);
    const front = boundariesOf(page, line).proposals.find(
      (p) => p.role === BoundaryRole.FRONT,
    );
    expect(front?.classification.value).toBe(EdgeClassification.ADJACENT_PLOT);
    expect(front?.basedOn).not.toContain(ProposalRule.FRONT_FACE_IS_ROAD);
    expect(front?.basedOn).toContain(ProposalRule.ADJACENT_PLOT_WORDING);
    // And the quote under it agrees with it, which is the whole point: the
    // reviewer who opens page 1 at that box must read the classification back.
    expect(front?.evidence.some((e) => /neighbouring plot/i.test(e.verbatim))).toBe(true);
  });

  it('does not read an English ordinal as a street number', () => {
    /*
      `\d+\s*ST` matched `1ST FLOOR PLAN`, and a drawing index is set in capitals
      under forty characters, so the label test passed it too. On a sheet with no
      setback schedule the resulting FRONT ⇒ ROAD proposal rested entirely on the
      words "1ST FLOOR PLAN". Each ordinal is named rather than tested by a
      pattern, so the next person reads what was actually wrong.
    */
    for (const text of ['1ST FLOOR PLAN', '3RD FLOOR', '23RD', '31ST', '2ND FLOOR']) {
      const page = placed([[text, 300, 600, 400]]);
      expect(findRoadLabels(page)).toEqual([]);
      const edges = boundariesOf(page, 'no setback schedule on this sheet');
      expect(edges.proposals).toEqual([]);
    }
    // And a drawn road number still reads, which is what the separator costs.
    for (const text of ['ROAD 621', 'RD. 621', '621 RD', 'ST 18']) {
      const page = placed([[text, 300, 600, 400]]);
      expect(findRoadLabels(page), `${text} is a road name`).toHaveLength(1);
    }
  });

  it('proposes a road for a side the sheet sets back from a street', () => {
    // A corner plot. The evidence test is the same both ways round: a clause
    // that says what it abuts classifies its face, wherever the face sits.
    const line = 'Tower: 3m to side street, 6m to adjacent plot';
    const page = placed([[line, 36, 274, 300]]);
    const edges = boundariesOf(page, line);
    const side = edges.proposals.find((p) => p.role === BoundaryRole.SIDE);
    expect(side?.classification.value).toBe(EdgeClassification.ROAD);
    expect(side?.basedOn).toContain(ProposalRule.STREET_WORDING);
  });

  it('keeps the first classification when two clauses disagree about one face', () => {
    // A finding about the document, not a tie to break silently. The first
    // reading stands, the second adds nothing, and nothing is averaged.
    const line = 'Tower: 0m to street front, 2m to adjacent plot front';
    const page = placed([[line, 36, 274, 300]]);
    const front = boundariesOf(page, line).proposals.find(
      (p) => p.role === BoundaryRole.FRONT,
    );
    expect(front?.classification.value).toBe(EdgeClassification.ROAD);
  });

  it('proposes a frontage from a road name when the schedule is silent', () => {
    const page = placed([['AL KHAIL ROAD', 300, 600, 400]]);
    const edges = boundariesOf(page, 'no setback schedule on this sheet');
    const front = edges.proposals.find((p) => p.role === BoundaryRole.FRONT);
    expect(front?.classification.value).toBe(EdgeClassification.ROAD);
    expect(front?.basedOn).toEqual([ProposalRule.ROAD_LABEL_ON_SHEET]);
    // And it still says nothing about the other two.
    expect(edges.missing.map((m) => m.field)).toContain('boundary.side');
  });

  it('does not tell a reader no road is named when one is', () => {
    // The gap sentence is a claim about THIS sheet. On the three samples it is
    // "no road is named on the drawing"; here a road IS named, and the side
    // boundary is still unanswered for a different reason.
    const withRoad = boundariesOf(
      placed([['AL KHAIL ROAD', 300, 600, 400]]),
      'no setback schedule on this sheet',
    );
    const side = withRoad.missing.find((m) => m.field === 'boundary.side');
    expect(side?.consequence).not.toMatch(/no road is named/i);
    expect(side?.consequence).toMatch(/without saying which boundary/i);

    const withoutRoad = boundariesOf(placed([['nothing here', 300, 600, 400]]), 'no schedule');
    expect(
      withoutRoad.missing.find((m) => m.field === 'boundary.side')?.consequence,
    ).toMatch(/no road is named/i);
  });

  it('reads a filled Access Side cell as ASSUMED, never as DERIVED', () => {
    const page = placed([...WARSAN_STRIP, ['NORTH', 860, 79, 900]]);
    const edges = boundariesOf(page, 'no setback schedule on this sheet');
    expect(edges.accessSide?.value).toBe('NORTH');
    expect(edges.accessSide?.provenanceClass).toBe(ProvenanceClass.ASSUMED);
    expect(edges.missing.map((m) => m.field)).not.toContain('boundary.access_side');
  });
});

/*
  A TYPE-LEVEL ASSERTION, kept as a value so it compiles rather than as a
  comment. `EdgeProposal` must not grow a `roadHierarchy`: no affection plan
  ranks a road, and a field for one is where a default would eventually sit.
*/
type NoHierarchyField = 'roadHierarchy' extends keyof EdgeProposal ? never : true;
const NO_HIERARCHY_FIELD: NoHierarchyField = true;

describe('the shape of a proposal', () => {
  it('has no field for a rank the sheet does not print', () => {
    expect(NO_HIERARCHY_FIELD).toBe(true);
  });
});
