/**
 * The plot, drawn with its setbacks.
 *
 * The one picture in the product that earns its place. A capacity number is
 * abstract; a plot with a 7.5 m strip taken off two sides and 4.5 m off the
 * others is immediately legible to an architect, and the gap between the outline
 * and the shaded footprint *is* the argument the deck makes on slide 05.
 *
 * Drawn from the same integer millimetre coordinates the kernel computed with —
 * not re-derived, not approximated for display. If the drawing and the number
 * ever disagree, the drawing is wrong and it should be obvious.
 *
 * Accessibility: an SVG that only works visually excludes the reader who most
 * needs the numbers. The whole figure carries a text description, each edge is
 * separately labelled, and the same facts appear in the table beside it.
 *
 * ---------------------------------------------------------------------------
 * IT IS DRAWN AS A SHEET, AND EVERY MARK ON IT IS DERIVED.
 *
 * It used to be a bare polygon with a figure at each edge midpoint, and it read as
 * a placeholder — which was a presentation failure with a substantive cost, because
 * this is the screen where an architect decides whether the thing in front of them
 * is a tool or a mock-up. It now carries what a site drawing carries: a frame, a
 * metric grid, witness lines and tick-terminated dimensions, station marks at the
 * surveyed corners, a north arrow, a graphic scale and a title strip.
 *
 * NONE OF IT IS INVENTED, and that constraint decided several of the details:
 *
 *  - The grid interval is a round number of METRES chosen from the plot's own span,
 *    and it is metres because the vertex coordinates are metres — `insetPolygon`
 *    already subtracts a setback in metres directly from them, so the frame's unit
 *    is established by construction rather than by assumption.
 *  - North is drawn because `packages/core/src/domain.ts` defines an edge bearing as
 *    "degrees clockwise from grid north", so up IS north in this frame. It is
 *    labelled GRID N, not N: the affection plan gives no convergence to true or
 *    magnetic north, and an unqualified arrow would claim one.
 *  - The scale is GRAPHIC, never a ratio. "1:500" is true at exactly one rendered
 *    width and false at every other, and this is a browser.
 *  - The setback dimension appears only when every edge has resolved — the same
 *    condition the hatch already obeyed, for the same reason.
 *  - Every stroke width, every text size and the hatch pitch are computed from the
 *    plot's span. They were fixed viewBox units, which is why the edges rendered as
 *    an 11px slab on an 80 m plot: 2.5 user units on a 2.5 unit-per-metre drawing
 *    is a two-and-a-half-metre-wide line. That single fact is most of why the
 *    drawing looked crude.
 *
 * And classification is no longer carried by colour alone. WCAG 2.2 §1.4.1: a road
 * edge was `--accent` and an unclassified one `--text-tertiary`, both measured,
 * both passing 1.4.11, and indistinguishable to a reader who cannot separate them.
 * Each class now also has a dash pattern, and the legend swatch draws the same one.
 */

import { bandWidthM } from '@envelope/sheets';
import type { RoadHierarchy } from '@envelope/core';
import { useId, type ReactNode } from 'react';

import { AR } from '../i18n/plotCanvas.ar.js';
import { EN } from '../i18n/plotCanvas.en.js';
import { useDict, useLocale, Verbatim } from '../i18n/locale.js';

export interface PlotVertex {
  readonly x: string;
  readonly y: string;
}

export interface PlotEdgeView {
  readonly seq: number;
  readonly classification: 'ROAD' | 'ADJACENT_PLOT' | 'OPEN_SPACE' | 'OTHER';
  readonly roadHierarchy: string | null;
  readonly lengthM: string;
  readonly setbackM?: string;
  readonly ruleId?: string;
  /*
    WHERE THIS BOUNDARY LIVES IN `vertices`, WHEN THE TWO ARE NOT THE SAME LIST.

    The kernel is polygonal, so a curved boundary is one entry here and many
    vertices there. Without the span, boundary 3's classification would be drawn
    on whichever tessellated chord of the curve happened to be third — the plot
    would be the right shape, every band would be on the wrong piece of it, and
    the drawing would look entirely reasonable.

    Absent means the lists agree, which is every plot with no curve in it.
  */
  readonly ringFrom?: number;
  readonly ringSpan?: number;
  /**
   * The curve's own figures, where the boundary curves.
   *
   * The shape is already in `vertices` — the ring arrives tessellated — so
   * nothing here is drawn from these. They are what an affection plan prints,
   * carried so the legend and the spoken description can quote the document
   * instead of the polygon standing in for it.
   */
  readonly arc?: {
    readonly radiusM: string;
    readonly arcLengthM: string;
    readonly sweepDeg: string;
    readonly bulgesRight: boolean;
  } | null;
}

/**
 * Which boundary owns each ring vertex.
 *
 * The inverse of the spans: `ringOf(edges, n)[k]` is the `seq` of the boundary
 * whose run contains ring vertex `k`. Absent spans mean the two lists already
 * agree, which is every plot with no curve in it.
 */
function ringOf(edges: readonly PlotEdgeView[], ringLength: number): readonly number[] {
  const owner = new Array<number>(ringLength).fill(0);
  for (const edge of edges) {
    const from = edge.ringFrom ?? edge.seq;
    for (let k = 0; k < (edge.ringSpan ?? 1); k += 1) owner[(from + k) % ringLength] = edge.seq;
  }
  return owner;
}

/**
 * A polyline pushed outward by a constant width, each point along its own
 * normal — the average of the two segments meeting there, so a band round a
 * curve keeps its width instead of pinching at every vertex.
 */
