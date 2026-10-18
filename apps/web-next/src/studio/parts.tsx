import { ArrowRight, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

import type { TracedWire } from '@web/components/TracedValue.js';

import { cn } from '../lib/cn.js';
import { Button } from '../ui/button.js';

/*
  THE FEW SHAPES EVERY STEP PANEL IS BUILT FROM.

  One answer at the top, one primary action at the bottom, and everything that
  explains rather than answers behind a native <details>, which is keyboard- and
  screen-reader-operable without a line of script. What may NOT go behind one:
  an ASSUMED value (amber is the point of it, so it is promoted out of any
  collapsed group — see `assumedFirst`), a refusal, an error, or a gap.
*/

/** A secondary block, closed until asked for. */
export function More({
  summary,
  children,
  className,
}: {
  readonly summary: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}): JSX.Element {
  return (
    <details className={cn('group border-t border-subtle', className)}>
      <summary
        className={cn(
          'flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-sm py-2 text-[12.5px] font-medium text-fg',
          'hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 [&::-webkit-details-marker]:hidden',
        )}
      >
        <span className="min-w-0">{summary}</span>
        <ChevronDown
          className="size-4 shrink-0 text-secondary transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </summary>
      <div className="grid gap-3 pb-3">{children}</div>
    </details>
  );
}

/** A section heading, the same size and weight on every step. */
export function Heading({ id, children }: { readonly id?: string; readonly children: ReactNode }): JSX.Element {
  return (
    <h3 id={id} className="text-[12px] font-medium text-secondary">
      {children}
    </h3>
  );
}

/** A label above a figure, inside a <dl>. */
export function Row({ label, children }: { readonly label: ReactNode; readonly children: ReactNode }): JSX.Element {
  return (
    <div className="grid content-start gap-0.5">
      <dt className="text-[11.5px] text-secondary">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** The step's one obvious action, held at the foot of the panel while the inputs scroll above it. */
export function Footer({ children }: { readonly children: ReactNode }): JSX.Element {
  return <div className="sticky bottom-0 -mx-4 grid gap-2 border-t border-line bg-panel px-4 py-3">{children}</div>;
}

/** "Go on to the next step" — the primary action of a step whose figures are only read. */
export function NextStep({ label, onClick }: { readonly label: string; readonly onClick: () => void }): JSX.Element {
  return (
    <Button variant="primary" size="lg" className="w-full" onClick={onClick}>
      {label}
      <ArrowRight className="rtl:-scale-x-100" aria-hidden="true" />
    </Button>
  );
}

/**
 * Split figures into the ones shown and the ones behind a disclosure, with every
 * ASSUMED figure among the shown — wherever it was listed. A value nobody entered
 * is the one a reader most needs to see, so it is never one click away.
 */
export function assumedFirst<T extends { readonly value: TracedWire }>(
  primary: readonly T[],
  secondary: readonly T[],
): { readonly shown: readonly T[]; readonly folded: readonly T[] } {
  const promoted = secondary.filter((r) => r.value.provenanceClass === 'ASSUMED');
  return { shown: [...primary, ...promoted], folded: secondary.filter((r) => r.value.provenanceClass !== 'ASSUMED') };
}
