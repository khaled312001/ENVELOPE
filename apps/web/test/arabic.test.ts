/**
 * THE ARABIC, HELD TO THE GLOSSARY BY A MACHINE WHERE A MACHINE CAN.
 *
 * `docs/05-design/arabic-glossary.md` §7 lists nine things a reviewer checks. Some
 * need a reader: whether a domain term carries its trade meaning, whether ة and ه
 * are right. The rest are mechanical, and a check a machine can make and nobody runs
 * is the vacuous pass this codebase refuses everywhere else. This file runs them over
 * every Arabic module on the site — every `*.ar.ts` under `src/i18n` and every
 * `*.ar.tsx` under `src/content` — found by listing the directories, so a new
 * dictionary is scanned the day it lands rather than the day somebody adds it here.
 *
 * Over the SOURCE, with comments stripped: comments in these files discuss the
 * rejected words in order to reject them.
 */

import { readdirSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const DIRS = ['../src/i18n/', '../src/content/'].map((d) => new URL(d, import.meta.url));

const MODULES = DIRS.flatMap((dir) =>
  readdirSync(dir)
    .filter((f) => /\.ar\.tsx?$/.test(f))
    .map((f) => ({
      file: f,
      code: readFileSync(new URL(f, dir), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, ''),
    })),
);

/** Arabic words only need a boundary that is not an Arabic letter. */
const word = (w: string): RegExp => new RegExp(`(^|[^\\u0600-\\u06FF])${w}(?=$|[^\\u0600-\\u06FF])`, 'u');

describe('the Arabic dictionaries', () => {
  it('are found', () => {
    // An empty list would make every assertion below pass.
    expect(MODULES.length).toBeGreaterThan(3);
  });

  it('carry no Arabic-Indic digit (§7 item 5)', () => {
    for (const m of MODULES) {
      expect(m.code, `${m.file} uses an Arabic-Indic digit`).not.toMatch(/[٠-٩۰-۹]/);
    }
  });

  it('carry no colloquial word (§5)', () => {
    const colloquial = [
      'مش', 'مفيش', 'مافي', 'عشان', 'علشان', 'دلوقتي', 'هلق', 'كده', 'هيك', 'إزاي', 'ازاي',
      'ليه', 'بيحسب', 'بيقول', 'اللي', 'بتاع', 'بتاعة',
    ];
    for (const m of MODULES) {
      for (const w of colloquial) {
        expect(word(w).test(m.code), `${m.file} uses the colloquial «${w}»`).toBe(false);
      }
    }
  });

  it('never hedges (§3): no «ربما», and no «قد» before a present-tense verb', () => {
    for (const m of MODULES) {
      expect(word('ربما').test(m.code), `${m.file} uses «ربما»`).toBe(false);
      // «قد» before a past verb is emphasis («فقد كانت»); before a present verb it is
      // "may", which in a refusal is a claim.
      expect(m.code, `${m.file} hedges with «قد» + present`).not.toMatch(
        /(^|[^؀-ۿ])قد\s+[يتنأ][؀-ۿ]*(?=$|[^؀-ۿ])/u,
      );
    }
  });

  it('speaks of the product in the third person (§3): no «نحن»', () => {
    for (const m of MODULES) {
      expect(word('نحن').test(m.code), `${m.file} uses «نحن»`).toBe(false);
    }
  });

  it('never predicates «مطابق» of an output (§2): every use is negated', () => {
    const negation = /(ليس|ليست|لا|غير|ولا|وليس|بلا|دون)\s+([؀-ۿ]+\s+){0,2}$/u;
    for (const m of MODULES) {
      for (const hit of m.code.matchAll(/[؀-ۿ]*مطابق[؀-ۿ]*/gu)) {
        const before = m.code.slice(Math.max(0, (hit.index ?? 0) - 40), hit.index);
        expect(negation.test(before), `${m.file}: «${hit[0]}» unnegated after «${before.trim()}»`).toBe(true);
      }
    }
  });

  it('calls the professional licence «الرخصة», never «الترخيص» (§6)', () => {
    // «تراخيص» is Trakhees. A licence field named with the authority's word reads as
    // though the number had been checked with it, and nothing here checks it. The
    // pages disagreed on this word until this test existed.
    for (const m of MODULES) {
      const hit = /(^|[^؀-ۿ])[وبل]?(ال)?ترخيص[؀-ۿ]*/u.exec(m.code);
      expect(hit?.[0].trim(), `${m.file} says «${hit?.[0].trim() ?? ''}»`).toBeUndefined();
    }
  });

  it('never calls an assumption «افتراضي» (§2) — that word is "default"', () => {
    // «افتراضي» is permitted only where the sentence means default and denies one:
    // «لا قيمة افتراضية». Anywhere else it is ASSUMED mistranslated as the one thing
    // this codebase forbids having.
    for (const m of MODULES) {
      for (const hit of m.code.matchAll(/[؀-ۿ]*افتراضي[؀-ۿ]*/gu)) {
        const before = m.code.slice(Math.max(0, (hit.index ?? 0) - 30), hit.index);
        expect(/(لا|ولا|بلا|دون|ليس|ليست)\s+([؀-ۿ]+\s+){0,2}$/u.test(before), `${m.file}: «${hit[0]}» after «${before.trim()}»`).toBe(true);
      }
    }
  });
});

/*
  NO DIACRITICS, AND NOW SOMETHING CHECKS — §5, in the client's own words:
  "No diacritics. None."

  It was checked over the printed user guide (`scripts/guide/build.mjs`) and over
  nothing the site itself ships, so the app carried forty-three of them in live
  copy: the map panel said «تتبّع» in its own title and the landing page's five
  steps were vowelled throughout. A reader who does not read vowelled text reads
  them as noise, and this is the one rule the client stated twice.

  Over EVERY Arabic surface, not only the dictionaries, because Landing.tsx
  carries its own five bilingual strings inline — which is exactly where this
  went unseen.

  U+0640 (tatweel) is not matched: it is a letter-stretching character, and a
  rule that caught it would fail on type nobody set wrong. The .en.ts files are
  not scanned either: Arabic inside them is evidence quoted verbatim — the
  client's own words in `parking.en.ts`, the retired wording in `readiness.en.ts`
  — and evidence keeps its marks.
*/
describe('no diacritics anywhere the site prints Arabic (§5)', () => {
  const MARKS = /[ً-ْٰ]/gu;
  const SURFACES = ['../src/i18n/', '../src/content/', '../src/screens/', '../src/components/'].map(
    (d) => new URL(d, import.meta.url),
  );
  const FILES = SURFACES.flatMap((dir) =>
    readdirSync(dir, { withFileTypes: true })
      .filter((f) => f.isFile() && /\.tsx?$/.test(f.name) && !/\.en\.tsx?$/.test(f.name))
      .map((f) => ({
        file: f.name,
        code: readFileSync(new URL(f.name, dir), 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/^\s*\/\/.*$/gm, ''),
      })),
  );

  it('scans every surface', () => {
    expect(FILES.length).toBeGreaterThan(40);
  });

  it('prints not one mark', () => {
    const found: string[] = [];
    for (const f of FILES) {
      for (const hit of f.code.matchAll(MARKS)) {
        const at = hit.index ?? 0;
        found.push(`${f.file}: …${f.code.slice(Math.max(0, at - 24), at + 24).replace(/\n/g, ' ')}…`);
      }
    }
    // Where a word needs its marks to be read, the word changes — «لم يقيم» for
    // «لم يُقيَّم» became «لم يخضع للتقييم». Stripping the marks off that one
    // would have shipped "he did not stay".
    expect(found.slice(0, 8).join('\n')).toBe('');
  });
});
