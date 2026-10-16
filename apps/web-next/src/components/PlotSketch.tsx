import { motion, useReducedMotion } from 'motion/react';
import { type KeyboardEvent, type MouseEvent, type PointerEvent, useState } from 'react';

import { cn } from '../lib/cn.js';
import { EASE } from '../ui/motion.js';

/*
  THE PLOT AS A PLAN, NORTH UP.

  Before the plot is filed, this draws the corners the reader typed and nothing
  more — no length, because a length measured off the drawing is a figure the
  engine did not produce. Once the engine has the plot, each boundary carries
  the length the engine computed (`lengthM`), never one measured here.

  A boundary's class is carried by its dash and weight as well as its ink, and an
  unclassified boundary is drawn as a question: thin, dotted, its number in a
  dashed ring. Every boundary carries its NUMBER — a `?` told the reader that
  something was missing and not which boundary it was (Eng. Mohamed, 16 Oct
  2026). With `onPick`, the number is a button that opens that boundary.

  The motion is a pen tracing the ring over the drawing, then lifting away. It is
  a separate line on top: animating `pathLength` on the boundaries themselves
  would replace their dash, and the dash is how a boundary's class reads without
  colour. Every boundary is at full ink from the first frame.
*/

/** A vehicle opening on the boundary, in the vertices' metres, and which way its cars go. */
export interface SketchOpening {
  readonly start: { readonly x: string; readonly y: string };
  readonly end: { readonly x: string; readonly y: string };
  readonly role: 'ENTRY_EXIT' | 'ENTRY' | 'EXIT';
}

/**
 * Where the reader put an opening, before the engine has drawn it: a point on a
 * boundary, `at` of the way from its first corner, and which way its cars go. A
 * mark of what was asked for, drawn as a point and not as an opening — the
 * opening's extent is the engine's to work out.
 */
export interface SketchPin {
  readonly seq: number;
  readonly at: number;
  readonly role: SketchOpening['role'];
  readonly label: string;
}

export interface SketchEdge {
  readonly seq: number;
  readonly classification: 'ROAD' | 'ADJACENT_PLOT' | 'OPEN_SPACE' | 'OTHER' | '';
  readonly roadHierarchy?: string | null;
  /** The engine's length, when the engine has measured it. */
  readonly lengthM?: string;
}

const STYLE: Readonly<Record<SketchEdge['classification'], { stroke: string; width: number; dash?: string }>> = {
  ROAD: { stroke: 'var(--accent)', width: 3 },
  ADJACENT_PLOT: { stroke: 'var(--text-secondary)', width: 1.5, dash: '6 4' },
  OPEN_SPACE: { stroke: 'var(--derived)', width: 1.5, dash: '2 3' },
  OTHER: { stroke: 'var(--text-tertiary)', width: 1.5, dash: '1 3' },
  '': { stroke: 'var(--text-tertiary)', width: 1, dash: '1 4' },
};

