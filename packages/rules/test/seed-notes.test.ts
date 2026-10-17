/**
 * The seed's life-safety and storey-height records, held to the pages they cite.
 *
 * Three records said something the code on file does not:
 *
 * - the travel distance was 45 m under "UAE FLS Code, Chapter 2". Means of egress
 *   is Chapter 3, and 45 m is the column WITHOUT sprinkler protection; a
 *   sprinklered apartment building is 61 m (Table 3.6A, PDF p182);
 * - the 3.20 m floor-to-floor was cited to "Part B", which prints clear heights
 *   (Table B.4) and no floor-to-floor at all;
 * - and Table B.4's 2.3 m for parking, which B.7.2.3.1 sends a parking level to,
 *   was encoded nowhere.
 *
 * The figures are typed here a second time, from the page and not from the seed:
 * a test that read the transcription it checks would pass on any transcription.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { evaluate, isNotApplicable } from '../src/evaluators.js';
import { RuleClass, type RuleRecord } from '../src/record.js';
import { isApplicable } from '../src/resolve.js';
import {
  citesPlaceholder,
  LIVING_CLEAR_HEIGHT_M,
  PARKING_CLEAR_HEIGHT_M,
  SEED_RULES,
} from '../src/seed/dubai-residential.js';

const rule = (id: string): RuleRecord => {
  const r = SEED_RULES.find((x) => x.ruleId === id);
  if (!r) throw new Error(`${id} is not in the seed`);
  return r;
};

/** What a record yields in a context: its applicability first, then its evaluator. */
function valueOf(r: RuleRecord, ctx: Record<string, unknown>): number | 'NOT_APPLICABLE' {
  if (!isApplicable(r.applicability, ctx)) return 'NOT_APPLICABLE';
  const v = evaluate(r, ctx);
  if (isNotApplicable(v)) return 'NOT_APPLICABLE';
  if (v.kind !== 'scalar') throw new Error(`${r.ruleId} is not a scalar`);
  return v.value.toNumber();
}

const SPRINKLERED = { land_use: 'RESIDENTIAL_MULTI', building: { sprinklered: true } };
const UNSPRINKLERED = { land_use: 'RESIDENTIAL_MULTI', building: { sprinklered: false } };
const UNSTATED = { land_use: 'RESIDENTIAL_MULTI' };

