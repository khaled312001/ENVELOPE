/**
 * The twenty-five commissioned images, held to the document that commissions them.
 *
 * ---------------------------------------------------------------------------
 * WHY THE BRIEF IS THE AUTHORITY AND THE CODE IS THE COPY.
 *
 * `docs/06-plan/image-prompts.md` says what each drawing will show, at what size,
 * and what a screen reader says instead of it — in both languages, beside the
 * prompt that produces it. The person writing "two of them are left unconnected"
 * into a prompt is the person who knows what the picture will contain, and they
 * are writing the alt text in the same sitting.
 *
 * The code needs the same three facts: a closed union of names, a size per name
 * so the box does not reflow, and the two dictionaries. Every one of those is a
 * COPY, and a copy that can drift is the failure here — not a missing image. An
 * image described as something it no longer shows is worse than one with no
 * description: the second is a gap a reader can tell is a gap.
 *
 * So this file re-derives all three from the brief and compares. It fails on a
 * drawing that was re-briefed without its description following, on a name the
 * brief does not commission, on a size typed from memory, and on a dictionary
 * that lost an entry.
 *
 * ---------------------------------------------------------------------------
 * NONE OF THE FILES EXIST. That is not what is being tested.
 *
 * The images are commissioned and none has been delivered, so every slot renders
 * nothing — silently, by construction, which `img.tsx` argues at length. What is
 * tested here is the COMMISSION: that when a file lands under one of these names
 * it arrives at a slot that already knows its size and can describe it.
 */

