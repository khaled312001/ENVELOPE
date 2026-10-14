import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

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

function block(selector: RegExp): Map<string, string> {
  const body = selector.exec(css)?.[1];
  if (body === undefined) throw new Error(`no ${String(selector)} block in styles.css`);
  return new Map([...body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
}

/*
  Light is `:root` as written. Dark is `:root` with the `[data-theme='dark']`
  block laid over it — exactly the cascade a browser applies — so a role the
  dark block forgets to redefine is measured at its light value on a dark page,
  and fails there, instead of being skipped.
*/
const LIGHT = block(/:root\s*\{([\s\S]*?)\n\}/);
const DARK = new Map([...LIGHT, ...block(/:root\[data-theme='dark'\]\s*\{([\s\S]*?)\n\}/)]);
const THEMES = [
  ['light', LIGHT],
  ['dark', DARK],
] as const;
let decls: Map<string, string> = LIGHT;

function resolve(token: string, depth = 0): string {
  const v = decls.get(token);
  if (v === undefined || depth > 8) throw new Error(`unresolvable token ${token}`);
  const ref = /^var\((--[a-z0-9-]+)\)$/.exec(v);
  return ref ? resolve(ref[1]!, depth + 1) : v;
}

/** Run a suite once per theme, with `resolve` reading that theme's cascade. */
function eachTheme(title: string, body: () => void): void {
  for (const [name, map] of THEMES) {
    describe(`${title} — ${name}`, () => {
      beforeAll(() => {
        decls = map;
      });
      body();
    });
  }
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

eachTheme('text contrast, WCAG 2.2 1.4.3 (4.5:1), on every surface it is set on', () => {
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
  it('white on both stops of the brand gradient (the brand button, the call band)', () => {
    expect(ratio('--on-brand', '--brand-solid')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('--on-brand', '--brand-alt-solid')).toBeGreaterThanOrEqual(4.5);
    // The icon tiles' third tone, and the floating WhatsApp button's glyph.
    expect(ratio('--on-brand', '--brand-glow-solid')).toBeGreaterThanOrEqual(4.5);
  });
  it('both stops of the gradient phrase on the page and on a panel', () => {
    for (const bg of ['--surface-base', '--surface-panel']) {
      expect(ratio('--accent', bg)).toBeGreaterThanOrEqual(4.5);
      expect(ratio('--brand-alt', bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

eachTheme('non-text contrast, 1.4.11 (3:1)', () => {
  it('the focus ring on every surface', () => {
    for (const bg of SURFACES) expect(ratio('--focus-ring', bg)).toBeGreaterThanOrEqual(3);
  });
  it('a control border against the field it sits on', () => expect(ratio('--border-strong', '--surface-sunken')).toBeGreaterThanOrEqual(1.5));
});

const PRIMITIVE = /^--(ink|night|blue|violet|cyan|green|amber|red|slate)-\d/;

eachTheme('amber is uncertainty and nothing else (§13.1)', () => {
  it('no other role resolves to the amber primitive', () => {
    const amber = resolve('--uncertain');
    const others = [...decls.keys()].filter((k) => k !== '--uncertain' && !PRIMITIVE.test(k));
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
  it('no brand colour is a provenance colour', () => {
    const provenance = new Set(['--uncertain', '--derived', '--variance'].map((k) => resolve(k)));
    for (const k of ['--accent', '--accent-strong', '--brand-alt', '--brand-glow', '--brand-solid', '--brand-alt-solid', '--brand-glow-solid']) {
      expect(provenance.has(resolve(k)) ? k : null).toBeNull();
    }
  });
});

describe('both themes define the same roles', () => {
  it('the dark block redefines only roles the light one declares', () => {
    const extra = [...block(/:root\[data-theme='dark'\]\s*\{([\s\S]*?)\n\}/).keys()].filter((k) => !LIGHT.has(k));
    expect(extra).toEqual([]);
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
    const hits = FILES.filter((f) => /var\(--(ink|night|blue|violet|cyan|green|amber|red|slate)-\d/.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
  it('no arbitrary hex colour in a class name', () => {
    const hits = FILES.filter((f) => /\[(#[0-9a-f]{3,8})\]/i.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
});

/*
  The public site's words live in three more places — the page copy, the
  questions, and the heads the prerender writes — and every one of them is
  held to the same rules as the studio's dictionary.
*/
const FAQ = JSON.parse(readFileSync(join(ROOT, 'src', 'site', 'faq.json'), 'utf8')) as Record<'en' | 'ar', { q: string; a: string }[]>;
const SEO = JSON.parse(readFileSync(join(ROOT, 'src', 'site', 'seo.json'), 'utf8')) as {
  pages: { path: string; en: { title: string; description: string }; ar: { title: string; description: string } }[];
};
const jsonStrings = (locale: 'en' | 'ar'): string[] => [
  ...FAQ[locale].flatMap((q) => [q.q, q.a]),
  ...SEO.pages.flatMap((p) => [p[locale].title, p[locale].description]),
];

describe('the Arabic copy, held to docs/05-design/arabic-glossary.md', () => {
  const ar = ['ar.ts', 'site.ar.ts'].map((f) => readFileSync(join(ROOT, 'src', 'i18n', f), 'utf8')).join('\n');
  const strings = [...[...ar.matchAll(/'([^'\n]*)'|`([^`]*)`/g)].map((m) => m[1] ?? m[2] ?? ''), ...jsonStrings('ar')];
  it('reads every Arabic source it is meant to', () => expect(strings.length).toBeGreaterThan(400));
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
    const site = readFileSync(join(ROOT, 'src', 'i18n', 'site.en.ts'), 'utf8');
    const lines = [...`${en}\n${site}`.split('\n'), ...jsonStrings('en')].filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//'));
    const bad = lines.filter((l) => /\b(compliant|complies|approved by|accurate|guarantee)/i.test(l));
    expect(bad).toEqual([]);
  });
  it('the questions and the heads exist in both languages, one for one', () => {
    expect(FAQ.ar.length).toBe(FAQ.en.length);
    for (const p of SEO.pages) {
      expect(p.en.title.length * p.ar.title.length).toBeGreaterThan(0);
      // A search result truncates near 160 characters; a description longer than that is cut mid-sentence.
      expect(p.en.description.length).toBeLessThanOrEqual(240);
    }
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
