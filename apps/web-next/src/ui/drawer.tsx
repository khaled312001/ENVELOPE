import { X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Dialog } from 'radix-ui';
import type { ReactNode } from 'react';

import { useLocale } from '../lib/locale.js';

/*
  A side sheet that slides in from the reading END of the page — the right on an
  English page, the left on an Arabic one. Radix gives the focus trap, Escape
  and the restored focus; Motion gives the slide, and none when the reader asked
  for less motion.

  Its own module, apart from `radix.tsx`: the home page's entry chunk carries the
  tooltip, and Radix's dialog was riding into it with this sheet for a menu most
  readers never open. The site header loads it on the first tap instead.
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
