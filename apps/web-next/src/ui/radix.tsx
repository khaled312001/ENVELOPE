import { Tabs as RTabs, ToggleGroup, Tooltip } from 'radix-ui';
import type { ReactNode } from 'react';

import { cn } from '../lib/cn.js';

/* ── Segmented ───────────────────────────────────────────────────────────── */

/*
  A single choice among a few, drawn as one control. Radix's ToggleGroup gives
  the roving focus and the arrow keys (mirrored on a right-to-left page through
  the Direction provider); `allowEmpty` is off by default because a segmented
  control that can be emptied is a radio group with a missing answer.
*/
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  allowEmpty = false,
}: {
  readonly value: T | '';
  readonly onChange: (next: T) => void;
  readonly options: readonly { readonly value: T; readonly label: ReactNode }[];
  readonly label: string;
  readonly className?: string;
  readonly allowEmpty?: boolean;
}): JSX.Element {
  return (
    <ToggleGroup.Root
      type="single"
      aria-label={label}
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v as T);
        else if (allowEmpty) onChange('' as T);
      }}
      className={cn('inline-flex rounded-md border border-line bg-sunken p-0.5', className)}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          className={cn(
            'h-7 flex-1 rounded-[5px] px-2.5 text-[12.5px] font-medium whitespace-nowrap text-secondary',
            'transition-colors duration-150 hover:text-fg',
            'data-[state=on]:bg-raised data-[state=on]:text-fg data-[state=on]:shadow-[inset_0_0_0_1px_var(--border-strong)]',
          )}
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}

/* ── Tabs ────────────────────────────────────────────────────────────────── */

export const Tabs = RTabs.Root;
export const TabsContent = RTabs.Content;

export function TabsList({ children, label, className }: { readonly children: ReactNode; readonly label: string; readonly className?: string }): JSX.Element {
  return (
    <RTabs.List aria-label={label} className={cn('flex gap-1 overflow-x-auto', className)}>
      {children}
    </RTabs.List>
  );
}

export function Tab({ value, children }: { readonly value: string; readonly children: ReactNode }): JSX.Element {
  return (
    <RTabs.Trigger
      value={value}
      className={cn(
        'relative h-8 shrink-0 rounded-md px-2.5 text-[12.5px] font-medium whitespace-nowrap text-secondary',
        'transition-colors duration-150 hover:bg-hover hover:text-fg',
        'data-[state=active]:bg-raised data-[state=active]:text-fg data-[state=active]:shadow-[inset_0_0_0_1px_var(--border-default)]',
      )}
    >
      {children}
    </RTabs.Trigger>
  );
}

/* ── Tooltip ─────────────────────────────────────────────────────────────── */

export const TooltipProvider = Tooltip.Provider;

/** A tooltip REPEATS what the control's own name says; it never carries the only copy of it. */
export function Tip({ content, children }: { readonly content: ReactNode; readonly children: ReactNode }): JSX.Element {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={6}
          className="z-50 max-w-xs rounded-md border border-line bg-panel px-2 py-1 text-[12px] text-fg shadow-float"
        >
          {content}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/* The drawer is in `drawer.tsx`, out of the entry chunk; see the note there. */
