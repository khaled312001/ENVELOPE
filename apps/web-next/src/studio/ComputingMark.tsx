import type { JSX } from 'react';

import { useLocale } from '../lib/locale.js';
import { SparkMark } from '../ui/spark.js';

/*
  THE MARK WHILE THE STUDIO WAITS (the owner's call, 16 Oct 2026): three sparks
  over the canvas until what was asked for arrives — opening a study, reading the
  affection plan, filing the plot, and the run. Each star arrives on its own: the
  large one turns in and overshoots, the small one above follows, then the one
  below; the three breathe together and leave together, turning, and the cycle
  starts again. It is the same `SparkMark` the buttons carry, larger, so the two
  cannot drift apart; the choreography is in styles.css.

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
  const words = stage === 'run' ? t.studio.computing : t.studio.waiting[stage];
  return (
    <div
      role="status"
      aria-live="polite"
      // 90%: at 80% an empty step's own title read through, behind the mark's words.
      className="absolute inset-0 z-20 grid place-items-center bg-base/90 backdrop-blur-[2px]"
    >
      <div className="grid justify-items-center gap-3 px-6 text-center">
        <div className="relative grid size-20 place-items-center text-accent">
          {/* A soft light behind the large star, breathing with it. Decoration: hidden from readers. */}
          <span aria-hidden="true" className="spark-glow absolute size-14 rounded-full bg-accent/15 blur-xl" />
          <SparkMark className="relative size-16" />
        </div>
        <p className="text-[15px] font-medium text-fg">{words.title}</p>
        <p className="max-w-[34ch] text-[12.5px] leading-relaxed text-secondary">{words.body}</p>
      </div>
    </div>
  );
}
