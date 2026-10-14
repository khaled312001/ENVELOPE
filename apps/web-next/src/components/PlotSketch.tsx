import { motion, useReducedMotion } from 'motion/react';

import { cn } from '../lib/cn.js';
import { EASE } from '../ui/motion.js';

/*
  THE PLOT AS A PLAN, NORTH UP.

  Before the plot is filed, this draws the corners the reader typed and nothing
  more — no length, because a length measured off the drawing is a figure the
  engine did not produce. Once the engine has the plot, each boundary carries
  the length the engine computed (`lengthM`), never one measured here.

  A boundary's class is carried by its dash and weight as well as its ink, and an
  unclassified boundary is drawn as a question: thin, dotted, with a `?`.

  The motion is a pen tracing the ring over the drawing, then lifting away. It is
  a separate line on top: animating `pathLength` on the boundaries themselves
  would replace their dash, and the dash is how a boundary's class reads without
  colour. Every boundary is at full ink from the first frame.
*/

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
}: {
  readonly vertices: readonly { readonly x: string; readonly y: string }[];
  readonly edges: readonly SketchEdge[];
  readonly highlight?: number | null;
  /** The boundary the vehicle entrance is on. */
  readonly chosenEdge?: number | null;
  readonly className?: string;
  readonly label: string;
  readonly compact?: boolean;
}): JSX.Element {
  const reduce = useReducedMotion();
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
    <svg role="img" aria-label={label} viewBox={`0 0 ${w} ${h}`} className={cn('h-full w-full', className)} preserveAspectRatio="xMidYMid meet">
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
        return (
          <g key={i}>
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
            />
            {!compact ? (
              <g>
                <circle cx={lx} cy={ly} r={unit * 3.4} fill="var(--surface-panel)" stroke={hot ? 'var(--accent-strong)' : 'var(--border-strong)'} strokeWidth={unit * 0.3} />
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={unit * 3.2}
                  fontFamily="var(--font-mono)"
                  fill="var(--text-primary)"
                >
                  {e?.classification === '' ? '?' : i}
                </text>
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
