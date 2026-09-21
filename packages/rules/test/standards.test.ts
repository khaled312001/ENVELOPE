/**
 * Developer standards, checked against the documents they were read from.
 *
 * These numbers were transcribed by hand from PDFs whose tables are laid out
 * right-to-left in the content stream — a naive text extraction reads the podium
 * column as the tower one and swaps a 340 ft² studio cap for a 500 ft² one. The
 * columns were resolved by x-coordinate against the header positions, and these
 * tests are the second reading: they assert the values, the arithmetic that
 * relates them, and the two things about them a user must never be allowed to
 * forget — that a maximum is being used as an area, and that a developer brief
 * is not a regulation.
 */

import { Decimal } from '@envelope/core';
import { describe, expect, it } from 'vitest';

import {
  AZIZI_RESIDENTIAL,
  BRIEF_DJAZ1MED12RES011,
  BRIEF_DJAZ1TRE10RES022,
  briefFor,
  PROJECT_BRIEFS,
  resolveMix,
  scenariosFor,
  SQ_FT_TO_SQ_M,
  StandardResolutionError,
} from '../src/standards/index.js';

describe('the transcription', () => {
  it('keeps the tower and podium studio caps apart', () => {
    // 340 in the tower, 500 on the podium. Reversing them is the single most
    // likely transcription error in this document and it would inflate every
    // studio-heavy scheme's area by 47%.
    const tower = AZIZI_RESIDENTIAL.unitAreas.find(
      (u) => u.typeId === 'STUDIO' && u.position === 'TOWER',
    );
    const podium = AZIZI_RESIDENTIAL.unitAreas.find(
      (u) => u.typeId === 'STUDIO' && u.position === 'PODIUM',
    );
    expect(tower?.variants[0]?.maxAreaFt2).toBe('340');
    expect(podium?.variants[0]?.maxAreaFt2).toBe('500');
  });

  it('cites a page and a box for every figure', () => {
    const cited = [
      ...AZIZI_RESIDENTIAL.unitAreas.map((u) => u.citation),
      ...AZIZI_RESIDENTIAL.scenarios.map((s) => s.citation),
      ...Object.values(AZIZI_RESIDENTIAL.targets).map((t) => t.citation),
    ];
    for (const c of cited) {
      expect(c.sourcePage).toBeGreaterThan(0);
      expect(c.sourceTextVerbatim.length).toBeGreaterThan(2);
      expect(c.sourceBbox.filter((v: number) => v !== 0).length).toBeGreaterThan(0);
      expect(c.documentUri).toMatch(/docs\/00-source\/developer-standards\/azizi\//);
    }
  });

  it('records the half-bathroom reason for the two 1-bedroom variants', () => {
    const oneBed = AZIZI_RESIDENTIAL.unitAreas.find(
      (u) => u.typeId === '1BED' && u.position === 'TOWER',
    );
    expect(oneBed?.variants).toHaveLength(2);
    expect(oneBed?.variants.map((v) => v.maxAreaFt2)).toEqual(['650', '680']);
    expect(oneBed?.variants[1]?.note).toMatch(/1\.5 toilet/);
  });

  it('says out loud which parts of the standard it does not mechanize', () => {
    expect(AZIZI_RESIDENTIAL.notMechanized.length).toBeGreaterThan(3);
    for (const n of AZIZI_RESIDENTIAL.notMechanized) expect(n.length).toBeGreaterThan(40);
    // The balcony rule is the one a reader is most likely to assume was applied.
    expect(AZIZI_RESIDENTIAL.notMechanized.join(' ')).toMatch(/[Bb]alcony/);
  });
});

describe('resolveMix', () => {
  it('converts square feet exactly, not approximately', () => {
    // 1 ft = 0.3048 m by definition, so 1 ft² = 0.09290304 m². A rounded factor
    // would put a fabricated digit into every unit area in the product.
    expect(SQ_FT_TO_SQ_M).toBe('0.09290304');
    const mix = resolveMix(AZIZI_RESIDENTIAL, 'AZIZI-BEST');
    const studio = mix.entries.find((e) => e.typeId === 'STUDIO');
    expect(studio?.nsaM2.toFixed(3)).toBe(
      new Decimal('340').times(SQ_FT_TO_SQ_M).toDecimalPlaces(3).toFixed(3),
    );
  });

  it('weights the variants inside a type by their own shares', () => {
    // Tower 1-bedroom: 80% at 650 ft², 20% at 680 ft² → 656 ft².
    const mix = resolveMix(AZIZI_RESIDENTIAL, 'AZIZI-BEST');
    const oneBed = mix.entries.find((e) => e.typeId === '1BED');
    const expected = new Decimal('656').times(SQ_FT_TO_SQ_M).toDecimalPlaces(3);
    expect(oneBed?.nsaM2.toFixed(3)).toBe(expected.toFixed(3));
  });

  it('gives the podium a larger studio than the tower', () => {
    const tower = resolveMix(AZIZI_RESIDENTIAL, 'AZIZI-BEST', 'TOWER');
    const podium = resolveMix(AZIZI_RESIDENTIAL, 'AZIZI-BEST', 'PODIUM');
    const areaOf = (m: typeof tower): Decimal =>
      m.entries.find((e) => e.typeId === 'STUDIO')!.nsaM2;
    expect(areaOf(podium).gt(areaOf(tower))).toBe(true);
  });

  it('says in the basis that these are maxima used as areas', () => {
    const mix = resolveMix(AZIZI_RESIDENTIAL, 'AZIZI-BEST');
    expect(mix.basis).toMatch(/maxima/);
    expect(mix.basis).toMatch(/understates the unit count/);
    // And that it is not a regulation. This is the sentence that stops a
    // developer's commercial preference being read as a legal limit.
    expect(mix.basis).toMatch(/never what the authority permits/);
  });

  it('records that the best-case studio range was resolved to its low end', () => {
    const mix = resolveMix(AZIZI_RESIDENTIAL, 'AZIZI-BEST');
    expect(mix.basis).toMatch(/80-85%/);
    expect(mix.basis).toMatch(/only the low end totals 100%|low end/i);
  });

  it('refuses a mix whose shares do not total 1 rather than normalising it', () => {
    const broken = {
      ...AZIZI_RESIDENTIAL,
      scenarios: [
        {
          scenarioId: 'BROKEN',
          label: 'broken',
          entries: [
            { typeId: 'STUDIO', share: '0.5' },
            { typeId: '1BED', share: '0.4' },
          ],
          citation: AZIZI_RESIDENTIAL.scenarios[0]!.citation,
        },
      ],
    };
    expect(() => resolveMix(broken, 'BROKEN')).toThrow(StandardResolutionError);
    expect(() => resolveMix(broken, 'BROKEN')).toThrow(/not normalised here/);
  });

  it('refuses a type the standard states no cap for', () => {
    const gap = {
      ...AZIZI_RESIDENTIAL,
      scenarios: [
        {
          scenarioId: 'GAP',
          label: 'gap',
          entries: [{ typeId: '4BED', share: '1' }],
          citation: AZIZI_RESIDENTIAL.scenarios[0]!.citation,
        },
      ],
    };
    // The gap is in the document, not in the run. Substituting a cap would be
    // the engine inventing a commercial decision on the developer's behalf.
    expect(() => resolveMix(gap, 'GAP')).toThrow(/obtain the cap/);
  });

  it('totals exactly 1 on both published scenarios', () => {
    for (const s of AZIZI_RESIDENTIAL.scenarios) {
      const total = s.entries.reduce((a, e) => a.plus(e.share), new Decimal(0));
      expect(total.toString(), s.scenarioId).toBe('1');
    }
  });
});

describe('project briefs', () => {
  it('supplies the FAR the affection plan for that plot omits', () => {
    /*
      The whole reason this type exists.

      `packages/intake` reads DJAZ1MED12RES011 and reports no FAR and no GFA, so
      `blockingGaps()` stops the run — correctly. The brief for the same plot
      prints FAR 5 and 11,829.35 m², and the two agree exactly.
    */
    const b = BRIEF_DJAZ1MED12RES011;
    expect(b.far.value).toBe('5');
    const implied = new Decimal(b.far.value).times(b.plotAreaM2.value);
    expect(implied.toFixed(2)).toBe(new Decimal(b.gfaM2.value).toFixed(2));
  });

  it('marks that FAR as coming from a developer brief, not an authority', () => {
    expect(BRIEF_DJAZ1MED12RES011.far.note).toMatch(/developer brief rather than an authority/);
    expect(BRIEF_DJAZ1MED12RES011.far.citation.instrumentId).toMatch(/^AZIZI\//);
  });

  it('does not reconcile on the second plot, and records why', () => {
    /*
      5.05 × 1,740.56 = 8,789.83, and the document prints 8,796.46 — 6.63 m²
      apart. Neither number is wrong: the true ratio is 5.0538, and the document
      prints it rounded to two decimals. Multiplying the rounded FAR loses two
      thirds of a parking bay's worth of GFA.

      This is asserted rather than smoothed over because the direction matters.
      The printed GFA is the number the developer priced; the printed FAR is a
      rounded description of it. A run that took the FAR and re-multiplied would
      quietly under-report, every time, on every plot whose FAR does not divide
      evenly.
    */
    const b = BRIEF_DJAZ1TRE10RES022;
    const implied = new Decimal(b.far.value).times(b.plotAreaM2.value);
    const printed = new Decimal(b.gfaM2.value);
    expect(implied.equals(printed)).toBe(false);

    // Inside the 0.5%-of-area tolerance intake uses on the affection plan, so
    // the two instruments agree as far as either can be read.
    const tolerance = new Decimal(b.plotAreaM2.value).times('0.005');
    expect(implied.minus(printed).abs().lt(tolerance)).toBe(true);

    // And the record says so, so nobody re-derives the discrepancy from scratch.
    expect(b.gfaM2.note).toMatch(/rounded/i);
  });

  it('narrows the mix to this plot, and the general standard stops applying', () => {
    // 5180178 is studios only in the best case. Offering the general 80/18/2
    // alongside it would let a user run a mix this plot's brief excludes.
    const scenarios = scenariosFor(AZIZI_RESIDENTIAL, BRIEF_DJAZ1MED12RES011);
    expect(scenarios.every((s) => s.fromBrief)).toBe(true);
    const best = scenarios.find((s) => s.scenarioId === 'BRIEF-178-BEST');
    expect(best?.entries).toEqual([{ typeId: 'STUDIO', share: '1' }]);
  });

  it('falls back to the standard scenarios for a plot with no brief', () => {
    const scenarios = scenariosFor(AZIZI_RESIDENTIAL, undefined);
    expect(scenarios.every((s) => !s.fromBrief)).toBe(true);
    expect(scenarios).toHaveLength(2);
  });

  it('finds a brief by plot number, and reports honestly when there is none', () => {
    expect(briefFor(PROJECT_BRIEFS, '5180178')?.briefId).toBe('AZIZI-BRIEF-5180178');
    expect(briefFor(PROJECT_BRIEFS, ' 5180196 ')?.briefId).toBe('AZIZI-BRIEF-5180196');
    expect(briefFor(PROJECT_BRIEFS, '345-1234')).toBeUndefined();
  });

  it('resolves a brief scenario against the standard caps', () => {
    const mix = resolveMix(
      AZIZI_RESIDENTIAL,
      'BRIEF-178-BEST',
      'TOWER',
      BRIEF_DJAZ1MED12RES011.scenarios,
    );
    expect(mix.entries).toHaveLength(1);
    expect(mix.entries[0]?.typeId).toBe('STUDIO');
    expect(mix.entries[0]?.share.toString()).toBe('1');
    // 340 ft² is 31.587 m². A studio-only scheme is the densest the brief allows.
    expect(mix.entries[0]?.nsaM2.toFixed(2)).toBe('31.59');
  });
});

describe('the targets, which are targets and not limits', () => {
  it('states the saleable-efficiency range the engine now requires an answer for', () => {
    expect(AZIZI_RESIDENTIAL.targets.saleableEfficiencyMin.value).toBe('0.93');
    expect(AZIZI_RESIDENTIAL.targets.saleableEfficiencyMax.value).toBe('0.97');
  });

  it('carries the 37.5 m² per bay the layout is measured against', () => {
    const t = AZIZI_RESIDENTIAL.targets.parkingAreaPerBayM2;
    expect(t.value).toBe('37.5');
    // Measured against, not bound by. A level above 37.5 is a finding for the
    // designer, not a violation of anything.
    expect(t.note).toMatch(/not a rule it is bound by/);
  });

  it('carries the 5% parking overage as a developer decision', () => {
    expect(AZIZI_RESIDENTIAL.targets.parkingOverage.value).toBe('0.05');
    expect(AZIZI_RESIDENTIAL.targets.parkingOverage.citation.sourceTextVerbatim).toMatch(
      /5% more than the minimum required/,
    );
  });
});