export function PlotSketch({
  vertices,
  edges,
  highlight,
  chosenEdge,
  className,
  label,
  compact = false,
  onPick,
  pickLabel,
  onPickAt,
  openings = [],
  pins = [],
}: {
  readonly vertices: readonly { readonly x: string; readonly y: string }[];
  readonly edges: readonly SketchEdge[];
  readonly highlight?: number | null;
  /** The boundary the vehicle entrance is on. */
  readonly chosenEdge?: number | null;
  readonly className?: string;
  readonly label: string;
  readonly compact?: boolean;
  /** Makes each boundary's number a button that reports its seq. */
  readonly onPick?: (seq: number) => void;
  /** The accessible name of boundary `seq`'s button. Required with `onPick`. */
  readonly pickLabel?: (seq: number) => string;
  /**
   * A click ON a boundary (not its number) reports where along it, 0 at its
   * first corner and 1 at its second. The number stays the keyboard's way in.
   */
  readonly onPickAt?: (seq: number, fraction: number) => void;
  /** Vehicle openings, each drawn as a gap in the boundary with the way its cars go. */
  readonly openings?: readonly SketchOpening[];
  /** Openings the reader placed and the engine has not drawn yet. */
  readonly pins?: readonly SketchPin[];
}): JSX.Element {
  const reduce = useReducedMotion();
  // Where the pointer is on a boundary, while `onPickAt` is listening: the point a click would place.
  const [hover, setHover] = useState<{ readonly seq: number; readonly at: number } | null>(null);
  const pts = vertices.map((v) => ({ x: Number(v.x), y: Number(v.y) })).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (pts.length < 3) {
    return (
      <svg role="img" aria-label={label} viewBox="0 0 100 60" className={cn('h-full w-full', className)}>
        <rect x="10" y="10" width="80" height="40" fill="none" stroke="var(--border-strong)" strokeDasharray="3 3" />
      </svg>
    );
  }
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY, 1);
  const pad = span * (compact ? 0.08 : 0.24);
  // Wider at the sides: a length beside a side that runs up the page reads outward, and needs the room.
  const padX = span * (compact ? 0.08 : 0.34);
  const w = maxX - minX + padX * 2;
  const h = maxY - minY + pad * 2;
  // North up: plot +y is drawn upward, so y is flipped once here.
  const P = (p: { x: number; y: number }): [number, number] => [p.x - minX + padX, maxY - p.y + pad];
  const unit = span / 100;
  const ring = pts.map((p) => P(p).join(',')).join(' ');
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;

  return (
    // An image holds no controls; with buttons inside it, the drawing is a labelled group.
    <svg role={onPick ? 'group' : 'img'} aria-label={label} viewBox={`0 0 ${w} ${h}`} className={cn('h-full w-full', className)} preserveAspectRatio="xMidYMid meet">
      <polygon points={ring} fill="var(--surface-raised)" fillOpacity={0.75} stroke="none" />
      {pts.map((p, i) => {
        const q = pts[(i + 1) % pts.length]!;
        const e = edges[i];
        const s = STYLE[e?.classification ?? ''];
        const [x1, y1] = P(p);
        const [x2, y2] = P(q);
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        // Label outside the plot, along the edge's outward normal.
        const [ccx, ccy] = P({ x: cx, y: cy });
        let nx = -(y2 - y1);
        let ny = x2 - x1;
        const len = Math.hypot(nx, ny) || 1;
        nx /= len;
        ny /= len;
        if ((mx - ccx) * nx + (my - ccy) * ny < 0) {
          nx = -nx;
          ny = -ny;
        }
        const lx = mx + nx * unit * (compact ? 0 : 7);
        const ly = my + ny * unit * (compact ? 0 : 7);
        const hot = highlight === i || chosenEdge === i;
        const unanswered = (e?.classification ?? '') === '';
        const pick = onPick ? (): void => onPick(i) : undefined;
        // Where on this boundary the pointer is, as a fraction of its length.
        const along = (ev: MouseEvent<SVGLineElement> | PointerEvent<SVGLineElement>): number => {
          const m = ev.currentTarget.ownerSVGElement?.getScreenCTM();
          if (!m) return 0.5;
          const at = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
          const dx = x2 - x1;
          const dy = y2 - y1;
          const t = ((at.x - x1) * dx + (at.y - y1) * dy) / (dx * dx + dy * dy || 1);
          return Math.min(1, Math.max(0, t));
        };
        const pickAt = onPickAt ? (ev: MouseEvent<SVGLineElement>): void => onPickAt(i, along(ev)) : undefined;
        return (
          <g key={i}>
            {pick || pickAt ? (
              // A wide, unpainted stroke over the boundary: the line itself is a target too.
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="transparent"
                strokeWidth={18}
                vectorEffect="non-scaling-stroke"
                className={onPickAt ? 'cursor-crosshair' : 'cursor-pointer'}
                aria-hidden="true"
                onClick={pickAt ?? pick}
                {...(onPickAt
                  ? {
                      onPointerMove: (ev: PointerEvent<SVGLineElement>) => setHover({ seq: i, at: along(ev) }),
                      onPointerLeave: () => setHover(null),
                    }
                  : {})}
              />
            ) : null}
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={hot ? 'var(--accent-strong)' : s.stroke}
              // Screen pixels, whatever the plot's size: a 400 m plot and a 20 m one draw the same pen.
              strokeWidth={compact ? s.width : hot ? s.width + 2 : s.width + 0.5}
              strokeDasharray={s.dash}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
            {!compact ? (
              <g>
                <g
                  {...(pick
                    ? {
                        role: 'button',
                        tabIndex: 0,
                        'aria-label': pickLabel?.(i) ?? String(i),
                        'aria-pressed': hot,
                        className: 'cursor-pointer outline-none [&:focus-visible>circle:nth-child(2)]:stroke-[var(--focus-ring)]',
                        onClick: pick,
                        onKeyDown: (ev: KeyboardEvent) => {
                          if (ev.key === 'Enter' || ev.key === ' ') {
                            ev.preventDefault();
                            pick();
                          }
                        },
                      }
                    : {})}
                >
                  {/* The target is wider than the ring it draws: a finger, not a cursor, sets its size. */}
                  {pick ? <circle cx={lx} cy={ly} r={unit * 5.5} fill="transparent" /> : <g />}
                  <circle
                    cx={lx}
                    cy={ly}
                    r={unit * 3.4}
                    fill={hot ? 'var(--accent-subtle)' : 'var(--surface-panel)'}
                    stroke={hot ? 'var(--accent-strong)' : 'var(--border-strong)'}
                    strokeWidth={unit * (hot ? 0.5 : 0.3)}
                    // Unanswered reads without colour: a broken ring around the number.
                    strokeDasharray={unanswered ? `${unit * 1.2} ${unit * 0.9}` : undefined}
                  />
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={unit * 3.2}
                    fontFamily="var(--font-mono)"
                    fill={unanswered ? 'var(--text-secondary)' : 'var(--text-primary)'}
                    pointerEvents="none"
                  >
                    {i}
                  </text>
                </g>
                {e?.lengthM ? (
                  <text
                    /*
                      Further out along the same normal, so the figure never sits on
                      the boundary. Beside a side that runs up the page the figure is
                      wider than the gap, and centred it ran into the edge's number:
                      there it starts just past the circle and reads away from it.
                      Always left to right — a figure — whatever the page's direction.
                    */
                    direction="ltr"
                    x={Math.abs(nx) > Math.abs(ny) ? lx + nx * unit * 4.6 : lx + nx * unit * 7.5}
                    y={Math.abs(nx) > Math.abs(ny) ? ly : ly + ny * unit * 7.5}
                    textAnchor={Math.abs(nx) > Math.abs(ny) ? (nx > 0 ? 'start' : 'end') : 'middle'}
                    dominantBaseline="central"
                    fontSize={unit * 2.7}
                    fontFamily="var(--font-mono)"
                    fill="var(--text-secondary)"
                  >
                    {e.lengthM} m
                  </text>
                ) : null}
              </g>
            ) : null}
          </g>
        );
      })}
      {!compact && !reduce ? (
        <motion.polygon
          // Replayed when a corner is added or removed — not on every keystroke inside one.
          key={pts.length}
          points={ring}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          aria-hidden="true"
          initial={{ pathLength: 0, opacity: 1 }}
          animate={{ pathLength: 1, opacity: 0 }}
          transition={{ pathLength: { duration: 1.1, ease: EASE }, opacity: { delay: 1.1, duration: 0.6 } }}
        />
      ) : null}
      {!compact
        ? pts.map((p, i) => {
            const [x, y] = P(p);
            return (
              <motion.circle
                key={`v${i}`}
                cx={x}
                cy={y}
                r={unit * 1.1}
                fill="var(--text-primary)"
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                initial={reduce ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.08 * i }}
              />
            );
          })
        : null}
      {openings.map((o, k) => {
        /*
          A gap in the boundary, and an arrow across it the way the cars go: in at
          an entry, out at an exit, both ways through a two-way opening. The arrow
          is ink, not colour, so the direction reads in any theme and without hue.
        */
        const a = P({ x: Number(o.start.x), y: Number(o.start.y) });
        const b = P({ x: Number(o.end.x), y: Number(o.end.y) });
        if (![...a, ...b].every(Number.isFinite)) return null;
        const [ccx, ccy] = P({ x: cx, y: cy });
        const mx = (a[0] + b[0]) / 2;
        const my = (a[1] + b[1]) / 2;
        let nx = -(b[1] - a[1]);
        let ny = b[0] - a[0];
        const nl = Math.hypot(nx, ny) || 1;
        nx /= nl;
        ny /= nl;
        if ((ccx - mx) * nx + (ccy - my) * ny < 0) {
          nx = -nx;
          ny = -ny;
        }
        const L = unit * 9;
        const tail: [number, number] = [mx - nx * L * 0.35, my - ny * L * 0.35];
        const tip: [number, number] = [mx + nx * L * 0.65, my + ny * L * 0.65];
        const head = (to: [number, number], from: [number, number]): string => {
          const ux = to[0] - from[0];
          const uy = to[1] - from[1];
          const ul = Math.hypot(ux, uy) || 1;
          const [px, py] = [(ux / ul) * unit * 2.4, (uy / ul) * unit * 2.4];
          return `M${to[0] - px - py * 0.6} ${to[1] - py + px * 0.6} L${to[0]} ${to[1]} L${to[0] - px + py * 0.6} ${to[1] - py - px * 0.6}`;
        };
        const [from, to] = o.role === 'EXIT' ? [tip, tail] : [tail, tip];
        return (
          <g key={`o${k}`} aria-hidden="true" pointerEvents="none">
            <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="var(--surface-panel)" strokeWidth={7} vectorEffect="non-scaling-stroke" />
            <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="var(--text-primary)" strokeWidth={1.5} strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
            <path
              d={`M${from[0]} ${from[1]} L${to[0]} ${to[1]} ${head(to, from)}${o.role === 'ENTRY_EXIT' ? ` ${head(from, to)}` : ''}`}
              fill="none"
              stroke="var(--text-primary)"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}
      {(() => {
        /*
          THE READER'S PLACEMENT, AND THE POINT A CLICK WOULD PLACE. Both are a point
          on the boundary with an arrow across it the way the cars go — the same ink
          the engine's openings use, without the opening's width, which is the
          engine's to work out once the run is computed.
        */
        const onEdge = (seq: number, at: number) => {
          const p = pts[seq];
          const q = pts[(seq + 1) % pts.length];
          if (!p || !q) return null;
          const a = P(p);
          const b = P(q);
          const x = a[0] + (b[0] - a[0]) * at;
          const y = a[1] + (b[1] - a[1]) * at;
          const [ccx, ccy] = P({ x: cx, y: cy });
          let nx = -(b[1] - a[1]);
          let ny = b[0] - a[0];
          const nl = Math.hypot(nx, ny) || 1;
          nx /= nl;
          ny /= nl;
          if ((ccx - x) * nx + (ccy - y) * ny < 0) {
            nx = -nx;
            ny = -ny;
          }
          return { x, y, nx, ny };
        };
        const arrow = (o: { x: number; y: number; nx: number; ny: number }, role: SketchPin['role']): string => {
          const L = unit * 9;
          const tail: [number, number] = [o.x - o.nx * L * 0.45, o.y - o.ny * L * 0.45];
          const tip: [number, number] = [o.x + o.nx * L * 0.55, o.y + o.ny * L * 0.55];
          const head = (to: [number, number], from: [number, number]): string => {
            const ux = to[0] - from[0];
            const uy = to[1] - from[1];
            const ul = Math.hypot(ux, uy) || 1;
            const [px, py] = [(ux / ul) * unit * 2.4, (uy / ul) * unit * 2.4];
            return `M${to[0] - px - py * 0.6} ${to[1] - py + px * 0.6} L${to[0]} ${to[1]} L${to[0] - px + py * 0.6} ${to[1] - py - px * 0.6}`;
          };
          const [from, to] = role === 'EXIT' ? [tip, tail] : [tail, tip];
          return `M${from[0]} ${from[1]} L${to[0]} ${to[1]} ${head(to, from)}${role === 'ENTRY_EXIT' ? ` ${head(from, to)}` : ''}`;
        };
        const ghost = hover && onPickAt ? onEdge(hover.seq, hover.at) : null;
        const ghostLength = hover ? edges[hover.seq]?.lengthM : undefined;
        return (
          <g pointerEvents="none">
            {pins.map((pin) => {
              const o = onEdge(pin.seq, pin.at);
              if (!o) return null;
              return (
                <g key={`pin-${pin.seq}-${pin.role}`} data-pin={pin.role}>
                  <path d={arrow(o, pin.role)} fill="none" stroke="var(--surface-panel)" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  <path d={arrow(o, pin.role)} fill="none" stroke="var(--text-primary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  <circle cx={o.x} cy={o.y} r={unit * 1.6} fill="var(--accent-strong)" stroke="var(--surface-panel)" strokeWidth={unit * 0.5} />
                  <text
                    x={o.x - o.nx * unit * 8}
                    y={o.y - o.ny * unit * 8}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={unit * 2.8}
                    fontWeight={600}
                    fill="var(--text-primary)"
                    stroke="var(--surface-base)"
                    strokeWidth={unit * 0.8}
                    paintOrder="stroke"
                  >
                    {pin.label}
                  </text>
                </g>
              );
            })}
            {ghost && hover ? (
              <g data-ghost="" opacity={0.75}>
                <circle cx={ghost.x} cy={ghost.y} r={unit * 1.4} fill="none" stroke="var(--accent-strong)" strokeWidth={unit * 0.5} />
                <circle cx={ghost.x} cy={ghost.y} r={unit * 0.5} fill="var(--accent-strong)" />
                {ghostLength ? (
                  <text
                    direction="ltr"
                    x={ghost.x + ghost.nx * unit * 6}
                    y={ghost.y + ghost.ny * unit * 6}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={unit * 2.6}
                    fontFamily="var(--font-mono)"
                    fill="var(--text-primary)"
                    stroke="var(--surface-base)"
                    strokeWidth={unit * 0.8}
                    paintOrder="stroke"
                  >
                    {`P${hover.seq} + ${(hover.at * Number(ghostLength)).toFixed(1)} m`}
                  </text>
                ) : null}
              </g>
            ) : null}
          </g>
        );
      })()}
      {!compact ? (
        <g transform={`translate(${w - pad * 0.55} ${pad * 0.6})`} aria-hidden="true">
          <path d={`M0 ${-unit * 4} L${unit * 2} ${unit * 2} L0 ${unit * 0.8} L${-unit * 2} ${unit * 2} Z`} fill="var(--text-secondary)" />
          <text y={unit * 6} textAnchor="middle" fontSize={unit * 3} fontFamily="var(--font-mono)" fill="var(--text-secondary)">
            N
          </text>
        </g>
      ) : null}
    </svg>
  );
}

/** A stored run's plot ring and setback line, in millimetres, as a thumbnail. */
export function OutlineThumb({
  plot,
  setback,
  label,
}: {
  readonly plot: readonly (readonly [number, number])[];
  readonly setback: readonly (readonly [number, number])[];
  readonly label: string;
}): JSX.Element {
  const all = [...plot, ...setback];
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = Math.max(maxX - minX, maxY - minY) * 0.1;
  const P = (p: readonly [number, number]): string => `${p[0] - minX + pad},${maxY - p[1] + pad}`;
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`} className="h-full w-full">
      <polygon points={plot.map(P).join(' ')} fill="var(--surface-raised)" stroke="var(--text-secondary)" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
      {setback.length > 2 ? (
        <polygon
          points={setback.map(P).join(' ')}
          fill="var(--accent-subtle)"
          stroke="var(--accent)"
          strokeWidth={1.25}
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
    </svg>
  );
}
