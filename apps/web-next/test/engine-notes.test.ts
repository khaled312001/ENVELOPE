import { describe, expect, it } from 'vitest';

import worked from '../../web/src/screens/worked-example.json' with { type: 'json' };
import { engineNote } from '../src/lib/engine-notes.js';

/*
  The parking page shows every sentence the worked example's layout and access
  recommendation wrote. A sentence engine-notes does not recognise falls back to
  the engine's English — correct, but on /ar/parking it is a paragraph of English
  in an Arabic page. So a re-run of `pnpm example --write` that brings a new
  wording fails here rather than on the page.
*/
const v = worked.verified;
const sentences = [
  ...v.levelPlan.notAssessed,
  v.access.recommended.rationale,
  ...v.access.candidates.map((c) => c.rationale),
  ...v.access.rejected.map((r) => r.reason),
];

describe('the engine sentences on the parking page', () => {
  it.each(sentences)('are said in both languages: %s', (s) => {
    expect(engineNote(s, 'ar')).toMatch(/[؀-ۿ]/);
    expect(engineNote(s, 'en')).not.toBeNull();
  });

  it('keep every figure the engine wrote', () => {
    for (const s of sentences) {
      const ar = engineNote(s, 'ar') ?? '';
      // A meeting timestamp (34:37) is a citation, not a figure. And the sweep's
      // losers carry their refusals in brackets: the short form says each loser's
      // count and drops the reason, which stays in the report and the derivation.
      const said = s.startsWith('Laid out as ')
        ? s.replace(/\((?:[^()]|\([^()]*\))*\)/g, '')
        : s;
      const figures = said.replace(/\d+:\d+/g, '').match(/\d+(?:\.\d+)?(?: × \d+(?:\.\d+)?)?/g) ?? [];
      // Rule numbers (B.7.2.1) are kept; a figure the short form drops on purpose is not a loss.
      for (const f of figures.filter((x) => !/^7\.2|^0$/.test(x))) {
        if (s.includes(`B.${f}`)) continue;
        expect(ar, `${f} missing from: ${ar}`).toContain(f);
      }
    }
  });

  it('leave an unknown sentence to the engine', () => {
    expect(engineNote('A sentence the engine has not written yet.', 'ar')).toBeNull();
  });
});
