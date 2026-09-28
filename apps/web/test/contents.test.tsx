/**
 * The contents block, on all five long pages at once.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS ONE FILE AND NOT FIVE ASSERTIONS IN FIVE FILES.
 *
 * The block is one component reading one `order` array per page, and every way it
 * can be wrong is a disagreement between that array and the sections actually
 * rendered. That disagreement has exactly two shapes and both are silent:
 *
 *   A SECTION MISSING FROM `order`. `idx()` is `findIndex(...) + 1`, so a section
 *   whose id is not in the array renders its ordinal as `00` — and every section
 *   after it in the page keeps a plausible-looking number. `/refusals` shipped
 *   into this test with two of its thirteen sections missing from the array,
 *   found by a count and not by reading.
 *
 *   AN ENTRY IN `order` THAT NOTHING RENDERS. The contents then offers a link to
 *   an anchor that is not in the document, which scrolls nowhere and reports
 *   nothing. `/parking` gates six of its sections on whether a level plan was
 *   computed, so this is a live risk there rather than a theoretical one.
 *
 * Both are caught below by comparing the two sets, per page, over the real
 * render. Neither is caught by asserting that the block is present.
 */

import { readFileSync } from 'node:fs';

import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { StaticLocale } from '../src/i18n/locale.js';
import { Readiness } from '../src/screens/Readiness.js';
import Exports from '../src/screens/Exports.js';
import { Landing } from '../src/screens/Landing.js';
import Parking from '../src/screens/Parking.js';
import Refusals from '../src/screens/Refusals.js';
import { arabicReadingText, pageProps, stripTags } from './prohibitions.js';

/* -------------------------------------------------------------------------
 * The five pages, rendered the way their own tests render them.
 * --------------------------------------------------------------------- */

const PAGES: readonly (readonly [string, () => ReactNode])[] = [
  ['/', () => <Landing navigate={() => {}} />],
  ['/parking', () => <Parking {...pageProps()} />],
  ['/exports', () => <Exports {...pageProps()} />],
  ['/refusals', () => <Refusals {...pageProps()} />],
  ['/readiness', () => <Readiness actor={null} navigate={() => {}} />],
];

const markupOf = (node: ReactNode): string => renderToStaticMarkup(<>{node}</>);

/** The `#fragment` of every link inside the contents nav, in document order. */
function contentsTargets(markup: string): readonly string[] {
  const nav = /<nav class="contents shell"[\s\S]*?<\/nav>/.exec(markup);
  if (nav === null) return [];
  return [...nav[0].matchAll(/href="#([^"]+)"/g)].map((m) => m[1] ?? '');
}

/** Every `id` the document actually carries. */
function documentIds(markup: string): ReadonlySet<string> {
  return new Set([...markup.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1] ?? ''));
}

/** Every ordinal printed in a section's rail gutter. */
function railOrdinals(markup: string): readonly string[] {
  return [
    ...markup.matchAll(/<p class="index[^"]*"[^>]*>\s*(\d+)/g),
  ].map((m) => m[1] ?? '');
}

describe('the contents block', () => {
  for (const [route, render] of PAGES) {
    describe(route, () => {
      const markup = markupOf(render());

      it('is in the document', () => {
        expect(markup, `${route} renders no contents block`).toContain(
          '<nav class="contents shell"',
        );
        expect(contentsTargets(markup).length).toBeGreaterThan(1);
      });

      it('offers no link to an anchor the page does not contain', () => {
        const ids = documentIds(markup);
        for (const target of contentsTargets(markup)) {
          expect(ids.has(target), `${route} lists #${target}, which is not in the page`).toBe(
            true,
          );
        }
      });

      it('lists every section the page numbers, and numbers every one it lists', () => {
        /*
          The two counts come from opposite ends: the contents from the `order`
          array, the ordinals from the sections that actually rendered. They agree
          only when the array matches the page.
        */
        expect(railOrdinals(markup).length, `${route}`).toBe(contentsTargets(markup).length);
      });

      it('numbers no section 00', () => {
        // `findIndex` returns -1 for an id missing from `order`, and -1 + 1 is 0.
        // This is the exact print-out of the defect the file header describes.
        expect(railOrdinals(markup), `${route} has a section missing from its order`).not.toContain(
          '00',
        );
      });

      it('numbers the sections consecutively from 01', () => {
        const seen = railOrdinals(markup).map((n) => Number(n));
        expect(seen, `${route}`).toEqual(seen.map((_, i) => i + 1));
      });

      it('names each section with the words its own heading uses', () => {
        /*
          Not a string comparison against a fixture: the label and the `<h2>` read
          the same dictionary key, and this asserts they still reach the page
          together. A heading reworded in the dictionary moves both; a heading
          rewritten in the markup moves only one, and that is what this catches.
        */
        const text = stripTags(markup).replace(/\s+/g, ' ');
        const nav = /<nav class="contents shell"[\s\S]*?<\/nav>/.exec(markup);
        const labels = [
          ...(nav?.[0] ?? '').matchAll(/<span class="contents__label">([^<]+)<\/span>/g),
        ].map((m) => (m[1] ?? '').replace(/&#x27;/g, "'").replace(/&amp;/g, '&'));
        expect(labels.length).toBe(contentsTargets(markup).length);
        for (const label of labels) {
          // The label appears twice in the page: once here, once as the heading.
          const count = text.split(label).length - 1;
          expect(count, `${route}: "${label}" appears ${count} time(s), expected 2 or more`).toBeGreaterThan(1);
        }
      });

      it('paints no amber', () => {
        const nav = /<nav class="contents shell"[\s\S]*?<\/nav>/.exec(markup)?.[0] ?? '';
        expect(nav).not.toMatch(/data-state=["']assumed["']/);
        expect(nav).not.toMatch(/traced--assumed|uncertain/);
      });
    });
  }

  it('is headed in Arabic on an Arabic page, with no English left in it', () => {
    const markup = renderToStaticMarkup(
      <StaticLocale locale="ar">
        <Readiness actor={null} navigate={() => {}} />
      </StaticLocale>,
    );
    const nav = /<nav class="contents shell"[\s\S]*?<\/nav>/.exec(markup)?.[0] ?? '';
    expect(nav).not.toBe('');
    expect(arabicReadingText(markup)).toContain('في هذه الصفحة');
    // The entries are headings, and the headings on this page are translated; a
    // Latin word inside the nav means one of them came through untranslated.
    expect(stripTags(nav)).not.toMatch(/[A-Za-z]{4,}/);
  });

  it('gives every entry a target big enough to hit', () => {
    // 44px. Asserted over the STYLESHEET, because a static render has no layout —
    // and this is the one property of the block a screenshot cannot show either.
    const css = readFileSync(
      new URL('../src/styles/site.css', import.meta.url),
      'utf8',
    );
    const rule = /\.contents__link \{[^}]*\}/.exec(css)?.[0] ?? '';
    expect(rule).toContain('min-block-size: var(--control-h)');
  });
});
