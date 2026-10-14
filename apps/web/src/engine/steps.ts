/**
 * The ten steps, and what each one is still waiting for.
 *
 * Split out of `App.tsx` (1,534 lines) so the step bar, the footer and the
 * inspector can all read one table. The ids are the engine's names for a step —
 * what `?step=` answers to — and the labels are copy in `i18n/app.*.ts`.
 *
 * `gated` was DELETED long before this file existed. It was metadata nobody read:
 * the flag said `plot` was gated and the `reachable` computation put `plot` in the
 * done set unconditionally, so the two had drifted and only one of them was doing
 * anything. `missingFor` is the one source for what blocks a step.
 */

import type { PlotView, RunView } from '../api/client.js';

export const STEPS = [
  { id: 'intake' },
  { id: 'plot' },
  { id: 'parameters' },
  { id: 'rules' },
  { id: 'assumptions' },
  { id: 'capacity' },
  { id: 'parking' },
  { id: 'checks' },
  { id: 'evidence' },
  { id: 'export' },
] as const;

export type StepId = (typeof STEPS)[number]['id'];

/**
 * What a step is still waiting for, or `null` when it is open.
 *
 * ONE function, and both the strip's `reachable` set and the footer's sentence are
 * built from it. They are the same fact asked two ways — *may I go there* and *why
 * not yet* — and a footer that worked out its own answer would be a second opinion
 * about what blocks a step. The two would drift the first time a gate moved, and
 * the drift would be invisible: the strip would unlock a step the footer still
 * refused, or worse, the other way round.
 */
export type Missing = 'plot' | 'confirm' | 'run';

export interface FlowState {
  readonly plot: PlotView | null;
  readonly confirmed: boolean;
  readonly run: RunView | null;
}

export function missingFor(id: StepId, state: FlowState): Missing | null {
  switch (id) {
    /* Step 0 is not gated — a plot whose sheet is not to hand is still a plot —
       and step 1 is where the flow begins, so neither ever waits for anything. */
    case 'intake':
    case 'plot':
      return null;
    case 'parameters':
      return state.plot ? null : 'plot';
    case 'rules':
      if (!state.plot) return 'plot';
      return state.confirmed ? null : 'confirm';
    /* Steps 5–9 are freely navigable ONCE THERE IS A RUN, and not before: each of
       them renders the run's own figures and has nothing to show without it. */
    default:
      return state.run ? null : 'run';
  }
}

/**
 * What the `?step=` banner has to say, kept as DATA and not as a sentence.
 *
 * It used to be stored as an English string, set once in an effect. A sentence in
 * state is a sentence in the language that was active when the effect ran — switch
 * to Arabic and the banner stays English until the address changes. The facts are
 * stored instead and the sentence is written at render, in whichever language is
 * current.
 */
export type StepHint =
  | { readonly kind: 'unknown'; readonly wanted: string }
  | { readonly kind: 'locked'; readonly step: StepId };
