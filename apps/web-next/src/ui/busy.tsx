import type { JSX } from 'react';

import { cn } from '../lib/cn.js';

/*
  The mark for a wait inside a button or a line of text: a faint full ring and a
  quarter of it turning, in `currentColor`, so it takes the ink of whatever it
  waits in — never amber, which is reserved for what was assumed. Still under
  reduced motion; the words beside it carry the state. `.busy-ring` in
  styles.css holds the timing.
*/
export function BusyMark({ className }: { readonly className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn('inline-block size-4 shrink-0', className)}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="busy-ring" />
    </svg>
  );
}