function offsetRun(run: readonly Pt[], width: number): readonly Pt[] {
  const segments = run.slice(0, -1).map((a, k) => {
    const b = run[k + 1]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
  });
  return run.map((p, k) => {
    const before = segments[k - 1];
    const after = segments[k];
    const n = before && after
      ? (() => {
          const x = before.x + after.x;
          const y = before.y + after.y;
          const len = Math.hypot(x, y) || 1;
          return { x: x / len, y: y / len };
        })()
      : (before ?? after ?? { x: 0, y: 0 });
    return { x: p.x + n.x * width, y: p.y + n.y * width };
  });
}

export interface PlotCanvasProps {
  readonly vertices: readonly PlotVertex[];
  readonly edges: readonly PlotEdgeView[];
  readonly areaM2: string;
  readonly footprintAreaM2?: string;
  readonly onSelectEdge?: (seq: number) => void;
  readonly selectedEdge?: number | null;
}

/**
 * The band's fill and stroke by road hierarchy — Eng. Mohamed, 2026-09-28:
 * *"في road , road type … بس لازم رمز ليهم"*.
 *
 * The WIDTH comes from `@envelope/sheets`, so the strip beside a road here is
 * the strip beside the same road on the A3 sheet and in the DXF. Only the ink is
 * decided here, because only this drawing has a stylesheet; the sheet's own
 * palette carries the same ranking in pen weight.
 *
 * And the ranking is not carried by colour alone — 1.4.1, the same ruling that
 * gave each edge class its dash. The bands are the same accent at four widths,
 * so a reader who cannot separate the inks still reads the hierarchy off the
 * width, and the legend prints the hierarchy in words as well.
 */
const BAND_FILL: Record<string, string> = {
  ARTERIAL: 'var(--accent-subtle)',
  COLLECTOR: 'var(--accent-subtle)',
  LOCAL: 'var(--accent-subtle)',
  ACCESS: 'var(--accent-subtle)',
  ADJACENT_PLOT: 'var(--surface-sunken)',
  OPEN_SPACE: 'var(--surface-sunken)',
};

const EDGE_COLOUR: Record<PlotEdgeView['classification'], string> = {
  ROAD: 'var(--accent)',
  ADJACENT_PLOT: 'var(--text-secondary)',
  OPEN_SPACE: 'var(--derived)',
  OTHER: 'var(--text-tertiary)',
};

/**
 * The non-colour cue, as a multiple of the drawing's own line unit.
 *
 * Read as a hierarchy of certainty rather than as four arbitrary patterns: a road
 * is the strongest fact the affection plan states, so it is continuous; a party
 * boundary is a firm but different kind of fact, so it is a long dash; open space
 * is chain-dotted, which is what a centre line or a zone edge is drawn as; and
 * OTHER — which is also the state an edge is in before anyone has classified it —
 * is dotted, the conventional mark for provisional.
 */
const EDGE_DASH: Record<PlotEdgeView['classification'], readonly number[] | null> = {
  ROAD: null,
  ADJACENT_PLOT: [5.5, 3],
  OPEN_SPACE: [7, 2.5, 1, 2.5],
  OTHER: [1, 2.6],
};

/** The same patterns in the swatch's own 18x8 box. */
const SWATCH_DASH: Record<PlotEdgeView['classification'], string | undefined> = {
  ROAD: undefined,
  ADJACENT_PLOT: '5 3',
  OPEN_SPACE: '6 2 1 2',
  OTHER: '1 2.4',
};

/**
 * Grid intervals a surveyor would actually use. The step is the first of these that
 * divides the plot into at most twelve — more than that is texture, fewer is not a
 * grid.
 */
const NICE_STEPS = [0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000] as const;

interface Pt {
  readonly x: number;
  readonly y: number;
}

const add = (p: Pt, d: Pt, k: number): Pt => ({ x: p.x + d.x * k, y: p.y + d.y * k });

