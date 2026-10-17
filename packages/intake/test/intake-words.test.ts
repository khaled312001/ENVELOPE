/**
 * Every sentence the new readers write, said in Arabic.
 *
 * The sheet step shows what an affection plan omits as findings, and on
 * /ar/studio a sentence `@envelope/report/words` does not know is a paragraph
 * of English. These are produced by the readers themselves — from the
 * synthetic sheets in `fixtures.ts` and from the helpers directly — not typed
 * here, so a reworded sentence with no Arabic fails.
 */
import { describe, expect, it } from 'vitest';

import { engineNote } from '@envelope/report/words';

import { seeNotesDeferral } from '../src/affection-plan.js';
import { placeSides } from '../src/dda.js';

import { DWELLING_NOTE, at, ddaSheet, page, read } from './fixtures.js';

const NUMERIC = [
  ['5', '4'],
  ['7', '6'],
  ['7', '6'],
  ['7', '6'],
] as const;

const ring = [
  { id: '1', east: '0', north: '0' },
  { id: '2', east: '40', north: '0' },
  { id: '3', east: '40', north: '40' },
  { id: '4', east: '0', north: '40' },
];
const identity = (x: number, y: number): readonly [number, number] => [x, y];
const labels = [at('SIDE 1', 15, 2, 10, 2), at('SIDE 2', 34, 19, 10, 2), at('SIDE 3', 15, 36, 10, 2), at('SIDE 4', 1, 19, 10, 2)];

const consequence = (facts: ReturnType<typeof read>, field: string): string => facts.missing.find((m) => m.field === field)?.consequence ?? '';

const sentences: readonly string[] = [
  seeNotesDeferral('maximum GFA', 'APPROVED MASTER PLAN IS REQUIRED PRIOR TO ANY SUBMITTALS.'),
  seeNotesDeferral('maximum height', ''),
  seeNotesDeferral('maximum plot coverage', 'A NOTE.'),
  seeNotesDeferral('whole setback table', 'A NOTE.'),
  consequence(read(ddaSheet([['SEE NOTES', '4'], ['7', '6'], ['7', 'SEE NOTES'], ['7', '6']])), 'setbacks'),
  consequence(read(ddaSheet([['5', '4'], ['TBC', '6'], ['7', '6'], ['7', '6']])), 'setbacks'),
  consequence(read(page(ddaSheet(NUMERIC).items.filter((i) => !/^(SETBACK \(M\)|BUILDING|PODIUM|SIDE)/.test(i.text)))), 'setbacks'),
  consequence(read(page(ddaSheet(NUMERIC).items.filter((i) => i.text !== 'PODIUM'))), 'setbacks'),
  consequence(read(ddaSheet(NUMERIC, ['- PARKING: AS PER THE APPROVED MASTER PLAN.'])), 'parking_requirement'),
  consequence(read(page(ddaSheet(NUMERIC).items.map((i) => (i.text === 'G+4' ? { ...i, text: 'G+4+5' } : i)))), 'height_allowance'),
  read(ddaSheet(NUMERIC, [DWELLING_NOTE])).sideSetbacks?.value.placement ?? '',
  String(placeSides(page(labels.slice(0, 3)), [1, 2, 3, 4], ring, identity)),
  String(placeSides(page([...labels.slice(0, 3), at('SIDE 4', 25, 2, 10, 2)]), [1, 2, 3, 4], ring, identity)),
  String(placeSides(page([...labels, at('SIDE 2', 15, 36, 10, 2)]), [1, 2, 3, 4], ring, identity)),
  String(placeSides(page(labels), [1, 2, 3, 4], ring.slice(0, 2), identity)),
];

describe('the new intake sentences, in Arabic', () => {
  it('produced a sentence for every case', () => {
    for (const s of sentences) expect(s.length).toBeGreaterThan(40);
  });

  it.each(sentences)('%s', (s) => {
    expect(engineNote(s, 'ar')).toMatch(/[؀-ۿ]/);
    expect(engineNote(s, 'en')).toBe(s);
  });

  it('keeps the sheet’s own words and figures in the Arabic', () => {
    expect(engineNote(sentences[0]!, 'ar')).toContain('«APPROVED MASTER PLAN IS REQUIRED PRIOR TO ANY SUBMITTALS.»');
    expect(engineNote(sentences[4]!, 'ar')).toMatch(/الجانب 1 \(المبنى\)، الجانب 3 \(القاعدة\)/);
    expect(engineNote(sentences[9]!, 'ar')).toContain('«G+4+5»');
  });

  it('says where each side was placed, corner to corner', () => {
    const placed = placeSides(page(labels), [1, 2, 3, 4], ring, identity);
    expect(placed).toBeInstanceOf(Map);
    const s =
      'Each side of the table is the surveyed boundary the drawing labels with its number: side 1 runs from corner 1 to corner 2; side 2 runs from corner 2 to corner 3.';
    expect(engineNote(s, 'ar')).toBe('كل جانب في الجدول هو الحد المساحي الذي يكتب الرسم رقمه بجواره: الجانب 1 من الركن 1 إلى الركن 2؛ الجانب 2 من الركن 2 إلى الركن 3.');
  });

  it('names the split check and keeps its figures', () => {
    expect(engineNote('gfa split = maximum GFA', 'ar')).toMatch(/[؀-ۿ]/);
    expect(engineNote('COMMERCIAL : RETAIL 1000.00 m² + RESIDENTIAL : APARTMENT 2000.00 m² = 3000 m² against a printed maximum GFA of 3000 m².', 'ar')).toContain('3000 م²');
  });
});
