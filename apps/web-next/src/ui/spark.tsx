import type { JSX } from 'react';

import { cn } from '../lib/cn.js';

/** A four-pointed spark centred on (cx, cy), `r` from centre to tip. */
export function sparkPath(cx: number, cy: number, r: number): string {
  const k = r * 0.22; // the waist: how far the curves pull in toward the centre
  return (
    `M ${cx} ${cy - r} ` +
    `C ${cx + k} ${cy - k} ${cx + k} ${cy - k} ${cx + r} ${cy} ` +
    `C ${cx + k} ${cy + k} ${cx + k} ${cy + k} ${cx} ${cy + r} ` +
    `C ${cx - k} ${cy + k} ${cx - k} ${cy + k} ${cx - r} ${cy} ` +
    `C ${cx - k} ${cy - k} ${cx - k} ${cy - k} ${cx} ${cy - r} Z`
  );
}

/** The three sparks: the large one and two small ones, as in the owner's reference. */
export const SPARKS = [
  { x: 34, y: 30, r: 15, delay: 0 },
  { x: 14, y: 12, r: 6.5, delay: 0.35 },
  { x: 12, y: 46, r: 6.5, delay: 0.7 },
] as const;

/*
  The small mark, for a wait inside a button or a line of text: the owner asked on
  16 Oct 2026 for the spark to show at every stage, not only over the canvas. In
  `currentColor`, so it takes the ink of whatever it waits in — never amber, which is
  reserved for what was assumed. It pulses only where motion is allowed; still, the
  words beside it carry the state.
*/
export function SparkMark({ className }: { readonly className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 56 60" aria-hidden="true" className={cn('inline-block size-4 shrink-0', className)}>
      {SPARKS.map((s) => (
        <path
          key={`${s.x}-${s.y}`}
          d={sparkPath(s.x, s.y, s.r)}
          fill="currentColor"
          className="motion-safe:animate-pulse"
          style={{ animationDelay: `${s.delay}s` }}
        />
      ))}
    </svg>
  );
}