export function PlotCanvas({
  vertices,
  edges,
  areaM2,
  footprintAreaM2,
  onSelectEdge,
  selectedEdge,
}: PlotCanvasProps): JSX.Element {
  /*
    Ids must be unique per instance or the second drawing on a page reuses the
    first one's hatch and grid. `useId` is called before the early return because a
    hook after a conditional return is a hook that does not always run.

    The colons React puts in an id are legal in a fragment URL and illegal in a CSS
    selector, and stripping them costs nothing while a debugging session spent on
    `url(#:r7:)` does not.
  */
  const uid = useId().replace(/:/g, '');
  /*
    The words around the drawing, in the reader's language — called before the early
    return for the same reason `useId` is. The words INSIDE it are the sheet's, and
    stay as a sheet carries them; see `i18n/plotCanvas.en.ts`.
  */
  const words = useDict(EN, AR);
  const { locale } = useLocale();
  const EDGE_LABEL = words.classes;
  /** A road's hierarchy in the legend row: named where the dictionary names it, the
      engine's token otherwise — isolated on the Arabic page, untouched on the English. */
  const hierarchyNote = (h: string): ReactNode => {
    const named = words.hierarchy?.[h];
    if (named) return ` (${named})`;
    const token = h.toLowerCase();
    return locale === 'ar' ? (
      <>
        {' ('}
        <Verbatim>{token}</Verbatim>
        {')'}
      </>
    ) : (
      ` (${token})`
    );
  };

  const pts = vertices.map((v) => ({ x: Number(v.x), y: Number(v.y) }));
  if (pts.length < 3) return <p className="muted">{words.empty}</p>;

  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = maxX - minX;
  const h = maxY - minY;

  // SVG y grows downward; survey y grows north. Flip so the drawing matches how
  // an architect holds the affection plan.
  const toSvg = (p: Pt): Pt => ({ x: p.x - minX, y: maxY - p.y });
  const svgPts = pts.map(toSvg);
  const outline = svgPts.map((p) => `${p.x},${p.y}`).join(' ');

  /*
    ONE SCALE FOR EVERY MARK ON THE SHEET.

    `span` is the plot's larger dimension in metres and `U` is one hundredth of it,
    so every weight below is a percentage of the drawing rather than a fixed number
    of user units. That is the whole fix for the slab: a line specified as 2.5 units
    is 2.5 METRES wide, which on this plot is a building.
  */
  const span = Math.max(w, h);
  const U = span / 100;

  /*
    THE SHEET HAS A MINIMUM ASPECT, AND A DEEP PLOT IS WHY.

    The margins are a fraction of `span` — the plot's LARGER dimension — and so is
    every text size, because that is what keeps a line weight and a figure legible
    independently of how big the plot is. But the sheet's WIDTH came from `w`, the
    smaller one on a deep plot, and the two diverge: a 20 x 60 m plot gave a sheet
    39 units wide carrying a title strip whose type was sized on 60. It printed
    "PLOT N20OF.0R0 C0NSTRUCTION" — two title cells laid straight through each
    other — and pushed the scale bar out past the frame.

    A drawing sheet is landscape and the plot sits on it; the sheet does not shrink
    to the plot's proportions. So the side margins widen until the sheet is at least
    square. This costs nothing: for a deep plot the rendered scale is bound by
    HEIGHT, so adding width adds sheet without making the plot any smaller.
  */
  const margin = { side: span * 0.16, top: span * 0.16, bottom: span * 0.32 };
  const sheetH = h + margin.top + margin.bottom;
  if (w + margin.side * 2 < sheetH) margin.side = (sheetH - w) / 2;

  const vb = {
    x: -margin.side,
    y: -margin.top,
    w: w + margin.side * 2,
    h: sheetH,
  };

  const gridStep = NICE_STEPS.find((s) => span / s <= 12) ?? 1000;
  const gridMajor = gridStep * 5;

  const ink = {
    frame: U * 0.35,
    gridMinor: U * 0.22,
    gridMajor: U * 0.32,
    boundary: U * 0.6,
    edge: U * 0.8,
    edgeSelected: U * 1.4,
    dim: U * 0.25,
    vertex: U * 0.3,
  };
  /*
    TYPE SIZES ARE SET BY THE 12px FLOOR, NOT BY TASTE.

    SVG text scales with the viewBox, so the rendered pixel size is
    `size × (panel / viewBox)` — and for a squarish plot the binding constraint is
    the panel's HEIGHT, which `drawing.css` raises to 30rem for exactly this reason.
    THESE NUMBERS WERE MEASURED IN THE BROWSER, not reasoned about. Reading the
    rendered size off `getScreenCTM().a × font-size` for four aspect ratios:

      plot            dim    small   caveat   tag
      50.85 x 26.85   16.5   15.2    14.0     15.6
      40 x 40         12.3   11.4    10.5     11.7    <- the binding case
      20 x 60         12.3   11.4    10.5     11.7    <- and its twin
      120 x 90        14.8   13.7    12.6     14.1

    A squarish or deep plot is height-bound, and every one of those cases is the
    same 0.308 px per 0.001 of span. So the floor sets the coefficients: 0.039 is
    12.0, 0.042 is 12.9, 0.040 is 12.3. An earlier pass at 0.029/0.033 measured
    10.1 and 11.5 and I had called it fine by looking at it.

    The caveat lost its 0.92 multiplier for the same reason — a 92% of 12 is 11.
    It is the one line on the sheet that a reader must not have to lean in for.
  */
  const type = {
    dim: span * 0.042,
    small: span * 0.039,
    tag: span * 0.04,
  };
  const dim = {
    off: span * 0.06,
    gap: span * 0.014,
    over: span * 0.022,
    tick: span * 0.018,
  };

  // The setback footprint, built by inset-per-edge in view space. This is a
  // faithful redraw of what the kernel produced for a convex plot; it is drawn
  // only when every edge has a setback, so it can never show a partial answer.
  /*
    ONE SETBACK PER RING VERTEX, NOT PER BOUNDARY.

    `insetPolygon` shifts every straight piece of the ring, and a curved boundary
    is many of those. Handing it one inset per boundary would leave the pieces of
    a curve indexed against whichever boundary shares their position — which is
    the same expansion `packages/capacity/src/envelope.ts` does before it calls
    the real offset kernel, for the same reason.
  */
  const insets = ringOf(edges, svgPts.length).map((seq) => {
    const setback = edges[seq]?.setbackM;
    return setback ? Number(setback) : null;
  });
  const complete = insets.length === svgPts.length && insets.every((v) => v !== null);
  const footprint = complete ? insetPolygon(svgPts, insets as number[]) : null;

  /**
   * Per-BOUNDARY frame: the two corners, the chord's tangent and outward normal,
   * a readable angle — and the run of ring vertices the boundary actually
   * occupies, which is what gets stroked.
   *
   * The frame stays the chord's on purpose. A dimension string measures between
   * two corners and a witness line stands at each of them; both are statements
   * about where the boundary begins and ends, not about how it travels.
   */
  const ringN = svgPts.length;
  const geom = edges.map((edge) => {
    const from = edge.ringFrom ?? edge.seq;
    const count = edge.ringSpan ?? 1;
    const run: Pt[] = [];
    for (let k = 0; k <= count; k += 1) run.push(svgPts[(from + k) % ringN]!);
    const p = run[0]!;
    const q = run[run.length - 1]!;
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    const u = { x: dx / len, y: dy / len };
    // `insetPolygon` establishes that the INTERIOR normal in view space is
    // (dy, -dx)/len, so the outward one is its negation.
    const n = { x: -u.y, y: u.x };
    let angle = (Math.atan2(u.y, u.x) * 180) / Math.PI;
    // A dimension figure is never read upside down. Flipping by 180 about its own
    // anchor changes only which way the glyphs face.
    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;
    /*
      HOW FAR THE BOUNDARY GETS FROM ITS OWN CHORD, outward.

      Zero on a straight boundary, and the crown height on a curved one. The
      dimension string clears it: measured from the chord, a curved frontage's
      figure and its witness lines land INSIDE the plot, printed over the shape
      they are dimensioning. Pushed out by the bow they sit clear of it, and
      the measurement is unchanged — a dimension string measures between two
      corners whichever side of it the line is drawn on.
    */
    const bow = run.reduce(
      (most, r) => Math.max(most, (r.x - p.x) * n.x + (r.y - p.y) * n.y),
      0,
    );
    return {
      p,
      q,
      u,
      n,
      len,
      run,
      bow,
      path: run.map((r) => `${r.x},${r.y}`).join(' '),
      mid: { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 },
      angle,
    };
  });

  const gridId = `dwg-grid-${uid}`;
  const hatchId = `setback-hatch-${uid}`;

  /*
    THE BOTTOM MARGIN HAS THREE TENANTS AND THEY WERE FIGHTING.

    The bottom edge's own dimension text sits at `dim.off + type.dim × 0.62` below
    the boundary and is about `type.dim` tall, so it ends near h + 0.10 × span. The
    scale bar was placed at h + 0.096 × span — underneath it, which is what put
    "0 5 10" through the middle of "50.85 m" in the first render. The three bands
    below are laid out in order with the dimension zone measured rather than
    guessed, and the scale labels sit BELOW their bar so the band needs one text
    height rather than two.

    The bar is four intervals rather than two: at two it was a tenth of the plot
    width and read as a fragment of a rule instead of as a scale.
  */
  const dimZoneEnd = dim.off + type.dim * 1.35;
  const scaleLen = gridStep * 4;
  const scaleSeg = scaleLen / 4;
  /* Anchored to the SHEET's left margin, not to the plot's left edge. On a deep
     plot those are far apart, and a scale bar floating in the middle of the sheet
     with its caption running off the frame is what the second one looked like. */
  const sheetInset = span * 0.04;
  const scale = {
    x: vb.x + sheetInset,
    y: h + dimZoneEnd + span * 0.03,
    hgt: span * 0.016,
  };
  const titleY = h + margin.bottom * 0.72;

  /*
    THE TITLE STRIP CANNOT COLLIDE, AND IT IS CHECKED RATHER THAN HOPED.

    Two cells, one anchored to each edge, both sized by their own content: nothing
    in that arrangement stops them meeting in the middle, and on the first render
    they did. The sheet aspect floor above makes it very hard to reach, so this is
    a backstop, and it degrades in the right order — the footprint clause is the
    part that is said again three lines below in the legend, so it is the part that
    goes first, and only then does the type shrink.

    0.6 em is the advance width of IBM Plex Mono, which is what these cells are set
    in; an estimate is sound here because the consequence of being 5% out is 5% of
    slack rather than a collision.
  */
  const MONO_ADVANCE = 0.6;
  const titleRight = 'NOT FOR CONSTRUCTION';
  const usableTitle = vb.w - sheetInset * 2;
  const fits = (left: string, size: number): boolean =>
    (left.length + titleRight.length + 4) * MONO_ADVANCE * size <= usableTitle;

  const titleFull =
    `PLOT ${areaM2} m²` + (footprintAreaM2 ? ` · FOOTPRINT ${footprintAreaM2} m²` : '');
  const titleLeft = fits(titleFull, type.small) ? titleFull : `PLOT ${areaM2} m²`;
  const titleSize = fits(titleLeft, type.small)
    ? type.small
    : (usableTitle / ((titleLeft.length + titleRight.length + 4) * MONO_ADVANCE));

  return (
    <div className="plot-figure">
      <svg
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        className="plot-svg"
        role="img"
        aria-label={
          words.figure.lead(areaM2, edges.length) +
          edges
            .map(
              (e) =>
                words.figure.edge(e.seq + 1, EDGE_LABEL[e.classification], e.lengthM) +
                (e.arc ? words.figure.curve(e.arc.radiusM, e.arc.arcLengthM) : '') +
                (e.setbackM ? words.figure.setback(e.setbackM) : ''),
            )
            .join(words.figure.edgeSeparator) +
          (footprintAreaM2 ? words.figure.footprint(footprintAreaM2) : '') +
          words.figure.scale(gridStep)
        }
      >
        <defs>
          <pattern
            id={hatchId}
            width={U * 2.4}
            height={U * 2.4}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2={U * 2.4}
              stroke="var(--border-default)"
              strokeWidth={U * 0.28}
            />
          </pattern>

          {/*
            The grid is anchored to the plot's own origin rather than to the
            viewBox, so a major line falls ON the boundary corner instead of
            wherever the margin happened to put it.
          */}
          <pattern id={gridId} width={gridMajor} height={gridMajor} patternUnits="userSpaceOnUse">
            {[1, 2, 3, 4].map((i) => (
              <line
                key={`v${i}`}
                className="dwg-grid-minor"
                x1={i * gridStep}
                y1="0"
                x2={i * gridStep}
                y2={gridMajor}
                strokeWidth={ink.gridMinor}
              />
            ))}
            {[1, 2, 3, 4].map((i) => (
              <line
                key={`h${i}`}
                className="dwg-grid-minor"
                x1="0"
                y1={i * gridStep}
                x2={gridMajor}
                y2={i * gridStep}
                strokeWidth={ink.gridMinor}
              />
            ))}
            <line
              className="dwg-grid-major"
              x1="0"
              y1="0"
              x2="0"
              y2={gridMajor}
              strokeWidth={ink.gridMajor}
            />
            <line
              className="dwg-grid-major"
              x1="0"
              y1="0"
              x2={gridMajor}
              y2="0"
              strokeWidth={ink.gridMajor}
            />
          </pattern>
        </defs>

        <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill={`url(#${gridId})`} />
        <rect
          className="dwg-frame"
          x={vb.x + span * 0.02}
          y={vb.y + span * 0.02}
          width={vb.w - span * 0.04}
          height={vb.h - span * 0.04}
          strokeWidth={ink.frame}
        />

        {/*
          The hatch is the *setback strip* — what the rules take off the plot —
          and it is drawn as the area between the boundary and the footprint.

          So it is drawn only once a footprint exists. Before the edges are
          classified there is no footprint, and filling the whole plot with it
          said "every square metre of this is setback", which is both false and
          the most discouraging possible thing to show someone on the first
          screen. The empty state is now a plain outline: a plot, not a verdict.
        */}
        {footprint ? (
          <polygon points={outline} fill={`url(#${hatchId})`} stroke="none" />
        ) : (
          <polygon points={outline} className="plot-empty" />
        )}

        {footprint ? (
          <polygon
            points={footprint.map((p) => `${p.x},${p.y}`).join(' ')}
            className="plot-footprint"
            style={{
              strokeWidth: ink.boundary,
              strokeDasharray: `${U * 2.2} ${U * 1.6}`,
            }}
          />
        ) : null}

        {/*
          THE BOUNDARY IS NOT DRAWN TWICE, AND THAT IS WHY THE DASHES WORK.

          This polygon used to stroke all four sides in `--text-primary` and then
          the classified edge lines were drawn on top of it. For a solid edge that
          is invisible; for a dashed one the near-black shows through every gap, so
          a "neighbouring plot" long-dash and an unclassified dotted line both
          rendered as one continuous dark line. The whole 1.4.1 non-colour cue was
          being painted over by its own understudy.

          A drafter does not draw a boundary and then a line-type on top of it —
          the line-type IS the boundary. So when every side has an edge line of its
          own, this polygon contributes the closed shape and no stroke at all. It
          keeps its stroke only in the case it is actually needed: a ring with more
          sides than the edge list covers.
        */}
        <polygon
          points={outline}
          className="plot-outline"
          style={
            edges.length >= svgPts.length
              ? { stroke: 'none' }
              : { strokeWidth: ink.boundary }
          }
        />

        {/* ---- DIMENSIONS ------------------------------------------------ */}
        {geom.map((g, i) => {
          const edge = edges[i];
          if (!edge) return null;
          const a = add(g.p, g.n, dim.off + g.bow);
          const b = add(g.q, g.n, dim.off + g.bow);
          const tick = { x: (g.u.x + g.n.x) / Math.SQRT2, y: (g.u.y + g.n.y) / Math.SQRT2 };
          const t = add(g.mid, g.n, dim.off + g.bow + type.dim * 0.62);
          return (
            <g key={`dim-${edge.seq}`} className="dwg-dim">
              <line
                className="dwg-dim__witness"
                x1={add(g.p, g.n, dim.gap + g.bow).x}
                y1={add(g.p, g.n, dim.gap + g.bow).y}
                x2={add(g.p, g.n, dim.off + g.bow + dim.over).x}
                y2={add(g.p, g.n, dim.off + g.bow + dim.over).y}
                strokeWidth={ink.dim}
              />
              <line
                className="dwg-dim__witness"
                x1={add(g.q, g.n, dim.gap + g.bow).x}
                y1={add(g.q, g.n, dim.gap + g.bow).y}
                x2={add(g.q, g.n, dim.off + g.bow + dim.over).x}
                y2={add(g.q, g.n, dim.off + g.bow + dim.over).y}
                strokeWidth={ink.dim}
              />
              <line
                className="dwg-dim__line"
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                strokeWidth={ink.dim}
              />
              {/* Architectural ticks, not arrowheads: a 45 degree slash reads at
                  any size and does not need a marker whose scale is tied to the
                  stroke width. */}
              {[a, b].map((e, k) => (
                <line
                  key={k}
                  className="dwg-dim__tick"
                  x1={add(e, tick, -dim.tick / 2).x}
                  y1={add(e, tick, -dim.tick / 2).y}
                  x2={add(e, tick, dim.tick / 2).x}
                  y2={add(e, tick, dim.tick / 2).y}
                  strokeWidth={ink.dim * 1.6}
                />
              ))}
              <text
                className="dwg-dim__text"
                x={t.x}
                y={t.y}
                fontSize={type.dim}
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${g.angle.toFixed(2)} ${t.x} ${t.y})`}
              >
                {edge.lengthM} m
              </text>
            </g>
          );
        })}

        {/* ---- THE SETBACK, MEASURED INWARD ------------------------------ */}
        {footprint
          ? geom.map((g, i) => {
              const edge = edges[i];
              const s = insets[i];
              if (!edge || s === null || s === undefined || s <= 0) return null;
              /*
                THE LEADER IS AT THE THREE-QUARTER POINT, AND THE TAG IS AT THE
                QUARTER POINT, BECAUSE AT THE MIDPOINT THEY SAT ON TOP OF EACH
                OTHER.

                Both wanted the middle of the edge, and on the evidence step every
                one of the four setback figures printed straight through its edge
                tag — measured, all four, by a probe that walks the two class names
                and intersects their boxes. It is invisible in a code review and
                obvious in a screenshot, which is the class of defect this repo
                looks at pictures for.

                A half-edge apart is the largest separation two marks on one edge
                can have. Where even that is not enough — a chamfer, a short return
                — the FIGURE is dropped and its leader stays: the measurement is
                still drawn, and the number is in the legend row three lines below
                in every case. An overlapping figure loses both.
              */
              const anchor = add(g.p, g.u, g.len * 0.72);
              const from = anchor;
              const to = add(anchor, g.n, -s);
              const tick = { x: (g.u.x + g.n.x) / Math.SQRT2, y: (g.u.y + g.n.y) / Math.SQRT2 };
              const t = add(add(anchor, g.n, -s / 2), g.u, type.small * 1.4);
              const figureHalf = ((edge.setbackM ?? '').length + 2) * 0.6 * type.small * 0.5;
              const roomForFigure =
                g.len * 0.44 >= type.tag * 0.78 + figureHalf + type.small * 1.4 + span * 0.012;
              return (
                <g key={`sb-${edge.seq}`} className="dwg-setback">
                  <line
                    className="dwg-setback__line"
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    strokeWidth={ink.dim}
                  />
                  {[from, to].map((e, k) => (
                    <line
                      key={k}
                      className="dwg-setback__line"
                      x1={add(e, tick, -dim.tick / 2.6).x}
                      y1={add(e, tick, -dim.tick / 2.6).y}
                      x2={add(e, tick, dim.tick / 2.6).x}
                      y2={add(e, tick, dim.tick / 2.6).y}
                      strokeWidth={ink.dim * 1.6}
                    />
                  ))}
                  {roomForFigure ? (
                    <text
                      className="dwg-setback__text"
                      x={t.x}
                      y={t.y}
                      fontSize={type.small}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${g.angle.toFixed(2)} ${t.x} ${t.y})`}
                    >
                      {edge.setbackM} m
                    </text>
                  ) : null}
                </g>
              );
            })
          : null}

        {/* ---- THE BOUNDARY BANDS ---------------------------------------- */}
        {/*
          Under the edges, and OUTSIDE the plot — where the road is. Inward they
          would lie on the setback strip and read as another limit. The width is
          `@envelope/sheets`'s, so this strip and the A3 sheet's are one strip.
        */}
        {geom.map((g, i) => {
          const edge = edges[i];
          if (!edge) return null;
          const kind = edge.classification === 'ROAD' ? edge.roadHierarchy : edge.classification;
          const width = bandWidthM(
            edge.classification,
            (edge.roadHierarchy ?? null) as RoadHierarchy | null,
            span,
          );
          if (width <= 0 || !kind) return null;
          /* The strip FOLLOWS the boundary. On a straight one these four points
             are the rectangle this always drew; on a curve, offsetting the two
             corners alone would lay a flat band across a bent road and leave a
             wedge of it inside the plot. */
          const outer = offsetRun(g.run, width);
          const pts = [...g.run, ...[...outer].reverse()];
          return (
            <polygon
              key={`band${edge.seq}`}
              points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
              fill={BAND_FILL[kind] ?? 'var(--surface-sunken)'}
              stroke={EDGE_COLOUR[edge.classification]}
              strokeWidth={ink.dim}
              aria-hidden="true"
            />
          );
        })}

        {/* ---- THE EDGES THEMSELVES -------------------------------------- */}
        {geom.map((g, i) => {
          const edge = edges[i];
          if (!edge) return null;
          const selected = selectedEdge === edge.seq;
          const dash = EDGE_DASH[edge.classification];
          return (
            <g key={edge.seq} className={selected ? 'plot-edge plot-edge--selected' : 'plot-edge'}>
              {/* A polyline, not a line: one boundary may be many straight
                  pieces, and a curve stroked corner to corner is a chord drawn
                  over the shape it is standing in for. With no curve the points
                  are the same two and this renders identically. */}
              <polyline
                points={g.path}
                fill="none"
                stroke={EDGE_COLOUR[edge.classification]}
                strokeWidth={selected ? ink.edgeSelected : ink.edge}
                strokeLinecap="butt"
                {...(dash ? { strokeDasharray: dash.map((d) => d * U).join(' ') } : {})}
              />
              {onSelectEdge ? (
                <polyline
                  points={g.path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={U * 4}
                  className="plot-edge__hit"
                  onClick={() => onSelectEdge(edge.seq)}
                  tabIndex={0}
                  role="button"
                  aria-label={
                    words.hit(edge.seq + 1, EDGE_LABEL[edge.classification], edge.lengthM) +
                    (edge.arc ? words.figure.curve(edge.arc.radiusM, edge.arc.arcLengthM) : '') +
                    (edge.setbackM ? words.figure.setback(edge.setbackM) : '')
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectEdge(edge.seq);
                    }
                  }}
                />
              ) : null}
            </g>
          );
        })}

        {/* ---- STATIONS AND EDGE TAGS ------------------------------------ */}
        {/* A station stands at a CORNER, which is a surveyed point. The vertices
            a curve was tessellated into are not corners — seventy dots along one
            boundary would read as seventy of them. */}
        {geom.map((g, i) => (
          <circle
            key={`v${i}`}
            className="dwg-vertex"
            cx={g.p.x}
            cy={g.p.y}
            r={U * 0.9}
            strokeWidth={ink.vertex}
          />
        ))}

        {/* The tag is the join between the drawing and the legend: same numeral,
            same order, so "edge 3" is a thing you can point at. It sits inside the
            plot, where nothing else is competing for the space. */}
        {geom.map((g, i) => {
          const edge = edges[i];
          if (!edge) return null;
          // The quarter point, not the midpoint — the setback leader has the
          // three-quarter point, and the two were colliding at the middle.
          const c = add(add(g.p, g.u, g.len * 0.28), g.n, -(span * 0.05));
          return (
            <g key={`tag-${edge.seq}`}>
              <circle
                className="dwg-tag"
                cx={c.x}
                cy={c.y}
                r={type.tag * 0.78}
                strokeWidth={ink.dim}
              />
              <text
                className="dwg-tag__text"
                x={c.x}
                y={c.y}
                fontSize={type.tag}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {edge.seq + 1}
              </text>
            </g>
          );
        })}

        {/* ---- NORTH ----------------------------------------------------- */}
        {/*
          THE ARROW IS POSITIONED BY ITS TOPMOST INK, WHICH IS THE LETTER.

          The group's anchor is the needle's centre, but the thing that reaches
          highest is the "N" a full text height above the apex, and twice I placed
          this by the needle and twice the letter landed outside the frame rule — a
          north arrow with its letter clipped reads as a rendering fault, which is
          worse than no arrow. The centre is now low enough that

            y − size/2 − textSize × 1.25  >  frame top

          holds, and the probe in the scratchpad asserts it rather than my eye.

          0.62 of the side margin, not 0.55: at 0.55 the needle's base grazed the
          top witness line of the right-hand dimension.
        */}
        <NorthArrow
          x={w + margin.side * 0.62}
          y={-margin.top * 0.26}
          size={span * 0.075}
          textSize={type.small}
        />

        {/* ---- GRAPHIC SCALE --------------------------------------------- */}
        <g>
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={i}
              className={i % 2 === 0 ? 'dwg-scale__solid' : 'dwg-scale__void'}
              x={scale.x + i * scaleSeg}
              y={scale.y}
              width={scaleSeg}
              height={scale.hgt}
              strokeWidth={ink.dim}
            />
          ))}
          {[0, scaleLen / 2, scaleLen].map((m) => (
            <text
              key={m}
              className="dwg-scale__text"
              x={scale.x + m}
              y={scale.y + scale.hgt + type.small * 1.05}
              fontSize={type.small}
              textAnchor="middle"
            >
              {m}
            </text>
          ))}
          <text
            className="dwg-scale__text"
            x={scale.x + scaleLen + type.small * 0.9}
            y={scale.y + scale.hgt + type.small * 1.05}
            fontSize={type.small}
            textAnchor="start"
          >
            m · {gridStep} m grid · grid north
          </text>
        </g>

        {/* ---- TITLE STRIP ------------------------------------------------ */}
        <line
          className="dwg-title__rule"
          x1={vb.x + span * 0.04}
          y1={titleY}
          x2={vb.x + vb.w - span * 0.04}
          y2={titleY}
          strokeWidth={ink.frame}
        />
        <text
          className="dwg-title__text"
          x={vb.x + sheetInset}
          y={titleY + titleSize * 1.5}
          fontSize={titleSize}
          textAnchor="start"
        >
          {titleLeft}
        </text>
        {/*
          ONE PHRASE ON THE RIGHT, NOT TWO.

          It read "SETBACKS NOT YET RESOLVED · NOT FOR CONSTRUCTION", and on a
          50 m plot the start-anchored left cell and the end-anchored right cell met
          in the middle: the first render printed "PLOT 1365.32 m²SETBACKS NOT YET".
          Two cells cannot both be sized by their content and both be anchored to an
          edge — one of them has to be the one that yields.

          The setback state is the half that goes, because it is the half that is
          already said twice: the drawing either shows a hatched strip or does not,
          and every legend row beneath states "setback not yet resolved" in words.
          The caveat is not said anywhere else on this screen and it is the sentence
          a drawing is legally obliged to carry, so it stays.
        */}
        <text
          className="dwg-title__caveat"
          x={vb.x + vb.w - span * 0.04}
          y={titleY + type.small * 1.5}
          fontSize={type.small}
          textAnchor="end"
        >
          NOT FOR CONSTRUCTION
        </text>
      </svg>

      {/*
        The legend is the second way to select an edge, and on a phone it is the
        only usable one.

        WCAG 2.5.8 wants a 24×24 CSS-pixel target. The line in the drawing has a
        hit stroke that scales with the viewBox, so on a narrow viewport it falls
        under that — and even where it passes, asking someone to hit a thin
        diagonal is a poor way to ask. 2.5.8's "Equivalent" exception is satisfied
        by an alternative control of adequate size on the same screen, which is
        what these rows are. They are also simply better: the row states the
        classification, the length and the applied setback, which is what the
        reader wanted when they went for the line.
      */}
      <ol className="plot-legend">
        {edges.map((e) => {
          const content = (
            <>
              {/* The swatch draws the line it stands for, dash and all. A solid bar
                  could only ever show the colour, which was the half of the
                  distinction that 1.4.1 says is not enough on its own. */}
              <svg
                className="plot-legend__swatch plot-legend__swatch--line"
                viewBox="0 0 18 8"
                aria-hidden="true"
              >
                {/* The band, at the same ranking it is drawn at on the plot: an
                    arterial reads heavier than an access road here too, so the
                    key teaches the drawing rather than merely naming it. */}
                {swatchBand(e) > 0 ? (
                  <rect
                    x="1"
                    y={4 - swatchBand(e)}
                    width="16"
                    height={swatchBand(e)}
                    fill={
                      BAND_FILL[e.classification === 'ROAD' ? (e.roadHierarchy ?? '') : e.classification] ??
                      'var(--surface-sunken)'
                    }
                    stroke={EDGE_COLOUR[e.classification]}
                    strokeWidth="0.4"
                  />
                ) : null}
                <line
                  x1="1"
                  y1="4"
                  x2="17"
                  y2="4"
                  stroke={EDGE_COLOUR[e.classification]}
                  strokeWidth="2.5"
                  strokeLinecap="butt"
                  {...(SWATCH_DASH[e.classification]
                    ? { strokeDasharray: SWATCH_DASH[e.classification] }
                    : {})}
                />
              </svg>
              <span className="plot-legend__label">
                {words.legend.edge}
                {e.seq + 1}
                {words.legend.separator}
                {EDGE_LABEL[e.classification]}
                {e.roadHierarchy ? hierarchyNote(e.roadHierarchy) : ''}
              </span>
              <span className="plot-legend__value value">
                {e.lengthM} m
                {/* The chord is what the drawing measures; the arc length is what
                    the sheet prints. Both, because a reader checking one document
                    against another needs the figure that is on the document. */}
                {e.arc ? (
                  <span className="plot-legend__note">
                    {words.legend.curve(e.arc.radiusM, e.arc.arcLengthM)}
                  </span>
                ) : null}
              </span>
              {e.setbackM ? (
                <span className="plot-legend__setback">
                  {words.legend.setback}
                  <span className="value">{e.setbackM} m</span>
                </span>
              ) : (
                <span className="muted">{words.legend.unresolved}</span>
              )}
            </>
          );
          const selected = selectedEdge === e.seq;
          return (
            <li key={e.seq} className={selected ? 'is-selected' : undefined}>
              {onSelectEdge ? (
                <button
                  type="button"
                  className="plot-legend__row"
                  aria-pressed={selected}
                  onClick={() => onSelectEdge(e.seq)}
                >
                  {content}
                </button>
              ) : (
                <span className="plot-legend__row plot-legend__row--static">{content}</span>
              )}
            </li>
          );
        })}
      </ol>
      {/*
        SAID WHEREVER A BAND IS DRAWN: the band ranks, it does not measure.
        An affection plan states a road's hierarchy and never its width, and a
        strip that looked like a carriageway would be asserting a dimension
        nobody read off a document.
      */}
      {edges.some((e) => swatchBand(e) > 0) ? (
        <p className="fine-print">{words.legend.bandNote}</p>
      ) : null}
    </div>
  );
}

