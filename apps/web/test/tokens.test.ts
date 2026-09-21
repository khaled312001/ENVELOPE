/**
 * The design tokens, held to WCAG 2.2 and to their own duplication.
 *
 * `pnpm contrast` measures the palette; this puts the same measurement in the
 * test suite, so a contrast regression fails `pnpm check` rather than waiting
 * for someone to remember the script exists.
 *
 * The second test is about a specific, boring failure mode. The dark palette is
 * declared twice — once under `prefers-color-scheme: dark` for readers who never
 * touched a toggle, once under `[data-theme='dark']` for readers who did — and
 * plain CSS gives no way to write those values once. So they drift: someone
 * fixes a contrast failure in the block their browser happened to be using, and
 * the other half of the users keep the old colour. That is exactly what had
 * happened here before this test existed.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const TOKENS = new URL('../src/styles/tokens.css', import.meta.url);
const SCRIPT = new URL('../../../scripts/contrast.mjs', import.meta.url);

function blockAfter(css: string, marker: string): Record<string, string> {
  const start = css.indexOf(marker);
  expect(start, `no block for ${marker}`).toBeGreaterThan(-1);
  let depth = 0;
  let i = css.indexOf('{', start);
  const from = i;
  for (; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) break;
  }
  const out: Record<string, string> = {};
  for (const m of css.slice(from, i).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out[m[1]!] = m[2]!.trim();
  }
  return out;
}

describe('design tokens', () => {
  it('meets WCAG 2.2 contrast on every pair the UI paints, in three themes', () => {
    // The script exits non-zero on any failure, so `execFileSync` throwing IS the
    // assertion; the checks below are what make the failure readable rather than a
    // stack trace, and what stop a green summary printed over a lane that did not
    // run.
    const output = execFileSync(process.execPath, [SCRIPT.pathname.replace(/^\/([A-Za-z]:)/, '$1')], {
      encoding: 'utf8',
    });
    expect(output).toMatch(/0 fail, unresolved, under or asserted/);
    expect(output).not.toMatch(/UNRESOLVED/);

    // PRINT IS A MEASURED THEME. CLAUDE.md says these reports are printed and
    // carried into rooms, which makes paper the medium with the highest stakes —
    // and it was the only one with no gate. A summary that says zero failures over
    // two themes when three are declared is the vacuous pass this file exists to
    // stop, so the theme's presence is asserted rather than assumed.
    expect(output).toMatch(/across three themes/);
    for (const theme of ['light', 'dark', 'print']) {
      expect(output, `${theme} rows are missing from the run`).toContain(`\n${theme} `);
    }

    // THE HOUSE LANE NEVER BORROWS THE WORD `pass`. It records a design contract —
    // "a plate must have a visible edge" — and it is never a conformance claim.
    const house = output.slice(output.indexOf('HOUSE ROWS'), output.indexOf('RECORDED EXCLUSIONS'));
    expect(house).toContain('held');
    expect(house).not.toContain(' pass ');

    // And an exclusion is PRINTED with its measured ratio rather than being absent.
    // An omission a reader cannot see is how a checker comes back green over a
    // palette it never read.
    expect(output).toContain('RECORDED EXCLUSIONS');
  });

  it('keeps the two dark palettes identical', () => {
    const css = readFileSync(TOKENS, 'utf8');
    const byPreference = blockAfter(css, ":root:not([data-theme='light'])");
    const byToggle = blockAfter(css, ":root[data-theme='dark']");

    expect(Object.keys(byToggle).sort()).toEqual(Object.keys(byPreference).sort());
    for (const [name, value] of Object.entries(byPreference)) {
      expect(byToggle[name], `${name} differs between the two dark blocks`).toBe(value);
    }
  });
});
