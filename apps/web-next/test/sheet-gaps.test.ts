import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { engineNote } from '../src/lib/engine-notes.js';

/*
  What the affection plan does not print is listed on the sheet step as a finding,
  and on /ar/studio it was a paragraph of English — DDA 5134565's FAR gap among them.
  This app does not depend on `@envelope/intake`, and must not for a test, so the
  sentences are read out of the reader's source: every literal given to `absent()`
  as its consequence. A new gap sentence there with no Arabic here fails.
*/
const source = readFileSync(
  fileURLToPath(new URL('../../../packages/intake/src/affection-plan.ts', import.meta.url)),
  'utf8',
);

function gapSentences(): readonly string[] {
  const out: string[] = [];
  let at = source.indexOf('absent(');
  while (at !== -1) {
    // The call ends at the first `);` that closes it: a line of its own, or the one-line form.
    const end = source.indexOf(');', at);
    const call = source
      .slice(at, end)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    const literals = [...call.matchAll(/'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)].map((m) =>
      (m[1] ?? m[2] ?? '').replace(/\$\{[^}]*\}/g, 'X'),
    );
    // absent(field, label, consequence…): the first two are names. Of the rest, a condition's
    // operands ('MAX. COVERAGE', '') are not sentences; a consequence ends in a full stop.
    out.push(...literals.slice(2).filter((s) => s.trim().endsWith('.')));
    at = source.indexOf('absent(', end);
  }
  return out;
}

describe('the sheet step says what the affection plan omits in Arabic', () => {
  const sentences = gapSentences();

  it('finds the gap sentences in the reader', () => {
    expect(sentences.length).toBeGreaterThanOrEqual(10);
  });

  it.each(sentences)('%s', (s) => {
    expect(engineNote(s, 'ar')).toMatch(/[؀-ۿ]/);
    expect(engineNote(s, 'en')).toBe(s);
  });

  it('keeps the figures the sheet stated', () => {
    const far = sentences.find((s) => s.startsWith('This sheet prints a maximum GFA'));
    expect(far).toBeDefined();
    expect(engineNote(far!, 'ar')).toContain('÷');
    const dda = sentences.find((s) => s.includes('SEE NOTES'));
    expect(engineNote(dda!, 'ar')).toMatch(/7\.5.*3/);
  });
});
