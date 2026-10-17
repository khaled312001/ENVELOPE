/**
 * No label is printed over another, or across a dimension.
 *
 * The audit measured it in a browser before this test existed: on the worked
 * example's site plan, VEHICLE ENTRY / EXIT - 6.00M covered 96% of the 80.00 M
 * that measures the frontage — the boundary the access rule is read off, on the
 * drawing the landing page sells. On every parking level 6.00M WIDE 2 WAY
 * DRIVEWAY sat a quarter over the 5.50 M beside it; on the ground floor the core
 * shafts' label sat over CORE ENTRANCE. Nothing could see it, because a label's
 * place was chosen and never checked against anything.
 *
 * Every sheet of every plot in `plots.ts` is composed from a REAL run and held to
 * zero, measured with the estimate in `text-box.ts` (which errs large).
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { initGeometry } from '@envelope/geometry';
import { beforeAll, describe, expect, it } from 'vitest';

import { sheetSvg } from '../src/svg.js';
import { textCollisions } from '../src/text-box.js';
import type { Sheet } from '../src/types.js';
import { PLOTS, setOf } from './plots.js';

beforeAll(async () => {
  await initGeometry();
});

/** Set SHEETS_OUT to a directory to look at what was measured, as `sheets.test.ts` does. */
function write(name: string, sheets: readonly Sheet[]): void {
  const out = process.env['SHEETS_OUT'];
  if (!out) return;
  mkdirSync(out, { recursive: true });
  for (const s of sheets) writeFileSync(join(out, `${name.replace(/\W+/g, '-')}-${s.number}.svg`), sheetSvg(s));
}

describe('no text prints over other text or across a dimension', () => {
  for (const plot of PLOTS) {
    it(`on every sheet of ${plot.name}`, () => {
      const sheets = setOf(plot.input());
      write(plot.name, sheets);
      const found = sheets.flatMap((sheet) =>
        textCollisions(sheet).map((c) => `${sheet.number}: ${c.a} × ${c.b}`),
      );
      expect(found).toEqual([]);
    });
  }
});
