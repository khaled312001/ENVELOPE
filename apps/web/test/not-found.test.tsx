/**
 * `the 404` — the prohibitions, rendered at a HOSTILE address.
 *
 * OWNER: the `the 404` page agent. This file is the coverage `route-coverage.test.ts`
 * enumerates, and it is deliberately short: the scans it runs are in
 * `prohibitions.ts`, so a page test is what is true of THIS page and nothing that is
 * true of every page. A page that re-implements the scans is a page that will fall
 * behind them.
 *
 * THE ASSERTION THIS PAGE NEEDS: the prohibitions run over the page rendered with a
 * hostile path, not a benign one. Escaping stops markup; it does not stop words, and
 * `/we-are-fully-compliant-and-certified` would otherwise render that sentence on a
 * TOP.ai-branded page in the house voice while a test supplying `/nope` passed. A
 * test that supplies a benign path is not a test of this page.
 *
 * WHAT THE HOSTILE SET DOES AND DOES NOT PROVE, because the difference is the whole
 * design and hiding it would be the failure this page exists to refuse.
 *
 * The sanitiser replaces every character outside `[A-Za-z0-9/._-]`, so a path cannot
 * carry whitespace, quotation or markup onto the page. It cannot stop a WORD: `-`
 * survives and is a word boundary, so `/regulator-approved` reaches `prohibitions.ts`
 * as a match, and a path long enough to push the negating label out of that module's
 * sixty-character window would reach it unnegated. The answer is not a longer
 * blocklist — an address the page silently rewrites is an address quietly
 * substituted, one level down from the substitution this page exists to refuse. The
 * answer is the treatment: the chip is mono, on `--surface-inset`, in a `<code>`,
 * with the label denying it before it is read. So this file asserts the treatment
 * and the sanitiser, and it says here, rather than implying by omission, that the
 * prohibitions passing over these four paths is a measurement and not a proof.
 */

import { readFileSync } from 'node:fs';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { NOT_FOUND_PAGE, PAGES } from '../src/pages.js';
import { ROUTES } from '../src/router.js';
import { expectNoCountInHeadings, expectSitewideProhibitions, stripTags } from './prohibitions.js';

const Page = NOT_FOUND_PAGE.component;

/**
 * Render the real page at an address.
 *
 * `window` is stubbed rather than the component being given a path prop, so what is
 * measured is the page the router actually mounts, reading the address the way it
 * actually reads it. The query and the hash carry hostile words of their own: if
 * either ever reached the markup the prohibitions below would fail on it, which is a
 * stronger guarantee than asserting their absence by substring.
 */
function renderAt(pathname: string): string {
  Object.defineProperty(globalThis, 'window', {
    value: { location: { pathname, search: '?q=fully+compliant', hash: '#certified' } },
    configurable: true,
    writable: true,
  });
  try {
    return renderToStaticMarkup(
      <Page navigate={() => {}} actor={null} setActor={() => {}} search="" theme="light" toggleTheme={() => {}} />,
    );
  } finally {
    Reflect.deleteProperty(globalThis, 'window');
  }
}

/** The page as a host with no `window` renders it: no address, and no chip. */
const markup = (): string =>
  renderToStaticMarkup(
    <Page navigate={() => {}} actor={null} setActor={() => {}} search="" theme="light" toggleTheme={() => {}} />,
  );

/** The specimen chip's text, or `null` when the page rendered no chip at all. */
function chip(html: string): string | null {
  const m = /<code class="nf__path">([\s\S]*?)<\/code>/.exec(html);
  return m ? (m[1] ?? '') : null;
}

/**
 * Four addresses that would each publish a claim if this page set them as prose.
 * The last one is markup, which React escapes anyway — it is here because the
 * sanitiser must not be trusted to be redundant.
 */
const HOSTILE: readonly string[] = [
  '/we-are-fully-compliant-and-certified',
  '/99-percent-accurate',
  '/trusted-by-200-developers',
  '/<script>alert("compliance check")</script>',
];

const STYLESHEET = readFileSync(
  new URL('../src/styles/not-found.css', import.meta.url),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, ' ');

