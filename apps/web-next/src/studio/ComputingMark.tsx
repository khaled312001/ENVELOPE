import { motion, useReducedMotion } from 'motion/react';
import type { JSX } from 'react';

import { useLocale } from '../lib/locale.js';

/*
  THE MARK WHILE A STUDY IS COMPUTED (the owner's call, 16 Oct 2026): three
  sparks over the canvas until the massing and the drawings arrive.

  Accent, never amber — amber is reserved for what was assumed, and a loading
  mark is the most-repeated thing on the canvas. The words say what is being
  done and nothing about who is doing it: every figure that follows comes from
  the rules on file, and a line saying the drawings were "generated" would be the
  first sentence on this screen that is not true.

  With reduced motion the sparks stand still; the words and `role="status"`
  carry the state either way.
*/
const SPARKS = [
  // x, y, size — the large spark and two small ones, as in the reference.
  { x: 34, y: 30, r: 15, delay: 0 },
  { x: 14, y: 12, r: 6.5, delay: 0.35 },
  { x: 12, y: 46, r: 6.5, delay: 0.7 },
] as const;

/** A four-pointed spark centred on (cx, cy), `r` from centre to tip. */
function spark(cx: number, cy: number, r: number): string {
  const k = r * 0.22; // the waist: how far the curves pull in toward the centre
  return (
    `M ${cx} ${cy - r} ` +
    `C ${cx + k} ${cy - k} ${cx + k} ${cy - k} ${cx + r} ${cy} ` +
    `C ${cx + k} ${cy + k} ${cx + k} ${cy + k} ${cx} ${cy + r} ` +
    `C ${cx - k} ${cy + k} ${cx - k} ${cy + k} ${cx - r} ${cy} ` +
    `C ${cx - k} ${cy - k} ${cx - k} ${cy - k} ${cx} ${cy - r} Z`
  );
}

export function ComputingMark(): JSX.Element {
  const { t } = useLocale();
  const reduce = useReducedMotion();
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 z-20 grid place-items-center bg-base/80 backdrop-blur-[2px]"
    >
      <div className="grid justify-items-center gap-3 px-6 text-center">
        <svg viewBox="0 0 56 60" className="size-16 text-accent" aria-hidden="true">
          {SPARKS.map((s) => (
            <motion.path
              key={`${s.x}-${s.y}`}
              d={spark(s.x, s.y, s.r)}
              fill="currentColor"
              style={{ transformOrigin: `${s.x}px ${s.y}px`, transformBox: 'view-box' }}
              initial={false}
              animate={reduce ? { opacity: 1, scale: 1 } : { opacity: [0.35, 1, 0.35], scale: [0.8, 1, 0.8] }}
              transition={reduce ? { duration: 0 } : { duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: s.delay }}
            />
          ))}
        </svg>
        <p className="text-[15px] font-medium text-fg">{t.studio.computing.title}</p>
        <p className="max-w-[34ch] text-[12.5px] leading-relaxed text-secondary">{t.studio.computing.body}</p>
      </div>
    </div>
  );
}
