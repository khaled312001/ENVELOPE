/**
 * The title block: named fields, a dated issue, and a revision table with one row.
 *
 * Three claims are worth a test here, and the drafting layout is not one of them.
 *
 * 1. **A field is a key, not a run of text.** The sheet count proves it: only the
 *    SET knows how many sheets it holds, so `composeSheets` fills the field
 *    afterwards, by name. A renderer looking for the word "SHEET" would find the
 *    field's own LABEL first — which is exactly what these tests demonstrate.
 * 2. **The date is the run's, never the export's.** The two agree on the day a
 *    run is exported, which is precisely why a drift would never be noticed: it
 *    would show up months later, on a download of a drawing nobody had changed.
 *    So the sheet is composed with an old date and today's must be nowhere on it.
 * 3. **A "checked by" box is a fact.** Blank reads as an oversight; NOT CHECKED
 *    reads as what it is.
 */

import { runPipeline } from '@envelope/capacity';
import { initGeometry } from '@envelope/geometry';
import { beforeAll, describe, expect, it } from 'vitest';

import { META, RECT_120x80, RECT_80x40, runInput } from '../../../test-support/pipeline.js';
import { composeSheets } from '../src/compose.js';
import { issueDate, NOT_CHECKED, paperFurniture, REVISION_NOTE, UNFILLED } from '../src/strip.js';
import { sheetSvg } from '../src/svg.js';
import { type PaperText, type SheetMeta, TitleField } from '../src/types.js';

beforeAll(async () => {
  await initGeometry();
});

const OLD_RUN = '2019-03-04T09:12:00.000Z';

const strip = (items: readonly { kind: string }[]): PaperText[] =>
  items.filter((i): i is PaperText => i.kind === 'text');

const valueOf = (items: readonly { kind: string }[], field: TitleField): string => {
  const found = strip(items).filter((t) => t.field === field);
  expect(found, `exactly one ${field} field`).toHaveLength(1);
  return found[0]!.value;
};

const set = (meta: SheetMeta = META) => composeSheets(runPipeline(runInput(RECT_120x80, {})).building, meta);

describe('the fields are addressable', () => {
  it('names every field the convention lists, once each, on every sheet', () => {
    for (const sheet of set()) {
      for (const field of Object.values(TitleField)) {
        expect(valueOf(sheet.paperItems, field), `${sheet.number} ${field}`).not.toBe('');
      }
    }
  });

  it('carries the key into the markup, so a reader can ask for the date by name', () => {
    const svg = sheetSvg(set()[0]!);
    expect(svg).toContain(`data-field="${TitleField.DATE}"`);
    expect(svg).toContain(`data-field="${TitleField.CHECKED}"`);
  });

  it('puts the key on the value and never on its label', () => {
    // The label is what a substring search finds — the word SHEET is printed on
    // the sheet, and it is not the field. That is the whole argument for a key.
    const labels = strip(set()[0]!.paperItems).filter((t) => t.value === 'SHEET');
    expect(labels).toHaveLength(1);
    expect(labels[0]!.field).toBeUndefined();
  });
});

describe('sheet n of m', () => {
  it('leaves the strip unfilled, because a strip does not know its set', () => {
    const items = paperFurniture({
      title: 'Site plan',
      number: 'A-001',
      scale: 200,
      meta: META,
      facts: [],
      legend: [],
      north: true,
    });
    expect(valueOf(items, TitleField.SHEET_OF)).toBe(UNFILLED);
  });

  it('is filled by the set, by key, and counts what the set actually holds', () => {
    const sheets = set();
    expect(sheets.length).toBeGreaterThan(1);
    sheets.forEach((sheet, i) => {
      expect(valueOf(sheet.paperItems, TitleField.SHEET_OF)).toBe(`${i + 1} OF ${sheets.length}`);
    });
  });

  it('leaves no placeholder behind on any sheet of any set', () => {
    for (const ring of [RECT_80x40, RECT_120x80]) {
      for (const sheet of composeSheets(runPipeline(runInput(ring, {})).building, META)) {
        expect(valueOf(sheet.paperItems, TitleField.SHEET_OF)).not.toBe(UNFILLED);
      }
    }
  });
});

describe('the issue date', () => {
  it('prints the day the RUN was computed, not the day the sheet was drawn', () => {
    const sheets = set({ ...META, issuedAt: OLD_RUN });
    const today = new Date().toISOString().slice(0, 10);
    expect(today).not.toBe('2019-03-04');
    for (const sheet of sheets) {
      expect(valueOf(sheet.paperItems, TitleField.DATE)).toBe('2019-03-04');
      // And today's date is nowhere on the sheet at all: a title block that
      // re-dates itself on export is a title block nobody can cite.
      for (const item of strip(sheet.paperItems)) expect(item.value).not.toContain(today);
    }
  });

  it('says NOT RECORDED rather than inventing one', () => {
    expect(issueDate('')).toBe('NOT RECORDED');
    expect(issueDate('last Tuesday')).toBe('NOT RECORDED');
    expect(issueDate(OLD_RUN)).toBe('2019-03-04');
  });
});

describe('drawn and checked', () => {
  it('says NOT CHECKED in words when nobody has signed', () => {
    expect(valueOf(set()[0]!.paperItems, TitleField.CHECKED)).toBe(NOT_CHECKED);
  });

  it('names the reviewer once one has', () => {
    const sheets = set({ ...META, checkedBy: 'R. HABIB' });
    expect(valueOf(sheets[0]!.paperItems, TitleField.CHECKED)).toBe('R. HABIB');
  });

  it('says what drew it, which was not a person', () => {
    expect(valueOf(set()[0]!.paperItems, TitleField.DRAWN)).toContain('ENGINE');
  });
});

describe('the revision table', () => {
  it('states the one revision there is', () => {
    expect(valueOf(set()[0]!.paperItems, TitleField.REVISION)).toBe('0 - FIRST ISSUE');
  });

  it('says in words that no history is kept, rather than implying one', () => {
    const printed = strip(set()[0]!.paperItems)
      .map((t) => t.value)
      .join(' ');
    for (const word of REVISION_NOTE.split(/\s+/).slice(0, 6)) expect(printed).toContain(word);
  });
});

describe('a strip with no room left', () => {
  it('refuses rather than printing its title block through its legend', () => {
    /*
      A legend this long cannot arise from a plot — six bands, a boundary, a
      dimension. It is here because the failure it stands for is the kind that
      appears in front of a client and not in a test: a strip that silently
      overprints looks fine until somebody tries to read the date off it.
    */
    const legend = Array.from({ length: 40 }, () => ({ role: 'plot' as never, label: 'A row' }));
    expect(() =>
      paperFurniture({
        title: 'Site plan',
        number: 'A-001',
        scale: 200,
        meta: META,
        facts: [],
        legend,
        north: true,
      }),
    ).toThrow(/no room for its issue block/);
  });
});