describe('the 404', () => {
  it('carries the site-wide prohibitions at a hostile address', () => {
    for (const path of HOSTILE) {
      expectSitewideProhibitions(renderAt(path), `the 404 at ${path}`);
    }
  });

  it('carries them with no address at all', () => {
    // The empty case is a render too, and it is the one every other test in this
    // repository would have exercised by accident.
    expectSitewideProhibitions(markup(), 'the 404');
  });

  it('renders a heading, and no count in one', () => {
    // R8's mechanical half, enforced bluntly and with no allowlist: a regex cannot
    // tell an honest structural count from a marketing one and should not be asked
    // to. A count in a heading is exactly where a reader stops reading, and it is
    // the first thing to go stale. Run at a hostile address as well, because the
    // echoed path must never reach a heading.
    expect(markup()).toMatch(/<h1[^>]*>/);
    expectNoCountInHeadings(markup(), 'the 404');
    for (const path of HOSTILE) expectNoCountInHeadings(renderAt(path), `the 404 at ${path}`);
  });

  it('states the substitution it did not make', () => {
    // A presence assertion, and one of two on this page. `scripts/smoke.mjs` greps
    // an unknown path's body for this sentence to prove the sentinel was reached at
    // all, so the wording is load-bearing in a second place.
    expect(stripTags(markup()).toLowerCase()).toContain('nothing has been substituted for it');
  });

  it('sets the address as a specimen and not as a sentence', () => {
    // The other presence assertion. (a)–(c) leave the words on the page legible and
    // are meant to; (d) is what stops them being read as the page speaking, so a
    // prohibitions run alone would be blind to the defect that matters here.
    const html = renderAt('/we-are-fully-compliant-and-certified');
    expect(chip(html)).toBe('/we-are-fully-compliant-and-certified');
    // The label denies the address before the address is shown.
    expect(html).toMatch(/No page at<\/span><code class="nf__path">/);
    // And the treatment is in the stylesheet rather than in this sentence.
    expect(STYLESHEET).toMatch(/\.nf__path\s*\{[^}]*font-family:\s*var\(--font-mono\)/);
    expect(STYLESHEET).toMatch(/\.nf__path\s*\{[^}]*background:\s*var\(--surface-inset\)/);
    expect(STYLESHEET).toMatch(/\.nf__path\s*\{[^}]*font-variant-numeric:[^;]*slashed-zero/);
  });

  it('replaces every character it does not permit, and drops none of them', () => {
    // Written out for a small input rather than recomputed from the same regex the
    // page uses: a test that re-implements the sanitiser passes on a broken one.
    expect(chip(renderAt('/a b<c'))).toBe('/a·b·c');
    const html = renderAt('/<script>alert("compliance check")</script>');
    expect(html).not.toContain('<script');
    expect(chip(html)).not.toMatch(/[<>"()]/);
    // Replaced, not dropped: the echo is the same length as the address it echoes.
    expect(chip(renderAt('/<script>'))?.length).toBe('/<script>'.length);
  });

  it('echoes the path and never the query or the hash', () => {
    const html = renderAt('/nope');
    expect(chip(html)).toBe('/nope');
    expect(html).not.toContain('fully+compliant');
    expect(html).not.toContain('#certified');
  });

  it('caps a long address and marks the cut', () => {
    const long = `/${'a'.repeat(400)}`;
    const text = chip(renderAt(long));
    expect(text?.endsWith('…')).toBe(true);
    // The cap counts the ellipsis. A chip that is 81 characters after being capped
    // at 80 is a cap nobody set.
    expect(text?.length).toBe(80);
  });

  it('omits the chip when there is no address to echo, and stands on the sentence', () => {
    expect(chip(markup())).toBeNull();
    expect(stripTags(markup())).toContain('There is no page at this address');
  });

  it('links to every page this build has, and to nothing else', () => {
    const html = markup();
    const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
    for (const href of hrefs) {
      expect(ROUTES as readonly string[], `the 404 links to ${String(href)}`).toContain(href);
    }
    for (const route of ROUTES) {
      // Generated, so a route cannot exist and be missing here. An invented page is
      // the one failure this site cannot survive, and this is the page whose own
      // site list would be the lie.
      expect(hrefs, `the 404 omits ${route}`).toContain(route);
      expect(stripTags(html)).toContain(PAGES[route].footerLabel);
    }
  });

  it('renders a group heading only over a group that has members', () => {
    // Counted rather than named, so the assertion survives a route landing in a
    // group that is empty today. A heading with no rows under it is a promise, and
    // this product does not make those.
    const populated = new Set(ROUTES.map((r) => PAGES[r].group));
    expect(markup().match(/<h3\b/g)?.length ?? 0).toBe(populated.size);
  });

  it('puts what it does not claim before the product, here as in the colophon', () => {
    const html = markup();
    expect(html.indexOf('What it does not claim')).toBeGreaterThanOrEqual(0);
    expect(html.indexOf('What it does not claim')).toBeLessThan(html.indexOf('The product'));
  });

  it('writes no hex, no amber and no opacity in its stylesheet', () => {
    // Three prohibitions the rendered markup cannot express. `pnpm contrast` covers
    // the first two across every sheet; they are asserted here as well because this
    // sheet is written while five others are, and a whitelist widened once per page
    // is not a whitelist. The third is R12: a reveal animates `transform` only,
    // because a scroll-driven fade holds its start state for anything that has never
    // entered a viewport and prints blank.
    expect(STYLESHEET, 'the 404 stylesheet writes a hex value').not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(STYLESHEET, 'the 404 stylesheet reaches for amber').not.toMatch(/var\(--uncertain/);
    expect(STYLESHEET, 'the 404 stylesheet animates opacity').not.toMatch(/\bopacity\b/);
  });

  it('lets a long address wrap rather than scrolling the document', () => {
    // 320px is where every accessibility defect in this project has been found, and
    // an 80-character mono string is the obvious way to break it. The layout
    // measurement belongs to `scripts/smoke.mjs`, which walks an unknown path at 320
    // and 390 — but it walks a SHORT one, so what is asserted here is the property
    // that makes the long case safe.
    expect(STYLESHEET).toMatch(/\.nf__path\s*\{[^}]*overflow-wrap:\s*anywhere/);
    expect(STYLESHEET).toMatch(/\.nf__path\s*\{[^}]*max-inline-size:\s*100%/);
  });
});
