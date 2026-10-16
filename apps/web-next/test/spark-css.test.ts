import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/*
  The spark moved on the dev server and stood still on plotlogic.dev. The release
  minifies its CSS with lightningcss, which rewrote `.spark-path { animation: 2.8s
  … infinite }` (a shorthand with no name) as `animation:none`, dropping the
  timing that the per-star `animation-name` rules were meant to borrow. Nothing
  in a dev-server test can see that, so this runs the spark's rules through the
  minifier the build uses, resolved through Vite so the two cannot differ, and
  reads what comes out.
*/
const css = readFileSync(fileURLToPath(new URL('../src/styles.css', import.meta.url)), 'utf8');

const fromVite = createRequire(createRequire(import.meta.url).resolve('vite'));
const { transform } = fromVite('lightningcss') as {
  transform: (o: { filename: string; code: Uint8Array; minify: boolean }) => { code: Uint8Array };
};

function minifiedSpark(): string {
  const start = css.indexOf('.spark-path {');
  const end = css.indexOf('.spark-c {', start);
  expect(start, 'the .spark-path rule').toBeGreaterThan(-1);
  expect(end, 'the .spark-c rule after it').toBeGreaterThan(start);
  const block = css.slice(start, css.indexOf('}', end) + 1);
  return new TextDecoder().decode(transform({ filename: 'spark.css', code: new TextEncoder().encode(block), minify: true }).code);
}

describe('the spark, as the release minifies it', () => {
  it('keeps the timing on every star', () => {
    const out = minifiedSpark();
    const path = /\.spark-path\{([^}]*)\}/.exec(out)?.[1] ?? '';
    expect(path).not.toMatch(/animation:none/);
    expect(path).toMatch(/animation-duration:2\.8s/);
    expect(path).toMatch(/animation-iteration-count:infinite/);
  });

  it('names each star its own keyframes', () => {
    const out = minifiedSpark();
    for (const s of ['a', 'b', 'c']) expect(out).toContain(`.spark-${s}{animation-name:spark-${s}}`);
    for (const s of ['a', 'b', 'c']) expect(css).toContain(`@keyframes spark-${s} {`);
  });
});
