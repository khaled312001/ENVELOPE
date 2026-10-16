import { createContext, useContext } from 'react';

import type { TracedWire } from '@web/components/TracedValue.js';

import { cn } from '../lib/cn.js';
import { grouped, trimmed } from '../lib/figures.js';
import { useLocale } from '../lib/locale.js';

/*
  EVERY FIGURE THE ENGINE RETURNS IS DRAWN BY THIS COMPONENT, AND EVERY ONE OPENS.

  The class is carried three ways, never by colour alone (1.4.1): the ink, a mark
  beneath the figure — solid for DERIVED, dashed for ASSUMED, dotted for a value
  somebody typed — and the class's name in the button's accessible name.
  ASSUMED is amber and nothing else on the page is.
*/

const InspectContext = createContext<((nodeId: string) => void) | null>(null);
export const InspectProvider = InspectContext.Provider;

export function useInspect(): ((nodeId: string) => void) | null {
  return useContext(InspectContext);
}

const INK: Readonly<Record<string, string>> = {
  DERIVED: 'text-derived decoration-derived/60 decoration-solid',
  ASSUMED: 'text-assumed decoration-assumed decoration-dashed bg-assumed-surface',
  USER_SET: 'text-accent-strong decoration-accent/60 decoration-dotted',
  VARIANCE: 'text-variance decoration-variance decoration-double',
};

export function Traced({
  value,
  places = 2,
  size = 'md',
  unit,
  className,
}: {
  readonly value: TracedWire;
  /** At most this many decimals on screen; the derivation prints every one. */
  readonly places?: number;
  readonly size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Overrides the unit the engine sent, for a heading that already names it. */
  readonly unit?: string | null;
  readonly className?: string;
}): JSX.Element {
  const inspect = useInspect();
  const { t } = useLocale();
  // Some traced values are words — an orientation, a treatment — and those wrap like words.
  const numeric = /^-?\d/.test(value.value);
  const shown = numeric ? grouped(trimmed(value.value, places)) : value.value;
  const sent = unit === undefined ? value.unit : unit;
  const u = sent ? (t.traced.unitWord[sent] ?? sent) : sent;
  const label = t.classLabel[value.provenanceClass as keyof typeof t.classLabel] ?? value.provenanceClass;
  const sizes = {
    sm: 'text-[12.5px]',
    md: 'text-[13.5px]',
    lg: 'text-[18px] font-medium',
    xl: 'text-[34px] leading-none font-light tracking-[-0.02em]',
  } as const;
  const body = (
    <>
      <span className={numeric ? 'figure' : 'figure !whitespace-normal text-start'}>{shown}</span>
      {u ? <span className="ms-1 text-[0.72em] font-normal text-secondary">{u}</span> : null}
    </>
  );
  const cls = cn(
    'inline-flex items-baseline rounded-[3px] px-0.5 underline decoration-1 underline-offset-[5px]',
    INK[value.provenanceClass] ?? 'text-fg decoration-line',
    sizes[size],
    className,
  );
  if (!inspect) {
    return (
      <span className={cls} title={label}>
        {body}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => inspect(value.node)}
      // A figure and its unit read left to right on an Arabic page too, as the glossary requires.
      dir="ltr"
      aria-label={t.traced.aria(value.parameterId, `${value.value}${u ? ` ${u}` : ''}`, label)}
      title={`${label} — ${t.traced.open}`}
      data-class={value.provenanceClass}
      className={cn(cls, 'cursor-pointer transition-colors duration-150 hover:bg-hover')}
    >
      {body}
    </button>
  );
}

/** The class as a small mark beside a heading, for a legend or a list row. */
export function ClassMark({ cls }: { readonly cls: string }): JSX.Element {
  const { t } = useLocale();
  const label = t.classLabel[cls as keyof typeof t.classLabel] ?? cls;
  const tone =
    cls === 'ASSUMED'
      ? 'border-dashed border-assumed/70 bg-assumed-surface text-assumed'
      : cls === 'DERIVED'
        ? 'border-derived/40 bg-derived-surface text-derived'
        : cls === 'USER_SET'
          ? 'border-dotted border-accent/50 bg-accent-subtle text-accent-strong'
          : cls === 'VARIANCE'
            ? 'border-variance/50 bg-variance-surface text-variance'
            : 'border-line bg-raised text-secondary';
  return (
    <span className={cn('inline-flex items-center rounded-sm border px-1.5 py-px text-[11px] font-medium whitespace-nowrap', tone)}>
      {label}
    </span>
  );
}

export function Legend(): JSX.Element {
  const { t } = useLocale();
  return (
    <ul aria-label={t.legend.label} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-secondary">
      {(['DERIVED', 'ASSUMED', 'USER_SET'] as const).map((c) => (
        <li key={c} className="flex items-center gap-1.5">
          <ClassMark cls={c} />
          <span>{t.legend[c]}</span>
        </li>
      ))}
    </ul>
  );
}
