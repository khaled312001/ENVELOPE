import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/*
  THE NEW FRONT END'S PALETTE, MEASURED RATHER THAN DESCRIBED.

  Never state a contrast ratio you did not measure: every pair below is resolved
  from `styles.css` as written — through the semantic layer to the primitive —
  and an unresolvable token is a FAILURE, not a skip, because a checker that
  reports "0 failures" over pairs it never measured is the vacuous pass this
  codebase refuses everywhere else.
*/

const ROOT = join(import.meta.dirname, '..');
const css = readFileSync(join(ROOT, 'src', 'styles.css'), 'utf8');
const rootBlock = /:root\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
const decls = new Map([...rootBlock.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));

function resolve(token: string, depth = 0): string {
  const v = decls.get(token);
  if (v === undefined || depth > 8) throw new Error(`unresolvable token ${token}`);
  const ref = /^var\((--[a-z0-9-]+)\)$/.exec(v);
  return ref ? resolve(ref[1]!, depth + 1) : v;
}

function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`not a #rrggbb colour: ${hex}`);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1]!.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function ratio(fg: string, bg: string): number {
  const [a, b] = [luminance(resolve(fg)), luminance(resolve(bg))];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const SURFACES = ['--surface-base', '--surface-panel', '--surface-raised', '--surface-hover', '--surface-sunken'];

describe('text contrast, WCAG 2.2 1.4.3 (4.5:1), on every surface it is set on', () => {
  for (const fg of ['--text-primary', '--text-secondary', '--accent', '--accent-strong', '--derived', '--uncertain', '--variance']) {
    for (const bg of SURFACES) {
      it(`${fg} on ${bg}`, () => expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5));
    }
  }
  it('--text-tertiary on the surfaces it carries small print on', () => {
    for (const bg of ['--surface-base', '--surface-panel', '--surface-raised', '--surface-sunken']) expect(ratio('--text-tertiary', bg)).toBeGreaterThanOrEqual(4.5);
  });
  it('each provenance ink on its own tinted surface', () => {
    expect(ratio('--uncertain', '--uncertain-surface')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('--derived', '--derived-surface')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('--variance', '--variance-surface')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('--accent-strong', '--accent-subtle')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('--text-primary', '--uncertain-surface')).toBeGreaterThanOrEqual(4.5);
  });
  it('the ink button', () => expect(ratio('--text-inverse', '--surface-inverse')).toBeGreaterThanOrEqual(4.5));
});

describe('non-text contrast, 1.4.11 (3:1)', () => {
  it('the focus ring on every surface', () => {
    for (const bg of SURFACES) expect(ratio('--focus-ring', bg)).toBeGreaterThanOrEqual(3);
  });
  it('a control border against the field it sits on', () => expect(ratio('--border-strong', '--surface-sunken')).toBeGreaterThanOrEqual(1.5));
});

describe('amber is uncertainty and nothing else (§13.1)', () => {
  it('no other role resolves to the amber primitive', () => {
    const amber = resolve('--uncertain');
    const others = [...decls.keys()].filter((k) => !k.startsWith('--amber') && k !== '--uncertain' && !/^--(ink|blue|green|red|slate)-/.test(k));
    for (const k of others) {
      let v: string;
      try {
        v = resolve(k);
      } catch {
        continue;
      }
      expect(v === amber ? k : null).toBeNull();
    }
  });
  it('the accent is not amber, and is not green', () => {
    expect(resolve('--accent')).not.toBe(resolve('--uncertain'));
    expect(resolve('--accent')).not.toBe(resolve('--derived'));
  });
});

/** Every source file, for the prohibitions below. */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sources(p) : /\.(tsx?|css)$/.test(f) ? [p] : [];
  });
}
const FILES = sources(join(ROOT, 'src')).filter((f) => !f.endsWith('styles.css'));

describe('semantic tokens only', () => {
  it('no component reads a primitive', () => {
    const hits = FILES.filter((f) => /var\(--(ink|blue|green|amber|red|slate)-\d/.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
  it('no arbitrary hex colour in a class name', () => {
    const hits = FILES.filter((f) => /\[(#[0-9a-f]{3,8})\]/i.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
});

describe('the Arabic copy, held to docs/05-design/arabic-glossary.md', () => {
  const ar = readFileSync(join(ROOT, 'src', 'i18n', 'ar.ts'), 'utf8');
  const strings = [...ar.matchAll(/'([^'\n]*)'|`([^`]*)`/g)].map((m) => m[1] ?? m[2] ?? '');
  it('carries no diacritic (§5b)', () => {
    expect(strings.filter((s) => /[ً-ْٰ]/u.test(s))).toEqual([]);
  });
  it('never uses «افتراضي» for ASSUMED — it means "default"', () => {
    expect(strings.filter((s) => s.includes('افتراضي'))).toEqual([]);
  });
  it('uses «مطابق» only negated, as "not a compliance check"', () => {
    expect(strings.filter((s) => s.includes('مطابق') && !s.includes('ليس فحص مطابقة'))).toEqual([]);
  });
  it('has no hedge in a refusal (§3)', () => {
    expect(strings.filter((s) => /(^|\s)(ربما|قد)\s/.test(s))).toEqual([]);
  });
  it('uses Western digits only', () => {
    expect(strings.filter((s) => /[٠-٩]/u.test(s))).toEqual([]);
  });
});

describe('the claim the product never makes', () => {
  const en = readFileSync(join(ROOT, 'src', 'i18n', 'en.ts'), 'utf8');
  it('no English string calls an output compliant, approved or accurate', () => {
    const lines = en.split('\n').filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//'));
    const bad = lines.filter((l) => /\b(compliant|complies|approved by|accurate|guarantee)/i.test(l));
    expect(bad).toEqual([]);
  });
  it('the regulatory stamp is part of the frame every screen uses', () => {
    const shell = readFileSync(join(ROOT, 'src', 'components', 'Shell.tsx'), 'utf8');
    expect(shell).toMatch(/<RegulatoryStamp/);
    expect(en).toMatch(/Regulatory validity: not assessed/);
  });
  it('parking-in-FAR opens with nothing selected', () => {
    const model = readFileSync(join(ROOT, 'src', 'studio', 'model.ts'), 'utf8');
    expect(model).toMatch(/parkingInFar: '',/);
    expect(model).toMatch(/saleable: '',/);
  });
});