/**
 * The band's height in the 18x8 legend swatch.
 *
 * The same ranking the drawing uses, scaled to the box: three units for the
 * widest band. A key that showed every band at one height would name the
 * hierarchy without showing it, which is the half of the distinction 1.4.1 says
 * is not enough on its own.
 */
function swatchBand(e: PlotEdgeView): number {
  const w = bandWidthM(e.classification, (e.roadHierarchy ?? null) as RoadHierarchy | null);
  return w === 0 ? 0 : (w / 6) * 3;
}

/**
 * Grid north, and labelled as such.
 *
 * The needle is the conventional half-filled kite rather than a triangle: the
 * notch at its base is what tells you which end is the point when the arrow is
 * small, and it is small here by design — a north arrow that competes with the
 * boundary for attention is a north arrow drawn by someone who has not used one.
 */
function NorthArrow({
  x,
  y,
  size,
  textSize,
}: {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly textSize: number;
}): JSX.Element {
  const half = size / 2;
  const wing = size * 0.30;
  return (
    <g>
      <polygon
        className="dwg-north__needle"
        points={`${x},${y - half} ${x + wing},${y + half} ${x},${y + half * 0.28} ${x - wing},${
          y + half
        }`}
      />
      <text
        className="dwg-north__text"
        x={x}
        y={y - half - textSize * 0.5}
        fontSize={textSize}
        textAnchor="middle"
      >
        N
      </text>
      {/*
        THE "GRID" QUALIFIER IS NOT HERE, AND THAT WAS FORCED BY ARITHMETIC.

        It has to be said — the frame is grid-north-aligned by the kernel's own
        definition and the convergence to true north is a fact the affection plan
        never carried, so a bare N would claim a precision the input does not have.
        But the corner this arrow occupies is bounded on the left by the right-hand
        dimension's witness line at w + 0.082 span and on the right by the frame at
        w + 0.14 span. That is 0.058 span of room; four mono capitals at the size
        the 12px floor demands need 0.094. The word does not fit, at any position,
        without breaking the floor.

        So it moved to the scale strip, which has the whole sheet width and already
        carries the drawing's other frame facts. It is said once, in full, where
        there is room to read it — see the caption beside the graphic scale.
      */}
    </g>
  );
}

