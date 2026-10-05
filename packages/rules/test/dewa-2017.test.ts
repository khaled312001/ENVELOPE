/**
 * DEWA 2017 Section 11, and the one defect this transcription can produce.
 *
 * ---------------------------------------------------------------------------
 * THE TEST THAT MATTERS HERE IS NOT "DOES 33 EQUAL 33".
 *
 * The tables in Section 11.4 are drawn artwork whose content stream does not
 * run in reading order. Extracted as text, the single-room table's four
 * descriptions arrive as [4-and-above, 2×, extra, 1×] and its four areas as
 * [10, 25, 55, 33]; a reader pairing them in sequence gets two rows wrong and
 * has no way to notice.
 *
 * The transformer-room table is the dangerous one, because the number it
 * produces is believable. Its rows run 1× (21), extra-per-additional (21), 2×
 * (42) down the page, so a stream-order read pairs **2×1000/1500 KVA with 21
 * m²** — a transformer room half its required size, on a figure no reviewer
 * would stop at.
 *
 * So the assertions below are mostly INEQUALITIES and RELATIONSHIPS rather than
 * equalities: the things that are true of the real table and false of every
 * plausible mis-pairing. An equality check passes just as happily on a
 * transposed table that was transposed consistently.
 */

import { describe, expect, it } from 'vitest';

import {
  DEWA_2017,
  DEWA_NOT_MECHANIZED,
  DEWA_SUBSTATION_RULES,
  RMU_ROOM_M2,
  SINGLE_ROOM_SUBSTATION_M2,
  TRANSFORMER_ROOM_M2,
  singleRoomSubstationAreaM2,
} from '../src/instruments/dewa-2017.js';
import { ApprovalStatus, Mechanization } from '../src/record.js';

describe('the single-room substation table', () => {
  it('reads 33 for one transformer and 55 for two', () => {
    expect(SINGLE_ROOM_SUBSTATION_M2.one).toBe(33);
    expect(SINGLE_ROOM_SUBSTATION_M2.two).toBe(55);
  });

  /*
    THE MIS-PAIRING, ASSERTED AGAINST BY NAME. In content-stream order the four
    areas are [10, 25, 55, 33] against descriptions [4+, 2×, extra, 1×]. Pairing
    them off gives 2× → 25 and extra → 55. Both are stated here as things the
    table does NOT say, so a future re-transcription that reverts to stream
    order fails on the line that explains why.
  */
  it('is not the content stream’s order', () => {
    expect(SINGLE_ROOM_SUBSTATION_M2.two).not.toBe(25);
    expect(SINGLE_ROOM_SUBSTATION_M2.perAdditional).not.toBe(55);
    expect(SINGLE_ROOM_SUBSTATION_M2.one).not.toBe(10);
  });

  /*
    AND IT IS NOT LINEAR, which is the other way this table gets "simplified"
    into something wrong. 33 → 55 is +22; every transformer after the second is
    +25. A reader who writes `33 + 25 × (n − 1)` gets 58 for the two-transformer
    case — the single most common one in Dubai — and is over by 3 m².
  */
  it('is a table and not a formula', () => {
    const linear = SINGLE_ROOM_SUBSTATION_M2.one + SINGLE_ROOM_SUBSTATION_M2.perAdditional;
    expect(linear).toBe(58);
    expect(SINGLE_ROOM_SUBSTATION_M2.two).not.toBe(linear);
  });

  it('adds the fourth-transformer equipment allowance once, and only from four', () => {
    expect(singleRoomSubstationAreaM2(1)).toBe(33);
    expect(singleRoomSubstationAreaM2(2)).toBe(55);
    expect(singleRoomSubstationAreaM2(3)).toBe(80); // 55 + 25, no allowance yet
    expect(singleRoomSubstationAreaM2(4)).toBe(115); // 55 + 50 + 10
    expect(singleRoomSubstationAreaM2(5)).toBe(140); // 55 + 75 + 10 — once, not twice
  });

  it('refuses a count that is not one', () => {
    expect(() => singleRoomSubstationAreaM2(0)).toThrow(/transformer count/);
    expect(() => singleRoomSubstationAreaM2(-1)).toThrow(/transformer count/);
    expect(() => singleRoomSubstationAreaM2(1.5)).toThrow(/transformer count/);
  });
});

