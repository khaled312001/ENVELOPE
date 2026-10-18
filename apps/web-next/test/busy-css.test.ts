import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/*
  A wait mark once moved on the dev server and stood still on plotlogic.dev. The
  release minifies its CSS with lightningcss, which rewrote a nameless
  `animation:` shorthand as `animation:none`. Nothing in a dev-server test can see
  that, so this runs the busy ring's rule through the minifier the build uses,
  resolved through Vite so the two cannot differ, and reads what comes out.
*/
const css = readFileSync(fileURLToPath(new URL('../src/styles.css', import.meta.url)), 'utf8');

const fromVite = createRequire(createRequire(import.meta.url).resolve('vite'));
const { transform } = fromVite('lightningcss') as {
  transform: (o: { filename: string; code: Uint8Array; minify: boolean }) => { code: Uint8Array };
};

describe('the busy ring, as the release minifies it', () => {
  it('keeps its name, timing and repetition', () => {
    const start = css.indexOf('.busy-ring {');
    expect(start, 'the .busy-ring rule').toBeGreaterThan(-1);
    const block = css.slice(start, css.indexOf('}', start) + 1);
    const out = new TextDecoder().decode(transform({ filename: 'busy.css', code: new TextEncoder().encode(block), minify: true }).code);
    expect(out).not.toMatch(/animation:none/);
    expect(out).toMatch(/busy-turn/);
    expect(out).toMatch(/infinite/);
    expect(css).toContain('@keyframes busy-turn {');
  });
});
