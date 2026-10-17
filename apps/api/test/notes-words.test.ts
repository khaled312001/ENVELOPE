import { Decimal } from '@envelope/core';
import { runPipeline, type RunInput } from '@envelope/capacity';
import { initGeometry } from '@envelope/geometry';
import { engineNote } from '@envelope/report/words';
import { SEED_RULES } from '@envelope/rules';
import { describe, expect, it } from 'vitest';

import { RECT_120x80, RECT_80x40, runInput } from '../../../test-support/pipeline.js';

/*
  The sentences the trust pass (Oct 2026) made true are sentences a reader sees
  under every drawing, in the study report and on the Arabic site. Each is held
  here to the dictionary in `@envelope/report/words`, from a REAL run, so a
  wording the engine changes and the dictionary does not fails here rather than
  arriving in English on an Arabic page. And each keeps its figures: an Arabic
  sentence that drops the 0.90 m or the 3.70 m tells the reader less than the
  English does.
*/

// At collection, not in `beforeAll`: the sentences are the test table.
await initGeometry();

const ARABIC = /[؀-ۿ]/;

function said(text: string): { en: string; ar: string } {
  const ar = engineNote(text, 'ar');
  const en = engineNote(text, 'en');
  expect(ar, text).not.toBeNull();
  expect(en, text).not.toBeNull();
  expect(ar!).toMatch(ARABIC);
  return { en: en!, ar: ar! };
}

/** Every figure the English carries is in the Arabic, rule numbers aside. */
function keepsFigures(text: string, ar: string): void {
  const figures = text.match(/\d+(?:\.\d+)?/g) ?? [];
  for (const f of figures) {
    if (new RegExp(`[A-Z]\\.?[\\d.]*${f.replace('.', '\\.')}`).test(text)) continue; // B.8.5.2.3, H.5.5.3, G.7.2.3
    if (/§[\d.]*/.test(text) && text.includes(`§${f}`)) continue;
    expect(ar, `${f} missing from: ${ar}`).toContain(f);
  }
}

const GAP: RunInput['columnGapStatement'] = {
  statementId: 'STMT-TEST-COLUMN-GAP',
  statedBy: 'a named practitioner',
  statedOn: '2026-10-16',
  verbatim: 'half a metre after every three bays',
  gapM: new Decimal('0.5'),
};

describe('the sentences under the drawings, in both languages', () => {
  const runs = [
    runPipeline(runInput(RECT_120x80)),
    runPipeline(runInput(RECT_80x40, { columnGapStatement: GAP })),
    runPipeline(runInput(RECT_80x40, { levelPlan: { structuralGridM: new Decimal('8') } })),
    runPipeline(
      runInput(RECT_80x40, {
        levelSchedule: { basements: 2, groundIsParking: false, podiumAboveGround: 0, podiumParkingLevels: 0 },
      }),
    ),
  ];
  const sentences = [
    ...new Set(
      runs.flatMap((r) =>
        r.building.notModelled.filter((n) =>
          /^(No column is drawn|Clear height|Escape distances|Bicycle parking|The refuse room)/.test(n),
        ),
      ),
    ),
  ];

  it('include every new kind', () => {
    for (const start of ['No column is drawn', 'Clear height on the parking levels', 'Clear height, in conflict', 'Escape distances', 'Bicycle parking', 'The refuse room']) {
      expect(sentences.some((s) => s.startsWith(start)), start).toBe(true);
    }
    // The three column modes, each its own sentence.
    expect(sentences.filter((s) => s.startsWith('No column is drawn'))).toHaveLength(3);
  });

  it.each(sentences)('is said in Arabic with its figures: %s', (s) => {
    const { ar } = said(s);
    keepsFigures(s, ar);
  });
});

describe('the core reconciliation, as an open question in both languages', () => {
  it('says both figures and the question, never that one of them must be revised', () => {
    const out = runPipeline(runInput(RECT_80x40));
    const [saleable] = out.core.reconciliation;
    const { en, ar } = said(saleable!);
    expect(en).toMatch(/open question/);
    expect(en).not.toMatch(/needs revising/);
    expect(ar).toMatch(/سؤال مفتوح/);
    expect(ar).not.toMatch(/يحتاج مراجعة/);
    keepsFigures(saleable!.split('compared on this GFA: ')[1]!.split('. The core alone')[0]!, ar);
  });
});

describe('the deferred-check labels of the records this pass added', () => {
  it('names every new parameter in both languages', () => {
    const added = SEED_RULES.filter((r) => r.parameterId.startsWith('egress.') || r.ruleId.startsWith('R-DBC-B53-'));
    for (const r of added) {
      said(r.parameterId);
      if (r.isLifeSafety) said(`${r.parameterId} [LIFE SAFETY]`);
    }
  });

  it('says the refusal of a DERIVED saleable figure without its instrument', () => {
    let message = '';
    try {
      runPipeline(runInput(RECT_80x40, { saleableEfficiency: { value: new Decimal('0.93'), source: 'DERIVED' } }));
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toMatch(/must name the instrument/);
    said(message);
  });
});
