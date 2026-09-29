/**
 * The drawings drawn in code, held to the stylesheet that inks them.
 *
 * ---------------------------------------------------------------------------
 * WHY A MISSING RULE IS THE WORST KIND OF DEFECT HERE.
 *
 * `drawn.tsx` names every shape with a class and `drawn.css` gives every class
 * its ink, because an SVG in the document inherits the page's own tokens and a
 * drawing shipped as a file would have to hardcode a hex that is wrong in the
 * other theme. The cost of that arrangement is a seam, and the seam fails
 * SILENTLY IN EVERY DIRECTION: TypeScript does not know class names, the
 * stylesheet does not know which are used, no console warning is emitted, and
 * nothing throws. The element simply renders with the SVG defaults.
 *
 * And the SVG default for `fill` is BLACK. `.drawn__read` was written into the
 * affection-plan drawing and never given a rule, so the two entries the alt
 * text calls "left unconnected" rendered as solid black bars — redaction marks,
 * on the first screen of the flow, in a product whose whole argument is that a
 * gap is shown as a gap. It was found by looking at the screen, which is the
 * only way it could have been found, and that is exactly why it is worth a
 * test: the next one will be found the same way, or not at all.
 *
 * ---------------------------------------------------------------------------
 * THE CHECK RUNS BOTH WAYS.
 *
 * A class used and not defined is the black-fill defect above. A class defined
 * and not used is dead ink — a rule whose effect nobody can see, which a later
 * edit will "fix" by wiring something to it, and that is how a drawing acquires
 * a colour that was never argued for. Neither is allowed.
 *
 * `.drawn-slot` and `.drawn` are the wrapper and the frame, set by `Drawn` and
 * `Frame` rather than by any drawing. They are outside the `drawn__` pattern on
 * purpose, so the sweep does not need an exception list that would quietly grow.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const TSX = readFileSync(new URL('../src/drawn.tsx', import.meta.url), 'utf8');
const RAW = readFileSync(new URL('../src/styles/drawn.css', import.meta.url), 'utf8');

/*
  COMMENTS BLANKED ON BOTH SIDES, and this is not tidiness.

  Both files are argued in prose and both name their own classes in it — the
  header of `drawn.css` says amber reaches `.drawn__assumed` and nothing else,
  which is the sentence that makes the rule reviewable. Read as code, that
  sentence is a selector, and the first version of this file counted it: the
  sweep reported classes "defined" that appear only in an explanation. A checker
  whose result depends on how well a file is documented is backwards.
*/
const CODE = TSX.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const CSS = RAW.replace(/\/\*[\s\S]*?\*\//g, '');

/*
  EVERY `drawn__*` TOKEN IN THE SOURCE, not every one inside `className="…"`.

  The first version read `className` attributes and reported `.drawn__bar` and
  `.drawn__bar--binds` as ink nothing draws — they are drawn by the capacities
  figure through `className={b.binds ? 'drawn__bar drawn__bar--binds' : …}`, a
  ternary the attribute pattern cannot see. A checker that misses a legitimate
  use teaches the next reader to delete a live rule, which is a worse outcome
  than the defect it was written for. The prefix is unambiguous in this file:
  nothing else is named `drawn__`.
*/
function used(): ReadonlySet<string> {
  const names = new Set<string>();
  for (const m of CODE.matchAll(/\bdrawn__[\w-]+/g)) names.add(m[0]);
  return names;
}

/** Every `drawn__*` that appears in a selector — the part of a rule before `{`. */
function defined(): ReadonlySet<string> {
  const names = new Set<string>();
  for (const m of CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    for (const s of m[1]!.matchAll(/\.(drawn__[\w-]+)/g)) names.add(s[1]!);
  }
  return names;
}

describe('the code-drawn figures', () => {
  it('gives every class it draws with a rule in the stylesheet', () => {
    const rules = defined();
    const missing = [...used()].filter((c) => !rules.has(c)).sort();
    // Named in the message, because "expected 1 to be 0" does not say which.
    expect(missing, `no rule in drawn.css for: ${missing.join(', ')}`).toEqual([]);
  });

  it('draws with every class the stylesheet inks', () => {
    const drawn = used();
    const unused = [...defined()].filter((c) => !drawn.has(c)).sort();
    expect(unused, `drawn.css inks a class nothing draws: ${unused.join(', ')}`).toEqual([]);
  });

  /*
    PER CLASS, NOT PER RULE. `.drawn__note` takes its ink from the grouped rule
    it shares with `.drawn__tag` and `.drawn__figure`, and sets only its own size
    in the rule that names it alone — correct CSS, and a rule-by-rule sweep would
    fail it. What has to be true is that each class reaches an ink SOMEWHERE,
    because the default it falls back to otherwise is black.
  */
  it('gives every class an ink somewhere, so nothing falls to the SVG default', () => {
    const inked = new Set<string>();
    for (const m of CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!/(fill|stroke|font|letter-spacing)\s*:/.test(m[2]!)) continue;
      for (const s of m[1]!.matchAll(/\.(drawn__[\w-]+)/g)) inked.add(s[1]!);
    }
    const bare = [...used()].filter((c) => !inked.has(c)).sort();
    expect(bare, `no fill, stroke or font reaches: ${bare.join(', ')}`).toEqual([]);
  });
});