/** One page of the fire code's text layer, as `docs/01-extracted` holds it. */
function flscPage(page: number): readonly string[] {
  const path = fileURLToPath(new URL('../../../docs/01-extracted/regulations/uaefirecode-eng.txt', import.meta.url));
  const text = readFileSync(path, 'utf8');
  const from = text.indexOf(`<<<PAGE ${page}>>>`);
  const to = text.indexOf(`<<<PAGE ${page + 1}>>>`);
  return text
    .slice(from, to)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/** The cells printed after a row's label, blanks dropped. */
function rowAfter(lines: readonly string[], label: readonly string[], cells: number): readonly string[] {
  const at = lines.findIndex((l, i) => label.every((w, k) => lines[i + k] === w));
  expect(at, `${label.join(' ')} is on the page`).toBeGreaterThanOrEqual(0);
  return lines.slice(at + label.length, at + label.length + cells);
}

describe('Table 3.6A — the egress records', () => {
  it('give a sprinklered apartment building 61 m of travel, and 45 m only without sprinklers', () => {
    const r = rule('R-EGRESS-TRAVEL-DISTANCE');
    expect(valueOf(r, SPRINKLERED)).toBe(61);
    expect(valueOf(r, UNSPRINKLERED)).toBe(45);
  });

  it('choose no column when nobody has said whether the building is sprinklered', () => {
    expect(valueOf(rule('R-EGRESS-TRAVEL-DISTANCE'), UNSTATED)).toBe('NOT_APPLICABLE');
  });

  it('carry the apartment row’s common path and dead end, and the enclosed-parking row', () => {
    expect(valueOf(rule('R-EGRESS-COMMON-PATH'), SPRINKLERED)).toBe(38);
    expect(valueOf(rule('R-EGRESS-COMMON-PATH'), UNSPRINKLERED)).toBe(23);
    expect(valueOf(rule('R-EGRESS-DEAD-END'), SPRINKLERED)).toBe(15);
    expect(valueOf(rule('R-EGRESS-DEAD-END'), UNSPRINKLERED)).toBe(10.7);
    expect(valueOf(rule('R-EGRESS-PARKING-TRAVEL-DISTANCE'), SPRINKLERED)).toBe(60);
    expect(valueOf(rule('R-EGRESS-PARKING-TRAVEL-DISTANCE'), UNSPRINKLERED)).toBe(45);
    expect(valueOf(rule('R-EGRESS-PARKING-COMMON-PATH'), SPRINKLERED)).toBe(15);
    expect(valueOf(rule('R-EGRESS-PARKING-DEAD-END'), SPRINKLERED)).toBe(15);
  });

  it('are what the page prints, read off the text layer', () => {
    // [dead end, common path, travel] with sprinklers, then without.
    expect(rowAfter(flscPage(182), ['Apartment', 'Buildings'], 7)).toEqual([
      '18.6', '15m', '38m', '61m', '10.7m', '23m', '45m',
    ]);
    expect(rowAfter(flscPage(183), ['Enclosed', 'Parking', 'Structures'], 7)).toEqual([
      '27.9', '15m', '15m', '60m', '15m', '15m', '45',
    ]);
  });

  it('cite Chapter 3 of the 2011 code on file, by page, and never a placeholder', () => {
    const egress = SEED_RULES.filter((r) => r.parameterId.startsWith('egress.'));
    expect(egress).toHaveLength(6);
    for (const r of egress) {
      expect(citesPlaceholder(r), r.ruleId).toBe(false);
      expect(r.citation.instrumentId).toBe('UAE_FLSC');
      expect(r.citation.instrumentVersion).toBe('2011');
      expect(r.citation.clauseReference).toMatch(/^Chapter 3, §11\.8, Table 3\.6A/);
      expect(r.citation.clauseReference).not.toMatch(/Chapter 2/);
      expect(r.citation.sourcePage === 182 || r.citation.sourcePage === 183).toBe(true);
      expect(r.citation.sourceBbox.some((v) => v !== 0)).toBe(true);
    }
  });

  it('stay life-safety and declared only: EVALUATIVE_ONLY, never a constraint a run is held to', () => {
    for (const r of SEED_RULES.filter((x) => x.parameterId.startsWith('egress.'))) {
      expect(r.isLifeSafety, r.ruleId).toBe(true);
      expect(r.ruleClass, r.ruleId).toBe(RuleClass.EVALUATIVE_ONLY);
    }
  });
});

describe('Table B.4 — clear heights, and the storey height that is not one', () => {
  it('encodes the parking clear height at 2.3 m, cited to p59', () => {
    const r = rule('R-DBC-B53-PARKING-CLEAR-HEIGHT');
    expect(PARKING_CLEAR_HEIGHT_M).toBe('2.3');
    expect(valueOf(r, UNSTATED)).toBe(2.3);
    expect(r.citation.sourcePage).toBe(59);
    expect(r.citation.sourceTextVerbatim).toContain('Parking – for light vehicles | 2.3');
    expect(r.ruleClass).toBe(RuleClass.EVALUATIVE_ONLY);
  });

  it('encodes the living-space clear height at 2.7 m, cited to p58', () => {
    const r = rule('R-DBC-B53-LIVING-CLEAR-HEIGHT');
    expect(LIVING_CLEAR_HEIGHT_M).toBe('2.7');
    expect(valueOf(r, UNSTATED)).toBe(2.7);
    expect(r.citation.sourcePage).toBe(58);
  });

  it('no longer credits the 3.20 m floor-to-floor to Part B', () => {
    const r = rule('R-FLOOR-TO-FLOOR-RES');
    expect(valueOf(r, UNSTATED)).toBe(3.2);
    expect(citesPlaceholder(r)).toBe(true);
    expect(r.citation.clauseReference).not.toBe('Part B');
    expect(r.citation.clauseReference).toMatch(/^Not DBC Part B/);
    expect(r.citation.sourceTextVerbatim).toMatch(/^\[NOT SOURCED\]/);
  });
});

describe('every record this file added passes its own three tests', () => {
  const added = SEED_RULES.filter(
    (r) => r.parameterId.startsWith('egress.') || r.ruleId.startsWith('R-DBC-B53-'),
  );
  for (const r of added) {
    it(r.ruleId, () => {
      for (const t of r.tests) {
        const got = valueOf(r, t.context as Record<string, unknown>);
        expect(got, `${t.kind}: ${t.note ?? ''}`).toEqual(t.expected);
      }
    });
  }
});
