import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Dialog, Tabs as RTabs, ToggleGroup, Tooltip } from 'radix-ui';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

import { cn } from '../lib/cn.js';
import { useLocale } from '../lib/locale.js';

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
          className="z-50 max-w-xs rounded-md border border-line bg-raised px-2 py-1 text-[12px] text-fg shadow-lg"
        >
          {content}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/* ── Drawer ──────────────────────────────────────────────────────────────── */

/*
  A side sheet that slides in from the reading END of the page — the right on an
  English page, the left on an Arabic one. Radix gives the focus trap, Escape
  and the restored focus; Motion gives the slide, and none when the reader asked
  for less motion.
*/
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  closeLabel,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly children: ReactNode;
  readonly closeLabel: string;
}): JSX.Element {
  const { dir } = useLocale();
  const reduce = useReducedMotion();
  const from = dir === 'rtl' ? '-100%' : '100%';
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-black/55"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.18 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount {...(description ? {} : { 'aria-describedby': undefined })}>
              <motion.div
                dir={dir}
                className="fixed inset-y-0 end-0 z-50 flex w-full max-w-[34rem] flex-col border-s border-line bg-panel shadow-2xl"
                initial={{ x: reduce ? 0 : from, opacity: reduce ? 0 : 1 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: reduce ? 0 : from, opacity: reduce ? 0 : 1 }}
                transition={{ type: 'tween', ease: [0.22, 1, 0.36, 1], duration: reduce ? 0 : 0.28 }}
              >
                <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
                  <div className="min-w-0">
                    <Dialog.Title className="text-[15px] font-semibold text-fg">{title}</Dialog.Title>
                    {description ? (
                      <Dialog.Description className="mt-1 text-[12.5px] text-secondary">{description}</Dialog.Description>
                    ) : null}
                  </div>
                  <Dialog.Close
                    className="grid size-8 shrink-0 place-items-center rounded-md text-secondary hover:bg-hover hover:text-fg"
                    aria-label={closeLabel}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </Dialog.Close>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
