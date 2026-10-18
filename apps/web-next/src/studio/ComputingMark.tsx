import type { JSX } from 'react';

import { useLocale } from '../lib/locale.js';
import { BusyMark } from '../ui/busy.js';

/*
  THE MARK WHILE THE STUDIO WAITS: over the canvas until what was asked for
  arrives — opening a study, reading the affection plan, filing the plot, and
  the run. It is the same `BusyMark` the buttons carry, larger, so the two cannot
  drift apart. It was three turning sparks until 18 Oct 2026; a reader now takes
  that shape for the mark of a generated page, and the owner asked for it gone.

  Accent, never amber — amber is reserved for what was assumed, and a loading
  mark is the most-repeated thing on the canvas. The words say what is being
  done and nothing about who is doing it: every figure that follows comes from
  the rules on file, and a line saying the drawings were "generated" would be the
  first sentence on this screen that is not true.

  With reduced motion the ring stands still; the words and `role="status"`
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
      className="absolute inset-0 z-20 grid place-items-center bg-base/90"
    >
      <div className="grid justify-items-center gap-3 px-6 text-center">
        <BusyMark className="size-9 text-accent" />
        <p className="text-[15px] font-medium text-fg">{words.title}</p>
        <p className="max-w-[34ch] text-[12.5px] leading-relaxed text-secondary">{words.body}</p>
      </div>
    </div>
  );
}
