/**
 * `?demo=worked-example` — the plot the landing page argues from, handed to the
 * engine as an input a visitor can run.
 *
 * ---------------------------------------------------------------------------
 * WHAT WAS WRONG, AND IT WAS NOT SUBTLE.
 *
 * The landing page's primary call to action is `/app?demo=worked-example`, and so
 * is the one at the foot of `/exports`. `Antechamber` carries the query across
 * sign-in on purpose and says so in a comment. `EngineApp`'s own docblock claimed
 * to act on it. Nothing did. `grep demo apps/web/src` found the word in four
 * comments, one type annotation and no code at all.
 *
 * So the strongest button on the site — *run this plot yourself* — signed you in
 * and dropped you on an empty intake screen, with no plot, no note, and nothing
 * naming what had just failed to happen. The figures on the page stayed a claim.
 *
 * ---------------------------------------------------------------------------
 * IT REPRODUCES THE PAGE'S FIGURES OR IT IS WORSE THAN NOTHING.
 *
 * `worked-example.json` holds both halves of the run: the `input` that was posted
 * and the `verified` output the page quotes. A demo that filled in *approximately*
 * this plot would hand the visitor a different governing capacity than the one
 * they had just read, on a product whose entire proposition is that its numbers
 * are traceable. They would be right to conclude the page was decorated.
 *
 * So every field of `input.run` is carried, including the unit mix — which is the
 * one the generic default would have quietly replaced. `RulesStep`'s fallback mix
 * is 50/37.5/12.5 across three unit types; the worked example is 50/50 across two.
 * Posting the fallback would change the unit count and nothing on screen would
 * have said why. `test/demo.test.ts` asserts field by field that what this module
 * hands the two screens is what the recorded input contains.
 *
 * ---------------------------------------------------------------------------
 * THE RECTANGLE IS DERIVED, AND THE DERIVATION IS CHECKED.
 *
 * `PlotForm` takes a width and a depth, because Phase 0's plot entry is a
 * rectangle (§4.2 of the plan is where that stops being true). The recorded input
 * holds vertices. Reading a width off a bounding box is exact for an axis-aligned
 * rectangle and silently wrong for anything else — an L-shaped plot would arrive
 * as the rectangle that encloses it, which is a bigger plot than the one the page
 * ran. `rectangleOf` therefore returns `null` for any ring it cannot prove is that
 * rectangle, the demo degrades to carrying no shape at all rather than the wrong
 * one, and the test fails loudly on the day the worked example stops being one.
 */

import example from './screens/worked-example.json' with { type: 'json' };

export interface DemoPlot {
  readonly plotNumber: string;
  readonly community: string;
  readonly widthM: string;
  readonly depthM: string;
  /** Per edge, in the recorded order: what it faces, and the road's rank. */
  readonly edges: readonly {
    readonly classification: string;
    readonly roadHierarchy: string;
  }[];
}

export interface DemoRun {
  readonly parkingInFar: string;
  readonly parkingLevelsAvailable: number;
  readonly saleableEfficiency: string;
  readonly unitMix: {
    readonly entries: readonly {
      readonly typeId: string;
      readonly label: string;
      readonly share: string;
      readonly nsaM2: string;
    }[];
    readonly basis: string;
  };
}

export interface Demo {
  readonly id: 'worked-example';
  readonly plot: DemoPlot | null;
  readonly run: DemoRun;
}

/**
 * The width and depth of an axis-aligned rectangle, or `null` for any other ring.
 *
 * Four vertices is necessary and nowhere near sufficient: a quadrilateral with
 * four corners can be any shape at all. The ring is a rectangle only if each edge
 * is axis-aligned and the two x values and the two y values each appear twice —
 * which is what the two-distinct-coordinates test below asserts.
 */
function rectangleOf(
  vertices: readonly { readonly x: string; readonly y: string }[],
): { readonly widthM: string; readonly depthM: string } | null {
  if (vertices.length !== 4) return null;
  const xs = [...new Set(vertices.map((v) => v.x))];
  const ys = [...new Set(vertices.map((v) => v.y))];
  if (xs.length !== 2 || ys.length !== 2) return null;
  // Every edge must run along one axis: consecutive vertices share an x or a y.
  for (let i = 0; i < 4; i += 1) {
    const a = vertices[i]!;
    const b = vertices[(i + 1) % 4]!;
    if (a.x !== b.x && a.y !== b.y) return null;
  }
  const span = (values: readonly string[]): string =>
    String(Math.abs(Number(values[1]) - Number(values[0])));
  return { widthM: span(xs), depthM: span(ys) };
}

const INPUT = example.input;

/**
 * The basis on the mix, rewritten for the reader who arrives through the demo.
 *
 * The recorded input has no basis string on its mix — the script that wrote it
 * posts `USER_SET` and the engine records the author. A person following the
 * landing page did not choose these areas and should not be told they did, so the
 * basis names where they actually came from.
 */
const MIX_BASIS =
  'the unit mix recorded with the worked example on the landing page. ' +
  'You did not choose it and no document states it: it is the mix that run used, ' +
  'carried across so the figures you get are the figures that page prints. ' +
  'Change it and the unit count changes with it.';

export const WORKED_EXAMPLE: Demo = {
  id: 'worked-example',
  plot: (() => {
    const rect = rectangleOf(INPUT.plot.vertices);
    if (rect === null) return null;
    return {
      plotNumber: INPUT.plot.plotNumber,
      community: INPUT.plot.community,
      widthM: rect.widthM,
      depthM: rect.depthM,
      edges: INPUT.plot.edges.map((e) => ({
        classification: e.classification,
        roadHierarchy: 'roadHierarchy' in e ? (e.roadHierarchy as string) : '',
      })),
    };
  })(),
  run: {
    parkingInFar: INPUT.run.parkingInFar,
    parkingLevelsAvailable: INPUT.run.parkingLevelsAvailable,
    saleableEfficiency: INPUT.run.saleableEfficiency.value,
    unitMix: {
      entries: INPUT.run.unitMix.entries.map((e) => ({
        typeId: e.typeId,
        label: e.label,
        share: e.share,
        nsaM2: e.nsaM2,
      })),
      basis: MIX_BASIS,
    },
  },
};

/** The demo named by a query string, or `null`. One id today; a lookup tomorrow. */
export function demoFrom(search: string): Demo | null {
  return new URLSearchParams(search).get('demo') === 'worked-example' ? WORKED_EXAMPLE : null;
}
