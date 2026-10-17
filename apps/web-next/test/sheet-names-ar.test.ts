/**
 * The exports page names each drawing sheet in the reader's language. The list
 * is the engine's, read off a real run, so a sheet the engine adds (the part
 * floor, 17 Oct 2026) is caught here before the Arabic page shows it in English.
 */
import { runPipeline } from '@envelope/capacity';
import { initGeometry } from '@envelope/geometry';
import { composeSheets } from '@envelope/sheets';
import { beforeAll, describe, expect, it } from 'vitest';

import { META, RECT_80x40, runInput } from '../../../test-support/pipeline.js';
import { SITE_AR } from '../src/i18n/site.ar.js';

const ARABIC = /[؀-ۿ]/;

beforeAll(async () => {
  await initGeometry();
});

describe('the sheet names on the Arabic exports page', () => {
  it('says every sheet a real run draws in Arabic, the part floor among them', () => {
    const out = runPipeline(runInput(RECT_80x40));
    const sheets = composeSheets(out.building, META);
    expect(sheets.map((s) => s.title)).toContain('Part floor');
    for (const s of sheets) {
      expect(SITE_AR.exportsPage.sheetName(s.title), s.title).toMatch(ARABIC);
    }
  });
});