describe('the split-room tables', () => {
  /*
    THE PLAUSIBLE WRONG NUMBER. 2×1000/1500 KVA is 42 m². A stream-order read
    gives 21 — which is also the correct value for ONE transformer and for the
    per-additional row, so the mistake produces a number that appears twice
    elsewhere in the same table and looks consistent.
  */
  it('gives the two-transformer room 42 m², not the 21 the stream order suggests', () => {
    expect(TRANSFORMER_ROOM_M2.two).toBe(42);
    expect(TRANSFORMER_ROOM_M2.two).not.toBe(TRANSFORMER_ROOM_M2.one);
    expect(TRANSFORMER_ROOM_M2.two).toBe(TRANSFORMER_ROOM_M2.one * 2);
  });

  it('keeps the RMU room smaller than the transformer room it serves', () => {
    // A relationship, not a figure: an RMU set is switchgear and a transformer
    // room holds transformers. Any transposition of the two tables breaks this.
    expect(RMU_ROOM_M2.oneSet).toBeLessThan(TRANSFORMER_ROOM_M2.one);
    expect(RMU_ROOM_M2.perAdditionalSet).toBeLessThan(RMU_ROOM_M2.oneSet);
  });

  /*
    A SPLIT SUBSTATION IS SMALLER IN TOTAL THAN A SINGLE ROOM, which is the
    whole engineering reason the arrangement exists. 9 + 21 = 30 against 33.
    This is the strongest single check in the file: it is a fact about the
    regulation that no transposition of either table survives.
  */
  it('costs less in total than a single room, which is why the arrangement exists', () => {
    const split = RMU_ROOM_M2.oneSet + TRANSFORMER_ROOM_M2.one;
    expect(split).toBeLessThan(SINGLE_ROOM_SUBSTATION_M2.one);
    expect(RMU_ROOM_M2.oneSet + TRANSFORMER_ROOM_M2.two).toBeLessThan(
      SINGLE_ROOM_SUBSTATION_M2.two,
    );
  });
});