import { readFileSync, readdirSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { IMAGE_SIZE, type ImageName } from '../src/img.js';
import { AR } from '../src/i18n/imagery.ar.js';
import { EN } from '../src/i18n/imagery.en.js';
import { expectNoBannedVocabulary, expectNoComplianceClaim } from './prohibitions.js';

const BRIEF = readFileSync(
  new URL('../../../docs/06-plan/image-prompts.md', import.meta.url),
  'utf8',
).replace(/\r\n/g, '\n');

/** `**Size:** 480 × 320`, wherever it appears — in an entry or above a section. */
const SIZES = [...BRIEF.matchAll(/\*\*Size:\*\*[^\n]*?(\d{2,4}) × (\d{2,4})/g)].map((m) => ({
  at: m.index,
  width: Number(m[1]),
  height: Number(m[2]),
}));

interface Commissioned {
  readonly name: string;
  readonly decorative: boolean;
  readonly en: string;
  readonly ar: string;
  readonly width: number;
  readonly height: number;
}

/**
 * The brief, read the way a reader reads it.
 *
 * A size stated inside an entry wins; otherwise the nearest one stated ABOVE it
 * applies, which is how the document is written — "**Size:** 640 × 480 unless
 * stated" heads the five landing figures and "480 × 320" heads the nine step
 * explainers. Inheriting rather than requiring one per entry is what keeps this
 * test reading the document instead of a version of it.
 */
function commissioned(): readonly Commissioned[] {
  const heads = [...BRIEF.matchAll(/^### #(\d+) — `([a-z0-9.-]+)\.(?:svg|png)`/gm)];
  return heads.map((head, i) => {
    const start = head.index;
    const end = i + 1 < heads.length ? heads[i + 1]!.index : BRIEF.length;
    const block = BRIEF.slice(start, end);

    const alt = (tag: string): string => {
      const m = new RegExp(`^\\*\\*alt \\(${tag}\\):\\*\\* ([\\s\\S]*?)(?=\\n\\*\\*|\\n\\n|\\n---)`, 'm').exec(
        block,
      );
      return m ? m[1]!.split(/\s+/).join(' ') : '';
    };

    const decorative = /^\*\*alt:\*\* decorative/m.test(block);
    const inner = SIZES.find((s) => s.at >= start && s.at < end);
    const above = [...SIZES].reverse().find((s) => s.at < start);
    const size = inner ?? above;
    if (!size) throw new Error(`${head[2]}: the brief states no size, here or above`);

    return {
      name: head[2]!,
      decorative,
      en: decorative ? '' : alt('en'),
      ar: decorative ? '' : alt('ar'),
      width: size.width,
      height: size.height,
    };
  });
}

const BRIEFED = commissioned();

/**
 * The one name that reads the same in both languages, listed rather than
 * inferred. `mark` is the wordmark, and its alt text is the product's name; a
 * rule like "exempt anything under eight characters" would quietly exempt the
 * next short sentence somebody writes.
 */
const SAME_IN_BOTH: readonly string[] = ['mark'];

describe('the commissioned images', () => {
  it('are read out of the brief, all twenty-five', () => {
    expect(BRIEFED.length).toBe(25);
    for (const image of BRIEFED) {
      expect(image.width, `${image.name}: width`).toBeGreaterThan(0);
      expect(image.height, `${image.name}: height`).toBeGreaterThan(0);
      if (!image.decorative) {
        expect(image.en.length, `${image.name}: the brief writes no English alt text`).toBeGreaterThan(0);
        expect(image.ar.length, `${image.name}: the brief writes no Arabic alt text`).toBeGreaterThan(0);
      }
    }
  });

  it('are the same set the code knows about, in the same order', () => {
    expect(Object.keys(EN)).toEqual(BRIEFED.map((i) => i.name));
    expect(Object.keys(AR)).toEqual(Object.keys(EN));
    expect(Object.keys(IMAGE_SIZE)).toEqual(Object.keys(EN));
  });

  it('are described in the words the brief writes, in both languages', () => {
    for (const image of BRIEFED) {
      const name = image.name as ImageName;
      expect(EN[name], `${image.name} (en)`).toBe(image.en);
      expect(AR[name], `${image.name} (ar)`).toBe(image.ar);
    }
  });

  /*
    A DECORATIVE IMAGE CARRIES THE EMPTY STRING, WHICH IS NOT THE SAME AS NO ALT.
    An image with no `alt` attribute is announced by its filename; `alt=""` is
    skipped. `Illustration` adds `aria-hidden` on top when the string is empty,
    and never when it is not — a described image nobody can reach is the other
    half of this mistake.
  */
  it('carry an empty description exactly where the brief says decorative', () => {
    const decorative = BRIEFED.filter((i) => i.decorative).map((i) => i.name);
    expect(decorative).toEqual(['lp-hero-backdrop', 'auth-panel', 'dashboard-backdrop']);
    for (const image of BRIEFED) {
      const name = image.name as ImageName;
      expect(EN[name] === '', `${image.name} (en) is empty`).toBe(image.decorative);
      expect(AR[name] === '', `${image.name} (ar) is empty`).toBe(image.decorative);
    }
  });

  it('are drawn at the size the brief states', () => {
    for (const image of BRIEFED) {
      expect(IMAGE_SIZE[image.name as ImageName], image.name).toEqual([image.width, image.height]);
    }
  });

  /*
    The two languages must differ, because the failure this catches is a
    translation pass that stopped early and left the English in place — which is
    invisible on screen, since alt text is never painted.
  */
  it('say something different in Arabic', () => {
    for (const image of BRIEFED) {
      if (image.decorative || SAME_IN_BOTH.includes(image.name)) continue;
      const name = image.name as ImageName;
      expect(AR[name], `${image.name}: the Arabic is the English`).not.toBe(EN[name]);
      expect(/[؀-ۿ]/.test(AR[name]), `${image.name}: no Arabic letters`).toBe(true);
    }
  });

  /*
    Alt text stands in for a picture, so it is prose and is held to the
    prohibitions every other sentence on this site is held to. It is the only
    prose that `stripTags` cannot see — the attribute goes away with the tag it
    sits in — so this is the one place it is read.
  */
  it('are prose this site is allowed to say', () => {
    for (const image of BRIEFED) {
      if (image.decorative) continue;
      const name = image.name as ImageName;
      expectNoBannedVocabulary(EN[name], `${image.name} (en)`);
      expectNoComplianceClaim(EN[name], `${image.name} (en)`);
      expectNoComplianceClaim(AR[name], `${image.name} (ar)`);
    }
  });
});

/**
 * WHERE EACH ONE IS WIRED, AND WHY THE REST ARE NOT.
 *
 * A slot with no call site is a drawing that will be delivered, paid for, and
 * never rendered — and it fails silently in both directions, because the file
 * is absent too. Nothing on screen changes when a commissioned image has nowhere
 * to go, which is why this is a test and not a note.
 *
 * The unwired ones are listed with the reason each is unwired, so the list is a
 * record rather than a backlog nobody rereads. Three of them wait on screens
 * that do not exist; §6.1 of the plan is explicit that a route is built before it
 * is routed, so the images for `/projects` and `/settings/members` wait with
 * them. Two are not site images at all.
 */
describe('where the commissioned images are wired', () => {
  /*
    THE CATALOGUE FILES NAME EVERY IMAGE AND RENDER NONE. `img.tsx` holds the
    union and the size table and the two dictionaries hold the descriptions, so
    reading them would make every name look wired and this test would assert
    nothing at all.
  */
  const CATALOGUE = /^(img\.tsx|imagery\.(en|ar)\.ts)$/;

  /** Every source file under `apps/web/src`, so a call site anywhere counts. */
  const sources = ((dir: URL): readonly string[] => {
    const out: string[] = [];
    const walk = (at: URL): void => {
      for (const entry of readdirSync(at, { withFileTypes: true })) {
        const next = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, at);
        if (entry.isDirectory()) walk(next);
        else if (/\.tsx?$/.test(entry.name) && !CATALOGUE.test(entry.name)) {
          out.push(readFileSync(next, 'utf8'));
        }
      }
    };
    walk(dir);
    return out;
  })(new URL('../src/', import.meta.url));

  /**
   * Not wired, and the reason. A name leaves this list by being rendered, never
   * by being deleted from it: removing a row makes the test demand a call site.
   */
  const NOT_WIRED: Readonly<Record<string, string>> = {
    'og-cover':
      'the social card: it belongs in an og:image meta, and index.html declares none yet',
    mark: 'the wordmark is drawn in code today; replacing it is its own decision',
    'empty-projects': '/projects is not built, and a route is built before it is routed',
    'empty-shared': '/projects is not built',
    'empty-members':
      '/settings/members is not built, and /workspace has no "only the owner" state to hang it on',
    'guide-cover': 'the cover of the delivered user guide, which is not this site',
  };

  it('is a call site, or a named reason', () => {
    for (const image of BRIEFED) {
      /*
        A `name=` PROP OR A SINGLE-QUOTED TABLE ENTRY, never a bare substring.
        `.mark` is a CSS class on the wordmark's inline SVG, and a plain search
        for the string called `mark` wired because of it - the shape of a vacuous
        pass. `className=` does not match `name=`, because of the capital N.
      */
      const used = sources.some(
        (src) =>
          src.includes(`name="${image.name}"`) || src.includes(`'${image.name}'`),
      );
      const excused = Object.prototype.hasOwnProperty.call(NOT_WIRED, image.name);
      expect(
        used || excused,
        `${image.name} is commissioned, rendered nowhere, and has no reason recorded in NOT_WIRED`,
      ).toBe(true);
      expect(
        !(used && excused),
        `${image.name} is rendered and still listed as not wired: ${NOT_WIRED[image.name]}`,
      ).toBe(true);
    }
  });

  it('accounts for every name in the reason list', () => {
    const briefed = new Set(BRIEFED.map((i) => i.name));
    for (const name of Object.keys(NOT_WIRED)) {
      expect(briefed.has(name), `${name} is not commissioned by the brief`).toBe(true);
    }
  });
});
