import { motion, useReducedMotion } from 'motion/react';
import type { JSX } from 'react';

import { useLocale } from '../lib/locale.js';
import { SPARKS, sparkPath } from '../ui/spark.js';

/*
  THE MARK WHILE THE STUDIO WAITS (the owner's call, 16 Oct 2026): three sparks
  over the canvas until what was asked for arrives. First only while a study was
  computed; the same day he asked for it at every stage, so it now stands over
  opening a study, reading the affection plan and filing the plot as well.

  Accent, never amber — amber is reserved for what was assumed, and a loading
  mark is the most-repeated thing on the canvas. The words say what is being
  done and nothing about who is doing it: every figure that follows comes from
  the rules on file, and a line saying the drawings were "generated" would be the
  first sentence on this screen that is not true.

  With reduced motion the sparks stand still; the words and `role="status"`
  carry the state either way.
*/
export type WaitStage = 'load' | 'sheet' | 'plot' | 'run';

export function ComputingMark({ stage = 'run' }: { readonly stage?: WaitStage }): JSX.Element {
  const { t } = useLocale();
  const reduce = useReducedMotion();
  const words = stage === 'run' ? t.studio.computing : t.studio.waiting[stage];
  return (
    <div
      role="status"
      aria-live="polite"
      // 90%: at 80% an empty step's own title read through, behind the mark's words.
      className="absolute inset-0 z-20 grid place-items-center bg-base/90 backdrop-blur-[2px]"
    >
      <div className="grid justify-items-center gap-3 px-6 text-center">
        <svg viewBox="0 0 56 60" className="size-16 text-accent" aria-hidden="true">
          {SPARKS.map((s) => (
            <motion.path
              key={`${s.x}-${s.y}`}
              d={sparkPath(s.x, s.y, s.r)}
              fill="currentColor"
              style={{ transformOrigin: `${s.x}px ${s.y}px`, transformBox: 'view-box' }}
              initial={false}
              animate={reduce ? { opacity: 1, scale: 1 } : { opacity: [0.35, 1, 0.35], scale: [0.8, 1, 0.8] }}
              transition={reduce ? { duration: 0 } : { duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: s.delay }}
            />
          ))}
        </svg>
        <p className="text-[15px] font-medium text-fg">{words.title}</p>
        <p className="max-w-[34ch] text-[12.5px] leading-relaxed text-secondary">{words.body}</p>
      </div>
    </div>
  );
}