describe('the records', () => {
  it('cite a real instrument, which is new in this repository', () => {
    for (const r of DEWA_SUBSTATION_RULES) {
      expect(r.citation.instrumentId).toBe('DEWA-REG-ELEC-2017');
      // The thing every other seed rule in this package still says.
      expect(r.citation.instrumentId).not.toMatch(/PLACEHOLDER/);
      expect(r.citation.sourceTextVerbatim).not.toMatch(/NOT SOURCED/);
    }
  });

  /*
    A CITATION THAT CANNOT BE FOLLOWED IS NOT A CITATION. Page and bounding box
    are what let a reviewer open the PDF and look, which is the difference
    between this transcription being checkable and being trusted.
  */
  it('carry a page and a box a reviewer can open the document at', () => {
    for (const r of DEWA_SUBSTATION_RULES) {
      expect(r.citation.sourcePage, r.ruleId).toBeGreaterThan(0);
      const [x0, y0, x1, y1] = r.citation.sourceBbox;
      expect(x1, r.ruleId).toBeGreaterThan(x0);
      expect(y1, r.ruleId).toBeGreaterThan(y0);
      // A4 at 72 dpi is 595 × 842. A box outside it is a transcription error.
      expect(x1, r.ruleId).toBeLessThanOrEqual(596);
      expect(y1, r.ruleId).toBeLessThanOrEqual(842);
    }
  });

  it('quote enough of the clause to check the figure against', () => {
    for (const r of DEWA_SUBSTATION_RULES) {
      expect(r.citation.sourceTextVerbatim.length, r.ruleId).toBeGreaterThan(40);
      expect(r.citation.clauseReference, r.ruleId).toMatch(/^Section 11\./);
    }
  });

  /*
    STILL DRAFT, AND THE READINESS PAGE DEPENDS ON IT. `/readiness` leads with
    "approved rules: 0" and that number is the most honest thing on the site. A
    genuine citation improves the TRANSCRIPTION; it does not constitute the
    review, and promoting these would make that zero a lie.
  */
  it('are drafts, because nobody has reviewed them', () => {
    for (const r of DEWA_SUBSTATION_RULES) {
      expect(r.status, r.ruleId).toBe(ApprovalStatus.DRAFT);
      expect(r.approvedBy, r.ruleId).toBeNull();
      expect(r.approvedAt, r.ruleId).toBeNull();
    }
  });

  it('flag the two clauses that are about fire, and not the ones that are about area', () => {
    const byId = new Map(DEWA_SUBSTATION_RULES.map((r) => [r.ruleId, r]));
    // Heat that cannot escape, and a transformer below the first basement.
    expect(byId.get('R-DEWA-11.5.1-SUBSTATION-VENTILATION')!.isLifeSafety).toBe(true);
    expect(byId.get('R-DEWA-11.2.2-TRANSFORMER-FIRST-BASEMENT')!.isLifeSafety).toBe(true);
    // An area is not a life-safety rule, and marking it one would stop a
    // resolution pass relaxing something it is entitled to relax.
    expect(byId.get('R-DEWA-11.4.1-SUBSTATION-AREA')!.isLifeSafety).toBe(false);
  });

  it('say which clause is only partly mechanizable, rather than claiming all of it', () => {
    const vent = DEWA_SUBSTATION_RULES.find(
      (r) => r.ruleId === 'R-DEWA-11.5.1-SUBSTATION-VENTILATION',
    );
    expect(vent!.mechanization).toBe(Mechanization.PARTIALLY_MECHANIZED);
  });

  it('give every record a test, including a negative one where refusal is the point', () => {
    for (const r of DEWA_SUBSTATION_RULES) {
      expect(r.tests.length, r.ruleId).toBeGreaterThan(0);
    }
    const onRoad = DEWA_SUBSTATION_RULES.find(
      (r) => r.ruleId === 'R-DEWA-11.3.1-SUBSTATION-ON-ROAD',
    );
    expect(onRoad!.tests.some((t) => t.kind === 'NEGATIVE')).toBe(true);
  });

  it('have unique ids', () => {
    const ids = DEWA_SUBSTATION_RULES.map((r) => r.ruleId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('are all in force from the edition’s own date, with no end', () => {
    for (const r of DEWA_SUBSTATION_RULES) {
      expect(r.validFrom, r.ruleId).toBe(DEWA_2017.validFrom);
      expect(r.validTo, r.ruleId).toBeNull();
    }
  });
});

/**
 * WHAT IS NOT ENCODED IS PUBLISHED, which is the same discipline `access.ts`
 * applies to "opposite a T junction": a clause nobody implemented is reported
 * as not assessed, never quietly dropped.
 */
describe('the clauses that are not encoded', () => {
  it('are named, with the reason each one is not', () => {
    expect(DEWA_NOT_MECHANIZED.length).toBeGreaterThan(4);
    for (const n of DEWA_NOT_MECHANIZED) {
      expect(n.clause).toMatch(/^11\./);
      expect(n.why.length).toBeGreaterThan(30);
    }
  });

  it('name none that a record already covers', () => {
    const encoded = DEWA_SUBSTATION_RULES.map((r) => r.citation.clauseReference);
    for (const n of DEWA_NOT_MECHANIZED) {
      const clause = n.clause.split(' ')[0]!;
      expect(
        encoded.some((e) => e.includes(`Section ${clause}`)),
        `${clause} is listed as not mechanized and also has a record`,
      ).toBe(false);
    }
  });
});
