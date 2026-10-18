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

/**
 * The three sparks, as in the owner's reference: the large one, then the small one
 * above, then the one below. `cls` is each one's keyframe set in styles.css, where
 * the 2.8 s cycle and the order they turn in are written.
 */
const SPARKS = [
  { x: 34, y: 30, r: 15, cls: 'spark-a' },
  { x: 14, y: 12, r: 6.5, cls: 'spark-b' },
  { x: 12, y: 46, r: 6.5, cls: 'spark-c' },
] as const;

/*
  The small mark, for a wait inside a button or a line of text: the owner asked on
  16 Oct 2026 for the spark to show at every stage, not only over the canvas, and
  for each star to arrive on its own. In `currentColor`, so it takes the ink of
  whatever it waits in — never amber, which is reserved for what was assumed.
  Still under reduced motion; the words beside it carry the state.
*/
export function SparkMark({ className }: { readonly className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 56 60" aria-hidden="true" className={cn('inline-block size-4 shrink-0 overflow-visible', className)}>
      {SPARKS.map((s) => (
        <path key={s.cls} d={sparkPath(s.x, s.y, s.r)} fill="currentColor" className={cn('spark-path', s.cls)} />
      ))}
    </svg>
  );
}
