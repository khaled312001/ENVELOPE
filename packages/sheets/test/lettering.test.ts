/**
 * Every letter on every sheet is at least as tall as `LETTERING` says.
 *
 * The audit measured the drawings as printed: bay numbers at 1.6 mm, room and
 * core labels at 1.2 mm, notes at 2.0 mm, on an A3 sheet. The floor is ISO
 * 3098-0's smallest nominal height, 1.8 mm, for everything; notes and labels
 * stand at 2.5 mm, the drawing-office height for an A3 sheet. The basis is in
 * `src/lettering.ts`.
 *
 * Held over every sheet of real runs, because the heights are chosen in a dozen
 * places in `compose.ts` and `strip.ts` and a test that read the constants would
 * pass on a composer that ignored them.
 */

import { initGeometry } from '@envelope/geometry';
import { beforeAll, describe, expect, it } from 'vitest';

import { LETTERING } from '../src/lettering.js';
import { PLOTS, setOf } from './plots.js';

beforeAll(async () => {
  await initGeometry();
});

/*
  What a reader READS, as against what he looks up. A dimension's figures, the
  captions over title-block values ('label') and the scale bar's figures are
  looked up, and sit at the floor; everything on the drawing that says something
  in words, and every note, is at the note height.
*/
const LOOKED_UP_MODEL: ReadonlySet<string> = new Set(['dimension']);
const READ_ON_PAPER: ReadonlySet<string> = new Set(['note', 'warning', 'heading', 'title']);

describe('lettering heights', () => {
  for (const plot of PLOTS) {
    it(`on every sheet of ${plot.name}`, () => {
      const below: string[] = [];
      for (const sheet of setOf(plot.input())) {
        for (const item of sheet.items) {
          if (item.kind !== 'text') continue;
          const floor = LOOKED_UP_MODEL.has(item.role) ? LETTERING.minimumMm : LETTERING.noteMm;
          if (item.sizeMm < floor) below.push(`${sheet.number} ${item.role} "${item.value}" at ${item.sizeMm} mm`);
        }
        for (const item of sheet.paperItems) {
          if (item.kind !== 'text') continue;
          const floor = READ_ON_PAPER.has(item.role) ? LETTERING.noteMm : LETTERING.minimumMm;
          if (item.sizeMm < floor) below.push(`${sheet.number} paper ${item.role} "${item.value}" at ${item.sizeMm} mm`);
        }
      }
      expect(below).toEqual([]);
    });
  }

  it('sets a dimension figure above the floor and notes at the A3 note height', () => {
    expect(LETTERING.dimensionMm).toBeGreaterThanOrEqual(LETTERING.minimumMm);
    expect(LETTERING.captionMm).toBeGreaterThanOrEqual(LETTERING.minimumMm);
    expect(LETTERING.noteMm).toBeGreaterThanOrEqual(2.5);
  });
});