/**
 * Inset a convex ring by a per-edge distance, in view space.
 *
 * Presentation only. The authoritative footprint comes from the kernel, which
 * works in exact integer arithmetic and refuses degenerate results; this is the
 * same construction repeated in floating point purely so the picture matches.
 * It returns `null` rather than guessing when the result would be degenerate —
 * a drawing that shows a footprint where the engine found none would be a lie
 * told in pixels.
 */
function insetPolygon(
  pts: readonly { x: number; y: number }[],
  insets: readonly number[],
): { x: number; y: number }[] | null {
  const n = pts.length;
  const lines: { a: number; b: number; c: number }[] = [];

  for (let i = 0; i < n; i++) {
    const p = pts[i]!;
    const q = pts[(i + 1) % n]!;
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return null;
    // In view space (y flipped) the interior normal is (dy, -dx) / len.
    const a = dy / len;
    const b = -dx / len;
    lines.push({ a, b, c: a * p.x + b * p.y + insets[i]! });
  }

  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const l1 = lines[(i - 1 + n) % n]!;
    const l2 = lines[i]!;
    const det = l1.a * l2.b - l2.a * l1.b;
    if (Math.abs(det) < 1e-9) return null;
    out.push({
      x: (l1.c * l2.b - l2.c * l1.b) / det,
      y: (l1.a * l2.c - l2.a * l1.c) / det,
    });
  }

  const area = out.reduce((acc, p, i) => {
    const q = out[(i + 1) % n]!;
    return acc + (p.x * q.y - q.x * p.y);
  }, 0);
  // Orientation must survive the inset — a flipped sign means the setbacks
  // over-consumed the plot and there is no footprint to draw.
  return Math.sign(area) === Math.sign(
    pts.reduce((acc, p, i) => {
      const q = pts[(i + 1) % n]!;
      return acc + (p.x * q.y - q.x * p.y);
    }, 0),
  ) && area !== 0
    ? out
    : null;
}
